(function(){
'use strict';
/* 바이러스 테러 (8인: 우리 둘 + NPC 6명). 자리 번호 1~8이 원으로 이어짐.
   역할: 테러리스트2(서로 앎) · 연구원1 · 기자1 · 수사관1 · 시민3 (시민 중 1명은 몰래 항체 보유자 — 본인도 모름).
   밤(몰래): 테러 — 1번째 밤 최초 감염자 지정, 이후 저격(각 1회)·해독제(각 1회) / 연구원 — 한 명 항체 검사 / 기자 — 한 명 정체 취재 / 수사관 — 저격(총 2발)
            누구나 — 검사소에서 내 감염 확인(1회)
   바이러스: 최초 감염자에서 매 라운드 양쪽으로 한 칸씩(죽은 자리는 건너뜀). 감염 뒤 두 라운드가 지나면 사망. 해독제 받은 자리는 치료+면역+그 방향 전염 멈춤. 항체 보유자는 안 죽음.
   승리: 시민 팀 — 테러 둘 다 사망 또는 치료제 완성(항체 보유자 2번 찾기) 또는 MAXR 라운드 버팀 / 테러 팀 — 항체 보유자 말고 시민 쪽 전멸.
   NPC: npc.js 인물. 각자 속생각 bel[i][j](j가 테러일 것 같은 정도)를 들은 말·사망자 정체·과거 발언으로 갱신하고, 성향(talk·aggr·trust·bluff·logic·temper)대로 말하고 행동함.
   공개 마음 mind[i](의심·신뢰·주장·기분)와 대화 기록 hist는 모두에게 보임. */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로 — 원에 고르게(0,4,2,6,1,5,3,7), 나머지는 NPC */
const N=8, MAXR=7; let HSEAT=[0,4]; const SEATORD=[0,4,2,6,1,5,3,7];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const ROLE={terror:'💣 테러리스트', research:'🧪 연구원', reporter:'📰 기자', detective:'🔫 수사관', citizen:'🙂 시민'};
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i);
const ALL=[...Array(N).keys()];
const side=r=> r==='terror' ? 'terror' : 'citizen';
const T={night:1500, ann:2200};
const ACCUSE=['accuse','reveal','agree','recall','counter','doubt','sweat'];
const MOOD={leak:'🤭',outed:'😡',guard:'🤝',claimN:'🙋',claim:'🙋',cleanN:'😌',clean:'😌',counterclaim:'😠',claimQ:'🤨',claimOK:'🤝',cleanQ:'🤨',probe:'🧐',ansCalm:'🙂',ansNervous:'😅',ansHint:'😉',sweat:'🤨',told:'😎',sorry:'😢',grief:'😢',accuse:'🤨',reveal:'📢',clear:'🙂',worry:'😰',quiet:'🤔',research:'🧪',defend:'😤',counter:'😠',agree:'🤨',recall:'🧐',thanks:'🤝',doubt:'🧐'};
const npcSeats=()=>ALL.filter(i=>!isH(i));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const dist=(a,b)=>{ const d=Math.abs(a-b); return Math.min(d,N-d); };

function init(starter,o){ const k=Math.max(2,Math.min(8,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  const roles=U.shuffle(['terror','terror','research','reporter','detective','citizen','citizen','citizen']);
  const cits=ALL.filter(i=>roles[i]==='citizen'), antibody=U.pick(cits);
  const ids=NPCS.cast(npcSeats().length), cast={}; npcSeats().forEach((i,k)=>cast[i]=ids[k]);
  const bel=ALL.map(i=>ALL.map(j=> i===j ? -99 : (roles[i]==='terror'&&roles[j]==='terror') ? -99 : (Math.random()-.5)*.6));
  ALL.forEach(i=>{ if(isH(i)) return; ALL.forEach(j=>{ if(i!==j&&bel[i][j]>-50) bel[i][j]-=NPCS.rel(cast[i], isH(j)?(j===HSEAT[0]?'me':'opp'):cast[j])*.8; }); });
  return {roles, antibody, cast, bel, alive:Array(N).fill(true), round:0, phase:'roles', ready:HSEAT.map(()=>false), hs:HSEAT.slice(),
    infected:{}, origin:null, fronts:null, immune:{}, snipe:{}, antidote:{}, bullets:2, research:0, tested:{}, selfTest:{},
    known:ALL.map(()=>({})), night:{}, ann:[], annIdx:0, chatQ:[], typing:null, log:[],
    mind:ALL.map(()=>({sus:null,trust:null,claim:null,mood:null})), hist:[], said:HSEAT.map(()=>0), talkN:0, doubted:{}, cause:{}, focus:null, dm:{}, dmN:0, pact:{}, secret:{}, wh:{}, leak:[],
    turn:null, starter, winner:null, notice:'역할을 확인하세요', ev:0};
}
const nm=i=>`{s${i}}`;
const P=(s,i)=> isH(i) ? null : NPCS.byId(s.cast[i]);
const aliveIdx=s=>ALL.filter(i=>s.alive[i]);
function nextAlive(s,i,dir){ for(let k=1;k<N;k++){ const j=((i+dir*k)%N+N)%N; if(s.alive[j]) return j; } return -1; }
const claimers=s=>ALL.filter(i=>s.mind[i].claim==='📰 기자');
const heat=(s,j)=>ALL.filter(k=>s.alive[k]&&s.mind[k].sus===j).length;   // 공개적으로 j를 의심하는 사람 수
function topSus(s,i,pool){ let b=null,bv=-1e9; for(const j of pool){ if(j===i||!s.alive[j]) continue; const v=s.bel[i][j]; if(v>bv){ bv=v; b=j; } } return [b,bv]; }
function fixKnown(s,i){ for(const [j,v] of Object.entries(s.known[i])){ if(+j===i) continue; if(v===ROLE.terror) s.bel[i][+j]=9; else if(v.startsWith('💣')===false && Object.values(ROLE).includes(v)) s.bel[i][+j]=-4; } }

/* ── 밤 ── */
function startNight(s){
  s.round++; s.phase='night'; s.focus=null; s.night={}; s.ready=HSEAT.map(()=>false); s.turn=null;
  s.notice=`🌙 ${s.round}번째 밤 — 각자 몰래 행동하세요`; s.log.push(`— ${s.round}번째 밤 —`);
  for(const i of aliveIdx(s)) if(!isH(i)) s.night[i]=npcNight(s,i);
  for(let p=0;p<HSEAT.length;p++) if(!s.alive[HSEAT[p]]) s.ready[p]=true;
}
function canDo(s,seat){
  const r=s.roles[seat], out=[];
  if(r==='terror'){ if(s.origin==null) out.push('infect'); else { if(!s.snipe[seat]) out.push('snipe'); if(!s.antidote[seat]) out.push('antidote'); } }
  if(r==='research') out.push('test');
  if(r==='reporter') out.push('report');
  if(r==='detective' && s.bullets>0) out.push('shoot');
  return out;
}
function resolveNight(s){
  const ann=[], n=s.night, dead=[];
  for(const [seat,a] of Object.entries(n)){ if(a&&a.k==='antidote'&&s.alive[a.t]){ s.antidote[seat]=true; s.immune[a.t]=true; delete s.infected[a.t]; } }
  for(const [,a] of Object.entries(n)) if(a&&a.k==='infect'&&s.origin==null&&s.alive[a.t]){ s.origin=a.t; if(!s.immune[a.t]) s.infected[a.t]=s.round; s.fronts=[a.t,a.t]; }
  for(const [seat,a] of Object.entries(n)){ if(!a) continue;
    if(a.k==='snipe'){ s.snipe[seat]=true; if(s.alive[a.t]&&!dead.includes(a.t)) dead.push(a.t); }
    if(a.k==='shoot'&&s.bullets>0){ s.bullets--; if(s.alive[a.t]&&!dead.includes(a.t)) dead.push(a.t); } }
  for(const [seat,a] of Object.entries(n)){ if(!a) continue; const i=+seat;
    if(a.k==='test'){ s.tested[a.t]=true; const gone=dead.includes(a.t); const ok=a.t===s.antibody&&!gone; s.known[i][a.t]= gone?'검사 못 함(쓰러짐)':ok?'항체 있음!':'항체 없음'; if(ok&&!dead.includes(i)){ s.research++; if(s.research===1) leakHint(s); } }
    if(a.k==='report'){ s.known[i][a.t]=ROLE[s.roles[a.t]]; fixKnown(s,i); }
    if(a.self && !s.selfTest[i]){ s.selfTest[i]=true; s.known[i][i]= s.infected[i]!=null ? '🦠 감염됨' : '✅ 감염 안 됨'; } }
  for(const d of dead){ s.alive[d]=false; s.cause[d]={r:s.round,k:'shot'}; memo(s,d); ann.push({t:`🔫 ${nm(d)} 밤사이 총에 맞아 쓰러졌어요 — 정체는 ${ROLE[s.roles[d]]}`, seat:d, k:'dead'}); s.log.push(`${nm(d)} 저격 사망 (${ROLE[s.roles[d]]})`); }
  if(s.origin!=null){
    for(const [k,r] of Object.entries(s.infected)){ const i=+k; if(!s.alive[i]) continue; if(s.round-r>=2){ if(i===s.antibody){ delete s.infected[i]; s.immune[i]=true; } else { s.alive[i]=false; s.cause[i]={r:s.round,k:'virus'}; memo(s,i); ann.push({t:`🦠 ${nm(i)} 바이러스로 쓰러졌어요 — 감염되고 두 밤이 지났어요 · 정체는 ${ROLE[s.roles[i]]}`, seat:i, k:'dead'}); s.log.push(`${nm(i)} 바이러스 사망 (${ROLE[s.roles[i]]})`); } } }
    if(s.round>1) for(const d of [0,1]){ const dir=d?1:-1, from=s.fronts[d]; if(from==null||s.immune[from]){ s.fronts[d]=null; continue; } const j=nextAlive(s,from,dir);
      if(j<0 || s.immune[j]){ s.fronts[d]=null; continue; } if(s.infected[j]==null) s.infected[j]=s.round; s.fronts[d]=j; }
  }
  const infCount=Object.keys(s.infected).filter(k=>s.alive[+k]).length;
  const newInf=Object.entries(s.infected).filter(([k,r])=>r===s.round&&s.alive[+k]).length;
  if(s.origin!=null) ann.push(`📢 지금 감염자는 ${infCount}명이에요${newInf?` — 어젯밤 새로 ${newInf}명 감염`:' — 새 감염은 없었어요'}`);
  if(s.research>(s.lastRes||0)) ann.push(s.research>=2 ? '🧪 치료제 완성!! 연구원이 항체를 두 번 찾아냈어요' : s.abHint&&!s.hintAnn ? (s.hintAnn=1,'🧪 치료제 연구 1단계 성공! …그런데 테러리스트 쪽에 항체 후보 정보가 새어 나갔대요 😨') : '🧪 치료제 연구 1단계 — 한 번만 더!');
  s.lastRes=s.research;
  if(!ann.length) ann.push('🌅 조용한 밤이었어요. 아무도 쓰러지지 않았어요');
  s.ann=ann; s.annIdx=0; s.phase='morning'; s.notice=`☀️ ${s.round}번째 아침 — 밤사이 일어난 일`; s.ev++;
}
function checkWin(s){
  const terrAlive=ALL.filter(i=>s.alive[i]&&s.roles[i]==='terror').length;
  const citAlive=ALL.filter(i=>s.alive[i]&&s.roles[i]!=='terror'&&i!==s.antibody).length;
  if(s.research>=2 || terrAlive===0) return 'citizen';
  if(citAlive===0) return 'terror';
  if(s.round>=MAXR && s.phase==='talk') return 'citizen';
  return null;
}
function end(s,w){
  s.phase='over'; s.side=w; s.turn=null;
  s.conf=[]; for(const i of U.shuffle(npcSeats().slice()).slice(0,3)){ if(s.roles[i]==='terror'){ const al=ALL.find(j=>j!==i&&s.roles[j]==='terror'); s.conf.push({seat:i,text:`사실 저 테러리스트였어요. 제 동료는 ${nm(al)} 😏`}); } else { const [t]=topSus(s,i,ALL.filter(j=>j!==i)); if(t!=null) s.conf.push({seat:i,text:`사실 제가 계속 의심한 건 ${nm(t)} — ${s.roles[t]==='terror'?'맞았네요!':'틀렸네요… 😅'}`}); } }
  const hw=HSEAT.map(i=>side(s.roles[i])===w); s.winners=HSEAT.map((h,p)=>hw[p]?p:-1).filter(x=>x>=0);
  s.winner = hw[0]&&hw[1] ? 'both' : hw[0] ? 0 : hw[1] ? 1 : 'none';
  s.notice = w==='terror' ? '💣 테러리스트 팀 승리… 마을이 무너졌어요' : (s.research>=2 ? '🧪 치료제 완성! 시민 팀 승리' : ALL.some(i=>s.alive[i]&&s.roles[i]==='terror') ? `🛡️ ${MAXR}라운드를 버텼어요! 시민 팀 승리` : '🎉 테러리스트를 모두 찾아냈어요! 시민 팀 승리');
}

function leakHint(s){   // 테러 쪽 정보원: 항체 보유자 후보 2명(하나는 가짜)
  const decoy=U.pick(ALL.filter(j=>s.alive[j]&&j!==s.antibody&&s.roles[j]!=='terror'));
  s.abHint=U.shuffle([s.antibody, decoy].filter(x=>x!=null));
  for(const t of ALL) if(s.roles[t]==='terror') for(const j of s.abHint) s.known[t][j]='항체 후보?';
}
/* ── 속생각: 들은 말 → 각 NPC가 성향대로 믿음 갱신 ── */
function why(s,L,j,k,x,d){ if(!(d>0)||L===j) return; const W=(s.why=s.why||{}), w=W[L]=W[L]||{}, c=w[j]; if(!c||d>=c.w*.7) w[j]={k,x,w:d,r:s.round}; }
function bump(s,L,j,d,k,x){ s.bel[L][j]+=d; why(s,L,j,k,x,d); }
const RT={
  hitme:['{t}이(가) 저를 찍었는데, 저는 제가 아닌 걸 알아요.','저를 찍은 {t}, 그게 제일 수상해요.'],
  reveal:['{x}이(가) 기자라면서 {t}을(를) 테러라고 했잖아요.','{x}의 취재 결과가 {t}였어요.'],
  crowd:['{x}도 {t}을(를) 의심했어요.','{x} 말 듣고 보니 {t}이(가) 걸려요.'],
  attack:['{t}이(가) 제가 믿는 {x}을(를) 찍는 게 이상해요.','{t}, 왜 {x}을(를) 몰아요?'],
  fakerep:['진짜 기자는 따로 있어요. {t}의 기자 주장은 거짓이에요.'],
  double:['기자 주장이 둘인데, {t} 쪽이 앞뒤가 안 맞아요.','기자가 둘일 순 없어요. {t} 쪽이 가짜 같아요.'],
  wrongacc:['{t}이(가) 몰았던 {x}, 시민이었잖아요.','{x}이(가) 시민으로 쓰러졌어요. 그때 찍은 게 {t}였죠.'],
  cleared:['{t}이(가) 감싸던 {x}이(가) 테러였어요.','{x}을(를) 믿는다던 {t}… {x}은(는) 테러였죠.'],
  fakeclaim:['{t}의 역할 주장은 거짓이에요. 진짜는 따로 있어요.','{t}, 그 역할 아닌 거 제가 알아요.'],
  dupclaim:['{t}랑 {x}이(가) 같은 역할이라고 하잖아요. 둘 중 하나는 거짓이에요.','같은 역할이 둘이에요. 저는 {t} 쪽이 거짓 같아요.'],
  twoface:['{t}은(는) 몰래 연합해 놓고 뒤통수 친 사람이에요.','몰래 연합했던 사람을 찍는 {t}, 못 믿겠어요.'],
  nervous:['{t}, 아까 질문에 엄청 당황했잖아요 😅','아까 {t} 대답할 때 말 더듬었어요.'],
  silent:['{t}, 지금까지 거의 말을 안 했어요.','{t}은(는) 계속 조용하네요. 숨는 거 같아요.'],
};
function reasonOf(s,i,j){ const w=s.why&&s.why[i]&&s.why[i][j]; let k=null, x=null;
  if(w&&w.w>=.3&&(w.x==null||w.x!==j)){ k=w.k; x=w.x; }
  else if(s.round>=2&&s.hist.filter(h=>!h.ann&&h.seat===j).length<=1) k='silent';
  if(!k) return null; return {k,x}; }
function rtText(k,j,x){ let t=U.pick(RT[k]); return t.split('{t}').join(nm(j)).split('{x}').join(x!=null?nm(x):'누군가'); }
function reasonText(s,i,j){ const r=reasonOf(s,i,j); return r?rtText(r.k,j,r.x):null; }
function accuseR(s,i,kind,j){ const r=reasonOf(s,i,j); if(!r) return null; const c=line(s,i,kind,j); if(!c) return null; const used=s.usedL[i]; let t=null; for(let k=0;k<4;k++){ const x=jo(rtText(r.k,j,r.x)+' '+c.text); if(!used.includes(x)){ t=x; break; } } if(!t) return null; used.push(t); c.text=t; c.rk=r.k; c.rx=r.x; return c; }
/* 반격: "저는 제가 아닌 걸 아니까" — 찍힌 사람만 아는 확실한 근거 */
function counterR(s,t,acc){ const c=line(s,t,'cclose',acc); if(!c) return null; c.kind='counter'; c.text=rtText('hitme',acc,null)+' '+c.text; c.rk='hitme'; return c; }
/* 공개된 사실만으로 사람이 댈 수 있는 근거 */
function publicReason(s,me,j){ const H=s.hist.filter(h=>!h.ann);
  const wa=H.find(h=>h.seat===j&&ACCUSE.includes(h.kind)&&h.t!=null&&!s.alive[h.t]&&s.roles[h.t]!=='terror'); if(wa) return {k:'wrongacc',x:wa.t};
  const cl=H.find(h=>h.seat===j&&(h.kind==='thanks'||h.kind==='clear')&&h.t!=null&&!s.alive[h.t]&&s.roles[h.t]==='terror'); if(cl) return {k:'cleared',x:cl.t};
  if(s.mind[j].role&&s.mind[j].role!=='citizen'&&ALL.some(k=>k!==j&&s.alive[k]&&s.mind[k].role===s.mind[j].role)) return {k:'dupclaim',x:ALL.find(k=>k!==j&&s.alive[k]&&s.mind[k].role===s.mind[j].role)};
  if(H.some(h=>h.seat===j&&h.kind==='ansNervous')) return {k:'nervous'};
  if(H.some(h=>h.seat===j&&ACCUSE.includes(h.kind)&&h.t===me&&h.r===s.round)) return {k:'hitme'};
  if(s.round>=2&&H.filter(h=>h.seat===j).length<=1) return {k:'silent'};
  return null; }
function listen(s,c){
  const sp=c.seat, t=c.t;
  for(const L of aliveIdx(s)){ if(L===sp||isH(L)) continue; const p=P(s,L), b=s.bel[L];
    if(s.roles[L]==='terror'){   // 테러: "누가 위협인가"로 기억
      if(c.kind==='claim'||c.kind==='claimN'||c.kind==='counterclaim'){ if(c.role==='research'||c.role==='reporter'||c.role==='detective') b[sp]+=2; }
      if(t!=null && ACCUSE.includes(c.kind) && (t===L || s.roles[t]==='terror')) b[sp]+= c.kind==='reveal' ? 4 : 1;
      continue; }
    const cred=clamp(1-b[sp]/3,.15,1.2)*(.4+p.trust*.8);
    if(c.kind==='claim'||c.kind==='claimN'||c.kind==='counterclaim'){ const ro=c.role;
      if(ro!=='citizen'&&s.roles[L]===ro) bump(s,L,sp,9,'fakeclaim');
      else { const dup=ALL.filter(k=>k!==sp&&s.alive[k]&&s.mind[k].role===ro&&ro!=='citizen');
        if(dup.length) dup.concat([sp]).forEach(k=>bump(s,L,k,.4+p.logic*.9,'dupclaim',k===sp?dup[0]:sp)); else b[sp]-=(ro==='citizen'?.12:.35)*cred; }
      fixKnown(s,L); continue; }
    if(c.kind==='clean'||c.kind==='cleanN'){ b[sp]-=.18*cred; continue; }
    if(t===L && ACCUSE.includes(c.kind)){   // 나를 찍었다 — 나는 내가 아닌 걸 앎
      bump(s,L,sp, c.kind==='reveal' ? 9 : (.4+p.logic*.6+p.temper*.5), 'hitme');
    } else if(t!=null){
      if(c.kind==='reveal') bump(s,L,t,1.6*cred,'reveal',sp);
      else if(['accuse','agree','recall','doubt','sweat'].includes(c.kind)) bump(s,L,t,(c.rk||c.kind!=='accuse'?.5:.22)*cred,'crowd',sp);
      else if(c.kind==='counter') b[t]+=.25*cred;
      else if(c.kind==='clear'||c.kind==='thanks') b[t]-=.8*cred;
      if(ACCUSE.includes(c.kind) && b[t]<-1.5) bump(s,L,sp,.4,'attack',t);   // 내가 믿는 사람을 찍으면 찍은 쪽이 수상
    }
    if(c.kind==='defend') b[sp]-=.15*p.trust;
    if(s.roles[L]==='reporter' && ['reveal','clear'].includes(c.kind)){ why(s,L,sp,'fakerep',null,9); b[sp]=9; }   // 진짜 기자: 기자 사칭 = 테러
    if(c.kind==='reveal' && claimers(s).length>=2 && !s.doubted[L]){ s.doubted[L]=1; for(const k of claimers(s)) if(k!==L) bump(s,L,k,p.logic*1.2,'double'); }
    fixKnown(s,L);
  }
}
function memo(s,d){   // 쓰러진 사람 정체 공개 → 그 사람을 찍었던/감쌌던 이들을 다시 봄
  const terr=s.roles[d]==='terror';
  for(const L of aliveIdx(s)){ if(isH(L)||s.roles[L]==='terror'||L===d) continue; const p=P(s,L), b=s.bel[L];
    for(const h of s.hist){ if(h.ann||h.seat===L) continue;
      if(h.t===d && ACCUSE.includes(h.kind)){ if(terr) b[h.seat]-=1.5*(h.kind==='reveal'?3:1); else bump(s,L,h.seat,(.3+p.logic*.8)*(h.kind==='reveal'?5:1),'wrongacc',d); }
      if(h.t===d && (h.kind==='clear'||h.kind==='thanks')){ if(terr) bump(s,L,h.seat,(1+p.logic)*(h.kind==='clear'?4:1),'cleared',d); else b[h.seat]-=.3; }
      if(terr && h.seat===d && h.t!=null){ if(ACCUSE.includes(h.kind)) b[h.t]-=.8*p.logic; if(h.kind==='thanks'||h.kind==='clear') b[h.t]+=1.2*p.logic; }
    }
    if(s.roles[d]==='reporter') for(const k of claimers(s)) if(k!==d) b[k]=9;   // 진짜 기자가 쓰러짐 → 다른 기자 주장은 가짜
    fixKnown(s,L);
  }
}

/* ── NPC 밤 행동 ── */
function npcNight(s,i){
  const r=s.roles[i], p=P(s,i), others=aliveIdx(s).filter(j=>j!==i), b=s.bel[i];
  const notTerr=others.filter(j=>s.roles[j]!=='terror');
  if(r==='terror'){
    const terrs=ALL.filter(j=>s.roles[j]==='terror');
    if(s.origin==null){   // 머리 좋을수록 우리 편에서 먼 자리에 퍼뜨림
      const sc=j=>Math.min(...terrs.map(t=>dist(j,t)))*p.logic+Math.random()*1.5;
      return {k:'infect', t:notTerr.slice().sort((x,y)=>sc(y)-sc(x))[0]};
    }
    const ally=terrs.find(j=>j!==i&&s.alive[j]);
    const near=j=> s.infected[j]!=null || (s.fronts&&s.fronts.some(fr=>fr!=null&&(nextAlive(s,fr,1)===j||nextAlive(s,fr,-1)===j)));
    if(!s.antidote[i] && near(i) && Math.random()<.6+p.logic*.35) return {k:'antidote', t:i};
    if(!s.antidote[i] && ally!=null && near(ally) && Math.random()<.3+p.logic*.4) return {k:'antidote', t:ally};
    if(!s.snipe[i] && s.research===1 && s.abHint){ const c=s.abHint.filter(j=>s.alive[j]); const other=ALL.find(j=>j!==i&&s.roles[j]==='terror'&&s.alive[j]&&s.night[j]&&s.night[j].k==='snipe'); const left=c.filter(j=>!other||s.night[other].t!==j); if(left.length) return {k:'snipe', t:U.pick(left)}; }
    if(!s.snipe[i]){
      const sec=(s.secret&&s.secret.terr)||{}; const realRep=notTerr.filter(j=>s.mind[j].claim==='📰 기자'||sec[j]==='reporter'), resC=notTerr.filter(j=>s.mind[j].claim==='🧪 연구원'||sec[j]==='research');
      const [threat,tv]=topSus(s,i,notTerr);
      if(realRep.length) return {k:'snipe', t:realRep[0]};
      if(resC.length && Math.random()<.7) return {k:'snipe', t:resC[0]};
      if(threat!=null && tv>1.5 && Math.random()<.4+p.aggr*.5) return {k:'snipe', t:threat};
      if(s.round>=3 && Math.random()<.2+p.aggr*.3) return {k:'snipe', t: threat!=null?threat:U.pick(notTerr)};
    }
    return null;
  }
  if(r==='research'){
    if(s.alive[s.antibody]&&s.known[i][s.antibody]==='항체 있음!') return {k:'test',t:s.antibody};
    const c=others.filter(j=>!s.known[i][j]); if(!c.length) return null;
    // 항체 보유자는 시민 → 덜 의심되는 사람부터 (논리 낮으면 대충)
    return {k:'test', t:c.sort((x,y)=>(b[x]+(Math.random()-.5)*(2-p.logic*1.6))-(b[y]+(Math.random()-.5)*(2-p.logic*1.6)))[0]};
  }
  if(r==='reporter'){
    const c=others.filter(j=>!s.known[i][j]); if(!c.length) return null;
    return {k:'report', t: Math.random()<p.logic ? c.sort((x,y)=>b[y]-b[x])[0] : U.pick(c)};
  }
  if(r==='detective' && s.bullets>0 && s.round>=2){
    const [t,v]=topSus(s,i,others), thr=3.4-p.aggr*1.6;
    if(t!=null && v>thr) return {k:'shoot', t};
  }
  return (!s.selfTest[i] && s.origin!=null && Math.random()<.2+(1-p.logic)*.15) ? {k:'none',self:true} : null;
}

/* ── NPC 토론 ── */
const XL={
  accuse:['{t}, 아까부터 말이 없네요. 수상해요','저는 {t} 쪽이 마음에 걸려요','{t}, 솔직히 좀 이상해요','{t} 표정 보셨어요? 뭔가 있어요'],
  agree:['{t} 얘기 나왔으니 말인데, 저도요','맞아요, {t}이(가) 이상하긴 해요','{t}… 저도 그 생각 했어요'],
  defend:['아니에요, 저 진짜 아니에요','저 찍으면 테러만 좋아해요','왜 저예요? 저 아무것도 안 했어요','억울해요, 기록 보세요'],
  counter:['{t}, 남 찍기 전에 본인부터 설명해요','{t}이(가) 저를 찍는 게 더 이상해요','{t}, 지금 시선 돌리는 거죠?'],
  quiet:['감염 방향부터 생각해 봐요','오늘은 일단 듣기만 할게요','말 많은 사람부터 보죠'],
  worry:['감염자가 계속 늘어요… 빨리 찾아야 해요','이러다 다 쓰러지겠어요','옆자리부터 번지는 거 무섭네요'],
  thanks:['{t}은(는) 믿어도 될 것 같아요','{t} 쪽은 괜찮아 보여요 🤝','{t} 말이 제일 앞뒤가 맞아요'],
  recall:['{t}, 그때 찍은 사람 시민이었잖아요','{t}이(가) 몰았던 사람, 정체 보셨죠?'],
  doubt:['기자가 둘이에요. {t} 쪽이 거짓 같아요','{t}, 진짜 기자면 취재 결과 더 말해 봐요'],
  reveal:['저 기자예요. {t} 테러리스트예요!','취재했어요. {t}, 테러예요'],
  probe:['{t}, 어젯밤에 뭐 했어요?','{t}은(는) 역할이 뭐예요?','{t}, 아까부터 조용하던데 할 말 없어요?','{t}, 누구 의심해요?','{t} 생각부터 들어 볼까요?','{t}, 솔직하게 말해 봐요. 시민이에요?'],
  ansCalm:['저요? 그냥 잤어요. 시민이에요 🙂','저는 아직 아무것도 몰라요. 같이 찾아요','저 의심해도 소용없어요, 진짜 시민이에요','별일 없었어요. 저 그냥 시민이에요','저는 검사소 들를까 고민만 했어요'],
  ansNervous:['어… 저요? 그, 그냥 잤는데요 😅','왜, 왜 저한테 물어요? 😅','아… 저는 뭐… 시민이에요, 네 😅','저는… 아무 생각 없었어요 😅'],
  ansHint:['역할은 아직 비밀이에요 😉 때가 되면 말할게요','지금 밝히면 저격당해요. 조금만 기다려요 😉','할 일은 했어요. 내일 알려 드릴게요 😉'],
  sweat:['{t}, 왜 그렇게 당황해요? 🤨','{t}, 땀 나는데요? 수상해요','방금 {t} 말 더듬은 거 다들 들었죠?'],
  claimN:['밝힐게요. 저 {r}이에요.','저 사실 {r}이에요. 저 찍으면 손해예요.','이제 말할게요, 저 {r}예요!'],
  cleanN:['저 검사소에서 확인했어요. 감염 안 됐어요.','검사해 봤는데 저 깨끗해요. 감염 아니에요.'],
  counterclaim:['잠깐요, 진짜 {r}은(는) 저예요. {t}, 왜 거짓말해요?','{t}이(가) {r}이라고요? 아니에요. {r}은(는) 저예요!'],
  claimQ:['정말요? {t}, 증명할 수 있어요?','{t}이(가) {r}… 너무 갑자기인데요? 🤨','지금 그 말, 다들 믿어요?'],
  claimOK:['오, {t}이(가) {r}이었구나. 믿을게요 🤝','{t} 말 믿어요. 이제 좀 보이네요.'],
  cleanQ:['검사 결과는 본인만 알잖아요 🤨','{t}, 그건 누구나 할 수 있는 말이에요.'],
  reb_silent:['말이 없었던 건 정보가 없어서예요. 그걸로 찍는 건 아니죠.','조용하면 테러예요? 그건 근거가 아니에요.'],
  reb_nervous:['갑자기 물어보면 누구나 당황하죠!','당황한 거랑 테러인 건 다르잖아요 😓'],
  reb_crowd:['남들이 찍는다고 따라 찍는 거예요?','{r} 말만 듣고 저를 찍는 거예요?'],
  reb_wrongacc:['그땐 저도 속았어요. 그게 테러라는 증거는 아니에요.','{r}을(를) 찍은 건 실수였어요. 인정해요. 근데 테러는 아니에요.'],
  reb_cleared:['{r}을(를) 믿은 건 제 실수예요. 같은 편은 아니었어요.','{r}한테 속은 거예요, 저도 피해자예요.'],
  reb_reveal:['그 기자 주장이 거짓이에요! 진짜 기자 맞아요?','{r}이(가) 진짜 기자인지부터 따져 봐요.'],
  reb_attack:['의심 가는 사람을 찍었을 뿐이에요.','{r}을(를) 찍은 데는 이유가 있었어요.'],
  reb_hitme:['먼저 의심했다고 수상하다니요.','제가 {t}을(를) 찍은 건 이유가 있어서예요.'],
  reb_dupclaim:['제가 진짜예요! 저쪽이 가짜예요.','같은 역할이 둘이면 저 말고 저쪽을 보세요.'],
  reb_fakeclaim:['제가 진짜라니까요!','거짓말 아니에요. 제 역할 맞아요.'],
  reb_none:['{t}, 근거가 뭐예요?','이유도 없이 저를요? 말해 봐요, {t}.','왜 저예요? 이유부터 들어 봐요.'],
  cclose:['{t}, 설명해 봐요.','다들 {t} 쪽도 봐 주세요.','저는 {t} 쪽에 걸게요.','{t}, 그쪽이야말로 수상해요.'],
  leak:['{t}이(가) 저한테 몰래 자기가 {r}이라고 했어요 🤭','다들 알아요? {t}, 몰래 자기가 {r}이라던데요?'],
  outed:['{t}, 몰래 연합하자더니! 다들 들어요, {t}이(가) 저랑 몰래 연합했었어요.','{t}… 둘만 연합하자고 해 놓고 저를 찍어요? 이런 사람이에요!'],
  guard:['{t}은(는) 아니에요. 제가 보증해요 🤝','{t} 찍기 전에 근거부터 봐요. 저는 {t} 믿어요.'],
  reb_twoface:['연합보다 진실이 먼저였어요.','몰래 연합한 건 맞지만, 의심은 진짜였어요.'],
  told:['거봐요! {t} 테러 맞았죠 😎','제가 {t} 찍었잖아요. 맞았네요','{t}… 역시 그랬어요'],
  sorry:['{t}… 제가 잘못 찍었네요. 미안해요 😢','{t}은(는) 시민이었구나… 제 실수예요'],
  grief:['{t}… 믿었는데 😢','{t}이(가) 쓰러지다니… 아까까지 같이 얘기했는데'],
};
const OPTK=['guard','reb_twoface','reb_silent','reb_nervous','reb_crowd','reb_wrongacc','reb_cleared','reb_reveal','reb_attack','reb_hitme','reb_dupclaim','reb_fakeclaim','reb_none','cclose','claimQ','claimOK','cleanQ','cleanN','quiet','worry','thanks','agree','defend','probe','ansCalm','ansHint','told','sorry','grief','sweat'];
function line(s,seat,kind,t,r){
  const per=P(s,seat), vars={t:t!=null?nm(t):'', r:r||''}, fillT=x=>{ for(const k in vars) x=x.split('{'+k+'}').join(vars[k]); return x; };
  const used=((s.usedL=s.usedL||{})[seat]=s.usedL[seat]||[]), early=s.hist.filter(h=>!h.ann&&h.r===s.round).length<3, ok=x=>!(early&&/아까부터/.test(x))&&x.replace(/[…\s.🤔]/g,'').length>=3;
  const mine=((per&&per.lines&&per.lines[kind])||[]).filter(ok).map(fillT).filter(x=>!used.includes(x));
  const rest=[...((NPCS.GENERIC&&NPCS.GENERIC[kind])||[]), ...(XL[kind]||[])].filter(ok).map(fillT).filter(x=>!used.includes(x)&&!mine.includes(x));
  let text = mine.length&&(Math.random()<.7||!rest.length) ? U.pick(mine) : rest.length ? U.pick(rest) : null;
  if(text==null){ if(OPTK.includes(kind)) return null;
    const base=[...((per&&per.lines&&per.lines[kind])||[]), ...(XL[kind]||[])].filter(ok).map(fillT); if(!base.length) return null;
    const pre=['다시 말하지만 ','이번에도요. ','몇 번이고 말할게요. ',s.round+'번째 아침인데요, '].map(p=>p+U.pick(base)).filter(x=>!used.includes(x)); if(!pre.length) return null; text=U.pick(pre); }
  text=jo(text); used.push(text); return {seat, kind, t, text};
}
const jo=t=>String(t).replace(/([가-힣])이(에요|었)/g,(m,c,e)=>((c.charCodeAt(0)-0xAC00)%28?m:c+(e==='에요'?'예요':'였')));
const pk=(a,b)=>a<b?a+'-'+b:b+'-'+a;
function hasPact(s,a,b){ const p=s.pact&&s.pact[pk(a,b)]; return !!(p&&!p.broken); }
function dmPush(s,to,from,text,o){ if(!isH(to)) return; s.dm=s.dm||{}; (s.dm[to]=s.dm[to]||[]).push(Object.assign({id:++s.dmN, r:s.round, from, text, state:'info'},o||{})); }
/* 🤫 토론이 시작되면 NPC가 가끔 나에게 몰래: 연합 제안 · 정보 공유(진짜/가짜) · 같이 찍자 · (테러끼리) 작전 */
function npcWhisper(s){ for(const h of HSEAT){ if(!s.alive[h]||Math.random()>.6) continue; const hT=s.roles[h]==='terror';
  for(const i of U.shuffle(aliveIdx(s).filter(i=>!isH(i)&&!hasPact(s,i,h)))){ const p=P(s,i), r=s.roles[i], b=s.bel[i];
    if(hT&&r==='terror'){ const tg=aliveIdx(s).filter(j=>s.roles[j]!=='terror').sort((x,y)=>heat(s,y)-heat(s,x)+(Math.random()-.5))[0]; if(tg!=null){ dmPush(s,h,i,`(동료) 오늘은 ${nm(tg)} 쪽으로 몰아요 😏 저도 거들게요.`); break; } continue; }
    if(r==='reporter'&&b[h]<0&&Math.random()<.35+p.trust*.4){ const fd=Object.entries(s.known[i]).find(([j,v])=>+j!==i&&+j!==h&&s.alive[+j]&&Object.values(ROLE).includes(v)); if(fd){ dmPush(s,h,i,`몰래 말할게요. 저 기자인데, 취재해 보니 ${nm(+fd[0])}은(는) ${fd[1]}이에요. 둘만 알아요 🤫`); break; } }
    if(r==='terror'&&!hT&&s.round>=2&&Math.random()<p.bluff*.5){ const tg=aliveIdx(s).filter(j=>s.roles[j]!=='terror'&&j!==h).sort((x,y)=>b[y]-b[x])[0]; if(tg!=null){ dmPush(s,h,i,`몰래 말할게요. 저 기자예요. ${nm(tg)}이(가) 테러예요. 같이 찍어 줘요 🤫`,{state:'open',kind:'collude',x:tg}); break; } }
    if((b[h]<-.4||(r==='terror'&&!hT))&&Math.random()<.3+p.trust*.3){ dmPush(s,h,i,U.pick(['우리 몰래 연합해요. 서로 안 찍기 🤝','둘이 손잡아요. 토론에서 서로 편들어 주기, 어때요?','남들 모르게 같은 편 해요. 서로는 안 찍는 걸로 🤫']),{state:'open',kind:'pact'}); break; }
    if(r!=='terror'){ const [x,xv]=topSus(s,i,aliveIdx(s).filter(j=>j!==h&&j!==i)); if(x!=null&&xv>1.4&&b[h]<.3&&Math.random()<.4){ dmPush(s,h,i,`${nm(x)} 수상하지 않아요? ${reasonText(s,i,x)||''} 같이 찍어요 🤫`,{state:'open',kind:'collude',x}); break; } }
  } } }
/* 몰래 연합한 사이에서 배신 · 폭로 */
function betrayCheck(s,i,q){ for(const h of HSEAT){ if(!s.alive[h]||!hasPact(s,i,h)) continue; const pc=s.pact[pk(i,h)], p=P(s,i), r=s.roles[i];
    const go= r==='terror' ? ((s.round-pc.r>=2||heat(s,h)>=2)&&Math.random()<.45) : s.cast[i]==='jihu' ? s.bel[i][h]>.7 : s.bel[i][h]>1.6;
    if(!go) continue; pc.broken={by:i,r:s.round};
    let c=accuseR(s,i,'accuse',h); if(!c){ const by=ALL.find(k=>k!==i&&s.alive[k]&&s.mind[k].sus===h); why(s,i,h,by!=null?'crowd':'silent',by,1); c=accuseR(s,i,'accuse',h); }
    if(!c) c=line(s,i,'accuse',h); if(c){ c.text='솔직히 말할게요. '+c.text; c.betray=h; q.push(c); }
    dmPush(s,h,i,'미안해요. 연합은 여기까지예요.',{state:'bad'}); return true; }
  return false; }
function ins(s,at,c){ if(c) s.chatQ.splice(at,0,c); }
/* ❓ 묻고 답하기: 조용히 넘어가는 대신 누군가에게 질문 → 대답에 텔(😅)이 묻어남 */
function answer(s,t,asker){ const p=P(s,t), r=s.roles[t]; let c;
  if(r==='terror') c=line(s,t, Math.random()<.2+(1-p.bluff)*.6?'ansNervous':'ansCalm');
  else if((r==='reporter'||r==='research'||r==='detective')&&Math.random()<.5) c=line(s,t,'ansHint');
  else c=line(s,t, Math.random()<.08+(1-p.temper)*.08?'ansNervous':'ansCalm');
  if(c) c.asker=asker; return c; }
function probeAt(s,i,q,t){ s.probed=s.probed||{}; if(s.probed[s.round+':'+t]||q.some(x=>x&&(x.seat===t||x.t===t))) return false; const pq=line(s,i,'probe',t); if(!pq) return false;
  pq.text='왠지 신경 쓰여서요. '+pq.text; s.probed[s.round+':'+t]=1; q.push(pq); if(!isH(t)) q.push(answer(s,t,i)); return true; }
function probeOr(s,i,q,kind){ const p=P(s,i);
  if(Math.random()<.4+p.talk*.25+(s.round===1?.25:0)){ s.probed=s.probed||{};
    const c=aliveIdx(s).filter(j=>j!==i&&!q.some(x=>x&&(x.seat===j||x.t===j))&&!s.probed[s.round+':'+j]&&!(s.roles[i]==='terror'&&s.roles[j]==='terror'));
    if(c.length){ const b=s.bel[i]; const t=Math.random()<p.logic?c.sort((x,y)=>b[y]-b[x])[0]:U.pick(c); const pq=line(s,i,'probe',t);
      if(pq){ s.probed[s.round+':'+t]=1; q.push(pq); if(!isH(t)) q.push(answer(s,t,i)); return; } } }
  q.push(line(s,i,kind)); }
/* 아침에 쓰러진 사람에 대한 반응: 찍었던 사람은 "거봐요"/"미안해요", 믿던 사람은 "믿었는데" */
function leakLines(s){ const q=[]; for(const L of (s.leak||[])){ if(L.done||!s.alive[L.i]||!s.alive[L.h]) continue; L.done=1; const c=line(s,L.i,'leak',L.h,ROLE[L.ro]); if(c){ c.role2=L.ro; q.push(c); dmPush(s,L.h,L.i,'😱 내가 몰래 한 말을 모두 앞에서 폭로했어요!',{state:'bad'}); const k=pk(L.i,L.h); if(s.pact[k]) s.pact[k].broken={by:L.i,r:s.round}; } } return q; }
function reactDeaths(s){ const q=[]; const dead=ALL.filter(d=>s.cause[d]&&s.cause[d].r===s.round);
  for(const d of dead){ if(q.length>=2) break; const terr=s.roles[d]==='terror';
    const acc=[...new Set(s.hist.filter(h=>!h.ann&&ACCUSE.includes(h.kind)&&h.t===d&&s.alive[h.seat]&&!isH(h.seat)).map(h=>h.seat))].filter(i=>!(terr&&s.roles[i]==='terror'));
    const acc2=acc.filter(i=>!q.some(c=>c&&c.seat===i)); if(acc2.length){ q.push(line(s,U.pick(acc2),terr?'told':'sorry',d)); continue; }
    if(!terr){ const fr=aliveIdx(s).filter(j=>!isH(j)&&s.mind[j].trust===d); if(fr.length) q.push(line(s,fr[0],'grief',d)); } }
  return q.filter(Boolean); }
function planTalk(s){
  const q=[], npcs=U.shuffle(aliveIdx(s).filter(i=>!isH(i)));
  const deadNow=ALL.filter(j=>!s.alive[j]);
  for(const i of npcs){
    const r=s.roles[i], p=P(s,i), b=s.bel[i];
    if(betrayCheck(s,i,q)) continue;
    const [top,tv]=topSus(s,i,ALL.filter(j=>(r!=='terror'||s.roles[j]!=='terror')&&!hasPact(s,i,j)));
    const strong = tv>1.2;
    if(Math.random() > p.talk + (strong?.25:0)) continue;   // 말수
    if(r==='reporter'){
      const found=Object.entries(s.known[i]).find(([j,v])=>v===ROLE.terror&&s.alive[+j]);
      const infectedMe = s.known[i][i]==='🦠 감염됨';
      const pReveal = infectedMe ? 1 : clamp(.35 + (1-p.bluff)*.4 + (s.round>=3?.2:0), 0, .95);
      if(found && Math.random()<pReveal){ q.push(line(s,i,'reveal',+found[0])); continue; }
      const clear=Object.entries(s.known[i]).find(([j,v])=>+j!==i&&v!==ROLE.terror&&s.alive[+j]&&heat(s,+j)>=1);
      if(clear && s.mind[i].claim && Math.random()<.6){ q.push(line(s,i,'clear',+clear[0],s.known[i][clear[0]])); continue; }
    }
    if(r==='terror'){
      const ally=ALL.find(j=>j!==i&&s.roles[j]==='terror'&&s.alive[j]);
      const exposer=ALL.find(j=>s.alive[j]&&s.mind[j].claim==='📰 기자'&&s.roles[j]!=='terror'&&s.hist.some(h=>h.seat===j&&h.kind==='reveal'&&(h.t===i||h.t===ally)));
      if(exposer!=null && !s.mind[i].claim && Math.random()<p.bluff*.8){ q.push(line(s,i,'reveal',exposer)); continue; }   // 맞불: 내가 진짜 기자라고 우김
      if(s.round>=2 && !s.mind[i].claim && Math.random()<p.bluff*.22){ const cits=aliveIdx(s).filter(j=>s.roles[j]!=='terror'&&j!==i); const tt=cits.sort((x,y)=>(b[y]+heat(s,y))-(b[x]+heat(s,x)))[0]; if(tt!=null){ q.push(line(s,i,'reveal',tt)); continue; } }
      if(ally!=null && heat(s,ally)>=3 && p.logic>=.85 && Math.random()<.5){ q.push(line(s,i,'agree',ally)); continue; }   // 동료 버리기: 이미 몰린 동료를 같이 찍어 신뢰 얻기
      // 묻어가기(전략가) vs 위협 제거(직진형)
      const cits=aliveIdx(s).filter(j=>s.roles[j]!=='terror'&&j!==i);
      const pick = Math.random()<p.aggr ? cits.sort((x,y)=>b[y]-b[x])[0] : cits.sort((x,y)=>heat(s,y)-heat(s,x)+(Math.random()-.5))[0];
      if(pick!=null && Math.random()<.4+p.aggr*.5){ const by=ALL.find(k=>k!==i&&s.alive[k]&&s.mind[k].sus===pick); if(by!=null) why(s,i,pick,'crowd',by,1); const c=accuseR(s,i, heat(s,pick)>0?'agree':'accuse', pick); if(c){ q.push(c); continue; } if(probeAt(s,i,q,pick)) continue; }
      probeOr(s,i,q,'quiet'); continue;
    }
    if(s.round>=2&&s.known[i][i]==='✅ 감염 안 됨'&&!s.mind[i].clean&&Math.random()<.3+p.talk*.3){ const cc=line(s,i,'cleanN'); if(cc){ q.push(cc); continue; } }
    if(r==='research' && s.research===1 && !s.mind[i].claim && Math.random()<(1-p.logic)*.7){ q.push(line(s,i,'research')); continue; }
    // 기자 주장이 겹치면 논리파가 따짐
    const cl=claimers(s).filter(j=>j!==i&&s.alive[j]);
    if(cl.length>=2 && p.logic>=.7 && Math.random()<.7){ const fake=cl.sort((x,y)=>b[y]-b[x])[0]; q.push(line(s,i,'doubt',fake)); continue; }
    // 기억: 시민을 몰았던 사람 / 테러를 맞힌 사람
    const wrong=s.hist.filter(h=>!h.ann&&ACCUSE.includes(h.kind)&&deadNow.includes(h.t)&&s.roles[h.t]!=='terror'&&s.alive[h.seat]&&h.seat!==i).map(h=>h.seat);
    if(wrong.length && Math.random()<p.logic*.6){ const tt=wrong.sort((x,y)=>b[y]-b[x])[0]; q.push(line(s,i,'recall',tt)); continue; }
    const right=s.hist.filter(h=>!h.ann&&ACCUSE.includes(h.kind)&&deadNow.includes(h.t)&&s.roles[h.t]==='terror'&&s.alive[h.seat]&&h.seat!==i).map(h=>h.seat);
    if(right.length && Math.random()<p.trust*.5){ q.push(line(s,i,'thanks',U.pick(right))); continue; }
    if(top!=null && tv > 1.3-p.aggr){ const c=accuseR(s,i, heat(s,top)>0&&Math.random()<.5?'agree':'accuse', top); if(c){ q.push(c); continue; } if(probeAt(s,i,q,top)) continue; }
    const [fr,fv]=(()=>{ let bj=null,bv=1e9; for(const j of aliveIdx(s)) if(j!==i&&b[j]<bv){ bv=b[j]; bj=j; } return [bj,bv]; })();
    if(fr!=null && fv<-1.2 && Math.random()<p.trust){ q.push(line(s,i,'thanks',fr)); continue; }
    if(Object.keys(s.infected).length>=2 && Math.random()<.5) q.push(line(s,i,'worry')); else probeOr(s,i,q,'quiet');
  }
  return q.filter(Boolean).slice(0,6);
}
function hear(s,c){   // 한 줄이 나온 순간: 공개 마음 갱신 → 기록 → 듣는 사람 속생각 → 반응 붙이기
  const m=s.mind[c.seat]; m.mood=MOOD[c.kind]||m.mood;
  if(ACCUSE.includes(c.kind) && c.t!=null){ m.sus=c.t; if(m.trust===c.t) m.trust=null; }
  if((c.kind==='clear'||c.kind==='thanks') && c.t!=null){ m.trust=c.t; if(m.sus===c.t) m.sus=null; }
  if(c.kind==='reveal'||c.kind==='clear'){ m.claim='📰 기자'; m.role='reporter'; }
  if(c.role){ m.claim=ROLE[c.role]; m.role=c.role; }
  if(c.kind==='clean'||c.kind==='cleanN') m.clean=s.round;
  if(c.kind==='research') m.claim='🧪 연구원';
  s.hist.push({r:s.round, seat:c.seat, kind:c.kind, t:c.t, text:c.text, role:c.role});
  s.log.push(`${nm(c.seat)}: ${c.text}`); s.lastSay={seat:c.seat,text:c.text,n:(s.lastSay?s.lastSay.n:0)+1};
  listen(s,c);
  if(c.kind==='ansNervous'){ m.tell=s.round; for(const L of aliveIdx(s)){ if(L===c.seat||isH(L)||(s.roles[L]==='terror'&&s.roles[c.seat]==='terror')) continue; bump(s,L,c.seat,.25+P(s,L).logic*.45,'nervous'); fixKnown(s,L); }
    const a=c.asker; if(a!=null&&s.alive[a]&&!isH(a)&&!(s.roles[a]==='terror'&&s.roles[c.seat]==='terror')&&Math.random()<.35+P(s,a).logic*.5){ s.talkN++; ins(s,s.typing!=null?1:0,line(s,a,'sweat',c.seat)); } }
  if(c.kind==='ansCalm'){ for(const L of aliveIdx(s)){ if(L===c.seat||isH(L)||s.roles[L]==='terror') continue; s.bel[L][c.seat]-=.1*P(s,L).trust; } }
  if(c.kind==='leak'&&c.t!=null){ const tm=s.mind[c.t]; tm.claim=ROLE[c.role2]; tm.role=c.role2; }
  if(c.kind==='outed'&&c.t!=null){ for(const L of aliveIdx(s)){ if(isH(L)||L===c.t||L===c.seat||s.roles[L]==='terror') continue; bump(s,L,c.t,.5+P(s,L).logic*.5,'twoface'); } }
  if(c.betray!=null) dmPush(s,c.betray,c.seat,'💔 몰래 연합했던 사이인데, 모두 앞에서 나를 찍었어요!',{state:'bad'});
  if(s.talkN>=9) return;
  const at = s.typing!=null ? 1 : 0, queued=j=>s.chatQ.some(q=>q&&q.seat===j);
  if(ACCUSE.includes(c.kind)&&c.t!=null&&isH(c.t)){ const g=aliveIdx(s).find(j=>!isH(j)&&j!==c.seat&&hasPact(s,j,c.t)&&!queued(j)); if(g!=null&&Math.random()<.7){ s.talkN++; ins(s,at,line(s,g,'guard',c.t)); } }
  if(c.kind==='claim'||c.kind==='claimN'){ const ro=c.role, lab=ROLE[ro];
    const real=ro!=='citizen'?aliveIdx(s).find(j=>!isH(j)&&j!==c.seat&&s.roles[j]===ro&&!queued(j)):null;
    if(real!=null&&Math.random()<.55+P(s,real).logic*.35){ s.talkN++; const cc=line(s,real,'counterclaim',c.seat,lab); if(cc){ cc.role=ro; ins(s,at,cc); } return; }
    const ls=aliveIdx(s).filter(j=>!isH(j)&&j!==c.seat&&!queued(j)); if(ls.length){ const j=U.pick(ls), p=P(s,j), doubt=s.bel[j][c.seat]>.4||Math.random()<p.logic*.5;
      s.talkN++; ins(s,at,line(s,j,doubt?'claimQ':'claimOK',c.seat,lab)); }
    return; }
  if((c.kind==='clean'||c.kind==='cleanN')&&Math.random()<.45){ const ls=aliveIdx(s).filter(j=>!isH(j)&&j!==c.seat&&!queued(j)&&P(s,j).logic>.6); if(ls.length){ s.talkN++; ins(s,at,line(s,U.pick(ls),'cleanQ',c.seat)); } return; }
  const t=c.t;
  if(ACCUSE.includes(c.kind) && c.kind!=='counter' && t!=null && s.alive[t] && !isH(t) && !queued(t)){
    const p=P(s,t);
    if(c.kind==='reveal' && s.roles[t]==='terror' && !s.mind[t].claim && Math.random()<p.bluff*.75){ s.talkN++; ins(s,at,line(s,t,'reveal',c.seat)); }   // 맞기자
    else if(Math.random()<.35+p.talk*.5){ s.talkN++; const r=s.roles[t], hot=heat(s,t)>=2, mt=s.mind[t];
      let rr=null;
      if(hot&&!mt.role&&['research','detective','reporter'].includes(r)&&Math.random()<.45+(1-p.bluff)*.35) rr=r;
      else if(hot&&!mt.role&&r==='terror'&&Math.random()<p.bluff*.6) rr=U.pick(['citizen','detective']);
      if(rr){ const cc=line(s,t,'claimN',null,ROLE[rr]); if(cc){ cc.role=rr; ins(s,at,cc); } }
      else if(s.known[t][t]==='✅ 감염 안 됨'&&!mt.clean&&Math.random()<.5) ins(s,at,line(s,t,'cleanN'));
      else { const rb=line(s,t,'reb_'+(c.rk||'none'),c.seat,c.rx!=null?nm(c.rx):'');
        if(Math.random()<p.temper*.8){ const ct=counterR(s,t,c.seat); if(ct&&rb) ct.text=rb.text+' '+ct.text; ins(s,at,ct||rb||line(s,t,'defend')); }
        else ins(s,at, rb||line(s,t,'defend')); } }
  }
  if(['accuse','reveal'].includes(c.kind) && t!=null && Math.random()<.5){   // 같은 생각인 사람이 맞장구
    const ag=aliveIdx(s).filter(j=>!isH(j)&&j!==c.seat&&j!==t&&!queued(j)&&s.bel[j][t]>.9&&(s.roles[j]!=='terror'||s.roles[t]!=='terror'));
    if(ag.length){ const c2=accuseR(s,ag.sort((x,y)=>s.bel[y][t]-s.bel[x][t])[0],'agree',t); if(c2){ s.talkN++; ins(s,s.chatQ.length,c2); } }
  }
}

/* ── 시간 흐름 ── */
const typeTime=c=>Math.max(900,Math.min(2600,c.text.length*55));
function stepDelay(s){ syncH(s);
  if(s.winner!=null) return null;
  if(s.phase==='night' && s.ready.every(Boolean)) return T.night;
  if(s.phase==='morning') return T.ann;
  if(s.phase==='talk'){ if(s.typing!=null) return typeTime(s.chatQ[0]); if(s.chatQ.length){ const L=s.lastSay&&s.lastSay.text?s.lastSay.text.length:8; return Math.min(3200,1000+L*40)+Math.random()*500; } if(s.ready.every(Boolean)) return 1500; return null; }
  return null;
}
function step(s){ syncH(s);
  if(s.phase==='night' && s.ready.every(Boolean)){ resolveNight(s); return; }
  if(s.phase==='morning'){
    if(s.annIdx<s.ann.length){ const a=s.ann[s.annIdx++]; s.notice=typeof a==='string'?a:a.t; s.focus=typeof a==='object'&&a.seat!=null?{seat:a.seat,k:a.k}:null; s.log.push(s.notice); s.hist.push({r:s.round, ann:true, text:s.notice}); s.ev++; return; }
    const w=checkWin(s); if(w){ end(s,w); return; }
    s.phase='talk'; s.focus=null; s.talkN=0; s.said=HSEAT.map(()=>0); s.chatQ=[...leakLines(s),...reactDeaths(s),...planTalk(s)].slice(0,8); npcWhisper(s); s.typing=null; s.ready=HSEAT.map(()=>false); for(let p=0;p<HSEAT.length;p++) if(!s.alive[HSEAT[p]]) s.ready[p]=true;
    s.notice=`💬 ${s.round}번째 아침 토론 — 다 듣고 나면 "밤으로"를 누르세요`; return;
  }
  if(s.phase==='talk'){
    if(s.typing!=null){ const c=s.chatQ.shift(); s.typing=null; hear(s,c); s.ev++; return; }
    if(s.chatQ.length){ s.typing=s.chatQ[0].seat; return; }
    if(s.ready.every(Boolean)){ const w=checkWin(s); if(w) end(s,w); else startNight(s); return; }
  }
}
function apply(s,p,a){ syncH(s);
  if(s.winner!=null) return '게임이 끝났어요';
  if(!a) return '알 수 없는 동작';
  const seat=HSEAT[p];
  if(a.k==='ready'){
    if(s.phase==='roles'){ s.ready[p]=true; if(s.ready.every(Boolean)) startNight(s); return null; }
    if(s.phase==='talk'){ if(s.chatQ.length||s.typing!=null) return '아직 이야기 중이에요'; s.ready[p]=true; if(s.ready.every(Boolean)){ const w=checkWin(s); if(w) end(s,w); else startNight(s); } return null; }
    return null;
  }
  if(a.k==='talk'){
    if(s.phase!=='talk') return '토론 시간이 아니에요';
    if(!s.alive[seat]) return '쓰러진 사람은 말할 수 없어요';
    if(s.said[p]>=4) return '이번 토론에선 충분히 말했어요';
    if(a.kind==='claim'||a.kind==='clean'){ if(a.kind==='claim'&&!['citizen','research','reporter','detective'].includes(a.role)) return '역할을 고르세요';
      const text=a.kind==='clean'?'🧪 검사소에서 확인했어요. 저 감염 안 됐어요.':jo(`🙋 밝힐게요. 저 ${ROLE[a.role]}이에요.`);
      s.said[p]++; s.ready[p]=false; hear(s,{seat, kind:a.kind, role:a.kind==='claim'?a.role:undefined, t:null, text}); s.ev++; return null; }
    const tt=a.t; if(typeof tt!=='number'||!(tt>=0&&tt<N)||!s.alive[tt]||tt===seat) return '대상을 고르세요';
    const kind = a.kind==='trust' ? 'thanks' : a.kind==='reveal' ? 'reveal' : a.kind==='ask' ? 'probe' : a.kind==='clear' ? 'clear' : 'accuse';
    const text = kind==='thanks' ? `저는 ${nm(tt)}은(는) 믿어요 🤝` : kind==='reveal' ? `📢 저 기자예요. 취재 결과 ${nm(tt)}은(는) 테러리스트예요!` : kind==='probe' ? `${nm(tt)}, 어젯밤에 뭐 했어요? 역할이 뭐예요? ❓` : kind==='clear' ? `📰 저 기자예요. 취재해 보니 ${nm(tt)}은(는) 시민이에요 ✅` : `저는 ${nm(tt)}이(가) 의심스러워요 🤨`;
    s.said[p]++; s.ready[p]=false;
    if(kind==='probe'&&!isH(tt)) ins(s,0,answer(s,tt,seat));
    if((kind==='accuse'||kind==='reveal')&&hasPact(s,tt,seat)){ s.pact[pk(tt,seat)].broken={by:seat,r:s.round}; if(!isH(tt)){ const oc=line(s,tt,'outed',seat); if(oc) ins(s,0,oc); } }
    let rk=null, rx=null, tx=text; if(kind==='accuse'){ const pr=publicReason(s,seat,tt); if(pr){ rk=pr.k; rx=pr.x; tx=rtText(pr.k,tt,pr.x)+' '+text; } }
    hear(s,{seat, kind, t:tt, text:tx, rk, rx}); s.ev++; return null;
  }
  if(a.k==='dmReply'){ const m=((s.dm||{})[seat]||[]).find(x=>x.id===a.id&&x.state==='open'); if(!m) return '이미 답했어요'; m.state=a.yes?'yes':'no'; const i=m.from;
    if(m.kind==='pact'){ if(a.yes){ s.pact[pk(i,seat)]={r:s.round}; if(s.roles[i]!=='terror') s.bel[i][seat]-=1.2; dmPush(s,seat,i,'좋아요, 우리 연합이에요 🤝 서로 안 찍기.'); } else { s.bel[i][seat]+=.3; dmPush(s,seat,i,'…그래요. 기억해 둘게요.'); } }
    if(m.kind==='collude'){ if(a.yes&&s.alive[m.x]){ dmPush(s,seat,i,'좋아요. 같이 가요 🤫'); s.bel[i][seat]-=.3; if(s.phase==='talk'){ why(s,i,m.x,'crowd',seat,.5); const c=accuseR(s,i,'accuse',m.x); if(c) ins(s,s.chatQ.length,c); } } else dmPush(s,seat,i,'알겠어요. 혼자 볼게요.'); }
    s.ev++; return null; }
  if(a.k==='dm'){
    if(s.phase!=='talk') return '귓속말은 토론 시간에만 해요';
    if(!s.alive[seat]) return '쓰러진 사람은 말할 수 없어요';
    if(s.wh[seat]===s.round) return '귓속말은 라운드당 한 번이에요';
    const t=a.t; if(typeof t!=='number'||!(t>=0&&t<N)||!s.alive[t]||t===seat||isH(t)) return '귓속말할 사람을 고르세요';
    const p=P(s,t), r=s.roles[t], b=s.bel[t];
    if(a.what==='pact'){ s.wh[seat]=s.round; dmPush(s,seat,seat,`(→ ${nm(t)}) 우리 몰래 연합해요. 서로 안 찍기 🤝`,{mine:1});
      const v=(r==='terror'?.6:0)-b[seat]*.5+p.trust*.5+Math.random()*.4;
      if(v>.55){ s.pact[pk(t,seat)]={r:s.round}; if(r!=='terror') b[seat]-=1; dmPush(s,seat,t,U.pick(['좋아요 🤝 둘만 아는 거예요.','콜! 서로 안 찍기예요.'])); }
      else dmPush(s,seat,t,U.pick(['음… 아직은 혼자 갈게요.','미안해요, 아직 못 믿겠어요.'])); }
    else if(a.what==='role'){ const ro=a.role; if(!ROLE[ro]||ro==='terror') return '역할을 고르세요'; s.wh[seat]=s.round; dmPush(s,seat,seat,jo(`(→ ${nm(t)}) 몰래 말할게요. 저 ${ROLE[ro]}이에요 🤫`),{mine:1});
      if(r==='terror'){ s.secret.terr=s.secret.terr||{}; s.secret.terr[seat]=ro; dmPush(s,seat,t,'오, 그렇구나… 비밀 지킬게요 😊'); }
      else if(ro!=='citizen'&&r===ro){ bump(s,t,seat,9,'fakeclaim'); dmPush(s,seat,t,'…그 역할은 제 거예요. 왜 거짓말해요? 🤨'); }
      else { b[seat]-=(ro==='citizen'?.3:.9)*(.4+p.trust*.8); dmPush(s,seat,t,U.pick(['알려 줘서 고마워요. 믿을게요 🤝','비밀 지킬게요. 같이 가요.']));
        if((p.bluff>.6||s.cast[t]==='jihu')&&Math.random()<.45) s.leak.push({i:t,h:seat,ro}); } }
    else if(a.what==='x'){ const x=a.x; if(typeof x!=='number'||!s.alive[x]||x===t||x===seat) return '같이 찍을 사람을 고르세요'; s.wh[seat]=s.round; dmPush(s,seat,seat,`(→ ${nm(t)}) ${nm(x)} 같이 찍어요 🤫`,{mine:1});
      const ok= r==='terror' ? s.roles[x]!=='terror' : (b[x]>.2||(b[seat]<-.5&&Math.random()<.5));
      if(ok){ dmPush(s,seat,t,`좋아요. ${nm(x)}, 저도 걸려요.`); why(s,t,x,'crowd',seat,.6); const c=accuseR(s,t,'accuse',x); if(c) ins(s,s.chatQ.length,c); }
      else dmPush(s,seat,t,`${nm(x)}요? 글쎄요, 저는 아닌 것 같아요.`); }
    else return '알 수 없는 귓속말';
    s.ev++; return null; }
  if(a.k==='night'){
    if(s.phase!=='night') return '밤이 아니에요';
    if(!s.alive[seat]) return '이미 쓰러졌어요';
    if(s.ready[p]) return '이미 정했어요';
    const can=canDo(s,seat);
    if(a.act && a.act!=='none'){ if(!can.includes(a.act)) return '그 행동은 지금 못 해요'; const t=a.t; if(typeof t!=='number'||!(t>=0&&t<N)||!s.alive[t]) return '대상을 고르세요'; if(a.act!=='antidote'&&t===seat) return '자기 자신은 안 돼요'; }
    if(can.includes('infect') && a.act!=='infect') return '1번째 밤엔 최초 감염자를 정해야 해요';
    const self=!!a.self && !s.selfTest[seat];
    s.night[seat] = a.act&&a.act!=='none' ? {k:a.act, t:a.t, self} : {k:'none', self};
    s.ready[p]=true; s.ev++; return null;
  }
  return '알 수 없는 동작';
}
function mask(s,p){ syncH(s);
  const v=U.clone(s), me=HSEAT[p], over=s.phase==='over';
  v.roles=s.roles.map((r,i)=> over||i===me||!s.alive[i]||(s.roles[me]==='terror'&&r==='terror') ? r : (s.known[me][i]&&Object.values(ROLE).includes(s.known[me][i]) ? Object.keys(ROLE).find(k=>ROLE[k]===s.known[me][i]) : null));
  v.antibody = over ? s.antibody : null;
  v.infected = over||s.roles[me]==='terror' ? s.infected : {};
  v.tested={}; v.bel=[]; v.why={}; v.dm={[me]:(s.dm&&s.dm[me])||[]}; v.pact={}; for(const k in (s.pact||{})) if(k.split('-').map(Number).includes(me)) v.pact[k]=s.pact[k]; v.secret={}; v.leak=[]; v.doubted={}; v.abHint=null;
  v.night = {}; if(s.night[me]) v.night[me]=s.night[me];
  v.known = ALL.map((_,i)=> i===me ? s.known[me] : {});
  v.snipe={}; v.antidote={}; if(s.snipe[me]) v.snipe[me]=true; if(s.antidote[me]) v.antidote[me]=true;
  v.immune={}; v.fronts=null; v.origin = over ? s.origin : (s.origin!=null ? 'yes' : null);
  v.selfTest={}; if(s.selfTest[me]) v.selfTest[me]=true;
  v.chatQ = s.chatQ.map(()=>null);
  v.bullets = s.roles[me]==='detective' ? s.bullets : null;
  return v;
}

/* ── 혼자 모드: 5번 자리(두 번째 사람 자리)를 컴퓨터가 ── */
function ai(v){ syncH(v);
  const p=1, seat=HSEAT[p];
  if(v.phase==='roles' && !v.ready[p]) return {k:'ready'};
  if(v.phase==='talk' && !v.ready[p] && !v.chatQ.length && v.typing==null) return {k:'ready'};
  if(v.phase==='night' && !v.ready[p] && v.alive[seat]){
    const r=v.roles[seat], others=ALL.filter(i=>v.alive[i]&&i!==seat);
    const nonT=others.filter(i=>v.roles[i]!=='terror');
    const heatOf=j=>ALL.filter(k=>v.alive[k]&&v.mind[k].sus===j).length;
    if(r==='terror'){ if(v.origin==null) return {k:'night',act:'infect',t:U.pick(nonT)}; const hint=Object.entries(v.known[seat]).filter(([j,x])=>x==='항체 후보?'&&v.alive[+j]).map(([j])=>+j); if(!v.snipe[seat]&&v.research===1&&hint.length) return {k:'night',act:'snipe',t:U.pick(hint)}; const rep=nonT.find(j=>v.mind[j].claim==='📰 기자'); if(!v.snipe[seat]&&(rep!=null||Math.random()<.3)) return {k:'night',act:'snipe',t:rep!=null?rep:U.pick(nonT)}; return {k:'night',act:'none'}; }
    if(r==='research'){ const ab=Object.entries(v.known[seat]).find(([,x])=>x==='항체 있음!'); return {k:'night',act:'test',t:ab&&v.alive[+ab[0]]?+ab[0]:U.pick(others.filter(i=>!v.known[seat][i]))??U.pick(others)}; }
    if(r==='reporter'){ const c=others.filter(i=>!v.known[seat][i]); return {k:'night',act:'report',t:c.length?c.sort((x,y)=>heatOf(y)-heatOf(x))[0]:U.pick(others)}; }
    if(r==='detective' && v.bullets>0 && v.round>=2){ const kt=others.find(i=>v.roles[i]==='terror'); const hot=others.sort((x,y)=>heatOf(y)-heatOf(x))[0]; if(kt!=null) return {k:'night',act:'shoot',t:kt}; if(hot!=null&&heatOf(hot)>=3) return {k:'night',act:'shoot',t:hot}; }
    return {k:'night',act:'none',self: !!v.origin && !v.selfTest[seat] && Math.random()<.3};
  }
  return null;
}

/* ── 화면 ── */
let selAct=null, selT=null, selSelf=false, sig='', talkMode=null, lastSayN=null, dmT=null, lastDm=0;
const seatEmoji=(v,i)=> isH(i) ? U.ava(pOf(i)) : NPCS.byId(v.cast[i]).emo;
function seatName(v,i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local'?`${U.esc(ctx.name(p))}(나)`:U.esc(ctx.name(p)); } return NPCS.byId(v.cast[i]).name; }
function fill(t,v,ctx){ return String(t).replace(/\{s(\d)\}/g,(_,d)=>`${+d+1}번 ${seatEmoji(v,+d)} ${seatName(v,+d,ctx)}`); }
const ACTN={infect:'🦠 최초 감염자 정하기', snipe:'🎯 저격 (1회)', antidote:'💊 해독제 주기 (1회)', test:'🧪 항체 검사', report:'📰 정체 취재', shoot:'🔫 저격'};
function mindTag(v,i){ const m=v.mind[i]; const inc=ALL.filter(j=>v.alive[j]&&v.mind[j].sus===i).length;
  return `<span class="vr-mind">${m.claim?`<i class="c">${m.claim}</i>`:''}${m.sus!=null?`<i class="s">🤨${m.sus+1}</i>`:''}${m.trust!=null?`<i class="t">🤝${m.trust+1}</i>`:''}</span>${inc?`<span class="vr-inc" title="${inc}명이 의심 중">👉${inc}</span>`:''}`; }
function mindMap(v,ctx){
  const cl=ALL.filter(i=>v.mind[i].claim==='📰 기자');
  let h=`<div class="vr-map"><div class="vr-h">🧠 마음 지도 <small>대화에서 드러난 각자의 생각 · 👉 = 그 사람을 의심하는 사람</small></div>`;
  if(cl.length>=2) h+=`<div class="vr-warn">⚠️ 기자라고 한 사람이 ${cl.length}명 (${cl.map(i=>i+1+'번').join(', ')}) — 누군가는 거짓말 중!</div>`;
  for(const i of ALL){ const m=v.mind[i], dead=!v.alive[i], per=isH(i)?null:NPCS.byId(v.cast[i]);
    const acc=v.hist.filter(x=>!x.ann&&x.seat===i&&x.t!=null&&ACCUSE.includes(x.kind));
    const inc=ALL.filter(j=>v.alive[j]&&v.mind[j].sus===i);
    const past=[...new Set(acc.map(x=>x.t))].map(t=>{ const d=!v.alive[t]; const ok=d&&v.roles[t]==='terror'; return `<b class="${d?(ok?'ok':'no'):''}">${t+1}번${d?(ok?'✔':'✘'):''}</b>`; }).join(' ');
    h+=`<div class="vr-row ${dead?'dead':''}"><div class="vr-who">${i+1} ${seatEmoji(v,i)} <b>${seatName(v,i,ctx)}</b>${per?` <small title="${per.desc}">${per.arch}</small>`:''}${dead?` <small>✝ ${ROLE[v.roles[i]]}</small>`:''}</div>
      <div class="vr-st"><span class="mood">${m.mood||'😶'}</span>${m.claim?`<span class="c">${m.claim} 주장</span>`:''}${m.sus!=null?`<span class="s">🤨 ${m.sus+1}번 의심</span>`:''}${m.trust!=null?`<span class="t">🤝 ${m.trust+1}번 믿음</span>`:''}${inc.length?`<span class="i">👉 ${inc.map(j=>j+1).join('·')}번이 의심 중</span>`:''}${past?`<span class="p">찍었던 사람 ${past}</span>`:''}</div></div>`; }
  return h+'</div>';
}
function history(v,ctx){
  const rs=[...new Set(v.hist.map(x=>x.r))].sort((a,b)=>b-a); if(!rs.length) return '';
  return `<div class="vr-hist"><div class="vr-h">📜 대화 기록 <small>최근 라운드가 위</small></div>${rs.map(r=>`<div class="vr-rd"><b>${r}라운드</b>${v.hist.filter(x=>x.r===r).map(x=>x.ann?`<div class="a">${fill(U.esc(x.text),v,ctx)}</div>`:`<div><span class="w">${x.seat+1} ${seatEmoji(v,x.seat)}</span> ${fill(U.esc(x.text),v,ctx)}</div>`).join('')}</div>`).join('')}</div>`;
}
function recap(v,ctx){
  const who=i=>i==null?'-':`${i+1}번 ${seatEmoji(v,i)} ${seatName(v,i,ctx)}`;
  const tl=[]; v.hist.forEach(x=>{ if(x.ann&&/쓰러졌|치료제|1단계 성공/.test(x.text)) tl.push(`<div><b>${x.r}R</b> ${fill(U.esc(x.text),v,ctx)}</div>`);
    else if(!x.ann&&x.kind==='reveal'&&x.t!=null) tl.push(`<div><b>${x.r}R</b> 📢 ${who(x.seat)} → "${x.t+1}번은 테러리스트" ${v.roles[x.t]==='terror'?'<span class="ok">✔ 맞음</span>':'<span class="no">✘ 틀림</span>'}${v.roles[x.seat]==='terror'?' <b>(테러리스트의 뻥!)</b>':''}</div>`); });
  const sc=i=>{ let a=0; v.hist.forEach(x=>{ if(!x.ann&&x.seat===i&&x.t!=null&&ACCUSE.includes(x.kind)) a+= v.roles[x.t]==='terror'?1:-.6; }); return a; };
  const det=ALL.filter(i=>v.roles[i]!=='terror').sort((a,b)=>sc(b)-sc(a))[0];
  const terrs=ALL.filter(i=>v.roles[i]==='terror'), liar=terrs.find(i=>v.mind[i].claim)??terrs.slice().sort((a,b)=>(v.cause[b]?v.cause[b].r:99)-(v.cause[a]?v.cause[a].r:99))[0];
  return `<div class="vr-recap"><div class="vr-win ${v.side}">${v.side==='terror'?'💣 테러리스트 팀 승리':'🙂 시민 팀 승리'}</div>
    <div class="vr-roles">${ALL.map(i=>`<div class="${v.alive[i]?'':'dead'} ${v.roles[i]==='terror'?'t':''}"><span>${seatEmoji(v,i)}</span><b>${seatName(v,i,ctx)}</b><small>${ROLE[v.roles[i]]}${i===v.antibody?' · 🧬 항체':''}</small><small>${v.alive[i]?'생존':`✝ ${v.cause[i]?`${v.cause[i].r}R ${v.cause[i].k==='shot'?'🔫 총':'🦠 바이러스'}`:''}`}</small></div>`).join('')}</div>
    ${tl.length?`<div class="vr-tl"><div class="vr-h">🎬 결정적 장면</div>${tl.join('')}</div>`:''}
    ${(v.conf||[]).length?`<div class="vr-tl"><div class="vr-h">💭 끝나고 한마디</div>${v.conf.map(c=>`<div>${seatEmoji(v,c.seat)} <b>${seatName(v,c.seat,ctx)}</b> "${fill(U.esc(c.text),v,ctx)}"</div>`).join('')}</div>`:''}
    <div class="vr-award">🕵️ 명탐정 <b>${who(det)}</b>${liar!=null?` · 🎭 명연기 <b>${who(liar)}</b>`:''}</div></div>`; }
function coach(v,ctx){ const me=HSEAT[ctx.me], r=v.roles[me];
  if(v.phase==='roles') return '역할은 나만 봐요. 테러리스트 둘은 서로를 알고, 나머지는 토론으로 테러리스트를 찾아야 해요.';
  if(v.phase==='night'&&v.alive[me]&&!v.ready[ctx.me]){
    if(r==='citizen') return '시민은 밤에 할 일이 없어요. 바이러스가 걱정되면 🏥 검사소에서 내 감염을 한 번 확인할 수 있어요.';
    if(r==='terror') return v.origin==null?'바이러스는 매 라운드 양옆으로 한 칸씩 번져요. 동료에게서 먼 자리를 고르면 좋아요.':'연구원이 항체 보유자를 두 번 찾으면 우리가 져요. 기자·연구원이라고 밝힌 사람을 노려 보세요.';
    if(r==='research') return '항체 보유자는 시민 중 한 명이에요. 의심받지 않는 사람부터 검사해 보세요. 두 번 찾으면 바로 승리!';
    if(r==='reporter') return '알아낸 정체는 나만 알아요. 아침에 밝힐지는 선택 — 밝히면 테러리스트에게 노려져요.';
    if(r==='detective') return '총알은 2발. 시민을 쏘면 우리 팀 손해예요. 확신이 설 때만 쏘세요.'; }
  if(v.phase==='morning') return '쓰러진 사람의 정체가 공개돼요. 그 사람을 의심했던 사람이 맞았는지 왼쪽 마음 지도의 ✔✘로 확인해 보세요.';
  if(v.phase==='talk') return '빛나는 자리 = 지금 말하는 사람, 빨간 자리 = 방금 지목당한 사람. 기자라고 하는 사람이 둘이면 한 명은 거짓말!';
  return ''; }
const VFX={'🤨':'❓','😠':'💢','😤':'💢','😰':'💦','🤝':'💗','📢':'❗','🧐':'❓'};
/* 시선 화살표: 방금 한 말의 화자 → 대상 */
function vrArrows(el,v){ const ring=el.querySelector('.vr-ring'); if(!ring||v.phase!=='talk') return; const last=v.hist.filter(x=>x.r===v.round&&!x.ann).slice(-1)[0]; if(!last||last.t==null||last.t===last.seat) return;
  let svg=ring.querySelector('svg.kg-arrows'); if(!svg){ svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('class','kg-arrows'); svg.innerHTML='<defs><marker id="vrah" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>'; ring.appendChild(svg); }
  const R0=ring.getBoundingClientRect(); svg.setAttribute('viewBox','0 0 '+R0.width+' '+R0.height); const c=i=>{ const e=ring.querySelector('.vr-seat[data-t="'+i+'"]'); if(!e) return null; const r=e.getBoundingClientRect(); return [r.left-R0.left+r.width/2, r.top-R0.top+r.height/2]; };
  const p=c(last.seat), q=c(last.t); if(!p||!q) return; const dx=q[0]-p[0], dy=q[1]-p[1], L=Math.hypot(dx,dy)||1, sh=36; const ln=document.createElementNS('http://www.w3.org/2000/svg','line');
  ln.setAttribute('x1',p[0]+dx/L*sh); ln.setAttribute('y1',p[1]+dy/L*sh); ln.setAttribute('x2',q[0]-dx/L*sh); ln.setAttribute('y2',q[1]-dy/L*sh); ln.setAttribute('class','ar '+(ACCUSE.includes(last.kind)?'bad':last.kind==='probe'?'vote':'good')); ln.setAttribute('marker-end','url(#vrah)'); svg.appendChild(ln); }
function render(el,v,ctx){ syncH(v);
  const me=HSEAT[ctx.me], myRole=v.roles[me];
  const sg=v.round+':'+v.phase; if(sg!==sig){ sig=sg; selAct=null; selT=null; selSelf=false; talkMode=null; dmT=null; }
  let h=`<div class="vr-mid"><div class="info">${v.round?`${v.round}라운드 / ${MAXR}`:'준비'} · 나는 <b>${myRole?ROLE[myRole]:'?'}</b>${v.bullets!=null?` · 남은 총알 ${v.bullets}`:''}${v.research?` · 🧪 연구 ${v.research}/2`:''}</div>`;
  h+=`<div class="hl-notice">${fill(v.notice||'',v,ctx)}</div>`;
  const feed=v.phase==='talk'?v.hist.filter(x=>x.r===v.round&&!x.ann).slice(-3):[], last=feed[feed.length-1];
  if(v.lastSay&&v.lastSay.n!==lastSayN){ if(lastSayN!=null&&ctx.sfx) ctx.sfx('tick'); lastSayN=v.lastSay.n; }
  if(v.phase==='talk') h+=`<div class="vr-feed">${feed.map((x,k)=>`<div class="${k===feed.length-1?'new':''}"><span class="w">${x.seat+1} ${seatEmoji(v,x.seat)} ${seatName(v,x.seat,ctx)}</span> ${fill(U.esc(x.text),v,ctx)}</div>`).join('')}${v.typing!=null?`<div class="typing"><span class="w">${v.typing+1} ${seatEmoji(v,v.typing)} ${seatName(v,v.typing,ctx)}</span> <i>입력 중…</i></div>`:''}${!feed.length&&v.typing==null?'<div class="empty">🗣️ 곧 토론이 시작돼요…</div>':''}</div>`;
  h+=`<div class="vr-ring ${v.phase==='night'?'night':v.phase==='over'?'over':''}">${ALL.map(i=>{ const r=v.roles[i], dead=!v.alive[i], k=v.known[me][i];
    const typing=v.typing===i, said=last&&last.seat===i&&v.typing==null, tg=last&&last.t===i&&v.phase==='talk'?(ACCUSE.includes(last.kind)?'tgt':(last.kind==='thanks'||last.kind==='clear')?'ally':''):'', hit=v.phase==='morning'&&v.focus&&v.focus.seat===i;
    const selectable = (v.phase==='talk'&&talkMode&&v.alive[i]&&i!==me) || (v.phase==='night' && selAct && selAct!=='none' && v.alive[i] && (selAct==='antidote'||i!==me));
    return `<button class="vr-seat ${typing?'spot':''} ${said?'speak':''} ${tg} ${hit?'hit':''} ${dead?'dead':''} ${i===me?'me':''} ${selT===i?'sel':''} ${selectable?'can':''}" data-t="${i}" style="--a:${i*45}deg">
      ${!isH(i)&&!dead&&v.pact&&v.pact[pk(i,me)]?`<span class="vr-pact ${v.pact[pk(i,me)].broken?'broken':''}" title="나와 몰래 연합${v.pact[pk(i,me)].broken?' — 깨짐':''}">${v.pact[pk(i,me)].broken?'💔':'🤫🤝'}</span>`:''}${!isH(i)&&!dead&&v.mind[i].mood?`<span class="kg-mood ${said?'pop':''}">${v.mind[i].mood}</span>${said&&VFX[v.mind[i].mood]?`<span class="kg-fx">${VFX[v.mind[i].mood]}<i>${VFX[v.mind[i].mood]}</i><i>${VFX[v.mind[i].mood]}</i></span>`:''}`:''}<span class="vr-no">${i+1}</span><span class="vr-emo">${seatEmoji(v,i)}</span><span class="vr-nm">${seatName(v,i,ctx)}</span>
      ${r&&(dead||i===me||r==='terror'&&myRole==='terror'||k)?`<span class="vr-role">${ROLE[r]}</span>`:''}${k&&(k.includes('항체')||k.includes('감염'))?`<span class="vr-k">${k}</span>`:''}
      ${dead?'':mindTag(v,i)}${v.infected&&v.infected[i]!=null&&!dead?'<span class="vr-inf">🦠</span>':''}${dead?`<span class="vr-dead">✝${v.cause&&v.cause[i]?(v.cause[i].k==='shot'?'🔫':'🦠'):''}</span>`:''}${typing?'<span class="vr-typing">입력 중…</span>':''}${said?'<span class="vr-talk">💬</span>':''}${tg==='tgt'?'<span class="vr-tg">🤨 지목</span>':tg==='ally'?'<span class="vr-tg ally">🤝</span>':''}</button>`; }).join('')}
    <div class="vr-center">${v.origin?'🦠':'🏙️'}<small>${v.phase==='night'?'밤':v.phase==='over'?'끝':'낮'}</small></div></div>`;
  if(v.phase==='roles' && !v.ready[ctx.me]){
    h+=`<div class="vr-card"><b>당신의 역할: ${ROLE[myRole]}</b><p>${({terror:'1번째 밤에 최초 감염자를 정하고, 이후 저격·해독제를 한 번씩 쓸 수 있어요. 동료 테러리스트가 누구인지 알아요. 시민 쪽이 전멸하면 승리!', research:'밤마다 한 명의 항체를 검사해요. 항체 보유자를 두 번 찾으면 치료제 완성으로 시민 팀 승리!', reporter:'밤마다 한 명의 정체를 취재해 알아내요. 아침 토론에서 알려 줄지 말지는 내 선택 — 밝히면 노려질 수 있어요.', detective:'총알 2발. 테러리스트라고 확신이 서면 밤에 저격하세요. 시민을 쏘면 큰일!', citizen:'특별한 능력은 없지만 토론으로 테러리스트를 찾아요. 시민 중 한 명은 항체 보유자(아무도 모름)예요.'})[myRole]}</p>
      ${myRole==='terror'?`<p>동료: ${ALL.filter(i=>i!==me&&v.roles[i]==='terror').map(i=>fill(nm(i),v,ctx)).join(', ')}</p>`:''}
      <p class="vr-cast">오늘의 플레이어: ${npcSeats().map(i=>`${seatEmoji(v,i)} ${seatName(v,i,ctx)} ${NPCS.byId(v.cast[i]).arch}`).join(' · ')}</p><button data-a="ready">확인했어요</button></div>`;
  }
  if(v.phase==='night' && v.alive[me] && !v.ready[ctx.me]){
    const can=[]; const r=myRole;
    if(r==='terror'){ if(v.origin==null) can.push('infect'); else { if(!v.snipe[me]) can.push('snipe'); if(!v.antidote[me]) can.push('antidote'); } }
    if(r==='research') can.push('test'); if(r==='reporter') can.push('report'); if(r==='detective'&&v.bullets>0) can.push('shoot');
    h+=`<div class="vr-card"><b>🌙 몰래 할 일</b><div class="fh-act">${can.map(a=>`<button class="${selAct===a?'':'ghost'}" data-act="${a}">${ACTN[a]}</button>`).join('')}${can.includes('infect')?'':`<button class="${selAct==='none'?'':'ghost'}" data-act="none">아무것도 안 함</button>`}</div>
      ${selAct&&selAct!=='none'?`<small>${selT==null?'👆 위 원에서 대상을 누르세요':`대상: ${fill(nm(selT),v,ctx)}`}</small>`:''}
      ${v.origin&&!v.selfTest[me]?`<label class="vr-chk"><input type="checkbox" data-self ${selSelf?'checked':''}> 🏥 검사소에서 내 감염 확인 (1회)</label>`:''}
      <div class="fh-act"><button data-a="go" ${(selAct==='none'||(selAct&&selT!=null))?'':'disabled'}>이대로 밤 보내기</button></div></div>`;
  } else if(v.phase==='night') h+=`<div class="vr-card"><small>${v.alive[me]?'다른 사람들이 행동하는 중… 🌙':'쓰러진 사람은 지켜만 봐요 👻'}</small></div>`;
  if(v.phase==='talk' && v.alive[me]){ const no=v.said[ctx.me]>=4?'disabled':'', tb=(k,lab,tt)=>`<button class="${talkMode===k?'':'ghost'}" data-tk="${k}" ${no} ${tt?`title="${tt}"`:''}>${lab}</button>`;
    const mine=v.known[me][me], selfT=mine==='✅ 감염 안 됨'?'✅ 내 검사: 깨끗':mine==='🦠 감염됨'?'🦠 내 검사: 감염(말하면 뻥)':'검사 안 함 — 말하면 뻥일 수도';
    h+=`<div class="fh-act">${tb('accuse','🤨 의심 지목')}${tb('trust','🤝 믿는다고 말하기')}${tb('ask','❓ 물어보기','대답하는 모습에서 단서(😅)가 보일 수도 있어요')}${tb('reveal','📢 기자로서 테러 공개','진짜 기자가 아니어도 할 수 있어요(뻥)')}${tb('clear','✅ 기자로서 시민 확인','진짜 기자가 아니어도 할 수 있어요(뻥)')}${talkMode?'<small>👆 원에서 사람을 누르세요</small>':`<small>남은 발언 ${4-v.said[ctx.me]}번</small>`}</div>`;
    h+=`<div class="fh-act vr-me"><b>🙋 내 얘기</b><button class="ghost" data-sy="clean" ${no} title="${selfT}">🧪 감염 안 됐어요</button>${['citizen','research','detective','reporter'].map(r=>`<button class="ghost" data-sy="claim:${r}" ${no} title="진짜가 아니어도 할 수 있어요 — 진짜 그 역할인 사람이 반박할 수도, 테러의 표적이 될 수도">${jo(`저 ${ROLE[r]}이에요`)}</button>`).join('')}<small>${selfT}</small></div>`; }
  if(v.phase==='talk'){ const busy=v.chatQ.length||v.typing!=null; h+=`<div class="fh-act">${busy?'<small>🗣️ 이야기 중… 다 듣고 나면 밤으로 넘어가요</small>':v.ready[ctx.me]?'<small>다른 사람을 기다리는 중…</small>':'<button data-a="ready">🌙 밤으로</button>'}</div>`; }
  { const D=(v.dm[me]||[]).slice(-6); const nOpen=D.filter(m=>m.state==='open').length, newest=D.length?D[D.length-1].id:0, fresh=newest>lastDm; if(fresh&&lastDm&&ctx.sfx) ctx.sfx('host'); lastDm=newest;
    if(D.length||v.phase==='talk') h+=`<div class="kg-dm vr-dm ${fresh?'slide':''}"><div class="kg-fh">🤫 귓속말 <small>나만 보여요${v.phase==='talk'&&v.alive[me]?(v.wh[me]===v.round?' · 이번 라운드엔 보냈어요':' · 라운드당 한 번 보낼 수 있어요'):''}</small></div>${D.map(m=>`<div class="${m.state==='open'?'open':''} ${m.state==='bad'?'bad':''}">${m.mine?'<small>나</small> ':`<b>${seatEmoji(v,m.from)} ${seatName(v,m.from,ctx)}</b> `}${fill(U.esc(m.text),v,ctx)}${m.state==='open'?` <button class="small" data-dmr="${m.id}:1">${m.kind==='pact'?'🤝 좋아요':'👍 같이 찍기'}</button><button class="ghost small" data-dmr="${m.id}:0">🙅 싫어요</button>`:''}</div>`).join('')}`;
    if(v.phase==='talk'&&v.alive[me]&&v.wh[me]!==v.round){ h+= dmT==null ? `<div class="fh-act"><button class="${talkMode==='dm'?'':'ghost'} small" data-tk="dm">🤫 귓속말 보내기</button>${talkMode==='dm'?'<small>👆 원에서 귓속말할 사람을 누르세요</small>':''}</div>`
        : `<div class="fh-act"><small>→ ${seatEmoji(v,dmT)} ${seatName(v,dmT,ctx)}에게:</small><button class="small" data-dmw="pact">🤝 몰래 연합</button>${['citizen','research','detective','reporter'].map(r=>`<button class="ghost small" data-dmw="role:${r}">🔎 ${jo(`저 ${ROLE[r]}이에요`)}</button>`).join('')}<button class="ghost small" data-tk="dmx">🎯 같이 찍자…</button><button class="ghost small" data-dmw="cancel">취소</button>${talkMode==='dmx'?'<small>👆 같이 찍을 사람을 누르세요</small>':''}</div>`; }
    if(D.length||v.phase==='talk') h+='</div>'; }
  const K=Object.entries(v.known[me]||{}).filter(([j])=>+j!==me); if(K.length) h+=`<div class="vr-know">🗒️ 내가 알아낸 것: ${K.map(([j,x])=>`${fill(nm(+j),v,ctx)} = ${x}`).join(' · ')}</div>`;
  if(v.phase==='over') h+=recap(v,ctx);
  h+=`</div>`;
  h = `<div class="vr-layout has-chat">${h}<aside class="vr-l">${v.round?U.politics(v.hist.filter(x=>!x.ann),{seats:ALL,emo:i=>seatEmoji(v,i),name:i=>seatName(v,i,ctx),me:HSEAT[ctx.me],alive:i=>v.alive[i],pacts:Object.entries(v.pact||{}).map(([k,p])=>{ const [a,b]=k.split('-').map(Number); return [a,b,!!p.broken]; })})+mindMap(v,ctx):''}</aside><aside class="vr-r">${v.round?U.chat(v.hist.map(x=>x.ann?{r:x.r,note:1,text:x.text}:x),{emo:i=>seatEmoji(v,i),name:i=>seatName(v,i,ctx),fill:t=>fill(t,v,ctx),me:HSEAT[ctx.me]}):''}</aside></div>`;
  el.innerHTML=h; setTimeout(()=>vrArrows(el,v),30);
  el.onclick=e=>{
    const a=e.target.closest('[data-a]'); if(a&&!a.disabled){ if(a.dataset.a==='ready') ctx.act({k:'ready'}); else if(a.dataset.a==='go') ctx.act({k:'night',act:selAct,t:selT,self:selSelf}); return; }
    const dr=e.target.closest('[data-dmr]'); if(dr){ const [id,y]=dr.dataset.dmr.split(':'); ctx.act({k:'dmReply',id:+id,yes:y==='1'}); return; }
    const dw=e.target.closest('[data-dmw]'); if(dw){ const w=dw.dataset.dmw; if(w==='cancel'){ dmT=null; talkMode=null; ctx.rerender(); return; } const [k,r]=w.split(':'); const t=dmT; dmT=null; talkMode=null; ctx.act({k:'dm',t,what:k,role:r}); return; }
    const sy=e.target.closest('[data-sy]'); if(sy&&!sy.disabled){ const [k,r]=sy.dataset.sy.split(':'); talkMode=null; ctx.act({k:'talk',kind:k,role:r}); return; }
    const tk=e.target.closest('[data-tk]'); if(tk&&!tk.disabled){ talkMode = talkMode===tk.dataset.tk ? null : tk.dataset.tk; ctx.rerender(); return; }
    const ac=e.target.closest('[data-act]'); if(ac){ selAct=ac.dataset.act; selT=null; ctx.rerender(); return; }
    const sf=e.target.closest('[data-self]'); if(sf){ selSelf=sf.checked; return; }
    const t=e.target.closest('[data-t]'); if(!t) return; const i=+t.dataset.t;
    if(v.phase==='talk' && talkMode==='dm'){ if(i===me||!v.alive[i]||isH(i)) return; dmT=i; talkMode=null; ctx.rerender(); return; }
    if(v.phase==='talk' && talkMode==='dmx'){ if(i===me||!v.alive[i]||i===dmT) return; const t=dmT; dmT=null; talkMode=null; ctx.act({k:'dm',t,what:'x',x:i}); return; }
    if(v.phase==='talk' && talkMode){ if(i===me||!v.alive[i]) return; const k=talkMode; talkMode=null; ctx.act({k:'talk',kind:k,t:i}); return; }
    if(v.phase==='night' && selAct && selAct!=='none'){ if(!v.alive[i]||(i===me&&selAct!=='antidote')) return; selT=i; ctx.rerender(); }
  };
}
function status(v,ctx){ syncH(v);
  const me=HSEAT[ctx.me];
  if(v.phase==='over') return '';
  if(v.phase==='roles') return v.ready[ctx.me]?'상대가 역할을 확인하는 중…':'내 역할을 확인하세요';
  if(v.phase==='night'){ if(!v.alive[me]) return '👻 쓰러져서 지켜보는 중'; if(v.ready[ctx.me]) return '🌙 다른 사람들이 몰래 행동하는 중…'; const r=v.roles[me];
    return ({terror: v.origin==null?'💣 최초 감염자를 원에서 고르고 "이대로 밤 보내기"를 누르세요':'💣 저격·해독제를 쓸지 고르고 "이대로 밤 보내기"를 누르세요', research:'🧪 항체를 검사할 사람을 고르고 "이대로 밤 보내기"를 누르세요', reporter:'📰 정체를 알아볼 사람을 고르고 "이대로 밤 보내기"를 누르세요',
      detective: v.bullets>0?'🔫 쏠 사람이 확실하면 고르고, 아니면 "아무것도 안 함"을 누르세요':'🔫 총알을 다 썼어요 — "아무것도 안 함"을 누르세요', citizen:'🙂 시민은 밤에 할 일이 없어요 — "아무것도 안 함" → "이대로 밤 보내기"를 누르세요'})[r]; }
  if(v.phase==='morning') return '☀️ 밤사이 일어난 일을 한 줄씩 발표하는 중…';
  if(!v.alive[me]) return '👻 토론을 지켜보는 중';
  if(v.chatQ.length||v.typing!=null) return '🗣️ 다른 사람들이 말하는 중… (아래 버튼으로 끼어들 수 있어요)';
  return v.ready[ctx.me]?'다른 사람을 기다리는 중…':'💬 할 말이 있으면 하고, 다 됐으면 "🌙 밤으로"를 누르세요';
}
const guide=`
<p><b>8인 마을</b>(우리 둘 + 컴퓨터 플레이어 6명)에 테러리스트가 바이러스를 퍼뜨려요. 혼자 하면 나머지 7명이 컴퓨터예요. 자리 번호 1~8은 <b>원으로 이어져</b> 있어요.</p>
<ul><li>역할: 💣 테러리스트 2(서로 앎) · 🧪 연구원 · 📰 기자 · 🔫 수사관 · 🙂 시민 3 (시민 중 1명은 몰래 <b>항체 보유자</b>, 본인도 몰라요)</li>
<li><b>밤</b>(몰래): 💣 1번째 밤 최초 감염자 지정 → 이후 🎯 저격·💊 해독제 각 1회 / 🧪 한 명 항체 검사 / 📰 한 명 정체 취재 / 🔫 저격(총 2발) / 누구나 🏥 검사소에서 내 감염 확인 1회</li>
<li><b>바이러스</b>: 최초 감염자에서 매 라운드 <b>양옆으로 한 칸씩</b> 번져요(쓰러진 자리는 건너뜀). 감염되고 두 라운드가 지나면 쓰러져요. 💊 해독제를 받은 자리는 치료되고 그쪽 전염이 멈춰요. 항체 보유자는 안 쓰러져요.</li>
<li><b>아침</b>: 쓰러진 사람과 정체, 감염자 수, 연구 진척이 한 줄씩 발표되고 → 한 명씩 토론. 나도 🤨 의심 지목·🤝 믿는다고 말하기·📢 기자로서 테러 공개(뻥도 됨)(라운드당 3번)로 끼어들 수 있고, 지목당한 사람은 성격대로 변명하거나 되받아쳐요.</li>
<li><b>컴퓨터 플레이어</b>: 🧠 전략가·🤝 연합가·🔍 관찰자·💓 직감파·🃏 승부사·🔥 직진형·🗡️ 배신형·⚖️ 중재자 중 6명. 각자 속으로 누구를 의심하는지 따로 생각하고, 들은 말과 쓰러진 사람의 정체를 기억해요. 테러리스트면 기자인 척 맞불을 놓거나, 몰린 동료를 버리기도 해요.</li>
<li><b>🧠 마음 지도</b>: 누가 누구를 의심·신뢰하는지, 기자라고 주장한 사람, 예전에 찍었던 사람이 결국 테러(✔)였는지 시민(✘)이었는지 한눈에. 📜 대화 기록은 라운드별로 남아요.</li>
<li><b>치료제 경쟁</b>: 연구 1단계가 성공하면 테러리스트에게 <b>항체 보유자 후보 2명</b>(하나는 가짜)이 알려져요. 항체 보유자가 저격당하면 치료제는 끝.</li>
<li><b>승리</b>: 🙂 시민 팀 — 테러리스트 둘 다 쓰러짐, 또는 연구원이 항체 보유자를 2번 찾아 치료제 완성, 또는 ${MAXR}라운드까지 버팀 / 💣 테러 팀 — 항체 보유자 말고 시민 쪽 전멸.</li></ul>
<div class="tipbox">💡 <b>팁</b><br>
· 기자가 둘이면 하나는 테러리스트예요. 누가 먼저, 누구를 찍었는지 마음 지도로 비교해 보세요.<br>
· 시민을 찍었던 사람(✘)이 또 누군가를 몰고 있다면?<br>
· 연구원·기자임을 밝히면 테러리스트의 저격 대상이 돼요.</div>`;
const guideSteps=[
  {t:'🎭 내 역할', h:'8명이 원으로 앉아요. 역할은 <b>나만</b> 봐요 — 💣 테러리스트 2명은 서로를 알아요.', demo:s=>s},
  {t:'🌙 밤 — 몰래 행동', h:'판이 어두워지면 밤. 역할마다 <b>한 가지</b>를 몰래 해요(감염·저격·검사·취재). 시민은 쉬어요.', demo:s=>{ s.ready=[true,true]; startNight(s); s.ready=[false,true]; return s; }},
  {t:'☀️ 아침 — 한 줄씩 발표', h:'밤사이 일이 <b>한 줄씩</b> 발표되고, 그 사람 자리가 흔들려요. 쓰러진 사람의 <b>정체와 원인</b>이 공개돼요.', demo:s=>{ s.round=2; s.phase='morning'; s.origin=2; s.alive[3]=false; s.cause[3]={r:2,k:'virus'}; s.focus={seat:3,k:'dead'}; s.notice='🦠 {s3} 바이러스로 쓰러졌어요 — 감염되고 두 밤이 지났어요 · 정체는 🙂 시민'; s.hist.push({r:2,ann:true,text:s.notice}); return s; }},
  {t:'🦠 바이러스는 양옆으로', h:'최초 감염자에서 <b>매 라운드 양옆 한 칸씩</b> 번지고, 감염 두 밤 뒤 쓰러져요. 💊 해독제·🧬 항체 보유자는 예외.', demo:s=>{ s.round=2; s.phase='morning'; s.origin=1; s.notice='📢 지금 감염자는 3명이에요 — 어젯밤 새로 2명 감염'; return s; }},
  {t:'💬 토론 — 누가 누구를?', h:'말하는 사람 자리가 <b>빛나고</b>, 지목당한 자리는 <b>빨갛게</b>. 최근 대사 3줄이 남아요. 나도 🤨 의심·🤝 믿음·📢 기자 공개로 끼어들 수 있어요.', demo:s=>{ s.round=1; s.phase='talk'; s.ready=HSEAT.map(()=>false); hear(s,{seat:2,kind:'accuse',t:5,text:'저는 {s5}이(가) 의심스러워요 🤨'}); hear(s,{seat:5,kind:'counter',t:2,text:'{s2}, 그쪽이 더 수상한데요?'}); s.chatQ=[{seat:6,kind:'agree',t:5,text:'저도 {s5} 쪽이에요'}]; s.typing=6; return s; }},
  {t:'🏆 승리와 판 정리', h:'시민 팀: 테러 둘 다 쓰러짐 / 치료제 완성 / 7라운드 버팀. 테러 팀: 시민 쪽 전멸. 끝나면 <b>전원 정체·결정적 장면·속마음</b>이 공개돼요.', demo:s=>{ s.round=4; const t=ALL.filter(i=>s.roles[i]==='terror'); t.forEach(i=>{ s.alive[i]=false; s.cause[i]={r:3,k:'shot'}; }); end(s,'citizen'); return s; }},
];
window.GAMES.virus = { _sync:x=>syncH(x), maxH:8,
  title:'바이러스 테러', ref:'데블스 플랜 「바이러스 게임」', emoji:'🦠', tags:['마피아','추리','NPC','두뇌서바이벌'],
  tagline:'우리 둘 + 성격 다른 컴퓨터 플레이어 6명. 바이러스를 퍼뜨린 테러리스트를 찾거나 치료제를 만들어라.',
  guide, guideSteps, coach, init, apply, mask, ai, render, status, step, stepDelay, noPersona:true, wide:true,
  aiDelay:()=>1500+Math.random()*2000,
  reset(){ selAct=null; selT=null; selSelf=false; sig=''; talkMode=null; lastSayN=null; dmT=null; lastDm=0; },
  bar:(v,i)=>{ const seat=HSEAT[i]; return `<span class="tag">${v.alive&&!v.alive[seat]?'✝ ':''}${v.roles[seat]?ROLE[v.roles[seat]]:'정체 ?'}</span>`; },
  result:(v)=> v.side==='terror'?'💣 테러리스트 팀 승리':'🙂 시민 팀 승리',
};
})();
