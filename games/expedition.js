(function(){
'use strict';
/* 탐험대 원정: 5가지 탐험지 × (투자 카드 3장 + 2~10) = 60장. 손패 8장.
   내 차례: ① 카드 한 장을 내 탐험 줄에 놓기(같은 색끼리 오름차순만, 투자 카드는 숫자보다 먼저) 또는 그 색 버림 더미에 버리기
            ② 카드 한 장 가져오기(더미 맨 위, 또는 버림 더미 맨 위 — 방금 버린 건 안 됨)
   더미가 다 떨어지면 끝. 색마다 (숫자 합 − 20) × (1 + 투자 카드 수), 8장 이상이면 +20. 시작 안 한 탐험은 0점. */
const COL=['🏜️','🌊','🌲','🌋','🏔️'], CNAME=['사막','바다','숲','화산','설산'];
function newDeck(){ const d=[]; let id=0; for(let c=0;c<5;c++){ for(let k=0;k<3;k++) d.push({c,v:0,id:id++}); for(let v=2;v<=10;v++) d.push({c,v,id:id++}); } return U.shuffle(d); }
function init(starter){
  const deck=newDeck(), hand=[[],[]]; for(let i=0;i<8;i++){ hand[0].push(deck.pop()); hand[1].push(deck.pop()); }
  return {deck, hand, exp:[[[],[],[],[],[]],[[],[],[],[],[]]], disc:[[],[],[],[],[]], turn:starter, starter, phase:'play', justDisc:null, last:null, winner:null, ev:0};
}
const topV=pile=> pile.length ? pile[pile.length-1].v : -1;
const canPlay=(exp,card)=> card.v===0 ? exp.every(x=>x.v===0) : card.v>topV(exp);
function colScore(pile){ if(!pile.length) return 0; const sum=pile.reduce((a,x)=>a+x.v,0), w=pile.filter(x=>x.v===0).length; return (sum-20)*(1+w)+(pile.length>=8?20:0); }
const total=(s,p)=>s.exp[p].reduce((a,pile)=>a+colScore(pile),0);
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(s.turn!==p) return '상대 차례예요';
  if(!a) return '알 수 없는 동작';
  const H=s.hand[p];
  if(s.phase==='play'){
    const i=H.findIndex(x=>x.id===a.id); if(i<0) return '손에 없는 카드예요';
    const card=H[i];
    if(a.k==='exp'){ if(!canPlay(s.exp[p][card.c],card)) return card.v===0 ? '투자 카드는 숫자 카드보다 먼저 놓아야 해요' : `${CNAME[card.c]} 줄엔 ${topV(s.exp[p][card.c])}보다 큰 숫자만 놓을 수 있어요`;
      H.splice(i,1); s.exp[p][card.c].push(card); s.justDisc=null; s.last={p,k:'exp',card}; }
    else if(a.k==='disc'){ H.splice(i,1); s.disc[card.c].push(card); s.justDisc=card.c; s.last={p,k:'disc',card}; }
    else return '놓을지 버릴지 고르세요';
    s.phase='draw'; s.ev++; return null;
  }
  if(s.phase==='draw'){
    let card;
    if(a.k==='deck'){ if(!s.deck.length) return '더미가 비었어요'; card=s.deck.pop(); s.last.draw='deck'; }
    else if(a.k==='take'){ const c=a.c|0; if(c<0||c>4||!s.disc[c].length) return '그 버림 더미는 비었어요'; if(c===s.justDisc) return '방금 버린 카드는 다시 못 가져와요'; card=s.disc[c].pop(); s.last.draw=card; }
    else return '카드를 가져오세요';
    H.push(card); s.phase='play'; s.justDisc=null; s.ev++;
    if(!s.deck.length){ const a0=total(s,0), a1=total(s,1); s.winner=a0>a1?0:a1>a0?1:'draw'; s.turn=null; return null; }
    s.turn=1-p; return null;
  }
  return '알 수 없는 동작';
}
function mask(s,p){ const v=U.clone(s); v.deck=s.deck.length; if(s.winner==null) v.hand[1-p]=s.hand[1-p].length; return v; }

/* 컴퓨터 (사람처럼): 이어 붙이기 좋은 카드는 놓고, 새 탐험은 손에 같은 색이 넉넉할 때만 출발.
   버릴 땐 이미 못 쓰는 카드부터, 상대 탐험에 도움 될 카드는 피함(보통·어려움). 버림 더미에 내게 딱 맞는 카드가 있으면 집어 옴. */
let saidEv=-1;
function say(v,list,pr){ if(typeof showSay==='function' && saidEv!==v.ev && Math.random()<pr){ saidEv=v.ev; setTimeout(()=>showSay(1,U.pick(list),2800),250); } }
function potential(v,me,c,extra){   // 이 색 탐험을 (계속)하면 기대 점수 대략
  const pile=v.exp[me][c], hand=v.hand[me].filter(x=>x.c===c && canPlayAfter(pile,x)).concat(extra?[extra]:[]);
  const sum=pile.reduce((a,x)=>a+x.v,0)+hand.reduce((a,x)=>a+x.v,0), w=pile.filter(x=>x.v===0).length+hand.filter(x=>x.v===0).length;
  return (sum-20)*(1+w);
}
const canPlayAfter=(pile,x)=> x.v===0 ? pile.every(y=>y.v===0) : x.v>topV(pile);
function ai(v,lvl=1){
  if(v.turn!==1||v.winner!=null) return null;
  const me=1, op=0, H=v.hand[me], deckLeft=v.deck;
  if(v.phase==='play'){
    let best=null, bs=-1e9;
    for(const x of H){
      const pile=v.exp[me][x.c];
      // 놓기
      if(canPlay(pile,x)){
        let sc;
        if(pile.length){ const gap = x.v===0 ? 0 : x.v-Math.max(1,topV(pile)); sc = 12 - gap*2.2; }
        else { const pot=potential(v,me,x.c,null); sc = (pot - (x.v===0?6:0)) * .6 - (deckLeft<10 ? 15 : 0) - (x.v===0 && deckLeft<20 ? 10:0);
               // 같은 색 중 가장 작은 걸로 출발
               const smaller=H.some(y=>y.c===x.c && y.id!==x.id && (x.v===0 ? false : (y.v===0 || y.v<x.v))); if(smaller) sc-=20; }
        sc += Math.random()*[8,5,.5][lvl];
        if(sc>bs){ bs=sc; best={k:'exp',id:x.id}; }
      }
      // 버리기
      let ds = -2;
      if(!canPlayAfter(pile,x)) ds += 8;                                  // 이미 못 쓰는 카드
      else if(!pile.length && potential(v,me,x.c,null)<0) ds += 4;        // 시작 안 할 색
      const opPile=v.exp[op][x.c];
      if(lvl>0 && opPile.length && canPlayAfter(opPile,x)) ds -= 6 + x.v*.4; // 상대에게 먹이 주기 싫음
      ds -= x.v*.15;
      ds += Math.random()*[6,3.5,.4][lvl];
      if(ds>bs){ bs=ds; best={k:'disc',id:x.id}; }
    }
    if(best.k==='exp'){ const x=H.find(y=>y.id===best.id); if(!v.exp[me][x.c].length) say(v,[`${CNAME[x.c]} 탐험 출발합니다! ${COL[x.c]}`,'가 볼까요~'],.5); }
    return best;
  }
  // 가져오기
  let take=null, ts=0;
  for(let c=0;c<5;c++){ const pile=v.disc[c]; if(!pile.length||c===v.justDisc) continue; const x=pile[pile.length-1], mine=v.exp[me][c];
    let sc=-1;
    if(mine.length && canPlayAfter(mine,x)) sc = 8 - (x.v===0?0:(x.v-Math.max(1,topV(mine))))*1.5;
    else if(!mine.length && potential(v,me,c,x)>10) sc = 3;
    // 상대가 노리는 카드 뺏기 (어려움)
    if(lvl===2 && v.exp[op][c].length && canPlayAfter(v.exp[op][c],x) && x.v-Math.max(1,topV(v.exp[op][c]))<=2) sc+=3;
    if(sc>ts){ ts=sc; take=c; } }
  // 앞서는데 더미가 적으면 빨리 끝내려고 더미에서
  if(take!=null && !(lvl===2 && deckLeft<6 && total(v,1)>total(v,0) && ts<6)){ if(v.last&&v.last.p===0&&v.last.k==='disc'&&v.last.card.c===take) say(v,['오 고마워요~ 😏','이거 제가 가져갈게요!'],.6); return {k:'take', c:take}; }
  return {k:'deck'};
}

/* 화면 */
let sel=null, lastEv=-1;
const cardHTML=(x,cls='')=> x ? `<span class="ex-c col${x.c} ${x.v===0?'w':''} ${cls}">${x.v===0?'🤝':x.v}</span>` : '';
function render(el,v,ctx){
  const me=ctx.me, o=1-me, who=i=> i===me&&ctx.mode!=='local' ? '나' : U.esc(ctx.name(i));
  if(v.ev!==lastEv){ lastEv=v.ev; sel=null; }
  const myTurn=ctx.myTurn && v.winner==null;
  const H=Array.isArray(v.hand[me]) ? v.hand[me].slice().sort((a,b)=>a.c-b.c||a.v-b.v) : [];
  const col=(pile,rev)=>{ const a=pile.map(x=>cardHTML(x)); return `<div class="ex-pile ${rev?'rev':''}">${(rev?a.reverse():a).join('')||'<span class="ex-empty">·</span>'}</div>`; };
  let h=`<div class="info">남은 더미 <b>${v.deck}</b>장 · 점수 ${who(me)} <b>${total(v,me)}</b> : ${who(o)} <b>${total(v,o)}</b></div>`;
  h+=`<div class="ex-board">`;
  for(let c=0;c<5;c++){
    const d=v.disc[c], top=d[d.length-1];
    const canTake = myTurn && v.phase==='draw' && d.length && c!==v.justDisc;
    h+=`<div class="ex-col">
      <small>${colScore(v.exp[o][c])||''}</small>${col(v.exp[o][c],true)}
      <button class="ex-disc col${c} ${canTake?'can':''}" data-take="${c}" ${canTake?'':'disabled'}>${top?cardHTML(top):COL[c]}<small>${d.length?d.length+'장':CNAME[c]}</small></button>
      ${col(v.exp[me][c],false)}<small><b>${colScore(v.exp[me][c])||''}</b></small></div>`;
  }
  h+=`</div>`;
  const L=v.last; if(L) h+=`<div class="ex-last">${who(L.p)}: ${COL[L.card.c]}${L.card.v||'🤝'} ${L.k==='exp'?'탐험에 놓음':'버림'}${L.draw?` · ${L.draw==='deck'?'더미에서 가져옴':`버림 더미에서 ${COL[L.draw.c]}${L.draw.v||'🤝'} 가져옴`}`:''}</div>`;
  h+=`<div class="ex-hand">${H.map(x=>cardHTML(x, sel===x.id?'sel':'').replace('<span','<button data-id="'+x.id+'"').replace('</span>','</button>')).join('')}</div>`;
  if(myTurn){
    if(v.phase==='play'){
      const x=H.find(y=>y.id===sel);
      h+= x ? `<div class="fh-act"><button data-a="exp" ${canPlay(v.exp[me][x.c],x)?'':'disabled'}>⛺ 탐험에 놓기</button><button class="ghost" data-a="disc">🗑️ 버리기</button></div>` : `<div class="fh-act"><small class="muted">놓거나 버릴 카드를 고르세요</small></div>`;
    } else h+=`<div class="fh-act"><button data-a="deck" ${v.deck?'':'disabled'}>🂠 더미에서 가져오기 (${v.deck})</button><small class="muted">또는 가운데 버림 더미를 누르기</small></div>`;
  }
  el.innerHTML=h;
  el.onclick=e=>{
    const t=e.target.closest('[data-take]'); if(t&&!t.disabled){ ctx.act({k:'take',c:+t.dataset.take}); return; }
    const c=e.target.closest('[data-id]'); if(c){ if(!myTurn||v.phase!=='play') return; sel = sel===+c.dataset.id ? null : +c.dataset.id; ctx.rerender(); return; }
    const b=e.target.closest('[data-a]'); if(!b||b.disabled) return;
    if(b.dataset.a==='deck') ctx.act({k:'deck'}); else if(sel!=null) ctx.act({k:b.dataset.a, id:sel});
  };
}
function status(v,ctx){
  if(v.winner!=null) return '';
  if(!ctx.myTurn) return ctx.turnText(v);
  return v.phase==='play' ? '카드 한 장: 탐험에 놓기 또는 버리기' : '카드 한 장 가져오기 (더미 또는 버림 더미)';
}
const guide=`
<p>다섯 탐험지(🏜️🌊🌲🌋🏔️) 카드로 내 탐험 줄을 쌓아 점수를 내요. 카드는 색마다 <b>2~10</b>과 <b>🤝 투자 카드 3장</b>.</p>
<ul><li>내 차례: ① 손에서 한 장을 <b>내 탐험 줄</b>에 놓거나(같은 색, <b>앞보다 큰 숫자만</b>) 가운데 <b>버림 더미</b>에 버리기 → ② 한 장 가져오기(뒷면 더미, 또는 버림 더미 맨 위. 방금 버린 건 안 돼요).</li>
<li>🤝 투자 카드는 그 색에 <b>숫자 카드를 놓기 전에만</b> 놓을 수 있어요. 한 장마다 그 색 점수 ×2, ×3, ×4.</li>
<li>점수(색마다): (숫자 합 − 20) × (1 + 투자 수). 8장 이상이면 +20. <b>시작 안 한 색은 0점</b> — 시작하면 −20부터라 함부로 출발하면 손해!</li>
<li>뒷면 더미가 다 떨어지면 끝. 점수 높은 쪽 승리.</li></ul>
<div class="tipbox">💡 <b>팁</b><br>
· 낮은 숫자부터 차근차근. 큰 숫자를 먼저 놓으면 그 아래 카드는 다 못 써요.<br>
· 버린 카드는 상대가 집어 갈 수 있어요. 상대가 하고 있는 색은 함부로 버리지 마세요.<br>
· 더미가 줄어들면 새 탐험은 시작하지 마세요. 앞서고 있다면 더미에서 계속 가져와 빨리 끝내는 것도 방법.</div>`;
window.GAMES.expedition = {
  title:'탐험대 원정', ref:'로스트 시티', emoji:'⛺', tags:['전략','카드','클래식'],
  pulse:v=>total(v,1)-total(v,0), pulseStep:15,
  tagline:'다섯 탐험지에 오름차순으로 카드를 쌓는 2인 카드 게임. 시작하면 −20점부터!',
  guide, init, apply, mask, ai, render, status,
  aiDelay:()=>1200+Math.random()*1500,
  reset(){ sel=null; lastEv=-1; saidEv=-1; },
  bar:(v,i)=>`<span class="score">${total(v,i)}</span><span class="tag">점</span>`,
  result:(v,ctx)=>`${total(v,ctx.me)} : ${total(v,1-ctx.me)}`,
};
})();
