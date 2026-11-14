(function(){
'use strict';
/* 수식미로 (피의 게임 시즌 3 · 8일차 데스매치) — 1:1.
   라운드마다 4×4 숫자판을 40초 동안 외우면 판이 알파벳 뒷면(A~P)으로 뒤집힘.
   문제: 출발 칸·도착 칸·목표 합. 상하좌우로 맞닿은 칸만 이어 출발→도착 길을 만들되, 지나간 칸 숫자의 합이 목표가 되게(같은 칸 두 번 금지).
   먼저 맞는 길을 내면 +1점. 틀리면 30초 동안 못 냄. 90초 안에 아무도 못 맞히면 다음 문제.
   1·2라운드 2문제, 3라운드 1문제(총 5문제). 3점 먼저 얻으면 즉시 승리, 끝나면 점수가 높은 쪽 승리. */
const G4=4, MEMO=40000, PROB=90000, LOCK=30000, PER=[2,2,1], WIN=3;
const LET='ABCDEFGHIJKLMNOP';
const nb=c=>{ const x=c%G4, y=c/G4|0, o=[]; if(y>0) o.push(c-G4); if(x<G4-1) o.push(c+1); if(y<G4-1) o.push(c+G4); if(x>0) o.push(c-1); return o; };
function randPath(a,b){ for(let g=0;g<300;g++){ const p=[a], seen=new Set([a]); let cur=a;
    while(cur!==b&&p.length<10){ const n=U.shuffle(nb(cur).filter(x=>!seen.has(x))); if(!n.length) break; const nx= n.includes(b)&&p.length>=3&&Math.random()<.6 ? b : n[0]; p.push(nx); seen.add(nx); cur=nx; }
    if(cur===b&&p.length>=4&&p.length<=9) return p; } return null; }
function makeProb(board){ for(let g=0;g<200;g++){ const a=Math.random()*16|0; let b=Math.random()*16|0; if(a===b) continue; const p=randPath(a,b); if(p) return {a,b,t:p.reduce((s,c)=>s+board[c],0), ex:p}; } return null; }
function validPath(p,a,b){ if(!Array.isArray(p)||p.length<2||p[0]!==a||p[p.length-1]!==b) return false; if(new Set(p).size!==p.length) return false; for(let k=1;k<p.length;k++) if(!nb(p[k-1]).includes(p[k])) return false; return true; }

function init(starter){
  return {phase:'intro', starter:starter|0, round:0, pi:0, board:null, prob:null, score:[0,0], lock:[0,0], until:0, done:0, last:null, hist:[], log:[], turn:null, winner:null, ev:0,
    notice:'🎙️ 데스매치 「수식미로」 — 숫자를 외우고, 합이 맞는 길을 먼저 찾으세요'};
}
function startRound(s){ s.round++; s.pi=0; s.board=[...Array(16)].map(()=>1+(Math.random()*9|0)); s.phase='memo'; s.until=Date.now()+MEMO; s.prob=null;
  s.notice=`🧠 ${s.round}라운드 — ${MEMO/1000}초 동안 숫자판을 외우세요! (문제 ${PER[s.round-1]}개)`; s.log.push(`🧠 ${s.round}라운드 숫자판 공개`); }
function nextProb(s){ s.pi++; s.prob=makeProb(s.board); s.phase='prob'; s.until=Date.now()+PROB; s.lock=[0,0]; s.last=null;
  s.notice=`🧭 문제 ${s.done+1} — ${LET[s.prob.a]}에서 ${LET[s.prob.b]}까지, 합 ${s.prob.t}`; s.log.push(s.notice); }
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요'; if(!a||a.k!=='path') return '알 수 없는 동작'; if(s.phase!=='prob') return '지금은 답할 때가 아니에요';
  if(Date.now()<s.lock[p]) return `${Math.ceil((s.lock[p]-Date.now())/1000)}초 뒤에 답할 수 있어요`;
  const path=(a.path||[]).map(x=>x|0), P=s.prob;
  if(!validPath(path,P.a,P.b)){ return `${LET[P.a]}에서 시작해 맞닿은 칸으로만 ${LET[P.b]}까지 이어 주세요`; }
  const sum=path.reduce((x,c)=>x+s.board[c],0), word=path.map(c=>LET[c]).join('');
  if(sum===P.t){ s.score[p]++; s.phase='pres'; s.last={p,ok:true,path}; s.notice=`⭕ ${['A','B'][p]} "${word}" — 합 ${sum} 정답! +1점`; s.log.push(s.notice); s.hist.push({n:s.done+1,w:p,path}); s.done++; s.ev++; return null; }
  s.lock[p]=Date.now()+LOCK; s.last={p,ok:false,path,sum}; s.notice=`❌ ${['A','B'][p]} "${word}" — 합이 ${P.t}이(가) 아니에요! 30초 동안 상대 차례`; s.log.push(s.notice); s.ev++; return null; }
function stepDelay(s){ if(s.winner!=null) return null; const now=Date.now();
  if(s.phase==='intro') return 2200; if(s.phase==='memo'||s.phase==='prob') return Math.max(60,s.until-now); if(s.phase==='pres') return 3600; return null; }
function step(s){ const now=Date.now();
  if(s.phase==='intro'){ startRound(s); s.ev++; return; }
  if(s.phase==='memo'){ if(now<s.until) return; s.notice='🔤 판이 뒤집혔어요!'; nextProb(s); s.ev++; return; }
  if(s.phase==='prob'){ if(now<s.until) return; s.phase='pres'; s.last={p:null,ok:false,path:s.prob.ex}; s.notice=`⏰ 시간 끝 — 예시 답은 ${s.prob.ex.map(c=>LET[c]).join('')}`; s.log.push(s.notice); s.hist.push({n:s.done+1,w:null}); s.done++; s.ev++; return; }
  if(s.phase==='pres'){ const [a,b]=s.score; const left=5-s.done;
    if(a>=WIN||b>=WIN||Math.abs(a-b)>left||s.done>=5){ s.phase='over'; s.winner=a>b?0:b>a?1:'both'; s.notice=`🏁 ${a===b?'무승부':`${['A','B'][s.winner]} 승리`} — ${a} : ${b}${Math.abs(a-b)>left&&a<WIN&&b<WIN?' (콜드게임)':''}`; s.log.push(s.notice); s.ev++; return; }
    if(s.pi<PER[s.round-1]) nextProb(s); else startRound(s); s.ev++; return; }
}
function mask(s,p){ const v=U.clone(s); const open=s.phase==='memo'||s.phase==='over'||(s.phase==='pres'&&s.pi>=PER[s.round-1]); if(!open) v.board=null; if(v.prob) v.prob={a:s.prob.a,b:s.prob.b,t:s.prob.t, ex: s.phase==='pres'?s.prob.ex:null}; return v; }
/* 컴퓨터 — 외울 때 본 판을 기억(실력이 낮으면 몇 칸을 잘못 기억), 그 기억으로 길을 찾음 */
const LV=[{acc:.8,base:30},{acc:.88,base:24},{acc:.93,base:21}];
let MEM={};
function remember(board,lvl){ const L=LV[lvl]; return board.map(n=> Math.random()<L.acc ? n : Math.max(1,Math.min(9,n+(Math.random()<.5?-1:1)*(1+(Math.random()*2|0))))); }
function findPath(mem,a,b,t){ const res=[]; const seen=new Set([a]); let nodes=0;
  (function dfs(c,sum,path){ if(res.length>=6||nodes++>20000) return; if(c===b){ if(sum===t) res.push(path.slice()); return; } if(sum>=t) return;
    for(const n of U.shuffle(nb(c).slice())){ if(seen.has(n)) continue; seen.add(n); path.push(n); dfs(n,sum+mem[n],path); path.pop(); seen.delete(n); } })(a,mem[a],[a]);
  return res; }
function aiSeat(v,me,lvl,mem){ lvl=lvl==null?1:lvl; if(v.phase!=='prob'||!v.prob) return null;
  const key=v.round+':'+v.done; if(mem.key!==key){ const L=LV[lvl]; const ps=findPath(mem.board||[],v.prob.a,v.prob.b,v.prob.t);
    mem.key=key; mem.tries=0; mem.paths=ps; mem.at=Date.now()+L.base*1000*(.5+Math.random()*1.0)*(ps.length?1:1.5); }
  if(Date.now()<mem.at||Date.now()<v.lock[me]) return null;
  if(v.last&&v.last.p===me&&!v.last.ok&&mem.paths.length&&mem.paths[0].join()===v.last.path.join()) mem.paths.shift();
  if(!mem.paths.length) return null;
  mem.at=Date.now()+5000+Math.random()*6000; return {k:'path', path:mem.paths[0]}; }
function ai(v,lvl){ lvl=lvl==null?1:lvl; if(v.phase==='memo'&&v.board&&MEM.round!==v.round){ MEM={round:v.round, board:remember(v.board,lvl)}; return null; } return aiSeat(v,1,lvl,MEM); }
function aiDelay(S){ if(S.phase==='prob'&&MEM.at) return Math.max(300,Math.min(2500,MEM.at-Date.now())); return 1500; }

/* 화면 */
let path=[], sig='', tick=null;
function render(el,v,ctx){
  const me=ctx.me, o=1-me, nm=p=>p===me?'나':U.esc(ctx.name(p)), AB=t=>String(t).replace(/\bA\b/g,nm(0)).replace(/\bB\b/g,nm(1));
  const sg=v.round+':'+v.done+':'+v.phase; if(sg!==sig){ sig=sg; path=[]; }
  clearInterval(tick); tick=null; if(v.phase==='memo'||v.phase==='prob') tick=setInterval(()=>{ const e=document.getElementById('smT'); if(e) e.textContent=Math.max(0,Math.ceil((v.until-Date.now())/1000))+'초'; else { clearInterval(tick); tick=null; }
    const l=document.getElementById('smL'); if(l){ const r=Math.ceil((v.lock[me]-Date.now())/1000); l.textContent=r>0?`🔒 ${r}초`:''; if(r===0) ctx.rerender(); } },400);
  const P=v.prob, locked=v.lock[me]>Date.now(), can=v.phase==='prob'&&!locked;
  let h=`<div class="hl-notice">${U.esc(AB(v.notice||''))}</div>`;
  h+=`<div class="info">${Math.max(1,v.round)}/3라운드 · 문제 ${Math.min(5,v.done+(v.phase==='prob'?1:0))}/5 · 점수 나 <b>${v.score[me]}</b> : <b>${v.score[o]}</b> ${nm(o)} · ${WIN}점 먼저${v.phase==='memo'||v.phase==='prob'?` · ⏱️ <b id="smT">${Math.max(0,Math.ceil((v.until-Date.now())/1000))}초</b>`:''}</div>`;
  if(P) h+=`<div class="sm-prob">출발 <b>${LET[P.a]}</b> → 도착 <b>${LET[P.b]}</b> · 합 <b>${P.t}</b></div>`;
  const showPath = v.phase==='pres'&&v.last ? v.last.path : path;
  h+=`<div class="sm-board">${[...Array(16).keys()].map(c=>{ const k=showPath.indexOf(c), isA=P&&c===P.a, isB=P&&c===P.b;
      const okNext = can && (path.length===0 ? c===P.a : (!path.includes(c)&&nb(path[path.length-1]).includes(c)));
      return `<button class="sm-c ${v.board?'num':''} ${k>=0?'on':''} ${isA?'st':''} ${isB?'en':''}" data-c="${c}" ${okNext?'':'disabled'}>${v.board?`<b>${v.board[c]}</b><small>${LET[c]}</small>`:`<b>${LET[c]}</b>`}${k>=0?`<i>${k+1}</i>`:''}</button>`; }).join('')}</div>`;
  if(v.phase==='prob'){ h+=`<div class="vr-card"><b>🧭 길: ${path.map(c=>LET[c]).join(' → ')||'출발 칸부터 누르세요'}</b> <span id="smL" class="hc-lock">${locked?`🔒 ${Math.ceil((v.lock[me]-Date.now())/1000)}초`:''}</span>
      <div class="fh-act"><button class="ghost" data-a="undo" ${path.length?'':'disabled'}>↩️ 한 칸 취소</button><button class="ghost" data-a="clr" ${path.length?'':'disabled'}>처음부터</button><button data-a="go" ${can&&path.length>1&&path[path.length-1]===P.b?'':'disabled'}>"${path.map(c=>LET[c]).join('')||'?'}!" 외치기</button></div><small>숫자는 머릿속으로 더하세요 · 틀리면 30초 잠김</small></div>`; }
  if(v.phase==='over') h+=`<div class="sn-score"><div class="h"><b>나</b> ${v.score[me]}점</div><div><b>${nm(o)}</b> ${v.score[o]}점</div></div>`;
  h+=`<div class="bm-log">${v.log.slice(-6).reverse().map(x=>`<div>${U.esc(AB(x))}</div>`).join('')}</div>`;
  el.innerHTML=h;
  el.onclick=e=>{ const c=e.target.closest('[data-c]'); if(c&&!c.disabled){ path.push(+c.dataset.c); return ctx.rerender(); }
    const a=e.target.closest('[data-a]'); if(!a||a.disabled) return; const k=a.dataset.a;
    if(k==='undo'){ path.pop(); return ctx.rerender(); } if(k==='clr'){ path=[]; return ctx.rerender(); } if(k==='go'){ const p=path.slice(); path=[]; return ctx.act({k:'path',path:p}); } };
}
function status(v,ctx){ if(v.phase==='over') return ''; if(v.phase==='memo') return '숫자판을 외우세요!'; if(v.phase==='prob') return '합이 맞는 길을 찾으세요'; return '진행 중…'; }
const guide=`
<p><b>외운 숫자로 길 찾기</b> — 1:1.</p>
<ol><li>라운드마다 4×4 <b>숫자판</b>을 ${MEMO/1000}초 동안 외워요. 그 뒤 판이 <b>알파벳(A~P)</b>으로 뒤집혀요.</li>
<li>문제: <b>출발 칸 · 도착 칸 · 목표 합</b>. 상하좌우로 맞닿은 칸만 이어 길을 만들고, 지나간 칸 숫자의 <b>합</b>이 목표가 되게(같은 칸 두 번 금지).</li>
<li>먼저 맞는 길을 외치면 <b>+1점</b>. 틀리면 <b>30초</b> 잠김. ${PROB/1000}초 안에 아무도 못 맞히면 다음 문제.</li>
<li>1·2라운드 2문제, 3라운드 1문제. <b>${WIN}점 선착</b> 즉시 승리(못 뒤집으면 콜드게임).</li></ol>
<div class="tipbox">💡 <b>팁</b><br>· 다 외우기 어려우면 큰 숫자·작은 숫자 위치만이라도!<br>· 길은 여러 개일 수 있어요. 합만 맞으면 정답.</div>`;
const guideSteps=[
  {t:'🧠 40초 외우기', h:'4×4 숫자판을 <b>40초</b> 동안 외워요. 그 뒤 알파벳으로 뒤집혀요.', demo:s=>{ startRound(s); return s; }},
  {t:'🧭 합이 맞는 길', h:'출발 → 도착까지 <b>맞닿은 칸</b>만 이어서, 지나간 숫자의 <b>합</b>이 목표가 되게!', demo:s=>{ startRound(s); s.phase='prob'; s.prob=makeProb(s.board); s.until=Date.now()+PROB; s.notice='🧭 문제'; return s; }},
  {t:'🗣️ 먼저 외치기', h:'먼저 맞으면 <b>+1점</b>, 틀리면 <b>30초 잠김</b>. 3점 먼저 얻으면 바로 승리.', demo:s=>{ startRound(s); s.prob=makeProb(s.board); s.phase='pres'; s.pi=PER[0]; s.last={p:0,ok:true,path:s.prob.ex}; s.score=[1,0]; return s; }},
];
window.GAMES.summaze = {
  title:'수식미로', ref:'피의 게임 「수식미로」', emoji:'🧭', tags:['기억력','수식','실시간','두뇌서바이벌'],
  tagline:'40초 외운 숫자판, 이제는 알파벳뿐 — 합이 맞는 길을 먼저 외쳐라.',
  guide, guideSteps, init, apply, mask, ai, aiDelay, render, status, step, stepDelay,
  reset(){ MEM={}; path=[]; sig=''; clearInterval(tick); tick=null; },
  bar:(v,i)=>`<span class="tag">${v.score[i]}점</span>`,
  result:(v,ctx)=>`${v.score[ctx.me]} : ${v.score[1-ctx.me]}`,
  pulse:v=>v.score[1]-v.score[0],
  _aiSeat:aiSeat, _remember:remember, _validPath:validPath,
};
})();
