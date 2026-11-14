(function(){
'use strict';
/* 숨은 함대 찾기: 8×8 바다에 배 4척(4·3·3·2칸)을 숨기고 번갈아 한 칸씩 포격. 상대 배를 모두 먼저 침몰시키면 승리. */
const N=8, LENS=[4,3,3,2], NAMES={4:'전함',3:'순양함',2:'구축함'};
function randomFleet(){
  for(;;){
    const used=new Set(), ships=[]; let ok=true;
    for(const len of LENS){
      let placed=false;
      for(let t=0;t<200&&!placed;t++){
        const hz=Math.random()<.5, r=Math.random()*(hz?N:N-len+1)|0, c=Math.random()*(hz?N-len+1:N)|0;
        const cells=[]; for(let k=0;k<len;k++) cells.push(hz? r*N+c+k : (r+k)*N+c);
        if(cells.some(i=>used.has(i))) continue;
        cells.forEach(i=>used.add(i)); ships.push({len,cells}); placed=true;
      }
      if(!placed){ ok=false; break; }
    }
    if(ok) return ships;
  }
}
function init(starter){
  return {phase:'setup', ships:[randomFleet(),randomFleet()], ready:[false,false], shots:[[],[]], turn:null, starter, winner:null, last:null};
}
const shotSet=(s,p)=>new Set(s.shots[p].map(x=>x.i));
const sunk=(s,o,ship)=>{ const hit=shotSet(s,1-o); return ship.cells.every(i=>hit.has(i)); };
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(!a) return '알 수 없는 동작';
  if(a.k==='shuffle'){ if(s.phase!=='setup'||s.ready[p]) return '이미 확정했어요'; s.ships[p]=randomFleet(); return null; }
  if(a.k==='ready'){ if(s.phase!=='setup') return null; s.ready[p]=true; if(s.ready[0]&&s.ready[1]){ s.phase='play'; s.turn=s.starter; } return null; }
  if(a.k==='shoot'){
    if(s.phase!=='play') return '아직 배치 중이에요';
    if(s.turn!==p) return '상대 차례예요';
    const i=a.i|0; if(!(i>=0&&i<N*N)) return '바다를 고르세요';
    if(shotSet(s,p).has(i)) return '이미 쏜 곳이에요';
    const o=1-p, ship=s.ships[o].find(sh=>sh.cells.includes(i));
    s.shots[p].push({i, hit:!!ship});
    const sank = ship && sunk(s,o,ship) ? ship.len : 0;
    s.last={p,i,hit:!!ship,sank};
    if(s.ships[o].every(sh=>sunk(s,o,sh))){ s.winner=p; s.turn=null; return null; }
    s.turn=o; return null;
  }
  return '알 수 없는 동작';
}
function mask(s,p){
  const v=U.clone(s), o=1-p;
  if(s.winner==null) v.ships[o]=s.ships[o].filter(sh=>sunk(s,o,sh));   // 상대 배는 침몰한 것만 보임
  v.left=[0,1].map(q=>s.ships[q].filter(sh=>!sunk(s,q,sh)).map(sh=>sh.len));
  return v;
}

/* 컴퓨터: 남은 배가 놓일 수 있는 모든 자리를 세어 가장 그럴듯한 칸을 쏨 (맞힌 칸 주변 가중) */
function ai(v){
  const me=1, o=0;
  if(v.phase==='setup') return v.ready[me] ? null : {k:'ready'};
  if(v.turn!==me) return null;
  const shots=v.shots[me], miss=new Set(shots.filter(x=>!x.hit).map(x=>x.i));
  const sunkCells=new Set(v.ships[o].flatMap(sh=>sh.cells));
  const openHits=shots.filter(x=>x.hit && !sunkCells.has(x.i)).map(x=>x.i);
  const shot=new Set(shots.map(x=>x.i));
  const score=Array(N*N).fill(0);
  for(const len of v.left[o]){
    for(let r=0;r<N;r++) for(let c=0;c<N;c++) for(const hz of [true,false]){
      if(hz? c+len>N : r+len>N) continue;
      const cells=[]; for(let k=0;k<len;k++) cells.push(hz? r*N+c+k : (r+k)*N+c);
      if(cells.some(i=>miss.has(i)||sunkCells.has(i))) continue;
      const covers=cells.filter(i=>openHits.includes(i)).length;
      const w = openHits.length ? (covers ? 1+covers*30 : 1) : 1;
      for(const i of cells) if(!shot.has(i)) score[i]+=w;
    }
  }
  // 사람처럼: 사냥 중이 아닐 땐 가끔 감으로 아무 데나 (체스판 무늬 위주)
  if(!openHits.length && Math.random()<.25){ const free=[...Array(N*N).keys()].filter(i=>!shot.has(i) && ((i/N|0)+i%N)%2===0); if(free.length) return {k:'shoot', i:U.pick(free)}; }
  let best=-1, bs=-1;
  for(let i=0;i<N*N;i++){ if(shot.has(i)) continue; const sc=score[i]+Math.random()*.5; if(sc>bs){ bs=sc; best=i; } }
  return {k:'shoot', i:best};
}

/* 화면 */
let lastSig='';
function grid(v,owner,ctx,big){
  const me=ctx.me, isMine=owner===me, shooter=1-owner;
  const shots=new Map(v.shots[shooter].map(x=>[x.i,x.hit]));
  const shipAt=new Map(); v.ships[owner].forEach((sh,k)=>sh.cells.forEach(i=>shipAt.set(i,sh)));
  const sunkSet=new Set(v.ships[owner].filter(sh=>sh.cells.every(i=>shots.has(i))).flatMap(sh=>sh.cells));
  const canShoot = !isMine && ctx.myTurn && v.phase==='play';
  let h=`<div class="fl-grid ${big?'big':'small'} ${canShoot?'aim':''}">`;
  for(let i=0;i<N*N;i++){
    const ship=shipAt.get(i), sh=shots.has(i), hit=shots.get(i);
    const last = v.last && v.last.i===i && v.last.p===shooter;
    let cls='', mark='';
    if(ship && (isMine || sunkSet.has(i))) cls+=' ship';
    if(sunkSet.has(i)) cls+=' sunk';
    if(sh){ cls+= hit?' hit':' miss'; mark = hit ? (sunkSet.has(i)?'🔥':'💥') : '•'; }
    if(last) cls+=' last';
    h+=`<div class="fl-c${cls}" data-i="${i}">${mark}</div>`;
  }
  return h+'</div>';
}
function render(el,v,ctx){
  const me=ctx.me, o=1-me;
  let h='';
  if(v.phase==='setup'){
    h+=`<div class="banner">내 함대 배치 · 배 4척(전함 4칸, 순양함 3칸 ×2, 구축함 2칸)</div>`;
    h+=grid(v,me,ctx,true);
    h+= v.ready[me] ? `<div class="info">${v.ready[o]?'':'상대가 배치하는 중…'}</div>`
       : `<div class="fh-act"><button class="ghost" data-a="shuffle">🔀 다시 섞기</button><button data-a="ready">⚓ 이대로 확정</button></div>`;
  } else {
    const L=v.last;
    let msg='';
    if(L){ const who = L.p===me && ctx.mode!=='local' ? '내' : `${ctx.name(L.p)}의`;
      msg = L.sank ? `${who} 포격 → 🔥 ${NAMES[L.sank]}(${L.sank}칸) 격침!` : L.hit ? `${who} 포격 → 💥 명중!` : `${who} 포격 → 🌊 풍덩… 빗나감`; }
    const sig=(L?L.p+':'+L.i:'')+v.shots[0].length+v.shots[1].length;
    const fresh = sig!==lastSig; lastSig=sig;
    if(fresh && L) ctx.sfx(L.sank?'win':L.hit?'score':'tap');
    h+=`<div class="banner ${L&&L.hit?'good':''} ${fresh?'fl-boom':''}">${msg||'상대 바다에서 쏠 곳을 누르세요'}</div>`;
    h+=`<div class="fl-label">🎯 ${U.esc(ctx.name(o))}의 바다 <small>남은 배: ${v.left[o].map(n=>`<span class="fl-ship">${'■'.repeat(n)}</span>`).join(' ')||'없음'}</small></div>`;
    h+=grid(v,o,ctx,true);
    h+=`<div class="fl-label">🛳️ 내 바다 <small>남은 배: ${v.left[me].map(n=>`<span class="fl-ship">${'■'.repeat(n)}</span>`).join(' ')||'없음'}</small></div>`;
    h+=grid(v,me,ctx,false);
  }
  el.innerHTML=h;
  el.onclick=e=>{
    const b=e.target.closest('[data-a]'); if(b){ ctx.act({k:b.dataset.a}); return; }
    const c=e.target.closest('.fl-grid.aim .fl-c'); if(!c) return;
    if(c.classList.contains('hit')||c.classList.contains('miss')){ ctx.tip('이미 쏜 곳이에요'); return; }
    ctx.act({k:'shoot', i:+c.dataset.i});
  };
}
function status(v,ctx){
  if(v.phase==='setup') return v.ready[ctx.me] ? '상대가 배치를 끝내길 기다리는 중…' : '배치를 확인하고 확정하세요';
  return ctx.turnText(v)+(ctx.myTurn?' · 상대 바다를 누르세요':'');
}
const guide=`
<p>8×8 바다에 서로 <b>배 4척</b>을 숨겨두고, 번갈아 상대 바다에 한 칸씩 포격해요. <b>상대 배를 모두 먼저 침몰</b>시키면 승리!</p>
<ul><li>배: 전함 4칸, 순양함 3칸 2척, 구축함 2칸 (가로나 세로로 놓임).</li>
<li>처음에 배가 무작위로 놓여요. 마음에 안 들면 <b>🔀 다시 섞기</b>, 좋으면 <b>⚓ 이대로 확정</b>.</li>
<li>포격 결과: 💥 명중 / 🌊 빗나감(•) / 🔥 격침 (배 전체가 맞으면 그 배가 드러나요).</li>
<li>명중해도 차례는 넘어가요. 한 번에 한 발씩.</li></ul>
<div class="tipbox">💡 <b>팁</b><br>
· 처음엔 체스판처럼 한 칸씩 건너뛰며 쏘면 2칸짜리 배도 놓치지 않아요.<br>
· 💥 명중하면 그 주변 상하좌우를 노려서 방향을 찾으세요.<br>
· 위쪽 '남은 배'를 보면 아직 찾아야 할 배의 길이를 알 수 있어요.</div>`;
window.GAMES.fleet = {
  title:'숨은 함대 찾기', ref:'배틀십', emoji:'🚢', tags:['추리','클래식','펜과종이'],
  pulse:v=>v.shots[1].filter(x=>x.hit).length - v.shots[0].filter(x=>x.hit).length, pulseStep:2,
  tagline:'서로의 바다에 숨긴 배 4척을 한 발씩 포격해서 먼저 다 침몰시키기.',
  guide, init, apply, mask, ai, render, status,
  aiDelay:s=> s.phase==='setup' ? 1500+Math.random()*1500 : 900+Math.random()*1400,
  reset(){ lastSig=''; },
  bar:(v,i)=>`<span class="tag">${v.phase==='setup'?(v.ready[i]?'⚓ 준비 완료':'배치 중'):`남은 배 ${v.left[i].length}척`}</span>`,
  result:(v,ctx)=>`명중 ${v.shots[ctx.me].filter(x=>x.hit).length}발 · ${v.shots[ctx.me].length}발 중`,
};
})();
