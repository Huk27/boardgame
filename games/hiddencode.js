(function(){
'use strict';
/* 히든코드 (피의 게임 시즌 3 · 7일차 데스매치) — 1:1:1 (우리 둘 + NPC 1명).
   라운드마다 숨은 규칙 하나: 별 모양에 들어간 숫자 다섯 개 → 결괏값. 순서와 상관없는 규칙(합, 최대×최소, 홀수 합−짝수 합 …).
   예시 두 개를 보여 준 뒤, 집사가 주사위 2개를 굴리고 각자 숫자 하나(1~6)를 몰래 내서 새 다섯 숫자가 만들어짐.
   규칙을 찾았으면 결괏값을 외침: 맞히면 1점, 틀리면 30초 동안 못 외침. 60초 동안 아무도 못 맞히면 그 답이 새 예시로 공개되고 숫자를 다시 모음.
   3점을 먼저 얻으면 즉시 승리, 5라운드 뒤 최다 득점 승리(동점이면 연장). */
/* 👥 N명: 사람 3명이면 NPC 없이 */
const N=3, ROUNDS=5, WIN=3, RACE=60000, LOCK=30000, MAXSET=4; let HSEAT=[0,1]; const SEATORD=[0,1,2];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i), ALL=[0,1,2];
const nm=i=>`{s${i}}`;
const sum=a=>a.reduce((x,y)=>x+y,0);
const RULES=[
  {n:'모든 수의 합', d:1, f:a=>sum(a)},
  {n:'가장 큰 수 − 가장 작은 수', d:1, f:a=>Math.max(...a)-Math.min(...a)},
  {n:'가장 큰 수 × 가장 작은 수', d:2, f:a=>Math.max(...a)*Math.min(...a)},
  {n:'가장 큰 두 수의 합', d:2, f:a=>{ const b=a.slice().sort((x,y)=>y-x); return b[0]+b[1]; }},
  {n:'서로 다른 숫자의 개수', d:2, f:a=>new Set(a).size},
  {n:'가장 큰 수를 뺀 나머지의 합', d:2, f:a=>sum(a)-Math.max(...a)},
  {n:'4 이상인 수들의 합', d:2, f:a=>sum(a.filter(x=>x>=4))},
  {n:'가장 많이 나온 숫자 (같으면 큰 쪽)', d:2, f:a=>{ const c={}; a.forEach(x=>c[x]=(c[x]||0)+1); return +Object.keys(c).sort((x,y)=>c[y]-c[x]||y-x)[0]; }},
  {n:'홀수의 합 − 짝수의 합', d:3, f:a=>sum(a.filter(x=>x%2))-sum(a.filter(x=>x%2===0))},
  {n:'각 수의 제곱의 합', d:3, f:a=>sum(a.map(x=>x*x))},
  {n:'모두 곱한 값의 일의 자리', d:3, f:a=>a.reduce((x,y)=>x*y,1)%10},
  {n:'짝수 개수 × 10 + 홀수 개수', d:3, f:a=>a.filter(x=>x%2===0).length*10+a.filter(x=>x%2).length},
];
const roll=()=>1+(Math.random()*6|0);
const STYLE={seojin:'logic', doyun:'warm', haram:'calm', yuna:'emo', minho:'sly', taekyung:'hot', jihu:'sly', soyul:'warm'};
const DEF_P={talk:.5,aggr:.5,trust:.5,bluff:.4,logic:.6,temper:.4};
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
const LINES={
  logic:{mid:['예시끼리 비교해 보면…','규칙 후보가 두 개로 줄었어요.'], right:['규칙 찾았어요.','검증 끝.'], wrong:['…계산 실수예요.','후보를 잘못 골랐네요.'], react:['{t}, 빠르네요.','{t}의 풀이, 인정.']},
  warm:{mid:['어렵다~ 😅','아 뭐지 이거…'], right:['헉 맞았다 😊','다행이다~'], wrong:['아 틀렸어요 😢','미안해요 다시 볼게요'], react:['{t} 대단해요!','와 {t} 천재 👏']},
  calm:{mid:['…','…흠.'], right:['…','…맞네요.'], wrong:['…아.','…'], react:['…{t}.','…빠르다.']},
  emo:{mid:['머리 터질 것 같아 😵','이거 왜 이래?!'], right:['꺄 맞혔다 🥳','대박!!'], wrong:['으아 아니야?! 😭','망했다'], react:['헐 {t} 어떻게 알았어요?! 😱','{t} 미쳤다']},
  sly:{mid:['다들 아직이에요? 😏','쉬운데? 😏'], right:['역시 😏','이 정도야 😏'], wrong:['…일부러 떠본 거예요 😏','흠'], react:['{t}, 찍었죠? 😏','{t} 운 좋네 😏']},
  hot:{mid:['빨리빨리! 🔥','거의 다 왔어!'], right:['봤죠?! 🔥','당연하지!'], wrong:['아 왜!! 😤','말도 안 돼'], react:['{t}?! 😤','다음은 내 거야 🔥']},
};
function lineOf(s,i,kind,vars){ const st=STYLE[P(s,i).id]||'calm', L=(LINES[st]||LINES.calm)[kind]||LINES.calm[kind]; if(!L) return '';
  const used=(s.used[i]=s.used[i]||[]); const pool=L.filter(x=>!used.includes(x)); const raw=pool.length?U.pick(pool):U.pick(L); used.push(raw);
  return raw.replace(/\{t\}/g,vars&&vars.t!=null?nm(vars.t):''); }
function say(s,i,kind,vars){ if(isH(i)) return; const t=lineOf(s,i,kind,vars); if(t) s.say={seat:i,text:t,n:(s.say?s.say.n:0)+1}; }

function init(starter,o){ const k=Math.max(2,Math.min(3,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  const s={phase:'intro', who:{}, starter:starter|0, round:0, extra:0, pts:[0,0,0], order:U.shuffle(RULES.map((_,k)=>k)), rule:null, ex:[], live:null, dice:null, picks:[null,null,null],
    lock:[0,0,0], until:0, setN:0, plan:null, mid:false, hist:[], used:{}, say:null, log:[], turn:null, winner:null, ev:0, notice:'🎙️ 데스매치 「히든코드」 — 숨은 규칙을 먼저 찾는 사람이 이깁니다'};
  s.hs=HSEAT.slice(); if(!isH(2)) s.who[2]=NPCS.cast(1)[0]; return s;
}
const R=s=>RULES[s.rule];
function exampleSet(){ return [roll(),roll(),roll(),roll(),roll()]; }
function startRound(s){ s.round++; s.rule=s.order[(s.round-1)%s.order.length]; s.ex=[0,1].map(()=>{ const d=exampleSet(); return {d, v:R(s).f(d)}; }); s.setN=0;
  s.notice=`🎙️ ${s.round>ROUNDS?`연장 ${s.extra}`:`${s.round}라운드`} — 새 규칙! 예시 두 개를 보세요`; s.log.push(s.notice); newSet(s); }
function newSet(s){ s.setN++; s.dice=[roll(),roll()]; s.picks=[null,null,null]; s.live=null; s.phase='submit'; s.turn=null; s.lock=[0,0,0]; s.plan=null; s.mid=false;
  s.notice=`🎲 집사가 주사위 ${s.dice.join(' · ')}을(를) 굴렸어요 — 각자 숫자 하나(1~6)를 몰래 내세요`; }
function startRace(s){ const d=s.dice.concat(s.picks); s.live=U.shuffle(d.slice()); s.phase='race'; s.until=Date.now()+RACE; s.t0=Date.now();
  s.notice=`⭐ 새 숫자 ${s.live.join(' · ')} — 규칙을 찾았으면 결괏값을 외치세요! (${RACE/1000}초)`; s.log.push(`⭐ ${s.round}R 숫자 ${s.live.join(' ')}`);
  s.plan=isH(2)?null:planFor(viewOf(s,2),2,1,P(s,2)); }
function act(s,i,a){
  if(a.k==='pick'){ if(s.phase!=='submit') return '지금은 숫자를 낼 때가 아니에요'; if(s.picks[i]!=null) return '이미 냈어요'; const n=a.n|0; if(n<1||n>6) return '1~6 중에서'; s.picks[i]=n; return null; }
  if(a.k==='ans'){ if(s.phase!=='race') return '지금은 외칠 수 없어요'; if(Date.now()<s.lock[i]) return `틀려서 ${Math.ceil((s.lock[i]-Date.now())/1000)}초 동안 못 외쳐요`; const n=Math.round(+a.n); if(!Number.isFinite(n)) return '숫자를 입력하세요';
    const right=R(s).f(s.live);
    if(n===right){ s.pts[i]++; s.phase='rend'; s.rendAt=Date.now(); s.notice=`⭕ ${nm(i)} "${n}!" 정답 — 규칙은 「${R(s).n}」 · +1점`; s.log.push(s.notice); say(s,i,'right');
      const o=ALL.find(j=>!isH(j)&&j!==i); if(o!=null&&Math.random()<.6) { s.pendReact={i:o,by:i}; }
      s.hist.push({r:s.round, rule:s.rule, w:i}); return null; }
    s.lock[i]=Date.now()+LOCK; s.notice=`❌ ${nm(i)} "${n}" — 틀렸어요! 30초 동안 못 외쳐요`; s.log.push(s.notice); say(s,i,'wrong'); return null; }
  return '알 수 없는 동작'; }
function apply(s,p,a){ syncH(s); if(s.winner!=null) return '게임이 끝났어요'; if(!a) return '알 수 없는 동작'; const e=act(s,HSEAT[p],a); if(!e) s.ev++; return e; }
/* 컴퓨터 — 예시(공개)만 보고 규칙 후보를 지워 나감. 실력이 낮을수록 아는 규칙이 적고 느림 */
const LV=[{know:9,base:32,slip:.12},{know:11,base:26,slip:.07},{know:12,base:22,slip:.04}];
function viewOf(s,i){ const v=U.clone(s); v.rule=null; v.order=null; v.plan=null; if(s.phase==='submit') v.picks=s.picks.map((p,j)=>j===i?p:(p!=null?'?':null)); return v; }
function planFor(v,i,lvl,pp){ const L=LV[lvl==null?1:lvl]; pp=pp||DEF_P;
  const known=RULES.map((r,k)=>k).slice(0,L.know);
  const C=known.filter(k=>v.ex.every(e=>RULES[k].f(e.d)===e.v));
  if(!C.length) return null; const vals={}; C.forEach(k=>{ const x=RULES[k].f(v.live); vals[x]=(vals[x]||0)+1; });
  const ks=Object.keys(vals).sort((a,b)=>vals[b]-vals[a]); const sure=ks.length===1; const diff=Math.max(...C.map(k=>RULES[k].d));
  if(!sure&&Math.random()>.25+pp.aggr*.6) return {wait:true};
  let t=L.base*(.5+diff*.35)*(.45+Math.random()*1.1)*(1.2-pp.temper*.4)*(sure?1:1.25);
  let ans=+ks[0]; if(Math.random()<L.slip) ans+=Math.random()<.5?1:-1;
  return {at:Date.now()+t*1000, mid:Date.now()+t*450, ans}; }
function stepDelay(s){ syncH(s); if(s.winner!=null) return null; const now=Date.now();
  if(s.phase==='intro') return 2200;
  if(s.phase==='submit') return s.picks.every(x=>x!=null)?900 : (!isH(2)&&s.picks[2]==null?1200+Math.random()*1200:null);
  if(s.phase==='race'){ let t=s.until-now; const pl=s.plan; if(pl&&!pl.wait){ if(!s.mid) t=Math.min(t,pl.mid-now); if(now>=s.lock[2]) t=Math.min(t,pl.at-now); else t=Math.min(t,s.lock[2]-now); } return Math.max(60,t); }
  if(s.phase==='rend') return s.pendReact?1500:3200; if(s.phase==='show') return 3000;
  return null; }
function step(s){ syncH(s); const now=Date.now();
  if(s.phase==='intro'){ startRound(s); s.ev++; return; }
  if(s.phase==='submit'){ if(!isH(2)&&s.picks[2]==null){ s.picks[2]=npcPick(s,2); s.log.push(`🎲 ${nm(2)} 숫자 냄`); s.ev++; return; } if(s.picks.every(x=>x!=null)){ startRace(s); s.ev++; } return; }
  if(s.phase==='race'){
    if(now>=s.until){ const v=R(s).f(s.live); s.ex.push({d:s.live.slice(),v}); s.log.push(`⏰ 시간 끝 — 이 숫자의 답은 ${v} (새 예시로 추가)`);
      if(s.setN>=MAXSET){ s.notice=`⏰ 아무도 못 맞혔어요 — 규칙은 「${R(s).n}」. 다음 라운드로`; s.log.push(s.notice); s.hist.push({r:s.round,rule:s.rule,w:null}); s.phase='rend'; s.rendAt=now; s.ev++; return; }
      newSet(s); s.notice=`⏰ 시간 끝! 답은 ${v} — 새 예시로 공개. ${s.notice}`; s.ev++; return; }
    const pl=s.plan; if(pl&&!pl.wait){ if(!s.mid&&now>=pl.mid){ s.mid=true; if(Math.random()<P(s,2).talk) say(s,2,'mid'); s.ev++; return; }
      if(now>=pl.at&&now>=s.lock[2]){ s.plan=null; act(s,2,{k:'ans',n:pl.ans}); s.ev++; return; } }
    return; }
  if(s.phase==='rend'){ if(s.pendReact){ const r=s.pendReact; s.pendReact=null; say(s,r.i,'react',{t:r.by}); s.ev++; return; }
    const mx=Math.max(...s.pts); if(mx>=WIN){ return end(s,`${ALL.filter(i=>s.pts[i]===mx).map(nm).join(' · ')} ${WIN}점 선착!`); }
    if(s.round>=ROUNDS){ const top=ALL.filter(i=>s.pts[i]===mx); if(top.length===1||s.extra>=2) return end(s, `최종 ${ALL.map(i=>`${nm(i)} ${s.pts[i]}`).join(' · ')}`); s.extra++; }
    startRound(s); s.ev++; return; }
}
function npcPick(s,i){ return roll(); }
function end(s,why){ s.phase='over'; s.turn=null; s.notice=`🏁 ${why}`; s.log.push(s.notice); const a=s.pts[0], b=s.pts[1]; s.winner=a>b?0:b>a?1:'both'; { const mx=Math.max(...HSEAT.map(h=>s.pts[h])); s.winners=HSEAT.map((h,p)=>s.pts[h]===mx?p:-1).filter(x=>x>=0); } s.ev++; }
function mask(s,p){ syncH(s); const v=viewOf(s,HSEAT[p]); if(s.phase==='rend'||s.phase==='over') v.ruleName=R(s).n; return v; }
let MEM={};
function ai(v,lvl){ syncH(v); const i=HSEAT[1];
  if(v.phase==='submit'&&v.picks[i]==null) return {k:'pick', n:roll()};
  if(v.phase==='race'){ const key=v.round+':'+v.setN; if(MEM.key!==key) MEM={key, plan:planFor(v,i,lvl,DEF_P)}; const pl=MEM.plan; if(!pl||pl.wait||MEM.done) return null; if(Date.now()<pl.at||Date.now()<v.lock[i]) return null; MEM.done=true; return {k:'ans', n:pl.ans}; }
  return null; }
function aiDelay(S){ if(S.phase==='race'&&MEM.plan&&MEM.plan.at) return Math.max(300,Math.min(2500,MEM.plan.at-Date.now())); return 1500; }

/* 화면 */
let WHO={}, inp='', tick=null, sig='';
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}/g,(_,d)=>`${seatEmoji(+d)} ${seatName(+d,ctx)}`).replace(/(\d)을\(를\)/g,(_,d)=>d+([0,1,3,6,7,8].includes(+d)?'을':'를')); }
function star(d,v,cls){ const pos=[[50,4],[93,36],[76,88],[24,88],[7,36]]; return `<div class="hc-star ${cls||''}">${(d||[]).map((x,k)=>`<span style="left:${pos[k][0]}%;top:${pos[k][1]}%">${x}</span>`).join('')}<b>${v}</b></div>`; }
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{}; const me=HSEAT[ctx.me];
  const sg=v.round+':'+v.setN+':'+v.phase; if(sg!==sig){ sig=sg; inp=''; }
  clearInterval(tick); tick=null; if(v.phase==='race') tick=setInterval(()=>{ const e=document.getElementById('hcT'); if(e) e.textContent=Math.max(0,Math.ceil((v.until-Date.now())/1000))+'초'; else { clearInterval(tick); tick=null; }
    const l=document.getElementById('hcL'); if(l){ const r=Math.ceil((v.lock[me]-Date.now())/1000); l.textContent=r>0?`🔒 ${r}초`:''; } },300);
  let h=`<div class="hl-notice">${fill(U.esc(v.notice||''),ctx)}</div>`;
  h+=`<div class="vr-speech">${v.say?`<span class="w">${seatEmoji(v.say.seat)} ${seatName(v.say.seat,ctx)}</span> ${fill(U.esc(v.say.text),ctx)}`:'<i>　</i>'}</div>`;
  h+=`<div class="info">${v.round>ROUNDS?'연장':`${Math.max(1,v.round)}/${ROUNDS}라운드`} · ${WIN}점 먼저 · ${v.phase==='race'?`⏱️ <b id="hcT">${Math.max(0,Math.ceil((v.until-Date.now())/1000))}초</b>`:''}</div>`;
  h+=`<div class="pw-seats">${ALL.map(i=>`<div class="pw-seat ${i===me?'me':''}"><div class="ev-nm">${seatEmoji(i)} ${seatName(i,ctx)}</div>${isH(i)?'':`<small class="ev-arch">${NPCI(i)[2]}</small>`}<div class="pw-sc">${'⭐'.repeat(v.pts[i])||'0점'}</div><small>${v.phase==='submit'?(v.picks[i]!=null?'✅ 냄':'🎲 고르는 중'):v.lock[i]>Date.now()?'🔒 잠김':''}</small></div>`).join('')}</div>`;
  h+=`<div class="hc-ex"><div class="bb-h">📋 예시 <small>숫자 다섯 개 → 가운데 결괏값 (순서는 상관없어요)</small></div><div class="hc-row">${v.ex.map(e=>star(e.d,e.v)).join('')}${v.live?star(v.live,'?','live'):''}</div></div>`;
  if(v.ruleName) h+=`<div class="bb-ans">🔑 규칙: <b>${U.esc(v.ruleName)}</b></div>`;
  if(v.phase==='submit'){ h+=`<div class="hc-dice">🎲 집사 주사위 <b>${v.dice.join('</b> <b>')}</b> + 우리 셋이 하나씩</div>`;
    if(v.picks[me]==null) h+=`<div class="vr-card"><b>내 숫자 하나</b> <small>새 다섯 숫자에 들어가요 — 내가 계산하기 쉬운 숫자를 넣어 보세요</small><div class="fh-act">${[1,2,3,4,5,6].map(n=>`<button data-pk="${n}">${n}</button>`).join('')}</div></div>`;
    else h+=`<div class="vr-card"><small>${v.picks[me]}을(를) 냈어요 — 다른 사람을 기다려요</small></div>`; }
  if(v.phase==='race'){ const locked=v.lock[me]>Date.now();
    h+=`<div class="vr-card"><b>🗣️ 결괏값 외치기</b> <span id="hcL" class="hc-lock">${locked?`🔒 ${Math.ceil((v.lock[me]-Date.now())/1000)}초`:''}</span>
      <div class="hc-in">${U.esc(inp)||'<small>숫자를 누르세요</small>'}</div>
      <div class="hc-pad">${[1,2,3,4,5,6,7,8,9,'−',0,'⌫'].map(k=>`<button class="ghost" data-k="${k}">${k}</button>`).join('')}</div>
      <div class="fh-act"><button data-a="ans" ${inp&&inp!=='-'?'':'disabled'}>"${U.esc(inp||'?')}!" 외치기</button></div><small>틀리면 30초 동안 못 외쳐요</small></div>`; }
  if(v.phase==='over') h+=`<div class="sn-score">${ALL.slice().sort((a,b)=>v.pts[b]-v.pts[a]).map(i=>`<div class="${isH(i)?'h':''}"><b>${seatEmoji(i)} ${seatName(i,ctx)}</b> ${v.pts[i]}점</div>`).join('')}</div>`;
  h+=`<div class="bm-log">${v.log.slice(-7).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=h;
  el.onclick=e=>{ const pk=e.target.closest('[data-pk]'); if(pk) return ctx.act({k:'pick',n:+pk.dataset.pk});
    const k=e.target.closest('[data-k]'); if(k){ const x=k.dataset.k; if(x==='⌫') inp=inp.slice(0,-1); else if(x==='−') inp=inp.startsWith('-')?inp.slice(1):'-'+inp; else if(inp.replace('-','').length<4) inp+=x; return ctx.rerender(); }
    const a=e.target.closest('[data-a]'); if(a&&!a.disabled){ const n=+inp; inp=''; return ctx.act({k:'ans',n}); } };
}
function status(v,ctx){ syncH(v); if(v.phase==='over') return ''; if(v.phase==='submit') return v.picks[HSEAT[ctx.me]]==null?'숫자 하나를 내세요':'기다리는 중'; if(v.phase==='race') return '규칙을 찾아 외치세요!'; return '진행 중…'; }
const guide=`
<p><b>숨은 규칙 찾기 레이스</b> — 1:1:1 (우리 둘 + 컴퓨터 1명).</p>
<ol><li>라운드마다 <b>숨은 규칙</b> 하나: 별에 들어간 숫자 다섯 개 → 가운데 결괏값. 숫자 <b>순서는 상관없어요</b>.</li>
<li>예시 두 개를 보여 줘요. 그다음 집사가 주사위 2개, 우리 셋이 숫자 하나씩(1~6) 몰래 → <b>새 다섯 숫자</b>.</li>
<li>규칙을 찾았으면 새 숫자의 <b>결괏값을 외치기</b>: 맞히면 +1점, 틀리면 <b>30초</b> 동안 못 외침.</li>
<li>60초 동안 아무도 못 맞히면 그 답이 <b>새 예시</b>로 공개되고 숫자를 다시 모아요(최대 ${MAXSET}번).</li>
<li><b>${WIN}점 선착</b> 즉시 승리, ${ROUNDS}라운드 뒤 최다 득점(동점이면 연장).</li></ol>
<div class="tipbox">💡 <b>이런 규칙들이 나와요</b><br>${RULES.map(r=>r.n).join(' · ')}<br>· 규칙을 다 몰라도, 남은 후보들이 새 숫자에서 <b>같은 값</b>을 내면 바로 외쳐도 돼요!</div>`;
const guideSteps=[
  {t:'⭐ 숨은 규칙', h:'숫자 다섯 개 → 가운데 결괏값. 예시 두 개를 보고 <b>규칙</b>을 찾아요. 순서는 상관없어요.', demo:s=>{ s.round=0; startRound(s); return s; }},
  {t:'🎲 숫자 모으기', h:'집사 주사위 2개 + 우리 셋이 <b>하나씩</b> 몰래 → 새 다섯 숫자. 계산하기 쉬운 숫자를 넣는 것도 전략!', demo:s=>{ s.round=0; startRound(s); return s; }},
  {t:'🗣️ 먼저 외치기', h:'새 숫자의 결괏값을 <b>먼저</b> 외치면 +1점. 틀리면 <b>30초</b> 잠김. 60초 동안 아무도 못 맞히면 답이 새 예시로!', demo:s=>{ s.round=0; startRound(s); s.picks=[3,5,2]; startRace(s); return s; }},
  {t:'🏆 3점 선착', h:`<b>${WIN}점</b>을 먼저 얻으면 즉시 승리. ${ROUNDS}라운드 뒤엔 최다 득점.`, demo:s=>{ s.round=0; startRound(s); s.pts=[2,1,2]; return s; }},
];
window.GAMES.hiddencode = { _sync:x=>syncH(x), maxH:3,
  title:'히든코드', ref:'피의 게임 「히든코드」', emoji:'⭐', tags:['추리','규칙 찾기','실시간','NPC','두뇌서바이벌'],
  tagline:'숫자 다섯 개가 들어가면 무엇이 나올까 — 숨은 규칙을 가장 먼저 찾아 외쳐라.',
  guide, guideSteps, init, apply, mask, ai, aiDelay, render, status, step, stepDelay, noPersona:true,
  reset(){ MEM={}; inp=''; sig=''; clearInterval(tick); tick=null; },
  bar:(v,i)=>`<span class="tag">⭐${v.pts[HSEAT[i]]}</span>`,
  result:(v,ctx)=>`${v.pts[HSEAT[ctx.me]]}점`,
  _RULES:RULES, _planFor:planFor,
};
})();
