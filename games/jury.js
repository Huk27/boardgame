(function(){
'use strict';
/* 배심원 (더 지니어스 시즌 3 · 2회 메인 매치) — 8인(우리 둘 + NPC 6명)용. 우리 둘은 늘 서로 다른 팀.
   시민 5(🧑‍⚖️ 시민 리더 · 시민 4) vs 범죄자 3(🕶️ 범죄자 리더 · 범죄자 2). 범죄자 둘은 서로 알지만 범죄자 리더가 누군지는 모름. 범죄자 리더는 두 범죄자를 앎. 시민 리더도 두 범죄자를 앎(범죄자 리더는 모름).
   라운드마다 배심원장(차례로)이 배심원단을 지명(3·4·4·5·5명, 본인 포함 가능) → 전원 찬반(과반 찬성) → 배심원들이 몰래 유죄/무죄.
   유죄는 만장일치여야 성립(4라운드만 무죄 2표가 있어야 무죄). 시민은 유죄 3번, 범죄자는 무죄 3번이면 재판 승리 — 단 진 팀 리더가 상대 리더를 맞히면 역전승. 3번 연속 부결이면 다음 배심원단은 투표 없이 재판. */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로 — 고르게 퍼지게, 나머지는 NPC */
const N=8, SIZE=[3,4,4,5,5]; let HSEAT=[0,4]; const SEATORD=[0,4,2,6,1,5,3,7];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i), ALL=[...Array(N).keys()];
const nm=i=>`{s${i}}`;
const RN={cl:'🧑‍⚖️ 시민 리더', c:'🙂 시민', kl:'🕶️ 범죄자 리더', k:'🦹 범죄자'};
const isK=r=>r==='k'||r==='kl';
const STYLE={seojin:'logic', doyun:'warm', haram:'calm', yuna:'emo', minho:'sly', taekyung:'hot', jihu:'sly', soyul:'warm'};
const DEF_P={talk:.6,aggr:.5,trust:.5,bluff:.5,logic:.6,temper:.4};
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
const LINES={
  logic:{acc:['무죄가 나온 재판마다 {t}이(가) 있었어요.','{t}, 기록이 말해 줘요.'], trust:['{t}은(는) 유죄 재판에만 있었어요. 믿어요.'], pick:['이 조합이 확률상 가장 깨끗해요.'], guess:['{t}. 행동 패턴이 리더였어요.']},
  warm:{acc:['{t}… 좀 걸려요 🥲'], trust:['{t}은(는) 믿어요 🤝'], pick:['믿는 사람들로 갈게요 😊'], guess:['{t}… 맞죠? 🙏']},
  calm:{acc:['…{t}.'], trust:['…{t}은(는) 괜찮아요.'], pick:['…이렇게.'], guess:['…{t}.']},
  emo:{acc:['{t} 수상해!! 😣'], trust:['{t}은(는) 착한 사람이야!'], pick:['느낌대로 갈래요!'], guess:['{t}!! 너지?! 😱']},
  sly:{acc:['{t}, 표정 관리 좀 😏'], trust:['{t}은(는) 제가 보증해요 😏'], pick:['재밌게 골라 볼게요 😏'], guess:['{t}, 잡았다 😏']},
  hot:{acc:['{t}! 확실해요! 🔥'], trust:['{t}은(는) 내 편!'], pick:['이 멤버로 간다! 🔥'], guess:['{t}! 끝이에요 🔥']},
};
const RT={
  twice:['무죄 나온 재판 두 번 다 {t}이(가) 있었어요.','{t}, 무죄 재판에 벌써 두 번이에요.'],
  inno:['{x}번째 재판 무죄 {n}표, 그 배심원 중에 {t}이(가) 있었어요.','{x}번째 재판에서 무죄가 나왔는데 {t}이(가) 배심원이었죠.'],
  picked:['{t}이(가) 배심원장일 때 뽑은 팀에서 무죄가 나왔어요.','{x}번째 재판, {t}이(가) 직접 뽑은 배심원단이 무죄였어요.'],
  approve:['{t}은(는) 무죄 나온 배심원단에 찬성했죠.','{x}번째 재판, {t}이(가) 그 배심원단에 찬성표를 줬어요.'],
  reject:['{t}, {x}번째 재판은 유죄가 나왔는데 왜 반대했어요?','유죄 나올 깨끗한 배심원단에 {t}이(가) 반대했어요.'],
  clean:['{t}은(는) {x}번째 유죄 재판 배심원이었어요.','{t}은(는) 유죄 재판에만 있었어요.'],
};
const XL={
  close:['{t}이(가) 제일 걸려요.','다음 배심원단에선 {t}을(를) 빼고 싶어요.','{t}, 설명해 줄래요?','저는 {t} 쪽에 걸게요.'],
  trustC:['{t}은(는) 믿어요 🤝','{t}은(는) 다음에도 넣고 싶어요.','{t} 쪽은 깨끗해 보여요.'],
  ask:['{t}, 지금까지 재판 보고 누구 의심해요?','{t} 생각부터 들어 볼래요. 누가 걸려요?','{t}, 다음 배심원단 누구로 가면 좋겠어요?'],
  reb_inno:['그 재판엔 {x}도 있었잖아요.','무죄 표는 제가 아니에요. {x} 쪽을 보세요.','저는 유죄 냈어요. 같이 있던 {x}한테 물어봐요.'],
  reb_twice:['두 번 다 운이 나빴어요. 같이 있던 {x}도 봐요.','저만 두 번이에요? {x}도 두 번이에요.'],
  reb_picked:['제가 뽑은 사람 중에 범죄자가 있었던 거죠. 저도 속았어요.','그땐 다들 깨끗해 보였어요.'],
  reb_approve:['그땐 그 배심원단이 깨끗해 보였어요.','찬성한 사람 저만 아니잖아요.'],
  reb_reject:['느낌이 안 좋았어요. 결과론이에요.','반대는 신중했던 거예요. 그게 죄예요?'],
  reb_none:['{t}, 근거가 뭐예요?','이유도 없이 저를요? 기록부터 봐요.'],
  nervous:['저, 저는 유죄 냈어요… 진짜로요 😅','왜 저예요… 저 아니에요 😅','아, 그게… 저는 유죄였어요 😅'],
  sweat:['{t}, 방금 엄청 당황했죠? 🤨','말 더듬는 거 다들 봤죠? {t} 같아요.'],
  ansSus:['저는 {x}이(가) 걸려요.','음… {x}요. 무죄 재판에 있었잖아요.'],
  ansNone:['아직은 잘 모르겠어요. 한 번 더 봐요.','기록이 더 쌓여야 알 것 같아요.'],
  agreeAcc:['{x} 말에 동의해요. {t}, 저도 걸려요.','저도 {t}요. 같은 기록을 봤어요.','{x} 말 듣고 확신했어요. {t}이에요.'],
  leak:['{t}이(가) 저한테 몰래 자기가 시민 리더라던데요? 🤭','다들 알아요? {t}, 몰래 시민 리더라고 했어요.'],
};
const OPTK=['trustC','ansNone','sweat'];
const MOOD={acc:'🤨',trust:'🤝',ask:'🧐',reb:'😤',nervous:'😅',sweat:'🤨',ans:'🙂',leak:'🤭',pick:'🎙️',guess:'🎯'};
function lineX(s,i,kind,o){ const L=XL[kind]; if(!L) return null; const used=(s.used[i]=s.used[i]||[]); o=o||{};
  const c=L.map(t=>t.split('{t}').join(o.t!=null?nm(o.t):'').split('{x}').join(o.x!=null?nm(o.x):'다른 사람')).filter(t=>!used.includes(t)); if(!c.length) return null; const t=U.pick(c); used.push(t); return t; }
/* j에 대해 공개 기록이 말해 주는 의심 근거 (없으면 null) */
function pubReason(s,j){ const T=s.trial, inn=T.filter(t=>t.res==='I'&&t.jury.includes(j));
  if(inn.length>=2){ const t=inn[inn.length-1]; return {k:'twice',x:t.r,n:t.inn,tr:t}; }
  if(inn.length){ const t=inn[0]; return {k:'inno',x:t.r,n:t.inn,tr:t}; }
  const pk=T.find(t=>t.res==='I'&&t.fore===j); if(pk) return {k:'picked',x:pk.r,tr:pk};
  const ap=T.find(t=>t.res==='I'&&t.votes&&t.votes[j]==='Y'&&!t.jury.includes(j)); if(ap) return {k:'approve',x:ap.r,tr:ap};
  const rj=T.find(t=>t.res==='G'&&t.votes&&t.votes[j]==='N'); if(rj) return {k:'reject',x:rj.r,tr:rj};
  return null; }
function cleanReason(s,j){ const g=s.trial.find(t=>t.res==='G'&&t.jury.includes(j)); return g?{k:'clean',x:g.r}:null; }
function rtText(r,j){ return U.pick(RT[r.k]).split('{t}').join(nm(j)).split('{x}').join(r.x??'').split('{n}').join(r.n??''); }
function talkT(s,i,text,kind,t){ if(!text) return false; s.say={seat:i,text,n:(s.say?s.say.n:0)+1,t:t??null,kind}; s.feed=s.feed||[]; s.feed.push({r:s.round,seat:i,text,t:t??null,kind}); s.log.push(`💬 ${nm(i)}: ${text}`); s.mood=s.mood||{}; s.mood[i]={e:MOOD[kind]||'💬',n:(s.moodN=(s.moodN||0)+1)}; return true; }
/* 지목 → 대답(반박·당황) 큐 */
function accuse(s,i,t,human){ const r=pubReason(s,t); let text;
  const prev=!human&&s.claims.filter(c=>c.r===s.round&&c.kind==='acc'&&c.t===t&&c.by!==i).slice(-1)[0];
  if(prev){ const t2=lineX(s,i,'agreeAcc',{t,x:prev.by}); if(!t2) return false; talkT(s,i,t2,'acc',t); s.claims.push({by:i,kind:'acc',t,r:s.round,why:'agree'}); return true; }
  if(human) text= r ? `🤨 ${rtText(r,t)} ${nm(t)}, 설명해 봐요.` : `🤨 ${nm(t)}, 좀 수상해요.`;
  else { if(!r) return false; const c=lineX(s,i,'close',{t}); if(!c) return false; text=rtText(r,t)+' '+c; }
  talkT(s,i,text,'acc',t); s.claims.push({by:i,kind:'acc',t,r:s.round,why:r?r.k:null});
  if(!isH(t)) s.q.unshift({k:'reply',i:t,by:i,rk:r?r.k:'none',tr:r&&r.tr?r.tr:null});
  return true; }
function lineOf(s,i,kind,t){ const st=STYLE[P(s,i).id]||'calm', L=(LINES[st]||LINES.calm)[kind]; if(!L) return ''; const used=(s.used[i]=s.used[i]||[]); const pool=L.filter(x=>!used.includes(x)); if(!pool.length) return ''; const raw=U.pick(pool); used.push(raw); return raw.split('{t}').join(t!=null?nm(t):''); }
function say(s,i,kind,t){ if(isH(i)) return; const x=lineOf(s,i,kind,t); if(x) talkT(s,i,x,kind,t); if(kind==='acc'||kind==='trust') s.claims.push({by:i,kind,t,r:s.round}); }

function init(starter,o){ const k=Math.max(2,Math.min(8,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  const s={phase:'intro', who:{}, starter:starter|0, role:Array(N).fill('c'), round:0, trial:[], fore:-1, jury:[], votes:Array(N).fill(null), fails:0, tv:{}, claims:[], log:[], q:[], say:null, used:{}, feed:[], mood:{}, dm:{}, dmN:0, pact:{}, wh:{}, clClaim:{}, leak:[], tell:{}, turn:null, actor:null, winner:null, ev:0, guess:null,
    notice:'🎙️ 메인 매치 「배심원」 — 시민은 유죄를, 범죄자는 무죄를'};
  const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=ids[k]);
  s.hs=HSEAT.slice(); const hk=Math.random()<.5?0:1; const crim=HSEAT.length>2?U.shuffle(ALL.slice()).slice(0,3):[HSEAT[hk]].concat(U.shuffle(ALL.filter(i=>!isH(i))).slice(0,2)); const kl=U.pick(crim); crim.forEach(i=>s.role[i]=i===kl?'kl':'k');
  const cits=ALL.filter(i=>!crim.includes(i)); s.role[U.pick(cits)]='cl';
  return s;
}
const pk=(a,b)=>a<b?a+'-'+b:b+'-'+a;
function dmPush(s,to,from,text,o){ if(!isH(to)) return; (s.dm[to]=s.dm[to]||[]).push(Object.assign({id:++s.dmN,r:s.round,from,text,state:'info'},o||{})); }
/* 라운드 시작: 역할에 맞는 귓속말 (나에게) */
function npcWhisper(s){ for(const h of HSEAT){ if(Math.random()>.5) continue; const hr=s.role[h];
  if(hr==='k'){ const m=ALL.find(j=>!isH(j)&&s.role[j]==='k'); if(m!=null){ dmPush(s,h,m,U.pick(['(동료) 우리 서로 찍지 마요 😏 무죄는 같이 배심원 되면 한 명만 내요.','(동료) 이번엔 제가 시민인 척 세게 갈게요. 맞춰 줘요 😏'])); continue; } }
  const cl=ALL.find(j=>!isH(j)&&s.role[j]==='cl'); if(cl!=null&&!isK(hr)||(cl!=null&&hr==='kl')){ const sus=belief(s,cl); if(sus[h]<.3&&s.round>=2&&Math.random()<.6){ const k=ALL.find(j=>s.role[j]==='k'&&j!==h); dmPush(s,h,cl,`${nm(k)} 조심해요. 이유는 못 말해요 🤫 (저를 티 내지 마요)`); s.clHint=s.clHint||{}; s.clHint[h]=cl; continue; } }
  const kk=ALL.find(j=>!isH(j)&&isK(s.role[j])&&!s.pact[pk(j,h)]); if(kk!=null&&!isK(hr)&&Math.random()<.5){ dmPush(s,h,kk,U.pick(['우리 몰래 연합해요. 서로 배심원단에 넣어 주고 찬성해 주기 🤝','둘이 손잡아요. 제가 배심원장 되면 꼭 넣어 줄게요 🤫']),{state:'open',kind:'pact'}); continue; }
  const ct=ALL.find(j=>!isH(j)&&!isK(s.role[j])&&!s.pact[pk(j,h)]&&belief(s,j)[h]<.35); if(ct!=null) dmPush(s,h,ct,'우리 몰래 연합해요. 서로 배심원단에 넣어 주고 찬성해 주기 🤝',{state:'open',kind:'pact'}); } }
const wins=s=>({c:s.trial.filter(t=>t.res==='G').length, k:s.trial.filter(t=>t.res==='I').length});
function know(s,i){ const r=s.role[i], K={}; K[i]=isK(r)?1:0; if(r==='k'){ ALL.forEach(j=>{ if(s.role[j]==='k') K[j]=1; }); }
  if(r==='kl'||r==='cl') ALL.forEach(j=>{ if(s.role[j]==='k') K[j]=1; }); return K; }
function belief(s,i){ const p=P(s,i), K=know(s,i); const sus=Array(N).fill(3/8);
  for(const t of s.trial){ for(const j of t.jury){ if(t.inn>0) sus[j]+= .1+t.inn/t.jury.length*.7*(.6+p.logic*.6); else sus[j]-=.2; } if(t.votes) ALL.forEach(j=>{ if(t.votes[j]==='Y'&&t.inn>0) sus[j]+=.05; if(t.votes[j]==='N'&&t.inn>0) sus[j]-=.03; }); }
  for(const c of s.claims){ if(c.by===i) continue; const cred=Math.max(.2,1-sus[c.by]); if(c.kind==='acc') sus[c.t]+=.07*p.trust*cred; if(c.kind==='trust') sus[c.t]-=.05*p.trust*cred; if(c.t===i&&c.kind==='acc'&&!isK(s.role[i])) sus[c.by]+=.08; }
  for(const j of ALL){ if(j!==i&&!isH(i)) sus[j]-=NPCS.rel(s.who[i], isH(j)?(pOf(j)===0?'me':'opp'):s.who[j])*.12; if(s.tell&&s.tell[j]) sus[j]+=.12*p.logic; if(s.pact&&s.pact[pk(i,j)]) sus[j]-=.15; }
  for(const j of ALL) sus[j]=Math.max(.02,Math.min(.98,sus[j])); for(const j in K) sus[j]=K[j]; return sus; }
function startRound(s){ s.round++; s.fore=(s.fore+1)%N; s.fails=0; beginNom(s); npcWhisper(s); }
function beginNom(s){ s.jury=[]; s.votes=Array(N).fill(null); s.phase='nom'; setTurn(s,s.fore); const n=SIZE[s.round-1];
  s.notice=`⚖️ ${s.round}번째 재판 — 배심원장 ${nm(s.fore)}이(가) ${n}명을 지명해요${s.round===4?' (이번엔 무죄 2표가 있어야 무죄)':''}`; s.log.push(`⚖️ ${s.round}번째 재판 · 배심원장 ${nm(s.fore)}`); }
function setTurn(s,i){ s.actor=i; s.turn=isH(i)?pOf(i):null; s.think=isH(i)?0:1500+Math.random()*1700; }
function npcPick(s,i){ const n=SIZE[s.round-1], sus=belief(s,i), r=s.role[i];
  if(isK(r)){ const mates=ALL.filter(j=>j!==i&&s.role[j]==='k'&&(r==='kl'||s.role[i]==='k')); const pick=[i]; if(s.round===4&&mates.length&&Math.random()<.6) pick.push(mates[0]);
    const others=ALL.filter(j=>!pick.includes(j)&&!isK(s.role[j])).sort((a,b)=>sus[a]-(s.pact[pk(i,a)]?.4:0)-sus[b]+(s.pact[pk(i,b)]?.4:0)); while(pick.length<n) pick.push(others.shift()??ALL.find(j=>!pick.includes(j))); return pick; }
  return [i].concat(ALL.filter(j=>j!==i).sort((a,b)=>sus[a]-(s.pact[pk(i,a)]?.3:0)-sus[b]+(s.pact[pk(i,b)]?.3:0)+(Math.random()-.5)*.08).slice(0,n-1)); }
function npcApprove(s,i){ const sus=belief(s,i), r=s.role[i];
  if(isK(r)) return s.jury.some(j=>s.role[j]==='k'||(r==='kl'&&isK(s.role[j]))||j===i) ? 'Y' : (Math.random()<.3?'Y':'N');
  if(r==='cl'&&s.jury.some(j=>s.role[j]==='k')) return 'N'; const mx=Math.max(...s.jury.map(j=>sus[j])); return mx<.4+(.5-P(s,i).trust)*.1 ? 'Y':'N'; }
function npcTrial(s,i){ const r=s.role[i]; if(!isK(r)) return 'G'; const ks=s.jury.filter(j=>isK(s.role[j])).length; const w=wins(s);
  if(s.round===4){ return ks>=2?'I':(Math.random()<.25?'I':'G'); }
  if(w.k>=2||w.c>=2) return 'I'; const others=s.jury.filter(j=>j!==i&&isK(s.role[j])&&(s.role[i]==='kl'||s.role[j]==='k')).length; const base=s.round===1?.3:.5; return Math.random()<base-P(s,i).bluff*.15-(others?.25:0) ? 'I':'G'; }
function act(s,i,a){
  if(a.k==='nom'){ if(s.phase!=='nom'||s.actor!==i) return '배심원장이 아니에요'; const j=[...new Set((a.j||[]).map(x=>x|0))].filter(x=>x>=0&&x<N); if(j.length!==SIZE[s.round-1]) return `${SIZE[s.round-1]}명을 고르세요`;
    s.jury=j; s.log.push(`👉 배심원단: ${j.map(nm).join(' ')}`); if(s.fails>=3){ s.notice='⚠️ 3번 연속 부결 — 이번 배심원단은 투표 없이 재판으로'; s.q.push({k:'trialStart'}); s.phase='wait'; s.turn=null; s.actor=null; return null; }
    s.phase='vote'; s.turn=null; s.actor=null; s.notice=`🙋 배심원단 ${j.map(nm).join(' ')} — 찬성? 반대?`; return null; }
  if(a.k==='vote'){ if(s.phase!=='vote') return '투표 시간이 아니에요'; if(s.votes[i]) return '이미 투표했어요'; if(a.v!=='Y'&&a.v!=='N') return '찬성 또는 반대'; s.votes[i]=a.v; return null; }
  if(a.k==='tv'){ if(s.phase!=='trial'||!s.jury.includes(i)) return '배심원이 아니에요'; if(s.tv[i]) return '이미 냈어요'; if(a.v!=='G'&&a.v!=='I') return '유죄 또는 무죄'; s.tv[i]=a.v; return null; }
  if(a.k==='talk'){ if(s.phase!=='talk'||s.actor!==i) return '발언 차례가 아니에요'; if(a.t!=null){ const t=a.t|0; if(t===i||!(t>=0&&t<N)) return '대상을 고르세요'; if(a.kind==='ask'){ talkT(s,i,`❓ ${nm(t)}, 지금까지 보고 누구 의심해요?`,'ask',t); if(!isH(t)) s.q.push({k:'reply',i:t,by:i,rk:'ask'}); s.phase='wait'; s.turn=null; s.actor=null; s.q.push({k:'talkNext'}); return null; } if(a.kind!=='trust'){ accuse(s,i,t,true); const r0=s.q.findIndex(x=>x.k==='reply'); if(r0>=0){ const rr=s.q.splice(r0,1)[0]; s.q.push(rr); } s.phase='wait'; s.turn=null; s.actor=null; s.q.push({k:'talkNext'}); return null; } { const cr=cleanReason(s,t); talkT(s,i,`🤝 ${cr?rtText(cr,t)+' ':''}${nm(t)}은(는) 믿어요.`,'trust',t); } s.claims.push({by:i,kind:'trust',t,r:s.round}); s.log.push(`${a.kind==='trust'?'🤝':'🤨'} ${nm(i)}: ${nm(t)}${a.kind==='trust'?'은(는) 믿어요':'이(가) 수상해요'}`); s.notice=s.log[s.log.length-1]; } else s.log.push(`🤐 ${nm(i)}: (넘김)`);
    s.phase='wait'; s.turn=null; s.actor=null; s.q.push({k:'talkNext'}); return null; }
  if(a.k==='dm'){ if(s.wh[i]===s.round) return '귓속말은 재판마다 한 번이에요'; const t=a.t; if(typeof t!=='number'||isH(t)||t===i) return '귓속말할 사람을 고르세요'; s.wh[i]=s.round; const p=P(s,t);
    if(a.what==='pact'){ dmPush(s,i,i,`(→ ${nm(t)}) 우리 몰래 연합해요. 서로 배심원단에 넣어 주고 찬성해 주기 🤝`,{mine:1}); const sus=belief(s,t);
      if(isK(s.role[t])||sus[i]<.4+p.trust*.15){ s.pact[pk(i,t)]={r:s.round}; dmPush(s,i,t,U.pick(['좋아요 🤫 둘만 아는 거예요.','콜! 서로 넣어 주기예요.'])); } else dmPush(s,i,t,'음… 아직은 못 믿겠어요.'); }
    else if(a.what==='cl'){ dmPush(s,i,i,`(→ ${nm(t)}) 몰래 말할게요. 저 시민 리더예요 🤫`,{mine:1});
      if(isK(s.role[t])){ s.clClaim[t]=i; ALL.forEach(j=>{ if(isK(s.role[j])&&s.role[j]!=='k'||s.role[j]==='k') s.clClaim[j]=i; }); dmPush(s,i,t,'오, 그렇구나… 비밀 지킬게요 😊'); }
      else if(s.role[t]==='cl'){ s.claims.push({by:t,kind:'acc',t:i,r:s.round}); dmPush(s,i,t,'…시민 리더는 저예요. 왜 거짓말해요? 🤨'); }
      else { dmPush(s,i,t,'알려 줘서 고마워요. 믿을게요 🤝'); if(p.bluff>.6&&Math.random()<.5) s.leak.push({i:t,h:i}); } }
    else return '알 수 없는 귓속말'; return null; }
  if(a.k==='dmReply'){ const m=(s.dm[i]||[]).find(x=>x.id===a.id&&x.state==='open'); if(!m) return '이미 답했어요'; m.state=a.yes?'yes':'no'; if(a.yes){ s.pact[pk(i,m.from)]={r:s.round}; dmPush(s,i,m.from,'좋아요. 서로 넣어 주기예요 🤫'); } else dmPush(s,i,m.from,'…알겠어요.'); return null; }
  if(a.k==='guess'){ if(s.phase!=='guess'||s.actor!==i) return '지목할 차례가 아니에요'; const t=a.t|0; if(t===i) return '다른 사람을'; resolveGuess(s,i,t); return null; }
  return '알 수 없는 동작'; }
function resolveGuess(s,i,t){ const target=s.wteam==='c'?'cl':'kl'; const ok=s.role[t]===target; s.guess={by:i,t,ok};
  s.notice=`🎯 ${nm(i)}의 지목: ${nm(t)} — ${ok?`정답! ${RN[target]}였어요. 역전승!`:'틀렸어요!'}`; s.log.push(s.notice); if(ok) s.wteam=s.wteam==='c'?'k':'c'; s.phase='reveal'; s.turn=null; s.actor=null; }
const INTER=['nom','vote','trial','talk','guess'];
function apply(s,p,a){ syncH(s); if(s.winner!=null) return '게임이 끝났어요'; if(!a) return '알 수 없는 동작'; if(!INTER.includes(s.phase)&&a.k!=='dm'&&a.k!=='dmReply') return '잠시만요 — 진행 중이에요'; if((a.k==='dm'||a.k==='dmReply')&&['intro','roles','reveal','debrief','over','guess'].includes(s.phase)) return '지금은 귓속말할 수 없어요'; const e=act(s,HSEAT[p],a); if(!e) s.ev++; return e; }
function stepDelay(s){ syncH(s); if(s.winner!=null) return null;
  if(s.phase==='intro') return 2400; if(s.phase==='roles') return 4200;
  if(s.phase==='nom'||s.phase==='talk'||s.phase==='guess') return isH(s.actor)?null:s.think;
  if(s.phase==='vote'){ if(ALL.every(i=>s.votes[i])) return 500; return ALL.some(i=>!isH(i)&&!s.votes[i])?500+Math.random()*600:null; }
  if(s.phase==='trial'){ if(s.jury.every(i=>s.tv[i])) return 700; return s.jury.some(i=>!isH(i)&&!s.tv[i])?900+Math.random()*900:null; }
  if(s.q.length){ const k=s.q[0].k; return k==='vrev'?700 : k==='note'?1700 : k==='trev'?1400 : k==='reply'||k==='sweatR'?2900 : 600; }
  if(s.phase==='reveal') return 2600; if(s.phase==='debrief') return s.dj<s.dlist.length?2200:1200; return null; }
function step(s){ syncH(s);
  if(s.phase==='intro'){ s.phase='roles'; s.notice=HSEAT.length===2&&mode!=='solo'?'🎭 역할이 정해졌어요 — 내 역할을 확인하세요 (우리 둘은 서로 다른 팀)':'🎭 역할이 정해졌어요 — 내 역할을 확인하세요 (사람끼리도 같은 팀일 수도, 다른 팀일 수도)'; s.ev++; return; }
  if(s.phase==='roles'){ startRound(s); s.ev++; return; }
  if(s.phase==='vote'){ const npc=ALL.find(i=>!isH(i)&&!s.votes[i]); if(npc!=null){ s.votes[npc]=npcApprove(s,npc); s.ev++; return; }
    if(ALL.every(i=>s.votes[i])){ s.phase='wait'; s.vshown=[]; ALL.forEach(i=>s.q.push({k:'vrev',i})); s.q.push({k:'vres'}); s.ev++; } return; }
  if(s.phase==='trial'){ const npc=s.jury.find(i=>!isH(i)&&!s.tv[i]); if(npc!=null){ s.tv[npc]=npcTrial(s,npc); s.log.push(`🗳️ ${nm(npc)} 판결 제출`); s.ev++; return; }
    if(s.jury.every(i=>s.tv[i])){ s.phase='wait'; s.q.push({k:'note',text:'🎙️ 판결을 공개합니다'}); s.q.push({k:'trev'}); s.ev++; } return; }
  if(INTER.includes(s.phase)&&!isH(s.actor)){ const i=s.actor;
    if(s.phase==='nom'){ const j=npcPick(s,i); if(Math.random()<P(s,i).talk*.5) say(s,i,'pick'); act(s,i,{k:'nom',j}); s.ev++; return; }
    if(s.phase==='talk'){ const sus=belief(s,i); const c=ALL.filter(j=>j!==i); const top=c.slice().sort((a,b)=>sus[b]-sus[a])[0], lo=c.slice().sort((a,b)=>sus[a]-sus[b])[0];
      const lk=(s.leak||[]).find(x=>x.i===i&&!x.done&&!isH(i)); if(lk){ lk.done=1; talkT(s,i,lineX(s,i,'leak',{t:lk.h}),'leak',lk.h); s.clClaim[i]=lk.h; ALL.forEach(j=>{ if(isK(s.role[j])) s.clClaim[j]=lk.h; }); dmPush(s,lk.h,i,'😱 내가 몰래 한 말을 모두 앞에서 폭로했어요!',{state:'bad'}); }
      else { let done=false;
        if(isK(s.role[i])){ const cand=c.filter(j=>!isK(s.role[j])||(s.role[i]==='k'&&s.role[j]==='kl')).filter(j=>pubReason(s,j)&&!s.pact[pk(i,j)]); if(cand.length) done=accuse(s,i,U.pick(cand)); }
        else if(s.role[i]==='cl'&&Math.random()<.12+P(s,i).temper*.2){ const k=ALL.find(j=>s.role[j]==='k'&&j!==i&&pubReason(s,j)); if(k!=null) done=accuse(s,i,k); }
        else if(sus[top]>.55&&!s.pact[pk(i,top)]){ const alt=c.filter(j=>j!==top&&sus[j]>.5&&pubReason(s,j)&&!s.claims.some(x=>x.r===s.round&&x.t===j)).sort((a,b)=>sus[b]-sus[a])[0]; const hit=s.claims.some(x=>x.r===s.round&&x.t===top&&x.kind==='acc'); done=accuse(s,i,hit&&alt!=null&&Math.random()<.6?alt:top); }
        if(!done){ const cr=cleanReason(s,lo); if(cr&&Math.random()<.5){ const c2=lineX(s,i,'trustC',{t:lo}); if(c2){ talkT(s,i,rtText(cr,lo)+' '+c2,'trust',lo); s.claims.push({by:i,kind:'trust',t:lo,r:s.round}); done=true; } }
          if(!done){ const t2=U.pick(c.filter(j=>j!==i)); talkT(s,i,lineX(s,i,'ask',{t:t2}),'ask',t2); if(!isH(t2)) s.q.unshift({k:'reply',i:t2,by:i,rk:'ask'}); } } }
      s.phase='wait'; s.turn=null; s.actor=null; s.q.push({k:'talkNext'}); s.ev++; return; }
    if(s.phase==='guess'){ resolveGuess(s,i,npcGuess(s,i)); say(s,i,'guess',s.guess.t); s.ev++; return; } }
  if(s.q.length){ const e=s.q.shift();
    if(e.k==='note'){ s.notice=e.text; s.log.push(e.text); }
    else if(e.k==='vrev'){ s.vshown.push(e.i); s.notice=`🙋 ${nm(e.i)}: ${s.votes[e.i]==='Y'?'⭕ 찬성':'❌ 반대'}`; }
    else if(e.k==='vres'){ const y=ALL.filter(i=>s.votes[i]==='Y').length; s.vshown=null;
      s.lastVotes=s.votes.slice(); if(y>N-y){ s.notice=`✅ 찬성 ${y} : 반대 ${N-y} — 재판 시작!`; s.log.push(s.notice); s.q.push({k:'trialStart'}); }
      else { s.fails++; s.notice=`❌ 찬성 ${y} : 반대 ${N-y} — 해산 (연속 ${s.fails}번)`; s.log.push(s.notice); s.fore=(s.fore+1)%N; beginNom(s); } }
    else if(e.k==='trialStart'){ s.phase='trial'; s.tv={}; s.turn=null; s.actor=null; s.notice=`🔒 배심원 ${s.jury.map(nm).join(' ')} — 몰래 유죄/무죄를 내요`; }
    else if(e.k==='trev'){ const inn=s.jury.filter(i=>s.tv[i]==='I').length; const res = s.round===4 ? (inn>=2?'I':'G') : (inn>=1?'I':'G');
      s.trial.push({r:s.round,jury:s.jury.slice(),inn,res,fore:s.fore,votes:(s.lastVotes||[]).slice()});
      for(const h of HSEAT) if(res==='I'&&s.jury.includes(h)) for(const j of s.jury){ if(j!==h&&!isH(j)&&s.pact[pk(h,j)]&&s.tv[j]==='I'&&s.tv[h]==='G'){ dmPush(s,h,j,`💔 연합한 사이인데, 같이 있던 재판에서 무죄가 나왔어요… (나는 유죄)`,{state:'bad'}); s.pact[pk(h,j)].sus=1; } } s.notice=`${res==='G'?'🔨 유죄!':'🕊️ 무죄!'} (유죄 ${s.jury.length-inn} · 무죄 ${inn})`; s.log.push(`${s.round}번째 재판 ${res==='G'?'유죄':'무죄'} (무죄 ${inn}표)`);
      const w=wins(s); if(w.c>=3||w.k>=3){ s.wteam=w.c>=3?'c':'k'; s.q.push({k:'note',text:`🏛️ ${w.c>=3?'시민':'범죄자'} 팀이 재판 3승! — 하지만 진 팀 리더가 상대 리더를 맞히면 역전`}); s.q.push({k:'guessStart'}); }
      else { s.talkers=U.shuffle(ALL.slice()).filter(i=>isH(i)||Math.random()<.3+P(s,i).talk*.4).slice(0,3); s.q.push({k:'talkNext'}); } }
    else if(e.k==='reply'){ const t=e.i, p=P(s,t), by=e.by;
      if(e.rk==='ask'){ const sus=belief(s,t); const x=ALL.filter(j=>j!==t&&j!==by&&!(isK(s.role[t])&&isK(s.role[j]))).sort((a,b)=>sus[b]-sus[a])[0]; const xr=x!=null?pubReason(s,x):null; if(x!=null&&xr){ talkT(s,t,`저는 ${nm(x)}이(가) 걸려요. ${rtText(xr,x)}`,'ans',x); s.claims.push({by:t,kind:'acc',t:x,r:s.round}); } else talkT(s,t,lineX(s,t,'ansNone'),'ans'); }
      else { const guilty=isK(s.role[t]); const tr=e.tr; const mates=tr?tr.jury.filter(j=>j!==t&&j!==by):[]; const sus=belief(s,t); const x=mates.sort((a,b)=>sus[b]-sus[a])[0];
        if(guilty&&e.rk!=='none'&&Math.random()<(1-p.bluff)*.55){ s.tell[t]=s.round; talkT(s,t,lineX(s,t,'nervous'),'nervous'); const w=ALL.find(j=>!isH(j)&&j!==t&&j!==by&&P(s,j).logic>.6); if(w!=null&&Math.random()<.6) s.q.unshift({k:'sweatR',i:w,t}); }
        else { const k='reb_'+(['inno','twice','picked','approve','reject'].includes(e.rk)?e.rk:'none'); talkT(s,t,lineX(s,t,k,{t:by,x})||lineX(s,t,'reb_none',{t:by}),'reb',by); } } }
    else if(e.k==='sweatR'){ talkT(s,e.i,lineX(s,e.i,'sweat',{t:e.t}),'sweat',e.t); }
    else if(e.k==='talkNext'){ const i=(s.talkers||[]).shift(); if(i==null) startRound(s); else { s.phase='talk'; setTurn(s,i); s.notice=`💬 ${nm(i)}의 한마디`; } }
    else if(e.k==='guessStart'){ const lead=ALL.find(i=>s.role[i]===(s.wteam==='c'?'kl':'cl')); s.phase='guess'; setTurn(s,lead); s.notice=`🎯 진 팀 리더 ${nm(lead)}이(가) 상대 리더를 지목해요`; }
    s.ev++; return; }
  if(s.phase==='reveal'){ s.phase='debrief'; s.dlist=ALL.filter(i=>!isH(i)); s.dj=0; s.notice=`🏁 ${s.wteam==='c'?'🧑‍⚖️ 시민':'🦹 범죄자'} 팀 최종 승리 — 정체 공개!`; s.log.push(s.notice); s.ev++; return; }
  if(s.phase==='debrief'){ if(s.dj<s.dlist.length){ const i=s.dlist[s.dj++]; const r=s.role[i]; const rn=RN[r], last=rn.charCodeAt(rn.length-1), ie=(last-0xAC00)%28?'이었어요':'였어요'; const bel=belief(s,i), top=ALL.filter(j=>j!==i).sort((a,b)=>bel[b]-bel[a])[0]; const t=`(속마음) 저 ${rn}${ie}.${isK(r)?` ${s.trial.some(x=>x.jury.includes(i)&&x.res==='I')?'무죄표, 제가 낸 거 맞아요 😏':'끝까지 숨었죠.'}`:r==='cl'?' 범죄자 둘을 알고 있었어요. 티 안 내느라 힘들었어요.':top!=null?` 계속 ${nm(top)}을(를) 의심했는데 — ${isK(s.role[top])?'맞았네요!':'틀렸네요 😅'}`:''}`;
      s.say={seat:i,text:t,n:(s.say?s.say.n:0)+1}; s.log.push(`💭 ${nm(i)}: ${t}`); s.ev++; return; }
    s.phase='over'; const t0=isK(s.role[HSEAT[0]])?'k':'c'; s.winner=s.wteam===t0?0:1; s.winners=HSEAT.map((h,p)=>(isK(s.role[h])?'k':'c')===s.wteam?p:-1).filter(x=>x>=0); s.ev++; return; }
}
function npcGuess(s,i){ const r=s.role[i];
  if(r==='cl'){ /* 범죄자 리더: 내가 아는 범죄자 둘이 아닌 사람 중, 무죄 재판에 자주 있던 사람 */ const sus=belief(s,i); const c=ALL.filter(j=>j!==i&&s.role[j]!=='k'); return c.sort((a,b)=>sus[b]-sus[a])[0]; }
  { const heard=Object.entries(s.clClaim||{}).filter(([k,v])=>isK(s.role[+k])).map(([k,v])=>v)[0]; if(heard!=null&&!isK(s.role[heard])&&Math.random()<.8) return heard; }
  /* 시민 리더 찾기: 범죄자를 정확히 의심하거나 범죄자가 낀 배심원단에 반대한 사람 */ const sc=j=>{ let x=0; for(const c of s.claims) if(c.by===j&&c.kind==='acc'&&isK(s.role[c.t])) x+=1.2; return x+Math.random()*.8; };
  return ALL.filter(j=>!isK(s.role[j])).sort((a,b)=>sc(b)-sc(a))[0]; }
function mask(s,p){ syncH(s); const v=U.clone(s), me=HSEAT[p], open=s.phase==='reveal'||s.phase==='debrief'||s.phase==='over'; const K=know(s,me);
  if(!open) v.role=s.role.map((r,j)=> j===me ? r : K[j]===1 ? (s.role[me]==='k'?'k':r) : null);
  if(s.phase==='vote') v.votes=s.votes.map((x,j)=>j===me?x:(x?'?':null)); if(s.vshown) v.votes=s.votes.map((x,j)=>j===me||s.vshown.includes(j)?x:(x?'?':null));
  v.tv={}; if(s.tv&&s.tv[me]) v.tv[me]=s.tv[me]; if(s.phase==='trial') v.tvDone=s.jury.filter(i=>s.tv[i]).length; v.q=s.q.map(x=>({k:x.k})); v.used={}; v.dm={[me]:s.dm[me]||[]}; v.pact={}; for(const k in s.pact) if(k.split('-').map(Number).includes(me)) v.pact[k]=s.pact[k]; v.clClaim={}; v.leak=[]; v.clHint=null; return v; }
function ai(v,lvl){ syncH(v); return aiSeat(v,HSEAT[1]); }
function aiSeat(v,i){ const s=Object.assign({},v,{role:v.role.map(r=>r||'c')});
  if(v.phase==='nom'&&v.actor===i) return {k:'nom',j:npcPick(s,i)};
  if(v.phase==='vote'&&!v.votes[i]) return {k:'vote',v:npcApprove(s,i)};
  if(v.phase==='trial'&&v.jury.includes(i)&&!(v.tv&&v.tv[i])) return {k:'tv',v:npcTrial(s,i)};
  if(v.phase==='talk'&&v.actor===i){ const sus=belief(s,i); let c=ALL.filter(j=>j!==i); if(v.role[i]==='cl'&&Math.random()<.8) c=c.filter(j=>sus[j]<1); if(isK(v.role[i])) c=c.filter(j=>!(v.role[j]&&isK(v.role[j]))); const rc=c.filter(j=>pubReason(v,j)).sort((a,b)=>sus[b]-sus[a]); const top=rc[0]; if(top!=null) return {k:'talk',kind:'acc',t:top}; const q=c.filter(j=>!isH(j)); return q.length?{k:'talk',kind:'ask',t:U.pick(q)}:{k:'talk',t:null}; }
  if(v.phase==='guess'&&v.actor===i) return {k:'guess',t:npcGuess(s,i)};
  return null; }
function aiDelay(){ return 1600+Math.random()*1800; }

/* 화면 */
let WHO={}, sel=[], sig='', lastDm=0, lastSay=0, dmT=null;
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function josa(name,a,b){ const base=name.replace(/\(나\)$/,''), c=base.charCodeAt(base.length-1); return c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28 ? a : b; }
const JO={'이(가)':['이','가'],'은(는)':['은','는'],'을(를)':['을','를']};
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}(이\(가\)|은\(는\)|을\(를\))?/g,(_,d,j)=>{ const n=seatName(+d,ctx); return `${seatEmoji(+d)} ${n}${j?josa(n,JO[j][0],JO[j][1]):''}`; }); }
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{}; const me=HSEAT[ctx.me], myRole=v.role[me], myTurn=v.turn===ctx.me; const w=wins(v);
  const sg=v.round+':'+v.phase+':'+v.fore+':'+v.fails; if(sg!==sig){ sig=sg; sel=[]; }
  let h=`<div class="hl-notice">${fill(U.esc(v.notice||''),ctx)}</div>`;
  if(v.say&&v.say.n!==lastSay){ if(lastSay&&ctx.sfx) ctx.sfx('tick'); lastSay=v.say.n; }
  { const feed=(v.feed||[]).slice(-3); h+=`<div class="vr-feed">${feed.map((x,k)=>`<div class="${k===feed.length-1?'new':''}"><span class="w">${seatEmoji(x.seat)} ${seatName(x.seat,ctx)}</span> ${fill(U.esc(x.text),ctx)}</div>`).join('')||'<div class="empty">아직 조용해요</div>'}</div>`; }
  h+=`<div class="info">내 역할 <b>${RN[myRole]||'?'}</b> · ${isK(myRole)?'🦹 범죄자 팀 — 무죄 3번':'🧑‍⚖️ 시민 팀 — 유죄 3번'}${myRole==='k'?' (범죄자 리더는 몰라요)':''}</div>`;
  h+=`<div class="ge-track"><div class="g">🔨 유죄 ${[0,1,2].map(k=>`<i class="${k<w.c?'on':''}"></i>`).join('')}</div><div class="b">🕊️ 무죄 ${[0,1,2].map(k=>`<i class="${k<w.k?'on':''}"></i>`).join('')}</div><small>재판 ${SIZE.map((n,k)=>`${k+1}:${n}명${k===3?'*':''}`).join(' ')} · 부결 ${v.fails}/3</small></div>`;
  const picking = myTurn&&(v.phase==='nom'||v.phase==='talk'||v.phase==='guess');
  h+=`<div class="ev-seats jr-seats">${ALL.map(i=>{ const r=v.role[i]; const inJ=v.jury.includes(i);
      const sp=v.say&&v.say.seat===i, tg=v.say&&v.say.t===i&&['acc','sweat','leak'].includes(v.say.kind), md=!isH(i)&&v.mood&&v.mood[i], pc=(v.pact||{})[pk(i,me)];
      return `<button class="ev-seat ${i===me?'me':''} ${v.actor===i?'act':''} ${sel.includes(i)?'sel':''} ${inJ?'jr-in':''} ${sp?'speak':''} ${tg?'tgt':''}" data-t="${i}" ${picking&&!(v.phase!=='nom'&&i===me)?'':'disabled'}>${md?`<span class="kg-mood ${sp?'pop':''}">${md.e}</span>`:''}${pc?`<span class="fs-pact">${pc.sus?'💔':'🤫'}</span>`:''}
        <div class="ev-nm">${seatEmoji(i)} ${seatName(i,ctx)}</div>${isH(i)?'':`<small class="ev-arch">${NPCI(i)[2]}</small>`}
        <div class="ev-prof">${r?RN[r]:'❔'}</div><div class="ev-mind">${v.fore===i?'🎙️장 ':''}${inJ?'⚖️ ':''}${v.votes[i]?(v.votes[i]==='Y'?'⭕':v.votes[i]==='N'?'❌':'🙋'):''}</div></button>`; }).join('')}</div>`;
  if(myTurn&&v.phase==='nom'){ const n=SIZE[v.round-1]; h+=`<div class="vr-card"><b>🎙️ 배심원 ${n}명 지명</b> <small>${sel.length}/${n} · 본인 포함 가능</small><div class="fh-act"><button data-a="nom" ${sel.length===n?'':'disabled'}>지명</button></div></div>`; }
  if(v.phase==='vote'&&!v.votes[me]) h+=`<div class="vr-card"><b>🙋 이 배심원단으로 재판할까요?</b><div class="fh-act"><button data-v="Y">⭕ 찬성</button><button data-v="N" style="background:#b8412f">❌ 반대</button></div></div>`;
  if(v.phase==='trial'&&v.jury.includes(me)&&!(v.tv&&v.tv[me])) h+=`<div class="vr-card"><b>🔒 판결</b> <small>${isK(myRole)?'무죄 1표면 무죄(4번째 재판은 2표)':'시민은 유죄를'}</small><div class="fh-act"><button data-tv="G" style="background:#2b2840">🔨 유죄</button><button data-tv="I">🕊️ 무죄</button></div></div>`;
  else if(v.phase==='trial') h+=`<div class="vr-card"><small>배심원들이 판결 중… (${v.tvDone||0}/${v.jury.length})</small></div>`;
  if(myTurn&&v.phase==='talk') h+=`<div class="vr-card"><b>💬 한마디</b> <small>${sel.length?fill(nm(sel[0]),ctx):'사람을 누르세요'}</small><div class="fh-act"><button data-ta="acc" ${sel.length?'':'disabled'} style="background:#b8412f" title="재판 기록에서 근거가 있으면 자동으로 붙어요">🤨 수상해요</button><button data-ta="trust" ${sel.length?'':'disabled'}>🤝 믿어요</button><button class="ghost" data-ta="ask" ${sel.length?'':'disabled'}>❓ 누구 의심해요?</button><button class="ghost" data-ta="skip">🤐 넘기기</button></div></div>`;
  if(myTurn&&v.phase==='guess') h+=`<div class="vr-card"><b>🎯 상대 팀 리더는?</b> <small>맞히면 역전승</small><div class="fh-act"><button data-a="guess" ${sel.length?'':'disabled'}>${sel.length?fill(nm(sel[0]),ctx):'?'} 지목</button></div></div>`;
  { const D=(v.dm&&v.dm[me]||[]).slice(-5), canW=['nom','vote','trial','talk','wait'].includes(v.phase)&&v.round>0&&v.wh[me]!==v.round; const newest=D.length?D[D.length-1].id:0, fresh=newest>lastDm; if(fresh&&lastDm&&ctx.sfx) ctx.sfx('host'); lastDm=newest;
    if(D.length||canW){ h+=`<div class="kg-dm fs-dm ${fresh?'slide':''}"><div class="kg-fh">🤫 귓속말 <small>나만 보여요 · 재판마다 한 번</small></div>${D.map(m=>`<div class="${m.state==='open'?'open':''} ${m.state==='bad'?'bad':''}">${m.mine?'<small>나</small> ':`<b>${seatEmoji(m.from)} ${seatName(m.from,ctx)}</b> `}${fill(U.esc(m.text),ctx)}${m.state==='open'?` <button class="small" data-dr="${m.id}:1">🤫 좋아요</button><button class="ghost small" data-dr="${m.id}:0">🙅 싫어요</button>`:''}</div>`).join('')}`;
      if(canW) h+= dmT==null ? `<div class="fh-act"><small>누구에게?</small>${ALL.filter(j=>!isH(j)).map(j=>`<button class="ghost small" data-wt="${j}">${seatEmoji(j)} ${seatName(j,ctx)}</button>`).join('')}</div>`
        : `<div class="fh-act"><small>→ ${seatEmoji(dmT)} ${seatName(dmT,ctx)}:</small><button class="small" data-w="pact">🤝 몰래 연합(서로 배심원단에 넣기)</button><button class="ghost small" data-w="cl" title="상대가 범죄자면 마지막에 지목당할 수도!">🔎 저 시민 리더예요</button><button class="ghost small" data-w="x">취소</button></div>`;
      h+='</div>'; } }
  if(v.phase==='over') h+=`<div class="sn-score"><div><b>${v.wteam==='c'?'🧑‍⚖️ 시민':'🦹 범죄자'} 팀 승리</b>${v.guess?` — 리더 지목 ${v.guess.ok?'성공(역전)':'실패'}`:''}</div>${ALL.map(i=>`<div class="${isH(i)?'h':''}">${seatEmoji(i)} ${seatName(i,ctx)} ${RN[v.role[i]]}</div>`).join('')}</div>`;
  const L=U.politics(v.feed,{seats:ALL,emo:seatEmoji,name:i=>seatName(i,ctx),me,pacts:Object.entries(v.pact||{}).map(([k,p])=>{ const [a,b]=k.split('-').map(Number); return [a,b,p.broken!=null||!!p.sus]; }).filter(x=>x[0]===me||x[1]===me)})+`<div class="side-box"><div class="side-h">⚖️ 재판 기록</div>${v.trial.map(t=>`<div class="side-row" style="flex-wrap:wrap"><small>${t.r}번</small> ${t.res==='G'?'🔨':'🕊️'} ${t.jury.map(seatEmoji).join('')} <small>무죄 ${t.inn}표</small></div>`).join('')||'<div class="side-row"><small>-</small></div>'}
    <div class="side-h" style="margin-top:8px">🧠 마음 지도</div>${ALL.map(i=>`<div class="side-row">${seatEmoji(i)} <small>${v.claims.filter(c=>c.by===i&&c.kind==='acc').slice(-3).map(c=>`🤨${seatEmoji(c.t)}`).join(' ')||'-'} · 받은 의심 ${v.claims.filter(c=>c.t===i&&c.kind==='acc').length}</small></div>`).join('')}</div>`;
  const R=U.chat(v.feed,{emo:seatEmoji,name:i=>seatName(i,ctx),fill:t=>fill(t,ctx),me})+`<div class="side-box side-log"><div class="side-h">📜 진행 기록 <small>최근이 위</small></div>${v.log.slice(-80).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=`<div class="side3 has-chat"><div class="side-mid">${h}</div><aside class="side-l">${L}</aside><aside class="side-r">${R}</aside></div>`;
  el.onclick=e=>{ const dr=e.target.closest('[data-dr]'); if(dr){ const [id,y]=dr.dataset.dr.split(':'); return ctx.act({k:'dmReply',id:+id,yes:y==='1'}); }
    const wt=e.target.closest('[data-wt]'); if(wt){ dmT=+wt.dataset.wt; return ctx.rerender(); }
    const w=e.target.closest('[data-w]'); if(w){ const t=dmT; dmT=null; if(w.dataset.w==='x') return ctx.rerender(); return ctx.act({k:'dm',t,what:w.dataset.w}); }
    const t=e.target.closest('[data-t]'); if(t&&!t.disabled){ const i=+t.dataset.t; if(v.phase==='nom') sel=sel.includes(i)?sel.filter(x=>x!==i):sel.concat([i]).slice(-SIZE[v.round-1]); else sel=[i]; return ctx.rerender(); }
    const vv=e.target.closest('[data-v]'); if(vv) return ctx.act({k:'vote',v:vv.dataset.v});
    const tv=e.target.closest('[data-tv]'); if(tv) return ctx.act({k:'tv',v:tv.dataset.tv});
    const ta=e.target.closest('[data-ta]'); if(ta&&!ta.disabled) return ctx.act({k:'talk',kind:ta.dataset.ta,t:ta.dataset.ta==='skip'?null:sel[0]});
    const a=e.target.closest('[data-a]'); if(!a||a.disabled) return; if(a.dataset.a==='nom') return ctx.act({k:'nom',j:sel.slice()}); if(a.dataset.a==='guess') return ctx.act({k:'guess',t:sel[0]}); };
}
function status(v,ctx){ syncH(v); const me=HSEAT[ctx.me]; if(v.phase==='over') return ''; if(v.phase==='vote'&&!v.votes[me]) return '찬반 투표'; if(v.phase==='trial'&&v.jury.includes(me)&&!(v.tv&&v.tv[me])) return '판결하세요';
  if(v.turn===ctx.me) return {nom:'배심원을 지명하세요',talk:'한마디',guess:'상대 리더 지목'}[v.phase]||''; return '진행 중…'; }
const guide=`
<p><b>유죄냐 무죄냐, 숨은 범죄자</b> — 8인(둘이 하면 늘 <b>서로 다른 팀</b>, 셋 이상이면 팀 무작위 + 나머지는 컴퓨터).</p>
<ol><li>시민 5(🧑‍⚖️ 시민 리더 포함) vs 범죄자 3(🕶️ 범죄자 리더 포함). 범죄자 둘은 서로 알지만 <b>범죄자 리더는 모름</b>. 시민 리더와 범죄자 리더는 범죄자 둘을 알아요.</li>
<li>배심원장(차례로)이 배심원단 지명(3·4·4·5·5명) → 전원 찬반(과반). 3번 연속 부결이면 다음은 투표 없이 재판.</li>
<li>배심원이 몰래 🔨유죄/🕊️무죄. <b>유죄는 만장일치</b>여야 해요 — 무죄 1표면 무죄(4번째 재판만 무죄 2표 필요).</li>
<li>시민은 유죄 3번, 범죄자는 무죄 3번 먼저. 단 <b>진 팀의 리더가 상대 리더를 맞히면 역전승</b>!</li></ol>
<div class="tipbox">💡 <b>팁</b><br>· 무죄가 나온 재판의 배심원 중에 범죄자가 있어요.<br>· 시민 리더는 범죄자를 알지만, 티 내면 마지막에 지목당해요!</div>`;
const guideSteps=[
  {t:'🎭 두 팀과 리더', h:'시민 5 vs 범죄자 3. <b>시민 리더</b>는 범죄자 둘을 알고, <b>범죄자 리더</b>는 동료에게도 숨어 있어요.', demo:s=>{ s.phase='roles'; return s; }},
  {t:'🙋 배심원단 투표', h:'배심원장이 배심원을 지명하면 <b>전원 찬반</b>. 과반 찬성이면 재판!', demo:s=>{ startRound(s); s.jury=[0,2,5]; s.phase='vote'; s.turn=null; s.actor=null; return s; }},
  {t:'🔨 유죄는 만장일치', h:'배심원이 몰래 유죄/무죄. <b>무죄 1표</b>면 무죄(4번째 재판만 2표).', demo:s=>{ startRound(s); s.jury=[0,2,5]; s.phase='trial'; s.tv={}; return s; }},
  {t:'💬 근거 있는 토론', h:'재판이 끝나면 <b>기록을 근거로</b> 말해요 — "2번째 재판 무죄 1표, 그 배심원 중에 ○○". 찍힌 사람은 "그 재판엔 △△도 있었잖아요"로 반박, 범죄자는 😅 당황하기도. 나도 🤨·🤝·❓.', focus:'.vr-feed', demo:s=>{ startRound(s); s.trial=[{r:1,jury:[1,2,3],inn:1,res:'I',fore:1,votes:[]}]; s.feed=[{r:1,seat:5,text:'1번째 재판 무죄 1표, 그 배심원 중에 {s2}이(가) 있었어요. {s2}, 설명해 줄래요?',t:2,kind:'acc'},{r:1,seat:2,text:'그 재판엔 {s3}도 있었잖아요.',t:5,kind:'reb'}]; s.say={seat:2,text:'x',n:1,t:5,kind:'reb'}; s.mood={5:{e:'🤨',n:1},2:{e:'😤',n:2}}; return s; }},
  {t:'🤫 귓속말', h:'재판마다 한 번 몰래 — 🤝 <b>연합</b>(서로 배심원단에 넣고 찬성) 또는 "저 시민 리더예요". 범죄자에게 리더라고 말하면 <b>마지막에 지목</b>당해요! 시민 리더가 몰래 힌트를 주거나, 범죄자가 가짜 연합을 걸어오기도.', focus:'.fs-dm', demo:s=>{ startRound(s); s.dm={0:[{id:1,r:1,from:5,text:'우리 몰래 연합해요. 서로 배심원단에 넣어 주고 찬성해 주기 🤝',state:'open',kind:'pact'}]}; s.dmN=1; return s; }},
  {t:'🎯 리더 역전', h:'3승을 먼저 해도, <b>진 팀 리더가 상대 리더를 맞히면</b> 역전승!', demo:s=>{ startRound(s); s.trial=[{r:1,jury:[0,1,2],inn:0,res:'G'},{r:2,jury:[3,4,5,6],inn:1,res:'I'}]; return s; }},
];
window.GAMES.jury = { _sync:x=>syncH(x), maxH:8,
  title:'배심원', ref:'더 지니어스 「배심원」', emoji:'⚖️', tags:['정체 숨기기','팀전','투표','NPC','두뇌서바이벌'],
  tagline:'유죄는 만장일치여야 한다 — 배심원단 속 숨은 범죄자, 그리고 끝까지 숨어야 하는 두 리더.',
  guide, guideSteps, init, apply, mask, ai, aiDelay, render, status, step, stepDelay, noPersona:true, wide:true,
  reset(){ sel=[]; sig=''; lastDm=0; lastSay=0; dmT=null; },
  bar:(v,i)=>`<span class="tag">⚖️</span>`,
  result:(v,ctx)=>v.wteam?`${v.wteam==='c'?'시민':'범죄자'} 팀 승리`:'',
  _aiSeat:aiSeat,
};
})();
