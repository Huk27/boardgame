(function(){
'use strict';
/* 만칼라: 내 쪽 구멍 6개, 구멍마다 씨앗 4개. 한 구멍의 씨앗을 모두 집어 반시계로 하나씩 뿌림(상대 창고는 건너뜀).
   마지막 씨앗이 내 창고 → 한 번 더. 마지막 씨앗이 내 쪽 빈 구멍 → 맞은편 씨앗까지 몽땅 내 창고로.
   한쪽 구멍이 다 비면 끝, 남은 씨앗은 각자 창고로. 창고에 많은 쪽 승.
   번호: 0~5 = 0번 구멍, 6 = 0번 창고, 7~12 = 1번 구멍, 13 = 1번 창고 */
const PITS=6, SEEDS=4, ST=[6,13];
const pitsOf=p=> p===0 ? [0,1,2,3,4,5] : [7,8,9,10,11,12];
const opp=i=>12-i;
function init(starter){ const b=Array(14).fill(SEEDS); b[6]=0; b[13]=0; return {b, turn:starter, starter, winner:null, last:null, extra:false, cap:null}; }
function sow(b,p,i){ // b 수정, {path, extra, cap}
  let n=b[i]; b[i]=0; let k=i; const path=[];
  while(n>0){ k=(k+1)%14; if(k===ST[1-p]) continue; b[k]++; n--; path.push(k); }
  let extra=k===ST[p], cap=null;
  if(!extra && pitsOf(p).includes(k) && b[k]===1 && b[opp(k)]>0){ cap={at:k, from:opp(k), n:b[opp(k)]+1}; b[ST[p]]+=b[opp(k)]+1; b[k]=0; b[opp(k)]=0; }
  return {path, extra, cap};
}
const sideEmpty=(b,p)=>pitsOf(p).every(i=>b[i]===0);
function finish(b){ for(const p of [0,1]) for(const i of pitsOf(p)){ b[ST[p]]+=b[i]; b[i]=0; } }
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(s.turn!==p) return '상대 차례예요';
  if(!a||a.k!=='pit') return '알 수 없는 동작';
  const i=a.i|0; if(!pitsOf(p).includes(i)) return '내 쪽 구멍을 고르세요';
  if(!s.b[i]) return '빈 구멍이에요';
  const r=sow(s.b,p,i);
  s.last={p, from:i, path:r.path}; s.extra=r.extra; s.cap=r.cap;
  if(sideEmpty(s.b,0)||sideEmpty(s.b,1)){ finish(s.b); const x=s.b[6], y=s.b[13]; s.winner=x>y?0:y>x?1:'draw'; s.turn=null; return null; }
  if(!r.extra) s.turn=1-p;
  return null;
}

/* 컴퓨터: 창고 차이 기준 알파베타 탐색 (한 번 더 두는 수 반영) */
function search(b,p,depth,al,be){
  if(sideEmpty(b,0)||sideEmpty(b,1)){ const t=b.slice(); finish(t); return t[13]-t[6]; }
  if(depth===0) return b[13]-b[6] + (pitsOf(1).reduce((a,i)=>a+b[i],0)-pitsOf(0).reduce((a,i)=>a+b[i],0))*.25;
  const moves=pitsOf(p).filter(i=>b[i]>0);
  if(p===1){ let v=-1e9; for(const i of moves){ const t=b.slice(); const r=sow(t,1,i); v=Math.max(v, search(t, r.extra?1:0, depth-1, al, be)); al=Math.max(al,v); if(al>=be) break; } return v; }
  let v=1e9; for(const i of moves){ const t=b.slice(); const r=sow(t,0,i); v=Math.min(v, search(t, r.extra?0:1, depth-1, al, be)); be=Math.min(be,v); if(al>=be) break; } return v;
}
function ai(v,lvl=1){
  let best=null, bs=-1e9;
  for(const i of pitsOf(1)){ if(!v.b[i]) continue; const t=v.b.slice(); const r=sow(t,1,i); const sc=search(t, r.extra?1:0, [1,4,8][lvl], -1e9, 1e9)+Math.random()*[3,1,.3][lvl]; if(sc>bs){ bs=sc; best=i; } }
  return {k:'pit', i:best};
}

/* 화면: 내 구멍이 아래, 상대 구멍이 위(반대 방향), 내 창고 오른쪽 */
let V=null, C=null;
function seedsHTML(n){
  const show=Math.min(n,12); let d='';
  for(let k=0;k<show;k++) d+='<i></i>';
  return `<span class="seeds">${d}</span><b>${n}</b>`;
}
function render(el,v,ctx){
  V=v; C=ctx;
  const me=ctx.me, o=1-me, my=ctx.myTurn;
  const mine=pitsOf(me), theirs=pitsOf(o).slice().reverse();
  const order=new Map((v.last?v.last.path:[]).map((k,j)=>[k,j]));
  const cell=(i,cls)=>{ const j=order.get(i); const hit=j!=null?`style="animation-delay:${j*90}ms"`:'';
    return `<div class="mc-pit ${cls} ${j!=null?'hit':''} ${v.last&&v.last.from===i?'from':''} ${v.cap&&(v.cap.at===i||v.cap.from===i)?'cap':''}" data-i="${i}" ${hit}>${seedsHTML(v.b[i])}</div>`; };
  let h=`<div class="mc-board">
    <div class="mc-store left ${order.has(ST[o])?'hit':''}">${seedsHTML(v.b[ST[o]])}<small>${U.esc(ctx.name(o))} 창고</small></div>
    <div class="mc-rows">
      <div class="mc-row top">${theirs.map(i=>cell(i,'theirs')).join('')}</div>
      <div class="mc-row bot">${mine.map(i=>cell(i, 'mine'+(my&&v.b[i]?' can':''))).join('')}</div>
    </div>
    <div class="mc-store right ${order.has(ST[me])?'hit':''}">${seedsHTML(v.b[ST[me]])}<small>내 창고</small></div>
  </div>`;
  let note='';
  if(v.last && v.winner==null){
    const who = v.last.p===me && ctx.mode!=='local' ? '나' : ctx.name(v.last.p);
    if(v.cap) note=`${who}: 빈 구멍에 떨어져서 맞은편 씨앗까지 <b>${v.cap.n}개</b> 획득! 🎯`;
    else if(v.extra) note=`${who}: 마지막 씨앗이 창고에! <b>한 번 더</b> ✨`;
  }
  h+=`<div class="banner">${note||'⟲ 씨앗은 반시계 방향으로 한 칸씩 뿌려져요'}</div>`;
  el.innerHTML=h;
  el.onclick=e=>{
    const d=e.target.closest('.mc-pit.mine'); if(!d) return;
    if(!C.myTurn) return;
    const i=+d.dataset.i; if(!V.b[i]){ C.tip('빈 구멍이에요'); return; }
    C.act({k:'pit',i});
  };
}
const guide=`
<p>내 쪽 구멍 6개에서 씨앗을 뿌려 <b>내 창고(오른쪽 큰 구멍)에 씨앗을 더 많이 모으면</b> 이겨요.</p>
<ul><li>처음엔 구멍마다 씨앗 4개.</li>
<li>내 차례에 <b>내 쪽(아래) 구멍 하나</b>를 누르면, 그 구멍의 씨앗을 모두 집어 <b>반시계 방향</b>으로 한 칸에 하나씩 뿌려요. 내 창고에는 넣고, 상대 창고는 건너뛰어요.</li>
<li>✨ <b>마지막 씨앗이 내 창고</b>에 떨어지면 한 번 더 둬요.</li>
<li>🎯 <b>마지막 씨앗이 내 쪽의 빈 구멍</b>에 떨어지면, 그 씨앗과 맞은편 상대 구멍의 씨앗을 몽땅 내 창고로 가져와요.</li>
<li>한쪽 구멍 6개가 모두 비면 끝. 남은 씨앗은 각자 창고로 들어가요.</li></ul>
<div class="tipbox">💡 <b>팁</b><br>
· 씨앗 수가 창고까지 거리와 딱 맞는 구멍을 찾으세요. 한 번 더 두기를 연달아 이어갈 수 있어요.<br>
· 상대 쪽 씨앗이 많이 쌓인 구멍 맞은편을 비워두면 큰 한 방(🎯)을 노릴 수 있어요.<br>
· 반대로 내 구멍에 씨앗이 많이 쌓였는데 맞은편이 비어 있으면 위험해요.</div>`;
window.GAMES.mancala = {
  title:'만칼라', emoji:'🫘', tags:['전략','클래식','계산'], pulse:v=>v.b[13]-v.b[6], pulseStep:3,
  tagline:'씨앗을 한 칸씩 뿌려 내 창고에 모으기. 한 번 더 두기와 한 방 가져오기의 계산 싸움.',
  guide, init, apply, ai, local:true, render,
  status:(v,ctx)=>ctx.turnText(v)+(ctx.myTurn?' · 아래 내 구멍을 누르세요':''),
  bar:(v,i)=>`<span class="score">${v.b[ST[i]]}</span><span class="tag">창고</span>`,
  result:(v,ctx)=>`${v.b[ST[ctx.me]]} : ${v.b[ST[1-ctx.me]]}`,
};
})();
