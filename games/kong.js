(function(){
'use strict';
/* 콩의 딜레마 (더 지니어스 시즌 1 · 8회 메인 매치) — 6인 3:3 팀전(우리 둘은 늘 다른 팀 + NPC 4명). 기준 게임(품질_점검.md 기준 v1).
   "팀이 이기려면 콩을 많이, 내가 이기려면 콩을 적게."
   각자 콩 10개. 5라운드. 라운드마다 ① 팀 작전 회의(팀끼리만 보임, 약속은 지키지 않아도 됨) ② 한 명씩 보관소에 들어가 원하는 만큼 몰래 팀 병에 넣음
   ③ 병을 열어 많이 넣은 팀이 1점 — 진 팀 병의 개수만 공개(이긴 팀 개수는 비밀), 같으면 아무것도 공개 안 하고 점수 없음.
   먼저 3점이면 즉시 승리, 5라운드 뒤엔 점수 높은 팀 승리. 이긴 팀에서 콩을 가장 많이 남긴 사람이 우승, 진 팀에서 가장 적게 남긴 사람이 탈락 후보. */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로 정함 — 두 팀에 번갈아(0,3,1,4,2,5), 나머지는 NPC */
let HSEAT=[0,3]; const SEATORD=[0,3,1,4,2,5];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const N=6, TM=[[0,1,2],[3,4,5]], ROUNDS=5, START=10, WIN=3;
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i), ALL=[...Array(N).keys()], team=i=>i<3?0:1;
const nm=i=>`{s${i}}`;
const TN=['⚪ 화이트 팀','🔴 레드 팀'], TS=['⚪ 화이트','🔴 레드'];
const STYLE={seojin:'logic', doyun:'warm', haram:'calm', yuna:'emo', minho:'sly', taekyung:'hot', jihu:'sly', soyul:'warm'};
const DEF_P={talk:.5,aggr:.5,trust:.5,bluff:.4,logic:.6,temper:.4};
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
/* 팀 대화 대사 — {n}=총합 {sh}=나눈 몫 {k}=개수 {t}=대상 {d}=모자란 개수 {r}=라운드 */
const LINES={
  logic:{plan:['{r}라운드는 {n}개면 충분해요. {sh}.','계산상 {n}개가 적당해요. {sh}로 가죠.','숫자로 보면 {n}개가 맞아요. {sh}.'], giveup:['{r}라운드는 버려요. 다 0개, 콩 아끼는 게 이득이에요.','이번엔 이길 확률이 낮아요. 0개로 가죠.'],
    ok:['{k}개 넣을게요.','네, {k}개.','{k}개, 확인했어요.'], haggle:['저는 {k}개만 낼게요. 뒤 라운드에 아껴야 해요.','{k}개로 줄일게요. 계산상 그게 맞아요.'], cover:['그럼 제가 하나 더 낼게요.','부족분은 제가 채울게요.'],
    push:['{t}, {k}개는 계산보다 적어요.','{t}, 그러면 확률이 떨어져요.'], win:['예상대로예요.','좋아요, {r}라운드 가져왔어요.'], lost:['상대가 더 냈네요. 다음엔 조정해요.','이건 상대가 올인했어요.'],
    sus:['약속은 {n}개였는데 {m}개… {d}개가 비어요. 다들 몇 개 냈어요?','숫자가 안 맞아요. {n}개 약속에 {m}개, {d}개 덜 냈어요.'], tie:['동점이네요. 정보가 안 나와서 아쉬워요.']},
  warm:{plan:['우리 {r}라운드는 {n}개 가요! {sh} 어때요? 😊','다 같이 {n}개 맞춰요~ {sh}!','{n}개면 될 것 같아요. {sh}, 괜찮죠? 🤝'], giveup:['이번엔 쉬어 가요~ 다 0개 어때요? 😊','{r}라운드는 아끼고 다음에 힘내요 🙏'],
    ok:['좋아요! {k}개 넣을게요 🤗','{k}개, 약속해요 🤝','네네 {k}개!'], haggle:['미안해요, 저는 {k}개만… 😢','저 콩이 좀 아까워서 {k}개만 할게요 🙏'], cover:['괜찮아요, 제가 하나 더 낼게요 😊','그럼 제가 채울게요~'],
    push:['{t}, {k}개는 좀 적은 것 같아요 🥺','{t}, 조금만 더 내 줄 수 있어요? 🙏'], win:['이겼다~ 우리 팀 최고 🥰','{r}라운드 우리 거예요! 🤗'], lost:['아쉽다… 그래도 약속은 다 지켰어요 😢','상대가 더 많이 냈나 봐요 🥲'],
    sus:['어… {n}개 약속했는데 {m}개예요 😢 누가 덜 냈어요?','{d}개가 비어요… 다들 솔직하게 말해요 🥺'], tie:['동점이에요! 휴~']},
  calm:{plan:['…{n}개. {sh}.','{n}개로. {sh}.','이번엔 {n}개. {sh}.'], giveup:['…이번엔 0개.','버리죠. 0개.'],
    ok:['…{k}개.','{k}개요.','네. {k}.'], haggle:['…저는 {k}개.','{k}개만.'], cover:['…제가 하나 더.','채울게요.'],
    push:['…{t}, 적어요.','{t}. {k}개는 부족.'], win:['…됐네요.','{r}라운드.'], lost:['…졌네요.','상대가 많이 냈어요.'],
    sus:['…{n}개 약속, {m}개. {d}개 빔.','…{d}개. 누구죠.'], tie:['…동점.']},
  emo:{plan:['{n}개 가요!! {sh}!! 꼭 지켜요!!','이번엔 {n}개!! {sh}!! 🔥','{sh}!! 합쳐서 {n}개!!'], giveup:['이번 판은 버려요!! 다 0개!!','아껴요 아껴!! 0개!!'],
    ok:['{k}개!! 약속!!','넹 {k}개!! 🥳','{k}개 넣을게요!!'], haggle:['저 {k}개만 할래요!! 콩 아까워요 🥺','{k}개!! 더는 안 돼요!!'], cover:['그럼 제가 더 낼게요!!','제가 채운다!!'],
    push:['{t}!! {k}개는 너무 적어요!!','{t}!! 더 내요!! 😤'], win:['이겼다!!! 🥳','{r}라운드 우리 거!! 🎉'], lost:['으아 졌어요!! 😭','상대 뭐야!! 😭'],
    sus:['{n}개 약속했잖아요!! {m}개라니!! 😡','{d}개 누가 빼먹었어요!!'], tie:['동점?! 으아!!']},
  sly:{plan:['{n}개 가죠~ {sh} 😏','이번엔 {n}개. {sh}. 믿죠? 😏','{sh}~ 합이 {n}개 😏'], giveup:['이번 판은 넘겨 줘요~ 0개 😏','콩은 아끼는 사람이 이기는 거예요 😏 0개'],
    ok:['{k}개~ 물론이죠 😏','{k}개 넣을게요 😏','네~ {k}개'], haggle:['저는 {k}개만~ 😏','{k}개요. 이유는 묻지 마시고 😏'], cover:['제가 하나 더 낼게요~ 😏','채워 드리죠 😏'],
    push:['{t}~ {k}개는 좀 짜다 😏','{t}, 그렇게 아끼면 티 나요 😏'], win:['역시~ 😏','{r}라운드 챙겼네요 😏'], lost:['졌네요~ 뭐 다음이 있죠 😏','상대도 꽤 냈나 보네요 😏'],
    sus:['{n}개 약속에 {m}개라… 누가 챙겼을까요 😏','누가 {d}개 아꼈네요 😏'], tie:['동점이라~ 재밌네요 😏']},
  hot:{plan:['{n}개 간다! {sh}! 🔥','이번엔 {n}개로 밀어붙여요! {sh}!','{sh}! 합 {n}개! 🔥'], giveup:['이번만 0개! 다음에 몰아쳐요!','0개로 숨 고르고 다음에 간다!'],
    ok:['{k}개! 🔥','{k}개 넣는다!','콜! {k}개!'], haggle:['저는 {k}개! 그 이상은 안 돼요!','{k}개만 낸다!'], cover:['제가 더 낸다! 🔥','부족하면 제가!'],
    push:['{t}! {k}개가 뭐예요!','{t}, 더 내요! 🔥'], win:['이겼다! 🔥','{r}라운드 가져왔다!'], lost:['졌다! 다음엔 갚아 준다 😤','상대 올인했네!'],
    sus:['{n}개 약속인데 {m}개?! 😤','{d}개 누가 뺐어!'], tie:['동점?! 😤']},
};
const XL={
  deny:['저는 {k}개 그대로 냈어요.','약속한 {k}개, 다 넣었어요.','저 아니에요. 정말 {k}개 넣었어요.','맹세코 {k}개 냈어요.'],
  confess:['…사실 저 {k}개만 냈어요. 미안해요.','들켰네요. {k}개만 넣었어요.','제가 {d}개 아꼈어요… 다음엔 채울게요.'],
  suspect:['{t}, 솔직히 말해 봐요.','저는 {t} 쪽이 의심돼요.','{t}, 아까부터 좀 수상했어요.'],
  silent:['{t}, 왜 아무 말이 없어요?','{t}은(는) 몇 개 냈어요? 말 좀 해 봐요.','{t}, 조용하니까 더 수상한데요.'],
  only:['저도 아니고 저쪽도 아니면… {t}밖에 없네요.','계산하면 답은 {t}예요.','{t}, 숫자가 거짓말은 안 해요.'],
  forgive:['솔직하게 말해 줘서 고마워요. 다음엔 꼭 채워요.','괜찮아요, 다음 라운드에 만회해요.','말해 준 게 어디예요. 다음엔 같이 가요.'],
  angry:['그러니까 졌잖아요!','약속은 왜 했어요?!','이제 못 믿겠어요.'],
  believe:['{t} 말 믿을게요.','그래요, {t}은(는) 아니겠죠.','{t}은(는) 믿어요.'],
  doubt:['{t}, 그 말 믿기 어려운데요.','흠… {t} 정말이에요?','{t}, 계산이 안 맞잖아요.'],
  more:['약속은 다 지켰는데… 상대가 더 냈네요. 다음엔 맞춰요.','다들 지켰어요. 상대가 세게 나왔어요.','우리 잘못은 없어요. 다음엔 조금 더 내요.'],
  demand:['{t}, 지난번에 모자랐으니 이번엔 {k}개 맡아요.','이번엔 {t}이(가) {k}개 내요. 믿음을 보여 줘요.','{t} 몫은 {k}개예요. 지난 일 갚는 셈 치고요.'],
  grudge:['{t}, 이번엔 약속 지켜요.','지난번처럼 빼먹기 없기예요, {t}.','{t} 약속은 이제 반만 믿을게요.','{t}, 저 지켜보고 있어요.','이번에도 모자라면 {t}부터 의심할 거예요.','{t}, 지난 라운드 생각나죠?'],
  tauntBig:['{k}개나 넣고도 졌네요 ㅋㅋ','{k}개면 꽤 넣었는데, 아깝네요~','{k}개까지 냈는데도요? ㅋㅋ'],
  dealt:['{t}, 상대 팀이랑 거래했어요?','{t}… 저쪽이랑 뭘 주고받았어요?','ㅋㅋ {t}, 상대를 속였어요? 대단하네요'],
  agreeH:['{t} 작전 좋아요. {k}개 낼게요.','좋아요 {t}, 그걸로 가요. 저는 {k}개.','{t} 말대로 할게요. {k}개.'],
  rejectH:['{t} 작전은 좀… 저는 {k}개만 할게요.','{t}, 그건 무리예요. {k}개로 갈게요.','음, 저는 원래대로 {k}개 할게요.'],
  rejectT:['{t} 작전은 못 믿겠어요. 저는 {k}개.','지난번 일도 있고… {t} 말은 안 따를래요. {k}개.','{t}, 먼저 약속부터 지켜 봐요. 저는 {k}개.'],
  slow:['{t}, 보관소에서 {k}초나 있었잖아요. 뭘 그렇게 고민했어요?','{t}, 아까 꽤 오래 있던데요… {k}초.','{k}초면 고민 많이 한 거죠, {t}?'],
  fast:['{t}은(는) 너무 빨리 나오던데요? 넣긴 넣었어요?','{t}, {k}초 만에? 세지도 않고 나온 거 아니에요?'],
  voteC:['🗳️ 저는 {t}에게.','🗳️ {t}에게 한 표.','🗳️ 제 표는 {t}.'],
  voteN:['🗳️ 저는 기권할게요. 확실하지 않아요.','🗳️ 아직 모르겠어요. 기권.'],
  unfair:['억울해요! 저 진짜 약속대로 냈어요.','이건 아니죠… 다음에 두고 봐요.','투표로 사람 잡네요.'],
  accept:['…할 말 없네요. 벌칙 받을게요.','네, 제 잘못이에요.','다음엔 제대로 낼게요.'],
  sold:['{t}, 팀 정보를 팔았어요?!','{t}… 우리 작전을 넘긴 거예요?','이제 {t} 말은 하나도 못 믿어요.'],
  dmOffer:['우리끼리 얘기인데, 너희 팀 이번에 몇 개 낼지 알려 주면 콩 {k}개 줄게요.','몰래 거래 하나 해요. 작전 합계만 알려 주면 {k}개 드려요.','쉿. 너희 팀 몇 개 내요? 알려 주면 콩 {k}개.'],
  dmThanks:['고마워요. 약속대로 {k}개 보냈어요.','좋아요, {k}개 보냈어요. 우리끼리 비밀이에요.'],
  dmNo:['아쉽네요. 생각 바뀌면 말해요.','그래요, 의리 있네요.'],
  dmYes:['좋아요, 콩 받을게요. 우리 팀 이번에 {k}개예요.','쉿… {k}개래요. 콩은 잘 받았어요.'],
  dmRefuse:['그런 거래는 안 해요.','팀을 팔 순 없죠. 거절이에요.','콩 1개로요? 안 돼요.'],
  leak:['{t}이(가) 알려 준 정보 덕분에 이겼네요 ㅋㅋ','{t}, 정보 고마웠어요~ 다음에도 부탁해요 ㅋㅋ'],
  fooled:['{t}, 거짓말했죠?! 알려 준 숫자랑 다르잖아요!','{t}한테 속았네요… 두고 봐요.'],
  intel:['정보 들어왔어요. 저쪽은 {k}개래요. 우리는 {n}개 갑니다.','저쪽 작전을 알아냈어요 — {k}개. 그럼 {n}개면 이겨요.'],
  ackIntel:['알겠어요, 그럼 저는 {k}개.','오케이, {k}개로 바꿀게요.','정보 좋네요. {k}개 갈게요.'],
  intel0:['저쪽이 {k}개나 낸대요. 이번엔 버리고 아끼죠.','{k}개면 못 이겨요. 이번 판은 0개로.'],
  hurry:['{t}, 빨리 정해요! 다들 기다려요.','{t}, 고민 너무 오래 하는데요?','{t}! 시간 없어요~'],
  wait:['{t}, 천천히 정해요. 괜찮아요.','{t} 고민하는 거 다 이해해요. 천천히요.','급할 거 없어요, {t}.'],
  murmur:['{t} 오래 걸리네…','{t} 지금 콩 세고 있나 봐요 ㅋㅋ','{t}, 안에서 무슨 고민을 저렇게…','{t} 아직이에요? 뭔가 있네…'],
  chit:['근데 다들 표정이 너무 진지한데요 ㅋㅋ','저 사실 콩 세다가 헷갈렸어요 ㅋㅋ','이거 끝나면 다들 밥 먹으러 가요?','긴장돼서 손에 땀 나요…','상대 팀 지금 무슨 얘기 하는지 궁금하네요.','{t}, 오늘 운이 좋아 보여요 ㅋㅋ'],
  okTilt:['…알겠어요. {k}개.','네네, {k}개요. 이번엔 지켜 볼게요.','또 저만 손해 보는 거 아니죠? {k}개.'],
  smug:['이대로만 가면 돼요.','오늘 우리 팀 손발 잘 맞네요.','상대가 우리를 못 읽어요.'],
  memoCut:['또 만났네요, {t}. 지난번엔 약속보다 덜 냈었죠? 이번엔 믿어 볼게요.','{t}… 지난 판 기억나요. 이번엔 약속 지켜요.'],
  memoSold:['{t}, 지난번에 정보 팔았던 거 안 잊었어요.','{t}랑 또 한 팀이네요. 이번엔 우리 편 맞죠?'],
  memoGood:['{t}! 지난번에 같이 이겼죠. 이번에도 잘해 봐요.','또 같은 팀이네요, {t}. 믿을게요.'],
  memoHi:['{t}, 또 만났네요! 반가워요.','{t}이랑 또 붙네요. 잘 부탁해요.'],
  winq:['이겼다! 다들 약속 지켰죠?','좋아요, 이 기세로 가요!','이겼네요. 몇 개 차이였을까요?'],
  raise:['{k}개는 부족해요! {n}개로 올려요!','소극적이면 져요. {n}개 가요!','이번엔 세게 가요. {n}개!'],
  okRaise:['좋아요, {n}개로 가죠. {sh}','그럼 {n}개! 다시 나눌게요. {sh}','{n}개 콜. 몫은 이렇게: {sh}'],
  zero0:['저는 이번 몫이 0개였어요.','저는 원래 0개였어요.'],
  taunt:['병엔 {k}개뿐이네요 ㅋㅋ','{k}개로 이기려고 했어요? ㅋㅋ','다음에도 그 정도면 우리가 가져가요.'],
  retort:['다음 판에 보자고요.','이제 시작이에요.','웃는 건 마지막에 해요.'],
  tieT:['같은 개수라니, 생각이 똑같네요?','동점… 다음엔 한 개만 더 넣어 볼까요?'],
};
/* 곁가지 대사(분위기용)는 다 쓰면 굳이 반복하지 않고 그냥 안 함 */
const OPT=new Set(['grudge','chit','smug','winq','more','hurry','wait','murmur','taunt','tauntBig','retort','tieT','memoCut','memoSold','memoGood','memoHi','dealt']);
function deco(st,t){ if(st==='warm') return t+' '+U.pick(['🙏','😊','🥺']); if(st==='calm') return '…'+t; if(st==='emo') return t.replace(/[.!?]$/,'')+'!!'; if(st==='sly') return t+' 😏'; if(st==='hot') return t+' 🔥'; return t; }
function lineX(s,i,kind,o){ const st=STYLE[P(s,i).id]||'calm', L=XL[kind]; const said=(s.usedT[i]=s.usedT[i]||[]); o=o||{}; s.lastT=o.t??null; const f=r=>r.replace(/\{k\}/g,o.k??'').replace(/\{n\}/g,o.n??'').replace(/\{sh\}/g,o.sh||'').replace(/\{d\}/g,o.d??'').replace(/\{t\}/g,o.t!=null?nm(o.t):'');
  const recent=s.chat[team(i)].slice(-8).map(c=>c.text.replace(/^…/,'')); const pool=L.filter(r=>!said.includes(f(r))&&!recent.some(x=>x.startsWith(f(r).slice(0,12)))); if(!pool.length&&OPT.has(kind)){ s.lastT=null; return ''; } const raw=pool.length?U.pick(pool):U.pick(L); if(!raw.includes('{t}')) s.lastT=null; const cands=[f(raw)]; const t=pool.length?cands[0]:`${f(U.pick(L))} (${s.round}라운드)`; said.push(t); return deco(st,t); }
function fillT(s,raw,o){ return raw.replace(/\{n\}/g,o.n??'').replace(/\{m\}/g,o.m??'').replace(/\{k\}/g,o.k??'').replace(/\{d\}/g,o.d??'').replace(/\{r\}/g,s.round).replace(/\{sh\}/g,o.sh||'').replace(/\{t\}/g,o.t!=null?nm(o.t):''); }
function lineOf(s,i,kind,o){ const st=STYLE[P(s,i).id]||'calm', L=(LINES[st]||LINES.calm)[kind]; if(!L) return ''; const said=(s.usedT[i]=s.usedT[i]||[]); o=o||{}; s.lastT=o.t??null;
  const recent=s.chat[team(i)].slice(-8).map(c=>c.text); const pool=L.filter(r=>{ const x=fillT(s,r,o); return !said.includes(x)&&!recent.some(y=>y.startsWith(x.slice(0,12))); }); const raw=pool.length?U.pick(pool):U.pick(L); if(!raw.includes('{t}')) s.lastT=null; let t=pool.length?fillT(s,raw,o):`${fillT(s,raw,o)} (${s.round}라운드)`; said.push(t); return t; }

/* ── 상태 ── */
const MEMK='kg-mem';
function memLoad(){ try{ return JSON.parse(localStorage.getItem(MEMK)||'{}')||{}; }catch(_){ return {}; } }
function memSave(m){ try{ localStorage.setItem(MEMK,JSON.stringify(m)); }catch(_){} }
function init(starter,o){ const k=Math.max(2,Math.min(6,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  const s={phase:'intro', who:{}, starter:starter|0, beans:Array(N).fill(START), put:[], promise:Array(N).fill(null), jar:[0,0], pts:[0,0], round:0,
    order:[], ei:0, cur:null, done:Array(N).fill(false), res:[], chat:[[],[]], q:[], ready:HSEAT.map(()=>false), plan:[null,null], sus:{}, shares:[null,null], usedT:{}, pub:[], disc:[null,null], said:[{},{}], prop:[null,null], dwell:[], vote:[null,null], pen:[null,null], fine:[], dm:HSEAT.map(()=>[]), dmN:0, intel:[null,null], deal:[], tdN:0, td:{}, enterAt:0, pend:null, nudge:{}, tilt:{},
    tq:[], used:{}, log:[], key:[], turn:null, winner:null, ev:0, think:null, focus:null, notice:'🎙️ 메인 매치 「콩의 딜레마」 — 팀이 이기려면 많이, 내가 이기려면 적게'};
  s.hs=HSEAT.slice(); const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=ids[k]);
  ALL.forEach(i=>{ if(!isH(i)){ s.sus[i]={}; TM[team(i)].forEach(j=>{ if(j!==i) s.sus[i][j]=(Math.random()-.5)*.4-NPCS.rel(s.who[i], isH(j)?(pOf(j)===0?'me':'opp'):s.who[j])*1.5; }); } });
  /* 지난 판 기억: 같은 팀 컴퓨터가 0번 자리 사람을 기억함 → 처음 신뢰가 달라지고 첫 회의에서 아는 척 */
  const mem=memLoad(), h=HSEAT[0]; s.memo=[];
  TM[team(h)].forEach(i=>{ if(isH(i)) return; const m=mem[s.who[i]]; if(!m) return; s.sus[i][h]=(s.sus[i][h]||0)+Math.min(2,(m.cut||0)*.35+(m.sold||0)*.8-(m.win||0)*.25);
    s.memo.push({i,kind:m.sold?'memoSold':m.cut?'memoCut':m.win?'memoGood':'memoHi'}); });
  return s; }
const left=(s,i)=>s.beans[i];
const trustOf=(s,i,j)=>Math.max(0,Math.min(100,Math.round(60-((s.sus[i]&&s.sus[i][j])||0)*22)));
function addSus(s,i,j,x){ if(isH(i)||!s.sus[i]) return; s.sus[i][j]=(s.sus[i][j]||0)+x; }
/* 팀원이 짐작하는 남은 콩: 지금까지 한 약속만큼 냈다고 봄 */
function estLeft(s,j){ let used=0; s.res.forEach(r=>{ if(r.prom&&r.prom[j]!=null) used+=r.prom[j]; }); return Math.max(0,START-used); }
/* 상대 팀이 한 라운드에 넣을 개수 짐작: 진 라운드엔 공개된 개수, 이긴 라운드엔 "우리 공개 개수보다 많음" */
function oppGuess(s,T){ const vals=[]; s.res.forEach(r=>{ if(r.rev[1-T]!=null) vals.push(r.rev[1-T]); else if(r.win===1-T&&r.rev[T]!=null) vals.push(r.rev[T]+1.5); else if(r.win<0) vals.push(TM[T].reduce((a,j)=>a+(r.prom[j]||0),0)); /* 동점 = 우리 약속 합과 같았겠지 */ });
  let m=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:2.8; const oppSpent=vals.reduce((a,b)=>a+b,0); const oppLeft=Math.max(0,30-oppSpent);
  const roundsLeft=ROUNDS-s.round+1; m=Math.min(m*1.05, oppLeft/Math.max(1,roundsLeft)*1.6+1); return {m:Math.max(0,m), sd:2.3}; }
const cdf=(x,m,sd)=>1/(1+Math.exp(-1.7*(x-m)/sd));
/* 팀장의 작전: 이길 확률 × 이 라운드의 값어치 − 쓰는 콩 */
function makePlan(s,T,cap,lvl){ const g=oppGuess(s,T); const need=WIN-s.pts[T], oNeed=WIN-s.pts[1-T]; const pc=P(s,cap); const W=(.75+pc.aggr*.7)*7.5+(oNeed===1?7:0)+(need===1?3:0)+(s.round===ROUNDS?3:0)+(pc.aggr-.5)*5;
  const teamLeft=TM[T].reduce((a,j)=>a+(j===cap?left(s,j):estLeft(s,j)),0); let best=0,bv=-1e9;
  for(let n=0;n<=Math.min(teamLeft,18);n++){ const pw=cdf(n-.5,g.m,g.sd), pt=cdf(n+.5,g.m,g.sd)-pw; const v=pw*W+pt*W*.3-n*(lvl===0?.6:1)+(lvl===0?(Math.random()-.5)*3:(Math.random()-.5)*.8); if(v>bv){ bv=v; best=n; } }
  return best; }
function split(s,T,n,cap){ const est=TM[T].map(j=>j===cap?left(s,j):estLeft(s,j)); const sh=[0,0,0]; for(let k=0;k<n;k++){ let b=0; for(let x=1;x<3;x++) if(est[x]-sh[x]>est[b]-sh[b]) b=x; if(est[b]-sh[b]<=0) break; sh[b]++; } return sh; }
const shText=(T,sh)=>TM[T].map((j,k)=>`${nm(j)} ${sh[k]}`).join(' · ');

/* ── 라운드 진행 ── */
function startRound(s){ s.round++; s.promise=Array(N).fill(null); s.ready=HSEAT.map(()=>false); s.done=Array(N).fill(false); s.cur=null; s.focus=null; s.jar=[0,0]; s.put[s.round]=Array(N).fill(null);
  s.phase='meet'; s.turn=null; s.q=[]; s.disc=[null,null]; s.said=[{},{}]; s.prop=[null,null]; s.vote=[null,null]; s.intel=[null,null]; s.dwell[s.round]=Array(N).fill(null); s.fine[s.round]=[0,0];
  for(const T of [0,1]){ const pe=s.pen[T]; if(pe&&pe.r===s.round-1&&s.beans[pe.who]>0){ s.beans[pe.who]--; s.fine[s.round][T]=1; s.log.push(`⚖️ ${nm(pe.who)} 벌금 콩 1개를 공개로 ${TS[T]} 병에 넣음`); } }
  for(const T of [0,1]){ const npcs=TM[T].filter(j=>!isH(j)); const cap=npcs.slice().sort((a,b)=>P(s,b).logic+P(s,b).talk-P(s,a).logic-P(s,a).talk)[0];
    const n=makePlan(s,T,cap,npcLvl(s,cap)); const sh=split(s,T,n,cap);
    /* 기억: 팀장이 가장 못 믿는 팀원(의심 1 이상)에게 한 개 더 맡김 */
    const tg=Object.entries(s.sus[cap]||{}).filter(([j,v])=>v>1&&TM[T].includes(+j)).sort((x,y)=>y[1]-x[1])[0]; let dem=null;
    if(tg&&n>0){ const ti=TM[T].indexOf(+tg[0]), ci=TM[T].indexOf(cap); const from=sh[ci]>0?ci:sh.findIndex((x,k)=>x>0&&k!==ti); if(from>=0&&from!==ti&&estLeft(s,+tg[0])>sh[ti]){ sh[from]--; sh[ti]++; dem=+tg[0]; } }
    let nn=n, sh2=sh; const hot=npcs.filter(j=>j!==cap&&P(s,j).aggr>.6).sort((a,b)=>P(s,b).aggr-P(s,a).aggr)[0]; let raise=null;
    if(hot!=null&&s.pts[T]<=s.pts[1-T]&&n<9&&Math.random()<.35+P(s,hot).aggr*.35){ nn=Math.min(n+2+(Math.random()<.4?1:0),15); sh2=split(s,T,nn,cap); raise=hot; }
    s.plan[T]={cap,n:nn,sh:sh2.slice()}; s.shares[T]=sh2.slice();
    const ev=[{k:'talk',T,i:cap,kind:n===0?'giveup':'plan',o:{n,sh:shText(T,sh)}}];
    if(raise!=null){ ev.push({k:'x',T,i:raise,kind:'raise',o:{k:n,n:nn}}); ev.push({k:'x',T,i:cap,kind:'okRaise',o:{n:nn,sh:shText(T,sh2)}}); sh.splice(0,3,...sh2); }
    if(dem!=null) ev.push({k:'x',T,i:cap,kind:'demand',o:{t:dem,k:sh[TM[T].indexOf(dem)]}});
    TM[T].forEach((j,k)=>{ if(isH(j)) return; if(j===cap){ s.promise[j]=sh[k]; return; } const p=P(s,j);
      const g=Object.entries(s.sus[j]||{}).filter(([x,v])=>v>1.2).sort((x,y)=>y[1]-x[1])[0];
      if(g&&Math.random()<.45+p.temper*.3) ev.push({k:'x',T,i:j,kind:'grudge',o:{t:+g[0]}});
      if(sh[k]>0&&Math.random()<.15+p.bluff*.3&&s.round>1){ const kk=Math.max(0,sh[k]-1); s.promise[j]=kk; ev.push({k:'talk',T,i:j,kind:'haggle',o:{k:kk}}); ev.push({k:'cover',T,i:cap,from:j}); }
      else { s.promise[j]=sh[k]; ev.push((s.tilt[j]||0)>=1.6?{k:'x',T,i:j,kind:'okTilt',o:{k:sh[k]}}:{k:'talk',T,i:j,kind:'ok',o:{k:sh[k]}}); } });
    s.q.push(...ev); }
  const a=s.q.filter(e=>e.T===0), b=s.q.filter(e=>e.T===1); s.q=[]; for(let k=0;k<Math.max(a.length,b.length);k++){ if(a[k]) s.q.push(a[k]); if(b[k]) s.q.push(b[k]); }
  maybeOffer(s);
  if(s.round===1&&s.memo&&s.memo.length) s.memo.forEach(m=>s.q.unshift({k:'x',T:team(m.i),i:m.i,kind:m.kind,o:{t:HSEAT[0]}}));
  /* 잡담: 가끔 게임과 상관없는 한마디 */
  [0,1].forEach(T=>{ const tk=TM[T].filter(j=>!isH(j)).sort((a,b)=>P(s,b).talk-P(s,a).talk)[0]; if(tk!=null&&Math.random()<.22+P(s,tk).talk*.25) s.q.push({k:'x',T,i:tk,kind:'chit',o:{t:TM[T].find(j=>j!==tk)}}); });
  s.notice=`🗣️ ${s.round}라운드 작전 회의 — 팀끼리만 들려요 (약속은 안 지켜도 돼요)`; s.log.push(`— ${s.round}라운드 — 점수 ${TS[0]} ${s.pts[0]} : ${s.pts[1]} ${TS[1]}`); }
const MOOD={hurry:'😤',wait:'🙂',murmur:'🤨',chit:'😄',okTilt:'😒',smug:'😌',memoCut:'🧐',memoSold:'😒',memoGood:'😊',memoHi:'😊',plan:'🧐',giveup:'😌',ok:'🙂',haggle:'😬',cover:'💪',push:'😒',win:'😄',winq:'😄',lost:'😞',more:'😞',tie:'😶',sus:'🤨',confess:'😓',deny:'😐',zero0:'😐',suspect:'🤨',only:'🧐',silent:'🤨',slow:'🤨',fast:'🤨',forgive:'🙂',angry:'😤',believe:'🙂',doubt:'🤨',demand:'😠',grudge:'😒',agreeH:'😊',rejectH:'😑',rejectT:'😒',raise:'🔥',okRaise:'💪',vote:'⚖️',unfair:'😠',accept:'😔',sold:'😡',intel:'😏',intel0:'😌'};
function chat(s,T,i,text,kind,tg){ const t0=tg!==undefined?tg:(s.lastT??null); s.lastT=null; if(!isH(i)&&MOOD[kind]){ s.mood=s.mood||{}; s.mood[i]={e:MOOD[kind],n:(s.moodN=(s.moodN||0)+1)}; } s.chat[T].push({q:(s.seqN=(s.seqN||0)+1),r:s.round,seat:i,text,kind,t:t0}); s.lastLine=s.lastLine||[null,null]; s.lastLine[T]={seat:i,n:(s.lastLine[T]?s.lastLine[T].n:0)+1}; }
function talk(s,e){ const T=e.T;
  if(e.k==='offer'){ if(s.beans[e.from]<1) return; dm(s,e.p,e.from,lineX(s,e.from,'dmOffer',{k:e.price}),{state:'open',price:e.price}); return; }
  if(e.k==='expose'){ s.pub.push({q:(s.seqN=(s.seqN||0)+1),kind:'pub',r:s.round,seat:e.i,text:lineX(s,e.i,e.kind,{t:e.t})}); s.log.push(`📣 ${nm(e.i)}: 뒷거래 폭로`); if(e.kind==='leak'){ const HT=team(e.t); TM[HT].forEach(x=>{ if(!isH(x)){ addSus(s,x,e.t,2); } }); const r=TM[HT].filter(x=>!isH(x)).sort((a2,b2)=>P(s,b2).temper-P(s,a2).temper)[0]; if(r!=null) s.q.unshift({k:'x',T:HT,i:r,kind:'sold',o:{t:e.t}}); s.key.push(`${s.round}R · 📣 ${nm(e.i)}이(가) ${nm(e.t)}의 뒷거래를 폭로`); } else { TM[team(e.t)].forEach(x=>{ if(!isH(x)) addSus(s,x,e.t,.6); }); const m2=TM[team(e.t)].find(x=>!isH(x)); if(m2!=null) s.q.unshift({k:'x',T:team(e.t),i:m2,kind:'dealt',o:{t:e.t}}); } return; }
  if(e.k==='pub2'){ const t=lineX(s,e.i,e.kind,e.o); if(!t) return; s.pub.push({q:(s.seqN=(s.seqN||0)+1),kind:'pub',r:s.round,seat:e.i,text:t,t:e.o&&e.o.t}); s.mood=s.mood||{}; s.mood[e.i]={e:'🤨',n:(s.moodN=(s.moodN||0)+1)}; return; }
  if(e.k==='pub'){ s.mood=s.mood||{}; s.mood[e.i]={e:(e.kind==='taunt'||e.kind==='tauntBig')?'😏':e.kind==='retort'?'😤':'😶',n:(s.moodN=(s.moodN||0)+1)}; const t=lineX(s,e.i,e.kind,Object.assign({},e.o,{t:null})).replace(/^\s*병엔/,`${TS[1-team(e.i)]} 병엔`); if(!t) return; s.pub.push({q:(s.seqN=(s.seqN||0)+1),kind:'pub',r:s.round,seat:e.i,text:t}); s.log.push(`📣 ${nm(e.i)}: ${t}`); s.pubN=(s.pubN||0)+1; return; }
  if(e.k==='cover'){ const cap=e.i; s.promise[cap]=(s.promise[cap]||0)+1; chat(s,T,cap,lineOf(s,cap,'cover'),'cover'); return; }
  if(e.k==='x'){ const tx=lineX(s,e.i,e.kind,e.o); if(tx) chat(s,T,e.i,tx,e.kind); return; }
  if(e.k==='explain'){ const j=e.i, D=s.disc[T]; if(!D||D.done.includes(j)) return; D.done.push(j); const p=P(s,j), pr=D.prom[j]||0, pu=s.put[s.round][j], cut=pr-pu;
    if(cut>0&&Math.random()<(1-p.bluff)*.65+p.trust*.15){ D.conf[j]=cut; chat(s,T,j,lineX(s,j,'confess',{k:pu,d:cut}),'confess'); s.key.push(`${s.round}R · ${nm(j)} "${pu}개만 냈어요" — 약속보다 ${cut}개 덜 낸 걸 고백`);
      TM[T].forEach(i=>{ if(!isH(i)&&i!==j) s.sus[i][j]=(s.sus[i][j]||0)+cut*.6; });
      const r=TM[T].find(i=>!isH(i)&&i!==j); if(r!=null) s.q.unshift({k:'x',T,i:r,kind:P(s,r).temper>.6?'angry':'forgive'}); return; }
    D.denied.push(j); if(pr===0&&pu===0){ chat(s,T,j,lineX(s,j,'zero0'),'deny'); return; } chat(s,T,j,lineX(s,j,'deny',{k:cut>0?pr:pu}),'deny'); if(cut>0&&p.bluff<.55&&Math.random()<.85) s.mood[j]={e:'😅',n:++s.moodN,tell:1}; return; }
  if(e.k==='verdict'){ const D=s.disc[T]; if(!D) return; const lead=TM[T].filter(j=>!isH(j)&&!(j in D.conf)).sort((x,y)=>P(s,y).talk-P(s,x).talk)[0]??e.i, confessed=Object.values(D.conf).reduce((a,b)=>a+b,0);
    /* 팀원마다: 내가 넣은 건 내가 아니까, 남은 모자람을 고백 안 한 다른 사람들에게 나눠 의심 */
    TM[T].forEach(i=>{ if(isH(i)) return; const p=P(s,i), mine=s.put[s.round][i], myP=D.prom[i]||0; const unexpl=(D.promised-myP)-(D.got-mine)-Object.entries(D.conf).filter(([j])=>+j!==i).reduce((a,[,c])=>a+c,0);
      if(unexpl>0){ const cand=TM[T].filter(j=>j!==i&&!(j in D.conf)); const silent=j=>isH(j)&&!D.denied.includes(j); /* 아무 말 없는 사람은 더 수상 */ cand.forEach(j=>{ s.sus[i][j]=(s.sus[i][j]||0)+unexpl/Math.max(1,cand.length)*(1.2-p.trust*.6)*(cand.length===1?1.6:1)+(silent(j)?.35:0); }); D.cand[i]=cand; } });
    const dw=s.dwell[s.round]||[], team3=TM[T].map(j=>dw[j]).filter(x=>x!=null).sort((a,b)=>a-b), med=team3.length?team3[Math.floor(team3.length/2)]:2;
    TM[T].forEach(i=>{ if(isH(i)) return; const p=P(s,i); (D.cand[i]||[]).forEach(j=>{ if(dw[j]!=null&&dw[j]>med*1.5&&dw[j]>=3) addSus(s,i,j,.35+p.logic*.3); else if(dw[j]!=null&&dw[j]<med*.5&&p.logic>.7) addSus(s,i,j,.2); }); });
    const myC=D.cand[lead]||[]; if(D.d-confessed<=0) return;
    if(myC.length===1){ chat(s,T,lead,lineX(s,lead,'only',{t:myC[0]}),'only'); s.key.push(`${s.round}R · ${nm(lead)}: "계산하면 ${nm(myC[0])}" — 팀 안의 의심`); }
    else if(myC.length){ const tg=myC.slice().sort((x,y)=>(s.sus[lead][y]||0)-(s.sus[lead][x]||0))[0]; const d0=dw[tg];
      const kind=d0!=null&&d0>med*1.5&&d0>=3?'slow':d0!=null&&d0<med*.5&&P(s,lead).logic>.7?'fast':isH(tg)&&!D.denied.includes(tg)?'silent':'suspect';
      chat(s,T,lead,lineX(s,lead,kind,{t:tg,k:d0}),'suspect'); }
    return; }
  if(e.k==='vote'){ const D=s.disc[T]; if(!D) return; const conf=Object.values(D.conf).reduce((a,b)=>a+b,0); if(D.d-conf<=0&&Object.keys(D.conf).length===0) return;
    s.vote[T]={votes:{},done:false}; chat(s,T,TM[T].find(j=>!isH(j)),`⚖️ ${s.round}라운드 투표해요 — 덜 낸 것 같은 사람 한 명. 2표면 벌칙(다음 라운드 먼저 입장 + 공개 벌금 콩 1개)`,'vote');
    TM[T].filter(j=>!isH(j)).forEach(j=>s.q.splice(0,0,{k:'cast',T,i:j})); s.q.push({k:'tally',T}); return; }
  if(e.k==='cast'){ const V=s.vote[T]; if(!V) return; const j=e.i; const c=TM[T].filter(x=>x!==j).sort((a,b)=>(s.sus[j][b]||0)-(s.sus[j][a]||0))[0]; const sure=(s.sus[j][c]||0)>.7||(s.disc[T].conf[c]>0);
    if(sure){ V.votes[j]=c; chat(s,T,j,lineX(s,j,'voteC',{t:c}),'vote',c); } else { V.votes[j]=-1; chat(s,T,j,lineX(s,j,'voteN'),'vote'); } return; }
  if(e.k==='tally'){ const V=s.vote[T]; if(!V) return; if(TM[T].some(j=>isH(j)&&!(j in V.votes))){ s.q.unshift(e); V.wait=true; return; } V.wait=false; V.done=true;
    const cnt={}; Object.values(V.votes).forEach(t=>{ if(t>=0) cnt[t]=(cnt[t]||0)+1; }); const top=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0];
    if(top&&top[1]>=2){ const who=+top[0]; s.pen[T]={who,r:s.round}; s.penLog=s.penLog||[]; s.penLog.push({r:s.round,T,who,n:top[1]}); const host=TM[T].filter(j=>!isH(j)&&j!==who).sort((a,b)=>P(s,b).talk-P(s,a).talk)[0]??who; chat(s,T,host,`⚖️ 투표 결과: ${nm(who)} ${top[1]}표 — 벌칙! 다음 라운드 먼저 보관소에 들어가고 콩 1개를 공개로 병에 넣어요`,'verdictV',who); s.key.push(`${s.round}R · ⚖️ ${TS[T]} 투표로 ${nm(who)} 벌칙`);
      if(!isH(who)){ s.tilt[who]=(s.tilt[who]||0)+1.5; const guilty=(s.disc[T].prom[who]||0)>s.put[s.round][who]; chat(s,T,who,lineX(s,who,guilty?'accept':'unfair'),'react'); if(!guilty) Object.entries(V.votes).forEach(([v,t])=>{ if(t===who) addSus(s,who,+v,.9); }); } }
    else chat(s,T,TM[T].find(j=>!isH(j)),`⚖️ ${s.round}라운드 투표는 표가 갈렸어요 — 벌칙 없음`,'verdictV'); return; }
  if(e.k==='resp'){ const j=e.i, by=e.by, pr=s.prop[T]; if(!pr) return; const p=P(s,j), k=TM[T].indexOf(j), want=pr.sh[k], ref=s.plan[T]?s.plan[T].n:pr.n;
    const distrust=s.sus[j]&&s.sus[j][by]||0; const score=p.trust*.7-distrust*.55-Math.min(.4,Math.abs(pr.n-ref)*.06)-(want>estLeft(s,j)?1:0)-(want>(s.shares[T]?s.shares[T][k]:0)?.12*(want-(s.shares[T]?s.shares[T][k]:0)):0)+(Math.random()-.5)*.3+(j===s.plan[T].cap?-.1:.1);
    if(score>.12||want<=(s.promise[j]??0)){ s.promise[j]=want; chat(s,T,j,lineX(s,j,'agreeH',{t:by,k:want}),'agreeH'); }
    else chat(s,T,j,lineX(s,j,distrust>1?'rejectT':'rejectH',{t:by,k:s.promise[j]??0}),'rejectH'); return; }
  if(e.k==='hear'){ /* 사람의 결과 발언에 대한 반응 */ const j=e.i, by=e.by, D=s.disc[T]; const p=P(s,j);
    if(e.what==='honest'){ const cand=D&&D.cand[j]; const only=cand&&cand.length===1&&cand[0]===by; if(only||((s.sus[j][by]||0)>1.2&&p.trust<.6)){ s.sus[j][by]=(s.sus[j][by]||0)+.4; chat(s,T,j,lineX(s,j,'doubt',{t:by}),'doubt'); } else chat(s,T,j,lineX(s,j,'believe',{t:by}),'believe'); return; }
    if(e.what==='confess'){ chat(s,T,j,lineX(s,j,p.temper>.6?'angry':'forgive'),'react'); return; }
    if(e.what==='accuse'){ if(j!==e.t) return; s.disc[T]&&s.disc[T].done.splice(s.disc[T].done.indexOf(j),1); talk(s,{k:'explain',T,i:j}); if(Math.random()<p.temper) s.q.unshift({k:'x',T,i:j,kind:'suspect',o:{t:by}}); return; }
    return; }
  chat(s,T,e.i,lineOf(s,e.i,e.kind,e.o),e.kind); }
function startEnter(s){ s.phase='enter'; s.order=U.shuffle(ALL.slice()); [0,1].forEach(T=>{ const pe=s.pen[T]; if(pe&&pe.r===s.round-1){ s.order=[pe.who,...s.order.filter(x=>x!==pe.who)]; } s.jar[T]+=(s.fine[s.round]||[0,0])[T]; }); s.ei=0; s.cur=s.order[0]; s.think=null; s.focus=null;
  s.notice=`🚪 보관소 입장 순서: ${s.order.map(nm).join(' → ')}`; s.log.push(s.notice); s.turn=isH(s.cur)?pOf(s.cur):null; if(isH(s.cur)) s.enterAt=Date.now(); }
/* NPC가 실제로 넣는 개수 — 약속 + 성격(뻥·믿음) + 판세 + 팀원 의심 */
function npcPut(s,i){ const p=P(s,i), T=team(i), pr=s.promise[i]==null?0:s.promise[i], have=left(s,i); let c=pr;
  const ahead=s.pts[T]>s.pts[1-T], must=WIN-s.pts[1-T]===1; const susMax=Math.max(0,...Object.values(s.sus[i]||{}));
  const isCap=s.plan[T]&&s.plan[T].cap===i, behind=s.pts[T]<s.pts[1-T];
  const tl=s.tilt[i]||0;
  const fr=tl*.07*(.4+p.temper)+.08+p.bluff*.32+(1-p.trust)*.12+(ahead?.1:0)+(must?-.15:0)+(susMax>1?p.temper*.15:0)-(isCap?.15:0)-(behind?.06:0);
  if(pr>0&&Math.random()<fr) c=pr-1-(Math.random()<.35?1:0);
  else if((must||behind||(susMax>1&&p.trust>.6))&&Math.random()<.2+p.aggr*.45) c=pr+1+(p.aggr>.7&&Math.random()<.35?1:0);
  return Math.max(0,Math.min(have,c)); }
function putBeans(s,i,c){ s.lastOut=i; s.put[s.round][i]=c; s.beans[i]-=c; s.jar[team(i)]+=c; s.done[i]=true; s.ev++; }
function nextEnter(s){ s.ei++; s.think=null; if(s.ei>=N){ s.cur=null; s.phase='open'; s.turn=null; s.notice='🫙 두 팀의 병을 엽니다… 두구두구'; return; }
  s.cur=s.order[s.ei]; s.turn=isH(s.cur)?pOf(s.cur):null; if(isH(s.cur)) s.enterAt=Date.now(); s.notice=`🚪 ${nm(s.cur)} 보관소에 들어가요…`; }
function dm(s,p,from,text,extra){ const m=Object.assign({id:++s.dmN,r:s.round,from,text,state:'info'},extra||{}); s.dm[p].push(m); return m; }
/* 상대 팀 컴퓨터가 사람에게 정보를 사러 옴 */
function maybeOffer(s){ if(s.round<2) return; for(const p of [0,1]){ const h=HSEAT[p], T=team(h); if(Math.random()>.42) continue; const opp=TM[1-T].filter(j=>!isH(j)).sort((a,b)=>P(s,b).bluff-P(s,a).bluff)[0]; if(opp==null||s.beans[opp]<1) continue;
    const price=Math.min(s.beans[opp],1+(Math.random()<.4?1:0)); s.q.splice(Math.min(2,s.q.length),0,{k:'offer',p,from:opp,price}); } }
function dealReply(s,p,m,a){ const h=HSEAT[p], T=team(h), j=m.from;
  if(a.how==='no'){ m.state='no'; dm(s,p,j,lineX(s,j,'dmNo')); s.ev++; return null; }
  const truth=s.prop[T]?s.prop[T].n:(s.plan[T]?s.plan[T].n:0); const said=a.how==='truth'?truth:Math.max(0,Math.min(15,a.n|0));
  m.state=a.how; const pay=Math.min(m.price,s.beans[j]); s.beans[j]-=pay; s.beans[h]+=pay; dm(s,p,j,lineX(s,j,'dmThanks',{k:pay}));
  s.deal.push({r:s.round,p,h,j,said,truth,lie:a.how==='lie'}); s.intel[1-T]={said,by:h};
  /* 상대 팀장이 이 숫자로 작전을 다시 짬 (사람은 상대 팀 대화를 못 보지만, 컴퓨터끼리는 그대로 움직임) */
  const OT=1-T, cap=s.plan[OT]&&s.plan[OT].cap; if(cap!=null){ const need=said+1, have=TM[OT].reduce((a2,x)=>a2+(x===cap?left(s,x):estLeft(s,x)),0);
    const worth=need<=Math.min(have,8+(s.pts[1-OT]===WIN-1?4:0)); const n=worth?need:0; const sh=split(s,OT,n,cap); s.plan[OT]={cap,n,sh:sh.slice()}; s.shares[OT]=sh.slice();
    TM[OT].forEach((x,k)=>{ if(!isH(x)) s.promise[x]=sh[k]; }); s.q=s.q.filter(e=>!(e&&e.T===OT&&['ok','haggle','cover'].includes(e.kind||e.k)));
    chat(s,OT,cap,lineX(s,cap,worth?'intel':'intel0',{k:said,n}),'intel'); TM[OT].forEach((x,k)=>{ if(!isH(x)&&x!==cap) s.q.push({k:'x',T:OT,i:x,kind:'ackIntel',o:{k:sh[k]}}); }); }
  s.ev++; return null; }
/* 사람이 상대 팀 컴퓨터에게 정보를 삼 */
function spyAsk(s,p,j){ const h=HSEAT[p], OT=team(j), pj=P(s,j); const grudge=Math.max(0,...Object.values(s.sus[j]||{}));
  dm(s,p,h,`(귓속말 → ${nm(j)}) 너희 팀 이번에 몇 개 내요? 알려 주면 콩 1개 줄게요`,{mine:true});
  if(Math.random()<.2+pj.bluff*.45+Math.min(.3,grudge*.15)){ const truth=s.plan[OT]?s.plan[OT].n:0; const n=pj.bluff>.6&&Math.random()<.5?Math.max(0,truth+(Math.random()<.5?-2:2)):truth;
    s.beans[h]-=1; s.beans[j]+=1; dm(s,p,j,lineX(s,j,'dmYes',{k:n})); s.deal.push({r:s.round,p,h,j,bought:n,truth,buy:true}); }
  else dm(s,p,j,lineX(s,j,'dmRefuse'));
  s.ev++; return null; }
function tiltUpd(s,win){ ALL.forEach(i=>{ if(isH(i)) return; let t=(s.tilt[i]||0)*.7; if(win>=0) t+= team(i)===win?-.6:.8; s.tilt[i]=Math.max(0,t); }); }
function openJars(s){ s.ready=HSEAT.map(()=>false); const [a,b]=s.jar; const win=a>b?0:b>a?1:-1; const rev=[null,null]; if(win>=0){ rev[1-win]=s.jar[1-win]; s.pts[win]++; }
  const prom=s.promise.slice(); s.res.push({r:s.round,win,rev,prom,jar:s.jar.slice(),put:s.put[s.round].slice()});
  if(win<0){ s.notice=`🤝 동점! 두 병이 똑같아요 — 개수는 비공개, 점수 없음`; s.log.push(`🤝 ${s.round}R 동점 (점수 없음)`); }
  else { s.notice=`${win===0?'⚪':'🔴'} ${TN[win]} ${s.round}라운드 승리! — ${TN[1-win]} 병엔 콩 ${rev[1-win]}개, ${TS[win]}는 그보다 많았어요 (몇 개인지는 비밀)`; s.log.push(`${TS[win]} 승 · ${TS[1-win]} 병 ${rev[1-win]}개 · 점수 ${s.pts[0]}:${s.pts[1]}`); }
  s.focus={win}; s.phase='result'; tiltUpd(s,win);
  /* 팀마다: 약속 합과 결과를 비교해 반응. 진 팀은 공개된 개수로 "몇 개가 비는지" 계산 → 한 명씩 해명 → 누가 덜 냈는지 */
  const ev=[[],[]];
  for(const T of [0,1]){ const promised=TM[T].reduce((x,j)=>x+(prom[j]||0),0); const sp=TM[T].filter(j=>!isH(j)).sort((x,y)=>P(s,y).talk-P(s,x).talk);
    if(win===T){ if(sp.length) ev[T].push({k:'x',T,i:sp[0],kind:s.pts[T]>=2&&s.pts[T]>s.pts[1-T]?'smug':'winq'}); continue; }
    if(win<0){ if(sp.length) ev[T].push({k:'talk',T,i:U.pick(sp),kind:'tie'}); continue; }
    const got=rev[T], d=promised-got; s.disc[T]={promised,got,d,prom,conf:{},denied:[],done:[],cand:{}};
    if(d<=0){ if(sp.length) ev[T].push({k:'x',T,i:sp[0],kind:'more'}); continue; }
    s.key.push(`${s.round}R · ${TS[T]} 약속 ${promised}개 → 병엔 ${got}개 (${d}개 모자람)`);
    if(sp.length) ev[T].push({k:'talk',T,i:sp[0],kind:'sus',o:{n:promised,m:got,d,t:null}});
    U.shuffle(sp.slice()).forEach(j=>ev[T].push({k:'explain',T,i:j}));
    if(sp.length) ev[T].push({k:'verdict',T,i:sp[0]}); ev[T].push({k:'vote',T}); }
  for(let k=0;k<Math.max(ev[0].length,ev[1].length);k++){ if(ev[0][k]) s.q.push(ev[0][k]); if(ev[1][k]) s.q.push(ev[1][k]); }
  if(win>=0){ const tw=TM[win].filter(j=>!isH(j)).sort((x,y)=>P(s,y).aggr-P(s,x).aggr)[0], tl=TM[1-win].filter(j=>!isH(j)).sort((x,y)=>P(s,y).temper-P(s,x).temper)[0];
    if(tw!=null&&Math.random()<.35+P(s,tw).aggr*.5){ s.q.unshift({k:'pub',i:tw,kind:rev[1-win]<=3?'taunt':'tauntBig',o:{t:null,k:rev[1-win]}}); if(tl!=null&&Math.random()<.4+P(s,tl).temper*.5) s.q.splice(1,0,{k:'pub',i:tl,kind:'retort'}); } }
  else { const any=ALL.filter(j=>!isH(j)); if(Math.random()<.5) s.q.unshift({k:'pub',i:U.pick(any),kind:'tieT'}); }
  s.deal.filter(d=>d.r===s.round&&!d.buy).forEach(d=>{ const pj=P(s,d.j), OT=team(d.j);
    if(!d.lie&&win===OT&&Math.random()<.3+pj.temper*.25+pj.bluff*.2) s.q.push({k:'expose',i:d.j,t:d.h,kind:'leak'});
    else if(d.lie&&win!==OT&&Math.abs(d.said-d.truth)>=2&&Math.random()<.45+pj.temper*.4) s.q.push({k:'expose',i:d.j,t:d.h,kind:'fooled'}); });
}
function checkEnd(s){ if(s.pts[0]>=WIN||s.pts[1]>=WIN||s.round>=ROUNDS){ s.phase='final'; let w=s.pts[0]>s.pts[1]?0:s.pts[1]>s.pts[0]?1:-1; const bl=[0,1].map(t=>TM[t].reduce((a,j)=>a+s.beans[j],0)); s.tieBeans=null;
    if(w<0&&bl[0]!==bl[1]){ w=bl[0]>bl[1]?0:1; s.tieBeans=bl; } s.wt=w;
    s.notice=w<0?`🎙️ ${s.round}라운드 끝 — ${s.pts[0]}:${s.pts[1]}, 남은 콩도 같아서 무승부`:s.tieBeans?`🏁 점수 ${s.pts[0]}:${s.pts[1]} 동점 — 남은 콩이 더 많은 ${TN[w]} 승리! (콩 ⚪ ${s.tieBeans[0]} : ${s.tieBeans[1]} 🔴)`:`🏁 ${TN[w]} 승리! (${s.pts[0]}:${s.pts[1]}) — 이제 남은 콩을 공개합니다`; s.log.push(s.notice); return true; } return false; }
function memRecord(s){ const mem=memLoad(), h=HSEAT[0], T=team(h); const cut=s.res.filter(r=>r.prom[h]!=null&&r.put[h]<r.prom[h]).length, sold=s.deal.filter(d=>d.h===h&&!d.buy&&!d.lie).length, win=s.wt===T?1:0;
  TM[T].forEach(i=>{ if(isH(i)) return; const id=s.who[i], m=mem[id]=mem[id]||{games:0,cut:0,sold:0,win:0}; m.games++; m.cut+=cut; m.sold+=sold; m.win+=win; m.last=Date.now(); }); memSave(mem); }
function finalize(s){ s.phase='over'; if(!s.auto&&!s.noMem) memRecord(s); const w=s.wt; const W=w<0?ALL:TM[w], L=w<0?[]:TM[1-w];
  const mx=Math.max(...W.map(i=>s.beans[i])); s.champ=W.filter(i=>s.beans[i]===mx);
  if(L.length){ const mn=Math.min(...L.map(i=>s.beans[i])); s.loser=L.filter(i=>s.beans[i]===mn); } else s.loser=[];
  const ta=team(HSEAT[0]), tb=team(HSEAT[1]); s.winner=w<0?'draw':w===ta?0:w===tb?1:'none'; s.winners=w<0?[]:HSEAT.map((h,p)=>team(h)===w?p:-1).filter(x=>x>=0);
  /* 속마음: 약속보다 덜 낸 적이 있으면 고백, 아니면 의심했던 팀원 */
  s.conf=[]; ALL.filter(i=>!isH(i)).forEach(i=>{ const cut=s.res.filter(r=>r.prom[i]!=null&&r.put[i]!=null&&r.put[i]<r.prom[i]); const more=s.res.filter(r=>r.prom[i]!=null&&r.put[i]!=null&&r.put[i]>r.prom[i]);
    const fast=cut.filter(r=>{ const d=(s.dwell[r.r]||[])[i]; return d!=null&&d<1.6; }); const tl=s.tilt[i]||0; const sold=s.deal.filter(d=>d.j===i&&!d.buy); const leaked=s.deal.some(d=>d.j===i&&s.pub.some(p=>p.seat===i&&p.r===d.r));
    let t;
    if(cut.length) t=`사실 ${cut.map(r=>r.r).join('·')}라운드엔 약속보다 덜 냈어요 🤫 (${cut.map(r=>`${r.prom[i]}→${r.put[i]}`).join(', ')})${fast.length?' 보관소에서 빨리 나온 건 일부러였어요 😏':''}`;
    else if(more.length) t=`저는 ${more.map(r=>r.r).join('·')}라운드에 약속보다 더 냈어요. 누가 빼먹는 것 같아서요`;
    else { const tg=Object.entries(s.sus[i]||{}).sort((x,y)=>y[1]-x[1])[0]; t=tg&&tg[1]>.8?`약속은 다 지켰어요. ${nm(+tg[0])} 쪽은 좀 의심했지만요`:'끝까지 약속 그대로 냈어요 🤝'; }
    if(sold.length) t+=leaked?' 그리고 그 거래, 폭로한 건 저예요 ㅋㅋ':` 아, ${nm(sold[0].h)}한테 정보 산 것도 저예요.`;
    else if(tl>=2) t+=' 솔직히 오늘은 좀 짜증 났어요.';
    s.conf.push({seat:i,text:t}); });
  s.notice=`🏆 우승 ${s.champ.map(nm).join('·')} (콩 ${mx}개 남김)${s.loser.length?` · 💀 탈락 후보 ${s.loser.map(nm).join('·')}`:''}`; s.log.push(s.notice); }

const npcLvl=(s,i)=>s.lvlOv!=null?(Array.isArray(s.lvlOv)?s.lvlOv[team(i)]:s.lvlOv):P(s,i).logic>=.7?2:1;
function apply(s,p,a){ syncH(s); const _b=trustSnap(s); const r=applyIn(s,p,a); trustDiff(s,_b); return r; }
function applyIn(s,p,a){ if(s.winner!=null) return '게임이 끝났어요'; if(!a) return '알 수 없는 동작'; const i=HSEAT[p], T=team(i);
  if(a.k==='promise'){ if(s.phase!=='meet') return '지금은 작전 회의가 아니에요'; const k=a.n|0; if(k<0||k>left(s,i)) return `0~${left(s,i)}개`; s.promise[i]=k; chat(s,T,i,[`저는 ${k}개 넣을게요`,`${k}개 할게요`,`저는 ${k}개요`,`${k}개 넣을게요. 약속!`,`이번엔 ${k}개`][(s.round+k)%5],'ok',null);
    const sh=s.shares[T]?s.shares[T][TM[T].indexOf(i)]:0; if(k<sh-1){ const mate=TM[T].find(j=>!isH(j)); if(mate!=null) s.q.unshift({k:'talk',T,i:mate,kind:'push',o:{t:i,k}}); } s.ev++; return null; }
  if(a.k==='propose'){ if(s.phase!=='meet') return '지금은 작전 회의가 아니에요'; if(s.prop[T]&&s.prop[T].by===i) return '이번 라운드엔 이미 제안했어요'; const n=a.n|0; if(n<0||n>18) return '0~18개';
    const sh=split(s,T,n,i); s.prop[T]={by:i,n,sh}; s.promise[i]=sh[TM[T].indexOf(i)]; s.shares[T]=sh.slice();
    chat(s,T,i,n===0?'이번 판은 버려요. 다 같이 0개, 콩 아껴요':`제 작전: 이번엔 ${n}개 가요. ${shText(T,sh)}`,'propose');
    TM[T].filter(j=>!isH(j)).forEach(j=>s.q.push({k:'resp',T,i:j,by:i})); s.ev++; return null; }
  if(a.k==='say'){ if(s.phase!=='result') return '지금은 결과 이야기 시간이 아니에요'; const D=s.disc[T]; if(!D||D.d<=0) return '우리 팀은 해명할 게 없어요'; if(s.said[T][i+':'+a.what]) return '이미 말했어요';
    s.said[T][i+':'+a.what]=1; const mates=TM[T].filter(j=>!isH(j));
    if(a.what==='honest'){ if(!D.denied.includes(i)) D.denied.push(i); chat(s,T,i,`저는 약속대로 냈어요`,'deny'); mates.forEach(j=>s.q.push({k:'hear',T,i:j,by:i,what:'honest'})); }
    else if(a.what==='confess'){ const pu=s.put[s.round][i], pr=D.prom[i]||0; chat(s,T,i,pu<pr?`…사실 저 ${pu}개만 냈어요. 미안해요`:`저는 ${pu}개 냈어요`,'confess'); if(pu<pr){ D.conf[i]=pr-pu; mates.forEach(j=>{ s.sus[j][i]=(s.sus[j][i]||0)+(pr-pu)*.5; }); } s.q.push({k:'hear',T,i:U.pick(mates),by:i,what:'confess'}); }
    else if(a.what==='accuse'){ const t=a.t|0; if(!TM[T].includes(t)||t===i) return '같은 팀원을 고르세요'; chat(s,T,i,`${nm(t)}, 혹시 덜 냈어요?`,'suspect',t); s.q.push({k:'hear',T,i:t,by:i,what:'accuse',t}); }
    else return '알 수 없는 말'; s.ev++; return null; }
  if(a.k==='vote'){ const V=s.vote[T]; if(s.phase!=='result'||!V||V.done) return '지금은 투표 중이 아니에요'; if(i in V.votes) return '이미 투표했어요'; const t=a.t==null?-1:a.t|0; if(t>=0&&(!TM[T].includes(t)||t===i)) return '같은 팀원을 고르세요';
    V.votes[i]=t; chat(s,T,i,t>=0?`🗳️ 저는 ${nm(t)}에게`:'🗳️ 저는 기권할게요','vote',t>=0?t:null); if(t>=0&&!isH(t)) addSus(s,t,i,.5); s.ev++; return null; }
  if(a.k==='deal'){ const L=s.dm[p], m=L.find(x=>x.id===a.id); if(!m||m.state!=='open') return '이미 끝난 귓속말이에요'; return dealReply(s,p,m,a); }
  if(a.k==='spy'){ if(s.phase!=='meet') return '작전 회의 때만 할 수 있어요'; if(s.dm[p].some(x=>x.r===s.round&&x.mine)) return '이번 라운드엔 이미 귓속말을 했어요'; const j=a.t|0; if(team(j)===T||isH(j)) return '상대 팀 컴퓨터를 고르세요'; if(s.beans[i]<1) return '줄 콩이 없어요'; return spyAsk(s,p,j); }
  if(a.k==='ready'){ if(s.phase!=='meet'&&s.phase!=='result') return '지금은 넘길 수 없어요'; s.ready[p]=true; s.ev++; return null; }
  if(a.k==='put'){ if(s.phase!=='enter'||s.cur!==i) return '지금은 내가 보관소에 들어갈 차례가 아니에요'; const c=a.n|0; if(c<0||c>left(s,i)) return `0~${left(s,i)}개`; s.dwell[s.round][i]=Math.round(Math.min(60,Math.max(.3,(Date.now()-(s.enterAt||Date.now()))/1000))*10)/10; putBeans(s,i,c); s.log.push(`🚪 ${nm(i)} 다녀옴 (⏱️ ${s.dwell[s.round][i]}초)`); nextEnter(s); return null; }
  return '알 수 없는 동작'; }
function thinkMs(s,i){ const p=P(s,i); const big=(s.promise[i]||0)>=3||s.pts.some(x=>x===WIN-1); return (big?2200:1400)*(1.3-p.temper*.6)+Math.random()*900; }
/* 약속을 어길 땐 오래 망설임 — 단, 뻥이 센 사람은 일부러 빨리 나옴 */
function dwellMs(s,i,c){ const p=P(s,i), pr=s.promise[i]||0; let t=thinkMs(s,i); if(c<pr) t*= p.bluff>.62?.5:1.75+Math.random()*.5; else if(c>pr) t*=1.3; return Math.round(Math.min(7000,Math.max(500,t))); }
function stepDelay(s){ syncH(s); if(s.winner!=null) return null;
  if(s.phase==='intro') return 2600;
  if(s.phase==='meet'){ if(s.q.length) return 1500; if(s.ready.every(Boolean)) return 900; return s.nudge['m'+s.round]?null:11000; }
  if(s.phase==='enter'){ if(isH(s.cur)) return s.nudge['e'+s.round+':'+s.cur]?null:7000; return s.think===s.cur&&s.pend?s.pend.ms:500; }
  if(s.phase==='open') return 2400;
  if(s.phase==='result'){ if(s.q.length){ const e=s.q[0]; if(e&&e.k==='tally'&&s.vote[e.T]&&TM[e.T].some(j=>isH(j)&&!(j in s.vote[e.T].votes))) return null; return 1900; } return s.ready.every(Boolean)?600:null; }
  if(s.phase==='final') return 2800; return null; }
function trustSnap(s){ const o={}; HSEAT.forEach(h=>TM[team(h)].forEach(i=>{ if(!isH(i)) o[i+'>'+h]=trustOf(s,i,h); })); return o; }
function trustDiff(s,b){ const a=trustSnap(s); let ch=false; for(const k in a){ const d=a[k]-(b[k]??a[k]); if(d){ s.td[k]={d,n:s.tdN+1}; ch=true; } } if(ch) s.tdN++; }
function step(s){ syncH(s); const _b=trustSnap(s); stepIn(s); trustDiff(s,_b); }
function stepIn(s){
  if(s.phase==='intro'){ startRound(s); s.ev++; return; }
  if(s.phase==='meet'){ if(s.q.length){ const e=s.q.shift(); talk(s,e); /* 같은 박자에 다른 팀 줄도 하나 */ if(s.q.length&&s.q[0].T!==e.T) talk(s,s.q.shift()); s.ev++; return; }
    if(s.ready.every(Boolean)){ startEnter(s); s.ev++; return; }
    if(!s.nudge['m'+s.round]){ s.nudge['m'+s.round]=1; HSEAT.forEach((h,p)=>{ if(s.ready[p]) return; const T=team(h); const mate=TM[T].filter(j=>!isH(j)).sort((a,b)=>P(s,b).temper-P(s,a).temper)[0]; if(mate!=null) talk(s,{k:'x',T,i:mate,kind:P(s,mate).temper>.55?'hurry':'wait',o:{t:h}}); }); s.ev++; }
    return; }
  if(s.phase==='enter'){ const i=s.cur; if(isH(i)){ const key='e'+s.round+':'+i; if(!s.nudge[key]){ s.nudge[key]=1; const w=ALL.filter(j=>!isH(j)).sort((a,b)=>P(s,b).talk-P(s,a).talk)[0]; if(w!=null){ talk(s,{k:'pub2',i:w,kind:'murmur',o:{t:i}}); } s.ev++; } return; } if(s.think!==i){ s.think=i; const c=npcPut(s,i); s.pend={i,c,ms:dwellMs(s,i,c)}; s.notice=`🚪 ${nm(i)} 보관소에 들어갔어요… (안에서 몰래 콩을 넣는 중)`; s.ev++; return; }
    s.dwell[s.round][i]=Math.round(s.pend.ms/100)/10; putBeans(s,i,s.pend.c); s.pend=null; s.log.push(`🚪 ${nm(i)} 다녀옴`); const was=i; nextEnter(s); if(s.phase==='enter') s.notice=`🚪 ${nm(was)} 나왔어요 (⏱️ ${s.dwell[s.round][was]}초) — 다음은 ${nm(s.cur)}`; s.ev++; return; }
  if(s.phase==='open'){ openJars(s); s.ev++; return; }
  if(s.phase==='result'){ if(s.q.length){ const e=s.q.shift(); talk(s,e); if(s.q.length&&s.q[0].T!==e.T) talk(s,s.q.shift()); s.ev++; return; }
    if(!checkEnd(s)) startRound(s); s.ev++; return; }
  if(s.phase==='final'){ finalize(s); s.ev++; return; }
}
function mask(s,p){ syncH(s); const v=U.clone(s), me=HSEAT[p], T=team(me), open=s.phase==='over';
  if(!open){ v.beans=s.beans.map((b,i)=>i===me?b:null); v.put=s.put.map(r=>r?r.map((x,i)=>i===me?x:null):r); v.jar=[null,null];
    v.promise=s.promise.map((x,i)=>team(i)===T?x:null); v.chat=[[],[]]; v.chat[T]=s.chat[T]; v.plan=[null,null]; v.plan[T]=s.plan[T]; v.shares=[null,null]; v.shares[T]=s.shares[T];
    v.disc=[null,null]; if(s.disc[T]) v.disc[T]={promised:s.disc[T].promised,got:s.disc[T].got,d:s.disc[T].d}; v.res=s.res.map(r=>({r:r.r,win:r.win,rev:r.rev,prom:r.prom.map((x,i)=>team(i)===T?x:null),put:r.put.map((x,i)=>i===me?x:null),jar:[null,null]})); }
  v.trust={}; TM[T].forEach(i=>{ if(!isH(i)){ v.trust[i]={}; TM[T].forEach(j=>{ if(j!==i) v.trust[i][j]=trustOf(s,i,j); }); } });
  v.dm=HSEAT.map(()=>[]); v.dm[p]=s.dm[p]; v.deal=s.deal.filter(d=>d.p===p); v.intel=[null,null]; v.pend=null;
  v.vote=[null,null]; if(s.vote[T]) v.vote[T]=s.vote[T]; v.oppTalk=s.q.some(e=>e&&e.T===1-T&&['talk','x','explain','verdict','cast','resp','hear'].includes(e.k)); { const e=s.q[0]; v.nextSpk=e&&e.T===T&&e.i!=null&&['talk','x','explain','verdict','resp','hear','cast'].includes(e.k)?(e.k==='verdict'?null:e.i):null; }
  v.sus=null; v.prop=[null,null]; v.prop[T]=s.prop[T]; v.q=s.q.map(()=>null); v.used={}; v.tq=[]; return v; }
/* 혼자 할 때 상대 사람 자리(3번)를 컴퓨터가: 회의에선 몫만큼 약속, 보관소에선 성향대로 */
function ai(v,lvl){ syncH(v); const i=HSEAT[1], T=team(i); lvl=lvl==null?1:lvl;
  if(v.phase==='meet'&&!v.ready[1]){ if(v.promise[i]==null){ const sh=v.shares[T]?v.shares[T][TM[T].indexOf(i)]:1; return {k:'promise',n:Math.min(sh,v.beans[i])}; } return {k:'ready'}; }
  if(v.phase==='result'&&v.vote[T]&&!v.vote[T].done&&!(i in v.vote[T].votes)) return {k:'vote',t:lvl===0?-1:TM[T].filter(x=>x!==i)[Math.random()<.5?0:1]};
  const off=(v.dm[1]||[]).find(m=>m.state==='open'); if(off) return {k:'deal',id:off.id,how:lvl===2?'lie':Math.random()<.5?'no':'truth',n:Math.max(0,(v.plan[T]?v.plan[T].n:4)+(Math.random()<.5?3:-3))};
  if(v.phase==='result'&&!v.ready[1]&&!v.q.length) return {k:'ready'};
  if(v.phase==='enter'&&v.cur===i){ const pr=v.promise[i]||0; let c=pr; if(lvl===0) c=Math.max(0,pr+(Math.random()<.5?-1:1)*(Math.random()<.5?1:0)); else if(lvl===2){ const ahead=v.pts[T]>v.pts[1-T]; if(ahead&&pr>0&&Math.random()<.35) c=pr-1; }
    return {k:'put',n:Math.max(0,Math.min(v.beans[i],c))}; }
  return null; }
function aiDelay(){ return 1300+Math.random()*1500; }

/* ── 화면 ── */
let lastCurK=null, lastVc=0;
let WHO={}, sel=null, sig='', lastN=null, propN=null, propOpen=false, spyOpen=false, lastTd=null, lastMood=null, lastOff='';
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}/g,(_,d)=>`${seatEmoji(+d)} ${seatName(+d,ctx)}`); }
const dots=(n)=>Array.from({length:WIN},(_,k)=>k<n?'●':'○').join('');
function thought(v,i,me,ctx){ const tr=v.trust&&v.trust[i]; if(!tr) return ''; const ent=Object.entries(tr).sort((a,b)=>a[1]-b[1]); const [lo,lv]=ent[0]||[]; const tm=tr[me];
  if(lv!=null&&lv<35) return `💭 ${+lo===me?'나':seatName(+lo,ctx)} 수상해`; if(tm!=null&&tm>=75) return '💭 나를 믿어요'; if(lv!=null&&lv<50) return `💭 ${+lo===me?'나':seatName(+lo,ctx)} 좀 찜찜`; return '💭 아직은 다 믿어요'; }
