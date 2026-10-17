// A deterministic, fallible bot for pacing checks. It uses normal movement,
// ammunition, damage, upgrades, and ability cooldowns; never grants immunity.
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const {Game,distance}=vm.runInNewContext(`${readFileSync(new URL('../dist/engine.js',import.meta.url),'utf8')}\nBreachCore`);
for(const initial of [7,42,101]){
  let seed=initial;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const game=new Game({random});game.start();
  const route=[{x:550,y:120},{x:960,y:120},{x:960,y:585},{x:140,y:585},{x:140,y:120}];let waypoint=0;
  for(let tick=0;tick<120*360&&!['won','dead'].includes(game.state);tick++){
    if(game.state==='upgrade'){
      const order=['damage','reload','armor','mag','pulse','speed','dash'];
      game.chooseUpgrade([...game.choices].sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id))[0].id);
    }
    const p=game.player;
    let target=route[waypoint];if(distance(p,target)<18)waypoint=(waypoint+1)%route.length;
    if(game.state==='extraction'&&p.y>570)target={x:550,y:607};
    const angle=Math.atan2(target.y-p.y,target.x-p.x);game.input.x=Math.cos(angle);game.input.y=Math.sin(angle);
    const visible=game.enemies.filter(e=>game.clearLine(p,e)).sort((a,b)=>distance(p,a)-distance(p,b));
    const enemy=visible[0];game.input.fire=!!enemy;game.input.aim=!!enemy;
    if(enemy){game.input.aimX=enemy.x;game.input.aimY=enemy.y;
      const range=distance(p,enemy);game.switchWeapon(range<170?1:2);
      if(range<145)game.pulse();if(range<75)game.dash();
    }
    game.update(1/120);
  }
  console.log(JSON.stringify({seed:initial,state:game.state,phase:game.wave,kills:game.kills,hp:game.player.hp,seconds:Math.round(game.elapsed),score:game.score}));
}
