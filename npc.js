(function(){
'use strict';
/* 공용 NPC 인물 — 두뇌 서바이벌 예능에 나올 법한, 성향이 서로 다른 가상의 플레이어들.
   성향 수치(0~1): talk 말 많음 · aggr 공격성(지목) · trust 남 말을 믿음 · bluff 뻥·연기 · logic 논리·기억력 · temper 다혈질(지목당하면 되받아침)
   lines: 그 사람 말투. 없는 종류는 GENERIC에서. {t}=대상, {r}=역할 */
const ROSTER=[
 {id:'seojin', emo:'🦊', name:'여우', arch:'🧠 전략가', desc:'계산이 빠르고 감정이 안 보임. 기록과 확률로 몰아붙임', talk:.55, aggr:.55, trust:.3, bluff:.75, logic:.95, temper:.25,
  lines:{accuse:['기록을 보면 {t}이(가) 제일 앞뒤가 안 맞아요','확률로 따지면 {t}이에요'], defend:['저를 찍을 근거가 없어요. 기록 다시 보세요'], counter:['{t}, 근거 말해 봐요. 없으면 그쪽이 수상한 거예요'],
   quiet:['아직 정보가 부족해요. 한 라운드 더 보죠','지금 찍으면 손해예요'], agree:['저도 같은 계산이에요. {t}'], recall:['{t}, 지난번에 시민을 찍었죠. 우연이 두 번이면 실력이에요'],
   doubt:['기자가 둘? 둘 중 하나는 거짓말이에요. 저는 {t} 쪽이 거짓이라고 봐요'], thanks:['{t} 판단은 맞았어요. 인정해요'], reveal:['정리할게요. 저 기자고, 취재 결과 {t} 테러리스트예요']}},
 {id:'doyun', emo:'🐻', name:'곰', arch:'🤝 연합가', desc:'사람을 모으고 잘 믿어 줌. 배신당하면 크게 흔들림', talk:.8, aggr:.3, trust:.8, bluff:.3, logic:.5, temper:.3,
  lines:{accuse:['{t}… 미안한데 좀 마음에 걸려요','다 같이 {t} 한번 봐요'], defend:['저 믿어 주세요. 진짜 아니에요 🥲'], counter:['{t}, 우리 같은 편 아니었어요?'],
   quiet:['다들 싸우지 말고 같이 찾아요','우리끼리 의심하면 테러만 좋아요'], agree:['{t}? 다들 그렇다면 저도요'], thanks:['{t} 말 믿고 따라갈게요 🤝'],
   recall:['{t}, 솔직히 그때 판단은 틀렸잖아요…'], reveal:['다들 들어 봐요, 저 기자예요. {t}… 테러리스트였어요']}},
 {id:'haram', emo:'🦉', name:'부엉이', arch:'🔍 관찰자', desc:'말수는 적지만 한마디가 정확함. 발언 기록을 다 기억함', talk:.3, aggr:.45, trust:.35, bluff:.4, logic:.9, temper:.1,
  lines:{accuse:['{t}, 아까부터 말을 바꾸고 있어요','조용히 보고 있었는데, {t}예요'], defend:['…아니에요. 기록 보면 알아요'], counter:['{t}이(가) 저를 찍는 타이밍이 이상해요'],
   quiet:['…','좀 더 지켜볼게요'], recall:['{t}이(가) 찍은 사람, 결국 시민이었어요'], doubt:['기자 주장이 두 개예요. {t} 쪽은 앞 발언이랑 안 맞아요'],
   reveal:['…말할게요. 저 기자예요. {t} 테러리스트예요']}},
 {id:'yuna', emo:'🦦', name:'수달', arch:'💓 직감파', desc:'느낌으로 판단하고 감정 표현이 큼. 분위기를 잘 탐', talk:.75, aggr:.5, trust:.6, bluff:.3, logic:.4, temper:.6,
  lines:{accuse:['{t}, 느낌이 쎄해요 😣','왠지 {t}이(가) 무서워요'], defend:['왜 저예요?! 저 진짜 아니라고요 😭'], counter:['{t} 너무해요! 그쪽이 더 이상해요'],
   worry:['어떡해요… 또 늘었어요 😰','무서워요, 다음은 누구예요?'], quiet:['음… 잘 모르겠어요 😥'], agree:['맞아요 맞아요, {t}!'], thanks:['{t} 최고예요 🥹'],
   reveal:['저 기자예요!! {t} 테러리스트래요 😱']}},
 {id:'minho', emo:'🐰', name:'토끼', arch:'🃏 승부사', desc:'뻥과 연기에 능함. 자신만만하게 판을 흔듦', talk:.7, aggr:.6, trust:.3, bluff:.95, logic:.7, temper:.5,
  lines:{accuse:['저는 이미 알아요. {t}예요 😏','{t}, 표정 관리 좀 하세요'], defend:['저요? ㅋㅋ 제가 테러면 벌써 이겼죠'], counter:['{t}, 찔리니까 저를 먼저 찍는 거죠?'],
   quiet:['재밌네요. 다들 패를 숨기고 있어요 😏'], agree:['{t}, 저는 처음부터 찍었어요'], reveal:['자, 패 깝니다. 저 기자예요. {t} 테러리스트 😎']}},
 {id:'taekyung', emo:'🐯', name:'호랑이', arch:'🔥 직진형', desc:'의심 가면 바로 지목. 지목당하면 즉시 반격', talk:.9, aggr:.9, trust:.3, bluff:.5, logic:.55, temper:.9,
  lines:{accuse:['{t}! 확실해요. 이 사람이에요!','더 볼 것도 없어요, {t}예요 🔥'], defend:['뭐라고요? 말 같지도 않은 소리!'], counter:['{t}, 지금 저 찍었어요? 그쪽이 테러죠!'],
   quiet:['다들 너무 조용한데요? 말 좀 해요'], agree:['그렇죠! {t}!'], worry:['시간 없어요! 빨리 정해요!'], reveal:['저 기자예요! {t} 테러! 바로 잡아요!']}},
 {id:'jihu', emo:'🐺', name:'늑대', arch:'🗡️ 배신형', desc:'친한 척하다 결정적일 때 돌아섬. 연합을 이용함', talk:.6, aggr:.5, trust:.4, bluff:.85, logic:.75, temper:.4,
  lines:{accuse:['{t}랑 같이 가려 했는데… 이건 아니에요','미안해요 {t}, 이제 못 믿겠어요'], defend:['저 의심하면 손해예요. 제가 제일 도움 돼요'], thanks:['{t}, 우리 끝까지 같이 가요 🤝'],
   quiet:['누구 편에 설지 생각 중이에요']}},
 {id:'soyul', emo:'🐧', name:'펭귄', arch:'⚖️ 중재자', desc:'양쪽 말을 다 듣고 정리함. 싸움을 말리는 편', talk:.6, aggr:.35, trust:.55, bluff:.3, logic:.75, temper:.2,
  lines:{accuse:['정리해 보면 {t}이(가) 가장 의심돼요'], quiet:['한 명씩 말해 봐요. 제가 정리할게요'], defend:['저는 정리만 했을 뿐이에요. 오해예요'],
   doubt:['기자 주장이 겹쳐요. 정리하면 {t} 쪽이 이상해요']}},
];
/* 😈 데블스 플랜 놀이터(10명) 전용 추가 인물 (2026-11-12) — 다른 게임 배역(cast)엔 안 나옴(게임마다 8마리 표가 있어서) */
const EXTRA=[
 {id:'dami', emo:'🦝', name:'너구리', arch:'💰 협상가', desc:'뭐든 거래로 풂. 손해 보는 장사는 절대 안 함', talk:.7, aggr:.4, trust:.45, bluff:.65, logic:.7, temper:.3, lines:{}},
 {id:'nari', emo:'🐱', name:'고양이', arch:'😼 독고다이', desc:'누구와도 잘 안 묶임. 혼자 계산하고 혼자 살아남음', talk:.35, aggr:.55, trust:.2, bluff:.5, logic:.8, temper:.45, lines:{}},
];
const GENERIC={
  accuse:['{t} 좀 수상하지 않아요?','저는 {t}이(가) 제일 의심돼요 🤨'],
  defend:['제가요? 저 아니에요!','왜 저를… 저 시민이에요'],
  counter:['오히려 {t}이(가) 저를 모는 게 수상해요','{t}, 왜 갑자기 저를 찍어요? 🤨'],
  agree:['저도 {t} 좀 이상하다고 생각했어요'],
  worry:['감염자가 늘고 있어요… 빨리 찾아야 해요 😰'],
  quiet:['음… 아직 잘 모르겠어요','🤔'],
  reveal:['제가 기자예요. 취재해 보니 {t}은(는) 테러리스트예요!'],
  clear:['📰 참고로 {t}은(는) {r}이었어요. 믿어도 돼요'],
  research:['🧪 연구가 진척되고 있어요. 조금만 버텨요!'],
  recall:['{t}, 어제 시민인 사람을 몰았잖아요 🤨'],
  thanks:['{t} 말이 맞았네요. 믿을게요 🤝'],
  doubt:['기자가 두 명이에요? {t}, 진짜 기자 맞아요?'],
};
function say(per,kind,vars){
  const pool=(per&&per.lines&&per.lines[kind])||GENERIC[kind]||['…'];
  let t=pool[Math.random()*pool.length|0];
  for(const k in (vars||{})) t=t.split('{'+k+'}').join(vars[k]);
  return t;
}
function cast(n){ if(window.SEASON_CAST&&window.SEASON_CAST.length>=n) return window.SEASON_CAST.slice(0,n); const a=ROSTER.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.random()*(i+1)|0; [a[i],a[j]]=[a[j],a[i]]; } return a.slice(0,n).map(p=>p.id); }
/* 지니어스 시즌 관계: a가 b를 믿는 정도(−1~1). b는 인물 id, 'me'(0번 자리 사람), 'opp'(두 번째 사람 자리 = 시즌에선 동물). 시즌 게임이 아니면 0 */
function rel(a,b){ const SS=window.Season; if(!SS||!SS.active()) return 0; if(b==='opp') b=SS.oppId(); return b?SS.rel(a,b):0; }
/* 🐾 능력치·플레이스타일 (2026-11-10 사용자: "지니어스처럼 육각형도 있고 어딘가 특출난 사람도 있게 — 다양하고 디테일하게, 모든 시스템에 영향")
   abil(1~10): logic 🧠추리 · memory 📚기억 · acting 🎭연기 · insight 👀눈치 · speech 🗣️말빨 · social 🤝사교
   style 플레이스타일 · special 특기 · weak 약점 · motive 개인 목표(팀 승리와 별개로 이 인물이 원하는 것) · loose 입이 가벼움(몰래 한 얘기를 흘림). 위의 성향 수치(talk·aggr…)는 기존 게임 규칙 AI용이라 그대로 둠.
   판 안에서 사건에 따라 바뀌는 '지금 상태'(기분·증감)는 각 게임이 관리하고, 여기 값은 바뀌지 않는 기본값. */
const ABIL=[{k:'logic',e:'🧠',n:'추리'},{k:'memory',e:'📚',n:'기억'},{k:'acting',e:'🎭',n:'연기'},{k:'insight',e:'👀',n:'눈치'},{k:'speech',e:'🗣️',n:'말빨'},{k:'social',e:'🤝',n:'사교'}];
const PROFILE={
  seojin:{abil:{logic:10,memory:8,acting:7,insight:6,speech:6,social:3}, style:'계산형 브레인', special:'확률·기록으로 몰아붙이기', weak:'사람을 못 모음, 감정에 둔함', motive:'내 추리로 판을 이끌어 모두에게 인정받기(MVP)'},
  haram:{abil:{logic:8,memory:10,acting:4,insight:9,speech:3,social:2}, style:'관찰형 저격수', special:'발언 모순 한 방 저격', weak:'말수가 적어 영향력이 약함', motive:'끝까지 조용히 살아남아 결정적일 때 한 방으로 뒤집기'},
  minho:{abil:{logic:6,memory:5,acting:10,insight:7,speech:8,social:5}, style:'승부사 연기파', special:'뻔뻔한 뻥으로 판 흔들기', weak:'신뢰를 잘 못 얻고, 과감하다 자멸', motive:'판을 흔들어 모두의 시선을 받는 주인공 되기'},
  doyun:{abil:{logic:4,memory:6,acting:3,insight:5,speech:7,social:10}, style:'연합 메이커', special:'편 모으기·표 몰기', weak:'잘 믿고 잘 속음, 거짓말이 서툼', motive:'최대한 많이 손잡아 아무도 나를 버리지 못하게 하기', loose:true},
  taekyung:{abil:{logic:4,memory:4,acting:5,insight:5,speech:8,social:6}, style:'직진 압박형', special:'선제 지목으로 몰아붙이기', weak:'성급한 오판, 기억이 흐림', motive:'적 하나는 반드시 내 손(지목·처형)으로 잡기', loose:true},
  jihu:{abil:{logic:7,memory:6,acting:9,insight:7,speech:6,social:8}, style:'이중 플레이어', special:'친한 척 연합 후 결정적 배신', weak:'배신이 드러나면 고립', motive:'손잡았다가 판이 기울면 이기는 쪽으로 갈아타기'},
  yuna:{abil:{logic:3,memory:4,acting:3,insight:9,speech:5,social:7}, style:'직감형 감지기', special:'표정·분위기 읽기', weak:'근거가 약하고 감정에 흔들림', motive:'내가 믿는 한 명은 끝까지 지키기', loose:true},
  soyul:{abil:{logic:7,memory:7,acting:6,insight:7,speech:7,social:7}, style:'육각형 밸런스', special:'정리·중재로 판 정돈', weak:'튀는 한 방이 없음', motive:'싸움을 정리해 모두가 가장 믿는 사람 되기'},
  dami:{abil:{logic:7,memory:6,acting:7,insight:6,speech:8,social:7}, style:'거래형 상인', special:'피스·정보 맞바꾸기', weak:'이득이 없으면 안 움직여 정이 없어 보임', motive:'피스를 가장 많이 모아 끝까지 협상력 쥐기'},
  nari:{abil:{logic:8,memory:7,acting:5,insight:8,speech:3,social:2}, style:'독고다이', special:'혼자 판 읽고 빈틈 찌르기', weak:'연합이 없어 몰리면 고립', motive:'누구에게도 기대지 않고 혼자 힘으로 우승하기'},
};
ROSTER.concat(EXTRA).forEach(p=>Object.assign(p,PROFILE[p.id]||{}));
/* 육각형 그림: base(기본) 점선 + cur(지금, 없으면 base) 채움 */
function hex(base,cur,size){ cur=cur||base; size=size||120; const c=size/2, R=size*0.36, pt=(i,v)=>{ const a=-Math.PI/2+i*Math.PI/3, r=R*v/10; return [c+r*Math.cos(a),c+r*Math.sin(a)]; };
  const poly=o=>ABIL.map((a,i)=>pt(i,o[a.k]||0).map(x=>x.toFixed(1)).join(',')).join(' ');
  const grid=[10,5].map(v=>`<polygon points="${ABIL.map((a,i)=>pt(i,v).map(x=>x.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="currentColor" stroke-opacity=".18"/>`).join('');
  const lab=ABIL.map((a,i)=>{ const [x,y]=pt(i,13.2); const d=(cur[a.k]||0)-(base[a.k]||0); return `<text x="${x.toFixed(1)}" y="${(y+3).toFixed(1)}" text-anchor="middle" font-size="${size*0.085}">${a.e}${cur[a.k]}${d?`<tspan fill="${d>0?'#2a8c4a':'#c0392b'}">${d>0?'+':''}${d}</tspan>`:''}</text>`; }).join('');
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="npc-hex">${grid}<polygon points="${poly(base)}" fill="none" stroke="currentColor" stroke-opacity=".45" stroke-dasharray="3 2"/><polygon points="${poly(cur)}" fill="#7b5cd6" fill-opacity=".28" stroke="#7b5cd6" stroke-width="1.5"/>${lab}</svg>`; }
window.NPCS={ROSTER, EXTRA, GENERIC, say, cast, rel, ABIL, hex, byId:id=>ROSTER.find(p=>p.id===id)||EXTRA.find(p=>p.id===id)};
})();
