(function(){
'use strict';
/* 땅따먹기 (6인: 우리 둘 + NPC 4명). 18×18 판, 각자 1×1 기지에서 시작.
   모두가 보는 타일 줄에서 차례마다 맨 앞 타일을 가져와 놓음(회전·뒤집기 가능). 🎟️쿠폰을 쓰면 앞 5장 중 골라 가져옴.
   놓을 때: 내 땅과 면이 닿아야 하고, 남의 땅·돌멩이와는 면이 닿으면 안 됨(꼭짓점은 괜찮음). 못 놓으면 버림.
   특수 칸: 상하좌우 4칸을 내 땅으로 둘러싸면 발동하고 그 칸도 내 땅 — 🎟️ 쿠폰 +1 / 🪨 빈칸 하나에 돌멩이(남이 그 옆에 못 놓음).
   9라운드 뒤 "내 땅으로 꽉 찬 가장 큰 정사각형"이 큰 사람이 이김(같으면 땅 칸 수). */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로, 나머지는 NPC */
const N=6, S=18, ROUNDS=9; let HSEAT=[0,3]; const SEATORD=[0,3,1,4,2,5];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i);
const ALL=[...Array(N).keys()];
const COL=['#e2574c','#f0a830','#4caf6a','#2a8c9b','#7a5cc7','#d0559a'];
const STYLE={seojin:'logic', doyun:'emo', haram:'calm', yuna:'emo', minho:'sly', taekyung:'emo', jihu:'sly', soyul:'logic'};
const DEF_P={talk:.6,aggr:.5,trust:.5,bluff:.5,logic:.6,temper:.4};
const nm=i=>`{s${i}}`;
const SHAPES=[ // [r,c] 칸들
  [[0,0],[0,1]], [[0,0],[0,1],[0,2]], [[0,0],[1,0],[1,1]],
  [[0,0],[0,1],[0,2],[0,3]], [[0,0],[0,1],[1,0],[1,1]], [[0,0],[0,1],[0,2],[1,1]], [[0,0],[0,1],[1,1],[1,2]], [[0,0],[1,0],[2,0],[2,1]],
  [[0,0],[0,1],[0,2],[1,0],[1,1]], [[0,0],[1,0],[2,0],[2,1],[2,2]], [[0,0],[0,2],[1,0],[1,1],[1,2]], [[0,0],[0,1],[0,2],[0,3],[1,0]], [[0,1],[1,0],[1,1],[1,2],[2,1]],
  [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2]], [[0,0],[0,1],[1,0],[1,1],[2,0],[2,1]],
];
const WEIGHT=[3,4,4, 4,5,4,3,4, 4,3,2,3,2, 3,2];
function norm(cs){ const r0=Math.min(...cs.map(x=>x[0])), c0=Math.min(...cs.map(x=>x[1])); return cs.map(([r,c])=>[r-r0,c-c0]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]); }
function orients(sh){ const out=[], seen=new Set(); let cur=sh;
  for(let f=0;f<2;f++){ for(let k=0;k<4;k++){ const n=norm(cur), key=JSON.stringify(n); if(!seen.has(key)){ seen.add(key); out.push(n); } cur=cur.map(([r,c])=>[c,-r]); } cur=cur.map(([r,c])=>[r,-c]); }
  return out; }
const ORI=SHAPES.map(orients);
const D4=[[1,0],[-1,0],[0,1],[0,-1]];
const inB=(r,c)=>r>=0&&r<S&&c>=0&&c<S;

