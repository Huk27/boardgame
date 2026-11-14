(function(){
'use strict';
/* 믹스 앤 매치 (피의 게임 시즌 3 · 파이널 3라운드) — 4인(우리 둘 + NPC 2명).
   노란 선이 그려진 투명 카드 6장이 3초마다 한 장씩 쌓이는데, 화면엔 늘 '최근 3장'만 겹쳐 보임(디지털 숫자 두 자리 판).
   1·3·5번째 카드를 합치면 첫째 숫자, 2·4·6번째 카드를 합치면 둘째 숫자(각각 0~99). 두 숫자의 합을 먼저 외치면 +1, 틀리면 10초 동안 못 외침.
   5라운드, 점수가 높은 사람 승리(남은 라운드로 못 뒤집으면 콜드게임). 문제는 보이는 장면만으로 합이 하나로 정해지는 것만 냄. */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로, 나머지는 NPC */
const N=4, ROUNDS=5, SHOW=3000, ANS=35000, LOCK=10000; let HSEAT=[0,2]; const SEATORD=[0,2,1,3];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; }; const NPCSEATS=()=>[0,1,2,3].filter(i=>!HSEAT.includes(i));
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i), ALL=[0,1,2,3];
const nm=i=>`{s${i}}`;
/* 7세그먼트: a b c d e f g = 0..6 / 두 자리 → 칸 0~6(십의 자리), 7~13(일의 자리) */
const SEG=[0b0111111,0b0000110,0b1011011,0b1001111,0b1100110,0b1101101,0b1111101,0b0000111,0b1111111,0b1101111];
function segsOf(n){ const o=[]; const t=Math.floor(n/10), u=n%10; if(n>=10) for(let k=0;k<7;k++) if(SEG[t]>>k&1) o.push(k); for(let k=0;k<7;k++) if(SEG[u]>>k&1) o.push(7+k); return o; }
const PAT=[...Array(100).keys()].map(n=>new Set(segsOf(n)));
function viewsOf(cards){ /* V1={1}, V2={1,2}, Vk={k-2,k-1,k} */ const V=[]; for(let k=0;k<6;k++){ const s=new Set(); for(let j=Math.max(0,k-2);j<=k;j++) cards[j].forEach(x=>s.add(x)); V.push(s); } return V; }
/* 각 칸마다 6장의 포함 여부(64가지) 중 보이는 장면과 맞는 것 → (첫째 숫자에 켜짐, 둘째 숫자에 켜짐) 가능한 조합 */
function allowed(V){ const A=[]; for(let s=0;s<14;s++){ const ok=new Set(); for(let m=0;m<64;m++){ const c=k=>m>>k&1; let good=true; for(let k=0;k<6;k++){ let on=0; for(let j=Math.max(0,k-2);j<=k;j++) on|=c(j); if(on!==(V[k].has(s)?1:0)){ good=false; break; } } if(!good) continue; ok.add(((c(0)|c(2)|c(4))<<1)|(c(1)|c(3)|c(5))); } A.push(ok); } return A; }
function solve(V){ const A=allowed(V); let best=[], bc=1e9;
  for(let a=0;a<100;a++) for(let b=0;b<100;b++){ let cost=0; for(let s=0;s<14;s++){ const key=((PAT[a].has(s)?1:0)<<1)|(PAT[b].has(s)?1:0); if(!A[s].has(key)) cost++; if(cost>bc) break; } if(cost<bc){ bc=cost; best=[[a,b]]; } else if(cost===bc) best.push([a,b]); }
  return {cost:bc, pairs:best, sums:[...new Set(best.map(p=>p[0]+p[1]))]}; }
function split(segs){ const c=[[],[],[]]; const sh=U.shuffle(segs.slice()); sh.forEach((x,k)=>c[k<3?k:Math.random()*3|0].push(x)); return c; }
function makePuzzle(){ for(let g=0;g<300;g++){ const a=10+(Math.random()*90|0), b=10+(Math.random()*90|0); const A=split(segsOf(a)), B=split(segsOf(b)); if(A.some(x=>!x.length)||B.some(x=>!x.length)) continue;
    const cards=[A[0],B[0],A[1],B[1],A[2],B[2]]; const V=viewsOf(cards); const r=solve(V); if(r.cost===0&&r.sums.length===1&&r.sums[0]===a+b) return {a,b,cards,V:V.map(s=>[...s])}; } return null; }
