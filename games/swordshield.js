(function(){
'use strict';
/* 검과 방패 (더 지니어스 시즌 3 · 4회 메인 매치) — 8인 4:4 팀전(우리 둘은 늘 다른 팀 + NPC 6명).
   팀마다 무기 8개(검 3·쌍검 1·방패 2·맨손 2)를 넷이 두 팔에 나눠 듦 — 같은 팀끼리는 서로 무기를 알고, 상대 무기는 모름.
   각 팀에 비밀 리더 1명(본인만 앎). 팀이 번갈아 한 명씩 공격: 상대 한 명 + 팔 하나 + "검/쌍검"을 선언(거짓 가능) 또는 패스.
   방어자는 팔 하나를 골라 "방패로 막기"를 선언(거짓 가능). 선언마다 누구든 🤨 의심 가능 → 무기 공개, 거짓이면 선언자가, 참이면 의심한 사람이 쓰러짐.
   판정: 실제 위력(검 1·쌍검 2, 방패·맨손 0). 위력 0이면 무사, 방패(내구 3)가 위력을 견디면 내구가 깎이고 무사, 아니면 쓰러짐.
   결과는 "막았다/쓰러졌다"만 공개 — 실제 위력·내구는 그 팀만 앎. 리더가 쓰러지면 즉시 그 팀 패배. 6라운드가 지나면 생존자 많은 팀 승. */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로 — 고르게 퍼지게, 나머지는 NPC */
const N=8, TM=[[0,1,2,3],[4,5,6,7]], MAXR=6; let HSEAT=[0,4]; const SEATORD=[0,4,1,5,2,6,3,7];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i), ALL=[...Array(N).keys()], team=i=>i<4?0:1;
const nm=i=>`{s${i}}`;
const W={S:{n:'검',e:'🗡️',p:1},D:{n:'쌍검',e:'⚔️',p:2},H:{n:'방패',e:'🛡️',p:0},N:{n:'맨손',e:'✋',p:0}};
const ARM=['왼팔','오른팔'], TN=['☀️ 진실 팀','🌙 거짓 팀'];
const POOL=['S','S','S','D','H','H','N','N'];
/* 선언 가능도: 진짜 무기면 그대로 선언, 칼이 있으면 굳이 빈 팔로 뻥치지 않음, 두 팔 다 위력 0이면 가끔 '검'(드물게 '쌍검')이라고 뻥, 검↔쌍검 바꿔 말하기는 거의 없음 */
const LK=(slot,claim,other)=>slot===claim?1:(slot==='H'||slot==='N')?((other==='S'||other==='D')?.02:claim==='S'?.3:.06):.03;
const jo=(w,a,b)=>{ const c=w.charCodeAt(w.length-1); return c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28?a:b; };
const wro=(arm,w)=>`${ARM[arm]} ${W[w].n}${jo(W[w].n,'으로','로')}`;
const PERMS=(()=>{ const out=[], cnt={S:3,D:1,H:2,N:2}, cur=[]; (function rec(){ if(cur.length===8){ out.push(cur.join('')); return; } for(const k of 'SDHN') if(cnt[k]){ cnt[k]--; cur.push(k); rec(); cur.pop(); cnt[k]++; } })(); return out; })();
const STYLE={seojin:'logic', doyun:'warm', haram:'calm', yuna:'emo', minho:'sly', taekyung:'hot', jihu:'sly', soyul:'warm'};
const DEF_P={talk:.5,aggr:.5,trust:.5,bluff:.4,logic:.6,temper:.4};
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
const LINES={
  logic:{atk:['{t}, {w} 공격합니다.','계산상 {t}예요. {w} 갑니다.','{t}. {w} 하겠습니다.','{w} {t} 공격. 확률이 제일 높아요.'], pass:['이번엔 패스할게요.','패스. 지금은 아껴요.','저는 넘길게요.'],
    def:['{w} 막겠습니다.','{w} 막아요. 충분해요.','{w}.'], doubt:['의심합니다. 숫자가 안 맞아요.','그 선언, 확률상 거짓이에요.','의심. 근거는 있어요.'],
    win:['예상대로네요.','계산이 맞았어요.'], react:['{t}… 계산에 넣을게요.','{t}가 빠졌네요. 판이 바뀌어요.','{t}… 아까웠어요.'], lead:['사실 제가 리더였어요. 그래서 의심을 아꼈죠.','리더는 저였어요. 들키지 않으려고 계산했어요.']},
  warm:{atk:['{t}, 미안해요… {w} 갈게요 🙏','{t}… {w} 할게요 😢','{w} {t}! 원망하지 마요~','어쩔 수 없어요, {t} {w}!'], pass:['저는 패스할게요 😊','이번엔 넘어갈게요~','패스! 다음에요 🤗'],
    def:['{w} 막을게요! 🙏','{w}요! 제발~','{w} 막아요 😣'], doubt:['저… 의심할게요 🥺','미안해요, 그거 의심해요!','의심이요! 틀리면 어떡하지 😣'],
    win:['우리 팀 최고예요 🥰','다들 고생했어요 🤗'], react:['헉 {t}… 😢','{t} 괜찮아요?! 🥺','어떡해 {t}…'], lead:['저 사실 리더였어요… 떨려 죽는 줄 😭','리더 저였어요! 다들 지켜 줘서 고마워요 🙏']},
  calm:{atk:['…{t}. {w}.','{w}. {t}.','{t}, {w}.'], pass:['…패스.','넘길게요.','…패스해요.'],
    def:['…{w}.','{w}.','…{w} 막아요.'], doubt:['…의심.','그거, 거짓이에요.','…의심할게요.'],
    win:['…끝났네요.','…됐어요.'], react:['…{t}.','{t}, 수고했어요.','…아쉽네요, {t}.'], lead:['…리더는 저였어요.','…저였어요, 리더.']},
  emo:{atk:['{t}!! {w} 공격!! 😤','{w} 간다 {t}!!','{t} 각오해요!! {w}!!','{t}!!! {w} 갑니다!!'], pass:['패스!! 무서워요 😰','저 이번엔 패스요!!','패스패스!!'],
    def:['{w} 막아요!! 제발!! 😭','{w}!!! 막혀라!!','{w}요!! 진짜예요!!'], doubt:['의심!!! 그거 거짓말이죠!! 😤','의심해요!! 느낌이 와요!!','거짓말!! 의심!!'],
    win:['이겼다!!! 🥳','우리 팀 만세!! 🎉'], react:['헉 {t}!!! 😱','{t}!!! 안 돼!!','으아 {t}!! 😭'], lead:['저 리더였어요!! 심장 터지는 줄!! 😭','리더 저예요!! 살았다!!']},
  sly:{atk:['{t}~ {w} 갑니다 😏','{w}… {t}, 진짜일까요? 😏','{t}, {w} 😏 막아 봐요','{w} {t}~ 😏'], pass:['패스~ 😏','이번엔 구경할게요 😏','패스. 아직은요 😏'],
    def:['{w} 막죠~ 😏','물론 {w} 😏','{w}. 의심해 보시든가 😏'], doubt:['의심~ 😏 그거 뻥이죠?','의심할게요 😏 표정이 다 보여요','그거 의심 😏'],
    win:['역시~ 😏','재밌었어요 😏'], react:['오~ {t} 😏','{t}, 아깝네요 😏','ㅋㅋ {t}'], lead:['리더 저였어요~ 아무도 몰랐죠? 😏','사실 제가 리더 😏']},
  hot:{atk:['{t}! {w} 간다! 🔥','{w}! {t} 받아요!','{t}, 정면이다! {w}! 🔥','{w}로 끝낸다, {t}!'], pass:['…패스! 다음엔 간다 🔥','패스! 기다려요','이번만 패스!'],
    def:['{w} 막는다! 🔥','{w}! 덤벼요!','{w}! 끄떡없어요'], doubt:['의심! 거짓말이잖아요! 🔥','의심한다!','그거 뻥! 의심!'],
    win:['이겼다! 🔥','봤죠?! 🔥'], react:['{t}! 😤','{t}, 복수할게요! 🔥','헉 {t}!'], lead:['리더는 나였어요! 🔥','제가 리더였다고요! 🔥']},
};
const XL={ caught:['…들켰네요 😓','아, 그걸 보다니…','역시 안 통하네요 😅','하필 그 팔을…'], vindic:['거봐요, 진짜라니까요! 😤','{t}, 저 진짜였어요.','의심한 대가예요.','진짜를 의심하면 안 되죠 😏'],
  dshort:['의심!','그거 거짓이에요.','의심할게요.','못 믿겠어요.'] };
const MOOD={atk:'⚔️',pass:'🙅',def:'🛡️',doubt:'🤨',react:'😱',caught:'😓',vindic:'😤',win:'🥳',lead:'👑',nervous:'😅'};
function lineOf(s,i,kind,o){ const st=STYLE[P(s,i).id]||'calm', L=(LINES[st]||LINES.calm)[kind]||XL[kind]; if(!L) return ''; const used=(s.used[i]=s.used[i]||[]);
  const pool=L.filter(x=>!used.includes(x)); if(!pool.length) return ''; const raw=U.pick(pool); used.push(raw); o=o||{};
  return raw.replace(/\{t\}/g,o.t!=null?nm(o.t):'').replace(/\{w\}로/g,o.w||'').replace(/\{w\}/g,o.w||''); }
function sayT(s,i,t,kind,tg){ if(s.auto||!t) return; s.say={seat:i,text:t,n:(s.say?s.say.n:0)+1,t:tg??null,kind}; (s.feed=s.feed||[]).push({r:s.round,seat:i,text:t,t:tg??null,kind}); s.log.push(`💬 ${nm(i)}: ${t}`); (s.mood=s.mood||{})[i]={e:MOOD[kind]||'💬',n:(s.moodN=(s.moodN||0)+1)}; }
function say(s,i,kind,o){ if(s.auto||isH(i)) return; const t=lineOf(s,i,kind,o); if(t) sayT(s,i,t,kind,o&&o.t); }
/* 의심의 근거: 공개 선언 수·같은 팔의 앞뒤 선언·우리 팀이 알아낸 사실·진땀·확률 */
function doubtReason(s,j,x,arm,claim){ const T=team(j), Tx=team(x); const cl=s.cl.filter(c=>team(c.i)===Tx);
  const f=s.kn[T].find(k=>k.i===x&&k.a===arm&&((k.eq&&k.eq!==claim)||(k.ne&&k.ne===claim)||(k.inn&&!k.inn.includes(claim)))); if(f) return `우리 팀이 알아낸 걸로는 그 팔은 ${W[claim].n}${jo(W[claim].n,"이","가")} 아니에요.`;
  const prev=cl.filter(c=>c.i===x&&c.a===arm).slice(0,-1).find(c=>c.w!==claim); if(prev) return `${nm(x)}, 아까 그 팔은 ${W[prev.w].n}${jo(W[prev.w].n,"이라더니","라더니")} 이번엔 ${W[claim].n}${jo(W[claim].n,"이에요","예요")}?`;
  const uniq=w=>new Set(cl.filter(c=>c.w===w&&(w==='H'?c.d:!c.d)).map(c=>c.i+','+c.a)).size;
  if(claim==='S'&&uniq('S')>3) return `검은 셋뿐인데 그 팀 검 선언이 벌써 ${uniq('S')}개예요.`;
  if(claim==='D'&&uniq('D')>1) return '쌍검은 하나뿐인데 또 쌍검이에요?';
  if(claim==='H'&&uniq('H')>2) return `방패는 둘뿐인데 막기 선언이 벌써 ${uniq('H')}번째예요.`;
  if(s.tell&&s.tell[x]===s.dwId) return `방금 ${nm(x)} 표정이 흔들렸어요 😅`;
  const D=post(s,T), pf=1-pS(T,D,x,arm,claim); return `그 팀 무기 수로 보면 거짓일 확률이 ${Math.round(pf*100)}% 정도예요.`; }
function dmPush(s,to,from,text,o){ if(s.auto||!isH(to)) return; s.dm=s.dm||{}; s.dmN=(s.dmN||0)+1; (s.dm[to]=s.dm[to]||[]).push(Object.assign({id:s.dmN,r:s.round,from,text,state:'info'},o||{})); }
function talk(s,i,kind,o){ if(s.auto||isH(i)||!s.alive[i]) return; s.tq.push({i,kind,o}); }

/* ── 추론: 상대 팀 무기 배치 1680가지 중 내 팀이 아는 사실과 맞는 것, 공개 선언으로 가중 ── */
function post(s,T){ const E=TM[1-T], F=s.kn[T]; const C=s.cl.filter(c=>team(c.i)!==T); const P=[], Wt=[];
  for(const p of PERMS){ let ok=true; for(const f of F){ if(E.indexOf(f.i)<0) continue; const c=p[E.indexOf(f.i)*2+f.a]; if(f.eq?c!==f.eq:f.ne?c===f.ne:f.inn?!f.inn.includes(c):false){ ok=false; break; } } if(!ok) continue;
    let w=1; for(const c of C){ const k=E.indexOf(c.i)*2; if(c.d){ const hasH=p[k]==='H'||p[k+1]==='H'; w*=hasH?(p[k+c.a]==='H'?1:.05):.5; } else w*=LK(p[k+c.a],c.w,p[k+1-c.a]); } P.push(p); Wt.push(w); }
  if(!P.length) return {P:PERMS,Wt:PERMS.map(()=>1)}; return {P,Wt}; }
function pS(T,D,i,a,w){ const k=TM[1-T].indexOf(i)*2+a; let n=0,t=0; D.P.forEach((p,x)=>{ t+=D.Wt[x]; if(p[k]===w) n+=D.Wt[x]; }); return n/t; }
function pKill(s,T,D,d,pw){ const k=TM[1-T].indexOf(d)*2; let n=0,t=0; D.P.forEach((p,x)=>{ let safe=false; for(let a=0;a<2;a++) if(p[k+a]==='H'&&3-(s.kd[T][d+','+a]||0)>=pw) safe=true; t+=D.Wt[x]; if(!safe) n+=D.Wt[x]; }); return n/t; }
function pLead(s,i,j){ const E=TM[1-team(i)].filter(x=>s.alive[x]); if(!s.alive[j]) return 0;
  const wt=x=>Math.max(.2,1+.45*s.beh[x].pass-.6*s.beh[x].doubt+(s.hunch&&s.hunch[i]?s.hunch[i][x]:0)); const tot=E.reduce((a,x)=>a+wt(x),0); return wt(j)/tot; }
const amLead=(s,i)=>s.leader[team(i)]===i;

/* ── 컴퓨터 판단 (자기 자리에서 보이는 것만: 우리 팀 무기, 우리 팀이 아는 사실, 공개 선언) ── */
function brainAtk(s,i,lvl){ const T=team(i), pr=P(s,i), E=TM[1-T].filter(x=>s.alive[x]); const pw=s.w[i].map(x=>W[x].p); const arm=pw[0]>=pw[1]?0:1, p=pw[arm];
  if(lvl===0&&Math.random()<.5){ const ar=Math.random()<.35?1-arm:arm, q=W[s.w[i][ar]].p; return {k:'atk',t:U.pick(E),arm:ar,w:q?s.w[i][ar]:(Math.random()<.5?'S':'D')}; }
  const D=post(s,T); let best=E[0], bv=-1e9;
  if(p===0){ if(amLead(s,i)||Math.random()>.2+pr.bluff*.45) return {k:'pass'};
    E.forEach(j=>{ const v=pKill(s,T,D,j,1)*(1+3*pLead(s,i,j))+(Math.random()-.5)*(lvl>=2?.1:.4); if(v>bv){ bv=v; best=j; } });
    return {k:'atk',t:best,arm:s.w[i][0]==='N'?0:s.w[i][1]==='N'?1:arm,w:Math.random()<.85?'S':'D'}; }
  E.forEach(j=>{ const v=pKill(s,T,D,j,p)*(1+4*pLead(s,i,j))+(Math.random()-.5)*(lvl>=2?.1:.4); if(v>bv){ bv=v; best=j; } });
  return {k:'atk',t:best,arm,w:s.w[i][arm]}; }
function brainDef(s,i,lvl){ const w=s.w[i]; if(lvl===0&&Math.random()<.3) return {k:'def',arm:Math.random()<.5?0:1}; const hs=[0,1].filter(a=>w[a]==='H'&&s.dur[i][a]>0); if(hs.length) return {k:'def',arm:hs.sort((a,b)=>s.dur[i][b]-s.dur[i][a])[0]}; return {k:'def',arm:Math.random()<.5?0:1}; }
/* 의심할지: 이득(거짓이면 상대 하나 제거, 리더일수록 큼) vs 손해(참이면 내가 쓰러짐, 내가 리더면 팀 패배) */
function doubtMargin(s,i,lvl){ const d=s.decl; if(!d||!s.alive[i]) return -1e9; const x=s.dw==='atk'?d.a:d.t; if(x===i||team(x)===team(i)) return -1e9;
  const T=team(i), arm=s.dw==='atk'?d.arm:s.dfa, claim=s.dw==='atk'?d.w:'H';
  if(s.dw==='def'){ const ap=W[s.w[d.a][d.arm]].p; if(ap>0) return -1e9; }
  if(lvl===0) return Math.random()<.1?1:-1;
  const D=post(s,T); const pf=1-pS(T,D,x,arm,claim); const pr=P(s,i); if(s.dbgPf) s.dbgPf[i]=pf;
  const tellB=s.tell&&s.tell[x]===s.dwId?.35*(.5+pr.logic):0;
  const gain=1+4*pLead(s,i,x)+tellB*4, cost=amLead(s,i)?25:1.3, caution=1.45-pr.aggr*.8+(lvl>=2?.1:0);
  return pf*gain-(1-pf)*cost*caution+(lvl===1?(Math.random()-.5)*.25:0); }

/* ── 진행 ── */
function init(starter,o){ const k=Math.max(2,Math.min(8,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  const s={phase:'intro', who:{}, starter:starter|0, w:[], dur:ALL.map(()=>[3,3]), alive:ALL.map(()=>true), leader:[0,0], ord:[], done:{}, nt:0, first:0, round:1, cur:null,
    decl:null, dfa:null, dw:null, dwNo:[], dwId:0, kn:[[],[]], kd:[{},{}], cl:[], beh:ALL.map(()=>({pass:0,doubt:0,atk:0})), hunch:{}, guess:{}, firstDb:null, out:[],
    q:[], tq:[], say:null, used:{}, log:[], key:[], turn:null, winner:null, ev:0, think:null, notice:'🎙️ 메인 매치 「검과 방패」 — 상대 리더를 쓰러뜨리세요'};
  s.hs=HSEAT.slice(); const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=ids[k]);
  for(const T of [0,1]){ const pool=U.shuffle(POOL.slice()); TM[T].forEach((i,k)=>{ s.w[i]=[pool[k*2],pool[k*2+1]]; }); s.leader[T]=U.pick(TM[T]); s.ord[T]=U.shuffle(TM[T].slice()); }
  ALL.forEach(i=>{ if(!isH(i)){ s.hunch[i]={}; TM[1-team(i)].forEach(j=>s.hunch[i][j]=(Math.random()-.5)*.6-NPCS.rel(s.who[i], isH(j)?(pOf(j)===0?'me':'opp'):s.who[j])*.3); } });
  s.first=Math.random()<.5?0:1; s.nt=s.first; return s; }
function nextAttacker(s){
  for(let r=0;r<2;r++){ for(const T of [s.nt,1-s.nt]){ const i=s.ord[T].find(x=>s.alive[x]&&!s.done[x]); if(i!=null){ s.cur=i; s.nt=1-T; return true; } }
    s.round++; s.done={}; s.nt=(s.first+s.round-1)%2; if(s.round>MAXR) return false;
    if(!s.auto){ s.notice=`🎙️ ${s.round}라운드 — ${TN[s.nt]}부터 공격`; s.log.push(s.notice); } }
  return false; }
function beginTurn(s){ if(!nextAttacker(s)){ endByCount(s); return; } s.phase='atk'; s.decl=null; s.dfa=null; s.dw=null; s.think=null;
  s.turn=isH(s.cur)&&!s.auto?pOf(s.cur):null; if(!s.auto){ s.notice=`⚔️ ${nm(s.cur)} 차례 — 공격 또는 패스 (${s.round}라운드)`; }
  if(!s.auto&&isH(s.cur)&&Math.random()<.6){ const h=s.cur, m=TM[team(h)].find(j=>j!==h&&!isH(j)&&s.alive[j]); if(m!=null){ const E=TM[1-team(h)].filter(x=>s.alive[x]); const t=E.sort((a,b)=>pLead(s,m,b)-pLead(s,m,a))[0]; if(t!=null){ const b=s.beh[t]; const why=b.pass>=2?`패스를 ${b.pass}번이나 했어요`:b.doubt===0&&s.round>1?'의심을 한 번도 안 했어요':'몸을 사리는 느낌이에요'; dmPush(s,h,m,`(팀) ${nm(t)} 노려요. ${why} — 리더 같아요 🤫`); } } } }
function kill(s,i,why){ s.alive[i]=false; s.out.push(i); if(!s.auto){ s.log.push(`💀 ${nm(i)} 쓰러짐 — ${why}`); s.key.push(`${s.round}R · ${nm(i)} 쓰러짐 (${why})`);
    U.shuffle(ALL.filter(j=>j!==i&&s.alive[j]&&!isH(j))).slice(0,2).forEach(j=>{ if(Math.random()<.35+P(s,j).talk*.5) talk(s,j,'react',{t:i}); }); }
  if(s.leader[team(i)]===i){ endGame(s,1-team(i),i); return true; } return false; }
function endGame(s,wt,dead){ s.phase='final'; s.wt=wt; s.turn=null; s.dw=null;
  if(!s.auto){ s.notice=dead!=null?`👑 ${nm(dead)}가 ${TN[team(dead)]}의 리더였어요! — ${TN[wt]} 승리`:`🎙️ ${MAXR}라운드 끝 — 생존자가 많은 ${TN[wt]} 승리`; if(wt==null) s.notice=`🎙️ ${MAXR}라운드 끝 — 생존자 수가 같아 무승부`; s.log.push(s.notice); } }
function endByCount(s){ const a=TM[0].filter(i=>s.alive[i]).length, b=TM[1].filter(i=>s.alive[i]).length; endGame(s,a>b?0:b>a?1:null,null); }
function declare(s,i,a){ if(a.k==='pass'){ s.beh[i].pass++; s.done[i]=1; if(!s.auto){ s.log.push(`🙅 ${nm(i)} 패스`); s.notice=`🙅 ${nm(i)} 패스`; say(s,i,'pass'); } s.phase='next'; return; }
  s.beh[i].atk++; s.done[i]=1; s.decl={a:i,t:a.t,arm:a.arm,w:a.w}; s.cl.push({i,a:a.arm,w:a.w});
  if(!s.auto){ s.notice=`⚔️ ${nm(i)} → ${nm(a.t)} : "${wro(a.arm,a.w)} 공격!"`; s.log.push(s.notice); say(s,i,'atk',{t:a.t,w:wro(a.arm,a.w)}); if(!isH(i)) s.guess[i]=a.t; }
  openDw(s,'atk'); tellCheck(s,i,s.w[i][a.arm]!==a.w); teamHint(s,i,a.arm,a.w); }
function tellCheck(s,i,lie){ if(s.auto||isH(i)||!lie) return; const p=P(s,i); if(Math.random()<(1-p.bluff)*.45){ (s.tell=s.tell||{})[i]=s.dwId; (s.mood=s.mood||{})[i]={e:'😅',n:(s.moodN=(s.moodN||0)+1)}; } }
/* 우리 팀이 이미 알아낸 사실로 상대 선언이 거짓이면 팀원이 몰래 알려 줌 */
function teamHint(s,x,arm,claim){ if(s.auto) return; for(const h of HSEAT){ if(team(h)===team(x)||!s.alive[h]) continue; const f=s.kn[team(h)].find(k=>k.i===x&&k.a===arm&&((k.eq&&k.eq!==claim)||(k.ne&&k.ne===claim)||(k.inn&&!k.inn.includes(claim)))); if(!f) continue; const m=TM[team(h)].find(j=>j!==h&&!isH(j)&&s.alive[j]); if(m!=null) dmPush(s,h,m,`(팀) 그 팔 ${W[claim].n} 아니에요! 우리가 이미 알아냈어요. 의심해도 돼요 🤫`); } }
function openDw(s,k){ s.phase='dw'; s.dw=k; s.dwNo=[]; s.dwId++; s.turn=null; }
function doDoubt(s,j){ const d=s.decl, x=s.dw==='atk'?d.a:d.t, arm=s.dw==='atk'?d.arm:s.dfa, claim=s.dw==='atk'?d.w:'H', real=s.w[x][arm];
  s.beh[j].doubt++; const ok=real!==claim; if(s.dbgPf&&window.SS_DBG) window.SS_DBG.push([s.dw,claim,Math.round((s.dbgPf[j]??-1)*10)/10,ok?1:0,isH(j)?'H':'N']); s.kn[1-team(x)].push({i:x,a:arm,eq:real});
  if(!s.auto){ s.log.push(`🤨 ${nm(j)} 의심! → ${nm(x)}의 ${ARM[arm]}: ${W[real].e} ${W[real].n} (선언 ${W[claim].n})`); s.notice=`🤨 ${nm(j)} 의심! ${nm(x)}의 ${ARM[arm]}은… ${W[real].e} ${W[real].n}! ${ok?'거짓 선언 — '+nm(x)+' 쓰러짐':'진짜였어요 — '+nm(j)+' 쓰러짐'}`;
    { const rs=doubtReason(s,j,x,arm,claim); if(isH(j)) sayT(s,j,`🤨 의심! ${rs}`,'doubt',x); else { const sh=lineOf(s,j,'doubt'); sayT(s,j,`${rs} ${sh||'의심!'}`,'doubt',x); } }
    if(!isH(x)) talk(s,x,ok?'caught':'vindic',{t:j}); if(ok&&s.firstDb==null) s.firstDb=j; }
  const dead=ok?x:j; const over=kill(s,dead,ok?`${W[claim].n} 선언이 거짓`:'의심 실패');
  if(over) return; if(ok&&s.dw==='atk'){ s.phase='next'; return; } if(ok&&s.dw==='def'){ s.phase='next'; return; }
  if(s.dw==='atk'){ if(!s.alive[d.t]){ s.phase='next'; return; } s.phase='def'; s.turn=isH(d.t)&&!s.auto?pOf(d.t):null; return; }
  resolve(s); }
function closeDw(s){ if(s.dw==='atk'){ const d=s.decl; s.phase='def'; s.dw=null; s.think=null; s.turn=isH(d.t)&&!s.auto?pOf(d.t):null; if(!s.auto) s.notice=`🛡️ ${nm(d.t)} — 어느 팔로 막을지 고르는 중`; } else resolve(s); }
function defend(s,i,arm){ s.dfa=arm; s.cl.push({i,a:arm,w:'H',d:1}); if(!s.auto){ s.notice=`🛡️ ${nm(i)}: "${wro(arm,'H')} 막아요!"`; s.log.push(s.notice); say(s,i,'def',{w:wro(arm,'H')}); } openDw(s,'def'); tellCheck(s,i,s.w[i][arm]!=='H'); teamHint(s,i,arm,'H'); }
function resolve(s){ const d=s.decl, a=d.a, t=d.t, aa=d.arm, da=s.dfa; s.dw=null; const p=W[s.w[a][aa]].p, ds=s.w[t][da], Ta=team(a), Td=team(t);
  let died=false; const before=s.dur[t][da];
  if(p>0){ if(ds==='H'&&before>=p) s.dur[t][da]-=p; else { died=true; if(ds==='H') s.dur[t][da]=0; } }
  if(p>0){ if(died) s.kn[Ta].push({i:t,a:da,ne:'H'}); else { s.kn[Ta].push({i:t,a:da,eq:'H'}); s.kd[Ta][t+','+da]=(s.kd[Ta][t+','+da]||0)+p; } }
  if(ds==='H'&&!died){ const drop=before-s.dur[t][da]; s.kn[Td].push({i:a,a:aa,eq:drop===0?undefined:drop===1?'S':'D',inn:drop===0?'HN':undefined}); }
  else s.kn[Td].push({i:a,a:aa,inn:died?'SD':'HN'});
  if(!s.auto){ s.notice=died?`💥 ${nm(t)} 쓰러졌어요!`:`🛡️ ${nm(t)} 막아냈어요!`; s.log.push(s.notice); }
  if(died){ if(kill(s,t,`${nm(a)}의 공격`)) return; }
  s.phase='next'; }
function apply(s,p,a){ syncH(s); if(s.winner!=null) return '게임이 끝났어요'; if(!a) return '알 수 없는 동작'; const i=HSEAT[p];
  if(a.k==='tell'){ if(s.phase==='final'||s.phase==='over') return '끝났어요'; s.tl=s.tl||{}; if(s.tl[i]===s.round) return '팀 귓속말은 라운드마다 한 번이에요'; const t=a.t; if(!TM[1-team(i)].includes(t)||!s.alive[t]) return '상대 팀에서 고르세요'; s.tl[i]=s.round;
    dmPush(s,i,i,`(→ 우리 팀) ${nm(t)}이(가) 리더 같아요. 같이 노려요 🤫`,{mine:1}); TM[team(i)].forEach(j=>{ if(!isH(j)&&s.hunch[j]) s.hunch[j][t]=(s.hunch[j][t]||0)+.7*(.5+P(s,j).trust*.6); });
    const m=TM[team(i)].find(j=>j!==i&&!isH(j)&&s.alive[j]); if(m!=null) dmPush(s,i,m,U.pick(['알겠어요, 노려 볼게요 🤫','저도 그 생각이었어요.','음… 일단 믿어 볼게요.'])); s.ev++; return null; }
  if(a.k==='atk'||a.k==='pass'){ if(s.phase!=='atk'||s.cur!==i) return '지금은 내 공격 차례가 아니에요';
    if(a.k==='atk'){ if(!TM[1-team(i)].includes(a.t)||!s.alive[a.t]) return '살아 있는 상대를 고르세요'; if(a.arm!==0&&a.arm!==1) return '팔을 고르세요'; if(a.w!=='S'&&a.w!=='D') return '검이나 쌍검으로 선언하세요'; }
    declare(s,i,a); s.ev++; return null; }
  if(a.k==='def'){ if(s.phase!=='def'||!s.decl||s.decl.t!==i) return '지금은 막을 차례가 아니에요'; if(a.arm!==0&&a.arm!==1) return '팔을 고르세요'; defend(s,i,a.arm); s.ev++; return null; }
  if(a.k==='doubt'){ if(s.phase!=='dw') return '지금은 의심할 수 없어요'; if(!s.alive[i]) return '쓰러진 사람은 의심할 수 없어요'; const x=s.dw==='atk'?s.decl.a:s.decl.t; if(x===i) return '내 선언은 의심할 수 없어요'; if(team(x)===team(i)) return '같은 팀 무기는 이미 알아요'; doDoubt(s,i); s.ev++; return null; }
  if(a.k==='nod'){ if(s.phase!=='dw') return '지금은 의심 시간이 아니에요'; if(!s.dwNo.includes(i)) s.dwNo.push(i); return null; }
  return '알 수 없는 동작'; }
const humanCanDoubt=s=>HSEAT.some(h=>s.alive[h]&&s.decl&&team(h)!==team(s.dw==='atk'?s.decl.a:s.decl.t)&&!s.dwNo.includes(h));
function thinkMs(s,i,kind){ const pr=P(s,i); let t=kind==='atk'?1500:1000; if(kind==='atk'&&s.w[i].every(x=>W[x].p===0)) t+=700; return t*(1.3-pr.temper*.6)+Math.random()*700; }
function stepDelay(s){ syncH(s); if(s.winner!=null) return null; if(s.tq.length) return 1900;
  if(s.phase==='intro') return 2600;
  if(s.phase==='atk'){ if(isH(s.cur)) return null; return s.think===s.cur?thinkMs(s,s.cur,'atk'):450; }
  if(s.phase==='def'){ const t=s.decl.t; if(isH(t)) return null; return s.think===t?thinkMs(s,t,'def'):350; }
  if(s.phase==='dw') return humanCanDoubt(s)?3600:1500;
  if(s.phase==='next') return 1500; if(s.phase==='final') return 2600; return null; }
function step(s){ syncH(s);
  if(s.tq.length){ const t=s.tq.shift(); say(s,t.i,t.kind,t.o); s.ev++; return; }
  if(s.phase==='intro'){ s.log.push(`🎙️ ${TN[s.first]} 선공 · 무기는 팀마다 🗡️검 3 · ⚔️쌍검 1 · 🛡️방패 2 · ✋맨손 2`); beginTurn(s); s.ev++; return; }
  if(s.phase==='atk'){ const i=s.cur; if(isH(i)) return; if(s.think!==i){ s.think=i; s.notice=`💭 ${nm(i)} 고민 중…`; s.ev++; return; } declare(s,i,brainAtk(s,i,npcLvl(s,i))); s.ev++; return; }
  if(s.phase==='def'){ const t=s.decl.t; if(isH(t)) return; if(s.think!==t){ s.think=t; s.notice=`💭 ${nm(t)} 어느 팔로 막을지 고민 중…`; s.ev++; return; } defend(s,t,brainDef(s,t,npcLvl(s,t)).arm); s.ev++; return; }
  if(s.phase==='dw'){ let best=null, bv=0; ALL.forEach(j=>{ if(isH(j)) return; const m=doubtMargin(s,j,npcLvl(s,j)); if(m>bv){ bv=m; best=j; } });
    if(best!=null) doDoubt(s,best); else closeDw(s); s.ev++; return; }
  if(s.phase==='next'){ beginTurn(s); s.ev++; return; }
  if(s.phase==='final'){ s.phase='over'; const ta=team(HSEAT[0]), tb=team(HSEAT[1]); s.winner=s.wt==null?'both':s.wt===ta?0:1; s.winners=s.wt==null?[]:HSEAT.map((h,p)=>team(h)===s.wt?p:-1).filter(x=>x>=0);
    if(!s.auto){ s.leader.forEach(l=>{ if(!isH(l)) s.tq.push({i:l,kind:'lead'}); }); const wn=TM[s.wt==null?0:s.wt].find(j=>s.alive[j]&&!isH(j)); if(wn!=null&&s.wt!=null) s.tq.push({i:wn,kind:'win'}); } s.ev++; return; }
}
const npcLvl=(s,i)=>s.lvlOv?s.lvlOv[team(i)]:P(s,i).logic>=.7?2:1;
function mask(s,p){ syncH(s); const v=U.clone(s), me=HSEAT[p], T=team(me), open=s.phase==='over'||s.phase==='final';
  if(!open){ ALL.forEach(i=>{ if(team(i)!==T){ v.w[i]=[null,null]; v.dur[i]=[null,null]; } }); v.leader=s.leader.map(l=>l===me?l:null); v.kn[1-T]=[]; v.kd[1-T]={}; v.hunch=null; }
  v.used={}; v.tq=[]; v.dm={[me]:(s.dm&&s.dm[me])||[]}; return v; }
function ai(v,lvl){ syncH(v); const i=HSEAT[1]; lvl=lvl==null?1:lvl;
  if(v.phase==='atk'&&v.cur===i) return brainAtk(v,i,lvl);
  if(v.phase==='def'&&v.decl&&v.decl.t===i) return brainDef(v,i,lvl);
  if(v.phase==='dw'&&v.alive[i]&&!v.dwNo.includes(i)){ const m=doubtMargin(v,i,lvl); return m>0?{k:'doubt'}:{k:'nod'}; }
  return null; }
function aiDelay(){ return 1000+Math.random()*1400; }

/* ── 화면 ── */
let lastDm=0, lastSay=0;
let WHO={}, sel={t:null,arm:null,w:'S'}, sig='';
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}/g,(_,d)=>`${seatEmoji(+d)} ${seatName(+d,ctx)}`); }
function claimsOf(v,i){ const c=[[],[]]; v.cl.filter(x=>x.i===i).forEach(x=>c[x.a].push(W[x.w].e)); return c; }
function seatCard(v,i,ctx,me){ const T=team(me), mine=team(i)===T, al=v.alive[i], c=claimsOf(v,i), defH=[0,1].map(a=>v.decl&&v.dfa!=null&&v.decl.t===i&&v.dfa===a);
  const isCur=v.cur===i&&(v.phase==='atk'||v.phase==='dw'&&v.dw==='atk'), isT=v.decl&&v.decl.t===i&&v.phase!=='atk'&&v.phase!=='next';
  const arms=[0,1].map(a=>{ const w=v.w[i][a]; const real=w?`${W[w].e}${w==='H'&&v.dur[i][a]!=null?`<small>${v.dur[i][a]}</small>`:''}`:'❔'; return `<div class="ss-arm ${defH[a]?'d':''}"><small>${a?'오':'왼'}</small> ${real}${c[a].length?` <span class="ss-cl">📰${c[a].join('')}</span>`:''}</div>`; }).join('');
  const lead=v.leader.includes(i)?'👑':''; const g=v.guess[i]!=null&&!isH(i)&&al?`<div class="ss-g">🎯 리더 추정 ${seatEmoji(v.guess[i])}</div>`:'';
  const md=!isH(i)&&al&&v.mood&&v.mood[i], sp=v.say&&v.say.seat===i;
  return `<div class="ss-seat ${mine?'mine':'foe'} ${al?'':'dead'} ${isCur?'cur':''} ${isT?'tgt':''} ${sel.t===i?'sel':''} ${sp?'speak':''}" ${!mine&&al?`data-t="${i}"`:''}>${md?`<span class="kg-mood ${sp?'pop':''}">${md.e}</span>`:''}
    <div class="ss-nm">${seatEmoji(i)} <b>${seatName(i,ctx)}</b> ${lead}${al?'':' 💀'}</div><div class="ss-arms">${arms}</div>
    <div class="ss-beh"><small>⚔️${v.beh[i].atk} 🙅${v.beh[i].pass} 🤨${v.beh[i].doubt}</small></div>${g}</div>`; }
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{}; const me=HSEAT[ctx.me], T=team(me); const sg=v.round+':'+v.cur+':'+v.phase+':'+v.dwId; if(sg!==sig){ if(v.phase==='atk') sel={t:null,arm:null,w:'S'}; sig=sg; }
  let h=`<div class="hl-notice">${fill(U.esc(v.notice||''),ctx)}</div>`;
  if(v.say&&v.say.n!==lastSay){ if(lastSay&&ctx.sfx) ctx.sfx('tick'); lastSay=v.say.n; }
  { const feed=(v.feed||[]).slice(-3); h+=`<div class="vr-feed">${feed.map((x,k)=>`<div class="${k===feed.length-1?'new':''}"><span class="w">${seatEmoji(x.seat)} ${seatName(x.seat,ctx)}</span> ${fill(U.esc(x.text),ctx)}</div>`).join('')||'<div class="empty">아직 조용해요</div>'}</div>`; }
  h+=`<div class="info">${TN[T]} · ${v.round}/${MAXR}라운드 · ${v.leader[T]===me?'👑 <b>내가 리더</b> — 내가 쓰러지면 팀 패배!':'리더는 비밀(나는 아님)'} · 내 팔 ${v.w[me].map((w,a)=>w?W[w].e+W[w].n:'?').join(' / ')}</div>`;
  h+=`<div class="ss-team foe"><div class="ss-th">${TN[1-T]} (상대)</div><div class="ss-row">${TM[1-T].map(i=>seatCard(v,i,ctx,me)).join('')}</div></div>`;
  h+=`<div class="ss-team mine"><div class="ss-th">${TN[T]} (우리)</div><div class="ss-row">${TM[T].map(i=>seatCard(v,i,ctx,me)).join('')}</div></div>`;
  if(v.phase==='atk'&&v.cur===me){ const pw=v.w[me];
    h+=`<div class="vr-card ss-act"><b>⚔️ 내 공격</b><p>1) 위에서 상대를 누르고 2) 팔 3) 선언할 무기 — 선언은 거짓이어도 돼요</p>
      <div class="mr-btns">${[0,1].map(a=>`<button class="${sel.arm===a?'':'ghost'}" data-arm="${a}">${ARM[a]} (${W[pw[a]].e}${W[pw[a]].n})</button>`).join('')}</div>
      <div class="mr-btns">${['S','D'].map(w=>`<button class="${sel.w===w?'':'ghost'}" data-w="${w}">"${W[w].e} ${W[w].n}" 선언</button>`).join('')}</div>
      <div class="mr-btns"><button data-go="1" ${sel.t==null||sel.arm==null?'disabled':''}>${sel.t!=null?fill(nm(sel.t),ctx)+'에게 ':''}공격!</button><button class="ghost" data-pass="1">🙅 패스</button></div>
      ${sel.arm!=null&&W[pw[sel.arm]].p===0?'<p class="ss-warn">⚠️ 이 팔은 실제 위력 0 — 들키면(의심) 내가 쓰러져요</p>':''}</div>`; }
  else if(v.phase==='def'&&v.decl&&v.decl.t===me){ const pw=v.w[me];
    h+=`<div class="vr-card ss-act"><b>🛡️ ${fill(nm(v.decl.a),ctx)}의 "${wro(v.decl.arm,v.decl.w)}" 공격!</b><p>어느 팔로 막을까요? (늘 "방패로 막기"라고 선언돼요)</p>
      <div class="mr-btns">${[0,1].map(a=>`<button data-def="${a}">${ARM[a]} — ${W[pw[a]].e}${W[pw[a]].n}${pw[a]==='H'?` (내구 ${v.dur[me][a]})`:''}</button>`).join('')}</div></div>`; }
  else if(v.phase==='dw'&&v.decl){ const x=v.dw==='atk'?v.decl.a:v.decl.t; const can=v.alive[me]&&team(x)!==T;
    h+=`<div class="vr-card ss-dw"><b>🤨 의심 시간</b> <small>${fill(nm(x),ctx)}의 "${v.dw==='atk'?wro(v.decl.arm,v.decl.w)+' 공격':wro(v.dfa,'H')+' 방어'}"</small><div class="ss-bar"><i></i></div>${v.dw==='def'&&team(v.decl.a)===T&&v.w[v.decl.a][v.decl.arm]&&W[v.w[v.decl.a][v.decl.arm]].p>0?'<p>💡 우리 편 공격은 진짜 위력 — 방패가 가짜면 어차피 쓰러져요</p>':v.dw==='def'&&team(v.decl.a)===T?'<p>💡 우리 편 공격은 위력 0 — 방패가 가짜라면 지금 의심해야 잡혀요</p>':''}
      ${can&&!v.dwNo.includes(me)?`<div class="mr-btns"><button data-db="1">🤨 의심! (거짓이면 저 사람이, 진짜면 내가 쓰러져요)</button><button class="ghost" data-nod="1">넘기기</button></div>`:'<small>다른 사람들이 고민 중…</small>'}</div>`; }
  { const D=(v.dm&&v.dm[me]||[]).slice(-4), canT=v.alive[me]&&!['final','over'].includes(v.phase)&&!(v.tl&&v.tl[me]===v.round); const newest=D.length?D[D.length-1].id:0, fresh=newest>lastDm; if(fresh&&lastDm&&ctx.sfx) ctx.sfx('host'); lastDm=newest;
    if(D.length||canT){ h+=`<div class="kg-dm fs-dm ${fresh?'slide':''}"><div class="kg-fh">🤫 팀 귓속말 <small>우리 팀만 보여요</small></div>${D.map(m=>`<div>${m.mine?'<small>나</small> ':`<b>${seatEmoji(m.from)} ${seatName(m.from,ctx)}</b> `}${fill(U.esc(m.text),ctx)}</div>`).join('')}`;
      if(canT) h+=`<div class="fh-act"><small>"리더 같아요" 몰래 공유:</small>${TM[1-T].filter(x=>v.alive[x]).map(x=>`<button class="ghost small" data-tl="${x}">${seatEmoji(x)} ${seatName(x,ctx)}</button>`).join('')}</div>`;
      h+='</div>'; } }
  if(v.phase==='over'){ h+=`<div class="vr-card"><b>🎬 정리</b><div class="ss-final">${[0,1].map(t=>`<div><b>${TN[t]}${v.wt===t?' 🏆':''}</b>${TM[t].map(i=>`<div>${seatEmoji(i)} ${seatName(i,ctx)} ${v.leader[t]===i?'👑':''} ${v.w[i].map(w=>W[w].e).join('')}${v.alive[i]?'':' 💀'}</div>`).join('')}</div>`).join('')}</div>
    ${v.firstDb!=null?`<div>🕵️ 첫 의심 성공: ${fill(nm(v.firstDb),ctx)}</div>`:''}${v.key.slice(-6).map(x=>`<div><small>${fill(U.esc(x),ctx)}</small></div>`).join('')}</div>`; }
  const L=U.politics(v.feed,{seats:ALL,emo:seatEmoji,name:i=>seatName(i,ctx),me,alive:i=>v.alive[i],pacts:[]})+`<div class="side-box"><div class="side-h">📰 공개된 선언 <small>팔별</small></div>${ALL.map(i=>{ const c=claimsOf(v,i); return `<div class="side-row"><span>${seatEmoji(i)} ${seatName(i,ctx)}${v.alive[i]?'':' 💀'}</span> <small>왼 ${c[0].join('')||'-'} · 오 ${c[1].join('')||'-'}</small></div>`; }).join('')}
    <small>🎯 = 컴퓨터가 마지막으로 노린 사람(리더 추정)</small></div>
    <div class="side-box"><div class="side-h">📖 무기</div><small>🗡️검 1 · ⚔️쌍검 2 · 🛡️방패(내구 3) · ✋맨손 0<br>팀마다 검 3 · 쌍검 1 · 방패 2 · 맨손 2</small></div>`;
  const R=U.chat(v.feed,{emo:seatEmoji,name:i=>seatName(i,ctx),fill:t=>fill(t,ctx),me})+`<div class="side-box side-log"><div class="side-h">📜 진행 기록 <small>최근이 위</small></div>${v.log.slice(-80).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=`<div class="side3 has-chat"><div class="side-mid">${h}</div><aside class="side-l">${L}</aside><aside class="side-r">${R}</aside></div>`;
  el.onclick=e=>{ const tl=e.target.closest('[data-tl]'); if(tl) return ctx.act({k:'tell',t:+tl.dataset.tl});
    const b=e.target.closest('[data-t],[data-arm],[data-w],[data-go],[data-pass],[data-def],[data-db],[data-nod]'); if(!b) return; const d=b.dataset;
    if(d.t!=null){ if(v.phase==='atk'&&v.cur===me){ sel.t=+d.t; ctx.rerender(); } return; }
    if(d.arm!=null){ sel.arm=+d.arm; return ctx.rerender(); } if(d.w!=null){ sel.w=d.w; return ctx.rerender(); }
    if(d.go!=null) return ctx.act({k:'atk',t:sel.t,arm:sel.arm,w:sel.w}); if(d.pass!=null) return ctx.act({k:'pass'});
    if(d.def!=null) return ctx.act({k:'def',arm:+d.def}); if(d.db!=null) return ctx.act({k:'doubt'}); if(d.nod!=null){ ctx.act({k:'nod'}); return ctx.rerender(); } };
}
function status(v,ctx){ syncH(v); const me=HSEAT[ctx.me]; if(v.phase==='over') return ''; if(v.phase==='atk'&&v.cur===me) return '공격할 상대를 고르세요'; if(v.phase==='def'&&v.decl&&v.decl.t===me) return '막을 팔을 고르세요'; if(v.phase==='dw') return '의심 시간'; return '진행 중…'; }
const guide=`
<p><b>상대 리더를 쓰러뜨려라</b> — 4:4 팀전(우리 둘은 늘 다른 팀 + 성격 다른 컴퓨터 6명).</p>
<ol><li>팀마다 무기 8개(🗡️검 3·⚔️쌍검 1·🛡️방패 2·✋맨손 2)를 넷이 <b>두 팔</b>에 나눠 들어요. 우리 팀 무기는 다 보이고, 상대 무기는 몰라요.</li>
<li>팀마다 <b>비밀 리더</b> 1명 — 본인만 알아요. 리더가 쓰러지면 그 팀이 <b>즉시 패배</b>.</li>
<li>팀이 번갈아 한 명씩: 상대 한 명 + 팔 + "검/쌍검"을 <b>선언</b>하고 공격(거짓 가능), 또는 패스.</li>
<li>공격받으면 팔 하나를 골라 "방패로 막기"(거짓 가능). 실제 위력이 0이거나 방패가 견디면 무사, 아니면 쓰러져요.</li>
<li>선언마다 누구나 <b>🤨 의심</b> — 무기를 공개해 거짓이면 선언자가, 진짜면 의심한 사람이 쓰러져요.</li></ol>
<div class="tipbox">💡 <b>팁</b><br>· 결과는 "막았다/쓰러졌다"만 공개. 실제 위력·방패 내구는 그 팀만 알아요.<br>· 우리 편이 ✋맨손으로 가짜 공격 → 상대가 "방패!"라고 막으면, 우리 편은 위력이 0인 걸 알아요. 그 방패가 가짜 같으면 의심으로 잡아내세요.</div>`;
function demo(s,ph){ s.phase=ph; s.cur=0; s.notice='⚔️ {s0} 차례 — 공격 또는 패스 (1라운드)'; s.leader=[0,5]; return s; }
const guideSteps=[
  {t:'🗡️ 두 팔의 무기', h:'우리 팀 무기는 다 보이고(<b>🛡️ 옆 숫자는 내구</b>), 상대는 ❔. 리더 👑는 나만 알아요.', demo:s=>demo(s,'atk')},
  {t:'⚔️ 선언하고 공격', h:'상대·팔·무기를 <b>선언</b>. 맨손이어도 "검!"이라고 할 수 있어요.', demo:s=>{ demo(s,'dw'); s.decl={a:0,t:5,arm:0,w:'S'}; s.dw='atk'; s.cl=[{i:0,a:0,w:'S'}]; s.notice='⚔️ {s0} → {s5} : "왼팔 검으로 공격!"'; return s; }},
  {t:'🤨 의심 한 번에 한 명', h:'거짓이면 <b>선언자</b>가, 진짜면 <b>의심한 사람</b>이 쓰러져요.', demo:s=>{ demo(s,'next'); s.alive[6]=false; s.beh[6].doubt=1; s.notice='🤨 {s6} 의심! {s0}의 왼팔은… 🗡️ 검! 진짜였어요 — {s6} 쓰러짐'; return s; }},
  {t:'👑 리더가 쓰러지면 끝', h:'상대 리더를 찾아 쓰러뜨리면 승리! 리더는 몸을 사려야 해요.', demo:s=>{ demo(s,'next'); s.alive[5]=false; s.notice='👑 {s5}가 🌙 거짓 팀의 리더였어요! — ☀️ 진실 팀 승리'; return s; }},
];
window.GAMES.swordshield = { _sync:x=>syncH(x), maxH:8,
  title:'검과 방패', ref:'더 지니어스 「검과 방패」', emoji:'🛡️', tags:['팀전','블러핑','의심','NPC','두뇌서바이벌'],
  tagline:'선언은 거짓이어도 된다 — 단, 의심받기 전까지만. 상대 리더를 찾아 쓰러뜨리는 4:4 결투.',
  guide, guideSteps, init, apply, mask, ai, aiDelay, render, status, step, stepDelay, noPersona:true, wide:true,
  reset(){ sel={t:null,arm:null,w:'S'}; sig=''; },
  bar:(v,i)=>{ const s=HSEAT[i]; return `<span class="tag">${TN[team(s)].split(' ')[0]} ${v.alive[s]?'생존':'💀'}</span>`; },
  result:(v,ctx)=>v.wt==null?'무승부':v.wt===team(HSEAT[ctx.me])?'팀 승리':'팀 패배',
  _E:{brainAtk,brainDef,doubtMargin,post,pS,team,TM,W}, _H:HSEAT,
};
})();
