(function(){
'use strict';
/* 이마 카드: 내 카드는 못 보고 상대 카드만 보면서 칩을 거는 블러프 게임. 1~10 두 벌. */
const START=20;
const maxRaise=(s,p)=>{ const o=1-p; return Math.max(0, Math.min(s.chips[p]-(s.bets[o]-s.bets[p]), s.chips[o])); };
function init(starter){
  const deck=[]; for(let k=0;k<2;k++) for(let n=1;n<=10;n++) deck.push(n);
  const s={deck:U.shuffle(deck), chips:[START,START], cards:[null,null], bets:[0,0], carry:0, turn:null, first:starter,
    checked:false, round:0, result:null, seen:[], log:[], act:[null,null], winner:null, starter};
  deal(s,starter); return s;
}
function finish(s){
  const half=Math.floor(s.carry/2); s.chips[0]+=half; s.chips[1]+=half; s.carry=0;
  s.turn=null; s.cards=[null,null]; s.bets=[0,0];
  s.winner = s.chips[0]>s.chips[1]?0 : s.chips[1]>s.chips[0]?1 : 'draw';
}
function deal(s,leader){
  if(s.chips[0]<1||s.chips[1]<1||s.deck.length<2){ finish(s); return; }
  s.cards=[s.deck.pop(),s.deck.pop()];
  s.chips[0]--; s.chips[1]--; s.bets=[1,1];
  s.turn=leader; s.first=leader; s.checked=false; s.round++; s.act=[null,null];
}
function settle(s,w,how,folder){
  const pot=s.bets[0]+s.bets[1]+s.carry;
  const res={cards:s.cards.slice(), how, folder, w, pot, penalty:0, round:s.round};
  s.seen.push(...s.cards);
  s.log.push({cards:s.cards.slice(), act:(s.act||[null,null]).slice()}); if(s.log.length>12) s.log.shift();
  if(w===-1) s.carry=pot; else { s.chips[w]+=pot; s.carry=0; }
  if(how==='fold' && s.cards[folder]===10){ const pen=Math.min(10,s.chips[folder]); s.chips[folder]-=pen; s.chips[1-folder]+=pen; res.penalty=pen; }
  s.bets=[0,0]; s.result=res;
  deal(s, w===-1 ? 1-s.first : 1-w);   // 진 사람이 다음 판 먼저
}
const showdown=s=>{ const [a,b]=s.cards; settle(s, a>b?0:b>a?1:-1, 'show', null); };
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(s.turn!==p) return '상대 차례예요';
  if(!a) return '알 수 없는 동작';
  const o=1-p;
  if(!s.act) s.act=[null,null];
  if(a.k==='fold'){ settle(s,o,'fold',p); return null; }
  if(a.k==='check'){
    if(s.bets[0]!==s.bets[1]) return '상대가 더 걸었어요. 콜·레이즈·다이 중에 고르세요';
    if(s.act[p]!=='raise') s.act[p]='pass';
    if(p===s.first && !s.checked){ s.checked=true; s.turn=o; return null; }
    showdown(s); return null;
  }
  if(a.k==='call'){
    const need=s.bets[o]-s.bets[p];
    if(need<=0) return '더 낼 칩이 없어요 (체크)';
    if(need>s.chips[p]) return '칩이 모자라요';
    if(s.act[p]!=='raise') s.act[p]='pass';
    s.chips[p]-=need; s.bets[p]+=need; showdown(s); return null;
  }
  if(a.k==='raise'){
    const x=a.x|0, m=maxRaise(s,p);
    if(m<1) return '더 올릴 수 없어요';
    if(x<1||x>m) return `1~${m}개까지 올릴 수 있어요`;
    s.act[p]='raise';
    const target=s.bets[o]+x; s.chips[p]-=target-s.bets[p]; s.bets[p]=target; s.turn=o; return null;
  }
  return '알 수 없는 동작';
}
function mask(s,p){
  const v=U.clone(s);
  if(s.winner==null) v.cards[p]=null;
  v.deck=s.deck.length;
  return v;
}

let rx=1, C=null;
function render(el,v,ctx){
  C=ctx;
  const me=ctx.me, o=1-me, myTurn=ctx.myTurn, m=maxRaise(v,me);
  rx=Math.max(1,Math.min(rx,m||1));
  let h=`<div class="info">${v.round}번째 판 · 남은 카드 <b>${v.deck}</b>장${v.carry?` · 이월 <b>${v.carry}</b>개`:''}</div>`;
  if(v.result){
    const r=v.result, who=i=>i===me?'나':'상대';
    let t = r.how==='fold' ? `${who(r.folder)} 다이 → ${who(r.w)} ${r.pot}개 획득${r.penalty?` · 10 들고 다이 벌칙 ${r.penalty}개`:''}`
          : r.w===-1 ? `비김 → ${r.pot}개 다음 판으로` : `${who(r.w)} 승리 → ${r.pot}개 획득`;
    h+=`<div class="banner">지난 판: 나 <b>${r.cards[me]}</b> vs 상대 <b>${r.cards[o]}</b> · ${t}</div>`;
  }
  if(v.winner==null){
    h+=`<div class="fh-table">
      <div class="slot">${U.esc(ctx.name(o))}의 카드<div class="c10">${v.cards[o]}</div></div>
      <div class="slot">내 카드 (안 보임)<div class="c10 back">?</div></div></div>`;
    h+=`<div class="bets"><span>상대 베팅 <b>${v.bets[o]}</b></span><span>내 베팅 <b>${v.bets[me]}</b></span><span>판돈 <b>${v.bets[0]+v.bets[1]+v.carry}</b></span></div>`;
    if(myTurn){
      const need=v.bets[o]-v.bets[me];
      const mid = need>0 ? `<button data-a="call">콜 (+${need})</button>` : `<button data-a="check">${me===v.first&&!v.checked?'체크':'체크 (공개)'}</button>`;
      h+=`<div class="fh-act"><button class="ghost" data-a="fold">다이</button>${mid}
        <span class="stepper"><button data-a="minus">−</button><b>${rx}</b><button data-a="plus">+</button></span>
        <button data-a="raise" ${m<1?'disabled':''}>레이즈 +${rx}</button></div>`;
    }
  }
  const cnt=Array(11).fill(2); for(const c of v.seen) cnt[c]--;
  if(v.winner==null && v.cards[o]) cnt[v.cards[o]]--;
  h+=`<div class="info">아직 안 보인 카드 (내 카드 후보)</div><div class="seen">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<div class="${cnt[n]<=0?'gone':''}"><b>${n}</b>×${Math.max(0,cnt[n])}</div>`).join('')}</div>`;
  el.innerHTML=h;
  react(v,ctx);
  el.onclick=e=>{
    const b=e.target.closest('[data-a]'); if(!b||b.disabled) return;
    const a=b.dataset.a;
    if(a==='minus'){ rx=Math.max(1,rx-1); ctx.rerender(); }
    else if(a==='plus'){ rx=Math.min(Math.max(1,m),rx+1); ctx.rerender(); }
    else if(a==='raise') ctx.act({k:'raise',x:rx});
    else ctx.act({k:a});
  };
}
function status(v,ctx){
  if(!ctx.myTurn) return ctx.turnText(v);
  const need=v.bets[1-ctx.me]-v.bets[ctx.me];
  return need>0 ? `상대가 ${need}개 더 걸었어요` : '체크하거나 칩을 더 거세요';
}
/* 컴퓨터
   - 남은 카드로 내 카드가 이길 확률을 계산 (쉬움은 여기까지)
   - 보통·어려움: 상대 베팅도 읽음. 상대는 내 카드를 보고 있으니, 상대가 레이즈하면 "내 카드가 낮나?" 하고 짐작.
     판이 끝나 카드가 공개될 때마다 "내 카드가 몇일 때 상대가 레이즈했는지" 배워서 블러프쟁이인지 정직한지 알아냄 */
const bucket=n=> n<=3?0 : n<=7?1 : 2;
function raiseRate(v,lvl){   // 상대(0번)가 내 카드(낮음·중간·높음)를 보고 레이즈하는 비율
  const prior=[.6,.35,.15], r=[0,0,0], n=[0,0,0];
  if(lvl===2 || lvl===1) for(const L of v.log||[]){ if(!L.act||L.act[0]==null) continue; const b=bucket(L.cards[1]); n[b]++; if(L.act[0]==='raise') r[b]++; }
  const k = lvl===2 ? 1 : .5;
  return prior.map((p,i)=> (p*2 + k*r[i]) / (2 + k*n[i]));
}
function ai(v,lvl=1){
  const opc=v.cards[0], cnt=Array(11).fill(2);
  for(const c of v.seen) cnt[c]--; cnt[opc]--;
  const act0=(v.act||[])[0];
  const R = lvl>0 ? raiseRate(v,lvl) : null;
  let tot=0, win=0;
  for(let n=1;n<=10;n++){ let k=Math.max(0,cnt[n]); if(!k) continue;
    if(R && act0==='raise') k*=R[bucket(n)]; else if(R && act0==='pass') k*=1-R[bucket(n)];
    tot+=k; if(n>opc) win+=k; else if(n===opc) win+=k*.5; }
  const pw=win/Math.max(1e-9,tot), facing=v.bets[0]-v.bets[1], m=maxRaise(v,1);
  const bluff=[.12,.12,.16][lvl];
  if(facing>0){
    if(pw>.72 && m>0 && Math.random()<.5) return {k:'raise',x:Math.min(m,1+(Math.random()*3|0))};
    if(pw>.45 || (facing<=2 && pw>.3)) return {k:'call'};
    return {k:'fold'};
  }
  if(pw>.6 && m>0) return {k:'raise',x:Math.min(m,1+(Math.random()*(pw>.8?5:2)|0))};
  if(Math.random()<bluff && m>0) return {k:'raise',x:1+(lvl===2&&Math.random()<.4?1:0)};
  return {k:'check'};
}
/* 표정 연기 (혼자 모드): 판이 시작되면 컴퓨터가 내 이마 카드를 보고 반응. 쉬움은 대체로 정직, 어려움은 연기가 섞임 */
let reactRound=-1;
function react(v,ctx){
  if(ctx.mode!=='solo' || v.winner!=null || v.round===reactRound || typeof showSay!=='function' || typeof S==='undefined' || !S || !S.cards) return;
  reactRound=v.round; if(Math.random()<.35) return;
  const lvl = typeof aiLevel==='function' ? aiLevel() : 1;
  const real=S.cards[0]; if(!real) return;
  const honest = Math.random() < [.85,.6,.45][lvl];
  let feel = real>=8 ? 'high' : real<=3 ? 'low' : 'mid';
  if(!honest) feel = U.pick(['high','low','mid'].filter(x=>x!==feel));
  const L={high:['헉…','오… 이건 좀','😳','음… 저 다이할까요'], low:['ㅋㅋ','흐흐~','오 좋은데요? 😏','이번 판 재밌겠다~'], mid:['음…','흠, 애매하네','🤔','글쎄요~']}[feel];
  setTimeout(()=>showSay(1,U.pick(L),3000),600+Math.random()*900);
}
const guide=`
<p>각자 카드를 한 장씩 받는데, <b>내 카드는 나만 못 보고 상대 카드만 보여요.</b> 상대 카드와 상대의 베팅을 보고 내 카드가 더 높을지 짐작해서 칩을 거는 게임이에요.</p>
<h3>준비</h3>
<ul><li>카드는 1~10 두 벌(20장). 칩은 각자 ${START}개.</li>
<li>판마다 둘 다 1개씩 기본으로 걸고 시작해요.</li></ul>
<h3>내 차례에 할 수 있는 것</h3>
<ul><li><b>체크</b>: 더 걸지 않고 넘기기. 둘 다 체크하면 카드 공개.</li>
<li><b>레이즈</b>: 상대보다 칩을 더 걸기. −/+로 개수를 정해요.</li>
<li><b>콜</b>: 상대가 더 건 만큼 맞추고 카드 공개.</li>
<li><b>다이</b>: 포기. 지금까지 건 칩을 상대가 가져가요.</li></ul>
<h3>결과</h3>
<ul><li>공개했을 때 큰 수가 판돈을 다 가져가요. 같으면 판돈은 다음 판으로 이월.</li>
<li>⚠️ <b>10을 들고 다이하면 벌칙으로 칩 10개</b>를 상대에게 줘요.</li>
<li>진 사람이 다음 판에 먼저 해요.</li>
<li>칩이 바닥나거나 카드를 다 쓰면 끝. 칩이 많은 사람이 승리.</li></ul>
<div class="tipbox">💡 <b>팁</b><br>
· 상대 카드가 2나 3이면 내가 이길 확률이 높아요. 크게 걸어보세요.<br>
· 상대가 크게 걸면, 상대 눈에 보이는 내 카드가 낮다는 뜻일 수도 있어요.<br>
· 아래 '아직 안 보인 카드'가 내 카드 후보예요. 큰 수가 많이 나갔으면 조심!<br>
· 🎭 컴퓨터는 내 카드를 보고 반응해요("헉…", "ㅋㅋ"). 쉬움은 꽤 정직하고, 어려움은 연기도 해요.<br>
· 🧠 컴퓨터(보통·어려움)는 카드가 공개될 때마다 <b>내가 블러프를 치는지</b> 배워요.</div>`;
window.GAMES.forehead = {
  title:'인디언 포커', emoji:'🃏', tags:['심리전','블러프','카드'], pulse:v=>v.chips[1]-v.chips[0], pulseStep:3, tagline:'내 카드만 안 보인다. 상대 카드와 눈치로 칩을 거는 블러프 게임.',
  guide, init, apply, mask, ai, render, status,
  reset(){ rx=1; reactRound=-1; },
  bar:(v,i)=>`<span class="score">🪙 ${v.chips[i]}</span>${v.winner==null?`<span class="tag">베팅 ${v.bets[i]}</span>`:''}`,
  result:(v,ctx)=>`칩 ${v.chips[ctx.me]} : ${v.chips[1-ctx.me]}`,
};
})();
