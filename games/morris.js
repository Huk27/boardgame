(function(){
'use strict';
/* 나인 멘스 모리스: 세 겹 사각형 위 24개 점. 각자 말 9개.
   ① 놓기: 번갈아 빈 점에 하나씩 놓음 ② 옮기기: 9개를 다 놓으면 선을 따라 옆 빈 점으로 한 칸
   ③ 날기: 말이 3개 남으면 아무 빈 점으로 이동 가능.
   한 줄에 내 말 3개(밀)를 새로 만들면 상대 말 하나를 없앰(가능하면 밀에 속하지 않은 말).
   상대 말이 2개 이하가 되거나 움직일 수 없으면 승리. 옮기기 단계에서 60수 동안 아무도 못 없애면 무승부. */
const PT=[[0,0],[3,0],[6,0],[1,1],[3,1],[5,1],[2,2],[3,2],[4,2],[0,3],[1,3],[2,3],[4,3],[5,3],[6,3],[2,4],[3,4],[4,4],[1,5],[3,5],[5,5],[0,6],[3,6],[6,6]];
const ADJ=[[1,9],[0,2,4],[1,14],[4,10],[1,3,5,7],[4,13],[7,11],[4,6,8],[7,12],[0,10,21],[3,9,11,18],[6,10,15],[8,13,17],[5,12,14,20],[2,13,23],[11,16],[15,17,19],[12,16],[10,19],[16,18,20,22],[13,19],[9,22],[19,21,23],[14,22]];
const MILLS=[[0,1,2],[3,4,5],[6,7,8],[9,10,11],[12,13,14],[15,16,17],[18,19,20],[21,22,23],[0,9,21],[3,10,18],[6,11,15],[1,4,7],[16,19,22],[8,12,17],[5,13,20],[2,14,23]];
const MOF=PT.map((_,i)=>MILLS.filter(m=>m.includes(i)));
const QUIET=60;
function init(starter){ return {b:Array(24).fill(-1), hand:[9,9], turn:starter, starter, winner:null, last:null, quiet:0, moves:0}; }
const cnt=(b,p)=>b.reduce((a,x)=>a+(x===p),0);
const inMill=(b,i)=>MOF[i].some(m=>m.every(k=>b[k]===b[i]));
function removable(b,o){ const all=[]; for(let i=0;i<24;i++) if(b[i]===o) all.push(i); const free=all.filter(i=>!inMill(b,i)); return free.length?free:all; }
function legal(s,p){   // s: {b,hand}
  const b=s.b, o=1-p, out=[], moves=[];
  if(s.hand[p]>0){ for(let i=0;i<24;i++) if(b[i]<0) moves.push([null,i]); }
  else if(cnt(b,p)===3){ for(let f=0;f<24;f++) if(b[f]===p) for(let t=0;t<24;t++) if(b[t]<0) moves.push([f,t]); }
  else for(let f=0;f<24;f++) if(b[f]===p) for(const t of ADJ[f]) if(b[t]<0) moves.push([f,t]);
  for(const [f,t] of moves){
    const nb=b.slice(); if(f!=null) nb[f]=-1; nb[t]=p;
    if(MOF[t].some(m=>m.every(k=>nb[k]===p)) && removable(nb,o).length){ for(const r of removable(nb,o)) out.push({from:f,to:t,rem:r}); }
    else out.push({from:f,to:t,rem:null});
  }
  return out;
}
function doMove(s,p,m){ if(m.from!=null) s.b[m.from]=-1; else s.hand[p]--; s.b[m.to]=p; if(m.rem!=null) s.b[m.rem]=-1; }
function lost(s,o){ return (s.hand[o]===0 && cnt(s.b,o)<3) || !legal(s,o).length; }
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(s.turn!==p) return '상대 차례예요';
  if(!a||a.k!=='move') return '알 수 없는 동작';
  const L=legal(s,p), m=L.find(x=>x.from===(a.from??null)&&x.to===a.to&&x.rem===(a.rem??null));
  if(!m){ if(L.some(x=>x.from===(a.from??null)&&x.to===a.to)) return '밀을 만들었어요! 없앨 상대 말을 고르세요'; return '거기로는 갈 수 없어요'; }
  doMove(s,p,m); s.last={p,from:m.from,to:m.to,rem:m.rem}; s.moves++;
  s.quiet = (m.rem!=null || s.hand[0]+s.hand[1]>0) ? 0 : s.quiet+1;
  const o=1-p;
  if(lost(s,o)){ s.winner=p; s.turn=null; return null; }
  if(s.quiet>=QUIET){ s.winner='draw'; s.turn=null; return null; }
  s.turn=o; return null;
}

/* 컴퓨터: 말 수·밀·두 개짜리 열린 줄·움직임으로 알파베타 */
function evalS(s){ // 1번 관점
  const b=s.b; let v=(cnt(b,1)+s.hand[1]-cnt(b,0)-s.hand[0])*12;
  for(const m of MILLS){ const a=m.filter(k=>b[k]===1).length, z=m.filter(k=>b[k]===0).length, e=3-a-z;
    if(a===3) v+=3; if(z===3) v-=3; if(a===2&&e===1) v+=2; if(z===2&&e===1) v-=2.2; }
  if(s.hand[0]+s.hand[1]===0){ let m1=0,m0=0; for(let i=0;i<24;i++){ if(b[i]===1) for(const t of ADJ[i]) if(b[t]<0) m1++; if(b[i]===0) for(const t of ADJ[i]) if(b[t]<0) m0++; } v+=(m1-m0)*.3; }
  return v;
}
function ab(s,p,d,al,be){
  if(s.hand[p]===0 && cnt(s.b,p)<3) return p===1 ? -1000-d : 1000+d;
  const L=legal(s,p);
  if(!L.length) return p===1 ? -1000-d : 1000+d;
  if(d===0) return evalS(s);
  L.sort((x,y)=>(y.rem!=null)-(x.rem!=null));
  if(p===1){ let v=-1e9; for(const m of L){ const t={b:s.b.slice(),hand:s.hand.slice()}; doMove(t,1,m); v=Math.max(v,ab(t,0,d-1,al,be)); al=Math.max(al,v); if(al>=be) break; } return v; }
  let v=1e9; for(const m of L){ const t={b:s.b.slice(),hand:s.hand.slice()}; doMove(t,0,m); v=Math.min(v,ab(t,1,d-1,al,be)); be=Math.min(be,v); if(al>=be) break; } return v;
}
function ai(v,lvl=1){
  const L=legal(v,1); let best=null, bs=-Infinity;
  const flying = v.hand[1]===0 && cnt(v.b,1)===3;
  const depth=[1,2,4][lvl] - (flying&&lvl===2?1:0);
  for(const m of L){ const t={b:v.b.slice(),hand:v.hand.slice()}; doMove(t,1,m); const sc=ab(t,0,depth,-1e9,1e9)+Math.random()*[6,1.2,.15][lvl]; if(sc>bs){ bs=sc; best=m; } }
  return {k:'move', from:best.from, to:best.to, rem:best.rem};
}

/* 화면 */
let sel=null, pend=null;
function render(el,v,ctx){
  const my=ctx.myTurn, me=ctx.me, L= my ? legal(v,me) : [];
  if(sel!=null && !L.some(m=>m.from===sel)) sel=null;
  if(pend && !L.some(m=>m.from===pend.from&&m.to===pend.to)) pend=null;
  const placing=v.hand[me]>0, flying=!placing&&cnt(v.b,me)===3;
  const movable=new Set(L.filter(m=>m.from!=null).map(m=>m.from));
  const targets=new Set(pend?[]:L.filter(m=>placing?true:m.from===sel).map(m=>m.to));
  const rems=new Set(pend?L.filter(m=>m.from===pend.from&&m.to===pend.to).map(m=>m.rem):[]);
  const millNow=new Set(); for(const m of MILLS) if(m.every(k=>v.b[k]>=0&&v.b[k]===v.b[m[0]])) m.forEach(k=>millNow.add(k));
  const X=c=>20+c*43, Y=r=>20+r*43;
  let svg=`<svg class="mo-svg" viewBox="0 0 298 298">`;
  for(const m of MILLS){ const a=PT[m[0]], c=PT[m[2]]; svg+=`<line x1="${X(a[0])}" y1="${Y(a[1])}" x2="${X(c[0])}" y2="${Y(c[1])}" class="mo-l ${m.every(k=>millNow.has(k)&&v.b[k]===v.b[m[0]])?'mill':''}"/>`; }
  PT.forEach(([c,r],i)=>{ const x=v.b[i], last=v.last&&(v.last.to===i||v.last.from===i), remd=v.last&&v.last.rem===i;
    const cls=['mo-pt', targets.has(i)&&x<0?'tgt':'', rems.has(i)?'rem':'', movable.has(i)&&!pend?'can':'', sel===i?'sel':'', last?'last':'', remd?'gone':''].join(' ');
    svg+=`<g class="${cls}" data-i="${i}"><circle cx="${X(c)}" cy="${Y(r)}" r="15" class="hit"/>${x>=0?`<circle cx="${X(c)}" cy="${Y(r)}" r="12" class="mo-p p${x}"/>`:`<circle cx="${X(c)}" cy="${Y(r)}" r="${targets.has(i)?6:4}" class="dot"/>`}${remd&&x<0?`<text x="${X(c)}" y="${Y(r)+5}" class="x">✕</text>`:''}</g>`; });
  svg+=`</svg>`;
  const hand=p=>`<span class="mo-hand">${'●'.repeat(v.hand[p])}</span>`;
  let h=`<div class="info">손에 남은 말 · 나 ${hand(me)} ${v.hand[me]} · 상대 ${v.hand[1-me]}</div>${svg}`;
  if(my) h+=`<div class="info">${pend?'🎯 <b>밀 완성!</b> 없앨 상대 말(빨간 테두리)을 누르세요':placing?'빈 점을 눌러 말을 놓으세요':flying?'🕊️ 말이 3개뿐이라 <b>아무 빈 점으로 날 수 있어요</b>':'움직일 말을 누르고, 선으로 이어진 옆 빈 점을 누르세요'}</div>`;
  h+=`<div class="info">판 위 · 나 <b>${cnt(v.b,me)}</b> : 상대 <b>${cnt(v.b,1-me)}</b>${v.quiet>=30?` · ${QUIET-v.quiet}수 안에 아무도 못 없애면 무승부`:''}</div>`;
  el.innerHTML=h;
  el.onclick=e=>{
    const g=e.target.closest('[data-i]'); if(!g||!ctx.myTurn) return; const i=+g.dataset.i;
    if(pend){ if(rems.has(i)){ const a={k:'move',from:pend.from,to:pend.to,rem:i}; pend=null; sel=null; return ctx.act(a); } ctx.tip('없앨 상대 말을 누르세요 (밀 안의 말은 다른 말이 없을 때만)'); return; }
    if(targets.has(i) && v.b[i]<0){ const from=placing?null:sel; const ms=L.filter(m=>m.from===from&&m.to===i);
      if(ms.length===1) { sel=null; return ctx.act({k:'move',from,to:i,rem:ms[0].rem}); }
      if(ms.length>1){ pend={from,to:i}; return ctx.rerender(); } }
    if(movable.has(i)){ sel = sel===i?null:i; return ctx.rerender(); }
    if(v.b[i]===me && !placing) ctx.tip('그 말은 움직일 곳이 없어요');
    sel=null; ctx.rerender();
  };
}
const guide=`
<p>세 겹 사각형 위 <b>24개 점</b>에서 하는 고대 전략 게임. 한 줄에 내 말 3개 = <b>밀</b>을 만들어 상대 말을 하나씩 없애요.</p>
<ul><li><b>① 놓기</b>: 각자 9개를 번갈아 빈 점에 하나씩 놓아요.</li>
<li><b>② 옮기기</b>: 다 놓으면 선을 따라 <b>옆 빈 점으로 한 칸</b>씩.</li>
<li><b>③ 날기</b>: 내 말이 3개만 남으면 <b>아무 빈 점으로</b> 날아갈 수 있어요.</li>
<li>밀을 <b>새로</b> 만들 때마다 상대 말 하나를 없애요. 밀 안에 있는 말은 다른 말이 없을 때만 없앨 수 있어요.</li>
<li>상대 말이 <b>2개 이하</b>가 되거나 <b>움직일 수 없으면</b> 승리. 옮기기 단계에서 60수 동안 아무도 못 없애면 무승부.</li></ul>
<div class="tipbox">💡 <b>팁</b><br>· 밀을 열었다 닫았다 할 수 있는 "방앗간" 모양을 만들면 매 턴 하나씩 없앨 수 있어요.<br>· 놓기 단계에서 교차점(가운데 십자 4곳)이 움직이기 좋아요.<br>· 상대가 두 개 놓은 줄은 바로 막으세요!</div>`;
window.GAMES.morris = {
  title:'모리스', ref:'데블스 플랜 「나인 멘스 모리스」', emoji:'⭕', tags:['전략','클래식','추상','두뇌서바이벌'],
  pulse:v=>(cnt(v.b,1)+v.hand[1])-(cnt(v.b,0)+v.hand[0]), pulseStep:1,
  tagline:'한 줄에 셋을 맞추면 상대 말을 하나 없앤다. 놓기·옮기기·날기 3단계의 고전 전략 게임.',
  guide, init, apply, ai, local:true, render,
  reset(){ sel=null; pend=null; },
  status:(v,ctx)=>ctx.turnText(v)+(ctx.myTurn?(pend?' · 없앨 말을 고르세요':v.hand[ctx.me]>0?' · 말을 놓으세요':' · 말을 옮기세요'):''),
  bar:(v,i)=>`<span class="ck-chip p${i}"></span><span class="score">${cnt(v.b,i)}${v.hand[i]?` <small>+손 ${v.hand[i]}</small>`:''}</span>`,
};
})();
