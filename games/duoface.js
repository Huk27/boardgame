(function(){
'use strict';
/* 양면포커 (더 지니어스 시즌 3 · 4회·5회 / 시즌 4 · 10회 데스매치) — 1:1.
   카드 앞뒤에 서로 다른 숫자(1~12, 앞이 홀수면 뒤는 짝수 — 그 반대도). 한 장씩 받아 앞면은 둘 다 보이고, 뒷면은 나만 봄.
   칩 30개, 기본 1개. 선이 베팅할 면(앞/뒤)을 고르고 베팅 → 상대도 면을 고르고 콜·레이즈·다이. 콜하면 고른 면을 공개, 큰 수가 판돈. 같으면 이월.
   양면베팅: 앞·뒤 두 수가 모두 상대 수보다 크면 이김(하나라도 같거나 작으면 패배). 거는 칩이 2배, 이기면 상대 칩 10개 추가. 양면베팅에 다이하면 10개를 줌.
   칩이 0이면 패배, 20판 뒤엔 칩이 많은 쪽 승. */
const CH=30, MAXT=20, BONUS=10, MAXR=4;
const SIDE={F:'앞면',B:'뒷면','2':'양면'};
const mult=s=>s==='2'?2:1;
function newDeck(){ const d=[]; for(let f=1;f<=12;f++) for(let b=1;b<=12;b++) if((f+b)%2===1) d.push([f,b]); return U.shuffle(d); }
function init(starter){
  return {phase:'intro', starter:starter|0, chips:[CH,CH], deck:newDeck(), card:[null,null], side:[null,null], put:[0,0], ante:[0,0], L:0, carry:0, first:starter|0, raises:0, last:null, res:null,
    hist:[], turnN:0, turn:null, winner:null, ev:0, log:[], notice:'🎙️ 데스매치 「양면포커」 — 앞면은 모두에게, 뒷면은 나에게만'};
}
const pot=s=>s.carry+s.ante[0]+s.ante[1]+s.put[0]+s.put[1];
const AB=['A','B'];
function deal(s){ if(s.turnN>=MAXT||s.deck.length<2){ end(s,s.chips[0]>s.chips[1]?0:s.chips[1]>s.chips[0]?1:'both',`${s.turnN}판 끝 — 칩 ${s.chips[0]} : ${s.chips[1]}`); return; }
  s.turnN++; s.card=[s.deck.pop(),s.deck.pop()]; s.side=[null,null]; s.put=[0,0]; s.L=0; s.raises=0; s.last=null; s.res=null;
  for(const p of [0,1]){ const a=Math.min(1,s.chips[p]); s.chips[p]-=a; s.ante[p]=a; }
  s.phase='bet'; s.turn=s.first; s.notice=`🃏 ${s.turnN}/${MAXT}판 — ${AB[s.first]}부터 면을 골라 베팅`; s.log.push(`🃏 ${s.turnN}판 · 앞면 A ${s.card[0][0]} / B ${s.card[1][0]}`); }
/* 올릴 수 있는 한도: 두 사람 모두 그 수준을 낼 수 있게 */
function aff(s,p,sd){ return Math.floor((s.chips[p]+s.put[p])/mult(sd||'F')); }
function capL(s,p,sd){ const o=1-p; return Math.min(aff(s,p,sd), aff(s,o,s.side[o]||'F')); }
function apply(s,p,a){ if(s.winner!=null) return '게임이 끝났어요'; if(!a) return '알 수 없는 동작'; if(s.phase!=='bet') return '지금은 베팅 시간이 아니에요'; if(s.turn!==p) return '상대 차례예요';
  const o=1-p;
  if(a.k==='fold'){ settleFold(s,p); s.ev++; return null; }
  let sd=s.side[p]; if(sd==null){ sd=a.side; if(!SIDE[sd]) return '베팅할 면을 고르세요'; if(sd==='2'&&s.side[o]==='2') return '양면베팅은 한 사람만 할 수 있어요'; }
  const m=mult(sd);
  if(a.k==='call'){ if(s.L<=0&&capL(s,p,sd)>=1) return '먼저 베팅하세요'; const need=s.L*m-s.put[p]; if(need>s.chips[p]) return sd==='2'?'양면베팅할 칩이 모자라요':'칩이 모자라요';
    s.side[p]=sd; s.chips[p]-=need; s.put[p]+=need; s.last={k:'call',p}; s.log.push(`${AB[p]}: ${SIDE[sd]} 콜${need?` (${need})`:''}`); s.phase='reveal'; s.turn=null; s.notice=`📞 ${AB[p]} 콜 — 고른 면을 공개합니다`; s.ev++; return null; }
  if(a.k==='raise'){ const n=a.n|0; if(s.raises>=MAXR) return '더 올릴 수 없어요'; const nl=s.L+n, cap=capL(s,p,sd); if(n<1||nl>cap) return cap-s.L<1?'더 올릴 수 없어요 — 콜이나 다이':`1~${cap-s.L}까지 올릴 수 있어요`;
    s.side[p]=sd; const pay=nl*m-s.put[p]; s.chips[p]-=pay; s.put[p]+=pay; s.L=nl; s.raises++; s.last={k:'raise',p,n}; s.turn=o;
    const t=s.raises===1?`${SIDE[sd]}으로 ${n} 베팅`:`${SIDE[sd]} 레이즈 +${n}`; s.log.push(`${AB[p]}: ${t}${sd==='2'?' (양면 — 2배)':''}`); s.notice=`${sd==='2'?'⚡':'💰'} ${AB[p]} ${t}${sd==='2'?' — 양면베팅!':''} (판돈 ${pot(s)})`; s.ev++; return null; }
  return '콜·레이즈·다이 중에 고르세요'; }
function take(s,from,to,n){ const x=Math.min(n,s.chips[from]); s.chips[from]-=x; s.chips[to]+=x; return x; }
function settleFold(s,p){ const o=1-p, P=pot(s); s.chips[o]+=P; s.carry=0; let msg=`🏳️ ${AB[p]} 다이 — ${AB[o]}가 판돈 ${P}개`;
  if(s.side[o]==='2'){ const x=take(s,p,o,BONUS); msg+=` · 양면베팅에 다이해서 ${x}개 더`; }
  s.hist.push({t:s.turnN,c:s.card.map(c=>c.slice()),sd:s.side.slice(),w:o,fold:p}); s.notice=msg; s.log.push(msg); s.res={w:o,fold:p}; s.phase='show'; s.turn=null; s.first=1-s.first; }
/* 판정: 한쪽 값 → 내 값들 */
function judge(c,sd){ const v=p=>sd[p]==='F'?[c[p][0]]:sd[p]==='B'?[c[p][1]]:[c[p][0],c[p][1]];
  const a=v(0), b=v(1);
  if(sd[0]==='2') return a.every(x=>x>b[0])?0:1; if(sd[1]==='2') return b.every(x=>x>a[0])?1:0;
  return a[0]>b[0]?0:b[0]>a[0]?1:-1; }
function settleShow(s){ const w=judge(s.card,s.side), P=pot(s); const val=p=>s.side[p]==='2'?`${s.card[p][0]}·${s.card[p][1]}`:s.side[p]==='F'?s.card[p][0]:s.card[p][1];
  let msg=`🔓 A ${SIDE[s.side[0]]} ${val(0)} · B ${SIDE[s.side[1]]} ${val(1)} → `;
  if(w<0){ s.carry=P; msg+=`동점! 판돈 ${P}개 이월`; }
  else { s.chips[w]+=P; s.carry=0; msg+=`${AB[w]} 승리 (+${P})`; if(s.side[w]==='2'){ const x=take(s,1-w,w,BONUS); msg+=` · 양면베팅 성공! ${x}개 더`; } }
  s.put=[0,0]; s.ante=[0,0]; s.hist.push({t:s.turnN,c:s.card.map(c=>c.slice()),sd:s.side.slice(),w,show:1}); s.notice=msg; s.log.push(msg); s.res={w}; s.phase='show'; s.first=1-s.first; }
function stepDelay(s){ if(s.winner!=null) return null; if(s.phase==='intro') return 2200; if(s.phase==='reveal') return 1600; if(s.phase==='show') return 3300; return null; }
function step(s){
  if(s.phase==='intro'){ deal(s); s.ev++; return; }
  if(s.phase==='reveal'){ settleShow(s); s.ev++; return; }
  if(s.phase==='show'){ s.put=[0,0]; s.ante=[0,0]; if(s.chips[0]<=0||s.chips[1]<=0){ if(s.carry){ const w=s.chips[0]>0?0:1; s.chips[w]+=s.carry; s.carry=0; } end(s,s.chips[0]>0?0:s.chips[1]>0?1:'both','칩이 바닥났어요'); return; } deal(s); s.ev++; return; }
}
function end(s,w,why){ if(s.carry){ const h=Math.floor(s.carry/2); s.chips[0]+=h; s.chips[1]+=s.carry-h; s.carry=0; if(w!=='both'&&s.chips[0]!==s.chips[1]) w=s.chips[0]>s.chips[1]?0:1; } s.phase='over'; s.turn=null; s.winner=w; s.notice=`🏁 ${why}`; s.log.push(s.notice); s.ev++; }
function mask(s,p){ const v=U.clone(s), o=1-p, open=s.phase==='reveal'||s.phase==='show'||s.phase==='over';
  if(s.card[o]&&!open) v.card[o]=[s.card[o][0],null];
  if(s.card[o]&&open&&s.res&&s.res.fold!=null) v.card[o]=[s.card[o][0],null];
  v.hist=s.hist.map(h=>h.fold!=null?Object.assign({},h,{c:h.c.map((c,q)=>q===p?c:[c[0],null])}):h);
  v.deck=null; v.dn=s.deck.length; return v; }

/* ── 컴퓨터 ── 상대 뒷면은 앞면과 홀짝이 반대(쉬움은 이걸 모름), 어려움은 이미 본 카드를 셈. 상대가 고른 면·베팅 세기로 읽음 */
function backDist(v,me,lvl){ const o=1-me, f=v.card[o][0], w={}; let tot=0;
  const seen=new Set(); if(lvl>=2){ v.hist.forEach(h=>h.c.forEach(c=>{ if(c[1]!=null) seen.add(c[0]+','+c[1]); })); seen.add(v.card[me][0]+','+v.card[me][1]); }
  for(let x=1;x<=12;x++){ if(x===f) continue; if(lvl>=1&&(f+x)%2===0) continue; if(seen.has(f+','+x)) continue; let k=1;
    const so=v.side[o]; if(so==='B') k*=x>f?1:(lvl>=2?.25:.4); if(so==='2') k*=x>=7?1:.3;
    if(lvl>=1&&v.last&&v.last.p===o&&v.last.k==='raise'){ const agg=Math.min(1,v.last.n/4); k*=Math.exp(agg*(lvl===2?1.1:.6)*(x-6.5)/5.5); }
    w[x]=k; tot+=k; }
  for(const x in w) w[x]/=tot||1; return w; }
function equity(v,me,sd,dist){ const o=1-me, so=v.side[o], f=v.card[o][0], my=v.card[me]; let e=0;
  for(const xs in dist){ const x=+xs, q=dist[xs]; const oc=[f,x];
    let r; // 1 이김, .5 동점, 0 짐
    if(sd==='2'){ const V=so==='F'?f:so==='B'?x:Math.max(f,x); r=(my[0]>V&&my[1]>V)?1:0; }
    else { const mv=sd==='F'?my[0]:my[1];
      if(so==='2') r=(oc[0]>mv&&oc[1]>mv)?0:1; else { const V=so==='F'?f:so==='B'?x:Math.max(f,x); r=mv>V?1:mv<V?0:.5; } }
    e+=q*r; }
  return e; }
function decide(v,me,lvl){ const o=1-me, dist=backDist(v,me,lvl); const sides=v.side[me]?[v.side[me]]:['F','B'].concat(v.side[o]==='2'?[]:['2']);
  let best=null, bv=-1e9, beq=0;
  for(const sd of sides){ const eq=equity(v,me,sd,dist), m=mult(sd); if(sd==='2'&&aff(v,me,'2')<Math.max(1,v.L)) continue;
    let val=sd==='2'?eq*(1+BONUS/6)-(1-eq)*2:eq*2-1; if(lvl===0&&sd==='2') val-=.6; if(sd==='2'&&eq<(lvl>=2?.7:.78)) val-=5; val+=(Math.random()-.5)*(lvl===0?.8:lvl===1?.15:.05);
    if(val>bv){ bv=val; best=sd; beq=eq; } }
  if(lvl===0&&!v.side[me]&&Math.random()<.2) best=v.card[me][0]>v.card[me][1]?'B':'F';   // 사람 같은 실수: 더 작은 면을 고름
  const sd=best, eq=lvl===0?equity(v,me,sd,dist)*.8+.1:beq, m=mult(sd), need=v.L*m-v.put[me], P=pot(v), cap=capL(v,me,sd)-v.L;
  const canR=v.raises<MAXR&&cap>=1;
  if(v.L===0&&cap<1) return {k:'call',side:sd};
  if(v.L===0){ // 처음 거는 사람
    if(eq<.18&&lvl>=1&&Math.random()<.7) return {k:'fold'};
    let n=eq>.82?3+(Math.random()*3|0):eq>.62?2+(Math.random()*2|0):1; if(eq<.35&&Math.random()<(lvl===2?.22:lvl===1?.15:.05)) n=3+(Math.random()*2|0);
    return {k:'raise',side:sd,n:Math.max(1,Math.min(cap,n))}; }
  const oppDouble=v.side[o]==='2';
  const callEV=eq*(P+need+(sd==='2'?BONUS:0))-need*(1-eq)-(eq<1?0:0), foldEV=oppDouble?-BONUS:0;
  if(canR&&eq>.72&&Math.random()<.8){ const n=Math.max(1,Math.min(cap,Math.round((eq-.6)*(lvl===2?14:10))+(Math.random()*2|0))); return {k:'raise',side:sd,n}; }
  if(canR&&eq<.3&&v.raises<2&&Math.random()<(lvl===2?.15:.08)) return {k:'raise',side:sd,n:Math.min(cap,2+(Math.random()*3|0))};
  if(lvl===0&&need>=4&&eq<.6&&Math.random()<.5) return {k:'fold'};   // 겁먹고 접기
  if(need>v.chips[me]) return {k:'fold'};
  if(callEV>=foldEV-.01||need<=1) return {k:'call',side:sd};
  return {k:'fold'}; }
function aiSeat(v,me,lvl){ lvl=lvl==null?1:lvl; if(v.phase==='bet'&&v.turn===me) return decide(v,me,lvl); return null; }
function ai(v,lvl){ return aiSeat(v,1,lvl); }
function aiDelay(S){ const big=S.last&&S.last.k==='raise'&&(S.last.n>=3||S.side[S.last.p]==='2'); return (big?2600:1300)+Math.random()*1700; }

/* ── 화면 ── */
let rz=1, sel=null, sig='';
const face=(n,cls,lab)=>`<span class="df-face ${cls||''}"><small>${lab}</small><b>${n==null?'?':n}</b></span>`;
function render(el,v,ctx){
  const me=ctx.me, o=1-me, nm=p=>p===me?'나':U.esc(ctx.name(p)), T=t=>String(t).replace(/\bA\b/g,nm(0)).replace(/\bB\b/g,nm(1));
  const sg=v.turnN+':'+v.phase+':'+v.raises; if(sg!==sig){ sig=sg; rz=1; if(v.side[me]) sel=v.side[me]; else if(v.raises===0&&v.phase==='bet') sel=null; }
  const my=v.phase==='bet'&&v.turn===me, open=v.phase==='reveal'||v.phase==='show'||v.phase==='over';
  let h=`<div class="hl-notice">${U.esc(T(v.notice||''))}</div>`;
  h+=`<div class="info">${v.turnN}/${MAXT}판 · 판돈 <b>${pot(v)}</b>${v.carry?` (이월 ${v.carry})`:''} · 남은 카드 ${v.dn}장</div>`;
  const cardHtml=p=>{ const c=v.card[p]; if(!c) return '<div class="df-card empty"></div>'; const sd=v.side[p];
    return `<div class="df-card ${sd==='2'?'dbl':''}">${face(c[0],sd==='F'||sd==='2'?'pick':'', '앞')}${face(c[1],(sd==='B'||sd==='2'?'pick':'')+(c[1]==null?' hid':''), p===me&&!open?'뒤 (나만)':'뒤')}</div>`; };
  const seat=p=>`<div class="df-seat ${p===me?'me':''} ${v.turn===p?'act':''} ${v.res&&v.res.w===p?'win':''}"><div class="df-nm">${p===me?'🙂 나':`🎭 ${nm(p)}`} · 🪙 <b>${v.chips[p]}</b>${v.put[p]?` <small>베팅 ${v.put[p]}</small>`:''}${v.side[p]?` <span class="df-sd">${SIDE[v.side[p]]}</span>`:''}</div>${cardHtml(p)}</div>`;
  h+=`<div class="df-table">${seat(o)}<div class="df-pot">🪙 ${pot(v)}${v.L?`<small>한 면에 ${v.L}</small>`:''}</div>${seat(me)}</div>`;
  if(my){ const c=v.card[me], need0=sd=>v.L*mult(sd)-v.put[me]; const sd=v.side[me]||sel;
    h+=`<div class="vr-card df-act"><b>💰 내 차례</b>`;
    if(!v.side[me]) h+=`<p>베팅할 면 — 한 번 고르면 못 바꿔요${v.side[o]?` · 상대는 <b>${SIDE[v.side[o]]}</b>${v.side[o]==='F'?` (${v.card[o][0]})`:''}`:''}</p><div class="mr-btns">
      <button class="${sel==='F'?'':'ghost'}" data-s="F">앞면 ${c[0]}</button><button class="${sel==='B'?'':'ghost'}" data-s="B">뒷면 ${c[1]}</button>${v.side[o]!=='2'?`<button class="${sel==='2'?'':'ghost'}" data-s="2">⚡ 양면 ${c[0]}·${c[1]} (2배)</button>`:''}</div>`;
    if(sd){ const cap=capL(v,me,sd)-v.L; rz=Math.max(1,Math.min(rz,Math.max(1,cap))); const need=need0(sd);
      h+=`<div class="fh-act">${v.L>0||cap<1?`<button data-a="call">📞 ${v.L>0?`콜 (${need})`:'올인 — 바로 공개'}</button>`:''}
        ${cap>=1&&v.raises<MAXR?`<span class="bs-amt"><button class="ghost" data-a="rm">−</button><b>+${rz}</b><button class="ghost" data-a="rp">+</button></span><button data-a="raise" style="background:#b8412f">${v.L?'⬆️ 레이즈':'💰 베팅'} +${rz}${sd==='2'?` (×2 = ${(v.L+rz)*2-v.put[me]})`:''}</button>`:''}
        <button class="ghost" data-a="fold">🏳️ 다이${v.side[o]==='2'?` (−${BONUS} 더)`:''}</button></div>`; }
    else h+=`<div class="fh-act"><button class="ghost" data-a="fold">🏳️ 다이</button></div>`;
    h+=`<small>💡 상대 앞면 ${v.card[o][0]}은 ${v.card[o][0]%2?'홀수 → 뒷면은 짝수':'짝수 → 뒷면은 홀수'}</small></div>`; }
  else if(v.phase==='bet') h+=`<div class="vr-card bm-wait"><b>${nm(o)} 고민 중…</b> <small>내 앞면 ${v.card[me][0]}을 보고 있어요</small></div>`;
  if(v.phase==='over') h+=`<div class="sn-score"><div class="h"><b>나</b> 🪙${v.chips[me]}</div><div><b>${nm(o)}</b> 🪙${v.chips[o]}</div></div>`;
  h+=`<div class="bl-hist">${v.hist.slice(-12).reverse().map(x=>{ const cv=(p)=>{ const c=x.c[p]; const s=x.sd[p]; return `${c[0]}/${c[1]==null?'?':c[1]}${s?`(${s==='F'?'앞':s==='B'?'뒤':'양'})`:''}`; };
      return `<span class="${x.w===me?'w':x.w===o?'l':''}">${x.t}판 나 ${cv(me)} · ${nm(o)} ${cv(o)}${x.fold!=null?` (${x.fold===me?'내':'상대'} 다이)`:''}${x.w===-1?' 이월':''}</span>`; }).join('')}</div>`;
  h+=`<div class="bm-log">${v.log.slice(-6).reverse().map(x=>`<div>${U.esc(T(x))}</div>`).join('')}</div>`;
  el.innerHTML=h;
  el.onclick=e=>{ const sb=e.target.closest('[data-s]'); if(sb){ sel=sb.dataset.s; return ctx.rerender(); }
    const a=e.target.closest('[data-a]'); if(!a) return; const k=a.dataset.a;
    if(k==='rm'){ rz=Math.max(1,rz-1); return ctx.rerender(); } if(k==='rp'){ rz=rz+1; return ctx.rerender(); }
    if(k==='raise') return ctx.act({k:'raise',n:rz,side:v.side[me]||sel}); if(k==='call') return ctx.act({k:'call',side:v.side[me]||sel}); return ctx.act({k}); };
}
function status(v,ctx){ if(v.phase==='over') return ''; if(v.phase==='bet') return v.turn===ctx.me?'면을 골라 베팅하세요':'상대 베팅 중'; return '진행 중…'; }
const guide=`
<p><b>1:1 양면 카드 포커</b> — 앞면은 모두에게, 뒷면은 나에게만.</p>
<ol><li>카드 앞뒤에 서로 다른 숫자(1~12). <b>앞이 홀수면 뒤는 짝수</b>, 앞이 짝수면 뒤는 홀수.</li>
<li>한 장씩 받아요. 앞면은 둘 다 보이고, <b>뒷면은 나만</b> 봐요. 칩 ${CH}개, 판마다 기본 1개.</li>
<li>선이 <b>베팅할 면</b>(앞/뒤)을 골라 걸면, 상대도 면을 골라 <b>콜·레이즈·다이</b>. 콜하면 고른 면 공개, 큰 수가 판돈. 같으면 이월.</li>
<li>⚡ <b>양면베팅</b>: 두 면이 모두 상대 수보다 커야 이김(하나라도 같거나 작으면 패배). 칩은 2배로 걸고, 이기면 상대 칩 <b>${BONUS}개</b> 더. 양면베팅에 다이하면 ${BONUS}개를 줘요.</li>
<li>칩이 0이면 패배, ${MAXT}판 뒤엔 칩이 많은 쪽 승리.</li></ol>
<div class="tipbox">💡 <b>팁</b><br>· 상대 앞면의 <b>홀짝</b>으로 뒷면 범위가 반으로 줄어요.<br>· 앞면으로 걸면 숫자가 다 보여요 — 뒷면으로 걸면 숨길 수 있죠.<br>· 이미 나온 카드를 세면 더 정확해요.</div>`;
const guideSteps=[
  {t:'🎴 양면 카드', h:'앞면은 <b>둘 다</b> 보이고, 뒷면은 <b>나만</b>. 앞이 홀수면 뒤는 짝수!', demo:s=>{ deal(s); return s; }},
  {t:'💰 면을 골라 베팅', h:'앞면 또는 뒷면 중 <b>한 면</b>을 골라 걸어요. 고른 면은 상대에게 알려져요(숫자는 뒷면이면 비밀).', demo:s=>{ deal(s); s.side[s.first]='B'; s.L=2; s.put[s.first]=2; s.raises=1; s.turn=1-s.first; return s; }},
  {t:'⚡ 양면베팅', h:'두 면이 모두 상대보다 크면 승리 + <b>10개</b> 더. 칩은 2배로 걸어요.', demo:s=>{ deal(s); s.card[0]=[11,12]; s.side[0]='2'; s.L=2; s.put[0]=4; s.raises=1; s.turn=1; return s; }},
  {t:'🏆 칩을 다 뺏어라', h:'콜하면 공개, 큰 수가 판돈. 칩이 <b>0</b>이면 패배, 20판 뒤엔 칩 많은 쪽 승.', demo:s=>{ deal(s); s.side=['B','F']; s.L=3; s.put=[3,3]; settleShow(s); return s; }},
];
window.GAMES.duoface = {
  title:'양면포커', ref:'더 지니어스 「양면포커」', emoji:'🎴', tags:['포커','블러핑','심리전','두뇌서바이벌'],
  tagline:'앞면은 모두에게, 뒷면은 나에게만 — 어느 면으로 걸지부터가 심리전인 1:1 포커.',
  guide, guideSteps, init, apply, mask, ai, aiDelay, render, status, step, stepDelay,
  reset(){ rz=1; sel=null; sig=''; },
  bar:(v,i)=>`<span class="tag">🪙${v.chips[i]}</span>`,
  result:(v,ctx)=>`칩 ${v.chips[ctx.me]} : ${v.chips[1-ctx.me]}`,
  pulse:v=>v.chips[1]-v.chips[0], pulseStep:8,
  _aiSeat:aiSeat,
};
})();
