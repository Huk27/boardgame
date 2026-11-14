(function(){
'use strict';
/* 예측승패 (피의 게임 시즌 3 · 4일차 메인 매치) — 3팀전을 3인(우리 둘 + NPC 1명)으로 다듬음.
   카드 72장: 빨·파·노·초 1~16 + 무색 100 네 장 + 무색 0 네 장. 각자 숫자 16장 + 100 + 0 = 18장, 나머지 18장은 턴마다 한 장씩 뒤집는 오픈 카드.
   6라운드 × 3턴. 라운드마다 첫 오픈 카드를 보고 내 덱에서 3장을 몰래 고른 뒤, 몇 턴 이길지(0~3) 한 명씩 공개 예측.
   턴: 선이 아무 카드 → 나머지는 선의 색을 따라야 하고, 없으면 오픈 카드 색, 둘 다 없으면 아무거나(100·0은 언제든).
   승리: 100(여럿이면 마지막) > 오픈 카드 색 최고 > 선의 색 최고. 0은 모두에게 짐(0만 나오면 먼저 낸 사람). 이긴 사람이 다음 턴 선.
   점수: 100점에서 시작. 예측 적중 = 승수×10 + 10, 빗나가면 차이×10 감점. 2배 아이템 1번(적중 시 두 배). 1·4라운드 전 총 승수 예측 적중 +50 / +30. */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로, 나머지는 NPC */
const N=3, ROUNDS=6, TR=3; let HSEAT=[0,1]; const SEATORD=[0,1,2];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i), ALL=[0,1,2], NS=()=>ALL.find(i=>!isH(i));
const nm=i=>`{s${i}}`;
const COL=['빨','파','노','초'], CLS=['r','b','y','g'];
const col=id=>id<64?id>>4:-1, num=id=>id<64?(id&15)+1:id<68?100:0;
const cname=id=>id<64?`${COL[col(id)]}${num(id)}`:String(num(id));
const STYLE={seojin:'logic', doyun:'warm', haram:'calm', yuna:'emo', minho:'sly', taekyung:'hot', jihu:'sly', soyul:'warm'};
const DEF_P={talk:.5,aggr:.5,trust:.5,bluff:.4,logic:.6,temper:.4};
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
const LINES={
  logic:{bid:['{n}승 예측합니다. 계산대로예요.','이 패면 {n}승이에요.'], win:['예상한 턴이에요.','계획대로.'], hit:['정확히 맞췄네요.','예측 적중. 숫자는 거짓말 안 해요.'], miss:['오차 {n}… 변수를 놓쳤어요.','계산이 틀렸네요.'], react:['{t}, 100을 거기서요?','{t}의 예측, 흥미롭네요.']},
  warm:{bid:['저는 {n}승만 할게요~ 😊','음… {n}승이요!'], win:['어머 이겼다 😊','헤헤 가져갈게요'], hit:['맞췄어요! 🙌','휴~ 예측 성공 😊'], miss:['아 {n}개 빗나갔어요 😢','다음엔 잘할게요 🥲'], react:['와 {t} 대단해요!','{t} 너무해요~ 😅']},
  calm:{bid:['…{n}.','{n}승.'], win:['…','…가져갑니다.'], hit:['…맞았네요.','…'], miss:['…{n} 차이.','…'], react:['…{t}.','…흠.']},
  emo:{bid:['{n}승! 느낌 와요 🤩','아 몰라 {n}승!'], win:['꺄 이겼다 😆','오예!!'], hit:['대박 맞췄어요!! 🥳','소름 정확해 😱'], miss:['으아 {n}개나 틀렸어 😭','망했다 ㅠㅠ'], react:['헐 {t} 미쳤다 😱','{t} 100 쓴 거 실화? 😵']},
  sly:{bid:['{n}승이라고 해 둘게요 😏','글쎄요, {n}승? 😏'], win:['고마워요~ 😏','예상했죠 😏'], hit:['당연하죠 😏','다 보였어요 😏'], miss:['일부러 {n}개 틀려 준 거예요 😏','흠, 운이 없네'], react:['{t}, 그거 실수죠? 😏','ㅋㅋ {t}']},
  hot:{bid:['{n}승! 무조건!','{n}승 갑니다 🔥'], win:['봤죠?! 🔥','당연히 제 거죠!'], hit:['맞췄다! 🔥','이게 실력이죠!'], miss:['아 진짜! {n}개 차이 😤','말도 안 돼 😤'], react:['{t}! 두고 봐요 😤','오 {t} 세다 🔥']},
};
function lineOf(s,i,kind,vars){ const st=STYLE[P(s,i).id]||'calm', L=(LINES[st]||LINES.calm)[kind]||LINES.calm[kind]; if(!L) return '';
  const used=(s.used[i]=s.used[i]||[]); const pool=L.filter(x=>!used.includes(x)); const raw=pool.length?U.pick(pool):U.pick(L); used.push(raw);
  return raw.replace(/\{n\}/g,vars&&vars.n!=null?vars.n:'').replace(/\{t\}/g,vars&&vars.t!=null?nm(vars.t):''); }

function sayF(s,i,t,kind,tg){ s.say={seat:i,text:t,n:(s.say?s.say.n:0)+1}; (s.feed=s.feed||[]).push({r:s.round,seat:i,text:t,kind:kind||'say',t:tg??null}); }
const RMK={taunt:['😏 이번 판은 제가 가져갈게요.','😏 다들 긴장하세요~','😏 그 정도로는 저 못 이겨요.'],praise:['👍 와, 방금 거 잘했어요!','👍 대단한데요?','👍 인정, 잘하시네요.'],boast:['😎 이번 라운드 1등은 저예요.','😎 제 패, 엄청 좋아요.','😎 예측? 이미 끝났어요.']};
const RPL={taunt:['말은 쉽죠 😏','두고 봐요!','오, 자신감 좋네요.','그 말 후회하게 해 줄게요 😤'],praise:['고마워요 😊','칭찬해도 안 봐줘요 😏','헤헤, 운이 좋았어요.'],boast:['정말요? 🤨','그건 결과로 보여 줘요.','뻥 같은데요? 😏','…표정 보니까 진짜 같기도 하고.']};
function init(starter,o){ const k=Math.max(2,Math.min(3,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  const nums=U.shuffle([...Array(64).keys()]); const deck=ALL.map((i)=>nums.slice(i*16,i*16+16).concat([64+i,68+i]).sort((a,b)=>a-b));
  const open=U.shuffle(nums.slice(48).concat([67,71]));
  const s={phase:'intro', who:{}, starter:starter|0, deck, open, oi:0, round:0, hand:[[],[],[]], pick:[null,null,null], bid:[null,null,null], won:[0,0,0], dbl:[false,false,false], dblNow:[false,false,false],
    score:[100,100,100], tbid:[[null,null],[null,null],[null,null]], tw:[0,0,0], hist:[], trick:[], trickN:0, lead:null, actor:null, order:[], bi:0, played:[], q:[], say:null, used:{}, log:[],
    turn:null, winner:null, ev:0, think:0, dlist:[], dj:0, notice:'🎙️ 메인 매치 「예측승패」 — 몇 턴을 이길지 정확히 맞히세요'};
  s.hs=HSEAT.slice(); const cs=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=cs[k]); return s;
}
const curOpen=s=>s.open[s.oi];
/* 🏆 시즌 관계(NPCS.rel): 시즌이 아니면 0 — 동맹엔 다정하게, 앙숙엔 차갑게, 1라운드 시작 때 한마디 */
const RL=(s,i,j)=>{ if(isH(i)||j==null||!window.NPCS||!NPCS.rel||!s.who) return 0; try{ return NPCS.rel(s.who[i], isH(j)?(pOf(j)===0?'me':'opp'):s.who[j])||0; }catch(_){ return 0; } };
const SRL={cold:{taunt:['또 시작이네요. 휴식 시간에도 그러더니 😒','그 말, 로비 때도 했죠? 이번엔 안 넘어가요.'],praise:['칭찬해도 데스매치 때 일은 안 잊어요 😒','갑자기 왜 칭찬이에요? 수상한데요.'],boast:['허세는 여전하네요 😒','이번 판은 꼭 꺾어 줄게요.']},
  warm:{taunt:['우리 사이에 그러기예요? ㅋㅋ','살살 해요, 같은 편이잖아요 😆'],praise:['역시 믿을 만한 사람이에요 🤝','고마워요, 끝까지 같이 가요!'],boast:['좋아요, 그래도 둘 다 살아남아요 🤝','잘됐네요! 우리 둘 다 올라가요.']}};
function seasonOpen(s){ if(s.round!==1) return; let b=null; for(const i of ALL) for(const j of ALL){ if(i===j||isH(i)) continue; const r=RL(s,i,j); if(Math.abs(r)>.35&&(!b||Math.abs(r)>Math.abs(b[2]))) b=[i,j,r]; } if(!b) return;
  const [i,j,r]=b; (s.rq=s.rq||[]).push({i,t:j,kind:r>0?'thanks':'angry',text: r>0 ? U.pick([`${nm(j)}, 이번 판도 같이 살아남아요 🤝`,`${nm(j)}, 여기까지 같이 왔는데 끝까지 가요!`]) : U.pick([`${nm(j)}, 지난 회차 일 있으니까 봐주는 거 없어요 😤`,`${nm(j)}, 이 판에서 갚아 줄게요.`])}); }
function startRound(s){
  s.round++; seasonOpen(s); s.phase='wait'; s.actor=null; s.turn=null; s.hand=[[],[],[]]; s.pick=[null,null,null]; s.bid=[null,null,null]; s.won=[0,0,0]; s.dblNow=[false,false,false]; s.trick=[]; s.trickN=0;
  s.lead=(s.starter+s.round-1)%N; s.order=[0,1,2].map(k=>(s.lead+k)%N);
  s.q.push({k:'note',text:`🎙️ ${s.round}라운드 — 첫 오픈 카드는 ${cname(curOpen(s))}`});
  if(s.round===1||s.round===4) s.q.push({k:'tbid'}); else s.q.push({k:'pick'});
}
function beginTbid(s){ s.phase='tbid'; s.turn=null; s.actor=null; s.notice=`🔮 ${s.round===1?'첫':'두 번째'} 총 승수 예측 — 게임 끝까지 몇 턴(0~18)을 이길까요? (적중 +${s.round===1?50:30})`; }
function beginPick(s){ s.phase='pick'; s.turn=null; s.actor=null; s.notice=`🃏 내 덱에서 이번 라운드에 쓸 3장을 몰래 고르세요 (남은 ${ROUNDS-s.round+1}라운드)`; }
function beginBid(s){ s.phase='bid'; s.bi=0; setActor(s,s.order[0]); s.notice=`🗣️ ${nm(s.order[0])}부터 예측 — 몇 턴 이길까요?`; }
function setActor(s,i){ s.actor=i; s.turn=isH(i)?pOf(i):null; s.think=isH(i)?0:thinkFor(s,i); }
function thinkFor(s,i,w){ const p=P(s,i); return Math.round((900+(w==null?.5:w)*2200)*(1.25-p.temper*.5)*(.7+p.logic*.5)+Math.random()*500); }
/* 내는 규칙 */
function leadColor(tr){ for(const x of tr) if(col(x.c)>=0) return col(x.c); return -1; }
function legal(hand,tr,open){ if(!tr.length) return hand.slice(); const L=leadColor(tr), T=col(open);
  const spec=hand.filter(c=>c>=64);
  if(L>=0&&hand.some(c=>col(c)===L)) return hand.filter(c=>col(c)===L).concat(spec);
  if(T>=0&&hand.some(c=>col(c)===T)) return hand.filter(c=>col(c)===T).concat(spec);
  return hand.slice(); }
function judge(tr,open){ const h=tr.filter(x=>num(x.c)===100); if(h.length) return h[h.length-1].seat;
  const nz=tr.filter(x=>x.c<64); if(!nz.length) return tr[0].seat;
  const T=col(open), tt=nz.filter(x=>col(x.c)===T); if(T>=0&&tt.length) return tt.sort((a,b)=>num(b.c)-num(a.c))[0].seat;
  const L=leadColor(tr); return nz.filter(x=>col(x.c)===L).sort((a,b)=>num(b.c)-num(a.c))[0].seat; }
/* 공용 동작 */
function act(s,i,a){
  if(a.k==='tbid'){ if(s.phase!=='tbid') return '지금은 총 승수 예측이 아니에요'; const k=s.round===1?0:1; if(s.tbid[i][k]!=null) return '이미 예측했어요'; const n=a.n|0; if(n<0||n>18) return '0~18 사이로'; s.tbid[i][k]=n; return null; }
  if(a.k==='pick'){ if(s.phase!=='pick') return '지금은 카드를 고를 때가 아니에요'; if(s.pick[i]) return '이미 골랐어요';
    const c=[...new Set((a.c||[]).map(x=>x|0))]; const need=Math.min(TR,s.deck[i].length); if(c.length!==need||c.some(x=>!s.deck[i].includes(x))) return `내 덱에서 ${need}장을 고르세요`;
    s.pick[i]=c; return null; }
  if(a.k==='bid'){ if(s.phase!=='bid'||s.actor!==i) return '내 예측 차례가 아니에요'; const n=a.n|0; if(n<0||n>TR) return '0~3 사이로';
    if(a.dbl&&s.dbl[i]) return '2배 아이템은 이미 썼어요'; s.bid[i]=n; if(a.dbl){ s.dbl[i]=true; s.dblNow[i]=true; }
    s.log.push(`🗣️ ${nm(i)}: ${n}승 예측${a.dbl?' ✖️2':''}`); s.notice=`🗣️ ${nm(i)}: ${n}승 예측${a.dbl?' — ✖️2 아이템!':''}`;
    if(!isH(i)){ const t=lineOf(s,i,'bid',{n}); if(t) sayF(s,i,t); }
    s.bi++; s.turn=null; s.q.push({k:s.bi>=N?'play':'nextBid'}); return null; }
  if(a.k==='play'){ if(s.phase!=='play'||s.actor!==i) return '내 차례가 아니에요'; const c=a.c|0; if(!s.hand[i].includes(c)) return '손에 없는 카드예요';
    if(!legal(s.hand[i],s.trick,curOpen(s)).includes(c)) return '색을 따라야 해요 (선의 색 → 없으면 오픈 카드 색)';
    s.hand[i]=s.hand[i].filter(x=>x!==c); s.trick.push({seat:i,c}); s.played.push(c);
    s.notice=`🂠 ${nm(i)}: ${cname(c)}`; s.log.push(s.notice); s.turn=null;
    if(num(c)===100){ const o=ALL.filter(j=>j!==i&&!isH(j)); if(o.length&&Math.random()<.6) s.q.push({k:'react',i:o[0],by:i}); }
    s.q.push({k:s.trick.length>=N?'judge':'nextPlay'}); return null; }
  return '알 수 없는 동작';
}
function stepDelay(s){ syncH(s); if(s.rq&&s.rq.length&&s.winner==null) return 1500;
  if(s.winner!=null) return null;
  if(s.phase==='intro') return 2200;
  if(s.q.length){ const k=s.q[0].k; return k==='note'?1700 : k==='judge'?1300 : k==='react'?1200 : k==='score'?1600 : k==='clear'?1600 : k==='tfin'?1700 : k==='note2'?2200 : 450; }
  if(s.phase==='tbid'){ const k=s.round===1?0:1; return s.tbid.every(x=>x[k]!=null) ? 600 : (NS()!=null&&s.tbid[NS()][k]==null?1500:null); }
  if(s.phase==='pick') return s.pick.every(Boolean) ? 600 : (NS()!=null&&!s.pick[NS()]?1800:null);
  if(s.phase==='bid'||s.phase==='play') return isH(s.actor)?null:s.think;
  if(s.phase==='debrief') return s.dj<s.dlist.length?2200:1200;
  return null;
}
function step(s){ syncH(s); if(s.rq&&s.rq.length){ const e=s.rq.shift(); if(e.text){ sayF(s,e.i,e.text,e.kind||'say',e.t); s.ev++; return; } const sr=RL(s,e.i,e.t), L=(sr<-.25?SRL.cold[e.kind]:sr>.25?SRL.warm[e.kind]:null)||RPL[e.kind]; const used=((s.usedR=s.usedR||{})[e.i]=s.usedR[e.i]||[]); const c=L.filter(x=>!used.includes(x)); const t=U.pick(c.length?c:L); used.push(t); sayF(s,e.i,t,e.kind==='praise'?'thanks':e.kind==='taunt'?'angry':'reply',e.t); s.ev++; return; }
  if(s.phase==='intro'){ startRound(s); s.ev++; return; }
  if(s.q.length){ const e=s.q.shift();
    if(e.k==='note'){ s.notice=e.text; s.log.push(e.text); }
    else if(e.k==='tbid') beginTbid(s); else if(e.k==='pick') beginPick(s);
    else if(e.k==='nextBid'){ const i=s.order[s.bi]; setActor(s,i); s.notice=`🗣️ ${nm(i)} 예측 차례`; }
    else if(e.k==='play'){ s.phase='play'; s.trick=[]; setActor(s,s.lead); s.notice=`🎴 ${s.trickN+1}턴 — 오픈 카드 ${cname(curOpen(s))} · ${nm(s.lead)} 선`; s.log.push(s.notice); }
    else if(e.k==='nextPlay'){ const i=(s.trick[s.trick.length-1].seat+1)%N; setActor(s,i); }
    else if(e.k==='judge'){ const w=judge(s.trick,curOpen(s)); s.won[w]++; s.tw[w]++; s.lead=w; s.lastWin={w,trick:s.trick.slice(),open:curOpen(s)};
      s.notice=`🏆 ${s.trickN+1}턴은 ${nm(w)} 승리! (${cname(s.trick.find(x=>x.seat===w).c)})`; s.log.push(s.notice);
      if(!isH(w)&&Math.random()<P(s,w).talk){ const t=lineOf(s,w,'win'); if(t) sayF(s,w,t); }
      s.trickN++; s.oi++; s.q.push({k:'clear'}); }
    else if(e.k==='clear'){ s.trick=[]; if(s.trickN<TR){ s.order=[0,1,2].map(k=>(s.lead+k)%N); setActor(s,s.lead); s.notice=`🎴 ${s.trickN+1}턴 — 새 오픈 카드 ${cname(curOpen(s))} · ${nm(s.lead)} 선`; s.log.push(s.notice); }
      else { s.phase='score'; s.actor=null; s.turn=null; ALL.forEach(i=>s.q.push({k:'score',i})); s.q.push({k:'rend'}); } }
    else if(e.k==='score'){ const i=e.i, d=Math.abs(s.won[i]-s.bid[i]); let g;
      if(!d){ g=(s.won[i]*10+10)*(s.dblNow[i]?2:1); } else g=-10*d; s.score[i]+=g; (s.rd=s.rd||{})[i]=g;
      s.notice=`${d?'❌':'⭕'} ${nm(i)}: 예측 ${s.bid[i]} · 실제 ${s.won[i]}승 → ${g>0?'+':''}${g}점${s.dblNow[i]&&!d?' (✖️2)':''}`; s.log.push(s.notice);
      if(!isH(i)){ const t=lineOf(s,i,d?'miss':'hit',{n:d}); if(t) sayF(s,i,t); } }
    else if(e.k==='rend'){ s.hist.push({r:s.round,bid:s.bid.slice(),won:s.won.slice(),g:ALL.map(i=>s.rd[i]),dbl:s.dblNow.slice()}); s.rd={};
      if(s.oi<s.open.length&&s.round<ROUNDS){ startRound(s); } else finalScore(s); }
    else if(e.k==='tfin'){ const i=e.i; const b=s.tbid[i]; let g=0; if(b[0]===s.tw[i]) g+=50; if(b[1]===s.tw[i]) g+=30; s.score[i]+=g;
      s.notice=`🔮 ${nm(i)}: 총 승수 ${s.tw[i]} — 예측 ${b[0]} / ${b[1]} ${g?`→ +${g}점`:'→ 빗나감'}`; s.log.push(s.notice); }
    else if(e.k==='end'){ s.phase='debrief'; s.dlist=ALL.filter(i=>!isH(i)); s.dj=0; }
    else if(e.k==='react'){ const t=lineOf(s,e.i,'react',{t:e.by}); if(t){ sayF(s,e.i,t); s.log.push(`${nm(e.i)}: ${t}`); } }
    s.ev++; return; }
  if(s.phase==='tbid'){ const k=s.round===1?0:1; const n2=NS(); if(n2!=null&&s.tbid[n2][k]==null){ act(s,n2,{k:'tbid',n:decideTbid(viewOf(s,n2),n2,1)}); s.log.push(`🔮 ${nm(n2)} 총 승수 예측 완료`); s.ev++; return; }
    if(s.tbid.every(x=>x[k]!=null)){ s.q.push({k:'note',text:`🔮 총 승수 예측 공개 — ${ALL.map(i=>`${nm(i)} ${s.tbid[i][k]}`).join(' · ')}`}); s.q.push({k:'pick'}); s.phase='wait'; s.ev++; return; } }
  if(s.phase==='pick'){ const n2=NS(); if(n2!=null&&!s.pick[n2]){ act(s,n2,{k:'pick',c:decidePick(viewOf(s,n2),n2,1)}); s.log.push(`🃏 ${nm(n2)} 3장 고름`); s.ev++; return; }
    if(s.pick.every(Boolean)){ ALL.forEach(i=>{ s.hand[i]=s.pick[i].slice().sort((a,b)=>a-b); s.deck[i]=s.deck[i].filter(c=>!s.pick[i].includes(c)); }); s.phase='wait'; s.q.push({k:'note',text:'🃏 모두 3장을 골랐어요'}); s.q.push({k:'bidStart'}); s.ev++; return; } }
  if((s.phase==='bid'||s.phase==='play')&&!isH(s.actor)){ const v=viewOf(s,s.actor); const a = s.phase==='bid' ? decideBid(v,s.actor,1) : {k:'play',c:decidePlay(v,s.actor,1)}; const e=act(s,s.actor,a); if(e) console.warn('npc',e,a); s.ev++; return; }
  if(s.phase==='debrief'){ if(s.dj<s.dlist.length){ const i=s.dlist[s.dj++]; const best=s.hist.filter(h=>h.g[i]>0).sort((a,b)=>b.g[i]-a.g[i])[0];
      const t= best ? `(속마음) ${best.r}라운드 ${best.won[i]}승 예측이 제일 짜릿했어요. 패를 3장 고를 때부터 계산했거든요` : '(속마음) 이번엔 카드 배분이 꼬였어요… 다음엔 꼭';
      sayF(s,i,t); s.log.push(`💭 ${nm(i)}: ${t}`); s.ev++; return; }
    s.phase='over'; const a=s.score[0], b=s.score[1]; s.winner=a>b?0:b>a?1:'both'; { const mx=Math.max(...HSEAT.map(h=>s.score[h])); s.winners=HSEAT.map((h,p)=>s.score[h]===mx?p:-1).filter(x=>x>=0); } s.ev++; return; }
}
/* bidStart 처리는 step의 q에서 */
const _step=step;
function step2(s){ if(s.q.length&&s.q[0].k==='bidStart'){ s.q.shift(); beginBid(s); s.ev++; return; } return _step(s); }
function finalScore(s){ s.phase='final'; s.actor=null; s.turn=null; s.q.push({k:'note',text:'🎙️ 6라운드 끝! 총 승수 예측을 확인합니다'}); ALL.forEach(i=>s.q.push({k:'tfin',i}));
  s.q.push({k:'note2'}); s.q.push({k:'end'}); }
/* 컴퓨터: 자기 자리에서 보이는 것만 */
function viewOf(s,i){ const v=U.clone(s), open=s.phase==='over'||s.phase==='debrief';
  v.deck=s.deck.map((d,j)=>j===i||open?d.slice():null); v.dc=s.deck.map(d=>d.length);
  v.hand=s.hand.map((h,j)=>j===i||open?h.slice():null); v.hc=s.hand.map(h=>h.length);
  v.pick=s.pick.map((p,j)=>j===i?p:(p?'done':null));
  v.tbid=s.tbid.map((b,j)=>j===i||s.phase!=='tbid'?b:b.map(x=>x==null?null:'?'));
  v.openNow=curOpen(s); v.open=null; v.oleft=s.open.length-s.oi; v.q=[]; v.used={}; return v; }
const LV=[{sub:6,sim:12,noise:.4},{sub:18,sim:30,noise:.08},{sub:30,sim:60,noise:0}];
function unknownPool(v,i){ const known=new Set([...v.deck[i],...(v.hand[i]||[]),...v.played,v.openNow,...(v.trick||[]).map(x=>x.c)]); const o=[]; for(let c=0;c<72;c++) if(!known.has(c)) o.push(c); return o; }
/* 남은 턴을 단순 규칙으로 굴려 승수 분포 */
function simPlay(hands,lead,opens,want){ const won=[0,0,0]; let ld=lead;
  for(let t=0;t<opens.length&&hands[0].length;t++){ const op=opens[t], tr=[];
    for(let k=0;k<N;k++){ const p=(ld+k)%N, lg=legal(hands[p],tr,op); const c=quickPick(lg,tr,op,want?want[p]-won[p]:1, hands[p].length); hands[p]=hands[p].filter(x=>x!==c); tr.push({seat:p,c}); }
    const w=judge(tr,op); won[w]++; ld=w; }
  return won; }
function wouldWin(c,tr,op,seat){ return judge(tr.concat([{seat,c}]),op)===seat; }
function strength(c,op){ const n=num(c); if(n===100) return 100; if(n===0) return -1; return (col(c)===col(op)?40:0)+n; }
function quickPick(lg,tr,op,need,left){ const seat=-9;
  if(!tr.length){ const srt=lg.slice().sort((a,b)=>strength(b,op)-strength(a,op)); return need>0 ? srt[0] : srt[srt.length-1]; }
  const wins=lg.filter(c=>wouldWin(c,tr,op,seat)), loses=lg.filter(c=>!wouldWin(c,tr,op,seat));
  if(need>0&&wins.length) return wins.sort((a,b)=>strength(a,op)-strength(b,op))[tr.length===N-1?0:wins.length-1];
  if(need<=0&&loses.length) return loses.sort((a,b)=>strength(b,op)-strength(a,op))[0];
  return lg.slice().sort((a,b)=>strength(a,op)-strength(b,op))[need>0?lg.length-1:0]; }
function distFor(v,i,hand,L,firstOpen,myWant){ const pool=unknownPool(v,i).filter(c=>!hand.includes(c)); const D=[0,0,0,0];
  const want=ALL.map(j=> j===i ? (myWant==null?1:myWant) : (v.bid&&typeof v.bid[j]==='number'?v.bid[j]:1));
  for(let t=0;t<L.sim;t++){ const pl=U.shuffle(pool.slice()); const hands=ALL.map(j=> j===i?hand.slice() : (v.hand&&v.hand[j]&&v.hand[j].length&&j===i)?v.hand[j].slice() : pl.splice(0,TR));
    const opens=[firstOpen].concat(pl.splice(0,TR-1)); const won=simPlay(hands,v.lead,opens,want); D[Math.min(TR,won[i])]++; }
  return D.map(x=>x/L.sim); }
const evBid=(D,k,dbl)=> D.reduce((a,p,w)=>a+p*(w===k?(k*10+10)*(dbl?2:1):-10*Math.abs(w-k)),0);
function bestBid(D){ let b=0,bv=-1e9; for(let k=0;k<=TR;k++){ const e=evBid(D,k,false); if(e>bv){ bv=e; b=k; } } return [b,bv]; }
const cardVal=c=>num(c)===100?6:num(c)===0?2:num(c)/4;
function decidePick(v,i,lvl){ const L=LV[lvl==null?1:lvl], d=v.deck[i]; if(d.length<=TR) return d.slice();
  const roundsLeft=ROUNDS-v.round+1, avgV=d.reduce((a,c)=>a+cardVal(c),0)/d.length;
  const cands=[]; const srt=d.slice().sort((a,b)=>cardVal(a)-cardVal(b));
  cands.push(srt.slice(0,3), srt.slice(-3), [srt[0],srt[srt.length>>1],srt[srt.length-1]]);
  for(let k=0;k<L.sub;k++) cands.push(U.shuffle(d.slice()).slice(0,3));
  let best=cands[0], bv=-1e9;
  for(const h of cands){ const D=distFor(v,i,h,L,v.openNow); const [,e]=bestBid(D); const used=h.reduce((a,c)=>a+cardVal(c),0)-avgV*3; const val=e-used*(roundsLeft>1?2.2:0)+(Math.random()-.5)*L.noise*20; if(val>bv){ bv=val; best=h; } }
  return best; }
function decideBid(v,i,lvl){ const L=LV[lvl==null?1:lvl]; let b=0, bv=-1e9, D=null;
  for(let k=0;k<=TR;k++){ const Dk=distFor(v,i,v.hand[i],{sim:L.sim*2},v.openNow, lvl===0?null:k); const e=evBid(Dk,k,false); if(e>bv){ bv=e; b=k; D=Dk; } }
  if(Math.random()<[.35,.15,0][lvl==null?1:lvl]) b=Math.max(0,Math.min(TR,b+(Math.random()<.6?1:-1)));
  const conf=D[b]; const dbl=!v.dbl[i]&&((conf>.6&&b>=1)||(v.round===ROUNDS&&conf>.35));
  return {k:'bid', n:b, dbl}; }
function decidePlay(v,i,lvl){ const lg=legal(v.hand[i],v.trick,v.openNow); if(lg.length===1) return lg[0]; const need=v.bid[i]-v.won[i];
  if(Math.random()<[.3,.1,0][lvl==null?1:lvl]) return U.pick(lg);
  if(lvl!==2) return quickPick(lg,v.trick,v.openNow,need,v.hand[i].length);
  /* 어려움: 후보마다 남은 턴을 굴려 예측 적중 확률이 가장 높은 카드 */
  let best=lg[0], bv=-1; const pool=unknownPool(v,i);
  for(const c of lg){ let hit=0; for(let t=0;t<40;t++){ const pl=U.shuffle(pool.slice()); const played=new Set(v.trick.map(x=>x.seat));
      const hands=ALL.map(j=> j===i ? v.hand[i].filter(x=>x!==c) : pl.splice(0, v.hc[j]-(played.has(j)?0:1)));
      const tr=v.trick.concat([{seat:i,c}]); const after=[]; for(let k=0;k<N;k++){ const p=(v.trick.length?v.trick[0].seat:i); const sp=(p+k)%N; if(!tr.some(x=>x.seat===sp)) after.push(sp); }
      for(const sp of after){ const lg2=legal(hands[sp].concat(pl.splice(0,1)),tr,v.openNow); const cc=quickPick(lg2,tr,v.openNow,1,1); tr.push({seat:sp,c:cc}); hands[sp]=hands[sp].filter(x=>x!==cc); }
      const w=judge(tr,v.openNow); const won=v.won.slice(); won[w]++;
      const rest=v.hand[i].length-1; let fin=won[i]; if(rest>0){ const opens=pl.splice(0,rest); const hs=ALL.map(j=>j===i?v.hand[i].filter(x=>x!==c):pl.splice(0,rest)); const want=v.bid.map((b,j)=>b==null?1:b); const ww=simPlay(hs,w,opens,want.map((b,j)=>b-0)); fin+=ww[i]; }
      if(fin===v.bid[i]) hit++; }
    if(hit>bv){ bv=hit; best=c; } }
  return best; }
function decideTbid(v,i,lvl){ const d=(v.deck[i]||[]).concat(v.hand[i]||[]); const pw=d.reduce((a,c)=>a+cardVal(c),0); const remR=ROUNDS-v.round+1;
  const exp = v.tw[i] + remR*TR*Math.min(.6,Math.max(.12, pw/(d.length||1)/7.5)); return Math.max(0,Math.min(18,Math.round(exp))); }
function ai(v,lvl){ syncH(v); const i=HSEAT[1];
  if(v.phase==='tbid'){ const k=v.round===1?0:1; if(v.tbid[i][k]==null) return {k:'tbid', n:decideTbid(v,i,lvl)}; return null; }
  if(v.phase==='pick'&&!v.pick[i]) return {k:'pick', c:decidePick(v,i,lvl)};
  if(v.phase==='bid'&&v.actor===i) return decideBid(v,i,lvl);
  if(v.phase==='play'&&v.actor===i) return {k:'play', c:decidePlay(v,i,lvl)};
  return null; }
function aiDelay(S){ if(S.phase==='play') return 900+Math.random()*1500; if(S.phase==='bid') return 1400+Math.random()*1800; return 1800+Math.random()*2500; }
function mask(s,p){ syncH(s); const v=viewOf(s,HSEAT[p]); return v; }
function remark(s,seat,kind,t){ s.rm=s.rm||{}; if(s.rm[seat]===s.round+':'+kind) return '이번 라운드엔 이미 했어요'; s.rm[seat]=s.round+':'+kind; const L=RMK[kind]; if(!L) return '알 수 없는 말'; sayF(s,seat,U.pick(L),kind,t);
  const others=ALL.filter(j=>!isH(j)); const r=t!=null&&!isH(t)?t:U.pick(others); if(r!=null){ (s.rq=s.rq||[]).push({i:r,kind,t:seat}); } return null; }
function apply(s,p,a){ syncH(s); if(a&&a.k==='remark'){ if(s.winner!=null) return '게임이 끝났어요'; const e=remark(s,HSEAT[p],a.kind,a.t); if(!e) s.ev++; return e; } if(s.winner!=null) return '게임이 끝났어요'; if(!a) return '알 수 없는 동작'; if(s.q.some(e=>!['note','react'].includes(e.k))) return '잠시만요 — 진행 중이에요';
  const e=act(s,HSEAT[p],a); if(!e) s.ev++; return e; }
const stepFn=s=>{ if(s.q.length&&s.q[0].k==='note2'){ s.q.shift(); const r=ALL.slice().sort((a,b)=>s.score[b]-s.score[a]); s.notice=`🏁 최종 — ${r.map((i,k)=>`${k+1}위 ${nm(i)} ${s.score[i]}점`).join(' · ')}`; s.log.push(s.notice); s.ev++; return; } return step2(s); };

/* 화면 */
let WHO={}, sel=[], tb=6, bidN=1, useDbl=false, sig='';
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function josa(name,a,b){ const base=name.replace(/\(나\)$/,''), c=base.charCodeAt(base.length-1); return c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28 ? a : b; }
const JO={'이(가)':['이','가'],'은(는)':['은','는'],'을(를)':['을','를']};
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}(이\(가\)|은\(는\)|을\(를\)|부터)?/g,(_,d,j)=>{ const n=seatName(+d,ctx); return `${seatEmoji(+d)} ${n}${j==='부터'?'부터':j?josa(n,JO[j][0],JO[j][1]):''}`; }); }
const card=(c,cls,attr)=>`<span class="pw-card ${c<64?CLS[col(c)]:num(c)===100?'h':'z'} ${cls||''}" ${attr||''}>${num(c)}</span>`;
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{}; const me=HSEAT[ctx.me]; const myTurn=v.turn===ctx.me;
  const sg=v.round+':'+v.phase+':'+v.trickN; if(sg!==sig){ sig=sg; sel=[]; useDbl=false; }
  let h=`<div class="hl-notice">${fill(U.esc(v.notice||''),ctx)}</div>`;
  h+=`<div class="vr-speech">${v.say?`<span class="w">${seatEmoji(v.say.seat)} ${seatName(v.say.seat,ctx)}</span> ${fill(U.esc(v.say.text),ctx)}`:'<i>　</i>'}</div>`;
  h+=`<div class="info">${Math.max(1,v.round)}/${ROUNDS}라운드 · ${Math.min(TR,v.trickN+1)}/${TR}턴 · 남은 오픈 카드 ${v.oleft}장</div>`;
  h+=`<div class="pw-seats">${ALL.map(i=>{ const tp=v.trick.find(x=>x.seat===i);
      return `<div class="pw-seat ${i===me?'me':''} ${v.actor===i?'act':''}"><div class="ev-nm">${seatEmoji(i)} ${seatName(i,ctx)}</div>${isH(i)?'':`<small class="ev-arch">${NPCI(i)[2]}</small>`}
      <div class="pw-sc">${v.score[i]}점 ${v.dbl[i]?'<small>✖️2 씀</small>':''}</div>
      <div class="pw-bw">예측 <b>${v.bid[i]==null?'-':v.bid[i]}</b>${v.dblNow[i]?'✖️2':''} · 승 <b>${v.won[i]}</b></div>
      <div class="pw-tp">${tp?card(tp.c,'mid'):(v.phase==='play'?'<span class="pw-ph">　</span>':'')}</div>
      <small>${v.phase==='pick'?(v.pick[i]?'✅ 골랐음':'💭 고르는 중'):`덱 ${v.dc[i]}장`}</small></div>`; }).join('')}</div>`;
  if(v.openNow!=null&&v.round>0) h+=`<div class="pw-open"><small>오픈 카드</small>${card(v.openNow,'big')}<small>${col(v.openNow)>=0?`${COL[col(v.openNow)]}색이 이번 턴 으뜸`:'으뜸 색 없음 — 선의 색으로만'}</small></div>`;
  const lg = v.phase==='play'&&myTurn ? legal(v.hand[me],v.trick,v.openNow) : [];
  if(v.phase==='pick'&&!v.pick[me]){ const d=v.deck[me]; const need=Math.min(TR,d.length);
    h+=`<div class="vr-card"><b>🃏 이번 라운드 3장</b> <small>${sel.length}/${need} · 남은 덱 ${d.length}장 (라운드당 3장씩 다 써요)</small><div class="pw-deck">${d.map(c=>`<button class="pw-cb ${sel.includes(c)?'sel':''}" data-c="${c}">${card(c)}</button>`).join('')}</div>
      <div class="fh-act"><button data-a="pick" ${sel.length===need?'':'disabled'}>이 3장으로</button></div></div>`; }
  else if(v.hand[me]&&v.hand[me].length){ h+=`<div class="pw-hand"><small>내 손패</small><div>${v.hand[me].map(c=>`<button class="pw-cb ${lg.includes(c)?'ok':''}" data-p="${c}" ${lg.includes(c)?'':'disabled'}>${card(c,'big')}</button>`).join('')}</div>${myTurn&&v.phase==='play'?'<small>낼 카드를 누르세요 (흐린 카드는 색 규칙상 못 내요)</small>':''}</div>`; }
  if(v.phase==='tbid'){ const k=v.round===1?0:1; if(v.tbid[me][k]==null) h+=`<div class="vr-card"><b>🔮 총 승수 예측</b> <small>6라운드 18턴 중 내가 이길 턴 수 · 적중 +${k?30:50}</small><div class="bs-amt"><button class="ghost" data-a="tm">−</button><b>${tb}승</b><button class="ghost" data-a="tp">+</button></div><div class="fh-act"><button data-a="tbid">예측</button></div></div>`;
    else h+=`<div class="vr-card"><small>예측 완료 (${v.tbid[me][k]}승) — 다른 사람을 기다려요</small></div>`; }
  if(v.phase==='bid'&&myTurn){ h+=`<div class="vr-card"><b>🗣️ 몇 턴 이길까요?</b><div class="fh-act">${[0,1,2,3].map(n=>`<button class="${bidN===n?'':'ghost'}" data-bn="${n}">${n}승</button>`).join('')}</div>
      ${v.dbl[me]?'<small>✖️2 아이템은 이미 썼어요</small>':`<label class="kq-imm"><input type="checkbox" data-dbl ${useDbl?'checked':''}> ✖️2 아이템 (게임 중 한 번 · 적중하면 점수 두 배)</label>`}
      <div class="fh-act"><button data-a="bid">${bidN}승 예측</button></div><small>적중: 승수×10+10 · 빗나감: 차이×10 감점</small></div>`; }
  if(v.phase==='over') h+=`<div class="sn-score">${ALL.slice().sort((a,b)=>v.score[b]-v.score[a]).map(i=>`<div class="${isH(i)?'h':''}"><b>${seatEmoji(i)} ${seatName(i,ctx)}</b> ${v.score[i]}점 <small>총 ${v.tw[i]}승 · 예측 ${v.tbid[i].join('/')}</small></div>`).join('')}</div>`;
  const L=U.politics(v.feed||[],{seats:ALL,emo:seatEmoji,name:i=>seatName(i,ctx),me})+`<div class="side-box"><div class="side-h">📊 라운드 기록</div><table class="pw-tab"><tr><th></th>${ALL.map(i=>`<th>${seatEmoji(i)}</th>`).join('')}</tr>${v.hist.map(x=>`<tr><td>${x.r}R</td>${ALL.map(i=>`<td class="${x.g[i]>0?'ok':'no'}">${x.bid[i]}/${x.won[i]}${x.dbl[i]?'✖️2':''}<br><small>${x.g[i]>0?'+':''}${x.g[i]}</small></td>`).join('')}</tr>`).join('')}
    <tr><td>총</td>${ALL.map(i=>`<td><b>${v.score[i]}</b></td>`).join('')}</tr><tr><td>🔮</td>${ALL.map(i=>`<td><small>${v.tbid[i].map(x=>x==null?'-':x).join('/')}<br>지금 ${v.tw[i]}승</small></td>`).join('')}</tr></table>
    <div class="side-h" style="margin-top:8px">🧭 나온 카드</div><div class="pw-seen">${(v.played||[]).slice(-27).map(c=>card(c,'xs')).join('')||'<small>-</small>'}</div></div>`;
  const R=U.chat(v.feed||[],{emo:seatEmoji,name:i=>seatName(i,ctx),fill:t=>fill(t,ctx),me})+`<div class="side-box side-log"><div class="side-h">📜 진행 기록 <small>최근이 위</small></div>${v.log.slice(-70).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  if(v.phase!=='over'&&v.winner==null) h+=`<div class="fh-act rmk-row"><small>🗣️ 한마디</small><button class="ghost small" data-rmk="taunt">😏 도발</button><button class="ghost small" data-rmk="praise">👍 칭찬</button><button class="ghost small" data-rmk="boast">😎 자신만만</button></div>`;
  el.innerHTML=`<div class="side3 has-chat"><div class="side-mid">${h}</div><aside class="side-l">${L}</aside><aside class="side-r">${R}</aside></div>`;
  el.onchange=e=>{ if(e.target.matches('[data-dbl]')) useDbl=e.target.checked; };
  el.onclick=e=>{ const rk=e.target.closest('[data-rmk]'); if(rk) return ctx.act({k:'remark',kind:rk.dataset.rmk});
    const c=e.target.closest('[data-c]'); if(c){ const x=+c.dataset.c; sel = sel.includes(x)?sel.filter(y=>y!==x):(sel.length<TR?sel.concat([x]):sel); return ctx.rerender(); }
    const p=e.target.closest('[data-p]'); if(p&&!p.disabled) return ctx.act({k:'play',c:+p.dataset.p});
    const bn=e.target.closest('[data-bn]'); if(bn){ bidN=+bn.dataset.bn; return ctx.rerender(); }
    const a=e.target.closest('[data-a]'); if(!a||a.disabled) return; const k=a.dataset.a;
    if(k==='pick') return ctx.act({k:'pick',c:sel.slice()}); if(k==='tm'){ tb=Math.max(0,tb-1); return ctx.rerender(); } if(k==='tp'){ tb=Math.min(18,tb+1); return ctx.rerender(); }
    if(k==='tbid') return ctx.act({k:'tbid',n:tb}); if(k==='bid'){ const d=useDbl; useDbl=false; return ctx.act({k:'bid',n:bidN,dbl:d}); }
  };
}
function status(v,ctx){ syncH(v); const me=HSEAT[ctx.me]; if(v.phase==='over') return '';
  if(v.phase==='tbid'&&v.tbid[me][v.round===1?0:1]==null) return '총 승수를 예측하세요'; if(v.phase==='pick'&&!v.pick[me]) return '3장을 고르세요';
  if(v.turn===ctx.me) return v.phase==='bid'?'몇 승 할지 예측하세요':'카드를 내세요'; return '진행 중…'; }
const guide=`
<p><b>예측형 트릭 게임</b> — 이기는 것보다 <b>몇 턴 이길지 정확히 맞히는 것</b>이 점수(우리 둘 + 컴퓨터 1명).</p>
<ol><li>각자 18장: 1~16 색 카드 + <b>100</b>(무조건 이김) + <b>0</b>(무조건 짐). 6라운드 동안 라운드마다 <b>3장</b>씩 골라 다 써요.</li>
<li>라운드 시작: 첫 오픈 카드를 보고 3장을 <b>몰래</b> 고른 뒤, 몇 턴 이길지(0~3) <b>한 명씩 공개 예측</b>.</li>
<li>턴마다 오픈 카드가 새로 뒤집혀요 — 그 <b>색이 으뜸</b>. 선이 낸 색을 따라야 하고, 없으면 오픈 카드 색, 둘 다 없으면 아무거나(100·0은 언제든).</li>
<li>승리: 100 → 오픈 색 최고 → 선의 색 최고. 이긴 사람이 다음 턴 선.</li>
<li>점수: 100점에서 시작. 적중 = 승수×10+10, 빗나감 = 차이×10 감점. ✖️2 아이템 한 번. 1·4라운드 전 <b>총 승수 예측</b> 적중 +50/+30.</li></ol>
<div class="tipbox">💡 <b>팁</b><br>· 0승 예측은 0 카드와 낮은 카드로 안전하게.<br>· 100은 확실한 1승 — 3승을 노릴 라운드에 아껴 두세요.<br>· 오픈 카드 색이 매 턴 바뀌니 남은 오픈 카드도 계산!</div>`;
function demo(s){ startRound(s); s.q=[]; return s; }
const guideSteps=[
  {t:'🃏 내 덱 18장', h:'1~16 색 카드 16장 + <b>100</b>(무조건 이김) + <b>0</b>(무조건 짐). 6라운드에 <b>3장씩</b> 나눠 써요.', demo:s=>{ demo(s); beginPick(s); return s; }},
  {t:'🗣️ 몇 턴 이길까?', h:'3장을 고른 뒤 <b>0~3승</b>을 한 명씩 공개 예측. 이기는 것보다 <b>맞히는 것</b>이 중요해요.', demo:s=>{ demo(s); ALL.forEach(i=>{ s.hand[i]=s.deck[i].slice(0,3); }); s.bid=[null,2,1]; s.phase='bid'; s.actor=0; s.turn=0; s.notice='🗣️ 예측 차례'; return s; }},
  {t:'🌈 으뜸은 매 턴 바뀐다', h:'턴마다 <b>오픈 카드</b>가 새로 뒤집혀요. 그 색이 으뜸. 선의 색 → 없으면 오픈 카드 색을 따라야 해요.', demo:s=>{ demo(s); ALL.forEach(i=>{ s.hand[i]=s.deck[i].slice(0,3); }); s.bid=[1,2,1]; s.phase='play'; s.actor=0; s.turn=0; s.trick=[{seat:1,c:s.hand[1][0]},{seat:2,c:s.hand[2][1]}]; s.hand[1]=s.hand[1].slice(1); return s; }},
  {t:'🏆 점수', h:'적중 = <b>승수×10+10</b> (✖️2 아이템이면 두 배), 빗나감 = <b>차이×10 감점</b>. 1·4라운드 전 총 승수 예측 적중 <b>+50 / +30</b>.', demo:s=>{ demo(s); s.hist=[{r:1,bid:[1,2,0],won:[1,1,1],g:[20,-10,-10],dbl:[false,false,false]},{r:2,bid:[3,0,0],won:[3,0,0],g:[80,10,10],dbl:[true,false,false]}]; s.score=[200,100,100]; s.dbl[0]=true; return s; }},
];
window.GAMES.predictwin = { _sync:x=>syncH(x), maxH:3,
  title:'예측승패', ref:'피의 게임 「예측승패」', emoji:'🔮', tags:['트릭테이킹','카드','예측','NPC','두뇌서바이벌'],
  tagline:'몇 턴 이길지 정확히 맞혀라. 매 턴 바뀌는 으뜸 색, 100과 0, 18장으로 버티는 6라운드.',
  guide, guideSteps, init, apply, mask, ai, aiDelay, render, status, step:stepFn, stepDelay, noPersona:true, wide:true,
  reset(){ sig=''; sel=[]; tb=6; bidN=1; useDbl=false; },
  bar:(v,i)=>`<span class="tag">${v.score[HSEAT[i]]}점</span>`,
  result:(v,ctx)=>`${v.score[HSEAT[ctx.me]]}점`,
  _view:viewOf, _dec:{decidePick,decideBid,decidePlay,decideTbid}, _legal:legal, _judge:judge,
};
})();
