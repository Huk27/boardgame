(function(){
'use strict';
/* 숫자 빙고 대결: 각자 1~25를 5×5 판에 숨겨 배치. 번갈아 숫자를 하나씩 부르면 둘 다 그 칸을 지움.
   가로·세로·대각선 줄을 먼저 3줄 완성하면 "빙고!" 승리. 같은 숫자로 둘 다 3줄이 되면 부른 사람이 승리. */
const NEED=3;
const LINES=(()=>{ const L=[]; for(let i=0;i<5;i++){ L.push([0,1,2,3,4].map(k=>i*5+k)); L.push([0,1,2,3,4].map(k=>k*5+i)); } L.push([0,6,12,18,24]); L.push([4,8,12,16,20]); return L; })();
const shuffled=()=>U.shuffle([...Array(25)].map((_,i)=>i+1));
/* 👥 2~6명 (2026-11-12) — 자리 = 사람 수, 차례대로 부르기 */
function init(starter,o){ const k=Math.max(2,Math.min(6,(o&&o.humans)||2)); return {hs:[...Array(k).keys()], phase:'setup', board:[...Array(k)].map(shuffled), ready:Array(k).fill(false), called:[], turn:null, starter:(starter|0)%k, winner:null, last:null, lines:Array(k).fill(0), reach:Array(k).fill(false)}; }
const NB=s=>s.board.length;
// 리치: 한 칸만 더 지워지면 빙고 (실제 빙고처럼 자동으로 외침 → 상대도 앎)
const reachOf=(board,called)=>{ const set=new Set(called); if(linesOf(board,called)!==NEED-1) return false; return LINES.some(L=>L.filter(i=>set.has(board[i])).length===4); };
const linesOf=(board,called)=>{ const set=new Set(called); return LINES.filter(L=>L.every(i=>set.has(board[i]))).length; };
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(!a) return '알 수 없는 동작';
  if(a.k==='shuffle'){ if(s.phase!=='setup'||s.ready[p]) return '이미 확정했어요'; s.board[p]=shuffled(); return null; }
  if(a.k==='swap'){ if(s.phase!=='setup'||s.ready[p]) return '이미 확정했어요'; const i=a.i|0, j=a.j|0; if(!(i>=0&&i<25&&j>=0&&j<25)) return '칸을 고르세요'; const b=s.board[p]; [b[i],b[j]]=[b[j],b[i]]; return null; }
  if(a.k==='ready'){ if(s.phase!=='setup') return null; s.ready[p]=true; if(s.ready.every(Boolean)){ s.phase='play'; s.turn=s.starter; } return null; }
  if(a.k==='call'){
    if(s.phase!=='play') return '아직 판을 짜는 중이에요';
    if(s.turn!==p) return '상대 차례예요';
    const n=a.n|0; if(n<1||n>25) return '1~25 중에 고르세요';
    if(s.called.includes(n)) return '이미 부른 숫자예요';
    s.called.push(n); s.last={p,n};
    s.lines=s.board.map(b=>linesOf(b,s.called));
    s.reach=s.board.map(b=>reachOf(b,s.called));
    const done=s.board.map((_,q)=>q).filter(q=>s.lines[q]>=NEED);
    if(done.length){ s.winner = done.includes(p) ? p : done[0]; if(NB(s)>2) s.winners=done.includes(p)?[p]:done; s.turn=null; s.phase='over'; return null; }
    s.turn=(p+1)%NB(s); return null;
  }
  return '알 수 없는 동작';
}
function mask(s,p){
  const v=U.clone(s);
  if(s.phase!=='over') v.board=v.board.map((b,q)=>q===p?b:null);   // 남의 판은 끝날 때까지 비밀 (줄 수만 공개)
  return v;
}
/* 컴퓨터: 내 판에서 거의 다 찬 줄을 채우는 숫자 위주. 쉬움은 아무 숫자나 자주 */
function ai(v,lvl=1){
  const me=1;
  if(v.phase==='setup') return v.ready[me] ? null : {k:'ready'};
  if(v.phase!=='play'||v.turn!==me) return null;
  const b=v.board[me], set=new Set(v.called), left=[...Array(25)].map((_,i)=>i+1).filter(n=>!set.has(n));
  if(Math.random()<[.5,.15,0][lvl]) return {k:'call', n:U.pick(left)};
  let best=null, bs=-1;
  for(const n of left){ const idx=b.indexOf(n); let sc=0;
    for(const L of LINES){ if(!L.includes(idx)) continue; const filled=L.filter(i=>set.has(b[i])).length; sc += [1,2,4,9,40][filled]; }
    sc += Math.random()*[6,3,1][lvl];
    if(sc>bs){ bs=sc; best=n; } }
  return {k:'call', n:best};
}

/* 화면 */
let pick=null, lastKey='', prevMine=0, prevReach=[false,false];
function render(el,v,ctx){
  const me=ctx.me, others=v.board.map((_,q)=>q).filter(q=>q!==me), o=others[0], b=v.board[me], set=new Set(v.called);
  const who=i=> i===me&&ctx.mode!=='local' ? '나' : U.esc(ctx.name(i));
  const key=v.called.length+':'+v.phase; const fresh=key!==lastKey; lastKey=key;
  const done=new Set(); for(const L of LINES) if(L.every(i=>set.has(b[i]))) L.forEach(i=>done.add(i));
  const canCall = ctx.myTurn && v.phase==='play';
  let h='';
  if(v.phase==='setup') h+=`<div class="banner">내 빙고판 짜기 · 칸 두 개를 차례로 누르면 자리가 바뀌어요</div>`;
  else if(v.last){ const L=v.last; h+=`<div class="bg-call ${fresh?'pop':''}">${who(L.p)}: <b>${L.n}</b>!</div>`; }
  const rc=i=> v.reach&&v.reach[i]&&v.phase==='play' ? ' <span class="bg-reach">🔥리치</span>' : '';
  h+=`<div class="bg-lines">${others.map(q=>`<span>${v.turn===q?'👉':''}${who(q)} <b>${v.lines[q]}</b>줄${rc(q)}</span>`).join('')}<span>${who(me)} <b>${v.lines[me]}</b>줄${rc(me)}</span><span class="muted">${NEED}줄이면 빙고!</span></div>`;
  h+=`<div class="bg-board ${canCall?'aim':''}">${b.map((n,i)=>`<button class="bg-c ${set.has(n)?'hit':''} ${done.has(i)?'line':''} ${pick===i?'sel':''} ${v.last&&v.last.n===n&&fresh?'new':''}" data-i="${i}" data-n="${n}">${n}</button>`).join('')}</div>`;
  if(v.phase==='setup'){
    h+= v.ready[me] ? `<div class="info">${others.every(q=>v.ready[q])?'':'다른 사람이 판을 짜는 중…'}</div>` : `<div class="fh-act"><button class="ghost" data-a="shuffle">🔀 다시 섞기</button><button data-a="ready">✅ 이대로 시작</button></div>`;
  } else if(canCall) h+=`<div class="info">내 판에서 부를 숫자를 누르세요 (상대 판에도 같이 지워져요)</div>`;
  if(v.phase==='over') for(const o of others){ if(!v.board[o]) continue;
    const ob=v.board[o], od=new Set(); for(const L of LINES) if(L.every(i=>set.has(ob[i]))) L.forEach(i=>od.add(i));
    h+=`<div class="info">${who(o)}의 판 공개</div><div class="bg-board small">${ob.map((n,i)=>`<span class="bg-c ${set.has(n)?'hit':''} ${od.has(i)?'line':''}">${n}</span>`).join('')}</div>`;
  }
  if(v.called.length) h+=`<div class="bg-called">부른 숫자: ${v.called.join(' · ')}</div>`;
  el.innerHTML=h;
  if(fresh && v.lines[me]>prevMine) ctx.sfx('score'); prevMine=v.lines[me];
  if(fresh && v.reach){ v.reach.forEach((_,i)=>{ if(v.reach[i]&&!prevReach[i]&&v.phase==='play'&&typeof showSay==='function') setTimeout(()=>showSay(i, U.pick(['리치! 🔥','리치~ 한 칸 남았다','리치!! 떨린다']),3500),400); }); prevReach=v.reach.slice(); }
  el.onclick=e=>{
    const a=e.target.closest('[data-a]'); if(a){ ctx.act({k:a.dataset.a}); return; }
    const c=e.target.closest('.bg-c[data-i]'); if(!c) return; const i=+c.dataset.i;
    if(v.phase==='setup' && !v.ready[me]){ if(pick==null){ pick=i; ctx.rerender(); } else { const j=pick; pick=null; if(j!==i) ctx.act({k:'swap',i:j,j:i}); else ctx.rerender(); } return; }
    if(!canCall) return; const n=+c.dataset.n; if(set.has(n)){ ctx.tip('이미 부른 숫자예요'); return; }
    ctx.act({k:'call',n});
  };
}
function status(v,ctx){
  if(v.phase==='setup') return v.ready[ctx.me] ? '상대가 판을 다 짜길 기다리는 중…' : '판을 확인하고 시작을 누르세요';
  return ctx.turnText(v)+(ctx.myTurn?' · 숫자를 부르세요':'');
}
const guide=`
<p>각자 <b>1~25</b>를 5×5 빙고판에 숨겨 놓고, 차례로 숫자를 <b>하나씩 불러요</b>(2~6명). 부른 숫자는 <b>모두</b> 자기 판에서 지워져요. 가로·세로·대각선 <b>${NEED}줄</b>을 먼저 완성하면 <b>빙고!</b></p>
<ul><li>시작 전에 판이 무작위로 채워져요. 🔀 다시 섞거나, 칸 두 개를 차례로 눌러 자리를 바꿀 수 있어요.</li>
<li>상대 판은 끝날 때까지 안 보여요. 상대가 <b>몇 줄</b> 만들었는지만 보여요.</li>
<li>내 차례엔 내 판에서 아직 안 지운 숫자를 누르면 불러요.</li>
<li>한 칸만 더 지우면 빙고가 되는 순간 자동으로 <b>🔥 리치!</b>를 외쳐요. 상대도 알게 돼요. 상대가 리치일 땐 내가 부르는 숫자가 상대 빙고를 완성해 줄 수도 있어요!</li>
<li>한 숫자로 둘 다 ${NEED}줄이 되면 <b>부른 사람</b>이 이겨요.</li></ul>
<div class="tipbox">💡 <b>팁</b><br>
· 내 줄이 거의 찬 숫자를 부르세요. 하지만 상대 판에선 그 숫자가 어디 있을지 몰라요!<br>
· 상대가 부르는 숫자를 보면 상대가 노리는 줄을 짐작할 수 있어요.<br>
· 가운데 칸(13번째)은 줄 4개에 걸려 있어서 가장 귀한 자리예요.</div>`;
window.GAMES.bingo = {
  title:'숫자 빙고 대결', ref:'빙고', emoji:'🎯', tags:['추리','클래식','심리전'],
  maxH:6, pulse:v=>v.lines.length===2?v.lines[1]-v.lines[0]:0, pulseStep:1,
  tagline:'1~25를 숨겨 놓고 번갈아 부르기. 3줄 먼저 완성하면 빙고!',
  guide, init, apply, mask, ai, render, status,
  aiDelay:s=> s.phase==='setup' ? 1500+Math.random()*1500 : 900+Math.random()*1600,
  reset(){ pick=null; lastKey=''; prevMine=0; prevReach=[]; },
  bar:(v,i)=>`<span class="score">${v.lines[i]}</span><span class="tag">줄</span>`,
};
})();
