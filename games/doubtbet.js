(function(){
'use strict';
/* 의심 베팅 (5인: 우리 둘 + NPC 3명). 카드 60장 = 빨·노·초·파·보 10장씩 + 🌈레인보우 10장(어느 색이든 대신함).
   각자 칩 5개 = 받는 카드 수(최대 5). 내 카드만 보임.
   선: "모두 합쳐 ○색 N장 이상!" 선언 + 칩 걸기 → 다음 사람: 인정(앞사람 칩 돌려줌, 더 큰 수로 새 선언) 또는 의심!
   의심하면 둘이 베팅 대결(콜·레이즈·포기 — 포기하면 카드 공개 없이 짐) → 콜이면 한 명씩 카드 공개해 세기:
   선언 색 + 🌈 합이 선언 이상이면 선언자 승, 아니면 의심한 사람 승. 이긴 쪽이 판돈 전부. 칩 0이면 탈락, 3명 남거나 20라운드면 끝. */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로 — 고르게 퍼지게, 나머지는 NPC */
const N=5, START=5, MAXR=20, RCAP=2; let HSEAT=[0,2]; const SEATORD=[0,2,4,1,3];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i);
const ALL=[...Array(N).keys()];
const COL=['R','Y','G','B','P'], CK={R:'빨강',Y:'노랑',G:'초록',B:'파랑',P:'보라',W:'🌈'}, CH={R:'#e2574c',Y:'#f0c330',G:'#4caf6a',B:'#4a7bd0',P:'#8e5cc7',W:'#999'};
const STYLE={seojin:'logic', doyun:'emo', haram:'calm', yuna:'emo', minho:'sly', taekyung:'emo', jihu:'sly', soyul:'logic'};
const DEF_P={talk:.6,aggr:.5,trust:.5,bluff:.5,logic:.6,temper:.4};
const nm=i=>`{s${i}}`;
function init(starter,o){ const k=Math.max(2,Math.min(5,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  const s={chips:Array(N).fill(START), out:Array(N).fill(false), round:0, lead:starter===0?0:2, hand:ALL.map(()=>[]), phase:'intro', claim:null, chain:[], duel:null, rev:-1,
    stats:ALL.map(()=>({decl:0,doubt:0,doubtWin:0,bluffCaught:0,folds:0})), hist:[], who:{}, used:{}, say:null, q:[], log:[], feed:[], mood:{}, dm:{}, dmN:0, pact:{}, wh:{}, hint:null, told:{}, turn:null, starter, winner:null, notice:'🎙️ 의심 베팅을 시작합니다', ev:0};
  s.hs=HSEAT.slice(); const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=ids[k]);
  s.relB={}; ALL.forEach(i=>{ if(isH(i)) return; s.relB[i]={}; ALL.forEach(j=>{ if(i!==j) s.relB[i][j]=NPCS.rel(s.who[i], isH(j)?(pOf(j)===0?'me':'opp'):s.who[j]); }); });
  return s;
}
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
const live=s=>ALL.filter(i=>!s.out[i]);
const nextLive=(s,i)=>{ for(let k=1;k<=N;k++){ const j=(i+k)%N; if(!s.out[j]) return j; } return i; };
const countIn=(cards,c)=>cards.filter(x=>x===c||x==='W').length;
const totalCards=s=>live(s).reduce((a,i)=>a+s.hand[i].length,0);

function startRound(s){ if(s.round>0) npcWhisper(s);
  if(live(s).length<=3 || s.round>=MAXR) return endGame(s);
  s.round++; const deck=U.shuffle(COL.flatMap(c=>Array(10).fill(c)).concat(Array(10).fill('W')));
  for(const i of ALL) s.hand[i] = s.out[i] ? [] : deck.splice(0, Math.min(5,s.chips[i]));
  if(s.out[s.lead]) s.lead=nextLive(s,s.lead);
  s.claim=null; s.chain=[]; s.duel=null; s.rev=-1; s.pot=0;
  s.log.push(`— ${s.round}라운드 (카드 ${totalCards(s)}장) —`); askDeclare(s,s.lead);
}
function askDeclare(s,i){ s.phase='declare'; s.actor=i; s.notice=`💭 ${nm(i)} 선언을 고민 중…`; if(isH(i)) s.turn=pOf(i); else { s.turn=null; s.think=1400+Math.random()*1400; } }
function askRespond(s,i){ s.phase='respond'; s.actor=i; s.notice=`💭 ${nm(i)}: 인정할까, 의심할까…`; if(isH(i)) s.turn=pOf(i); else { s.turn=null; s.think=1300+Math.random()*1600; } }
function declare(s,i,c,n,bet){
  bet=Math.max(1,Math.min(s.chips[i],bet|0));
  s.claim={by:i,c,n,bet}; s.chain.push(s.claim); s.stats[i].decl++; s.hist.push({r:s.round,by:i,c,n,bet});
  s.notice=`🃏 ${nm(i)}: "${CK[c]} ${n}장 이상!" (칩 ${bet})`; s.log.push(s.notice); s.phase='run'; s.turn=null;
  s.q.push({k:'respond',i:nextLive(s,i)});
  const pr=pClaim(s,i,c,n); if(!isH(i)){ const p=P(s,i); if(pr<.4&&Math.random()<(1-p.bluff)*.5){ s.tell=s.tell||{}; s.tell[i]=s.round; talkT(s,i,U.pick([`${CK[c]} ${n}장… 있을 거예요 😅`,`어, ${CK[c]} ${n}장이요 😅`]),'nervous'); }
    else if(countIn(s.hand[i],c)>=2&&Math.random()<.4) talkT(s,i,U.pick([`${CK[c]}이라면 자신 있어요 😏`,`${CK[c]} ${n}장, 믿어도 돼요.`]),'decl'); }
}
function accept(s,i){ const prev=s.claim; if(!isH(i)&&Math.random()<.3) talkT(s,i,U.pick([`인정. ${CK[prev.c]} ${prev.n}장은 있겠죠.`,`${nm(prev.by)} 말 믿을게요.`,'좋아요, 인정!']),'accept',prev.by); s.log.push(`🙆 ${nm(i)} 인정 → ${nm(prev.by)} 칩을 돌려받아요`); s.notice=`🙆 ${nm(i)}: 인정!`; s.phase='run'; s.turn=null; s.q.push({k:'declare',i}); }
function doubt(s,i){
  const d=s.claim; s.stats[i].doubt++;
  talkT(s,i,(isH(i)?'🤨 의심! ':'')+doubtWhy(s,i,d)+(isH(i)?'':' 의심!'),'doubt',d.by);
  if(truce(s,i,d.by)){ s.pact[pk(i,d.by)].broken=i; if(isH(d.by)) dmPush(s,d.by,i,'💔 휴전이라더니 나를 의심했어요!',{state:'bad'}); else s.q.push({k:'outed',i:d.by,t:i}); }
  s.duel={a:d.by, b:i, bet:[d.bet,0], raises:0, turn:i}; s.pot=0;
  s.notice=`❗ ${nm(i)}: "의심!" — ${nm(d.by)}의 "${CK[d.c]} ${d.n}장"`; s.log.push(s.notice);
  s.phase='run'; s.turn=null; s.q.push({k:'react',kind:'doubted',i:d.by,t:i}); s.q.push({k:'duel'});
}
function askDuel(s){ const d=s.duel, i=d.turn; s.phase='duel'; s.actor=i; s.notice=`💥 베팅 대결 — ${nm(i)} 차례 (선언자 ${d.bet[0]} · 의심 ${d.bet[1]})`; if(isH(i)) s.turn=pOf(i); else { s.turn=null; s.think=1200+Math.random()*1300; } }
function duelAct(s,i,kind,x){
  const d=s.duel, me=i===d.a?0:1, op=1-me, need=d.bet[op]-d.bet[me];
  if(kind==='fold'){ s.log.push(`🏳️ ${nm(i)} 포기`); s.stats[i].folds++; return settle(s, op===0?d.a:d.b, true); }
  if(kind==='call'){ const pay=Math.min(need,s.chips[i]-d.bet[me]); d.bet[me]+=pay; s.log.push(`${nm(i)} 콜 (${d.bet[me]})`); s.notice=`${nm(i)}: 콜!`; s.phase='run'; s.turn=null; s.q.push({k:'reveal'}); return; }
  if(kind==='raise'){ const room=s.chips[i]-d.bet[me]; const amt=Math.max(need+1,Math.min(room,need+Math.max(1,x|0))); d.bet[me]+=amt; d.raises++; s.log.push(`${nm(i)} 레이즈 → ${d.bet[me]}`); s.notice=`🔥 ${nm(i)}: 레이즈! (${d.bet[me]})`;
    d.turn = op===0?d.a:d.b; s.phase='run'; s.turn=null; s.q.push({k:'duel'}); }
}
function reveal(s){ s.phase='reveal'; s.rev=0; s.count=0; s.notice='🎙️ 카드를 한 명씩 공개합니다…'; s.turn=null; }
function settle(s,w,folded){
  const d=s.duel, c=s.claim; const pot=d.bet[0]+d.bet[1]; const l = w===d.a?d.b:d.a;
  const lb = l===d.a?d.bet[0]:d.bet[1]; s.chips[l]-=lb; s.chips[w]+=lb;
  if(!folded){ const real=live(s).reduce((a,i)=>a+countIn(s.hand[i],c.c),0); if(w===d.b){ s.stats[d.b].doubtWin++; s.stats[d.a].bluffCaught++; } s.result={w,l,real,c}; }
  else s.result={w,l,folded:true,c};
  s.notice = folded ? `🏳️ ${nm(l)} 포기 → ${nm(w)}이(가) 칩 ${lb}개를 가져가요` : `${w===d.a?'⭕ 선언이 맞았어요':'❌ 선언이 틀렸어요'} (${CK[c.c]}+🌈 = ${s.result.real}장) → ${nm(w)} 승리, 칩 +${lb}`;
  s.log.push(s.notice); s.lead=l; s.phase='settle'; s.turn=null;
  for(const i of ALL) if(!s.out[i]&&s.chips[i]<=0){ s.out[i]=true; s.q.push({k:'note',text:`💀 ${nm(i)} 칩을 모두 잃고 탈락!`}); }
  if(!isH(w)&&Math.random()<.6) s.q.push({k:'react',kind:'win',i:w,t:l});
}
function endGame(s){ s.phase='over'; s.turn=null; s.rank=ALL.slice().sort((a,b)=>s.chips[b]-s.chips[a]); s.winner=isH(s.rank[0])?pOf(s.rank[0]):'none'; s.winners=isH(s.rank[0])?[pOf(s.rank[0])]:[];
  s.notice=`🎙️ 게임 끝! 1등 ${nm(s.rank[0])} 칩 ${s.chips[s.rank[0]]}`; s.log.push(s.notice); }

/* ── 말·채팅·귓속말 ── */
const pk=(a,b)=>a<b?a+'-'+b:b+'-'+a;
const truce=(s,a,b)=>{ const p=s.pact[pk(a,b)]; return !!(p&&!p.broken); };
const MOOD={decl:'🃏',doubt:'🤨',accept:'🙆',doubted:'😤',win:'😎',lose:'😩',claim:'🗣️',nervous:'😅',truce:'🤝',outed:'😡'};
function talkT(s,i,text,kind,t){ if(!text) return; s.say={seat:i,text,n:(s.say?s.say.n:0)+1,t:t??null,kind}; s.feed.push({r:s.round,seat:i,text,t:t??null,kind}); s.mood[i]={e:MOOD[kind]||'💬',n:(s.moodN=(s.moodN||0)+1)}; }
function dmPush(s,to,from,text,o){ if(!isH(to)) return; (s.dm[to]=s.dm[to]||[]).push(Object.assign({id:++s.dmN,r:s.round,from,text,state:'info'},o||{})); }
/* 의심의 근거: 내 손 · 뻥 전과 · 기대값 */
function doubtWhy(s,i,c){ const mine=countIn(s.hand[i],c.c), T=totalCards(s), unseen=T-s.hand[i].length, e=Math.round(mine+unseen/3);
  if(!isH(i)&&mine===0&&Math.random()<.5) return `제 손엔 ${CK[c.c]}이(가) 하나도 없어요.`;
  if(s.stats[c.by].bluffCaught>=1&&Math.random()<.6) return `${nm(c.by)}은(는) 벌써 ${s.stats[c.by].bluffCaught}번 뻥이 들켰어요.`;
  if(s.hint&&s.hint.r===s.round&&s.hint.by!==c.by&&s.hint.c!==c.c) return `아까 ${nm(s.hint.by)}이(가) ${CK[s.hint.c]}이(가) 많다고 했잖아요. ${CK[c.c]}은(는) 글쎄요.`;
  if(e<c.n) return `전체 ${T}장에서 ${CK[c.c]}+🌈는 ${e}장쯤일 텐데 ${c.n}장이요?`;
  return isH(i)?'':`${c.n}장 넘게 올리기는 무리예요. 차라리`; }
function npcWhisper(s){ for(const h of HSEAT){ if(s.out[h]||Math.random()>.35) continue; const c=U.shuffle(live(s).filter(i=>!isH(i)&&!s.pact[pk(i,h)]))[0]; if(c==null) return; if((s.relB[c]&&s.relB[c][h]||0)+P(s,c).trust*.5+Math.random()*.3<.5) continue;
  dmPush(s,h,c,U.pick(['우리 휴전해요. 서로 의심하지 않기 🤝','둘이 손잡아요. 서로 선언은 인정해 주고, 다른 사람만 털어요 🤫']),{state:'open',kind:'pact'}); } }
/* ── NPC: 확률로 판단, 성향으로 뻥 ── */
function probAtLeast(k,n,p){ if(k<=0) return 1; if(k>n) return 0; let c=1, t=0; const q=1-p; const pw=(a,b)=>Math.pow(a,b);
  for(let i=0;i<=n;i++){ if(i>0) c=c*(n-i+1)/i; if(i>=k) t+=c*pw(p,i)*pw(q,n-i); } return t; }
function pClaim(s,i,c,n){ const mine=countIn(s.hand[i],c), unseen=totalCards(s)-s.hand[i].length; return probAtLeast(n-mine, unseen, 1/3); }
function npcDeclare(s,i){ const p=P(s,i), prev=s.claim, minN=prev?prev.n+1:1;
  if(prev&&truce(s,i,prev.by)) {}
  let best=null; for(const c of COL){ for(let n=minN;n<=Math.min(20,totalCards(s));n++){ const pr=pClaim(s,i,c,n); const v=pr*(1+n*.05) + (Math.random()-.5)*(1-p.logic)*.3; if(pr>=.45-p.bluff*.25&&(!best||v>best.v)) best={v,c,n,pr}; } }
  if(!best){ const c=COL.slice().sort((a,b)=>countIn(s.hand[i],b)-countIn(s.hand[i],a))[0]; best={c,n:minN,pr:pClaim(s,i,c,minN)}; }
  const bet=Math.max(1,Math.min(s.chips[i]-(s.chips[i]>1?1:0), Math.round((best.pr*2+p.aggr)*(1+Math.random())))); return {c:best.c,n:best.n,bet}; }
function npcRespond(s,i){ const p=P(s,i), c=s.claim; let pr=pClaim(s,i,c.c,c.n);
  if(s.hint&&s.hint.r===s.round&&s.hint.by===c.by&&s.hint.c===c.c&&(s.relB[i]&&s.relB[i][c.by]||0)>-.2) pr=Math.min(1,pr+.15*p.trust);
  if(truce(s,i,c.by)&&pr>.15&&!(s.who[i]==='jihu'&&Math.random()<.4)&&COL.some(cc=>pClaim(s,i,cc,c.n+1)>.2)) return 'accept';
  // 다음 선언을 할 수 있어야 인정 가능 — 내가 n+1을 낼 자신이 있는지도 봄
  const canRaise = COL.some(cc=>pClaim(s,i,cc,c.n+1)>.35);
  const liar=s.stats[c.by].bluffCaught*.06;   // 뻥 전과가 있으면 더 의심
  if(pr < .42+(p.aggr-.5)*.2+liar || !canRaise) return 'doubt';
  return 'accept'; }
function npcDuel(s,i){ const p=P(s,i), d=s.duel, c=s.claim, me=i===d.a?0:1, need=d.bet[1-me]-d.bet[me];
  const pr = me===0 ? pClaim(s,i,c.c,c.n) : 1-pClaim(s,i,c.c,c.n);   // 내가 이길 확률
  const room=s.chips[i]-d.bet[me];
  if(room>need && d.raises<RCAP && pr>.72-p.aggr*.15) return {k:'raise',x:pr>.85?2:1};
  if(pr<.33-p.bluff*.12 && need>0) return {k:"fold"};
  if(need===0 && pr<.35 && Math.random()<p.bluff*.5 && room>0 && d.raises<RCAP) return {k:'raise',x:1};   // 뻥 레이즈
  return {k:'call'}; }

/* ── 말 ── */
const LINES={
  sly:{doubted:['어머 {t}, 저를 의심해요? 후회할걸요~ 😏'], win:['후후, 잘 먹을게요 {t}~'], lose:['쳇~']},
  calm:{doubted:['…좋아요, {t}.'], win:['가져갈게요.'], lose:['…']},
  logic:{doubted:['{t}, 확률로는 제 선언이 맞아요.','계산은 끝났어요. 받아요, {t}.'], win:['확률대로네요.'], lose:['변수가 컸어요.']},
  emo:{doubted:['헉 {t}!! 진짜예요 믿어줘요 😭'], win:['이겼다!! 🥳'], lose:['으앙 😭']},
};
function lineOf(s,seat,kind,t){ const p=P(s,seat), st=STYLE[p.id]||'calm', L=(LINES[st]||{})[kind]; if(!L) return null;
  const used=(s.used[seat]=s.used[seat]||[]), pool=L.filter(x=>!used.includes(x)); if(!pool.length) return null; const raw=U.pick(pool); used.push(raw); return raw.split('{t}').join(t!=null?nm(t):''); }

/* ── 시간 흐름 ── */
function stepDelay(s){ syncH(s);
  if(s.winner!=null) return null;
  if(s.phase==='intro') return 1800;
  if(s.q.length) return s.q[0].k==='note'?1600 : s.q[0].k==='react'||s.q[0].k==='outed'?2200 : 1100;
  if(['declare','respond','duel'].includes(s.phase)) return isH(s.actor)?null:s.think;
  if(s.phase==='reveal') return 1100;
  if(s.phase==='settle') return 2600;
  return null;
}
function step(s){ syncH(s);
  if(s.phase==='intro'){ startRound(s); return; }
  if(s.q.length){ const e=s.q.shift();
    if(e.k==='respond') askRespond(s,e.i); else if(e.k==='declare') askDeclare(s,e.i); else if(e.k==='duel') askDuel(s); else if(e.k==='reveal') reveal(s);
    else if(e.k==='note'){ s.notice=e.text; s.log.push(e.text); }
    else if(e.k==='react'){ if(!isH(e.i)){ const t=lineOf(s,e.i,e.kind,e.t); if(t){ talkT(s,e.i,t,e.kind,e.t); s.log.push(`${nm(e.i)}: ${t}`); } } }
    else if(e.k==='outed'){ talkT(s,e.i,U.pick([`${nm(e.t)}, 휴전하자더니 저를 의심해요?! 😡`,`다들 들어요. ${nm(e.t)}이(가) 저랑 몰래 휴전해 놓고 깼어요!`]),'outed',e.t); }
    s.ev++; return; }
  if(s.phase==='declare'&&!isH(s.actor)){ const d=npcDeclare(s,s.actor); declare(s,s.actor,d.c,d.n,d.bet); s.ev++; return; }
  if(s.phase==='respond'&&!isH(s.actor)){ if(npcRespond(s,s.actor)==='doubt') doubt(s,s.actor); else accept(s,s.actor); s.ev++; return; }
  if(s.phase==='duel'&&!isH(s.actor)){ const a=npcDuel(s,s.actor); duelAct(s,s.actor,a.k,a.x); s.ev++; return; }
  if(s.phase==='reveal'){ const L=live(s); if(s.rev<L.length){ const i=L[s.rev++]; const k=countIn(s.hand[i],s.claim.c); s.count+=k; s.notice=`🃏 ${nm(i)} 공개: ${CK[s.claim.c]}·🌈 ${k}장 → 지금까지 ${s.count}장 / 선언 ${s.claim.n}장`; s.ev++; return; }
    settle(s, s.count>=s.claim.n ? s.duel.a : s.duel.b, false); s.ev++; return; }
  if(s.phase==='settle'){ startRound(s); return; }
}
function apply(s,p,a){ syncH(s);
  if(s.winner!=null) return '게임이 끝났어요';
  const seat=HSEAT[p]; if(!a) return '알 수 없는 동작';
  if(a.k==='declare'){ if(s.phase!=='declare'||s.actor!==seat) return '내 선언 차례가 아니에요';
    if(!COL.includes(a.c)) return '색을 고르세요'; const n=a.n|0, minN=s.claim?s.claim.n+1:1; if(n<minN||n>20) return `${minN}장 이상으로 선언해야 해요`;
    const bet=a.bet|0; if(bet<1||bet>s.chips[seat]) return '칩을 1개 이상 걸어야 해요'; declare(s,seat,a.c,n,bet); return null; }
  if(a.k==='claimHand'){ if(s.out[seat]) return '탈락했어요'; if(s.told[seat]===s.round) return '이번 라운드엔 이미 말했어요'; if(!COL.includes(a.c)) return '색을 고르세요'; s.told[seat]=s.round; s.hint={by:seat,c:a.c,r:s.round}; talkT(s,seat,`🗣️ 제 손엔 ${CK[a.c]}이(가) 많아요.`,'claim'); return null; }
  if(a.k==='dm'){ if(s.wh[seat]===s.round) return '귓속말은 라운드당 한 번이에요'; const t=a.t; if(typeof t!=='number'||isH(t)||s.out[t]) return '귓속말할 사람을 고르세요'; s.wh[seat]=s.round;
    dmPush(s,seat,seat,`(→ ${nm(t)}) 우리 휴전해요. 서로 의심하지 않기 🤝`,{mine:1}); if((s.relB[t][seat]||0)+P(s,t).trust*.5+Math.random()*.4>.5){ s.pact[pk(seat,t)]={r:s.round}; dmPush(s,seat,t,U.pick(['좋아요, 휴전 🤝','콜! 서로 인정해 주기예요.'])); } else dmPush(s,seat,t,'음… 저는 혼자 할게요.'); return null; }
  if(a.k==='dmReply'){ const m=(s.dm[seat]||[]).find(x=>x.id===a.id&&x.state==='open'); if(!m) return '이미 답했어요'; m.state=a.yes?'yes':'no'; if(a.yes){ s.pact[pk(seat,m.from)]={r:s.round}; dmPush(s,seat,m.from,'좋아요, 휴전이에요 🤝'); } else dmPush(s,seat,m.from,'…알겠어요.'); return null; }
  if(a.k==='accept'||a.k==='doubt'){ if(s.phase!=='respond'||s.actor!==seat) return '응답할 차례가 아니에요'; if(a.k==='accept'&&s.claim.n>=20) return '더 올릴 수 없어서 의심해야 해요'; a.k==='accept'?accept(s,seat):doubt(s,seat); return null; }
  if(a.k==='call'||a.k==='raise'||a.k==='fold'){ if(s.phase!=='duel'||s.actor!==seat) return '베팅 차례가 아니에요'; const d=s.duel, me=seat===d.a?0:1, need=d.bet[1-me]-d.bet[me];
    if(a.k==='raise'&&(d.raises>=RCAP||s.chips[seat]-d.bet[me]<=need)) return '더 올릴 수 없어요'; if(a.k==='fold'&&need===0) return '포기할 필요 없어요 — 콜하세요'; duelAct(s,seat,a.k,a.x); return null; }
  return '알 수 없는 동작';
}
function mask(s,p){ syncH(s); const v=U.clone(s), me=HSEAT[p];
  const open = (s.phase==='reveal') ? live(s).slice(0,s.rev) : (s.phase==='settle'&&s.result&&!s.result.folded) || s.phase==='over' ? ALL : [];
  v.hand=s.hand.map((h,i)=> i===me||open.includes(i) ? h : h.map(()=>null)); v.q=s.q.map(()=>null); v.used={}; v.think=null; v.dm={[me]:s.dm[me]||[]}; v.pact={}; for(const k in s.pact) if(k.split('-').map(Number).includes(me)) v.pact[k]=s.pact[k]; v.relB=null; return v; }
function ai(v){ syncH(v); const seat=HSEAT[1]; if(v.actor!==seat) return null;
  const mine=c=>countIn(v.hand[seat],c), unseen=live(v).reduce((a,i)=>a+v.hand[i].length,0)-v.hand[seat].length;
  if(v.phase==='declare'){ const c=COL.slice().sort((a,b)=>mine(b)-mine(a))[0]; const minN=v.claim?v.claim.n+1:1; return {k:'declare',c,n:Math.max(minN,Math.round(mine(c)+unseen/3)),bet:1}; }
  if(v.phase==='respond'){ const c=v.claim; return (mine(c.c)+unseen/3 < c.n-.5 || c.n>=20) ? {k:'doubt'} : {k:'accept'}; }
  if(v.phase==='duel') return {k:'call'};
  return null; }

/* ── 화면 ── */
let WHO={}, dC='R', dN=1, dBet=1, sig='';
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}/g,(_,d)=>`${seatEmoji(+d)} ${seatName(+d,ctx)}`); }
const card=c=>`<span class="db-c" style="background:${c?CH[c]:'#3b3f55'}">${c?(c==='W'?'🌈':''):'?'}</span>`;
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{};
  const me=HSEAT[ctx.me], my=v.actor===me&&v.turn===ctx.me;
  const sg=v.phase+':'+v.round+':'+v.chain.length; if(sg!==sig){ sig=sg; const minN=v.claim?v.claim.n+1:1; dN=Math.max(dN,minN); if(v.claim) dN=minN; dBet=Math.min(Math.max(1,dBet),v.chips[me]||1); }
  let h=`<div class="info">${v.round} / ${MAXR}라운드 · 🪙 내 칩 <b>${v.chips[me]}</b> · 전체 카드 ${totalCards(v)}장${v.claim?` · 지금 선언 <b style="color:${CH[v.claim.c]}">${CK[v.claim.c]} ${v.claim.n}장</b>`:''}</div>`;
  h+=`<div class="hl-notice">${fill(v.notice||'',ctx)}</div>`;
  { const feed=(v.feed||[]).slice(-2); h+=`<div class="vr-feed">${feed.map((x,k)=>`<div class="${k===feed.length-1?'new':''}"><span class="w">${seatEmoji(x.seat)} ${seatName(x.seat,ctx)}</span> ${fill(U.esc(x.text),ctx)}</div>`).join('')||'<div class="empty">아직 조용해요</div>'}</div>`; }
  h+=`<div class="db-rows">${ALL.map(i=>`<div class="db-row ${i===me?'me':''} ${v.actor===i&&v.phase!=='over'?'act':''} ${v.out[i]?'out':''}"><div class="td-who">${seatEmoji(i)} ${seatName(i,ctx)} ${isH(i)?'':`<small>${NPCI(i)[2]}</small>`}<small>🪙 ${v.chips[i]}${v.out[i]?' · 💀 탈락':''}${v.duel&&(v.duel.a===i||v.duel.b===i)?` · 💥 걸린 칩 ${v.duel.a===i?v.duel.bet[0]:v.duel.bet[1]}`:''}</small></div><div class="db-hand">${v.hand[i].map(card).join('')}</div></div>`).join('')}</div>`;
  if(my&&v.phase==='declare'){ const minN=v.claim?v.claim.n+1:1;
    h+=`<div class="vr-card"><b>🃏 선언하기</b><p>모두의 카드를 합쳐 이 색(🌈 포함)이 몇 장 이상일까요? 내 패: ${COL.map(c=>`${CK[c]} ${countIn(v.hand[me],c)}`).join(' · ')}</p>
      <div class="fh-act">${COL.map(c=>`<button class="${dC===c?'':'ghost'}" style="${dC===c?`background:${CH[c]}`:''}" data-dc="${c}">${CK[c]}</button>`).join('')}</div>
      <div class="fh-act"><button class="ghost small" data-dn="-1">−</button><b>${dN}장 이상</b><button class="ghost small" data-dn="1">+</button> · 칩 <button class="ghost small" data-db="-1">−</button><b>${dBet}</b><button class="ghost small" data-db="1">+</button><button data-a="declare" ${dN>=minN?'':'disabled'}>선언!</button></div></div>`; }
  if(my&&v.phase==='respond') h+=`<div class="vr-card"><b>${fill(nm(v.claim.by),ctx)}: "${CK[v.claim.c]} ${v.claim.n}장 이상" (칩 ${v.claim.bet})</b><p>내 패에서 ${CK[v.claim.c]}+🌈 = ${countIn(v.hand[me],v.claim.c)}장 · 남이 가진 카드 ${totalCards(v)-v.hand[me].length}장</p><div class="fh-act"><button data-a="accept" ${v.claim.n>=20?'disabled':''}>🙆 인정 (더 큰 수로 선언)</button><button data-a="doubt" style="background:#b8412f">❗ 의심!</button></div></div>`;
  if(my&&v.phase==='duel'){ const d=v.duel, meI=me===d.a?0:1, need=d.bet[1-meI]-d.bet[meI];
    h+=`<div class="vr-card"><b>💥 베팅 대결</b><p>${me===d.a?'내 선언을 지켜요':'상대 선언이 틀렸다고 봐요'} · 내 칩 ${d.bet[meI]} / 상대 ${d.bet[1-meI]}</p><div class="fh-act">${need>0?'<button class="ghost" data-a="fold">🏳️ 포기</button>':''}<button data-a="call">${need?`콜 (+${need})`:'콜 (공개!)'}</button>${d.raises<RCAP&&v.chips[me]-d.bet[meI]>need?'<button data-a="raise" data-x="1">레이즈 +1</button><button data-a="raise" data-x="2">레이즈 +2</button>':''}</div></div>`; }
  if(v.phase==='over'&&v.rank) h+=`<div class="sn-score">${v.rank.map((i,k)=>`<div class="${isH(i)?'h':''}"><b>${k+1}등 ${seatEmoji(i)} ${seatName(i,ctx)} 칩 ${v.chips[i]}</b>${v.out[i]?' <small>💀 탈락</small>':''}</div>`).join('')}</div>`;
  const L=U.politics(v.feed.map(x=>x.kind==='doubt'||x.kind==='outed'?Object.assign({},x,{kind:'accuse'}):x.kind==='accept'?Object.assign({},x,{kind:'trust'}):x),{seats:ALL,emo:seatEmoji,name:i=>seatName(i,ctx),me,alive:i=>!v.out[i],pacts:Object.entries(v.pact||{}).map(([k,p])=>{ const [a,b]=k.split('-').map(Number); return [a,b,!!p.broken]; })})+`<div class="side-box"><div class="side-h">🧠 플레이어 기록 <small>선언·의심·뻥 들킴</small></div>${ALL.map(i=>{ const st=v.stats[i]; return `<div class="side-row ${i===me?'me':''}" style="flex-wrap:wrap">${seatEmoji(i)} ${seatName(i,ctx)} ${isH(i)?'':`<small>${NPCI(i)[2]}</small>`}<span>🪙 ${v.chips[i]}</span><div class="hl-st">선언 ${st.decl} · 의심 ${st.doubt}(성공 ${st.doubtWin}) · <b class="${st.bluffCaught?'no':''}">뻥 들킴 ${st.bluffCaught}</b> · 포기 ${st.folds}</div></div>`; }).join('')}
    <div class="side-h" style="margin-top:6px">🗒️ 이번 라운드 선언</div>${v.chain.map(c=>`<div class="rr-h">${fill(nm(c.by),ctx)} <b style="color:${CH[c.c]}">${CK[c.c]} ${c.n}장</b> (칩 ${c.bet})</div>`).join('')||'<small style="color:#888">-</small>'}</div>`;
  if(!v.out[me]&&v.phase!=='over'){ const D=(v.dm[me]||[]).slice(-4), canW=v.wh[me]!==v.round, canC=v.told[me]!==v.round;
    let hh=`<div class="kg-dm fs-dm"><div class="kg-fh">🤫 귓속말 · 🗣️ 한마디 <small>라운드당 한 번씩</small></div>${D.map(m=>`<div class="${m.state==='open'?'open':''} ${m.state==='bad'?'bad':''}">${m.mine?'<small>나</small> ':`<b>${seatEmoji(m.from)} ${seatName(m.from,ctx)}</b> `}${fill(U.esc(m.text),ctx)}${m.state==='open'?` <button class="small" data-dr="${m.id}:1">🤝 좋아요</button><button class="ghost small" data-dr="${m.id}:0">🙅 싫어요</button>`:''}</div>`).join('')}`;
    if(canW) hh+=`<div class="fh-act"><small>🤝 몰래 휴전(서로 의심 안 하기):</small>${live(v).filter(j=>!isH(j)&&!(v.pact||{})[pk(me,j)]).map(j=>`<button class="ghost small" data-w="${j}">${seatEmoji(j)} ${seatName(j,ctx)}</button>`).join('')}</div>`;
    if(canC) hh+=`<div class="fh-act"><small>🗣️ "제 손엔 ○○이 많아요" (뻥 가능):</small>${COL.map(c=>`<button class="ghost small" data-hc="${c}" style="color:${CH[c]}">${CK[c]}</button>`).join('')}</div>`;
    h+=hh+'</div>'; }
  const R=U.chat(v.feed,{emo:seatEmoji,name:i=>seatName(i,ctx),fill:t=>fill(t,ctx),me,neg:['doubt','outed','doubted'],pos:['accept','truce']})+`<div class="side-box side-log"><div class="side-h">📜 진행 기록 <small>최근이 위</small></div>${v.log.slice(-60).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=`<div class="side3 has-chat"><div class="side-mid">${h}</div><aside class="side-l">${L}</aside><aside class="side-r">${R}</aside></div>`;
  el.onclick=e=>{ const dr=e.target.closest('[data-dr]'); if(dr){ const [id,y]=dr.dataset.dr.split(':'); return ctx.act({k:'dmReply',id:+id,yes:y==='1'}); }
    const w=e.target.closest('[data-w]'); if(w) return ctx.act({k:'dm',t:+w.dataset.w});
    const hc=e.target.closest('[data-hc]'); if(hc) return ctx.act({k:'claimHand',c:hc.dataset.hc});
    const c=e.target.closest('[data-dc]'); if(c){ dC=c.dataset.dc; return ctx.rerender(); }
    const n=e.target.closest('[data-dn]'); if(n){ const minN=v.claim?v.claim.n+1:1; dN=Math.max(minN,Math.min(20,dN+(+n.dataset.dn))); return ctx.rerender(); }
    const b=e.target.closest('[data-db]'); if(b){ dBet=Math.max(1,Math.min(v.chips[me],dBet+(+b.dataset.db))); return ctx.rerender(); }
    const a=e.target.closest('[data-a]'); if(!a||a.disabled) return; const k=a.dataset.a;
    if(k==='declare') return ctx.act({k:'declare',c:dC,n:dN,bet:dBet});
    if(k==='raise') return ctx.act({k:'raise',x:+a.dataset.x}); return ctx.act({k});
  };
}
function status(v,ctx){ syncH(v); const me=HSEAT[ctx.me]; if(v.phase==='over') return ''; if(v.actor===me&&v.turn===ctx.me) return v.phase==='declare'?'선언하세요':v.phase==='respond'?'인정할까요, 의심할까요?':'베팅하세요'; return '진행 중…'; }
const guide=`
<p><b>5인 카드 블러핑</b>(우리 둘 + 성격 다른 컴퓨터 플레이어 3명). 카드 60장 = 빨·노·초·파·보 10장씩 + 🌈 레인보우 10장(어느 색이든 대신해요).</p>
<ul><li>각자 <b>칩 = 받는 카드 수</b>(처음 5, 최대 5). 내 카드만 보여요.</li>
<li><b>선언</b>: "모두 합쳐 ○색이 N장 이상!" + 칩 걸기. <b>다음 사람</b>은 🙆 인정(앞사람은 칩을 돌려받고, 내가 더 큰 수로 새 선언 — 색은 자유) 또는 ❗ 의심.</li>
<li><b>의심하면 둘만의 베팅 대결</b>: 콜·레이즈·포기. 포기하면 카드 공개 없이 짐. 콜이면 <b>한 명씩 카드를 공개</b>해 선언 색 + 🌈를 세요 — 선언 이상이면 선언자 승, 아니면 의심한 사람 승. 이긴 쪽이 진 쪽이 건 칩을 가져가요.</li>
<li>칩이 0이면 탈락. 3명이 남거나 ${MAXR}라운드가 끝나면 칩 순으로 순위.</li></ul>
<div class="tipbox">💡 <b>팁</b><br>· 평균적으로 남의 카드 3장 중 1장꼴이 그 색(또는 🌈)이에요.<br>· 왼쪽 🧠 기록에서 "뻥 들킴"이 많은 사람의 선언은 의심해 보세요!</div>`;
window.GAMES.doubtbet = { _sync:x=>syncH(x), maxH:5,
  title:'의심 베팅', ref:'데블스 플랜 「의심 베팅」', emoji:'🃏', tags:['블러핑','베팅','NPC','두뇌서바이벌'],
  tagline:'우리 둘 + 컴퓨터 3명. "파랑 7장 이상!" — 인정할까, 의심하고 칩을 걸까?',
  guide, init, apply, mask, ai, render, status, step, stepDelay, noPersona:true, wide:true,
  aiDelay:()=>1400+Math.random()*1500,
  reset(){ sig=''; dN=1; dBet=1; },
  bar:(v,i)=>`<span class="tag">🪙 ${v.chips[HSEAT[i]]}</span>`,
  result:(v,ctx)=>{ const k=(v.rank||[]).indexOf(HSEAT[ctx.me]); return k>=0?`${k+1}등 · 칩 ${v.chips[HSEAT[ctx.me]]}`:''; },
};
})();