const STYLE={seojin:'logic', doyun:'warm', haram:'calm', yuna:'emo', minho:'sly', taekyung:'hot', jihu:'sly', soyul:'warm'};
const DEF_P={talk:.5,aggr:.5,trust:.5,bluff:.4,logic:.6,temper:.4};
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
const LINES={logic:{right:['겹친 부분만 빼면 돼요.','계산 끝.'],wrong:['…선 하나를 잘못 봤네요.']},warm:{right:['헉 맞았다 😊'],wrong:['아 헷갈렸어요 😢']},calm:{right:['…'],wrong:['…']},emo:{right:['꺄 맞혔다!! 🥳'],wrong:['으아 아니야?! 😭']},sly:{right:['쉽네요 😏'],wrong:['…일부러요 😏']},hot:{right:['봤죠?! 🔥'],wrong:['아 왜!! 😤']}};
function say(s,i,kind){ if(isH(i)) return; const st=STYLE[P(s,i).id]||'calm'; const L=(LINES[st]||LINES.calm)[kind]; if(L) s.say={seat:i,text:U.pick(L),n:(s.say?s.say.n:0)+1}; }

function init(starter,o){ const k=Math.max(2,Math.min(4,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k); const s={phase:'intro', who:{}, starter:starter|0, round:0, pz:null, ci:-1, t0:0, until:0, score:[0,0,0,0], lock:[0,0,0,0], plan:{}, hist:[], say:null, log:[], turn:null, winner:null, ev:0, notice:'🎙️ 파이널 「믹스 앤 매치」 — 겹친 선 속 두 숫자를 찾아 합을 외치세요'};
  s.hs=HSEAT.slice(); const ids=NPCS.cast(N-HSEAT.length); NPCSEATS().forEach((i,k)=>s.who[i]=ids[k]); return s; }
function startRound(s){ s.round++; s.pz=makePuzzle(); s.ci=0; s.t0=Date.now(); s.phase='show'; s.until=s.t0+SHOW*6+ANS; s.lock=[0,0,0,0];
  s.notice=`🎬 ${s.round}/${ROUNDS}라운드 — 카드가 3초마다 한 장씩! (화면엔 최근 3장만)`; s.log.push(`🎬 ${s.round}라운드`);
  for(const i of NPCSEATS()) s.plan[i]=planFor(s.pz.V,1,P(s,i)); }
const LV=[{err:.055,base:18},{err:.035,base:14},{err:.022,base:12}];
function planFor(V,lvl,pp){ const L=LV[lvl]; pp=pp||DEF_P; const noisy=V.map(v=>{ const s=new Set(v); for(let x=0;x<14;x++) if(Math.random()<L.err*(1.3-pp.logic*.5)){ if(s.has(x)) s.delete(x); else s.add(x); } return s; });
  const r=solve(noisy); const sum=U.pick(r.sums); return {at: SHOW*6 + L.base*1000*(.5+Math.random())*(1.2-pp.temper*.4), sum}; }
function apply(s,p,a){ syncH(s); if(s.winner!=null) return '게임이 끝났어요'; if(!a||a.k!=='ans') return '알 수 없는 동작'; return answer(s,HSEAT[p],a.n); }
function answer(s,i,n){ if(s.phase!=='show') return '지금은 외칠 수 없어요'; if(Date.now()<s.lock[i]) return `${Math.ceil((s.lock[i]-Date.now())/1000)}초 뒤에 외칠 수 있어요`; n=Math.round(+n); if(!Number.isFinite(n)) return '숫자를 입력하세요';
  const right=s.pz.a+s.pz.b;
  if(n===right){ s.score[i]++; s.phase='rend'; s.rendAt=Date.now(); s.notice=`⭕ ${nm(i)} "${n}!" 정답 — ${s.pz.a} + ${s.pz.b} · +1점`; s.log.push(s.notice); s.hist.push({r:s.round,w:i,a:s.pz.a,b:s.pz.b}); say(s,i,'right'); s.ev++; return null; }
  s.lock[i]=Date.now()+LOCK; s.notice=`❌ ${nm(i)} "${n}" — 틀렸어요! 10초 동안 못 외쳐요`; s.log.push(s.notice); say(s,i,'wrong'); s.ev++; return null; }
function stepDelay(s){ syncH(s); if(s.winner!=null) return null; const now=Date.now();
  if(s.phase==='intro') return 2400; if(s.phase==='rend') return 4500;
  if(s.phase==='show'){ let t=s.until-now; const nextCard=s.t0+SHOW*(s.ci+1); if(s.ci<6) t=Math.min(t,nextCard-now); for(const i of NPCSEATS()){ const pl=s.plan[i]; if(pl&&!pl.done) t=Math.min(t,Math.max(s.t0+pl.at,s.lock[i])-now); } return Math.max(60,t); }
  return null; }
function step(s){ syncH(s); const now=Date.now();
  if(s.phase==='intro'){ startRound(s); s.ev++; return; }
  if(s.phase==='show'){ const ci=Math.min(6,Math.floor((now-s.t0)/SHOW)+1); if(ci!==s.ci){ s.ci=ci; if(ci>=6&&now-s.t0>=SHOW*6) s.notice='🙈 카드가 모두 지나갔어요 — 두 숫자의 합은?'; s.ev++; }
    for(const i of NPCSEATS()){ const pl=s.plan[i]; if(pl&&!pl.done&&now>=s.t0+pl.at&&now>=s.lock[i]){ pl.done=true; answer(s,i,pl.sum); if(s.phase!=='show') return; } }
    if(now>=s.until){ s.phase='rend'; s.notice=`⏰ 시간 끝 — 정답은 ${s.pz.a} + ${s.pz.b} = ${s.pz.a+s.pz.b}`; s.log.push(s.notice); s.hist.push({r:s.round,w:null,a:s.pz.a,b:s.pz.b}); s.ev++; } return; }
  if(s.phase==='rend'){ const mx=Math.max(...s.score), lead=ALL.filter(i=>s.score[i]===mx), left=ROUNDS-s.round; const second=Math.max(...ALL.filter(i=>!lead.includes(i)).map(i=>s.score[i]).concat([0]));
    if(s.round>=ROUNDS||(lead.length===1&&mx-second>left)){ s.phase='over'; s.notice=`🏁 ${s.round<ROUNDS?'콜드게임! ':''}${ALL.map(i=>`${nm(i)} ${s.score[i]}`).join(' · ')}`; s.log.push(s.notice); const a=s.score[HSEAT[0]], b=s.score[HSEAT[1]]; s.winner=a>b?0:b>a?1:'both'; { const mx=Math.max(...HSEAT.map(h=>s.score[h])); s.winners=HSEAT.map((h,p)=>s.score[h]===mx?p:-1).filter(x=>x>=0); } s.ev++; return; }
    startRound(s); s.ev++; return; }
}
function mask(s,p){ syncH(s); const v=U.clone(s); v.plan=null; if(v.pz){ const open=s.phase==='rend'||s.phase==='over'; v.pz={V:s.pz.V.slice(0,Math.max(0,Math.min(6,s.ci))), a:open?s.pz.a:null, b:open?s.pz.b:null, cards:open?s.pz.cards:null}; } return v; }
/* 혼자 모드 상대(자리 2): 화면에 나온 장면을 실력만큼 정확히 보고 같은 풀이 */
let MEM={};
function ai(v,lvl){ syncH(v); const i=HSEAT[1]; if(v.phase!=='show'||!v.pz) return null; lvl=lvl==null?1:lvl;
  const key=v.round; if(MEM.key!==key){ MEM={key, seen:[]}; } const L=LV[lvl];
  v.pz.V.forEach((view,k)=>{ if(!MEM.seen[k]){ const s=new Set(view); for(let x=0;x<14;x++) if(Math.random()<L.err){ if(s.has(x)) s.delete(x); else s.add(x); } MEM.seen[k]=s; } });
  if(v.pz.V.length<6) return null; if(!MEM.at){ MEM.at=v.t0+SHOW*6+L.base*1000*(.5+Math.random()); const r=solve(MEM.seen); MEM.sums=r.sums; }
  if(Date.now()<MEM.at||Date.now()<v.lock[i]||!MEM.sums.length) return null; const n=MEM.sums.shift(); MEM.at=Date.now()+3000; return {k:'ans',n}; }
function aiDelay(S){ if(S.phase==='show'&&MEM.at) return Math.max(300,Math.min(2000,MEM.at-Date.now())); return 1000; }

/* 화면 */
let WHO={}, inp='', tick=null, sig='';
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}/g,(_,d)=>`${seatEmoji(+d)} ${seatName(+d,ctx)}`); }
/* 두 자리 디지털 판 SVG */
const SEGP=[[[10,4],[40,4]],[[44,8],[44,38]],[[44,46],[44,76]],[[10,80],[40,80]],[[6,46],[6,76]],[[6,8],[6,38]],[[10,42],[40,42]]];
function digSvg(on,dim){ let g=''; for(let d=0;d<2;d++) for(let k=0;k<7;k++){ const id=d*7+k; const [[x1,y1],[x2,y2]]=SEGP[k]; const ox=d*58+8; g+=`<line x1="${x1+ox}" y1="${y1+6}" x2="${x2+ox}" y2="${y2+6}" stroke="${on.has(id)?'#ffd84d':'#3a3654'}" stroke-width="7" stroke-linecap="round" ${on.has(id)&&dim?'opacity=".55"':''}/>`; } return `<svg viewBox="0 0 124 96" class="mx-dig">${g}</svg>`; }
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{}; const me=HSEAT[ctx.me];
  const sg=v.round+':'+v.phase; if(sg!==sig){ sig=sg; inp=''; }
  clearInterval(tick); tick=null; if(v.phase==='show') tick=setInterval(()=>{ const e=document.getElementById('mxT'); if(e) e.textContent=Math.max(0,Math.ceil((v.until-Date.now())/1000))+'초'; else { clearInterval(tick); tick=null; } const l=document.getElementById('mxL'); if(l){ const r=Math.ceil((v.lock[me]-Date.now())/1000); l.textContent=r>0?`🔒 ${r}초`:''; } },300);
  let h=`<div class="hl-notice">${fill(U.esc(v.notice||''),ctx)}</div>`;
  h+=`<div class="vr-speech">${v.say?`<span class="w">${seatEmoji(v.say.seat)} ${seatName(v.say.seat,ctx)}</span> ${U.esc(v.say.text)}`:'<i>　</i>'}</div>`;
  h+=`<div class="pw-seats aa-seats">${ALL.map(i=>`<div class="pw-seat ${i===me?'me':''}"><div class="ev-nm">${seatEmoji(i)} ${seatName(i,ctx)}</div><div class="pw-sc">${'⭐'.repeat(v.score[i])||'0점'}</div><small>${v.lock[i]>Date.now()?'🔒':''}</small></div>`).join('')}</div>`;
  h+=`<div class="info">${Math.max(1,v.round)}/${ROUNDS}라운드${v.phase==='show'?` · ⏱️ <b id="mxT">${Math.max(0,Math.ceil((v.until-Date.now())/1000))}초</b>`:''}</div>`;
  if(v.pz){ const k=v.pz.V.length; const cur=v.phase==='show'&&k>0&&(Date.now()-v.t0)<SHOW*6 ? new Set(v.pz.V[k-1]) : new Set();
    h+=`<div class="mx-stage"><div class="mx-main">${digSvg(cur)}</div><small>${v.phase==='show'&&k>0&&(Date.now()-v.t0)<SHOW*6?`겹친 카드: ${[Math.max(1,k-2),k].filter((x,j,a)=>a.indexOf(x)===j).join('~')}번 (${k}/6장째)`:v.phase==='show'?'카드가 모두 지나갔어요':''}</small>
      <div class="mx-cards">${[1,2,3,4,5,6].map(c=>`<span class="${c<=k?'on':''} ${c%2?'o':'e'}">${c}<i>${c%2?'첫째':'둘째'}</i></span>`).join('')}</div></div>`;
    if(v.pz.a!=null) h+=`<div class="mx-ans"><div>${digSvg(new Set(segsOf(v.pz.a)))}<small>첫째 ${v.pz.a}</small></div><b>+</b><div>${digSvg(new Set(segsOf(v.pz.b)))}<small>둘째 ${v.pz.b}</small></div><b>= ${v.pz.a+v.pz.b}</b></div>`; }
  if(v.phase==='show'){ const locked=v.lock[me]>Date.now();
    h+=`<div class="vr-card"><b>🗣️ 두 숫자의 합</b> <span id="mxL" class="hc-lock">${locked?`🔒 ${Math.ceil((v.lock[me]-Date.now())/1000)}초`:''}</span><div class="hc-in">${U.esc(inp)||'<small>숫자를 누르세요</small>'}</div>
      <div class="hc-pad">${[1,2,3,4,5,6,7,8,9,'C',0,'⌫'].map(k=>`<button class="ghost" data-k="${k}">${k}</button>`).join('')}</div><div class="fh-act"><button data-a="go" ${inp?'':'disabled'}>"${U.esc(inp||'?')}!" 외치기</button></div><small>틀리면 10초 동안 못 외쳐요</small></div>`; }
  if(v.phase==='over') h+=`<div class="sn-score">${ALL.slice().sort((a,b)=>v.score[b]-v.score[a]).map(i=>`<div class="${isH(i)?'h':''}"><b>${seatEmoji(i)} ${seatName(i,ctx)}</b> ${v.score[i]}점</div>`).join('')}</div>`;
  h+=`<div class="bm-log">${v.log.slice(-6).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=h;
  if(v.phase==='show'&&v.pz&&v.pz.V.length<6){ clearTimeout(render._t); render._t=setTimeout(()=>ctx.rerender(),Math.max(100,v.t0+SHOW*v.pz.V.length-Date.now()+50)); }
  el.onclick=e=>{ const k=e.target.closest('[data-k]'); if(k){ const x=k.dataset.k; if(x==='⌫') inp=inp.slice(0,-1); else if(x==='C') inp=''; else if(inp.length<3) inp+=x; return ctx.rerender(); }
    const a=e.target.closest('[data-a]'); if(a&&!a.disabled){ const n=+inp; inp=''; return ctx.act({k:'ans',n}); } };
}
function status(v,ctx){ syncH(v); if(v.phase==='over') return ''; if(v.phase==='show') return '두 숫자의 합을 외치세요'; return '진행 중…'; }
const guide=`
<p><b>겹친 선 속 두 숫자 찾기</b> — 4인(우리 둘 + 컴퓨터 2명).</p>
<ol><li>노란 선이 그려진 투명 카드 <b>6장</b>이 3초마다 한 장씩 쌓여요. 화면엔 늘 <b>최근 3장만 겹쳐</b> 보여요(디지털 숫자 두 자리 판).</li>
<li><b>1·3·5번째</b> 카드를 합치면 <b>첫째 숫자</b>, <b>2·4·6번째</b>를 합치면 <b>둘째 숫자</b>(10~99).</li>
<li>두 숫자의 <b>합</b>을 먼저 외치면 +1점. 틀리면 10초 동안 못 외쳐요. 35초가 지나면 정답 공개.</li>
<li>${ROUNDS}라운드, 점수가 가장 높은 사람 승리(못 뒤집으면 콜드게임).</li></ol>
<div class="tipbox">💡 <b>팁</b><br>· 1번 장면은 1번 카드 하나, 2번 장면은 1+2번. 새로 생긴 선 = 새 카드의 선!<br>· 4번 장면부터는 오래된 카드가 빠져요 — 사라진 선이 바로 빠진 카드의 선.<br>· 답이 하나로 정해지는 문제만 나와요.</div>`;
const guideSteps=[
  {t:'🎬 카드가 쌓인다', h:'투명 카드 6장이 3초마다 한 장씩. 화면엔 <b>최근 3장만</b> 겹쳐 보여요.', demo:s=>{ s.round=0; startRound(s); s.ci=3; s.t0=Date.now()-SHOW*2.5; return s; }},
  {t:'🔢 홀짝 카드', h:'<b>1·3·5번째</b> = 첫째 숫자, <b>2·4·6번째</b> = 둘째 숫자. 둘 다 두 자리 수예요.', demo:s=>{ s.round=0; startRound(s); s.phase='rend'; s.ci=6; return s; }},
  {t:'🗣️ 합을 외치기', h:'두 숫자의 <b>합</b>을 먼저 외치면 +1. 틀리면 <b>10초</b> 동안 못 외쳐요.', demo:s=>{ s.round=0; startRound(s); s.ci=6; s.t0=Date.now()-SHOW*6-1000; s.score=[1,0,1,0]; return s; }},
];
window.GAMES.mixmatch = { _sync:x=>syncH(x), maxH:4,
  title:'믹스 앤 매치', ref:'피의 게임 「믹스 앤 매치」', emoji:'🔢', tags:['관찰력','숫자','실시간','NPC','두뇌서바이벌'],
  tagline:'겹쳐진 노란 선 속에 숨은 두 숫자 — 사라지고 생기는 선을 읽어 합을 외쳐라.',
  guide, guideSteps, init, apply, mask, ai, aiDelay, render, status, step, stepDelay, noPersona:true,
  reset(){ MEM={}; inp=''; sig=''; clearInterval(tick); tick=null; },
  bar:(v,i)=>`<span class="tag">⭐${v.score[HSEAT[i]]}</span>`,
  result:(v,ctx)=>`${v.score[HSEAT[ctx.me]]}점`,
  _makePuzzle:makePuzzle, _solve:solve, _planFor:planFor, _LV:LV,
};
})();
