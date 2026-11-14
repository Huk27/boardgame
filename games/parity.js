(function(){
'use strict';
/* 짝홀 대결: 0~8 타일 9개. 상대가 낸 타일은 색(짝=검정, 홀=흰색)만 보임. 큰 수가 그 라운드 승. */
const R=9, ALL=[0,1,2,3,4,5,6,7,8];
function init(starter){
  return {hands:[ALL.slice(),ALL.slice()], score:[0,0], round:1, leader:starter, turn:starter, cur:[null,null], hist:[], winner:null, starter};
}
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(s.turn!==p) return '상대 차례예요';
  if(!a||a.k!=='play') return '알 수 없는 동작';
  const i=s.hands[p].indexOf(a.n); if(i<0) return '없는 타일이에요';
  s.hands[p].splice(i,1); s.cur[p]=a.n;
  const o=1-p;
  if(s.cur[o]===null){ s.turn=o; return null; }
  const [x,y]=s.cur, w = x>y?0 : y>x?1 : -1;
  if(w>=0) s.score[w]++;
  s.hist.push({lead:s.leader, t:[x,y], w});
  s.cur=[null,null]; s.round++;
  if(w>=0) s.leader=w;
  s.turn=s.leader;
  const left=R-(s.round-1);
  if(left<=0 || Math.abs(s.score[0]-s.score[1])>left){
    s.winner = s.score[0]>s.score[1]?0 : s.score[1]>s.score[0]?1 : 'draw';
    s.turn=null;
  }
  return null;
}
// p에게 보이는 것: 상대 타일은 색만 (게임이 끝나면 전부 공개)
function mask(s,p){
  const over=s.winner!=null, v=U.clone(s), o=1-p;
  const show=(n,i)=> n===null ? null : (i===p||over) ? {n,par:n%2} : {n:null,par:n%2};
  v.hands[o] = over ? s.hands[o].map(n=>({n,par:n%2})) : s.hands[o].map(n=>({n:null,par:n%2})).sort((a,b)=>a.par-b.par);
  v.hands[p] = s.hands[p].slice();
  v.cur = s.cur.map(show);
  v.hist = s.hist.map(h=>({lead:h.lead, w:h.w, t:h.t.map(show)}));
  return v;
}
const tile=(t,cls='')=> t ? `<span class="ptile ${t.par?'w':'b'} ${cls}">${t.n==null?'?':t.n}</span>` : `<span class="ptile empty ${cls}"></span>`;
const colorName=par=> par ? '흰색(홀수)' : '검은색(짝수)';

function render(el,V,ctx){
  const me=ctx.me, o=1-me, myTurn=ctx.myTurn;
  const live = V.cur[0]||V.cur[1];
  const last = V.hist[V.hist.length-1];
  let table, res='';
  if(live || !last){
    table = [V.cur[o], V.cur[me]];
  } else {
    table = [last.t[o], last.t[me]];
    res = last.w===-1 ? '지난 라운드: 비김' : last.w===me ? '지난 라운드: 내가 이김 ✔' : '지난 라운드: 상대가 이김';
  }
  let h = `<div class="info">라운드 <b>${Math.min(V.round,R)}</b> / ${R} · 먼저 내는 사람 <b>${U.esc(ctx.name(V.leader))}</b></div>`;
  h += `<div class="pr-table" style="${!live&&last?'opacity:.75':''}">
    <div class="slot">${U.esc(ctx.name(o))}${tile(table[0],'big')}</div><div class="vs">VS</div>
    <div class="slot">나${tile(table[1],'big')}</div></div>`;
  h += `<div class="pr-res">${res}</div>`;
  h += `<div class="pr-hand">${V.hands[me].map(n=>`<button class="ptile ${n%2?'w':'b'}" data-n="${n}" ${myTurn?'':'disabled'}>${n}</button>`).join('')}</div>`;
  h += `<div class="info">상대 남은 타일 <span class="dots">${V.hands[o].map(t=>`<i class="${t.par?'w':'b'}"></i>`).join('')}</span>
        ${V.winner!=null?'· '+V.hands[o].map(t=>t.n).join(', '):''}</div>`;
  if(V.hist.length){
    h += `<table class="hist"><tr><th>라운드</th><th>먼저</th><th>나</th><th>상대</th><th>결과</th></tr>${V.hist.map((x,i)=>
      `<tr><td>${i+1}</td><td>${x.lead===me?'나':'상대'}</td><td>${tile(x.t[me],'sm')}</td><td>${tile(x.t[o],'sm')}</td><td>${x.w===-1?'비김':x.w===me?'승':'패'}</td></tr>`).reverse().join('')}</table>`;
  }
  el.innerHTML=h;
  if(V.winner!=null && ctx.mode==='solo') lastOver=V;   // 끝난 판은 다음 판 시작할 때 컴퓨터 기억에 넣음
  el.onclick=e=>{ const b=e.target.closest('[data-n]'); if(b&&!b.disabled) ctx.act({k:'play',n:+b.dataset.n}); };
}
function status(V,ctx){
  const o=1-ctx.me;
  if(ctx.myTurn) return V.cur[o] ? `상대가 ${colorName(V.cur[o].par)} 타일을 냈어요. 내 타일을 고르세요` : '먼저 낼 타일을 고르세요';
  return ctx.turnText(V) + (V.cur[ctx.me] ? ' (내 타일은 냈어요)' : '');
}
/* 컴퓨터
   - 쉬움: 상대 색만 보고 대충 짐작
   - 보통: (버릇은 조금 덜 믿음) 지금까지의 승패 기록으로 상대가 낸 숫자를 거꾸로 추리 → 지금 낸 타일이 몇일 확률 계산
   - 어려움: 추리 + 상대 버릇 기억(판이 끝나 숫자가 공개되면, 상대가 먼저 낼 때 남은 타일 중 큰 걸 내는 편인지 작은 걸 내는 편인지)
   기억은 같은 창에서 다시 하기 하면 이어지고, 오래된 건 흐려짐 */
const EV=[0,2,4,6,8], OD=[1,3,5,7];
const pmem={sum:0,n:0}; let lastOver=null;
function learn(V){   // 끝난 판(숫자 전부 공개)에서 사람(0번)이 먼저 낼 때 고른 타일의 순위 기록
  if(!V||V.winner==null||!V.hist.length||V.hist.some(h=>!h.t[0]||h.t[0].n==null)) return;
  for(const k in pmem) pmem[k]*=.7;
  const left=new Set(ALL);
  for(const h of V.hist){ const x=h.t[0].n;
    if(h.lead===0){ const same=[...left].filter(n=>n%2===x%2).sort((a,b)=>a-b); if(same.length>1){ pmem.sum+=same.indexOf(x)/(same.length-1); pmem.n++; } }
    left.delete(x); }
}
function guessDist(v,lvl){   // 지금 상대(0번)가 낸 타일의 확률 {숫자: 확률}
  const rounds=v.hist.map(h=>({par:h.t[0].par, a:h.t[1].n, w:h.w, lead:h.lead}));
  const cur=v.cur[0]; if(!cur) return null;
  const dist={}; let tot=0;
  const mu = pmem.n ? pmem.sum/pmem.n : .5, a = Math.min(1,pmem.n/5)*(lvl===2?.8:.7);
  const used=new Set();
  (function rec(i){
    if(i===rounds.length){
      const pool=(cur.par?OD:EV).filter(n=>!used.has(n)); if(!pool.length) return;
      for(let k=0;k<pool.length;k++){ const r=pool.length>1?k/(pool.length-1):.5; const w=(1-a)+a*Math.exp(-((r-mu)**2)/(2*.09)); dist[pool[k]]=(dist[pool[k]]||0)+w; tot+=w; }
      return; }
    const R=rounds[i];
    for(const x of (R.par?OD:EV)){ if(used.has(x)) continue;
      const ok = R.w===1 ? x<R.a : R.w===0 ? x>R.a : x===R.a; if(!ok) continue;
      used.add(x); rec(i+1); used.delete(x); }
  })(0);
  if(!tot) return null;
  for(const k in dist) dist[k]/=tot; return dist;
}
function ai(v,lvl=1){
  const hand=v.hands[1].slice().sort((a,b)=>a-b), op=v.cur[0];
  if(!op){   // 내가 먼저: 섞어서 (가끔 가장 작은 걸로 떠보기)
    if(lvl===0) return {k:'play', n: Math.random()<.3 ? hand[0] : U.pick(hand)};
    const left=9-v.hist.length, need=v.score[0]-v.score[1];
    if(Math.random()<.35) return {k:'play', n:hand[0]};
    if(need>0 && left<=need+1) return {k:'play', n:hand[hand.length-1]};   // 몰리면 큰 걸로
    return {k:'play', n:U.pick(hand.slice(0, Math.max(1, Math.ceil(hand.length*.75))))};
  }
  if(lvl===0){
    const cand=ALL.filter(n=>n%2===op.par), avg=cand.reduce((a,b)=>a+b,0)/cand.length;
    const beat=hand.filter(n=>n>avg); if(beat.length && Math.random()<.8) return {k:'play',n:beat[0]}; return {k:'play',n:hand[0]};
  }
  const d=guessDist(v,lvl);
  if(!d) return {k:'play', n:hand[0]};
  const pw=m=>Object.entries(d).reduce((s,[x,p])=>s+(+x<m?p:0),0);
  const thr = lvl===2 ? .6 : .55+(Math.random()-.5)*.1;
  const sure=hand.filter(m=>pw(m)>=thr);
  if(sure.length) return {k:'play', n:sure[0]};   // 이길 만한 것 중 가장 작은 걸로
  // 못 이길 것 같으면 가장 작은 걸 버림. 단, 꼭 이겨야 하면 가장 큰 걸로 승부
  const left=9-v.hist.length, need=v.score[0]-v.score[1];
  if(need>=0 && left<=need+1) return {k:'play', n:hand[hand.length-1]};
  return {k:'play', n:hand[0]};
}
const guide=`
<p>0부터 8까지 숫자 타일 9개를 하나씩 내서, <b>큰 수를 낸 쪽이 그 라운드를 이겨요.</b> 9라운드 동안 더 많이 이긴 사람이 승리.</p>
<h3>숨겨진 숫자</h3>
<ul><li><b>짝수(0·2·4·6·8)는 검은 타일</b>, <b>홀수(1·3·5·7)는 흰 타일</b>이에요.</li>
<li>상대가 낸 타일은 <b>색만</b> 보여요. 숫자는 끝까지 비밀.</li>
<li>라운드 결과도 누가 이겼는지만 알려줘요. 상대가 뭘 냈는지는 추리해야 해요.</li></ul>
<h3>진행</h3>
<ul><li>먼저 내는 사람이 타일을 내면, 상대는 그 색을 보고 자기 타일을 골라요.</li>
<li>라운드를 이긴 사람이 다음 라운드에 먼저 내요. 비기면 그대로.</li>
<li>남은 라운드를 다 이겨도 못 따라잡게 되면 바로 끝나요.</li>
<li>게임이 끝나면 모든 숫자가 공개돼요.</li></ul>
<div class="tipbox">💡 <b>팁</b><br>
· 상대가 검은색을 냈다면 0·2·4·6·8 중 하나. 이미 이긴·진 기록으로 후보를 줄여보세요.<br>
· 질 것 같은 라운드엔 가장 작은 타일을 버려서 큰 타일을 아끼세요.<br>
· 화면 아래 '상대 남은 타일'의 색 개수를 보면 상대 손이 보여요.<br>
· 🧠 컴퓨터(보통·어려움)는 승패 기록으로 내 숫자를 거꾸로 추리해요. 어려움은 판이 끝나 공개된 숫자로 <b>내가 먼저 낼 때 큰 걸 내는 버릇</b>까지 기억해요.</div>`;
window.GAMES.parity = {
  title:'짝홀 대결', ref:'더 지니어스 「흑과백」', emoji:'⚫', tags:['심리전','숫자','두뇌서바이벌'], pulse:v=>v.score[1]-v.score[0], tagline:'0~8 타일로 숫자 대결. 상대 타일은 색(짝·홀)만 보이는 심리전.',
  guide, init, apply, mask, ai, render, status, learn,
  reset(){ if(lastOver){ learn(lastOver); lastOver=null; } },
  forget(){ pmem.sum=0; pmem.n=0; lastOver=null; },
  bar:(v,i)=>`<span class="score">${v.score[i]}</span><span class="tag">승</span>`,
  result:(v,ctx)=>`${v.score[ctx.me]} : ${v.score[1-ctx.me]}`,
};
})();
