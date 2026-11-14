(function(){
'use strict';
/* 브릭빌드 (피의 게임 시즌 3 · 4일차 데스매치) — 1:1:1 (우리 둘 + NPC 1명).
   라운드마다 모형의 다섯 방향 평면도(위·앞·뒤·왼쪽·오른쪽)와 블록 개수가 공개됨. 3×3 바닥에 색 블록(3색, 높이 3까지)을 쌓아 똑같은 모형을 만듦.
   만들었으면 "정답!"(맞으면 +1, 틀리면 −1), 만들 수 없는 평면도라고 보면 "불가능!"(맞으면 +2, 틀리면 −2). 점수는 0 아래로 안 내려감.
   누가 선언하면 딜러가 확인하는 동안 모두 잠깐 멈춤. 틀린 사람은 그 라운드에서 빠짐. 누가 맞히거나 모두 빠지거나 시간이 끝나면 라운드 끝. 5라운드. */
/* 👥 N명: 사람 3명이면 NPC 없이 */
const N=3, ROUNDS=5, G3=3, HMAX=3, NC=3, LIMIT=150000, CHECK=1700; let HSEAT=[0,1]; const SEATORD=[0,1,2];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i), ALL=[0,1,2];
const nm=i=>`{s${i}}`;
const CC=['r','b','y'], CN=['빨강','파랑','노랑'];
/* 모형: stacks[y][x] = 아래→위 색 배열. y=0이 앞줄 */
function viewsOf(st){ const h=(x,y)=>st[y][x].length, at=(x,y,z)=>z<h(x,y)?st[y][x][z]:-1;
  const top=[], front=[], back=[], left=[], right=[]; let count=0;
  for(let y=0;y<G3;y++){ top.push([]); for(let x=0;x<G3;x++){ top[y].push(h(x,y)?st[y][x][h(x,y)-1]:-1); count+=h(x,y); } }
  for(let x=0;x<G3;x++){ front.push([]); back.push([]); left.push([]); right.push([]); for(let z=0;z<HMAX;z++){
    let f=-1; for(let y=0;y<G3;y++){ const c=at(x,y,z); if(c>=0){ f=c; break; } } front[x].push(f);
    let b=-1; for(let y=G3-1;y>=0;y--){ const c=at(G3-1-x,y,z); if(c>=0){ b=c; break; } } back[x].push(b);
    let l=-1; for(let xx=0;xx<G3;xx++){ const c=at(xx,G3-1-x,z); if(c>=0){ l=c; break; } } left[x].push(l);
    let r=-1; for(let xx=G3-1;xx>=0;xx--){ const c=at(xx,x,z); if(c>=0){ r=c; break; } } right[x].push(r); } }
  return {top,front,back,left,right,count}; }
const sil=v=>v.map(col=>col.filter(c=>c>=0).length);
/* 눈으로 따질 수 있는 모순 검사 — 통과하면 만들 수 있는 판 */
function consistent(V){
  const fH=sil(V.front), bH=sil(V.back), lH=sil(V.left), rH=sil(V.right);
  for(let x=0;x<G3;x++) if(fH[x]!==bH[G3-1-x]) return 'sil';
  for(let k=0;k<G3;k++) if(lH[k]!==rH[G3-1-k]) return 'sil';
  for(const v of [V.front,V.back,V.left,V.right]) for(const col of v){ let gap=false; for(const c of col){ if(c<0) gap=true; else if(gap) return 'float'; } }
  const sH=y=>lH[G3-1-y];
  for(let y=0;y<G3;y++) for(let x=0;x<G3;x++) if(V.top[y][x]>=0&&(fH[x]===0||sH(y)===0)) return 'top';
  for(let x=0;x<G3;x++) if(fH[x]>0&&!V.top.some(r=>r[x]>=0)) return 'top';
  for(let y=0;y<G3;y++) if(sH(y)>0&&!V.top[y].some(c=>c>=0)) return 'top';
  let mx=0, occ=0; for(let y=0;y<G3;y++) for(let x=0;x<G3;x++) if(V.top[y][x]>=0){ occ++; mx+=Math.min(fH[x],sH(y)); }
  if(V.count>mx||V.count<occ) return 'count';
  return null; }
function randModel(){ for(let g=0;g<200;g++){ const st=[...Array(G3)].map(()=>[...Array(G3)].map(()=>[]));
    const cells=U.shuffle([...Array(9).keys()]).slice(0,4+(Math.random()*4|0));
    for(const k of cells){ const hgt=1+(Math.random()*HMAX|0); for(let z=0;z<hgt;z++) st[k/3|0][k%3].push(Math.random()*NC|0); }
    const V=viewsOf(st); if(V.count>=6&&V.count<=14&&!consistent(V)) return {st,V}; } }
function perturb(V){ const W=U.clone(V); const kinds=U.shuffle(['count','back','side','top']);
  for(const k of kinds){ const T=U.clone(W);
    if(k==='count'){ const fH=sil(T.front), lH=sil(T.left); let mx=0; for(let y=0;y<G3;y++) for(let x=0;x<G3;x++) if(T.top[y][x]>=0) mx+=Math.min(fH[x],lH[G3-1-y]); T.count=mx+1+(Math.random()*2|0); }
    if(k==='back'){ const x=Math.random()*G3|0, col=T.back[x], hgt=col.filter(c=>c>=0).length; if(hgt<HMAX&&Math.random()<.6) col[hgt]=Math.random()*NC|0; else if(hgt>0) col[hgt-1]=-1; else col[0]=Math.random()*NC|0; }
    if(k==='side'){ const x=Math.random()*G3|0, col=T.right[x], hgt=col.filter(c=>c>=0).length; if(hgt<HMAX) col[hgt]=Math.random()*NC|0; else col[hgt-1]=-1; }
    if(k==='top'){ const fH=sil(T.front); const xs=[0,1,2].filter(x=>fH[x]===0); if(!xs.length) continue; T.top[Math.random()*G3|0][U.pick(xs)]=Math.random()*NC|0; }
    const why=consistent(T); if(why) return {V:T, why}; }
  return null; }
function makePuzzle(wantImp){ for(let g=0;g<50;g++){ const m=randModel(); if(!m) continue; if(!wantImp) return {V:m.V, imp:false, st:m.st}; const p=perturb(m.V); if(p) return {V:p.V, imp:true, why:p.why, st:m.st}; } return null; }

const STYLE={seojin:'logic', doyun:'warm', haram:'calm', yuna:'emo', minho:'sly', taekyung:'hot', jihu:'sly', soyul:'warm'};
const DEF_P={talk:.5,aggr:.5,trust:.5,bluff:.4,logic:.6,temper:.4};
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
const LINES={
  logic:{mid:['뒤에서 본 모양이 앞이랑 안 맞는데요…','개수부터 세 볼게요.'], build:['정답. 다섯 면 다 확인했어요.','완성입니다.'], imp:['불가능이에요. 평면도끼리 모순이에요.','이건 못 만들어요. 계산상 불가능.'], right:['예상대로.','검증 끝.'], wrong:['…한 칸 착각했네요.','변수를 놓쳤어요.'], react:['{t}, 빠르네요.','{t}의 판단, 일리 있네요.']},
  warm:{mid:['헷갈려요~ 😅','이 색이 맞나…?'], build:['다 했어요! 정답이요 😊','저 정답이요!'], imp:['이거… 불가능한 것 같아요 🥲','불가능이요!'], right:['와 맞았다 😊','휴~ 다행이다'], wrong:['아 틀렸어요 😢','미안해요 제가 착각했어요'], react:['{t} 대단해요!','와 {t} 빠르다 👏']},
  calm:{mid:['…','…흠.'], build:['…정답.','다 됐어요.'], imp:['…불가능.','…안 돼요, 이건.'], right:['…','…맞네요.'], wrong:['…아.','…틀렸네.'], react:['…{t}.','…빠르네.']},
  emo:{mid:['으아 머리 아파 😵','이거 왜 안 맞아?! 😣'], build:['됐다!! 정답!! 😆','완성!! 🥳'], imp:['이거 불가능이야!! 😱','불가능 불가능!'], right:['꺄 맞았어 🥳','대박 대박!'], wrong:['헐 틀렸어 😭','아 진짜 ㅠㅠ'], react:['{t} 미쳤다 😱','헐 {t} 벌써?!']},
  sly:{mid:['다들 아직이에요? 😏','쉬운데? 😏'], build:['정답~ 😏','이 정도야 뭐 😏'], imp:['불가능이죠, 딱 보면 😏','함정이네요 😏 불가능'], right:['역시 😏','당연하죠'], wrong:['…딜러가 깐깐하네','흠, 일부러 떠본 거예요 😏'], react:['{t}, 찍은 거죠? 😏','{t} 운 좋네 😏']},
  hot:{mid:['빨리빨리! 🔥','거의 다 했어!'], build:['정답!! 🔥','끝! 정답!'], imp:['불가능! 확실해요 🔥','이건 못 만들어요!'], right:['봤죠?! 🔥','당연하지!'], wrong:['아 왜!! 😤','말도 안 돼 😤'], react:['{t}?! 😤','{t} 빠른데? 🔥']},
};
function lineOf(s,i,kind,vars){ const st=STYLE[P(s,i).id]||'calm', L=(LINES[st]||LINES.calm)[kind]||LINES.calm[kind]; if(!L) return '';
  const used=(s.used[i]=s.used[i]||[]); const pool=L.filter(x=>!used.includes(x)); const raw=pool.length?U.pick(pool):U.pick(L); used.push(raw);
  return raw.replace(/\{t\}/g,vars&&vars.t!=null?nm(vars.t):''); }

function init(starter,o){ const k=Math.max(2,Math.min(3,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  const imp=U.shuffle([true,true,false,false,false]);
  const s={phase:'intro', who:{}, starter:starter|0, round:0, imps:imp, pz:null, score:[0,0,0], out:[false,false,false], decl:null, until:0, t0:0, plan:null, mid:false,
    hist:[], q:[], say:null, used:{}, log:[], turn:null, winner:null, ev:0, notice:'🎙️ 데스매치 「브릭빌드」 — 평면도대로 쌓거나, 불가능을 간파하세요'};
  s.hs=HSEAT.slice(); if(!isH(2)) s.who[2]=NPCS.cast(1)[0]; return s;
}
function startRound(s){ s.round++; const p=makePuzzle(s.imps[s.round-1]); s.pz=p; s.out=[false,false,false]; s.decl=null; s.mid=false; s.phase='play'; s.turn=null;
  s.t0=Date.now(); s.until=s.t0+LIMIT; s.plan=isH(2)?null:planFor(viewsPublic(s),2,1,P(s,2));
  s.notice=`🎙️ ${s.round}라운드 — 평면도 공개! 블록 ${p.V.count}개 · 제한 ${LIMIT/1000}초`; s.log.push(s.notice); }
const viewsPublic=s=>s.pz?s.pz.V:null;
/* 컴퓨터 계획: 공개된 평면도만 보고 모순 검사 → 걸릴 시간·실수는 실력과 성격대로 */
const LV=[{base:80,slip:.28},{base:62,slip:.14},{base:50,slip:.06}];
function planFor(V,i,lvl,pp){ const L=LV[lvl==null?1:lvl]; const why=consistent(V); pp=pp||DEF_P;
  let t=L.base*(.55+V.count/14)*(.5+Math.random()*1.0)*(1.15-pp.temper*.3);
  if(why==='sil'||why==='top') t*=.55; if(why==='count') t*=.9;
  const slip=Math.random()<L.slip*(1.2-pp.logic*.4);
  return {at:Date.now()+t*1000, kind: why ? (slip?'build':'imp') : 'build', slip, mid:Date.now()+t*500}; }
function judge(s,i,a){ const V=s.pz.V;
  if(a.kind==='imp') return s.pz.imp;
  if(a.model){ if(s.pz.imp) return false; const W=viewsOf(a.model); return JSON.stringify(W)===JSON.stringify(V); }
  return !s.pz.imp && !a.slip; }
function validModel(m){ return Array.isArray(m)&&m.length===G3&&m.every(r=>Array.isArray(r)&&r.length===G3&&r.every(c=>Array.isArray(c)&&c.length<=HMAX&&c.every(x=>Number.isInteger(x)&&x>=0&&x<NC))); }
function declare(s,i,a){ if(s.phase!=='play') return '지금은 선언할 수 없어요'; if(s.out[i]) return '이번 라운드는 이미 빠졌어요'; if(s.decl) return '딜러가 확인 중이에요';
  if(a.kind!=='imp'&&a.kind!=='build') return '정답 또는 불가능'; if(a.kind==='build'&&isH(i)&&!validModel(a.model)) return '모형이 올바르지 않아요';
  const ok=judge(s,i,a); s.decl={i,kind:a.kind,ok,at:Date.now()}; s.phase='check';
  s.notice=`${a.kind==='imp'?'🚫':'✋'} ${nm(i)}: "${a.kind==='imp'?'불가능!':'정답!'}" — 🙈 딜러가 확인하는 동안 모두 눈을 감아요`; s.log.push(s.notice);
  if(!isH(i)){ const t=lineOf(s,i,a.kind==='imp'?'imp':'build'); if(t) s.say={seat:i,text:t,n:(s.say?s.say.n:0)+1}; }
  return null; }
function resolve(s){ const d=s.decl, i=d.i, pts=d.kind==='imp'?2:1;
  if(d.ok){ s.score[i]+=pts; s.notice=`⭕ ${nm(i)} ${d.kind==='imp'?'불가능 간파':'정답'}! +${pts}점`; s.log.push(s.notice);
    if(!isH(i)){ const t=lineOf(s,i,'right'); if(t) s.say={seat:i,text:t,n:(s.say?s.say.n:0)+1}; }
    else { const o=ALL.find(j=>!isH(j)); if(o!=null&&Math.random()<.7){ const t=lineOf(s,o,'react',{t:i}); if(t) s.say={seat:o,text:t,n:(s.say?s.say.n:0)+1}; } }
    endRound(s,i); return; }
  s.score[i]=Math.max(0,s.score[i]-pts); s.out[i]=true; s.notice=`❌ ${nm(i)} ${d.kind==='imp'?'불가능 선언':'정답 선언'} 실패… −${pts}점, 이번 라운드 탈락`; s.log.push(s.notice);
  if(!isH(i)){ const t=lineOf(s,i,'wrong'); if(t) s.say={seat:i,text:t,n:(s.say?s.say.n:0)+1}; }
  s.decl=null; s.phase='play'; const pause=Date.now()-d.at; s.until+=pause; if(s.plan&&!s.out[2]) s.plan.at+=pause;
  if(s.out.every(Boolean)) endRound(s,null); }
function endRound(s,w){ s.phase='rend'; s.decl=null; s.hist.push({r:s.round, imp:s.pz.imp, why:s.pz.why||null, w, score:s.score.slice()}); s.rendAt=Date.now(); }
function apply(s,p,a){ syncH(s); if(s.winner!=null) return '게임이 끝났어요'; if(!a||a.k!=='decl') return '알 수 없는 동작'; const e=declare(s,HSEAT[p],a); if(!e) s.ev++; return e; }
function stepDelay(s){ syncH(s); if(s.winner!=null) return null; const now=Date.now();
  if(s.phase==='intro') return 2400;
  if(s.phase==='check') return Math.max(50, s.decl.at+CHECK-now);
  if(s.phase==='play'){ let t=s.until-now; if(!s.out[2]&&s.plan){ t=Math.min(t, (s.mid?Infinity:s.plan.mid)-now, s.plan.at-now); } return Math.max(50,t); }
  if(s.phase==='rend') return 6500; if(s.phase==='final') return 2600;
  return null; }
function step(s){ syncH(s); const now=Date.now();
  if(s.phase==='intro'){ startRound(s); s.ev++; return; }
  if(s.phase==='check'){ if(now>=s.decl.at+CHECK){ resolve(s); s.ev++; } return; }
  if(s.phase==='play'){
    if(now>=s.until){ s.notice='⏰ 시간 종료 — 아무도 못 맞혔어요'; s.log.push(s.notice); endRound(s,null); s.ev++; return; }
    if(!s.out[2]&&s.plan){ if(!s.mid&&now>=s.plan.mid){ s.mid=true; if(Math.random()<P(s,2).talk){ const t=lineOf(s,2,'mid'); if(t) s.say={seat:2,text:t,n:(s.say?s.say.n:0)+1}; } s.ev++; return; }
      if(now>=s.plan.at){ declare(s,2,{kind:s.plan.kind,slip:s.plan.slip}); s.ev++; return; } }
    return; }
  if(s.phase==='rend'){ if(s.round<ROUNDS){ startRound(s); s.ev++; return; } s.phase='final'; const r=ALL.slice().sort((a,b)=>s.score[a]-s.score[b]);
    s.notice=`🏁 최종 — ${ALL.slice().sort((a,b)=>s.score[b]-s.score[a]).map(i=>`${nm(i)} ${s.score[i]}점`).join(' · ')}${s.score[r[0]]<s.score[r[1]]?` → 💀 ${nm(r[0])} 탈락`:''}`; s.log.push(s.notice); s.ev++; return; }
  if(s.phase==='final'){ s.phase='over'; const a=s.score[0], b=s.score[1]; s.winner=a>b?0:b>a?1:'both'; { const mx=Math.max(...HSEAT.map(h=>s.score[h])); s.winners=HSEAT.map((h,p)=>s.score[h]===mx?p:-1).filter(x=>x>=0); } s.ev++; return; }
}
function mask(s,p){ syncH(s); const v=U.clone(s); if(v.pz){ const open=v.phase==='rend'||v.phase==='final'||v.phase==='over'; v.pz={V:s.pz.V, imp:open?s.pz.imp:null, why:open?s.pz.why:null, st:open?s.pz.st:null}; }
  v.plan=null; v.imps=null; v.used={}; v.q=[]; return v; }
/* 혼자 모드 상대(자리 1) — 라운드마다 계획을 따로 세움 */
let MEM={};
function ai(v,lvl){ syncH(v); const i=HSEAT[1]; if(v.phase!=='play'||v.out[i]||!v.pz) return null; const key=v.round+':'+v.t0;
  if(MEM.key!==key){ MEM={key, plan:planFor(v.pz.V,i,lvl,DEF_P)}; } if(Date.now()<MEM.plan.at) return null;
  return {k:'decl', kind:MEM.plan.kind, slip:MEM.plan.slip}; }
function aiDelay(S){ if(S.phase==='play'&&MEM.plan) return Math.max(300,Math.min(2500,MEM.plan.at-Date.now())); return 1500; }

/* 화면 */
let WHO={}, mdl=null, mkey='', color=0, eraser=false, tick=null;
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}/g,(_,d)=>`${seatEmoji(+d)} ${seatName(+d,ctx)}`); }
const empty=()=>[...Array(G3)].map(()=>[...Array(G3)].map(()=>[]));
function viewSvg(cols,title,cls){ /* cols[x][z] 색, 아래가 z=0 */ let h=`<div class="bb-v ${cls||''}"><small>${title}</small><div class="bb-vg">`;
  for(let z=HMAX-1;z>=0;z--) for(let x=0;x<G3;x++){ const c=cols[x][z]; h+=`<i class="${c>=0?CC[c]:''}"></i>`; } return h+'</div></div>'; }
