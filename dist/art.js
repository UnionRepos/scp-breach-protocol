function rect(x,y,w,h,fill,stroke){ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,w-1,h-1);}}
function line(x,y,x2,y2,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();}
function circle(x,y,r,fill,stroke,width=1){ctx.beginPath();ctx.arc(x,y,r,0,TAU);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function text(t,x,y,size=10,color='#728563',align='left'){ctx.fillStyle=color;ctx.font=`500 ${size}px "IBM Plex Mono",monospace`;ctx.textAlign=align;ctx.fillText(t,x,y);}
function floor(){rect(0,0,W,H,'#141c12');ctx.strokeStyle='#253020';ctx.lineWidth=.7;ctx.beginPath();for(let x=0;x<W;x+=50){ctx.moveTo(x,0);ctx.lineTo(x,H);}for(let y=0;y<H;y+=50){ctx.moveTo(0,y);ctx.lineTo(W,y);}ctx.stroke();
 rect(35,40,W-70,H-80,'#192316','#414f35');rect(44,49,W-88,H-98,'#182115','#303e29');
 ctx.strokeStyle='#263322';ctx.lineWidth=.6;ctx.beginPath();for(let x=50;x<W-45;x+=50){ctx.moveTo(x,50);ctx.lineTo(x,H-50);}for(let y=50;y<H-45;y+=50){ctx.moveTo(45,y);ctx.lineTo(W-45,y);}ctx.stroke();
 // Cable channels, floor markings, and containment tracks are all geometry.
 for(const x of [116,982]){line(x,80,x,620,'#34412a',3);line(x+7,80,x+7,620,'#10190f',2);}
 ctx.setLineDash([8,10]);line(145,100,955,100,'#4a4d2e');line(145,600,955,600,'#4a4d2e');ctx.setLineDash([]);
 rect(470,45,160,27,'#11180f','#54603b');rect(470,628,160,27,'#11180f','#54603b');for(let x=477;x<625;x+=14){line(x,49,x,67,'#3a452c');line(x,632,x,650,'#3a452c');}rect(38,295,28,110,'#11180f','#54603b');rect(1034,295,28,110,'#11180f','#54603b');for(let y=301;y<401;y+=14){line(42,y,62,y,'#3a452c');line(1038,y,1058,y,'#3a452c');}
 for(const g of gates){circle(g.x,g.y,4,'#d99b54');circle(g.x,g.y,9,null,'#ab7a4140');}
 text('NORTH // 01',550,89,8,'#7a895f','center');text('SOUTH // 03',550,620,8,'#6b7956','center');
 text('CONTAINMENT',550,218,12,'#425238','center');text('SECTOR 07',550,241,23,'#4c5b3d','center');
 circle(550,410,74,null,'#33432a',2);circle(550,410,60,null,'#2c3c25');line(459,410,641,410,'#2d3d26');line(550,319,550,501,'#2d3d26');
 text('MTF STAGING AREA',550,485,7,'#506242','center');
 for(const c of cover){rect(c.x+4,c.y+6,c.w,c.h,'#0a1009aa');rect(c.x,c.y,c.w,c.h,'#303d27','#60714a');rect(c.x+5,c.y+5,c.w-10,c.h-10,'#293621','#435437');line(c.x+7,c.y+8,c.x+c.w-7,c.y+8,'#5c6c47',2);for(let x=c.x+12;x<c.x+c.w-7;x+=18){line(x,c.y+13,x,c.y+c.h-8,'#34452a');}rect(c.x+5,c.y+c.h-6,c.w-10,3,'#172211');}
 // Wall-mounted consoles and warning plates.
 for(const x of [75,960]){rect(x,75,65,25,'#252f20','#4b5b3b');rect(x+7,81,23,10,'#75915a');for(let i=0;i<3;i++)rect(x+36+i*7,83,3,3,i===0?'#d5a45a':'#576d40');rect(x,556,65,28,'#252f20','#4b5b3b');text('HV // 07',x+9,573,8,'#8b9c70');}
 for(const c of [{x:340,y:174},{x:728,y:174},{x:340,y:464},{x:728,y:464}]){rect(c.x,c.y,30,39,'#313e28','#526341');line(c.x+5,c.y+5,c.x+25,c.y+34,'#526341');line(c.x+25,c.y+5,c.x+5,c.y+34,'#526341');}
 // Registration marks.
 for(const [x,y]of [[80,130],[1020,130],[80,570],[1020,570]]){line(x-6,y,x+6,y,'#596a45');line(x,y-6,x,y+6,'#596a45');}
}
function drawOperative(p,ghost=false){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);if(p.invuln>0&&Math.floor(elapsed*18)%2===0)ctx.globalAlpha=.5;circle(2,4,18,'#00000050');if(p.dashTime>0)circle(0,0,22,null,'#d0dfa255',3);rect(-9,-13,17,26,'#83916d','#b5c59a');rect(-11,-10,9,20,'#526143','#97a97c');rect(-10,-6,14,12,'#48573c');rect(3,-15,11,8,'#9ead88','#c1cdab');rect(5,7,11,8,'#9ead88','#c1cdab');rect(9,-4,24,7,'#242e23','#89977b');rect(27,-3,10,4,'#c1c9b3');circle(0,0,10,'#99aa80','#c0cba8',1.5);rect(1,-7,7,14,'#3c4c36');line(5,-5,5,5,'#b8d699',2);if(flash>0&&!ghost){ctx.fillStyle='#ffe2a1';ctx.beginPath();ctx.moveTo(38,-7);ctx.lineTo(55,-2);ctx.lineTo(40,6);ctx.lineTo(43,0);ctx.closePath();ctx.fill();}ctx.restore();if(!ghost){circle(p.x,p.y,24,null,'#b5c48c38');text('NTF-01',p.x,p.y+39,7,'#adc297','center');}}
function drawEnemy(e){ctx.save();ctx.translate(e.x,e.y);const a=Math.atan2(player.y-e.y,player.x-e.x);ctx.rotate(a);circle(2,3,e.r+2,'#00000055');const hit=e.hit>0;
 if(e.type===0){const sway=Math.sin(e.phase)*3;line(-3,-8,-13,-14+sway,hit?'#e8dbac':'#72815a',6);line(-3,8,-13,14-sway,hit?'#e8dbac':'#72815a',6);rect(-10,-10,20,20,hit?'#e5d6a6':'#5b6b49','#8a9a6d');line(7,-10,19,-14-sway,'#84936a',5);line(7,10,19,14+sway,'#84936a',5);circle(9,0,9,hit?'#f2dbb0':'#98a279');rect(12,-5,4,3,'#e8b96b');rect(12,3,4,3,'#e8b96b');}
 else if(e.type===1){for(let i=-1;i<=1;i+=2){line(-10,i*7,-18,i*(17+Math.sin(e.phase)*3),'#b66b56',4);line(8,i*7,16,i*(16-Math.sin(e.phase)*3),'#b66b56',4);}ctx.fillStyle=hit?'#eab5a3':'#8d493b';ctx.beginPath();ctx.ellipse(-2,0,21,11,0,0,TAU);ctx.fill();ctx.fillStyle='#ba725b';ctx.beginPath();ctx.moveTo(12,-8);ctx.lineTo(29,-4);ctx.lineTo(25,6);ctx.lineTo(12,8);ctx.fill();line(18,1,28,1,'#e5c3a0',2);line(-21,0,-32,6,'#8d493b',4);for(let i=-9;i<10;i+=6)line(i,-5,i,-13,'#c48865',2);}
 else if(e.type>=3){
 const boss=e.type===4,s=boss?1.65:1;ctx.scale(s,s);
 ctx.fillStyle=hit?'#f8deaa':'#465c59';ctx.strokeStyle=boss?'#e8ad74':'#93b9ad';ctx.lineWidth=2;
 ctx.beginPath();for(let j=0;j<6;j++){const a=j*Math.PI/3;const x=Math.cos(a)*17,y=Math.sin(a)*17;j?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fill();ctx.stroke();
 circle(0,0,9,'#182c29','#a6c3af');circle(3,0,e.charge>0?6:4,e.charge>0?'#f8b26c':'#a4cfbd');
 for(const y of [-13,13]){rect(-12,y-3,24,6,'#283d36','#668575');rect(7,y-2,15,4,'#c0cbb1');}
 if(e.charge>0)circle(0,0,24,null,'#ecb06e',1.5);
 }else{line(-7,-7,-18,-11,'#a49a79',6);line(-7,7,-18,11,'#a49a79',6);line(5,-8,13,-16,'#bdb18b',5);line(5,8,13,16,'#bdb18b',5);ctx.fillStyle=hit?'#f2e6be':e.frozen?'#d3c69d':'#b8ac83';ctx.beginPath();ctx.ellipse(2,0,20,12,0,0,TAU);ctx.fill();circle(12,0,11,hit?'#fff0bf':'#cabe97');line(14,-6,19,-3,'#7b342c',3);line(14,6,19,3,'#7b342c',3);circle(16,0,2,'#405139');if(e.frozen)circle(0,0,28,null,'#e3d4a444');}
 ctx.restore();if(e.slow>0)circle(e.x,e.y,e.r+6,null,'#a1d6cf88');if(e.hp<e.maxHp){rect(e.x-15,e.y-29,30,3,'#252c20');rect(e.x-15,e.y-29,30*e.hp/e.maxHp,3,'#c69b63');}if(e.type===2&&e.frozen)text('OBSERVED',e.x,e.y-37,6,'#d5c493','center');}

