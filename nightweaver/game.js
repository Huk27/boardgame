'use strict';
const $=id=>document.getElementById(id), canvas=$('scene'), ctx=canvas.getContext('2d'), S=window.InkSprites;
const chapters=[
 {name:'빨랫줄 아래',roman:'I',start:135,gaps:[[320,505]],lights:[{pivot:412,x:544}],egg:810,home:135},
 {name:'유리 온실',roman:'II',start:125,gaps:[[245,402],[533,696]],lights:[{pivot:323,x:205}],pot:473,lever:814,home:898},
 {name:'새벽 처마',roman:'III',start:120,gaps:[[255,362],[545,825]],lights:[{pivot:455,x:470},{pivot:674,x:783}],home:881}
];
let nextAmbience=0,hints=0;
let ch=0,level,state,mode='cover',target=null,selected=0,drag=null,held=new Set(),now=0,last=0,noticeEnd=0,audio=null,sound=true,bg=null,step=0,lastHint='',resume=0;
try{resume=Math.max(0,Math.min(2,Number(localStorage.getItem('nightweaver.chapter'))||0));}catch{}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function tone(f,d=.22,gain=.045,delay=0,type='sine'){if(!audio||!sound)return;let t=audio.currentTime+delay,o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+d+.02)}
function music(notes){notes.forEach((f,i)=>tone(f,.65,.045,i*.15))}
function unlock(){try{audio ||= new AudioContext();if(audio.state==='suspended')audio.resume().catch(()=>{})}catch{}}
function say(text,d=3){$('toast').textContent=text;noticeEnd=now+d}
function clearInputs(){held.clear();target=null;drag=null}
function setup(i,play=true){ch=i;level=chapters[ch];state={x:level.start,dir:1,carry:i>0,egg:level.egg,docked:false,shade:false,walk:false,lamps:level.lights.map(l=>({...l}))};bg=null;selected=0;hints=0;clearInputs();mode=play?'play':'cover';$('cover').hidden=play;$('hud').hidden=!play;$('paper').style.display='none';$('reset').hidden=!play;$('hint').hidden=!play;$('toast').textContent='';lastHint='';$('folio').textContent='CHAPTER　'+level.roman+' / III';$('chapname').textContent=level.name;if(play){try{localStorage.setItem('nightweaver.chapter',String(i))}catch{} music([220,330,440]);canvas.focus({preventScroll:true})}labels()}
function labels(){let s=state,n=ch===0?(s.carry?'알을 품고 왼쪽 둥지로 돌아가세요.':'빨랫줄의 전등을 끌어 오른쪽 알까지 그늘을 이으세요.'):ch===1?(s.shade?(s.carry?'알과 함께 오른쪽 처마로 가세요.':'화분에 맡긴 알을 다시 데려오세요.'):s.docked?'알빛이 만든 다리를 건너 차양 손잡이를 당기세요.':'전등을 옮겨 가운데 화분까지 알을 데려가세요.'):'긴 달빛은 그림자 둘을 맞붙여야 건널 수 있어요.';$('note').textContent=mode==='cover'?'어느 비 갠 밤, 지붕 위에서.':n;$('actLabel').textContent=ch===0?(s.carry?'둥지에 놓기':'알 품기'):ch===1?(s.shade&&!s.carry?'알 품기':s.docked?'차양 당기기':s.shade?'다음 처마로':'화분에 놓기'):'둥지에 놓기';$('chapters').textContent=chapters.map((l,i)=>(i===ch?'● ':'')+l.roman+'　'+l.name).join('　 ·　')}
function shadow(j,s=state){let l=s.lamps[j],center=l.pivot+(l.pivot-l.x)*.94,width=ch===2?158:s.carry?215:254;return [center-width/2,center+width/2]}
function safe(x){return level.gaps.every(([a,b],j)=>{if(x<=a||x>=b)return true;if(j===1&&ch===1)return state.docked||state.shade;return shadowSources(j).some(k=>{let [lo,hi]=shadow(k);return x>=lo&&x<=hi})})}
function shadowSources(j){return ch===2?[0,1]:[j]}
function shiftLamp(j,x){let l=state.lamps[j],old=l.x;l.x=clamp(x,ch===2?205:l.pivot-148,ch===2?875:l.pivot+148);if(!safe(state.x)){l.x=old;if(lastHint!=='under'){say('발밑 그늘이 끊겨요. 먼저 어두운 처마로 걸어가세요.');lastHint='under'}}}
function action(){if(mode!=='play'||$('manual').open)return;unlock();let s=state;const near=x=>Math.abs(s.x-x)<56;
 if(ch===0&&!s.carry&&near(s.egg)){s.carry=true;s.egg=null;music([392,523]);say('알이 빛나자 그림자가 짧아졌어요.');}
 else if(ch===1&&!s.shade&&s.carry&&near(level.pot)){s.carry=false;s.docked=true;s.egg=level.pot;music([392,523]);say('화분 너머로 그늘이 뻗었어요.');}
 else if(ch===1&&!s.shade&&s.docked&&near(level.lever)){s.shade=true;music([330,440,550]);say('차양이 펼쳐졌어요. 이제 알을 데려올 수 있어요.');}
 else if(ch===1&&s.shade&&!s.carry&&near(level.pot)){s.carry=true;s.docked=false;s.egg=null;music([392,523]);}
 else if(s.carry&&near(level.home)&&(ch!==1||s.shade)){finish();return}
 else{say(ch===0?(s.carry?'왼쪽 둥지 곁에서 알을 내려놓으세요.':'오른쪽 알 곁에서 품어 주세요.'):ch===1?$('note').textContent:'오른쪽 둥지 곁으로 가세요.');return}labels()}
