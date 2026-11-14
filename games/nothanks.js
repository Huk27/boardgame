(function(){
'use strict';
/* 칩으로 떠넘기기: 3~35 카드 중 9장은 몰래 빼고 24장. 한 장씩 공개 → 차례인 사람은
   ① 가져가기(카드 위에 쌓인 칩도 함께) → 같은 사람이 다음 카드를 다시 정함
   ② 칩 1개를 카드 위에 얹고 넘기기 (칩이 없으면 꼭 가져가야 함)
   점수 = 가진 카드 합(연속된 숫자는 가장 작은 수만) − 남은 칩. 낮은 쪽 승리. 칩 개수는 서로 비밀. */
const LOW=3, HIGH=35, OUT=9, CHIPS=11;
/* 👥 2~6명 (2026-11-12 사용자: "최대한 멀티 많이") — 자리 = 사람 수(동물 없음). 6명이면 칩 9개 */
function init(starter,o){ const k=Math.max(2,Math.min(6,(o&&o.humans)||2));
  const d=[]; for(let n=LOW;n<=HIGH;n++) d.push(n); U.shuffle(d);
  const deck=d.slice(OUT), c0=k>=6?9:CHIPS;
  return {deck, card:deck.pop(), pot:0, chips:Array(k).fill(c0), cards:[...Array(k)].map(()=>[]), turn:(starter|0)%k, starter, log:[], winner:null, ev:0, hs:[...Array(k).keys()]};
}
const NP=s=>s.cards.length;
function runSum(cs){ const a=[...cs].sort((x,y)=>x-y); let s=0; for(let i=0;i<a.length;i++) if(i===0||a[i]!==a[i-1]+1) s+=a[i]; return s; }
const score=(s,p)=>runSum(s.cards[p])-s.chips[p];
const runs=cs=>{ const a=[...cs].sort((x,y)=>x-y), out=[]; for(const n of a){ const L=out[out.length-1]; if(L&&n===L[L.length-1]+1) L.push(n); else out.push([n]); } return out; };
function finish(s){ const sc=s.cards.map((_,p)=>score(s,p)), mn=Math.min(...sc), W=sc.map((x,p)=>x===mn?p:-1).filter(x=>x>=0);
  if(NP(s)>2){ s.winners=W; s.winner=W.length===1?W[0]:'draw'; } else { const a=sc[0], b=sc[1]; s.winner=a<b?0:b<a?1:'draw'; } s.turn=null; s.card=null; }
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(s.turn!==p) return '상대 차례예요';
  if(!a) return '알 수 없는 동작';
  if(a.k==='pass'){
    if(s.chips[p]<=0) return '칩이 없어서 가져가야 해요';
    s.chips[p]--; s.pot++; s.log.push({p,k:'pass',card:s.card}); s.turn=(p+1)%NP(s); s.ev++; return null;
  }
  if(a.k==='take'){
    s.cards[p].push(s.card); s.chips[p]+=s.pot; s.log.push({p,k:'take',card:s.card,pot:s.pot}); s.pot=0; s.ev++;
    if(s.log.length>40) s.log.shift();
    if(!s.deck.length){ finish(s); return null; }
    s.card=s.deck.pop(); return null;   // 가져간 사람이 다음 카드도 정함
  }
  return '알 수 없는 동작';
}
function mask(s,p){
  const v=U.clone(s); v.deck=s.deck.length;   // 남은 카드 순서·빠진 9장은 비밀
  if(s.winner==null) v.chips=v.chips.map((c,q)=>q===p?c:null);        // 남의 칩 개수도 비밀
  return v;
}

/* 컴퓨터: 이 카드를 가져가면 내 점수가 얼마나 늘지(연속이면 거의 0) − 쌓인 칩 으로 판단.
   칩이 적으면 더 쉽게 가져감. 어려움은 "나한테만 좋은 카드"면 일부러 넘겨서 칩을 더 불림(상대가 안 가져갈 때만). */
const delta=(cs,c)=>runSum([...cs,c])-runSum(cs);
let saidEv=-1;
function say(v,list,p){ if(typeof showSay==='function' && saidEv!==v.ev && Math.random()<p){ saidEv=v.ev; setTimeout(()=>showSay(1,U.pick(list),2800),250); } }
function ai(v,lvl=1){
  if(v.turn!==1||v.winner!=null) return null;
  const c=v.card, mine=v.cards[1], his=v.cards[0], chips=v.chips[1];
  if(chips<=0){ say(v,['칩이 없어요 ㅠ','어쩔 수 없지…'],.6); return {k:'take'}; }
  const myCost=delta(mine,c)-v.pot, hisCost=delta(his,c)-v.pot;
  const left=v.deck;
  let th=[9,7,10][lvl] + (chips<=3?7:chips<=6?3:0) - (left>16?1:0);
  if(lvl===0) th+= (Math.random()-.5)*12;
  // 욕심: 나한테 좋은 카드(연속)이고 상대는 안 가져갈 카드면 칩을 더 모음
  if(lvl>=1 && delta(mine,c)<=2 && hisCost>(lvl===2?8:12) && v.pot<(lvl===2?7:4) && chips>2){
    say(v,['패스~ ㅎㅎ','음~ 한 바퀴만 더','흐흐 넘길게요'],.35); return {k:'pass'};
  }
  // 상대 연속에 붙는 카드면 칩이 쌓이기 전에 가져가 버림 (어려움)
  if(lvl===2 && delta(his,c)<=2 && myCost<=th+6 && v.pot>=1) { say(v,['이건 못 드리죠','제가 가져갈게요~'],.4); return {k:'take'}; }
  if(myCost<=th){ if(v.pot>=5) say(v,['칩 고마워요~ 😆','잘 먹겠습니다!'],.6); return {k:'take'}; }
  say(v,['패스','노 땡스~','저는 됐어요'],.2);
  return {k:'pass'};
}

/* 화면 */
let lastEv=-1;
function render(el,v,ctx){
  const me=ctx.me, others=v.cards.map((_,q)=>q).filter(q=>q!==me), who=i=> i===me&&ctx.mode!=='local' ? '나' : U.esc(ctx.name(i));
  const fresh=v.ev!==lastEv; lastEv=v.ev;
  const runHTML=cs=> cs.length ? runs(cs).map(r=>`<span class="nt-run">${r.map((n,i)=>`<b class="${i?'free':''}">${n}</b>`).join('')}</span>`).join('') : '<span class="muted">아직 없음</span>';
  let h=`<div class="info">남은 카드 <b>${v.deck}</b>장 (+몰래 뺀 9장) · 점수는 낮을수록 좋아요</div>`;
  for(const o of others) h+=`<div class="nt-row ${v.turn===o?'turn':''}"><small>${v.turn===o?'👉 ':''}${who(o)} · 칩 ${v.chips[o]==null?'🤫 ?':v.chips[o]} · 점수 ${v.winner!=null?score(v,o):runSum(v.cards[o])+(v.chips[o]==null?' − ?':'')}</small><div class="nt-cards">${runHTML(v.cards[o])}</div></div>`;
  if(v.card!=null){
    const L=v.log[v.log.length-1];
    h+=`<div class="nt-center"><div class="nt-card ${fresh?'pop':''}">${v.card}</div><div class="nt-pot">${v.pot?`🪙 × ${v.pot}`:'칩 없음'}</div></div>`;
    if(L) h+=`<div class="nt-last">${who(L.p)} ${L.k==='take'?`→ ${L.card} 가져감${L.pot?` (칩 ${L.pot}개와 함께)`:''}`:`→ ${L.card}에 칩 얹고 패스`}</div>`;
  }
  h+=`<div class="nt-row"><div class="nt-cards">${runHTML(v.cards[me])}</div><small>${who(me)} · 칩 <b>${v.chips[me]}</b> · 점수 <b>${score(v,me)}</b>${v.card!=null&&v.winner==null?` · 이 카드를 가져가면 ${delta(v.cards[me],v.card)-v.pot>=0?'+':''}${delta(v.cards[me],v.card)-v.pot}`:''}</small></div>`;
  if(ctx.myTurn && v.winner==null){
    h+=`<div class="fh-act"><button data-a="take">✋ 가져가기${v.pot?` (+칩 ${v.pot})`:''}</button><button class="ghost" data-a="pass" ${v.chips[me]>0?'':'disabled'}>🪙 칩 1개 얹고 넘기기</button></div>`;
  }
  el.innerHTML=h;
  el.onclick=e=>{ const b=e.target.closest('[data-a]'); if(b&&!b.disabled) ctx.act({k:b.dataset.a}); };
}
function status(v,ctx){
  if(v.winner!=null) return '';
  if(!ctx.myTurn) return ctx.turnText(v);
  return v.chips[ctx.me]>0 ? `${v.card}: 가져갈까요, 칩을 얹고 넘길까요?` : '칩이 없어서 가져가야 해요';
}
const guide=`
<p>숫자 카드(3~35)가 한 장씩 나와요. 카드는 <b>벌점</b>이라 숫자가 낮을수록 좋아요. 칩을 써서 싫은 카드를 다른 사람에게 떠넘기세요! (2~6명 — 여럿이면 차례는 시계 방향)</p>
<ul><li>내 차례엔 ① <b>가져가기</b>(카드 위에 쌓인 칩도 같이) 또는 ② <b>칩 1개 얹고 넘기기</b>. 칩이 없으면 꼭 가져가야 해요.</li>
<li>가져간 사람이 다음 카드도 이어서 정해요.</li>
<li><b>연속된 숫자는 가장 작은 수만</b> 점수로 쳐요. 예) 21·22·23 → 21점만!</li>
<li>점수 = 가진 카드 합 − 남은 칩. <b>낮은 쪽 승리</b>.</li>
<li>처음에 9장을 몰래 빼 둬서, 연속을 노리던 숫자가 안 나올 수도 있어요. 상대 칩 개수는 비밀이에요.</li></ul>
<div class="tipbox">💡 <b>팁</b><br>
· 내 연속에 붙는 카드는 사실상 공짜! 상대가 안 가져갈 것 같으면 한두 바퀴 넘겨서 칩을 불려 보세요.<br>
· 칩이 바닥나면 아무 카드나 떠안게 돼요. 칩은 아껴 두세요.<br>
· 🧠 컴퓨터(어려움)는 욕심을 부려 칩을 불리기도 하고, 내 연속에 붙는 카드는 먼저 가져가 버려요.</div>`;
window.GAMES.nothanks = {
  title:'칩으로 떠넘기기', ref:'노 땡스!', emoji:'🪙', tags:['심리전','카드','눈치'],
  maxH:6, pulse:v=>v.cards.length===2?runSum(v.cards[0])-runSum(v.cards[1]):0, pulseStep:8,
  tagline:'싫은 카드는 칩을 얹어 떠넘겨라! 연속 숫자는 작은 수만 세는 눈치 게임.',
  guide, init, apply, mask, ai, render, status,
  aiDelay:()=>1100+Math.random()*1600,
  reset(){ lastEv=-1; saidEv=-1; },
  bar:(v,i)=>`<span class="score">${v.chips[i]==null?'🪙 ?':'🪙 '+v.chips[i]}</span><span class="tag">카드 ${v.cards[i].length}장</span>`,
  result:(v,ctx)=>v.cards.length>2?`점수 ${score(v,ctx.me)} · ${v.cards.map((_,q)=>score(v,q)).sort((a,b)=>a-b).indexOf(score(v,ctx.me))+1}위 (낮을수록 승)`:`점수 ${score(v,ctx.me)} : ${score(v,1-ctx.me)} (낮을수록 승)`,
};
})();
