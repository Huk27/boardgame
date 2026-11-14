(function(){
'use strict';
/* 패턴 블록 (피의 게임 시즌 2 · 8일차 데스매치). 5×5 판에 서로 다른 무늬 25개(모양 5 × 색 5)가 1~25번 칸에 — 외울 시간 뒤 숫자판으로 바뀜.
   문제: 무늬 4개로 된 2×2 블록 그림 → 각 무늬가 몇 번 칸이었는지 4칸을 채워 먼저 제출. 맞히면 +1, 틀리면 상대에게 30초 기회.
   판 2장 × 3문제. 판마다 처음 45초 외우기, 문제 사이엔 10초 다시 공개. 점수가 높은 쪽 생존(같으면 연장 1문제씩, 최대 3). */
const MEMO=45000, RESHOW=10000, QMS=60000, SECOND=30000, PER=3, BOARDS=2;
const SHAPES=['●','■','▲','★','♥'], COLORS=[['#e2574c','빨강'],['#4a7bd0','파랑'],['#4caf6a','초록'],['#f0b429','노랑'],['#8e5cc7','보라']];
const pat=k=>({s:SHAPES[k%5], c:COLORS[Math.floor(k/5)][0], cn:COLORS[Math.floor(k/5)][1]});
function newBoard(){ return U.shuffle([...Array(25).keys()]); }   // board[칸] = 무늬 번호
function newQ(board){ const cells=U.shuffle([...Array(25).keys()]).slice(0,4); return {cells, pats:cells.map(c=>board[c])}; }
function init(starter){
  const boards=[newBoard(),newBoard()], qs=[];
  for(let b=0;b<BOARDS;b++) for(let k=0;k<PER+1;k++) qs.push({b, ...newQ(boards[b])});   // 판마다 3문제 + 연장용 1
  return {boards, qs:[...qs.filter((q,i)=>i%(PER+1)<PER), ...qs.filter((q,i)=>i%(PER+1)===PER)], qi:-1, score:[0,0], phase:'intro', turn:null, starter, winner:null, until:0, tries:[], res:null, log:[], ev:0};
}
const boardOf=s=>s.qs[Math.max(0,s.qi)]?s.qs[Math.max(0,s.qi)].b:0;
function next(s){ // 다음 문제로: 판이 바뀌면 45초 외우기, 아니면 10초 다시 공개
  const nq=s.qi+1; if(nq>=s.qs.length) return end(s);
  const newB = s.qi<0 || s.qs[nq].b!==s.qs[s.qi].b;
  s.phase='memo'; s.memoFor=nq; s.until=Date.now()+(newB?MEMO:RESHOW); s.notice = newB?`🎙️ 패턴 판 ${s.qs[nq].b?'2':'1'} — ${MEMO/1000}초 동안 외우세요!`:'🎙️ 패턴 판 10초 다시 공개'; s.ev++; }
function startQ(s){ s.qi=s.memoFor; s.phase='q'; s.tries=[]; s.res=null; s.until=Date.now()+QMS; s.notice=`🎙️ ${s.qi+1}번 문제 — 이 블록의 숫자를 쌓으세요!`; s.log.push(`— ${s.qi+1}번 문제 —`); s.ev++; }
function check(s,ans){ const Q=s.qs[s.qi]; return Array.isArray(ans)&&ans.length===4&&ans.every((x,k)=>(x|0)===Q.cells[k]+1); }
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(!a||a.k!=='ans') return '알 수 없는 동작';
  if(s.phase==='q'){ if(s.tries.some(t=>t.p===p)) return '이미 냈어요';
    const ok=check(s,a.nums); s.tries.push({p,nums:a.nums.map(x=>x|0),ok}); s.log.push(`${p?'B':'A'} ${a.nums.join('·')} ${ok?'⭕ +1':'❌'}`);
    if(ok){ s.score[p]++; return reveal(s,p,true); }
    s.phase='second'; s.turn=1-p; s.until=Date.now()+SECOND; s.notice=`❌ 틀렸어요 — ${1-p?'B':'A'}에게 30초 기회`; s.ev++; return null; }
  if(s.phase==='second'){ if(p!==s.turn) return '상대의 30초 기회예요';
    const ok=check(s,a.nums); s.tries.push({p,nums:a.nums.map(x=>x|0),ok}); s.log.push(`${p?'B':'A'} (30초) ${a.nums.join('·')} ${ok?'⭕ +1':'❌'}`);
    if(ok) s.score[p]++; return reveal(s,ok?p:null,ok); }
  return '지금은 답할 때가 아니에요';
}
function reveal(s,who,ok){ s.phase='reveal'; s.turn=null; s.res={who,ok}; s.until=Date.now()+3500; s.notice= ok?`⭕ ${who?'B':'A'} 정답!`:'정답 공개'; s.ev++; return null; }
function end(s){ s.phase='over'; s.turn=null; s.winner=s.score[0]>s.score[1]?0:s.score[1]>s.score[0]?1:'draw'; s.log.push(`🏁 ${s.score[0]} : ${s.score[1]}`); s.ev++; return null; }
function stepDelay(s){ if(s.winner!=null) return null; if(s.phase==='intro') return 2200; return Math.max(0,s.until-Date.now()); }
function step(s){
  if(s.phase==='intro'){ next(s); return; }
  if(Date.now()<s.until) return;
  if(s.phase==='memo'){ startQ(s); return; }
  if(s.phase==='q'){ s.log.push('⏰ 시간 초과'); reveal(s,null,false); return; }
  if(s.phase==='second'){ s.log.push('⏰ 30초 초과'); reveal(s,null,false); return; }
  if(s.phase==='reveal'){ const done=s.qi+1, main=BOARDS*PER;
    if(done>=main && (s.score[0]!==s.score[1] || done>=s.qs.length)) return end(s);
    if(done>=main) s.log.push('⚖️ 동점 — 연장 문제!');
    next(s); }
}
function mask(s){ const v=U.clone(s), show = s.phase==='memo'||s.phase==='reveal'||s.phase==='over'||s.phase==='intro';
  if(!show) v.boards=null; v.qs=s.qs.map((Q,i)=>({b:Q.b, pats:Q.pats, cells: i<s.qi||(i===s.qi&&(s.phase==='reveal'||s.phase==='over'))?Q.cells:null}));
  v.left=Math.max(0,s.until-Date.now()); return v; }

/* 컴퓨터: 외우는 시간에 본 것만 기억(난이도별 기억률, 다시 공개 때 조금 보강) */
const MEM={};
function ai(v,lvl=1){ const me=1; const rate=[.5,.72,.9][lvl];
  if(v.phase==='memo'&&v.boards){ const b=v.qs[v.memoFor]?v.qs[v.memoFor].b:0; const m=MEM[b]=MEM[b]||{know:{}, seen:0};
    if(m.seen!==v.memoFor){ m.seen=v.memoFor; v.boards[b].forEach((pt,cell)=>{ if(!m.know[pt]&&Math.random()<(m.first?rate*.35:rate)) m.know[pt]=cell; }); m.first=true; } return null; }
  const Q=v.qs[v.qi]; if(!Q) return null; const m=MEM[Q.b]||{know:{}}; const key='q'+v.qi; m[key]=m[key]||{};
  const guess=()=>Q.pats.map(pt=> m.know[pt]!=null ? m.know[pt]+1 : 1+(Math.random()*25|0));
  if(v.phase==='q'){ if(v.tries.some(t=>t.p===me)) return null; const nKnown=Q.pats.filter(pt=>m.know[pt]!=null).length;
    if(!m[key].at) m[key].at=Date.now()+[14000,9000,6000][lvl]*(.6+Math.random()*.8)+(4-nKnown)*4000;
    if(Date.now()<m[key].at) return null; if(nKnown<3&&Date.now()<m[key].at+15000) return null;   // 잘 모르겠으면 상대가 먼저 틀리길 기다림
    return {k:'ans', nums:guess()}; }
  if(v.phase==='second'&&v.turn===me){ if(!m[key].sec) m[key].sec=Date.now()+4000+Math.random()*5000; if(Date.now()<m[key].sec) return null;
    const wrong=v.tries[0]; return {k:'ans', nums:guess()}; }
  return null; }
function aiDelay(){ return 500; }

/* 화면 */
let fillSel=0, ans=[null,null,null,null], sig='', tick=null;
const patHTML=(k,cls='')=>{ const p=pat(k); return `<span class="pb-p ${cls}" style="color:${p.c}">${p.s}</span>`; };
function boardHTML(v,b,clickable){ let h='<div class="pb-board">'; for(let cell=0;cell<25;cell++){ const pt=v.boards?v.boards[b][cell]:null;
    h+=`<button class="pb-cell ${clickable?'cl':''}" data-n="${cell+1}" ${clickable?'':'disabled'}>${pt!=null?patHTML(pt):`<b>${cell+1}</b>`}<i>${pt!=null?cell+1:''}</i></button>`; } return h+'</div>'; }
function render(el,v,ctx){
  const me=ctx.me, o=1-me, nm=p=>p===me?'나':(ctx.mode==='solo'?'상대':U.esc(ctx.name(p)));
  clearInterval(tick); tick=null;
  const sg=v.qi+':'+v.phase; if(sg!==sig){ sig=sg; ans=[null,null,null,null]; fillSel=0; }
  const Q=v.qs[v.qi], can=(v.phase==='q'&&!v.tries.some(t=>t.p===me))||(v.phase==='second'&&v.turn===me);
  let h=`<div class="hl-notice">${U.esc((v.notice||'').replace(/\bA\b/,nm(0)).replace(/\bB\b/,nm(1)))} ${v.left?`<b id="pbT">${Math.ceil(v.left/1000)}</b>초`:''}</div>`;
  h+=`<div class="info">점수 나 <b>${v.score[me]}</b> : <b>${v.score[o]}</b> ${nm(o)} · ${Math.max(1,v.qi+1)} / ${BOARDS*PER}문제${v.qi>=BOARDS*PER?' (연장)':''}</div>`;
  if(v.phase==='memo'||v.phase==='intro'){ const b=v.qs[v.memoFor||0]?v.qs[v.memoFor||0].b:0; h+=`<div class="pb-wrap"><div><div class="pb-h">🧠 외우세요 — 패턴 판 ${b?'2':'1'}</div>${boardHTML(v,b,false)}</div></div>`; }
  else if(Q){
    const shown = v.phase==='reveal'||v.phase==='over';
    h+=`<div class="pb-wrap"><div><div class="pb-h">🧱 이 블록의 숫자는?</div><div class="pb-q">${Q.pats.map((pt,k)=>`<button class="pb-slot ${fillSel===k&&can?'sel':''}" data-slot="${k}" ${can?'':'disabled'}>${patHTML(pt,'big')}<b>${shown&&Q.cells?Q.cells[k]+1:ans[k]!=null?ans[k]:'?'}</b></button>`).join('')}</div>
      ${can?`<div class="fh-act"><button class="ghost" data-a="clr">지우기</button><button data-a="go" ${ans.every(x=>x!=null)?'':'disabled'}>🔔 정답!</button></div><small>블록 칸을 고른 뒤 오른쪽 숫자판을 누르세요</small>`:''}
      ${v.tries.length?`<div class="pb-tries">${v.tries.map(t=>`<div>${nm(t.p)}: ${t.nums.join('·')} ${t.ok?'⭕':'❌'}</div>`).join('')}</div>`:''}</div>
      <div><div class="pb-h">${shown?'정답 공개':'숫자판'}</div>${boardHTML(v,Q.b,can)}</div></div>`; }
  if(v.phase==='over') h+=`<div class="sn-score"><div class="h"><b>${v.winner==='draw'?'🤝 무승부':v.winner===me?'🎉 생존!':'😢 탈락'}</b> ${v.score[me]} : ${v.score[o]}</div></div>`;
  h+=`<details class="hl-log"><summary>기록</summary>${v.log.slice(-12).reverse().map(x=>`<div>${U.esc(x).replace(/^A\b/,nm(0)).replace(/^B\b/,nm(1))}</div>`).join('')}</details>`;
  el.innerHTML=h;
  if(v.left){ const t0=performance.now(), L=v.left; tick=setInterval(()=>{ const e=document.getElementById('pbT'); if(!e||!e.isConnected){ clearInterval(tick); return; } e.textContent=Math.max(0,Math.ceil((L-(performance.now()-t0))/1000)); },250); }
  el.onclick=e=>{ const sl=e.target.closest('[data-slot]'); if(sl&&!sl.disabled){ fillSel=+sl.dataset.slot; return ctx.rerender(); }
    const n=e.target.closest('.pb-cell.cl'); if(n&&can){ ans[fillSel]=+n.dataset.n; fillSel=(fillSel+1)%4; return ctx.rerender(); }
    const a=e.target.closest('[data-a]'); if(!a||a.disabled) return; if(a.dataset.a==='clr'){ ans=[null,null,null,null]; fillSel=0; return ctx.rerender(); }
    if(a.dataset.a==='go'){ const nums=ans.slice(); ans=[null,null,null,null]; fillSel=0; return ctx.act({k:'ans', nums}); } };
}
const guideSteps=[
  {t:'🧠 외우기', h:'5×5 판에 서로 다른 <b>무늬 25개</b>(모양 5 × 색 5)가 1~25번 칸에 있어요. 판마다 처음 <b>45초</b> 동안 외워요.',
   demo:s=>{ s.phase='memo'; s.memoFor=0; s.until=Date.now()+30000; s.notice='🎙️ 패턴 판 1 — 45초 동안 외우세요!'; return s; }},
  {t:'🔢 숫자판으로', h:'시간이 지나면 무늬가 사라지고 <b>숫자만</b> 남아요. 문제로 <b>무늬 4개짜리 블록</b>이 나와요.',
   demo:s=>{ s.qi=0; s.phase='q'; s.until=Date.now()+50000; s.tries=[]; s.notice='🎙️ 1번 문제 — 이 블록의 숫자를 쌓으세요!'; return s; }},
  {t:'🧱 숫자 쌓기', h:'블록 칸을 고르고 오른쪽 숫자판에서 <b>그 무늬가 있던 번호</b>를 눌러 4칸을 채운 뒤 <b>🔔 정답!</b> 먼저 맞히면 <b>+1</b>.',
   demo:s=>{ s.qi=0; s.phase='q'; s.until=Date.now()+40000; s.tries=[]; return s; }},
  {t:'❌ 틀리면', h:'틀리면 상대에게 <b>30초</b> 동안 답할 기회가 넘어가요. 문제 사이엔 판이 <b>10초</b> 다시 공개돼요.',
   demo:s=>{ s.qi=0; s.phase='second'; s.turn=0; s.until=Date.now()+25000; s.tries=[{p:1,nums:[3,8,12,20],ok:false}]; s.notice='❌ 틀렸어요 — 나에게 30초 기회'; return s; }},
  {t:'🏁 승리', shot:false, h:'판 2장 × 3문제 = <b>6문제</b>. 점수가 높은 쪽이 생존(같으면 연장).<div class="gd-tip">무늬를 "색 줄·모양 줄"로 묶어 외우면 쉬워요 — 예: "빨강 줄은 3·8·14·…"</div>'},
];
const guide=`<p><b>무늬 위치 외우기 대결</b> — 1:1.</p><ol><li>5×5 판의 무늬 25개를 외워요(판마다 45초).</li><li>숫자판으로 바뀌면, 문제의 무늬 4개가 몇 번 칸이었는지 채워서 먼저 제출 — 맞히면 +1.</li><li>틀리면 상대에게 30초 기회. 문제 사이엔 판 10초 다시 공개.</li></ol><p>판 2장 × 3문제, 점수 높은 쪽 생존.</p>`;
window.GAMES.patternblock = {
  title:'패턴 블록', ref:'피의 게임 「패턴 블록」', emoji:'🧩', tags:['기억력','순발력','두뇌서바이벌','데스매치'],
  tagline:'무늬 25개의 위치를 외워라. 숫자판으로 바뀐 뒤, 블록의 무늬가 몇 번이었는지 먼저 쌓는 쪽이 이긴다.',
  guide, guideSteps, init, apply, mask, ai, aiDelay, render, step, stepDelay,
  reset(){ for(const k in MEM) delete MEM[k]; clearInterval(tick); tick=null; ans=[null,null,null,null]; fillSel=0; sig=''; },
  status:(v,ctx)=> v.winner!=null?'': v.phase==='memo'?'무늬 위치를 외우세요': v.phase==='q'?'숫자를 채워 제출하세요': v.phase==='second'?(v.turn===ctx.me?'30초 안에 답하세요!':'상대의 30초…'):'',
  bar:(v,i)=>`<span class="score">🧩 ${v.score[i]}</span>`,
  pulse:v=>v.score[1]-v.score[0], pulseStep:1,
};
})();
