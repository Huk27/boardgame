(function(){
'use strict';
/* 오목: 15×15 판, 흑이 먼저. 가로·세로·대각선으로 5개(이상)를 먼저 이으면 승리. */
const N=15, DIRS=[[0,1],[1,0],[1,1],[1,-1]];
const at=(b,r,c)=> r<0||r>=N||c<0||c>=N ? -2 : b[r*N+c];
function init(starter){ return {b:Array(N*N).fill(-1), black:starter, turn:starter, starter, winner:null, last:null, line:null, moves:0}; }
function fiveFrom(b,r,c){
  const p=b[r*N+c];
  for(const [dr,dc] of DIRS){
    let cells=[[r,c]];
    for(const sg of [1,-1]){ let k=1; while(at(b,r+dr*k*sg,c+dc*k*sg)===p){ cells.push([r+dr*k*sg,c+dc*k*sg]); k++; } }
    if(cells.length>=5) return cells;
  }
  return null;
}
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(s.turn!==p) return '상대 차례예요';
  if(!a||a.k!=='put') return '알 수 없는 동작';
  const r=a.r|0, c=a.c|0;
  if(r<0||r>=N||c<0||c>=N) return '판 밖이에요';
  if(s.b[r*N+c]!==-1) return '이미 돌이 있어요';
  s.b[r*N+c]=p; s.last=[r,c]; s.moves++;
  const line=fiveFrom(s.b,r,c);
  if(line){ s.winner=p; s.line=line; s.turn=null; return null; }
  if(s.moves>=N*N){ s.winner='draw'; s.turn=null; return null; }
  s.turn=1-p; return null;
}

/* 컴퓨터: 빈칸마다 공격·수비 모양 점수를 매겨 가장 좋은 곳 */
function lineScore(b,r,c,p){
  let total=0;
  for(const [dr,dc] of DIRS){
    let cnt=1, open=0;
    for(const sg of [1,-1]){
      let k=1; while(at(b,r+dr*k*sg,c+dc*k*sg)===p){ cnt++; k++; }
      if(at(b,r+dr*k*sg,c+dc*k*sg)===-1) open++;
    }
    if(cnt>=5) total+=1e6;
    else if(cnt===4) total+= open===2?1e5 : open===1?1.2e4 : 0;
    else if(cnt===3) total+= open===2?8e3 : open===1?500 : 0;
    else if(cnt===2) total+= open===2?300 : open===1?40 : 0;
    else total+= open*4;
  }
  return total;
}
function ai(v,lvl=1){
  const me=1, op=0, b=v.b;
  if(v.moves===0) return {k:'put',r:7,c:7};
  let best=null, bs=-Infinity;
  for(let r=0;r<N;r++) for(let c=0;c<N;c++){
    if(b[r*N+c]!==-1) continue;
    let near=false;
    for(let dr=-2;dr<=2&&!near;dr++) for(let dc=-2;dc<=2;dc++){ const x=at(b,r+dr,c+dc); if(x===0||x===1){ near=true; break; } }
    if(!near) continue;
    const sc=lineScore(b,r,c,me)*1.1 + lineScore(b,r,c,op)*[.3,.85,1][lvl] + Math.random()*[1500,300,20][lvl] - (Math.abs(r-7)+Math.abs(c-7));
    if(sc>bs){ bs=sc; best=[r,c]; }
  }
  return {k:'put',r:best[0],c:best[1]};
}

/* 화면: 바둑판 느낌, 교차점에 돌 */
const G=34, PAD=26, W=PAD*2+G*(N-1);
let V=null, C=null, svg=null, hover=null, pending=null;
const xy=i=>PAD+i*G;
const myTurn=()=>C&&C.can&&V.turn===C.me;
const stoneColor=p=> p===V.black ? 'black' : 'white';
function draw(){
  const o=[`<rect width="${W}" height="${W}" rx="12" fill="#e2b876"/>`];
  for(let i=0;i<N;i++){ o.push(`<line x1="${xy(0)}" y1="${xy(i)}" x2="${xy(N-1)}" y2="${xy(i)}" stroke="#7a5a2e" stroke-width="1"/><line x1="${xy(i)}" y1="${xy(0)}" x2="${xy(i)}" y2="${xy(N-1)}" stroke="#7a5a2e" stroke-width="1"/>`); }
  for(const [r,c] of [[3,3],[3,11],[7,7],[11,3],[11,11]]) o.push(`<circle cx="${xy(c)}" cy="${xy(r)}" r="3.5" fill="#7a5a2e"/>`);
  const winSet=new Set((V.line||[]).map(([r,c])=>r*N+c));
  for(let r=0;r<N;r++) for(let c=0;c<N;c++){
    const p=V.b[r*N+c]; if(p===-1) continue;
    const col=stoneColor(p);
    o.push(`<circle cx="${xy(c)+1.5}" cy="${xy(r)+2}" r="${G*.44}" fill="rgba(0,0,0,.25)"/><circle cx="${xy(c)}" cy="${xy(r)}" r="${G*.44}" fill="${col==='black'?'#1d1d1f':'#fafaf7'}" stroke="${col==='black'?'#000':'#bbb'}" stroke-width="1"/>`);
    if(winSet.has(r*N+c)) o.push(`<circle cx="${xy(c)}" cy="${xy(r)}" r="${G*.2}" fill="var(--p0)"/>`);
    else if(V.last && V.last[0]===r && V.last[1]===c) o.push(`<circle cx="${xy(c)}" cy="${xy(r)}" r="${G*.13}" fill="${col==='black'?'#fff':'#222'}"/>`);
  }
  const g=pending||hover;
  if(g && myTurn() && V.b[g[0]*N+g[1]]===-1){
    o.push(`<circle cx="${xy(g[1])}" cy="${xy(g[0])}" r="${G*.44}" fill="${stoneColor(C.me)==='black'?'rgba(0,0,0,.45)':'rgba(255,255,255,.75)'}" ${pending?'stroke="var(--p0)" stroke-width="2.5" stroke-dasharray="4 3"':''}/>`);
  }
  svg.innerHTML=o.join('');
}
function cellAt(e){
  const pt=svg.createSVGPoint(); pt.x=e.clientX; pt.y=e.clientY; const p=pt.matrixTransform(svg.getScreenCTM().inverse());
  const c=Math.round((p.x-PAD)/G), r=Math.round((p.y-PAD)/G);
  if(r<0||r>=N||c<0||c>=N) return null;
  if(Math.hypot(p.x-xy(c),p.y-xy(r))>G*.5) return null;
  return [r,c];
}
const same=(a,b)=>a&&b&&a[0]===b[0]&&a[1]===b[1];
function bind(){
  svg.addEventListener('pointermove',e=>{ if(e.pointerType!=='mouse') return; const t=cellAt(e); if(!same(t,hover)){ hover=t; draw(); } });
  svg.addEventListener('pointerleave',()=>{ if(hover){ hover=null; draw(); } });
  svg.addEventListener('pointerdown',e=>{
    if(!myTurn()) return;
    const t=cellAt(e); if(!t || V.b[t[0]*N+t[1]]!==-1){ pending=null; draw(); return; }
    // 폰에서는 잘못 누르기 쉬워서 한 번 더 눌러야 둠
    if(e.pointerType==='mouse' || same(t,pending)){ pending=null; hover=null; C.act({k:'put',r:t[0],c:t[1]}); }
    else { pending=t; draw(); C.rerender(); }
  });
}
function render(el,v,ctx){
  V=v; C=ctx;
  svg=el.querySelector('svg.goboard');
  if(!svg){ el.innerHTML=`<svg class="goboard" viewBox="0 0 ${W} ${W}"></svg>`; svg=el.firstChild; bind(); hover=pending=null; }
  if(!myTurn()) pending=null;
  draw();
}
const guide=`
<p>번갈아 돌을 하나씩 놓아서, <b>가로·세로·대각선으로 5개를 먼저 한 줄로 이으면</b> 이겨요.</p>
<ul><li>판은 15×15. 선이 만나는 점(교차점)에 돌을 놓아요.</li>
<li><b>흑(검은 돌)이 먼저</b> 둬요. 판마다 흑백이 바뀌어요.</li>
<li>6개 이상 이어도 승리로 쳐요 (자유 오목).</li>
<li>마지막에 둔 돌에는 작은 점이 찍혀요.</li></ul>
<h3>조작</h3>
<ul><li>PC: 마우스를 올리면 미리보기, 클릭하면 놓기.</li>
<li>폰: 한 번 누르면 미리보기(점선), 같은 자리를 한 번 더 누르면 놓기.</li></ul>
<div class="tipbox">💡 <b>팁</b><br>
· 양쪽이 막히지 않은 <b>열린 3</b>(○●●●○)은 바로 막아야 해요. 놔두면 열린 4가 돼서 못 막아요.<br>
· 4와 열린 3을 동시에 만드는 <b>4-3</b>이 대표적인 필승 모양이에요.<br>
· 공격만 하다 상대의 열린 3을 놓치는 실수가 제일 흔해요.</div>`;
window.GAMES.gomoku = {
  title:'오목', emoji:'⚪', tags:['전략','추상','클래식'], tagline:'15×15 판에서 다섯 알을 먼저 한 줄로 잇는 클래식 대결.',
  guide, init, apply, ai, local:true, render,
  reset(){ hover=pending=null; svg=null; },
  status:(v,ctx)=>ctx.turnText(v)+(ctx.myTurn?` · 나는 ${v.black===ctx.me?'⚫ 흑':'⚪ 백'}`:'')+(pending?' · 한 번 더 누르면 놓아요':''),
  bar:(v,i)=>`<span class="tag">${v.black===i?'⚫ 흑 (먼저)':'⚪ 백'}</span>`,
};
})();
