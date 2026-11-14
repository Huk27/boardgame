(function(){
'use strict';
/* 시크릿 넘버 (6인: 우리 둘 + NPC 4명). 각자 1~50 중 서로 다른 비밀 번호를 받음 — 자기 번호도 모름.
   5라운드 동안 차례로 한 명에게 콘택트를 제안: 같은 종류 티켓을 둘이 1장씩 내면 그 둘만 결과를 봄.
     ＋ 합(15 이하·105 이상은 뭉뚱그림) / × 곱의 일의 자리 / ÷ 큰 수를 작은 수로 나눈 몫 / 0 두 번호 사이 10의 배수 개수
   라운드 사이 토론: 누구 번호를 공개 발언(거짓말 가능).
   끝나면 정답지: 내 번호 맞으면 +5 틀리면 −5, 남의 번호 +1/−1(빈칸 0), 전부 맞히면 +5, 내 번호를 맞힌 사람 1명당 −1. */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로, 나머지는 NPC */
const N=6, MAXN=50, ROUNDS=6; let HSEAT=[0,3]; const SEATORD=[0,3,1,4,2,5];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i);
const ALL=[...Array(N).keys()], NUMS=[...Array(MAXN)].map((_,k)=>k+1);
const TK=['+','×','÷','0'], TKN={'+':'＋ 더하기','×':'× 곱하기','÷':'÷ 나누기','0':'0 영(10의 배수)'};
const STYLE={seojin:'logic', doyun:'emo', haram:'calm', yuna:'emo', minho:'sly', taekyung:'emo', jihu:'sly', soyul:'logic'};
const DEF_P={talk:.6,aggr:.5,trust:.5,bluff:.5,logic:.6,temper:.4};
const nm=i=>`{s${i}}`;

function calc(t,x,y){
  if(t==='+'){ const s=x+y; return s<=15?'≤15':s>=105?'≥105':s; }
  if(t==='×') return (x*y)%10;
  if(t==='÷') return Math.floor(Math.max(x,y)/Math.min(x,y));
  if(t==='0'){ const lo=Math.min(x,y), hi=Math.max(x,y); let c=0; for(let k=10;k<=MAXN;k+=10) if(k>lo&&k<hi) c++; return c; }
}
const ok=(f,x,y)=> calc(f.t,x,y)===f.v;
/* 추리기: 내가 아는 사실(나와 상대 쌍)과 믿기로 한 발언으로 후보 계산 */
function solve(facts,me,claims){   // facts: 내가 낀 콘택트 결과들, claims: {seat:number} 믿는 발언
  const by={}; for(const f of facts){ const o=f.a===me?f.b:f.a; (by[o]=by[o]||[]).push(f); }
  const Y=(o,x)=> NUMS.filter(y=>y!==x && (claims[o]==null||claims[o]===y) && by[o].every(f=>ok(f,x,y)));
  let me_ = NUMS.filter(x=>(claims[me]==null||claims[me]===x) && Object.keys(by).every(o=>Y(+o,x).length));
  if(!me_.length) me_ = NUMS.filter(x=>Object.keys(by).every(o=>NUMS.some(y=>y!==x&&by[o].every(f=>ok(f,x,y)))));   // 믿은 말이 틀렸으면 무시
  const cand={}; cand[me]=me_;
  for(const o of ALL){ if(o===me) continue;
    if(by[o]){ const u=new Set(); for(const x of me_) for(const y of Y(o,x)) u.add(y); cand[o]=[...u]; if(!cand[o].length) cand[o]=NUMS.slice(); }
    else cand[o] = claims[o]!=null ? [claims[o]] : null; }
  return cand;
}
function pairsLeft(facts,me,o){   // 지금 나·o 쌍으로 가능한 (x,y)
  const fs=facts.filter(f=>(f.a===me&&f.b===o)||(f.b===me&&f.a===o)), out=[];
  for(const x of NUMS) for(const y of NUMS) if(x!==y && fs.every(f=>ok(f,x,y))) out.push([x,y]);
  return out;
}

function init(starter,o){ const k=Math.max(2,Math.min(6,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  const nums=U.shuffle(NUMS.slice()).slice(0,N);
  const s={nums, tk:ALL.map(()=>({'+':2,'×':2,'÷':2,'0':2})), bought:Array(N).fill(false), pen:Array(N).fill(0),
    facts:[], contacts:[], claims:[], round:1, ord:U.shuffle(ALL.slice()), cur:-1, phase:'intro', actor:null, offer:null,
    ready:HSEAT.map(()=>false), q:[], who:{}, used:{}, say:null, trust:ALL.map(()=>Array(N).fill(.5)), liar:ALL.map(()=>({})),
    sheets:Array(N).fill(null), rev:-1, score:null, log:[], turn:null, starter, winner:null, notice:'🎙️ 각자 비밀 번호 카드를 받았어요. 자기 번호도 모릅니다!', ev:0};
  s.hs=HSEAT.slice(); const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=ids[k]);
  return s;
}
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
const myFacts=(s,i)=> s.facts.filter(f=>f.a===i||f.b===i);
function believed(s,i){   // i가 믿는 발언들 (자기 정보와 안 맞으면 버림)
  const c={}; const p=P(s,i);
  for(const cl of s.claims){ if(cl.by===i) continue; if(s.liar[i][cl.by]) continue; if(cl.t===i && p.trust<.7) continue; if(cl.t===cl.by) continue;   /* 자기 번호 자랑·남이 말한 내 번호는 잘 안 믿음 */ if(s.trust[i][cl.by] < .55-p.trust*.3) continue; c[cl.t]=cl.n; }
  return c;
}

/* ── 진행 ── */
function startTurn(s){
  do { s.cur++; if(s.cur>=N){ s.cur=-1; startTalk(s); return; } } while(false);
  const i=s.ord[s.cur]; s.actor=i; s.offer=null; s.phase='turn';
  s.notice=`🎙️ ${s.round}라운드 · ${nm(i)} 차례 — 콘택트할 사람을 고르는 중`;
  if(isH(i)) s.turn=pOf(i); else { s.turn=null; s.think=1000+Math.random()*1300*(.7+P(s,i).logic*.6); }
}
function hasT(s,i,t){ return s.tk[i][t]>0; }
function propose(s,a,b,t){   // a가 b에게 t 콘택트 제안
  s.offer={a,b,t}; s.phase='offer'; s.log.push(`🤝 ${nm(a)} → ${nm(b)}에게 ${TKN[t]} 콘택트 제안`);
  s.notice=`🤝 ${nm(a)}이(가) ${nm(b)}에게 ${TKN[t]} 콘택트를 제안했어요`;
  if(isH(b)) s.turn=pOf(b); else { s.turn=null; s.think=900+Math.random()*1100; }
}
function answer(s,yes){
  const {a,b,t}=s.offer; s.phase='run'; s.turn=null;
  if(!yes){ s.log.push(`🙅 ${nm(b)} 거절`); s.notice=`🙅 ${nm(b)}이(가) 거절했어요`; s.q.push({k:'react',kind:'refused',i:a,t:b}); s.q.push({k:'next'}); return; }
  s.tk[a][t]--; s.tk[b][t]--;
  const v=calc(t,s.nums[a],s.nums[b]); s.facts.push({a,b,t,v,r:s.round}); s.contacts.push({a,b,t,r:s.round});
  s.notice=`🚪 ${nm(a)}·${nm(b)} 콘택트룸 입장… ${TKN[t]} 결과는 두 사람만 봐요`; s.log.push(`🚪 ${nm(a)} ↔ ${nm(b)} ${TKN[t]} 콘택트 (결과는 둘만)`);
  s.q.push({k:'next'});
}
function startTalk(s){
  s.phase='talk'; s.actor=null; s.ready=HSEAT.map(()=>false); s.turn=null; s.talkN=0;
  s.notice=`💬 ${s.round}라운드 토론 — 다 듣고 나면 "다음"을 누르세요 (번호를 공개할 수도, 거짓말할 수도)`;
  for(const i of U.shuffle(ALL.filter(j=>!isH(j)))){ const c=npcClaim(s,i); if(c) s.q.push({k:'claim',...c}); }
}
function nextRound(s){
  if(s.round>=ROUNDS){ s.phase='sheet'; s.ready=HSEAT.map(()=>false); s.notice='📝 정답지를 쓰세요! 모든 사람(나 포함)의 번호를 적어요. 모르면 비워 두세요'; for(const i of ALL) if(!isH(i)) s.sheets[i]=npcSheet(s,i); return; }
  s.round++; s.cur=-1; s.ord.push(s.ord.shift()); startTurn(s);
}
function addClaim(s,by,t,n){
  const truth=s.nums[t]===n; s.claims.push({by,t,n,r:s.round,truth});
  const text = by===t ? `제 번호는 ${n}이에요` : `${nm(t)} 번호는 ${n}이에요`;
  s.say={seat:by,text,n:(s.say?s.say.n:0)+1}; s.log.push(`${nm(by)}: ${text}`);
  // 듣는 NPC: 자기 정보와 맞는지 확인
  for(const L of ALL){ if(isH(L)||L===by) continue; const p=P(s,L);
    const cand=solve(myFacts(s,L),L,{})[t];
    if(cand && !cand.includes(n) && Math.random()<.4+p.logic*.6){ s.liar[L][by]=true; s.trust[L][by]=0; if(s.talkN<8&&Math.random()<.7){ s.talkN++; s.q.splice(0,0,{k:'say',seat:L,kind:'callout',t:by}); } }
    else s.trust[L][by]=Math.min(1,s.trust[L][by]+.05);
  }
  if(!isH(t) && by!==t && s.talkN<8 && Math.random()<.5){ s.talkN++; s.q.splice(0,0,{k:'say',seat:t,kind:truth?'react_true':'react_false',t:by}); }
}

/* ── NPC 판단 ── */
function npcTurn(s,i){
  const p=P(s,i), facts=myFacts(s,i), cand=solve(facts,i,believed(s,i));
  if(!TK.some(t=>s.tk[i][t]>0)){ if(!s.bought[i] && cand[i].length>1 && Math.random()<.4+p.logic*.55) return {k:'buy'}; return {k:'pass'}; }
  const opts=[], PL={};
  for(const o of ALL){ if(o===i) continue;
    for(const t of TK){ if(!hasT(s,i,t)||!hasT(s,o,t)) continue;
      let sc;
      if(Math.random()<p.logic){   // 내 번호 후보가 가장 많이 줄어드는 상대·티켓 (같은 상대만 계속하면 둘 중 누구 번호인지 못 가림)
        const pr=(PL[o]=PL[o]||pairsLeft(facts,i,o).filter(([x])=>cand[i].includes(x))); const g={};
        for(const [x,y] of pr){ const k=calc(t,x,y); (g[k]=g[k]||new Set()).add(x); }
        const cnt={}; for(const [x,y] of pr){ const k=calc(t,x,y); cnt[k]=(cnt[k]||0)+1; }
        const expMe = pr.length ? Object.keys(g).reduce((a,k)=>a+cnt[k]/pr.length*g[k].size,0) : cand[i].length;
        sc=-Math.log(expMe+.5) + (s.trust[i][o]-.5)*.3 + Math.random()*.05;
      } else sc=Math.random();
      opts.push({o,t,sc}); } }
  if(!opts.length) return {k:'pass'};
  opts.sort((a,b)=>b.sc-a.sc); const c=opts[0]; return {k:'contact',b:c.o,t:c.t};
}
function npcAccept(s,i,a){ const p=P(s,i); return Math.random() < .55+p.trust*.25+(s.trust[i][a]-.5)*.6 - (s.liar[i][a]?.5:0); }
function npcClaim(s,i){
  const p=P(s,i); if(Math.random()>.3+p.talk*.6) return null;
  const cand=solve(myFacts(s,i),i,believed(s,i)), known=ALL.filter(o=>o!==i&&cand[o]&&cand[o].length===1);
  if(Math.random()<p.bluff*.25){   // 거짓말: 남의 번호를 틀리게 / 내 번호를 엉뚱하게
    if(Math.random()<.5){ const t=U.pick(ALL.filter(o=>o!==i)); return {by:i,t,n:U.pick(NUMS.filter(n=>n!==s.nums[t]))}; }
    return {by:i,t:i,n:U.pick(NUMS.filter(n=>n!==s.nums[i]))}; }
  if(known.length && Math.random()<.5+p.aggr*.45){ const t=U.pick(known); return {by:i,t,n:cand[t][0]}; }   // 아는 번호 공개 (그 사람 점수를 깎음)
  return null;
}
function npcSheet(s,i){
  const p=P(s,i), cand=solve(myFacts(s,i),i,believed(s,i)), sh={};
  for(const o of ALL){ const c=cand[o]; if(!c) continue;
    if(o===i){ if(c.length===1 || (c.length===2&&p.aggr>.7)) sh[o]=U.pick(c); continue; }
    if(c.length===1 || (c.length<=2 && p.aggr>.6) || (c.length<=3 && p.aggr>.85)) sh[o]=U.pick(c); }
  return sh;
}

/* ── 채점 ── */
function scoreAll(s){
  const sc=ALL.map(i=>-s.pen[i]), detail=ALL.map(()=>({self:null,hit:0,miss:0,all:false,leak:0}));
  for(const i of ALL){ const sh=s.sheets[i]||{}; let allOk=true;
    for(const o of ALL){ const g=sh[o]; const right=g===s.nums[o];
      if(g==null){ allOk=false; continue; }
      if(!right) allOk=false;
      if(o===i){ sc[i]+= right?5:-5; detail[i].self=right; }
      else { sc[i]+= right?1:-1; right?detail[i].hit++:detail[i].miss++; if(right){ sc[o]--; detail[o].leak++; } } }
    if(allOk){ sc[i]+=5; detail[i].all=true; } }
  return {sc,detail};
}
function endGame(s){
  s.score=scoreAll(s); s.phase='over'; s.turn=null;
  const rank=ALL.slice().sort((a,b)=>s.score.sc[b]-s.score.sc[a]); s.rank=rank;
  s.winner = isH(rank[0]) ? pOf(rank[0]) : 'none'; s.winners=isH(rank[0])?[pOf(rank[0])]:[];
  s.notice=`🎙️ 최종 1등: ${nm(rank[0])} (${s.score.sc[rank[0]]}점)`; s.log.push(s.notice);
}

/* ── 말 ── */
const LINES={
  sly:{refused:['어머, 거절이요? 뭐 숨기는 거 있어요~? 😏'], callout:['{t}, 그 번호 거짓말이죠~? 다 보여요 😏'], react_true:['어머 {t}, 그걸 다 말하면 어떡해요~'], react_false:['{t} 말은 믿지 마세요~ 😏']},
  calm:{refused:['…거절이군요.'], callout:['{t}, 그건 아니에요.'], react_true:['…{t}, 굳이.'], react_false:['틀렸어요, {t}.']},
  logic:{refused:['거절도 정보예요. 기억해 둘게요.'], callout:['{t}, 제 콘택트 결과랑 안 맞아요. 거짓말이에요.','수학적으로 불가능한 번호예요, {t}.'], react_true:['{t}, 그 정보로 제 점수가 깎이네요.'], react_false:['{t} 말은 틀렸어요. 기록해 두세요.']},
  emo:{refused:['헐 왜 거절해요 😢','저랑 하기 싫어요? 🥲'], callout:['{t} 거짓말쟁이!! 😤','{t} 그거 아니잖아요!!'], react_true:['아 {t}!! 왜 말해요 😭'], react_false:['{t} 무슨 소리예요?! 😤']},
};
function lineOf(s,seat,kind,t){ const p=P(s,seat), st=STYLE[p.id]||'calm', L=(LINES[st]||{})[kind]; if(!L) return null;
  const used=(s.used[seat]=s.used[seat]||[]), pool=L.filter(x=>!used.includes(x)); if(!pool.length) return null; const raw=U.pick(pool); used.push(raw); return raw.split('{t}').join(t!=null?nm(t):''); }

/* ── 시간 흐름 ── */
function stepDelay(s){ syncH(s);
  if(s.winner!=null) return null;
  if(s.phase==='intro') return 2200;
  if(s.q.length) return s.q[0].k==='say'||s.q[0].k==='claim' ? 1700 : s.q[0].k==='react' ? 900 : 700;
  if(s.phase==='turn') return isH(s.actor)?null:s.think;
  if(s.phase==='offer') return isH(s.offer.b)?null:s.think;
  if(s.phase==='talk') return s.ready.every(Boolean)?600:null;
  if(s.phase==='sheet') return s.ready.every(Boolean)?900:null;
  if(s.phase==='reveal') return 1600;
  return null;
}
function step(s){ syncH(s);
  if(s.q.length){ const e=s.q.shift();
    if(e.k==='next') startTurn(s);
    else if(e.k==='claim') addClaim(s,e.by,e.t,e.n);
    else if(e.k==='say'||e.k==='react'){ if(isH(e.i??e.seat)) return; const seat=e.k==='react'?e.i:e.seat; if(isH(seat)) return; const text=lineOf(s,seat,e.kind,e.t); if(text){ s.say={seat,text,n:(s.say?s.say.n:0)+1}; s.log.push(`${nm(seat)}: ${text}`); } }
    s.ev++; return; }
  if(s.phase==='intro'){ startTurn(s); return; }
  if(s.phase==='turn' && !isH(s.actor)){ doTurn(s,s.actor,npcTurn(s,s.actor)); return; }
  if(s.phase==='offer' && !isH(s.offer.b)){ answer(s,npcAccept(s,s.offer.b,s.offer.a)); return; }
  if(s.phase==='talk' && s.ready.every(Boolean)){ nextRound(s); return; }
  if(s.phase==='sheet' && s.ready.every(Boolean)){ s.phase='reveal'; s.rev=-1; s.notice='🎙️ 지금부터 번호를 한 명씩 공개합니다!'; return; }
  if(s.phase==='reveal'){ s.rev++; if(s.rev>=N){ endGame(s); return; } const i=s.rev, hit=ALL.filter(o=>(s.sheets[o]||{})[i]===s.nums[i]);
    s.notice=`🎙️ ${nm(i)}의 번호는… ${s.nums[i]}! ${hit.length?`맞힌 사람: ${hit.map(nm).join(', ')}`:'아무도 못 맞혔어요'}`; s.log.push(s.notice); s.ev++; return; }
}
function doTurn(s,i,a){
  if(a.k==='contact'){ propose(s,i,a.b,a.t); return; }
  if(a.k==='buy'){ s.bought[i]=true; s.pen[i]++; for(const t of TK) s.tk[i][t]++; s.log.push(`🛒 ${nm(i)} 티켓 한 세트 구매 (−1점)`); s.notice=`🛒 ${nm(i)}이(가) 티켓을 한 세트 샀어요 (−1점)`; s.phase='run'; s.q.push({k:'next'}); return; }
  s.log.push(`⏭️ ${nm(i)} 이번엔 쉬어요`); s.notice=`⏭️ ${nm(i)} 이번 차례는 넘겨요`; s.phase='run'; s.turn=null; s.q.push({k:'next'});
}
function apply(s,p,a){ syncH(s);
  if(s.winner!=null) return '게임이 끝났어요';
  if(!a) return '알 수 없는 동작';
  const seat=HSEAT[p];
  if(a.k==='contact'||a.k==='buy'||a.k==='pass'){
    if(s.phase!=='turn'||s.actor!==seat) return '내 차례가 아니에요';
    if(a.k==='contact'){ const b=a.b, t=a.t; if(typeof b!=='number'||b===seat||!(b>=0&&b<N)) return '상대를 고르세요'; if(!TK.includes(t)) return '티켓을 고르세요'; if(!hasT(s,seat,t)) return '그 티켓이 없어요'; if(!hasT(s,b,t)) return '상대에게 그 티켓이 없어요'; }
    if(a.k==='buy' && s.bought[seat]) return '티켓은 한 번만 살 수 있어요';
    s.turn=null; doTurn(s,seat,a); return null;
  }
  if(a.k==='answer'){ if(s.phase!=='offer'||s.offer.b!==seat) return '받은 제안이 없어요'; answer(s,!!a.yes); return null; }
  if(a.k==='claim'){
    if(s.phase!=='talk') return '토론 시간에만 말할 수 있어요';
    const t=a.t, n=a.n|0; if(typeof t!=='number'||!(t>=0&&t<N)||!(n>=1&&n<=MAXN)) return '사람과 번호를 고르세요';
    if((s.hClaims=s.hClaims||{})[seat+':'+s.round]>=2) return '이번 토론에선 충분히 말했어요';
    s.hClaims[seat+':'+s.round]=(s.hClaims[seat+':'+s.round]||0)+1; s.talkN=s.talkN||0;
    addClaim(s,seat,t,n); s.ready[p]=false; s.ev++; return null;
  }
  if(a.k==='ready'){ if(s.phase!=='talk') return null; if(s.q.length) return '아직 이야기 중이에요'; s.ready[p]=true; return null; }
  if(a.k==='sheet'){
    if(s.phase!=='sheet') return '정답지 쓸 때가 아니에요';
    const sh={}; for(const o of ALL){ const n=a.sheet&&a.sheet[o]; if(n==null||n==='') continue; const v=+n; if(!(v>=1&&v<=MAXN)) return `${o+1}번 칸 숫자가 이상해요 (1~${MAXN})`; sh[o]=v; }
    s.sheets[seat]=sh; s.ready[p]=true; s.ev++; return null;
  }
  return '알 수 없는 동작';
}
function mask(s,p){ syncH(s);
  const v=U.clone(s), me=HSEAT[p], over=s.phase==='over';
  if(!over){ v.nums=s.nums.map((n,i)=> s.phase==='reveal'&&i<=s.rev ? n : null); v.facts=myFacts(s,me); v.claims=s.claims.map(c=>({...c,truth:undefined}));
    v.sheets=s.sheets.map((x,i)=> i===me ? x : (x?'done':null)); }
  v.q=[]; v.used={}; v.trust=[]; v.liar=[]; v.think=null; v.tk=s.tk;
  return v;
}
/* ── 혼자 모드: 4번 자리를 컴퓨터가 ── */
function ai(v){ syncH(v);
  const seat=HSEAT[1];
  if(v.phase==='turn'&&v.actor===seat){ const opts=[]; for(const o of ALL) if(o!==seat) for(const t of TK) if(v.tk[seat][t]>0&&v.tk[o][t]>0) opts.push({o,t});
    if(!opts.length) return {k:'pass'}; const prev=v.facts.map(f=>f.a===seat?f.b:f.a); const pr=opts.filter(x=>prev.includes(x.o)); const c=U.pick(pr.length?pr:opts); return {k:'contact',b:c.o,t:c.t}; }
  if(v.phase==='offer'&&v.offer&&v.offer.b===seat) return {k:'answer',yes:Math.random()<.85};
  if(v.phase==='talk'&&!v.ready[1]&&!v.q.length) return {k:'ready'};
  if(v.phase==='sheet'&&!v.ready[1]){ const c=solve(v.facts,seat,{}), sh={}; for(const o of ALL) if(c[o]&&c[o].length===1) sh[o]=c[o][0]; return {k:'sheet',sheet:sh}; }
  return null;
}

/* ── 화면 ── */
let WHO={}, pickB=null, pickT=null, clT=null, clN='', trustClaims=false, draft={}, sig='';
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}/g,(_,d)=>`${seatEmoji(+d)} ${seatName(+d,ctx)}`); }
const candTxt=c=> !c ? '?' : c.length===1 ? `<b>${c[0]}</b>` : c.length<=6 ? c.join('·') : `${c.length}개 (${Math.min(...c)}~${Math.max(...c)})`;
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{};
  const me=HSEAT[ctx.me];
  const sg=v.phase+':'+v.round+':'+v.actor; if(sg!==sig){ sig=sg; pickB=null; pickT=null; }
  const myClaims={}; if(trustClaims) for(const c of v.claims) if(c.by!==me) myClaims[c.t]=c.n;
  const cand=solve(v.facts,me,myClaims);
  let h=`<div class="info">${v.phase==='intro'?'준비':v.phase==='sheet'||v.phase==='reveal'||v.phase==='over'?'정답 시간':`${v.round} / ${ROUNDS}라운드`} · 내 티켓 ${TK.map(t=>`${t}×${v.tk[me][t]}`).join(' ')}${v.bought[me]?' · 🛒 샀음(−1)':''}</div>`;
  h+=`<div class="hl-notice">${fill(v.notice||'',ctx)}</div>`;
  h+=`<div class="vr-speech">${v.say?`<span class="w">${seatEmoji(v.say.seat)} ${seatName(v.say.seat,ctx)}</span> ${fill(U.esc(v.say.text),ctx)}`:'<i>　</i>'}</div>`;
  // 사람 카드
  h+=`<div class="sn-people">${ALL.map(i=>{ const mine=v.facts.filter(f=>f.a===i||f.b===i);
    const sel=(v.phase==='turn'&&v.actor===me&&i!==me)||(v.phase==='talk'&&clT!==null);
    return `<button class="sn-p ${i===me?'me':''} ${v.actor===i?'act':''} ${pickB===i||clT===i?'sel':''}" data-p="${i}">
      <b>${seatEmoji(i)} ${seatName(i,ctx)}</b>${isH(i)?'':`<small>${NPCI(i)[2]}</small>`}
      <span class="sn-num">${v.nums[i]!=null?`🔢 ${v.nums[i]}`:'🂠 ?'}</span>
      <span class="sn-cand">${i===me?'내 후보':'후보'}: ${candTxt(cand[i])}</span>
      <span class="sn-tk">${TK.map(t=>`<i class="${v.tk[i][t]?'':'off'}">${t}</i>`).join('')}</span>
      ${v.phase==='turn'&&v.actor===i&&!isH(i)?'<em>💭 고민 중…</em>':''}${v.offer&&v.offer.b===i&&v.phase==='offer'&&!isH(i)?'<em>💭 제안 받고 고민 중…</em>':''}</button>`; }).join('')}</div>`;
  // 내 행동
  if(v.phase==='turn'&&v.actor===me&&v.turn===ctx.me){
    h+=`<div class="vr-card"><b>🤝 콘택트 제안</b><p>${pickB==null?'👆 위에서 상대를 누르세요':`상대: ${fill(nm(pickB),ctx)} · 티켓을 고르세요`}</p>
      ${pickB!=null?`<div class="fh-act">${TK.map(t=>`<button class="${pickT===t?'':'ghost'}" data-t="${t}" ${v.tk[me][t]&&v.tk[pickB][t]?'':'disabled'}>${TKN[t]}</button>`).join('')}</div>`:''}
      <div class="fh-act"><button data-a="go" ${pickB!=null&&pickT?'':'disabled'}>제안하기</button>${v.bought[me]?'':'<button class="ghost" data-a="buy">🛒 티켓 한 세트 사기 (−1점)</button>'}<button class="ghost" data-a="pass">넘기기</button></div></div>`;
  }
  if(v.phase==='offer'&&v.offer&&v.offer.b===me&&v.turn===ctx.me) h+=`<div class="vr-card"><b>${fill(nm(v.offer.a),ctx)}이(가) ${TKN[v.offer.t]} 콘택트를 제안했어요</b><p>받으면 둘 다 ${v.offer.t} 티켓을 1장씩 쓰고, 결과를 둘만 봐요.</p><div class="fh-act"><button data-ans="1">🤝 받기</button><button class="ghost" data-ans="0">🙅 거절</button></div></div>`;
  if(v.phase==='talk'){
    const busy=false;
    h+=`<div class="vr-card"><b>💬 토론</b><p>누구 번호를 공개할 수 있어요 (거짓말도 가능). 남이 내 번호를 맞히면 내 점수가 깎여요!</p>
      <div class="fh-act"><button class="${clT!==null?'':'ghost'}" data-a="clpick">📢 번호 말하기${clT!==null?`: ${fill(nm(clT),ctx)} = `:''}</button>${clT!==null?`<input type="number" min="1" max="${MAXN}" value="${clN}" id="snN" style="width:70px"><button data-a="claim">말하기</button>`:''}</div>
      <div class="fh-act">${v.ready[ctx.me]?'<small>다른 사람을 기다리는 중…</small>':'<button data-a="ready">➡️ 다음 라운드로</button>'}</div></div>`;
  }
  if(v.phase==='sheet'&&!v.ready[ctx.me]){
    h+=`<div class="vr-card"><b>📝 정답지</b><p>내 번호 +5/−5 · 남의 번호 +1/−1 · 빈칸 0 · 전부 맞히면 +5. 후보가 하나면 미리 채워져 있어요.</p>
      <div class="sn-sheet">${ALL.map(o=>{ const c=cand[o]; const def=draft[o]!=null?draft[o]:(c&&c.length===1?c[0]:''); return `<label>${seatEmoji(o)} ${seatName(o,ctx)}${o===me?' (나)':''}<input type="number" min="1" max="${MAXN}" data-sh="${o}" value="${def}" placeholder="비움"></label>`; }).join('')}</div>
      <div class="fh-act"><button data-a="sheet">정답지 제출</button></div></div>`;
  } else if(v.phase==='sheet') h+=`<div class="vr-card"><small>다른 사람이 정답지를 쓰는 중…</small></div>`;
  if(v.phase==='over'&&v.score) h+=`<div class="sn-score">${v.rank.map((i,k)=>{ const d=v.score.detail[i]; return `<div class="${isH(i)?'h':''}"><b>${k+1}등 ${seatEmoji(i)} ${seatName(i,ctx)} ${v.score.sc[i]}점</b> <small>번호 ${v.nums[i]} · 내 번호 ${d.self==null?'비움':d.self?'✔ +5':'✘ −5'} · 남 ✔${d.hit} ✘${d.miss}${d.all?' · 전부 맞힘 +5':''}${d.leak?` · 내 번호 들킴 −${d.leak}`:''}${v.pen[i]?' · 티켓 구매 −1':''}</small></div>`; }).join('')}</div>`;
  // 내 노트
  h+=`<div class="side-box"><div class="side-h">🗒️ 내 콘택트 결과 <small>나만 봐요</small></div>${v.facts.length?v.facts.map(f=>{ const o=f.a===me?f.b:f.a; return `<div class="sn-f">${f.r}R · ${fill(nm(o),ctx)}와(과) ${TKN[f.t]} → <b>${f.v}</b></div>`; }).join(''):'<small style="color:#888">아직 없어요. 같은 사람과 다른 티켓으로 두 번 하면 둘 다 거의 풀려요!</small>'}
    <label class="vr-chk"><input type="checkbox" data-trust ${trustClaims?'checked':''}> 남들이 말한 번호도 믿고 후보 계산하기</label></div>`;
  // 왼쪽: 발언·신뢰판
  const conflict=c=>{ const cc=solve(v.facts,me,{})[c.t]; return cc && !cc.includes(c.n); };
  const L=`<div class="side-box"><div class="side-h">🧠 발언 · 신뢰 <small>누가 누구 번호를 뭐라고 했나</small></div>${v.claims.length?ALL.map(i=>{ const cs=v.claims.filter(c=>c.by===i); if(!cs.length) return '';
      return `<div class="rr-h"><b>${seatEmoji(i)} ${seatName(i,ctx)}</b> ${isH(i)?'':`<small>${NPCI(i)[2]}</small>`}<br>${cs.map(c=>`<span class="${v.phase==='over'?(c.truth?'ok':'no'):conflict(c)?'no':''}">${c.r}R ${c.t===i?'자기':fill(nm(c.t),ctx)}=${c.n}${v.phase==='over'?(c.truth?' ✔':' 🤥'):conflict(c)?' ⚠️내 정보와 안 맞음':''}</span>`).join('')}</div>`; }).join(''):'<small style="color:#888">토론에서 나온 번호 발언이 쌓여요. 내 콘택트 결과와 안 맞으면 ⚠️ 표시!</small>'}
    <div class="side-h" style="margin-top:8px">🚪 콘택트 기록</div>${v.contacts.length?v.contacts.slice().reverse().map(c=>`<div class="rr-h">${c.r}R ${fill(nm(c.a),ctx)} ↔ ${fill(nm(c.b),ctx)} ${c.t}</div>`).join(''):'<small style="color:#888">아직 없어요</small>'}</div>`;
  const R=`<div class="side-box side-log"><div class="side-h">📜 진행 기록 <small>최근이 위</small></div>${v.log.slice(-60).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=`<div class="side3"><div class="side-mid">${h}</div><aside class="side-l">${L}</aside><aside class="side-r">${R}</aside></div>`;
  el.oninput=e=>{ const sh=e.target.closest('[data-sh]'); if(sh) draft[sh.dataset.sh]=sh.value; if(e.target.id==='snN') clN=e.target.value; };
  el.onclick=e=>{
    const tr=e.target.closest('[data-trust]'); if(tr){ trustClaims=tr.checked; return ctx.rerender(); }
    const pp=e.target.closest('[data-p]'); if(pp){ const i=+pp.dataset.p;
      if(v.phase==='turn'&&v.actor===me&&i!==me){ pickB=i; pickT=null; return ctx.rerender(); }
      if(v.phase==='talk'&&clT!==null){ clT=i; return ctx.rerender(); } return; }
    const t=e.target.closest('[data-t]'); if(t&&!t.disabled){ pickT=t.dataset.t; return ctx.rerender(); }
    const an=e.target.closest('[data-ans]'); if(an) return ctx.act({k:'answer',yes:an.dataset.ans==='1'});
    const a=e.target.closest('[data-a]'); if(!a||a.disabled) return; const k=a.dataset.a;
    if(k==='go') return ctx.act({k:'contact',b:pickB,t:pickT});
    if(k==='buy'||k==='pass'||k==='ready') return ctx.act({k});
    if(k==='clpick'){ clT = clT===null ? me : null; return ctx.rerender(); }
    if(k==='claim'){ const n=+(el.querySelector('#snN')||{}).value; const tt=clT; clT=null; clN=''; return ctx.act({k:'claim',t:tt,n}); }
    if(k==='sheet'){ const sh={}; el.querySelectorAll('[data-sh]').forEach(x=>{ if(x.value!=='') sh[x.dataset.sh]=+x.value; }); draft={}; return ctx.act({k:'sheet',sheet:sh}); }
  };
}
function status(v,ctx){ syncH(v);
  const me=HSEAT[ctx.me];
  if(v.phase==='over') return '';
  if(v.phase==='turn'&&v.actor===me) return '내 차례: 콘택트할 사람과 티켓을 고르세요';
  if(v.phase==='offer'&&v.offer&&v.offer.b===me) return '콘택트 제안을 받았어요';
  if(v.phase==='talk') return v.ready[ctx.me]?'다른 사람을 기다리는 중…':'토론 시간';
  if(v.phase==='sheet') return v.ready[ctx.me]?'다른 사람을 기다리는 중…':'정답지를 쓰세요';
  if(v.phase==='reveal') return '번호 공개 중…';
  return '다른 사람 차례…';
}
const guide=`
<p><b>6인 추리 게임</b>(우리 둘 + 성격 다른 컴퓨터 플레이어 4명). 각자 1~${MAXN} 중 서로 다른 <b>비밀 번호</b>를 받는데, <b>자기 번호도 몰라요.</b></p>
<ul><li><b>🤝 콘택트</b>(${ROUNDS}라운드, 차례마다 1번): 한 명에게 제안 → 받아들이면 둘이 같은 티켓을 1장씩 내고, <b>그 둘만</b> 결과를 봐요.
  <br>＋ 두 번호의 합(15 이하·105 이상은 뭉뚱그림) · × 곱의 일의 자리 · ÷ 큰 수를 작은 수로 나눈 몫 · 0 두 번호 사이 10의 배수 개수</li>