function nearestGoal(){if(ch===0)return state.carry?level.home:state.egg;if(ch===1){if(!state.shade)return state.docked?level.lever:level.pot;return state.carry?level.home:level.pot}return level.home}
function hint(){
 if(mode!=='play')return;let messages;
 if(ch===0)messages=['전등은 움직이고 빨래집게는 제자리에 있어요. 둘의 위치를 비교해 보세요.','전등을 집게 바로 위로 옮기면 푸른 그늘이 틈 전체를 덮어요.'];
 if(ch===1)messages=state.shade?[state.carry?'알을 품고 오른쪽 끝 처마에서 동작 버튼을 누르세요.':'차양은 계속 펼쳐져 있어요. 화분으로 돌아가 알을 품으세요.']:state.docked?['알이 만든 그늘을 건너 오른쪽 둥근 손잡이를 당겨요.']:['첫 전등을 집게 위에 맞추세요. 화분 곁에서 동작 버튼으로 알을 내려놓아요.'];
 if(ch===2)messages=state.x<362?['먼저 왼쪽 좁은 틈 하나만 덮으세요. 가운데 처마에서 다시 준비할 수 있어요.','1번 전등을 오른쪽으로 끌면 그림자가 왼쪽 좁은 틈에 닿아요.']:['두 그림자가 조금 겹쳐야 긴 틈에 밝은 실금이 남지 않아요.','1번 전등은 왼쪽 끝에서 조금 오른쪽에, 2번 전등은 두 집게 사이에 놓아 보세요.'];
 say(messages[Math.min(hints++,messages.length-1)],7);tone(660,.32,.035)}
