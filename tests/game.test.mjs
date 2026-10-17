import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const core=vm.runInNewContext(`${readFileSync(new URL('../dist/engine.js',import.meta.url),'utf8')}\nBreachCore`);
const {Game,WEAPONS,COVER}=core;
function seeded(seed=7){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function fresh(){const g=new Game({random:seeded()});g.start();g.spawnTimer=999;return g;}
function advance(g,seconds,step=1/120){for(let t=0;t<seconds-1e-8;t+=step)g.update(Math.min(step,seconds-t));}
function isolate(g){g.spawned=g.quota;g.warnings=[];g.enemies=[];g.phaseTimer=-1000;}

test('weapons keep independent magazines and switching cancels reload safely',()=>{
  const g=fresh();g.player.angle=0;g.shoot();assert.equal(g.ammo[0],29);g.reload();assert.ok(g.reloadTimer>0);
  g.switchWeapon(1);assert.equal(g.reloadTimer,0);assert.equal(g.ammo[1],8);g.fireTimer=0;g.shoot();
  assert.equal(g.bullets.length,7);assert.equal(g.ammo[1],7);g.switchWeapon(0);assert.equal(g.ammo[0],29);
});
test('reload duration and magazine upgrades apply to the correct weapon',()=>{
  const g=fresh();g.upgrades.reload=1;g.upgrades.mag=1;g.ammo[0]=3;g.reload();
  assert.ok(Math.abs(g.reloadTimer-WEAPONS[0].reload*.8)<1e-8);advance(g,1.3);
  assert.equal(g.ammo[0],38);assert.equal(g.reloadTimer,0);
});
test('swept bullet collision stops shots at cover and marksman rounds pierce enemies',()=>{
  const g=fresh();isolate(g);g.player.x=100;g.player.y=190;g.player.angle=0;
  const protectedEnemy=g.spawn(0,370,190);protectedEnemy.speed=0;g.shoot();advance(g,.4);
  assert.equal(protectedEnemy.hp,protectedEnemy.maxHp);
  g.enemies=[];g.bullets=[];g.player.x=400;g.player.y=400;g.weapon=2;g.fireTimer=0;
  const a=g.spawn(0,520,400),b=g.spawn(0,600,400);a.speed=0;b.speed=0;g.shoot();advance(g,.25);
  assert.equal(g.kills,2);assert.equal(g.hits,1);assert.equal(g.projectiles,2);
});
test('dash cannot tunnel through cover, and immunity prevents contact damage',()=>{
  const g=fresh();g.player.x=155;g.player.y=190;g.input.x=1;g.dash();const hp=g.player.hp;g.damage(50);
  assert.equal(g.player.hp,hp);advance(g,.2);assert.ok(g.player.x<=200-g.player.r+.01);
  assert.equal(g.collides(g.player.x,g.player.y,g.player.r),false);
});
test('EMP damages and slows nearby enemies, removes shots, and enforces cooldown',()=>{
  const g=fresh();const a=g.spawn(2,640,410),b=g.spawn(2,900,400);
  g.hostiles=[{x:600,y:410},{x:900,y:400}];assert.equal(g.pulse(),true);
  assert.equal(a.hp,5);assert.equal(a.slow,2.5);assert.equal(b.hp,8);assert.equal(g.hostiles.length,1);
  assert.equal(g.pulse(),false);assert.equal(g.player.pulse,10);
});
test('observation freezes SCP-173; cover and blinking interrupt it',()=>{
  const g=fresh();g.wave=3;g.player.angle=0;g.input.aim=true;g.input.aimX=800;g.input.aimY=410;
  const statue=g.spawn(2,700,410);advance(g,.01);assert.equal(statue.frozen,true);
  g.blink=8.72;advance(g,.01);assert.equal(statue.frozen,false);
  g.blink=0;g.player.x=350;g.player.y=320;g.input.aimX=550;g.input.aimY=320;statue.x=550;statue.y=320;
  advance(g,.01);assert.equal(statue.frozen,false);
});
test('enemies route around straight crates and inside corners without intersecting them',()=>{
  for(const [from,to]of [[[150,190],[375,190]],[[700,320],[400,320]],[[550,500],[550,600]],[[275,260],[150,190]]]){
    const g=fresh();isolate(g);[g.player.x,g.player.y]=to;g.player.invuln=100;
    const enemy=g.spawn(0,...from);enemy.speed=90;let closest=Infinity;
    for(let i=0;i<1700;i++){g.update(1/120);assert.equal(g.collides(enemy.x,enemy.y,enemy.r),false);closest=Math.min(closest,Math.hypot(enemy.x-g.player.x,enemy.y-g.player.y));}
    assert.ok(closest<40,`enemy never found route ${from} to ${to}, closest ${closest}`);
  }
});
test('spawns are telegraphed and select a gate away from the player',()=>{
  const g=fresh();g.queueSpawn(1);assert.equal(g.enemies.length,0);assert.equal(g.warnings.length,1);
  assert.ok(Math.hypot(g.warnings[0].x-g.player.x,g.warnings[0].y-g.player.y)>280);
  advance(g,.6);assert.equal(g.enemies.length,0);advance(g,.35);assert.equal(g.enemies.length,1);
});
test('ranged attacks warn first, and cover blocks hostile projectiles',()=>{
  const g=fresh();isolate(g);g.player.x=700;g.player.y=400;const sentry=g.spawn(3,400,400);sentry.attack=0;sentry.speed=0;
  advance(g,.1);assert.ok(sentry.charge>0);assert.equal(g.hostiles.length,0);advance(g,.8);assert.ok(g.hostiles.length>0);
  g.hostiles=[{x:180,y:190,vx:210,vy:0,life:3,damage:10}];g.enemies=[];advance(g,.3);assert.equal(g.hostiles.length,0);
});
test('upgrades freeze combat and only offered requisitions can be selected',()=>{
  const g=fresh();g.spawned=g.quota;advance(g,1.5);assert.equal(g.state,'upgrade');assert.equal(g.choices.length,3);
  const elapsed=g.elapsed;advance(g,3);assert.equal(g.elapsed,elapsed);assert.equal(g.chooseUpgrade('invalid'),false);
  const choice=g.choices[0];assert.equal(g.chooseUpgrade(choice.id),true);assert.equal(g.upgrades[choice.id],1);assert.equal(g.wave,2);assert.equal(g.state,'playing');
});
test('six phases lead to extraction; victory requires holding the actual pad',()=>{
  const g=fresh();for(let wave=1;wave<=6;wave++){
    assert.equal(g.wave,wave);g.spawned=g.quota;g.enemies=[];g.warnings=[];advance(g,1.5);
    if(wave<6){assert.equal(g.state,'upgrade');g.chooseUpgrade(g.choices[0].id);}
  }
  assert.equal(g.state,'extraction');advance(g,2);assert.equal(g.state,'extraction');
  g.player.x=550;g.player.y=607;advance(g,.7);g.player.x=700;advance(g,.1);assert.equal(g.phaseTimer,0);
  g.player.x=550;advance(g,1.3);assert.equal(g.state,'won');
});
test('final phase includes a sentinel and its damaged phase fires a larger barrage',()=>{
  const g=fresh();g.wave=5;g.nextWave();assert.equal(g.warnings[0].type,4);advance(g,1.7);
  const boss=g.enemies.find(e=>e.type===4);assert.ok(boss);boss.x=550;boss.y=140;boss.hp=40;boss.attack=0;g.player.x=550;g.player.y=410;
  advance(g,1.2);assert.ok(g.hostiles.length>=8);
});
test('relay hazards warn before impact and damage can never overwrite defeat with victory',()=>{
  const g=fresh();isolate(g);g.wave=5;g.hazardTimer=999;g.hazards=[{x:550,y:410,r:66,time:.2,total:1.5,active:false}];
  advance(g,.1);assert.equal(g.player.hp,100);advance(g,.11);assert.equal(g.player.hp,78);
  g.player.invuln=0;g.player.hp=1;g.hostiles=[{x:550,y:410,vx:0,vy:0,life:1,damage:20}];g.phaseTimer=2;g.update(1/120);
  assert.equal(g.state,'dead');
});
test('supply pickups restore resources and damage breaks combo scoring',()=>{
  const g=fresh();g.player.hp=45;g.pickups=[{x:550,y:410,type:'med',life:5}];g.update(.01);assert.equal(g.player.hp,73);
  g.player.pulse=9;g.ammo[0]=1;g.pickups=[{x:550,y:410,type:'overcharge',life:5}];g.update(.01);assert.equal(g.player.pulse,0);assert.equal(g.ammo[0],30);
  for(let i=0;i<4;i++)g.hitEnemy(g.spawn(0,900,400),10);assert.equal(g.multiplier,1.5);g.damage(1);assert.equal(g.multiplier,1);
});
test('simulation movement is stable at different update rates and paused time is frozen',()=>{
  const a=fresh(),b=fresh();a.input.x=1;b.input.x=1;advance(a,.5,1/120);advance(b,.5,1/60);
  assert.ok(Math.abs(a.player.x-b.player.x)<.01);a.state='paused';const before=a.elapsed;advance(a,5);assert.equal(a.elapsed,before);
});
test('effects stay bounded during extended combat',()=>{
  const g=fresh();for(let i=0;i<200;i++)g.spark(500,400,'white',20);assert.ok(g.particles.length<=260);g.updateEffects(1);assert.equal(g.particles.length,0);
});
