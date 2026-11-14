(function(){
'use strict';
/* 도둑잡기: 1~10 카드 두 장씩 + 도둑 1장. 처음 짝은 버리고 시작.
   차례마다 상대 손에서 (뒷면만 보고) 한 장 뽑기 → 짝이 맞으면 버림. 손이 먼저 비면 승리, 끝까지 도둑을 쥔 사람이 패배.
   내 손은 언제든 섞거나, 한 장을 슬쩍 올려 둘 수 있음(상대에게 올라온 것만 보임) → 심리전. */
const MAXV=10, THIEF=0;
function newDeck(){ const d=[]; let id=0; for(let v=1;v<=MAXV;v++){ d.push({v,id:id++}); d.push({v,id:id++}); } d.push({v:THIEF,id:id++}); return U.shuffle(d); }
function dropPairs(hand){ const seen=new Map(), out=[], gone=[]; for(const c of hand){ if(c.v!==THIEF && seen.has(c.v)){ const j=seen.get(c.v); out[j]=null; gone.push(c.v); seen.delete(c.v); } else { seen.set(c.v,out.length); out.push(c); } } return {hand:U.shuffle(out.filter(Boolean)), gone}; }
/* 👥 2~6명 (2026-11-12) — 자리 = 사람 수. 내 다음 사람(손이 남은) 손에서 뽑음, 손을 다 비우면 빠짐, 끝까지 도둑을 쥔 한 명이 패배 */
function init(starter,o){ const k=Math.max(2,Math.min(6,(o&&o.humans)||2)); starter=(starter|0)%k;
  const d=newDeck(), h=[...Array(k)].map(()=>[]); d.forEach((c,i)=>h[(i+starter+1)%k].push(c));   // 먼저 뽑는 사람이 한 장 적게
  const D=h.map(dropPairs);
  return {hand:D.map(x=>x.hand), up:Array(k).fill(null), pile:D.flatMap(x=>x.gone), turn:starter, starter, last:null, hist:[], winner:null, moves:0, fin:[], hs:[...Array(k).keys()]};
}
const NXT=(s,p)=>{ const k=s.hand.length; for(let d=1;d<k;d++){ const q=(p+d)%k; if(s.hand[q].length) return q; } return null; };   /* p 다음으로 손이 남은 사람 */
function prep(s,p,x){   // 컴퓨터가 뽑은 뒤 자기 손 정리: 섞기·올리기
  if(!x) return; const H=s.hand[p];
  if(x.shuffle) U.shuffle(H);
  s.up[p]=null;
  if(x.up && H.length>1){ const ti=H.findIndex(c=>c.v===THIEF); const idx = x.up==='thief' && ti>=0 ? ti : (()=>{ const c=H.map((c,i)=>i).filter(i=>i!==ti); return c.length?U.pick(c):null; })(); s.up[p]=idx; }
}
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(!a) return '알 수 없는 동작';
  const H=s.hand[p];
  if(a.k==='shuffle'){ U.shuffle(H); s.up[p]=null; return null; }
  if(a.k==='up'){ const i=a.i; if(i==null || s.up[p]===i){ s.up[p]=null; return null; } if(!(i>=0&&i<H.length)) return '카드를 고르세요'; s.up[p]=i|0; return null; }
  if(a.k==='draw'){
    if(s.turn!==p) return '상대 차례예요';
    const o=NXT(s,p); if(o==null) return '뽑을 사람이 없어요'; const OH=s.hand[o], i=a.i|0;
    if(!(i>=0&&i<OH.length)) return '뽑을 카드를 고르세요';
    const wasUp = s.up[o]!=null ? s.up[o]===i : null;
    const c=OH.splice(i,1)[0]; s.up[o]=null;
    const n=OH.length+1;
    let paired=false; const j=H.findIndex(x=>x.v===c.v && c.v!==THIEF);
    if(j>=0){ H.splice(j,1); s.pile.push(c.v); paired=true; } else H.splice(Math.random()*(H.length+1)|0, 0, c);   // 뽑은 카드는 손 아무 자리에 끼움 (맨 끝이면 상대가 위치를 앎)
    s.up[p]=null;
    s.last={by:p, from:o, v:c.v, paired, i, n, wasUp}; s.moves++;
    s.hist.push({by:p, thief:c.v===THIEF, pos:n>1?i/(n-1):.5, wasUp});
    if(a.prep) prep(s,p,a.prep);
    for(const q of [p,o]) if(!s.hand[q].length&&!s.fin.includes(q)) s.fin.push(q);
    const alive=s.hand.map((h,q)=>h.length?q:-1).filter(x=>x>=0);
    if(alive.length<=1){ s.turn=null; if(s.hand.length>2){ s.loser=alive[0]; s.winners=s.hand.map((_,q)=>q).filter(q=>q!==s.loser); s.winner=s.fin[0]; } else s.winner = !s.hand[0].length ? 0 : 1; return null; }
    s.turn=s.hand[o].length?o:NXT(s,o); return null;
  }
  return '알 수 없는 동작';
}
function mask(s,p){
  const v=U.clone(s);
  if(s.winner==null) v.hand=s.hand.map((h,q)=>q===p?v.hand[q]:h.map(()=>null));   // 남의 손은 뒷면 (몇 장인지·올린 카드 위치만)
  return v;
}

/* 컴퓨터: 상대(사람) 버릇을 기억함
   - 올려 둔 카드가 도둑이었는지 (함정파 / 미끼파)
   - 도둑을 양 끝에 두는지 가운데 두는지
   내가 도둑을 쥐고 있으면 뽑은 뒤 섞고, 가끔 도둑이나 다른 카드를 올려 유혹함 */
// 지난 판들 기억 (같은 창에서 다시 하기 하면 이어짐 — 사람처럼 "아까 그 사람" 기억)
const mem={up:0,upT:0,th:0,edge:0}; let curHist=null;
function foldMem(){ if(!curHist) return; for(const k in mem) mem[k]*=.7; for(const h of curHist){ if(h.by!==1) continue; if(h.wasUp===true){ mem.up++; if(h.thief) mem.upT++; } if(h.thief){ mem.th++; if(h.pos<=.01||h.pos>=.99) mem.edge++; } } curHist=null; }
function habits(v){
  curHist=v.hist;
  const m={...mem}; for(const h of v.hist){ if(h.by!==1) continue; if(h.wasUp===true){ m.up++; if(h.thief) m.upT++; } if(h.thief){ m.th++; if(h.pos<=.01||h.pos>=.99) m.edge++; } }
  return { upThief:(m.upT+1)/(m.up+2), upN:m.up, edgeRate:(m.edge+.5)/(m.th+1), thN:m.th };
}
function ai(v,lvl=1){
  if(v.turn!==1) return null;
  const me=1, o=NXT(v,1); if(o==null) return null; const n=v.hand[o].length; if(!n) return null;
  const iHaveThief=v.hand[me].some(c=>c.v===THIEF);
  let i;
  const hb=habits(v);
  if(lvl===0 || iHaveThief) i=Math.random()*n|0;   // 도둑이 내게 있으면 뭘 뽑든 짝
  else {
    // 자리마다 도둑일 확률 짐작
    let pT=Array(n).fill(1/n);
    if(n>2 && hb.thN>=1){ const a=Math.min(1,hb.thN/3)*(lvl===2?1:.5), e=hb.edgeRate;
      pT=pT.map((x,k)=>{ const em = (k===0||k===n-1) ? e/2 : (1-e)/(n-2); return (1-a)*x + a*em; }); }
    const up=v.up[o];
    if(up!=null && n>1){ const pu = lvl===2 ? hb.upThief : (hb.upThief+.5)/2; const rest=1-pT[up]; pT=pT.map((x,k)=> k===up ? pu : rest>0 ? x/rest*(1-pu) : (1-pu)/(n-1)); }
    const minP=Math.min(...pT), best=pT.map((x,k)=>k).filter(k=>pT[k]<=minP+1e-9);
    i = Math.random() < (lvl===2?.85:.55) ? U.pick(best) : Math.random()*n|0;
  }
  // 뽑은 뒤 내 손 정리 (도둑을 들고 있을 때 연기)
  let pp={shuffle:true, up:null};
  const rr=Math.random(); if(lvl>0){ pp.up = rr<.35 ? 'thief' : rr<.6 ? 'other' : null; }
  return {k:'draw', i, prep:pp};
}

/* 화면 */
let lastMoves=-1;
const face=v=> v===THIEF ? '🦹' : String(v);
function render(el,v,ctx){
  const me=ctx.me, o=NXT(v,me)??(me===0?1:0), rest=v.hand.map((_,q)=>q).filter(q=>q!==me&&q!==o), who=i=> i===me&&ctx.mode!=='local' ? '나' : U.esc(ctx.name(i));
  const fresh=v.moves!==lastMoves; lastMoves=v.moves;
  const L=v.last;
  let h=`<div class="info">남은 카드 · ${who(me)} <b>${v.hand[me].length}</b>장 : ${[o,...rest].map(q=>`${who(q)} <b>${v.hand[q].length}</b>장${!v.hand[q].length&&v.hand.length>2?' ✅':''}`).join(' · ')} · 버린 짝 ${v.pile.length}쌍</div>`;
  if(v.hand.length>2) h+=`<div class="th-last"><small>${v.turn!=null?`👉 ${v.turn===me?'내':who(v.turn)} 차례 → ${who(NXT(v,v.turn))} 손에서 뽑기`:''}</small></div>`;
  // 상대 손 (뒷면)
  const canDraw = ctx.myTurn && v.winner==null && v.turn===me;
  h+=`<div class="th-hand opp ${canDraw?'aim':''}">${v.hand[o].map((c,i)=> c ? `<span class="th-c f ${c.v===THIEF?'thief':''}">${face(c.v)}</span>` : `<button class="th-c back ${v.up[o]===i?'up':''}" data-d="${i}">🂠</button>`).join('')}</div>`;
  if(L){ const t= L.v===THIEF ? `${who(L.by)} → <b>🦹 도둑</b>을 뽑았어요!${v.hand.length>2&&L.from!=null?` <small>(${who(L.from)}에게서)</small>`:''}` : `${who(L.by)} → <b>${L.v}</b> 뽑아서 짝 맞춤 ✨`; h+=`<div class="th-last ${fresh?'pop':''} ${L.v===THIEF?'bad':''}">${t}${L.wasUp===true?' <small>(올라와 있던 카드)</small>':''}</div>`; }
  else h+=`<div class="th-last">${v.turn===me&&ctx.mode!=='local'?'내가':who(v.turn)+'이(가)'} 먼저 뽑아요</div>`;
  // 내 손
  h+=`<div class="th-hand mine">${v.hand[me].map((c,i)=>`<button class="th-c f ${c.v===THIEF?'thief':''} ${v.up[me]===i?'up':''}" data-u="${i}">${face(c.v)}</button>`).join('')}</div>`;
  if(v.winner==null) h+=`<div class="fh-act"><button class="ghost small" data-a="shuffle">🔀 내 손 섞기</button>${v.up[me]!=null?'<button class="ghost small" data-a="down">⬇️ 내리기</button>':''}<small class="muted">내 카드를 누르면 슬쩍 올려 둬요 (상대에게 보임)</small></div>`;
  if(v.pile.length) h+=`<div class="th-pile">버린 짝: ${[...new Set(v.pile)].sort((a,b)=>a-b).join(' · ')}</div>`;
  el.innerHTML=h;
  // 혼자 모드: 도둑이 오가면 컴퓨터가 한마디
  if(fresh && L && L.v===THIEF && ctx.mode==='solo' && typeof showSay==='function'){
    const t = L.by===1 ? U.pick(['아… 😱','으악 도둑이다','이럴 수가…']) : U.pick(['ㅋㅋㅋ 가져가셨네~','고마워요 😆','후후 잘 가라~']);
    setTimeout(()=>showSay(1,t,3200),300);
  }
  if(fresh && L && ctx.mode==='solo' && L.by===1 && L.wasUp===false && v.up[0]==null && Math.random()<.15 && typeof showSay==='function') setTimeout(()=>showSay(1,U.pick(['음… 이거?','어디 있을까~']),2500),200);
  el.onclick=e=>{
    const d=e.target.closest('[data-d]'); if(d){ if(canDraw) ctx.act({k:'draw',i:+d.dataset.d}); return; }
    const u=e.target.closest('[data-u]'); if(u){ ctx.act({k:'up',i:+u.dataset.u}); return; }
    const b=e.target.closest('[data-a]'); if(!b) return;
    if(b.dataset.a==='shuffle') ctx.act({k:'shuffle'}); else if(b.dataset.a==='down') ctx.act({k:'up',i:null});
  };
}
function status(v,ctx){
  if(v.winner!=null) return '';
  return ctx.myTurn ? '상대 카드 한 장을 뽑으세요 (도둑 조심!)' : ctx.turnText(v)+' · 내 손을 섞거나 한 장 올려서 유혹해 보세요';
}
const guide=`
<p>1~10 카드 두 장씩과 <b>🦹 도둑</b> 한 장. 처음 받은 카드 중 짝은 바로 버리고 시작해요.</p>
<ul><li>내 차례엔 <b>다음 사람 손에서 한 장</b>을 뽑아요(뒷면만 보여요). 짝이 맞으면 버려요. (2~6명 — 손을 다 비운 사람은 빠져요)</li>
<li>둘이서 하면 도둑이 아닌 카드는 <b>뽑으면 늘 짝</b>이 맞아요. 결국 승부는 <b>도둑이 어디 있느냐</b>!</li>
<li>손이 먼저 비면 승리, 끝까지 <b>도둑을 쥔 사람이 패배</b>.</li>
<li>내 손은 언제든 <b>🔀 섞기</b>, 카드를 눌러 <b>슬쩍 올려 두기</b>를 할 수 있어요. 올라온 카드는 상대에게도 보여요.</li></ul>
<div class="tipbox">💡 <b>팁</b><br>
· 도둑을 올려 두면 "설마 저게?" 하고 피할 수도, "함정이겠지" 하고 뽑을 수도 있어요.<br>
· 🧠 컴퓨터는 내가 <b>올려 둔 카드가 도둑이었는지</b>, 도둑을 <b>끝자리에 자주 두는지</b> 기억해요. 매번 바꿔 보세요!</div>`;
window.GAMES.thief = {
  title:'도둑잡기', ref:'올드 메이드', emoji:'🦹', tags:['심리전','카드','클래식'],
  tagline:'상대 손에서 한 장씩 뽑아 짝 버리기. 끝까지 도둑을 쥔 사람이 진다!',
  guide, init, apply, mask, ai, render, status,
  aiDelay:()=>1400+Math.random()*2200,
  reset(){ lastMoves=-1; foldMem(); },
  forget(){ for(const k in mem) mem[k]=0; curHist=null; },
  maxH:6, result:(v,ctx)=>v.hand.length>2?(v.loser===ctx.me?'🦹 도둑을 끝까지 쥠':`빠져나옴 ${v.fin.indexOf(ctx.me)+1}번째`):'',
  bar:(v,i)=>`<span class="score">${v.hand[i].length}</span><span class="tag">장</span>`,
};
})();