function finish(){clearInputs();state.walk=false;mode='end';$('toast').textContent='';let p=$('paper');p.style.display='none';const finished=state;setTimeout(()=>{if(state===finished&&mode==='end'){p.style.display='block';$('next').focus()}},ch===2?1900:680);p.querySelector('b').textContent=['첫 번째 밤을 건너','온실에 그늘이 내리고','새벽에 들린 세 번째 음'][ch];p.querySelector('p').textContent=['작은 껍데기 안에서 두 번의 노크가 들립니다.\n지붕 너머 온실에 마지막 불이 켜졌습니다.','차양 아래에서 알이 가만히 떨립니다.\n이제 둥지까지, 처마 두 개가 남았습니다.','톡, 톡. 그리고 작은 대답 하나.\n당신이 지은 밤에서 두 번째 새가 깨어났습니다.'][ch];$('next').textContent=ch===2?'처음부터 다시 걷기　↻':'다음 장 펼치기　→';music(ch===2?[392,523,659]:[392,523]);try{localStorage.setItem('nightweaver.chapter',String((ch+1)%3))}catch{}$('next').focus()}
function draw(t){
 if(!bg){bg=document.createElement('canvas');bg.width=1400;bg.height=784;window.paintCity(bg.getContext('2d'),1400,784,0,ch)}
 ctx.drawImage(bg,0,0,1000,560);const floor=397;
 function line(x,y,a,b,color,w=1){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(a,b);ctx.strokeStyle=color;ctx.lineWidth=w;ctx.stroke()}
 function poly(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill()}
 // Warm moonlit slate and the cyan-black walkable silhouette.
 ctx.fillStyle='#162727';ctx.fillRect(0,floor,1000,12);
 for(let x=0;x<1000;x+=31){line(x,floor+2,x+24,floor+2,'#889383',1);line(x+25,floor+3,x+29,floor+9,'#535e56')}
 level.gaps.forEach(([a,b],j)=>{
 let lamp=state.lamps[j],lit=ch===1&&j===1,span=lit?(state.shade||state.docked?[a,b]:[a,a]):shadow(j);
 let glow=ctx.createLinearGradient(0,floor-165,0,floor+16);glow.addColorStop(0,'#eac57a00');glow.addColorStop(1,'#ffdfa549');
 poly([[a+8,floor-165],[b+50,floor-165],[b,floor],[a,floor]],glow);
 ctx.fillStyle='#b9a778';ctx.fillRect(a,floor,b-a,9);for(let k=a;k<b;k+=9)line(k,floor+7,Math.min(k+7,b),floor+2,'#776e58');
 for(const band of lit?[span]:shadowSources(j).map(k=>shadow(k))){let lo=Math.max(a,band[0]),hi=Math.min(b,band[1]);if(hi>lo){ctx.fillStyle='#284549';ctx.fillRect(lo,floor-1,hi-lo,11);line(lo,floor,hi,floor,'#9abeb2',2);for(let x=lo;x<hi-7;x+=12)line(x,floor+7,x+6,floor+3,'#49676a')}}
 if(lamp){let y=147+j*29,xx=lamp.x,dy=Math.sin(t*1.5+j)*1.6;
 line(ch===2?205:lamp.pivot-151,y-49,ch===2?875:lamp.pivot+151,y-49,'#182a2d',3);line(ch===2?205:lamp.pivot-151,y-50,ch===2?875:lamp.pivot+151,y-50,'#ada68b',1);
 line(xx,y-48,xx,y-18+dy,'#c5b58b',2);let c=(span[0]+span[1])/2;
 poly([[xx-7,y+5],[xx+7,y+5],[span[1],floor],[span[0],floor]],'#ffe3a40d');
 let pegX=lamp.pivot;line(pegX-68,270,pegX+68,265,'#3b3830',2);S.pin(ctx,pegX,291,t);S.lamp(ctx,xx,y+dy,t);
 if(mode==='play'){ctx.fillStyle='#f5dfad';ctx.textAlign='center';ctx.font='bold 14px Georgia';ctx.fillText('‹　'+(j+1)+'　›',xx,y+35);if(selected===j){line(xx-15,y+40,xx+15,y+40,'#b5a16f')}}}
 });
 if(ch===1&&state.docked){const shimmer=Math.sin(t*2)*2;poly([[level.pot,368],[531,396],[698,396],[level.pot+4,371]],'#accca141');line(529,396,696,396+shimmer,'#b4cda4',2)} 
 if(ch===1){S.pot(ctx,level.pot,397,t);line(level.lever,327,level.lever,390,'#b7a579',2);ctx.strokeStyle='#ddc48c';ctx.beginPath();ctx.arc(level.lever,390,6,0,Math.PI*2);ctx.stroke();if(state.shade){poly([[502,244],[737,236],[709,270],[483,277]],'#576662');for(let x=511;x<720;x+=17)line(x,246,x-15,273,'#88978a',2)}}
 S.nest(ctx,level.home,398,t);if(state.egg!=null)S.egg(ctx,state.egg,ch===1?376:397,t);if(mode==='cover'){ctx.save();ctx.translate(681,397);ctx.scale(1.9,1.9);S.bird(ctx,0,0,t,1,false,false);ctx.restore()}else S.bird(ctx,state.x,397,t,state.dir,state.walk,state.carry&&!(mode==='end'&&ch===2));
 if(ch===2&&mode==='end') {ctx.save();ctx.translate(level.home+22,396);ctx.scale(.48,.48);S.bird(ctx,0,0,t,-1,false,false);ctx.restore()}
 if(mode==='play'){let x=ch===0?state.carry?level.home:state.egg:ch===1?!state.shade?state.docked?level.lever:level.pot:state.carry?level.home:level.pot:level.home;
 ctx.textAlign='center';ctx.font='600 14px sans-serif';let str=ch===0?(state.carry?'둥지':'빛나는 알'):ch===1?(x===level.lever?'차양 손잡이':x===level.pot?'온실 화분':'처마'):'마지막 둥지';let w=ctx.measureText(str).width+20;ctx.fillStyle='#162a2be8';ctx.fillRect(x-w/2,319,w,24);ctx.fillStyle='#ecdfbd';ctx.fillText(str,x,336);line(x,344,x,355,'#b0a081')}
 for(let i=0;i<15;i++){let x=(i*83+t*(2+i%3))%1000,y=185+((i*47)%176)+Math.sin(t*.6+i)*5;ctx.fillStyle='rgba(251,223,155,'+(.2+.14*Math.sin(i+t))+')';ctx.fillRect(x,y,1.6,1.6)}
}
let nearby=false;
function tick(ms){now=ms/1000;let dt=Math.min(.04,now-last||0);last=now;
 if(mode==='play'&&audio&&sound&&!document.hidden&&now>nextAmbience){nextAmbience=now+5+Math.random()*3;const root=[146.83,174.61,196][ch];tone(root,2.9,.012);tone(root*1.5,2.4,.009,.45);if(state.carry){tone(587,.18,.008,1.2);tone(784,.25,.009,1.47)}}
 if(mode==='play'&&!$('manual').open){let l=state.lamps[selected];if(held.has('ArrowUp'))shiftLamp(selected,l.x-155*dt);if(held.has('ArrowDown'))shiftLamp(selected,l.x+155*dt);
 let d=Number(held.has('ArrowRight'))-Number(held.has('ArrowLeft'));if(!d&&target!=null){if(Math.abs(target-state.x)<3)target=null;else d=Math.sign(target-state.x)}
 state.walk=false;if(d){state.dir=d;let xx=clamp(state.x+d*160*dt,42,959);if(safe(xx)){state.x=xx;state.walk=true;step+=dt;if(step>.29){tone(135+Math.sin(now)*17,.045,.018,0,'triangle');step=0}lastHint=''}else{target=null;if(lastHint!=='light'){say('밝은 바닥이에요. 그늘의 양 끝을 처마에 맞춰 보세요.');lastHint='light'}}}
 }
 let canAct=mode==='play'&&Math.abs(state.x-nearestGoal())<56;
 if(canAct!==nearby){nearby=canAct;$('action').classList.toggle('ready',canAct);if(canAct)tone(554,.24,.024)}
 if(noticeEnd&&now>noticeEnd)$('toast').textContent='';
 let rect=canvas.getBoundingClientRect(),w=Math.round(rect.width*Math.min(devicePixelRatio||1,2));if(canvas.width!==w){canvas.width=w;canvas.height=Math.round(w*.56)}ctx.setTransform(canvas.width/1000,0,0,canvas.height/560,0,0);draw(now);requestAnimationFrame(tick)}
