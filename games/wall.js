(function(){
'use strict';
/* 길막: 9×9 판에서 말을 맞은편 끝줄로. 벽으로 상대 길을 돌려 막기. */
const N=9, WALLS=10, GOAL=[0,8];
const inb=(r,c)=>r>=0&&r<N&&c>=0&&c<N;
const hasW=(set,r,c)=>r>=0&&r<8&&c>=0&&c<8&&set.has(r*8+c);
function wallSets(s){ const h=new Set(), v=new Set(); for(const w of s.walls) (w.o==='h'?h:v).add(w.r*8+w.c); return {h,v}; }
// 가로벽(r,c): r행과 r+1행 사이, c·c+1열을 막음 / 세로벽(r,c): c열과 c+1열 사이, r·r+1행을 막음
function blocked(ws,r1,c1,r2,c2){
  if(c1===c2){ const r=Math.min(r1,r2); return hasW(ws.h,r,c1)||hasW(ws.h,r,c1-1); }
  const c=Math.min(c1,c2); return hasW(ws.v,r1,c)||hasW(ws.v,r1-1,c);
}
const DIRS=[[-1,0],[1,0],[0,-1],[0,1]];
function pawnMoves(s,p){
  const ws=wallSets(s), me=s.pawns[p], op=s.pawns[1-p], out=[];
  for(const [dr,dc] of DIRS){
    const r=me.r+dr, c=me.c+dc;
    if(!inb(r,c)||blocked(ws,me.r,me.c,r,c)) continue;
    if(r===op.r&&c===op.c){
      const jr=r+dr, jc=c+dc;
      if(inb(jr,jc)&&!blocked(ws,r,c,jr,jc)) out.push({r:jr,c:jc});
      else for(const [pr,pc] of (dr?[[0,-1],[0,1]]:[[-1,0],[1,0]])){
        const sr=r+pr, sc=c+pc;
        if(inb(sr,sc)&&!blocked(ws,r,c,sr,sc)) out.push({r:sr,c:sc});
      }
    } else out.push({r,c});
  }
  return out;
}
function pathLen(ws,from,goal){
  const seen=new Int8Array(81); let q=[[from.r,from.c]], d=0; seen[from.r*9+from.c]=1;
  while(q.length){
    const nq=[];
    for(const [r,c] of q){
      if(r===goal) return d;
      for(const [dr,dc] of DIRS){ const nr=r+dr, nc=c+dc;
        if(inb(nr,nc)&&!seen[nr*9+nc]&&!blocked(ws,r,c,nr,nc)){ seen[nr*9+nc]=1; nq.push([nr,nc]); } }
    }
    q=nq; d++;
  }
  return -1;
}
function wallCheck(s,p,w){
  if(s.left[p]<=0) return '벽을 다 썼어요';
  if(!(w.r>=0&&w.r<8&&w.c>=0&&w.c<8)) return '놓을 수 없는 자리';
  const ws=wallSets(s);
  if(w.o==='h'){
    if(hasW(ws.h,w.r,w.c)||hasW(ws.h,w.r,w.c-1)||hasW(ws.h,w.r,w.c+1)) return '벽이 겹쳐요';
    if(hasW(ws.v,w.r,w.c)) return '벽끼리 엇갈릴 수 없어요';
    ws.h.add(w.r*8+w.c);
  } else {
    if(hasW(ws.v,w.r,w.c)||hasW(ws.v,w.r-1,w.c)||hasW(ws.v,w.r+1,w.c)) return '벽이 겹쳐요';
    if(hasW(ws.h,w.r,w.c)) return '벽끼리 엇갈릴 수 없어요';
    ws.v.add(w.r*8+w.c);
  }
  if(pathLen(ws,s.pawns[0],GOAL[0])<0||pathLen(ws,s.pawns[1],GOAL[1])<0) return '길을 완전히 막을 순 없어요';
  return null;
}
function init(starter){ return {pawns:[{r:8,c:4},{r:0,c:4}], left:[WALLS,WALLS], walls:[], turn:starter, starter, winner:null, last:null}; }
function apply(s,p,a){
  if(!a||s.winner!=null) return '게임이 끝났어요';
  if(s.turn!==p) return '상대 차례예요';
  if(a.k==='move'){
    if(!pawnMoves(s,p).some(m=>m.r===a.r&&m.c===a.c)) return '갈 수 없는 칸이에요';
    const from={...s.pawns[p]};
    s.pawns[p]={r:a.r,c:a.c};
    s.last={p,k:'move',r:a.r,c:a.c,from};
    if(a.r===GOAL[p]){ s.winner=p; s.turn=null; return null; }
  } else if(a.k==='wall'){
    const w={o:a.o==='v'?'v':'h', r:a.r, c:a.c};
    const e=wallCheck(s,p,w); if(e) return e;
    s.walls.push(w); s.left[p]--;
    s.last={p,k:'wall',...w};
  } else return '알 수 없는 동작';
  s.turn=1-p;
  return null;
}
const dist=(s,i)=>pathLen(wallSets(s),s.pawns[i],GOAL[i]);

/* 컴퓨터: 상대가 더 빠르면 상대 길을 가장 많이 늘리는 벽, 아니면 최단 경로로 전진 */
function ai(s,lvl=1){
  const ws=wallSets(s), myD=pathLen(ws,s.pawns[1],GOAL[1]), opD=pathLen(ws,s.pawns[0],GOAL[0]);
  if(s.left[1]>0 && (opD<myD || opD<=2 || (opD===myD && Math.random()<.4))){
    let best=null, bs=-99;
    for(const o of ['h','v']) for(let r=0;r<8;r++) for(let c=0;c<8;c++){
      const w={o,r,c}; if(wallCheck(s,1,w)) continue;
      const w2=wallSets(s); (o==='h'?w2.h:w2.v).add(r*8+c);
      const sc=(pathLen(w2,s.pawns[0],GOAL[0])-opD) - (pathLen(w2,s.pawns[1],GOAL[1])-myD)*1.1 + Math.random()*[3,1,.4][lvl];
      if(sc>bs){ bs=sc; best=w; }
    }
    if(best && bs>=1) return {k:'wall',...best};
  }
  let bm=null, bd=1e9;
  for(const m of pawnMoves(s,1)){
    if(m.r===GOAL[1]) return {k:'move',r:m.r,c:m.c};
    const d=pathLen(ws,m,GOAL[1])+Math.random()*[2.2,.8,.5][lvl];
    if(d<bd){ bd=d; bm=m; }
  }
  return {k:'move',r:bm.r,c:bm.c};
}

/* ───────── 화면 ───────── */
const CS=52, G=12, P=CS+G;
const COL=['var(--p0)','var(--p1)'];
let hover=null, pending=null, V=null, C=null, svg=null;
const px=v=>G+v*P;
const vC=r=>C.flip?8-r:r, vW=r=>C.flip?7-r:r;
const myTurn=()=>C&&C.can&&V.turn===C.me;
function wallRect(w){
  const r=vW(w.r), c=vW(w.c);
  return w.o==='h' ? {x:px(c),y:px(r)+CS,w:2*CS+G,h:G} : {x:px(c)+CS,y:px(r),w:G,h:2*CS+G};
}
function draw(){
  const s=V, out=[`<rect width="588" height="588" rx="14" fill="var(--board)"/>`];
  const legal = myTurn() ? pawnMoves(s,C.me) : [];
  for(let r=0;r<N;r++) for(let c=0;c<N;c++){
    const f = r===GOAL[0] ? 'var(--cell-goal0)' : r===GOAL[1] ? 'var(--cell-goal1)' : 'var(--cell)';
    out.push(`<rect x="${px(vC(c))}" y="${px(vC(r))}" width="${CS}" height="${CS}" rx="7" fill="${f}"/>`);
  }
  for(const m of legal){
    const h=hover&&hover.k==='move'&&hover.r===m.r&&hover.c===m.c;
    out.push(`<rect x="${px(vC(m.c))+4}" y="${px(vC(m.r))+4}" width="${CS-8}" height="${CS-8}" rx="6" fill="var(--hint)" opacity="${h?1:.7}"/>`);
  }
  if(s.last&&s.last.k==='move'){
    const f=s.last.from;
    out.push(`<circle cx="${px(vC(f.c))+CS/2}" cy="${px(vC(f.r))+CS/2}" r="6" fill="${COL[s.last.p]}" opacity=".35"/>`);
  }
  for(const w of s.walls){
    const R=wallRect(w), last=s.last&&s.last.k==='wall'&&s.last.o===w.o&&s.last.r===w.r&&s.last.c===w.c;
    out.push(`<rect x="${R.x}" y="${R.y}" width="${R.w}" height="${R.h}" rx="3" fill="var(--wall)" ${last?`stroke="${COL[s.last.p]}" stroke-width="3"`:''}/>`);
  }
  const ghost=pending||hover;
  if(ghost&&ghost.k==='wall'&&myTurn()){
    const err=wallCheck(s,C.me,ghost), R=wallRect(ghost);
    out.push(`<rect x="${R.x}" y="${R.y}" width="${R.w}" height="${R.h}" rx="3" fill="${err?'var(--bad)':'var(--ghost)'}" ${pending?'stroke="#fff" stroke-width="2" stroke-dasharray="5 4"':''}/>`);
  }
  s.pawns.forEach((p,i)=>{
    const x=px(vC(p.c))+CS/2, y=px(vC(p.r))+CS/2;
    out.push(`<circle cx="${x}" cy="${y+2}" r="18" fill="rgba(0,0,0,.18)"/><circle cx="${x}" cy="${y}" r="18" fill="${COL[i]}"/><circle cx="${x}" cy="${y}" r="9" fill="none" stroke="rgba(255,255,255,.65)" stroke-width="3"/>`);
    if(s.winner===i) out.push(`<circle cx="${x}" cy="${y}" r="23" fill="none" stroke="${COL[i]}" stroke-width="3"><animate attributeName="r" values="20;26;20" dur="1.2s" repeatCount="indefinite"/></circle>`);
  });
  svg.innerHTML=out.join('');
}
function svgPt(e){ const pt=svg.createSVGPoint(); pt.x=e.clientX; pt.y=e.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); }
function targetAt(e){
  if(!myTurn()) return null;
  const {x,y}=svgPt(e), u=x-G, v=y-G;
  const vc=Math.floor(u/P), vr=Math.floor(v/P), ou=u-vc*P, ov=v-vr*P;
  if(vc>=0&&vc<N&&vr>=0&&vr<N&&ou<CS&&ov<CS){
    const r=C.flip?8-vr:vr, c=C.flip?8-vc:vc;
    if(pawnMoves(V,C.me).some(m=>m.r===r&&m.c===c)) return {k:'move',r,c};
  }
  const cl=n=>Math.max(0,Math.min(7,n));
  const kV=cl(Math.round((u+G/2)/P)-1), kH=cl(Math.round((v+G/2)/P)-1);
  const dV=Math.abs(u-((kV+1)*P-G/2)), dH=Math.abs(v-((kH+1)*P-G/2));
  if(Math.min(dV,dH)>CS*0.36) return null;
  return {k:'wall', o:dH<dV?'h':'v', r:C.flip?7-kH:kH, c:C.flip?7-kV:kV};
}
const same=(a,b)=>a&&b&&a.k===b.k&&a.o===b.o&&a.r===b.r&&a.c===b.c;
function bind(){
  svg.addEventListener('pointermove',e=>{
    if(e.pointerType!=='mouse') return;
    const t=targetAt(e); if(!same(t,hover)){ hover=t; draw(); }
  });
  svg.addEventListener('pointerleave',()=>{ if(hover){ hover=null; draw(); } });
  svg.addEventListener('pointerdown',e=>{
    const t=targetAt(e);
    if(!t){ if(pending){ pending=null; C.rerender(); } return; }
    if(t.k==='move'){ pending=null; hover=null; C.act(t); return; }
    const err=wallCheck(V,C.me,t);
    if(e.pointerType==='mouse'||same(t,pending)){
      if(err){ C.tip(err); return; }
      pending=null; hover=null; C.act(t);
    } else { pending=t; C.rerender(); if(err) C.tip(err); }
  });
}
function render(el,v,ctx){
  V=v; C=ctx;
  svg=el.querySelector('svg.wallboard');
  if(!svg){ el.innerHTML='<svg class="wallboard" viewBox="0 0 588 588"></svg>'; svg=el.firstChild; bind(); hover=pending=null; }
  if(!myTurn()) pending=null;
  draw();
}
window.addEventListener('keydown',e=>{ if(e.key==='Escape'&&pending){ pending=null; if(C) C.rerender(); } });

/* 가이드 그림: 작은 판 */
function mini(spec){
  // spec: {n, pawns:[[r,c,color]], hints:[[r,c]], walls:[[o,r,c]]}
  const n=spec.n, cs=30, g=7, p=cs+g, W=g+n*p, o=[`<svg width="${W}" height="${W}" viewBox="0 0 ${W} ${W}"><rect width="${W}" height="${W}" rx="8" fill="#38475a"/>`];
  for(let r=0;r<n;r++) for(let c=0;c<n;c++) o.push(`<rect x="${g+c*p}" y="${g+r*p}" width="${cs}" height="${cs}" rx="4" fill="#ece6d9"/>`);
  for(const [r,c] of spec.hints||[]) o.push(`<rect x="${g+c*p+3}" y="${g+r*p+3}" width="${cs-6}" height="${cs-6}" rx="3" fill="#9fd3a8"/>`);
  for(const [ori,r,c] of spec.walls||[]) o.push(ori==='h' ? `<rect x="${g+c*p}" y="${g+r*p+cs}" width="${2*cs+g}" height="${g}" rx="2" fill="#f0a83a"/>` : `<rect x="${g+c*p+cs}" y="${g+r*p}" width="${g}" height="${2*cs+g}" rx="2" fill="#f0a83a"/>`);
  for(const [r,c,col] of spec.pawns||[]) o.push(`<circle cx="${g+c*p+cs/2}" cy="${g+r*p+cs/2}" r="10" fill="${col}"/>`);
  return o.join('')+'</svg>';
}
const R0='#e2574c', R1='#2a8c9b';
const guide=`
<p><b>목표</b>: 내 말을 맞은편 끝줄(내 색으로 물든 줄)에 먼저 닿게 하기.</p>
<h3>내 차례에 하는 일 (둘 중 하나)</h3>
<ul><li><b>말 이동</b> — 상하좌우 한 칸. 초록 칸이 갈 수 있는 곳이에요.</li>
<li><b>벽 놓기</b> — 칸 사이 홈을 가리키면 벽 미리보기가 떠요. 누르면 놓아요. 각자 10개.</li></ul>
<h3>뛰어넘기</h3>
<p>상대 말이 바로 앞에 있으면 넘어서 뛰어요.</p>
${mini({n:4,pawns:[[2,1,R0],[1,1,R1]],hints:[[0,1],[3,1],[2,0],[2,2]]})}
<p>상대 뒤가 벽이나 판 끝이면, 대신 상대 옆 대각선으로 가요.</p>
${mini({n:4,pawns:[[2,1,R0],[1,1,R1]],walls:[['h',0,0]],hints:[[1,0],[1,2],[3,1],[2,0],[2,2]]})}
<h3>벽 규칙</h3>
<ul><li>벽은 두 칸 길이. 이미 있는 벽과 겹치거나 열십자로 엇갈릴 수 없어요.</li>
<li>누구든 끝줄로 가는 길을 <b>완전히</b> 막으면 안 돼요. 돌아가는 길은 꼭 남아야 해요.</li>
<li>놓을 수 없는 자리는 미리보기가 빨갛게 바뀌어요.</li></ul>
<h3>조작</h3>
<ul><li>PC: 홈 위에 마우스를 올리면 미리보기, 클릭하면 놓기. 가로·세로는 가리킨 홈 방향으로 정해져요.</li>
<li>폰: 홈을 한 번 탭하면 미리보기(점선), 같은 자리를 한 번 더 탭하면 놓기.</li>
<li>이름표 옆 <b>거리</b>는 끝줄까지 가장 짧은 길이에요. 벽을 놓기 전에 이 숫자를 비교해 보세요.</li></ul>
<div class="tipbox">💡 <b>팁</b><br>
· 초반에 벽을 다 쓰면 후반에 막을 수단이 없어요. 상대가 앞서갈 때 쓰세요.<br>
· 벽 하나로 상대 거리가 2 이상 늘어나는 자리가 좋은 자리예요.<br>
· 벽 두 개로 긴 복도를 만들면 상대를 크게 돌아가게 할 수 있어요. 다만 내 길도 같이 막히지 않는지 확인!</div>`;

window.GAMES.wall = {
  title:'길막', ref:'쿼리도', emoji:'🧱', tags:['전략','추상','보드'], pulse:v=>dist(v,0)-dist(v,1), pulseStep:2, tagline:'말을 먼저 맞은편으로. 벽 10개로 상대 길을 돌려 막는 길찾기 대결.',
  guide, init, apply, ai, local:true,
  reset(){ hover=pending=null; svg=null; },
  render,
  status:(v,ctx)=>ctx.turnText(v)+(pending?' · 같은 자리를 한 번 더 누르면 놓아요':''),
  bar(v,i){
    let w=''; for(let k=0;k<WALLS;k++) w+=`<b class="${k<v.left[i]?'':'used'}"></b>`;
    return `<span class="tag">거리 <b style="color:var(--ink)">${dist(v,i)}</b></span><span class="walls" title="남은 벽 ${v.left[i]}">${w}</span>`;
  },
};
})();