function seatCard(v,i,ctx,me){ const T=team(i), mine=T===team(me), cur=v.phase==='enter'&&v.cur===i, out=v.done[i]&&(v.phase==='enter'||v.phase==='open'||v.phase==='result');
  const md=v.mood&&v.mood[i], fresh=md&&md.n===v.moodN; const dw=(v.dwell[v.round]||[])[i];
  const tme=mine&&!isH(i)&&v.trust&&v.trust[i]?v.trust[i][me]:null, td=v.td&&v.td[i+'>'+me], tdNew=td&&td.n===v.tdN;
  const pe=v.pen&&v.pen[T]&&v.pen[T].who===i&&v.pen[T].r>=v.round-1;
  const gauge=tme!=null?`<div class="kg-tr ${tdNew?(td.d>0?'up':'down'):''}" title="나를 믿는 정도"><i style="width:${tme}%"></i><span>💗 ${tme}${tdNew?` <b>${td.d>0?'+':''}${td.d}</b>`:''}</span></div>`:'';
  const th=mine&&!isH(i)?`<div class="kg-th2">${thought(v,i,me,ctx)}</div>`:'';
  const last=v.chat[team(me)].filter(x=>x.r===v.round).slice(-1)[0], speak=mine&&last&&last.seat===i&&(v.phase==='meet'||v.phase==='result');
  const pr=mine&&v.promise[i]!=null?`<span class="kg-pr">🤝 ${v.promise[i]}개 약속</span>`:'';
  const bn=i===me?`<span class="kg-bn">🫘 ${v.beans[i]}</span>`:v.phase==='over'?`<span class="kg-bn">🫘 ${v.beans[i]}</span>`:'';
  return `<div class="kg-seat ${mine?'mine':''} ${i===me?'me':''} ${cur?'spot':''} ${speak?'speak':''} ${out?'out':''} ${tdNew?(td.d>0?'flash-up':'flash-down'):''} ${md&&md.tell&&fresh?'tell':''}">${md&&!isH(i)?`<span class="kg-mood ${fresh?'pop':''}">${md.e}</span>`:''}<div class="kg-face">${seatEmoji(i)}</div><b>${seatName(i,ctx)}</b>${bn}${pr}${pe?'<span class="kg-pen">⚖️ 벌칙</span>':''}
    ${cur?'<span class="kg-st in">🚪 보관소 안…</span>':out&&dw!=null?`<span class="kg-st ${dw>=4?'long':''}">⏱️ ${dw}초</span>`:out?'<span class="kg-st">✔ 다녀옴</span>':''}${gauge}${th}</div>`; }
