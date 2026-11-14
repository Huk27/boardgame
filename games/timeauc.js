(function(){
'use strict';
/* 시간 경매 (6인: 우리 둘 + NPC 4명). 각자 시간 60초. 9번의 경매.
   라운드마다 모두 버튼을 누른 채 시작 → 5초 카운트다운 안에 떼면 불참(공짜) → 그 뒤로 누르고 있는 동안 내 시간이 줄어듦 → 원하는 만큼 쓰고 뗌.
   가장 오래 누른 사람이 🏅 승리 표식을 가져가고, 참가한 모두 쓴 시간만큼 잃음. 0.1초까지 같으면 유찰.
   누가 참가했는지·남은 시간은 비밀, 낙찰자와 낙찰 시간만 공개. 끝나면 표식 많은 순(같으면 남은 시간 많은 쪽). */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로, 나머지는 NPC */
const N=6, BANK=60, ROUNDS=9, COUNT=5; let HSEAT=[0,3]; const SEATORD=[0,3,1,4,2,5];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i);
const ALL=[...Array(N).keys()];
const STYLE={seojin:'logic', doyun:'emo', haram:'calm', yuna:'emo', minho:'sly', taekyung:'emo', jihu:'sly', soyul:'logic'};
const DEF_P={talk:.6,aggr:.5,trust:.5,bluff:.5,logic:.6,temper:.4};
const nm=i=>`{s${i}}`;
const r1=x=>Math.round(x*10)/10;

function init(starter,o){ const k=Math.max(2,Math.min(6,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  const s={bank:Array(N).fill(BANK), tok:Array(N).fill(0), round:0, phase:'intro', bids:Array(N).fill(null), done:HSEAT.map(()=>false), hist:[], my:ALL.map(()=>[]),
    who:{}, used:{}, say:null, q:[], log:[], turn:null, starter, winner:null, notice:'🎙️ 시간 경매를 시작합니다. 가장 오래 버틴 사람이 표식을 가져가요', ev:0};
  s.hs=HSEAT.slice(); const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=ids[k]);
  return s;
}
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
function startRound(s){
  s.round++; s.phase='bid'; s.bids=Array(N).fill(null); s.done=HSEAT.map(i=>s.bank[i]<=0);
  for(const i of ALL) if(!isH(i)) s.bids[i]=npcBid(s,i);
  for(const p of [0,1]) if(s.done[p]) s.bids[HSEAT[p]]=0;
  s.notice=`🎙️ ${s.round}번째 경매 — 버튼을 누르고 있다가, 원하는 만큼 버틴 뒤 떼세요`; s.log.push(`— ${s.round}번째 경매 —`);
}
function settle(s){
  const b=s.bids.map((x,i)=>Math.min(r1(x||0), r1(s.bank[i])));
  const max=Math.max(...b), top=ALL.filter(i=>b[i]===max&&max>0);
  for(const i of ALL){ s.bank[i]=r1(s.bank[i]-b[i]); s.my[i].push({r:s.round,bid:b[i],win:top.length===1&&top[0]===i}); }
  const w = top.length===1 ? top[0] : null; if(w!=null) s.tok[w]++;
  s.hist.push({r:s.round, w, t:max, tie:top.length>1});
  s.board=max; s.shown=0; s.phase='show';
  s.result = max<=0 ? '아무도 버티지 않아 유찰' : w==null ? `⚖️ ${max}초 동점! 유찰` : `🏅 ${nm(w)} 낙찰 — ${max}초`;
}
function endGame(s){
  s.phase='over'; s.turn=null;
  const rank=ALL.slice().sort((a,b)=>s.tok[b]-s.tok[a] || s.bank[b]-s.bank[a]); s.rank=rank;
  s.winner = isH(rank[0]) ? pOf(rank[0]) : 'none'; s.winners=isH(rank[0])?[pOf(rank[0])]:[];
  s.notice=`🎙️ 경매 끝! 1등 ${nm(rank[0])} (표식 ${s.tok[rank[0]]}개) · 꼴찌 ${nm(rank[N-1])}`; s.log.push(s.notice);
}

/* ── NPC: 남은 라운드당 예산 + 성향 ── */
function npcBid(s,i){
  const p=P(s,i), left=ROUNDS-s.round+1, bank=s.bank[i]; if(bank<=0) return 0;
  const per=bank/left, need = s.tok[i]===0 && left<=3;               // 표식이 없으면 막판에 필사적
  const seen=s.hist.filter(h=>h.w!=null).map(h=>h.t), avgWin=seen.length?seen.reduce((a,b)=>a+b,0)/seen.length:per*1.2;
  if(!need && Math.random()<.18+p.bluff*.25 && left>2) return 0;      // 이번 판은 쉬며 시간 아끼기
  let x;
  if(Math.random()<p.logic) x = Math.min(bank, avgWin*(.95+Math.random()*.35) + .1);   // 지금까지 낙찰가보다 살짝 위
  else x = per*(.5+p.aggr*1.4)*(.6+Math.random()*.9);
  if(need) x=Math.max(x, Math.min(bank, avgWin*1.3+Math.random()*3));
  if(left===1) x=bank*(.8+Math.random()*.2);                          // 마지막: 거의 다
  x=r1(Math.max(.1,Math.min(bank,x)) + (Math.random()<.5?.1:0));     // 동점 피하려고 소수점 비틀기
  return Math.min(r1(bank),x);
}

/* ── 말 ── */
const LINES={
  sly:{win:['후후, 이번 건 제 거네요~'], big:['헉, {x}초요? 누가 그렇게 버텼어요~? 😏'], save:['저는 아직 시간 많아요~ 😏']},
  calm:{win:['가져갈게요.'], big:['…{x}초. 크네요.'], save:['…아껴 두죠.']},
  logic:{win:['예산 안에서 이겼네요.'], big:['{x}초면 남은 라운드가 힘들 텐데요.','{x}초… 누가 막판을 버렸네요.'], save:['낙찰가 평균을 보면 지금은 쉬는 게 맞아요.']},
  emo:{win:['우와 제 거예요!! 🥳'], big:['{x}초?! 미쳤다 😱'], save:['으아 무서워서 손 뗐어요 😭']},
};
function lineOf(s,seat,kind,x){ const p=P(s,seat), st=STYLE[p.id]||'calm', L=(LINES[st]||{})[kind]; if(!L) return null;
  const used=(s.used[seat]=s.used[seat]||[]), pool=L.filter(t=>!used.includes(t)); if(!pool.length) return null; const raw=U.pick(pool); used.push(raw); return raw.split('{x}').join(x!=null?x:''); }

/* ── 시간 흐름 ── */
function stepDelay(s){ syncH(s);
  if(s.winner!=null) return null;
  if(s.phase==='intro') return 2200;
  if(s.q.length) return 1400;
  if(s.phase==='bid') return s.done.every(Boolean)?600:null;
  if(s.phase==='show') return s.shown<1 ? Math.min(9000, 1200+s.board*250) : 2600;   // 전광판이 흐르는 시간
  return null;
}
function step(s){ syncH(s);
  if(s.phase==='intro'){ startRound(s); return; }
  if(s.q.length){ const e=s.q.shift(); const t=lineOf(s,e.seat,e.kind,e.x); if(t){ s.say={seat:e.seat,text:t,n:(s.say?s.say.n:0)+1}; s.log.push(`${nm(e.seat)}: ${t}`); } s.ev++; return; }
  if(s.phase==='bid'&&s.done.every(Boolean)){ settle(s); s.ev++; return; }
  if(s.phase==='show'){
    if(s.shown<1){ s.shown=1; s.notice=s.result; s.log.push(s.result); const h=s.hist[s.hist.length-1];
      if(h.w!=null&&!isH(h.w)&&Math.random()<.6) s.q.push({seat:h.w,kind:'win'});
      if(h.t>=10){ const o=ALL.filter(j=>!isH(j)&&j!==h.w); if(o.length) s.q.push({seat:U.pick(o),kind:'big',x:h.t}); }
      s.ev++; return; }
    if(s.round>=ROUNDS) endGame(s); else startRound(s); s.ev++; return; }
}
function apply(s,p,a){ syncH(s);
  if(s.winner!=null) return '게임이 끝났어요';
  const seat=HSEAT[p];
  if(!a||a.k!=='bid') return '알 수 없는 동작';
  if(s.phase!=='bid'||s.done[p]) return '지금은 입찰할 때가 아니에요';
  const x=Math.max(0,Math.min(s.bank[seat], r1(+a.x||0)));
  s.bids[seat]=x; s.done[p]=true; s.ev++; return null;
}
function mask(s,p){ syncH(s);
  const v=U.clone(s), me=HSEAT[p], over=s.phase==='over';
  if(!over){ v.bank=s.bank.map((b,i)=>i===me?b:null); v.bids=s.bids.map((b,i)=>i===me?b:null); v.my=ALL.map((_,i)=>i===me?s.my[i]:[]); }
  v.q=[]; v.used={};
  return v;
}
function ai(v){ syncH(v); const seat=HSEAT[1]; if(v.phase!=='bid'||v.done[1]) return null; const left=ROUNDS-v.round+1, per=v.bank[seat]/left;
  return {k:'bid', x: Math.random()<.2&&left>2 ? 0 : r1(Math.min(v.bank[seat], per*(.6+Math.random()*1.2)))}; }

/* ── 화면: 진짜로 버튼을 누르고 있기 ── */
let WHO={}, hold=null, raf=null, sig='';
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}/g,(_,d)=>`${seatEmoji(+d)} ${seatName(+d,ctx)}`); }
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{};
  if(hold && v.phase==='bid' && !v.done[ctx.me] && el.querySelector('#taBtn')) return;   // 누르는 중엔 화면을 다시 그리지 않음 (버튼이 끊기지 않게)
  const me=HSEAT[ctx.me], bank=v.bank[me], canBid=v.phase==='bid'&&!v.done[ctx.me]&&bank>0;
  const sg=v.phase+':'+v.round; if(sg!==sig){ sig=sg; if(hold){ hold=null; } }
  let h=`<div class="info">${v.round} / ${ROUNDS}번째 경매 · ⏳ 내 남은 시간 <b>${bank!=null?bank.toFixed(1):'?'}초</b> · 🏅 내 표식 ${v.tok[me]}</div>`;
  h+=`<div class="hl-notice">${fill(v.notice||'',ctx)}</div>`;
  h+=`<div class="vr-speech">${v.say?`<span class="w">${seatEmoji(v.say.seat)} ${seatName(v.say.seat,ctx)}</span> ${fill(U.esc(v.say.text),ctx)}`:'<i>　</i>'}</div>`;
  const showT = v.phase==='show'&&v.shown<1 ? null : v.phase==='show' ? v.board : null;
  h+=`<div class="ta-board" id="taBoard">${v.phase==='show'&&v.shown<1?'<span class="ta-run">⏱️ 0.0</span>':showT!=null?`⏱️ ${showT.toFixed(1)}`:'⏱️ —'}</div>`;
  if(canBid) h+=`<div class="ta-wrap"><button class="ta-btn" id="taBtn">꾹 누르기</button><div class="ta-help">누르고 있는 동안: 처음 <b>${COUNT}초</b>는 공짜(그 안에 떼면 불참) → 그다음부터 내 시간이 줄어요. 원하는 만큼 버티고 떼세요.</div><div class="fh-act"><button class="ghost small" id="taFold">이번엔 불참</button></div></div>`;
  else if(v.phase==='bid') h+=`<div class="info">${bank<=0?'시간을 다 써서 구경해요':'입찰 완료 — 다른 사람들을 기다리는 중… 🤫'}</div>`;
  if(v.phase==='over'&&v.rank) h+=`<div class="sn-score">${v.rank.map((i,k)=>`<div class="${isH(i)?'h':''}"><b>${k+1}등 ${seatEmoji(i)} ${seatName(i,ctx)}</b> <small>🏅 ${v.tok[i]} · 남은 ${v.bank[i].toFixed(1)}초${k===N-1?' · 😵 꼴찌':''}</small></div>`).join('')}</div>`;
  const L=`<div class="side-box"><div class="side-h">🧠 경매 기록 <small>낙찰자와 낙찰 시간만 공개</small></div>${v.hist.slice().reverse().map(x=>`<div class="rr-h">${x.r}번째 · ${x.w!=null?`🏅 ${fill(nm(x.w),ctx)} ${x.t}초`:x.t>0?`⚖️ 동점 ${x.t}초 유찰`:'유찰'}</div>`).join('')||'<small style="color:#888">낙찰 기록이 쌓여요. 낙찰가를 보면 누가 얼마나 썼을지 짐작할 수 있어요.</small>'}
    <div class="side-h" style="margin-top:6px">🏅 표식</div>${ALL.slice().sort((a,b)=>v.tok[b]-v.tok[a]).map(i=>`<div class="side-row ${i===me?'me':''}">${seatEmoji(i)} ${seatName(i,ctx)} ${isH(i)?'':`<small>${NPCI(i)[2]}</small>`}<span>🏅 ${v.tok[i]}</span></div>`).join('')}
    <div class="side-h" style="margin-top:6px">🗒️ 내 입찰</div>${(v.my[me]||[]).map(x=>`<div class="rr-h">${x.r}번째 · ${x.bid?`${x.bid}초`:'불참'} ${x.win?'🏅':''}</div>`).join('')||'<small style="color:#888">-</small>'}</div>`;
  const R=`<div class="side-box side-log"><div class="side-h">📜 진행 기록 <small>최근이 위</small></div>${v.log.slice(-60).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=`<div class="side3"><div class="side-mid">${h}</div><aside class="side-l">${L}</aside><aside class="side-r">${R}</aside></div>`;
  // 전광판 흐르기 (공개 단계)
  if(v.phase==='show'&&v.shown<1){ const b=el.querySelector('.ta-run'), t0=performance.now(), target=v.board, dur=Math.min(9000,1200+target*250)-300;
    const iv=setInterval(()=>{ const x=Math.min(target, target*(performance.now()-t0)/dur); if(!b||!b.isConnected){ clearInterval(iv); return; } b.textContent='⏱️ '+x.toFixed(1); if(x>=target) clearInterval(iv); },80); }
  // 꾹 누르기
  const btn=el.querySelector('#taBtn'), fold=el.querySelector('#taFold');
  if(fold) fold.onclick=()=>ctx.act({k:'bid',x:0});
  if(btn){
    const show=()=>{ if(!hold) return; const el2=(performance.now()-hold.t0)/1000; const used=Math.max(0,el2-COUNT), cap=bank;
      if(el2<COUNT) btn.textContent=`카운트다운 ${(COUNT-el2).toFixed(1)}… (떼면 불참)`; else btn.textContent=`⏳ ${Math.min(used,cap).toFixed(1)}초 사용 중 — 떼면 확정`;
      btn.classList.toggle('drain', el2>=COUNT);
      if(used>=cap){ release(); return; } };
    const release=()=>{ if(!hold) return; const el2=(performance.now()-hold.t0)/1000; hold=null; clearInterval(raf); const x=el2<COUNT?0:Math.min(bank, r1(el2-COUNT)); ctx.act({k:'bid',x}); };
    btn.onpointerdown=e=>{ e.preventDefault(); if(hold) return; hold={t0:performance.now()}; try{ btn.setPointerCapture(e.pointerId); }catch(_){ } clearInterval(raf); raf=setInterval(show,100); show(); };
    btn.onpointerup=release; btn.onpointercancel=release; btn.oncontextmenu=e=>e.preventDefault();
  }
}
function status(v,ctx){ syncH(v); if(v.phase==='over') return ''; if(v.phase==='bid') return v.done[ctx.me]?'다른 사람을 기다리는 중…':'버튼을 꾹 누르세요'; if(v.phase==='show') return '전광판이 흐르는 중…'; return ''; }
const guide=`
<p><b>6인 시간 경매</b>(우리 둘 + 성격 다른 컴퓨터 플레이어 4명). 각자 ⏳ <b>${BANK}초</b>, 경매는 <b>${ROUNDS}번</b>.</p>
<ul><li>라운드마다 <b>큰 버튼을 실제로 꾹 누르고</b> 있어요. 처음 <b>${COUNT}초</b>는 카운트다운 — 이때 떼면 <b>불참</b>(시간 안 씀).</li>
<li>카운트다운이 끝나면 누르고 있는 동안 <b>내 시간이 줄어요</b>. 원하는 만큼 쓰고 떼면 입찰 확정.</li>
<li><b>가장 오래 누른 사람</b>이 🏅 승리 표식! 참가한 <b>모두</b> 쓴 시간만큼 잃어요. 0.1초까지 같으면 유찰.</li>
<li>누가 참가했는지·남은 시간은 비밀. <b>낙찰자와 낙찰 시간만</b> 공개돼요. (원작은 자기 시간도 안 보이지만, 여기선 내 시간은 보여요)</li>
<li>끝나면 🏅가 많은 순, 같으면 남은 시간이 많은 쪽이 위. 🏅가 가장 적은 사람이 꼴찌.</li></ul>
<div class="tipbox">💡 <b>팁</b><br>· 낙찰가를 보면 다른 사람이 얼마나 썼는지 짐작돼요. 비싸게 낙찰된 다음 판은 다들 지갑이 얇아요!<br>· 🃏 승부사 컴퓨터는 일부러 쉬다가 막판에 몰아 써요.</div>`;
window.GAMES.timeauc = { _sync:x=>syncH(x), maxH:6,
  title:'시간 경매', ref:'데블스 플랜 「시간 경매」', emoji:'⏳', tags:['경매','심리전','NPC','두뇌서바이벌'],
  tagline:'우리 둘 + 컴퓨터 4명. 버튼을 꾹 누르고 버티는 만큼 시간을 쓴다 — 가장 오래 버틴 사람이 표식을 가져간다.',
  guide, init, apply, mask, ai, render, status, step, stepDelay, noPersona:true, wide:true,
  aiDelay:()=>2500+Math.random()*4000,
  reset(){ hold=null; sig=''; clearInterval(raf); },
  bar:(v,i)=>`<span class="tag">🏅 ${v.tok[HSEAT[i]]}</span>`,
  result:(v,ctx)=>{ const k=(v.rank||[]).indexOf(HSEAT[ctx.me]); return k>=0?`${k+1}등 · 🏅${v.tok[HSEAT[ctx.me]]}`:''; },
};
})();
