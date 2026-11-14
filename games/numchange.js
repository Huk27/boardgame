(function(){
'use strict';
/* 넘버 체인지 (피의 게임 시즌 2 · 4일차 팀전 머니 챌린지) — 3:3 (우리 둘이 각 팀 대표, 팀원은 NPC 2명씩).
   팀마다 1~7 숫자 블록 두 세트(14개). 대결마다 두 팀에서 한 명씩 출전(팀과 격리 — 팀원 NPC가 나가면 지켜만 봄).
   승부: 둘이 블록 2개를 동시에 내고 합이 큰 팀 +1점(같으면 0). 그다음 낸 블록 중 큰 숫자 블록은 상대 팀 것과 맞바꾸고, 작은 블록은 버림.
   🙈 히든 찬스(팀당 한 번): 내 쪽 출전자가 쓰면 합계는 비공개, 승패만 공개. 맞바꿀 때도 큰 블록 대신 무작위 한 개를 줌.
   대결 6번 × 승부 2번 = 12라운드. 7점 먼저 내면 즉시 승리, 12라운드 후 동점이면 남은 블록으로 연장 1번, 그래도 같으면 무승부. */
/* 👥 N명 (2026-11-12) — 사람 자리는 두 팀에 번갈아(0,3,1,4,2,5), 나머지 NPC */
const N=6; let HSEAT=[0,3]; const SEATORD=[0,3,1,4,2,5]; const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; }; const TEAM=[[0,1,2],[3,4,5]], ROUNDS=12, GOAL=7, WPT=6, CM=1;
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i), ALL=[...Array(N).keys()];
const teamOf=i=>i<3?0:1, nm=i=>`{s${i}}`;
const DEF_P={talk:.6,aggr:.5,trust:.5,bluff:.5,logic:.6,temper:.4};
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
const full=()=>[1,2,3,4,5,6,7,1,2,3,4,5,6,7];
const sortN=a=>a.slice().sort((x,y)=>x-y);
function rm(arr,x){ const k=arr.indexOf(x); if(k>=0) arr.splice(k,1); return k>=0; }
function init(starter,o){ const k=Math.max(2,Math.min(6,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  const s={phase:'intro', who:{}, inv:[full(),full()], pub:[full(),full()], unk:[0,0], score:[0,0], round:0, hidden:[true,true],
    pick:[null,null], useHide:[false,false], res:null, hist:[], used:{}, say:null, q:[], log:[], turn:null, starter, winner:null, ev:0, think:[0,0],
    notice:'🎙️ 머니 챌린지 「넘버 체인지」 — 팀 대 팀, 숫자 블록 맞바꾸기'};
  s.hs=HSEAT.slice(); const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=ids[k]);
  return s;
}
function repOf(s,t){ const m=Math.floor((s.round-1)/2); return TEAM[t][ t===0 ? m%3 : (m+Math.floor(m/3))%3 ]; }
function startRound(s){ s.round++; s.pick=[null,null]; s.useHide=[false,false]; s.res=null; s.reps=[repOf(s,0),repOf(s,1)];
  s.phase='pick'; s.turn=null; s.think=[1800+Math.random()*2200, 1800+Math.random()*2200];
  s.notice = s.round>ROUNDS ? `🎙️ 연장 라운드! ${nm(s.reps[0])} vs ${nm(s.reps[1])}` : `🎙️ ${s.round}라운드${s.round%2?' (새 대결)':' (같은 대결 2승부)'} — ${nm(s.reps[0])} vs ${nm(s.reps[1])}`;
  if(s.round%2||s.round>ROUNDS) s.log.push(`— 대결: ${nm(s.reps[0])} vs ${nm(s.reps[1])} —`); }
function submit(s,t,pair,hide){ s.pick[t]=sortN(pair); s.useHide[t]=!!hide&&s.hidden[t]; }
function resolve(s){
  const [a,b]=s.pick, sa=a[0]+a[1], sb=b[0]+b[1], hide=[s.useHide[0],s.useHide[1]];
  for(const t of [0,1]) if(hide[t]) s.hidden[t]=false;
  const w = sa>sb?0 : sb>sa?1 : null; if(w!=null) s.score[w]++;
  // 맞바꾸기: 보통은 큰 블록, 히든 찬스 쓴 팀은 무작위 한 개
  const give=[0,1].map(t=> hide[t] ? U.pick(s.pick[t]) : s.pick[t][1]);
  const drop=[0,1].map(t=>{ const c=s.pick[t].slice(); rm(c,give[t]); return c[0]; });
  for(const t of [0,1]){ for(const x of s.pick[t]) rm(s.inv[t],x); s.inv[t].push(give[1-t]); }
  // 공개 추적: 히든이 아니면 낸 두 개를 지움, 히든이면 준 것만 확실(나머지 하나는 모름)
  for(const t of [0,1]){ if(!hide[t]){ for(const x of s.pick[t]) rm(s.pub[t],x); } else { if(!rm(s.pub[t],give[t])) s.unk[t]--; s.unk[t]++; } s.pub[t].push(give[1-t]); }
  s.res={a,b,sa,sb,w,hide,give,drop};
  s.hist.push({r:s.round, reps:s.reps.slice(), a:hide[0]?null:a, b:hide[1]?null:b, sa:hide[0]||hide[1]?null:sa, sb:hide[0]||hide[1]?null:sb, w, hide, give});
  s.log.push(`${s.round}R ${hide[0]||hide[1]?'🙈 히든 — ':''}${hide[0]?'🅰️ ?':`🅰️ ${a.join('+')}=${sa}`} vs ${hide[1]?'🅱️ ?':`🅱️ ${b.join('+')}=${sb}`} → ${w==null?'무승부':w?'🅱️ +1':'🅰️ +1'} · 교환 🅰️→🅱️ ${give[0]}, 🅱️→🅰️ ${give[1]}`);
}
function npcPick(s,t){   // 공개 정보만: 내 블록 + 상대 공개 추적 블록
  const me=s.reps[t], p=P(s,me), inv=sortN(s.inv[t]), opp=sortN(s.pub[1-t]), lead=s.score[t]-s.score[1-t];
  // 상대가 낼 법한 합: 상대 블록 쌍들의 분포에서 성향대로 추정
  const pairs=[]; for(let i=0;i<opp.length;i++) for(let j=i+1;j<opp.length;j++) pairs.push(opp[i]+opp[j]);
  pairs.sort((x,y)=>x-y); let guess = pairs.length ? pairs[Math.min(pairs.length-1, Math.floor(pairs.length*(.45+p.aggr*.3)))] : 7;
  // 상대 팀이 지금까지 낸 합(공개된 것)을 기억해서 섞음
  const past=(s.hist||[]).map(h=>t===0?h.sb:h.sa).filter(x=>x!=null).slice(-4); if(past.length){ const avg=past.reduce((a,b)=>a+b,0)/past.length; guess=Math.round(guess*(1-p.logic*.6)+avg*p.logic*.6); }
  const maxOpp = opp.length>1 ? opp[opp.length-1]+opp[opp.length-2] : 14;
  const mine=[]; for(let i=0;i<inv.length;i++) for(let j=i+1;j<inv.length;j++) mine.push([inv[i],inv[j]]);
  let best=null, bv=-1e9;
  for(const pr of mine){ const sum=pr[0]+pr[1], winP = sum>guess+1?.9: sum>guess?.7: sum===guess?.45: sum>=guess-1?.25:.08;
    // 이기면 큰 블록을 상대에게 줌 → 큰 블록을 덜 쓰는 게 좋음 / 지면 작은 쌍으로 버리기
    // 블록 손익: 낸 두 개는 내 손을 떠나고(큰 건 상대에게) 상대의 큰 블록이 들어옴 → 합이 클수록 "재료"를 많이 씀
    const left=ROUNDS-s.round+1, needPts=GOAL-s.score[t], oppNeed=GOAL-s.score[1-t];
    const urg = needPts>=left||oppNeed<=1 ? 2.2 : (needPts/left>.55||oppNeed<=2 ? 1.5 : 1);
    const sure = sum>maxOpp ? 1 : winP;
    const v = sure*WPT*urg*(1+p.aggr*.25) - CM*sum + (Math.random()-.5)*(2.2-p.logic*1.5);
    if(v>bv){ bv=v; best=pr; } }
  const hide = s.hidden[t] && (best[1]>=6 && Math.random()<.25+p.bluff*.3);
  return {pair:best, hide};
}
const RL={win:['좋아요!','가져왔다 😎','계산대로예요.'], lose:['아 아깝다…','이걸 졌네 😣','다음엔 갚아요.'], draw:['비겼네요.','어쩜 똑같네 ㅋㅋ'], cheer:['잘했어!! 👏','역시 우리 팀!','나이스!'], sigh:['괜찮아요, 다음!','아이고…','에이 😥']};
function line(s,i,k){ const used=(s.used[i]=s.used[i]||[]); const pool=RL[k].filter(x=>!used.includes(x)); const t=U.pick(pool.length?pool:RL[k]); used.push(t); return t; }
function apply(s,p,a){ syncH(s);
  if(s.winner!=null) return '게임이 끝났어요';
  const seat=HSEAT[p], t=teamOf(seat); if(!a||a.k!=='pick') return '알 수 없는 동작';
  if(s.phase!=='pick') return '지금은 낼 때가 아니에요'; if(s.reps[t]!==seat) return '이번엔 팀원이 출전 중이에요 (격리 — 지켜보기만)';
  if(s.pick[t]) return '이미 냈어요';
  const pr=(a.pair||[]).map(x=>x|0); if(pr.length!==2) return '블록 2개를 고르세요';
  const inv=s.inv[t].slice(); if(!rm(inv,pr[0])||!rm(inv,pr[1])) return '없는 블록이에요';
  if(a.hide&&!s.hidden[t]) return '히든 찬스는 이미 썼어요';
  submit(s,t,pr,a.hide); s.ev++; return null;
}
function stepDelay(s){ syncH(s);
  if(s.winner!=null) return null;
  if(s.phase==='intro') return 2600;
  if(s.q.length) return s.q[0].k==='say'?1300:900;
  if(s.phase==='pick'){ if(s.pick[0]&&s.pick[1]) return 700; let d=null; for(const t of [0,1]) if(!s.pick[t]&&!isH(s.reps[t])) d=Math.min(d==null?1e9:d, s.think[t]); return d; }
  if(s.phase==='reveal') return s.rv<4?900:1200;
  if(s.phase==='swap') return 2400;
  return null;
}
function step(s){ syncH(s);
  if(s.phase==='intro'){ s.log.push(`팀 A: ${TEAM[0].map(nm).join(' ')} / 팀 B: ${TEAM[1].map(nm).join(' ')}`); startRound(s); s.ev++; return; }
  if(s.q.length){ const e=s.q.shift(); if(e.k==='say'){ s.say={seat:e.i,text:e.text,n:(s.say?s.say.n:0)+1}; s.log.push(`${nm(e.i)}: ${e.text}`); } s.ev++; return; }
  if(s.phase==='pick'){
    if(!(s.pick[0]&&s.pick[1])){ for(const t of [0,1]) if(!s.pick[t]&&!isH(s.reps[t])){ const r=npcPick(s,t); submit(s,t,r.pair,r.hide); s.notice=`🧱 ${nm(s.reps[t])} 블록 제출 완료`; } s.ev++; return; }
    s.phase='reveal'; s.rv=0; s.notice='🎙️ 공개합니다'; s.ev++; return; }
  if(s.phase==='reveal'){ if(s.rv<4){ s.rv++; s.ev++; return; } resolve(s); s.phase='swap'; const r=s.res;
    s.notice = (r.hide[0]||r.hide[1]) ? `🙈 히든 찬스! 결과만 — ${r.w==null?'무승부':`${r.w?'B':'A'}팀 승리`}` : `${r.sa} 대 ${r.sb} — ${r.w==null?'무승부':`${r.w?'B':'A'}팀 +1`}`;
    // 반응: 출전자 + 팀원 한 명
    for(const t of [0,1]){ const rep=s.reps[t]; const k = r.w==null?'draw':r.w===t?'win':'lose'; if(!isH(rep)&&Math.random()<.7) s.q.push({k:'say',i:rep,text:line(s,rep,k)});
      const mate=TEAM[t].find(x=>x!==rep&&!isH(x)); if(mate!=null&&r.w!=null&&Math.random()<.4) s.q.push({k:'say',i:mate,text:line(s,mate,r.w===t?'cheer':'sigh')}); }
    s.ev++; return; }
  if(s.phase==='swap'){ if(s.score[0]>=GOAL||s.score[1]>=GOAL) return endGame(s);
    if(s.round>=ROUNDS){ if(s.score[0]!==s.score[1]||s.round>ROUNDS||s.inv[0].length<2||s.inv[1].length<2) return endGame(s); }
    startRound(s); s.ev++; return; }
}
function endGame(s){ s.phase='over'; s.turn=null; const [a,b]=s.score; const w = a>b?0 : b>a?1 : 'draw';
  if(HSEAT.length>2){ s.winners=w==='draw'?[]:HSEAT.map((h,p)=>teamOf(h)===w?p:-1).filter(x=>x>=0); s.winner=w==='draw'?'draw':'none'; } else s.winner = w==='draw'?'draw':teamOf(HSEAT[0])===w?0:1; s.notice = w==='draw'?`🎙️ ${a}:${b} 무승부`:`🎙️ ${a}:${b} — ${w?'B':'A'}팀 승리! 저택 안으로`; s.log.push(s.notice.replace('🎙️ ','🏁 ')); s.ev++; }
function mask(s,p){ syncH(s); const v=U.clone(s), me=HSEAT[p], t=teamOf(me), o=1-t;
  v.inv[o]=null; v.q=[]; v.used={}; v.think=null;
  if(s.phase==='pick') v.pick[o]= s.pick[o]?'?':null;
  if(s.phase==='reveal'||s.phase==='swap'){ if(s.useHide[o]) v.pick[o]='?'; if(s.res&&s.res.hide[o]){ v.res={...s.res, sa:t===0?s.res.sa:null, sb:t===1?s.res.sb:null}; v.res[o===0?'a':'b']=null; v.res.drop=[null,null]; } }
  v.useHide[o]= s.phase==='pick' ? false : s.useHide[o];
  return v; }
function ai(v,lvl=1){ syncH(v); const seat=HSEAT[1], t=teamOf(seat); if(v.phase!=='pick'||!v.reps||v.reps[t]!==seat||v.pick[t]) return null;
  const view={who:v.who, inv:t?[[],v.inv[t]]:[v.inv[t],[]], pub:v.pub, reps:v.reps, score:v.score, hidden:v.hidden, round:v.round, hist:v.hist};
  const r=npcPick(view,t); return {k:'pick', pair:r.pair, hide:r.hide}; }

/* 화면 */
let WHO={}, sel=[], hideSel=false, sig='';
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}/g,(_,d)=>`${seatEmoji(+d)} ${seatName(+d,ctx)}`).replace(/\bA팀/g,'🅰️팀').replace(/\bB팀/g,'🅱️팀'); }
const blk=(x,cls='')=>`<span class="nc-b ${cls}">${x==null?'':x==='?'?'?':x}</span>`;
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{}; const me=HSEAT[ctx.me], t=teamOf(me), o=1-t;
  const sg=v.round+':'+v.phase; if(sg!==sig){ sig=sg; sel=[]; hideSel=false; }
  const amRep = v.phase==='pick' && v.reps && v.reps[t]===me && !v.pick[t];
  let h=`<div class="hl-notice">${fill(U.esc(v.notice||''),ctx)}</div>`;
  h+=`<div class="vr-speech">${v.say?`<span class="w">${seatEmoji(v.say.seat)} ${seatName(v.say.seat,ctx)}</span> ${U.esc(v.say.text)}`:'<i>　</i>'}</div>`;
  h+=`<div class="nc-score"><div class="nc-tm ${t===0?'mine':''}"><b>🅰️팀</b> ${TEAM[0].map(i=>`${seatEmoji(i)}`).join('')}<span>${v.score[0]}</span></div><div class="nc-mid">${Math.min(v.round,ROUNDS)}${v.round>ROUNDS?'+':''} / ${ROUNDS}R<br><small>${GOAL}점 선승</small></div><div class="nc-tm ${t===1?'mine':''}"><span>${v.score[1]}</span>${TEAM[1].map(i=>`${seatEmoji(i)}`).join('')} <b>🅱️팀</b></div></div>`;
  if(v.reps){ const r=v.res, show=v.phase==='reveal'||v.phase==='swap';
    const side=tt=>{ const pk=v.pick[tt]; let bs;
      if(show){ const k=tt===0?'a':'b'; const arr = r? r[k] : (pk&&pk!=='?'?pk:null); const n=tt===0?v.rv:Math.max(0,(v.rv||0)-2); bs = arr? arr.map((x,j)=>blk(j<Math.min(2,n)||v.phase==='swap'?x:'?','big')).join('') : blk('?','big')+blk('?','big'); }
      else bs = pk ? (tt===t&&pk!=='?'?pk.map(x=>blk(x,'big')).join(''):blk('?','big back')+blk('?','big back')) : '<small>고르는 중…</small>';
      return `<div class="nc-side ${v.reps[tt]===me?'me':''}"><div>${seatEmoji(v.reps[tt])} ${seatName(v.reps[tt],ctx)} ${v.useHide&&v.useHide[tt]&&(tt===t||v.phase!=='pick')?'🙈':''}</div><div class="nc-bs">${bs}</div>${v.phase==='swap'&&r&&(r[tt===0?'sa':'sb']!=null)?`<b>합 ${r[tt===0?'sa':'sb']}</b>`:''}</div>`; };
    h+=`<div class="nc-arena">${side(0)}<div class="nc-vs">VS</div>${side(1)}</div>`;
    if(v.phase==='swap'&&r) h+=`<div class="py-line">🔁 교환: 🅰️팀 → 🅱️팀 ${blk(r.give[0])} · 🅱️팀 → 🅰️팀 ${blk(r.give[1])} ${r.hide[0]||r.hide[1]?'<small>(히든 찬스: 무작위 블록)</small>':''}</div>`;
  }
  // 내 팀 블록
  const inv=sortN(v.inv[t]||[]);
  h+=`<div class="nc-inv"><div class="nc-h">우리 팀 블록 (${inv.length}) ${v.hidden[t]?'· 🙈 히든 찬스 남음':''}</div><div class="nc-row">${inv.map((x,k)=>`<button class="nc-b ${sel.includes(k)?'sel':''}" data-k="${k}" ${amRep?'':'disabled'}>${x}</button>`).join('')}</div></div>`;
  if(amRep) h+=`<div class="vr-card"><b>🧱 내가 출전! 블록 2개를 고르세요</b> <small>${sel.length===2?`합 ${inv[sel[0]]+inv[sel[1]]}`:''}</small><p>이기면 <b>큰 블록은 상대 팀에게</b> 가요. 작은 블록은 버려져요.</p>
    <div class="fh-act">${v.hidden[t]?`<label class="kq-imm"><input type="checkbox" data-hide ${hideSel?'checked':''}> 🙈 히든 찬스 쓰기(팀당 1번)</label>`:''}<button data-go="1" ${sel.length===2?'':'disabled'}>제출</button></div></div>`;
  else if(v.phase==='pick'&&v.reps&&v.reps[t]!==me) h+=`<div class="info">🔇 이번엔 팀원 ${fill(nm(v.reps[t]),ctx)}이 출전 — 격리돼서 말을 걸 수 없어요. 지켜보세요.</div>`;
  const pubO=sortN(v.pub[o]);
  h+=`<div class="nc-inv opp"><div class="nc-h">상대 팀 블록 추적 (${pubO.length}) ${v.unk[o]?`<small>· 히든 찬스로 ${v.unk[o]}개는 이미 썼을 수도</small>`:''} ${v.hidden[o]?'· 🙈 남음':'· 🙈 씀'}</div><div class="nc-row">${pubO.map(x=>blk(x,'sm')).join('')}</div></div>`;
  if(v.phase==='over') h+=`<div class="sn-score"><div class="h"><b>${v.winner==='draw'?'🤝 무승부':v.winner===t?'🎉 우리 팀 승리 — 저택 안으로!':'😢 우리 팀 패배 — 야생으로…'}</b> ${v.score[0]} : ${v.score[1]}</div></div>`;
  const Lb=`<div class="side-box"><div class="side-h">📋 대결 기록</div>${v.hist.slice().reverse().map(x=>`<div class="side-row" style="flex-wrap:wrap">${x.r}R ${seatEmoji(x.reps[0])} ${x.a?x.a.join('+'):'🙈'} vs ${x.b?x.b.join('+'):'🙈'} ${seatEmoji(x.reps[1])} <b>${x.w==null?'무':x.w?'🅱️':'🅰️'}</b> <small>교환 ${x.give[0]}↔${x.give[1]}</small></div>`).join('')||'<small>-</small>'}</div>`;
  const R=`<div class="side-box side-log"><div class="side-h">📜 진행 기록 <small>최근이 위</small></div>${v.log.slice(-50).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=`<div class="side3"><div class="side-mid">${h}</div><aside class="side-l">${Lb}</aside><aside class="side-r">${R}</aside></div>`;
  el.onchange=e=>{ if(e.target.matches('[data-hide]')) hideSel=e.target.checked; };
  el.onclick=e=>{ const k=e.target.closest('[data-k]'); if(k&&!k.disabled){ const i=+k.dataset.k; sel = sel.includes(i)?sel.filter(x=>x!==i):sel.concat([i]).slice(-2); return ctx.rerender(); }
    if(e.target.closest('[data-go]')&&sel.length===2){ const pr=[inv[sel[0]],inv[sel[1]]], hd=hideSel; sel=[]; hideSel=false; return ctx.act({k:'pick',pair:pr,hide:hd}); } };
}
function status(v,ctx){ syncH(v); const me=HSEAT[ctx.me], t=teamOf(me); if(v.phase==='over') return ''; if(v.phase==='pick'&&v.reps&&v.reps[t]===me&&!v.pick[t]) return '블록 2개를 내세요'; return '진행 중…'; }
const guide=`
<p><b>팀 대 팀 숫자 블록 승부</b> — 3:3 (사람 1~6명이 두 팀에 번갈아 들어가고, 빈자리는 컴퓨터).</p>
<ol><li>팀마다 <b>1~7 블록 두 세트</b>(14개). 대결마다 팀에서 한 명씩 출전해 2번 승부해요(6대결 = 12라운드). 출전자는 팀과 격리 — <b>팀원이 나가면 지켜보기만</b>.</li>
<li>승부: 둘이 <b>블록 2개를 동시에</b> 내고 <b>합이 큰 팀 +1점</b>(같으면 0).</li>
<li>그다음 각자 낸 블록 중 <b>큰 블록은 상대 팀 것과 맞바꾸고</b>, 작은 블록은 버려요. 크게 이길수록 상대에게 큰 블록을 넘겨줘요!</li>
<li><b>🙈 히든 찬스</b>(팀당 1번): 합계는 비공개, 승패만 공개. 넘기는 블록도 큰 것 대신 무작위 하나.</li></ol>
<p><b>${GOAL}점</b>을 먼저 내면 즉시 승리. ${ROUNDS}라운드 뒤 동점이면 남은 블록으로 연장 1번.</p>
<div class="tipbox">💡 상대 팀 블록은 공개된 기록으로 추적돼요(아래). 상대가 낼 법한 합보다 딱 조금만 크게 — 질 것 같으면 작은 블록 두 개로 버리기!</div>`;
window.GAMES.numchange = {
  title:'넘버 체인지', ref:'피의 게임 「넘버 체인지」', emoji:'🧱', tags:['팀전','숫자','NPC','두뇌서바이벌'],
  tagline:'1~7 블록 2개씩, 합이 크면 이기지만 큰 블록은 상대 팀에게 넘어간다. 3:3 팀전.',
  guide, init, apply, mask, ai, render, status, step, stepDelay, noPersona:true, wide:true,
  aiDelay:()=>1800+Math.random()*2000,
  reset(){ sel=[]; hideSel=false; sig=''; },
  maxH:6, bar:(v,i)=>{ syncH(v); return `<span class="tag">${teamOf(HSEAT[i])?'🅱️':'🅰️'} ${v.score[teamOf(HSEAT[i])]}점</span>`; },
  result:(v,ctx)=>`${v.score[0]} : ${v.score[1]}`,
};
})();
