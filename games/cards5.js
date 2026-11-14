(function(){
'use strict';
/* 다섯 카드 무술: 5×5 판, 각자 스승 1 + 제자 4. 이동 카드 16종 중 5장만 씀(각자 2장 + 옆에 1장).
   내 차례: 내 카드 1장을 골라 그 모양대로 내 말 하나를 움직임(상대 말이 있으면 잡음). 쓴 카드는 옆 자리로, 옆에 있던 카드는 내 손으로.
   승리: 상대 스승을 잡거나, 내 스승이 상대 스승의 출발 칸(신전)에 들어가기. */
// 이동 모양: [dx, dy] — dy>0 은 앞으로, dx>0 은 오른쪽 (자기 쪽에서 본 방향)
const CARDS=[
  {n:'직진',  m:[[0,2],[0,-1]]},          {n:'날개',  m:[[-2,1],[2,1],[-1,-1],[1,-1]]},
  {n:'왼발',  m:[[-2,0],[-1,1],[1,-1]]},   {n:'오른발',m:[[2,0],[1,1],[-1,-1]]},
  {n:'옆걸음',m:[[0,1],[-2,0],[2,0]]},     {n:'넓은 걸음',m:[[-1,1],[1,1],[-1,0],[1,0]]},
  {n:'왼 회오리',m:[[-1,1],[-1,0],[1,0],[1,-1]]}, {n:'오른 회오리',m:[[1,1],[1,0],[-1,0],[-1,-1]]},
  {n:'엑스',  m:[[-1,1],[1,1],[-1,-1],[1,-1]]}, {n:'삼지창',m:[[-1,1],[1,1],[0,-1]]},
  {n:'왼 기둥',m:[[-1,0],[0,1],[0,-1]]},   {n:'오른 기둥',m:[[1,0],[0,1],[0,-1]]},
  {n:'학다리',m:[[0,1],[-1,-1],[1,-1]]},   {n:'십자 반',m:[[0,1],[-1,0],[1,0]]},
  {n:'왼 물결',m:[[-1,1],[-1,-1],[1,0]]},  {n:'오른 물결',m:[[1,1],[1,-1],[-1,0]]},
];
const TEMPLE=[[2,4],[2,0]];   // 각 스승의 출발 칸 [x,y]
function init(starter){
  const ids=U.shuffle([...Array(16).keys()]).slice(0,5);
  const board=[...Array(5)].map(()=>Array(5).fill(null));
  for(let x=0;x<5;x++){ board[4][x]={p:0,m:x===2}; board[0][x]={p:1,m:x===2}; }
  return {board, hand:[[ids[0],ids[1]],[ids[2],ids[3]]], side:ids[4], turn:starter, starter, last:null, winner:null, n:0};
}
const target=(p,x,y,d)=> p===0 ? [x+d[0], y-d[1]] : [x-d[0], y+d[1]];
function moves(s,p){
  const out=[];
  for(const c of s.hand[p]) for(let y=0;y<5;y++) for(let x=0;x<5;x++){ const pc=s.board[y][x]; if(!pc||pc.p!==p) continue;
    for(const d of CARDS[c].m){ const [tx,ty]=target(p,x,y,d); if(tx<0||tx>4||ty<0||ty>4) continue; const t=s.board[ty][tx]; if(t&&t.p===p) continue; out.push({c,x,y,tx,ty}); } }
  return out;
}
function doMove(s,p,mv){
  const pc=s.board[mv.y][mv.x], cap=s.board[mv.ty][mv.tx];
  s.board[mv.ty][mv.tx]=pc; s.board[mv.y][mv.x]=null;
  const hi=s.hand[p].indexOf(mv.c); s.hand[p][hi]=s.side; s.side=mv.c;
  s.last={p,c:mv.c,from:[mv.x,mv.y],to:[mv.tx,mv.ty],cap:cap?(cap.m?'master':'student'):null}; s.n++;
  const o=1-p, [tx,ty]=TEMPLE[o];
  if(cap&&cap.m) s.winner=p;
  else if(pc.m && mv.tx===tx && mv.ty===ty) s.winner=p;
  s.turn = s.winner!=null ? null : o;
}
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(s.turn!==p) return '상대 차례예요';
  if(!a) return '알 수 없는 동작';
  if(a.k==='pass'){ if(moves(s,p).length) return '움직일 수 있는 수가 있어요'; const c=a.c|0; if(!s.hand[p].includes(c)) return '카드를 고르세요'; const hi=s.hand[p].indexOf(c); s.hand[p][hi]=s.side; s.side=c; s.last={p,c,pass:true}; s.turn=1-p; s.n++; return null; }
  if(a.k!=='move') return '알 수 없는 동작';
  const mv={c:a.c|0,x:a.x|0,y:a.y|0,tx:a.tx|0,ty:a.ty|0};
  if(!moves(s,p).some(m=>m.c===mv.c&&m.x===mv.x&&m.y===mv.y&&m.tx===mv.tx&&m.ty===mv.ty)) return '그 카드로는 거기로 못 가요';
  doMove(s,p,mv); return null;
}
function mask(s){ return U.clone(s); }   // 다 보이는 게임

/* 컴퓨터: 몇 수 앞을 내다봄 (쉬움 2수+잦은 실수, 보통 2수, 어려움 3수). 말 수·스승 안전·신전 거리로 판단 */
function evalS(s,p){
  if(s.winner===p) return 10000; if(s.winner===1-p) return -10000;
  let sc=0; for(let y=0;y<5;y++) for(let x=0;x<5;x++){ const pc=s.board[y][x]; if(!pc) continue; const sg=pc.p===p?1:-1;
    if(pc.m){ const [tx,ty]=TEMPLE[1-pc.p]; sc+=sg*(-.6*(Math.abs(tx-x)+Math.abs(ty-y))); }
    else sc+=sg*(10 + (pc.p===0 ? (4-y) : y)*.3 - Math.abs(2-x)*.1); }
  return sc;
}
const fc=s=>({board:s.board.map(r=>r.map(c=>c&&{p:c.p,m:c.m})), hand:[s.hand[0].slice(),s.hand[1].slice()], side:s.side, turn:s.turn, winner:s.winner, n:s.n});   // 빠른 복사 (수읽기용)
function search(s,p,depth,alpha,beta,me){
  if(s.winner!=null || depth===0) return evalS(s,me);
  const ms=moves(s,s.turn); if(!ms.length) return evalS(s,me);
  const maxing = s.turn===me;
  let best = maxing ? -1e9 : 1e9;
  for(const mv of ms){ const t=fc(s); doMove(t,t.turn,mv); const v=search(t,p,depth-1,alpha,beta,me);
    if(maxing){ if(v>best) best=v; if(best>alpha) alpha=best; } else { if(v<best) best=v; if(best<beta) beta=best; }
    if(beta<=alpha) break; }
  return best;
}
let saidN=-1;
function say(v,list,pr){ if(typeof showSay==='function' && saidN!==v.n && Math.random()<pr){ saidN=v.n; setTimeout(()=>showSay(1,U.pick(list),2600),250); } }
function ai(v,lvl=1){
  if(v.turn!==1||v.winner!=null) return null;
  const ms=moves(v,1);
  if(!ms.length) return {k:'pass', c:U.pick(v.hand[1])};
  const depth=[2,2,3][lvl];
  let best=null, bs=-1e9;
  for(const mv of U.shuffle(ms.slice())){ const t=fc(v); doMove(t,1,mv); let sc=search(t,1,depth-1,-1e9,1e9,1); sc+=Math.random()*[9,.4,.05][lvl]; if(sc>bs){ bs=sc; best=mv; } }
  const t=v.board[best.ty][best.tx];
  if(t && t.p===0) say(v, t.m ? ['스승님 잡았다! 🥋'] : ['하나 잡았어요 😏','실례~'], .5);
  else if(bs>5000) say(v,['이건 끝났네요 ㅎㅎ','체크메이트… 아니 신전 도착!'],.6);
  else if(bs<-5000) say(v,['아… 이거 막을 수가 없네','졌다… 😱'],.6);
  return {k:'move', ...best};
}

/* 화면 */
let selC=null, selP=null, lastN=-1;
function cardHTML(id, flip, cls){
  const set=new Set(CARDS[id].m.map(([dx,dy])=> flip ? (2-dx)+','+(2+dy) : (2+dx)+','+(2-dy)));
  let g=''; for(let y=0;y<5;y++) for(let x=0;x<5;x++) g+=`<i class="${x===2&&y===2?'o':set.has(x+','+y)?'m':''}"></i>`;
  return `<span class="c5-card ${cls||''}"><span class="c5-grid">${g}</span><small>${CARDS[id].n}</small></span>`;
}
function render(el,v,ctx){
  const me=ctx.me, o=1-me, who=i=> i===me&&ctx.mode!=='local' ? '나' : U.esc(ctx.name(i));
  if(v.n!==lastN){ lastN=v.n; selC=null; selP=null; }
  const myTurn=ctx.myTurn && v.winner==null, flipB=me===1;   // 내 쪽이 아래로 보이게
  const vx=x=>flipB?4-x:x, vy=y=>flipB?4-y:y;
  const legal = myTurn ? moves(v,me) : [];
  if(myTurn && selC==null && v.hand[me].length) selC = v.hand[me][0];
  const tgt=new Set(legal.filter(m=>m.c===selC && selP && m.x===selP[0] && m.y===selP[1]).map(m=>m.tx+','+m.ty));
  const L=v.last;
  let h=`<div class="c5-cards top">${v.hand[o].map(c=>cardHTML(c,true,'op')).join('')}<span class="c5-sidewrap"><small>옆 카드</small>${cardHTML(v.side, v.turn===o, 'side')}</span></div>`;
  h+=`<div class="c5-board">`;
  for(let ry=0;ry<5;ry++) for(let rx=0;rx<5;rx++){ const x=vx(rx), y=vy(ry), pc=v.board[y][x];
    const temple = (x===TEMPLE[0][0]&&y===TEMPLE[0][1]) ? 't0' : (x===TEMPLE[1][0]&&y===TEMPLE[1][1]) ? 't1' : '';
    const isSel=selP&&selP[0]===x&&selP[1]===y, isT=tgt.has(x+','+y), wasLast=L&&!L.pass&&((L.to[0]===x&&L.to[1]===y)||(L.from[0]===x&&L.from[1]===y));
    h+=`<button class="c5-cell ${temple} ${isSel?'sel':''} ${isT?'tgt':''} ${wasLast?'last':''}" data-x="${x}" data-y="${y}">${pc?`<span class="c5-pc p${pc.p===me?'me':'op'} ${pc.m?'m':''}">${pc.m?'👑':''}</span>`:''}</button>`; }
  h+=`</div>`;
  h+=`<div class="c5-cards">${v.hand[me].map(c=>`<button class="c5-pick ${selC===c?'on':''}" data-c="${c}">${cardHTML(c,false)}</button>`).join('')}</div>`;
  if(L) h+=`<div class="c5-last">${who(L.p)}: ${L.pass?'움직일 수 없어 카드만 바꿈':`「${CARDS[L.c].n}」${L.cap?(L.cap==='master'?' · 스승을 잡음!':' · 제자 하나 잡음'):''}`}</div>`;
  if(myTurn && !legal.length) h+=`<div class="fh-act"><small>움직일 수 있는 수가 없어요. 바꿀 카드를 고르면 넘어가요.</small>${v.hand[me].map(c=>`<button data-pass="${c}">「${CARDS[c].n}」 내려놓기</button>`).join('')}</div>`;
  el.innerHTML=h;
  el.onclick=e=>{
    if(!myTurn) return;
    const ps=e.target.closest('[data-pass]'); if(ps){ ctx.act({k:'pass',c:+ps.dataset.pass}); return; }
    const cb=e.target.closest('[data-c]'); if(cb){ selC=+cb.dataset.c; ctx.rerender(); return; }
    const cell=e.target.closest('[data-x]'); if(!cell) return; const x=+cell.dataset.x, y=+cell.dataset.y, pc=v.board[y][x];
    if(selP && tgt.has(x+','+y)){ ctx.act({k:'move', c:selC, x:selP[0], y:selP[1], tx:x, ty:y}); return; }
    if(pc && pc.p===me){ selP=[x,y]; if(!legal.some(m=>m.c===selC&&m.x===x&&m.y===y)){ const alt=v.hand[me].find(c=>legal.some(m=>m.c===c&&m.x===x&&m.y===y)); if(alt!=null) selC=alt; } ctx.rerender(); }
  };
}
function status(v,ctx){ if(v.winner!=null) return ''; const who = ctx.mode==='local' ? ctx.name(v.turn)+' 차례 · ' : ''; return ctx.myTurn ? who+'카드를 고르고 → 내 말을 누르고 → 빛나는 칸으로' : ctx.turnText(v); }
const guide=`
<p>5×5 판에서 <b>스승 👑 1명 + 제자 4명</b>으로 겨루는 짧고 굵은 전략 게임. 말은 <b>이동 카드</b>에 그려진 모양으로만 움직여요.</p>
<ul><li>16장 중 5장만 써요: 각자 2장 + <b>옆 카드</b> 1장. 카드 그림에서 가운데 ⬜가 내 말, 색칠된 칸이 갈 수 있는 곳(위쪽이 앞).</li>
<li>내 차례: 내 카드 1장을 골라 그 모양대로 내 말 하나를 움직여요. 상대 말이 있는 칸이면 잡아요.</li>
<li>쓴 카드는 <b>옆 자리</b>로 가고, 옆에 있던 카드를 내가 가져와요. → 방금 쓴 카드는 <b>다음에 상대가 받아요</b>!</li>
<li>승리: <b>상대 스승을 잡거나</b>, 내 스승이 <b>상대 스승이 처음 있던 칸</b>(⛩️ 신전)에 들어가면 승리.</li></ul>
<div class="tipbox">💡 <b>팁</b><br>
· 카드를 쓰기 전에 "이 카드를 상대가 받으면 무슨 수가 생기지?"를 생각하세요.<br>
· 상대 카드 2장과 옆 카드까지 모두 보여요. 다음 수를 미리 읽을 수 있어요.<br>
· 👥 한 화면 둘이: 차례가 바뀔 때마다 판이 돌아가서 지금 두는 사람 쪽이 아래로 와요. 폰을 가운데 두고 마주 앉아 하세요.<br>
· 컴퓨터는 😊쉬움 2수(대신 실수가 잦음), 🙂보통 2수, 😈어려움 3수 앞까지 내다봐요.</div>`;
window.GAMES.cards5 = {
  title:'다섯 카드 무술', ref:'오니타마', emoji:'🥋', tags:['전략','추상','클래식'],
  pulse:v=>{ let a=0,b=0; for(const r of v.board) for(const c of r) if(c){ if(c.p===1) b++; else a++; } return b-a; }, pulseStep:1,
  tagline:'카드에 그려진 모양으로만 움직인다. 쓴 카드는 상대에게! 5×5 무술 대결.',
  guide, init, apply, mask, ai, local:true, render, status,
  // 사람처럼: 둘 수 있는 수가 많고 잡을 수 있는 말이 있으면 더 오래 고민
  aiDelay:s=>{ const ms=s.turn===1?moves(s,1):[]; const caps=ms.filter(m=>s.board[m.ty][m.tx]).length; return 700+ms.length*45+caps*350+Math.random()*900; },
  reset(){ selC=null; selP=null; lastN=-1; saidN=-1; },
  bar:(v,i)=>{ let n=0; for(const r of v.board) for(const c of r) if(c&&c.p===i) n++; return `<span class="score">${n}</span><span class="tag">말</span>`; },
};
})();