/* ── 🪑 원탁: 상대 팀 위, 우리 팀 아래, 가운데 보관소 문과 두 병 ── */
const FX={'😅':'💦','😓':'💦','😤':'💢','😠':'💢','😡':'💢','🤨':'❓','🧐':'❓','😊':'💗','🙂':'💗','😄':'✨','💪':'✨','🔥':'🔥','😔':'💧','😞':'💧','😏':'🎵','😒':'💢','⚖️':'❗'};
function lastLineOf(v,T){ const c=v.chat[T].filter(x=>x.r===v.round).slice(-1)[0]; const p=(v.pub||[]).filter(x=>x.r===v.round).slice(-1)[0]; return c||p||null; }
function bubbleOf(v,i,T){ const L=v.chat[T].filter(x=>x.r===v.round&&x.seat===i).slice(-1)[0]; const P2=(v.pub||[]).filter(x=>x.r===v.round&&x.seat===i).slice(-1)[0]; return L||P2||null; }
function tableSeat(v,i,ctx,me,pos,ctxT){ const T=team(i), mine=T===team(me), inRoom=v.phase==='enter'&&v.cur===i, out=v.done[i]&&(v.phase==='enter'||v.phase==='open'||v.phase==='result');
  const md=v.mood&&v.mood[i], fresh=md&&md.n===v.moodN; const dw=(v.dwell[v.round]||[])[i];
  const tme=mine&&!isH(i)&&v.trust&&v.trust[i]?v.trust[i][me]:null, td=v.td&&v.td[i+'>'+me], tdNew=td&&td.n===v.tdN;
  const pe=v.pen&&v.pen[T]&&v.pen[T].who===i&&v.pen[T].r>=v.round-1;
  const last=ctxT.last, tgt=last&&last.t===i&&(v.phase==='meet'||v.phase==='result'), spk=last&&last.seat===i&&(v.phase==='meet'||v.phase==='result');
  const focus=ctxT.focus===i, won=ctxT.showRes&&ctxT.R.win===T, back=v.lastOut===i&&v.phase==='enter';
  const bub=mine||!isH(i)?bubbleOf(v,i,ctxT.myT):null, typing=ctxT.next===i;
  const votes=ctxT.votes.filter(x=>x===i).length;
  const gauge=tme!=null?`<div class="kg-tr ${tdNew?(td.d>0?'up':'down'):''}" title="나를 믿는 정도"><i style="width:${tme}%"></i><span>💗 ${tme}${tdNew?` <b>${td.d>0?'+':''}${td.d}</b>`:''}</span></div>`:'';
  const fx=fresh&&FX[md.e]?`<span class="kg-fx">${FX[md.e]}<i>${FX[md.e]}</i><i>${FX[md.e]}</i></span>`:'';
  return `<div class="kg-seat2 ${pos} ${mine?'mine':''} ${i===me?'me':''} ${spk?'speak':''} ${tgt?'tgt':''} ${focus?'focus':''} ${won?'hop':''} ${tdNew?(td.d>0?'flash-up':'flash-down'):''} ${md&&md.tell&&fresh?'tell':''}" data-seat="${i}">
    <div class="kg-bub ${(bub&&bub.r===v.round)||typing||(!mine&&!bub&&v.oppTalk)?'':'empty'} ${bub&&bub.r===v.round?'on':''} ${spk?'new':''} ${!mine&&!bub&&v.oppTalk?'whisper':''}">${typing?'<i class="dots">•••</i>':!mine&&!bub&&v.oppTalk&&(v.phase==='meet'||v.phase==='result')?'🤫 소곤소곤…':bub?fill(U.esc(bub.text.length>34?bub.text.slice(0,33)+'…':bub.text),ctx):''}</div>
    <div class="kg-body">${md&&!isH(i)?`<span class="kg-mood ${fresh?'pop':''}">${md.e}</span>`:''}${fx}
      <div class="kg-face2 ${back?'back':''}">${inRoom?'<span class="chair">🪑</span>':seatEmoji(i)}</div>
      <b class="kg-nm">${seatName(i,ctx)}</b>
      <div class="kg-chips">${i===me||v.phase==='over'?`<span class="kg-bn">🫘${v.beans[i]}</span>`:''}${mine&&v.promise[i]!=null?`<span class="kg-pr">🤝${v.promise[i]}</span>`:''}${out&&dw!=null?`<span class="kg-st ${dw>=4?'long':''}">⏱️${dw}초</span>`:''}${pe?'<span class="kg-pen">⚖️벌칙</span>':''}${votes?`<span class="kg-votes">${'🗳️'.repeat(votes)}</span>`:''}</div>
      ${gauge}${mine&&!isH(i)?`<div class="kg-th2">${thought(v,i,me,ctx)}</div>`:''}</div></div>`; }
