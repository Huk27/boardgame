(function(){
'use strict';
/* 🏰 세 전장 (2026-11-14 사용자: "리프트바운드 같지는 않아도 비슷하게") — 놀이터 오리지널 1:1 카드 대결.
   대표 동물(리더) 하나를 고르고, 매 턴 ✨기운이 1씩 늘어남 → 유닛·기술 카드를 내고 → 유닛을 가운데 세 전장으로 보내 싸워 차지.
   전장에 처음 들어가 차지하면 +1점, 내 턴이 시작될 때 지키고 있는 전장마다 +1점. 10점 먼저 승리.
   전투: 양쪽 힘 합계만큼 피해 → 약한 유닛부터 (피해 ≥ 힘이면) 쓰러짐. 공격 쪽만 남으면 정복, 수비 쪽이 남으면 공격 쪽은 기지로 후퇴.
   카드·리더·전장은 전부 이 사이트에서 새로 만든 것(원작 카드·캐릭터 없음). */
const GOAL=10, MAXEN=8, TURN_CAP=40;
/* 유닛: c=비용, pw=힘, kw: rush(돌격: 내자마자 움직임) fly(날개: 전장→전장) d1/d2(수비 +1/+2) draw(등장: 1장 뽑기) */
const C={
  rat:   {t:'u',n:'들쥐 척후병',e:'🐭',c:1,pw:1,kw:['rush'],d:'돌격'},
  hog:   {t:'u',n:'고슴도치',e:'🦔',c:2,pw:2,kw:['d1'],d:'수비 +1'},
  chick: {t:'u',n:'병아리 전령',e:'🐥',c:2,pw:1,kw:['draw'],d:'등장: 카드 1장'},
  deer:  {t:'u',n:'사슴 기수',e:'🦌',c:3,pw:3,kw:['rush'],d:'돌격'},
  turtle:{t:'u',n:'거북 방패병',e:'🐢',c:3,pw:2,kw:['d2'],d:'수비 +2'},
  boar:  {t:'u',n:'멧돼지',e:'🐗',c:4,pw:5,kw:[],d:''},
  eagle: {t:'u',n:'독수리',e:'🦅',c:4,pw:3,kw:['rush','fly'],d:'돌격 · 날개'},
  ele:   {t:'u',n:'코끼리',e:'🐘',c:5,pw:6,kw:['d1'],d:'수비 +1'},
  drag:  {t:'u',n:'아기 용',e:'🐲',c:7,pw:9,kw:[],d:''},
  bolt:  {t:'s',n:'번개',e:'⚡',c:2,tg:'foe',d:'힘 3 이하 적 유닛 하나를 쓰러뜨려요'},
  shout: {t:'s',n:'함성',e:'📯',c:1,d:'이번 턴 내 유닛 전부 힘 +1'},
  call:  {t:'s',n:'지원 요청',e:'📜',c:2,d:'카드 2장 뽑기'},
  whirl: {t:'s',n:'회오리',e:'🌀',c:2,tg:'foeBf',d:'전장의 적 유닛 하나를 기지로 날려 보내요'},
  meat:  {t:'s',n:'든든한 먹이',e:'🍖',c:1,tg:'mine',d:'내 유닛 하나 힘 +1 (계속)'},
};
const DECK=['rat','rat','rat','hog','hog','chick','chick','deer','deer','turtle','turtle','boar','boar','eagle','eagle','ele','ele','drag','bolt','bolt','shout','call','whirl','meat'];
/* 대표 동물 — 셋 중 하나를 고름 */
const L={
  fox:  {e:'🦊',n:'여우',a:'잔꾀',c:0,free:1,d:'(턴에 한 번, 공짜) 카드 1장 뽑기'},
  bear: {e:'🐻',n:'곰',a:'버티기',d:'(늘) 내 유닛이 수비할 때 힘 +1'},
  tiger:{e:'🐯',n:'호랑이',a:'포효',c:1,d:'(1✨, 턴에 한 번) 기지의 지친 유닛 하나를 깨우기'},
  wolf: {e:'🐺',n:'늑대',a:'무리 사냥',d:'(늘) 한 전장에 내 유닛이 2마리 이상이면 거기 유닛 모두 힘 +1'},
  rabbit:{e:'🐰',n:'토끼',a:'깡충',c:0,free:1,d:'(턴에 한 번, 공짜) 전장의 내 유닛 하나를 다른 전장으로 옮기기'},
  owl:  {e:'🦉',n:'부엉이',a:'지혜',d:'(늘) 내 턴 시작에 손패가 4장 이하면 1장 더 뽑기'},
};
const LK=Object.keys(L);
/* 전장 — 판마다 6곳 중 3곳 */
const B={
  cave: {e:'📦',n:'보물 동굴',d:'정복하면 카드 1장'},
  spring:{e:'⛲',n:'기운의 샘',d:'지키는 동안 내 턴 기운 +1'},
  tower:{e:'🗼',n:'망루',d:'여기서 수비하면 힘 +1'},
  arena:{e:'🏟️',n:'함성 경기장',d:'정복하면 1점 더'},
  bridge:{e:'🌉',n:'갈림길 다리',d:'여기 유닛은 다른 전장으로 바로 이동'},
  forest:{e:'🌲',n:'깊은 숲',d:'여기 유닛은 기술 카드에 안 맞음'},
};
const BK=Object.keys(B);

function init(starter){
  const off=U.shuffle(LK.slice()), bfs=U.shuffle(BK.slice()).slice(0,3);
  const s={ph:'pick', offer:[off.slice(0,3),off.slice(3,6)], ld:[null,null], turn:null, starter:starter|0, first:true,
    pts:[0,0], en:[0,0], mx:[1,1], hand:[[],[]], deck:[U.shuffle(DECK.slice()),U.shuffle(DECK.slice())],
    units:[], nu:1, bf:bfs.map(k=>({k,ctl:null})), abil:[false,false], shout:[0,0], tn:0,
    log:[], fight:null, notice:'🏰 대표 동물을 골라요 — 셋 중 하나', winner:null, n:0};
  for(let p=0;p<2;p++) for(let k=0;k<(p===s.starter?4:5);k++) s.hand[p].push(s.deck[p].pop());
  // 첫 손패에 2기운 이하 유닛이 하나도 없으면 가장 비싼 카드와 바꿔 줌 (첫 턴부터 할 게 있게)
  for(let p=0;p<2;p++) if(!s.hand[p].some(k=>C[k].t==='u'&&C[k].c<=2)){ const di=s.deck[p].findIndex(k=>C[k].t==='u'&&C[k].c<=2); if(di>=0){ let hi=0; s.hand[p].forEach((k,i)=>{ if(C[k].c>C[s.hand[p][hi]].c) hi=i; }); const t=s.hand[p][hi]; s.hand[p][hi]=s.deck[p][di]; s.deck[p][di]=t; U.shuffle(s.deck[p]); } }
  return s;
}
const cost=(s,p,k)=>C[k].c;
const at=(s,loc,p)=>s.units.filter(u=>u.at===loc&&(p==null||u.o===p));
const kw=(u,k)=>C[u.c].kw.includes(k);
/* 힘 — 전투에서는 피해를 버티는 체력이기도 함 */
function pw(s,u,def){
  let v=C[u.c].pw+(u.buf||0)+(u.tb||0)+(s.turn===u.o?s.shout[u.o]:0);
  if(def){ if(kw(u,'d1')) v+=1; if(kw(u,'d2')) v+=2; if(s.ld[u.o]==='bear') v+=1; if(typeof u.at==='number'&&s.bf[u.at].k==='tower') v+=1; }
  if(s.ld[u.o]==='wolf'&&typeof u.at==='number'&&at(s,u.at,u.o).length>=2) v+=1;
  return v;
}
function log(s,p,t){ s.log.push({p,t,tn:s.tn}); if(s.log.length>40) s.log.shift(); }
function draw(s,p,n){ let k=0; for(let i=0;i<n;i++){ if(!s.deck[p].length) break; s.hand[p].push(s.deck[p].pop()); k++; } return k; }
function score(s,p,n,why){ s.pts[p]+=n; if(s.pts[p]>=GOAL&&s.winner==null){ s.pts[p]=Math.max(s.pts[p],GOAL); s.winner=p; s.turn=null; s.notice=`🏆 {${p}} ${GOAL}점 — 승리!`; log(s,p,`🏆 ${GOAL}점 달성`); } }
function fixCtl(s){ s.bf.forEach((b,i)=>{ if(b.ctl!=null&&!at(s,i,b.ctl).length) b.ctl=null; }); }
function conquer(s,p,i){
  const b=s.bf[i]; b.ctl=p; let n=1, ex='';
  if(b.k==='arena'){ n=2; ex=' (경기장 +1)'; }
  if(b.k==='cave'){ const d=draw(s,p,1); if(d) ex=' · 📦 카드 1장'; }
  log(s,p,`🚩 ${B[b.k].e}${B[b.k].n} 정복 +${n}점${ex}`);
  s.notice=`🚩 {${p}} ${B[b.k].e} ${B[b.k].n} 정복! +${n}점`;
  score(s,p,n);
}
/* 약한 유닛부터 쓰러뜨림 — 피해가 그 유닛 힘 이상일 때만 */
function hits(list,dmg){ const dead=new Set(); for(const x of list.slice().sort((a,b)=>a.hp-b.hp)){ if(dmg>=x.hp){ dmg-=x.hp; dead.add(x.u.uid); } else break; } return dead; }
function fightCalc(s,i,p){
  const A=at(s,i,p).map(u=>({u,hp:pw(s,u,false)})), D=at(s,i,1-p).map(u=>({u,hp:pw(s,u,true)}));
  const dA=A.reduce((t,x)=>t+x.hp,0), dD=D.reduce((t,x)=>t+x.hp,0);
  const kD=hits(D,dA), kA=hits(A,dD);
  return {A,D,dA,dD,kA,kD,aLeft:A.length-kA.size,dLeft:D.length-kD.size};
}
function fight(s,i,p){
  const r=fightCalc(s,i,p), b=s.bf[i];
  s.fight={bf:i,p,tn:s.tn,A:r.A.map(x=>({c:x.u.c,hp:x.hp,dead:r.kA.has(x.u.uid)})),D:r.D.map(x=>({c:x.u.c,hp:x.hp,dead:r.kD.has(x.u.uid)})),dA:r.dA,dD:r.dD};
  s.units=s.units.filter(u=>!r.kA.has(u.uid)&&!r.kD.has(u.uid));
  const nm=`${B[b.k].e}${B[b.k].n}`;
  if(r.aLeft&&!r.dLeft){ s.fight.res='win'; log(s,p,`⚔️ ${nm} 전투 승리 (${r.dA} 대 ${r.dD}) — 적 ${r.kD.size}마리 쓰러짐`); conquer(s,p,i); s.notice=`⚔️ {${p}} ${nm} 전투 승리 (${r.dA} 대 ${r.dD}) — 정복!`; }
  else if(r.dLeft){ s.fight.res='hold'; for(const u of at(s,i,p)){ u.at='b'; u.rdy=false; }
    log(s,p,`⚔️ ${nm} 공격 실패 (${r.dA} 대 ${r.dD})${r.kD.size?` · 적 ${r.kD.size}마리는 쓰러뜨림`:''}${r.aLeft?' — 남은 유닛 기지로 후퇴':''}`);
    s.notice=`🛡️ ${nm} — {${1-p}} 막아냄! (${r.dA} 대 ${r.dD})`; }
  else { s.fight.res='both'; log(s,p,`💥 ${nm} 맞부딪쳐 양쪽 다 쓰러짐 (${r.dA} 대 ${r.dD})`); s.notice=`💥 ${nm} — 양쪽 다 쓰러짐! (${r.dA} 대 ${r.dD})`; }
  fixCtl(s);
}
/* 유닛이 전장에 들어온 뒤: 적이 있으면 전투, 없으면 정복 */
function arrive(s,p,i){ if(at(s,i,1-p).length) fight(s,i,p); else if(s.bf[i].ctl!==p) conquer(s,p,i); }
function beginTurn(s,p){
  s.turn=p; s.tn++; s.abil[p]=false;
  if(s.tn>TURN_CAP){ endByCap(s); return; }
  s.mx[p]=Math.min(MAXEN,s.mx[p]+1); s.en[p]=s.mx[p]+s.bf.filter(b=>b.k==='spring'&&b.ctl===p).length+(s.tn===2?2:0);
  for(const u of s.units) if(u.o===p){ u.rdy=true; u.tb=0; }
  const held=s.bf.filter(b=>b.ctl===p);
  if(!s.first){ const d=draw(s,p,1); if(!d) log(s,p,'📭 덱이 비어 카드를 못 뽑음'); }
  if(s.ld[p]==='owl'&&s.hand[p].length<=4&&draw(s,p,1)) log(s,p,'🦉 지혜 — 카드 1장 더');
  s.first=false;
  if(held.length){ log(s,p,`🏰 지킨 전장 ${held.map(b=>B[b.k].e).join('')} +${held.length}점`); s.notice=`🏰 {${p}} 차례 — 지킨 전장 ${held.length}곳 +${held.length}점`; score(s,p,held.length); }
  else s.notice=`🎙️ {${p}} 차례 — ✨ 기운 ${s.en[p]}`;
}
function endByCap(s){ s.turn=null; const [a,b]=s.pts;
  const c0=s.bf.filter(x=>x.ctl===0).length, c1=s.bf.filter(x=>x.ctl===1).length;
  s.winner = a!==b ? (a>b?0:1) : c0!==c1 ? (c0>c1?0:1) : 'draw';
  s.notice=s.winner==='draw'?'⏱️ 시간 끝 — 무승부!':`⏱️ 시간 끝 — {${s.winner}} 점수 승리!`; }
function endTurn(s,p){ s.shout[p]=0; for(const u of s.units) if(u.o===p) u.tb=0; log(s,p,'⏭️ 턴 끝'); beginTurn(s,1-p); }

/* 카드·기술 표적 */
const inForest=(s,u)=>typeof u.at==='number'&&s.bf[u.at].k==='forest';
function canTarget(s,p,k,u){
  const t=C[k].tg; if(!u) return false;
  if(t==='mine') return u.o===p;
  if(u.o===p||inForest(s,u)) return false;
  if(t==='foe') return C[u.c].pw+(u.buf||0)<=3;
  if(t==='foeBf') return typeof u.at==='number';
  return false;
}
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(!a) return '알 수 없는 동작';
  if(s.ph==='pick'){
    if(a.k!=='pick') return '대표 동물을 먼저 골라요';
    if(s.ld[p]!=null) return '이미 골랐어요';
    if(!s.offer[p].includes(a.l)) return '고를 수 없는 동물이에요';
    s.ld[p]=a.l; s.n++;
    if(s.ld[0]&&s.ld[1]){ s.ph='play'; log(s,0,`대표 동물 ${L[s.ld[0]].e}${L[s.ld[0]].n}`); log(s,1,`대표 동물 ${L[s.ld[1]].e}${L[s.ld[1]].n}`); beginTurn(s,s.starter); }
    return null;
  }
  if(s.turn!==p) return '상대 차례예요';
  s.fight=a.k==='move'||a.k==='abil'?null:s.fight;
  if(a.k==='end'){ s.n++; endTurn(s,p); return null; }
  if(a.k==='play'){
    const hi=a.h|0, k=s.hand[p][hi]; if(!k) return '카드를 고르세요';
    const cc=cost(s,p,k); if(cc>s.en[p]) return `기운이 모자라요 (✨${cc} 필요)`;
    const cd=C[k];
    if(cd.t==='u'){ s.en[p]-=cc; s.hand[p].splice(hi,1); const u={uid:s.nu++,c:k,o:p,at:'b',rdy:cd.kw.includes('rush'),buf:0,tb:0}; s.units.push(u);
      let ex=''; if(cd.kw.includes('draw')){ if(draw(s,p,1)) ex=' · 카드 1장'; }
      log(s,p,`${cd.e} ${cd.n} 냄 (✨${cc})${ex}`); s.notice=`🃏 {${p}} ${cd.e} ${cd.n} 등장!`; s.n++; return null; }
    let tgt=null;
    if(cd.tg){ tgt=s.units.find(u=>u.uid===(a.u|0)); if(!canTarget(s,p,k,tgt)) return cd.tg==='foe'?'힘 3 이하 적 유닛을 골라요 (숲 속은 안 돼요)':cd.tg==='foeBf'?'전장에 있는 적 유닛을 골라요 (숲 속은 안 돼요)':'내 유닛을 골라요'; }
    s.en[p]-=cc; s.hand[p].splice(hi,1); s.n++;
    if(k==='bolt'){ s.units=s.units.filter(u=>u!==tgt); log(s,p,`⚡ 번개 — ${C[tgt.c].e}${C[tgt.c].n} 쓰러뜨림`); s.notice=`⚡ {${p}} 번개! ${C[tgt.c].e} ${C[tgt.c].n} 쓰러짐`; fixCtl(s); }
    else if(k==='whirl'){ const from=s.bf[tgt.at]; tgt.at='b'; tgt.rdy=false; log(s,p,`🌀 회오리 — ${C[tgt.c].e}${C[tgt.c].n}을(를) ${B[from.k].e}에서 날려 보냄`); s.notice=`🌀 {${p}} 회오리! ${C[tgt.c].e} ${C[tgt.c].n}이(가) 기지로 날아감`; fixCtl(s); }
    else if(k==='meat'){ tgt.buf=(tgt.buf||0)+1; log(s,p,`🍖 ${C[tgt.c].e}${C[tgt.c].n} 힘 +1`); s.notice=`🍖 {${p}} ${C[tgt.c].e} ${C[tgt.c].n} 힘 +1`; }
    else if(k==='shout'){ s.shout[p]++; log(s,p,'📯 함성 — 이번 턴 모두 힘 +1'); s.notice=`📯 {${p}} 함성! 이번 턴 모두 힘 +1`; }
    else if(k==='call'){ const d=draw(s,p,2); log(s,p,`📜 지원 요청 — ${d}장 뽑음`); s.notice=`📜 {${p}} 지원 요청 — 카드 ${d}장`; }
    return null;
  }
  if(a.k==='move'){
    const ids=Array.isArray(a.u)?a.u.map(x=>x|0):[], to=a.to==='b'?'b':(a.to|0);
    if(!ids.length) return '움직일 유닛을 골라요';
    if(to!=='b'&&!(to>=0&&to<3)) return '어디로 갈지 골라요';
    const us=ids.map(id=>s.units.find(u=>u.uid===id));
    for(const u of us){ if(!u||u.o!==p) return '내 유닛만 움직일 수 있어요'; if(!u.rdy) return `${C[u.c].n}은(는) 지쳐 있어요 (다음 턴에 움직여요)`; if(u.at===to) return '이미 거기 있어요';
      if(to!=='b'&&u.at!=='b'&&!kw(u,'fly')&&s.bf[u.at].k!=='bridge') return `${C[u.c].n}은(는) 전장에서 다른 전장으로 바로 못 가요 (기지로 먼저)`; }
    for(const u of us){ u.at=to; u.rdy=false; }
    s.n++;
    const names=us.map(u=>C[u.c].e).join('');
    if(to==='b'){ log(s,p,`↩️ ${names} 기지로`); fixCtl(s); s.notice=`↩️ {${p}} ${names} 기지로 물러남`; return null; }
    log(s,p,`➡️ ${names} → ${B[s.bf[to].k].e}${B[s.bf[to].k].n}`); s.notice=`➡️ {${p}} ${names} → ${B[s.bf[to].k].e} ${B[s.bf[to].k].n}`;
    fixCtl(s); arrive(s,p,to); return null;
  }
  if(a.k==='abil'){
    const l=s.ld[p], li=L[l]; if(!li.c&&!li.free) return '이 동물은 늘 켜져 있는 능력이에요';
    if(s.abil[p]) return '이번 턴엔 이미 썼어요';
    if(s.en[p]<li.c) return `기운이 모자라요 (✨${li.c} 필요)`;
    if(l==='fox'){ if(!s.deck[p].length) return '덱이 비었어요'; s.en[p]-=li.c; s.abil[p]=true; draw(s,p,1); log(s,p,'🦊 잔꾀 — 카드 1장'); s.notice=`🦊 {${p}} 잔꾀 — 카드 1장`; s.n++; return null; }
    const u=s.units.find(x=>x.uid===(a.u|0)); if(!u||u.o!==p) return '내 유닛을 골라요';
    if(l==='tiger'){ if(u.at!=='b'||u.rdy) return '기지에서 지쳐 있는 유닛을 골라요'; s.en[p]-=li.c; s.abil[p]=true; u.rdy=true; log(s,p,`🐯 포효 — ${C[u.c].e} 깨어남`); s.notice=`🐯 {${p}} 포효! ${C[u.c].e} ${C[u.c].n} 깨어남`; s.n++; return null; }
    if(l==='rabbit'){ const to=a.to|0; if(typeof u.at!=='number') return '전장에 있는 내 유닛을 골라요'; if(!(to>=0&&to<3)||to===u.at) return '옮길 다른 전장을 골라요';
      s.en[p]-=li.c; s.abil[p]=true; const from=u.at; u.at=to; u.rdy=false; s.n++; log(s,p,`🐰 깡충 — ${C[u.c].e} ${B[s.bf[from].k].e}→${B[s.bf[to].k].e}`); s.notice=`🐰 {${p}} 깡충! ${C[u.c].e} → ${B[s.bf[to].k].e} ${B[s.bf[to].k].n}`; fixCtl(s); arrive(s,p,to); return null; }
    return '알 수 없는 능력';
  }
  return '알 수 없는 동작';
}
function mask(s,me){ const v=U.clone(s), o=1-me;
  v.hand[o]=v.hand[o].map(()=>'?'); v.deck=[v.deck[0].map(()=>'?'),v.deck[1].map(()=>'?')];
  if(v.ph==='pick'){ if(v.ld[o]!=null) v.ld[o]='?'; v.offer[o]=[]; }
  return v; }

/* ───────── 컴퓨터: 자기 손패 + 판 위(공개)만 보고 한 번에 한 동작 ───────── */
const val=u=>C[u.c].pw+(u.buf||0)+(C[u.c].kw.length?.5:0);
function simFight(s,i,p,extra){   // extra 유닛을 i에 넣었다고 치고 전투 결과
  const t={...s, units:s.units.map(u=>({...u}))}; for(const id of extra){ const u=t.units.find(x=>x.uid===id); u.at=i; }
  const r=fightCalc(t,i,p); let lost=0, kill=0; for(const x of r.A) if(r.kA.has(x.u.uid)) lost+=val(x.u); for(const x of r.D) if(r.kD.has(x.u.uid)) kill+=val(x.u);
  return {...r,lost,kill};
}
function ptsFor(s,i){ return s.bf[i].k==='arena'?2:1; }
function threat(s,p){ return at(s,'b',1-p).reduce((t,u)=>t+pw(s,u,false),0); }   // 다음 턴 상대 기지에서 덮칠 수 있는 힘(대략)
let saidN=-1;
function say(v,list,pr){ if(typeof showSay==='function'&&saidN!==v.n&&Math.random()<pr){ saidN=v.n; setTimeout(()=>showSay(1,U.pick(list),2600),300); } }
function bestAttack(v,p,lvl){
  const ready=v.units.filter(u=>u.o===p&&u.rdy);
  let best=null;
  for(let i=0;i<3;i++){
    const cand=ready.filter(u=>u.at!==i&&(u.at==='b'||kw(u,'fly')||v.bf[u.at].k==='bridge'));
    if(!cand.length) continue;
    const foes=at(v,i,1-p);
    if(!foes.length){
      if(v.bf[i].ctl===p) continue;
      // 빈 전장: 제일 약한 유닛 하나로 정복 (지킬 힘이 되면 더 좋게)
      const u=cand.slice().sort((a,b)=>val(a)-val(b))[0];
      const keep=pw(v,u,true)+at(v,i,p).reduce((t,x)=>t+pw(v,x,true),0), th=threat(v,p);
      const sc=ptsFor(v,i)*3+(keep>=th?2:0)-val(u)*.15+(v.bf[i].k==='spring'?.6:0);
      if(!best||sc>best.sc) best={sc,ids:[u.uid],to:i};
      continue;
    }
    // 적이 있는 전장: 힘 센 순으로 하나씩 더해 보며 이기는 가장 작은 묶음
    const ord=cand.slice().sort((a,b)=>pw(v,b,false)-pw(v,a,false)); const pick=[];
    for(const u of ord){ pick.push(u.uid); const r=simFight(v,i,p,pick);
      if(r.aLeft&&!r.dLeft){ const sc=ptsFor(v,i)*3+r.kill-r.lost+(v.bf[i].ctl===1-p?2:0); if(!best||sc>best.sc) best={sc,ids:pick.slice(),to:i}; break; }
    }
    // 이기진 못해도 상대가 지키는 전장을 맞바꿔 끊기 (어려움)
    if(lvl>=2&&v.bf[i].ctl===1-p){ const r=simFight(v,i,p,ord.map(u=>u.uid)); if(!r.dLeft&&!r.aLeft){ const sc=1.5+r.kill-r.lost; if(sc>0&&(!best||sc>best.sc)) best={sc,ids:ord.map(u=>u.uid),to:i}; } }
  }
  return best;
}
function ai(v,lvl=1){
  const p=v.ph==='pick'?[1,0].find(q=>v.ld[q]==null&&v.offer[q].length):v.turn; if(p==null) return null;
  if(v.winner!=null) return null;
  if(v.ph==='pick'){ if(v.ld[p]!=null||!v.offer[p].length) return null;
    const pref=['wolf','tiger','owl','bear','rabbit','fox']; const o=v.offer[p].slice().sort((a,b)=>pref.indexOf(a)-pref.indexOf(b));
    return {k:'pick',l:lvl===0?U.pick(v.offer[p]):o[0]}; }
  if(v.turn!==p) return null;
  const en=v.en[p], hand=v.hand[p], me=p, o=1-p, sloppy=lvl===0&&Math.random()<.3;
  const H=k=>hand.indexOf(k);
  const ok=k=>H(k)>=0&&cost(v,p,k)<=en;
  if(v.ld[p]==='fox'&&!v.abil[p]&&v.deck[p].length) return {k:'abil'};   // 공짜 1장은 먼저
  // 1) 번개·회오리로 길 열기 — 상대가 지키는 전장의 수비를 없애면 바로 정복할 수 있을 때 우선
  if(ok('bolt')){ const ts=v.units.filter(u=>canTarget(v,p,'bolt',u)).sort((a,b)=>{ const ka=typeof a.at==='number'&&v.bf[a.at].ctl===o?3:0, kb=typeof b.at==='number'&&v.bf[b.at].ctl===o?3:0; return (kb+val(b))-(ka+val(a)); });
    if(ts.length&&(val(ts[0])>=2.5||(typeof ts[0].at==='number'&&at(v,ts[0].at,o).length===1))) return {k:'play',h:H('bolt'),u:ts[0].uid}; }
  if(ok('whirl')){ const ts=v.units.filter(u=>canTarget(v,p,'whirl',u)&&v.bf[u.at].ctl===o).sort((a,b)=>val(b)-val(a));
    if(ts.length&&at(v,ts[0].at,o).length===1&&v.units.some(u=>u.o===p&&u.rdy)) return {k:'play',h:H('whirl'),u:ts[0].uid}; }
  // 2) 유닛 내기 — 비싼 것부터 (돌격 유닛은 바로 싸울 수 있어 우선)
  const units=hand.map((k,i)=>({k,i})).filter(x=>C[x.k].t==='u'&&cost(v,p,x.k)<=en).sort((a,b)=>(cost(v,p,b.k)+(C[b.k].kw.includes('rush')?.5:0))-(cost(v,p,a.k)+(C[a.k].kw.includes('rush')?.5:0)));
  if(units.length&&!sloppy) return {k:'play',h:units[0].i};
  // 3) 호랑이: 기지의 지친 큰 유닛 깨우기
  if(v.ld[p]==='tiger'&&!v.abil[p]&&en>=1){ const u=at(v,'b',p).filter(u=>!u.rdy).sort((a,b)=>val(b)-val(a))[0]; if(u&&val(u)>=3) return {k:'abil',u:u.uid}; }
  // 4) 공격·정복
  const atk=bestAttack(v,p,lvl);
  if(atk&&atk.sc>0&&!(lvl===0&&Math.random()<.25)){
    if(atk.to!=null&&at(v,atk.to,o).length&&ok('shout')&&v.shout[p]===0){ /* 함성은 아슬아슬할 때만 */ }
    const foes=at(v,atk.to,o).length;
    if(foes) say(v,['간다! ⚔️','여기는 내가 가져갈게요','한번 붙어 봐요'],.35); else say(v,['빈집이네요 🚩','여기 제 거예요~'],.25);
    return {k:'move',u:atk.ids,to:atk.to};
  }
  // 아슬아슬하게 못 이기는 공격이면 함성 먼저
  if(ok('shout')&&v.shout[p]===0){ const ready=v.units.filter(u=>u.o===p&&u.rdy&&u.at==='b');
    for(let i=0;i<3&&ready.length;i++){ if(!at(v,i,o).length) continue; const t={...v,shout:[...v.shout]}; t.shout[p]=1; const r=simFight(t,i,p,ready.map(u=>u.uid)); if(r.aLeft&&!r.dLeft) return {k:'play',h:H('shout')}; } }
  // 토끼: 전장의 유닛을 빈 전장/약한 전장으로
  if(v.ld[p]==='rabbit'&&!v.abil[p]){ for(const u of v.units.filter(u=>u.o===p&&typeof u.at==='number').sort((a,b)=>at(v,b.at,p).length-at(v,a.at,p).length)){ const alone=at(v,u.at,p).length===1; for(let i=0;i<3;i++){ if(i===u.at||v.bf[i].ctl===p||(alone&&ptsFor(v,i)<2&&v.bf[u.at].ctl===p&&!at(v,i,o).length)) continue; const r=at(v,i,o).length?simFight(v,i,p,[u.uid]):{aLeft:1,dLeft:0}; if(r.aLeft&&!r.dLeft) return {k:'abil',u:u.uid,to:i}; } } }
  // 5) 남은 유닛으로 지키는 전장 보강 (상대 기지 힘이 더 세면)
  if(lvl>=1){ const ready=at(v,'b',p).filter(u=>u.rdy);
    if(ready.length){ const mine=[0,1,2].filter(i=>v.bf[i].ctl===p).map(i=>({i,def:at(v,i,p).reduce((t,u)=>t+pw(v,u,true),0)})).sort((a,b)=>a.def-b.def);
      const th=threat(v,p)+(v.hand[o].length>=2?2:0);
      if(mine.length&&mine[0].def<th) return {k:'move',u:[ready.sort((a,b)=>val(b)-val(a))[0].uid],to:mine[0].i}; } }
  // 6) 남은 기운: 먹이·지원 요청·여우
  if(ok('meat')){ const u=v.units.filter(u=>u.o===p&&typeof u.at==='number').sort((a,b)=>val(b)-val(a))[0]||v.units.filter(u=>u.o===p)[0]; if(u) return {k:'play',h:H('meat'),u:u.uid}; }
  if(ok('call')&&v.deck[p].length) return {k:'play',h:H('call')};
  if(units.length) return {k:'play',h:units[0].i};
  return {k:'end'};
}

/* ───────── 화면 ───────── */
let selU=new Set(), selH=null, abilOn=false, lastN=-1;
const nmB=k=>`${B[k].e} ${B[k].n}`;
function uHTML(s,u,me,opt){
  const def=typeof u.at==='number'&&u.o!==s.turn; const v=pw(s,u,def), base=C[u.c].pw;
  const cls=['sj-u',u.o===me?'m':'o',u.rdy?'rdy':'tired',selU.has(u.uid)?'sel':'',opt&&opt.tg?'tg':'',v>base?'up':''].join(' ');
  return `<button class="${cls}" data-u="${u.uid}" title="${C[u.c].n}${C[u.c].d?' · '+C[u.c].d:''}${u.buf?` · 먹이 +${u.buf}`:''}"><span class="e">${C[u.c].e}</span><b>${v}</b></button>`;
}
function cardHTML(s,p,k,i,can,on){ const cd=C[k], cc=cost(s,p,k);
  return `<button class="sj-c ${cd.t==='u'?'unit':'spell'} ${can?'can':''} ${on?'on':''}" data-h="${i}"><span class="cost">${cc}</span><span class="e">${cd.e}</span><b>${cd.n}</b>${cd.t==='u'?`<span class="pw">💪${cd.pw}</span>`:''}<small>${cd.d||'&nbsp;'}</small></button>`; }
function render(el,v,ctx){
  const me=ctx.me, o=1-me, who=p=>p===me&&ctx.mode!=='local'?'나':U.esc(ctx.name(p));
  if(v.n!==lastN){ lastN=v.n; selU=new Set(); selH=null; abilOn=false; }
  const fill=t=>String(t).replace(/\{(\d)\}/g,(_,d)=>who(+d));
  let h=`<div class="hl-notice">${fill(U.esc(v.notice||''))}</div><div class="sj">`;
  if(v.ph==='pick'){
    const mine=v.ld[me];
    h+=`<div class="sj-pick"><h4>${mine?`${L[mine].e} ${L[mine].n}을(를) 골랐어요 — 상대를 기다리는 중…`:'대표 동물을 하나 골라요'}</h4><div class="sj-ldrow">${(v.offer[me]||[]).map(l=>`<button class="sj-ld ${mine===l?'on':''}" data-pick="${l}" ${mine?'disabled':''}><span class="e">${L[l].e}</span><b>${L[l].n} · 「${L[l].a}」</b><small>${L[l].d}</small></button>`).join('')}</div>
      <div class="sj-bfrow">${v.bf.map(b=>`<div class="sj-bfmini"><b>${nmB(b.k)}</b><small>${B[b.k].d}</small></div>`).join('')}</div></div></div>`;
    el.innerHTML=h; el.onclick=e=>{ const b=e.target.closest('[data-pick]'); if(b&&!v.ld[me]) ctx.act({k:'pick',l:b.dataset.pick}); }; return;
  }
  const myTurn=ctx.myTurn&&v.winner==null;
  const selK=selH!=null?v.hand[me][selH]:null, tgMode=selK&&C[selK].tg;
  const abilU=abilOn&&(v.ld[me]==='tiger'||v.ld[me]==='rabbit');
  const isTg=u=>tgMode?canTarget(v,me,selK,u):abilU&&v.ld[me]==='tiger'?(u.o===me&&u.at==='b'&&!u.rdy):abilU&&v.ld[me]==='rabbit'?(u.o===me&&typeof u.at==='number'&&!selU.size):false;
  const side=(p)=>{ const l=v.ld[p]; return `<div class="sj-side ${p===me?'me':'op'} ${v.turn===p?'turn':''}"><span class="ld" title="${l&&L[l]?L[l].d:''}">${l&&L[l]?L[l].e:'❔'}</span><span class="nm">${who(p)}<small>${l&&L[l]?` · 「${L[l].a}」`:''}</small></span><span class="pts"><b>${v.pts[p]}</b>/${GOAL}점</span><span class="en">✨${v.turn===p?`${v.en[p]}/`:''}${v.mx[p]}</span><span class="hc">🂠${v.hand[p].length}</span><span class="dk">덱 ${v.deck[p].length}</span></div>`; };
  const track=p=>`<span class="sj-track ${p===me?'me':'op'}">${[...Array(GOAL)].map((_,k)=>`<i class="${k<v.pts[p]?'on':''}"></i>`).join('')}</span>`;
  h+=side(o)+track(o);
  h+=`<div class="sj-base op">${at(v,'b',o).map(u=>uHTML(v,u,me,{tg:isTg(u)})).join('')||'<small class="muted">기지 비었음</small>'}</div>`;
  const F=v.fight&&v.fight.tn===v.tn?v.fight:null;
  h+=`<div class="sj-bfs">`+v.bf.map((b,i)=>{ const canGo=myTurn&&selU.size&&[...selU].every(id=>{ const u=v.units.find(x=>x.uid===id); return u&&u.at!==i&&(u.at==='b'||kw(u,'fly')||v.bf[u.at].k==='bridge'); });
      const rab=abilU&&v.ld[me]==='rabbit'&&selU.size===1&&[...selU].every(id=>{ const u=v.units.find(x=>x.uid===id); return u&&u.at!==i; });
      const ctl=b.ctl==null?'':b.ctl===me?'mine':'theirs';
      return `<div class="sj-bf ${ctl} ${canGo||rab?'go':''} ${F&&F.bf===i?'hit':''}" data-bf="${i}"><div class="hd"><b>${nmB(b.k)}</b><small>${B[b.k].d}</small><span class="flag">${b.ctl==null?'⚪ 비었음':b.ctl===me?'🟦 내 땅':'🟥 상대 땅'}</span></div>
        <div class="row op">${at(v,i,o).map(u=>uHTML(v,u,me,{tg:isTg(u)})).join('')}</div><div class="mid">${canGo||rab?'👆 여기로':''}</div><div class="row m">${at(v,i,me).map(u=>uHTML(v,u,me,{tg:isTg(u)})).join('')}</div></div>`; }).join('')+`</div>`;
  if(F){ const sideT=(arr)=>arr.map(x=>`<span class="${x.dead?'dead':''}">${C[x.c].e}${x.hp}</span>`).join(' ')||'—';
    h+=`<div class="sj-fight"><b>⚔️ ${nmB(v.bf[F.bf].k)} 전투</b> ${who(F.p)} ${sideT(F.A)} <em>${F.dA}</em> vs <em>${F.dD}</em> ${sideT(F.D)} ${who(1-F.p)} → ${F.res==='win'?`🚩 ${who(F.p)} 정복`:F.res==='hold'?`🛡️ ${who(1-F.p)} 막음`:'💥 둘 다 쓰러짐'}</div>`; }
  h+=`<div class="sj-base me ${myTurn&&selU.size&&[...selU].some(id=>{ const u=v.units.find(x=>x.uid===id); return u&&u.at!=='b'; })?'go':''}" data-bf="b"><small class="lbl">🏠 내 기지</small>${at(v,'b',me).map(u=>uHTML(v,u,me,{tg:isTg(u)})).join('')||'<small class="muted">유닛을 내면 여기로 와요</small>'}</div>`;
  h+=track(me)+side(me);
  // 손패
  h+=`<div class="sj-hand">${v.hand[me].map((k,i)=>cardHTML(v,me,k,i,myTurn&&cost(v,me,k)<=v.en[me],selH===i)).join('')||'<small class="muted">손에 카드가 없어요</small>'}</div>`;
  // 버튼줄
  const l=v.ld[me], li=L[l];
  let hint='';
  if(myTurn){ if(tgMode) hint=`${C[selK].e} ${C[selK].n}: 표적을 눌러요 — ${C[selK].d}`; else if(abilU) hint=l==='tiger'?'🐯 기지에서 지친 유닛을 눌러요':selU.size?'🐰 옮길 전장을 눌러요':'🐰 전장에 있는 내 유닛을 눌러요'; else if(selU.size) hint=`유닛 ${selU.size}마리 골랐어요 → 갈 전장(또는 내 기지)을 눌러요 · 같이 보내면 힘을 합쳐요`; else hint='카드를 눌러 내기 · 내 유닛(밝은 것)을 눌러 고른 뒤 전장으로'; }
  h+=`<div class="sj-act">${myTurn?`<small>${hint}</small>`:''}<div class="btns">${li&&(li.c||li.free)?`<button class="small ${abilOn?'':'ghost'}" data-abil ${!myTurn||v.abil[me]||v.en[me]<li.c?'disabled':''}>${li.e} ${li.a}${li.c?` (✨${li.c})`:' (공짜)'}</button>`:''}${(selU.size||selH!=null||abilOn)&&myTurn?'<button class="small ghost" data-cancel>취소</button>':''}${myTurn?'<button class="small" data-end>턴 끝 ⏭️</button>':''}</div></div>`;
  // 기록
  const LG=v.log.slice(-8).reverse();
  h+=`<details class="sj-log" ${innerWidth>=700?'open':''}><summary>📜 진행 기록</summary>${LG.map(x=>`<div class="${x.p===me?'me':'op'}"><span>${x.p===me?'🟦':'🟥'}</span> ${who(x.p)} ${U.esc(x.t)}</div>`).join('')}</details>`;
  el.innerHTML=h+'</div>';
  el.onclick=e=>{
    if(!myTurn) return;
    if(e.target.closest('[data-end]')){ if(v.hand[me].some(k=>C[k].t==='u'&&cost(v,me,k)<=v.en[me])&&!el.__warned){ el.__warned=true; ctx.tip('아직 낼 수 있는 유닛이 있어요 — 그래도 끝내려면 한 번 더'); return; } el.__warned=false; ctx.act({k:'end'}); return; }
    if(e.target.closest('[data-cancel]')){ selU=new Set(); selH=null; abilOn=false; ctx.rerender(); return; }
    if(e.target.closest('[data-abil]')){ if(!li||!(li.c||li.free)) return; if(l==='fox'){ ctx.act({k:'abil'}); return; } abilOn=!abilOn; selU=new Set(); selH=null; ctx.rerender(); return; }
    const cb=e.target.closest('[data-h]');
    if(cb){ const i=+cb.dataset.h, k=v.hand[me][i]; abilOn=false; selU=new Set();
      if(C[k].tg){ selH=selH===i?null:i; ctx.rerender(); return; }
      ctx.act({k:'play',h:i}); return; }
    const ub=e.target.closest('[data-u]');
    if(ub){ const u=v.units.find(x=>x.uid===+ub.dataset.u); if(!u) return;
      if(tgMode){ if(canTarget(v,me,selK,u)) ctx.act({k:'play',h:selH,u:u.uid}); else ctx.tip('그 유닛은 표적이 안 돼요'); return; }
      if(abilU&&l==='tiger'){ ctx.act({k:'abil',u:u.uid}); return; }
      if(abilU&&l==='rabbit'){ if(u.o===me&&typeof u.at==='number'){ selU=new Set([u.uid]); ctx.rerender(); } return; }
      if(u.o!==me){ ctx.tip(`${C[u.c].e} ${C[u.c].n} · 힘 ${C[u.c].pw}${u.buf?`+${u.buf}`:''}${C[u.c].d?' · '+C[u.c].d:''}`); return; }
      if(!u.rdy){ ctx.tip(`${C[u.c].n}은(는) 지쳐 있어요 — 다음 내 턴에 움직여요`); return; }
      if(selU.has(u.uid)) selU.delete(u.uid); else selU.add(u.uid); ctx.rerender(); return; }
    const bb=e.target.closest('[data-bf]');
    if(bb&&selU.size){ const to=bb.dataset.bf==='b'?'b':+bb.dataset.bf;
      if(abilU&&l==='rabbit'){ if(to!=='b') ctx.act({k:'abil',u:[...selU][0],to}); return; }
      ctx.act({k:'move',u:[...selU],to}); return; }
  };
}
function status(v,ctx){ if(v.winner!=null) return ''; if(v.ph==='pick') return v.ld[ctx.me]?'상대가 고르는 중…':'대표 동물을 골라요';
  return ctx.myTurn?'카드를 내고, 유닛을 전장으로 보내고, 턴 끝':ctx.turnText(v); }

/* 가이드 장면 */
function demo(s,step){
  s.ph='play'; s.ld=['wolf','tiger']; s.turn=0; s.tn=7; s.mx=[4,4]; s.en=[3,4]; s.pts=[3,4]; s.first=false; s.notice='';
  s.bf=[{k:'tower',ctl:1},{k:'cave',ctl:0},{k:'arena',ctl:null}];
  const mk=(c,o,at,rdy)=>({uid:s.nu++,c,o,at,rdy,buf:0,tb:0});
  s.units=[mk('hog',1,0,false),mk('rat',1,0,false),mk('deer',0,1,false),mk('boar',0,'b',true),mk('rat',0,'b',true),mk('turtle',1,'b',false)];
  s.hand[0]=['eagle','bolt','hog','shout'];
  if(step===2){ s.fight={bf:0,p:0,tn:s.tn,A:[{c:'boar',hp:5,dead:false},{c:'rat',hp:1,dead:true}],D:[{c:'hog',hp:4,dead:true},{c:'rat',hp:2,dead:true}],dA:6,dD:6,res:'win'}; s.bf[0].ctl=0; s.units=s.units.filter(u=>u.o!==1||u.at!==0); s.units.find(u=>u.c==='boar').at=0; s.units.find(u=>u.c==='boar').rdy=false; s.units=s.units.filter(u=>!(u.c==='rat'&&u.o===0)); s.pts=[4,4]; s.notice='⚔️ 나 🗼 망루 전투 승리 (6 대 6) — 정복!'; }
  return s;
}
const guideSteps=[
  {t:'대표 동물', h:'<p>시작하면 <b>대표 동물 셋 중 하나</b>를 골라요. 동물마다 능력이 달라요 — 🐯 지친 유닛 깨우기, 🐺 무리 지으면 힘 +1, 🦉 손패 채우기…</p>', demo:s=>s},
  {t:'기운과 카드', h:'<p>내 턴마다 <b>✨ 기운이 1씩 늘어요</b>(첫 턴 2, 최대 8 · 나중에 시작하는 쪽은 첫 턴 +2). 기운만큼 카드를 내요. <b>유닛</b>은 내 기지로 오고, <b>기술 카드</b>는 바로 효과가 나요. 처음 낸 유닛은 지쳐 있어 다음 턴에 움직여요(⚡돌격은 바로).</p>', demo:s=>demo(s,1)},
  {t:'전장으로', h:'<p>준비된 유닛을 눌러 고르고 → <b>전장</b>을 눌러 보내요. 여러 마리를 같이 보내면 <b>힘을 합쳐</b> 싸워요. 빈 전장에 들어가면 바로 <b>정복 +1점</b>.</p>', demo:s=>{ s=demo(s,1); selU=new Set([s.units.find(u=>u.c==='boar').uid]); lastN=s.n; return s; }},
  {t:'전투', h:'<p>적이 있는 전장에 들어가면 <b>전투</b>! 양쪽 힘 합계만큼 피해를 주고, <b>약한 유닛부터</b> 쓰러져요. 수비하는 쪽은 수비 보너스(🦔+1, 🐢+2, 🗼망루 +1)를 받아요. 공격 쪽만 남으면 정복, 수비 쪽이 남으면 공격 쪽은 기지로 후퇴.</p>', demo:s=>demo(s,2)},
  {t:'점수와 승리', h:'<p>정복할 때 +1점, 그리고 <b>내 턴이 시작될 때 지키고 있는 전장마다 +1점</b>. <b>10점</b>을 먼저 모으면 승리! 전장마다 특별 효과(📦카드, ⛲기운, 🏟️점수 +1…)가 있어요.</p><div class="tipbox">💡 한 곳에 몰면 세게 이기지만, 다른 전장은 상대가 가져가요. 지킬 곳과 칠 곳을 나누는 게 핵심!</div>', demo:s=>demo(s,1)},
];
window.GAMES.threefront={
  title:'세 전장', emoji:'🏰', tags:['카드','전략','덱'],
  tagline:'대표 동물을 고르고, 기운을 모아 유닛을 내고, 가운데 세 전장을 차지해 10점 먼저!',
  guide:'<p>대표 동물을 고르고, 매 턴 늘어나는 기운으로 유닛·기술 카드를 내서 세 전장을 차지하는 1:1 카드 대결. 정복 +1점, 내 턴 시작에 지킨 전장마다 +1점, 10점 먼저 승리.</p>',
  guideSteps, init, apply, mask, ai, render, status,
  pulse:v=>v.pts[1]-v.pts[0], pulseStep:1,
  aiDelay:s=>s.ph==='pick'?1200+Math.random()*1200:700+Math.random()*900+(s.turn===1&&s.en[1]>=4?500:0),
  reset(){ selU=new Set(); selH=null; abilOn=false; lastN=-1; saidN=-1; },
  bar:(v,i)=>`<span class="score">${v.pts[i]}</span><span class="tag">/${GOAL}점${v.ld&&v.ld[i]&&L[v.ld[i]]?' '+L[v.ld[i]].e:''}</span>`,
  _t:{C,L,B,fightCalc,pw,GOAL},
};
})();
