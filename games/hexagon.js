(function(){
'use strict';
/* 헥사곤 (자체 규칙 — 원작은 "기억력과 연산"이 필요한 결승 게임이라는 것만 알려져 있어요)
   육각형 19칸에 1~9 숫자. 30초 동안 외운 뒤 숫자가 가려짐.
   라운드마다 목표 수가 나오면, 차례대로 "한 줄로 이어진 3칸"을 골라 합이 목표와 같으면 1점(그 줄은 계속 보임).
   틀리면 고른 3칸이 잠깐 보였다가 다시 가려지고 상대 차례. 둘 다 틀리거나 넘기면 새 목표.
   5점 먼저 또는 목표 9개가 끝났을 때 점수가 많은 사람이 승리. */
const CELLS=[]; for(let q=-2;q<=2;q++) for(let r=-2;r<=2;r++) if(Math.abs(q+r)<=2) CELLS.push([q,r]);
const IDX=new Map(CELLS.map(([q,r],i)=>[q+','+r,i]));
const LINES=[]; for(const [q,r] of CELLS) for(const [dq,dr] of [[1,0],[0,1],[1,-1]]){ const a=IDX.get(q+','+r), b=IDX.get((q+dq)+','+(r+dr)), c=IDX.get((q+2*dq)+','+(r+2*dr)); if(b!=null&&c!=null) LINES.push([a,b,c]); }
const WIN=5, TARGETS=9, MEMO=30000;
const lkey=l=>l.slice().sort((a,b)=>a-b).join(',');
function init(starter){
  const nums=CELLS.map(()=>1+(Math.random()*9|0));
  const s={nums, seed:Math.random(), phase:'memo', ready:[false,false], score:[0,0], used:[], target:null, tgtN:0, tries:0, starter, turn:null, winner:null, shown:null, hist:[], memoUntil:null};
  return s;
}
function newTarget(s){
  if(s.tgtN>=TARGETS || s.score.some(x=>x>=WIN)){ return finish(s); }
  const free=LINES.filter(l=>!s.used.includes(lkey(l))); if(!free.length) return finish(s);
  // 답이 적은 목표를 좋아함 (너무 쉬우면 재미없음)
  const sums={}; for(const l of free){ const t=l.reduce((a,i)=>a+s.nums[i],0); sums[t]=(sums[t]||0)+1; }
  const ks=Object.keys(sums).map(Number); const pick=U.pick(ks.filter(k=>sums[k]<=2).length?ks.filter(k=>sums[k]<=2):ks);
  s.target=pick; s.tgtN++; s.tries=0; s.phase='play'; s.turn=(s.starter+s.tgtN-1)%2; s.shown=null;
}
function finish(s){ s.phase='over'; s.turn=null; s.winner = s.score[0]>s.score[1]?0 : s.score[1]>s.score[0]?1 : 'draw'; }
function isLine(cells){ const k=lkey(cells); return LINES.some(l=>lkey(l)===k); }
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(!a) return '알 수 없는 동작';
  if(a.k==='ready'){ if(s.phase!=='memo') return null; s.ready[p]=true; if(s.ready.every(Boolean)){ newTarget(s); } return null; }
  if(s.phase!=='play'||s.turn!==p) return '상대 차례예요';
  if(a.k==='pass'){ s.hist.push({p,t:s.target,pass:true}); s.tries++; afterMiss(s,p); return null; }
  if(a.k!=='pick'||!Array.isArray(a.cells)||a.cells.length!==3) return '3칸을 고르세요';
  const cells=a.cells.map(x=>x|0); if(new Set(cells).size!==3||cells.some(i=>!(i>=0&&i<19))) return '3칸을 고르세요';
  if(!isLine(cells)) return '한 줄로 이어진 3칸이어야 해요';
  if(s.used.includes(lkey(cells))) return '이미 맞힌 줄이에요';
  const sum=cells.reduce((x,i)=>x+s.nums[i],0), ok=sum===s.target;
  s.hist.push({p,t:s.target,cells,sum,ok}); s.shown={cells,ok,sum,p};
  if(ok){ s.score[p]++; s.used.push(lkey(cells)); s.phase='show'; s.after='next'; s.turn=null; return null; }
  s.tries++; s.phase='show'; s.after='miss'; s.missBy=p; s.turn=null; return null;
}
function afterMiss(s,p){ if(s.tries>=2){ s.shown=s.shown; newTarget(s); } else { s.phase='play'; s.turn=1-p; } }
function stepDelay(s){ if(s.winner!=null) return null; if(s.phase==='show') return 2600; if(s.phase==='memo') return null; return null; }
function step(s){ if(s.phase==='show'){ const a=s.after; s.after=null; s.shown=s.shown&&s.shown.ok?null:null; if(a==='next') newTarget(s); else afterMiss(s,s.missBy); } }
function mask(s){
  const v=U.clone(s);
  if(s.phase!=='memo'&&s.phase!=='over'){ const vis=new Set(); for(const k of s.used) k.split(',').forEach(i=>vis.add(+i)); if(s.shown) s.shown.cells.forEach(i=>vis.add(i)); v.nums=s.nums.map((n,i)=>vis.has(i)?n:null); }
  return v;
}
/* 컴퓨터: 기억이 흐릿함 — 난이도별로 맞게 기억할 확률이 다름, 본 숫자는 기억을 고침 */
let MEM=null;
function memory(v,lvl){
  if(!MEM||MEM.seed!==v.seed){ MEM={seed:v.seed, m:[], seen:0}; }
  if(!MEM.m.length && v.phase!=='memo'){ /* 외우는 단계에서 본 숫자를 흐릿하게 */ }
  return MEM;
}
function learn(v,lvl){
  const M=memory(v,lvl), acc=[.5,.72,.9][lvl];
  if(v.phase==='memo' && !M.m.length && v.nums.every(n=>n!=null)) M.m=v.nums.map(n=> Math.random()<acc ? n : Math.random()<.5 ? null : Math.max(1,Math.min(9,n+(Math.random()<.5?-1:1)*(1+(Math.random()*2|0)))));
  if(v.phase!=='memo') v.nums.forEach((n,i)=>{ if(n!=null && M.m.length) M.m[i]=n; });   // 뒤집혀 보인 숫자는 기억에 반영
  return M;
}
function ai(v,lvl=1){
  const M=learn(v,lvl);
  if(v.phase==='memo') return v.ready[1]?null:{k:'ready'};
  if(v.phase!=='play'||v.turn!==1) return null;
  const free=LINES.filter(l=>!v.used.includes(lkey(l)));
  const cand=free.filter(l=>l.every(i=>M.m[i]!=null) && l.reduce((a,i)=>a+M.m[i],0)===v.target);
  if(cand.length) return {k:'pick',cells:U.pick(cand)};
  const near=free.filter(l=>l.filter(i=>M.m[i]==null).length===1 && (()=>{ const s=l.reduce((a,i)=>a+(M.m[i]||0),0), need=v.target-s; return need>=1&&need<=9; })());
  if(near.length && Math.random()<[.35,.5,.6][lvl]) return {k:'pick',cells:U.pick(near)};   // 한 칸은 감으로
  return {k:'pass'};
}
// 외우는 단계에서도 컴퓨터가 숫자를 보도록: mask 전 원본으로 학습
function aiDelay(v){ return v.phase==='memo' ? 8000+Math.random()*8000 : 1800+Math.random()*2400; }

/* 화면 */
let sel=[], sig='';
function render(el,v,ctx){
  const my=ctx.myTurn&&v.phase==='play', me=ctx.me;
  const sg=v.phase+':'+v.tgtN+':'+v.turn; if(sg!==sig){ sig=sg; sel=[]; }
  const usedCells=new Set(); for(const k of v.used) k.split(',').forEach(i=>usedCells.add(+i));
  const shownSet=new Set(v.shown?v.shown.cells:[]);
  const sz=30, X=(q,r)=>150+sz*1.5*q, Y=(q,r)=>150+sz*Math.sqrt(3)*(r+q/2);
  const hexP=(cx,cy)=>[...Array(6)].map((_,k)=>{ const a=Math.PI/3*k; return `${(cx+sz*.95*Math.cos(a)).toFixed(1)},${(cy+sz*.95*Math.sin(a)).toFixed(1)}`; }).join(' ');
  let svg=`<svg class="hx-svg" viewBox="0 0 300 300">`;
  CELLS.forEach(([q,r],i)=>{ const n=v.nums[i], cx=X(q,r), cy=Y(q,r);
    const cls=['hx-c', sel.includes(i)?'sel':'', usedCells.has(i)?'used':'', shownSet.has(i)?(v.shown.ok?'ok':'no'):'', n==null?'hid':''].join(' ');
    svg+=`<g class="${cls}" data-i="${i}"><polygon points="${hexP(cx,cy)}"/><text x="${cx}" y="${cy+7}">${n==null?'?':n}</text></g>`; });
  svg+=`</svg>`;
  let h='';
  if(v.phase==='memo') h+=`<div class="hl-notice">🧠 숫자를 외우세요! 둘 다 "외웠어요"를 누르면 숫자가 가려져요</div>`;
  else if(v.phase!=='over') h+=`<div class="hx-target">🎯 목표 <b>${v.target}</b> <small>${v.tgtN}/${TARGETS}번째 · ${v.tries?'두 번째 기회':'첫 기회'}</small></div>`;
  if(v.shown) h+=`<div class="hl-notice">${v.shown.ok?'⭕ 정답!':'❌ 틀렸어요'} ${v.shown.cells.map(i=>v.nums[i]??'?').join(' + ')} = ${v.shown.sum}</div>`;
  h+=svg;
  if(v.phase==='memo' && !v.ready[me]) h+=`<div class="fh-act"><button data-a="ready">다 외웠어요</button></div>`;
  else if(v.phase==='memo') h+=`<div class="info">상대가 외우는 중…</div>`;
  if(my) h+=`<div class="fh-act"><button data-a="pick" ${sel.length===3&&isLine(sel)?'':'disabled'}>이 3칸으로 (${sel.length}/3)</button><button class="ghost" data-a="clear">다시 고르기</button><button class="ghost" data-a="pass">넘기기</button></div><div class="info">${sel.length===3&&!isLine(sel)?'⚠️ 한 줄(일직선)로 이어진 3칸이 아니에요':`한 줄로 이어진 3칸을 눌러 합이 ${v.target}이(가) 되게!`}</div>`;
  h+=`<div class="info">점수 · 나 <b>${v.score[me]}</b> : 상대 <b>${v.score[1-me]}</b> (${WIN}점 먼저)</div>`;
  if(v.hist.length) h+=`<details class="hl-log" open><summary>기록</summary>${v.hist.slice(-8).reverse().map(x=>`<div>${x.p===me?'나':'상대'} · 목표 ${x.t} → ${x.pass?'넘김':`${x.sum} ${x.ok?'⭕':'❌'}`}</div>`).join('')}</details>`;
  el.innerHTML=h;
  el.onclick=e=>{
    const a=e.target.closest('[data-a]'); if(a&&!a.disabled){ const k=a.dataset.a;
      if(k==='ready') return ctx.act({k:'ready'}); if(k==='pass') return ctx.act({k:'pass'}); if(k==='clear'){ sel=[]; return ctx.rerender(); }
      if(k==='pick'){ if(!isLine(sel)){ ctx.tip('한 줄로 이어진 3칸이어야 해요'); return; } const c=sel; sel=[]; return ctx.act({k:'pick',cells:c}); } }
    const g=e.target.closest('[data-i]'); if(!g||!my) return; const i=+g.dataset.i;
    if(usedCells.has(i)&&!sel.includes(i)) { /* 맞힌 줄의 칸도 다른 줄에 쓸 수 있음 */ }
    sel = sel.includes(i) ? sel.filter(x=>x!==i) : sel.length<3 ? sel.concat(i) : [i];
    ctx.rerender();
  };
}
const guide=`
<p>육각형 19칸의 숫자를 <b>외우고</b>, 가려진 뒤 <b>계산</b>해서 맞히는 기억력·연산 대결. <small>(원작 결승 「헥사곤」은 "기억력과 연산"이 필요한 게임이라는 것만 알려져 있어서, 그 느낌으로 만든 자체 규칙이에요)</small></p>
<ul><li>처음에 1~9 숫자가 모두 보여요. 둘 다 "다 외웠어요"를 누르면 가려져요.</li>
<li>라운드마다 <b>🎯 목표 수</b>가 나와요. 차례인 사람은 <b>한 줄로 이어진 3칸</b>(육각형의 세 방향 중 하나로 일직선)을 골라요.</li>
<li>세 숫자의 합이 목표와 같으면 <b>1점</b>, 그 줄의 숫자는 계속 보여요. 틀리면 고른 3칸이 잠깐 보였다가 다시 가려지고 상대에게 기회가 넘어가요.</li>
<li>둘 다 틀리거나 넘기면 새 목표. <b>${WIN}점 먼저</b> 또는 목표 ${TARGETS}개가 끝났을 때 점수가 많은 쪽이 승리.</li></ul>
<div class="tipbox">💡 <b>팁</b><br>· 상대가 틀릴 때 잠깐 보이는 숫자도 기억하세요. 다음 목표의 단서가 돼요.<br>· 컴퓨터도 기억이 흐릿해요(쉬움일수록). 가끔 틀린 숫자로 기억하고 있어요!</div>`;
window.GAMES.hexagon = {
  title:'헥사곤', ref:'데블스 플랜 「헥사곤」', emoji:'⬢', tags:['기억력','연산','두뇌서바이벌'],
  tagline:'육각형 19칸의 숫자를 외워라. 가려진 판에서 합이 목표가 되는 한 줄을 찾는 기억력·연산 대결.',
  guide, init, apply, mask, ai, aiDelay, render, step, stepDelay, local:true,
  reset(){ sel=[]; sig=''; MEM=null; },
  status:(v,ctx)=> v.phase==='memo' ? '숫자를 외우세요' : v.phase==='show' ? '확인 중…' : ctx.turnText(v),
  bar:(v,i)=>`<span class="score">${v.score[i]}점</span>`,
};
})();