function tableHTML(v,ctx,me){ const T=team(me), OT=1-T; const R=v.res[v.res.length-1], showRes=(v.phase==='result'||v.phase==='final'||v.phase==='over')&&R&&R.r===v.round;
  const last=lastLineOf(v,T); const bigK=['confess','sold','verdictV','only','accept','unfair','slow'];
  const focus=last&&bigK.includes(last.kind)&&(v.phase==='result')?(last.kind==='verdictV'||last.kind==='slow'||last.kind==='only'?(last.t??last.seat):last.seat):null;
  const VT=v.vote[T]; const votes=VT?Object.values(VT.votes).filter(x=>x>=0):[];
  const ctxT={last,focus,showRes,R,myT:T,next:v.nextSpk,votes};
  const inRoom=v.phase==='enter'?v.cur:null;
  const jar=t=>{ const fine=(v.fine[v.round]||[0,0])[t]; if(v.phase==='over') return `<b>${v.res.reduce((a,r)=>a+(r.jar[t]||0),0)}</b><small>총 넣은 콩</small>`;
    if(showRes){ if(R.win<0) return '<b>?</b><small>동점 — 비공개</small>'; return R.rev[t]!=null?`<b class="kg-count" data-to="${R.rev[t]}" data-key="${v.round}:${t}">${R.rev[t]}</b><div class="kg-pile">${Array.from({length:Math.min(R.rev[t],12)},(_,k)=>`<i style="animation-delay:${.25+k*Math.max(.09,.52/Math.max(1,R.rev[t]))}s">🫘</i>`).join("")}</div><small>공개</small>`:`<b>${R.rev[1-t]+1}+</b><small>비밀 (더 많음)</small>`; }
    return v.phase==='open'?'<b class="kg-shake">?</b><small>여는 중…</small>':`<b>?</b><small>${fine?'⚖️ 벌금 1개 들어감':'몰래 모으는 중'}</small>`; };
  const door=inRoom!=null?`<div class="kg-door busy"><div class="kg-walker ${team(inRoom)===T?'from-bot':'from-top'}">${seatEmoji(inRoom)}</div><div class="kg-doorlbl">🚪 ${seatName(inRoom,ctx)} 안에 있음 <span class="kg-clock">⏱️</span></div></div>`
    : `<div class="kg-door"><div class="kg-doorico">🚪</div><div class="kg-doorlbl">보관소</div></div>`;
  return `<div class="kg-table ${focus!=null?'dim':''} ${v.phase==='enter'?'roomtime':''} ${v.phase==='open'?'opening':''}">
    <div class="kg-tside top"><div class="kg-tname t${OT}">${TN[OT]} <span class="kg-pts">${dots(v.pts[OT])}</span></div><div class="kg-tseats">${TM[OT].map(i=>tableSeat(v,i,ctx,me,'top',ctxT)).join('')}</div></div>
    <div class="kg-tcenter"><div class="kg-jar3 t${OT} ${showRes&&R.win===OT?'won':''}"><span>🫙</span>${jar(OT)}</div>${door}<div class="kg-jar3 t${T} ${showRes&&R.win===T?'won':''}"><span>🫙</span>${jar(T)}</div></div>
    <div class="kg-tside bot"><div class="kg-tseats">${TM[T].map(i=>tableSeat(v,i,ctx,me,'bot',ctxT)).join('')}</div><div class="kg-tname t${T}">${TN[T]} (우리) <span class="kg-pts">${dots(v.pts[T])}</span></div></div>
    <svg class="kg-arrows" aria-hidden="true"><defs><marker id="kgah" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs></svg></div>`; }
