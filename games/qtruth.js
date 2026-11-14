(function(){
'use strict';
/* 질문과 진실 (1:1, 데블스 플랜 S2 결승 3R).
   각자 트럼프 카드(A~K, 숫자마다 4장)에서 8장을 골라 1~8번 칸에 몰래 배치. 토큰 10개씩.
   매 라운드 둘이 몰래 토큰을 걸고, 많이 건 쪽(건 토큰은 냄)이 ❓ 질문 하나 또는 ⚖️ 진실(상대 8장을 왼쪽부터 선언) 중 하나.
   같은 수를 걸면 건 토큰은 둘 다 딜러가 가져가고 다시 건다(둘 다 0이면 우선권을 가진 쪽이 행동, 우선권은 넘어감).
   질문: 세 칸의 합 / 같은 숫자 위치 / 이웃한 연속 숫자 위치 / 가장 큰 숫자 위치 / 가장 작은 숫자 위치. 답은 둘 다 봄.
   진실이 맞으면 승리, 틀리면 그 자리에서 패배. 40라운드까지 아무도 못 맞히면 무승부.
   (원작 규칙이 문서마다 조금씩 달라, 원작 질문 유형을 바탕으로 정함 — 문양은 뺌) */
const SLOTS=8, TOK=10, MAXR=40, MAXV=13;
const L=v=>['','A','2','3','4','5','6','7','8','9','10','J','Q','K'][v];
const QN={sum:'세 칸의 합', same:'같은 숫자 위치', cons:'이웃한 연속 숫자', max:'가장 큰 숫자 위치', min:'가장 작은 숫자 위치'};
const pos=a=>a.map(i=>i+1).join('·')+'번';
function answer(cards,q){
  if(q.t==='sum') return {v:q.idx.reduce((a,i)=>a+cards[i],0)};
  if(q.t==='same'){ const g={}; cards.forEach((c,i)=>(g[c]=g[c]||[]).push(i)); return {groups:Object.values(g).filter(x=>x.length>1)}; }
  if(q.t==='cons'){ const p=[]; for(let i=0;i<SLOTS-1;i++) if(Math.abs(cards[i]-cards[i+1])===1) p.push(i); return {pairs:p}; }
  if(q.t==='max'||q.t==='min'){ const m=q.t==='max'?Math.max(...cards):Math.min(...cards); return {pos:cards.map((c,i)=>c===m?i:-1).filter(i=>i>=0)}; }
}
function ansText(q,a){
  if(q.t==='sum') return `${pos(q.idx)} 합 = <b>${a.v}</b>`;
  if(q.t==='same') return a.groups.length?`같은 숫자: ${a.groups.map(g=>`<b>${pos(g)}</b>`).join(' / ')}`:'같은 숫자: <b>없음</b>';
  if(q.t==='cons') return a.pairs.length?`이웃 연속: ${a.pairs.map(i=>`<b>${i+1}–${i+2}번</b>`).join(', ')}`:'이웃 연속: <b>없음</b>';
  return `${q.t==='max'?'가장 큰':'가장 작은'} 숫자: <b>${pos(a.pos)}</b>`;
}
function validCards(c){ if(!Array.isArray(c)||c.length!==SLOTS) return false; const n={}; for(const x of c){ if(!(Number.isInteger(x)&&x>=1&&x<=MAXV)) return false; n[x]=(n[x]||0)+1; if(n[x]>4) return false; } return true; }

function init(starter){
  return {cards:[null,null], tok:[TOK,TOK], phase:'setup', ready:[false,false], bid:[null,null], qa:[[],[]],   // qa[p] = p가 상대에 대해 물은 것
    round:0, prio:starter, starter, turn:null, winner:null, log:[], ev:0, act:null, last:null, decl:null,
    notice:'🎙️ 결승 「질문과 진실」 — 카드 8장을 몰래 배치하세요'};
}
function startBid(s){ s.phase='bid'; s.bid=[null,null]; s.turn=null; s.round++; s.notice=`🎙️ ${s.round}라운드 — 토큰을 거세요`; s.ev++;
  if(s.round>MAXR){ s.phase='over'; s.winner='draw'; s.notice='🎙️ 끝내 아무도 진실에 닿지 못했습니다. 무승부'; } }
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(!a) return '알 수 없는 동작';
  if(s.phase==='setup'){
    if(a.k!=='setup') return '카드를 배치하세요'; if(s.ready[p]) return '이미 배치했어요';
    const c=(a.cards||[]).map(x=>x|0); if(!validCards(c)) return '카드 8장을 고르세요 (같은 숫자는 4장까지)';
    s.cards[p]=c; s.ready[p]=true; s.ev++; s.log.push(`${p?'B':'A'} 카드 배치 완료`);
    if(s.ready[0]&&s.ready[1]){ s.phase='setdone'; s.notice='🎙️ 두 분 모두 배치를 마쳤습니다'; }
    return null;
  }
  if(s.phase==='bid'){
    if(a.k!=='bid') return '토큰을 거세요'; if(s.bid[p]!=null) return '이미 걸었어요';
    const x=a.x|0; if(!(x>=0&&x<=s.tok[p])) return `0~${s.tok[p]}개를 걸 수 있어요`;
    s.bid[p]=x; s.ev++;
    if(s.bid[0]!=null&&s.bid[1]!=null){ s.phase='reveal'; s.turn=null; }
    return null;
  }
  if(s.phase==='act'){
    if(s.turn!==p) return '상대 차례예요';
    const o=1-p;
    if(a.k==='ask'){ const q=normQ(a.q); if(!q) return '질문을 고르세요';
      if(q.t!=='sum'&&s.qa[p].some(x=>x.q.t===q.t)) return '이미 한 질문이에요 (답이 같아요)';
      if(q.t==='sum'&&s.qa[p].some(x=>x.q.t==='sum'&&x.q.idx.join()===q.idx.join())) return '같은 세 칸은 이미 물었어요';
      const an=answer(s.cards[o],q); s.qa[p].push({q,a:an,r:s.round}); s.last={p,q,a:an};
      s.log.push(`${s.round}R ${p?'B':'A'} ❓ ${QN[q.t]}${q.t==='sum'?` (${pos(q.idx)})`:''}`);
      s.phase='ans'; s.turn=null; s.notice=`🎙️ 질문: ${QN[q.t]}${q.t==='sum'?` — ${pos(q.idx)}`:''}`; s.ev++; return null; }
    if(a.k==='truth'){ const g=(a.cards||[]).map(x=>x|0); if(g.length!==SLOTS||g.some(x=>!(x>=1&&x<=MAXV))) return '8칸을 모두 채워 선언하세요';
      const ok=g.every((x,i)=>x===s.cards[o][i]); s.decl={p,g,ok}; s.phase='truth'; s.turn=null; s.truthStep=0;
      s.notice=`🎙️ 진실 선언! ${g.map(L).join(' ')}`; s.log.push(`${s.round}R ${p?'B':'A'} ⚖️ 진실 선언: ${g.map(L).join(' ')}`); s.ev++; return null; }
    return '질문이나 진실을 고르세요';
  }
  return '잠깐만요, 진행 중이에요';
}
function normQ(q){ if(!q||!QN[q.t]) return null;
  if(q.t==='sum'){ const idx=[...new Set((q.idx||[]).map(x=>x|0))].filter(x=>x>=0&&x<SLOTS).sort((a,b)=>a-b); if(idx.length!==3) return null; return {t:'sum',idx}; }
  return {t:q.t}; }
function stepDelay(s){
  if(s.winner!=null) return null;
  if(s.phase==='setdone') return 1800;
  if(s.phase==='reveal') return 1700;
  if(s.phase==='tie') return 1800;
  if(s.phase==='ans') return 2600;
  if(s.phase==='truth') return s.truthStep<SLOTS ? 650 : 1500;
  return null;
}
function step(s){
  if(s.phase==='setdone'){ startBid(s); return; }
  if(s.phase==='reveal'){ const [a,b]=s.bid;
    s.log.push(`${s.round}R 토큰 A ${a} : B ${b}`);
    if(a===b){
      if(a===0){ const q0=s.qa[0].length, q1=s.qa[1].length; let w; if(q0!==q1) w=q0<q1?0:1; else { w=s.prio; s.prio=1-w; }
        s.act=w; s.phase='act'; s.turn=w; s.notice=`🎙️ 둘 다 0개 — ${q0!==q1?'질문을 덜 한':'우선권을 가진'} ${w?'B':'A'}가 행동합니다`; s.ev++; return; }
      s.tok[0]-=a; s.tok[1]-=b; s.phase='tie'; s.notice=`🎙️ 둘 다 ${a}개! 토큰은 딜러가 가져가고 다시 겁니다`; s.ev++; return; }
    const w=a>b?0:1; s.tok[w]-=s.bid[w]; s.act=w; s.phase='act'; s.turn=w; s.notice=`🎙️ ${Math.max(a,b)} 대 ${Math.min(a,b)} — ${w?'B':'A'}가 행동합니다`; s.ev++; return; }
  if(s.phase==='tie'){ s.round--; startBid(s); return; }
  if(s.phase==='ans'){ s.last=null; startBid(s); return; }
  if(s.phase==='truth'){ if(s.truthStep<SLOTS){ s.truthStep++; s.ev++; return; }
    const d=s.decl; s.winner = d.ok ? d.p : 1-d.p; s.phase='over'; s.turn=null;
    s.notice = d.ok ? '🎙️ 진실입니다! 우승!' : '🎙️ 진실이 아닙니다 — 선언한 쪽의 패배'; s.ev++; }
}
function mask(s,p){
  const v=U.clone(s), o=1-p;
  if(s.phase!=='over') v.cards[o]=null;
  if(s.phase==='bid'&&s.bid[o]!=null) v.bid[o]='?';
  if(s.phase==='truth'){ v.truthOpen = s.cards[1-s.decl.p].slice(0,s.truthStep); if(s.decl.p===p) v.cards[o]=null; }
  return v;
}

/* 추론기: 공개된 질문·답으로 상대 배치 후보를 센다 (자리에서 아는 것만) */
function makeChecker(qa){
  const sums=[], cons=[]; let same=null, mx=null, mn=null;
  for(const {q,a} of qa){ if(q.t==='sum') sums.push({idx:q.idx,v:a.v}); else if(q.t==='same'){ same=Array(SLOTS).fill(-1); a.groups.forEach((g,k)=>g.forEach(i=>same[i]=k)); }
    else if(q.t==='cons') cons.push(new Set(a.pairs)); else if(q.t==='max') mx=new Set(a.pos); else if(q.t==='min') mn=new Set(a.pos); }
  return function ok(x,n){   // x[0..n-1] 배정됨, 방금 n-1번
    const k=n-1, xv=x[k];
    let cnt=0; for(let i=0;i<n;i++) if(x[i]===xv) cnt++; if(cnt>4) return false;
    if(same) for(let i=0;i<k;i++){ const eq=x[i]===xv, sg=same[k]>=0&&same[i]===same[k]; if(eq!==sg) return false; }
    if(cons.length&&k>0){ const c=Math.abs(x[k-1]-xv)===1; for(const st of cons) if(st.has(k-1)!==c) return false; }
    for(const sm of sums){ let s=0, un=0; for(const i of sm.idx){ if(i<n) s+=x[i]; else un++; } if(s+un>sm.v||s+un*MAXV<sm.v) return false; }
    for(const [set,dir] of [[mx,1],[mn,-1]]) if(set){ let ref=null; for(let i=0;i<n;i++) if(set.has(i)){ ref=x[i]; break; }
      if(ref!=null) for(let i=0;i<n;i++){ if(set.has(i)){ if(x[i]!==ref) return false; } else if(dir*(x[i]-ref)>=0) return false; } }
    return true;
  };
}
function countSols(qa,limit,budget=60000){
  const ok=makeChecker(qa), x=Array(SLOTS).fill(0), sols=[]; let n=0, steps=0, cut=false;
  // 합 질문에서 경계가 일찍 걸리도록 값은 작은 것부터
  (function rec(d){ if(n>=limit||cut) return; if(d===SLOTS){ n++; if(sols.length<limit) sols.push(x.slice()); return; }
    for(let v=1;v<=MAXV;v++){ if(++steps>budget){ cut=true; return; } x[d]=v; if(ok(x,d+1)) rec(d+1); if(n>=limit||cut) return; } })(0);
  return {n, sols, cut};
}
function sampleSols(qa,runs=14,per=5){   // 값 순서를 섞어 여러 번 찾기 → 고르게 퍼진 후보 표본
  const ok=makeChecker(qa), out=new Map();
  for(let r=0;r<runs;r++){ const x=Array(SLOTS).fill(0), ord=[...Array(SLOTS)].map(()=>U.shuffle([...Array(MAXV)].map((_,i)=>i+1))); let n=0, steps=0;
    (function rec(d){ if(n>=per||steps>20000) return; if(d===SLOTS){ n++; out.set(x.join(),x.slice()); return; }
      for(const v of ord[d]){ steps++; x[d]=v; if(ok(x,d+1)) rec(d+1); if(n>=per) return; } })(0); }
  return [...out.values()];
}
const SUMSET=[[0,1,2],[3,4,5],[5,6,7],[1,2,3],[4,5,6],[0,6,7],[2,3,4],[0,1,7],[1,4,6],[0,3,6],[2,5,7]];
function nextSum(qa,lvl){ const asked=new Set(qa.filter(x=>x.q.t==='sum').map(x=>x.q.idx.join()));
  const pool = lvl===0 ? [[0,1,2],[3,4,5],[5,6,7],[0,3,6],[1,4,7]].concat([U.shuffle([0,1,2,3,4,5,6,7]).slice(0,3).sort((a,b)=>a-b)]) : SUMSET;
  const left=pool.filter(t=>!asked.has(t.slice().sort((a,b)=>a-b).join()));
  return left.length ? (lvl===0?U.pick(left):left[0]) : U.shuffle([0,1,2,3,4,5,6,7]).slice(0,3).sort((a,b)=>a-b); }
let brain={};
function know(v,p){ const k=JSON.stringify(v.qa[p].map(x=>[x.q,x.a])); if(brain[k]) return brain[k]; const r=countSols(v.qa[p],60); if(Object.keys(brain).length>30) brain={}; brain[k]=r; return r; }
function ai(v,lvl=1){
  const me=1, o=0;
  if(v.phase==='setup'){ if(v.ready[me]) return null; return {k:'setup', cards:randomCards(lvl)}; }
  if(v.phase==='bid'){ if(v.bid[me]!=null) return null;
    const mine=know(v,me), theirs=know(v,o), T=v.tok[me], OT=v.tok[o];
    const iCan = !mine.cut && mine.n===1, theyCan = !theirs.cut && theirs.n===1;
    let x;
    if(theyCan||iCan) x = lvl===0 ? Math.min(T, 1+Math.floor(Math.random()*4)) : (theyCan&&!iCan&&T<OT ? (Math.random()<.5?T:0) : Math.min(T, OT+1, T));   // 상대가 다 알면 올인
    else { const close = theirs.cut?0: theirs.n<=3?2 : theirs.n<=15?1 : 0; const mclose = mine.cut?0: mine.n<=3?2: mine.n<=15?1:0;
      x = Math.min(T, [0,1,1][lvl] + close + (lvl>0?mclose:0) + (Math.random()<.35?1:0)); if(T>OT+3&&lvl===2) x=Math.min(T,x+1); }
    return {k:'bid', x:Math.max(0,x)};
  }
  if(v.phase==='act'&&v.turn===me){
    const mine=know(v,me);
    if(!mine.cut && (mine.n===1 || (lvl===0&&mine.n<=3) || (mine.n<=2&&know(v,o).n===1&&!know(v,o).cut))) return {k:'truth', cards:U.pick(mine.sols)};
    if(lvl===2 && (mine.cut || mine.n>1)){ const S = !mine.cut&&mine.n<60 ? mine.sols : sampleSols(v.qa[me]); const q=S.length>1&&bestQ(v.qa[me],S); if(q) return {k:'ask', q}; }
    const done=new Set(v.qa[me].map(x=>x.q.t));
    const order = lvl===2 ? ['same','max','min','cons'] : lvl===1 ? ['same','max','cons'] : U.shuffle(['same','max','min','cons']);
    for(const t of order) if(!done.has(t) && (lvl>0 || Math.random()<.5)) return {k:'ask', q:{t}};
    return {k:'ask', q:{t:'sum', idx:nextSum(v.qa[me],lvl)}};
  }
  return null;
}
function bestQ(qa,sols){   // 남은 후보들 위에서 답이 가장 고르게 갈리는 질문
  const askedT=new Set(qa.filter(x=>x.q.t!=='sum').map(x=>x.q.t)), askedS=new Set(qa.filter(x=>x.q.t==='sum').map(x=>x.q.idx.join()));
  const cands=[]; for(const t of ['same','cons','max','min']) if(!askedT.has(t)) cands.push({t});
  for(let a=0;a<SLOTS;a++) for(let b=a+1;b<SLOTS;b++) for(let c=b+1;c<SLOTS;c++) if(!askedS.has([a,b,c].join())) cands.push({t:'sum',idx:[a,b,c]});
  let best=null, bh=-1;
  for(const q of U.shuffle(cands)){ const cnt={}; for(const s of sols){ const k=JSON.stringify(answer(s,q)); cnt[k]=(cnt[k]||0)+1; }
    let h=0; for(const k in cnt){ const p=cnt[k]/sols.length; h-=p*Math.log(p); } if(h>bh){ bh=h; best=q; } }
  return bh>0?best:null;
}
function randomCards(lvl){ for(;;){ const c=[]; for(let i=0;i<SLOTS;i++) c.push(1+(Math.random()*MAXV|0)); if(validCards(c)) return c; } }
function aiDelay(v){
  if(v.phase==='setup') return 2500+Math.random()*2500;
  if(v.phase==='bid') return 1500+Math.random()*2500;
  if(v.phase==='act'){ const m=know(v,1); return (!m.cut&&m.n<=2) ? 4200+Math.random()*2000 : 1800+Math.random()*1800; }
  return 900;
}

/* 화면 */
let helpMemo={};
function helper(qa){   // 후보가 400개 아래로 좁혀졌으면 칸마다 가능한 숫자
  const k=JSON.stringify(qa.map(x=>[x.q,x.a])); if(helpMemo[k]!==undefined) return helpMemo[k];
  const r=countSols(qa,400,200000); let out=null;
  if(!r.cut&&r.n<400&&r.n>0) out={n:r.n, sets:[...Array(SLOTS)].map((_,i)=>[...new Set(r.sols.map(s=>s[i]))].sort((a,b)=>a-b))};
  if(Object.keys(helpMemo).length>20) helpMemo={}; helpMemo[k]=out; return out;
}
let setup=null, notes=null, qSel={t:'same', idx:[]}, betX=0, sig='';
function render(el,v,ctx){
  const me=ctx.me, o=1-me;
  const nm=p=>p===me?'나':(ctx.mode==='solo'?'상대':U.esc(ctx.name(p)));
  const ga=p=>{ const n=nm(p); if(n==='나') return '내가'; const c=n.charCodeAt(n.length-1); return n+(c>=0xAC00&&c<=0xD7A3?((c-0xAC00)%28?'이':'가'):'(이)가'); };
  const fix=t=>String(t).replace(/(^|s)A가/,'$1'+ga(0)).replace(/(^|s)B가/,'$1'+ga(1)).replace(/A (d|❓|⚖️|카드)/,nm(0)+' $1').replace(/B (d|❓|⚖️|카드)/,nm(1)+' $1');
  if(!setup) setup=Array(SLOTS).fill(null); if(!notes) notes=Array(SLOTS).fill(0);
  let h='';
  if(v.notice) h+=`<div class="vr-speech">${fix(U.esc(v.notice))}</div>`;
  h+=`<div class="py-top"><div class="py-sc ${v.turn===o?'buzz':''}"><small>${nm(o)}</small><b>🪙 ${v.tok[o]}</b></div>
    <div class="py-goal"><small>${v.round>0?v.round+'라운드':'준비'}</small><b style="font-size:22px">${v.phase==='setup'?'배치':v.phase==='bid'?'입찰':v.phase==='act'?'행동':v.phase==='truth'?'진실':v.phase==='over'?'끝':'…'}</b><small>우선권: ${nm(v.prio)}</small></div>
    <div class="py-sc me ${v.turn===me?'buzz':''}"><small>나</small><b>🪙 ${v.tok[me]}</b></div></div>`;
  // 고정 상황 줄
  let line='&nbsp;';
  if(v.phase==='setup') line = v.ready[me] ? `${nm(o)} 배치를 기다리는 중…` : '카드 8장을 골라 1~8번 칸에 놓으세요 (같은 숫자 4장까지)';
  else if(v.phase==='bid') line = v.bid[me]!=null ? `나 ${v.bid[me]}개 걸음 · ${v.bid[o]!=null?`${nm(o)}도 걸었어요`:`${nm(o)} 고민 중…`}` : '몇 개 걸까요? 많이 건 쪽이 행동해요 (건 토큰은 사라짐)';
  else if(v.phase==='reveal') line=`🪙 공개: 나 <b>${v.bid[me]}</b> : <b>${v.bid[o]}</b> ${nm(o)}`;
  else if(v.phase==='act') line = v.turn===me ? '❓ 질문하거나 ⚖️ 진실을 선언하세요' : `${ga(o)} 고르는 중…`;
  else if(v.phase==='ans'&&v.last) line=`${v.last.p===me?'내':nm(v.last.p)+'의'} 질문 → ${ansText(v.last.q,v.last.a)}`;
  else if(v.phase==='truth') line=`⚖️ ${v.decl.p===me?'내':nm(v.decl.p)+'의'} 진실 선언 — 한 장씩 맞춰 봅니다`;
  else if(v.phase==='over') line = v.winner==='draw'?'🤝 무승부': v.winner===me?'🎉 우승!':'😢 준우승';
  h+=`<div class="py-line">${line}</div>`;
  // 상대 칸 (내가 추리하는 대상) + 진실 공개
  const oc=v.cards[o];
  const decl=v.decl;
  h+=`<div class="qt-row"><div class="qt-lab">${nm(o)}의 카드</div><div class="qt-cards">${[...Array(SLOTS)].map((_,i)=>{
      let face = oc ? L(oc[i]) : '';
      if(v.phase==='truth'&&decl&&decl.p===me&&v.truthOpen&&i<v.truthOpen.length){ face=L(v.truthOpen[i]); }
      const mark = decl&&decl.p===me&&(v.phase==='over'||(v.truthOpen&&i<v.truthOpen.length)) ? (decl.g[i]===(oc?oc[i]:v.truthOpen[i])?'ok':'ng') : '';
      return `<div class="qt-c ${face?'open':'back'} ${mark}"><i>${i+1}</i>${face}${decl&&decl.p===me?`<small>${L(decl.g[i])}</small>`:''}</div>`; }).join('')}</div></div>`;
  // 내 추리 노트
  if(v.phase!=='setup'&&v.phase!=='over'&&!(decl&&decl.p===me)){
    h+=`<div class="qt-row"><div class="qt-lab">📝 내 추리</div><div class="qt-cards">${notes.map((n,i)=>`<select class="qt-note" data-n="${i}"><option value="0">?</option>${[...Array(MAXV)].map((_,k)=>`<option value="${k+1}" ${n===k+1?'selected':''}>${L(k+1)}</option>`).join('')}</select>`).join('')}</div></div>`; }
  if(v.phase!=='setup'&&v.phase!=='over'&&v.qa[me].length){ const hp=helper(v.qa[me]);
    h+=`<div class="qt-row"><div class="qt-lab">📐 도우미</div>${hp?`<div class="qt-cards">${hp.sets.map(st=>`<div class="qt-help">${st.length===1?`<b>${L(st[0])}</b>`:st.length<=4?st.map(L).join('·'):`${L(st[0])}~${L(st[st.length-1])}`}</div>`).join('')}</div><small class="qt-hn">남은 경우 ${hp.n}가지</small>`:'<small class="qt-hn">아직 경우가 너무 많아요 — 질문을 더 해서 좁히면 칸마다 가능한 숫자가 보여요</small>'}</div>`; }
  // 내 카드
  if(v.phase==='setup'&&!v.ready[me]){
    h+=`<div class="qt-row me"><div class="qt-lab">내 카드 배치</div><div class="qt-cards">${setup.map((n,i)=>`<select class="qt-note" data-s="${i}"><option value="0">?</option>${[...Array(MAXV)].map((_,k)=>`<option value="${k+1}" ${n===k+1?'selected':''}>${L(k+1)}</option>`).join('')}</select>`).join('')}</div></div>
      <div class="fh-act"><button class="ghost" data-a="rand">🎲 무작위</button><button data-a="setup">✅ 배치 확정</button></div>`;
  } else if(v.cards[me]){
    // 상대가 내 카드에 대해 알아낸 것
    h+=`<div class="qt-row me"><div class="qt-lab">내 카드</div><div class="qt-cards">${v.cards[me].map((c,i)=>`<div class="qt-c open mine ${decl&&decl.p===o&&(v.phase==="over"||v.truthOpen&&i<v.truthOpen.length)?(decl.g[i]===c?'ok':'ng'):''}"><i>${i+1}</i>${L(c)}${decl&&decl.p===o?`<small>${L(decl.g[i])}</small>`:''}</div>`).join('')}</div></div>`;
  }
  // 행동 패널
  if(v.phase==='bid'&&v.bid[me]==null){ betX=Math.max(0,Math.min(v.tok[me],betX));
    h+=`<div class="bs-ctl"><div class="bs-amt"><button class="ghost" data-a="m">−</button><b>🪙 ${betX}</b><button class="ghost" data-a="p">+</button></div><div class="fh-act"><button data-a="bid">${betX}개 걸기</button></div></div>`; }
  if(v.phase==='act'&&v.turn===me){
    const asked=new Set(v.qa[me].filter(x=>x.q.t!=='sum').map(x=>x.q.t));
    h+=`<div class="qt-act"><div class="qt-qs">${Object.keys(QN).map(t=>`<button class="${qSel.t===t?'on':''} ${asked.has(t)?'done':''}" data-q="${t}" ${asked.has(t)?'disabled':''}>${QN[t]}</button>`).join('')}</div>
      ${qSel.t==='sum'?`<div class="qt-pick">세 칸 고르기: ${[...Array(SLOTS)].map((_,i)=>`<button class="${qSel.idx.includes(i)?'on':''}" data-pi="${i}">${i+1}</button>`).join('')}</div>`:''}
      <div class="fh-act"><button data-a="ask">❓ 질문하기</button><button class="qt-truth" data-a="truth">⚖️ 진실 선언 (📝 내 추리대로)</button></div></div>`; }
  // 질문·답 기록 (양쪽)
  const qaList=p=>v.qa[p].length?v.qa[p].slice().reverse().map(x=>`<div>${x.r}R · ${QN[x.q.t]} → ${ansText(x.q,x.a)}</div>`).join(''):'<div><small>아직 없음</small></div>';
  h+=`<div class="side3 qt-side"><div class="side-box"><b>🔎 내가 알아낸 것 (${nm(o)} 카드)</b>${qaList(me)}</div><div class="side-box"><b>👀 ${ga(o)} 알아낸 것 (내 카드)</b>${qaList(o)}</div></div>`;
  h+=`<details class="hl-log"><summary>기록</summary>${v.log.slice(-14).reverse().map(x=>`<div>${fix(U.esc(x))}</div>`).join('')}</details>`;
  el.innerHTML=h;
  el.onchange=e=>{ const t=e.target; if(t.dataset.n!=null){ notes[+t.dataset.n]=+t.value; } if(t.dataset.s!=null){ setup[+t.dataset.s]=+t.value||null; } };
  el.onclick=e=>{ const b=e.target.closest('button'); if(!b||b.disabled) return;
    if(b.dataset.q){ qSel={t:b.dataset.q, idx:qSel.idx}; return ctx.rerender(); }
    if(b.dataset.pi!=null){ const i=+b.dataset.pi; qSel.idx = qSel.idx.includes(i) ? qSel.idx.filter(x=>x!==i) : qSel.idx.concat([i]).slice(-3); return ctx.rerender(); }
    const k=b.dataset.a;
    if(k==='rand'){ setup=randomCards(1); return ctx.rerender(); }
    if(k==='setup'){ if(setup.some(x=>!x)) return ctx.tip('8칸을 모두 채우세요'); return ctx.act({k:'setup', cards:setup}); }
    if(k==='m'){ betX=Math.max(0,betX-1); return ctx.rerender(); } if(k==='p'){ betX=Math.min(v.tok[me],betX+1); return ctx.rerender(); }
    if(k==='bid') return ctx.act({k:'bid', x:betX});
    if(k==='ask'){ if(qSel.t==='sum'&&qSel.idx.length!==3) return ctx.tip('세 칸을 고르세요'); return ctx.act({k:'ask', q:{t:qSel.t, idx:qSel.idx}}); }
    if(k==='truth'){ if(notes.some(x=>!x)) return ctx.tip('📝 내 추리 8칸을 모두 채우세요'); if(!confirm(`진실 선언: ${notes.map(L).join(' ')}\n틀리면 바로 집니다. 선언할까요?`)) return; return ctx.act({k:'truth', cards:notes}); } };
}
const guide=`
<p><b>상대의 카드 8장을 질문으로 알아내는 추리 대결</b>. 각자 A~K 카드(숫자마다 4장)에서 <b>8장을 골라 1~8번 칸에 몰래</b> 놓아요. 토큰 ${TOK}개씩. (A=1, J=11, Q=12, K=13)</p>
<ol><li>매 라운드 둘이 <b>몰래 토큰을 걸어요</b>. 많이 건 쪽이 <b>건 토큰을 내고</b> 행동해요. 같으면 둘 다 건 토큰을 잃고 다시(둘 다 0이면 우선권 가진 쪽이 행동, 우선권은 넘어감).</li>
<li><b>❓ 질문</b> — 하나 골라요(답은 둘 다 봐요):<br>· <b>세 칸의 합</b>(칸 3개 지정, 여러 번 가능) · <b>같은 숫자 위치</b> · <b>이웃한 연속 숫자</b>(예: 7 옆에 8) · <b>가장 큰 숫자 위치</b> · <b>가장 작은 숫자 위치</b></li>
<li><b>⚖️ 진실</b> — 상대 8장을 1번부터 선언. <b>맞으면 우승, 틀리면 그 자리에서 패배!</b></li></ol>
<p>${MAXR}라운드까지 아무도 못 맞히면 무승부.</p>
<div class="tipbox">💡 <b>팁</b><br>· 합 질문 8개면 8칸을 다 풀 수 있어요(예: 1·2·3, 2·3·4 …). 같은 숫자·최대·최소 질문으로 먼저 좁히면 더 빨라요.<br>· 상대가 내 카드를 다 알아낸 것 같으면(오른쪽 👀 칸) 토큰을 몰아서 막으세요!<br>· 📝 내 추리 칸에 적어 두면 그대로 진실 선언에 쓰여요.<br>· 원작 규칙이 문서마다 조금씩 달라 원작 질문 유형을 바탕으로 정했어요(문양은 뺌).</div>`;
window.GAMES.qtruth = {
  title:'질문과 진실', ref:'데블스 플랜 「질문과 진실」', emoji:'⚖️', tags:['추리','심리전','두뇌서바이벌','결승'],
  tagline:'몰래 놓은 카드 8장. 토큰을 걸고 질문을 따내 상대 배치를 먼저 맞히는 결승 추리전.',
  guide, init, apply, mask, ai, aiDelay, render, step, stepDelay,
  reset(){ helpMemo={}; setup=null; notes=null; qSel={t:'same',idx:[]}; betX=0; brain={}; },
  status:(v,ctx)=> v.phase==='setup'?(v.ready[ctx.me]?'상대 배치를 기다리는 중':'카드를 배치하세요'): v.phase==='bid'?(v.bid[ctx.me]!=null?'상대 입찰을 기다리는 중':'토큰을 거세요'): v.phase==='act'?(ctx.myTurn?'질문 또는 진실!':'상대가 고르는 중…'): v.phase==='truth'?'진실 확인 중…':'',
  bar:(v,i)=>`<span class="score">🪙 ${v.tok[i]} · ❓${v.qa[i].length}</span>`,
  _count:countSols,
};
})();
