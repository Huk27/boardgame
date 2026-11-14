(function(){
'use strict';
/* 헥스: 9×9 마름모 육각판. 0번은 위↔아래, 1번은 왼쪽↔오른쪽 변을 자기 돌로 이으면 승리 (무승부 없음).
   자리 바꾸기: 첫 수가 놓인 직후 두 번째 사람은 그 돌을 자기 것으로 가져갈 수 있음(선공 유리함 상쇄). */
const N=9, NB=[[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0]];
const inb=(r,c)=>r>=0&&r<N&&c>=0&&c<N;
function init(starter){ return {b:Array(N*N).fill(-1), turn:starter, starter, first:starter, winner:null, last:null, moves:0, swapped:false, path:null}; }
function connected(b,p){
  const q=[], seen=new Int16Array(N*N).fill(-1);
  for(let k=0;k<N;k++){ const i = p===0 ? k : k*N; if(b[i]===p){ q.push(i); seen[i]=i; } }
  while(q.length){ const i=q.shift(), r=(i/N)|0, c=i%N;
    if(p===0 ? r===N-1 : c===N-1){ const path=[]; let x=i; while(true){ path.push(x); if(seen[x]===x) break; x=seen[x]; } return path; }
    for(const [dr,dc] of NB){ const rr=r+dr, cc=c+dc; if(!inb(rr,cc)) continue; const j=rr*N+cc; if(b[j]===p && seen[j]<0){ seen[j]=i; q.push(j); } } }
  return null;
}
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(s.turn!==p) return '상대 차례예요';
  if(!a) return '알 수 없는 동작';
  if(a.k==='swap'){
    if(s.moves!==1||p===s.first||s.swapped) return '자리 바꾸기는 두 번째 사람의 첫 차례에만 돼요';
    const i=s.b.findIndex(x=>x===s.first), r=(i/N)|0, c=i%N;
    s.b[i]=-1; s.b[c*N+r]=p;   // 대각선으로 뒤집어 내 돌로 (변 방향이 다르니까)
    s.swapped=true; s.last=c*N+r; s.moves++; s.turn=1-p; return null;
  }
  if(a.k!=='put') return '알 수 없는 동작';
  const i=a.i|0; if(!(i>=0&&i<N*N)) return '판 밖이에요';
  if(s.b[i]!==-1) return '이미 돌이 있어요';
  s.b[i]=p; s.last=i; s.moves++;
  const path=connected(s.b,p);
  if(path){ s.winner=p; s.path=path; s.turn=null; return null; }
  s.turn=1-p; return null;
}

/* 컴퓨터: 내 변↔변 최단 거리(빈칸 1, 내 돌 0)와 상대 최단 거리를 비교. 다리(두 칸 건너 연결) 모양 가산 */
function dist(b,p){
  const d=new Float64Array(N*N).fill(1e9), dq=[];
  for(let k=0;k<N;k++){ const i = p===0 ? k : k*N; if(b[i]===1-p) continue; d[i]= b[i]===p?0:1; dq.push(i); }
  // 간단한 다익스트라(가중치 0/1)
  dq.sort((x,y)=>d[x]-d[y]);
  const done=new Uint8Array(N*N);
  while(dq.length){
    let bi=0; for(let k=1;k<dq.length;k++) if(d[dq[k]]<d[dq[bi]]) bi=k;
    const i=dq.splice(bi,1)[0]; if(done[i]) continue; done[i]=1;
    const r=(i/N)|0, c=i%N; if(p===0 ? r===N-1 : c===N-1) return d[i];
    for(const [dr,dc] of NB){ const rr=r+dr, cc=c+dc; if(!inb(rr,cc)) continue; const j=rr*N+cc; if(b[j]===1-p) continue; const nd=d[i]+(b[j]===p?0:1); if(nd<d[j]){ d[j]=nd; dq.push(j); } }
  }
  return 1e9;
}
function ai(v,lvl=1){
  const me=1, op=0;
  if(v.moves===1 && v.first===op && !v.swapped){
    const i=v.b.findIndex(x=>x===op), r=(i/N)|0, c=i%N;
    if(Math.abs(r-4)+Math.abs(c-4)<=3) return {k:'swap'};   // 가운데 근처 첫 수면 가져오기
  }
  if(v.moves===0) return {k:'put', i:Math.random()<.5 ? 2*N+6 : 6*N+2};
  const empties=[]; for(let i=0;i<N*N;i++) if(v.b[i]===-1) empties.push(i);
  let best=null, bs=-Infinity;
  const base=dist(v.b,op);
  for(const i of empties){
    const r=(i/N)|0, c=i%N; let near=false;
    for(const [dr,dc] of NB){ const rr=r+dr, cc=c+dc; if(inb(rr,cc)&&v.b[rr*N+cc]!==-1){ near=true; break; } }
    if(!near && Math.random()<.7) continue;
    v.b[i]=me; const my=dist(v.b,me), his=dist(v.b,op); v.b[i]=-1;
    if(my===0) return {k:'put',i};
    const sc = (his-my)*10 - my*2 + (his>base?3:0) + Math.random()*[30,8,2][lvl];
    if(sc>bs){ bs=sc; best=i; }
  }
  return {k:'put', i: best!=null?best:empties[0]};
}

/* 화면: 마름모 육각판, 0번 변(위·아래) 주황, 1번 변(왼쪽·오른쪽) 청록 */
const R=17, HW=R*Math.sqrt(3), PAD=34;
const cx=(r,c)=>PAD+HW/2+c*HW+r*HW/2, cy=(r,c)=>PAD+R+r*R*1.5;
const W=cx(N-1,N-1)+HW/2+PAD, H=cy(N-1,0)+R+PAD;
let V=null, C=null, svg=null, hover=null;
const hexPts=(x,y,s)=>[0,1,2,3,4,5].map(k=>{ const a=Math.PI/180*(60*k-30); return `${x+s*Math.cos(a)},${y+s*Math.sin(a)}`; }).join(' ');
function draw(){
  const o=[], pathSet=new Set(V.path||[]);
  // 변 표시 띠
  const tl=[cx(0,0)-HW/2,cy(0,0)-R], tr=[cx(0,N-1)+HW/2,cy(0,N-1)-R], bl=[cx(N-1,0)-HW/2,cy(N-1,0)+R], br=[cx(N-1,N-1)+HW/2,cy(N-1,N-1)+R];
  o.push(`<line x1="${tl[0]}" y1="${tl[1]-6}" x2="${tr[0]}" y2="${tr[1]-6}" stroke="var(--p0)" stroke-width="8" stroke-linecap="round"/>`);
  o.push(`<line x1="${bl[0]}" y1="${bl[1]+6}" x2="${br[0]}" y2="${br[1]+6}" stroke="var(--p0)" stroke-width="8" stroke-linecap="round"/>`);
  o.push(`<line x1="${tl[0]-6}" y1="${tl[1]}" x2="${bl[0]-6}" y2="${bl[1]}" stroke="var(--p1)" stroke-width="8" stroke-linecap="round"/>`);
  o.push(`<line x1="${tr[0]+6}" y1="${tr[1]}" x2="${br[0]+6}" y2="${br[1]}" stroke="var(--p1)" stroke-width="8" stroke-linecap="round"/>`);
  const can=C&&C.myTurn;
  for(let r=0;r<N;r++) for(let c=0;c<N;c++){ const i=r*N+c, x=cx(r,c), y=cy(r,c), p=V.b[i];
    const fill = p===0?'var(--p0)':p===1?'var(--p1)': (hover===i&&can ? (C.me===0?'rgba(226,87,76,.4)':'rgba(42,140,155,.4)') : 'var(--cell)');
    o.push(`<polygon points="${hexPts(x,y,R-1)}" fill="${fill}" stroke="#bfb6a5" stroke-width="1.5"/>`);
    if(pathSet.has(i)) o.push(`<circle cx="${x}" cy="${y}" r="5" fill="#fff"/>`);
    else if(V.last===i) o.push(`<circle cx="${x}" cy="${y}" r="4" fill="rgba(255,255,255,.85)"/>`);
  }
  svg.innerHTML=o.join('');
}
function cellAt(e){
  const pt=svg.createSVGPoint(); pt.x=e.clientX; pt.y=e.clientY; const p=pt.matrixTransform(svg.getScreenCTM().inverse());
  let best=null, bd=1e9; for(let r=0;r<N;r++) for(let c=0;c<N;c++){ const d=(cx(r,c)-p.x)**2+(cy(r,c)-p.y)**2; if(d<bd){ bd=d; best=r*N+c; } }
  return bd<R*R ? best : null;
}
function bind(){
  svg.addEventListener('pointermove',e=>{ if(e.pointerType!=='mouse') return; const t=cellAt(e); if(t!==hover){ hover=t; draw(); } });
  svg.addEventListener('pointerleave',()=>{ hover=null; draw(); });
  svg.addEventListener('pointerdown',e=>{ if(!C.myTurn) return; const t=cellAt(e); if(t==null) return; if(V.b[t]!==-1){ C.tip('이미 돌이 있어요'); return; } hover=null; C.act({k:'put',i:t}); });
}
function render(el,v,ctx){
  V=v; C=ctx;
  svg=el.querySelector('svg.hexb');
  if(!svg){ el.innerHTML=`<svg class="hexb" viewBox="0 0 ${W} ${H}"></svg><div class="hx-act"></div>`; svg=el.firstChild; bind(); hover=null; }
  draw();
  const act=el.querySelector('.hx-act');
  const canSwap = ctx.myTurn && v.moves===1 && !v.swapped && v.first!==ctx.me;
  act.innerHTML = canSwap ? `<div class="fh-act"><button data-a="swap">🔄 상대 첫 돌을 내 것으로 (자리 바꾸기)</button></div>` : '';
  act.onclick=e=>{ if(e.target.closest('[data-a="swap"]')) ctx.act({k:'swap'}); };
}
const SIDE=['위↔아래 (주황 변)','왼쪽↔오른쪽 (청록 변)'];
const guide=`
<p>육각 칸으로 된 마름모 판에 번갈아 돌을 하나씩 놓아요. <b>내 색의 두 변을 내 돌로 먼저 이으면</b> 승리! 이 게임은 <b>무승부가 없어요</b>.</p>
<ul><li>주황은 <b>위↔아래</b>, 청록은 <b>왼쪽↔오른쪽</b>을 이어야 해요. 판 가장자리 색 띠를 보세요.</li>
<li>돌은 한번 놓으면 안 움직여요. 육각 칸은 이웃이 6개라 막기가 생각보다 어려워요.</li>
<li>🔄 <b>자리 바꾸기</b>: 먼저 두는 쪽이 유리해서, 두 번째 사람은 첫 차례에 상대의 첫 돌을 <b>자기 돌로 가져올</b> 수 있어요. 그래서 첫 수는 너무 좋지도 나쁘지도 않게 두는 게 요령!</li></ul>
<div class="tipbox">💡 <b>팁</b><br>
· 돌을 붙여 두기보다 <b>한 칸 건너 대각선</b>(두 길이 있는 "다리" 모양)으로 두면, 상대가 한 곳을 막아도 다른 곳으로 이어져요.<br>
· 상대를 막을 땐 바로 앞이 아니라 조금 멀리서 막는 게 좋아요.<br>
· 가운데가 가장 강한 자리예요.</div>`;
window.GAMES.hex = {
  title:'헥스', emoji:'⬡', tags:['전략','추상','클래식'],
  pulse:v=>dist(v.b,0)-dist(v.b,1), pulseStep:2,
  tagline:'육각 판에서 내 두 변을 먼저 잇기. 무승부 없는 연결 대결.',
  guide, init, apply, ai, local:true, render,
  reset(){ hover=null; svg=null; },
  status:(v,ctx)=>ctx.turnText(v)+(ctx.myTurn?` · 나는 ${SIDE[ctx.me]}`:''),
  bar:(v,i)=>`<span class="tag">${SIDE[i]} · 남은 거리 <b style="color:var(--ink)">${dist(v.b,i)>=1e9?'∞':dist(v.b,i)}</b></span>`,
};
})();