function init(starter,o){ const k=Math.max(2,Math.min(6,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  const g=[...Array(S)].map(()=>Array(S).fill(null));
  const bases=[[3,3],[3,9],[3,14],[14,3],[14,9],[14,14]].map(([r,c])=>[r+(Math.random()*2|0),c+(Math.random()*2|0)]);
  const seats=U.shuffle(ALL.slice()); const base={};
  seats.forEach((i,k)=>{ const [r,c]=bases[k]; g[r][c]=i; base[i]=[r,c]; });
  const sp={}; const free=()=>{ for(;;){ const r=2+(Math.random()*(S-4)|0), c=2+(Math.random()*(S-4)|0); if(g[r][c]==null && !sp[r+','+c] && Object.values(base).every(([br,bc])=>Math.abs(br-r)+Math.abs(bc-c)>2)) return r+','+c; } };
  for(let k=0;k<7;k++) sp[free()]='coupon'; for(let k=0;k<5;k++) sp[free()]='rock';
  const bag=[]; WEIGHT.forEach((w,i)=>{ for(let k=0;k<w;k++) bag.push(i); });
  const queue=[...Array(N*ROUNDS+8)].map(()=>U.pick(bag));
  const s={g, sp, base, queue, coupon:Array(N).fill(1), ord:U.shuffle(ALL.slice()), cur:-1, round:1, phase:'intro', actor:null, pick:null,
    who:{}, used:{}, say:null, q:[], last:null, rockBy:null, log:[], turn:null, starter, winner:null, notice:'🎙️ 땅따먹기를 시작합니다! 가장 큰 정사각형을 만드세요', ev:0};
  s.hs=HSEAT.slice(); const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=ids[k]);
  return s;
}
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;

/* ── 판 계산 ── */
function canPlace(g,p,cells){
  let touch=false;
  for(const [r,c] of cells){ if(!inB(r,c)||g[r][c]!=null) return false;
    for(const [dr,dc] of D4){ const y=r+dr, x=c+dc; if(!inB(y,x)) continue; const v=g[y][x]; if(v===p) touch=true; else if(v!=null) return false; } }
  return touch;
}
function maxSq(g,p){ let best=0; const dp=[...Array(S)].map(()=>Array(S).fill(0));
  for(let r=0;r<S;r++) for(let c=0;c<S;c++) if(g[r][c]===p){ dp[r][c]= (r&&c) ? 1+Math.min(dp[r-1][c],dp[r][c-1],dp[r-1][c-1]) : 1; if(dp[r][c]>best) best=dp[r][c]; }
  return best; }
function cellsOf(g,p){ let n=0; for(const row of g) for(const v of row) if(v===p) n++; return n; }
function potential(g,p,k){   // k×k 창 중 남의 땅·돌이 없는 곳에서 내 칸 비율 최대
  let best=0; for(let r=0;r+k<=S;r++) for(let c=0;c+k<=S;c++){ let own=0, bad=false;
    for(let y=r;y<r+k&&!bad;y++) for(let x=c;x<c+k;x++){ const v=g[y][x]; if(v===p) own++; else if(v!=null){ bad=true; break; } }
    if(!bad && own/(k*k)>best) best=own/(k*k); }
  return best; }
function allMoves(g,p,shapeIdx){ const out=[];
  for(const o of ORI[shapeIdx]) for(let r=-3;r<S;r++) for(let c=-3;c<S;c++){ const cells=o.map(([a,b])=>[r+a,c+b]); if(canPlace(g,p,cells)) out.push(cells); }
  return out; }
function triggers(s,p){   // 둘러싼 특수 칸
  const got=[];
  for(const [k,t] of Object.entries(s.sp)){ const [r,c]=k.split(',').map(Number); if(s.g[r][c]!=null) continue;
    const nb=D4.map(([dr,dc])=>[r+dr,c+dc]).filter(([y,x])=>inB(y,x)); if(nb.length && nb.every(([y,x])=>s.g[y][x]===p)) got.push([k,t,r,c]); }
  return got; }

/* ── 진행 ── */
function startTurn(s){
  s.cur++; if(s.cur>=N){ s.cur=0; s.round++; if(s.round>ROUNDS){ endGame(s); return; } s.notice=`🎙️ ${s.round}라운드`; s.log.push(`— ${s.round}라운드 —`); }
  const i=s.ord[s.cur]; s.actor=i; s.phase='turn'; s.pick=0;
  s.notice=`💭 ${nm(i)} 차례 — 이번 타일을 놓는 중`;
  if(isH(i)) s.turn=pOf(i); else { s.turn=null; const p=P(s,i); s.think=900+Math.random()*900+p.logic*900; }
}
function doPlace(s,i,qi,cells){
  const sh=s.queue.splice(qi,1)[0]; if(qi>0){ s.coupon[i]--; s.log.push(`🎟️ ${nm(i)} 쿠폰으로 ${qi+1}번째 타일을 골랐어요`); }
  if(!cells){ s.notice=`🗑️ ${nm(i)} 놓을 곳이 없어 타일을 버렸어요`; s.log.push(s.notice); s.q.push({k:'react',kind:'stuck',i}); s.last=null; }
  else { for(const [r,c] of cells) s.g[r][c]=i; s.last={cells,i}; const sq=maxSq(s.g,i);
    s.notice=`🟩 ${nm(i)} ${cells.length}칸 타일을 놓았어요 · 최대 ${sq}×${sq}`; s.log.push(s.notice);
    for(const [k,t,r,c] of triggers(s,i)){ delete s.sp[k]; s.g[r][c]=i;
      if(t==='coupon'){ s.coupon[i]++; s.q.push({k:'note',text:`🎟️ ${nm(i)} 특수 칸 발동! 쿠폰 +1`}); }
      else { s.q.push({k:'note',text:`🪨 ${nm(i)} 특수 칸 발동! 돌멩이를 놓아요`}); s.q.push({k:'rock',i}); } }
    blockedCheck(s,i,cells);
  }
  s.phase='run'; s.turn=null; s.q.push({k:'next'});
}
function blockedCheck(s,i,cells){   // 누군가의 정사각형 자리를 막았으면 반응
  for(const o of ALL){ if(o===i) continue; const near=cells.some(([r,c])=>D4.some(([dr,dc])=>{ const y=r+dr+dr, x=c+dc+dc; return inB(y,x)&&s.g[y][x]===o; }));
    if(near && Math.random()<.5){ s.q.push({k:'react',kind:'blocked',i:o,t:i}); return; } }
}
function placeRock(s,i,r,c){ s.g[r][c]='R'; s.log.push(`🪨 ${nm(i)} 돌멩이를 ${r+1}행 ${c+1}열에`); s.notice=`🪨 ${nm(i)} 돌멩이를 놓았어요`; s.last={cells:[[r,c]],i}; }
function endGame(s){
  s.phase='over'; s.turn=null; s.actor=null;
  s.final=ALL.map(i=>({sq:maxSq(s.g,i), n:cellsOf(s.g,i)}));
  const rank=ALL.slice().sort((a,b)=>s.final[b].sq-s.final[a].sq || s.final[b].n-s.final[a].n); s.rank=rank;
  s.winner = isH(rank[0]) ? pOf(rank[0]) : 'none'; s.winners=isH(rank[0])?[pOf(rank[0])]:[];
  s.notice=`🎙️ 최종 1등: ${nm(rank[0])} — ${s.final[rank[0]].sq}×${s.final[rank[0]].sq}`; s.log.push(s.notice);
}

/* ── NPC ── */
function evalMove(s,i,cells,p){
  const g=s.g; for(const [r,c] of cells) g[r][c]=i;
  const sq=maxSq(g,i); let v=sq*10 + potential(g,i,sq+1)*6 + potential(g,i,sq+2)*3;
  // 공격형: 선두의 다음 정사각형 자리를 깎음
  if(p.aggr>.6){ const lead=ALL.filter(o=>o!==i).sort((a,b)=>maxSq(g,b)-maxSq(g,a))[0]; const k=maxSq(g,lead)+1; v += (1-potential(g,lead,k))*p.aggr*4; }
  for(const [r,c] of cells) g[r][c]=null;
  return v + Math.random()*(1-p.logic)*4;
}
function npcMove(s,i){
  const p=P(s,i), opts=[0]; if(s.coupon[i]>0 && Math.random()<.3+p.logic*.6) opts.push(1,2,3,4);
  let best=null;
  for(const qi of opts){ if(qi>=s.queue.length) continue; const mv=allMoves(s.g,i,s.queue[qi]); for(const cells of mv){ const v=evalMove(s,i,cells,p) - (qi?2.5:0); if(!best||v>best.v) best={v,qi,cells}; } }
  if(!best) return {qi:0,cells:null};
  if(best.qi>0){ const v0=allMoves(s.g,i,s.queue[0]).reduce((m,c)=>Math.max(m,evalMove(s,i,c,p)),-1); if(v0>=best.v) return {qi:0,cells:allMoves(s.g,i,s.queue[0]).sort((a,b)=>evalMove(s,i,b,p)-evalMove(s,i,a,p))[0]||null}; }
  return {qi:best.qi,cells:best.cells};
}
function npcRock(s,i){   // 선두의 정사각형이 자랄 빈칸에
  const lead=ALL.filter(o=>o!==i).sort((a,b)=>maxSq(s.g,b)-maxSq(s.g,a))[0]; let best=null;
  for(let r=0;r<S;r++) for(let c=0;c<S;c++){ if(s.g[r][c]!=null||s.sp[r+','+c]) continue; const near=D4.some(([dr,dc])=>inB(r+dr,c+dc)&&s.g[r+dr][c+dc]===lead); if(!near) continue;
    if(D4.some(([dr,dc])=>inB(r+dr,c+dc)&&s.g[r+dr][c+dc]===i)) continue;
    s.g[r][c]='R'; const v=-potential(s.g,lead,maxSq(s.g,lead)+1)+Math.random()*.1; s.g[r][c]=null; if(!best||v>best.v) best={v,r,c}; }
  return best;
}

/* ── 말 ── */
const LINES={
  sly:{blocked:['{t}, 일부러 막은 거죠~? 😏'], stuck:['어머, 놓을 데가 없네~'], lead:['후후, 제 땅이 제일 반듯하네요~'], rock:['돌멩이 선물이에요~ 😏']},
  calm:{blocked:['…{t}, 막혔네요.'], stuck:['…버릴게요.'], lead:['괜찮게 가고 있어요.'], rock:['여기 두죠.']},
  logic:{blocked:['{t}, 제 정사각형 자리를 정확히 끊었네요.','{t}의 수는 수비적이네요. 기억해 둘게요.'], stuck:['이 모양은 들어갈 자리가 없어요. 손실이네요.'], lead:['지금 최대 정사각형은 제가 앞서요.'], rock:['선두가 넓힐 자리를 막을게요.']},
  emo:{blocked:['아 {t}!! 제 자리 막았어요 😭','{t} 너무해요!! 거기 내 땅인데!'], stuck:['으앙 놓을 데가 없어요 😭'], lead:['제가 1등이다!! 🙌'], rock:['에잇 돌멩이다!! 😤']},
};
function lineOf(s,seat,kind,t){ const p=P(s,seat), st=STYLE[p.id]||'calm', L=(LINES[st]||{})[kind]; if(!L) return null;
  const used=(s.used[seat]=s.used[seat]||[]), pool=L.filter(x=>!used.includes(x)); if(!pool.length) return null; const raw=U.pick(pool); used.push(raw); return raw.split('{t}').join(t!=null?nm(t):''); }
function sayNow(s,seat,kind,t){ if(isH(seat)) return; const text=lineOf(s,seat,kind,t); if(text){ s.say={seat,text,n:(s.say?s.say.n:0)+1}; s.log.push(`${nm(seat)}: ${text}`); } }

/* ── 시간 흐름 ── */
function stepDelay(s){ syncH(s);
  if(s.winner!=null) return null;
  if(s.phase==='intro') return 1800;
  if(s.phase==='rock') return null;   // 사람이 돌멩이를 놓는 중
  if(s.q.length){ const k=s.q[0].k; return k==='next'?700 : k==='rock'&&isH(s.q[0].i) ? 300 : 1200; }
  if(s.phase==='turn') return isH(s.actor)?null:s.think;
  return null;
}
function step(s){ syncH(s);
  if(s.phase==='intro'){ startTurn(s); return; }
  if(s.q.length){ const e=s.q[0];
    if(e.k==='rock'){ if(isH(e.i)){ s.phase='rock'; s.rockBy=e.i; s.turn=pOf(e.i); s.q.shift(); return; } s.q.shift(); const b=npcRock(s,e.i); if(b){ placeRock(s,e.i,b.r,b.c); if(Math.random()<.6) sayNow(s,e.i,'rock'); } s.ev++; return; }
    s.q.shift();
    if(e.k==='next'){ const lead=ALL.slice().sort((a,b)=>maxSq(s.g,b)-maxSq(s.g,a))[0]; if(s.cur===N-1&&!isH(lead)&&Math.random()<.4) sayNow(s,lead,'lead'); startTurn(s); }
    else if(e.k==='note'){ s.notice=e.text; s.log.push(e.text); }
    else if(e.k==='react'){ if(e.kind==='stuck') sayNow(s,e.i,'stuck'); else if(e.kind==='blocked') sayNow(s,e.i,'blocked',e.t); }
    s.ev++; return; }
  if(s.phase==='turn'&&!isH(s.actor)){ const m=npcMove(s,s.actor); doPlace(s,s.actor,m.qi,m.cells); s.ev++; return; }
}
function apply(s,p,a){ syncH(s);
  if(s.winner!=null) return '게임이 끝났어요';
  if(!a) return '알 수 없는 동작';
  const seat=HSEAT[p];
  if(a.k==='rock'){
    if(s.phase!=='rock'||s.rockBy!==seat) return '돌멩이를 놓을 때가 아니에요';
    const r=a.r|0, c=a.c|0; if(!inB(r,c)||s.g[r][c]!=null) return '빈칸을 고르세요';
    placeRock(s,seat,r,c); s.phase='run'; s.turn=null; s.rockBy=null; s.ev++; return null;
  }
  if(s.phase!=='turn'||s.actor!==seat) return '내 차례가 아니에요';
  const qi=a.qi|0; if(!(qi>=0&&qi<5&&qi<s.queue.length)) return '타일을 고르세요'; if(qi>0&&s.coupon[seat]<1) return '쿠폰이 없어요';
  if(a.k==='discard'){ if(allMoves(s.g,seat,s.queue[qi]).length) return '놓을 수 있는 자리가 있어요'; doPlace(s,seat,qi,null); s.ev++; return null; }
  if(a.k==='place'){
    const cells=a.cells; if(!Array.isArray(cells)) return '자리를 고르세요';
    const want=JSON.stringify(norm(cells.map(x=>[x[0]|0,x[1]|0])));
    if(!ORI[s.queue[qi]].some(o=>JSON.stringify(o)===want)) return '타일 모양이 달라요';
    if(!canPlace(s.g,seat,cells)) return '여기엔 못 놓아요 (내 땅에 붙이고, 남의 땅·돌멩이와는 떨어지게)';
    doPlace(s,seat,qi,cells.map(x=>[x[0]|0,x[1]|0])); s.ev++; return null;
  }
  return '알 수 없는 동작';
}
function mask(s){ syncH(s); const v=U.clone(s); v.q=[]; v.used={}; v.think=null; return v; }
/* ── 혼자 모드: 4번 자리를 컴퓨터가 ── */
function ai(v){ syncH(v);
  const seat=HSEAT[1];
  if(v.phase==='rock'&&v.rockBy===seat){ for(let r=0;r<S;r++) for(let c=0;c<S;c++) if(v.g[r][c]==null&&!D4.some(([dr,dc])=>inB(r+dr,c+dc)&&v.g[r+dr][c+dc]===seat)) return {k:'rock',r,c}; }
  if(v.phase==='turn'&&v.actor===seat){ const mv=allMoves(v.g,seat,v.queue[0]); if(!mv.length) return {k:'discard',qi:0};
    let best=null; for(const cells of mv){ for(const [r,c] of cells) v.g[r][c]=seat; const sc=maxSq(v.g,seat)*10+potential(v.g,seat,maxSq(v.g,seat)+1)*5+Math.random(); for(const [r,c] of cells) v.g[r][c]=null; if(!best||sc>best.sc) best={sc,cells}; }
    return {k:'place',qi:0,cells:best.cells}; }
  return null;
}

/* ── 화면 ── */
let WHO={}, selQ=0, ori=0, anchor=null, sig='';
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}/g,(_,d)=>`${seatEmoji(+d)} ${seatName(+d,ctx)}`); }
function mini(shIdx,o){ const cs=ORI[shIdx][o%ORI[shIdx].length], h=Math.max(...cs.map(x=>x[0]))+1, w=Math.max(...cs.map(x=>x[1]))+1; const set=new Set(cs.map(x=>x.join()));
  return `<span class="tr-mini" style="grid-template-columns:repeat(${w},8px)">${[...Array(h*w)].map((_,k)=>`<i class="${set.has(Math.floor(k/w)+','+k%w)?'on':''}"></i>`).join('')}</span>`; }
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{};
  const me=HSEAT[ctx.me], myTurn=v.phase==='turn'&&v.actor===me&&v.turn===ctx.me, rocking=v.phase==='rock'&&v.rockBy===me&&v.turn===ctx.me;
  const sg=v.phase+':'+v.round+':'+v.actor; if(sg!==sig){ sig=sg; selQ=0; ori=0; anchor=null; }
  const shIdx=v.queue[selQ], os=ORI[shIdx], o=os[ori%os.length];
  const prev = myTurn&&anchor ? o.map(([a,b])=>[anchor[0]+a,anchor[1]+b]) : null, prevOk = prev && canPlace(v.g,me,prev);
  const prevSet=new Set((prev||[]).map(x=>x.join())), lastSet=new Set(((v.last||{}).cells||[]).map(x=>x.join()));
  const sqs=ALL.map(i=>maxSq(v.g,i));
  let h=`<div class="info">${v.round} / ${ROUNDS}라운드 · 🎟️ 내 쿠폰 ${v.coupon[me]} · 내 최대 정사각형 <b>${sqs[me]}×${sqs[me]}</b> · 땅 ${cellsOf(v.g,me)}칸</div>`;
  h+=`<div class="hl-notice">${fill(v.notice||'',ctx)}</div>`;
  h+=`<div class="vr-speech">${v.say?`<span class="w">${seatEmoji(v.say.seat)} ${seatName(v.say.seat,ctx)}</span> ${fill(U.esc(v.say.text),ctx)}`:'<i>　</i>'}</div>`;
  h+=`<div class="tr-queue">다음 타일 ${v.queue.slice(0,6).map((q,k)=>`<button class="tr-q ${myTurn&&selQ===k?'sel':''} ${k===0?'first':''}" data-q="${k}" ${myTurn&&(k===0||v.coupon[me]>0)&&k<5?'':'disabled'}>${mini(q,0)}${k===0?'<small>지금</small>':k<5?`<small>🎟️${k+1}</small>`:''}</button>`).join('')}</div>`;
  h+=`<div class="tr-board" style="--n:${S}">${v.g.map((row,r)=>row.map((x,c)=>{ const k=r+','+c, sp=v.sp[k];
      const cls=[x==='R'?'rock':'', prevSet.has(k)?(prevOk?'pv ok':'pv no'):'', lastSet.has(k)?'last':'', v.base[x]&&v.base[x][0]===r&&v.base[x][1]===c?'base':''].join(' ');
      return `<i class="tr-c ${cls}" data-rc="${r},${c}" style="${typeof x==='number'?`background:${COL[x]}`:''}">${x==='R'?'🪨':sp&&x==null?(sp==='coupon'?'🎟️':'⛰️'):''}</i>`; }).join('')).join('')}</div>`;
  if(myTurn){ const can=allMoves(v.g,me,shIdx).length;
    h+=`<div class="vr-card"><b>🟩 내 차례</b><p>${anchor?(prevOk?'초록이면 놓을 수 있어요':'빨강: 여기엔 못 놓아요'):'판을 눌러 놓을 자리를 고르세요'} · 고른 칸이 타일의 왼쪽 위 기준이에요</p>
      <div class="fh-act"><button class="ghost" data-a="rot">🔄 돌리기</button><button class="ghost" data-a="flip">↔️ 뒤집기</button><button data-a="put" ${prevOk?'':'disabled'}>여기에 놓기</button>${can?'':'<button class="ghost" data-a="discard">🗑️ 놓을 곳이 없어요 (버리기)</button>'}</div></div>`; }
  if(rocking) h+=`<div class="vr-card"><b>🪨 돌멩이 놓기</b><p>빈칸을 누르면 돌멩이를 놓아요. 그 옆엔 아무도 타일을 붙일 수 없어요.</p></div>`;
  if(v.phase==='over'&&v.final) h+=`<div class="sn-score">${v.rank.map((i,k)=>`<div class="${isH(i)?'h':''}"><b>${k+1}등 ${seatEmoji(i)} ${seatName(i,ctx)}</b> <small>${v.final[i].sq}×${v.final[i].sq} 정사각형 · 땅 ${v.final[i].n}칸</small></div>`).join('')}</div>`;
  const L=`<div class="side-box"><div class="side-h">🧠 땅 현황 <small>정사각형 · 땅 · 쿠폰 · 성향</small></div>${ALL.slice().sort((a,b)=>sqs[b]-sqs[a]||cellsOf(v.g,b)-cellsOf(v.g,a)).map((i,k)=>`<div class="side-row ${i===me?'me':''}" style="flex-wrap:wrap"><b style="color:${COL[i]}">■</b> ${seatEmoji(i)} ${seatName(i,ctx)} ${isH(i)?'':`<small>${NPCI(i)[2]}</small>`}<span>${sqs[i]}×${sqs[i]} · ${cellsOf(v.g,i)}칸 · 🎟️${v.coupon[i]}</span></div>`).join('')}
    <div class="tr-legend">🎟️ 쿠폰 칸 · ⛰️ 돌멩이 칸 (4방향을 내 땅으로 둘러싸면 발동) · 🪨 돌멩이</div></div>`;
  const R=`<div class="side-box side-log"><div class="side-h">📜 진행 기록 <small>최근이 위</small></div>${v.log.slice(-60).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=`<div class="side3"><div class="side-mid">${h}</div><aside class="side-l">${L}</aside><aside class="side-r">${R}</aside></div>`;
  el.onclick=e=>{
    const q=e.target.closest('[data-q]'); if(q&&!q.disabled){ selQ=+q.dataset.q; ori=0; return ctx.rerender(); }
    const c=e.target.closest('[data-rc]'); if(c){ const [r,cc]=c.dataset.rc.split(',').map(Number);
      if(rocking) return ctx.act({k:'rock',r,c:cc});
      if(myTurn){ anchor=[r,cc]; return ctx.rerender(); } return; }
    const a=e.target.closest('[data-a]'); if(!a||a.disabled) return; const k=a.dataset.a;
    if(k==='rot'){ const o2=o.map(([r,c])=>[c,-r]); ori=os.findIndex(x=>JSON.stringify(x)===JSON.stringify(norm(o2))); return ctx.rerender(); }
    if(k==='flip'){ const o2=o.map(([r,c])=>[r,-c]); ori=os.findIndex(x=>JSON.stringify(x)===JSON.stringify(norm(o2))); return ctx.rerender(); }
    if(k==='put') return ctx.act({k:'place',qi:selQ,cells:prev});
    if(k==='discard') return ctx.act({k:'discard',qi:selQ});
  };
}
function status(v,ctx){ syncH(v);
  const me=HSEAT[ctx.me];
  if(v.phase==='over') return '';
  if(v.phase==='turn'&&v.actor===me) return '내 차례: 타일을 놓으세요';
  if(v.phase==='rock'&&v.rockBy===me) return '돌멩이를 놓을 빈칸을 누르세요';
  return '다른 사람 차례…';
}
const guide=`
<p><b>6인 땅따먹기</b>(우리 둘 + 성격 다른 컴퓨터 플레이어 4명). 18×18 판, 각자 1×1 기지에서 시작해 <b>내 땅으로 꽉 찬 가장 큰 정사각형</b>을 만드는 사람이 이겨요.</p>
<ul><li>모두가 보는 <b>타일 줄</b>에서 차례마다 맨 앞 타일을 가져와 놓아요. 🔄 돌리기·↔️ 뒤집기 가능. <b>🎟️ 쿠폰</b>을 쓰면 앞 5장 중에서 골라요.</li>
<li>놓는 규칙: <b>내 땅과 면이 닿게</b>, <b>남의 땅·돌멩이와는 면이 닿지 않게</b>(꼭짓점은 괜찮아요). 놓을 곳이 없으면 버려요.</li>
<li><b>특수 칸</b>: 상하좌우 4칸을 내 땅으로 둘러싸면 발동하고 그 칸도 내 땅 — 🎟️ 쿠폰 +1 / ⛰️ 원하는 빈칸에 🪨 돌멩이(남이 그 옆에 못 붙임).</li>
<li>9라운드 뒤 정사각형이 큰 순서, 같으면 땅 칸 수로 순위.</li></ul>
<div class="tipbox">💡 <b>팁</b><br>· 남의 땅과 면이 닿으면 안 되니까, 남의 기지 쪽으로 먼저 뻗어 길목을 막는 것도 전략!<br>· 🔥 직진형 컴퓨터는 선두의 정사각형 자리를 일부러 끊어요.</div>`;
window.GAMES.territory = { _sync:x=>syncH(x), maxH:6,
  title:'땅따먹기', ref:'데블스 플랜 「땅따먹기」', emoji:'🟩', tags:['영역','퍼즐','NPC','두뇌서바이벌'],
  tagline:'우리 둘 + 컴퓨터 4명. 공개된 타일 줄에서 조각을 이어 붙여 가장 큰 정사각형 땅을 만들어라.',
  guide, init, apply, mask, ai, render, status, step, stepDelay, noPersona:true, wide:true,
  aiDelay:()=>1300+Math.random()*1200,
  reset(){ selQ=0; ori=0; anchor=null; sig=''; },
  bar:(v,i)=>{ const seat=HSEAT[i]; const q=maxSq(v.g,seat); return `<span class="tag">${q}×${q} · 🎟️${v.coupon[seat]}</span>`; },
  result:(v,ctx)=>{ const k=(v.rank||[]).indexOf(HSEAT[ctx.me]); return k>=0?`${k+1}등 · ${v.final[HSEAT[ctx.me]].sq}×${v.final[HSEAT[ctx.me]].sq}`:''; },
};
})();
