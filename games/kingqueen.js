(function(){
'use strict';
/* 분배 게임 (피의 게임 시즌 1 · 2일차) — 6인(우리 둘 + NPC 4명)용으로 다듬음.
   몰래 정해진 👑 킹이 👸 퀸을 고르고, 둘이 상금 분배 순서를 정한다.
   순서대로 한 명씩 방에 들어가 상금 20 중 원하는 만큼 💰과 🛡️ 면제권(1장)을 가져간다(가져간 양은 나올 때 공개).
   마지막 세 순번은 집사에게 "○○는 킹·퀸인가요?" 비밀 질문을 한 번씩 한다(답은 본인만).
   한 바퀴 발언(질문 결과 공개 — 거짓말 가능 · 지목 · 감싸기) 뒤 모두 킹·퀸 두 명을 투표.
   정답 표가 3표 이상이면 일반 플레이어 승리(맞힌 사람 +6), 아니면 킹·퀸 승리(둘 다 +10). 점수 = 💰 + 🛡️(5) + 보너스. */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로, 나머지는 NPC */
const N=6, POT=20, IMMV=5, QN=3; let HSEAT=[0,3]; const SEATORD=[0,3,1,4,2,5];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i), ALL=[...Array(N).keys()];
const nm=i=>`{s${i}}`;
const STYLE={seojin:'logic', doyun:'warm', haram:'calm', yuna:'emo', minho:'sly', taekyung:'hot', jihu:'sly', soyul:'warm'};
const DEF_P={talk:.6,aggr:.5,trust:.5,bluff:.5,logic:.6,temper:.4};
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
const LINES={
  logic:{reportY:['집사한테 확인했어요. {t}, 킹·퀸 맞아요.'], reportN:['확인 결과 {t}은(는) 아니에요. 지워도 돼요.'], accuse:['순서랑 가져간 돈을 보면 {t}이에요.','{t}, 계산이 안 맞아요.'], clear:['{t}은(는) 아니라고 봐요. 근거 있어요.'], quiet:['정보가 더 필요해요.'], confess:['처음부터 {t}을(를) 봤어요.']},
  warm:{reportY:['저 물어봤어요… {t}이(가) 맞대요 😢'], reportN:['{t}은(는) 아니래요! 믿어 주세요 🤝'], accuse:['미안한데 {t}이(가) 좀 걸려요…'], clear:['{t}은(는) 착한 사람이에요. 아닐 거예요.'], quiet:['다들 너무 의심하지 말아요…'], confess:['솔직히 {t}이(가) 제일 수상했어요.']},
  calm:{reportY:['…{t}. 맞아요.'], reportN:['…{t}은(는) 아니에요.'], accuse:['…{t}.'], clear:['{t}은(는) 아니에요.'], quiet:['…'], confess:['…{t}였어요.']},
  emo:{reportY:['대박!! {t} 맞대요 😱'], reportN:['{t}은(는) 아니래요~ 휴 😮‍💨'], accuse:['{t} 느낌이 쎄해요 😣'], clear:['{t}은(는) 절대 아니에요!'], quiet:['헐… 모르겠어요 😥'], confess:['{t}… 그냥 느낌이 그랬어요 😣'], defend:['왜 저예요?! 😭']},
  sly:{reportY:['집사 말로는 {t}이(가) 맞다던데요? 😏'], reportN:['{t}? 아니래요~ 제가 확인했어요 😏'], accuse:['{t}, 표정 관리 좀 하세요 😏','다들 {t} 봐요. 돈 가져가는 거 보면 알잖아요.'], clear:['{t}은(는) 제가 보증해요.'], quiet:['재밌네요~ 다들 뭘 숨기는지 😏'], confess:['솔직히 {t}이(가) 제일 거슬렸어요 😏']},
  hot:{reportY:['확인했어요! {t}! 무조건이에요 🔥'], reportN:['{t}은(는) 아니에요! 제가 물어봤다니까요!'], accuse:['{t}! 딱 보면 몰라요? 🔥'], clear:['{t} 건드리지 마요, 아니에요!'], quiet:['다들 왜 이렇게 조용해요?!'], confess:['{t}! 처음부터 그렇게 봤어요!']},
};
const KQL={win:['후후, 아무도 못 맞혔네요 👑','완벽했어요 😏'], reveal:['네… 제가 {r}였어요 😅','들켰네요. {r} 맞아요.']};
function lineOf(s,seat,kind,t){ const p=P(s,seat), st=STYLE[p.id]||'calm', L=(LINES[st]||{})[kind]||LINES.calm[kind]; if(!L) return null;
  const used=(s.used[seat]=s.used[seat]||[]); const pool=L.filter(x=>!used.includes(x)); const raw=pool.length?U.pick(pool):U.pick(L); used.push(raw); return raw.split('{t}').join(t!=null?nm(t):''); }
const HUMAN={reportY:'집사한테 물어봤어요. {t}, 킹·퀸 맞대요.', reportN:'집사한테 물어봤어요. {t}은(는) 아니래요.', accuse:'{t}이(가) 킹·퀸 같아요.', clear:'{t}은(는) 아닌 것 같아요.', quiet:'(조용히 듣는다)'};

function init(starter,o){ const k=Math.max(2,Math.min(6,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  const s={phase:'intro', who:{}, role:Array(N).fill(null), K:null, Q:null, order:[], pot:POT, imm:true, took:Array(N).fill(null), di:0,
    qs:[], qa:Array(N).fill(null), claims:[], ti:0, votes:Array(N).fill(null), rev:0, score:null, cwin:null,
    used:{}, say:null, q:[], log:[], turn:null, starter, winner:null, ev:0, think:0,
    notice:'🎙️ 이 중 누군가 몰래 쪽지를 찾았습니다. 그 사람이 👑 킹입니다'};
  s.hs=HSEAT.slice(); const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=ids[k]);
  s.K=U.pick(ALL); s.role[s.K]='K';
  return s;
}
const knows=(s,i,j)=> i===j || (s.role[i]&&s.role[j]);   // 킹·퀸끼리는 서로 앎
/* NPC 판단: 자리에서 아는 것만 (공개 순서·가져간 돈·발언 + 내 질문 답 + 킹/퀸이면 짝) */
function belief(s,i){
  const p=P(s,i), sus=Array(N).fill(.4); sus[i]=0;
  if(s.role[i]){ for(const j of ALL) sus[j] = j===i?0 : s.role[j]?1:0; return sus; }
  const pos=j=>s.order.indexOf(j);
  for(const j of ALL) if(j!==i){
    if(pos(j)===0||pos(j)===1) sus[j]+=.1;            // 킹이 앞 순번에 자기 편을 둠
    if(s.qs.includes(j)) sus[j]+=.03;
    const tk=s.took[j]; if(tk){ const fair=POT/N; if(tk.c>fair*1.6) sus[j]+=.06*p.logic; if(tk.imm) sus[j]+=.05; }
  }
  for(const c of s.claims){ if(c.by===i) continue; const cred=Math.max(.15,1-sus[c.by]);
    if(c.kind==='reportY') sus[c.t]+=.4*p.trust*cred; if(c.kind==='reportN') sus[c.t]-=.35*p.trust*cred;
    if(c.kind==='accuse') sus[c.t]+=.13*p.trust*cred; if(c.kind==='clear'){ sus[c.t]-=.08*p.trust*cred; sus[c.by]+=.04*p.logic; }
    if(c.t===i&&(c.kind==='accuse'||c.kind==='reportY')) sus[c.by]+=.35*p.logic+.1;   // 나를 찍은 사람(나는 내가 아닌 걸 앎)
  }
  if(s.qa[i]){ sus[s.qa[i].t] = s.qa[i].ans ? 1 : 0; }
  for(const j of ALL) if(j!==i) sus[j]=Math.max(.01,Math.min(.99,sus[j]));
  // 내가 확실히 아는 것과 모순되는 보고를 한 사람은 거짓말쟁이 → 킹·퀸
  if(s.qa[i]) for(const c of s.claims) if(c.by!==i&&c.t===s.qa[i].t&&((c.kind==='reportY')!==s.qa[i].ans)&&(c.kind==='reportY'||c.kind==='reportN')) sus[c.by]=.97;
  return sus;
}
const top2=(sus,i)=>ALL.filter(j=>j!==i).sort((a,b)=>sus[b]-sus[a]).slice(0,2);

function begin(s){   // 킹이 퀸 고르기
  s.phase='queen'; if(isH(s.K)){ s.turn=pOf(s.K); s.notice='🎙️ 킹이 퀸을 고르는 중…'; }
  else { s.turn=null; s.think=2200; s.notice='🎙️ 킹이 퀸을 고르는 중…'; }
}
function setQueen(s,q){ s.Q=q; s.role[q]='Q'; s.phase='order'; s.log.push('👑 킹이 퀸을 골랐습니다 (비밀)');
  s.notice='🎙️ 킹과 퀸이 분배 순서를 정하는 중…'; if(isH(s.K)){ s.turn=pOf(s.K); s.draft=[]; } else { s.turn=null; s.think=2400; } }
function npcOrder(s){ const K=s.K, Q=s.Q, rest=U.shuffle(ALL.filter(j=>j!==K&&j!==Q)), p=P(s,K);
  // 영리한 킹: 퀸이나 자기를 질문 자리(마지막)에 숨겨 정보를 쥠 / 아니면 앞 순번에서 돈 챙기기
  const o=rest.slice(); if(Math.random()<.2+p.bluff*.3){ const a=Math.random()<.5?K:Q; o.splice(1,0,a===K?Q:K); o.push(a); } else { o.splice(0,0,K); o.splice(1+(Math.random()*2|0),0,Q); }
  return o; }
function setOrder(s,o){ s.order=o; s.qs=o.slice(-QN); s.phase='take'; s.di=0; s.turn=null; s.log.push(`📋 분배 순서: ${o.map(nm).join(' → ')}`); s.log.push(`❓ 질문권: ${s.qs.map(nm).join(', ')}`);
  s.notice=`🎙️ 순서가 정해졌습니다. 마지막 ${s.qs.map(nm).join('·')}에게는 집사 질문권!`; s.q.push({k:'note',text:`📋 ${o.map(nm).join(' → ')}`}); s.phase='run'; s.q.push({k:'nextTake'}); }
function nextTake(s){ if(s.di>=N){ s.phase='run'; s.q.push({k:'note',text:'🎙️ 분배가 끝났습니다. 질문권을 쓰겠습니다'}); s.q.push({k:'ask'}); return; }
  const i=s.order[s.di]; s.actor=i; s.phase='take'; s.notice=`🚪 ${nm(i)}이(가) 방에 들어갔습니다 (남은 상금 💰${s.pot}${s.imm?' · 🛡️ 있음':''})`;
  if(isH(i)) s.turn=pOf(i); else { s.turn=null; const p=P(s,i); s.think=1500+p.logic*1000+Math.random()*1200; } }
function take(s,i,c,imm){ c=Math.max(0,Math.min(s.pot,c|0)); imm=!!imm&&s.imm; s.pot-=c; if(imm) s.imm=false; s.took[i]={c,imm};
  s.log.push(`🚪 ${nm(i)} 나옴 — 💰${c}${imm?' + 🛡️':''} 가져감 (남은 💰${s.pot})`); s.notice=`🚪 ${nm(i)} 나옴 — 💰${c}${imm?' + 🛡️ 면제권':''}`; s.di++; s.turn=null; s.phase='run'; s.q.push({k:'nextTake'}); }
function npcTake(s,i){ const p=P(s,i), left=N-s.di, fair=s.pot/left; let c;
  if(s.role[i]) c = Math.round(fair*(p.bluff>.7?.7:1.3)); else c=Math.round(fair*(.6+p.aggr*.9+(Math.random()-.5)*.4));
  const imm = s.imm && (s.role[i] ? Math.random()<.35 : Math.random()<.25+p.aggr*.3);
  return [Math.max(0,Math.min(s.pot,c)), imm]; }
function startAsk(s){ s.ai=0; askNext(s); }
function askNext(s){ if(s.ai>=s.qs.length){ s.phase='run'; s.q.push({k:'note',text:'🎙️ 이제 한 사람씩 이야기해 보세요'}); s.q.push({k:'talk'}); return; }
  const i=s.qs[s.ai]; s.actor=i; s.phase='ask'; s.notice=`❓ ${nm(i)}이(가) 집사에게 몰래 질문하는 중…`; if(isH(i)) s.turn=pOf(i); else { s.turn=null; s.think=2000+Math.random()*1200; } }
function ask(s,i,t){ s.qa[i]={t, ans:!!s.role[t]}; s.log.push(`❓ ${nm(i)}이(가) 집사에게 질문했어요 (내용 비공개)`); s.ai++; s.turn=null; s.phase='run'; s.q.push({k:'askNext'}); }
function npcAskTarget(s,i){ const sus=belief(s,i); if(s.role[i]) return U.pick(ALL.filter(j=>!s.role[j])); return ALL.filter(j=>j!==i).sort((a,b)=>Math.abs(sus[a]-.5)-Math.abs(sus[b]-.5)+(Math.random()-.5)*.1)[0]; }
function startTalk(s){ s.ti=0; talkNext(s); }
function talkNext(s){ if(s.ti>=N){ startVote(s); return; } const i=s.order[s.ti]; s.actor=i; s.phase='talk';
  if(isH(i)){ s.turn=pOf(i); s.notice=`💭 ${nm(i)} 차례 — 한마디 하세요`; } else { s.turn=null; const p=P(s,i); s.think=1300+(1-p.talk)*1400+p.logic*800+Math.random()*900; s.notice=`💭 ${nm(i)}이(가) 말을 고르는 중…`; } }
function speak(s,i,kind,t){
  s.claims.push({by:i,kind,t}); const text = isH(i) ? HUMAN[kind].split('{t}').join(t!=null?nm(t):'') : (lineOf(s,i,kind,t)||'…');
  s.say={seat:i,text,n:(s.say?s.say.n:0)+1}; s.log.push(`${nm(i)}: ${text}`); s.ti++; s.turn=null; s.phase='run';
  if((kind==='accuse'||kind==='reportY')&&t!=null&&!isH(t)&&Math.random()<.6){ s.q.push({k:'react',i:t,by:i}); }
  s.q.push({k:'talkNext'}); }
function npcTalk(s,i){ const p=P(s,i), sus=belief(s,i), others=ALL.filter(j=>j!==i);
  if(s.role[i]){ const mate=s.role[i]==='K'?s.Q:s.K, inno=others.filter(j=>!s.role[j]);
    const heat=j=>s.claims.filter(c=>c.t===j&&(c.kind==='accuse'||c.kind==='reportY')).length;
    const frame=inno.sort((a,b)=>heat(b)-heat(a)+(Math.random()-.5))[0];
    if(s.qa[i]) return heat(mate)>0&&Math.random()<.6 ? ['reportN',mate] : ['reportY',frame];
    if(heat(mate)>=1&&Math.random()<p.bluff*.5) return ['clear',mate];
    return Math.random()<.75 ? ['accuse',frame] : ['quiet',null]; }
  if(s.qa[i]) return [s.qa[i].ans?'reportY':'reportN', s.qa[i].t];
  const t=others.sort((a,b)=>sus[b]-sus[a])[0];
  if(sus[t]>.5&&Math.random()<.4+p.aggr*.6) return ['accuse',t];
  const lo=others.sort((a,b)=>sus[a]-sus[b])[0]; if(sus[lo]<.15&&Math.random()<p.trust) return ['clear',lo];
  return Math.random()<p.talk*.6 ? ['accuse',t] : ['quiet',null]; }
function startVote(s){ s.phase='vote'; s.turn=null; s.actor=null; s.vi=0; s.notice='🎙️ 투표 — 킹·퀸이라고 생각하는 두 사람을 고르세요'; s.log.push('🗳️ 투표'); }
function npcVote(s,i){ if(s.role[i]){ const inno=ALL.filter(j=>!s.role[j]); const heat=j=>s.claims.filter(c=>c.t===j&&(c.kind==='accuse'||c.kind==='reportY')).length;
    return inno.sort((a,b)=>heat(b)-heat(a)+(Math.random()-.5)*.8).slice(0,2); }
  return top2(belief(s,i),i); }
function settle(s){
  const right=v=>v&&v.includes(s.K)&&v.includes(s.Q), correct=ALL.filter(i=>right(s.votes[i])).length;
  s.cwin = correct>=3; s.correct=correct;
  s.score=ALL.map(i=>{ const t=s.took[i]||{c:0,imm:false}; let x=t.c+(t.imm?IMMV:0); if(s.cwin){ if(!s.role[i]&&right(s.votes[i])) x+=6; } else if(s.role[i]) x+=10; return x; });
  s.phase='result'; s.notice = s.cwin ? `🎙️ 정답 ${correct}표! 👑 ${nm(s.K)} · 👸 ${nm(s.Q)} — 일반 플레이어 승리` : `🎙️ 정답 ${correct}표뿐… 👑 ${nm(s.K)} · 👸 ${nm(s.Q)} — 킹·퀸 승리!`;
  s.log.push(s.notice.replace('🎙️ ','🏁 '));
  s.dlist=ALL.filter(i=>!isH(i)); s.dj=0;
}
function endGame(s){ s.phase='over'; s.turn=null; const a=s.score[HSEAT[0]], b=s.score[HSEAT[1]]; s.winner = a>b?0 : b>a?1 : 'both'; { const V=h=>s.score[h], bv=Math.max(...HSEAT.map(V)); s.winners=HSEAT.map((h,p)=>V(h)===bv?p:-1).filter(x=>x>=0); } s.ev++; }
function apply(s,p,a){ syncH(s);
  if(s.winner!=null) return '게임이 끝났어요';
  const seat=HSEAT[p]; if(!a) return '알 수 없는 동작';
  if(a.k==='queen'){ if(s.phase!=='queen'||s.K!==seat) return '지금은 퀸을 고를 때가 아니에요'; const q=a.t|0; if(!(q>=0&&q<N)||q===seat) return '퀸을 고르세요'; setQueen(s,q); s.ev++; return null; }
  if(a.k==='order'){ if(s.phase!=='order'||s.K!==seat) return '지금은 순서를 정할 때가 아니에요'; const o=(a.o||[]).map(x=>x|0); if(o.length!==N||new Set(o).size!==N||o.some(x=>!(x>=0&&x<N))) return '6명 모두 순서를 정하세요'; setOrder(s,o); s.ev++; return null; }
  if(a.k==='take'){ if(s.phase!=='take'||s.actor!==seat) return '내 차례가 아니에요'; const c=a.c|0; if(c<0||c>s.pot) return `0~${s.pot}까지 가져갈 수 있어요`; take(s,seat,c,a.imm); s.ev++; return null; }
  if(a.k==='ask'){ if(s.phase!=='ask'||s.actor!==seat) return '질문 차례가 아니에요'; const t=a.t|0; if(!(t>=0&&t<N)||t===seat) return '물어볼 사람을 고르세요'; ask(s,seat,t); s.ev++; return null; }
  if(a.k==='say'){ if(s.phase!=='talk'||s.actor!==seat) return '내 차례가 아니에요'; if(!HUMAN[a.kind]) return '할 말을 고르세요';
    if(a.kind!=='quiet'){ const t=a.t|0; if(!(t>=0&&t<N)||t===seat) return '대상을 고르세요'; if((a.kind==='reportY'||a.kind==='reportN')&&!s.qs.includes(seat)) return '질문권이 있는 사람만 결과를 말할 수 있어요'; speak(s,seat,a.kind,t); } else speak(s,seat,'quiet',null); s.ev++; return null; }
  if(a.k==='vote'){ if(s.phase!=='vote') return '지금은 투표 시간이 아니에요'; if(s.votes[seat]) return '이미 투표했어요'; const v=[...new Set((a.v||[]).map(x=>x|0))].filter(x=>x>=0&&x<N&&x!==seat); if(v.length!==2) return '두 사람을 고르세요'; s.votes[seat]=v; s.ev++; return null; }
  return '알 수 없는 동작';
}
function stepDelay(s){ syncH(s);
  if(s.winner!=null) return null;
  if(s.phase==='intro') return 2400;
  if(s.q.length) return s.q[0].k==='note'?1800 : s.q[0].k==='react'?1400 : 700;
  if(['queen','order','take','ask','talk'].includes(s.phase)) return (s.phase==='queen'||s.phase==='order') ? (isH(s.K)?null:s.think) : (isH(s.actor)?null:s.think);
  if(s.phase==='vote'){ if(s.vi<N){ const i=ALL[s.vi]; return isH(i)?(s.votes[i]?300:null):800+Math.random()*900; } return 900; }
  if(s.phase==='reveal') return s.rev<N?1300:1500;
  if(s.phase==='result') return 3000;
  if(s.phase==='debrief') return s.dj<s.dlist.length?2200:1200;
  return null;
}
function step(s){ syncH(s);
  if(s.phase==='intro'){ begin(s); s.ev++; return; }
  if(s.q.length){ const e=s.q.shift();
    if(e.k==='note'){ s.notice=e.text; s.log.push(e.text); }
    else if(e.k==='nextTake') nextTake(s); else if(e.k==='ask') startAsk(s); else if(e.k==='askNext') askNext(s); else if(e.k==='talk') startTalk(s); else if(e.k==='talkNext') talkNext(s);
    else if(e.k==='react'){ const st=STYLE[P(s,e.i).id]; const t = s.role[e.i] ? (lineOf(s,e.i,'defend')||'저 아니에요 진짜로!') : (P(s,e.i).temper>.6?`${nm(e.by)}, 그쪽이 더 수상해요!`:'…저 아니에요.');
      s.say={seat:e.i,text:t,n:(s.say?s.say.n:0)+1}; s.log.push(`${nm(e.i)}: ${t}`); s.claims.push({by:e.i,kind:'accuse',t:e.by,react:true}); }
    s.ev++; return; }
  if(s.phase==='queen'&&!isH(s.K)){ const c=ALL.filter(j=>j!==s.K); setQueen(s, Math.random()<.4&&c.some(isH) ? U.pick(c.filter(isH)) : U.pick(c)); s.ev++; return; }
  if(s.phase==='order'&&!isH(s.K)){ setOrder(s,npcOrder(s)); s.ev++; return; }
  if(s.phase==='take'&&!isH(s.actor)){ const [c,imm]=npcTake(s,s.actor); take(s,s.actor,c,imm); s.ev++; return; }
  if(s.phase==='ask'&&!isH(s.actor)){ ask(s,s.actor,npcAskTarget(s,s.actor)); s.ev++; return; }
  if(s.phase==='talk'&&!isH(s.actor)){ const [k,t]=npcTalk(s,s.actor); speak(s,s.actor,k,t); s.ev++; return; }
  if(s.phase==='vote'){ if(s.vi<N){ const i=ALL[s.vi]; if(!isH(i)) s.votes[i]=npcVote(s,i); if(s.votes[i]){ s.vi++; s.notice=`🗳️ ${nm(i)} 투표 완료 (${s.vi}/${N})`; } s.ev++; return; }
    s.phase='reveal'; s.rev=0; s.notice='🎙️ 개표합니다'; s.ev++; return; }
  if(s.phase==='reveal'){ if(s.rev<N){ const i=ALL[s.rev++], v=s.votes[i]; s.notice=`🗳️ ${nm(i)} → ${v.map(nm).join(' · ')}`; s.log.push(s.notice); s.ev++; return; }
    settle(s); s.ev++; return; }
  if(s.phase==='result'){ s.phase='debrief'; s.ev++; return; }
  if(s.phase==='debrief'){ if(s.dj<s.dlist.length){ const i=s.dlist[s.dj++]; let t;
      if(s.role[i]) t=U.pick(KQL[s.cwin?'reveal':'win']).split('{r}').join(s.role[i]==='K'?'👑 킹':'👸 퀸');
      else { const tp=top2(belief(s,i),i)[0]; t='(속마음) '+(lineOf(s,i,'confess',tp)||'…'); if(s.qa[i]) t+=` — 집사 답: ${nm(s.qa[i].t)} ${s.qa[i].ans?'⭕':'❌'}`; }
      s.say={seat:i,text:t,n:(s.say?s.say.n:0)+1}; s.log.push(`💭 ${nm(i)}: ${t}`); s.ev++; return; }
    endGame(s); return; }
}
function mask(s,p){ syncH(s); const v=U.clone(s), me=HSEAT[p], open=s.phase==='result'||s.phase==='debrief'||s.phase==='over';
  if(!open){ v.role=s.role.map((r,i)=> knows(s,me,i)&&s.role[me] ? r : i===me ? r : null); v.K = s.role[me]||me===s.K ? s.K : null; v.Q = s.role[me] ? s.Q : null;
    v.qa=s.qa.map((x,i)=>i===me?x:(x?{hidden:true}:null)); }
  if(s.phase==='vote') v.votes=s.votes.map((x,i)=>i===me?x:(x?'?':null));
  if(s.phase==='reveal') v.votes=s.votes.map((x,i)=>i===me||ALL.indexOf(i)<s.rev?x:(x?'?':null));
  v.q=[]; v.used={}; v.think=null; v.draft=null; return v; }
/* 혼자 모드의 두 번째 사람 자리 — 공개 정보 + 내 비밀 정보만 */
function ai(v){ syncH(v); const seat=HSEAT[1]; const fake={...v, who:v.who, role:v.role.slice()};
  if(v.phase==='queen'&&v.K===seat) return {k:'queen', t:U.pick(ALL.filter(j=>j!==seat))};
  if(v.phase==='order'&&v.K===seat){ const o=U.shuffle(ALL.filter(j=>j!==seat&&!v.role[j])); const q=ALL.find(j=>v.role[j]==='Q'); return {k:'order', o:[seat].concat(o.slice(0,2),[q],o.slice(2))}; }
  if(v.phase==='take'&&v.actor===seat){ const left=N-v.di; return {k:'take', c:Math.round(v.pot/left), imm:v.imm&&Math.random()<.3}; }
  if(v.phase==='ask'&&v.actor===seat){ return {k:'ask', t:U.pick(ALL.filter(j=>j!==seat&&!v.role[j]))}; }
  if(v.phase==='talk'&&v.actor===seat){ const sus=belief(fake,seat); if(v.qa[seat]&&!v.qa[seat].hidden) return {k:'say', kind: v.role[seat]?'reportY':(v.qa[seat].ans?'reportY':'reportN'), t: v.role[seat]?ALL.find(j=>j!==seat&&!v.role[j]):v.qa[seat].t};
    return {k:'say', kind:'accuse', t:top2(sus,seat)[0]}; }
  if(v.phase==='vote'&&!v.votes[seat]){ return {k:'vote', v: v.role[seat] ? ALL.filter(j=>!v.role[j]&&j!==seat).slice(0,2) : top2(belief(fake,seat),seat)}; }
  return null; }

/* 화면 */
let WHO={}, sel=[], draft=[], takeC=3, takeImm=false, sig='';
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function josa(name,a,b){ const base=name.replace(/\(나\)$/,''), c=base.charCodeAt(base.length-1); return c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28 ? a : b; }
const JO={'이(가)':['이','가'],'은(는)':['은','는'],'을(를)':['을','를']};
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}(이\(가\)|은\(는\)|을\(를\))?/g,(_,d,j)=>{ const n=seatName(+d,ctx); return `${seatEmoji(+d)} ${n}${j?josa(n,JO[j][0],JO[j][1]):''}`; }); }
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{}; const me=HSEAT[ctx.me];
  const sg=v.phase+':'+v.di+':'+v.ti+':'+v.ai; if(sg!==sig){ sig=sg; sel=[]; if(v.phase==='take') takeC=Math.min(takeC,v.pot); }
  const myTurn = v.turn===ctx.me;
  const role = v.role[me]==='K'?'👑 킹':v.role[me]==='Q'?'👸 퀸':'🙂 일반 플레이어';
  let h=`<div class="info">내 역할: <b>${role}</b>${v.role[me]?` · 짝: ${fill(nm(v.role[me]==='K'?v.Q:v.K),ctx)}`:''} · 남은 상금 <b>💰${v.pot}</b>${v.imm?' · 🛡️ 면제권 남음':' · 🛡️ 나감'}</div>`;
  h+=`<div class="hl-notice">${fill(U.esc(v.notice||''),ctx)}</div>`;
  h+=`<div class="vr-speech">${v.say?`<span class="w">${seatEmoji(v.say.seat)} ${seatName(v.say.seat,ctx)}</span> ${fill(U.esc(v.say.text),ctx)}`:'<i>　</i>'}</div>`;
  const pickMode = myTurn && (v.phase==='queen'||v.phase==='order'||v.phase==='ask'||v.phase==='talk') || (v.phase==='vote'&&!v.votes[me]);
  const open = v.phase==='result'||v.phase==='debrief'||v.phase==='over';
  h+=`<div class="ev-seats">${ALL.map(i=>{ const tk=v.took[i], pos=v.order.indexOf(i), r=v.role[i];
      const can = pickMode && i!==me && !(v.phase==='order'&&draft.includes(i)); const seld = sel.includes(i) || (v.phase==='order'&&draft.includes(i));
      return `<button class="ev-seat ${i===me?'me':''} ${v.actor===i?'act':''} ${seld?'sel':''}" data-t="${i}" ${can||(v.phase==='order'&&myTurn&&i===me&&!draft.includes(i))?'':'disabled'}>
        <div class="ev-nm">${seatEmoji(i)} ${seatName(i,ctx)} ${r?(r==='K'?'👑':'👸'):''}</div>${isH(i)?'':`<small class="ev-arch">${NPCI(i)[2]}</small>`}
        <div class="ev-prof">${pos>=0?`${pos+1}번째${v.qs.includes(i)?' · ❓':''}`:(v.phase==='order'&&draft.includes(i)?`${draft.indexOf(i)+1}번째`:'순서 ?')}</div>
        <div class="ev-mind">${tk?`💰${tk.c}${tk.imm?' 🛡️':''}`:''}${v.qa[i]&&!v.qa[i].hidden?` ❓→${seatEmoji(v.qa[i].t)}${v.qa[i].ans?'⭕':'❌'}`:''}</div>
        ${open&&v.score?`<div class="ev-tally">점수 ${v.score[i]}</div>`:v.phase==='vote'?`<div class="ev-tally">${v.votes[i]?'✅':'…'}</div>`:''}
      </button>`; }).join('')}</div>`;
  if(myTurn&&v.phase==='queen') h+=`<div class="vr-card"><b>👑 당신이 킹이에요! 퀸을 고르세요</b><p>퀸은 나와 한 편 — 끝까지 둘 다 안 들키면 승리. ${sel.length?`→ ${fill(nm(sel[0]),ctx)}`:'위에서 한 사람을 누르세요'}</p><div class="fh-act"><button data-a="queen" ${sel.length?'':'disabled'}>이 사람을 퀸으로</button></div></div>`;
  if(myTurn&&v.phase==='order') h+=`<div class="vr-card"><b>📋 분배 순서 정하기</b><p>위에서 1번째부터 차례로 누르세요(나 포함). 앞 순번일수록 돈을 많이 챙길 수 있고, <b>마지막 세 명은 집사 질문권</b>을 받아요. 지금: ${draft.map(i=>fill(nm(i),ctx)).join(' → ')||'-'}</p><div class="fh-act"><button class="ghost" data-a="redo">다시</button><button data-a="order" ${draft.length===N?'':'disabled'}>확정</button></div></div>`;
  if(myTurn&&v.phase==='take'){ takeC=Math.max(0,Math.min(v.pot,takeC)); h+=`<div class="vr-card"><b>🚪 분배 방 — 혼자 들어왔어요</b><p>남은 상금 💰${v.pot}. 가져간 양은 나갈 때 모두에게 알려져요. 너무 많이 가져가면 킹·퀸으로 의심받을 수도!</p>
      <div class="bs-amt"><button class="ghost" data-a="m">−</button><b>💰 ${takeC}</b><button class="ghost" data-a="p">+</button></div>
      ${v.imm?`<label class="kq-imm"><input type="checkbox" data-imm ${takeImm?'checked':''}> 🛡️ 면제권도 가져가기 (+${IMMV}점)</label>`:''}<div class="fh-act"><button data-a="take">가지고 나가기</button></div></div>`; }
  if(myTurn&&v.phase==='ask') h+=`<div class="vr-card"><b>❓ 집사에게 몰래 질문</b><p>"○○는 킹이나 퀸인가요?" 답은 나만 알아요. ${sel.length?`→ ${fill(nm(sel[0]),ctx)}`:'위에서 한 사람을 누르세요'}</p><div class="fh-act"><button data-a="ask" ${sel.length?'':'disabled'}>질문하기</button></div></div>`;
  if(myTurn&&v.phase==='talk'){ const isQ=v.qs.includes(me); h+=`<div class="vr-card"><b>💬 한마디</b> <small>${sel.length?`대상: ${fill(nm(sel[0]),ctx)}`:'위에서 사람을 먼저 누르세요'}</small><div class="fh-act">
      ${isQ?`<button data-say="reportY" ${sel.length?'':'disabled'}>📰 "집사가 맞대요"</button><button data-say="reportN" ${sel.length?'':'disabled'}>📰 "집사가 아니래요"</button>`:''}
      <button data-say="accuse" ${sel.length?'':'disabled'} style="background:#b8412f">🤨 킹·퀸 같아요</button><button data-say="clear" ${sel.length?'':'disabled'}>🙆 아닌 것 같아요</button><button class="ghost" data-say="quiet">🤐 넘기기</button></div>${isQ?'<small>질문 결과는 사실대로 말해도, 거짓말해도 돼요.</small>':''}</div>`; }
  if(v.phase==='vote'&&!v.votes[me]) h+=`<div class="vr-card"><b>🗳️ 킹·퀸 두 사람</b> <small>${sel.map(i=>fill(nm(i),ctx)).join(' · ')||'위에서 두 사람을 누르세요'}</small><div class="fh-act"><button data-a="vote" ${sel.length===2?'':'disabled'}>투표</button></div></div>`;
  if(v.phase==='over') h+=`<div class="sn-score">${ALL.slice().sort((a,b)=>v.score[b]-v.score[a]).map(i=>`<div class="${isH(i)?'h':''}"><b>${seatEmoji(i)} ${seatName(i,ctx)} ${v.role[i]==='K'?'👑':v.role[i]==='Q'?'👸':''}</b> 점수 ${v.score[i]} <small>(💰${v.took[i]?v.took[i].c:0}${v.took[i]&&v.took[i].imm?' + 🛡️':''}${v.cwin?(!v.role[i]&&v.votes[i]&&v.votes[i].includes(v.K)&&v.votes[i].includes(v.Q)?' + 맞힘 6':''):(v.role[i]?' + 승리 10':'')})</small></div>`).join('')}</div>`;
  const L=`<div class="side-box"><div class="side-h">🧠 마음 지도 <small>공개된 것</small></div>${ALL.map(i=>{ const cs=v.claims.filter(c=>c.by===i&&!c.react); const tk=v.took[i];
      return `<div class="side-row ${i===me?'me':''}" style="flex-wrap:wrap">${seatEmoji(i)} ${seatName(i,ctx)} <small>${v.order.indexOf(i)>=0?`${v.order.indexOf(i)+1}번`:''}${v.qs.includes(i)?' ❓':''}${tk?` · 💰${tk.c}${tk.imm?'🛡️':''}`:''}</small><div class="hl-st">${cs.map(c=>c.kind==='reportY'?`📰${seatEmoji(c.t)}⭕`:c.kind==='reportN'?`📰${seatEmoji(c.t)}❌`:c.kind==='accuse'?`🤨${seatEmoji(c.t)}`:c.kind==='clear'?`🙆${seatEmoji(c.t)}`:'🤐').join(' ')||'-'} · 받은 의심 <b>${v.claims.filter(c=>c.t===i&&(c.kind==='accuse'||c.kind==='reportY')).length}</b></div></div>`; }).join('')}</div>`;
  const R=`<div class="side-box side-log"><div class="side-h">📜 진행 기록 <small>최근이 위</small></div>${v.log.slice(-60).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=`<div class="side3"><div class="side-mid">${h}</div><aside class="side-l">${L}</aside><aside class="side-r">${R}</aside></div>`;
  el.onchange=e=>{ if(e.target.matches('[data-imm]')) takeImm=e.target.checked; };
  el.onclick=e=>{
    const t=e.target.closest('[data-t]'); if(t&&!t.disabled){ const i=+t.dataset.t;
      if(v.phase==='order'){ if(!draft.includes(i)) draft.push(i); return ctx.rerender(); }
      if(v.phase==='vote'){ sel = sel.includes(i)?sel.filter(x=>x!==i):sel.concat([i]).slice(-2); return ctx.rerender(); }
      sel = sel[0]===i?[]:[i]; return ctx.rerender(); }
    const sy=e.target.closest('[data-say]'); if(sy&&!sy.disabled) return ctx.act({k:'say',kind:sy.dataset.say,t:sel[0]});
    const a=e.target.closest('[data-a]'); if(!a||a.disabled) return; const k=a.dataset.a;
    if(k==='queen') return ctx.act({k:'queen',t:sel[0]}); if(k==='redo'){ draft=[]; return ctx.rerender(); }
    if(k==='order'){ const o=draft.slice(); draft=[]; return ctx.act({k:'order',o}); }
    if(k==='m'){ takeC=Math.max(0,takeC-1); return ctx.rerender(); } if(k==='p'){ takeC=Math.min(v.pot,takeC+1); return ctx.rerender(); }
    if(k==='take'){ const im=takeImm; takeImm=false; return ctx.act({k:'take',c:takeC,imm:im}); }
    if(k==='ask') return ctx.act({k:'ask',t:sel[0]}); if(k==='vote') return ctx.act({k:'vote',v:sel});
  };
}
function status(v,ctx){ syncH(v); if(v.phase==='over') return ''; if(v.turn===ctx.me) return {queen:'퀸을 고르세요',order:'분배 순서를 정하세요',take:'얼마나 가져갈까요?',ask:'집사에게 질문하세요',talk:'한마디 하세요'}[v.phase]||'';
  if(v.phase==='vote'&&!v.votes[HSEAT[ctx.me]]) return '투표하세요'; return '진행 중…'; }
const guide=`
<p><b>숨은 👑 킹·👸 퀸 찾기 + 상금 나누기</b> (우리 둘 + 성격 다른 컴퓨터 플레이어 4명).</p>
<ol><li>몰래 정해진 <b>👑 킹</b>이 <b>👸 퀸</b>을 고르고, 둘이 <b>분배 순서</b>를 정해요.</li>
<li>순서대로 혼자 방에 들어가 <b>상금 💰${POT}</b> 중 원하는 만큼 + <b>🛡️ 면제권</b>(1장, 먼저 가져가는 사람 것)을 가져가요. 나올 때 가져간 양이 공개돼요.</li>
<li><b>마지막 세 순번</b>은 집사에게 "○○는 킹·퀸인가요?"를 몰래 물어요(답은 본인만).</li>
<li>한 사람씩 발언: 📰 질문 결과(<b>거짓말 가능</b>) · 🤨 의심 · 🙆 감싸기.</li>
<li>모두 <b>킹·퀸 두 사람</b>에게 투표. <b>정답 표 3표 이상</b>이면 일반 플레이어 승리(맞힌 사람 +6), 아니면 킹·퀸 승리(둘 다 +10).</li></ol>
<p>점수 = 가져간 💰 + 🛡️(${IMMV}) + 보너스. 우리 둘 중 점수가 높은 쪽이 승리.</p>
<div class="tipbox">💡 <b>팁</b><br>· 킹은 자기 편을 앞 순번에 두기 쉬워요. 그런데 영리한 킹은 퀸을 <b>질문 자리</b>에 숨겨 거짓 결과를 퍼뜨리기도!<br>· 내가 확실히 아는 것과 다른 "질문 결과"를 말한 사람은 거짓말쟁이 — 킹·퀸이에요.<br>· 원작(9명)을 6명에 맞게 다듬었어요(질문권은 그대로 3명, 추가 질문 구매는 뺌).</div>`;
window.GAMES.kingqueen = { _sync:x=>syncH(x), maxH:6,
  title:'분배 게임', ref:'피의 게임 「분배 게임」', emoji:'👑', tags:['정체 숨기기','추리','NPC','두뇌서바이벌'],
  tagline:'숨은 킹과 퀸이 정한 순서대로 상금을 나눈다. 거짓 질문 결과 속에서 두 사람을 찾아라.',
  guide, init, apply, mask, ai, render, status, step, stepDelay, noPersona:true, wide:true,
  aiDelay:()=>1600+Math.random()*1800,
  reset(){ sig=''; sel=[]; draft=[]; takeC=3; takeImm=false; },
  bar:(v,i)=>`<span class="tag">${v.took[HSEAT[i]]?`💰${v.took[HSEAT[i]].c}`:'💰-'}</span>`,
  result:(v,ctx)=>{ const me=HSEAT[ctx.me]; return v.score?`점수 ${v.score[me]}${v.role[me]?(v.role[me]==='K'?' · 👑 킹':' · 👸 퀸'):''}`:''; },
  _belief:belief,
};
})();
