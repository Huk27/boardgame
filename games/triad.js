(function(){
'use strict';
/* 세 짝: 9장의 타일에서 모양·글자색·바탕색이 각각 "모두 같거나 모두 다른" 세 장을 먼저 찾기. 실시간. */
const SH=['●','▲','■'], COL=['#e8453c','#2f6fd6','#1f9e4f'], BG=['#ffffff','#e4d9c3','#3a3a3a'];
const isTriad=(b,i,j,k)=>['s','c','g'].every(f=>(b[i][f]+b[j][f]+b[k][f])%3===0);
function allTriads(b){ const r=[]; for(let i=0;i<9;i++) for(let j=i+1;j<9;j++) for(let k=j+1;k<9;k++) if(isTriad(b,i,j,k)) r.push([i,j,k]); return r; }
function gen(){
  const all=[]; for(let s=0;s<3;s++) for(let c=0;c<3;c++) for(let g=0;g<3;g++) all.push({s,c,g});
  for(;;){ const b=U.shuffle(all.slice()).slice(0,9), n=allTriads(b).length; if(n>=3&&n<=7) return b; }
}
const remaining=s=>allTriads(s.board).filter(t=>!s.found.some(f=>f.ids.join()===t.join()));
function init(starter){ return {rounds:3, round:1, board:gen(), found:[], score:[0,0], last:null, ev:0, turn:null, winner:null, starter}; }
function next(s){
  if(s.round>=s.rounds){ s.winner = s.score[0]>s.score[1]?0 : s.score[1]>s.score[0]?1 : 'draw'; return; }
  s.round++; s.board=gen(); s.found=[];
}
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(!a) return '알 수 없는 동작';
  if(a.k==='claim'){
    const ids=(Array.isArray(a.ids)?a.ids:[]).map(Number).sort((x,y)=>x-y);
    if(ids.length!==3||new Set(ids).size!==3||ids.some(i=>!(i>=0&&i<9))) return '타일 3개를 고르세요';
    s.ev++;
    if(s.found.some(f=>f.ids.join()===ids.join())){ s.score[p]--; s.last={p,ok:false,ids,why:'이미 나온 짝',ev:s.ev}; return null; }
    if(!isTriad(s.board,...ids)){ s.score[p]--; s.last={p,ok:false,ids,why:'짝이 아니에요',ev:s.ev}; return null; }
    s.found.push({ids,p}); s.score[p]++; s.last={p,ok:true,ids,ev:s.ev}; return null;
  }
  if(a.k==='done'){
    s.ev++;
    if(remaining(s).length===0){ s.score[p]+=3; s.last={p,ok:true,done:true,round:s.round,ev:s.ev}; next(s); }
    else { s.score[p]--; s.last={p,ok:false,done:true,why:'아직 남았어요',ev:s.ev}; }
    return null;
  }
  return '알 수 없는 동작';
}

let sel=[], sig='', lastEv=0, C=null, V=null;
const label=ids=>ids.map(i=>i+1).join('·');
function render(el,v,ctx){
  V=v; C=ctx;
  const bsig=v.round+':'+v.board.map(t=>t.s+''+t.c+t.g).join('');
  if(bsig!==sig){ sig=bsig; sel=[]; }
  const fresh = v.last && v.last.ev!==lastEv;
  if(fresh){ lastEv=v.last.ev; if(v.last.p!==ctx.me) ctx.sfx(v.last.ok?'score':'tap'); else if(!v.last.ok) ctx.sfx('bad'); else ctx.sfx('score'); }
  let h=`<div class="info">라운드 <b>${v.round}</b> / ${v.rounds} · 찾은 짝 <b>${v.found.length}</b>개</div>`;
  h+=`<div class="tr-grid">${v.board.map((t,i)=>{
    const flash = fresh && v.last.ok && v.last.ids && v.last.ids.includes(i);
    return `<button class="tt ${sel.includes(i)?'sel':''} ${t.g===2?'dark':''} ${flash?'flash':''}" data-i="${i}" style="background:${BG[t.g]};color:${COL[t.c]}" ${ctx.can?'':'disabled'}><i>${i+1}</i>${SH[t.s]}</button>`;
  }).join('')}</div>`;
  let b='';
  if(v.last){
    const who = v.last.p===ctx.me ? '나' : U.esc(ctx.name(v.last.p));
    if(v.last.done) b = v.last.ok ? `${who}: 끝! 정답 +3 → 다음 라운드` : `${who}: 끝! ✖ ${v.last.why} −1`;
    else b = v.last.ok ? `${who}: ${label(v.last.ids)} ✔ +1` : `${who}: ${label(v.last.ids)} ✖ ${v.last.why} −1`;
  }
  h+=`<div class="banner ${v.last?(v.last.ok?'good':'badx'):''}">${b||'모양·글자색·바탕색이 각각 모두 같거나 모두 다른 세 장!'}</div>`;
  h+=`<div class="found">${v.found.map(f=>`<span class="chip" style="background:var(--p${f.p})">${label(f.ids)}</span>`).join('')}</div>`;
  h+=`<div class="actions"><button id="trDone" ${ctx.can?'':'disabled'}>끝! (더 없음)</button><button class="ghost" id="trClear">선택 취소</button></div>`;
  el.innerHTML=h;
  el.onclick=e=>{
    const t=e.target.closest('button'); if(!t||t.disabled) return;
    if(t.id==='trDone'){ ctx.act({k:'done'}); return; }
    if(t.id==='trClear'){ sel=[]; ctx.rerender(); return; }
    if(t.dataset.i!=null) toggle(+t.dataset.i);
  };
}
function toggle(i){
  if(!C||!C.can) return;
  sel = sel.includes(i) ? sel.filter(x=>x!==i) : sel.concat(i);
  if(sel.length===3){ const ids=sel; sel=[]; C.act({k:'claim',ids}); }
  else C.rerender();
}
window.addEventListener('keydown',e=>{
  const area=document.getElementById('area');
  if(!area||area.dataset.game!=='triad'||document.getElementById('play').hidden||e.target.tagName==='INPUT') return;
  if(e.key>='1'&&e.key<='9') toggle(+e.key-1);
  else if(e.key==='Escape'){ sel=[]; C&&C.rerender(); }
  else if(e.key==='0'||e.key==='Enter'){ C&&C.can&&C.act({k:'done'}); }
});
const guide=`
<p>9장의 타일 중에서 <b>"짝"이 되는 세 장</b>을 상대보다 먼저 찾는 실시간 게임이에요. 차례가 없어요. 먼저 누르는 사람이 임자!</p>
<h3>짝이 되는 조건</h3>
<p>타일은 세 가지 특징이 있어요: <b>모양</b>(● ▲ ■), <b>글자색</b>(빨강·파랑·초록), <b>바탕색</b>(흰색·베이지·검정).</p>
<p>세 장을 골랐을 때, <b>세 특징 모두</b> 각각 "셋 다 같음" 또는 "셋 다 다름"이어야 짝이에요.</p>
<ul><li>✔ 모양 셋 다 ●, 글자색 셋 다 다름, 바탕 셋 다 흰색 → 짝</li>
<li>✖ 모양 ● ● ▲ (둘만 같음) → 짝 아님</li></ul>
<h3>점수</h3>
<ul><li>타일 3개를 누르면 바로 제출돼요. 맞으면 <b>+1</b>, 틀리거나 이미 나온 짝이면 <b>−1</b>.</li>
<li>더 이상 짝이 없다고 생각되면 <b>[끝!]</b>. 맞으면 <b>+3</b>이고 다음 라운드로, 아직 남았으면 <b>−1</b>.</li>
<li>라운드 3번, 점수 높은 사람이 승리.</li></ul>
<h3>조작</h3>
<ul><li>PC에서는 숫자키 <b>1~9</b>로 고르고, <b>0</b>이나 <b>Enter</b>로 "끝!", <b>Esc</b>로 선택 취소.</li></ul>
<div class="tipbox">💡 <b>팁</b>: 두 장을 먼저 정하면 세 번째 장은 딱 하나로 정해져요. 두 장이 ●와 ▲면 세 번째는 ■여야 하죠. 그 타일이 판에 있는지만 보면 돼요.</div>`;
window.GAMES.triad = {
  title:'세 짝', ref:'더 지니어스 「결합」', emoji:'🔺', tags:['스피드','눈썰미','두뇌서바이벌'], pulse:v=>v.score[1]-v.score[0], tagline:'모양·색·바탕이 모두 같거나 모두 다른 세 장을 먼저 찾는 스피드 대결.',
  guide, init, apply, render,
  ai(v){ const r=remaining(v); return r.length ? {k:'claim',ids:U.pick(r)} : {k:'done'}; },
  aiDelay:()=>7000+Math.random()*8000,
  reset(){ sel=[]; sig=''; lastEv=0; },
  status:()=> '짝을 찾으면 타일 3개를 누르세요 · 더 없으면 [끝!]',
  bar:(v,i)=>`<span class="score">${v.score[i]}</span><span class="tag">점</span>`,
  result:(v,ctx)=>`${v.score[ctx.me]} : ${v.score[1-ctx.me]}`,
};
})();
