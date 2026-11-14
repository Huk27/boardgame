(function(){
'use strict';
/* 과일 종 치기: 과일 카드 56장(4가지 과일 × 1~5개)을 반씩 나눠 뒷면으로 쌓아 둠.
   번갈아 한 장씩 뒤집어 내 앞에 펼침. 펼쳐진 맨 위 카드들에서 같은 과일이 딱 5개면 먼저 🔔 친 사람이 펼친 카드를 전부 가져감.
   5개가 아닐 때 치면 벌칙으로 상대에게 1장. 뒤집을 차례에 카드가 없으면 패배. 160번 뒤집으면 카드 많은 쪽 승. */
const FRUITS=['🍓','🍌','🍇','🍋'], COUNTS=[1,1,1,1,1,2,2,2,3,3,3,4,4,5], MAXFLIPS=160;
function newDeck(){ const d=[]; for(let f=0;f<4;f++) for(const n of COUNTS) d.push({f,n}); return U.shuffle(d); }
function init(starter){ const d=newDeck(); return {deck:[d.slice(0,28),d.slice(28)], pile:[[],[]], flipper:starter, fiveAt:null, ring:null, flips:0, turn:null, starter, winner:null, ev:0}; }
const tops=s=>[s.pile[0][s.pile[0].length-1], s.pile[1][s.pile[1].length-1]];
function sums(s){ const t=[0,0,0,0]; for(const c of tops(s)) if(c) t[c.f]+=c.n; return t; }
const isFive=s=>sums(s).includes(5);
const cardsOf=(s,p)=>s.deck[p].length+s.pile[p].length;
function endByCount(s){ const a=cardsOf(s,0), b=cardsOf(s,1); s.winner=a>b?0:b>a?1:'draw'; }
// 뒤집을 차례인데 더미가 비었고 칠 종도 없으면 그 자리에서 패배
function stuck(s){ if(s.winner==null && !s.fiveAt && !s.deck[s.flipper].length) s.winner=1-s.flipper; }
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(!a) return '알 수 없는 동작';
  if(a.k==='flip'){
    if(s.flipper!==p) return '상대가 뒤집을 차례예요';
    if(!s.deck[p].length){ s.winner=1-p; return null; }
    s.pile[p].push(s.deck[p].pop()); s.flips++; s.flipper=1-p; s.ev++;
    s.fiveAt = isFive(s) ? Date.now() : null;
    if(s.flips>=MAXFLIPS && !s.fiveAt) endByCount(s);
    stuck(s); return null;
  }
  if(a.k==='ring'){
    const o=1-p;
    // 한발 늦은 손: 상대가 방금(0.7초 안) 종을 쳐서 가져갔으면 벌칙 없이 무시 (친구 쪽 인터넷 지연 포함)
    if(!isFive(s) && s.ring && s.ring.ok && s.ring.p!==p && Date.now()-(s.ring.at||0)<700){ s.ring.late=p; s.ev++; return null; }
    s.ev++;
    if(isFive(s)){
      const got=[...s.pile[0],...s.pile[1]]; s.pile=[[],[]];
      s.deck[p].unshift(...U.shuffle(got));   // 가져간 카드는 내 더미 맨 아래로
      s.ring={p, ok:true, n:got.length, ms: s.fiveAt ? Date.now()-s.fiveAt : null, at:Date.now()}; s.fiveAt=null; s.flipper=p;
      if(s.flips>=MAXFLIPS) endByCount(s);
      stuck(s); return null;
    }
    // 헛손질: 벌칙 1장
    let paid=0; if(s.deck[p].length){ s.deck[o].unshift(s.deck[p].pop()); paid=1; } else if(s.pile[p].length){ s.deck[o].unshift(s.pile[p].shift()); paid=1; }
    s.ring={p, ok:false, n:paid};
    if(!cardsOf(s,p)) s.winner=o;
    stuck(s); return null;
  }
  return '알 수 없는 동작';
}
function mask(s,p){ const v=U.clone(s); v.deck=[s.deck[0].length, s.deck[1].length]; return v; }   // 뒷면 더미 순서는 비밀 (장수만)

/* 컴퓨터: 다섯이 되면 반응 시간 뒤에 종을 침 (쉬움 1.2~2.3초, 보통 0.75~1.45초, 어려움 0.5~0.9초), 가끔 아예 놓침.
   쉬움·보통은 가끔 헷갈려서 4나 6일 때 헛손질. 자기 차례면 자기 박자로 뒤집음. */
let react={at:null, ms:0}, fakeAt=-1;
function ai(v,lvl=1){
  if(v.winner!=null) return null;
  const five=sums(v).includes(5);
  if(five && v.fiveAt){
    if(react.at!==v.fiveAt){ const miss=Math.random()<[.25,.12,.05][lvl];   // 사람처럼 가끔 아예 못 봄
      react={at:v.fiveAt, ms: miss ? 1e9 : [[1200,1100],[750,700],[480,450]][lvl].reduce((a,b)=>a+Math.random()*b)}; }
    if(Date.now()-v.fiveAt >= react.ms){ say(U.pick(['앗싸!','내 거!','🔔🔔']),.45); return {k:'ring'}; }
    if(react.ms<1e9) return null;   // 보고 있음 → 곧 침
    // 못 봤으면 평소 박자로 그냥 뒤집음
    if(v.flipper===1 && Date.now()-v.fiveAt>700) return {k:"flip"};   // 더미가 비었으면 이걸로 패배
    return null;
  }
  // 헛손질: 같은 과일이 4나 6일 때 가끔
  const near=sums(v).some(x=>x===4||x===6);
  if(near && v.ev!==fakeAt){ fakeAt=v.ev; if(Math.random()<[.12,.04,0][lvl]){ say(U.pick(['앗 아닌가?','어… 잘못 쳤다 😅']),1); return {k:'ring'}; } }
  if(v.flipper===1) return {k:"flip"};
  return null;
}
function say(t,p){ if(typeof showSay==='function' && Math.random()<p) setTimeout(()=>showSay(1,t,2200),150); }
function aiDelay(s){
  if(s.winner!=null) return 1000;
  if(isFive(s)) return 120;                       // 다섯이면 계속 지켜봄
  if(s.flipper===1) return 650+Math.random()*700; // 내 박자로 뒤집기
  return 300;                                     // 상대가 뒤집길 기다리며 지켜봄
}

/* 화면 */
let lastEv=-1, C=null, V=null;
const cardHTML=c=> c ? `<div class="bl-card f${c.f}">${Array(c.n).fill(FRUITS[c.f]).map(x=>`<span>${x}</span>`).join('')}</div>` : `<div class="bl-card empty"></div>`;
function render(el,v,ctx){
  C=ctx; V=v;
  const me=ctx.me, o=1-me, who=i=> i===me&&ctx.mode!=='local' ? '나' : U.esc(ctx.name(i));
  const fresh=v.ev!==lastEv; lastEv=v.ev;
  const T=tops(v), canFlip=v.winner==null && (ctx.mode==='local' || v.flipper===me) && ctx.can!==false;
  let h=`<div class="info">뒤집은 횟수 ${v.flips} / ${MAXFLIPS} · 남은 카드 ${who(me)} <b>${v.deck[me]+v.pile[me].length}</b> : ${who(o)} <b>${v.deck[o]+v.pile[o].length}</b></div>`;
  const R=v.ring;
  if(R && fresh) ctx.sfx(R.ok ? (R.p===me?'score':'bad') : (R.p===me?'bad':'tap'));
  h+=`<div class="bl-msg ${R&&fresh?'pop':''}">${R ? (R.ok ? `🔔 ${who(R.p)} 땡! 카드 ${R.n}장 가져감${R.ms!=null?` <small>(${(R.ms/1000).toFixed(2)}초)</small>`:''}${R.late!=null?` · ${who(R.late)} 한발 늦음!`:''}` : `❌ ${who(R.p)} 헛손질! 벌칙 ${R.n}장`) : '같은 과일이 딱 5개면 🔔!'}</div>`;
  h+=`<div class="bl-table">
    <div class="bl-side"><small>${who(o)} · 더미 ${v.deck[o]}장</small>${cardHTML(T[o])}</div>
    <button class="bl-bell" data-a="ring" ${v.winner!=null?'disabled':''}>🔔</button>
    <div class="bl-side">${cardHTML(T[me])}<small>${who(me)} · 더미 ${v.deck[me]}장</small></div></div>`;
  if(v.winner==null){
    if(ctx.mode==='local') h+=`<div class="fh-act"><button data-a="flip">🂠 ${who(v.flipper)} 뒤집기</button></div>`;
    else h+=`<div class="fh-act"><button data-a="flip" ${canFlip?'':'disabled'}>${canFlip?'🂠 뒤집기 (F)':`${who(v.flipper)} 뒤집는 중…`}</button><small class="muted">종: 스페이스바 또는 🔔 누르기</small></div>`;
  }
  el.innerHTML=h;
  // 종은 누르는 순간 울림 (폰에서 손 뗄 때까지 기다리지 않게). 키보드로 버튼을 누른 클릭(detail 0)만 따로 받음
  const bb=el.querySelector('.bl-bell'); if(bb) bb.onpointerdown=e=>{ if(bb.disabled) return; e.preventDefault(); ring(); };
  el.onclick=e=>{ const b=e.target.closest('[data-a]'); if(!b||b.disabled) return; if(b.dataset.a==='ring'){ if(e.detail===0) ring(); } else if(b.dataset.a==='flip') ctx.act({k:'flip'}); };
}
function ring(){ if(!C||!V||V.winner!=null) return; C.act({k:'ring'}); }
// 키보드: 스페이스 = 종, F = 뒤집기 (빙고·채팅 입력 중엔 무시)
document.addEventListener('keydown',e=>{
  if(!C||!V||V.winner!=null) return;
  const area=document.getElementById('area'); if(!area||area.dataset.game!=='bell'||document.getElementById('play').hidden) return;
  const tg=e.target; if(tg&&(tg.tagName==='INPUT'||tg.tagName==='TEXTAREA')) return;
  if(e.code==='Space'){ e.preventDefault(); ring(); }
  else if(e.key==='f'||e.key==='F'||e.key==='ㄹ'){ if(V.flipper===C.me) C.act({k:'flip'}); }
});
function status(v,ctx){
  if(v.winner!=null) return '';
  return isFive(v) ? '🔔 지금이야! 같은 과일 5개!' : (v.flipper===ctx.me ? '내가 뒤집을 차례 (F)' : `${ctx.name(v.flipper)} 뒤집는 중…`);
}
const guide=`
<p>과일 카드를 번갈아 한 장씩 뒤집다가, 펼쳐진 카드에서 <b>같은 과일이 딱 5개</b>가 되면 먼저 <b>🔔 종</b>을 치세요! 빠른 사람이 펼쳐진 카드를 다 가져가요.</p>
<ul><li>각자 28장을 뒷면으로 쌓아 두고 시작. 내 차례에 <b>뒤집기</b>(키보드 F).</li>
<li>보이는 카드는 <b>각자 맨 위 한 장씩</b>, 그 두 장의 과일을 더해요. 예) 🍓🍓 + 🍓🍓🍓 = 딸기 5개 → 🔔!</li>
<li>종은 아무 때나(키보드 <b>스페이스바</b>). 5개가 아닐 때 치면 <b>벌칙으로 상대에게 1장</b>.</li>
<li>종을 쳐서 가져간 사람이 다음에 먼저 뒤집어요.</li>
<li>뒤집을 차례에 카드가 없으면 패배. 160번 뒤집으면 카드가 많은 쪽이 승리.</li></ul>
<div class="tipbox">💡 <b>팁</b><br>
· 과일 종류별로 숫자를 세 두면 빨라요. 4나 6일 때 헷갈리지 않게!<br>
· 컴퓨터 반응 속도: 😊쉬움 1.2~2.3초 · 🙂보통 0.75~1.45초 · 😈어려움 0.5~0.9초. 가끔 다섯을 못 보고 놓치기도 하고, 쉬움·보통은 헛손질도 해요.<br>
· 친구랑 할 땐 인터넷 지연이 조금 있어서, 거의 동시에 치면 방장이 살짝 유리할 수 있어요.</div>`;
window.GAMES.bell = {
  title:'과일 종 치기', ref:'할리갈리', emoji:'🔔', tags:['스피드','반응','카드'],
  pulse:v=>(v.deck[1]+v.pile[1].length)-(v.deck[0]+v.pile[0].length), pulseStep:6,
  tagline:'같은 과일이 딱 5개면 종을 쳐라! 반응 속도 카드 게임.',
  guide, init, apply, mask, ai, aiDelay, render, status,
  reset(){ lastEv=-1; react={at:null,ms:0}; fakeAt=-1; },
  bar:(v,i)=>`<span class="score">${v.deck[i]+v.pile[i].length}</span><span class="tag">장</span>`,
  result:(v,ctx)=>`카드 ${v.deck[ctx.me]+v.pile[ctx.me].length} : ${v.deck[1-ctx.me]+v.pile[1-ctx.me].length}`,
};
})();
