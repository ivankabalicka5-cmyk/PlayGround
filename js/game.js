const canvas=document.querySelector('#scene'),ctx=canvas.getContext('2d');
const $=s=>document.querySelector(s);
const ui={hp:$('#hpFill'),hpText:$('#hpText'),energy:$('#energyFill'),wave:$('#waveText'),boss:$('#bossHud'),bossFill:$('#bossFill'),hint:$('#hint'),toast:$('#toast'),combo:$('#combo'),ultimate:$('#ultimateReady'),result:$('#result'),start:$('#startScreen'),pause:$('#pauseScreen'),status:$('#statusText')};
let W=innerWidth,H=innerHeight,DPR=1,playing=false,paused=false,won=false,startedAt=0,last=0,elapsed=0,shake=0,flash=0,combo=0,comboTimer=0,energy=0,soundOn=false;
const player={x:0,z:4.7,hp:100,maxHp:100,face:0,speed:5.2,attackCd:0,skillCd:0,dodgeCd:0,dodge:0,dodgeDir:{x:0,z:0},invuln:0,ult:false,anim:0,hitFlash:0};
let enemies=[],particles=[],rings=[],floaters=[];
const keys=new Set();
function resize(){DPR=Math.min(devicePixelRatio||1,1.8);W=innerWidth;H=innerHeight;canvas.width=Math.floor(W*DPR);canvas.height=Math.floor(H*DPR);canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(DPR,0,0,DPR,0,0)}
addEventListener('resize',resize);resize();
function spawnEnemies(){enemies=[{x:-3,z:-2.7,hp:48,max:48,kind:'grunt',phase:Math.random()*5,attack:1.6},{x:2.8,z:-3.4,hp:48,max:48,kind:'grunt',phase:Math.random()*5,attack:2.4},{x:.2,z:-5.5,hp:155,max:155,kind:'boss',phase:2,attack:2.9}];ui.boss.classList.add('show');updateHud()}
function startGame(){player.hp=100;player.x=0;player.z=4.7;player.face=0;player.dodge=0;player.invuln=0;player.ult=false;player.skillCd=0;player.attackCd=0;energy=0;combo=0;elapsed=0;won=false;particles=[];rings=[];floaters=[];spawnEnemies();playing=true;paused=false;startedAt=performance.now();ui.start.classList.add('hidden');ui.result.classList.add('hidden');ui.pause.classList.add('hidden');ui.status.textContent='БОЙ ИДЁТ';toast('НАРУШИТЕЛИ ОБНАРУЖЕНЫ');setTimeout(()=>ui.hint.style.opacity='.6',3800)}
function toast(t){ui.toast.textContent=t;ui.toast.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>ui.toast.classList.remove('show'),1350)}
function setPause(v){if(!playing)return;paused=v;ui.pause.classList.toggle('hidden',!paused)}
$('#startBtn').addEventListener('click',startGame);$('#restartBtn').addEventListener('click',startGame);$('#pauseBtn').addEventListener('click',()=>setPause(!paused));$('#soundBtn').addEventListener('click',e=>{soundOn=!soundOn;e.currentTarget.textContent=soundOn?'♫':'♩';toast(soundOn?'ЗВУК ВКЛЮЧЁН':'ЗВУК ВЫКЛЮЧЕН')});
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();keys.add(k);if(k==='escape')setPause(!paused);if(!playing||paused)return;if(k==='j'||k==='z')attack();if(k==='k'||k==='x')skill();if(k===' ')dodge();if(k==='q')ultimate()});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
const touchKeys={};document.querySelectorAll('[data-key]').forEach(b=>{const k=b.dataset.key;b.addEventListener('pointerdown',e=>{e.preventDefault();keys.add(k);touchKeys[k]=b;b.setPointerCapture(e.pointerId)});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>b.addEventListener(ev,()=>keys.delete(k)))});
document.querySelectorAll('[data-action]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();if(!playing||paused)return;const a=b.dataset.action;if(a==='attack')attack();if(a==='skill')skill();if(a==='dodge')dodge()})});
function nearest(){return enemies.filter(e=>e.hp>0).sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z))[0]}
function attack(){if(player.attackCd>0)return;player.attackCd=.34;player.anim=.22;const target=nearest();player.face=target?Math.atan2(target.x-player.x,target.z-player.z):player.face;let hit=false;for(const e of enemies){if(e.hp<=0)continue;const dx=e.x-player.x,dz=e.z-player.z,dist=Math.hypot(dx,dz),dot=(dx*Math.sin(player.face)+dz*Math.cos(player.face))/(dist||1);if(dist<2.35&&dot>-.2){damage(e,22+Math.random()*5,player.x+Math.sin(player.face)*.6,player.z+Math.cos(player.face)*.6);hit=true}}if(hit){energy=Math.min(100,energy+14);combo++;comboTimer=2.2;shake=3;updateHud()}}
function skill(){if(player.skillCd>0)return;player.skillCd=4.5;player.anim=.5;shake=9;flash=.12;rings.push({x:player.x,z:player.z,r:.2,max:4.1,life:.42,maxLife:.42,color:'#62ffe5'});let hit=false;for(const e of enemies){if(e.hp>0&&Math.hypot(e.x-player.x,e.z-player.z)<4.1){damage(e,38,player.x,player.z);hit=true}}if(hit){energy=Math.min(100,energy+18);combo++;comboTimer=2.2}burst(player.x,player.z,'#71ffe2',23);updateHud()}
function dodge(){if(player.dodgeCd>0)return;let dx=(keys.has('d')?1:0)-(keys.has('a')?1:0),dz=(keys.has('s')?1:0)-(keys.has('w')?1:0);if(!dx&&!dz){dx=Math.sin(player.face);dz=Math.cos(player.face)}const l=Math.hypot(dx,dz)||1;player.dodgeDir={x:dx/l,z:dz/l};player.dodge=.27;player.dodgeCd=.9;player.invuln=.43;burst(player.x,player.z,'#69f7e4',8)}
function ultimate(){if(energy<100||player.ult)return;energy=0;player.ult=true;shake=18;flash=.32;toast('ПРЕДЕЛЬНЫЙ ИМПУЛЬС');rings.push({x:player.x,z:player.z,r:.5,max:7.8,life:.75,maxLife:.75,color:'#ff5a9c'});for(const e of enemies){if(e.hp>0&&Math.hypot(e.x-player.x,e.z-player.z)<8)damage(e,75,player.x,player.z,true)}burst(player.x,player.z,'#ff5897',44);setTimeout(()=>player.ult=false,800);updateHud()}
function damage(e,amt,x,z,big=false){e.hp=Math.max(0,e.hp-amt);e.flash=.12;e.stun=.16;e.vx=(e.x-x)*2.5;e.vz=(e.z-z)*2.5;floaters.push({x:e.x,z:e.z-0.1,y:1.8,text:Math.round(amt),life:.75,big});burst(e.x,e.z,big?'#ff8cb4':'#d7fff8',big?12:5);if(e.hp===0){burst(e.x,e.z,e.kind==='boss'?'#ff5b93':'#6cf8e3',22);energy=Math.min(100,energy+10);combo+=2;comboTimer=2.5;updateHud()}if(e.kind==='boss')ui.bossFill.style.width=(e.hp/e.max*100)+'%'}
function burst(x,z,color,n){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=.7+Math.random()*5;particles.push({x,z,y:.2+Math.random()*1.5,vx:Math.cos(a)*s,vz:Math.sin(a)*s,vy:1+Math.random()*4,life:.25+Math.random()*.55,max:.8,color,size:1.2+Math.random()*3})}}
function updateHud(){const pct=player.hp/player.maxHp*100;ui.hp.style.width=pct+'%';ui.hpText.textContent=`${Math.ceil(player.hp)} / ${player.maxHp}`;ui.energy.style.width=energy+'%';const left=enemies.filter(e=>e.hp>0).length;ui.wave.innerHTML=`ВРАГИ: <span>${String(left).padStart(2,'0')}</span>`;ui.ultimate.classList.toggle('show',energy>=100);ui.combo.querySelector('b').textContent=combo;ui.combo.classList.toggle('active',combo>0&&comboTimer>0);if(pct<28)ui.hp.style.filter='brightness(1.35)'}
function update(dt){if(!playing||paused)return;elapsed=(performance.now()-startedAt)/1000;player.attackCd=Math.max(0,player.attackCd-dt);player.skillCd=Math.max(0,player.skillCd-dt);player.dodgeCd=Math.max(0,player.dodgeCd-dt);player.dodge=Math.max(0,player.dodge-dt);player.invuln=Math.max(0,player.invuln-dt);player.anim=Math.max(0,player.anim-dt);player.hitFlash=Math.max(0,player.hitFlash-dt);comboTimer=Math.max(0,comboTimer-dt);if(!comboTimer)combo=0;shake=Math.max(0,shake-dt*20);flash=Math.max(0,flash-dt);
 let mx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),mz=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);const moving=mx!==0||mz!==0;const ml=Math.hypot(mx,mz)||1;if(moving){mx/=ml;mz/=ml}if(player.dodge>0){mx=player.dodgeDir.x;mz=player.dodgeDir.z}if(moving||player.dodge>0){player.x+=mx*player.speed*(player.dodge>0?3.7:1)*dt;player.z+=mz*player.speed*(player.dodge>0?3.7:1)*dt;player.face=Math.atan2(mx,mz)}player.x=Math.max(-7,Math.min(7,player.x));player.z=Math.max(-2,Math.min(7,player.z));
 for(const e of enemies){if(e.hp<=0)continue;e.flash=Math.max(0,e.flash-dt);e.stun=Math.max(0,e.stun-dt);e.attack-=dt;e.phase+=dt*2;const dx=player.x-e.x,dz=player.z-e.z,d=Math.hypot(dx,dz)||1;if(e.stun<=0&&d>1.45){const sp=e.kind==='boss'?1.25:1.65;e.x+=dx/d*sp*dt;e.z+=dz/d*sp*dt}if(e.attack<.72&&e.attack>0&&d<3.8){e.telegraph=1-e.attack/.72}if(e.attack<=0){if(d<2.5&&player.invuln<=0){player.hp=Math.max(0,player.hp-(e.kind==='boss'?14:9));player.hitFlash=.22;shake=7;combo=0;comboTimer=0;updateHud()}e.attack=e.kind==='boss'?2.15+Math.random()*.6:1.9+Math.random()*.7;e.telegraph=0}}
 for(const p of particles){p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=p.vy*dt;p.vy-=8*dt;p.vx*=Math.pow(.08,dt);p.vz*=Math.pow(.08,dt);p.life-=dt}particles=particles.filter(p=>p.life>0);for(const r of rings){r.r+=(r.max-r.r)*dt*8;r.life-=dt}rings=rings.filter(r=>r.life>0);for(const f of floaters){f.y+=dt*1.1;f.life-=dt}floaters=floaters.filter(f=>f.life>0);
 if(player.hp<=0){endGame(false);return}if(enemies.every(e=>e.hp<=0)){endGame(true);return}updateHud()}
