(function(){
'use strict';
/* 밸런스 매치 (피의 게임 시즌 3 · 2일차 데스매치) — 1:1로 다듬음.
   라운드마다 종목 하나(틀린그림찾기 · 숫자 터치 · 미로 탈출 · 카드 메모리). 둘 다 "나는 이만큼 할 수 있다"를 몰래 선언 → 공개 → 한 번씩 고칠 기회 → 최종 공개.
   더 크게(미로는 더 짧게) 선언한 쪽이 먼저 도전: 성공 +2점. 실패하면 상대가 자기 선언으로 도전: 성공 +1점.
   4라운드 합계가 높은 쪽 승리. 남은 라운드로 뒤집을 수 없으면 콜드게임. 동점이면 카드 메모리 연장전. */
const CH=[
  {k:'spot', name:'틀린그림찾기', icon:'🔍', type:'count', unit:'개', min:1, max:10, def:6, time:30, desc:'두 그림에서 다른 칸 10곳 중 <b>30초 안에 몇 개</b>를 찾을지', what:'관찰력'},
  {k:'touch', name:'숫자 터치', icon:'🔢', type:'count', unit:'까지', min:5, max:30, def:15, time:15, desc:'1부터 순서대로 <b>15초 안에 어디까지</b> 누를지', what:'집중력'},
  {k:'maze', name:'미로 탈출', icon:'🌀', type:'time', unit:'초', min:5, max:60, def:20, desc:'미로를 <b>몇 초 안에</b> 빠져나올지 — 적게 부를수록 먼저', what:'공간지각'},
  {k:'memo', name:'카드 메모리', icon:'🃏', type:'count', unit:'장', min:3, max:16, def:7, desc:'한 장씩 지나가는 카드를 <b>몇 장까지</b> 순서대로 기억할지', what:'암기력'},
];
const ROUNDS=4, XMAX=2;
/* 컴퓨터 실력(난이도별 평균·흔들림)과, 컴퓨터가 사람에 대해 갖는 기본 추정 */
const CM={spot:[[5,1.3],[6.5,1.3],[8,1.1]], touch:[[12,2.5],[16,2.5],[19,2.2]], maze:[[30,6],[22,5],[16,4]], memo:[[5,1.2],[7,1.2],[9,1.1]]};
const HM={spot:[6.5,1.8], touch:[16,3.5], maze:[22,7], memo:[7,1.8]};
function Phi(z){ const t=1/(1+.2316419*Math.abs(z)), d=.3989423*Math.exp(-z*z/2); const p=d*t*(.3193815+t*(-.3565638+t*(1.781478+t*(-1.821256+t*1.330274)))); return z>0?1-p:p; }
const pOK=(c,n,m,sd)=> c.type==='time' ? Phi((n-m)/sd) : Phi((m+.5-n)/sd);
function mul(seed){ let a=seed>>>0; return ()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

function init(starter){
  const order=[0,1,2,3];
  return {phase:'intro', starter:starter|0, round:0, order, chi:null, seed:Math.random()*1e9|0, score:[0,0], bid:[null,null], bid1:[null,null], kept:[false,false],
    first:null, att:[], tries:0, started:false, hist:[], extra:0, log:[], turn:null, winner:null, ev:0, notice:'🎙️ 데스매치 「밸런스 매치」 — 내 실력에 베팅하세요'};
}
const ch=s=>CH[s.chi];
function startRound(s){
  s.round++; s.chi = s.round<=ROUNDS ? s.order[s.round-1] : 3; if(s.round>ROUNDS) s.extra++;
  s.bid=[null,null]; s.bid1=[null,null]; s.kept=[false,false]; s.first=null; s.att=[]; s.started=false; s.turn=null; s.phase='bid1';
  s.notice = `🎙️ ${s.round>ROUNDS?`연장전 ${s.extra}`:`${s.round}라운드`} — ${ch(s).icon} ${ch(s).name} (${ch(s).what}). 몰래 선언하세요`; s.log.push(s.notice);
}
function valid(c,n){ return Number.isInteger(n)&&n>=c.min&&n<=c.max; }
function better(c,a,b){ return c.type==='time' ? a<b : a>b; }
function decideFirst(s){ const c=ch(s), [a,b]=s.bid;
  if(a===b){ const lo = s.score[0]<s.score[1]?0 : s.score[1]<s.score[0]?1 : (s.round+s.starter)%2; return {f:lo, why:`선언이 같아서 ${s.score[0]===s.score[1]?'순서대로':'점수가 낮은 쪽이'} 먼저`}; }
  return {f: better(c,a,b)?0:1, why: c.type==='time'?'더 짧게 부른 쪽이 먼저':'더 크게 부른 쪽이 먼저'}; }
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요'; if(!a) return '알 수 없는 동작'; const c=ch(s);
  if(a.k==='bid'){ if(s.phase!=='bid1'&&s.phase!=='bid2') return '지금은 선언할 때가 아니에요'; if(s.bid[p]!=null&&(s.phase==='bid1'||s.kept[p])) return '이미 선언했어요';
    const n=a.n|0; if(!valid(c,n)) return `${c.min}~${c.max} 사이로 선언하세요`;
    if(s.phase==='bid1'){ s.bid[p]=n; s.bid1[p]=n; } else { s.bid[p]=n; s.kept[p]=true; }
    s.ev++; return null; }
  if(a.k==='start'){ if(s.phase!=='try'||s.turn!==p) return '내 도전 차례가 아니에요'; if(s.started) return '이미 시작했어요'; s.started=true; s.t0=Date.now(); s.notice=`⏱️ ${['A','B'][p]} 도전 시작! 목표 ${s.bid[p]}${c.unit}`; s.ev++; return null; }
  if(a.k==='result'){ if(s.phase!=='try'||s.turn!==p||!s.started) return '도전 중이 아니에요';
    const ok=!!a.ok; s.att.push({p,ok,n:s.bid[p],got:a.got!=null?a.got|0:null}); s.started=false; s.turn=null; s.phase='res';
    const firstTry=s.att.length===1;
    s.notice = ok ? `${firstTry?'🎉':'✨'} ${['A','B'][p]} 성공! ${firstTry?'+2점':'+1점'}` : `💥 ${['A','B'][p]} 실패…${firstTry?' 상대에게 기회가 넘어가요':''}`;
    if(ok) s.score[p]+=firstTry?2:1; s.log.push(s.notice + (a.got!=null?` (기록 ${a.got}${c.unit})`:'')); s.ev++; return null; }
  return '알 수 없는 동작';
}
function stepDelay(s){
  if(s.winner!=null) return null;
  if(s.phase==='intro') return 2000;
  if(s.phase==='bid1'||s.phase==='bid2') return (s.phase==='bid1'?s.bid.every(x=>x!=null):s.kept.every(Boolean)) ? 700 : null;
  if(s.phase==='rev1') return 3200; if(s.phase==='rev2') return 3000; if(s.phase==='res') return 2600; if(s.phase==='rend') return 2600;
  return null;
}
function step(s){
  const c=s.chi!=null?ch(s):null;
  if(s.phase==='intro'){ startRound(s); s.ev++; return; }
  if(s.phase==='bid1'){ s.phase='rev1'; s.notice=`📣 1차 선언 — A ${s.bid[0]}${c.unit} · B ${s.bid[1]}${c.unit}. 한 번 고칠 수 있어요`; s.log.push(s.notice); s.ev++; return; }
  if(s.phase==='rev1'){ s.phase='bid2'; s.notice='✏️ 최종 선언 — 그대로 두거나 바꾸세요 (상대에겐 공개 전까지 비밀)'; s.ev++; return; }
  if(s.phase==='bid2'){ s.phase='rev2'; const d=decideFirst(s); s.first=d.f;
    s.notice=`📣 최종 — A ${s.bid[0]}${c.unit} · B ${s.bid[1]}${c.unit} → ${['A','B'][d.f]} 먼저 도전 (${d.why})`; s.log.push(s.notice); s.ev++; return; }
  if(s.phase==='rev2'){ s.phase='try'; s.turn=s.first; s.started=false; s.notice=`🎯 ${['A','B'][s.first]}의 도전 — 목표 ${s.bid[s.first]}${c.unit}`; s.ev++; return; }
  if(s.phase==='res'){ const last=s.att[s.att.length-1];
    if(!last.ok&&s.att.length===1){ const o=1-s.first; s.phase='try'; s.turn=o; s.started=false; s.notice=`🎯 이번엔 ${['A','B'][o]}의 도전 — 자기 선언 ${s.bid[o]}${c.unit}로 (+1점)`; s.ev++; return; }
    s.phase='rend'; s.hist.push({r:s.round, chi:s.chi, bid:s.bid.slice(), first:s.first, att:s.att.slice()}); s.notice=`📊 점수 A ${s.score[0]} : ${s.score[1]} B`; s.ev++; return; }
  if(s.phase==='rend'){ const left=Math.max(0,ROUNDS-s.round)*2, d=s.score[0]-s.score[1];
    if(s.round<ROUNDS&&Math.abs(d)>left){ endGame(s, d>0?0:1, `콜드게임! 남은 ${ROUNDS-s.round}라운드로 뒤집을 수 없어요`); return; }
    if(s.round>=ROUNDS){ if(d!==0){ endGame(s, d>0?0:1, `최종 ${s.score[0]} : ${s.score[1]}`); return; } if(s.extra>=XMAX){ endGame(s,'both','연장전까지 동점 — 무승부'); return; } }
    startRound(s); s.ev++; return; }
}
function endGame(s,w,why){ s.phase='over'; s.turn=null; s.winner=w; s.notice=`🏁 ${why}`; s.log.push(s.notice); s.ev++; }
function mask(s,p){ const v=U.clone(s); const o=1-p;
  if(s.phase==='bid1'){ v.bid[o]=s.bid[o]!=null?'?':null; v.bid1[o]=null; }
  if(s.phase==='bid2'){ v.bid[o]=s.kept[o]?'?':s.bid1[o]; }
  return v; }
/* 컴퓨터 — 자기 실력 분포와 상대(사람) 추정으로 기대 점수가 큰 선언 */
function lvOf(lvl){ return lvl==null?1:Math.max(0,Math.min(2,lvl)); }
function evBid(c,n,b,me,v,lvl){ const [m,sd]=CM[c.k][lvOf(lvl)], [hm,hs]=HM[c.k]; const p=pOK(c,n,m,sd), q=pOK(c,b,hm,hs);
  const first = n===b ? (v.score[me]<v.score[1-me] || (v.score[me]===v.score[1-me]&&(v.round+v.starter)%2===me)) : better(c,n,b);
  return first ? 2*p - (1-p)*q : -2*q + (1-q)*p; }
function pickBid(v,me,lvl,known){ const c=CH[v.chi], [hm,hs]=HM[c.k]; let best=c.def, bv=-1e9;
  const bs = known!=null ? [known] : [-1,-.5,0,.5].map(k=>Math.round(c.type==='time'?hm-k*hs:hm+k*hs)).map(x=>Math.max(c.min,Math.min(c.max,x)));
  for(let n=c.min;n<=c.max;n++){ let e=0; for(const b of bs) e+=evBid(c,n,b,me,v,lvl); e/=bs.length; e+=(Math.random()-.5)*(lvl===0?.5:lvl===1?.12:.03); if(e>bv){ bv=e; best=n; } }
  return best; }
function aiSeat(v,me,lvl){
  if(v.phase==='bid1'&&v.bid[me]==null) return {k:'bid', n:pickBid(v,me,lvl,null)};
  if(v.phase==='bid2'&&!v.kept[me]){ const ob=v.bid1[1-me]; return {k:'bid', n:pickBid(v,me,lvl, typeof ob==='number'?ob:null)}; }
  if(v.phase==='try'&&v.turn===me){ if(!v.started) return {k:'start'}; const c=CH[v.chi], [m,sd]=CM[c.k][lvOf(lvl)]; return {k:'result', ok: Math.random()<pOK(c,v.bid[me],m,sd)}; }
  return null; }
function ai(v,lvl){ return aiSeat(v,1,lvl); }
function aiDelay(S){ if(S.phase==='try'&&S.turn===1){ if(!S.started) return 1500; const c=ch(S); const n=S.bid[1];
    return 1000*(c.k==='maze'? Math.min(n,40)*.6+Math.random()*4 : c.k==='memo'? n*1.1+3 : c.k==='touch'? 9+Math.random()*5 : 12+Math.random()*10); }
  return 2200+Math.random()*3500; }

/* ── 미니게임 (내 화면에서만 돌아감) ── */
const PAL=['🍎','🍋','🍇','🐟','🌸','⭐','🎈','🍄','🐝','🧩','🔔','🍀'], MEMO=['🍎','⭐','🐟','🌸','🔔','🍀'];
let G=null, tick=null, lastCtx=null, bidN=null, bidSig='';
function gen(c,seed,n){ const r=mul(seed); const pick=a=>a[r()*a.length|0];
  if(c.k==='spot'){ const a=Array.from({length:36},()=>pick(PAL)); const idx=[...Array(36).keys()].sort(()=>r()-.5).slice(0,10); const b=a.slice(); for(const i of idx){ let x; do x=pick(PAL); while(x===a[i]); b[i]=x; } return {a,b,diff:idx}; }
  if(c.k==='touch'){ const nums=[...Array(30)].map((_,k)=>k+1).sort(()=>r()-.5); return {nums}; }
  if(c.k==='maze'){ const W=9,H=9, wall=Array.from({length:W*H},()=>[1,1,1,1]), seen=Array(W*H).fill(false), st=[0]; seen[0]=true; const D=[[0,-1,0,2],[1,0,1,3],[0,1,2,0],[-1,0,3,1]];
    while(st.length){ const cur=st[st.length-1], x=cur%W, y=cur/W|0; const nb=D.map(d=>[x+d[0],y+d[1],d[2],d[3]]).filter(([nx,ny])=>nx>=0&&ny>=0&&nx<W&&ny<H&&!seen[ny*W+nx]);
      if(!nb.length){ st.pop(); continue; } const [nx,ny,w1,w2]=nb[r()*nb.length|0], ni=ny*W+nx; wall[cur][w1]=0; wall[ni][w2]=0; seen[ni]=true; st.push(ni); }
    return {W,H,wall}; }
  if(c.k==='memo'){ return {seq:Array.from({length:16},()=>pick(MEMO))}; }
}
function startMini(v,me){ const c=ch(v), n=v.bid[me]; const seed=v.seed+v.round*101+v.att.length*7;
  G={k:c.k, sig:sigOf(v), n, t0:Date.now(), data:gen(c,seed,n), found:[], wrong:0, next:1, pos:0, input:[], show:0, done:false};
  if(c.k==='memo'){ G.show=0; G.showT=Date.now(); }
  clearInterval(tick); tick=setInterval(onTick,150); }
const sigOf=v=>v.round+':'+v.att.length+':'+v.turn;
function finish(ok,got){ if(!G||G.done) return; G.done=true; clearInterval(tick); tick=null; const c=CH.find(x=>x.k===G.k); const ctx=lastCtx; G.res={ok,got};
  if(ctx) setTimeout(()=>ctx.act({k:'result',ok,got}),ok?500:700); if(ctx) ctx.rerender(); }
function elapsed(){ return (Date.now()-G.t0)/1000; }
function onTick(){ if(!G||G.done) return; const c=CH.find(x=>x.k===G.k), t=elapsed(); const el=document.getElementById('bmT');
  if(G.k==='memo'){ const per=.85; const idx=Math.floor(t/per); if(idx!==G.show&&G.show<G.n){ G.show=Math.min(idx,G.n); if(lastCtx) lastCtx.rerender(); } if(el) el.textContent=G.show<G.n?`${G.show+1}/${G.n}장째`:'입력하세요'; return; }
  const lim = G.k==='maze' ? G.n : c.time; if(el) el.textContent=Math.max(0,lim-t).toFixed(1)+'초';
  if(t>=lim){ finish(false, G.k==='spot'?G.found.length:G.k==='touch'?G.next-1:null); } }
function miniHtml(v){ const c=CH.find(x=>x.k===G.k), d=G.data;
  let h=`<div class="bm-mini"><div class="bm-top">${c.icon} <b>${c.name}</b> · 목표 <b>${G.n}${c.unit}</b> · <span id="bmT">${G.k==='memo'?'':(Math.max(0,(G.k==='maze'?G.n:c.time)-elapsed())).toFixed(1)+'초'}</span></div>`;
  if(G.res) h+=`<div class="bm-res ${G.res.ok?'ok':'no'}">${G.res.ok?'🎉 성공!':'💥 실패'}</div>`;
  if(G.k==='spot'){ const cell=(arr,click)=>arr.map((e,i)=>`<button class="bm-sc ${G.found.includes(i)?'f':''}" ${click&&!G.done?`data-sp="${i}"`:'disabled'}>${e}</button>`).join('');
    h+=`<div class="bm-spot"><div class="bm-sg">${cell(d.a,false)}</div><div class="bm-sg">${cell(d.b,true)}</div></div><div class="bm-sub">오른쪽 그림에서 다른 칸을 누르세요 · 찾음 <b>${G.found.length}/${G.n}</b> · 헛짚기 ${G.wrong}/3</div>`; }
  if(G.k==='touch'){ h+=`<div class="bm-touch">${d.nums.map(n=>`<button class="bm-tn ${n<G.next?'f':''}" ${G.done?'disabled':''} data-tn="${n}">${n}</button>`).join('')}</div><div class="bm-sub">다음: <b>${G.next}</b> · 목표 ${G.n}까지</div>`; }
  if(G.k==='maze'){ const {W,H,wall}=d; h+=`<div class="bm-maze" style="grid-template-columns:repeat(${W},1fr)">${wall.map((w,i)=>`<div class="bm-mc ${i===G.pos?'me':''} ${i===W*H-1?'goal':''}" style="border-top-width:${w[0]?2:0}px;border-right-width:${w[1]?2:0}px;border-bottom-width:${w[2]?2:0}px;border-left-width:${w[3]?2:0}px" data-mz="${i}">${i===G.pos?'🙂':i===W*H-1?'🚩':''}</div>`).join('')}</div>
    <div class="bm-pad"><button data-mv="0">⬆️</button><div><button data-mv="3">⬅️</button><button data-mv="2">⬇️</button><button data-mv="1">➡️</button></div></div><div class="bm-sub">방향키·버튼 또는 옆 칸을 눌러 🚩까지</div>`; }
  if(G.k==='memo'){ if(G.show<G.n&&!G.done) h+=`<div class="bm-flash">${d.seq[G.show]}</div><div class="bm-sub">외우세요… (${G.show+1}/${G.n})</div>`;
    else h+=`<div class="bm-in">${G.input.map(e=>`<span>${e}</span>`).join('')||'<small>순서대로 누르세요</small>'}</div><div class="bm-memo">${MEMO.map(e=>`<button data-mm="${e}" ${G.done?'disabled':''}>${e}</button>`).join('')}</div><div class="bm-sub">${G.input.length}/${G.n}</div>`; }
  return h+'</div>'; }
function onMini(e){ if(!G||G.done) return false; const d=G.data;
  const sp=e.target.closest('[data-sp]'); if(sp){ const i=+sp.dataset.sp; if(G.found.includes(i)) return true; if(d.diff.includes(i)){ G.found.push(i); if(G.found.length>=G.n) finish(true,G.found.length); } else { G.wrong++; if(G.wrong>=3) finish(false,G.found.length); } return true; }
  const tn=e.target.closest('[data-tn]'); if(tn){ if(+tn.dataset.tn===G.next){ G.next++; if(G.next>G.n) finish(true,G.n); } return true; }
  const mv=e.target.closest('[data-mv]'); if(mv){ move(+mv.dataset.mv); return true; }
  const mz=e.target.closest('[data-mz]'); if(mz){ const i=+mz.dataset.mz, W=d.W; const dir = i===G.pos-W?0 : i===G.pos+1&&i%W?1 : i===G.pos+W?2 : i===G.pos-1&&G.pos%W?3 : -1; if(dir>=0) move(dir); return true; }
  const mm=e.target.closest('[data-mm]'); if(mm){ const k=G.input.length; G.input.push(mm.dataset.mm); if(d.seq[k]!==mm.dataset.mm) finish(false,k); else if(G.input.length>=G.n) finish(true,G.n); return true; }
  return false; }
function move(dir){ if(!G||G.done||G.k!=='maze') return; const {W,H,wall}=G.data; if(wall[G.pos][dir]) return; G.pos += [-W,1,W,-1][dir]; if(G.pos===W*H-1) finish(true, Math.ceil(elapsed())); else if(lastCtx) lastCtx.rerender(); }
document.addEventListener('keydown',e=>{ if(!G||G.done||G.k!=='maze') return; const d={ArrowUp:0,ArrowRight:1,ArrowDown:2,ArrowLeft:3}[e.key]; if(d==null) return; e.preventDefault(); move(d); });

/* ── 화면 ── */
function render(el,v,ctx){
  lastCtx=ctx; const me=ctx.me, o=1-me, c=v.chi!=null?CH[v.chi]:null, nm=p=>p===me?'나':U.esc(ctx.name(p)), AB=t=>String(t).replace(/\bA\b/g,nm(0)).replace(/\bB\b/g,nm(1));
  if(G&&(v.phase!=='try'||G.sig!==sigOf(v))&&!(G.done&&v.phase==='res')){ if(!G.done||v.phase!=='res'){ clearInterval(tick); tick=null; G=null; } }
  let h=`<div class="hl-notice">${U.esc(AB(v.notice||''))}</div>`;
  h+=`<div class="info">${v.round>ROUNDS?`연장 ${v.extra}`:`${Math.max(1,v.round)}/${ROUNDS}라운드`} · 점수 나 <b>${v.score[me]}</b> : <b>${v.score[o]}</b> ${nm(o)}</div>`;
  h+=`<div class="bm-board">${[0,1,2,3].map(k=>{ const hh=v.hist.find(x=>x.r===k+1), cc=CH[v.order[k]];
      return `<div class="bm-rd ${v.round===k+1?'cur':''}"><div>${cc.icon} ${cc.name}</div><small>${hh?hh.att.map(a=>`${a.p===me?'나':nm(o)} ${a.ok?'⭕':'❌'}`).join(' → ')||'-':v.round===k+1?'진행 중':'·'}</small></div>`; }).join('')}</div>`;
  if(c){ h+=`<div class="bm-ch"><span class="bm-ic">${c.icon}</span><div><b>${c.name}</b> <small>${c.what}</small><div>${c.desc}</div></div></div>`;
    if(v.phase==='bid1'||v.phase==='bid2'){ const mine=v.phase==='bid1'?v.bid[me]:(v.kept[me]?v.bid[me]:null);
      const sg=v.round+v.phase; if(bidSig!==sg){ bidSig=sg; bidN = v.phase==='bid2'&&v.bid1[me]!=null ? v.bid1[me] : (bidN!=null&&v.phase==='bid2'?bidN:c.def); }
      const oppS = v.phase==='bid1' ? (v.bid[o]!=null?'✅ 선언 완료':'💭 고민 중…') : `1차 ${v.bid1[o]!=null?v.bid1[o]:'?'}${c.unit} · ${v.kept[o]?'✅ 최종 완료':'💭 고민 중…'}`;
      h+=`<div class="bm-bids"><div class="bm-b me"><small>나</small>${mine!=null?`<b>${mine}${c.unit}</b> ✅`:`<div class="bs-amt"><button class="ghost" data-a="m">−</button><b>${bidN}${c.unit}</b><button class="ghost" data-a="p">+</button></div><button data-a="bid">${v.phase==='bid1'?'몰래 선언':'최종 선언'}</button>${v.phase==='bid2'?`<small>1차: ${v.bid1[me]}${c.unit}</small>`:''}`}</div>
        <div class="bm-b"><small>${nm(o)}</small><div>${oppS}</div></div></div>
        <div class="bm-sub">${c.type==='time'?'적게 부를수록 먼저 도전':'크게 부를수록 먼저 도전'} · 먼저 도전해 성공 <b>+2</b> · 먼저 쪽이 실패하면 상대가 자기 선언으로 도전해 성공 <b>+1</b></div>`; }
    if(['rev1','rev2','try','res','rend'].includes(v.phase)) h+=`<div class="bm-bids"><div class="bm-b me ${v.first===me?'first':''}"><small>나</small><b>${v.bid[me]}${c.unit}</b>${v.first===me?' 🥇':''}</div><div class="bm-b ${v.first===o?'first':''}"><small>${nm(o)}</small><b>${v.bid[o]}${c.unit}</b>${v.first===o?' 🥇':''}</div></div>`;
    if(v.phase==='try'||(v.phase==='res'&&G&&G.done)){ const mine=v.turn===me||(G&&G.done);
      if(v.turn===me&&!v.started&&!G) h+=`<div class="vr-card"><b>🎯 내 도전 — 목표 ${v.bid[me]}${c.unit}</b><p>${c.desc}</p><div class="fh-act"><button data-a="start">▶ 도전 시작</button></div></div>`;
      else if(mine&&G) h+=miniHtml(v);
      else if(v.turn===o) h+=`<div class="vr-card bm-wait"><b>${nm(o)} 도전 중…</b> <span class="dots">⏳</span><p>목표 ${v.bid[o]}${c.unit}</p></div>`; }
  }
  if(v.phase==='over') h+=`<div class="sn-score"><div class="h"><b>나</b> ${v.score[me]}점</div><div><b>${nm(o)}</b> ${v.score[o]}점</div></div>`;
  h+=`<div class="bm-log">${v.log.slice(-8).reverse().map(x=>`<div>${U.esc(AB(x))}</div>`).join('')}</div>`;
  el.innerHTML=h;
  el.onclick=e=>{
    if(onMini(e)) return ctx.rerender();
    const a=e.target.closest('[data-a]'); if(!a||a.disabled) return; const k=a.dataset.a;
    if(k==='m'){ bidN=Math.max(c.min,bidN-1); return ctx.rerender(); } if(k==='p'){ bidN=Math.min(c.max,bidN+1); return ctx.rerender(); }
    if(k==='bid') return ctx.act({k:'bid',n:bidN});
    if(k==='start'){ startMini(v,me); return ctx.act({k:'start'}); }
  };
}
function status(v,ctx){ if(v.phase==='over') return ''; if(v.phase==='bid1'&&v.bid[ctx.me]==null) return '몰래 선언하세요'; if(v.phase==='bid2'&&!v.kept[ctx.me]) return '최종 선언하세요';
  if(v.phase==='try'&&v.turn===ctx.me) return '도전하세요!'; return '진행 중…'; }
const guide=`
<p><b>내 실력에 거는 1:1 데스매치</b> — 종목 4개, 매번 "나는 이만큼 할 수 있다"를 선언해요.</p>
<ol><li>라운드마다 종목 하나: 🔍 틀린그림찾기 · 🔢 숫자 터치 · 🌀 미로 탈출 · 🃏 카드 메모리.</li>
<li>둘이 <b>몰래 선언</b> → 공개 → <b>한 번 고칠 기회</b> → 최종 공개.</li>
<li>더 크게(미로는 더 짧게) 부른 쪽이 <b>먼저 도전</b> — 성공하면 <b>+2점</b>.</li>
<li>먼저 쪽이 실패하면 상대가 <b>자기 선언으로</b> 도전 — 성공하면 <b>+1점</b>.</li>
<li>4라운드 합계가 높으면 승리. 뒤집을 수 없으면 콜드게임, 동점이면 🃏 연장전.</li></ol>
<div class="tipbox">💡 <b>팁</b><br>· 앞서 있으면 터무니없이 크게 불러 선공을 막는 것도 방법(실패해도 상대는 +1뿐).<br>· 뒤처지면 상대가 크게 부르게 두고 안전한 숫자로 후공을 노려요.</div>`;
const guideSteps=[
  {t:'🎯 실력에 베팅', h:'종목마다 "나는 <b>이만큼</b> 할 수 있다"를 <b>몰래 선언</b>해요.', demo:s=>{ startRound(s); return s; }},
  {t:'✏️ 한 번 고치기', h:'1차 선언이 공개되면 <b>한 번</b> 고칠 수 있어요. 상대 숫자를 보고 올리거나 내리기!', demo:s=>{ startRound(s); s.bid=[6,8]; s.bid1=[6,8]; s.phase='bid2'; s.notice='✏️ 최종 선언 — 그대로 두거나 바꾸세요'; return s; }},
  {t:'🥇 먼저 도전 +2', h:'더 크게(미로는 더 짧게) 부른 쪽이 <b>먼저</b> 도전 — 성공 <b>+2점</b>. 실패하면 상대가 자기 숫자로 도전해 성공 <b>+1점</b>.', demo:s=>{ startRound(s); s.bid=[7,5]; s.phase='rev2'; s.first=0; s.notice='📣 최종 — 나 7개 · 상대 5개 → 나 먼저 도전'; return s; }},
  {t:'🔍 🔢 🌀 🃏 종목', h:'틀린그림찾기 · 숫자 터치 · 미로 탈출 · 카드 메모리 — <b>직접</b> 하는 미니게임이에요.', demo:s=>{ s.round=1; s.chi=1; s.phase='try'; s.turn=0; s.bid=[15,12]; s.notice='🎯 나의 도전 — 목표 15까지'; return s; }},
  {t:'🏆 승리', h:'4라운드 합계가 높으면 승리. 남은 라운드로 못 뒤집으면 <b>콜드게임</b>, 동점이면 🃏 연장전.', demo:s=>{ s.round=3; s.chi=s.order[2]; s.phase='rend'; s.score=[5,1]; s.hist=[{r:1,chi:0,bid:[6,7],first:1,att:[{p:1,ok:false},{p:0,ok:true}]},{r:2,chi:1,bid:[16,14],first:0,att:[{p:0,ok:true}]},{r:3,chi:2,bid:[18,25],first:0,att:[{p:0,ok:true}]}]; s.notice='📊 점수 나 5 : 1 상대'; return s; }},
];
window.GAMES.balancematch = {
  title:'밸런스 매치', ref:'피의 게임 「밸런스 매치」', emoji:'⚖️', tags:['실력 베팅','미니게임','심리전','두뇌서바이벌'],
  tagline:'틀린그림·숫자 터치·미로·기억력 — "나는 이만큼 한다"를 걸고 직접 증명하라.',
  guide, guideSteps, init, apply, mask, ai, aiDelay, render, status, step, stepDelay,
  reset(){ clearInterval(tick); tick=null; G=null; bidN=null; bidSig=''; },
  bar:(v,i)=>`<span class="tag">${v.score[i]}점</span>`,
  result:(v,ctx)=>`${v.score[ctx.me]} : ${v.score[1-ctx.me]}`,
  _aiSeat:aiSeat, _CH:CH, _pOK:pOK, _CM:CM,
};
})();