function pt(e){let r=canvas.getBoundingClientRect();return [(e.clientX-r.left)*1000/r.width,(e.clientY-r.top)*560/r.height]}
canvas.onpointerdown=e=>{if(mode!=='play')return;unlock();let [x,y]=pt(e);canvas.focus();let j=state.lamps.findIndex((l,i)=>Math.abs(l.x-x)<43&&Math.abs(y-147-i*29)<55);if(j>=0){selected=j;target=null;drag={id:e.pointerId,dx:state.lamps[j].x-x};canvas.setPointerCapture(e.pointerId)}else if(y>290){target=x}};
canvas.onpointermove=e=>{if(drag&&drag.id===e.pointerId)shiftLamp(selected,pt(e)[0]+drag.dx)};
canvas.onpointerup=canvas.onpointercancel=()=>drag=null;
document.onkeydown=e=>{if(mode!=='play'||$('manual').open||e.ctrlKey||e.metaKey)return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)){e.preventDefault();target=null;held.add(e.key);if(e.key===' '&&!e.repeat)action()}if(e.key==='1'||(e.key==='2'&&state.lamps.length>1))selected=Number(e.key)-1};
document.onkeyup=e=>held.delete(e.key);window.addEventListener('blur',clearInputs);
document.querySelectorAll('[data-key]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();target=null;held.add(b.dataset.key);b.setPointerCapture(e.pointerId)};b.onpointerup=b.onpointercancel=()=>held.delete(b.dataset.key)});
$('hint').onclick=hint;$('action').onclick=action;$('reset').onclick=()=>setup(ch);$('next').onclick=()=>setup((ch+1)%3);$('start').onclick=()=>{unlock();setup(resume)};if(resume)$('start').textContent=chapters[resume].roman+'장 이어 걷기　→';
$('sound').onclick=()=>{unlock();sound=!sound;$('sound').textContent=sound?'♫ 소리 켜짐':'♫ 소리 꺼짐';$('sound').setAttribute('aria-pressed',sound);if(sound)tone(440)};
$('help').onclick=()=>{clearInputs();$('manual').showModal()};$('close').onclick=()=>$('manual').close();setup(0,false);requestAnimationFrame(tick);
