(function(){
'use strict';
/* 동물원 (6인: 우리 둘 + NPC 4명). 5×5 우리에 동물 타일을 위에서 떨어뜨려 쌓음(사목처럼).
   각자 동물 카드 3장의 순서를 비밀로 정한 "조합"(1장만 공개) + 비밀 개인 조건("X가 Y보다 많다").
   5라운드: A·B 그룹 타일 4장씩 공개 → 모두 비밀 입찰(크레딧 30, 매 라운드 1 이상, 한 그룹에) →
   입찰 합계가 "적은" 그룹이 낙찰, 그 그룹에서 가장 많이 건 사람이 4장을 원하는 칸에 떨어뜨림. 다른 그룹 타일은 버림.
   동률이면 크레딧 돌려주고 다시. 끝나면 내 조합이 가로·세로·대각선으로 이어진 곳마다(거꾸로도) 1점, 개인 조건 맞으면 ×2. */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로, 나머지는 NPC */
const N=6, W=5, H=5, ROUNDS=5, START=30; let HSEAT=[0,3]; const SEATORD=[0,3,1,4,2,5];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i);
const ALL=[...Array(N).keys()];
const AN=['s','p','e','l','m'], AE={s:'🐍',p:'🦜',e:'🐘',l:'🦁',m:'🐒'}, AK={s:'뱀',p:'앵무새',e:'코끼리',l:'사자',m:'원숭이'};
const STYLE={seojin:'logic', doyun:'emo', haram:'calm', yuna:'emo', minho:'sly', taekyung:'emo', jihu:'sly', soyul:'logic'};
const DEF_P={talk:.6,aggr:.5,trust:.5,bluff:.5,logic:.6,temper:.4};
const nm=i=>`{s${i}}`;
const DIRS=[[1,0],[0,1],[1,1],[1,-1]];

function emptyBoard(){ return [...Array(H)].map(()=>Array(W).fill(null)); }   // b[row][col], row 0 = 맨 아래
function drop(b,c,a){ for(let r=0;r<H;r++) if(!b[r][c]){ b[r][c]=a; return r; } return -1; }
function combos(b,cmb){ let n=0; const rev=cmb.slice().reverse(), pal=cmb.join()===rev.join();
  for(let r=0;r<H;r++) for(let c=0;c<W;c++) for(const [dc,dr] of DIRS){ const cs=[0,1,2].map(k=>[r+dr*k,c+dc*k]); if(cs.some(([y,x])=>y<0||y>=H||x<0||x>=W)) continue;
    const seq=cs.map(([y,x])=>b[y][x]); if(seq.some(v=>!v)) continue; const k=seq.join(); if(k===cmb.join()) n++; if(!pal&&k===rev.join()) n++; }
  return n; }
function count(b,a){ let n=0; for(const row of b) for(const v of row) if(v===a) n++; return n; }
function condOk(b,cd){ return count(b,cd[0])>count(b,cd[1]); }
function scoreOf(b,cmb,cd){ const n=combos(b,cmb); return n*(condOk(b,cd)?2:1); }

function init(starter,o){ const k=Math.max(2,Math.min(6,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  const deck=U.shuffle(AN.flatMap(a=>Array(6).fill(a)));
  const pool={A:U.shuffle(AN.flatMap(a=>Array(4).fill(a))), B:U.shuffle(AN.flatMap(a=>Array(4).fill(a)))};
  const conds=[]; for(let i=0;i<AN.length;i++) for(let j=i+1;j<AN.length;j++) conds.push(Math.random()<.5?[AN[i],AN[j]]:[AN[j],AN[i]]);
  U.shuffle(conds);
  const s={board:emptyBoard(), pool, combo:ALL.map(()=>null), shown:Array(N).fill(null), hand:ALL.map(()=>deck.splice(0,3)), cond:ALL.map((_,i)=>conds[i]),
    cr:Array(N).fill(START), round:0, phase:'setup', ready:HSEAT.map(()=>false), tiles:null, bids:Array(N).fill(null), bidIdx:0, ord:U.shuffle(ALL.slice()),
    revIdx:0, winG:null, placer:null, toPlace:[], q:[], who:{}, used:{}, say:null, guesses:[], hist:[], placed:ALL.map(()=>[]), log:[], turn:null, starter, winner:null,
    notice:'🎙️ 동물 카드 3장의 순서를 정하고, 그중 1장을 공개하세요', ev:0};
  s.hs=HSEAT.slice(); const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=ids[k]);
  for(const i of ALL) if(!isH(i)){ s.combo[i]=U.shuffle(s.hand[i].slice()); s.shown[i]=U.pick([0,1,2]); }
  return s;
}
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;

/* ── 진행 ── */
function startRound(s){
  s.round++; s.tiles={A:s.pool.A.splice(0,4), B:s.pool.B.splice(0,4)}; s.tileShown=0; s.bids=Array(N).fill(null); s.bidIdx=0; s.revIdx=0; s.winG=null; s.placer=null; s.toPlace=[];
  if(s.round>1) s.ord = s.round%2===0 ? s.ord.slice().reverse() : s.ord.slice().reverse();   // 정순·역순 번갈아
  s.phase='tiles'; s.notice=`🎙️ ${s.round}라운드! 이번 타일을 한 장씩 공개합니다`; s.log.push(`— ${s.round}라운드 —`);
}
function nextBidder(s){
  while(s.bidIdx<N && s.bids[s.ord[s.bidIdx]]) s.bidIdx++;
  if(s.bidIdx>=N){ s.phase='reveal'; s.revIdx=0; s.notice='🎙️ 입찰 끝! 한 명씩 공개합니다'; s.turn=null; return; }
  const i=s.ord[s.bidIdx]; s.actor=i; s.phase='bid';
  s.notice=`💭 ${nm(i)} 입찰 중… (비공개)`;
  if(isH(i)) s.turn=pOf(i); else { s.turn=null; s.think=900+Math.random()*1500*(.6+P(s,i).logic*.6); }
}
function placeBid(s,i,g,n){ s.bids[i]={g,n}; s.cr[i]-=n; s.log.push(`🤫 ${nm(i)} 입찰 완료`); s.notice=`🤫 ${nm(i)} 입찰 완료`; s.bidIdx++; s.phase='bidded'; s.turn=null; }
function settle(s){
  const tot={A:0,B:0}; for(const b of s.bids) tot[b.g]+=b.n;
  const g = tot.A<tot.B ? 'A' : tot.B<tot.A ? 'B' : null;
  let placer=null;
  if(g){ const inG=ALL.filter(i=>s.bids[i].g===g); if(inG.length){ const mx=Math.max(...inG.map(i=>s.bids[i].n)); const top=inG.filter(i=>s.bids[i].n===mx); if(top.length===1) placer=top[0]; } }
  s.hist.push({r:s.round, tiles:s.tiles, bids:s.bids.slice(), tot, g, placer});
  if(!g || placer==null){   // 동률 → 돌려주고 다시 (두 번째 동률이면 무작위)
    s.retry=(s.retry||0)+1;
    if(s.retry<=2){ for(const i of ALL) s.cr[i]+=s.bids[i].n; s.notice=`⚖️ 동률! (A ${tot.A} · B ${tot.B}) 크레딧을 돌려주고 다시 입찰해요`; s.log.push(s.notice); s.bids=Array(N).fill(null); s.bidIdx=0; s.phase='rebid'; return; }
    const gg=g||U.pick(['A','B']); const inG=ALL.filter(i=>s.bids[i].g===gg); placer = inG.length ? U.pick(inG.filter(i=>s.bids[i].n===Math.max(...inG.map(j=>s.bids[j].n)))) : U.pick(ALL);
    s.winG=gg; s.placer=placer; s.retry=0;
    s.notice=`⚖️ 또 동률… 추첨으로 ${gg} 그룹, ${nm(placer)}이(가) 놓아요`; s.log.push(s.notice);
  } else { s.retry=0; s.winG=g; s.placer=placer; s.notice=`🏆 합계 A ${tot.A} · B ${tot.B} → 적은 ${g} 그룹 낙찰! 가장 많이 건 ${nm(placer)}이(가) 놓습니다`; s.log.push(s.notice); }
  s.toPlace=s.tiles[s.winG].slice(); s.phase='place';
  if(isH(s.placer)) s.turn=pOf(s.placer); else { s.turn=null; s.think=1400; s.plan=npcPlan(s,s.placer); }
  s.q.push({k:'react',kind:'win',i:s.placer});
}
function placeOne(s,i,tileIdx,col){
  const a=s.toPlace[tileIdx]; const r=drop(s.board,col,a); if(r<0) return false;
  s.toPlace.splice(tileIdx,1); s.placed[i].push({a,c:col,r,round:s.round}); s.lastDrop={r,c:col};
  s.notice=`⬇️ ${nm(i)}: ${AE[a]} ${AK[a]}을(를) ${col+1}번 줄에`; s.log.push(s.notice);
  return true;
}
function afterPlace(s){
  if(s.toPlace.length && colsOpen(s).length) return;
  s.toPlace=[]; s.turn=null;
  if(Math.random()<.8) s.q.push({k:'react',kind:'guess'});
  if(s.round>=ROUNDS) s.phase='end'; else s.phase='next';
}
const colsOpen=s=>[...Array(W).keys()].filter(c=>!s.board[H-1][c]);
function endGame(s){
  s.phase='over'; s.turn=null;
  s.final=ALL.map(i=>({n:combos(s.board,s.combo[i]), cond:condOk(s.board,s.cond[i]), sc:scoreOf(s.board,s.combo[i],s.cond[i])}));
  const rank=ALL.slice().sort((a,b)=>s.final[b].sc-s.final[a].sc || s.cr[b]-s.cr[a]); s.rank=rank;
  s.winner = isH(rank[0]) ? pOf(rank[0]) : 'none'; s.winners=isH(rank[0])?[pOf(rank[0])]:[];
  s.notice=`🎙️ 최종 1등: ${nm(rank[0])} (${s.final[rank[0]].sc}점)`; s.log.push(s.notice);
}

/* ── NPC ── */
function bestPlace(b,tiles,me_cmb,cd,deep){   // 4장을 어디에 놓을지: deep면 전부 찾아봄, 아니면 한 장씩 욕심
  const base=scoreOf(b,me_cmb,cd);
  if(!deep){ const bb=b.map(r=>r.slice()), seq=[]; const rest=tiles.slice();
    while(rest.length){ let best=null; for(let t=0;t<rest.length;t++) for(let c=0;c<W;c++){ if(bb[H-1][c]) continue; const cp=bb.map(r=>r.slice()); drop(cp,c,rest[t]); const v=scoreOf(cp,me_cmb,cd)+combos(cp,me_cmb)*.2+Math.random()*.3; if(!best||v>best.v) best={t,c,v}; }
      if(!best) break; drop(bb,best.c,rest[best.t]); seq.push({a:rest[best.t],c:best.c}); rest.splice(best.t,1); }
    return {seq, gain:scoreOf(bb,me_cmb,cd)-base}; }
  let best=null; const perms=[]; (function pm(a,acc){ if(!a.length){ perms.push(acc); return; } const seen=new Set(); a.forEach((x,i)=>{ if(seen.has(x)) return; seen.add(x); pm(a.slice(0,i).concat(a.slice(i+1)),acc.concat(x)); }); })(tiles,[]);
  for(const pmt of perms){ const rec=(bb,k,seq)=>{ if(k===pmt.length){ const v=scoreOf(bb,me_cmb,cd)+combos(bb,me_cmb)*.2+Math.random()*.05; if(!best||v>best.v) best={v,seq,bb}; return; }
      for(let c=0;c<W;c++){ if(bb[H-1][c]) continue; const cp=bb.map(r=>r.slice()); drop(cp,c,pmt[k]); rec(cp,k+1,seq.concat({a:pmt[k],c})); } };
    rec(b.map(r=>r.slice()),0,[]); }
  return best ? {seq:best.seq, gain:scoreOf(best.bb,me_cmb,cd)-base} : {seq:[],gain:0};
}
function npcPlan(s,i){ const p=P(s,i); return bestPlace(s.board,s.toPlace,s.combo[i],s.cond[i], p.logic>=.7).seq; }
function npcBid(s,i){
  const p=P(s,i), left=ROUNDS-s.round, maxNow=s.cr[i]-left;   // 남은 라운드마다 최소 1은 남겨 둠
  const vA=bestPlace(s.board,s.tiles.A,s.combo[i],s.cond[i],false).gain, vB=bestPlace(s.board,s.tiles.B,s.combo[i],s.cond[i],false).gain;
  const pot=g=>s.tiles[g].filter(x=>s.combo[i].includes(x)).length*.45;   // 당장 점수가 안 나도 내 조합 동물이 많으면 가치 있음
  const wA=vA+pot('A'), wB=vB+pot('B');
  let g = wA===wB ? U.pick(['A','B']) : wA>wB ? 'A' : 'B';
  const v=Math.max(wA,wB);
  // 머리 좋은 쪽: 원하는 그룹에 크게 걸면 그 그룹 합계가 커져 질 수 있음 → 원하는 게 별로 없으면 반대쪽에 1만 걸어 판을 흔듦
  if(v<.5 && Math.random()<.5+p.logic*.4) return {g: g==='A'?'B':'A', n:1};
  const per=START/ROUNDS;
  let n=Math.round(per*(.6+p.aggr*.9)*(v>=2?1.6:v>=1?1.15:.6) + (Math.random()-.5)*3);
  if(left===0) n=s.cr[i];                                   // 마지막 라운드: 다 씀
  n=Math.max(1,Math.min(maxNow,n));
  return {g,n};
}
function guessLine(s){   // 누군가 지금까지 놓은 모양으로 남의 조합을 짐작
  const cands=ALL.filter(i=>!isH(i)); if(!cands.length) return null;
  const by=cands.sort((a,b)=>P(s,b).logic-P(s,a).logic+(Math.random()-.5)*.8)[0];
  const tgt=ALL.filter(j=>j!==by&&s.placed[j].length).sort(()=>Math.random()-.5)[0]; if(tgt==null) return null;
  const cnt={}; for(const x of s.placed[tgt]) cnt[x.a]=(cnt[x.a]||0)+1; const fav=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0];
  const right=s.combo[tgt].includes(fav);
  s.guesses.push({by,t:tgt,a:fav,r:s.round,right});
  return {by,t:tgt,a:fav};
}

/* ── 말 ── */
const LINES={
  sly:{win:['후후, 제가 놓을게요~','이 판은 제 손에 있네요 😏'], lose:['쳇, 다음 판~'], guess:['{t}, 계속 {a} 근처에 놓던데요~? 조합에 {a} 있죠? 😏'], big:['헉, {t} 그렇게나 걸었어요? 😏'], drop:['오~ 거기?']},
  calm:{win:['제가 놓죠.'], lose:['…다음.'], guess:['{t}, {a} 조합이네요.'], big:['…{t}, 크게 걸었네.'], drop:['…음.']},
  logic:{win:['계산대로 제가 놓게 됐네요.','합계가 적은 쪽에 최고액 — 예상대로예요.'], lose:['역설이죠. 많이 걸수록 그룹이 무거워져요.'], guess:['배치 패턴상 {t} 조합엔 {a}가 있어요.','{t}가 놓은 자리 보면 {a} 줄을 만들고 있어요.'], big:['{t}, 그 금액이면 남은 라운드가 힘들 텐데요.'], drop:['그 자리는 대각선까지 생각한 거네요.']},
  emo:{win:['내가 놓는다!! 🙌','와 제가 낙찰이에요?! 😆'], lose:['에이 아깝다 😢'], guess:['{t}!! 맨날 {a}만 놓잖아요 ㅋㅋ','{t} 조합 {a} 맞죠?! 🤨'], big:['헉 {t} 미쳤어요?! 😱'], drop:['아 왜 거기 놔요!! 😭','오 좋다!!']},
};
function lineOf(s,seat,kind,t,a){ const p=P(s,seat), st=STYLE[p.id]||'calm', L=(LINES[st]||{})[kind]; if(!L) return null;
  const used=(s.used[seat]=s.used[seat]||[]), pool=L.filter(x=>!used.includes(x)); if(!pool.length) return null; const raw=U.pick(pool); used.push(raw);
  return raw.split('{t}').join(t!=null?nm(t):'').split('{a}').join(a?AE[a]+AK[a]:''); }
function react(s,e){
  let seat=null, text=null;
  if(e.kind==='win'&&!isH(e.i)){ seat=e.i; text=lineOf(s,seat,'win'); }
  else if(e.kind==='big'){ const o=ALL.filter(j=>!isH(j)&&j!==e.i); if(o.length){ seat=U.pick(o); text=lineOf(s,seat,'big',e.i); } }
  else if(e.kind==='drop'){ const o=ALL.filter(j=>!isH(j)&&j!==e.i); if(o.length&&Math.random()<.5){ seat=U.pick(o); text=lineOf(s,seat,'drop'); } }
  else if(e.kind==='guess'){ const g=guessLine(s); if(g){ seat=g.by; text=lineOf(s,seat,'guess',g.t,g.a); } }
  if(seat!=null&&text){ s.say={seat,text,n:(s.say?s.say.n:0)+1}; s.log.push(`${nm(seat)}: ${text}`); }
}

/* ── 시간 흐름 ── */
function stepDelay(s){ syncH(s);
  if(s.winner!=null) return null;
  if(s.q.length) return 1300;
  if(s.phase==='setup') return s.ready.every(Boolean)?800:null;
  if(s.phase==='tiles') return 650;
  if(s.phase==='bid') return isH(s.actor)?null:s.think;
  if(s.phase==='bidded'||s.phase==='rebid') return 900;
  if(s.phase==='reveal') return 1100;
  if(s.phase==='place') return isH(s.placer)?null:s.think;
  if(s.phase==='next') return 1600;
  if(s.phase==='end') return 1500;
  return null;
}
function step(s){ syncH(s);
  if(s.q.length){ react(s,s.q.shift()); s.ev++; return; }
  if(s.phase==='setup'){ s.log.push('🎙️ 동물원 경매를 시작합니다! 합계가 적은 그룹이 낙찰돼요'); startRound(s); return; }
  if(s.phase==='tiles'){ if(s.tileShown<8){ s.tileShown++; const g=s.tileShown<=4?'A':'B', a=s.tiles[g][(s.tileShown-1)%4]; s.notice=`🃏 ${g} 그룹 ${(s.tileShown-1)%4+1}번째: ${AE[a]} ${AK[a]}`; } else { s.notice='🎙️ 입찰을 시작합니다 (한 그룹에 1 이상, 비공개)'; nextBidder(s); } s.ev++; return; }
  if(s.phase==='bid'&&!isH(s.actor)){ const b=npcBid(s,s.actor); placeBid(s,s.actor,b.g,b.n); return; }
  if(s.phase==='bidded'||s.phase==='rebid'){ nextBidder(s); return; }
  if(s.phase==='reveal'){ if(s.revIdx<N){ const i=s.ord[s.revIdx++], b=s.bids[i]; s.notice=`📣 ${nm(i)}: ${b.g} 그룹에 ${b.n}`; s.log.push(s.notice); if(b.n>=10&&Math.random()<.7) s.q.push({k:'react',kind:'big',i}); s.ev++; return; } settle(s); s.ev++; return; }
  if(s.phase==='place'&&!isH(s.placer)){ const mv=(s.plan||[]).shift(); let ok=false;
    if(mv){ const ti=s.toPlace.indexOf(mv.a); if(ti>=0) ok=placeOne(s,s.placer,ti,mv.c); }
    if(!ok){ const c=U.pick(colsOpen(s)); if(c!=null) placeOne(s,s.placer,0,c); }
    s.think=1100; if(Math.random()<.25) s.q.push({k:'react',kind:'drop',i:s.placer}); afterPlace(s); s.ev++; return; }
  if(s.phase==='next'){ startRound(s); return; }
  if(s.phase==='end'){ endGame(s); return; }
}
function apply(s,p,a){ syncH(s);
  if(s.winner!=null) return '게임이 끝났어요';
  if(!a) return '알 수 없는 동작';
  const seat=HSEAT[p];
  if(a.k==='setup'){
    if(s.phase!=='setup') return '이미 시작했어요';
    const ord=a.order; if(!Array.isArray(ord)||ord.length!==3||new Set(ord).size!==3||ord.some(x=>!(x>=0&&x<3))) return '순서를 정하세요';
    if(!(a.shown>=0&&a.shown<3)) return '공개할 카드를 고르세요';
    s.combo[seat]=ord.map(k=>s.hand[seat][k]); s.shown[seat]=a.shown; s.ready[p]=true; s.ev++; return null;
  }
  if(a.k==='bid'){
    if(s.phase!=='bid'||s.actor!==seat) return '내 입찰 차례가 아니에요';
    const left=ROUNDS-s.round, n=a.n|0; if(a.g!=='A'&&a.g!=='B') return '그룹을 고르세요';
    if(n<1) return '1 이상 걸어야 해요'; if(n>s.cr[seat]-left) return `남은 라운드에 1씩은 남겨야 해요 (최대 ${s.cr[seat]-left})`;
    placeBid(s,seat,a.g,n); s.ev++; return null;
  }
  if(a.k==='place'){
    if(s.phase!=='place'||s.placer!==seat) return '내가 놓을 차례가 아니에요';
    const ti=a.t|0, c=a.c|0; if(!(ti>=0&&ti<s.toPlace.length)) return '타일을 고르세요'; if(!(c>=0&&c<W)||s.board[H-1][c]) return '그 줄은 꽉 찼어요';
    placeOne(s,seat,ti,c); afterPlace(s); s.ev++; return null;
  }
  return '알 수 없는 동작';
}
function mask(s,p){ syncH(s);
  const v=U.clone(s), me=HSEAT[p], over=s.phase==='over';
  if(!over){ v.combo=s.combo.map((c,i)=> i===me ? c : null); v.cond=s.cond.map((c,i)=> i===me ? c : null); v.hand=s.hand.map((h,i)=> i===me ? h : null);
    v.shownA=s.combo.map((c,i)=> c&&s.shown[i]!=null ? c[s.shown[i]] : null);
    v.cr=s.cr.map((x,i)=> i===me ? x : null);
    v.bids=s.bids.map((b,i)=> i===me ? b : s.phase==='reveal'&&s.ord.indexOf(i)<s.revIdx ? b : (b?'done':null));
    v.pool={A:s.pool.A.length,B:s.pool.B.length}; v.guesses=s.guesses.map(g=>({...g,right:undefined})); }
  else v.shownA=s.combo.map((c,i)=> c[s.shown[i]]);
  v.plan=null; v.q=[]; v.used={}; v.think=null;
  return v;
}
/* ── 혼자 모드: 4번 자리를 컴퓨터가 ── */
function ai(v){ syncH(v);
  const seat=HSEAT[1];
  if(v.phase==='setup'&&!v.ready[1]) return {k:'setup',order:U.shuffle([0,1,2]),shown:U.pick([0,1,2])};
  if(v.phase==='bid'&&v.actor===seat){ const left=ROUNDS-v.round, mx=v.cr[seat]-left; const vA=bestPlace(v.board,v.tiles.A,v.combo[seat],v.cond[seat],false).gain, vB=bestPlace(v.board,v.tiles.B,v.combo[seat],v.cond[seat],false).gain;
    return {k:'bid',g:vA>=vB?'A':'B',n:Math.max(1,Math.min(mx,left===0?v.cr[seat]:Math.round(5+Math.random()*4)))}; }
  if(v.phase==='place'&&v.placer===seat){ const pl=bestPlace(v.board,v.toPlace,v.combo[seat],v.cond[seat],false).seq[0]; if(pl) return {k:'place',t:v.toPlace.indexOf(pl.a),c:pl.c}; const c=[0,1,2,3,4].find(c=>!v.board[H-1][c]); return {k:'place',t:0,c}; }
  return null;
}

/* ── 화면 ── */
let WHO={}, sig='', ord3=[0,1,2], shown=0, bidG='A', bidN=3, selTile=0;
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}/g,(_,d)=>`${seatEmoji(+d)} ${seatName(+d,ctx)}`); }
const tile=a=>a?`<span class="zo-t">${AE[a]}</span>`:'';
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{};
  const me=HSEAT[ctx.me];
  const sg=v.phase+':'+v.round; if(sg!==sig){ sig=sg; selTile=0; if(v.phase==='bid'){ const left=ROUNDS-v.round; bidN=Math.max(1,Math.min(v.cr[me]-left,bidN)); } }
  const myCmb=v.combo[me], myCd=v.cond[me];
  let h=`<div class="info">${v.round?`${v.round} / ${ROUNDS}라운드`:'준비'} · 💰 내 크레딧 ${v.cr[me]}${myCmb?` · 내 조합 ${myCmb.map(a=>AE[a]).join('→')}`:''}${myCd?` · 개인 조건: ${AE[myCd[0]]} > ${AE[myCd[1]]}이면 ×2`:''}${myCmb?` · 지금 <b>${scoreOf(v.board,myCmb,myCd)}점</b>`:''}</div>`;
  h+=`<div class="hl-notice">${fill(v.notice||'',ctx)}</div>`;
  h+=`<div class="vr-speech">${v.say?`<span class="w">${seatEmoji(v.say.seat)} ${seatName(v.say.seat,ctx)}</span> ${fill(U.esc(v.say.text),ctx)}`:'<i>　</i>'}</div>`;
  // 타일 그룹
  if(v.tiles&&v.phase!=='setup'&&v.phase!=='over'){ const shownN=v.phase==='tiles'?v.tileShown:8;
    h+=`<div class="zo-groups">${['A','B'].map((g,gi)=>`<div class="zo-g ${v.winG===g?'win':v.winG&&v.winG!==g?'lose':''}"><b>${g} 그룹</b><div>${v.tiles[g].map((a,k)=>gi*4+k<shownN?tile(a):'<span class="zo-t back">?</span>').join('')}</div></div>`).join('')}</div>`; }
  // 보드 (위가 5층)
  const placing = v.phase==='place'&&v.placer===me&&v.turn===ctx.me;
  h+=`<div class="zo-board">${[...Array(H)].map((_,k)=>{ const r=H-1-k; return [...Array(W)].map((_,c)=>{ const a=v.board[r][c], last=v.lastDrop&&v.lastDrop.r===r&&v.lastDrop.c===c; return `<div class="zo-c ${last?'last':''}">${a?AE[a]:''}</div>`; }).join(''); }).join('')}
    ${[...Array(W)].map((_,c)=>`<button class="zo-col" data-col="${c}" ${placing&&!v.board[H-1][c]?'':'disabled'}>⬇️ ${c+1}</button>`).join('')}</div>`;
  if(placing) h+=`<div class="vr-card"><b>⬇️ 내가 놓을 차례</b><p>타일을 고르고 위 ⬇️ 버튼으로 떨어뜨리세요 (${v.toPlace.length}장 남음)</p><div class="fh-act">${v.toPlace.map((a,k)=>`<button class="${selTile===k?'':'ghost'}" data-tile="${k}">${AE[a]} ${AK[a]}</button>`).join('')}</div></div>`;
  // 사람들
  h+=`<div class="rr-people">${v.ord.map(i=>{ const b=v.bids[i]; return `<div class="rr-p ${v.actor===i&&v.phase==='bid'?'act':''} ${v.placer===i&&v.phase==='place'?'act':''}"><b>${seatEmoji(i)} ${seatName(i,ctx)}</b>${isH(i)?'':`<small>${NPCI(i)[2]}</small>`}<span>공개 카드 ${v.shownA&&v.shownA[i]?AE[v.shownA[i]]:'?'}${v.cr[i]!=null?` · 💰${v.cr[i]}`:''}</span><span>${b==='done'?'🤫 입찰함':b?`${b.g} · ${b.n}`:''}</span>${v.phase==='bid'&&v.actor===i&&!isH(i)?'<em>💭 고민 중…</em>':''}</div>`; }).join('')}</div>`;
  // 내 입력
  if(v.phase==='setup'&&!v.ready[ctx.me]){ const hd=v.hand[me];
    h+=`<div class="vr-card"><b>🃏 내 동물 카드로 조합 만들기</b><p>3장의 순서를 정하면 그 순서대로(또는 거꾸로) 한 줄에 이어질 때마다 1점! 1장은 모두에게 공개돼요.</p>
      <div class="fh-act">${ord3.map((k,pos)=>`<span class="zo-pick">${pos+1}번 <button class="ghost" data-up="${pos}">${AE[hd[k]]} ${AK[hd[k]]}</button><label><input type="radio" name="zs" data-shown="${pos}" ${shown===pos?'checked':''}> 공개</label></span>`).join(' → ')}</div>
      <small>카드를 누르면 다음 칸과 자리를 바꿔요</small><div class="fh-act"><button data-a="setup">이 조합으로 확정</button></div>
      <p class="vr-cast">오늘의 플레이어: ${ALL.filter(i=>!isH(i)).map(i=>`${seatEmoji(i)} ${seatName(i,ctx)} ${NPCI(i)[2]}`).join(' · ')}</p></div>`; }
  else if(v.phase==='setup') h+=`<div class="vr-card"><small>상대가 조합을 정하는 중…</small></div>`;
  if(v.phase==='bid'&&v.actor===me&&v.turn===ctx.me){ const left=ROUNDS-v.round, mx=v.cr[me]-left;
    h+=`<div class="vr-card"><b>🤫 비밀 입찰</b><p>합계가 <b>적은</b> 그룹이 낙찰, 그 안에서 가장 많이 건 사람이 놓아요. 많이 걸수록 그 그룹이 무거워진다는 걸 잊지 마세요!</p>
      <div class="fh-act"><button class="${bidG==='A'?'':'ghost'}" data-g="A">A 그룹</button><button class="${bidG==='B'?'':'ghost'}" data-g="B">B 그룹</button></div>
      <div class="fh-act"><input type="range" min="1" max="${mx}" value="${Math.min(bidN,mx)}" id="zoN"><b id="zoNv">${Math.min(bidN,mx)}</b> <small>(최대 ${mx}, 남은 라운드마다 1은 남겨야 해요)</small></div>
      <div class="fh-act"><button data-a="bid">${bidG} 그룹에 걸기</button></div></div>`; }
  if(v.phase==='over'&&v.final) h+=`<div class="sn-score">${v.rank.map((i,k)=>{ const f=v.final[i]; return `<div class="${isH(i)?'h':''}"><b>${k+1}등 ${seatEmoji(i)} ${seatName(i,ctx)} ${f.sc}점</b> <small>조합 ${v.combo[i].map(a=>AE[a]).join('→')} ${f.n}줄 · 조건 ${AE[v.cond[i][0]]}>${AE[v.cond[i][1]]} ${f.cond?'✔ ×2':'✘'} · 남은 💰${v.cr[i]}</small></div>`; }).join('')}</div>`;
  // 왼쪽: 추리판
  const L=`<div class="side-box"><div class="side-h">🧠 조합 추리 <small>공개 카드 · 입찰 · 놓은 동물</small></div>${ALL.map(i=>{ const pl={}; for(const x of v.placed[i]) pl[x.a]=(pl[x.a]||0)+1;
      return `<div class="rr-h"><b>${seatEmoji(i)} ${seatName(i,ctx)}</b> ${isH(i)?'':`<small>${NPCI(i)[2]}</small>`} · 공개 ${v.shownA&&v.shownA[i]?AE[v.shownA[i]]:'?'}${v.phase==='over'?` · <b class="ok">조합 ${v.combo[i].map(a=>AE[a]).join('→')}</b>`:''}<br>
        ${v.hist.map(x=>x.bids[i]&&x.bids[i]!=='done'?`<span class="${x.placer===i?'ok':''}">${x.r}R ${x.bids[i].g}${x.bids[i].n}${x.placer===i?' ⬇️':''}</span>`:'').join('')}
        ${Object.keys(pl).length?`<span>놓은 것 ${Object.entries(pl).map(([a,n])=>AE[a]+n).join(' ')}</span>`:''}</div>`; }).join('')}
    ${v.guesses.length?`<div class="side-h" style="margin-top:6px">🤨 짐작</div>${v.guesses.slice().reverse().map(g=>`<div class="rr-h">${fill(nm(g.by),ctx)} → ${fill(nm(g.t),ctx)} 조합에 ${AE[g.a]}?${g.right!=null?(g.right?' ✔':' ✘'):''}</div>`).join('')}`:''}</div>`;
  const R=`<div class="side-box side-log"><div class="side-h">📜 진행 기록 <small>최근이 위</small></div>${v.log.slice(-60).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=`<div class="side3"><div class="side-mid">${h}</div><aside class="side-l">${L}</aside><aside class="side-r">${R}</aside></div>`;
  el.oninput=e=>{ if(e.target.id==='zoN'){ bidN=+e.target.value; const b=el.querySelector('#zoNv'); if(b) b.textContent=bidN; } };
  el.onclick=e=>{
    const up=e.target.closest('[data-up]'); if(up){ const k=+up.dataset.up, j=(k+1)%3; [ord3[k],ord3[j]]=[ord3[j],ord3[k]]; return ctx.rerender(); }
    const sh=e.target.closest('[data-shown]'); if(sh){ shown=+sh.dataset.shown; return; }
    const g=e.target.closest('[data-g]'); if(g){ bidG=g.dataset.g; return ctx.rerender(); }
    const t=e.target.closest('[data-tile]'); if(t){ selTile=+t.dataset.tile; return ctx.rerender(); }
    const c=e.target.closest('[data-col]'); if(c&&!c.disabled){ const ti=Math.min(selTile,v.toPlace.length-1); selTile=0; return ctx.act({k:'place',t:ti,c:+c.dataset.col}); }
    const a=e.target.closest('[data-a]'); if(!a) return;
    if(a.dataset.a==='setup') return ctx.act({k:'setup',order:ord3.slice(),shown});
    if(a.dataset.a==='bid') return ctx.act({k:'bid',g:bidG,n:bidN});
  };
}
function status(v,ctx){ syncH(v);
  const me=HSEAT[ctx.me];
  if(v.phase==='over') return '';
  if(v.phase==='setup') return v.ready[ctx.me]?'다른 사람을 기다리는 중…':'조합 순서와 공개 카드를 정하세요';
  if(v.phase==='bid'&&v.actor===me) return '내 입찰 차례';
  if(v.phase==='place'&&v.placer===me) return '내가 타일을 놓을 차례';
  return '다른 사람 차례…';
}
const guide=`
<p><b>6인 경매 + 배치 게임</b>(우리 둘 + 성격 다른 컴퓨터 플레이어 4명). 5×5 동물원 우리에 🐍🦜🐘🦁🐒 타일을 위에서 떨어뜨려 쌓아요(사목처럼 아래부터).</p>
<ul><li><b>🃏 내 조합</b>: 동물 카드 3장의 순서를 비밀로 정해요(1장은 공개). 그 3마리가 순서대로(거꾸로도) <b>가로·세로·대각선</b>으로 이어지면 한 곳마다 1점.</li>
<li><b>🎯 개인 조건</b>(비밀): "X가 Y보다 많다" — 끝날 때 맞으면 점수 ×2.</li>
<li><b>5라운드</b>: A·B 그룹 타일 4장씩 공개 → 모두 한 명씩 비밀 입찰(💰30, 라운드마다 1 이상, 한 그룹에만) → 한 명씩 공개.</li>
<li><b>합계가 적은 그룹이 낙찰!</b> 그 그룹에서 가장 많이 건 사람이 4장을 원하는 줄에 떨어뜨려요. 다른 그룹 타일은 버려요. 동률이면 돌려받고 다시.</li>
<li>점수가 같으면 남은 크레딧이 많은 쪽이 위.</li></ul>
<div class="tipbox">💡 <b>팁</b><br>· 많이 걸면 놓을 권리에 가까워지지만, 그 그룹 합계가 커져서 낙찰에서 멀어져요. 이게 이 게임의 역설!<br>· 다른 사람이 어디에 무엇을 놓는지 보면 조합이 보여요. 남의 줄을 끊는 것도 방법.</div>`;
window.GAMES.zoo = { _sync:x=>syncH(x), maxH:6,
  title:'동물원', ref:'데블스 플랜 「동물원」', emoji:'🦁', tags:['경매','배치','NPC','두뇌서바이벌'],
  tagline:'우리 둘 + 컴퓨터 4명. 합계가 적은 쪽이 이기는 역설 경매로 타일을 따내, 비밀 동물 조합을 이어라.',
  guide, init, apply, mask, ai, render, status, step, stepDelay, noPersona:true, wide:true,
  aiDelay:()=>1200+Math.random()*1400,
  reset(){ sig=''; ord3=[0,1,2]; shown=0; bidG='A'; bidN=3; selTile=0; },
  bar:(v,i)=>{ const seat=HSEAT[i]; return v.cr[seat]!=null?`<span class="tag">💰 ${v.cr[seat]}</span>`:''; },
  result:(v,ctx)=>{ const k=(v.rank||[]).indexOf(HSEAT[ctx.me]); return k>=0?`${k+1}등 · ${v.final[HSEAT[ctx.me]].sc}점`:''; },
};
})();
