(function(){
'use strict';
/* 사목 떨어뜨리기: 7열×6행 세운 판. 열을 고르면 돌이 맨 아래 빈칸까지 떨어짐. 가로·세로·대각선 4개를 먼저 이으면 승리. */
const W=7, H=6;
const at=(b,r,c)=> r<0||r>=H||c<0||c>=W ? -2 : b[r*W+c];   // r=0이 맨 위
function init(starter){ return {b:Array(W*H).fill(-1), turn:starter, starter, winner:null, last:null, line:null, moves:0}; }
const dropRow=(b,c)=>{ for(let r=H-1;r>=0;r--) if(b[r*W+c]===-1) return r; return -1; };
function fourAt(b,r,c){
  const p=b[r*W+c];
  for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]){
    const cells=[[r,c]];
    for(const sg of [1,-1]){ let k=1; while(at(b,r+dr*k*sg,c+dc*k*sg)===p){ cells.push([r+dr*k*sg,c+dc*k*sg]); k++; } }
    if(cells.length>=4) return cells;
  }
  return null;
}
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(s.turn!==p) return '상대 차례예요';
  if(!a||a.k!=='drop') return '알 수 없는 동작';
  const c=a.c|0; if(c<0||c>=W) return '열을 고르세요';
  const r=dropRow(s.b,c); if(r<0) return '꽉 찬 줄이에요';
  s.b[r*W+c]=p; s.last=[r,c]; s.moves++;
  const line=fourAt(s.b,r,c);
  if(line){ s.winner=p; s.line=line; s.turn=null; return null; }
  if(s.moves>=W*H){ s.winner='draw'; s.turn=null; return null; }
  s.turn=1-p; return null;
}

/* 컴퓨터: 네 칸 창문 점수 + 7수 앞 알파베타 (가운데 우선) */
const ORDER=[3,2,4,1,5,0,6];
function windowScore(b,p){
  let s=0; const o=1-p;
  const win=(cells)=>{ let mp=0, op=0, e=0; for(const [r,c] of cells){ const x=b[r*W+c]; if(x===p) mp++; else if(x===o) op++; else e++; }
    if(mp&&op) return 0; if(mp===3&&e===1) return 6; if(mp===2&&e===2) return 2; if(op===3&&e===1) return -7; if(op===2&&e===2) return -2; return 0; };
  for(let r=0;r<H;r++) for(let c=0;c<W;c++) for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]){
    const cells=[]; for(let k=0;k<4;k++){ const rr=r+dr*k, cc=c+dc*k; if(rr<0||rr>=H||cc<0||cc>=W) break; cells.push([rr,cc]); }
    if(cells.length===4) s+=win(cells);
  }
  for(let r=0;r<H;r++) if(b[r*W+3]===p) s+=3; else if(b[r*W+3]===o) s-=3;
  return s;
}
function nega(b,p,depth,al,be,moves){
  if(moves>=W*H) return 0;
  if(depth===0) return windowScore(b,p);
  let best=-1e9;
  for(const c of ORDER){
    const r=dropRow(b,c); if(r<0) continue;
    b[r*W+c]=p;
    const v = fourAt(b,r,c) ? 1e6+depth : -nega(b,1-p,depth-1,-be,-al,moves+1);
    b[r*W+c]=-1;
    if(v>best) best=v; if(best>al) al=best; if(al>=be) break;
  }
  return best;
}
function ai(v,lvl=1){
  const b=v.b.slice(); let best=null, bs=-Infinity;
  for(const c of ORDER){
    const r=dropRow(b,c); if(r<0) continue;
    b[r*W+c]=1;
    const sc = fourAt(b,r,c) ? 1e9 : -nega(b,0,[1,3,5][lvl],-1e9,1e9,v.moves+1);
    b[r*W+c]=-1;
    const noisy=sc+Math.random()*[40,6,1.5][lvl];
    if(noisy>bs){ bs=noisy; best=c; }
  }
  return {k:'drop', c:best};
}