function endGame(win){playing=false;won=win;ui.status.textContent=win?'СЕКТОР ЗАЧИЩЕН':'СИГНАЛ ПОТЕРЯН';if(win){ui.result.classList.remove('hidden');ui.result.querySelector('.result-kicker').textContent='SECTOR 09 — COMPLETE';ui.result.querySelector('.result-title').innerHTML='ЗОНА<br><span>ОЧИЩЕНА.</span>';ui.result.querySelector('p').innerHTML='Неплохая работа, прокси.<br>Город снова может дышать.';$('#restartBtn').innerHTML='В БОЙ <span>↗</span>';$('#finalTime').textContent=fmt(elapsed);$('#finalRank').textContent=player.hp>65?'S':player.hp>30?'A':'B'}else{ui.result.classList.remove('hidden');ui.result.querySelector('.result-kicker').textContent='SIGNAL LOST — RECONNECT';ui.result.querySelector('.result-title').innerHTML='ОПЕРАЦИЯ<br><span>ПРЕРВАНА.</span>';ui.result.querySelector('p').innerHTML='Прокси, мы потеряли связь.<br>Попробуй ещё раз.';$('#finalTime').textContent=fmt(elapsed);$('#finalRank').textContent='—';$('#restartBtn').innerHTML='ПОВТОРИТЬ <span>↗</span>'}ui.boss.classList.remove('show')}
function fmt(t){return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`}
let camX=0,camZ=0,worldTime=0;
function proj(x,z,y=0){const base=Math.min(W/30,H/17),p=1+z*.023;return{x:W*.5+(x-camX)*base*p,y:H*.57+(z-camZ)*base*.47-y*base*p,s:base*p}}
function polygon(points,fill,stroke=null,lw=1){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.lineWidth=lw;ctx.strokeStyle=stroke;ctx.stroke()}}
function drawBackground(t){
 const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#101327');sky.addColorStop(.47,'#25243a');sky.addColorStop(.7,'#111a2b');sky.addColorStop(1,'#080c18');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 let glow=ctx.createRadialGradient(W*.5,H*.48,5,W*.5,H*.48,W*.56);glow.addColorStop(0,'#ff49752a');glow.addColorStop(.4,'#65395716');glow.addColorStop(1,'transparent');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
 // distant city silhouettes
 for(let side=0;side<2;side++){const dir=side?1:-1;for(let i=0;i<8;i++){const bw=38+(i*29%64),bh=90+(i*71%190),x=side?W*.53+i*67:W*.47-i*66-bw,y=H*.49-bh;ctx.fillStyle=i%2?'#111526':'#16172a';ctx.fillRect(x,y,bw,bh);ctx.fillStyle='#ff537020';ctx.fillRect(x+bw*.22,y+bh*.28,2,Math.max(3,bh*.18));for(let wy=y+10;wy<H*.49-5;wy+=13)for(let wx=x+7;wx<x+bw-4;wx+=12)if(((wx*3+wy*7+i)%5)<2){ctx.fillStyle=(i+wy)%3?'#67f6e425':'#ff829324';ctx.fillRect(wx,wy,3,5)}}}
 // overhead cables and distant gate
 ctx.strokeStyle='#8794ab36';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,H*.28);ctx.bezierCurveTo(W*.24,H*.39,W*.6,H*.29,W,H*.38);ctx.stroke();
 const horizon=H*.49;ctx.fillStyle='#12192a';ctx.fillRect(0,horizon,W,H*.15);ctx.fillStyle='#6cf8e3';ctx.globalAlpha=.6;ctx.fillRect(W*.44,horizon+6,W*.12,2);ctx.globalAlpha=1;
 // backlit sign panels
 ctx.save();ctx.translate(W*.19,H*.39);ctx.rotate(-.08);ctx.fillStyle='#ff376b';ctx.globalAlpha=.18;ctx.fillRect(0,0,70,3);ctx.globalAlpha=.75;ctx.font='700 9px monospace';ctx.fillStyle='#ff7995';ctx.fillText('危険 / 04',0,-5);ctx.restore();
 // floor plane
 const floor=ctx.createLinearGradient(0,H*.49,0,H);floor.addColorStop(0,'#202537');floor.addColorStop(.45,'#171e2e');floor.addColorStop(1,'#0c1220');ctx.fillStyle=floor;ctx.fillRect(0,horizon,W,H-horizon);
 // pavement tiles projected perspective
 ctx.save();ctx.beginPath();ctx.rect(0,horizon,W,H-horizon);ctx.clip();ctx.lineWidth=1;for(let z=-7;z<=12;z++){const a=proj(-14,z),b=proj(14,z);ctx.strokeStyle=z%3===0?'#8894b12b':'#8794a114';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}for(let x=-15;x<=15;x+=1.35){const a=proj(x,-7),b=proj(x,12);ctx.strokeStyle=(Math.round(x*10)%3===0)?'#93a2b41c':'#8595aa0e';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}
 // neon strips on street
 for(const z of [-3.8,1.8]){const a=proj(-9,z),b=proj(9,z);ctx.strokeStyle=z<0?'#ff477a70':'#50dddb40';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}
 // puddles
 for(const [x,z,r] of [[-5,1,1.5],[4,-1,1.9],[2,5,2.4],[-3,-4,1.4]]){const p=proj(x,z);ctx.fillStyle='#6cf8e30b';ctx.beginPath();ctx.ellipse(p.x,p.y,r*p.s*.8,r*p.s*.17,-.1,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#83e5ed25';ctx.lineWidth=1;ctx.stroke()}
 ctx.restore();
 // foreground atmosphere glows
 ctx.globalAlpha=.13;ctx.fillStyle='#39dcd1';ctx.fillRect(0,H*.71,W,1);ctx.globalAlpha=1;
}
function actorShape(x,z,kind,face,flash=0,anim=0){const p=proj(x,z);const boss=kind==='boss';const size=boss?1.27:kind==='player'?1:.86;const s=p.s*size;ctx.save();ctx.translate(p.x,p.y);ctx.scale(s,s);
 // shadow
 ctx.fillStyle='#02050aa0';ctx.beginPath();ctx.ellipse(0,0,boss?.75:.53,.19,0,0,Math.PI*2);ctx.fill();
 if(kind!=='player'&&kind!=='boss'){}else if(kind==='player'){
 // cyan foot trail
 if(player.dodge>0){ctx.globalAlpha=.35;ctx.fillStyle='#69ffe0';ctx.beginPath();ctx.ellipse(-Math.sin(face)*.7,.02,.66,.13,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}
 }
 ctx.rotate(face);let bob=anim>0?Math.sin(worldTime*37)*.08:Math.sin(worldTime*5+x)*.035;ctx.translate(0,bob);
 if(kind==='player'){
  const coat=player.hitFlash>0?'#fff':player.ult?'#ffd3e4':'#e7edf5';
  // legs
  polygon([[-.31,-.02],[-.04,-.03],[-.12,.58],[-.38,.58]],'#172537');polygon([[.04,-.03],[.3,-.03],[.42,.55],[.17,.57]],'#233247');
  polygon([[-.43,.55],[-.1,.55],[-.08,.7],[-.49,.7]],'#101a28');polygon([[.15,.54],[.43,.53],[.56,.68],[.14,.68]],'#111928');
  // scarf streaming behind
  polygon([[-.25,-.68],[-.62,-.52],[-.92,-.31],[-.52,-.37],[-.22,-.45]],'#ff4d82');
  // jacket base
  polygon([[-.35,-.73],[.32,-.72],[.4,-.17],[.24,.06],[-.31,.04],[-.44,-.26]],coat,'#9fbbce',.025);
  polygon([[-.35,-.69],[-.04,-.66],[-.12,-.17],[-.28,-.05],[-.43,-.29]],'#26394a');polygon([[.04,-.66],[.31,-.7],[.39,-.27],[.22,-.08],[.02,-.17]],'#b2c4cd');
  // collar and belt
  polygon([[-.17,-.68],[.15,-.67],[.08,-.51],[-.03,-.43]],'#142a38');polygon([[-.32,-.09],[.29,-.12],[.32,.02],[-.31,.04]],'#101b29');
  // arms
  polygon([[-.34,-.6],[-.52,-.51],[-.57,-.15],[-.39,-.1],[-.24,-.43]],'#192b3e');polygon([[.3,-.62],[.48,-.51],[.48,-.16],[.31,-.13],[.2,-.44]],'#27394a');
  // glowing cuffs
  ctx.fillStyle='#6cf8e3';ctx.fillRect(-.57,-.19,.18,.045);ctx.fillRect(.31,-.2,.18,.045);
  // head
  ctx.fillStyle='#e6c6bd';ctx.beginPath();ctx.ellipse(0,-.84,.22,.25,0,0,Math.PI*2);ctx.fill();
  polygon([[-.22,-.88],[-.19,-1.13],[.04,-1.17],[.25,-1.01],[.17,-.91],[.07,-1.01],[-.03,-.89]],'#182436');polygon([[-.17,-1],[.12,-1.06],[.24,-.98],[.1,-.93],[-.1,-.94]],'#25384a');
  ctx.fillStyle='#ff658c';ctx.fillRect(.08,-.9,.12,.026);
  // sword on back / energy edge
  ctx.save();ctx.rotate(-.43);polygon([[.37,-.35],[.48,-.38],[.9,-1.07],[.82,-1.11]],'#a7fff5');ctx.fillStyle='#58f3df';ctx.shadowColor='#44ffe3';ctx.shadowBlur=10;ctx.fillRect(.4,-.4,.08,.19);ctx.restore();
 }else{
  const color=flash>0?'#fff':boss?'#302038':'#24203a';const accent=boss?'#ff477e':'#ff597d';
  // monster limbs and torso
  polygon([[-.3,-.45],[-.44,-.24],[-.56,.12],[-.4,.18],[-.16,-.15]],color,accent,.025);polygon([[.27,-.48],[.44,-.29],[.51,.14],[.35,.17],[.13,-.17]],color,accent,.025);
  polygon([[-.32,-.58],[.28,-.62],[.38,-.1],[.22,.13],[-.25,.1],[-.4,-.18]],color,'#9a4569',.025);
  polygon([[-.24,-.1],[-.05,-.05],[-.12,.54],[-.35,.57]],'#171a2c');polygon([[.04,-.08],[.25,-.12],[.43,.47],[.2,.55]],'#1b1a2c');
  // jagged halo spikes
  polygon([[-.26,-.77],[-.48,-1.08],[-.16,-.97],[-.02,-1.22],[.1,-.96],[.41,-1.1],[.22,-.73]],'#332239',accent,.035);
  ctx.fillStyle=flash>0?'#fff':accent;ctx.shadowColor=accent;ctx.shadowBlur=13;ctx.fillRect(-.17,-.79,.32,.055);ctx.shadowBlur=0;
  polygon([[-.3,-.66],[0,-.75],[.29,-.64],[.18,-.43],[-.19,-.43]],'#4a243b');
  if(boss){ctx.strokeStyle='#ff5889';ctx.globalAlpha=.55+.2*Math.sin(worldTime*7);ctx.lineWidth=.035;ctx.beginPath();ctx.ellipse(0,-.36,.63,.94,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1}
 }
 ctx.restore();
}
function drawTelegraph(e){if(!e.telegraph)return;const p=proj(e.x,e.z);const radius=(e.kind==='boss'?2.8:2.05)*p.s;ctx.save();ctx.translate(p.x,p.y);ctx.globalAlpha=.2+.45*e.telegraph;ctx.fillStyle='#ff477b';ctx.beginPath();ctx.ellipse(0,0,radius,.35*p.s,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ff6891';ctx.lineWidth=2;ctx.setLineDash([6,5]);ctx.beginPath();ctx.ellipse(0,0,radius,.35*p.s,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.restore()}
function drawEffects(){for(const r of rings){const p=proj(r.x,r.z);ctx.save();ctx.globalAlpha=Math.max(0,r.life/r.maxLife);ctx.strokeStyle=r.color;ctx.shadowColor=r.color;ctx.shadowBlur=18;ctx.lineWidth=4*(r.life/r.maxLife)+1;ctx.beginPath();ctx.ellipse(p.x,p.y,r.r*p.s,r.r*p.s*.38,0,0,Math.PI*2);ctx.stroke();ctx.restore()}
 for(const p of particles){const q=proj(p.x,p.z,p.y);ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=8;ctx.beginPath();ctx.arc(q.x,q.y,Math.max(1,p.size*q.s*.05),0,Math.PI*2);ctx.fill()}ctx.shadowBlur=0;ctx.globalAlpha=1;
 for(const f of floaters){const q=proj(f.x,f.z,f.y);ctx.globalAlpha=Math.min(1,f.life*2);ctx.textAlign='center';ctx.font=`900 ${f.big?21:15}px Barlow Condensed, sans-serif`;ctx.lineWidth=3;ctx.strokeStyle='#121520';ctx.strokeText(f.text,q.x,q.y);ctx.fillStyle=f.big?'#ff8eb2':'#f4fff9';ctx.fillText(f.text,q.x,q.y)}ctx.globalAlpha=1;
}
function drawTarget(){if(!playing)return;const e=nearest();if(!e)return;const p=proj(e.x,e.z,1.9);const pulse=1+Math.sin(worldTime*5)*.12;ctx.save();ctx.translate(p.x,p.y);ctx.scale(pulse,pulse);ctx.strokeStyle=e.kind==='boss'?'#ff5b91':'#6cf8e3';ctx.globalAlpha=.78;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-8,-8);ctx.lineTo(-8,-3);ctx.moveTo(-8,-8);ctx.lineTo(-3,-8);ctx.moveTo(8,-8);ctx.lineTo(8,-3);ctx.moveTo(8,-8);ctx.lineTo(3,-8);ctx.moveTo(-8,8);ctx.lineTo(-8,3);ctx.moveTo(-8,8);ctx.lineTo(-3,8);ctx.moveTo(8,8);ctx.lineTo(8,3);ctx.moveTo(8,8);ctx.lineTo(3,8);ctx.stroke();ctx.restore()}
function render(now){const dt=Math.min(.034,(now-last)/1000||0);last=now;worldTime=now/1000;update(dt);camX+=(player.x-camX)*Math.min(1,dt*2);camZ+=(player.z-2.3-camZ)*Math.min(1,dt*1.6);ctx.save();if(shake>0)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);drawBackground(worldTime);
 // subtle cinematic light shafts
 const light=ctx.createRadialGradient(W*.5,H*.56,3,W*.5,H*.56,H*.65);light.addColorStop(0,'#83fff00b');light.addColorStop(1,'transparent');ctx.fillStyle=light;ctx.fillRect(0,0,W,H);
 for(const e of enemies)if(e.hp>0)drawTelegraph(e);drawEffects();const actors=[...enemies.filter(e=>e.hp>0).map(e=>({...e,actorKind:e.kind})),{x:player.x,z:player.z,actorKind:'player',face:player.face,anim:player.anim}].sort((a,b)=>a.z-b.z);for(const a of actors){if(a.actorKind==='player'){if(player.invuln>0&&Math.floor(worldTime*24)%2===0)ctx.globalAlpha=.45;actorShape(a.x,a.z,'player',a.face,player.hitFlash,player.anim);ctx.globalAlpha=1}else actorShape(a.x,a.z,a.actorKind,Math.atan2(player.x-a.x,player.z-a.z),a.flash,a.stun>0?.16:0)}drawTarget();ctx.restore();
 if(flash>0){ctx.fillStyle=`rgba(152,255,242,${flash*.75})`;ctx.fillRect(0,0,W,H)}requestAnimationFrame(render)}
requestAnimationFrame(render);
