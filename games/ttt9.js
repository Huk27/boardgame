(function(){
'use strict';
/* 틱택토 속 틱택토: 작은 판 9개(각 3×3)로 된 큰 판. 내가 작은 판의 몇 번째 칸에 두었느냐가
   상대가 다음에 둘 작은 판을 정함. 그 판이 끝났으면(승부 남/꽉 참) 아무 데나. 작은 판을 이기면 큰 판의 그 칸을 차지,
   큰 판에서 한 줄 3칸을 먼저 차지하면 승리. 칸 번호: 판 b(0~8) × 칸 c(0~8) → b*9+c */
const LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const lineWin=(arr)=>{ for(const [a,b,c] of LINES) if(arr[a]!=null&&arr[a]!==-1&&arr[a]!=='d'&&arr[a]===arr[b]&&arr[a]===arr[c]) return arr[a]; return null; };
function init(starter){ return {cells:Array(81).fill(-1), big:Array(9).fill(null), next:-1, turn:starter, starter, winner:null, last:null, line:null}; }
function smallState(cells,b){ const sub=cells.slice(b*9,b*9+9); const w=lineWin(sub); if(w!=null) return w; return sub.every(x=>x!==-1)?'d':null; }
function legal(s){
  const boards = s.next>=0 && s.big[s.next]==null ? [s.next] : [0,1,2,3,4,5,6,7,8].filter(b=>s.big[b]==null);
  const out=[]; for(const b of boards) for(let c=0;c<9;c++) if(s.cells[b*9+c]===-1) out.push(b*9+c);
  return out;
}
function play(s,p,i){
  s.cells[i]=p; const b=(i/9)|0, c=i%9;
  if(s.big[b]==null){ const st=smallState(s.cells,b); if(st!=null) s.big[b]=st; }
  s.next = s.big[c]==null ? c : -1;
  s.last=i;
  const W=lineWin(s.big.map(x=>x==null?-1:x));
  if(W!=null){ s.winner=W; s.turn=null; s.line=LINES.find(([a,b2,c2])=>s.big[a]===W&&s.big[b2]===W&&s.big[c2]===W); return; }
  if(!legal(s).length){ const n0=s.big.filter(x=>x===0).length, n1=s.big.filter(x=>x===1).length; s.winner=n0>n1?0:n1>n0?1:'draw'; s.turn=null; return; }
  s.turn=1-p;
}
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(s.turn!==p) return '상대 차례예요';
  if(!a||a.k!=='put') return '알 수 없는 동작';
  const i=a.i|0; if(!legal(s).includes(i)) return s.next>=0&&s.big[s.next]==null ? '반짝이는 작은 판에만 둘 수 있어요' : '둘 수 없는 칸이에요';
  play(s,p,i); return null;
}
/* 컴퓨터: 수마다 무작위 끝까지 두기를 여러 번 해서 승률 높은 수 (약 0.3초) */
function rollout(s,p0){
  const t={cells:s.cells.slice(), big:s.big.slice(), next:s.next, turn:s.turn, winner:null};
  let guard=0;
  while(t.winner==null && guard++<90){
    const L=legal(t); if(!L.length) break;
    // 바로 작은 판을 이기는 수가 있으면 우선 (조금 똑똑한 무작위)
    let pick=null; if(Math.random()<.5) for(const i of L){ const b=(i/9)|0; if(t.big[b]!=null) continue; const sub=t.cells.slice(b*9,b*9+9); sub[i%9]=t.turn; if(lineWin(sub)===t.turn){ pick=i; break; } }
    play(t,t.turn,pick!=null?pick:L[Math.random()*L.length|0]);
  }
  return t.winner===p0 ? 1 : t.winner==null||t.winner==='draw' ? .5 : 0;
}
function ai(v,lvl=1){
  const L=legal(v); if(L.length===1) return {k:'put',i:L[0]};
  const stats=L.map(i=>({i,w:0,n:0})); const t0=performance.now(); let k=0;
  while(performance.now()-t0<[25,120,300][lvl] || k<L.length*[2,5,8][lvl]){
    const st=stats[k%L.length]; const s={cells:v.cells.slice(), big:v.big.slice(), next:v.next, turn:1, winner:null};
    play(s,1,st.i); st.w += s.winner===1 ? 1 : s.winner!=null ? (s.winner==='draw'?.5:0) : rollout(s,1); st.n++; k++;
    if(k>40000) break;
  }
  stats.sort((a,b)=>b.w/b.n-a.w/a.n);
  return {k:'put', i:stats[0].i};
}

/* 화면 */
const MARK=['✕','◯'];
let V=null, C=null;
function render(el,v,ctx){
  V=v; C=ctx;
  const my=ctx.myTurn, L=new Set(my?legal(v):[]);
  const active=new Set([...L].map(i=>(i/9)|0));
  const winSet=new Set(v.line||[]);
  let h=`<div class="t9-big">`;
  for(let b=0;b<9;b++){
    const st=v.big[b];
    h+=`<div class="t9-small ${active.has(b)?'act':''} ${st!=null?'done':''} ${winSet.has(b)?'win':''}">`;
    for(let c=0;c<9;c++){ const i=b*9+c, x=v.cells[i];
      h+=`<div class="t9-c ${x>=0?'p'+x:''} ${L.has(i)?'can':''} ${v.last===i?'last':''}" data-i="${i}">${x>=0?MARK[x]:''}</div>`; }
    if(st!=null) h+=`<div class="t9-own ${st==='d'?'d':'p'+st}">${st==='d'?'—':MARK[st]}</div>`;
    h+=`</div>`;
  }
  h+=`</div>`;
  const where = v.winner!=null ? '' : v.next>=0&&v.big[v.next]==null ? `이번엔 <b>${['왼쪽 위','위','오른쪽 위','왼쪽','가운데','오른쪽','왼쪽 아래','아래','오른쪽 아래'][v.next]}</b> 작은 판에 둬야 해요` : '아무 작은 판에나 둘 수 있어요';
  h+=`<div class="info">${where} · 차지한 판 나 <b>${v.big.filter(x=>x===ctx.me).length}</b> : 상대 <b>${v.big.filter(x=>x===1-ctx.me).length}</b></div>`;
  el.innerHTML=h;
  el.onclick=e=>{
    const d=e.target.closest('.t9-c'); if(!d||!C.myTurn) return;
    const i=+d.dataset.i; if(!legal(V).includes(i)){ C.tip(V.cells[i]>=0?'이미 둔 칸이에요':'반짝이는 작은 판에만 둘 수 있어요'); return; }
    C.act({k:'put',i});
  };
}
const guide=`
<p>큰 틱택토 판의 칸마다 <b>작은 틱택토 판</b>이 들어 있어요. 작은 판을 이기면 큰 판의 그 칸을 차지! <b>큰 판에서 한 줄(3칸)</b>을 먼저 차지하면 승리.</p>
<h3>핵심 규칙</h3>
<ul><li>내가 작은 판의 <b>몇 번째 칸</b>에 두었느냐가, 상대가 다음에 둘 <b>작은 판</b>을 정해요.<br>예) 어느 작은 판이든 <b>오른쪽 위 칸</b>에 두면 → 상대는 <b>오른쪽 위 작은 판</b>에 둬야 해요.</li>
<li>보내진 작은 판이 이미 끝났으면(누가 이겼거나 꽉 참) 아무 데나 둘 수 있어요.</li>
<li>둘 수 있는 작은 판은 반짝여요.</li></ul>
<div class="tipbox">💡 <b>팁</b><br>
· 작은 판에서 이기는 수가, 상대를 내게 불리한 판으로 보내는 수일 수도 있어요. 다음 수를 같이 보세요.<br>
· 이미 끝난 판으로 상대를 보내면 상대가 아무 데나 둘 수 있게 돼요. 조심!<br>
· 가운데 큰 칸(가운데 작은 판)이 가장 많은 줄에 걸려 있어요.</div>`;
window.GAMES.ttt9 = {
  title:'틱택토 속 틱택토', emoji:'#️⃣', tags:['전략','추상','클래식'],
  pulse:v=>v.big.filter(x=>x===1).length-v.big.filter(x=>x===0).length, pulseStep:1,
  tagline:'작은 틱택토 9개! 내가 둔 칸이 상대가 둘 판을 정하는 머리 아픈 틱택토.',
  guide, init, apply, ai, local:true, render,
  status:(v,ctx)=>ctx.turnText(v)+(ctx.myTurn?` · 나는 ${MARK[ctx.me]}`:''),
  bar:(v,i)=>`<span class="t9-mark p${i}">${MARK[i]}</span><span class="score">${v.big.filter(x=>x===i).length}</span><span class="tag">판</span>`,
};
})();
