'use strict';

// The simulation has no browser dependencies, so combat and progression can
// be tested independently of rendering, input, audio, and service workers.
const BreachCore = (() => {
  const W = 1100, H = 700, CELL = 25, COLS = W / CELL, ROWS = H / CELL;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const COVER = [
    {x:200,y:165,w:120,h:54},{x:200,y:219,w:46,h:70},
    {x:780,y:165,w:120,h:54},{x:854,y:219,w:46,h:70},
    {x:202,y:455,w:115,h:58},{x:783,y:455,w:115,h:58},
    {x:440,y:296,w:70,h:48},{x:590,y:296,w:70,h:48},
    {x:471,y:525,w:158,h:35}
  ];
  const GATES = [{x:550,y:70},{x:1020,y:350},{x:550,y:620},{x:80,y:350}];
  const WEAPONS = [
    {name:'MTF-4 CARBINE',short:'CARBINE',description:'Balanced automatic fire',mag:30,rate:.115,reload:1.5,damage:1,pellets:1,spread:.025,speed:1100,life:.8,pierce:1,color:'#f2c98a'},
    {name:'BREACH-12 SHOTGUN',short:'SHOTGUN',description:'Six pellets · close quarters',mag:8,rate:.55,reload:1.95,damage:.9,pellets:6,spread:.24,speed:950,life:.42,pierce:1,color:'#efab77'},
    {name:'ARC-7 MARKSMAN',short:'MARKSMAN',description:'High damage · piercing rounds',mag:12,rate:.34,reload:1.75,damage:3.2,pellets:1,spread:.008,speed:1450,life:.85,pierce:2,color:'#a9d3cb'}
  ];
  const MISSIONS = [
    {name:'FIRST RESPONSE',text:'Reanimated personnel in the staging area. Establish a perimeter.',count:7,types:[0],modifier:'ORIENTATION'},
    {name:'FALSE VOICES',text:'Fast movers are entering the sector. Watch the breach markers.',count:10,types:[0,1,0],modifier:'HUNTER PACKS'},
    {name:'EYES OPEN',text:'SCP-173 detected. Keep it in your aim cone; watch your blink timer.',count:12,types:[0,1,2],modifier:'OBSERVATION'},
    {name:'FRIENDLY FIRE',text:'Site security is compromised. Sentries fire after a visible charge.',count:14,types:[0,1,3],modifier:'ROGUE SECURITY'},
    {name:'POWER SURGE',text:'Unstable floor relays are discharging. Leave marked zones before impact.',count:16,types:[0,1,2,3],modifier:'LIVE RELAYS'},
    {name:'FINAL LOCKDOWN',text:'Disable the lockdown sentinel, clear the sector, then reach extraction.',count:11,types:[0,1,3],modifier:'SENTINEL ACTIVE'}
  ];
  const UPGRADES = [
    {id:'damage',name:'ARMOR-PIERCING',text:'+20% weapon damage',max:2},
    {id:'reload',name:'QUICK HANDS',text:'20% faster reloads',max:2},
    {id:'armor',name:'TRAUMA PLATING',text:'+20 maximum HP and heal 35',max:2},
    {id:'speed',name:'LIGHT FOOTING',text:'+12% movement speed',max:2},
    {id:'pulse',name:'CAPACITOR BANK',text:'EMP cooldown reduced by 2s',max:2},
    {id:'mag',name:'EXTENDED MAGAZINES',text:'+25% magazine capacity',max:2},
    {id:'dash',name:'RAPID RESPONSE',text:'Dash cooldown reduced by 0.6s',max:2}
  ];
  const ENEMIES = [
    {hp:2,speed:61,r:14,damage:10,points:100},
    {hp:3.3,speed:109,r:16,damage:15,points:170},
    {hp:8,speed:164,r:15,damage:24,points:300},
    {hp:5,speed:56,r:17,damage:11,points:220},
    {hp:95,speed:43,r:29,damage:20,points:2500}
  ];

  function segmentRect(x1,y1,x2,y2,r,pad=0) {
    let t0=0,t1=1;const dx=x2-x1,dy=y2-y1;
    for(const [p,q] of [[-dx,x1-r.x+pad],[dx,r.x+r.w+pad-x1],[-dy,y1-r.y+pad],[dy,r.y+r.h+pad-y1]]) {
      if(p===0){if(q<0)return false;}
      else {const t=q/p;if(p<0){if(t>t1)return false;t0=Math.max(t0,t);}else{if(t<t0)return false;t1=Math.min(t1,t);}}
    }
    return true;
  }

  class Game {
    constructor({random=Math.random,onEvent=()=>{}}={}) {
      this.random=random;this.onEvent=onEvent;
      this.blocked=new Uint8Array(COLS*ROWS);this.field=new Int16Array(COLS*ROWS);
      for(let i=0;i<this.blocked.length;i++)this.blocked[i]=this.collides((i%COLS+.5)*CELL,(Math.floor(i/COLS)+.5)*CELL,20)?1:0;
      this.reset();
    }
    randomBetween(a,b){return a+this.random()*(b-a);}
    emit(type,data={}){this.onEvent({type,...data});}
    reset(difficulty='standard') {
      this.state='ready';this.difficulty=difficulty;this.critical=difficulty==='critical';
      this.player={x:550,y:410,r:14,hp:100,maxHp:100,angle:-Math.PI/2,dash:0,dashTime:0,invuln:0,pulse:0};
      this.weapon=0;this.ammo=WEAPONS.map(w=>w.mag);this.upgrades={};this.choices=[];
      this.enemies=[];this.bullets=[];this.hostiles=[];this.pickups=[];this.particles=[];this.warnings=[];this.hazards=[];this.rings=[];
      this.wave=0;this.score=0;this.kills=0;this.elapsed=0;this.shots=0;this.hits=0;this.projectiles=0;
      this.spawned=0;this.quota=0;this.spawnTimer=0;this.fireTimer=0;this.reloadTimer=0;this.phaseTimer=0;
      this.blink=0;this.combo=0;this.comboTimer=0;this.hazardTimer=5;this.navTimer=0;this.flash=0;this.shake=0;
      this.notice='';this.noticeTimer=0;this.input={x:0,y:0,fire:false,aim:false,aimX:760,aimY:350};
      this.field.fill(-1);
    }
    get mission(){return MISSIONS[Math.max(0,this.wave-1)];}
    get multiplier(){return 1+Math.min(3,Math.floor(this.combo/4))*.5;}
    get remaining(){return this.enemies.length+this.warnings.length+Math.max(0,this.quota-this.spawned);}
    get dashCooldown(){return 2.8-(this.upgrades.dash||0)*.6;}
    get pulseCooldown(){return 10-(this.upgrades.pulse||0)*2;}
    capacity(index=this.weapon){return Math.ceil(WEAPONS[index].mag*(1+(this.upgrades.mag||0)*.25));}
    announce(message,time=2.8){this.notice=message;this.noticeTimer=time;}
    start(difficulty='standard'){this.reset(difficulty);this.state='playing';this.nextWave();}
    nextWave() {
      this.wave++;this.quota=this.mission.count;this.spawned=0;this.spawnTimer=.9;this.phaseTimer=0;
      this.hazardTimer=5;this.hostiles=[];this.hazards=[];this.blink=0;
      this.announce(`PHASE ${String(this.wave).padStart(2,'0')} / ${this.mission.name}`,3.4);
      if(this.wave===6)this.queueSpawn(4,{x:550,y:125});
      this.emit('wave',{wave:this.wave});
    }
    collides(x,y,r) {
      if(x-r<38||x+r>W-38||y-r<45||y+r>H-45)return true;
      return COVER.some(c=>{const dx=x-clamp(x,c.x,c.x+c.w),dy=y-clamp(y,c.y,c.y+c.h);return dx*dx+dy*dy<r*r;});
    }
    clearLine(a,b,pad=0){return !COVER.some(c=>segmentRect(a.x,a.y,b.x,b.y,c,pad));}
    move(actor,dx,dy,phase=false) {
      const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/6));let moved=0;
      for(let i=0;i<steps;i++){
        const x=actor.x,y=actor.y;
        if(phase){actor.x=clamp(x+dx/steps,38+actor.r,W-38-actor.r);actor.y=clamp(y+dy/steps,45+actor.r,H-45-actor.r);}
        else {if(!this.collides(actor.x+dx/steps,actor.y,actor.r))actor.x+=dx/steps;if(!this.collides(actor.x,actor.y+dy/steps,actor.r))actor.y+=dy/steps;}
        moved+=Math.hypot(actor.x-x,actor.y-y);
      }
      return moved;
    }
    buildField() {
      this.field.fill(-1);
      const px=Math.floor(this.player.x/CELL),py=Math.floor(this.player.y/CELL);
      let target=-1;
      for(let ring=0;ring<4&&target<0;ring++)for(let dy=-ring;dy<=ring&&target<0;dy++)for(let dx=-ring;dx<=ring;dx++){
        const x=px+dx,y=py+dy,i=y*COLS+x;
        if(x>=0&&y>=0&&x<COLS&&y<ROWS&&!this.blocked[i]){target=i;break;}
      }
      if(target<0)return;
      const queue=new Int16Array(COLS*ROWS);let head=0,tail=1;queue[0]=target;this.field[target]=0;
      while(head<tail){const i=queue[head++],x=i%COLS,y=Math.floor(i/COLS);
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
          const nx=x+dx,ny=y+dy,n=ny*COLS+nx;
          if(nx<0||ny<0||nx>=COLS||ny>=ROWS||this.blocked[n]||this.field[n]>=0)continue;
          if(dx&&dy&&(this.blocked[y*COLS+nx]||this.blocked[ny*COLS+x]))continue;
          this.field[n]=this.field[i]+1;queue[tail++]=n;
        }
      }
    }
    direction(enemy) {
      if(enemy.type===4||this.clearLine(enemy,this.player,enemy.r+3))return Math.atan2(this.player.y-enemy.y,this.player.x-enemy.x);
      const gx=Math.floor(enemy.x/CELL),gy=Math.floor(enemy.y/CELL);let best=Infinity,point=null;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const x=gx+dx,y=gy+dy,i=y*COLS+x;
        if(x<0||y<0||x>=COLS||y>=ROWS||this.field[i]<0||this.blocked[i])continue;
        const p={x:(x+.5)*CELL,y:(y+.5)*CELL};
        if(!this.clearLine(enemy,p,enemy.r+1))continue;
        const cost=this.field[i]*CELL+distance(enemy,p)*.5;
        if(cost<best){best=cost;point=p;}
      }
      return point?Math.atan2(point.y-enemy.y,point.x-enemy.x):Math.atan2(this.player.y-enemy.y,this.player.x-enemy.x);
    }
    reload(){if(this.state!=='playing'||this.reloadTimer>0||this.ammo[this.weapon]>=this.capacity())return false;this.reloadTimer=WEAPONS[this.weapon].reload*Math.pow(.8,this.upgrades.reload||0);this.emit('reload');return true;}
    switchWeapon(index){if(this.state!=='playing'||index<0||index>=WEAPONS.length||index===this.weapon)return false;this.weapon=index;this.reloadTimer=0;this.fireTimer=Math.max(this.fireTimer,.13);this.emit('switch');return true;}
    dash(){if(this.state!=='playing'||this.player.dash>0)return false;const p=this.player,i=this.input,l=Math.hypot(i.x,i.y);p.dashX=l?i.x/l:Math.cos(p.angle);p.dashY=l?i.y/l:Math.sin(p.angle);p.dash=this.dashCooldown;p.dashTime=.18;p.invuln=Math.max(p.invuln,.27);this.emit('dash');return true;}
    pulse(){
      if(this.state!=='playing'||this.player.pulse>0)return false;
      this.player.pulse=this.pulseCooldown;this.rings.push({x:this.player.x,y:this.player.y,r:0,max:170,life:.45,total:.45});
      for(const e of this.enemies)if(distance(e,this.player)<170+e.r){e.slow=2.5;this.hitEnemy(e,3*(1+(this.upgrades.damage||0)*.2));}
      this.enemies=this.enemies.filter(e=>!e.dead);this.hostiles=this.hostiles.filter(b=>distance(b,this.player)>180);
      this.emit('pulse');return true;
    }
    shoot(){
      if(this.state!=='playing'||this.reloadTimer>0||this.fireTimer>0)return false;
      const w=WEAPONS[this.weapon],p=this.player;
      if(this.ammo[this.weapon]<=0){this.reload();return false;}
      this.ammo[this.weapon]--;this.shots++;this.projectiles+=w.pellets;this.fireTimer=w.rate;this.flash=.06;this.shake=1.4;
      for(let i=0;i<w.pellets;i++){
        const spread=w.pellets>1?((i/(w.pellets-1))-.5)*w.spread*2+this.randomBetween(-.02,.02):this.randomBetween(-w.spread,w.spread);
        const angle=p.angle+spread;
        this.bullets.push({x:p.x+Math.cos(angle)*16,y:p.y+Math.sin(angle)*16,vx:Math.cos(angle)*w.speed,vy:Math.sin(angle)*w.speed,life:w.life,damage:w.damage*(1+(this.upgrades.damage||0)*.2),pierce:w.pierce,hit:new Set(),color:w.color,recorded:false});
      }
      this.emit('shot',{weapon:this.weapon});if(this.ammo[this.weapon]===0)this.reload();return true;
    }
    queueSpawn(type,position) {
      if(this.spawned>=this.quota)return;
      const far=GATES.filter(g=>distance(g,this.player)>280);
      const gate=position||(far.length?far:GATES)[Math.floor(this.random()*(far.length||GATES.length))];
      this.warnings.push({x:gate.x,y:gate.y,type,time:type===4?1.6:.9,total:type===4?1.6:.9});this.spawned++;
    }
    spawn(type,x,y){const spec=ENEMIES[type];const e={...spec,x,y,type,maxHp:spec.hp,phase:this.randomBetween(0,Math.PI*2),hit:0,slow:0,attack:1.5,charge:0,frozen:false,dead:false};e.hp*=this.critical?1.15:1;e.maxHp=e.hp;e.speed+=Math.max(0,this.wave-1)*3;this.enemies.push(e);return e;}
    spark(x,y,color,count=7){for(let i=0;i<count&&this.particles.length<260;i++){const a=this.randomBetween(0,Math.PI*2),speed=this.randomBetween(35,145);this.particles.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:this.randomBetween(.15,.4),total:.4,color});}}
    hitEnemy(e,damage){
      if(e.dead)return;e.hp-=damage;e.hit=.1;this.spark(e.x,e.y,e.type===1?'#d18c75':'#bac99b',4);
      if(e.hp<=0){e.dead=true;this.kills++;this.combo++;this.comboTimer=4;this.score+=Math.round(e.points*this.multiplier);this.spark(e.x,e.y,'#c5d4a4',12);
        if(e.type===4)this.announce('SENTINEL DISABLED / CLEAR THE SECTOR');
        if(this.kills%7===0||this.random()<.12){const type=this.player.hp<this.player.maxHp*.6?'med':this.random()<.5?'med':'overcharge';this.pickups.push({x:e.x,y:e.y,type,life:16});}
        this.emit('kill',{enemy:e.type});
      }
    }
    damage(amount){const p=this.player;if(p.invuln>0||this.state!=='playing')return;p.hp=Math.max(0,p.hp-amount);p.invuln=.8;this.combo=0;this.comboTimer=0;this.shake=5;this.spark(p.x,p.y,'#e6ac6d',12);this.emit('damage');if(p.hp<=0)this.finish(false);}
    finish(won){this.state=won?'won':'dead';this.emit('finish',{won});}
    chooseUpgrade(id){
      if(this.state!=='upgrade'||!this.choices.some(u=>u.id===id))return false;
      this.upgrades[id]=(this.upgrades[id]||0)+1;
      if(id==='armor'){this.player.maxHp+=20;this.player.hp=Math.min(this.player.maxHp,this.player.hp+35);}
      this.ammo=WEAPONS.map((_,i)=>this.capacity(i));this.choices=[];this.state='playing';this.nextWave();return true;
    }
    clearWave(){
      this.score+=this.wave*250;this.player.hp=Math.min(this.player.maxHp,this.player.hp+18);this.player.dash=0;this.player.pulse=0;this.reloadTimer=0;this.ammo=WEAPONS.map((_,i)=>this.capacity(i));this.bullets=[];this.hostiles=[];this.hazards=[];
      if(this.wave===MISSIONS.length){this.state='extraction';this.phaseTimer=0;this.announce('SECTOR CLEAR / REACH THE SOUTH EXTRACTION PAD',5);this.emit('extraction');return;}
      const pool=UPGRADES.filter(u=>(this.upgrades[u.id]||0)<u.max);
      for(let i=pool.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
      this.choices=pool.slice(0,3);this.state='upgrade';this.emit('upgrade');
    }
    updatePlayer(dt){
      const p=this.player,i=this.input;let x=i.x,y=i.y;const l=Math.hypot(x,y);if(l>1){x/=l;y/=l;}
      if(i.aim)p.angle=Math.atan2(i.aimY-p.y,i.aimX-p.x);else if(l>.1)p.angle=Math.atan2(y,x);
      p.dash=Math.max(0,p.dash-dt);p.pulse=Math.max(0,p.pulse-dt);p.invuln=Math.max(0,p.invuln-dt);
      if(p.dashTime>0){p.dashTime=Math.max(0,p.dashTime-dt);this.move(p,p.dashX*660*dt,p.dashY*660*dt);this.spark(p.x,p.y,'#b6cd94',1);}
      else {const speed=215*(1+(this.upgrades.speed||0)*.12);this.move(p,x*speed*dt,y*speed*dt);}
    }
    update(dt){
      if(this.state!=='playing'&&this.state!=='extraction')return;
      dt=Math.min(.05,Math.max(0,dt));this.elapsed+=dt;this.noticeTimer=Math.max(0,this.noticeTimer-dt);this.flash=Math.max(0,this.flash-dt);this.shake=Math.max(0,this.shake-dt*18);
      this.updatePlayer(dt);this.updateEffects(dt);
      if(this.state==='extraction'){
        if(distance(this.player,{x:550,y:607})<50)this.phaseTimer+=dt;else this.phaseTimer=0;
        if(this.phaseTimer>=1.2){this.score+=1000;this.finish(true);}return;
      }
      this.fireTimer=Math.max(0,this.fireTimer-dt);this.comboTimer=Math.max(0,this.comboTimer-dt);if(this.comboTimer===0)this.combo=0;
      this.blink=(this.blink+dt)%9;
      if(this.reloadTimer>0){this.reloadTimer-=dt;if(this.reloadTimer<=0){this.reloadTimer=0;this.ammo[this.weapon]=this.capacity();this.emit('loaded');}}
      if(this.input.fire)this.shoot();
      this.navTimer-=dt;if(this.navTimer<=0){this.buildField();this.navTimer=.3;}
      this.spawnTimer-=dt;
      if(this.spawned<this.quota&&this.spawnTimer<=0&&this.enemies.length+this.warnings.length<11){
        const types=this.mission.types;let type=types[this.spawned%types.length];if(this.wave===3&&this.spawned===0)type=2;
        this.queueSpawn(type);this.spawnTimer=Math.max(.7,1.65-this.wave*.12)*(this.critical?.85:1);
      }
      for(let i=this.warnings.length-1;i>=0;i--){const w=this.warnings[i];w.time-=dt;if(w.time<=0){this.spawn(w.type,w.x,w.y);this.warnings.splice(i,1);}}
      this.updateEnemies(dt);if(this.state!=='playing')return;
      this.updateBullets(dt);if(this.state!=='playing')return;
      this.updateHazards(dt);if(this.state!=='playing')return;
      this.updatePickups(dt);
      this.enemies=this.enemies.filter(e=>!e.dead);
      if(this.remaining===0){this.phaseTimer+=dt;if(this.phaseTimer>1.4)this.clearWave();}else this.phaseTimer=0;
    }
    updateEnemies(dt){
      for(const e of this.enemies){
        e.hit=Math.max(0,e.hit-dt);e.slow=Math.max(0,e.slow-dt);e.phase+=dt*8;
        const a=Math.atan2(this.player.y-e.y,this.player.x-e.x),range=distance(e,this.player),visible=this.clearLine(e,this.player);
        e.frozen=e.type===2&&Math.abs(angleDiff(a+Math.PI,this.player.angle))<.7&&this.blink<8.7&&visible;
        if(!e.frozen){const heading=this.direction(e),speed=e.speed*(this.critical?1.13:1)*(e.slow>0?.35:1);
          if(e.type<3||range>300||!visible)this.move(e,Math.cos(heading)*speed*dt,Math.sin(heading)*speed*dt,e.type===4);
        }
        if(range<e.r+this.player.r+2)this.damage(e.damage*(this.critical?1.25:1));
        if(e.type>=3){
          e.attack-=dt;
          if(e.charge>0){e.charge-=dt;if(e.charge<=0){
            const count=e.type===4?(e.hp<e.maxHp*.5?12:8):1;
            for(let j=0;j<count;j++){const angle=e.type===4?e.aim+j*Math.PI*2/count:e.aim;this.hostiles.push({x:e.x+Math.cos(angle)*(e.r+7),y:e.y+Math.sin(angle)*(e.r+7),vx:Math.cos(angle)*210,vy:Math.sin(angle)*210,life:5,damage:e.damage});}
            e.attack=e.type===4?1.5:2.4;
          }}else if(e.attack<=0&&visible&&range<650){e.aim=a;e.charge=e.type===4?1:.8;}
        }
      }
      // Separate crowds without letting them shove each other through cover.
      for(let i=0;i<this.enemies.length;i++)for(let j=i+1;j<this.enemies.length;j++){
        const a=this.enemies[i],b=this.enemies[j],d=distance(a,b),min=a.r+b.r+3;
        if(d<min){const angle=d>.01?Math.atan2(a.y-b.y,a.x-b.x):(i+j)*2.4,push=Math.min(45*dt,(min-d)*.5);
          if(!a.frozen)this.move(a,Math.cos(angle)*push,Math.sin(angle)*push,a.type===4);
          if(!b.frozen)this.move(b,-Math.cos(angle)*push,-Math.sin(angle)*push,b.type===4);
        }
      }
    }
    updateBullets(dt){
      for(let i=this.bullets.length-1;i>=0;i--){const b=this.bullets[i];let dead=false;const steps=Math.max(1,Math.ceil(Math.hypot(b.vx,b.vy)*dt/8));
        for(let j=0;j<steps&&!dead;j++){
          b.x+=b.vx*dt/steps;b.y+=b.vy*dt/steps;
          if(this.collides(b.x,b.y,2)){this.spark(b.x,b.y,'#e7c58d',3);dead=true;break;}
          for(const e of this.enemies)if(!e.dead&&!b.hit.has(e)&&distance(e,b)<e.r+3){
            b.hit.add(e);this.hitEnemy(e,b.damage);if(!b.recorded){this.hits++;b.recorded=true;}b.pierce--;if(b.pierce<=0)dead=true;break;
          }
        }
        b.life-=dt;if(dead||b.life<=0)this.bullets.splice(i,1);
      }
      for(let i=this.hostiles.length-1;i>=0;i--){const b=this.hostiles[i];b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
        if(distance(b,this.player)<this.player.r+5){this.damage(b.damage*(this.critical?1.25:1));this.hostiles.splice(i,1);}
        else if(b.life<=0||this.collides(b.x,b.y,4))this.hostiles.splice(i,1);
      }
    }
    updateHazards(dt){
      if(this.wave===5){this.hazardTimer-=dt;if(this.hazardTimer<=0){
        const p={x:clamp(this.player.x+this.randomBetween(-85,85),90,W-90),y:clamp(this.player.y+this.randomBetween(-85,85),90,H-90)};
        this.hazards.push({...p,r:66,time:1.5,total:1.5,active:false});this.hazardTimer=4.4;
      }}
      for(let i=this.hazards.length-1;i>=0;i--){const h=this.hazards[i];h.time-=dt;if(h.time<=0&&!h.active){h.active=true;h.time=.45;if(distance(h,this.player)<h.r+this.player.r)this.damage(22);this.spark(h.x,h.y,'#e5b471',18);}else if(h.time<=0)this.hazards.splice(i,1);}
    }
    updatePickups(dt){for(let i=this.pickups.length-1;i>=0;i--){const p=this.pickups[i];p.life-=dt;
      if(distance(p,this.player)<30){if(p.type==='med')this.player.hp=Math.min(this.player.maxHp,this.player.hp+28);else{this.player.pulse=0;this.ammo[this.weapon]=this.capacity();this.reloadTimer=0;}
        this.score+=30;this.spark(p.x,p.y,'#cce4a4',12);this.emit('pickup',{pickup:p.type});this.pickups.splice(i,1);
      }else if(p.life<=0)this.pickups.splice(i,1);
    }}
    updateEffects(dt){
      for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.life-=dt;if(p.life<=0){this.particles.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(.05,dt);p.vy*=Math.pow(.05,dt);}
      for(let i=this.rings.length-1;i>=0;i--){const r=this.rings[i];r.life-=dt;r.r=r.max*(1-r.life/r.total);if(r.life<=0)this.rings.splice(i,1);}
    }
  }
  return {Game,WEAPONS,MISSIONS,UPGRADES,COVER,GATES,W,H,clamp,distance,angleDiff,segmentRect};
})();
