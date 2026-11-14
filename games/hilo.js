(function(){
'use strict';
/* 수식 하이로우 (6인 테이블: 우리 둘 + NPC 4명)
   카드 0~10 ×4장. 판마다 각자 비공개 1장 + 공개 3장(차례로)을 받고, 카드가 나올 때마다 베팅(체크·콜·레이즈·다이).
   마지막에 하이(20)/로우(1) 선언 → 한 명씩 공개. 내 숫자 4장에 ＋ − ÷를 한 번씩 넣어 만든 식이 목표에 가장 가까운 사람이
   그쪽 판돈 절반을 가져감(한쪽 선언자가 없으면 다른 쪽이 전부). 칩 20개로 4판, 칩이 가장 많은 사람이 1등. */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로, 나머지는 NPC */
const N=6, START=20, HANDS=4, RAISE_CAP=2; let HSEAT=[0,3]; const SEATORD=[0,3,1,4,2,5];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
// NPC는 npc.js 인물 4명(판마다 무작위). 성향 → 베팅: 뻥(bluff), 콜 문턱(공격적일수록 낮음), 계산 정확도(logic), 고민 속도
const STYLE={seojin:'logic', doyun:'emo', haram:'calm', yuna:'emo', minho:'sly', taekyung:'emo', jihu:'sly', soyul:'logic'};
let WHO={};
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
function PERS(s,i){ const p=NPCS.byId(s.who&&s.who[i]);
  if(!p) return {bluff:.1,tight:.38,talk:.6,style:'calm',logic:.6,speed:1,p:null};
  return {bluff:.03+p.bluff*.22, tight:.22+(1-p.aggr)*.24, talk:p.talk, style:STYLE[p.id]||'calm', logic:p.logic, speed:.55+(1-p.aggr)*.45+p.logic*.25, p}; }
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i);
const ALL=[0,1,2,3,4,5];
const T={deal:1300, act:1700, say:1500, reveal:2200, settle:3200, next:3500};

/* ── 수식 계산: 숫자들 + 연산자(＋ − ÷)를 한 번씩, ÷ 먼저 ── */
function perms(a){ if(a.length<=1) return [a.slice()]; const out=[]; a.forEach((x,i)=>{ for(const p of perms(a.slice(0,i).concat(a.slice(i+1)))) out.push([x,...p]); }); return out; }
function evalExpr(nums,ops){   // ops 길이 = nums-1
  const t=[nums[0]]; const o=[];
  for(let i=0;i<ops.length;i++){ if(ops[i]==='÷'){ const b=nums[i+1]; if(b===0) return null; t[t.length-1]=t[t.length-1]/b; } else { o.push(ops[i]); t.push(nums[i+1]); } }
  let v=t[0]; for(let i=0;i<o.length;i++) v = o[i]==='+' ? v+t[i+1] : v-t[i+1]; return v;
}
const OPS=['+','−','÷'];
const memo=new Map();
function best(nums,target){   // 가능한 식 중 목표에 가장 가까운 것 {v,expr,d}
  const key=nums.slice().sort((a,b)=>a-b).join(',')+'|'+target; if(memo.has(key)) return memo.get(key);
  let b={v:null,expr:'',d:Infinity};
  const k=nums.length-1, opSets = k===3 ? perms(OPS) : perms(OPS).map(p=>p.slice(0,k));
  for(const ns of perms(nums)) for(const os of opSets){ const v=evalExpr(ns,os); if(v==null) continue; const d=Math.abs(v-target);
    if(d<b.d-1e-9){ b={v, d, expr: ns.map((n,i)=> i? ` ${os[i-1]} ${n}` : `${n}`).join('')}; } }
  if(memo.size>5000) memo.clear(); memo.set(key,b); return b;
}
const fmt=v=> v==null ? '—' : (Math.round(v*100)/100).toString();

/* ── 진행 ── */
function newDeck(){ const d=[]; for(let n=0;n<=10;n++) for(let k=0;k<4;k++) d.push(n); return U.shuffle(d); }
function init(starter,o){ const k=Math.max(2,Math.min(6,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  const s={chips:Array(N).fill(START), hand:0, dealer:starter===0?5:2, phase:'deal', log:[], say:Array(N).fill(null), sayN:0,
    ready:HSEAT.map(()=>false), turn:null, starter, winner:null, ev:0, results:[],
    who:{}, stats:ALL.map(()=>({raise:0,call:0,fold:0,caught:0,won:0})), tilt:Array(N).fill(0), reactQ:[], used:{}};
  s.hs=HSEAT.slice(); const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=ids[k]);
  newHand(s); return s;
}
function alive(s){ return ALL.filter(i=>s.chips[i]>0 || s.inHand&&s.inHand[i]); }
function newHand(s){
  s.hand++; s.deck=newDeck(); s.cards=Array(N).fill(null).map(()=>[]); s.decl=Array(N).fill(null); s.reveal=Array(N).fill(false);
  s.inHand=ALL.map(i=>s.chips[i]>0); s.bet=Array(N).fill(0); s.pot=s.pot||0; s.street=0;   /* 나누고 남은 칩은 다음 판으로 */ s.phase='deal'; s.dealt=0; s.showOrder=[]; s.showIdx=0; s.split=null; s.put=Array(N).fill(0); s.raisedHand=Array(N).fill(false); s.reactQ=[];
  s.dealer=(s.dealer+1)%N; while(!s.inHand[s.dealer]) s.dealer=(s.dealer+1)%N;
  for(const i of ALL) if(s.inHand[i]){ s.chips[i]--; s.pot++; }   // 참가비 1
  s.notice=`🎙️ ${s.hand}번째 판을 시작합니다 · 참가비 1개씩 · 카드를 나눠 드릴게요 🃏`; s.log.push(`— ${s.hand}번째 판 —`);
}
const active=s=>ALL.filter(i=>s.inHand[i]);
// 오프라인처럼: 딜러가 한 사람씩 카드를 놓음 (첫 장은 비공개 → 다음 바퀴 공개)
function queueDeal(s){
  s.dealQ=[]; const order=[]; let i=(s.dealer+1)%N; for(let k=0;k<N;k++,i=(i+1)%N) if(s.inHand[i]) order.push(i);
  if(s.street===0) for(const i of order) s.dealQ.push([i,true]);
  for(const i of order) s.dealQ.push([i,false]);
}
function dealOne(s){
  if(!s.dealQ) queueDeal(s);
  const q=s.dealQ.shift();
  if(q){ const [i,hid]=q; s.cards[i].push({n:s.deck.pop(),hid}); s.dealing=i; s.notice = hid ? `🃏 ${nm(i)}에게 비공개 카드 한 장` : `🃏 ${nm(i)}에게 공개 카드 ${s.cards[i][s.cards[i].length-1].n}`; s.ev++; }
  if(!s.dealQ.length){ s.dealQ=null; s.dealing=null; s.street++; s.phase='dealt'; }
}
function startBetting(s){
  s.phase='bet'; s.bet=Array(N).fill(0); s.raises=0; s.toAct=[]; s.cur=0;
  let i=(s.dealer+1)%N; for(let k=0;k<N;k++,i=(i+1)%N) if(s.inHand[i]) s.toAct.push(i);
  s.notice=`${s.street}번째 카드까지 받았어요 · 베팅 시작`; setTurn(s);
}
const maxBet=s=>Math.max(...s.bet);
function setTurn(s){
  if(active(s).length<=1){ s.phase='show'; finishHand(s); return; }
  if(s.cur>=s.toAct.length){ endBetting(s); return; }
  const seat=s.toAct[s.cur]; if(!s.inHand[seat]){ s.cur++; return setTurn(s); }
  s.actor=seat; s.turn = isH(seat) ? pOf(seat) : null;
  s.prompt = `💭 ${nm(seat)} 차례…`;
  if(!isH(seat)){ const P=PERS(s,seat), st=strength(s,seat), need=maxBet(s)-s.bet[seat];
    const hard = Math.max(0, 1-Math.abs(st-P.tight)*3) + (need>=2?.35:0);
    s.thinkMs = (650 + Math.min(1.3,hard)*2300) * P.speed * (.85+Math.random()*.3); s.longThink = s.thinkMs>2600; }
  else { s.thinkMs=null; s.longThink=false; }
}
function act(s,seat,kind,amt){
  const need=maxBet(s)-s.bet[seat];
  s.stats[seat][kind]++;
  if(kind==='fold'){ s.inHand[seat]=false; s.log.push(`${nm(seat)} 다이`); say(s,seat,'fold'); }
  else if(kind==='call'){ const pay=Math.min(need,s.chips[seat]); s.chips[seat]-=pay; s.bet[seat]+=pay; s.pot+=pay; s.put[seat]+=pay; s.log.push(`${nm(seat)} ${need?`콜 (+${pay})`:'체크'}`); if(need) say(s,seat,'call'); }
  else if(kind==='raise'){ const x=Math.max(1,Math.min(3,amt|0)); const pay=Math.min(need+x,s.chips[seat]); s.chips[seat]-=pay; s.bet[seat]+=pay; s.pot+=pay; s.put[seat]+=pay; s.raises++; s.raisedHand[seat]=true;
    s.log.push(`${nm(seat)} 레이즈 +${x}`); say(s,seat,'raise',x);
    if(x>=3 || s.raises>=RAISE_CAP){ const o=active(s).filter(j=>j!==seat&&!isH(j)); if(o.length&&Math.random()<.65) s.reactQ.push({seat:U.pick(o),kind:'shock',t:seat}); }
    // 레이즈하면 다른 사람들은 다시 응답해야 함
    const rest=[]; let i=(seat+1)%N; for(let k=0;k<N-1;k++,i=(i+1)%N) if(s.inHand[i] && s.chips[i]>0) rest.push(i);
    s.toAct=s.toAct.slice(0,s.cur+1).concat(rest); }
  s.notice = `${nm(seat)}: ${kind==='fold'?'다이':kind==='raise'?`레이즈 +${Math.max(1,Math.min(3,amt|0))}`:(need>0?'콜':'체크')}`;
  s.lastAct={seat,kind,n:(s.lastAct?s.lastAct.n:0)+1};
  s.cur++; s.ev++; s.phase='acted';   // 행동을 잠깐 보여 주고 다음 사람으로 (step)
}
function endBetting(s){
  if(s.street<3){ s.phase='deal'; s.notice='다음 카드를 나눠 드릴게요'; s.turn=null; return; }
  s.phase='declare'; s.turn=null; s.notice='하이(20)·로우(1) 선언! 모두 동시에 정해요';
  s.declQ=active(s).filter(i=>!isH(i));   // NPC는 한 명씩 엎음 (step)
}
function nm(i){ return `{s${i}}`; }
function finishHand(s){
  s.turn=null;
  const act_=active(s);
  if(act_.length===1){ const w=act_[0]; s.stats[w].won++; s.chips[w]+=s.pot; if(!isH(w)) s.reactQ.push({seat:w,kind:'win'}); s.log.push(`${nm(w)} 혼자 남아 판돈 ${s.pot}개 획득`); s.split={hi:[w],lo:[],pot:s.pot,solo:true}; s.pot=0; s.phase='settle'; s.notice=`모두 다이! ${nm(w)}이(가) 판돈을 가져가요`; return; }
  s.showOrder=act_.slice(); s.showIdx=0; s.phase='show'; s.notice='한 명씩 수식을 공개합니다…';
}
function score(s,i){ const ns=s.cards[i].map(c=>c.n); const t=s.decl[i]==='lo'?1:20; return best(ns,t); }
function settle(s){
  const act_=active(s), hi=act_.filter(i=>s.decl[i]==='hi'), lo=act_.filter(i=>s.decl[i]==='lo');
  const win=g=>{ if(!g.length) return []; const ds=g.map(i=>score(s,i).d), m=Math.min(...ds); return g.filter((i,k)=>Math.abs(ds[k]-m)<1e-9); };
  const wh=win(hi), wl=win(lo); let ph=0, pl=0;
  if(wh.length&&wl.length){ ph=Math.floor(s.pot/2); pl=s.pot-ph; } else if(wh.length) ph=s.pot; else pl=s.pot;
  const give=(ws,amt)=>{ if(!ws.length) return 0; const each=Math.floor(amt/ws.length); ws.forEach(i=>s.chips[i]+=each); return amt-each*ws.length; };
  const left=give(wh,ph)+give(wl,pl);
  s.split={hi:wh,lo:wl,ph,pl,pot:s.pot}; s.pot=left;
  s.log.push(`하이 ${wh.map(nm).join('·')||'없음'} +${wh.length?Math.floor(ph/wh.length):0} / 로우 ${wl.map(nm).join('·')||'없음'} +${wl.length?Math.floor(pl/wl.length):0}`);
  s.phase='settle'; s.notice=`🏆 하이: ${wh.map(nm).join('·')||'없음'} · 로우: ${wl.map(nm).join('·')||'없음'}`;
  for(const i of ALL){ const w=wh.includes(i)||wl.includes(i);
    if(w){ s.stats[i].won++; s.tilt[i]=Math.max(0,s.tilt[i]-1.5); } else if(s.put[i]>=4){ s.tilt[i]=Math.min(3,s.tilt[i]+1); } }
  for(const i of [...wh,...wl]) if(!isH(i)) s.reactQ.push({seat:i,kind:'win'});
  const losers=act_.filter(i=>!wh.includes(i)&&!wl.includes(i)&&!isH(i)).sort((a,b)=>s.put[b]-s.put[a]);
  if(losers.length) s.reactQ.push({seat:losers[0],kind:s.tilt[losers[0]]>=2?'tilt':'lose'});
}
function nextHand(s){
  const living=ALL.filter(i=>s.chips[i]>0);
  if(s.hand>=HANDS || living.length<=1 || HSEAT.every(i=>s.chips[i]<=0)){ endGame(s); return; }
  newHand(s);
}
function endGame(s){
  s.phase='over'; s.turn=null;
  const rank=ALL.slice().sort((a,b)=>s.chips[b]-s.chips[a]); s.rank=rank;
  const top=rank[0]; s.winner = isH(top) ? pOf(top) : 'none'; s.winners=isH(top)?[pOf(top)]:[];
  // 두 사람 다 NPC에게 졌어도, 둘 중 누가 위인지는 순위로 보여 줌
  s.notice=`최종 1등: ${nm(top)} (${s.chips[top]}개)`;
}

/* ── NPC 판단 ── */
function strength(s,i){   // 0~1, 지금 카드로 하이/로우 중 더 나은 쪽 얼마나 가까운지
  const ns=s.cards[i].map(c=>c.n); if(!ns.length) return .5;
  const h=best(ns,20).d, l=best(ns,1).d, d=Math.min(h,l);
  const left=3-(ns.length-1);   // 앞으로 더 받을 카드 수 (2장 받은 뒤 2장 더)
  return Math.max(0, Math.min(1, 1 - d/ (6+left*3)));
}
function npcBet(s,i){
  const P=PERS(s,i), need=maxBet(s)-s.bet[i], r=Math.random(), tl=s.tilt[i]||0;
  const est=strength(s,i)+(Math.random()-.5)*(1-P.logic)*.3;          // 계산이 약하면 자기 패도 헷갈림
  const bluff=P.bluff+tl*.07;                                          // 화나면 뻥이 늘고
  const tight=P.tight-tl*.06+(s.raises>0?(P.logic-.5)*.14:0);          // 화나면 헐거워지고, 논리파는 남의 레이즈를 존중
  if(s.raises<RAISE_CAP && s.chips[i]>need && (est>.8 || r<bluff)) return ['raise', est>.9?3:est>.8?2:1];
  if(need===0) return ['call'];
  if(est>tight || (need<=1 && est>tight-.15) || r<bluff*.6) return ['call'];
  return ['fold'];
}
function npcDeclare(s,i){
  const P=PERS(s,i), ns=s.cards[i].map(c=>c.n), h=best(ns,20).d, l=best(ns,1).d;
  // 남들 공개 카드로 어느 쪽에 갈지 짐작 → 붐비는 쪽은 피함 (논리파일수록 많이 따짐)
  let ch=0, cl=0; for(const j of active(s)) if(j!==i){ const pub=s.cards[j].filter(c=>!c.hid).map(c=>c.n); if(pub.length<2) continue; if(best(pub,20).d<best(pub,1).d) ch++; else cl++; }
  if(Math.random()<.08*(1.4-P.logic)) return h<l?'lo':'hi';           // 가끔 감으로
  return h+ch*.6*P.logic <= l+cl*.6*P.logic ? 'hi' : 'lo';
}

/* ── NPC 말 ── */
const LINES={
  sly:{raise:['레이즈 {x}개~ 따라오실래요? 😏','올려 볼까요? +{x}','+{x}. 겁나면 접으셔도 돼요~','이 정도는 기본이죠. +{x}','후후, +{x}'], call:['콜~','받아 드릴게요','따라가 볼까~','궁금하네요. 콜','콜. 뭐 들고 계세요?'], fold:['이번 판은 봐드릴게요~','양보할게요~ 다음엔 안 봐줘요','에이, 다이~'],
    win:['역시 제 거네요 😎','계산대로~','다들 속으셨죠?','잘 먹겠습니다~'], lose:['쳇, 다음 판!','이번엔 운이 좋으셨네요~'], tilt:['…이제 안 봐줍니다.'], shock:['오~ {t} 세게 나오시네?','{t}, 진짜예요? 😏'], caught:['{t} 그거 뻥이었죠? 다 보였어요~'], wow:['{t} 식 깔끔하네요~']},
  calm:{raise:['+{x}.','올리죠. +{x}','+{x}만.'], call:['콜.','…받죠.','따라가요.','네, 콜.'], fold:['다이.','이번엔 접을게요.'], win:['됐네.','고마워요.'], lose:['…음.','그럴 수 있죠.'], tilt:['…좀 화나네요.'], shock:['…{t}, 세네요.'], caught:['{t}, 뻥이었군요.'], wow:['…{t} 잘했네요.']},
  logic:{raise:['기댓값상 레이즈가 맞아요. +{x}','지금 올리는 게 이득이에요. +{x}','+{x}. 계산 끝났어요.','숫자가 좋아요. +{x}'], call:['콜. 확률은 반반이에요.','콜합니다.','따라가는 게 손해는 아니에요.','콜. 다음 카드 보죠.','판돈 대비 괜찮아요. 콜'], fold:['손익이 안 맞네요. 다이.','여기서 접는 게 맞아요.','기댓값 마이너스. 다이.'],
    win:['계산이 맞았네요.','예상한 대로예요.'], lose:['변수가 컸어요.','확률은 확률일 뿐이죠.'], tilt:['…계산 다시 해야겠어요.'], shock:['{t}의 레이즈, 공개 카드랑 안 맞는데요?','{t}, 그 카드로 +? 흥미롭네요.'], caught:['역시 {t} 레이즈는 뻥이었어요. 공개 카드가 말해 줬죠.'], wow:['{t}, 딱 맞췄네요. 대단해요.']},
  emo:{raise:['가자아!! +{x} 🔥','올인 각… 아니 +{x}!','느낌 왔어요!! +{x}','이번엔 진짜예요 +{x} 😤'], call:['콜콜! 😆','무서운데… 콜!','에라 모르겠다 콜!','콜! 두근두근 💓','따라갈래요!!'], fold:['으앙 다이할래요 😭','무서워서 접어요 🥲','아 이건 아니다… 다이'],
    win:['우와아 이겼다!! 🥳','대박!! 제 거예요!!','살았다아 😭'], lose:['흑흑 😭','아 진짜 아깝다!!'], tilt:['아 열받아!! 다음 판 두고 봐요 😤'], shock:['헉!! {t} 왜 그래요 😱','{t} 미쳤나 봐!!'], caught:['{t} 뻥쟁이!! 😤'], wow:['{t} 천재예요?! 🤩']},
};
function say(s,seat,kind,x,t){ if(isH(seat)) return; const P=PERS(s,seat);
  if(!['shock','caught','wow','win','tilt'].includes(kind) && Math.random()>P.talk) return;
  const L=LINES[P.style][kind]; if(!L) return;
  const used=(s.used[seat]=s.used[seat]||[]), pool=L.filter(x=>!used.includes(x)); if(!pool.length) return;   // 같은 대사 반복 금지
  const raw=U.pick(pool); used.push(raw);
  const text=raw.split('{x}').join(x||'').split('{t}').join(t!=null?nm(t):'');
  s.say[seat]={t:text, n:++s.sayN}; s.log.push(`${nm(seat)}: ${text}`); }

/* ── 시간 흐름 (방장·혼자 쪽) ── */
function stepDelay(s){ syncH(s);
  if(s.winner!=null) return null;
  if(s.reactQ&&s.reactQ.length&&['acted','show','settle'].includes(s.phase)) return 1050;   // 테이블 반응, 한 명씩
  if(s.phase==='deal') return s.dealQ ? 520 : 1400;            // 카드 한 장씩
  if(s.phase==='dealt') return 900;
  if(s.phase==='acted') return 1100;                          // 방금 행동 보여 주기
  if(s.phase==='declare' && s.declQ && s.declQ.length) return 1000+Math.random()*700;
  if(s.phase==='bet' && s.turn==null && s.actor!=null && !isH(s.actor)) return s.thinkMs||T.act;
  if(s.phase==='declare' && HSEAT.every(i=>!s.inHand[i]||s.decl[i]!=null) && !(s.declQ&&s.declQ.length)) return 1200;
  if(s.phase==='show') return T.reveal;
  if(s.phase==='settle') return T.next;
  return null;
}
function step(s){ syncH(s);
  if(s.reactQ&&s.reactQ.length&&['acted','show','settle'].includes(s.phase)){ const r=s.reactQ.shift(); say(s,r.seat,r.kind,0,r.t); s.ev++; return; }
  if(s.phase==='deal'){ dealOne(s); return; }
  if(s.phase==='dealt'){ startBetting(s); return; }
  if(s.phase==='acted'){ s.phase='bet'; setTurn(s); return; }
  if(s.phase==='declare' && s.declQ && s.declQ.length){ const i=s.declQ.shift(); s.decl[i]=npcDeclare(s,i); s.notice=`🤫 ${nm(i)} 선언 카드를 엎어 놨어요`; s.ev++; return; }
  if(s.phase==='bet' && s.turn==null && !isH(s.actor)){ const [k,x]=npcBet(s,s.actor); act(s,s.actor,k,x); return; }
  if(s.phase==='declare'){ s.notice='모두 선언 끝! 한 명씩 공개합니다…'; s.phase='show'; finishHand(s); return; }
  if(s.phase==='show'){ if(s.showIdx<s.showOrder.length){ const i=s.showOrder[s.showIdx++]; s.reveal[i]=true; const b=score(s,i);
      s.notice=`${nm(i)} 공개: ${s.decl[i]==='lo'?'⬇️ 로우':'⬆️ 하이'} · ${b.expr} = ${fmt(b.v)}`; s.log.push(s.notice); s.ev++;
      const others=active(s).filter(j=>j!==i&&!isH(j));
      if(s.raisedHand[i] && b.d>=4){ s.stats[i].caught++; if(others.length) s.reactQ.push({seat:others.sort((a,c)=>PERS(s,c).logic-PERS(s,a).logic)[0],kind:'caught',t:i}); }
      else if(b.d<1e-9 && others.length && Math.random()<.7) s.reactQ.push({seat:U.pick(others),kind:'wow',t:i});
    } else settle(s); return; }
  if(s.phase==='settle'){ nextHand(s); return; }
}
function apply(s,p,a){ syncH(s);
  if(s.winner!=null) return '게임이 끝났어요';
  if(!a) return '알 수 없는 동작';
  const seat=HSEAT[p];
  if(a.k==='bet'){
    if(s.phase!=='bet' || s.turn!==p || s.actor!==seat) return '지금은 베팅 차례가 아니에요';
    if(!['call','raise','fold'].includes(a.kind)) return '알 수 없는 베팅';
    if(a.kind==='raise' && (s.raises>=RAISE_CAP || s.chips[seat]<=maxBet(s)-s.bet[seat])) return '더 올릴 수 없어요';
    act(s,seat,a.kind,a.x); return null;
  }
  if(a.k==='declare'){
    if(s.phase!=='declare' || !s.inHand[seat]) return '지금은 선언할 때가 아니에요';
    if(a.side!=='hi'&&a.side!=='lo') return '하이나 로우를 고르세요';
    s.decl[seat]=a.side; s.ev++; return null;
  }
  return '알 수 없는 동작';
}
function mask(s,p){ syncH(s);
  const v=U.clone(s), me=HSEAT[p];
  v.deck=s.deck?s.deck.length:0;
  v.cards=s.cards.map((cs,i)=> cs.map(c=> (c.hid && i!==me && !s.reveal[i] && s.phase!=='over') ? {n:null,hid:true} : c));
  v.decl=s.decl.map((d,i)=> i===me || s.reveal[i] ? d : (d ? '?' : null));
  v.thinkMs=null; v.reactQ=[]; v.used={};
  return v;
}

/* ── 혼자 모드: 3번 자리(사람 자리)를 컴퓨터가 대신 ── */
function ai(v){ syncH(v);
  const seat=HSEAT[1];
  if(v.phase==='bet' && v.actor===seat && v.turn===1){ const [k,x]=npcBetView(v,seat); return {k:'bet',kind:k,x}; }
  if(v.phase==='declare' && v.inHand[seat] && v.decl[seat]==null){ const ns=v.cards[seat].map(c=>c.n); return {k:'declare', side: best(ns,20).d<=best(ns,1).d?'hi':'lo'}; }
  return null;
}
function npcBetView(v,seat){ const ns=v.cards[seat].map(c=>c.n); const d=Math.min(best(ns,20).d,best(ns,1).d), left=3-(ns.length-1), st=Math.max(0,Math.min(1,1-d/(6+left*3))), need=Math.max(...v.bet)-v.bet[seat];
  if(v.raises<RAISE_CAP && v.chips[seat]>need && st>.82) return ['raise',2]; if(need===0||st>.38||need<=1&&st>.25) return ['call']; return ['fold']; }

/* ── 화면 ── */
let lastSay=Array(N).fill(0), lastEv=-1;
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
const mood=(v,i)=> (v.tilt&&v.tilt[i]>=2)?'😤':v.chips[i]>=START+6?'😎':v.chips[i]<=6?'😰':'';
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}/g,(_,d)=>`${seatEmoji(+d)} ${seatName(+d,ctx)}`); }
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{};
  const me=HSEAT[ctx.me];
  const myTurn = v.phase==='bet' && v.turn===ctx.me && v.actor===me;
  const seatHTML=i=>{
    const out=!v.inHand||!v.inHand[i], cs=v.cards[i]||[], isMe=i===me;
    const bubble=`<div class="hl-saybox">${v.say[i]&&v.say[i].n>lastSay[i]-3 ? `<div class="hl-say">💬 ${fill(U.esc(v.say[i].t),ctx)}</div>` : ''}</div>`;
    const d=v.decl[i]; const dTxt = d==='hi'?'⬆️ 하이':d==='lo'?'⬇️ 로우':d==='?'?'🤔 선언함':'';
    const showB = (v.reveal[i] || v.phase==='over') && cs.length===4 && d && d!=='?' ? (()=>{ const b=best(cs.map(c=>c.n), d==='lo'?1:20); return `<div class="hl-expr">${b.expr} = <b>${fmt(b.v)}</b></div>`; })() : '';
    const won = v.split && ((v.split.hi||[]).includes(i)||(v.split.lo||[]).includes(i)) && v.phase==='settle';
    return `<div class="hl-seat ${out?'out':''} ${isMe?'me':''} ${v.actor===i&&v.phase==='bet'?'act':''} ${won?'won':''}">
      <div class="hl-name">${seatEmoji(i)} ${seatName(i,ctx)} ${mood(v,i)}</div>${isH(i)?'':`<div class="hl-arch">${NPCI(i)[2]}</div>`}
      <div class="hl-chips">🪙 ${v.chips[i]}${v.bet&&v.bet[i]?` <small>· 이번 ${v.bet[i]}</small>`:''}</div>
      <div class="hl-cards">${cs.map(c=>`<span class="hl-c ${c.hid?'hid':''}">${c.n==null?'🂠':c.n}</span>`).join('')}</div>
      ${v.phase==='bet'&&v.actor===i?`<div class="hl-think">💭 ${v.longThink?'한참 고민 중…':'고민 중…'}</div>`:''}${v.dealing===i?'<div class="hl-think">🃏</div>':''}${dTxt?`<div class="hl-decl">${dTxt}</div>`:''}${showB}${out&&v.phase!=='over'?'<div class="hl-fold">다이</div>':''}${isMe?'':bubble}</div>`;
  };
  // 내 자리가 아래 가운데 오게 돌려서 배치
  const order=[...Array(N)].map((_,k)=>(me+k)%N);   // 나, 그다음 왼쪽부터…
  let h=`<div class="info">${v.hand} / ${HANDS}판 · 판돈 <b>🪙 ${v.pot}</b>${v.phase==='bet'?` · ${v.street}번째 베팅`:''}</div>`;
  h+=`<div class="hl-notice">${fill(v.notice||'',ctx)}</div>${v.phase==='bet'&&v.prompt?`<div class="hl-prompt">${fill(v.prompt,ctx)}</div>`:''}`;
  h+=`<div class="hl-table"><div class="hl-row top">${[order[2],order[3],order[4]].map(seatHTML).join('')}</div>
      <div class="hl-row mid">${seatHTML(order[1])}<div class="hl-pot">🪙 ${v.pot}<small>판돈</small></div>${seatHTML(order[5])}</div>
      <div class="hl-row bot">${seatHTML(order[0])}</div></div>`;
  // 내 카드로 만들 수 있는 가장 좋은 식 (도움말)
  const mine=(v.cards[me]||[]).map(c=>c.n).filter(n=>n!=null);
  if(mine.length>=2 && v.inHand[me] && v.phase!=='over'){
    const bh=best(mine,20), bl=best(mine,1);
    h+=`<div class="hl-help">내 숫자 ${mine.join(' · ')} → ⬆️ 하이 최선 <b>${bh.expr} = ${fmt(bh.v)}</b> (20과 ${fmt(bh.d)} 차이) · ⬇️ 로우 최선 <b>${bl.expr} = ${fmt(bl.v)}</b> (1과 ${fmt(bl.d)} 차이)${mine.length<4?' <small>(카드가 더 오면 바뀌어요)</small>':''}<div class="hl-rule">📏 숫자 4장과 ＋ − ÷ 를 <b>한 번씩 모두</b> 써야 해요 (÷ 먼저 계산). 그냥 다 더하기는 안 돼요!</div></div>`;
  }
  if(myTurn){ const need=Math.max(...v.bet)-v.bet[me], canR=v.raises<RAISE_CAP && v.chips[me]>need;
    h+=`<div class="fh-act"><button class="ghost" data-b="fold">다이</button><button data-b="call">${need?`콜 (+${Math.min(need,v.chips[me])})`:'체크'}</button>${canR?[1,2,3].map(x=>`<button data-b="raise" data-x="${x}">레이즈 +${x}</button>`).join(''):''}</div>`; }
  if(v.phase==='declare' && v.inHand[me] && v.decl[me]==null) h+=`<div class="fh-act"><button data-d="hi">⬆️ 하이 (20)</button><button data-d="lo">⬇️ 로우 (1)</button></div>`;
  if(v.phase==='over' && v.rank) h+=`<div class="hl-rank">${v.rank.map((i,k)=>`<span class="${isH(i)?'h':''}">${k+1}등 ${seatEmoji(i)} ${seatName(i,ctx)} · 🪙${v.chips[i]}</span>`).join('')}</div>`;
  const stand=[...Array(N).keys()].sort((a,b)=>v.chips[b]-v.chips[a]);
  const sx=i=>{ const x=(v.stats||[])[i]||{}; return `<div class="hl-st">레이즈 ${x.raise||0} · 콜 ${x.call||0} · 다이 ${x.fold||0}${x.caught?` · <b class="no">뻥 들킴 ${x.caught}</b>`:''}${x.won?` · 🏆 ${x.won}`:''}</div>`; };
  const left=`<div class="side-box"><div class="side-h">🧠 테이블 읽기 <small>순위 · 기분 · 베팅 버릇</small></div>${stand.map((i,k)=>`<div class="side-row ${i===me?'me':''} ${v.inHand&&!v.inHand[i]?'dim':''}" style="flex-wrap:wrap"><b>${k+1}</b> ${seatEmoji(i)} ${seatName(i,ctx)} ${isH(i)?'':`<small>${NPCI(i)[2]}</small>`} ${mood(v,i)}<span>🪙 ${v.chips[i]}</span>${v.decl&&v.decl[i]&&v.decl[i]!=='?'?` <small>${v.decl[i]==='hi'?'⬆️':'⬇️'}</small>`:''}${sx(i)}</div>`).join('')}</div>`;
  const right=`<div class="side-box side-log"><div class="side-h">📜 진행 기록 <small>최근이 위</small></div>${v.log.slice(-40).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=`<div class="side3"><div class="side-mid">${h}</div><aside class="side-l">${left}</aside><aside class="side-r">${right}</aside></div>`;
  for(const i of ALL) if(v.say[i]) lastSay[i]=Math.max(lastSay[i],v.say[i].n);
  if(v.ev!==lastEv){ lastEv=v.ev; }
  el.onclick=e=>{ const b=e.target.closest('[data-b]'); if(b){ ctx.act({k:'bet',kind:b.dataset.b,x:+b.dataset.x||0}); return; } const d=e.target.closest('[data-d]'); if(d) ctx.act({k:'declare',side:d.dataset.d}); };
}
function status(v,ctx){ syncH(v);
  const me=HSEAT[ctx.me];
  if(v.phase==='over') return '';
  if(v.phase==='bet' && v.turn===ctx.me && v.actor===me) return '내 차례: 체크·콜·레이즈·다이';
  if(v.phase==='declare') return v.decl[me]==null&&v.inHand[me] ? '하이(20)·로우(1) 중 하나를 선언하세요' : '다른 사람들이 선언 중…';
  if(!v.inHand[me]) return '이번 판은 다이 — 구경 중';
  return '다른 사람 차례…';
}
const guide=`
<p><b>6인 테이블</b>(우리 둘 + 성격 다른 컴퓨터 플레이어 4명)에서 칩을 걸고 겨루는 숫자 포커예요. 혼자 하면 나머지 5명이 다 컴퓨터예요.</p>
<ul><li>카드는 0~10. 판마다 <b>비공개 1장 + 공개 3장</b>을 차례로 받고, 카드가 나올 때마다 <b>베팅</b>해요: 체크/콜(따라가기)·레이즈(+1~3)·다이(포기).</li>
<li>4장을 다 받으면 <b>하이(20)</b>인지 <b>로우(1)</b>인지 선언해요(동시에, 남들은 몰라요).</li>
<li>내 숫자 4장 사이에 <b>＋ − ÷</b>를 한 번씩 넣어 식을 만들어요(÷ 먼저 계산). 하이는 20에, 로우는 1에 <b>가장 가까운 사람</b>이 이겨요. 가장 좋은 식은 자동으로 계산돼요.</li>
<li>판돈은 하이 우승자와 로우 우승자가 <b>반씩</b>. 한쪽에 아무도 없으면 다른 쪽이 전부. 다 다이하면 남은 한 명이 가져가요.</li>
<li>참가비 1개씩, 칩 20개로 4판. 칩이 가장 많은 사람이 1등!</li></ul>
<div class="tipbox">💡 <b>팁</b><br>
· 남들의 공개 카드를 보세요. 다들 하이로 갈 것 같으면 로우로 빠지는 게 이득!<br>
· 컴퓨터 플레이어는 성격대로 베팅해요: 🃏 승부사는 뻥이 많고, 🔥 직진형은 웬만하면 따라오고, 🧠 전략가·🔍 관찰자는 남의 레이즈를 무겁게 봐요. 큰 판을 잃으면 😤 흥분해서 헐거워지기도!<br>
· 왼쪽 🧠 테이블 읽기에서 각자의 레이즈·다이 버릇과 뻥 들킨 횟수를 보세요. 오래 고민하면… 어려운 패라는 뜻일지도.<br>
· 비공개 카드는 공개 순간까지 아무도 몰라요. 레이즈로 겁을 줘 보세요.</div>`;
window.GAMES.hilo = { _sync:x=>syncH(x), maxH:6,
  title:'수식 하이로우', ref:'데블스 플랜 「수식 하이 로우」', emoji:'🧮', tags:['심리전','두뇌서바이벌','NPC','카드'],
  tagline:'우리 둘 + 컴퓨터 4명, 6인 테이블. 숫자 카드로 20이나 1을 만들어 칩을 따는 수식 포커.',
  guide, init, apply, mask, ai, render, status, step, stepDelay, noPersona:true, wide:true,
  aiDelay:()=>1400+Math.random()*1800,
  reset(){ lastSay=Array(N).fill(0); lastEv=-1; },
  bar:(v,i)=>`<span class="score">🪙 ${v.chips[HSEAT[i]]}</span>${v.decl&&v.decl[HSEAT[i]]&&v.decl[HSEAT[i]]!=='?'?`<span class="tag">${v.decl[HSEAT[i]]==='hi'?'하이':'로우'}</span>`:''}`,
  result:(v,ctx)=>{ const r=v.rank||[]; const k=r.indexOf(HSEAT[ctx.me]); return k>=0?`${k+1}등 · 🪙${v.chips[HSEAT[ctx.me]]}`:''; },
};
})();
