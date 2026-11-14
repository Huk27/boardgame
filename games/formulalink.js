(function(){
'use strict';
/* 수식 링크 (피의 게임 시즌 3 · 6일차 메인 매치) — 1:1로 다듬음.
   봉투 수색: 5라운드 동안 라운드마다 봉투 6개(겉면엔 첫 칸의 문양만 보임)를 번갈아 3개씩 가져감. 카드는 나만 봄.
   카드: 숫자 한 칸(0~9) 또는 두 칸(숫자+기호 / 기호+숫자). 칸마다 문양(♣ ◆ ♥ ▼).
   수식: 내 카드를 원하는 순서로 이어 붙여 왼쪽부터 차례로 계산(곱셈 먼저 아님). 붙어 있는 숫자 칸은 한 수(1·2 → 12). 숫자로 시작·끝, 기호 연속 금지, 나눗셈은 나누어떨어질 때만.
   값이 정확히 100이면 100점 + 문양 보너스(쓴 칸 중 같은 문양 n개: 3~4개 n×5, 5~6개 n×10, 7개+ n×15, ▼는 두 배). 아니면 0점. 동점이면 먼저 제출한 쪽 승리. */
const ROUNDS=5, ENV=6, BUILD=180000;
const SUITS=['♣','◆','♥','▼'], SCL=['c','d','h','s'], OPS=['+','−','×','÷'];
function mkCard(id){ const r=Math.random(); const suit=()=>Math.random()<.16?3:(Math.random()*3|0); const dig=()=>{ const x=Math.random(); return x<.12?0:1+(Math.random()*9|0); };
  const op=()=>{ const x=Math.random(); return x<.36?'+':x<.6?'−':x<.9?'×':'÷'; };
  if(r<.42) return {id, cells:[{t:'n',v:dig(),s:suit()}]};
  if(r<.72) return {id, cells:[{t:'n',v:dig(),s:suit()},{t:'o',v:op(),s:suit()}]};
  return {id, cells:[{t:'o',v:op(),s:suit()},{t:'n',v:dig(),s:suit()}]}; }
/* 식 계산: cells 배열 → 값 또는 null */
function evalCells(cells){ if(!cells.length) return null; let acc=null, op=null, num=null;
  const flush=()=>{ if(num==null) return false; if(acc==null) acc=num; else { if(op==='+') acc+=num; else if(op==='−') acc-=num; else if(op==='×') acc*=num; else if(op==='÷'){ if(num===0||acc%num!==0) return false; acc/=num; } } num=null; return true; };
  for(const c of cells){ if(c.t==='n'){ num = num==null ? c.v : num*10+c.v; if(num>99) return null; } else { if(num==null) return null; if(!flush()) return null; op=c.v; } }
  if(num==null) return null; if(!flush()) return null; return acc; }
function bonusOf(cells){ const n=[0,0,0,0]; cells.forEach(c=>n[c.s]++); let b=0; const det=[];
  n.forEach((k,s)=>{ const m = k>=7?15 : k>=5?10 : k>=3?5 : 0; const g=m*k*(s===3?2:1); if(g) det.push(`${SUITS[s]}${k}개 +${g}`); b+=g; }); return {b,det,n}; }
const cellsOf=(cards)=>cards.flatMap(c=>c.cells);
function scoreOf(cards){ const cl=cellsOf(cards), v=evalCells(cl); if(v!==100) return {v, ok:false, pts:0, bonus:{b:0,det:[]}}; const bo=bonusOf(cl); return {v, ok:true, pts:100+bo.b, bonus:bo}; }

function init(starter){
  let nid=0; const env=[]; for(let r=0;r<ROUNDS;r++){ env.push([...Array(ENV)].map(()=>mkCard(nid++))); }
  return {phase:'intro', starter:starter|0, round:0, env, taken:[], hand:[[],[]], picks:0, turn:null, until:0, sub:[null,null], subAt:[null,null], res:null, log:[], winner:null, ev:0,
    notice:'🎙️ 메인 매치 「수식 링크」 — 봉투를 모아 100을 만드세요'};
}
function startRound(s){ s.round++; s.taken=[]; s.picks=0; const f=(s.starter+s.round-1)%2; s.first=f; s.turn=f; s.phase='draft';
  s.notice=`📦 ${s.round}라운드 수색 — 봉투 ${ENV}개, 겉면엔 첫 칸 문양만 보여요. ${['A','B'][f]}부터 번갈아 3개씩`; s.log.push(s.notice); }
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요'; if(!a) return '알 수 없는 동작';
  if(a.k==='take'){ if(s.phase!=='draft') return '지금은 수색 시간이 아니에요'; if(s.turn!==p) return '상대 차례예요'; const k=a.e|0; const cur=s.env[s.round-1];
    if(!(k>=0&&k<cur.length)||s.taken.includes(k)) return '남은 봉투를 고르세요';
    s.taken.push(k); s.hand[p].push(cur[k]); s.picks++; s.log.push(`📦 ${['A','B'][p]}: ${SUITS[cur[k].cells[0].s]} 봉투 가져감`);
    s.notice=`📦 ${['A','B'][p]}이(가) ${SUITS[cur[k].cells[0].s]} 봉투를 가져갔어요 (${s.picks}/${ENV})`;
    s.turn = s.picks>=ENV ? null : 1-p; s.ev++; return null; }
  if(a.k==='submit'){ if(s.phase!=='build') return '지금은 제출할 때가 아니에요'; if(s.sub[p]) return '이미 제출했어요';
    const ids=(a.ids||[]).map(x=>x|0); if(new Set(ids).size!==ids.length) return '같은 카드를 두 번 쓸 수 없어요';
    const cards=ids.map(id=>s.hand[p].find(c=>c.id===id)); if(cards.some(c=>!c)) return '내 카드만 쓸 수 있어요';
    s.sub[p]=ids; s.subAt[p]=Date.now(); s.log.push(`📮 ${['A','B'][p]} 수식판 제출 (${s.sub[0]&&s.sub[1]?'둘 다 제출':'먼저'})`); s.notice=`📮 ${['A','B'][p]}이(가) 수식판을 제출했어요`; s.ev++; return null; }
  return '알 수 없는 동작';
}
function stepDelay(s){ if(s.winner!=null) return null;
  if(s.phase==='intro') return 2200;
  if(s.phase==='draft') return s.picks>=ENV ? 1500 : null;
  if(s.phase==='build') return (s.sub[0]&&s.sub[1]) ? 800 : Math.max(50,s.until-Date.now());
  if(s.phase==='reveal') return s.ri<4?2200:1800;
  return null; }
function step(s){
  if(s.phase==='intro'){ startRound(s); s.ev++; return; }
  if(s.phase==='draft'&&s.picks>=ENV){ if(s.round<ROUNDS){ startRound(s); } else { s.phase='build'; s.turn=null; s.until=Date.now()+BUILD; s.notice=`🧮 수색 끝! ${BUILD/1000}초 안에 수식판을 만들어 제출하세요 — 값이 정확히 100`; s.log.push(s.notice); } s.ev++; return; }
  if(s.phase==='build'){ if(!(s.sub[0]&&s.sub[1])&&Date.now()<s.until) return;
    s.phase='reveal'; s.ri=0; s.res=[0,1].map(p=>{ const cards=(s.sub[p]||[]).map(id=>s.hand[p].find(c=>c.id===id)); return Object.assign(scoreOf(cards),{cards}); }); s.notice='🎙️ 수식판 공개!'; s.ev++; return; }
  if(s.phase==='reveal'){ const order=[0,1].sort((a,b)=>(s.subAt[a]||9e15)-(s.subAt[b]||9e15));
    if(s.ri<2){ const p=order[s.ri], r=s.res[p]; s.notice=`🧮 ${['A','B'][p]}의 수식 = ${r.v==null?'계산 불가':r.v}${r.ok?' ✅ 100!':' ❌'}`; s.log.push(s.notice); s.shown=(s.shown||[]).concat([p]); s.ri++; s.ev++; return; }
    if(s.ri<4){ const p=order[s.ri-2], r=s.res[p]; s.notice=`🏅 ${['A','B'][p]}: ${r.ok?`100 + 문양 보너스 ${r.bonus.b} = ${r.pts}점${r.bonus.det.length?` (${r.bonus.det.join(', ')})`:''}`:'0점'}`; s.log.push(s.notice); s.ri++; s.ev++; return; }
    const a=s.res[0].pts, b=s.res[1].pts; let w = a>b?0 : b>a?1 : 'both'; if(w==='both'&&a>0){ w = (s.subAt[0]||9e15)<=(s.subAt[1]||9e15)?0:1; }
    s.phase='over'; s.winner=w; s.notice = w==='both' ? '🏁 둘 다 100을 못 만들었어요 — 무승부' : `🏁 ${['A','B'][w]} 승리!${a===b?' (동점 — 먼저 제출)':''}`; s.log.push(s.notice); s.ev++; return; }
}
function mask(s,p){ const v=U.clone(s), o=1-p, open=s.phase==='over'||s.phase==='reveal';
  v.env=s.env.map((r,k)=>r.map((c,j)=> k>=s.round ? {id:c.id, face:null, hidden:true} : (k===s.round-1&&!s.taken.includes(j)) ? {id:c.id, face:c.cells[0].s, hidden:true} : {id:c.id, face:c.cells[0].s, gone:true}));
  if(!open) v.hand[o]=s.hand[o].map(c=>({id:c.id, face:c.cells[0].s, hidden:true}));
  if(!open){ v.sub[o]=s.sub[o]?'done':null; v.res=null; }
  if(s.phase==='reveal'){ v.res=s.res.map((r,k)=> (s.shown||[]).includes(k)?r:null); }
  return v; }
/* 컴퓨터: 봉투는 문양만 보고, 수식은 내 카드로 찾기(실력 = 찾아보는 양) */
function suitPlan(hand){ const n=[0,0,0,0]; hand.forEach(c=>c.cells.forEach(x=>n[x.s]++)); return n; }
function pickEnv(v,me,lvl){ const cur=v.env[v.round-1]; const n=suitPlan(v.hand[me]); const free=cur.map((c,j)=>j).filter(j=>!v.taken.includes(j));
  if(lvl===0) return U.pick(free);
  const top=n.indexOf(Math.max(...n)); const opp=v.hand[1-me].map(c=>c.face);
  return free.sort((a,b)=>sc(cur[b])-sc(cur[a]))[0];
  function sc(c){ const s=c.face; return (s===3?2.2:0) + (n[s]||0)*.6 + (s===top?1.2:0) + (lvl===2?opp.filter(x=>x===s).length*.3:0) + Math.random()*(lvl===2?.4:1.2); } }
function bestFormula(hand,budget){ let best=null, bv=-1, nodes=0; const N=hand.length; const used=Array(N).fill(false);
  const order=hand.map((c,k)=>k);
  function dfs(seq,cells){ if(nodes++>budget) return; if(cells.length&&cells[cells.length-1].t==='n'){ const v=evalCells(cells); if(v===100){ const b=bonusOf(cells).b; if(b>bv){ bv=b; best=seq.slice(); } } }
    if(cells.length>=16) return;
    for(const k of U.shuffle(order.slice())){ if(used[k]) continue; const c=hand[k]; const last=cells[cells.length-1];
      if(!cells.length&&c.cells[0].t==='o') continue; if(last&&last.t==='o'&&c.cells[0].t==='o') continue;
      const nc=cells.concat(c.cells); if(nc[nc.length-1].t==='n'||nc.length>1){ const part=nc[nc.length-1].t==='n'?evalCells(nc):evalCells(nc.slice(0,-1)); if(part==null||Math.abs(part)>5000) continue; }
      used[k]=true; seq.push(c.id); dfs(seq,nc); seq.pop(); used[k]=false; if(nodes>budget) return; } }
  for(let r=0;r<4&&nodes<=budget;r++) dfs([],[]);
  return best; }
const LV=[{bud:4000,t:[100,170]},{bud:40000,t:[70,140]},{bud:250000,t:[45,110]}];
let MEM={};
function ai(v,lvl){ const L=LV[lvl==null?1:lvl];
  if(v.phase==='draft'&&v.turn===1) return {k:'take', e:pickEnv(v,1,lvl==null?1:lvl)};
  if(v.phase==='build'&&!v.sub[1]){ if(MEM.key!==v.until){ const f=bestFormula(v.hand[1],L.bud); MEM={key:v.until, f, at:Date.now()+1000*(L.t[0]+Math.random()*(L.t[1]-L.t[0]))*(f?1:1.2)}; }
    if(v.sub[0]&&!MEM.rushed){ MEM.rushed=true; const left=MEM.at-Date.now(); if(left>15000) MEM.at=Date.now()+left*.5; }
    if(Date.now()<Math.min(MEM.at, v.until-4000)) return null; return {k:'submit', ids: MEM.f||[]}; }
  return null; }
function aiDelay(S){ if(S.phase==='draft') return 1100+Math.random()*1700; if(S.phase==='build'&&MEM.at) return Math.max(400,Math.min(3000,MEM.at-Date.now())); return 1500; }

/* 화면 */
let line=[], lkey='', tick=null;
const cellHtml=c=>`<span class="fl-cell ${SCL[c.s]} ${c.t==='o'?'op':''}"><b>${c.v}</b><i>${SUITS[c.s]}</i></span>`;
const cardHtml=(c,attr,cls)=>`<button class="fl-card ${cls||''}" ${attr||''}>${c.cells.map(cellHtml).join('')}</button>`;
function render(el,v,ctx){
  const me=ctx.me, o=1-me, nm=p=>p===me?'나':U.esc(ctx.name(p)), AB=t=>String(t).replace(/\bA\b/g,nm(0)).replace(/\bB\b/g,nm(1));
  const key=v.starter+':'+v.env.length+':'+v.env[0][0].id; if(lkey!==key){ lkey=key; line=[]; }
  const hand=v.hand[me]; line=line.filter(id=>hand.some(c=>c.id===id));
  clearInterval(tick); tick=null; if(v.phase==='build'&&!v.sub[me]) tick=setInterval(()=>{ const e=document.getElementById('flT'); if(e) e.textContent=Math.max(0,Math.ceil((v.until-Date.now())/1000))+'초'; else { clearInterval(tick); tick=null; } },500);
  let h=`<div class="hl-notice">${U.esc(AB(v.notice||''))}</div>`;
  h+=`<div class="info">${v.phase==='draft'?`${v.round}/${ROUNDS}라운드 수색`:v.phase==='build'?`🧮 수식판 만들기 · ⏱️ <b id="flT">${Math.max(0,Math.ceil((v.until-Date.now())/1000))}초</b>`:''} · 내 카드 ${hand.length}장 · ${nm(o)} ${v.hand[o].length}장</div>`;
  if(v.phase==='draft'){ const cur=v.env[v.round-1]; const my=v.turn===me;
    h+=`<div class="fl-envs">${cur.map((c,j)=>`<button class="fl-env ${SCL[c.face]} ${c.gone?'gone':''}" data-e="${j}" ${my&&!c.gone?'':'disabled'}><b>${SUITS[c.face]}</b><small>${c.gone?'가져감':'봉투'}</small></button>`).join('')}</div>
      <div class="bm-sub">${my?'가져갈 봉투를 누르세요 — 안에 한 칸 또는 두 칸 카드가 있어요':`${nm(o)}이(가) 고르는 중…`}</div>`;
    h+=`<div class="fl-opp"><small>${nm(o)}이(가) 가져간 봉투 겉면</small> ${v.hand[o].map(c=>`<span class="fl-face ${SCL[c.face??c.cells[0].s]}">${SUITS[c.face??c.cells[0].s]}</span>`).join('')||'-'}</div>`; }
  /* 내 카드와 수식판 */
  const lineCards=line.map(id=>hand.find(c=>c.id===id)); const cl=cellsOf(lineCards), val=evalCells(cl), bo=bonusOf(cl);
  const canEdit = v.phase!=='over'&&v.phase!=='reveal'&&!v.sub[me];
  h+=`<div class="fl-board"><div class="bb-h">🧮 내 수식판 <small>카드를 누르면 붙고, 붙은 카드를 누르면 빠져요 · 왼쪽부터 차례로 계산</small></div>
    <div class="fl-line">${lineCards.map(c=>cardHtml(c,`data-rm="${c.id}" ${canEdit?'':'disabled'}`,'in')).join('')||'<small class="fl-empty">아직 비어 있어요</small>'}</div>
    <div class="fl-val ${val===100?'ok':''}">= <b>${val==null?(cl.length?'식이 안 맞아요':'?'):val}</b>${val===100?` ✅ 100! · 보너스 ${bo.b}${bo.det.length?` (${bo.det.join(', ')})`:''}`:''}</div>
    <div class="fl-tally">${SUITS.map((s,k)=>`<span class="${SCL[k]}">${s} ${bo.n[k]}</span>`).join('')} <small>같은 문양 3개부터 보너스 (▼ 두 배)</small></div></div>`;
  h+=`<div class="fl-hand"><div class="bb-h">🃏 내 카드</div><div>${hand.filter(c=>!line.includes(c.id)).map(c=>cardHtml(c,`data-add="${c.id}" ${canEdit?'':'disabled'}`)).join('')||'<small>-</small>'}</div></div>`;
  if(v.phase==='build') h+= v.sub[me] ? `<div class="vr-card"><b>📮 제출 완료</b> <small>${v.sub[o]?'둘 다 제출 — 곧 공개':`${nm(o)}을(를) 기다리는 중…`}</small></div>`
    : `<div class="fh-act"><button data-a="submit" ${val===100?'':'style="background:#888"'}>📮 수식판 제출${val===100?'':' (100이 아니면 0점)'}</button></div><div class="bm-sub">${v.sub[o]?`⚠️ ${nm(o)}은(는) 이미 제출했어요 (동점이면 먼저 낸 쪽 승리)`:''}</div>`;
  if(v.res){ h+=`<div class="fl-res">${[0,1].map(p=>{ const r=v.res[p]; if(!r) return ''; return `<div><b>${nm(p)}</b> ${r.cards.map(c=>c.cells.map(cellHtml).join('')).join('<span class="fl-sep"></span>')||(v.sub[p]?'(빈 수식판)':'⏰ 시간 안에 제출 못 함')} <div>= ${r.v==null?'계산 불가':r.v} → <b>${r.pts}점</b></div></div>`; }).join('')}</div>`; }
  if(v.phase==='over'&&v.res) h+=`<div class="sn-score"><div class="h"><b>나</b> ${v.res[me]?v.res[me].pts:0}점</div><div><b>${nm(o)}</b> ${v.res[o]?v.res[o].pts:0}점</div></div>`;
  h+=`<div class="bm-log">${v.log.slice(-6).reverse().map(x=>`<div>${U.esc(AB(x))}</div>`).join('')}</div>`;
  el.innerHTML=h;
  el.onclick=e=>{
    const en=e.target.closest('[data-e]'); if(en&&!en.disabled) return ctx.act({k:'take',e:+en.dataset.e});
    const ad=e.target.closest('[data-add]'); if(ad&&!ad.disabled){ line.push(+ad.dataset.add); return ctx.rerender(); }
    const rm=e.target.closest('[data-rm]'); if(rm&&!rm.disabled){ line=line.filter(x=>x!==+rm.dataset.rm); return ctx.rerender(); }
    const a=e.target.closest('[data-a]'); if(a&&a.dataset.a==='submit') return ctx.act({k:'submit',ids:line.slice()});
  };
}
function status(v,ctx){ if(v.phase==='over') return ''; if(v.phase==='draft') return v.turn===ctx.me?'봉투를 고르세요':'상대가 고르는 중'; if(v.phase==='build') return v.sub[ctx.me]?'상대를 기다려요':'100을 만들어 제출하세요'; return '진행 중…'; }
const guide=`
<p><b>봉투를 모아 100을 만드는 수식 게임</b> (1:1).</p>
<ol><li><b>수색</b> ${ROUNDS}라운드: 봉투 ${ENV}개를 번갈아 3개씩. 겉면엔 <b>첫 칸의 문양</b>만 보이고, 안에는 한 칸(숫자) 또는 두 칸(숫자+기호) 카드. 내 카드는 나만 봐요.</li>
<li><b>수식판</b>: 카드를 원하는 순서로 이어 붙여요. <b>왼쪽부터 차례로</b> 계산(곱셈 먼저 아님), 붙어 있는 숫자 칸은 한 수(1·2 → 12, 두 자리까지). 나눗셈은 나누어떨어질 때만.</li>
<li>${BUILD/1000}초 안에 제출. 값이 <b>정확히 100</b>이면 100점 + 문양 보너스, 아니면 0점.</li>
<li>문양 보너스: 쓴 칸 중 같은 문양 3~4개 n×5, 5~6개 n×10, 7개+ n×15. <b>▼는 두 배</b>. 동점이면 <b>먼저 제출</b>한 쪽 승리.</li></ol>
<div class="tipbox">💡 <b>팁</b><br>· 카드를 다 쓸 필요는 없어요. 100을 먼저 확보하고 문양을 늘리세요.<br>· ▼ 봉투는 귀해요(보너스 두 배).<br>· 상대가 가져간 봉투 문양을 보면 어떤 보너스를 노리는지 보여요.</div>`;
const guideSteps=[
  {t:'📦 봉투 수색', h:'봉투 6개를 <b>번갈아 3개씩</b>. 겉면엔 <b>첫 칸 문양</b>만 보여요. 5라운드 동안 15장을 모아요.', demo:s=>{ startRound(s); s.turn=0; return s; }},
  {t:'🧮 왼쪽부터 계산', h:'카드를 이어 붙여 식을 만들어요. <b>왼쪽부터 차례로</b> 계산하고, 붙은 숫자 칸은 한 수(1·0 → 10).', demo:s=>{ s.round=5; s.phase='build'; s.until=Date.now()+BUILD; s.hand[0]=[{id:900,cells:[{t:'n',v:1,s:0}]},{id:901,cells:[{t:'n',v:0,s:0},{t:'o',v:'×',s:1}]},{id:902,cells:[{t:'n',v:9,s:0},{t:'o',v:'+',s:0}]},{id:903,cells:[{t:'n',v:1,s:3}]},{id:904,cells:[{t:'n',v:0,s:0}]}]; return s; }},
  {t:'✅ 정확히 100', h:'값이 <b>100</b>이면 100점 + <b>문양 보너스</b>. 같은 문양 3개부터, ▼는 두 배. 아니면 0점!', demo:s=>{ s.round=5; s.phase='reveal'; s.ri=4; s.hand[0]=[{id:900,cells:[{t:'n',v:9,s:0},{t:'o',v:'×',s:0}]},{id:901,cells:[{t:'n',v:1,s:0},{t:'n',v:0,s:0}]}]; s.sub=[[900,901],[]]; s.res=[Object.assign(scoreOf(s.hand[0]),{cards:s.hand[0]}),{v:null,ok:false,pts:0,bonus:{b:0,det:[]},cards:[]}]; s.shown=[0,1]; return s; }},
  {t:'📮 먼저 제출', h:`${BUILD/1000}초 안에 제출. 점수가 같으면 <b>먼저 낸 쪽</b>이 이겨요.`, demo:s=>{ s.round=5; s.phase='build'; s.until=Date.now()+BUILD; s.sub[1]=[1]; return s; }},
];
window.GAMES.formulalink = {
  title:'수식 링크', ref:'피의 게임 「수식 링크」', emoji:'🧮', tags:['수식','드래프트','퍼즐','두뇌서바이벌'],
  tagline:'문양만 보이는 봉투를 골라 모은 카드로 정확히 100을 — 같은 문양을 많이 이을수록 보너스.',
  guide, guideSteps, init, apply, mask, ai, aiDelay, render, status, step, stepDelay,
  reset(){ MEM={}; line=[]; lkey=''; clearInterval(tick); tick=null; },
  bar:(v,i)=>`<span class="tag">🃏${v.hand[i].length}</span>`,
  result:(v,ctx)=>v.res&&v.res[ctx.me]?`${v.res[ctx.me].pts}점`:'',
  _evalCells:evalCells, _bestFormula:bestFormula, _scoreOf:scoreOf, _pickEnv:pickEnv, _LV:LV,
};
})();
