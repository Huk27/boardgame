(function(){
'use strict';
/* 바그찰 (네팔 전통 '호랑이와 염소', 데블스 플랜 S2 결승 2R 방식).
   5×5 교차점, 대각선은 (행+열)이 짝수인 점에서만. 호랑이 4마리는 네 구석, 염소 20마리는 밖에서 시작.
   판이 두 개: 판 A는 선이 🐐 염소 / 상대가 🐯 호랑이, 판 B는 그 반대.
   선은 첫 차례에 판 A에 염소 한 마리만 두고, 이후 각자 차례마다 "내 호랑이 판에서 한 수 + 내 염소 판에서 한 수"를 둔다.
   염소: 20마리를 다 둔 뒤에야 선을 따라 한 칸씩 이동. 호랑이: 한 칸 이동 또는 붙어 있는 염소를 뛰어넘어 잡기.
   호랑이가 염소 5마리를 잡으면 호랑이 승, 호랑이가 하나도 못 움직이면 염소 승 — 어느 판이든 먼저 끝나는 판의 승자가 게임 승리.
   (판마다 140수가 지나도 안 끝나면 잡은 염소가 많은 쪽 승리) */
const N=5, GOATS=20, KILL=5, CAP=140;
const RC=i=>[Math.floor(i/N), i%N], ID=(r,c)=>r*N+c, inb=(r,c)=>r>=0&&r<N&&c>=0&&c<N;
const DIRS=[[0,1],[1,0],[0,-1],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
const ADJ=[], JMP=[];   // ADJ[i]=[j...], JMP[i]=[[over,to]...]
for(let i=0;i<N*N;i++){ const [r,c]=RC(i), even=(r+c)%2===0; ADJ[i]=[]; JMP[i]=[];
  for(const [dr,dc] of DIRS){ if(dr&&dc&&!even) continue; if(inb(r+dr,c+dc)) ADJ[i].push(ID(r+dr,c+dc)); if(inb(r+2*dr,c+2*dc)) JMP[i].push([ID(r+dr,c+dc),ID(r+2*dr,c+2*dc)]); } }
function newBoard(){ const c=Array(N*N).fill(0); c[0]=c[4]=c[20]=c[24]=2; return {c, placed:0, cap:0, ply:0, side:'G', last:null, win:null}; }
function tigerMoves(B){ const out=[]; for(let i=0;i<25;i++) if(B.c[i]===2){
  for(const j of ADJ[i]) if(!B.c[j]) out.push({from:i,to:j});
  for(const [o,t] of JMP[i]) if(B.c[o]===1&&!B.c[t]) out.push({from:i,to:t,kill:o}); } return out; }
function goatMoves(B){ const out=[];
  if(B.placed<GOATS){ for(let i=0;i<25;i++) if(!B.c[i]) out.push({from:null,to:i}); return out; }
  for(let i=0;i<25;i++) if(B.c[i]===1) for(const j of ADJ[i]) if(!B.c[j]) out.push({from:i,to:j}); return out; }
const movesOf=B=>B.side==='T'?tigerMoves(B):goatMoves(B);
function doMove(B,m){   // 판 상태를 바꾸고 되돌리기 정보 반환
  const u={side:B.side, placed:B.placed, cap:B.cap, last:B.last, win:B.win, m};
  if(B.side==='G'){ if(m.from==null){ B.c[m.to]=1; B.placed++; } else { B.c[m.from]=0; B.c[m.to]=1; } }
  else { B.c[m.from]=0; B.c[m.to]=2; if(m.kill!=null){ B.c[m.kill]=0; B.cap++; } }
  B.side = B.side==='G'?'T':'G'; B.ply++; B.last={from:m.from,to:m.to,kill:m.kill};
  if(B.cap>=KILL) B.win='T'; else if(B.side==='T'&&!tigerMoves(B).length) B.win='G'; else if(B.side==='G'&&!goatMoves(B).length) B.win='T';
  return u;
}
function undo(B,u){ const m=u.m;
  if(u.side==='G'){ if(m.from==null){ B.c[m.to]=0; } else { B.c[m.to]=0; B.c[m.from]=1; } }
  else { B.c[m.to]=0; B.c[m.from]=2; if(m.kill!=null) B.c[m.kill]=1; }
  B.side=u.side; B.placed=u.placed; B.cap=u.cap; B.last=u.last; B.win=u.win; B.ply--; }

/* 판 0: 0번 사람이 염소. 판 1: 1번 사람이 염소. */
const goatOf=b=>b, tigerOf=b=>1-b;
function init(starter){
  const s={bd:[newBoard(),newBoard()], starter, turn:starter, winner:null, log:[], ev:0, endBy:null,
    need:{T:null, G:starter}, notice:'🎙️ 결승 「바그찰」 — 판 두 개, 한쪽은 염소 · 한쪽은 호랑이'};
  return s;
}
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(s.turn!==p) return '상대 차례예요';
  if(!a||a.k!=='mv') return '알 수 없는 동작';
  const b=a.b|0; if(b!==0&&b!==1) return '판을 고르세요';
  const role = goatOf(b)===p ? 'G' : 'T';
  if(s.need[role]!==b) return role==='G'?'이 판의 염소는 이번 차례에 이미 뒀어요':'이 판의 호랑이는 이번 차례에 둘 수 없어요';
  const B=s.bd[b]; if(B.side!==role) return '이 판은 상대 차례예요';
  const mv=movesOf(B).find(m=>m.to===(a.to|0) && (m.from==null ? a.from==null : m.from===(a.from|0)));
  if(!mv) return role==='G'&&B.placed<GOATS?'빈 점에 염소를 두세요':'그쪽으로는 못 움직여요';
  doMove(B,mv); s.need[role]=null; s.ev++;
  const L='AB'[b];
  s.log.push(`${p?'B':'A'} · 판 ${L} ${role==='G'?(mv.from==null?`🐐 염소 놓기 (${B.placed}/${GOATS})`:'🐐 염소 이동'):(mv.kill!=null?`🐯 잡았다! (${B.cap}/${KILL})`:'🐯 호랑이 이동')}`);
  if(B.win){ end(s,b,B.win==='G'?goatOf(b):tigerOf(b), B.win==='T'?(B.cap>=KILL?'kill':'stuck'):'trap'); return null; }
  if(s.need.T==null&&s.need.G==null){
    if(s.bd[0].ply>=CAP&&s.bd[1].ply>=CAP){ const c0=s.bd[1].cap, c1=s.bd[0].cap;   // 0번이 잡은 수 = 판 1(0번이 호랑이)의 cap
      s.winner=c0>c1?0:c1>c0?1:'draw'; s.endBy='cap'; s.turn=null; s.notice=`🎙️ ${CAP}수 제한 — 잡은 염소 ${c0} : ${c1}`; return null; }
    s.turn=1-p; const q=s.turn; s.need={T:1-q, G:q};   // q가 호랑이인 판 = 상대의 염소 판(1-q), 염소 판 = q
    const tb=s.bd[1-q], gb=s.bd[q];
    if(tb.side!=='T') s.need.T=null; if(gb.side!=='G') s.need.G=null;
    s.notice=null;
  }
  return null;
}
function end(s,b,w,how){ s.winner=w; s.turn=null; s.endBy=how; s.endBoard=b;
  s.notice = how==='kill' ? `🎙️ 판 ${'AB'[b]}에서 호랑이가 염소 ${KILL}마리를 잡았습니다!` : how==='trap' ? `🎙️ 판 ${'AB'[b]}에서 호랑이가 꼼짝 못 합니다 — 염소의 승리!` : `🎙️ 판 ${'AB'[b]}에서 염소가 더 움직일 곳이 없습니다`;
  s.log.push(s.notice.replace('🎙️ ','🏁 ')); s.ev++; }
function mask(s){ return U.clone(s); }

/* 컴퓨터: 판마다 알파베타 탐색 (판이 공개 정보라 숨김 없음) */
function evalB(B){   // 호랑이 기준 점수
  if(B.win==='T') return 10000; if(B.win==='G') return -10000;
  let mob=0, threat=0, trapped=0;
  for(let i=0;i<25;i++) if(B.c[i]===2){ let m=0;
    for(const j of ADJ[i]) if(!B.c[j]) m++;
    for(const [o,t] of JMP[i]) if(B.c[o]===1&&!B.c[t]){ m++; threat++; }
    mob+=m; if(!m) trapped++; }
  return B.cap*130 + threat*(B.side==='T'?45:18) + mob*3 - trapped*35 + (GOATS-B.placed)*0;
}
function search(B,d,al,be){
  if(d===0||B.win) return evalB(B);
  let ms=movesOf(B); if(B.side==='T') ms.sort((x,y)=>(y.kill!=null)-(x.kill!=null));
  if(B.side==='T'){ let v=-1e9; for(const m of ms){ const u=doMove(B,m); const x=search(B,d-1,al,be); undo(B,u); if(x>v) v=x; if(v>al) al=v; if(al>=be) break; } return v; }
  let v=1e9; for(const m of ms){ const u=doMove(B,m); const x=search(B,d-1,al,be); undo(B,u); if(x<v) v=x; if(v<be) be=v; if(al>=be) break; } return v;
}
function bestMove(B,lvl){
  const depth=[1,3,4][lvl], ms=movesOf(B), sign=B.side==='T'?1:-1, noise=[90,12,3][lvl];
  let best=null, bv=-1e18;
  for(const m of U.shuffle(ms.slice())){ const u=doMove(B,m); const x=sign*search(B,depth-1,-1e9,1e9)+Math.random()*noise; undo(B,u); if(x>bv){ bv=x; best=m; } }
  return best;
}
function ai(v,lvl=1){
  const me=1; if(v.turn!==me) return null;
  // 호랑이 판부터 (상대 염소 수에 답하고), 그다음 내 염소 판
  const b = v.need.T!=null ? v.need.T : v.need.G; if(b==null) return null;
  const B=v.bd[b]; B.ply=B.ply||0; const m=bestMove(B,lvl); if(!m) return null;
  return {k:'mv', b, from:m.from, to:m.to};
}
function aiDelay(v){
  const b = v.need.T!=null ? v.need.T : v.need.G; if(b==null) return 800;
  const B=v.bd[b]; const hot = B.side==='T' ? tigerMoves(B).some(m=>m.kill!=null) : tigerThreat(B);
  return 1100+Math.random()*1500 + (hot?1300:0) + (B.side==='G'&&B.placed>=GOATS?700:0);
}
function tigerThreat(B){ return tigerMoves(B).some(m=>m.kill!=null); }

/* 화면 */
let sel=null, selSig='';
function boardSVG(v,b,ctx){
  const B=v.bd[b], me=ctx.me, myRole = goatOf(b)===me?'G':'T';
  const active = v.turn===me && v.need[myRole]===b && B.side===myRole && v.winner==null && (ctx.mode!=='local'||true);
  const pad=22, step=52, W=pad*2+step*4;
  const P=i=>{ const [r,c]=RC(i); return [pad+c*step, pad+r*step]; };
  let lines='';
  for(let i=0;i<25;i++) for(const j of ADJ[i]) if(j>i){ const [x1,y1]=P(i),[x2,y2]=P(j); lines+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`; }
  const legal = active ? movesOf(B) : [];
  const targets = new Set(legal.filter(m=> (sel&&sel.b===b) ? m.from===sel.i : m.from==null).map(m=>m.to));
  const movable = new Set(legal.filter(m=>m.from!=null).map(m=>m.from));
  let pts='';
  for(let i=0;i<25;i++){ const [x,y]=P(i), c=B.c[i];
    const isLast = B.last && (B.last.to===i || B.last.from===i);
    const isKill = B.last && B.last.kill===i;
    if(c){ pts+=`<g class="bc-pc ${c===2?'t':'g'} ${movable.has(i)?'mv':''} ${sel&&sel.b===b&&sel.i===i?'sel':''} ${isLast&&B.last.to===i?'last':''}" data-b="${b}" data-i="${i}"><circle cx="${x}" cy="${y}" r="19"/><text x="${x}" y="${y+7}" text-anchor="middle">${c===2?'🐯':'🐐'}</text></g>`; }
    else { pts+=`<g class="bc-pt ${targets.has(i)?'tg':''} ${isKill?'kill':''} ${isLast&&B.last.from===i?'from':''}" data-b="${b}" data-i="${i}"><circle cx="${x}" cy="${y}" r="${targets.has(i)?11:5}"/>${isKill?`<text x="${x}" y="${y+5}" text-anchor="middle" font-size="14">💥</text>`:''}</g>`; }
  }
  const tName = tigerOf(b)===me?'나':ctx.mode==='solo'?'상대':U.esc(ctx.name(tigerOf(b)));
  const gName = goatOf(b)===me?'나':ctx.mode==='solo'?'상대':U.esc(ctx.name(goatOf(b)));
  const done = v.winner!=null && v.endBoard===b;
  return `<div class="bc-board ${active?'act':''} ${done?'done':''}">
    <div class="bc-head"><b>판 ${'AB'[b]}</b> · 🐐 ${gName} vs 🐯 ${tName}${active?` <span class="bc-you">${myRole==='G'?'🐐 염소를 두세요':'🐯 호랑이를 움직이세요'}</span>`:''}</div>
    <svg viewBox="0 0 ${W} ${W}" class="bc-svg">${lines}${pts}</svg>
    <div class="bc-stat"><span>🐐 남은 염소 <b>${GOATS-B.placed}</b></span><span>💥 잡힘 <b>${B.cap}</b>/${KILL}</span><span>${B.ply}수</span></div></div>`;
}
function render(el,v,ctx){
  const me=ctx.me;
  const sg=v.ev+':'+v.turn; if(sg!==selSig){ sel=null; selSig=sg; }
  let h='';
  if(v.notice) h+=`<div class="vr-speech">${U.esc(v.notice)}</div>`;
  const myG=ctx.mode==='local'?0:me, myT=1-myG;   // 내 염소 판을 왼쪽에 (한 화면 둘이는 판 A가 늘 왼쪽)
  let line='&nbsp;';
  if(v.winner==null){
    if(v.turn===me){ const left=[]; if(v.need.T!=null) left.push(`판 ${'AB'[v.need.T]} 🐯`); if(v.need.G!=null) left.push(`판 ${'AB'[v.need.G]} 🐐`); line=`내 차례 — 남은 수: ${left.join(' · ')}`; }
    else line = ctx.mode==='solo' ? '상대가 생각 중…' : '상대 차례';
  } else line = v.winner==='draw' ? '🤝 무승부' : v.winner===me ? '🎉 승리!' : '😢 패배';
  h+=`<div class="py-line">${line}</div>`;
  h+=`<div class="bc-two">${boardSVG(v,myG,ctx)}${boardSVG(v,myT,ctx)}</div>`;
  h+=`<details class="hl-log" open><summary>기록 · 잡은 염소 — 나 ${v.bd[myT].cap} : 상대 ${v.bd[myG].cap}</summary>${v.log.slice(-12).reverse().map(x=>`<div>${U.esc(x).replace(/^A\b/,me===0?'나':'상대').replace(/^B\b/,me===1?'나':'상대')}</div>`).join('')}</details>`;
  el.innerHTML=h;
  el.onclick=e=>{ const g=e.target.closest('[data-i]'); if(!g) return; const b=+g.dataset.b, i=+g.dataset.i, B=v.bd[b];
    const role = goatOf(b)===me?'G':'T';
    if(v.turn!==me||v.need[role]!==b||B.side!==role) return ctx.tip(v.turn!==me?'상대 차례예요':'이 판은 지금 둘 차례가 아니에요');
    const c=B.c[i];
    if(role==='G'&&B.placed<GOATS){ if(c) return ctx.tip('빈 점에 두세요'); return ctx.act({k:'mv',b,from:null,to:i}); }
    const mine = role==='G'?1:2;
    if(c===mine){ sel = (sel&&sel.b===b&&sel.i===i) ? null : {b,i}; return ctx.rerender(); }
    if(!c && sel && sel.b===b){ const f=sel.i; sel=null; return ctx.act({k:'mv',b,from:f,to:i}); }
    ctx.tip(role==='G'?'움직일 염소를 먼저 고르세요':'움직일 호랑이를 먼저 고르세요'); };
}
const guide=`
<p><b>호랑이 4마리 vs 염소 20마리</b> — 네팔 전통 놀이를 <b>판 두 개로 동시에</b>. 판 A에선 내가 🐐 염소, 판 B에선 내가 🐯 호랑이(상대는 반대).</p>
<ol><li>점 25개, 선을 따라 움직여요(대각선 선이 있는 점에서만 대각선).</li>
<li><b>🐐 염소</b>: 20마리를 한 마리씩 빈 점에 놓고, 다 놓은 뒤에야 한 칸씩 이동.</li>
<li><b>🐯 호랑이</b>: 한 칸 이동, 또는 <b>바로 옆 염소를 뛰어넘어</b> 건너편 빈 점으로 가면 그 염소를 잡아요.</li>
<li>선은 첫 차례에 내 염소 판에 한 수만. 그다음부터 차례마다 <b>호랑이 판 한 수 + 염소 판 한 수</b>(순서 자유).</li></ol>
<p><b>승리</b>: 호랑이가 염소 <b>${KILL}마리</b>를 잡거나, 염소가 호랑이를 <b>전부 가둬</b> 못 움직이게 하면 그 판의 승자가 <b>게임 승리</b>. 두 판 다 ${CAP}수가 넘으면 잡은 염소가 많은 쪽 승리.</p>
<div class="tipbox">💡 <b>팁</b><br>· 염소는 붙어서 벽을 만드세요. 뒤가 비어 있으면 뛰어넘어 잡혀요.<br>· 호랑이는 구석에 갇히지 않게 가운데로.<br>· 두 판을 동시에 봐야 해요 — 염소 판에서 버티는 동안 호랑이 판에서 먼저 끝내면 이겨요.</div>`;
window.GAMES.bagchal = {
  title:'바그찰', ref:'데블스 플랜 「바그찰」', emoji:'🐯', tags:['전략','추상','두뇌서바이벌','결승'], local:true,
  tagline:'호랑이 4마리와 염소 20마리. 판 두 개에서 동시에 한쪽은 잡고, 한쪽은 가두는 결승 대결.',
  guide, init, apply, mask, ai, aiDelay, render,
  reset(){ sel=null; selSig=''; },
  status:(v,ctx)=> v.winner!=null?'':ctx.myTurn?'두 판에서 한 수씩!':ctx.turnText(v),
  bar:(v,i)=>`<span class="score">🐯 ${v.bd[1-i].cap}/${KILL}</span>`,
  pulse:v=>v.bd[0].cap*2-v.bd[1].cap*2, pulseStep:2,
};
})();
