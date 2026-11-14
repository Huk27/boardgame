(function(){
'use strict';
/* 벽바둑 (1:1). 7×7, 각자 말 4개(2개는 정해진 자리, 2개는 번갈아 놓기).
   차례: 내 말 하나를 상하좌우로 0~2칸 이동(벽·말은 못 지나감) → 멈춘 칸의 네 변 중 하나에 반드시 벽 1개.
   벽으로 나뉜 모든 구역에 한 사람의 말만 남으면(또는 말 없음) 끝. 내 말만 있는 구역의 칸 수가 점수, 많은 쪽 승리. */
const S=7;
const START=[[[1,1],[5,5]],[[1,5],[5,1]]];
function init(starter){
  const pos=[START[0].slice(),START[1].slice()].map(a=>a.map(x=>x.slice()));
  const h=[...Array(S-1)].map(()=>Array(S).fill(false)), v=[...Array(S)].map(()=>Array(S-1).fill(false));
  return {pos, h, v, phase:'place', placeSeq:[starter,1-starter,1-starter,starter], turn:starter, starter, winner:null, last:null, moves:0};
}
const inB=(r,c)=>r>=0&&r<S&&c>=0&&c<S;
const occ=(s,r,c)=>s.pos[0].some(p=>p[0]===r&&p[1]===c)?0 : s.pos[1].some(p=>p[0]===r&&p[1]===c)?1 : -1;
function blocked(s,r,c,dr,dc){ if(dr===1) return s.h[r][c]; if(dr===-1) return s.h[r-1][c]; if(dc===1) return s.v[r][c]; return s.v[r][c-1]; }
const D=[[1,0],[-1,0],[0,1],[0,-1]];
function reach(s,p,k){ const [r0,c0]=s.pos[p][k], out=[[r0,c0]], seen=new Set([r0+','+c0]);
  let fr=[[r0,c0]]; for(let step=0;step<2;step++){ const nf=[]; for(const [r,c] of fr) for(const [dr,dc] of D){ const y=r+dr,x=c+dc; if(!inB(y,x)||blocked(s,r,c,dr,dc)||occ(s,y,x)>=0) continue; const kk=y+','+x; if(seen.has(kk)) continue; seen.add(kk); out.push([y,x]); nf.push([y,x]); } fr=nf; }
  return out; }
function freeSides(s,r,c){ const out=[]; for(const [dr,dc,n] of [[-1,0,'u'],[1,0,'d'],[0,-1,'l'],[0,1,'r']]){ if(!inB(r+dr,c+dc)) continue; if(!blocked(s,r,c,dr,dc)) out.push(n); } return out; }
function setWall(s,r,c,side){ if(side==='u') s.h[r-1][c]=true; if(side==='d') s.h[r][c]=true; if(side==='l') s.v[r][c-1]=true; if(side==='r') s.v[r][c]=true; }
function legal(s,p){ const out=[]; for(let k=0;k<4;k++){ if(!s.pos[p][k]) continue; for(const [r,c] of reach(s,p,k)){ const tmp={...s,pos:s.pos.map((a,i)=>i===p?a.map((x,j)=>j===k?[r,c]:x):a)}; for(const w of freeSides(tmp,r,c)) out.push({k,to:[r,c],w}); } } return out; }
function regions(s){ const id=[...Array(S)].map(()=>Array(S).fill(-1)), regs=[]; for(let r=0;r<S;r++) for(let c=0;c<S;c++){ if(id[r][c]>=0) continue; const reg={cells:0,own:new Set()}; const st=[[r,c]]; id[r][c]=regs.length;
    while(st.length){ const [y,x]=st.pop(); reg.cells++; const o=occ(s,y,x); if(o>=0) reg.own.add(o); for(const [dr,dc] of D){ const ny=y+dr,nx=x+dc; if(!inB(ny,nx)||blocked(s,y,x,dr,dc)||id[ny][nx]>=0) continue; id[ny][nx]=regs.length; st.push([ny,nx]); } }
    regs.push(reg); }
  return {regs,id}; }
function scoreOf(s){ const {regs}=regions(s); const sc=[0,0]; let mixed=false; for(const g of regs){ if(g.own.size===1) sc[[...g.own][0]]+=g.cells; if(g.own.size>1) mixed=true; } return {sc,mixed}; }
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(s.turn!==p) return '상대 차례예요';
  if(s.phase==='place'){ if(a.k!=='place') return '말을 놓으세요'; const [r,c]=a.at||[]; if(!inB(r,c)||occ(s,r,c)>=0) return '빈 칸에 놓으세요';
    s.pos[p].push([r,c]); s.last={p,to:[r,c]}; s.placeSeq.shift(); if(!s.placeSeq.length){ s.phase='play'; s.turn=s.starter; } else s.turn=s.placeSeq[0]; return null; }
  if(a.k!=='move') return '알 수 없는 동작';
  const k=a.piece|0; if(!s.pos[p][k]) return '말을 고르세요';
  const to=a.to||[]; if(!reach(s,p,k).some(([r,c])=>r===to[0]&&c===to[1])) return '거기로는 못 가요 (0~2칸, 벽·말 통과 불가)';
  const from=s.pos[p][k]; s.pos[p][k]=[to[0],to[1]];
  if(!freeSides(s,to[0],to[1]).includes(a.w)){ s.pos[p][k]=from; return '그 변엔 벽을 세울 수 없어요'; }
  setWall(s,to[0],to[1],a.w); s.last={p,from,to,w:a.w}; s.moves++;
  const {sc,mixed}=scoreOf(s); s.score=sc;
  if(!mixed){ s.winner = sc[0]>sc[1]?0 : sc[1]>sc[0]?1 : 'draw'; s.turn=null; return null; }
  if(!legal(s,1-p).length){ if(!legal(s,p).length){ s.winner = sc[0]>sc[1]?0 : sc[1]>sc[0]?1 : 'draw'; s.turn=null; return null; } return null; }
  s.turn=1-p; return null;
}
/* 컴퓨터: 거리 기준 영역 추정 + 알파베타 */
function evalS(s){ // 1번 관점
  const {regs,id}=regions(s); let v=0; const done=new Set();
  regs.forEach((g,gi)=>{ if(g.own.size<=1){ done.add(gi); if(g.own.size===1) v += ([...g.own][0]===1?1:-1)*g.cells; } });
  // 섞인 구역: 칸마다 더 가까운 쪽 (벽 고려 BFS)
  const dist=p=>{ const d=[...Array(S)].map(()=>Array(S).fill(99)); const q=[]; for(const [r,c] of s.pos[p]){ d[r][c]=0; q.push([r,c]); } while(q.length){ const [r,c]=q.shift(); for(const [dr,dc] of D){ const y=r+dr,x=c+dc; if(!inB(y,x)||blocked(s,r,c,dr,dc)||d[y][x]<=d[r][c]+1) continue; d[y][x]=d[r][c]+1; q.push([y,x]); } } return d; };
  const d0=dist(0), d1=dist(1);
  for(let r=0;r<S;r++) for(let c=0;c<S;c++){ if(done.has(id[r][c])) continue; if(d1[r][c]<d0[r][c]) v+=.8; else if(d0[r][c]<d1[r][c]) v-=.8; }
  return v; }
function play(s,p,m){ const t={pos:s.pos.map(a=>a.map(x=>x.slice())), h:s.h.map(r=>r.slice()), v:s.v.map(r=>r.slice())}; t.pos[p][m.k]=m.to.slice(); setWall(t,m.to[0],m.to[1],m.w); return t; }
function ab(s,p,d,al,be){
  const {sc,mixed}=scoreOf(s); if(!mixed) return (sc[1]-sc[0])*100;
  if(d===0) return evalS(s);
  const L=legal(s,p); if(!L.length) return evalS(s);
  if(p===1){ let best=-1e9; for(const m of L){ best=Math.max(best,ab(play(s,1,m),0,d-1,al,be)); al=Math.max(al,best); if(al>=be) break; } return best; }
  let best=1e9; for(const m of L){ best=Math.min(best,ab(play(s,0,m),1,d-1,al,be)); be=Math.min(be,best); if(al>=be) break; } return best;
}
function ai(v,lvl=1){
  if(v.phase==='place'){ let best=null; for(let r=0;r<S;r++) for(let c=0;c<S;c++){ if(occ(v,r,c)>=0) continue; const t={...v,pos:[v.pos[0],v.pos[1].concat([[r,c]])]}; const sc=evalS(t)+Math.random()*[3,1,.3][lvl]; if(!best||sc>best.sc) best={sc,r,c}; } return {k:'place',at:[best.r,best.c]}; }
  const L=legal(v,1); if(!L.length) return null;
  let cands=L.map(m=>({m,sc:evalS(play(v,1,m))})).sort((a,b)=>b.sc-a.sc);
  if(lvl===2){ cands=cands.slice(0,14); for(const c of cands) c.sc=ab(play(v,1,c.m),0,1,-1e9,1e9); cands.sort((a,b)=>b.sc-a.sc); }
  const pick = lvl===0 ? U.pick(cands.slice(0,Math.max(1,Math.ceil(cands.length*.35)))) : cands[0];
  return {k:'move', piece:pick.m.k, to:pick.m.to, w:pick.m.w};
}
/* 화면 */
let sel=null, dest=null;
function render(el,v,ctx){
  const me=ctx.me, my=ctx.myTurn;
  if(!my){ sel=null; dest=null; }
  const reachSet = my&&v.phase==='play'&&sel!=null ? reach(v,me,sel).map(([r,c])=>r+','+c) : [];
  const Z=48, O=12, W=O*2+Z*S;
  let svg=`<svg class="wg-svg" viewBox="0 0 ${W} ${W}">`;
  const {regs,id}=regions(v);
  for(let r=0;r<S;r++) for(let c=0;c<S;c++){ const g=regs[id[r][c]], own=g.own.size===1?[...g.own][0]:null;
    const cls=['wg-c', own!=null?`own${own}`:'', reachSet.includes(r+','+c)?'reach':'', dest&&dest[0]===r&&dest[1]===c?'dest':'', my&&v.phase==='place'&&occ(v,r,c)<0?'reach':''].join(' ');
    svg+=`<rect class="${cls}" data-rc="${r},${c}" x="${O+c*Z+1}" y="${O+r*Z+1}" width="${Z-2}" height="${Z-2}" rx="5"/>`; }
  for(let r=0;r<S-1;r++) for(let c=0;c<S;c++) if(v.h[r][c]) svg+=`<line class="wg-w" x1="${O+c*Z}" y1="${O+(r+1)*Z}" x2="${O+(c+1)*Z}" y2="${O+(r+1)*Z}"/>`;
  for(let r=0;r<S;r++) for(let c=0;c<S-1;c++) if(v.v[r][c]) svg+=`<line class="wg-w" x1="${O+(c+1)*Z}" y1="${O+r*Z}" x2="${O+(c+1)*Z}" y2="${O+(r+1)*Z}"/>`;
  if(v.last&&v.last.w){ const [r,c]=v.last.to, w=v.last.w; const seg = w==='u'?[c,r,c+1,r] : w==='d'?[c,r+1,c+1,r+1] : w==='l'?[c,r,c,r+1] : [c+1,r,c+1,r+1]; svg+=`<line class="wg-w last" x1="${O+seg[0]*Z}" y1="${O+seg[1]*Z}" x2="${O+seg[2]*Z}" y2="${O+seg[3]*Z}"/>`; }
  for(const p of [0,1]) v.pos[p].forEach(([r,c],k)=>{ svg+=`<circle class="wg-p p${p} ${p===me&&my&&v.phase==='play'?'can':''} ${p===me&&sel===k?'sel':''}" data-pc="${p},${k}" cx="${O+c*Z+Z/2}" cy="${O+r*Z+Z/2}" r="${Z*.32}"/>`; });
  if(dest){ const [r,c]=dest; const tmp={...v,pos:v.pos.map((a,i)=>i===me?a.map((x,j)=>j===sel?dest:x):a)};
    for(const w of freeSides(tmp,r,c)){ const seg = w==='u'?[c,r,c+1,r] : w==='d'?[c,r+1,c+1,r+1] : w==='l'?[c,r,c,r+1] : [c+1,r,c+1,r+1]; svg+=`<line class="wg-opt" data-w="${w}" x1="${O+seg[0]*Z}" y1="${O+seg[1]*Z}" x2="${O+seg[2]*Z}" y2="${O+seg[3]*Z}"/>`; } }
  svg+=`</svg>`;
  const sc=scoreOf(v).sc;
  let h=svg;
  h+=`<div class="info">${v.phase==='place'?(my?'빈 칸을 눌러 말을 놓으세요':'말을 놓는 중…'):my?(sel==null?'움직일 내 말을 누르세요':dest?'초록 선 중 하나를 눌러 벽을 세우세요':'0~2칸 안의 칸(초록)을 누르세요 — 제자리도 돼요'):''}</div>`;
  h+=`<div class="info">확정된 영역 · 나 <b>${sc[me]}</b> : 상대 <b>${sc[1-me]}</b> <small>(한 사람 말만 남은 구역)</small></div>`;
  el.innerHTML=h;
  el.onclick=e=>{ if(!ctx.myTurn) return;
    const w=e.target.closest('[data-w]'); if(w&&dest){ const a={k:'move',piece:sel,to:dest,w:w.dataset.w}; sel=null; dest=null; return ctx.act(a); }
    const pc=e.target.closest('[data-pc]'); if(pc&&v.phase==='play'){ const [p,k]=pc.dataset.pc.split(',').map(Number); if(p===me){ sel=k; dest=null; return ctx.rerender(); } }
    const rc=e.target.closest('[data-rc]'); if(rc){ const [r,c]=rc.dataset.rc.split(',').map(Number);
      if(v.phase==='place') return ctx.act({k:'place',at:[r,c]});
      if(sel!=null&&reachSet.includes(r+','+c)){ dest=[r,c]; return ctx.rerender(); }
      const o=occ(v,r,c); if(o===me){ sel=v.pos[me].findIndex(x=>x[0]===r&&x[1]===c); dest=null; return ctx.rerender(); } }
  };
}
const guide=`
<p><b>1:1 벽 땅따먹기</b>. 7×7 판에서 말을 움직이고 벽을 세워 <b>내 말만 있는 구역</b>을 크게 만들어요. <small>(데블스 플랜 「벽바둑」의 알려진 규칙 — 쿼리도의 벽 + 바둑의 영역)</small></p>
<ul><li>각자 말 4개: 2개는 정해진 자리, 나머지 2개는 번갈아 원하는 빈 칸에(선·후·후·선 순서).</li>
<li><b>차례</b>: 내 말 하나를 상하좌우로 <b>0~2칸</b> 이동(벽과 말은 못 지나감, 제자리도 OK) → 멈춘 칸의 <b>네 변 중 하나에 반드시 벽</b>.</li>
<li>벽으로 나뉜 <b>모든 구역에 한 사람의 말만</b> 남으면(또는 말이 없으면) 끝.</li>
<li>점수 = <b>내 말만 있는 구역의 칸 수</b> 합계. 많은 쪽 승리!</li></ul>
<div class="tipbox">💡 <b>팁</b><br>· 상대 말과 같은 구역에 있으면 아직 내 땅이 아니에요. 벽으로 갈라야 확정!<br>· 넓은 빈 땅 쪽으로 먼저 말을 보내 울타리를 치세요. 판에 색이 칠해진 칸이 확정된 영역이에요.</div>`;
window.GAMES.wallgo = {
  title:'벽바둑', ref:'데블스 플랜 「벽바둑」', emoji:'🧱', tags:['전략','영역','추상','두뇌서바이벌'],
  pulse:v=>{ const s=scoreOf(v).sc; return s[1]-s[0]; }, pulseStep:3,
  tagline:'말을 움직이고 벽을 세워, 내 말만 있는 구역을 넓혀라. 쿼리도의 벽 + 바둑의 영역.',
  guide, init, apply, ai, local:true, render,
  reset(){ sel=null; dest=null; },
  status:(v,ctx)=>ctx.turnText(v)+(ctx.myTurn?(v.phase==='place'?' · 말을 놓으세요':' · 말 이동 → 벽 세우기'):''),
  bar:(v,i)=>`<span class="ck-chip p${i}"></span><span class="score">${scoreOf(v).sc[i]}</span>`,
};
})();
