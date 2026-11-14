(function(){
'use strict';
/* 리얼타임 (피의 게임 시즌 2 · 6일차 머니 챌린지) — 6인(우리 둘 + NPC 4명), 3라운드.
   시계 없이 감으로 "지금"을 고르는 게임. 라운드 60분(여기선 1분 = 1.2초, 한 라운드 72초), 5분마다 🔔 알림만 울림.
   라운드마다 딱 한 번 🚪 들어가기 — 그 순간이 속한 구간의 승점(0-10분 3 · 10-20분 5 · 20-28분 7 · 28-32분 10 · 32-40분 8 · 40-50분 6 · 50-60분 3)을
   같은 구간에 들어간 사람 수로 나눠 받음(소수점 버림). 코인 15개: 🕐 시간 확인 1개, ⏪⏩ 내 시간 2분 이동 2개(내 시계만 앞뒤로).
   들어간 구간은 라운드가 끝나야 공개. 3라운드 누적 1등 우승, 꼴찌는 탈락 후보. */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로, 나머지는 NPC */
const N=6, ROUNDS=3, MS=1200, LEN=60, COINS=15; let HSEAT=[0,3]; const SEATORD=[0,3,1,4,2,5];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i), ALL=[...Array(N).keys()];
const nm=i=>`{s${i}}`;
const SEG=[[0,10,3],[10,20,5],[20,28,7],[28,32,10],[32,40,8],[40,50,6],[50,60,3]];
const segOf=t=>{ for(let k=0;k<SEG.length;k++) if(t<SEG[k][1]) return k; return SEG.length-1; };
const DEF_P={talk:.6,aggr:.5,trust:.5,bluff:.5,logic:.6,temper:.4};
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
function init(starter,o){ const k=Math.max(2,Math.min(6,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  const s={phase:'intro', who:{}, round:0, coins:Array(N).fill(COINS), off:Array(N).fill(0), entry:Array(N).fill(null), score:Array(N).fill(0), rounds:[], t0:0, chime:0,
    checks:ALL.map(()=>[]), visits:Array(N).fill(0), ev:[], say:null, log:[], turn:null, starter, winner:null, evn:0, crowd:Array(SEG.length).fill(0),
    notice:'🎙️ 머니 챌린지 「리얼타임」 — 시계는 없습니다. 5분마다 알림만 울립니다'};
  s.hs=HSEAT.slice(); const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=ids[k]);
  return s;
}
const now=s=>(Date.now()-s.t0)/MS;   // 게임 분
function plan(s,i){ // NPC 라운드 계획: 노릴 구간(성향 + 지난 라운드 붐빔) → 들어갈 시각(감각 오차) + 확인 습관
  // 다들 10점 구간을 노릴 걸 아니까 점수에 비례해 섞어서 고름 + 지난 라운드에 붐빈 구간은 피함 + 성향
  const p=P(s,i); const w=SEG.map((g,k)=>{ let v=Math.pow(g[2],1.6)/(1+s.crowd[k]*(.4+p.logic*.6)); if(k===3) v*=1+p.aggr*.5; if(k===4||k===2) v*=1+p.logic*.3; return Math.max(.01,v); });
  let r=Math.random()*w.reduce((a,b)=>a+b,0), k=0; for(;k<w.length-1;k++){ r-=w[k]; if(r<=0) break; }
  const g=SEG[k], mid=(g[0]+g[1])/2;
  const sense=.03+(1-p.logic)*.14, bias=(Math.random()-.5)*2*sense;
  const at=Math.max(1,Math.min(59, mid*(1+bias)));
  const check = s.coins[i]>=1 && Math.random()<p.logic*.8 ? Math.max(.5, at-2-Math.random()*2) : null;
  return {k, at, check, mid}; }
function startRound(s){ s.round++; s.entry=Array(N).fill(null); s.off=Array(N).fill(0); s.checks=ALL.map(()=>[]); s.visits=Array(N).fill(0); s.chime=0; s.phase='count'; s.cnt=3; s.notice=`🎙️ ${s.round}라운드 — 3`; s.log.push(`— ${s.round}라운드 —`); }
function beginRun(s){ s.phase='run'; s.t0=Date.now(); s.ev=[];
  for(let m=5;m<LEN;m+=5) s.ev.push({t:m, k:'chime'}); s.ev.push({t:LEN, k:'end'});
  for(const i of ALL) if(!isH(i)){ const pl=plan(s,i); s.ev.push({t:pl.at, k:'enter', i}); if(pl.check!=null) s.ev.push({t:pl.check, k:'check', i, target:pl.mid}); }
  s.ev.sort((a,b)=>a.t-b.t); s.notice='⏳ 시간이 흐릅니다… (시계 없음)'; }
function visit(s,i){ s.visits[i]++; s.notice=`🚪 ${nm(i)}이(가) 투표룸에 다녀왔습니다`; }   // 확인·이동·입장 모두 똑같이 "다녀옴"으로만 보임
function enter(s,i){ const t=Math.max(0,Math.min(LEN-0.001, now(s)+s.off[i])); s.entry[i]=t; visit(s,i); }
function settle(s){ const cnt=Array(SEG.length).fill(0); for(const i of ALL) if(s.entry[i]!=null) cnt[segOf(s.entry[i])]++;
  const pts=ALL.map(i=> s.entry[i]==null?0 : Math.floor(SEG[segOf(s.entry[i])][2]/cnt[segOf(s.entry[i])]));
  for(const i of ALL) s.score[i]+=pts[i]; s.crowd=cnt.map((c,k)=>c);
  s.rounds.push({entry:s.entry.slice(), pts, cnt}); s.phase='reveal'; s.rv=0; s.notice='🎙️ 라운드 종료 — 한 명씩 공개합니다'; }
function apply(s,p,a){ syncH(s);
  if(s.winner!=null) return '게임이 끝났어요';
  const seat=HSEAT[p]; if(!a) return '알 수 없는 동작';
  if(s.phase!=='run') return '라운드가 진행 중일 때만 할 수 있어요';
  if(a.k==='enter'){ if(s.entry[seat]!=null) return '이번 라운드엔 이미 들어갔어요'; enter(s,seat); s.evn++; return null; }
  if(a.k==='check'){ if(s.coins[seat]<1) return '코인이 없어요'; s.coins[seat]--; const t=now(s)+s.off[seat]; s.checks[seat].push(Math.max(0,t)); visit(s,seat); s.evn++; return null; }
  if(a.k==='shift'){ if(s.coins[seat]<2) return '코인이 모자라요'; if(s.entry[seat]!=null) return '이미 들어갔어요'; const d=a.d>0?2:-2; s.coins[seat]-=2; s.off[seat]+=d; visit(s,seat); s.evn++; return null; }
  return '알 수 없는 동작';
}
function stepDelay(s){ syncH(s);
  if(s.winner!=null) return null;
  if(s.phase==='intro') return 2600;
  if(s.phase==='count') return 900;
  if(s.phase==='run'){ const e=s.ev[0]; return e ? Math.max(0, s.t0+e.t*MS-Date.now()) : 500; }
  if(s.phase==='reveal') return s.rv<N?1300:2600;
  return null;
}
function step(s){ syncH(s);
  if(s.phase==='intro'){ startRound(s); s.evn++; return; }
  if(s.phase==='count'){ s.cnt--; if(s.cnt>0){ s.notice=`🎙️ ${s.round}라운드 — ${s.cnt}`; s.evn++; return; } beginRun(s); s.evn++; return; }
  if(s.phase==='run'){ const t=now(s);
    while(s.ev.length&&s.ev[0].t<=t+1e-6){ const e=s.ev.shift();
      if(e.k==='chime'){ s.chime++; s.ring=Date.now(); }
      else if(e.k==='check'){ const i=e.i; if(s.entry[i]==null&&s.coins[i]>=1){ s.coins[i]--; const pt=t+s.off[i]; s.checks[i].push(pt); visit(s,i);
          // 확인한 시각으로 다시 계획: 노리던 구간 가운데에 맞춰 들어갈 시간 수정
          const ent=s.ev.find(x=>x.k==='enter'&&x.i===i); if(ent){ const want=e.target; const delta=want-pt; ent.t=Math.max(t+.3, Math.min(LEN-.2, t+delta)); s.ev.sort((a,b)=>a.t-b.t); } } }
      else if(e.k==='enter'){ if(s.entry[e.i]==null) enter(s,e.i); }
      else if(e.k==='end'){ for(const i of ALL) if(s.entry[i]==null&&isH(i)) s.log.push(`⌛ ${nm(i)} 이번 라운드 입장 안 함 (0점)`); settle(s); s.evn++; return; } }
    s.evn++; return; }
  if(s.phase==='reveal'){ const R=s.rounds[s.rounds.length-1]; if(s.rv<N){ const i=ALL[s.rv++]; const e=R.entry[i];
      s.notice = e==null ? `${nm(i)} — 입장 안 함 · 0점` : `${nm(i)} — ${Math.floor(e)}분 ${Math.floor((e%1)*60)}초 → ${SEG[segOf(e)][0]}-${SEG[segOf(e)][1]}분 구간 · ${R.pts[i]}점${R.cnt[segOf(e)]>1?` (${R.cnt[segOf(e)]}명이 나눔)`:''}`;
      s.log.push(s.notice); s.evn++; return; }
    if(s.round<ROUNDS){ startRound(s); s.evn++; return; } endGame(s); return; }
}
function endGame(s){ s.phase='over'; s.turn=null; s.rank=ALL.slice().sort((a,b)=>s.score[b]-s.score[a]); const a=s.score[HSEAT[0]], b=s.score[HSEAT[1]]; s.winner=a>b?0:b>a?1:'both'; { const V=h=>s.score[h], bv=Math.max(...HSEAT.map(V)); s.winners=HSEAT.map((h,p)=>V(h)===bv?p:-1).filter(x=>x>=0); }
  s.notice=`🎙️ 우승 ${nm(s.rank[0])} (${s.score[s.rank[0]]}점) · 탈락 후보 ${nm(s.rank[N-1])}`; s.log.push(s.notice.replace('🎙️ ','🏁 ')); s.evn++; }
function mask(s,p){ syncH(s); const v=U.clone(s), me=HSEAT[p];
  v.ev=[]; v.t0=null; v.off=s.off.map((x,i)=>i===me?x:null);
  if(s.phase==='run'){ v.entry=s.entry.map((x,i)=> i===me ? x : null); v.coins=s.coins.map((c,i)=>i===me?c:null); }   // 진행 중엔 남의 입장 여부·코인도 숨김(코인으로 확인 횟수가 드러나므로)
  v.checks=s.checks.map((c,i)=>i===me?c:c.map(()=>null));
  v.elapsedPct=null; return v; }
let aiPlan=null;
function ai(v,lvl=1){ syncH(v); const seat=HSEAT[1]; if(v.phase!=='run'||v.entry[seat]!=null) return null;
  if(!aiPlan||aiPlan.r!==v.round){ const w=SEG.map((g,k)=>Math.pow(g[2],1.6)/(1+(v.crowd[k]||0)*.7)); let r=Math.random()*w.reduce((a,b)=>a+b,0), k=0; for(;k<w.length-1;k++){ r-=w[k]; if(r<=0) break; } aiPlan={r:v.round, k, start:Date.now(), at:(SEG[k][0]+SEG[k][1])/2*(1+(Math.random()-.5)*.12)}; }
  const t=(Date.now()-aiPlan.start)/MS; return t>=aiPlan.at ? {k:'enter'} : null; }

/* 화면 */
let WHO={}, lastRing=0;
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}(이\(가\))?/g,(_,d,j)=>{ const n=seatName(+d,ctx); return `${seatEmoji(+d)} ${n}${j?(()=>{ const x=n.replace(/\(나\)$/,''), c=x.charCodeAt(x.length-1); return c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28?'이':'가'; })():''}`; }); }
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{}; const me=HSEAT[ctx.me];
  const ringing = v.ring && v.ring!==lastRing; if(ringing) lastRing=v.ring;
  let h=`<div class="hl-notice">${fill(U.esc(v.notice||''),ctx)}</div>`;
  h+=`<div class="rt-table"><table><tr>${SEG.map(g=>`<th>${g[0]}-${g[1]}분</th>`).join('')}</tr><tr>${SEG.map(g=>`<td><b>${g[2]}</b></td>`).join('')}</tr></table><small>같은 구간에 여럿이 들어가면 나눠 가져요(소수점 버림)</small></div>`;
  if(v.phase==='run'||v.phase==='count'){
    const myIn=v.entry[me];
    h+=`<div class="rt-clock ${ringing?'ring':''}"><div class="rt-face">⏳</div><div>${v.phase==='count'?'곧 시작':'시간이 흐르는 중 — 시계는 없어요'}</div><small>🔔 알림은 5분마다 (몇 번 울렸는지는 직접 세세요)</small></div>`;
    if(v.phase==='run'){
      h+= myIn==null ? `<div class="fh-act rt-act"><button class="rt-go" data-a="enter">🚪 지금 들어가기</button></div>
        <div class="fh-act"><button class="ghost" data-a="check" ${v.coins[me]<1?'disabled':''}>🕐 시간 확인 (코인 1)</button><button class="ghost" data-a="back" ${v.coins[me]<2?'disabled':''}>⏪ 2분 과거로 (코인 2)</button><button class="ghost" data-a="fwd" ${v.coins[me]<2?'disabled':''}>⏩ 2분 미래로 (코인 2)</button></div>`
        : `<div class="py-line">✅ ${Math.floor(myIn)}분 ${Math.floor((myIn%1)*60)}초에 들어갔어요 → ${SEG[segOf(myIn)][0]}-${SEG[segOf(myIn)][1]}분 구간 (${SEG[segOf(myIn)][2]}점, 나눌 수도)</div>`;
      h+=`<div class="info">🪙 코인 ${v.coins[me]} · 내 시간 이동 ${v.off[me]>0?'+':''}${v.off[me]}분 ${v.checks[me].length?`· 확인한 시간: ${v.checks[me].map(t=>`${Math.floor(t)}분`).join(', ')}`:''}</div>`; }
  }
  h+=`<div class="rt-seats">${ALL.map(i=>`<div class="rt-seat ${i===me?'me':''}"><b>${seatEmoji(i)} ${seatName(i,ctx)}</b><small>${v.score[i]}점${v.coins[i]!=null?` · 🪙${v.coins[i]}`:''}</small><span>${v.phase==='run'?(i===me?(v.entry[i]!=null?'🚪 입장함':'…'):`투표룸 ${v.visits[i]}번`):''}</span></div>`).join('')}</div>`;
  if(v.rounds.length) h+=`<div class="rt-res">${v.rounds.map((R,r)=>`<div><b>${r+1}R</b> ${ALL.map(i=>`${seatEmoji(i)} ${R.entry[i]==null?'-':SEG[segOf(R.entry[i])][0]+'-'+SEG[segOf(R.entry[i])][1]} <small>${R.pts[i]}</small>`).join(' · ')}</div>`).join('')}</div>`;
  if(v.phase==='over') h+=`<div class="sn-score">${v.rank.map((i,k)=>`<div class="${isH(i)?'h':''}"><b>${k+1}등 ${seatEmoji(i)} ${seatName(i,ctx)}</b> ${v.score[i]}점${k===0?' 🏆':''}${k===N-1?' 💀 탈락 후보':''}</div>`).join('')}</div>`;
  const R=`<div class="side-box side-log"><div class="side-h">📜 진행 기록 <small>최근이 위</small></div>${v.log.slice(-40).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=`<div class="side3"><div class="side-mid">${h}</div><aside class="side-r">${R}</aside></div>`;
  if(ringing){ try{ const A=new (window.AudioContext||window.webkitAudioContext)(), o=A.createOscillator(), g=A.createGain(); o.frequency.value=880; o.connect(g); g.connect(A.destination); g.gain.setValueAtTime(.08,A.currentTime); g.gain.exponentialRampToValueAtTime(.001,A.currentTime+.5); o.start(); o.stop(A.currentTime+.5); }catch(_){} }
  el.onclick=e=>{ const b=e.target.closest('[data-a]'); if(!b||b.disabled) return; const k=b.dataset.a;
    if(k==='enter') return ctx.act({k:'enter'}); if(k==='check') return ctx.act({k:'check'}); if(k==='back') return ctx.act({k:'shift',d:-1}); if(k==='fwd') return ctx.act({k:'shift',d:1}); };
}
function status(v,ctx){ syncH(v); const me=HSEAT[ctx.me]; if(v.phase==='run'&&v.entry[me]==null) return '감으로 시간을 재세요'; return v.phase==='over'?'':'진행 중…'; }
const guide=`
<p><b>시계 없이 감으로 "지금"을 고르기</b> (우리 둘 + 컴퓨터 플레이어 4명, ${ROUNDS}라운드).</p>
<ol><li>라운드는 60분(여기선 1분 = 1.2초, 한 라운드 약 72초). <b>시계는 안 보여요</b> — 5분마다 🔔 알림만 울려요.</li>
<li>라운드마다 딱 한 번 <b>🚪 들어가기</b>. 그 순간이 속한 구간의 승점을 받아요:<br>0-10분 3 · 10-20분 5 · 20-28분 7 · <b>28-32분 10</b> · 32-40분 8 · 40-50분 6 · 50-60분 3</li>
<li><b>같은 구간에 여럿</b>이 들어가면 승점을 사람 수로 나눠요(소수점 버림). 누가 어디 들어갔는지는 라운드가 끝나야 공개!</li>
<li>코인 ${COINS}개: <b>🕐 시간 확인</b> 1개 · <b>⏪⏩ 내 시간 2분 이동</b> 2개(내 시계만 앞뒤로 — 늦었을 때 되돌리기).</li></ol>
<p>${ROUNDS}라운드 누적 1등 🏆, 꼴찌 💀 탈락 후보. 사람끼리는 점수가 가장 높은 사람이 승리.</p>
<div class="tipbox">💡 모두 28-32분(10점)을 노리면 나눠 먹다 2~3점이 돼요. 덜 붐빌 구간을 노리는 것도 방법 — 지난 라운드 결과를 보세요!</div>`;
window.GAMES.realtime = { _sync:x=>syncH(x), maxH:6,
  title:'리얼타임', ref:'피의 게임 「리얼타임」', emoji:'⏳', tags:['감각','눈치','NPC','두뇌서바이벌'],
  tagline:'시계 없이 5분마다 울리는 알림만으로 "지금"을 고른다. 10점 구간은 모두가 노린다.',
  guide, init, apply, mask, ai, render, status, step, stepDelay, noPersona:true, wide:true,
  aiDelay:()=>500,
  reset(){ lastRing=0; aiPlan=null; },
  bar:(v,i)=>`<span class="tag">⏳ ${v.score[HSEAT[i]]}점</span>`,
  result:(v,ctx)=>{ const k=(v.rank||[]).indexOf(HSEAT[ctx.me]); return k>=0?`${k+1}등 · ${v.score[HSEAT[ctx.me]]}점`:''; },
  _SEG:SEG,
};
})();
