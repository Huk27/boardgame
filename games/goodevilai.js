(function(){
'use strict';
/* 😇 선과 악 · AI판 (시험, 2026-11-10 사용자 요청: "AI를 최대한 활용하는 구조로 같은 게임을 새 버전으로 — 진짜 유저들이랑 하는 것처럼")
   - 규칙·순서·숨김 정보는 코드가 지킴(반칙·정보 유출 X).
   - 판단과 말은 동물 하나하나가 Claude로 직접: 토론 발언, 집행자 지목, 찬반, 버릴 카드, 본 카드 주장(거짓말 포함), 처형, 신 지목, 귓속말 답장.
     각 동물은 자기 자리에서 보이는 정보 + 자기만의 속마음 메모만 받음(남의 숨은 정체 X).
   - 사람은 토론 중 아무 말이나 치고(이름을 부르면 그 동물이 대답), 아무 동물에게나 귓속말 가능.
   - AI는 ai.js → local/ai-bridge.js(그 Mac의 Claude Code 로그인). 혼자 모드 또는 방장 쪽에서만 돌고 결과가 손님에게 전달됨.
     다리가 꺼져 있으면 단순 규칙으로 대신 진행(멈추지 않게).
   - 사람 자리: init(starter,{humans:k}) + s.hs, 나머지는 동물. */
const N=7, ALL=[...Array(N).keys()];
const GL=s=>(s&&s.goal)||5;   /* 이길 장수 — 기본 5, 시즌 단축판 3 */
let HSEAT=[0]; const SEATORD=[0,4,2,6,1,5,3];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i);
const RN={god:'👼 신', arch:'😇 대천사', angel:'🙂 천사', lucifer:'😈 루시퍼', devil:'👿 악마'};
const isDev=r=>r==='lucifer'||r==='devil';
const CT={GG:'선·선',GB:'선·악',BB:'악·악'};
const CARD=c=>c==='G'?'선행':'악행';
const alive=s=>ALL.filter(i=>s.alive[i]);
const devs=s=>ALL.filter(i=>isDev(s.role[i]));
const npcs=s=>ALL.filter(i=>!isH(i));
const per=(s,i)=>(window.NPCS&&s.who&&NPCS.byId(s.who[i]))||{};
const hName=i=>{ try{ const n=nameOf(pOf(i)); if(n) return n; }catch(_){} return '사람'+(pOf(i)+1); };
const nmS=(s,i)=>isH(i)?hName(i):(per(s,i).name||'?');
const clean=x=>typeof x==='string'?x.replace(/[{}<>\n\r]/g,' ').replace(/^["'“「『\s]+|["'”」』\s]+$/g,'').trim().slice(0,180):'';
const pair=c=>{ const g=c.filter(x=>x==='G').length; return g===2?'GG':g===1?'GB':'BB'; };

/* 사람 수: core는 3명 이상일 때만 humans를 넘김 → 둘이 하는 방(방장+손님 1)도 여기서 접속 인원대로. 혼자 모드는 1명 */
function init(starter,o){ const net=typeof mode!=='undefined'&&mode==='host'&&typeof nPlayers==='function'?nPlayers():1;
  /* 🍿 관전 모드(window.GA_WATCH 또는 o.watch): 사람 자리 없이 동물 7마리끼리 — 구경하는 재미 + 검증용 (2026-11-10) */
  const watch=!!(o&&o.watch)||!!window.GA_WATCH; window.GA_WATCH=false;
  const k=watch?0:Math.max(1,Math.min(7,(o&&o.humans)||net)); HSEAT=SEATORD.slice(0,k);
  /* 🏆 시즌 안에선 단축판: 선행·악행 3장 · 처형은 악행 2장째 · 자유 시간 60초 (2026-11-11 — 원래 판은 12라운드·호출 200번 넘어 시즌 한 회가 30분 넘음) */
  const s={goal:o&&o.season?3:5, phase:'intro', hs:HSEAT.slice(), round:0, rep:(Math.random()*N|0)-1, exe:null, lastExe:null, fails:0, good:0, bad:0,
    deck:U.shuffle(Array(16).fill('B').concat(Array(14).fill('G'))), disc:[], hand:null, hand3:null,
    role:Array(N).fill('angel'), alive:Array(N).fill(true), who:{}, govs:[], chat:[], dm:{}, memo:{}, seen:{}, votes:Array(N).fill(null), vwhy:{}, vshown:[], vq:[],
    godKnow:[], cond:{}, react:[], rxN:0, sense:{}, rel:{}, pacts:[], pN:0, bdm:[], free:null, seenLog:[], roomArch:[], leakQ:[], leakCue:null, air:{}, seq:0, vtry:0, typing:null, typingDm:[], talk:null, dmq:[], dmN:0, wait:2600, turn:null, winner:null, wteam:null, endWhy:'', confess:{}, killNext:false,
    notice:watch?'🍿 관전 모드 — 동물 7마리가 겨뤄요. 모든 정체와 속마음이 보여요':'🎙️ 선과 악 · AI판 — 동물들이 직접 생각하고, 말하고, 속여요', watch, ev:0};
  const ids=NPCS.cast(N-HSEAT.length); npcs(s).forEach((i,j)=>s.who[i]=ids[j]);
  const sh=U.shuffle(ALL.slice()); s.role[sh[0]]='lucifer'; s.role[sh[1]]='devil'; s.role[sh[2]]='devil'; s.role[sh[3]]='god'; s.role[sh[4]]='arch';
  return s; }

/* ───────── AI 부르기 ─────────
   need(): 답이 있으면 돌려주고, 없으면 요청을 띄우고 undefined. 기다리는 동안 core는 AIB.hold()로 다음 진행을 미룸 → 답이 오면 이어서. */
const RUN=new Set();
function need(s,key,make){ if(key in s.air) return s.air[key];
  if(!RUN.has(key)){ RUN.add(key); Promise.resolve().then(make).catch(()=>null).then(v=>{ RUN.delete(key); s.air[key]=v==null?null:v; try{ if(S===s) render(); }catch(_){} }); }
  return undefined; }
const SYS=`너는 한국 두뇌 서바이벌 예능 「선과 악」에 참가한 플레이어 한 명이다. 진짜 사람처럼 생각하고, 말하고, 이기려고 한다.
[규칙] 7명: 천사팀 4명(👼신 1·😇대천사 1·🙂천사 2) vs 악마팀 3명(😈루시퍼 1·👿악마 2).
- 악마팀은 서로 누가 악마인지 안다. 대천사는 신이 누군지 안다. 신은 악행이 적립될 때마다 루시퍼가 아닌 악마를 한 명씩 몰래 알게 된다. 일반 천사는 아무것도 모른다.
- 매 라운드: 자유 토론 → 대표(차례로 돌아감)가 집행자 1명 지목(직전 집행자는 연속 불가) → 살아 있는 전원 찬반, 과반 찬성이면 정부 성립(3번 연속 부결되면 맨 위 카드가 자동 적립) → 더미에서 3장 → 대표가 1장 몰래 버리고 2장을 집행자에게 → 집행자가 1장 버림 → 남은 1장 적립.
- 대표와 집행자는 본 카드를 공개 발언으로 말한다(거짓말 가능). 둘의 말이 다르면 둘 중 하나는 거짓말쟁이다.
- 순서 주의: 찬반 투표는 카드와 주장보다 먼저다. 그 라운드의 카드·주장을 보고 그 라운드에 찬반했다고 말하면 안 된다(그건 다음 라운드 판단의 근거다).
- 더미는 악행 16장·선행 14장 — 정직해도 악행만 나올 수 있다.
- 목표 장수는 [지금 판]에 나온다(기본 5장, 시즌 단축판 3장). 악행이 목표보다 1장 적을 때(기본 4장째) 그 정부의 대표가 1명을 처형(정체 공개). 루시퍼가 처형되면 천사팀 즉시 승리.
- 악행 목표 장수 = 악마팀 승리. 선행 목표 장수 = 천사팀 승리, 단 그 순간 악마팀이 신을 정확히 지목하면 악마팀 역전승.
[역할별 전략]
- 천사: 기록(주장 모순, 악행 정부의 구성원, 투표)에서 근거를 찾아 악마를 가려내고 의심스러운 정부엔 반대한다. 남의 말을 그대로 믿지 않는다.
- 신: 아는 악마를 정부에서 빼도록 은근히 유도한다. 너무 티 내면 마지막에 신으로 지목당한다.
- 대천사: 신을 지키고, 신인 척 연막을 칠 수도 있다. 신이 누군지 드러내지 않는다.
- 악마·루시퍼: 천사인 척 섞여서 악행을 쌓는다. 때로는 선행을 내서 신뢰를 산다. 동료를 노골적으로 감싸지 않는다. 누가 신인지 단서를 모은다. 루시퍼는 처형되지 않게 조심한다.
[말하기 — 가장 중요] 친한 사람들끼리 모여 예능처럼 보드게임하는 분위기. 귀엽고 정감 있게, 테이블에서 툭 던지는 말로 한다.
- 분위기: 서로 아웅다웅하지만 밉지 않게. 비꼬기·쏘아붙이기·깔보는 말(띠꺼운 말투) 금지. 의심할 때도 말랑하게 — "혹시~", "음 근데요~", "저만 이상해요?", "앗 잠깐만요". 억울하면 귀엽게 억울해한다("저 진짜 억울해요ㅠㅠ").
- 감탄·웃음을 자연스럽게: 헐, 앗, 오~, 에이~, 아 진짜요?, 헉, ㅋㅋ, ㅎㅎ, ㅠㅠ — 단 ㅎㅎ·ㅋㅋ·ㅠㅠ는 가끔(세 마디에 한 번꼴), 매 말끝마다 붙이지 않는다. 같은 감탄·말버릇을 연달아 쓰지 않는다. 말끝 늘이기(~요~, ~죠~)·흐리기(…)도 좋다.
- 실제 예능 출연자처럼: "아 잠깐만요ㅋㅋ 그럼 곰이 거짓말한 거예요?" / "오 그럼 저랑 수달이랑 같은 편 해요!" / "에이~ 그건 아니죠~ 저 그때 찬성했다니까요" / "헐 대박, 그럼 여우가…?" / "아 몰라요ㅠㅠ 저 그냥 반대할래요"
- 길이는 상황에 맞게: 맞장구·반응은 짧게(5~20자). 의심·변명·반박·지목·찬반 이유는 근거를 붙여 한두 문장(25~60자). 설명·정리·인사말은 금지.
- 근거: 누군가를 의심하거나 감쌀 땐 반드시 이유를 댄다 — 기록(몇 라운드, 누구 주장, 누가 찬반)이나 방금 나온 말에서. 근거 없는 지목 금지. 근거를 대는 방식은 말투(성격)에 맞춘다.
- 침묵: 할 말이 없으면 넘겨도 된다. 남이 이미 한 얘기면 넘긴다.
- 아래 [너의 말투]를 꼭 지킨다. 다른 캐릭터처럼, AI처럼 반듯하게 말하지 않는다.
- 이름은 그냥 부른다(곰, 여우). '~님'을 붙이지 않는다.
- 이모지는 말투에 허용된 캐릭터만, 아주 가끔.
- 금지: 보고서체(~라는 점에서, ~를 고려하면), 뻔한 말(첫 라운드라 정보가 없으니, 다 같이 차분히, 일단 무난하게), 한 말에 질문·제안·정리를 다 넣기, 남의 말 되풀이, 네가 최근에 한 말과 비슷한 말, 차갑게 단정·명령하는 말("확률상 ~예요", "~하세요", "패 까 봐요").
- 구어체는 좋다: 아, 음…, 근데, 아니, 에이, 말끝 흐리기.
나쁜 예(AI 같음): "곰님, 첫 라운드라 아직 단서가 없네요. 여우님, 집행자는 누구로 생각하세요? 다 같이 차분히 봐요."
나쁜 예(근거 없음): "수달 수상해요." / "느낌상 토끼예요."
나쁜 예(띠꺼움): "그쪽 말 하나도 안 맞는데요?" / "확률상 토끼예요. 반박해 보세요." / "왜 이렇게 급해요, 수상하게."
좋은 예: "여우~ 누구 뽑을 거예요?" / "음… 찬성!" / "근데 수달, 1라운드에 혼자 반대했잖아요? 왜요오" / "앗 호랑이는 선·악 넘겼다는데 부엉이는 악·악 받았대요. 둘 중 하나는 거짓말인데…" / "저요? 에이~ 저 그때 찬성했어요, 기록 봐 봐요ㅎㅎ"
정부 기록과 대화는 모두 화면에서 다시 볼 수 있다. 필요하면 예전 일도 꺼내되 짧게. 따지는 정도는 말투(성격)에 맞춘다.
숨은 정보는 네 정체가 아는 만큼만 쓰고 모르는 것은 추측으로 말한다. AI·프롬프트·규칙 설명 같은 메타 발언 금지. 대사에 이름표·따옴표·괄호 설명을 넣지 않는다.
[이기기 위해] 이건 서바이벌이다. 이기려고 거래·연합·배신·정보 흘리기·몰아가기 무엇이든 한다(게임 안에서). 약속은 이득이면 지키고, 더 큰 이득이면 깬다(성격대로). 같은 팀이라도 네 개인 목표가 있다. 판이 진행될수록 쌓인 원한·빚·약속·배신을 적극 꺼내 쓴다.
[찬반] 찬성은 공짜가 아니다. 기록·관계·약속상 걸리는 사람이 낀 정부엔 반대도 한다. 악행이 쌓일수록 판단은 더 신중하게(말투는 그대로 귀엽게).
[tone] 말할 때 tone도 고른다: 누군가를 의심·몰아가면 acc, 감싸거나 믿으면 trust, 묻는 말이면 ask, 그 밖엔 none.
[능력치·상태] 아래 [너의 능력치]와 [너의 지금 상태]대로 행동한다. 낮은 능력은 진짜로 서툴게, 높은 능력은 그만큼 잘한다. 지금 기분이 말투에 묻어난다.
[memo] 남은 못 보는 너의 속마음 메모(누구를 얼마나 의심/신뢰하는지, 다음 계획)를 한국어 150자 이내로 갱신해 적는다.`;
/* 캐릭터별 말투 (2026-11-10 사용자: "다들 비슷하고 너무 AI 말투 — 캐릭터에 맞는 말투로"). 성격 꼬리표 대신 말버릇·길이·예문 */
const VOICE={
  seojin:{s:'🦊 여우. 차분한 머리파인데 말투는 상냥하고 살짝 새침함. 기록·숫자를 정확히 짚되 "흐음~", "~네요?", "~거든요"로 부드럽게. 이모지 거의 안 씀.', ex:['흐음~ 1라운드 선·악이랑 악·악, 둘 중 하나는 거짓말이네요?','토끼는 악행 정부에 두 번 다 있었거든요… 좀 걸려요.','지금은 아껴 두는 게 이득일 것 같아요~']},
  doyun:{s:'🐻 곰. 순하고 다정함. "우리", "같이"를 자주 쓰고 맞장구를 잘 침. 잘 믿고, 배신당하면 시무룩하게 서운해함. "에이~", "진짜루?" 가끔 🥲.', ex:['에이 설마~ 펭귄이 그랬을라구요','우리 같이 가요! 진짜루요','아… 저 믿었는데ㅠㅠ']},
  haram:{s:'🦉 부엉이. 말수 적고 조용함. 말하면 "…음."처럼 살짝 뜸 들이다가 근거 하나를 콕. 무뚝뚝하지 않게 말끝은 부드럽게. 이모지 안 씀.', ex:['…음, 수달 1라운드엔 찬성했던 것 같은데요?','…아니에요, 그때 저 악·악 받았어요.','…일단 지켜볼게요.']},
  yuna:{s:'🦦 수달. 감정이 그대로 튀어나오는 귀염둥이. "헐", "아 몰라요ㅠㅠ", "진짜요?!" 감탄사·느낌표. 느낌으로 시작하되 "아까 ~했잖아요"처럼 본 걸 붙임. 가끔 😭.', ex:['헐 곰, 아까 말 바꿨잖아요!','아 몰라요ㅠㅠ 저 반대! 호랑이 정부 또 악행 나올 것 같아요','느낌이 쎄해요… 😭']},
  minho:{s:'🐰 토끼. 장난꾸러기. "ㅋㅋ", 반문, 능청. 도발도 놀리듯 귀엽게. 뻥도 장난처럼 자연스럽게.', ex:['ㅋㅋ 저요? 저 완전 천사인데요~','호랑이 왜 이렇게 급해요ㅋㅋ 귀엽게','자자 다들 솔직하게 말해 봐요~']},
  taekyung:{s:'🐯 호랑이. 성격 급하고 열정적. 짧게 끊어 말하고 바로 지목하되 이유를 한 줄로. "아니 근데요!", "진짜예요!", 느낌표. 화내도 밉지 않게 투덜투덜.', ex:['늑대예요! 악행 정부마다 늑대 있었다구요!','아니 근데요, 왜 다들 조용해요오','에이 저 선 넘겼다니까요!']},
  jihu:{s:'🐺 늑대. 사근사근하고 친근함(속은 계산적). 은근히 흘리고 편을 고름. "솔직히요~", "저는 그냥…", 말끝 "~요~", "~용".', ex:['솔직히 저는 곰 편이에요~','에이~ 저 의심하면 섭섭해용','음… 그건 좀 아닌 것 같은데요?']},
  soyul:{s:'🐧 펭귄. 다정한 반장 스타일. "잠깐만요~", "정리해 보면요"로 묶어 말하고 싸움을 말림. 차분하지만 결정적일 땐 단호하게, 그래도 상냥하게.', ex:['잠깐만요~ 하나씩 얘기해요!','정리해 보면요, 1라운드 호랑이·부엉이, 2라운드 수달·곰. 둘 다 말이 엇갈렸어요.','싸우지 말구요ㅎㅎ']},
};
const voiceOf=p=>VOICE[p.id]||{s:'귀엽고 정감 있는 구어체. 짧게.', ex:[]};
/* 말은 짧게: 너무 길면 문장 끝에서 자르고, 이모지는 하나만 */
function shortSay(x,max){ let s=clean(x); max=max||100; if(s.length>max){ const m=s.slice(0,max).match(/^[\s\S]*[.?!…~]/); s=m?m[0]:s.slice(0,max)+'…'; } let n=0; return s.replace(/\p{Extended_Pictographic}/gu,e=>++n>1?'':e).replace(/\s{2,}/g,' ').trim(); }
/* 🐾 능력치·지금 상태 (2026-11-10 사용자: "캐릭터별 능력치·플레이스타일이 디테일하게, 모든 곳에 영향" · "사건에 따라 인물이 변하는 것도")
   기본값은 npc.js(abil), 판 안의 '지금 상태'는 s.cond[i] = {mood, moodT, mods(능력치 증감), log, at}. 공개 사건으로만 바뀜(숨은 정보로 바뀌지 않게).
   쓰이는 곳: AI 판단·말투(프롬프트), 거짓말할 때 티(연기)·남의 티를 느낌(눈치), 누가 사건에 반응하나, 누가 먼저 말하나(말빨), 화면 육각형 */
const ABL=()=>(window.NPCS&&NPCS.ABIL)||[];
const baseAb=(s,i)=>Object.assign({logic:5,memory:5,acting:5,insight:5,speech:5,social:5},per(s,i).abil||{});
const condOf=(s,i)=>s.cond[i]=s.cond[i]||{mood:'😐',moodT:'평온',mods:{},log:[],at:0};
const ab=(s,i,k)=>isH(i)?5:Math.max(1,Math.min(10,(baseAb(s,i)[k]||5)+(condOf(s,i).mods[k]||0)));
const curAb=(s,i)=>{ const o={}; for(const a of ABL()) o[a.k]=ab(s,i,a.k); return o; };
function shift(s,i,mood,moodT,mods,why){ if(i==null||isH(i)||!s.alive[i]) return; const c=condOf(s,i); c.mood=mood; c.moodT=moodT; c.at=s.round;
  for(const k in mods) c.mods[k]=Math.max(-4,Math.min(4,(c.mods[k]||0)+mods[k]));
  const tx=Object.entries(mods).map(([k,d])=>{ const a=ABL().find(x=>x.k===k); return `${a?a.e+a.n:k} ${d>0?'+':''}${d}`; }).join(' · ');
  c.log.push({r:s.round,text:`${mood} ${why}${tx?` (${tx})`:''}`}); note(s,`${mood} ${nmS(s,i)}, ${why}${tx?` — ${tx}`:''}`); }
/* 라운드가 넘어가면 증감이 1씩 돌아오고, 다 돌아오면 평온 */
function settle(s){ for(const i of npcs(s)){ const c=condOf(s,i); for(const k in c.mods){ c.mods[k]-=Math.sign(c.mods[k]); if(!c.mods[k]) delete c.mods[k]; } if(!Object.keys(c.mods).length&&c.mood!=='😐'){ c.mood='😐'; c.moodT='평온'; } } }
const once=(s,key)=>{ s.once=s.once||{}; if(s.once[key]) return false; s.once[key]=1; return true; };
/* 공개 발언을 남기는 곳 하나 — 지목·감싸기가 쌓이면 상태가 바뀜 */
function talkPush(s,i,text,t,kind){ s.chat.push({r:s.round,seat:i,text,t:t??null,kind:kind||undefined}); if(t==null) return;
  if(kind==='acc') relAdd(s,t,i,-.25,'나를 지목'); if(kind==='trust') relAdd(s,t,i,.2,'나를 감쌈');
  for(const p of s.pacts.filter(p=>p.st==='on'&&(p.a===i||p.b===i))){ const o=p.a===i?p.b:p.a;
    if(p.kind==='shield'&&kind==='acc'&&t===o) breakPact(s,p,i,'서로 지목 안 하기로 해 놓고 공개 지목');
    if(p.kind==='hunt'&&t===p.x){ if(kind==='trust') breakPact(s,p,i,`같이 ${nmS(s,p.x)} 몰기로 해 놓고 감쌈`); else if(kind==='acc') p.kept++; } }
  if(isH(t)) return;
  const n=k=>s.chat.filter(c=>c.r===s.round&&c.t===t&&c.kind===k).length;
  if(kind==='acc'&&n('acc')===2&&once(s,`acc${s.round}-${t}`)){ const pp=per(s,t); if((pp.aggr||.5)>=.7||(pp.temper||.4)>=.7) shift(s,t,'😤','발끈',{speech:1,logic:-1},'연달아 지목당해 발끈했다'); else shift(s,t,'😰','위축',{acting:-2,speech:-1},'연달아 지목당해 위축됐다'); queueReact(s,'focus',`${nmS(s,t)}에게 지목이 몰리고 있다`,[t]); }
  if(kind==='trust'&&n('trust')===2&&once(s,`tr${s.round}-${t}`)) shift(s,t,'😊','든든',{social:1,speech:1},'편들어 주는 사람이 생겼다'); }
/* 사건 반응: 큰 일이 터지면 1~2마리가 바로 한마디 (누가 반응할지는 능력치·성향으로) */
function queueReact(s,type,text,involved,force){ if(!['talk','nominate','vote','vreveal','rdisc','edisc','claimRep','claimExe','kill'].includes(s.phase)&&type!=='kill') return;
  s.react.push({id:++s.rxN,type,text,inv:involved||[],n:type==='contra'||type==='kill'?2:1,done:[],force:force??null}); }
function pickReactor(s,x){ if(x.force!=null){ return !x.done.includes(x.force)&&s.alive[x.force]&&!isH(x.force)?x.force:null; } const c=alive(s).filter(i=>!isH(i)&&!x.done.includes(i)); if(!c.length) return null;
  const w=i=>{ const pp=per(s,i); let v=Math.random()*3;
    if(x.type==='contra'||x.type==='tell') v+=ab(s,i,'insight')*.6; else if(x.type==='bad'||x.type==='good') v+=ab(s,i,'speech')*.4+(pp.aggr||.5)*3; else if(x.type==='focus') v+=x.inv.includes(i)?6:ab(s,i,'social')*.4; else v+=ab(s,i,'speech')*.3;
    if(x.inv.includes(i)&&x.type!=='focus') v+=2; return v; };
  return c.sort((a,b)=>w(b)-w(a))[0]; }
/* 텔: 거짓 주장은 연기가 낮을수록 티가 남(모두가 봄). 눈치가 높은 동물은 티가 안 나도 몰래 느낄 수 있음(그 동물만 앎).
   정직해도 연기가 낮으면 가끔 긴장해서 머뭇거림 → 티가 곧 거짓은 아님 */
function tellCheck(s,i,lie){ if(isH(i)) return; const act=ab(s,i,'acting');
  const p=lie?(10-act)/12:(act<=4?.15:0);
  if(Math.random()<p){ shift(s,i,'😅','긴장',{acting:-1},'주장하면서 잠깐 머뭇거렸다'); queueReact(s,'tell',`${nmS(s,i)}이(가) 주장하면서 머뭇거렸다`,[i]); }
  for(const j of alive(s).filter(j=>!isH(j)&&j!==i)){ const ins=ab(s,j,'insight');
    if(lie&&Math.random()<ins/10*(10-act)/10*.9) (s.sense[j]=s.sense[j]||[]).push({r:s.round,text:`${nmS(s,i)}의 ${s.round}R 주장 때 미세하게 흔들리는 걸 느꼈다`});
    else if(!lie&&ins<=4&&Math.random()<.15) (s.sense[j]=s.sense[j]||[]).push({r:s.round,text:`${nmS(s,i)}의 ${s.round}R 주장이 왠지 찜찜했다(확실치 않음)`}); } }
/* 능력치를 행동 지시로 */
/* 찬반 전에 그 정부 두 사람에 대한 정리 */
function voteBrief(s,i){ const L=[]; for(const j of [s.rep,s.exe]){ if(j===i) continue; const acc=s.chat.filter(c=>!c.secret&&c.kind==='acc'&&c.t===j).length, tr=s.chat.filter(c=>!c.secret&&c.kind==='trust'&&c.t===j).length;
  const bad=s.govs.filter(g=>!g.fail&&!g.auto&&g.card==='B'&&(g.rep===j||g.exe===j)).length, ct=s.govs.filter(g=>g.rc&&g.ec&&g.rc!==g.ec&&(g.rep===j||g.exe===j)).length;
  const rv=relV(s,i,j), pk=s.pacts.filter(q=>q.st==='on'&&((q.a===i&&q.b===j)||(q.b===i&&q.a===j))).map(q=>pdesc(s,q));
  L.push(`${nmS(s,j)}: 공개 의심 ${acc}번·감싸기 ${tr}번, 악행 정부 ${bad}번, 주장 엇갈림 ${ct}번, 네 마음 ${rv>0?'+':''}${rv.toFixed(1)}${pk.length?`, 너와 약속: ${pk.join('·')}`:''}`); }
  return L.length?`[이 정부 정리] ${L.join(' / ')}\n`:''; }
function abilRules(s,i){ const A=k=>ab(s,i,k), L=[];
  if(A('logic')<=4) L.push('추리 낮음: 복잡한 계산 대신 인상·감으로 판단하고, 가끔 틀린 추론도 한다'); else if(A('logic')>=8) L.push('추리 높음: 기록을 엮어 날카롭게 추리한다');
  if(A('memory')<=4) L.push('기억 낮음: 두 라운드 넘게 지난 일의 세부(누가 무슨 주장)는 헷갈리거나 틀리게 말할 수 있다 — "아마", "그때 ~였나?"'); else if(A('memory')>=9) L.push('기억 높음: 모든 발언·투표를 정확히 기억해 앞뒤 안 맞는 말을 짚는다');
  if(A('acting')<=4) L.push('연기 낮음: 거짓말할 땐 말이 짧아지거나 꼬이고 변명이 서툴다'); else if(A('acting')>=8) L.push('연기 높음: 거짓말도 태연하고 자연스럽다');
  if(A('insight')>=8) L.push('눈치 높음: 남의 망설임·말 바뀜·분위기 변화를 잘 잡아낸다'); else if(A('insight')<=3) L.push('눈치 낮음: 남의 표정·말투 변화를 잘 못 알아챈다');
  if(A('speech')>=8) L.push('말빨 높음: 말에 힘이 있고 남을 설득하고 몰아가려 한다'); else if(A('speech')<=3) L.push('말빨 낮음: 말수가 적고 설득은 서툴다');
  if(A('social')>=8) L.push('사교 높음: 편을 모으고 귓속말로 연합을 제안하길 좋아한다'); else if(A('social')<=3) L.push('사교 낮음: 연합보다 혼자 판단한다');
  return L; }
/* 🤫 물밑·약속·관계 (2026-11-10 사용자: 지니어스 시즌4 1화처럼 "각자 입장이 달라 이해관계가 얽히고, 갈수록 갈등·관계가 복잡해지고, 이기려고 뭐든 하는" 판)
   관전 검증에서 약속·연합·거래 0건, 신이 아는 걸 못 써먹음, 같은 편 안의 다툼 없음 → 라운드마다 물밑 시간(몰래 제안·수락), 약속 감시·배신, 관계 수치, 입 가벼운 성격의 유출, 개인 목표(npc.js motive) */
const KDESC={ally:'서로의 정부(대표·집행자일 때)에 찬성하기',shield:'서로 공개 지목하지 않기',hunt:'대상을 같이 몰기(의심·반대)',info:'정보 주기(진짜든 거짓이든)',probe:'떠보기·협박·잡담'};
const PACTK=['ally','shield','hunt'];
const rk=(a,b)=>a+'>'+b;
function relAdd(s,a,b,d,why){ if(a===b||a==null||b==null||isH(a)) return; const o=s.rel[rk(a,b)]=s.rel[rk(a,b)]||{v:0,why:[]}; o.v=Math.max(-1,Math.min(1,o.v+d)); if(why){ o.why.push(`${s.round}R ${why}`); if(o.why.length>4) o.why.shift(); } }
const relV=(s,a,b)=>(s.rel[rk(a,b)]||{}).v||0;
const pdesc=(s,p)=>p.kind==='hunt'&&p.x!=null?`${nmS(s,p.x)} 같이 몰기`:KDESC[p.kind];
function secretPush(s,from,to,text){ s.bdm.push({r:s.round,from,to,text}); s.chat.push({r:s.round,seat:from,t:to,text:'🤫 '+text,kind:'secret',secret:1}); }
function secretNote(s,text){ s.chat.push({note:1,secret:1,r:s.round,text}); }
const activeN=(s,i)=>s.pacts.filter(q=>q.st==='on'&&(q.a===i||q.b===i)).length;
function makePact(s,a,b,kind,x){ const dup=s.pacts.find(q=>q.st==='on'&&q.kind===kind&&(q.x??null)===(x??null)&&((q.a===a&&q.b===b)||(q.a===b&&q.b===a))); if(dup){ secretNote(s,`🔁 (물밑) ${nmS(s,a)}·${nmS(s,b)} — 이미 한 약속을 다시 확인`); return dup; } if(activeN(s,a)>=3||activeN(s,b)>=3){ secretNote(s,`🙅 (물밑) ${nmS(s,a)}·${nmS(s,b)} — 약속이 너무 많아 더는 못 맺음`); return null; }
  const p={id:++s.pN,a,b,kind,x:x??null,r:s.round,st:'on',kept:0}; s.pacts.push(p); relAdd(s,a,b,.3,'몰래 손잡음'); relAdd(s,b,a,.3,'몰래 손잡음');
  secretNote(s,`🤝 (물밑) ${nmS(s,a)}·${nmS(s,b)} 약속: ${pdesc(s,p)}`);
  const lo=[a,b].filter(j=>!isH(j)&&per(s,j).loose); if(lo.length&&Math.random()<.45) s.leakQ.push({i:U.pick(lo),pid:p.id}); return p; }
function breakPact(s,p,by,how){ if(p.st!=='on') return; p.st='broken'; p.by=by; const v=p.a===by?p.b:p.a;
  relAdd(s,v,by,-.9,`약속(${pdesc(s,p)})을 깸`); relAdd(s,by,v,-.15,''); s.betrayN=s.betrayN||{}; s.betrayN[by]=(s.betrayN[by]||0)+1;
  secretNote(s,`💔 (물밑) ${nmS(s,by)}이(가) ${nmS(s,v)}와의 약속(${pdesc(s,p)})을 깼다 — ${how}`);
  if(isH(v)){ (s.dm[v+'-'+by]=s.dm[v+'-'+by]||[]).push({from:-1,text:`💔 ${nmS(s,by)}이(가) 약속(${pdesc(s,p)})을 깼어요 — ${how}`,r:s.round}); return; }
  shift(s,v,'😠','배신감',{speech:1,logic:-1},'표정이 확 굳었다');
  queueReact(s,'betray',`(너만 앎) ${nmS(s,by)}이(가) 너와 몰래 한 약속(${pdesc(s,p)})을 깼다 — ${how}. 공개로 폭로할지, 모른 척할지, 되갚을지 네가 정한다.`,[v,by],v); }
/* 자유 시간에 먼저 누군가를 부를 동물: 사교·개인 목표·무작위, 악마끼리 작전 기회도 */
function pickBack(s,short){ const c=alive(s).filter(i=>!isH(i)); const w=i=>ab(s,i,'social')*.5+Math.random()*4+(/손잡|갈아타|지키/.test(per(s,i).motive||'')?1.5:0);
  const L=c.sort((a,b)=>w(b)-w(a)).slice(0,short?1:(s.round===1?3:2)); const dv=c.filter(i=>isDev(s.role[i])&&!L.includes(i)); if(!short&&dv.length&&Math.random()<.5) L.push(U.pick(dv)); return L; }
/* ⏱️ 자유 시간 (2026-11-10 사용자: "지니어스처럼 실시간으로 — 어디서 만나서 얘기도 하고") — 물밑 시간을 대체.
   라운드 시작에 60~75초. 장소 4곳. 동물이 상대를 골라 빈 방으로 데려가 몰래 대화(여러 방이 동시에 — AI는 기다리지 않는 요청).
   그 방에 있던 사람만 들음(줄마다 heard). 누가 누구와 어디 갔는지는 모두가 봄(목격 → 토론 근거). 사람은 이동·부르기·초대 응답·방 안 대화. */
const PLACES=[{k:'lounge',n:'🛋️ 라운지'},{k:'a',n:'🚪 밀실 A'},{k:'b',n:'🚪 밀실 B'},{k:'c',n:'🌙 테라스'}];
const PN=k=>(PLACES.find(q=>q.k===k)||{}).n||k;
function askBg(s,i,task,schema,model){ if(!window.AIB||!AIB.on()) return null; return AIB.json(SYS,view(s,i)+'\n\n[지금 할 일] '+task,schema,{bg:true,model}); }
const here=(s,pl)=>alive(s).filter(j=>s.free&&s.free.loc[j]===pl);
const busy=(s,i)=>!!(s.free&&s.free.jobs.some(J=>!['done','plan'].includes(J.st)&&(J.i===i||J.to===i||J.h===i)));
function roomLine(s,pl,seat,text,sys){ const F=s.free, L={id:++F.lid,pl,seat,text,sys:!!sys,heard:here(s,pl)}; F.lines.push(L); (s.roomArch=s.roomArch||[]).push(Object.assign({r:s.round},L)); }
function seenAdd(s,ids,pl){ const F=s.free, left=Math.max(0,Math.round((F.end-Date.now())/1000)), txt=`${ids.map(j=>nmS(s,j)).join('·')} → ${PN(pl)}`; F.seen.push({left,text:txt}); s.seenLog.push({r:s.round,text:txt});
  if(pl!=='lounge'){ const g=here(s,pl).slice().sort((a,b)=>a-b); if(g.length>=2){ F.meets=F.meets||[]; const key=pl+':'+g.join(','); if(!F.meets.some(m=>m.key===key)) F.meets.push({key,pl,ids:g}); } } }
const placeShort=pl=>PN(pl).replace(/^\S+\s/,'');
const meetText=(s,F)=>(F.meets||[]).map(m=>`${m.ids.map(j=>nmS(s,j)).join('·')} (${placeShort(m.pl)})`).join(' · ');
/* 👀 유리창 너머 표정 — 대화는 그 방 사람만 듣지만 얼굴은 다들 봄(자유 시간 2단계). 제안 종류·수락 여부로 정함 */
const LOOK={ally:'🙂',shield:'🤫',hunt:'😏',info:'🤫',probe:'🤨'};
const look=(s,j,e)=>{ if(s.free&&j!=null) s.free.look[j]=e; };
const emptyRoom=s=>['a','b','c'].find(k=>!here(s,k).length)||null;
function startFree(s){ const dur=GL(s)<5?60:s.round===1?120:100;
  s.free={end:Date.now()+dur*1000,dur,loc:Object.fromEntries(alive(s).map(i=>[i,'lounge'])),lines:[],lid:0,jobs:[],jid:0,wave:0,seen:[],inv:{},look:{}};
  for(const i of pickBack(s,false)) s.free.jobs.push({id:++s.free.jid,i,st:'plan'});
  s.phase='free'; setActor(s,null); s.notice=`⏱️ 자유 시간 ${dur}초 — 누구와 어디서 만날까요`; s.wait=500; }
function endFree(s){ const mt=meetText(s,s.free); note(s,`⏱️ 자유 시간 끝 — 모두 테이블로 · ${mt?`👀 만남: ${mt}`:'따로 만난 사람은 없었어요'}`); s.free=null; beginTalk(s); }
function runJob(s,J){ const F=s.free, now=Date.now();
  if(J.st==='plan'){ if(!s.alive[J.i]||busy(s,J.i)) return;
    const r=need(s,`fr${s.round}:${J.id}`,()=>askBg(s,J.i,`⏱️ 자유 시간이다(정식 토론 전, ${Math.max(0,Math.round((F.end-now)/1000))}초 남음). 너는 라운지에 있다. 한 명(to: 자리 번호)을 골라 빈 방으로 데려가 몰래 이야기할 수 있다 — 누가 누구와 어디 갔는지는 다들 본다. kind — ally: 서로의 정부에 찬성하자 / shield: 서로 공개 지목하지 말자 / hunt: x(자리 번호)를 같이 몰자 / info: 정보를 준다(x는 정보의 대상, 진짜든 거짓이든) / probe: 떠보기·협박·잡담 / none: 이번엔 안 함. 자유 시간은 판이 짜이는 때다 — 라운지에 가만히 있으면 남들이 너 없이 표와 사냥감을 정하고, 혼자 안 움직인 것도 다들 본다. 이미 손잡은 상대와 이번 라운드 계획 맞추기, 의심 가는 쪽 떠보기, 거짓 정보 흘리기, 편 갈아타기 다 된다. 만나는 게 정말 손해일 때만 none. 네 정체·개인 목표·관계·약속을 생각해서 이기는 데 도움이 되면 한다. ally(서로 찬성)는 흔하고 가벼우니, 지금 꼭 필요한 거래(정보·사냥·보호)를 우선한다. 너는 지금 약속이 ${activeN(s,J.i)}개다(최대 3). say는 그 방에서 처음 건넬 말(1~2문장, 네 말투). to·x가 없으면 -1.`,SCH.back));
    if(r===undefined) return; J.st='done'; memo(s,J.i,r);
    const to=r&&Number.isInteger(r.to)&&r.to!==J.i&&r.to>=0&&r.to<N&&s.alive[r.to]?r.to:null, kind=r&&KDESC[r.kind]?r.kind:null, say=shortSay(r&&r.say,110);
    if(to==null||!kind||!say||busy(s,to)||F.inv[to]) return;
    const x=(kind==='hunt'||kind==='info')&&Number.isInteger(r.x)&&r.x>=0&&r.x<N&&r.x!==to&&r.x!==J.i&&s.alive[r.x]?r.x:null; if(kind==='hunt'&&x==null) return;
    const pl=emptyRoom(s)||'lounge'; Object.assign(J,{to,kind,x,say,pl}); F.loc[J.i]=pl;
    if(isH(to)){ F.inv[to]={jid:J.id,from:J.i,pl,until:now+20000}; seenAdd(s,[J.i],pl); J.st='invite'; return; }
    F.loc[to]=pl; seenAdd(s,[J.i,to],pl); look(s,J.i,LOOK[kind]); J.lid0=F.lid+1; roomLine(s,pl,J.i,say); secretPush(s,J.i,to,say); J.st='reply'; return; }
  if(J.st==='reply'){ const r=need(s,`fr${s.round}:${J.id}:r`,()=>askBg(s,J.to,`⏱️ 자유 시간에 ${nmS(s,J.i)}이(가) 너를 ${PN(J.pl)}로 데려가 몰래 말했다: "${J.say}" (제안: ${KDESC[J.kind]}${J.x!=null?` — 대상 ${nmS(s,J.x)}`:''}). 받을지(accept) 정하고 둘만 아는 답(say, 네 말투)을 해라. 받는 척하고 나중에 깨도 되고, 거절해도 된다.`,SCH.reply));
    if(r===undefined) return; memo(s,J.to,r); const say=shortSay(r&&r.say,110)||'…'; roomLine(s,J.pl,J.to,say); secretPush(s,J.to,J.i,say);
    if(r&&r.accept){ look(s,J.to,'😊'); look(s,J.i,'🤝'); } else if(r){ look(s,J.to,'😒'); look(s,J.i,'😤'); }
    if(r&&r.accept&&PACTK.includes(J.kind)) makePact(s,J.i,J.to,J.kind,J.x); else if(r&&!r.accept&&PACTK.includes(J.kind)) relAdd(s,J.i,J.to,-.1,'몰래 한 제안을 거절');
    if(J.kind==='info') relAdd(s,J.to,J.i,.1,'몰래 정보를 줌');
    J.acc=!!(r&&r.accept); J.st='more'; J.k=0; J.max=6; J.turn=J.i; J.wait=now+2600; return; }
  if(J.st==='more'){ if(now<J.wait) return; const sp=J.turn, other=sp===J.i?J.to:J.i, left=Math.round((F.end-now)/1000);
    if(J.k>=J.max||left<8||!s.alive[sp]||F.loc[sp]!==J.pl){ J.st='linger'; J.until=now+5000; return; }
    const said=F.lines.filter(l=>l.pl===J.pl&&l.id>=(J.lid0||0)&&!l.sys).map(l=>`${nmS(s,l.seat)}: ${l.text}`).join(' / ');
    const goal= sp===J.i ? `네가 ${nmS(s,other)}을(를) 데려온 목적: ${KDESC[J.kind]}${J.x!=null?` — 대상 ${nmS(s,J.x)}`:''}. 상대는 ${J.acc?'받아들였다 → 약속을 굳히거나 구체적으로(누구를 어떻게) 정해라':'망설이거나 거절했다 → 조건을 걸어 설득하거나, 왜 거절하는지 떠보거나, 깨끗이 물러나라'}.`
                         : `${nmS(s,other)}이(가) 너를 데려와 제안했다: ${KDESC[J.kind]}${J.x!=null?` — 대상 ${nmS(s,J.x)}`:''}. 너는 ${J.acc?'받아들였다 → 네 이익(보호·정보)을 챙기거나 조건을 붙여라':'망설였다 → 원하는 조건을 말하거나, 상대 속셈을 떠보거나, 정중히 끊어라'}. 네 진짜 속셈(정체·팀)에 맞게.`;
    const r=need(s,`fr${s.round}:${J.id}:m${J.k}`,()=>askBg(s,sp,`⏱️ 자유 시간, ${PN(J.pl)}에서 ${nmS(s,other)}와(과) 둘이 몰래 이야기 중이다(남은 ${left}초, 이 방 사람만 들음). ${goal} 지금까지: ${said}. 상대의 마지막 반응을 보고 판단해라 — 목적에 가까워졌는지, 더 밀어붙일지, 조건을 바꿀지, 접을지. 네 말투로 한마디(say, 짧게). goal: 네 목적이 이뤄졌으면 done, 아직이면 ongoing, 포기하면 giveup. accept: 지금 이 제안(약속)에 대한 네 마음(데려온 쪽이면 true). 더 할 말이 없거나 목적이 정리됐으면 end:true(say는 마무리 한마디), 상대 반응 때문에 더 얘기하고 싶으면 end:false.`,SCH.cont,'haiku'));
    if(r===undefined) return; memo(s,sp,r); const say=shortSay(r&&r.say,110);
    if(say){ roomLine(s,J.pl,sp,say); secretPush(s,sp,other,say); }
    /* 따라간 쪽의 마음이 바뀌면 결과도 바뀜: 설득 → 약속 성사, 철회 → 관계 나빠짐 */
    if(r&&sp===J.to&&typeof r.accept==='boolean'&&r.accept!==J.acc){ J.acc=r.accept;
      if(r.accept){ if(PACTK.includes(J.kind)) makePact(s,J.i,J.to,J.kind,J.x); roomLine(s,J.pl,J.i,'🤝 설득 끝에 약속 성사',true); look(s,J.i,'😊'); look(s,J.to,'🤝'); }
      else { relAdd(s,J.i,J.to,-.15,'몰래 한 약속을 바로 물림'); roomLine(s,J.pl,J.i,'💨 마음을 바꿔 약속을 물렸다',true); look(s,J.i,'😤'); look(s,J.to,'😑'); } }
    else if(say) look(s,sp, r&&r.goal==='giveup'?'😑':J.acc?'🤝':'🤨');
    if(r&&sp===J.i&&r.goal==='done'&&!J.done){ J.done=1; }
    J.k++; J.turn=other; J.wait=now+2600; if(!r||!say||r.end){ J.st='linger'; J.until=now+5000; } return; }
  if(J.st==='invite'){ const iv=F.inv[J.to];
    if(iv&&iv.ok){ delete F.inv[J.to]; F.loc[J.to]=J.pl; seenAdd(s,[J.to],J.pl); roomLine(s,J.pl,J.i,J.say); secretPush(s,J.i,J.to,J.say);
      if(PACTK.includes(J.kind)) (s.dm[J.to+'-'+J.i]=s.dm[J.to+'-'+J.i]||[]).push({from:J.i,text:J.say,r:s.round,offer:{id:++s.pN,kind:J.kind,x:J.x,st:'wait'}});
      J.h=J.to; J.st='human'; J.until=now+30000; return; }
    if(!iv||iv.no||now>iv.until){ delete F.inv[J.to]; roomLine(s,J.pl,J.i,'(불렀는데 아무도 안 왔다…)',true); F.loc[J.i]='lounge'; look(s,J.i,'😑'); relAdd(s,J.i,J.to,-.1,'불렀는데 안 옴'); J.st='done'; } return; }
  if(J.st==='human'||J.st==='linger'){ if(now>J.until||(J.st==='human'&&F.loc[J.h]!==J.pl)){ for(const j of [J.i,J.to]) if(j!=null&&!isH(j)&&F.loc[j]===J.pl){ F.loc[j]='lounge'; delete F.look[j]; } J.st='done'; } return; }
  if(J.st==='hreply'){ const r=need(s,`fr${s.round}:${J.id}:h`,()=>askBg(s,J.i,`⏱️ 자유 시간, ${PN(J.pl)}에서 ${nmS(s,J.h)}이(가) 너에게 몰래 말했다: "${J.text}". 그 방에 있는 사람만 듣는다. 네 말투로 답해라(say). 거래·거짓말·거절 모두 가능.`,SCH.say));
    if(r===undefined) return; memo(s,J.i,r); const say=shortSay(r&&r.say,110)||'…'; look(s,J.i,'💬'); roomLine(s,J.pl,J.i,say); secretPush(s,J.i,J.h,say); J.st='done'; } }
function beginTalk(s){ s.phase='talk'; setActor(s,null); s.notice=`💬 ${s.round}라운드 자유 토론 — 대표는 ${nmS(s,s.rep)}`;
  const lq=s.leakQ.find(q=>s.alive[q.i]); if(lq){ s.leakQ=s.leakQ.filter(q=>q!==lq); const p=s.pacts.find(p=>p.id===lq.pid); if(p&&!p.leaked){ s.leakCue={i:lq.i,pid:p.id}; s.talk.next=lq.i; } } s.wait=1200; }
const SCH={
  talk:{type:'object',properties:{say:{type:'string'},to:{type:'integer'},tone:{type:'string',enum:['acc','trust','ask','none']},dm:{type:'string'},dmTo:{type:'integer'},memo:{type:'string'}},required:['say','to','tone','dm','dmTo','memo'],additionalProperties:false},
  back:{type:'object',properties:{to:{type:'integer'},kind:{type:'string',enum:['ally','shield','hunt','info','probe','none']},x:{type:'integer'},say:{type:'string'},memo:{type:'string'}},required:['to','kind','x','say','memo'],additionalProperties:false},
  reply:{type:'object',properties:{accept:{type:'boolean'},say:{type:'string'},memo:{type:'string'}},required:['accept','say','memo'],additionalProperties:false},
  react:{type:'object',properties:{say:{type:'string'},to:{type:'integer'},tone:{type:'string',enum:['acc','trust','ask','none']},memo:{type:'string'}},required:['say','to','tone','memo'],additionalProperties:false},
  target:{type:'object',properties:{target:{type:'integer'},say:{type:'string'},memo:{type:'string'}},required:['target','say','memo'],additionalProperties:false},
  vote:{type:'object',properties:{vote:{type:'string',enum:['Y','N']},why:{type:'string'},memo:{type:'string'}},required:['vote','why','memo'],additionalProperties:false},
  disc:{type:'object',properties:{discard:{type:'integer'},memo:{type:'string'}},required:['discard','memo'],additionalProperties:false},
  claim:{type:'object',properties:{claim:{type:'string',enum:['GG','GB','BB']},say:{type:'string'},memo:{type:'string'}},required:['claim','say','memo'],additionalProperties:false},
  say:{type:'object',properties:{say:{type:'string'},memo:{type:'string'}},required:['say','memo'],additionalProperties:false},
  cont:{type:'object',properties:{say:{type:'string'},goal:{type:'string',enum:['done','ongoing','giveup']},accept:{type:'boolean'},end:{type:'boolean'},memo:{type:'string'}},required:['say','goal','accept','end','memo'],additionalProperties:false},
};
/* 그 동물 자리에서 보이는 것만 — 대화·기록은 줄이지 않고 전부(사람도 화면에서 다시 볼 수 있으니까, 2026-11-10 사용자: "36줄만 기억하면 안 된다").
   모두에게 같은 공개 정보(자리·정부 기록·대화 전체)를 앞에, 동물마다 다른 비밀(정체·메모·본 카드·귓속말)을 뒤에 둠
   → 앞부분이 Claude 쪽 캐시에 남아 다음 호출은 싸고 빠름(대화는 뒤에만 붙으므로 앞이 그대로) */
function view(s,i){ const N_=j=>`${nmS(s,j)}${isH(j)?'(사람)':''}`, r=s.role[i], p=per(s,i), L=[];
  L.push(`[자리 번호] ${ALL.map(j=>`${j}=${N_(j)}${s.alive[j]?'':'(처형됨)'}`).join(', ')}`);
  /* 한 라운드 안의 순서를 ①~④로 — 찬반이 카드·주장보다 먼저라는 걸 헷갈려 "주장이 달라서 반대했다" 같은 말이 나왔음 (2026-11-10) */
  if(s.round>1||s.govs.length) L.push(`[의심 점수 — 코드가 정부 기록·주장·투표·네가 본 카드로 계산(높을수록 악마팀 같음, 네가 아는 정체는 확실)] ${gSusLine(s,i)}`);
  L.push('[정부 기록 — 라운드마다 ① 지목 → ② 찬반 투표 → ③ 카드 적립 → ④ 대표·집행자 주장 순서로 일어남]\n'+(s.govs.length?s.govs.map(g=>{ const yn=g.votes?`② 찬반: 찬성 ${ALL.filter(j=>g.votes[j]==='Y').map(N_).join('·')||'-'} / 반대 ${ALL.filter(j=>g.votes[j]==='N').map(N_).join('·')||'-'}`:'';
    if(g.auto) return `${g.r}R 3번 연속 부결 → 맨 위 카드 자동 적립 ${CARD(g.card)} (대표·집행자 없음)`;
    if(g.fail) return `${g.r}R ① 대표 ${N_(g.rep)}가 집행자 후보 ${N_(g.exe)} 지목 → ${yn} → 부결(카드·주장 없음)`;
    return `${g.r}R ① 대표 ${N_(g.rep)}가 집행자 ${N_(g.exe)} 지목 → ${yn} → ③ ${CARD(g.card)} 적립 → ④ 주장: 대표 "${CT[g.rc]||'(아직)'}" · 집행자 "${CT[g.ec]||'(아직)'}"${g.rc&&g.ec&&g.rc!==g.ec?' ⚠️서로 안 맞음':''}`; }).join('\n'):'(아직 없음)'));
  const PC=s.chat.filter(c=>!c.secret);
  L.push('[공개 대화 — 처음부터 전부]\n'+(PC.length?PC.map(c=>c.note?`(${c.text})`:`${c.r}R ${N_(c.seat)}${c.t!=null?` → ${N_(c.t)}`:''}: ${c.text}`).join('\n'):'(아직 없음)'));
  const dead=ALL.filter(j=>!s.alive[j]);
  if(s.seenLog.length) L.push(`[자유 시간 목격 — 누가 누구와 어디 갔나(모두 봄)]\n${s.seenLog.map(x=>`${x.r}R ${x.text}`).join('\n')}`);
  L.push(`[지금 판] ${s.round}라운드 · 선행 ${s.good}/${GL(s)} · 악행 ${s.bad}/${GL(s)} (악행 ${GL(s)-1}장째에 처형) · 연속 부결 ${s.fails}/3 · 대표 ${s.rep>=0?N_(s.rep):'-'}${s.exe!=null?` · 집행자 후보 ${N_(s.exe)}`:''}${dead.length?` · 처형됨: ${dead.map(j=>`${N_(j)}=${RN[s.role[j]]}`).join(', ')}`:''}`);
  L.push(`[출연자 — 알려진 플레이스타일과 지금 분위기]\n${ALL.filter(j=>s.alive[j]).map(j=>{ if(isH(j)) return `${N_(j)}: 알 수 없음`; const q=per(s,j), c=condOf(s,j); return `${N_(j)}: ${q.style||''}(특기 ${q.special||'-'} / 약점 ${q.weak||'-'}) · 지금 ${c.mood}${c.moodT}`; }).join('\n')}`);
  /* ── 여기부터 이 동물만 아는 것 ── */
  const vo=voiceOf(p); L.push(`[너] ${i}번 ${p.emo||''} ${p.name||''} — ${p.desc||''}`);
  L.push(`[너의 말투] ${vo.s}${vo.ex.length?` 예: ${vo.ex.join(' / ')}`:''}`);
  { const b=baseAb(s,i), cu=curAb(s,i); L.push(`[너의 능력치 1~10] ${ABL().map(a=>`${a.e}${a.n} ${cu[a.k]}${cu[a.k]!==b[a.k]?`(원래 ${b[a.k]})`:''}`).join(' · ')}`);
    const rl=abilRules(s,i); if(rl.length) L.push(`[능력치대로] ${rl.join(' / ')}`);
    const c=condOf(s,i); L.push(`[너의 지금 상태] ${c.mood}${c.moodT}${c.log.length?` — 최근: ${c.log.slice(-3).map(x=>`${x.r}R ${x.text}`).join(' / ')}`:''}`); }
  L.push(`[너의 정체] ${RN[r]} · ${isDev(r)?'악마팀':'천사팀'}`);
  if(isDev(r)) L.push(`[비밀] 악마팀: ${devs(s).map(j=>`${N_(j)}(${RN[s.role[j]]})`).join(', ')}`);
  if(r==='arch') L.push(`[비밀] 신은 ${N_(ALL.find(j=>s.role[j]==='god'))}`);
  if(r==='god') L.push(`[비밀] 알게 된 악마: ${s.godKnow.length?s.godKnow.map(N_).join(', '):'아직 없음'}`);
  if((s.seen[i]||[]).length) L.push(`[네가 직접 본 카드]\n${s.seen[i].map(x=>`${x.r}R ${x.t}`).join('\n')}`);
  { const my=s.govs.filter(g=>(g.rep===i&&g.rc)||(g.exe===i&&g.ec)).map(g=>`${g.r}R ${g.rep===i?`대표로 "${CT[g.rc]}"을(를) 넘겼다`:`집행자로 "${CT[g.ec]}"을(를) 받았다`}고 공개 주장 (적립 ${CARD(g.card)})`);
    if(my.length) L.push(`[네가 공개적으로 한 카드 주장 — 앞으로도 이 주장과 맞게 말해라(거짓말이었다면 그 거짓말을 유지, 들키면 들킨 대로 해명)]\n${my.join('\n')}`); }
  for(const h of HSEAT){ const d=s.dm[h+'-'+i]; if(d&&d.length) L.push(`[${N_(h)}와 둘만 한 귓속말 — 전부]\n${d.map(x=>`${x.r}R ${x.from===i?'너':N_(h)}: ${x.text}`).join('\n')}`); }
  if(p.motive) L.push(`[너의 개인 목표 — 팀 승리와 별개로 네가 원하는 것] ${p.motive}`);
  { const R=ALL.filter(j=>j!==i).map(j=>[j,s.rel[rk(i,j)]]).filter(([j,o])=>o&&Math.abs(o.v)>=.15).sort((a,b)=>Math.abs(b[1].v)-Math.abs(a[1].v)).slice(0,5);
    if(R.length) L.push(`[너의 관계 — 속마음] ${R.map(([j,o])=>`${N_(j)} ${o.v>0?'+':''}${o.v.toFixed(1)}(${o.why.slice(-2).join(', ')})`).join(' / ')}`); }
  { const P=s.pacts.filter(q=>q.a===i||q.b===i); if(P.length) L.push(`[몰래 맺은 약속]\n${P.map(q=>`${q.r}R ${N_(q.a===i?q.b:q.a)}와 ${pdesc(s,q)} — ${q.st==='on'?'유지 중':`깨짐(${q.by===i?'네가 깸':'상대가 깸'})`}${q.leaked?' · 소문남':''}`).join('\n')}`); }
  { const D=s.bdm.filter(d=>d.from===i||d.to===i); if(D.length) L.push(`[물밑에서 오간 말 — 너와 상대만 앎]\n${D.map(d=>`${d.r}R ${d.from===i?'너':N_(d.from)} → ${d.to===i?'너':N_(d.to)}: ${d.text}`).join('\n')}`); }
  const mine=s.chat.filter(c=>c.seat===i&&!c.note&&!c.secret).slice(-3); if(mine.length) L.push(`[네가 최근에 한 말 — 비슷하게 반복 금지] ${mine.map(c=>c.text).join(' / ')}`);
  if((s.sense[i]||[]).length) L.push(`[너만 느낀 것 — 눈치] ${s.sense[i].slice(-5).map(x=>x.text).join(' / ')}`);
  if(s.memo[i]) L.push(`[지난번 너의 속마음 메모] ${s.memo[i]}`);
  return L.join('\n'); }
function ask(s,i,task,schema){ if(!window.AIB||!AIB.on()) return null; return AIB.json(SYS,view(s,i)+'\n\n[지금 할 일] '+task,schema); }
function memo(s,i,r){ const m=r&&clean(r.memo); if(m) s.memo[i]=m.slice(0,220); }

/* ───────── 규칙 ───────── */
function draw(s,n){ const out=[]; for(let k=0;k<n;k++){ if(!s.deck.length){ s.deck=U.shuffle(s.disc); s.disc=[]; } out.push(s.deck.pop()); } return out; }
function nextRep(s){ for(let k=1;k<=N;k++){ const j=((s.rep+k)%N+N)%N; if(s.alive[j]) return j; } return 0; }
const legalExe=(s,i)=>alive(s).filter(j=>j!==i&&!(j===s.lastExe&&alive(s).length>3));
const guesser=s=>{ const l=ALL.find(j=>s.role[j]==='lucifer'&&s.alive[j]); return l!=null?l:devs(s).find(j=>s.alive[j]); };
const lastGov=s=>s.govs[s.govs.length-1];
const note=(s,text)=>s.chat.push({note:1,r:s.round,text});
function setActor(s,i){ s.turn=i!=null&&isH(i)?pOf(i):null; }
function startRound(s,short){ if(s.round>0) settle(s); s.round++; s.rep=nextRep(s); s.exe=null; s.votes=Array(N).fill(null); s.vwhy={}; s.vshown=[]; s.hand=null; s.hand3=null; s.killNext=false;
  s.talk={n:0,max:short?2:(s.round===1?3:s.round<=3?4:5),passes:0,next:null,spoke:{},cur:null}; setActor(s,null);
  if(!short&&window.AIB&&AIB.on()) startFree(s); else beginTalk(s);
  note(s,`🎙️ ${s.round}라운드 — 대표는 ${nmS(s,s.rep)}. ${s.phase==='free'?'⏱️ 자유 시간 뒤 ':''}자유 토론`); s.wait=s.phase==='free'?500:1400; }
function endTalk(s){ s.phase='nominate'; setActor(s,s.rep); s.typing=null; note(s,`🎙️ 토론 끝 — 대표 ${nmS(s,s.rep)}의 집행자 지목`); s.notice=`🎙️ 대표 ${nmS(s,s.rep)}이(가) 집행자를 지목해요`; s.wait=900; }
function doNominate(s,i,t,say){ s.exe=t; if(say) s.chat.push({r:s.round,seat:i,text:say,t}); note(s,`👉 대표 ${nmS(s,i)} → 집행자 후보 ${nmS(s,t)}`);
  s.phase='vote'; s.vtry++; s.votes=Array(N).fill(null); s.vwhy={}; s.vshown=[]; setActor(s,null); s.notice=`🗳️ ${nmS(s,i)} · ${nmS(s,t)} 정부 — 찬성? 반대?`; s.wait=700; }
function tallyVotes(s){ const y=alive(s).filter(i=>s.votes[i]==='Y').length, n=alive(s).length-y;
  for(const o of [s.rep,s.exe]) for(const m of alive(s)) if(m!==o&&s.votes[m]==='N') relAdd(s,o,m,-.12,'내 정부에 반대');
  for(const p of s.pacts.filter(p=>p.st==='on')){
    if(p.kind==='ally') for(const [o,m] of [[p.a,p.b],[p.b,p.a]]){ if(p.st!=='on'||!(s.rep===o||s.exe===o)||!s.alive[m]) continue; if(s.votes[m]==='N') breakPact(s,p,m,`${s.round}R ${nmS(s,o)} 정부에 반대표`); else if(s.votes[m]==='Y'){ p.kept++; relAdd(s,o,m,.1,'약속대로 찬성'); } }
    if(p.kind==='hunt'&&p.x!=null&&(s.rep===p.x||s.exe===p.x)) for(const m of [p.a,p.b]) if(p.st==='on'&&s.alive[m]&&s.votes[m]==='Y') breakPact(s,p,m,`같이 ${nmS(s,p.x)} 몰기로 해 놓고 ${nmS(s,p.x)} 정부에 찬성`); }
  if(y>n){ note(s,`✅ 찬성 ${y} : 반대 ${n} — 정부 성립`); s.fails=0; s.hand=draw(s,3); s.hand3=s.hand.slice(); s.phase='rdisc'; setActor(s,s.rep); s.notice=`🃏 대표 ${nmS(s,s.rep)}이(가) 카드 3장 중 1장을 버려요`; s.wait=900; return; }
  s.govs.push({r:s.round,rep:s.rep,exe:s.exe,votes:s.votes.slice(),fail:true}); s.fails++; note(s,`❌ 찬성 ${y} : 반대 ${n} — 부결 (연속 ${s.fails}번)`);
  if(!isH(s.rep)) shift(s,s.rep,'😣','체면 구김',{speech:-1},'고른 정부가 부결됐다'); queueReact(s,'fail',`${nmS(s,s.rep)}의 정부가 ${y}:${n}로 부결됐다`,[s.rep,s.exe]);
  if(s.fails>=3){ const c=draw(s,1)[0]; s.lastExe=null; enact(s,c,true); } else startRound(s,true); }
function doRdisc(s,k){ const i=s.rep, h=s.hand; const x=h.splice(k,1)[0]; s.disc.push(x); s.passed=h.slice();
  (s.seen[i]=s.seen[i]||[]).push({r:s.round,t:`대표로 뽑은 3장 ${s.hand3.map(CARD).join('·')} → ${CARD(x)} 버리고 ${s.passed.map(CARD).join('·')}를 집행자에게`});
  s.phase='edisc'; setActor(s,s.exe); s.notice=`🃏 집행자 ${nmS(s,s.exe)}이(가) 2장 중 1장을 버려요`; s.wait=900; }
function doEdisc(s,k){ const i=s.exe, h=s.hand; const x=h.splice(k,1)[0]; s.disc.push(x);
  (s.seen[i]=s.seen[i]||[]).push({r:s.round,t:`집행자로 받은 2장 ${s.passed.map(CARD).join('·')} → ${CARD(x)} 버림`}); enact(s,h[0],false); }
function enact(s,card,auto){ if(card==='G') s.good++; else s.bad++; s.hand=null;
  s.govs.push({r:s.round,rep:auto?null:s.rep,exe:auto?null:s.exe,votes:auto?null:s.votes.slice(),card,rc:null,ec:null,auto});
  if(!auto) s.lastExe=s.exe;
  note(s,`${card==='G'?'😇 선행':'😈 악행'} 적립${auto?' (3번 부결 → 맨 위 카드 자동)':''} — 선행 ${s.good}/${GL(s)} · 악행 ${s.bad}/${GL(s)}`);
  if(s.bad<GL(s)&&s.good<GL(s)&&(card==='B'||Math.random()<.5)) queueReact(s,card==='B'?'bad':'good',auto?`3번 부결로 ${CARD(card)}이 자동 적립됐다`:`${nmS(s,s.rep)}·${nmS(s,s.exe)} 정부에서 ${CARD(card)}이 나왔다`,auto?[]:[s.rep,s.exe]);
  if(card==='B'){ const g=ALL.find(j=>s.role[j]==='god'); const c=ALL.filter(j=>s.role[j]==='devil'&&!s.godKnow.includes(j)); if(g!=null&&s.alive[g]&&c.length) s.godKnow.push(U.pick(c)); }
  if(s.bad>=GL(s)) return endGame(s,'dev',`악행 ${GL(s)}장 적립`);
  if(s.good>=GL(s)){ const gs=guesser(s); s.phase='guess'; setActor(s,gs); s.notice=`🎯 선행 ${GL(s)}장! 하지만 악마팀이 신을 맞히면 역전 — ${nmS(s,gs)}이(가) 지목해요`; note(s,s.notice); s.wait=1500; return; }
  if(auto){ startRound(s); return; }
  s.killNext= card==='B'&&s.bad===GL(s)-1; s.phase='claimRep'; setActor(s,s.rep); s.notice=`📣 대표 ${nmS(s,s.rep)}: 집행자에게 넘긴 2장은?`; s.wait=1200; }
function doClaim(s,i,c,say){ const g=lastGov(s), rep=s.phase==='claimRep'; if(rep) g.rc=c; else g.ec=c;
  s.chat.push({r:s.round,seat:i,text:`📣 ${rep?'넘긴':'받은'} 2장은 ${CT[c]}이었어요.${say?' '+say:''}`,kind:'claim'});
  tellCheck(s,i,c!==pair(s.passed||[]));
  if(!rep&&g.rc&&g.rc!==c){ for(const j of [g.rep,g.exe]) if(!isH(j)&&once(s,`ct${s.round}-${j}`)) shift(s,j,'😥','몰림',{acting:-1},'주장이 엇갈려 의심받는다'); queueReact(s,'contra',`대표 ${nmS(s,g.rep)}는 ${CT[g.rc]}, 집행자 ${nmS(s,g.exe)}는 ${CT[c]} — 주장이 엇갈렸다`,[g.rep,g.exe]); }
  if(rep){ s.phase='claimExe'; setActor(s,g.exe); s.notice=`📣 집행자 ${nmS(s,g.exe)}: 받은 2장은?`; }
  else if(s.killNext){ s.phase='kill'; setActor(s,s.rep); s.notice=`⚔️ 네 번째 악행 — 대표 ${nmS(s,s.rep)}이(가) 1명을 처형해요`; note(s,s.notice); }
  else startRound(s);
  s.wait=1500+(say||'').length*40; }
function doKill(s,i,t,say){ if(say) s.chat.push({r:s.round,seat:i,text:say,t}); s.alive[t]=false; note(s,`⚔️ ${nmS(s,i)}이(가) ${nmS(s,t)}을(를) 처형 — 정체는 ${RN[s.role[t]]}`);
  /* 처형으로 정체가 드러나면, 그 사람을 의심했던 동물들은 자신감이 붙거나 흔들림 */
  const dv=isDev(s.role[t]); const acc=[...new Set(s.chat.filter(c=>c.t===t&&c.kind==='acc'&&!isH(c.seat)).map(c=>c.seat).concat(isH(i)?[]:[i]))].filter(j=>s.alive[j]).slice(0,3);
  for(const j of acc) dv?shift(s,j,'😎','자신감',{speech:2,logic:1},`${nmS(s,t)} 의심이 맞아떨어졌다`):shift(s,j,'😓','오판',{logic:-1,speech:-2},`${nmS(s,t)} 의심이 빗나갔다`);
  queueReact(s,'kill',`${nmS(s,t)}이(가) 처형됐고 정체는 ${RN[s.role[t]]}였다`,acc);
  if(s.role[t]==='lucifer') return endGame(s,'ang','루시퍼 처형'); startRound(s); }
function doGuess(s,i,t,say){ if(say) s.chat.push({r:s.round,seat:i,text:say,t}); const ok=s.role[t]==='god';
  note(s,`🎯 ${nmS(s,i)}의 지목: ${nmS(s,t)} — ${ok?'정답! 신이었어요':'틀렸어요'}`); endGame(s,ok?'dev':'ang',ok?`선행 ${GL(s)}장이었지만 신을 맞힘`:`선행 ${GL(s)}장 · 신을 지킴`); }
function endGame(s,team,why){ s.wteam=team; s.endWhy=why; s.phase='confess'; setActor(s,null); s.notice=`🏁 ${team==='dev'?'😈 악마팀':'😇 천사팀'} 승리 (${why}) — 정체 공개! 동물들의 속마음을 들어 봐요`; note(s,s.notice); s.wait=1200; }

/* ───────── AI가 못 쓸 때 단순 규칙 ───────── */
const fbDisc=(s,i,h)=>{ const want=isDev(s.role[i])?'G':'B'; const k=h.indexOf(want); return k>=0?k:0; };
/* 🧠 의심 점수 (NPC 룰 1·3·4·5·14·17, 2026-11-12) — i가 보기에 x가 악마팀일 가능성(점수, 높을수록 의심). 공개 기록 + i만 아는 것으로 코드가 계산:
   악이 나온 정부의 대표·집행자(+), 선이 나온 정부(−) · 주장 엇갈림(둘 다 +) · "선·악을 넘겼다/받았다"는데 악이 나옴 → 집행자가 고른 것(+큼) · 둘 다 "악·악"이면 패가 나빴던 걸로(+작게)
   · 악이 나온 정부에 찬성한 사람(+작게) · 처형으로 천사를 죽인 대표(+) / 악마를 잡은 대표(−) · 내가 대표로 선을 넘겼는데 악이 나왔으면 그 집행자는 확실(+3)
   · 아는 정체(악마팀끼리, 대천사→신, 신→알게 된 악마, 처형으로 공개된 정체)는 확정 · 관계(못 믿는 사람 조금 +). AI엔 표로, AI가 없으면 이 점수로 지목·찬반·처형·주장. */
function gSus(s,i){ const S={}; for(const x of ALL) S[x]=0; const add=(x,v)=>{ if(x!=null) S[x]+=v; };
  for(const g of s.govs){ if(g.auto||g.fail||!g.card) continue; const B=g.card==='B';
    add(g.rep,B?.5:-.3); add(g.exe,B?.5:-.3);
    if(g.rc&&g.ec&&g.rc!==g.ec){ add(g.rep,.6); add(g.exe,.6); }
    if(B&&g.ec&&g.ec!=='BB') add(g.exe,1.2); if(B&&g.rc==='GG') add(g.exe,.8);
    if(B&&g.rc==='BB'&&g.ec==='BB'){ add(g.rep,-.3); add(g.exe,-.3); }
    if(g.votes) for(const v of ALL) if(v!==g.rep&&v!==g.exe&&g.votes[v]==='Y') add(v,B?.15:-.05);
    if(B&&g.rep===i&&(s.seen[i]||[]).some(x=>{ const m_=x.r===g.r&&x.t.match(/버리고 (.*)를 집행자에게/); return m_&&m_[1].includes(CARD('G')); })) add(g.exe,3); }   /* 내가 선을 넘겼는데 악이 나옴 */
  for(const x of ALL){ if(!s.alive[x]) S[x]=isDev(s.role[x])?9:-9; const o=s.rel[rk(i,x)]; if(o) S[x]-=o.v*.3; }
  const r=s.role[i]; if(isDev(r)) for(const x of ALL) S[x]=isDev(s.role[x])?9:-9; if(r==='arch'){ const gd=ALL.find(j=>s.role[j]==='god'); S[gd]=-9; } if(r==='god') for(const x of s.godKnow) S[x]=9; S[i]=-9;
  return S; }
const gSusLine=(s,i)=>{ const S=gSus(s,i); return alive(s).filter(x=>x!==i).sort((a,b)=>S[b]-S[a]).map(x=>`${nmS(s,x)} ${S[x]>=9?'악마(확실)':S[x]<=-9?'천사(확실)':S[x].toFixed(1)}`).join(', '); };
/* 악마팀이 신을 짐작 — 신은 악마를 하나씩 알게 되니, 악마를 정확히 의심·반대해 온 천사일수록 신 같음 */
function godGuess(s){ const D=devs(s), sc={}; for(const x of ALL.filter(j=>!isDev(s.role[j]))){ let v=0; for(const c of s.chat) if(c.seat===x&&c.t!=null&&!c.note){ if(D.includes(c.t)&&c.kind==='acc') v+=1; if(!D.includes(c.t)&&c.kind==='acc') v-=.3; }
    for(const g of s.govs){ if(!g.votes||g.auto) continue; const dg=D.includes(g.rep)||D.includes(g.exe); if(dg&&g.votes[x]==='N') v+=.4; if(!dg&&g.votes[x]==='Y') v+=.1; } sc[x]=v+Math.random()*.3; }
  return Object.keys(sc).map(Number).sort((a,b)=>sc[b]-sc[a])[0]; }

/* 🧠 AI 없을 때(또는 AI 답이 이상할 때) — 의심 점수로 */
const geOld=(s,i)=>window.__geSide!=null&&(isDev(s.role[i])?'dev':'ang')!==window.__geSide;   /* 시험용: local/duel-test.js에서 한쪽 편만 새 판단으로 (평소엔 null) */
function geNom(s,i,L){ if(geOld(s,i)) return U.pick(L); const S=gSus(s,i); if(isDev(s.role[i])){ const ang=ALL.find(j=>!isDev(s.role[j])&&s.alive[j]), pub=ang!=null?gSus(s,ang):S; /* 천사 눈에 보이는 의심 */ const mate=L.filter(j=>isDev(s.role[j])).sort((a,b)=>pub[a]-pub[b]);
    if(mate.length&&(s.bad>=GL(s)-2||pub[mate[0]]<.6&&Math.random()<.6)) return mate[0]; return L.filter(j=>!isDev(s.role[j])).sort((a,b)=>(pub[a]-pub[b]))[0]??L[0]; }   /* 악마: 동료가 아직 깨끗해 보이면 동료와 정부를(막판엔 무조건), 아니면 깨끗해 보이는 천사와 신뢰 쌓기 */
  return L.slice().sort((a,b)=>S[a]-S[b]+(Math.random()-.5)*.2)[0]; }
function geVote(s,i){ if(geOld(s,i)) return Math.random()<.7?'Y':'N'; const S=gSus(s,i), rp=S[s.rep]||0, ex=S[s.exe]||0;
  if(isDev(s.role[i])){ if(isDev(s.role[s.rep])||isDev(s.role[s.exe])) return 'Y'; return s.fails>=2||Math.random()<.65?'Y':'N'; }   /* 천사 정부에 반대만 하면 패턴으로 들킴 — 대개 찬성 */
  if(s.fails>=2&&Math.max(rp,ex)<2) return 'Y';   /* 세 번 부결되면 맨 위 카드 자동 — 웬만하면 통과 */
  return Math.max(rp,ex)<.6&&rp+ex<1?'Y':'N'; }
function geClaim(s,i,rep,real,card){ if(geOld(s,i)) return real; if(!isDev(s.role[i])||card!=='B') return real;   /* 천사·선 적립이면 사실대로 */
  const g=lastGov(s); if(rep){ const ex=g.exe; if(isDev(s.role[ex])) return 'BB'; return Math.random()<.5+((per(s,i).bluff||.5)-.5)?'GB':real; }   /* 대표 악마: 동료 집행자면 "악·악" 덮어 주기, 천사 집행자면 "선·악 넘겼다"로 덮어씌우기(허세만큼) */
  return g.rc==='GB'&&real==='GB'&&Math.random()<.3?'GB':'BB'; }   /* 집행자 악마: 받은 2장을 "악·악"이라 해 패 탓으로(예전엔 늘 사실대로 말해 스스로 들킴) */
function geKill(s,i,L){ if(geOld(s,i)) return U.pick(L.filter(j=>!(isDev(s.role[i])&&isDev(s.role[j])))||L); const S=gSus(s,i); if(isDev(s.role[i])){ const ang=L.filter(j=>!isDev(s.role[j])); const gg=godGuess(s); return ang.includes(gg)?gg:ang[0]??L[0]; }   /* 악마 대표: 신 같은 천사부터 */
  return L.slice().sort((a,b)=>S[b]-S[a])[0]; }
/* ───────── 진행 ───────── */
function pickSpeaker(s){ const T=s.talk, cand=alive(s).filter(i=>!isH(i));
  if(T.next!=null&&cand.includes(T.next)){ const x=T.next; T.next=null; return x; }
  const last=(s.chat.slice().reverse().find(c=>!c.note)||{}).seat;
  const c=cand.filter(i=>i!==last); if(!c.length) return null;
  return c.map(i=>[i,(T.spoke[i]||0)-(per(s,i).talk||.5)*.5-ab(s,i,'speech')*.05+Math.random()*.9]).sort((a,b)=>a[1]-b[1])[0][0]; }
function humanWait(s){ const g=lastGov(s)||{};
  switch(s.phase){ case 'nominate': return isH(s.rep); case 'rdisc': return isH(s.rep); case 'edisc': return isH(s.exe);
    case 'claimRep': return isH(g.rep); case 'claimExe': return isH(g.exe); case 'kill': return isH(s.rep); case 'guess': return isH(guesser(s));
    case 'vote': return alive(s).every(i=>isH(i)||s.votes[i])&&alive(s).some(i=>isH(i)&&!s.votes[i]); }
  return false; }
function stepDelay(s){ syncH(s); if(s.winner!=null) return null; if(s.dmq.length) return 300; if(s.react.length&&!['confess','over','intro'].includes(s.phase)) return s.wait??500; if(humanWait(s)) return null; return s.wait??600; }
function step(s){ syncH(s); if(s.winner!=null) return;
  /* 귓속말 답장이 먼저 */
  if(s.dmq.length){ const q=s.dmq[0], key=`dm${q.id}`; const r=need(s,key,()=>ask(s,q.t,`${nmS(s,q.h)}이(가) 너에게만 귓속말을 보냈다(위 귓속말의 마지막 줄). 둘만 보는 답장을 say에. 협상·거절·거짓말 모두 가능.`,SCH.say));
    if(r===undefined){ s.typingDm=[q.h,q.t]; return; } s.typingDm=[]; s.dmq.shift(); memo(s,q.t,r);
    (s.dm[q.h+'-'+q.t]=s.dm[q.h+'-'+q.t]||[]).push({from:q.t,text:shortSay(r&&r.say,90)||U.pick(['…생각해 볼게요.','음, 일단 알겠어요.']),r:s.round}); s.ev++; return; }
  /* 사건 반응: 큰 일 직후 1~2마리가 짧게 */
  if(s.react.length&&!['confess','over','intro'].includes(s.phase)){ const x=s.react[0]; if(x.who==null) x.who=x.done.length<x.n?pickReactor(s,x):null;
    if(x.who==null){ s.react.shift(); s.ev++; return; } const i=x.who;
    const r=need(s,`rx${x.id}:${i}`,()=>ask(s,i,`방금 일: ${x.text}. 이 일에 짧게 반응할 수 있다(5~30자, 의심이면 근거 한마디). 특정인에게 하는 말이면 to에 자리 번호, 아니면 -1. 반응할 게 없으면 say는 "".`,SCH.react));
    if(r===undefined){ s.typing=i; return; } s.typing=null; memo(s,i,r); x.done.push(i); x.who=null; if(x.done.length>=x.n) s.react.shift();
    const say=shortSay(r&&r.say,60); if(say){ const to=r.to>=0&&r.to<N&&r.to!==i&&s.alive[r.to]?r.to:null; talkPush(s,i,say,to,r.tone==='none'?'':r.tone); s.wait=1100+say.length*45; } else s.wait=200;
    s.ev++; return; }
  const P_=s.phase;
  if(P_==='intro'){ startRound(s); s.ev++; return; }
  if(P_==='free'){ const F=s.free; if(!F){ beginTalk(s); s.ev++; return; } const left=F.end-Date.now();
    if(left<=0){ endFree(s); s.ev++; return; }
    if(F.wave===0&&left<F.dur*500){ F.wave=1; const more=alive(s).filter(i=>!isH(i)&&!busy(s,i)&&!F.jobs.some(J=>J.i===i&&J.st==='plan')); for(const i of U.shuffle(more).slice(0,2)) F.jobs.push({id:++F.jid,i,st:'plan'}); }
    for(const J of F.jobs.slice()) runJob(s,J);
    s.wait=500; s.ev++; return; }
  if(P_==='talk'){ const T=s.talk; if(!T){ s.talk={n:0,max:3,passes:0,next:null,spoke:{},cur:null}; s.ev++; return; }   /* 이어 하기 등으로 토론 정보가 비면 다시 시작(멈춤 방지) */
    if(T.n>=T.max||T.passes>=2){ endTalk(s); s.ev++; return; }
    if(T.cur==null) T.cur=pickSpeaker(s); const i=T.cur; if(i==null){ endTalk(s); s.ev++; return; }
    const hs=HSEAT.filter(h=>s.alive[h]).map(h=>`${h}=${nmS(s,h)}`).join(', ');
    const lc=s.leakCue&&s.leakCue.i===i?s.pacts.find(p=>p.id===s.leakCue.pid):null, lo=lc?(lc.a===i?lc.b:lc.a):null;
    const r=need(s,`${s.seq}:talk:${i}`,()=>ask(s,i,`${lc?`(입이 근질근질) 이번 발언에서 ${nmS(s,lo)}와 몰래 한 얘기(${pdesc(s,lc)})를 무심코 혹은 일부러 흘린다 — 네 성격대로. `:''}자유 토론 중이고 네 차례다. 할 말이 있을 때만 say에(특정인에게 하는 말이면 to에 그 자리 번호, 아니면 -1, 태도는 tone). 의심·반박·변명이면 근거를 붙인다. 넘기는 것(say "")도 자연스럽다. 방금 누가 너를 부르거나 물었다면 꼭 답한다. 사람 플레이어(${hs}) 중 한 명에게만 몰래 할 말이 있으면 dm에 그 말, dmTo에 그 사람 자리 번호. 없으면 dm은 "", dmTo는 -1.`,SCH.talk));
    if(r===undefined){ s.typing=i; return; }
    s.typing=null; s.seq++; T.cur=null; T.spoke[i]=(T.spoke[i]||0)+1; memo(s,i,r);
    if(lc){ s.leakCue=null; const said=String(r&&r.say||''); if(said.includes(per(s,lo).name||'@')||isH(lo)&&said.includes(nmS(s,lo))){ lc.leaked=true; relAdd(s,lo,i,-.6,'몰래 한 얘기를 흘림'); secretNote(s,`🗯️ (물밑) ${nmS(s,i)}이(가) ${nmS(s,lo)}와의 비밀을 흘렸다`); if(!isH(lo)) shift(s,lo,'😳','당황',{acting:-1},'몰래 한 얘기가 새어 나갔다'); } }
    const say=shortSay(r&&r.say);
    if(say){ const to=r.to>=0&&r.to<N&&r.to!==i&&s.alive[r.to]?r.to:null; talkPush(s,i,say,to,r.tone==='none'?'':r.tone); T.n++; T.passes=0; if(to!=null&&!isH(to)) T.next=to; s.wait=1300+say.length*45; }
    else { T.passes++; s.wait=250; }
    /* 동물 → 사람 귓속말: 동물이 고른 사람에게(전엔 늘 첫 사람 = 방장에게 감). 사람이 한 명뿐이면 그 사람 */
    const dm=clean(r&&r.dm); if(dm){ const live=HSEAT.filter(x=>s.alive[x]); const h=live.includes(r.dmTo)?r.dmTo:live.length===1?live[0]:null; if(h!=null) (s.dm[h+'-'+i]=s.dm[h+'-'+i]||[]).push({from:i,text:dm,r:s.round}); }
    s.ev++; return; }
  if(P_==='nominate'){ const i=s.rep; if(isH(i)) return; const L=legalExe(s,i);
    const r=need(s,`${s.seq}:nom`,()=>ask(s,i,`너는 이번 대표다. 집행자를 지목하라: target=자리 번호(가능: ${L.join(', ')}). [의심 점수] ${gSusLine(s,i)}. say는 고른 이유를 짧게, 또는 "".`,SCH.target));
    if(r===undefined){ s.typing=i; return; } s.typing=null; s.seq++; memo(s,i,r);
    doNominate(s,i,r&&L.includes(r.target)?r.target:geNom(s,i,L),shortSay(r&&r.say)); s.ev++; return; }
  if(P_==='vote'){ let pend=false;
    for(const i of alive(s).filter(i=>!isH(i)&&!s.votes[i])){
      const r=need(s,`${s.vtry}:vote:${i}`,()=>ask(s,i,`${voteBrief(s,i)}대표 ${nmS(s,s.rep)} → 집행자 ${nmS(s,s.exe)} 정부에 찬성(Y)/반대(N)? 찬성할 이유가 뚜렷하지 않으면 반대도 자연스럽다. why는 대부분 "". 남들과 다르게 찍을 것 같거나 꼭 할 말이 있을 때만 근거 한 줄(30자 안팎).`,SCH.vote));
      if(r===undefined){ pend=true; continue; } s.votes[i]=r&&(r.vote==='Y'||r.vote==='N')?r.vote:geVote(s,i); s.vwhy[i]=shortSay(r&&r.why,50); memo(s,i,r); }
    if(pend){ s.typing='vote'; return; } s.typing=null;
    if(alive(s).some(i=>isH(i)&&!s.votes[i])){ s.ev++; return; }
    s.phase='vreveal'; s.vq=alive(s).slice(); s.vshown=[]; s.notice='🗳️ 투표 공개'; s.wait=600; s.ev++; return; }
  if(P_==='vreveal'){ const i=s.vq.shift(); if(i==null){ tallyVotes(s); s.ev++; return; } s.vshown.push(i);
    if(s.vwhy[i]) s.chat.push({r:s.round,seat:i,text:`${s.votes[i]==='Y'?'⭕':'❌'} ${s.vwhy[i]}`,kind:s.votes[i]==='Y'?'yes':'no'});
    s.notice=`🗳️ ${nmS(s,i)}: ${s.votes[i]==='Y'?'⭕ 찬성':'❌ 반대'}`; s.wait=s.vwhy[i]?1100:650; s.ev++; return; }
  if(P_==='rdisc'){ const i=s.rep; if(isH(i)) return; const h=s.hand;
    const r=need(s,`${s.seq}:rd`,()=>ask(s,i,`너는 대표다. 뽑은 3장: ${h.map((c,k)=>`[${k}] ${CARD(c)}`).join(' ')}. 몰래 버릴 카드 번호를 discard에(0~2). 나머지 2장이 집행자 ${nmS(s,s.exe)}에게 간다.`,SCH.disc));
    if(r===undefined){ s.typing=i; return; } s.typing=null; s.seq++; memo(s,i,r);
    doRdisc(s,r&&[0,1,2].includes(r.discard)?r.discard:fbDisc(s,i,h)); s.ev++; return; }
  if(P_==='edisc'){ const i=s.exe; if(isH(i)) return; const h=s.hand;
    const r=need(s,`${s.seq}:ed`,()=>ask(s,i,`너는 집행자다. 대표 ${nmS(s,s.rep)}에게 받은 2장: ${h.map((c,k)=>`[${k}] ${CARD(c)}`).join(' ')}. 버릴 카드 번호를 discard에(0~1). 남은 1장이 적립된다.`,SCH.disc));
    if(r===undefined){ s.typing=i; return; } s.typing=null; s.seq++; memo(s,i,r);
    doEdisc(s,r&&[0,1].includes(r.discard)?r.discard:fbDisc(s,i,h)); s.ev++; return; }
  if(P_==='claimRep'||P_==='claimExe'){ const g=lastGov(s), rep=P_==='claimRep', i=rep?g.rep:g.exe; if(isH(i)) return;
    const real=pair(s.passed||[]);
    const card=g&&g.card, devT=isDev(s.role[i]);
    const ctx_=rep
      ? `적립된 카드는 ${CARD(card)}(모두 봤다). 너는 3장 ${(s.hand3||[]).map(CARD).join('·')}에서 1장을 버리고 "${CT[real]}"을(를) 넘겼다.`
      : `적립된 카드는 ${CARD(card)}(모두 봤다). 대표 ${nmS(s,g.rep)}는 "${CT[g.rc]||'?'}"을(를) 넘겼다고 이미 주장했다. 너는 "${CT[real]}"을(를) 받아 ${CARD(card)}을(를) 냈다.`;
    const tip=`사람들은 "받은 2장 주장 + 적립된 카드"로 네가 무엇을 버렸는지 추리한다. 말이 안 되는 주장(예: 선·선을 받았는데 악이 적립됐다)은 바로 들통난다. ${devT?'악마팀이고 악을 냈다면 보통은 상대 탓이 되게 거짓말한다(집행자면 "악·악 받았다", 대표면 "악·악을 넘겼다/선·악을 넘겼다"를 상황에 맞게). 들킬 위험·대표가 사람인지(사람은 진실을 안다)도 따져라.':'천사팀이면 보통 사실대로 말한다.'}`;
    const r=need(s,`${s.seq}:cl`,()=>ask(s,i,`${rep?'대표로서 집행자에게 넘긴 2장':'집행자로서 대표에게 받은 2장'}이 무엇이었는지 모두 앞에서 말하라. 실제: ${CT[real]}. ${ctx_} ${tip} claim에 GG(선·선)/GB(선·악)/BB(악·악) 중 하나. say는 대부분 ""(꼭 할 말 있을 때만 짧게, 네 주장과 맞게).`,SCH.claim));
    if(r===undefined){ s.typing=i; return; } s.typing=null; s.seq++; memo(s,i,r);
    doClaim(s,i,r&&CT[r.claim]?r.claim:geClaim(s,i,rep,real,card),shortSay(r&&r.say,70)); s.ev++; return; }
  if(P_==='kill'){ const i=s.rep; if(isH(i)) return; const L=alive(s).filter(j=>j!==i);
    const r=need(s,`${s.seq}:kill`,()=>ask(s,i,`악행 ${GL(s)-1}장째 — 대표인 네가 1명을 처형한다(정체가 공개됨, 루시퍼면 천사 승리). target=자리 번호(가능: ${L.join(', ')}). [의심 점수] ${gSusLine(s,i)}. say에 한마디.`,SCH.target));
    if(r===undefined){ s.typing=i; return; } s.typing=null; s.seq++; memo(s,i,r);
    doKill(s,i,r&&L.includes(r.target)?r.target:geKill(s,i,L),clean(r&&r.say)); s.ev++; return; }
  if(P_==='guess'){ const i=guesser(s); if(isH(i)) return; const L=ALL.filter(j=>!isDev(s.role[j]));
    const r=need(s,`${s.seq}:guess`,()=>ask(s,i,`선행 ${GL(s)}장 — 악마팀이 신을 맞히면 역전승. 신이라고 생각하는 사람의 자리 번호를 target에(악마팀 제외: ${L.join(', ')}). [코드 짐작 — 신은 악행마다 악마를 하나씩 알게 되니, 악마를 정확히 의심·반대해 온 천사가 신일 가능성↑] 1순위 ${nmS(s,godGuess(s))}. say에 한마디.`,SCH.target));
    if(r===undefined){ s.typing=i; return; } s.typing=null; s.seq++;
    doGuess(s,i,r&&L.includes(r.target)?r.target:(!geOld(s,i)&&L.includes(godGuess(s))?godGuess(s):U.pick(L)),clean(r&&r.say)); s.ev++; return; }
  if(P_==='confess'){ let pend=false; const res=s.wteam==='dev'?'악마팀 승리':'천사팀 승리';
    for(const i of npcs(s)){ if(s.confess[i]!=null) continue;
      const r=need(s,`conf:${i}`,()=>ask(s,i,`게임이 끝났다(${res}, ${s.endWhy}). 모든 정체가 공개됐다: ${ALL.map(j=>`${nmS(s,j)}=${RN[s.role[j]]}`).join(', ')}. 이번 판 너의 속마음(누구를 의심했고 왜 그렇게 행동했는지, 결정적 순간)을 솔직하게 2문장으로 고백하라. memo는 "".`,SCH.say));
      if(r===undefined){ pend=true; continue; } s.confess[i]=clean(r&&r.say)||'…수고하셨어요.'; }
    if(pend){ s.typing='confess'; return; } s.typing=null;
    s.phase='over'; s.winner=0; s.winners=HSEAT.filter(h=>isDev(s.role[h])===(s.wteam==='dev')).map(pOf); if(!s.winners.length&&HSEAT.length) s.winner=1; s.ev++; return; }
}

/* ───────── 사람의 동작 ───────── */
function apply(s,p,a){ syncH(s); if(s.winner!=null) return '게임이 끝났어요'; if(!a) return '알 수 없는 동작';
  const i=HSEAT[p], txt=v=>typeof v==='string'?v.replace(/[<>{}]/g,'').trim().slice(0,200):'', g=lastGov(s)||{};
  if(a.k==='chat'&&s.phase==='free'&&s.free){ if(!s.alive[i]) return '처형된 사람은 말할 수 없어요'; const t=txt(a.text); if(!t) return '할 말을 적어 주세요'; const F=s.free, pl=F.loc[i];
    const npc=here(s,pl).filter(j=>j!==i&&!isH(j)); const hum=here(s,pl).filter(j=>j!==i&&isH(j)); if(!npc.length&&!hum.length) return '여기엔 아무도 없어요 — 방으로 가거나 동물을 불러 보세요';
    roomLine(s,pl,i,t); const to=npc.find(j=>t.includes(per(s,j).name))??npc[0]; if(to!=null){ secretPush(s,i,to,t); F.jobs.push({id:++F.jid,i:to,h:i,pl,text:t,st:'hreply'}); } return null; }
  if(a.k==='go'){ if(s.phase!=='free'||!s.free) return '자유 시간에만 움직일 수 있어요'; if(!PLACES.some(q=>q.k===a.pl)) return '장소를 고르세요'; if(s.free.loc[i]===a.pl) return null; s.free.loc[i]=a.pl; delete s.free.look[i]; seenAdd(s,[i],a.pl); return null; }
  if(a.k==='call'){ if(s.phase!=='free'||!s.free) return '자유 시간에만 부를 수 있어요'; const t=a.t|0, F=s.free; if(isH(t)||!s.alive[t]) return '부를 동물을 고르세요'; if(busy(s,t)||F.loc[t]!=='lounge') return `${nmS(s,t)}은(는) 지금 다른 데서 이야기 중이에요`;
    if(relV(s,t,i)<-.3||Math.random()<.15) return `${nmS(s,t)}: 지금은 좀…`; const pl=F.loc[i]==='lounge'?(emptyRoom(s)||'lounge'):F.loc[i]; F.loc[i]=pl; F.loc[t]=pl; seenAdd(s,[i,t],pl);
    roomLine(s,pl,t,`(${nmS(s,t)}이(가) 따라왔다)`,true); F.jobs.push({id:++F.jid,i:t,to:i,h:i,pl,st:'human',until:Date.now()+30000}); return null; }
  if(a.k==='inv'){ const iv=s.free&&s.free.inv[i]; if(!iv) return '받은 초대가 없어요'; if(a.ok) iv.ok=1; else iv.no=1; return null; }
  if(a.k==='chat'){ if(!s.alive[i]) return '처형된 사람은 말할 수 없어요'; const t=txt(a.text); if(!t) return '할 말을 적어 주세요';
    const to=npcs(s).find(j=>s.alive[j]&&t.includes(per(s,j).name));
    const tone=to==null?'':/수상|의심|거짓|악마|찍|이상해|쎄|루시퍼/.test(t)?'acc':/믿|편이|아닌 것 같|맞아요|괜찮/.test(t)?'trust':/[?？]\s*$/.test(t)?'ask':'';
    talkPush(s,i,t,to??null,tone);
    if(s.phase==='talk'){ const T=s.talk; T.max=Math.min(T.max+2,16); T.passes=0; if(to!=null) T.next=to; } return null; }
  if(a.k==='endTalk'){ if(s.phase!=='talk') return '지금은 토론 중이 아니에요'; if(s.talk.n>=s.talk.max) return '곧 지목으로 넘어가요'; s.talk.max=s.talk.n; return null; }   // 연타해도 진행 예약이 계속 밀리지 않게
  if(a.k==='dm'){ const t=a.t|0; if(isH(t)||!s.alive[t]) return '귓속말할 동물을 고르세요'; if(!s.alive[i]) return '처형된 사람은 못 해요'; const m=txt(a.text); if(!m) return '귓속말을 적어 주세요';
    (s.dm[i+'-'+t]=s.dm[i+'-'+t]||[]).push({from:i,text:m,r:s.round}); s.dmq.push({h:i,t,id:++s.dmN}); return null; }
  if(a.k==='offer'){ for(const k in s.dm){ const [h,j]=k.split('-').map(Number); if(h!==i) continue; const m=s.dm[k].find(x=>x.offer&&x.offer.id===a.id); if(!m) continue;
      if(m.offer.st!=='wait') return '이미 답했어요'; if(!s.alive[j]) return '그 동물은 처형됐어요'; m.offer.st=a.ok?'ok':'no'; s.dm[k].push({from:i,text:a.ok?'🤝 좋아요, 그렇게 해요.':'🙅 그건 못 하겠어요.',r:s.round});
      if(a.ok) makePact(s,j,i,m.offer.kind,m.offer.x); else relAdd(s,j,i,-.1,'몰래 한 제안을 거절'); return null; } return '제안을 못 찾았어요'; }
  if(a.k==='nom'){ if(s.phase!=='nominate'||s.rep!==i) return '지금은 지목할 때가 아니에요'; const t=a.t|0; if(!legalExe(s,i).includes(t)) return '살아 있는 다른 사람을 고르세요 (직전 집행자는 연속 불가)'; doNominate(s,i,t,txt(a.say)); return null; }
  if(a.k==='vote'){ if(s.phase!=='vote') return '지금은 투표 시간이 아니에요'; if(!s.alive[i]) return '처형된 사람은 투표 못 해요'; if(s.votes[i]) return '이미 투표했어요'; if(a.v!=='Y'&&a.v!=='N') return '찬성 또는 반대'; s.votes[i]=a.v; s.vwhy[i]=txt(a.say).slice(0,60); return null; }
  if(a.k==='disc'){ const k=a.c|0;
    if(s.phase==='rdisc'&&s.rep===i){ if(!(k>=0&&k<3)) return '버릴 카드를 고르세요'; doRdisc(s,k); return null; }
    if(s.phase==='edisc'&&s.exe===i){ if(!(k>=0&&k<2)) return '버릴 카드를 고르세요'; doEdisc(s,k); return null; }
    return '지금은 카드를 버릴 차례가 아니에요'; }
  if(a.k==='claim'){ const me=s.phase==='claimRep'?g.rep:s.phase==='claimExe'?g.exe:null; if(me!==i) return '지금은 말할 차례가 아니에요'; if(!CT[a.c]) return '주장을 고르세요'; doClaim(s,i,a.c,txt(a.say)); return null; }
  if(a.k==='kill'){ if(s.phase!=='kill'||s.rep!==i) return '처형할 차례가 아니에요'; const t=a.t|0; if(!s.alive[t]||t===i) return '살아 있는 다른 사람을 고르세요'; doKill(s,i,t,txt(a.say)); return null; }
  if(a.k==='guess'){ if(s.phase!=='guess'||guesser(s)!==i) return '지목할 차례가 아니에요'; const t=a.t|0; if(t===i||!(t>=0&&t<N)) return '사람을 고르세요'; doGuess(s,i,t,txt(a.say)); return null; }
  return '알 수 없는 동작'; }

/* 그 사람에게 보이는 것만 */
function know(s,me){ const r=s.role[me], k={}; k[me]=1;
  if(isDev(r)) devs(s).forEach(j=>k[j]=1);
  if(r==='arch') { const g=ALL.find(j=>s.role[j]==='god'); k[g]=1; }
  if(r==='god') s.godKnow.forEach(j=>k[j]=1);
  return k; }
function mask(s,p){ syncH(s); if(!HSEAT.length){ const v=U.clone(s); v.air={}; v.dn=s.deck.length; delete v.deck; return v; }   // 🍿 관전: 다 보임
  const me=HSEAT[p], v=U.clone(s), open=['confess','over'].includes(s.phase), K=know(s,me);
  v.role=s.role.map((r,j)=>open||K[j]||!s.alive[j]?r:null);
  v.roomArch=(s.roomArch||[]).filter(l=>l.heard.includes(me));
  if(s.free){ v.free=U.clone(s.free); v.free.lines=s.free.lines.filter(l=>l.heard.includes(me)); v.free.inv=s.free.inv[me]?{[me]:s.free.inv[me]}:{}; v.free.jobs=[]; }
  if(!open){ v.chat=s.chat.filter(c=>!c.secret); v.pacts=s.pacts.filter(q=>q.a===me||q.b===me); v.bdm=[]; v.rel={}; v.leakQ=[]; v.leakCue=null; }
  v.memo=open?s.memo:{}; v.sense={}; v.react=[]; v.air={}; v.dn=s.deck.length; delete v.deck; delete v.disc; delete v.passed;
  v.hand=(s.phase==='rdisc'&&s.rep===me)||(s.phase==='edisc'&&s.exe===me)?s.hand:null; delete v.hand3;
  v.seen={[me]:s.seen[me]||[]}; v.godKnow=s.role[me]==='god'||open?s.godKnow:[];
  const dm={}; for(const k in s.dm) if(+k.split('-')[0]===me) dm[k]=s.dm[k]; v.dm=dm; v.dmq=s.dmq.filter(q=>q.h===me); v.typingDm=s.typingDm&&s.typingDm[0]===me?s.typingDm:[];
  if(['vote','vreveal'].includes(s.phase)) v.votes=s.votes.map((x,j)=>j===me||(s.vshown||[]).includes(j)?x:(x?'?':null));
  return v; }

/* ───────── 화면 ─────────
   입력창은 한 번 만든 뼈대에 그대로 두고 나머지만 다시 그림 — AI 답이 올 때마다 다시 그려도 치던 글(한글 조합 포함)이 안 날아가게 */
let sel=null, dmTo=null, CV=null, CC=null, dmSeen={}, chatMode='table';
const seatEmoji=(v,i)=> isH(i) ? U.ava(pOf(i)) : (per(v,i).emo||'🙂');
const seatName=(v,i,ctx)=> isH(i) ? `${U.esc(ctx.name(pOf(i)))}${pOf(i)===ctx.me?'(나)':''}` : U.esc(per(v,i).name||'?');
function render(el,v,ctx){ syncH(v); CV=v; CC=ctx; const W=!HSEAT.length, me=W?-1:HSEAT[ctx.me];   // W: 🍿 관전
  if(window.AIB&&typeof mode!=='undefined'&&(mode==='solo'||mode==='host')) AIB.start();   // 이때부터 다리를 찾음(손님·첫 화면에선 안 찾아 크롬 권한 창이 안 뜸)
  if(!el.querySelector('[data-ga]')){
    el.innerHTML=`<div class="side3 has-chat" data-ga><div class="side-mid"><div id="gaBoard"></div><div id="gaAct"></div><div class="ga-chatwrap"><div id="gaChatList"></div><div class="ga-talk" id="gaTalk"><small id="gaTalkHint"></small><div style="display:flex;gap:6px;margin-top:6px"><input id="gaChat" maxlength="200" autocomplete="off" placeholder="아무 말이나 — 이름을 부르면 그 동물이 대답해요" style="flex:1;min-width:0"><button data-x="send">보내기</button></div><div class="fh-act" style="margin-top:6px"><button class="ghost" data-x="endTalk" id="gaEnd">▶ 토론 마치기</button></div></div></div></div>
      <aside class="side-l"><div id="gaUse"></div><div id="gaCard"></div><div id="gaPol"></div><div id="gaInfo"></div></aside>
      <aside class="side-r"><div class="side-box ga-dm" id="gaDmBox"><div class="side-h">🤫 귓속말 <small>나와 고른 동물만 봐요</small></div><div class="dm-tabs" id="gaDmTabs"></div><div class="dm-thread" id="gaDmList"></div><div class="dm-send"><input id="gaDm" maxlength="200" autocomplete="off" placeholder="몰래 할 말"><button data-x="dm">보내기</button></div></div></aside></div>`;
    el.onclick=onClick; el.onkeydown=e=>{ if(e.key!=='Enter'||e.isComposing) return; if(e.target.id==='gaChat') send(); if(e.target.id==='gaDm') sendDm(); }; }
  const NM=i=>`${seatEmoji(v,i)} ${seatName(v,i,ctx)}`, myRole=v.role[me], g=v.govs[v.govs.length-1]||{};
  const aiOff=!(window.AIB&&AIB.on());
  /* 판 */
  let h=`<div class="hl-notice">${U.esc(v.notice||'')}</div>`;
  if(v.free) h+=freeHTML(v,ctx,me,W,NM);
  if(aiOff&&ctx.mode!=='guest'&&AIB.hold()) h+=`<div class="info" style="background:#eef6ff">🤖 AI 중계 서버를 찾는 중… 크롬이 <b>“이 기기의 다른 앱 및 서비스에 접근”</b>을 물으면 <b>허용</b>해 주세요.</div>`;
  else if(aiOff&&ctx.mode!=='guest') h+=`<div class="info" style="background:#fff3d6">🤖 AI 다리가 꺼져 있어요 — 이 컴퓨터 터미널에서 <code>node local/ai-bridge.js</code>를 켜면 동물들이 직접 생각하고 말해요. 지금은 단순 규칙으로 진행돼요.</div>`;
  if(W) h+=`<div class="info">🍿 관전 중 — 모든 정체가 보여요. 동물을 누르면 능력치·지금 상태, 판이 끝나면 속마음.</div>`; else h+=`<div class="info">내 정체: <b>${RN[myRole]||'?'}</b> · ${isDev(myRole)?'😈 악마팀':'😇 천사팀'}${isDev(myRole)?` · 동료: ${devs(v).filter(j=>j!==me).map(NM).join(', ')}`:''}${myRole==='arch'?` · 신은 ${NM(v.role.indexOf('god'))}`:''}${myRole==='god'?` · 알고 있는 악마: ${v.godKnow.length?v.godKnow.map(NM).join(', '):'아직 없음'}`:''}</div>`;
  h+=`<div class="ge-track"><div class="g">😇 선행 ${[...Array(GL(v))].map((_,k)=>`<i class="${k<v.good?'on':''}"></i>`).join('')}</div><div class="b">😈 악행 ${[...Array(GL(v))].map((_,k)=>`<i class="${k<v.bad?'on':''} ${k===GL(v)-2?'kill':''}"></i>`).join('')}</div><small>부결 ${v.fails}/3 · 더미 ${v.dn}장</small></div>`;
  const pick=(v.phase==='nominate'&&v.rep===me)||(v.phase==='kill'&&v.rep===me)||(v.phase==='guess'&&guesser(v)===me);
  h+=`<div class="ev-seats">${ALL.map(i=>{ const r=v.role[i], typing=v.typing===i;
    const vt=v.votes&&v.votes[i]; const vm=vt==='Y'?'⭕':vt==='N'?'❌':vt==='?'?'🗳️':'';
    return `<button class="ev-seat ${i===me?'me':''} ${sel===i?'sel':''} ${!v.alive[i]?'dead':''} ${typing?'speak':''}" data-t="${i}" ${i===me?'disabled':''}>${typing?'<span class="kg-mood pop">💭</span>':''}
      <div class="ev-nm">${NM(i)}</div>${isH(i)?'':`<small class="ev-arch">${U.esc(per(v,i).style||per(v,i).arch||'')}${v.cond&&v.cond[i]&&v.cond[i].mood!=='😐'?` · ${v.cond[i].mood}${U.esc(v.cond[i].moodT)}`:''}</small>`}
      <div class="ev-prof">${r?RN[r]:'❔'}${!v.alive[i]?' ☠️':''}</div>
      <div class="ev-mind">${v.rep===i?'🎙️대표 ':''}${v.exe===i?'⚖️집행자 ':''}${vm}</div></button>`; }).join('')}</div>`;
  const prevTok={}; for(const e of el.querySelectorAll('#gaBoard [data-tok]')) prevTok[e.dataset.tok]=e.getBoundingClientRect();
  $q('#gaBoard').innerHTML=h;
  if(v.free){ walkToks(el,prevTok); freeSfx(v,ctx,me,W); } else FS.key=null;
  /* 내 차례 동작 */
  let a='';
  const selTxt=sel!=null?NM(sel):'위에서 사람을 누르세요';
  if(v.phase==='nominate'&&v.rep===me) a=`<div class="vr-card"><b>🎙️ 집행자를 지목하세요</b> <small>${selTxt} · 직전 집행자는 연속 불가 · 말하기 칸에 쓴 말이 함께 나가요</small><div class="fh-act"><button data-a="nom" ${sel!=null?'':'disabled'}>지목</button></div></div>`;
  if(v.phase==='vote'&&v.alive[me]&&!v.votes[me]) a=`<div class="vr-card"><b>🗳️ ${NM(v.rep)} · ${NM(v.exe)} 정부, 찬성?</b> <small>말하기 칸에 쓴 말이 이유로 함께 공개돼요</small><div class="fh-act"><button data-v="Y">⭕ 찬성</button><button data-v="N" style="background:#b8412f">❌ 반대</button></div></div>`;
  if(v.hand&&((v.phase==='rdisc'&&v.rep===me)||(v.phase==='edisc'&&v.exe===me))) a=`<div class="vr-card"><b>🃏 ${v.phase==='rdisc'?'대표: 3장 중 버릴 1장':'집행자: 2장 중 버릴 1장 (남은 1장이 적립돼요)'}</b><div class="ge-hand">${v.hand.map((c,k)=>`<button class="ge-card ${c==='G'?'g':'b'}" data-c="${k}">${c==='G'?'😇 선행':'😈 악행'}</button>`).join('')}</div><small>누른 카드를 버려요</small></div>`;
  if((v.phase==='claimRep'&&g.rep===me)||(v.phase==='claimExe'&&g.exe===me)) a=`<div class="vr-card"><b>📣 ${v.phase==='claimRep'?'집행자에게 넘긴 2장은?':'대표에게 받은 2장은?'}</b> <small>거짓말도 가능 · 말하기 칸에 쓴 말이 함께 나가요</small><div class="fh-act">${[['GG','😇😇 선·선'],['GB','😇😈 선·악'],['BB','😈😈 악·악']].map(([c,t])=>`<button class="ghost" data-cl="${c}">${t}</button>`).join('')}</div></div>`;
  if(v.phase==='kill'&&v.rep===me) a=`<div class="vr-card"><b>⚔️ 처형할 1명</b> <small>${selTxt} · 루시퍼를 처형하면 천사 승리</small><div class="fh-act"><button data-a="kill" ${sel!=null?'':'disabled'}>처형</button></div></div>`;
  if(v.phase==='guess'&&guesser(v)===me) a=`<div class="vr-card"><b>🎯 신은 누구?</b> <small>${selTxt} · 맞히면 악마팀 역전승</small><div class="fh-act"><button data-a="guess" ${sel!=null?'':'disabled'}>지목</button></div></div>`;
  if(['confess','over'].includes(v.phase)) a=`<div class="vr-card"><b>🏁 ${v.wteam==='dev'?'😈 악마팀':'😇 천사팀'} 승리</b> <small>${U.esc(v.endWhy||'')}</small>${awardsHTML(v,NM)}${npcs(v).map(i=>`<div style="margin-top:8px"><b>${NM(i)}</b> <small>${RN[v.role[i]]}</small><div>💬 ${v.confess[i]!=null?U.esc(v.confess[i]):'<i>💭 고백 정리하는 중…</i>'}</div>${v.memo[i]?`<small style="opacity:.75">📝 마지막 속마음 메모: ${U.esc(v.memo[i])}</small>`:''}</div>`).join('')}</div>`;
  $q('#gaAct').innerHTML=a;
  const canTalk=!W&&v.alive[me]&&!['confess','over'].includes(v.phase);
  $q('#gaTalk').hidden=!canTalk; $q('#gaEnd').hidden=v.phase!=='talk';
  { const pl=v.phase==='free'&&v.free&&!W?v.free.loc[me]:null, ci=$q('#gaChat'); if(ci) ci.placeholder=pl?`${PN(pl)}에 있는 사람에게만 들려요 — 이름을 부르면 대답해요`:'아무 말이나 — 이름을 부르면 그 동물이 대답해요'; }
  $q('#gaTalkHint').textContent=v.phase==='free'?`⏱️ 자유 시간 — ${v.free&&!W?PN(v.free.loc[me]):''} 안에서만 들려요`:v.phase==='talk'?'자유 토론 중 — 언제든 끼어들 수 있어요':'토론 밖에서도 말할 수 있어요 (다음 토론 때 다들 봐요)';
  /* 왼쪽: 🤖 AI 사용량 — 방장(혼자 모드 포함)에게만. 한도는 계정 전체 기준(다른 Claude Code 사용 포함) */
  $q('#gaUse').innerHTML=ctx.mode==='guest'||!window.AIB?'':useHTML(AIB.usage());
  /* 왼쪽: 🐾 캐릭터 카드(누른 자리) · 🕸️ 관계도 */
  $q('#gaCard').innerHTML=cardHTML(v,ctx,me);
  { const PP=(v.pacts||[]); const own=W?[]:PP.filter(q=>q.a===me||q.b===me).map(q=>[q.a,q.b,q.st==='broken']);
    const notes=W?PP.map(q=>`${q.st==='broken'?'💔':'🤝'} ${seatEmoji(v,q.a)}${U.esc(per(v,q.a).name||'')}·${seatEmoji(v,q.b)}${U.esc(per(v,q.b).name||'')} — ${U.esc(pdesc(v,q))}${q.st==='broken'?` (깸: ${U.esc(nmS(v,q.by))})`:''}`):[];
    $q('#gaPol').innerHTML=U.politics(v.chat.filter(c=>!c.secret),{seats:ALL,emo:i=>seatEmoji(v,i),name:i=>seatName(v,i,ctx),me,alive:i=>v.alive[i],pacts:own,notes}); }
  /* 왼쪽: 정부 기록 */
  $q('#gaInfo').innerHTML=`<div class="side-box"><div class="side-h">🏛️ 정부 기록</div>${v.govs.slice().reverse().map(x=>x.auto?`<div class="side-row"><small>${x.r}R</small> 자동 적립 ${x.card==='G'?'😇':'😈'}</div>`:`<div class="side-row" style="flex-wrap:wrap"><small>${x.r}R</small> ${NM(x.rep)} → ${NM(x.exe)} ${x.fail?'❌ 부결':(x.card==='G'?'😇':'😈')}${x.fail?'':` <small>대표 "${CT[x.rc]||'…'}" · 집행 "${CT[x.ec]||'…'}"${x.rc&&x.ec&&x.rc!==x.ec?' ⚠️':''}</small>`}</div>`).join('')||'<div class="side-row"><small>아직 없음</small></div>'}</div>`;
  /* 귓속말 */
  $q('#gaDmBox').hidden=W;   // 관전엔 귓속말 칸 없음
  const anim=npcs(v).filter(j=>v.alive[j]||(v.dm[me+'-'+j]||[]).length); if(dmTo==null||!anim.includes(dmTo)) dmTo=anim.find(j=>v.alive[j])??null;
  const thr=j=>v.dm[me+'-'+j]||[], inc=j=>thr(j).filter(x=>x.from!==me).length;
  if(dmTo!=null) dmSeen[dmTo+':'+v.who[dmTo]]=inc(dmTo);   // 지금 보고 있는 대화는 읽음
  const unread=j=>Math.max(0,inc(j)-(dmSeen[j+':'+v.who[j]]||0));
  { const n=anim.reduce((a,j)=>a+inc(j),0), bx=$q('#gaDmBox'); if(bx){ if(bx._n!=null&&n>bx._n){ bx.classList.remove('ga-dm-new'); void bx.offsetWidth; bx.classList.add('ga-dm-new'); } bx._n=n; } }
  $q('#gaDmTabs').innerHTML=anim.map(j=>{ const u=unread(j), ty=v.typingDm[1]===j; return `<button class="dm-tab ${j===dmTo?'on':''} ${v.alive[j]?'':'dead'}" data-dmto="${j}" title="${U.esc(per(v,j).name)}에게 귓속말">${per(v,j).emo}<span>${U.esc(per(v,j).name)}</span>${u?`<i class="dm-badge">${u}</i>`:ty?'<i class="dm-dots">…</i>':''}</button>`; }).join('');
  { const list=$q('#gaDmList'), d=dmTo==null?[]:thr(dmTo), atEnd=list.scrollHeight-list.scrollTop-list.clientHeight<40;
    list.innerHTML = dmTo==null ? '<div class="dm-empty">귓속말할 동물이 없어요</div>'
      : (d.length? d.map(x=>{ const mine=x.from===me, sys=x.from===-1;
          const off=x.offer&&x.offer.st==='wait'&&!mine?`<div class="dm-offer"><button class="small" data-offer="${x.offer.id}" data-ok="1">🤝 받기</button><button class="small ghost" data-offer="${x.offer.id}" data-ok="0">🙅 거절</button></div>`:x.offer&&x.offer.st!=='wait'?`<div class="dm-offer-done">${x.offer.st==='ok'?'🤝 받음':'🙅 거절함'}</div>`:'';
          return sys?`<div class="dm-sys">📢 ${U.esc(x.text)}</div>`:`<div class="dm-msg ${mine?'mine':''}"><div class="dm-b">${U.esc(x.text)}${off}</div><small>${x.r?x.r+'R':''}</small></div>`; }).join('')
        : `<div class="dm-empty">${per(v,dmTo).emo} ${U.esc(per(v,dmTo).name)}와(과) 나눈 귓속말이 아직 없어요.<br>몰래 떠보거나 약속을 제안해 보세요.</div>`)
      + (dmTo!=null&&v.typingDm[1]===dmTo?`<div class="dm-msg"><div class="dm-b dm-typing">💭 답장 쓰는 중…</div></div>`:'');
    if(atEnd||list._to!==dmTo) list.scrollTop=list.scrollHeight; list._to=dmTo; }
  { const inp=$q('#gaDm'); if(inp) inp.placeholder = dmTo==null?'몰래 할 말':`${per(v,dmTo).emo} ${per(v,dmTo).name}에게 몰래…`; if(inp) inp.disabled=dmTo==null||!v.alive[dmTo]; }
  /* 오른쪽: 대화 */
  /* U.chat이 제목·스크롤 칸까지 만듦 — 읽던 위치를 지키고, 맨 아래를 보고 있었으면 새 말로 내려감 */
  const box=$q('#gaChatList'), old=box.querySelector('.chat-scroll'), atEnd=!old||old.scrollHeight-old.scrollTop-old.clientHeight<60, top=old?old.scrollTop:0;
  const typ=v.typing==='vote'?'🗳️ 다들 투표를 고민하고 있어요…':v.typing==='confess'?'💭 다들 속마음을 정리하고 있어요…':v.typing!=null&&v.typing>=0?`💭 ${per(v,v.typing).emo||''} ${U.esc(per(v,v.typing).name||'')} 생각 중…`:'';
  const last=v.chat.length?v.chat[v.chat.length-1].r:v.round;
  const CO={emo:i=>seatEmoji(v,i),name:i=>seatName(v,i,ctx),me}, inFree=v.phase==='free'&&v.free&&!W, myPl=inFree?v.free.loc[me]:null, arch=v.roomArch||[];
  const toItem=(l,r)=>l.sys?{r,note:1,text:l.text}:{r,seat:l.seat,text:l.text,kind:'room'};
  if(chatMode==='room'&&!arch.length) chatMode='table';
  let ch;
  if(inFree){ const with_=Object.keys(v.free.loc).map(Number).filter(j=>j!==me&&v.free.loc[j]===myPl&&v.alive[j]);
    ch=U.chat((v.free.lines||[]).map(l=>toItem(l,l.pl)),Object.assign({},CO,{roundName:k=>PN(k)+(k===myPl?' · 지금 여기':''),
      title:`${PN(myPl)} — ${with_.length?with_.map(NM).join(' · ')+'와(과) 나만 들려요':'나 혼자 있어요'}`})); }
  else { const tabs=`<div class="ga-ctabs"><button class="${chatMode!=='room'?'on':''}" data-cmode="table">💬 테이블 대화</button><button class="${chatMode==='room'?'on':''}" data-cmode="room" ${arch.length?'':'disabled'}>🚪 밀실 기록${arch.length?` <i>${arch.length}</i>`:''}</button></div>`;
    ch=tabs+(chatMode==='room'
      ? U.chat(arch.map(l=>toItem(l,`${l.r}라운드 · ${PN(l.pl)}`)),Object.assign({},CO,{roundName:k=>k,title:'🚪 밀실 기록 — 내가 들은 몰래 대화'}))
      : U.chat(v.chat.concat(typ?[{note:1,r:last,text:typ}]:[]),CO)); }
  box.innerHTML=ch; box.parentNode.classList.toggle('in-room',!!(inFree&&myPl!=='lounge')); box.parentNode.classList.toggle('in-free',!!inFree); { const g3=el.querySelector('[data-ga]'); if(g3) g3.classList.toggle('ga-free',!!inFree); }   /* 자유 시간엔 자리 카드를 접어 지도 바로 아래 방 대화 */
  const sc=box.querySelector('.chat-scroll'); if(sc) sc.scrollTop=atEnd?sc.scrollHeight:top;
  function $q(x){ return el.querySelector(x); }
}
function useHTML(u){ const s=u.sess, b=u.bridge, L=b&&b.limits, k=n=>n>=1e4?(n/1e3).toFixed(0)+'k':n>=1e3?(n/1e3).toFixed(1)+'k':String(n);
  const when=t=>{ if(!t) return ''; const d=new Date(t*1000), now=new Date(); return d.toDateString()===now.toDateString()?`${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`:`${d.getMonth()+1}/${d.getDate()} ${d.getHours()}시`; };
  const bar=(nm,w)=>w?`<div class="side-row"><small>${nm}</small> <b>${Math.round(w.utilization*100)}%</b> <small>사용 · ${when(w.resetsAt)} 리셋</small></div>`:'';
  return `<div class="side-box"><div class="side-h">🤖 AI 사용량 <small>방장만 보여요</small></div>`
   +`<div class="side-row"><small>이번 판</small> 호출 ${s.calls}번${s.fails?` (실패 ${s.fails})`:''} · 토큰 입력 ${k(s.input)} / 출력 ${k(s.output)}</div>`
   +`<div class="side-row"><small>API로 쳤다면</small> 약 $${s.costUSD.toFixed(3)} <small>(구독이라 실제 청구 아님)</small></div>`
   +(L?bar('5시간 한도',L.five_hour)+bar('주간 한도',L.seven_day)+`<div class="side-row"><small>한도는 이 계정의 Claude 사용 전체 기준</small></div>`:`<div class="side-row"><small>${b?'한도 정보는 첫 응답 뒤에 보여요':'AI 다리가 꺼져 있어요'}</small></div>`)
   +(b?`<div class="side-row"><small>모델 ${U.esc(b.model||'')} · 다리 켠 뒤 전체 ${b.calls}번 · $${(b.costUSD||0).toFixed(3)}</small></div>`:'')+`</div>`; }
/* 🏅 시상 — 판 끝에 (배신왕·의리상·명탐정·명연기) */
function awardsHTML(v,NM){ const A=[], cnt=(f)=>{ const o={}; f(o); return Object.entries(o).sort((a,b)=>b[1]-a[1])[0]; };
  const b=cnt(o=>{ for(const k in (v.betrayN||{})) o[k]=v.betrayN[k]; }); if(b&&b[1]>0) A.push(`💔 배신왕 ${NM(+b[0])} (약속 ${b[1]}번 깸)`);
  const k=cnt(o=>{ for(const q of (v.pacts||[])) if(q.st==='on'&&q.kept) for(const j of [q.a,q.b]) o[j]=(o[j]||0)+q.kept; }); if(k&&k[1]>0) A.push(`🤝 의리상 ${NM(+k[0])} (약속을 ${k[1]}번 지킴)`);
  const d=cnt(o=>{ for(const c of v.chat) if(c.kind==='acc'&&c.t!=null&&isDev(v.role[c.t])&&!isDev(v.role[c.seat])) o[c.seat]=(o[c.seat]||0)+1; }); if(d&&d[1]>0) A.push(`🔎 명탐정 ${NM(+d[0])} (악마를 ${d[1]}번 짚음)`);
  const dv=devs(v).map(j=>[j,v.chat.filter(c=>c.kind==='acc'&&c.t===j).length]).sort((a,b)=>a[1]-b[1])[0]; if(dv) A.push(`🎭 명연기 ${NM(dv[0])} (악마인데 지목 ${dv[1]}번뿐)`);
  return A.length?`<div style="margin-top:6px">${A.map(x=>`<div class="side-row">${x}</div>`).join('')}</div>`:''; }
/* ⏱️ 자유 시간 지도 — 타이머·장소(누가 어디)·내 방 대화·초대·부르기·목격 */
/* 🚶 FLIP — 화면을 통째로 다시 그려도 말이 옛 자리에서 새 자리로 걸어가 보이게. rAF 대신 강제 reflow(offsetWidth) — 탭이 가려져 프레임이 멈추면 말이 옛 자리에 박혀 있었음 */
function walkToks(el,prev){ for(const e of el.querySelectorAll('#gaBoard [data-tok]')){ const a=prev[e.dataset.tok]; if(!a) continue; const b=e.getBoundingClientRect(), dx=a.left-b.left, dy=a.top-b.top; if(Math.abs(dx)<2&&Math.abs(dy)<2) continue;
  e.style.transition='none'; e.style.transform=`translate(${dx}px,${dy}px)`; e.classList.add('walk'); void e.offsetWidth; e.style.transition='transform .7s ease-in-out'; e.style.transform=''; setTimeout(()=>e.classList.remove('walk'),750); } }
/* 🔊 자유 시간 소리 — 누가 방으로 들어가면 문 소리, 혼자 움직이면 발소리, 내 방에 새 말·초대, 마지막 10초 째깍 */
const FS={key:null};
function freeSfx(v,ctx,me,W){ const F=v.free; if(!ctx.sfx) return; const left=Math.max(0,Math.ceil((F.end-Date.now())/1000)), lastLine=(F.lines||[]).filter(l=>W||l.pl===F.loc[me]).slice(-1)[0];
  const cur={seen:(F.seen||[]).length,line:lastLine?lastLine.id:0,inv:!W&&F.inv&&F.inv[me]?F.inv[me].jid:0,left};
  if(FS.key!==F.end){ FS.key=F.end; Object.assign(FS,cur); ctx.sfx('door'); return; }
  let k=null; if(cur.inv&&cur.inv!==FS.inv) k='host'; else if(cur.seen>FS.seen) k=/·/.test(F.seen[F.seen.length-1].text)?'door':'step'; else if(cur.line>FS.line&&lastLine&&lastLine.seat!==me) k='emo'; else if(left<=10&&left>0&&left!==FS.left) k='tick';
  Object.assign(FS,cur); if(k) ctx.sfx(k); }
function freeHTML(v,ctx,me,W,NM){ const F=v.free, left=Math.max(0,Math.ceil((F.end-Date.now())/1000)), pct=Math.max(0,Math.min(100,left/F.dur*100)), myPl=W?null:F.loc[me];
  const occ=pl=>Object.keys(F.loc).map(Number).filter(j=>F.loc[j]===pl&&v.alive[j]);
  let h=`<div class="vr-card"><b class="${left<=10?'fr-hurry':''}">⏱️ 자유 시간 ${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}</b>${left<=15&&left>0?' <b style="color:#c0392b">곧 끝나요!</b>':''} <small>${W?'모든 방의 대화가 보여요':'장소를 누르면 이동 · 같은 방에 있어야 대화가 들려요'}</small>`
   +`<div style="height:6px;background:rgba(0,0,0,.08);border-radius:3px;margin:6px 0"><div style="height:6px;width:${pct}%;background:${left<=15?'#c0392b':'#7b5cd6'};border-radius:3px;transition:width .5s linear"></div></div>`
   +`<div class="fr-map">${['a','b','c','lounge'].map(k=>{ const P=PLACES.find(q=>q.k===k), o=occ(k), mine=myPl===k, talk=o.length>=2&&k!=='lounge';
     return `<button class="fr-room ${k==='lounge'?'lounge':''} ${mine?'mine':''} ${talk?'talk':''}" data-go="${k}" ${W||mine?'disabled':''}><div class="fr-nm">${P.n}${mine?' · 나':''}${talk&&!mine&&!W?' <small>🤫 대화 중…</small>':''}</div>`
      +`<div class="fr-toks">${o.map(j=>`<span class="fr-tok ${j===me?'me':''}" data-tok="${j}" title="${seatName(v,j,ctx)}">${F.look&&F.look[j]&&k!=='lounge'?`<i class="fr-look">${F.look[j]}</i>`:''}<b>${seatEmoji(v,j)}</b><small>${isH(j)?seatName(v,j,ctx):U.esc(per(v,j).name||'')}</small></span>`).join('')||'<small class="fr-empty">비어 있음</small>'}</div></button>`; }).join('')}</div>`;
  const iv=!W&&F.inv&&F.inv[me]; if(iv) h+=`<div class="info" style="margin-top:6px">📩 ${NM(iv.from)}이(가) ${PN(iv.pl)}로 불러요 <span class="fh-act"><button data-inv="1">가기</button><button class="ghost" data-inv="0">무시</button></span></div>`;
  if(!W&&v.alive[me]){ const idle=occ('lounge').filter(j=>!isH(j)&&j!==me); if(idle.length) h+=`<div class="fh-act" style="margin-top:6px;flex-wrap:wrap"><small>📣 라운지에서 불러오기</small>${idle.map(j=>`<button class="small ghost" data-call="${j}">${seatEmoji(v,j)} ${U.esc(per(v,j).name||'')}</button>`).join('')}</div>`; }
  const lines=W?(F.lines||[]).slice(-8):[];
  if(lines.length) h+=`<div style="margin-top:6px">${lines.map(l=>`<div class="side-row" style="flex-wrap:wrap">${W?`<small>${PN(l.pl)}</small> `:''}${l.sys?`<i>${U.esc(l.text)}</i>`:`<b>${NM(l.seat)}</b> ${U.esc(l.text)}`}</div>`).join('')}</div>`;
  else if(!W&&!(F.lines||[]).some(l=>l.pl===myPl)) h+=`<div class="side-row" style="margin-top:6px"><small>${occ(myPl).length>1?'조용하네요 — 말을 걸어 보세요':'여기엔 아무도 없어요 — 동물을 불러오거나 다른 곳으로 가 보세요'}</small></div>`;
  { const mt=meetText(v,F); if(mt) h+=`<div style="margin-top:6px"><small>👀 지금까지 만남: ${U.esc(mt)}</small></div>`; }
  return h+`</div>`; }
function cardHTML(v,ctx,me){ const i=sel!=null&&!isH(sel)?sel:null;
  if(i==null) return `<div class="side-box"><div class="side-h">🐾 캐릭터 <small>자리를 누르면 능력치</small></div>${npcs(v).map(j=>{ const q=per(v,j), b=q.abil||{}, top=ABL().slice().sort((x,y)=>(b[y.k]||0)-(b[x.k]||0))[0]; return `<div class="side-row" style="flex-wrap:wrap">${q.emo} <b>${U.esc(q.name)}</b> <small>${U.esc(q.style||'')}${top?` · ${top.e}${b[top.k]}`:''}</small></div>`; }).join('')}</div>`;
  const q=per(v,i), c=(v.cond&&v.cond[i])||{mood:'😐',moodT:'평온',mods:{},log:[]}, b=Object.assign({},q.abil||{}), cu={}; for(const a of ABL()) cu[a.k]=Math.max(1,Math.min(10,(b[a.k]||5)+((c.mods||{})[a.k]||0)));
  return `<div class="side-box"><div class="side-h">🐾 ${q.emo} ${U.esc(q.name)} <small>${U.esc(q.style||'')}</small></div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${window.NPCS&&NPCS.hex?NPCS.hex(b,cu,132):''}<div style="flex:1;min-width:120px"><div class="side-row"><small>특기</small> ${U.esc(q.special||'-')}</div><div class="side-row"><small>약점</small> ${U.esc(q.weak||'-')}</div><div class="side-row"><small>지금</small> ${c.mood} ${U.esc(c.moodT)}</div>${(!HSEAT.length||['confess','over'].includes(v.phase))&&q.motive?`<div class="side-row"><small>속셈</small> ${U.esc(q.motive)}</div>`:''}</div></div>${(c.log||[]).slice(-3).reverse().map(x=>`<div class="side-row"><small>${x.r}R</small> ${U.esc(x.text)}</div>`).join('')}<div class="side-row"><small>점선 = 원래 능력치, 색칠 = 지금</small></div></div>`; }
function chatText(){ const i=document.getElementById('gaChat'); const t=i?i.value.trim():''; return t; }
function clearChat(){ const i=document.getElementById('gaChat'); if(i){ i.value=''; i.focus(); } }
function send(){ const t=chatText(); if(!t||!CC) return; CC.act({k:'chat',text:t}); clearChat(); }
function sendDm(){ const i=document.getElementById('gaDm'); const t=i?i.value.trim():''; if(!t||!CC||dmTo==null) return; CC.act({k:'dm',t:dmTo,text:t}); i.value=''; i.focus(); }
function onClick(e){ if(!CC||!CV) return; const v=CV;
  const go=e.target.closest('[data-go]'); if(go&&!go.disabled) return CC.act({k:'go',pl:go.dataset.go});
  const cl2=e.target.closest('[data-call]'); if(cl2) return CC.act({k:'call',t:+cl2.dataset.call});
  const iv=e.target.closest('[data-inv]'); if(iv) return CC.act({k:'inv',ok:iv.dataset.inv==='1'});
  const cm=e.target.closest('[data-cmode]'); if(cm&&!cm.disabled){ chatMode=cm.dataset.cmode; return CC.rerender(); }
  const dt=e.target.closest('[data-dmto]'); if(dt){ dmTo=+dt.dataset.dmto; CC.rerender(); const i=document.getElementById('gaDm'); if(i&&!i.disabled) i.focus(); return; }
  const of=e.target.closest('[data-offer]'); if(of) return CC.act({k:'offer',id:+of.dataset.offer,ok:of.dataset.ok==='1'});
  const x=e.target.closest('[data-x]'); if(x){ if(x.dataset.x==='send') return send(); if(x.dataset.x==='dm') return sendDm(); if(x.dataset.x==='endTalk') return CC.act({k:'endTalk'}); }
  const t=e.target.closest('[data-t]'); if(t&&!t.disabled){ sel=+t.dataset.t; if(!isH(sel)&&v.alive[sel]) dmTo=sel; return CC.rerender(); }
  const vv=e.target.closest('[data-v]'); if(vv){ const say=chatText(); CC.act({k:'vote',v:vv.dataset.v,say}); if(say) clearChat(); return; }
  const c=e.target.closest('[data-c]'); if(c) return CC.act({k:'disc',c:+c.dataset.c});
  const cl=e.target.closest('[data-cl]'); if(cl){ const say=chatText(); CC.act({k:'claim',c:cl.dataset.cl,say}); if(say) clearChat(); return; }
  const a=e.target.closest('[data-a]'); if(!a||a.disabled) return; const say=chatText(); CC.act({k:a.dataset.a,t:sel,say}); if(say) clearChat(); sel=null; }


function status(v,ctx){ syncH(v); const me=HSEAT[ctx.me], g=v.govs[v.govs.length-1]||{};
  if(['confess','over'].includes(v.phase)) return '';
  if(v.phase==='vote'&&v.alive[me]&&!v.votes[me]) return '투표하세요';
  if(v.phase==='nominate'&&v.rep===me) return '집행자를 지목하세요';
  if((v.phase==='rdisc'&&v.rep===me)||(v.phase==='edisc'&&v.exe===me)) return '버릴 카드';
  if((v.phase==='claimRep'&&g.rep===me)||(v.phase==='claimExe'&&g.exe===me)) return '본 카드를 말하세요';
  if(v.phase==='kill'&&v.rep===me) return '처형할 사람'; if(v.phase==='guess'&&guesser(v)===me) return '신을 지목하세요';
  if(v.phase==='talk') return '자유 토론 중 — 말해도 돼요'; if(v.phase==='free') return '⏱️ 자유 시간 — 장소를 골라 움직여요'; return '진행 중…'; }
const guide=`
<p><b>천사 vs 악마 정체 숨기기 — AI판</b>. 동물 친구들이 <b>Claude로 직접 생각하고 말해요</b>: 누구를 의심할지, 찬반, 어떤 카드를 버릴지, 거짓말을 할지까지 각자 판단해요.</p>
<p><b>팀</b> 7명 = 😇 천사팀 4(👼신·😇대천사·🙂천사 2) vs 😈 악마팀 3(😈루시퍼·👿악마 2). 악마끼리는 서로 알고, 대천사는 신을 알고, 신은 악행이 쌓일 때마다 악마를 하나씩 알게 돼요.</p>
<p><b>라운드</b> 💬 자유 토론 → 🎙️ 대표가 집행자 지목 → 🗳️ 모두 찬반 → 🃏 대표가 3장 중 1장, 집행자가 2장 중 1장 버림 → 남은 1장 적립 → 📣 둘이 본 카드를 말함(거짓말 가능).</p>
<p><b>말하기</b> 토론 중엔 언제든 아무 말이나 — 이름을 부르면 그 동물이 대답해요. 🤫 귓속말로 몰래 연합·떠보기도 돼요.</p>
<p><b>승리</b> 악행 5 = 악마 승리. 선행 5 = 천사 승리, 단 <b>악마가 신을 맞히면 역전</b>. 악행 4번째엔 대표가 1명 처형 — 루시퍼면 천사 승리.</p>
<p><b>준비</b> 이 Mac에서 <code>node local/ai-bridge.js</code>를 켜 두세요(그 Mac의 Claude Code 로그인을 써요). 친구들과 할 땐 방장만 켜면 돼요.</p>`;

window.GAMES.goodevilai = { _sync:x=>syncH(x), maxH:7, table:true, watch:true,
  title:'선과 악 · AI판', alias:'선과 악 AI', ref:'피의 게임 「선과 악」', emoji:'🤖', tags:['정체 숨기기','팀전','추리','AI','두뇌서바이벌'],
  tagline:'동물들이 Claude로 직접 생각하고 말하는 선과 악 — 자유롭게 말하고, 귓속말하고, 속여 보세요.',
  guide, init, apply, mask, render, status, step, stepDelay, noPersona:true, wide:true,
  reset(){ sel=null; dmTo=null; dmSeen={}; chatMode='table'; RUN.clear(); if(window.AIB) AIB.resetUsage(); },
  bar:()=>'', _view:view,   // _view: 동물에게 넘기는 정보 확인용
  result:v=>v.wteam?`${v.wteam==='dev'?'😈 악마팀':'😇 천사팀'} 승리`:'',
};
})();