/* 시선 화살표: 말한 사람 → 지목받은 사람, 투표 → 대상 */
function arrowPairs(v,me){ const T=team(me), out=[]; const last=lastLineOf(v,T); if(last&&last.t!=null&&last.seat!==last.t&&(v.phase==='meet'||v.phase==='result')) out.push([last.seat,last.t,['agreeH','believe','forgive'].includes(last.kind)?'good':'bad']);
  const VT=v.vote[T]; if(VT) Object.entries(VT.votes).forEach(([a,b])=>{ if(b>=0) out.push([+a,b,'vote']); }); return out; }
function drawArrows(el,pairs){ const tb=el.querySelector('.kg-table'), svg=el.querySelector('.kg-arrows'); if(!tb||!svg) return; const R0=tb.getBoundingClientRect(); svg.setAttribute('viewBox',`0 0 ${R0.width} ${R0.height}`);
  const c=i=>{ const e=tb.querySelector(`[data-seat="${i}"] .kg-face2`); if(!e) return null; const r=e.getBoundingClientRect(); return [r.left-R0.left+r.width/2, r.top-R0.top+r.height/2]; };
  svg.querySelectorAll('line').forEach(x=>x.remove());
  pairs.forEach(([a,b,cls],k)=>{ const p=c(a), q=c(b); if(!p||!q) return; const dx=q[0]-p[0], dy=q[1]-p[1], L=Math.hypot(dx,dy)||1, sh=22; const ln=document.createElementNS('http://www.w3.org/2000/svg','line');
    ln.setAttribute('x1',p[0]+dx/L*sh); ln.setAttribute('y1',p[1]+dy/L*sh); ln.setAttribute('x2',q[0]-dx/L*sh); ln.setAttribute('y2',q[1]-dy/L*sh); ln.setAttribute('class','ar '+cls); ln.setAttribute('marker-end','url(#kgah)'); ln.style.animationDelay=(k*.12)+'s'; svg.appendChild(ln); }); }
