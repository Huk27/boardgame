(function(){
'use strict';
/* 점 잇기 상자: 점 사이에 선을 하나씩 그음. 상자의 네 번째 변을 그으면 그 상자를 갖고 한 번 더.
   선을 다 그으면 끝, 상자 많은 쪽 승. */
const R=5, C=5;   // 상자 5×5 (점 6×6)
const hI=(r,c)=>r*C+c;          // 가로선: r 0..R, c 0..C-1
const vI=(r,c)=>r*(C+1)+c;      // 세로선: r 0..R-1, c 0..C
function init(starter){
  return {h:Array((R+1)*C).fill(-1), v:Array(R*(C+1)).fill(-1), box:Array(R*C).fill(-1), score:[0,0], turn:starter, starter, winner:null, last:null, moves:0, streak:0};
}
const sides=(s,r,c)=>(s.h[hI(r,c)]!==-1)+(s.h[hI(r+1,c)]!==-1)+(s.v[vI(r,c)]!==-1)+(s.v[vI(r,c+1)]!==-1);
function boxesOf(o,r,c){ // 이 선과 붙은 상자들
  const out=[];
  if(o==='h'){ if(r>0) out.push([r-1,c]); if(r<R) out.push([r,c]); }
  else { if(c>0) out.push([r,c-1]); if(c<C) out.push([r,c]); }
  return out;
}
const valid=(o,r,c)=> o==='h' ? (r>=0&&r<=R&&c>=0&&c<C) : (o==='v' && r>=0&&r<R&&c>=0&&c<=C);
const lineVal=(s,o,r,c)=> o==='h' ? s.h[hI(r,c)] : s.v[vI(r,c)];
function draw(s,p,o,r,c){ // 선 긋고 완성한 상자 수 반환
  if(o==='h') s.h[hI(r,c)]=p; else s.v[vI(r,c)]=p;
  let got=0;
  for(const [br,bc] of boxesOf(o,r,c)) if(s.box[br*C+bc]===-1 && sides(s,br,bc)===4){ s.box[br*C+bc]=p; got++; }
  return got;
}
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(s.turn!==p) return '상대 차례예요';
  if(!a||a.k!=='line'||!valid(a.o,a.r|0,a.c|0)) return '선을 고르세요';
  const o=a.o, r=a.r|0, c=a.c|0;
  if(lineVal(s,o,r,c)!==-1) return '이미 그은 선이에요';
  const got=draw(s,p,o,r,c);
  s.score[p]+=got; s.moves++; s.last={o,r,c,p,got};
  if(s.moves>=(R+1)*C+R*(C+1)){ const [x,y]=s.score; s.winner=x>y?0:y>x?1:'draw'; s.turn=null; return null; }
  if(got){ s.streak++; } else { s.streak=0; s.turn=1-p; }
  return null;
}

/* 컴퓨터: ① 상자 완성 ② 3번째 변을 안 주는 안전한 선 ③ 어쩔 수 없으면 상대가 가장 적게 먹는 선 */
function allLines(s){ const L=[]; for(let r=0;r<=R;r++) for(let c=0;c<C;c++) if(s.h[hI(r,c)]===-1) L.push(['h',r,c]); for(let r=0;r<R;r++) for(let c=0;c<=C;c++) if(s.v[vI(r,c)]===-1) L.push(['v',r,c]); return L; }
const completes=(s,l)=>boxesOf(l[0],l[1],l[2]).some(([r,c])=>s.box[r*C+c]===-1&&sides(s,r,c)===3);
const givesThird=(s,l)=>boxesOf(l[0],l[1],l[2]).some(([r,c])=>sides(s,r,c)===2);
function chainLoss(s,l){ // 이 선을 그은 뒤 상대가 연달아 먹을 수 있는 상자 수
  const t={h:s.h.slice(), v:s.v.slice(), box:s.box.slice()}; draw(t,1,l[0],l[1],l[2]);
  let n=0;
  for(;;){ const m=allLines(t).find(x=>completes(t,x)); if(!m) break; n+=draw(t,0,m[0],m[1],m[2]); }
  return n;
}
function ai(v,lvl=1){
  const L=allLines(v);
  if(lvl===0 && Math.random()<.45) return mk(U.pick(L));          // 쉬움: 자주 아무 데나
  if(lvl===1 && Math.random()<.12) return mk(U.pick(L));
  const take=L.filter(l=>completes(v,l)); if(take.length) return mk(U.pick(take));
  const safe=L.filter(l=>!givesThird(v,l)); if(safe.length) return mk(U.pick(safe));
  let best=null, bn=Infinity; for(const l of L){ const n=chainLoss(v,l)+Math.random()*.1; if(n<bn){ bn=n; best=l; } }
  return mk(best);
}
const mk=l=>({k:'line',o:l[0],r:l[1],c:l[2]});

/* 화면 */
const G=70, PAD=24, W=PAD*2+G*C, H=PAD*2+G*R;
let V=null, Cx=null, svg=null, hover=null;
const myTurn=()=>Cx&&Cx.can&&V.turn===Cx.me;
const P=['var(--p0)','var(--p1)'];
function drawB(){
  const o=[`<rect width="${W}" height="${H}" rx="14" fill="var(--card)" stroke="var(--line)"/>`];
  for(let r=0;r<R;r++) for(let c=0;c<C;c++){ const w=V.box[r*C+c]; if(w!==-1){ o.push(`<rect x="${PAD+c*G+3}" y="${PAD+r*G+3}" width="${G-6}" height="${G-6}" rx="6" fill="${P[w]}" opacity=".22"/><text x="${PAD+c*G+G/2}" y="${PAD+r*G+G/2+8}" text-anchor="middle" font-size="22" font-weight="800" fill="${P[w]}">${w===Cx.me&&Cx.mode!=='local'?'나':Cx.name(w).slice(0,2)}</text>`); } }
  const ln=(o_,r,c)=> o_==='h' ? [PAD+c*G, PAD+r*G, PAD+(c+1)*G, PAD+r*G] : [PAD+c*G, PAD+r*G, PAD+c*G, PAD+(r+1)*G];
  const L=V.last;
  for(let r=0;r<=R;r++) for(let c=0;c<C;c++){ const w=V.h[hI(r,c)]; if(w!==-1){ const [a,b,x,y]=ln('h',r,c); o.push(`<line x1="${a}" y1="${b}" x2="${x}" y2="${y}" stroke="${P[w]}" stroke-width="${L&&L.o==='h'&&L.r===r&&L.c===c?9:6}" stroke-linecap="round"/>`); } }
  for(let r=0;r<R;r++) for(let c=0;c<=C;c++){ const w=V.v[vI(r,c)]; if(w!==-1){ const [a,b,x,y]=ln('v',r,c); o.push(`<line x1="${a}" y1="${b}" x2="${x}" y2="${y}" stroke="${P[w]}" stroke-width="${L&&L.o==='v'&&L.r===r&&L.c===c?9:6}" stroke-linecap="round"/>`); } }
  if(hover && myTurn() && lineVal(V,hover.o,hover.r,hover.c)===-1){
    const [a,b,x,y]=ln(hover.o,hover.r,hover.c);
    const danger=givesThird(V,[hover.o,hover.r,hover.c]) && !completes(V,[hover.o,hover.r,hover.c]);
    o.push(`<line x1="${a}" y1="${b}" x2="${x}" y2="${y}" stroke="${danger?'var(--p0)':P[Cx.me]}" stroke-width="6" stroke-linecap="round" opacity=".45" stroke-dasharray="${danger?'6 5':''}"/>`);
  }
  for(let r=0;r<=R;r++) for(let c=0;c<=C;c++) o.push(`<circle cx="${PAD+c*G}" cy="${PAD+r*G}" r="6" fill="#3a3a3a"/>`);
  svg.innerHTML=o.join('');
}
function lineAt(e){
  const pt=svg.createSVGPoint(); pt.x=e.clientX; pt.y=e.clientY; const p=pt.matrixTransform(svg.getScreenCTM().inverse());
  const x=(p.x-PAD)/G, y=(p.y-PAD)/G;
  // 가장 가까운 선(가로·세로 중간점 기준)
  let best=null, bd=1e9;
  const tryL=(o,r,c,mx,my)=>{ if(!valid(o,r,c)) return; const d=Math.hypot(x-mx,y-my); if(d<bd){ bd=d; best={o,r,c}; } };
  const rr=Math.round(y), cc=Math.floor(x); tryL('h',rr,cc,cc+.5,rr);
  const r2=Math.floor(y), c2=Math.round(x); tryL('v',r2,c2,c2,r2+.5);
  return bd<.45 ? best : null;
}
const same=(a,b)=>a&&b&&a.o===b.o&&a.r===b.r&&a.c===b.c;
function bind(){
  svg.addEventListener('pointermove',e=>{ const t=lineAt(e); if(!same(t,hover)){ hover=t; drawB(); } });
  svg.addEventListener('pointerleave',()=>{ hover=null; drawB(); });
  svg.addEventListener('pointerdown',e=>{
    if(!myTurn()) return; const t=lineAt(e); if(!t) return;
    if(lineVal(V,t.o,t.r,t.c)!==-1){ Cx.tip('이미 그은 선이에요'); return; }
    hover=null; Cx.act({k:'line',...t});
  });
}
function render(el,v,ctx){
  V=v; Cx=ctx;
  svg=el.querySelector('svg.dotboard');
  if(!svg){ el.innerHTML=`<svg class="dotboard" viewBox="0 0 ${W} ${H}"></svg>`; svg=el.firstChild; bind(); hover=null; }
  drawB();
}
const guide=`
<p>점과 점 사이에 <b>선을 하나씩</b> 번갈아 그어요. <b>상자의 네 번째 변을 그은 사람</b>이 그 상자를 가져가요. 상자를 더 많이 가진 사람이 승리!</p>
<ul><li>판은 상자 5×5 (점 6×6).</li>
<li>상자를 완성하면 <b>한 번 더</b> 그어요. 연달아 여러 개를 먹을 수도 있어요.</li>
<li>모든 선을 다 그으면 끝.</li></ul>
<h3>조작</h3>
<ul><li>두 점 사이 빈 곳을 누르면 선이 그어져요. 가까운 선이 미리보기로 떠요.</li>
<li>미리보기가 <b>빨간 점선</b>이면, 그 선을 그으면 상대에게 상자를 내주는 위험한 선이에요.</li></ul>
<div class="tipbox">💡 <b>팁</b><br>
· 변이 2개 그어진 상자에 세 번째 변을 그으면 상대가 먹어요. 초반엔 이런 선을 피하세요.<br>
· 안전한 선이 다 떨어지면 누군가는 상자 줄(사슬)을 내줘야 해요. 그때 <b>가장 짧은 줄</b>을 내주는 게 좋아요.<br>
· 고수는 일부러 마지막 상자 2개를 양보해서 다음 긴 줄을 통째로 가져가기도 해요.</div>`;
window.GAMES.dots = {
  title:'점 잇기 상자', emoji:'🔲', tags:['전략','클래식','펜과종이'], pulse:v=>v.score[1]-v.score[0], pulseStep:2,
  tagline:'점 사이에 선을 긋다가 상자의 마지막 변을 그으면 내 땅! 도트 앤 박스.',
  guide, init, apply, ai, local:true, render,
  reset(){ hover=null; svg=null; },
  status:(v,ctx)=> ctx.turnText(v) + (v.last&&v.last.got&&v.turn===v.last.p ? ` · 상자 ${v.last.got}개 완성! 한 번 더` : ''),
  bar:(v,i)=>`<span class="score">${v.score[i]}</span><span class="tag">상자</span>`,
  result:(v,ctx)=>`${v.score[ctx.me]} : ${v.score[1-ctx.me]}`,
};
})();
