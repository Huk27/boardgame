(function(){
'use strict';
/* 선과 악 (피의 게임 시즌 3 · 10일차 메인 매치) — 7인(우리 둘 + NPC 5명)용으로 다듬은 정체 숨기기 팀전. 우리 둘은 늘 서로 다른 팀.
   천사팀 4명(👼신 · 😇대천사 · 천사 2) vs 악마팀 3명(😈루시퍼 · 악마 2). 악마들은 서로 앎. 대천사는 신이 누군지 앎. 신은 악행이 적립될 때마다 (루시퍼 빼고) 악마 1명을 알게 됨.
   라운드: 대표(차례로 돌아감)가 집행자를 지목 → 전원 찬반 투표(과반 찬성이면 당선, 3번 연속 부결이면 맨 위 카드 자동 적립)
   → 카드 3장: 대표가 1장 몰래 버리고, 집행자가 남은 2장 중 1장 버림 → 남은 1장 적립. 둘은 무엇을 봤는지 말함(거짓말 가능).
   악행 5장 = 악마 승리. 선행 5장 = 천사 승리, 단 그때 악마팀이 신을 맞히면 악마 역전승. 악행 4번째가 적립되면 그 대표가 1명을 처형(정체 공개). */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로 — 고르게 퍼지게, 나머지는 NPC */
const N=7, GOOD=5, BAD=5; let HSEAT=[0,4]; const SEATORD=[0,4,2,6,1,5,3];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i), ALL=[...Array(N).keys()];
const nm=i=>`{s${i}}`;
const RN={god:'👼 신', arch:'😇 대천사', angel:'🙂 천사', lucifer:'😈 루시퍼', devil:'👿 악마'};
const isDev=r=>r==='lucifer'||r==='devil';
const STYLE={seojin:'logic', doyun:'warm', haram:'calm', yuna:'emo', minho:'sly', taekyung:'hot', jihu:'sly', soyul:'warm'};
const DEF_P={talk:.6,aggr:.5,trust:.5,bluff:.5,logic:.6,temper:.4};
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
const LINES={
  logic:{acc:['기록상 {t}이(가) 가장 수상해요.','{t}, 주장이랑 결과가 안 맞아요.'], trust:['{t}은(는) 지금까지 깨끗해요.'], def:['저를요? 기록 다시 보세요.'], nom:['{t}, 믿고 맡길게요.'], kill:['{t}. 계산상 이게 맞아요.']},
  warm:{acc:['미안한데 {t}이(가) 좀 걸려요…','{t}… 아니길 바라요 🥲'], trust:['{t}은(는) 믿어요 🤝'], def:['저 진짜 천사예요 😢'], nom:['{t} 믿어 볼게요 😊'], kill:['미안해요 {t}… 🥲']},
  calm:{acc:['…{t}.'], trust:['…{t}은(는) 괜찮아요.'], def:['…아니에요.'], nom:['…{t}.'], kill:['…{t}.']},
  emo:{acc:['{t} 느낌 쎄해요 😣','{t}!! 수상해!!'], trust:['{t}은(는) 착한 사람이야!'], def:['왜 나야?! 😭'], nom:['{t}! 너로 정했어!'], kill:['{t} 미안!! 😭']},
  sly:{acc:['{t}, 표정 관리 좀 하세요 😏','다들 {t} 봐요 😏'], trust:['{t}은(는) 제가 보증해요 😏'], def:['저요? ㅋㅋ 말도 안 돼요'], nom:['{t}, 같이 가 보죠 😏'], kill:['{t}, 잘 가요 😏']},
  hot:{acc:['{t}! 확실해요! 🔥','{t} 빼고 다 믿어요!'], trust:['{t}은(는) 내 편이에요!'], def:['뭐라고요?! 아니라니까!'], nom:['{t}! 가자!'], kill:['{t}! 끝이에요 🔥']},
};
const CT={"GG":"선·선","GB":"선·악","BB":"악·악"};
const RT={
  exeGB:['{t}은(는) 선·악을 받았다면서 악행을 냈어요.','{x}라운드, 선행을 낼 수 있었는데 {t}이(가) 악행을 냈죠.'],
  contra:['{x}라운드, 대표는 {a} 넘겼다는데 집행자는 {b} 받았대요. {t} 쪽이 거짓말 같아요.','{x}라운드, 대표와 집행자 말이 안 맞았어요. {t}도 그 정부에 있었죠.'],
  badGov:['{x}라운드 악행 정부에 {t}이(가) 있었어요.','악행이 나온 {x}라운드, 그 정부에 {t}이(가) 있었죠.'],
  voteBad:['{t}은(는) {x}라운드 악행 정부에 찬성했어요.','{x}라운드, {t}이(가) 그 정부에 찬성표를 줬죠.'],
  voteNo:['{t}은(는) 선행이 나온 {x}라운드 정부에 반대했어요.','{x}라운드 깨끗한 정부에 {t}이(가) 반대했죠.'],
  clean:['{t}은(는) {x}라운드 선행 정부에 있었어요.','{t}이(가) 낀 정부는 선행이었어요.'],
};
const XL={
  close:['{t}이(가) 제일 걸려요.','다음 정부에선 {t}을(를) 빼요.','{t}, 설명해 줄래요?','저는 {t} 쪽에 걸게요.'],
  trustC:['{t}은(는) 믿어요 🤝','{t}은(는) 다음에도 집행자로 좋아요.','{t} 쪽은 깨끗해 보여요.'],
  ask:['{t}, 지금까지 보고 누구 의심해요?','{t} 생각부터 들어 볼래요. 누가 걸려요?','{t}, 다음 집행자 누가 좋을까요?'],
  reb_exeGB:['악·악이었어요! 선·악이라고 한 건 실수였어요.','제가 받은 건 악·악이었어요. 대표가 거짓말하는 거예요.'],
  reb_contra:['저는 사실대로 말했어요. {x}이(가) 거짓말이에요.','둘 중 하나가 거짓말이면, 그건 {x}예요.'],
  reb_badGov:['카드가 악행뿐이었어요. 어쩔 수 없었어요.','같이 있던 {x}한테 물어봐요. 저는 선행을 넘겼어요.'],
  reb_voteBad:['그땐 그 정부가 깨끗해 보였어요.','찬성한 사람 저만 아니잖아요.'],
  reb_voteNo:['느낌이 안 좋았어요. 결과론이에요.','반대는 신중했던 거예요.'],
  reb_none:['{t}, 근거가 뭐예요?','이유도 없이 저를요? 기록부터 봐요.'],
  nervous:['저, 저는 진짜 선행을 넘겼어요… 😅','왜 저예요… 저 천사예요 😅','아, 그게… 카드가 그랬다니까요 😅'],
  sweat:['{t}, 방금 엄청 당황했죠? 🤨','말 더듬는 거 다들 봤죠? {t} 같아요.'],
  ansNone:['아직은 잘 모르겠어요. 한 판 더 봐요.','기록이 더 쌓여야 알 것 같아요.'],
  agreeAcc:['{x} 말에 동의해요. {t}, 저도 걸려요.','저도 {t}요. 같은 기록을 봤어요.','{x} 말 듣고 확신했어요. {t}이에요.'],
  leak:['{t}이(가) 저한테 몰래 자기가 신이라던데요? 🤭','다들 알아요? {t}, 몰래 신이라고 했어요.'],
};
const MOOD={acc:'🤨',trust:'🤝',ask:'🧐',reb:'😤',nervous:'😅',sweat:'🤨',ans:'🙂',leak:'🤭',nom:'🎙️',kill:'⚔️',claim:'📣',def:'😤'};
function lineX(s,i,kind,o){ const L=XL[kind]; if(!L) return null; const used=(s.used[i]=s.used[i]||[]); o=o||{};
  const c=L.map(t=>t.split('{t}').join(o.t!=null?nm(o.t):'').split('{x}').join(o.x!=null?nm(o.x):'다른 사람')).filter(t=>!used.includes(t)); if(!c.length) return null; const t=U.pick(c); used.push(t); return t; }
/* 공개 기록이 말해 주는 의심 근거 */
function pubReason(s,j){ const G=s.govs.filter(g=>!g.auto);
  const eg=G.find(g=>g.exe===j&&g.card==='B'&&g.ec==='GB'); if(eg) return {k:'exeGB',x:eg.r,g:eg};
  const ct=G.find(g=>(g.rep===j||g.exe===j)&&g.rc&&g.ec&&g.rc!==g.ec); if(ct) return {k:'contra',x:ct.r,a:CT[ct.rc],b:CT[ct.ec],g:ct};
  const bg=G.find(g=>(g.rep===j||g.exe===j)&&g.card==='B'); if(bg) return {k:'badGov',x:bg.r,g:bg};
  const vb=G.find(g=>g.card==='B'&&g.votes&&g.votes[j]==='Y'&&g.rep!==j&&g.exe!==j); if(vb) return {k:'voteBad',x:vb.r};
  const vn=G.find(g=>g.card==='G'&&g.votes&&g.votes[j]==='N'); if(vn) return {k:'voteNo',x:vn.r};
  return null; }
function cleanReason(s,j){ const g=s.govs.find(g=>!g.auto&&(g.rep===j||g.exe===j)&&g.card==='G'); return g?{k:'clean',x:g.r}:null; }
function rtText(r,j){ return U.pick(RT[r.k]).split('{t}').join(nm(j)).split('{x}').join(r.x??'').split('{a}').join(r.a??'').split('{b}').join(r.b??''); }
function talkT(s,i,text,kind,t){ if(!text) return false; s.say={seat:i,text,n:(s.say?s.say.n:0)+1,t:t??null,kind}; (s.feed=s.feed||[]).push({r:s.round,seat:i,text,t:t??null,kind}); s.log.push(`💬 ${nm(i)}: ${text}`); (s.mood=s.mood||{})[i]={e:MOOD[kind]||'💬',n:(s.moodN=(s.moodN||0)+1)}; return true; }
function accuse(s,i,t,human){ const r=pubReason(s,t); let text;
  const prev=!human&&s.claims.filter(c=>c.r===s.round&&c.kind==='acc'&&c.t===t&&c.by!==i).slice(-1)[0];
  if(prev){ const t2=lineX(s,i,'agreeAcc',{t,x:prev.by}); if(!t2) return false; talkT(s,i,t2,'acc',t); s.claims.push({by:i,kind:'acc',t,r:s.round}); return true; }
  if(human) text= r ? `🤨 ${rtText(r,t)} ${nm(t)}, 설명해 봐요.` : `🤨 ${nm(t)}, 좀 수상해요.`;
  else { if(!r) return false; const c=lineX(s,i,'close',{t}); if(!c) return false; text=rtText(r,t)+' '+c; }
  talkT(s,i,text,'acc',t); s.claims.push({by:i,kind:'acc',t,r:s.round});
  if(!isH(t)) s.q.unshift({k:'reply',i:t,by:i,rk:r?r.k:'none',g:r&&r.g?{rep:r.g.rep,exe:r.g.exe}:null});
  return true; }
function lineOf(s,i,kind,t){ const st=STYLE[P(s,i).id]||'calm', L=(LINES[st]||LINES.calm)[kind]||LINES.calm[kind]; if(!L) return '';
  const used=(s.used[i]=s.used[i]||[]); const pool=L.filter(x=>!used.includes(x)); if(!pool.length) return ''; const raw=U.pick(pool); used.push(raw); return raw.split('{t}').join(t!=null?nm(t):''); }
function say(s,i,kind,t){ if(isH(i)) return; const x=lineOf(s,i,kind,t); if(x){ talkT(s,i,x,kind,t); s.claims.push({by:i,kind,t,r:s.round}); } }

function init(starter,o){ const k=Math.max(2,Math.min(7,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  const s={phase:'intro', who:{}, starter:starter|0, role:Array(N).fill('angel'), alive:Array(N).fill(true), deck:[], disc:[], good:0, bad:0, round:0, rep:-1, lastExe:null, exe:null,
    fails:0, votes:Array(N).fill(null), vi:0, hand:null, govs:[], godKnow:[], claims:[], q:[], say:null, used:{}, log:[], feed:[], mood:{}, dm:{}, dmN:0, pact:{}, wh:{}, godClaim:{}, leak:[], tell:{}, turn:null, winner:null, ev:0, dlist:[], dj:0, guess:null, endWhy:'',
    notice:'🎙️ 메인 매치 「선과 악」 — 천사와 악마, 누가 누구일까요'};
  const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=ids[k]);
  /* 우리 둘은 서로 다른 팀 */
  s.hs=HSEAT.slice(); const hd=Math.random()<.5?0:1; const devs=HSEAT.length>2?U.shuffle(ALL.slice()).slice(0,3):[HSEAT[hd]].concat(U.shuffle(ALL.filter(i=>!isH(i))).slice(0,2)); const angs=ALL.filter(i=>!devs.includes(i));
  const luc=U.pick(devs); devs.forEach(i=>s.role[i]= i===luc?'lucifer':'devil'); const ga=U.shuffle(angs.slice()); s.role[ga[0]]='god'; s.role[ga[1]]='arch';
  s.deck=U.shuffle(Array(16).fill('B').concat(Array(14).fill('G')));
  return s;
}
const pk=(a,b)=>a<b?a+'-'+b:b+'-'+a;
function dmPush(s,to,from,text,o){ if(!isH(to)) return; (s.dm[to]=s.dm[to]||[]).push(Object.assign({id:++s.dmN,r:s.round,from,text,state:'info'},o||{})); }
function npcWhisper(s){ for(const h of HSEAT){ if(!s.alive[h]||Math.random()>.45) continue; const hr=s.role[h];
  if(isDev(hr)){ const m=ALL.find(j=>!isH(j)&&isDev(s.role[j])&&s.alive[j]); if(m!=null){ dmPush(s,h,m,U.pick(['(동료) 제가 대표 되면 당신을 집행자로 지목할게요 😏 악행 넘겨요.','(동료) 이번엔 제가 천사인 척 세게 갈게요. 맞춰 줘요 😏','(동료) 신 같은 사람 보이면 몰래 알려 줘요. 마지막에 맞혀야 해요.'])); continue; } }
  const god=ALL.find(j=>!isH(j)&&s.role[j]==='god'&&s.alive[j]); if(god!=null&&!isDev(hr)&&s.godKnow.some(j=>s.alive[j])&&belief(s,god)[h]<.3&&Math.random()<.6){ const d=s.godKnow.find(j=>s.alive[j]); dmPush(s,h,god,`${nm(d)} 악마예요. 이유는 못 말해요 🤫 (저를 티 내지 마요)`); continue; }
  const dv=ALL.find(j=>!isH(j)&&isDev(s.role[j])&&s.alive[j]&&!s.pact[pk(j,h)]); if(dv!=null&&!isDev(hr)&&Math.random()<.5){ dmPush(s,h,dv,U.pick(['우리 몰래 연합해요. 서로 집행자로 지목하고 찬성해 주기 🤝','둘이 손잡아요. 제가 대표 되면 꼭 당신 지목할게요 🤫']),{state:'open',kind:'pact'}); continue; }
  const an=ALL.find(j=>!isH(j)&&!isDev(s.role[j])&&s.alive[j]&&!s.pact[pk(j,h)]&&belief(s,j)[h]<.35); if(an!=null) dmPush(s,h,an,'우리 몰래 연합해요. 서로 집행자로 지목하고 찬성해 주기 🤝',{state:'open',kind:'pact'}); } }
const alive=s=>ALL.filter(i=>s.alive[i]);
const devs=s=>ALL.filter(i=>isDev(s.role[i]));
function draw(s,n){ if(s.deck.length<n){ s.deck=U.shuffle(s.deck.concat(s.disc)); s.disc=[]; s.log.push('🔀 카드 더미를 다시 섞었어요'); } return s.deck.splice(0,n); }
function nextRep(s){ let r=s.rep; for(let k=0;k<N;k++){ r=(r+1)%N; if(s.alive[r]) return r; } return 0; }
function startRound(s){ s.round++; s.rep=nextRep(s); npcWhisper(s); s.exe=null; s.votes=Array(N).fill(null); s.vi=0; s.hand=null; s.phase='nominate'; setTurn(s,s.rep);
  s.notice=`🎙️ ${s.round}라운드 — 대표 ${nm(s.rep)}이(가) 집행자를 지목해요`; s.log.push(`🎙️ ${s.round}R 대표 ${nm(s.rep)}`); }
function setTurn(s,i){ s.actor=i; s.turn=isH(i)?pOf(i):null; s.think=isH(i)?0:thinkFor(s,i); }
function thinkFor(s,i){ const p=P(s,i); return Math.round((1200+Math.random()*1500)*(1.25-p.temper*.5)*(.7+p.logic*.5)); }
/* 믿음: i가 아는 것(역할 지식 + 공개 기록)만으로 각자의 악마 확률 */
function know(s,i){ const r=s.role[i]; const k={};
  if(isDev(r)) ALL.forEach(j=>k[j]=isDev(s.role[j])?1:0);
  if(r==='god') (s.godKnow||[]).forEach(j=>k[j]=1);
  ALL.forEach(j=>{ if(!s.alive[j]&&s.role[j]) k[j]=isDev(s.role[j])?1:0; }); k[i]=isDev(r)?1:0; return k; }
function belief(s,i){ const p=P(s,i), K=know(s,i); const sus=Array(N).fill(.43);
  for(const g of s.govs){ if(g.card==='B'){ sus[g.rep]+=.14; sus[g.exe]+=.2; } else { sus[g.rep]-=.1; sus[g.exe]-=.12; }
    if(g.rc&&g.ec){ if(g.rc!==g.ec){ sus[g.rep]+=.18*p.logic; sus[g.exe]+=.18*p.logic; } if(g.ec==='GB'&&g.card==='B') sus[g.exe]+=.45; if(g.rc==='GG'&&g.card==='B') sus[g.exe]+=.4; }
    if(g.votes) ALL.forEach(j=>{ if(g.votes[j]==='Y'&&g.card==='B') sus[j]+=.05; if(g.votes[j]==='N'&&g.card==='G') sus[j]+=.03; }); }
  for(const c of s.claims){ if(c.kind==='acc'&&c.by!==i){ const cred=Math.max(.2,1-sus[c.by]); sus[c.t]+=.08*p.trust*cred; } if(c.kind==='acc'&&c.t===i&&!isDev(s.role[i])) sus[c.by]+=.1; }
  for(const j of ALL){ if(j!==i&&!isH(i)) sus[j]-=NPCS.rel(s.who[i], isH(j)?(pOf(j)===0?'me':'opp'):s.who[j])*.12; if(s.tell&&s.tell[j]) sus[j]+=.12*p.logic; if(s.pact&&s.pact[pk(i,j)]) sus[j]-=.15; }
  for(const j of ALL) sus[j]=Math.max(.02,Math.min(.98,sus[j])); for(const j in K) sus[j]=K[j]; return sus; }
/* NPC 판단 */
function npcNominate(s,i){ const sus=belief(s,i), c=alive(s).filter(j=>j!==i&&j!==s.lastExe); if(!c.length) return alive(s).find(j=>j!==i);
  if(isDev(s.role[i])){ const mate=c.filter(j=>isDev(s.role[j])); if(mate.length&&Math.random()<.35+P(s,i).aggr*.4&&s.bad>=1) return U.pick(mate); return c.filter(j=>!isDev(s.role[j])).sort((a,b)=>sus[a]-(s.pact[pk(i,a)]?.4:0)-sus[b]+(s.pact[pk(i,b)]?.4:0))[0]??c[0]; }
  return c.sort((a,b)=>sus[a]-(s.pact[pk(i,a)]?.25:0)-sus[b]+(s.pact[pk(i,b)]?.25:0)+(Math.random()-.5)*.1)[0]; }
function npcVote(s,i){ const sus=belief(s,i), g=(sus[s.rep]+sus[s.exe])/2-((s.pact[pk(i,s.rep)]||s.pact[pk(i,s.exe)])?.15:0);
  if(isDev(s.role[i])){ const hasDev=isDev(s.role[s.rep])||isDev(s.role[s.exe]); return hasDev||Math.random()<.35 ? 'Y':'N'; }
  if(s.fails>=2) return g<.7?'Y':'N'; return g<.45+(.5-P(s,i).trust)*.1 ? 'Y':'N'; }
function npcRepDisc(s,i,hand){ const d=isDev(s.role[i]); const p=P(s,i);
  if(d){ if(hand.includes('G')&&!(s.bad<=1&&Math.random()<p.bluff*.4)) return hand.indexOf('G'); return hand.indexOf('B')>=0?hand.indexOf('B'):0; }
  return hand.includes('B')?hand.indexOf('B'):0; }
function npcExeDisc(s,i,hand){ const d=isDev(s.role[i]); if(d){ if(hand.includes('G')&&!(s.bad<=1&&Math.random()<.3)) return hand.indexOf('G'); return 0; } return hand.includes('B')?hand.indexOf('B'):0; }
function claimOf(s,i,seen,role){ /* seen: 대표는 넘긴 2장, 집행자는 받은 2장 */ const sorted=seen.slice().sort().reverse().join(''); /* G가 앞: GG, GB, BB */
  const norm=x=>x.split('').sort((a,b)=>a==='G'?-1:b==='G'?1:0).join('');
  if(!isDev(s.role[i])) return norm(seen.join(''));
  return s.lastCard==='B' ? 'BB' : norm(seen.join('')); }
function npcKill(s,i){ const sus=belief(s,i); const c=alive(s).filter(j=>j!==i);
  if(isDev(s.role[i])) return godGuess(s,c.filter(j=>!isDev(s.role[j])));
  return c.sort((a,b)=>sus[b]-sus[a])[0]; }
function godGuess(s,cands){ { const heard=Object.entries(s.godClaim||{}).filter(([k])=>isDev(s.role[+k])).map(([k,v])=>v).find(x=>cands.includes(x)); if(heard!=null&&Math.random()<.8) return heard; } /* 악마팀 관점: 악마를 정확히 의심한 사람·악마가 낀 정부에 반대한 사람이 신일 확률 높음 */
  const sc=j=>{ let x=0; for(const c of s.claims) if(c.by===j&&c.kind==='acc'&&isDev(s.role[c.t])) x+=1.2; for(const g of s.govs){ const dg=isDev(s.role[g.rep])||isDev(s.role[g.exe]); if(g.votes&&g.votes[j]==='N'&&dg) x+=.6; if(g.votes&&g.votes[j]==='Y'&&dg) x-=.3; } return x+Math.random()*.6; };
  return cands.sort((a,b)=>sc(b)-sc(a))[0]; }
function act(s,i,a){
  if(a.k==='nom'){ if(s.phase!=='nominate'||s.rep!==i) return '지금은 지목할 때가 아니에요'; const t=a.t|0; if(!s.alive[t]||t===i) return '살아 있는 다른 사람을 고르세요'; if(t===s.lastExe&&alive(s).length>3) return '직전 집행자는 연속으로 못 해요';
    s.exe=t; s.phase='vote'; s.turn=null; s.actor=null; s.votes=Array(N).fill(null); s.notice=`🗳️ 대표 ${nm(i)} → 집행자 후보 ${nm(t)} — 찬성? 반대?`; s.log.push(`👉 ${nm(i)} → 집행자 후보 ${nm(t)}`); return null; }
  if(a.k==='vote'){ if(s.phase!=='vote') return '지금은 투표 시간이 아니에요'; if(!s.alive[i]) return '처형된 사람은 투표 못 해요'; if(s.votes[i]) return '이미 투표했어요'; if(a.v!=='Y'&&a.v!=='N') return '찬성 또는 반대'; s.votes[i]=a.v; return null; }
  if(a.k==='rdisc'){ if(s.phase!=='rdisc'||s.rep!==i) return '대표 차례가 아니에요'; const k=a.c|0; if(!(k>=0&&k<3)) return '버릴 카드를 고르세요'; s.disc.push(s.hand.splice(k,1)[0]); s.passed=s.hand.slice(); s.seen=s.seen||{}; s.seen[s.rep]=s.passed.slice(); s.seen[s.exe]=s.passed.slice(); s.phase='edisc'; setTurn(s,s.exe); s.notice=`🃏 대표가 1장을 버리고 집행자 ${nm(s.exe)}에게 2장을 넘겼어요`; return null; }
  if(a.k==='edisc'){ if(s.phase!=='edisc'||s.exe!==i) return '집행자 차례가 아니에요'; const k=a.c|0; if(!(k>=0&&k<2)) return '버릴 카드를 고르세요'; s.disc.push(s.hand.splice(k,1)[0]); enact(s,s.hand[0],false); return null; }
  if(a.k==='claim'){ if(s.phase!=='claim'||s.actor!==i) return '지금은 말할 차례가 아니에요'; if(!['GG','GB','BB'].includes(a.c)) return '주장을 고르세요'; recordClaim(s,i,a.c); return null; }
  if(a.k==='acc'){ if(s.phase!=='talk'||s.actor!==i) return '지금은 발언 차례가 아니에요'; if(a.t==null){ s.log.push(`🤐 ${nm(i)}: (넘김)`); afterTalk(s); return null; } const t=a.t|0; if(!s.alive[t]||t===i) return '대상을 고르세요'; if(a.kind==='ask'){ talkT(s,i,`❓ ${nm(t)}, 지금까지 보고 누구 의심해요?`,'ask',t); if(!isH(t)) s.q.push({k:'reply',i:t,by:i,rk:'ask'}); afterTalk(s); return null; } if(a.kind!=='trust'){ accuse(s,i,t,true); const r0=s.q.findIndex(x=>x.k==='reply'); if(r0>=0){ const rr=s.q.splice(r0,1)[0]; s.q.push(rr); } afterTalk(s); return null; } { const cr=cleanReason(s,t); talkT(s,i,`🤝 ${cr?rtText(cr,t)+' ':''}${nm(t)}은(는) 믿어요.`,'trust',t); } s.claims.push({by:i,kind:'trust',t,r:s.round}); afterTalk(s); return null; }
  if(a.k==='dm'){ if(s.wh[i]===s.round) return '귓속말은 라운드마다 한 번이에요'; if(!s.alive[i]) return '처형된 사람은 못 해요'; const t=a.t; if(typeof t!=='number'||isH(t)||t===i||!s.alive[t]) return '귓속말할 사람을 고르세요'; s.wh[i]=s.round; const p=P(s,t);
    if(a.what==='pact'){ dmPush(s,i,i,`(→ ${nm(t)}) 우리 몰래 연합해요. 서로 집행자로 지목하고 찬성해 주기 🤝`,{mine:1}); if(isDev(s.role[t])||belief(s,t)[i]<.4+p.trust*.15){ s.pact[pk(i,t)]={r:s.round}; dmPush(s,i,t,U.pick(['좋아요 🤫 둘만 아는 거예요.','콜! 서로 지목해 주기예요.'])); } else dmPush(s,i,t,'음… 아직은 못 믿겠어요.'); }
    else if(a.what==='god'){ dmPush(s,i,i,`(→ ${nm(t)}) 몰래 말할게요. 저 신이에요 🤫`,{mine:1});
      if(isDev(s.role[t])){ devs(s).forEach(j=>s.godClaim[j]=i); dmPush(s,i,t,'오, 그렇구나… 비밀 지킬게요 😊'); }
      else if(s.role[t]==='arch'){ if(s.role[i]==='god') dmPush(s,i,t,'알아요 😇 제가 지켜 드릴게요.'); else { s.claims.push({by:t,kind:'acc',t:i,r:s.round}); dmPush(s,i,t,'…신은 당신이 아니에요. 왜 거짓말해요? 🤨'); } }
      else { dmPush(s,i,t,'알려 줘서 고마워요. 믿을게요 🤝'); if(p.bluff>.6&&Math.random()<.5) s.leak.push({i:t,h:i}); } }
    else return '알 수 없는 귓속말'; return null; }
  if(a.k==='dmReply'){ const m=(s.dm[i]||[]).find(x=>x.id===a.id&&x.state==='open'); if(!m) return '이미 답했어요'; m.state=a.yes?'yes':'no'; if(a.yes){ s.pact[pk(i,m.from)]={r:s.round}; dmPush(s,i,m.from,'좋아요. 서로 지목해 주기예요 🤫'); } else dmPush(s,i,m.from,'…알겠어요.'); return null; }
  if(a.k==='kill'){ if(s.phase!=='kill'||s.actor!==i) return '처형할 차례가 아니에요'; const t=a.t|0; if(!s.alive[t]||t===i) return '대상을 고르세요'; doKill(s,i,t); return null; }
  if(a.k==='guess'){ if(s.phase!=='guess'||s.actor!==i) return '지금은 지목할 수 없어요'; const t=a.t|0; if(isDev(s.role[t])) return '천사 중에서 고르세요'; resolveGuess(s,t); return null; }
  return '알 수 없는 동작'; }
function enact(s,card,auto){ s.lastCard=card; if(card==='G') s.good++; else s.bad++; s.fails=0;
  const g={r:s.round, rep:auto?null:s.rep, exe:auto?null:s.exe, card, votes:auto?null:s.votes.slice(), rc:null, ec:null, auto}; s.govs.push(g);
  s.notice = `${card==='G'?'😇 선행':'😈 악행'} 적립! (선행 ${s.good}/${GOOD} · 악행 ${s.bad}/${BAD})${auto?' — 부결 3번, 맨 위 카드 자동':''}`; s.log.push(s.notice);
  if(!auto) s.lastExe=s.exe;
  if(!auto&&card==='B') for(const h of HSEAT){ const o=s.rep===h?s.exe:s.exe===h?s.rep:null; if(o!=null&&!isH(o)&&s.pact[pk(h,o)]&&!isDev(s.role[h])){ dmPush(s,h,o,'💔 연합인데, 같이 한 정부에서 악행이 나왔어요…',{state:'bad'}); s.pact[pk(h,o)].sus=1; } }
  if(card==='B'){ const g0=ALL.find(j=>s.role[j]==='god'); const cand=ALL.filter(j=>s.role[j]==='devil'&&!s.godKnow.includes(j)); if(cand.length&&s.alive[g0]){ s.godKnow.push(U.pick(cand)); s.q.push({k:'note',text:'👼 (신에게만 악마 한 명이 몰래 알려졌어요)'}); } }
  s.phase='wait'; s.turn=null; s.actor=null;
  if(s.bad>=BAD){ s.q.push({k:'end',w:'dev',why:'악행 5장 적립'}); return; }
  if(s.good>=GOOD){ s.q.push({k:'guessStart'}); return; }
  if(!auto){ s.q.push({k:'claimRep'}); }
  if(card==='B'&&s.bad===4&&!auto) s.q.push({k:'killStart'});
  s.q.push({k:'talk'}); }
function recordClaim(s,i,c){ const g=s.govs[s.govs.length-1]; if(i===g.rep) g.rc=c; else g.ec=c; const T={GG:'선·선',GB:'선·악',BB:'악·악'}[c];
  s.log.push(`📣 ${nm(i)}: ${i===g.rep?'"넘긴 2장은':'"받은 2장은'} ${T}이었어요"`); s.feed.push({r:s.round,seat:i,text:`📣 ${i===g.rep?'넘긴 2장은':'받은 2장은'} ${T}이었어요`,kind:'claim'}); s.mood[i]={e:'📣',n:(s.moodN=(s.moodN||0)+1)};
  if(!isH(i)&&isDev(s.role[i])&&c!==((s.seen&&s.seen[i])||[]).slice().sort((a,b)=>a==='G'?-1:b==='G'?1:0).join('')&&Math.random()<(1-P(s,i).bluff)*.45){ s.tell[i]=s.round; s.mood[i]={e:'😅',n:(s.moodN=(s.moodN||0)+1)}; } s.notice=s.log[s.log.length-1]; s.phase='wait'; s.turn=null; s.actor=null;
  if(i===g.rep) s.q.unshift({k:'claimExe'}); }
function doKill(s,i,t){ s.alive[t]=false; s.notice=`⚔️ ${nm(i)}이(가) ${nm(t)}을(를) 처형 — 정체는 ${RN[s.role[t]]}!`; s.log.push(s.notice); s.phase='wait'; s.turn=null; s.actor=null;
  if(s.role[t]==='lucifer'){ s.q.unshift({k:'end',w:'ang',why:'루시퍼가 처형됨'}); } }
function resolveGuess(s,t){ const ok=s.role[t]==='god'; s.guess=t; s.phase='wait'; s.turn=null; s.actor=null;
  s.notice=`🎯 악마팀의 지목: ${nm(t)} — ${ok?'정답! 신이었어요. 악마 역전승!':'틀렸어요. 천사팀 승리!'}`; s.log.push(s.notice); s.q.push({k:'end',w:ok?'dev':'ang',why:ok?'신을 맞힘':'선행 5장'}); }
function afterTalk(s){ s.phase='wait'; s.turn=null; s.actor=null; s.q.push({k:'talkNext'}); }
const INTER=['nominate','vote','rdisc','edisc','claim','talk','kill','guess'];
function apply(s,p,a){ syncH(s); if(s.winner!=null) return '게임이 끝났어요'; if(!a) return '알 수 없는 동작'; if(!INTER.includes(s.phase)&&a.k!=='dm'&&a.k!=='dmReply') return '잠시만요 — 진행 중이에요'; if((a.k==='dm'||a.k==='dmReply')&&['intro','roles','reveal','debrief','over','guess'].includes(s.phase)) return '지금은 귓속말할 수 없어요';
  const e=act(s,HSEAT[p],a); if(!e) s.ev++; return e; }
function stepDelay(s){ syncH(s); if(s.winner!=null) return null;
  if(s.phase==='intro') return 2400; if(s.phase==='roles') return 4000;
  if(['nominate','rdisc','edisc','claim','talk','kill','guess'].includes(s.phase)) return isH(s.actor)?null:s.think;
  if(s.q.length&&s.phase!=='vote'){ const k=s.q[0].k; return k==='note'?1700 : k==='vrev'?900 : k==='say'?1800 : k==='reply'||k==='sweatR'?2900 : 600; }
  if(s.phase==='vote'){ const left=alive(s).filter(i=>!s.votes[i]); if(!left.length) return 500; return left.some(i=>!isH(i))?500+Math.random()*700:null; }
  if(s.phase==='reveal') return 2600; if(s.phase==='debrief') return s.dj<s.dlist.length?2200:1200;
  return null; }
function step(s){ syncH(s);
  if(s.phase==='intro'){ s.phase='roles'; s.notice=HSEAT.length===2&&mode!=='solo'?'🎭 역할이 정해졌어요 — 내 역할을 확인하세요 (우리 둘은 서로 다른 팀)':'🎭 역할이 정해졌어요 — 내 역할을 확인하세요 (사람끼리도 같은 팀일 수도, 다른 팀일 수도)'; s.ev++; return; }
  if(s.phase==='roles'){ startRound(s); s.ev++; return; }
  if(s.q.length&&!INTER.includes(s.phase)){ const e=s.q.shift();
    if(e.k==='note'){ s.notice=e.text; s.log.push(e.text); }
    else if(e.k==='vrev'){ const i=e.i; s.vshown=(s.vshown||[]).concat([i]); s.notice=`🗳️ ${nm(i)}: ${s.votes[i]==='Y'?'⭕ 찬성':'❌ 반대'}`; }
    else if(e.k==='vres'){ const y=alive(s).filter(i=>s.votes[i]==='Y').length, n=alive(s).length-y; s.vshown=null;
      if(y>n){ s.notice=`✅ 찬성 ${y} : 반대 ${n} — 당선! 카드 3장을 뽑아요`; s.log.push(`✅ ${nm(s.rep)}·${nm(s.exe)} 당선 (${y}:${n})`); s.hand=draw(s,3); s.phase='rdisc'; setTurn(s,s.rep); }
      else { s.fails++; s.notice=`❌ 찬성 ${y} : 반대 ${n} — 부결 (연속 ${s.fails}번)`; s.log.push(s.notice); if(s.fails>=3){ const c=draw(s,1)[0]; enact(s,c,true); } else startRound(s); } }
    else if(e.k==='claimRep'){ const g=s.govs[s.govs.length-1]; s.phase='claim'; setTurn(s,g.rep); s.notice=`📣 대표 ${nm(g.rep)}: 집행자에게 넘긴 2장은?`; }
    else if(e.k==='claimExe'){ const g=s.govs[s.govs.length-1]; s.phase='claim'; setTurn(s,g.exe); s.notice=`📣 집행자 ${nm(g.exe)}: 받은 2장은?`; }
    else if(e.k==='killStart'){ s.phase='kill'; setTurn(s,s.rep); s.notice=`⚔️ 네 번째 악행 — 대표 ${nm(s.rep)}이(가) 1명을 처형해요`; }
    else if(e.k==='talk'){ const sp=U.shuffle(alive(s).filter(i=>i!==s.rep)).filter(i=>isH(i)||Math.random()<.3+P(s,i).talk*.5).slice(0,3); s.talkers=sp; s.q.unshift({k:'talkNext'}); }
    else if(e.k==='reply'){ const t=e.i, p=P(s,t), by=e.by;
      if(e.rk==='ask'){ const sus=belief(s,t); const x=alive(s).filter(j=>j!==t&&j!==by&&!(isDev(s.role[t])&&isDev(s.role[j]))).sort((a,b)=>sus[b]-sus[a])[0]; const xr=x!=null?pubReason(s,x):null; if(xr){ talkT(s,t,`저는 ${nm(x)}이(가) 걸려요. ${rtText(xr,x)}`,'ans',x); s.claims.push({by:t,kind:'acc',t:x,r:s.round}); } else talkT(s,t,lineX(s,t,'ansNone'),'ans'); }
      else { const guilty=isDev(s.role[t]); const gg=e.g; const x=gg?[gg.rep,gg.exe].find(j=>j!=null&&j!==t):null;
        if(guilty&&e.rk!=='none'&&Math.random()<(1-p.bluff)*.5){ s.tell[t]=s.round; talkT(s,t,lineX(s,t,'nervous'),'nervous'); const w=alive(s).find(j=>!isH(j)&&j!==t&&j!==by&&P(s,j).logic>.6); if(w!=null&&Math.random()<.6) s.q.unshift({k:'sweatR',i:w,t}); }
        else { const k='reb_'+(['exeGB','contra','badGov','voteBad','voteNo'].includes(e.rk)?e.rk:'none'); talkT(s,t,lineX(s,t,k,{t:by,x})||lineX(s,t,'reb_none',{t:by}),'reb',by); } } }
    else if(e.k==='sweatR'){ talkT(s,e.i,lineX(s,e.i,'sweat',{t:e.t}),'sweat',e.t); }
    else if(e.k==='talkNext'){ const i=(s.talkers||[]).shift(); if(i==null){ startRound(s); } else { s.phase='talk'; setTurn(s,i); s.notice=`💬 ${nm(i)}의 한마디`; } }
    else if(e.k==='guessStart'){ const leader=devs(s).find(i=>isH(i)&&s.alive[i]) ?? devs(s).find(i=>s.role[i]==='lucifer') ?? devs(s)[0]; s.phase='guess'; setTurn(s,leader); s.notice=`🎯 선행 5장! 하지만 악마팀이 신을 맞히면 역전 — ${nm(leader)}이(가) 대표로 지목해요`; s.log.push(s.notice); }
    else if(e.k==='end'){ s.wteam=e.w; s.endWhy=e.why; s.phase='reveal'; s.notice=`🏁 ${e.w==='dev'?'😈 악마팀':'😇 천사팀'} 승리 (${e.why}) — 정체 공개!`; s.log.push(s.notice); s.dlist=ALL.filter(i=>!isH(i)); s.dj=0; }
    s.ev++; return; }
  if(s.phase==='vote'){ const npc=alive(s).find(i=>!isH(i)&&!s.votes[i]); if(npc!=null){ s.votes[npc]=npcVote(s,npc); s.log.push(`🗳️ ${nm(npc)} 투표함`); s.ev++; return; }
    if(alive(s).every(i=>s.votes[i])){ s.phase='wait'; s.vshown=[]; for(const i of alive(s)) s.q.push({k:'vrev',i}); s.q.push({k:'vres'}); s.ev++; } return; }
  if(isH(s.actor)) return; const i=s.actor;
  if(s.phase==='nominate'){ act(s,i,{k:'nom',t:npcNominate(s,i)}); if(Math.random()<P(s,i).talk*.5) say(s,i,'nom',s.exe); s.ev++; return; }
  if(s.phase==='rdisc'){ act(s,i,{k:'rdisc',c:npcRepDisc(s,i,s.hand)}); s.ev++; return; }
  if(s.phase==='edisc'){ const h=s.hand.slice(); act(s,i,{k:'edisc',c:npcExeDisc(s,i,h)}); s.ev++; return; }
  if(s.phase==='claim'){ const g=s.govs[s.govs.length-1]; act(s,i,{k:'claim',c:claimOf(s,i,(s.seen&&s.seen[i])||['B','B'])}); s.ev++; return; }
  if(s.phase==='talk'){ const sus=belief(s,i); const c=alive(s).filter(j=>j!==i); const top=c.sort((a,b)=>sus[b]-sus[a])[0]; const lo=c.slice().sort((a,b)=>sus[a]-sus[b])[0];
    const lk=(s.leak||[]).find(x=>x.i===i&&!x.done); let done=false;
    if(lk){ lk.done=1; talkT(s,i,lineX(s,i,'leak',{t:lk.h}),'leak',lk.h); devs(s).forEach(j=>s.godClaim[j]=lk.h); dmPush(s,lk.h,i,'😱 내가 몰래 한 말을 모두 앞에서 폭로했어요!',{state:'bad'}); done=true; }
    else if(isDev(s.role[i])){ const cand=c.filter(j=>!isDev(s.role[j])&&pubReason(s,j)&&!s.pact[pk(i,j)]); if(cand.length) done=accuse(s,i,U.pick(cand)); }
    else if(s.role[i]==='god'&&s.godKnow.some(j=>s.alive[j])&&Math.random()<.2+P(s,i).temper*.35){ const d=s.godKnow.find(j=>s.alive[j]); if(pubReason(s,d)) done=accuse(s,i,d); }
    else if(sus[top]>.55&&!s.pact[pk(i,top)]){ const alt=c.filter(j=>j!==top&&sus[j]>.5&&pubReason(s,j)&&!s.claims.some(x=>x.r===s.round&&x.t===j)).sort((a,b)=>sus[b]-sus[a])[0]; const hit=s.claims.some(x=>x.r===s.round&&x.t===top&&x.kind==='acc'); done=accuse(s,i,hit&&alt!=null&&Math.random()<.6?alt:top); }
    if(!done){ const cr=cleanReason(s,lo); if(cr&&Math.random()<.5){ const c2=lineX(s,i,'trustC',{t:lo}); if(c2){ talkT(s,i,rtText(cr,lo)+' '+c2,'trust',lo); s.claims.push({by:i,kind:'trust',t:lo,r:s.round}); done=true; } }
      if(!done){ const t2=U.pick(c); talkT(s,i,lineX(s,i,'ask',{t:t2}),'ask',t2); if(!isH(t2)) s.q.unshift({k:'reply',i:t2,by:i,rk:'ask'}); } }
    afterTalk(s); s.ev++; return; }
  if(s.phase==='kill'){ const t=npcKill(s,i); say(s,i,'kill',t); doKill(s,i,t); s.ev++; return; }
  if(s.phase==='guess'){ const c=alive(s).concat(ALL.filter(j=>!s.alive[j])).filter(j=>!isDev(s.role[j])); const dead=ALL.find(j=>!s.alive[j]&&s.role[j]==='god'); resolveGuess(s, dead!=null?dead:godGuess(s,c)); s.ev++; return; }
  if(s.phase==='reveal'){ s.phase='debrief'; s.ev++; return; }
  if(s.phase==='debrief'){ if(s.dj<s.dlist.length){ const i=s.dlist[s.dj++]; const r=s.role[i]; const t='(속마음) '+(isDev(r)?`저 ${RN[r]}였어요 😏 ${s.govs.some(g=>g.exe===i&&g.card==='B')?'그 악행, 제가 냈죠.':'끝까지 숨었네요.'}`:r==='god'?`제가 ${RN[r]}였어요. ${s.godKnow.length?`${s.godKnow.map(nm).join('·')}이(가) 악마인 걸 알고 있었어요.`:'아무것도 몰라서 답답했어요.'}`:`저는 ${RN[r]}였어요.`);
      s.say={seat:i,text:t,n:(s.say?s.say.n:0)+1}; s.log.push(`💭 ${nm(i)}: ${t}`); s.ev++; return; }
    s.phase='over'; const t0=isDev(s.role[HSEAT[0]])?'dev':'ang'; s.winner = s.wteam===t0?0:1; s.winners=HSEAT.map((h,p)=>(isDev(s.role[h])?'dev':'ang')===s.wteam?p:-1).filter(x=>x>=0); s.ev++; return; }
}
function mask(s,p){ syncH(s); const v=U.clone(s), me=HSEAT[p], open=s.phase==='reveal'||s.phase==='debrief'||s.phase==='over'; const K=know(s,me); v.dm={[me]:s.dm[me]||[]}; v.pact={}; for(const k in s.pact) if(k.split('-').map(Number).includes(me)) v.pact[k]=s.pact[k]; v.godClaim={}; v.leak=[];
  if(!open){ v.role=s.role.map((r,j)=> j===me ? r : (K[j]===1&&isDev(s.role[me])) ? r : (!s.alive[j]) ? r : (s.role[me]==='arch'&&r==='god') ? r : null); v.godKnow=s.role[me]==='god'?s.godKnow:[]; }
  v.hand = (s.phase==='rdisc'&&s.rep===me)||(s.phase==='edisc'&&s.exe===me) ? s.hand : null; v.passed=null;
  if(s.phase==='vote') v.votes=s.votes.map((x,j)=>j===me?x:(x?'?':null)); if(s.phase==='wait'&&s.vshown) v.votes=s.votes.map((x,j)=>j===me||s.vshown.includes(j)?x:(x?'?':null));
  v.seen={}; if(s.seen&&s.seen[me]) v.seen[me]=s.seen[me]; v.deck=null; v.dn=s.deck.length; v.q=[]; v.used={}; v.lastCard=null; return v; }
/* 혼자 모드 상대(자리 4): 자기 자리 정보(마스크)로 NPC와 같은 판단 */
function ai(v,lvl){ syncH(v); return aiSeat(v,HSEAT[1],lvl); }
function aiSeat(v,i,lvl){ const s=Object.assign({},v,{role:v.role.map((r,j)=>r||'angel')});
  if(v.phase==='nominate'&&v.rep===i) return {k:'nom',t:npcNominate(s,i)};
  if(v.phase==='vote'&&v.alive[i]&&!v.votes[i]) return {k:'vote',v:npcVote(s,i)};
  if(v.phase==='rdisc'&&v.rep===i&&v.hand) return {k:'rdisc',c:npcRepDisc(s,i,v.hand)};
  if(v.phase==='edisc'&&v.exe===i&&v.hand) return {k:'edisc',c:npcExeDisc(s,i,v.hand)};
  if(v.phase==='claim'&&v.actor===i){ const g=v.govs[v.govs.length-1]; const sn=(v.seen&&v.seen[i])||['B','B']; const hn=sn.slice().sort((a,b)=>a==='G'?-1:b==='G'?1:0).join(''); return {k:'claim',c: isDev(v.role[i])&&g.card==='B' ? 'BB' : hn}; }
  if(v.phase==='talk'&&v.actor===i){ const sus=belief(s,i); const c=v.alive.map((a,j)=>a&&j!==i?j:-1).filter(j=>j>=0); const mine=new Set(v.claims.filter(x=>x.by===i&&x.kind==='acc').map(x=>x.t)); const pool=c.filter(j=>pubReason(v,j)&&!mine.has(j)&&!(isDev(v.role[i])&&v.role[j]&&isDev(v.role[j]))).sort((a,b)=>sus[b]-sus[a]); if(pool.length&&Math.random()<.75) return {k:'acc',kind:'acc',t:pool[0]}; const q=c.filter(j=>!isH(j)); return q.length?{k:'acc',kind:Math.random()<.5?'ask':'trust',t:Math.random()<.5?U.pick(q):c.sort((a,b)=>sus[a]-sus[b])[0]}:{k:'acc',t:null}; }
  if(v.phase==='kill'&&v.actor===i) return {k:'kill',t:npcKill(s,i)};
  if(v.phase==='guess'&&v.actor===i){ const c=ALL.filter(j=>!(v.role[j]&&isDev(v.role[j]))); const dead=ALL.find(j=>!v.alive[j]&&v.role[j]==='god'); return {k:'guess',t:dead!=null?dead:godGuess(s,c)}; }
  return null; }
function aiDelay(){ return 1600+Math.random()*1800; }

/* 화면 */
let WHO={}, sel=null, sig='', lastDm=0, lastSay=0, dmT=null;
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function josa(name,a,b){ const base=name.replace(/\(나\)$/,''), c=base.charCodeAt(base.length-1); return c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28 ? a : b; }
const JO={'이(가)':['이','가'],'은(는)':['은','는'],'을(를)':['을','를']};
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}(이\(가\)|은\(는\)|을\(를\))?/g,(_,d,j)=>{ const n=seatName(+d,ctx); return `${seatEmoji(+d)} ${n}${j?josa(n,JO[j][0],JO[j][1]):''}`; }); }
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{}; const me=HSEAT[ctx.me], myRole=v.role[me], myTurn=v.turn===ctx.me;
  const sg=v.round+':'+v.phase+':'+v.actor; if(sg!==sig){ sig=sg; sel=null; }
  let h=`<div class="hl-notice">${fill(U.esc(v.notice||''),ctx)}</div>`;
  if(v.say&&v.say.n!==lastSay){ if(lastSay&&ctx.sfx) ctx.sfx('tick'); lastSay=v.say.n; }
  { const feed=(v.feed||[]).slice(-3); h+=`<div class="vr-feed">${feed.map((x,k)=>`<div class="${k===feed.length-1?'new':''}"><span class="w">${seatEmoji(x.seat)} ${seatName(x.seat,ctx)}</span> ${fill(U.esc(x.text),ctx)}</div>`).join('')||'<div class="empty">아직 조용해요</div>'}</div>`; }
  h+=`<div class="info">내 역할: <b>${RN[myRole]||'?'}</b> · ${isDev(myRole)?'😈 악마팀':'😇 천사팀'}${myRole==='god'&&v.godKnow.length?` · 알고 있는 악마: ${v.godKnow.map(j=>fill(nm(j),ctx)).join(', ')}`:''}${myRole==='arch'?` · 신은 ${fill(nm(v.role.indexOf('god')),ctx)}`:''}</div>`;
  h+=`<div class="ge-track"><div class="g">😇 선행 ${[...Array(GOOD)].map((_,k)=>`<i class="${k<v.good?'on':''}"></i>`).join('')}</div><div class="b">😈 악행 ${[...Array(BAD)].map((_,k)=>`<i class="${k<v.bad?'on':''} ${k===3?'kill':''}"></i>`).join('')}</div><small>부결 ${v.fails}/3 · 더미 ${v.dn}장</small></div>`;
  const pickable = myTurn&&['nominate','talk','kill','guess'].includes(v.phase);
  h+=`<div class="ev-seats">${ALL.map(i=>{ const r=v.role[i]; const can=pickable&&v.alive[i]&&i!==me&&!(v.phase==='guess'&&r&&isDev(r));
      const sp=v.say&&v.say.seat===i, tg=v.say&&v.say.t===i&&['acc','sweat','leak'].includes(v.say.kind), md=!isH(i)&&v.alive[i]&&v.mood&&v.mood[i], pc=(v.pact||{})[pk(i,me)];
      return `<button class="ev-seat ${i===me?'me':''} ${v.actor===i?'act':''} ${sel===i?'sel':''} ${!v.alive[i]?'dead':''} ${sp?'speak':''} ${tg?'tgt':''}" data-t="${i}" ${can?'':'disabled'}>${md?`<span class="kg-mood ${sp?'pop':''}">${md.e}</span>`:''}${pc?`<span class="fs-pact">${pc.sus?'💔':'🤫'}</span>`:''}
        <div class="ev-nm">${seatEmoji(i)} ${seatName(i,ctx)}</div>${isH(i)?'':`<small class="ev-arch">${NPCI(i)[2]}</small>`}
        <div class="ev-prof">${r?RN[r]:'❔'}${!v.alive[i]?' ☠️':''}</div>
        <div class="ev-mind">${v.rep===i?'🎙️대표 ':''}${v.exe===i?'⚖️집행자 ':''}${v.votes&&v.votes[i]?(v.votes[i]==='Y'?'⭕':v.votes[i]==='N'?'❌':'🗳️'):''}</div></button>`; }).join('')}</div>`;
  if(myTurn&&v.phase==='nominate') h+=`<div class="vr-card"><b>🎙️ 집행자를 지목하세요</b> <small>${sel!=null?`→ ${fill(nm(sel),ctx)}`:'위에서 한 명을 누르세요'} · 직전 집행자는 연속 불가</small><div class="fh-act"><button data-a="nom" ${sel!=null?'':'disabled'}>지목</button></div></div>`;
  if(v.phase==='vote'&&v.alive[me]&&!v.votes[me]) h+=`<div class="vr-card"><b>🗳️ ${fill(nm(v.rep),ctx)} · ${fill(nm(v.exe),ctx)} 정부, 찬성?</b><div class="fh-act"><button data-v="Y">⭕ 찬성</button><button data-v="N" style="background:#b8412f">❌ 반대</button></div></div>`;
  if(v.hand&&myTurn&&(v.phase==='rdisc'||v.phase==='edisc')) h+=`<div class="vr-card"><b>🃏 ${v.phase==='rdisc'?'대표: 3장 중 버릴 1장':'집행자: 2장 중 버릴 1장 (남은 1장이 적립돼요)'}</b><div class="ge-hand">${v.hand.map((c,k)=>`<button class="ge-card ${c==='G'?'g':'b'}" data-c="${k}">${c==='G'?'😇 선행':'😈 악행'}</button>`).join('')}</div><small>누른 카드를 버려요</small></div>`;
  if(myTurn&&v.phase==='claim'){ const g=v.govs[v.govs.length-1]; h+=`<div class="vr-card"><b>📣 ${me===g.rep?'집행자에게 넘긴 2장은?':'대표에게 받은 2장은?'}</b> <small>거짓말도 가능</small><div class="fh-act">${[['GG','😇😇 선·선'],['GB','😇😈 선·악'],['BB','😈😈 악·악']].map(([c,t])=>`<button class="ghost" data-cl="${c}">${t}</button>`).join('')}</div></div>`; }
  if(myTurn&&v.phase==='talk') h+=`<div class="vr-card"><b>💬 한마디</b> <small>${sel!=null?`대상: ${fill(nm(sel),ctx)}`:'위에서 사람을 누르세요'}</small><div class="fh-act"><button data-ta="acc" ${sel!=null?'':'disabled'} style="background:#b8412f">🤨 수상해요</button><button data-ta="trust" ${sel!=null?'':'disabled'}>🤝 믿어요</button><button class="ghost" data-ta="ask" ${sel!=null?'':'disabled'}>❓ 누구 의심해요?</button><button class="ghost" data-ta="skip">🤐 넘기기</button></div></div>`;
  if(myTurn&&v.phase==='kill') h+=`<div class="vr-card"><b>⚔️ 처형할 1명</b> <small>${sel!=null?fill(nm(sel),ctx):'위에서 누르세요'} · 루시퍼를 처형하면 천사 승리!</small><div class="fh-act"><button data-a="kill" ${sel!=null?'':'disabled'}>처형</button></div></div>`;
  if(myTurn&&v.phase==='guess') h+=`<div class="vr-card"><b>🎯 신은 누구?</b> <small>맞히면 악마팀 역전승</small><div class="fh-act"><button data-a="guess" ${sel!=null?'':'disabled'}>${sel!=null?fill(nm(sel),ctx):'?'} 지목</button></div></div>`;
  if(v.phase==='over') h+=`<div class="sn-score"><div><b>${v.wteam==='dev'?'😈 악마팀':'😇 천사팀'} 승리</b> — ${U.esc(v.endWhy)}</div>${ALL.map(i=>`<div class="${isH(i)?'h':''}">${seatEmoji(i)} ${seatName(i,ctx)} ${RN[v.role[i]]}</div>`).join('')}</div>`;
  const L=U.politics(v.feed,{seats:ALL,emo:seatEmoji,name:i=>seatName(i,ctx),me,alive:i=>v.alive[i],pacts:Object.entries(v.pact||{}).map(([k,p])=>{ const [a,b]=k.split('-').map(Number); return [a,b,p.broken!=null||!!p.sus]; }).filter(x=>x[0]===me||x[1]===me)})+`<div class="side-box"><div class="side-h">🏛️ 정부 기록 <small>최근이 위</small></div>${v.govs.slice().reverse().map(g=>`<div class="side-row" style="flex-wrap:wrap"><small>${g.r}R</small> ${g.auto?'(자동)':`${seatEmoji(g.rep)}→${seatEmoji(g.exe)}`} ${g.card==='G'?'😇':'😈'} <small>${g.rc?`대표 "${({GG:'선선',GB:'선악',BB:'악악'})[g.rc]}"`:''} ${g.ec?`집행 "${({GG:'선선',GB:'선악',BB:'악악'})[g.ec]}"`:''}${g.rc&&g.ec&&g.rc!==g.ec?' ⚠️모순':''}</small></div>`).join('')||'<div class="side-row"><small>-</small></div>'}
    <div class="side-h" style="margin-top:8px">🧠 마음 지도</div>${ALL.map(i=>{ const acc=v.claims.filter(c=>c.by===i&&c.kind==='acc').slice(-3); return `<div class="side-row">${seatEmoji(i)} <small>${acc.map(c=>`🤨${seatEmoji(c.t)}`).join(' ')||'-'} · 받은 의심 ${v.claims.filter(c=>c.t===i&&c.kind==='acc').length}</small></div>`; }).join('')}</div>`;
  { const D=(v.dm&&v.dm[me]||[]).slice(-5), canW=v.alive[me]&&['nominate','vote','rdisc','edisc','claim','talk','wait','kill'].includes(v.phase)&&v.round>0&&v.wh[me]!==v.round; const newest=D.length?D[D.length-1].id:0, fresh=newest>lastDm; if(fresh&&lastDm&&ctx.sfx) ctx.sfx('host'); lastDm=newest;
    if(D.length||canW){ let hh=`<div class="kg-dm fs-dm ${fresh?'slide':''}"><div class="kg-fh">🤫 귓속말 <small>나만 보여요 · 라운드마다 한 번</small></div>${D.map(m=>`<div class="${m.state==='open'?'open':''} ${m.state==='bad'?'bad':''}">${m.mine?'<small>나</small> ':`<b>${seatEmoji(m.from)} ${seatName(m.from,ctx)}</b> `}${fill(U.esc(m.text),ctx)}${m.state==='open'?` <button class="small" data-dr="${m.id}:1">🤫 좋아요</button><button class="ghost small" data-dr="${m.id}:0">🙅 싫어요</button>`:''}</div>`).join('')}`;
      if(canW) hh+= dmT==null ? `<div class="fh-act"><small>누구에게?</small>${ALL.filter(j=>!isH(j)&&v.alive[j]).map(j=>`<button class="ghost small" data-wt="${j}">${seatEmoji(j)} ${seatName(j,ctx)}</button>`).join('')}</div>`
        : `<div class="fh-act"><small>→ ${seatEmoji(dmT)} ${seatName(dmT,ctx)}:</small><button class="small" data-w="pact">🤝 몰래 연합(서로 집행자로)</button><button class="ghost small" data-w="god" title="상대가 악마면 마지막에 지목당할 수도!">🔎 저 신이에요</button><button class="ghost small" data-w="x">취소</button></div>`;
      h+=hh+'</div>'; } }
  const R=U.chat(v.feed,{emo:seatEmoji,name:i=>seatName(i,ctx),fill:t=>fill(t,ctx),me})+`<div class="side-box side-log"><div class="side-h">📜 진행 기록 <small>최근이 위</small></div>${v.log.slice(-80).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=`<div class="side3 has-chat"><div class="side-mid">${h}</div><aside class="side-l">${L}</aside><aside class="side-r">${R}</aside></div>`;
  el.onclick=e=>{ const dr=e.target.closest('[data-dr]'); if(dr){ const [id,y]=dr.dataset.dr.split(':'); return ctx.act({k:'dmReply',id:+id,yes:y==='1'}); }
    const wt=e.target.closest('[data-wt]'); if(wt){ dmT=+wt.dataset.wt; return ctx.rerender(); }
    const w=e.target.closest('[data-w]'); if(w){ const t=dmT; dmT=null; if(w.dataset.w==='x') return ctx.rerender(); return ctx.act({k:'dm',t,what:w.dataset.w}); }
    const t=e.target.closest('[data-t]'); if(t&&!t.disabled){ sel=+t.dataset.t; return ctx.rerender(); }
    const vv=e.target.closest('[data-v]'); if(vv) return ctx.act({k:'vote',v:vv.dataset.v});
    const c=e.target.closest('[data-c]'); if(c) return ctx.act({k:v.phase==='rdisc'?'rdisc':'edisc',c:+c.dataset.c});
    const cl=e.target.closest('[data-cl]'); if(cl) return ctx.act({k:'claim',c:cl.dataset.cl});
    const ta=e.target.closest('[data-ta]'); if(ta&&!ta.disabled) return ctx.act({k:'acc',kind:ta.dataset.ta,t:ta.dataset.ta==='skip'?null:sel});
    const a=e.target.closest('[data-a]'); if(!a||a.disabled) return; const k=a.dataset.a;
    if(k==='nom') return ctx.act({k:'nom',t:sel}); if(k==='kill') return ctx.act({k:'kill',t:sel}); if(k==='guess') return ctx.act({k:'guess',t:sel}); };
}
function status(v,ctx){ syncH(v); const me=HSEAT[ctx.me]; if(v.phase==='over') return ''; if(v.phase==='vote'&&v.alive[me]&&!v.votes[me]) return '투표하세요';
  if(v.turn===ctx.me) return {nominate:'집행자를 지목하세요',rdisc:'버릴 카드',edisc:'버릴 카드',claim:'무엇을 봤는지 말하세요',talk:'한마디 하세요',kill:'처형할 사람',guess:'신을 지목하세요'}[v.phase]||''; return '진행 중…'; }
const guide=`
<p><b>천사 vs 악마 정체 숨기기</b> — 7인(둘이 하면 늘 <b>서로 다른 팀</b>, 셋 이상이면 팀 무작위 + 나머지는 성격 다른 컴퓨터).</p>
<ol><li>천사팀 4(👼신 · 😇대천사 · 천사 2) vs 악마팀 3(😈루시퍼 · 👿악마 2). 악마끼리는 서로 알아요. 대천사는 신을 알고, 신은 <b>악행이 쌓일 때마다 악마 1명</b>을 알게 돼요.</li>
<li>차례로 <b>대표</b>가 <b>집행자</b>를 지목 → 모두 찬반 투표(과반 찬성이면 당선). 3번 연속 부결이면 맨 위 카드가 자동 적립.</li>
<li>카드 3장: 대표가 1장 몰래 버림 → 집행자가 2장 중 1장 버림 → <b>남은 1장 적립</b>. 둘은 뭘 봤는지 말해요(<b>거짓말 가능</b>).</li>
<li>😈 악행 5장 = 악마 승리. 😇 선행 5장 = 천사 승리 — 단, 그때 <b>악마팀이 신을 맞히면</b> 악마 역전승!</li>
<li>⚔️ 네 번째 악행 때 대표가 1명을 처형(정체 공개). 루시퍼를 처형하면 천사 승리.</li></ol>
<div class="tipbox">💡 <b>팁</b><br>· 대표와 집행자 말이 다르면 둘 중 하나는 거짓말쟁이(정부 기록에 ⚠️).<br>· 신은 아는 걸 너무 티 내면 악마에게 들켜요!<br>· 악마는 천사인 척 선행을 내서 믿음을 사기도 해요.</div>`;
const guideSteps=[
  {t:'🎭 두 팀', h:'천사 4 vs 악마 3. 악마끼리는 서로 알고, <b>신</b>은 악행이 쌓일수록 악마를 하나씩 알게 돼요.', demo:s=>{ s.phase='roles'; return s; }},
  {t:'🗳️ 대표와 집행자', h:'대표가 집행자를 지목하면 <b>모두 찬반 투표</b>. 과반 찬성이면 당선!', demo:s=>{ startRound(s); s.exe=(s.rep+2)%N; s.phase='vote'; s.turn=null; return s; }},
  {t:'🃏 카드 3장', h:'대표가 1장, 집행자가 1장 버리고 <b>남은 1장</b> 적립. 무엇을 봤는지는 <b>거짓말</b>해도 돼요.', demo:s=>{ startRound(s); s.rep=0; s.exe=2; s.hand=['G','B','B']; s.phase='rdisc'; s.actor=0; s.turn=0; return s; }},
  {t:'🏆 승리 조건', h:'악행 5 = 악마 승리. 선행 5 = 천사 승리 — 단 <b>악마가 신을 맞히면 역전</b>!', demo:s=>{ startRound(s); s.good=4; s.bad=3; return s; }},
];
window.GAMES.goodevil = { _sync:x=>syncH(x), maxH:7,
  title:'선과 악', ref:'피의 게임 「선과 악」', emoji:'😇', tags:['정체 숨기기','팀전','추리','NPC','두뇌서바이벌'],
  tagline:'천사와 악마, 선행과 악행. 거짓 주장 속에서 정부를 믿을 것인가 — 그리고 신은 끝까지 숨을 수 있을까.',
  guide, guideSteps, init, apply, mask, ai, aiDelay, render, status, step, stepDelay, noPersona:true, wide:true,
  reset(){ sel=null; sig=''; lastDm=0; lastSay=0; dmT=null; },
  bar:(v,i)=>`<span class="tag">${RN[v.role[HSEAT[i]]]?'🎭':''}</span>`,
  result:(v,ctx)=>v.wteam?`${v.wteam==='dev'?'😈 악마팀':'😇 천사팀'} 승리`:'',
  _belief:belief, _aiSeat:aiSeat,
};
})();
