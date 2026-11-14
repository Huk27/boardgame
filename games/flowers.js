(function(){
'use strict';
/* 꽃 선물 대결: 꽃 7종(가치 2,2,2,3,3,4,5 — 가치만큼 카드가 있음, 21장). 1장은 몰래 빼고 각자 6장.
   차례마다 1장 뽑고, 아직 안 쓴 행동 하나: 🤫비밀(1장 몰래 내 몫) 🗑️버리기(2장) 🎁선물(3장 → 상대가 1장 고르고 2장은 내 몫)
   ⚔️경쟁(2장+2장 → 상대가 한 묶음 고르고 남은 묶음은 내 몫). 둘 다 4가지를 다 쓰면 라운드 끝 → 꽃마다 더 많이 모은 쪽이 그 꽃의 마음을 얻음(같으면 그대로).
   라운드 끝에 마음 얻은 꽃 가치 합 11 이상이면 승리, 아니면 꽃 4종 이상이면 승리. 3라운드 뒤엔 가치 합 → 꽃 수 순. */
const FL=['🌸','🌼','🌺','🪷','🌷','🌻','🌹'], FN=['벚꽃','국화','동백','연꽃','튤립','해바라기','장미'], VAL=[2,2,2,3,3,4,5];
const ACTS=['secret','discard','gift','comp'], ANAME={secret:'🤫 비밀',discard:'🗑️ 버리기',gift:'🎁 선물',comp:'⚔️ 경쟁'}, NEED={secret:1,discard:2,gift:3,comp:4};
function newRound(s){
  const d=[]; for(let g=0;g<7;g++) for(let k=0;k<VAL[g];k++) d.push(g); U.shuffle(d); d.pop();   // 1장 몰래 뺌
  s.deck=d; s.hand=[d.splice(0,6), d.splice(0,6)]; s.used=[{},{}]; s.secret=[null,null]; s.disc=[[],[]]; s.won=[[0,0,0,0,0,0,0],[0,0,0,0,0,0,0]];
  s.phase='act'; s.offer=null; s.turn=s.first; s.hand[s.turn].push(s.deck.pop()); s.roundLog=[];
}
function init(starter){ const s={round:1, first:starter, favor:[-1,-1,-1,-1,-1,-1,-1], starter, winner:null, ev:0, hist:[]}; newRound(s); return s; }
const charm=(f,p)=>f.reduce((a,x,g)=>a+(x===p?VAL[g]:0),0), count=(f,p)=>f.filter(x=>x===p).length;
function endRound(s){
  for(const p of [0,1]) if(s.secret[p]!=null) s.won[p][s.secret[p]]++;
  for(let g=0;g<7;g++){ const a=s.won[0][g], b=s.won[1][g]; if(a>b) s.favor[g]=0; else if(b>a) s.favor[g]=1; }
  s.hist.push({round:s.round, won:U.clone(s.won), secret:s.secret.slice(), favor:s.favor.slice()});
  const c=[charm(s.favor,0),charm(s.favor,1)], n=[count(s.favor,0),count(s.favor,1)];
  let w=null;
  if(c[0]>=11||c[1]>=11) w = c[0]>=11 && c[1]>=11 ? (c[0]>c[1]?0:c[1]>c[0]?1:null) : c[0]>=11?0:1;
  if(w==null && (n[0]>=4||n[1]>=4)) w = n[0]>=4 && n[1]>=4 ? (n[0]>n[1]?0:n[1]>n[0]?1:null) : n[0]>=4?0:1;
  if(w==null && s.round>=3) w = c[0]!==c[1] ? (c[0]>c[1]?0:1) : n[0]!==n[1] ? (n[0]>n[1]?0:1) : 'draw';
  if(w!=null){ s.winner=w; s.turn=null; s.phase='over'; return; }
  s.round++; s.first=1-s.first; newRound(s);
}
function nextTurn(s,o){   // o의 차례 시작 (둘 다 다 썼으면 라운드 끝)
  const done=p=>ACTS.every(a=>s.used[p][a]);
  if(done(0)&&done(1)){ endRound(s); return; }
  if(done(o)) o=1-o;
  s.turn=o; s.phase='act'; if(s.deck.length) s.hand[o].push(s.deck.pop());
}
function takeIdx(H,is){ const set=[...new Set(is)]; if(set.length!==is.length || set.some(i=>!(i>=0&&i<H.length))) return null; const cards=is.map(i=>H[i]); set.sort((a,b)=>b-a).forEach(i=>H.splice(i,1)); return cards; }
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(s.turn!==p) return '상대 차례예요';
  if(!a) return '알 수 없는 동작';
  const o=1-p;
  if(s.phase==='pick'){
    if(a.k!=='pick') return '하나를 고르세요';
    const O=s.offer, i=a.i|0;
    if(O.type==='gift'){ if(!(i>=0&&i<3)) return '고를 카드를 누르세요'; O.cards.forEach((g,j)=>s.won[j===i?p:O.by][g]++); }
    else { if(i!==0&&i!==1) return '묶음을 고르세요'; O.pairs.forEach((pr,j)=>pr.forEach(g=>s.won[j===i?p:O.by][g]++)); }
    s.roundLog.push({by:O.by, k:O.type, cards:O.cards||O.pairs, pick:i, picker:p}); s.offer=null; s.ev++;
    nextTurn(s,p); return null;   // 고른 사람이 다음 차례
  }
  if(!ACTS.includes(a.k)) return '행동을 고르세요';
  if(s.used[p][a.k]) return '이번 라운드에 이미 쓴 행동이에요';
  const H=s.hand[p], is=(a.is||[]).map(x=>x|0);
  if(is.length!==NEED[a.k]) return `카드 ${NEED[a.k]}장을 고르세요`;
  const cards=takeIdx(H,is); if(!cards) return '카드를 다시 고르세요';
  s.used[p][a.k]=true; s.ev++;
  if(a.k==='secret'){ s.secret[p]=cards[0]; s.roundLog.push({by:p,k:'secret'}); nextTurn(s,o); return null; }
  if(a.k==='discard'){ s.disc[p].push(...cards); s.roundLog.push({by:p,k:'discard'}); nextTurn(s,o); return null; }
  if(a.k==='gift'){ s.offer={type:'gift', by:p, cards}; s.phase='pick'; s.turn=o; return null; }
  s.offer={type:'comp', by:p, pairs:[[cards[0],cards[1]],[cards[2],cards[3]]]}; s.phase='pick'; s.turn=o; return null;
}
function mask(s,p){
  const v=U.clone(s), o=1-p; v.deck=s.deck.length;
  if(s.winner==null){ v.hand[o]=s.hand[o].length; v.secret[o]= s.secret[o]==null?null:'?'; v.disc[o]=s.disc[o].length; }
  return v;
}

/* 컴퓨터 (사람처럼): 꽃마다 "지금 몇 장 차이인지"로 마음 얻을 확률을 어림잡아 가치를 매기고,
   선물·경쟁은 "상대는 자기에게 제일 좋은 걸 고른다"고 보고 내게 남는 게 가장 좋은 조합을 냄. 쉬움은 대충. */
function evalWon(won,favor,me){ let s=0; for(let g=0;g<7;g++){ const d=won[me][g]-won[1-me][g]; let pw = d===0 ? (favor[g]===me?.68:favor[g]===1-me?.32:.5) : .5+.46*Math.tanh(d*.75); s+=VAL[g]*pw; } return s; }
function withAdd(won,p,cards){ const w=[won[0].slice(),won[1].slice()]; for(const g of cards) w[p][g]++; return w; }
function combos(n,k){ const out=[], c=[]; (function r(st){ if(c.length===k){ out.push(c.slice()); return; } for(let i=st;i<n;i++){ c.push(i); r(i+1); c.pop(); } })(0); return out; }
let saidEv=-1;
function say(v,list,pr){ if(typeof showSay==='function' && saidEv!==v.ev && Math.random()<pr){ saidEv=v.ev; setTimeout(()=>showSay(1,U.pick(list),2800),250); } }
function ai(v,lvl=1){
  if(v.turn!==1||v.winner!=null) return null;
  const me=1, op=0, F=v.favor, won=v.won;
  const mineSecret = v.secret[me]!=null ? [v.secret[me]] : [];
  const E=(w)=>evalWon(withAdd(w,me,mineSecret),F,me);   // 내 비밀 카드는 결국 내 몫
  const noise=()=>Math.random()*[3,1.6,.15][lvl];
  if(v.phase==='pick'){
    const O=v.offer; let best=0, bs=-1e9;
    const opts = O.type==='gift' ? O.cards.map((g,i)=>({i, mine:[g], his:O.cards.filter((_,j)=>j!==i)})) : O.pairs.map((pr,i)=>({i, mine:pr, his:O.pairs[1-i]}));
    for(const x of opts){ const w=withAdd(withAdd(won,me,x.mine),op,x.his); const sc=E(w)+noise(); if(sc>bs){ bs=sc; best=x.i; } }
    say(v,['이거 주시는 거죠? 😏','음… 이걸로!','고민되네…'],.4);
    return {k:'pick', i:best};
  }
  const H=v.hand[me], n=H.length; let best=null, bs=-1e9;
  const base=E(won);
  const consider=(k,is,sc)=>{ sc+=noise(); if(sc>bs){ bs=sc; best={k,is}; } };
  // 상대가 자기에게 제일 좋게 고른다고 가정
  const opPick=(opts)=>{ let b=null, bv=-1e9; for(const x of opts){ const w=withAdd(withAdd(won,op,x.his),me,x.mine); const val=evalWon(w,F,op); if(val>bv){ bv=val; b=x; } } return b; };
  if(!v.used[me].secret) for(let i=0;i<n;i++) consider('secret',[i], E(withAdd(won,me,[H[i]])) - base + 0.2*VAL[H[i]] - (lvl>0?1.2:0));   // 비밀은 아껴 두는 편
  if(!v.used[me].discard) for(const c of combos(n,2)) consider('discard',c, -(c.reduce((a,i)=>a+VAL[H[i]],0))*.35 - (lvl>0?.8:0));
  if(!v.used[me].gift && n>=3) for(const c of combos(n,3)){ const cards=c.map(i=>H[i]); const opts=cards.map((g,i)=>({mine:cards.filter((_,j)=>j!==i), his:[g]})); const x=opPick(opts); consider('gift',c, E(withAdd(withAdd(won,me,x.mine),op,x.his))-base); }
  if(!v.used[me].comp && n>=4) for(const c of combos(n,4)) for(const pr of [[0,1,2,3],[0,2,1,3],[0,3,1,2]]){ const is=pr.map(k=>c[k]), cards=is.map(i=>H[i]); const P=[[cards[0],cards[1]],[cards[2],cards[3]]]; const x=opPick([{mine:P[1],his:P[0]},{mine:P[0],his:P[1]}]); consider('comp',is, E(withAdd(withAdd(won,me,x.mine),op,x.his))-base); }
  if(!best){ const k=ACTS.find(a=>!v.used[me][a]); best={k, is:[...Array(NEED[k]).keys()]}; }
  if(best.k==='gift') say(v,['골라 보세요~ 🎁','셋 중에 하나!'],.5); else if(best.k==='comp') say(v,['어느 쪽 하실래요? ⚔️','반반 나눠요~'],.5); else if(best.k==='secret') say(v,['쉿 🤫','이건 비밀~'],.3);
  return best;
}

/* 화면 */
let sel=[], lastEv=-1;
const chip=(g,cls='')=>`<span class="fw-c g${g} ${cls}">${FL[g]}</span>`;
function render(el,v,ctx){
  const me=ctx.me, o=1-me, who=i=> i===me&&ctx.mode!=='local' ? '나' : U.esc(ctx.name(i));
  if(v.ev!==lastEv){ lastEv=v.ev; sel=[]; }
  const myTurn=ctx.myTurn && v.winner==null;
  let h=`<div class="info">${v.round}라운드 · 남은 더미 ${v.deck}장 · 마음 얻은 꽃 ${who(me)} <b>${charm(v.favor,me)}점·${count(v.favor,me)}종</b> : ${who(o)} <b>${charm(v.favor,o)}점·${count(v.favor,o)}종</b></div>`;
  h+=`<div class="fw-board">${FL.map((f,g)=>`<div class="fw-col">
    <div class="fw-cnt">${'●'.repeat(v.won[o][g])||'·'}</div>
    <div class="fw-g ${v.favor[g]===o?'op':v.favor[g]===me?'me':''}"><b>${f}</b><small>${VAL[g]}</small></div>
    <div class="fw-cnt mine">${'●'.repeat(v.won[me][g])||'·'}</div></div>`).join('')}</div>`;
  const U2=p=>ACTS.map(a=>`<span class="fw-tok ${v.used[p]&&v.used[p][a]?'used':''}">${ANAME[a].split(' ')[0]}</span>`).join('');
  h+=`<div class="fw-tokens"><span>${who(o)} ${U2(o)} · 비밀 ${v.secret[o]!=null?'🤫':'—'} · 손 ${Array.isArray(v.hand[o])?v.hand[o].length:v.hand[o]}장</span><span>${who(me)} ${U2(me)} · 비밀 ${v.secret[me]!=null?chip(v.secret[me],'sm'):'—'}</span></div>`;
  if(v.phase==='pick' && v.offer){
    const O=v.offer, mine=v.turn===me;
    h+=`<div class="fw-offer"><div>${O.by===me&&ctx.mode!=='local'?'내':who(O.by)+'의'} ${ANAME[O.type]} — ${mine?'하나를 고르세요 (나머지는 상대 몫)':`${who(v.turn)}이(가) 고르는 중…`}</div><div class="fh-act">`;
    if(O.type==='gift') h+=O.cards.map((g,i)=>`<button class="fw-pick" data-pick="${i}" ${mine?'':'disabled'}>${chip(g)}<small>${FN[g]}</small></button>`).join('');
    else h+=O.pairs.map((pr,i)=>`<button class="fw-pick" data-pick="${i}" ${mine?'':'disabled'}>${pr.map(g=>chip(g)).join('')}</button>`).join('<span>또는</span>');
    h+=`</div></div>`;
  }
  const H=Array.isArray(v.hand[me]) ? v.hand[me] : [];
  h+=`<div class="fw-hand">${H.map((g,i)=>`<button class="fw-c g${g} ${sel.includes(i)?'sel':''}" data-i="${i}">${FL[g]}${sel.includes(i)?`<i>${sel.indexOf(i)+1}</i>`:''}</button>`).join('')}</div>`;
  if(myTurn && v.phase==='act'){
    h+=`<div class="fh-act">${ACTS.map(a=>`<button data-act="${a}" ${v.used[me][a]||sel.length!==NEED[a]?'disabled':''}>${ANAME[a]} ${NEED[a]}장</button>`).join('')}</div><small class="muted fw-help">카드를 골라 행동을 누르세요. ⚔️ 경쟁은 1·2번째가 한 묶음, 3·4번째가 한 묶음.</small>`;
  }
  if(v.roundLog && v.roundLog.length) h+=`<div class="fw-log">${v.roundLog.map(L=> L.k==='secret'||L.k==='discard' ? `${who(L.by)} ${ANAME[L.k]}` : `${who(L.by)} ${ANAME[L.k]} → ${L.picker===me&&ctx.mode!=='local'?'내가':who(L.picker)+'이(가)'} ${L.k==='gift'?chip(L.cards[L.pick],'sm'):L.cards[L.pick].map(g=>chip(g,'sm')).join('')} 가져감`).join(' · ')}</div>`;
  const last=v.hist[v.hist.length-1];
  if(last && (v.roundLog||[]).length===0) h+=`<div class="fw-log">지난 라운드 비밀 카드: ${who(me)} ${last.secret[me]!=null?chip(last.secret[me],'sm'):'—'} · ${who(o)} ${last.secret[o]!=null?chip(last.secret[o],'sm'):'—'}</div>`;
  el.innerHTML=h;
  el.onclick=e=>{
    const pk=e.target.closest('[data-pick]'); if(pk&&!pk.disabled){ ctx.act({k:'pick',i:+pk.dataset.pick}); return; }
    const c=e.target.closest('[data-i]'); if(c){ if(!myTurn||v.phase!=='act') return; const i=+c.dataset.i; sel = sel.includes(i) ? sel.filter(x=>x!==i) : sel.concat(i).slice(-4); ctx.rerender(); return; }
    const b=e.target.closest('[data-act]'); if(b&&!b.disabled){ ctx.act({k:b.dataset.act, is:sel.slice()}); }
  };
}
function status(v,ctx){
  if(v.winner!=null) return '';
  if(!ctx.myTurn) return ctx.turnText(v);
  return v.phase==='pick' ? '상대가 내민 것 중 하나를 고르세요' : '카드를 골라 아직 안 쓴 행동을 하세요';
}
const guide=`
<p>꽃 7종의 마음을 얻는 2인 게임이에요. 꽃마다 가치(2~5)가 있고, <b>가치만큼 카드</b>가 있어요(🌹장미 5장, 🌸벚꽃 2장…). 라운드가 끝날 때 꽃마다 <b>카드를 더 많이 모은 사람</b>이 그 꽃의 마음을 얻어요.</p>
<ul><li>내 차례: 카드 1장을 뽑고, 아래 행동 중 <b>이번 라운드에 아직 안 쓴 것</b> 하나.
<ul><li>🤫 <b>비밀</b> 1장: 몰래 내 몫으로 (라운드 끝에 공개)</li>
<li>🗑️ <b>버리기</b> 2장: 몰래 버림</li>
<li>🎁 <b>선물</b> 3장: 펼쳐 보이면 <b>상대가 1장</b> 가져가고 나머지 2장은 내 몫</li>
<li>⚔️ <b>경쟁</b> 4장: 2장씩 두 묶음 → <b>상대가 한 묶음</b> 고르고 남은 묶음은 내 몫</li></ul></li>
<li>둘 다 4가지를 다 쓰면 라운드 끝. 같은 수면 마음은 그대로(처음엔 아무도 아님).</li>
<li><b>마음 얻은 꽃 가치 합 11 이상</b>이면 승리, 아니면 <b>꽃 4종 이상</b>이면 승리. 3라운드 뒤엔 가치 합 → 꽃 수로 승부.</li>
<li>매 라운드 카드 1장은 몰래 빠져 있어요.</li></ul>
<div class="tipbox">💡 <b>팁</b><br>
· 🎁 선물·⚔️ 경쟁은 상대가 먼저 골라요. 상대가 뭘 가져갈지 생각하고 내밀어야 해요.<br>
· 🌹장미(5)·🌻해바라기(4)는 크지만 카드가 많아서 다투기 어려워요. 🌸2짜리 셋을 노리는 것도 방법.<br>
· 🤫 비밀은 마지막까지 아껴 두면, 막판에 뒤집기 좋아요.</div>`;
window.GAMES.flowers = {
  title:'꽃 선물 대결', ref:'하나미코지', emoji:'🌸', tags:['심리전','전략','카드'],
  pulse:v=>charm(v.favor,1)-charm(v.favor,0), pulseStep:4,
  tagline:'선물을 내밀면 상대가 먼저 고른다! 꽃 7종의 마음을 얻는 2인 눈치 게임.',
  guide, init, apply, mask, ai, render, status,
  aiDelay:()=>1300+Math.random()*1700,
  reset(){ sel=[]; lastEv=-1; saidEv=-1; },
  bar:(v,i)=>`<span class="score">${charm(v.favor,i)}</span><span class="tag">점·${count(v.favor,i)}종</span>`,
  result:(v,ctx)=>`${charm(v.favor,ctx.me)}점·${count(v.favor,ctx.me)}종 : ${charm(v.favor,1-ctx.me)}점·${count(v.favor,1-ctx.me)}종`,
};
})();
