(function(){
'use strict';
/* 성냥개비 가져가기: 줄마다 1·3·5·7개. 내 차례에 한 줄에서 원하는 만큼(1개 이상) 가져감. 마지막 성냥을 가져가는 사람이 짐. */
const START=[1,3,5,7];
function init(starter){ return {rows:START.slice(), turn:starter, starter, winner:null, last:null, total:16}; }
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(s.turn!==p) return '상대 차례예요';
  if(!a||a.k!=='take') return '알 수 없는 동작';
  const r=a.r|0, n=a.n|0;
  if(!(r>=0&&r<s.rows.length)) return '줄을 고르세요';
  if(n<1||n>s.rows[r]) return '가져갈 개수를 다시 고르세요';
  s.rows[r]-=n; s.last={p,r,n};
  if(s.rows.every(x=>x===0)){ s.winner=1-p; s.turn=null; return null; }   // 마지막을 가져간 사람이 짐
  s.turn=1-p; return null;
}
/* 컴퓨터: 이기는 수(마지막 성냥을 상대에게 넘기는 계산)를 알지만, 초반엔 사람처럼 가끔 감으로 둠 */
function bestMove(rows){
  const big=rows.filter(x=>x>1).length;
  if(big<=1){   // 끝판: 1짜리 줄이 홀수 개 남게
    const i=rows.findIndex(x=>x>1);
    if(i>=0){ const ones=rows.filter(x=>x===1).length; const keep = ones%2===0 ? 1 : 0; return {r:i,n:rows[i]-keep}; }
    const j=rows.findIndex(x=>x>0); return {r:j,n:1};
  }
  const x=rows.reduce((a,b)=>a^b,0);
  if(x){ for(let i=0;i<rows.length;i++){ const t=rows[i]^x; if(t<rows[i]) return {r:i,n:rows[i]-t}; } }
  return null;   // 지는 자리: 정답 없음
}
function ai(v,lvl=1){
  const rows=v.rows, left=rows.reduce((a,b)=>a+b,0);
  const good=bestMove(rows);
  const sloppy = [[.7,.5,.3],[.35,.15,0],[.1,0,0]][lvl][left>9?0:left>5?1:2];
  if(good && Math.random()>=sloppy) return {k:'take',...good};
  const opts=[]; rows.forEach((x,i)=>{ for(let n=1;n<=x;n++) opts.push({r:i,n}); });
  const safe=opts.filter(o=>!(left-o.n===0));   // 마지막 하나를 스스로 가져가진 않게
  const m=U.pick(safe.length?safe:opts); return {k:'take',...m};
}

/* 화면: 줄마다 성냥. 누른 성냥부터 오른쪽 끝까지 선택 → 가져가기 */
let sel=null, sig='';
function render(el,v,ctx){
  const sg=v.rows.join(',')+':'+v.turn; if(sg!==sig){ sig=sg; sel=null; }
  const my=ctx.myTurn, L=v.last;
  let h=`<div class="nim-table">`;
  v.rows.forEach((cnt,r)=>{
    const took = L && L.r===r ? L.n : 0;
    h+=`<div class="nim-row" data-r="${r}"><span class="nim-no">${r+1}줄</span><div class="nim-sticks">`;
    for(let k=0;k<cnt;k++){ const on = sel && sel.r===r && k>=cnt-sel.n; h+=`<button class="nim-stick ${on?'sel':''}" data-r="${r}" data-k="${k}" ${my?'':'disabled'}><i></i></button>`; }
    for(let k=0;k<took;k++) h+=`<span class="nim-stick gone"><i></i></span>`;
    h+=`</div></div>`;
  });
  h+=`</div>`;
  const left=v.rows.reduce((a,b)=>a+b,0);
  if(my) h+=`<div class="fh-act"><button id="nimTake" ${sel?'':'disabled'}>${sel?`${sel.r+1}줄에서 ${sel.n}개 가져가기`:'가져갈 성냥을 누르세요'}</button>${sel?'<button class="ghost" id="nimClear">취소</button>':''}</div>`;
  h+=`<div class="info">남은 성냥 <b>${left}</b>개${L&&v.winner==null?` · 방금 ${L.p===ctx.me&&ctx.mode!=='local'?'내가':U.esc(ctx.name(L.p))+'이(가)'} ${L.r+1}줄에서 ${L.n}개 가져감`:''}</div>`;
  el.innerHTML=h;
  el.onclick=e=>{
    const b=e.target.closest('button'); if(!b||b.disabled) return;
    if(b.id==='nimTake'){ const m=sel; sel=null; ctx.act({k:'take',r:m.r,n:m.n}); return; }
    if(b.id==='nimClear'){ sel=null; ctx.rerender(); return; }
    if(b.dataset.r!=null){ const r=+b.dataset.r, k=+b.dataset.k, n=v.rows[r]-k; sel = sel&&sel.r===r&&sel.n===n ? null : {r,n}; ctx.rerender(); }
  };
}
const guide=`
<p>성냥개비가 <b>1·3·5·7개</b>씩 네 줄로 놓여 있어요. 번갈아 가져가다가 <b>마지막 성냥을 가져가는 사람이 져요!</b></p>
<ul><li>내 차례에 <b>한 줄에서만</b> 원하는 만큼(1개 이상) 가져가요. 한 줄을 통째로 가져가도 돼요.</li>
<li>성냥을 누르면 그 성냥부터 줄 끝까지 선택돼요. 확인하고 <b>가져가기</b>.</li></ul>
<div class="tipbox">💡 <b>팁</b><br>
· 끝판엔 "1개짜리 줄이 홀수 개" 남도록 넘기면 상대가 마지막을 가져가게 돼요.<br>
· 사실 이 게임엔 완벽한 공략(2진수 계산)이 있어요. 컴퓨터는 그걸 알지만 초반엔 가끔 실수해요. 그 틈을 노려보세요!</div>`;
window.GAMES.nim = {
  title:'성냥개비 가져가기', emoji:'🔥', tags:['두뇌서바이벌','수학','클래식'],
  pulse:v=>{ const x=v.rows.reduce((a,b)=>a^b,0); return x===0 && v.turn===0 ? 1 : 0; }, pulseStep:1,
  tagline:'한 줄에서 원하는 만큼 가져가기. 마지막 성냥을 집는 사람이 지는 눈치 계산 싸움.',
  guide, init, apply, ai, local:true, render,
  reset(){ sel=null; sig=''; },
  status:(v,ctx)=>ctx.turnText(v)+(ctx.myTurn?' · 마지막 성냥을 가져가면 져요':''),
  bar:(v,i)=>'',
};
})();
