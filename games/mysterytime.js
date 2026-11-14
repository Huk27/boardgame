(function(){
'use strict';
/* 미스터리 타임 (피의 게임 시즌 3 · 2일차 메인 매치) — 6인(우리 둘 + NPC 4명)용.
   사건 이야기를 듣고 투표룸에 한 명씩 들어가 딜러에게 예/아니오 질문(입장당 3개까지, 질문마다 +1분)을 하거나 정답을 말함.
   정답 = 세 칸(키워드)을 모두 맞혀야 인정. 오답은 +5분. 정답이면 그 사람의 시계가 멈춤.
   한 바퀴 돌 때마다 시계 3분. 30분이 지나거나 첫 정답자가 나오면 힌트(한 칸) 전체 공개. 정답자 3명이 나오면 라운드 끝, 못 맞힌 사람은 +20분.
   2라운드 합계 시간이 가장 적은 사람이 우승, 가장 많은 사람이 탈락 후보. 우리 둘 중 시간이 적은 쪽이 승리. */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로, 나머지는 NPC */
const N=6, ROUNDS=2, CYC=3, MAXCYC=20, HINTCYC=10, QMAX=3, WRONG=5, FAILT=20, NEED=3; let HSEAT=[0,3]; const SEATORD=[0,3,1,4,2,5];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i), ALL=[...Array(N).keys()];
const nm=i=>`{s${i}}`;
/* 사건 — 답(ans)은 각 칸의 정답 번호, 질문의 cut은 그 답으로 지워지는 [칸, 보기] */
const PUZ=[
  {pic:'🛗🌧️', title:'엘리베이터', story:'지수는 아파트 10층에 산다. 퇴근길엔 늘 엘리베이터를 7층까지만 타고 내려 3층을 걸어 올라간다. 그런데 비 오는 날만은 10층까지 곧장 올라간다. 왜일까?',
    slots:[{l:'지수는',o:['키가 아주 작다','다리를 다쳤다','운동을 하려고 한다','엘리베이터가 무섭다']},{l:'비 오는 날 다른 점',o:['우산을 들고 있다','엘리베이터가 붐빈다','옷이 젖어 서두른다','관리인이 함께 탄다']},{l:'7층에서 내리는 이유',o:['10층 버튼에 손이 안 닿는다','7층에 친구가 산다','10층 버튼이 고장 났다','7층 계단이 지름길이다']}],
    ans:[0,0,0], hint:2,
    qs:[['일부러 운동하려는 건가요?','아니오',[[0,2],[2,3]]],['지수 몸에 특별한 점이 있나요?','네',[[0,2],[0,3]]],['지수가 다쳤나요?','아니오',[[0,1]]],['7층에 아는 사람이 사나요?','아니오',[[2,1]]],
      ['엘리베이터가 고장 났나요?','아니오',[[2,2]]],['비 오는 날 들고 있는 물건이 중요한가요?','네',[[1,1],[1,2],[1,3]]],['누가 도와주나요?','아니오',[[1,3]]],['버튼 위치가 중요한가요?','네',[[2,1],[2,3],[0,3]]],
      ['지수가 엘리베이터를 싫어하나요?','아니오',[[0,3]]],['날씨 때문에 서두르나요?','중요X',[[1,2]]],['엘리베이터 안에 사람이 많으면 달라지나요?','중요X',[[1,1]]],['지수가 어린아이인가요?','그럴수도',[[0,1],[0,2]]]]},
  {pic:'🗼🌊', title:'등대', story:'등대지기 민 씨는 그날 밤 일찍 불을 끄고 푹 잤다. 다음 날 아침 라디오 뉴스를 듣더니 그 자리에 주저앉아 울었다. 무슨 일이 있었을까?',
    slots:[{l:'뉴스 내용',o:['배가 암초에 부딪혔다','태풍이 온다','등대가 철거된다','가족이 다쳤다']},{l:'일이 생긴 원인',o:['등대 불이 꺼져 있었다','선장이 술을 마셨다','안개가 짙었다','엔진이 고장 났다']},{l:'민 씨가 운 이유',o:['자기 잘못이라서','일자리를 잃어서','가족이 걱정돼서','상을 놓쳐서']}],
    ans:[0,0,0], hint:1,
    qs:[['민 씨 가족 이야기인가요?','아니오',[[0,3],[2,2]]],['사고가 났나요?','네',[[0,1],[0,2]]],['바다에서 생긴 일인가요?','네',[[0,2],[0,3]]],['날씨 때문인가요?','아니오',[[0,1],[1,2]]],
      ['배에 고장이나 실수가 있었나요?','아니오',[[1,1],[1,3]]],['민 씨가 한 일과 관련 있나요?','네',[[1,1],[1,2],[1,3]]],['민 씨가 직장을 잃나요?','중요X',[[2,1]]],['민 씨가 책임을 느끼나요?','네',[[2,1],[2,2],[2,3]]],
      ['사람이 다쳤나요?','그럴수도',[[0,1],[0,2]]],['등대 불이 중요한가요?','네',[[1,1],[1,2],[1,3]]],['상이나 돈과 관련 있나요?','아니오',[[2,3]]],['민 씨가 늦잠을 잤나요?','중요X',[]]]},
  {pic:'🎪🎵', title:'멈춘 음악', story:'공연장에 흐르던 음악이 갑자기 뚝 멈췄다. 바로 그 순간, 한 여자가 목숨을 잃었다. 무슨 일일까?',
    slots:[{l:'여자는',o:['줄타기 곡예사','가수','피아니스트','관객']},{l:'음악의 역할',o:['줄 끝에 다 왔다는 신호','공연 시작 신호','조명이 꺼지는 신호','범인의 신호']},{l:'여자의 상태',o:['눈을 가리고 있었다','귀가 안 들렸다','몸이 아팠다','잠들어 있었다']}],
    ans:[0,0,0], hint:0,
    qs:[['여자가 공연자인가요?','네',[[0,3]]],['여자가 노래를 했나요?','아니오',[[0,1]]],['누군가 여자를 해쳤나요?','아니오',[[1,3]]],['여자가 높은 곳에 있었나요?','네',[[0,1],[0,2],[0,3]]],
      ['여자가 앞을 볼 수 있었나요?','아니오',[[2,1],[2,2],[2,3]]],['음악이 여자의 위치와 관련 있나요?','네',[[1,1],[1,2],[1,3]]],['여자가 병이 있었나요?','아니오',[[2,2]]],['여자가 소리를 들을 수 있었나요?','네',[[2,1]]],
      ['공연이 막 시작될 때였나요?','아니오',[[1,1]]],['조명과 관련 있나요?','중요X',[[1,2]]],['관객이 많았나요?','중요X',[]],['여자가 떨어졌나요?','네',[[0,1],[0,2],[0,3],[2,3]]]]},
  {pic:'🏜️🔥', title:'사막의 성냥', story:'사막 한가운데서 한 남자가 숨진 채 발견됐다. 그의 손에는 짧게 부러진 성냥개비 하나가 꼭 쥐어져 있었다. 무슨 일일까?',
    slots:[{l:'남자가 타고 있던 것',o:['열기구','자동차','낙타','비행기']},{l:'성냥의 쓰임',o:['제비뽑기','불 피우기','구조 신호','길 표시']},{l:'남자에게 일어난 일',o:['뛰어내렸다','길을 잃었다','물이 떨어졌다','잠들었다']}],
    ans:[0,0,0], hint:1,
    qs:[['다른 사람들도 함께 있었나요?','네',[]],['남자가 하늘에 있었나요?','네',[[0,1],[0,2]]],['엔진이 있는 탈것인가요?','아니오',[[0,1],[0,3]]],['성냥으로 불을 붙였나요?','아니오',[[1,1],[1,2]]],
      ['부러진 성냥이 중요한가요?','네',[[1,1],[1,3]]],['운이 나빴나요?','네',[[1,3]]],['남자가 스스로 떨어졌나요?','네',[[2,1],[2,2],[2,3]]],['목이 말라 죽었나요?','아니오',[[2,1],[2,2]]],
      ['무게가 중요한가요?','네',[[0,1],[0,2],[2,1],[2,3]]],['사고였나요?','그럴수도',[[2,3]]],['날씨가 더웠나요?','중요X',[]],['추락했나요?','네',[[0,1],[0,2],[2,1],[2,2],[2,3]]]]},
];
const STYLE={seojin:'logic', doyun:'warm', haram:'calm', yuna:'emo', minho:'sly', taekyung:'hot', jihu:'sly', soyul:'warm'};
const DEF_P={talk:.5,aggr:.5,trust:.5,bluff:.4,logic:.6,temper:.4};
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
const LINES={
  logic:{enter:['질문 정리해 왔어요.','{r}라운드, 하나씩 지워 볼게요.'], right:['맞죠? 인과가 다 이어져요.','정리 끝났어요.'], wrong:['…한 칸이 틀렸네요. 다시 볼게요.','계산 착오예요.'], react:['{t}, 빠르네요.','{t}이(가) 벌써요? 흥미롭네요.'], confess:['{q} — 이 질문에서 거의 정리됐어요.']},
  warm:{enter:['저 잠깐만 들어갈게요~','다들 화이팅! 저 다녀올게요 😊'], right:['헉 맞았어요?! 😊','다행이다… 맞았어요 🥲'], wrong:['아 아니구나 😢','틀렸어요… 5분 ㅠㅠ'], react:['와 {t} 대단해요!','{t} 축하해요~ 👏'], confess:['솔직히 "{q}" 듣고 감 잡았어요 😊']},
  calm:{enter:['…','들어갑니다.'], right:['…맞았네요.','…'], wrong:['…아니네요.','…흠.'], react:['…{t}.','…빠르네.'], confess:['…"{q}". 그걸로 충분했어요.']},
  emo:{enter:['떨려요 😬 들어갈게요!','이번엔 꼭 맞힐 거예요!'], right:['꺄 맞았다!! 🥳','대박 대박 맞았어요 😆'], wrong:['으아 틀렸어 😭','아 진짜 이거 아니야? 😣'], react:['헐 {t} 벌써?! 😱','{t} 천재 아니에요? 😵'], confess:['"{q}"에서 소름 돋았어요 😱']},
  sly:{enter:['금방 끝내고 나올게요 😏','다들 아직이에요? 😏'], right:['역시 😏','쉬운 거였네요 😏'], wrong:['…일부러 한번 던져 본 거예요 😏','흠, 딜러가 짜네요'], react:['{t}, 찍은 거 아니에요? 😏','{t} 운 좋네 😏'], confess:['"{q}" 그거 하나면 됐죠 😏']},
  hot:{enter:['갑니다! 바로 맞히고 올게요 🔥','비켜요 비켜!'], right:['봤죠?! 🔥','당연하죠!'], wrong:['아 왜 아니야! 😤','말도 안 돼! 😤'], react:['{t}?! 저도 곧 맞혀요! 🔥','{t} 빠른데? 😤'], confess:['"{q}" 듣자마자 알았어요 🔥']},
};
function lineOf(s,i,kind,vars){ const st=STYLE[P(s,i).id]||'calm', L=(LINES[st]||LINES.calm)[kind]||LINES.calm[kind]; if(!L) return '';
  const used=(s.used[i]=s.used[i]||[]); const pool=L.filter(x=>!used.includes(x)); const raw=pool.length?U.pick(pool):U.pick(L); used.push(raw);
  return raw.replace(/\{r\}/g,s.round).replace(/\{t\}/g,vars&&vars.t!=null?nm(vars.t):'').replace(/\{q\}/g,vars&&vars.q?vars.q:''); }

function init(starter,o){ const k=Math.max(2,Math.min(6,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  const s={phase:'intro', who:{}, starter, salt:Math.random()*1000|0, round:0, pz:U.shuffle([0,1,2,3]).slice(0,ROUNDS), clock:0, cyc:0, order:[], oi:-1, actor:null, vq:0,
    sol:Array(N).fill(null), solved:[], qn:Array(N).fill(0), wr:Array(N).fill(0), asked:ALL.map(()=>[]), cand:ALL.map(()=>null), wrongs:ALL.map(()=>[]),
    tot:Array(N).fill(0), rt:[], hint:null, visits:Array(N).fill(0), key:Array(N).fill(null),
    q:[], say:null, used:{}, log:[], turn:null, winner:null, ev:0, think:0, dlist:[], dj:0,
    notice:'🎙️ 메인 매치 「미스터리 타임」 — 사건의 진실을 가장 빨리 밝히는 사람이 우승합니다'};
  s.hs=HSEAT.slice(); const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=ids[k]);
  return s;
}
const puz=s=>PUZ[s.pz[s.round-1]];
function startRound(s){
  s.round++; s.clock=0; s.cyc=0; s.oi=-1; s.hint=null; s.solved=[]; s.sol=Array(N).fill(null); s.qn=Array(N).fill(0); s.wr=Array(N).fill(0);
  s.asked=ALL.map(()=>[]); s.wrongs=ALL.map(()=>[]); s.key=Array(N).fill(null); s.cand=ALL.map(()=>[[0,1,2,3],[0,1,2,3],[0,1,2,3]]);
  s.perm=puz(s).slots.map(x=>U.shuffle(x.o.map((_,k)=>k))); s.order=U.shuffle(ALL.slice()); s.phase='play'; s.actor=null; s.turn=null;
  s.q.push({k:'note',text:`🎙️ ${s.round}라운드 사건 — 「${puz(s).title}」 ${puz(s).pic}`});
  s.q.push({k:'note',text:'🎙️ 지금부터 모두의 시계가 흐릅니다. 투표룸은 한 명씩 들어갈 수 있어요'});
  s.q.push({k:'next'});
}
const left=s=>ALL.filter(i=>s.sol[i]==null);
function nextVisitor(s){
  if(s.solved.length>=NEED||!left(s).length){ endRound(s); return; }
  for(let g=0; g<N*2; g++){
    s.oi++; if(s.oi>=N){ s.oi=0; s.cyc++; s.clock+=CYC;
      if(s.cyc>=MAXCYC){ endRound(s); return; }
      if(s.cyc===HINTCYC&&!s.hint) giveHint(s,'⏰ 30분이 지났어요'); }
    const i=s.order[s.oi]; if(s.sol[i]!=null) continue;
    s.actor=i; s.vq=0; s.visits[i]++; s.phase='room'; s.turn=isH(i)?pOf(i):null; s.think=isH(i)?0:thinkFor(s,i,'enter');
    s.notice=`🚪 ${nm(i)}이(가) 투표룸에 들어갔어요 · ${s.clock}분 경과`; s.log.push(`🚪 ${nm(i)} 입장 (${s.clock}분)`);
    if(!isH(i)&&Math.random()<P(s,i).talk*.6){ const t=lineOf(s,i,'enter'); if(t) s.say={seat:i,text:t,n:(s.say?s.say.n:0)+1}; }
    return; }
  endRound(s);
}
function giveHint(s,why){ const p=puz(s); s.hint={slot:p.hint,opt:p.ans[p.hint]};
  s.q.push({k:'note',text:`💡 ${why} — 힌트 공개: "${p.slots[p.hint].l}" = ${p.slots[p.hint].o[p.ans[p.hint]]}`});
  for(const i of ALL) if(s.cand[i]) s.cand[i][p.hint]=[p.ans[p.hint]]; }
function thinkFor(s,i,kind){ const p=P(s,i); const base = kind==='answer'?1500 : kind==='enter'?650 : 850; const fast = HSEAT.every(h=>s.sol[h]!=null) ? .45 : 1;
  return Math.round((base*(1.25-p.temper*.5)*(.7+p.logic*.5) + Math.random()*450)*fast); }
function leave(s,i){ s.actor=null; s.turn=null; s.phase='play'; s.q.push({k:'next'}); }
const timeOf=(s,i)=> (s.sol[i]!=null?s.sol[i]:s.clock+FAILT) + s.qn[i] + WRONG*s.wr[i];
function endRound(s){
  s.phase='rend'; s.actor=null; s.turn=null; const p=puz(s);
  const t=ALL.map(i=>timeOf(s,i)); s.rt.push(t); t.forEach((x,i)=>s.tot[i]+=x);
  s.q.push({k:'note',text:`🎙️ ${s.round}라운드 종료 — 정답: ${p.slots.map((x,k)=>x.o[p.ans[k]]).join(' · ')}`});
  if(s.round<ROUNDS){ const rank=ALL.slice().sort((a,b)=>s.tot[a]-s.tot[b]); s.q.push({k:'note',text:`📋 중간 순위(시간은 비공개): ${rank.map((i,k)=>`${k+1}. ${nm(i)}`).join('  ')}`}); s.q.push({k:'round'}); }
  else { const rank=ALL.slice().sort((a,b)=>s.tot[b]-s.tot[a]); s.q.push({k:'note',text:'🎙️ 최종 결과를 꼴찌부터 발표합니다'});
    rank.forEach((i,k)=>s.q.push({k:'note',text:`${k===0?'💀 탈락 후보':k===N-1?'🏆 우승':`${N-k}위`} — ${nm(i)} · 총 ${s.tot[i]}분`}));
    s.q.push({k:'end'}); }
}
function endGame(s){ s.phase='debrief'; s.dlist=ALL.filter(i=>!isH(i)); s.dj=0; }
/* 공용 동작 */
function act(s,i,a){
  if(s.phase!=='room'||s.actor!==i) return '내 차례가 아니에요';
  const p=puz(s);
  if(a.k==='ask'){ const qi=a.qi|0; if(!(qi>=0&&qi<p.qs.length)) return '질문을 고르세요'; if(s.vq>=QMAX) return `한 번 들어가면 질문은 ${QMAX}개까지예요`;
    if(s.asked[i].some(x=>x.qi===qi)) return '이미 한 질문이에요';
    s.asked[i].push({qi,a:p.qs[qi][1],r:s.round}); s.vq++; s.qn[i]++; for(const [sl,o] of p.qs[qi][2]) if(s.cand[i]) s.cand[i][sl]=s.cand[i][sl].filter(x=>x!==o);
    if(!s.key[i]&&p.qs[qi][2].length>=3) s.key[i]=p.qs[qi][0];
    s.log.push(`❓ ${nm(i)} 질문 ${s.vq}개째 (+1분)`); s.notice=`❓ ${nm(i)}이(가) 딜러에게 질문 중… (${s.vq}/${QMAX})`; return null; }
  if(a.k==='answer'){ const pk=(a.pick||[]).map(x=>x|0); if(pk.length!==3||pk.some((x,k)=>!(x>=0&&x<p.slots[k].o.length))) return '세 칸을 모두 고르세요';
    if(pk.every((x,k)=>x===p.ans[k])){ s.sol[i]=s.clock; s.solved.push(i);
      s.notice=`✅ ${nm(i)} 정답! (${s.solved.length}번째 · ${s.clock}분) — 시계가 멈춥니다`; s.log.push(s.notice);
      if(!isH(i)){ const t=lineOf(s,i,'right'); if(t) s.say={seat:i,text:t,n:(s.say?s.say.n:0)+1}; }
      const others=ALL.filter(j=>j!==i&&!isH(j)&&s.sol[j]==null); if(others.length&&Math.random()<.8) s.q.push({k:'react',i:U.pick(others),by:i});
      if(s.solved.length===1&&!s.hint) giveHint(s,'첫 정답자가 나왔어요');
      leave(s,i); return null; }
    s.wr[i]++; s.wrongs[i].push(pk.join(',')); s.notice=`❌ ${nm(i)} 오답! (+${WRONG}분)`; s.log.push(s.notice);
    if(!isH(i)){ const t=lineOf(s,i,'wrong'); if(t) s.say={seat:i,text:t,n:(s.say?s.say.n:0)+1}; }
    leave(s,i); return null; }
  if(a.k==='leave'){ s.log.push(`🚶 ${nm(i)} 나옴`); leave(s,i); return null; }
  return '알 수 없는 동작';
}
/* 컴퓨터: 자기가 들은 답만으로 보기를 지움. 실력(lv)이 낮으면 지우기를 가끔 놓치고, 질문도 덜 고름 */
const LV=[{miss:.35,best:.35,thr:4},{miss:.12,best:.7,thr:2},{miss:0,best:1,thr:1}];
function candOf(v,i,L){ const p=v.puz, c=[[0,1,2,3],[0,1,2,3],[0,1,2,3]];
  if(v.hint) c[v.hint.slot]=[v.hint.opt];
  for(const x of v.asked[i]) if(x.r===v.round){ const q=p.qs[x.qi]; for(const [sl,o] of (q.cut||[])) if(L.miss===0||((x.qi*7+o*3+sl*5+i*3+(v.salt||0))%10)/10>=L.miss) c[sl]=c[sl].filter(y=>y!==o); }
  return c; }
function combos(c,wr){ const o=[]; for(const a of c[0]) for(const b of c[1]) for(const d of c[2]){ const k=[a,b,d]; if(!wr.includes(k.join(','))) o.push(k); } return o; }
function decide(v,i,lvl,pers){
  const L=LV[lvl==null?1:lvl], p=v.puz, c=candOf(v,i,L), cb=combos(c,v.wrongs[i]||[]); const pp=pers||DEF_P;
  const thr=Math.max(1, Math.round(L.thr*(.6+pp.aggr*.8)));
  const askedQ=new Set((v.asked[i]||[]).filter(x=>x.r===v.round).map(x=>x.qi));
  if(cb.length<=thr&&cb.length>0&&(v.vq>0||cb.length===1||Math.random()<.5)) return {k:'answer', pick:U.pick(cb)};
  if(v.vq<QMAX){ const free=p.qs.map((q,k)=>k).filter(k=>!askedQ.has(k)); if(free.length){
      const gain=k=>(p.qs[k].cut||[]).filter(([sl,o])=>c[sl].includes(o)).length;
      const best=free.slice().sort((a,b)=>gain(b)-gain(a)+(Math.random()-.5)*.5);
      const plan=Math.min(QMAX, 1+(pp.talk>.45?1:0)+(pp.logic>.55?1:0));
      if(v.vq<plan||cb.length>8){ const k = Math.random()<L.best ? best[0] : U.pick(free); if(gain(k)>0||Math.random()<.4) return {k:'ask', qi:k}; } } }
  if(cb.length&&cb.length<=thr*2&&Math.random()<pp.aggr*.5) return {k:'answer', pick:U.pick(cb)};
  return {k:'leave'};
}
/* NPC가 보는 정보 = 자기 자리 mask와 같은 수준 + 자기 질문 답으로 지울 수 있는 것(사람이 추론하는 몫을 cut으로 대신) */
function viewFor(s,i){ const v=maskSeat(s,i); const p=puz(s); v.puz.qs=p.qs.map((q,k)=>({t:q[0], cut: v.asked[i].some(x=>x.qi===k&&x.r===s.round)?q[2]:null})); return v; }
function npcMove(s,i){ const v=viewFor(s,i); const a=decide(v,i,1,P(s,i)); const e=act(s,i,a); if(e) act(s,i,{k:'leave'}); }
function maskSeat(s,i){ const v=U.clone(s), p=puz(s)||PUZ[0], open=s.phase==='rend'||s.phase==='debrief'||s.phase==='over';
  v.puz={pic:p.pic,title:p.title,story:p.story,slots:p.slots.map(x=>({l:x.l,o:x.o.slice()})),qs:p.qs.map(q=>({t:q[0]})), ans: open?p.ans.slice():null};
  v.asked=s.asked.map((a,j)=> j===i ? a.slice() : a.map(()=>({hidden:true})));
  v.wrongs=s.wrongs.map((w,j)=>j===i?w.slice():[]); v.cand=null; v.key=open?s.key:Array(N).fill(null); v.pz=null;
  v.rt = s.phase==='over'||s.phase==='debrief' ? s.rt : s.rt.map(()=>null);
  v.tot = s.phase==='over'||s.phase==='debrief' ? s.tot : Array(N).fill(null);
  if(s.round>=1&&s.phase!=='over'&&s.phase!=='debrief') v.rank = ALL.slice().sort((a,b)=>s.tot[a]-s.tot[b]);
  v.q=[]; v.used={}; v.think=null; return v; }
function mask(s,p){ syncH(s); return maskSeat(s,HSEAT[p]); }
function ai(v,lvl){ syncH(v); const i=HSEAT[1]; if(v.phase!=='room'||v.actor!==i) return null;
  /* 혼자 모드 상대: 내가 들은 답에 붙은 지우기 정보만 다시 붙임(답 문장 = 사람의 추론 몫) */
  const p=PUZ.find(x=>x.title===v.puz.title); const w=U.clone(v); w.puz.qs=p.qs.map((q,k)=>({t:q[0], cut: v.asked[i].some(x=>x.qi===k&&x.r===v.round)?q[2]:null}));
  return decide(w,i,lvl,DEF_P); }
function aiDelay(v){ return 1300+Math.random()*1700; }

function apply(s,p,a){ syncH(s); if(s.winner!=null) return '게임이 끝났어요'; if(!a) return '알 수 없는 동작'; if(s.q.some(e=>e.k!=='note'&&e.k!=='react')) return '잠시만요 — 진행 중이에요';
  const e=act(s,HSEAT[p],a); if(!e) s.ev++; return e; }
function stepDelay(s){ syncH(s);
  if(s.winner!=null) return null;
  if(s.phase==='intro') return 2400;
  if(s.q.length){ const k=s.q[0].k; return k==='note'?1800 : k==='react'?1300 : 400; }
  if(s.phase==='room') return isH(s.actor)?null:s.think;
  if(s.phase==='debrief') return s.dj<s.dlist.length?2300:1400;
  return null;
}
function step(s){ syncH(s);
  if(s.phase==='intro'){ startRound(s); s.ev++; return; }
  if(s.q.length){ const e=s.q.shift();
    if(e.k==='note'){ s.notice=e.text; s.log.push(e.text); }
    else if(e.k==='next') nextVisitor(s);
    else if(e.k==='round') startRound(s);
    else if(e.k==='end') endGame(s);
    else if(e.k==='react'){ const t=lineOf(s,e.i,'react',{t:e.by}); if(t){ s.say={seat:e.i,text:t,n:(s.say?s.say.n:0)+1}; s.log.push(`${nm(e.i)}: ${t}`); } }
    s.ev++; return; }
  if(s.phase==='room'&&!isH(s.actor)){ const i=s.actor; npcMove(s,i); if(s.phase==='room'&&s.actor===i) s.think=thinkFor(s,i,'ask'); s.ev++; return; }
  if(s.phase==='debrief'){ if(s.dj<s.dlist.length){ const i=s.dlist[s.dj++]; const t='(속마음) '+(s.key[i]?lineOf(s,i,'confess',{q:s.key[i]}):'솔직히 마지막까지 헷갈렸어요…');
      s.say={seat:i,text:t,n:(s.say?s.say.n:0)+1}; s.log.push(`💭 ${nm(i)}: ${t}`); s.ev++; return; }
    s.phase='over'; const a=s.tot[HSEAT[0]], b=s.tot[HSEAT[1]]; s.winner = a<b?0 : b<a?1 : 'both'; { const V=h=>s.tot[h], bv=Math.min(...HSEAT.map(V)); s.winners=HSEAT.map((h,p)=>V(h)===bv?p:-1).filter(x=>x>=0); } s.ev++; return; }
}

/* 화면 */
let WHO={}, pick=[null,null,null], qsel=[], cross={}, sig='';
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function josa(name,a,b){ const base=name.replace(/\(나\)$/,''), c=base.charCodeAt(base.length-1); return c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28 ? a : b; }
const JO={'이(가)':['이','가'],'은(는)':['은','는'],'을(를)':['을','를']};
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}(이\(가\)|은\(는\)|을\(를\))?/g,(_,d,j)=>{ const n=seatName(+d,ctx); return `${seatEmoji(+d)} ${n}${j?josa(n,JO[j][0],JO[j][1]):''}`; }); }
const ANSC={'네':'yes','아니오':'no','그럴수도':'may','중요X':'na'};
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{}; const me=HSEAT[ctx.me], p=v.puz;
  const sg=v.round+':'+v.phase+':'+v.actor+':'+v.visits.join(''); if(sg!==sig){ sig=sg; qsel=[]; }
  if(cross._r!==v.round){ cross={_r:v.round}; pick=[null,null,null]; }
  const myRoom = v.phase==='room'&&v.turn===ctx.me, solved=v.sol[me]!=null;
  let h=`<div class="hl-notice">${fill(U.esc(v.notice||''),ctx)}</div>`;
  h+=`<div class="vr-speech">${v.say?`<span class="w">${seatEmoji(v.say.seat)} ${seatName(v.say.seat,ctx)}</span> ${fill(U.esc(v.say.text),ctx)}`:'<i>　</i>'}</div>`;
  h+=`<div class="info">${v.round||1}/${ROUNDS}라운드 · ⏱️ <b>${v.clock}분</b> 경과 · 정답자 ${v.solved.length}/${NEED}${v.hint?' · 💡 힌트 공개됨':''} · 내 질문 ${v.qn[me]}개 · 오답 ${v.wr[me]}번</div>`;
  h+=`<div class="mt-seats">${ALL.map(i=>`<span class="mt-chip ${i===me?'me':''} ${v.actor===i?'act':''} ${v.sol[i]!=null?'ok':''}" title="${isH(i)?'':NPCI(i)[2]}">${v.actor===i?'🚪':v.sol[i]!=null?'✅':'🤔'} ${seatEmoji(i)} ${seatName(i,ctx)} <small>❓${v.qn[i]}${v.wr[i]?` ❌${v.wr[i]}`:''}</small></span>`).join('')}</div>`;
  if(v.round>=1){
    h+=`<div class="mt-case"><div class="mt-pic">${p.pic}</div><div><b>「${U.esc(p.title)}」</b><p>${U.esc(p.story)}</p></div></div>`;
    h+=`<div class="mt-slots">${p.slots.map((sl,k)=>`<div class="mt-slot"><div class="mt-l">${k+1}. ${U.esc(sl.l)} ${v.hint&&v.hint.slot===k?'<span class="mt-hint">💡 힌트</span>':''}</div><div class="mt-opts">${(v.perm&&v.perm[k]||sl.o.map((_,q)=>q)).map(j=>{ const o=sl.o[j];
        const isAns=p.ans&&p.ans[k]===j, hinted=v.hint&&v.hint.slot===k, x=cross[k+':'+j];
        const cls=[pick[k]===j?'sel':'', x?'x':'', isAns?'ans':'', hinted&&v.hint.opt!==j?'x':''].join(' ');
        return `<button class="mt-o ${cls}" data-s="${k}" data-o="${j}" ${solved||p.ans?'disabled':''}>${U.esc(o)}</button>`; }).join('')}</div></div>`).join('')}
      <small class="mt-tip">보기를 누르면 고르기 → 한 번 더 누르면 ✗ 지우기(메모용) → 다시 누르면 원래대로</small></div>`;
    const mine=v.asked[me].filter(x=>x.r===v.round);
    h+=`<div class="mt-qs"><div class="mt-qh">🗒️ 딜러에게 들은 답 <small>(나만 알아요)</small></div>${mine.length?mine.map(x=>`<div class="mt-qa"><span>${U.esc(p.qs[x.qi].t)}</span><b class="mt-a ${ANSC[x.a]}">${x.a}</b></div>`).join(''):'<div class="mt-qa"><small>아직 없음 — 투표룸에서 질문해 보세요</small></div>'}</div>`;
  }
  if(myRoom){ const askedSet=new Set(v.asked[me].filter(x=>x.r===v.round).map(x=>x.qi));
    h+=`<div class="vr-card"><b>🚪 투표룸 — 딜러와 둘만</b> <small>질문 ${v.vq}/${QMAX} (하나에 +1분) · 오답은 +${WRONG}분</small>
      <div class="mt-ask">${p.qs.map((q,k)=>`<button class="mt-q ${askedSet.has(k)?'done':''}" data-q="${k}" ${askedSet.has(k)||v.vq>=QMAX?'disabled':''}>${U.esc(q.t)}</button>`).join('')}</div>
      <div class="fh-act"><button data-a="answer" ${pick.every(x=>x!=null)?'':'disabled'} style="background:#b8412f">🗣️ 정답 말하기 ${pick.every(x=>x!=null)?'':'(세 칸을 먼저 고르세요)'}</button><button class="ghost" data-a="leave">🚶 나가기</button></div></div>`; }
  if(v.phase==='over'||v.phase==='debrief') h+=`<div class="sn-score">${ALL.slice().sort((a,b)=>v.tot[a]-v.tot[b]).map((i,k)=>`<div class="${isH(i)?'h':''}"><b>${k+1}. ${seatEmoji(i)} ${seatName(i,ctx)}</b> 총 ${v.tot[i]}분 <small>(${v.rt.map(r=>r[i]+'분').join(' + ')})</small></div>`).join('')}</div>`;
  const L=`<div class="side-box"><div class="side-h">🧠 테이블 상황</div>${ALL.map(i=>`<div class="side-row ${i===me?'me':''}" style="flex-wrap:wrap">${seatEmoji(i)} ${seatName(i,ctx)} <small>${v.sol[i]!=null?`✅ ${v.sol[i]}분`:'추리 중'} · 질문 ${v.qn[i]} · 오답 ${v.wr[i]}</small></div>`).join('')}
    ${v.rank&&v.round>1?`<div class="side-h" style="margin-top:8px">📋 1라운드 순위 <small>시간 비공개</small></div>${v.rank.map((i,k)=>`<div class="side-row"><small>${k+1}위</small> ${seatEmoji(i)} ${seatName(i,ctx)}</div>`).join('')}`:''}</div>`;
  const R=`<div class="side-box side-log"><div class="side-h">📜 진행 기록 <small>최근이 위</small></div>${v.log.slice(-70).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=`<div class="side3"><div class="side-mid">${h}</div><aside class="side-l">${L}</aside><aside class="side-r">${R}</aside></div>`;
  el.onclick=e=>{
    const o=e.target.closest('[data-o]'); if(o&&!o.disabled){ const k=+o.dataset.s, j=+o.dataset.o, key=k+':'+j;
      if(pick[k]===j){ pick[k]=null; cross[key]=true; } else if(cross[key]){ cross[key]=false; } else { pick[k]=j; cross[key]=false; } return ctx.rerender(); }
    const q=e.target.closest('[data-q]'); if(q&&!q.disabled) return ctx.act({k:'ask',qi:+q.dataset.q});
    const a=e.target.closest('[data-a]'); if(!a||a.disabled) return;
    if(a.dataset.a==='answer') return ctx.act({k:'answer',pick:pick.slice()}); if(a.dataset.a==='leave') return ctx.act({k:'leave'});
  };
}
function status(v,ctx){ syncH(v); if(v.phase==='over') return ''; if(v.phase==='room'&&v.turn===ctx.me) return '질문하거나 정답을 말하세요'; return v.sol[HSEAT[ctx.me]]!=null?'정답! 다른 사람을 기다려요':'추리하며 차례를 기다려요'; }
const guide=`
<p><b>바다거북 수프식 추리 레이스</b> (우리 둘 + 성격 다른 컴퓨터 플레이어 4명).</p>
<ol><li>라운드마다 짧은 <b>사건 이야기</b>가 공개돼요. 진실은 세 칸(키워드)으로 정리돼요.</li>
<li>한 명씩 <b>투표룸</b>에 들어가 딜러에게 질문(입장당 ${QMAX}개, 하나에 <b>+1분</b>). 답은 네 · 아니오 · 그럴수도 · 중요X — <b>나만 알아요</b>.</li>
<li>세 칸을 모두 고르고 <b>정답 말하기</b> — 맞히면 시계 멈춤, 틀리면 <b>+${WRONG}분</b>.</li>
<li>한 바퀴 돌 때마다 시계 ${CYC}분. 30분이 지나거나 첫 정답자가 나오면 <b>💡 힌트</b>(한 칸) 공개. 정답자 ${NEED}명이 나오면 라운드 끝, 못 맞히면 <b>+${FAILT}분</b>.</li>
<li>${ROUNDS}라운드 합계 시간이 적을수록 높은 순위. 우리 둘 중 시간이 적은 쪽이 승리.</li></ol>
<div class="tipbox">💡 <b>팁</b><br>· "네"보다 "아니오"가 보기를 더 많이 지워 줄 때도 있어요.<br>· 보기를 두 번 누르면 ✗ 표시 — 머릿속 메모용.<br>· 질문을 아끼고 찍는 것도 전략(오답 5분 vs 질문 1분).</div>`;
function demoBase(s){ startRound(s); s.q=[]; return s; }
const guideSteps=[
  {t:'📖 사건 공개', h:'라운드마다 짧은 <b>사건 이야기</b>. 진실은 아래 <b>세 칸</b>으로 정리돼요.', demo:s=>{ demoBase(s); s.notice='🎙️ 1라운드 사건 — 「'+puz(s).title+'」'; return s; }},
  {t:'🚪 투표룸 질문', h:'한 명씩 들어가 딜러에게 <b>예/아니오 질문</b>. 입장당 3개, 하나에 <b>+1분</b>. 답은 <b>나만</b> 봐요.', demo:s=>{ demoBase(s); s.phase='room'; s.actor=0; s.turn=0; const p=puz(s); [1,3].forEach(k=>{ s.asked[0].push({qi:k,a:p.qs[k][1],r:1}); s.qn[0]++; }); s.vq=2; s.visits[0]=1; return s; }},
  {t:'🗣️ 정답 말하기', h:'세 칸을 다 고르고 <b>정답 말하기</b>. 맞히면 시계가 멈추고, 틀리면 <b>+5분</b>.', demo:s=>{ demoBase(s); s.phase='room'; s.actor=0; s.turn=0; s.sol[1]=6; s.solved=[1]; s.clock=9; s.notice='✅ 정답! (1번째 · 6분) — 시계가 멈춥니다'; return s; }},
  {t:'💡 힌트와 마감', h:'30분이 지나거나 <b>첫 정답자</b>가 나오면 한 칸 힌트 공개. 정답자 <b>3명</b>이면 라운드 끝 — 못 맞히면 <b>+20분</b>.', demo:s=>{ demoBase(s); giveHint(s,'첫 정답자가 나왔어요'); s.q=[]; s.sol[2]=12; s.solved=[2]; s.clock=15; return s; }},
  {t:'🏆 승리', h:'2라운드 <b>합계 시간</b>이 가장 적은 사람이 우승, 가장 많은 사람은 탈락 후보.', demo:s=>{ demoBase(s); return s; }},
];
window.GAMES.mysterytime = { _sync:x=>syncH(x), maxH:6,
  title:'미스터리 타임', ref:'피의 게임 「미스터리 타임」', emoji:'🕵️', tags:['추리','퀴즈','NPC','두뇌서바이벌'],
  tagline:'예/아니오 질문만으로 사건의 진실을 맞혀라. 질문 1분, 오답 5분 — 가장 빠른 탐정이 이긴다.',
  guide, guideSteps, init, apply, mask, ai, aiDelay, render, status, step, stepDelay, noPersona:true, wide:true,
  reset(){ sig=''; pick=[null,null,null]; qsel=[]; cross={}; },
  bar:(v,i)=>`<span class="tag">${v.sol[HSEAT[i]]!=null?'✅':'🤔'} ❓${v.qn[HSEAT[i]]}</span>`,
  result:(v,ctx)=>{ const me=HSEAT[ctx.me]; return v.tot&&v.tot[me]!=null?`총 ${v.tot[me]}분`:''; },
  _decide:decide, _viewFor:viewFor, _H:HSEAT, _PUZ:PUZ,
};
})();
