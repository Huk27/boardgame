(function(){
'use strict';
/* 블라인드 베팅 (피의 게임 시즌 3 · 6일차 데스매치) — 1:1 인디언 포커.
   블라인드 카드(1~12 두 벌, 24장)를 한 장씩 받아 이마에: 상대 것만 보이고 내 것은 안 보임. 각자 오픈 카드 1~10을 라운드마다 한 벌.
   칩 30개, 기본 베팅 1개. 직전 턴 승자부터 베팅(체크·콜·레이즈·폴드, 상대 남은 칩보다 많이 못 올림).
   베팅이 맞춰지면 각자 오픈 카드 한 장을 몰래 내고, 블라인드 + 오픈 합이 큰 쪽이 판돈. 합이 같으면 오픈 카드 큰 쪽, 그것도 같으면 이월.
   폴드했는데 내 블라인드가 11·12면 벌칙 10칩. 오픈 카드 1·2로 이기면 보너스 10칩. 오픈 카드 10장을 다 쓰면 라운드 끝, 2라운드.
   칩이 0이 되면 즉시 패배, 2라운드 뒤 칩이 많은 쪽 승리. */
const CH=30, ROUNDS=2, PEN=10, BON=10, MAXR=4;
function newDeck(){ const d=[]; for(let k=0;k<2;k++) for(let n=1;n<=12;n++) d.push(n); return U.shuffle(d); }
function init(starter){
  return {phase:'intro', starter:starter|0, round:1, turnN:0, chips:[CH,CH], deck:newDeck(), seen:[], blind:[null,null], open:[[...Array(10)].map((_,k)=>k+1),[...Array(10)].map((_,k)=>k+1)],
    bet:[0,0], carry:0, first:starter|0, actor:null, raises:0, acted:[false,false], pick:[null,null], last:null, hist:[], turn:null, winner:null, ev:0, log:[],
    notice:'🎙️ 데스매치 「블라인드 베팅」 — 내 카드는 상대 얼굴에서 읽으세요'};
}
const pot=s=>s.carry+s.bet[0]+s.bet[1];
function deal(s){ s.turnN++; if(s.deck.length<2){ s.deck=newDeck(); s.seen=[]; s.log.push('🔀 블라인드 카드를 다시 섞었어요'); }
  s.blind=[s.deck.pop(), s.deck.pop()]; s.pick=[null,null]; s.raises=0; s.acted=[false,false]; s.last=null;
  s.bet=[0,0]; for(const p of [0,1]){ const a=Math.min(1,s.chips[p]); s.chips[p]-=a; s.bet[p]=a; }
  s.phase='bet'; s.actor=s.first; s.turn=s.first; s.notice=`🃏 ${s.round}라운드 ${s.turnN}턴 — 블라인드 카드를 이마에! ${['A','B'][s.first]}부터 베팅`; s.log.push(`🃏 ${s.round}R ${s.turnN}턴`); }
function maxTotal(s){ return Math.min(s.chips[0]+s.bet[0], s.chips[1]+s.bet[1]); }
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요'; if(!a) return '알 수 없는 동작'; const o=1-p;
  if(s.phase==='bet'){ if(s.turn!==p) return '상대 차례예요'; const need=s.bet[o]-s.bet[p];
    if(a.k==='fold'){ s.last={k:'fold',p}; settleFold(s,p); s.ev++; return null; }
    if(a.k==='call'){ const pay=Math.min(need,s.chips[p]); s.chips[p]-=pay; s.bet[p]+=pay; s.acted[p]=true; s.log.push(`${['A','B'][p]}: ${need>0?`콜 (${need})`:'체크'}`); s.last={k:need>0?'call':'check',p,n:need};
      if(need>0||s.acted[o]){ toPick(s); } else { s.turn=o; s.actor=o; s.notice=`${['A','B'][p]} 체크 — ${['A','B'][o]} 차례`; } s.ev++; return null; }
    if(a.k==='raise'){ const n=a.n|0; if(s.raises>=MAXR) return '더 올릴 수 없어요'; const cap=maxTotal(s)-s.bet[o]; if(n<1||n>cap) return cap<1?'더 올릴 수 없어요':`1~${cap}개까지 올릴 수 있어요`;
      const pay=need+n; s.chips[p]-=pay; s.bet[p]+=pay; s.raises++; s.acted[p]=true; s.acted[o]=false; s.turn=o; s.actor=o; s.last={k:'raise',p,n};
      s.notice=`⬆️ ${['A','B'][p]} 레이즈 +${n} (판돈 ${pot(s)})`; s.log.push(`${['A','B'][p]}: 레이즈 +${n}`); s.ev++; return null; }
    return '체크·콜·레이즈·폴드 중에 고르세요'; }
  if(s.phase==='pick'){ if(s.pick[p]!=null) return '이미 냈어요'; const c=a.c|0; if(a.k!=='pick'||!s.open[p].includes(c)) return '남은 오픈 카드를 고르세요'; s.pick[p]=c; s.ev++; return null; }
  return '지금은 할 수 없어요';
}
function toPick(s){ s.phase='pick'; s.turn=null; s.actor=null; s.notice=`🎴 베팅 끝 (판돈 ${pot(s)}) — 오픈 카드 한 장을 몰래 내세요`; }
function take(s,from,to,n){ const x=Math.min(n,s.chips[from]); s.chips[from]-=x; s.chips[to]+=x; return x; }
function settleFold(s,p){ const o=1-p; s.chips[o]+=pot(s); s.carry=0; let msg=`🏳️ ${['A','B'][p]} 폴드 — ${['A','B'][o]}이(가) 판돈 ${s.bet[0]+s.bet[1]}개`; s.bet=[0,0];
  if(s.blind[p]>=11){ const x=take(s,p,o,PEN); msg+=` · 폴드한 카드가 ${s.blind[p]}! 벌칙 ${x}칩`; }
  s.notice=msg; s.log.push(msg); s.phase='show'; s.turn=null; s.res={w:o,fold:p}; s.first=o; s.hist.push({t:s.turnN,r:s.round,b:s.blind.slice(),o:[null,null],w:o,fold:p}); }
function settleShow(s){ const sum=[0,1].map(p=>s.blind[p]+s.pick[p]); let w = sum[0]>sum[1]?0 : sum[1]>sum[0]?1 : s.pick[0]>s.pick[1]?0 : s.pick[1]>s.pick[0]?1 : -1;
  for(const p of [0,1]) s.open[p]=s.open[p].filter(c=>c!==s.pick[p]);
  let msg=`🔓 A ${s.blind[0]}+${s.pick[0]}=${sum[0]} · B ${s.blind[1]}+${s.pick[1]}=${sum[1]} → `;
  if(w<0){ s.carry=pot(s); s.bet=[0,0]; msg+=`완전 동점! 판돈 ${s.carry}개 이월`; }
  else { const P=pot(s); s.chips[w]+=P; s.carry=0; s.bet=[0,0]; msg+=`${['A','B'][w]} 승리 (+${P})`; if(s.pick[w]<=2){ const x=take(s,1-w,w,BON); msg+=` · 오픈 카드 ${s.pick[w]}로 승리! 보너스 ${x}칩`; } s.first=w; }
  s.notice=msg; s.log.push(msg); s.phase='show'; s.res={w,sum}; s.hist.push({t:s.turnN,r:s.round,b:s.blind.slice(),o:s.pick.slice(),w}); }
function stepDelay(s){ if(s.winner!=null) return null; if(s.phase==='intro') return 2200; if(s.phase==='pick') return s.pick.every(x=>x!=null)?700:null; if(s.phase==='reveal') return 1500; if(s.phase==='show') return 3400; return null; }
function step(s){
  if(s.phase==='intro'){ deal(s); s.ev++; return; }
  if(s.phase==='pick'&&s.pick.every(x=>x!=null)){ s.phase='reveal'; s.notice='🥁 셋, 둘, 하나 — 공개!'; s.ev++; return; }
  if(s.phase==='reveal'){ settleShow(s); s.ev++; return; }
  if(s.phase==='show'){ s.seen.push(...s.blind);
    if(s.chips[0]<=0||s.chips[1]<=0){ end(s, s.chips[0]>0?0:s.chips[1]>0?1:'both', '칩이 바닥났어요'); return; }
    if(s.open[0].length===0){ if(s.round>=ROUNDS){ end(s, s.chips[0]>s.chips[1]?0:s.chips[1]>s.chips[0]?1:'both', `최종 칩 ${s.chips[0]} : ${s.chips[1]}`); return; }
      s.round++; s.turnN=0; s.open=[[...Array(10)].map((_,k)=>k+1),[...Array(10)].map((_,k)=>k+1)]; s.log.push('🎙️ 2라운드 — 오픈 카드 1~10을 다시 받아요'); }
    deal(s); s.ev++; return; }
}
function end(s,w,why){ s.phase='over'; s.turn=null; s.winner=w; s.notice=`🏁 ${why}`; s.log.push(s.notice); s.ev++; }
function mask(s,p){ const v=U.clone(s), o=1-p, open=s.phase==='reveal'||s.phase==='show'||s.phase==='over';
  if(!open) v.blind[p]=null; if(!open&&s.pick[o]!=null) v.pick[o]='?'; v.deck=null; v.dn=s.deck.length; return v; }
/* 컴퓨터 — 내 카드는 남은 카드(덱에서 아직 안 나온 것)로 추정. 어려움은 상대 베팅으로 내 카드를 읽음 */
function myDist(v,me,lvl){ const cnt={}; for(let n=1;n<=12;n++) cnt[n]=2; if(lvl>=1) for(const x of v.seen) cnt[x]--; cnt[v.blind[1-me]]--;
  const w={}; let tot=0; for(let n=1;n<=12;n++){ let k=Math.max(0,cnt[n]); if(lvl>=1&&v.last&&v.last.p===1-me){ const agg=v.last.k==='raise'?Math.min(1,v.last.n/4):v.last.k==='call'?.15:0; k*= Math.exp(-agg*(lvl===2?1.2:.6)*(n-6.5)/5.5); } w[n]=k; tot+=k; }
  for(let n=1;n<=12;n++) w[n]/=tot||1; return w; }
function winProb(v,me,o,dist){ const ob=v.blind[1-me], oo=v.open[1-me]; let p=0; for(let n=1;n<=12;n++){ if(!dist[n]) continue; let q=0; for(const x of oo){ const a=n+o, b=ob+x; q += a>b?1 : a<b?0 : (o>x?1:o<x?0:.5); } p+=dist[n]*q/oo.length; } return p; }
function chooseOpen(v,me,lvl,dist){ const P=pot(v), opts=v.open[me]; let best=opts[0], bv=-1e9; const left=opts.length;
  for(const o of opts){ const wp=winProb(v,me,o,dist); const val=wp*(P+(o<=2?BON:0)) - (1-wp)*0 - (lvl===0?0:o*(left>1?.55:0)) + (Math.random()-.5)*(lvl===0?6:lvl===1?1.5:.3); if(val>bv){ bv=val; best=o; } }
  return best; }
function decideBet(v,me,lvl){ const o=1-me, dist=myDist(v,me,lvl); const need=v.bet[o]-v.bet[me], P=pot(v);
  const oc=v.open[me].slice().sort((a,b)=>b-a); const pickO=oc[Math.min(oc.length-1, Math.floor(oc.length/3))];
  const wp=Math.max(winProb(v,me,pickO,dist), winProb(v,me,oc[0],dist)*.9);
  const pen=(dist[11]+dist[12])*PEN, cap=maxTotal(v)-v.bet[o];
  const ev=wp*(P+need)-(1-wp)*need, foldLoss=pen;
  if(lvl===0&&Math.random()<.25) return need>0?(Math.random()<.5?{k:'fold'}:{k:'call'}):{k:'call'};
  if(cap>=1&&v.raises<MAXR&&wp>.62&&Math.random()<.85){ const n=Math.max(1,Math.min(cap, Math.round((wp-.5)*(lvl===2?14:10)+Math.random()*2))); return {k:'raise',n}; }
  if(cap>=2&&v.raises===0&&wp<.3&&v.blind[o]<=4&&Math.random()<(lvl===2?.25:.12)) return {k:'raise',n:Math.min(cap,2+(Math.random()*3|0))};
  if(need===0) return {k:'call'};
  if(ev+foldLoss>=0||need<=1) return {k:'call'};
  return {k:'fold'}; }
function aiSeat(v,me,lvl){ lvl=lvl==null?1:lvl;
  if(v.phase==='bet'&&v.turn===me) return decideBet(v,me,lvl);
  if(v.phase==='pick'&&v.pick[me]==null){ return {k:'pick', c:chooseOpen(v,me,lvl,myDist(v,me,lvl))}; }
  return null; }
function ai(v,lvl){ return aiSeat(v,1,lvl); }
function aiDelay(S){ if(S.phase==='pick') return 1200+Math.random()*1800; const big=S.last&&S.last.k==='raise'&&S.last.n>=3; return (big?2600:1300)+Math.random()*1800; }

/* 화면 */
let rz=1, sig='';
const bcard=(n,cls)=>`<span class="bl-card ${n>=11?'hi':''} ${cls||''}">${n==null?'?':n}</span>`;
function render(el,v,ctx){
  const me=ctx.me, o=1-me, nm=p=>p===me?'나':U.esc(ctx.name(p)), AB=t=>String(t).replace(/\bA\b/g,nm(0)).replace(/\bB\b/g,nm(1));
  const sg=v.round+':'+v.turnN+':'+v.phase; if(sg!==sig){ sig=sg; rz=1; }
  const my=v.turn===me;
  let h=`<div class="hl-notice">${U.esc(AB(v.notice||''))}</div>`;
  h+=`<div class="info">${v.round}/${ROUNDS}라운드 · ${v.turnN}턴 · 판돈 <b>${pot(v)}</b>${v.carry?` (이월 ${v.carry})`:''} · 블라인드 더미 ${v.dn}장</div>`;
  const side=(p)=>`<div class="bl-side ${p===me?'me':''}"><div class="bl-nm">${p===me?'🙂 나':`🎭 ${nm(p)}`} · 🪙 <b>${v.chips[p]}</b> ${v.bet[p]?`<small>베팅 ${v.bet[p]}</small>`:''}</div>
    <div class="bl-face">${p===me?(v.blind[p]==null?`<span class="bl-card back">?</span><small>내 이마 — 안 보여요</small>`:bcard(v.blind[p],'big')):bcard(v.blind[p],'big')}
      <span class="bl-plus">+</span>${v.pick[p]==null?'<span class="bl-card open empty">　</span>':v.pick[p]==='?'?'<span class="bl-card open back">✔</span>':bcard(v.pick[p],'open')}</div>
    <div class="bl-opens">${[...Array(10)].map((_,k)=>`<span class="${v.open[p].includes(k+1)?'':'used'}">${k+1}</span>`).join('')}</div></div>`;
  h+=`<div class="bl-table">${side(o)}<div class="bl-pot">🪙 ${pot(v)}</div>${side(me)}</div>`;
  if(v.phase==='bet'&&my){ const need=v.bet[o]-v.bet[me], cap=maxTotal(v)-v.bet[o]; rz=Math.max(1,Math.min(rz,Math.max(1,cap)));
    h+=`<div class="vr-card"><b>💰 내 베팅</b> <small>상대 카드 ${v.blind[o]} · 내 카드는? · 폴드할 때 내 카드가 11·12면 벌칙 ${PEN}</small><div class="fh-act">
      <button data-a="call">${need>0?`📞 콜 (${need})`:'✋ 체크'}</button>
      ${cap>=1&&v.raises<MAXR?`<span class="bs-amt"><button class="ghost" data-a="rm">−</button><b>+${rz}</b><button class="ghost" data-a="rp">+</button></span><button data-a="raise" style="background:#b8412f">⬆️ 레이즈 +${rz}</button>`:''}
      <button class="ghost" data-a="fold">🏳️ 폴드</button></div></div>`; }
  else if(v.phase==='bet') h+=`<div class="vr-card bm-wait"><b>${nm(o)} 베팅 고민 중…</b> <small>내 이마의 카드를 보고 있어요</small></div>`;
  if(v.phase==='pick'&&v.pick[me]==null) h+=`<div class="vr-card"><b>🎴 오픈 카드 한 장</b> <small>블라인드 + 오픈 합이 큰 쪽 승리 · 1·2로 이기면 보너스 ${BON}</small><div class="bl-pick">${v.open[me].map(c=>`<button data-c="${c}">${bcard(c,'open')}</button>`).join('')}</div></div>`;
  else if(v.phase==='pick') h+=`<div class="vr-card bm-wait"><small>냈어요 — ${v.pick[o]!=null?'곧 공개':`${nm(o)}이(가) 고르는 중…`}</small></div>`;
  if(v.phase==='over') h+=`<div class="sn-score"><div class="h"><b>나</b> 🪙${v.chips[me]}</div><div><b>${nm(o)}</b> 🪙${v.chips[o]}</div></div>`;
  h+=`<div class="bl-hist">${v.hist.slice(-12).reverse().map(x=>`<span class="${x.w===me?'w':x.w===o?'l':''}">${x.r}R${x.t} 나 ${x.b[me]}${x.o[me]!=null?`+${x.o[me]}`:''} · ${nm(o)} ${x.b[o]}${x.o[o]!=null?`+${x.o[o]}`:''}${x.fold!=null?` (${x.fold===me?'내':'상대'} 폴드)`:''}</span>`).join('')}</div>`;
  h+=`<div class="bm-log">${v.log.slice(-6).reverse().map(x=>`<div>${U.esc(AB(x))}</div>`).join('')}</div>`;
  el.innerHTML=h;
  el.onclick=e=>{ const c=e.target.closest('[data-c]'); if(c) return ctx.act({k:'pick',c:+c.dataset.c});
    const a=e.target.closest('[data-a]'); if(!a) return; const k=a.dataset.a;
    if(k==='rm'){ rz=Math.max(1,rz-1); return ctx.rerender(); } if(k==='rp'){ rz=rz+1; return ctx.rerender(); }
    if(k==='raise') return ctx.act({k:'raise',n:rz}); return ctx.act({k}); };
}
function status(v,ctx){ if(v.phase==='over') return ''; if(v.phase==='bet') return v.turn===ctx.me?'베팅하세요':'상대 베팅 중'; if(v.phase==='pick') return v.pick[ctx.me]==null?'오픈 카드를 내세요':'공개 대기'; return '진행 중…'; }
const guide=`
<p><b>1:1 인디언 포커</b> — 내 카드는 안 보이고, 상대 카드만 보여요.</p>
<ol><li>블라인드 카드(1~12 두 벌)를 한 장씩 <b>이마에</b>. 상대 것만 보이고 내 것은 안 보여요.</li>
<li>칩 ${CH}개, 기본 1개. 직전 턴 승자부터 <b>체크·콜·레이즈·폴드</b>(상대 남은 칩보다 많이 못 올림).</li>
<li>베팅이 끝나면 각자 <b>오픈 카드(1~10, 라운드마다 한 벌)</b> 한 장을 몰래 내요. <b>블라인드 + 오픈</b> 합이 큰 쪽이 판돈. 같으면 오픈 카드 큰 쪽, 그것도 같으면 이월.</li>
<li>⚠️ 폴드했는데 내 카드가 <b>11·12</b>면 벌칙 ${PEN}칩. 🎁 오픈 카드 <b>1·2로 이기면</b> 보너스 ${BON}칩.</li>
<li>오픈 카드 10장을 다 쓰면 라운드 끝, ${ROUNDS}라운드. 칩이 0이면 즉시 패배, 끝나면 칩이 많은 쪽 승리.</li></ol>
<div class="tipbox">💡 <b>팁</b><br>· 이미 나온 블라인드 카드를 세면 내 카드가 보여요(필기 금지라 머릿속으로!).<br>· 상대가 세게 나오면 내 카드가 낮다는 뜻일 수도.<br>· 큰 오픈 카드는 큰 판돈에 아껴 두세요.</div>`;
const guideSteps=[
  {t:'🙈 내 카드는 안 보인다', h:'블라인드 카드를 <b>이마에</b> — 상대 카드만 보이고 내 카드는 <b>?</b>. 이미 나온 카드를 세어 추리!', demo:s=>{ deal(s); return s; }},
  {t:'💰 베팅', h:'직전 승자부터 <b>체크·콜·레이즈·폴드</b>. 폴드할 때 내 카드가 <b>11·12</b>면 벌칙 10칩!', demo:s=>{ deal(s); s.turn=0; return s; }},
  {t:'🎴 오픈 카드 한 장', h:'베팅이 끝나면 <b>1~10</b> 중 한 장을 몰래 — <b>블라인드 + 오픈</b> 합이 큰 쪽이 판돈. 1·2로 이기면 <b>보너스 10</b>.', demo:s=>{ deal(s); toPick(s); return s; }},
  {t:'🏆 승리', h:'오픈 카드 10장 = 한 라운드, 2라운드. 칩이 <b>0</b>이면 즉시 패배, 끝나면 칩이 많은 쪽 승리.', demo:s=>{ deal(s); s.pick=[3,7]; settleShow(s); return s; }},
];
window.GAMES.blindbet = {
  title:'블라인드 베팅', ref:'피의 게임 「블라인드 베팅」', emoji:'🙈', tags:['인디언 포커','블러핑','심리전','두뇌서바이벌'],
  tagline:'내 카드는 상대 얼굴에서 읽어라 — 블라인드 + 오픈 카드 합으로 겨루는 1:1 인디언 포커.',
  guide, guideSteps, init, apply, mask, ai, aiDelay, render, status, step, stepDelay,
  reset(){ rz=1; sig=''; },
  bar:(v,i)=>`<span class="tag">🪙${v.chips[i]}</span>`,
  result:(v,ctx)=>`칩 ${v.chips[ctx.me]} : ${v.chips[1-ctx.me]}`,
  pulse:v=>v.chips[1]-v.chips[0], pulseStep:8,
  _aiSeat:aiSeat,
};
})();