/* 화면: 파란 판, 열 위에 미리보기 돌, 떨어지는 애니메이션 */
let V=null, C=null, hoverC=null, lastKey='';
const COL=['var(--p0)','var(--p1)'];
function render(el,v,ctx){
  V=v; C=ctx;
  const winSet=new Set((v.line||[]).map(([r,c])=>r*W+c));
  const lk = v.last ? v.last.join(',')+':'+v.moves : '';
  const fresh = lk!==lastKey; lastKey=lk;
  const my=ctx.myTurn, myCol=COL[ctx.me];
  let h=`<div class="d4-wrap"><div class="d4-top">${[...Array(W).keys()].map(c=>`<div class="d4-prev" data-c="${c}">${my&&hoverC===c&&dropRow(v.b,c)>=0?`<span style="background:${myCol}"></span>`:''}</div>`).join('')}</div><div class="d4-board ${my?'aim':''}">`;
  for(let r=0;r<H;r++) for(let c=0;c<W;c++){
    const x=v.b[r*W+c], isLast=v.last&&v.last[0]===r&&v.last[1]===c;
    const disc = x===-1 ? '' : `<span class="d4-disc ${winSet.has(r*W+c)?'win':''} ${isLast&&fresh?'drop':''}" style="background:${COL[x]};--fall:${(r+1)*-100}%"></span>`;
    h+=`<div class="d4-cell ${isLast?'last':''}" data-c="${c}">${disc}</div>`;
  }
  h+='</div></div>';
  el.innerHTML=h;
  el.onmousemove=e=>{ const d=e.target.closest('[data-c]'); const c=d?+d.dataset.c:null; if(c!==hoverC){ hoverC=c; const tops=el.querySelectorAll('.d4-prev'); tops.forEach((t,i)=>{ t.innerHTML = C.myTurn&&hoverC===i&&dropRow(V.b,i)>=0 ? `<span style="background:${COL[C.me]}"></span>` : ''; }); } };
  el.onmouseleave=()=>{ hoverC=null; el.querySelectorAll('.d4-prev').forEach(t=>t.innerHTML=''); };
  el.onclick=e=>{
    const d=e.target.closest('[data-c]'); if(!d||!C.myTurn) return;
    const c=+d.dataset.c; if(dropRow(V.b,c)<0){ C.tip('꽉 찬 줄이에요'); return; }
    C.act({k:'drop',c});
  };
}
const guide=`
<p>세워진 판의 <b>열(세로줄)</b>을 골라 돌을 넣으면 맨 아래 빈칸까지 <b>뚝 떨어져요.</b> 가로·세로·대각선으로 <b>4개를 먼저 이으면</b> 승리!</p>
<ul><li>판은 7열 × 6행.</li>
<li>내 차례에 원하는 열을 누르면 돼요. 꽉 찬 열에는 못 넣어요.</li>
<li>판이 다 찰 때까지 아무도 못 이으면 무승부.</li></ul>
<div class="tipbox">💡 <b>팁</b><br>
· <b>가운데 열</b>이 가장 많은 줄에 걸쳐 있어서 제일 좋은 자리예요.<br>
· 상대가 3개를 이으면 바로 막으세요. 단, 막으려고 넣은 돌 바로 위가 상대의 승리 칸이 되면 안 돼요!<br>
· 한 번에 이길 수 있는 칸을 두 군데 만들면(양쪽 위협) 상대가 다 못 막아요.</div>`;
window.GAMES.drop4 = {
  title:'사목 떨어뜨리기', ref:'커넥트 포', emoji:'⬇️', tags:['전략','클래식','추상'],
  tagline:'세운 판에 돌을 떨어뜨려 가로·세로·대각선 4개를 먼저 잇는 대결.',
  guide, init, apply, ai, local:true, render,
  reset(){ hoverC=null; lastKey=''; },
  status:(v,ctx)=>ctx.turnText(v)+(ctx.myTurn?' · 넣을 열을 누르세요':''),
  bar:(v,i)=>`<span class="d4-chip" style="background:${COL[i]}"></span>`,
};
})();
