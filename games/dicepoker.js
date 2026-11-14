(function(){
'use strict';
/* 주사위 포커 (자체 규칙 — 원작은 "심리가 중요한 베팅 게임"이라는 것만 알려져 있어 표준 다이스 포커로 만듦)
   판마다 참가비 1 → 각자 컵 안에서 주사위 5개(나만 봄) → 1차 베팅 → 몰래 다시 굴릴 주사위 선택(몇 개 굴렸는지는 공개)
   → 2차 베팅 → 한 개씩 공개해 족보 비교. 칩 20개, 최대 8판, 칩이 많은 쪽 승리(한쪽이 참가비를 못 내면 끝). */
const START=20, HANDS=8, RCAP=2;
const CAT=['하이','원페어','투페어','트리플','스트레이트','풀하우스','포카드','파이브카드'];
const FACE=['','⚀','⚁','⚂','⚃','⚄','⚅'];
const roll=()=>1+(Math.random()*6|0);
function evalH(d){ const c={}; for(const x of d) c[x]=(c[x]||0)+1; const g=Object.entries(c).map(([v,n])=>[n,+v]).sort((a,b)=>b[0]-a[0]||b[1]-a[1]);
  const sorted=d.slice().sort((a,b)=>a-b), str = g.length===5 && sorted[4]-sorted[0]===4;
  let cat = g[0][0]===5?7 : g[0][0]===4?6 : g[0][0]===3&&g[1][0]===2?5 : str?4 : g[0][0]===3?3 : g[0][0]===2&&g[1][0]===2?2 : g[0][0]===2?1 : 0;
  let key=cat; for(const [n,v] of g) for(let k=0;k<n;k++) key=key*7+v; return {cat,key}; }
function init(starter){ const s={chips:[START,START], hand:0, starter, turn:null, winner:null, log:[], dice:[[],[]], pot:0, phase:'deal', rr:[null,null], rrN:[null,null]}; newHand(s); return s; }
function newHand(s){
  s.hand++; if(s.hand>HANDS || s.chips.some(c=>c<1)){ return endGame(s); }
  s.chips[0]--; s.chips[1]--; s.pot=(s.pot||0)+2; s.dice=[[0,1,2,3,4].map(roll),[0,1,2,3,4].map(roll)]; s.rr=[null,null]; s.rrN=[null,null]; s.reveal=0; s.result=null; s.folded=null;
  s.log.push(`— ${s.hand}번째 판 · 참가비 1개씩 —`); startBet(s,1, (s.starter+s.hand-1)%2);
}
function startBet(s,round,first){ s.phase='bet'; s.round=round; s.bet=[0,0]; s.acted=[false,false]; s.raises=0; s.turn=first;
  if(s.chips[0]===0||s.chips[1]===0) endRound(s); }   // 누가 올인이면 베팅 없이 진행
function endRound(s){ if(s.round===1){ s.phase='reroll'; s.turn=null; } else { s.phase='show'; s.turn=null; s.reveal=0; } }
const toCall=(s,p)=>s.bet[1-p]-s.bet[p];
function act(s,p,kind,x){
  const need=toCall(s,p);
  if(kind==='fold'){ s.folded=p; s.log.push(`${p?'B':'A'} 다이`); return finishHand(s,1-p); }
  if(kind==='check'||kind==='call'){ const pay=Math.min(need,s.chips[p]); s.chips[p]-=pay; s.bet[p]+=pay; s.pot+=pay; s.log.push(`${p?'B':'A'} ${need?`콜 (+${pay})`:'체크'}`); s.last={p,kind:need?'call':'check'}; }
  if(kind==='bet'){ const amt=Math.max(1,Math.min(3,x|0)), pay=Math.min(need+amt,s.chips[p]); s.chips[p]-=pay; s.bet[p]+=pay; s.pot+=pay; if(need) s.raises++; s.log.push(`${p?'B':'A'} ${need?'레이즈':'베팅'} +${amt}`); s.last={p,kind:need?'raise':'bet',amt}; s.acted[1-p]=false; }
  s.acted[p]=true;
  const o=1-p;
  if(s.chips[o]===0 && s.bet[o]<s.bet[p]){ const d=s.bet[p]-s.bet[o]; s.bet[p]-=d; s.chips[p]+=d; s.pot-=d; }   // 상대가 올인이라 더 못 받으면 넘친 만큼 돌려줌
  if(s.bet[0]===s.bet[1] && ((s.acted[0]&&s.acted[1]) || s.chips[o]===0)) return endRound(s);
  s.turn=o;
}
function finishHand(s,w){
  const r=[evalH(s.dice[0]),evalH(s.dice[1])];
  if(w==null) w = r[0].key>r[1].key?0 : r[1].key>r[0].key?1 : null;
  if(w==null){ const h=Math.floor(s.pot/2); s.chips[0]+=h; s.chips[1]+=h; s.pot-=2*h; } else { s.chips[w]+=s.pot; s.pot=0; }
  s.result={w, r:r.map(x=>x.cat), folded:s.folded}; s.phase='settle'; s.turn=null;
  s.log.push(w==null?'무승부 — 판돈을 나눠요':`${w?'B':'A'} 승리${s.folded!=null?' (상대 다이)':` · ${CAT[r[w].cat]}`}`);
}
function endGame(s){ s.phase='over'; s.turn=null; s.winner = s.chips[0]>s.chips[1]?0 : s.chips[1]>s.chips[0]?1 : 'draw'; }
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(!a) return '알 수 없는 동작';
  if(a.k==='reroll'){ if(s.phase!=='reroll') return '지금은 다시 굴릴 때가 아니에요'; if(s.rr[p]) return '이미 정했어요';
    const idx=(Array.isArray(a.idx)?a.idx:[]).map(x=>x|0).filter((x,i,arr)=>x>=0&&x<5&&arr.indexOf(x)===i); s.rr[p]=idx; s.rrN[p]=null;
    if(s.rr[0]&&s.rr[1]){ for(const q of [0,1]){ for(const i of s.rr[q]) s.dice[q][i]=roll(); s.rrN[q]=s.rr[q].length; } s.log.push(`🎲 다시 굴림 · A ${s.rrN[0]}개 · B ${s.rrN[1]}개`); startBet(s,2,(s.starter+s.hand)%2); }
    return null; }
  if(s.phase!=='bet'||s.turn!==p) return '상대 차례예요';
  const need=toCall(s,p);
  if(a.k==='fold'){ act(s,p,'fold'); return null; }
  if(a.k==='call'){ act(s,p,need?'call':'check'); return null; }
  if(a.k==='bet'){ if(s.chips[p]<=need) return '칩이 모자라요 — 콜이나 다이만'; if(need&&s.raises>=RCAP) return '더 올릴 수 없어요'; if(s.chips[1-p]===0) return '상대가 올인이에요'; act(s,p,'bet',a.x); return null; }
  return '알 수 없는 동작';
}
function stepDelay(s){ if(s.winner!=null) return null; if(s.phase==='show') return s.reveal<5?700:1200; if(s.phase==='settle') return 3200; return null; }
function step(s){ if(s.phase==='show'){ if(s.reveal<5){ s.reveal++; return; } finishHand(s); return; } if(s.phase==='settle'){ newHand(s); } }
function mask(s,p){ const v=U.clone(s), o=1-p;
  if(!(s.phase==='show'||s.phase==='settle'&&s.folded==null||s.phase==='over')) v.dice[o]=s.dice[o].map(()=>null);
  else if(s.phase==='show') v.dice[o]=s.dice[o].map((d,i)=>i<s.reveal?d:null);
  v.rr=[null,null]; v.rr[p]=s.rr[p]; v.rrDone=s.rr.map(x=>!!x);
  return v; }

/* 컴퓨터: 몬테카를로 승률 + 상대가 다시 굴린 개수로 패 짐작, 난이도별 뻥 */
function keepPlan(d){   // 다시 굴릴 주사위 고르기
  const c={}; d.forEach(x=>c[x]=(c[x]||0)+1); const g=Object.entries(c).map(([v,n])=>[n,+v]).sort((a,b)=>b[0]-a[0]||b[1]-a[1]);
  const e=evalH(d); if(e.cat>=4&&e.cat!==6||e.cat===7) return [];
  const u=[...new Set(d)].sort((a,b)=>a-b);
  if(g[0][0]===1){ for(const run of [[1,2,3,4],[2,3,4,5],[3,4,5,6]]) if(run.every(x=>u.includes(x))){ const seen=new Set(); return d.map((x,i)=>{ if(run.includes(x)&&!seen.has(x)){ seen.add(x); return -1; } return i; }).filter(i=>i>=0); } }
  const keepVals = g[0][0]>=2 ? g.filter(([n])=>n>=2).map(([,v])=>v) : [Math.max(...d)];
  return d.map((x,i)=>keepVals.includes(x)?-1:i).filter(i=>i>=0);
}
function sampleOpp(rrN,minCat=0){   // 상대 손 추정: 다시 굴린 개수가 적을수록 강한 패, 상대가 세게 나왔으면 센 패 위주
  for(let t=0;t<40;t++){ const d=[0,1,2,3,4].map(roll); const plan=keepPlan(d); for(const i of plan) d[i]=roll();
    if(minCat && evalH(d).cat<minCat) continue; if(rrN==null) return d; const n=plan.length; if(Math.abs(n-rrN)<=1) return d; }
  return [0,1,2,3,4].map(roll);
}
function winP(v,me,N=260,minCat=0){ const mine=evalH(v.dice[me]).key; let w=0;
  for(let k=0;k<N;k++){ const o=sampleOpp(v.rrN[1-me],minCat); let my=v.dice[me];
    if(v.round===1){ my=my.slice(); for(const i of keepPlan(my)) my[i]=roll(); }
    const a=v.round===1?evalH(my).key:mine, b=evalH(o).key; w+= a>b?1 : a===b?.5 : 0; }
  return w/N; }
function ai(v,lvl=1){
  const me=1;
  if(v.phase==='reroll' && !v.rrDone[me]){ let plan=keepPlan(v.dice[me]); if(lvl===0&&Math.random()<.3) plan=plan.slice(0,Math.max(0,plan.length-1)); return {k:'reroll',idx:plan}; }
  if(v.phase!=='bet'||v.turn!==me) return null;
  const oppAgg = v.last && v.last.p===0 && (v.last.kind==='bet'||v.last.kind==='raise') && v.bet[0]>v.bet[1];   // 상대가 방금 세게 나옴
  const p=winP(v,me, lvl===2?400:260, lvl===2&&oppAgg ? (v.last.amt>=3?3:2) : 0), need=v.bet[0]-v.bet[1], pot=v.pot, r=Math.random();
  const oppWeak = v.rrN[0]!=null && v.rrN[0]>=3, canUp=v.chips[me]>need && v.chips[0]>0;
  if(need===0){
    if(canUp && (p>[.78,.66,.6][lvl] || (lvl>0 && oppWeak && r<[0,.06,.1][lvl]))) return {k:'bet',x: p>.85?3:p>.72?2:1};
    return {k:'call'};
  }
  const odds = need/(pot+need);   // 콜에 필요한 승률
  if(canUp && v.raises<RCAP && p>[.92,.8,.74][lvl]) return {k:'bet',x:p>.88?3:2};
  if(lvl===0) return p>.42 ? {k:'call'} : {k:'fold'};          // 쉬움: 웬만하면 따라감
  if(p>odds + [0,.04,.0][lvl]) return {k:'call'};
  return {k:'fold'};
}
function aiDelay(v){ return v.phase==='reroll' ? 1600+Math.random()*1800 : 1300+Math.random()*1900; }

/* 화면 */
let pick=[], sig='', amt=1;
const die=(x,cls='',i)=>`<span class="dp-d ${cls}" ${i!=null?`data-d="${i}"`:''}>${x==null?'🂠':FACE[x]}</span>`;
function render(el,v,ctx){
  const me=ctx.me, o=1-me; const sg=v.hand+':'+v.phase; if(sg!==sig){ sig=sg; pick=[]; }
  const myE=evalH(v.dice[me]), oppShown=v.dice[o].every(x=>x!=null);
  let h=`<div class="info">${v.hand} / ${HANDS}판 · 판돈 <b>🪙 ${v.pot}</b>${v.phase==='bet'?` · ${v.round}차 베팅`:''}</div>`;
  h+=`<div class="dp-row"><div class="dp-who">상대 ${v.rrN[o]!=null?`<small>🎲 ${v.rrN[o]}개 다시 굴림</small>`:v.phase==='reroll'&&v.rrDone[o]?'<small>🤫 골랐어요</small>':''}</div><div class="dp-dice">${v.dice[o].map(x=>die(x,'opp')).join('')}</div>${oppShown?`<div class="dp-cat">${CAT[evalH(v.dice[o]).cat]}</div>`:''}</div>`;
  h+=`<div class="dp-pot">🪙 ${v.pot}${v.bet?` <small>이번 베팅 · 나 ${v.bet[me]} / 상대 ${v.bet[o]}</small>`:''}</div>`;
  h+=`<div class="dp-row me"><div class="dp-who">나 ${v.rrN[me]!=null?`<small>🎲 ${v.rrN[me]}개 다시 굴림</small>`:''}</div><div class="dp-dice">${v.dice[me].map((x,i)=>die(x,pick.includes(i)?'pick':'',v.phase==='reroll'&&!v.rrDone[me]?i:null)).join('')}</div><div class="dp-cat">${CAT[myE.cat]}</div></div>`;
  if(v.result) h+=`<div class="hl-notice">${v.result.w==null?'🤝 무승부':v.result.w===me?'🎉 이번 판은 내가!':'😢 이번 판은 상대가'}${v.result.folded!=null?' (다이)':` · ${CAT[v.result.r[me]]} vs ${CAT[v.result.r[o]]}`}</div>`;
  if(v.phase==='reroll'&&!v.rrDone[me]) h+=`<div class="vr-card"><b>🎲 다시 굴릴 주사위를 누르세요</b><p>몇 개를 굴렸는지는 상대에게 공개돼요 — 적게 굴리면 센 척, 많이 굴리면 약해 보여요.</p><div class="fh-act"><button data-a="rr">${pick.length?`${pick.length}개 다시 굴리기`:'그대로 두기'}</button></div></div>`;
  else if(v.phase==='reroll') h+=`<div class="info">상대가 고르는 중…</div>`;
  if(v.phase==='bet'&&ctx.myTurn){ const need=v.bet[o]-v.bet[me], canR=v.chips[me]>need&&(need===0||v.raises<RCAP)&&v.chips[o]>0;
    h+=`<div class="fh-act"><button class="ghost" data-a="fold">다이</button><button data-a="call">${need?`콜 (+${Math.min(need,v.chips[me])})`:'체크'}</button>${canR?[1,2,3].map(x=>`<button data-a="bet" data-x="${x}">${need?'레이즈':'베팅'} +${x}</button>`).join(''):''}</div>`; }
  h+=`<div class="info">칩 · 나 <b>${v.chips[me]}</b> : 상대 <b>${v.chips[o]}</b></div>`;
  h+=`<details class="hl-log" open><summary>기록 · 족보: ${CAT.slice().reverse().join(' > ')}</summary>${v.log.slice(-10).reverse().map(x=>`<div>${x.replace(/\bA\b/g,me===0?'나':'상대').replace(/\bB\b/g,me===1?'나':'상대')}</div>`).join('')}</details>`;
  el.innerHTML=h;
  el.onclick=e=>{
    const d=e.target.closest('[data-d]'); if(d){ const i=+d.dataset.d; pick=pick.includes(i)?pick.filter(x=>x!==i):pick.concat(i); return ctx.rerender(); }
    const a=e.target.closest('[data-a]'); if(!a) return; const k=a.dataset.a;
    if(k==='rr'){ const p=pick; pick=[]; return ctx.act({k:'reroll',idx:p}); }
    if(k==='fold'||k==='call') return ctx.act({k});
    if(k==='bet') return ctx.act({k:'bet',x:+a.dataset.x});
  };
}
const guide=`
<p>컵 속 주사위 5개로 겨루는 <b>베팅 심리전</b>. <small>(원작 결승 「주사위 포커」는 "심리가 중요한 베팅 게임"이라는 것만 알려져 있어서, 표준 다이스 포커로 만든 자체 규칙이에요)</small></p>
<ol><li>판마다 참가비 1개씩. 각자 주사위 5개를 굴려요 — <b>내 것만</b> 보여요.</li>
<li><b>1차 베팅</b>: 체크·베팅(+1~3)·콜·레이즈·다이.</li>
<li><b>다시 굴리기</b>: 원하는 주사위를 몰래 골라 다시 굴려요. <b>몇 개를 굴렸는지는 상대에게 공개</b> — 이게 단서이자 연기 포인트!</li>
<li><b>2차 베팅</b> → 한 개씩 공개해서 족보가 높은 쪽이 판돈을 가져가요.</li></ol>
<p>족보: 파이브카드 > 포카드 > 풀하우스 > 스트레이트(1~5·2~6) > 트리플 > 투페어 > 원페어 > 하이. 칩 20개로 최대 ${HANDS}판, 칩이 많은 쪽 승리.</p>
<div class="tipbox">💡 <b>팁</b><br>· 0~1개만 다시 굴렸다면 강한 패일 확률이 높아요. 반대로 그걸 노린 뻥일 수도!<br>· 컴퓨터도 내가 굴린 개수를 보고 판단해요. 어려움은 내가 많이 굴리면 압박해 와요.</div>`;
window.GAMES.dicepoker = {
  title:'주사위 포커', ref:'데블스 플랜 「주사위 포커」', emoji:'🎲', tags:['심리전','블러프','두뇌서바이벌','주사위'],
  tagline:'컵 속 주사위 5개, 다시 굴린 개수만 보이는 베팅 심리전. 센 척일까, 진짜일까?',
  guide, init, apply, mask, ai, aiDelay, render, step, stepDelay,
  reset(){ pick=[]; sig=''; },
  status:(v,ctx)=> v.phase==='reroll' ? (v.rrDone[ctx.me]?'상대가 고르는 중…':'다시 굴릴 주사위를 고르세요') : v.phase==='show' ? '한 개씩 공개 중…' : v.phase==='settle' ? '다음 판 준비 중…' : ctx.turnText(v),
  bar:(v,i)=>`<span class="score">🪙 ${v.chips[i]}</span>`,
};
})();
