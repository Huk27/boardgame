(function(){
'use strict';
/* 베팅 가위바위보 (더 지니어스 시즌 3 · 2회·6회 데스매치) — 1:1 + 관전자 10명(NPC).
   관전자 10명이 라운드 순서대로 가위바위보 표식을 하나씩 미리 정해 둠(비공개). 칩 1개씩으로 시작, 10라운드, 선은 번갈아.
   선이 ⚔️ 승부 또는 💰 베팅을 고름 → 한 명은 그 라운드 관전자의 표식과 가위바위보(이기면 1~4R 1칩 · 5~8R 2칩 · 9~10R 3칩),
   다른 한 명은 그 승부 결과(이김/짐)에 칩을 걸어 맞히면 건 만큼 더 받고, 틀리면 잃고, 비기면 돌려받음.
   🕵️ 정보 요청 3번: 관전자에게 그 사람이 낸 표식을 귓속말로 물어볼 수 있음 — 성격에 따라 거짓말도 함(물어본 사실은 공개, 내용은 나만).
   10라운드 뒤 칩이 많은 쪽 승리, 같으면 연장 라운드. */
const ROUNDS=10, ASKS=3;
const RPS=['✊','✌️','🖐️'], RN=['바위','가위','보'];
const beats=(a,b)=> (a===0&&b===1)||(a===1&&b===2)||(a===2&&b===0);
const reward=r=> r<=4?1 : r<=8?2 : 3;
const DEF_P={talk:.5,aggr:.5,trust:.5,bluff:.4,logic:.6,temper:.4};
const EXTRA=[{id:'x1',name:'가람',emo:'🧑',arch:'관전자',talk:.5,aggr:.4,trust:.6,bluff:.3,logic:.5,temper:.4},{id:'x2',name:'나래',emo:'👩',arch:'관전자',talk:.6,aggr:.5,trust:.4,bluff:.6,logic:.5,temper:.5}];
const spec=id=>NPCS.byId(id)||EXTRA.find(e=>e.id===id)||DEF_P;
function init(starter){
  const ids=U.shuffle(NPCS.cast(8).concat(['x1','x2']));
  const signs=ids.map(id=>{ const p=spec(id); const pref=p.aggr>.65?0:p.bluff>.6?2:Math.random()*3|0; return Math.random()<.5?pref:Math.random()*3|0; });
  /* 관전자마다 두 사람 중 누구에게 더 호의적인지(거짓말 확률에 반영) */
  const favor=ids.map(()=>Math.random()<.5?0:1);
  return {phase:'intro', starter:starter|0, round:0, specs:ids, signs, favor, chips:[1,1], first:starter|0, asks:[ASKS,ASKS], asked:[[],[]], told:[{},{}], mode:null, player:null, bettor:null, play:null, bet:null, hist:[], extra:0, turn:null, winner:null, ev:0, log:[],
    notice:'🎙️ 데스매치 「베팅 가위바위보」 — 관전자의 표식을 읽고, 승부할지 베팅할지'};
}
function startRound(s){ s.round++; s.mode=null; s.player=null; s.bettor=null; s.play=null; s.bet=null; s.phase='choose';
  if(s.round>ROUNDS&&!s.signs[s.round-1]){ s.signs.push(Math.random()*3|0); s.specs.push(U.pick(s.specs)); s.favor.push(Math.random()<.5?0:1); }
  s.turn=s.first; s.notice=`🎙️ ${s.round>ROUNDS?`연장 ${s.round-ROUNDS}`:`${s.round}/${ROUNDS}`}라운드 — 관전자 ${spec(s.specs[s.round-1]).emo} ${spec(s.specs[s.round-1]).name} · 승부 보상 ${reward(Math.min(s.round,10))}칩 · ${['A','B'][s.first]}이(가) 선택`; s.log.push(`🎙️ ${s.round}R`); }
function tell(s,p,k){ /* 관전자 k가 p에게 표식을 알려 줌 — 성격·호의에 따라 거짓말 */ const sp=spec(s.specs[k]); const fav=s.favor[k]===p; const lie=Math.random()<Math.max(.05,sp.bluff*.55+(fav?-.15:.15));
  const real=s.signs[k]; const said= lie ? [0,1,2].filter(x=>x!==real)[Math.random()*2|0] : real; s.told[p][k]=said; return said; }
function apply(s,p,a){ if(s.winner!=null) return '게임이 끝났어요'; if(!a) return '알 수 없는 동작'; const o=1-p;
  if(a.k==='ask'){ if(!['choose','act'].includes(s.phase)) return '지금은 물어볼 수 없어요'; if(s.asks[p]<=0) return '정보 요청을 다 썼어요'; const k=a.r|0; if(!(k>=s.round-1&&k<s.specs.length)) return '아직 남은 라운드의 관전자만'; if(s.asked[p].includes(k)) return '이미 물어봤어요'; s.asks[p]--; s.asked[p].push(k); tell(s,p,k); s.log.push(`🕵️ ${['A','B'][p]}이(가) ${k+1}번 관전자에게 귓속말`); s.ev++; return null; }
  if(a.k==='choose'){ if(s.phase!=='choose'||s.turn!==p) return '선이 아니에요'; if(a.m!=='duel'&&a.m!=='bet') return '승부 또는 베팅'; s.mode=a.m; s.player= a.m==='duel'?p:o; s.bettor=1-s.player; s.phase='act'; s.turn=null;
    s.notice=`${['A','B'][p]}: ${a.m==='duel'?'⚔️ 승부!':'💰 베팅!'} → ${['A','B'][s.player]}이(가) 관전자와 가위바위보, ${['A','B'][s.bettor]}이(가) 결과에 베팅`; s.log.push(s.notice); s.ev++; return null; }
  if(a.k==='play'){ if(s.phase!=='act'||p!==s.player) return '가위바위보할 사람이 아니에요'; if(s.play!=null) return '이미 냈어요'; const x=a.x|0; if(x<0||x>2) return '✊ ✌️ 🖐️ 중에'; s.play=x; s.ev++; return null; }
  if(a.k==='bet'){ if(s.phase!=='act'||p!==s.bettor) return '베팅할 사람이 아니에요'; if(s.bet!=null) return '이미 걸었어요'; const n=a.n|0;
    if(n===0){ s.bet={n:0}; s.ev++; return null; } if(a.on!=='W'&&a.on!=='L') return '이김 또는 짐에'; if(n<1||n>s.chips[p]) return `1~${s.chips[p]}칩`; s.bet={n,on:a.on}; s.ev++; return null; }
  return '알 수 없는 동작'; }
function stepDelay(s){ if(s.winner!=null) return null; if(s.phase==='intro') return 2400; if(s.phase==='act') return (s.play!=null&&s.bet!=null)?700:null; if(s.phase==='rv1') return 1600; if(s.phase==='rv2') return 1800; if(s.phase==='rend') return 2400; return null; }
function step(s){
  if(s.phase==='intro'){ startRound(s); s.ev++; return; }
  if(s.phase==='act'){ s.phase='rv1'; const sp=spec(s.specs[s.round-1]); s.notice=`🥁 관전자 ${sp.emo} ${sp.name}의 표식은… ${RPS[s.signs[s.round-1]]} ${RN[s.signs[s.round-1]]}!`; s.log.push(s.notice); s.ev++; return; }
  if(s.phase==='rv1'){ const sg=s.signs[s.round-1], x=s.play; const res = x===sg?'D' : beats(x,sg)?'W':'L'; s.res=res; const rw=reward(Math.min(s.round,10));
    if(res==='W') s.chips[s.player]+=rw; let msg=`${['A','B'][s.player]} ${RPS[x]} → ${res==='W'?`승리! +${rw}칩`:res==='L'?'패배':'무승부'}`;
    if(s.bet&&s.bet.n){ if(res==='D') msg+=` · 베팅 ${s.bet.n}칩은 그대로`; else if(s.bet.on===res){ s.chips[s.bettor]+=s.bet.n; msg+=` · ${['A','B'][s.bettor]} 베팅 적중 +${s.bet.n}`; } else { s.chips[s.bettor]-=s.bet.n; msg+=` · ${['A','B'][s.bettor]} 베팅 실패 −${s.bet.n}`; } }
    else msg+=` · ${['A','B'][s.bettor]} 베팅 안 함`;
    s.hist.push({r:s.round,mode:s.mode,player:s.player,x,sg,res,bet:s.bet,chips:s.chips.slice()}); s.notice=`${msg} (칩 ${s.chips[0]} : ${s.chips[1]})`; s.log.push(s.notice); s.phase='rend'; s.ev++; return; }
  if(s.phase==='rend'){ if(s.round>=ROUNDS&&s.chips[0]!==s.chips[1]){ s.phase='over'; s.winner=s.chips[0]>s.chips[1]?0:1; s.notice=`🏁 칩 ${s.chips[0]} : ${s.chips[1]} — ${['A','B'][s.winner]} 생존!`; s.log.push(s.notice); s.ev++; return; }
    if(s.round>=ROUNDS+5){ s.phase='over'; s.winner='both'; s.notice='🏁 연장까지 동점 — 무승부'; s.ev++; return; }
    s.first=1-s.first; startRound(s); s.ev++; return; }
}
function mask(s,p){ const v=U.clone(s), open=s.phase==='over'; if(!open){ v.signs=s.signs.map((x,k)=>k<s.round-1||(k===s.round-1&&['rv1','rend'].includes(s.phase))?x:null); v.told=[{},{}]; v.told[p]=s.told[p]; v.favor=null; }
  if(s.phase==='act'){ v.play= p===s.player ? s.play : (s.play!=null?'?':null); v.bet= p===s.bettor ? s.bet : (s.bet!=null?'?':null); } return v; }
/* 컴퓨터: 들은 표식(믿을 만한 관전자인지)으로 판단 */
function knowSign(v,me,lvl){ const k=v.round-1; const t=v.told[me]&&v.told[me][k]; if(t==null) return null; return t; }
function aiSeat(v,me,lvl){ lvl=lvl==null?1:lvl; const o=1-me, k=v.round-1;
  /* 정보 요청: 남은 큰 라운드 위주 */
  if(lvl>0&&['choose','act'].includes(v.phase)&&v.asks[me]>0){ /* 내가 선인 큰 라운드의 관전자에게 미리 물어봄 */ const firstOf=r=>(r-v.round)%2===0?v.first:1-v.first;
    const cand=[]; for(let r=v.round;r<=ROUNDS;r++){ const kk=r-1; if(v.asked[me].includes(kk)) continue; const mine=firstOf(r)===me; const sc=reward(r)*(mine?1:.35)-(lvl===2?spec(v.specs[kk]).bluff*1.5:0); cand.push({kk,sc}); }
    cand.sort((a,b)=>b.sc-a.sc); const pick=cand.slice(0,v.asks[me]).find(c=>c.kk===k)||(cand[0]&&cand[0].sc>=1.8?cand[0]:null); if(pick) return {k:'ask',r:pick.kk}; }
  const known=knowSign(v,me,lvl);
  if(v.phase==='choose'&&v.turn===me){ const oppAsked=v.asked[o].includes(k); if(known!=null&&Math.random()<.85) return {k:'choose',m:'duel'}; if(oppAsked&&lvl>0) return {k:'choose',m:'bet'}; return {k:'choose',m:Math.random()<.5?'duel':'bet'}; }
  if(v.phase==='act'&&v.player===me&&v.play==null){ if(known!=null&&lvl>0){ const win=[0,1,2].find(x=>beats(x,known)); return {k:'play',x:win}; } return {k:'play',x:Math.random()*3|0}; }
  if(v.phase==='act'&&v.bettor===me&&v.bet==null){ if(v.chips[me]<=0) return {k:'bet',n:0};
    const oppAsked=v.asked[o].includes(k); let pW=1/3, pL=1/3; if(oppAsked){ pW=.65; pL=.15; }
    if(known!=null&&lvl>0&&!oppAsked){ /* 상대가 모르는 표식 — 그래도 상대 손은 몰라서 반반 */ }
    const on = pW>pL?'W':'L'; const edge=Math.abs(pW-pL); if(edge<.1&&Math.random()<.6) return {k:'bet',n:0};
    const n=Math.max(1,Math.min(v.chips[me], Math.round(v.chips[me]*(edge>.3?.6:.3)))); return {k:'bet',n,on}; }
  return null; }
function ai(v,lvl){ return aiSeat(v,1,lvl); }
function aiDelay(S){ return 1300+Math.random()*1800; }

/* 화면 */
let betN=1, betOn='W', sig='';
function render(el,v,ctx){
  const me=ctx.me, o=1-me, nm=p=>p===me?'나':U.esc(ctx.name(p)), AB=t=>String(t).replace(/\bA\b/g,nm(0)).replace(/\bB\b/g,nm(1));
  const sg=v.round+':'+v.phase; if(sg!==sig){ sig=sg; betN=Math.min(1,v.chips[me]); betOn='W'; }
  let h=`<div class="hl-notice">${U.esc(AB(v.notice||''))}</div>`;
  h+=`<div class="info">칩 나 <b>${v.chips[me]}</b> : <b>${v.chips[o]}</b> ${nm(o)} · 정보 요청 ${v.asks[me]}번 남음 · ${Math.min(v.round,ROUNDS)}/${ROUNDS}라운드</div>`;
  const N=Math.max(ROUNDS,v.specs.length);
  h+=`<div class="br-specs">${v.specs.slice(0,N).map((id,k)=>{ const sp=spec(id), cur=k===v.round-1, past=k<v.round-1||(cur&&v.signs[k]!=null); const told=v.told[me]&&v.told[me][k];
      return `<div class="br-sp ${cur?'cur':''} ${past?'past':''}"><small>${k+1}R·${reward(Math.min(k+1,10))}칩</small><div>${sp.emo}</div><b>${U.esc(sp.name)}</b>
        <div class="br-sg">${v.signs[k]!=null?RPS[v.signs[k]]:'❔'}</div><small>${told!=null?`귓속말 ${RPS[told]}`:''}${v.asked[o].includes(k)?' · 상대도 물어봄':''}</small>
        ${!past&&v.asks[me]>0&&!v.asked[me].includes(k)&&['choose','act'].includes(v.phase)?`<button class="ghost" data-ask="${k}">🕵️ 물어보기</button>`:''}</div>`; }).join('')}</div>`;
  if(v.phase==='choose'&&v.turn===me) h+=`<div class="vr-card"><b>🎯 선 — 고르세요</b> <small>승부: 내가 관전자와 가위바위보(이기면 +${reward(Math.min(v.round,10))}칩) · 베팅: 상대가 가위바위보, 내가 결과에 칩 걸기</small><div class="fh-act"><button data-ch="duel">⚔️ 승부</button><button data-ch="bet">💰 베팅</button></div></div>`;
  else if(v.phase==='choose') h+=`<div class="vr-card bm-wait"><b>${nm(o)}이(가) 고르는 중…</b></div>`;
  if(v.phase==='act'){ if(v.player===me&&v.play==null) h+=`<div class="vr-card"><b>✊ 관전자와 가위바위보</b><div class="fh-act br-rps">${RPS.map((x,k)=>`<button data-x="${k}">${x} ${RN[k]}</button>`).join('')}</div></div>`;
    else if(v.bettor===me&&v.bet==null){ betN=Math.max(1,Math.min(betN,v.chips[me]||1));
      h+=`<div class="vr-card"><b>💰 ${nm(o)}의 승부 결과에 베팅</b> <small>맞히면 +건 만큼, 틀리면 −, 비기면 그대로</small><div class="fh-act"><button class="${betOn==='W'?'':'ghost'}" data-on="W">${nm(o)} 이김</button><button class="${betOn==='L'?'':'ghost'}" data-on="L">${nm(o)} 짐</button></div>
        ${v.chips[me]>0?`<div class="bs-amt"><button class="ghost" data-a="m">−</button><b>${betN}칩</b><button class="ghost" data-a="p">+</button></div><div class="fh-act"><button data-a="bet">베팅</button><button class="ghost" data-a="nobet">안 걸기</button></div>`:`<div class="fh-act"><button data-a="nobet">칩이 없어 넘기기</button></div>`}</div>`; }
    else h+=`<div class="vr-card bm-wait"><small>냈어요 — 기다리는 중</small></div>`; }
  if(v.phase==='over') h+=`<div class="sn-score"><div class="h"><b>나</b> ${v.chips[me]}칩</div><div><b>${nm(o)}</b> ${v.chips[o]}칩</div></div>`;
  h+=`<div class="bm-log">${v.log.slice(-7).reverse().map(x=>`<div>${U.esc(AB(x))}</div>`).join('')}</div>`;
  el.innerHTML=h;
  el.onclick=e=>{ const q=e.target.closest('[data-ask]'); if(q) return ctx.act({k:'ask',r:+q.dataset.ask});
    const c=e.target.closest('[data-ch]'); if(c) return ctx.act({k:'choose',m:c.dataset.ch});
    const x=e.target.closest('[data-x]'); if(x) return ctx.act({k:'play',x:+x.dataset.x});
    const on=e.target.closest('[data-on]'); if(on){ betOn=on.dataset.on; return ctx.rerender(); }
    const a=e.target.closest('[data-a]'); if(!a) return; const k=a.dataset.a;
    if(k==='m'){ betN=Math.max(1,betN-1); return ctx.rerender(); } if(k==='p'){ betN=Math.min(v.chips[me],betN+1); return ctx.rerender(); }
    if(k==='bet') return ctx.act({k:'bet',n:betN,on:betOn}); if(k==='nobet') return ctx.act({k:'bet',n:0}); };
}
function status(v,ctx){ const me=ctx.me; if(v.phase==='over') return ''; if(v.phase==='choose') return v.turn===me?'승부 또는 베팅':'상대 선택 중'; if(v.phase==='act') return (v.player===me&&v.play==null)?'가위바위보!':(v.bettor===me&&v.bet==null)?'베팅하세요':'기다리는 중'; return '진행 중…'; }
const guide=`
<p><b>관전자의 손을 읽는 가위바위보</b> — 1:1 + 관전자 10명(컴퓨터).</p>
<ol><li>관전자 10명이 라운드 순서대로 가위바위보 표식을 <b>미리 정해 둬요</b>(비공개). 칩은 1개씩, 10라운드, 선은 번갈아.</li>
<li>선이 <b>⚔️ 승부</b> 또는 <b>💰 베팅</b>을 골라요 → 한 명은 그 라운드 관전자와 가위바위보(이기면 1~4R 1칩 · 5~8R 2칩 · 9~10R 3칩), 다른 한 명은 그 결과(이김/짐)에 칩을 걸어요.</li>
<li>베팅: 맞히면 <b>건 만큼 더</b>, 틀리면 잃고, 비기면 그대로.</li>
<li>🕵️ <b>정보 요청 3번</b>: 관전자에게 표식을 귓속말로 물어봐요 — <b>거짓말할 수도</b> 있어요. 물어본 사실은 상대에게도 보여요.</li>
<li>10라운드 뒤 칩이 많은 쪽 생존. 같으면 연장.</li></ol>
<div class="tipbox">💡 <b>팁</b><br>· 상대가 물어본 라운드에 상대가 승부한다면, '상대 이김'에 거는 게 안전할지도.<br>· 보상이 큰 9·10라운드 관전자에게 정보를 아껴 두세요.</div>`;
const guideSteps=[
  {t:'👥 관전자 10명', h:'라운드마다 관전자 한 명의 <b>미리 정한 표식</b>과 가위바위보를 해요.', demo:s=>{ startRound(s); return s; }},
  {t:'⚔️ 승부 or 💰 베팅', h:'선이 고르면, 한 명은 관전자와 <b>가위바위보</b>, 다른 한 명은 그 <b>결과에 베팅</b>.', demo:s=>{ startRound(s); s.turn=0; return s; }},
  {t:'🕵️ 귓속말', h:'관전자에게 표식을 물어볼 수 있어요(3번). 하지만 <b>거짓말</b>일 수도!', demo:s=>{ startRound(s); s.asks[0]=2; s.asked[0]=[0]; s.told[0][0]=s.signs[0]; return s; }},
];
window.GAMES.betrps = {
  title:'베팅 가위바위보', ref:'더 지니어스 「베팅 가위바위보」', emoji:'✊', tags:['가위바위보','베팅','심리전','두뇌서바이벌'],
  tagline:'관전자의 손을 읽어라 — 승부할 것인가, 남의 승부에 걸 것인가.',
  guide, guideSteps, init, apply, mask, ai, aiDelay, render, status, step, stepDelay,
  reset(){ betN=1; betOn='W'; sig=''; },
  bar:(v,i)=>`<span class="tag">🪙${v.chips[i]}</span>`,
  result:(v,ctx)=>`칩 ${v.chips[ctx.me]} : ${v.chips[1-ctx.me]}`,
  pulse:v=>v.chips[1]-v.chips[0], pulseStep:2,
  _aiSeat:aiSeat,
};
})();
