(function(){
'use strict';
/* 보물섬 (6인: 우리 둘 + NPC 4명). 9×9 섬, 💧물(못 내림), 📦 색깔 상자 9개(점수 5/8/12/15), 🗝️ 보물은 상자가 아닌 땅 한 칸에 숨겨짐.
   화살표 = 점프 벡터(돌리고 뒤집기 가능): ㄱ(1,1) S(2,0) 갈고리(2,1) 번개(3,1) 뱀(4,0) 대형(4,3). 모두 ㄱ·S로 시작.
   7라운드: 경매(1·3·5) — 칩 20개로 몰래 입찰, 많이 낸 순서로 화살표 1개씩 / 탐색(2·4·6·7) — 한 명씩 출발점에서 화살표를 이어
   상자에 닿으면 열기: 처음 연 사람은 상자 점수(그 뒤론 5점) + 그 상자의 보물 단서(연 사람만 봄). 쓴 화살표는 그 라운드 끝.
   아무 땅이나 "파 보기": 보물이면 +20, 즉시 끝. 7라운드 뒤 승점 1등. */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로, 나머지는 NPC */
const N=6, S9=9, START=[8,0], CHIPS=20; let HSEAT=[0,3]; const SEATORD=[0,3,1,4,2,5];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i);
const ALL=[...Array(N).keys()];
const AR={g:['ㄱ',1,1], s:['S',2,0], h:['갈고리',2,1], l:['번개',3,1], n:['뱀',4,0], b:['대형',4,3]};
const POOL=['g','g','g','g','l','l','l','l','s','s','h','h','n','b'];
const PLAN=['auction','explore','auction','explore','auction','explore','explore'];
const BOXC=[['초록',5,'#4caf6a'],['하늘',5,'#7ec8f0'],['노랑',8,'#f0c330'],['흰색',8,'#eeeeee'],['갈색',8,'#a8744a'],['분홍',12,'#f29bc0'],['파랑',12,'#4a7bd0'],['빨강',15,'#e2574c'],['보라',15,'#8e5cc7']];
const STYLE={seojin:'logic', doyun:'emo', haram:'calm', yuna:'emo', minho:'sly', taekyung:'emo', jihu:'sly', soyul:'logic'};
const DEF_P={talk:.6,aggr:.5,trust:.5,bluff:.5,logic:.6,temper:.4};
const nm=i=>`{s${i}}`;
const COLS='ABCDEFGHI';
const cellName=([r,c])=>`${COLS[c]}${S9-r}`;
const key=([r,c])=>r+','+c;
const inB=(r,c)=>r>=0&&r<S9&&c>=0&&c<S9;
function vecs(a){ const [_,x,y]=AR[a]; const out=new Set(); for(const [p,q] of [[x,y],[y,x]]) for(const sx of [1,-1]) for(const sy of [1,-1]) out.add((p*sx)+','+(q*sy)); return [...out].map(v=>v.split(',').map(Number)); }

function init(starter,o){ const k=Math.max(2,Math.min(6,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  let water;
  for(;;){ water=new Set(); const blobs=3+(Math.random()*2|0);
    for(let b=0;b<blobs;b++){ let r=Math.random()*S9|0, c=Math.random()*S9|0; for(let k=0;k<5+(Math.random()*5|0);k++){ if(inB(r,c)) water.add(r+','+c); r+=[-1,1,0,0][Math.random()*4|0]; c+=[0,0,-1,1][Math.random()*4|0]; } }
    water.delete(key(START)); if(water.size>=10&&water.size<=20) break; }
  const land=[]; for(let r=0;r<S9;r++) for(let c=0;c<S9;c++) if(!water.has(r+','+c)&&!(r===START[0]&&c===START[1])) land.push([r,c]);
  const sh=U.shuffle(land.slice()), boxes=[];
  for(const cell of sh){ if(boxes.length>=9) break; if(Math.abs(cell[0]-START[0])+Math.abs(cell[1]-START[1])<3) continue; if(boxes.some(b=>Math.abs(b.at[0]-cell[0])+Math.abs(b.at[1]-cell[1])<2)) continue; boxes.push({at:cell, col:boxes.length, opened:[]}); }
  const treasure=U.pick(land.filter(c=>!boxes.some(b=>key(b.at)===key(c))&&Math.abs(c[0]-START[0])+Math.abs(c[1]-START[1])>=4));
  boxes.forEach(b=>b.hint=makeHint(treasure,boxes,water,b));
  const s={water:[...water], boxes, treasure, round:0, phase:'intro', chips:Array(N).fill(CHIPS), arrows:ALL.map(()=>['g','s']), used:ALL.map(()=>[]), score:Array(N).fill(0),
    known:ALL.map(()=>[]), dug:[], offer:[], bids:Array(N).fill(null), done:HSEAT.map(()=>false), ord:U.shuffle(ALL.slice()), cur:-1, actor:null, path:[], found:null,
    who:{}, usedL:{}, say:null, q:[], log:[], turn:null, starter, winner:null, notice:'🎙️ 보물섬에 오신 걸 환영합니다! 상자 단서로 보물을 찾으세요', ev:0};
  s.hs=HSEAT.slice(); const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=ids[k]);
  return s;
}
function makeHint(T,boxes,water,b){
  const [r,c]=T, kinds=['col','row','water','dist','par'];
  const k=U.pick(kinds);
  if(k==='col'){ const x=1+(Math.random()*7|0); return c>=x?{k,x,side:'ge',text:`보물은 ${COLS[x]}열이거나 그 오른쪽에 있어요`}:{k,x,side:'lt',text:`보물은 ${COLS[x]}열보다 왼쪽에 있어요`}; }
  if(k==='row'){ const x=1+(Math.random()*7|0); return r<x?{k,x,side:'lt',text:`보물은 ${S9-x+1}행보다 위쪽에 있어요`}:{k,x,side:'ge',text:`보물은 ${S9-x+1}행이거나 그 아래에 있어요`}; }
  if(k==='water'){ const near=[[1,0],[-1,0],[0,1],[0,-1]].some(([dr,dc])=>water.has((r+dr)+','+(c+dc))); return {k,v:near,text: near?'보물은 물과 맞닿아 있어요':'보물은 물과 맞닿아 있지 않아요'}; }
  if(k==='dist'){ const d=Math.abs(b.at[0]-r)+Math.abs(b.at[1]-c); const lim=Math.max(2,d+(Math.random()<.5?0:1)); return {k,at:b.at,lim,text:`보물은 이 상자에서 ${lim}칸 이내(가로+세로)에 있어요`}; }
  return {k:'par',v:(S9-r)%2,text:`보물이 있는 행 번호는 ${(S9-r)%2?'홀수':'짝수'}예요`};
}
function fits(h,[r,c],water){
  if(!(water instanceof Set)) water=new Set(water);
  if(h.k==='col') return h.side==='ge'?c>=h.x:c<h.x;
  if(h.k==='row') return h.side==='lt'?r<h.x:r>=h.x;
  if(h.k==='water') return [[1,0],[-1,0],[0,1],[0,-1]].some(([dr,dc])=>water.has((r+dr)+','+(c+dc)))===h.v;
  if(h.k==='dist') return Math.abs(h.at[0]-r)+Math.abs(h.at[1]-c)<=h.lim;
  if(h.k==='par') return (S9-r)%2===h.v;
  return true;
}
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
const isWater=(s,r,c)=>s.water.includes(r+','+c);
const boxAt=(s,cell)=>s.boxes.find(b=>key(b.at)===key(cell));
function nextCells(s,i,from,visited){   // 남은 화살표로 갈 수 있는 칸들 → [{cell, a}]
  const left=s.arrows[i].filter((a,k)=>!s.used[i].includes(k)), out=[];
  s.arrows[i].forEach((a,k)=>{ if(s.used[i].includes(k)) return; for(const [dr,dc] of vecs(a)){ const r=from[0]+dr, c=from[1]+dc; if(!inB(r,c)||isWater(s,r,c)) continue; const kk=r+','+c; if(visited.has(kk)) continue; out.push({cell:[r,c],k}); } });
  return out; }
function candidates(s,i){ const hints=s.known[i].map(bi=>s.boxes[bi].hint); const out=[];
  for(let r=0;r<S9;r++) for(let c=0;c<S9;c++){ if(isWater(s,r,c)||boxAt(s,[r,c])||(r===START[0]&&c===START[1])||s.dug.some(d=>d[0]===r&&d[1]===c)) continue; if(hints.every(h=>fits(h,[r,c],s.water))) out.push([r,c]); }
  return out; }

/* ── 진행 ── */
function startRound(s){
  s.round++; if(s.round>PLAN.length) return endGame(s);
  const kind=PLAN[s.round-1];
  if(kind==='auction'){ s.phase='bid'; const n=N+2; s.offer=[...Array(n)].map(()=>U.pick(POOL)); s.bids=Array(N).fill(null); s.done=HSEAT.map(()=>false);
    for(const i of ALL) if(!isH(i)) s.bids[i]=npcBid(s,i);
    s.notice=`🎙️ ${s.round}라운드 · 화살표 경매 — 몰래 칩을 내세요 (많이 낸 순서로 하나씩 골라요)`; s.log.push(`— ${s.round}라운드: 경매 (${s.offer.map(a=>AR[a][0]).join(', ')}) —`); }
  else { s.phase='explore'; s.used=ALL.map(()=>[]); s.cur=-1; s.ord=ALL.slice().sort((a,b)=>s.score[a]-s.score[b]||Math.random()-.5); s.log.push(`— ${s.round}라운드: 탐색 (점수 낮은 순서) —`); nextExplorer(s); }
}
function settleAuction(s){
  const ord=ALL.filter(i=>s.bids[i]>0).sort((a,b)=>s.bids[b]-s.bids[a]||Math.random()-.5);
  for(const i of ALL) s.chips[i]-=s.bids[i]||0;
  s.pickQ=ord; s.phase='pickArrow'; s.log.push(`🤫 입찰 공개 순서: ${ord.map(i=>`${nm(i)}(${s.bids[i]})`).join(' → ')||'아무도 없음'}`);
  nextPicker(s);
}
function nextPicker(s){
  if(!s.pickQ.length||!s.offer.length){ s.phase='run'; s.q.push({k:'next'}); return; }
  const i=s.pickQ[0]; s.actor=i; s.phase='pickArrow'; s.notice=`🏹 ${nm(i)}이(가) 화살표를 고르는 중…`;
  if(isH(i)) s.turn=pOf(i); else { s.turn=null; s.think=900+Math.random()*700; }
}
function takeArrow(s,i,idx){ const a=s.offer.splice(idx,1)[0]; s.arrows[i].push(a); s.pickQ.shift(); s.log.push(`🏹 ${nm(i)} → ${AR[a][0]}`); s.notice=`🏹 ${nm(i)} → ${AR[a][0]} 화살표`; s.turn=null; s.phase='pickedArrow'; }
function nextExplorer(s){
  s.cur++; if(s.cur>=N){ s.phase='run'; s.q.push({k:'next'}); return; }
  const i=s.ord[s.cur]; s.actor=i; s.path=[START]; s.pathK=[]; s.phase='explore';
  s.notice=`🧭 ${nm(i)} 탐색 중…`;
  if(isH(i)) s.turn=pOf(i); else { s.turn=null; s.think=1300+Math.random()*900; s.plan=npcPlan(s,i); }
}
function openAt(s,i){   // 경로 끝에서 열기/파기
  const end=s.path[s.path.length-1], b=boxAt(s,end);
  if(b){ const first=!b.opened.length; const pts=first?BOXC[b.col][1]:5; if(b.opened.includes(i)) return '이미 연 상자예요';
    b.opened.push(i); s.score[i]+=pts; const bi=s.boxes.indexOf(b); if(!s.known[i].includes(bi)) s.known[i].push(bi);
    s.q.push({k:'note',text:`📦 ${nm(i)}이(가) ${BOXC[b.col][0]} 상자를 열었어요! +${pts}점${first?' (처음!)':''}`});
  } else if(key(end)===key(s.treasure)){ s.score[i]+=20; s.found=i; s.q.push({k:'note',text:`🗝️ ${nm(i)}이(가) ${cellName(end)}에서 보물을 찾았어요!! +20점`}); s.q.push({k:'end'}); }
  else { s.dug.push(end); s.q.push({k:'note',text:`⛏️ ${nm(i)}이(가) ${cellName(end)}을(를) 팠지만… 아무것도 없어요`}); }
  // 이 경로에 쓴 화살표는 이번 라운드 끝
  s.used[i].push(...s.pathK); s.path=[START]; s.pathK=[];
  return null;
}
function endGame(s){
  s.phase='over'; s.turn=null;
  s.rank=ALL.slice().sort((a,b)=>s.score[b]-s.score[a]); s.winner=isH(s.rank[0])?pOf(s.rank[0]):'none'; s.winners=isH(s.rank[0])?[pOf(s.rank[0])]:[];
  s.notice=`🎙️ 탐험 끝! 1등 ${nm(s.rank[0])} ${s.score[s.rank[0]]}점${s.found==null?` · 보물은 ${cellName(s.treasure)}에 있었어요`:''}`; s.log.push(s.notice);
}

/* ── NPC ── */
function npcBid(s,i){ const p=P(s,i), left=PLAN.slice(s.round-1).filter(x=>x==='auction').length; const per=s.chips[i]/left;
  if(Math.random()<.12) return 0; return Math.max(1,Math.min(s.chips[i], Math.round(per*(.5+p.aggr*.9)*(.7+Math.random()*.7)))); }
function npcPickArrow(s,i){ const p=P(s,i); const have=s.arrows[i]; const pref=['b','n','l','h','s','g'];
  return s.offer.map((a,k)=>({k,v:(pref.length-pref.indexOf(a))+(have.includes(a)?-2:0)+Math.random()*(1.5-p.logic)})).sort((x,y)=>y.v-x.v)[0].k; }
function npcPlan(s,i){   // 남은 화살표로 갈 수 있는 목표 중 최고(상자 점수 / 보물 후보)
  const p=P(s,i), cand=candidates(s,i), arrowsLeft=s.arrows[i].map((a,k)=>k);
  const targets=[];
  for(const b of s.boxes) if(!b.opened.includes(i)) targets.push({cell:b.at, v:(b.opened.length?5:BOXC[b.col][1])+ (s.known[i].length<3?3:0)});
  if(cand.length && cand.length<=7+p.aggr*6) for(const c of cand) targets.push({cell:c, v:26/cand.length*(.8+p.aggr*.6)});
  // BFS: 화살표 순서 조합으로 도달 (화살표 각각 한 번)
  const start={cell:START, used:[], seen:new Set([key(START)])}; let frontier=[start], best=null;
  for(let depth=0;depth<s.arrows[i].length&&frontier.length;depth++){ const nf=[];
    for(const st of frontier){ s.arrows[i].forEach((a,k)=>{ if(st.used.includes(k)||s.used[i].includes(k)) return; for(const [dr,dc] of vecs(a)){ const r=st.cell[0]+dr, c=st.cell[1]+dc; if(!inB(r,c)||isWater(s,r,c)||st.seen.has(r+','+c)) continue;
        const ns={cell:[r,c],used:st.used.concat(k),seen:new Set([...st.seen,r+','+c]),path:(st.path||[START]).concat([[r,c]])};
        const t=targets.find(x=>x.cell[0]===r&&x.cell[1]===c); if(t){ const v=t.v/ns.used.length+Math.random()*(1-p.logic); if(!best||v>best.v) best={v,steps:ns.used.map((kk,j)=>({k:kk,cell:ns.path[j+1]}))}; }
        if(nf.length<4000) nf.push(ns); } }); }
    frontier=nf; }
  return best?best.steps:null;
}

/* ── 말 ── */
const LINES={
  sly:{box:['후후, 단서 좋네요~ 😏'], found:['보물은 제 거예요~ 😎'], miss:['어머, 여기가 아니었네~']},
  calm:{box:['…열었어요.'], found:['찾았네요.'], miss:['…없네요.']},
  logic:{box:['단서로 후보가 확 줄었어요.','이제 보물 위치가 좁혀져요.'], found:['계산대로 여기 있었어요.'], miss:['후보에서 하나 지웠어요.']},
  emo:{box:['오 대박 단서!! 😆'], found:['보물이다아아!! 🥳'], miss:['으앙 꽝이야 😭']},
};
function lineOf(s,seat,kind){ const p=P(s,seat), st=STYLE[p.id]||'calm', L=(LINES[st]||{})[kind]; if(!L) return null;
  const used=(s.usedL[seat]=s.usedL[seat]||[]), pool=L.filter(x=>!used.includes(x)); if(!pool.length) return null; const raw=U.pick(pool); used.push(raw); return raw; }

/* ── 시간 흐름 ── */
function stepDelay(s){ syncH(s);
  if(s.winner!=null) return null;
  if(s.phase==='intro') return 2200;
  if(s.q.length) return s.q[0].k==='note'?1500:600;
  if(s.phase==='bid') return s.done.every(Boolean)?900:null;
  if(s.phase==='pickArrow') return isH(s.actor)?null:s.think;
  if(s.phase==='pickedArrow') return 700;
  if(s.phase==='explore') return isH(s.actor)?null:s.think;
  if(s.phase==='npcStep') return 650;
  return null;
}
function step(s){ syncH(s);
  if(s.phase==='intro'){ startRound(s); return; }
  if(s.q.length){ const e=s.q.shift();
    if(e.k==='note'){ s.notice=e.text; s.log.push(e.text); if(e.seat!=null){} }
    else if(e.k==='say'){ const t=lineOf(s,e.seat,e.kind); if(t){ s.say={seat:e.seat,text:t,n:(s.say?s.say.n:0)+1}; s.log.push(`${nm(e.seat)}: ${t}`); } }
    else if(e.k==='next'){ startRound(s); }
    else if(e.k==='end'){ endGame(s); }
    else if(e.k==='nextExp'){ nextExplorer(s); }
    s.ev++; return; }
  if(s.phase==='bid'&&s.done.every(Boolean)){ settleAuction(s); return; }
  if(s.phase==='pickArrow'&&!isH(s.actor)){ takeArrow(s,s.actor,npcPickArrow(s,s.actor)); s.ev++; return; }
  if(s.phase==='pickedArrow'){ nextPicker(s); return; }
  if(s.phase==='explore'&&!isH(s.actor)){ const i=s.actor;
    if(!s.plan){ s.log.push(`🧭 ${nm(i)} 이번엔 쉬어요`); s.phase='run'; s.q.push({k:'nextExp'}); return; }
    s.pathK=[]; s.phase='npcStep'; return; }
  if(s.phase==='npcStep'){ const i=s.actor, st=s.plan.shift(); s.path.push(st.cell); s.pathK.push(st.k); s.notice=`🧭 ${nm(i)}: ${AR[s.arrows[i][st.k]][0]} → ${cellName(st.cell)}`;
    if(!s.plan.length){ const end=st.cell, b=boxAt(s,end); openAt(s,i); s.q.push({k:'say',seat:i,kind: b?'box' : s.found===i?'found':'miss'});
      const more=npcPlan(s,i); if(more&&s.found==null){ s.plan=more; s.pathK=[]; } else { s.plan=null; s.phase='run'; if(s.found==null) s.q.push({k:'nextExp'}); } }
    s.ev++; return; }
}
function apply(s,p,a){ syncH(s);
  if(s.winner!=null) return '게임이 끝났어요';
  const seat=HSEAT[p]; if(!a) return '알 수 없는 동작';
  if(a.k==='bid'){ if(s.phase!=='bid'||s.done[p]) return '입찰할 때가 아니에요'; const x=Math.max(0,Math.min(s.chips[seat],a.x|0)); s.bids[seat]=x; s.done[p]=true; return null; }
  if(a.k==='pickArrow'){ if(s.phase!=='pickArrow'||s.actor!==seat) return '고를 차례가 아니에요'; const k=a.idx|0; if(!(k>=0&&k<s.offer.length)) return '화살표를 고르세요'; takeArrow(s,seat,k); return null; }
  if(s.phase!=='explore'||s.actor!==seat) return '내 차례가 아니에요';
  if(a.k==='step'){ const visited=new Set(s.path.map(key)); const opts=nextCells(s,seat,s.path[s.path.length-1],visited).filter(o=>!(s.pathK||[]).includes(o.k));
    const o=opts.find(x=>x.cell[0]===a.r&&x.cell[1]===a.c); if(!o) return '남은 화살표로 거기 못 가요'; s.pathK=s.pathK||[]; s.path.push(o.cell); s.pathK.push(o.k); return null; }
  if(a.k==='undo'){ if(s.path.length>1){ s.path.pop(); s.pathK.pop(); } return null; }
  if(a.k==='open'){ if(s.path.length<2) return '먼저 화살표를 이어 가세요'; const e=openAt(s,seat); if(e) return e; if(s.found!=null){ s.phase='run'; s.turn=null; } return null; }
  if(a.k==='done'){ s.path=[START]; s.pathK=[]; s.phase='run'; s.turn=null; s.q.push({k:'nextExp'}); return null; }
  return '알 수 없는 동작';
}
function mask(s,p){ syncH(s);
  const v=U.clone(s), me=HSEAT[p], over=s.phase==='over';
  if(!over){ v.treasure=null; v.boxes=s.boxes.map((b,bi)=>({...b, hint: s.known[me].includes(bi)?b.hint:null})); v.known=ALL.map((_,i)=>i===me?s.known[i]:[]);
    v.bids=s.bids.map((b,i)=>i===me||s.phase!=='bid'?b:(b!=null?'done':null)); v.chips=s.chips.map((c,i)=>i===me?c:null); v.plan=null; }
  v.q=[]; v.usedL={};
  return v;
}
function ai(v){ syncH(v); const seat=HSEAT[1];
  if(v.phase==='bid'&&!v.done[1]) return {k:'bid',x:Math.min(v.chips[seat],3+(Math.random()*4|0))};
  if(v.phase==='pickArrow'&&v.actor===seat) return {k:'pickArrow',idx:0};
  if(v.phase==='explore'&&v.actor===seat){ const visited=new Set(v.path.map(key)); const opts=nextCells(v,seat,v.path[v.path.length-1],visited).filter(o=>!(v.pathK||[]).includes(o.k));
    const box=opts.find(o=>v.boxes.some(b=>key(b.at)===key(o.cell)&&!b.opened.includes(seat))); if(box) return v.path.length>1&&boxAt(v,v.path[v.path.length-1])&&!boxAt(v,v.path[v.path.length-1]).opened.includes(seat)?{k:'open'}:{k:'step',r:box.cell[0],c:box.cell[1]};
    const end=v.path[v.path.length-1]; const b=boxAt(v,end); if(b&&!b.opened.includes(seat)) return {k:'open'};
    if(opts.length&&v.path.length<3) { const o=U.pick(opts); return {k:'step',r:o.cell[0],c:o.cell[1]}; }
    return {k:'done'}; }
  return null; }

/* ── 화면 ── */
let WHO={}, bidX=3, sig='';
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}/g,(_,d)=>`${seatEmoji(+d)} ${seatName(+d,ctx)}`); }
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{};
  const me=HSEAT[ctx.me], myExp=v.phase==='explore'&&v.actor===me&&v.turn===ctx.me;
  const sg=v.phase+':'+v.round+':'+v.actor; if(sg!==sig){ sig=sg; }
  const pathSet=new Set((v.path||[]).map(key)), end=(v.path&&v.path.length)?v.path[v.path.length-1]:START;
  const opts = myExp ? nextCells(v,me,end,pathSet).filter(o=>!(v.pathK||[]).includes(o.k)) : [];
  const optSet=new Map(opts.map(o=>[key(o.cell),o]));
  const cand=new Set(candidates(v,me).map(key));
  let h=`<div class="info">${v.round} / ${PLAN.length}라운드 (${PLAN[Math.max(0,v.round-1)]==='auction'?'경매':'탐색'}) · ⭐ 내 점수 <b>${v.score[me]}</b> · 🪙 칩 ${v.chips[me]} · 화살표 ${v.arrows[me].map((a,k)=>`<span class="${v.used[me].includes(k)||(v.pathK||[]).includes(k)&&myExp?'tr-used':''}">${AR[a][0]}</span>`).join(' ')}</div>`;
  h+=`<div class="hl-notice">${fill(v.notice||'',ctx)}</div>`;
  h+=`<div class="vr-speech">${v.say?`<span class="w">${seatEmoji(v.say.seat)} ${seatName(v.say.seat,ctx)}</span> ${fill(U.esc(v.say.text),ctx)}`:'<i>　</i>'}</div>`;
  let g=`<div class="ts-board">`;
  for(let r=0;r<S9;r++) for(let c=0;c<S9;c++){ const k=r+','+c, b=boxAt(v,[r,c]), w=v.water.includes(k), st=r===START[0]&&c===START[1], dug=v.dug.some(d=>d[0]===r&&d[1]===c), tr=v.treasure&&v.treasure[0]===r&&v.treasure[1]===c;
    const cls=['ts-c', w?'w':'', pathSet.has(k)?'path':'', optSet.has(k)?'opt':'', k===key(end)&&v.phase==='explore'?'end':'', cand.has(k)&&v.known[me].length?'cand':''].join(' ');
    g+=`<div class="${cls}" data-rc="${r},${c}">${st?'🚩':b?`<span class="ts-box" style="background:${BOXC[b.col][2]}">${b.opened.includes(me)?'✓':BOXC[b.col][1]}</span>`:tr?'🗝️':dug?'⛏️':''}${optSet.has(k)?`<i class="ts-a">${AR[v.arrows[me][optSet.get(k).k]][0]}</i>`:''}</div>`; }
  g+=`</div>`; h+=g;
  if(myExp){ const b=boxAt(v,end); h+=`<div class="vr-card"><b>🧭 내 탐색</b><p>초록 칸을 누르면 그 화살표로 이동해요. ${end&&!(end[0]===START[0]&&end[1]===START[1])?`지금 ${cellName(end)}`:'출발점 🚩'}</p>
      <div class="fh-act">${v.path.length>1?`<button data-a="open">${b?(b.opened.includes(me)?'(이미 연 상자)':`📦 ${BOXC[b.col][0]} 상자 열기`):'⛏️ 여기 파 보기'}</button><button class="ghost" data-a="undo">한 칸 취소</button>`:''}<button class="ghost" data-a="done">탐색 끝내기</button></div><small>상자를 열거나 파면 그 길에 쓴 화살표는 이번 라운드 끝. 남은 화살표로 출발점부터 다시 갈 수 있어요.</small></div>`; }
  if(v.phase==='bid'&&!v.done[ctx.me]) h+=`<div class="vr-card"><b>🤫 화살표 경매</b><p>매물: ${v.offer.map(a=>`${AR[a][0]}(${AR[a][1]},${AR[a][2]})`).join(' · ')}</p><div class="fh-act"><input type="range" min="0" max="${v.chips[me]}" value="${Math.min(bidX,v.chips[me])}" id="tsB"><b id="tsBv">${Math.min(bidX,v.chips[me])}</b>칩<button data-a="bid">입찰</button></div><small>0이면 이번엔 안 받아요. 많이 낸 순서로 하나씩 골라요.</small></div>`;
  else if(v.phase==='bid') h+=`<div class="info">입찰했어요 — 다른 사람을 기다리는 중…</div>`;
  if(v.phase==='pickArrow'&&v.actor===me&&v.turn===ctx.me) h+=`<div class="vr-card"><b>🏹 화살표 고르기</b><div class="fh-act">${v.offer.map((a,k)=>`<button data-pk="${k}">${AR[a][0]} (${AR[a][1]},${AR[a][2]})</button>`).join('')}</div></div>`;
  if(v.phase==='over'&&v.rank) h+=`<div class="sn-score">${v.rank.map((i,k)=>`<div class="${isH(i)?'h':''}"><b>${k+1}등 ${seatEmoji(i)} ${seatName(i,ctx)} ${v.score[i]}점</b>${v.found===i?' <small>🗝️ 보물 발견!</small>':''}</div>`).join('')}</div>`;
  const L=`<div class="side-box"><div class="side-h">🗒️ 내 단서 <small>내가 연 상자만</small></div>${v.known[me].map(bi=>`<div class="rr-h"><span class="ts-box s" style="background:${BOXC[v.boxes[bi].col][2]}"></span> ${BOXC[v.boxes[bi].col][0]}: ${v.boxes[bi].hint?v.boxes[bi].hint.text:''}</div>`).join('')||'<small style="color:#888">상자를 열면 보물 단서가 쌓여요</small>'}
    ${v.known[me].length?`<div class="rr-h">🔎 남은 보물 후보 <b>${cand.size}</b>칸 (판에 노란 테두리)</div>`:''}
    <div class="side-h" style="margin-top:6px">🧠 탐험가</div>${ALL.slice().sort((a,b)=>v.score[b]-v.score[a]).map(i=>`<div class="side-row ${i===me?'me':''}" style="flex-wrap:wrap">${seatEmoji(i)} ${seatName(i,ctx)} ${isH(i)?'':`<small>${NPCI(i)[2]}</small>`}<span>⭐ ${v.score[i]}</span><div class="hl-st">화살표 ${v.arrows[i].map(a=>AR[a][0]).join(' ')} · 연 상자 ${v.boxes.filter(b=>b.opened.includes(i)).length}</div></div>`).join('')}</div>`;
  const R=`<div class="side-box side-log"><div class="side-h">📜 진행 기록 <small>최근이 위</small></div>${v.log.slice(-60).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=`<div class="side3"><div class="side-mid">${h}</div><aside class="side-l">${L}</aside><aside class="side-r">${R}</aside></div>`;
  el.oninput=e=>{ if(e.target.id==='tsB'){ bidX=+e.target.value; const b=el.querySelector('#tsBv'); if(b) b.textContent=bidX; } };
  el.onclick=e=>{
    const c=e.target.closest('[data-rc]'); if(c&&myExp){ const [r,cc]=c.dataset.rc.split(',').map(Number); if(optSet.has(r+','+cc)) return ctx.act({k:'step',r,c:cc}); return; }
    const pk=e.target.closest('[data-pk]'); if(pk) return ctx.act({k:'pickArrow',idx:+pk.dataset.pk});
    const a=e.target.closest('[data-a]'); if(!a) return; const k=a.dataset.a;
    if(k==='bid') return ctx.act({k:'bid',x:bidX}); if(k==='open'||k==='undo'||k==='done') return ctx.act({k});
  };
}
function status(v,ctx){ syncH(v); const me=HSEAT[ctx.me]; if(v.phase==='over') return ''; if(v.phase==='bid') return v.done[ctx.me]?'다른 사람 입찰 중…':'몰래 입찰하세요'; if(v.phase==='explore'&&v.actor===me) return '화살표를 이어 상자를 여세요'; if(v.phase==='pickArrow'&&v.actor===me) return '화살표를 고르세요'; return '다른 사람 차례…'; }
const guide=`
<p><b>6인 보물 탐험</b>(우리 둘 + 성격 다른 컴퓨터 플레이어 4명). 9×9 섬에서 화살표를 이어 📦 상자를 열고, 단서를 모아 🗝️ 보물을 찾아요.</p>
<ul><li><b>화살표</b> = 점프(돌리고 뒤집기 가능): ㄱ(1,1) · S(2,0) · 갈고리(2,1) · 번개(3,1) · 뱀(4,0) · 대형(4,3). 💧물에는 못 내리고, 한 길에서 같은 칸을 두 번 밟을 수 없어요. 모두 ㄱ·S로 시작.</li>
<li><b>경매</b>(1·3·5라운드): 칩 ${CHIPS}개로 몰래 입찰 → 많이 낸 순서로 화살표 하나씩.</li>
<li><b>탐색</b>(2·4·6·7라운드, 점수 낮은 사람부터): 🚩에서 화살표를 이어 상자에 닿으면 열기 — <b>처음 연 사람은 상자 점수</b>(5~15), 그 뒤엔 5점. <b>단서는 연 사람만</b> 봐요. 쓴 화살표는 그 라운드 끝, 남은 화살표로 🚩부터 다시 가도 돼요.</li>
<li>상자가 아닌 땅에서 <b>⛏️ 파 보기</b>: 보물이면 +20점, 게임 즉시 끝!</li>
<li>7라운드 뒤 점수 1등.</li></ul>
<div class="tipbox">💡 <b>팁</b><br>· 단서를 모을수록 판에 남은 보물 후보(노란 테두리)가 줄어요.<br>· 컴퓨터도 자기 단서로 후보를 좁히다가 몇 칸 안 남으면 파러 가요!</div>`;
window.GAMES.treasure = { _sync:x=>syncH(x), maxH:6,
  title:'보물섬', ref:'데블스 플랜 「보물섬」', emoji:'🗺️', tags:['탐험','경매','추리','NPC','두뇌서바이벌'],
  tagline:'우리 둘 + 컴퓨터 4명. 점프 화살표를 경매로 모아 상자를 열고, 나만 아는 단서로 보물을 찾아라.',
  guide, init, apply, mask, ai, render, status, step, stepDelay, noPersona:true, wide:true,
  aiDelay:()=>1100+Math.random()*1200,
  reset(){ sig=''; },
  bar:(v,i)=>`<span class="tag">⭐ ${v.score[HSEAT[i]]}</span>`,
  result:(v,ctx)=>{ const k=(v.rank||[]).indexOf(HSEAT[ctx.me]); return k>=0?`${k+1}등 · ${v.score[HSEAT[ctx.me]]}점`:''; },
};
})();
