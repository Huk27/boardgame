(function(){
'use strict';
/* 탈락자 선정 (피의 게임 시즌 1 · 1일차). 처음 만난 6명(우리 둘 + NPC 4명)이 자기소개와 짧은 대화 뒤 비밀 투표로 1명을 떨어뜨린다.
   첫인상 카드(직업) → 한 명씩 자기소개 → 대화 2바퀴(🤝 손잡기 · 🤨 위험 지목 · 🙏 어필 · 🤐 넘기기) → 비밀 투표 → 한 장씩 개표.
   최다 득표자 탈락. 동점이면 동점자만 놓고 재투표, 또 동점이면 제비뽑기.
   NPC는 첫인상과 들은 말로만 마음을 정함: 전략형은 "강해 보이는 사람", 마음 약한 쪽은 "도움 안 될 것 같은 사람"·"나를 찌른 사람"을 찍음. */
/* 👥 N명 (2026-11-12 사용자: "최대한 전부 멀티 지원") — 사람 자리는 init(starter,{humans:k}), 나머지 NPC */
const N=6; let HSEAT=[0,3]; const SEATORD=[0,3,1,4,2,5]; const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i), ALL=[...Array(N).keys()];
const nm=i=>`{s${i}}`;
const PROF=[
  {k:'math', e:'🧠', t:'수학 강사', th:.9, d:'계산이 빠름'},
  {k:'sales', e:'🗣️', t:'영업왕', th:.8, d:'말로 사람을 움직임'},
  {k:'poker', e:'🕶️', t:'포커 플레이어', th:.85, d:'표정을 안 읽힘'},
  {k:'gamer', e:'🎮', t:'프로게이머', th:.6, d:'게임 감각'},
  {k:'athlete', e:'💪', t:'전직 운동선수', th:.5, d:'체력 하나는 자신'},
  {k:'nurse', e:'🩺', t:'간호사', th:.3, d:'다정하고 꼼꼼함'},
  {k:'idol', e:'🎤', t:'아이돌 연습생', th:.35, d:'밝은 분위기 메이커'},
  {k:'rookie', e:'😇', t:'사회초년생', th:.15, d:'아직 잘 모르겠어요'},
];
const PK=k=>PROF.find(p=>p.k===k);
const STYLE={seojin:'logic', doyun:'warm', haram:'calm', yuna:'emo', minho:'sly', taekyung:'hot', jihu:'sly', soyul:'warm'};
const DEF_P={talk:.6,aggr:.5,trust:.5,bluff:.5,logic:.6,temper:.4};
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
const LINES={
  logic:{intro:['{pe}. 감정보다 계산으로 움직입니다.','{p}입니다. 숫자로 말하는 편이에요.'], accuse:['냉정하게 보면 {t}이(가) 제일 위험해요. 남겨 두면 나중에 다 먹혀요.','{t}, 첫인상만으로도 계산이 끝났어요. 제일 강해요.'], ally:['{t}, 합리적으로 같이 가죠. 서로 안 찍는 걸로.'], appeal:['저를 떨어뜨리면 이 판 계산할 사람이 없어요.'], quiet:['지금은 정보가 부족해요. 듣고만 있을게요.'],
    defend:['근거 없는 지목이네요.'], counter:['{t}, 저를 먼저 찌르는 게 오히려 수상해요.'], yes:['좋아요, 계약 성립.'], no:['…지금은 누구랑도 묶이지 않을게요.'], confess:['처음부터 {t}이(가) 제일 위협이라고 계산했어요.'], out:['…계산 착오네요.'], safe:['예상대로예요.']},
  warm:{intro:['{pe}! 다 같이 친하게 지내요 😊','{p}입니다. 혼자보다 같이가 좋아요.'], accuse:['미안한데… {t}이(가) 좀 마음에 걸려요.'], ally:['{t}, 우리 같이 가요! 🤝','{t}님이랑 잘 맞을 것 같아요.'], appeal:['저 진짜 도움 될게요. 믿어 주세요 🙏'], quiet:['다들 싸우지 말고 천천히 정해요.'],
    defend:['저요? 저 아무것도 안 했어요 🥲'], counter:['{t}, 우리 이러지 말아요…'], yes:['좋아요!! 🤝'], no:['음… 생각해 볼게요 😅'], confess:['사실 {t}이(가) 제일 무서웠어요…'], out:['흑… 지하에서 꼭 올라올게요 😭'], safe:['다행이다… 🥹']},
  calm:{intro:['…{pe}.','{p}입니다. 잘 부탁해요.'], accuse:['…{t}. 말이 너무 많았어요.','조용히 봤는데, {t} 쪽이에요.'], ally:['{t}… 같이 가요.'], appeal:['…저는 조용히 제 몫 해요.'], quiet:['…','…좀 더 볼게요.'],
    defend:['…아니에요.'], counter:['{t}이(가) 저를 찍는 이유가 궁금하네요.'], yes:['…네.'], no:['…혼자 할게요.'], confess:['…처음부터 {t} 쪽이었어요.'], out:['…그렇군요.'], safe:['…']},
  emo:{intro:['{pe}!! 잘 부탁드려요 😆','{p}입니다~ 다들 무섭게 생겼다 😳'], accuse:['{t}… 느낌이 쎄해요 😣','왠지 {t}이(가) 무서워요'], ally:['{t}님 저랑 같이 해요 🥺'], appeal:['저 떨어뜨리지 마요 제발 😭'], quiet:['어떡해… 모르겠어요 😥'],
    defend:['왜 저예요?! 😭'], counter:['{t} 너무해요! 😤'], yes:['꺅 좋아요!! 🥳'], no:['앗… 저는 아직요 😅'], confess:['{t} 그냥… 느낌이 별로였어요 😣'], out:['으앙 😭😭'], safe:['살았다!! 🥳']},
  sly:{intro:['{pe}. 재밌는 판이 될 것 같네요 😏','{p}입니다. 잘 부탁해요~ (아직은요)'], accuse:['{t}, 표정 관리 좀 하세요. 제일 위험한 사람 딱 보여요 😏','다들 {t} 조심해요. 저 사람 웃는 게 무서워요.'], ally:['{t}, 우리 둘이면 끝까지 가요. 약속 🤝'], appeal:['저를 남겨 두는 게 이득이에요. 진짜로요.'], quiet:['재밌네요. 다들 패를 숨기고 있어요 😏'],
    defend:['저요? ㅋㅋ 제가 위험하면 벌써 다 끝났죠'], counter:['{t}, 찔리니까 저를 먼저 찍는 거죠? 😏'], yes:['좋죠~ 🤝 (후후)'], no:['저는 혼자가 편해요~'], confess:['솔직히 {t}이(가) 제일 거슬렸어요 😏'], out:['…이게 되네? 지하에서 봬요 😏'], safe:['역시 😎'], betray:['미안해요 {t}, 판은 판이라서요 😏']},
  hot:{intro:['{p}! 할 땐 확실히 합니다 🔥','{pe}. 돌려 말하는 거 못 해요.'], accuse:['{t}! 딱 보니까 이 사람이에요 🔥','더 볼 것도 없어요, {t}!'], ally:['{t}, 같이 갑시다. 확실하게!'], appeal:['저 체력이랑 깡은 누구보다 있어요!'], quiet:['다들 왜 이렇게 조용해요? 말 좀 해요!'],
    defend:['뭐라고요? 말이 돼요?!'], counter:['{t}, 지금 저 찍었어요? 그쪽부터 떨어져요! 🔥'], yes:['좋아요, 확실하게 갑니다!'], no:['저는 제 판단대로 갑니다!'], confess:['{t}이(가) 저를 건드려서요. 그거면 충분해요.'], out:['…인정 못 해!!'], safe:['당연하죠 🔥']},
};
function lineOf(s,seat,kind,vars){ const p=P(s,seat), st=STYLE[p.id]||'calm', L=(LINES[st]||{})[kind]||LINES.calm[kind]; if(!L) return null;
  const used=(s.used[seat]=s.used[seat]||[]); let pool=L.filter(x=>!used.includes(x)); if(!pool.length) return null; const raw=U.pick(pool); used.push(raw);
  let t=raw; for(const k in (vars||{})) t=t.split('{'+k+'}').join(vars[k]); return t; }
const ieyo=w=>{ const c=w.charCodeAt(w.length-1); return w+(c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28?'이에요':'예요'); };
const HUMAN_LINES={accuse:'{t}님이 제일 위험해 보여요. 지금 떨어뜨려야 해요.', ally:'{t}님, 우리 같이 가요. 서로 안 찍기로 해요 🤝', appeal:'저는 이 팀에 꼭 필요한 사람이에요. 믿어 주세요 🙏', quiet:'(조용히 듣는다)'};

function init(starter,o){ const k=Math.max(2,Math.min(6,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  const s={phase:'intro', who:{}, prof:Array(N).fill(null), offer:[null,null], said:ALL.map(()=>[]), acc:Array(N).fill(0), accBy:ALL.map(()=>[]), pact:[], refused:[],
    dis:ALL.map(()=>Array(N).fill(0)), votes:Array(N).fill(null), cand:null, vround:1, rev:0, tally:Array(N).fill(0), out:null, lot:false,
    talkRound:0, order:[], oi:0, actor:null, used:{}, say:null, q:[], log:[], turn:null, starter, winner:null, ev:0, think:0, intro:0,
    notice:'🎙️ 피의 게임에 오신 걸 환영합니다. 서로 이름만 겨우 아는 지금 — 첫 번째 미션은 「탈락자 투표」입니다'};
  s.hs=HSEAT.slice(); const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=ids[k]);
  const pool=U.shuffle(PROF.map(p=>p.k));
  ALL.filter(i=>!isH(i)).forEach(i=>s.prof[i]=pool.pop());
  const rest=U.shuffle(PROF.map(p=>p.k).filter(k=>!s.prof.includes(k)));
  s.offer=HSEAT.map((_,p)=>p===0?rest.slice(0,3):p===1?rest.slice(1,4).reverse():U.shuffle(PROF.map(x=>x.k)).slice(0,3));   // 겹쳐도 괜찮음(같은 직업도 가능)
  return s;
}
/* NPC 마음: 첫인상 */
function firstImpression(s){
  for(const i of ALL) if(!isH(i)){ const p=P(s,i), wt=p.logic*.5+p.aggr*.3;
    for(const j of ALL) if(j!==i){ const th=PK(s.prof[j]).th; s.dis[i][j] = wt*th + (1-wt)*(1-th)*.95 + (Math.random()-.5)*.3; } }
}
function talkOrder(s){ const st=HSEAT[s.starter]; return ALL.map((_,k)=>(st+k)%N); }
function startTalk(s){ s.talkRound++; s.order=talkOrder(s); s.oi=0; s.notice=`🎙️ 대화 ${s.talkRound}바퀴 — 한 사람씩 한마디 하세요`; s.log.push(`— 대화 ${s.talkRound}바퀴 —`); nextSpeaker(s); }
function nextSpeaker(s){
  if(s.oi>=s.order.length){ if(s.talkRound<2){ s.phase='run'; s.q.push({k:'note',text:'🎙️ 한 바퀴 더 — 이번엔 더 솔직하게'}); s.q.push({k:'talk'}); } else startVote(s); return; }
  const i=s.order[s.oi]; s.actor=i; s.phase='talk';
  if(isH(i)){ s.turn=pOf(i); s.notice=`💭 ${nm(i)} 차례 — 한마디 하세요`; }
  else { s.turn=null; const p=P(s,i); s.think=1300+ (1-p.talk)*1600 + p.logic*900 - p.aggr*500 + Math.random()*900; s.notice=`💭 ${nm(i)}이(가) 말을 고르는 중…`; }
}
function speak(s,i,kind,t){
  const rec={by:i,kind,t,r:s.talkRound}; s.said[i].push(rec);
  let text = isH(i) ? HUMAN_LINES[kind].split('{t}').join(t!=null?nm(t):'') : lineOf(s,i,kind,{t:t!=null?nm(t):'', p:PK(s.prof[i]).t, pe:ieyo(PK(s.prof[i]).t)});
  if(!text) text = kind==='quiet'?'…':HUMAN_LINES[kind].split('{t}').join(t!=null?nm(t):'');
  s.say={seat:i,text,n:(s.say?s.say.n:0)+1}; s.log.push(`${nm(i)}: ${text}`);
  // 듣는 사람들 마음 변화
  for(const l of ALL) if(!isH(l)&&l!==i){ const p=P(s,l);
    if(kind==='accuse'){ if(l===t) s.dis[l][i]+=.35+.45*p.temper; else { s.dis[l][t]+=.13*p.trust+.03; s.dis[l][i]+=.14*(1-p.aggr)+.03; } }   // 남을 찌르면 나도 눈에 띔
    if(kind==='appeal'){ s.dis[l][i]-=.18*(1-p.logic*.5)*(1-PK(s.prof[i]).th*.5); }
    if(kind==='ally'&&l!==t){ s.dis[l][i]+=.03; }
    if(kind==='quiet'){ s.dis[l][i]+= .02+.05*p.aggr+.03*p.talk; }   // 존재감 없는 사람은 찍기 쉬움
  }
  if(kind==='accuse'){ s.acc[t]++; s.accBy[t].push(i); }
  s.phase='run'; s.turn=null; s.actor=null;
  if(kind==='accuse'&&!isH(t)){ const p=P(s,t); s.q.push({k:'react', i:t, kind: Math.random()<p.temper+.15?'counter':'defend', t:i}); if(p.temper>.6) s.dis[t][i]+=.2; }
  if(kind==='accuse'){ const others=ALL.filter(x=>x!==i&&x!==t&&!isH(x)); const ag=others.filter(x=>s.dis[x][t]>.6&&Math.random()<P(s,x).talk*.5).slice(0,1);
    for(const x of ag) s.q.push({k:'react', i:x, kind:'agree', t}); }
  if(kind==='ally'){ if(isH(t)) { s.q.push({k:'allyAsk', i, t}); } else { const p=P(s,t), yes = s.dis[t][i] < .55+p.trust*.25; s.q.push({k:'allyAns', i, t, yes}); } }
  s.q.push({k:'next'});
}
function allyResult(s,i,t,yes){
  if(yes){ s.pact.push([i,t]); s.log.push(`🤝 ${nm(i)} ↔ ${nm(t)} 손잡음`); for(const l of ALL) if(!isH(l)&&l!==i&&l!==t) { s.dis[l][i]+=.06*P(s,l).logic; s.dis[l][t]+=.06*P(s,l).logic; } if(!isH(t)) s.dis[t][i]-=.3; if(!isH(i)) s.dis[i][t]-=.3; }
  else { s.refused.push([i,t]); s.log.push(`🙅 ${nm(t)}이(가) ${nm(i)}의 손을 거절`); if(!isH(i)) s.dis[i][t]+=.25; }
}
const pactWith=(s,i)=>s.pact.filter(p=>p.includes(i)).map(p=>p[0]===i?p[1]:p[0]);
function startVote(s){ s.phase='vote'; s.votes=Array(N).fill(null); s.turn=null; s.actor=null; s.notice = s.vround===1 ? '🎙️ 투표를 시작합니다. 떨어뜨릴 한 사람의 이름을 적어 주세요' : `🎙️ 동점! ${s.cand.map(nm).join(', ')} 중에서 다시 투표합니다`;
  s.log.push(s.vround===1?'🗳️ 비밀 투표':'🗳️ 재투표'); s.vi=0; s.vorder=ALL.slice(); }
function npcVote(s,i){
  const p=P(s,i), C=(s.cand||ALL).filter(j=>j!==i), mates=pactWith(s,i);
  let best=null, bv=-1e9;
  for(const j of C){ let v=s.dis[i][j] + s.acc[j]*.07*(1-p.logic*.6) + (Math.random()-.5)*.12;
    if(!s.said[j].some(x=>x.kind!=='quiet')) v+=.07;   // 한마디도 안 한 사람
    if(mates.includes(j)) v-=.9; if(s.refused.some(r=>r[0]===i&&r[1]===j)) v+=.15; if(v>bv){ bv=v; best=j; } }
  // 배신형: 동맹이 제일 위협이면 가끔 배신
  const m=mates.find(j=>C.includes(j)); if(m!=null&&p.bluff>.8&&PK(s.prof[m]).th>.6&&Math.random()<.35){ best=m; s.betray={by:i,t:m}; }
  return best;
}
function apply(s,p,a){ syncH(s);
  if(s.winner!=null) return '게임이 끝났어요';
  const seat=HSEAT[p]; if(!a) return '알 수 없는 동작';
  if(a.k==='pick'){ if(s.phase!=='pick') return '지금은 고를 때가 아니에요'; if(s.prof[seat]) return '이미 골랐어요';
    if(!s.offer[p].includes(a.prof)) return '직업 카드를 고르세요'; s.prof[seat]=a.prof; s.ev++; return null; }
  if(a.k==='say'){ if(s.phase!=='talk'||s.actor!==seat) return '내 차례가 아니에요';
    if(!['accuse','ally','appeal','quiet'].includes(a.kind)) return '할 말을 고르세요';
    if((a.kind==='accuse'||a.kind==='ally')){ const t=a.t|0; if(!(t>=0&&t<N)||t===seat) return '대상을 고르세요'; if(a.kind==='ally'&&pactWith(s,seat).includes(t)) return '이미 손잡았어요'; speak(s,seat,a.kind,t); }
    else speak(s,seat,a.kind,null); s.ev++; return null; }
  if(a.k==='allyAns'){ if(s.phase!=='allyAsk'||s.allyAsk.t!==seat) return '지금은 대답할 때가 아니에요'; const {i,t}=s.allyAsk; s.allyAsk=null; s.phase='run'; s.turn=null;
    s.say={seat, text: a.yes?'좋아요, 같이 가요 🤝':'음… 저는 혼자 갈게요', n:(s.say?s.say.n:0)+1}; s.log.push(`${nm(seat)}: ${s.say.text}`); allyResult(s,i,t,!!a.yes); s.ev++; return null; }
  if(a.k==='vote'){ if(s.phase!=='vote') return '지금은 투표 시간이 아니에요'; if(s.votes[seat]!=null) return '이미 투표했어요';
    const t=a.t|0, C=(s.cand||ALL).filter(j=>j!==seat); if(!C.includes(t)) return '투표할 사람을 고르세요';
    s.votes[seat]=t; s.ev++; return null; }
  return '알 수 없는 동작';
}
function stepDelay(s){ syncH(s);
  if(s.winner!=null) return null;
  if(s.phase==='intro') return 2600;
  if(s.phase==='pick') return HSEAT.every(i=>s.prof[i]) ? 900 : null;
  if(s.phase==='intros') return s.intro<N ? 2100 : 1500;
  if(s.phase==='allyAsk') return null;
  if(s.q.length) return s.q[0].k==='note'?1800 : s.q[0].k==='react'||s.q[0].k==='allyAns'?1500 : s.q[0].k==='allyAsk'?900 : 800;
  if(s.phase==='talk') return isH(s.actor)?null:s.think;
  if(s.phase==='vote'){ if(s.vi<N){ const i=s.vorder[s.vi]; return isH(i) ? (s.votes[i]!=null?300:null) : 700+Math.random()*900; } return 900; }
  if(s.phase==='reveal') return s.rev<s.ballots.length ? 1300 : 1800;
  if(s.phase==='result') return 3200;
  if(s.phase==='debrief') return 2400;
  return null;
}
function step(s){ syncH(s);
  if(s.phase==='intro'){ s.phase='pick'; s.notice='🎙️ 먼저 첫인상 카드를 고르세요 — 자기소개 때 다른 사람들이 보는 내 모습이에요'; s.ev++; return; }
  if(s.phase==='pick'){ firstImpression(s); s.phase='intros'; s.intro=0; s.notice='🎙️ 한 명씩 자기소개를 하겠습니다'; s.ev++; return; }
  if(s.phase==='intros'){ if(s.intro<N){ const i=talkOrder(s)[s.intro++]; const pr=PK(s.prof[i]);
      const text = isH(i) ? `${ieyo(pr.t)}. ${pr.d}.` : lineOf(s,i,'intro',{p:pr.t, pe:ieyo(pr.t)});
      s.say={seat:i,text,n:(s.say?s.say.n:0)+1}; s.log.push(`${nm(i)} ${pr.e} ${pr.t}: ${text}`); s.notice=`🙋 ${nm(i)} — ${pr.e} ${pr.t}`; s.ev++; return; }
    startTalk(s); s.ev++; return; }
  if(s.q.length){ const e=s.q.shift();
    if(e.k==='note'){ s.notice=e.text; s.log.push(e.text); }
    else if(e.k==='talk') startTalk(s);
    else if(e.k==='next'){ s.oi++; nextSpeaker(s); }
    else if(e.k==='react'){ const t=lineOf(s,e.i,e.kind==='agree'?'accuse':e.kind,{t:nm(e.t)}); if(t&&e.kind==='agree'){ s.acc[e.t]++; s.accBy[e.t].push(e.i); s.said[e.i].push({by:e.i,kind:'accuse',t:e.t,r:s.talkRound}); for(const l of ALL) if(!isH(l)&&l!==e.i&&l!==e.t) s.dis[l][e.t]+=.1*P(s,l).trust; if(!isH(e.t)) s.dis[e.t][e.i]+=.25; } if(t){ s.say={seat:e.i,text:t,n:(s.say?s.say.n:0)+1}; s.log.push(`${nm(e.i)}: ${t}`); } }
    else if(e.k==='allyAns'){ const t=lineOf(s,e.t,e.yes?'yes':'no',{t:nm(e.i)})||(e.yes?'좋아요':'음…'); s.say={seat:e.t,text:t,n:(s.say?s.say.n:0)+1}; s.log.push(`${nm(e.t)}: ${t}`); allyResult(s,e.i,e.t,e.yes); }
    else if(e.k==='allyAsk'){ s.phase='allyAsk'; s.allyAsk={i:e.i,t:e.t}; s.turn=pOf(e.t); s.notice=`🤝 ${nm(e.i)}이(가) 손을 내밀었어요 — ${nm(e.t)}, 잡을까요?`; }
    s.ev++; return; }
  if(s.phase==='talk'&&!isH(s.actor)){ npcSpeak(s,s.actor); s.ev++; return; }
  if(s.phase==='vote'){ if(s.vi<N){ const i=s.vorder[s.vi]; if(!isH(i)&&(!s.cand||!s.cand.includes(i)||s.cand.length>1)){ s.votes[i]=npcVote(s,i); }
      if(s.votes[i]!=null||isH(i)){ s.vi++; s.notice=`🗳️ ${nm(i)} 투표 완료 (${s.vi}/${N})`; } s.ev++; return; }
    // 개표
    s.ballots=U.shuffle(ALL.filter(i=>s.votes[i]!=null)); s.rev=0; s.tally=Array(N).fill(0); s.phase='reveal'; s.notice='🎙️ 개표를 시작합니다'; s.ev++; return; }
  if(s.phase==='reveal'){ if(s.rev<s.ballots.length){ const b=s.ballots[s.rev++], t=s.votes[b]; s.tally[t]++; s.notice=`🗳️ ${s.rev}번째 표 — ${nm(t)} (${s.tally[t]}표)`; s.log.push(`🗳️ ${nm(b)} → ${nm(t)}`); s.ev++; return; }
    const mx=Math.max(...s.tally), top=ALL.filter(i=>s.tally[i]===mx);
    if(top.length>1&&s.vround===1){ s.cand=top; s.vround=2; startVote(s); s.ev++; return; }
    let out=top[0]; if(top.length>1){ out=U.pick(top); s.lot=true; }
    s.out=out; s.phase='result'; s.notice = `🎙️ 첫 번째 탈락자는… ${nm(out)}입니다${s.lot?' (동점 — 제비뽑기)':''}`; s.log.push(`💀 탈락: ${nm(out)} (${mx}표)${s.lot?' · 제비뽑기':''}`);
    if(!isH(out)){ const t=lineOf(s,out,'out',{}); if(t){ s.say={seat:out,text:t,n:(s.say?s.say.n:0)+1}; } }
    if(s.betray) s.log.push(`🗡️ ${nm(s.betray.by)}이(가) 동맹 ${nm(s.betray.t)}을(를) 찍었어요`);
    s.ev++; return; }
  if(s.phase==='result'){ s.phase='debrief'; s.di=0; s.dlist=ALL.filter(i=>!isH(i)); s.ev++; return; }
  if(s.phase==='debrief'){ if(s.di<s.dlist.length){ const i=s.dlist[s.di++]; const top=ALL.filter(j=>j!==i).sort((a,b)=>s.dis[i][b]-s.dis[i][a])[0];
      const t = s.betray&&s.betray.by===i ? lineOf(s,i,'betray',{t:nm(s.betray.t)}) : lineOf(s,i,'confess',{t:nm(top)});
      if(t){ s.say={seat:i,text:'(속마음) '+t,n:(s.say?s.say.n:0)+1}; s.log.push(`💭 ${nm(i)} 속마음: ${t}`); } s.ev++; return; }
    endGame(s); return; }
}
function npcSpeak(s,i){
  const p=P(s,i), others=ALL.filter(j=>j!==i), top=others.slice().sort((a,b)=>s.dis[i][b]-s.dis[i][a]), like=others.slice().sort((a,b)=>s.dis[i][a]-s.dis[i][b]);
  const threatened = s.acc[i]>=2 || (s.acc[i]>=1&&p.temper<.4);
  const mates=pactWith(s,i), r=Math.random();
  if(threatened && r<.55+(1-p.aggr)*.3) return speak(s,i,'appeal',null);
  if(!mates.length && r<p.trust*.7 && s.talkRound===1){ const t=like.find(j=>!s.refused.some(x=>x[0]===i&&x[1]===j)); if(t!=null) return speak(s,i,'ally',t); }
  if(r < p.aggr*.85+.1){ const t=top.find(j=>!mates.includes(j)); if(t!=null) return speak(s,i,'accuse',t); }
  if(r < p.talk) return speak(s,i,'appeal',null);
  return speak(s,i,'quiet',null);
}
function endGame(s){ s.phase='over'; s.turn=null;
  const h=HSEAT; if(h.length>2){ s.winners=h.map((x,p)=>x!==s.out?p:-1).filter(x=>x>=0); s.winner='none'; }
  else if(h.includes(s.out)) s.winner = pOf(s.out)===0?1:0;
  else { const a=s.tally[h[0]], b=s.tally[h[1]]; s.winner = a<b?0 : b<a?1 : 'both'; }
  s.notice += ' · 끝'; s.ev++; }
function mask(s,p){ syncH(s); const v=U.clone(s), me=HSEAT[p];
  if(s.phase==='pick'){ HSEAT.forEach((h,q)=>{ if(q!==p){ v.prof[h]=null; v.offer[q]=null; } }); }
  v.dis=null; v.q=[]; v.used={}; v.think=null; v.betray = s.phase==='over'||s.phase==='debrief'||s.phase==='result' ? s.betray : null;
  if(s.phase==='vote') v.votes=s.votes.map((x,i)=>i===me?x:(x!=null?'?':null));
  if(s.phase==='reveal') { const shown=new Set(s.ballots.slice(0,s.rev)); v.votes=s.votes.map((x,i)=>i===me||shown.has(i)?x:(x!=null?'?':null)); }
  return v; }
/* 혼자 모드에서 두 번째 사람 자리: 공개 정보만으로 행동 */
function ai(v){ syncH(v); const seat=HSEAT[1];
  if(v.phase==='pick'&&!v.prof[seat]){ const o=(v.offer[1]||v.offer.find(Boolean)).slice().sort((a,b)=>Math.abs(PK(a).th-.45)-Math.abs(PK(b).th-.45)); return {k:'pick',prof:o[0]}; }
  if(v.phase==='talk'&&v.actor===seat){ const others=ALL.filter(j=>j!==seat); if(v.acc[seat]>=1) return {k:'say',kind:'appeal'};
    if(v.talkRound===1){ const t=others.filter(j=>v.acc[j]===0&&!v.pact.some(p=>p.includes(j))); if(t.length) return {k:'say',kind:'ally',t:U.pick(t)}; }
    const t=others.slice().sort((a,b)=>v.acc[b]-v.acc[a]||PK(v.prof[b]).th-PK(v.prof[a]).th)[0]; return {k:'say',kind:'accuse',t}; }
  if(v.phase==='allyAsk'&&v.allyAsk&&v.allyAsk.t===seat) return {k:'allyAns', yes: v.acc[v.allyAsk.i]<2};
  if(v.phase==='vote'&&v.votes[seat]==null){ const mates=v.pact.filter(p=>p.includes(seat)).map(p=>p[0]===seat?p[1]:p[0]);
    const C=(v.cand||ALL).filter(j=>j!==seat); const t=C.slice().sort((a,b)=>(mates.includes(a)-mates.includes(b))||(v.acc[b]-v.acc[a])||(PK(v.prof[b]).th-PK(v.prof[a]).th))[0]; return {k:'vote',t}; }
  return null; }

/* 화면 */
let WHO={}, selT=null, sig='';
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}/g,(_,d)=>`${seatEmoji(+d)} ${seatName(+d,ctx)}`); }
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{};
  const me=HSEAT[ctx.me];
  const sg=v.phase+':'+v.talkRound+':'+v.oi+':'+v.vround; if(sg!==sig){ sig=sg; selT=null; }
  let h=`<div class="hl-notice">${fill(U.esc(v.notice||''),ctx)}</div>`;
  h+=`<div class="vr-speech">${v.say?`<span class="w">${seatEmoji(v.say.seat)} ${seatName(v.say.seat,ctx)}</span> ${fill(U.esc(v.say.text),ctx)}`:'<i>　</i>'}</div>`;
  const pickable = (v.phase==='talk'&&v.actor===me&&v.turn===ctx.me) || (v.phase==='vote'&&v.votes[me]==null);
  const C = v.phase==='vote' ? (v.cand||ALL).filter(j=>j!==me) : ALL.filter(j=>j!==me);
  h+=`<div class="ev-seats">${ALL.map(i=>{ const pr=v.prof[i]?PK(v.prof[i]):null, mates=v.pact.filter(p=>p.includes(i)).map(p=>p[0]===i?p[1]:p[0]);
      const lastAcc=[...v.said[i]].reverse().find(x=>x.kind==='accuse'); const mood = v.out===i?'💀':v.acc[i]>=3?'😰':v.acc[i]>=2?'😟':v.said[i].some(x=>x.kind==='accuse')&&!isH(i)&&P({who:WHO},i).temper>.6?'😤':'';
      const can = pickable && C.includes(i);
      return `<button class="ev-seat ${i===me?'me':''} ${v.actor===i?'act':''} ${v.out===i?'out':''} ${selT===i?'sel':''} ${v.cand&&v.cand.includes(i)&&v.phase!=='over'?'cand':''}" data-t="${i}" ${can?'':'disabled'}>
        <div class="ev-nm">${seatEmoji(i)} ${seatName(i,ctx)} ${mood}</div>${isH(i)?'':`<small class="ev-arch">${NPCI(i)[2]}</small>`}
        <div class="ev-prof">${pr&&(v.phase!=='pick'||i===me||!isH(i))?`${pr.e} ${pr.t}`:'❔'}</div>
        <div class="ev-mind">${lastAcc?`🤨 ${seatEmoji(lastAcc.t)}`:''}${mates.length?` 🤝 ${mates.map(seatEmoji).join('')}`:''}${v.acc[i]?` <span class="ev-acc">찍힘 ${v.acc[i]}</span>`:''}</div>
        ${v.phase==='reveal'||v.phase==='result'||v.phase==='debrief'||v.phase==='over'?`<div class="ev-tally">${'🗳️'.repeat(v.tally[i])||'　'}</div>`:v.phase==='vote'?`<div class="ev-tally">${v.votes[i]!=null?'✅ 투표함':'…'}</div>`:''}
      </button>`; }).join('')}</div>`;
  // 행동
  if(v.phase==='pick'&&!v.prof[me]){ h+=`<div class="vr-card"><b>🎴 첫인상 카드 고르기</b><p>자기소개 때 보여줄 내 모습이에요. 강해 보이면 견제받고, 약해 보이면 "도움 안 될 사람"으로 찍힐 수 있어요.</p><div class="fh-act">${v.offer[ctx.me].map(k=>{ const p=PK(k); return `<button data-pf="${k}">${p.e} ${p.t}<br><small>${p.d}</small></button>`; }).join('')}</div></div>`; }
  else if(v.phase==='pick') h+=`<div class="info">다른 사람이 고르는 중…</div>`;
  if(v.phase==='talk'&&v.actor===me&&v.turn===ctx.me){ h+=`<div class="vr-card"><b>💬 한마디 하기</b> <small>${selT!=null?`대상: ${fill(nm(selT),ctx)}`:'손잡기·지목은 위에서 사람을 먼저 누르세요'}</small>
      <div class="fh-act"><button data-say="ally" ${selT==null?'disabled':''}>🤝 손잡기</button><button data-say="accuse" ${selT==null?'disabled':''} style="background:#b8412f">🤨 위험 지목</button><button data-say="appeal">🙏 나는 필요해요</button><button class="ghost" data-say="quiet">🤐 넘기기</button></div></div>`; }
  if(v.phase==='allyAsk'&&v.allyAsk&&v.allyAsk.t===me&&v.turn===ctx.me) h+=`<div class="vr-card"><b>🤝 ${fill(nm(v.allyAsk.i),ctx)}이(가) 같이 가자고 해요</b><p>손잡으면 서로 안 찍는 사이가 돼요(다른 사람들 눈엔 한 덩어리로 보일 수도).</p><div class="fh-act"><button data-ally="1">🤝 좋아요</button><button class="ghost" data-ally="0">🙅 혼자 갈게요</button></div></div>`;
  if(v.phase==='vote'&&v.votes[me]==null) h+=`<div class="vr-card"><b>🗳️ 비밀 투표</b> <small>${selT!=null?`→ ${fill(nm(selT),ctx)}`:'위에서 떨어뜨릴 사람을 누르세요'}</small><div class="fh-act"><button data-vote="1" ${selT==null?'disabled':''}>이 사람에게 투표</button></div></div>`;
  if(v.phase==='over'){ const rk=ALL.slice().sort((a,b)=>v.tally[a]-v.tally[b]); h+=`<div class="sn-score">${rk.map(i=>`<div class="${isH(i)?'h':''}"><b>${seatEmoji(i)} ${seatName(i,ctx)}</b> ${v.prof[i]?PK(v.prof[i]).e+' '+PK(v.prof[i]).t:''} · 받은 표 ${v.tally[i]}${v.out===i?' <small>💀 탈락</small>':''}</div>`).join('')}</div>`; }
  const L=`<div class="side-box"><div class="side-h">🧠 마음 지도 <small>말로 드러난 것</small></div>${ALL.map(i=>{ const acc=v.said[i].filter(x=>x.kind==='accuse').map(x=>seatEmoji(x.t)), al=v.pact.filter(p=>p.includes(i)).map(p=>seatEmoji(p[0]===i?p[1]:p[0])), ap=v.said[i].filter(x=>x.kind==='appeal').length;
      return `<div class="side-row ${i===me?'me':''}" style="flex-wrap:wrap">${seatEmoji(i)} ${seatName(i,ctx)} <small>${v.prof[i]&&(v.phase!=='pick'||!isH(i)||i===me)?PK(v.prof[i]).e:''}</small><div class="hl-st">🤨 ${acc.join(' ')||'-'} · 🤝 ${al.join('')||'-'} · 🙏 ${ap} · 받은 지목 <b class="${v.acc[i]>=2?'no':''}">${v.acc[i]}</b>${v.accBy[i].length?` (${v.accBy[i].map(seatEmoji).join('')})`:''}</div></div>`; }).join('')}
    ${v.refused.length?`<div class="side-h" style="margin-top:6px">🙅 거절당한 손</div>${v.refused.map(r=>`<div class="rr-h">${seatEmoji(r[0])} → ${seatEmoji(r[1])}</div>`).join('')}`:''}</div>`;
  const R=`<div class="side-box side-log"><div class="side-h">📜 대화 기록 <small>최근이 위</small></div>${v.log.slice(-60).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=`<div class="side3"><div class="side-mid">${h}</div><aside class="side-l">${L}</aside><aside class="side-r">${R}</aside></div>`;
  el.onclick=e=>{
    const pf=e.target.closest('[data-pf]'); if(pf) return ctx.act({k:'pick',prof:pf.dataset.pf});
    const t=e.target.closest('[data-t]'); if(t&&!t.disabled){ selT = selT===+t.dataset.t ? null : +t.dataset.t; return ctx.rerender(); }
    const sy=e.target.closest('[data-say]'); if(sy&&!sy.disabled){ const k=sy.dataset.say; return ctx.act({k:'say',kind:k,t:selT}); }
    const al=e.target.closest('[data-ally]'); if(al) return ctx.act({k:'allyAns',yes:al.dataset.ally==='1'});
    const vt=e.target.closest('[data-vote]'); if(vt&&!vt.disabled) return ctx.act({k:'vote',t:selT});
  };
}
function status(v,ctx){ syncH(v); const me=HSEAT[ctx.me]; if(v.phase==='over') return '';
  if(v.phase==='pick'&&!v.prof[me]) return '첫인상 카드를 고르세요'; if(v.phase==='talk'&&v.actor===me) return '한마디 하세요';
  if(v.phase==='allyAsk'&&v.allyAsk&&v.allyAsk.t===me) return '손을 잡을까요?'; if(v.phase==='vote'&&v.votes[me]==null) return '투표하세요'; return '진행 중…'; }
const guide=`
<p><b>처음 만난 6명이 한 시간 만에 한 명을 떨어뜨리는 투표</b>(사람 1~6명 + 빈자리는 성격 다른 컴퓨터 플레이어). 서로 아는 건 자기소개뿐!</p>
<ol><li><b>🎴 첫인상 카드</b> — 직업 3장 중 하나를 골라 자기소개. (🧠 수학 강사·🕶️ 포커 플레이어처럼 강해 보이면 견제, 😇 사회초년생처럼 약해 보이면 "도움 안 될 사람"으로 찍힐 수 있어요)</li>
<li><b>💬 대화 2바퀴</b> — 한 사람씩 한마디: <b>🤝 손잡기</b>(받아 주면 서로 안 찍는 사이) · <b>🤨 위험 지목</b> · <b>🙏 나는 필요해요</b> · <b>🤐 넘기기</b></li>
<li><b>🗳️ 비밀 투표</b> → 한 장씩 개표. 최다 득표자 탈락. 동점이면 동점자만 두고 재투표, 또 동점이면 제비뽑기.</li></ol>
<p>내가 살아남으면 승리(둘이 할 땐 둘 다 살면 받은 표가 적은 쪽, 같으면 둘 다 승 · 셋 이상이면 살아남은 사람 모두 승리).</p>
<div class="tipbox">💡 <b>팁</b><br>· 컴퓨터 플레이어마다 기준이 달라요 — 🧠 전략가·🃏 승부사는 강한 사람을, 🤝 연합가·💓 직감파는 약해 보이거나 자기를 찌른 사람을.<br>· 🔥 직진형을 지목하면 바로 되받아쳐요. 🗡️ 배신형과 손잡을 땐 조심!<br>· 지목을 많이 받으면 분위기가 쏠려요. 왼쪽 🧠 마음 지도를 보세요.</div>`;
window.GAMES.elimvote = {
  title:'탈락자 선정', ref:'피의 게임 「탈락자 선정」', emoji:'🗳️', tags:['투표','심리전','NPC','두뇌서바이벌'],
  tagline:'처음 만난 6명, 자기소개 한 번과 대화 두 바퀴. 그리고 비밀 투표로 한 명이 떨어진다.',
  guide, init, apply, mask, ai, render, status, step, stepDelay, noPersona:true, wide:true,
  aiDelay:()=>1600+Math.random()*1800,
  reset(){ sig=''; selT=null; },
  maxH:6, bar:(v,i)=>{ syncH(v); return `<span class="tag">${v.prof[HSEAT[i]]?PK(v.prof[HSEAT[i]]).e:'❔'} 받은 지목 ${v.acc[HSEAT[i]]}</span>`; },
  _pk:k=>PK(k).th,
  result:(v,ctx)=>{ syncH(v); const me=HSEAT[ctx.me]; return v.out===me?'💀 탈락':`생존 · 받은 표 ${v.tally[me]}`; },
};
})();
