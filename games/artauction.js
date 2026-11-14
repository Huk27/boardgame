(function(){
'use strict';
/* 아트경매 (피의 게임 시즌 3 · 파이널 1라운드) — 4인(우리 둘 + NPC 2명).
   시작 전 명화 30점(제목·작가·연도·내용)을 외움 → 10번의 경매. 경매품마다 가치(합 2억, 최소 500만)와 문제 종류가 공개되고, 각자 몰래 입찰(시작가 = 가치의 10%, 자본금 3,000만).
   가장 높게 부른 사람부터 문제(4지선다)에 답함: 맞히면 낙찰(입찰가를 내고 작품 가치를 얻음), 틀리면 입찰가만 잃고 다음 사람이 '도전' 또는 '포기'.
   경매에 빠지는 건 3번까지. 최종 자산(남은 자본 + 작품 가치)이 가장 큰 사람 승리 — 낙찰품이 하나도 없으면 우승 불가. */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로, 나머지는 NPC */
const N=4, ROUNDS=10, CAP=3000, TOTAL=20000, MINV=500, PASSES=3, MEMO=120000, BID_T=20000; let HSEAT=[0,2]; const SEATORD=[0,2,1,3];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i), ALL=[0,1,2,3];
const nm=i=>`{s${i}}`;
const ART=[
  ['모나리자','레오나르도 다빈치',1503,'옅은 미소를 띤 여인의 초상'], ['최후의 만찬','레오나르도 다빈치',1498,'긴 식탁에 둘러앉은 열세 사람'], ['별이 빛나는 밤','빈센트 반 고흐',1889,'소용돌이치는 밤하늘과 사이프러스 나무'],
  ['해바라기','빈센트 반 고흐',1888,'꽃병에 꽂힌 노란 꽃들'], ['절규','에드바르 뭉크',1893,'다리 위에서 귀를 막고 비명을 지르는 사람'], ['진주 귀걸이를 한 소녀','요하네스 페르메이르',1665,'푸른 터번을 두르고 돌아보는 소녀'],
  ['우유를 따르는 여인','요하네스 페르메이르',1658,'부엌 창가에서 우유를 붓는 하녀'], ['비너스의 탄생','산드로 보티첼리',1485,'조개껍데기 위에 선 여신'], ['게르니카','파블로 피카소',1937,'흑백으로 그린 폭격의 참상'],
  ['아비뇽의 처녀들','파블로 피카소',1907,'각진 얼굴의 다섯 여인'], ['기억의 지속','살바도르 달리',1931,'녹아내리는 시계들'], ['인상, 해돋이','클로드 모네',1872,'안개 낀 항구 위의 붉은 해'],
  ['키스','구스타프 클림트',1908,'금빛 옷을 두르고 입맞추는 연인'], ['아테네 학당','라파엘로',1511,'아치 아래 모인 고대 철학자들'], ['아담의 창조','미켈란젤로',1512,'손끝이 닿을 듯한 신과 인간'],
  ['야경','렘브란트',1642,'어둠 속에서 출동하는 민병대'], ['시녀들','디에고 벨라스케스',1656,'공주와 시녀들, 거울 속 왕과 왕비'], ['민중을 이끄는 자유의 여신','외젠 들라크루아',1830,'깃발을 들고 앞장선 여인'],
  ['그랑드자트 섬의 일요일 오후','조르주 쇠라',1886,'점을 찍어 그린 강가의 산책객'], ['이삭 줍는 여인들','장프랑수아 밀레',1857,'허리 굽혀 밭에서 이삭을 줍는 세 여인'], ['만종','장프랑수아 밀레',1859,'저녁 종소리에 기도하는 부부'],
  ['물랭 드 라 갈레트의 무도회','피에르오귀스트 르누아르',1876,'햇살 아래 춤추는 사람들'], ['올랭피아','에두아르 마네',1863,'침대에 기대 정면을 보는 여인'], ['풀밭 위의 점심 식사','에두아르 마네',1863,'숲속 소풍, 옷 입은 남자들과 벗은 여인'],
  ['아메리칸 고딕','그랜트 우드',1930,'쇠스랑을 든 농부와 여인'], ['밤샘하는 사람들','에드워드 호퍼',1942,'한밤중 불 켜진 식당'], ['가나가와 해변의 높은 파도','가쓰시카 호쿠사이',1831,'배를 덮치는 거대한 파도와 후지산'],
  ['세한도','김정희',1844,'눈 내린 겨울, 소나무와 잣나무 옆 작은 집'], ['몽유도원도','안견',1447,'꿈에서 본 복숭아꽃 낙원'], ['인왕제색도','정선',1751,'비 갠 뒤 인왕산의 바위'],
];
const QT=[{k:'artist',l:'작가 맞히기'},{k:'year',l:'연도 맞히기'},{k:'title',l:'제목 맞히기(내용 보고)'}];
const jo=(w,a,b)=>{ const c=w.charCodeAt(w.length-1); return c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28?a:b; };
function makeQ(a,kind){ const A=ART[a]; if(kind==='artist'){ const pool=[...new Set(ART.map(x=>x[1]))].filter(x=>x!==A[1]); const o=U.shuffle(U.shuffle(pool).slice(0,3).concat([A[1]])); return {q:`「${A[0]}」${jo(A[0],'을','를')} 그린 사람은?`, o, a:o.indexOf(A[1])}; }
  if(kind==='year'){ const near=ART.map(x=>x[2]).filter(y=>y!==A[2]).sort((x,y)=>Math.abs(x-A[2])-Math.abs(y-A[2])); const o=U.shuffle(U.shuffle(near.slice(0,6)).slice(0,3).concat([A[2]])); return {q:`「${A[0]}」${jo(A[0],'이','가')} 그려진 해는?`, o:o.map(String), a:o.indexOf(A[2])}; }
  const pool=ART.map(x=>x[0]).filter(x=>x!==A[0]); const o=U.shuffle(U.shuffle(pool).slice(0,3).concat([A[0]])); return {q:`"${A[3]}" — 이 작품의 제목은?`, o, a:o.indexOf(A[0])}; }
function values(){ const w=[...Array(ROUNDS)].map(()=>.3+Math.random()); const t=w.reduce((a,b)=>a+b,0); let v=w.map(x=>Math.max(MINV,Math.round(x/t*TOTAL/100)*100)); const d=TOTAL-v.reduce((a,b)=>a+b,0); v[v.indexOf(Math.max(...v))]+=d; return U.shuffle(v); }
const STYLE={seojin:'logic', doyun:'warm', haram:'calm', yuna:'emo', minho:'sly', taekyung:'hot', jihu:'sly', soyul:'warm'};
const DEF_P={talk:.5,aggr:.5,trust:.5,bluff:.4,logic:.6,temper:.4};
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
const LINES={
  logic:{win:['기억대로예요.','확실히 외워 뒀죠.'], wrong:['…연도가 헷갈렸네요.','외운 줄 알았는데요.'], pass:['이건 자신 없어요. 패스.'], big:['가치 대비 적정가예요.']},
  warm:{win:['헤헤 맞았다 😊','다행이다~'], wrong:['아 틀렸어요 😢','헷갈렸어요 🥲'], pass:['이건 양보할게요~'], big:['조금 무리해 볼게요 😊']},
  calm:{win:['…','…맞네요.'], wrong:['…아.','…'], pass:['…패스.'], big:['…']},
  emo:{win:['꺄 맞혔다!! 🥳','대박!'], wrong:['으아 아니야?! 😭','헐 망했다'], pass:['이건 몰라요 😣'], big:['질러 버릴래요!! 🤩']},
  sly:{win:['당연하죠 😏','이 정도야 😏'], wrong:['…일부러 틀린 거예요 😏','흠'], pass:['이번엔 구경할게요 😏'], big:['비싸게 사 줄게요 😏']},
  hot:{win:['봤죠?! 🔥','당연하지!'], wrong:['아 진짜!! 😤','분하다!'], pass:['다음 거 노린다!'], big:['무조건 가져갑니다 🔥']},
};
function lineOf(s,i,kind){ const st=STYLE[P(s,i).id]||'calm', L=(LINES[st]||LINES.calm)[kind]; if(!L) return ''; const used=(s.used[i]=s.used[i]||[]); const pool=L.filter(x=>!used.includes(x)); const raw=pool.length?U.pick(pool):U.pick(L); used.push(raw); return raw; }
function say(s,i,kind){ if(isH(i)) return; const t=lineOf(s,i,kind); if(t){ s.say={seat:i,text:t,n:(s.say?s.say.n:0)+1}; } }

function init(starter,o){ { const hk=Math.max(2,Math.min(4,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,hk); }
  const items=U.shuffle(ART.map((_,k)=>k)).slice(0,ROUNDS).map((a,k)=>({a, kind:QT[Math.random()*3|0].k}));
  const vals=values(); items.forEach((it,k)=>it.v=vals[k]);
  const s={phase:'intro', who:{}, starter:starter|0, items, round:0, cap:Array(N).fill(CAP), won:ALL.map(()=>[]), passes:Array(N).fill(0), bid:Array(N).fill(null), order:[], oi:0, Q:null, ans:null,
    mem:null, until:0, hist:[], used:{}, say:null, log:[], turn:null, actor:null, winner:null, ev:0, notice:'🎙️ 파이널 1라운드 「아트경매」 — 명화를 외우고, 아는 작품만 사세요'};
  s.hs=HSEAT.slice(); const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=ids[k]);
  return s;
}
const assets=(s,i)=>s.cap[i]+s.won[i].reduce((a,it)=>a+it.v,0);
function startMemo(s){ s.phase='memo'; s.until=Date.now()+MEMO; s.mem=ALL.map(i=>isH(i)?null:ART.map(()=>({artist:Math.random()<memAcc(s,i),year:Math.random()<memAcc(s,i)*.8,title:Math.random()<memAcc(s,i)})));
  s.notice=`🖼️ 명화 전시실 — ${MEMO/1000}초 동안 30점을 외우세요 (제목·작가·연도·내용)`; }
const memAcc=(s,i)=>.45+P(s,i).logic*.35;
function startRound(s){ s.round++; const it=s.items[s.round-1]; s.bid=Array(N).fill(null); s.Q=null; s.ans=null; s.phase='bid'; s.until=Date.now()+BID_T; s.turn=null; s.actor=null;
  s.notice=`🔨 ${s.round}/${ROUNDS} 경매품 — 가치 ${it.v.toLocaleString()}만 원 · 문제: ${QT.find(q=>q.k===it.kind).l} · 시작가 ${it.v/10}만`; s.log.push(`🔨 ${s.round}번 경매품 (가치 ${it.v}만, ${QT.find(q=>q.k===it.kind).l})`); }
function act(s,i,a){
  if(a.k==='bid'){ if(s.phase!=='bid') return '지금은 입찰 시간이 아니에요'; if(s.bid[i]!=null) return '이미 입찰했어요'; const it=s.items[s.round-1];
    if(a.pass){ if(s.passes[i]>=PASSES&&s.cap[i]>=it.v/10) return `불참은 ${PASSES}번까지예요`; s.bid[i]=0; return null; }
    const b=Math.round((a.b|0)/10)*10; if(b<it.v/10) return `시작가 ${it.v/10}만 이상`; if(b>s.cap[i]) return '자본금이 모자라요'; s.bid[i]=b; return null; }
  if(a.k==='ready'){ if(s.phase!=='memo') return '지금은 아니에요'; s.ready=s.ready||{}; s.ready[i]=true; if(HSEAT.every(h=>s.ready[h])) s.until=Date.now(); return null; }
  if(a.k==='ans'){ if(s.phase!=='ans'||s.actor!==i) return '내 답할 차례가 아니에요'; const k=a.c|0; if(k<0||k>3) return '보기를 고르세요'; answer(s,i,k); return null; }
  if(a.k==='chal'){ if(s.phase!=='chal'||s.actor!==i) return '내 차례가 아니에요'; if(a.go){ s.phase='ans'; s.notice=`🙋 ${nm(i)} 도전!`; s.log.push(s.notice); } else { s.log.push(`🙅 ${nm(i)} 포기`); nextChallenger(s); } return null; }
  return '알 수 없는 동작'; }
function resolveBids(s){ const it=s.items[s.round-1]; ALL.forEach(i=>{ if(s.bid[i]===0) s.passes[i]++; });
  s.order=ALL.filter(i=>s.bid[i]>0).sort((a,b)=>s.bid[b]-s.bid[a]||Math.random()-.5); s.oi=0; s.Q=makeQ(it.a,it.kind);
  s.notice=`📣 입찰 공개 — ${ALL.map(i=>`${nm(i)} ${s.bid[i]?s.bid[i]+'만':'불참'}`).join(' · ')}`; s.log.push(s.notice);
  if(!s.order.length){ s.q2='none'; return; } s.q2='first'; }
function answer(s,i,k){ const it=s.items[s.round-1]; const ok=k===s.Q.a; s.cap[i]-=s.bid[i];
  if(ok){ s.won[i].push(it); s.notice=`⭕ ${nm(i)} 정답 「${s.Q.o[s.Q.a]}」 — ${s.bid[i]}만 원에 낙찰! (가치 ${it.v}만)`; s.log.push(s.notice); s.hist.push({r:s.round,w:i,bid:s.bid[i],v:it.v}); say(s,i,'win'); s.phase='rend'; s.turn=null; s.actor=null; return; }
  s.notice=`❌ ${nm(i)} 오답 — 입찰가 ${s.bid[i]}만 원만 잃어요`; s.log.push(s.notice); say(s,i,'wrong'); s.wrongs=(s.wrongs||[]).concat([k]); nextChallenger(s); }
function nextChallenger(s){ s.oi++; if(s.oi>=s.order.length){ s.notice+=' · 아무도 낙찰받지 못했어요'; s.hist.push({r:s.round,w:null}); s.phase='rend'; s.turn=null; s.actor=null; return; }
  const i=s.order[s.oi]; s.phase='chal'; setActor(s,i); s.notice=`🤔 다음 순위 ${nm(i)} (${s.bid[i]}만) — 도전? 포기?`; }
function setActor(s,i){ s.actor=i; s.turn=isH(i)?pOf(i):null; s.think=isH(i)?0:1500+Math.random()*1800; }
function stepDelay(s){ syncH(s); if(s.winner!=null) return null; const now=Date.now();
  if(s.phase==='intro') return 2200; if(s.phase==='memo') return Math.max(60,s.until-now);
  if(s.phase==='bid'){ if(s.bid.every(x=>x!=null)) return 600; const npc=ALL.some(i=>!isH(i)&&s.bid[i]==null); return npc?900+Math.random()*1200:Math.max(60,s.until-now); }
  if(s.phase==='reveal') return 2600; if(s.phase==='ans'||s.phase==='chal') return isH(s.actor)?null:s.think; if(s.phase==='rend') return 2800; if(s.phase==='final') return 3000; return null; }
function step(s){ syncH(s); const now=Date.now();
  if(s.phase==='intro'){ startMemo(s); s.ev++; return; }
  if(s.phase==='memo'){ if(now<s.until) return; s.notice='🙈 전시실 문이 닫혔어요 — 이제 경매!'; startRound(s); s.ev++; return; }
  if(s.phase==='bid'){ const npc=ALL.find(i=>!isH(i)&&s.bid[i]==null); if(npc!=null){ const d=decideBid(s,npc,1); act(s,npc,d); s.log.push(`🤫 ${nm(npc)} 입찰함`); s.ev++; return; }
    if(s.bid.every(x=>x!=null)||now>=s.until){ ALL.forEach(i=>{ if(s.bid[i]==null){ if(s.passes[i]<PASSES||s.cap[i]<s.items[s.round-1].v/10) s.bid[i]=0; else s.bid[i]=s.items[s.round-1].v/10; } }); resolveBids(s); s.phase='reveal'; s.ev++; } return; }
  if(s.phase==='reveal'){ if(s.q2==='none'){ s.notice='🙅 모두 불참 — 유찰'; s.hist.push({r:s.round,w:null}); s.phase='rend'; s.ev++; return; } const i=s.order[0]; s.phase='ans'; setActor(s,i); s.notice=`❓ 최고가 ${nm(i)} (${s.bid[i]}만) — ${s.Q.q}`; if(s.bid[i]>=s.items[s.round-1].v*.6) say(s,i,'big'); s.ev++; return; }
  if(s.phase==='ans'&&!isH(s.actor)){ const i=s.actor; answer(s,i,npcAnswer(s,i)); s.ev++; return; }
  if(s.phase==='chal'&&!isH(s.actor)){ const i=s.actor; act(s,i,{k:'chal',go:npcChal(s,i)}); s.ev++; return; }
  if(s.phase==='rend'){ s.wrongs=[]; if(s.round<ROUNDS){ startRound(s); s.ev++; return; } s.phase='final'; const r=rank(s); s.notice=`🏁 최종 자산 — ${r.map((i,k)=>`${k+1}. ${nm(i)} ${assets(s,i).toLocaleString()}만${s.won[i].length?'':'(낙찰품 없음)'}`).join(' · ')}`; s.log.push(s.notice); s.ev++; return; }
  if(s.phase==='final'){ s.phase='over'; const sc=p=>s.won[HSEAT[p]].length?assets(s,HSEAT[p]):-1; const a=sc(0), b=sc(1); s.winner=a>b?0:b>a?1:'both'; { const mx=Math.max(...HSEAT.map((h,p)=>sc(p))); s.winners=HSEAT.map((h,p)=>sc(p)===mx?p:-1).filter(x=>x>=0); } s.ev++; return; }
}
const rank=s=>ALL.slice().sort((a,b)=>(s.won[b].length?assets(s,b):-1)-(s.won[a].length?assets(s,a):-1));
/* NPC: 외워 둔 것(기억 표)으로만 답함, 입찰은 맞힐 확률 × 가치 */
function knows(memRow,kind){ return memRow ? memRow[kind] : false; }
function npcAnswer(s,i){ const it=s.items[s.round-1]; const k=knows(s.mem[i][it.a],it.kind); const left=[0,1,2,3].filter(x=>!(s.wrongs||[]).includes(x));
  if(k&&Math.random()<.95) return s.Q.a; return U.pick(left); }
function pCorrect(known,wrongs){ return known?.93:1/Math.max(1,4-(wrongs||0)); }
function decideBid(s,i,lvl){ const it=s.items[s.round-1], p=P(s,i); const k=s.mem&&s.mem[i]?knows(s.mem[i][it.a],it.kind):false; const pc=pCorrect(k,0); const start=it.v/10;
  const W=pc*it.v; const roundsLeft=ROUNDS-s.round; const capKeep=s.cap[i]*(roundsLeft>3?.35:0);
  if(s.cap[i]<start) return {k:'bid',pass:true}; if(W<start*1.3){ if(s.passes[i]<PASSES) return {k:'bid',pass:true}; return {k:'bid',b:start}; }
  let b=start+(W-start)*(.35+p.aggr*.35+(Math.random()-.5)*.15); b=Math.min(b,s.cap[i]-capKeep,s.cap[i]); b=Math.max(start,Math.round(b/10)*10); return {k:'bid',b}; }
function npcChal(s,i){ const it=s.items[s.round-1]; const k=knows(s.mem[i][it.a],it.kind); return pCorrect(k,(s.wrongs||[]).length)*it.v>s.bid[i]*1.1; }
function mask(s,p){ syncH(s); const v=U.clone(s), me=HSEAT[p]; v.mem=null; if(s.phase==='bid') v.bid=s.bid.map((b,i)=>i===me?b:(b!=null?-1:null));
  v.items=s.items.map((it,k)=>k<s.round||s.phase==='over'?it:{v:null,kind:null,a:null}); if(v.Q&&s.phase!=='rend'&&s.phase!=='final'&&s.phase!=='over') v.Q={q:s.Q.q,o:s.Q.o,a:null};
  if(s.phase==='memo') v.art=ART; return v; }
/* 혼자 모드 상대(자리 2): 전시실에서 본 것을 실력만큼 기억 */
let MEM={};
const LV=[.35,.6,.85];
function ai(v,lvl){ syncH(v); const i=HSEAT[1]; lvl=lvl==null?1:lvl;
  if(v.phase==='memo'){ if(!MEM.mem){ MEM={mem:ART.map(()=>({artist:Math.random()<LV[lvl],year:Math.random()<LV[lvl]*.8,title:Math.random()<LV[lvl]}))}; return null; } return v.ready&&v.ready[i]?null:{k:'ready'}; }
  if(!MEM.mem) MEM={mem:ART.map(()=>({artist:false,year:false,title:false}))};
  const it=v.items[v.round-1];
  if(v.phase==='bid'&&v.bid[i]==null){ const fake=Object.assign({},v,{mem:[]}); fake.mem[i]=MEM.mem; fake.cap=v.cap; return decideBid(fake,i,lvl); }
  if(v.phase==='ans'&&v.actor===i){ const known=MEM.mem[it.a][it.kind]; const left=[0,1,2,3].filter(x=>!(v.wrongs||[]).includes(x));
    return {k:'ans', c: known&&Math.random()<.95 ? correctFromMemory(it,v.Q) : U.pick(left)}; }
  if(v.phase==='chal'&&v.actor===i){ const known=MEM.mem[it.a][it.kind]; return {k:'chal', go: pCorrect(known,(v.wrongs||[]).length)*it.v>v.bid[i]*1.1}; }
  return null; }
/* 기억한 사실로 보기 고르기 — 외운 전시 정보(ART)와 보기를 맞춰 봄 */
function correctFromMemory(it,Q){ const A=ART[it.a]; const want= it.kind==='artist'?A[1] : it.kind==='year'?String(A[2]) : A[0]; const k=Q.o.indexOf(want); return k>=0?k:0; }
function aiDelay(S){ if(S.phase==='memo') return 3000; return 1500+Math.random()*1800; }

/* 화면 */
let WHO={}, bidV=0, sig='', tick=null;
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}(이\(가\)|을\(를\))?/g,(_,d,j)=>{ const n=seatName(+d,ctx); return `${seatEmoji(+d)} ${n}${j?((()=>{ const b=n.replace(/\(나\)$/,''), c=b.charCodeAt(b.length-1); const hb=c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28; return j==='이(가)'?(hb?'이':'가'):(hb?'을':'를'); })()):''}`; })
  .replace(/」(이\(가\)|을\(를\))/g,(m,j)=>'」'+(j==='이(가)'?'이(가)':'을(를)')); }
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{}; const me=HSEAT[ctx.me], it=v.round?v.items[v.round-1]:null;
  const sg=v.round+':'+v.phase; if(sg!==sig){ sig=sg; if(v.phase==='bid'&&it) bidV=it.v/10; }
  clearInterval(tick); tick=null; if(v.phase==='memo'||v.phase==='bid') tick=setInterval(()=>{ const e=document.getElementById('aaT'); if(e) e.textContent=Math.max(0,Math.ceil((v.until-Date.now())/1000))+'초'; else { clearInterval(tick); tick=null; } },500);
  let h=`<div class="hl-notice">${fill(U.esc(v.notice||''),ctx)}</div>`;
  h+=`<div class="vr-speech">${v.say?`<span class="w">${seatEmoji(v.say.seat)} ${seatName(v.say.seat,ctx)}</span> ${U.esc(v.say.text)}`:'<i>　</i>'}</div>`;
  h+=`<div class="pw-seats aa-seats">${ALL.map(i=>`<div class="pw-seat ${i===me?'me':''} ${v.actor===i?'act':''}"><div class="ev-nm">${seatEmoji(i)} ${seatName(i,ctx)}</div><div class="pw-sc">💰${v.cap[i].toLocaleString()}만</div><small>🖼️${v.won[i].length}점 · 자산 ${assets(v,i).toLocaleString()}만</small><small>${v.phase==='bid'?(v.bid[i]!=null?'✅ 입찰':'💭'):v.bid[i]!=null&&v.phase!=='memo'?(v.bid[i]?`${v.bid[i]}만`:'불참'):''} · 불참 ${v.passes[i]}/${PASSES}</small></div>`).join('')}</div>`;
  if(v.phase==='memo') h+=`<div class="info">⏱️ <b id="aaT">${Math.max(0,Math.ceil((v.until-Date.now())/1000))}초</b> — 문이 닫히면 다시 볼 수 없어요</div><div class="fh-act"><button data-a="ready" ${v.ready&&v.ready[me]?'disabled':''}>${v.ready&&v.ready[me]?'다른 사람 기다리는 중…':'✅ 다 외웠어요'}</button></div><div class="aa-gal">${(v.art||[]).map(a=>`<div class="aa-art"><b>${U.esc(a[0])}</b><span>${U.esc(a[1])} · ${a[2]}</span><small>${U.esc(a[3])}</small></div>`).join('')}</div>`;
  if(it&&it.v){ h+=`<div class="aa-item"><div class="aa-frame">🖼️</div><div><b>${v.round}/${ROUNDS} 경매품</b><div>가치 <b>${it.v.toLocaleString()}만</b> · 시작가 ${it.v/10}만</div><div>문제: ${QT.find(q=>q.k===it.kind).l}</div></div></div>`; }
  if(v.phase==='bid'&&v.bid[me]==null){ const step=it.v>=2000?100:50;
    h+=`<div class="vr-card"><b>🤫 몰래 입찰</b> <span class="hc-lock" id="aaT">${Math.max(0,Math.ceil((v.until-Date.now())/1000))}초</span><div class="bs-amt"><button class="ghost" data-a="m">−</button><b>${bidV.toLocaleString()}만</b><button class="ghost" data-a="p">+</button></div>
      <div class="fh-act"><button data-a="bid">입찰</button><button class="ghost" data-a="pass" ${v.passes[me]>=PASSES?'disabled':''}>불참 (${PASSES-v.passes[me]}번 남음)</button></div><small>가장 높게 부른 사람부터 문제에 답해요. 틀리면 입찰가만 잃어요.</small></div>`; }
  if(v.Q&&(v.phase==='ans'||v.phase==='chal'||v.phase==='rend')){ const myAns=v.phase==='ans'&&v.actor===me;
    h+=`<div class="vr-card"><b>❓ ${U.esc(v.Q.q)}</b><div class="cm-opts">${v.Q.o.map((o,k)=>`<button class="m3-o ${v.Q.a===k?'ans':''} ${(v.wrongs||[]).includes(k)?'x':''}" data-c="${k}" ${myAns&&!(v.wrongs||[]).includes(k)?'':'disabled'}>${U.esc(o)}</button>`).join('')}</div>${myAns?'<small>맞히면 낙찰!</small>':''}</div>`;
    if(v.phase==='chal'&&v.actor===me) h+=`<div class="vr-card"><b>🤔 도전할까요?</b> <small>내 입찰가 ${v.bid[me]}만 — 틀리면 그만큼 잃어요</small><div class="fh-act"><button data-ch="1">🙋 도전</button><button class="ghost" data-ch="0">🙅 포기</button></div></div>`; }
  if(v.phase==='over') h+=`<div class="sn-score">${rank(v).map((i,k)=>`<div class="${isH(i)?'h':''}"><b>${k+1}. ${seatEmoji(i)} ${seatName(i,ctx)}</b> 자산 ${assets(v,i).toLocaleString()}만 <small>(💰${v.cap[i]} + 🖼️${v.won[i].map(x=>ART[x.a][0]).join(', ')||'없음 — 우승 불가'})</small></div>`).join('')}</div>`;
  h+=`<div class="bm-log">${v.log.slice(-6).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=h;
  el.onclick=e=>{ const c=e.target.closest('[data-c]'); if(c&&!c.disabled) return ctx.act({k:'ans',c:+c.dataset.c});
    const ch=e.target.closest('[data-ch]'); if(ch) return ctx.act({k:'chal',go:ch.dataset.ch==='1'});
    const a=e.target.closest('[data-a]'); if(!a||a.disabled) return; const k=a.dataset.a; const step=it&&it.v>=2000?100:50;
    if(k==='m'){ bidV=Math.max(it.v/10,bidV-step); return ctx.rerender(); } if(k==='p'){ bidV=Math.min(v.cap[me],bidV+step); return ctx.rerender(); }
    if(k==='ready') return ctx.act({k:'ready'}); if(k==='bid') return ctx.act({k:'bid',b:bidV}); if(k==='pass') return ctx.act({k:'bid',pass:true}); };
}
function status(v,ctx){ syncH(v); const me=HSEAT[ctx.me]; if(v.phase==='over') return ''; if(v.phase==='memo') return '명화를 외우세요!'; if(v.phase==='bid'&&v.bid[me]==null) return '입찰하세요';
  if(v.actor===me) return v.phase==='ans'?'답을 고르세요':'도전할까요?'; return '진행 중…'; }
const guide=`
<p><b>명화 기억 경매</b> — 4인(우리 둘 + 컴퓨터 2명).</p>
<ol><li>시작 전 <b>명화 30점</b>(제목·작가·연도·내용)을 ${MEMO/1000}초 동안 외워요. 문이 닫히면 다시 못 봐요.</li>
<li>경매품 ${ROUNDS}개. 가치(합 2억)와 <b>문제 종류</b>(작가/연도/제목)가 공개되면 <b>몰래 입찰</b>(시작가 = 가치의 10%, 자본금 ${CAP.toLocaleString()}만).</li>
<li>가장 높게 부른 사람이 문제(4지선다)에 답해요: <b>맞히면 낙찰</b>(입찰가 내고 작품 획득), <b>틀리면 입찰가만 잃고</b> 다음 순위가 도전/포기.</li>
<li>불참은 ${PASSES}번까지. <b>최종 자산</b>(남은 돈 + 작품 가치)이 가장 크면 승리 — 단 <b>낙찰품이 없으면 우승 불가</b>.</li></ol>
<div class="tipbox">💡 <b>팁</b><br>· 확실히 아는 작품에 크게, 헷갈리면 낮게.<br>· 가치보다 비싸게 사면 이겨도 손해예요.<br>· 앞사람이 틀리면 내 차례 — 보기 하나가 지워진 채로!</div>`;
const guideSteps=[
  {t:'🖼️ 명화 30점 외우기', h:`시작 전 <b>${MEMO/1000}초</b> 동안 제목·작가·연도·내용을 외워요. 문이 닫히면 끝!`, demo:s=>{ startMemo(s); return s; }},
  {t:'🤫 몰래 입찰', h:'경매품 가치와 <b>문제 종류</b>를 보고 몰래 입찰. 시작가는 가치의 10%.', demo:s=>{ s.round=0; startRound(s); return s; }},
  {t:'❓ 맞혀야 낙찰', h:'최고가부터 답해요. <b>맞히면 낙찰</b>, 틀리면 입찰가만 잃고 다음 사람이 도전/포기.', demo:s=>{ s.round=0; startRound(s); s.bid=[600,400,0,300]; resolveBids(s); s.phase='ans'; s.actor=0; s.turn=0; return s; }},
  {t:'🏆 최종 자산', h:'남은 돈 + 작품 가치가 가장 크면 승리. <b>낙찰품이 하나도 없으면 우승 불가!</b>', demo:s=>{ s.round=10; s.won=[[s.items[0],s.items[3]],[s.items[1]],[],[s.items[2]]]; s.cap=[1800,2400,3000,2600]; return s; }},
];
window.GAMES.artauction = { _sync:x=>syncH(x), maxH:4,
  title:'아트경매', ref:'피의 게임 「아트경매」', emoji:'🖼️', tags:['경매','기억력','퀴즈','NPC','두뇌서바이벌'],
  tagline:'명화 30점을 외우고 경매에 나서라 — 맞혀야만 낙찰, 틀리면 입찰가만 날아간다.',
  guide, guideSteps, init, apply:(s,p,a)=>{ if(s.winner!=null) return '게임이 끝났어요'; if(!a) return '알 수 없는 동작'; const e=act(s,HSEAT[p],a); if(!e) s.ev++; return e; },
  mask, ai, aiDelay, render, status, step, stepDelay, noPersona:true,
  reset(){ MEM={}; bidV=0; sig=''; clearInterval(tick); tick=null; },
  bar:(v,i)=>`<span class="tag">💰${v.cap[HSEAT[i]]}</span>`,
  result:(v,ctx)=>`자산 ${assets(v,HSEAT[ctx.me]).toLocaleString()}만`,
  _decideBid:decideBid, _ART:ART, _makeQ:makeQ, _LV:LV,
};
})();
