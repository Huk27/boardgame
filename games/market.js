(function(){
'use strict';
/* 향신료 시장: 상품 6종 + 낙타. 가운데 시장 5장. 손패 최대 7장(낙타는 손패가 아니라 무리에 따로).
   내 차례 하나: ① 상품 1장 가져오기 ② 낙타 전부 가져오기 ③ 바꾸기(시장 상품 여러 장 ↔ 같은 수의 내 카드/낙타) ④ 팔기(한 종류 여러 장).
   팔면 그 상품 토큰을 위에서부터 받음(먼저 팔수록 비쌈). 3·4·5장 이상 한꺼번에 팔면 보너스. 다이아·금·은은 2장 이상만 팔 수 있음.
   상품 토큰이 3종류 바닥나거나 시장을 채울 카드가 없으면 끝. 낙타 많은 쪽 +5. 돈 많은 쪽 승리. */
const G=[{e:'💎',n:'다이아',c:6,t:[7,7,5,5,5]},{e:'🥇',n:'금',c:6,t:[6,6,5,5,5]},{e:'🥈',n:'은',c:6,t:[5,5,5,5,5]},
         {e:'🧵',n:'비단',c:8,t:[5,3,3,2,2,1,1]},{e:'🌶️',n:'향신료',c:8,t:[5,3,3,2,2,1,1]},{e:'👜',n:'가죽',c:10,t:[4,3,2,1,1,1,1,1,1]}];
const CAMEL=6, PRECIOUS=[0,1,2];
const bonusFor=n=> n>=5 ? 8+(Math.random()*3|0) : n===4 ? 4+(Math.random()*3|0) : n===3 ? 1+(Math.random()*3|0) : 0;
function init(starter){
  const d=[]; G.forEach((g,i)=>{ for(let k=0;k<g.c;k++) d.push(i); }); for(let k=0;k<8;k++) d.push(CAMEL); U.shuffle(d);
  const market=[CAMEL,CAMEL,CAMEL, d.pop(), d.pop()];
  const hand=[[],[]], herd=[0,0];
  for(const p of [0,1]) for(let k=0;k<5;k++){ const c=d.pop(); if(c===CAMEL) herd[p]++; else hand[p].push(c); }
  return {deck:d, market, hand, herd, tokens:G.map(g=>g.t.slice()), money:[0,0], sold:[[0,0,0,0,0,0],[0,0,0,0,0,0]], turn:starter, starter, last:null, winner:null, ev:0, bonus:[[],[]]};
}
function refill(s){ while(s.market.length<5){ if(!s.deck.length) return false; s.market.push(s.deck.pop()); } return true; }
function endCheck(s,ok){
  const empty=s.tokens.filter(t=>!t.length).length;
  if(empty>=3 || !ok){
    const cb = s.herd[0]>s.herd[1]?0 : s.herd[1]>s.herd[0]?1 : -1; if(cb>=0) s.money[cb]+=5;
    s.camelBonus=cb; const a=s.money[0], b=s.money[1];
    s.winner = a>b?0 : b>a?1 : 'draw'; s.turn=null; return true;
  }
  return false;
}
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(s.turn!==p) return '상대 차례예요';
  if(!a) return '알 수 없는 동작';
  const H=s.hand[p], M=s.market; let ok=true;
  if(a.k==='take'){
    const i=a.i|0; if(!(i>=0&&i<M.length)) return '시장 카드를 고르세요'; if(M[i]===CAMEL) return '낙타는 "낙타 모두 가져오기"로'; if(H.length>=7) return '손패가 7장이라 더 못 가져와요';
    H.push(M.splice(i,1)[0]); ok=refill(s); s.last={p,k:'take',g:H[H.length-1]};
  } else if(a.k==='camels'){
    const n=M.filter(x=>x===CAMEL).length; if(!n) return '시장에 낙타가 없어요';
    s.market=M.filter(x=>x!==CAMEL); s.herd[p]+=n; ok=refill(s); s.last={p,k:'camels',n};
  } else if(a.k==='swap'){
    const take=[...new Set((a.take||[]).map(x=>x|0))], give=(a.give||[]).map(x=>x|0), gc=a.camels|0;
    if(take.length<2) return '바꾸기는 시장 카드 2장 이상';
    if(take.some(i=>!(i>=0&&i<M.length)||M[i]===CAMEL)) return '낙타는 바꿔 올 수 없어요';
    const gset=[...new Set(give)]; if(gset.length!==give.length||gset.some(i=>!(i>=0&&i<H.length))) return '줄 카드를 다시 고르세요';
    if(gc<0||gc>s.herd[p]) return '낙타가 모자라요';
    if(give.length+gc!==take.length) return `가져올 ${take.length}장만큼 내 카드/낙타를 내야 해요`;
    const tk=take.map(i=>M[i]), gv=give.map(i=>H[i]);
    if(tk.some(x=>gv.includes(x))) return '같은 종류를 주고받을 순 없어요';
    if(H.length-give.length+take.length>7) return '손패가 7장을 넘어요';
    take.sort((x,y)=>y-x).forEach(i=>M.splice(i,1)); gset.sort((x,y)=>y-x).forEach(i=>H.splice(i,1));
    H.push(...tk); M.push(...gv); for(let k=0;k<gc;k++) M.push(CAMEL); s.herd[p]-=gc;
    s.last={p,k:'swap',tk,gv,gc};
  } else if(a.k==='sell'){
    const g=a.g|0, n=H.filter(x=>x===g).length; if(!n) return '그 상품이 없어요';
    const cnt=Math.min(n, a.n ? a.n|0 : n); if(cnt<1) return '팔 장수를 고르세요';
    if(PRECIOUS.includes(g) && cnt<2) return `${G[g].n}은(는) 2장 이상 팔아야 해요`;
    let gain=0; for(let k=0;k<cnt;k++){ const tk=s.tokens[g].shift(); if(tk!=null) gain+=tk; }
    const b=bonusFor(cnt); gain+=b; if(b) s.bonus[p].push(b);
    let left=cnt; for(let i=H.length-1;i>=0&&left;i--) if(H[i]===g){ H.splice(i,1); left--; }
    s.money[p]+=gain; s.sold[p][g]+=cnt; s.last={p,k:'sell',g,cnt,gain,bonus:b};
  } else return '알 수 없는 동작';
  s.ev++;
  if(endCheck(s,ok)) return null;
  s.turn=1-p; return null;
}
function mask(s,p){ const v=U.clone(s); v.deck=s.deck.length; if(s.winner==null){ v.hand[1-p]=s.hand[1-p].length; v.bonus[1-p]=s.bonus[1-p].map(()=>'?'); } return v; }

/* 컴퓨터 (사람처럼): 지금 팔면 얼마인지 / 이 상품을 모으면 얼마가 될지 어림해서 고름.
   비싼 상품(다이아·금·은)은 2장 모이면 토큰이 남아 있을 때 빨리 팔고, 싼 상품은 4~5장 모아 보너스를 노림.
   낙타는 바꾸기 밑천으로 모으고, 시장에 낙타가 많이 깔리면 상대에게 좋은 카드를 열어 주는지도 따짐(어려움). */
let saidEv=-1;
function say(v,list,pr){ if(typeof showSay==='function' && saidEv!==v.ev && Math.random()<pr){ saidEv=v.ev; setTimeout(()=>showSay(1,U.pick(list),2800),250); } }
const topVal=(v,g,k)=> v.tokens[g].slice(0,k).reduce((a,b)=>a+b,0);
function ai(v,lvl=1){
  if(v.turn!==1||v.winner!=null) return null;
  const me=1, H=v.hand[me], M=v.market, cnt=g=>H.filter(x=>x===g).length;
  const opts=[];
  // 팔기
  for(let g=0;g<6;g++){ const n=cnt(g); if(!n) continue; if(PRECIOUS.includes(g)&&n<2) continue;
    const left=v.tokens[g].length; const gain=topVal(v,g,n)+(n>=5?9:n===4?5:n===3?2:0);
    let urg = PRECIOUS.includes(g) ? 6 : (n>=4?6:n===3?1:-6);
    if(left<=n+1) urg+=4;                          // 토큰이 곧 바닥
    if(H.length>=6) urg+=3;                        // 손이 꽉 참
    opts.push({a:{k:'sell',g}, sc:gain*.9+urg}); }
  // 상품 1장
  if(H.length<7) M.forEach((g,i)=>{ if(g===CAMEL) return; const n=cnt(g), worth=(v.tokens[g][n]||0)+(n===2||n===3?2:0)+(PRECIOUS.includes(g)?2:0); opts.push({a:{k:'take',i}, sc:worth*.8 + (n>=1?1.5:0)}); });
  // 낙타
  const camels=M.filter(x=>x===CAMEL).length; if(camels) opts.push({a:{k:'camels'}, sc: camels*1.4 + (v.herd[me]<v.herd[0]?1.5:0) - (lvl===2 ? Math.min(3,v.deck)*.6 : 0)});
  // 바꾸기: 시장의 좋은 상품 2~3장 ↔ 내 낙타/쓸모없는 카드
  if(lvl>0){ const goods=M.map((g,i)=>({g,i})).filter(x=>x.g!==CAMEL).sort((x,y)=>(v.tokens[y.g][0]||0)-(v.tokens[x.g][0]||0));
    for(const k of [2,3]){ if(goods.length<k) continue; const take=goods.slice(0,k), tkTypes=take.map(x=>x.g);
      const junk=H.map((g,i)=>({g,i})).filter(x=>!tkTypes.includes(x.g) && cnt(x.g)===1 && !PRECIOUS.includes(x.g)).slice(0,k);
      const useCamels=Math.min(v.herd[me], k-junk.length); if(junk.length+useCamels<k) continue;
      if(H.length-junk.length+k>7) continue;
      const gain=take.reduce((a,x)=>a+(v.tokens[x.g][cnt(x.g)]||0),0) - junk.reduce((a,x)=>a+(v.tokens[x.g][0]||0)*.4,0) - useCamels*.8;
      opts.push({a:{k:'swap', take:take.map(x=>x.i), give:junk.map(x=>x.i), camels:useCamels}, sc:gain*.6}); } }
  for(const o of opts) o.sc+=Math.random()*[6,1.5,.5][lvl];
  opts.sort((x,y)=>y.sc-x.sc);
  // 보통: 가끔(25%) 괜찮아 보이는 것 중 아무거나 (사람처럼 덜 따짐)
  const best=(lvl===1 && opts.length>1 && Math.random()<.25) ? U.pick(opts.slice(0,4)) : (opts[0] || {a:{k:'camels'}});
  if(best.a.k==='sell'){ const n=cnt(best.a.g); if(n>=4) say(v,[`${G[best.a.g].e} 한꺼번에 팝니다!`,'보너스 챙겨야지~'],.6); else if(PRECIOUS.includes(best.a.g)) say(v,['비쌀 때 팔아야죠 💰','이건 먼저 팔게요'],.4); }
  else if(best.a.k==='camels') say(v,['낙타 다 데려갈게요 🐪','낙타 부자~'],.3);
  return best.a;
}

/* 화면 */
let selM=[], selH=[], giveCamels=0, lastEv=-1;
const card=(g,cls='')=> g===CAMEL ? `<span class="mk-c camel ${cls}">🐪</span>` : `<span class="mk-c g${g} ${cls}">${G[g].e}</span>`;
function render(el,v,ctx){
  const me=ctx.me, o=1-me, who=i=> i===me&&ctx.mode!=='local' ? '나' : U.esc(ctx.name(i));
  if(v.ev!==lastEv){ lastEv=v.ev; selM=[]; selH=[]; giveCamels=0; }
  const myTurn=ctx.myTurn && v.winner==null, H=Array.isArray(v.hand[me])?v.hand[me]:[];
  let h=`<div class="info">💰 ${who(me)} <b>${v.money[me]}</b> : ${who(o)} <b>${v.money[o]}</b> · 🐪 ${v.herd[me]} : ${v.herd[o]} · 더미 ${v.deck}장 · 상대 손 ${Array.isArray(v.hand[o])?v.hand[o].length:v.hand[o]}장</div>`;
  h+=`<div class="mk-tokens">${G.map((g,i)=>`<span class="${v.tokens[i].length?'':'gone'}">${g.e} ${v.tokens[i].length?v.tokens[i].slice(0,3).join('·')+(v.tokens[i].length>3?'…':''):'매진'}</span>`).join('')}</div>`;
  h+=`<div class="mk-row"><small>시장</small><div class="mk-cards">${v.market.map((g,i)=>`<button class="mk-btn ${selM.includes(i)?'sel':''}" data-m="${i}">${card(g)}</button>`).join('')}</div></div>`;
  h+=`<div class="mk-row"><small>내 손 (${H.length}/7)</small><div class="mk-cards">${H.map((g,i)=>`<button class="mk-btn ${selH.includes(i)?'sel':''}" data-h="${i}">${card(g)}</button>`).join('')||'<span class="muted">없음</span>'}</div></div>`;
  if(myTurn){
    const cnt=g=>H.filter(x=>x===g).length, mCam=v.market.filter(x=>x===CAMEL).length;
    const one = selM.length===1 && v.market[selM[0]]!==CAMEL && !selH.length && !giveCamels;
    const sellG = selH.length && selH.every(i=>H[i]===H[selH[0]]) && !selM.length ? H[selH[0]] : null;
    const swapOk = selM.length>=2 && selH.length+giveCamels===selM.length;
    h+=`<div class="fh-act">
      <button data-a="take" ${one&&H.length<7?'':'disabled'}>✋ 1장 가져오기</button>
      <button data-a="camels" ${mCam?'':'disabled'}>🐪 낙타 ${mCam}마리 데려오기</button>
      <button data-a="sell" ${sellG!=null&&!(PRECIOUS.includes(sellG)&&selH.length<2)?'':'disabled'}>💰 ${sellG!=null?G[sellG].e+' '+selH.length+'장 ':''}팔기</button>
      <button data-a="swap" ${swapOk?'':'disabled'}>🔁 바꾸기</button></div>
      <div class="fh-act"><small class="muted">바꾸기: 시장 카드 2장 이상 + 같은 수만큼 내 카드/낙타</small><span class="stepper"><button data-a="cm">−</button><b>🐪${giveCamels}</b><button data-a="cp">+</button></span></div>`;
  }
  const L=v.last; if(L) h+=`<div class="mk-last">${who(L.p)}: ${L.k==='take'?`${G[L.g].e} 가져감`:L.k==='camels'?`🐪 ${L.n}마리 데려감`:L.k==='swap'?`${L.tk.map(g=>G[g].e).join('')} ↔ ${L.gv.map(g=>G[g].e).join('')}${'🐪'.repeat(L.gc)}`:`${G[L.g].e} ${L.cnt}장 팔아서 +${L.gain}${L.bonus?` (보너스 ${L.bonus})`:''}`}</div>`;
  if(v.winner!=null && v.camelBonus!=null) h+=`<div class="mk-last">🐪 낙타 보너스 +5 → ${v.camelBonus<0?'같아서 없음':who(v.camelBonus)}</div>`;
  el.innerHTML=h;
  el.onclick=e=>{
    const m=e.target.closest('[data-m]'), hh=e.target.closest('[data-h]'), b=e.target.closest('[data-a]');
    if(!myTurn) return;
    if(m){ const i=+m.dataset.m; selM = selM.includes(i)?selM.filter(x=>x!==i):selM.concat(i); ctx.rerender(); return; }
    if(hh){ const i=+hh.dataset.h; selH = selH.includes(i)?selH.filter(x=>x!==i):selH.concat(i); ctx.rerender(); return; }
    if(!b||b.disabled) return; const k=b.dataset.a;
    if(k==='cm'){ giveCamels=Math.max(0,giveCamels-1); ctx.rerender(); }
    else if(k==='cp'){ giveCamels=Math.min(v.herd[me],giveCamels+1); ctx.rerender(); }
    else if(k==='take') ctx.act({k:'take', i:selM[0]});
    else if(k==='camels') ctx.act({k:'camels'});
    else if(k==='sell') ctx.act({k:'sell', g:H[selH[0]], n:selH.length});
    else if(k==='swap') ctx.act({k:'swap', take:selM, give:selH, camels:giveCamels});
  };
}
function status(v,ctx){ if(v.winner!=null) return ''; return ctx.myTurn ? '가져오기·낙타·팔기·바꾸기 중 하나 (카드를 눌러 고르세요)' : ctx.turnText(v); }
const guide=`
<p>시장에서 상품을 모아 팔아 돈을 버는 2인 상인 게임. 상품: 💎다이아 🥇금 🥈은 🧵비단 🌶️향신료 👜가죽, 그리고 🐪낙타.</p>
<ul><li>내 차례에 하나만:
<ul><li>✋ <b>1장 가져오기</b>: 시장 상품 1장 (손패 최대 7장)</li>
<li>🐪 <b>낙타 데려오기</b>: 시장 낙타 전부 (낙타는 손패에 안 셈)</li>
<li>🔁 <b>바꾸기</b>: 시장 상품 2장 이상 ↔ 같은 수의 내 카드·낙타 (같은 종류끼리는 안 돼요)</li>
<li>💰 <b>팔기</b>: 한 종류를 원하는 만큼. 그 상품 토큰을 위에서부터 받아요 — <b>먼저 팔수록 비싸요</b>. 💎🥇🥈는 2장 이상만.</li></ul></li>
<li>한 번에 3장 팔면 보너스 1~3, 4장 4~6, 5장 이상 8~10.</li>
<li>시장이 빈 자리는 더미에서 채워요. 상품 토큰 3종류가 매진되거나 더미가 떨어지면 끝. 낙타가 많은 쪽 +5. 돈 많은 쪽 승리!</li></ul>
<div class="tipbox">💡 <b>팁</b><br>
· 낙타를 데려오면 시장에 새 카드가 깔려요 — 상대에게 좋은 걸 열어 줄 수도!<br>
· 비싼 상품은 상대보다 먼저 팔아야 비싼 토큰을 받아요. 싼 상품은 모아서 보너스.<br>
· 낙타는 바꾸기 밑천이에요. 시장의 좋은 상품 여러 장을 낙타로 한 번에 가져올 수 있어요.</div>`;
window.GAMES.market = {
  title:'향신료 시장', ref:'자이푸르', emoji:'🐪', tags:['전략','카드','경제'],
  pulse:v=>v.money[1]-v.money[0], pulseStep:12,
  tagline:'시장에서 상품을 모아 먼저 비싸게 팔아라! 2인 상인 카드 게임.',
  guide, init, apply, mask, ai, render, status,
  aiDelay:()=>1200+Math.random()*1500,
  reset(){ selM=[]; selH=[]; giveCamels=0; lastEv=-1; saidEv=-1; },
  bar:(v,i)=>`<span class="score">💰 ${v.money[i]}</span><span class="tag">🐪 ${v.herd[i]}</span>`,
  result:(v,ctx)=>`💰 ${v.money[ctx.me]} : ${v.money[1-ctx.me]}`,
};
})();
