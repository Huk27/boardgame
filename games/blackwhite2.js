(function(){
'use strict';
/* 흑과 백 Ⅱ (더 지니어스 시즌 3 · 1회 데스매치) — 1:1.
   각자 99포인트. 9라운드 동안 선이 먼저, 후가 이어서 원하는 만큼 포인트를 몰래 냄(쓴 포인트는 사라짐). 더 많이 낸 쪽 +1점, 다음 라운드 선. 같으면 점수 없이 선 유지.
   상대가 낸 포인트는 한 자리(0~9)면 ⚫ 검정, 두 자리(10~)면 ⚪ 하양으로만 보임. 남은 포인트는 표시등 5칸(20씩)으로만 보이고, 내는 순간 바로 바뀜.
   5점 먼저 얻으면 즉시 승리, 9라운드 뒤 점수가 높은 쪽 승리. 동점이면 33포인트씩 새로 받아 3라운드 연장. */
const START=99, ROUNDS=9, WIN=5, EXTRA=33, EXR=3;
const lamp=p=>Math.min(4,Math.floor(p/20))+1; /* 1~5칸 */
const col=b=>b<10?'B':'W';
function init(starter){ return {phase:'intro', starter:starter|0, round:0, extra:false, pts:[START,START], score:[0,0], first:starter|0, bid:[null,null], hist:[], turn:null, winner:null, ev:0, log:[], notice:'🎙️ 데스매치 「흑과 백 Ⅱ」 — 99포인트로 9라운드, 5승 먼저'}; }
function startRound(s){ s.round++; s.bid=[null,null]; s.lampStart=s.pts.map(lamp); s.phase='bid1'; s.turn=s.first; s.notice=`🎙️ ${s.extra?'연장 ':''}${s.round}라운드 — ${['A','B'][s.first]} 먼저`; }
function apply(s,p,a){ if(s.winner!=null) return '게임이 끝났어요'; if(!a||a.k!=='bid') return '알 수 없는 동작';
  if(!((s.phase==='bid1'&&p===s.first)||(s.phase==='bid2'&&p!==s.first))) return '내 차례가 아니에요';
  const b=a.b|0; if(b<0||b>s.pts[p]) return `0~${s.pts[p]} 사이로`; s.bid[p]=b; s.pts[p]-=b;
  if(s.phase==='bid1'){ s.phase='bid2'; s.turn=1-p; s.notice=`${['A','B'][p]}: ${col(b)==='B'?'⚫ 검정':'⚪ 하양'} — 이제 ${['A','B'][1-p]} 차례`; }
  else { s.phase='res'; s.turn=null; const [x,y]=s.bid; const w=x>y?0:y>x?1:-1; if(w>=0){ s.score[w]++; s.first=w; }
    s.hist.push({r:s.round,extra:s.extra,c:[col(x),col(y)],w,b:[x,y],first:1-p});
    s.notice = w<0 ? '🤝 무승부 — 점수 없음, 선 유지' : `${['A','B'][w]} 승리! (${s.score[0]} : ${s.score[1]})`; s.log.push(`${s.extra?'연장':''}${s.round}R ${col(x)==='B'?'⚫':'⚪'}${col(y)==='B'?'⚫':'⚪'} → ${w<0?'무':['A','B'][w]}`); }
  s.ev++; return null; }
function stepDelay(s){ if(s.winner!=null) return null; if(s.phase==='intro') return 1800; if(s.phase==='res') return 2400; return null; }
function step(s){ if(s.phase==='intro'){ startRound(s); s.ev++; return; }
  if(s.phase==='res'){ const [a,b]=s.score; const lim=s.extra?EXR:ROUNDS;
    if(!s.extra&&(a>=WIN||b>=WIN)){ return end(s,a>b?0:1,`${Math.max(a,b)}승 선착`); }
    if(s.round>=lim){ if(a!==b) return end(s,a>b?0:1,`최종 ${a} : ${b}`); if(s.extra) return end(s,'both','연장까지 동점'); s.extra=true; s.round=0; s.pts=[EXTRA,EXTRA]; s.score=[0,0]; s.log.push('🔁 동점 — 33포인트씩 새로 받아 3라운드 연장'); }
    startRound(s); s.ev++; } }
function end(s,w,why){ s.phase='over'; s.turn=null; s.winner=w; s.notice=`🏁 ${why}`; s.log.push(s.notice); s.ev++; }
function mask(s,p){ const v=U.clone(s), o=1-p; if(s.phase!=='over'){ v.pts=s.pts.map((x,i)=>i===p?x:null); v.lamp=s.pts.map(lamp); v.bid=s.bid.map((b,i)=>i===p?b:(b==null?null:col(b))); v.hist=s.hist.map(h=>({r:h.r,extra:h.extra,c:h.c,w:h.w,first:h.first,mine:h.b[p]})); } else v.lamp=s.pts.map(lamp); return v; }
/* 컴퓨터: 상대 표시등 변화와 색으로 상대가 낸 범위를 좁힘 */
let MEM={};
function oppRange(v,me){ const o=1-me; /* 기록으로 상대 남은 포인트 범위 추정 */ let lo=0, hi=v.extra?EXTRA:START; const lv=v.lamp[o]; lo=Math.max(lo,(lv-1)*20); hi=Math.min(hi,lv===5?99:lv*20-1); return [lo,hi]; }
function aiSeat(v,me,lvl){ lvl=lvl==null?1:lvl; const o=1-me, my=v.pts[me]; const need=Math.max(1,WIN-v.score[me]), oppNeed=Math.max(1,WIN-v.score[o]); const lim=v.extra?EXR:ROUNDS; const left=lim-v.round+1;
  const budget=my/Math.max(1,Math.min(need,left)); const [olo,ohi]=oppRange(v,me);
  if(lvl===0&&Math.random()<.35) return {k:'bid',b:Math.min(my,Math.random()*Math.min(my,40)|0)};
  if(v.phase==='bid1'){ /* 선: 가끔 ⚫로 미끼, 아니면 예산 근처 ⚪ */ const press = oppNeed<=1 ? 1.4 : 1;
    if(my<10) return {k:'bid',b:my}; if(Math.random()<(lvl===2?.22:.15)&&left>need) return {k:'bid',b:Math.random()*10|0};
    let b=Math.round(budget*press*(.8+Math.random()*.5)); b=Math.max(10,Math.min(my,b, ohi+ (lvl===2?1:Math.random()*10|0))); return {k:'bid',b}; }
  /* 후: 상대 색과 표시등 변화로 판단 */
  const oc=v.bid[o]; const L0=(v.lampStart||v.lamp)[o], L1=v.lamp[o]; const top=v.extra?EXTRA:START; const preHi=L0===5?top:L0*20-1, preLo=(L0-1)*20, postHi=L1===5?top:L1*20-1, postLo=(L1-1)*20;
  if(oc==='B'){ if(my>=10&&Math.random()<.85) return {k:'bid',b:10}; return {k:'bid',b:Math.min(my,9)}; }
  /* 하양: 상대가 낸 범위 [10, 상대 남은 최대] — 표시등이 떨어졌으면 큰 값 */
  const lo2=Math.max(10,preLo-postHi), hi2=Math.max(lo2,Math.min(preHi-postLo, lvl===0?60:99));
  const est = lvl===2 ? Math.round(lo2+(hi2-lo2)*.55) : Math.min(hi2, Math.round((lo2+Math.min(hi2,budget*1.6))/2));
  const winCost = (hi2-lo2<=8&&hi2+1<=my) ? hi2+1 : est+1+(lvl===2?Math.round((hi2-est)*.35):0);
  if(winCost<=my&&(winCost<=budget*1.5||oppNeed<=1)) return {k:'bid',b:Math.min(my,winCost)};
  return {k:'bid',b:0}; }
function ai(v,lvl){ const me=1; if(v.phase==='bid1'&&v.turn===me) return aiSeat(v,me,lvl); if(v.phase==='bid2'&&v.turn===me) return aiSeat(v,me,lvl); return null; }
function aiDelay(S){ return 1400+Math.random()*2200; }

/* 화면 */
let bv=0, sig='';
const lampHtml=n=>`<span class="bw-lamp">${[1,2,3,4,5].map(k=>`<i class="${k<=n?'on':''}"></i>`).join('')}</span>`;
function render(el,v,ctx){
  const me=ctx.me, o=1-me, nm=p=>p===me?'나':U.esc(ctx.name(p)), AB=t=>String(t).replace(/\bA\b/g,nm(0)).replace(/\bB\b/g,nm(1));
  const sg=v.round+':'+v.phase+':'+v.extra; if(sg!==sig){ sig=sg; bv=Math.min(v.pts[me]||0,10); }
  const my=v.turn===me&&(v.phase==='bid1'||v.phase==='bid2');
  let h=`<div class="hl-notice">${U.esc(AB(v.notice||''))}</div>`;
  h+=`<div class="info">${v.extra?'연장 ':''}${Math.max(1,v.round)}/${v.extra?EXR:ROUNDS}라운드 · 점수 나 <b>${v.score[me]}</b> : <b>${v.score[o]}</b> ${nm(o)} · ${WIN}승 먼저</div>`;
  h+=`<div class="bw-board"><div class="bw-p"><b>${nm(o)}</b> ${lampHtml(v.lamp[o])} <small>${v.phase!=='over'?'남은 포인트 ?':v.pts[o]+'점 남음'}</small><div class="bw-cur">${v.bid[o]==null?'':v.bid[o]==='B'?'⚫':v.bid[o]==='W'?'⚪':(v.bid[o]<10?'⚫':'⚪')}</div></div>
    <div class="bw-p me"><b>나</b> ${lampHtml(v.lamp[me])} <small>남은 포인트 <b>${v.pts[me]}</b></small><div class="bw-cur">${v.bid[me]==null?'':`${v.bid[me]<10?'⚫':'⚪'} ${v.bid[me]}`}</div></div></div>`;
  h+=`<div class="bw-hist">${v.hist.map(x=>`<span class="${x.w===me?'w':x.w===o?'l':''}">${x.extra?'연':''}${x.r} ${x.c[me]==='B'?'⚫':'⚪'}${x.mine!=null?`<small>${x.mine}</small>`:''} vs ${x.c[o]==='B'?'⚫':'⚪'}</span>`).join('')}</div>`;
  if(my){ const mx=v.pts[me]; bv=Math.max(0,Math.min(bv,mx));
    h+=`<div class="vr-card"><b>${v.phase==='bid1'?'🎯 선 — 먼저 내세요':`🎯 후 — 상대는 ${v.bid[o]==='B'?'⚫ 검정(0~9)':'⚪ 하양(10 이상)'}`}</b>
      <div class="bw-in"><input type="range" min="0" max="${mx}" value="${bv}" data-r><b>${bv}</b> <span>${bv<10?'⚫':'⚪'}</span></div>
      <div class="fh-act">${[0,9,10,20,30].filter(x=>x<=mx).map(x=>`<button class="ghost" data-q="${x}">${x}</button>`).join('')}<button data-a="bid">${bv} 내기</button></div><small>낸 포인트는 사라져요. 상대에겐 색과 표시등만 보여요.</small></div>`; }
  else if(v.phase==='bid1'||v.phase==='bid2') h+=`<div class="vr-card bm-wait"><b>${nm(o)} 고민 중…</b></div>`;
  if(v.phase==='over') h+=`<div class="sn-score"><div class="h"><b>나</b> ${v.score[me]}승</div><div><b>${nm(o)}</b> ${v.score[o]}승</div></div><div class="bw-hist">${v.hist.map(x=>`<span>${x.r}: ${x.b?`${x.b[me]} vs ${x.b[o]}`:''}</span>`).join('')}</div>`;
  el.innerHTML=h;
  el.oninput=e=>{ if(e.target.matches('[data-r]')){ bv=+e.target.value; const b=el.querySelector('.bw-in b'), sp=el.querySelector('.bw-in span'), btn=el.querySelector('[data-a="bid"]'); if(b) b.textContent=bv; if(sp) sp.textContent=bv<10?'⚫':'⚪'; if(btn) btn.textContent=`${bv} 내기`; } };
  el.onclick=e=>{ const q=e.target.closest('[data-q]'); if(q){ bv=+q.dataset.q; return ctx.rerender(); } const a=e.target.closest('[data-a]'); if(a) return ctx.act({k:'bid',b:bv}); };
}
function status(v,ctx){ if(v.phase==='over') return ''; return v.turn===ctx.me?'포인트를 내세요':'상대 차례'; }
const guide=`
<p><b>보이지 않는 포인트 싸움</b> — 1:1.</p>
<ol><li>각자 <b>99포인트</b>. 9라운드 동안 선이 먼저, 후가 이어서 원하는 만큼 몰래 내요(쓴 포인트는 사라짐).</li>
<li>더 많이 낸 쪽 <b>+1점</b>, 다음 라운드 선. 같으면 점수 없이 선 유지.</li>
<li>상대가 낸 포인트는 <b>⚫ 검정</b>(0~9) / <b>⚪ 하양</b>(10 이상)으로만 보여요.</li>
<li>남은 포인트는 <b>표시등 5칸</b>(20씩)으로만 보이고, 내는 순간 바로 바뀌어요 — 후는 선의 표시등 변화를 보고 판단!</li>
<li><b>5승</b> 먼저 즉시 승리. 9라운드 뒤 동점이면 33포인트씩 새로 받아 3라운드 연장.</li></ol>
<div class="tipbox">💡 <b>팁</b><br>· 상대가 ⚫면 10만 내도 이겨요 — 그래서 ⚫는 '포기' 또는 '미끼'.<br>· 상대 표시등이 한 칸 꺼졌다면 크게 낸 거예요.</div>`;
const guideSteps=[
  {t:'⚫⚪ 색만 보인다', h:'상대가 낸 포인트는 <b>한 자리 ⚫ / 두 자리 ⚪</b>로만 보여요.', demo:s=>{ startRound(s); s.bid[1]=7; s.phase='bid2'; s.turn=0; s.first=1; s.pts[1]=92; return s; }},
  {t:'💡 표시등', h:'남은 포인트는 <b>표시등 5칸</b>(20씩). 선이 내는 순간 바로 바뀌어 후가 볼 수 있어요.', demo:s=>{ startRound(s); s.pts=[99,58]; s.bid[1]=41; s.phase='bid2'; s.turn=0; s.first=1; return s; }},
  {t:'🏆 5승 먼저', h:'더 많이 낸 쪽 +1, <b>5승</b> 먼저 승리. 9라운드 뒤 동점이면 33포인트로 연장.', demo:s=>{ s.round=6; s.score=[4,2]; s.hist=[{r:1,c:['W','W'],w:0,first:0},{r:2,c:['B','W'],w:1,first:0}]; s.phase='bid1'; s.turn=0; return s; }},
];
window.GAMES.blackwhite2 = {
  title:'흑과 백 Ⅱ', ref:'더 지니어스 「흑과 백 Ⅱ」', emoji:'⚫', tags:['심리전','블러핑','포인트','두뇌서바이벌'],
  tagline:'99포인트, 보이는 건 색과 표시등뿐 — 상대가 얼마를 냈는지 읽어라.',
  guide, guideSteps, init, apply, mask, ai, aiDelay, render, status, step, stepDelay,
  reset(){ MEM={}; bv=0; sig=''; },
  bar:(v,i)=>`<span class="tag">${v.score[i]}승</span>`,
  result:(v,ctx)=>`${v.score[ctx.me]} : ${v.score[1-ctx.me]}`,
  pulse:v=>v.score[1]-v.score[0],
  _aiSeat:aiSeat,
};
})();
