(function(){
'use strict';
/* 숫자 경매: 칩 15개로 시작, 10판. 매 판 숫자 카드(−6~+10) 한 장 공개 → 둘이 동시에 칩을 몰래 검.
   + 카드: 더 많이 건 사람이 가져가고 건 칩을 냄. − 카드: 더 적게 건 사람이 떠안음(건 칩은 둘 다 냄 — 피하려면 대가가 필요).
   같으면 카드는 버리고 칩은 돌려받음. 끝나면 (카드 합 + 남은 칩) 높은 쪽 승. */
const ROUNDS=10, CHIPS=15;
function deck(){ const pool=[-6,-5,-4,-3,-2,-1,1,2,3,4,5,6,7,8,9,10]; return U.shuffle(pool).slice(0,ROUNDS); }
/* 👥 2~6명 (2026-11-12) — 자리 = 사람 수. +카드: 가장 많이 건 한 명(동점이면 버림), −카드: 가장 적게 건 한 명이 떠안고 모두 칩을 냄(동점이면 버림) */
function init(starter,o){ const k=Math.max(2,Math.min(6,(o&&o.humans)||2)); return {hs:[...Array(k).keys()], cards:deck(), r:0, chips:Array(k).fill(CHIPS), got:[...Array(k)].map(()=>[]), bid:Array(k).fill(null), phase:'bid', cd:0, res:null, hist:[], turn:null, starter, winner:null}; }
const total=(s,p)=>s.got[p].reduce((a,b)=>a+b,0)+s.chips[p];
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(!a||a.k!=='bid') return '알 수 없는 동작';
  if(s.phase!=='bid') return '지금은 걸 때가 아니에요';
  if(s.bid[p]!=null) return '이미 걸었어요';
  const b=a.n|0; if(b<0||b>s.chips[p]) return `0~${s.chips[p]}개까지 걸 수 있어요`;
  s.bid[p]=b;
  if(s.bid.every(x=>x!=null)){ s.phase='cd'; s.cd=3; }
  return null;
}
function settle(s){
  const c=s.cards[s.r], B=s.bid.slice(); let taker=-1;
  const ext=c>0?Math.max(...B):Math.min(...B), at=B.map((b,q)=>b===ext?q:-1).filter(x=>x>=0);
  if(at.length===1){ taker=at[0];
    if(c>0) s.chips[taker]-=B[taker];
    else B.forEach((b,q)=>{ s.chips[q]-=b; });   // 마이너스는 피하려고 건 칩도 사라짐
    s.got[taker].push(c);
  }
  s.res={card:c, bids:B, taker};
  s.hist.push({card:c, bids:B, taker});
  s.phase='result';
}
const stepDelay=s=> s.winner!=null ? null : s.phase==='cd' ? 700 : s.phase==='result' ? 3000 : null;
function step(s){
  if(s.phase==='cd'){ s.cd--; if(s.cd<=0) settle(s); return; }
  if(s.phase==='result'){
    s.r++; s.bid=s.bid.map(()=>null); s.res=null;
    if(s.r>=ROUNDS){ if(s.chips.length>2){ const T=s.chips.map((_,q)=>total(s,q)), mx=Math.max(...T); s.winners=T.map((x,q)=>x===mx?q:-1).filter(x=>x>=0); s.winner=s.winners.length===1?s.winners[0]:'draw'; } else { const a=total(s,0), b=total(s,1); s.winner=a>b?0:b>a?1:'draw'; } s.phase='over'; return; }
    s.phase='bid';
  }
}
function mask(s,p){
  const v=U.clone(s);
  if(s.phase==='bid'||s.phase==='cd') v.bid=s.bid.map((b,q)=>q===p?b:b!=null?'done':null);
  v.cards = s.cards.map((c,i)=> i<=s.r ? c : null);   // 앞으로 나올 카드는 비밀
  v.left = s.cards.slice(s.r+1).length;
  return v;
}
/* 컴퓨터
   - 쉬움: 카드 값·남은 칩으로 대충 (가끔 블러프)
   - 보통·어려움: 공개된 지난 판들로 상대 버릇을 배움 (+카드엔 카드 값의 몇 배쯤 거는지, −카드는 얼마나 피하려 하는지)
     → 상대가 이번에 걸 칩을 짐작하고, 내 손익(카드 + 남은 칩 차이)이 가장 좋은 금액을 검. 버릇이 뚜렷하면 한마디. */
const LAM=.1;
function habit(v,sign){   // 상대(0번)가 이 부호 카드에 건 비율 = 건 칩 / |카드|
  // 칩이 모자라 어쩔 수 없이 적게 건 판은 버릇에서 뺌 (그때 남아 있던 칩을 처음부터 다시 셈)
  const xs=[]; let ch=CHIPS;
  for(const h of v.hist){ const b=h.bids[0]; if(Math.sign(h.card)===sign && ch>=Math.abs(h.card)) xs.push(b/Math.abs(h.card)); if(h.card>0){ if(h.taker===0) ch-=b; } else if(h.taker!==-1) ch-=b; }
  const prior = sign>0 ? .55 : .45, k=xs.length;
  const mean=(prior*2+xs.reduce((a,b)=>a+b,0))/(2+k);
  const sd = k>=2 ? Math.max(.12, Math.sqrt(xs.reduce((a,b)=>a+(b-mean)**2,0)/k)) : .35;
  return {mean, sd, k};
}
let saidR=-1;
function tease(v,h,sign){
  if(typeof showSay!=='function' || h.k<3 || saidR>=0 && v.r-saidR<4) return;
  let line=null;
  if(sign>0 && h.mean>.85) line=U.pick(['+카드엔 늘 세게 거시네요~','욕심쟁이시네요 ㅎㅎ']);
  else if(sign>0 && h.mean<.3) line=U.pick(['짠돌이시네요? 😏','칩 아끼시는 거 다 보여요~']);
  else if(sign<0 && h.mean<.2) line=U.pick(['마이너스는 그냥 맞으시네요?','−카드는 안 피하시는구나~']);
  if(line && Math.random()<.6){ saidR=v.r; setTimeout(()=>showSay(1,line,3200),300); }
}
function ai(v,lvl=1){
  if(v.phase!=='bid'||v.bid[1]!=null) return null;
  const c=v.cards[v.r], mine=v.chips[1], his=Math.max(...v.chips.filter((_,q)=>q!==1)), left=ROUNDS-v.r;
  if(v.r===0) saidR=-1;
  if(lvl===0){
    const budget = mine/Math.max(1,left)*1.6; let b;
    if(c>0) b = Math.round(Math.min(c*.55, budget) + (Math.random()-.4)*2.2);
    else b = Math.round(Math.min(-c*.45, budget) + (Math.random()-.5)*2);
    if(Math.random()<.08) b = c>0 ? Math.min(mine, c) : 0;
    if(c>0 && his<b) b = Math.min(b, his+1);
    return {k:'bid', n:Math.max(0,Math.min(mine,b))};
  }
  const sign=Math.sign(c), hb=habit(v,sign);
  const mean = lvl===2 ? hb.mean : (hb.mean+(sign>0?.55:.45))/2, sd = lvl===2 ? hb.sd : Math.max(hb.sd,.3);
  // 상대가 걸 칩 h의 분포 (0~상대 칩)
  const P=[]; let tot=0; for(let h=0;h<=his;h++){ const z=(h/Math.abs(c)-mean)/sd; const w=Math.exp(-z*z/2)+.02; P.push(w); tot+=w; } for(let h=0;h<=his;h++) P[h]/=tot;
  // 칩의 값: 끝에 남으면 1점이지만, 판이 많이 남았을수록 나중 카드를 따는 밑천이라 더 귀함
  const L=1+LAM*(left-1);
  let best=0, bs=-1e9;
  for(let b=0;b<=mine;b++){
    let ev=0;
    for(let h=0;h<=his;h++){ const p=P[h]; if(!p) continue;
      if(b===h) continue;   // 같으면 카드 버림·칩 돌려받음
      if(c>0) ev += p*(b>h ? (c-L*b) : -(c-L*h));            // 내가 가져가면 +c−b, 상대가 가져가면 상대가 +c−h
      else ev += p*(L*(h-b) + (b<h ? c : -c));                // 둘 다 칩을 냄, 적게 건 쪽이 c를 떠안음
    }
    // 판이 많이 남았는데 칩을 다 쓰면 나중에 못 싸움 → 살짝 아낌
    ev += Math.random()*(lvl===2?.15:2.2);
    if(ev>bs){ bs=ev; best=b; }
  }
  if(lvl===2 || Math.random()<.5) tease(v,hb,sign);
  return {k:'bid', n:best};
}

/* 화면 */
let n=2, sig='';
function render(el,v,ctx){
  const me=ctx.me, others=v.chips.map((_,q)=>q).filter(q=>q!==me), o=others[0];
  const sg=v.r+':'+v.phase; if(sg!==sig){ sig=sg; n=Math.min(n, v.chips[me]); }
  const who=i=> i===me&&ctx.mode!=='local' ? '나' : U.esc(ctx.name(i));
  const c=v.cards[Math.min(v.r,ROUNDS-1)];
  const card=x=>`<div class="au-card ${x>0?'pos':'neg'}">${x>0?'+':''}${x}</div>`;
  let h=`<div class="info">${Math.min(v.r+1,ROUNDS)} / ${ROUNDS}판 · 남은 카드 ${v.left}장 · 점수 = 가져간 카드 합 + 남은 칩</div>`;
  if(v.phase!=='over'){
    let mid='';
    if(v.phase==='bid') mid = `<div class="au-bids">${others.map(o=>`<span>${who(o)}: ${v.bid[o]==='done'?'✔ 걸었음':'🤔 고민 중'}</span>`).join('')}<span>${who(me)}: ${v.bid[me]!=null?`${v.bid[me]}개 걸었음`:'…'}</span></div>`;
    if(v.phase==='cd') mid = `<div class="au-call">${['','셋!','둘!','하나!'][v.cd]||''}</div>`;
    if(v.phase==='result'){ const r=v.res; mid=`<div class="au-bids big">${others.map(o=>`<span>${who(o)} <b>${r.bids[o]}</b></span>`).join('')}<span>vs</span><span>${who(me)} <b>${r.bids[me]}</b></span></div>
      <div class="banner ${r.taker===me?(r.card>0?'good':'badx'):r.taker>=0?(r.card>0?'badx':'good'):''}">${r.taker<0?'같은 금액! 카드는 버려요':`${r.taker===me&&ctx.mode!=='local'?'내가':who(r.taker)+'이(가)'} ${r.card>0?'+':''}${r.card} 카드를 ${r.card>0?'가져가요 ✨':'떠안아요 😱'}`}</div>`; }
    h+=`<div class="au-stage">${card(c)}<div class="au-rule">${c>0?'많이 건 사람이 가져가요':'적게 건 사람이 떠안아요 (건 칩은 둘 다 사라짐)'}</div>${mid}</div>`;
  }
  if(ctx.can && v.phase==='bid' && v.bid[me]==null){
    h+=`<div class="fh-act"><span>걸 칩</span><span class="stepper"><button data-a="m">−</button><b>${n}</b><button data-a="p">+</button></span><button data-a="go">몰래 걸기</button></div><div class="info">0~${v.chips[me]}개 · 0개도 가능</div>`;
  }
  const row=i=>`<div class="au-got"><b>${who(i)}</b> <span>${v.got[i].map(card).join('')||'<small class="muted">아직 없음</small>'}</span> <small>카드 ${v.got[i].reduce((a,b)=>a+b,0)} + 칩 ${v.chips[i]} = <b>${v.got[i].reduce((a,b)=>a+b,0)+v.chips[i]}</b></small></div>`;
  h+=others.map(row).join('')+row(me);
  el.innerHTML=h;
  el.onclick=e=>{
    const b=e.target.closest('[data-a]'); if(!b) return; const a=b.dataset.a;
    if(a==='m'){ n=Math.max(0,n-1); ctx.rerender(); }
    else if(a==='p'){ n=Math.min(v.chips[me],n+1); ctx.rerender(); }
    else if(a==='go') ctx.act({k:'bid',n});
  };
}
function status(v,ctx){
  const me=ctx.me;
  if(v.phase==='bid') return v.bid[me]==null ? '이 카드에 칩을 몇 개 걸까요?' : '상대가 거는 중…';
  if(v.phase==='cd') return '공개!';
  return '';
}
const guide=`
<p>매 판 <b>숫자 카드</b> 한 장이 나오면, 모두 동시에 <b>칩을 몰래</b> 걸어요(2~6명). 10판 뒤 <b>가져간 카드 합 + 남은 칩</b>이 높은 사람이 승리!</p>
<ul><li>칩은 각자 15개. 카드는 −6 ~ +10 중에서 10장이 나와요.</li>
<li>➕ <b>플러스 카드</b>: <b>가장 많이</b> 건 사람이 가져가고, 건 칩을 내요. (나머지는 칩 그대로)</li>
<li>➖ <b>마이너스 카드</b>: <b>가장 적게</b> 건 사람이 떠안아요. 피하려고 건 칩은 <b>모두</b> 사라져요.</li>
<li>맨 위(또는 맨 아래)가 같은 금액이면 카드는 버리고 칩은 그대로.</li>
<li>"하나! 둘! 셋!"에 둘의 금액이 공개돼요.</li></ul>
<div class="tipbox">💡 <b>팁</b><br>
· 칩도 점수예요. +3 카드에 칩 4개를 쓰면 손해!<br>
· 마이너스 카드에 상대가 0개를 걸 것 같으면 1개만 걸어도 피할 수 있어요. 눈치 싸움!<br>
· 상대 남은 칩을 보세요. 상대가 못 따라올 만큼만 걸면 돼요.<br>
· 🧠 컴퓨터(보통·어려움)는 지난 판에 공개된 내 칩으로 <b>버릇을 배워요</b>(+카드에 얼마나 세게 거는지, −카드를 피하는지). 금액을 섞어 보세요!</div>`;
window.GAMES.auction = {
  title:'숫자 경매', ref:'피의 게임 「숫자 경매」', emoji:'💰', tags:['심리전','두뇌서바이벌','경매'],
  maxH:6, pulse:v=>v.chips.length>2?0:(v.got[1].reduce((a,b)=>a+b,0)+v.chips[1])-(v.got[0].reduce((a,b)=>a+b,0)+v.chips[0]), pulseStep:4,
  tagline:'+카드는 많이 건 사람이 갖고, −카드는 적게 건 사람이 떠안는 칩 눈치 경매.',
  guide, init, apply, mask, ai, render, status, step, stepDelay,
  aiDelay:()=>1300+Math.random()*2200,
  reset(){ n=2; sig=''; saidR=-1; },
  bar:(v,i)=>`<span class="score">${v.got[i].reduce((a,b)=>a+b,0)+v.chips[i]}</span><span class="tag">점 · 칩 ${v.chips[i]}</span>`,
  result:(v,ctx)=>{ const t=i=>v.got[i].reduce((a,b)=>a+b,0)+v.chips[i]; return v.chips.length>2?`${t(ctx.me)}점 · ${v.chips.map((_,q)=>t(q)).filter(x=>x>t(ctx.me)).length+1}위`:`${t(ctx.me)} : ${t(1-ctx.me)}`; },
};
})();
