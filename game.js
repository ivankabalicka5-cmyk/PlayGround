(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const shell = document.querySelector('.game-shell');
  const overlay = document.getElementById('overlay');
  const playButton = document.getElementById('playButton');
  const modalTitle = document.getElementById('modalTitle');
  const modalCopy = document.getElementById('modalCopy');
  const berryCount = document.getElementById('berryCount');
  const heartsEl = document.getElementById('hearts');
  const pulseText = document.getElementById('pulseText');
  const pulseMeter = document.getElementById('pulseMeter');
  const objectiveText = document.getElementById('objectiveText');
  const toast = document.getElementById('toast');
  let W = 960; const H = 540, WORLD = 2020;
  let dpr = 1, running = false, won = false, time = 0, lastTime = 0;
  let cameraX = 0, shake = 0, toastTimer = 0, soundOn = false;
  let pulseTime = 0, pulseCooldown = 0, pulseFx = 0;
  const keys = Object.create(null), touch = {left:false,right:false,jump:false};
  const player = {x:92,y:426,vx:0,vy:0,r:20,onGround:false,face:1,hearts:3,invuln:0,berries:0,checkpoint:90,bounce:0,trail:[]};
  const floors = [{x:0,y:470,w:460},{x:650,y:470,w:380},{x:1210,y:470,w:260},{x:1600,y:470,w:420}];
  const platforms = [
    {x:250,y:412,w:92,h:15},{x:374,y:376,w:70,h:15},
    {x:500,y:416,w:100,h:14,ghost:true},{x:632,y:375,w:92,h:14},
    {x:790,y:393,w:102,h:15},{x:925,y:355,w:78,h:14},
    {x:1052,y:414,w:92,h:14,ghost:true},{x:1150,y:378,w:92,h:14,ghost:true},
    {x:1295,y:409,w:83,h:14},{x:1458,y:392,w:105,h:14,ghost:true},
    {x:1660,y:402,w:90,h:14},{x:1810,y:366,w:105,h:14}
  ];
  const berries = [
    {x:408,y:340,taken:false},{x:856,y:354,taken:false},{x:1374,y:366,taken:false}
  ];
  const moths = [
    {x:840,y:414,home:840,range:105,phase:.2,stun:0},
    {x:1390,y:425,home:1390,range:82,phase:2.1,stun:0},
    {x:1760,y:405,home:1760,range:65,phase:4.1,stun:0}
  ];
  const particles = [], stars = Array.from({length:110},(_,i)=>({x:(i*173+31)%2020,y:24+(i*83)%330,r:.4+(i%4)*.33,a:.22+(i%5)*.11,tw:i*.8}));
  const pads = [];
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function resize(){const r=canvas.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);W=H*r.width/r.height;}
  new ResizeObserver(resize).observe(canvas); resize();
  function say(text){toast.textContent=text;toast.classList.add('show');toastTimer=1.5;}
  function updateHud(){berryCount.innerHTML=`${player.berries} <small>/ 3</small>`;heartsEl.textContent='♥ '.repeat(player.hearts).trim()||'—';objectiveText.textContent=player.berries>=3?'The waystone is awake — reach the glowing exit!':'Gather all 3 moonberries to wake the waystone';}
  function start(){if(won){reset();}running=true;overlay.classList.add('hidden');shell.classList.add('playing');lastTime=performance.now();}
  function reset(){player.x=92;player.y=426;player.vx=player.vy=0;player.hearts=3;player.berries=0;player.checkpoint=90;player.invuln=0;berries.forEach(b=>b.taken=false);pulseTime=pulseCooldown=0;won=false;updateHud();}
  playButton.addEventListener('click',start);
  document.getElementById('soundButton').addEventListener('click',e=>{soundOn=!soundOn;e.currentTarget.textContent=soundOn?'♫':'♪';e.currentTarget.style.color=soundOn?'#9df8ec':'';});
  function setKey(e,value){const k=e.key.toLowerCase();if(['arrowleft','arrowright','arrowup',' ','arrowdown'].includes(k))e.preventDefault();keys[k]=value;if(value&&['e','x',' '].includes(k)&&running){if(k==='e'||k==='x')usePulse();if(k===' ')jump();}}
  window.addEventListener('keydown',e=>setKey(e,true));window.addEventListener('keyup',e=>setKey(e,false));
  function bindHold(id,prop){const el=document.getElementById(id);el.addEventListener('pointerdown',e=>{e.preventDefault();touch[prop]=true;el.setPointerCapture(e.pointerId);if(prop==='jump'&&running)jump();if(prop==='pulse'&&running)usePulse();});for(const ev of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(ev,()=>{touch[prop]=false;});}
  bindHold('leftButton','left');bindHold('rightButton','right');bindHold('jumpButton','jump');bindHold('pulseButton','pulse');
  function jump(){if(!running||!player.onGround)return;player.vy=-570;player.onGround=false;player.bounce=1;emit(player.x,player.y+16,7,'#a8fff0',130);}
  function usePulse(){if(pulseCooldown>0||!running)return;pulseTime=1.65;pulseCooldown=4.2;pulseFx=.55;emit(player.x,player.y,24,'#8efff0',260);shake=.13;say('LUMEN PULSE!');}
  function emit(x,y,n,color,power=100){for(let i=0;i<n;i++){let a=Math.random()*Math.PI*2,s=25+Math.random()*power;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-25,life:.45+Math.random()*.55,max:.9,size:2+Math.random()*4,color});}}
  function damage(){if(player.invuln>0)return;player.hearts--;player.invuln=1.6;shake=.28;emit(player.x,player.y,19,'#ff9bb5',180);if(player.hearts<=0){player.hearts=3;player.x=player.checkpoint;player.y=420;player.vx=player.vy=0;say('A fresh start! Your berries are safe.');}else{player.vx=-player.face*220;player.vy=-310;say('Oof! Watch those marsh moths!');}updateHud();}
  function win(){running=false;won=true;overlay.classList.remove('hidden');shell.classList.remove('playing');modalTitle.innerHTML='Marsh<br><em>master!</em>';modalCopy.textContent='Every moonberry is home, the waystone is glowing, and your little buddy is a legend.';playButton.querySelector('span').textContent='BOUNCE AGAIN';emit(player.x,player.y,42,'#ffe28a',260);}
  function update(dt){time+=dt;if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)toast.classList.remove('show');}if(!running)return;
    if(pulseTime>0)pulseTime=Math.max(0,pulseTime-dt);if(pulseCooldown>0)pulseCooldown=Math.max(0,pulseCooldown-dt);if(pulseFx>0)pulseFx-=dt;if(player.invuln>0)player.invuln-=dt;if(shake>0)shake-=dt;
    const left=keys.arrowleft||keys.a||touch.left,right=keys.arrowright||keys.d||touch.right;
    const accel=player.onGround?1500:970, max=260;
    if(left){player.vx-=accel*dt;player.face=-1;}if(right){player.vx+=accel*dt;player.face=1;}if(!left&&!right)player.vx*=Math.pow(player.onGround?.78:.95,dt*60);player.vx=clamp(player.vx,-max,max);
    if((keys.arrowup||keys.w)&&!player.wasUp)jump();player.wasUp=!!(keys.arrowup||keys.w);
    const oldY=player.y;player.vy+=1450*dt;player.x=clamp(player.x+player.vx*dt,player.r,WORLD-player.r);player.y+=player.vy*dt;player.onGround=false;
    const solid=[...floors,...platforms.filter(p=>!p.ghost||pulseTime>0)];for(const p of solid){if(player.vy>=0&&oldY+player.r<=p.y+3&&player.y+player.r>=p.y&&player.x+player.r>p.x&&player.x-player.r<p.x+p.w){player.y=p.y-player.r;player.vy=0;player.onGround=true;}}
    if(player.y>610){player.hearts--;player.invuln=.8;shake=.25;if(player.hearts<=0)player.hearts=3;player.x=player.checkpoint;player.y=410;player.vx=player.vy=0;updateHud();say('Boing! Back to the last safe patch.');}
    player.bounce=Math.max(0,player.bounce-dt*3);if(player.onGround&&Math.abs(player.vx)>80&&Math.random()<dt*4)emit(player.x,player.y+18,1,'#93e7dc',40);
    for(const b of berries){if(!b.taken&&Math.hypot(player.x-b.x,player.y-b.y)<34){b.taken=true;player.berries++;player.checkpoint=Math.max(player.checkpoint,b.x-120);emit(b.x,b.y,23,'#ffd57a',170);say(player.berries===3?'All berries found! Wake that waystone!':'Moonberry collected!');updateHud();}}
    for(const m of moths){if(m.stun>0)m.stun-=dt;else{m.x=m.home+Math.sin(time*1.35+m.phase)*m.range;}if(Math.hypot(player.x-m.x,player.y-m.y)<player.r+16&&m.stun<=0)damage();}
    if(pulseTime>0){for(const m of moths){if(Math.hypot(player.x-m.x,player.y-m.y)<165)m.stun=Math.max(m.stun,.5);}}
    if(player.berries>=3&&player.x>1945&&player.y>400&&player.y<510)win();
    cameraX=clamp(player.x-W*.36,0,WORLD-W);for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=120*dt;p.life-=dt;}for(let i=particles.length-1;i>=0;i--)if(particles[i].life<=0)particles.splice(i,1);
    pulseText.textContent=pulseTime>0?`ACTIVE · ${pulseTime.toFixed(1)}s`:pulseCooldown>0?`RECHARGING · ${pulseCooldown.toFixed(1)}s`:'READY · E';pulseMeter.style.width=`${pulseTime>0?pulseTime/1.65*100:pulseCooldown>0?(1-pulseCooldown/4.2)*100:100}%`;
  }
  function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
  function drawBackground(){let g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#111a38');g.addColorStop(.58,'#263455');g.addColorStop(1,'#40556e');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    // moon and soft aurora
    const mx=W*.78+cameraX*.12;let moon=ctx.createRadialGradient(mx,114,4,mx,114,170);moon.addColorStop(0,'#ffedc5');moon.addColorStop(.08,'#f8e6bf');moon.addColorStop(.1,'#f8e6bf33');moon.addColorStop(1,'#f8e6bf00');ctx.fillStyle=moon;ctx.fillRect(mx-185,0,370,310);ctx.fillStyle='#ffedcd';ctx.beginPath();ctx.arc(mx,114,27,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e6d9bb';ctx.beginPath();ctx.arc(mx-8,106,4,0,7);ctx.arc(mx+10,119,3,0,7);ctx.arc(mx+3,99,2.4,0,7);ctx.fill();
    ctx.save();ctx.globalAlpha=.12;for(let i=0;i<4;i++){ctx.strokeStyle=i%2?'#91eddc':'#d7c7ff';ctx.lineWidth=35-i*5;ctx.beginPath();ctx.moveTo(-50,116+i*25);ctx.bezierCurveTo(235,25+i*28,470,235-i*17,760,85+i*28);ctx.bezierCurveTo(930,10+i*20,1120,120,1300,50);ctx.stroke();}ctx.restore();
    for(const s of stars){let sx=((s.x-cameraX*.12)%WORLD+WORLD)%WORLD;ctx.globalAlpha=s.a*(.78+.22*Math.sin(time*1.7+s.tw));ctx.fillStyle='#fff5d8';ctx.beginPath();ctx.arc(sx,s.y,s.r,0,Math.PI*2);ctx.fill();if(s.r>1.3){ctx.globalAlpha*=.4;ctx.fillRect(sx-3,s.y-.4,6,.8);ctx.fillRect(sx-.4,s.y-3,0.8,6);}}ctx.globalAlpha=1;
    drawHillLayer('#202e4c',350,.12,92);drawHillLayer('#253956',397,.22,68);drawHillLayer('#2d4960',446,.38,45);
  }
  function drawHillLayer(color,base,speed,amp){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,H);for(let x=0;x<=W+18;x+=18){const wx=x+cameraX*speed;const y=base+Math.sin(wx*.004)*amp+Math.sin(wx*.010+2)*amp*.25;ctx.lineTo(x,y);}ctx.lineTo(W,H);ctx.closePath();ctx.fill();}
  function drawReeds(){for(let x=0;x<WORLD;x+=47){let sx=x-cameraX;if(sx<-20||sx>W+20)continue;let h=12+((x*13)%26);ctx.strokeStyle=x%3?'#5c8b7b':'#73998a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(sx,470);ctx.quadraticCurveTo(sx+Math.sin(time+x)*4,455-h/2,sx+(x%2?7:-6),470-h);ctx.stroke();ctx.fillStyle='#b8a978';ctx.beginPath();ctx.ellipse(sx+(x%2?7:-6),470-h,3,7,-.3,0,Math.PI*2);ctx.fill();}}
  function drawGround(p){let x=p.x-cameraX;if(x+p.w<0||x>W)return;const grd=ctx.createLinearGradient(0,p.y,0,H);grd.addColorStop(0,'#4e8d83');grd.addColorStop(.14,'#335d66');grd.addColorStop(1,'#1b3047');ctx.fillStyle=grd;ctx.fillRect(x,p.y,p.w,H-p.y);ctx.fillStyle='#a0e7bd';roundRect(x,p.y-2,p.w,9,5);ctx.fill();ctx.fillStyle='#b6eece';for(let i=0;i<p.w/22;i++){let xx=x+8+i*22;ctx.beginPath();ctx.ellipse(xx,p.y-2,2,4,Math.sin(i)*.4,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=.19;ctx.fillStyle='#b5e8d8';for(let i=0;i<p.w/31;i++){ctx.beginPath();ctx.ellipse(x+i*31+12,p.y+27+(i%3)*13,9,2,0,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
  function drawPlatform(p){let x=p.x-cameraX;if(x+p.w<-5||x>W+5)return;const active=!p.ghost||pulseTime>0;ctx.save();if(p.ghost){ctx.globalAlpha=active?.95:.24;ctx.shadowColor='#88fff2';ctx.shadowBlur=active?20:5;}ctx.fillStyle=p.ghost?(active?'#8af2dd':'#8fc7d0'):'#6ea99a';roundRect(x,p.y,p.w,12,6);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle=p.ghost?'#e1fff1':'#c3f6d2';roundRect(x+4,p.y,p.w-8,4,2);ctx.fill();ctx.globalAlpha=active?.42:.1;ctx.fillStyle='#b4fff3';ctx.fillRect(x+9,p.y+7,p.w-18,1);ctx.restore();}
  function drawBerry(b){if(b.taken)return;let x=b.x-cameraX,y=b.y+Math.sin(time*3+b.x)*5;ctx.save();ctx.translate(x,y);ctx.shadowColor='#ffd477';ctx.shadowBlur=17;ctx.fillStyle='#ffd274';ctx.beginPath();ctx.arc(0,0,10,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#fff2c3';ctx.beginPath();ctx.arc(-3,-3,3,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#9ff2c5';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-9);ctx.quadraticCurveTo(-3,-16,-8,-14);ctx.quadraticCurveTo(-4,-7,0,-9);ctx.moveTo(1,-9);ctx.quadraticCurveTo(5,-16,9,-12);ctx.quadraticCurveTo(5,-7,1,-9);ctx.stroke();ctx.restore();}
  function drawMoth(m){let x=m.x-cameraX,y=m.y+Math.sin(time*4+m.phase)*6;ctx.save();ctx.translate(x,y);ctx.globalAlpha=m.stun>0?.4:1;ctx.rotate(Math.sin(time*5+m.phase)*.15);ctx.fillStyle='#e5c7ff';ctx.shadowColor='#d6a5ff';ctx.shadowBlur=14;ctx.beginPath();ctx.ellipse(-10,0,9,6,Math.sin(time*14)*.3,0,Math.PI*2);ctx.ellipse(10,0,9,6,-Math.sin(time*14)*.3,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#3c315a';ctx.beginPath();ctx.ellipse(0,2,5,8,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-2,1,1.3,0,7);ctx.arc(2,1,1.3,0,7);ctx.fill();ctx.restore();}
  function drawWaystone(){const x=1940-cameraX,y=430,awake=player.berries>=3;ctx.save();ctx.translate(x,y);ctx.shadowColor=awake?'#9fffea':'#a2aac0';ctx.shadowBlur=awake?30:8;ctx.fillStyle=awake?'#9cebd9':'#7f8da2';ctx.beginPath();ctx.moveTo(-26,38);ctx.lineTo(-21,-10);ctx.lineTo(-8,-27);ctx.lineTo(13,-27);ctx.lineTo(26,-9);ctx.lineTo(30,38);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle=awake?'#e4ffeb':'#aebbd0';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle=awake?'#fff0ae':'#c3cad4';ctx.beginPath();ctx.arc(2,-7,8+Math.sin(time*3)*1.3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#476b76';ctx.beginPath();ctx.arc(2,-7,4,0,Math.PI*2);ctx.fill();if(!awake){ctx.globalAlpha=.7;ctx.fillStyle='#e9dcad';ctx.font='10px sans-serif';ctx.textAlign='center';ctx.fillText('3 ✦',0,58);}ctx.restore();
    // exit gate
    ctx.save();ctx.translate(1990-cameraX,420);ctx.strokeStyle=awake?'#b8ffe6':'#6d7892';ctx.lineWidth=5;ctx.shadowColor='#a2ffee';ctx.shadowBlur=awake?20:0;ctx.beginPath();ctx.arc(0,0,24,Math.PI,0);ctx.lineTo(24,52);ctx.moveTo(-24,0);ctx.lineTo(-24,52);ctx.stroke();ctx.restore();}
  function drawPlayer(){let x=player.x-cameraX,y=player.y;const squish=player.onGround?1+player.bounce*.25:1-player.bounce*.09;ctx.save();ctx.translate(x,y);if(player.invuln>0&&Math.floor(time*15)%2)ctx.globalAlpha=.35;ctx.scale(1/squish,squish);const g=ctx.createRadialGradient(-7,-12,1,0,0,27);g.addColorStop(0,'#e6fff0');g.addColorStop(.24,'#adffdc');g.addColorStop(.66,'#64d6c9');g.addColorStop(1,'#398ca5');ctx.fillStyle=g;ctx.shadowColor='#8ef6e5';ctx.shadowBlur=player.onGround?13:18;ctx.beginPath();ctx.ellipse(0,0,player.r,player.r*.95,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#f6ffff';ctx.globalAlpha*=.78;ctx.beginPath();ctx.ellipse(-8,-11,5,2.4,-.55,0,Math.PI*2);ctx.fill();ctx.globalAlpha=player.invuln>0&&Math.floor(time*15)%2?.35:1;ctx.fillStyle='#173e54';const eyeY=-2;ctx.beginPath();ctx.ellipse(-6,eyeY,2.2,3.8,0,0,Math.PI*2);ctx.ellipse(6,eyeY,2.2,3.8,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#173e54';ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(0,5,3.2,.25,Math.PI-.25);ctx.stroke();if(player.berries>0){ctx.fillStyle='#ffdc7a';ctx.beginPath();ctx.arc(0,-24,3+Math.sin(time*5)*.8,0,Math.PI*2);ctx.fill();}ctx.restore();
    if(pulseFx>0){ctx.save();ctx.globalAlpha=pulseFx*1.5;ctx.strokeStyle='#a1fff1';ctx.lineWidth=3;ctx.shadowColor='#83fff3';ctx.shadowBlur=18;ctx.beginPath();ctx.arc(x,y,30+(1-pulseFx/.55)*120,0,Math.PI*2);ctx.stroke();ctx.restore();}}
  function drawWater(){ctx.save();let g=ctx.createLinearGradient(0,470,0,H);g.addColorStop(0,'#315a72');g.addColorStop(1,'#152c49');ctx.fillStyle=g;ctx.fillRect(0,470,W,70);ctx.globalAlpha=.25;ctx.strokeStyle='#a0e9d8';ctx.lineWidth=1;for(let i=0;i<8;i++){let x=((i*147+time*28-cameraX*.4)%1100+1100)%1100;ctx.beginPath();ctx.ellipse(x,487+(i%3)*15,15+(i%4)*4,2,0,0,Math.PI*2);ctx.stroke();}ctx.restore();}
  function render(){const cw=canvas.width,ch=canvas.height;ctx.setTransform(cw/W,0,0,ch/H,0,0);ctx.clearRect(0,0,W,H);drawBackground();ctx.save();if(shake>0)ctx.translate((Math.random()-.5)*shake*30,(Math.random()-.5)*shake*30);drawWater();drawReeds();for(const f of floors)drawGround(f);for(const p of platforms)drawPlatform(p);drawWaystone();for(const b of berries)drawBerry(b);for(const m of moths)drawMoth(m);drawPlayer();for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x-cameraX,p.y,p.size,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;ctx.restore();
    // vignette and soft sky glints
    const v=ctx.createRadialGradient(W/2,H*.44,H*.22,W/2,H*.44,H*.83);v.addColorStop(0,'#07132900');v.addColorStop(1,'#09122655');ctx.fillStyle=v;ctx.fillRect(0,0,W,H);
  }
  function frame(now){const dt=Math.min(.034,(now-lastTime)/1000||0);lastTime=now;update(dt);render();requestAnimationFrame(frame);}
  updateHud();requestAnimationFrame(frame);
})();
