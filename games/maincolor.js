(function(){
'use strict';
/* 메인 컬러 (피의 게임 시즌 2 · 9일차 머니 챌린지) — 6인(우리 둘 + NPC 4명), 5라운드.
   각자 ⚫ 블랙 · ⚪ 화이트 · 🔘 그레이 중 무작위 8장(비공개). 비밀 투표로 메인 컬러를 정함(최다 득표, 동률이면 동률 색 모두).
   메인 컬러 카드를 몰래 내고 낸 장수만큼 점수 — 단, 가장 많이 낸 사람(남은 카드가 가장 적은 사람)은 0점! 같으면 모두 0점.
   그레이가 메인이면 블랙+화이트 한 쌍을 그레이 1장으로 낼 수 있음. 5라운드 합계 1등 우승, 꼴찌 탈락 후보. (원작 아이템은 뺌) */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로, 나머지는 NPC */
const N=6, HAND=8, ROUNDS=5, BOLD=0, TM=.35, STY=1, CAUT=.5; let HSEAT=[0,3]; const SEATORD=[0,3,1,4,2,5];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i), ALL=[...Array(N).keys()];
const nm=i=>`{s${i}}`;
const C=['B','W','G'], CN={B:'블랙',W:'화이트',G:'그레이'}, CE={B:'⚫',W:'⚪',G:'🔘'};
const DEF_P={talk:.6,aggr:.5,trust:.5,bluff:.5,logic:.6,temper:.4};
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
function deal(){ const h={B:0,W:0,G:0}; for(let k=0;k<HAND;k++) h[C[Math.random()*3|0]]++; return h; }
function capacity(h,main){ let n=0; for(const c of main) n+=h[c]; if(main.includes('G')){ const pairs=Math.min(main.includes('B')?0:h.B, main.includes('W')?0:h.W); n+=pairs; } return n; }
function init(starter,o){ const k=Math.max(2,Math.min(6,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  const s={phase:'intro', who:{}, round:0, hand:ALL.map(()=>null), vote:Array(N).fill(null), main:[], sub:Array(N).fill(null), score:Array(N).fill(0), rounds:[], rv:0,
    used:{}, say:null, log:[], turn:null, starter, winner:null, ev:0, notice:'🎙️ 머니 챌린지 「메인 컬러」 — 남들보다 조금 덜, 그러나 최대한 많이'};
  s.hs=HSEAT.slice(); const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=ids[k]);
  return s;
}
function startRound(s){ s.round++; s.hand=ALL.map(deal); s.vote=Array(N).fill(null); s.sub=Array(N).fill(null); s.main=[]; s.phase='vote'; s.turn=null; s.vi=0;
  s.notice=`🎙️ ${s.round}라운드 — 카드 8장을 받았습니다. 메인 컬러에 비밀 투표하세요`; s.log.push(`— ${s.round}라운드 —`); }
function npcVote(s,i){ const h=s.hand[i], p=P(s,i); const sc=C.map(c=>h[c]+(c==='G'?Math.min(h.B,h.W)*.6:0)+(Math.random()-.5)*(1.4-p.logic)); return C[sc.indexOf(Math.max(...sc))]; }
function npcSub(s,i){ const p=P(s,i), cap=capacity(s.hand[i],s.main); if(cap<=0) return 0;
  // 남들이 낼 장수: 지난 라운드 공개 기록(모두의 제출)을 기억 + 기본 예상(1~3장)으로 분포를 만들고, 그 최대보다 하나 덜 내는 게 이득
  const dist=Array(9).fill(0); [1,2,2,3,3,2,1].forEach((x,k)=>{ dist[x]+=1; });
  for(const R of s.rounds) for(const x of R.sub) dist[Math.min(8,x)]+=1.4*p.logic+.4;
  const tot=dist.reduce((a,b)=>a+b,0), cdf=[]; let acc=0; for(let k=0;k<9;k++){ acc+=dist[k]/tot; cdf.push(acc); }
  const sample=()=>{ const r=Math.random(); for(let k=0;k<9;k++) if(r<=cdf[k]) return k+(Math.random()<BOLD?1:0); return 8; };
  const EV=[]; for(let k=0;k<=cap;k++){ let ev=0; const T=200;
    for(let t2=0;t2<T;t2++){ let mx=0; for(let j=0;j<N-1;j++){ const x=sample(); if(x>mx) mx=x; } ev += k<mx ? k : 0; }
    EV.push(ev/T + (p.aggr-.5)*k*.08); }
  // 다들 같은 계산을 하면 같은 장수로 몰려 다 같이 0점 → 확률적으로 섞어 고르고, 겁 많은 성격은 한 장 덜
  const Tm=TM+(1-p.logic)*.5, m=Math.max(...EV), w=EV.map(x=>Math.exp((x-m)/Tm)); let r=Math.random()*w.reduce((a,b)=>a+b,0), k=0; for(;k<w.length-1;k++){ r-=w[k]; if(r<=0) break; }
  const sty=STY*Math.round((p.aggr-.55)*2.4+(p.trust-.5)*1.2); k=Math.max(0,Math.min(cap,k+sty)); if(p.logic>.7&&k>1&&Math.random()<CAUT) k--;   // 머리 좋은 사람은 "남들보다 조금 덜"을 더 지킴   // 성격마다 한두 장 덜·더 — 다 같이 몰리지 않게
  return k; }
function apply(s,p,a){ syncH(s);
  if(s.winner!=null) return '게임이 끝났어요';
  const seat=HSEAT[p]; if(!a) return '알 수 없는 동작';
  if(a.k==='vote'){ if(s.phase!=='vote') return '지금은 투표 시간이 아니에요'; if(s.vote[seat]) return '이미 투표했어요'; if(!C.includes(a.c)) return '색을 고르세요'; s.vote[seat]=a.c; s.ev++; return null; }
  if(a.k==='sub'){ if(s.phase!=='submit') return '지금은 낼 때가 아니에요'; if(s.sub[seat]!=null) return '이미 냈어요'; const k=a.n|0, cap=capacity(s.hand[seat],s.main); if(k<0||k>cap) return `0~${cap}장 낼 수 있어요`; s.sub[seat]=k; s.ev++; return null; }
  return '알 수 없는 동작';
}
function stepDelay(s){ syncH(s); if(s.winner!=null) return null;
  if(s.phase==='intro') return 2400;
  if(s.phase==='vote'||s.phase==='submit'){ const arr=s.phase==='vote'?s.vote:s.sub; const pend=ALL.filter(i=>arr[i]==null); if(!pend.length) return 800; if(pend.every(isH)) return null; return 800+Math.random()*900; }
  if(s.phase==='vres') return s.rv<3?1100:1800;
  if(s.phase==='reveal') return s.rv<N?1100:1600;
  if(s.phase==='score') return 2800;
  return null; }
function step(s){ syncH(s);
  if(s.phase==='intro'){ startRound(s); s.ev++; return; }
  if(s.phase==='vote'){ const pend=ALL.filter(i=>s.vote[i]==null&&!isH(i)); if(pend.length){ const i=pend[0]; s.vote[i]=npcVote(s,i); s.notice=`🗳️ ${nm(i)} 투표 완료 (${ALL.filter(j=>s.vote[j]).length}/${N})`; s.ev++; return; }
    if(ALL.some(i=>s.vote[i]==null)) return; s.phase='vres'; s.rv=0; s.tally={B:0,W:0,G:0}; for(const i of ALL) s.tally[s.vote[i]]++; s.notice='🎙️ 투표 결과를 공개합니다'; s.ev++; return; }
  if(s.phase==='vres'){ if(s.rv<3){ const c=C[s.rv++]; s.notice=`${CE[c]} ${CN[c]} — ${s.tally[c]}표`; s.ev++; return; }
    const mx=Math.max(...C.map(c=>s.tally[c])); s.main=C.filter(c=>s.tally[c]===mx); s.log.push(`🎨 메인 컬러: ${s.main.map(c=>CE[c]+CN[c]).join(' + ')} (${C.map(c=>CE[c]+s.tally[c]).join(' ')})`);
    s.phase='submit'; s.notice=`🎙️ 메인 컬러는 ${s.main.map(c=>CE[c]+' '+CN[c]).join(' + ')}! 몰래 카드를 내세요 — 가장 많이 낸 사람은 0점`; s.ev++; return; }
  if(s.phase==='submit'){ const pend=ALL.filter(i=>s.sub[i]==null&&!isH(i)); if(pend.length){ const i=pend[0]; s.sub[i]=npcSub(s,i); s.notice=`🃏 ${nm(i)} 제출 완료 (${ALL.filter(j=>s.sub[j]!=null).length}/${N})`; s.ev++; return; }
    if(ALL.some(i=>s.sub[i]==null)) return; s.phase='reveal'; s.rv=0; s.order=U.shuffle(ALL.slice()); s.notice='🎙️ 한 명씩 공개합니다'; s.ev++; return; }
  if(s.phase==='reveal'){ if(s.rv<N){ const i=s.order[s.rv++]; s.notice=`🃏 ${nm(i)} — ${s.sub[i]}장`; s.ev++; return; }
    const mx=Math.max(...s.sub), zero=ALL.filter(i=>s.sub[i]===mx&&mx>0); const gain=ALL.map(i=>zero.includes(i)?0:s.sub[i]);
    for(const i of ALL) s.score[i]+=gain[i]; s.rounds.push({main:s.main.slice(), sub:s.sub.slice(), gain, zero});
    s.notice = zero.length ? `💥 가장 많이 낸 ${zero.map(nm).join(', ')} (${mx}장) — 0점!` : '🎙️ 아무도 안 냈어요'; s.log.push(`${s.round}R 제출 ${ALL.map(i=>`${nm(i)} ${s.sub[i]}`).join(' · ')} → 0점: ${zero.map(nm).join(', ')||'-'}`);
    const sad=zero.filter(i=>!isH(i)); if(sad.length){ const i=U.pick(sad); s.say={seat:i,text:U.pick(['아 욕심부렸다…','헐 내가 제일 많이?!','으악 0점 😭','…계산 미스.']),n:(s.say?s.say.n:0)+1}; }
    s.phase='score'; s.ev++; return; }
  if(s.phase==='score'){ if(s.round>=ROUNDS) return endGame(s); startRound(s); s.ev++; return; }
}
function endGame(s){ s.phase='over'; s.turn=null; s.rank=ALL.slice().sort((a,b)=>s.score[b]-s.score[a]); const a=s.score[HSEAT[0]], b=s.score[HSEAT[1]]; s.winner=a>b?0:b>a?1:'both'; { const mx=Math.max(...HSEAT.map(h=>s.score[h])); s.winners=HSEAT.map((h,p)=>s.score[h]===mx?p:-1).filter(x=>x>=0); }
  s.notice=`🎙️ 우승 ${nm(s.rank[0])} (${s.score[s.rank[0]]}점) · 꼴찌 ${nm(s.rank[N-1])}`; s.log.push(s.notice.replace('🎙️ ','🏁 ')); s.ev++; }
function mask(s,p){ syncH(s); const v=U.clone(s), me=HSEAT[p];
  v.hand=s.hand.map((h,i)=>i===me||s.phase==='over'?h:null);
  if(s.phase==='vote') v.vote=s.vote.map((x,i)=>i===me?x:(x?'?':null)); else if(s.phase!=='over') v.vote=s.vote.map((x,i)=>i===me?x:null);
  if(s.phase==='submit') v.sub=s.sub.map((x,i)=>i===me?x:(x!=null?'?':null));
  if(s.phase==='reveal'){ const shown=new Set(s.order.slice(0,s.rv)); v.sub=s.sub.map((x,i)=>i===me||shown.has(i)?x:'?'); }
  return v; }
function ai(v,lvl=1){ syncH(v); const seat=HSEAT[1]; const view={...v, hand:v.hand.map((h,i)=>i===seat?h:{B:0,W:0,G:0})};
  if(v.phase==='vote'&&!v.vote[seat]) return {k:'vote', c:npcVote(view,seat)};
  if(v.phase==='submit'&&v.sub[seat]==null) return {k:'sub', n:npcSub(view,seat)};
  return null; }

/* 화면 */
let WHO={}, subN=0, sig='';
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}/g,(_,d)=>`${seatEmoji(+d)} ${seatName(+d,ctx)}`); }
const cardH=c=>`<span class="mcl-c ${c}">${CE[c]}</span>`;
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{}; const me=HSEAT[ctx.me], h=v.hand[me];
  const sg=v.round+':'+v.phase; if(sg!==sig){ sig=sg; subN=0; }
  let x=`<div class="hl-notice">${fill(U.esc(v.notice||''),ctx)}</div>`;
  x+=`<div class="vr-speech">${v.say?`<span class="w">${seatEmoji(v.say.seat)} ${seatName(v.say.seat,ctx)}</span> ${U.esc(v.say.text)}`:'<i>　</i>'}</div>`;
  x+=`<div class="info">${v.round}/${ROUNDS}라운드${v.main.length?` · 메인 컬러 <b>${v.main.map(c=>CE[c]+CN[c]).join(' + ')}</b>`:''} · 내 점수 <b>${v.score[me]}</b></div>`;
  if(h){ const cap=v.main.length?capacity(h,v.main):null;
    x+=`<div class="mcl-hand">${['B','W','G'].map(c=>Array(h[c]).fill(cardH(c)).join('')).join('')}</div><div class="info">⚫ ${h.B} · ⚪ ${h.W} · 🔘 ${h.G}${cap!=null?` → 메인 컬러로 낼 수 있는 최대 <b>${cap}장</b>${v.main.includes('G')&&!v.main.includes('B')&&!v.main.includes('W')&&Math.min(h.B,h.W)?` (⚫+⚪ 한 쌍 = 🔘 1장, ${Math.min(h.B,h.W)}쌍 포함)`:''}`:''}</div>`;
    if(v.phase==='vote'&&!v.vote[me]) x+=`<div class="vr-card"><b>🗳️ 메인 컬러 비밀 투표</b><div class="fh-act">${C.map(c=>`<button data-v="${c}">${CE[c]} ${CN[c]}</button>`).join('')}</div></div>`;
    if(v.phase==='submit'&&v.sub[me]==null){ subN=Math.max(0,Math.min(cap,subN)); x+=`<div class="vr-card"><b>🃏 몇 장 낼까요?</b><p>낸 만큼 점수 — 단, <b>가장 많이 낸 사람은 0점</b>!</p><div class="bs-amt"><button class="ghost" data-a="m">−</button><b>${subN}장</b><button class="ghost" data-a="p">+</button></div><div class="fh-act"><button data-a="sub">${subN}장 내기</button></div></div>`; } }
  x+=`<div class="mcl-seats">${ALL.map(i=>{ const R=v.rounds[v.rounds.length-1]; return `<div class="mcl-seat ${i===me?'me':''} ${v.phase==='score'&&R&&R.zero.includes(i)?'zero':''}"><b>${seatEmoji(i)} ${seatName(i,ctx)}</b><small>${v.score[i]}점</small><span>${v.phase==='vote'?(v.vote[i]?'🗳️':'…'):v.phase==='submit'?(v.sub[i]!=null?'🃏':'…'):(v.phase==='reveal'||v.phase==='score')&&v.sub[i]!=null&&v.sub[i]!=='?'?`${v.sub[i]}장`:''}</span></div>`; }).join('')}</div>`;
  if(v.rounds.length) x+=`<div class="rt-res">${v.rounds.map((R,r)=>`<div><b>${r+1}R</b> ${R.main.map(c=>CE[c]).join('')} · ${ALL.map(i=>`${seatEmoji(i)}${R.sub[i]}${R.zero.includes(i)?'💥':''}`).join(' ')}</div>`).join('')}</div>`;
  if(v.phase==='over') x+=`<div class="sn-score">${v.rank.map((i,k)=>`<div class="${isH(i)?'h':''}"><b>${k+1}등 ${seatEmoji(i)} ${seatName(i,ctx)}</b> ${v.score[i]}점${k===0?' 🏆':''}${k===N-1?' 💀':''}</div>`).join('')}</div>`;
  const Rg=`<div class="side-box side-log"><div class="side-h">📜 진행 기록 <small>최근이 위</small></div>${v.log.slice(-40).reverse().map(t=>`<div>${fill(U.esc(t),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=`<div class="side3"><div class="side-mid">${x}</div><aside class="side-r">${Rg}</aside></div>`;
  el.onclick=e=>{ const b=e.target.closest('[data-v]'); if(b) return ctx.act({k:'vote',c:b.dataset.v}); const a=e.target.closest('[data-a]'); if(!a) return; const k=a.dataset.a, cap=h&&v.main.length?capacity(h,v.main):0;
    if(k==='m'){ subN=Math.max(0,subN-1); return ctx.rerender(); } if(k==='p'){ subN=Math.min(cap,subN+1); return ctx.rerender(); } if(k==='sub') return ctx.act({k:'sub',n:subN}); };
}
function status(v,ctx){ syncH(v); const me=HSEAT[ctx.me]; if(v.phase==='vote'&&!v.vote[me]) return '메인 컬러에 투표하세요'; if(v.phase==='submit'&&v.sub[me]==null) return '몇 장 낼지 정하세요'; return v.phase==='over'?'':'진행 중…'; }
const guideSteps=[
  {t:'🃏 카드 8장', h:'매 라운드 <b>⚫ 블랙 · ⚪ 화이트 · 🔘 그레이</b> 중 무작위 <b>8장</b>을 몰래 받아요.', demo:s=>{ s.round=1; s.hand=ALL.map(()=>({B:3,W:2,G:3})); s.phase='vote'; s.vote=Array(N).fill(null); s.notice='🎙️ 1라운드 — 카드 8장을 받았습니다. 메인 컬러에 비밀 투표하세요'; return s; }},
  {t:'🗳️ 메인 컬러 투표', h:'모두 몰래 색 하나에 투표. <b>최다 득표 색</b>이 메인 컬러(동률이면 그 색들 모두).', demo:s=>{ s.round=1; s.hand=ALL.map(()=>({B:3,W:2,G:3})); s.phase='vote'; s.vote=['G','B','G','G',null,'W']; return s; }},
  {t:'🃏 몇 장 낼까', h:'메인 컬러 카드를 몰래 내요. <b>낸 장수만큼 점수</b> — 그런데 <b>가장 많이 낸 사람은 0점</b>! 남들보다 조금 덜 내는 게 핵심.', demo:s=>{ s.round=1; s.hand=ALL.map(()=>({B:3,W:2,G:3})); s.phase='submit'; s.main=['G']; s.sub=[null,2,null,3,null,1]; return s; }},
  {t:'🔘 그레이 특별 규칙', h:'그레이가 메인이면 <b>⚫+⚪ 한 쌍을 🔘 1장</b>으로 낼 수 있어요.', demo:s=>{ s.round=2; s.hand=ALL.map(()=>({B:2,W:3,G:3})); s.phase='submit'; s.main=['G']; s.sub=Array(N).fill(null); return s; }},
  {t:'💥 공개', h:'한 명씩 공개! 가장 많이 낸 사람(들)은 0점. 5라운드 합계 1등 우승, 꼴찌는 탈락 후보.', demo:s=>{ s.round=1; s.hand=ALL.map(()=>({B:3,W:2,G:3})); s.phase='score'; s.main=['G']; s.sub=[2,3,1,4,2,4]; s.rounds=[{main:['G'],sub:[2,3,1,4,2,4],gain:[2,3,1,0,2,0],zero:[3,5]}]; s.score=[2,3,1,0,2,0]; s.notice='💥 가장 많이 낸 {s3}, {s5} (4장) — 0점!'; return s; }},
];
const guide=`<p><b>남들보다 조금 덜, 그러나 최대한 많이</b> (6인, 5라운드).</p><ol><li>⚫·⚪·🔘 카드 8장을 몰래 받아요.</li><li>메인 컬러 비밀 투표(최다 득표, 동률이면 모두).</li><li>메인 컬러 카드를 몰래 내고 낸 만큼 점수 — 가장 많이 낸 사람은 0점. 그레이가 메인이면 ⚫+⚪ 한 쌍 = 🔘 1장.</li></ol><p>5라운드 합계 1등 우승, 꼴찌 탈락 후보.</p>`;
window.GAMES.maincolor = { _sync:x=>syncH(x), maxH:6,
  title:'메인 컬러', ref:'피의 게임 「메인 컬러」', emoji:'🎨', tags:['눈치','투표','NPC','두뇌서바이벌'],
  tagline:'메인 컬러 카드를 낸 만큼 점수 — 단, 가장 많이 낸 사람은 0점.',
  guide, guideSteps, init, apply, mask, ai, render, status, step, stepDelay, noPersona:true, wide:true,
  aiDelay:()=>1400+Math.random()*1500,
  reset(){ subN=0; sig=''; },
  bar:(v,i)=>`<span class="tag">🎨 ${v.score[HSEAT[i]]}점</span>`,
  result:(v,ctx)=>{ const k=(v.rank||[]).indexOf(HSEAT[ctx.me]); return k>=0?`${k+1}등 · ${v.score[HSEAT[ctx.me]]}점`:''; },
  _npcSub:npcSub, _cap:capacity,
};
})();
