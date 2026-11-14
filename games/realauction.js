(function(){
'use strict';
/* 리얼타임 경매 (피의 게임 시즌 2 · 10일차 머니 챌린지) — 6인(우리 둘 + NPC 4명), 3라운드.
   시계 없이(10분마다 🔔), 투표룸에서 "지금 시간대 구간"에 코인을 몰래 입찰(여러 구간 가능, 같은 구간에 더 얹기 가능).
   구간마다 가장 많이 건 사람이 그 구간 승점(0-10 3 · 10-20 5 · 20-28 7 · 28-32 10 · 32-40 8 · 40-50 6 · 50-60 3)을 가져감 — 같으면 나눔(버림).
   낙찰 못 받은 코인은 사라지고, 낙찰된 코인도 씀. 코인 20개를 3라운드 전체에 나눠 씀. 🕐 시간 확인 1코인, ⏪⏩ 4분 이동 2코인.
   (1분 = 1.2초, 한 라운드 72초) 3라운드 합계 1등 우승, 꼴찌 탈락 후보. */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로, 나머지는 NPC */
const N=6, ROUNDS=3, MS=1200, LEN=60, COINS=20; let HSEAT=[0,3]; const SEATORD=[0,3,1,4,2,5];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i), ALL=[...Array(N).keys()];
const nm=i=>`{s${i}}`;
const SEG=[[0,10,3],[10,20,5],[20,28,7],[28,32,10],[32,40,8],[40,50,6],[50,60,3]];
const segOf=t=>{ for(let k=0;k<SEG.length;k++) if(t<SEG[k][1]) return k; return SEG.length-1; };
const DEF_P={talk:.6,aggr:.5,trust:.5,bluff:.5,logic:.6,temper:.4};
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
function init(starter,o){ const k=Math.max(2,Math.min(6,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  const s={phase:'intro', who:{}, round:0, coins:Array(N).fill(COINS), off:Array(N).fill(0), bids:ALL.map(()=>Array(SEG.length).fill(0)), score:Array(N).fill(0), rounds:[], t0:0, ring:0,
    checks:ALL.map(()=>[]), visits:Array(N).fill(0), ev:[], say:null, log:[], turn:null, starter, winner:null, evn:0, hot:Array(SEG.length).fill(0),
    notice:'🎙️ 머니 챌린지 「리얼타임 경매」 — 시계 없이, 지금 구간에 코인을 거세요'};
  s.hs=HSEAT.slice(); const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=ids[k]);
  return s;
}
const now=s=>(Date.now()-s.t0)/MS;
function startRound(s){ s.round++; s.bids=ALL.map(()=>Array(SEG.length).fill(0)); s.off=Array(N).fill(0); s.checks=ALL.map(()=>[]); s.visits=Array(N).fill(0); s.phase='count'; s.cnt=3; s.notice=`🎙️ ${s.round}라운드 — 3`; s.log.push(`— ${s.round}라운드 (코인 남은 만큼) —`); }
function beginRun(s){ s.phase='run'; s.t0=Date.now(); s.ev=[];
  for(let m=10;m<LEN;m+=10) s.ev.push({t:m, k:'chime'}); s.ev.push({t:LEN, k:'end'});
  for(const i of ALL) if(!isH(i)) planNPC(s,i);
  s.ev.sort((a,b)=>a.t-b.t); s.notice='⏳ 시간이 흐릅니다… (시계 없음)'; }
function planNPC(s,i){ const p=P(s,i), left=ROUNDS-s.round+1, budget=Math.max(1,Math.floor(s.coins[i]/left*(.85+p.aggr*.45)));
  // 구간마다 예상 낙찰가(지난 라운드 낙찰가 + 1, 처음엔 점수 크기로 짐작) 대비 점수가 좋은 곳부터 여러 곳에 나눠 걸기
  const price=SEG.map((g,k)=> s.round===1 ? Math.max(1,Math.round(g[2]/3.2)) : (s.hot[k]||0)+1);
  const order=[...SEG.keys()].sort((x,y)=>(SEG[y][2]/price[y]+Math.random()*2.6)-(SEG[x][2]/price[x]+Math.random()*2.6));
  let rest=budget, picks=0;
  for(const k of order){ if(rest<=0||picks>=5) break; const g=SEG[k]; let amt=price[k]+(Math.random()<p.aggr*.6?1:0); if(k===3) amt=Math.max(amt, Math.round(budget*(.6+p.aggr*.5)));; amt=Math.min(rest,amt); if(amt<=0) continue; rest-=amt; picks++;
    const sense=.03+(1-p.logic)*.12, at=Math.max(.5,Math.min(59.5,((g[0]+g[1])/2)*(1+(Math.random()-.5)*2*sense)));
    if(Math.random()<p.logic*.5&&s.coins[i]>=budget+1&&picks===1) s.ev.push({t:Math.max(.3,at-2.5), k:'check', i, target:(g[0]+g[1])/2, seg:k});
    s.ev.push({t:at, k:'bid', i, amt, seg:k}); } }
function visit(s,i){ s.visits[i]++; s.notice=`🚪 ${nm(i)}이(가) 투표룸에 다녀왔습니다`; }
function bid(s,i,amt){ const t=Math.max(0,Math.min(LEN-0.001, now(s)+s.off[i])), k=segOf(t); amt=Math.max(0,Math.min(s.coins[i],amt|0)); if(!amt) return null; s.coins[i]-=amt; s.bids[i][k]+=amt; visit(s,i); return k; }
function settle(s){ const res=SEG.map((g,k)=>{ const mx=Math.max(...ALL.map(i=>s.bids[i][k])); if(mx<=0) return {k, win:[], mx:0}; const win=ALL.filter(i=>s.bids[i][k]===mx); return {k, win, mx, pts:Math.floor(g[2]/win.length)}; });
  const gain=Array(N).fill(0); for(const r of res) for(const i of r.win) gain[i]+=r.pts; for(const i of ALL) s.score[i]+=gain[i];
  s.hot=res.map(r=>r.mx); s.rounds.push({res, bids:s.bids.map(b=>b.slice()), gain}); s.phase='reveal'; s.rv=0; s.notice='🎙️ 구간별 낙찰 결과를 공개합니다'; }
function apply(s,p,a){ syncH(s);
  if(s.winner!=null) return '게임이 끝났어요'; const seat=HSEAT[p]; if(!a) return '알 수 없는 동작';
  if(s.phase!=='run') return '라운드가 진행 중일 때만 할 수 있어요';
  if(a.k==='bid'){ const amt=a.n|0; if(amt<1||amt>s.coins[seat]) return `1~${s.coins[seat]}개를 걸 수 있어요`; bid(s,seat,amt); s.evn++; return null; }
  if(a.k==='check'){ if(s.coins[seat]<1) return '코인이 없어요'; s.coins[seat]--; s.checks[seat].push(Math.max(0,now(s)+s.off[seat])); visit(s,seat); s.evn++; return null; }
  if(a.k==='shift'){ if(s.coins[seat]<2) return '코인이 모자라요'; s.coins[seat]-=2; s.off[seat]+=a.d>0?4:-4; visit(s,seat); s.evn++; return null; }
  return '알 수 없는 동작'; }
function stepDelay(s){ syncH(s); if(s.winner!=null) return null;
  if(s.phase==='intro') return 2600; if(s.phase==='count') return 900;
  if(s.phase==='run'){ const e=s.ev[0]; return e ? Math.max(0, s.t0+e.t*MS-Date.now()) : 500; }
  if(s.phase==='reveal') return s.rv<SEG.length?1100:2600; return null; }
function step(s){ syncH(s);
  if(s.phase==='intro'){ startRound(s); s.evn++; return; }
  if(s.phase==='count'){ s.cnt--; if(s.cnt>0){ s.notice=`🎙️ ${s.round}라운드 — ${s.cnt}`; s.evn++; return; } beginRun(s); s.evn++; return; }
  if(s.phase==='run'){ const t=now(s);
    while(s.ev.length&&s.ev[0].t<=t+1e-6){ const e=s.ev.shift();
      if(e.k==='chime'){ s.ring=Date.now(); }
      else if(e.k==='check'){ const i=e.i; if(s.coins[i]>=1){ s.coins[i]--; const pt=t+s.off[i]; s.checks[i].push(pt); visit(s,i); const b=s.ev.find(x=>x.k==='bid'&&x.i===i&&x.seg===e.seg); if(b){ b.t=Math.max(t+.3,Math.min(LEN-.2, t+(e.target-pt))); s.ev.sort((a,b2)=>a.t-b2.t); } } }
      else if(e.k==='bid'){ bid(s,e.i,Math.min(e.amt,s.coins[e.i])); }
      else if(e.k==='end'){ settle(s); s.evn++; return; } }
    s.evn++; return; }
  if(s.phase==='reveal'){ const R=s.rounds[s.rounds.length-1]; if(s.rv<SEG.length){ const r=R.res[s.rv++], g=SEG[r.k];
      s.notice = r.win.length ? `${g[0]}-${g[1]}분 (${g[2]}점) — ${r.win.map(nm).join(', ')} 낙찰 🪙${r.mx}${r.win.length>1?` · ${r.win.length}명이 나눔 ${r.pts}점`:''}` : `${g[0]}-${g[1]}분 — 아무도 안 걸었어요`;
      s.log.push(s.notice); s.evn++; return; }
    if(s.round<ROUNDS){ startRound(s); s.evn++; return; } endGame(s); return; }
}
function endGame(s){ s.phase='over'; s.turn=null; s.rank=ALL.slice().sort((a,b)=>s.score[b]-s.score[a]); const a=s.score[HSEAT[0]], b=s.score[HSEAT[1]]; s.winner=a>b?0:b>a?1:'both'; { const V=h=>s.score[h], bv=Math.max(...HSEAT.map(V)); s.winners=HSEAT.map((h,p)=>V(h)===bv?p:-1).filter(x=>x>=0); }
  s.notice=`🎙️ 우승 ${nm(s.rank[0])} (${s.score[s.rank[0]]}점) · 꼴찌 ${nm(s.rank[N-1])}`; s.log.push(s.notice.replace('🎙️ ','🏁 ')); s.evn++; }
function mask(s,p){ syncH(s); const v=U.clone(s), me=HSEAT[p]; v.ev=[]; v.t0=null; v.off=s.off.map((x,i)=>i===me?x:null);
  if(s.phase==='run'||s.phase==='count'){ v.bids=s.bids.map((b,i)=>i===me?b:b.map(()=>null)); v.coins=s.coins.map((c,i)=>i===me?c:null); }
  v.checks=s.checks.map((c,i)=>i===me?c:c.map(()=>null)); v.elapsed=s.t0&&s.phase==='run'?Date.now()-s.t0:0; return v; }
let aiPlan=null;
function ai(v,lvl=1){ syncH(v); const seat=HSEAT[1]; if(v.phase!=='run') return null;
  if(!aiPlan||aiPlan.r!==v.round){ const left=ROUNDS-v.round+1, budget=Math.floor(v.coins[seat]/left); const val=SEG.map((g,k)=>g[2]/(1+(v.hot[k]||0)*.25)+Math.random()*2.5); const k=val.indexOf(Math.max(...val)); aiPlan={r:v.round, start:Date.now(), at:(SEG[k][0]+SEG[k][1])/2*(1+(Math.random()-.5)*.12), amt:budget, done:false}; }
  if(aiPlan.done||(Date.now()-aiPlan.start)/MS<aiPlan.at||v.coins[seat]<1) return null; aiPlan.done=true; return {k:'bid', n:Math.min(aiPlan.amt,v.coins[seat])}; }

/* 화면 */
let WHO={}, lastRing=0, betN=3, tick=null;
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}(이\(가\))?/g,(_,d,j)=>{ const n=seatName(+d,ctx); return `${seatEmoji(+d)} ${n}${j?(()=>{ const x=n.replace(/\(나\)$/,''), c=x.charCodeAt(x.length-1); return c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28?'이':'가'; })():''}`; }); }
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{}; const me=HSEAT[ctx.me]; clearInterval(tick); tick=null;
  const ringing=v.ring&&v.ring!==lastRing; if(ringing) lastRing=v.ring;
  let h=`<div class="hl-notice">${fill(U.esc(v.notice||''),ctx)}</div>`;
  const R=v.rounds[v.rounds.length-1];
  h+=`<div class="rt-table"><table><tr>${SEG.map(g=>`<th>${g[0]}-${g[1]}분</th>`).join('')}</tr><tr>${SEG.map(g=>`<td><b>${g[2]}</b></td>`).join('')}</tr>${v.bids[me]?`<tr>${SEG.map((g,k)=>`<td class="ra-my">${v.bids[me][k]?`🪙${v.bids[me][k]}`:''}</td>`).join('')}</tr>`:''}</table><small>구간마다 가장 많이 건 사람이 낙찰(같으면 나눔). 진 코인은 사라져요. 마지막 줄은 내가 건 코인.</small></div>`;
  if(v.phase==='run'||v.phase==='count'){
    h+=`<div class="rt-clock ${ringing?'ring':''}"><div class="rt-face">⏳</div><div>${v.phase==='count'?'곧 시작':'시계 없음 — 지금 몇 분일까?'}</div><small>🔔 10분마다 알림</small></div>`;
    if(v.phase==='run'){ betN=Math.max(1,Math.min(v.coins[me]||1,betN));
      h+=`<div class="vr-card"><b>🚪 투표룸</b> <small>🪙 남은 코인 ${v.coins[me]} (3라운드 전체)</small><div class="bs-amt"><button class="ghost" data-a="m">−</button><b>🪙 ${betN}</b><button class="ghost" data-a="p">+</button></div>
        <div class="fh-act"><button class="rt-go" data-a="bid" ${v.coins[me]<1?'disabled':''}>지금 구간에 ${betN}개 걸기</button></div>
        <div class="fh-act"><button class="ghost" data-a="check" ${v.coins[me]<1?'disabled':''}>🕐 시간 확인 (1)</button><button class="ghost" data-a="back" ${v.coins[me]<2?'disabled':''}>⏪ 4분 과거로 (2)</button><button class="ghost" data-a="fwd" ${v.coins[me]<2?'disabled':''}>⏩ 4분 미래로 (2)</button></div>
        ${v.checks[me].length?`<small>확인한 시간: ${v.checks[me].map(t=>`${Math.floor(t)}분`).join(', ')} · 내 시간 이동 ${v.off[me]>0?'+':''}${v.off[me]}분</small>`:''}</div>`; } }
  h+=`<div class="rt-seats">${ALL.map(i=>`<div class="rt-seat ${i===me?'me':''}"><b>${seatEmoji(i)} ${seatName(i,ctx)}</b><small>${v.score[i]}점${v.coins[i]!=null?` · 🪙${v.coins[i]}`:''}</small><span>${v.phase==='run'?`투표룸 ${v.visits[i]}번`:''}</span></div>`).join('')}</div>`;
  if(v.rounds.length) h+=`<div class="rt-res">${v.rounds.map((Rr,r)=>`<div><b>${r+1}R</b> ${Rr.res.map(x=>`${SEG[x.k][0]}-${SEG[x.k][1]}: ${x.win.length?x.win.map(seatEmoji).join('')+`🪙${x.mx}`:'-'}`).join(' · ')}</div>`).join('')}</div>`;
  if(v.phase==='over') h+=`<div class="sn-score">${v.rank.map((i,k)=>`<div class="${isH(i)?'h':''}"><b>${k+1}등 ${seatEmoji(i)} ${seatName(i,ctx)}</b> ${v.score[i]}점 · 남은 🪙${v.coins[i]}${k===0?' 🏆':''}${k===N-1?' 💀':''}</div>`).join('')}</div>`;
  const Rg=`<div class="side-box side-log"><div class="side-h">📜 진행 기록 <small>최근이 위</small></div>${v.log.slice(-40).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=`<div class="side3"><div class="side-mid">${h}</div><aside class="side-r">${Rg}</aside></div>`;
  if(ringing){ try{ const A=new (window.AudioContext||window.webkitAudioContext)(), o=A.createOscillator(), g=A.createGain(); o.frequency.value=660; o.connect(g); g.connect(A.destination); g.gain.setValueAtTime(.08,A.currentTime); g.gain.exponentialRampToValueAtTime(.001,A.currentTime+.6); o.start(); o.stop(A.currentTime+.6); }catch(_){} }
  el.onclick=e=>{ const b=e.target.closest('[data-a]'); if(!b||b.disabled) return; const k=b.dataset.a;
    if(k==='m'){ betN=Math.max(1,betN-1); return ctx.rerender(); } if(k==='p'){ betN=Math.min(v.coins[me],betN+1); return ctx.rerender(); }
    if(k==='bid') return ctx.act({k:'bid', n:betN}); if(k==='check') return ctx.act({k:'check'}); if(k==='back') return ctx.act({k:'shift',d:-1}); if(k==='fwd') return ctx.act({k:'shift',d:1}); };
}
function status(v){ return v.phase==='run'?'감으로 시간을 재고 코인을 거세요':v.phase==='over'?'':'진행 중…'; }
const guideSteps=[
  {t:'⏳ 시계 없는 60분', h:'라운드마다 60분(여기선 1분 = 1.2초, 72초). <b>시계는 안 보이고</b> 10분마다 🔔 알림만 울려요.', demo:s=>{ s.round=1; s.phase='run'; s.t0=Date.now()-14000; return s; }},
  {t:'🪙 지금 구간에 걸기', h:'투표룸에서 <b>지금 시간대 구간</b>에 코인을 몰래 걸어요. <b>여러 구간</b>에 걸어도 되고, 같은 구간에 더 얹어도 돼요.', demo:s=>{ s.round=1; s.phase='run'; s.t0=Date.now()-30000; s.bids[0][2]=3; s.coins[0]=17; return s; }},
  {t:'🏆 낙찰', h:'구간마다 <b>가장 많이 건 사람</b>이 그 구간 점수를 가져가요(같으면 나눔). <b>진 코인은 사라져요</b>. 28-32분이 10점으로 제일 커요.', demo:s=>{ s.round=1; s.phase='reveal'; s.rounds=[{res:[{k:0,win:[],mx:0},{k:1,win:[2],mx:2,pts:5},{k:2,win:[0],mx:3,pts:7},{k:3,win:[1,4],mx:5,pts:5},{k:4,win:[3],mx:4,pts:8},{k:5,win:[5],mx:1,pts:6},{k:6,win:[],mx:0}],bids:[],gain:[7,5,5,8,5,6]}]; s.score=[7,5,5,8,5,6]; s.notice='28-32분 (10점) — 2명 낙찰 🪙5 · 2명이 나눔 5점'; return s; }},
  {t:'🕐 시간 확인 · 이동', h:'<b>🕐 시간 확인</b>은 코인 1개, <b>⏪⏩ 내 시간 4분 이동</b>은 코인 2개. 코인 20개를 <b>3라운드 전체</b>에 나눠 써야 해요!', demo:s=>{ s.round=2; s.phase='run'; s.t0=Date.now()-40000; s.checks[0]=[31]; s.coins[0]=12; return s; }},
  {t:'🏁 승리', shot:false, h:'3라운드 합계 1등 우승, 꼴찌는 탈락 후보.<div class="gd-tip">다들 10점 구간에 몰리면 비싸져요 — 지난 라운드 낙찰가를 보고 덜 붐비는 구간을 싸게!</div>'},
];
const guide=`<p><b>시계 없는 시간 경매</b> (6인, 3라운드).</p><ol><li>10분마다 알림만 울려요.</li><li>지금 구간에 몰래 코인 입찰(여러 번 가능).</li><li>구간마다 최고액이 낙찰(같으면 나눔), 진 코인은 사라짐. 코인 20개를 3라운드에 나눠 써요.</li></ol><p>3라운드 합계 1등 우승.</p>`;
window.GAMES.realauction = { _sync:x=>syncH(x), maxH:6,
  title:'리얼타임 경매', ref:'피의 게임 「리얼타임 경매」', emoji:'⏱️', tags:['경매','감각','NPC','두뇌서바이벌'],
  tagline:'시계 없이 "지금" 구간에 코인을 건다. 구간마다 최고액이 점수를 가져가고 진 코인은 사라진다.',
  guide, guideSteps, init, apply, mask, ai, render, status, step, stepDelay, noPersona:true, wide:true,
  aiDelay:()=>500,
  reset(){ lastRing=0; aiPlan=null; clearInterval(tick); tick=null; },
  bar:(v,i)=>`<span class="tag">⏱️ ${v.score[HSEAT[i]]}점</span>`,
  result:(v,ctx)=>{ const k=(v.rank||[]).indexOf(HSEAT[ctx.me]); return k>=0?`${k+1}등 · ${v.score[HSEAT[ctx.me]]}점`:''; },
  _SEG:SEG,
};
})();
