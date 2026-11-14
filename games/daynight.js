(function(){
'use strict';
/* 낮과 밤 (피의 게임 시즌 2 · 8일차 머니 챌린지) — 6인(우리 둘 + NPC 4명).
   1~12시 시계, 1~6시는 ☀️ 낮(시침이 보임), 7~12시는 🌙 밤(시침이 가려짐). 각자 낮 구간 1개·밤 구간 1개를 몰래 뽑음(시침이 두 바퀴 돌 때마다 다시).
   매 라운드 모두 몰래 코인을 냄(0개 가능) → 가장 많이 낸 수만큼 시침 이동(기본 1칸), 낸 코인은 모두 사라짐(코인 20개).
   시침이 멈춘 곳이 내 낮 구간이면 +1, 밤 구간이면 +2. 라운드 점수는 알파벳 익명으로 공개. 10점 먼저 내면 승리, 꼴찌는 탈락 후보. */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로, 나머지는 NPC */
const N=6, COINS=20, GOAL=10, CAP=40; let HSEAT=[0,3]; const SEATORD=[0,3,1,4,2,5];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i), ALL=[...Array(N).keys()];
const nm=i=>`{s${i}}`;
const isDay=h=>h>=1&&h<=6;
const DEF_P={talk:.6,aggr:.5,trust:.5,bluff:.5,logic:.6,temper:.4};
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
const LET='ABCDEF';
function init(starter,o){ const k=Math.max(2,Math.min(6,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  const s={phase:'intro', who:{}, hand:12, steps:0, lap:0, seg:ALL.map(()=>null), coins:Array(N).fill(COINS), score:Array(N).fill(0), letter:U.shuffle(LET.split('')),
    bid:Array(N).fill(null), round:0, hist:[], myBids:ALL.map(()=>[]), log:[], turn:null, starter, winner:null, ev:0, anim:0, say:null,
    notice:'🎙️ 머니 챌린지 「낮과 밤」 — 낮에는 시침이 보이고, 밤에는 가려집니다'};
  s.hs=HSEAT.slice(); const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=ids[k]);
  draw(s); return s;
}
function draw(s){ for(const i of ALL) s.seg[i]={d:1+(Math.random()*6|0), n:7+(Math.random()*6|0)}; s.log.push('🎴 모두 낮·밤 구간을 새로 뽑았어요 (본인만 봄)'); }
function startRound(s){ s.round++; s.bid=Array(N).fill(null); s.phase='bid'; s.turn=null; s.notice=`🎙️ ${s.round}라운드 — 딜러룸에 몰래 코인을 내세요`; }
/* NPC 판단: 공개 정보(보였던 시침 위치·기록) + 내 코인/내 구간/내가 낸 코인만으로 시침 위치를 추정 */
function belief(s,i){ let set=new Map([[12,1]]); let pos=12;
  for(let k=0;k<s.hist.length;k++){ const h=s.hist[k], my=s.myBids[i][k]||0, nx=new Map();
    for(const [p,w] of set) for(let m=Math.max(1,my); m<=7; m++){ const q=((p-1+m)%12)+1, wt=w*(m===Math.max(1,my)?1.6:1)/(1+(m-1)*.35); nx.set(q,(nx.get(q)||0)+wt); }
    if(h.vis!=null){ set=new Map([[h.vis,1]]); continue; }
    set=new Map([...nx].filter(([q])=>!isDay(q))); if(!set.size) set=new Map([[7,1]]); }
  const tot=[...set.values()].reduce((a,b)=>a+b,0); return [...set].map(([q,w])=>[q,w/tot]); }
function othersMax(s){ // 지난 라운드들의 이동량(보였던 것)으로 상대 최대 입찰 분포 추정
  const seen=s.hist.filter(h=>h.moveSeen!=null).map(h=>h.moveSeen).slice(-6); const d=[0,.45,.25,.15,.1,.05];
  if(seen.length){ for(const m of seen) d[Math.min(5,m)]+=.25; } const t=d.reduce((a,b)=>a+b,0); return d.map(x=>x/t); }
function npcBid(s,i){ const p=P(s,i), B=belief(s,i), OM=othersMax(s), sg=s.seg[i], c=s.coins[i];
  let best=0, bv=-1e9;
  for(let b=0;b<=Math.min(c,6);b++){ let ev=0;
    for(const [pos,w] of B) for(let m=1;m<OM.length;m++){ const mv=Math.max(1,b,m), q=((pos-1+mv)%12)+1; ev+=w*OM[m]*(q===sg.d?1:q===sg.n?2:0); }
    const lead=Math.max(...s.score)-s.score[i];
    ev -= b*(.09+(.06*(1-p.aggr))) * (c<6?1.6:1); ev += (Math.random()-.5)*(1-p.logic)*.25;
    if(s.score[i]>=GOAL-2) ev*=1.3;
    if(ev>bv){ bv=ev; best=b; } }
  return best; }
function apply(s,p,a){ syncH(s);
  if(s.winner!=null) return '게임이 끝났어요';
  const seat=HSEAT[p]; if(!a||a.k!=='bid') return '알 수 없는 동작';
  if(s.phase!=='bid') return '지금은 코인을 낼 때가 아니에요'; if(s.bid[seat]!=null) return '이미 냈어요';
  const b=a.b|0; if(b<0||b>s.coins[seat]) return `0~${s.coins[seat]}개를 낼 수 있어요`;
  s.bid[seat]=b; s.ev++; return null;
}
function stepDelay(s){ syncH(s); if(s.winner!=null) return null;
  if(s.phase==='intro') return 2600;
  if(s.phase==='bid'){ const pend=ALL.filter(i=>s.bid[i]==null); if(!pend.length) return 700; if(pend.every(isH)) return null; return 900+Math.random()*900; }
  if(s.phase==='move') return s.anim<s.mv?520:900;
  if(s.phase==='score') return 2600;
  return null; }
function step(s){ syncH(s);
  if(s.phase==='intro'){ startRound(s); s.ev++; return; }
  if(s.phase==='bid'){ const pend=ALL.filter(i=>s.bid[i]==null&&!isH(i)); if(pend.length){ const i=pend[0]; s.bid[i]=npcBid(s,i); s.notice=`🚪 ${nm(i)} 딜러룸 다녀옴 (${ALL.filter(j=>s.bid[j]!=null).length}/${N})`; s.ev++; return; }
    if(ALL.some(i=>s.bid[i]==null)) return;
    const mx=Math.max(...s.bid); s.mv=Math.max(1,mx); for(const i of ALL){ s.coins[i]-=s.bid[i]; s.myBids[i].push(s.bid[i]); }
    s.anim=0; s.phase='move'; s.notice='🕰️ 시침이 움직입니다…'; s.ev++; return; }
  if(s.phase==='move'){ if(s.anim<s.mv){ s.anim++; s.hand=(s.hand%12)+1; s.steps++; s.ev++; return; }
    // 점수
    const gain=ALL.map(i=> s.hand===s.seg[i].d?1 : s.hand===s.seg[i].n?2 : 0); for(const i of ALL) s.score[i]+=gain[i];
    const vis=isDay(s.hand)?s.hand:null;
    s.hist.push({r:s.round, vis, moveSeen: vis!=null && s.hist.length && s.hist[s.hist.length-1].vis!=null ? ((s.hand-s.hist[s.hist.length-1].vis+12)%12||12) : null, gain:ALL.map(i=>({l:s.letter[i], g:gain[i]})).sort((a,b)=>a.l<b.l?-1:1), tot:ALL.map(i=>({l:s.letter[i], t:s.score[i]})).sort((a,b)=>a.l<b.l?-1:1)});
    const gains=ALL.filter(i=>gain[i]); s.notice = (vis!=null?`☀️ 시침 ${vis}시`:'🌙 밤 — 시침이 가려졌어요') + ` · ${gains.length?gains.map(i=>`${s.letter[i]} +${gain[i]}`).join(', '):'아무도 점수 없음'}`;
    s.log.push(`${s.round}R ${vis!=null?`☀️ ${vis}시`:'🌙 ?'} · ${gains.length?gains.map(i=>`${s.letter[i]}+${gain[i]}`).join(' '):'-'}`);
    s.phase='score'; s.ev++; return; }
  if(s.phase==='score'){ const top=Math.max(...s.score);
    if(top>=GOAL||s.round>=CAP){ endGame(s); return; }
    if(Math.floor(s.steps/24)>s.lap){ s.lap=Math.floor(s.steps/24); draw(s); }
    startRound(s); s.ev++; return; }
}
function endGame(s){ s.phase='over'; s.turn=null; s.rank=ALL.slice().sort((a,b)=>s.score[b]-s.score[a]);
  const a=s.score[HSEAT[0]], b=s.score[HSEAT[1]]; s.winner=a>b?0:b>a?1:'both'; { const mx=Math.max(...HSEAT.map(h=>s.score[h])); s.winners=HSEAT.map((h,p)=>s.score[h]===mx?p:-1).filter(x=>x>=0); }
  s.notice=`🎙️ 우승 ${nm(s.rank[0])} (${s.score[s.rank[0]]}점) · 꼴찌(탈락 후보) ${nm(s.rank[N-1])}`; s.log.push(s.notice.replace('🎙️ ','🏁 ')); s.ev++; }
function mask(s,p){ syncH(s); const v=U.clone(s), me=HSEAT[p], open=s.phase==='over';
  if(!open){ v.seg=s.seg.map((x,i)=>i===me?x:null); v.letter=s.letter.map((x,i)=>i===me?x:null); v.coins=s.coins.map((x,i)=>i===me?x:null); v.score=s.score.map((x,i)=>i===me?x:null); v.myBids=s.myBids.map((x,i)=>i===me?x:[]);
    v.hand = isDay(s.hand) ? s.hand : null; v.bid=s.bid.map((x,i)=>i===me?x:(x!=null?'?':null)); v.mv=null; }
  return v; }
function ai(v,lvl=1){ syncH(v); const seat=HSEAT[1]; if(v.phase!=='bid'||v.bid[seat]!=null) return null;
  const view={...v, coins:v.coins.map(x=>x==null?0:x), score:v.score.map(x=>x==null?0:x)}; return {k:'bid', b:npcBid(view,seat)}; }

/* 화면 */
let WHO={}, bidX=0, sig='';
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}(이\(가\))?/g,(_,d,j)=>{ const n=seatName(+d,ctx); return `${seatEmoji(+d)} ${n}${j?(()=>{ const x=n.replace(/\(나\)$/,''), c=x.charCodeAt(x.length-1); return c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28?'이':'가'; })():''}`; }); }
function clockSVG(v,me){ const R=110, cx=130, cy=130, sg=v.seg[me]; let g=`<circle cx="${cx}" cy="${cy}" r="${R+12}" fill="#fff" stroke="#2b2a33" stroke-width="3"/>`;
  g+=`<path d="M ${cx} ${cy-R-10} A ${R+10} ${R+10} 0 0 1 ${cx} ${cy+R+10} Z" fill="#fff6d6"/><path d="M ${cx} ${cy+R+10} A ${R+10} ${R+10} 0 0 1 ${cx} ${cy-R-10} Z" fill="#2b3150"/>`;
  for(let h=1;h<=12;h++){ const a=(h/12)*Math.PI*2-Math.PI/2, x=cx+Math.cos(a)*(R-14), y=cy+Math.sin(a)*(R-14);
    const mine = sg&&(h===sg.d||h===sg.n); g+=`${mine?`<circle cx="${x}" cy="${y}" r="17" fill="${h===sg.d?'#ffd75e':'#9a8cff'}"/>`:''}<text x="${x}" y="${y+6}" text-anchor="middle" font-size="17" font-weight="700" fill="${isDay(h)?'#2b2a33':'#e8e6ff'}">${h}</text>`; }
  if(v.hand!=null){ const a=(v.hand/12)*Math.PI*2-Math.PI/2; g+=`<line x1="${cx}" y1="${cy}" x2="${cx+Math.cos(a)*(R-38)}" y2="${cy+Math.sin(a)*(R-38)}" stroke="#d0342c" stroke-width="6" stroke-linecap="round"/>`; }
  else g+=`<text x="${cx-48}" y="${cy+6}" text-anchor="middle" font-size="26">🌙</text><text x="${cx-48}" y="${cy+30}" text-anchor="middle" font-size="11" fill="#e8e6ff">가려짐</text>`;
  g+=`<circle cx="${cx}" cy="${cy}" r="7" fill="#2b2a33"/>`;
  return `<svg viewBox="0 0 260 260" class="dn-clock">${g}</svg>`; }
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{}; const me=HSEAT[ctx.me];
  const sg2=v.round+':'+v.phase; if(sg2!==sig){ sig=sg2; bidX=Math.min(bidX,v.coins[me]||0); }
  let h=`<div class="hl-notice">${fill(U.esc(v.notice||''),ctx)}</div>`;
  const sg=v.seg[me];
  h+=`<div class="dn-top">${clockSVG(v,me)}<div class="dn-me"><div>내 알파벳 <b class="dn-let">${v.letter[me]}</b></div><div>☀️ 낮 구간 <b>${sg?sg.d:'?'}시</b> (+1) · 🌙 밤 구간 <b>${sg?sg.n:'?'}시</b> (+2)</div><div>점수 <b>${v.score[me]}</b> / ${GOAL} · 🪙 코인 <b>${v.coins[me]}</b></div><small>시침이 두 바퀴 돌 때마다 구간을 다시 뽑아요 (지금까지 ${v.steps}칸)</small></div></div>`;
  if(v.phase==='bid'&&v.bid[me]==null){ bidX=Math.max(0,Math.min(v.coins[me],bidX));
    h+=`<div class="vr-card"><b>🚪 딜러룸 — 몰래 코인 내기</b><p>가장 많이 낸 수만큼 시침이 움직여요(아무도 안 내면 1칸). 낸 코인은 모두 사라져요.</p><div class="bs-amt"><button class="ghost" data-a="m">−</button><b>🪙 ${bidX}</b><button class="ghost" data-a="p">+</button></div><div class="fh-act"><button data-a="bid">${bidX}개 내기</button></div></div>`; }
  else if(v.phase==='bid') h+=`<div class="info">다른 사람들이 딜러룸에 다녀오는 중… (${v.bid.filter(x=>x!=null).length}/${N})</div>`;
  // 익명 점수판
  const last=v.hist[v.hist.length-1];
  h+=`<div class="dn-board"><div class="dn-h">📋 알파벳 익명 점수 (누가 누군지는 추리!)</div><table><tr><th></th>${LET.split('').map(l=>`<th class="${l===v.letter[me]?'me':''}">${l}</th>`).join('')}</tr>${v.hist.slice(-8).map(H=>`<tr><td>${H.r}R ${H.vis!=null?`☀️${H.vis}`:'🌙?'}</td>${H.gain.map(x=>`<td class="${x.l===v.letter[me]?'me':''}">${x.g?'+'+x.g:''}</td>`).join('')}</tr>`).join('')}${last?`<tr class="tot"><td>합계</td>${last.tot.map(x=>`<td class="${x.l===v.letter[me]?'me':''}">${x.t}</td>`).join('')}</tr>`:''}</table></div>`;
  if(v.phase==='over') h+=`<div class="sn-score">${v.rank.map((i,k)=>`<div class="${isH(i)?'h':''}"><b>${k+1}등 ${seatEmoji(i)} ${seatName(i,ctx)}</b> (${v.letter[i]}) ${v.score[i]}점 · 구간 ☀️${v.seg[i].d} 🌙${v.seg[i].n} · 남은 코인 ${v.coins[i]}${k===0?' 🏆':''}${k===N-1?' 💀':''}</div>`).join('')}</div>`;
  const R=`<div class="side-box side-log"><div class="side-h">📜 진행 기록 <small>최근이 위</small></div>${v.log.slice(-40).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=`<div class="side3"><div class="side-mid">${h}</div><aside class="side-r">${R}</aside></div>`;
  el.onclick=e=>{ const b=e.target.closest('[data-a]'); if(!b) return; const k=b.dataset.a;
    if(k==='m'){ bidX=Math.max(0,bidX-1); return ctx.rerender(); } if(k==='p'){ bidX=Math.min(v.coins[me],bidX+1); return ctx.rerender(); }
    if(k==='bid') return ctx.act({k:'bid', b:bidX}); };
}
function status(v,ctx){ syncH(v); const me=HSEAT[ctx.me]; if(v.phase==='bid'&&v.bid[me]==null) return '몰래 코인을 내세요'; return v.phase==='over'?'':'진행 중…'; }
const guide=`
<p><b>시침을 내 구간에 멈추게 하는 눈치 경매</b> (우리 둘 + 컴퓨터 플레이어 4명).</p>
<ol><li>1~12시 시계: <b>1~6시 ☀️ 낮</b>(시침이 보임), <b>7~12시 🌙 밤</b>(시침이 가려짐).</li>
<li>각자 <b>낮 구간 1개·밤 구간 1개</b>를 몰래 뽑아요(시침이 두 바퀴 돌 때마다 다시).</li>
<li>매 라운드 모두 딜러룸에 <b>몰래 코인</b>을 내요(0개도 OK). <b>가장 많이 낸 수만큼</b> 시침이 움직여요(아무도 안 내면 1칸). 낸 코인은 <b>모두 사라져요</b>(코인 ${COINS}개).</li>
<li>시침이 멈춘 곳이 내 <b>낮 구간이면 +1</b>, <b>밤 구간이면 +2</b>. 라운드 점수는 <b>알파벳 익명</b>으로 공개돼요.</li></ol>
<p><b>${GOAL}점</b>을 먼저 내면 승리(${CAP}라운드면 점수 순). 꼴찌는 탈락 후보. 사람끼리는 점수가 가장 높은 사람이 승리.</p>
<div class="tipbox">💡 밤에는 시침이 안 보여요 — 지난 위치와 내가 낸 코인으로 어디쯤일지 계산해야 해요. 익명 점수판에서 "누가 +2를 받았나"도 단서!</div>`;
const guideSteps=[
  {t:'☀️ 낮과 🌙 밤', h:'1~12시 시계. <b>1~6시는 낮</b> — 시침이 보여요. <b>7~12시는 밤</b> — 시침이 가려져요.',
   demo:s=>{ s.hand=3; s.phase='score'; s.seg[0]={d:3,n:9}; s.round=2; return s; }},
  {t:'내 구간 2개', h:'각자 <b>낮 구간 1개</b>(노란 동그라미)와 <b>밤 구간 1개</b>(보라 동그라미)를 몰래 뽑아요. 시침이 두 바퀴 돌 때마다 다시 뽑아요.',
   demo:s=>{ s.hand=5; s.phase='score'; s.seg[0]={d:4,n:10}; return s; }},
  {t:'🚪 몰래 코인 내기', h:'매 라운드 모두 딜러룸에 <b>몰래 코인</b>을 내요(0개도 OK). <b>가장 많이 낸 수만큼</b> 시침이 움직이고(아무도 안 내면 1칸), 낸 코인은 <b>모두 사라져요</b>.',
   demo:s=>{ s.hand=2; s.phase='bid'; s.round=3; s.seg[0]={d:5,n:8}; return s; }},
  {t:'점수', h:'시침이 멈춘 곳이 내 <b>낮 구간이면 +1</b>, <b>밤 구간이면 +2</b>. 점수는 <b>알파벳 익명</b>으로만 공개돼요 — 누가 누군지는 추리!',
   demo:s=>{ s.hand=9; s.phase='score'; s.seg[0]={d:2,n:9}; s.round=4; s.score[0]=4; s.hist=[1,2,3,4].map(r=>({r, vis:r%2?r+1:null, gain:'ABCDEF'.split('').map((l,k)=>({l,g:(r+k)%5===0?2:(r+k)%7===0?1:0})), tot:'ABCDEF'.split('').map((l,k)=>({l,t:(k*3+r)%7}))})); return s; }},
  {t:'🏁 승리', shot:false, h:'<b>10점</b>을 먼저 내면 승리! 꼴찌는 탈락 후보.<div class="gd-tip">밤에는 시침이 안 보여요 — 지난 위치와 <b>내가 낸 코인</b>으로 어디쯤일지 계산하세요.</div>'},
];
window.GAMES.daynight = { _sync:x=>syncH(x), maxH:6,
  title:'낮과 밤', ref:'피의 게임 「낮과 밤」', emoji:'🕰️', tags:['경매','눈치','NPC','두뇌서바이벌'],
  tagline:'몰래 낸 코인이 가장 많은 만큼 시침이 돈다. 밤에는 시침이 보이지 않는다.',
  guide, guideSteps, init, apply, mask, ai, render, status, step, stepDelay, noPersona:true, wide:true,
  aiDelay:()=>1500+Math.random()*1500,
  reset(){ bidX=0; sig=''; },
  _npc:npcBid,
  bar:(v,i)=>`<span class="tag">${v.letter[HSEAT[i]]?`${v.letter[HSEAT[i]]} · `:''}${v.score[HSEAT[i]]!=null?v.score[HSEAT[i]]+'점':'?'}</span>`,
  result:(v,ctx)=>{ const k=(v.rank||[]).indexOf(HSEAT[ctx.me]); return k>=0?`${k+1}등 · ${v.score[HSEAT[ctx.me]]}점`:''; },
};
})();
