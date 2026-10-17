'use strict';
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
const {W,H,COVER:cover,GATES:gates,WEAPONS,MISSIONS,UPGRADES,clamp,distance:dist,angleDiff}=BreachCore;
const TAU=Math.PI*2,keys=new Set(),pointer={sx:0,sy:0,inside:false,down:false};
let player,elapsed=0,flash=0,scale=1,dpr=1,screenW=W,screenH=H,cameraX=0;
let moveTouch=null,aimTouch=null,stick=null,aimStick=null,usingTouch=false;
let last=0,accumulator=0,hudClock=0,previousState='ready',resumeState='playing',best=0;
const rand=(a,b)=>a+Math.random()*(b-a);
const readSetting=(key,fallback)=>{try{return localStorage.getItem(key)??fallback;}catch{return fallback;}};
const saveSetting=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
const sound=new SoundEffects({enabled:readSetting('scp-breach-sound','on')!=='off'});
$('screenShake').checked=readSetting('scp-shake',matchMedia('(prefers-reduced-motion: reduce)').matches?'off':'on')==='on';
$('aimAssist').checked=readSetting('scp-aim-assist','on')==='on';
for(const [id,key]of [['screenShake','scp-shake'],['aimAssist','scp-aim-assist']])$(id).onchange=()=>saveSetting(key,$(id).checked?'on':'off');
const game=new BreachCore.Game({onEvent:handleEvent});
function tone(...args){return sound.tone(...args);}
function handleEvent(event){
 const sounds={wave:[330,'sine',.3,.04,160],reload:[260,'triangle',.1,.025,90],loaded:[440,'triangle',.08,.025,220],dash:[140,'sine',.16,.04,450],pulse:[700,'sawtooth',.3,.035,80],switch:[420,'triangle',.06,.02,280],damage:[100,'sawtooth',.18,.04,40],pickup:[620,'sine',.15,.03,900],upgrade:[480,'sine',.25,.03,720],extraction:[520,'sine',.5,.035,880]};
 if(event.type==='shot')tone(...[[190,'sawtooth',.09,.04,65],[110,'sawtooth',.18,.06,45],[800,'triangle',.15,.055,140]][event.weapon]);
 else if(sounds[event.type])tone(...sounds[event.type]);
 if(event.type==='finish'){if(game.score>best){best=game.score;saveSetting('scp-breach-best-'+game.difficulty,String(best));}tone(event.won?640:160,'sawtooth',.45,.035,event.won?900:40);}
}
function getBest(){const legacy=$('difficulty').value==='standard'?readSetting('scp-breach-best','0'):'0';best=Number(readSetting('scp-breach-best-'+$('difficulty').value,legacy))||0;$('bestText').textContent=String(best).padStart(6,'0');}
function updateSound(){const enabled=sound.enabled;$('muteMark').hidden=enabled;$('soundBtn').setAttribute('aria-pressed',String(enabled));$('soundBtn').setAttribute('aria-label',enabled?'Mute sound':'Enable sound');$('soundBtn').title=enabled?'Mute sound':'Enable sound';}
$('soundBtn').onclick=()=>{sound.setEnabled(!sound.enabled);saveSetting('scp-breach-sound',sound.enabled?'on':'off');updateSound();if(sound.enabled)tone(450,'sine',.12,.03,650);};
function clearInput(){keys.clear();pointer.down=false;moveTouch=null;aimTouch=null;stick=null;aimStick=null;game.input.fire=false;game.input.x=0;game.input.y=0;}
function deploy(){void sound.unlock(true);clearInput();game.start($('difficulty').value);getBest();stateChanged();canvas.focus();}
function pause(){
 if(game.state==='playing'||game.state==='extraction'){resumeState=game.state;game.state='paused';clearInput();}
 else if(game.state==='paused'){void sound.unlock(true);game.state=resumeState;last=performance.now();accumulator=0;canvas.focus();}
 stateChanged();
}
function overlay(kicker,title,description,button,foot){
 $('overlayKicker').textContent=kicker;$('overlayTitle').innerHTML=title;$('overlayText').innerHTML=description;
 $('startBtn').textContent=button;$('startBtn').hidden=false;$('overlayFoot').textContent=foot;$('upgradeChoices').hidden=true;$('overlay').classList.remove('hidden');
}
function stateChanged(){
 const state=game.state;previousState=state;clearInput();$('difficulty').disabled=!['ready','dead','won'].includes(state);
 document.body.classList.toggle('in-mission',['playing','paused','upgrade','extraction'].includes(state));$('overlay').classList.toggle('upgrade-overlay',state==='upgrade');
 $('pauseBtn').textContent=state==='paused'?'PLAY':'Ⅱ';$('pauseBtn').setAttribute('aria-label',state==='paused'?'Resume mission':'Pause mission');
 if(state==='playing'||state==='extraction')$('overlay').classList.add('hidden');
 else if(state==='paused')overlay('TRANSMISSION ON HOLD','MISSION<br>PAUSED.','Your progress is safe.<br>Resume when you are ready.','RESUME MISSION','ESC TO RETURN TO THE FIELD');
 else if(state==='upgrade'){
   overlay('PHASE '+game.wave+' CLEAR // FIELD REQUISITIONS','REARM. ADAPT. REPEAT.','Health restored. Weapons reloaded.<br>Choose an upgrade for the rest of this operation.','','SELECT WITH MOUSE, TOUCH, OR KEYS 1 / 2 / 3');
   $('startBtn').hidden=true;$('upgradeChoices').hidden=false;$('upgradeChoices').replaceChildren();
   game.choices.forEach((choice,index)=>{const button=document.createElement('button');button.className='upgrade-option';const slot=document.createElement('small'),name=document.createElement('strong'),info=document.createElement('span');slot.textContent='REQUISITION 0'+(index+1);name.textContent=choice.name;info.textContent=choice.text;button.append(slot,name,info);button.onclick=()=>choose(choice.id);$('upgradeChoices').append(button);});
 }else if(state==='dead'||state==='won'){
   const won=state==='won',accuracy=game.projectiles?Math.round(game.hits/game.projectiles*100):0;
   overlay(won?'EXTRACTION COMPLETE // MISSION SUCCESS':'OPERATIVE DOWN // SIGNAL LOST',won?'LOCKDOWN<br>BROKEN.':'SIGNAL<br>LOST.',
   (won?'You held the sector. The team made it out.':'Requisition, reposition, redeploy.')+'<br>'+String(game.score).padStart(6,'0')+' POINTS · '+game.kills+' CONTAINED<br>'+accuracy+'% ACCURACY · '+formatTime(game.elapsed)+' · '+game.wave+'/6 PHASES','REDEPLOY OPERATIVE','PERSONAL BEST: '+String(best).padStart(6,'0'));
 }
 updateHUD();requestAnimationFrame(resize);
}
function choose(id){if(game.chooseUpgrade(id)){void sound.unlock(true);stateChanged();canvas.focus();}}
function setText(id,value){const e=$(id);if(e.textContent!==String(value))e.textContent=value;}
function formatTime(time){return String(Math.floor(time/60)).padStart(2,'0')+':'+String(Math.floor(time%60)).padStart(2,'0');}
function updateHUD(){
 const p=game.player,w=WEAPONS[game.weapon],s=game.state;
 setText('healthText',Math.ceil(p.hp));$('healthBar').style.width=(p.hp/p.maxHp*100)+'%';$('healthBar').style.background=p.hp<30?'#d97b65':'#adc38a';
 const wave=String(Math.max(1,game.wave)).padStart(2,'0');if($('waveText').dataset.wave!==wave){$('waveText').innerHTML=wave+' <span>/ 06</span>';$('waveText').dataset.wave=wave;}
 setText('phaseLabel',game.mission.name);setText('scoreText',String(game.score).padStart(6,'0'));setText('comboText',game.multiplier>1?'×'+game.multiplier.toFixed(1):'');
 setText('weaponName',w.name);setText('weaponDescription',w.description.toUpperCase());setText('ammoText',game.ammo[game.weapon]);setText('magText','/ '+game.capacity());
 setText('reloadText',game.reloadTimer>0?'RELOADING '+game.reloadTimer.toFixed(1)+'s':'R · RELOAD / UNLIMITED RESERVE');$('dashBar').style.width=((1-p.dash/game.dashCooldown)*100)+'%';
 setText('enemyCount',s==='extraction'?'EXTRACTION: SOUTH PAD':'THREATS REMAINING: '+(game.wave?game.remaining:'—'));
 const status={ready:'OPERATIVE READY',dead:'SIGNAL LOST',won:'EXTRACTION COMPLETE',upgrade:'REQUISITION AVAILABLE',paused:'MISSION PAUSED',extraction:'REACH THE SOUTH PAD'};
 setText('bottomStatus',status[s]||'CONTAINMENT IN PROGRESS');setText('clock',formatTime(game.elapsed));setText('bestText',String(best).padStart(6,'0'));
 setText('pulseText',p.pulse>0?'EMP '+p.pulse.toFixed(1)+'s':'EMP READY · E');setText('blinkText',game.wave<3?'BLINK SYSTEM STANDBY':game.blink>8.3?'BLINK IMMINENT':'BLINK IN '+Math.max(0,8.7-game.blink).toFixed(1)+'s');
 $('blinkText').classList.toggle('danger',game.wave>=3&&game.blink>7.3);
 $('touchPulse').textContent=p.pulse>0?'EMP '+Math.ceil(p.pulse)+'s':'EMP';$('touchDash').textContent=p.dash>0?'DASH '+Math.ceil(p.dash)+'s':'DASH';$('touchPulse').disabled=p.pulse>0;$('touchDash').disabled=p.dash>0;
 setText('announcement',game.noticeTimer>0?game.notice:'');$('announcement').classList.toggle('show',game.noticeTimer>0);
 if(game.wave){setText('missionTitle',game.mission.name.toLowerCase()+'.');setText('missionText',game.mission.text);setText('missionModifier',game.mission.modifier);}
 setText('objectiveTitle',s==='extraction'?'REACH EXTRACTION':'SECURE THE SECTOR');setText('objectiveText',s==='extraction'?'Hold the south pad for 1.2 seconds.':'Phase '+Math.max(1,game.wave)+' / 6 · EMP clears nearby projectiles.');
 document.querySelectorAll('[data-weapon]').forEach(button=>{const selected=Number(button.dataset.weapon)===game.weapon;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});
 const fitted=Object.entries(game.upgrades);setText('upgradeCount',fitted.reduce((sum,[,v])=>sum+v,0)+' FITTED');setText('upgradeList',fitted.length?fitted.map(([id,n])=>UPGRADES.find(u=>u.id===id).name+(n>1?' ×'+n:'')).join(' · '):'Choose one upgrade after each cleared phase.');
}
function readInput(){
 const input=game.input,p=game.player;
 input.x=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);input.y=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
 if(stick){input.x=stick.dx;input.y=stick.dy;}input.aim=pointer.inside||pointer.down||!!aimStick;input.fire=pointer.down||keys.has(' ');
 if(aimStick){const dx=aimStick.x-aimStick.ox,dy=aimStick.y-aimStick.oy;let a=Math.hypot(dx,dy)>8?Math.atan2(dy,dx):aimStick.angle;
   if($('aimAssist').checked){let best=.3,target=null;for(const e of game.enemies){const candidate=Math.atan2(e.y-p.y,e.x-p.x),delta=Math.abs(angleDiff(candidate,a));if(delta<best&&dist(e,p)<520&&game.clearLine(p,e)){best=delta;target=candidate;}}if(target!==null)a=target;}
   input.aimX=p.x+Math.cos(a)*300;input.aimY=p.y+Math.sin(a)*300;
 }else{input.aimX=pointer.sx/scale+cameraX;input.aimY=pointer.sy/scale;}
}
function resize(){const r=canvas.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);screenW=r.width;screenH=r.height;if(screenW<1||screenH<1)return;const width=Math.round(screenW*dpr),height=Math.round(screenH*dpr);if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;scale=screenH/H;}
function render(){
 player=game.player;elapsed=game.elapsed;flash=game.flash;const viewW=screenW/scale;
 cameraX=viewW<W?clamp(player.x-viewW/2,0,W-viewW):-(viewW-W)/2;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,screenW,screenH);
 ctx.setTransform(dpr*scale,0,0,dpr*scale,-cameraX*dpr*scale,0);ctx.save();if(game.shake>.1&&$('screenShake').checked)ctx.translate(rand(-game.shake,game.shake),rand(-game.shake,game.shake));floor();
 const cone=ctx.createRadialGradient(player.x,player.y,15,player.x,player.y,310);cone.addColorStop(0,'#c6d6931c');cone.addColorStop(1,'#c6d69300');ctx.fillStyle=cone;ctx.beginPath();ctx.moveTo(player.x,player.y);ctx.arc(player.x,player.y,310,player.angle-.7,player.angle+.7);ctx.closePath();ctx.fill();
 for(const h of game.hazards){circle(h.x,h.y,h.r,h.active?'#e6a35766':'#d7913822','#dfaa65',2);circle(h.x,h.y,Math.max(0,h.r*(1-h.time/h.total)),null,'#edb87388',2);text(h.active?'DISCHARGE':'RELAY OVERLOAD',h.x,h.y+4,8,'#f0be7c','center');}
 for(const w of game.warnings){const r=w.type===4?47:26;circle(w.x,w.y,r,null,'#eca766',2);circle(w.x,w.y,Math.max(0,r*w.time/w.total),null,'#eca76666');text(w.type===4?'SENTINEL INBOUND':'BREACH',w.x,w.y-r-9,7,'#eab071','center');}
 for(const p of game.pickups){ctx.save();ctx.translate(p.x,p.y);const med=p.type==='med';circle(0,0,20,null,med?'#b1d68b55':'#a2d8cd55');rect(-10,-10,20,20,'#29412d',med?'#adc98b':'#a2d8cd');if(med){rect(-2,-6,4,12,'#d5e3b5');rect(-6,-2,12,4,'#d5e3b5');}else{text('E',0,4,12,'#a2d8cd','center');}ctx.restore();}
 if(game.state==='ready')for(const e of [{x:140,y:290,type:0},{x:920,y:380,type:1},{x:690,y:120,type:2}])drawEnemy({...e,r:15,phase:0,hp:2,maxHp:2,hit:0});
 for(const e of game.enemies){if(e.charge>0){ctx.setLineDash([7,8]);const count=e.type===4?(e.hp<e.maxHp*.5?12:8):1;for(let j=0;j<count;j++){const a=e.aim+j*TAU/count,length=e.type===4?220:650;line(e.x,e.y,e.x+Math.cos(a)*length,e.y+Math.sin(a)*length,'#d9915688',2);}ctx.setLineDash([]);}drawEnemy(e);}
 for(const b of game.hostiles){circle(b.x,b.y,5,'#f0a66c');circle(b.x,b.y,9,null,'#e59b4f44');}drawOperative(player);
 for(const b of game.bullets)line(b.x-b.vx*.012,b.y-b.vy*.012,b.x,b.y,b.color,2);
 for(const ring of game.rings){ctx.globalAlpha=Math.max(0,ring.life/ring.total);circle(ring.x,ring.y,ring.r,null,'#b0e0d6',3);}ctx.globalAlpha=1;
 for(const p of game.particles){ctx.globalAlpha=clamp(p.life/p.total,0,1);rect(p.x,p.y,3,2,p.color);}ctx.globalAlpha=1;
 if(game.state==='extraction'){circle(550,607,48,'#a8d18f22','#bddc9f',2);circle(550,607,36,null,'#bddc9f77');text('EXTRACT',550,612,11,'#d2e4b6','center');if(game.phaseTimer>0){rect(505,640,90,4,'#33452a');rect(505,640,90*game.phaseTimer/1.2,4,'#cee3ae');}}
 if(game.state==='playing'&&pointer.inside&&!usingTouch){const x=game.input.aimX,y=game.input.aimY;circle(x,y,9,null,'#d6c7a48c');line(x-15,y,x-5,y,'#e3b474');line(x+5,y,x+15,y,'#e3b474');line(x,y-15,x,y-5,'#e3b474');line(x,y+5,x,y+15,'#e3b474');}
 if(game.state==='playing'&&game.blink>8.7&&game.wave>=3){rect(cameraX,0,viewW,H,'#050905a0');text('BLINK',player.x,player.y-50,10,'#e8bc7d','center');}
 const boss=game.enemies.find(e=>e.type===4);if(boss){const width=Math.min(viewW-100,360),x=cameraX+(viewW-width)/2;rect(x,52,width,6,'#394433');rect(x,52,width*boss.hp/boss.maxHp,6,'#dfab78');text('LOCKDOWN SENTINEL',x+width/2,42,9,'#e7b27e','center');}
 if(viewW<W-50){const x=cameraX+viewW-124,y=85;rect(x,y,108,72,'#0b130bea','#688252');for(const c of cover)rect(x+c.x/W*108,y+c.y/H*72,c.w/W*108,c.h/H*72,'#445439');for(const e of game.enemies)circle(x+e.x/W*108,y+e.y/H*72,1.8,'#e6aa76');circle(x+player.x/W*108,y+player.y/H*72,2.3,'#d6efb3');if(game.state==='extraction')circle(x+54,y+62,3,null,'#c6e4a1');}
 if(player.hp<30&&game.state==='playing'){ctx.strokeStyle='#c3533d55';ctx.lineWidth=12;ctx.strokeRect(cameraX+6,6,viewW-12,H-12);}ctx.restore();ctx.setTransform(dpr,0,0,dpr,0,0);
 if(stick){circle(stick.ox,stick.oy,38,'#aac58a10','#aac58a55');circle(stick.ox+stick.dx*30,stick.oy+stick.dy*30,14,'#b6cb9166');}
 if(aimStick){circle(aimStick.ox,aimStick.oy,34,'#e8a85e10','#e8a85e55');circle(aimStick.x,aimStick.y,12,'#e8a85e66');}
}
function frame(now){const delta=Math.min((now-last)/1000||0,.1);last=now;accumulator+=delta;readInput();const step=1/120;let steps=0;while(accumulator>=step&&steps<12){game.update(step);accumulator-=step;steps++;}if(game.state!==previousState)stateChanged();hudClock+=delta;if(hudClock>=.08){updateHUD();hudClock=0;}render();requestAnimationFrame(frame);}
function point(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
canvas.addEventListener('pointermove',e=>{const p=point(e);if(e.pointerType==='touch'){if(e.pointerId===moveTouch&&stick){const x=p.x-stick.ox,y=p.y-stick.oy,l=Math.max(38,Math.hypot(x,y));stick.dx=x/l;stick.dy=y/l;}if(e.pointerId===aimTouch&&aimStick){aimStick.x=p.x;aimStick.y=p.y;}}else{pointer.sx=p.x;pointer.sy=p.y;pointer.inside=true;usingTouch=false;}});
canvas.addEventListener('pointerdown',e=>{if(!['playing','extraction'].includes(game.state))return;e.preventDefault();void sound.unlock(true);canvas.focus();canvas.setPointerCapture(e.pointerId);const p=point(e);if(e.pointerType==='touch'){usingTouch=true;$('touchControls').classList.add('active');if(p.x<screenW*.5&&moveTouch===null){moveTouch=e.pointerId;stick={ox:p.x,oy:p.y,dx:0,dy:0};}else if(aimTouch===null){aimTouch=e.pointerId;aimStick={ox:p.x,oy:p.y,x:p.x,y:p.y,angle:Math.atan2(p.y/scale-game.player.y,p.x/scale+cameraX-game.player.x)};pointer.down=true;}}else if(e.button===0){pointer.sx=p.x;pointer.sy=p.y;pointer.inside=true;pointer.down=true;usingTouch=false;}});
function release(e){if(e.pointerId===moveTouch){moveTouch=null;stick=null;}if(e.pointerId===aimTouch){aimTouch=null;aimStick=null;pointer.down=false;}if(e.pointerType!=='touch')pointer.down=false;}
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,release);
canvas.addEventListener('pointerleave',()=>{if(!pointer.down)pointer.inside=false;});canvas.addEventListener('contextmenu',e=>e.preventDefault());
function action(fn){void sound.unlock(true);readInput();fn();updateHUD();canvas.focus();}
$('startBtn').onclick=()=>game.state==='paused'?pause():deploy();$('pauseBtn').onclick=pause;
$('touchReload').onclick=()=>action(()=>game.reload());$('touchDash').onclick=()=>action(()=>game.dash());$('touchPulse').onclick=()=>action(()=>game.pulse());$('touchWeapon').onclick=()=>action(()=>game.switchWeapon((game.weapon+1)%3));
document.querySelectorAll('[data-weapon]').forEach(button=>button.onclick=()=>action(()=>game.switchWeapon(Number(button.dataset.weapon))));$('difficulty').onchange=getBest;
window.addEventListener('keydown',e=>{
 if($('infoDialog').open||e.target.matches('select,input,a'))return;const k=e.key.toLowerCase();
 if(game.state==='upgrade'&&['1','2','3'].includes(k)&&!e.repeat){const c=game.choices[Number(k)-1];if(c)choose(c.id);return;}
 if(k==='escape'){e.preventDefault();pause();return;}if(!['playing','extraction'].includes(game.state))return;
 if([' ','arrowup','arrowdown','arrowleft','arrowright','shift'].includes(k))e.preventDefault();keys.add(k);
 if(!e.repeat){void sound.unlock(true);readInput();if(k==='r')game.reload();if(k==='shift')game.dash();if(k==='e')game.pulse();if(k==='q')game.switchWeapon((game.weapon+1)%3);if(['1','2','3'].includes(k))game.switchWeapon(Number(k)-1);}
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{if(game.state==='playing'||game.state==='extraction')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&(game.state==='playing'||game.state==='extraction'))pause();});
document.addEventListener('pointerup',()=>{void sound.unlock(true);},{passive:true});
$('fullscreenBtn').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.game-panel').requestFullscreen();}catch{game.announce('FULLSCREEN IS UNAVAILABLE IN THIS VIEW');}};
function openInfo(html){if(game.state==='playing'||game.state==='extraction')pause();$('dialogContent').innerHTML=html;$('infoDialog').showModal();}$('closeDialog').onclick=()=>$('infoDialog').close();
$('guideBtn').onclick=()=>openInfo('<span class="modal-label">FIELD MANUAL // OPERATION LOCKDOWN</span><h2>Requisition. Adapt. Extract.</h2><p>Clear six phases. Choose an upgrade after each of the first five. Disable the final sentinel, then hold the south extraction pad for 1.2 seconds.</p><h3>WEAPONS & MOVEMENT</h3><p><kbd>WASD</kbd> / arrows move. Mouse aims. Hold click / <kbd>SPACE</kbd> fires. <kbd>1</kbd> carbine, <kbd>2</kbd> shotgun, <kbd>3</kbd> piercing marksman. <kbd>Q</kbd> cycles. Each weapon keeps its magazine. <kbd>R</kbd> reloads from unlimited reserves. Switching cancels a reload.</p><h3>TACTICAL ABILITIES</h3><p><kbd>SHIFT</kbd> dashes with brief immunity. <kbd>E</kbd> emits an EMP that damages and slows enemies and removes nearby projectiles. Medkits restore 28 HP. Cyan supplies refill your weapon and recharge EMP.</p><h3>READ THE THREATS</h3><p>Orange markers warn of incoming enemies. Sentries charge a visible aim line before firing. Cover blocks shots. The sentinel uses radial barrages and moves over cover. Floor relays warn before discharging in phase five.</p><h3>OBSERVATION & SCORE</h3><p>SCP-173 freezes inside your aim cone unless cover blocks observation. You blink every nine seconds; watch the countdown. Quick kills build a score multiplier. Damage or a four-second gap breaks the chain.</p><h3>TOUCH & SETTINGS</h3><p>Left drag moves; right hold / drag aims and fires. Aim assistance tracks nearby targets. Swap, EMP, Dash, and Reload are on-screen. The arena expands during play, and a minimap shows offscreen threats. Aim assistance, screen shake, and sound settings persist. <kbd>ESC</kbd> pauses. Critical increases enemy health, speed, and damage; scores are separate.</p>');
const dossiers=[
 ['SCP-049-2','The reanimated','Slow but persistent threats that navigate around cover.','Use the carbine at range or the shotgun against a crowd.'],
 ['SCP-939','With many voices','Fast hunters introduced in phase two.','Watch spawn markers. Dash away or slow the pack with EMP.'],
 ['SCP-173','Keep your eyes open','Moves when unobserved. Cover and automatic blinks interrupt observation.','Aim toward it while firing. Use the blink countdown to prepare an escape.'],
 ['SITE SECURITY','Rogue sentry','Compromised drones charge a visible aim line before firing.','Use cover to block shots. Marksman rounds pierce targets.'],
 ['LOCKDOWN SENTINEL','Final lockdown','The final security unit fires radial barrages, gaining more shots below half health.','Move during its charge, use EMP to clear a path, then extract from the south pad.']
];
document.querySelectorAll('[data-threat]').forEach(button=>button.onclick=()=>{const d=dossiers[Number(button.dataset.threat)];openInfo('<span class="modal-label">TACTICAL DOSSIER // '+d[0]+'</span><h2>'+d[1]+'</h2><p>'+d[2]+'</p><h3>ENGAGEMENT PROTOCOL</h3><p>'+d[3]+'</p><p style="font-size:10px">Behaviors are adapted for this simulation. Security units are original game elements.</p>');});
$('creditsBtn').onclick=()=>openInfo('<span class="modal-label">FOUNDATION ARCHIVES // ATTRIBUTION</span><h2>Credits & license</h2><p>Breach Protocol is an unofficial fan game based on the collaborative <a href="https://scp-wiki.wikidot.com/" target="_blank" rel="noopener">SCP Foundation</a> fiction universe. It is not affiliated with the SCP Wiki.</p><p>Inspired by <a href="https://scp-wiki.wikidot.com/scp-049" target="_blank" rel="noopener">SCP-049</a> by Gabriel Jade and Djkaktus, <a href="https://scp-wiki.wikidot.com/scp-939" target="_blank" rel="noopener">SCP-939</a> by EchoFourDelta and Adam Smascher, and <a href="https://scp-wiki.wikidot.com/scp-173" target="_blank" rel="noopener">SCP-173</a> by Moto42. All character artwork here is original vector geometry; no source photographs are used.</p><p>This game and its SCP-derived content are released under <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener">Creative Commons Attribution-ShareAlike 3.0</a>. Sound is synthesized in your browser. Best scores are saved on this device.</p>');

window.addEventListener('resize',resize);new ResizeObserver(resize).observe(canvas);getBest();updateSound();resize();updateHUD();requestAnimationFrame(frame);
