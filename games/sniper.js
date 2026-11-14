(function(){
'use strict';
/* 저격 홀덤 (1:1). 숫자 1~10 카드 4벌(40장). 칩 30개씩, 판마다 참가비 1.
   개인 카드 2장(나만) → 공유 카드 2장 → 1차 베팅 → 공유 카드 2장 더 → 2차 베팅
   → 🎯 저격: 선부터 상대 족보를 "가장 높은 숫자 + 족보"로 하나 선언(안 해도 됨). 맞히면 그 족보는 최하위!
   → 개인 카드 공개, 높은 족보가 판돈. 족보: 포카드 > 풀하우스 > 스트레이트 > 트리플 > 투페어 > 원페어 > 하이카드.
   동점: 족보 숫자 → 개인 카드 높은 것 → 나머지 개인 카드. 상대 칩이 0이 되거나 12판 뒤 칩이 많은 쪽 승리. */
const START=30, HANDS=12, RCAP=2;
const CAT=['하이카드','원페어','투페어','트리플','스트레이트','풀하우스','포카드'];
function best(cards){   // 6장 중 최고 족보 {cat, top}
  const c={}; for(const x of cards) c[x]=(c[x]||0)+1;
  const vals=Object.keys(c).map(Number).sort((a,b)=>b-a);
  const by=n=>vals.filter(v=>c[v]>=n);
  if(by(4).length) return {cat:6, top:by(4)[0]};
  const t=by(3); if(t.length){ const pr=vals.filter(v=>v!==t[0]&&c[v]>=2); if(pr.length) return {cat:5, top:t[0]}; }
  for(let hi=10;hi>=5;hi--){ let ok=true; for(let k=0;k<5;k++) if(!c[hi-k]){ ok=false; break; } if(ok) return {cat:4, top:hi}; }
  if(t.length) return {cat:3, top:t[0]};
  const p=by(2); if(p.length>=2) return {cat:2, top:p[0], sub:p[1]};
  if(p.length) return {cat:1, top:p[0]};
  return {cat:0, top:vals[0]};
}
function cmp(a,b){   // a, b: {h, priv} → 양수면 a 승
  if(a.sniped&&b.sniped) return 0; if(a.sniped) return -1; if(b.sniped) return 1;
  if(a.h.cat!==b.h.cat) return a.h.cat-b.h.cat; if(a.h.top!==b.h.top) return a.h.top-b.h.top;
  if((a.h.sub||0)!==(b.h.sub||0)) return (a.h.sub||0)-(b.h.sub||0);
  const pa=a.priv.slice().sort((x,y)=>y-x), pb=b.priv.slice().sort((x,y)=>y-x);
  if(pa[0]!==pb[0]) return pa[0]-pb[0]; return pa[1]-pb[1];
}
function newDeck(){ const d=[]; for(let n=1;n<=10;n++) for(let k=0;k<4;k++) d.push(n); return U.shuffle(d); }
function init(starter){ const s={chips:[START,START], hand:0, starter, turn:null, winner:null, log:[], pot:0}; newHand(s); return s; }
function newHand(s){
  s.hand++; if(s.hand>HANDS||s.chips.some(c=>c<1)) return endGame(s);
  s.deck=newDeck(); s.priv=[[s.deck.pop(),s.deck.pop()],[s.deck.pop(),s.deck.pop()]]; s.comm=[s.deck.pop(),s.deck.pop()];
  s.chips[0]--; s.chips[1]--; s.pot=2; s.aggr=[0,0]; s.snipe=[null,null]; s.sniped=[false,false]; s.result=null; s.folded=null; s.first=(s.starter+s.hand-1)%2;
  s.log.push(`— ${s.hand}번째 판 —`); startBet(s,1);
}
function startBet(s,round){ s.phase='bet'; s.round=round; s.bet=[0,0]; s.acted=[false,false]; s.raises=0; s.turn=s.first; s.aggr=s.aggr||[0,0];
  if(s.chips[0]===0||s.chips[1]===0) endRound(s); }
function endRound(s){ if(s.round===1){ s.comm.push(s.deck.pop(),s.deck.pop()); s.log.push(`🃏 공유 카드 2장 추가: ${s.comm.slice(2).join(', ')}`); startBet(s,2); return; }
  s.phase='snipe'; s.turn=s.first; s.snipeIdx=0; }
const maxBet=s=>Math.min(s.chips[0]+s.bet[0], s.chips[1]+s.bet[1]);   // 한 번에 거는 양은 칩이 적은 사람 기준
function act(s,p,kind,x){
  const o=1-p, need=s.bet[o]-s.bet[p];
  if(kind==='fold'){ s.folded=p; s.log.push(`${p?'B':'A'} 다이`); return finishHand(s,o); }
  if(kind==='call'){ const pay=Math.min(need,s.chips[p]); s.chips[p]-=pay; s.bet[p]+=pay; s.pot+=pay; s.log.push(`${p?'B':'A'} ${need?`콜 (+${pay})`:'체크'}`); }
  if(kind==='bet'){ const room=maxBet(s)-s.bet[p]; const amt=Math.max(need+1,Math.min(room, need+Math.max(1,x|0))); const pay=Math.min(amt,s.chips[p]); s.chips[p]-=pay; s.bet[p]+=pay; s.pot+=pay; if(need) s.raises++; s.aggr[p]++; s.acted[o]=false;
    s.log.push(`${p?'B':'A'} ${need?'레이즈':'베팅'} → 이번 라운드 ${s.bet[p]}`); }
  s.acted[p]=true; s.last={p,kind};
  if(s.bet[0]===s.bet[1] && (s.acted[0]&&s.acted[1] || s.chips[o]===0 || s.chips[p]===0&&s.acted[o])) return endRound(s);
  s.turn=o;
}
function finishHand(s,w){
  const H=[0,1].map(p=>({h:best(s.priv[p].concat(s.comm)), priv:s.priv[p], sniped:s.sniped[p]}));
  if(w==null){ const c=cmp(H[0],H[1]); w = c>0?0 : c<0?1 : null; }
  if(w==null){ const h=Math.floor(s.pot/2); s.chips[0]+=h; s.chips[1]+=h; s.chips[s.first]+=s.pot-2*h; } else s.chips[w]+=s.pot;
  s.pot=0; s.result={w, H:H.map(x=>({cat:x.h.cat, top:x.h.top, sniped:x.sniped}))}; s.phase='settle'; s.turn=null;
  s.log.push(w==null?'🤝 무승부 — 판돈을 나눠요':`${w?'B':'A'} 승리${s.folded!=null?' (상대 다이)':` · ${s.sniped[w]?'':H[w].h.top+' '+CAT[H[w].h.cat]}`}`);
}
function endGame(s){ s.phase='over'; s.turn=null; s.winner = s.chips[0]>s.chips[1]?0 : s.chips[1]>s.chips[0]?1 : 'draw'; }
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(!a) return '알 수 없는 동작';
  if(s.turn!==p) return '상대 차례예요';
  if(s.phase==='snipe'){
    if(a.k!=='snipe') return '저격을 하거나 넘기세요';
    const o=1-p;
    if(a.cat!=null){ const cat=a.cat|0, top=a.top|0; if(!(cat>=0&&cat<=6)||!(top>=1&&top<=10)) return '족보와 숫자를 고르세요';
      s.snipe[p]={cat,top}; const h=best(s.priv[o].concat(s.comm)); const hit = h.cat===cat && h.top===top; if(hit) s.sniped[o]=true;
      s.log.push(`🎯 ${p?'B':'A'} 저격: "${top} ${CAT[cat]}"`); s.snipeHit=s.snipeHit||[null,null]; s.snipeHit[p]=hit; }
    else { s.snipe[p]={pass:true}; s.log.push(`${p?'B':'A'} 저격 안 함`); }
    s.snipeIdx++; if(s.snipeIdx>=2){ s.phase='show'; s.turn=null; s.reveal=0; } else s.turn=o;
    return null;
  }
  if(s.phase!=='bet') return '지금은 베팅할 때가 아니에요';
  const need=s.bet[1-p]-s.bet[p];
  if(a.k==='fold'){ act(s,p,'fold'); return null; }
  if(a.k==='call'){ act(s,p,'call'); return null; }
  if(a.k==='bet'){ if(s.chips[p]<=need) return '칩이 모자라요'; if(need&&s.raises>=RCAP) return '더 올릴 수 없어요'; if(maxBet(s)-s.bet[p]<=need) return '더 걸 수 없어요 (상대 칩 한도)'; act(s,p,'bet',a.x); return null; }
  return '알 수 없는 동작';
}
function stepDelay(s){ if(s.winner!=null) return null; if(s.phase==='show') return s.reveal<2?1400:1600; if(s.phase==='settle') return 3600; return null; }
function step(s){ if(s.phase==='show'){ if(s.reveal<2){ s.reveal++; return; } s.snipeHit=null; finishHand(s); return; } if(s.phase==='settle'){ newHand(s); } }
function mask(s,p){ const v=U.clone(s), o=1-p;
  const open = s.phase==='show'&&s.reveal>=1 || (s.phase==='settle'&&s.folded==null) || s.phase==='over';
  if(!open) v.priv[o]=[null,null]; v.deck=null;
  if(s.phase==='snipe'||s.phase==='bet') v.snipeHit=null;
  v.sniped = (s.phase==='show'&&s.reveal>=1)||s.phase==='settle'||s.phase==='over' ? s.sniped : [false,false];
  return v; }

/* 컴퓨터: 상대 개인 카드 후보를 베팅으로 가중 → 승률·저격 대상 계산 */
function oppDist(v,me,lvl){
  const seen=v.priv[me].concat(v.comm), rest=[]; const cnt={}; for(const x of seen) cnt[x]=(cnt[x]||0)+1;
  for(let n=1;n<=10;n++) for(let k=0;k<4-(cnt[n]||0);k++) rest.push(n);
  const out=[]; const ag=(v.aggr||[0,0])[1-me];
  for(let i=0;i<rest.length;i++) for(let j=i+1;j<rest.length;j++){ const pr=[rest[i],rest[j]];
    const h=best(pr.concat(v.comm)); let w=1; if(lvl===2) w += ag*h.cat*.35; out.push({pr,h,w}); }
  return out;
}
function winProb(v,me,lvl,N=300){
  if(v.comm.length===4){ const my={h:best(v.priv[me].concat(v.comm)),priv:v.priv[me]}; let w=0,t=0; for(const o of oppDist(v,me,lvl)){ const c=cmp(my,{h:o.h,priv:o.pr}); w+=o.w*(c>0?1:c===0?.5:0); t+=o.w; } return w/t; }
  let w=0; for(let k=0;k<N;k++){ const seen=v.priv[me].concat(v.comm); const deck=[]; const cnt={}; for(const x of seen) cnt[x]=(cnt[x]||0)+1; for(let n=1;n<=10;n++) for(let q=0;q<4-(cnt[n]||0);q++) deck.push(n); U.shuffle(deck);
    const op=[deck.pop(),deck.pop()], cm=v.comm.concat([deck.pop(),deck.pop()]); const c=cmp({h:best(v.priv[me].concat(cm)),priv:v.priv[me]},{h:best(op.concat(cm)),priv:op}); w+= c>0?1:c===0?.5:0; }
  return w/N;
}
function ai(v,lvl=1){
  const me=1;
  if(v.turn!==me) return null;
  if(v.phase==='snipe'){
    const d=oppDist(v,me,lvl); const tally={}; for(const o of d){ const k=o.h.cat+':'+o.h.top; tally[k]=(tally[k]||0)+o.w; }
    let ks=Object.keys(tally).sort((a,b)=>tally[b]-tally[a]); if(lvl===0) ks=U.shuffle(ks.slice(0,12)); else if(lvl===1) ks=Math.random()<.3?U.shuffle(ks.slice(0,3)):ks;
    const [cat,top]=ks[0].split(':').map(Number); return {k:'snipe',cat,top};
  }
  if(v.phase!=='bet') return null;
  const p=Math.max(0,Math.min(1,winProb(v,me,lvl,lvl===0?40:300)+(lvl===0?(Math.random()-.5)*.3:0))), need=v.bet[0]-v.bet[1], r=Math.random(), canUp=v.chips[me]>need&&maxBet(v)-v.bet[me]>need&&(need===0||v.raises<RCAP);
  if(need===0){ if(canUp && (p>[.72,.64,.6][lvl] || r<[0,.06,.1][lvl])) return {k:'bet',x:p>.8?Math.max(3,Math.round(v.pot*.6)):2}; return {k:'call'}; }
  const odds=need/(v.pot+need);
  if(canUp && p>[.88,.8,.75][lvl]) return {k:'bet',x:Math.max(2,Math.round(v.pot*.5))};
  if(lvl===0) return p>.4?{k:'call'}:{k:'fold'};
  if(p>odds+[0,.03,0][lvl]) return {k:'call'};
  return {k:'fold'};
}
function aiDelay(v){ return v.phase==='snipe' ? 2200+Math.random()*1800 : 1300+Math.random()*1800; }

/* 화면 */
let sCat=1, sTop=5, sig='', amt=2;
const card=(x,cls='')=>`<span class="sh-c ${cls}">${x==null?'🂠':x}</span>`;
function render(el,v,ctx){
  const me=ctx.me, o=1-me; const sg=v.hand+':'+v.phase; if(sg!==sig){ sig=sg; }
  const myH=best(v.priv[me].concat(v.comm));
  let h=`<div class="info">${v.hand} / ${HANDS}판 · 판돈 <b>🪙 ${v.pot}</b>${v.phase==='bet'?` · ${v.round}차 베팅`:''}</div>`;
  const oppSn=v.sniped[o], mySn=v.sniped[me];
  h+=`<div class="dp-row"><div class="dp-who">상대${v.snipe[o]&&!v.snipe[o].pass?`<small>🎯 "${v.snipe[o].top} ${CAT[v.snipe[o].cat]}"</small>`:''}</div><div class="dp-dice">${v.priv[o].map(x=>card(x,'opp')).join('')}</div>${v.priv[o][0]!=null&&v.comm.length===4?`<div class="dp-cat ${oppSn?'sniped':''}">${oppSn?'💥 저격당함!':`${best(v.priv[o].concat(v.comm)).top} ${CAT[best(v.priv[o].concat(v.comm)).cat]}`}</div>`:''}</div>`;
  h+=`<div class="sh-comm">${v.comm.map(x=>card(x,'comm')).join('')}${v.comm.length<4?card(null,'comm back')+card(null,'comm back'):''}</div>`;
  h+=`<div class="dp-pot">🪙 ${v.pot}${v.bet?` <small>이번 라운드 · 나 ${v.bet[me]} / 상대 ${v.bet[o]}</small>`:''}</div>`;
  h+=`<div class="dp-row me"><div class="dp-who">나${v.snipe[me]&&!v.snipe[me].pass?`<small>🎯 "${v.snipe[me].top} ${CAT[v.snipe[me].cat]}"</small>`:''}</div><div class="dp-dice">${v.priv[me].map(x=>card(x)).join('')}</div><div class="dp-cat ${mySn?'sniped':''}">${mySn?'💥 저격당함!':`지금 ${myH.top} ${CAT[myH.cat]}`}</div></div>`;
  if(v.result) h+=`<div class="hl-notice">${v.result.w==null?'🤝 무승부':v.result.w===me?'🎉 이번 판은 내가!':'😢 이번 판은 상대가'}</div>`;
  if(v.phase==='bet'&&ctx.myTurn){ const need=v.bet[o]-v.bet[me], room=maxBet(v)-v.bet[me], canR=v.chips[me]>need&&room>need&&(need===0||v.raises<RCAP);
    const sizes=[...new Set([1,2,3,Math.max(1,Math.round(v.pot/2)),room-need])].filter(x=>x>=1&&x<=room-need).sort((a,b)=>a-b);
    h+=`<div class="fh-act"><button class="ghost" data-a="fold">다이</button><button data-a="call">${need?`콜 (+${Math.min(need,v.chips[me])})`:'체크'}</button>${canR?sizes.map(x=>`<button data-a="bet" data-x="${x}">${need?'레이즈':'베팅'} +${x}${x===room-need?' (올인)':''}</button>`).join(''):''}</div>`; }
  if(v.phase==='snipe'&&ctx.myTurn){
    h+=`<div class="vr-card"><b>🎯 상대 족보 저격</b><p>상대 족보를 "가장 높은 숫자 + 족보"로 맞히면 상대는 최하위! (풀하우스는 트리플 숫자, 투페어는 높은 페어 숫자)</p>
      <div class="fh-act"><select data-sc>${CAT.map((c,k)=>`<option value="${k}" ${k===sCat?'selected':''}>${c}</option>`).join('')}</select><select data-st>${[...Array(10)].map((_,k)=>`<option value="${k+1}" ${k+1===sTop?'selected':''}>${k+1}</option>`).join('')}</select><button data-a="snipe">"${sTop} ${CAT[sCat]}" 저격!</button><button class="ghost" data-a="pass">안 함</button></div></div>`; }
  h+=`<div class="info">칩 · 나 <b>${v.chips[me]}</b> : 상대 <b>${v.chips[o]}</b></div>`;
  h+=`<details class="hl-log" open><summary>기록 · 족보: ${CAT.slice().reverse().join(' > ')}</summary>${v.log.slice(-10).reverse().map(x=>`<div>${x.replace(/\bA\b/g,me===0?'나':'상대').replace(/\bB\b/g,me===1?'나':'상대')}</div>`).join('')}</details>`;
  el.innerHTML=h;
  el.onchange=e=>{ if(e.target.matches('[data-sc]')) sCat=+e.target.value; if(e.target.matches('[data-st]')) sTop=+e.target.value; ctx.rerender(); };
  el.onclick=e=>{ const a=e.target.closest('[data-a]'); if(!a) return; const k=a.dataset.a;
    if(k==='fold'||k==='call') return ctx.act({k}); if(k==='bet') return ctx.act({k:'bet',x:+a.dataset.x});
    if(k==='snipe') return ctx.act({k:'snipe',cat:sCat,top:sTop}); if(k==='pass') return ctx.act({k:'snipe',cat:null}); };
}
const guide=`
<p><b>1:1 숫자 홀덤 + 저격</b>. 카드는 숫자 1~10 네 벌(40장, 무늬 없음). 칩 ${START}개씩, 판마다 참가비 1.</p>
<ol><li>개인 카드 2장(나만 봄) → 공유 카드 2장 공개 → <b>1차 베팅</b></li>
<li>공유 카드 2장 더 → <b>2차 베팅</b> (한 번에 거는 양은 칩이 적은 사람 칩까지)</li>
<li><b>🎯 저격</b>: 선부터 한 번씩, 상대 족보를 <b>"가장 높은 숫자 + 족보"</b>로 선언(예: "8 스트레이트", "7 투페어", 풀하우스는 트리플 숫자). <b>맞히면 상대 족보는 최하위!</b> 안 해도 돼요.</li>
<li>개인 카드 공개 — 공유 4장 + 개인 2장 중 가장 좋은 족보가 판돈을 가져가요.</li></ol>
<p>족보: 포카드 > 풀하우스 > 스트레이트 > 트리플 > 투페어 > 원페어 > 하이카드. 같으면 족보 숫자 → 내 개인 카드 높은 것 → 나머지. 둘 다 저격당하면 무승부.</p>
<div class="tipbox">💡 <b>팁</b><br>· 공유 카드 4장은 다 보여요. 상대 베팅이 세면 어떤 족보일지 좁혀서 저격!<br>· 너무 세게 베팅하면 족보를 들킬 수 있어요. 어려움 컴퓨터는 베팅으로 내 패를 읽어요.</div>`;
window.GAMES.sniper = {
  title:'저격 홀덤', ref:'데블스 플랜 「저격 홀덤」', emoji:'🎯', tags:['심리전','블러프','두뇌서바이벌','카드'],
  tagline:'공유 카드 4장, 개인 카드 2장. 상대 족보를 정확히 맞히면 최하위로 떨어뜨리는 저격 포커.',
  guide, init, apply, mask, ai, aiDelay, render, step, stepDelay,
  reset(){ sig=''; },
  status:(v,ctx)=> v.phase==='snipe' ? (ctx.myTurn?'상대 족보를 저격하세요':'상대가 저격을 고민 중…') : v.phase==='show' ? '개인 카드 공개 중…' : v.phase==='settle' ? '다음 판 준비 중…' : ctx.turnText(v),
  bar:(v,i)=>`<span class="score">🪙 ${v.chips[i]}</span>`,
};
})();
