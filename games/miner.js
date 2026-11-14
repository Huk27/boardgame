(function(){
'use strict';
/* 광부게임 (더 지니어스 시즌 3 · 5회 메인 매치) — 6인 3개 조(우리 둘은 다른 조 + NPC 4명).
   조마다 돌아가며 광부. 광산: 금(3) 14 · 은(2) 14 · 동(1) 14 · 💎 다이아 2(합계 2배) · 💣 폭탄 5 — 광부 차례마다 새 광산.
   광부가 아닌 4명은 1~50 승점을 몰래 제시. 광부 둘은 번갈아 하나씩 캐다가 언제든(꺼내기 전) 스톱. 폭탄 3개면 실패.
   정산: 채굴 총점 ≥ 제시 합 → 제시자는 각자 제시 점수, 남는 점수는 광부가 나눔. 폭탄 실패 → 광부 0, 제시자는 제시 점수.
   총점 < 제시 합 → 제시자 0, 광부가 총점을 나눔, 최고 제시자는 그만큼 감점되고 그 점수는 최저 제시자가 가져감.
   2라운드(조마다 2번 광부), 2라운드는 점수 합이 낮은 조부터. 총점 1위 우승. 원작 9인 3라운드를 6인 2라운드로 줄임. */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로, 나머지는 NPC */
const N=6, TM=[[0,1],[2,3],[4,5]], ROUNDS=2; let HSEAT=[0,2]; const SEATORD=[0,2,4,1,3,5];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i), ALL=[...Array(N).keys()], teamOf=i=>i>>1;
const nm=i=>`{s${i}}`;
const IT={G:{e:'🥇',n:'금',v:3},S:{e:'🥈',n:'은',v:2},C:{e:'🥉',n:'동',v:1},D:{e:'💎',n:'다이아',v:0},B:{e:'💣',n:'폭탄',v:0}};
const MINE={G:14,S:14,C:14,D:2,B:5};
const CANDS=[1,2,3,5,7,10,12,15,18,20,25,30,35,40,50];
const STYLE={seojin:'logic', doyun:'warm', haram:'calm', yuna:'emo', minho:'sly', taekyung:'hot', jihu:'sly', soyul:'warm'};
const DEF_P={talk:.5,aggr:.5,trust:.5,bluff:.4,logic:.6,temper:.4};
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
const LINES={
  logic:{stop:['여기서 멈추죠. 기대값이 꺾였어요.','스톱. {t}점이면 충분해요.','이 정도면 됐어요, 스톱.'], dig:['하나 더요. 확률상 아직 괜찮아요.','계속 캡니다.','한 번 더.'], bomb:['폭탄… 계산 안에 있어요.','폭탄 {b}개째. 조심해야겠네요.'],
    pen:['제가 최고 제시였네요… 계산 실수예요.','독박이네요. 다음엔 낮게 갈게요.'], gain:['최저 제시가 이득이었네요.','계산대로예요.'], react:['{t} 독박이네요.','{t}, 너무 높게 불렀어요.','합이 넘쳤네요.']},
  warm:{stop:['우리 여기서 멈춰요~ 😊','스톱! 욕심 안 낼게요 🙏','이 정도면 다 같이 살죠~'], dig:['하나만 더 캐 볼게요 😊','조금만 더요~','한 번 더! 🤞'], bomb:['꺅 폭탄이에요 😣','폭탄 {b}개… 무서워요 🥺'],
    pen:['헉 제가 독박이에요?! 😢','아… 제가 제일 높았구나 ㅠㅠ'], gain:['어머 저 받았어요? 고마워요 🙏','헤헤 감사합니다 😊'], react:['{t} 괜찮아요? 😢','어떡해 {t}…','{t} 힘내요 🙏']},
  calm:{stop:['…스톱.','멈춰요.','…여기까지.'], dig:['…하나 더.','캐요.','…계속.'], bomb:['…폭탄.','…{b}개.'],
    pen:['…독박이네요.','…제 실수예요.'], gain:['…받았네요.','…고마워요.'], react:['…{t}.','{t}, 아쉽네요.','…합이 넘쳤네요.']},
  emo:{stop:['스톱스톱!! 무서워요!!','여기서 멈춰요!! 😰','그만!! 스톱!!'], dig:['하나 더!! 가자!!','캐요 캐요!! 🤩','한 번만 더!!'], bomb:['으아악 폭탄!! 😱','폭탄 {b}개!!! 어떡해!!'],
    pen:['독박이라니!!! 😭','왜 제가 제일 높아요!! 😭'], gain:['대박!! 제가 받아요?! 🥳','꺄 공짜 점수!! 🎉'], react:['헉 {t}!!! 😱','{t} 독박!!','으아 {t}…']},
  sly:{stop:['스톱~ 이쯤이 딱이죠 😏','여기까지 😏','스톱. 다들 얼마 불렀을까요 😏'], dig:['하나 더~ 😏','계속 갑니다 😏','아직이죠 😏'], bomb:['폭탄이네 😅','폭탄 {b}개… 재밌어지네요 😏'],
    pen:['제가 독박이라… 이건 좀 😅','허, 제가 제일 높았네요 😅'], gain:['감사히 받을게요~ 😏','역시 낮게 부르길 잘했죠 😏'], react:['{t} 독박~ 😏','ㅋㅋ {t}','{t}, 욕심이 과했네요 😏']},
  hot:{stop:['스톱! 여기까지! 🔥','멈춘다!','스톱이요!'], dig:['더 캔다! 🔥','간다! 하나 더!','계속! 🔥'], bomb:['폭탄?! 😤','폭탄 {b}개! 아직 괜찮아!'],
    pen:['독박?! 말도 안 돼! 😤','제가 제일 높았다고요?! 🔥'], gain:['좋아! 받았다! 🔥','이득이다!'], react:['{t}! 😤','{t} 독박이다!','헉 {t}!']},
};
function lineOf(s,i,kind,o){ const st=STYLE[P(s,i).id]||'calm', L=(LINES[st]||LINES.calm)[kind]; if(!L) return ''; const used=(s.used[i]=s.used[i]||[]);
  const pool=L.filter(x=>!used.includes(x)); if(!pool.length) return ''; const raw=U.pick(pool); used.push(raw); o=o||{};
  return raw.replace(/\{t\}점/g,o.n!=null?o.n+'점':'').replace(/\{t\}/g,o.t!=null?nm(o.t):'').replace(/\{b\}/g,o.b!=null?o.b:''); }
function say(s,i,kind,o){ if(s.auto||isH(i)) return; const t=lineOf(s,i,kind,o); if(t){ s.say={seat:i,text:t,n:(s.say?s.say.n:0)+1}; s.log.push(`💬 ${nm(i)}: ${t}`); } }
function talk(s,i,kind,o){ if(s.auto||isH(i)) return; s.tq.push({i,kind,o}); }

function newMine(){ const a=[]; for(const k in MINE) for(let n=0;n<MINE[k];n++) a.push(k); return U.shuffle(a); }
const total=s=>s.base*Math.pow(2,s.dia);
const miners=s=>TM[s.team], bidders=s=>ALL.filter(i=>teamOf(i)!==s.team);
function init(starter,o){ { const hk=Math.max(2,Math.min(6,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,hk); }
  const s={phase:'intro', who:{}, starter:starter|0, sc:Array(N).fill(0), round:0, order:[], ti:0, team:0, bids:Array(N).fill(null), sub:Array(N).fill(false),
    mine:[], drawn:[], base:0, dia:0, bombs:0, mi:0, stopped:false, res:null, hist:[], q:[], tq:[], say:null, used:{}, log:[], key:[], turn:null, winner:null, ev:0, think:null,
    notice:'🎙️ 메인 매치 「광부게임」 — 광부는 캐고, 나머지는 몰래 승점을 부르세요'};
  s.hs=HSEAT.slice(); const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=ids[k]);
  return s; }
function startRound(s){ s.round++; if(s.round===1) s.order=[0,1,2]; else s.order=[0,1,2].sort((a,b)=>(s.sc[TM[a][0]]+s.sc[TM[a][1]])-(s.sc[TM[b][0]]+s.sc[TM[b][1]])||a-b);
  s.ti=0; if(!s.auto){ s.log.push(`🎙️ ${s.round}라운드 — 광부 순서 ${s.order.map(t=>`${t+1}조`).join(' → ')}`); } startSession(s); }
function startSession(s){ s.team=s.order[s.ti]; s.bids=Array(N).fill(null); s.sub=Array(N).fill(false); s.mine=newMine(); s.drawn=[]; s.base=0; s.dia=0; s.bombs=0; s.mi=0; s.stopped=false; s.fail=false; s.res=null; s.think=null;
  s.phase='bid'; s.turn=null; if(!s.auto){ s.notice=`⛏️ ${s.team+1}조(${miners(s).map(nm).join('·')})가 광부 — 나머지는 1~50 승점을 몰래 제시`; s.log.push(`⛏️ ${s.round}라운드 · ${s.team+1}조 광부`); } }
/* ── 판단 ── */
function estBid(s,j){ const past=s.hist.map(h=>h.bids[j]).filter(x=>x!=null); return past.length?(past.reduce((a,b)=>a+b,0)+6)/(past.length+1):6; }
function sumSamples(s,me){ const B=bidders(s).filter(j=>j!==me); const out=[]; for(let k=0;k<24;k++){ let t=0; for(const j of bidders(s)){ const m=estBid(s,j); t+=Math.max(1,Math.min(50,Math.round(m+(Math.random()-.5)*2*Math.max(2,m*.35)))); } out.push(t); } return out; }
function payMiner(T,sig){ return T>=sig?(T-sig)/2:T/2; }
function minerEV(T,bombs,SS){ if(bombs>=3) return 0; let e=0; for(const g of SS) e+=payMiner(T,g); return e/SS.length; }
function counts(s){ const c={G:0,S:0,C:0,D:0,B:0}; s.mine.forEach(k=>c[k]++); return c; }
/* 광부: 지금 멈출 때 vs 하나 더 캘 때의 기대 몫 (한 수 앞만 보고, 성격에 따라 대담함이 다름) */
function minerWants(s,i,lvl,SS){ const c=counts(s), n=s.mine.length; if(!n) return false; const T=total(s);
  if(lvl===0) return Math.random()<(s.bombs>=2?.35:.82);
  const stop=minerEV(T,s.bombs,SS); let dig=0;
  for(const k in c){ if(!c[k]) continue; const q=c[k]/n; let T2=T, b2=s.bombs;
    if(k==='B') b2++; else if(k==='D') T2=T*2; else T2=(s.base+IT[k].v)*Math.pow(2,s.dia);
    dig+=q*minerEV(T2,b2,SS); }
  const bold=(lvl>=2?0:(P(s,i).aggr-.5)*1.6)+(lvl===1?(Math.random()-.5)*.4:0);
  return dig+bold>stop; }
/* 제시자: 광부들이 얼마나 캘지 흉내 내 보고(남이 부를 점수는 지난 제시로 짐작) 기대 점수가 큰 승점 */
function simMine(s,SSm){ const m=newMine(); let base=0,dia=0,b=0; const tmp={mine:m,base:0,dia:0,bombs:0};
  for(let k=0;k<49;k++){ tmp.base=base; tmp.dia=dia; tmp.bombs=b; tmp.mine=m.slice(k); const T=base*Math.pow(2,dia);
    const c=counts(tmp), n=49-k; let dig=0; const stop=minerEV(T,b,SSm); for(const x in c){ if(!c[x]) continue; const q=c[x]/n; let T2=T,b2=b; if(x==='B') b2++; else if(x==='D') T2=T*2; else T2=(base+IT[x].v)*Math.pow(2,dia); dig+=q*minerEV(T2,b2,SSm); }
    if(dig<=stop) break; const it=m[k]; if(it==='B'){ b++; if(b>=3) return {T:0,fail:true}; } else if(it==='D') dia++; else base+=IT[it].v; }
  return {T:base*Math.pow(2,dia),fail:false}; }
function bidPay(b,others,T,fail){ const sig=b+others.reduce((a,x)=>a+x,0); if(fail||T>=sig) return b; const all=[b,...others], mx=Math.max(...all), mn=Math.min(...all);
  if(mx===mn) return 0; if(b===mx) return -b; if(b===mn){ const pen=all.filter(x=>x===mx).reduce((a,x)=>a+x,0); return pen/all.filter(x=>x===mn).length; } return 0; }
function chooseBid(s,i,lvl){ const pr=P(s,i); if(lvl===0) return Math.random()<.2?U.pick([12,15,20]):U.pick([2,3,4,5,6,8,10]);
  const others=bidders(s).filter(j=>j!==i); const SSm=sumSamples(s,-1); const K=lvl>=2?60:30; const sims=[]; for(let k=0;k<K;k++) sims.push(simMine(s,SSm));
  let best=10, bv=-1e9;
  for(const b of CANDS){ let e=0; for(const r of sims){ const ob=others.map(j=>{ const m=estBid(s,j); return Math.max(1,Math.min(50,Math.round(m+(Math.random()-.5)*2*Math.max(2,m*.35)))); }); e+=bidPay(b,ob,r.T,r.fail); } e/=K;
    e+=(lvl>=2?0:(pr.aggr-.5)*b*.12+(pr.bluff-.4)*b*.1)+(Math.random()-.5)*(lvl>=2?.6:1.2+b*.12); if(e>bv){ bv=e; best=b; } }
  return best; }
/* ── 진행 ── */
function drawOne(s,i){ const it=s.mine.shift(); s.drawn.push({it,by:i}); if(it==='B') s.bombs++; else if(it==='D') s.dia++; else s.base+=IT[it].v;
  if(!s.auto){ s.notice=`${IT[it].e} ${nm(i)}: ${IT[it].n}!${it==='D'?' 총점 2배!':it==='B'?` (폭탄 ${s.bombs}/3)`:''} — 지금 총점 ${total(s)}`; s.log.push(`⛏️ ${nm(i)} → ${IT[it].e}${IT[it].n} (총점 ${total(s)}${s.bombs?`, 💣${s.bombs}`:''})`);
    if(it==='B'&&Math.random()<.8) talk(s,i,'bomb',{b:s.bombs}); }
  if(s.bombs>=3){ s.stopped=true; s.fail=true; if(!s.auto){ s.notice=`💥 폭탄 3개! 채굴 실패 — 광부 0점`; s.log.push(s.notice); } return; }
  if(!s.mine.length){ s.stopped=true; } else s.mi=1-s.mi; }
function stopMine(s,i){ s.stopped=true; s.fail=false; if(!s.auto){ s.notice=`✋ ${nm(i)} 스톱! 채굴 총점 ${total(s)}`; s.log.push(`✋ ${nm(i)} 스톱 — 총점 ${total(s)}`); say(s,i,'stop',{n:total(s)}); } }
function settle(s){ const B=bidders(s), M=miners(s), T=total(s), sig=B.reduce((a,j)=>a+s.bids[j],0); const out=Array(N).fill(0); let kind;
  if(s.fail){ kind='fail'; B.forEach(j=>out[j]=s.bids[j]); }
  else if(T>=sig){ kind='ok'; B.forEach(j=>out[j]=s.bids[j]); const rest=Math.floor((T-sig)/2); M.forEach(j=>out[j]=rest); }
  else { kind='short'; const half=Math.floor(T/2); M.forEach(j=>out[j]=half); const bs=B.map(j=>s.bids[j]), mx=Math.max(...bs), mn=Math.min(...bs);
    if(mx!==mn){ const hi=B.filter(j=>s.bids[j]===mx), lo=B.filter(j=>s.bids[j]===mn); const pen=hi.length*mx; hi.forEach(j=>out[j]=-mx); lo.forEach(j=>out[j]=Math.floor(pen/lo.length)); s.res={hi,lo}; } }
  ALL.forEach(j=>s.sc[j]+=out[j]);
  s.hist.push({round:s.round,team:s.team,bids:s.bids.slice(),T,sig,fail:!!s.fail,kind,out,n:s.drawn.length,drawn:s.drawn.map(d=>d.it).join('')});
  if(!s.auto){ const msg=kind==='fail'?`💥 실패 — 제시자 4명은 제시 점수를 받고, 광부는 0점`:kind==='ok'?`✅ 총점 ${T} ≥ 제시 합 ${sig} — 제시자는 제시 점수, 광부는 남은 ${T-sig}점을 나눠 ${Math.floor((T-sig)/2)}점씩`:`❌ 총점 ${T} < 제시 합 ${sig} — 제시자 0점, 광부가 ${Math.floor(T/2)}점씩${s.res?` · 최고 제시 ${s.res.hi.map(nm).join('·')} 독박(−${s.bids[s.res.hi[0]]}) → 최저 ${s.res.lo.map(nm).join('·')}가 가져감`:''}`;
    s.notice=msg; s.log.push(msg); if(kind==='short'&&s.res){ s.res.hi.forEach(j=>{ talk(s,j,'pen'); s.key.push(`${s.round}R ${s.team+1}조 채굴 · ${nm(j)} ${s.bids[j]}점 독박`); }); s.res.lo.forEach(j=>{ if(Math.random()<.6) talk(s,j,'gain'); });
      const r=U.shuffle(ALL.filter(j=>!isH(j)&&!s.res.hi.includes(j)&&!s.res.lo.includes(j)))[0]; if(r!=null&&Math.random()<.6) talk(s,r,'react',{t:s.res.hi[0]}); }
    if(kind==='fail') s.key.push(`${s.round}R ${s.team+1}조 채굴 · 💣 폭탄 3개로 실패`); }
  s.res=s.res||{}; }
function next(s){ s.ti++; if(s.ti>=3){ if(s.round>=ROUNDS){ s.phase='final'; const r=ALL.slice().sort((a,b)=>s.sc[b]-s.sc[a]); if(!s.auto){ s.notice=`🏁 최종 — ${r.map((i,k)=>`${k+1}. ${nm(i)} ${s.sc[i]}점`).join(' · ')}`; s.log.push(s.notice); } return; } startRound(s); return; } startSession(s); }
const npcLvl=(s,i)=>s.lvlOv!=null?s.lvlOv:P(s,i).logic>=.7?2:1;
function apply(s,p,a){ syncH(s); if(s.winner!=null) return '게임이 끝났어요'; if(!a) return '알 수 없는 동작'; const i=HSEAT[p];
  if(a.k==='bid'){ if(s.phase!=='bid') return '지금은 제시할 때가 아니에요'; if(!bidders(s).includes(i)) return '이번엔 내가 광부예요'; if(s.sub[i]) return '이미 냈어요'; const b=a.b|0; if(b<1||b>50) return '1~50점'; s.bids[i]=b; s.sub[i]=true; if(!s.auto) s.log.push(`🗳️ ${nm(i)} 제출`); s.ev++; return null; }
  if(a.k==='dig'||a.k==='stop'){ if(s.phase!=='mine'||s.stopped) return '지금은 캘 때가 아니에요'; if(miners(s)[s.mi]!==i) return '동료 차례예요'; if(a.k==='dig') drawOne(s,i); else stopMine(s,i); s.turn=null; s.think=null; s.ev++; return null; }
  return '알 수 없는 동작'; }
function thinkMs(s,i){ const p=P(s,i); return (s.bombs>=2?1900:total(s)>=20?1300:800)*(1.3-p.temper*.6)+Math.random()*500; }
function stepDelay(s){ syncH(s); if(s.winner!=null) return null; if(s.tq.length) return 1300;
  if(s.phase==='intro') return 2400;
  if(s.phase==='bid'){ if(s.sub.every((x,j)=>x||!bidders(s).includes(j))) return 700; return bidders(s).some(j=>!isH(j)&&!s.sub[j])?700+Math.random()*900:null; }
  if(s.phase==='mine'){ if(s.stopped) return 1400; const m=miners(s)[s.mi]; if(isH(m)) return null; return s.think===m?thinkMs(s,m):400; }
  if(s.phase==='rev') return 1000; if(s.phase==='settle') return 3600; if(s.phase==='final') return 2600; return null; }
function step(s){ syncH(s);
  if(s.tq.length){ const t=s.tq.shift(); say(s,t.i,t.kind,t.o); s.ev++; return; }
  if(s.phase==='intro'){ startRound(s); s.ev++; return; }
  if(s.phase==='bid'){ const B=bidders(s); const j=B.find(x=>!isH(x)&&!s.sub[x]); if(j!=null){ s.bids[j]=chooseBid(s,j,npcLvl(s,j)); s.sub[j]=true; s.log.push(`🗳️ ${nm(j)} 제출`); s.notice=`🗳️ ${nm(j)} 제시 완료 (${B.filter(x=>s.sub[x]).length}/4)`; s.ev++; return; }
    if(B.every(x=>s.sub[x])){ s.phase='mine'; s.mi=0; const m=miners(s)[0]; s.turn=isH(m)?pOf(m):null; s.notice=`⛏️ 채굴 시작 — ${nm(m)}부터 번갈아 하나씩`; s.ev++; } return; }
  if(s.phase==='mine'){ if(s.stopped){ s.phase='rev'; s.rv=0; s.turn=null; s.notice='🔓 제시 승점을 한 명씩 공개합니다'; s.ev++; return; }
    const m=miners(s)[s.mi]; if(isH(m)) return; if(s.think!==m){ s.think=m; s.notice=`💭 ${nm(m)} 캘까, 멈출까… (총점 ${total(s)}, 💣${s.bombs})`; s.ev++; return; }
    const SS=sumSamples(s,-1); if(minerWants(s,m,npcLvl(s,m),SS)){ if(Math.random()<.25) say(s,m,'dig'); drawOne(s,m); } else stopMine(s,m);
    if(!s.stopped){ const n2=miners(s)[s.mi]; s.turn=isH(n2)?pOf(n2):null; } s.think=null; s.ev++; return; }
  if(s.phase==='rev'){ const B=bidders(s); if(s.rv<B.length){ const j=B[s.rv++]; s.notice=`🔓 ${nm(j)}: ${s.bids[j]}점 (제시 합 ${B.slice(0,s.rv).reduce((a,x)=>a+s.bids[x],0)} / 채굴 ${s.fail?'💥실패':total(s)})`; s.log.push(`🔓 ${nm(j)} ${s.bids[j]}점`); s.ev++; return; }
    settle(s); s.phase='settle'; s.ev++; return; }
  if(s.phase==='settle'){ next(s); if(s.phase==='bid'){ const B=bidders(s); s.turn=null; } s.ev++; return; }
  if(s.phase==='final'){ s.phase='over'; const a=s.sc[HSEAT[0]], b=s.sc[HSEAT[1]]; s.winner=a>b?0:b>a?1:'both'; { const mx=Math.max(...HSEAT.map(h=>s.sc[h])); s.winners=HSEAT.map((h,p)=>s.sc[h]===mx?p:-1).filter(x=>x>=0); } s.ev++; return; }
}
function mask(s,p){ syncH(s); const v=U.clone(s), me=HSEAT[p]; if(s.phase==='bid'||s.phase==='mine'||(s.phase==='rev')){ v.bids=s.bids.map((b,j)=>j===me?b:(s.phase==='rev'&&bidders(s).indexOf(j)<s.rv?b:null)); }
  v.mine=null; v.mn=s.mine.length; v.mc=null; v.used={}; v.tq=[]; return v; }
function ai(v,lvl){ syncH(v); const i=HSEAT[1]; lvl=lvl==null?1:lvl;
  if(v.phase==='bid'&&bidders(v).includes(i)&&!v.sub[i]){ const s=Object.assign({},v); return {k:'bid',b:chooseBid(s,i,lvl)}; }
  if(v.phase==='mine'&&!v.stopped&&miners(v)[v.mi]===i){ const s=Object.assign({},v,{mine:remainingGuess(v)}); return minerWants(s,i,lvl,sumSamples(v,-1))?{k:'dig'}:{k:'stop'}; }
  return null; }
/* 남은 광산 구성은 꺼낸 것으로 계산 가능(공개 정보) */
function remainingGuess(v){ const c=Object.assign({},MINE); v.drawn.forEach(d=>c[d.it]--); const a=[]; for(const k in c) for(let n=0;n<c[k];n++) a.push(k); return a; }
function aiDelay(){ return 1100+Math.random()*1400; }

/* ── 화면 ── */
let WHO={}, bidSel=10, sig='';
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}/g,(_,d)=>`${seatEmoji(+d)} ${seatName(+d,ctx)}`); }
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{}; const me=HSEAT[ctx.me]; const sg=v.round+':'+v.ti+':'+v.phase; if(sg!==sig){ sig=sg; }
  const left=(()=>{ const c=Object.assign({},MINE); (v.drawn||[]).forEach(d=>c[d.it]--); return c; })();
  let h=`<div class="hl-notice">${fill(U.esc(v.notice||''),ctx)}</div>`;
  h+=`<div class="vr-speech">${v.say?`<span class="w">${seatEmoji(v.say.seat)} ${seatName(v.say.seat,ctx)}</span> ${fill(U.esc(v.say.text),ctx)}`:'<i>　</i>'}</div>`;
  h+=`<div class="mn-teams">${TM.map((t,k)=>`<div class="mn-team ${v.team===k&&v.phase!=='intro'?'mining':''}"><div class="mn-th">${k+1}조${v.team===k&&v.phase!=='intro'?' ⛏️ 광부':''}</div>${t.map(i=>{ const b=v.bids[i]; const bidder=v.phase!=='intro'&&teamOf(i)!==v.team;
      return `<div class="mn-p ${i===me?'me':''} ${v.phase==='mine'&&miners(v)[v.mi]===i&&!v.stopped?'cur':''}"><span>${seatEmoji(i)} ${seatName(i,ctx)}</span><b>${v.sc[i]}점</b>${bidder?`<small>${b!=null?`🗳️ ${b}`:v.sub[i]?'🗳️ ✔':'🗳️ …'}</small>`:''}</div>`; }).join('')}</div>`).join('')}</div>`;
  if(v.phase!=='intro'){ const T=total(v);
    h+=`<div class="mn-mine"><div class="mn-tot">채굴 총점 <b>${v.fail?'💥':T}</b> <small>(${v.base}${v.dia?` × ${Math.pow(2,v.dia)}`:''})</small> · 💣 ${v.bombs}/3</div>
      <div class="mn-drawn">${(v.drawn||[]).map(d=>`<span class="mn-it ${d.it}">${IT[d.it].e}</span>`).join('')||'<small>아직 아무것도 안 캤어요</small>'}</div>
      <div class="mn-left">남은 광물 ${Object.keys(MINE).map(k=>`${IT[k].e}${left[k]}`).join(' ')}</div></div>`; }
  if(v.phase==='bid'&&bidders(v).includes(me)&&!v.sub[me]){
    h+=`<div class="vr-card"><b>🗳️ 승점 제시 (1~50)</b><p>채굴 총점이 4명 제시 합 이상이면 제시한 만큼 받아요. 모자라면 0점 — 최고 제시자는 그만큼 <b>감점</b>, 최저 제시자가 가져가요.</p>
      <div class="mr-btns">${CANDS.map(c=>`<button class="${bidSel===c?'':'ghost'}" data-b="${c}">${c}</button>`).join('')}</div>
      <div class="fh-act"><span class="bs-amt"><button class="ghost" data-a="m">−</button><b>${bidSel}</b><button class="ghost" data-a="p">+</button></span><button data-a="go">제출</button></div></div>`; }
  else if(v.phase==='bid'&&miners(v).includes(me)) h+=`<div class="vr-card"><small>우리 조가 광부 — 다른 사람들이 승점을 부르는 중 (${bidders(v).filter(j=>v.sub[j]).length}/4)</small></div>`;
  else if(v.phase==='bid') h+=`<div class="vr-card"><small>제출 완료 — 기다리는 중 (${bidders(v).filter(j=>v.sub[j]).length}/4)</small></div>`;
  if(v.phase==='mine'&&!v.stopped&&miners(v)[v.mi]===me){ h+=`<div class="vr-card"><b>⛏️ 내 차례</b><p>제시 합보다 적게 캐면 총점을 우리 둘이 나누고, 넘기면 <b>남는 점수</b>만 나눠요. 💣 3개면 0점.</p><div class="fh-act"><button data-a="dig">⛏️ 하나 캐기</button><button class="ghost" data-a="stop">✋ 스톱</button></div></div>`; }
  if(v.phase==='over'){ h+=`<div class="sn-score">${ALL.slice().sort((a,b)=>v.sc[b]-v.sc[a]).map((i,k)=>`<div class="${isH(i)?'h':''}"><b>${k+1}. ${seatEmoji(i)} ${seatName(i,ctx)}</b> ${v.sc[i]}점 <small>${teamOf(i)+1}조</small></div>`).join('')}</div>`;
    if(v.key.length) h+=`<div class="vr-card mr-key"><b>🎬 결정적 장면</b>${v.key.slice(-6).map(x=>`<div><small>${fill(U.esc(x),ctx)}</small></div>`).join('')}</div>`; }
  const L=`<div class="side-box"><div class="side-h">📊 지난 채굴 <small>제시 승점</small></div>${v.hist.map(x=>`<div class="mn-h"><b>${x.round}R ${x.team+1}조</b> 총점 ${x.fail?'💥':x.T} · 합 ${x.sig}<br><small>${ALL.filter(j=>teamOf(j)!==x.team).map(j=>`${seatEmoji(j)}${x.bids[j]}${x.out[j]<0?'❌':''}`).join(' ')}</small></div>`).join('')||'<div class="side-row"><small>-</small></div>'}</div>
    <div class="side-box"><div class="side-h">📖 광산</div><small>🥇금 3 · 🥈은 2 · 🥉동 1 (각 14개)<br>💎 다이아 2개 — 총점 2배<br>💣 폭탄 5개 — 3개면 실패</small></div>`;
  const R=`<div class="side-box side-log"><div class="side-h">📜 진행 기록 <small>최근이 위</small></div>${v.log.slice(-80).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=`<div class="side3"><div class="side-mid">${h}</div><aside class="side-l">${L}</aside><aside class="side-r">${R}</aside></div>`;
  el.onclick=e=>{ const b=e.target.closest('[data-b]'); if(b){ bidSel=+b.dataset.b; return ctx.rerender(); } const a=e.target.closest('[data-a]'); if(!a) return; const k=a.dataset.a;
    if(k==='m'){ bidSel=Math.max(1,bidSel-1); return ctx.rerender(); } if(k==='p'){ bidSel=Math.min(50,bidSel+1); return ctx.rerender(); }
    if(k==='go') return ctx.act({k:'bid',b:bidSel}); if(k==='dig') return ctx.act({k:'dig'}); if(k==='stop') return ctx.act({k:'stop'}); };
}
function status(v,ctx){ syncH(v); const me=HSEAT[ctx.me]; if(v.phase==='over') return ''; if(v.phase==='bid'&&bidders(v).includes(me)&&!v.sub[me]) return '승점을 제시하세요'; if(v.phase==='mine'&&!v.stopped&&miners(v)[v.mi]===me) return '캘까, 멈출까?'; return '진행 중…'; }
const guide=`
<p><b>캐는 사람 vs 부르는 사람</b> — 6인 3개 조(우리 둘은 다른 조 + 성격 다른 컴퓨터 4명).</p>
<ol><li>조마다 돌아가며 <b>광부</b>. 광산: 🥇금 3점·🥈은 2점·🥉동 1점 각 14개, 💎다이아 2개(총점 2배), 💣폭탄 5개.</li>
<li>광부가 아닌 4명은 <b>1~50 승점</b>을 몰래 제시해요.</li>
<li>광부 둘은 번갈아 하나씩 캐다가 언제든 <b>스톱</b>. 💣 3개면 실패.</li>
<li>총점 ≥ 제시 합 → 제시자는 <b>제시한 만큼</b>, 광부는 남은 점수를 나눠요. 실패 → 광부 0, 제시자는 제시한 만큼.</li>
<li>총점 < 제시 합 → 제시자 0, 광부가 총점을 나눔. <b>최고 제시자는 감점</b>, 그 점수는 최저 제시자에게.</li>
<li>${ROUNDS}라운드(조마다 ${ROUNDS}번 광부), 2라운드는 점수가 낮은 조부터. 총점 1위 우승.</li></ol>
<div class="tipbox">💡 <b>팁</b><br>· 광부는 제시 합을 넘기는 순간 몫이 확 줄어요 — 합 바로 아래에서 멈추면 최고!<br>· 제시자는 너무 높게 부르면 독박, 너무 낮으면 남 좋은 일. 지난 제시가 힌트예요.</div>`;
function demo(s,ph){ s.round=1; s.order=[0,1,2]; s.ti=1; startSession(s); s.phase=ph; return s; }
const guideSteps=[
  {t:'⛏️ 광부와 제시자', h:'한 조가 <b>광부</b>, 나머지 4명은 승점(1~50)을 <b>몰래</b> 불러요.', demo:s=>demo(s,'bid')},
  {t:'💣 캘까, 멈출까', h:'광부 둘이 번갈아 하나씩. 💎는 총점 2배, 💣 <b>3개</b>면 실패!', demo:s=>{ demo(s,'mine'); s.drawn=[{it:'G'},{it:'S'},{it:'B'},{it:'D'},{it:'C'}]; s.base=6; s.dia=1; s.bombs=1; s.mi=0; return s; }},
  {t:'⚖️ 총점 vs 제시 합', h:'총점이 합 이상이면 제시자는 부른 만큼. 모자라면 0점 — <b>최고 제시자 독박</b>, 최저 제시자가 가져가요.', demo:s=>{ demo(s,'settle'); s.bids=[12,null,null,5,20,30]; s.base=20; s.stopped=true; s.notice='❌ 총점 20 < 제시 합 67 — 최고 제시 {s5} 독박(−30) → 최저 {s3}가 가져감'; return s; }},
  {t:'🏆 총점 1위', h:'2라운드 동안 모든 조가 두 번씩 광부. <b>총점 1위</b>가 우승!', demo:s=>{ demo(s,'bid'); s.sc=[34,12,27,40,8,19]; return s; }},
];
window.GAMES.miner = { _sync:x=>syncH(x), maxH:6,
  title:'광부게임', ref:'더 지니어스 「광부게임」', emoji:'⛏️', tags:['눈치','제시','확률','NPC','두뇌서바이벌'],
  tagline:'광부는 제시 합 바로 아래에서 멈추고 싶고, 제시자는 합이 넘치길 바란다 — 몰래 부르는 승점 눈치 싸움.',
  guide, guideSteps, init, apply, mask, ai, aiDelay, render, status, step, stepDelay, noPersona:true, wide:true,
  reset(){ bidSel=10; sig=''; },
  bar:(v,i)=>`<span class="tag">${v.sc[HSEAT[i]]}점</span>`,
  result:(v,ctx)=>`${v.sc[HSEAT[ctx.me]]}점`,
  _E:{chooseBid,minerWants,sumSamples,bidders,miners,remainingGuess}, _H:HSEAT,
};
})();
