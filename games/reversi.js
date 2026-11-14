(function(){
'use strict';
/* 리버시: 8×8. 상대 돌을 내 돌 둘 사이에 끼우면 뒤집힘. 둘 곳이 없으면 넘김. 둘 다 못 두면 끝, 돌 많은 쪽 승. */
const N=8, D=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const idx=(r,c)=>r*N+c, inb=(r,c)=>r>=0&&r<N&&c>=0&&c<N;
function init(starter){
  const b=Array(N*N).fill(-1), w=1-starter;
  b[idx(3,3)]=w; b[idx(4,4)]=w; b[idx(3,4)]=starter; b[idx(4,3)]=starter;   // 흑(먼저 두는 쪽)이 대각선 반대편
  return {b, black:starter, turn:starter, starter, winner:null, last:null, flipped:[], passed:null, count:[2,2]};
}
function flipsFor(b,p,r,c){
  if(b[idx(r,c)]!==-1) return [];
  const out=[];
  for(const [dr,dc] of D){
    const line=[]; let rr=r+dr, cc=c+dc;
    while(inb(rr,cc) && b[idx(rr,cc)]===1-p){ line.push(idx(rr,cc)); rr+=dr; cc+=dc; }
    if(line.length && inb(rr,cc) && b[idx(rr,cc)]===p) out.push(...line);
  }
  return out;
}
function legal(b,p){ const m=[]; for(let r=0;r<N;r++) for(let c=0;c<N;c++){ const f=flipsFor(b,p,r,c); if(f.length) m.push({r,c,n:f.length}); } return m; }
const counts=b=>[b.filter(x=>x===0).length, b.filter(x=>x===1).length];
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(s.turn!==p) return '상대 차례예요';
  if(!a||a.k!=='put') return '알 수 없는 동작';
  const r=a.r|0, c=a.c|0; if(!inb(r,c)) return '판 밖이에요';
  const f=flipsFor(s.b,p,r,c); if(!f.length) return '상대 돌을 하나 이상 뒤집을 수 있는 곳에만 둘 수 있어요';
  s.b[idx(r,c)]=p; for(const i of f) s.b[i]=p;
  s.last=[r,c]; s.flipped=f; s.passed=null; s.count=counts(s.b);
  const o=1-p;
  if(legal(s.b,o).length){ s.turn=o; return null; }
  if(legal(s.b,p).length){ s.turn=p; s.passed=o; return null; }   // 상대는 둘 곳이 없어 넘김
  const [x,y]=s.count; s.winner = x>y?0 : y>x?1 : 'draw'; s.turn=null; return null;
}

/* 컴퓨터: 자리 가치(모서리 최고, 모서리 옆 위험) + 다음 수 이동성, 2수 앞까지 */
const W=[100,-20,10,5,5,10,-20,100, -20,-50,-2,-2,-2,-2,-50,-20, 10,-2,1,1,1,1,-2,10, 5,-2,1,0,0,1,-2,5,
         5,-2,1,0,0,1,-2,5, 10,-2,1,1,1,1,-2,10, -20,-50,-2,-2,-2,-2,-50,-20, 100,-20,10,5,5,10,-20,100];
function evalB(b,p){
  let v=0, empty=0;
  for(let i=0;i<N*N;i++){ if(b[i]===p) v+=W[i]; else if(b[i]===1-p) v-=W[i]; else empty++; }
  v += (legal(b,p).length-legal(b,1-p).length)*4;
  if(empty<12){ const [x,y]=counts(b); v += (p===0?x-y:y-x)*6; }
  return v;
}
function ai(v,lvl=1){
  const p=1, ms=legal(v.b,p); if(!ms.length) return null;
  let best=null, bs=-Infinity;
  for(const m of ms){
    const b=v.b.slice(); b[idx(m.r,m.c)]=p; for(const i of flipsFor(v.b,p,m.r,m.c)) b[i]=p;
    const om=legal(b,1-p); let worst=Infinity;
    if(!om.length) worst=evalB(b,p)+15;
    for(const o of om){ const b2=b.slice(); b2[idx(o.r,o.c)]=1-p; for(const i of flipsFor(b,1-p,o.r,o.c)) b2[i]=1-p; worst=Math.min(worst, evalB(b2,p)); }
    const sc=worst+Math.random()*[60,12,3][lvl];
    if(sc>bs){ bs=sc; best=m; }
  }
  return {k:'put', r:best.r, c:best.c};
}

/* 화면 */
const CS=56, G=4, PAD=10, SZ=PAD*2+N*CS+(N-1)*G;
let V=null, C=null, svg=null, hover=null;
const px=i=>PAD+i*(CS+G);
const myTurn=()=>C&&C.can&&V.turn===C.me;
const isBlack=p=>p===V.black;
function draw(){
  const o=[`<rect width="${SZ}" height="${SZ}" rx="12" fill="#1f6b48"/>`];
  const moves=myTurn()?legal(V.b,C.me):[];
  const flipSet=new Set(V.flipped||[]);
  for(let r=0;r<N;r++) for(let c=0;c<N;c++){
    o.push(`<rect x="${px(c)}" y="${px(r)}" width="${CS}" height="${CS}" rx="5" fill="#2e8a5f"/>`);
    const p=V.b[idx(r,c)];
    if(p!==-1){
      const cx=px(c)+CS/2, cy=px(r)+CS/2, blk=isBlack(p);
      o.push(`<circle cx="${cx}" cy="${cy+2}" r="${CS*.4}" fill="rgba(0,0,0,.3)"/><circle class="${flipSet.has(idx(r,c))?'rv-flip':''}" cx="${cx}" cy="${cy}" r="${CS*.4}" fill="${blk?'#1d1d1f':'#fafaf7'}" stroke="${blk?'#000':'#ccc'}"/>`);
      if(V.last&&V.last[0]===r&&V.last[1]===c) o.push(`<circle cx="${cx}" cy="${cy}" r="5" fill="var(--p0)"/>`);
    }
  }
  for(const m of moves){
    const cx=px(m.c)+CS/2, cy=px(m.r)+CS/2, h=hover&&hover[0]===m.r&&hover[1]===m.c;
    o.push(h ? `<circle cx="${cx}" cy="${cy}" r="${CS*.4}" fill="${isBlack(C.me)?'rgba(0,0,0,.45)':'rgba(255,255,255,.7)'}"/><text x="${cx}" y="${cy+5}" text-anchor="middle" font-size="15" font-weight="800" fill="${isBlack(C.me)?'#fff':'#222'}">+${m.n}</text>`
             : `<circle cx="${cx}" cy="${cy}" r="7" fill="rgba(255,255,255,.35)"/>`);
  }
  svg.innerHTML=o.join('');
}
function cellAt(e){
  const pt=svg.createSVGPoint(); pt.x=e.clientX; pt.y=e.clientY; const p=pt.matrixTransform(svg.getScreenCTM().inverse());
  const c=Math.floor((p.x-PAD)/(CS+G)), r=Math.floor((p.y-PAD)/(CS+G));
  return inb(r,c) ? [r,c] : null;
}
function bind(){
  svg.addEventListener('pointermove',e=>{ if(e.pointerType!=='mouse') return; const t=cellAt(e); if(String(t)!==String(hover)){ hover=t; draw(); } });
  svg.addEventListener('pointerleave',()=>{ hover=null; draw(); });
  svg.addEventListener('pointerdown',e=>{
    if(!myTurn()) return; const t=cellAt(e); if(!t) return;
    if(!flipsFor(V.b,C.me,t[0],t[1]).length){ C.tip('상대 돌을 뒤집을 수 있는 곳(점 표시)에만 둘 수 있어요'); return; }
    hover=null; C.act({k:'put',r:t[0],c:t[1]});
  });
}
function render(el,v,ctx){
  V=v; C=ctx;
  svg=el.querySelector('svg.rvboard');
  if(!svg){ el.innerHTML=`<svg class="rvboard" viewBox="0 0 ${SZ} ${SZ}"></svg>`; svg=el.firstChild; bind(); hover=null; }
  draw();
}
const guide=`
<p>상대 돌을 <b>내 돌 두 개 사이에 끼우면 전부 내 색으로 뒤집혀요.</b> 판이 끝났을 때 내 색 돌이 더 많으면 승리!</p>
<ul><li>8×8 판, 가운데 4개로 시작. <b>흑(검은 돌)이 먼저</b> 둬요.</li>
<li>가로·세로·대각선 어느 방향이든, 한 번에 여러 방향을 같이 뒤집을 수 있어요.</li>
<li><b>최소 한 개는 뒤집을 수 있는 곳에만</b> 둘 수 있어요. 둘 수 있는 곳에 흰 점이 찍혀요.</li>
<li>둘 곳이 없으면 자동으로 차례를 넘겨요. 둘 다 둘 곳이 없으면 끝.</li></ul>
<h3>조작</h3>
<ul><li>점 찍힌 칸을 누르면 둬요. PC에선 마우스를 올리면 몇 개를 뒤집는지(+3 같은 숫자) 보여요.</li></ul>
<div class="tipbox">💡 <b>팁</b><br>
· <b>모서리</b>는 절대 다시 뒤집히지 않아요. 최고의 자리!<br>
· 모서리 바로 옆(특히 대각선 옆 칸)에 먼저 두면 상대에게 모서리를 내줘요.<br>
· 초반엔 많이 뒤집는 것보다 <b>상대가 둘 곳을 줄이는 것</b>이 더 중요해요.</div>`;
window.GAMES.reversi = {
  title:'리버시', emoji:'🔄', tags:['전략','추상','클래식'], pulse:v=>v.count[1]-v.count[0], pulseStep:6, tagline:'상대 돌을 사이에 끼워 뒤집기! 끝났을 때 내 색이 더 많으면 승리.',
  guide, init, apply, ai, local:true, render,
  reset(){ hover=null; svg=null; },
  status:(v,ctx)=>{ const pass = v.passed!=null && v.winner==null ? ` · ${v.passed===ctx.me&&ctx.mode!=='local'?'내가':ctx.name(v.passed)+'이(가)'} 둘 곳이 없어 넘겼어요` : ''; return ctx.turnText(v)+pass; },
  bar:(v,i)=>`<span class="tag">${v.black===i?'⚫ 흑':'⚪ 백'}</span><span class="score">${v.count[i]}</span>`,
  result:(v,ctx)=>`${v.count[ctx.me]} : ${v.count[1-ctx.me]}`,
};
})();