function topSvg(top,title,cls){ let h=`<div class="bb-v ${cls||''}"><small>${title}</small><div class="bb-vg">`; for(let y=G3-1;y>=0;y--) for(let x=0;x<G3;x++){ const c=top[y][x]; h+=`<i class="${c>=0?CC[c]:''}"></i>`; } return h+'</div><small class="bb-front">▲ 앞</small></div>'; }
function viewsHtml(V,cls){ return `<div class="bb-views">${topSvg(V.top,'위',cls)}${viewSvg(V.front,'앞',cls)}${viewSvg(V.back,'뒤',cls)}${viewSvg(V.left,'왼쪽',cls)}${viewSvg(V.right,'오른쪽',cls)}<div class="bb-v bb-cnt ${cls||''}"><small>블록</small><b>${V.count}</b></div></div>`; }
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{}; const me=HSEAT[ctx.me];
  const key=v.round+':'+v.t0; if(mkey!==key){ mkey=key; mdl=empty(); eraser=false; }
  clearInterval(tick); tick=null; if(v.phase==='play'){ tick=setInterval(()=>{ const e=document.getElementById('bbT'); if(e) e.textContent=Math.max(0,Math.ceil((v.until-Date.now())/1000))+'초'; else { clearInterval(tick); tick=null; } },500); }
  let h=`<div class="hl-notice">${fill(U.esc(v.notice||''),ctx)}</div>`;
  h+=`<div class="vr-speech">${v.say?`<span class="w">${seatEmoji(v.say.seat)} ${seatName(v.say.seat,ctx)}</span> ${fill(U.esc(v.say.text),ctx)}`:'<i>　</i>'}</div>`;
  h+=`<div class="info">${Math.max(1,v.round)}/${ROUNDS}라운드 · ${v.phase==='play'?`⏱️ <b id="bbT">${Math.max(0,Math.ceil((v.until-Date.now())/1000))}초</b>`:v.phase==='check'?'🙈 딜러 확인 중…':''}</div>`;
  h+=`<div class="pw-seats">${ALL.map(i=>`<div class="pw-seat ${i===me?'me':''} ${v.decl&&v.decl.i===i?'act':''}"><div class="ev-nm">${seatEmoji(i)} ${seatName(i,ctx)}</div>${isH(i)?'':`<small class="ev-arch">${NPCI(i)[2]}</small>`}<div class="pw-sc">${v.score[i]}점</div><small>${v.out[i]?'❌ 이번 라운드 탈락':v.phase==='play'?'🧱 쌓는 중':''}</small></div>`).join('')}</div>`;
  if(v.pz){ const V=v.pz.V; h+=`<div class="bb-h">🎯 맞혀야 할 평면도</div>${viewsHtml(V,'t')}`;
    if(v.pz.imp!=null) h+=`<div class="bb-ans ${v.pz.imp?'imp':''}">${v.pz.imp?`🚫 불가능한 평면도였어요 — ${({count:'블록 개수가 들어갈 수 있는 최대보다 많아요',sil:'앞/뒤(또는 왼/오른쪽) 높이가 서로 안 맞아요',top:'위에서 본 칸과 옆에서 본 모양이 안 맞아요',float:'공중에 뜬 블록이 보여요'})[v.pz.why]||''}`:'✅ 만들 수 있는 평면도였어요 — 예시 모형의 평면도는 위와 같아요'}</div>`;
    const my=viewsOf(mdl), canAct=v.phase==='play'&&!v.out[me];
    h+=`<div class="bb-ed"><div class="bb-h">🧱 내 모형 <small>칸을 눌러 쌓기 · 지우개로 맨 위 빼기</small></div>
      <div class="bb-pal">${CC.map((c,k)=>`<button class="bb-pc ${c} ${!eraser&&color===k?'sel':''}" data-col="${k}">${CN[k]}</button>`).join('')}<button class="bb-pc er ${eraser?'sel':''}" data-er="1">🧽 지우개</button><button class="ghost" data-clr="1">전부 비우기</button></div>
      <div class="bb-grid">${[2,1,0].map(y=>[0,1,2].map(x=>{ const stk=mdl[y][x]; return `<button class="bb-cell" data-x="${x}" data-y="${y}" ${canAct?'':'disabled'}>${stk.map(c=>`<i class="${CC[c]}"></i>`).reverse().join('')||'<span>·</span>'}</button>`; }).join('')).join('')}</div><small class="bb-front">▲ 앞</small>
      <div class="bb-h">내 모형의 평면도</div>${viewsHtml(my,'m')}
      <div class="fh-act"><button data-d="build" ${canAct?'':'disabled'}>✋ 정답! (+1 / −1)</button><button data-d="imp" ${canAct?'':'disabled'} style="background:#b8412f">🚫 불가능! (+2 / −2)</button></div></div>`; }
  if(v.phase==='over') h+=`<div class="sn-score">${ALL.slice().sort((a,b)=>v.score[b]-v.score[a]).map(i=>`<div class="${isH(i)?'h':''}"><b>${seatEmoji(i)} ${seatName(i,ctx)}</b> ${v.score[i]}점</div>`).join('')}</div>`;
  h+=`<div class="bm-log">${v.log.slice(-8).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=h;
  el.onclick=e=>{
    const c=e.target.closest('[data-col]'); if(c){ color=+c.dataset.col; eraser=false; return ctx.rerender(); }
    if(e.target.closest('[data-er]')){ eraser=!eraser; return ctx.rerender(); } if(e.target.closest('[data-clr]')){ mdl=empty(); return ctx.rerender(); }
    const cell=e.target.closest('[data-x]'); if(cell&&!cell.disabled){ const st=mdl[+cell.dataset.y][+cell.dataset.x]; if(eraser) st.pop(); else if(st.length<HMAX) st.push(color); return ctx.rerender(); }
    const d=e.target.closest('[data-d]'); if(d&&!d.disabled) return ctx.act({k:'decl',kind:d.dataset.d, model: d.dataset.d==='build'?U.clone(mdl):null});
  };
}
function status(v,ctx){ syncH(v); if(v.phase==='over') return ''; if(v.phase==='play') return v.out[HSEAT[ctx.me]]?'이번 라운드는 구경':'쌓아서 맞히거나 불가능을 외치세요'; return '진행 중…'; }
const guide=`
<p><b>평면도 보고 블록 쌓기</b> — 1:1:1 (우리 둘 + 컴퓨터 1명), 5라운드.</p>
<ol><li>모형을 <b>위·앞·뒤·왼쪽·오른쪽</b>에서 본 그림과 <b>블록 개수</b>가 공개돼요. (3×3 바닥, 높이 3까지, 3색)</li>
<li>내 판에 블록을 쌓아 똑같이 만들고 <b>✋ 정답!</b> — 다섯 면과 개수가 모두 맞으면 <b>+1</b>, 틀리면 <b>−1</b>.</li>
<li>평면도끼리 모순이라 만들 수 없다고 보면 <b>🚫 불가능!</b> — 맞으면 <b>+2</b>, 틀리면 <b>−2</b>.</li>
<li>누가 외치면 딜러가 확인하는 동안 모두 멈춰요. 틀린 사람은 그 라운드에서 빠지고, 누가 맞히면 라운드 끝. 점수는 0 아래로 안 내려가요.</li>
<li>5라운드 뒤 점수가 가장 낮은 사람이 탈락. 우리 둘 중 점수가 높은 쪽이 승리.</li></ol>
<div class="tipbox">💡 <b>불가능 찾는 법</b><br>· 앞에서 본 높이와 뒤에서 본 높이는 좌우만 뒤집혀 같아야 해요(왼쪽/오른쪽도).<br>· 위에서 블록이 있는 칸의 열·줄은 옆 그림에도 보여야 해요.<br>· 칸마다 최대 높이 = min(앞 그림 그 열 높이, 옆 그림 그 줄 높이). 그 합보다 블록이 많으면 불가능!</div>`;
function demo(s,imp){ s.round=1; s.pz=makePuzzle(imp); s.phase='play'; s.t0=1; s.until=Date.now()+LIMIT; s.notice='🎙️ 1라운드 — 평면도 공개!'; return s; }
const guideSteps=[
  {t:'🎯 평면도 다섯 장', h:'모형을 <b>위·앞·뒤·왼쪽·오른쪽</b>에서 본 그림과 <b>블록 개수</b>. 바닥은 3×3, 높이 3까지, 3색.', demo:s=>demo(s,false)},
  {t:'🧱 쌓아서 정답', h:'색을 고르고 칸을 누르면 그 칸에 한 층 쌓여요. 내 모형의 평면도가 바로 옆에 그려지니 <b>똑같아지면</b> ✋ 정답! (+1 / 틀리면 −1)', demo:s=>demo(s,false)},
  {t:'🚫 불가능 간파', h:'평면도끼리 <b>모순</b>이면 🚫 불가능! (+2 / 틀리면 −2). 앞↔뒤 높이, 위↔옆 칸, <b>최대 블록 수</b>를 따져 보세요.', demo:s=>{ demo(s,true); s.phase='rend'; s.pz=s.pz; return s; }},
  {t:'🙈 딜러 확인', h:'누가 외치면 확인하는 동안 모두 멈춰요. 틀린 사람은 그 라운드 <b>탈락</b>. 5라운드 뒤 꼴찌는 탈락!', demo:s=>{ demo(s,false); s.phase='check'; s.decl={i:2,kind:'build',ok:true,at:Date.now()}; s.notice='✋ "정답!" — 🙈 딜러가 확인하는 동안 모두 눈을 감아요'; return s; }},
];
window.GAMES.brickbuild = { _sync:x=>syncH(x), maxH:3,
  title:'브릭빌드', ref:'피의 게임 「브릭빌드」', emoji:'🧱', tags:['공간지각','퍼즐','실시간','NPC','두뇌서바이벌'],
  tagline:'다섯 방향 평면도대로 블록을 쌓아라 — 혹은 만들 수 없는 함정을 먼저 간파하라.',
  guide, guideSteps, init, apply, mask, ai, aiDelay, render, status, step, stepDelay, noPersona:true,
  reset(){ MEM={}; mdl=null; mkey=''; color=0; eraser=false; clearInterval(tick); tick=null; },
  bar:(v,i)=>`<span class="tag">${v.score[HSEAT[i]]}점</span>`,
  result:(v,ctx)=>`${v.score[HSEAT[ctx.me]]}점`,
  _viewsOf:viewsOf, _consistent:consistent, _makePuzzle:makePuzzle, _planFor:planFor,
};
})();
