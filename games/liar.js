(function(){
'use strict';
/* 거짓말 주사위: 각자 주사위 5개를 컵에 숨기고 굴림. 번갈아 "둘 합쳐서 ○이 △개 이상 있다"를 점점 올려 부름.
   못 믿겠으면 "거짓말!" → 컵 공개. 맞으면 거짓말 외친 사람이, 틀리면 부른 사람이 주사위 하나를 잃음.
   1은 만능(어떤 눈으로도 셈, 단 1을 부를 땐 1만). 주사위를 다 잃으면 패배. */
const START=5;
const roll=n=>Array.from({length:n},()=>1+(Math.random()*6|0)).sort((a,b)=>a-b);
/* 👥 2~6명 (2026-11-12) — 자리 = 사람 수. 주사위를 다 잃으면 빠지고, 마지막 한 명이 승리 */
function init(starter,o){ const k=Math.max(2,Math.min(6,(o&&o.humans)||2)); return {dice:[...Array(k)].map(()=>roll(START)), n:Array(k).fill(START), bid:null, bids:[], turn:(starter|0)%k, starter, phase:'bid', round:1, reveal:null, hist:[], winner:null, hs:[...Array(k).keys()]}; }
const TOT=s=>s.n.reduce((a,b)=>a+b,0), NX=(s,p)=>{ const k=s.n.length; for(let d=1;d<=k;d++){ const q=(p+d)%k; if(s.n[q]>0) return q; } return p; };
const countFace=(arr,f)=> arr.filter(d=>d===f || (f!==1 && d===1)).length;
const higher=(a,b)=> !b || a.q>b.q || (a.q===b.q && a.f>b.f);
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(!a) return '알 수 없는 동작';
  if(s.phase!=='bid') return '컵을 여는 중이에요';
  if(s.turn!==p) return '상대 차례예요';
  const total=TOT(s);
  if(a.k==='bid'){
    const q=a.q|0, f=a.f|0;
    if(f<1||f>6) return '눈(1~6)을 고르세요';
    if(q<1||q>total) return `1~${total}개 사이로 부르세요`;
    if(!higher({q,f},s.bid)) return '앞 사람보다 높게 불러야 해요 (개수를 올리거나, 같은 개수면 더 큰 눈)';
    s.bid={q,f,by:p}; s.bids.push({q,f,by:p}); s.turn=NX(s,p); return null;
  }
  if(a.k==='liar'){
    if(!s.bid) return '아직 부른 사람이 없어요';
    const b=s.bid, cnt=s.dice.reduce((t,d)=>t+countFace(d,b.f),0), ok=cnt>=b.q;
    const loser = ok ? p : b.by;
    s.n[loser]--; s.reveal={bid:b, caller:p, cnt, ok, loser, dice:s.dice.map(d=>d.slice())};
    s.hist.push({round:s.round, bid:b, caller:p, cnt, ok, loser});
    s.phase='reveal'; s.turn=null;
    const alive=s.n.map((x,q)=>x>0?q:-1).filter(x=>x>=0); if(alive.length<=1){ s.winner=alive[0]; if(s.n.length>2) s.winners=alive.slice(); s.phase='over'; }
    return null;
  }
  return '알 수 없는 동작';
}
const stepDelay=s=> s.phase==='reveal' ? 5200 : null;
function step(s){
  if(s.phase!=='reveal') return;
  const L=s.reveal.loser; s.round++; s.dice=s.n.map(x=>roll(x)); s.bid=null; s.bids=[]; s.reveal=null; s.phase='bid'; s.turn=s.n[L]>0?L:NX(s,L);   // 진 사람이 먼저 부름(빠졌으면 다음 사람)
}
function mask(s,p){
  const v=U.clone(s);
  if(s.phase==='bid') v.dice=v.dice.map((d,q)=>q===p?d:null);   // 남의 컵은 열기 전까지 비밀 (개수만 공개)
  return v;
}

/* 컴퓨터: 내 주사위 + 상대 컵 확률로 계산. 사람처럼 상대가 부른 눈은 "가지고 있겠지" 하고 믿되,
   지난 판들에서 상대가 뻥을 얼마나 쳤는지 기억해서 믿는 정도를 바꿈. 가끔 뻥도 침. */
function atLeast(need, n, p){ if(need<=0) return 1; if(need>n) return 0; let s=0, c=1; for(let k=0;k<=n;k++){ if(k>0) c=c*(n-k+1)/k; if(k>=need) s+=c*Math.pow(p,k)*Math.pow(1-p,n-k); } return s; }
function bluffRate(v,o){ const mine=v.hist.filter(h=>o==null?h.bid.by!==1:h.bid.by===o); const lies=mine.filter(h=>!h.ok).length; return (lies+1)/(mine.length+2); }
let saidR=-1, lastLine='';
function say(v,kind){
  if(typeof showSay!=='function' || saidR===v.round+':'+kind) return; saidR=v.round+':'+kind;
  const L={liar:['에이~ 그건 뻥이죠','거짓말! 컵 열어요','음… 못 믿겠는데요?'], liarHabit:['아까도 뻥치셨잖아요 ㅎㅎ','이번에도 블러프죠? 다 보여요 😏'], big:['자신 있어요 ㅎ','더 올려 보시든가~','후후…'], trust:['그건 진짜 같네요…']}[kind];
  let t=U.pick(L); if(t===lastLine) t=U.pick(L); lastLine=t; setTimeout(()=>showSay(1,t,3200),200);
}
function ai(v,lvl=1){
  const me=1, o=0; if(v.phase!=='bid'||v.turn!==me) return null;
  const mine=v.dice[me], total=TOT(v), nOpp=total-v.n[me];
  const br=bluffRate(v,v.n.length>2?null:o);
  // 상대가 이번 판에 부른 눈 → 상대가 그 눈을 좀 갖고 있을 거라는 짐작 (뻥쟁이일수록 덜 믿음)
  const hint=f=>{ if(lvl===0) return 0; const said=v.bids.filter(b=>b.by!==me && (b.f===f)).length; return said ? (1-br)*[0,.8,1.1][lvl] : 0; };
  const pTrue=(q,f)=>{ const have=countFace(mine,f)+hint(f); const pp=f===1?1/6:1/3; return atLeast(Math.ceil(q-have-1e-9), nOpp, pp); };
  // 올려 부르기 후보: 각 눈마다 가능한 가장 낮은 개수, 그보다 1·2 많은 개수
  const cands=[];
  for(let f=1;f<=6;f++){ let q0=1; if(v.bid) q0 = f>v.bid.f ? v.bid.q : v.bid.q+1; for(let q=q0;q<=Math.min(total,q0+2);q++) cands.push({q,f}); }
  let best=null, bs=-9;
  for(const c of cands){ let sc=pTrue(c.q,c.f) - (c.q-(v.bid?v.bid.q:1))*.02 + Math.random()*[.5,.12,.04][lvl];
    if(!v.bid && lvl===2 && c.q<2) sc-=.1;   // 어려움: 첫 부름을 너무 낮게 하지 않음
    if(sc>bs){ bs=sc; best=c; } }
  if(lvl===0 && cands.length && Math.random()<.45) best=U.pick(cands);   // 쉬움: 대충 부름
  else if(cands.length && Math.random()<[0,.1,.07][lvl]) best=U.pick(cands.slice(0,8));   // 가끔 뻥
  if(v.bid){
    const pt=pTrue(v.bid.q,v.bid.f), pb = best ? pTrue(best.q,best.f) : 0;
    let call;
    if(lvl===0) call = pt < .05+Math.random()*.45 || !best;
    else if(lvl===1) call = pt < .33+(br-.5)*.3+(Math.random()-.5)*.1 || !best;
    else call = (1-pt) > pb + (Math.random()-.5)*.08 || !best;   // 외쳐서 이길 확률 vs 올려서 버틸 확률
    if(call){ if(lvl>0 && v.hist.filter(h=>h.bid.by===o).length>=2 && br>.55 && Math.random()<.7) say(v,'liarHabit'); else if(Math.random()<.6) say(v,'liar'); return {k:'liar'}; }
  }
  if(!best) return {k:'liar'};
  if(best.q>=Math.ceil(total*.5) && Math.random()<.35) say(v,'big');
  return {k:'bid', q:best.q, f:best.f};
}

/* 화면 */
const PIP=['','⚀','⚁','⚂','⚃','⚄','⚅'];
let selQ=1, selF=0, sig='';
function render(el,v,ctx){
  const me=ctx.me, others=v.n.map((_,q)=>q).filter(q=>q!==me), o=others[0], who=i=> i===me&&ctx.mode!=='local' ? '나' : U.esc(ctx.name(i));
  const total=TOT(v);
  const subj=i=> who(i)==='나' ? '내가' : who(i)+'이(가)', pos=i=> who(i)==='나' ? '내' : who(i)+'의';
  const sg=v.round+':'+v.bids.length+':'+v.phase;
  if(sg!==sig){ sig=sg; selF=0; selQ = v.bid ? v.bid.q : Math.max(1,Math.round(total/4)); }
  const R=v.reveal || (v.phase==='over' && v.hist.length ? Object.assign({}, v.hist[v.hist.length-1], {dice:v.dice}) : null);
  const die=(d,hi)=>`<span class="ld-d ${hi?'hi':''}">${d}</span>`;
  const match=f=>d=> d===f || (f!==1 && d===1);
  const cup=(i)=>{
    if(R && R.dice && R.dice[i]){ const f=R.bid.f; return R.dice[i].map(d=>die(d, match(f)(d))).join(''); }
    if(v.dice[i]) return v.dice[i].map(d=>die(d, v.bid && match(v.bid.f)(d))).join('');
    return `<span class="ld-cup">🥤</span>`+'<span class="ld-d back">?</span>'.repeat(v.n[i]);
  };
  let h=`<div class="info">${v.round}판 · 남은 주사위 <b>${who(me)} ${v.n[me]}</b> : ${others.map(q=>`<b>${who(q)} ${v.n[q]}</b>`).join(' · ')} · 전체 ${total}개</div>`;
  for(const q of others) h+=`<div class="ld-row ${v.n[q]<=0?'out':''} ${v.turn===q?'turn':''}"><small>${v.turn===q?'👉 ':''}${who(q)}${v.n[q]<=0?' 💀':''}</small><div class="ld-dice">${v.n[q]>0||R?cup(q):''}</div></div>`;
  // 가운데: 지금 부른 것
  if(R){ const b=R.bid; h+=`<div class="ld-bid reveal"><div>${who(R.caller)}: "거짓말!"</div><div><b>${PIP[b.f]} ${b.f}</b>이(가) <b>${b.q}</b>개 이상? → 실제 <b>${R.cnt}</b>개</div><div class="${R.loser===me?'bad':'good'}">${R.ok?'진짜였어요!':'뻥이었어요!'} ${pos(R.loser)} 주사위 −1</div></div>`; }
  else if(v.bid){ h+=`<div class="ld-bid"><small>${pos(v.bid.by)} 부름</small><div><b>${PIP[v.bid.f]} ${v.bid.f}</b>이(가) <b>${v.bid.q}</b>개 이상!</div></div>`; }
  else h+=`<div class="ld-bid"><small>${subj(v.turn)} 먼저 불러요</small></div>`;
  h+=`<div class="ld-row"><div class="ld-dice">${cup(me)}</div><small>${who(me)} (내 컵 안)</small></div>`;
  if(ctx.myTurn && v.phase==='bid'){
    const minQ=f=> !v.bid ? 1 : f>v.bid.f ? v.bid.q : v.bid.q+1;
    if(selF && selQ<minQ(selF)) selQ=minQ(selF);
    const okBid = selF && selQ<=total && higher({q:selQ,f:selF}, v.bid);
    const mineCnt = selF ? countFace(v.dice[me], selF) : null;
    h+=`<div class="ld-ctrl"><div class="fh-act">${[1,2,3,4,5,6].map(f=>`<button class="ld-f ${selF===f?'on':''}" data-f="${f}">${PIP[f]}<small>${f}</small></button>`).join('')}</div>
      <div class="fh-act"><button class="ghost small" data-a="qm">−</button><span class="ld-q"><b>${selQ}</b>개 이상</span><button class="ghost small" data-a="qp">+</button>
      <button data-a="bid" ${okBid?'':'disabled'}>${selF?`${PIP[selF]} ${selF}이(가) ${selQ}개!`:'눈을 고르세요'}</button>
      ${v.bid?'<button class="ld-liar" data-a="liar">🤥 거짓말!</button>':''}</div>
      ${selF?`<small class="muted">내 컵에 ${selF}${selF!==1?'(+만능 1)':''}: ${mineCnt}개 · 다른 컵 ${total-v.n[me]}개는 모름</small>`:''}</div>`;
  }
  if(v.bids.length) h+=`<div class="ld-log">${v.bids.map(b=>`<span class="p${b.by===me?'m':'o'}">${who(b.by)} ${PIP[b.f]}×${b.q}</span>`).join(' → ')}</div>`;
  if(v.hist.length) h+=`<div class="ld-hist">${v.hist.map(x=>`<span class="${x.loser===me?'l':'w'}">${x.round}판 ${PIP[x.bid.f]}×${x.bid.q} ${x.ok?'진짜':'뻥'}</span>`).join('')}</div>`;
  el.innerHTML=h;
  el.onclick=e=>{
    const fb=e.target.closest('[data-f]'); if(fb){ selF=+fb.dataset.f; const m=!v.bid?1:selF>v.bid.f?v.bid.q:v.bid.q+1; if(selQ<m) selQ=m; ctx.rerender(); return; }
    const b=e.target.closest('[data-a]'); if(!b||b.disabled) return;
    if(b.dataset.a==='qm'){ selQ=Math.max(1,selQ-1); ctx.rerender(); }
    else if(b.dataset.a==='qp'){ selQ=Math.min(total,selQ+1); ctx.rerender(); }
    else if(b.dataset.a==='bid') ctx.act({k:'bid',q:selQ,f:selF});
    else if(b.dataset.a==='liar') ctx.act({k:'liar'});
  };
}
function status(v,ctx){
  if(v.phase==='reveal') return '컵 공개! 다음 판 준비 중…';
  if(!ctx.myTurn) return ctx.turnText(v);
  return v.bid ? '더 높게 부르거나, 못 믿겠으면 "거짓말!"' : '먼저 불러요: 눈과 개수를 고르세요';
}
const guide=`
<p>각자 <b>주사위 5개</b>를 컵에 숨기고 굴려요(2~6명). 내 주사위만 보면서, 차례로 <b>"다 합쳐서 ○이 △개 이상 있다!"</b>를 점점 올려 불러요.</p>
<ul><li>다음 사람은 <b>개수를 올리거나</b>, 같은 개수면 <b>더 큰 눈</b>으로 불러야 해요. (예: 3×4개 → 5×4개 또는 아무 눈×5개)</li>
<li>못 믿겠으면 <b>🤥 거짓말!</b> → 둘 다 컵을 열어 세요.</li>
<li>정말 그만큼 있으면 <b>거짓말을 외친 사람</b>이, 모자라면 <b>부른 사람</b>이 주사위 1개를 잃어요.</li>
<li><b>1은 만능</b>: 어떤 눈으로도 세요. (단 1을 부르면 1만 셈)</li>
<li>주사위를 다 잃으면 탈락 — 마지막까지 남은 사람이 승리. 진 사람이 다음 판을 먼저 불러요.</li></ul>
<div class="tipbox">💡 <b>팁</b><br>
· 상대 주사위 하나에 특정 눈(만능 1 포함)이 있을 확률은 약 1/3. 상대 주사위 5개면 평균 1~2개쯤 있어요.<br>
· 내가 많이 가진 눈을 부르면 안전하지만, 상대도 그걸 눈치채요. 가끔은 없는 눈으로 뻥!<br>
· 🧠 컴퓨터는 내가 지금까지 <b>뻥을 얼마나 쳤는지 기억</b>해요. 자주 뻥치면 잘 안 믿어요.</div>`;
window.GAMES.liar = {
  title:'거짓말 주사위', ref:'라이어스 다이스', emoji:'🎲', tags:['심리전','블러핑','확률'],
  maxH:6, pulse:v=>v.n.length===2?v.n[1]-v.n[0]:0, pulseStep:1,
  tagline:'컵 속 주사위를 숨기고 "3이 4개 이상!" 올려 부르기. 못 믿겠으면 거짓말!',
  guide, init, apply, mask, ai, render, status, step, stepDelay,
  aiDelay:()=>1600+Math.random()*2200,
  reset(){ selQ=1; selF=0; sig=''; saidR=-1; },
  bar:(v,i)=>`<span class="score">${v.n[i]}</span><span class="tag">🎲</span>`,
  result:(v,ctx)=>v.n.length>2?`남은 주사위 ${v.n[ctx.me]}${v.winner===ctx.me?' · 마지막 생존!':''}`:`남은 주사위 ${v.n[ctx.me]} : ${v.n[1-ctx.me]}`,
};
})();