<li>티켓은 종류별 2장씩. 한 번만 한 세트를 더 살 수 있어요(−1점).</li>
<li><b>💬 토론</b>(라운드마다): 누구 번호를 공개해요. <b>거짓말 가능!</b> 컴퓨터 플레이어도 성격대로 정보를 흘리거나 속여요. 내 콘택트 결과와 안 맞는 말은 ⚠️로 표시돼요.</li>
<li><b>📝 정답지</b>: 모든 사람(나 포함) 번호를 적어요. 내 번호 +5/−5 · 남의 번호 +1/−1 · 빈칸 0 · 전부 맞히면 +5 · <b>내 번호를 맞힌 사람 1명당 −1</b>.</li></ul>
<div class="tipbox">💡 <b>팁</b><br>· 결과는 두 사람에게 똑같아서, 한 사람하고만 하면 "둘 중 누가 어느 번호인지"를 못 가려요. 여러 사람과 콘택트해서 겹쳐 보세요! 🗒️ 노트의 후보가 자동으로 줄어들어요.<br>· 내 번호를 남들이 알면 손해! 내 번호를 거짓으로 말해 흐리는 것도 전략이에요.</div>`;
window.GAMES.secretnum = { _sync:x=>syncH(x), maxH:6,
  title:'시크릿 넘버', ref:'데블스 플랜 「시크릿 넘버」', emoji:'🔢', tags:['추리','협상','NPC','두뇌서바이벌'],
  tagline:'우리 둘 + 컴퓨터 4명. 나도 모르는 내 번호를, 둘만의 콘택트와 거짓말 섞인 토론으로 알아내라.',
  guide, init, apply, mask, ai, render, status, step, stepDelay, noPersona:true, wide:true,
  aiDelay:()=>1200+Math.random()*1500,
  reset(){ pickB=null; pickT=null; clT=null; clN=''; draft={}; sig=''; trustClaims=false; },
  bar:(v,i)=>{ const seat=HSEAT[i]; return `<span class="tag">🎟️ ${TK.reduce((a,t)=>a+v.tk[seat][t],0)}</span>`; },
  result:(v,ctx)=>{ const k=(v.rank||[]).indexOf(HSEAT[ctx.me]); return k>=0?`${k+1}등 · ${v.score.sc[HSEAT[ctx.me]]}점`:''; },
};
})();