/* 병 공개: 0부터 톡톡 세어 올라감 (한 번만) */
const counted={};
function countUp(el,sfx){ el.querySelectorAll('.kg-count').forEach(b=>{ const key=b.dataset.key, to=+b.dataset.to; if(counted[key]) return; counted[key]=1; let n=0; b.textContent='0'; const tick=()=>{ if(n>=to){ b.classList.add('done'); return; } n++; b.textContent=n; if(sfx) sfx('chip'); setTimeout(tick, Math.max(90, 520/Math.max(1,to))); }; setTimeout(tick,250); }); }

function render(el,v,ctx){ syncH(v);
  WHO=v.who||{}; const me=HSEAT[ctx.me], T=team(me); const sg=v.round+':'+v.phase+':'+(v.cur??''); if(sg!==sig){ sig=sg; sel=null; propN=null; propOpen=false; spyOpen=false; }
  if(v.tdN!==lastTd){ if(lastTd!=null&&ctx.sfx){ const neg=Object.values(v.td||{}).some(x=>x.n===v.tdN&&x.d<0); ctx.sfx(neg?'bad':'score'); } lastTd=v.tdN; }
  { const curK=v.phase==='enter'?v.round+':'+v.cur:''; if(curK!==lastCurK){ if(lastCurK!==null&&curK&&ctx.sfx){ ctx.sfx('step'); setTimeout(()=>ctx.sfx&&ctx.sfx('door'),350); } lastCurK=curK; } const vc=v.vote[T]?Object.keys(v.vote[T].votes).length:0; if(vc>lastVc&&ctx.sfx) ctx.sfx('thud'); lastVc=vc; }
  const ln=v.lastLine&&v.lastLine[T]?v.lastLine[T].n:0; if(ln!==lastN){ if(lastN!=null&&ln>lastN&&ctx.sfx) ctx.sfx('tick'); lastN=ln; }
  let h=`<div class="hl-notice">${fill(U.esc(v.notice||''),ctx)}</div>`;
  const pb=(v.pub||[]).filter(x=>x.r===v.round).slice(-2); if(pb.length) h+=`<div class="kg-pub">${pb.map(x=>`<div><b>📣 ${seatEmoji(x.seat)} ${seatName(x.seat,ctx)}</b> ${fill(U.esc(x.text),ctx)}</div>`).join('')}</div>`;
  /* 팀 대화: 최근 3줄 — 원탁 아래로 */
  const feed=v.chat[T].filter(x=>x.r===v.round).slice(-3);
  const feedH=`<div class="vr-feed kg-feed"><div class="kg-fh">🔒 ${TN[T]} 대화 <small>상대 팀은 못 봐요</small></div>${feed.map((x,k)=>`<div class="${k===feed.length-1?'new':''}"><span class="w">${seatEmoji(x.seat)} ${seatName(x.seat,ctx)}</span> ${fill(U.esc(x.text),ctx)}</div>`).join('')||'<div class="empty">아직 조용해요</div>'}</div>`;
  /* 🕵️ 귓속말 (나만 봄) */
  const myDm=(v.dm[ctx.me]||[]).filter(m=>m.r===v.round||m.state==='open');
  const newOff=(v.dm[ctx.me]||[]).filter(m=>m.state==='open').map(m=>m.id).join(','); const dmNew=newOff&&newOff!==lastOff; if(newOff!==lastOff){ if(dmNew){ try{ navigator.vibrate&&navigator.vibrate([60,40,60]); }catch(_){} if(ctx.sfx) ctx.sfx('host'); } lastOff=newOff; }
  if(myDm.length){ h+=`<div class="kg-dm ${dmNew?'slide':''}"><div class="kg-fh">🕵️ 귓속말 <small>나만 봐요</small></div>${myDm.slice(-4).map(m=>`<div class="${m.state==='open'?'open':''}"><b>${seatEmoji(m.from)} ${seatName(m.from,ctx)}</b> ${fill(U.esc(m.text),ctx)}${m.state==='open'?`<div class="mr-btns"><button data-deal="${m.id}" data-how="truth">🤝 사실대로 알려 주기 (${v.prop[T]?v.prop[T].n:v.plan[T]?v.plan[T].n:'?'}개)</button><button class="ghost" data-deal="${m.id}" data-how="lie" data-n="${Math.min(15,(v.plan[T]?v.plan[T].n:4)+3)}">🤥 거짓말 (${Math.min(15,(v.plan[T]?v.plan[T].n:4)+3)}개라고)</button><button class="ghost" data-deal="${m.id}" data-how="no">🙅 거절</button></div><small>들키면 우리 팀이 알게 될 수도 있어요</small>`:''}</div>`).join('')}</div>`; }
  /* 내 행동 — 할 일이 생기면 판보다 위에 (스크롤 없이 바로 보이게) */
  if(v.phase==='meet'&&!v.ready[ctx.me]){ const mx=v.beans[me], sh=v.shares[T]?v.shares[T][TM[T].indexOf(me)]:null, myProp=v.prop[T]&&v.prop[T].by===me;
    if(propN==null) propN=v.plan[T]?v.plan[T].n:4; const spied=(v.dm[ctx.me]||[]).some(m=>m.r===v.round&&m.mine);
    h+=`<div class="vr-card kg-act kg-meet"><div class="kg-mrow"><span class="kg-mlbl">🤝 약속 <small>내 몫 ${sh??'-'}</small></span>${Array.from({length:Math.min(mx,6)+1},(_,k)=>`<button class="${v.promise[me]===k?'':'ghost'} ${sh===k?'sh':''}" data-pr="${k}">${k}</button>`).join('')}</div>
      <div class="kg-mrow">${myProp?'<small class="kg-note">📝 내 작전 제안함</small>':`<button class="ghost small ${propOpen?'on':''}" data-a="propopen">📝 작전 짜기</button>`}${spied?'':`<button class="ghost small ${spyOpen?'on':''}" data-a="spyopen">🕵️ 귓속말</button>`}<button data-a="ready" class="kg-go">보관소로 →</button></div>
      ${propOpen&&!myProp?`<div class="kg-prop"><small>팀 합계를 고르면 남은 콩에 맞춰 나눠서 제안해요</small><div class="mr-btns">${[0,3,4,5,6,7,8,10].map(n=>`<button class="${propN===n?'':'ghost'}" data-pn="${n}">${n===0?'0 (버리기)':n}</button>`).join('')}</div><div class="fh-act"><button data-a="propose">"우리 팀 ${propN}개 가요" 제안</button></div></div>`:''}
      ${spyOpen&&!spied?`<div class="kg-prop"><small>콩 1개를 주고 상대 팀 작전 합계를 물어봐요 (거절·거짓말할 수도)</small><div class="mr-btns">${TM[1-T].filter(j=>!isH(j)).map(j=>`<button class="ghost" data-spy="${j}">${seatEmoji(j)} ${seatName(j,ctx)}</button>`).join('')}</div></div>`:''}</div>`; }
  else if(v.phase==='meet') h+=`<div class="vr-card"><small>상대 팀 작전 회의가 끝나길 기다리는 중…</small></div>`;
  if(v.phase==='result'){ const D=v.disc[T], R0=v.res[v.res.length-1];
    let calc=''; if(R0&&R0.r===v.round){ const pSum=TM[T].reduce((a,j)=>a+(R0.prom[j]||0),0);
      calc = R0.win===T?`🎉 이겼어요! 우리 병 개수는 비밀 — 상대 ${R0.rev[1-T]}개보다는 많았어요 (약속 합 ${pSum}개)`
        : R0.win<0?`🤝 동점 — 양쪽 다 비공개 (우리 약속 합 ${pSum}개)`
        : D&&D.d>0?`🧮 우리 약속 합 <b>${D.promised}개</b> → 병엔 <b>${D.got}개</b> → <b class="kg-miss">${D.d}개 모자람</b> (누군가 덜 냈어요)`
        : `🧮 우리 약속 합 ${pSum}개 → 병 ${R0.rev[T]}개 — 약속은 지켰는데 상대가 더 냈어요`; }
    h+=`<div class="vr-card kg-act kg-calc"><div>${calc}</div>`;
    const VT=v.vote[T]; if(VT&&!VT.done&&!(me in VT.votes)){ h+=`<p><b>⚖️ 투표</b> — 덜 낸 것 같은 사람 한 명 (2표면 벌칙)</p><div class="mr-btns">${TM[T].filter(j=>j!==me).map(j=>`<button data-vote="${j}">🗳️ ${seatEmoji(j)} ${seatName(j,ctx)}</button>`).join('')}<button class="ghost" data-vote="-1">기권</button></div>`; }
    if(D&&D.d>0&&!v.ready[ctx.me]&&!(VT&&!VT.done)){ const mates=TM[T].filter(j=>j!==me);
      h+=`<p>한마디 할까요?</p><div class="mr-btns"><button class="ghost" data-say="honest">🙋 나는 약속대로 냈어요</button><button class="ghost" data-say="confess">🙇 사실 덜 냈어요</button>${mates.map(j=>`<button class="ghost" data-say="accuse" data-t="${j}">🤨 ${seatEmoji(j)} ${seatName(j,ctx)}?</button>`).join('')}</div>`; }
    h+=!v.ready[ctx.me]?`<div class="fh-act"><button data-a="ready" ${v.q.length?'disabled':''}>${v.q.length?'🗣️ 이야기 중…':'다음 라운드 →'}</button></div>`:'<small>다른 사람을 기다리는 중…</small>';
    h+='</div>'; }
  if(v.phase==='enter'&&v.cur===me){ const mx=v.beans[me]; if(sel==null) sel=Math.min(mx,v.promise[me]??0);
    h+=`<div class="vr-card kg-act kg-room"><b>🚪 보관소 — 나만 있어요</b><p>내 콩 <b>${mx}개</b>${v.promise[me]!=null?` · 약속 <b>${v.promise[me]}개</b>`:''}. 몇 개를 팀 병에 넣을까요?</p>
      <div class="kg-beans">${Array.from({length:mx+1},(_,k)=>`<button class="${sel===k?'':'ghost'}" data-n="${k}">${k}</button>`).join('')}</div>
      <div class="fh-act"><button data-a="put">🫘 ${sel}개 넣고 나오기</button></div><small>남는 콩: ${mx-sel}개 — 이긴 팀에서 가장 많이 남긴 사람이 우승</small></div>`; }
  /* 판: 🪑 원탁 */
  h+=tableHTML(v,ctx,me)+feedH;
  if(v.phase==='over'){ h+=recap(v,ctx); }
  /* 보조 정보 */
  const merged=v.chat[T].concat(v.pub||[]).slice().sort((a,b)=>(a.r-b.r)||((a.q||0)-(b.q||0))).map(x=>x.kind==='pub'?Object.assign({},x,{text:'📣 '+x.text}):x);
  const L=U.politics(merged,{seats:ALL,emo:seatEmoji,name:i=>seatName(i,ctx),me})+`<div class="side-box"><div class="side-h">📊 라운드 기록</div>${v.res.map(r=>`<div class="kg-hr ${r.win===T?'w':r.win===1-T?'l':''}"><b>${r.r}R</b> ${r.win<0?'🤝 동점':`${TS[r.win]} 승`}${r.rev[0]!=null?` · ⚪ ${r.rev[0]}개`:''}${r.rev[1]!=null?` · 🔴 ${r.rev[1]}개`:''}<br><small>우리 약속 합 ${TM[T].reduce((a,j)=>a+(r.prom[j]||0),0)}${r.rev[T]!=null?` → 실제 ${r.rev[T]}${r.rev[T]<TM[T].reduce((a,j)=>a+(r.prom[j]||0),0)?' ⚠️':''}`:''} · 나 ${r.put[me]??'-'}개</small></div>`).join('')||'<div class="side-row"><small>-</small></div>'}</div>
    <div class="side-box"><div class="side-h">💗 팀 관계 <small>누가 누구를 얼마나 믿나</small></div>${Object.entries(v.trust||{}).map(([i,m])=>`<div class="kg-rel"><b>${seatEmoji(+i)} ${seatName(+i,ctx)}</b>${Object.entries(m).map(([j,x])=>`<span class="${x<40?'lo':x>=75?'hi':''}">→ ${seatEmoji(+j)} ${x}</span>`).join('')}</div>`).join('')||'<small>-</small>'}</div>
    <div class="side-box"><div class="side-h">📖 규칙 요약</div><small>5라운드 · 먼저 3점 · 많이 넣은 팀이 1점<br>점수 같으면 남은 콩 많은 팀<br>진 팀 병만 공개, 동점은 비공개<br>이긴 팀 콩 최다 = 우승 · 진 팀 콩 최소 = 탈락 후보</small></div>`;
  const Rr=U.chat(merged,{emo:seatEmoji,name:i=>seatName(i,ctx),fill:t=>fill(t,ctx),me,title:'💬 대화 <small>우리 팀 + 📣 공개</small>'})+`<div class="side-box side-log"><div class="side-h">📜 진행 기록 <small>최근이 위</small></div>${v.log.slice(-60).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=`<div class="side3 has-chat"><div class="side-mid">${h}</div><aside class="side-l">${L}</aside><aside class="side-r">${Rr}</aside></div>`;
  const prs=arrowPairs(v,me); setTimeout(()=>{ drawArrows(el,prs); countUp(el,ctx.sfx); },30);
  el.onclick=e=>{ const pr=e.target.closest('[data-pr]'); if(pr) return ctx.act({k:'promise',n:+pr.dataset.pr});
    const pn=e.target.closest('[data-pn]'); if(pn){ propN=+pn.dataset.pn; return ctx.rerender(); }
    const dl=e.target.closest('[data-deal]'); if(dl) return ctx.act({k:'deal',id:+dl.dataset.deal,how:dl.dataset.how,n:dl.dataset.n!=null?+dl.dataset.n:undefined});
    const sp=e.target.closest('[data-spy]'); if(sp){ spyOpen=false; return ctx.act({k:'spy',t:+sp.dataset.spy}); }
    const vt=e.target.closest('[data-vote]'); if(vt) return ctx.act({k:'vote',t:+vt.dataset.vote});
    const sy=e.target.closest('[data-say]'); if(sy) return ctx.act({k:'say',what:sy.dataset.say,t:sy.dataset.t!=null?+sy.dataset.t:undefined});
    const n=e.target.closest('[data-n]'); if(n){ sel=+n.dataset.n; return ctx.rerender(); }
    const a=e.target.closest('[data-a]'); if(!a) return; if(a.dataset.a==='ready') return ctx.act({k:'ready'}); if(a.dataset.a==='propose') return ctx.act({k:'propose',n:propN}); if(a.dataset.a==='propopen'){ propOpen=!propOpen; spyOpen=false; return ctx.rerender(); } if(a.dataset.a==='spyopen'){ spyOpen=!spyOpen; propOpen=false; return ctx.rerender(); } if(a.dataset.a==='put'){ const c=sel; sel=null; return ctx.act({k:'put',n:c}); } };
}
function recap(v,ctx){ const ta=v.wt;
  const rows=ALL.map(i=>{ const cells=v.res.map(r=>{ const pr=r.prom[i], pu=r.put[i]; const tag=pr==null?'':pu<pr?'cut':pu>pr?'more':'ok'; return `<td class="${tag}">${pu}${pr!=null&&pu!==pr?`<small>/${pr}</small>`:''}</td>`; }).join('');
    return `<tr class="t${team(i)} ${v.champ.includes(i)?'champ':''} ${v.loser.includes(i)?'lose':''}"><th>${seatEmoji(i)} ${seatName(i,ctx)}</th>${cells}<td class="left">🫘 ${v.beans[i]}</td></tr>`; }).join('');
  const cutK=i=>v.res.reduce((a,r)=>a+(r.prom[i]!=null&&r.put[i]<r.prom[i]?r.prom[i]-r.put[i]:0),0);
  const sneak=ALL.slice().sort((a,b)=>cutK(b)-cutK(a))[0], loyal=ALL.filter(i=>v.res.every(r=>r.prom[i]==null||r.put[i]>=r.prom[i]));
  return `<div class="vr-recap"><div class="vr-win ${ta===1?'terror':''}">${ta<0?'🤝 무승부':`${TN[ta]} 승리 ${v.pts[0]}:${v.pts[1]}${v.tieBeans?` <small>(점수 같아서 남은 콩 ${v.tieBeans[0]}:${v.tieBeans[1]})</small>`:''}`}</div>
    <div class="vr-tl"><div class="vr-h">🫘 라운드별로 넣은 콩 <small>작은 숫자 = 약속 · 빨강 덜 냄 · 초록 더 냄</small></div><div class="kg-tw"><table class="kg-tab"><tr><th></th>${v.res.map(r=>`<th>${r.r}R<br><small>${r.win<0?'🤝':r.win===0?'⚪':'🔴'}</small></th>`).join('')}<th>남은 콩</th></tr>${rows}</table></div></div>
    <div class="vr-award">🏆 우승 <b>${v.champ.map(i=>`${seatEmoji(i)} ${seatName(i,ctx)}`).join('·')}</b>${v.loser.length?` · 💀 탈락 후보 <b>${v.loser.map(i=>`${seatEmoji(i)} ${seatName(i,ctx)}`).join('·')}</b>`:''}${cutK(sneak)>0?` · 🤫 몰래 아낀 사람 <b>${seatEmoji(sneak)} ${seatName(sneak,ctx)}</b> (${cutK(sneak)}개)`:''}${loyal.length?` · 🤝 약속 지킴 ${loyal.map(i=>seatEmoji(i)).join('')}`:''}${(()=>{ const avg=i=>{ const d=v.res.map(r=>(v.dwell[r.r]||[])[i]).filter(x=>x!=null); return d.length?d.reduce((a,b)=>a+b,0)/d.length:0; }; const slow=ALL.slice().sort((a,b)=>avg(b)-avg(a))[0]; const pen=(v.penLog||[]); return `${avg(slow)>0?` · ⏱️ 고민왕 <b>${seatEmoji(slow)} ${seatName(slow,ctx)}</b> (평균 ${avg(slow).toFixed(1)}초)`:''}${pen.length?` · ⚖️ 벌칙 ${pen.map(p=>`${p.r}R ${seatEmoji(p.who)}`).join(' ')}`:''}${(v.deal||[]).length?` · 🕵️ 내 귓속말 거래 ${v.deal.length}번`:''}`; })()}</div>
    ${(()=>{ const me=HSEAT[ctx.me]; const mates=TM[team(me)].filter(i=>!isH(i)&&v.trust&&v.trust[i]); if(!mates.length) return ''; return `<div class="vr-tl kg-rep"><div class="vr-h">💗 나에 대한 평판 <small>같은 인물은 다음 판에도 기억해요</small></div>${mates.map(i=>{ const x=v.trust[i][me]; return `<div><b>${seatEmoji(i)} ${seatName(i,ctx)}</b> <span class="kg-repv ${x<40?'lo':x>=75?'hi':''}">💗 ${x}</span> ${x>=75?'"또 같은 팀 하고 싶어요!"':x>=50?'"뭐, 나쁘지 않았어요."':x>=30?'"다음엔 좀 지켜볼게요."':'"다음엔 못 믿겠어요."'}</div>`; }).join('')}</div>`; })()}
    <div class="vr-tl"><div class="vr-h">📼 라운드 다시 보기 <small>옆으로 넘겨 보세요</small></div><div class="kg-replay">${v.res.map(r=>`<div class="kg-rcard ${r.win<0?'':r.win===0?'w0':'w1'}"><b>${r.r}라운드</b> <span>${r.win<0?'🤝 동점':`${TS[r.win]} 승`}</span><div class="kg-rjar">⚪ ${r.jar[0]} : ${r.jar[1]} 🔴</div>${ALL.map(i=>{ const pr=r.prom[i], pu=r.put[i], dw=(v.dwell[r.r]||[])[i]; return `<div class="kg-rrow ${pr!=null&&pu<pr?'cut':pr!=null&&pu>pr?'more':''}">${seatEmoji(i)} ${pu}${pr!=null?`<small>/${pr}</small>`:''}${dw!=null?` <small>⏱️${dw}</small>`:''}</div>`; }).join('')}${(v.penLog||[]).filter(p=>p.r===r.r).map(p=>`<div class="kg-rpen">⚖️ ${seatEmoji(p.who)} 벌칙 (${p.n}표)</div>`).join('')}${v.key.filter(x=>x.startsWith(r.r+'R')).slice(0,2).map(x=>`<div class="kg-rkey">${fill(U.esc(x.replace(/^\d+R · /,'')),ctx)}</div>`).join('')}</div>`).join('')}</div></div>
    ${v.key.length?`<div class="vr-tl"><div class="vr-h">🎬 결정적 장면</div>${v.key.map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`:''}
    ${(v.conf||[]).length?`<div class="vr-tl"><div class="vr-h">💭 끝나고 한마디</div>${v.conf.map(c=>`<div>${seatEmoji(c.seat)} <b>${seatName(c.seat,ctx)}</b> "${fill(U.esc(c.text),ctx)}"</div>`).join('')}</div>`:''}</div>`; }
function status(v,ctx){ syncH(v); const me=HSEAT[ctx.me]; if(v.phase==='over') return '';
  if(v.phase==='meet') return v.ready[ctx.me]?'🗣️ 상대 팀 회의가 끝나길 기다리는 중…':'🗣️ 몇 개 넣을지 약속하고(선택) "보관소로 →"를 누르세요';
  if(v.phase==='enter') return v.cur===me?'🚪 보관소 안 — 넣을 콩 개수를 고르고 "넣고 나오기"를 누르세요':`🚪 다른 사람이 보관소에 있어요… (내 차례 ${v.order.indexOf(me)+1}번째)`;
  if(v.phase==='open') return '🫙 병을 여는 중…'; if(v.phase==='result') return v.q.length?'📢 결과를 두고 팀끼리 이야기하는 중…':v.ready[ctx.me]?'상대가 다음 라운드로 넘어가길 기다리는 중…':'📢 한마디 하거나 "다음 라운드 →"를 누르세요'; return '진행 중…'; }
function coach(v,ctx){ const me=HSEAT[ctx.me], T=team(me);
  if(v.phase==='intro') return '팀이 3점을 먼저 내야 이겨요. 하지만 개인 우승은 "이긴 팀에서 콩을 가장 많이 남긴 사람"이에요.';
  if(v.phase==='meet'&&(v.dm[ctx.me]||[]).some(m=>m.state==='open')) return '🕵️ 귓속말 거래: 사실대로 알려 주면 콩을 받지만, 상대가 이기면 폭로될 수 있어요. 거짓말하면 상대가 엉뚱하게 작전을 짜요.';
  if(v.phase==='meet'&&v.round>=2) return '📝 작전 짜기로 팀 합계를 제안해 보세요. 💗 게이지가 낮은(나를 못 믿는) 팀원은 따르지 않을 수 있어요.';
  if(v.phase==='meet') return '약속은 팀원만 봐요. 약속보다 적게 내면 콩을 아낄 수 있지만, 지면 병 개수가 공개돼서 누군가 덜 낸 게 들통나요.';
  if(v.phase==='enter'&&v.cur===me) return '여기서 넣는 개수는 아무도 몰라요. 하지만 ⏱️ 보관소에 머문 시간은 다 보여요 — 오래 고민하면 의심받아요!';
  if(v.phase==='enter') return '⏱️ 누가 보관소에 몇 초 있었는지 보세요. 약속을 어길 땐 오래 망설이는 사람이 많아요(뻥쟁이는 일부러 빨리).';
  if(v.phase==='result'&&v.vote&&v.vote[T]&&!v.vote[T].done) return '⚖️ 투표: 2표를 받은 사람은 다음 라운드 먼저 입장하고 콩 1개를 공개 벌금으로 내요. 억울하게 찍힌 사람은 원망해요.';
  if(v.phase==='result'&&v.disc&&v.disc[T]&&v.disc[T].d>0) return '모자란 개수가 나왔어요. 덜 냈다면 고백할지, 모른 척할지, 지목할지 — 😅 진땀 흘리는 사람은 거짓말 중일지도!';
  if(v.phase==='result') return '이긴 팀은 자기 병 개수를 모르고, 진 팀만 개수가 공개돼요. 약속 합과 비교해 보세요(왼쪽 📊 라운드 기록).';
  return ''; }
const guide=`
<p><b>팀을 위해선 많이, 나를 위해선 적게</b> — 6인 3:3 팀전(우리 둘은 늘 다른 팀 + 성격 다른 컴퓨터 4명).</p>
<ol><li>각자 <b>콩 10개</b>. 5라운드 동안 한 명씩 <b>보관소</b>에 들어가 원하는 만큼 몰래 팀 병에 넣어요.</li>
<li>병에 콩이 <b>더 많은 팀</b>이 1점. <b>진 팀 병의 개수만 공개</b>(이긴 팀 개수는 비밀). 같으면 아무것도 공개 안 하고 점수 없음.</li>
<li>라운드마다 <b>팀 작전 회의</b>: "몇 개씩 넣자" 약속 — 팀원만 보고, 안 지켜도 돼요. 내가 작전을 짜 제안할 수도.</li>
<li>⏱️ 보관소에 <b>머문 시간</b>은 모두에게 보여요. 진 팀은 약속 합과 공개 개수를 따져 한 명씩 해명하고, <b>⚖️ 투표</b>로 벌칙(먼저 입장 + 공개 벌금 콩 1개).</li>
<li>🕵️ 상대 팀과 <b>귓속말 거래</b>(작전 합계 ↔ 콩)도 가능 — 들키면 팀 신뢰가 무너져요.</li>
<li>먼저 <b>3점</b>이면 승리, 5라운드 뒤엔 점수 높은 팀(같으면 남은 콩 많은 팀). 이긴 팀에서 콩을 <b>가장 많이 남긴</b> 사람이 🏆 우승, 진 팀에서 가장 적게 남긴 사람이 💀 탈락 후보.</li></ol>
<div class="tipbox">💡 <b>팁</b><br>· 💗 게이지 = 팀원이 나를 믿는 정도. 낮으면 내 작전을 안 따라요.<br>· 😅 진땀은 거짓말의 단서. 뻥이 센 사람은 태연해요.<br>· 같은 컴퓨터 인물은 다음 판에도 나를 기억해요.</div>`;
function demoAt(s,ph){ startRound(s); s.q=[]; s.chat[0]=[{r:1,seat:1,text:'1라운드는 4개면 충분해요. {s0} 1 · {s1} 2 · {s2} 1.',kind:'plan'},{r:1,seat:2,text:'1개 넣을게요.',kind:'ok'}]; s.promise[1]=2; s.promise[2]=1; if(ph) s.phase=ph; return s; }
const guideSteps=[
  {t:'🫘 콩 10개, 3:3', h:'원탁에 두 팀이 마주 앉아요. 각자 콩 <b>10개</b> — 팀 병에 넣을수록 팀이 유리, 남길수록 내가 유리.', demo:s=>s},
  {t:'🗣️ 작전 회의', focus:'.kg-table', h:'팀장이 "몇 개씩 넣자"를 제안해요. 약속은 <b>팀원만</b> 보고, <b>안 지켜도</b> 돼요. 📝 내가 작전을 짤 수도 있어요.', demo:s=>demoAt(s)},
  {t:'🚪 보관소는 혼자 · ⏱️ 시간은 공개', focus:'.kg-table', h:'한 명씩 문 안에 들어가 <b>몰래</b> 넣어요. 하지만 <b>몇 초 있었는지</b>는 모두가 봐요.', demo:s=>{ demoAt(s); startEnter(s); s.order=[2,1,4,0,3,5]; s.ei=3; s.cur=0; [2,1,4].forEach((j,k)=>{ s.done[j]=true; s.dwell[s.round][j]=[1.6,5.8,2.1][k]; }); s.lastOut=4; s.turn=0; return s; }},
  {t:'🫙 진 팀만 공개', focus:'.kg-tcenter', h:'많이 넣은 팀이 1점. <b>진 팀 병의 개수만</b> 공개돼요 — 약속 합보다 적으면 누군가 덜 냈어요!', demo:s=>{ demoAt(s); s.jar=[3,5]; s.put[1]=[1,1,1,2,2,1]; openJars(s); s.q=[]; return s; }},
  {t:'⚖️ 해명과 투표', focus:'.kg-tcenter', h:'모자람이 나오면 한 명씩 <b>해명</b>(고백·부인), 화살표로 <b>지목</b>, 그리고 투표 — 2표면 다음 라운드 벌칙.', demo:s=>{ demoAt(s); s.jar=[2,6]; s.put[1]=[1,0,1,2,2,2]; openJars(s); s.q=[]; s.vote[0]={votes:{1:0,2:1},done:false}; s.chat[0].push({r:1,seat:2,text:'계산하면 답은 {s0}예요.',kind:'only',t:0}); s.mood={1:{e:'😅',n:9,tell:1},2:{e:'🧐',n:10}}; s.moodN=10; s.sus[1][0]=1.6; s.sus[2][0]=1.2; s.td={'1>0':{d:-18,n:3}}; s.tdN=3; return s; }},
  {t:'💗 신뢰 · 😅 표정', focus:'.kg-tside.bot', h:'팀원마다 <b>나를 믿는 정도</b>(💗)와 표정·속마음이 보여요. <b>진땀(😅)</b>은 거짓말의 단서!', demo:s=>{ demoAt(s); s.mood={1:{e:'😅',n:5,tell:1},2:{e:'😤',n:6}}; s.moodN=6; s.sus[1][0]=-0.8; s.sus[2][0]=1.4; s.td={'2>0':{d:-15,n:2}}; s.tdN=2; return s; }},
  {t:'🕵️ 귓속말 거래', focus:'.kg-dm', h:'상대 팀이 몰래 "작전 합계 알려 주면 콩 줄게"를 걸어와요. 사실대로·거짓말·거절 — <b>들키면 폭로</b>돼요.', demo:s=>{ s.round=1; demoAt(s); s.dm[0].push({id:1,r:1,from:4,text:'쉿. 너희 팀 몇 개 내요? 알려 주면 콩 1개.',state:'open',price:1}); return s; }},
  {t:'🏆 우승은 콩을 남긴 사람', focus:'.vr-recap', h:'먼저 3점인 팀 승리. 그 팀에서 콩을 <b>가장 많이 남긴</b> 사람이 우승, 진 팀에서 가장 적게 남긴 사람은 탈락 후보. 라운드별 <b>다시 보기</b>도 있어요.', demo:s=>{ s.res=[1,2,3].map(r=>({r,win:0,rev:[null,2],prom:[1,2,1,1,1,1],put:[1,2,1,1,1,0],jar:[4,2]})); s.round=3; s.pts=[3,0]; s.beans=[7,4,7,7,7,8]; s.wt=0; s.noMem=1; finalize(s); return s; }},
];
window.GAMES.kong = { _sync:x=>syncH(x), maxH:6,
  title:'콩의 딜레마', ref:'더 지니어스 「콩의 딜레마」', emoji:'🫘', tags:['팀전','약속','배신','NPC','두뇌서바이벌'],
  tagline:'팀이 이기려면 콩을 많이, 내가 이기려면 콩을 적게 — 약속과 배신의 3:3 콩 싸움.',
  guide, guideSteps, coach, init, apply, mask, ai, aiDelay, render, status, step, stepDelay, noPersona:true, wide:true,
  reset(){ sel=null; sig=''; lastN=null; propN=null; spyOpen=false; lastTd=null; lastOff=''; for(const k in counted) delete counted[k]; },
  bar:(v,i)=>{ const s=HSEAT[i]; return `<span class="tag">${TS[team(s)]} ${v.pts[team(s)]}점${v.beans[s]!=null?` · 🫘${v.beans[s]}`:''}</span>`; },
  result:(v,ctx)=>{ const me=HSEAT[ctx.me]; return `${v.champ&&v.champ.includes(me)?'🏆 우승 · ':''}${v.loser&&v.loser.includes(me)?'💀 탈락 후보 · ':''}콩 ${v.beans[me]}개 남김`; },
  _E:{makePlan,npcPut,TM,team}, _H:HSEAT,
};
})();
