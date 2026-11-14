(function(){
'use strict';
/* 빅 스몰 (1:1, 데블스 플랜 S2 결승 1R).
   각자 숫자 카드 0~10(11장), 칩 10개. 딜러는 사람마다 1~9 카드 한 세트.
   라운드마다 한 명은 ⚔️ 대결, 한 명은 🎲 베팅 (번갈아). 딜러가 대결자의 세트에서 1장을 펼치면
   대결자가 자기 카드 1장을 엎어 내고, 베팅자는 그 카드가 딜러 카드보다 BIG일지 SMALL일지 칩을 건다.
   맞히면 베팅자 +건 칩, 틀리면 베팅자 −건 칩 & 대결자 +두 숫자의 차이. 같은 숫자면 무승부(베팅 돌려받음).
   쓴 카드는 공개 후 버림. 18라운드 뒤 칩이 많은 쪽 승리, 상대 칩이 0이 되면 바로 승리.
   (원작은 칩 출처·대결 승리 조건을 밝히지 않아, 원작 최종 칩 20:21에 맞게 '은행에서 받음 + 베팅이 빗나가면 대결자 승'으로 정함) */
const ROUNDS=18, START=10, MAXB=5;
const range=(a,b)=>{ const r=[]; for(let i=a;i<=b;i++) r.push(i); return r; };
function init(starter){
  const s={chips:[START,START], hand:[range(0,10),range(0,10)], dealer:[U.shuffle(range(1,9)),U.shuffle(range(1,9))], usedD:[[],[]],
    round:0, starter, turn:null, winner:null, phase:'intro', hist:[], log:[], ev:0,
    notice:'🎙️ 결승 1라운드 「빅 스몰」을 시작합니다'};
  return s;
}
const duelOf=s=> (s.starter + s.round) % 2;   // 1라운드: 선(starter)이 베팅, 상대가 대결
function startRound(s){
  s.round++; const d=duelOf(s), b=1-d;
  s.duel=d; s.bettor=b; s.dcard=s.dealer[d].pop(); s.usedD[d].push(s.dcard); s.play=null; s.bet=null; s.res=null;
  s.phase='submit'; s.turn=d;
  s.notice=`🎙️ ${s.round}라운드 · 딜러 카드는 ${s.dcard}!`; s.ev++;
}
function settle(s){
  const d=s.duel, b=s.bettor, c=s.play, x=s.dcard, side = c>x?'big':c<x?'small':'draw', amt=s.bet.amt;
  let res;
  if(side==='draw'){ res={side, kind:'draw', dg:0, bg:0}; }
  else if(side===s.bet.side){ s.chips[b]+=amt; res={side, kind:'hit', dg:0, bg:amt}; }
  else { s.chips[b]-=amt; s.chips[d]+=Math.abs(c-x); res={side, kind:'miss', dg:Math.abs(c-x), bg:-amt}; }
  s.res=res;
  s.hist.push({r:s.round, duel:d, dcard:x, card:c, bet:s.bet.side, amt, side, kind:res.kind, naive:naiveBig(s.hand[d].concat([c]),x)});
  s.log.push(`${s.round}R · ${d?'B':'A'} 대결: 딜러 ${x} → ${c} (${side==='draw'?'같음':side.toUpperCase()}) · ${b?'B':'A'} ${s.bet.side.toUpperCase()} ${amt}칩 → ${res.kind==='draw'?'무승부':res.kind==='hit'?`베팅 적중 +${amt}`:`베팅 실패 −${amt}, 대결 +${res.dg}`}`);
  s.notice = res.kind==='draw'?'🎙️ 같은 숫자! 무승부입니다': res.kind==='hit'?`🎙️ ${side.toUpperCase()}! 베팅 적중`:`🎙️ ${side.toUpperCase()}! 베팅이 빗나갔습니다 — 대결 승리`;
  s.phase='settle'; s.turn=null; s.ev++;
}
function finish(s){
  const out = s.chips.findIndex(c=>c<=0);
  if(out>=0 || s.round>=ROUNDS){ s.phase='over'; s.turn=null;
    s.winner = out>=0 ? 1-out : s.chips[0]>s.chips[1]?0 : s.chips[1]>s.chips[0]?1 : 'draw';
    s.notice = out>=0 ? '🎙️ 칩이 바닥났습니다. 게임 종료!' : `🎙️ 최종 칩 ${s.chips[0]} : ${s.chips[1]}`; s.ev++; return; }
  startRound(s);
}
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(!a) return '알 수 없는 동작';
  if(s.turn!==p) return '상대 차례예요';
  if(s.phase==='submit'){
    if(a.k!=='play') return '카드를 내세요';
    const c=a.c|0, i=s.hand[p].indexOf(c); if(i<0) return '없는 카드예요';
    s.hand[p].splice(i,1); s.play=c; s.phase='bet'; s.turn=1-p; s.ev++;
    s.log.push(`${s.round}R · ${p?'B':'A'} 카드 1장을 엎어 냄`); return null;
  }
  if(s.phase==='bet'){
    if(a.k!=='bet') return 'BIG / SMALL에 거세요';
    if(a.side!=='big'&&a.side!=='small') return 'BIG이나 SMALL을 고르세요';
    const amt=a.amt|0, cap=Math.min(MAXB,s.chips[p]); if(!(amt>=1&&amt<=cap)) return `1~${cap}칩을 걸 수 있어요`;
    s.bet={side:a.side, amt}; s.phase='reveal'; s.turn=null; s.ev++; return null;
  }
  return '알 수 없는 동작';
}
function stepDelay(s){
  if(s.winner!=null) return null;
  if(s.phase==='intro') return 2400;
  if(s.phase==='reveal') return 1700;
  if(s.phase==='settle') return 3000;
  return null;
}
function step(s){
  if(s.phase==='intro'){ startRound(s); return; }
  if(s.phase==='reveal'){ settle(s); return; }
  if(s.phase==='settle'){ finish(s); return; }
}
function mask(s,p){
  const v=U.clone(s); v.dealer=[s.dealer[0].length,s.dealer[1].length];   // 딜러 덱 순서는 숨김 (남은 숫자는 usedD로 계산 가능)
  if(s.play!=null && (s.phase==='submit'||s.phase==='bet'||s.phase==='reveal') && s.duel!==p) v.play='?';
  if(s.duel!==p && (s.phase==='bet'||s.phase==='reveal')) v.hand[s.duel]=s.hand[s.duel].concat([s.play]).sort((a,b)=>a-b);   // 상대 입장: 엎은 카드는 아직 손에 있는 것처럼
  return v;
}

/* 컴퓨터 — 자기 자리에서 보이는 것만 씀 (상대 남은 카드는 버린 카드로 알 수 있음, 엎은 카드는 모름) */
function naiveBig(hand,x){ const ne=hand.filter(c=>c!==x); if(!ne.length) return .5; return ne.filter(c=>c>x).length/ne.length; }
function cardKeep(c,left){   // 0·10은 결과가 확실한 카드라 아껴 둘 가치
  const ext = c===0||c===10 ? 2.2 : c===1||c===9 ? .8 : 0;
  return ext*Math.min(1,left/6);
}
function ai(v,lvl=1){
  const me=1, o=0;
  if(v.turn!==me) return null;
  const H=v.hist;
  if(v.phase==='submit'){
    const x=v.dcard, hand=v.hand[me], left=ROUNDS-v.round;   // 상대가 볼 때 내 손 = hand 전체
    const pN=naiveBig(hand,x);
    // 상대(베팅자)가 "뻔한 쪽"을 얼마나 따라가는지
    const asB=H.filter(h=>h.duel===me&&h.side!=='draw'&&Math.abs(h.naive-.5)>.05);
    const follow=(asB.filter(h=>(h.naive>.5)===(h.bet==='big')).length+2)/(asB.length+3);
    const naiveSide = pN>=.5?'big':'small';
    const qBig = lvl===0 ? .5 : (naiveSide==='big' ? follow : 1-follow)*.85 + .075;
    const B=Math.min(v.chips[o], lvl===2?Math.max(1.5,avgBet(H,o)):2);
    return {k:'play', c:softPick(duelOpts(hand,x,qBig,B,left,lvl),[2.5,1.4,.9][lvl]).c};
  }
  if(v.phase==='bet'){
    const d=o, x=v.dcard;
    const hand = lvl===0 ? range(0,10).filter(c=>Math.random()<.8||v.hand[d].includes(c)) : v.hand[d];   // 쉬움: 버린 카드를 헷갈림
    const pN=naiveBig(hand,x);
    // 상대(대결자)가 뻔한 쪽을 피하는 정도
    const asD=H.filter(h=>h.duel===d&&h.side!=='draw'&&Math.abs(h.naive-.5)>.05);
    const contra=(asD.filter(h=>(h.naive>.5)!==(h.side==='big')).length+1)/(asD.length+3);
    let pBig;
    if(lvl===2){   // 상대 입장에서 생각: 내가(베팅자) 뻔한 쪽을 얼마나 따라왔는지 상대도 봤을 것
      const mine=H.filter(h=>h.duel===d&&h.side!=='draw'&&Math.abs(h.naive-.5)>.05);
      const fol=(mine.filter(h=>(h.naive>.5)===(h.bet==='big')).length+2)/(mine.length+3);
      const q=(pN>=.5?fol:1-fol)*.85+.075;
      pBig = .5*duelDist(hand,x,q,2,ROUNDS-v.round+1) + .5*((1-contra*.6)*pN + contra*.6*(1-pN));
    } else pBig = lvl===1 ? (1-contra*.6)*pN + contra*.6*(1-pN) : pN;
    let side = pBig>=.5?'big':'small';
    const conf=Math.abs(pBig-.5);
    if(conf<.12 && Math.random()<.45) side = side==='big'?'small':'big';   // 애매하면 감으로
    if(lvl===0 && Math.random()<.2) side = side==='big'?'small':'big';
    const lead=v.chips[me]-v.chips[o], late=v.round>=ROUNDS-3;
    let amt = 1 + Math.round(conf*[6,8,10][lvl]);
    if(lead>4 && lvl>0) amt=Math.min(amt,2);
    if(late && lead<0 && lvl>0) amt=Math.max(amt, Math.min(v.chips[me], -lead+1));
    amt=Math.max(1,Math.min(v.chips[me], MAXB, amt, lvl===2&&v.chips[me]<=4?Math.max(1,v.chips[me]-1):99));
    return {k:'bet', side, amt};
  }
  return null;
}
function duelOpts(hand,x,qBig,B,left,lvl){
  return hand.map(c=>{ let ev;
    if(c===x) ev=-.2; else { const side=c>x?'big':'small', q=side==='big'?qBig:1-qBig, dif=Math.abs(c-x);
      ev = q*(-B) + (1-q)*(dif + B); }
    if(lvl>0) ev -= cardKeep(c,left)*(lvl===2?1:.6);
    return {c, ev}; });
}
function duelDist(hand,x,qBig,B,left){   // 상대(대결자)가 EV로 고른다고 보고 BIG이 나올 확률
  const opts=duelOpts(hand,x,qBig,B,left,1), m=Math.max(...opts.map(o=>o.ev)); let wb=0, ws=0;
  for(const o of opts){ const w=Math.exp((o.ev-m)/1.4); if(o.c>x) wb+=w; else if(o.c<x) ws+=w; }
  return wb+ws>0 ? wb/(wb+ws) : .5;
}
function avgBet(H,p){ const L=H.filter(h=>h.duel!==p); if(!L.length) return 2; return L.reduce((a,h)=>a+h.amt,0)/L.length; }
function softPick(opts,T){ const m=Math.max(...opts.map(o=>o.ev)); const w=opts.map(o=>Math.exp((o.ev-m)/T)); let r=Math.random()*w.reduce((a,b)=>a+b,0); for(let i=0;i<opts.length;i++){ r-=w[i]; if(r<=0) return opts[i]; } return opts[opts.length-1]; }
function aiDelay(v){   // 결정의 무게: 큰 베팅·애매한 카드는 오래
  if(v.phase==='submit') return 1800+Math.random()*2600 + (v.round>=ROUNDS-4?1500:0);
  if(v.phase==='bet') return 1500+Math.random()*2200 + (Math.abs(naiveBig(v.hand[0],v.dcard)-.5)<.15?1500:0);
  return 1000;
}

/* 화면 */
let amtSel=1;
const cardH=(x,cls='')=>`<span class="bs-c ${cls}">${x==null||x==='?'?'':x}</span>`;
function render(el,v,ctx){
  const me=ctx.me, o=1-me;
  const nm=p=>p===me?'나':(ctx.mode==='solo'?'상대':U.esc(ctx.name(p)));
  const ga=p=>{ const n=nm(p), c=n.charCodeAt(n.length-1); return n+(c>=0xAC00&&c<=0xD7A3?((c-0xAC00)%28?'이':'가'):'이(가)'); };
  const role=p=> v.round>0 && v.phase!=='intro' ? (v.duel===p?'⚔️ 대결':'🎲 베팅') : '';
  let h='';
  if(v.notice) h+=`<div class="vr-speech">${U.esc(v.notice)}</div>`;
  h+=`<div class="py-top"><div class="py-sc ${v.turn===o?'buzz':''}"><small>${nm(o)} ${role(o)}</small><b>🪙 ${v.chips[o]}</b></div>
    <div class="py-goal"><small>${Math.max(1,v.round)} / ${ROUNDS}라운드</small><b>${v.dcard!=null&&v.phase!=='intro'?v.dcard:'?'}</b><small>딜러 카드${v.duel!=null?` (${nm(v.duel)} 세트)`:''}</small></div>
    <div class="py-sc me ${v.turn===me?'buzz':''}"><small>나 ${role(me)}</small><b>🪙 ${v.chips[me]}</b></div></div>`;
  if(v.phase!=='intro'){
    const shown = v.play==null ? null : (v.play==='?' ? '?' : v.play);
    const open = v.phase==='settle'||v.phase==='over' || (v.duel===me&&v.play!=null);
    const res=v.res;
    h+=`<div class="bs-mid"><div class="bs-slot"><small>${nm(v.duel)}의 카드</small>${v.play==null?cardH(null,'empty'):open?cardH(shown, res?res.side:''):cardH('?','back')}</div>
      <div class="bs-vs">vs</div>
      <div class="bs-slot"><small>딜러</small>${cardH(v.dcard,'dealer')}</div>
      <div class="bs-slot"><small>${nm(v.bettor)}의 베팅</small>${v.bet?`<span class="bs-bet ${v.bet.side}">${v.bet.side.toUpperCase()}<br><b>${v.bet.amt}칩</b></span>`:'<span class="bs-bet empty">…</span>'}</div></div>`;
  }
  // 고정 상황 줄
  let line='&nbsp;';
  if(v.phase==='submit') line = v.duel===me ? `딜러 ${v.dcard} — 낼 카드를 고르세요. 상대가 <b>틀리게</b> 걸면 차이만큼 칩!` : `${ga(v.duel)} 카드를 고르는 중…`;
  else if(v.phase==='bet') line = v.bettor===me ? `${nm(v.duel)}의 엎은 카드가 딜러 ${v.dcard}보다 클까요(BIG), 작을까요(SMALL)?` : `${ga(v.bettor)} 베팅을 고민 중…`;
  else if(v.phase==='reveal') line='카드를 뒤집습니다…';
  else if(v.phase==='settle'&&v.res){ const r=v.res; line = r.kind==='draw' ? '🤝 같은 숫자 — 베팅 돌려받음' : r.kind==='hit' ? `🎯 ${nm(v.bettor)} 베팅 적중 <b class="ok">+${r.bg}</b>` : `💥 베팅 실패 · ${nm(v.bettor)} <b class="bad">${r.bg}</b> · ${nm(v.duel)} <b class="ok">+${r.dg}</b>`; }
  h+=`<div class="py-line">${line}</div>`;
  if(v.phase==='bet'&&ctx.myTurn){ amtSel=Math.max(1,Math.min(v.chips[me],MAXB,amtSel));
    const pN=naiveBig(v.hand[v.duel],v.dcard);
    h+=`<div class="bs-ctl"><div class="bs-amt"><button class="ghost" data-a="m">−</button><b>${amtSel}칩</b><button class="ghost" data-a="p">+</button></div>
      <div class="fh-act"><button data-a="small" class="bs-sm">⬇️ SMALL</button><button data-a="big" class="bs-bg">⬆️ BIG</button></div>
      <small>상대 남은 카드로 보면 BIG ${Math.round(pN*100)}% · SMALL ${Math.round((1-pN)*100)}% (같은 숫자 제외) — 하지만 상대도 그걸 알아요</small></div>`; }
  // 손패
  const myTurnPlay = v.phase==='submit'&&ctx.myTurn;
  h+=`<div class="bs-hand"><small>${nm(o)} 남은 카드 (버린 카드로 다 알 수 있어요)</small><div>${range(0,10).map(c=>v.hand[o].includes(c)?cardH(c,'mini'):cardH(c,'mini gone')).join('')}</div></div>`;
  h+=`<div class="bs-hand me"><small>내 카드${myTurnPlay?' — 눌러서 엎어 내기':''}</small><div>${range(0,10).map(c=> v.hand[me].includes(c) ? `<button class="bs-c ${myTurnPlay?'pick':''}" data-c="${c}" ${myTurnPlay?'':'disabled'}>${c}</button>` : (v.play===c&&v.duel===me&&v.phase!=='settle'?cardH(c,'mini out'):cardH(c,'mini gone'))).join('')}</div></div>`;
  // 딜러 남은 세트
  h+=`<div class="info">딜러 세트 남은 숫자 · 내 세트 ${range(1,9).filter(c=>!v.usedD[me].includes(c)).join(' ')||'없음'} · ${nm(o)} 세트 ${range(1,9).filter(c=>!v.usedD[o].includes(c)).join(' ')||'없음'}</div>`;
  // 라운드 기록표
  if(v.hist.length){ h+=`<div class="bs-tbl"><table><tr><th>R</th><th>대결</th><th>딜러</th><th>카드</th><th>베팅</th><th>결과</th></tr>${v.hist.slice().reverse().map(x=>`<tr><td>${x.r}</td><td>${nm(x.duel)}</td><td>${x.dcard}</td><td><b>${x.card}</b></td><td>${x.bet==='big'?'⬆️':'⬇️'} ${x.amt}</td><td>${x.kind==='draw'?'🤝':x.kind==='hit'?`🎯 ${nm(1-x.duel)} +${x.amt}`:`💥 ${nm(x.duel)} +${Math.abs(x.card-x.dcard)}`}</td></tr>`).join('')}</table></div>`; }
  el.innerHTML=h;
  el.onclick=e=>{ const a=e.target.closest('[data-a],[data-c]'); if(!a||a.disabled) return;
    if(a.dataset.c!=null) return ctx.act({k:'play', c:+a.dataset.c});
    const k=a.dataset.a;
    if(k==='m'){ amtSel=Math.max(1,amtSel-1); return ctx.rerender(); }
    if(k==='p'){ amtSel=Math.min(v.chips[me],MAXB,amtSel+1); return ctx.rerender(); }
    if(k==='big'||k==='small') return ctx.act({k:'bet', side:k, amt:amtSel}); };
}
const guide=`
<p><b>1:1 숫자 심리전</b>. 각자 숫자 카드 <b>0~10</b>(11장)과 칩 ${START}개. 딜러는 사람마다 <b>1~9 카드 한 세트</b>를 따로 섞어 둬요.</p>
<ol><li>라운드마다 한 명은 <b>⚔️ 대결</b>, 한 명은 <b>🎲 베팅</b> (번갈아 가며).</li>
<li>딜러가 <b>대결자의 세트</b>에서 1장을 펼쳐요.</li>
<li>대결자는 그걸 보고 자기 카드 1장을 <b>엎어서</b> 내요.</li>
<li>베팅자는 그 카드가 딜러 카드보다 <b>BIG</b>(크다)일지 <b>SMALL</b>(작다)일지 칩을 걸어요(1~${MAXB}개).</li>
<li>공개! · 맞히면 베팅자 <b>+건 칩</b> · 틀리면 베팅자 <b>−건 칩</b>, 대결자 <b>+두 숫자의 차이</b> · 같은 숫자면 무승부(돌려받음)</li></ol>
<p>쓴 카드는 공개 후 버려요 — <b>상대 남은 카드는 다 보여요.</b> ${ROUNDS}라운드 뒤 칩이 많은 쪽 승리, 상대 칩을 0으로 만들면 바로 승리.</p>
<div class="tipbox">💡 <b>팁</b><br>· 0은 무조건 SMALL, 10은 무조건 BIG — 아껴 두면 막판에 확실한 카드가 돼요.<br>· 딜러 카드가 2면 누구나 BIG을 생각하죠. 그래서 1이나 0을 내는 게 노림수 — 차이는 작지만 베팅을 빗나가게 해요.<br>· 같은 숫자를 내면 무승부 — 상대가 크게 걸 것 같을 때 피하는 수.<br>· 원작은 칩을 어디서 받는지 밝히지 않아서, 칩은 은행에서 나오는 걸로 정했어요(원작 최종 칩 20:21). 베팅 상한 ${MAXB}칩도 원작(대부분 1~3칩)을 보고 정했어요 — 상한이 없으면 마지막 라운드에 베팅하는 쪽이 너무 유리해서요.</div>`;
window.GAMES.bigsmall = {
  title:'빅 스몰', ref:'데블스 플랜 「빅 스몰」', emoji:'⚖️', tags:['심리전','블러프','두뇌서바이벌','결승'],
  tagline:'딜러 카드보다 클까 작을까. 엎은 카드 한 장을 두고 벌이는 18라운드 수 읽기.',
  guide, init, apply, mask, ai, aiDelay, render, step, stepDelay,
  reset(){ amtSel=1; },
  status:(v,ctx)=> v.phase==='intro'?'곧 시작해요': v.phase==='submit'?(ctx.myTurn?'낼 카드를 고르세요':'상대가 카드를 고르는 중…'): v.phase==='bet'?(ctx.myTurn?'BIG / SMALL에 거세요':'상대가 베팅 고민 중…'): v.phase==='reveal'?'공개!': v.phase==='settle'?'다음 라운드 준비 중…':'',
  bar:(v,i)=>`<span class="score">🪙 ${v.chips[i]}</span>`,
  pulse:v=>v.chips[1]-v.chips[0], pulseStep:3,
};
})();
