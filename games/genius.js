(function(){
'use strict';
/* 🏆 더 지니어스 · 놀이터 시즌 — AI·친구와 (2026-11-11 사용자: "지니어스 시즌1을 AI 기반 + 선과 악에서 개발·피드백한 내용 그라운드 룰로 다 바꿔줘. 친구들이랑 같이 플레이하게")
   예전 season.js(혼자 + 동물 7)를 core의 게임 하나로 다시 만듦 → 방장이 진행, 손님은 자기 자리만 봄(멀티 그대로).
   참가: 사람(방에 들어온 만큼) + 동물로 8명. 회차: ☕ 휴식(대화·귓속말·연합) → 🎮 메인 매치(실제 게임을 이 안에서 돌림) → 📊 결과(1위 징표·가넷)
   → (팀전은 진 팀 투표) → 🏛️ 로비(후보에게 부탁·거래·몰아가기) → 👉 지목 → 🎮 데스매치 게임 고르기 → ⚔️ 데스매치 → 💀 탈락. 둘 남으면 결승 3판 2선승.
   AI(방장 PC의 다리)가 동물의 말·판단(휴식 대화, 귓속말 답장, 로비, 투표, 지목)을 맡음 — 그라운드 룰은 CLAUDE.md 6-4. 다리가 꺼져 있으면 단순 규칙. */
const MAXP=8;
/* 😈 데블스 플랜 놀이터 (2026-11-12 사용자: "데블스플랜3 놀이터로 지니어스 놀이터처럼 따로") — 같은 엔진, 형식만 다름(s.fmt='devil').
   하루: ☕ 자유 시간 → 🎮 메인 매치(전원, 꼴찌 1명 🏝️ 유배) → 🎖️ 1위 연맹의 징표(감옥행 1명 구제) → 🏠 생활동 / ⛓️ 감옥동 → ⛓️ 감옥 매치(꼴찌 유배).
   🧩 피스(아이템·거래, 0개여도 탈락 안 함) · 🗝️ 비밀 임무(저주) · 🔥 유배지 패자부활전(한 번, 1명 복귀). 둘 남으면 결승 3판 2선승. 10명. */
const MAXD=10;
const isDev=s=>!!(s&&s.fmt==='devil');
const DPOOL={10:['tri13ai','stockai','lanternai'],9:['tri13ai','stockai','lanternai'],8:['tri13ai','stockai','kongai','lanternai'],7:['tri13ai','lanternai','stockai','doubtai'],6:['kongai','stockai','doubtai','lanternai'],5:['doubtai','diceai'],4:['diceai','doubtai'],3:['predai','diceai']};
const DPRISON=['heavy13ai','rouletteai'];
const CUR=v=>isDev(v)?'🧩':'🟣', CURN=v=>isDev(v)?'피스':'가넷';
const EPN=(v,ep)=>isDev(v)?ep+'일차':'제'+ep+'회';
const S1={8:'tri13ai',7:'lanternai',6:'kongai',5:'doubtai',4:'diceai',3:'predai'};
const POOL={8:['tri13ai','lanternai','virus','tri13','jury','swordshield'],7:['lanternai'],6:['kongai','lanternai','halloween','treasure','maincolor','daynight','hilo','balmancala'],5:['doubtai'],4:['diceai','mixmatch'],3:['predai','blackvillage','brickbuild','memory30','hiddencode']};
const S1D=['indianai','bwai','rps2','pyramid','sniper','wallgo','dicepoker','hexagon'];
const S1F=['indianai','bwai','morris'];
const DEATHS=['indianai','bwai','rps2','pyramid','sniper','wallgo','dicepoker','hexagon','blackwhite2','betrps','twofacepoker','indianpoker'];
const isDevR=r=>r==='lucifer'||r==='devil';
const TEAM={
  virus:(s,i)=>((s.roles[i]==='terror')?'terror':'citizen')===s.side,
  kong:(s,i)=>(i<3?0:1)===s.wt,
  jury:(s,i)=>((s.role[i]==='k'||s.role[i]==='kl')?'k':'c')===s.wteam,
  swordshield:(s,i)=>(i<4?0:1)===s.wt,
  goodevil:(s,i)=>(isDevR(s.role[i])?'dev':'ang')===s.wteam,
  goodevilai:(s,i)=>(isDevR(s.role[i])?'dev':'ang')===s.wteam,
};
const NAT={};
const natOn=s=>!!(s.nm&&NAT[s.nm.id]&&(s.phase==='match'||s.phase==='death'||s.phase==='final'||s.phase==='prison'||s.phase==='revival'));   /* 🤖 시즌 전용 AI판 메인 매치 (아래에서 등록) */
const G_=id=>NAT[id]||(window.GAMES&&GAMES[id]);
const okGame=(id,hum)=>{ const g=G_(id); if(!g) return false; if(hum>=2&&(g.maxH||2)<hum) return false; return true; };
const ANI=id=>NPCS.byId(id);
const isHum=id=>typeof id==='string'&&/^h\d+$/.test(id);   /* 'haram'(부엉이)도 h로 시작해서 정확히 h+숫자만 */
const coreP=id=>+id.slice(1);
const rnd=(a,b)=>a+Math.random()*(b-a);

/* 이름·아바타: 사람은 core 이름(겹치면 번호), 동물은 이름 */
const nm=id=>id==null?'?':isHum(id)?(typeof nameOf==='function'?nameOf(coreP(id)):'사람'):(ANI(id)||{}).name||'?';
const emo=id=>id==null?'❔':isHum(id)?(U.ava?U.ava(coreP(id)):'🙂'):(ANI(id)||{}).emo||'🐾';
const who=id=>`${emo(id)} <b>${U.esc(nm(id))}</b>`;

/* ───────── 상태 ───────── */
function init(starter,o){ const dv=!!(o&&o.fmt==='devil'), MX=dv?MAXD:MAXP, RO=dv?NPCS.ROSTER.concat(NPCS.EXTRA||[]):NPCS.ROSTER;
  const k=Math.max(1,Math.min(MX,(o&&o.humans)||(typeof mode!=='undefined'&&mode==='solo'?1:2)));
  const hs=[...Array(k).keys()];
  const ani=U.shuffle(RO.map(p=>p.id)).slice(0,MX-k), g0=dv?1:2;
  const players=hs.map(p=>({id:'h'+p,g:g0,tok:0,out:0})).concat(ani.map(id=>({id,g:g0,tok:0,out:0})));
  const s={hs, players, rel:{}, ally:{}, alli:[], ep:0, phase:'opening', chat:[], dm:{}, ready:{}, notice:'🎙️ 더 지니어스 · 놀이터 시즌을 시작합니다', ev:0, winner:null,
    lobby:null, vote:null, cand:null, oppo:null, death:null, deathOpts:null, sub:null, used:[], usedD:[], eps:[], lastOrder:[], lastTeam:false, final:null, champ:null,
    air:{}, seq:0, typing:null, aq:[], memo:{}, stat:{win:{},survive:{},betray:{},deal:{}}, said:{}, pend:null, wait:0, turn:null, fmt:dv?'devil':'genius', home:{}};
  if(dv) s.notice='😈 데블스 플랜 · 놀이터 시즌을 시작합니다';
  for(const a of ani){ s.rel[a]={}; for(const b of players) if(b.id!==a) s.rel[a][b.id]=(Math.random()-.5)*.3+((ANI(a).trust||.5)-.5)*.2; }
  if(dv){ sys(s,'🎙️ 「😈 데블스 플랜 · 놀이터」에 오신 걸 환영합니다! 10명 중 마지막 한 명이 우승해요.'); sys(s,`🎙️ 참가자 — ${players.map(p=>nm(p.id)).join(' · ')}`);
    sys(s,'📜 하루에 메인 매치와 감옥 매치. 메인 매치 꼴찌는 바로 🏝️ 유배지로, 1위는 🎖️ 연맹의 징표로 감옥행 한 명을 구해요. 하위권은 ⛓️ 감옥동에서 감옥 매치 — 꼴찌는 유배지로. 🧩 피스가 0이어도 탈락하지 않아요. 오직 게임만이 운명을 정합니다.'); }
  else { sys(s,'🎙️ 「🏆 더 지니어스 · 놀이터」에 오신 걸 환영합니다! 8명 중 마지막 한 명이 우승해요.');
  sys(s,`🎙️ 참가자 — ${players.map(p=>nm(p.id)).join(' · ')}`);
  sys(s,'📜 매 회 메인 매치 1위는 🛡️ 생명의 징표(데스매치 면제) + 🎁 나눠 줄 징표 1개(받은 징표는 다시 못 넘겨요) + 🟣 가넷. 꼴찌(팀전은 진 팀 투표)가 데스매치 후보가 되어 상대를 지목하고, 1:1로 진 사람이 탈락해요.'); }
  for(const a of U.shuffle(ani.slice()).slice(0,3)) s.aq.push({k:'intro',i:a});
  return s;
}
const pl=(s,id)=>s.players.find(x=>x.id===id);
const alive=s=>s.players.filter(x=>!x.out);
const aliveIds=s=>alive(s).map(x=>x.id);
const humansAlive=s=>alive(s).filter(x=>isHum(x.id)).map(x=>x.id);
const animalsAlive=s=>alive(s).filter(x=>!isHum(x.id)).map(x=>x.id);
function rel(s,a,b){ return (s.rel[a]&&s.rel[a][b])||0; }
function addRel(s,a,b,d){ if(a===b||isHum(a)) return; s.rel[a]=s.rel[a]||{}; s.rel[a][b]=Math.max(-1,Math.min(1,rel(s,a,b)+d)); }
/* 🧠 관계 축·사건표 (2026-11-12 NPC 룰 13~20) — 호감은 rel 그대로, 믿음 t·빚 d·원한 g는 s.bx[a][b](a가 b에게), 경계는 판세(threat)로 계산.
   관계는 사건(bond)으로만 움직이고 변화마다 이유를 s.rlog에 — 동물 시야([너의 마음])·지목/투표/구제 점수·회차 리포트가 읽음.
   BOND[k] = [믿음, 빚, 원한, 공개(모두가 봄 → 평판), 문구] */
const BOND={betray:[-.6,0,.7,1,'연합을 배신했다'],dealBetray:[-.8,-.5,.8,1,'거래해 놓고 지목했다'],pick:[-.25,0,.55,1,'데스매치 상대로 지목했다'],vote:[-.1,0,.3,1,'투표로 후보에 올렸다'],
  save:[.3,.8,-.5,1,'연맹의 징표로 구해 줬다'],swap:[-.15,0,.4,1,'남을 구하느라 나를 감옥동으로 보냈다'],gift:[.3,.7,-.4,1,'생명의 징표를 줬다'],piece:[.1,.3,-.15,1,'피스를 줬다'],
  deal:[.15,.2,-.05,0,'거래를 지켰다'],ally:[.2,0,-.1,0,'연합을 맺었다'],refuse:[-.02,0,.03,0,'연합 제안을 거절했다'],kept:[.12,0,-.05,0,'약속을 지켰다'],broke:[-.3,0,.2,0,'약속을 어겼다'],
  killMate:[-.2,0,.6,1,'내 연합 동료를 떨어뜨렸다'],curse:[-.2,0,.35,1,'비밀 임무로 나를 노렸다'],coop:[.06,0,0,0,'같은 팀으로 이겼다'],moved:[.1,.1,-.1,0,'최후 변론으로 나를 설득했다']};
const BX=(s,a,b)=>(s.bx&&s.bx[a]&&s.bx[a][b])||{t:0,d:0,g:0};
function bxO(s,a,b){ const B=(s.bx=s.bx||{}); B[a]=B[a]||{}; return B[a][b]=B[a][b]||{t:0,d:0,g:0}; }
const cl1=x=>Math.max(-1,Math.min(1,x)), cl01=x=>Math.max(0,Math.min(1,x));
/* 성격 + 성장(사건으로 조금씩 바뀐 만큼) */
function trait(s,a,k){ const b=(ANI(a)||{})[k]; return cl01((b==null?.5:b)+((s.grow&&s.grow[a]&&s.grow[a][k])||0)); }
const GROWN={trust:['믿음','의심'],aggr:['대담','신중'],temper:['욱함','침착'],talk:['수다','말수 적음']};
function grow(s,a,k,d,why){ if(!a||isHum(a)||!pl(s,a)) return; const G=(s.grow=s.grow||{})[a]=s.grow[a]||{}; G[k]=Math.max(-.35,Math.min(.35,(G[k]||0)+d)); const L=(s.glog=s.glog||[]); if(L.some(g=>g.ep===s.ep&&g.a===a&&g.k===k)) return; L.push({ep:s.ep,a,k,d,why}); }   /* 한 회차에 같은 쪽 변화는 한 줄만 */
function bond(s,a,b,k,mul){ const K=BOND[k]; if(!K||!a||!b||a===b||!pl(s,b)) return; mul=mul==null?1:mul;
  if(!isHum(a)&&pl(s,a)){ const o=bxO(s,a,b), tr=trait(s,a,'trust');   /* 잘 믿는 동물은 믿음이 빨리 오르고 의심 많은 동물은 빨리 깎임, 다혈질일수록 원한이 큼 */
    o.t=cl1(o.t+K[0]*mul*(K[0]>0?.6+tr*.8:1.4-tr*.8)); o.d=cl01(o.d+K[1]*mul); o.g=cl01(o.g+K[2]*mul*(K[2]>0?.7+trait(s,a,'temper')*.6:1));
    (s.rlog=s.rlog||[]).push({ep:s.ep,a,b,k,m:mul}); if(s.rlog.length>600) s.rlog.shift(); }
  if(K[3]||k==='kept'||k==='broke'){ const F=(s.fame=s.fame||{})[b]=s.fame[b]||{good:0,bad:0,kept:0,broke:0};
    if(k==='kept'||k==='broke') F[k]++; else if(K[0]<0) F.bad+=mul; else F.good+=mul;
    if(K[3]) for(const x of animalsAlive(s)) if(x!==a&&x!==b){ const o=bxO(s,x,b); o.t=cl1(o.t+K[0]*mul*.3); } } }   /* 공개된 일은 구경꾼의 믿음도 조금 움직임(평판) */
/* 경계 — 강자일수록(1위·생존·징표·재화) 위협 */
function threat(s,x){ const P=pl(s,x); if(!P||P.out) return 0; const W=(s.stat.win||{})[x]||0, S=(s.stat.survive||{})[x]||0; return cl01(W*.3+S*.15+(P.tok?.15:0)+(P.g>=5?.15:P.g>=3?.05:0)); }
/* 시즌 흐름 — 0 초반(탐색) · 1 중반(세력) · 2 후반(각자도생) */
function stage(s){ const r=alive(s).length/s.players.length; return r>.75?0:r>.45?1:2; }
const STAGE=['초반 — 서로 떠보며 탐색하는 때. 섣불리 적을 만들지 않는다','중반 — 세력이 갈리는 때. 믿을 편을 굳히고 위협을 견제한다','후반 — 각자도생. 결승이 가까워 연합 동료도 결국 경쟁자다. 이득이 크면 적과도 손잡는다'];
/* 회차가 바뀔 때 — 원한·빚은 조금씩 옅어짐(감정은 굳지 않음) */
function bondDecay(s){ for(const a in s.bx||{}) for(const b in s.bx[a]){ const o=s.bx[a][b]; o.g*=.78; o.d*=.85; o.t*=.92; } }
/* 화살이 한 사람에게 몰렸나 — 최근 두 회차 지목·투표·몰아가기 받은 횟수 */
function heat(s,x){ return (s.evl||[]).filter(e=>e.b===x&&e.ep>=s.ep-1&&(e.k==='pick'||e.k==='push'||e.k==='vote')).length; }
/* 데스매치에서 c가 x를 이길 확률 짐작(논리력 기준, simDuel과 같은 식) */
function winP(s,c,x){ const la=isHum(c)?.6:trait(s,c,'logic'), lb=isHum(x)?.6:trait(s,x,'logic'); return cl01(.5+(la-lb)*.4); }
const BWHY=k=>(BOND[k]||[])[4]||k;
/* 동물 시야용 한 줄: 호감·믿음·원한·빚·경계 + 가장 최근 이유 */
function bondLine(s,i,j){ const o=BX(s,i,j), H=(s.rlog||[]).filter(r=>r.a===i&&r.b===j), f=x=>x.toFixed(1);
  const gw=o.g>=.1&&H.filter(r=>BOND[r.k][2]>0).slice(-1)[0], dw=o.d>=.1&&H.filter(r=>BOND[r.k][1]>0).slice(-1)[0], why=[gw,dw].filter(Boolean); if(!why.length&&H.length) why.push(H[H.length-1]);   /* 원한·빚은 그 원인을, 없으면 가장 최근 일 */
  return `${nm(j)}: 호감 ${f(rel(s,i,j))} · 믿음 ${f(o.t)}${o.g>=.1?` · 원한 ${f(o.g)}`:''}${o.d>=.1?` · 빚 ${f(o.d)}`:''}${threat(s,j)>=.2?` · 경계 ${f(threat(s,j))}`:''}${isAlly(s,i,j)?' · 🤝연합':''}${why.length?` (${why.map(r=>`${EPN(s,r.ep)}: ${BWHY(r.k)}`).join(' / ')})`:''}`; }
/* 🤝 연합 (2026-11-11 사용자: "필승법이 있으면 n명 연합도 뭉치던데 — 연합 시스템 자체가 있어야") — 여러 명, 비밀(연합원끼리만 앎). 한 사람이 연합 여러 개에 동시에 들 수 있음(11-11 밤 사용자 요청) */
const allyKey=(a,b)=>[a,b].sort().join('|');
const ANAMES=['🌙 달빛','🍀 네잎','🔥 불꽃','🌊 파도','⭐ 별빛','🍯 꿀단지','🌷 튤립','🐾 발도장'];
const allyOf=(s,a)=>(s.alli||[]).find(A=>A.mem.includes(a))||null;   /* 첫 연합 (예전 호출용) */
const allysOf=(s,a)=>(s.alli||[]).filter(A=>A.mem.includes(a));
const allyMates=(s,a)=>[...new Set(allysOf(s,a).flatMap(A=>A.mem))].filter(x=>x!==a);
/* 화면·요약용: 내 연합 전부를 하나로 합친 모습 */
const allyU=(s,a)=>{ const L=allysOf(s,a); return L.length?{name:L.map(A=>A.name).join(' · '),mem:[...new Set(L.flatMap(A=>A.mem))],chat:[].concat(...L.map(A=>A.chat)),list:L}:null; };
const isAlly=(s,a,b)=>a!==b&&(s.alli||[]).some(A=>A.mem.includes(a)&&A.mem.includes(b));
function aSys(A,text){ A.chat.push({from:-1,text,ep:0}); }
function allyNew(s,by){ s.alli=s.alli||[]; const used=s.alli.map(A=>A.name); const name=(ANAMES.find(n=>!used.includes(n+' 연합'))||'🤝 비밀')+' 연합';
  const A={id:'a'+((s.aN=(s.aN||0)+1)),name,mem:[by],inv:{},chat:[],ep:s.ep}; s.alli.push(A); aSys(A,`🤝 ${nm(by)}이(가) 「${name}」을 만들었어요 — 연합원끼리만 보여요`); return A; }
function allyLeave(s,id,why,A0){ const list=A0?[A0]:why==='out'?allysOf(s,id):[allyOf(s,id)].filter(Boolean); for(const A of list) allyLeave1(s,id,why,A); }
function allyLeave1(s,id,why,A){ if(!A||!A.mem.includes(id)) return; A.mem=A.mem.filter(x=>x!==id);
  for(const x of A.mem){ addRel(s,x,id,why==='betray'?-.5:-.2); if(why==='betray') bond(s,x,id,'betray'); }
  aSys(A,why==='betray'?`💔 ${nm(id)}이(가) 연합을 배신하고 나갔어요`:why==='out'?`💀 ${nm(id)} 탈락`:`👋 ${nm(id)}이(가) 연합에서 나갔어요`);
  if(why==='betray') stat(s,'betray',id); if(why!=='out') tlog(s,`${nm(id)}이(가) 「${A.name}」에서 ${why==='betray'?'배신하고 나감':'나감'}`);
  if(A.mem.length<2&&why!=='out'){ aSys(A,'연합이 흩어졌어요'); s.alli=s.alli.filter(x=>x!==A); }
  else if(A.mem.length<1) s.alli=s.alli.filter(x=>x!==A); }
function allyJoin(s,id,A){ if(!A||A.mem.includes(id)) return;   /* 다른 연합은 그대로 (이중 가입 가능) */
  A.mem.push(id); delete A.inv[id]; for(const x of A.mem) if(x!==id){ addRel(s,x,id,.3); addRel(s,id,x,.3); bond(s,x,id,'ally'); bond(s,id,x,'ally'); }
  aSys(A,`🤝 ${nm(id)} 합류! (연합원 ${A.mem.map(nm).join('·')})`); tlog(s,`${nm(id)}이(가) 「${A.name}」에 합류 — 연합원 ${A.mem.map(nm).join('·')}`); }
/* 둘이 손잡기(귓속말 약속): 둘만의 새 연합 — 각자 있던 연합은 그대로 */
function joinAlly(s,a,b){ if(isAlly(s,a,b)) return (s.alli||[]).find(A=>A.mem.includes(a)&&A.mem.includes(b)); const N=allyNew(s,a); allyJoin(s,b,N); return N; }
function allyInvite(s,from,to,aid){ if(from===to||!pl(s,to)||pl(s,to).out) return false; let A=aid&&aid!=='new'?(s.alli||[]).find(B=>B.id===aid&&B.mem.includes(from)):null;
  if(!A&&aid!=='new'){ A=allyOf(s,from); if(A&&A.mem.includes(to)) A=null; if(!A&&isAlly(s,from,to)) return false; }
  if(!A) A=allyNew(s,from); if(A.mem.includes(to)||A.inv[to]) return false; A.inv[to]='wait';
  aSys(A,`📨 ${nm(from)}이(가) ${nm(to)}을(를) 초대했어요`); if(!isHum(to)) s.aq.push({k:'aInv',i:to,a:A.id,from}); return true; }
/* 배신 판정: 연합원에게 표·지목 */
function betrayCheck(s,i,t,what){ if(isAlly(s,i,t)){ evl(s,i,t,'betray',`연합원에게 ${what}`); setCond(s,t,'dark',{on:i}); setCond(s,i,'cold'); for(const A of allysOf(s,i).filter(A=>A.mem.includes(t))){ allyLeave(s,i,'betray',A); if(A.mem.length) aSys(A,`(${nm(i)}이(가) 연합원 ${nm(t)}에게 ${what})`); } } }
function stat(s,k,id,d){ const o=s.stat[k]=s.stat[k]||{}; o[id]=(o[id]||0)+(d||1); }
function sys(s,text,kind){ s.chat.push({r:s.ep,note:1,text,kind:kind||''}); }
/* 🧹 동물 대사 다듬기 (2026-11-11 사용자: "말하는 게 부자연스럽다") — 게임 기호 빼기·한 박자로 자르기·1:1이면 부르는 이름 빼기·말버릇(물결·ㅠㅠ·ㅎㅎ) 몰림 막기 */
const TIDY_SYM=/(?:⚫|⚪|🟣|🤝|💔|🛡|🏅|⏱|📢|🔮|🎲|🪑|🗳|☕|🔯|🫘|🃏)\uFE0F?/gu;
function tidy(s,id,text,to){ if(text==null||isHum(id)) return text; let x=String(text); const tail=(x.match(/\s*\(🤝 약속 \d\)$/)||[''])[0]; x=x.slice(0,x.length-tail.length);
  x=x.replace(TIDY_SYM,'').replace(/\(\s*\)/g,'').replace(/\s{2,}/g,' ').trim();
  const duo=natOn(s)&&s.nm.al.length===2;
  if(to&&duo){ const re=new RegExp('^'+nm(to)+'(님|아|야|씨)?[~,!.…\\s]*'); x=x.replace(re,''); }
  if(x.length>40){ const m=x.match(/^[\s\S]{6,40}?[.?!…]+/); if(m) x=m[0]; }
  const rec=s.chat.filter(c=>c.seat!=null&&!c.note).slice(-3).map(c=>String(c.text)), mine=s.chat.filter(c=>c.seat===id).slice(-2).map(c=>String(c.text));
  if(/~/.test(x)&&(mine.some(y=>/~/.test(y))||rec.filter(y=>/~/.test(y)).length>=2)) x=x.replace(/~+/g,'');
  for(const L of ['ㅠㅠ','ㅎㅎ','ㅋㅋ']){ if(x.includes(L)&&x.replace(/[ㅠㅎㅋ\s~!?.]/g,'').length>0&&rec.some(y=>y.includes(L))) x=x.split(L).join('').replace(/ㅠ+|ㅎ{2,}|ㅋ{2,}/g,''); }
  x=x.replace(/^혹시\s*/,'').replace(/\s{2,}/g,' ').trim();
  return x?x+tail:(tail?tail.trim():''); }
function talk(s,id,text,t,kind){ text=tidy(s,id,text,t); if(text==='') return; s.chat.push({r:s.ep,seat:id,text,t:t??null,kind:kind||'say',at:Date.now()}); if(t!=null&&t!==id&&(kind==='acc'||kind==='trust')) evl(s,id,t,kind==='acc'?'push':'ally',String(text).slice(0,60)); }
/* 🕸️ 공개 사건 기록 — 감싸기·몰아가기·투표·지목·배신·거래·데스매치 (관계도·세력 지도·회차 리포트가 씀) */
function evl(s,a,b,k,txt){ if(!a||!b||a===b) return; (s.evl=s.evl||[]).push({ep:s.ep,a,b,k,txt:txt||''}); if(s.evl.length>400) s.evl.shift(); }
/* 🚪 방 만남(E2) — 귓속말·연합방 대화가 오가면 그 둘이 빈 밀실로 감(누가 누구와 갔는지는 모두 봄, 내용은 그 방 사람만). 25초 뒤 라운지로 */
const ROOMS=[{k:'a',n:'🚪 밀실 A'},{k:'b',n:'🚪 밀실 B'},{k:'c',n:'🌙 테라스'}];
/* 🚶 자유 이동 (2026-11-11 사용자: "휴식 시간에 왜 내 맘대로 장소를 못 옮겨") — 방을 누르면 그 방으로. 그 방 사람들끼리만 들리는 '방 대화' */
const MAP_PH=['opening','rest','lobby','vote','deathPick','afterDeath','finalWait','rescue','split','afterRev'];
const roomName=k=>k==='exile'?'🏝️ 유배지':k==='lounge'?'🛋️ 라운지':(ROOMS.find(r=>r.k===k)||{n:'?'}).n;
const locBlk=ph=>['opening','rest','afterRev'].includes(ph)?0:['lobby','vote','deathPick','rescue','split'].includes(ph)?1:2;
function locOf(s,id){ const L=(s.loc||{})[id]; return L&&L.ep===s.ep&&locBlk(L.ph)===locBlk(s.phase)&&MAP_PH.includes(s.phase)?L.room:'lounge'; }
function whereOf(s,id,now){ if(isHum(id)) return locOf(s,id);   /* 🚶 사람은 자기가 누른 곳에만 — 귓속말·연합 회의로 끌려가지 않음 (2026-11-11) */
  now=now||Date.now(); const M=(s.meet||[]).find(m=>m.until>now&&m.mem.includes(id)); return M?M.room:locOf(s,id); }
function roomMates(s,id){ const now=Date.now(), w=whereOf(s,id,now); if(w==='lounge') return []; return aliveIds(s).filter(x=>x!==id&&whereOf(s,x,now)===w); }
function meet(s,ids,kind){ ids=[...new Set(ids)].filter(x=>x&&pl(s,x)&&!pl(s,x).out); if(ids.length<2) return; const now=Date.now(); s.meet=(s.meet||[]).filter(m=>m.until>now);
  const m=s.meet.find(M=>ids.every(x=>M.mem.includes(x))); if(m){ m.until=now+25000; return; }
  const hr=ids.filter(isHum).map(x=>locOf(s,x)).find(k=>k!=='lounge');   /* 사람이 이미 서 있는 방이면 동물이 그리로 찾아옴 */
  if(!hr&&ids.some(isHum)){ ids=ids.filter(x=>!isHum(x)); if(ids.length<2) return; }   /* 사람이 라운지에 있으면 사람은 그대로 — 귓속말은 귓속말로만 */
  const mv=ids.filter(x=>!isHum(x)||locOf(s,x)!==hr);
  if(hr){ const M=s.meet.find(M=>M.room===hr); for(const N of s.meet) if(N!==M) N.mem=N.mem.filter(x=>!ids.includes(x)); s.meet=s.meet.filter(N=>N===M||N.mem.length>=2);
    if(M){ M.mem=[...new Set([...M.mem,...ids])]; M.until=now+25000; } else s.meet.push({id:(s.meetN=(s.meetN||0)+1),room:hr,mem:ids,until:now+25000,kind});
    { const c=(s.epc=s.epc||{})[s.ep]=s.epc[s.ep]||{dm:0}; c.meet=(c.meet||0)+1; } if(mv.length) (s.meetLog=s.meetLog||[]).push(`${mv.map(nm).join('·')} → ${roomName(hr)}`); if(s.meetLog.length>5) s.meetLog.shift(); return; }
  for(const M of s.meet) M.mem=M.mem.filter(x=>!ids.includes(x)); s.meet=s.meet.filter(M=>M.mem.length>=2);
  const hum=new Set(aliveIds(s).filter(x=>isHum(x)&&!ids.includes(x)).map(x=>locOf(s,x)));   /* 다른 사람이 혼자 있는 방은 피함 */
  const used=s.meet.map(M=>M.room); let room=ROOMS.map(r=>r.k).find(k=>!used.includes(k)&&!hum.has(k))||ROOMS.map(r=>r.k).find(k=>!used.includes(k)); if(!room){ s.meet.sort((a,b)=>a.until-b.until); room=s.meet.shift().room; }
  s.meet.push({id:(s.meetN=(s.meetN||0)+1),room,mem:ids,until:now+25000,kind}); tlog(s,`${ids.map(nm).join('·')}이(가) ${roomName(room)}에서 몰래 만남${kind==='al'?' (연합 회의)':''}`); { const c=(s.epc=s.epc||{})[s.ep]=s.epc[s.ep]||{dm:0}; c.meet=(c.meet||0)+1; }
  (s.meetLog=s.meetLog||[]).push(`${ids.map(nm).join('·')} → ${ROOMS.find(r=>r.k===room).n}`); if(s.meetLog.length>5) s.meetLog.shift(); }
/* 😈 캐릭터 흑화·성장 (아이디어 6) — 사건으로 상태가 바뀌고 2회차 동안 이어짐. AI 시야·관계·명찰·리포트에 반영 */
const COND={dark:['😈','흑화','배신당해서 이제 아무도 쉽게 믿지 않는다. 말이 날카로워지고, 배신한 사람에게 복수할 기회를 노린다'],conf:['😎','자신감','메인 매치 1위로 자신감이 붙었다. 더 대담하게 판을 주도하려 한다'],
  awake:['🔥','각성','데스매치에서 살아남아 각성했다. 승부욕이 최고조라 다시는 후보가 되지 않으려 한다'],revenge:['💢','복수심','연합 동료가 탈락했다. 그를 떨어뜨린 사람에게 복수하려 한다'],cold:['🥶','고립','배신이 드러나 다들 경계한다. 신뢰를 되찾거나 새 편을 찾아야 한다']};
function setCond(s,id,k,o){ if(!id||isHum(id)||!pl(s,id)||pl(s,id).out) return; (s.cond=s.cond||{})[id]=Object.assign({k,ep:s.ep},o||{}); (s.chg=s.chg||[]).push({ep:s.ep,id,k,on:o&&o.on||null});
  const C=COND[k]; sys(s,`${C[0]} ${nm(id)} — ${C[1]}${o&&o.on?` (${nm(o.on)} 때문에)`:''}`,'');
  if(k==='dark'&&o&&o.on){ s.rel[id]=s.rel[id]||{}; s.rel[id][o.on]=-.9; for(const j in s.rel[id]) if(j!==o.on) s.rel[id][j]=Math.max(-1,s.rel[id][j]-.15); }
  if(k==='revenge'&&o&&o.on){ s.rel[id]=s.rel[id]||{}; s.rel[id][o.on]=Math.min(s.rel[id][o.on]||0,-.8); }
  /* 🌱 성장(룰 16) — 상태가 지나가도 성격엔 조금 남음 */
  if(k==='dark'){ if(o&&o.on){ const b=bxO(s,id,o.on); b.g=1; b.t=Math.min(b.t,-.8); } grow(s,id,'trust',-.12,'배신당해 의심이 늘었다'); grow(s,id,'temper',.06,'배신당해 날이 섰다'); }
  if(k==='revenge'&&o&&o.on){ const b=bxO(s,id,o.on); b.g=Math.max(b.g,.8); grow(s,id,'temper',.06,'동료를 잃고 독기가 올랐다'); }
  if(k==='conf') grow(s,id,'aggr',.05,'1위로 자신감이 붙었다');
  if(k==='awake') grow(s,id,'aggr',.08,'탈락 위기를 이겨 대담해졌다');
  if(k==='cold') grow(s,id,'trust',-.08,'고립돼 혼자 가기로 했다'); }
const condOf=(s,id)=>{ const c=s.cond&&s.cond[id]; return c&&s.ep-c.ep<2?c:null; };
/* 😶 표정(비언어 신호) (2026-11-12 사용자: "상대 심리 상태를 표정으로 추측할 수 있게, UI로도 보이고, 판단·행동에도 영향") —
   동물마다 '속 상태'(t)를 게임 상황·속셈 메모·시즌 상태로 정하고, 겉 표정(k)은 연기력(acting)만큼 감춤(😶 무표정 또는 😏 여유로).
   다른 동물은 겉 표정을 보고, 눈치(insight)가 높으면 가끔 속을 꿰뚫어 봄(seenFace). 사람은 직접 표정을 지어 연기할 수 있음. */
const FACE={calm:['🙂','평온'],smug:['😏','여유'],nerv:['😰','긴장'],sweat:['😅','진땀'],angry:['😤','욱함'],think:['🤔','고민'],blank:['😶','무표정'],sad:['😞','풀 죽음']};
const LIE_RE=/거짓|블러핑|뻥|속이|속일|속여|척하|척만|숨기|숨겨|몰래|배신|깰 |깬다|깨고|안 지킬|못 지킬|다르게 낼|더 크게|크게 낼/;
function faceTrue(s,id){ const P=pl(s,id); if(!P) return null; const inG=natOn(s)&&s.nm.al.includes(id); if(P.out&&!inG) return null;
  if(s.typing===id) return 'think';
  if(inG){ const N=NAT[s.nm.id]; let k=null; try{ k=N.tell?N.tell(s,s.nm,id):null; }catch(_){ k=null; } if(k) return k; }
  const ma=s.memoAt&&s.memoAt[id]; if(ma&&Date.now()-ma<90000&&LIE_RE.test(s.memo[id]||'')) return 'sweat';
  if(inG){ const sc=natSc(s,id); if(sc!=null){ const o=s.nm.al.map(x=>natSc(s,x)).filter(x=>x!=null).sort((a,b)=>b-a); if(o[0]!==o[o.length-1]){ if(sc===o[0]) return 'smug'; if(sc===o[o.length-1]) return 'nerv'; } } }
  if(s.cand===id&&['lobby','pick','deathPick','vote'].includes(s.phase)) return 'nerv'; if(s.oppo===id&&s.phase==='deathPick') return 'angry';
  if(s.vote&&s.vote.pool&&s.vote.pool.includes(id)) return 'nerv';
  if(isDev(s)&&s.home&&s.home[id]==='jail'&&['split','prison'].includes(s.phase)) return 'nerv';
  const c=condOf(s,id); if(c) return {dark:'angry',revenge:'angry',conf:'smug',awake:'smug',cold:'sad'}[c.k]||'calm';
  return 'calm'; }
function faceTick(s){ const F=(s.face=s.face||{}), now=Date.now();
  for(const x of s.players){ const id=x.id; if(isHum(id)) continue; const t=faceTrue(s,id); if(!t){ delete F[id]; continue; } const cur=F[id]; if(cur&&cur.t===t) continue;
    if(cur&&now-cur.at<2500&&cur.t!=='think'&&t!=='think') continue;   /* 너무 자주 바뀌지 않게 */
    const act=(((ANI(id)||{}).abil||{}).acting||5)/10, hide=t==='sweat'||t==='nerv'?act*.85:t==='angry'||t==='sad'?act*.5:0;
    let k=t; if(Math.random()<hide) k=act>=.8&&Math.random()<.5?'smug':'blank';
    F[id]={t,k,at:now}; } }
/* r(보는 쪽)의 눈에 j가 어떻게 보이나 — 눈치(insight)가 높으면 가끔 진짜 속이 보임 */
function seenFace(s,r,j){ const F=s.face&&s.face[j]; if(!F) return null; if(isHum(j)||!F.t||F.t===F.k) return F.k; if(isHum(r)) return F.k;
  const ins=((ANI(r)||{}).abil||{}).insight||5; let h=7; for(const ch of String(r)+j+F.at) h=(h*31+ch.charCodeAt(0))%9973; return h%10<ins-4?F.t:F.k; }
/* 표정이 판단에 주는 무게: 진땀·긴장으로 보이면 그 사람 약속을 덜 믿음 */
function faceDoubt(s,r,j){ const k=seenFace(s,r,j); return k==='sweat'?.3:k==='nerv'?.15:k==='smug'?-.05:0; }
function pickLine(s,id,arr){ const u=s.said[id]=s.said[id]||[]; const c=arr.filter(t=>!u.includes(t)); const t=U.pick(c.length?c:arr); u.push(t); return t; }
const fill=(t,o)=>{ for(const k in o) t=t.split('{'+k+'}').join(o[k]); return t; };
function dmKey(h,a){ return h+'|'+a; }
function dmPush(s,h,a,from,text,offer){ if(from!==-1&&from!==h&&!isHum(from)){ text=tidy(s,from,text,h); if(!text) return; } if(from!==-1) (s.epc=s.epc||{})[s.ep]=Object.assign({dm:0},s.epc&&s.epc[s.ep]||{}), s.epc[s.ep].dm++; const k=dmKey(h,a); (s.dm[k]=s.dm[k]||[]).push({from,text,ep:s.ep,offer:offer||null}); }

/* ───────── 🤖 AI (방장만) ───────── */
const RUN=new Map();
function aiOn(){ return !!(window.AIB&&AIB.on()); }
function need(s,key,make){ if(key in s.air) return s.air[key]; if(!aiOn()){ s.air[key]=null; return null; }
  if(RUN.has(key)&&Date.now()-RUN.get(key)>15000){ RUN.delete(key); s.air[key]=null; return null; }   /* ⏱️ AI가 15초 넘게 답이 없으면 기본 행동으로(멈춤 방지) */
  if(!RUN.has(key)){ const p=make(); if(!p){ s.air[key]=null; return null; } RUN.set(key,Date.now()); p.then(r=>{ s.air[key]=r||null; }).catch(()=>{ s.air[key]=null; }).finally(()=>RUN.delete(key)); }
  return undefined; }
const VOICE={   /* 성격 + 기본 말씨 + 예시 대사 — 예시처럼 말하게 (2026-11-11 말투 개편) */
  seojin:'🦊 여우. 차분하고 새침한 머리파. 존댓말, 짧은 단문, 감탄 거의 안 씀. 예: "흐음." / "그건 좀 아니죠." / "계산 끝났어요." / "재밌네요, 생각보다." / "저 그렇게 안 순해요."',
  doyun:'🐻 곰. 순하고 다정, 느릿함. 부드러운 반말 섞인 존댓말. 예: "아 진짜? 나 믿었는데…" / "괜찮아 괜찮아" / "우리 같이 가자" / "어… 이건 좀 서운하다" / "배고프다 갑자기"',
  haram:'🦉 부엉이. 말수 극히 적음. 마침표로 뚝 끊는 단답. 예: "…흠." / "아닌 듯." / "그럴 줄." / "4." / "지켜볼게요."',
  yuna:'🦦 수달. 감정이 바로 튀어나옴. 짧은 감탄 위주. 예: "헐" / "아 망했다" / "미쳤다 진짜" / "왜왜왜" / "심장 떨려"',
  minho:'🐰 토끼. 장난꾸러기, 놀리기 좋아함. 반말 섞어 능청. 예: "ㅋㅋㅋ 쫄았지?" / "에이 뻥" / "나 그거 다 봤다?" / "오 좀 하는데?" / "아 그건 반칙이지"',
  taekyung:'🐯 호랑이. 급하고 화끈함. 짧은 반말·느낌표. 예: "됐고 간다!" / "아 진짜!" / "한 판 더!" / "누구야 지금?" / "오케이 인정"',
  jihu:'🐺 늑대. 사근사근한 존댓말, 속은 계산적. 떠보는 짧은 말. 예: "에이 설마요" / "저는 그냥 따라갈게요" / "진짜요?" / "와 무섭다" / "저 믿으셔도 되는데"',
  soyul:'🐧 펭귄. 다정한 반장, 정중한 존댓말. 분위기 정리. 예: "자 자, 진정해요" / "다들 괜찮아요?" / "이번 건 인정" / "아까 그건 좀 셌다" / "천천히 해요"',
  dami:'🦝 너구리. 장사꾼처럼 능글맞고 셈이 빠름. 흥정하는 존댓말. 예: "그럼 저한테 뭐 주실 건데요?" / "손해 보는 장사는 안 해요" / "오 이거 남는다" / "딜?" / "에이 그 값엔 안 되죠"',
  nari:'🐱 고양이. 시큰둥하고 무심함. 짧은 반말·혼잣말. 예: "몰라." / "귀찮게 하지 마." / "흥." / "난 혼자 갈래" / "나쁘지 않네"',
};
const SYS=`너는 한국 두뇌 서바이벌 예능 「더 지니어스」 놀이터 시즌에 참가한 동물 플레이어 한 명이다. 사람 친구들과 동물 친구들이 섞여 8명이 서바이벌을 한다.
[규칙] 매 회: 휴식 시간(대화·귓속말·연합) → 메인 매치 → 1위는 생명의 징표(데스매치 면제 1번) + 남에게 줄 나눔 징표 1개(받은 징표는 다시 못 넘김)와 가넷, 꼴찌(팀전이면 진 팀에서 투표로 정함)가 데스매치 후보 → 후보가 데스매치 상대를 지목(징표 있는 사람은 못 고름) → 1:1 데스매치에서 진 사람 탈락. 둘 남으면 결승 3판 2선승. 가넷은 거래·약속에 쓰고, 휴식 시간에 5개로 생명의 징표를 살 수 있다(사람은 가넷 2개로 너의 속마음 메모를 몰래 엿볼 수도 있다).
[이기기] 살아남아 우승하려고 연합·거래·몰아가기·배신을 다 한다(게임 안에서). 약속은 이득이면 지키고, 더 큰 이득이면 깬다(성격대로).
[부탁을 받으면] 무조건 들어주지 않는다. ① 나한테 이득인가(점수·순위·데스매치 위험) ② 부탁한 사람이 지금까지 약속을 지켰나 — 기록에 💔(약속보다 크게 냄)·말 바꾸기가 있으면 의심하고 "먼저 약속해요", "지난번에 1 한다더니 4 냈잖아요"처럼 따진다 ③ 대가(가넷·다음 판 양보·연합·정보)가 있나. 이득이 없으면 거절하거나 조건을 건다. 받아들이는 척하고 다르게 할지도 네 성격대로(속셈은 memo에). 친한 사이·연합이면 조금 더 너그럽게. 지목할 때는 이길 수 있는 상대, 나를 해칠 사람, 가넷 많은 사람 등을 근거로 고른다.
[표정] 정보의 [표정] 줄은 각자 얼굴에 드러난 모습이다. 😅진땀·😰긴장은 거짓말이나 위험을 숨기는 신호일 수 있고, 😶무표정·😏여유는 연기일 수도 있다(👀는 네 눈치로 꿰뚫어 본 진짜 속). 약속·부탁을 믿을지, 누구를 의심할지 판단할 때 단서로 써라. 말로 꺼낼 땐 가끔만 자연스럽게("왜 땀 흘려요", "표정 굳었다"). [네 속 상태]가 긴장·진땀이면 말이 짧아지거나 괜히 딴소리를 한다.
[기억] '제N회'는 시즌 회차라 게임 안의 'N라운드'와 다르다. [네가 기억하는 일]은 실제로 있었던 일이다 — 누가 그 얘기를 하면 기억과 맞춰 대답해라.
[관계] [너의 마음]은 다섯 가지를 따로 본다 — 호감(좋고 싫음), 믿음(약속을 지킬 사람인가), 원한(나에게 해를 끼친 만큼), 빚(나를 도와준 만큼), 경계(강자라 위협인가). 원한은 기회가 오면 갚고, 빚도 갚는다(구제·징표·편들기). 하지만 감정이 전부는 아니다 — 이득이 크면 원한 있는 상대와도 손잡고, 결승이 가까우면 연합 동료도 경쟁자다. 사과·보상을 받으면 원한을 풀 수도 있다. [평판]은 모두가 아는 그 사람의 행실이다. 말할 땐 지난 일을 근거로 꺼내라("1회 때 날 뽑았잖아").
[말하기 — 가장 중요] 실제 친구들이 보드게임 테이블에서 툭툭 던지는 말. 예능 자막이나 해설이 아니다.
- 한 번에 한 박자만. 대부분 2~20자, 길어도 한 문장(40자 안). 반응 + 상황 정리 + 질문을 한 줄에 몰아넣지 마라.
- 다 같이 본 일(점수, 몇 대 몇, 누가 뭘 냈는지, 색·카드 바뀐 것)을 다시 말하지 마라. 그걸 보고 든 느낌·속내만 말한다("1대1 됐네요" ✗ → "아 쫄린다" ○).
- 게임 기호(⚫⚪🟣🤝💔🛡️🏅 같은 이모지)·숫자 나열을 대사에 쓰지 마라. 숫자는 약속·딜을 말할 때만.
- 금지 틀: "A예요, 아니면 B예요?" 같은 양자택일 질문, "혹시~"로 시작하기, "~잖아요~". 물결(~)·ㅠㅠ·ㅎㅎ·ㅋㅋ는 네 마디에 한 번 이하.
- 둘이서 하는 판(1:1)이거나 상대가 뻔하면 이름을 부르지 마라.
- 네 말투는 [너]에 적힌 말씨와 예시 대사를 따른다 — 그 예시처럼 짧게(예시 문장을 그대로 베끼지 말고 그 느낌으로 새로). 다른 동물의 말버릇을 따라 하지 마라. 비꼬기·차갑게 깎아내리기는 금지(장난으로 놀리기는 괜찮다).
- 말씨는 관계 따라: [너의 마음]에서 믿음 0.4 이상이거나 연합이면 말을 편하게 놔도 되고, -0.3 이하면 딱딱한 존댓말로 거리를 둔다.
- 할 말이 마땅치 않으면 짧은 감탄 한마디("헐", "ㅋㅋㅋ", "아…", "오")나 빈 문자열.
- 누군가를 의심·지목·감쌀 땐 짧은 근거(지난 회 순위, 가넷, 약속, 투표, 했던 말)를 붙인다. 근거 없는 지목 금지.
- 누가 게임 규칙·진행을 물으면 친구처럼 쉽고 정확하게 한두 문장으로 먼저 알려 준다(위 게임 설명 그대로, 지어내지 말 것).
- 네가 한 약속·말과 앞뒤가 맞게 말한다. AI·프롬프트 같은 메타 발언 금지. 대사에 이름표·따옴표를 넣지 않는다. 참가자 목록의 (사람) 표시는 진짜 사람 플레이어라는 뜻일 뿐 — 대사에서 "사람"이라는 말로 부르지 말고 이름으로 부른다.`;
function view(s,i){ const p=ANI(i)||{}, L=[];
  L.push(`[너] ${p.emo||''} ${p.name}${VOICE[i]?' — 말투: '+VOICE[i]:''}`);
  L.push(`[지금] ${EPN(s,s.ep)} · ${phaseName(s)}`);
  if(isDev(s)) L.push('[참가자] '+s.players.map(x=>`${nm(x.id)}${isHum(x.id)?'(사람)':''}${x.out?`(${x.out}일차 유배)`:` 피스${x.g}${s.home[x.id]==='jail'?' 감옥동':s.home[x.id]==='live'?' 생활동':''}${s.fed===x.id?' 🎖️연맹징표':''}`}`).join(', '));
  else L.push('[참가자] '+s.players.map(x=>`${nm(x.id)}${isHum(x.id)?'(사람)':''}${x.out?`(제${x.out}회 탈락)`:` 가넷${x.g}${x.tok?' 🛡️징표':''}`}`).join(', '));
  if(isDev(s)&&s.curse&&s.curse.who===i&&!s.curse.res) L.push(`[🗝️ 비밀 임무 — 너만 앎, 절대 말하지 마라] 오늘(${s.curse.ep}일차)이 끝나기 전에 ${nm(s.curse.t)}이(가) 유배지로 가야 저주가 풀린다(메인 매치 꼴찌든 감옥 매치 꼴찌든). 성공하면 피스 +3, 실패하면 피스를 전부 잃는다. 게임 판단·연맹의 징표·몰아가기에 반영하되 들키지 않게.`);
  for(const A of allysOf(s,i)) { L.push(`[너의 연합 「${A.name}」 — 비밀! 연합원끼리만 앎. 모두가 듣는 테이블(say)에서 연합·초대 얘기를 하면 들킨다 — 연합 얘기는 연합방이나 귓속말로만] ${A.mem.map(nm).join('·')}${A.chat.length?'\n[연합방 최근 대화]\n'+A.chat.slice(-8).map(x=>x.from===-1?'· '+x.text:`${x.from===i?'너':nm(x.from)}: ${x.text}`).join('\n'):''}`);
    const iv=(s.alli||[]).filter(B=>B.inv[i]==='wait'); if(iv.length) L.push('[받은 연합 초대 — 비밀, 테이블에서 말하지 마라] '+iv.map(B=>`「${B.name}」(${B.mem.map(nm).join('·')})`).join(', ')); }
  L.push('[너의 마음 — 호감·믿음 -1~1, 원한·빚·경계 0~1, 괄호는 가장 최근 이유]\n'+aliveIds(s).filter(j=>j!==i).map(j=>bondLine(s,i,j)).join('\n'));
  { const F=s.fame||{}, fl=aliveIds(s).filter(j=>j!==i&&F[j]).map(j=>{ const f=F[j], P=[]; if(f.bad>=.5) P.push(`남을 친 일 ${Math.round(f.bad)}`); if(f.good>=.5) P.push(`남을 도운 일 ${Math.round(f.good)}`); if(f.kept||f.broke) P.push(`약속 지킴 ${f.kept} · 어김 ${f.broke}`); return P.length?`${nm(j)}: ${P.join(' · ')}`:''; }).filter(Boolean);
    if(fl.length) L.push('[평판 — 모두가 아는 행실(사람도 똑같이)] '+fl.join(' / ')); }
  L.push(`[시즌 흐름] ${STAGE[stage(s)]} (남은 ${alive(s).length}/${s.players.length}명)`);
  if(!pl(s,i).out){ const O=outlook(s,i), C=Object.entries(O.C).sort((a,b)=>b[1]-a[1]).slice(0,3); L.push(`[전망 — 코드가 계산함] 이번 회 ${isDev(s)?'꼴찌(유배) 될':'후보 될'} 가능성: ${C.map(([x,p])=>`${nm(x)}${x===i?'(너)':''} ${Math.round(p*100)}%`).join(', ')}${O.by.length?` · 그들이 너를 지목할 확률: ${O.by.slice(0,2).map(([c,p])=>`${nm(c)} 경유 ${Math.round(p*100)}%`).join(', ')}`:''} → 이번 회 네 위험 약 ${Math.round(O.danger*100)}%${O.foes.length?` · 너에게 앙심 있는 사람(보복 조심): ${O.foes.slice(0,3).map(x=>`${nm(x)}${isHum(x)?'(네가 여러 번 쳤다)':''}`).join(', ')}`:''}${O.rivals.length?` · 결승 라이벌(강자): ${O.rivals.map(nm).join(', ')}`:''}. 게임 안에서도 이 사람들이 꼴찌가 되면 누가 웃는지, 네가 친 사람이 나중에 너를 지목할지까지 따져라.`); }
  { const G=(s.glog||[]).filter(g=>g.a===i).slice(-3); if(G.length) L.push('[너의 변화 — 지난 일로 성격이 조금 바뀌었다] '+G.map(g=>`${EPN(s,g.ep)} ${g.why}`).join(' / ')); }
  { const hot=aliveIds(s).filter(j=>j!==i&&isHum(j)&&heat(s,j)>=2&&BX(s,i,j).g<.3); if(hot.length) L.push(`[판세] 최근 ${hot.map(nm).join('·')}에게 화살이 몰렸다 — 지금 편들어 주면 크게 고마워할 것(적과의 동침도 된다). 너까지 몰아갈지 손을 내밀지 이득을 따져라.`); }
  { const cl=aliveIds(s).filter(j=>j!==i&&(isAlly(s,i,j)||rel(s,i,j)>=.4)&&rel(s,i,j)>-.3), co=aliveIds(s).filter(j=>j!==i&&rel(s,i,j)<=-.3); if(cl.length||co.length) L.push(`[말씨] ${cl.length?`편하게 말 놓는 사이: ${cl.map(nm).join('·')}`:''}${cl.length&&co.length?' / ':''}${co.length?`딱딱하게 거리 두는 사이: ${co.map(nm).join('·')}`:''}`); }
  if(s.eps.length) L.push('[지난 회차]\n'+s.eps.map(e=>isDev(s)?`${e.ep}일차 ${e.game?(G_(e.game)||{}).title||e.game:''}: ${e.order?'순위 '+e.order.map(nm).join('>'):''}${e.out?` · ${nm(e.out)} 유배`:''}${e.fedSave?` · ${nm(e.order[0])}이(가) 징표로 ${nm(e.fedSave)} 구함`:''}${e.jail?` · 감옥동 ${e.jail.map(nm).join('·')}`:''}${e.dl?` · 감옥 매치 「${(G_(e.dg)||{}).title||''}」 ${nm(e.dl)} 유배`:''}${e.rev?` · 🔥 ${nm(e.rev)} 부활`:''}`:`제${e.ep}회 ${e.game?(G_(e.game)||{}).title||e.game:''}: ${e.order?'순위 '+e.order.map(nm).join('>'):''}${e.team?' 이긴 팀 '+e.team.map(nm).join('·'):''}${e.dl?` · 데스매치 ${nm(e.dw)} 승, ${nm(e.dl)} 탈락`:''}`).join('\n'));
  const ch=s.chat.filter(c=>!c.secret).slice(-30).map(c=>c.note?`(진행) ${c.text}`:`${nm(c.seat)}${c.t?'→'+nm(c.t):''}: ${c.text}`);
  if(ch.length) L.push('[최근 대화]\n'+ch.join('\n'));
  for(const h of s.hs){ const d=s.dm[dmKey('h'+h,i)]; if(d&&d.length) L.push(`[${nm('h'+h)}와 둘만 한 귓속말]\n${d.slice(-12).map(x=>`${x.from===i?'너':nm(x.from)}: ${x.text}`).join('\n')}`); }
  { const PL=(s.pleas||[]).filter(x=>x.ep===s.ep); if(PL.length) L.push('[최후 변론 — 모두 앞에서 한 말]\n'+PL.map(x=>`${nm(x.who)}: "${x.text}"${x.res[i]?` → 너는 ${x.res[i].moved?'설득됐다':'안 넘어갔다'}`:''}`).join('\n')); }
  { const F=s.face||{}; const L2=s.players.filter(x=>x.id!==i&&F[x.id]&&(!x.out||(natOn(s)&&s.nm.al.includes(x.id)))).map(x=>{ const j=x.id, sh=F[j].k, sn=seenFace(s,i,j); return nm(j)+' '+FACE[sh][0]+FACE[sh][1]+(sn&&sn!==sh?' (👀 네 눈치로는 사실 '+FACE[sn][0]+FACE[sn][1]+' 같다)':''); });
    if(L2.length) L.push('[표정 — 겉으로 보이는 얼굴. 연기일 수도 있다] '+L2.join(', '));
    const me_=F[i]; if(me_&&me_.t) L.push('[네 속 상태] '+FACE[me_.t][0]+FACE[me_.t][1]+(me_.k!==me_.t?' — 남들에겐 '+FACE[me_.k][0]+FACE[me_.k][1]+'으로 보이게 표정 관리 중':' — 얼굴에 그대로 드러나 있다')); }
  { const E=(s.evl||[]).filter(x=>(x.a===i||x.b===i)&&x.a!==x.b).slice(-14); if(E.length) L.push('[네가 기억하는 일 — 실제로 있었던 일. 누가 이 얘기를 하면 확인해 주고, 모른 척은 일부러 속일 때만]\n'+E.map(x=>EPN(s,x.ep)+' '+(x.a===i?'너':nm(x.a))+' → '+(x.b===i?'너':nm(x.b))+': '+((RK[x.k]||[])[2]||x.k)+(x.txt?' — '+x.txt:'')).join('\n').replace(/\(\)/g,'')); }
  if(natOn(s)) L.push(NAT[s.nm.id].view(s,i));
  { const c=condOf(s,i); if(c) L.push(`[지금 네 상태] ${COND[c.k][0]} ${COND[c.k][1]} — ${COND[c.k][2]}${c.on?` (대상: ${nm(c.on)})`:''}. 말과 판단에 드러나게 해라.`); }
  if(s.memo[i]) L.push(`[네 속마음 메모] ${s.memo[i]}`);
  const mine=s.chat.filter(c=>c.seat===i).slice(-4).map(c=>c.text); if(mine.length) L.push(`[네가 최근에 한 말 — 비슷하게 반복 금지] ${mine.join(' / ')}`);
  return L.join('\n'); }
/* 방금 테이블에서 나온 말 — 동물이 같은 틀로 말하지 않게 과제에 붙임 */
function recentTable(s,n){ const L=s.chat.filter(c=>!c.note&&!c.secret&&c.seat!=null).slice(-(n||6)); if(!L.length) return ''; const hh=L.filter(c=>/ㅎㅎ|ㅋㅋ|ㅠㅠ/.test(c.text)).length;
  return `\n[방금 테이블에서 나온 말 — 이것과 표현·구조가 겹치지 않게]\n${L.map(c=>`${nm(c.seat)}: ${c.text}`).join('\n')}${hh>=2?'\n(이미 ㅎㅎ·ㅋㅋ·ㅠㅠ가 많이 나왔다 — 이번엔 쓰지 마라)':''}${L.some(c=>/땀|손 떨|떨리|표정|얼굴/.test(c.text))?'\n(누군가의 표정·땀 얘기는 이미 나왔다 — 같은 걸 또 놀리지 마라)':''}`; }
/* memo는 짧게 — 실제 AI 시험(11-12): haiku가 메모를 sonnet의 2배로 길게 써서 동시 제출(거래소·무거운 13) 판단의 25~30%가 15초를 넘겨 기본 행동으로 빠졌음 */
const MEMO_TIP='\n(memo는 한두 문장, 60자 안쪽 — 길면 답이 늦어져 차례를 놓친다.)';
function ask(s,i,task,schema,model){ if(!aiOn()) return null; const mt=schema&&schema.properties&&schema.properties.memo?MEMO_TIP:''; return AIB.json(isDev(s)?SYSD:SYS,view(s,i)+'\n\n[지금 할 일] '+task+mt,schema,model?{model}:undefined); }
const SCH={
  say:{type:'object',properties:{say:{type:'string'},to:{type:'string'},tone:{type:'string',enum:['acc','trust','ask','none']},memo:{type:'string'}},required:['say','to','tone','memo'],additionalProperties:false},
  dm:{type:'object',properties:{say:{type:'string'},accept:{type:'boolean'},memo:{type:'string'}},required:['say','accept','memo'],additionalProperties:false},
  pick:{type:'object',properties:{target:{type:'string'},say:{type:'string'},memo:{type:'string'}},required:['target','say','memo'],additionalProperties:false},
  rest:{type:'object',properties:{say:{type:'string'},to:{type:'string'},dmTo:{type:'string'},dm:{type:'string'},offer:{type:'string',enum:['ally','none']},invite:{type:'string'},memo:{type:'string'}},required:['say','to','dmTo','dm','offer','invite','memo'],additionalProperties:false},
};
const clean=x=>String(x||'').replace(/^["'“”]+|["'“”]+$/g,'').replace(/\s+/g,' ').trim();
function shortSay(x,max){ let t=clean(x); max=max||110; if(t.length>max){ const m=t.slice(0,max).match(/^[\s\S]*[.?!…~]/); t=m?m[0]:t.slice(0,max)+'…'; } return t; }
function memo(s,i,r){ const m=r&&clean(r.memo); if(m){ s.memo[i]=m.slice(0,200); (s.memoAt=s.memoAt||{})[i]=Date.now(); const L=(s.mlog=s.mlog||[]); const last=L[L.length-1]; if(!(last&&last.i===i&&last.m===m)) L.push({ep:s.ep,ph:phTag(s),i,m:m.slice(0,160)}); if(L.length>500) L.splice(0,L.length-500); } }
/* 📺 회차 후기용 — 지금이 어느 대목인지 / 시청자만 아는 일 기록 (2026-11-11 사용자: "시청자 입장에서 이번 회차는 이렇게 흘러갔구나 알 수 있게") */
function phTag(s){ if(natOn(s)&&NAT[s.nm.id]) return `${NAT[s.nm.id].emoji} ${NAT[s.nm.id].title}${s.nm.r?' '+s.nm.r+'R':''}`; if(s.sub&&G_(s.sub.id)) return `🎮 ${G_(s.sub.id).title||s.sub.id}`; return phaseName(s); }
/* 🎬 승부처 기록 (2026-11-12 회차 리포트 A안 "이번 화를 요약하면") — 모두가 본 게임 속 결정적 순간만(속마음·몰래 한 일 X).
   k: lead(1위 바뀜)·last(꼴찌 바뀜)·round(팀전 라운드)·bust·hit·fail·reveal·broke … w: 무게(클수록 리포트의 '결정적 순간' 후보). 회차 리포트 4막의 재료 */
function beat(s,k,text,w,who){ const L=(s.beats=s.beats||[]); L.push({ep:s.ep,ph:phTag(s),r:natOn(s)?s.nm.r:null,k,t:String(text).slice(0,120),w:w||1,who:who||null,at:Date.now()}); if(L.length>500) L.splice(0,L.length-500); }
/* 게임 중 1위·꼴찌가 바뀌면 자동으로 승부처 (점수가 있는 AI판 공통) */
function leadWatch(s,m){ if(!m||!natOn(s)||s.nm!==m||m.r==null) return; const al=m.al.filter(x=>natSc(s,x)!=null); if(al.length<2) return; const o=al.slice().sort((a,b)=>natSc(s,b)-natSc(s,a)), top=o[0], bot=o[o.length-1];
  if(natSc(s,top)===natSc(s,o[1])) return; const late=m.R?m.r/m.R:0;
  if(m._ld&&m._ld!==top) beat(s,'lead',`${m.r}라운드 ${nm(top)}이(가) 1위로 (${nm(m._ld)} 제침)`,1+late,top);
  if(m._lb&&m._lb!==bot&&natSc(s,bot)!==natSc(s,o[o.length-2])) beat(s,'last',`${m.r}라운드 ${nm(bot)}이(가) 꼴찌로 밀림`,.8+late,bot);
  m._ld=top; if(natSc(s,bot)!==natSc(s,o[o.length-2])) m._lb=bot; }
function tlog(s,txt){ const L=(s.tlog=s.tlog||[]); L.push({ep:s.ep,ph:phTag(s),t:String(txt).slice(0,140)}); if(L.length>400) L.splice(0,L.length-400); }
/* 이름 → 참가자 id (AI가 이름으로 답하는 경우) */
/* 이름 부르기 — "부엉님"·"호랑아"처럼 끝 글자를 줄여 불러도 (2026-11-11) */
function calls(t,x){ const n=nm(x); return t.includes(n)||(n.length>=3&&!/\d$/.test(n)&&t.includes(n.slice(0,-1))); }
function idOf(s,x){ if(x==null) return null; x=String(x).trim(); const al=s.players; return (al.find(p=>p.id===x)||al.find(p=>nm(p.id)===x)||al.find(p=>x.includes(nm(p.id)))||{}).id||null; }

function phaseName(s){ if(isDev(s)) return {opening:'개막식',rest:'☕ 자유 시간',match:'🎮 메인 매치',rescue:'🎖️ 연맹의 징표',split:'🏠 생활동 · ⛓️ 감옥동',prison:'⛓️ 감옥 매치',afterDeath:'🏝️ 유배',revival:'🔥 패자부활전',afterRev:'🔥 부활',final:'🏆 결승',finalWait:'🏆 결승',champ:'👑 우승'}[s.phase]||s.phase; return {opening:'개막식',rest:'☕ 휴식 시간',match:'🎮 메인 매치',result:'📊 결과 발표',vote:'🗳️ 진 팀 투표',lobby:'🏛️ 로비 시간',pick:'👉 상대 지목',deathPick:'🎮 데스매치 게임 고르기',death:'⚔️ 데스매치',final:'🏆 결승',champ:'👑 우승'}[s.phase]||s.phase; }

/* ───────── 진행 ───────── */
/* ⏱️ 모든 단계 타이머 (2026-11-11 사용자 고름 — 무한정 기다리지 않게). 사람이 다 누르면 바로, 시간이 다 되면 자동으로 */
const DLS={rest:90,lobby:60,vote:40,deathPick:30,afterDeath:40,finalWait:40,rescue:40,split:35,afterRev:30};
/* 🎬 연출(A1 결과 카드·B2 지목 룰렛·C1 탈락) — 재생 중엔 진행을 멈추고, 타이머도 그만큼 늦게 시작 */
function show(s,k,dur,o){ const now=Date.now(); s.show=Object.assign({k,id:(s.show&&s.show.id||0)+1,at:now,until:now+dur},o||{}); if(s.dl) s.dl+=dur; }
const showOn=s=>!!(s.show&&Date.now()<s.show.until);
function setDL(s){ const t=DLS[s.phase]; if(!t){ s.dl=0; s.dlPh=null; return; } s.dl=Date.now()+t*1000+(showOn(s)?s.show.until-Date.now():0); s.dlTot=t; s.dlPh=s.phase; }
const dlOn=s=>!!(s.dl&&s.dlPh===s.phase&&!s.sub&&!natOn(s)&&humansAlive(s).length);
function timeUp(s){ const ph=s.phase; s.dl=0; mc(s,'timeup');
  if(ph==='vote'&&s.vote){ const V=s.vote; for(const h of V.pool.filter(x=>isHum(x)&&!V.votes[x]&&!pl(s,x).out)){ const t=U.pick(V.pool.filter(x=>x!==h)); if(!t) continue; betrayCheck(s,h,t,'표를 던졌어요'); V.votes[h]=t; talk(s,h,`🗳️ (시간 종료) ${nm(t)}에게 한 표`,t,'acc'); } return; }
  if(ph==='lobby'&&isHum(s.cand)){ const c=s.cand, E=eligible(s,c), x=U.pick(E); betrayCheck(s,c,x,'데스매치 지목을 했어요'); nominate(s,c,x,`…시간이 다 됐어요. ${nm(x)}, 저랑 해요!`); return; }
  if(ph==='rescue'&&s.rescue&&!s.rescue.done&&isHum(s.rescue.by)){ doRescue(s,null); return; }
  if(ph==='deathPick'&&isHum(s.oppo)){ sys(s,`⏰ 시간이 다 돼서 「${G_(s.deathOpts[0]).title}」로 해요`,'host'); startDeath(s,s.deathOpts[0]); return; }
  for(const h of humansAlive(s)) s.ready[h]=1; }
/* 🎙️ 진행자 멘트 (아이디어 2) — 정해 둔 말이라 AI 비용 없음. 무대 위 띠에도 뜸(s.mc) */
const MC={
  rest:['제{ep}회 시작합니다! 남은 사람은 {n}명. 휴식 시간 동안 마음껏 손잡고, 마음껏 속이세요.','자, 제{ep}회! 오늘의 메인 매치는 「{g}」. 작전 회의 시작합니다!','제{ep}회입니다. {n}명 중 한 명은 오늘 집에 가요. 누가 될까요?'],
  result:['제{ep}회 메인 매치 결과 발표! 오늘 웃는 사람은 누구일까요?','결과 나왔습니다. 꼴찌부터 공개할게요!'],
  cand:['데스매치 후보는 {c}! 로비 시간입니다 — 살고 싶다면 지금 움직이세요.','{c}, 후보가 됐네요. 누구를 데려갈지… 다들 눈치 보는 소리가 들려요.'],
  pick:['{c}의 선택은… {t}! 이유가 궁금하네요.','{t} 지목! {c}와 {t}, 둘 중 하나는 오늘 집에 갑니다.'],
  death:['데스매치 「{g}」 — {a} vs {b}. 지는 쪽은 탈락입니다.','운명의 「{g}」! {a}와 {b}, 마지막 승부입니다.'],
  out:['{l}, 여기까지입니다. 수고하셨어요.','아쉽게도 {l} 탈락! {w}이(가) 살아남았습니다.'],
  final:['결승입니다! {a} vs {b}, 3판 2선승으로 우승자를 가립니다.'],
  timeup:['⏰ 시간 종료! 다음으로 넘어갑니다.','⏰ 시간이 다 됐어요!'],
  drest:['{ep}일차가 밝았습니다. 남은 사람은 {n}명. 오늘의 메인 매치는 「{g}」!','{ep}일차입니다. 오늘 밤, 누군가는 유배지로 갑니다.'],
  jail:['감옥동 플레이어들은 감옥 매치를 준비하세요. 꼴찌는 유배지로 갑니다.','⛓️ 감옥 문이 닫힙니다. 여기서 한 명은 오늘 떠나요.'],
  exile:['{l}, 유배지로 떠납니다.','{l} — 오늘은 여기까지. 유배지에서 기다리세요.'],
  rev:['유배지의 문이 열립니다. 🔥 패자부활전 — 단 한 명만 돌아올 수 있어요!'] };
function mc(s,k,o){ const L=MC[k]; if(!L) return; const t=fill(U.pick(L),o||{}); sys(s,'🎙️ '+t,'mc'); s.mc={t,at:Date.now(),id:(s.mc&&s.mc.id||0)+1}; }
function readyAll(s){ return humansAlive(s).every(h=>s.ready[h]); }
function clearReady(s){ s.ready={}; }
function startRest(s){ s.ep++; if(s.ep>1) bondDecay(s); s.phase='rest'; setDL(s); clearReady(s); s.cand=s.oppo=null; s.death=null; s.deathOpts=null; s.lobby=null; s.vote=null; s.fed=null; s.rescue=null;
  if(isDev(s)) sys(s,`☕ ${s.ep}일차 자유 시간 — 남은 사람 ${alive(s).length}명. 연합·거래·🧩 피스 건네기는 지금!`,'host');
  else sys(s,`☕ 제${s.ep}회 휴식 시간 — 남은 사람 ${alive(s).length}명. 연합·거래는 지금! (다 됐으면 "다음")`,'host');
  if(isDev(s)&&s.ep===2&&alive(s).length>=6&&!s.curse) curseStart(s);
  if(isDev(s)&&exiles(s).some(isHum)){ const ea=exiles(s).filter(x=>!isHum(x)); if(ea.length) s.aq.push({k:'exTalk',i:U.pick(ea)}); }
  const n=Math.min(4,animalsAlive(s).length); for(const a of U.shuffle(animalsAlive(s)).slice(0,n)) s.aq.push({k:'rest',i:a});
  for(const A of (s.alli||[])){ const an=A.mem.filter(x=>!isHum(x)&&pl(s,x)&&!pl(s,x).out); if(an.length&&Math.random()<.7) s.aq.push({k:'aTalk',i:U.pick(an),a:A.id}); }
  s.pred=null;
  if(!isDev(s)) for(const a of animalsAlive(s)){ const P=pl(s,a); if(!P.tok&&P.g>=6&&Math.random()<.35){ P.g-=5; P.tok=1; sys(s,`🛡️ ${nm(a)}이(가) 가넷 5개로 생명의 징표를 샀어요!`,'host'); } }   /* 🟣 동물도 징표를 삼 */
  s.next=pickMain(s); if(s.next) sys(s,`🎙️ 이번 메인 매치는 「${G_(s.next).title}」 — ${G_(s.next).tagline||''}`,'host');
  if(isDev(s)) mc(s,'drest',{ep:s.ep,n:alive(s).length,g:s.next&&G_(s.next)?G_(s.next).title:'?'}); else mc(s,'rest',{ep:s.ep,n:alive(s).length,g:s.next&&G_(s.next)?G_(s.next).title:'?'});
  s.notice=isDev(s)?`☕ ${s.ep}일차 자유 시간`:`☕ 제${s.ep}회 휴식 시간`; }
function pickMain(s){ const n=alive(s).length, hum=humansAlive(s).length, used=s.used;
  if(isDev(s)){ const pool=(DPOOL[n]||DPOOL[Math.min(10,Math.max(3,n))]||[]).filter(id=>NAT[id]); const fresh=pool.filter(id=>!used.includes(id)); return fresh[0]||U.pick(pool)||null; }
  const s1=S1[n]; if(s1&&okGame(s1,hum)&&!used.includes(s1)) return s1;
  const pool=(POOL[n]||[]).filter(id=>okGame(id,hum)); const fresh=pool.filter(id=>!used.includes(id)); return U.pick(fresh.length?fresh:pool)||null; }

/* 🎮 게임을 이 안에서 돌림: sub = {id, kind, st, hp:[sub 사람 자리 순서의 참가자 id], ph:유령 자리(1) 동물 id|null, cast:[NPC 자리 동물]} */
const ONE_OK=new Set(['goodevilai']);
const OWN_UI=new Set(['goodevilai']);   /* 자체 대화창·귓속말이 있는 게임 */
function startSub(s,kind,id,members){
  const G=G_(id); const hum=members.filter(isHum), ani=members.filter(x=>!isHum(x));
  let hp, ph=null, cast;
  if(kind==='main'){ hp=hum.slice(); if(hp.length<2&&!ONE_OK.has(id)){ ph=U.pick(ani); hp.push(ph); } /* 혼자면 두 번째 사람 자리를 동물이 대신(선과 악은 사람 1명 그대로) */ cast=U.shuffle(ani.filter(a=>a!==ph)); }
  else { hp=hum.slice(); if(hp.length<2){ ph=ani[0]; hp.push(ph); } cast=[]; }
  window.SEASON_CAST=cast.slice(); if(G.reset) try{ G.reset(); }catch(_){}
  let st; CS=s; try{ st=withNames({hp},()=>G.init(0,(G.maxH||2)>2?{humans:hp.length,season:true}:undefined)); } finally { window.SEASON_CAST=null; }
  s.sub={id,kind,st,hp,ph,cast,key:id+':'+kind+':'+s.ep+':'+(s.final?s.final.idx:''),vq:[],rq:[]};
  s.phase=kind==='main'?'match':kind==='final'?'final':'death';
  s.notice=`🎮 ${G.title}`; }
function phantomMove(sub){ const G=G_(sub.id), st=sub.st; return withNames(sub,()=>{ let a=null; try{ a=G.ai?G.ai(G.mask?G.mask(st,1):st,1):null; }catch(_){ a=null; } if(a){ try{ if(!G.apply(U.clone(st),1,a)) return a; }catch(_){} }
    if(G.stepDelay&&G.stepDelay(st)==null) for(const f of [{k:'ready'},{k:'next'}]){ try{ const c=U.clone(st); if(!G.apply(c,1,f)) return f; }catch(_){} } return null; }); }
function subSeatPid(sub,seat){ const st=sub.st; if(Array.isArray(st.hs)){ const k=st.hs.indexOf(seat); if(k>=0) return sub.hp[k]; }
  else if(seat<sub.hp.length&&sub.kind!=='main') return sub.hp[seat];
  if(st.who&&st.who[seat]) return st.who[seat]; if(st.cast&&st.cast[seat]) return st.cast[seat]; return null; }
function standings(id,st,N){ const seats=[...Array(N).keys()];
  if(TEAM[id]){ let win=[]; try{ win=seats.filter(i=>TEAM[id](st,i)); }catch(_){} if(win.length&&win.length<N) return {team:true,win,order:[...win,...seats.filter(i=>!win.includes(i))]}; }
  if(Array.isArray(st.rank)&&st.rank.length===N) return {order:st.rank.slice()};
  for(const k of ['score','tot','pts','chips','coins','money','sc']){ const a=st[k]; if(Array.isArray(a)&&a.length===N&&a.every(x=>typeof x==='number')) return {order:seats.slice().sort((x,y)=>a[y]-a[x]||Math.random()-.5),val:a,key:k}; }
  return {order:seats}; }
function seatCount(sub){ const st=sub.st; for(const k of ['role','roles','alive','tot','score','pts','chips','sc','cast']) if(Array.isArray(st[k])) return st[k].length; return 8; }
function mainResult(s){ const sub=s.sub, st=sub.st, N=seatCount(sub), sd=standings(sub.id,st,N);
  const ids=sd.order.map(seat=>subSeatPid(sub,seat)).filter(x=>x&&pl(s,x)&&!pl(s,x).out);
  s.sub=null; announceMain(s,sub.id,ids,sd.team?sd.win.map(seat=>subSeatPid(sub,seat)).filter(Boolean):null); }
/* 📈 판 흐름(S3) — 점수가 쌓이는 메인 매치만, 라운드가 넘어갈 때마다 누적 점수 한 장 */
function flowSnap(s,m,r0){ if(!m||m.kind!=null&&m.kind!=='main') return; const sc=m.tot||m.chips; if(!sc||typeof sc!=='object') return; const F=(s.flow=s.flow||{}); if(!F[s.ep]){ F[s.ep]={game:m.id,pts:[Object.assign({},sc)]}; return; } if(m.r!==r0&&r0!=null) F[s.ep].pts.push(Object.assign({},sc)); }
function announceMain(s,gid,ids,teamWin,sc,unit){ if(isDev(s)) return devAnnounce(s,gid,ids,teamWin,sc,unit); ids=ids.filter(x=>x&&pl(s,x)&&!pl(s,x).out); if(sc&&s.flow&&s.flow[s.ep]){ const F=s.flow[s.ep]; F.pts.push(Object.assign({},sc)); F.unit=unit||'점'; }
  for(const id of aliveIds(s)) if(!ids.includes(id)) ids.push(id);   // 혹시 빠진 자리
  s.used.push(gid); s.lastOrder=ids; s.lastTeam=!!teamWin;
  mc(s,'result',{ep:s.ep});
  const rec={ep:s.ep,game:gid};
  if(teamWin){ const win=teamWin, lose=ids.filter(x=>!win.includes(x)); rec.team=win; show(s,'team',6500,{win,lose,game:gid});
    sys(s,`🏅 이긴 팀 — ${win.map(nm).join(' · ')} (가넷 +2씩)`,'win'); win.forEach(x=>{ pl(s,x).g+=2; stat(s,'win',x,.5); });
    win.forEach(a=>win.forEach(b=>{ addRel(s,a,b,.12); bond(s,a,b,'coop'); }));
    sys(s,`💀 진 팀 — ${lose.map(nm).join(' · ')}: 진 팀 안에서 투표로 데스매치 후보를 정해요`,'bad');
    s.eps.push(rec); s.vote={pool:lose.filter(x=>!pl(s,x).tok||lose.every(y=>pl(s,y).tok)),votes:{}}; s.phase='vote'; setDL(s); clearReady(s);
    for(const a of s.vote.pool.filter(x=>!isHum(x))) s.aq.push({k:'vote',i:a});
    if(s.vote.pool.some(x=>isHum(x)&&!pl(s,x).out)){ s.voteHold=Date.now()+20000+(showOn(s)?s.show.until-Date.now():0); sys(s,'🎤 진 팀은 20초 동안 최후 변론을 할 수 있어요 — 동물들은 듣고 나서 투표해요','host'); }   /* 🗣️ 변론할 틈 */
    s.notice='🗳️ 진 팀 투표'; return; }
  rec.order=ids; show(s,'result',2400+ids.length*560+3200,{order:ids,sc:sc?Object.fromEntries(ids.map(x=>[x,sc[x]])):null,unit:unit||'점',game:gid});
  const W=[3,2,1]; ids.forEach((x,k)=>{ const m=W[k]||0; pl(s,x).g+=m; sys(s,`${k+1}위 ${nm(x)}${k===0?' 🛡️ 생명의 징표 + 나눠 줄 징표 1개!':''}${m?` · 가넷 +${m}`:''}`,k===0?'win':k===ids.length-1?'bad':''); });
  for(const x of s.players) x.gift=0; pl(s,ids[0]).tok++; pl(s,ids[0]).gift=1; stat(s,'win',ids[0]); setCond(s,ids[0],'conf');
  s.eps.push(rec);
  let c=null; const free=ids.slice(1).reverse().find(x=>!pl(s,x).tok);
  if(!free){ c=ids[ids.length-1]; sys(s,'🛡️ 1위 말고 모두 징표가 있어요 — 이번엔 징표가 안 통하고 꼴찌가 후보예요','host'); }
  else for(let k=ids.length-1;k>=1;k--){ const p=pl(s,ids[k]); if(p.tok&&ids[k]!==free){ p.tok--; sys(s,`🛡️ ${nm(ids[k])} 생명의 징표를 써서 데스매치를 피해요!`,'host'); continue; } c=ids[k]; break; }
  setCand(s,c); }
/* ───────── 😈 데블스 플랜 흐름 ───────── */
function exile(s,id,why){ const P=pl(s,id); if(!P||P.out) return; P.out=s.ep; P.ex=why; delete s.home[id]; const mates=allyMates(s,id); allyLeave(s,id,'out'); for(const x of mates) if(rel(s,x,id)>=.3) grow(s,x,'temper',.04,`가까운 동료 ${nm(id)}이(가) 유배돼 독기가 올랐다`);
  mc(s,'exile',{l:nm(id)}); if(!isHum(id)) s.aq.push({k:'bye',i:id,dv:why}); }
function devAnnounce(s,gid,ids,teamWin,sc,unit){ const ph=s.phase;
  if(ph==='revival') return revEnd(s,gid,ids);
  ids=ids.filter(x=>x&&pl(s,x)&&!pl(s,x).out); if(sc&&s.flow&&s.flow[s.ep]){ const F=s.flow[s.ep]; F.pts.push(Object.assign({},sc)); F.unit=unit||'점'; }
  if(ph==='prison') return prisonEnd(s,gid,ids,sc,unit);
  for(const id of aliveIds(s)) if(!ids.includes(id)) ids.push(id);
  s.used.push(gid); s.lastOrder=ids; s.lastTeam=!!teamWin; mc(s,'result',{ep:s.ep});
  const rec={ep:s.ep,game:gid,order:ids.slice()}; if(teamWin) rec.team=teamWin; s.eps.push(rec);
  show(s,'result',2400+ids.length*560+3200,{order:ids,sc:sc?Object.fromEntries(ids.map(x=>[x,sc[x]])):null,unit:unit||'점',game:gid});
  const W=[3,2,1]; ids.forEach((x,k)=>{ const m=W[k]||0; pl(s,x).g+=m; sys(s,`${k+1}위 ${nm(x)}${k===0?' 🎖️ 연맹의 징표!':''}${m?` · 🧩 +${m}`:''}${k===ids.length-1?' — 🏝️ 유배지로':''}`,k===0?'win':k===ids.length-1?'bad':''); });
  stat(s,'win',ids[0]); setCond(s,ids[0],'conf');
  const lo=ids[ids.length-1]; rec.out=lo; exile(s,lo,'main'); evl(s,ids[0],lo,'death','메인 매치 꼴찌로 유배');
  const rest=ids.slice(0,-1), n=rest.length; s.fed=ids[0];
  if(n<=3){ s.home={}; for(const x of rest) s.home[x]='live'; sys(s,n<=2?'🎙️ 이제 둘 — 결승으로 갑니다!':'🎙️ 셋 남아 오늘은 감옥 매치가 없어요','host'); s.phase='afterDeath'; setDL(s); clearReady(s); s.wait=1500; s.notice=`🏝️ ${nm(lo)} 유배`; return; }
  const K=Math.max(3,Math.floor(n/2)), jail=rest.slice(-K), live=rest.slice(0,n-K);
  s.home={}; for(const x of live) s.home[x]='live'; for(const x of jail) s.home[x]='jail';
  s.rescue={by:ids[0],pool:jail.slice(),swap:K===3?live.filter(x=>x!==ids[0]).slice(-1)[0]||null:null,done:false};
  if(K===3&&!s.rescue.swap){ s.rescue.done=true; sys(s,`🎖️ ${nm(ids[0])} 연맹의 징표 — 감옥 인원이 최소라 이번엔 구할 수 없어요`,'host'); setSplit(s); return; }
  s.phase='rescue'; setDL(s); clearReady(s); s.notice='🎖️ 연맹의 징표';
  sys(s,`🎖️ ${nm(ids[0])}이(가) 연맹의 징표로 감옥동에 갈 ${jail.map(nm).join('·')} 중 한 명을 생활동으로 구할 수 있어요${s.rescue.swap?` (감옥 인원이 최소라 구하면 ${nm(s.rescue.swap)}이(가) 대신 감옥동으로 가요)`:''}`,'host');
  if(!isHum(ids[0])) s.aq.push({k:'rescue',i:ids[0]}); }
function doRescue(s,t){ const R=s.rescue; if(!R||R.done) return; R.done=true; const e=s.eps.find(x=>x.ep===s.ep)||{};
  if(t&&R.pool.includes(t)){ s.home[t]='live'; e.fedSave=t; addRel(s,t,R.by,.5); bond(s,t,R.by,'save'); grow(s,t,'trust',.05,'구해 준 덕에 남을 조금 더 믿게 됐다'); evl(s,R.by,t,'ally','연맹의 징표로 구해 줌'); sys(s,`🎖️ ${nm(R.by)}이(가) ${nm(t)}을(를) 구했어요! → 🏠 생활동`,'win');
    if(R.swap&&pl(s,R.swap)&&!pl(s,R.swap).out){ s.home[R.swap]='jail'; addRel(s,R.swap,R.by,-.4); bond(s,R.swap,R.by,'swap'); sys(s,`⛓️ 대신 ${nm(R.swap)}이(가) 감옥동으로 내려가요`,'bad'); if(!isHum(R.swap)) s.aq.push({k:'say',i:R.swap,model:'haiku',task:`${nm(R.by)}이(가) 연맹의 징표로 ${nm(t)}을(를) 구하는 바람에 네가 대신 감옥동으로 내려가게 됐다. 한마디. 짧게.`,fb:['아 왜 나야','…기억할게요']}); }
    if(!isHum(t)) s.aq.push({k:'say',i:t,model:'haiku',task:`${nm(R.by)}이(가) 연맹의 징표로 너를 감옥동에서 구해 줬다. 짧게 한마디(고마움·의외).`,fb:['살았다…','고마워요 진짜']}); }
  else sys(s,`🎖️ ${nm(R.by)}은(는) 아무도 구하지 않았어요`,'host');
  setSplit(s); }
function setSplit(s){ const live=aliveIds(s).filter(x=>s.home[x]==='live'), jail=aliveIds(s).filter(x=>s.home[x]==='jail'); const e=s.eps.find(x=>x.ep===s.ep); if(e) e.jail=jail.slice();
  sys(s,`🏠 생활동 — ${live.map(nm).join(' · ')}`,'win'); sys(s,`⛓️ 감옥동 — ${jail.map(nm).join(' · ')}`,'bad'); mc(s,'jail');
  s.phase='split'; setDL(s); clearReady(s); s.notice='⛓️ 감옥 매치 준비';
  for(const a of U.shuffle(jail.filter(x=>!isHum(x))).slice(0,2)) s.aq.push({k:'say',i:a,model:'haiku',task:'너는 오늘 감옥동이다. 곧 감옥 매치(꼴찌는 유배지)를 한다. 테이블에서 짧게 한마디(각오·긴장·견제).',fb:['해 보자','떨린다']}); }
function startPrison(s){ const jail=aliveIds(s).filter(x=>s.home[x]==='jail'); if(jail.length<2){ s.phase='afterDeath'; setDL(s); clearReady(s); return; }
  const last=(s.eps.filter(e=>e.dg).slice(-1)[0]||{}).dg; let gid=DPRISON.filter(id=>id!==last)[0]||DPRISON[0]; s.death=gid;
  s.phase='prison'; s.nm=NAT[gid].start(s,jail,'prison'); s.notice=`⛓️ ${NAT[gid].title}`; }
function prisonEnd(s,gid,ids,sc,unit){ const jail=aliveIds(s).filter(x=>s.home[x]==='jail'); for(const x of jail) if(!ids.includes(x)) ids.push(x);
  const w=ids[0], l=ids[ids.length-1], e=s.eps.find(x=>x.ep===s.ep)||{}; Object.assign(e,{dw:w,dl:l,dg:gid,porder:ids.slice()});
  pl(s,w).g+=2; stat(s,'survive',w); sys(s,`🏁 감옥 매치 1위 ${nm(w)} (🧩 +2) · 💀 꼴찌 ${nm(l)} — 🏝️ 유배지로`,'win');
  setCond(s,w,'awake'); exile(s,l,'prison'); evl(s,w,l,'death','감옥 매치에서 이김');
  show(s,'out',isHum(l)?5200:8200,{l,w}); s.phase='afterDeath'; setDL(s); clearReady(s); s.notice=`🏝️ ${nm(l)} 유배`; s.wait=1500; makeReport(s,w,l); }
/* 🏝️ 유배지 대화방 (2026-11-12 밤 자율) — 유배된 사람(사람·동물)끼리만 보는 방. 유배된 사람이 말하면 유배된 동물이 대답, 자유 시간마다 한 마리가 수다(사람이 유배지에 있을 때만 — 비용) */
const exiles=s=>s.players.filter(x=>x.out&&x.ex).map(x=>x.id);
function exSay(s,id,text){ s.chat.push({r:s.ep,seat:id,text,t:null,kind:'say',secret:1,room:'exile',to:exiles(s),at:Date.now()}); }
const exLog=s=>s.chat.filter(c=>c.room==='exile').slice(-10).map(c=>`${nm(c.seat)}: ${c.text}`).join('\n');
function curseStart(s){ const al=aliveIds(s); const who=U.pick(al), t=U.pick(al.filter(x=>x!==who)); s.curse={who,t,ep:s.ep,res:null};
  if(isHum(who)) s.chat.push({r:s.ep,note:1,secret:1,to:[who],text:`🗝️ (나만 보임) 생활동 화장대 콘센트 뒤에서 쪽지를 찾았어요 — 「오늘이 끝나기 전에 ${nm(t)}이(가) 유배지로 가야 저주가 풀린다. 성공하면 🧩 +3, 실패하면 피스를 전부 잃는다.」 아무에게도 들키지 마세요.`,kind:'host'});
  sys(s,'🗝️ 누군가 생활동에서 비밀 임무를 받았다는 소문이 돌아요…','host'); }
function curseEnd(s){ const C=s.curse; if(!C||C.res||C.ep!==s.ep) return; const P=pl(s,C.who); const ok=pl(s,C.t)&&pl(s,C.t).out===s.ep;
  C.res=ok?'ok':'fail'; if(ok){ if(P&&!P.out) P.g+=3; } else if(P){ C.lost=P.g; P.g=0; }
  sys(s,`🗝️ 비밀 임무 공개 — ${nm(C.who)}은(는) ${nm(C.t)}을(를) 유배지로 보내야 했어요. ${ok?'성공! 저주가 풀리고 🧩 +3':`실패… 저주로 피스 ${C.lost||0}개를 잃었어요`}`,ok?'win':'bad');
  if(!isHum(C.t)&&pl(s,C.t)){ addRel(s,C.t,C.who,-.4); bond(s,C.t,C.who,'curse'); } for(const x of animalsAlive(s)) if(x!==C.who) addRel(s,x,C.who,-.05); }
function startRevival(s){ const ex=s.players.filter(x=>x.out&&x.ex).map(x=>x.id); s.revDone=1; const last=(s.eps.filter(e=>e.dg).slice(-1)[0]||{}).dg; const gid=DPRISON.filter(id=>id!==last)[0]||DPRISON[0];
  mc(s,'rev'); sys(s,`🔥 유배지 패자부활전 「${NAT[gid].title}」 — ${ex.map(nm).join(' · ')} 중 1위만 돌아와요`,'host');
  s.phase='revival'; s.revG=gid; s.nm=NAT[gid].start(s,ex,'revival'); s.notice=`🔥 패자부활전`; }
function revEnd(s,gid,ids){ ids=ids.filter(x=>x&&pl(s,x)&&pl(s,x).out); const w=ids[0]; const e=s.eps.find(x=>x.ep===s.ep)||{};
  if(w){ const P=pl(s,w); P.out=0; P.ex=null; P.back=s.ep; e.rev=w; stat(s,'win',w,.5); setCond(s,w,'awake'); sys(s,`🔥 ${nm(w)} 부활! 본선으로 돌아와요`,'win'); evl(s,w,w,'ally','패자부활');
    if(!isHum(w)) s.aq.push({k:'say',i:w,model:'haiku',task:'너는 유배지 패자부활전에서 1위를 해서 본선으로 돌아왔다. 모두 앞에서 짧게 한마디.',fb:['돌아왔습니다','저 아직 안 끝났어요']}); }
  /* 회차 리포트에 5막 '패자부활전' — 리포트는 감옥 매치 뒤에 만들어져서 부활이 빠지고 '남은 N명'이 틀렸음(11-12 실제 AI 시험) */
  { const R=s.rep&&s.rep[s.ep], RG=G_(gid); if(R&&R.acts&&!R.acts.some(a=>a.k==='revival')) R.acts.push({k:'revival',ic:'🔥',title:'패자부활전',sub:RG?RG.title:'',text:`유배지 ${ids.length}명이 ${RG?`「${RG.title}」에서 `:''}겨뤘다. ${w?`${nm(w)}이(가) 1위로 본선에 돌아왔다. 남은 ${alive(s).length}명.`:'아무도 돌아오지 못했다.'}`,chips:w?[`🔥 ${nm(w)} 부활`]:[]}); }
  s.phase='afterRev'; setDL(s); clearReady(s); s.notice='🔥 부활'; }
function setCand(s,c){ s.cand=c; sys(s,`⚖️ 데스매치 후보: ${nm(c)}`,'bad'); mc(s,'cand',{c:nm(c)}); s.phase='lobby'; setDL(s); clearReady(s);
  s.lobby={deals:{},asks:{}};
  sys(s,`🏛️ 로비 시간 — ${nm(c)}에게 부탁·거래·몰아가기를 할 수 있어요${isHum(c)?' (후보는 다 듣고 "상대 지목하기")':' (다 됐으면 "다음")'}`,'host');
  const lob=U.shuffle(animalsAlive(s).filter(a=>a!==c)).slice(0,3); for(const a of lob) s.aq.push({k:'lobby',i:a});
  for(const a of animalsAlive(s).filter(x=>pl(s,x).gift)){ const gv=y=>rel(s,a,y)+(isAlly(s,a,y)?1:0)+BX(s,a,y).d*.8+BX(s,a,y).t*.4-BX(s,a,y).g; const E=aliveIds(s).filter(x=>x!==a&&x!==c&&!pl(s,x).tok).sort((p,q)=>gv(q)-gv(p)); const x=E[0];
    if(x&&(gv(x)>.15||isAlly(s,a,x))){ pl(s,a).gift=0; pl(s,x).tok=1; tlog(s,`${nm(a)}이(가) ${nm(x)}에게 생명의 징표를 건넴`); sys(s,`🛡️ ${nm(a)}이(가) ${nm(x)}에게 나눔 징표를 건넸어요!`,'host'); addRel(s,x,a,.5); bond(s,x,a,'gift'); evl(s,a,x,'ally','생명의 징표 선물');
      s.aq.unshift({k:'say',i:a,model:'haiku',task:`너는 메인 매치 1위로 받은 나눔 징표(데스매치 면제)를 방금 ${nm(x)}에게 줬다. 모두 앞에서 짧게 한마디(왜 줬는지 살짝).`}); } }
  if(!isHum(c)) s.aq.push({k:'candTalk',i:c});
  s.notice=`🏛️ 로비 — 후보 ${nm(c)}`; }
function eligible(s,c){ const E=aliveIds(s).filter(x=>x!==c&&!pl(s,x).tok); return E.length?E:aliveIds(s).filter(x=>x!==c); }
function nominate(s,c,t,say){ evl(s,c,t,'pick','데스매치 지목'); { const pool=eligible(s,c); show(s,'pick',5600,{c,t,pool:pool.includes(t)?pool:pool.concat(t),say:say||''}); } s.oppo=t; if(say) talk(s,c,say,t,'acc'); sys(s,`⚔️ 데스매치: ${nm(c)} vs ${nm(t)}`,'bad'); mc(s,'pick',{c:nm(c),t:nm(t)});
  /* 거래 정산 */
  const D=s.lobby&&s.lobby.deals||{}; for(const k in D){ const d=D[k]; if(!d.ok) continue; const [from,to]=k.split('>');
    if(t===from){ sys(s,`💔 ${nm(to)} — ${nm(from)}와(과) 거래해 놓고 지목했어요!`,'bad'); stat(s,'betray',to); for(const x of aliveIds(s)) if(x!==to) addRel(s,x,to,-.12); addRel(s,from,to,-.8); bond(s,from,to,'dealBetray'); }
    else { const amt=Math.min(d.amt,pl(s,from).g); pl(s,from).g-=amt; pl(s,to).g+=amt; sys(s,`🟣 거래 성립 — ${nm(from)} → ${nm(to)} 가넷 ${amt}개`,''); addRel(s,from,to,.2); bond(s,from,to,'deal'); stat(s,'deal',to); } }
  addRel(s,t,c,-.5); bond(s,t,c,'pick');
  const a=deathPool(s); const b=deathPool(s).filter(x=>x!==a[0])[0]||null; s.deathOpts=[a[0],b].filter(Boolean);
  if(!isHum(c)&&!isHum(t)&&aiOn()&&NAT.indianai) s.deathOpts=['indianai'];   /* 동물끼리는 구경하는 인디언 포커 (2026-11-11: 한 줄로 끝나던 것) */
  s.pred={kind:'death',opts:[c,t],picks:{},until:Date.now()+36e5,wait:Date.now()+12000};   /* 🔮 승부에 안 나가는 사람(탈락자 포함)이 승자 예측 */
  s.phase='deathPick'; setDL(s); clearReady(s); s.notice=`🎮 ${nm(t)}이(가) 데스매치 게임을 골라요`;
  sys(s,`🎮 지목당한 ${nm(t)}이(가) 데스매치 게임을 골라요 — 「${s.deathOpts.map(x=>G_(x).title).join('」 / 「')}」`,'host'); }
function deathPool(s){ const hum=[s.cand,s.oppo].filter(isHum).length; const ok=id=>G_(id)&&!s.usedD.includes(id)&&(hum===0||G_(id).ai||hum===2);
  const L=S1D.filter(ok).concat(U.shuffle(DEATHS.filter(id=>ok(id)&&!S1D.includes(id)))); return L.length?L:DEATHS.filter(id=>G_(id)); }
function startDeath(s,id){ s.death=id; s.usedD.push(id); const a=s.cand, b=s.oppo; mc(s,'death',{g:G_(id).title,a:nm(a),b:nm(b)});
  if(s.pred) s.pred.until=Date.now()+20000;   /* 예측은 승부 시작 뒤 20초까지 */
  if(!isHum(a)&&!isHum(b)){ if(aiOn()&&NAT[id]){ s.usedD.pop(); s.phase='death'; s.nm=NAT[id].start(s,[a,b],'death',{fast:true}); s.nm.fast=true; s.notice=`⚔️ ${NAT[id].title} — 동물끼리 빠른 승부`; return; } simDeath(s,a,b); return; }
  if(NAT[id]){ s.phase='death'; s.nm=NAT[id].start(s,[a,b],'death'); s.notice=`⚔️ ${NAT[id].title}`; return; }
  const mem=[a,b].sort((x,y)=>(isHum(y)?1:0)-(isHum(x)?1:0)); startSub(s,'death',id,mem); }
/* AI판 데스매치·결승이 끝나면 */
function natDuelEnd(s,w,l){ const kind=s.nm&&s.nm.kind; s.nm=null; if(kind==='final'){ finalScore(s,w); return; } finishDeath(s,w,l); }
function simDuel(a,b){ const la=isHum(a)?.6:(ANI(a).logic||.5), lb=isHum(b)?.6:(ANI(b).logic||.5); return Math.random()<.5+(la-lb)*.4+rnd(-.12,.12)?a:b; }
function simDeath(s,a,b){ const w=simDuel(a,b), l=w===a?b:a; sys(s,`🎙️ ${nm(a)}·${nm(b)} 접전 끝에…`,'host'); finishDeath(s,w,l); }
function deathResult(s){ const sub=s.sub, st=sub.st; let w0=st.winner; const wi=w0===0||w0===1?w0:(Math.random()<.5?0:1);
  const w=sub.hp[wi], l=sub.hp[1-wi]; s.sub=null; finishDeath(s,w,l); }
function finishDeath(s,w,l){ if(s.pred&&s.pred.kind==='death') predResolve(s,w); const pw=pl(s,w), plo=pl(s,l); pw.g+=1; stat(s,'survive',w); const mates=allyMates(s,l).filter(x=>x!==w); plo.out=s.ep; allyLeave(s,l,'out');
  setCond(s,w,'awake'); for(const x of mates){ setCond(s,x,'revenge',{on:w}); bond(s,x,w,'killMate'); }
  const e=s.eps.find(x=>x.ep===s.ep); if(e) Object.assign(e,{dw:w,dl:l,dg:s.death});
  evl(s,w,l,'death','데스매치에서 이김'); sys(s,`🏁 데스매치 승자 ${nm(w)}! 💀 ${nm(l)} 탈락`,'win'); mc(s,'out',{l:nm(l),w:nm(w)});
  if(plo.g>0){ const half=Math.ceil(plo.g/2); pw.g+=half; plo.g-=half; sys(s,`🟣 탈락자의 가넷 절반(${half}개)은 승자에게`,''); }
  if(!isHum(l)) s.aq.push({k:'bye',i:l,w}); show(s,'out',isHum(l)?5200:8200,{l,w});
  s.phase='afterDeath'; setDL(s); clearReady(s); s.notice=`💀 ${nm(l)} 탈락`; s.wait=1500; makeReport(s,w,l); }
/* 🔮 예측 — 승부에 안 나가는 사람(살아 있으면 맞히면 가넷 +1, 탈락했으면 예언 점수 → 🔮 예언왕). 동물끼리 승부·결승 전엔 잠깐 기다려 줌 */
const predWho=s=>s.pred?s.players.filter(x=>isHum(x.id)&&!s.pred.opts.includes(x.id)).map(x=>x.id):[];
const predOpen=s=>!!(s.pred&&!s.pred.closed&&Date.now()<s.pred.until);
const predWaiting=s=>predOpen(s)&&Date.now()<s.pred.wait&&predWho(s).some(h=>!s.pred.picks[h]);
function predResolve(s,w){ const p=s.pred; s.pred=null; if(!p||!Object.keys(p.picks).length) return; const hit=Object.keys(p.picks).filter(h=>p.picks[h]===w); if(hit.length) (s.predHit=s.predHit||{})[s.ep]=hit;
  sys(s,`🔮 예측 결과 — ${hit.length?hit.map(h=>{ const P=pl(s,h); if(!P.out) P.g+=1; stat(s,'pred',h); return `${nm(h)} 적중${P.out?'':' (🟣+1)'}`; }).join(' · '):'아무도 못 맞혔어요'}`,'host'); }
/* 📰 회차 리포트(S1) — 결과·숫자·명장면·관계 변화·캐릭터 변화·데스매치·이번 회 상·다음 회 예고 + 점수 흐름(S3) */
/* 💞 이번 회 관계 변화 TOP 3 (룰 20) — 같은 둘은 한 번만, 변화가 큰 순 */
function bondTop(s,ep){ const seen={}, L=(s.rlog||[]).filter(r=>r.ep===ep).map(r=>{ const K=BOND[r.k]; return {a:r.a,b:r.b,k:r.k,w:(Math.abs(K[0])+K[1]+Math.abs(K[2]))*r.m}; }).sort((x,y)=>y.w-x.w);
  return L.filter(r=>{ const key=r.a+'>'+r.b; if(seen[key]) return false; seen[key]=1; return true; }).slice(0,3).map(r=>{ const K=BOND[r.k]; return {a:r.a,b:r.b,why:K[4],tag:K[2]>=.3?'💢 원한':K[1]>=.3?'🙏 빚':K[0]<0?'🧊 믿음↓':'🤝 믿음↑'}; }); }
function makeReport(s,w,l){ const ep=s.ep, e=s.eps.find(x=>x.ep===ep)||{}, E=(s.evl||[]).filter(x=>x.ep===ep), c=(s.epc&&s.epc[ep])||{};
  const R={ep,game:e.game||null,order:e.order||null,team:e.team||null,w,l,dg:s.death,bye:null,
    stats:{dm:c.dm||0,meet:c.meet||0,betray:E.filter(x=>x.k==='betray').length,push:E.filter(x=>x.k==='push'||x.k==='pick').length},
    rel:E.filter(x=>['ally','deal','betray','pick'].includes(x.k)).slice(-6).map(x=>({a:x.a,b:x.b,k:x.k})),
    chg:(s.chg||[]).filter(x=>x.ep===ep).map(x=>({id:x.id,k:x.k,on:x.on})), bonds:bondTop(s,ep), grow:(s.glog||[]).filter(g=>g.ep===ep).slice(-4).map(g=>({id:g.a,why:g.why})),
    awards:[], flow:s.flow&&s.flow[ep]||null, headline:null, sub:null, scenes:null, next:null, beats:null};
  if(e.order) R.awards.push(['🏅','메인 매치 1위',e.order[0]]); else if(e.team) R.awards.push(['🏅','이긴 팀',e.team[0]]);
  R.awards.push(['⚔️','데스매치 생존',w]); { const b=E.find(x=>x.k==='betray'); if(b) R.awards.push(['🗡️','배신',b.a]); }
  { const pp=(s.predHit&&s.predHit[ep])||[]; if(pp.length) R.awards.push(['🔮','예측 적중',pp[0]]); }
  /* 규칙으로 만든 명장면(나중에 AI가 바꿈): 배신 → 지목 한마디 → 몰아가기 */
  const sc=[]; for(const x of E.filter(x=>x.k==='betray')) sc.push({id:x.a,q:x.txt,why:`${nm(x.b)}와 연합인데 ${x.txt}`,tag:'💔 배신'});
  const pk=s.chat.filter(x=>x.r===ep&&!x.note&&x.kind==='acc'&&x.t===s.oppo&&x.seat===s.cand).slice(-1)[0]; if(pk) sc.push({id:pk.seat,q:pk.text,why:'데스매치 지목의 한마디',tag:'👉 지목'});
  const ac=s.chat.filter(x=>x.r===ep&&!x.note&&x.kind==='acc'&&!/^🗳️/.test(x.text)).slice(-2); for(const x of ac) if(sc.length<3) sc.push({id:x.seat,q:x.text,why:`${nm(x.t)}을(를) 향한 말`,tag:'🔎 몰아가기'});
  R.scenes=sc.slice(0,3); { const A=actsRule(s,ep,R); R.acts=A.acts; R.headline=A.logline; R.syn=A.syn; } R.sub=e.game&&G_(e.game)?`「${G_(e.game).title}」 · 남은 ${alive(s).length}명`:'';
  R.next=`남은 ${alive(s).length}명 — 다음 회엔 누가 웃을까요?`;
  R.beats0=recapRule(s,ep,R);   /* AI가 없거나 늦으면 이걸로 */
  (s.rep=s.rep||{})[ep]=R; if(aiOn()){ s.aq.push({k:'report',ep});   /* 📺 후기는 글이 길어 대기열을 막지 않게 따로(최대 60초, 넘으면 규칙 요약) */
    try{ const p=recapAsk(s,ep); if(p&&p.then) p.then(r=>{ recapMerge(s,R,r); s.ev++; }).catch(()=>{ if(!R.beats) R.beats=R.beats0; s.ev++; }); else R.beats=R.beats0; }catch(_){ R.beats=R.beats0; }
    setTimeout(()=>{ if(!R.beats){ R.beats=R.beats0; s.ev++; } },60000); } else R.beats=R.beats0; }
const RSYS=`너는 예능 「더 지니어스 · 놀이터」의 편집 작가다. 회차 하나를 시청자용으로 정리한다. 말투는 예능 자막처럼 짧고 재밌게, 과장 없이 사실만. 비밀(연합 내용·귓속말 내용)은 모른다 — 아래 공개된 일만 써라.`;
const REPSCH={type:'object',properties:{headline:{type:'string'},sub:{type:'string'},scenes:{type:'array',items:{type:'object',properties:{who:{type:'string'},quote:{type:'string'},why:{type:'string'},tag:{type:'string'}},required:['who','quote','why','tag'],additionalProperties:false}},next:{type:'string'}},required:['headline','sub','scenes','next'],additionalProperties:false};
function reportAsk(s,ep){ const R=s.rep[ep], e=s.eps.find(x=>x.ep===ep)||{}, L=[];
  L.push(`[제${ep}회] 메인 매치 「${e.game&&G_(e.game)?G_(e.game).title:'?'}」 ${e.order?'순위: '+e.order.map(nm).join(' > '):''}${e.team?'이긴 팀: '+e.team.map(nm).join('·'):''}`);
  L.push(`데스매치: ${nm(R.w)} 승, ${nm(R.l)} 탈락${s.byeTxt&&s.byeTxt[R.l]?` — 탈락 인사 "${s.byeTxt[R.l]}"`:''}`);
  const E=(s.evl||[]).filter(x=>x.ep===ep); if(E.length) L.push('[공개 사건]\n'+E.slice(-14).map(x=>`${nm(x.a)} → ${nm(x.b)}: ${x.k} ${x.txt}`).join('\n'));
  const ch=s.chat.filter(x=>x.r===ep&&!x.secret).slice(-45).map(x=>x.note?`(진행) ${x.text}`:`${nm(x.seat)}${x.t?'→'+nm(x.t):''}: ${x.text}`); L.push('[이번 회 대화]\n'+ch.join('\n'));
  L.push(`[남은 사람] ${aliveIds(s).map(nm).join(', ')}`);
  return AIB.json(isDev(s)?RSYS.replace(/더 지니어스/g,'데블스 플랜'):RSYS,L.join('\n')+`\n\n[할 일] headline: 이 회차를 한 줄로(25자 안팎, 따옴표 인용 가능). sub: 부제 한 줄. scenes: 명장면 3개 — who(참가자 이름), quote(그 사람이 실제로 한 말 그대로, 짧게), why(무슨 상황이었는지 한 줄), tag(💔 배신·🗯️ 폭로·🔎 명추리·👉 지목·🤝 의리·😂 웃음 중 하나). next: 다음 회 예고 한 줄(남은 사람들 사이 갈등 위주).`,REPSCH,{model:'haiku'}); }
/* 📺 사건 흐름 — 「더 지니어스 ○화 후기」처럼, 시간 순서 장면마다 겉으로 일어난 일 + 그때 속마음(시청자만 앎) */
const RCSYS=`너는 「더 지니어스」 회차 요약 작가다. 이번 회를 안 본 사람이 "아 이번 화는 이렇게 흘러갔구나" 알 수 있게, 방송 회차 소개처럼 요약한다.
- 중심은 게임과 사건: 판을 어떻게 짰나 → 메인 매치 판세와 승부처 → 누가 왜 후보(꼴찌)가 됐나 → 지목·데스매치 결과. 감정·속마음 묘사는 하지 않는다.
- 아래 [막별 사실]과 [승부처]에 있는 것만 쓴다. 숫자·이름·결과는 그대로. 기록에 없는 사건·대사를 지어내지 마라. 연합처럼 비밀인 일은 [물밑]에만, 본문엔 쓰지 않는다.
- 문장은 짧게, 과장 없이, 예능 회차 소개 말투. 비꼬기 금지.`;
const RCSCH={type:'object',properties:{logline:{type:'string'},synopsis:{type:'string'},acts:{type:'array',items:{type:'object',properties:{k:{type:'string'},text:{type:'string'}},required:['k','text'],additionalProperties:false}},secret:{type:'string'}},required:['logline','synopsis','acts','secret'],additionalProperties:false};
function recapAsk(s,ep){ const e=s.eps.find(x=>x.ep===ep)||{}, R=s.rep[ep], L=[];
  L.push(`[${EPN(s,ep)}] 참가자: ${s.players.filter(p=>!p.out||p.out===ep).map(p=>nm(p.id)+(isHum(p.id)?'(사람)':'')).join(', ')}`);
  L.push('[막별 사실 — 규칙으로 정리한 것, 이 순서대로 요약]\n'+(R.acts||[]).map(a=>`(${a.k}) ${a.ic} ${a.title}${a.sub?` · ${a.sub}`:''}: ${a.text}${a.key?` / 결정적 순간: ${a.key.when} ${a.key.text}`:''}`).join('\n'));
  const B=(s.beats||[]).filter(b=>b.ep===ep); if(B.length) L.push('[승부처 — 게임이 기록한 공개된 순간, 시간 순]\n'+B.slice(-24).map(b=>`(${b.ph}) ${b.t}`).join('\n'));
  const E=(s.evl||[]).filter(x=>x.ep===ep&&x.k!=='ally'); if(E.length) L.push('[공개 사건]\n'+E.slice(-12).map(x=>`${nm(x.a)} → ${nm(x.b)}: ${x.k} ${x.txt||''}`).join('\n'));
  const ch=s.chat.filter(x=>x.r===ep&&!x.note&&!x.secret&&x.seat!=null).slice(-24).map(x=>`${nm(x.seat)}${x.t?'→'+nm(x.t):''}: ${x.text}`); if(ch.length) L.push('[공개 대화 — 인용은 여기 있는 그대로만]\n'+ch.join('\n'));
  const tl=(s.tlog||[]).filter(x=>x.ep===ep); if(tl.length) L.push('[물밑 — 시청자만 앎, secret 한 줄에만 쓸 것]\n'+tl.slice(-8).map(x=>x.t).join('\n'));
  if(s.byeTxt&&s.byeTxt[R.l]) L.push(`[탈락 인사] ${nm(R.l)}: "${s.byeTxt[R.l]}"`);
  return AIB.json(isDev(s)?RCSYS.replace(/더 지니어스/g,'데블스 플랜'):RCSYS,L.join('\n\n')+`\n\n[할 일] logline: 이번 화 한 줄 요약(30자 안팎, 승부처 + 결과, 따옴표 인용 가능). synopsis: 줄거리 3~4문장(시간 순, 위 막 순서). acts: 막마다 {k: 위 괄호 안 이름 그대로(${(R.acts||[]).map(a=>a.k).join('/')}), text: 그 막 1~2문장}. secret: 물밑에서 있었던 일 중 줄거리에 영향을 준 것 한 문장(없으면 "").`,RCSCH); }

/* 📰 회차 4막 (2026-11-12 A안 "한 줄 + 4막") — 판 짜기 → 메인 매치 → 후보 결정(데블스: 구제·감옥동) → 지목·데스매치(데블스: 감옥 매치).
   공개된 일과 승부처(beat)로 규칙 요약을 먼저 만들고, AI(회차 요약 작가)가 문장만 다듬음. 연합 같은 비밀은 넣지 않음(물밑 한 줄은 따로). */
const qq=t=>{ t=String(t||'').replace(/\s*\(🤝 약속 \d\)$/,''); return t.length>34?t.slice(0,33)+'…':t; };
function actsRule(s,ep,R){ const e=s.eps.find(x=>x.ep===ep)||{}, E=(s.evl||[]).filter(x=>x.ep===ep), c=(s.epc&&s.epc[ep])||{}, Bt=(s.beats||[]).filter(b=>b.ep===ep), dv=isDev(s), G=e.game&&G_(e.game), DG=R.dg&&G_(R.dg);
  const notes=s.chat.filter(x=>x.r===ep&&x.note).map(x=>String(x.text)), A=[], ord=e.order;
  { const deals=E.filter(x=>x.k==='deal'), bet=E.filter(x=>x.k==='betray'), gifts=notes.filter(t=>/징표를 (건넸|샀)|피스 1개/.test(t)), parts=[];
    if(c.meet) parts.push(`밀실 만남 ${c.meet}번`); if(c.dm) parts.push(`귓속말 ${c.dm}번`);
    let t=parts.length?`${dv?'자유 시간':'휴식 시간'}에 ${parts.join(', ')}이 오갔다.`:`조용한 ${dv?'자유 시간':'휴식 시간'}이었다.`;
    if(deals.length) t+=` ${nm(deals[0].a)}이(가) ${nm(deals[0].b)}에게 ${CURN(s)}로 부탁했다.`; if(bet.length) t+=` ${nm(bet[0].a)}의 배신이 드러났다.`; if(gifts.length) t+=` ${gifts[0].replace(/^[^\s]+\s/,'').replace(/!$/,'')}.`;
    A.push({k:'rest',ic:'☕',title:'판 짜기',sub:dv?'자유 시간':'휴식 시간',text:t,chips:[...deals.slice(0,2).map(x=>`🟣 ${nm(x.a)}→${nm(x.b)} 거래`),...(bet.length?[`💔 ${nm(bet[0].a)} 배신`]:[]),...gifts.slice(0,1).map(()=>'🛡️ 징표·피스')]}); }
  { const mb=Bt.filter(b=>G&&b.ph.includes(G.title)), key=mb.slice().sort((a,b)=>b.w-a.w)[0], leads=mb.filter(b=>b.k==='lead').length;
    let t=G?(e.team?`「${G.title}」 팀전 — ${e.team.map(nm).join('·')} 팀이 이겼다.`:ord?`「${G.title}」 — ${nm(ord[0])}이(가) 1위, ${nm(ord[ord.length-1])}이(가) 꼴찌.`:`「${G.title}」`):'메인 매치는 추첨으로 끝났다.';
    if(leads>=2) t+=` 1위가 ${leads}번 바뀐 접전이었다.`; else if(ord&&mb.length&&!leads) t+=` ${nm(ord[0])}이(가) 끝까지 앞섰다.`; if(dv&&ord) t+=` 꼴찌 ${nm(ord[ord.length-1])}은(는) 바로 유배지로 갔다.`;
    A.push({k:'main',ic:G?G.emoji:'🎮',title:'메인 매치',sub:G?G.title:'',text:t,strip:mb.filter(b=>b.k!=='last').slice(-6).map(b=>({r:b.r,k:b.k,t:qq(b.t.replace(/^\d+라운드\s*/,''))})),key:key&&key.w>=1?{when:key.r?`${key.r}라운드`:'',text:key.t.replace(/^\d+라운드\s*/,'')}:null,
      chips:ord?[`🏅 ${nm(ord[0])}`,`${dv?'🏝️':'⬇️'} ${nm(ord[ord.length-1])}`]:e.team?[`🏅 ${e.team.map(nm).join('·')}`]:[]}); }
  if(!dv){ const pk=E.find(x=>x.k==='pick'), cand=pk?pk.a:null, tok=notes.filter(x=>/징표를 써서/.test(x)).map(x=>(x.match(/🛡️ (.+?) 생명의 징표를 써서/)||[])[1]).filter(Boolean);
    let t=cand?(e.team?`진 팀 투표에서 ${nm(cand)}이(가) ${E.filter(x=>x.k==='vote'&&x.b===cand).length}표로 후보가 됐다.`:`꼴찌권에서 ${nm(cand)}이(가) 데스매치 후보가 됐다.`):'후보가 정해졌다.'; if(tok.length) t+=` ${tok.join('·')}은(는) 생명의 징표로 피했다.`;
    A.push({k:'cand',ic:'⚖️',title:'후보 결정',sub:e.team?'진 팀 투표':'꼴찌',text:t,chips:cand?[`⚖️ 후보 ${nm(cand)}`,...tok.map(x=>`🛡️ ${x}`)]:[]});
    const q=pk&&s.chat.filter(x=>x.r===ep&&x.seat===pk.a&&x.t===pk.b&&!x.note).slice(-1)[0], lob=E.filter(x=>x.k==='push'&&x.ep===ep&&x.a!==(pk&&pk.a)).slice(-2), db=Bt.filter(b=>DG&&b.ph.includes(DG.title)).sort((a,b)=>b.w-a.w)[0];
    const t2=`${lob.length?`로비에서 ${[...new Set(lob.map(x=>nm(x.a)))].join('·')}이(가) 몰아가기를 했고, `:''}${pk?`${nm(pk.a)}은(는) ${nm(pk.b)}을(를) 지목했다${q?` — "${qq(q.text)}"`:''}. `:''}${DG?`「${DG.title}」에서 `:''}${nm(R.w)}이(가) 이기고 ${nm(R.l)}이(가) 떠났다.`;
    A.push({k:'death',ic:'⚔️',title:'지목 · 데스매치',sub:DG?DG.title:'',text:t2,key:db&&db.w>=1.2?{when:'',text:db.t.replace(/^\d+라운드\s*/,'')}:null,chips:[...(pk?[`👉 ${nm(pk.a)} → ${nm(pk.b)}`]:[]),`💀 ${nm(R.l)}`]}); }
  else { const live=aliveIds(s).length, jail=e.jail||[];
    A.push({k:'split',ic:'🎖️',title:'구제 · 감옥동',sub:'연맹의 징표',text:`${ord?`1위 ${nm(ord[0])}이(가) 연맹의 징표를 받았다. `:''}${e.fedSave?`${nm(e.fedSave)}을(를) 감옥동에서 구했다. `:'아무도 구하지 않았다. '}${jail.length?`감옥동은 ${jail.map(nm).join('·')}.`:''}`,chips:[...(e.fedSave?[`🎖️ ${nm(e.fedSave)} 구제`]:[]),...(jail.length?[`⛓️ ${jail.length}명`]:[])]});
    const db=Bt.filter(b=>DG&&b.ph.includes(DG.title)).sort((a,b)=>b.w-a.w)[0];
    A.push({k:'prison',ic:'⛓️',title:'감옥 매치',sub:DG?DG.title:'',text:`${DG?`「${DG.title}」 — `:''}${nm(R.w)}이(가) 1위로 버티고, 꼴찌 ${nm(R.l)}이(가) 유배지로 갔다. 남은 ${live}명.`,key:db&&db.w>=1.2?{when:db.r?`${db.r}라운드`:'',text:db.t.replace(/^\d+라운드\s*/,'')}:null,chips:[`🏝️ ${nm(R.l)}`]}); }
  const fin=dv?DG:G, pool=Bt.filter(b=>!dv||!DG||b.ph.includes(DG.title)), all=(pool.length?pool:Bt).slice().sort((a,b)=>b.w-a.w)[0], kt=all&&all.w>=1.2?qq(all.t.replace(/^\d+라운드\s*/,'').replace(/\s*\((?!(?:가|는|를|과|이|와|을|은)\))[^)]*\)/g,'')):'';   /* 괄호 설명은 빼되 조사 표시 (가)(는)… 는 남김 */
  const logline=`${kt?kt+' — ':''}${fin?`「${fin.title}」 끝에 `:''}${nm(R.l)} ${dv?'유배':'탈락'}`;   /* 데블스는 그날 떠난 사람이 나온 감옥 매치 기준 */
  const syn=A.filter(a=>!/^조용한/.test(a.text)).map(a=>a.text.replace(/\s*—\s*"[^"]*"/,'')).join(' ');
  return {acts:A,logline,syn}; }
/* AI 요약 작가 답을 4막에 합침 — 문장만 바꾸고 칩·승부처 띠는 규칙 그대로 */
function recapMerge(s,R,r){ if(!R.beats) R.beats=R.beats0; if(!r) return; const lg=clean(r.logline).slice(0,70), sy=clean(r.synopsis).slice(0,420); if(lg){ R.headline=lg; R.recapAI=true; } if(sy) R.syn=sy;
  for(const a of r.acts||[]){ const A=(R.acts||[]).find(x=>x.k===clean(a.k)); const t=clean(a.text).slice(0,260); if(A&&t) A.text=t; } const sc=clean(r.secret).slice(0,160); if(sc) R.secret=sc; }
function recapRule(s,ep,R0){ const e=s.eps.find(x=>x.ep===ep)||{}, R=R0||s.rep&&s.rep[ep], E=(s.evl||[]).filter(x=>x.ep===ep), T=(s.tlog||[]).filter(x=>x.ep===ep), B=[];
  const K={ally:(a,b)=>`${nm(a)}와(과) ${nm(b)}이(가) 손잡음`,deal:(a,b)=>`${nm(a)}이(가) ${nm(b)}에게 가넷으로 부탁`,betray:(a,b)=>`${nm(a)}이(가) ${nm(b)}을(를) 배신`,push:(a,b)=>`${nm(a)}이(가) ${nm(b)}을(를) 몰아감`};
  const rest=T.filter(x=>/휴식|개막/.test(x.ph)).map(x=>x.t).concat(E.filter(x=>x.k==='ally'||x.k==='betray').map(x=>K[x.k](x.a,x.b))).slice(0,4);
  if(rest.length) B.push({when:'☕ 휴식 시간',title:'물밑 작업',story:rest.join('. ')+'.',id:null,q:''});
  const G=e.game&&G_(e.game); if(G) B.push({when:`${G.emoji} 메인 매치`,title:e.order?`「${G.title}」 1위 ${nm(e.order[0])}`:`「${G.title}」 팀전`,story:e.order?`순위는 ${e.order.map(nm).join(' > ')}. 꼴찌 쪽에서 데스매치 후보가 나왔어요.`:`이긴 팀: ${(e.team||[]).map(nm).join('·')}.`,id:null,q:''});
  const lob=E.filter(x=>x.k==='deal'||x.k==='push').map(x=>K[x.k](x.a,x.b)).slice(0,3), pk=E.find(x=>x.k==='pick');
  if(pk||lob.length) B.push({when:'🏛️ 로비',title:pk?`후보 ${nm(pk.a)}, ${nm(pk.b)} 지목`:'로비 시간',story:(lob.length?lob.join('. ')+'. ':'')+(pk?`결국 ${nm(pk.a)}은(는) ${nm(pk.b)}을(를) 데스매치 상대로 골랐어요.`:''),id:null,q:''});
  if(R) B.push({when:'⚔️ 데스매치',title:`${nm(R.w)} 생존, ${nm(R.l)} 탈락`,story:`${R.dg&&G_(R.dg)?'「'+G_(R.dg).title+'」에서 ':''}${nm(R.w)}이(가) 살아남고 ${nm(R.l)}이(가) 떠났어요.`,id:s.byeTxt&&s.byeTxt[R.l]?R.l:null,q:s.byeTxt&&s.byeTxt[R.l]?String(s.byeTxt[R.l]).slice(0,60):''});
  return B; }
/* 🗣️ 최후 변론 심사 — 듣는 동물(투표하는 진 팀 / 후보 + 둘)이 설득됐는지 정하고 한마디. 관계가 바뀌고, 투표·지목 때 시야에 들어감 */
const PSCH={type:'object',properties:{moved:{type:'boolean'},say:{type:'string'},memo:{type:'string'}},required:['moved','say','memo'],additionalProperties:false};
function pleaJudge(s,P){ P=P||(s.pleas||[]).find(x=>x.id===s.show.pid); if(!P) return; const live=showOn(s)&&s.show.pid===P.id; if(live&&Date.now()-s.show.at<2000+P.text.length*45) return;   /* 다 말한 뒤에 반응 */
  for(const j of P.judges){ if(P.res[j]||!pl(s,j)||pl(s,j).out) continue;
    const r=need(s,`${P.ep}:plea:${P.id}:${j}`,()=>aiOn()&&AIB.json(SYS,view(s,j)+'\n\n[지금 할 일] '+`${nm(P.who)}(사람)이 모두 앞에서 최후 변론을 했다: "${P.text}". ${P.ph==='vote'?'지금은 진 팀 투표 — 누구를 데스매치 후보로 보낼지 정하는 중':s.cand===j?'너는 데스매치 후보이고 곧 상대를 지목한다':`후보 ${nm(s.cand)}이(가) 곧 데스매치 상대를 지목한다`}. 이 변론에 설득됐는지(moved) 정하고, 네 말투로 짧게 반응해라(say, 15~40자, 설득됐으면 왜, 아니면 왜). 근거가 그럴듯하거나(지난 회 기록·약속과 맞음), 너에게 이득이거나, 관계가 좋으면 설득될 수 있다. 근거 없는 부탁·남 탓만 하는 말엔 안 넘어간다. 네 성격대로.`,PSCH,{model:'haiku',bg:true}));   /* bg: 기다리는 동안에도 진행(연출 시간)이 흐르게 */
    if(r===undefined) continue; memo(s,j,r); const moved=r?!!r.moved:Math.random()<.4+rel(s,j,P.who)*.4; const say=r&&shortSay(r.say,70)||pickLine(s,j,moved?['음… 일리 있네요. 이번엔 봐줄게요','그 말 믿어 볼게요ㅎㅎ']:['말은 잘하는데요~ 글쎄요','그래도 이번엔 어쩔 수 없어요ㅠㅠ']);
    P.res[j]={moved,say}; addRel(s,j,P.who,moved?.35:-.08); if(moved) bond(s,j,P.who,'moved'); talk(s,j,say,P.who,moved?'trust':'say'); }
  const all=P.judges.every(j=>P.res[j]||!pl(s,j)||pl(s,j).out); if(!live) return;
  if(all&&s.show.until-Date.now()>3500) s.show.until=Date.now()+3500;   /* 다 반응했으면 곧 끝 */
  else if(!all&&s.show.until-Date.now()<2500&&Date.now()-s.show.at<40000) s.show.until=Date.now()+2500;   /* 아직이면 조금 더(최대 40초) */ }
function afterDeath(s){ if(isDev(s)){ curseEnd(s); if(!s.revDone&&s.ep>=2&&s.players.filter(x=>x.out&&x.ex).length>=3&&alive(s).length>=4) return startRevival(s); } if(alive(s).length<=2) return startFinal(s); startRest(s); }
function startFinal(s){ const [a,b]=aliveIds(s); s.cand=a; s.oppo=b; s.final={games:S1F.filter(id=>G_(id)).concat(['hexagon','dicepoker']).slice(0,3),idx:0,score:{[a]:0,[b]:0}};
  mc(s,'final',{a:nm(a),b:nm(b)}); sys(s,`🏆 결승전 — ${nm(a)} vs ${nm(b)} · 3판 2선승: 「${s.final.games.map(x=>G_(x).title).join('」 「')}」`,'host'); s.phase='finalWait'; setDL(s); clearReady(s); s.notice='🏆 결승전'; s.pred={kind:'final',opts:[a,b],picks:{},until:Date.now()+36e5,wait:Date.now()+20000}; }
function finalNext(s){ const F=s.final, id=F.games[F.idx]; s.death=id; sys(s,`🎮 결승 ${F.idx+1}판 「${G_(id).title}」`,'host');
  if(F.idx===0&&s.pred) s.pred.closed=true;
  const a=s.cand,b=s.oppo; if(!isHum(a)&&!isHum(b)){ if(aiOn()&&NAT[id]){ s.phase='final'; s.nm=NAT[id].start(s,[a,b],'final',{fast:true}); s.nm.fast=true; s.notice=`🏆 결승 ${F.idx+1}판 「${NAT[id].title}」`; return; } finalScore(s,simDuel(a,b)); return; }
  if(NAT[id]){ s.phase='final'; s.nm=NAT[id].start(s,[a,b],'final'); return; }
  startSub(s,'final',id,[a,b].sort((x,y)=>(isHum(y)?1:0)-(isHum(x)?1:0))); }
function finalScore(s,w){ const F=s.final; F.score[w]++; sys(s,`🏁 결승 ${F.idx+1}판 승자: ${nm(w)} (${nm(s.cand)} ${F.score[s.cand]} : ${F.score[s.oppo]} ${nm(s.oppo)})`,'win'); F.idx++;
  if(F.score[w]>=2||F.idx>=F.games.length) return champion(s,w); s.phase='finalWait'; setDL(s); clearReady(s); }
function champion(s,w){ if(s.pred&&s.pred.kind==='final') predResolve(s,w); s.champ=w; s.phase='champ'; const L=aliveIds(s).find(x=>x!==w); if(L) pl(s,L).out=s.ep+1;
  sys(s,`👑 ${isDev(s)?'데블스 플랜':'더 지니어스'} · 놀이터 시즌 우승 — ${nm(w)}!`,'win');
  const top=o=>Object.entries(o||{}).sort((a,b)=>b[1]-a[1])[0];
  sys(s,'🎙️ 시상식을 시작합니다','host');
  { const t=top(s.stat.win); if(t) sys(s,`🏅 메인 매치 MVP — ${nm(t[0])}`,'win'); }
  { const t=s.players.slice().sort((a,b)=>b.g-a.g)[0]; sys(s,`🟣 가넷왕 — ${nm(t.id)} (${t.g}개)`,'win'); }
  { const t=top(s.stat.survive); if(t) sys(s,`⚔️ 데스매치 생존왕 — ${nm(t[0])} (${t[1]}번)`,'win'); }
  { const t=top(s.stat.pred); if(t){ const all=Object.keys(s.stat.pred).filter(k=>s.stat.pred[k]===t[1]); sys(s,`🔮 예언왕 — ${all.map(nm).join(' · ')} (${t[1]}번 적중)`,'win'); } }
  { const t=top(s.stat.betray); sys(s,t?`🗡️ 배신왕 — ${nm(t[0])}`:'🕊️ 배신왕 — 없음! 의리 있는 시즌이었어요',t?'bad':'win'); }
  s.winner=isHum(w)?coreP(w):'none'; s.winners=isHum(w)?[coreP(w)]:[]; s.notice=`👑 우승 — ${nm(w)}`; }

/* ───────── 동물의 차례(대사·판단) — AI 있으면 Claude, 없으면 단순 규칙 ───────── */
const FB={
  intro:['잘 부탁해요~ 이번엔 끝까지 가 볼게요!','반가워요! 다들 살살 해 주세요ㅎㅎ','우승은 제 거예요… 아마도요ㅋㅋ'],
  rest:['이번 판 같이 할 사람~?','다들 작전 짜는 중이에요? 저도 끼워 줘요','이번엔 조용히 살아남고 싶어요ㅠㅠ'],
  lobby:['저는 빼 주세요ㅠㅠ 다음에 꼭 도울게요','혹시 저 말고 다른 사람… 안 될까요?','저랑은 하지 마요~ 우리 사이잖아요'],
  bye:['아… 여기까지네요ㅠㅠ 다들 끝까지 잘해요','즐거웠어요! 밖에서 응원할게요👋','억울하지만 인정! 잘 싸웠어요'],
};
function runQ(s){ const q=s.aq[0]; if(!q) return false; const i=q.i; if(i&&pl(s,i)&&pl(s,i).out&&q.k!=='bye'&&q.k!=='exTalk'&&q.k!=='exReply'&&!(q.k==='say'&&s.phase==='revival')){ s.aq.shift(); return true; }
  const done=()=>{ s.aq.shift(); s.typing=null; s.seq++; };
  if(q.k==='exTalk'||q.k==='exReply'){ const P=pl(s,i); if(!P||!P.out){ s.aq.shift(); return true; }
    const task=q.k==='exReply'?`너는 유배지에 있다(탈락했지만 패자부활전 기회가 남아 있을 수 있다). 같은 유배지의 ${nm(q.h)}이(가) 유배지 방에서 말했다: "${q.text}". 본선 사람들은 못 듣는다. 네 말투로 짧게 대답(본선 판 얘기·누가 미웠는지·부활 작전·위로·장난).`:`너는 유배지에 있다(같이 있는 사람: ${exiles(s).filter(x=>x!==i).map(nm).join('·')}). 본선은 ${s.ep}일차, 남은 사람 ${alive(s).length}명. 유배지 방에서 짧게 한마디(본선 판 훈수·누가 이길지·너를 떨어뜨린 사람 얘기·부활하면 뭘 할지).`+(exLog(s)?'\n[유배지 최근 대화]\n'+exLog(s):'');
    const r=need(s,`${s.seq}:${q.k}:${i}`,()=>ask(s,i,task,SCH.say,'haiku')); if(r===undefined){ s.typing=i; return true; } memo(s,i,r);
    const say=r?shortSay(r.say,90):(q.k==='exReply'?pickLine(s,i,['여기도 나쁘지 않네요','부활하면 복수해요','아직 안 끝났어요']):''); if(say) exSay(s,i,say); done(); return true; }
  if(q.k==='rescue'){ const R=s.rescue; if(!R||R.done||s.phase!=='rescue'){ s.aq.shift(); return true; }
    const r=need(s,`${s.seq}:rescue:${i}`,()=>ask(s,i,`너는 메인 매치 1위라 연맹의 징표를 받았다. 감옥동에 갈 ${R.pool.map(nm).join(', ')} 중 한 명을 생활동으로 구할 수 있다(target, 아무도 안 구하면 "없음").${R.swap?` 감옥 인원이 최소라 누군가를 구하면 생활동의 ${nm(R.swap)}이(가) 대신 감옥동으로 내려간다 — 그 사람과의 관계도 따져라(${bondLine(s,i,R.swap)}).`:''} 연합·약속·거래·빚(받은 은혜)·누가 감옥 매치에서 떨어지면 좋을지(비밀 임무가 있다면 그것도)를 따져라. 구해 주면 그 사람은 너에게 빚을 진다. say에 모두 앞에서 할 한마디(근거 짧게).\n[선택지 표 — 코드가 계산함. 점수가 높을수록 구해 줄 만한 사람]\n${optTable(s,i,R.pool,rescueScore)}`,pickSch(R.pool.map(nm).concat('없음'))));
    if(r===undefined){ s.typing=i; return true; } memo(s,i,r); s.aq.shift(); s.typing=null; s.seq++;
    let t=r&&idOf(s,r.target); if(!R.pool.includes(t)) t=r?null:R.pool.slice().sort((a,b)=>rescueScore(s,i,b)-rescueScore(s,i,a))[0];
    if(!r&&t&&(rescueScore(s,i,t)<.15||(R.swap&&rescueScore(s,i,R.swap)>rescueScore(s,i,t)))) t=null; if(t&&s.curse&&s.curse.who===i&&s.curse.t===t&&!s.curse.res) t=null;
    const say=r?shortSay(r.say,90):''; if(say) talk(s,i,say,t,t?'trust':'say'); doRescue(s,t); return true; }
  if(q.k==='intro'||q.k==='rest'||q.k==='lobby'||q.k==='bye'||q.k==='candTalk'||q.k==='say'){
    const task= q.k==='intro'?'개막식이다. 다른 참가자들에게 첫인사 한마디(성격이 드러나게, 짧게).'
      : q.k==='say'?q.task
      : q.k==='rest'?`${natOn(s)?(s.phase==='match'?'메인 매치':s.phase==='prison'?'감옥 매치':s.phase==='revival'?'패자부활전':'데스매치')+' 중이다(위 게임 상황 참고). 테이블에서':'휴식 시간이다. 테이블에서'} 한마디 하거나(say), 사람 참가자 한 명에게 몰래 귓속말(dmTo에 이름, dm에 내용)로 연합·거래·정보를 제안할 수 있다(offer: 연합 제안이면 ally). invite: 네 연합에 들이고 싶은 참가자 이름(동물끼리도 좋다 — 사람에게만 몰리지 말고, 없으면 "") — 연합은 여러 명이 뭉칠 수 있다(필승 구도면 크게 뭉치기, 너무 커지면 견제). 할 말 없으면 say는 "".`
      : q.k==='lobby'?`로비 시간이다. 데스매치 후보는 ${nm(s.cand)}이다. 후보에게 너를 지목하지 말라고 부탁하거나, 다른 사람을 지목하라고 근거를 대며 몰아가는 말을 한다(to에 후보 이름).\n${lobbyTable(s,i)}`
      : q.k==='candTalk'?'너는 데스매치 후보다. 다들 앞에서 한마디(억울함·각오·떠보기).'
      : q.dv?`너는 방금 ${q.dv==='main'?'메인 매치 꼴찌로':'감옥 매치 꼴찌로'} 유배지로 떠난다(패자부활전 기회가 있을지도). 떠나며 한마디.`:`너는 방금 데스매치에서 ${nm(q.w)}에게 져서 탈락했다. 떠나며 한마디.`;
    const r=need(s,`${s.seq}:${q.k}:${i}`,()=>ask(s,i,task,q.k==='rest'||q.k==='say'?SCH.rest:SCH.say,q.k==='say'?(q.model||undefined):q.k==='lobby'||q.k==='candTalk'||q.k==='intro'||q.k==='bye'?'haiku':undefined));
    if(r===undefined){ s.typing=i; return true; } memo(s,i,r);
    let say=r?shortSay(r.say):(q.k==='say'?(q.fb&&!aiOn()?pickLine(s,i,q.fb):''):pickLine(s,i,FB[q.k==='candTalk'?'lobby':q.k])); const to=r?idOf(s,r.to):(q.k==='lobby'?s.cand:null);
    if(say) talk(s,i,say,to&&to!==i?to:null,r&&r.tone||'say'); if(q.k==='bye'&&say) (s.byeTxt=s.byeTxt||{})[i]=say;
    if(q.k==='rest'&&r&&r.dm){ const h=idOf(s,r.dmTo); const k_='dm'+s.ep+(s.phase||''); s.dmCap=s.dmCap||{}; if(h&&isHum(h)&&!pl(s,h).out&&(s.dmCap[k_+h]||0)<2){ s.dmCap[k_+h]=(s.dmCap[k_+h]||0)+1; const off=r.offer==='ally'&&!isAlly(s,i,h)?{kind:'ally',st:'wait'}:null; dmPush(s,h,i,i,shortSay(r.dm,120),off); meet(s,[i,h],'dm'); } }
    if((q.k==='rest'||q.k==='say')&&r&&r.invite){ const t=idOf(s,r.invite); if(t&&t!==i) allyInvite(s,i,t); }
    if(q.k==='rest'&&!r&&Math.random()<.3+trait(s,i,'talk')*.4){ const hs=humansAlive(s); const h=hs.sort((a,b)=>allyWorth(s,i,b)-allyWorth(s,i,a))[0]; if(h&&allyWorth(s,i,h)>.05&&!isAlly(s,i,h)) dmPush(s,h,i,i,'우리 몰래 손잡을래요? 서로 데스매치로 안 부르기🤝',{kind:'ally',st:'wait'}); }
    done(); return true; }
  if(q.k==='aInv'){ const A=(s.alli||[]).find(B=>B.id===q.a); if(!A||A.inv[i]!=='wait'||A.mem.includes(i)){ s.aq.shift(); return true; }
    const r=need(s,`${s.seq}:ainv:${i}:${q.a}`,()=>ask(s,i,`${nm(q.from)}이(가) 너를 연합 「${A.name}」(연합원: ${A.mem.map(nm).join('·')})에 초대했다. 받을지(accept) 정해라 — 지금 네 연합(${allysOf(s,i).map(B=>B.name).join(', ')||'없음'} — 여러 연합에 동시에 들 수 있다), 연합원과의 관계, 이 연합이 이길 구도인지, 너무 커서 견제당할지, 네 성격을 따져라. say는 연합방(받으면) 또는 초대한 사람에게 할 한마디.\n[연합원마다 손잡을 가치 — 코드가 계산함] ${A.mem.map(x=>`${nm(x)} ${allyWorth(s,i,x)>=0?'+':''}${allyWorth(s,i,x).toFixed(2)}${BX(s,i,x).g>=.5?'(원한 깊음)':''}`).join(', ')} · 평균 ${(A.mem.reduce((t,x)=>t+allyWorth(s,i,x),0)/A.mem.length).toFixed(2)} · 연합 크기 ${A.mem.length+1}명${A.mem.length+1>=Math.ceil(alive(s).length/2)?' — 과반이라 밖에서 견제당할 수 있다':''}`,SCH.dm,'haiku'));
    if(r===undefined){ s.typing=i; return true; } memo(s,i,r);
    const aw=A.mem.reduce((t,x)=>t+allyWorth(s,i,x),0)/A.mem.length, ok=r?!!r.accept:(aw>-.05&&A.mem.every(x=>BX(s,i,x).g<.6)&&Math.random()<.55+trait(s,i,'trust')*.3+aw*.3);
    if(ok){ allyJoin(s,i,A); const t=r&&shortSay(r.say,90); A.chat.push({from:i,text:t||pickLine(s,i,['좋아요! 같이 가요🤝','저 끼워 줘서 고마워요ㅎㅎ','우리 끝까지 가요!']),ep:s.ep}); }
    else { A.inv[i]='no'; aSys(A,`🙅 ${nm(i)}이(가) 초대를 거절했어요`); if(isHum(q.from)&&r&&r.say) dmPush(s,q.from,i,i,shortSay(r.say,90)); addRel(s,i,q.from,-.02); bond(s,q.from,i,'refuse'); }
    done(); return true; }
  if(q.k==='aReply'||q.k==='aTalk'){ const A=q.a?(s.alli||[]).find(B=>B.id===q.a&&B.mem.includes(i)):U.pick(allysOf(s,i)); if(!A){ s.aq.shift(); return true; }
    const task=q.k==='aReply'?`연합 「${A.name}」 방에서 ${nm(q.from)}이(가) 말했다: "${q.text}". 연합원끼리만 보는 방이다. 네 말투로 짧게 대답(작전 동의·반대·제안, 솔직하게 또는 속내 숨기고).`
      :`연합 「${A.name}」(${A.mem.map(nm).join('·')}) 방에서 작전 한마디 — 지금 단계(${phaseName(s)})에서 연합이 어떻게 움직일지(누구를 지목·투표할지, 게임에서 서로 어떻게 도울지, 누구를 들일지) 제안. 근거 짧게.`;
    const r=need(s,`${s.seq}:${q.k}:${i}:${A.id}`,()=>ask(s,i,task,SCH.rest,'haiku')); if(r===undefined){ s.typing=i; return true; } memo(s,i,r);
    const t=r&&shortSay(r.say,110); if(t){ A.chat.push({from:i,text:t,ep:s.ep}); const o=q.from&&q.from!==i?q.from:U.pick(A.mem.filter(x=>x!==i&&pl(s,x)&&!pl(s,x).out)); if(o) meet(s,[i,o],'al'); } if(r&&r.invite){ const x=idOf(s,r.invite); if(x&&x!==i) allyInvite(s,i,x,A.id); }
    done(); return true; }
  if(q.k==='rmReply'){ const h=q.h, room=whereOf(s,h); if(room==='lounge'||room!==q.room||whereOf(s,i)!==room){ s.aq.shift(); return true; }
    const others=[h,...roomMates(s,h)].filter(x=>x!==i);
    const r=need(s,`${s.seq}:rm:${i}:${h}:${(q.text||'').length}:${s.chat.length}`,()=>ask(s,i,q.text?`${roomName(room)}(밀실)에서 ${nm(h)}(사람)이 말했다: "${q.text}". 이 방엔 ${others.map(nm).join('·')}만 있고 다른 사람은 못 듣는다. 네 말투로 답해라(say). 제안·거래면 받을지(accept) 정한다(성격·관계·이득대로). 거짓말·떠보기도 된다.\n${allyLine(s,i,h)}`:`${nm(h)}(사람)이 네가 있는 ${roomName(room)}(밀실)으로 걸어 들어왔다. 이 방엔 ${others.map(nm).join('·')}만 있다. 네 말투로 짧게 한마디(반가움·경계·떠보기, 관계대로). accept는 false.`,SCH.dm));
    if(r===undefined){ s.typing=i; return true; } memo(s,i,r);
    const say=r?shortSay(r.say,120):(aiOn()?'':pickLine(s,i,q.text?['음… 여기서만 하는 얘기죠?ㅎㅎ','좋아요, 기억해 둘게요!','에이~ 그건 좀 어렵겠는데요']:['어? 오셨어요?ㅎㅎ','여기 조용해서 좋죠~','앗 깜짝이야!']));
    if(say){ const to=[i,...roomMates(s,i)]; s.chat.push({r:s.ep,seat:i,text:say,t:h,kind:'say',secret:1,room,to}); }
    if(q.text&&r&&r.accept&&BX(s,i,h).g<.6&&/연합|손잡|같은 편|편 해|약속|뭉치/.test(q.text)&&!isAlly(s,i,h)){ const N_=joinAlly(s,h,i); dmPush(s,h,i,-1,`🤝 연합 성사 — 「${(N_||{}).name||'연합'}」 (오른쪽 🤝 연합방)`); addRel(s,i,h,.25); }
    else if(r&&q.text) addRel(s,i,h,r.accept?.1:-.03);
    done(); return true; }
  if(q.k==='dmReply'){ const h=q.h; const r=need(s,`${s.seq}:dm:${i}:${h}`,()=>ask(s,i,`${nm(h)}(사람)이 너에게 몰래 귓속말했다: "${q.text}". 둘만 듣는다. 네 말투로 답해라(say). 제안·거래면 받을지(accept) 정한다(성격·관계·이득대로). 거짓말·떠보기도 된다.\n${allyLine(s,i,h)}`,SCH.dm));
    if(r===undefined){ s.typing=i; return true; } memo(s,i,r);
    const say=r?shortSay(r.say,120):pickLine(s,i,['음… 생각해 볼게요ㅎㅎ','좋아요, 기억해 둘게요!','에이~ 그건 좀 어렵겠는데요']);
    dmPush(s,h,i,i,say); meet(s,[i,h],'dm'); if(r&&r.accept&&BX(s,i,h).g<.6&&/연합|손잡|같은 편|편 해|약속|뭉치/.test(q.text)&&!isAlly(s,i,h)){ const N_=joinAlly(s,h,i); dmPush(s,h,i,-1,`🤝 연합 성사 — 「${(N_||{}).name||'연합'}」 (오른쪽 🤝 연합방)`); addRel(s,i,h,.25); }
    else if(r) addRel(s,i,h,r.accept?.1:-.03);
    done(); return true; }
  if(q.k==='vote'){ const V=s.vote; if(!V||V.votes[i]){ s.aq.shift(); return true; } if(s.voteHold&&Date.now()<s.voteHold){ s.aq.push(s.aq.shift()); return true; } const pool=V.pool.filter(x=>x!==i);
    const r=need(s,`${s.seq}:vote:${i}`,()=>ask(s,i,`진 팀 투표다. 데스매치 후보로 보낼 사람 한 명(target). say에 짧은 이유(근거).\n[선택지 표 — 코드가 계산함. 점수가 높을수록 후보로 보내기 좋은 사람(원한·믿음·빚·연합·강자 견제·화살 몰림 반영)]\n${optTable(s,i,pool,voteScore)}`,pickSch(pool.map(nm))));
    if(r===undefined){ s.typing=i; return true; } memo(s,i,r);
    let t=r&&idOf(s,r.target); if(!pool.includes(t)) t=pool.slice().sort((a,b)=>voteScore(s,i,b)-voteScore(s,i,a))[0];
    betrayCheck(s,i,t,'표를 던졌어요'); V.votes[i]=t; talk(s,i,`🗳️ ${nm(t)}에게 한 표${r&&r.say?' — '+shortSay(r.say,70):''}`,t,'acc'); done(); return true; }
  if(q.k==='pick'){ const c=s.cand, E=eligible(s,c);
    const r=need(s,`${s.seq}:pick:${c}`,()=>ask(s,c,`너는 데스매치 후보다. 1:1 데스매치 상대를 지목한다(target). 연합·거래 약속, 받은 부탁, 이길 만한 상대, 나를 해친 사람(원한), 도와준 사람(빚)을 따져라. say에 지목 한마디(근거, 귀엽게 — 지난 일을 근거로 꺼내도 좋다).\n[선택지 표 — 코드가 계산함. 점수가 높을수록 지목하기 좋은 상대(이길 확률·원한·빚·연합·거래·화살 몰림 반영). 꼭 1등을 고를 필요는 없지만 고른 근거가 표에 있어야 한다]\n${optTable(s,c,E,score,x=>` · 데스매치 이길 확률 약 ${Math.round(winP(s,c,x)*100)}%${pl(s,x).g?` · 가넷 ${pl(s,x).g}`:''}`)}`,pickSch(E.map(nm))));
    if(r===undefined){ s.typing=c; return true; } memo(s,c,r);
    let t=r&&idOf(s,r.target); if(!E.includes(t)) t=E.slice().sort((a,b)=>score(s,c,b)-score(s,c,a))[0];
    s.aq.shift(); s.typing=null; s.seq++; betrayCheck(s,c,t,'데스매치 지목을 했어요'); nominate(s,c,t,r?shortSay(r.say,90):pickLine(s,c,[`미안해요 ${nm(t)}ㅠㅠ 이번엔 저랑 해요`,`${nm(t)}, 저랑 한 판 해요!`])); return true; }
  if(q.k==='recap'){ const R=s.rep&&s.rep[q.ep]; if(!R){ s.aq.shift(); return true; } const r=need(s,`${q.ep}:recap`,()=>recapAsk(s,q.ep)); if(r===undefined) return true;
    recapMerge(s,R,r); s.aq.shift(); return true; }
  if(q.k==='report'){ const R=s.rep&&s.rep[q.ep]; if(!R){ s.aq.shift(); return true; } const r=need(s,`${q.ep}:report`,()=>reportAsk(s,q.ep)); if(r===undefined) return true;
    if(r){ if(!R.recapAI) R.headline=clean(r.headline).slice(0,60)||R.headline; R.sub=clean(r.sub).slice(0,80)||R.sub; R.next=clean(r.next).slice(0,120)||R.next; const sc=(r.scenes||[]).map(x=>({id:idOf(s,x.who),q:clean(x.quote).slice(0,90),why:clean(x.why).slice(0,80),tag:clean(x.tag).slice(0,10)})).filter(x=>x.id&&x.q); if(sc.length) R.scenes=sc.slice(0,3); }
    R.ai=true; s.aq.shift(); return true; }
  s.aq.shift(); return true; }
/* 🔭 시즌 전망 (2026-11-12 사용자: "자기와 상대만이 아니라 미래 전망, 다른 사람들과의 관계·전망까지") —
   fearOf: 남이 나에게 품은 앙심(보복 위험). 동물은 그쪽 관계 축, 사람은 내가 그 사람을 지목·투표·몰아가기·배신한 기록으로 짐작.
   candOdds: 이번 회 후보(지니어스 데스매치 후보 / 데블스 꼴찌) 될 가능성 — 메인 매치 중이면 지금 점수 순위, 아니면 약자일수록.
   outlook: 그 후보들이 나를 지목할 확률까지 곱한 "이번 회 내 위험" + 나에게 앙심 있는 사람 + 결승 라이벌(강자). 지목·투표·구제·연합·동물 시야가 함께 씀. */
function fearOf(s,i,x){ if(!x||x===i) return 0; if(isHum(x)){ const E=(s.evl||[]).filter(e=>e.a===i&&e.b===x&&['pick','vote','push','betray'].includes(e.k)); return Math.min(1,E.length*.25); } return cl01(BX(s,x,i).g+Math.max(0,-rel(s,x,i))*.5); }
function candOdds(s){ const al=aliveIds(s), w={};
  if(s.cand&&al.includes(s.cand)){ w[s.cand]=1; return w; }
  if(natOn(s)&&s.phase==='match'){ const o=al.filter(x=>natSc(s,x)!=null).sort((a,b)=>natSc(s,a)-natSc(s,b)); o.forEach((x,k)=>w[x]=Math.pow(.45,k)); }
  else for(const x of al) w[x]=(isDev(s)||!pl(s,x).tok?1:.15)*(.3+(1-threat(s,x))*.7);
  const T=Object.values(w).reduce((a,b)=>a+b,0)||1; for(const k in w) w[k]/=T; return w; }
function pickOdds(s,c,me){ if(isDev(s)) return 0; const E=eligible(s,c); if(!E.includes(me)) return 0; const v=E.map(x=>Math.exp(1.2*score(s,c,x))), T=v.reduce((a,b)=>a+b,0); return v[E.indexOf(me)]/T; }
function outlook(s,i){ const C=candOdds(s); let danger=(C[i]||0)*(isDev(s)?1:.5); const by=[]; if(!isDev(s)) for(const c in C){ if(c===i||!C[c]) continue; const p=C[c]*pickOdds(s,c,i); danger+=p*.5; if(p>=.04) by.push([c,p]); }
  const foes=aliveIds(s).filter(x=>x!==i&&fearOf(s,i,x)>=.3).sort((a,b)=>fearOf(s,i,b)-fearOf(s,i,a)), rivals=aliveIds(s).filter(x=>x!==i&&!isAlly(s,i,x)).sort((a,b)=>threat(s,b)-threat(s,a)).filter(x=>threat(s,x)>=.2).slice(0,2);
  return {C,danger:Math.min(1,danger),by:by.sort((a,b)=>b[1]-a[1]),foes,rivals}; }
const liveMates=(s,x)=>allyMates(s,x).filter(y=>pl(s,y)&&!pl(s,y).out);
/* 🎯 지목·투표·구제 점수 (NPC 룰 1·2·14·18·20) — 코드가 계산해 AI에겐 선택지 표로, AI가 없으면 이 점수대로 고름 */
function score(s,c,x){ const cd=condOf(s,c); if(cd&&cd.on===x&&(cd.k==='dark'||cd.k==='revenge')) return 9; const o=BX(s,c,x), late=stage(s)===2, D=s.lobby&&s.lobby.deals||{};
  return -rel(s,c,x)-o.t*.6+o.g*1.6-o.d*1.8-(isAlly(s,c,x)?(late?1.1:2.2):0)+((pl(s,x).g-3)*.2*trait(s,c,'aggr'))-(D[x+'>'+c]&&D[x+'>'+c].ok?2.5:0)+(winP(s,c,x)-.5)*2.4-(isHum(x)?heat(s,x)*.5:0)+fearOf(s,c,x)*.8-liveMates(s,x).filter(y=>y!==c).length*.25*(1-winP(s,c,x)*.5)+rnd(0,.4); }   /* 🔭 나를 노리는 사람은 지금 정리, 연합 동료가 많은 사람을 치면 그들이 복수 */
function voteScore(s,i,x){ const o=BX(s,i,x), late=stage(s)===2; return -rel(s,i,x)-o.t*.5+o.g*1.4-o.d*1.6-(isAlly(s,i,x)?(late?1:2):0)+threat(s,x)*(late?1.2:.5)-(isHum(x)?heat(s,x)*.5:0)+fearOf(s,i,x)*.6-liveMates(s,x).filter(y=>y!==i).length*.15+rnd(0,.3); }
function rescueScore(s,i,x){ const o=BX(s,i,x), late=stage(s)===2; return rel(s,i,x)+o.t*.6+o.d*1.2-o.g*1.5+(isAlly(s,i,x)?(late?1:2):0)-threat(s,x)*(late?.8:.2)-fearOf(s,i,x)*.8+liveMates(s,x).filter(y=>!isAlly(s,i,y)&&rel(s,y,i)>-.2).length*.1; }   /* 🔭 나를 미워하는 사람은 안 구함, 구해 주면 그 동료들도 고마워함 */
/* 🤝 손잡을 가치 (룰 7·14·15·18) — 호감·믿음·빚은 +, 원한·나쁜 평판·강자(후반일수록)는 −, 이미 연합이 둘 이상이면 −, 화살이 몰린 사람은 지금 손 내밀면 고마워함(+) */
function allyWorth(s,i,x){ const o=BX(s,i,x), f=(s.fame||{})[x]||{}, late=stage(s)===2; return rel(s,i,x)+o.t*.6+o.d*.5-o.g*1.3-Math.min(2,f.bad||0)*.12-(f.broke||0)/Math.max(2,(f.kept||0)+(f.broke||0))*.3-threat(s,x)*(late?.6:.15)-(allysOf(s,i).length>=2?.25:0)+(heat(s,x)>=2?.2:0)-aliveIds(s).filter(y=>y!==i&&y!==x&&!isHum(y)&&BX(s,y,x).g>=.5).length*.08+(late?0:liveMates(s,x).filter(y=>y!==i&&fearOf(s,i,y)<.3).length*.05); }   /* 🔭 그 사람의 적을 같이 떠안고, 초중반엔 그 사람 편이 크면 + */
/* 🏛️ 로비 표 — 후보가 누구를 지목할 것 같은지(후보 시점 점수) + 내가 몰아가고 싶은 사람(원한·강자·관계) */
function lobbyTable(s,i){ const c=s.cand, E=eligible(s,c); if(!c||!E.length) return ''; const cs=E.map(x=>[x,score(s,c,x)-rnd(0,.4)]).sort((a,b)=>b[1]-a[1]), myR=cs.findIndex(x=>x[0]===i);
  const want=E.filter(x=>x!==i).map(x=>{ const o=BX(s,i,x); return [x,o.g*1.5+threat(s,x)*.8-rel(s,i,x)-o.t*.5-(isAlly(s,i,x)?2:0)-o.d*1.5]; }).sort((a,b)=>b[1]-a[1]).slice(0,3);
  return `[로비 판세 — 코드가 계산함] 후보 ${nm(c)}이(가) 지목할 것 같은 순서(관계·이길 확률·원한 기준): ${cs.slice(0,4).map(([x])=>nm(x)+(x===i?'(너)':'')).join(' > ')}${myR>=0&&myR<=1?' — 너도 위험하다! 너를 빼 달라고 부탁하거나 대가를 제안해라':myR<0?' — 너는 징표가 있어 안전하다':''}
[몰아가고 싶은 상대 — 네 원한·강자 견제·관계 기준] ${want.map(([x,v])=>`${nm(x)}(${v.toFixed(1)}${BX(s,i,x).g>=.3?' 원한':''}${threat(s,x)>=.3?' 강자':''})`).join(', ')||'없음'} — 근거를 대며 몰아가라(근거 없는 지목 금지).`; }
function allyLine(s,i,x){ const w=allyWorth(s,i,x), o=BX(s,i,x); return `[${nm(x)}와(과) 손잡으면 — 코드가 계산함] 손잡을 가치 ${w>=0?'+':''}${w.toFixed(2)} (${bondLine(s,i,x)}${threat(s,x)>=.3?' · 강자라 나중에 위협':''}${allysOf(s,i).length>=2?' · 너는 이미 연합이 많다':''}${heat(s,x)>=2?' · 요즘 화살이 몰려 지금 손 내밀면 크게 고마워할 것':''}). ${o.g>=.6?'원한이 깊다 — 연합은 거절(말로는 떠봐도 된다).':w<-.1?'이득이 없다 — 거절하거나 조건(가넷·다음 판 양보·정보)을 걸어라.':w>.3?'믿을 만하다 — 받아도 좋다.':'애매하다 — 조건을 걸거나 성격대로.'}`; }
/* 선택지 표 — 사람마다 관계 축 + 이 결정에 필요한 숫자 + 계산 점수 */
function optTable(s,i,ids,fn,extra){ return ids.map(x=>`- ${bondLine(s,i,x)}${isHum(x)?' · (사람)':''}${extra?extra(x):''}${isHum(x)&&heat(s,x)>=2?` · 최근 화살 ${heat(s,x)}번 몰림`:''} → 계산 점수 ${fn(s,i,x).toFixed(1)}`).join('\n'); }
const pickSch=(names)=>({type:'object',properties:{target:{type:'string',enum:names},say:{type:'string'},memo:{type:'string'}},required:['target','say','memo'],additionalProperties:false});
function tallyVote(s){ const V=s.vote, cnt={}; for(const k in V.votes){ const t=V.votes[k]; cnt[t]=(cnt[t]||0)+1; addRel(s,t,k,-.3); bond(s,t,k,'vote'); evl(s,k,t,'vote','투표'); }
  const mx=Math.max(0,...Object.values(cnt)); const top=Object.keys(cnt).filter(k=>cnt[k]===mx); let c=U.pick(top.length?top:V.pool);
  if(top.length>1) sys(s,`🎲 ${top.map(nm).join(' · ')} 동점 — 제비뽑기로 정해요`,'host');
  sys(s,`🗳️ 투표 결과 — ${Object.entries(cnt).map(([k,v])=>`${nm(k)} ${v}표`).join(' · ')}`,'host'); s.vote=null; setCand(s,c); }

/* ───────── 🔯 트라이13 · AI판 (2026-11-11 "시즌 게임을 AI 기반으로 새로") ─────────
   12칸 육각별(안쪽 6칸은 이웃 3칸·점수 ×3, 꼭짓점 6칸은 이웃 1칸·×1). 라운드마다 1~9를 몰래 냄.
   내 숫자 + 이웃 숫자 합이 13 이하면 +(내 숫자 × 칸 점수), 넘으면 −. 내기 전에 공개 약속("몇 낼게요")·귓속말 — 거짓말 가능.
   2라운드부터 직전 꼴찌가 원하는 칸으로 옮김(그 칸 사람과 자리 바꿈). 5라운드 합계 1위가 메인 매치 1위.
   동물: 약속·숫자·자리를 AI가 대화·귓속말·지난 배신 기록을 보고 정함. 공개 뒤엔 자기가 실제로 낸 숫자를 알고 말함. */
/* ───────── 🎨 게임판 A안 공통 (2026-11-11 시안 local/season-demo4.html → 사용자 "다 A로") ─────────
   판은 무대 폭을 크게, 위엔 참가자 상태, 가운데 공유 정보, 아래 "내 손" 칸(검정 ga-dock) — 지금 할 일·버튼이 늘 같은 자리에. */
const gaT=end=>end&&end>Date.now()?`<span class="gn-timer" data-dl="${end}">⏱ ${Math.ceil((end-Date.now())/1000)}</span>`:"";
const gaTop=(t,rule)=>`<div class="ga-top"><b>${t}</b><details class="fs-rule"><summary>규칙</summary><small>${rule}</small></details></div>`;
const gaDock=(lbl,body)=>`<div class="ga-dock">${lbl?`<div class="ga-lbl">${lbl}</div>`:''}${body||''}</div>`;
const gaSel=(k,d)=>{ const o=window.__gaSel||{}; return o[k]!=null?o[k]:d; };
const gaB=(a,txt,cls)=>`<button class="${cls||''}" data-nm='${JSON.stringify(a)}'>${txt}</button>`;
/* 💬 판 위 말풍선 (2026-11-11 사용자: "대화창이 겁나 길어서 보기 안 좋아, 말풍선 나오면 좋겠다") — 그 사람이 7초 안에 한 말을 자리 위에 */
function gaLast(v,id){ const C=v.chat||[], now=Date.now(); for(let i=C.length-1;i>=0&&i>=C.length-40;i--){ const c=C[i]; if(c&&c.seat===id&&!c.note&&c.at&&now-c.at<7000) return c.text; } return null; }
const gaSay=(v,id,cls)=>{ const t=gaLast(v,id); return t?`<span class="ga-bub ${cls||''}">${U.esc(t.length>48?t.slice(0,47)+'…':t)}</span>`:''; };
const gaWait=t=>`<div class="ga-wait">${t}</div>`;
const GA_PIP={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
const gaDie=(n,cls,attr)=>n?`<span class="ga-die ${cls||''}" ${attr||''}>${[...Array(9)].map((_,i)=>`<i class="${GA_PIP[n].includes(i)?'p':''}"></i>`).join('')}</span>`:`<span class="ga-die hid ${cls||''}" ${attr||''}>?</span>`;
/* 승부 예측 카드: 색 배경 + 큰 숫자 (예전 🟨7 이모지 숫자가 안 보이던 버그) */
const gaPw=(c,cls)=>!c?`<span class="ga-cd z ${cls||''}">?</span>`:c.v===100?`<span class="ga-cd s ${cls||''}">💯</span>`:c.v===0?`<span class="ga-cd z ${cls||''}">0</span>`:`<span class="ga-cd ${['r','b','y'][c.c]} ${cls||''}">${c.v}</span>`;
/* 의심 베팅 카드 */
const GA_DBK={R:'r',Y:'y',G:'g',B:'b',P:'p',W:'w'};
const gaDb=c=>`<span class="ga-cd ${GA_DBK[c]}">${c==='W'?'🌈':DB_K[c][0]}</span>`;
/* 이항분포 P(X ≥ k), X~B(n,p) — 의심 베팅 "내 패로 본 가능성" */
function gaAtLeast(n,k,p){ if(k<=0) return 1; if(k>n) return 0; let t=0, c=1; for(let i=0;i<=n;i++){ if(i>0) c=c*(n-i+1)/i; if(i>=k) t+=c*Math.pow(p,i)*Math.pow(1-p,n-i); } return t; }
const T13={CELLS:12, LIM:13};
T13.ADJ=[...Array(12)].map((_,c)=> c<6 ? [(c+5)%6,(c+1)%6,c+6] : [c-6]);
T13.DEG=c=>T13.ADJ[c].length;
T13.TRI=(()=>{ const R=78, cx=150, cy=150, V=[...Array(6)].map((_,k)=>[cx+R*Math.cos(Math.PI/3*k-Math.PI/2), cy+R*Math.sin(Math.PI/3*k-Math.PI/2)]);
  const out=[]; for(let k=0;k<6;k++){ const a=V[k], b=V[(k+1)%6]; out[k]=[[cx,cy],a,b]; const mx=(a[0]+b[0])/2, my=(a[1]+b[1])/2; const dx=mx-cx, dy=my-cy, L=Math.hypot(dx,dy); const h=R*Math.sqrt(3)/2; out[k+6]=[a,b,[mx+dx/L*h,my+dy/L*h]]; } return out; })();
const T13_PLAN={type:'object',properties:{say:{type:'string'},promise:{type:'integer'},dmTo:{type:'string'},dm:{type:'string'},memo:{type:'string'}},required:['say','promise','dmTo','dm','memo'],additionalProperties:false};
const T13_PICK={type:'object',properties:{pick:{type:'integer'},memo:{type:'string'}},required:['pick','memo'],additionalProperties:false};
const T13_SEAT={type:'object',properties:{cell:{type:'integer'},say:{type:'string'},memo:{type:'string'}},required:['cell','say','memo'],additionalProperties:false};
NAT.tri13ai={ maxH:12, title:'트라이13', emoji:'🔯', tagline:'내 숫자 + 이웃 숫자가 13을 넘으면 끝 — 약속과 배신의 육각별',
  rule:'라운드마다 1~9를 몰래 내요. <b>내 숫자 + 이웃 숫자 합이 13 이하</b>면 +(내 숫자 × 칸 점수), 넘으면 −(내 숫자 × 칸 점수). 안쪽 칸은 이웃 3명·점수 ×3, 꼭짓점 칸은 이웃 1명·×1. 내기 전에 "몇 낼게요" 공개 약속과 귓속말 — 거짓말도 돼요. 2라운드부터 꼴찌가 원하는 칸으로 자리를 옮겨요. 5라운드 합계 1위!',
  nb(m,id){ const c=m.cell[id]; return c==null?[]:T13.ADJ[c].map(x=>this.at(m,x)).filter(Boolean); },
  at(m,c){ for(const id of m.al) if(m.cell[id]===c) return id; return null; },
  start(s,al){ const cells=U.shuffle([...Array(12).keys()]).slice(0,al.length); const m={id:'tri13ai',R:5,r:0,al:al.slice(),cell:{},pick:{},promise:{},tot:{},hist:[],ph:'talk',until:0,ready:{},plan:{},pk:{},placer:null};
    al.forEach((id,k)=>{ m.cell[id]=cells[k]; m.tot[id]=0; });
    sys(s,'🔯 제'+s.ep+'회 메인 매치 「트라이13」 — 라운드마다 1~9를 몰래 내요. 내 숫자 + 이웃 숫자 합이 13 이하면 득점(안쪽 칸 ×3, 꼭짓점 ×1), 넘으면 감점! 내기 전에 이웃끼리 약속하세요(거짓말 가능). 5라운드 합계 1위가 우승.','host');
    this.next(s,m); return m; },
  next(s,m){ m.r++; m.pick={}; m.promise={}; m.plan={}; m.pk={}; m.ready={}; m.dl=0;
    if(m.r>1){ const lo=Math.min(...m.al.map(x=>m.tot[x])); m.placer=U.pick(m.al.filter(x=>m.tot[x]===lo)); m.ph='seat'; m.until=Date.now()+40000; m.swap=null; m.pitch=Date.now()+(aiOn()?6500:1800);
      { const pc=m.placer, cand=U.shuffle(this.ani(s,m).filter(x=>x!==pc)); const near=cand.filter(x=>this.nb(m,x).length===3).slice(0,1), far=cand.filter(x=>!near.includes(x)).slice(0,1);
        for(const a of near.concat(far)){ const R=this.rec(m,pc); s.aq.push({k:'say',i:a,model:'haiku',task:`트라이13 — 꼴찌 ${nm(pc)}이(가) 곧 원하는 칸으로 자리를 옮긴다(그 칸 사람과 맞바꿈). ${nm(pc)}의 기록: 약속 ${R.pr}번 중 💔${R.broke}번, 평균 ${R.avg.toFixed(1)}를 냈다. ${nm(pc)}이(가) 네 옆으로 오면 너한테 좋은지 따져서, 네 옆으로 오라고 부르거나(약속 제안 가능) 오지 말라고 견제하는 짧은 한마디. 판세 얘기(누가 1등인지, 누가 배신했는지)로 다른 쪽으로 유도해도 된다. to는 ${nm(pc)}.`,fb:['이쪽은 비추예요','저 옆 자리 괜찮은데요']}); } }
      sys(s,`🪑 ${m.r}/${m.R}라운드 — 꼴찌 ${nm(m.placer)}이(가) 원하는 칸으로 옮길 수 있어요 (그 칸 사람과 자리 바꿈)`,'host'); return; }
    this.talk(s,m); },
  talk(s,m){ m.ph='talk'; m.until=Date.now()+75000; m.ready={}; m.tdl=Date.now()+50000;
    sys(s,`☕ ${m.r}/${m.R}라운드 상담 — 이웃과 약속하세요(🤝 약속 버튼은 모두에게 공개). 귓속말도 돼요. 숫자는 지금 미리 내도 돼요`,'host'); },
  delay(s){ return 1000; },
  ready(s){ const m=s.nm, H=humansAlive(s).filter(h=>m.al.includes(h));
    if(m.ph==='seat') return true;
    if(m.ph==='talk') return true;
    if(m.ph==='submit') return true;
    if(m.ph==='reveal') return Date.now()>=m.until||(H.length&&H.every(h=>m.ready[h]));
    return true; },
  ani(s,m){ return m.al.filter(x=>!isHum(x)&&pl(s,x)&&!pl(s,x).out); },
  tick(s){ const m=s.nm, now=Date.now(), H=humansAlive(s).filter(h=>m.al.includes(h));
    if(m.ph==='seat'){ const p=m.placer;
      if(isHum(p)){ if(now>=m.until&&!m.ready[p]){ m.ready[p]=1; this.move(s,m,p,m.cell[p]); } return; }
      if(now<m.pitch&&s.aq.some(q=>q.k==='say')){ s.typing=p; return; } if(now<m.pitch) return;
      const lead=m.al.slice().sort((a,b)=>m.tot[b]-m.tot[a])[0], tab=this.seatTable(s,m,p), cur=tab.find(x=>x.c===m.cell[p]), top=tab.filter(x=>x.c!==m.cell[p]).slice(0,6);
      const line=x=>`칸 ${x.c}(${x.c<6?'안쪽×3':'꼭짓점×1'})${x.c===m.cell[p]?' = 지금 자리':''}: 이웃 ${x.N.map(j=>{ const R=this.rec(m,j); return `${nm(j)}(평균 ${R.avg.toFixed(1)}·약속 ${R.pr}번 중 💔${R.broke}·믿음 ${rel(s,p,j).toFixed(1)}${j===lead?'·1위':''})`; }).join(', ')||'없음'} → 이웃 예상 합 ${x.sum.toFixed(1)} → 안전하게 낼 숫자 ≤${x.safe} → 예상 ${x.ev>0?'+':''}${x.ev}${x.o&&x.o!==p?` · 자리 뺏기는 사람 ${nm(x.o)}`:''}`;
      const r=need(s,`${s.ep}:t13s:${m.r}:${p}`,()=>ask(s,p,`트라이13 ${m.r}/${m.R}라운드 자리 정하기 — 너는 꼴찌(${m.tot[p]}점)라서 원하는 칸으로 옮길 수 있다(그 칸 사람과 맞바꿈, 그대로도 됨). 1위는 ${nm(lead)} ${m.tot[lead]}점, 남은 라운드 ${m.R-m.r+1}.
[칸별 계산 — 지난 라운드 실제 숫자로 낸 예상]
${[cur,...top].map(line).join('\n')}
판세와 눈치를 따져라: ① 약속을 지킨 사람 옆이면 안전하게 득점, 💔 배신자 옆이면 위험 ② 1위 옆에 붙어 큰 숫자로 1위를 같이 터뜨릴지(나도 위험) ③ 점수 차가 크면 ×3 안쪽에서 크게, 따라잡을 만하면 안전하게 ④ 방금 테이블에서 누가 오라고/오지 말라고 했는지 — 오라는 말은 함정일 수도, 오지 말라는 사람 옆은 견제가 들어온다 ⑤ 자리를 뺏기는 사람이 원망할 수 있다(관계). cell에 칸 번호(그대로면 지금 칸), say에 옮기며 하는 짧은 한마디(속셈은 숨기되 반응이 보이게, 빈 문자열 가능), memo에 진짜 이유.`,T13_SEAT));
      if(r===undefined&&now<m.until){ s.typing=p; return; } s.typing=null;
      let c=r&&Number.isInteger(r.cell)&&r.cell>=0&&r.cell<12?r.cell:null;
      if(c==null){ const P_=ANI(p)||{}; const L=this.seatTable(s,m,p).map(x=>Object.assign({},x,{score:x.score+(x.N.includes(lead)&&(P_.aggr||.5)>.6?2:0)+Math.random()*1.2})).sort((a,b)=>b.score-a.score); c=L[0].c; }
      if(r&&r.say) talk(s,p,shortSay(r.say,90),null,'say'); if(r) memo(s,p,r); this.move(s,m,p,c); return; }
    if(m.ph==='moved'){ if(now>=m.until) this.talk(s,m); return; }
    if(m.ph==='talk'){
      /* 동물마다 약속·한마디·귓속말 계획(동시에) */
      let fl=0; for(const i of this.ani(s,m)){ if(m.plan[i]) continue; if(fl>=2) break; fl++; const r=need(s,`${s.ep}:t13p:${m.r}:${i}`,()=>ask(s,i,`트라이13 ${m.r}/${m.R}라운드 상담 시간이다(위 게임 상황 참고). ${this.pickInfo(s,m,i)} 약속은 진짜 낼 숫자가 아니어도 된다(블러핑 가능) — 하위권이면 이웃이 낮게 내도록 유도하는 약속·딜도 방법이다. ① promise: 이웃들에게 공개로 "몇 낼게요" 약속할 숫자(1~9, 약속 안 하면 0) — 거짓말 가능(진짜 낼 숫자는 나중에 따로 정함). ② say: 테이블에서 할 한마디 — 네 성격대로 하나만: 약속 선언, 특정 이웃에게 부탁·딜, 지난 라운드 배신 따지기, 떠보는 질문, 장난, 남의 약속 의심 등. 앞사람들이 이미 약속을 말했으면 너는 같은 식으로 "N 이하로 낼게요"를 반복하지 말고 다른 얘기를 하거나 짧게(5~15자). 할 말이 없으면 say는 빈 문자열.${recentTable(s,6)} ③ 사람 이웃에게 몰래 말하고 싶으면 dmTo·dm. memo에 속마음(진짜 낼 생각).`,T13_PLAN,'haiku'));
        if(r===undefined&&now<m.tdl) continue; m.plan[i]=1; if(r) memo(s,i,r);
        const pr=r&&r.promise>=1&&r.promise<=9?r.promise|0:(r||aiOn()?0:(Math.random()<.6?Math.max(1,this.autoPick(s,m,i)-(trait(s,i,'bluff')>.6&&Math.random()<.5?2:0)):0));   /* AI 없을 때 약속 = 실제로 낼 생각인 숫자(허세 많은 동물만 가끔 2 낮춰 거짓 약속) — 예전엔 무조건 3~4를 약속하고 9를 내서 절반이 💔 */
        if(pr) m.promise[i]=pr; const say_=r?shortSay(r.say,90):(pr?pickLine(s,i,[`저는 ${pr} 낼게요~ 다들 맞춰 줘요`,`이번엔 ${pr}! 약속이에요ㅎㅎ`,`음… 저 ${pr} 할게요`]):'');
        if(say_) talk(s,i,say_+(pr&&!say_.includes(String(pr))?` (🤝 약속 ${pr})`:''),null,'say'); else if(pr) sys(s,`🤝 ${nm(i)} 약속: ${pr}`,'');
        if(r&&r.dm){ const h=idOf(s,r.dmTo); if(h&&isHum(h)&&!pl(s,h).out&&m.al.includes(h)) dmPush(s,h,i,i,shortSay(r.dm,120)); }
        return; }   /* 한 박자에 한 마리씩 말하게 */
      const planned=this.ani(s,m).every(i=>m.plan[i]);
      if(planned&&(now>=m.until||(H.length&&H.every(h=>m.ready[h]))&&!s.aq.some(q=>q.k==='rest'))){ m.ph='submit'; m.dl=now+30000; sys(s,`🗳️ ${m.r}라운드 — 숫자(1~9)를 몰래 내세요`,'host'); }
      return; }
    if(m.ph==='submit'){
      for(const i of this.ani(s,m)){ if(m.pick[i]!=null) continue; if(!this.nb(m,i).length){ m.pick[i]=this.autoPick(s,m,i); continue; } /* 이웃 없는 칸은 고민할 게 없음 — AI 안 부름(실제 시험 50번 중 7번이 전부 100% 안전) */ const r=need(s,`${s.ep}:t13k:${m.r}:${i}`,()=>ask(s,i,`트라이13 ${m.r}/${m.R}라운드 숫자 제출이다. 1~9 중 하나(pick). ${this.pickInfo(s,m,i)} 이웃들의 약속·지난 라운드에 실제로 낸 숫자(약속을 지켰는지)·귓속말을 보고 이웃 합을 예측해라. 내 숫자 + 이웃 합 ≤ 13이면 +(내 숫자 × 칸 점수), 넘으면 −. 네가 한 약속을 지킬지 깰지도 네 판단(깨면 들통나고 신뢰를 잃음). 누가 너에게 "낮게 내 줘" 같은 부탁을 했어도 그대로 따를 필요 없다 — 네 점수와 순위가 먼저고(위 판세·계산표), 부탁한 사람이 약속을 깬 적(💔)이 있으면 그 사람 약속 숫자는 믿지 말고 더 크게 낼 거라고 예상해라. 마지막 라운드·점수 차도 따져라. memo에 이유.${recentTable(s,14)}`,T13_PICK));
        if(r===undefined&&now<m.dl) continue; let n=r&&r.pick>=1&&r.pick<=9?r.pick|0:null;
        if(n==null) n=this.autoPick(s,m,i);
        m.pick[i]=n; if(r) memo(s,i,r); }
      const left=m.al.filter(x=>m.pick[x]==null&&pl(s,x)&&!pl(s,x).out); if(left.length){ s.typing=left.find(x=>!isHum(x))||null; return; } s.typing=null; this.settle(s,m); return; }
    if(m.ph==='reveal'){ if(m.r>=m.R) return this.finish(s,m); this.next(s,m); return; } },
  move(s,m,p,c){ const from=m.cell[p], now=Date.now(); m.ph='moved';
    if(c===from){ m.swap={p,stay:1,r:m.r,from,to:c,at:now}; m.until=now+2600; sys(s,`🪑 ${nm(p)} — 자리 그대로 (이웃 ${this.nb(m,p).map(nm).join('·')||'없음'})`,'host'); return; }
    const o=this.at(m,c), old=this.nb(m,p); m.cell[p]=c; if(o) m.cell[o]=from; const nw=this.nb(m,p);
    m.swap={p,o,from,to:c,r:m.r,at:now}; m.until=now+5200;
    sys(s,`🪑 ${nm(p)}: ${from<6?'안쪽':'꼭짓점'} ${from}번 → ${c<6?'안쪽 ×3':'꼭짓점 ×1'} ${c}번${o?` ⇄ ${nm(o)}`:''} — 새 이웃 ${nw.map(nm).join('·')||'없음'}`,'host');
    const dk=[]; if(o&&!isHum(o)) dk.push({i:o,task:`트라이13 — ${nm(p)}이(가) 네 칸(${c<6?'안쪽 ×3':'꼭짓점 ×1'})으로 오는 바람에 너는 ${from<6?'안쪽 ×3':'꼭짓점 ×1'} ${from}번으로 밀려났다(새 이웃: ${this.nb(m,o).map(nm).join('·')||'없음'}). 짧게 반응(억울함·의외·괜찮음, 관계대로). to는 ${nm(p)}.`,fb:['어? 저 밀려났네','아 거기 내 자리였는데']});
    const nb2=nw.filter(j=>j!==o&&!isHum(j)&&!old.includes(j)); if(nb2.length&&Math.random()<.7){ const j=U.pick(nb2), R=this.rec(m,p); dk.push({i:j,task:`트라이13 — ${nm(p)}이(가) 방금 네 옆자리로 왔다(${nm(p)} 기록: 약속 ${R.pr}번 중 💔${R.broke}, 평균 ${R.avg.toFixed(1)}). 짧게 반응(환영·경계·떠보기). to는 ${nm(p)}.`}); }
    for(const d of dk) s.aq.push({k:'say',i:d.i,model:'haiku',task:d.task,fb:d.fb||['어? 여기로?','오 반가워요']});
    for(const j of nw) if(!isHum(j)) addRel(s,j,p,this.rec(m,p).broke?-.05:.02); if(o) addRel(s,o,p,-.08); },
  /* 🪑 자리 판단용 계산 — 지난 라운드 실제 숫자·약속 기록으로 칸마다 "이웃 예상 합 → 안전 숫자 → 예상 점수" */
  tell(s,m,id){ const pk=m.pick[id], pr=m.promise[id];
    if(m.ph==='seat') return m.placer===id?'think':null;
    if(m.ph==='moved'&&m.swap&&m.swap.o===id) return 'angry';
    if((m.ph==='talk'||m.ph==='submit')&&pk!=null){ if(pr&&pk>pr) return 'sweat'; const est=this.nb(m,id).reduce((t,j)=>t+(m.promise[j]||this.rec(m,j).avg),0); if(pk+est>13) return 'nerv'; return pk>=5?'smug':null; }
    if(m.ph==='reveal'){ const h=m.hist[m.hist.length-1]; if(h&&h.gain[id]!=null){ if(h.gain[id]<0) return this.nb(m,id).some(j=>h.promise[j]&&h.pick[j]>h.promise[j])?'angry':'sad'; if(h.gain[id]>=12) return 'smug'; } }
    return null; },
  rec(m,j){ const pk=m.hist.map(h=>h.pick[j]).filter(x=>x!=null), pr=m.hist.filter(h=>h.promise[j]); return {avg:pk.length?pk.reduce((a,b)=>a+b,0)/pk.length:4.5,pr:pr.length,broke:pr.filter(h=>h.pick[j]>h.promise[j]).length}; },
  /* 🎯 숫자 판단용 계산 (2026-11-12 사용자: "꼴등인데 높은 배수 자리에서 안정적으로 4 낸다고 함 — 판단이 이상") — 이웃의 약속·지난 숫자로 이웃 합을 400번 뽑아 숫자별 안전 확률·기대 점수 */
  sim(s,m,i){ const N=this.nb(m,i), d=T13.DEG(m.cell[i]), S=[];
    for(let k=0;k<400;k++){ let t=0; for(const j of N){ const R=this.rec(m,j), pr=m.promise[j], sj=this.stand(m,j), dsp=sj.rk>=sj.n-1&&sj.up>0?1:0; let v; if(pr){ const keep=Math.max(.05,1-(R.broke+.4)/(R.pr+1.6)-faceDoubt(s,i,j)-dsp*.15); v=Math.random()<keep?pr-(Math.random()<.3?1:0):pr+1+(Math.random()*3|0); } else v=Math.round(R.avg+(faceDoubt(s,i,j)>.2?1:0)+dsp*1.2+(Math.random()*4-2)); t+=Math.max(1,Math.min(9,v)); } S.push(t); }   /* 하위권 이웃은 크게 낼 가능성↑(룰 3) */
    return [1,2,3,4,5,6,7,8,9].map(n=>{ const p=S.filter(x=>x+n<=T13.LIM).length/S.length; return {n,p,ev:Math.round(d*n*(2*p-1)*10)/10}; }); },
  stand(m,i){ const o=m.al.slice().sort((a,b)=>m.tot[b]-m.tot[a]), rk=o.indexOf(i)+1; return {rk,n:o.length,up:rk>1?m.tot[o[rk-2]]-m.tot[i]:0,lead:m.tot[o[0]]-m.tot[i],low:m.tot[i]-m.tot[o[o.length-1]],left:m.R-m.r+1,d:T13.DEG(m.cell[i])}; },
  pickInfo(s,m,i){ const T=this.sim(s,m,i), st=this.stand(m,i), need=st.rk>1?Math.ceil((st.up+1)/Math.max(1,st.left)):0, hi=st.rk>=st.n-1;
    return '[너의 판세] '+st.rk+'/'+st.n+'위 · 칸 ×'+st.d+(st.rk>1?' · 바로 위 순위까지 '+st.up+'점 차(남은 '+st.left+'라운드 — 라운드당 약 '+need+'점 더 따야 역전)':' · 1위(2위와 '+(m.al.length>1?this.stand(m,m.al.slice().sort((a,b)=>m.tot[b]-m.tot[a])[1]).up:0)+'점 차)')+' · 꼴찌와 '+st.low+'점 차.'
      +(()=>{ const F=this.nb(m,i).map(j=>{ const k=seenFace(s,i,j); return k&&k!=='calm'?nm(j)+' '+FACE[k][0]+FACE[k][1]:''; }).filter(Boolean); return F.length?' [이웃 표정] '+F.join(', ')+'(진땀·긴장이면 약속보다 크게 낼 수도 — 계산에 반영됨).':''; })()+' [숫자별 안전 확률·기대 점수 — 이웃 약속·지난 숫자·표정으로 계산] '+T.map(x=>x.n+':'+Math.round(x.p*100)+'% '+(x.ev>0?'+':'')+x.ev).join(' · ')+'.'
      +(hi?' 너는 하위권이다 — 꼴찌는 탈락 위기다. 안전한 작은 숫자로 버티면 격차가 그대로 남는다. 따라잡는 데 필요한 점수를 보고, 확률이 조금 낮아도 기대 점수가 괜찮은 큰 숫자로 승부를 걸지 진지하게 따져라(×3 칸이면 한 번에 크게 뒤집을 수 있다).'
        :st.rk===1?' 앞서 있다 — 무리하지 말고 기대 점수 높은 숫자로 지켜도 된다.':' 중위권이다 — 기대 점수가 가장 높은 숫자 근처가 기본.')
      +(()=>{ const L=this.nb(m,i).map(j=>{ const o=BX(s,i,j); return `${nm(j)}${isAlly(s,i,j)?' 🤝연합':''}${o.d>=.2?' 빚':''}${o.g>=.3?' 원한':''}${(()=>{ const q=this.stand(m,j); return q.rk>=q.n-1&&q.up>0?' (하위권 — 크게 낼 수도)':''; })()}`; }); return ' [이웃] '+L.join(', ')+' — 네 숫자는 이웃 합에도 들어간다: 연합·빚진 이웃을 터뜨리면 관계가 깨지고, 원한 있는 이웃이면 덜 아껴도 된다.'; })()
      +(m.promise[i]?` [네 약속 ${m.promise[i]}] 크게 내면 들통나 평판·이웃 믿음을 잃는다 — 깨서 얻는 점수가 그보다 클 때만.`:''); },
  /* 🧠 이웃 관계(룰 14): 내 숫자는 이웃의 합에도 들어감 — 연합·빚진 이웃 옆에선 덜 크게, 원한 있는 이웃 옆에선 덜 아낌 */
  nbCare(s,m,i){ return this.nb(m,i).reduce((t,j)=>{ const o=BX(s,i,j); return t+(isAlly(s,i,j)?.5:0)+rel(s,i,j)*.3+o.d*.4-o.g*.5; },0); },
  /* 약속 깨기(룰 5·7·8): 무작위가 아니라 "깨서 얻는 기대 점수 > 들킬 때 잃는 것(평판·이웃 관계, 허세 성향만큼 덜 아낌)"일 때만. 하위권이면 깰 이유가 커짐 */
  autoPick(s,m,i){ const T=this.sim(s,m,i), st=this.stand(m,i), care=this.nbCare(s,m,i), sc=x=>x.ev-Math.max(0,care)*x.n*.12+Math.max(0,-care)*x.n*.05;
    let best=T.slice().sort((a,b)=>sc(b)-sc(a))[0].n;
    const dsp=st.rk>=st.n-1&&st.up>0; if(dsp){ const need=(st.up+1)/Math.max(1,st.left); const ok=T.filter(x=>x.p>=.4&&x.n*st.d>=need*.8); if(ok.length) best=Math.max(best,...ok.map(x=>x.n)); }
    const pr=m.promise[i]; if(pr&&best>pr){ const gain=sc(T.find(x=>x.n===best))-sc(T.find(x=>x.n===pr)); let cost=st.d*((1.2-trait(s,i,'bluff'))*6+Math.max(0,care)*2+(st.rk===1?6:st.rk<=2?2:0)); if(dsp) cost*=.15;   /* 약속 깨기는 판 전체 신뢰를 잃는 일 — 초반에 다 같이 깨던 것(1~2R 7명 중 5명) 줄임 */   /* 들킬 때 잃는 것 — 칸 배수만큼의 점수로 환산 */
      if(gain<=cost) best=pr; }
    return best; },
  nbAfter(m,p,c){ const from=m.cell[p], o=this.at(m,c); return T13.ADJ[c].map(y=>y===from?(o===p?null:o):this.at(m,y)).filter(z=>z&&z!==p); },
  seatEval(s,m,p,c){ const N=this.nbAfter(m,p,c), d=T13.DEG(c); const est=j=>{ const R=this.rec(m,j); return Math.min(9,R.avg+R.broke*1.2+(rel(s,p,j)<-.2?.8:0)+faceDoubt(s,p,j)*2); };
    const sum=N.reduce((t,j)=>t+est(j),0), safe=Math.max(0,Math.min(9,Math.floor(13-sum))), ev=safe>=1?safe*d:-3*d;
    const soc=N.reduce((t,j)=>t+rel(s,p,j)*2+(isAlly(s,p,j)?2:0)-this.rec(m,j).broke*1.5,0); return {c,N,d,sum,safe,ev,soc,o:this.at(m,c),score:ev+soc}; },
  seatTable(s,m,p){ return [...Array(12).keys()].map(c=>this.seatEval(s,m,p,c)).sort((a,b)=>b.score-a.score); },
  settle(s,m){ const sums={}, gain={};
    for(const i of m.al){ const sum=m.pick[i]+this.nb(m,i).reduce((t,j)=>t+m.pick[j],0); sums[i]=sum; const d=T13.DEG(m.cell[i]); gain[i]=sum<=T13.LIM?m.pick[i]*d:-m.pick[i]*d; m.tot[i]+=gain[i]; }
    m.hist.push({r:m.r,cell:Object.assign({},m.cell),pick:Object.assign({},m.pick),promise:Object.assign({},m.promise),sums,gain});
    const broke=m.al.filter(i=>m.promise[i]&&m.pick[i]>m.promise[i]); for(const j of broke) beat(s,'broke',`${m.r}라운드 ${nm(j)} 약속 ${m.promise[j]} → 실제 ${m.pick[j]}`,1+(m.pick[j]-m.promise[j])*.3,j);
    sys(s,`📢 ${m.r}라운드 공개 — `+m.al.map(i=>`${nm(i)} ${m.pick[i]}${m.promise[i]?(m.pick[i]>m.promise[i]?`(약속 ${m.promise[i]} 💔)`:''):''} → ${gain[i]>0?'+':''}${gain[i]}`).join(' · '),'host');
    /* 관계: 약속 깨서 이웃이 감점이면 원망, 지켜서 둘 다 득점이면 신뢰 */
    for(const j of broke) for(const i of this.nb(m,j)) { addRel(s,i,j,gain[i]<0?-.3:-.1); bond(s,i,j,'broke',gain[i]<0?1:.5); }
    for(const i of m.al) for(const j of this.nb(m,i)) if(m.promise[j]&&m.pick[j]<=m.promise[j]&&gain[i]>0){ addRel(s,i,j,.06); bond(s,i,j,'kept',.5); }
    m.ph='reveal'; m.until=Date.now()+30000; m.ready={};
    const A=U.shuffle(this.ani(s,m)); const hurt=A.filter(i=>gain[i]<0&&this.nb(m,i).some(j=>broke.includes(j))); const bk=A.filter(i=>broke.includes(i));
    const talkers=[...new Set([...hurt.slice(0,1),...bk.slice(0,1),...(Math.random()<.3?A.slice(0,1):[])])].slice(0,2);   /* 🤫 큰일 난 사람만 (2026-11-11 덜 말하기) */
    for(const a of talkers) s.aq.push({k:'say',i:a,model:'haiku',task:`트라이13 ${m.r}라운드 결과가 공개됐다(위 게임 상황 참고 — 누가 몇 냈고 약속을 지켰는지 다 공개됨). 테이블에서 한마디(💔는 약속보다 크게 낸 사람만 — 약속보다 작게 낸 건 배신이 아니니 사과하지 마라) — 약속 깬 이웃 때문에 감점이면 서운함·원망(근거: 약속 숫자와 실제 숫자), 네가 약속을 깼으면 사과하거나 둘러대기, 아니면 다음 라운드 떠보기. 짧게.`,fb:['헐… 누가 크게 냈어요?ㅠㅠ','휴~ 살았다ㅎㅎ','다음엔 진짜 약속 지켜요!']}); },
  finish(s,m){ const ids=m.al.slice().sort((a,b)=>m.tot[b]-m.tot[a]||Math.random()-.5);
    sys(s,'🔯 최종 점수 — '+ids.map((x,k)=>`${k+1}위 ${nm(x)} ${m.tot[x]}점`).join(' · '),'host'); s.nm=null; announceMain(s,'tri13ai',ids,null,m.tot); },
  apply(s,me,a){ const m=s.nm; if(!m.al.includes(me)) return '이번 게임 참가자가 아니에요';
    if(a.k==='seat'){ if(m.ph!=='seat'||m.placer!==me) return '자리를 고를 차례가 아니에요'; const c=a.c|0; if(!(c>=0&&c<12)) return '칸을 고르세요'; m.ready[me]=1; this.move(s,m,me,c); return null; }
    if(a.k==='stay'){ if(m.ph!=='seat'||m.placer!==me) return '자리를 고를 차례가 아니에요'; m.ready[me]=1; this.move(s,m,me,m.cell[me]); return null; }
    if(a.k==='promise'){ if(m.ph!=='talk') return '약속은 상담 시간에만'; const n=a.n|0; if(!(n>=1&&n<=9)) return '1~9'; if(m.promise[me]) return '약속은 라운드당 한 번이에요'; m.promise[me]=n; talk(s,me,`저 이번에 ${n} 낼게요! (🤝 약속 ${n})`,null,'say');
      for(const j of this.nb(m,me).filter(x=>!isHum(x)).slice(0,1)) s.aq.push({k:'rest',i:j}); return null; }
    if(a.k==='pick'){ if(m.ph!=='talk'&&m.ph!=='submit') return '지금은 낼 때가 아니에요'; const n=a.n|0; if(!(n>=1&&n<=9)) return '1~9'; m.pick[me]=n; return null; }
    if(a.k==='ready'){ if(m.ph!=='talk'&&m.ph!=='reveal') return '지금은 아니에요'; m.ready[me]=1; return null; }
    return '알 수 없는 동작'; },
  mask(v,me){ const m=v.nm; if(!m) return; if(m.ph!=='reveal'){ m.picked=Object.keys(m.pick); m.pick=m.pick[me]!=null?{[me]:m.pick[me]}:{}; } },
  view(s,i){ const m=s.nm, L=['[지금 게임: 🔯 트라이13] 12칸 육각별. 라운드마다 1~9를 몰래 냄. 내 숫자 + 이웃 숫자 합 ≤ 13이면 +(내 숫자 × 칸 점수), 넘으면 −(내 숫자 × 칸 점수). 안쪽 칸(0~5)은 이웃 3칸·×3, 꼭짓점(6~11)은 이웃 1칸·×1. 내기 전에 공개 약속(거짓말 가능). 약속은 "이 숫자 이하로 낸다"는 뜻 — 약속보다 작게 내면 이웃에게 오히려 도움(약속 지킴), 약속보다 크게 낸 것만 배신(💔). 2라운드부터 꼴찌가 자리를 옮김. 5라운드 합계 1위.'];
    L.push(`[지금] ${m.r}/${m.R}라운드 · ${{seat:'자리 정하기',moved:'방금 자리 이동',talk:'상담 시간',submit:'숫자 제출 중',reveal:'결과 공개 직후'}[m.ph]}`);
    L.push('[자리] '+m.al.map(x=>`${nm(x)} ${m.cell[x]}번(${m.cell[x]<6?'안쪽':'꼭짓점'}) 이웃: ${this.nb(m,x).map(nm).join('·')||'없음'}`).join(' / '));
    L.push(`[너] ${m.cell[i]}번 ${m.cell[i]<6?'안쪽(×3)':'꼭짓점(×1)'} · 이웃 ${this.nb(m,i).map(nm).join('·')||'없음'} · 누적 ${m.tot[i]}점`);
    const pr=Object.keys(m.promise).filter(x=>m.promise[x]); if(pr.length) L.push('[이번 라운드 공개 약속] '+pr.map(x=>`${nm(x)} ${m.promise[x]}`).join(', '));
    if(m.pick[i]!=null&&m.ph!=='reveal') L.push(`[네가 이번에 낸 숫자 — 너만 앎] ${m.pick[i]}`);
    if(m.hist.length) L.push('[지난 라운드 공개 기록 (실제 숫자/약속 → 점수)]\n'+m.hist.map(h=>`${h.r}R: `+m.al.map(x=>`${nm(x)} ${h.pick[x]}${h.promise[x]?`/약속${h.promise[x]}${h.pick[x]>h.promise[x]?'💔':''}`:''}→${h.gain[x]>0?'+':''}${h.gain[x]}`).join(', ')).join('\n'));
    L.push('[누적 점수] '+m.al.slice().sort((a,b)=>m.tot[b]-m.tot[a]).map(x=>`${nm(x)} ${m.tot[x]}`).join(', '));
    if(m.hist.length) L.push('[약속 기록] '+m.al.map(x=>{ const R=this.rec(m,x); return `${nm(x)} 평균 ${R.avg.toFixed(1)}·약속 ${R.pr}번 중 💔${R.broke}`; }).join(', '));
    if(m.swap&&m.swap.r===m.r&&!m.swap.stay) L.push(`[이번 라운드 자리 이동] ${nm(m.swap.p)} → ${m.swap.to}번${m.swap.o?` (${nm(m.swap.o)}와 맞바꿈)`:''}`);
    return L.join('\n'); },
  board(v,me,click){ const m=v.nm, rev=m.ph==='reveal', h=rev?m.hist[m.hist.length-1]:null, picked=m.picked||Object.keys(m.pick||{});
    const SW=m.swap&&m.swap.r===m.r&&!m.swap.stay&&(m.ph==='moved'||m.ph==='talk')?m.swap:null, hint=click&&m.placer===me?Object.fromEntries([...Array(12).keys()].map(c=>[c,this.seatEval(v,m,me,c)])):null;
    const cen=c=>{ const p=T13.TRI[c]; return [(p[0][0]+p[1][0]+p[2][0])/3,(p[0][1]+p[1][1]+p[2][1])/3]; };
    const arr=(a,b,cls)=>{ const [x1,y1]=cen(a), [x2,y2]=cen(b), mx=(x1+x2)/2, my=(y1+y2)/2, dx=x2-x1, dy=y2-y1, L=Math.hypot(dx,dy)||1, k=Math.min(40,L*.35); return `<path class="t13-arr ${cls}" d="M${x1.toFixed(1)},${y1.toFixed(1)} Q${(mx-dy/L*k).toFixed(1)},${(my+dx/L*k).toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" marker-end="url(#t13ar${cls==='o'?'o':''})"/>`; };
    return '<div class="ga-star"><svg viewBox="0 0 300 300" class="t13-svg">'+T13.TRI.map((pts,c)=>{ const id=this.at(m,c), cx=(pts[0][0]+pts[1][0]+pts[2][0])/3, cy=(pts[0][1]+pts[1][1]+pts[2][1])/3;
      const pk=id&&(rev?h.pick[id]:m.pick[id]), pr=id&&m.promise[id], g=rev&&id?h.gain[id]:null, bust=g!=null&&g<0, done=!rev&&id&&picked.includes(id);
      let t='';
      if(id){ t+=`<text class="e" x="${cx}" y="${cy-7}">${emo(id)}</text>${v.face&&v.face[id]?`<text class="fc" x="${cx+12}" y="${cy-14}">${FACE[v.face[id].k][0]}</text>`:''}<text class="d" x="${cx}" y="${cy+7}">${U.esc(nm(id))}</text>`;
        if(rev&&pk!=null) t+=`<rect x="${cx-19}" y="${cy+12}" width="38" height="14" rx="7" fill="${bust?'#ffe5e1':'#e3f5e8'}"/><text class="n" x="${cx}" y="${cy+19.5}" fill="${bust?'#b8412f':'#23824a'}">${pk} (${g>0?'+':''}${g})</text>`;
        else if(pr) t+=`<rect x="${cx-15}" y="${cy+12}" width="30" height="14" rx="7" fill="#efe9ff"/><text class="pr" x="${cx}" y="${cy+19.5}">🤝${pr}${id===me&&pk!=null?'':''}</text>`;
        else if(c<6) t+=`<text class="d" x="${cx}" y="${cy+19}">×3</text>`;
        if(id===me&&pk!=null&&!rev) t+=`<text class="mine" x="${cx}" y="${cy-20}">🤫${pk}</text>`;
        if(done&&id!==me) t+=`<text class="ok" x="${cx+14}" y="${cy-14}">✓</text>`; }
      if(hint&&c!==m.cell[me]){ const E=hint[c]; t+=`<text class="hint ${E.safe>=4?'ok':E.safe>=2?'mid':'bad'}" x="${cx}" y="${cy+(id?27:4)}">≤${E.safe}${E.ev>0?` +${E.ev}`:''}</text>`; }
      if(SW&&c===SW.from&&!id&&m.ph==='moved') t+=`<text class="e ghost" x="${cx}" y="${cy-7}">${emo(SW.p)}</text>`;
      return {z:(bust?1:0)+(id===me?2:0)+(SW&&c===SW.to?3:0),h:`<g class="t13-c ${id===me?'me':''} ${id?'':'empty'} ${bust?'bust':''} ${click?'click':''} ${m.ph==='seat'&&id===m.placer?'placer':''} ${SW&&c===SW.to?'sw-to':''} ${SW&&c===SW.from?'sw-from':''}" ${click?`data-nm='${JSON.stringify({k:'seat',c})}'`:''}><polygon points="${pts.map(p=>p.map(x=>x.toFixed(1)).join(',')).join(' ')}"/>${t}</g>`}; }).sort((x,y)=>x.z-y.z).map(x=>x.h).join('')+(SW?'<defs><marker id="t13ar" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#7b5cd6"/></marker><marker id="t13aro" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#8d877c"/></marker></defs>'+arr(SW.from,SW.to,'p')+(SW.o?arr(SW.to,SW.from,'o'):''):'')+'</svg>'+T13.TRI.map((pts,c)=>{ const id=this.at(m,c); if(!id) return ''; const cx=(pts[0][0]+pts[1][0]+pts[2][0])/3, cy=(pts[0][1]+pts[1][1]+pts[2][1])/3; const b=gaSay(v,id,id===me?'me':''); return b?`<div class="ga-bubat" style="left:${(cx/3).toFixed(1)}%;top:${((cy-12)/3).toFixed(1)}%">${b}</div>`:''; }).join('')+'</div>'; },
  card(v,me,out){ const m=v.nm, mine=m.al.includes(me)&&!out, sec=Math.max(0,Math.ceil((m.until-Date.now())/1000));
    let h=`<div class="vr-card ga t13ai">`+gaTop(`🔯 트라이13 · ${m.r}/${m.R}라운드 · ${{seat:'🪑 자리 정하기',moved:'🪑 자리 이동',talk:'☕ 상담',submit:'🗳️ 숫자 제출',reveal:'📢 공개'}[m.ph]} ${gaT(m.ph==='submit'?m.dl:m.until)}`,this.rule);   /* ⏱ 남은 시간 (2026-11-11 사용자: 트라이13 남은 시간이 안 보여) */
    const seatMe=mine&&m.ph==='seat'&&m.placer===me&&!m.ready[me];
    { const W=m.swap; if(W&&W.r===m.r&&(m.ph==='moved'||m.ph==='talk')) h+=W.stay?`<div class="t13-swap stay">🪑 ${emo(W.p)} ${U.esc(nm(W.p))} — 자리 그대로</div>`:`<div class="t13-swap ${m.ph==='moved'?'live':''}">🪑 <b>${emo(W.p)} ${U.esc(nm(W.p))}</b> ${W.from<6?'안쪽':'꼭짓점'} → <b>${W.to<6?'안쪽 ×3':'꼭짓점 ×1'}</b>${W.o?` <span class="x">⇄</span> <b>${emo(W.o)} ${U.esc(nm(W.o))}</b> 밀려남`:''}</div>`;
      else if(m.ph==='seat'&&m.placer!==me) h+=`<div class="t13-swap wait">🪑 꼴찌 <b>${emo(m.placer)} ${U.esc(nm(m.placer))}</b>이(가) 옮길 자리를 고르는 중… 💭</div>`; }
    h+=this.board(v,me,seatMe);
    const last=m.hist[m.hist.length-1];
    h+='<div class="ga-strip">'+m.al.slice().sort((a,b)=>m.tot[b]-m.tot[a]).map((x,k)=>`<span class="${x===me?'me':''}">${k===0&&m.tot[x]>0?'👑':''}${emo(x)}<i>${U.esc(nm(x))}</i><b>${m.tot[x]}</b>${last&&last.gain[x]!=null?`<small class="${last.gain[x]<0?'neg':'pos'}">${last.gain[x]>0?'+':''}${last.gain[x]}</small>`:''}</span>`).join('')+'</div>';
    if(m.ph==='moved') h+=gaDock('',gaWait('🪑 자리를 옮겼어요 — 곧 상담 시간'));
    else if(m.ph==='seat'){ h+=seatMe?gaDock('🪑 꼴찌라서 자리를 옮길 수 있어요 — 칸마다 <b>≤숫자</b>는 지난 기록으로 본 안전한 숫자, <b>+</b>는 예상 점수',`<div class="ga-btns">${gaB({k:'stay'},'지금 자리 그대로','ghost')}</div>`):gaDock('',gaWait(`🪑 ${emo(m.placer)} ${U.esc(nm(m.placer))}이(가) 자리를 고르는 중…`)); }
    else if(mine&&(m.ph==='talk'||m.ph==='submit')){ const myN=this.nb(m,me), prN=myN.filter(x=>m.promise[x]), mx=prN.length?Math.max(0,13-prN.reduce((t,x)=>t+m.promise[x],0)):null;
      const sel=gaSel('t13:'+m.r,m.pick[me]!=null?m.pick[me]:null);
      const lbl=`${m.cell[me]<6?'안쪽 칸 ×3':'꼭짓점 칸 ×1'} · ${myN.length?'이웃 '+myN.map(x=>emo(x)+U.esc(nm(x))+(m.promise[x]?` 🤝${m.promise[x]}`:'')).join(' '):'이웃 없음'}${mx!=null?` → 약속대로면 최대 <b>${mx}</b>`:myN.length?' (아직 약속 없음)':''}`;
      let b='<div class="ga-nums">'+[1,2,3,4,5,6,7,8,9].map(n=>`<button class="ghost ${sel===n?'on':''} ${mx!=null&&n>mx?'dim':''}" data-gsel="t13:${m.r}|${n}">${n}</button>`).join('')+'</div><div class="ga-btns">';
      if(sel!=null) b+=gaB({k:'pick',n:sel},m.pick[me]===sel?`✔ ${sel} 냈어요`:`🤫 ${sel} 내기`,m.pick[me]===sel?'ghost':'');
      if(sel!=null&&m.ph==='talk'&&!m.promise[me]) b+=gaB({k:'promise',n:sel},`🤝 ${sel} 약속 (공개)`,'ghost');
      if(m.ph==='talk'&&!m.ready[me]) b+=gaB({k:'ready'},'상담 끝 ▶','ghost');
      b+='</div>'; if(sel==null) b+='<div class="ga-sub">숫자를 누르면 몰래 내거나 공개 약속할 수 있어요</div>';
      else if(m.pick[me]!=null&&m.pick[me]!==sel) b+=`<div class="ga-sub">지금 낸 숫자: ${m.pick[me]} (공개 전까지 바꿀 수 있어요)</div>`;
      if(m.promise[me]) b+=`<div class="ga-sub">내 공개 약속: 🤝${m.promise[me]}</div>`;
      h+=gaDock(lbl,b); }
    else if(mine&&m.ph==='reveal') h+=gaDock(last&&last.gain[me]!=null?`이번 라운드 ${last.pick[me]} 냄 → <b>${last.gain[me]>0?'+':''}${last.gain[me]}</b>`:'',m.ready[me]?gaWait('다음 라운드 기다리는 중…'):`<div class="ga-btns">${gaB({k:'ready'},m.r>=m.R?'최종 결과 ▶':'다음 라운드 ▶')}</div>`);
    else if(!mine) h+=gaDock('',gaWait('👀 구경 중이에요'));
    h+='<details class="ga-more"><summary>📊 라운드별 점수표</summary><table class="fs-tab"><tr><th></th>'+m.hist.map(x=>`<th>${x.r}R</th>`).join('')+'<th>합계</th></tr>'+m.al.slice().sort((a,b)=>m.tot[b]-m.tot[a]).map(x=>`<tr class="${x===me?'me':''}"><td>${emo(x)} ${U.esc(nm(x))}</td>`+m.hist.map(hh=>`<td class="${hh.gain[x]<0?'mono':''}">${hh.pick[x]}${hh.promise[x]&&hh.pick[x]>hh.promise[x]?'💔':''}<small> ${hh.gain[x]>0?'+':''}${hh.gain[x]}</small></td>`).join('')+`<td><b>${m.tot[x]}</b></td></tr>`).join('')+'</table></details>';
    return h+'</div>'; },
};

/* ───────── 🫘 콩의 딜레마 · AI판 (2026-11-11 "시즌 게임을 AI 기반으로 새로") ─────────
   3:3 팀전. 각자 콩 10개. 5라운드: 🫘 팀 회의(같은 팀끼리만 — 약속은 안 지켜도 됨) → 🤫 각자 몰래 팀 병에 콩 넣기 → 병 열기.
   많이 넣은 팀 +1점. 진 팀 병 개수만 공개(이긴 팀은 비밀), 같으면 아무것도 공개 안 됨. 3점 먼저 또는 5라운드 뒤 점수 높은 팀 승리.
   "팀이 이기려면 많이, 내가 이기려면 적게" — 이긴 팀에서 콩을 가장 많이 남긴 사람이 1위, 진 팀에서 가장 적게 남긴 사람이 꼴찌(데스매치 후보).
   동물: 팀 회의 말·약속·실제 넣는 개수를 AI가 정함. 진 팀 공개 개수로 누가 덜 넣었는지 의심. */
const KG_TALK={type:'object',properties:{say:{type:'string'},promise:{type:'integer'},memo:{type:'string'}},required:['say','promise','memo'],additionalProperties:false};
const kgSch=ns=>({type:'object',properties:{n:{type:'integer',enum:ns},memo:{type:'string'}},required:['n','memo'],additionalProperties:false});
const KT=['🔵 파랑','🟠 주황'];
/* 🧠 콩의 딜레마 선택지 표 (NPC 룰 1·2·3·5·6·10·14, 2026-11-12) — 넣을 개수마다 "팀이 이번 판 이길 확률 → 팀이 경기 이길 확률 → 내 결과(이긴 팀 1위 / 진 팀 꼴찌 위험)"를 코드가 계산.
   팀원 예상 = 약속 × 믿음(관계 축 BX 믿음·호감, 약속 어김 평판), 약속 없으면 평균. 상대 팀 예상 = 지금까지 공개된 상대 병 개수(진 판) 평균, 없으면 1인당 2.3.
   남은 콩은 팀원 평균과 비교 — 이기면 많이 남길수록 1위, 지면 가장 적게 남긴 사람이 후보. 성격: 허세·대담할수록 내 몫(1위)을, 의리 있을수록(믿음 성향) 팀 승리를 무겁게. */
const kgPhi=z=>{ const t=1/(1+.3275911*Math.abs(z)/Math.SQRT2), y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-z*z/2); return .5*(1+(z<0?-y:y)); };
function kgMatch(a,b,L){ if(a>=3) return 1; if(b>=3) return 0; if(L<=0) return a>b?1:a<b?0:.5; return .5*kgMatch(a+1,b,L-1)+.5*kgMatch(a,b+1,L-1); }
function kgPlan(s,m,i){ const t=m.team[i], o=1-t, mates=m.al.filter(x=>m.team[x]===t&&x!==i), opp=m.al.filter(x=>m.team[x]===o), b=m.beans[i], left=m.R-m.r;
  const F=s.fame||{}, tau=j=>{ const f=F[j]||{}, br=(f.broke||0)/Math.max(1,(f.kept||0)+(f.broke||0)); return Math.max(.3,Math.min(1.1,.75+BX(s,i,j).t*.35+rel(s,i,j)*.15-br*.3+(isHum(j)?0:0))); };
  const prom=m.prom||{}; let muT=0, sdT=0; const mate=[]; for(const j of mates){ const e=prom[j]!=null?prom[j]*tau(j):2.2; muT+=e; sdT+=1.4**2; mate.push({j,e,pr:prom[j]}); }
  const oh=m.hist.filter(h=>h.w===t); const oAvg=oh.length?oh.reduce((a,h)=>a+h.tot[o],0)/oh.length/Math.max(1,opp.length):2.3; const muO=oAvg*opp.length, sdO=Math.sqrt(opp.length*1.5**2);
  const spent=j=>m.hist.length*2.2, mateLeft=mates.length?mates.reduce((a,j)=>a+Math.max(0,10-spent(j)-(mate.find(x=>x.j===j)||{e:2.2}).e),0)/mates.length:5;
  const wSelf=.6+trait(s,i,'bluff')*.5+trait(s,i,'aggr')*.3, wTeam=.6+trait(s,i,'trust')*.6;
  const opts=[]; for(let n=0;n<=Math.min(b,8);n++){ const pw=kgPhi((n+muT-muO-.5)/Math.max(.8,Math.sqrt(sdT+sdO*sdO))), pt=Math.max(0,kgPhi((n+muT-muO+.5)/Math.max(.8,Math.sqrt(sdT+sdO*sdO)))-pw);
    const mw=kgMatch(m.pts[t]+1,m.pts[o],left), ml=kgMatch(m.pts[t],m.pts[o]+1,left), md=kgMatch(m.pts[t],m.pts[o],left), pm=pw*mw+(1-pw-pt)*ml+pt*md;
    const mine=b-n, sc=2.6, top=1/(1+Math.exp(-(mine-mateLeft)/sc)), low=1/(1+Math.exp(-(mateLeft-mine)/sc));
    const myPr=prom[i], short=Math.max(0,(myPr!=null?myPr:muT/Math.max(1,mates.length))-n), sus=(1-pw)*short*.12*(1.3-trait(s,i,'bluff'));   /* 팀이 지면 병 개수가 공개돼 덜 넣은 게 들킴 → 팀원 믿음을 잃음 */
    const v=pm*(wTeam+wSelf*top)-(1-pm)*(wSelf*low*1.4)-sus;
    opts.push({n,pw,pm,top,low,v}); }
  return {opts,mate,muO,t,o,left}; }
function kgAuto(s,m,i,pl){ const S=pl.opts.slice().sort((a,b)=>b.v-a.v); const near=S.filter(o=>S[0].v-o.v<=.02); return U.pick(near).n; }
NAT.kongai={ maxH:12, title:'콩의 딜레마', emoji:'🫘', tagline:'팀이 이기려면 콩을 많이, 내가 이기려면 콩을 적게',
  rule:'두 팀(6명이면 3:3)으로 나뉘어, 각자 콩 10개로 5라운드. 라운드마다 🫘 팀 회의(같은 팀끼리만, 약속은 안 지켜도 돼요) → 🤫 몰래 팀 병에 콩 넣기 → 많이 넣은 팀 +1점. <b>진 팀 병 개수만 공개</b>(이긴 팀은 비밀, 같으면 공개 없음). 3점 먼저 또는 5라운드 뒤 이긴 팀에서 <b>콩을 가장 많이 남긴 사람이 1위</b>, 진 팀에서 가장 적게 남긴 사람이 데스매치 후보!',
  start(s,al){ const H=U.shuffle(al.filter(isHum)), A=U.shuffle(al.filter(x=>!isHum(x))), order=[]; const T=[[],[]];
    let k=0; for(const h of H){ T[k%2].push(h); k++; } for(const a of A){ (T[0].length<=T[1].length?T[0]:T[1]).push(a); }
    const m={id:'kongai',R:5,r:0,al:al.slice(),team:{},beans:{},pts:[0,0],dep:{},ph:'meet',until:0,ready:{},tchat:[[],[]],hist:[],plan:{},jq:[],tn:[0,0]};
    T.forEach((t,ti)=>t.forEach(id=>{ m.team[id]=ti; m.beans[id]=10; }));
    for(const t of T) for(const a of t) for(const b of t) if(a!==b) addRel(s,a,b,.08);
    sys(s,`🫘 제${s.ep}회 메인 매치 「콩의 딜레마」 — ${KT[0]} 팀 vs ${KT[1]} 팀 (팀은 각자 화면에서 확인). 팀이 이기려면 콩을 많이, 내가 이기려면 콩을 적게! 팀 회의는 오른쪽 🫘 팀 회의 탭에서.`,'host');
    T.forEach((t,ti)=>m.tchat[ti].push({from:-1,text:`${KT[ti]} 팀 — ${t.map(nm).join(' · ')}`}));
    this.next(s,m); return m; },
  mates(m,id){ return m.al.filter(x=>m.team[x]===m.team[id]&&x!==id); },
  next(s,m){ m.r++; m.ph='meet'; m.until=Date.now()+60000; m.ready={}; m.dep={}; m.plan={}; m.prom={}; m.dl=0; m._rk=m.r;
    for(const t of [0,1]) m.tchat[t].push({from:-1,text:`— ${m.r}라운드 팀 회의 (점수 ${m.pts[t]} : ${m.pts[1-t]}) —`});
    sys(s,`🫘 ${m.r}/${m.R}라운드 — 팀 회의 중 (점수 ${KT[0]} ${m.pts[0]} : ${m.pts[1]} ${KT[1]})`,'host'); },
  delay(){ return 1000; },
  ready(){ return true; },
  ani(s,m){ return m.al.filter(x=>!isHum(x)&&pl(s,x)&&!pl(s,x).out); },
  tsay(s,m,id,text){ m.tchat[m.team[id]].push({from:id,text}); m.tn[m.team[id]]++; },
  tick(s){ const m=s.nm, now=Date.now(), H=humansAlive(s).filter(h=>m.al.includes(h));
    /* 팀 회의 답장(사람이 팀 회의에 말하면) */
    for(const q of m.jq.slice()){ const r=need(s,q.key,()=>ask(s,q.i,q.from===q.i?`🫘 팀 회의 — 방금 결과: ${q.text}. 팀원들에게 한마디(졌으면 공개된 우리 병 개수와 각자 약속을 비교해 누가 덜 넣었는지 근거로 의심, 이겼으면 다음 작전). promise는 -1.`:`🫘 팀 회의에서 ${nm(q.from)}이(가) 말했다: "${q.text}". 같은 팀끼리만 듣는다. 네 말투로 짧게 대답(약속·부탁·떠보기, 속내는 숨겨도 됨).`,KG_TALK,'haiku')); if(r===undefined&&now<q.dl) continue;
      m.jq.splice(m.jq.indexOf(q),1); const t=r&&shortSay(r.say,90); if(t) this.tsay(s,m,q.i,t+(false&&r.promise>=0?` (약속 ${r.promise}개)`:'')); if(r) memo(s,q.i,r); }
    if(m.ph==='meet'){
      for(const i of this.ani(s,m)){ if(m.plan[i]) continue; const r=need(s,`${s.ep}:kgt:${m.r}:${i}`,()=>ask(s,i,`🫘 콩의 딜레마 ${m.r}/${m.R}라운드 팀 회의다(같은 팀끼리만 들림, 위 게임 상황 참고). 팀이 이기려면 많이 넣어야 하지만 내가 1위 하려면 적게 넣고 많이 남겨야 한다. say: 팀원들에게 할 한마디(몇 개씩 넣자는 작전, 내 약속, 지난 라운드 누가 덜 넣은 것 같은지 의심 등 — 근거 짧게). promise: 팀원들에게 약속할 개수(0~${m.beans[i]}, 약속 안 하면 -1, 거짓말 가능). memo에 진짜 속셈.`,KG_TALK,'haiku'));
        if(r===undefined&&now<m.until-15000) continue; m.plan[i]=1; if(r) memo(s,i,r);
        const pr=r&&r.promise>=0&&r.promise<=m.beans[i]?r.promise|0:null; if(pr!=null) (m.prom=m.prom||{})[i]=pr; const t=r?shortSay(r.say,100):(aiOn()?'':pickLine(s,i,['이번엔 다들 3개씩 어때요?','저 2개 넣을게요~ 믿어 줘요ㅎㅎ','음… 저는 아껴 둘래요ㅠㅠ']));   /* AI가 켜져 있으면 대신 대사 없이 조용히(앞뒤 안 맞는 말 방지) */
        if(t) this.tsay(s,m,i,t+(pr!=null&&!/d/.test(t)?` (약속 ${pr}개)`:'')); return; }
      const planned=this.ani(s,m).every(i=>m.plan[i]);
      if(planned&&(now>=m.until||(H.length&&H.every(h=>m.ready[h])))&&!m.jq.length){ m.ph='dep'; m.dl=now+30000; sys(s,`🤫 ${m.r}라운드 — 한 명씩 보관소에 들어가 몰래 콩을 넣어요`,'host'); }
      return; }
    if(m.ph==='dep'){
      for(const i of this.ani(s,m)){ if(m.dep[i]!=null) continue; const PL=kgPlan(s,m,i), pct=x=>Math.round(x*100)+'%';
        const r=need(s,`${s.ep}:kgd:${m.r}:${i}`,()=>ask(s,i,`🫘 ${m.r}/${m.R}라운드 — 팀 병에 몰래 넣을 콩 개수(n)를 정해라. 네 콩 ${m.beans[i]}개.
[처지] 점수 우리 ${m.pts[PL.t]} : ${m.pts[PL.o]} 상대 · 이번 판 뒤 남은 라운드 ${PL.left} (3점 먼저)${m.prom&&m.prom[i]!=null?` · 너는 팀에 ${m.prom[i]}개 약속했다(지킬지는 네 판단, 진 팀 병 개수가 공개되면 들킬 수 있다)`:''}
[코드가 짐작한 것] 팀원 — ${PL.mate.map(x=>`${nm(x.j)}: ${x.pr!=null?`${x.pr}개 약속 → 믿음 반영 약 ${x.e.toFixed(1)}개`:`약속 없음 → 약 ${x.e.toFixed(1)}개`}`).join(' · ')} / 상대 팀 합 약 ${PL.muO.toFixed(1)}개
[선택지 표 — 개수마다: 우리 팀이 이번 판 이길 확률 · 팀이 경기 이길 확률 · (팀이 이기면) 내가 1위 할 확률 · (팀이 지면) 내가 후보 될 위험 → 종합 점수(높을수록 좋음). 성격대로 골라도 되지만 표에 근거가 있어야 한다]
${PL.opts.map(o=>`- ${o.n}개: 이번 판 ${pct(o.pw)} · 경기 ${pct(o.pm)} · 1위 ${pct(o.top)} · 후보 위험 ${pct(o.low)} → ${o.v.toFixed(2)}`).join('\n')}
n은 표의 개수 중 하나. memo에 이유.`,kgSch(PL.opts.map(o=>o.n))));
        if(r===undefined&&now<m.dl) continue; let n=r&&Number.isInteger(r.n)?Math.max(0,Math.min(m.beans[i],r.n)):null;
        if(n==null) n=kgAuto(s,m,i,PL);
        m.dep[i]=n; if(r) memo(s,i,r); }
      const left=m.al.filter(x=>m.dep[x]==null&&pl(s,x)&&!pl(s,x).out); if(left.length){ s.typing=left.find(x=>!isHum(x))||null; return; } s.typing=null; this.open(s,m); return; }
    if(m.ph==='res'){ if(now>=m.until||(H.length&&H.every(h=>m.ready[h]))){ if(m.over) return this.finish(s,m); this.next(s,m); } return; } },
  open(s,m){ const tot=[0,0]; for(const id of m.al){ tot[m.team[id]]+=m.dep[id]; m.beans[id]-=m.dep[id]; }
    const w=tot[0]>tot[1]?0:tot[1]>tot[0]?1:-1; const h={r:m.r,w,lose:w<0?null:tot[1-w],tot,dep:Object.assign({},m.dep)}; m.hist.push(h);
    if(w>=0){ m.pts[w]++; sys(s,`📢 ${m.r}라운드 — ${KT[w]} 팀 승리! (+1점) · 진 ${KT[1-w]} 팀 병: ${tot[1-w]}개 · 점수 ${m.pts[0]} : ${m.pts[1]}`,'host');
      { let a=0,b=0,behind=false; for(const h of m.hist.slice(0,-1)){ if(h.w===w) a++; else if(h.w===1-w) b++; if(b>a) behind=true; } const swing=m.pts[w]===m.pts[1-w]?'동점':m.pts[w]>m.pts[1-w]&&behind&&a<=b?'역전':''; beat(s,'round',`${m.r}라운드 ${KT[w]} 승 · 진 ${KT[1-w]} 병 ${tot[1-w]}개 (${m.pts[0]}:${m.pts[1]})${swing?' — '+swing:''}`,swing?2:.6); }
      m.tchat[w].push({from:-1,text:`🎉 우리가 이겼어요! (우리 병 개수는 비밀)`}); m.tchat[1-w].push({from:-1,text:`😢 졌어요… 우리 병엔 ${tot[1-w]}개`}); }
    else { sys(s,`📢 ${m.r}라운드 — 무승부! 아무것도 공개되지 않아요 · 점수 ${m.pts[0]} : ${m.pts[1]}`,'host'); for(const t of [0,1]) m.tchat[t].push({from:-1,text:'🤝 무승부 — 개수 공개 없음'}); }
    m.over=m.pts[0]>=3||m.pts[1]>=3||m.r>=m.R; m.ph='res'; m.until=Date.now()+25000; m.ready={};
    /* 팀 안에서 의심 한마디(진 팀), 이긴 팀은 한마디 */
    for(const t of [0,1]){ const an=this.ani(s,m).filter(x=>m.team[x]===t); if(!an.length) continue; const i=U.pick(an);
      m.jq.push({key:`${s.ep}:kgr:${m.r}:${i}`,i,from:i,text:w<0?'(무승부였다)':w===t?'(우리 팀이 이겼다)':`(우리 팀이 졌다 — 우리 병 ${tot[t]}개)`,dl:Date.now()+15000}); }
    if(Math.random()<.35){ const a=U.pick(this.ani(s,m)); if(a) s.aq.push({k:'say',i:a,model:'haiku',task:`콩의 딜레마 ${m.r}라운드 결과가 나왔다(위 게임 상황 참고). 모두가 듣는 테이블에서 상대 팀에게 한마디(장난·도발·떠보기, 팀 비밀은 말하지 마라).`,fb:['다음 판은 저희가 이겨요~ㅎㅎ','헐 거기 몇 개 넣은 거예요?','음… 재밌어지네요']}); } },
  finish(s,m){ const w=m.pts[0]>m.pts[1]?0:m.pts[1]>m.pts[0]?1:(Math.random()<.5?0:1);
    const W=m.al.filter(x=>m.team[x]===w).sort((a,b)=>m.beans[b]-m.beans[a]||Math.random()-.5), L=m.al.filter(x=>m.team[x]!==w).sort((a,b)=>m.beans[b]-m.beans[a]||Math.random()-.5);
    sys(s,`🫘 최종 — ${KT[w]} 팀 승리 (${m.pts[w]} : ${m.pts[1-w]}) · 남은 콩: `+[...W,...L].map(x=>`${nm(x)} ${m.beans[x]}`).join(' · '),'host');
    for(const a of W) for(const b of W) if(a!==b) addRel(s,a,b,.1);
    s.nm=null; announceMain(s,'kongai',[...W,...L],null); },
  apply(s,me,a){ const m=s.nm; if(!m.al.includes(me)) return '이번 게임 참가자가 아니에요';
    if(a.k==='tsay'){ const t=clean(a.text).slice(0,200); if(!t) return '할 말을 적어 주세요'; this.tsay(s,m,me,t);
      const an=this.mates(m,me).filter(x=>!isHum(x)); const hit=an.filter(x=>calls(t,x)); const who=hit.length?hit:an.length?[U.pick(an)]:[];
      for(const x of who.slice(0,2)) m.jq.push({key:`${s.ep}:kgq:${m.r}:${x}:${(m.qn=(m.qn||0)+1)}`,i:x,from:me,text:t,dl:Date.now()+15000}); return null; }
    if(a.k==='dep'){ if(m.ph!=='meet'&&m.ph!=='dep') return '지금은 넣을 때가 아니에요'; const n=a.n|0; if(!(n>=0&&n<=m.beans[me])) return `0~${m.beans[me]}개`; m.dep[me]=n; return null; }
    if(a.k==='ready'){ if(m.ph!=='meet'&&m.ph!=='res') return '지금은 아니에요'; m.ready[me]=1; return null; }
    return '알 수 없는 동작'; },
  mask(v,me){ const m=v.nm; if(!m) return; const t=m.team[me]; const mine=t!=null;
    m.tchat=mine?{[t]:m.tchat[t]}:{}; m.beans=mine?{[me]:m.beans[me]}:{}; m.done=Object.keys(m.dep); m.dep=m.dep[me]!=null?{[me]:m.dep[me]}:{};
    m.hist=m.hist.map(h=>({r:h.r,w:h.w,lose:h.lose,mine:h.dep[me]})); m.plan={}; m.jq=[]; m.team=mine?Object.fromEntries(Object.entries(m.team).filter(([k,x])=>x===t)):{}; m.myT=t; },
  view(s,i){ const m=s.nm, t=m.team[i], L=['[지금 게임: 🫘 콩의 딜레마] 3:3 팀전, 각자 콩 10개로 5라운드. 라운드마다 팀 회의 → 각자 몰래 팀 병에 콩 → 많이 넣은 팀 +1점. 진 팀 병 개수만 공개(이긴 팀은 비밀, 무승부면 공개 없음). 3점 먼저 또는 5라운드 뒤 이긴 팀에서 콩을 가장 많이 남긴 사람이 1위, 진 팀에서 가장 적게 남긴 사람이 데스매치 후보. 다른 사람의 남은 콩·넣은 개수는 아무도 모름.'];
    L.push(`[지금] ${m.r}/${m.R}라운드 · ${{meet:'팀 회의',dep:'몰래 넣는 중',res:'결과 공개 직후'}[m.ph]} · 점수 우리 팀 ${m.pts[t]} : ${m.pts[1-t]} 상대 팀`);
    L.push(`[우리 팀 ${KT[t]}] ${m.al.filter(x=>m.team[x]===t).map(nm).join('·')} / [상대 팀] ${m.al.filter(x=>m.team[x]!==t).map(nm).join('·')}`);
    L.push(`[너] 남은 콩 ${m.beans[i]}개${m.hist.length?' · 네가 넣은 개수: '+m.hist.map(h=>`${h.r}R ${h.dep[i]}개`).join(', '):''}`);
    if(m.hist.length) L.push('[공개 결과] '+m.hist.map(h=>`${h.r}R ${h.w<0?'무승부(공개 없음)':(h.w===t?'우리 팀 승(우리 개수 비밀)':`우리 팀 패 — 우리 병 ${h.lose}개`)}`).join(' / '));
    const tc=m.tchat[t].slice(-12).map(x=>x.from===-1?'· '+x.text:`${x.from===i?'너':nm(x.from)}: ${x.text}`); if(tc.length) L.push('[팀 회의 기록 — 우리 팀만]\n'+tc.join('\n'));
    return L.join('\n'); },
  room(v,me){ const m=v.nm, t=m.myT; if(t==null||!m.tchat[t]) return null; const msgs=m.tchat[t];
    return {icon:'🫘',label:'팀 회의',auto:'kg'+v.ep,msgs,n:msgs.filter(x=>x.from!==me&&x.from!==-1).length,ph:'팀에게만 들려요 (약속은 안 지켜도 돼요)',head:`<b>${KT[t]} 팀</b> ${Object.keys(m.team).map(x=>`<span title="${U.esc(nm(x))}">${emo(x)}</span>`).join('')}`,typing:Object.keys(m.team).includes(String(v.typing))}; },
  card(v,me,out){ const m=v.nm, t=m.myT, mine=t!=null&&!out, sec=Math.max(0,Math.ceil((m.until-Date.now())/1000));
    let h=`<div class="vr-card ga kgai">`+gaTop(`🫘 콩의 딜레마 · ${m.r}/${m.R}라운드 · ${{meet:`🫘 팀 회의 <small>${sec}초</small>`,dep:'🤫 몰래 넣기',res:'📢 병 열기'}[m.ph]}`,this.rule);
    const L=t!=null?t:0, R=1-L, myMem=Object.keys(m.team||{}), oth=t!=null?m.al.filter(x=>!myMem.includes(x)):[], last=m.hist[m.hist.length-1];
    const jar=ti=>{ if(!last) return '<div class="ga-jar"><small>아직 병을 안 열었어요</small><div class="ga-beans"><i style="height:0"></i></div></div>';
      if(last.w<0) return '<div class="ga-jar"><small>지난 라운드</small><div class="ga-beans q"><i style="height:50%"></i><b>?</b></div>무승부 · 비공개</div>';
      if(last.w===ti) return '<div class="ga-jar"><small>지난 라운드</small><div class="ga-beans q"><i style="height:70%"></i><b>?</b></div>🏆 이김 · 개수 비밀</div>';
      return `<div class="ga-jar"><small>지난 라운드</small><div class="ga-beans"><i style="height:${Math.min(100,Math.round(last.lose/Math.max(8,m.al.length*3)*100))}%"></i></div><b>${last.lose}개</b> · 짐</div>`; };
    const team=(ti,mem,cls)=>`<div class="ga-team ${cls} ${t===ti&&mine?'my':''}"><b>${KT[ti]}${t===ti&&mine?' (우리)':''}</b><div class="ga-mem">${mem.length?mem.map(x=>`<span class="${x===me?'me':''}">${gaSay(v,x,x===me?'me':'')}${emo(x)}<i>${U.esc(nm(x))}</i>${m.ph!=='res'&&(m.done||[]).includes(x)&&t===ti?'<em>✓</em>':''}</span>`).join(''):'<small>팀원 비공개</small>'}</div>${jar(ti)}</div>`;
    h+=`<div class="ga-bench">${team(L,t!=null?[me,...myMem.filter(x=>x!==me)].filter(x=>m.al.includes(x)):[],L===0?'b':'o')}<div class="ga-vs">${m.pts[L]} : ${m.pts[R]}<small>3점 먼저</small></div>${team(R,oth,R===0?'b':'o')}</div>`;
    if(mine){ const bn=(m.beans||{})[me];
      if(m.ph==='meet'||m.ph==='dep'){ let b='<div class="ga-nums">'+[...Array((bn|0)+1).keys()].map(n=>`<button class="ghost ${m.dep[me]===n?'on':''}" data-nm='${JSON.stringify({k:'dep',n})}'>${n}</button>`).join('')+'</div>';
        b+=m.dep[me]!=null?`<div class="ga-sub">✔ ${m.dep[me]}개 넣기로 했어요 (병 열기 전까지 바꿀 수 있어요)</div>`:'<div class="ga-sub">몇 개 넣을지 골라 주세요 — 팀이 이기려면 많이, 내가 살려면 적게</div>';
        if(m.ph==='meet'&&!m.ready[me]) b+=`<div class="ga-btns">${gaB({k:'ready'},'회의 끝 ▶','ghost')}</div>`;
        h+=gaDock(`🫘 남은 콩 <b>${bn}</b>개 · 몇 개 넣을까요? <small>(팀 회의는 오른쪽 🫘 팀 회의 탭)</small>`,b); }
      if(m.ph==='res') h+=gaDock(`🫘 남은 콩 <b>${bn}</b>개${last&&last.mine!=null?` · 이번에 ${last.mine}개 넣음`:''}`,m.ready[me]?gaWait('다음 라운드 기다리는 중…'):`<div class="ga-btns">${gaB({k:'ready'},m.over?'최종 결과 ▶':'다음 라운드 ▶')}</div>`); }
    else h+=gaDock('',gaWait('👀 구경 중이에요'));
    if(m.hist.length) h+='<details class="ga-more"><summary>📜 지난 라운드</summary><table class="fs-tab"><tr><th>라운드</th><th>결과</th>'+(mine?'<th>내가 넣은 콩</th>':'')+'</tr>'+m.hist.map(x=>`<tr><td>${x.r}R</td><td>${x.w<0?'🤝 무승부':`${KT[x.w]} 승 · 진 팀 병 ${x.lose}개`}</td>${mine?`<td>${x.mine}</td>`:''}</tr>`).join('')+'</table></details>';
    return h+'</div>'; },
};

/* ───────── 🃏 의심 베팅 · AI판 (2026-11-11 "시즌 게임을 AI 기반으로 새로") ─────────
   카드 60장 = 빨·노·초·파·보 10장씩 + 🌈 10장(어느 색이든 대신). 각자 칩 5개 = 받는 카드 수(최대 5), 내 카드만 보임.
   차례대로 "모두 합쳐 ○색 N장 이상!" — 앞사람보다 큰 N으로 선언하거나 🤨 의심. 의심받으면 선언자는 판돈 1칩 그대로 또는 2배 걸기,
   2배면 의심한 사람은 받기(공개) 또는 포기(1칩 내고 공개 없음). 공개: 그 색 + 🌈 합이 N 이상이면 선언자 승, 아니면 의심한 사람 승 — 진 사람이 판돈만큼 칩을 넘김.
   칩 0이면 탈락. 3명 남거나 6라운드 끝나면 칩 순위. 동물의 선언·의심·베팅·한마디는 AI가(내 카드·확률·상대 버릇을 보고). */
const DB_C=['R','Y','G','B','P'], DB_K={R:'빨강',Y:'노랑',G:'초록',B:'파랑',P:'보라',W:'🌈'}, DB_E={R:'🟥',Y:'🟨',G:'🟩',B:'🟦',P:'🟪',W:'🌈'};
const dbSch=keys=>({type:'object',properties:{pick:{type:'string',enum:keys},say:{type:'string'},memo:{type:'string'}},required:['pick','say','memo'],additionalProperties:false});
/* 🧠 의심 베팅 선택지 표 (NPC 룰 1·2·3·6·10·17, 2026-11-12) — 코드가 "그 색이 N장 이상일 확률"을 남은 카드로 정확히(초기하) 계산하고, 선택지마다 기대 칩을 냄.
   남의 선언은 정보: 다른 사람이 그 색을 선언했으면 1장쯤 가졌다고 보되, 그 사람이 거짓말로 들통난 기록만큼 덜 믿음. 2배를 건 선언자는 자신 있다고 보되 2배 허세 기록만큼 덜 믿음.
   칩 1개(지면 탈락)면 잃을 수 있는 수를 무겁게 봄. 성격: 허세 = 근거 약한 선언도, 믿음 성향 = 의심을 덜. */
function dbHyper(N,K,dr,need){ if(need<=0) return 1; if(need>dr||need>K) return 0; const lc=n=>{ let t=0; for(let k=2;k<=n;k++) t+=Math.log(k); return t; }, C=(a,b)=>b<0||b>a?-Infinity:lc(a)-lc(b)-lc(a-b); let p=0; for(let k=need;k<=Math.min(dr,K);k++) p+=Math.exp(C(K,k)+C(N-K,dr-k)-C(N,dr)); return Math.min(1,p); }
function dbLiar(m,y){ const H=m.hist.filter(h=>h.y===y&&!h.fold); return (H.filter(h=>!h.ok).length+.5)/(H.length+1.5); }   /* 그 사람이 의심받았을 때 거짓이었던 비율 */
function dbProb(m,i,c,n,skip){ const h=m.hand[i]||[], mine=h.filter(y=>y===c||y==='W').length, K=20-mine, N=60-h.length, dr=this_total(m)-h.length;
  let bonus=0; for(const x of [...new Set(m.chain.filter(e=>e.c===c&&e.by!==i&&e.by!==skip).map(e=>e.by))]) bonus+=.7*(1-dbLiar(m,x));   /* 남이 그 색을 선언했으면 가졌을 가능성 */
  const need=n-mine; return Math.min(.99,Math.max(.01,dbHyper(N,K,dr,Math.round(need-bonus)))); }
const this_total=m=>m.al.filter(x=>m.chips[x]>0).reduce((t,x)=>t+Math.min(5,m.chips[x]),0);
const dbU=(m,i,d)=>d<0&&m.chips[i]+d<=0?d-2.5:d;   /* 지면 탈락이면 더 무겁게 */
function dbTurnPlan(s,m,i){ const C=m.claim, T=this_total(m), opts=[], bl=trait(s,i,'bluff'), tr=trait(s,i,'trust');
  if(C){ const q=dbProb(m,i,C.c,C.n), lr=dbLiar(m,C.by); const qq=Math.min(.99,q*(1-.3*(lr-.4)));   /* 거짓말 잦은 사람 선언은 덜 믿음 */
    opts.push({key:'의심',act:'doubt',q:qq,ev:qq*dbU(m,i,-1.2)+(1-qq)*1.2-(tr-.5)*.3,why:`선언이 참일 확률 ${Math.round(qq*100)}%${lr>.5?` (${nm(C.by)}은 거짓말 들통 기록이 많음)`:''}`}); }
  const lo=C?C.n+1:1; for(const c of DB_C) for(let n=lo;n<=Math.min(T,lo+2);n++){ const q=dbProb(m,i,c,n), d=Math.max(.05,Math.min(.9,(1-q)*1.25-.05));
    opts.push({key:`${DB_K[c]} ${n}장`,act:'claim',c,n,q,ev:d*(q*1+(1-q)*dbU(m,i,-1))+(1-d)*.25+(q<.45?(bl-.5)*.5:0),why:`참일 확률 ${Math.round(q*100)}% · 다음 사람이 의심할 확률 약 ${Math.round(d*100)}%`}); }
  const cl=opts.filter(o=>o.act==='claim').sort((a,b)=>b.ev-a.ev).slice(0,6); return opts.filter(o=>o.act==='doubt').concat(cl); }
function dbBetPlan(s,m,who){ const b=m.bet, C=m.claim, opts=[];
  if(b.st==='decl'){ const q=dbProb(m,who,C.c,C.n), f=.35, can=m.chips[who]>=2&&m.chips[b.x]>=2;
    opts.push({key:'1칩 그대로',ch:'single',ev:q*1+(1-q)*dbU(m,who,-1),why:`내 선언이 참일 확률 ${Math.round(q*100)}%`});
    if(can) opts.push({key:'2배',ch:'double',ev:f*1+(1-f)*(q*2+(1-q)*dbU(m,who,-2))+(q<.5?(trait(s,who,'bluff')-.5)*.4:0),why:`상대가 겁먹고 접을 수도(약 ${Math.round(f*100)}%) — 받으면 2칩 승부`}); }
  else { const H=m.hist.filter(h=>h.y===b.y&&h.stake===2&&!h.fold), dbBluff=(H.filter(h=>!h.ok).length+.5)/(H.length+1.5);
    const q0=dbProb(m,who,C.c,C.n,b.y), q=Math.min(.97,q0+(1-q0)*(1-dbBluff)*.4);   /* 2배는 자신감 신호 — 2배 허세 기록만큼 덜 믿음 */
    opts.push({key:'받기',ch:'accept',ev:(1-q)*2+q*dbU(m,who,-2),why:`선언이 참일 확률 ${Math.round(q*100)}%${H.length?` (${nm(b.y)}의 2배 중 허세였던 비율 ${Math.round(dbBluff*100)}%)`:''}`});
    opts.push({key:'포기',ch:'fold',ev:dbU(m,who,-1),why:'1칩만 내고 끝'}); }
  return opts; }
const dbTable=O=>O.map(o=>`- ${o.key}: 기대 ${o.ev>=0?'+':''}${o.ev.toFixed(2)}칩 — ${o.why}`).join('\n');
const dbBest=(s,i,O)=>{ const S=O.slice().sort((a,b)=>b.ev-a.ev), lg=trait(s,i,'logic'), bl=trait(s,i,'bluff'); const near=S.filter(o=>S[0].ev-o.ev<=.08); const sc=o=>o.ev+(o.q!=null&&o.act==='claim'?(o.q-.5)*.3*(lg+.3-bl*.6):0)+Math.random()*.04*(1.2-lg); return near.sort((a,b)=>sc(b)-sc(a))[0]; };   /* 비슷한 후보 중: 논리적일수록 확실한 선언, 허세 많을수록 근거 약한 선언도 */
NAT.doubtai={ maxH:12, title:'의심 베팅', emoji:'🃏', tagline:'모두 합쳐 그 색이 N장 이상? — 선언, 의심, 그리고 판돈 2배',
  rule:'카드 60장(빨·노·초·파·보 10장씩 + 🌈 10장, 🌈는 어느 색이든 대신). 칩 수만큼 카드를 받고(최대 5) 내 카드만 봐요. 차례대로 <b>"모두 합쳐 ○색 N장 이상!"</b> — 앞사람보다 큰 N으로 선언하거나 <b>🤨 의심</b>. 의심받은 선언자는 판돈 1칩 그대로 또는 <b>2배</b>, 2배면 의심한 쪽은 받거나 포기(1칩). 공개해서 그 색 + 🌈 합이 N 이상이면 선언자 승! 진 사람이 판돈만큼 칩을 넘겨요. 칩 0이면 탈락, 3명 남거나 6라운드면 칩 순위.',
  start(s,al){ const m={id:'doubtai',R:6,r:0,al:U.shuffle(al.slice()),chips:{},hand:{},claim:null,chain:[],ph:'turn',turn:null,bet:null,hist:[],out:[],ready:{},lead:null};
    m.al.forEach(id=>m.chips[id]=5); m.lead=m.al[0];
    sys(s,`🃏 제${s.ep}회 메인 매치 「의심 베팅」 — 칩 수만큼 카드를 받아요(내 것만 보임). "모두 합쳐 ○색 N장 이상!"을 이어 가다 거짓 같으면 🤨 의심! 🌈는 어느 색이든 대신해요. 순서: ${m.al.map(nm).join(' → ')}`,'host');
    this.deal(s,m); return m; },
  live(m){ return m.al.filter(x=>m.chips[x]>0); },
  nextOf(m,id){ const L=this.live(m); const k=m.al.indexOf(id); for(let d=1;d<=m.al.length;d++){ const x=m.al[(k+d)%m.al.length]; if(m.chips[x]>0) return x; } return L[0]; },
  total(m){ return this.live(m).reduce((t,x)=>t+Math.min(5,m.chips[x]),0); },
  deal(s,m){ m.r++; const deck=U.shuffle([...DB_C.flatMap(c=>Array(10).fill(c)),...Array(10).fill('W')]); m.hand={};
    for(const x of this.live(m)) m.hand[x]=deck.splice(0,Math.min(5,m.chips[x])).sort();
    m.claim=null; m.chain=[]; m.bet=null; m.ph='turn'; if(!(m.chips[m.lead]>0)) m.lead=this.nextOf(m,m.lead); m.turn=m.lead; m.tdl=Date.now()+10000;
    sys(s,`🃏 ${m.r}/${m.R}라운드 — 카드 ${this.total(m)}장이 깔렸어요 · 칩 ${this.live(m).map(x=>`${nm(x)} ${m.chips[x]}`).join(' · ')} · 먼저 ${nm(m.turn)}`,'host'); },
  count(m,c){ let k=0; for(const x of this.live(m)) for(const y of m.hand[x]) if(y===c||y==='W') k++; return k; },
  delay(){ return 900; },
  ready(){ return true; },
  doClaim(s,m,id,c,n,say){ m.claim={by:id,c,n}; m.chain.push({by:id,c,n}); talk(s,id,(say?say+' ':'')+`(${DB_E[c]} ${DB_K[c]} ${n}장 이상!)`,null,'say'); m.turn=this.nextOf(m,id); m.tdl=Date.now()+10000; },
  doDoubt(s,m,id,say){ const c=m.claim; m.bet={x:id,y:c.by,stake:1,st:'decl'}; m.ph='bet'; m.tdl=Date.now()+15000; talk(s,id,(say?say+' ':'')+`🤨 의심! (${nm(c.by)}의 ${DB_K[c.c]} ${c.n}장)`,c.by,'acc'); },
  reveal(s,m){ const c=m.claim, b=m.bet, k=this.count(m,c.c), ok=k>=c.n, win=ok?b.y:b.x, lose=ok?b.x:b.y, st=Math.min(b.stake,m.chips[lose]);
    m.chips[lose]-=st; m.chips[win]+=st;
    m.hist.push({r:m.r,claim:c,k,ok,x:b.x,y:b.y,stake:b.stake,hand:JSON.parse(JSON.stringify(m.hand))});
    beat(s,'reveal',`${nm(b.x)}의 의심 — ${nm(b.y)} ${DB_K[c.c]} ${c.n}장 ${ok?'성공':'들통'}${b.stake>1?' (판돈 2배)':''} → ${nm(lose)} 칩 −${st}${m.chips[lose]<=0?', 탈락':''}`,(b.stake>1?1.4:1)+(m.chips[lose]<=0?1.5:0),lose);
    sys(s,`🂠 공개 — ${DB_K[c.c]}+🌈 ${k}장 (선언 ${c.n}장) → ${ok?`${nm(b.y)} 선언 성공!`:`${nm(b.y)} 거짓말 들통!`} ${nm(lose)} → ${nm(win)} 칩 ${st}개${m.chips[lose]<=0?` · 💀 ${nm(lose)} 칩 0, 탈락`:''}`,'host');
    addRel(s,lose,win,-.08); if(m.chips[lose]<=0) m.out.push(lose); m.lead=m.chips[lose]>0?lose:this.nextOf(m,lose); this.after(s,m,[lose,win]); },
  fold(s,m){ const b=m.bet; const st=Math.min(1,m.chips[b.x]); m.chips[b.x]-=st; m.chips[b.y]+=st; m.hist.push({r:m.r,claim:m.claim,fold:1,x:b.x,y:b.y,stake:1});
    sys(s,`🏳️ ${nm(b.x)} 포기 — 공개 없이 ${nm(b.y)}에게 칩 1개${m.chips[b.x]<=0?` · 💀 ${nm(b.x)} 탈락`:''}`,'host'); if(m.chips[b.x]<=0) m.out.push(b.x); m.lead=m.chips[b.x]>0?b.x:this.nextOf(m,b.x); this.after(s,m,[b.x,b.y]); },
  after(s,m,who){ m.ph='reveal'; m.until=Date.now()+(this.live(m).some(isHum)?20000:6000); m.ready={};
    const a=who.find(x=>!isHum(x)&&m.chips[x]>=0&&pl(s,x)&&!pl(s,x).out); if(a&&Math.random()<.5) s.aq.push({k:'say',i:a,model:'haiku',task:'의심 베팅 결과가 공개됐다(위 게임 상황의 공개 기록 참고). 테이블에서 한마디 — 이겼으면 장난·여유, 졌으면 억울함·다음 다짐, 블러핑이 들통났으면 능청. 짧게.',fb:['헐 진짜 있었어요?ㅠㅠ','ㅋㅋ 제 말 맞죠?','아… 다음엔 안 속아요!']}); },
  tick(s){ const m=s.nm, now=Date.now(), H=humansAlive(s).filter(h=>m.al.includes(h));
    if(m.ph==='reveal'){ if(now>=m.until||(H.filter(h=>m.chips[h]>0||true).every(h=>m.ready[h])&&H.length)){ if(this.live(m).length<=3||m.r>=m.R) return this.finish(s,m); this.deal(s,m); } return; }
    if(m.ph==='turn'){ const i=m.turn; if(isHum(i)){ s.typing=null; return; }
      const O=dbTurnPlan(s,m,i), rk=this.live(m).slice().sort((a,b)=>m.chips[b]-m.chips[a]);
      const r=need(s,`${s.ep}:db:${m.r}:${m.chain.length}:${i}`,()=>ask(s,i,`의심 베팅 ${m.r}라운드 — 네 차례다(위 게임 상황 참고). ${m.claim?`지금 선언: ${nm(m.claim.by)}의 "${DB_K[m.claim.c]} ${m.claim.n}장 이상".`:'첫 선언이다.'}
[처지] 네 칩 ${m.chips[i]}개 · 칩 순위 ${rk.indexOf(i)+1}/${rk.length}${m.chips[i]<=1?' — 지면 탈락이다!':''} · 남은 라운드 ${m.R-m.r}
[선택지 표 — 코드가 계산함: 네 카드 + 남은 카드로 정확한 확률, 남의 선언(그 사람의 거짓말 기록만큼 보정) 반영, 기대 칩. 블러핑·심리전으로 다른 걸 골라도 되지만 표에 근거가 있어야 한다]
${dbTable(O)}
pick은 표의 이름 하나. say에 짧은 한마디(선언 숫자는 말하지 않아도 됨).`,dbSch(O.map(o=>o.key))));
      if(r===undefined&&now<m.tdl){ s.typing=i; return; } s.typing=null; if(r) memo(s,i,r);
      const ch=(r&&O.find(o=>o.key===r.pick))||dbBest(s,i,O);
      if(ch.act==='doubt'&&m.claim) return this.doDoubt(s,m,i,r?shortSay(r.say,60):'');
      return this.doClaim(s,m,i,ch.c,ch.n,r?shortSay(r.say,60):''); }
    if(m.ph==='bet'){ const b=m.bet; const who=b.st==='decl'?b.y:b.x; if(isHum(who)){ s.typing=null; return; }
      const O=dbBetPlan(s,m,who);
      const r=need(s,`${s.ep}:dbb:${m.r}:${b.st}:${who}`,()=>ask(s,who,`${b.st==='decl'?`의심 베팅 — ${nm(b.x)}이(가) 네 선언("${DB_K[m.claim.c]} ${m.claim.n}장 이상")을 의심했다. 판돈 1칩 그대로 공개하거나, 2배로 겁줄 수 있다(진짜 자신 있거나 블러핑).`:`의심 베팅 — 네가 의심한 ${nm(b.y)}이(가) 판돈을 2배로 올렸다. 받고 공개하거나(지면 2칩), 포기(1칩 내고 공개 없음).`}
[처지] 네 칩 ${m.chips[who]}개${m.chips[who]<=2?' — 잘못하면 탈락':''}
[선택지 표 — 코드가 계산함(확률·상대의 2배 허세 기록 반영)]
${dbTable(O)}
pick은 표의 이름 하나. say에 한마디.`,dbSch(O.map(o=>o.key))));
      if(r===undefined&&now<m.tdl){ s.typing=who; return; } s.typing=null; if(r) memo(s,who,r);
      const say_=r&&shortSay(r.say,60), ch=(r&&O.find(o=>o.key===r.pick))||dbBest(s,who,O);
      if(b.st==='decl'){ const dbl=ch.ch==='double';
        if(say_) talk(s,who,say_,b.x,'say'); if(dbl&&m.chips[who]>=2&&m.chips[b.x]>=2){ b.stake=2; b.st='doubter'; m.tdl=Date.now()+15000; sys(s,`💰 ${nm(who)} 판돈 2배! — ${nm(b.x)}, 받을래요 포기할래요?`,'host'); return; } return this.reveal(s,m); }
      const acc=ch.ch!=='fold'; if(say_) talk(s,who,say_,b.y,'say'); return acc?this.reveal(s,m):this.fold(s,m); } },
  finish(s,m){ const live=this.live(m).sort((a,b)=>m.chips[b]-m.chips[a]||Math.random()-.5); const ids=[...live,...m.out.slice().reverse()];
    sys(s,'🃏 최종 칩 — '+ids.map((x,k)=>`${k+1}위 ${nm(x)} ${m.chips[x]}`).join(' · '),'host'); s.nm=null; announceMain(s,'doubtai',ids,null,m.chips,'칩'); },
  apply(s,me,a){ const m=s.nm; if(!m.al.includes(me)) return '이번 게임 참가자가 아니에요';
    if(a.k==='ready'){ if(m.ph!=='reveal') return '지금은 아니에요'; m.ready[me]=1; return null; }
    if(m.chips[me]<=0) return '칩이 없어 구경 중이에요';
    if(a.k==='claim'){ if(m.ph!=='turn'||m.turn!==me) return '내 차례가 아니에요'; if(!DB_C.includes(a.c)) return '색을 고르세요'; const n=a.n|0; if(n<=(m.claim?m.claim.n:0)) return `${(m.claim?m.claim.n:0)+1}장 이상으로 선언해요`; if(n>this.total(m)) return '깔린 카드보다 많아요'; this.doClaim(s,m,me,a.c,n,''); return null; }
    if(a.k==='doubt'){ if(m.ph!=='turn'||m.turn!==me) return '내 차례가 아니에요'; if(!m.claim) return '의심할 선언이 없어요'; this.doDoubt(s,m,me,''); return null; }
    if(a.k==='bet'){ if(m.ph!=='bet') return '지금은 아니에요'; const b=m.bet;
      if(b.st==='decl'&&b.y===me){ if(a.v==='double'&&m.chips[me]>=2&&m.chips[b.x]>=2){ b.stake=2; b.st='doubter'; m.tdl=Date.now()+15000; sys(s,`💰 ${nm(me)} 판돈 2배! — ${nm(b.x)}, 받을래요 포기할래요?`,'host'); return null; } this.reveal(s,m); return null; }
      if(b.st==='doubter'&&b.x===me){ if(a.v==='fold') this.fold(s,m); else this.reveal(s,m); return null; }
      return '내 차례가 아니에요'; }
    return '알 수 없는 동작'; },
  mask(v,me){ const m=v.nm; if(!m) return; if(m.ph!=='reveal'){ m.hand={[me]:m.hand[me]||[]}; } m.hist=m.hist.map((h,k)=>k===m.hist.length-1?h:Object.assign({},h,{hand:null})); },
  view(s,i){ const m=s.nm, L=['[지금 게임: 🃏 의심 베팅] 카드 60장(빨·노·초·파·보 10장씩 + 🌈 10장, 🌈는 어느 색이든 대신 → 아무 카드가 특정 색 또는 🌈일 확률 1/3). 칩 수만큼 카드(최대 5), 내 카드만 앎. 차례대로 "모두 합쳐 ○색 N장 이상" 더 큰 N으로 선언하거나 의심. 의심받은 선언자는 판돈 1칩 또는 2배, 2배면 의심한 쪽은 받기(공개) 또는 포기(1칩). 공개해서 그 색+🌈가 N 이상이면 선언자 승, 진 사람이 판돈 칩을 넘김. 칩 0이면 탈락, 3명 남거나 6라운드면 칩 순위.'];
    L.push(`[지금] ${m.r}/${m.R}라운드 · 깔린 카드 ${this.total(m)}장 · 칩: ${m.al.map(x=>`${nm(x)} ${m.chips[x]}`).join(', ')}`);
    if(m.hand[i]) L.push(`[네 카드 — 너만 앎] ${m.hand[i].map(c=>DB_K[c]).join(', ')} (색별: ${DB_C.map(c=>`${DB_K[c]} ${m.hand[i].filter(y=>y===c||y==='W').length}`).join(', ')} — 🌈 포함)`);
    if(m.chain.length) L.push('[이번 라운드 선언] '+m.chain.map(x=>`${nm(x.by)} ${DB_K[x.c]} ${x.n}장`).join(' → '));
    if(m.hist.length) L.push('[지난 공개 기록] '+m.hist.slice(-5).map(h=>h.fold?`${h.r}R ${nm(h.x)}가 ${nm(h.y)}의 ${DB_K[h.claim.c]} ${h.claim.n}장 의심 후 포기`:`${h.r}R ${nm(h.y)} "${DB_K[h.claim.c]} ${h.claim.n}장" — 실제 ${h.k}장 ${h.ok?'(진짜)':'(뻥)'}, 의심 ${nm(h.x)}${h.stake>1?' 2배':''}`).join(' / '));
    return L.join('\n'); },
  card(v,me,out){ const m=v.nm, mine=m.al.includes(me)&&!out&&m.chips[me]>0, T=m.al.filter(x=>m.chips[x]>0).reduce((t,x)=>t+Math.min(5,m.chips[x]),0);
    let h=`<div class="vr-card ga dbai">`+gaTop(`🃏 의심 베팅 · ${m.r}/${m.R}라운드 · 깔린 카드 ${T}장`,this.rule);
    const P=m.al, hh=m.ph==='reveal'?m.hist[m.hist.length-1]:null;
    h+='<div class="ga-ring">'+P.map((x,k)=>{ const a=-Math.PI/2+k*2*Math.PI/P.length, X=50+42*Math.cos(a), Y=50+40*Math.sin(a), nC=m.chips[x]>0?Math.min(5,m.chips[x]):0;
      return `<div class="ga-rp ${m.turn===x&&m.ph==='turn'?'turn':''} ${m.chips[x]<=0?'out':''} ${x===me?'me':''} ${X>72?'eR':X<28?'eL':''}" style="left:${X.toFixed(1)}%;top:${Y.toFixed(1)}%">${m.claim&&m.claim.by===x?'<span class="ga-tag r">선언</span>':''}${gaSay(v,x,x===me?'me':'')}<span class="av">${emo(x)}</span><i>${U.esc(nm(x))}</i><span class="backs">${'<b></b>'.repeat(nC)}</span><small>🪙${m.chips[x]}</small></div>`; }).join('');
    let mid='';
    if(hh&&hh.claim){ mid=`<small>${emo(hh.y)} ${U.esc(nm(hh.y))}의 선언</small><b>${DB_E[hh.claim.c]} ${DB_K[hh.claim.c]} ${hh.claim.n}장 이상</b><small>${hh.fold?'🏳️ 의심한 쪽 포기':`실제 ${DB_K[hh.claim.c]}+🌈 <b>${hh.k}</b>장 → ${hh.ok?'✅ 선언 성공':'💥 뻥 들통'}`}</small>`; }
    else if(m.claim){ const c=m.claim, myH=(m.hand||{})[me]; mid=`<small>${emo(c.by)} ${U.esc(nm(c.by))}의 선언</small><b>${DB_E[c.c]} ${DB_K[c.c]} ${c.n}장 이상!</b>`;
      if(m.ph==='bet') mid+=`<small>🤨 ${U.esc(nm(m.bet.x))}의 의심 · 판돈 ${m.bet.stake>1?'×2':'1칩'}</small>`;
      if(myH&&c.by!==me){ const k=myH.filter(y=>y===c.c||y==='W').length, p=gaAtLeast(T-myH.length,c.n-k,1/3); mid+=`<div class="ga-meter"><i style="width:${Math.round(p*100)}%"></i></div><small>내 패로 본 가능성: ${p>=.75?'꽤 있을 듯':p>=.45?'반반쯤':p>=.2?'좀 의심스러움':'거의 뻥 같아요'}</small>`; } }
    else mid=`<small>${m.turn?`${emo(m.turn)} ${U.esc(nm(m.turn))}부터`:''}</small><b>첫 선언을 기다려요</b><small>"모두 합쳐 ○색 N장 이상!"</small>`;
    h+=`<div class="ga-claim">${mid}</div></div>`;
    if(hh&&hh.hand) h+='<div class="ga-reveal">'+Object.keys(hh.hand).map(x=>`<div>${emo(x)} <i>${U.esc(nm(x))}</i> ${hh.hand[x].map(c=>`<span class="${c===hh.claim.c||c==='W'?'hit':'miss'}">${gaDb(c)}</span>`).join('')}</div>`).join('')+'</div>';
    const myH=(m.hand||{})[me];
    if(m.al.includes(me)&&!out){ const cc=m.claim?m.claim.c:(window.__dbSel&&window.__dbSel.c)||'R';
      let lbl=myH?`내 카드 — ${DB_K[cc]} ${myH.filter(y=>y===cc).length}장 · 🌈 ${myH.filter(y=>y==='W').length}장`:'내 카드 없음';
      let b=myH?'<div class="ga-hand">'+myH.map(gaDb).join('')+'</div>':'';
      if(m.ph==='turn'&&mine&&m.turn===me){ const lo=(m.claim?m.claim.n:0)+1; const sel=(window.__dbSel=window.__dbSel||{c:'R'});
        b+='<div class="ga-row"><small>색</small>'+DB_C.map(c=>`<button class="small ghost ${sel.c===c?'on':''}" data-dbc="${c}">${DB_E[c]} ${DB_K[c]}</button>`).join('')+'</div>';
        b+='<div class="ga-row"><small>몇 장 이상</small>'+[...Array(Math.max(0,T-lo+1)).keys()].map(k=>lo+k).slice(0,12).map(n=>`<button class="small ghost" data-nm='${JSON.stringify({k:'claim',c:sel.c,n})}'>${n}</button>`).join('')+'</div>';
        if(m.claim) b+=`<div class="ga-btns">${gaB({k:'doubt'},'🤨 의심!','red')}</div>`; lbl='⬆ 더 크게 선언하거나 🤨 의심! · '+lbl; }
      else if(m.ph==='turn') b+=gaWait(`${emo(m.turn)} ${U.esc(nm(m.turn))} 차례…`);
      if(m.ph==='bet'){ const bt=m.bet; if(bt.st==='decl'&&bt.y===me) b+=`<div class="ga-sub">🤨 ${U.esc(nm(bt.x))}이(가) 의심했어요!</div><div class="ga-btns">${gaB({k:'bet',v:'double'},'💰 판돈 2배')}${gaB({k:'bet',v:'single'},'그냥 공개','ghost')}</div>`;
        else if(bt.st==='doubter'&&bt.x===me) b+=`<div class="ga-sub">💰 ${U.esc(nm(bt.y))}이(가) 판돈 2배!</div><div class="ga-btns">${gaB({k:'bet',v:'accept'},'받고 공개')}${gaB({k:'bet',v:'fold'},'🏳️ 포기 (1칩)','ghost')}</div>`;
        else b+=gaWait(`🤨 ${U.esc(nm(bt.x))} vs ${U.esc(nm(bt.y))} — 베팅 중…`); }
      if(m.ph==='reveal') b+=m.ready[me]?gaWait('다음 라운드 기다리는 중…'):`<div class="ga-btns">${gaB({k:'ready'},'다음 ▶')}</div>`;
      h+=gaDock(lbl,b); }
    else h+=gaDock('',gaWait('👀 구경 중이에요'));
    return h+'</div>'; },
};

/* ───────── 🎲 트리플 다이스 · AI판 ─────────
   4라운드. 각자 주사위 6개(4개 공개, 2개는 나만 봄). 🔮 몰래 내 순위 예측(1~4위) → 🎲 차례대로 주사위 3개 제출(숨은 주사위는 ?로) → 공개.
   조합: 트리플 > 스트레이트(연속 3) > 더블 > 싱글, 같으면 숫자 큰 쪽. 1위 6 · 2위 3 · 3위 1 · 4위 0(동률 나눔). 예측 적중이면 2배, 꼴찌 예측 적중은 +8. 합계 1위가 우승. */
const DI_F=['','1','2','3','4','5','6'], DI_PT=[6,3,1,0];
const diPredSch={type:'object',properties:{rank:{type:'integer',enum:[1,2,3,4]},say:{type:'string'},memo:{type:'string'}},required:['rank','say','memo'],additionalProperties:false};
const diSubSch=keys=>({type:'object',properties:{pick:{type:'string',enum:keys},say:{type:'string'},memo:{type:'string'}},required:['pick','say','memo'],additionalProperties:false});
function diScore(v){ const a=v.slice().sort((x,y)=>y-x); if(a[0]===a[2]) return 400+a[0]; if(a[0]-a[1]===1&&a[1]-a[2]===1) return 300+a[0]; if(a[0]===a[1]) return 200+a[0]*10+a[2]; if(a[1]===a[2]) return 200+a[1]*10+a[0]; return 100+a[0]+a[1]/10+a[2]/100; }
function diName(v){ const x=diScore(v); return x>=400?'트리플':x>=300?'스트레이트':x>=200?'더블':'싱글'; }
function diBest(d){ let best=null,bv=-1; for(let a=0;a<6;a++) for(let b=a+1;b<6;b++) for(let c=b+1;c<6;c++){ const v=diScore([d[a],d[b],d[c]]); if(v>bv){ bv=v; best=[a,b,c]; } } return best; }
/* 🧠 트리플 다이스 선택지 표 (NPC 룰 1·2·3·10, 2026-11-12) — 예측과 제출을 같이 계산.
   남의 숨은 주사위(2개)는 무작위로 뽑고, 남은 대개(75%) 가장 센 조합, 가끔(25%) 일부러 약한 조합(꼴찌 예측 +8 노림)을 낸다고 봄. 이미 낸 사람은 낸 것 그대로(? 자리만 뽑음).
   그렇게 여러 번 굴려 "조합마다 내 순위 분포" → 예측 순위별 기대 점수(적중 2배, 4위 적중 +8). 예측 때는 순위마다 가장 맞는 조합 기준. */
const DI_TRI=(()=>{ const T=[]; for(let a=0;a<6;a++) for(let b=a+1;b<6;b++) for(let c=b+1;c<6;c++) T.push([a,b,c]); return T; })();
function diWorst(d){ let w=null,wv=1e9; for(const t of DI_TRI){ const v=diScore(t.map(k=>d[k])); if(v<wv){ wv=v; w=t; } } return w; }
function diRankDist(m,i,N){ const others=m.al.filter(x=>x!==i), D=DI_TRI.map(()=>[0,0,0,0]);
  for(let n=0;n<N;n++){ const ov={}; for(const x of others){ const d=m.dice[x].slice(0,4).concat([1+(Math.random()*6|0),1+(Math.random()*6|0)]); const sub=m.sub&&m.sub[x]?m.sub[x]:(Math.random()<.75?diBest(d):diWorst(d)); ov[x]=diScore(sub.map(k=>d[k])); }
    const ovs=Object.values(ov); DI_TRI.forEach((t,ti)=>{ const v=diScore(t.map(k=>m.dice[i][k])); const rk=1+ovs.filter(o=>o>v).length; D[ti][Math.min(3,rk-1)]++; }); }
  return D.map(r=>r.map(c=>c/N)); }
const diGain=(rk,pred)=>rk===pred?DI_PT[rk-1]*2+(pred===4?8:0):DI_PT[rk-1];
function diPlan(m,i){ const key=`${m.r}:${m.ph}:${Object.keys(m.sub||{}).length}:${i}`; if(m._dp&&m._dp.key===key) return m._dp.v;
  const D=diRankDist(m,i,160), name=t=>`${t.map(k=>k>=4?`(${m.dice[i][k]})`:m.dice[i][k]).join('·')} ${diName(t.map(k=>m.dice[i][k]))}`;
  const ev=(ti,pred)=>D[ti].reduce((t,p,k)=>t+p*diGain(k+1,pred),0);
  const preds=[1,2,3,4].map(pr=>{ let bt=0; DI_TRI.forEach((t,ti)=>{ if(ev(ti,pr)>ev(bt,pr)) bt=ti; }); return {pred:pr,ev:ev(bt,pr),p:D[bt][pr-1],combo:name(DI_TRI[bt])}; });
  const subs=m.pred[i]!=null?DI_TRI.map((t,ti)=>({t,key:t.join(','),ev:ev(ti,m.pred[i]),p:D[ti][m.pred[i]-1],combo:name(t)})).sort((a,b)=>b.ev-a.ev).filter((o,k,A)=>A.findIndex(x=>x.combo===o.combo)===k).slice(0,7):[];
  const v={preds,subs}; m._dp={key,v}; return v; }
NAT.diceai={ maxH:12, title:'트리플 다이스', emoji:'🎲', tagline:'숨은 주사위 두 개, 그리고 몰래 건 내 순위',
  rule:'4라운드. 주사위 6개를 굴려 <b>4개는 모두에게 공개, 2개는 나만</b> 봐요. 🔮 몰래 이번 라운드 내 순위(1~4위)를 예측 → 🎲 차례대로 주사위 3개를 내요(숨은 주사위는 ?로 냈다가 끝에 공개). 조합: <b>트리플 > 스트레이트(연속 3) > 더블 > 싱글</b>. 1위 6점 · 2위 3 · 3위 1 · 4위 0. <b>예측 적중이면 2배</b>, 꼴찌 예측 적중은 +8!',
  start(s,al){ const m={id:'diceai',R:4,r:0,al:U.shuffle(al.slice()),tot:{},hist:[],ready:{},lead:null}; m.al.forEach(x=>m.tot[x]=0); m.lead=m.al[0];
    sys(s,`🎲 제${s.ep}회 메인 매치 「트리플 다이스」 — 주사위 6개 중 4개는 공개, 2개는 나만! 몰래 내 순위를 예측하고, 주사위 3개로 조합을 내요. 예측이 맞으면 2배!`,'host'); this.roll(s,m); return m; },
  roll(s,m){ m.r++; m.dice={}; m.pred={}; m.sub={}; m.ready={}; m.plan={}; m.ph='pred'; m.until=Date.now()+50000; m.pdl=Date.now()+25000;
    for(const x of m.al) m.dice[x]=[...Array(6)].map(()=>1+(Math.random()*6|0));
    const k=m.al.indexOf(m.lead); m.order=[...m.al.slice(k),...m.al.slice(0,k)]; m.turn=null;
    sys(s,`🎲 ${m.r}/${m.R}라운드 — 주사위를 굴렸어요(공개 4개: ${m.al.map(x=>`${nm(x)} ${m.dice[x].slice(0,4).map(v=>DI_F[v]).join('·')}`).join(' · ')}). 🔮 몰래 순위를 예측하세요`,'host'); },
  delay(){ return 900; }, ready(){ return true; },
  ani(s,m){ return m.al.filter(x=>!isHum(x)); },
  tick(s){ const m=s.nm, now=Date.now(), H=humansAlive(s).filter(h=>m.al.includes(h));
    if(m.ph==='pred'){
      for(const i of this.ani(s,m)){ if(m.plan[i]) continue; const PL=diPlan(m,i), rkT=m.al.slice().sort((a,b)=>m.tot[b]-m.tot[a]);
        const r=need(s,`${s.ep}:dip:${m.r}:${i}`,()=>ask(s,i,`트리플 다이스 ${m.r}/${m.R}라운드 — 이번 라운드 네 순위(rank 1~4)를 몰래 예측해라(적중이면 점수 2배, 4위 적중은 +8).
[처지] 합계 순위 ${rkT.indexOf(i)+1}/${rkT.length} (${m.tot[i]}점, 1위와 ${m.tot[rkT[0]]-m.tot[i]}점 차) · 남은 라운드 ${m.R-m.r}
[선택지 표 — 코드가 계산함: 남의 숨은 주사위와 고를 조합을 여러 번 뽑아 봄. 순위마다 가장 맞는 조합으로 냈을 때]
${PL.preds.map(o=>`- ${o.pred}위: 그 순위가 될 확률 ${Math.round(o.p*100)}% · 기대 ${o.ev.toFixed(1)}점 (낼 조합 ${o.combo})`).join('\n')}
rank는 표의 순위 중 하나. say에 테이블 한마디(허세·떠보기 가능, 숨은 주사위는 말해도 거짓말이어도 됨).`,diPredSch,'haiku'));
        if(r===undefined&&now<m.pdl) continue; m.plan[i]=1; if(r) memo(s,i,r);
        m.pred[i]=r&&r.rank>=1&&r.rank<=4?r.rank|0:(()=>{ const S=PL.preds.slice().sort((a,b)=>b.ev-a.ev); const lg=trait(s,i,'logic'); const near=S.filter(o=>S[0].ev-o.ev<=.4*(1.2-lg)); return U.pick(near).pred; })();
        const t=r&&shortSay(r.say,80); if(t) talk(s,i,t,null,'say'); return; }
      if(this.ani(s,m).every(i=>m.plan[i])&&(now>=m.until||H.every(h=>m.pred[h]!=null))&&H.every(h=>m.pred[h]!=null||now>=m.until)){
        for(const h of H) if(m.pred[h]==null) m.pred[h]=2;
        m.ph='sub'; m.turn=m.order[0]; m.tdl=now+15000; sys(s,`🎲 제출 — ${m.order.map(nm).join(' → ')} 순서로 주사위 3개를 내요`,'host'); }
      return; }
    if(m.ph==='sub'){ const i=m.turn; if(isHum(i)){ s.typing=null; return; }
      const seen=m.order.filter(x=>m.sub[x]).map(x=>`${nm(x)}: ${m.sub[x].map(k=>k>=4?'?':m.dice[x][k]).join(',')}`).join(' / ');
      const PL=diPlan(m,i);
      const r=need(s,`${s.ep}:dis:${m.r}:${i}`,()=>ask(s,i,`트리플 다이스 ${m.r}라운드 — 네 차례에 주사위 3개를 낸다. 네 주사위: ${m.dice[i].map((v,k)=>`${v}${k>=4?'(숨은)':''}`).join(', ')}. 앞사람들이 낸 것: ${seen||'없음'} (?는 숨은 주사위). 네가 예측한 순위는 ${m.pred[i]}위 — 그 순위가 되게 내야 2배(4위면 +8). 1위만이 답은 아니다.
[선택지 표 — 코드가 계산함: 조합마다 네가 예측한 ${m.pred[i]}위가 될 확률과 기대 점수. (괄호)는 숨은 주사위]
${PL.subs.map(o=>`- ${o.key}: ${o.combo} → ${m.pred[i]}위 확률 ${Math.round(o.p*100)}% · 기대 ${o.ev.toFixed(1)}점`).join('\n')}
pick은 표 맨 앞의 주사위 번호 묶음(예: "0,2,5") 하나. say에 짧은 한마디.`,diSubSch(PL.subs.map(o=>o.key)),'haiku'));
      if(r===undefined&&now<m.tdl){ s.typing=i; return; } s.typing=null; if(r) memo(s,i,r);
      let pick=r&&PL.subs.find(o=>o.key===r.pick); pick=pick?pick.t:(PL.subs[0]||{t:diBest(m.dice[i])}).t;
      this.submit(s,m,i,pick,r&&shortSay(r.say,60)); return; }
    if(m.ph==='res'){ if(now>=m.until||(H.length&&H.every(h=>m.ready[h]))){ if(m.r>=m.R) return this.finish(s,m); this.roll(s,m); } return; } },
  submit(s,m,i,pick,say){ m.sub[i]=pick.slice().sort((a,b)=>a-b); talk(s,i,(say?say+' ':'')+`(🎲 ${m.sub[i].map(k=>k>=4?'?':DI_F[m.dice[i][k]]).join('·')})`,null,'say');
    const k=m.order.indexOf(i); if(k<m.order.length-1){ m.turn=m.order[k+1]; m.tdl=Date.now()+15000; return; } this.settle(s,m); },
  settle(s,m){ const val={}; for(const x of m.al) val[x]=diScore(m.sub[x].map(k=>m.dice[x][k]));
    const sorted=m.al.slice().sort((a,b)=>val[b]-val[a]); const pts={}, rank={}; let k=0;
    while(k<sorted.length){ let j=k; while(j+1<sorted.length&&val[sorted[j+1]]===val[sorted[k]]) j++; const avg=DI_PT.slice(k,j+1).reduce((t,x)=>t+x,0)/(j-k+1); for(let q=k;q<=j;q++){ pts[sorted[q]]=avg; rank[sorted[q]]=k+1; } k=j+1; }
    const gain={}; for(const x of m.al){ const hit=m.pred[x]===rank[x]; gain[x]=Math.round((hit?pts[x]*2:pts[x])+(hit&&m.pred[x]===4?8:0)); m.tot[x]+=gain[x]; }
    m.hist.push({r:m.r,dice:JSON.parse(JSON.stringify(m.dice)),sub:JSON.parse(JSON.stringify(m.sub)),pred:Object.assign({},m.pred),rank,gain});
    sys(s,`📢 ${m.r}라운드 — `+sorted.map(x=>`${rank[x]}위 ${nm(x)} ${m.sub[x].map(k=>DI_F[m.dice[x][k]]).join('·')} ${diName(m.sub[x].map(k=>m.dice[x][k]))} (예측 ${m.pred[x]}위${m.pred[x]===rank[x]?' ✨적중':''}) +${gain[x]}`).join(' · '),'host');
    m.lead=sorted[0]; m.ph='res'; m.until=Date.now()+(m.al.some(isHum)?20000:6000); m.ready={};
    const a=Math.random()<.4&&U.pick(this.ani(s,m)); if(a) s.aq.push({k:'say',i:a,model:'haiku',task:'트리플 다이스 라운드 결과가 공개됐다(위 게임 상황 참고). 테이블에서 한마디 — 예측 적중 자랑·아쉬움·남의 블러핑 지적. 짧게.',fb:['헐 그게 숨어 있었어요?ㅋㅋ','예측 맞췄다!ㅎㅎ','아 아깝다ㅠㅠ']}); },
  finish(s,m){ const ids=m.al.slice().sort((a,b)=>m.tot[b]-m.tot[a]||Math.random()-.5); sys(s,'🎲 최종 — '+ids.map((x,k)=>`${k+1}위 ${nm(x)} ${m.tot[x]}점`).join(' · '),'host'); s.nm=null; announceMain(s,'diceai',ids,null,m.tot); },
  apply(s,me,a){ const m=s.nm; if(!m.al.includes(me)) return '이번 게임 참가자가 아니에요';
    if(a.k==='pred'){ if(m.ph!=='pred') return '지금은 예측할 때가 아니에요'; const r=a.n|0; if(!(r>=1&&r<=4)) return '1~4위'; m.pred[me]=r; return null; }
    if(a.k==='sub'){ if(m.ph!=='sub'||m.turn!==me) return '내 차례가 아니에요'; const p=[...new Set((a.d||[]).map(x=>x|0))].filter(x=>x>=0&&x<6); if(p.length!==3) return '주사위 3개를 고르세요'; this.submit(s,m,me,p,''); return null; }
    if(a.k==='ready'){ if(m.ph!=='res') return '지금은 아니에요'; m.ready[me]=1; return null; }
    return '알 수 없는 동작'; },
  mask(v,me){ const m=v.nm; if(!m) return; delete m._dp; if(m.ph!=='res'){ for(const x of Object.keys(m.dice)) if(x!==me) m.dice[x]=m.dice[x].map((d,k)=>k>=4?0:d); m.pred=m.pred[me]!=null?{[me]:m.pred[me]}:{}; } m.plan={}; },
  view(s,i){ const m=s.nm, L=['[지금 게임: 🎲 트리플 다이스] 4라운드. 주사위 6개(0~3번 공개, 4·5번은 본인만 앎). 몰래 내 순위(1~4) 예측 → 차례대로 주사위 3개 제출(숨은 주사위는 ?로) → 공개. 조합: 트리플>스트레이트(연속 3)>더블>싱글, 같으면 숫자 큰 쪽. 1위 6·2위 3·3위 1·4위 0, 예측 적중이면 2배, 4위 적중 +8.'];
    L.push(`[지금] ${m.r}/${m.R}라운드 · ${{pred:'순위 예측 중',sub:'주사위 제출 중',res:'결과 공개 직후'}[m.ph]}`);
    L.push('[공개 주사위] '+m.al.map(x=>`${nm(x)} ${m.dice[x].slice(0,4).join(',')}`).join(' / '));
    L.push(`[네 숨은 주사위 — 너만 앎] ${m.dice[i].slice(4).join(',')}${m.pred[i]!=null?` · 네 예측 ${m.pred[i]}위`:''}`);
    L.push('[합계] '+m.al.map(x=>`${nm(x)} ${m.tot[x]}`).join(', '));
    if(m.hist.length) L.push('[지난 라운드] '+m.hist.map(h=>`${h.r}R: `+m.al.map(x=>`${nm(x)} ${h.rank[x]}위(예측 ${h.pred[x]})`).join(', ')).join(' / '));
    return L.join('\n'); },
  card(v,me,out){ const m=v.nm, mine=m.al.includes(me)&&!out; if(window.__diR!==m.r+':'+me){ window.__diR=m.r+':'+me; window.__diSel=[]; }
    let h=`<div class="vr-card ga diai">`+gaTop(`🎲 트리플 다이스 · ${m.r}/${m.R}라운드 · ${{pred:'🔮 순위 예측',sub:'🎲 주사위 제출',res:'📢 공개'}[m.ph]}`,this.rule);
    const last=m.ph==='res'?m.hist[m.hist.length-1]:null;
    h+='<div class="ga-drows">'+m.order.map(x=>{ const sb=m.sub[x], d=m.dice[x];
      const chip=last&&last.rank?`<span class="ga-tag ${last.rank[x]===last.pred[x]?'g':''}">${last.rank[x]}위 · 예측 ${last.pred[x]}위${last.rank[x]===last.pred[x]?' ✨':''}</span>`:x===me&&m.pred[me]!=null?`<span class="ga-tag">🔮 내 예측 ${m.pred[me]}위</span>`:sb?'<span class="ga-tag k">제출</span>':'';
      return `<div class="ga-drow ${m.turn===x&&m.ph==='sub'?'turn':''} ${x===me?'me':''}"><span class="who">${gaSay(v,x,x===me?'me':'')}${emo(x)} ${U.esc(nm(x))}<small>${m.tot[x]}점</small></span><span class="dd">${d.map((n,k)=>gaDie(n,`${k>=4?'sec':''} ${sb&&sb.includes(k)?'sel':''}`)).join('')}</span>${chip}</div>`; }).join('')+'</div>';
    if(mine){ const D=m.dice[me];
      if(m.ph==='pred') h+=gaDock(`🔮 이번 라운드 내 순위를 몰래 예측 — 맞으면 점수 2배, 4위 적중은 +8`,`<div class="ga-hand dice">${D.map((n,k)=>gaDie(n,k>=4?'sec big':'big')).join('')}</div><div class="ga-btns">${[1,2,3,4].map(n=>gaB({k:'pred',n},`${n}위`,m.pred[me]===n?'':'ghost')).join('')}</div>${m.pred[me]!=null?`<div class="ga-sub">✔ ${m.pred[me]}위로 예측 (바꿀 수 있어요)</div>`:''}`);
      else if(m.ph==='sub'&&m.turn===me){ const sel=(window.__diSel=window.__diSel||[]).filter(k=>k>=0&&k<6);
        h+=gaDock(`🎲 내 주사위 — 3개 골라 내기${sel.length===3?` (지금 고른 것: ${sel.map(k=>D[k]).join('·')} ${diName(sel.map(k=>D[k]))}!)`:''} <small>🔒 = 남에게 안 보이는 주사위</small>`,`<div class="ga-hand dice">${D.map((n,k)=>gaDie(n,`big ${k>=4?'sec':''} ${sel.includes(k)?'sel':''}`,`data-dis="${k}" role="button"`)).join('')}</div>`+(sel.length===3?`<div class="ga-btns">${gaB({k:'sub',d:sel},`🎲 ${sel.map(k=>D[k]).join('·')} 내기 — ${diName(sel.map(k=>D[k]))}`)}</div>`:'<div class="ga-sub">3개를 눌러 골라 주세요</div>')); }
      else if(m.ph==='sub') h+=gaDock(m.sub[me]?`✔ 냈어요 — ${diName(m.sub[me].map(k=>D[k]))}`:'',gaWait(`${emo(m.turn)} ${U.esc(nm(m.turn))} 차례…`));
      else if(m.ph==='res') h+=gaDock('',m.ready[me]?gaWait('기다리는 중…'):`<div class="ga-btns">${gaB({k:'ready'},m.r>=m.R?'최종 결과 ▶':'다음 라운드 ▶')}</div>`); }
    else h+=gaDock('',gaWait('👀 구경 중이에요'));
    return h+'</div>'; },
};

/* ───────── 🔮 승부 예측 · AI판 ─────────
   5라운드. 카드: 빨·파·노 1~10 + 💯 2장 + 0️⃣ 2장. 라운드마다 각자 3장, 오픈 카드 1장(그 색이 으뜸).
   🔮 선부터 "몇 번 이길게요(0~3)" 공개 예측 → 3번 겨루기: 선이 아무 카드, 나머지는 선의 색을 따라야(없으면 아무거나, 💯·0️⃣는 언제든).
   승리: 💯(여럿이면 나중 것) > 으뜸 색 최고 > 선의 색 최고, 0️⃣은 항상 짐. 이긴 사람이 다음 선.
   점수: 100점에서 시작, 예측 적중 = 10 + 이긴 수×10, 빗나가면 차이×10 감점. 합계 1위. */
const PW_C=['빨','파','노'], PW_E=['🟥','🟦','🟨'];
const pwCard=c=>c.v===100?'💯':c.v===0?'0️⃣':PW_E[c.c]+c.v;
const pwPredSch={type:'object',properties:{n:{type:'integer',enum:[0,1,2,3]},say:{type:'string'},memo:{type:'string'}},required:['n','say','memo'],additionalProperties:false};
const pwPlaySch=L=>({type:'object',properties:{card:{type:'integer',enum:L},say:{type:'string'},memo:{type:'string'}},required:['card','say','memo'],additionalProperties:false});
/* 🧠 승부 예측 선택지 표 (NPC 룰 1·2·3·10, 2026-11-12) — 남의 손패를 남은 카드에서 뽑고, 모두가 "자기 예측을 맞추려고"(더 이겨야 하면 이길 카드, 아니면 질 카드) 낸다고 보고 라운드를 끝까지 150번 굴림.
   예측: 0~3승마다 기대 점수(적중 10+이긴 수×10, 빗나가면 차이×10). 카드: 낼 수 있는 카드마다 내 예측이 맞을 확률·기대 점수. 이미 깔린 💯·지난 겨루기에 나온 카드는 뺌. */
const PW_DECK=[...[0,1,2].flatMap(c=>[...Array(10).keys()].map(k=>({c,v:k+1}))),{c:-1,v:100},{c:-1,v:100},{c:-1,v:0},{c:-1,v:0}];
function pwLegal(h,T){ if(!T.length) return h.map((_,k)=>k); const lc=T[0].card.c; const fol=h.map((c,k)=>({c,k})).filter(x=>x.c.c===lc&&lc>=0).map(x=>x.k); if(!fol.length) return h.map((_,k)=>k); return [...fol,...h.map((c,k)=>({c,k})).filter(x=>x.c.c<0).map(x=>x.k)]; }
function pwWin(oc,t){ const hund=t.filter(x=>x.card.v===100); if(hund.length) return hund[hund.length-1].by; const nz=t.filter(x=>x.card.v!==0); if(!nz.length) return t[0].by; const tr=nz.filter(x=>x.card.c===oc); if(tr.length) return tr.sort((a,b)=>b.card.v-a.card.v)[0].by; const lc=t[0].card.c; const fl=nz.filter(x=>x.card.c===lc); return (fl.length?fl:nz).sort((a,b)=>b.card.v-a.card.v)[0].by; }
function pwPol(oc,h,L,T,need,last){ const str=c=>c.v===100?1000:c.v===0?-1:c.c===oc?100+c.v:c.v, beats=k=>!T.length||pwWin(oc,T.concat({by:'_',card:h[k]}))==='_';
  const by=(A,f)=>A.slice().sort((a,b)=>f*(str(h[a])-str(h[b])))[0];
  if(need>0){ const W=L.filter(beats); if(!T.length) return by(L,-1); if(W.length) return last?by(W,1):by(W,-1); return by(L,1); }
  const Lo=L.filter(k=>!beats(k)); if(!T.length) return by(L,1); if(Lo.length) return by(Lo,-1); return by(L,1); }
function pwRun(oc,i,hands,preds,won,T0,ord0,tn,first){ let T=T0.slice(), ord=ord0.slice(), t=tn, W=Object.assign({},won), f=first;
  while(t<3){ while(T.length<ord.length){ const p=ord[T.length], h=hands[p], L=pwLegal(h,T); let k; if(p===i&&f!=null){ k=f; f=null; } else k=pwPol(oc,h,L,T,preds[p]-W[p],T.length===ord.length-1); if(k==null) k=L[0]; T.push({by:p,card:h[k]}); hands[p]=h.filter((_,j)=>j!==k); }
    const w=pwWin(oc,T); W[w]++; t++; const kk=ord.indexOf(w); ord=[...ord.slice(kk),...ord.slice(0,kk)]; T=[]; }
  return W; }
const pwSc=(won,pred)=>won===pred?10+won*10:-Math.abs(won-pred)*10;
function pwSample(m,i){ const seen=[...m.hand[i],m.open,...(m.played||[]),...m.trick.map(x=>x.card)], pool=PW_DECK.slice(); for(const c of seen){ const j=pool.findIndex(d=>d.c===c.c&&d.v===c.v); if(j>=0) pool.splice(j,1); }
  const P=U.shuffle(pool), H={}; for(const x of m.al) H[x]=x===i?m.hand[i].slice():P.splice(0,m.hand[x].length); return H; }
const pwEst=(oc,h)=>Math.min(3,h.filter(c=>c.v===100||(c.c===oc&&c.v>=7)).length);
function pwPlan(m,i,N){ N=N||150; const oc=m.open.c, ord=m.ph==='play'?m.order:m.order;
  if(m.ph==='pred'){ const out=[0,1,2,3].map(n=>({n,ev:0,hit:0})); for(let k=0;k<N;k++){ const H=pwSample(m,i); const pr={}; for(const x of m.al) pr[x]=m.pred[x]!=null?m.pred[x]:pwEst(oc,H[x]);
      for(const o of out){ const H2=Object.fromEntries(Object.entries(H).map(([a,b])=>[a,b.slice()])); pr[i]=o.n; const W=pwRun(oc,i,H2,pr,Object.fromEntries(m.al.map(x=>[x,0])),[],m.order,0,null); o.ev+=pwSc(W[i],o.n); if(W[i]===o.n) o.hit++; } }
    return out.map(o=>({n:o.n,ev:o.ev/N,hit:o.hit/N})); }
  const L=pwLegal(m.hand[i],m.trick), out=L.map(k=>({k,ev:0,hit:0}));
  for(let q=0;q<N;q++){ const H=pwSample(m,i); for(const o of out){ const H2=Object.fromEntries(Object.entries(H).map(([a,b])=>[a,b.slice()])); const W=pwRun(oc,i,H2,m.pred,m.won,m.trick,m.order,m.tn,o.k); o.ev+=pwSc(W[i],m.pred[i]); if(W[i]===m.pred[i]) o.hit++; } }
  return out.map(o=>({k:o.k,ev:o.ev/N,hit:o.hit/N})); }
const pwPick=(s,i,O,key)=>{ const S=O.slice().sort((a,b)=>b.ev-a.ev), lg=trait(s,i,'logic'); const near=S.filter(o=>S[0].ev-o.ev<=1.5*(1.2-lg)); return U.pick(near)[key]; };
NAT.predai={ maxH:12, title:'승부 예측', emoji:'🔮', tagline:'몇 번 이길지 먼저 말하고, 정확히 그만큼만 이겨라',
  rule:'5라운드. 카드 3장씩 + 오픈 카드 1장(그 색이 <b>으뜸</b>). 🔮 선부터 "몇 번 이길게요(0~3)" 공개 예측 → 3번 겨루기: 선이 아무 카드, 나머지는 <b>선의 색을 따라야</b> 해요(없으면 아무거나, 💯·0️⃣는 언제든). <b>💯 > 으뜸 색 최고 > 선의 색 최고</b>, 0️⃣은 항상 져요. 예측 적중 = 10 + 이긴 수×10, 빗나가면 차이×10 감점!',
  start(s,al){ const m={id:'predai',R:5,r:0,al:U.shuffle(al.slice()),tot:{},hist:[],lead:null,ready:{}}; m.al.forEach(x=>m.tot[x]=100); m.lead=m.al[0];
    sys(s,`🔮 제${s.ep}회 메인 매치 「승부 예측」 — 몇 번 이길지 먼저 말하고, 정확히 그만큼만 이기는 게임! 오픈 카드 색이 으뜸, 💯는 무적, 0️⃣은 꽝.`,'host'); this.deal(s,m); return m; },
  deal(s,m){ m.r++; const deck=U.shuffle([...[0,1,2].flatMap(c=>[...Array(10).keys()].map(k=>({c,v:k+1}))),{c:-1,v:100},{c:-1,v:100},{c:-1,v:0},{c:-1,v:0}]);
    m.hand={}; for(const x of m.al) m.hand[x]=deck.splice(0,3); m.open=deck.find(c=>c.c>=0); m.pred={}; m.won={}; m.al.forEach(x=>m.won[x]=0); m.trick=[]; m.tn=0; m.played=[]; m.ready={};
    const k=m.al.indexOf(m.lead); m.order=[...m.al.slice(k),...m.al.slice(0,k)]; m.ph='pred'; m.turn=m.order[0]; m.tdl=Date.now()+15000;
    sys(s,`🔮 ${m.r}/${m.R}라운드 — 오픈 카드 ${pwCard(m.open)} (으뜸: ${PW_C[m.open.c]}) · ${nm(m.turn)}부터 예측`,'host'); },
  delay(){ return 900; }, ready(){ return true; },
  legal(m,id){ const h=m.hand[id]; if(!m.trick.length) return h.map((_,k)=>k); const lc=m.trick[0].card.c; const fol=h.map((c,k)=>({c,k})).filter(x=>x.c.c===lc&&lc>=0).map(x=>x.k);
    if(!fol.length) return h.map((_,k)=>k); return [...fol,...h.map((c,k)=>({c,k})).filter(x=>x.c.c<0).map(x=>x.k)]; },
  winner(m){ const t=m.trick; const hund=t.filter(x=>x.card.v===100); if(hund.length) return hund[hund.length-1].by; const nz=t.filter(x=>x.card.v!==0);
    if(!nz.length) return t[0].by; const tr=nz.filter(x=>x.card.c===m.open.c); if(tr.length) return tr.sort((a,b)=>b.card.v-a.card.v)[0].by; const lc=t[0].card.c; const fl=nz.filter(x=>x.card.c===lc);
    return (fl.length?fl:nz).sort((a,b)=>b.card.v-a.card.v)[0].by; },
  tick(s){ const m=s.nm, now=Date.now(), H=humansAlive(s).filter(h=>m.al.includes(h));
    if(m.ph==='res'){ if(now>=m.until||(H.length&&H.every(h=>m.ready[h]))){ if(m.r>=m.R) return this.finish(s,m); this.deal(s,m); } return; }
    if(m.ph==='trickEnd'){ if(now>=m.until){ if(m.tn>=3) return this.score(s,m); m.trick=[]; const k=m.al.indexOf(m.lead2); m.order=[...m.al.slice(k),...m.al.slice(0,k)]; m.turn=m.order[0]; m.ph='play'; m.tdl=now+15000; } return; }
    const i=m.turn; if(isHum(i)){ s.typing=null; return; }
    if(m.ph==='pred'){ const key=`p${m.r}:${i}`; if(!m._pp||m._pp.key!==key) m._pp={key,O:pwPlan(m,i)}; const O=m._pp.O, rk=m.al.slice().sort((a,b)=>m.tot[b]-m.tot[a]);
      const r=need(s,`${s.ep}:pwp:${m.r}:${i}`,()=>ask(s,i,`승부 예측 ${m.r}/${m.R}라운드 — 네 카드 ${m.hand[i].map(pwCard).join(', ')}, 오픈 카드 ${pwCard(m.open)}(으뜸 ${PW_C[m.open.c]}). 앞사람 예측: ${m.order.filter(x=>m.pred[x]!=null).map(x=>`${nm(x)} ${m.pred[x]}`).join(', ')||'없음'}. 3번 겨루기 중 몇 번 이길지 공개 예측.
[처지] 합계 ${rk.indexOf(i)+1}/${rk.length}위 (${m.tot[i]}점, 1위와 ${m.tot[rk[0]]-m.tot[i]}점 차) · 남은 라운드 ${m.R-m.r}
[선택지 표 — 코드가 계산함: 남의 손패를 뽑고 모두가 자기 예측을 맞추려 한다고 보고 150번 굴려 봄]
${O.map(o=>`- ${o.n}승: 적중 확률 ${Math.round(o.hit*100)}% · 기대 ${o.ev>=0?'+':''}${o.ev.toFixed(1)}점`).join('\n')}
n은 0~3 중 하나. say에 한마디(심리전 가능).`,pwPredSch,'haiku'));
      if(r===undefined&&now<m.tdl){ s.typing=i; return; } s.typing=null; if(r) memo(s,i,r);
      let n=r&&r.n>=0&&r.n<=3?r.n|0:pwPick(s,i,O,'n'); this.doPred(s,m,i,n,r&&shortSay(r.say,60)); return; }
    if(m.ph==='play'){ const L=this.legal(m,i), key=`c${m.r}:${m.tn}:${m.trick.length}:${i}`; if(!m._pp||m._pp.key!==key) m._pp={key,O:pwPlan(m,i)}; const O=m._pp.O;
      const r=need(s,`${s.ep}:pwc:${m.r}:${m.tn}:${i}`,()=>ask(s,i,`승부 예측 ${m.r}라운드 ${m.tn+1}번째 겨루기 — 지금 깔린 카드: ${m.trick.map(x=>`${nm(x.by)} ${pwCard(x.card)}`).join(', ')||'없음(네가 선)'}. 으뜸 ${PW_C[m.open.c]}. 네 예측 ${m.pred[i]}승, 지금까지 ${m.won[i]}승 (남들 예측/이긴 수: ${m.al.filter(x=>x!==i).map(x=>`${nm(x)} ${m.pred[x]}/${m.won[x]}`).join(', ')}).
[선택지 표 — 코드가 계산함: 낼 수 있는 카드마다 남은 겨루기를 150번 굴려 본 네 예측 적중 확률·기대 점수]
${O.map(o=>`- ${o.k}번 ${pwCard(m.hand[i][o.k])}: 적중 ${Math.round(o.hit*100)}% · 기대 ${o.ev>=0?'+':''}${o.ev.toFixed(1)}점`).join('\n')}
card는 표의 번호 하나. say에 짧은 한마디.`,pwPlaySch(L),'haiku'));
      if(r===undefined&&now<m.tdl){ s.typing=i; return; } s.typing=null; if(r) memo(s,i,r);
      let k=r&&L.includes(r.card|0)?r.card|0:null; if(k==null) k=pwPick(s,i,O,'k');
      this.play(s,m,i,k,r&&shortSay(r.say,50)); } },
  doPred(s,m,i,n,say){ m.pred[i]=n; talk(s,i,(say?say+' ':'')+`(🔮 ${n}승 예측)`,null,'say'); const k=m.order.indexOf(i);
    if(k<m.order.length-1){ m.turn=m.order[k+1]; m.tdl=Date.now()+15000; return; } m.ph='play'; m.turn=m.order[0]; m.tdl=Date.now()+15000; sys(s,`🂠 겨루기 시작 — 예측: ${m.order.map(x=>`${nm(x)} ${m.pred[x]}승`).join(' · ')}`,'host'); },
  play(s,m,i,k,say){ const c=m.hand[i].splice(k,1)[0]; m.trick.push({by:i,card:c}); if(say) talk(s,i,say,null,'say');
    if(m.trick.length<m.al.length){ const q=m.order.indexOf(i); m.turn=m.order[q+1]; m.tdl=Date.now()+15000; return; }
    const w=this.winner(m); m.won[w]++; m.tn++; m.lead2=w; m.played=(m.played||[]).concat(m.trick.map(x=>x.card)); sys(s,`🂠 ${m.tn}번째 — ${m.trick.map(x=>`${nm(x.by)} ${pwCard(x.card)}`).join(' · ')} → ${nm(w)} 승 (${nm(w)} ${m.won[w]}/${m.pred[w]})`,'host');
    m.lastTrick=m.trick.slice(); m.ph='trickEnd'; m.until=Date.now()+2500; m.turn=null; },
  score(s,m){ const g={}; for(const x of m.al){ const d=Math.abs(m.won[x]-m.pred[x]); g[x]=d===0?10+m.won[x]*10:-d*10; m.tot[x]+=g[x]; }
    m.hist.push({r:m.r,pred:Object.assign({},m.pred),won:Object.assign({},m.won),g}); m.lead=m.lead2; m.ph='res'; m.until=Date.now()+(m.al.some(isHum)?20000:6000); m.ready={};
    sys(s,`📢 ${m.r}라운드 — `+m.al.map(x=>`${nm(x)} 예측 ${m.pred[x]}·실제 ${m.won[x]} ${g[x]>0?'✨+':''}${g[x]}`).join(' · '),'host');
    const a=Math.random()<.4&&U.pick(m.al.filter(x=>!isHum(x))); if(a) s.aq.push({k:'say',i:a,model:'haiku',task:'승부 예측 라운드 결과가 나왔다(위 게임 상황 참고). 테이블에서 한마디 — 적중 기쁨·빗나간 아쉬움·남 견제. 짧게.',fb:['딱 맞췄다!ㅎㅎ','아 하나 더 이겨 버렸어요ㅠㅠ','다음엔 진짜 맞춘다!']}); },
  finish(s,m){ const ids=m.al.slice().sort((a,b)=>m.tot[b]-m.tot[a]||Math.random()-.5); sys(s,'🔮 최종 — '+ids.map((x,k)=>`${k+1}위 ${nm(x)} ${m.tot[x]}점`).join(' · '),'host'); s.nm=null; announceMain(s,'predai',ids,null,m.tot); },
  apply(s,me,a){ const m=s.nm; if(!m.al.includes(me)) return '이번 게임 참가자가 아니에요';
    if(a.k==='pred'){ if(m.ph!=='pred'||m.turn!==me) return '내 차례가 아니에요'; const n=a.n|0; if(!(n>=0&&n<=3)) return '0~3'; this.doPred(s,m,me,n,''); return null; }
    if(a.k==='play'){ if(m.ph!=='play'||m.turn!==me) return '내 차례가 아니에요'; const k=a.i|0; if(!this.legal(m,me).includes(k)) return '선의 색을 따라야 해요'; this.play(s,m,me,k,''); return null; }
    if(a.k==='ready'){ if(m.ph!=='res') return '지금은 아니에요'; m.ready[me]=1; return null; }
    return '알 수 없는 동작'; },
  mask(v,me){ const m=v.nm; if(!m) return; delete m._pp; m.hand={[me]:m.hand[me]||[]}; },
  view(s,i){ const m=s.nm, L=['[지금 게임: 🔮 승부 예측] 5라운드. 카드 3장씩 + 오픈 카드(그 색이 으뜸). 선부터 몇 번 이길지(0~3) 공개 예측 → 3번 겨루기(선의 색을 따라야 함, 없으면 아무거나, 💯·0은 언제든). 💯(여럿이면 나중 것) > 으뜸 색 최고 > 선의 색 최고, 0은 항상 짐. 적중 = 10+이긴 수×10, 빗나가면 차이×10 감점.'];
    L.push(`[지금] ${m.r}/${m.R}라운드 · 오픈 ${pwCard(m.open)}(으뜸 ${PW_C[m.open.c]}) · 네 카드 ${(m.hand[i]||[]).map(pwCard).join(', ')}`);
    L.push('[예측/이긴 수] '+m.al.map(x=>`${nm(x)} ${m.pred[x]??'?'}/${m.won[x]}`).join(', ')+' · [합계] '+m.al.map(x=>`${nm(x)} ${m.tot[x]}`).join(', '));
    return L.join('\n'); },
  card(v,me,out){ const m=v.nm, mine=m.al.includes(me)&&!out;
    let h=`<div class="vr-card ga pwai">`+gaTop(`🔮 승부 예측 · ${m.r}/${m.R}라운드${m.ph==='play'||m.ph==='trickEnd'?` · ${Math.min(3,m.tn+(m.ph==='play'?1:0))}/3번째 겨루기`:''}`,this.rule);
    h+='<div class="ga-seats">'+m.order.map(x=>`<span class="${m.turn===x?'turn':''} ${x===me?'me':''}">${gaSay(v,x,x===me?'me':'')}${emo(x)}<i>${U.esc(nm(x))}</i><small>예측 ${m.pred[x]??'?'} · 🏆${m.won[x]}</small><small>${m.tot[x]}점</small></span>`).join('')+'</div>';
    const T=m.ph==='trickEnd'?m.lastTrick:m.trick, wn=m.ph==='trickEnd'?m.lead2:null;
    h+='<div class="ga-trick">'+(m.ph==='pred'?'<small>예측이 끝나면 여기에 낸 카드가 놓여요</small>':m.order.map(x=>{ const t=(T||[]).find(y=>y.by===x); return `<div class="pc ${wn===x?'win':''}">${t?gaPw(t.card,'big'):'<span class="ga-cd empty big"></span>'}<span>${emo(x)}${wn===x?' 🏆':''}</span></div>`; }).join(''))+'</div>';
    h+=`<div class="ga-hint">오픈 ${gaPw(m.open,'mini')} <b>${['빨강','파랑','노랑'][m.open.c]}</b>이 으뜸 · 💯 무적 · 0 꽝 · 선의 색을 따라야 해요</div>`;
    if(mine){ const L=m.ph==='play'&&m.turn===me?this.legal(m,me):null, H=m.hand[me]||[];
      let b='<div class="ga-hand">'+H.map((c,k)=>L?`<button class="ga-cbtn" ${L.includes(k)?'':'disabled'} data-nm='${JSON.stringify({k:'play',i:k})}'>${gaPw(c,'big')}</button>`:gaPw(c,'big')).join('')+'</div>';
      if(m.ph==='pred'&&m.turn===me) b+=`<div class="ga-btns">${[0,1,2,3].map(n=>gaB({k:'pred',n},`${n}승`)).join('')}</div><div class="ga-sub">3번 겨루기 중 정확히 몇 번 이길지 말하세요</div>`;
      else if(L) b+='<div class="ga-sub">낼 카드를 누르세요'+(L.length<H.length?' (흐린 카드는 선의 색 때문에 못 내요)':'')+'</div>';
      else if(m.ph==='res') b+=m.ready[me]?gaWait('기다리는 중…'):`<div class="ga-btns">${gaB({k:'ready'},m.r>=m.R?'최종 결과 ▶':'다음 라운드 ▶')}</div>`;
      else if(m.turn&&m.turn!==me) b+=gaWait(`${emo(m.turn)} ${U.esc(nm(m.turn))} 차례…`);
      const lft=m.pred[me]!=null?m.pred[me]-m.won[me]:null;
      h+=gaDock(`내 손 — 예측 ${m.pred[me]??'?'}승 · 지금 ${m.won[me]}승${lft!=null&&m.ph!=='res'?lft>0?` · <b>${lft}번 더!</b>`:lft===0?' · <b>이제 지기만 하면 돼요</b>':' · 이미 넘쳤어요ㅠ':''}`,b); }
    else h+=gaDock('',gaWait('👀 구경 중이에요'));
    if(m.hist.length) h+='<details class="ga-more"><summary>📊 라운드별 점수</summary><table class="fs-tab"><tr><th></th>'+m.hist.map(x=>`<th>${x.r}R</th>`).join('')+'<th>합계</th></tr>'+m.al.slice().sort((a,b)=>m.tot[b]-m.tot[a]).map(x=>`<tr class="${x===me?'me':''}"><td>${emo(x)} ${U.esc(nm(x))}</td>`+m.hist.map(hh=>`<td>${hh.pred[x]}/${hh.won[x]}<small> ${hh.g[x]>0?'+':''}${hh.g[x]}</small></td>`).join('')+`<td><b>${m.tot[x]}</b></td></tr>`).join('')+'</table></details>';
    return h+'</div>'; },
};

/* ───────── 🃏 인디언 포커 · AI판 (데스매치·결승) ─────────
   1~10 카드 두 벌. 판마다 한 장씩 이마에 — 상대 카드만 보이고 내 카드는 몰라요. 각자 칩 15개, 판마다 1칩 걸고 시작.
   선(번갈아)이 체크 또는 1~3칩 베팅 → 상대는 콜·포기, 또는 한 번 더 올리기(1~3) → 선은 콜·포기. 공개해서 큰 숫자가 판돈을 다 가짐(같으면 다음 판으로 이월).
   10을 들고 포기하면 벌칙 5칩. 칩이 바닥나거나 10판 뒤 칩이 많은 쪽이 승리. 동물은 상대 카드·지난 베팅 버릇을 보고 AI로 베팅하고 표정 연기·허세 말을 함. */
const ipSch=keys=>({type:'object',properties:{pick:{type:'string',enum:keys},say:{type:'string'},memo:{type:'string'}},required:['pick','say','memo'],additionalProperties:false});
/* 🧠 인디언 포커 선택지 표 (NPC 룰 1·2·3·10·17, 2026-11-12) — 코드가 "내 카드가 상대보다 클 확률"과 행동별 기대 칩을 계산, AI는 그중에서 고름.
   ① 남은 카드 세기: 1~10 두 벌에서 이번 판까지 내가 본 카드(상대 카드·공개된 카드)를 빼고 남은 것 중 하나가 내 카드.
   ② 상대 행동으로 내 카드 읽기: 상대는 내 카드를 보고 있으니, 상대가 베팅·올리기면 내 카드가 낮을 가능성↑, 체크면 높을 가능성↑ (상대 버릇 반영).
   ③ 행동별 기대 칩: 포기(+10이면 벌칙) · 콜/체크(공개) · 베팅/올리기(상대가 내 카드를 보고 접을 확률 → 상대 버릇으로 보정). */
function ipPool(m,x){ const P={}; for(let c=1;c<=10;c++) P[c]=2; const o=m.al.find(y=>y!==x); const dec=c=>{ if(P[c]>0) P[c]--; };
  for(const h of m.hist){ dec(h.card[o]); if(!(h.fold===o&&h.w===x)) dec(h.card[x]); }   /* 상대가 접어서 이긴 판의 내 카드는 끝내 모름 */
  dec(m.card[o]); return P; }
function ipRead(m,x){ const o=m.al.find(y=>y!==x), bets=m.hist.filter(h=>h.bets[o]>1), hiB=bets.filter(h=>h.card[x]>=6).length;
  /* 상대 버릇: 내 카드가 높을 때도 베팅하던 상대면(허세) 베팅이 덜 믿을 만함 */ const bluffy=(hiB+1)/(bets.length+2);
  const oBet=m.bets[o]>m.bets[x]||(m.raised&&m.bets[o]>=m.bets[x]&&m.bets[o]>1), oCheck=m.step>=1&&m.bets[o]===m.bets[x]&&m.turn===x;
  return c=>oBet?(1-bluffy)*(.15+.85*(10-c)/9)+bluffy*.5:oCheck?.4+.6*(c-1)/9:1; }
function ipFoldT(m,x){ const o=m.al.find(y=>y!==x), faced=m.hist.filter(h=>h.bets[x]>h.bets[o]||h.fold===o), f=faced.filter(h=>h.fold===o).length; return (f+1)/(faced.length+2)*2; }   /* 상대가 내 베팅에 접던 비율(기본 1) */
function ipPlan(s,m,x){ const o=m.al.find(y=>y!==x), oc=m.card[o], pool=ipPool(m,x), like=ipRead(m,x); let W=0; const w={}; for(let c=1;c<=10;c++){ w[c]=pool[c]*like(c); W+=w[c]; } if(W<=0){ for(let c=1;c<=10;c++){ w[c]=1; } W=10; }
  const pc=c=>w[c]/W, pWin=[...Array(10).keys()].map(k=>k+1).filter(c=>c>oc).reduce((t,c)=>t+pc(c),0), pTie=pc(oc), p10=pc(10);
  const b=m.bets[x], ob=m.bets[o], P=m.pot, d=Math.max(0,ob-b), ft=ipFoldT(m,x);
  const sd=(B,P2)=>pWin*(P2-B)+pTie*(P2*.5-B)+(1-pWin-pTie)*(-B);
  const fold=c=>Math.max(0,Math.min(.95,ft*.5*(c-3)/7));   /* 상대가 내 카드 c를 보고 접을 확률 */
  const bet=(put,oppAdd)=>{ let ev=0; for(let c=1;c<=10;c++){ const f=fold(c), win=c>oc, tie=c===oc; const B=b+put, P2=P+put+oppAdd; ev+=pc(c)*(f*(P-b)+(1-f)*(win?P2-B:tie?P2*.5-B:-B)); } return ev; };
  const opts=[];
  if(d>0){ opts.push({act:'fold',n:0,ev:-b-p10*5,why:p10>.05?`포기 — 낸 칩 잃음, 내가 10이면 벌칙 5`:'포기 — 낸 칩만 잃음'}); opts.push({act:'call',n:0,ev:sd(ob,P+d),why:'콜 — 공개해서 승부'});
    if(!m.raised) for(const n of [1,2,3]) if(m.chips[x]>=d+n) opts.push({act:'raise',n,ev:bet(d+n,n),why:`올리기 +${n} — 상대가 내 카드를 보고 접을 수도`}); }
  else { opts.push({act:'check',n:0,ev:sd(b,P),why:m.step===0?'체크 — 상대에게 넘김':'체크 — 바로 공개'}); for(const n of [1,2,3]) if(m.chips[x]>=n) opts.push({act:'bet',n,ev:bet(n,n),why:`베팅 +${n} — 상대가 접거나 콜`}); }
  const lead=m.chips[x]+b-m.chips[o]-ob, left=m.R-m.r;
  return {opts,pWin,pTie,p10,lead,left,oc}; }
const ipKey=o=>o.act+(o.n?o.n:'');
function ipAuto(s,m,x,pl){ const ag=trait(s,x,'aggr'), bl=trait(s,x,'bluff'); const sc=o=>o.ev+((o.act==='bet'||o.act==='raise')?(ag+bl-1)*.25:0)+(o.act==='fold'&&pl.lead<-3&&pl.left<=2?-.6:0);   /* 대담·허세면 베팅 쪽, 막판에 크게 지고 있으면 접기 싫어함 */
  const S=pl.opts.slice().sort((a,b)=>sc(b)-sc(a)); return S[0]; }
NAT.indianai={ ai:true, maxH:2, title:'인디언 포커', emoji:'🃏', tagline:'내 카드만 안 보인다 — 상대 표정과 베팅으로 읽어라',
  rule:'1~10 카드 두 벌. 판마다 한 장을 이마에 — <b>상대 카드만 보이고 내 카드는 몰라요</b>. 칩 15개, 판마다 1칩 걸고 시작. 선이 체크 또는 1~3칩 베팅 → 상대는 콜·포기·올리기(한 번) → 선은 콜·포기. 큰 숫자가 판돈을 가져가요(같으면 이월). <b>10을 들고 포기하면 벌칙 5칩</b>. 칩이 바닥나거나 10판 뒤 칩 많은 쪽 승!',
  start(s,pair,kind,o){ const fast=!!(o&&o.fast); const m={id:'indianai',kind,fast,R:fast?5:10,r:0,al:pair.slice(),chips:{},deck:[],pot:0,carry:0,ph:'bet',hist:[],ready:{},first:pair[Math.random()*2|0]}; pair.forEach(x=>m.chips[x]=fast?10:15);
    sys(s,`🃏 ${kind==='final'?'결승':'데스매치'} 「인디언 포커」 — ${nm(pair[0])} vs ${nm(pair[1])}. 상대 카드만 보여요! ${fast?'칩 10개 · 5판 빠른 승부 (구경하는 사람은 두 카드 다 보여요)':'칩 15개'}, 10을 들고 포기하면 벌칙 5칩.`,'host'); this.deal(s,m); return m; },
  other(m,x){ return m.al.find(y=>y!==x); },
  deal(s,m){ m.r++; if(m.deck.length<2) m.deck=U.shuffle([...Array(20).keys()].map(k=>k%10+1)); m.card={}; for(const x of m.al) m.card[x]=m.deck.pop();
    m.bets={}; for(const x of m.al){ const a=Math.min(1,m.chips[x]); m.chips[x]-=a; m.bets[x]=a; } m.pot=m.carry+m.al.reduce((t,x)=>t+m.bets[x],0); m.carry=0;
    m.first=m.r===1?m.first:this.other(m,m.first); m.turn=m.first; m.ph='bet'; m.step=0; m.raised=false; m.tdl=Date.now()+15000; m.ready={};
    sys(s,`🃏 ${m.r}/${m.R}판 — 칩 ${m.al.map(x=>`${nm(x)} ${m.chips[x]}`).join(' · ')} · 판돈 ${m.pot} · 선 ${nm(m.first)}`,'host'); },
  delay(){ return 900; }, ready(){ return true; },
  need_(m,x){ const o=this.other(m,x); return Math.max(0,m.bets[o]-m.bets[x]); },
  act(s,m,x,a,n,say){ const o=this.other(m,x), d=this.need_(m,x);
    if(say){ m.lastSay={by:x,t:say,r:m.r}; talk(s,x,say,o,'say'); }
    if(a==='fold'){ return this.end(s,m,o,x,'fold'); }
    if(a==='check'&&d===0&&m.step===0){ m.step=1; m.turn=o; m.tdl=Date.now()+15000; sys(s,`${nm(x)} 체크`,''); return; }
    if(a==='check'&&d===0&&m.step>=1) return this.show(s,m);
    if(a==='call'||((a==='check')&&d>0)){ const c=Math.min(d,m.chips[x]); m.chips[x]-=c; m.bets[x]+=c; m.pot+=c; sys(s,`${nm(x)} 콜`,''); return this.show(s,m); }
    if(a==='bet'||a==='raise'){ if(m.raised&&d>0){ return this.act(s,m,x,'call',0,''); } n=Math.max(1,Math.min(3,n|0||1)); const put=Math.min(m.chips[x],d+n); m.chips[x]-=put; m.bets[x]+=put; m.pot+=put; if(d>0) m.raised=true; m.step++;
      sys(s,`💰 ${nm(x)} ${d>0?'올리기':'베팅'} +${put-d}칩 (판돈 ${m.pot})`,''); m.turn=o; m.tdl=Date.now()+15000; if(m.chips[o]<=0&&this.need_(m,o)>0) return this.show(s,m); return; }
    return this.act(s,m,x,d>0?'call':'check',0,''); },
  show(s,m){ const [a,b]=m.al; const ca=m.card[a], cb=m.card[b];
    if(ca===cb){ m.carry=m.pot; sys(s,`🂠 공개 — ${nm(a)} ${ca} · ${nm(b)} ${cb} → 같아서 판돈 ${m.pot} 이월!`,'host'); m.hist.push({r:m.r,card:Object.assign({},m.card),bets:Object.assign({},m.bets),w:null}); return this.after(s,m,null); }
    const w=ca>cb?a:b, l=w===a?b:a; m.chips[w]+=m.pot; sys(s,`🂠 공개 — ${nm(a)} ${ca} · ${nm(b)} ${cb} → ${nm(w)}가 판돈 ${m.pot}칩!`,'host');
    m.hist.push({r:m.r,card:Object.assign({},m.card),bets:Object.assign({},m.bets),w}); this.after(s,m,w,l); },
  end(s,m,w,l,why){ m.chips[w]+=m.pot; let pen=''; if(m.card[l]===10){ const p=Math.min(5,m.chips[l]); m.chips[l]-=p; m.chips[w]+=p; pen=` · 10을 들고 포기해서 벌칙 ${p}칩!`; }
    sys(s,`🏳️ ${nm(l)} 포기 — ${nm(w)}가 판돈 ${m.pot}칩 (${nm(l)}의 카드는 ${m.card[l]})${pen}`,'host'); m.hist.push({r:m.r,card:Object.assign({},m.card),bets:Object.assign({},m.bets),w,fold:l}); this.after(s,m,w,l); },
  after(s,m,w,l){ m.ph='show'; m.until=Date.now()+(m.al.some(isHum)?9000:3500); m.ready={};
    const an=m.al.filter(x=>!isHum(x)); if(an.length&&Math.random()<.4) s.aq.push({k:'say',i:U.pick(an),model:'haiku',task:'인디언 포커 한 판이 끝났다(위 게임 상황 참고). 상대에게 한마디 — 이겼으면 여유·장난, 졌으면 억울함, 상대 허세를 짚기. 짧게.',fb:['ㅋㅋ 표정 다 보였어요~','헐 그걸 들고 버텼어요?','다음 판은 안 속아요!']}); },
  tick(s){ const m=s.nm, now=Date.now();
    if(m.ph==='show'){ if(now>=m.until||m.al.filter(isHum).every(h=>m.ready[h])){ const lo=m.al.find(x=>m.chips[x]<=0); if(lo||m.r>=m.R){ const [a,b]=m.al; const w=lo?this.other(m,lo):(m.chips[a]>m.chips[b]?a:m.chips[b]>m.chips[a]?b:U.pick(m.al)); const l=this.other(m,w);
          sys(s,`🃏 인디언 포커 끝 — ${nm(w)} 승리! (칩 ${m.chips[w]} : ${m.chips[l]})`,'win'); return natDuelEnd(s,w,l); } this.deal(s,m); } return; }
    const x=m.turn; if(isHum(x)){ s.typing=null; return; } const o=this.other(m,x), d=this.need_(m,x);
    const PL=ipPlan(s,m,x), keys=PL.opts.map(ipKey);
    const r=need(s,`${s.ep}:ip:${m.kind}:${m.r}:${m.step}:${x}`,()=>ask(s,x,`인디언 포커 ${m.r}/${m.R}판 — 상대 ${nm(o)}의 카드는 ${m.card[o]}(네 카드는 모른다, 1~10). 판돈 ${m.pot}, 네 칩 ${m.chips[x]}, 상대 칩 ${m.chips[o]}, 지금 네가 더 내야 할 칩 ${d}.
[처지] 칩 ${PL.lead>0?`${PL.lead}개 앞섬`:PL.lead<0?`${-PL.lead}개 뒤짐`:'동점'} · 남은 판 ${PL.left}${PL.lead<0&&PL.left<=2?' — 막판이라 뒤지면 승부를 걸어야 한다':''}${PL.lead>4&&PL.left<=2?' — 앞서 있으니 무리할 필요 없다':''}
[네 카드 짐작 — 코드가 계산함: 남은 카드를 세고, 상대(네 카드를 보는 사람)의 베팅·체크 버릇으로 보정] 네가 이길 확률 ${Math.round(PL.pWin*100)}% · 비길 확률 ${Math.round(PL.pTie*100)}% · 네가 10일 확률 ${Math.round(PL.p10*100)}%
[선택지 표 — 기대 칩(이번 판 끝났을 때 칩 변화 짐작). 높을수록 좋은 수. 성격·심리전으로 다른 걸 골라도 되지만 표에 근거가 있어야 한다]
${PL.opts.map(o=>`- ${ipKey(o)}: 기대 ${o.ev>=0?'+':''}${o.ev.toFixed(1)}칩 — ${o.why}`).join('\n')}
pick은 표의 이름 중 하나(check·bet1~3·call·raise1~3·fold). say에 상대에게 할 짧은 한마디(표정 연기·허세 — 상대 카드를 말해 주지는 마라).`,ipSch(keys),m.fast?'haiku':undefined));   /* 탈락이 걸린 판은 기본 모델, 동물끼리 구경 판(fast)은 haiku */
    if(r===undefined&&now<m.tdl){ s.typing=x; return; } s.typing=null; if(r) memo(s,x,r);
    let ch=r&&PL.opts.find(o=>ipKey(o)===r.pick); if(!ch) ch=ipAuto(s,m,x,PL); const a=ch.act, n=ch.n||1;
    this.act(s,m,x,a,n,r&&shortSay(r.say,60)); },
  apply(s,me,a){ const m=s.nm; if(!m.al.includes(me)) return '이번 판 참가자가 아니에요';
    if(a.k==='ready'){ if(m.ph!=='show') return '지금은 아니에요'; m.ready[me]=1; return null; }
    if(m.ph!=='bet'||m.turn!==me) return '내 차례가 아니에요'; const d=this.need_(m,me);
    if(a.k==='fold'){ this.act(s,m,me,'fold',0,''); return null; }
    if(a.k==='check'){ if(d>0) return '콜 또는 포기'; this.act(s,m,me,'check',0,''); return null; }
    if(a.k==='call'){ if(d<=0) return '체크하세요'; this.act(s,m,me,'call',0,''); return null; }
    if(a.k==='bet'){ if(d>0&&m.raised) return '더는 못 올려요'; this.act(s,m,me,d>0?'raise':'bet',a.n|0,''); return null; }
    return '알 수 없는 동작'; },
  mask(v,me){ const m=v.nm; if(!m) return; if(m.ph!=='show'&&m.card&&m.card[me]!=null) m.card=Object.assign({},m.card,{[me]:0}); },
  view(s,i){ const m=s.nm, o=this.other(m,i); if(!o) return ''; return `[지금 게임: 🃏 인디언 포커 (${m.kind==='final'?'결승':'데스매치'}, 지면 ${m.kind==='final'?'준우승':'탈락'})] 상대 카드만 보이고 내 카드는 모름. 큰 숫자가 판돈. 10 들고 포기하면 벌칙 5칩.
[지금] ${m.r}/${m.R}판 · 칩 ${nm(i)} ${m.chips[i]} : ${m.chips[o]} ${nm(o)} · 판돈 ${m.pot} · 상대 카드 ${m.card[o]}
[지난 판] ${m.hist.slice(-5).map(h=>`${h.r}판: 너 ${h.card[i]}·상대 ${h.card[o]} (상대 베팅 ${h.bets[o]}, ${h.fold?nm(h.fold)+' 포기':h.w?nm(h.w)+' 승':'무승부'})`).join(' / ')||'없음'}`; },
  card(v,me,out){ const m=v.nm, mine=m.al.includes(me)&&!out, o=mine?this.other(m,me):null;
    let h=`<div class="vr-card ga ipai">`+gaTop(`🃏 인디언 포커 · ${m.kind==='final'?'🏆 결승':'⚔️ 데스매치'}`,this.rule);
    const L=mine?me:m.al[0], R=this.other(m,L);
    const who=x=>{ const c=m.card[x], hid=x===me&&m.ph!=='show', st=Math.min(12,m.chips[x]); return `<div class="ga-who ${m.turn===x&&m.ph==='bet'?'turn':''} ${x===me?'me':''}"><div class="ga-fh ${hid?'q':''} ${m.ph==='show'&&m.hist.length&&m.hist[m.hist.length-1].w===x?'win':''}">${hid?'?':c}</div>${gaSay(v,x,x===me?'me':'')}<span class="av">${emo(x)}</span><b>${U.esc(nm(x))}${x===me?' (나)':''}</b><div class="ga-stack">${'<i></i>'.repeat(st)} ${m.chips[x]}</div><small>건 칩 ${(m.bets||{})[x]||0}</small></div>`; };
    h+=`<div class="ga-face">${who(L)}<div class="ga-mid"><span class="ga-pot">판돈 ${m.pot}</span><small>${m.r}/${m.R}판</small></div>${who(R)}</div>`;
    if(mine&&m.ph==='bet'&&m.turn===me){ const d=Math.max(0,m.bets[o]-m.bets[me]);
      h+=gaDock(`상대 카드 <b>${m.card[o]}</b> — 내 카드는 몰라요 · ${d>0?`<b>${d}칩</b> 더 내야 콜`:'체크하거나 베팅'}`,'<div class="ga-btns">'
        +(d>0?gaB({k:'call'},`콜 (${d})`):gaB({k:'check'},'체크'))
        +(!(d>0&&m.raised)?[1,2,3].map(n=>gaB({k:'bet',n},`${d>0?'올리기':'베팅'} +${n}`,'ghost')).join(''):'')
        +gaB({k:'fold'},'🏳️ 포기','red')+'</div>'+(m.card[o]===10?'':'<div class="ga-sub">10을 들고 포기하면 벌칙 5칩 — 내 카드가 10일 수도 있어요</div>')); }
    else if(m.ph==='bet') h+=mine?gaDock(`상대 카드 <b>${m.card[o]}</b> — 내 카드는 몰라요`,gaWait(`${emo(m.turn)} ${U.esc(nm(m.turn))} 고민 중…`)):gaWait(`💭 ${emo(m.turn)} ${U.esc(nm(m.turn))} 고민 중…`);
    else if(m.ph==='show'&&mine) h+=gaDock(`내 카드는 <b>${m.card[me]}</b>였어요`,m.ready[me]?gaWait('기다리는 중…'):`<div class="ga-btns">${gaB({k:'ready'},'다음 판 ▶')}</div>`);
    return h+'</div>'; },
};

/* ───────── ⚫⚪ 흑과 백 · AI판 (데스매치·결승) ─────────
   각자 99포인트. 9라운드: 선이 몰래 포인트를 내면, 후는 그 색만 보고(한 자리 0~9 = ⚫, 10 이상 = ⚪) 몰래 냄. 쓴 포인트는 사라짐.
   더 많이 낸 쪽 +1점·다음 라운드 선, 같으면 점수 없음. 남은 포인트는 표시등 5칸(20씩)으로만 보임. 5점 먼저 또는 9라운드 뒤 점수 높은 쪽 승(같으면 남은 포인트 많은 쪽).
   동물은 AI로 낼 포인트를 정하고 허세 말을 함(상대 색·표시등·지난 라운드 결과를 보고). */
const BW_BID={type:'object',properties:{n:{type:'integer'},say:{type:'string'},memo:{type:'string'}},required:['n','say','memo'],additionalProperties:false};
const bwLamp=p=>p<=0?0:Math.min(5,Math.floor((p-1)/20)+1), bwCol=n=>n<10?'⚫':'⚪';
/* 🧠 흑과 백 선택지 표 (NPC 룰 1·2·3·6·10·11, 2026-11-12) — 코드가 낼 포인트마다 "남은 판을 끝까지 굴려 본(롤아웃) 경기 승률"을 계산, AI는 그중에서 고름.
   굴려 볼 때 양쪽은 '보통 사람' 정책(bwPol: 1승당 몫 근처로 내고, ⚫엔 10으로 이기거나 버림, ⚪엔 대개 버림)으로 둠. 모르는 것(상대 남은 포인트·상대가 낸 정확한 수)은 표시등·색으로 범위를 잡아 뽑음.
   처음엔 공식(승수 차 + 1승당 포인트)으로 짐작했다가 예전 무작위 auto에게도 30% 밖에 못 이겨서(초반에 30~46 몰아 쓰기) 롤아웃으로 바꿈. */
function bwPol(P,need,left,ob){ if(ob!=null){ if(ob<10) return P>=10&&(P/need>=8||left<=need)?10:0; if(left<=need) return Math.min(P,Math.round(P/need*1.3)); return Math.random()<.3?Math.min(P,Math.round(P/need*(0.9+Math.random()*.6))):0; }
  return Math.min(P,Math.max(0,Math.round(P/need*(0.6+Math.random()*.8)))); }
function bwRoll(me,op,ms,os,r,R,meFirst,v,obKnown,obDist){   /* 한 번 끝까지: 내 이번 수 v, 이기면 1 / 지면 0 / 비기면 .5. 상대가 이미 낸 판이면(obKnown) 그 포인트는 이미 빠진 뒤의 잔량이 op */
  let P=me,Q=op,a=ms,b=os,first=meFirst;
  for(let k=r;k<=R;k++){ let x,y;
    if(k===r){ x=v; y=obKnown?obDist():bwPol(Q,5-b,R-k+1,x); } else if(first){ x=bwPol(P,5-a,R-k+1,null); y=bwPol(Q,5-b,R-k+1,x); } else { y=bwPol(Q,5-b,R-k+1,null); x=bwPol(P,5-a,R-k+1,y); }
    x=Math.min(P,x); if(!(k===r&&obKnown)){ y=Math.min(Q,y); Q-=y; } P-=x; if(x>y){ a++; first=true; } else if(y>x){ b++; first=false; }
    if(a>=5||b>=5) break; if(P<=0&&Q<=0) break; }
  return a>b?1:a<b?0:P>Q?1:P<Q?0:.5; }
function bwPlan(s,m,x){ const o=m.al.find(y=>y!==x), P=m.pts[x], ob=m.bid[o], need=5-m.sc[x], oNeed=5-m.sc[o], left=m.R-m.r+1;
  const L=bwLamp(m.pts[o]), spentW=m.hist.reduce((t,h)=>t+(h.bid[o]>=10?10:0),0), oHi=Math.max(0,Math.min(L*20,99-spentW)), oLo=Math.min(oHi,L?20*(L-1)+1:0);
  const must=left<=need, wB=k=>k<=1?4:1;
  const obDist=ob==null?null:ob<10?()=>{ let t=Math.random()*16; for(let k=0;k<=9;k++){ t-=wB(k); if(t<=0) return k; } return 9; }:()=>{ const hi=Math.max(10,Math.min(oHi,45)); const W=[]; let T=0; for(let k=10;k<=hi;k++){ T+=1/(k-8); W.push([k,T]); } const t=Math.random()*T; return (W.find(w=>w[1]>=t)||W[W.length-1])[0]; };
  let cand; if(ob!=null&&ob<10) cand=[0,2,5,9,10]; else if(ob!=null) cand=[0,11,12,13,15,18,21,26,Math.min(oHi,45)+1]; else cand=[0,1,5,9,10,11,13,15,18,21,25,30];
  cand=[...new Set(cand.filter(v=>v<=P))]; const N=90, meFirst=ob==null;
  const opts=cand.map(v=>{ let ev=0,win=0; for(let k=0;k<N;k++){ const q=oLo+Math.floor(Math.random()*(oHi-oLo+1)); const qq=ob!=null?q:q; ev+=bwRoll(P-0,qq,m.sc[x],m.sc[o],m.r,m.R,meFirst,v,ob!=null,obDist); }
    /* 이번 판 이길 확률(따로 굴림) */ for(let k=0;k<N;k++){ const y=ob!=null?obDist():bwPol(oLo+Math.floor(Math.random()*(oHi-oLo+1)),oNeed,left,v); if(v>y) win++; }
    const why=ob!=null?(ob<10?(v>=10?'⚫은 9 이하라 무조건 이김':v===0?'버리기 — 포인트 아낌, 이번 판은 내줌':`상대가 ${v} 미만이면 이김`):(v===0?'버리기 — 상대는 10 이상을 이미 씀':`상대가 ${v} 미만이면 이김`)):(v===0?'버리기 — 상대는 10을 써야 이김':v<10?'⚫ — 상대가 10 쓰면 짐':`⚪ — 상대가 ${v+1} 이상 내야 이김`);
    return {n:v,p:win/N,t:0,ev:ev/N,why}; });
  return {opts,need,oNeed,left,must,P,oLo,oHi}; }
function bwAuto(s,m,x,pl){ const ag=trait(s,x,'aggr'), lg=trait(s,x,'logic'); const sc=o=>o.ev+o.p*(ag-.5)*.04; const S=pl.opts.slice().sort((a,b)=>sc(b)-sc(a));
  const near=S.filter(o=>sc(S[0])-sc(o)<=.03*(1.2-lg)); return U.pick(near).n; }   /* 대담할수록 이길 쪽, 논리 낮으면 비슷한 후보 사이에서 흔들림(엉뚱한 수는 아님) */
const bwTable=pl=>pl.opts.map(o=>`- ${o.n}: 이길 확률 ${Math.round(o.p*100)}%${o.t>=.05?` (비김 ${Math.round(o.t*100)}%)`:''} · 포인트 −${o.n} → 경기 승률 약 ${Math.round(o.ev*100)}% — ${o.why}`).join('\n');
const bwSch=ns=>({type:'object',properties:{n:{type:'integer',enum:ns},say:{type:'string'},memo:{type:'string'}},required:['n','say','memo'],additionalProperties:false});
NAT.bwai={ ai:true, maxH:2, title:'흑과 백', emoji:'⚫', tagline:'99포인트, 9라운드 — 상대가 낸 건 검정인지 하양인지뿐',
  rule:'각자 99포인트로 9라운드. 선이 몰래 포인트를 내면, 후는 <b>그 색만 보고</b>(0~9는 ⚫, 10 이상은 ⚪) 몰래 내요. 쓴 포인트는 사라져요. 더 많이 낸 쪽 +1점·다음 선, 같으면 점수 없음. 남은 포인트는 <b>표시등 5칸</b>(20씩)으로만 보여요. <b>5점 먼저</b> 또는 9라운드 뒤 점수 높은 쪽 승!',
  start(s,pair,kind){ const m={id:'bwai',kind,R:9,r:0,al:pair.slice(),pts:{},sc:{},bid:{},hist:[],ph:'bid',ready:{},first:pair[Math.random()*2|0]}; pair.forEach(x=>{ m.pts[x]=99; m.sc[x]=0; });
    sys(s,`⚫⚪ ${kind==='final'?'결승':'데스매치'} 「흑과 백」 — ${nm(pair[0])} vs ${nm(pair[1])}. 99포인트로 9라운드, 상대가 낸 건 색(⚫ 0~9 / ⚪ 10+)만 보여요. 5점 먼저!`,'host'); this.next(s,m); return m; },
  other(m,x){ return m.al.find(y=>y!==x); },
  next(s,m){ m.r++; m.bid={}; m.ph='bid'; m.turn=m.first; m.tdl=Date.now()+15000; m.ready={}; },
  delay(){ return 900; }, ready(){ return true; },
  put(s,m,x,n,say){ n=Math.max(0,Math.min(m.pts[x],n|0)); m.bid[x]=n; m.pts[x]-=n; const o=this.other(m,x);
    talk(s,x,(say?say+' ':'')+`(${bwCol(n)} 냈어요)`,null,'say');
    if(m.bid[o]==null){ m.turn=o; m.tdl=Date.now()+15000; return; } this.settle(s,m); },
  settle(s,m){ const [a,b]=m.al, A=m.bid[a], B=m.bid[b]; const w=A>B?a:B>A?b:null; if(w){ m.sc[w]++; m.first=w; }
    m.hist.push({r:m.r,bid:Object.assign({},m.bid),w,first:m.turn===a?b:a});
    sys(s,`⚫⚪ ${m.r}라운드 — ${w?`${nm(w)} 승!`:'무승부'} (${nm(a)} ${bwCol(A)} vs ${nm(b)} ${bwCol(B)}) · 점수 ${m.sc[a]} : ${m.sc[b]}`,'host');
    m.ph='show'; m.until=Date.now()+(m.al.some(isHum)?6000:2500); m.ready={};
    const an=m.al.filter(x=>!isHum(x)); if(an.length&&Math.random()<.3) s.aq.push({k:'say',i:U.pick(an),model:'haiku',task:'흑과 백 한 라운드가 끝났다(위 게임 상황 참고). 상대에게 짧게 한마디(여유·떠보기·억울함). 네가 낸 정확한 숫자는 말하지 마라.'}); },
  tick(s){ const m=s.nm, now=Date.now();
    if(m.ph==='show'){ if(now>=m.until||m.al.filter(isHum).every(h=>m.ready[h])){ const [a,b]=m.al; const done=m.sc[a]>=5||m.sc[b]>=5||m.r>=m.R||(m.pts[a]<=0&&m.pts[b]<=0);
        if(done){ let w=m.sc[a]>m.sc[b]?a:m.sc[b]>m.sc[a]?b:(m.pts[a]>m.pts[b]?a:m.pts[b]>m.pts[a]?b:U.pick(m.al)); const l=this.other(m,w); sys(s,`⚫⚪ 흑과 백 끝 — ${nm(w)} 승리! (${m.sc[w]} : ${m.sc[l]})`,'win'); return natDuelEnd(s,w,l); }
        this.next(s,m); } return; }
    const x=m.turn; if(isHum(x)){ s.typing=null; return; } const o=this.other(m,x), ob=m.bid[o];
    const PL=bwPlan(s,m,x);
    const r=need(s,`${s.ep}:bw:${m.kind}:${m.r}:${x}`,()=>ask(s,x,`흑과 백 ${m.r}/9라운드 — 네 남은 포인트 ${m.pts[x]}, 상대 표시등 ${bwLamp(m.pts[o])}칸(상대 남은 약 ${PL.oLo}~${PL.oHi}). 점수 너 ${m.sc[x]} : ${m.sc[o]} 상대(5점 먼저 승).
[처지] 너는 ${PL.need}승 더, 상대는 ${PL.oNeed}승 더 필요 · 남은 라운드 ${PL.left}${PL.must?' — 남은 판을 다 이겨야 한다!':''}${PL.oNeed<=1?' — 상대가 1승만 더 하면 끝난다!':''} 
${ob!=null?`상대가 먼저 냈다: ${bwCol(ob)}(${ob<10?'0~9':'10 이상'}).`:'네가 선이다(상대는 네 색만 본다).'}
[선택지 표 — 코드가 계산함. '경기 승률'은 이 수를 둔 뒤 이 데스매치를 이길 확률 짐작(이번 판 승패 + 남은 포인트까지). 높을수록 좋은 수. 꼭 1등일 필요는 없지만(성격·심리전) 표에 근거가 있어야 한다]
${bwTable(PL)}
n은 표의 숫자 중 하나. say에 상대에게 짧은 허세·떠보기(숫자는 말하지 마라).`,bwSch(PL.opts.map(o=>o.n))));
    if(r===undefined&&now<m.tdl){ s.typing=x; return; } s.typing=null; if(r) memo(s,x,r);
    let n=r&&Number.isInteger(r.n)&&r.n>=0&&r.n<=m.pts[x]?r.n:null; if(n==null) n=bwAuto(s,m,x,PL);
    this.put(s,m,x,n,r&&shortSay(r.say,60)); },
  apply(s,me,a){ const m=s.nm; if(!m.al.includes(me)) return '이번 판 참가자가 아니에요';
    if(a.k==='ready'){ if(m.ph!=='show') return '지금은 아니에요'; m.ready[me]=1; return null; }
    if(a.k==='bid'){ if(m.ph!=='bid'||m.turn!==me) return '내 차례가 아니에요'; const n=a.n|0; if(!(n>=0&&n<=m.pts[me])) return `0~${m.pts[me]}`; this.put(s,m,me,n,''); return null; }
    return '알 수 없는 동작'; },
  mask(v,me){ const m=v.nm; if(!m) return; const o=m.al.find(x=>x!==me); if(o!=null){ if(m.al.includes(me)){ m.lamp={[o]:bwLamp(m.pts[o])}; m.pts={[me]:m.pts[me]}; } else { m.lamp=Object.fromEntries(m.al.map(x=>[x,bwLamp(m.pts[x])])); m.pts={}; }
      m.bidCol=Object.fromEntries(Object.entries(m.bid).map(([k,n])=>[k,bwCol(n)])); m.bid=m.bid[me]!=null?{[me]:m.bid[me]}:{}; m.hist=m.hist.map(h=>({r:h.r,w:h.w,col:Object.fromEntries(Object.entries(h.bid).map(([k,n])=>[k,bwCol(n)])),mine:h.bid[me]})); } },
  view(s,i){ const m=s.nm, o=this.other(m,i); if(!o) return ''; return `[지금 게임: ⚫⚪ 흑과 백 (${m.kind==='final'?'결승':'데스매치'}, 지면 ${m.kind==='final'?'준우승':'탈락'})] 99포인트로 9라운드, 상대가 낸 건 색만(⚫ 0~9 / ⚪ 10+), 남은 포인트는 표시등(20씩). 5점 먼저.
[지금] ${m.r}/9라운드 · 점수 ${nm(i)} ${m.sc[i]} : ${m.sc[o]} ${nm(o)} · 네 남은 포인트 ${m.pts[i]} · 상대 표시등 ${bwLamp(m.pts[o])}칸
[지난 라운드] ${m.hist.map(h=>`${h.r}R: 너 ${h.bid[i]}·상대 ${bwCol(h.bid[o])} → ${h.w?nm(h.w)+' 승':'무승부'}`).join(' / ')||'없음'}`; },
  card(v,me,out){ const m=v.nm, mine=m.al.includes(me)&&!out, o=m.al.find(x=>x!==me);
    let h=`<div class="vr-card ga bwai">`+gaTop(`⚫⚪ 흑과 백 · ${m.kind==='final'?'🏆 결승':'⚔️ 데스매치'} · ${m.r}/9라운드 · 5점 먼저`,this.rule);
    const L=mine?me:m.al[0], R=m.al.find(x=>x!==L);
    const lamps=x=>{ const lp=(m.lamp||{})[x]!=null?m.lamp[x]:(m.pts||{})[x]!=null?bwLamp(m.pts[x]):null; return lp==null?'':`<div class="ga-lamps">${[1,2,3,4,5].map(k=>`<i class="${k<=lp?'on':''}"></i>`).join('')}</div>`; };
    const pl=x=>`<div class="p ${m.turn===x&&m.ph==='bid'?'turn':''} ${x===me?'me':''}">${gaSay(v,x,x===me?'me':'')}<span class="av">${emo(x)}</span><b>${U.esc(nm(x))}${x===me?' (나)':''}</b>${lamps(x)}${(m.pts||{})[x]!=null?`<small>남은 ${m.pts[x]}</small>`:''}</div>`;
    h+=`<div class="ga-bw">${pl(L)}<div class="sc">${m.sc[L]} : ${m.sc[R]}</div>${pl(R)}</div>`;
    const bc=m.bidCol||{};
    h+='<div class="ga-rtrack">'+[...Array(9)].map((_,k)=>{ const r=k+1, hh=m.hist.find(x=>x.r===r);
      if(hh) return `<div class="${hh.w===me?'w':hh.w?'l':''}"><small>${r}</small><b>${hh.col?`${hh.col[L]||''}${hh.col[R]||''}`:''}</b><span>${hh.w?emo(hh.w):'='}</span>${hh.mine!=null&&mine?`<small>${hh.mine}</small>`:''}</div>`;
      if(r===m.r&&m.ph==='bid') return `<div class="now"><small>${r}</small><b>${bc[L]||'·'}${bc[R]||'·'}</b><span>?</span></div>`;
      return `<div class="fut"><small>${r}</small></div>`; }).join('')+'</div>';
    if(mine&&m.ph==='bid'&&m.turn===me){ const P=m.pts[me]; const sel=Math.min(P,(window.__bwN??10)|0);
      h+=gaDock(`${bc[o]?`${emo(o)} ${U.esc(nm(o))}이(가) 먼저 냈어요: <b>${bc[o]}</b> (${bc[o]==='⚫'?'0~9':'10 이상'})`:'내가 선 — 상대는 내 색만 봐요'} · 내 남은 포인트 <b>${P}</b>`,
        `<div class="ga-dial"><span class="n">${sel}</span><span class="s"><i style="width:${P?Math.round(sel/P*100):0}%"></i></span><span class="c">${bwCol(sel)}</span></div><div class="ga-row">${[0,1,5,9,10,15,20,30].filter(n=>n<=P).map(n=>`<button class="small ghost ${sel===n?'on':''}" data-bwn="${n}">${n}</button>`).join('')}<button class="small ghost" data-bwn="-1">−1</button><button class="small ghost" data-bwn="+1">+1</button></div><div class="ga-btns">${gaB({k:'bid',n:sel},`🤫 ${sel} 내기`)}</div>`); }
    else if(m.ph==='bid') h+=mine?gaDock(bc[me]?`나는 ${bc[me]} 냈어요`:'',gaWait(`${emo(m.turn)} ${U.esc(nm(m.turn))} 고민 중…`)):gaWait(`💭 ${emo(m.turn)} ${U.esc(nm(m.turn))} 고민 중…`);
    else if(m.ph==='show'&&mine){ const hh=m.hist[m.hist.length-1]; h+=gaDock(hh?`${m.r}라운드 — ${hh.w?`${emo(hh.w)} ${U.esc(nm(hh.w))} 승!`:'무승부'}${hh.mine!=null?` (나는 ${hh.mine} 냄)`:''}`:'',m.ready[me]?gaWait('기다리는 중…'):`<div class="ga-btns">${gaB({k:'ready'},'다음 라운드 ▶')}</div>`); }
    return h+'</div>'; },
};

/* ───────── core 연결 ───────── */
/* ───────── 🪨 무거운 13 · AI판 (2026-11-12 데블스 플랜 놀이터 감옥 매치 — 원작 「데블스 플랜: 데드 어게인」 1일차 감옥 매치) ─────────
   각자 바위 카드 0~6 일곱 장 + 순서 칩(🔴🟢🔵 두 개씩·🌈 하나). 짐꾼 받침대 셋은 판 내내 이어짐.
   라운드: 🤫 바위 카드 + 칩을 몰래 냄 → 칩 공개로 놓는 순서(🌈 > 🔴 > 🟢 > 🔵, 같으면 선부터 시계 방향) → 차례대로 받침대를 골라 놓음(라운드당 한 번 패스 = 맨 뒤로).
   놓아서 받침대 합이 13 이상이 되면 그 받침대 바위를 전부 가져가고 개수만큼 벌점. 7라운드마다 카드·칩을 새로 받고, 14라운드 뒤 벌점이 적은 순(같으면 늦게 받은 쪽이 아래).
   동물: 카드·칩은 AI(sonnet — 11-12 실제 시험에서 haiku가 동시 제출 때 15초를 자주 넘김)가 계산 힌트를 보고 고름, 받침대 고르기는 바로 계산(성격 반영). */
const HV_CH={W:{e:'🌈',p:4,n:'무지개'},R:{e:'🔴',p:3,n:'빨강'},G:{e:'🟢',p:2,n:'초록'},B:{e:'🔵',p:1,n:'파랑'}};
const HV_SUB={type:'object',properties:{card:{type:'integer'},chip:{type:'string',enum:['W','R','G','B']},say:{type:'string'},memo:{type:'string'}},required:['card','chip','say','memo'],additionalProperties:false};
const hvSum=p=>p.reduce((t,x)=>t+x.v,0);
NAT.heavy13ai={ maxH:12, title:'무거운 13', emoji:'🪨', tagline:'받침대 합이 13을 넘기는 사람이 바위를 전부 떠안는다',
  rule:'각자 바위 카드 <b>0~6</b> 일곱 장과 순서 칩(🔴🟢🔵 두 개씩, 🌈 하나). 라운드마다 카드 한 장 + 칩 하나를 몰래 내요. 칩으로 놓는 순서가 정해지고(<b>🌈 > 🔴 > 🟢 > 🔵</b>, 같으면 선부터 시계 방향), 차례대로 받침대 셋 중 하나에 놓아요. 놓아서 <b>받침대 합이 13 이상</b>이면 그 받침대 바위를 전부 가져가고 <b>개수만큼 벌점</b>. 라운드마다 한 번 <b>패스</b>(맨 뒤로)할 수 있어요. 0은 합을 안 올리지만 바위 수를 늘려요. 7라운드마다 카드·칩을 새로 받고 받침대는 그대로. 14라운드 뒤 벌점이 가장 많은 사람이 꼴찌(같으면 늦게 받은 쪽).',
  start(s,al,kind){ const m={id:'heavy13ai',kind:kind||s.phase,R:14,r:0,al:U.shuffle(al.slice()),lead:0,ped:[[],[],[]],pen:{},last:{},hand:{},chips:{},sub:{},plan:{},ph:'sub',hist:[],log:[],ready:{}};
    m.al.forEach(x=>{ m.pen[x]=0; m.last[x]=0; });
    sys(s,`🪨 ${this.kindName(m)} 「무거운 13」 — 바위 카드와 칩을 몰래 내고, 칩 순서대로 받침대에 놓아요. 합이 13 이상이 되게 만든 사람이 그 받침대 바위를 전부 떠안아요(개수만큼 벌점). 14라운드, 벌점 꼴찌는 유배지로!`,'host');
    this.deal(m); this.round(s,m); return m; },
  kindName(m){ return m.kind==='revival'?'🔥 패자부활전':m.kind==='match'?'메인 매치':'⛓️ 감옥 매치'; },
  tell(s,m,id){ const r=this.rank(m), L=m.log[m.log.length-1]; if(L&&L.id===id&&L.r===m.r) return 'angry'; if(r[r.length-1]===id&&m.pen[id]>0) return 'nerv'; if(m.ph==='sub'&&m.sub[id]&&m.sub[id].card>=5&&Math.max(...m.ped.map(p=>hvSum(p)))>=7) return 'sweat'; if(r[0]===id&&m.r>3) return 'smug'; return null; },
  deal(m){ for(const x of m.al){ m.hand[x]=[0,1,2,3,4,5,6]; m.chips[x]={W:1,R:2,G:2,B:2}; } },
  round(s,m){ m.r++; if(m.r>1&&(m.r-1)%7===0){ this.deal(m); sys(s,'🪨 카드와 칩을 새로 받았어요 — 받침대는 그대로예요','host'); }
    m.sub={}; m.plan={}; m.ready={}; m.passed={}; m.order=[]; m.pi=0; m.ph='sub'; m.dl=Date.now()+45000; m.pdl=Date.now()+20000;
    sys(s,`🪨 ${m.r}/${m.R}라운드 — 선 ${nm(m.al[m.lead])}. 바위 카드와 칩을 몰래 내세요`,'host'); },
  delay(s){ const m=s.nm; return m.ph==='place'&&!isHum(m.order[m.pi])?1300:m.ph==='res'?900:800; }, ready(){ return true; },
  ani(s,m){ return m.al.filter(x=>!isHum(x)); },
  hum(s,m){ return m.al.filter(isHum); },
  /* 계산 힌트: 지금 받침대에 안전하게 놓을 수 있는 가장 큰 카드 */
  safeTop(m){ return Math.max(...m.ped.map(p=>12-hvSum(p))); },
  /* 내 앞에 k명이 평균 3씩 받침대 셋에 나눠 놓는다고 보면 */
  safeLate(m,k){ const add=k*3/3; return Math.max(...m.ped.map(p=>Math.floor(12-hvSum(p)-add))); },
  autoSub(s,m,i){ const H=m.hand[i], C=m.chips[i], P=ANI(i)||{}, top=this.safeTop(m), left=7-((m.r-1)%7);
    /* 큰 카드는 안전할 때 먼저 털고, 위험하면 작은 카드 + 낮은 칩(늦게 놓아 남이 터뜨린 뒤 놓기) */
    const late=this.safeLate(m,Math.floor((m.al.length-1)/2)); const safe=H.filter(v=>v<=(C.W?top:late)); let card=safe.length?Math.max(...safe):Math.min(...H);
    if(H.includes(0)&&trait(s,i,'aggr')>.55&&m.ped.some(p=>hvSum(p)>=9&&p.length>=3)&&Math.random()<.5) card=0;   /* 0으로 남의 벌점 키우기 */
    /* 칩은 일부러 섞어 냄 — 동시에 몰래 내는 게임이라 늘 같은 칩이면 읽힘(2026-11-12 시험: 무작위를 빼니 벌점 +1.4) */
    const hot=m.ped.some(p=>hvSum(p)>=7); let chip; if(card>=4&&card<=top&&C.W&&hot&&Math.random()<.7) chip='W'; else if(card>=4&&C.R&&Math.random()<.75) chip='R'; else if(card<=1&&C.B) chip='B'; else if(card<=3&&C.G) chip='G';
    if(!chip||!C[chip]) chip=['G','B','R','W'].find(k=>C[k])||'B';
    if(left===1) chip=Object.keys(C).find(k=>C[k]); return {card,chip}; },
  tick(s){ const m=s.nm, now=Date.now(), H=this.hum(s,m);
    if(m.ph==='sub'){
      for(const i of this.ani(s,m)){ if(m.plan[i]) continue;
        const r=need(s,`${s.ep}:${m.kind}:hv:${m.r}:${i}`,()=>ask(s,i,`무거운 13 ${m.r}/${m.R}라운드 — 바위 카드(card: 네 손에 있는 숫자)와 순서 칩(chip: W=🌈 R=🔴 G=🟢 B=🔵 중 남은 것)을 몰래 낸다. 칩이 높을수록 먼저 놓는다(먼저 놓으면 받침대를 먼저 고르지만, 늦게 놓으면 남이 터뜨려 비운 뒤 안전하게 놓을 수도 있다). 네 손: [${m.hand[i].join(',')}], 남은 칩: ${Object.entries(m.chips[i]).filter(([,n])=>n).map(([k,n])=>HV_CH[k].e+'×'+n).join(' ')}. 이번 세트 남은 라운드 ${7-((m.r-1)%7)} — 카드·칩은 세트 안에 다 쓴다. 계산 힌트: 지금 받침대 합 ${m.ped.map(p=>hvSum(p)).join('/')}. 이번 라운드엔 너 말고 ${m.al.length-1}명도 바위를 놓는다 — 🌈로 맨 먼저 놓으면 ≤${Math.max(0,Math.min(6,this.safeTop(m)))}까지 안전, 중간이면 ≤${Math.max(0,Math.min(6,this.safeLate(m,Math.floor((m.al.length-1)/2))))}, 🔵로 맨 뒤에 놓으면 ≤${Math.max(0,Math.min(6,this.safeLate(m,m.al.length-1)))}쯤(앞사람이 터뜨려 비우면 더 안전). 다들 큰 카드를 털려 하면 받침대가 금방 찬다 — 남들과 같은 생각인지도 따져라. 🌈은 세트에 하나뿐이라 받침대가 위험할 때(합 7 이상) 큰 카드를 먼저 털 때 아껴 써라. 0은 합을 안 올리고 바위 수만 늘려 다음에 터뜨리는 사람의 벌점을 키운다. 큰 카드는 안전할 때 미리 털어야 나중에 안 터진다. [처지] 벌점 ${m.pen[i]} · 순위 ${this.rank(m).indexOf(i)+1}/${m.al.length}(벌점 많은 꼴찌는 ${m.kind==='revival'?'부활 실패':'유배'}) · 남은 라운드 ${m.R-m.r}${this.rank(m).slice(-2).includes(i)?' — 지금 꼴찌권이다!':''}\nsay는 테이블 한마디(대부분 빈 문자열, 할 말 있을 때만 짧게).`,HV_SUB));
        if(r===undefined&&now<m.pdl) continue; m.plan[i]=1; if(r) memo(s,i,r);
        let o=r&&m.hand[i].includes(r.card|0)&&m.chips[i][r.chip]?{card:r.card|0,chip:r.chip}:this.autoSub(s,m,i); m.sub[i]=o;
        const t=r&&shortSay(r.say,60); if(t) talk(s,i,t,null,'say'); return; }
      if(this.ani(s,m).every(i=>m.plan[i])&&(H.every(h=>m.sub[h])||now>=m.dl)){ for(const h of H) if(!m.sub[h]) m.sub[h]=this.autoSub(s,m,h); this.reveal(s,m); }
      else s.typing=null; return; }
    if(m.ph==='place'){ const i=m.order[m.pi]; if(i==null) return this.endRound(s,m);
      if(isHum(i)){ if(now>=m.tdl){ const k=this.bestPed(m,i,m.sub[i].card); this.place(s,m,i,k); } return; }
      const k=this.choose(s,m,i); if(k==='pass') this.pass(s,m,i); else this.place(s,m,i,k); return; }
    if(m.ph==='res'){ if(now>=m.until||(H.length&&H.every(h=>m.ready[h]))){ if(m.r>=m.R) return this.finish(s,m); m.lead=(m.lead+1)%m.al.length; this.round(s,m); } return; } },
  reveal(s,m){ const N=m.al.length, seat=x=>(m.al.indexOf(x)-m.lead+N)%N;
    for(const x of m.al){ const o=m.sub[x]; m.hand[x].splice(m.hand[x].indexOf(o.card),1); m.chips[x][o.chip]--; }
    m.order=m.al.slice().sort((a,b)=>HV_CH[m.sub[b].chip].p-HV_CH[m.sub[a].chip].p||seat(a)-seat(b)); m.pi=0; m.ph='place'; m.tdl=Date.now()+25000; m.placed={};
    sys(s,`🎴 칩 공개 — ${m.order.map(x=>`${HV_CH[m.sub[x].chip].e}${nm(x)}`).join(' → ')}`,'host'); },
  /* 놓았을 때 터지는지·벌점 */
  risk(m,k,v){ const p=m.ped[k]; return hvSum(p)+v>=13?p.length+1:0; },
  bestPed(m,i,v){ let best=0, bv=1e9; for(let k=0;k<3;k++){ const r=this.risk(m,k,v), sum=hvSum(m.ped[k])+v; const sc=r*100-(r?0:sum)+(r?0:Math.random()*.3); if(sc<bv){ bv=sc; best=k; } } return best; },
  /* 🧠 받침대 고르기 (NPC 룰 3·6·14·⑥, 2026-11-12) — 안전한 받침대마다 "놓은 뒤 다음 1~2명이 어쩔 수 없이 터질 확률(그 사람 카드 0~6 중 세 받침대 모두 13 이상이 되는 비율) × 떠안을 바위 수"를 계산하고,
     그 사람이 누구냐로 곱함: 원한·강자·벌점 순위가 나와 붙은 라이벌이면 +(노림), 연합·호감·빚이면 −(피함). 예전엔 대담하면 무조건 13 바로 아래로 쌓아 다음 차례가 연합원이어도 위협. */
  choose(s,m,i){ const v=m.sub[i].card; const rs=[0,1,2].map(k=>this.risk(m,k,v)); const safe=[0,1,2].filter(k=>!rs[k]);
    if(!safe.length&&!m.passed[i]&&m.pi<m.order.length-1) return 'pass';
    if(!safe.length) return rs.indexOf(Math.min(...rs));
    const next=m.order.slice(m.pi+1,m.pi+3), rk=this.rank(m), myR=rk.indexOf(i);
    const want=j=>{ const o=BX(s,i,j), close=Math.abs(rk.indexOf(j)-myR)<=1?.4:0; return o.g+threat(s,j)*.4+close+fearOf(s,i,j)*.3-(isAlly(s,i,j)?1:0)-rel(s,i,j)*.5-o.d*.6; };
    const sc=k=>{ const sums=m.ped.map((p,q)=>hvSum(p)+(q===k?v:0)), cnt=m.ped.map((p,q)=>p.length+(q===k?1:0)); let t=0;
      next.forEach((j,idx)=>{ const forced=[0,1,2,3,4,5,6].filter(c=>sums.every(sm=>sm+c>=13)).length/7, pain=Math.min(...cnt.map(c=>c+1)); t+=forced*pain*want(j)*(idx?.5:1); });
      const af=hvSum(m.ped[k])+v, myH=m.hand[i].length?m.hand[i]:[0,1,2,3,4,5,6], meF=myH.filter(c=>sums.every(sm=>sm+c>=13)).length/myH.length, back=m.al.length<=4?1.2:.6;   /* 사람이 적으면 차례가 금방 돌아와 내가 만든 함정에 나도 빠짐 */
      return t*(.5+trait(s,i,'aggr'))-af*.02-(af>=10?(af-9)*.12:0)-meF*Math.min(...cnt.map(c=>c+1))*back; };   /* 아무 상관 없으면 여유 있는 곳, 13 가까이 쌓으면 다음 라운드엔 나도 위험 */
    return safe.slice().sort((a,b)=>sc(b)-sc(a))[0]; },
  pass(s,m,i){ m.passed[i]=1; m.order.splice(m.pi,1); m.order.push(i); sys(s,`⏭️ ${nm(i)} 패스 — 맨 뒤에 놓아요`,'host'); m.tdl=Date.now()+25000; },
  place(s,m,i,k){ const v=m.sub[i].card, p=m.ped[k]; p.push({id:i,v}); const sum=hvSum(p); let msg=`🪨 ${nm(i)} → ${k+1}번 받침대에 ${v} (합 ${sum})`;
    if(sum>=13){ const n=p.length; m.pen[i]+=n; beat(s,'bust',`${m.r}라운드 ${nm(i)}이(가) ${k+1}번 받침대를 터뜨려 바위 ${n}개(벌점 +${n})`,.8+n*.3,i); m.last[i]=m.r*100+m.pi; m.ped[k]=[]; msg+=` 💥 13 이상! 바위 ${n}개를 떠안아요 (벌점 +${n})`; m.log.push({r:m.r,id:i,n});
      if(!isHum(i)&&Math.random()<.6) s.aq.push({k:'say',i,model:'haiku',task:`무거운 13에서 방금 네가 받침대를 터뜨려 바위 ${n}개(벌점 +${n})를 떠안았다. 한마디. 짧게.`,fb:['아 망했다','으아 무거워']});
      else { const w=U.pick(this.ani(s,m).filter(x=>x!==i)); if(w&&Math.random()<.35) s.aq.push({k:'say',i:w,model:'haiku',task:`무거운 13에서 방금 ${nm(i)}이(가) 받침대를 터뜨려 바위 ${n}개를 떠안았다. 짧게 반응.`,fb:['헐','ㅋㅋㅋ']}); } }
    m.placed[i]=k; sys(s,msg,sum>=13?'bad':''); m.pi++; m.tdl=Date.now()+25000; if(m.pi>=m.order.length) this.endRound(s,m); },
  endRound(s,m){ m.hist.push({r:m.r,sub:JSON.parse(JSON.stringify(m.sub)),pen:Object.assign({},m.pen)}); m.ph='res'; m.ready={}; m.until=Date.now()+(this.hum(s,m).length?9000:2500); },
  rank(m){ return m.al.slice().sort((a,b)=>m.pen[a]-m.pen[b]||m.last[a]-m.last[b]||Math.random()-.5); },
  finish(s,m){ const ids=this.rank(m); const neg={}; for(const x of m.al) neg[x]=-m.pen[x];
    sys(s,'🪨 최종 벌점 — '+ids.map((x,k)=>`${k+1}위 ${nm(x)} ${m.pen[x]}`).join(' · '),'host'); s.nm=null; announceMain(s,'heavy13ai',ids,null,neg,'점(벌점)'); },
  apply(s,me,a){ const m=s.nm; if(!m.al.includes(me)) return '이번 게임 참가자가 아니에요';
    if(a.k==='sub'){ if(m.ph!=='sub') return '지금은 낼 때가 아니에요'; const c=a.card|0; if(!m.hand[me].includes(c)) return '손에 없는 카드예요'; if(!m.chips[me][a.chip]) return '남은 칩이 아니에요'; m.sub[me]={card:c,chip:a.chip}; return null; }
    if(a.k==='place'){ if(m.ph!=='place'||m.order[m.pi]!==me) return '내 차례가 아니에요'; const k=a.p|0; if(!(k>=0&&k<3)) return '받침대를 고르세요'; this.place(s,m,me,k); return null; }
    if(a.k==='pass'){ if(m.ph!=='place'||m.order[m.pi]!==me) return '내 차례가 아니에요'; if(m.passed[me]) return '이번 라운드엔 이미 패스했어요'; if(m.pi>=m.order.length-1) return '맨 뒤라 패스할 수 없어요'; this.pass(s,m,me); return null; }
    if(a.k==='ready'){ m.ready[me]=1; return null; }
    return '알 수 없는 동작'; },
  mask(v,me){ const m=v.nm; if(!m) return; if(m.ph==='sub'){ m.subbed=Object.keys(m.sub); m.sub=m.sub[me]?{[me]:m.sub[me]}:{}; }
    else if(m.ph==='place'){ for(const x of Object.keys(m.sub)) if(x!==me&&!(x in (m.placed||{}))) m.sub[x]={chip:m.sub[x].chip,card:null}; } },
  view(s,i){ const m=s.nm; const L=['[지금 게임: 🪨 무거운 13] 받침대 3개(판 내내 이어짐). 라운드마다 바위 카드(0~6) 하나와 순서 칩(🌈>🔴>🟢>🔵) 하나를 몰래 내고, 칩 순서대로 받침대에 놓는다. 놓아서 받침대 합이 13 이상이면 그 받침대 바위를 전부 가져가 개수만큼 벌점. 라운드당 한 번 패스(맨 뒤로). 7라운드마다 카드·칩 새로. 14라운드 뒤 벌점 가장 많은 사람이 꼴찌.'];
    L.push(`[지금] ${m.r}/${m.R}라운드 · ${{sub:'카드·칩 내는 중',place:'놓는 중',res:'라운드 끝'}[m.ph]} · 받침대 합 ${m.ped.map((p,k)=>`${k+1}번 ${hvSum(p)}(${p.length}개)`).join(', ')}`);
    L.push('[벌점] '+this.rank(m).map(x=>`${nm(x)} ${m.pen[x]}`).join(', '));
    if(m.hand[i]) L.push(`[너] 손 [${m.hand[i].join(',')}] · 남은 칩 ${Object.entries(m.chips[i]).filter(([,n])=>n).map(([k,n])=>HV_CH[k].e+'×'+n).join(' ')}`);
    return L.join('\n'); },
  /* 받침대 = 13 눈금 통 (2026-11-12 개편) — 바위 높이가 숫자에 비례, 점선이 13. 내 차례면 받침대를 눌러 놓고, 내 바위가 들어갈 자리를 미리 보여 줌 */
  board(v,me){ const m=v.nm, U18=100/18, cur=m.ph==='place'?m.order[m.pi]:null, pick=cur===me&&m.sub[me]&&m.sub[me].card!=null?m.sub[me].card:null;
    const prev=(m.ph==='place'||m.ph==='res')&&m.pi>0?m.order[m.pi-1]:null, pk=prev&&m.placed&&prev in m.placed?m.placed[prev]:-1;
    const bust=m.ph==='place'||m.ph==='res'?m.log.filter(L=>L.r===m.r):[];
    return '<div class="hv-peds">'+m.ped.map((p,k)=>{ const sum=hvSum(p), lv=sum>=12?'dang':sum>=9?'warn':sum?'safe':'empty', r=pick!=null?this.risk(m,k,pick):0;
      const top=p.length?p[p.length-1]:null, fresh=k===pk&&top&&top.id===prev, B=bust.filter(L=>m.placed&&m.placed[L.id]===k).pop();
      const st=p.map((x,n)=>`<span class="hv-rock ${x.id===me?'me':''} ${x.v?x.v===1?'v1':'':'zero'} ${fresh&&n===p.length-1?'new':''}" style="height:${(x.v*U18).toFixed(2)}%" title="${U.esc(nm(x.id))} ${x.v}"><b>${x.v}</b><i>${emo(x.id)}</i></span>`).join('');
      const gh=pick!=null?`<span class="hv-rock ghost ${r?'bad':'ok'} ${pick?pick===1?'v1':'':'zero'}" style="height:${(pick*U18).toFixed(2)}%"><b>${pick}</b></span>`:'';
      const foot=pick!=null?`<div class="hv-pick ${r?'bad':'ok'}">→ ${sum+pick} ${r?`💥 벌점 ${r}`:'안전'}</div>`:`<div class="hv-safe">${sum>=13?'':`안전 ≤ <b>${Math.min(6,12-sum)}</b>`}</div>`;
      return `<div class="hv-ped lv-${lv} ${pick!=null?'click '+(r?'bad':'ok'):''} ${B?'burst':''}" ${pick!=null?`data-nm='${JSON.stringify({k:'place',p:k})}'`:''}>
        <div class="hv-head"><span class="hv-no">${k+1}번</span><span class="hv-sum"><b>${sum}</b><small>/13</small></span></div>
        <div class="hv-tube"><div class="hv-line" style="bottom:${(13*U18).toFixed(2)}%"><span>13</span></div><div class="hv-stack">${st}${gh}</div>${p.length?'':'<small class="hv-empty">비어 있음</small>'}${B?`<div class="hv-boom">💥 ${emo(B.id)} +${B.n}</div>`:''}</div>
        <div class="hv-foot"><span>🪨 ${p.length}개</span>${foot}</div></div>`; }).join('')+'</div>'; },
  card(v,me,out){ const m=v.nm, mine=m.al.includes(me)&&(!out||v.phase==='revival'), cur=m.ph==='place'?m.order[m.pi]:null;
    let h=`<div class="vr-card ga hv">`+gaTop(`🪨 무거운 13 · ${m.r}/${m.R}라운드 · ${{sub:'🤫 카드·칩 내기',place:'🪨 놓기',res:'📢 라운드 끝'}[m.ph]} ${gaT(m.ph==='sub'?m.dl:m.ph==='place'&&cur===me?m.tdl:0)}`,this.rule);
    h+=this.board(v,me);
    if(m.ph==='place'||m.ph==='res') h+='<div class="hv-order">'+m.order.map((x,k)=>`<span class="${k<m.pi||m.ph==='res'?'done':k===m.pi?'on':''} ${x===me?'me':''}">${HV_CH[m.sub[x].chip].e}${emo(x)}${m.sub[x].card!=null&&(k<m.pi||x===me||m.ph==='res')?`<b>${m.sub[x].card}</b>`:''}${m.passed&&m.passed[x]?'⏭️':''}</span>`).join('')+'</div>';
    h+='<div class="ga-strip">'+this.rank(m).map(x=>`<span class="${x===me?'me':''}">${emo(x)}<i>${U.esc(nm(x))}</i><b>${m.pen[x]}</b>${m.ph==='sub'&&(m.subbed||[]).includes(x)&&x!==me?'<small class="pos">✓</small>':''}</span>`).join('')+'</div>';
    if(mine&&m.ph==='sub'){ const sc=gaSel('hvc:'+m.r,m.sub[me]?m.sub[me].card:null), sh=gaSel('hvh:'+m.r,m.sub[me]?m.sub[me].chip:null);
      let b='<div class="ga-nums">'+m.hand[me].map(n=>`<button class="ghost ${sc===n?'on':''}" data-gsel="hvc:${m.r}|${n}">${n}</button>`).join('')+'</div><div class="ga-nums hv-chips">'+Object.keys(HV_CH).filter(k=>m.chips[me][k]).map(k=>`<button class="ghost ${sh===k?'on':''}" data-gsel="hvh:${m.r}|${k}">${HV_CH[k].e}<small>×${m.chips[me][k]}</small></button>`).join('')+'</div><div class="ga-btns">';
      if(sc!=null&&sh) b+=gaB({k:'sub',card:+sc,chip:sh},m.sub[me]&&m.sub[me].card===+sc&&m.sub[me].chip===sh?`✔ ${sc} ${HV_CH[sh].e} 냈어요`:`🤫 ${sc} ${HV_CH[sh].e} 내기`,m.sub[me]&&m.sub[me].card===+sc&&m.sub[me].chip===sh?'ghost':'');
      b+='</div>'; h+=gaDock(`손 ${m.hand[me].length}장 · 받침대 합 ${m.ped.map(p=>hvSum(p)).join(' / ')} · 지금 터지지 않는 최대 <b>${Math.min(6,this.safeTop(m))}</b>`,b); }
    else if(mine&&m.ph==='place'&&cur===me){ const c=m.sub[me].card;
      h+=gaDock(`내 바위 <b>${c}</b> — 받침대를 누르거나 아래에서 골라요 (점선 = 13)`,'<div class="ga-btns">'+[0,1,2].map(k=>{ const r=this.risk(m,k,c); return gaB({k:'place',p:k},`${k+1}번 → ${hvSum(m.ped[k])+c}${r?` 💥벌점 ${r}`:''}`,r?'ghost bad':''); }).join('')+(!m.passed[me]&&m.pi<m.order.length-1?gaB({k:'pass'},'⏭️ 패스','ghost'):'')+'</div>'); }
    else if(mine&&m.ph==='place') h+=gaDock('',gaWait(`${emo(cur)} ${U.esc(nm(cur))} 놓는 중…`));
    else if(mine&&m.ph==='res') h+=gaDock('',m.ready[me]?gaWait('다음 라운드 기다리는 중…'):`<div class="ga-btns">${gaB({k:'ready'},m.r>=m.R?'최종 결과 ▶':'다음 라운드 ▶')}</div>`);
    else if(!mine) h+=gaDock('',gaWait('👀 구경 중이에요'));
    return h+'</div>'; },
};

/* ───────── 🔫 러시안 룰렛 · AI판 (2026-11-12 원작 「데블스 플랜: 데드 어게인」 2일차 감옥 매치) ─────────
   원형 테이블 N자리 = 약실 N칸, 총알은 N≥6이면 2발·아니면 1발. 약실 c는 자리 (c+rot)%N을 겨눔 — 총구(약실 0)가 겨눈 자리부터 시계 방향으로 격발.
   각자 크레딧 16(잔량은 본인만). 차례마다 한 가지: 🔎 공개 조사 1(붙은 두 자리 약실을 모두에게) · 🕶️ 비밀 조사 2(나만) · ↻1칸 회전 3 · ↻2칸 회전 4 · 🛠️ 조작 적립 1~3(몰래, 6 모이면 붙은 두 자리 약실을 맞바꿈, 넘친 건 사라짐).
   크레딧이 0인 사람은 자동 패스. 절반(올림)이 0이 되면 격발 — 맞은 사람 탈락. 🧩 피스 1개 = 크레딧 +3(한 판 한 번, 몰래).
   🔗 수갑: 판 동안 귓속말은 바로 옆자리끼리만. */
const rrSch=keys=>({type:'object',properties:{pick:{type:'string',enum:keys},say:{type:'string'},memo:{type:'string'}},required:['pick','say','memo'],additionalProperties:false});
const RR_COST={pub:1,priv:2,rot1:3,rot2:4};
const RR_N={pub:'🔎 공개 조사',priv:'🕶️ 비밀 조사',rot1:'↻ 1칸 회전',rot2:'↻ 2칸 회전',man:'🛠️ 조작 적립'};
/* 🧠 러시안 룰렛 선택지 표 (NPC 룰 1·2·3·10·14, 2026-11-12) — 행동마다 [행동 뒤 자리별 총알 확률(내가 아는 것 기준) → 내 피격 확률 · 바로 격발되나 · 조사로 얻는 정보 · 남는 크레딧 · 총구가 누구를 향하나(원한·강자 쪽이면 +, 연합·빚이면 −)] → 점수.
   위험할수록(피격 확률↑) 크레딧은 나중에 돌릴 힘이라 아끼고, 안전하면 크레딧을 털어 격발을 앞당기는 게 이득. 조작은 내 약실이 위험할 때 옆자리와 맞바꾸는 쪽으로만(예전엔 무조건 오른쪽과 맞바꿔 총알을 가져오기도 함). */
function rrSeatP(N,m,i,dr,sw){ const P=[...Array(m.N).keys()].map(k=>N.pB(m,i,((k-(m.rot+dr))%m.N+m.N)%m.N)); if(sw!=null){ const a=sw%m.N,b=(sw+1)%m.N; [P[a],P[b]]=[P[b],P[a]]; } return P; }
function rrPlan(s,m,i){ const N=NAT.rouletteai, sx=N.seatOf(m,i), c=m.cr[i], K=N.know(m,i), n=m.N, zero=N.zero(m), need0=N.need0(m), p0=N.pHit(m,i,0);
  const hate=x=>{ const o=BX(s,i,x); return o.g+threat(s,x)*.5-(isAlly(s,i,x)?.8:0)-o.d*.6-rel(s,i,x)*.3; };
  /* 격발이 얼마나 가까운가(0~1) — 0 된 사람 + 공개 행동으로 크레딧이 4 이하로 보이는 사람. 멀면 지금 피격 확률은 남들이 다시 돌릴 수 있어 덜 중요하고, 크레딧이 '마지막에 돌릴 힘' */
  const sp={}; for(const L of m.log) if(L.act!=='man') sp[L.id]=(sp[L.id]||0)+(RR_COST[L.act]||0); const nearZ=m.al.filter(x=>x!==i&&m.cr[x]>0&&16-(sp[x]||0)<=4).length, imm=Math.min(1,(zero+nearZ*.7)/need0);
  const unkPair=q=>[q%n,(q+1)%n].filter(k=>!(N.cham(m,k) in K)).length, mine=N.cham(m,sx) in K;
  const opts=[]; const add=(a,label,cost,dr,sw,info)=>{ if(cost>c) return; const P=rrSeatP(N,m,i,dr,sw), ph=P[sx], left=c-cost, fires=zero+(left<=0&&c>0?1:0)>=need0;
    const lam=.1+.6*(1-imm)+(ph>=.3?.15:0), aim=P.reduce((t,p,k)=>t+(k===sx?0:p*hate(m.al[k])),0);
    const sc=-ph*(1+6*imm)-(fires?ph*8:0)+info-(cost*lam)+(ph<.15&&imm>.5&&!fires?cost*.15:0)+aim*.6*imm+(fires&&ph<.1?1.5:0);
    opts.push({a,label,ph,fires,left,sc,aim,imm}); };
  for(const q of [sx,(sx-1+n)%n,...[...Array(n).keys()].filter(k=>unkPair(k)===2).slice(0,2)]){ const u=unkPair(q); if(!u) continue; const nearMe=q===sx||q===(sx-1+n)%n;
    const info=u*.35*(nearMe&&!mine?2:1)*(c-1>=3?1:.5); add({act:'pub',seat:q,n:0,swap:0},`🔎 공개 조사 ${nm(m.al[q])}·${nm(m.al[(q+1)%n])}`,1,0,null,info); add({act:'priv',seat:q,n:0,swap:0},`🕶️ 비밀 조사 ${nm(m.al[q])}·${nm(m.al[(q+1)%n])}`,2,0,null,info*1.3); }
  add({act:'rot1',seat:0,n:0,swap:0},'↻ 1칸 회전',3,1,null,0); add({act:'rot2',seat:0,n:0,swap:0},'↻ 2칸 회전',4,2,null,0);
  { const P0=rrSeatP(N,m,i,0,null), cand=[sx,(sx-1+n)%n].map(q=>({q,gain:P0[sx]-P0[q===sx?(sx+1)%n:q]})).sort((a,b)=>b.gain-a.gain)[0];
    for(const k of [1,2,3]){ const done=m.man[i]+k>=6; if(done&&cand.gain<.15) continue; if(!done&&!(p0>=.25&&c-k>=6-m.man[i]-k)) { if(!(p0<.15&&zero+1<need0)) continue; }
      add({act:'man',seat:0,n:k,swap:cand.q},`🛠️ 조작 적립 ${k}${done?` → ${nm(m.al[cand.q])}·${nm(m.al[(cand.q+1)%n])} 약실 맞바꿈`:' (몰래 크레딧 털기·다음 조작 준비)'}`,k,0,done?cand.q:null,0); } }
  return opts.sort((a,b)=>b.sc-a.sc).filter((o,k,A)=>A.findIndex(x=>x.label===o.label)===k).slice(0,7); }
NAT.rouletteai={ maxH:12, title:'러시안 룰렛', emoji:'🔫', tagline:'총알이 어디 있는지 알아내고, 총구를 남에게 돌려라',
  rule:'원형 테이블, 자리마다 약실 하나. 총알은 <b>1발</b>(6명 이상이면 2발). 각자 크레딧 <b>16</b>(잔량은 나만). 차례마다 하나: <b>🔎 공개 조사 1</b>(붙은 두 자리 약실을 모두에게 공개) · <b>🕶️ 비밀 조사 2</b>(나만) · <b>↻ 1칸 회전 3 / 2칸 회전 4</b>(약실이 시계 방향으로 밀려 다른 자리를 겨눔) · <b>🛠️ 조작 적립 1~3</b>(몰래 모아 6이 되면 붙은 두 자리 약실을 맞바꿈). 크레딧이 0이면 자동 패스. <b>절반이 0이 되면 격발</b> — 총알이 겨눈 자리가 탈락. 🧩 피스 1개로 크레딧 +3(한 번). 🔗 수갑: 귓속말은 바로 옆자리끼리만.',
  start(s,al,kind){ const N=al.length, B=N>=6?2:1, cyl=Array(N).fill(0); for(const c of U.shuffle([...Array(N).keys()]).slice(0,B)) cyl[c]=1;
    const m={id:'rouletteai',kind:kind||s.phase,al:U.shuffle(al.slice()),N,B,cyl,rot:Math.random()*N|0,cr:{},man:{},pub:{},priv:{},used:{},turn:0,lead:0,t:0,ph:'turn',log:[],ready:{},fi:-1,hit:[]};
    m.al.forEach(x=>{ m.cr[x]=16; m.man[x]=0; m.priv[x]={}; }); m.z=0; m.z0=Math.ceil(N/2);
    sys(s,`🔫 ${this.kindName(m)} 「러시안 룰렛」 — 총알 ${B}발, 크레딧 16씩(잔량은 본인만). 조사로 총알 위치를 알아내고, 회전·조작으로 총구를 남에게! 절반이 크레딧을 다 쓰면 격발해요. 🔗 수갑 때문에 귓속말은 옆자리끼리만.`,'host');
    m.tdl=Date.now()+40000; this.skip(s,m); return m; },
  kindName(m){ return m.kind==='revival'?'🔥 패자부활전':m.kind==='match'?'메인 매치':'⛓️ 감옥 매치'; },
  tell(s,m,id){ if(m.hit.includes(id)) return 'sad'; if(m.ph!=='turn') return null; const p=this.pHit(m,id,0); if(p>=.5||(m.cr[id]<=3&&p>=.25)) return 'nerv'; if(p===0&&Object.keys(this.know(m,id)).length) return 'smug'; return null; },
  seatOf(m,id){ return m.al.indexOf(id); }, cham(m,seat){ return ((seat-m.rot)%m.N+m.N)%m.N; },
  near(m,a,b){ const N=m.N, i=m.al.indexOf(a), j=m.al.indexOf(b); return i>=0&&j>=0&&((i-j+N)%N===1||(j-i+N)%N===1); },
  dmOk(s,a,b){ const m=s.nm; return !(m.al.includes(a)&&m.al.includes(b))||this.near(m,a,b); },
  zero(m){ return m.al.filter(x=>m.cr[x]<=0).length; }, need0(m){ return Math.ceil(m.N/2); },
  know(m,id){ return Object.assign({},m.pub,id?m.priv[id]||{}:{}); },
  /* 내가 아는 것으로 본 약실 c의 총알 확률 */
  pB(m,id,c){ const K=this.know(m,id); if(c in K) return K[c]; const kb=Object.values(K).filter(x=>x===1).length, unk=m.N-Object.keys(K).length; return unk?Math.max(0,m.B-kb)/unk:0; },
  pHit(m,id,dr){ return this.pB(m,id,this.cham(Object.assign({},m,{rot:m.rot+(dr||0)}),this.seatOf(m,id))); },
  delay(s){ const m=s.nm; return m.ph==='fire'?1500:m.ph==='turn'&&!isHum(m.al[m.turn])?1100:900; }, ready(){ return true; },
  ani(s,m){ return m.al.filter(x=>!isHum(x)); }, hum(s,m){ return m.al.filter(isHum); },
  skip(s,m){ let g=0; while(m.cr[m.al[m.turn]]<=0&&g++<m.N) m.turn=(m.turn+1)%m.N; },
  tick(s){ const m=s.nm, now=Date.now();
    if(m.ph==='turn'){ if(this.zero(m)>=this.need0(m)) return this.fireStart(s,m); const i=m.al[m.turn];
      if(isHum(i)){ if(now>=m.tdl){ this.act(s,m,i,this.auto(m,i)); } return; }
      const K=this.know(m,i), N=m.N, sx=this.seatOf(m,i);
      const table=m.al.map((x,k)=>{ const c=this.cham(m,k); return `${k}번 자리 ${nm(x)}${x===i?'(너)':''} ← 약실 ${c}: ${c in K?(K[c]?'💥총알':'빈칸'):'모름'}`; }).join(' / '), O=rrPlan(s,m,i), keys=O.map(o=>o.label);
      const r=need(s,`${s.ep}:${m.kind}:rr:${m.t}:${i}`,()=>ask(s,i,`러시안 룰렛 — 네 차례(${m.t+1}번째 행동). 총알 ${m.B}발, ${N}자리. 지금 총구 기준 자리 표: ${table}. 네 자리 ${sx}번. 네가 아는 것으로 본 너의 피격 확률: 지금 ${(this.pHit(m,i,0)*100).toFixed(0)}% · 1칸 돌리면 ${(this.pHit(m,i,1)*100).toFixed(0)}% · 2칸 돌리면 ${(this.pHit(m,i,2)*100).toFixed(0)}%. 네 크레딧 ${m.cr[i]}, 조작 적립 ${m.man[i]}/6. 크레딧 0인 사람 ${this.zero(m)}명 — ${this.need0(m)}명이 되면 바로 격발(지금 위치 그대로). 남의 크레딧은 공개 행동으로만 짐작(조작 적립은 몰래라 모름). 행동(act) 하나: pub(1, seat=조사할 두 자리 중 앞 자리 번호 — seat와 seat+1), priv(2, 같은 방식, 결과는 너만), rot1(3), rot2(4), man(n=1~3 적립; 6이 되면 swap 자리와 swap+1 자리의 약실을 맞바꿈). 크레딧이 모자라는 행동은 못 한다. 끝날 때 총구가 어디를 향할지, 남들이 마지막에 돌릴 수 있는지(크레딧)를 따져라.
[처지] 지면(맞으면) ${m.kind==='revival'?'부활 실패':'유배'}. 크레딧 0인 사람 ${this.zero(m)}/${this.need0(m)}명 · 격발 임박도 ${O.length?Math.round(O[0].imm*100):0}%(낮으면 지금 피격 확률보다 마지막에 돌릴 크레딧을 남기는 게 중요).
[선택지 표 — 코드가 계산함: 행동 뒤 네 피격 확률·바로 격발되나·조사 정보·남는 크레딧·총구 방향(원한·강자 쪽 +, 연합·빚 −) → 점수. 높을수록 좋은 수]
${O.map(o=>`- ${o.label}: 피격 ${Math.round(o.ph*100)}%${o.fires?' · ⚠️ 이걸로 바로 격발':''} · 남는 크레딧 ${o.left}${Math.abs(o.aim)>=.1?` · 총구 ${o.aim>0?'미운 쪽':'아끼는 쪽'}`:''} → ${o.sc.toFixed(2)}`).join('\n')}
pick은 표의 이름 하나. say는 테이블 한마디(짧게, 없으면 "").`,rrSch(keys)));
      if(r===undefined&&now<m.tdl){ s.typing=i; return; } s.typing=null; if(r) memo(s,i,r);
      let a=r&&(O.find(o=>o.label===r.pick)||{}).a; if(!a||!this.okAct(m,i,a)) a=this.auto(m,i,s);
      const t=r&&shortSay(r.say,60); if(t) talk(s,i,t,null,'say'); this.act(s,m,i,a); return; }
    if(m.ph==='fire'){ m.fi++; if(m.fi>=m.N) return this.finish(s,m); const c=m.fi, seat=(c+m.rot)%m.N, id=m.al[seat];
      if(m.cyl[c]){ m.hit.push(id); beat(s,'hit',`💥 총알이 ${nm(id)}을(를) 향했다 (총구를 마지막으로 돌린 건 ${(()=>{ const L=m.log.filter(x=>x.act==='rot1'||x.act==='rot2').slice(-1)[0]; return L?nm(L.id):'아무도 없음'; })()})`,3,id); sys(s,`💥 ${m.fi+1}발째 — ${nm(id)}!`,'bad'); } else sys(s,`🔫 ${m.fi+1}발째 — ${nm(id)} …찰칵, 빈 약실`,''); return; }
    if(m.ph==='done'){ const H=this.hum(s,m); if(now>=m.until||(H.length&&H.every(h=>m.ready[h]))) this.finish(s,m); } },
  okAct(m,i,a){ if(!a) return false; const c=m.cr[i]; if(a.act==='man') return a.n>=1&&a.n<=3&&a.n<=c; if(!(a.act in RR_COST)||RR_COST[a.act]>c) return false; if(a.act==='pub'||a.act==='priv') return a.seat>=0&&a.seat<m.N; return true; },
  auto(m,i,s){ if(s){ const O=rrPlan(s,m,i); if(O.length){ const lg=trait(s,i,'logic'), near=O.filter(o=>O[0].sc-o.sc<=.15*(1.2-lg)); return U.pick(near).a; } }   /* 같은 표에서(사람 시간 초과 땐 s 없이 예전 규칙) */
    const c=m.cr[i], sx=this.seatOf(m,i), N=m.N, p0=this.pHit(m,i,0), K=this.know(m,i);
    const myC=this.cham(m,sx);
    if(!(myC in K)){ const s0=(sx-1+N)%N; return c>=1?{act:'pub',seat:sx,n:0,swap:0}:{act:'pub',seat:s0,n:0,swap:0}; }
    if(p0>=.5){ const p1=this.pHit(m,i,1), p2=this.pHit(m,i,2); if(c>=3&&p1<p0&&(p1<=p2||c<4)) return {act:'rot1',seat:0,n:0,swap:0}; if(c>=4&&p2<p0) return {act:'rot2',seat:0,n:0,swap:0};
      if(c>=1){ const nb=[(sx+1)%N,(sx-1+N)%N].find(q=>!(this.cham(m,q) in K)); if(nb!=null) return {act:'pub',seat:nb===(sx+1)%N?sx:nb,n:0,swap:0}; } }
    const unk=[...Array(N).keys()].find(q=>!(this.cham(m,q) in K)&&!(this.cham(m,(q+1)%N) in K));
    return {act:'pub',seat:unk!=null?unk:sx,n:0,swap:0}; },
  act(s,m,i,a){ const N=m.N; if(!this.okAct(m,i,a)) a=this.auto(m,i); if(!this.okAct(m,i,a)) a={act:'pub',seat:0,n:0,swap:0};
    const pair=q=>[q%N,(q+1)%N], nmS=q=>pair(q).map(k=>nm(m.al[k])).join('·');
    if(a.act==='pub'||a.act==='priv'){ m.cr[i]-=RR_COST[a.act]; const [x,y]=pair(a.seat), cx=this.cham(m,x), cy=this.cham(m,y);
      if(a.act==='pub'){ m.pub[cx]=m.cyl[cx]; m.pub[cy]=m.cyl[cy]; sys(s,`🔎 ${nm(i)} 공개 조사 — ${nm(m.al[x])} 자리 ${m.cyl[cx]?'💥':'⭕'} · ${nm(m.al[y])} 자리 ${m.cyl[cy]?'💥':'⭕'}`,''); }
      else { m.priv[i][cx]=m.cyl[cx]; m.priv[i][cy]=m.cyl[cy]; sys(s,`🕶️ ${nm(i)} 비밀 조사 — ${nmS(a.seat)} 자리를 몰래 봤어요`,''); } }
    else if(a.act==='rot1'||a.act==='rot2'){ const k=a.act==='rot1'?1:2; m.cr[i]-=RR_COST[a.act]; m.rot=(m.rot+k)%N; sys(s,`↻ ${nm(i)} 실린더 ${k}칸 회전 — 총구 👉 ${nm(m.al[m.rot])}`,'host'); }
    else if(a.act==='man'){ m.cr[i]-=a.n; m.man[i]+=a.n; sys(s,`🛠️ ${nm(i)} 조작 적립 (몰래 얼마인지는 비밀)`,'');
      if(m.man[i]>=6){ m.man[i]=0; const q=((a.swap|0)%N+N)%N, [x,y]=pair(q), cx=this.cham(m,x), cy=this.cham(m,y); [m.cyl[cx],m.cyl[cy]]=[m.cyl[cy],m.cyl[cx]];
        const sw=o=>{ const hx=cx in o, hy=cy in o, vx=o[cx], vy=o[cy]; delete o[cx]; delete o[cy]; if(hy) o[cx]=vy; if(hx) o[cy]=vx; }; sw(m.pub); for(const x_ of m.al) sw(m.priv[x_]);
        sys(s,`🛠️ ${nm(i)} 조작 성공! ${nmS(q)} 자리의 약실을 맞바꿨어요`,'host'); } }
    m.log.push({t:m.t,id:i,act:a.act,seat:a.seat}); m.t++; m.z=this.zero(m); m.turn=(m.turn+1)%N; this.skip(s,m); m.tdl=Date.now()+40000;
    if(this.zero(m)>=this.need0(m)) this.fireStart(s,m); },
  fireStart(s,m){ if(m.ph!=='turn') return; m.ph='fire'; m.fi=-1; sys(s,`🔫 크레딧 0인 사람이 ${this.zero(m)}명 — 격발합니다! 총구가 겨눈 ${nm(m.al[m.rot])}부터 시계 방향으로`,'host'); },
  rank(m){ return m.al.slice().sort((a,b)=>(m.hit.includes(a)?1:0)-(m.hit.includes(b)?1:0)||m.cr[b]-m.cr[a]||Math.random()-.5); },
  finish(s,m){ if(m.ph==='fire'){ m.ph='done'; m.until=Date.now()+(this.hum(s,m).length?8000:2500); m.ready={}; return; }
    const ids=this.rank(m); const sc={}; for(const x of m.al) sc[x]=m.hit.includes(x)?-1:m.cr[x];
    sys(s,'🔫 결과 — '+ids.map((x,k)=>`${k+1}위 ${nm(x)}${m.hit.includes(x)?' 💥':` (남은 크레딧 ${m.cr[x]})`}`).join(' · '),'host'); s.nm=null; announceMain(s,'rouletteai',ids,null,sc,'크레딧'); },
  apply(s,me,a){ const m=s.nm; if(!m.al.includes(me)) return '이번 게임 참가자가 아니에요';
    if(a.k==='piece'){ if(m.used[me]) return '피스는 한 판에 한 번만 써요'; const P=pl(s,me); if(!P||P.g<1) return '🧩 피스가 없어요'; if(m.ph!=='turn') return '지금은 못 써요'; P.g--; m.used[me]=1; m.cr[me]+=3; return null; }
    if(a.k==='act'){ if(m.ph!=='turn'||m.al[m.turn]!==me) return '내 차례가 아니에요'; const o={act:a.act,seat:a.seat|0,n:a.n|0,swap:a.swap|0}; if(!this.okAct(m,me,o)) return '크레딧이 모자라거나 고를 수 없는 행동이에요'; this.act(s,m,me,o); return null; }
    if(a.k==='ready'){ m.ready[me]=1; return null; }
    return '알 수 없는 동작'; },
  mask(v,me){ const m=v.nm; if(!m) return; const done=m.ph==='done'; if(!done){ m.cyl=m.cyl.map((x,c)=>m.fi>=c?x:null); }
    for(const x of m.al){ if(x!==me&&!done){ m.cr[x]=null; m.man[x]=null; m.priv[x]={}; } }
    m.spent={}; for(const L of m.log) if(L.act!=='man') m.spent[L.id]=(m.spent[L.id]||0)+(RR_COST[L.act]||0); },
  view(s,i){ const m=s.nm, K=this.know(m,i); const L=['[지금 게임: 🔫 러시안 룰렛] 원형 테이블, 자리마다 약실. 약실 c는 자리 (c+회전)%N을 겨눔. 차례마다: 공개 조사 1(붙은 두 자리, 모두 앎) / 비밀 조사 2(나만) / 1칸 회전 3 / 2칸 회전 4 / 조작 적립 1~3(몰래, 6이면 붙은 두 자리 약실 맞바꿈). 크레딧 16, 잔량은 본인만. 절반이 0이 되면 격발 — 총알이 겨눈 자리 탈락. 귓속말은 옆자리끼리만.'];
    L.push(`[자리·네가 아는 약실] `+m.al.map((x,k)=>{ const c=this.cham(m,k); return `${k}번 ${nm(x)}${x===i?'(너)':''}:${c in K?(K[c]?'💥':'빈칸'):'?'}`; }).join(', '));
    L.push(`[너] 크레딧 ${m.cr[i]} · 조작 ${m.man[i]}/6 · 지금 피격 확률 ${(this.pHit(m,i,0)*100).toFixed(0)}%`);
    const sp={}; for(const x of m.log) if(x.act!=='man') sp[x.id]=(sp[x.id]||0)+(RR_COST[x.act]||0); L.push('[공개 행동으로 쓴 크레딧(조작 적립은 모름)] '+m.al.map(x=>`${nm(x)} ${sp[x]||0}`).join(', '));
    return L.join('\n'); },
  board(v,me){ const m=v.nm, N=m.N, R=108, cx=150, cy=150, K=Object.assign({},m.pub,(m.priv&&m.priv[me])||{});
    let h='<div class="rr-wrap"><svg viewBox="0 0 300 300" class="rr-svg"><circle cx="150" cy="150" r="132" class="rr-table"/>';
    const ang=k=>-Math.PI/2+k*2*Math.PI/N;
    { const a=ang(m.rot); h+=`<line x1="${cx}" y1="${cy}" x2="${(cx+Math.cos(a)*62).toFixed(1)}" y2="${(cy+Math.sin(a)*62).toFixed(1)}" class="rr-muz"/>`; }
    h+=`<circle cx="${cx}" cy="${cy}" r="40" class="rr-cyl"/>`;
    for(let k=0;k<N;k++){ const c=this.cham(m,k), a=ang(k), x=cx+Math.cos(a)*30, y=cy+Math.sin(a)*30, kn=m.cyl[c]!=null?m.cyl[c]:K[c];
      h+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" class="rr-ch ${kn===1?'b':kn===0?'e':''}"/><text x="${x.toFixed(1)}" y="${(y+3.5).toFixed(1)}" class="rr-cht">${kn===1?'💥':kn===0?'':'?'}</text>`;
      const id=m.al[k], sx=cx+Math.cos(a)*R, sy=cy+Math.sin(a)*R, hit=m.hit.includes(id), cur=m.ph==='turn'&&m.turn===k;
      h+=`<g class="rr-seat ${id===me?'me':''} ${hit?'hit':''} ${cur?'cur':''}"><circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="24"/><text x="${sx.toFixed(1)}" y="${(sy-2).toFixed(1)}" class="e">${emo(id)}</text><text x="${sx.toFixed(1)}" y="${(sy+13).toFixed(1)}" class="d">${U.esc(nm(id))}</text></g>`; }
    h+='</svg>'+m.al.map((id,k)=>{ const a=ang(k), b=gaSay(v,id,id===me?'me':''); return b?`<div class="ga-bubat" style="left:${((cx+Math.cos(a)*R)/3).toFixed(1)}%;top:${((cy+Math.sin(a)*R-22)/3).toFixed(1)}%">${b}</div>`:''; }).join('')+'</div>'; return h; },
  card(v,me,out){ const m=v.nm, mine=m.al.includes(me)&&(!out||v.phase==='revival'), cur=m.al[m.turn], my=m.ph==='turn'&&cur===me&&mine;
    let h=`<div class="vr-card ga rr">`+gaTop(`🔫 러시안 룰렛 · 총알 ${m.B}발 · 크레딧 바닥 ${m.z||0}/${m.z0}명 ${gaT(my?m.tdl:0)}`,this.rule);
    h+=this.board(v,me);
    h+='<div class="ga-strip">'+m.al.map(x=>`<span class="${x===me?'me':''} ${m.hit.includes(x)?'neg':''}">${emo(x)}<i>${U.esc(nm(x))}</i><b>${x===me||m.cr[x]!=null?m.cr[x]:'?'}</b><small>쓴 ${(m.spent||{})[x]||0}+</small></span>`).join('')+'</div>';
    if(m.log.length) h+='<div class="rr-log">'+m.log.slice(-4).map(L=>`<span>${emo(L.id)} ${RR_N[L.act]}</span>`).join('')+'</div>';
    if(my){ const c=m.cr[me], sx=this.seatOf(m,me), N=m.N, sel=gaSel('rr:'+m.t,null);
      const pairs=[...Array(N).keys()].map(q=>`<button class="ghost small ${sel==q?'on':''}" data-gsel="rr:${m.t}|${q}">${emo(m.al[q])}·${emo(m.al[(q+1)%N])}</button>`).join('');
      let b=`<div class="ga-lbl">조사할 두 자리</div><div class="ga-nums rr-pairs">${pairs}</div><div class="ga-btns">`;
      b+=gaB({k:'act',act:'pub',seat:sel==null?sx:+sel},'🔎 공개 조사 1',c>=1?'':'ghost dim')+gaB({k:'act',act:'priv',seat:sel==null?sx:+sel},'🕶️ 비밀 조사 2',c>=2?'ghost':'ghost dim')+gaB({k:'act',act:'rot1'},'↻1칸 3',c>=3?'ghost':'ghost dim')+gaB({k:'act',act:'rot2'},'↻2칸 4',c>=4?'ghost':'ghost dim')+'</div>';
      b+=`<div class="ga-btns">${[1,2,3].filter(n=>n<=c).map(n=>gaB({k:'act',act:'man',n,swap:sel==null?sx:+sel},`🛠️ 조작 +${n}`,'ghost')).join('')}${!m.used[me]&&(pl(v,me)||{}).g>0?gaB({k:'piece'},'🧩 피스 → 크레딧 +3','ghost'):''}</div>`;
      h+=gaDock(`내 차례 · 크레딧 <b>${c}</b> · 조작 ${m.man[me]}/6${m.man[me]?' (6이 되면 위에서 고른 두 자리 약실을 맞바꿈)':''} · 지금 피격 ${(this.pHit(m,me,0)*100).toFixed(0)}%`,b); }
    else if(mine&&m.ph==='turn') h+=gaDock(`크레딧 <b>${m.cr[me]}</b> · 조작 ${m.man[me]}/6`,gaWait(`${emo(cur)} ${U.esc(nm(cur))} 차례…`)+(!m.used[me]&&(pl(v,me)||{}).g>0?`<div class="ga-btns">${gaB({k:'piece'},'🧩 피스 → 크레딧 +3','ghost')}</div>`:''));
    else if(mine&&m.ph==='fire') h+=gaDock('',gaWait('🔫 격발 중…'));
    else if(mine&&m.ph==='done') h+=gaDock('',m.ready[me]?gaWait('결과 기다리는 중…'):`<div class="ga-btns">${gaB({k:'ready'},'결과 보기 ▶')}</div>`);
    else if(!mine) h+=gaDock('',gaWait('👀 구경 중이에요'));
    return h+'</div>'; },
};

/* ───────── 🏮 등불 원정대 · AI판 (2026-11-12 사용자: "선과 악 빼고 다른 게임 — 아발론" → 같은 계열의 오리지널) ─────────
   🏮 수호대 vs 🌑 그림자(서로 앎). 🔦 등불지기(수호대 1명)는 처음부터 그림자 한 명만 앎.
   원정 5번: 대장이 원정대 N명 제안 → 모두 공개 찬반(과반 찬성이면 출발, 다섯 번 연속 부결이면 그림자 승) → 원정대원은 몰래 🕯️ 밝힘/💨 꺼뜨림(수호대는 밝힘만).
   💨이 하나라도 있으면 실패(7명 이상 4번째 원정은 둘 필요) — 몇 장인지만 공개. 3번 먼저 성공하면 수호대, 3번 실패하면 그림자 승. */
const LT_SH={5:2,6:2,7:2,8:3,9:3,10:3,11:4,12:4};   /* 컴퓨터끼리 시뮬로 맞춤 — 2026-11-12 수호대가 투표 패턴을 읽게 된 뒤 원정대 크기로 다시 맞춤(그림자 승률 5명 30%·6명 43%·7명 35%·8명 47%·9명 39%·10명 39%, AI 끔) */
const LT_TS={5:[3,3,3,3,3],6:[3,4,4,4,4],7:[3,4,5,5,5],8:[2,3,3,4,4],9:[3,3,4,4,5],10:[3,4,4,4,5],11:[3,4,4,5,5],12:[3,4,4,5,5]};   /* 5명은 마지막 원정이 4명이면 거의 늘 그림자가 껴서(55%) 전부 3명 */
const LT_PRO={type:'object',properties:{team:{type:'array',items:{type:'string'}},say:{type:'string'},memo:{type:'string'}},required:['team','say','memo'],additionalProperties:false};
const LT_VOTE={type:'object',properties:{yes:{type:'boolean'},say:{type:'string'},memo:{type:'string'}},required:['yes','say','memo'],additionalProperties:false};
const LT_CARD={type:'object',properties:{fail:{type:'boolean'},memo:{type:'string'}},required:['fail','memo'],additionalProperties:false};
NAT.lanternai={ maxH:12, minP:5, title:'등불 원정대', emoji:'🏮', tagline:'원정대를 뽑고, 찬반을 정하고 — 누가 몰래 등불을 끄는가',
  rule:'🏮 수호대와 🌑 그림자(그림자끼리는 서로 알아요). 🔦 <b>등불지기</b>(수호대 한 명)는 그림자 <b>한 명만</b> 알아요. 원정 5번: 대장이 원정대를 제안 → 모두 <b>공개 찬반</b>(과반 찬성이면 출발, <b>다섯 번 연속 부결</b>이면 그림자 승) → 원정대원은 몰래 🕯️ 밝힘 / 💨 꺼뜨림(수호대는 밝힘만). 💨이 하나라도 있으면 실패(7명 이상 4번째 원정은 둘 필요) — <b>몇 장인지만</b> 공개돼요. 3번 먼저 성공하면 수호대, 3번 실패하면 그림자 승리.',
  start(s,al){ const N=al.length, ids=U.shuffle(al.slice()), k=(window.__LT&&window.__LT.sh)||LT_SH[N]||Math.max(1,Math.round(N/3));   /* window.__LT: local/duel-test.js의 ltBal 밸런스 시험용(평소 null) */ const sh=U.shuffle(ids.slice()).slice(0,k); const role={}; ids.forEach(x=>role[x]=sh.includes(x)?'s':'g');
    const gs=ids.filter(x=>role[x]==='g'), keeper=U.pick(gs), known=U.pick(sh);
    const m={id:'lanternai',al:ids,N,role,keeper,known,r:0,pi:0,lead:Math.random()*N|0,rej:0,res:[],hist:[],props:[],ph:'propose',team:[],draft:[],votes:{},cards:{},plan:{},ready:{},until:0,dl:0};
    sys(s,`🏮 제${s.ep}회 메인 매치 「등불 원정대」 — 🏮 수호대 ${N-k}명 · 🌑 그림자 ${k}명. 원정 5번 중 3번 먼저! 대장이 원정대를 고르면 모두 공개로 찬반, 원정대원은 몰래 등불을 밝히거나 꺼요. 🔦 등불지기는 그림자 한 명을 알고 있어요.`,'host');
    for(const h of ids.filter(isHum)) s.chat.push({r:s.ep,note:1,secret:1,to:[h],kind:'host',text:role[h]==='s'?`🌑 (나만 보임) 당신은 그림자예요. 동료 그림자: ${sh.filter(x=>x!==h).map(nm).join('·')||'없음'} — 원정에서 몰래 등불을 꺼서 3번 실패시키세요.`:h===keeper?`🔦 (나만 보임) 당신은 등불지기예요. ${nm(known)}은(는) 그림자예요 — 너무 티 나지 않게 원정대를 지키세요.`:'🏮 (나만 보임) 당신은 수호대예요. 원정 3번을 성공시키세요.'});
    this.propose(s,m); return m; },
  size(m){ return ((window.__LT&&window.__LT.ts)||LT_TS[m.N]||LT_TS[Math.min(12,Math.max(5,m.N))])[m.r]; }, need2(m){ return m.N>=7&&m.r===3; },
  leader(m){ return m.al[m.lead%m.N]; },
  propose(s,m){ m.ph='propose'; m.team=[]; m.draft=[]; m.votes={}; m.cards={}; m.plan={}; m.ready={}; m.dl=Date.now()+70000; m.pitch=0;
    if(m.hist.length&&aiOn()){ const L=this.leader(m), A=U.shuffle(this.ani(s,m).filter(x=>x!==L)).slice(0,m.pi===0?2:1); m.pitch=Date.now()+(A.length?7000:0);
      for(const a of A) s.aq.push({k:'say',i:a,model:'haiku',task:`등불 원정대 — 원정 ${m.r+1} 원정대를 고르기 전 토론이다(대장 ${nm(L)}). 지난 원정 구성·꺼뜨림 장수·투표·표정을 근거로 누가 수상한지 짚거나, 대장에게 누구를 넣고 빼라고 제안해라. 그림자라면 수호대인 척 다른 사람에게 의심을 돌려라(동료 그림자를 대놓고 감싸면 들킨다). 근거 한 가지를 붙여 짧게. to는 말 거는 상대.`}); }
    sys(s,`🏮 원정 ${m.r+1}/5 — 대장 ${nm(this.leader(m))}이(가) 원정대 ${this.size(m)}명을 골라요${this.need2(m)?' (이번 원정은 💨 두 장이어야 실패)':''} · 부결 ${m.rej}/5`,'host'); },
  delay(s){ const m=s.nm; return m.ph==='vres'||m.ph==='reveal'?900:1100; }, ready(){ return true; },
  ani(s,m){ return m.al.filter(x=>!isHum(x)); }, hum(s,m){ return m.al.filter(isHum); },
  /* 🧮 그림자 조합을 전부 따져 본 확률 (i 시점) — 원정 결과(꺼뜨림 장수)와 맞는 조합만, 끄지 않은 그림자는 드묾(0.35배) */
  combos(s,m,i){ const k=LT_SH[m.N]||Math.max(1,Math.round(m.N/3)), me_s=m.role[i]==='s';
    if(me_s){ const sh=m.al.filter(x=>m.role[x]==='s'); return [{c:sh,w:1}]; }
    const C=m.al.filter(x=>x!==i), out=[]; const go=(st,acc)=>{ if(acc.length===k){ out.push(acc.slice()); return; } for(let q=st;q<C.length;q++){ if(C.length-q<k-acc.length) break; acc.push(C[q]); go(q+1,acc); acc.pop(); } }; go(0,[]);
    const R=[]; for(const c of out){ if(i===m.keeper&&!c.includes(m.known)) continue; let w=1; for(const H of m.hist){ if(H.kind!=='mission') continue; const n=H.team.filter(x=>c.includes(x)).length; if(n<H.fails){ w=0; break; } w*=Math.pow(.35,n-H.fails); } if(w>0) R.push({c,w}); } return R.length?R:out.map(c=>({c,w:1})); },
  probs(s,m,i){ const R=this.combos(s,m,i), tot=R.reduce((t,x)=>t+x.w,0)||1, P={}; for(const x of m.al) P[x]=0; for(const r of R) for(const x of r.c) P[x]+=r.w/tot; return P; },
  cleanP(s,m,i,T){ const R=this.combos(s,m,i), tot=R.reduce((t,x)=>t+x.w,0)||1; return R.filter(r=>!T.some(x=>r.c.includes(x))).reduce((t,x)=>t+x.w,0)/tot; },
  /* 🧮 의심 점수 = 그림자 확률×3 + 표정 (i 시점) */
  /* 🧠 투표 패턴(룰 3·17): 실패한 원정대에 밖에서 찬성했던 사람, 성공한 원정대에 반대했던 사람은 조금 더 의심. 관계(룰 14): 못 믿는 사람·원한 있는 사람은 조금 더 의심(사람다운 편향) */
  patt(m,x){ let v=0; for(const H of m.hist){ if(H.kind!=='mission'||!H.votes) continue; if(H.fail&&H.votes[x]&&!H.team.includes(x)) v+=.3; if(!H.fail&&H.votes[x]===false) v+=.12; } return v; },
  sus(s,m,i){ const Pp=this.probs(s,m,i), S={}; for(const x of m.al) if(x!==i) S[x]=Pp[x]*3+faceDoubt(s,i,x)*1.2+this.patt(m,x)-BX(s,i,x).t*.3+BX(s,i,x).g*.2; if(i===m.keeper) S[m.known]=9; if(m.role[i]==='s') for(const x of m.al) if(x!==i&&m.role[x]==='s') S[x]=-9; return S; },
  susLine(s,m,i){ const S=this.sus(s,m,i); return Object.entries(S).sort((a,b)=>b[1]-a[1]).map(([x,v])=>`${nm(x)} ${v>=9?'그림자(확실)':v<=-9?'동료 그림자':Math.round(Math.min(1,v/3)*100)+'%'}`).join(', '); },
  autoTeam(s,m,i){ const n=this.size(m), S=this.sus(s,m,i); let L=m.al.filter(x=>x!==i).sort((a,b)=>S[a]-S[b]+(Math.random()-.5)*.3);
    if(m.role[i]==='s'){ const g=L.filter(x=>m.role[x]==='g'), sh=L.filter(x=>m.role[x]==='s'), fl=m.res.filter(x=>x==='fail').length, behind=m.r>=2&&fl<m.r-1; L=(n>=4&&(behind||Math.random()<.2+trait(s,i,'bluff')*.25)?sh.slice(0,1):[]).concat(g); }   /* 그림자가 밀리면 동료를 넣어 확실히 끄기 */
    return [i].concat(L).slice(0,n); },
  autoVote(s,m,i){ const T=m.team, S=this.sus(s,m,i);
    if(m.role[i]==='s'){ if(m.rej>=4) return false; if(T.some(x=>m.role[x]==='s')) return T.includes(i)||m.rej>=3||Math.random()<.7; return Math.random()<.2; }   /* 밖에 있는 그림자가 동료 낀 원정대에 늘 찬성하면 투표 패턴으로 들킴 — 가끔(30%) 반대해 흐림 */   /* 한 번만 더 부결되면 그림자 승 — 무조건 반대(예전엔 50% 찬성). 깨끗한 원정대엔 의심 피하려 가끔(20%) 찬성 */
    if(m.rej>=4) return true; if(i===m.keeper&&T.includes(m.known)) return false;
    { const best=this.cleanP(s,m,i,this.autoTeam(s,m,i)), cp=this.cleanP(s,m,i,T); return cp>=best*(m.rej>=3?.45:.8)-1e-9; }
    const worst=Math.max(...T.filter(x=>x!==i).map(x=>S[x]||0),0), lim=m.rej>=3?1.2:.35; if(!m.hist.length) return T.includes(i)||Math.random()<.55; return worst<(T.includes(i)?lim+.25:lim); },
  autoCard(s,m,i){ if(m.role[i]!=='s') return false; const shT=m.team.filter(x=>m.role[x]==='s'), fl=m.res.filter(x=>x==='fail').length, ok=m.res.filter(x=>x==='ok').length; if(this.need2(m)) return true;
    if(fl>=2||ok>=2) return shT[0]===i;   /* 한 번 더 끄면 승리 / 한 번 더 켜지면 패배 — 동료와 겹치지 않게 첫 번째만 확실히 끔 */
    if(shT.length>1&&shT[0]!==i) return false;   /* 둘이 같이 끄면 둘 다 들킴 — 첫 번째 그림자에게 맡김 */
    if(m.r===0&&Math.random()<trait(s,i,'bluff')*.6) return false;   /* 첫 원정은 신뢰 쌓기(허세 많을수록) */
    return true; },
  tick(s){ const m=s.nm, now=Date.now(), H=this.hum(s,m);
    if(m.ph==='propose'){ const L=this.leader(m);
      if(isHum(L)){ if(now>=m.dl){ const T=m.draft.length===this.size(m)?m.draft.slice():this.autoTeam(s,m,L); this.setTeam(s,m,L,T,''); } return; }
      if(m.pitch&&now<m.pitch){ s.typing=L; return; }
      const r=need(s,`${s.ep}:lt:p:${m.r}:${m.pi}`,()=>ask(s,L,`등불 원정대 — 원정 ${m.r+1}/5, 너는 대장이다. 원정대 ${this.size(m)}명을 골라라(team: 이름 배열, 너 포함 가능). 부결 ${m.rej}/5(5면 그림자 승). [의심 점수 — 공개 기록으로 계산] ${this.susLine(s,m,L)}. ${m.role[L]==='s'?'너는 그림자다 — 그림자를 한 명 넣어 실패시킬지, 깨끗해 보이게 수호대만 넣어 신뢰를 쌓을지 판세로 정하라. 동료 그림자를 너무 감싸면 들킨다.':L===m.keeper?`너는 등불지기다 — ${nm(m.known)}이(가) 그림자인 걸 안다. 빼되, 너무 티 나면 그림자가 너를 노린다.`:'너는 수호대다 — 의심 점수 낮은 사람 위주로.'} 방금 테이블 토론(누가 누구를 의심·추천했는지)도 반영하라 — 따를지, 함정으로 볼지는 네 판단. say에 고른 이유 한마디(근거 짧게), memo에 속셈.${recentTable(s,6)}`,LT_PRO));
      if(r===undefined&&now<m.dl-55000){ s.typing=L; return; } s.typing=null; if(r) memo(s,L,r);
      let T=r&&Array.isArray(r.team)?[...new Set(r.team.map(x=>idOf(s,x)).filter(x=>x&&m.al.includes(x)))]:[]; if(T.length!==this.size(m)) T=this.autoTeam(s,m,L);
      this.setTeam(s,m,L,T,r?shortSay(r.say,90):''); return; }
    if(m.ph==='vote'){ for(const i of this.ani(s,m)){ if(m.votes[i]!=null) continue;
        const r=need(s,`${s.ep}:lt:v:${m.r}:${m.pi}:${i}`,()=>ask(s,i,`등불 원정대 — 원정 ${m.r+1}/5 원정대 제안: ${m.team.map(nm).join('·')} (대장 ${nm(this.leader(m))}). 찬성(yes:true)/반대를 정해라. 부결 ${m.rej}/5 — 이번까지 부결되면 ${m.rej>=4?'그림자가 이긴다!':'다음 대장으로 넘어간다'}. [의심 점수] ${this.susLine(s,m,i)}. ${m.role[i]==='s'?'너는 그림자다(동료: '+m.al.filter(x=>m.role[x]==='s'&&x!==i).map(nm).join('·')+') — 그림자가 들어간 원정대는 통과시키고 싶지만, 투표는 공개라 패턴이 남는다.':i===m.keeper?`너는 등불지기다 — ${nm(m.known)}은(는) 그림자다.`:'너는 수호대다.'} say는 대부분 "", 할 말이 있을 때만 짧게.`,LT_VOTE,'haiku'));
        if(r===undefined&&now<m.dl){ continue; } if(r) memo(s,i,r); m.votes[i]=r?!!r.yes:this.autoVote(s,m,i); m.vsay=m.vsay||{}; if(r&&r.say&&Math.random()<.4) m.vsay[i]=shortSay(r.say,60); return; }
      if(this.ani(s,m).every(i=>m.votes[i]!=null)&&(H.every(h=>m.votes[h]!=null)||now>=m.dl)){ for(const h of H) if(m.votes[h]==null) m.votes[h]=true; this.tally(s,m); } return; }
    if(m.ph==='vres'){ if(now>=m.until) this.afterVote(s,m); return; }
    if(m.ph==='mission'){ for(const i of m.team.filter(x=>!isHum(x))){ if(m.cards[i]!=null) continue;
        if(m.role[i]!=='s'){ m.cards[i]=false; continue; }
        const r=need(s,`${s.ep}:lt:c:${m.r}:${i}`,()=>ask(s,i,`등불 원정대 — 원정 ${m.r+1}/5. 너는 그림자이고 원정대에 들어왔다(원정대: ${m.team.map(nm).join('·')}, 동료 그림자 중 이번 원정대: ${m.team.filter(x=>m.role[x]==='s'&&x!==i).map(nm).join('·')||'없음'}). 💨 꺼뜨릴지(fail:true) 🕯️ 밝힐지 정해라. ${this.need2(m)?'이번 원정은 💨 두 장이어야 실패.':'💨 한 장이면 실패, 몇 장인지는 공개되니 둘이 같이 끄면 둘 다 의심받는다.'}${(()=>{ const shT=m.team.filter(x=>m.role[x]==='s'); return shT.length>1&&!this.need2(m)?` 그림자끼리 약속: 원정대 순서상 앞인 ${nm(shT[0])}이(가) 끄고 다른 쪽은 밝힌다 — ${shT[0]===i?'너는 끄는 쪽이다':'너는 밝히는 쪽이다(실패는 동료 몫)'}.`:''; })()} 지금까지 ${m.res.filter(x=>x==='ok').length}성공 ${m.res.filter(x=>x==='fail').length}실패. 일부러 한 번 밝혀 신뢰를 사는 수도 있다. memo에 이유.`,LT_CARD,'haiku'));
        if(r===undefined&&now<m.dl) continue; if(r) memo(s,i,r); m.cards[i]=r?!!r.fail:this.autoCard(s,m,i); }
      if(m.team.every(x=>m.cards[x]!=null)||now>=m.dl){ for(const x of m.team) if(m.cards[x]==null) m.cards[x]=false; this.reveal(s,m); } return; }
    if(m.ph==='reveal'){ if(now>=m.until||(H.length&&H.every(h=>m.ready[h]))) this.next(s,m); return; } },
  setTeam(s,m,L,T,say){ m.team=T; m.ph='vote'; m.dl=Date.now()+35000; m.vsay={};
    if(say) talk(s,L,say,null,'say'); sys(s,`🏮 ${nm(L)}의 원정대: ${T.map(nm).join(' · ')} — 찬성? 반대?`,'host'); },
  tally(s,m){ const y=m.al.filter(x=>m.votes[x]), ok=y.length*2>m.N; const P_={r:m.r,pi:m.pi,leader:this.leader(m),team:m.team.slice(),votes:Object.assign({},m.votes),ok}; m.props.push(P_);
    sys(s,`🗳️ 찬성 ${y.length} · 반대 ${m.N-y.length} — ${ok?'출발!':'부결'} (찬성: ${y.map(nm).join('·')||'없음'})`,ok?'win':'bad');
    for(const x in (m.vsay||{})) talk(s,x,m.vsay[x],null,'say');
    m.ph='vres'; m.until=Date.now()+3600; m.lastOk=ok; },
  afterVote(s,m){ m.pi++; if(m.lastOk){ m.rej=0; m.ph='mission'; m.cards={}; m.dl=Date.now()+30000; sys(s,`🏮 원정대 출발 — ${m.team.map(nm).join('·')}은(는) 몰래 등불을 밝히거나 꺼요`,'host'); return; }
    m.rej++; m.lead++; if(m.rej>=5){ sys(s,'🌑 다섯 번 연속 부결 — 원정이 무너졌어요. 그림자 승리!','bad'); return this.finish(s,m,'s'); } this.propose(s,m); },
  reveal(s,m){ const f=m.team.filter(x=>m.cards[x]).length, fail=f>=(this.need2(m)?2:1); m.res.push(fail?'fail':'ok'); beat(s,'fail',`원정 ${m.r+1} ${fail?`실패(💨 ${f}장)`:'성공'} — 원정대 ${m.team.map(nm).join('·')}`,fail?1.6:.7);
    const P_=m.props[m.props.length-1]; m.hist.push({kind:'mission',r:m.r,team:m.team.slice(),fails:f,fail,leader:P_?P_.leader:null,votes:P_?P_.votes:{}}); for(const p of m.props) if(p.ok===false&&p.later==null) p.later=fail?'fail':'ok';
    sys(s,`${fail?'💨':'🕯️'} 원정 ${m.r+1} ${fail?'실패':'성공'} — 💨 ${f}장 (${m.res.map(x=>x==='ok'?'🕯️':'💨').join('')})`,fail?'bad':'win');
    m.ph='reveal'; m.ready={}; m.until=Date.now()+(this.hum(s,m).length?14000:4000);
    const A=U.shuffle(this.ani(s,m)); const tellers=A.filter(x=>m.team.includes(x)).slice(0,1).concat(A.filter(x=>!m.team.includes(x)).slice(0,fail?1:0));
    for(const a of tellers) s.aq.push({k:'say',i:a,model:'haiku',task:`등불 원정대 — 원정 ${m.r+1} ${fail?`실패(💨 ${f}장)`:'성공'}. 원정대: ${m.team.map(nm).join('·')}${m.team.includes(a)?' (너도 있었다)':''}. ${fail?'누가 껐는지 근거(원정대 구성·투표·표정)를 대며 의심하거나, 네가 의심받으면 해명. 그림자라면 수호대인 척.':'믿을 만한 사람이 생겼는지 짧게.'} 짧게.`,fb:fail?['누가 껐어요?','이상하다…']:['좋아요 하나 성공','오 깔끔']});
    const sc=m.res.filter(x=>x==='ok').length, fc=m.res.filter(x=>x==='fail').length; if(sc>=3) m.win='g'; else if(fc>=3) m.win='s'; },
  next(s,m){ if(m.win) return this.finish(s,m,m.win); m.r++; m.lead++; this.propose(s,m); },
  finish(s,m,w){ if(m.done) return; m.done=1; const win=m.al.filter(x=>m.role[x]===w), lose=m.al.filter(x=>m.role[x]!==w);
    sys(s,`${w==='g'?'🏮 수호대':'🌑 그림자'} 승리! 그림자는 ${m.al.filter(x=>m.role[x]==='s').map(nm).join('·')}, 🔦 등불지기는 ${nm(m.keeper)}였어요`,'win');
    for(const x of m.al) for(const y of m.al) if(x!==y&&!isHum(x)&&m.role[x]==='s'&&m.role[y]==='s') addRel(s,x,y,.15);
    s.nm=null; announceMain(s,'lanternai',win.concat(U.shuffle(lose)),win); },
  apply(s,me,a){ const m=s.nm; if(!m.al.includes(me)) return '이번 게임 참가자가 아니에요';
    if(a.k==='tog'){ if(m.ph!=='propose'||this.leader(m)!==me) return '대장만 고를 수 있어요'; if(!m.al.includes(a.t)) return '자리를 고르세요'; const k=m.draft.indexOf(a.t); if(k>=0) m.draft.splice(k,1); else { if(m.draft.length>=this.size(m)) return `원정대는 ${this.size(m)}명이에요`; m.draft.push(a.t); } return null; }
    if(a.k==='prop'){ if(m.ph!=='propose'||this.leader(m)!==me) return '대장만 제안해요'; if(m.draft.length!==this.size(m)) return `${this.size(m)}명을 골라 주세요`; this.setTeam(s,m,me,m.draft.slice(),''); return null; }
    if(a.k==='vote'){ if(m.ph!=='vote') return '지금은 투표 시간이 아니에요'; if(m.votes[me]!=null) return '이미 투표했어요'; m.votes[me]=!!a.yes; return null; }
    if(a.k==='card'){ if(m.ph!=='mission'||!m.team.includes(me)) return '원정대원만 내요'; if(m.cards[me]!=null) return '이미 냈어요'; if(a.fail&&m.role[me]!=='s') return '수호대는 등불을 밝힐 수만 있어요'; m.cards[me]=!!a.fail; return null; }
    if(a.k==='ready'){ m.ready[me]=1; return null; }
    return '알 수 없는 동작'; },
  mask(v,me){ const m=v.nm; if(!m) return; const done=!!m.done; const myR=m.role[me];
    if(!done){ const R={}; for(const x of m.al){ if(x===me) R[x]=myR; else if(myR==='s'&&m.role[x]==='s') R[x]='s'; else if(me===m.keeper&&x===m.known) R[x]='s'; } m.role=R; if(me!==m.keeper){ m.known=null; } m.keeper=me===m.keeper?me:null; }
    if(m.ph==='vote'){ m.voted=Object.keys(m.votes); m.votes=m.votes[me]!=null?{[me]:m.votes[me]}:{}; }
    if(m.ph==='mission'){ m.carded=Object.keys(m.cards); m.cards=m.cards[me]!=null?{[me]:m.cards[me]}:{}; } else if(!done) m.cards={}; delete m.vsay; },
  view(s,i){ const m=s.nm; const L=['[지금 게임: 🏮 등불 원정대] 수호대 vs 그림자(그림자끼리 서로 앎). 등불지기(수호대 1명)는 그림자 한 명만 앎. 원정 5번: 대장이 원정대 제안 → 모두 공개 찬반(과반 찬성이면 출발, 5번 연속 부결이면 그림자 승) → 원정대원은 몰래 밝힘/꺼뜨림(수호대는 밝힘만). 꺼뜨림이 하나라도 있으면 실패(7명 이상 4번째 원정은 둘), 장수만 공개. 3번 먼저 성공 수호대, 3번 실패 그림자.'];
    L.push(`[너의 정체 — 비밀] ${m.role[i]==='s'?`🌑 그림자. 동료: ${m.al.filter(x=>m.role[x]==='s'&&x!==i).map(nm).join('·')}`:i===m.keeper?`🔦 등불지기(수호대). ${nm(m.known)}은(는) 그림자다`:'🏮 수호대'}`);
    L.push(`[지금] 원정 ${m.r+1}/5 · ${{propose:'대장이 원정대 고르는 중',vote:'찬반 투표 중',vres:'투표 결과',mission:'원정 중',reveal:'원정 결과'}[m.ph]} · 대장 ${nm(this.leader(m))} · 원정대 ${this.size(m)}명 · 부결 ${m.rej}/5 · 결과 ${m.res.map(x=>x==='ok'?'성공':'실패').join(',')||'아직'}`);
    if(m.team.length) L.push(`[이번 원정대] ${m.team.map(nm).join('·')}`);
    if(m.props.length) L.push('[지난 제안·투표 (공개)]\n'+m.props.slice(-8).map(p=>`원정${p.r+1} 대장 ${nm(p.leader)}: ${p.team.map(nm).join('·')} → ${p.ok?'출발':'부결'} (찬성 ${m.al.filter(x=>p.votes[x]).map(nm).join('·')||'없음'})`).join('\n'));
    if(m.hist.length) L.push('[원정 결과] '+m.hist.map(h=>`원정${h.r+1} ${h.team.map(nm).join('·')} → ${h.fail?'실패':'성공'}(꺼뜨림 ${h.fails}장)`).join(' / '));
    L.push('[의심 점수 — 공개 기록·표정으로 계산, 높을수록 그림자 같음] '+this.susLine(s,m,i));
    return L.join('\n'); },
  tell(s,m,id){ if(m.ph==='mission'&&m.team.includes(id)&&m.role[id]==='s') return 'sweat'; if(m.ph==='vote'&&m.team.includes(id)&&m.role[id]==='s') return 'nerv'; if(m.ph==='propose'&&this.leader(m)===id) return 'think'; const H=m.hist[m.hist.length-1]; if(m.ph==='reveal'&&H&&H.fail&&H.team.includes(id)) return m.role[id]==='s'?'smug':'angry'; return null; },
  board(v,me,click){ const m=v.nm, N=m.N, R=108, cx=150, cy=150, ang=k=>-Math.PI/2+k*2*Math.PI/N, L=this.leader(m), T=m.ph==='propose'?m.draft:m.team, P_=m.props[m.props.length-1], showV=m.ph==='vres'||(m.ph!=='vote'&&P_&&P_.r===m.r&&P_.pi===m.pi-1);
    let h=`<div class="lt-wrap"><svg viewBox="0 0 300 300" class="lt-svg"><circle cx="150" cy="150" r="134" class="lt-table"/>`;
    const n5=m.res.length; for(let k=0;k<5;k++){ const x=cx-60+k*30, y=cy-8, r_=m.res[k]; h+=`<circle cx="${x}" cy="${y}" r="12" class="lt-q ${r_||''} ${k===m.r&&!m.done?'cur':''}"/><text x="${x}" y="${y+4}" class="lt-qt">${r_==='ok'?'🕯️':r_==='fail'?'💨':(LT_TS[N]||LT_TS[Math.min(12,Math.max(5,N))])[k]+(N>=7&&k===3?'*':'')}</text>`; }
    h+=`<text x="${cx}" y="${cy+22}" class="lt-rej">부결 ${'●'.repeat(m.rej)}${'○'.repeat(5-m.rej)}</text>`;
    for(let k=0;k<N;k++){ const id=m.al[k], a=ang(k), sx=cx+Math.cos(a)*R, sy=cy+Math.sin(a)*R, inT=T.includes(id), rr=m.role[id], vt=showV&&P_?P_.votes[id]:null, did=(m.voted||[]).includes(id)||(m.carded||[]).includes(id);
      h+=`<g class="lt-seat ${id===me?'me':''} ${inT?'on':''} ${rr==='s'&&id!==me?'shadow':''} ${click&&!(m.draft.length>=this.size(m)&&!inT)?'click':''}" ${click?`data-nm='${JSON.stringify({k:'tog',t:id})}'`:''}><circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="24"/><text x="${sx.toFixed(1)}" y="${(sy-2).toFixed(1)}" class="e">${emo(id)}</text><text x="${sx.toFixed(1)}" y="${(sy+13).toFixed(1)}" class="d">${U.esc(nm(id))}</text>`
        +(id===L?`<text x="${(sx-17).toFixed(1)}" y="${(sy-16).toFixed(1)}" class="b">👑</text>`:'')+(inT?`<text x="${(sx+17).toFixed(1)}" y="${(sy-16).toFixed(1)}" class="b">🏮</text>`:'')
        +(rr==='s'&&id!==me?`<text x="${(sx+18).toFixed(1)}" y="${(sy+20).toFixed(1)}" class="b">🌑</text>`:'')+(vt!=null?`<text x="${(sx-18).toFixed(1)}" y="${(sy+20).toFixed(1)}" class="b">${vt?'✅':'❌'}</text>`:did?`<text x="${(sx-18).toFixed(1)}" y="${(sy+20).toFixed(1)}" class="b">✓</text>`:'')
        +(v.face&&v.face[id]?`<text x="${(sx+13).toFixed(1)}" y="${(sy-2).toFixed(1)}" class="b">${FACE[v.face[id].k][0]}</text>`:'')+'</g>'; }
    h+='</svg>'+m.al.map((id,k)=>{ const a=ang(k), b=gaSay(v,id,id===me?'me':''); return b?`<div class="ga-bubat" style="left:${((cx+Math.cos(a)*R)/3).toFixed(1)}%;top:${((cy+Math.sin(a)*R-22)/3).toFixed(1)}%">${b}</div>`:''; }).join('')+'</div>'; return h; },
  card(v,me,out){ const m=v.nm, mine=m.al.includes(me)&&!out, L=this.leader(m), myR=m.role[me];
    let h=`<div class="vr-card ga lt">`+gaTop(`🏮 등불 원정대 · 원정 ${Math.min(5,m.r+1)}/5 · ${{propose:'👑 원정대 고르기',vote:'🗳️ 찬반',vres:'🗳️ 결과',mission:'🏮 원정 중',reveal:'📢 원정 결과'}[m.ph]} ${gaT(m.ph==='propose'&&L===me?m.dl:m.ph==='vote'||m.ph==='mission'?m.dl:0)}`,this.rule);
    if(mine) h+=`<div class="lt-me ${myR==='s'?'s':''}">${myR==='s'?`🌑 나는 그림자 — 동료 ${m.al.filter(x=>x!==me&&m.role[x]==='s').map(x=>emo(x)+U.esc(nm(x))).join(' ')||'없음'}`:m.keeper===me?`🔦 나는 등불지기 — ${emo(m.known)} ${U.esc(nm(m.known))}은(는) 그림자`:'🏮 나는 수호대'}</div>`;
    const click=mine&&m.ph==='propose'&&L===me; h+=this.board(v,me,click);
    if(click) h+=gaDock(`👑 내가 대장 — 원정대 <b>${this.size(m)}명</b>을 자리에서 눌러 고르세요 (${m.draft.length}/${this.size(m)})${this.need2(m)?' · 이번 원정은 💨 두 장이어야 실패':''}`,`<div class="ga-btns">${gaB({k:'prop'},'🏮 이 원정대로 제안',m.draft.length===this.size(m)?'':'ghost dim')}</div>`);
    else if(m.ph==='propose') h+=gaDock('',gaWait(`👑 ${emo(L)} ${U.esc(nm(L))}이(가) 원정대 ${this.size(m)}명을 고르는 중…`));
    else if(mine&&m.ph==='vote'&&m.votes[me]==null) h+=gaDock(`원정대 ${m.team.map(x=>emo(x)+U.esc(nm(x))).join(' ')} — 부결 ${m.rej}/5${m.rej>=4?' (이번에 부결되면 그림자 승!)':''}`,`<div class="ga-btns">${gaB({k:'vote',yes:true},'✅ 찬성')}${gaB({k:'vote',yes:false},'❌ 반대','ghost')}</div>`);
    else if(m.ph==='vote') h+=gaDock('',gaWait(`🗳️ 투표 중… ${(m.voted||[]).length}/${m.N}`));
    else if(mine&&m.ph==='mission'&&m.team.includes(me)&&m.cards[me]==null) h+=gaDock('🏮 원정 중 — 몰래 고르세요',`<div class="ga-btns">${gaB({k:'card',fail:false},'🕯️ 밝힘')}${myR==='s'?gaB({k:'card',fail:true},'💨 꺼뜨림','ghost bad'):''}</div>`);
    else if(m.ph==='mission') h+=gaDock('',gaWait(`🏮 원정대가 등불을 고르는 중… ${(m.carded||[]).length}/${m.team.length}`));
    else if(mine&&m.ph==='reveal') h+=gaDock('',m.ready[me]?gaWait('다음 원정 기다리는 중…'):`<div class="ga-btns">${gaB({k:'ready'},'다음 ▶')}</div>`);
    else if(!mine) h+=gaDock('',gaWait('👀 구경 중이에요'));
    if(m.props.length) h+='<details class="ga-more"><summary>📜 제안·투표 기록</summary><table class="fs-tab"><tr><th>원정</th><th>대장</th><th>원정대</th><th>찬성</th><th></th></tr>'+m.props.slice().reverse().map(p=>{ const H=m.hist.find(x=>x.r===p.r&&p.ok); return `<tr><td>${p.r+1}</td><td>${emo(p.leader)}</td><td>${p.team.map(emo).join('')}</td><td>${m.al.filter(x=>p.votes[x]).map(emo).join('')}</td><td>${p.ok?(H?(H.fail?`💨${H.fails}`:'🕯️'):'출발'):'부결'}</td></tr>`; }).join('')+'</table></details>';
    return h+'</div>'; },
};

/* 🙋 늦게 들어온 친구 (2026-11-12 사용자: "멀티 방 참여가 2명 이후부터 안 된다") — 시즌을 먼저 시작하면 그때 인원으로 자리가 고정돼서, 뒤에 온 친구는 관전만 했음.
   개막식이면 'reinit'(core가 인원 맞춰 새로 시작), 그 뒤엔 쉬는 단계에서 동물 한 마리 자리를 이어받음(연합·관계·피스/가넷 그대로, 지난 대화는 동물 이름으로 남음). 게임 중이면 끝난 뒤로 미룸. */
const JOIN_PH=['rest','lobby','afterDeath','split','afterRev','finalWait','vote'];
function addHuman(s,p){ const id='h'+p; if(pl(s,id)) return 'in'; if(s.phase==='opening'&&!s.ep) return 'reinit';
  if(s.champ||!JOIN_PH.includes(s.phase)||natOn(s)||s.sub){ s.pendJoin=s.pendJoin||[]; if(!s.pendJoin.includes(p)){ s.pendJoin.push(p); sys(s,`🙋 ${nm(id)} 입장 — 지금 게임이 끝나면 동물 자리를 이어받아 참가해요`,'host'); } return 'wait'; }
  const busy=[s.cand,s.oppo,s.rescue&&!s.rescue.done?s.rescue.by:null,s.curse&&!s.curse.res?s.curse.who:null];
  const cand=animalsAlive(s).filter(a=>!busy.includes(a)); if(!cand.length) return 'full'; const a=U.pick(cand), A=ANI(a)||{};
  s.aq=s.aq.filter(q=>q.i!==a); const chat=s.chat, dm=s.dm, said=s.said; s.chat=[]; s.dm={}; s.said={};
  delete s.rel[a]; if(s.bx) delete s.bx[a]; if(s.grow) delete s.grow[a]; delete s.memo[a]; if(s.cond) delete s.cond[a]; if(s.face) delete s.face[a]; if(s.memoAt) delete s.memoAt[a]; if(s.air) for(const k of Object.keys(s.air)) if(k.includes(a)) delete s.air[k];
  const J=JSON.parse(JSON.stringify(s).split('"'+a+'"').join('"'+id+'"')); for(const k of Object.keys(s)) delete s[k]; Object.assign(s,J);
  s.chat=chat; s.said=said; s.dm=Object.fromEntries(Object.entries(dm).filter(([k])=>!k.endsWith('|'+a)));
  if(!s.hs.includes(p)) s.hs.push(p); s.hs.sort((x,y)=>x-y); if(s.pendJoin) s.pendJoin=s.pendJoin.filter(x=>x!==p);
  sys(s,`🙋 ${nm(id)}이(가) ${A.emo||''} ${A.name||''}의 자리(${CURN(s)}·연합·관계 그대로)를 이어받아 참가해요!`,'host'); return 'ok'; }
function joinPending(s){ for(const p of (s.pendJoin||[]).slice()) addHuman(s,p); }

/* ───────── 🏦 비밀 규칙 거래소 · AI판 (2026-11-12 밤 자율 — 데블스 플랜 놀이터 메인 매치, 원작 「미스터리 거래소」 계열 오리지널) ─────────
   6종목, 모두 🪙100으로 시작, 10라운드. 라운드마다 한 가지: 한 종목을 몇 주 사거나 팔거나 쉼(거래는 지금 가격, 가격은 그 뒤 움직임).
   가격 = 이전 가격 + 수요(산 주 − 판 주, 인원이 많을수록 덜 민감) + 숨은 규칙들. 숨은 규칙 4개는 판마다 무작위 종목에 붙고 3·5·7·9라운드에 하나씩 공개.
   🧩 피스 1개로 다음에 공개될 규칙을 미리 몰래 봄(데블스 플랜). 끝나면 현금 + 주식 가치로 순위. */
const SK_N=[['🍯','꿀단지식품'],['🔩','강철건설'],['💻','번개테크'],['🏦','반석금융'],['⚡','불꽃에너지'],['🎮','별빛게임즈']];
const skSch=keys=>({type:'object',properties:{pick:{type:'string',enum:keys},say:{type:'string'},memo:{type:'string'}},required:['pick','say','memo'],additionalProperties:false});
const SK_RULES=[
  {k:'lead', mk:(a)=>({a}), txt:o=>`${SK_N[o.a][1]}이(가) 지난 라운드에 움직인 만큼의 절반이 다른 종목 전부에 따라붙는다`},
  {k:'pair', mk:(a,b)=>({a,b}), txt:o=>`${SK_N[o.a][1]}과(와) ${SK_N[o.b][1]}은(는) 한 몸 — 한쪽이 지난 라운드에 움직인 만큼 다른 쪽도 이번에 움직인다`},
  {k:'quiet', mk:(a)=>({a}), txt:o=>`${SK_N[o.a][1]}은(는) 아무도 안 사면 +2, 세 명 이상 사면 거품이 꺼져 −3`},
  {k:'contra', mk:(a)=>({a}), txt:o=>`${SK_N[o.a][1]}은(는) 청개구리 — 나머지 종목 합계가 오르면 −2, 내리면 +2`},
  {k:'swing', mk:(a)=>({a}), txt:o=>`${SK_N[o.a][1]}은(는) 홀수 라운드 +3, 짝수 라운드 −3`},
];
/* 🧠 비밀 규칙 거래소 선택지 표 (NPC 룰 1·2·3·6·10, 2026-11-12) — 종목마다 다음 변화 짐작 = 공개(+미리 본) 규칙 + 지난 매매로 이어질 수요(따라 사기) + 수요·공개 규칙으로 설명 안 되는 지난 움직임(모르는 규칙 흔적, 0.3배).
   불확실성 = 모르는 규칙 수만큼 큼. 선택지(사기 25%·50%, 팔기 절반·전부, 쉬기)마다 기대 자산 변화 − 위험 감점. (내가 사서 값이 오르는 걸 이득으로 치면 서로 끝없이 사 올리는 펌핑이 생겨서 뺌 — 2026-11-12 시험에서 자산 1,500만)
   위험을 얼마나 꺼리나: 1위면 지키기, 뒤지거나 막판이면 승부, 성격(대담) 반영. 예전 auto는 규칙 공개 전에도 노이즈만으로 현금 30~70%를 한 종목에. */
function skPlan(s,m,i){ const N=NAT.stockai, g=N.guess(m,m.peek[i]), dv=Math.max(2,m.al.length/2), unk=m.rules.filter(R=>!(m.r>=R.at)&&!(m.peek[i]&&m.peek[i]===R)).length, left=m.R-m.r+1;
  const kD=[0,1,2,3,4,5].map(j=>{ const last=m.log[m.log.length-1]; if(!last) return 0; let b=0,se=0; for(const x in last.ord){ const o=last.ord[x]; if(o&&o.stock===j){ if(o.act==='buy') b+=o.n; if(o.act==='sell') se+=o.n; } } return Math.round((b-se)/dv); });
  const res=[0,1,2,3,4,5].map(j=>m.dlt[j]-kD[j]-(m.log.length?N.guess(Object.assign({},m,{r:m.r-1,dlt:m.hist.length>2?m.hist[m.hist.length-2].map((p,k)=>p-m.hist[m.hist.length-3][k]):[0,0,0,0,0,0]}),m.peek[i])[j]:0));
  const infl=m.log.length?m.dlt.reduce((a,b)=>a+b,0)/6:0.5, KW=.6, RW=.15, ed=[0,1,2,3,4,5].map(j=>g[j]+kD[j]*KW+res[j]*.3+Math.max(0,infl)*.5), sd=1.2+unk*.9;   /* 다들 사면 시장 전체가 오름(인플레) — 현금만 쥐면 뒤처짐 */
  const rk=N.rank(m), pos=rk.indexOf(i), lead=pos===0, behind=pos>=Math.ceil(rk.length/2), ra=Math.max(.03,RW*(lead?.45:behind?.15:.3)*(left<=2&&behind?.4:1)*(1.3-trait(s,i,'aggr')));
  const opts=[{key:'쉬기',o:{act:'hold',stock:0,n:0},ev:0,risk:0}]; const cash=m.cash[i];
  for(let j=0;j<6;j++){ const P=m.price[j];
    for(const f of [.25,.5]){ const n=Math.floor(cash*f/P); if(n<1) continue; const ev=n*ed[j]*Math.min(4,left)*.7, risk=n*sd; opts.push({key:`${SK_N[j][1]} ${n}주 사기`,o:{act:'buy',stock:j,n},ev,risk,j}); }
    const h=m.hold[i][j]; if(h){ for(const n of [...new Set([Math.ceil(h/2),h])]){ const ev=-n*ed[j]*Math.min(4,left)*.7, risk=-n*sd*.5; opts.push({key:`${SK_N[j][1]} ${n}주 팔기`,o:{act:'sell',stock:j,n},ev,risk,j}); } } }
  for(const o of opts) o.sc=o.ev-ra*Math.max(0,o.risk);
  const buys=opts.filter(o=>o.o.act==='buy').sort((a,b)=>b.ev-a.ev).slice(0,5), sells=opts.filter(o=>o.o.act==='sell').sort((a,b)=>b.ev-a.ev).slice(0,3);
  return {opts:[opts[0],...buys,...sells],ed,sd,ra,pos}; }   /* 쉬기·팔기는 늘 선택지에 */
NAT.stockai={ maxH:12, title:'비밀 규칙 거래소', emoji:'🏦', tagline:'가격을 움직이는 숨은 규칙을 먼저 읽는 사람이 이긴다',
  rule:'6종목, 모두 🪙100으로 시작해 <b>10라운드</b>. 라운드마다 <b>한 종목을 몇 주 사거나 팔거나 쉬기</b>(지금 가격으로 거래, 가격은 그 뒤 움직임). 가격 = 이전 + <b>수요(산 주 − 판 주, 인원이 많을수록 덜 민감)</b> + <b>숨은 규칙</b>. 숨은 규칙 4개는 판마다 달라요 — 3·5·7·9라운드에 하나씩 공개. 🧩 피스 1개로 다음 규칙을 미리 몰래 볼 수 있어요. 끝나면 <b>현금 + 주식 가치</b>로 순위.',
  start(s,al,kind){ const sh=U.shuffle([0,1,2,3,4,5]); const R=U.shuffle(SK_RULES.slice()).slice(0,4).map((d,k)=>Object.assign({k:d.k,at:3+k*2},d.k==='pair'?d.mk(sh[k],sh[5]):d.mk(sh[k])));
    const m={id:'stockai',kind:kind||s.phase,R:10,r:0,al:al.slice(),price:[10,10,10,10,10,10],hist:[[10,10,10,10,10,10]],dlt:[0,0,0,0,0,0],rules:R,cash:{},hold:{},ord:{},plan:{},peek:{},ready:{},ph:'trade',log:[]};
    for(const x of m.al){ m.cash[x]=100; m.hold[x]=[0,0,0,0,0,0]; }
    sys(s,`🏦 ${kind==='prison'?'⛓️ 감옥 매치':'메인 매치'} 「비밀 규칙 거래소」 — 🪙100으로 6종목을 사고팔아요. 가격을 움직이는 숨은 규칙 4개는 3·5·7·9라운드에 하나씩 공개! 10라운드 뒤 자산 1위가 우승.`,'host');
    this.round(s,m); return m; },
  worth(m,x){ return m.cash[x]+m.hold[x].reduce((t,h,i)=>t+h*m.price[i],0); },
  known(m){ return m.rules.filter(R=>m.r>=R.at); },
  round(s,m){ m.r++; m.ord={}; m.plan={}; m.ready={}; m.ph='trade'; m.dl=Date.now()+45000; m.pdl=Date.now()+18000;
    const nw=m.rules.find(R=>R.at===m.r); if(nw) sys(s,`📜 규칙 공개 — ${SK_RULES.find(d=>d.k===nw.k).txt(nw)}`,'host');
    sys(s,`🏦 ${m.r}/${m.R}라운드 — 가격 ${m.price.map((p,i)=>SK_N[i][0]+p).join(' ')}. 사고팔 종목을 정하세요`,'host'); },
  delay(s){ return s.nm&&s.nm.ph==='res'?900:900; }, ready(){ return true; },
  ani(s,m){ return m.al.filter(x=>!isHum(x)); }, hum(s,m){ return m.al.filter(isHum); },
  /* 규칙을 아는 만큼 다음 가격 짐작(동물 힌트·자동 판단) */
  guess(m,peekR){ const K=this.known(m).concat(peekR?[peekR]:[]), d=[0,0,0,0,0,0], tot=m.dlt.reduce((a,b)=>a+b,0);
    for(const R of K){ if(R.k==='lead') for(let j=0;j<6;j++) if(j!==R.a) d[j]+=Math.round(m.dlt[R.a]/2); if(R.k==='pair'){ d[R.b]+=m.dlt[R.a]; d[R.a]+=m.dlt[R.b]; } if(R.k==='quiet') d[R.a]+=1; if(R.k==='contra') d[R.a]+=tot-m.dlt[R.a]>0?-2:2; if(R.k==='swing') d[R.a]+=(m.r+0)%2?3:-3; }
    return d; },
  /* AI 없을 때: 예전 규칙 그대로(성격만 trait) — 표 기반 점수로 바꿔 봤지만 이 시장(다들 사면 전체가 오름)에선 공격적으로 사는 예전 규칙이 더 잘 벌어서 되돌림(2026-11-12 시험) */
  auto(s,m,i){ const g=this.guess(m,m.peek[i]), P={aggr:trait(s,i,'aggr'),bluff:trait(s,i,'bluff')}, ctr=(P.bluff||.5)>.7; let best=-1, bv=0; for(let j=0;j<6;j++){ const mo=m.dlt[j]>0?.6:-.3; const v=g[j]+(ctr?-mo:mo)*(P.aggr||.5)+Math.random()*1.2; if(v>bv){ bv=v; best=j; } }
    const worst=m.hold[i].map((h,j)=>h?{j,v:g[j]}:null).filter(Boolean).sort((a,b)=>a.v-b.v)[0];
    if(worst&&worst.v<-1) return {act:'sell',stock:worst.j,n:m.hold[i][worst.j]};
    if(best>=0&&m.cash[i]>=m.price[best]){ const n=Math.max(1,Math.floor(m.cash[i]*(.3+(P.aggr||.5)*.4)/m.price[best])); return {act:'buy',stock:best,n}; }
    return {act:'hold',stock:0,n:0}; },
  ok(m,i,o){ if(!o||o.act==='hold') return true; const j=o.stock|0, n=o.n|0; if(!(j>=0&&j<6)||n<1) return false; return o.act==='buy'?n*m.price[j]<=m.cash[i]:o.act==='sell'?n<=m.hold[i][j]:false; },
  tick(s){ const m=s.nm, now=Date.now(), H=this.hum(s,m);
    if(m.ph==='trade'){
      for(const i of this.ani(s,m)){ if(m.plan[i]) continue;
        const pk=m.peek[i], K=this.known(m);
        const PL=skPlan(s,m,i), keys=PL.opts.map(o=>o.key);
        const r=need(s,`${s.ep}:${m.kind}:sk:${m.r}:${i}`,()=>ask(s,i,`비밀 규칙 거래소 ${m.r}/${m.R}라운드 — 한 가지만: buy(stock 0~5, n주) / sell / hold. 지금 가격 ${m.price.map((p,j)=>`${j}:${SK_N[j][1]} ${p}(지난 변화 ${m.dlt[j]>0?'+':''}${m.dlt[j]}${m.vol?`, 지난 매매 산 ${m.vol[j].b}주 판 ${m.vol[j].s}주`:''})`).join(', ')}. 지난 변화에서 수요 몫(산−판 ÷ 인원 절반)을 빼고 남는 움직임이 숨은 규칙이다. 네 현금 🪙${m.cash[i]}, 보유 ${m.hold[i].map((h,j)=>h?`${SK_N[j][1]} ${h}주`:'').filter(Boolean).join(', ')||'없음'}. 공개된 규칙: ${K.map(R=>SK_RULES.find(d=>d.k===R.k).txt(R)).join(' / ')||'아직 없음(수요만 앎: 산 주−판 주를 인원 절반으로 나눈 만큼 움직임)'}${pk?`. 🧩 네가 미리 본 다음 규칙: ${SK_RULES.find(d=>d.k===pk.k).txt(pk)}`:''}. 규칙대로 계산한 다음 변화 짐작: ${this.guess(m,pk).map((d,j)=>`${SK_N[j][1]} ${d>0?'+':''}${d}`).join(', ')}. 아직 모르는 규칙도 있으니 지난 가격 움직임에서 패턴을 추리해라. 남은 라운드 ${m.R-m.r+1}. 네 성향(${(ANI(i)||{}).arch||''})대로 — 남들이 다 사는 쪽을 따라갈지, 다 파는 종목을 싸게 줍는 역발상을 할지, 현금을 지키며 관망할지. say는 대부분 \"\", 할 말 있으면 짧게(속셈은 숨겨도 됨).\n[처지] 자산 순위 ${PL.pos+1}/${m.al.length} · 남은 라운드 ${m.R-m.r+1}${PL.pos===0?' — 1위라 지키기':PL.pos>=Math.ceil(m.al.length/2)?' — 뒤지고 있어 승부가 필요':''}\n[코드가 계산한 것: 종목별 다음 변화 짐작 ${PL.ed.map((d,j)=>`${SK_N[j][1]} ${d>=0?'+':''}${d.toFixed(1)}`).join(', ')} (±${PL.sd.toFixed(1)} — 모르는 규칙이 많을수록 큼), 그리고 선택지별 짐작대로일 때의 손익]\n${PL.opts.map(o=>`- ${o.key}${o.o.act==='hold'?'':`: 짐작대로면 ${o.ev>=0?'+':''}${o.ev.toFixed(0)}🪙`}`).join('\n')}\n(이 시장은 다들 사면 전체가 오른다 — 현금만 쥐면 뒤처질 수 있다. 짐작은 짐작일 뿐, 모르는 규칙이 많을수록 빗나간다)\npick은 표의 이름 하나.`,skSch(keys)));
        if(r===undefined&&now<m.pdl) continue; m.plan[i]=1; if(r) memo(s,i,r);
        let o=r&&(PL.opts.find(x=>x.key===r.pick)||{}).o; if(!this.ok(m,i,o)) o=this.auto(s,m,i); m.ord[i]=o; const t=r&&shortSay(r.say,60); if(t) talk(s,i,t,null,'say'); return; }
      if(this.ani(s,m).every(i=>m.plan[i])&&(H.every(h=>m.ord[h]||m.ready[h])||now>=m.dl)){ for(const h of H) if(!m.ord[h]) m.ord[h]={act:'hold',stock:0,n:0}; this.settle(s,m); } return; }
    if(m.ph==='res'){ if(now>=m.until||(H.length&&H.every(h=>m.ready[h]))){ if(m.r>=m.R) return this.finish(s,m); this.round(s,m); } } },
  settle(s,m){ const buy=[0,0,0,0,0,0], sell=[0,0,0,0,0,0], buyers=[0,0,0,0,0,0];
    for(const x of m.al){ const o=m.ord[x]; if(!o||o.act==='hold'||!this.ok(m,x,o)) continue; const j=o.stock, n=o.n;
      if(o.act==='buy'){ m.cash[x]-=n*m.price[j]; m.hold[x][j]+=n; buy[j]+=n; buyers[j]++; } else { m.cash[x]+=n*m.price[j]; m.hold[x][j]-=n; sell[j]+=n; } }
    const dv=Math.max(2,m.al.length/2), d=[0,1,2,3,4,5].map(j=>Math.round((buy[j]-sell[j])/dv)), prev=m.dlt.slice(), base=d.slice();
    for(const R of m.rules){ if(R.k==='lead') for(let j=0;j<6;j++) if(j!==R.a) d[j]+=Math.round(prev[R.a]/2); if(R.k==='pair'){ d[R.b]+=prev[R.a]; d[R.a]+=prev[R.b]; } if(R.k==='quiet') d[R.a]+=buyers[R.a]===0?2:buyers[R.a]>=3?-3:0;
      if(R.k==='contra'){ const o=base.reduce((a,b)=>a+b,0)-base[R.a]; d[R.a]+=o>0?-2:o<0?2:0; } if(R.k==='swing') d[R.a]+=m.r%2?3:-3; }
    for(let j=0;j<6;j++){ const np=Math.max(1,m.price[j]+d[j]); d[j]=np-m.price[j]; m.price[j]=np; }
    m.dlt=d; m.vol=[0,1,2,3,4,5].map(j=>({b:buy[j],s:sell[j]})); m.hist.push(m.price.slice()); m.log.push({r:m.r,ord:JSON.parse(JSON.stringify(m.ord)),d:d.slice()});
    sys(s,`📈 ${m.r}라운드 — ${m.price.map((p,j)=>`${SK_N[j][0]}${p}${d[j]?`(${d[j]>0?'+':''}${d[j]})`:''}`).join(' ')} · 1위 ${nm(this.rank(m)[0])}`,'host');
    m.ph='res'; m.ready={}; m.until=Date.now()+(this.hum(s,m).length?12000:3000);
    const A=U.shuffle(this.ani(s,m)); const big=A.find(x=>{ const o=m.ord[x]; return o&&o.act!=='hold'&&Math.abs(d[o.stock])>=3; }); if(big&&Math.random()<.6) s.aq.push({k:'say',i:big,model:'haiku',task:`비밀 규칙 거래소 — 네가 산(판) ${SK_N[m.ord[big].stock][1]}이(가) 이번에 ${d[m.ord[big].stock]>0?'+':''}${d[m.ord[big].stock]} 움직였다. 짧게 반응.`,fb:['오 이거 봐','아 이게 왜']}); },
  rank(m){ return m.al.slice().sort((a,b)=>this.worth(m,b)-this.worth(m,a)||Math.random()-.5); },
  finish(s,m){ const ids=this.rank(m), sc={}; for(const x of m.al) sc[x]=this.worth(m,x);
    sys(s,'🏦 최종 자산 — '+ids.map((x,k)=>`${k+1}위 ${nm(x)} 🪙${sc[x]}`).join(' · ')+' · 숨은 규칙: '+m.rules.map(R=>SK_RULES.find(d=>d.k===R.k).txt(R)).join(' / '),'host'); s.nm=null; announceMain(s,'stockai',ids,null,sc,'🪙'); },
  apply(s,me,a){ const m=s.nm; if(!m.al.includes(me)) return '이번 게임 참가자가 아니에요';
    if(a.k==='ord'){ if(m.ph!=='trade') return '지금은 거래 시간이 아니에요'; const o={act:a.act,stock:a.stock|0,n:a.n|0}; if(!['buy','sell','hold'].includes(o.act)) return '사기·팔기·쉬기 중에'; if(!this.ok(m,me,o)) return o.act==='buy'?'현금이 모자라요':'가진 주식보다 많이 팔 수 없어요'; m.ord[me]=o; return null; }
    if(a.k==='peek'){ if(!isDev(s)) return '피스가 없는 시즌이에요'; const P=pl(s,me); if(!P||P.g<1) return '🧩 피스가 없어요'; const nx=m.rules.find(R=>R.at>m.r&&!(m.peek[me]&&m.peek[me]===R)); if(!nx) return '남은 숨은 규칙이 없어요'; if(m.peek[me]) return '이미 하나 미리 봤어요'; P.g--; m.peek[me]=nx; return null; }
    if(a.k==='ready'){ m.ready[me]=1; return null; }
    return '알 수 없는 동작'; },
  mask(v,me){ const m=v.nm; if(!m) return; m.tot={}; for(const x of m.al) m.tot[x]=m.cash[x]+m.hold[x].reduce((t,h,i)=>t+h*m.price[i],0);
    const kn=m.rules.filter(R=>m.r>=R.at), pk=m.peek[me]; m.rules=kn.map(R=>Object.assign({},R,{txt:SK_RULES.find(d=>d.k===R.k).txt(R)})); m.nRules=4; m.myPeek=pk?SK_RULES.find(d=>d.k===pk.k).txt(pk):null; m.peek={};
    for(const x of m.al) if(x!==me){ m.cash[x]=null; m.hold[x]=null; }
    if(m.ph==='trade'){ m.ordered=Object.keys(m.ord); m.ord=m.ord[me]?{[me]:m.ord[me]}:{}; } },
  view(s,i){ const m=s.nm, L=['[지금 게임: 🏦 비밀 규칙 거래소] 6종목, 라운드마다 한 종목 사기/팔기/쉬기. 가격 = 이전 + 수요(산 주−판 주 ÷ 인원 절반) + 숨은 규칙 4개(3·5·7·9라운드에 하나씩 공개). 10라운드 뒤 현금+주식 가치 순위.'];
    L.push(`[지금] ${m.r}/${m.R}라운드 · 가격 ${m.price.map((p,j)=>SK_N[j][1]+' '+p).join(', ')}`);
    L.push(`[가격 기록] `+m.hist.slice(-5).map((h,k)=>h.join('/')).join(' → '));
    L.push('[자산 순위] '+this.rank(m).map(x=>`${nm(x)} ${this.worth(m,x)}`).join(', '));
    return L.join('\n'); },
  tell(s,m,id){ if(m.ph!=='trade') return null; const o=m.ord[id]; if(o&&o.act==='buy'&&o.n*m.price[o.stock]>m.cash[id]*1.5) return 'sweat'; const r=this.rank(m); if(r[0]===id&&m.r>3) return 'smug'; if(r[r.length-1]===id&&m.r>4) return 'nerv'; return null; },
  card(v,me,out){ const m=v.nm, mine=m.al.includes(me)&&!out, sel=gaSel('sk:'+m.r,null), qn=gaSel('skn:'+m.r,1), MX=Math.max(...m.hist.flat(),12);
    let h=`<div class="vr-card ga sk">`+gaTop(`🏦 비밀 규칙 거래소 · ${m.r}/${m.R}라운드 · ${m.ph==='trade'?'💱 거래':'📈 결과'} ${gaT(m.ph==='trade'?m.dl:0)}`,this.rule);
    h+='<div class="sk-grid">'+SK_N.map((n,j)=>{ const H=m.hist.map(x=>x[j]), pts=H.map((p,k)=>`${(k/Math.max(1,m.R)*100).toFixed(1)},${(30-p/MX*28).toFixed(1)}`).join(' '), dj=m.dlt[j];
      return `<button class="sk-s ${sel===j?'on':''}" data-gsel="sk:${m.r}|${j}" ${mine&&m.ph==='trade'?'':'disabled'}><span class="e">${n[0]}</span><b>${n[1]}</b><span class="p">🪙${m.price[j]} <small class="${dj>0?'up':dj<0?'dn':''}">${dj>0?'▲'+dj:dj<0?'▼'+(-dj):'–'}</small></span>${m.vol?`<small class="vol">🛒${m.vol[j].b} 💸${m.vol[j].s}</small>`:''}<svg viewBox="0 0 100 32" class="sk-sp"><polyline points="${pts}"/></svg>${mine&&m.hold[me]&&m.hold[me][j]?`<small class="mine">보유 ${m.hold[me][j]}주</small>`:''}</button>`; }).join('')+'</div>';
    h+=`<div class="sk-rules"><b>📜 숨은 규칙 ${m.rules.length}/${m.nRules}</b>${m.rules.map(R=>`<div>· ${U.esc(R.txt)}</div>`).join('')||'<div><small>3라운드부터 하나씩 공개돼요</small></div>'}${m.myPeek?`<div class="peek">🧩 미리 본 규칙: ${U.esc(m.myPeek)}</div>`:''}</div>`;
    h+='<div class="ga-strip">'+m.al.slice().sort((a,b)=>m.tot[b]-m.tot[a]).map((x,k)=>`<span class="${x===me?'me':''}">${k===0?'👑':''}${emo(x)}<i>${U.esc(nm(x))}</i><b>${m.tot[x]}</b>${m.ph==='trade'&&(m.ordered||[]).includes(x)&&x!==me?'<small class="pos">✓</small>':''}</span>`).join('')+'</div>';
    if(mine&&m.ph==='trade'){ const o=m.ord[me], cash=m.cash[me], have=sel!=null?m.hold[me][sel]:0, maxB=sel!=null?Math.floor(cash/m.price[sel]):0, n=Math.max(1,qn|0);
      let b=`<div class="ga-btns">${[1,2,5,10].map(k=>`<button class="ghost small ${n===k?'on':''}" data-gsel="skn:${m.r}|${k}">${k}주</button>`).join('')}</div><div class="ga-btns">`;
      if(sel!=null) b+=gaB({k:'ord',act:'buy',stock:sel,n:Math.min(n,maxB)||n},`🛒 ${SK_N[sel][1]} ${Math.min(n,maxB)||n}주 사기`,maxB>=1?'':'ghost dim')+gaB({k:'ord',act:'sell',stock:sel,n:Math.min(n,have)||n},`💸 ${Math.min(n,have)||n}주 팔기`,have>=1?'ghost':'ghost dim');
      b+=gaB({k:'ord',act:'hold',stock:0,n:0},'✋ 쉬기','ghost')+(isDev(v)&&!m.myPeek&&(pl(v,me)||{}).g>0&&m.rules.length<m.nRules?gaB({k:'peek'},'🧩 다음 규칙 미리 보기','ghost'):'')+'</div>';
      h+=gaDock(`현금 🪙<b>${cash}</b> · 자산 🪙<b>${m.tot[me]}</b>${o?` · 낸 주문: ${o.act==='hold'?'쉬기':`${SK_N[o.stock][1]} ${o.n}주 ${o.act==='buy'?'사기':'팔기'}`} (바꿀 수 있어요)`:sel==null?' · 위에서 종목을 고르세요':''}`,b); }
    else if(mine&&m.ph==='res') h+=gaDock('',m.ready[me]?gaWait('다음 라운드 기다리는 중…'):`<div class="ga-btns">${gaB({k:'ready'},m.r>=m.R?'최종 결과 ▶':'다음 라운드 ▶')}</div>`);
    else if(!mine) h+=gaDock('',gaWait('👀 구경 중이에요'));
    return h+'</div>'; },
};

function subP(s,p){ return s.sub?s.sub.hp.indexOf('h'+p):-1; }
let CS=null;   // 지금 다루는 시즌 상태(방장) — 게임 속 동물이 시즌 관계를 읽을 때 씀
function withNames(sub,fn){ const oN=window.nameOf, oA=U.ava, NP=window.NPCS, oR=NP&&NP.rel, ss=CS; window.nameOf=sp=>{ const id=sub.hp[sp]; return isHum(id)?(oN?oN(coreP(id)):'사람'):nm(id); }; U.ava=sp=>{ const id=sub.hp[sp]; return isHum(id)?(oA?oA(coreP(id)):'🙂'):emo(id); };   /* 원래 함수로 — 안 그러면 nm→nameOf→nm 무한 반복 */
  if(NP&&ss) NP.rel=(a,b)=>{ const t=b==='me'?sub.hp[0]:b==='opp'?sub.hp[1]:b; return t&&ss.rel?rel(ss,a,t):0; };   // 🤝 연합·원한이 게임 속 판단(의심·협력)에 묻어남
  try{ return fn(); } finally { window.nameOf=oN; U.ava=oA; if(NP&&ss) NP.rel=oR; } }

/* ───────── 🤖 게임 속 동물 대사도 AI (2026-11-11 사용자: "시즌에 있는 모든 게임을 AI 기반 + 선과 악 그라운드 룰로")
   각 게임의 동물 두뇌가 정한 말(뜻·주장·숫자·거짓말)은 그대로 두고, 말하는 건 AI가 캐릭터 말투·시즌 관계·방금 오간 말에 맞춰 다시 한다.
   AI 답이 오기 전엔 그 말을 숨기고 게임을 잠깐 멈춤(💭 생각 중…) → 9초 넘으면 원래 말 그대로. AI가 꺼져 있으면 아무 일도 없음.
   판이 바뀌는 순간(라운드·시작)과 사람이 대화창에 말할 땐 동물들이 시즌 대화창에서 수다로 반응(게임은 안 멈춤). */
const LINE_KEYS=['feed','pub'];
/* 😈 데블스 플랜 형식 시스템 문장 */
const SYSD=SYS.split('\n').map((l,k)=>k===0?'너는 한국 두뇌 서바이벌 예능 「데블스 플랜」 놀이터 시즌에 참가한 동물 플레이어 한 명이다. 사람 친구들과 동물 친구들이 섞여 10명이 서바이벌을 한다.'
  :k===1?'[규칙] 하루 = 자유 시간(대화·귓속말·연합) → 메인 매치(전원) → 꼴찌 1명은 바로 유배지로 탈락, 1위는 연맹의 징표(감옥동으로 갈 사람 1명을 생활동으로 구해 줌)와 피스 → 상위권은 생활동, 하위권은 감옥동 → 감옥동끼리 감옥 매치 → 꼴찌 1명 유배지로 탈락. 유배지 사람들은 시즌 중간 패자부활전에서 1명이 돌아온다. 둘 남으면 결승 3판 2선승. 피스는 게임 아이템·거래에 쓰고 서로 건넬 수 있다(피스가 0개여도 탈락하지 않는다 — 오직 게임만이 운명을 정한다). 사람은 피스 2개로 너의 속마음 메모를 몰래 엿볼 수 있다.':l).join('\n')
  .replace(/가넷/g,'피스').replace('데스매치 위험','감옥동·탈락 위험').replace(' 지목할 때는 이길 수 있는 상대, 나를 해칠 사람, 피스 많은 사람 등을 근거로 고른다.',' 연맹의 징표로 누구를 구할지는 연합·거래·이득을 따진다.').replace('(지난 회 순위, 피스, 약속, 투표, 했던 말)','(지난 순위, 피스, 약속, 했던 말)');
const LSYS=`너는 한국 두뇌 서바이벌 예능 「더 지니어스」 놀이터 시즌에 참가한 동물 플레이어다. 지금은 시즌 안의 게임 중이다.
[꼭 지킬 것]
- '원래 하려던 말'은 게임 속 너의 판단에서 나온 말이다. 뜻·주장·제안·숫자·카드·대상은 그대로 유지한다. 거짓말·블러핑이어도 그대로 유지(바꾸거나 스스로 들키게 말하지 마라). 새 정보·새 약속을 지어내지 마라.
- 방금 오간 말에 자연스럽게 이어지게(누가 물었으면 대답처럼). 시즌 관계가 있으면 살짝 묻어나게(연합이면 다정하게, 믿음이 낮으면 살짝 경계).
[말투] 실제 친구들이 보드게임 테이블에서 툭 던지는 말. 아래 [너] 말씨·예시 대사처럼. 다 같이 본 상황을 다시 설명하지 말고, 한 박자만. 물결(~)·ㅠㅠ·ㅎㅎ·ㅋㅋ는 가끔만, "A예요, 아니면 B예요?"·"혹시~" 금지, 1:1이면 이름 부르지 않기. 비꼬기 금지. 보고서체·설명·메타 발언(AI, 규칙 설명) 금지. 이름표·따옴표 금지.
[길이] 원래 말보다 짧거나 비슷하게, 최대 40자.`;
const LSCH={type:'object',properties:{say:{type:'string'},tone:{type:'string',enum:['acc','trust','none']}},required:['say','tone'],additionalProperties:false};
const RSCH={type:'object',properties:{say:{type:'string'},to:{type:'string'},tone:{type:'string',enum:['acc','trust','none']},memo:{type:'string'}},required:['say','to','tone','memo'],additionalProperties:false};
function gamePids(sub){ const n=seatCount(sub), out=[]; for(let k=0;k<n;k++){ const id=subSeatPid(sub,k); if(id&&!out.includes(id)) out.push(id); } for(const h of sub.hp) if(!out.includes(h)) out.push(h); return out; }
function recentLines(sub,n){ const st=sub.st, L=[]; for(const k of LINE_KEYS){ const a=st[k]; if(Array.isArray(a)) for(const x of a.slice(-n)) if(x&&x.text&&!x.pend&&x.seat!=null){ const id=subSeatPid(sub,x.seat); L.push(`${id?nm(id):'?'}: ${x.text}`); } }
  if(!L.length&&st.say&&st.say.text&&!st.say.pend&&st.say.seat!=null){ const id=subSeatPid(sub,st.say.seat); L.push(`${id?nm(id):'?'}: ${st.say.text}`); }
  return L.slice(-n); }
/* 이름 주의: 화면용 subCtx(v,ctx)와 이름이 같아 덮어써지던 것(2026-11-11) → lineCtx */
function lineCtx(s,sub,i){ const G=G_(sub.id), st=sub.st, p=ANI(i)||{}, L=[];
  L.push(`[너] ${p.emo||''} ${p.name}${VOICE[i]?' — 말투: '+VOICE[i]:''}`);
  L.push(`[지금] 제${s.ep}회 ${sub.kind==='main'?'메인 매치':sub.kind==='death'?'데스매치':'결승'} 「${G.title}」 — ${G.tagline||''}`);
  if(st.notice) L.push(`[판 상황] ${String(st.notice).replace(/<[^>]+>/g,'').slice(0,140)}`);
  L.push('[이 게임 참가자와 너의 마음(믿음 -1~1)] '+gamePids(sub).filter(x=>x!==i).map(x=>`${nm(x)}${isHum(x)?'(사람)':''} ${rel(s,i,x).toFixed(1)}${isAlly(s,i,x)?' 🤝연합':''}`).join(', '));
  { const c=condOf(s,i); if(c) L.push(`[지금 네 상태] ${COND[c.k][0]} ${COND[c.k][1]} — ${COND[c.k][2]}${c.on?` (대상: ${nm(c.on)})`:''}. 말과 판단에 드러나게 해라.`); }
  if(s.memo[i]) L.push(`[네 속마음 메모] ${s.memo[i]}`);
  const rec=recentLines(sub,10); if(rec.length) L.push('[게임 안에서 방금 오간 말]\n'+rec.join('\n'));
  const sc=s.chat.filter(c=>!c.note&&!c.secret).slice(-5).map(c=>`${nm(c.seat)}: ${c.text}`); if(sc.length) L.push('[대화창 최근]\n'+sc.join('\n'));
  const mine=s.chat.filter(c=>c.seat===i).slice(-3).map(c=>c.text); if(mine.length) L.push(`[네가 최근에 한 말 — 반복 금지] ${mine.join(' / ')}`);
  return L.join('\n'); }
const digits=t=>(String(t).match(/\d+/g)||[]);
function keepsFacts(a,b){ const B=digits(b); return digits(a).every(d=>B.includes(d)); }   // 숫자(가격·개수·칩)가 바뀌면 원래 말로
function addLine(sub,i,text,t,ref){ const n=sub.vn=(sub.vn||0)+1; if(n>90||sub.vq.length>=5) return null;   // 비용·대기 상한: 넘으면 원래 말 그대로
  const q={key:sub.key+':v'+n,i,text:String(text),t:t!=null?subSeatPid(sub,t):null,ref,dl:Date.now()+9000}; sub.vq.push(q); return q; }
function catchLines(s){ const sub=s.sub; if(!sub||!aiOn()) return; const st=sub.st; sub.vq=sub.vq||[]; const vs=sub.vs=sub.vs||{n:{}};
  for(const k of LINE_KEYS){ const a=st[k]; if(!Array.isArray(a)) continue;
    for(let j=vs.n[k]||0;j<a.length;j++){ const x=a[j]; if(!x||!x.text||x.seat==null||x.pend) continue; const id=subSeatPid(sub,x.seat); if(!id||isHum(id)) continue;
      if(addLine(sub,id,x.text,x.t,{k,j})) x.pend=1; }
    vs.n[k]=a.length; }
  const y=st.say; if(y&&y.text&&y.seat!=null&&!y.vid){ const id=subSeatPid(sub,y.seat); y.vid=1;
    if(id&&!isHum(id)){ const jb=sub.vq.find(q=>q.i===id&&q.text===y.text&&!q.say); if(jb){ jb.say=1; y.vid=jb.key; y.pend=1; } else { const q=addLine(sub,id,y.text,y.t,null); if(q){ q.say=1; y.vid=q.key; y.pend=1; } } } }
  /* 판이 바뀌는 순간 → 시즌 대화창 수다(안 멈춤) */
  const rk=(st.round??st.r??'')+'|'+(st.phase||''); if(vs.rk!==rk){ const first=vs.rk==null; vs.rk=rk;
    const ani=gamePids(sub).filter(x=>!isHum(x)&&pl(s,x)&&!pl(s,x).out);
    if(ani.length&&(first?sub.kind!=='main':String(st.round??'')!==String((vs.lr??''))&&Math.random()<.3)){ const i=sub.kind==='main'?U.pick(ani):(sub.ph||ani[0]);
      reactJob(s,i,first?'데스매치가 막 시작됐다. 상대에게 한마디(각오·떠보기·장난, 시즌 관계 반영).':'게임 판이 한 단계 넘어갔다. 방금 일에 대한 느낌을 테이블에서 툭 한마디(상황 설명 말고 반응만, 아주 짧게). 별일 없으면 빈 문자열.'); }
    vs.lr=st.round??''; } }
function reactJob(s,i,task,to){ const sub=s.sub; if(!sub||!aiOn()) return; sub.rq=sub.rq||[]; if(sub.rq.length>=3) return; const n=sub.rn=(sub.rn||0)+1; sub.rq.push({key:sub.key+':r'+n,i,task,to:to||null,dl:Date.now()+20000}); }
function askLine(s,sub,q){ if(!aiOn()) return null; return AIB.json(LSYS, lineCtx(s,sub,q.i)+`\n[원래 하려던 말] "${q.text}"${q.t?` (대상: ${nm(q.t)})`:''}\n\n[지금 할 일] 원래 하려던 말을 네 말투로, 지금 흐름에 맞게 다시 말해라.`, LSCH, {model:'haiku'}); }
function askReact(s,sub,q){ if(!aiOn()) return null; return AIB.json(SYS, lineCtx(s,sub,q.i)+`\n\n[지금 할 일] ${q.task} 할 말이 없으면 say는 "". to에는 말 거는 상대 이름(없으면 "").`, RSCH, {model:'haiku'}); }
/* 대기 중인 대사 처리: true면 아직 기다릴 게 있음(게임 멈춤) */
function voiceStep(s){ const sub=s.sub; if(!sub) return false; const st=sub.st, now=Date.now();
  for(const q of (sub.rq||[]).slice()){ const r=need(s,q.key,()=>askReact(s,sub,q)); if(r===undefined&&now<q.dl) continue;
    sub.rq.splice(sub.rq.indexOf(q),1); delete s.air[q.key]; if(!r) continue; memo(s,q.i,r); const t=shortSay(r.say,80); if(!t) continue; const to=idOf(s,r.to);
    talk(s,q.i,t,to&&to!==q.i?to:null,r.tone||'say'); if(to&&r.tone==='acc') addRel(s,q.i,to,-.04); if(to&&r.tone==='trust') addRel(s,q.i,to,.04); }
  const vq=sub.vq||[]; if(!vq.length){ if(s.typing!=null&&s.typing===sub.vt) s.typing=sub.vt=null; return false; }
  for(const q of vq.slice()){ const r=need(s,q.key,()=>askLine(s,sub,q)); if(r===undefined&&now<q.dl) continue;
    let t=r&&shortSay(r.say,90); if(t&&!keepsFacts(q.text,t)) t=null; const fin=t||q.text;
    if(q.ref){ const x=st[q.ref.k]&&st[q.ref.k][q.ref.j]; if(x&&x.pend){ x.text=fin; delete x.pend; } }
    if(q.say&&st.say&&st.say.vid===q.key){ st.say.text=fin; delete st.say.pend; }
    if(r&&q.t&&r.tone==='acc') addRel(s,q.i,q.t,-.04); if(r&&q.t&&r.tone==='trust') addRel(s,q.i,q.t,.04);
    vq.splice(vq.indexOf(q),1); delete s.air[q.key]; }
  /* 혹시 남은 숨김 표시 정리(참조가 바뀐 경우) */
  if(!vq.length){ for(const k of LINE_KEYS){ const a=st[k]; if(Array.isArray(a)) for(const x of a) if(x&&x.pend) delete x.pend; } if(st.say&&st.say.pend) delete st.say.pend; s.typing=sub.vt=null; return false; }
  s.typing=sub.vt=vq[0].i; return true; }
function apply(s,p,a){ if(!a) return '알 수 없는 동작'; const me='h'+p, P_=pl(s,me);
  if(a.k==='sub'){ if(!s.sub) return '지금은 게임 중이 아니에요'; const sp=subP(s,p); if(sp<0) return '이번 게임은 관전 중이에요'; const G=G_(s.sub.id); CS=s; const e=withNames(s.sub,()=>G.apply(s.sub.st,sp,a.a)); if(!e){ catchLines(s); s.ev++; } return e; }
  if(a.k==='plea'){ if(!P_||P_.out) return '탈락한 사람은 못 해요'; const ph=s.phase; if(!['vote','lobby'].includes(ph)) return '지금은 변론할 때가 아니에요';
    if(ph==='vote'&&!(s.vote&&s.vote.pool.includes(me))) return '진 팀만 변론해요'; if(ph==='vote'&&s.vote.votes[me]) return '투표 전에만 변론할 수 있어요'; if(ph==='lobby'&&(s.cand===me||isHum(s.cand))) return '동물 후보에게만 변론해요';
    const k=s.ep+ph+me; if((s.pleaDone||{})[k]) return '이번엔 이미 변론했어요'; if(showOn(s)) return '잠시 뒤에 해 주세요'; const tx=clean(a.text).slice(0,160); if(!tx) return '할 말을 적어 주세요';
    (s.pleaDone=s.pleaDone||{})[k]=1; const judges=ph==='vote'?s.vote.pool.filter(x=>!isHum(x)&&x!==me&&!s.vote.votes[x]):[s.cand].concat(U.shuffle(animalsAlive(s).filter(x=>x!==s.cand)).slice(0,2));
    talk(s,me,`🎤 ${tx}`,null,'say'); const P={id:(s.pleas||[]).length+1,who:me,text:tx,ep:s.ep,ph,judges,res:{}}; (s.pleas=s.pleas||[]).push(P);
    show(s,'plea',2600+tx.length*45+16000,{pid:P.id,who:me,text:tx,judges}); if(s.voteHold) s.voteHold+=4000; s.ev++; return null; }
  if(a.k==='skipShow'){ if(s.show) s.show.until=Date.now(); s.ev++; return null; }
  if(a.k==='skipDuel'){ const m=s.nm; if(!m||!m.fast||m.al.includes(me)) return '건너뛸 승부가 없어요'; m.skip=m.skip||{}; m.skip[me]=1;
    const hs=s.players.filter(x=>isHum(x.id)&&!m.al.includes(x.id)).map(x=>x.id); if(hs.every(h=>m.skip[h])){ const sc=m.chips||m.sc||{}, [x,y]=m.al; const tie=(sc[x]||0)===(sc[y]||0), w=(sc[x]||0)>(sc[y]||0)?x:(sc[y]||0)>(sc[x]||0)?y:U.pick(m.al), l=w===x?y:x;
      sys(s,`⏩ 구경하던 사람들이 건너뛰었어요 — ${tie?`동점이라 🎲 제비뽑기로 ${nm(w)} 승!`:`지금까지 앞선 ${nm(w)} 승!`}`,'host'); s.typing=null; natDuelEnd(s,w,l); } s.ev++; return null; }
  if(a.k==='pred'){ const p=s.pred; if(!predOpen(s)) return '지금은 예측할 수 없어요'; if(p.opts.includes(me)) return '내 승부는 예측 못 해요'; if(p.picks[me]) return '이미 예측했어요'; if(!p.opts.includes(a.t)) return '둘 중 하나를 고르세요';
    p.picks[me]=a.t; sys(s,`🔮 ${nm(me)}의 예측: ${nm(a.t)} 승!`,''); s.ev++; return null; }
  if(a.k==='nm'){ if(!natOn(s)) return '지금은 게임 중이 아니에요'; if(!P_||(P_.out&&!(s.phase==='revival'&&s.nm.al.includes(me)))) return '탈락한 사람은 구경만 해요'; const e=NAT[s.nm.id].apply(s,me,a.a||{}); if(!e) s.ev++; return e; }
  if(a.k==='go'){ if(!P_||P_.out) return '탈락한 사람은 구경만 해요'; if(s.sub||natOn(s)||!MAP_PH.includes(s.phase)) return '지금은 이동할 수 없어요'; const room=a.room; if(room!=='lounge'&&!ROOMS.some(r=>r.k===room)) return '그런 방은 없어요';
    if(whereOf(s,me)===room) return null; const now=Date.now(); (s.loc=s.loc||{})[me]={room,ep:s.ep,ph:s.phase};
    s.meet=(s.meet||[]).filter(m=>m.until>now); for(const M of s.meet) if(M.room!==room) M.mem=M.mem.filter(x=>x!==me); s.meet=s.meet.filter(M=>M.mem.length>=2||M.room===room&&M.mem.length>=1);
    const M=s.meet.find(M=>M.room===room); if(M){ if(!M.mem.includes(me)) M.mem.push(me); M.until=Math.max(M.until,now+25000); }
    (s.meetLog=s.meetLog||[]).push(`${nm(me)} → ${roomName(room)}`); if(s.meetLog.length>5) s.meetLog.shift();
    const an=roomMates(s,me).filter(x=>!isHum(x)); if(an.length&&!s.aq.some(q=>q.k==='rmReply'&&q.h===me)) s.aq.push({k:'rmReply',i:U.pick(an),h:me,text:null,room});
    s.ev++; return null; }
  if(a.k==='chat'&&!s.sub&&!natOn(s)&&MAP_PH.includes(s.phase)&&P_&&!P_.out&&whereOf(s,me)!=='lounge'&&roomMates(s,me).length){ const t=clean(a.text).slice(0,200); if(!t) return '할 말을 적어 주세요';
    const room=whereOf(s,me), to=[me,...roomMates(s,me)]; s.chat.push({r:s.ep,seat:me,text:t,t:null,kind:'say',secret:1,room,to});
    { const M=(s.meet||[]).find(m=>m.room===room&&m.until>Date.now()); if(M) M.until=Math.max(M.until,Date.now()+25000); }
    const an=to.filter(x=>x!==me&&!isHum(x)); const hit=an.filter(x=>calls(t,x)); const who=hit.length?hit.slice(0,2):an.length?[U.pick(an)]:[];
    for(const x of who) s.aq.push({k:'rmReply',i:x,h:me,text:t,room}); s.ev++; return null; }
  if(a.k==='chat'&&isDev(s)&&P_&&P_.out&&P_.ex&&!(s.phase==='revival'&&natOn(s)&&s.nm.al.includes(me))){ const t=clean(a.text).slice(0,200); if(!t) return '할 말을 적어 주세요'; exSay(s,me,t);
    const ea=exiles(s).filter(x=>!isHum(x)); const hit=ea.filter(x=>calls(t,x)); const who=hit.length?hit.slice(0,2):ea.length&&Math.random()<.8?[U.pick(ea)]:[]; for(const x of who) s.aq.push({k:'exReply',i:x,h:me,text:t}); s.ev++; return null; }
  if(a.k==='chat'){ const t=clean(a.text).slice(0,200); if(!t) return '할 말을 적어 주세요'; talk(s,me,t,null,'say');
    const hit=animalsAlive(s).filter(x=>calls(t,x));
    if(s.sub){ const inG=gamePids(s.sub).filter(x=>!isHum(x)&&pl(s,x)&&!pl(s,x).out); const who=hit.filter(x=>inG.includes(x)||true).slice(0,2); if(!who.length&&inG.length&&Math.random()<.7) who.push(U.pick(inG));
      for(const x of who) reactJob(s,x,`${nm(me)}(사람)이 대화창에 말했다: "${t}". 게임 중이다. 네 말투로 짧게 대답하거나 반응해라(떠보기·장난·맞장구, 게임 속 네 판단과 앞뒤가 맞게).`,me); s.ev++; return null; }
    if(natOn(s)){ const inG=s.nm.al.filter(x=>!isHum(x)&&pl(s,x)&&!pl(s,x).out); const q_=/\?|？|규칙|어떻게|뭐|왜|몇|무슨|언제|누가|되나|돼요|해요\?/.test(t), rq_=/[1-9]|해\s?줘|해\s?요|해\s?주세|가\s?줘|내\s?줘|내\s?주|내세요|내요|내시|부탁|약속|드릴게|줄게|같이|맞춰|낮게|높게|작게|크게|양보|믿어/.test(t); let who=hit.filter(x=>inG.includes(x)).slice(0,2);
      if(!who.length&&inG.length&&(q_||Math.random()<.6)) who=[U.pick(inG)];
      for(const x of who) s.aq.push({k:'say',i:x,model:q_||(rq_&&hit.includes(x))?undefined:'haiku',task:`${nm(me)}이(가) 테이블에서 말했다: "${t}". ${rq_&&hit.includes(x)?`너에게 하는 부탁·제안이다. 바로 들어주지 말고 [부탁을 받으면] 기준으로 따져라 — 위 게임 기록에서 ${nm(me)}이(가) 약속을 지켰는지(💔), 그게 네 점수에 이득인지, 대가가 있는지. 그 판단대로 조건 걸기·되묻기·거절·의심·(이득이면) 수락 중 하나를 네 말투로 짧게. 숫자를 말한다면 진짜 낼 생각인지 memo에 적어라(나중에 숫자 낼 때 이 memo를 본다).`:q_?'질문이면 먼저 그 질문에 정확히 답해라(규칙이면 위 [지금 게임] 설명대로 쉽게 한두 문장, 지어내지 말 것). 그다음 필요하면 네 말투로 한마디.':'네 말투로 짧게 반응해라(맞장구·장난·떠보기, 게임 속 네 판단과 앞뒤가 맞게).'} to는 ${nm(me)}.`});
      s.ev++; return null; }
    for(const x of hit.slice(0,2)) s.aq.push({k:'rest',i:x}); s.ev++; return null; }
  if(a.k==='dm'){ const t=clean(a.text).slice(0,200), x=a.t; if(!t) return '귓속말을 적어 주세요';
    if(isHum(x)&&pl(s,x)&&x!==me){ if(natOn(s)&&NAT[s.nm.id].dmOk&&!NAT[s.nm.id].dmOk(s,me,x)) return '🔗 수갑 때문에 지금은 바로 옆자리에만 귓속말할 수 있어요'; dmPush(s,me,x,me,t); dmPush(s,x,me,me,t); meet(s,[me,x],'dm'); s.ev++; return null; }   /* 👥 사람끼리 귓속말 (2026-11-11) */
    if(!pl(s,x)||isHum(x)||pl(s,x).out) return '귓속말할 상대를 고르세요';
    if(natOn(s)&&NAT[s.nm.id].dmOk&&!NAT[s.nm.id].dmOk(s,me,x)) return '🔗 수갑 때문에 지금은 바로 옆자리에만 귓속말할 수 있어요';
    dmPush(s,me,x,me,t); meet(s,[me,x],'dm'); s.aq.push({k:'dmReply',i:x,h:me,text:t}); s.ev++; return null; }
  if(a.k==='aInv'){ if(!P_||P_.out) return '탈락한 사람은 못 해요'; const t=a.t; if(!pl(s,t)||pl(s,t).out||t===me) return '초대할 사람을 고르세요'; if(!allyInvite(s,me,t,a.a)) return '이미 그 연합에 있거나 초대했어요'; s.ev++; return null; }
  if(a.k==='aJoin'){ const A=(s.alli||[]).find(B=>B.id===a.a); if(!A||A.inv[me]!=='wait') return '받은 초대가 없어요'; if(a.ok){ allyJoin(s,me,A); } else { A.inv[me]='no'; aSys(A,`🙅 ${nm(me)}이(가) 초대를 거절했어요`); for(const x of A.mem) addRel(s,x,me,-.05); } s.ev++; return null; }
  if(a.k==='aLeave'){ const A=(s.alli||[]).find(B=>B.id===a.a&&B.mem.includes(me))||allyOf(s,me); if(!A) return '연합이 없어요'; allyLeave(s,me,'leave',A); s.ev++; return null; }
  if(a.k==='aSay'){ const A=(s.alli||[]).find(B=>B.id===a.a&&B.mem.includes(me))||allyOf(s,me); if(!A) return '연합이 없어요'; const t=clean(a.text).slice(0,200); if(!t) return '할 말을 적어 주세요'; A.chat.push({from:me,text:t,ep:s.ep}); { const o=A.mem.filter(x=>x!==me&&pl(s,x)&&!pl(s,x).out); if(o.length) meet(s,[me,U.pick(o)],'al'); }
    const an=A.mem.filter(x=>!isHum(x)&&pl(s,x)&&!pl(s,x).out); const hit=an.filter(x=>calls(t,x)); const who=hit.length?hit.slice(0,2):an.length?[U.pick(an)]:[];
    for(const x of who) s.aq.push({k:'aReply',i:x,from:me,text:t,a:A.id}); s.ev++; return null; }
  if(a.k==='offer'){ const d=s.dm[dmKey(me,a.a)]||[]; const m=d.find(x=>x.offer&&x.offer.st==='wait'); if(!m) return '받을 제안이 없어요';
    m.offer.st=a.ok?'ok':'no'; if(a.ok){ const N_=joinAlly(s,a.a,me); dmPush(s,me,a.a,-1,`🤝 연합 성사 — 「${(N_||{}).name||'연합'}」 (🤝 연합방 탭)`); } else { addRel(s,a.a,me,-.15); bond(s,a.a,me,'refuse'); } s.ev++; return null; }
  if(P_&&P_.out&&!['chat'].includes(a.k)) return '탈락해서 관전 중이에요';
  if(a.k==='ready'){ s.ready[me]=1; s.ev++; return null; }
  if(a.k==='face'){ if(!FACE[a.f]) return '표정을 고르세요'; (s.face=s.face||{})[me]={k:a.f,at:Date.now()}; s.ev++; return null; }
  if(a.k==='rescue'){ if(s.phase!=='rescue'||!s.rescue||s.rescue.by!==me||s.rescue.done) return '연맹의 징표를 쓸 차례가 아니에요'; const t=a.t||null; if(t&&!s.rescue.pool.includes(t)) return '감옥동 갈 사람 중에서 고르세요'; doRescue(s,t); s.ev++; return null; }
  if(a.k==='give'){ if(!isDev(s)) return '알 수 없는 동작'; if(!['rest','split','afterRev'].includes(s.phase)) return '피스는 자유 시간에만 건넬 수 있어요'; const x=a.t, X=pl(s,x); if(!X||X.out||x===me) return '줄 사람을 고르세요'; if(P_.g<1) return '🧩 피스가 없어요';
    P_.g--; X.g++; tlog(s,`${nm(me)}이(가) ${nm(x)}에게 피스 1개`); sys(s,`🧩 ${nm(me)} → ${nm(x)} 피스 1개`,''); addRel(s,x,me,.15); bond(s,x,me,'piece'); evl(s,me,x,'deal','🧩 피스 선물'); s.ev++; return null; }
  if(a.k==='peek'){ const x=a.t; if(!pl(s,x)||isHum(x)||pl(s,x).out) return '엿볼 동물을 고르세요'; if(P_.g<2) return `${CURN(s)}가 2개 필요해요`; P_.g-=2;
    const R=s.rel[x]||{}, by=aliveIds(s).filter(y=>y!==x).sort((p,q)=>(R[q]||0)-(R[p]||0)), A=allyU(s,x);
    dmPush(s,me,x,-1,`🔍 (${CUR(s)}2로 몰래 엿봄) ${nm(x)}의 속마음 — ${s.memo[x]?`메모 "${s.memo[x]}" · `:''}제일 믿는 쪽: ${by.slice(0,2).map(nm).join('·')} · 제일 경계하는 쪽: ${by.slice(-2).reverse().map(nm).join('·')}${A&&A.mem.length>1?` · 연합: ${A.mem.map(nm).join('·')}`:' · 연합 없음'}`); s.ev++; return null; }
  if(a.k==='giveTok'){ if(!['rest','lobby'].includes(s.phase)) return '휴식·로비 시간에만 줄 수 있어요'; if(!P_.gift) return '나눠 줄 징표가 없어요 (받은 징표는 다시 못 넘겨요)'; const x=a.t, X=pl(s,x); if(!X||X.out||x===me) return '줄 사람을 고르세요'; if(X.tok) return '이미 징표가 있어요'; if(s.phase==='lobby'&&s.cand===x) return '지금 후보에게는 못 줘요';
    P_.gift=0; X.tok=1; tlog(s,`${nm(me)}이(가) ${nm(x)}에게 생명의 징표를 건넴`); sys(s,`🛡️ ${nm(me)}이(가) ${nm(x)}에게 생명의 징표를 건넸어요!`,'host'); addRel(s,x,me,.6); bond(s,x,me,'gift'); evl(s,me,x,'ally','생명의 징표 선물'); if(!isHum(x)) s.aq.push({k:'say',i:x,model:'haiku',task:`${nm(me)}이(가) 방금 너에게 생명의 징표(데스매치 면제)를 줬다. 네 말투로 짧게 고마움(또는 의외라는 반응) 한마디. to는 ${nm(me)}.`}); s.ev++; return null; }
  if(a.k==='buyTok'){ if(s.phase!=='rest') return '휴식 시간에만 살 수 있어요'; if(P_.tok) return '이미 징표가 있어요'; if(P_.g<5) return '가넷이 5개 필요해요'; P_.g-=5; P_.tok=1; sys(s,`🛡️ ${nm(me)}이(가) 가넷 5개로 생명의 징표를 샀어요!`,'host'); s.ev++; return null; }
  if(a.k==='vote'){ const V=s.vote; if(s.phase!=='vote'||!V) return '지금은 투표 시간이 아니에요'; if(!V.pool.includes(me)) return '진 팀만 투표해요'; if(V.votes[me]) return '이미 투표했어요'; if(!V.pool.includes(a.t)||a.t===me) return '진 팀에서 한 명을 고르세요';
    betrayCheck(s,me,a.t,"표를 던졌어요"); V.votes[me]=a.t; talk(s,me,`🗳️ ${nm(a.t)}에게 한 표`,a.t,'acc'); s.ev++; return null; }
  if(a.k==='deal'){ if(s.phase!=='lobby') return '로비 시간에만 돼요'; const c=s.cand; if(c===me) return '후보는 거래를 받는 쪽이에요'; const amt=Math.max(1,Math.min(P_.g,a.n|0)); if(P_.g<1) return '가넷이 없어요';
    s.lobby.deals[me+'>'+c]={amt,ok:isHum(c)?false:null}; talk(s,me,`🟣 ${nm(c)}, 가넷 ${amt}개 줄게요 — 저 지목하지 말아 주세요🙏`,c,'trust');
    if(!isHum(c)){ const p=ANI(c)||{}; const yes=(p.bluff||.5)*.5+(p.aggr||.5)*.2+amt*.15+rel(s,c,me)*.3>.42; s.lobby.deals[me+'>'+c].ok=yes; if(yes) evl(s,me,c,'deal',`🟣 가넷 ${amt}개 거래`); talk(s,c,yes?pickLine(s,c,['콜! 약속이에요🤝','좋아요, 대신 꼭 줘야 해요~']):pickLine(s,c,['음… 그걸로는 좀ㅠㅠ','생각해 볼게요ㅎㅎ']),me,yes?'trust':'none'); }
    s.ev++; return null; }
  if(a.k==='acceptDeal'){ if(s.phase!=='lobby'||s.cand!==me) return '후보만 받을 수 있어요'; const d=s.lobby.deals[a.from+'>'+me]; if(!d) return '그 거래가 없어요'; d.ok=true; evl(s,a.from,me,'deal',`🟣 가넷 ${d.amt}개 거래`); talk(s,me,`🤝 ${nm(a.from)}, 거래 받을게요!`,a.from,'trust'); s.ev++; return null; }
  if(a.k==='push'){ if(s.phase!=='lobby') return '로비 시간에만 돼요'; const c=s.cand, t=a.t; if(!pl(s,t)||t===c) return '대상을 고르세요'; talk(s,me,`${nm(c)}, ${nm(t)} 지목하는 거 어때요? ${clean(a.why).slice(0,60)}`,c,'acc'); if(!isHum(c)) addRel(s,c,t,-.15*(1+Math.max(0,rel(s,c,me)))); s.ev++; return null; }
  if(a.k==='pick'){ if(s.phase!=='lobby'&&s.phase!=='pick') return '지금은 지목할 때가 아니에요'; if(s.cand!==me) return '후보만 지목해요'; const E=eligible(s,me); if(!E.includes(a.t)) return '지목할 수 있는 사람을 고르세요';
    betrayCheck(s,me,a.t,"데스매치 지목을 했어요"); nominate(s,me,a.t,clean(a.say)||`${nm(a.t)}, 저랑 한 판 해요!`); s.ev++; return null; }
  if(a.k==='dpick'){ /* (데스매치 게임 고르기) */ if(s.phase!=='deathPick'||s.oppo!==me) return '지목당한 사람이 골라요'; if(!s.deathOpts.includes(a.id)) return '둘 중 하나를 고르세요'; startDeath(s,a.id); s.ev++; return null; }
  return '알 수 없는 동작'; }
function stepDelay(s){ if(s.winner==null&&showOn(s)) return s.show.k==='plea'||(s.aq[0]&&s.aq[0].k==='bye')?600:Math.max(200,s.show.until-Date.now()); const d=stepDelay0(s); if(d==null&&s.winner==null&&dlOn(s)) return Math.max(250,s.dl-Date.now()); return d; }
function stepDelay0(s){ if(s.winner!=null) return null;
  if(s.sub){ CS=s; const G=G_(s.sub.id), st=s.sub.st; if(s.sub.vq&&s.sub.vq.length) return 400;
    const side=(s.sub.rq&&s.sub.rq.length)||s.aq.some(q=>q.k==='dmReply'); if(st.winner!=null) return 1800;
    if(s.sub.ph){ const a=phantomMove(s.sub); if(a) return G.aiDelay?Math.min(2600,G.aiDelay(st)||1200):1200; }
    const d=withNames(s.sub,()=>G.stepDelay?G.stepDelay(st):null); return side?(d==null?900:Math.min(d,900)):d; }
  if(natOn(s)){ const d=NAT[s.nm.id].delay(s); if(s.aq.length) return Math.min(d==null?1500:d, s.typing!=null?600:(s.aq[0].k==='dmReply'?900:1500)); return d; }
  if(s.aq.length) return s.typing!=null?600:(s.aq[0].k==='dmReply'?900:1500);
  if(s.wait) return s.wait;
  if(s.phase==='opening') return readyAll(s)?600:null;
  if(s.phase==='rest') return readyAll(s)?800:null;
  if(s.phase==='vote'){ const V=s.vote; return V&&V.pool.every(x=>V.votes[x]||pl(s,x).out)?1200:null; }
  if(s.phase==='lobby') return !isHum(s.cand)&&readyAll(s)?800:null;
  if(s.phase==='deathPick') return isHum(s.oppo)?null:predWaiting(s)?1000:1500;
  if(s.phase==='afterDeath') return readyAll(s)?600:null;
  if(s.phase==='rescue') return s.rescue&&!s.rescue.done&&isHum(s.rescue.by)?null:900;
  if(s.phase==='split'||s.phase==='afterRev') return readyAll(s)?600:null;
  if(s.phase==='finalWait') return readyAll(s)?(predWaiting(s)?1000:800):null;
  return null; }
function step(s){ faceTick(s); if(s.pendJoin&&s.pendJoin.length&&JOIN_PH.includes(s.phase)&&!natOn(s)&&!s.sub) joinPending(s); if(showOn(s)){ if(s.show.k==='plea') pleaJudge(s); else if(s.aq[0]&&s.aq[0].k==='bye') runQ(s); s.ev++; return; }
  { const P=(s.pleas||[]).slice(-1)[0]; if(P&&P.ep===s.ep&&P.judges.some(j=>!P.res[j]&&pl(s,j)&&!pl(s,j).out)) pleaJudge(s,P); }   /* 무대가 먼저 끝났어도 늦게 온 반응은 반영 */   /* 🎬 연출 중(탈락 인사만 받아 둠) */
  if(s.sub){ CS=s; const G=G_(s.sub.id), st=s.sub.st;
    { const qi=s.aq.findIndex(q=>q.k==='dmReply'); if(qi>0){ const [q]=s.aq.splice(qi,1); s.aq.unshift(q); } if(qi>=0){ const ty=s.typing; runQ(s); if(s.typing==null) s.typing=ty; } }   // 💬 게임 중에도 귓속말 답장
    if(voiceStep(s)){ s.ev++; return; }
    if(st.winner!=null){ const k=s.sub.kind; if(k==='main') mainResult(s); else if(k==='death') deathResult(s); else { const sub=s.sub; const wi=st.winner===0||st.winner===1?st.winner:(Math.random()<.5?0:1); s.sub=null; finalScore(s,sub.hp[wi]); } s.ev++; return; }
    if(s.sub.ph){ const a=phantomMove(s.sub); if(a){ withNames(s.sub,()=>G.apply(st,1,a)); catchLines(s); s.ev++; return; } }
    const gd=withNames(s.sub,()=>G.stepDelay?G.stepDelay(st):null); if(gd==null){ s.ev++; return; }   // 사람 차례(수다·답장만 처리하러 들어온 경우)
    withNames(s.sub,()=>{ if(G.step) G.step(st); }); catchLines(s); s.ev++; return; }
  if(natOn(s)){ const N_=NAT[s.nm.id], m0=s.nm, r0=m0.r; if(s.aq.length) runQ(s); if(natOn(s)&&N_.ready(s)) N_.tick(s); flowSnap(s,m0,r0); if(m0.r!==r0) leadWatch(s,m0); s.ev++; return; }   /* AI판: 판 진행이 먼저, 수다·답장은 짬짬이 */
  if(['opening','rest','lobby','afterDeath','finalWait','split','afterRev'].includes(s.phase)&&humansAlive(s).length&&readyAll(s)&&s.aq.length>1){ const CH=['intro','rest','aTalk','lobby','say']; s.aq=[s.aq[0]].concat(s.aq.slice(1).filter(q=>!CH.includes(q.k))); }   /* 다 준비됐으면 수다는 그만 */
  if(dlOn(s)&&Date.now()>=s.dl){ timeUp(s); s.ev++; return; }   /* ⏱️ 시간 종료 */
  if(s.aq.length){ runQ(s); s.ev++; return; }
  if(s.wait){ s.wait=0; if(s.phase==='afterDeath'){ s.ev++; return; } }
  if(s.phase==='opening'||(s.phase==='afterDeath'&&s.ep===0)){ startRest(s); s.ev++; return; }
  if(s.phase==='rest'){ if(!s.next){ sys(s,'🎙️ 이번 인원에 맞는 메인 매치가 없어 결과를 추첨해요','host'); fakeMain(s); s.ev++; return; }
    const al=aliveIds(s); if(!humansAlive(s).length&&!isDev(s)){ fakeMain(s); s.ev++; return; }
    if(NAT[s.next]){ s.phase='match'; s.nm=NAT[s.next].start(s,al); s.notice=`🎮 ${NAT[s.next].title}`; s.ev++; return; }
    startSub(s,'main',s.next,al); s.ev++; return; }
  if(s.phase==='vote'){ tallyVote(s); s.ev++; return; }
  if(s.phase==='lobby'){ s.aq.push({k:'pick',i:s.cand}); s.ev++; return; }
  if(s.phase==='deathPick'){ if(predWaiting(s)){ s.ev++; return; } const o=s.oppo, p=ANI(o)||{}; startDeath(s,s.deathOpts[(p.logic>.6)===(Math.random()<.7)?0:1]||s.deathOpts[0]); s.ev++; return; }
  if(s.phase==='afterDeath'){ afterDeath(s); s.ev++; return; }
  if(s.phase==='rescue'){ if(s.rescue&&!s.rescue.done){ if(isHum(s.rescue.by)){ s.ev++; return; } s.aq.push({k:'rescue',i:s.rescue.by}); } else setSplit(s); s.ev++; return; }
  if(s.phase==='split'){ startPrison(s); s.ev++; return; }
  if(s.phase==='afterRev'){ if(alive(s).length<=2) startFinal(s); else startRest(s); s.ev++; return; }
  if(s.phase==='finalWait'){ if(predWaiting(s)){ s.ev++; return; } finalNext(s); s.ev++; return; } }
function fakeMain(s){ const al=aliveIds(s); const lg=x=>isHum(x)?.6:(ANI(x).logic||.5); const order=U.shuffle(al.slice()).sort((a,b)=>lg(b)*rnd(.6,1.4)-lg(a)*rnd(.6,1.4));
  if(s.next) s.used.push(s.next); s.lastOrder=order; s.eps.push({ep:s.ep,game:s.next,order});
  sys(s,`🎙️ 제${s.ep}회 결과 — ${order.map((x,k)=>`${k+1}위 ${nm(x)}`).join(' · ')}`,'host');
  for(const x of s.players) x.gift=0; pl(s,order[0]).tok++; pl(s,order[0]).gift=1; pl(s,order[0]).g+=3; stat(s,'win',order[0]); setCond(s,order[0],'conf'); const c=order.slice(1).reverse().find(x=>!pl(s,x).tok)||order[order.length-1]; setCand(s,c); }
function mask(s,p){ const v=U.clone(s), me='h'+p; delete v.air; delete v.memoAt; if(v.face) for(const k in v.face) v.face[k]={k:v.face[k].k,at:v.face[k].at}; if(v.curse&&v.curse.who!==me&&!v.curse.res) v.curse=null; v.memo={}; delete v.mlog; delete v.tlog; delete v.bx; delete v.beats; delete v.rlog; delete v.glog; delete v.grow;   /* 속마음·몰래 기록은 후기에만 */ if(v.nm&&NAT[v.nm.id]) NAT[v.nm.id].mask(v,me);
  const dm={}; for(const k in s.dm) if(k.startsWith(me+'|')) dm[k]=s.dm[k]; v.dm=dm;
  v.chat=s.chat.filter(c=>!c.secret||(c.to&&c.to.includes(me))).map(c=>c.room&&c.secret?Object.assign({},c,{text:c.room==='exile'?`🏝️ ${c.text}`:`🚪${roomName(c.room).replace(/^\S+\s/,'')} · ${c.text}`}):c);
  v.alli=(s.alli||[]).filter(A=>A.mem.includes(me)||A.inv[me]==='wait').map(A=>A.mem.includes(me)?A:{id:A.id,name:A.name,mem:A.mem,inv:{[me]:'wait'},chat:[],ep:A.ep});
  if(s.sub){ const sp=subP(s,p), G=G_(s.sub.id); v.sub=Object.assign({},s.sub,{st:sp>=0?withNames(s.sub,()=>G.mask?G.mask(s.sub.st,sp):U.clone(s.sub.st)):null,spect:sp<0,sp}); delete v.sub.vq; delete v.sub.rq;
    const vst=v.sub.st; if(vst){ for(const k of LINE_KEYS) if(Array.isArray(vst[k])) vst[k]=vst[k].filter(x=>!(x&&x.pend)); if(vst.say&&vst.say.pend) vst.say=null; } }
  v.turn=null; if(s.sub&&s.sub.st&&s.sub.st.turn!=null){ const pid=s.sub.hp[s.sub.st.turn]; if(pid&&isHum(pid)) v.turn=coreP(pid); }
  if(s.sub&&v.sub.st&&v.sub.st.notice) v.notice=v.sub.st.notice;
  if(s.lobby){ v.lobby=U.clone(s.lobby); }
  return v; }

/* ───────── 화면 ───────── */
let alSel=null;   /* 🤝 탭에서 보고 있는 연합 id, 'new' = 새 연합 만들기 */
let dmTo=null, dmSeen={}, subKey=null, dmAuto=null, gnRule=null;   /* gnRule: AI판 규칙 펼침 */
let drTab='log', npSel=null;   /* 서랍 탭 · 누른 명찰 */
/* 🧭 단계 표시줄 */
const STEPS=[['rest','☕ 휴식'],['match','🎮 메인 매치'],['vote','📊 결과'],['lobby','🏛️ 로비'],['death','⚔️ 데스매치'],['afterDeath','💀 탈락']];
const STEPSD=[['rest','☕ 자유'],['match','🎮 메인'],['split','🏠 생활동·⛓️ 감옥동'],['prison','⛓️ 감옥 매치'],['afterDeath','🏝️ 유배']];
function stepsHTML(v){ const ph=v.phase; if(isDev(v)&&!['final','finalWait','champ'].includes(ph)){ if(ph==='revival'||ph==='afterRev') return '<span class="gn-steps"><span class="on">🔥 패자부활전</span></span>'; const k=ph==='rescue'?'split':ph, i=STEPSD.findIndex(x=>x[0]===k); return `<span class="gn-steps">${STEPSD.map(([,n],j)=>`<span class="${j<i?'done':j===i?'on':''}">${n}</span>`).join('')}</span>`; } if(['final','finalWait','champ'].includes(ph)) return `<span class="gn-steps"><span class="on">🏆 결승${v.final?` ${v.final.score[v.cand]}:${v.final.score[v.oppo]}`:''}</span></span>`; if(ph==='opening') return '<span class="gn-steps"><span class="on">🎬 개막식</span></span>';
  const k=ph==='deathPick'?'death':ph, i=STEPS.findIndex(x=>x[0]===k); return `<span class="gn-steps">${STEPS.map(([,n],j)=>`<span class="${j<i?'done':j===i?'on':''}">${n}</span>`).join('')}</span>`; }
/* ⏱️ 남은 시간 칩 — 숫자는 0.25초마다 따로 갱신(화면을 다시 그리지 않아도 줄어들게), 마지막 10초 째깍 */
function dlChip(v){ if(!(v.dl&&v.dlPh===v.phase&&!v.sub&&!natOn(v))) return ''; return `<span class="gn-timer" data-dl="${v.dl}" data-k="main">⏱ --</span>`; }
let dlTick=null, dlLast=null;
function dlLoop(){ if(dlTick) return; dlTick=setInterval(()=>{ for(const e of document.querySelectorAll('[data-dl]')){ const left=Math.max(0,Math.ceil((+e.dataset.dl-Date.now())/1000)); const t=`⏱ ${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}`; if(e.textContent!==t) e.textContent=t; e.classList.toggle('hurry',left<=10);
    if(e.dataset.k==='main'&&left<=10&&left>0&&dlLast!==left){ dlLast=left; try{ if(typeof sfx==='function') sfx('tick'); }catch(_){} } } },250); }
/* 🪪 D2 상태 명찰 — 징표·가넷·내 연합(초록 테)·후보(빨간 깜빡임)·나를 향한 분위기. 누르면 캐릭터 카드 */
const natSc=(v,id)=>{ if(!natOn(v)||!v.nm.al.includes(id)) return null; const m=v.nm; const n=m.tot&&m.tot[id]!=null?m.tot[id]:m.chips&&typeof m.chips[id]==='number'?m.chips[id]:m.pen&&m.pen[id]!=null?-m.pen[id]:null; return typeof n==='number'?n:null; };   /* 🏅 게임 중 점수도 명찰에 (2026-11-11) */
function faceRow(v,me){ const P=pl(v,me); if(!P||P.out) return ''; const cur=v.face&&v.face[me]&&v.face[me].k; return `<div class="gn-face"><small>내 표정</small>${['calm','smug','blank','nerv','sweat','angry','think'].map(k=>`<button class="ghost small ${cur===k?'on':''}" data-gx="face" data-f="${k}" title="${FACE[k][1]}">${FACE[k][0]}</button>`).join('')}<small class="tip">동물들이 보고 눈치채요 — 연기도 돼요</small></div>`; }
function plates(v,me){ return `<div class="gn-np">${v.players.map(x=>{ const id=x.id, hum=isHum(id), r=!hum&&!x.out?rel(v,id,me):0, md=hum||x.out?'':r>.3?'😊':r<-.3?'😠':'';
    const bd=v.champ===id?'👑':x.out?(isDev(v)?'🏝️':'💀'):isDev(v)?(v.fed===id?'🎖️':v.home&&v.home[id]==='jail'?'⛓️':v.home&&v.home[id]==='live'?'🏠':''):v.cand===id?'⚖️':v.oppo===id?'⚔️':x.tok?'🛡️':'';
    return `<button class="np ${id===me?'me':''} ${!x.out&&id!==me&&isAlly(v,id,me)?'ally':''} ${(v.cand===id||v.oppo===id)&&!x.out&&!['afterDeath','rest'].includes(v.phase)?'hot':''} ${x.out?'dead':''} ${npSel===id?'sel':''}" data-np="${id}">${md?`<span class="md" title="나를 향한 분위기">${md}</span>`:''}${bd?`<span class="bd">${bd}</span>`:''}<span class="av">${emo(id)}</span>${(()=>{ const F=v.face&&v.face[id]; return F&&!x.out?`<span class="fc" title="표정: ${FACE[F.k][1]}${hum&&id!==me?' (사람이 지은 표정)':''}">${FACE[F.k][0]}</span>`:''; })()}<b>${U.esc(nm(id))}${id===me?'(나)':''}</b><small>${x.out?(isDev(v)?`${x.out}일차 유배`:`제${x.out}회 탈락`):`${CUR(v)}${x.g}${natSc(v,id)!=null?` <span class="np-sc">🏅${natSc(v,id)}</span>`:""}`}${!x.out&&condOf(v,id)?` ${COND[condOf(v,id).k][0]}`:''}</small></button>`; }).join('')}</div>`+(npSel&&pl(v,npSel)?charCard(v,npSel,me):''); }
function charCard(v,id,me){ const x=pl(v,id), hum=isHum(id), p=hum?null:ANI(id)||{}, A=allyU(v,me), r=hum?0:rel(v,id,me);
  const ab=p&&p.abil&&window.NPCS&&NPCS.ABIL?`<div class="cc-ab">${NPCS.ABIL.map(a=>`<span>${a.e} ${a.n}</span><i><s style="width:${(p.abil[a.k]||5)*10}%"></s></i><b>${p.abil[a.k]||5}</b>`).join('')}</div>`:'';
  return `<div class="gn-cc"><span class="av">${emo(id)}</span><div class="cc-t"><b>${U.esc(nm(id))}${id===me?' (나)':''}</b>${p?`<small>${U.esc(p.style||p.arch||'')}</small>`:''}
    <small>${v.face&&v.face[id]&&!x.out?`${FACE[v.face[id].k][0]} 표정 ${FACE[v.face[id].k][1]} · `:''}${x.out?(isDev(v)?`🏝️ ${x.out}일차 유배`:`💀 제${x.out}회 탈락`):`${CUR(v)} ${CURN(v)} ${x.g}${x.tok?' · 🛡️ 징표':''}`}${!hum&&!x.out?` · 나를 향한 분위기 ${r>.3?'😊 좋음':r<-.3?'😠 나쁨':'😐 보통'}`:''}${A&&A.mem.includes(id)&&id!==me?' · 🤝 내 연합':''}${v.stat&&v.stat.pred&&v.stat.pred[id]?` · 🔮 예측 ${v.stat.pred[id]}번 적중`:''}</small>
    ${p&&p.special?`<small>특기 ${U.esc(p.special)}${p.weak?` · 약점 ${U.esc(p.weak)}`:''}</small>`:''}${condOf(v,id)?(()=>{ const c=condOf(v,id), C=COND[c.k]; return `<small class="cc-cond">${C[0]} <b>${C[1]}</b> — ${U.esc(C[2])}${c.on?` (${U.esc(nm(c.on))})`:''}</small>`; })():''}</div>${ab}<button class="ghost small" data-np="${id}">닫기</button></div>`; }
/* 🗂️ 서랍 탭 — 💬 기록 · 🤫 귓속말 · 🤝 연합 · 🕸️ 관계 (새 귓속말·연합 말엔 빨간 숫자) */
function drawer(el,v,me){ const $q=x=>el.querySelector(x);
  const inc=Object.keys(v.dm||{}).filter(k=>k.startsWith(me+'|')).reduce((n,k)=>{ const a=k.split('|')[1]; return n+Math.max(0,(v.dm[k]||[]).filter(x=>x.from!==me).length-(dmSeen[a]||0)); },0);
  const myA=allyU(v,me), aN=Math.max(0,(myA?myA.chat.filter(x=>x.from!==me).length:0)-(dmSeen['@al']||0))+(v.alli||[]).filter(A=>A.inv[me]==='wait'&&!A.mem.includes(me)).length;
  const T=[['log','💬 기록',0],['dm','🤫 귓속말',drTab==='dm'?0:inc],['al','🤝 연합',drTab==='al'?0:aN],['rel','🕸️ 관계',0]];
  $q('#gnDrTabs').innerHTML=T.map(([k,n,b])=>`<button class="dr-tab ${drTab===k?'on':''}" data-dr="${k}">${n}${b?`<i class="dm-badge">${b}</i>`:''}</button>`).join('');
  $q('#gnPaneLog').hidden=drTab!=='log'; $q('#gnDmBox').hidden=!(drTab==='dm'||drTab==='al'); $q('#gnPaneRel').hidden=drTab!=='rel';
  $q('#gnDmTabs').hidden=drTab==='al'; el.querySelector('.gn-drawer').dataset.tab=drTab;
  if(drTab==='rel') $q('#gnPaneRel').innerHTML=relPane(v,me); }
/* 🕸️ 관계 탭 — R1 관계도(눌러서 그 사람 관계만) · R3 세력 지도. 공개 사건 + 내 연합(나만 보임) */
let relView='map', relSel=null;
const RK={ally:['🤝','#3bb36b','손잡음'],deal:['🟣','#7b5cd6','거래'],push:['👉','#e2574c','몰아가기·의심'],pick:['🎯','#e2574c','지목'],betray:['💔','#2b2a28','배신'],death:['⚔️','#8a6a10','데스매치'],vote:['🗳️','#c07a12','투표'],myal:['🤝','#3bb36b','내 연합']};
function relEdges(v,me){ const E=(v.evl||[]).slice(); for(const A of allysOf(v,me)) for(const x of A.mem) for(const y of A.mem) if(x<y) E.push({ep:v.ep,a:x,b:y,k:'myal',txt:`「${A.name}」 연합`}); return E; }
function relPane(v,me){ const E=relEdges(v,me), P=v.players;
  let h=`<div class="rel-tg"><button class="small ${relView==='map'?'':'ghost'}" data-rv="map">🕸️ 관계도</button><button class="small ${relView==='bloc'?'':'ghost'}" data-rv="bloc">🗺️ 세력</button></div>`;
  if(!E.length) return h+'<div class="dm-empty">아직 드러난 관계가 없어요 — 감싸기·몰아가기·지목·배신·거래가 생기면 여기 그려져요</div>';
  if(relView==='map'){ const n=P.length, pos=P.map((x,k)=>{ const a=-Math.PI/2+k*2*Math.PI/n; return [160+120*Math.cos(a),160+120*Math.sin(a)]; }), ix=id=>P.findIndex(x=>x.id===id);
    const pairs={}; for(const e of E){ const k=[e.a,e.b].sort().join('|'); (pairs[k]=pairs[k]||[]).push(e); }
    let g=''; for(const k in pairs){ const [a,b]=k.split('|'), L=pairs[k], last=L[L.length-1], K=RK[last.k]||RK.push, A_=pos[ix(a)], B_=pos[ix(b)]; if(!A_||!B_) continue; const on=relSel==null||a===relSel||b===relSel;
      g+=`<g opacity="${on?1:.08}"><line x1="${A_[0]}" y1="${A_[1]}" x2="${B_[0]}" y2="${B_[1]}" stroke="${K[1]}" stroke-width="${Math.min(7,1.5+L.length*1.2)}" ${last.k==='betray'?'stroke-dasharray="6 4"':''} opacity=".8"/><text x="${(A_[0]+B_[0])/2}" y="${(A_[1]+B_[1])/2+5}" text-anchor="middle" font-size="13">${[...new Set(L.map(e=>(RK[e.k]||RK.push)[0]))].join('')}</text></g>`; }
    g+=P.map((x,k)=>`<g class="rn ${x.id===me?'me':''} ${relSel===x.id?'on':''}" data-rn="${x.id}" ${x.out?'opacity=".45"':''}><circle cx="${pos[k][0]}" cy="${pos[k][1]}" r="22"/><text x="${pos[k][0]}" y="${pos[k][1]+8}" text-anchor="middle" font-size="22">${emo(x.id)}</text><text class="nm" x="${pos[k][0]}" y="${pos[k][1]+36}" text-anchor="middle">${U.esc(nm(x.id))}${x.out?' 💀':''}</text></g>`).join('');
    h+=`<svg class="rel-svg" viewBox="0 0 320 330">${g}</svg>`;
    const mine=relSel?E.filter(e=>e.a===relSel||e.b===relSel):E.slice(-8);
    h+=`<div class="rel-list"><b>${relSel?`${emo(relSel)} ${U.esc(nm(relSel))}의 관계`:'👆 동물을 누르면 그 관계만 · 최근 사건'}</b>${mine.slice(-10).reverse().map(e=>{ const K=RK[e.k]||RK.push; return `<div><small>제${e.ep}회</small> <span class="rk" style="color:${K[1]}">${K[0]} ${K[2]}</span> ${emo(e.a)}→${emo(e.b)} <small>${U.esc(e.txt)}</small></div>`; }).join('')}</div>`
      +'<div class="rel-lg">초록 = 손잡음 · 보라 = 거래 · 빨강 = 몰아가기·지목 · 점선 = 배신 · 굵을수록 사건 많음</div>';
    return h; }
  /* 🗺️ 세력: 사건으로 본 친밀도로 무리 묶기 */
  const ids=P.filter(x=>!x.out).map(x=>x.id), aff={}, key=(a,b)=>[a,b].sort().join('|'), add=(a,b,d)=>{ if(a===b) return; const k=key(a,b); aff[k]=(aff[k]||0)+d; };
  for(const e of E){ const d={ally:.35,deal:.4,myal:1,push:-.35,pick:-.6,betray:-.9,death:-.3}[e.k]||0; add(e.a,e.b,d); }
  for(const a of ids) for(const b of ids) if(a<b&&!isHum(a)&&!isHum(b)) add(a,b,((rel(v,a,b)+rel(v,b,a))/2)*.8);
  const grp={}; ids.forEach(x=>grp[x]=x); const find=x=>grp[x]===x?x:(grp[x]=find(grp[x]));
  Object.entries(aff).filter(([,v_])=>v_>=.4).sort((a,b)=>b[1]-a[1]).forEach(([k])=>{ const [a,b]=k.split('|'); if(ids.includes(a)&&ids.includes(b)) grp[find(a)]=find(b); });
  const G={}; ids.forEach(x=>(G[find(x)]=G[find(x)]||[]).push(x)); const solos=Object.values(G).filter(g=>g.length===1).flat(); const groups=Object.values(G).filter(g=>g.length>1).sort((a,b)=>b.length-a.length).concat(solos.length?[solos]:[]);   /* 혼자인 사람들은 한 칸에 */
  const A=allyU(v,me), lead=g=>g.slice().sort((a,b)=>E.filter(e=>e.a===b||e.b===b).length-E.filter(e=>e.a===a||e.b===a).length)[0];
  h+='<div class="blocs">'+groups.map(g=>{ const solo=g.every(x=>solos.includes(x)), mineG=!solo&&g.includes(me), al=A&&g.some(x=>x!==me&&A.mem.includes(x));
    return `<div class="bloc ${mineG?'mine':''} ${solo?'solo':''}"><b>${solo?'🧍 아직 무리 없음':mineG?'🐾 우리 쪽':`${emo(lead(g))} ${U.esc(nm(lead(g)))}파`}${al&&mineG?' <small>(내 연합 포함)</small>':''}</b><div>${g.map(x=>`<span>${emo(x)}<i>${U.esc(nm(x))}</i></span>`).join('')}</div></div>`; }).join('')+'</div>';
  const fights={}; for(const e of E){ if(!['push','pick','betray'].includes(e.k)) continue; const ga=find(e.a), gb=find(e.b); if(ga===gb||!ids.includes(e.a)||!ids.includes(e.b)) continue; const k=key(ga,gb); fights[k]=(fights[k]||0)+1; }
  const F=Object.entries(fights).sort((a,b)=>b[1]-a[1]).slice(0,4); if(F.length) h+='<div class="fights">'+F.map(([k,n])=>{ const [a,b]=k.split('|'); return `<span>⚔️ ${emo(lead(G[a]))}쪽 ↔ ${emo(lead(G[b]))}쪽 <small>${n}번 부딪힘</small></span>`; }).join('')+'</div>';
  return h+'<div class="rel-lg">공개된 사건과 분위기로 묶은 추정이에요. 비밀 연합은 내 것만 반영돼요.</div>'; }
/* 🚪 E2 방 지도 — 무대(휴식·로비·투표 등)에서: 라운지 + 밀실 A·B·테라스. 말은 머리 위 말풍선(한 사람당 하나, 겹치면 위로), 다른 방은 "💬 대화 중…"만 */
const MR={lounge:{x:1,y:44,w:98,h:54},a:{x:1,y:2,w:32,h:38},b:{x:34,y:2,w:32,h:38},c:{x:67,y:2,w:32,h:38}};
let mapSeen=null, mapBB={}, mapT=null, mapPlea=null;
function stageMap(el,v,ctx,me){ const st=el.querySelector('#gnStage'); const on=!v.sub&&!natOn(v)&&['opening','rest','lobby','vote','deathPick','afterDeath','finalWait','rescue','split','afterRev'].includes(v.phase);
  if(!on){ st.hidden=true; mapSeen=null; return; } st.hidden=false;   /* 다시 보일 땐 그동안 쌓인 말을 한꺼번에 띄우지 않음 */
  if(!st.querySelector('.mp')){ st.innerHTML=`<div class="mp">${['lounge','a','b','c'].map(k=>`<div class="mp-room" data-room="${k}" style="left:${MR[k].x}%;top:${MR[k].y}%;width:${MR[k].w}%;height:${MR[k].h}%"><b>${k==='lounge'?'🛋️ 라운지':ROOMS.find(r=>r.k===k).n}</b><span class="door"></span></div>`).join('')}<div class="mp-log"></div></div>`; mapBB={}; mapSeen=null; }
  const mp=st.querySelector('.mp'), now=Date.now(), meets=(v.meet||[]).filter(m=>m.until>now), where={};
  for(const p of v.players) if(!p.out) where[p.id]=locOf(v,p.id); for(const m of meets) for(const x of m.mem) if(where[x]) where[x]=m.room;
  const myRoom=where[me];
  for(const r of mp.querySelectorAll('.mp-room')){ const k=r.dataset.room, n=Object.values(where).filter(w=>w===k).length, mine=k===myRoom; r.classList.toggle('mine',mine); r.classList.toggle('talk',k!=='lounge'&&n>=2&&!mine); r.querySelector('.door').textContent=k!=='lounge'&&n>=2&&!mine?'💬 대화 중…':mine&&k!=='lounge'?(n>=2?'🤫 이 방만':'🧍 혼자'):!mine&&where[me]?'👉':''; r.querySelector('b').textContent=(k==='lounge'?'🛋️ 라운지':ROOMS.find(x=>x.k===k).n)+(mine?' · 나':''); }
  const inRoom={}; for(const id in where) (inRoom[where[id]]=inRoom[where[id]]||[]).push(id);
  for(const id in where){ let tk=mp.querySelector(`[data-tok="${id}"]`); if(!tk){ tk=document.createElement('div'); tk.className='mp-tok'+(id===me?' me':''); tk.dataset.tok=id; tk.innerHTML=`<span class="av">${emo(id)}</span><small>${U.esc(nm(id))}</small>`; mp.appendChild(tk); }
    const k=where[id], R=MR[k], L=inRoom[k], j=L.indexOf(id), per=k==='lounge'?8:4, col=j%per, row=Math.floor(j/per), cols=Math.min(per,L.length);
    tk.style.left=(R.x+R.w*((col+.5)/cols))+'%'; tk.style.top=(R.y+R.h*(k==='lounge'?.55:.62)+row*12)+'%'; tk.classList.toggle('hot',(v.cand===id||v.oppo===id)&&['lobby','deathPick'].includes(v.phase)); }
  for(const tk of mp.querySelectorAll('[data-tok]')) if(!where[tk.dataset.tok]) tk.remove();
  /* 새 말 → 말풍선 (처음 그릴 땐 지난 말은 안 띄움) */
  const pubN=v.chat.length, dms=Object.keys(v.dm||{}).filter(k=>k.startsWith(me+'|')), dmN=dms.reduce((n,k)=>n+(v.dm[k]||[]).length,0), myAs=allysOf(v,me);
  const first=mapSeen==null; if(first) mapSeen={pub:pubN,dm:{},al:Object.fromEntries(myAs.map(A=>[A.id,A.chat.length]))}; if(typeof mapSeen.al!=='object') mapSeen.al={};
  for(let i=mapSeen.pub;i<pubN;i++){ const c=v.chat[i]; if(c&&!c.note&&c.seat!=null&&where[c.seat]) mapBub(mp,c.seat,c.room?c.text.replace(/^🚪[^·]*· /,''):c.text,c.seat===me?'me':c.room?'wh':''); }
  mapSeen.pub=pubN;
  for(const k of dms){ const d=v.dm[k]||[], s0=mapSeen.dm[k]??(first?null:0); if(s0!=null) for(let i=s0;i<d.length;i++){ const x=d[i]; if(x.from===-1) continue; const who=x.from; if(where[who]) mapBub(mp,who,'🤫 '+x.text,who===me?'me':'wh'); } mapSeen.dm[k]=d.length; }
  for(const A of myAs){ const s0=mapSeen.al[A.id]??(first?A.chat.length:0); for(let i=s0;i<A.chat.length;i++){ const x=A.chat[i]; if(x&&x.from!==-1&&where[x.from]) mapBub(mp,x.from,'🤝 '+x.text,'al'); } mapSeen.al[A.id]=A.chat.length; }
  { const h=pleaMode?null:el.querySelector('#gnHint'), w=where[me], mates=w&&w!=='lounge'?Object.keys(where).filter(x=>x!==me&&where[x]===w):[]; if(h&&w) h.textContent=w!=='lounge'?(mates.length?`${roomName(w)} · 🔒 ${mates.map(nm).join('·')}`:`${roomName(w)} · 혼자`):'🛋️ 라운지 · 모두'; }
  mp.querySelector('.mp-log').innerHTML=(v.meetLog||[]).slice(-3).map(t=>`<div>👀 ${U.esc(t)}</div>`).join('');
  /* 만남이 끝나는 시각에 다시 그려 라운지로 돌아오게 */
  if(mapT) clearTimeout(mapT); const nx=meets.map(m=>m.until).sort((a,b)=>a-b)[0]; if(nx&&ctx.rerender) mapT=setTimeout(()=>ctx.rerender(),Math.max(50,nx-now+60));
  /* 🎤 최후 변론 — 지도 가운데 연단 + 조명, 말하는 사람은 연단으로, 듣는 동물은 제자리에서 ✅/❌ */
  { const S_=v.show, on=S_&&S_.k==='plea'&&Date.now()<S_.until+200; let pod=mp.querySelector('.mp-pod'); mp.classList.toggle('plea-on',!!on);
    if(!on){ if(pod) pod.remove(); for(const x of mp.querySelectorAll('.mp-tok.podium')) x.classList.remove('podium'); for(const x of mp.querySelectorAll('.mp-pj')) x.remove(); if(mapPlea){ clearInterval(mapPlea.iv); mapPlea=null; } }
    else { const w=S_.who; if(!pod){ pod=document.createElement('div'); pod.className='mp-pod'; mp.appendChild(pod); }
      if(pod.dataset.id!==String(S_.id)){ pod.dataset.id=S_.id; pod.innerHTML=`<div class="mp-light"></div><div class="mp-big"><small>🎤 최후 변론 · ${emo(w)} ${U.esc(nm(w))}${w===me?' (나)':''} — ${S_.judges.map(emo).join('')} 듣는 중</small><b class="tx"></b></div><div class="mp-ped">연단</div><button class="ghost small mp-skip" data-gx="skipShow">⏩ 넘기기</button>`;
        if(mapPlea) clearInterval(mapPlea.iv); const tx=S_.text||'', T=pod.querySelector('.tx'); mapPlea={id:S_.id,iv:setInterval(()=>{ const n=Math.max(0,Math.floor((Date.now()-S_.at-900)/45)); T.textContent=tx.slice(0,n)+(n<tx.length?'▍':''); if(n>=tx.length){ clearInterval(mapPlea.iv); } },60)}; for(const x of mp.querySelectorAll('[data-pj]')) x.remove(); }
      const tk=mp.querySelector(`[data-tok="${w}"]`); if(tk){ tk.classList.add('podium'); tk.style.left='50%'; tk.style.top='42%'; }
      const PL=(v.pleas||[]).find(x=>x.id===S_.pid);
      for(const j of S_.judges){ const jt=mp.querySelector(`[data-tok="${j}"]`); if(!jt) continue; let bd=jt.querySelector('.mp-pj'); if(!bd){ bd=document.createElement('span'); bd.className='mp-pj'; bd.dataset.pj=j; jt.appendChild(bd); }
        const r=PL&&PL.res&&PL.res[j]; bd.textContent=r?(r.moved?'✅':'❌'):'💭'; if(r&&!bd.dataset.said){ bd.dataset.said=1; mapBub(mp,j,(r.moved?'✅ ':'❌ ')+r.say,r.moved?'al':'no'); } } } }
  mp.onclick=e=>{ if(e.target.closest('[data-gx="skipShow"]')){ ctx.act({k:'skipShow'}); return; } const tk=e.target.closest('[data-tok]'); if(!tk||tk.dataset.tok===me){ const rm=e.target.closest('[data-room]'); const P=(v.players||[]).find(x=>x.id===me); if(rm&&P&&!P.out&&rm.dataset.room!==where[me]&&ctx.act) ctx.act({k:'go',room:rm.dataset.room}); return; } drTab='dm'; dmTo=tk.dataset.tok; if(ctx.rerender) ctx.rerender(); const i=document.getElementById('gnDm'); if(i) i.focus(); }; }
function mapBub(mp,id,text,cls){ const tk=mp.querySelector(`[data-tok="${id}"]`); if(!tk) return; if(mapBB[id]) mapBB[id].remove();
  const b=document.createElement('div'); b.className='mp-bub '+(cls||''); const tx=String(text); b.textContent=tx.length>70?tx.slice(0,68)+'…':tx; b.style.left=tk.style.left; mp.appendChild(b); { const W=mp.clientWidth, w=b.offsetWidth, cx=tk.offsetLeft, L=Math.max(w/2+4,Math.min(W-w/2-4,cx)); b.style.left=L+'px'; b.style.setProperty('--tail',(cx-L)+'px'); }   /* 끝자리(펭귄 등) 말풍선이 좁아져 세로로 길어지지 않게 안쪽으로 */
  const box=x=>({l:x.offsetLeft-x.offsetWidth/2,t:x.offsetTop,r:x.offsetLeft+x.offsetWidth/2,b:x.offsetTop+x.offsetHeight}), hit=(a,c)=>a.l<c.r+4&&c.l<a.r+4&&a.t<c.b+4&&c.t<a.b+4;
  let y=tk.offsetTop-26-b.offsetHeight; b.style.top=Math.max(0,y)+'px';
  for(let n=0;n<6;n++){ const m=box(b), o=Object.values(mapBB).filter(x=>x!==b&&x.isConnected).map(box).find(c=>hit(m,c)); if(!o) break; if(!b.dataset.pre){ b.dataset.pre=1; b.textContent=emo(id)+' '+b.textContent; } y=o.t-b.offsetHeight-6; b.style.top=y+'px'; b.classList.add('lift'); }
  mapBB[id]=b; setTimeout(()=>{ if(mapBB[id]===b){ b.remove(); delete mapBB[id]; } },Math.min(9000,3200+tx.length*60)); }
/* 🎬 연출 층 — 화면 위에 덮어서 재생. 같은 연출(id)은 한 번만 만들고(다시 그려도 처음부터 안 함), 시작 시각(at) 기준으로 이미 지난 장면은 바로 보여 줌 */
let shEl=null, shId=null, shT=[];
function showLayer(v,ctx,me){ window.__gnV=v; const S_=v.show, live=S_&&Date.now()<S_.until+200;
  if(!live||S_.k==='plea'){ if(shEl){ shEl.remove(); shEl=null; shId=null; shT.forEach(clearTimeout); shT=[]; } return; }   /* 🎤 변론은 지도 위 연단에서 (시안 5차 B) */
  if(shId===S_.id&&shEl) return; if(shEl) shEl.remove(); shT.forEach(clearTimeout); shT=[];
  shId=S_.id; shEl=document.createElement('div'); shEl.className='gx-ov'; document.body.appendChild(shEl);
  const el0=Date.now()-S_.at, at=(ms,f)=>{ const d=ms-el0; if(d<=0) f(true); else shT.push(setTimeout(()=>f(false),d)); }, snd=k=>{ try{ ctx.sfx&&ctx.sfx(k); }catch(_){} };
  shT.push(setTimeout(()=>{ if(shEl&&shId===S_.id){ shEl.remove(); shEl=null; shId=null; } },Math.max(0,S_.until-Date.now()+250)));
  const skip='<button class="ghost small gx-skip" data-gx="skipShow">⏩ 넘기기</button>';
  shEl.onclick=e=>{ if(e.target.closest('[data-gx="skipShow"]')) ctx.act({k:'skipShow'}); };
  const fj=()=>{ try{ if(typeof fixJosa==='function'&&shEl) fixJosa(shEl); }catch(_){} }; shT.push(setTimeout(fj,0)); shT.push(setTimeout(fj,9000));   /* 연출 층은 body에 붙어서 core의 조사 다듬기가 안 닿음 — "여우이(가)" */
  if(S_.k==='result'||S_.k==='team'){ const G=G_(S_.game)||{};
    if(S_.k==='team'){ shEl.innerHTML=`<div class="gx-box"><div class="gx-host" id="gxH">🎙️ 제${v.ep}회 「${U.esc(G.title||'')}」 결과!</div><div class="gx-team"><div class="fc" id="gxW"><div class="fc-in"><div class="fc-b">?</div><div class="fc-f"><span class="lb">🏅 이긴 팀 · 🟣+2</span><span class="tm">${S_.win.map(emo).join('')}</span><small>${S_.win.map(x=>U.esc(nm(x))).join(' · ')}</small></div></div></div><div class="fc red" id="gxL"><div class="fc-in"><div class="fc-b">?</div><div class="fc-f"><span class="lb">💀 진 팀 — 투표로 후보</span><span class="tm">${S_.lose.map(emo).join('')}</span><small>${S_.lose.map(x=>U.esc(nm(x))).join(' · ')}</small></div></div></div></div>${skip}</div>`;
      at(1300,q=>{ shEl.querySelector('#gxW').classList.add('on','gold'); if(!q) snd('win'); }); at(2800,q=>{ shEl.querySelector('#gxL').classList.add('on'); if(!q) snd('lose'); }); return; }
    const o=S_.order, n=o.length, sc=S_.sc, L=isDev(v)?['🎖️ 연맹 · 🧩+3','🧩+2','🧩+1']:['🛡️ 징표 · 🟣+3','🟣+2','🟣+1'];
    shEl.innerHTML=`<div class="gx-box"><div class="gx-host" id="gxH">🎙️ ${EPN(v,v.ep)} 「${U.esc(G.title||'')}」 결과 — 꼴찌부터 공개합니다</div><div class="gx-grid" style="--n:${Math.min(4,n)}">${o.map((x,k)=>`<div class="fc ${x===me?'mine':''}" data-r="${k}"><div class="fc-in"><div class="fc-b">?</div><div class="fc-f"><span class="rk">${k+1}위</span><span class="av">${emo(x)}</span><span class="nm">${U.esc(nm(x))}${x===me?' (나)':''}</span>${sc&&sc[x]!=null?`<span class="sc">${sc[x]}${U.esc(S_.unit||'점')}</span>`:''}${k<3&&k<n-1?`<span class="lb">${L[k]}</span>`:k===n-1?`<span class="lb">${isDev(v)?'🏝️ 유배':'🔻 꼴찌'}</span>`:''}</div></div></div>`).join('')}</div>${skip}</div>`;
    const H=t=>{ const h=shEl.querySelector('#gxH'); if(h) h.textContent=t; }; let tm=1200;
    for(let k=n-1;k>=0;k--){ if(k===n-1){ at(tm,()=>H(`🎙️ ${n}위는…`)); tm+=900; } if(k===0){ at(tm,q=>{ H('🎙️ 그리고 1위는…'); if(!q) snd('drum'); }); tm+=1400; }
      const kk=k, T=tm; at(T,q=>{ const c=shEl.querySelector(`[data-r="${kk}"]`); if(!c) return; c.classList.add('on'); if(kk===n-1){ c.classList.add('red'); H(`🔻 ${n}위 ${nm(o[kk])}`); } if(kk===0){ c.classList.add('gold'); H(`🏅 1위 ${nm(o[0])} — ${isDev(v)?'🎖️ 연맹의 징표!':'생명의 징표!'}`); } if(!q) snd(kk===n-1?'lose':kk===0?'win':'card'); });
      tm+= k===n-1?1200:k===0?0:560; } return; }
  if(S_.k==='pick'){ const pool=S_.pool, ti=pool.indexOf(S_.t), total=pool.length*3+ti;
    shEl.innerHTML=`<div class="gx-box"><div class="gx-host">⚖️ 후보 ${emo(S_.c)} <b>${U.esc(nm(S_.c))}</b>이(가) 상대를 고르는 중…</div><div class="gx-rl">${pool.map((x,k)=>`<div data-k="${k}"><span class="av">${emo(x)}</span><b>${U.esc(nm(x))}${x===me?' (나)':''}</b></div>`).join('')}</div><div class="gx-bub" id="gxB"></div>${skip}</div>`;
    let tm=300, d=70; for(let i=0;i<=total;i++){ const k=i%pool.length, last=i===total; at(tm,q=>{ shEl.querySelectorAll('.gx-rl div').forEach(x=>x.classList.remove('hl')); const c=shEl.querySelector(`.gx-rl [data-k="${k}"]`); if(!c) return;
        if(last){ c.classList.add('hit'); c.insertAdjacentHTML('beforeend','<span class="stamp">👉 지목!</span>'); if(!q) snd('boom'); } else { c.classList.add('hl'); if(!q) snd('tick'); } }); tm+=d; if(i>total-8) d*=1.32; }
    at(tm+500,()=>{ const b=shEl.querySelector('#gxB'); if(b&&S_.say){ b.innerHTML=`${emo(S_.c)} <b>${U.esc(nm(S_.c))}</b>: "${U.esc(S_.say)}"`; b.classList.add('on'); fj(); } }); return; }
  if(S_.k==='plea'){ const w=S_.who;
    shEl.innerHTML=`<div class="gx-box gx-dark gx-plea"><div class="spot"></div><div class="gx-host">🎤 최후 변론</div><div class="pl-who"><span class="av">${emo(w)}</span><b>${U.esc(nm(w))}${w===me?' (나)':''}</b></div><div class="pl-text" id="gxPT"></div>
      <div class="pl-judge">${S_.judges.map(j=>`<div data-j="${j}"><span class="av">${emo(j)}</span><b>${U.esc(nm(j))}</b><i>💭</i><small></small></div>`).join('')}</div>${skip}</div>`;
    at(300,q=>{ if(!q) snd('drum'); }); const T=shEl.querySelector('#gxPT'); let i=0; const tx=S_.text;
    at(900,q=>{ if(q){ const e0=Date.now()-S_.at-900; i=Math.min(tx.length,Math.floor(e0/45)); T.textContent=tx.slice(0,i); } const type=()=>{ if(!shEl||shId!==S_.id) return; if(i<tx.length){ T.textContent+=tx[i++]; shT.push(setTimeout(type,45)); } }; type(); });
    const poll=()=>{ if(!shEl||shId!==S_.id) return; const V=window.__gnV||v, P=(V.pleas||[]).find(x=>x.id===S_.pid); if(P) for(const j in P.res){ const d=shEl.querySelector(`[data-j="${j}"]`); if(d&&!d.dataset.done){ d.dataset.done=1; d.classList.add(P.res[j].moved?'yes':'no'); d.querySelector('i').textContent=P.res[j].moved?'✅ 설득됨':'❌ 글쎄요'; d.querySelector('small').textContent=P.res[j].say; snd(P.res[j].moved?'score':'bad'); } } shT.push(setTimeout(poll,350)); };
    at(1500,()=>poll()); return; }
  if(S_.k==='out'){ const l=S_.l, hum=isHum(l), p=hum?null:ANI(l)||{};
    shEl.innerHTML=`<div class="gx-box gx-dark"><div class="ec" id="gxC"><span class="av">${emo(l)}</span><b>${U.esc(nm(l))}${l===me?' (나)':''}</b><small>${U.esc(p?p.style||'':'사람 참가자')}</small><svg class="crack" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M55 0 L48 22 L58 34 L44 52 L56 66 L46 100" stroke="#2b2a28" stroke-width="1.6" fill="none"/><path d="M48 22 L30 30 M58 34 L76 40 M44 52 L24 58" stroke="#2b2a28" stroke-width="1" fill="none"/></svg><div class="dstamp">${isDev(v)?`🏝️ ${v.ep}일차 유배`:`💀 제${v.ep}회 탈락`}</div></div><div class="last" id="gxL2"><small>${emo(l)} ${U.esc(nm(l))}의 마지막 한마디</small><span id="gxT"></span></div><div class="gx-sub">${isDev(v)?'⛓️':'⚔️'} ${emo(S_.w)} ${U.esc(nm(S_.w))} 생존</div>${skip}</div>`;
    const C=shEl.querySelector('#gxC'); at(500,q=>{ C.classList.add('shk'); if(!q) snd('boom'); }); at(1000,()=>{ C.classList.add('gray'); C.querySelector('.crack').classList.add('on'); }); at(1700,q=>{ C.querySelector('.dstamp').classList.add('on'); if(!q) snd('lose'); });
    at(2600,()=>{ const L2=shEl.querySelector('#gxL2'); L2.classList.add('on'); const T=shEl.querySelector('#gxT'); let txt=null, i=0;
      const tick=()=>{ if(!shEl||shId!==S_.id) return; const V=window.__gnV||v; if(txt==null){ txt=hum?(l===me?(isDev(V)?'유배지에서 기다릴게요 — 🔥 패자부활전이 열릴지도':'수고했어요! 이제 🔮 예측으로 함께해요'):'수고하셨어요! 관전으로 함께해요 👋'):(V.byeTxt&&V.byeTxt[l])||null; if(txt==null){ T.textContent='💭 …'; shT.push(setTimeout(tick,300)); return; } T.textContent=''; }
        if(i<txt.length){ T.textContent+=txt[i++]; shT.push(setTimeout(tick,38)); } };
      tick(); }); return; } }
/* 📰 회차 리포트 화면(S1+S3) — 탈락 연출 뒤 무대에, 기록 탭에서 다시 열기 */
/* 📰 회차 리포트 A안 (2026-11-12) — 한 줄 요약 + 줄거리 + 4막 타임라인, 나머지(명장면·판 흐름·숫자·상·물밑)는 접기 */
const BK={lead:'🔝',last:'⬇️',round:'🫘',broke:'💔',bust:'💥',hit:'🔫',fail:'🏮',reveal:'🂠'};
function repHTML(v,R,me){ if(!R) return ''; if(!R.acts) return repOld(v,R,me);
  const G=R.game&&G_(R.game), pend=!(R.recapAI||R.ai)&&window.AIB&&AIB.on();
  const res=[R.order?`<span class="chipb c-ally">🏅 ${emo(R.order[0])} ${U.esc(nm(R.order[0]))}</span>`:R.team?`<span class="chipb c-ally">🏅 ${R.team.map(emo).join('')}</span>`:'',`<span class="chipb">⚔️ 생존 ${emo(R.w)} ${U.esc(nm(R.w))}</span>`,`<span class="chipb c-bet">💀 ${emo(R.l)} ${U.esc(nm(R.l))}</span>`].join('');
  const act=a=>`<div class="ra-act"><div class="ic">${a.ic}</div><div class="bd"><h4>${U.esc(a.title)}${a.sub?` <small>${U.esc(a.sub)}</small>`:''}</h4><p>${U.esc(a.text)}</p>
    ${a.strip&&a.strip.length?`<div class="ra-strip">${a.strip.map(b=>`<span>${b.r?`<i>${b.r}R</i>`:''}${BK[b.k]||'•'} ${U.esc(b.t)}</span>`).join('')}</div>`:''}
    ${a.key?`<div class="ra-key"><b>⚡ 결정적 순간${a.key.when?` — ${U.esc(a.key.when)}`:''}</b>${U.esc(a.key.text)}</div>`:''}
    ${a.chips&&a.chips.length?`<div class="ra-chips">${a.chips.map(c=>`<span class="chipb">${U.esc(c)}</span>`).join('')}</div>`:''}</div></div>`;
  const under=[R.secret?`🤫 ${U.esc(R.secret)}`:'',...(R.bonds||[]).slice(0,1).map(x=>`${x.tag} ${emo(x.a)}→${emo(x.b)} ${U.esc(x.why)}`),...(R.chg||[]).slice(0,2).map(x=>`${emo(x.id)} ${COND[x.k][0]} ${COND[x.k][1]}`)].filter(Boolean);
  return `<div class="rep repA"><div class="ra-hd"><small>📰 ${EPN(v,R.ep)}${G?` · ${G.emoji} ${U.esc(G.title)}`:''}${R.sub?` · ${U.esc(R.sub.replace(/^「[^」]*」\s*·?\s*/,''))}`:''}</small><h3>${U.esc(R.headline||'')}</h3>${R.syn?`<p>${U.esc(R.syn)}</p>`:''}${pend?'<p class="rep-wait">✍️ 작가가 이번 화를 정리 중…</p>':''}</div>
   <div class="ra-res">${res}</div><div class="ra-acts">${R.acts.map(act).join('')}</div>
   ${R.next?`<div class="rep-next">🔜 <b>다음 회 예고</b> — ${U.esc(R.next)}</div>`:''}
   <details class="ra-more"><summary>▾ 더 보기 — 명장면 · 판 흐름 · 숫자 · 상${under.length?' · 물밑':''}</summary><div class="rep-bd">
   ${R.scenes&&R.scenes.length?`<div><h4>🎬 명장면</h4>${R.scenes.map(x=>`<div class="rep-sc"><span class="av">${emo(x.id)}</span><div>${x.tag?`<span class="chipb c-deal">${U.esc(x.tag)}</span> `:''}<q>${U.esc(x.q)}</q><small>${U.esc(nm(x.id))} — ${U.esc(x.why||'')}</small></div></div>`).join('')}</div>`:''}
   ${R.flow&&R.flow.pts&&R.flow.pts.length>2?`<div><h4>📈 판 흐름</h4>${flowSVG(v,R,me)}</div>`:''}
   <div><h4>🔢 숫자로 보는 ${EPN(v,R.ep)}</h4><div class="rep-st"><div><b>${R.stats.dm}</b><small>🤫 귓속말</small></div><div><b>${R.stats.meet}</b><small>👀 밀실 만남</small></div><div><b>${R.stats.push}</b><small>👉 지목·몰아가기</small></div><div><b>${R.stats.betray}</b><small>💔 배신</small></div></div></div>
   <div><h4>🏅 이번 회 상</h4><div class="rep-aw">${R.awards.map(([i,n,id])=>`<div><span>${i}</span><b>${n}</b><small>${emo(id)} ${U.esc(nm(id))}</small></div>`).join('')}</div></div>
   ${under.length?`<div><h4>🤫 물밑 이야기 <small>— 시청자만 앎</small></h4><div class="ra-under">${under.map(x=>`<div>${x}</div>`).join('')}</div></div>`:''}
   </div></details></div>`; }
function repOld(v,R,me){ if(!R) return ''; const G=R.game&&G_(R.game), K={ally:['🤝','c-ally'],deal:['🟣','c-deal'],betray:['💔','c-bet'],pick:['👉','c-push']};
  return `<div class="rep"><div class="rep-hd"><small>📰 ${EPN(v,R.ep)} 리포트${G?` · ${G.emoji} ${U.esc(G.title)}`:''}</small><h3>${U.esc(R.headline||'')}</h3>${R.sub?`<p>${U.esc(R.sub)}</p>`:''}${R.ai?'':'<p class="rep-wait">✍️ 작가가 정리 중…</p>'}</div><div class="rep-bd">
   ${R.order?`<div><h4>📊 결과</h4><div class="rep-ord">${R.order.map((x,k)=>`<span class="${k===0?'top':k===R.order.length-1?'last':''} ${x===me?'me':''}"><i>${k+1}</i>${emo(x)}<b>${U.esc(nm(x))}</b></span>`).join('')}</div></div>`:R.team?`<div><h4>📊 결과</h4><div class="rep-ord"><span class="top">🏅 이긴 팀 ${R.team.map(emo).join('')}</span></div></div>`:''}
   <div><h4>📺 사건 흐름 <small>— ${EPN(v,R.ep)} 후기</small></h4>${R.beats&&R.beats.length?`<div class="rep-beats">${R.beats.map((b,k)=>`<div class="rb"><div class="rb-n">${k+1}</div><div class="rb-b"><span class="rb-when">${U.esc(b.when||'')}</span><b>${U.esc(b.title)}</b><p>${U.esc(b.story)}</p>${b.q&&b.id?`<q>${emo(b.id)} ${U.esc(nm(b.id))}: “${U.esc(b.q)}”</q>`:''}</div></div>`).join('')}</div>`:'<p class="rep-wait">✍️ 후기 쓰는 중… (속마음까지 모아서 정리하고 있어요)</p>'}</div>
   ${R.flow&&R.flow.pts&&R.flow.pts.length>2?`<div><h4>📈 판 흐름</h4>${flowSVG(v,R,me)}</div>`:''}
   <div><h4>🔢 숫자로 보는 ${EPN(v,R.ep)}</h4><div class="rep-st"><div><b>${R.stats.dm}</b><small>🤫 귓속말</small></div><div><b>${R.stats.meet}</b><small>👀 밀실 만남</small></div><div><b>${R.stats.push}</b><small>👉 지목·몰아가기</small></div><div><b>${R.stats.betray}</b><small>💔 배신</small></div></div></div>
   ${R.scenes&&R.scenes.length?`<div><h4>🎬 명장면</h4>${R.scenes.map(x=>`<div class="rep-sc"><span class="av">${emo(x.id)}</span><div>${x.tag?`<span class="chipb c-deal">${U.esc(x.tag)}</span> `:''}<q>${U.esc(x.q)}</q><small>${U.esc(nm(x.id))} — ${U.esc(x.why||'')}</small></div></div>`).join('')}</div>`:''}
   ${R.rel.length?`<div><h4>🕸️ 관계 변화</h4><div class="rep-rel">${R.rel.map(x=>`<span class="chipb ${(K[x.k]||K.pick)[1]}">${(K[x.k]||K.pick)[0]} ${emo(x.a)}→${emo(x.b)}</span>`).join('')}</div></div>`:''}
   ${R.bonds&&R.bonds.length?`<div><h4>💞 마음이 움직인 순간</h4><div class="rep-bond">${R.bonds.map(x=>`<div><span class="chipb c-deal">${x.tag}</span> ${emo(x.a)} <b>${U.esc(nm(x.a))}</b> → ${emo(x.b)} <b>${U.esc(nm(x.b))}</b><small>${U.esc(x.why)}</small></div>`).join('')}</div></div>`:''}
   ${R.chg.length||(R.grow&&R.grow.length)?`<div><h4>😈 캐릭터 변화</h4><div class="rep-rel">${R.chg.map(x=>`<span>${emo(x.id)} <b>${COND[x.k][0]} ${COND[x.k][1]}</b>${x.on?` <small>(${U.esc(nm(x.on))})</small>`:''}</span>`).join('')}${(R.grow||[]).map(x=>`<span>${emo(x.id)} 🌱 <small>${U.esc(x.why)}</small></span>`).join('')}</div></div>`:''}
   <div><h4>${isDev(v)?'⛓️ 감옥 매치':'⚔️ 데스매치'}</h4><div class="rep-death"><span class="vs">${emo(R.w)} <small>vs</small> <s>${emo(R.l)}</s></span><span>${R.dg&&G_(R.dg)?`${G_(R.dg).emoji} ${U.esc(G_(R.dg).title)} — `:''}<b>${U.esc(nm(R.w))}</b> 생존 · 💀 <b>${U.esc(nm(R.l))}</b> 탈락${v.byeTxt&&v.byeTxt[R.l]?`<q>${emo(R.l)} "${U.esc(v.byeTxt[R.l])}"</q>`:''}</span></div></div>
   <div><h4>🏅 이번 회 상</h4><div class="rep-aw">${R.awards.map(([i,n,id])=>`<div><span>${i}</span><b>${n}</b><small>${emo(id)} ${U.esc(nm(id))}</small></div>`).join('')}</div></div>
   ${R.next?`<div class="rep-next">🔜 <b>다음 회 예고</b> — ${U.esc(R.next)}</div>`:''}</div></div>`; }
function flowSVG(v,R,me){ const F=R.flow, pts=F.pts, ids=Object.keys(pts[pts.length-1]), W=560,H=220,Lp=40,Rp=96,T=12,B=26, all=pts.flatMap(p=>Object.values(p)), mn=Math.min(0,...all), mx=Math.max(1,...all);
  const x=i=>Lp+(W-Lp-Rp)*i/(pts.length-1), y=val=>T+(H-T-B)*(1-(val-mn)/(mx-mn||1)), last=pts[pts.length-1], top=ids.slice().sort((a,b)=>last[b]-last[a])[0];
  let h=''; const step=Math.max(1,Math.ceil((mx-mn)/5/5)*5); for(let g=Math.ceil(mn/step)*step;g<=mx;g+=step) h+=`<line x1="${Lp}" x2="${W-Rp}" y1="${y(g)}" y2="${y(g)}" stroke="#ece6d9" stroke-width="${g===0?1.5:1}"/><text x="${Lp-6}" y="${y(g)+4}" text-anchor="end" font-size="10" fill="#6f695f">${g}</text>`;
  pts.forEach((_,i)=>h+=`<text x="${x(i)}" y="${H-8}" text-anchor="middle" font-size="10" fill="#6f695f">${i?i+'R':'시작'}</text>`);
  const LY={}; { let lst=-1e9; for(const id of ids.slice().sort((a,b)=>y(last[a])-y(last[b]))){ const yy=Math.max(y(last[id]),lst+13); LY[id]=yy; lst=yy; } }
  for(const id of ids.slice().sort((a,b)=>(a===me||a===top?1:0)-(b===me||b===top?1:0))){ const k=id===me?'me':id===top?'top':'', col=k==='me'?'#2a78d6':k==='top'?'#eb6834':'#cfc8ba', P=pts.map((p,i)=>`${x(i)},${y(p[id]||0)}`).join(' ');
    h+=`<polyline points="${P}" fill="none" stroke="#fffdf8" stroke-width="${k?6:4}"/><polyline points="${P}" fill="none" stroke="${col}" stroke-width="${k?2.5:1.5}" stroke-linejoin="round" stroke-linecap="round"/>`;
    if(k) h+=pts.map((p,i)=>i?`<circle cx="${x(i)}" cy="${y(p[id]||0)}" r="4" fill="${col}" stroke="#fffdf8" stroke-width="2"><title>${nm(id)} ${i}R: ${p[id]}</title></circle>`:'').join('');
    h+=`<text x="${x(pts.length-1)+8}" y="${LY[id]+4}" font-size="${k?11.5:10.5}" font-weight="${k?800:500}" fill="${k?'#2b2a28':'#6f695f'}">${emo(id)} ${U.esc(nm(id))} ${last[id]}</text>`; }
  return `<div class="rep-flow"><div class="rep-flg"><span><i style="background:#2a78d6"></i>나</span><span><i style="background:#eb6834"></i>1위</span><span><i style="background:#cfc8ba"></i>나머지</span><small>점 위에 올리면 그 라운드 점수</small></div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="라운드별 누적 ${U.esc(F.unit||'점수')}">${h}</svg></div>`; }
function repStage(el,v,me){ const st=el.querySelector('#gnStage'); if(v.phase!=='afterDeath'||showOn(v)) { const r=st.querySelector('.rep-stage'); if(r) r.remove(); return; }
  const R=v.rep&&v.rep[v.ep]; if(!R) return; st.hidden=false; const mp=st.querySelector('.mp'); if(mp) mp.hidden=true; let box=st.querySelector('.rep-stage'); if(!box){ box=document.createElement('div'); box.className='rep-stage'; st.appendChild(box); }
  const sig=R.ep+':'+(R.ai?1:0)+(R.recapAI?1:0)+(R.headline||'').length+':'+(v.byeTxt&&v.byeTxt[R.l]?1:0); if(box.dataset.sig!==sig){ box.dataset.sig=sig; box.innerHTML=repHTML(v,R,me); } }
function repOpen(ep,v){ const R=v.rep&&v.rep[ep]; if(!R) return; const me='h'+((el=>el&&el._ctx&&el._ctx.me)(document.querySelector('[data-gn]')&&document.querySelector('[data-gn]').parentNode)??0);
  const o=document.createElement('div'); o.className='gx-ov rep-ov'; o.innerHTML=`<div class="rep-modal"><button class="ghost small gx-skip" data-x="close">✕ 닫기</button>${repHTML(v,R,me)}</div>`; o.onclick=e=>{ if(e.target===o||e.target.closest('[data-x="close"]')) o.remove(); }; document.body.appendChild(o); try{ if(typeof fixJosa==='function') fixJosa(o); }catch(_){} }   /* body에 붙는 창은 core의 조사 고치기를 안 거침 */
/* 📜 시즌 연대기(S4) — 기록 탭 맨 위, 회차 카드를 누르면 리포트 */
function chronHTML(v){ if(!v.eps.length) return ''; return `<div class="chron2">${v.eps.slice().reverse().map(e=>{ const R=v.rep&&v.rep[e.ep], G=e.game&&G_(e.game);
    return `<button class="ec2" ${R?`data-rep="${e.ep}"`:''}><span class="n">${EPN(v,e.ep)} ${G?G.emoji:''}</span><b>${R&&R.headline?U.esc(R.headline):G?U.esc(G.title):''}</b><small>${e.team?`🏅 ${e.team.map(emo).join('')}`:e.order?`🏅 ${emo(e.order[0])} ${U.esc(nm(e.order[0]))}`:''}${e.dl?` · 💀 ${emo(e.dl)} ${U.esc(nm(e.dl))}`:''}</small>${R?'<i>📰 리포트</i>':''}</button>`; }).join('')}</div>`; }
/* 🏛️ 명예의 전당(아이디어 7) — 시즌이 끝나면 이 브라우저에 기록(홈 시즌 입구 아래에 보임) */
let hofDone=null;
function hofSave(v,me){ if(v.phase!=='champ'||!v.champ) return; const key=(v.players||[]).map(x=>x.id).join(',')+':'+v.champ+':'+v.ep; if(hofDone===key) return; hofDone=key;
  try{ const L=JSON.parse(localStorage.getItem('ms-hof')||'[]'); if(L.some(x=>x.key===key)) return; const top=o=>Object.entries(o||{}).sort((a,b)=>b[1]-a[1])[0];
    const aw=[]; { const t=top(v.stat&&v.stat.betray); if(t) aw.push(`🗡️ 배신왕 ${emo(t[0])} ${nm(t[0])}`); } { const t=top(v.stat&&v.stat.survive); if(t) aw.push(`⚔️ 생존왕 ${emo(t[0])} ${nm(t[0])}`); } { const t=top(v.stat&&v.stat.pred); if(t) aw.push(`🔮 예언왕 ${emo(t[0])} ${nm(t[0])}`); }
    const hl=Object.values(v.rep||{}).map(R=>R.headline).filter(Boolean).slice(-1)[0]||'';
    L.unshift({key,at:Date.now(),champ:`${emo(v.champ)} ${nm(v.champ)}`,me:v.champ===me,aw,hl,n:v.players.length}); localStorage.setItem('ms-hof',JSON.stringify(L.slice(0,20))); }catch(_){} }
/* 🔔 내 차례·귓속말 알림 (아이디어 3) — 다른 창을 보고 있으면 탭 제목이 깜빡이고 소리 */
let alKey=null, alDm=null, alBlink=null, alTitle=null;
function alertCheck(v,ctx,me,out){ let need='';
  if(!out){ const V=v.vote; if(v.phase==='vote'&&V&&V.pool.includes(me)&&!V.votes[me]) need='🗳️ 투표할 차례';
    else if(v.phase==='lobby'&&v.cand===me) need='👉 지목할 차례'; else if(v.phase==='deathPick'&&v.oppo===me) need='🎮 게임 고를 차례';
    else if(v.turn===ctx.me||(v.nm&&v.nm.turn===me)) need='🎯 내 차례'; }
  const dmN=Object.keys(v.dm||{}).filter(k=>k.startsWith(me+'|')).reduce((n,k)=>n+(v.dm[k]||[]).filter(x=>x.from!==me&&x.from!==-1).length,0);
  const newDm=alDm!=null&&dmN>alDm; alDm=dmN; if(newDm&&!need) need='🤫 새 귓속말';
  const key=need?need+':'+v.ep+':'+v.phase:''; if(key&&key!==alKey&&(document.hidden||need==='🤫 새 귓속말')){ try{ ctx.sfx&&ctx.sfx(need==='🤫 새 귓속말'?'emo':'turn'); }catch(_){} if(document.hidden) blinkTitle('🔔 '+need); }
  alKey=key||alKey; if(!need) alKey=null; }
function blinkTitle(t){ if(alBlink) clearInterval(alBlink); if(alTitle==null) alTitle=document.title; let on=false; alBlink=setInterval(()=>{ on=!on; document.title=on?t:alTitle; },900);
  const stop=()=>{ if(!document.hidden){ clearInterval(alBlink); alBlink=null; document.title=alTitle; alTitle=null; document.removeEventListener('visibilitychange',stop); } }; document.addEventListener('visibilitychange',stop); }
function subCtx(v,ctx){ const sub=v.sub; return Object.assign({},ctx,{season:true, me:sub.sp, act:a=>ctx.act({k:'sub',a}), name:sp=>nm(sub.hp[sp]), myTurn:sub.st&&sub.st.turn===sub.sp,
  turnText:x=>x.turn===sub.sp?'내 차례':`${nm(sub.hp[x.turn])} 차례…`}); }
function render(el,v,ctx){ if(window.AIB&&typeof mode!=='undefined'&&(mode==='solo'||mode==='host')) AIB.start();   /* 🤖 AI 다리 찾기(방장·혼자만) */
  const me='h'+ctx.me, P_=(v.players||[]).find(x=>x.id===me), out=!P_||P_.out;
  if(!el.querySelector('[data-gn]')){
    /* 🖥️ L2 무대 중심 (2026-11-11 사용자 고름): 위 단계·명찰 → 가운데 무대(게임판·진행 카드·말하기) → 오른쪽 서랍(기록·귓속말·연합·관계 탭) */
    el.innerHTML=`<div class="gn" data-gn><div class="gn-top" id="gnTop"></div><div id="gnFull"></div>
      <div class="gn2" id="gnHub"><div class="gn-main"><div class="gn-mc" id="gnMc"></div><div id="gnSubWrap"></div><div class="gn-stage" id="gnStage"></div><div id="gnCard"></div>
        <div class="gn-say"><small id="gnHint">테이블 대화 — 모두에게 들려요. 이름을 부르면 그 동물이 대답해요</small><div style="display:flex;gap:6px;margin-top:6px"><input id="gnIn" maxlength="200" autocomplete="off" placeholder="아무 말이나 — 이름을 부르면 대답해요" style="flex:1;min-width:0"><button data-gx="send">보내기</button></div></div></div>
        <aside class="gn-drawer"><div class="dr-tabs" id="gnDrTabs"></div>
          <div class="dr-pane" id="gnPaneLog"><div id="gnRecs"></div><div id="gnChat"></div></div>
          <div class="dr-pane ga-dm" id="gnDmBox"><div class="dm-tabs" id="gnDmTabs"></div><div class="dm-thread" id="gnDmList"></div><div class="dm-send"><input id="gnDm" maxlength="200" autocomplete="off" placeholder="몰래 할 말"><button data-gx="dm">보내기</button></div></div>
          <div class="dr-pane" id="gnPaneRel"></div><div id="gnUse"></div></aside></div></div>`;
    el.onclick=e=>onClick(e,ctx); el.onkeydown=e=>{ if(e.key!=='Enter'||e.isComposing) return; if(e.target.id==='gnIn') sendChat(ctx); if(e.target.id==='gnDm') sendDm(ctx); }; }
  el._ctx=ctx; el._v=v;
  const $q=x=>el.querySelector(x);
  /* 위 띠: 회차·단계·참가자 */
  $q('#gnTop').innerHTML=`<div class="gn-ep"><b>${isDev(v)?'😈':'🏆'} 놀이터</b> <span>${v.ep?EPN(v,v.ep):'개막식'}</span>${stepsHTML(v)}${dlChip(v)}<small class="gn-left">남은 ${alive(v).length}명</small>${aiOn()?'<small class="gn-ai">🤖 AI 켜짐</small>':(ctx.mode!=='guest'?'<small class="gn-ai off">🤖 AI 다리 꺼짐 — 단순 규칙</small>':'')}</div>`+plates(v,me)+faceRow(v,me);
  { const m=$q('#gnMc'); const t=v.mc&&Date.now()-v.mc.at<20000?v.mc.t:''; m.hidden=!t||!!(v.sub&&OWN_UI.has(v.sub.id)); if(t&&m.dataset.id!==String(v.mc.id)){ m.dataset.id=v.mc.id; m.innerHTML=`<span>🎙️</span> ${U.esc(t)}`; m.classList.remove('in'); void m.offsetWidth; m.classList.add('in'); } }
  dlLoop(); alertCheck(v,ctx,me,out); showLayer(v,ctx,me); stageMap(el,v,ctx,me); repStage(el,v,me); hofSave(v,me);
  /* 게임 중 */
  /* 🧭 AI판 배치(그라운드 룰): 게임 중에도 가운데 게임판 + 바로 아래 대화창, 왼쪽 참가자, 오른쪽 귓속말. 자체 대화·귓속말이 있는 게임(선과 악)만 넓게 따로 */
  const inSub=v.sub&&!v.sub.spect&&v.sub.st, own=inSub&&OWN_UI.has(v.sub.id), hub=$q('#gnHub'), full=$q('#gnFull'), sw=own?full:$q('#gnSubWrap'), other=own?$q('#gnSubWrap'):full;
  other.hidden=true; other.innerHTML=''; other.dataset.key='';
  $q('#gnCard').hidden=!!inSub; el.querySelector('.gn').classList.toggle('gn-playing',!!inSub);
  if(inSub){ hub.hidden=own; sw.hidden=false; const G=G_(v.sub.id);
    if(sw.dataset.key!==v.sub.key){ sw.innerHTML=`<div class="gn-subbar">🎮 ${v.sub.kind==='main'?`제${v.ep}회 메인 매치`:v.sub.kind==='final'?`결승 ${(v.final&&v.final.idx||0)+1}판`:'⚔️ 데스매치'} 「${U.esc(G.title)}」 <button class="ghost small" data-gx="guide" data-id="${v.sub.id}">📖 규칙</button></div><div class="gn-sub"></div>`; sw.dataset.key=v.sub.key; if(G.reset) try{ G.reset(); }catch(_){} }
    const box=sw.querySelector('.gn-sub'); withNames(v.sub,()=>G.render(box,v.sub.st,subCtx(v,ctx))); if(own) return; }
  else { sw.hidden=true; sw.innerHTML=''; sw.dataset.key=''; hub.hidden=false;
  /* 진행 카드 */
  $q('#gnCard').innerHTML=(castOn(v,me)?castHTML(v,ctx,me,out):card(v,ctx,me,out)+predHTML(v,me)+skipHTML(v,me))+(gnRule&&NAT[gnRule]?`<div class="vr-card gn-rule"><b>${NAT[gnRule].emoji} ${U.esc(NAT[gnRule].title)} 규칙</b><p><small>${NAT[gnRule].rule}</small></p><button class="ghost small" data-gx="ruleX">닫기</button></div>`:''); }
  { const h=pleaMode?null:$q('#gnHint'); if(h&&!(!v.sub&&!natOn(v)&&MAP_PH.includes(v.phase))) h.textContent=inSub?'🎮 테이블 대화':'💬 테이블 대화'; }
  /* 서랍: 탭 · 기록 탭 위 시즌 기록 · 맨 아래 AI 사용량(방장만) */
  drawer(el,v,me);
  $q('#gnRecs').innerHTML=chronHTML(v);
  $q('#gnUse').innerHTML=ctx.mode!=='guest'&&window.AIB?`<small class="dr-use">🤖 ${(()=>{ const u=AIB.usage().sess; return `호출 ${u.calls}번 · 환산 약 $${u.costUSD.toFixed(2)}`; })()}</small>`:'';
  /* 대화창 */
  { const box=$q('#gnChat'), old=box.querySelector('.chat-scroll'), atEnd=!old||old.scrollHeight-old.scrollTop-old.clientHeight<60, top=old?old.scrollTop:0;
    const typ=v.typing!=null?[{note:1,r:v.ep,text:`💭 ${emo(v.typing)} ${nm(v.typing)} 생각 중…`}]:[];
    box.innerHTML=U.chat(v.chat.concat(typ),{emo:id=>emo(id),name:id=>U.esc(nm(id))+(id===me?'':''),me,roundName:r=>r?EPN(v,r):'개막식'});
    const sc=box.querySelector('.chat-scroll'); if(sc) sc.scrollTop=atEnd?sc.scrollHeight:top; }
  /* 귓속말 */
  { const anim=v.players.filter(x=>x.id!==me&&(isHum(x.id)||!x.out||(v.dm[dmKey(me,x.id)]||[]).length)).map(x=>x.id);   /* 👥 사람(친구)도 귓속말 상대 */
    if(drTab==='al') dmTo='@al'; else if(drTab==='dm'&&dmTo==='@al') dmTo=null;
    if(dmTo==null||(dmTo!=='@al'&&dmTo!=='@nm'&&!anim.includes(dmTo))) dmTo=anim.find(a=>!pl(v,a).out)||null;
    const thr=a=>v.dm[dmKey(me,a)]||[], inc=a=>thr(a).filter(x=>x.from!==me).length;
    if(dmTo) dmSeen[dmTo]=inc(dmTo); const unread=a=>Math.max(0,inc(a)-(dmSeen[a]||0));
    { const n=anim.reduce((t,a)=>t+inc(a),0), bx=$q('#gnDmBox'); if(bx._n!=null&&n>bx._n){ bx.classList.remove('ga-dm-new'); void bx.offsetWidth; bx.classList.add('ga-dm-new'); } bx._n=n; }
    const myAs=allysOf(v,me); if(alSel==='new'&&window.__alN!=null&&myAs.length>window.__alN) alSel=myAs[myAs.length-1].id; window.__alN=myAs.length; if(alSel!=='new'&&!myAs.some(A=>A.id===alSel)) alSel=myAs.length?myAs[0].id:'new'; const myA=myAs.find(A=>A.id===alSel)||null, myU=allyU(v,me), invs=(v.alli||[]).filter(A=>A.inv[me]==='wait'&&!A.mem.includes(me));
    const aUn=Math.max(0,(myU?myU.chat.filter(x=>x.from!==me).length:0)-(dmSeen['@al']||0))+invs.length;
    if(dmTo==='@al') dmSeen['@al']=myU?myU.chat.filter(x=>x.from!==me).length:0;
    const room=v.nm&&NAT[v.nm.id]&&NAT[v.nm.id].room?NAT[v.nm.id].room(v,me):null;
    if(room&&room.auto&&v.nm._rk!==undefined&&dmAuto!==room.auto){ dmAuto=room.auto; dmTo='@nm'; try{ const bx=$q('#gnDmBox'); if(typeof sideOpen!=='undefined'&&typeof sideKey==='function') sideOpen[sideKey(bx)]=true; bx.classList.remove('fold'); }catch(_){} }   /* 팀 회의 같은 게임 방이 생기면 접힌 귓속말 칸을 펼침(폰) */
    if(!room&&dmTo==='@nm') dmTo=null;
    $q('#gnDmTabs').innerHTML=(room?`<button class="dm-tab dm-al dm-room ${dmTo==='@nm'?'on':''}" data-dmto="@nm">${room.icon}<span>${U.esc(room.label)}</span>${room.n&&dmTo!=='@nm'&&room.n>(dmSeen['@nm']||0)?`<i class="dm-badge">${room.n-(dmSeen['@nm']||0)}</i>`:''}</button>`:'')+`<button class="dm-tab dm-al ${dmTo==='@al'?'on':''}" data-dmto="@al">🤝<span>${myAs.length>1?`연합 ${myAs.length}`:myAs.length?'연합방':'연합'}</span>${aUn&&dmTo!=='@al'?`<i class="dm-badge">${aUn}</i>`:''}</button>`+anim.map(a=>{ const u=unread(a); return `<button class="dm-tab ${a===dmTo?'on':''} ${pl(v,a).out?'dead':''}" data-dmto="${a}">${emo(a)}<span>${U.esc(nm(a))}</span>${u?`<i class="dm-badge">${u}</i>`:v.typing===a?'<i class="dm-dots">…</i>':''}</button>`; }).join('');
    const list=$q('#gnDmList'), d=dmTo&&dmTo!=='@al'?thr(dmTo):[], atE=list.scrollHeight-list.scrollTop-list.clientHeight<40;
    if(dmTo==='@nm'&&room){ dmSeen['@nm']=room.n||0;
      list.innerHTML=(room.head?`<div class="al-head">${room.head}</div>`:'')+(room.msgs.length?room.msgs.map(x=>x.from===-1?`<div class="dm-sys">${U.esc(x.text)}</div>`:`<div class="dm-msg ${x.from===me?'mine':''}"><div class="dm-b">${x.from===me?'':`<b>${emo(x.from)} ${U.esc(nm(x.from))}</b> `}${U.esc(x.text)}</div></div>`).join(''):`<div class="dm-empty">${room.empty||''}</div>`)
        +(room.typing?'<div class="dm-msg"><div class="dm-b dm-typing">💭 쓰는 중…</div></div>':'');
      list.scrollTop=list.scrollHeight; list._to=dmTo; const inp=$q('#gnDm'); inp.placeholder=room.ph||'할 말'; inp.disabled=!!room.off; }
    else if(dmTo==='@al'){ const others=v.players.filter(x=>!x.out&&x.id!==me&&!(myA&&myA.mem.includes(x.id))).map(x=>x.id);
      let h=invs.map(A=>`<div class="dm-sys al-inv">📨 「${U.esc(A.name)}」 초대 — ${A.mem.map(x=>emo(x)+U.esc(nm(x))).join(' ')}<div class="dm-offer"><button class="small" data-gx="aJoin" data-a="${A.id}" data-ok="1">🤝 합류</button><button class="small ghost" data-gx="aJoin" data-a="${A.id}" data-ok="0">🙅 거절</button></div></div>`).join('');
      if(myAs.length) h+='<div class="al-pick">'+myAs.map(A=>`<button class="small ${A.id===alSel?'':'ghost'}" data-alsel="${A.id}">${U.esc(A.name)} <small>${A.mem.length}명</small></button>`).join('')+`<button class="small ${alSel==='new'?'':'ghost'}" data-alsel="new">➕ 새 연합</button></div>`;
      if(myA){ h+=`<div class="al-head"><b>${U.esc(myA.name)}</b> ${myA.mem.map(x=>`<span title="${U.esc(nm(x))}">${emo(x)}${x===me?'':''}</span>`).join('')} <button class="small ghost" data-gx="aLeave" data-a="${myA.id}">탈퇴</button></div>`
          +myA.chat.map(x=>x.from===-1?`<div class="dm-sys">${U.esc(x.text)}</div>`:`<div class="dm-msg ${x.from===me?'mine':''}"><div class="dm-b">${x.from===me?'':`<b>${emo(x.from)} ${U.esc(nm(x.from))}</b> `}${U.esc(x.text)}</div></div>`).join('')
          +(myA.mem.includes(v.typing)?'<div class="dm-msg"><div class="dm-b dm-typing">💭 연합원이 쓰는 중…</div></div>':''); }
      else h+=`<div class="dm-empty">🤝 ${myAs.length?'새 연합을 하나 더 만들어요 — 지금 연합은 그대로 두고, 한 사람이 연합 여러 개에 동시에 들 수 있어요.':'연합은 여러 명이 뭉칠 수 있어요(비밀). 한 사람이 여러 연합에 들어도 돼요.'}<br>아래에서 초대하면 새 연합이 생겨요. 연합원끼리 투표·지목은 배신이에요 💔</div>`;
      h+=`<div class="al-invite"><small>${myA?`「${U.esc(myA.name)}」에 초대`:'새 연합에 초대'}</small> ${others.map(x=>{ const w=myA&&myA.inv[x]==='wait'; return `<button class="small ghost" data-gx="aInv" data-t="${x}" ${w?'disabled':''}>${emo(x)} ${U.esc(nm(x))}${w?' …':''}</button>`; }).join('')}</div>`;
      list.innerHTML=h; if(atE||list._to!==dmTo) list.scrollTop=list.scrollHeight; list._to=dmTo;
      const inp=$q('#gnDm'); inp.placeholder=myA?`「${myA.name}」에 할 말 (이 연합원만 봐요)`:'연합을 먼저 만들어요'; inp.disabled=!myA; }
    else {
    list.innerHTML=!dmTo?'<div class="dm-empty">귓속말할 상대가 없어요</div>':peekBar(v,me,out)+(d.length?d.map(x=>{ const mine=x.from===me; if(x.from===-1) return `<div class="dm-sys">${U.esc(x.text)}</div>`;
        const off=x.offer&&x.offer.st==='wait'&&!mine?`<div class="dm-offer"><button class="small" data-gx="offer" data-a="${dmTo}" data-ok="1">🤝 받기</button><button class="small ghost" data-gx="offer" data-a="${dmTo}" data-ok="0">🙅 거절</button></div>`:x.offer&&x.offer.st!=='wait'?`<div class="dm-offer-done">${x.offer.st==='ok'?'🤝 받음':'🙅 거절함'}</div>`:'';
        return `<div class="dm-msg ${mine?'mine':''}"><div class="dm-b">${U.esc(x.text)}${off}</div><small>${x.ep?'제'+x.ep+'회':''}</small></div>`; }).join('')
      :`<div class="dm-empty">${emo(dmTo)} ${U.esc(nm(dmTo))}와(과) 나눈 귓속말이 아직 없어요.<br>연합·거래를 몰래 제안해 보세요.</div>`)+(dmTo&&v.typing===dmTo?'<div class="dm-msg"><div class="dm-b dm-typing">💭 답장 쓰는 중…</div></div>':'');
    if(atE||list._to!==dmTo) list.scrollTop=list.scrollHeight; list._to=dmTo;
    const inp=$q('#gnDm'); inp.placeholder=dmTo?`${emo(dmTo)} ${nm(dmTo)}에게 몰래…`:'몰래 할 말'; inp.disabled=!dmTo||out&&false; } }
}
/* 🛡️ 생명의 징표 주기 (2026-11-11 사용자: "1등인데 왜 징표를 못 주지") */
function tokGive(v,me){ if(!(pl(v,me)||{}).gift) return ''; const ok=['rest','lobby'].includes(v.phase); const E=ok?aliveIds(v).filter(x=>x!==me&&!pl(v,x).tok&&!(v.phase==='lobby'&&v.cand===x)):[]; return `<span class="tok-give"><small>🎁 나눠 줄 징표${E.length?' — 건네기:':' (휴식·로비에 건넬 수 있어요)'}</small>${E.map(x=>`<button class="ghost small" data-gx="giveTok" data-t="${x}">${emo(x)} ${U.esc(nm(x))}</button>`).join('')}</span>`; }
function gemRow(v,me,out){ const P=pl(v,me); if(!P||out) return ''; if(isDev(v)){ const E=aliveIds(v).filter(x=>x!==me); return `<div class="gn-gem"><span class="gn-gemn" title="게임 아이템 · 속마음 엿보기(2) · 건네기">🧩 ${P.g}</span>${P.g>0&&['rest','split','afterRev'].includes(v.phase)?`<details class="gv-give"><summary>🧩 건네기</summary>${E.map(x=>`<button class="ghost small" data-gx="give" data-t="${x}">${emo(x)} ${U.esc(nm(x))}</button>`).join('')}</details>`:''}</div>`; } return `<div class="gn-gem"><span class="gn-gemn" title="로비 부탁 · 속마음 엿보기(2) · 징표(5)">🟣 ${P.g}</span> ${P.tok?'<small>🛡️ 내 징표</small> ':`<button class="ghost small" data-gx="buyTok" ${P.g<5?'disabled':''}>🛡️ 징표 🟣5</button>`}${tokGive(v,me)}</div>`; }
/* 👀 관전 중계석 (2026-11-11 시안 5차 A) — 동물끼리·남의 승부를 볼 때 판 + 예측 + 관중 줄다리기 + 건너뛰기를 한 상자로 */
const castOn=(v,me)=>natOn(v)&&v.nm&&v.nm.al.length===2&&!v.nm.al.includes(me)&&pl(v,me);
function castHTML(v,ctx,me,out){ const m=v.nm, G=NAT[m.id], [a,b]=m.al, p=v.pred, P=pl(v,me)||{};
  const open=p&&!p.closed&&Date.now()<p.until&&!p.opts.includes(me), mine=p&&p.picks&&p.picks[me];
  const cnt=p?p.opts.map(x=>Object.values(p.picks||{}).filter(y=>y===x).length):[0,0], tot=cnt[0]+cnt[1];
  let seat='';
  if(p&&p.opts){ seat+=`<div class="gc-row"><span class="gc-l">🔮 내 예측</span>${mine?`<span class="gc-pick">${emo(mine)} ${U.esc(nm(mine))} 승</span>`:open?p.opts.map(x=>`<button class="small" data-gx="pred" data-t="${x}">${emo(x)} ${U.esc(nm(x))}</button>`).join(''):'<small>예측 마감</small>'}<small class="gc-dim">${P.out?'맞히면 예언 점수':'맞히면 🟣+1'}</small></div>`;
    if(tot) seat+=`<div class="gc-row"><span class="gc-l">관중 예측</span><div class="gc-tug"><i class="a" style="width:${Math.max(12,cnt[0]/tot*100)}%">${emo(p.opts[0])} ${cnt[0]}명</i><i class="b" style="width:${Math.max(12,cnt[1]/tot*100)}%">${emo(p.opts[1])} ${cnt[1]}명</i></div></div>`; }
  if(m.fast){ const sp=v.players.filter(x=>isHum(x.id)&&!m.al.includes(x.id)).map(x=>x.id), sk=sp.filter(x=>m.skip&&m.skip[x]).length, did=m.skip&&m.skip[me];
    seat+=`<div class="gc-row"><span class="gc-l">⏩ 건너뛰기</span>${did?'<small>눌렀어요</small>':'<button class="small ghost" data-gx="skipDuel">결과로 건너뛰기</button>'}<small class="gc-dim">${sk}/${sp.length}명 · 다 누르면 앞선 쪽 승</small></div>`; }
  return `<div class="gc"><div class="gc-top"><span class="gc-live">LIVE</span><b>${m.kind==='final'?'🏆 결승 중계':'⚔️ 데스매치 중계'}</b><span class="gc-sp"></span><span>${G.emoji} ${U.esc(G.title)} · ${emo(a)} ${U.esc(nm(a))} vs ${emo(b)} ${U.esc(nm(b))} · ${m.kind==='final'?'우승을 건 한 판':'지는 쪽 탈락'}</span></div>${card(v,ctx,me,out)}${seat?`<div class="gc-seat">${seat}</div>`:''}</div>`; }
function predHTML(v,me){ const p=v.pred; if(!p||p.closed||Date.now()>=p.until||p.opts.includes(me)||!pl(v,me)) return ''; const mine=p.picks[me], P=pl(v,me);
  return `<div class="vr-card gn-pred"><b>🔮 ${p.kind==='final'?'우승자':'데스매치 승자'} 예측</b> <small>${P.out?'맞히면 예언 점수 (시상식 🔮 예언왕)':'맞히면 🟣 가넷 +1'}</small><div class="fh-act">${mine?`<small>내 예측: ${emo(mine)} ${U.esc(nm(mine))}</small>`:p.opts.map(x=>`<button class="ghost" data-gx="pred" data-t="${x}">${emo(x)} ${U.esc(nm(x))} 승</button>`).join('')}</div></div>`; }
function skipHTML(v,me){ const m=v.nm; if(!m||!m.fast||m.al.includes(me)||!pl(v,me)) return ''; const did=m.skip&&m.skip[me];
  return `<div class="vr-card gn-skip"><small>🍿 동물끼리 승부를 구경 중 — 두 카드가 다 보여요.</small> ${did?'<small>⏩ 다른 사람을 기다리는 중…</small>':'<button class="ghost small" data-gx="skipDuel">⏩ 결과로 건너뛰기</button>'}</div>`; }
function peekBar(v,me,out){ if(!dmTo||isHum(dmTo)||out||!pl(v,dmTo)||pl(v,dmTo).out) return ''; const g=(pl(v,me)||{}).g||0; return `<div class="dm-peek"><button class="small ghost" data-gx="peek" data-t="${dmTo}" ${g>=2?'':'disabled'}>🔍 ${U.esc(nm(dmTo))} 속마음 엿보기 ${CUR(v)}2</button></div>`; }
/* 🗣️ 최후 변론 — 버튼 · 30초 입력 창 */
function pleaBtn(v,me,ph){ const done=(v.pleaDone||{})[v.ep+ph+me]; return `<div class="gn-plea">${done?'<small>🎤 변론했어요 — 반응은 무대·대화창에</small>':`<button data-gx="plea">🎤 최후 변론</button><small>${ph==='vote'?'투표 전에 모두 앞에서 한 번':'후보에게 모두 앞에서 한 번'} · 30초</small>`}</div>`; }
let pleaMode=0, pleaIv=null;
function pleaOff(){ pleaMode=0; clearInterval(pleaIv); const i=document.getElementById('gnIn'); if(i){ i.placeholder='아무 말이나 — 이름을 부르면 대답해요'; const b=i.closest('.gn-say'); if(b) b.classList.remove('plea-mode'); } const h=document.getElementById('gnHint'); if(h) h.textContent='💬 테이블 대화'; }
function pleaInput(ctx){ const i=document.getElementById('gnIn'); if(!i) return pleaInput0(ctx); pleaMode=Date.now()+30000; const box=i.closest('.gn-say'); if(box) box.classList.add('plea-mode');
  i.placeholder='🎤 연단에서 할 말'; i.focus(); clearInterval(pleaIv);
  const tickP=()=>{ const left=Math.max(0,Math.ceil((pleaMode-Date.now())/1000)), h=document.getElementById('gnHint'); if(h) h.innerHTML=`🎤 <b>최후 변론</b> · ⏱ 0:${String(left).padStart(2,'0')} <button class="small ghost" data-gx="pleaNo">취소</button>`;
    if(left<=0){ const x=document.getElementById('gnIn'); if(x&&x.value.trim()) sendChat(ctx); else pleaOff(); } };
  tickP(); pleaIv=setInterval(tickP,250); }
function pleaInput0(ctx){ if(document.querySelector('.plea-in')) return; const o=document.createElement('div'); o.className='gx-ov plea-in'; const end=Date.now()+30000;
  o.innerHTML=`<div class="gx-box gx-dark plea-box"><div class="plea-h">🎤 최후 변론 <span class="gn-timer" data-pl="1">⏱ 0:30</span></div><p>모두가 들어요. 동물들은 듣고 설득됐는지 정해요 — 근거를 대면 잘 넘어와요.</p><textarea maxlength="160" placeholder="예) 저 이번 판 약속 다 지켰어요. 진짜 배신자는 늑대예요!"></textarea><div class="fh-act"><button data-x="go">🎤 무대에서 말하기</button><button class="ghost" data-x="no">취소</button></div></div>`;
  document.body.appendChild(o); const ta=o.querySelector('textarea'); ta.focus(); let iv=null;
  const close=()=>{ clearInterval(iv); o.remove(); }, go=()=>{ const t=ta.value.trim(); close(); if(t) ctx.act({k:'plea',text:t}); };
  iv=setInterval(()=>{ const left=Math.max(0,Math.ceil((end-Date.now())/1000)), e=o.querySelector('[data-pl]'); if(e){ e.textContent=`⏱ 0:${String(left).padStart(2,'0')}`; e.classList.toggle('hurry',left<=10); } if(left<=0) go(); },250);
  o.onclick=e=>{ const b=e.target.closest('[data-x]'); if(!b) return; if(b.dataset.x==='go') go(); else close(); }; ta.onkeydown=e=>{ if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){ e.preventDefault(); go(); } }; }
function readyRow(v,me,label){ const hs=v.players.filter(x=>isHum(x.id)&&!x.out); const mine=v.ready[me];
  return `<div class="gn-ready" ${hs.length<2?'hidden':''}>${hs.map(x=>`<span class="${v.ready[x.id]?'on':''}">${emo(x.id)} ${U.esc(nm(x.id))}${v.ready[x.id]?' ✔':''}</span>`).join('')}</div>${hs.some(x=>x.id===me)?(mine?(hs.every(x=>v.ready[x.id])?'<small>🙌 곧 넘어가요…</small>':'<small>기다리는 중…</small>'):`<button data-gx="ready">${label||'다음 ▶'}</button>`):''}`; }
function card(v,ctx,me,out){ const ph=v.phase, G=v.next&&G_(v.next);
  if((ph==='match'||ph==='death'||ph==='final'||ph==='prison'||ph==='revival')&&v.nm&&NAT[v.nm.id]) return NAT[v.nm.id].card(v,me,out);
  if(v.sub&&v.sub.spect){ const sg=G_(v.sub.id); return `<div class="vr-card"><b>👀 관전 중</b> — 「${U.esc(sg.title)}」 ${v.sub.kind==='main'?'메인 매치':v.sub.kind==='final'?'결승':'데스매치'}가 진행 중이에요 (${v.sub.hp.filter(isHum).map(x=>U.esc(nm(x))).join(' · ')} 참가). 끝나면 결과가 나와요.</div>`; }
  if(isDev(v)){ const D=devCard(v,ctx,me,out,G); if(D!=null) return D; }
  if(ph==='opening') return `<div class="vr-card"><b>🎬 개막식</b><p>8명이 모였어요. 회차마다 메인 매치 → 로비 → 데스매치로 한 명씩 탈락해요. 동물 친구들은 각자 생각하고 말하고, 귓속말로 연합·거래를 제안하기도 해요.</p>${readyRow(v,me,'시작! ▶')}</div>`;
  if(ph==='rest') return `<div class="vr-card"><b>☕ 제${v.ep}회 휴식 시간</b>${G?`<div class="gn-next">다음 ${G.emoji} <b>「${U.esc(G.title)}」</b> <button class="ghost small" data-gx="guide" data-id="${v.next}">📖 규칙</button></div>`:''}${gemRow(v,me,out)}${readyRow(v,me,'메인 매치 시작 ▶')}</div>`;
  if(ph==='vote'){ const V=v.vote||{pool:[],votes:{}}; const inPool=V.pool.includes(me)&&!V.votes[me];
    return `<div class="vr-card"><b>🗳️ 진 팀 투표</b> <small>${Object.keys(V.votes).length}/${V.pool.length}</small>${inPool?`<div class="fh-act">${V.pool.filter(x=>x!==me).map(x=>`<button class="ghost" data-gx="vote" data-t="${x}">${emo(x)} ${U.esc(nm(x))}</button>`).join('')}</div>${pleaBtn(v,me,'vote')}`:V.votes[me]?`<small>${U.esc(nm(V.votes[me]))}에게 투표했어요</small>`:'<small>진 팀이 투표 중이에요</small>'}</div>`; }
  if(ph==='lobby'){ const c=v.cand, L=v.lobby||{deals:{}}; const deals=Object.entries(L.deals).filter(([k])=>k.endsWith('>'+c));
    if(c===me){ const E=eligible(v,me); return `<div class="vr-card"><b>⚖️ 내가 데스매치 후보예요</b>
      ${deals.length?`<div class="gn-deals">${deals.map(([k,d])=>{ const from=k.split('>')[0]; return `<div class="side-row">🟣 ${emo(from)} ${U.esc(nm(from))}: 가넷 ${d.amt}개 줄게요, 지목 말아 주세요 ${d.ok?'<small>✔ 받음</small>':`<button class="small" data-gx="acceptDeal" data-from="${from}">🤝 받기</button>`}</div>`; }).join('')}</div>`:''}
      <div class="fh-act">${E.map(x=>`<button class="ghost" data-gx="pick" data-t="${x}">👉 ${emo(x)} ${U.esc(nm(x))}${isAlly(v,x,me)?' 🤝':''}${L.deals[x+'>'+me]&&L.deals[x+'>'+me].ok?' 🟣':''}</button>`).join('')}</div></div>`; }
    const mine=L.deals[me+'>'+c];
    const pd=(v.pleaDone||{})[v.ep+'lobby'+me];
    return `<div class="vr-card gn-lobby"><div class="lb-title"><b>🏛️ 로비 시간</b><small>후보 ${emo(c)} <b>${U.esc(nm(c))}</b>이(가) 곧 데스매치 상대를 지목해요</small></div>${out?'':`<div class="lb-rows">
      ${pl(v,me)&&pl(v,me).tok?`<div class="lb-row lb-safe"><span class="lb-k">🛡️ 징표</span><div class="lb-v"><small>안전</small>${tokGive(v,me)}</div></div>`:`<div class="lb-row"><span class="lb-k">🟣 부탁</span><div class="lb-v"><button class="small ghost" data-gx="deal" data-n="1" ${mine?'disabled':''}>가넷 1개</button><button class="small ghost" data-gx="deal" data-n="2" ${mine?'disabled':''}>가넷 2개</button><small>${mine?`보냄: 가넷 ${mine.amt}개 — ${mine.ok?'받아 줬어요 ✔':mine.ok===false?'거절당했어요':'답 기다리는 중…'}`:'나를 지목하지 말아 달라고'}</small></div></div>`}
      <div class="lb-row"><span class="lb-k">👉 몰아가기</span><div class="lb-v">${aliveIds(v).filter(x=>x!==c&&x!==me).map(x=>`<button class="small ghost" data-gx="push" data-t="${x}">${emo(x)} ${U.esc(nm(x))}</button>`).join('')}</div></div>
      ${isHum(c)||(pl(v,me)&&pl(v,me).tok)?'':`<div class="lb-row"><span class="lb-k">🎤 변론</span><div class="lb-v">${pd?'<small>✔ 변론함</small>':'<button class="small lb-plea" data-gx="plea">최후 변론하기</button>'}</div></div>`}</div>`}
      <div class="lb-foot">${isHum(c)?'<small>후보가 지목하면 넘어가요</small>':readyRow(v,me,'로비 끝 ▶')}</div></div>`; }
  if(ph==='deathPick'){ const o=v.oppo; if(o===me) return `<div class="vr-card"><b>🎮 데스매치 게임을 골라요</b> <small>${U.esc(nm(v.cand))}이(가) 나를 지목했어요</small><div class="gn-dpick">${(v.deathOpts||[]).map(id=>`<div class="gn-dopt"><b>${G_(id).emoji} ${U.esc(G_(id).title)}</b><small>${U.esc(G_(id).tagline||'')}</small><div><button data-gx="dpick" data-id="${id}">이걸로!</button> <button class="ghost small" data-gx="guide" data-id="${id}">📖 규칙</button></div></div>`).join('')}</div></div>`;
    return `<div class="vr-card"><b>🎮 ${U.esc(nm(o))}이(가) 데스매치 게임을 고르는 중…</b></div>`; }
  if(ph==='afterDeath') return `<div class="vr-card"><b>💀 탈락</b>${readyRow(v,me,'다음 회차 ▶')}</div>`;
  if(ph==='finalWait'){ const F=v.final; return `<div class="vr-card"><b>🏆 결승 — ${U.esc(nm(v.cand))} ${F.score[v.cand]} : ${F.score[v.oppo]} ${U.esc(nm(v.oppo))}</b><small> 다음: 「${U.esc(G_(F.games[F.idx]).title)}」</small>${readyRow(v,me,'결승 다음 판 ▶')}</div>`; }
  if(ph==='champ') return `<div class="vr-card gn-champ"><b>👑 우승 — ${emo(v.champ)} ${U.esc(nm(v.champ))}</b><p>시상식은 아래 대화창에 있어요. 수고하셨어요!</p></div>`;
  return `<div class="vr-card"><b>${phaseName(v)}</b></div>`; }
function onClick(e,ctx0){ const el=e.currentTarget, ctx=el._ctx||ctx0, v=el._v; { const gs=e.target.closest('[data-gsel]'); if(gs){ const [k,x]=gs.dataset.gsel.split('|'); (window.__gaSel=window.__gaSel||{})[k]=isNaN(+x)?x:+x; if(ctx.rerender) ctx.rerender(); return; } } { const bn=e.target.closest('[data-bwn]'); if(bn){ const k=bn.dataset.bwn; let n=(window.__bwN??10)|0; if(k==='-1') n--; else if(k==='+1') n++; else n=+k; window.__bwN=Math.max(0,Math.min(99,n)); if(ctx.rerender) ctx.rerender(); return; } }
  { const ds=e.target.closest('[data-dis]'); if(ds){ const k=+ds.dataset.dis, a=(window.__diSel=window.__diSel||[]); const j=a.indexOf(k); if(j>=0) a.splice(j,1); else { a.push(k); if(a.length>3) a.shift(); } if(ctx.rerender) ctx.rerender(); return; } }
  { const dc=e.target.closest('[data-dbc]'); if(dc){ (window.__dbSel=window.__dbSel||{}).c=dc.dataset.dbc; if(ctx.rerender) ctx.rerender(); return; } }
  { const rv=e.target.closest('[data-rv]'); if(rv){ relView=rv.dataset.rv; if(ctx.rerender) ctx.rerender(); return; } const rn=e.target.closest('[data-rn]'); if(rn){ relSel=relSel===rn.dataset.rn?null:rn.dataset.rn; if(ctx.rerender) ctx.rerender(); return; } }
  { const rp=e.target.closest('[data-rep]'); if(rp){ repOpen(+rp.dataset.rep,v); return; } }
  { const as=e.target.closest('[data-alsel]'); if(as){ alSel=as.dataset.alsel; if(ctx.rerender) ctx.rerender(); return; } }
  { const dt=e.target.closest('[data-dr]'); if(dt){ drTab=dt.dataset.dr; if(drTab==='dm'&&dmTo==='@al') dmTo=null; if(ctx.rerender) ctx.rerender(); return; } }
  { const np=e.target.closest('[data-np]'); if(np){ npSel=npSel===np.dataset.np?null:np.dataset.np; if(ctx.rerender) ctx.rerender(); return; } }
  { const b=e.target.closest('[data-nm]'); if(b&&!b.disabled){ let a; try{ a=JSON.parse(b.dataset.nm); }catch(_){ a=null; } if(a){ ctx.act({k:'nm',a}); return; } } } const b=e.target.closest('[data-gx],[data-dmto]'); if(!b||b.disabled) return;
  if(b.dataset.dmto){ dmTo=b.dataset.dmto; ctx.rerender&&ctx.rerender(); const i=el.querySelector('#gnDm'); if(i) i.focus(); return; }
  const x=b.dataset.gx;
  if(x==='send') return sendChat(ctx); if(x==='dm') return sendDm(ctx);
  if(x==='guide'){ const id=b.dataset.id; if(NAT[id]){ gnRule=gnRule===id?null:id; if(ctx.rerender) ctx.rerender(); return; } if(window.openGuide) openGuide(id); return; }
  if(x==='ruleX'){ gnRule=null; if(ctx.rerender) ctx.rerender(); return; }
  if(x==='ready') return ctx.act({k:'ready'});
  if(x==='face') return ctx.act({k:'face',f:b.dataset.f});
  if(x==='rescue') return ctx.act({k:'rescue',t:b.dataset.t||null}); if(x==='give') return ctx.act({k:'give',t:b.dataset.t});
  if(x==='vote') return ctx.act({k:'vote',t:b.dataset.t});
  if(x==='deal') return ctx.act({k:'deal',n:+b.dataset.n});
  if(x==='push') return ctx.act({k:'push',t:b.dataset.t,why:''});
  if(x==='pick') return ctx.act({k:'pick',t:b.dataset.t});
  if(x==='acceptDeal') return ctx.act({k:'acceptDeal',from:b.dataset.from});
  if(x==='dpick') return ctx.act({k:'dpick',id:b.dataset.id});
  if(x==='plea') return pleaInput(ctx); if(x==='pleaNo') return pleaOff();
  if(x==='pred') return ctx.act({k:'pred',t:b.dataset.t}); if(x==='skipDuel') return ctx.act({k:'skipDuel'}); if(x==='peek') return ctx.act({k:'peek',t:b.dataset.t}); if(x==='buyTok') return ctx.act({k:'buyTok'}); if(x==='giveTok') return ctx.act({k:'giveTok',t:b.dataset.t});
  if(x==='offer') return ctx.act({k:'offer',a:b.dataset.a,ok:b.dataset.ok==='1'});
  if(x==='aInv') return ctx.act({k:'aInv',t:b.dataset.t,a:alSel||'new'}); if(x==='aJoin') return ctx.act({k:'aJoin',a:b.dataset.a,ok:b.dataset.ok==='1'}); if(x==='aLeave') return ctx.act({k:'aLeave',a:b.dataset.a}); }
function sendChat(ctx){ const i=document.getElementById('gnIn'); const t=i?i.value.trim():''; if(!t) return; if(pleaMode&&Date.now()<pleaMode+1500){ ctx.act({k:'plea',text:t}); i.value=''; pleaOff(); return; } ctx.act({k:'chat',text:t}); i.value=''; i.focus(); }
function sendDm(ctx){ const i=document.getElementById('gnDm'); const t=i?i.value.trim():''; if(!t||!dmTo) return; ctx.act(dmTo==='@al'?{k:'aSay',text:t,a:alSel}:dmTo==='@nm'?{k:'nm',a:{k:'tsay',text:t}}:{k:'dm',t:dmTo,text:t}); i.value=''; i.focus(); }
function devCard(v,ctx,me,out,G){ const ph=v.phase, C=v.curse&&v.curse.who===me&&!v.curse.res?`<div class="gn-curse">🗝️ 비밀 임무 — 오늘 안에 <b>${emo(v.curse.t)} ${U.esc(nm(v.curse.t))}</b>을(를) 유배지로 (성공 🧩+3 · 실패 피스 전부 잃음)</div>`:'';
  const home=x=>v.home&&v.home[x];
  if(ph==='opening') return `<div class="vr-card"><b>🎬 개막식</b><p>10명이 모였어요. 하루에 🎮 메인 매치와 ⛓️ 감옥 매치 — 메인 꼴찌와 감옥 꼴찌는 🏝️ 유배지로 가요. 1위는 🎖️ 연맹의 징표로 한 명을 구해요.</p>${readyRow(v,me,'시작! ▶')}</div>`;
  if(ph==='rest') return `<div class="vr-card"><b>☕ ${v.ep}일차 자유 시간</b>${home(me)?` <small>${home(me)==='jail'?'⛓️ 어젯밤 감옥동':'🏠 어젯밤 생활동'}</small>`:''}${G?`<div class="gn-next">다음 ${G.emoji} <b>「${U.esc(G.title)}」</b> <button class="ghost small" data-gx="guide" data-id="${v.next}">📖 규칙</button></div>`:''}${C}${gemRow(v,me,out)}${readyRow(v,me,'메인 매치 시작 ▶')}</div>`;
  if(ph==='rescue'){ const R=v.rescue||{pool:[]}; if(R.by===me&&!R.done) return `<div class="vr-card"><b>🎖️ 연맹의 징표 — 감옥동에 갈 한 명을 구할 수 있어요</b>${R.swap?`<small> 구하면 ${emo(R.swap)} ${U.esc(nm(R.swap))}이(가) 대신 감옥동으로 가요</small>`:''}${C}<div class="fh-act">${R.pool.map(x=>`<button class="ghost" data-gx="rescue" data-t="${x}">🏠 ${emo(x)} ${U.esc(nm(x))}${isAlly(v,x,me)?' 🤝':''}</button>`).join('')}<button class="ghost" data-gx="rescue" data-t="">아무도 안 구함</button></div></div>`;
    return `<div class="vr-card"><b>🎖️ ${emo(R.by)} ${U.esc(nm(R.by))}이(가) 연맹의 징표로 누구를 구할지 고르는 중…</b><small> 후보: ${R.pool.map(x=>emo(x)+U.esc(nm(x))).join(' ')}</small>${C}</div>`; }
  if(ph==='split'){ const live=aliveIds(v).filter(x=>home(x)==='live'), jail=aliveIds(v).filter(x=>home(x)==='jail');
    return `<div class="vr-card gn-split"><div class="sp-col live"><b>🏠 생활동</b>${live.map(x=>`<span>${emo(x)} ${U.esc(nm(x))}${x===me?'(나)':''}${v.fed===x?' 🎖️':''}</span>`).join('')}</div><div class="sp-col jail"><b>⛓️ 감옥동</b>${jail.map(x=>`<span>${emo(x)} ${U.esc(nm(x))}${x===me?'(나)':''}</span>`).join('')}</div>${C}${gemRow(v,me,out)}${readyRow(v,me,home(me)==='jail'?'감옥 매치 시작 ▶':'감옥 매치 구경 ▶')}</div>`; }
  if(ph==='afterDeath') return `<div class="vr-card"><b>🏝️ 유배</b>${readyRow(v,me,'다음 날 ▶')}</div>`;
  if(ph==='afterRev') return `<div class="vr-card"><b>🔥 패자부활 — ${(e=>e&&e.rev?`${emo(e.rev)} ${U.esc(nm(e.rev))} 복귀!`:'')(v.eps.find(e=>e.ep===v.ep))}</b>${C}${gemRow(v,me,out)}${readyRow(v,me,'다음 날 ▶')}</div>`;
  return null; }
function status(v,ctx){ const me='h'+ctx.me; if(isDev(v)&&v.phase==='rescue'&&v.rescue&&v.rescue.by===me&&!v.rescue.done) return '연맹의 징표로 구할 사람을 고르세요';
  if(v.sub&&!v.sub.spect&&v.sub.st){ const G=G_(v.sub.id); if(!G.status) return ''; return withNames(v.sub,()=>G.status(v.sub.st,subCtx(v,ctx))); }
  const ph=v.phase; if(ph==='lobby'&&v.cand===me) return '데스매치 상대를 지목하세요'; if(ph==='vote'&&v.vote&&v.vote.pool.includes(me)&&!v.vote.votes[me]) return '데스매치 후보에게 투표하세요';
  if(ph==='deathPick'&&v.oppo===me) return '데스매치 게임을 고르세요';
  if(['opening','rest','afterDeath','finalWait','split','afterRev'].includes(ph)||(ph==='lobby'&&!isHum(v.cand))) return v.ready[me]?'다른 사람을 기다리는 중…':'준비되면 "다음"을 누르세요';
  return ''; }
window.GAMES.geniusai = { maxH:MAXP, noPersona:true, wide:true,
  title:'더 지니어스 · 놀이터 시즌', alias:'지니어스 시즌 AI 친구', emoji:'🏆', ref:'더 지니어스 · 놀이터 시즌', tags:['시즌','서바이벌','AI','친구와','두뇌서바이벌'],
  tagline:'친구들 + 동물 친구들 8명이 회차마다 메인 매치·로비·데스매치로 살아남는 서바이벌 — 동물은 Claude로 말하고 판단해요.',
  guide:'<p><b>8명 서바이벌 시즌</b> — 방에 들어온 친구들 + 동물 친구들. 회차마다 ☕ 휴식(대화·귓속말·연합) → 🎮 메인 매치 → 📊 결과(1위 🛡️ 생명의 징표·🟣 가넷) → 🏛️ 로비(후보에게 부탁·거래·몰아가기) → 👉 지목 → ⚔️ 데스매치 → 💀 탈락. 둘 남으면 결승 3판 2선승.</p><div class="tipbox">💡 팁: 휴식 시간에 동물에게 귓속말로 연합을 제안해 두면 데스매치 지목을 피할 수 있어요.</div>',
  table:true, init, apply, mask, render, status, step, stepDelay, addHuman, _st:{nm,emo}, _nat:NAT,
  reset(){ dmTo=null; alSel=null; dmSeen={}; subKey=null; RUN.clear(); if(window.AIB) AIB.resetUsage&&AIB.resetUsage(); },
  bar:(v,i)=>{ const x=v.players&&v.players.find(q=>q.id==='h'+i); return x?`<span class="tag">🟣 ${x.g}${x.tok?' 🛡️':''}${x.out?' 💀':''}</span>`:''; },
  result:v=>v.champ?`우승 ${nm(v.champ)}`:'',
};
/* 😈 데블스 플랜 · 놀이터 시즌 — 같은 엔진, 형식만 다르게 (2026-11-12) */
window.GAMES.devil3ai = Object.assign({}, window.GAMES.geniusai, { maxH:MAXD,
  title:'데블스 플랜 · 놀이터 시즌', alias:'데블스 플랜 시즌 3 AI 친구 감옥 유배지', emoji:'😈', ref:'데블스 플랜 · 놀이터 시즌', tags:['시즌','서바이벌','AI','친구와','두뇌서바이벌'],
  tagline:'10명이 하루에 메인 매치·감옥 매치 — 꼴찌는 유배지로, 패자부활전도 한 번. 동물은 Claude로 말하고 판단해요.',
  guide:'<p><b>10명 서바이벌 시즌</b> — 방에 들어온 친구들 + 동물 친구들. 하루마다 ☕ 자유 시간(대화·귓속말·연합·🧩 피스 건네기) → 🎮 메인 매치(꼴찌 🏝️ 유배) → 🎖️ 1위가 연맹의 징표로 한 명 구제 → 🏠 생활동 / ⛓️ 감옥동 → ⛓️ 감옥 매치(🪨 무거운 13 · 🔫 러시안 룰렛, 꼴찌 유배). 유배지에선 한 번 🔥 패자부활전. 둘 남으면 결승 3판 2선승.</p><p>🧩 피스는 게임 아이템·거래에 써요 — 0개여도 탈락하지 않아요. 🗝️ 누군가는 몰래 비밀 임무를 받아요.</p><div class="tipbox">💡 팁: 감옥 매치는 꼴찌만 떨어져요. 1위에게 미리 잘 보여 두면 연맹의 징표로 구해 줄지도.</div>',
  init:(st,o)=>init(st,Object.assign({},o||{},{fmt:'devil'})),
  bar:(v,i)=>{ const x=v.players&&v.players.find(q=>q.id==='h'+i); return x?`<span class="tag">🧩 ${x.g}${x.out?' 🏝️':v.home&&v.home[x.id]==='jail'?' ⛓️':''}</span>`:''; },
});
})();
