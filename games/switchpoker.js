(function(){
'use strict';
/* 스위치 포커 (피의 게임 시즌 3 · 1일차 데스매치) — 2:2 팀전. 주 플레이어(우리 둘)마다 컴퓨터 조력자 한 명.
   1~15 카드 한 벌. 라운드마다 각자 2장 + 가운데 오픈 카드 1장. 칩 20개씩, 기본 베팅 1개.
   행동(한 사람씩 하나): 🔄 오픈 카드 바꾸기 · 🔁 팀원과 한 장 교환 · 🗑️ 한 장 뽑고 한 장 공개 버리기 · ⏭️ 패스.
   베팅: 콜·레이즈·폴드. 승부: 합이 가장 낮은 한 명이 오픈 카드를 가져가 더하고(최저가 여럿이면 없음), 합이 가장 높은 사람이 판돈 전부.
   최고가 동률이면 판돈 이월(다음 라운드는 기본 베팅 없음). 7라운드 뒤 주 플레이어 칩이 많은 팀 승리. 누구든 칩 0이면 그 팀 즉시 패배.
   팀원끼리는 테이블 아래 🦶 사인을 주고받음(상대 팀에는 안 보임). 자기 카드를 대놓고 보여 주는 것은 금지. */
/* 👥 N명 (2026-11-12) — 사람 2~4명: 주 플레이어 둘(0·2) 다음 조력자(1·3) 자리에 사람이 들어감, 빈자리는 컴퓨터 조력자 */
const N=4; let HSEAT=[0,2]; const SEATORD=[0,2,1,3]; const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; }; const ROUNDS=7, CH=20, MAXR=5, MAXRAISES=4;
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i), ALL=[0,1,2,3], MATE=i=>i^1, TEAM=i=>i>>1, MAIN=i=>i%2===0;
const nm=i=>`{s${i}}`, SUM=h=>h.reduce((a,b)=>a+b,0);
const STYLE={seojin:'logic', doyun:'warm', haram:'calm', yuna:'emo', minho:'sly', taekyung:'hot', jihu:'sly', soyul:'warm'};
const DEF_P={talk:.5,aggr:.5,trust:.5,bluff:.4,logic:.6,temper:.4};
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
const LINES={
  logic:{raise:['{n}개 올릴게요. 확률상 제가 유리해요.','레이즈 {n}. 계산은 끝났어요.','{r}라운드니까 이쯤에서 {n}개 더.'], call:['콜. {n}개 맞춰요.','받을게요, {n}개.','{n}개면 기대값이 남아요. 콜.'], check:['체크.','일단 지켜볼게요.'], fold:['이번 판은 접어요. 기대값이 안 나와요.','폴드. {r}라운드는 넘길게요.','숫자가 안 맞네요. 접어요.'], win:['예상대로네요. {n}개 가져갈게요.','계산대로예요. 판돈 {n}개.'], react:['{t}, 그 레이즈는 근거가 있나요?','흥미롭네요, {t}.','{t}의 패턴이 바뀌었어요.']},
  warm:{raise:['미안해요~ {n}개만 올릴게요 🙏','저 이번엔 좀 자신 있어요, +{n}','{r}라운드는 제가 가 볼게요, +{n} 😊'], call:['콜이요! {n}개 🤝','따라갈게요~ {n}개','{n}개… 네, 콜할게요'], check:['저는 그냥 넘길게요~','체크할게요 😊'], fold:['아 저는 빠질게요 😢','이번엔 접을게요…','{r}라운드는 양보할게요 🥲'], win:['헤헤 {n}개 감사합니다 🙏','와 제가 이겼어요? {n}개! 😊'], react:['와 {t} 대단해요!','헉 {t} 세다 😮','다들 무서워요 😅']},
  calm:{raise:['…{n}.','+{n}.','…올려요. {n}.'], call:['…콜.','{n}개.','…받아요.'], check:['…','체크.'], fold:['…접어요.','…패스.'], win:['…{n}개.','…감사.'], react:['…흠.','…{t}.','…']},
  emo:{raise:['갑니다!! +{n} 😆','아 몰라 +{n}!','느낌 왔어요 +{n} 🤩'], call:['콜콜! 😬','무서운데… {n}개 콜 😰','에라 모르겠다 콜!'], check:['넘길래요 😅','체크… 😬'], fold:['으아 접을래요 😭','못 하겠어요 ㅠㅠ','{r}라운드는 포기 😣'], win:['대박!! {n}개!! 😆','꺄 이겼다 {n}개 🥳'], react:['헐 미쳤다 😱','ㅋㅋㅋ {t} 대박','심장 떨려요 😵']},
  sly:{raise:['+{n}. 따라올 수 있어요? 😏','슬슬 올려 볼까요, {n}개 😏','{r}라운드는 제가 접수할게요 +{n}'], call:['콜~ 궁금해서요 😏','{n}개 정도야 뭐.','보여 줘 봐요, 콜 😏'], check:['체크~ 😏','천천히 가죠~'], fold:['이번엔 양보해 드릴게요 😏','접어 드리죠. 다음엔 안 봐줘요'], win:['제가 말했잖아요 😏 {n}개 잘 받을게요','{n}개 감사~ 😏'], react:['{t}, 뻥 아니에요? 😏','ㅋㅋ {t} 재밌네','다 보여요 😏']},
  hot:{raise:['+{n}! 덤벼요 🔥','올립니다! +{n}','{r}라운드 제가 먹어요! +{n} 🔥'], call:['콜! 무조건 콜!','{n}개? 받아요!','콜이요 콜! 😤'], check:['체크! 빨리빨리!','넘겨요!'], fold:['아 진짜… 접어요 😤','이번만 봐줘요 😤'], win:['봤죠?! {n}개! 🔥','이게 실력이에요! {n}개!'], react:['뭐야 {t}! 😤','오 {t} 세게 나오네 🔥','붙어 보자고요!']},
};
function lineOf(s,i,kind,vars){ const st=STYLE[P(s,i).id]||'calm', L=(LINES[st]||LINES.calm)[kind]||LINES.calm[kind]; if(!L) return '';
  const used=(s.used[i]=s.used[i]||[]); const pool=L.filter(x=>!used.includes(x)); const raw=pool.length?U.pick(pool):U.pick(L); used.push(raw);
  return raw.replace(/\{n\}/g,vars&&vars.n!=null?vars.n:'').replace(/\{r\}/g,s.round).replace(/\{t\}/g,vars&&vars.t!=null?nm(vars.t):''); }

function init(starter,o){ const kh=Math.max(2,Math.min(4,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,kh);
  const s={phase:'intro', who:{}, chips:Array(N).fill(CH), round:0, st:(starter|0)===1?1:0, starter, hand:[[],[],[],[]], open:null, deck:[], pile:[],
    bet:[0,0,0,0], fold:[false,false,false,false], carry:0, order:[], ai:0, actor:null, need:[], cur:0, raises:0, sign:[null,null,null,null],
    did:[null,null,null,null], tell:[null,null,null,null], know:[[],[],[],[]], swap:null, shown:[], low:null, sums:null, hist:[], bluffs:[], swaps:[],
    q:[], say:null, used:{}, log:[], turn:null, winner:null, ev:0, think:0, dlist:[], dj:0, why:'',
    notice:'🎙️ 데스매치 「스위치 포커」 — 탈락 후보와 조력자, 2:2로 겨룹니다'};
  s.hs=HSEAT.slice(); const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=ids[k]);
  return s;
}
/* ── 진행 ── */
function newRound(s){
  s.round++; const d=U.shuffle([...Array(15)].map((_,k)=>k+1));
  for(const i of ALL) s.hand[i]=[d.pop(),d.pop()].sort((a,b)=>a-b);
  s.open=d.pop(); s.deck=d; s.pile=[]; s.fold=[false,false,false,false]; s.did=[null,null,null,null]; s.tell=[null,null,null,null]; s.know=[[],[],[],[]];
  s.sign=[null,null,null,null]; s.rc=0; s.shown=[]; s.low=null; s.sums=null; s.swap=null; s.raises=0;
  const ante=s.carry>0?0:1; s.bet=ALL.map(i=>{ const b=Math.min(ante,s.chips[i]); s.chips[i]-=b; return b; }); s.cur=Math.max(...s.bet);
  const a=s.st, b=1-s.st; s.order=[a*2,b*2,a*2+1,b*2+1];
  for(const i of ALL) if(!isH(i)) npcSign(s,i);
  s.phase='act'; s.ai=-1;
  s.q.push({k:'note',text:`🎙️ ${s.round}라운드 — 오픈 카드 ${s.open}${ante?' · 기본 베팅 1개씩':` · 이월된 판돈 ${s.carry}개 (기본 베팅 없음)`}`});
  s.q.push({k:'note',text:'🦶 테이블 아래에서 팀끼리 사인이 오갑니다…'});
  s.q.push({k:'nextAct'});
}
function npcSign(s,i){ const h=s.hand[i]; s.sign[i]={top:Math.max(...h), sum:SUM(h)}; }
function setActor(s,seat,phase){ s.phase=phase; s.actor=seat; s.turn = isH(seat)?pOf(seat):null; s.think = isH(seat)?0:thinkFor(s,seat,phase); }
function thinkFor(s,i,phase,w){ const p=P(s,i); if(w==null) w=phase==='bet'?.5:.4;
  return Math.round(800 + w*2400*(.6+p.logic*.6)*(1.25-p.temper*.5) + Math.random()*600); }
function nextAct(s){ s.ai++; if(s.ai>=N){ startBet(s); return; } const i=s.order[s.ai]; setActor(s,i,'act'); s.notice = isH(i) ? `🎴 ${nm(i)} 차례 — 행동 하나를 고르세요` : `🎴 ${nm(i)} 차례 — 카드를 손볼지 고민 중…`; }
function startBet(s){ s.phase='bet'; s.need=s.order.filter(i=>!s.fold[i]); s.q.push({k:'note',text:'🎙️ 베팅을 시작합니다 — 콜 · 레이즈 · 폴드'}); s.q.push({k:'nextBet'}); s.actor=null; s.turn=null; }
const live=s=>ALL.filter(i=>!s.fold[i]);
const pot=s=>s.carry+SUM(s.bet);
const toCall=(s,i)=>s.cur-s.bet[i];
function maxRaise(s){ if(s.raises>=MAXRAISES) return 0; const m=Math.min(...live(s).map(j=>s.chips[j]+s.bet[j]))-s.cur; return Math.max(0,Math.min(MAXR,m)); }
function nextBet(s){
  s.need=s.need.filter(i=>!s.fold[i]);
  if(live(s).length<=1||!s.need.length){ showdown(s); return; }
  const i=s.need[0]; setActor(s,i,'bet'); const c=toCall(s,i); s.notice=`💰 ${nm(i)} 차례 — ${c>0?`콜하려면 ${c}개`:'체크 가능'} · 판돈 ${pot(s)}`;
}
function showdown(s){
  s.phase='show'; s.actor=null; s.turn=null; const L=live(s);
  if(L.length===1){ s.q.push({k:'win', w:L[0], single:true}); return; }
  s.q.push({k:'note',text:'🎙️ 승부! 남은 사람의 패를 한 명씩 공개합니다'});
  for(const i of s.order) if(!s.fold[i]) s.q.push({k:'reveal',i});
  s.q.push({k:'low'}); s.q.push({k:'judge'});
}
function judge(sums,L,open){
  let lo=Infinity, lows=[]; for(const j of L){ if(sums[j]<lo){ lo=sums[j]; lows=[j]; } else if(sums[j]===lo) lows.push(j); }
  const tot=sums.slice(); const low=lows.length===1?lows[0]:-1; if(low>=0) tot[low]+=open;
  let hi=-1, his=[]; for(const j of L){ if(tot[j]>hi){ hi=tot[j]; his=[j]; } else if(tot[j]===hi) his.push(j); }
  return {low, tot, win: his.length===1?his[0]:-1};
}
function afterRound(s){
  const zero=ALL.filter(i=>s.chips[i]<=0);
  if(zero.length){ const tz=[...new Set(zero.map(TEAM))]; if(tz.length===1){ endGame(s, 1-tz[0], `${zero.map(nm).join(' · ')}의 칩이 바닥나 즉시 패배`); return; }
    endGame(s, null, '두 팀 모두 칩이 바닥났어요'); return; }
  if(s.round>=ROUNDS){ const a=s.chips[0], b=s.chips[2];
    if(a!==b){ endGame(s, a>b?0:1, `주 플레이어 칩 ${a} : ${b}`); return; }
    const ta=s.chips[0]+s.chips[1], tb=s.chips[2]+s.chips[3]; endGame(s, ta>tb?0:tb>ta?1:null, `주 플레이어 칩 동률 ${a} : ${b} → 팀 합계 ${ta} : ${tb}`); return; }
  s.st=1-s.st; newRound(s);
}
function endGame(s,team,why){ s.phase='debrief'; s.turn=null; s.actor=null; s.wteam=team; s.why=why;
  s.notice = team==null ? `🏁 무승부 — ${why}` : `🏁 ${nm(team*2)} 팀 승리! — ${why}`; s.log.push(s.notice);
  s.dlist=[1,3]; s.dj=0; }

/* ── 동작 (사람·컴퓨터 공용) ── */
function rmCard(h,c){ const k=h.indexOf(c); if(k<0) return false; h.splice(k,1); return true; }
function act(s,i,a){ const e=act0(s,i,a); if(!e&&s.q.length) s.turn=null; return e; }
function act0(s,i,a){
  if(s.phase==='act'){ if(s.actor!==i) return '내 차례가 아니에요';
    if(a.k==='open'){ if(!s.deck.length) return '더미가 비었어요'; const old=s.open; s.pile.push(old); s.open=s.deck.pop(); s.did[i]=`🔄 오픈 ${old}→${s.open}`;
      say(s,i,null,`🔄 ${nm(i)}: 오픈 카드 ${old}을(를) 버리고 새로 뒤집음 → ${s.open}`); after(s,i); s.q.push({k:'nextAct'}); return null; }
    if(a.k==='pass'){ s.did[i]='⏭️ 패스'; say(s,i,null,`⏭️ ${nm(i)}: 패스`); s.q.push({k:'nextAct'}); return null; }
    if(a.k==='draw'){ if(!s.deck.length) return '더미가 비었어요'; const c=s.deck.pop(); s.hand[i].push(c); s.drawn=c; setActor(s,i,'discard'); s.notice=`🗑️ ${nm(i)}이(가) 더미에서 한 장을 가져갔어요 — 버릴 카드를 고르는 중…`; s.think=isH(i)?0:thinkFor(s,i,'act',.3); return null; }
    if(a.k==='swap'){ const c=a.c|0; if(!s.hand[i].includes(c)) return '건넬 카드를 고르세요'; const m=MATE(i); rmCard(s.hand[i],c); s.hand[m].push(c);
      s.swap={from:i,to:m,card:c}; s.know[i].push({seat:m,card:c}); setActor(s,m,'swapback'); s.notice=`🔁 ${nm(i)}이(가) ${nm(m)}에게 카드를 한 장 건넸어요 — 받은 쪽이 한 장을 돌려줄 차례`; s.think=isH(m)?0:thinkFor(s,m,'act',.35); return null; }
    return '알 수 없는 동작'; }
  if(s.phase==='discard'){ if(s.actor!==i) return '내 차례가 아니에요'; if(a.k!=='discard') return '버릴 카드를 고르세요'; const c=a.c|0; if(!rmCard(s.hand[i],c)) return '버릴 카드를 고르세요';
    s.hand[i].sort((x,y)=>x-y); s.pile.push(c); s.did[i]=`🗑️ ${c} 버림`; say(s,i,null,`🗑️ ${nm(i)}: 한 장 뽑고 ${c}을(를) 공개로 버림`); after(s,i); s.phase='act'; s.q.push({k:'nextAct'}); return null; }
  if(s.phase==='swapback'){ const sw=s.swap; if(!sw||sw.to!==i) return '내 차례가 아니에요'; if(a.k!=='back') return '돌려줄 카드를 고르세요'; const c=a.c|0; if(!rmCard(s.hand[i],c)) return '돌려줄 카드를 고르세요';
    s.hand[sw.from].push(c); s.hand[i].sort((x,y)=>x-y); s.hand[sw.from].sort((x,y)=>x-y); s.know[i].push({seat:sw.from,card:c});
    s.swaps.push({r:s.round,from:sw.from,to:i,give:sw.card,back:c}); const same=c===sw.card;
    s.did[sw.from]=`🔁 ${nm(i)}와 교환`; say(s,sw.from,null,`🔁 ${nm(sw.from)} ↔ ${nm(i)} 카드 교환 ${same?'(받은 카드를 그대로 돌려줌)':'완료'}`);
    after(s,i); after(s,sw.from); s.swap=null; s.phase='act'; s.q.push({k:'nextAct'}); return null; }
  if(s.phase==='bet'){ if(s.actor!==i||s.need[0]!==i) return '내 차례가 아니에요'; const c=toCall(s,i);
    if(a.k==='call'){ const pay=Math.min(c,s.chips[i]); s.chips[i]-=pay; s.bet[i]+=pay; s.need.shift();
      say(s,i, c>0?'call':'check', c>0?`📞 ${nm(i)}: 콜 (${c}개)`:`✋ ${nm(i)}: 체크`, {n:c}); s.q.push({k:'nextBet'}); return null; }
    if(a.k==='fold'){ s.fold[i]=true; s.need.shift(); s.tell[i]=null; say(s,i,'fold',`🏳️ ${nm(i)}: 폴드`); s.q.push({k:'nextBet'}); return null; }
    if(a.k==='raise'){ const n=a.n|0, mx=maxRaise(s); if(mx<1) return '더 올릴 수 없어요'; if(n<1||n>mx) return `1~${mx}개까지 올릴 수 있어요`;
      const pay=c+n; s.chips[i]-=pay; s.bet[i]+=pay; s.cur+=n; s.raises++;
      const k=s.order.indexOf(i); s.need=[1,2,3].map(d=>s.order[(k+d)%N]).filter(j=>!s.fold[j]);
      say(s,i,'raise',`⬆️ ${nm(i)}: 레이즈 +${n} (총 ${s.bet[i]}개)`,{n});
      if(n>=3||pot(s)>=14) react(s,i); s.q.push({k:'nextBet'}); return null; }
    return '콜 · 레이즈 · 폴드 중에 고르세요'; }
  return '지금은 할 수 없어요';
}
function after(s,i){ if(!isH(i)) npcSign(s,i); }
function say(s,i,kind,logText,vars){ s.log.push(logText); s.notice=logText;
  if(kind&&!isH(i)){ const t=lineOf(s,i,kind,vars); if(t) s.say={seat:i,text:t,n:(s.say?s.say.n:0)+1}; } }
function react(s,by){ if((s.rc||0)>=2) return; const c=ALL.filter(j=>TEAM(j)!==TEAM(by)&&!isH(j)); if(!c.length) return; s.rc=(s.rc||0)+1; const j=U.pick(c); if(Math.random()<.35+P(s,j).talk*.5) s.q.push({k:'react',i:j,by}); }

/* ── 컴퓨터: 자기 자리에서 보이는 것만 ── */
function view(s,i){ const v=U.clone(s), open=s.phase==='debrief'||s.phase==='over';
  v.hand=s.hand.map((h,j)=> j===i||open||s.shown.includes(j) ? h.slice() : null); v.hc=s.hand.map(h=>h.length);
  v.sign=s.sign.map((x,j)=> j===i||j===MATE(i) ? x : (x?{hidden:true}:null)); v.know=s.know.map((k,j)=>j===i?k:[]);
  if(v.swap&&v.swap.from!==i&&v.swap.to!==i) v.swap={from:v.swap.from,to:v.swap.to,card:null};
  v.drawn = s.actor===i ? s.drawn : null; v.swaps=open?s.swaps:s.swaps.filter(x=>x.from===i||x.to===i); v.bluffs=open?s.bluffs:[];
  v.deck=null; v.dn=s.deck.length; v.q=[]; v.used={}; v.who=s.who; return v; }
function sampleHand(pl,v,i,j,force){
  const h=force.slice(); const sg=v.sign[j];
  const take=c=>{ const k=pl.indexOf(c); if(k>=0){ pl.splice(k,1); return true; } return false; };
  if(j===MATE(i)&&sg&&!sg.hidden){
    if(sg.top!=null&&!h.includes(sg.top)&&take(sg.top)) h.push(sg.top);
    if(sg.top!=null){ const sec=sg.sum-sg.top; if(h.length<2&&sec!==sg.top&&!h.includes(sec)&&take(sec)) h.push(sec); while(h.length<2){ const lo=pl.filter(c=>c<sg.top); const c=lo.length?U.pick(lo):pl[pl.length-1]; take(c); h.push(c); } return h.slice(0,2); }
    if(sg.v){ let best=null; for(let t=0;t<12;t++){ const a=U.shuffle(pl.slice()).slice(0,2-h.length); const sm=SUM(h)+SUM(a); if((sg.v==='hi'&&sm>=17)||(sg.v==='lo'&&sm<=13)){ best=a; break; } best=a; } best.forEach(c=>take(c)); return h.concat(best); }
  }
  while(h.length<2) h.push(pl.pop());
  return h;
}
function mc(v,i,n,ov){
  ov=ov||{}; const hand=ov.hand||v.hand[i], open=ov.open!=null?ov.open:v.open, pile=ov.pile||v.pile, L=ov.live||ALL.filter(j=>!v.fold[j]);
  const seen=new Set([...hand,open,...pile]); const force={}; for(const k of (v.know[i]||[])) if(k.seat!==i&&!seen.has(k.card)&&!hand.includes(k.card)) (force[k.seat]=force[k.seat]||[]).push(k.card);
  for(const j of L) if(j!==i&&v.hand[j]) force[j]=v.hand[j].slice();
  const fset=new Set(Object.values(force).flat()); const base=[]; for(let c=1;c<=15;c++) if(!seen.has(c)&&!fset.has(c)) base.push(c);
  const W=[0,0,0,0]; let tie=0;
  for(let t=0;t<n;t++){ const pl=U.shuffle(base.slice()); const sums=[0,0,0,0];
    for(const j of L){ if(j===i){ sums[j]=SUM(hand); continue; } const f=(force[j]||[]).slice(0,2); sums[j]=SUM(sampleHand(pl,v,i,j,f)); }
    const r=judge(sums,L,open); if(r.win<0) tie++; else W[r.win]++; }
  return {W:W.map(x=>x/n), tie:tie/n};
}
const VAL=(i,R)=> MAIN(i) ? R.W[i]+.35*R.W[MATE(i)]+.15*R.tie : R.W[MATE(i)]+.5*R.W[i]+.1*R.tie;
const LV=[{n:40,mis:.35},{n:90,mis:.08},{n:200,mis:0}];
function unknownPool(v,i){ const seen=new Set([...v.hand[i],v.open,...v.pile]); const o=[]; for(let c=1;c<=15;c++) if(!seen.has(c)) o.push(c); return o; }
function decideAct(v,i,lvl){
  const L=LV[lvl==null?1:lvl], p=P(v,i), h=v.hand[i], m=MATE(i), sg=v.sign[m];
  if(Math.random()<L.mis) return Math.random()<.6?{k:'pass'}:{k:U.pick(['open','draw'])};
  if(!v.swap&&!v.swaps.some(x=>x.r===v.round)){
    const top=Math.max(...h), lo=Math.min(...h);
    if(!MAIN(i)){ const mateHi = sg&&!sg.hidden&&((sg.top!=null&&sg.top>=top)||(sg.v==='hi'));
      if(top>=10&&!mateHi&&Math.random()<.55+p.logic*.4) return {k:'swap',c:top}; }
    else if(sg&&!sg.hidden&&sg.top!=null&&sg.top>=11&&sg.top>lo+3&&Math.random()<.5+p.logic*.45) return {k:'swap',c:lo};
  }
  const pool=unknownPool(v,i), n=Math.round(L.n*.6), K=lvl===2?8:5;
  const opts=[{k:'pass',val:VAL(i,mc(v,i,n))}];
  if(v.dn>0){ let a=0; for(let t=0;t<K;t++){ const no=U.pick(pool); a+=VAL(i,mc(v,i,Math.round(n/2),{open:no,pile:v.pile.concat([v.open])})); } opts.push({k:'open',val:a/K}); }
  if(v.dn>0){ let a=0; for(let t=0;t<K;t++){ const x=U.pick(pool), h3=h.concat([x]); let best=-1;
      for(const d of h3){ const hh=h3.slice(); hh.splice(hh.indexOf(d),1); const vv=VAL(i,mc(v,i,Math.round(n/3),{hand:hh,pile:v.pile.concat([d])})); if(vv>best) best=vv; } a+=best; } opts.push({k:'draw',val:a/K}); }
  opts.forEach(o=>o.val+=(Math.random()-.5)*.03);
  return opts.sort((a,b)=>b.val-a.val)[0];
}
function decideDiscard(v,i,lvl){ const h=v.hand[i], L=LV[lvl==null?1:lvl]; if(Math.random()<L.mis) return {k:'discard',c:Math.min(...h)};
  let best=null, bv=-1; for(const d of h){ const hh=h.slice(); hh.splice(hh.indexOf(d),1); const vv=VAL(i,mc(v,i,Math.round(L.n*.7),{hand:hh,pile:v.pile.concat([d])})); if(vv>bv){ bv=vv; best=d; } }
  return {k:'discard',c:best}; }
function decideBack(v,i,lvl){ const h=v.hand[i], sw=v.swap;
  if(MAIN(i)) return {k:'back', c:Math.min(...h)};
  const give=Math.max(...h.filter(c=>c!==sw.card).concat([sw.card])); return {k:'back', c: (lvl===0&&Math.random()<.3)?sw.card:give }; }
function decideBet(v,i,lvl){
  const L=LV[lvl==null?1:lvl], p=P(v,i), c=v.cur-v.bet[i], P0=v.carry+SUM(v.bet), mx=maxRaiseV(v);
  const R=mc(v,i,L.n), m=MATE(i), mateLive=!v.fold[m];
  let eq = MAIN(i) ? R.W[i]+.25*R.tie : R.W[i]+(mateLive?R.W[m]:0)+.2*R.tie;
  const reserve=ROUNDS-v.round+2, spare=v.chips[i]-reserve;
  if(!MAIN(i)&&spare<=c+1) eq=R.W[i]+.1*R.tie;
  if(MAIN(i)&&mateLive&&R.W[m]>.4&&R.W[i]<.2) eq=Math.max(eq,.15);
  const ev=eq*(P0+c)-c;
  const others=ALL.filter(j=>j!==i&&!v.fold[j]).length;
  if(c>0&&c>spare&&R.W[i]<.55) return {k:'fold',eq};
  if(c>0&&v.chips[i]-c<2&&R.W[i]<.8) return {k:'fold',eq};
  if(Math.random()<L.mis){ return c===0?{k:'call',eq}:(Math.random()<.5?{k:'fold',eq}:{k:'call',eq}); }
  const cap=Math.floor((v.chips[i]+v.bet[i])*(eq>.75?.8:.45))-v.bet[i]-c;
  const room=Math.min(mx, cap, MAIN(i)?v.chips[i]-c-3:spare-c);
  if(room>=1&&eq>.5+others*.03&&Math.random()<.45+p.aggr*.5){ const n=Math.max(1,Math.min(room,Math.round((eq-.4)*8*(.6+p.aggr)))); return {k:'raise',n,eq}; }
  if(room>=2&&v.raises===0&&eq<.22&&v.chips[i]>8&&Math.random()<p.bluff*.22){ return {k:'raise',n:Math.min(mx,2),eq,bluff:true}; }
  if(c===0) return {k:'call',eq};
  if(ev>=0||(eq>.3&&c<=1)) return {k:'call',eq};
  return {k:'fold',eq};
}
function maxRaiseV(v){ if(v.raises>=MAXRAISES) return 0; const L=ALL.filter(j=>!v.fold[j]); const m=Math.min(...L.map(j=>v.chips[j]+v.bet[j]))-v.cur; return Math.max(0,Math.min(MAXR,m)); }
function npcMove(s,i){
  const v=view(s,i); let a;
  if(s.phase==='act') a=decideAct(v,i,1); else if(s.phase==='discard') a=decideDiscard(v,i,1); else if(s.phase==='swapback') a=decideBack(v,i,1);
  else if(s.phase==='bet'){ a=decideBet(v,i,1); const p=P(s,i);
    if(a.k==='raise'){ if(a.bluff){ s.bluffs.push({i,r:s.round,sum:SUM(s.hand[i])}); s.tell[i] = p.bluff<.45&&Math.random()<.75 ? '😅' : '😎'; }
      else s.tell[i] = p.bluff>.6&&Math.random()<p.bluff*.6 ? '😅' : (Math.random()<.5?'🙂':null); }
    else if(a.k==='fold') s.tell[i]=null; }
  const err=act(s,i,a); if(err){ act(s,i, s.phase==='bet'?{k:'call'}:s.phase==='act'?{k:'pass'}:{k:s.phase==='discard'?'discard':'back',c:s.hand[i][0]}); }
}
/* 혼자 모드의 두 번째 사람 자리(상대 주 플레이어) */
function aiSeat(v,i,lvl){
  if(v.sign[i]==null&&['act','bet'].includes(v.phase)) return {k:'sign', v: SUM(v.hand[i])>=17?'hi':'lo'};
  if(v.phase==='act'&&v.actor===i) return decideAct(v,i,lvl);
  if(v.phase==='discard'&&v.actor===i) return decideDiscard(v,i,lvl);
  if(v.phase==='swapback'&&v.swap&&v.swap.to===i) return decideBack(v,i,lvl);
  if(v.phase==='bet'&&v.actor===i){ const a=decideBet(v,i,lvl); return {k:a.k,n:a.n}; }
  return null; }
function ai(v,lvl){ syncH(v); return aiSeat(v,HSEAT[1],lvl); }
function aiDelay(v){ if(v.phase==='bet') return 1300+Math.random()*2200; return 1100+Math.random()*1600; }

function apply(s,p,a){ syncH(s);
  if(s.winner!=null) return '게임이 끝났어요'; if(!a) return '알 수 없는 동작'; const i=HSEAT[p];
  if(a.k==='sign'){ if(!['act','discard','swapback','bet'].includes(s.phase)) return '지금은 사인을 보낼 수 없어요'; if(s.sign[i]) return '이번 라운드 사인은 이미 보냈어요';
    if(a.v!=='hi'&&a.v!=='lo') return '사인을 고르세요'; s.sign[i]={v:a.v}; s.ev++; return null; }
  if(s.q.length) return '잠시만요 — 진행 중이에요';
  const err=act(s,i,a); if(!err) s.ev++; return err;
}
function stepDelay(s){ syncH(s);
  if(s.winner!=null) return null;
  if(s.phase==='intro') return 2200;
  if(s.q.length){ const k=s.q[0].k; return k==='note'?1600 : k==='reveal'?1300 : k==='low'?1700 : k==='judge'||k==='win'?1900 : k==='react'?1300 : k==='rend'?2000 : 500; }
  if(s.phase==='act'||s.phase==='discard'||s.phase==='bet') return isH(s.actor)?null:s.think;
  if(s.phase==='swapback') return isH(s.swap.to)?null:s.think;
  if(s.phase==='debrief') return s.dj<s.dlist.length?2300:1500;
  return null;
}
function step(s){ syncH(s);
  if(s.phase==='intro'){ newRound(s); s.ev++; return; }
  if(s.q.length){ const e=s.q.shift();
    if(e.k==='note'){ s.notice=e.text; s.log.push(e.text); }
    else if(e.k==='nextAct') nextAct(s);
    else if(e.k==='nextBet') nextBet(s);
    else if(e.k==='reveal'){ s.shown.push(e.i); const h=s.hand[e.i]; s.notice=`🃏 ${nm(e.i)}: ${h.join(' + ')} = ${SUM(h)}`; s.log.push(s.notice); }
    else if(e.k==='low'){ const L=live(s), sums=ALL.map(j=>SUM(s.hand[j])), r=judge(sums,L,s.open); s.low=r.low; s.sums=r.tot;
      s.notice = r.low>=0 ? `🔻 합이 가장 낮은 ${nm(r.low)}이(가) 오픈 카드 ${s.open}을(를) 가져가요 → ${r.tot[r.low]}` : `🔻 최저 합이 여럿이라 오픈 카드 ${s.open}은(는) 아무도 못 가져가요`; s.log.push(s.notice); }
    else if(e.k==='judge'){ const r=judge(ALL.map(j=>SUM(s.hand[j])),live(s),s.open); settle(s, r.win, r.tot); }
    else if(e.k==='win') settle(s, e.w, null, true);
    else if(e.k==='react'){ const t=lineOf(s,e.i,'react',{t:e.by}); if(t){ s.say={seat:e.i,text:t,n:(s.say?s.say.n:0)+1}; s.log.push(`${nm(e.i)}: ${t}`); } }
    else if(e.k==='rend') afterRound(s);
    s.ev++; return; }
  if(['act','discard','bet'].includes(s.phase)&&!isH(s.actor)){ npcMove(s,s.actor); s.ev++; return; }
  if(s.phase==='swapback'&&!isH(s.swap.to)){ npcMove(s,s.swap.to); s.ev++; return; }
  if(s.phase==='debrief'){ if(s.dj<s.dlist.length){ const i=s.dlist[s.dj++]; const t=confess(s,i); s.say={seat:i,text:t,n:(s.say?s.say.n:0)+1}; s.log.push(`💭 ${nm(i)}: ${t}`); s.ev++; return; }
    s.phase='over'; if(HSEAT.length>2){ s.winners=s.wteam==null?HSEAT.map((_,p)=>p):HSEAT.map((h,p)=>TEAM(h)===s.wteam?p:-1).filter(x=>x>=0); s.winner=s.wteam==null?'both':'none'; } else s.winner = s.wteam==null?'both':s.wteam; s.ev++; return; }
}
function settle(s,w,tot,single){
  const P0=pot(s);
  if(w<0){ s.carry=P0; s.bet=[0,0,0,0]; s.notice=`🤝 최고 합 동률! 판돈 ${P0}개는 다음 라운드로 이월`; s.hist.push({r:s.round,w:-1,pot:P0,sums:tot}); }
  else { s.chips[w]+=P0; s.carry=0; s.bet=[0,0,0,0]; s.notice = single ? `🏆 모두 접어서 ${nm(w)}이(가) 판돈 ${P0}개를 가져가요` : `🏆 ${nm(w)} 합 ${tot[w]}로 승리! 판돈 ${P0}개`;
    s.hist.push({r:s.round,w,pot:P0,sums:tot});
    if(!isH(w)){ const t=lineOf(s,w,'win',{n:P0}); if(t) s.say={seat:w,text:t,n:(s.say?s.say.n:0)+1}; }
    if(P0>=10) react(s,w);
    const bl=s.bluffs.find(b=>b.i===w&&b.r===s.round); if(bl&&single) s.log.push(`(나중에 밝혀질 비밀 하나…)`); }
  s.log.push(s.notice); s.phase='rend'; s.q.push({k:'rend'});
}
function confess(s,i){ const b=s.bluffs.filter(x=>x.i===i), sw=s.swaps.filter(x=>x.from===i||x.to===i), m=MATE(i);
  if(b.length){ const x=U.pick(b); return `(속마음) ${x.r}라운드 레이즈요? 사실 합이 ${x.sum}밖에 안 됐어요 😅`; }
  const g=sw.find(x=>x.from===i&&x.give>=11); if(g) return `(속마음) ${g.r}라운드에 ${g.give}을(를) ${nm(m)}한테 몰래 넘겼죠. 사인 덕분이에요 🦶`;
  const k=sw.find(x=>x.to===i&&x.back>=11); if(k) return `(속마음) ${k.r}라운드에 ${k.back}을(를) 돌려줬어요. 팀이니까요 🤝`;
  return s.wteam===TEAM(i) ? '(속마음) 사실 계속 떨렸어요. 이겨서 다행이에요' : '(속마음) 오픈 카드 운이 끝까지 안 따랐어요…';
}
function mask(s,p){ syncH(s); const v=view(s,HSEAT[p]); delete v.deck; return v; }

/* ── 화면 ── */
let WHO={}, sel=null, rz=1, sig='';
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function josa(name,a,b){ const base=name.replace(/\(나\)$/,''), c=base.charCodeAt(base.length-1); return c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28 ? a : b; }
const JO={'이(가)':['이','가'],'은(는)':['은','는'],'을(를)':['을','를'],'와':['과','와'],'에게':['에게','에게']};
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}(이\(가\)|은\(는\)|을\(를\)|와)?/g,(_,d,j)=>{ const n=seatName(+d,ctx); return `${seatEmoji(+d)} ${n}${j?josa(n,JO[j][0],JO[j][1]):''}`; })
  .replace(/(\d+)(을\(를\)|은\(는\)|이\(가\))/g,(_,d,j)=>d+(NUMJ(+d)?JO[j][0]:JO[j][1])); }
const NUMJ=n=>[0,1,3,6,7,8].includes(n%10);
const cardHtml=(c,cls)=>`<span class="sp-card ${c<=5?'lo':c<=10?'mid':'hi'} ${cls||''}">${c}</span>`;
const backs=n=>Array(n).fill('<span class="sp-card back">🂠</span>').join('');
function signTxt(sg){ if(!sg||sg.hidden) return ''; if(sg.top!=null) return `🦶 최고 ${sg.top} · 합 ${sg.sum}`; return sg.v==='hi'?'🦶 높아요 👍':'🦶 낮아요 👎'; }
function seatBox(v,i,ctx,me,mine){
  const f=v.fold[i], h=v.hand[i], sh=v.shown.includes(i)||v.phase==='over'||v.phase==='debrief';
  const cards = i===me ? (mine||'') : (h&&sh ? h.map(c=>cardHtml(c,'sm')).join('') : backs(v.hc[i]));
  const sgn = i===MATE(me) ? signTxt(v.sign[i]) : (v.sign[i]&&v.sign[i].hidden&&TEAM(i)!==TEAM(me)?'<span class="sp-dim">🦶 …</span>':'');
  return `<div class="sp-seat ${i===me?'me':''} ${v.actor===i||(v.phase==='swapback'&&v.swap&&v.swap.to===i)?'act':''} ${f?'fold':''} ${v.low===i?'low':''}">
    <div class="sp-nm">${seatEmoji(i)} ${seatName(i,ctx)} <small>${MAIN(i)?'주 플레이어':'조력자'}</small> ${v.tell[i]?`<span class="sp-tell" title="표정">${v.tell[i]}</span>`:''}</div>
    ${isH(i)?'':`<small class="ev-arch">${NPCI(i)[2]}</small>`}
    <div class="sp-chips">🪙 <b>${v.chips[i]}</b> ${v.bet[i]?`· 베팅 <b>${v.bet[i]}</b>`:''} ${f?'· 🏳️ 폴드':''}</div>
    <div class="sp-hand">${cards}</div><div class="sp-sg">${sgn||'　'}</div><div class="sp-did">${v.did[i]?fill(U.esc(v.did[i]),ctx):'　'}</div></div>`;
}
function render(el,v,ctx){
  syncH(v); WHO=v.who||{}; const me=HSEAT[ctx.me], m=MATE(me), opp=TEAM(me)?0:2, om=MATE(opp);
  const sg=v.round+':'+v.phase+':'+v.ai+':'+(v.hand[me]||[]).join(','); if(sg!==sig){ sig=sg; sel=null; rz=1; }
  const myAct = v.turn===ctx.me;
  let h=`<div class="hl-notice">${fill(U.esc(v.notice||''),ctx)}</div>`;
  h+=`<div class="vr-speech">${v.say?`<span class="w">${seatEmoji(v.say.seat)} ${seatName(v.say.seat,ctx)}</span> ${fill(U.esc(v.say.text),ctx)}`:'<i>　</i>'}</div>`;
  h+=`<div class="info">${v.round}/${ROUNDS}라운드 · 판돈 <b>${v.carry+SUM(v.bet)}</b>${v.carry?` (이월 ${v.carry})`:''} · 더미 ${v.dn}장</div>`;
  const hand=v.hand[me]||[]; const pick = myAct&&(v.phase==='act'||v.phase==='discard'||v.phase==='swapback');
  const mine=hand.map(c=>`<button class="sp-cb ${sel===c?'sel':''}" data-c="${c}" ${pick?'':'disabled'}>${cardHtml(c,'md')}</button>`).join('')+`<div class="sp-sum">합 <b>${SUM(hand)}</b></div>`;
  h+=`<div class="sp-table"><div class="sp-row">${seatBox(v,opp,ctx,me)}${seatBox(v,om,ctx,me)}</div>
    <div class="sp-mid"><div><small>오픈 카드</small>${v.open!=null?cardHtml(v.open,'big'):''}</div><div class="sp-pile"><small>버린 카드</small><div>${v.pile.map(c=>cardHtml(c,'xs')).join('')||'-'}</div></div></div>
    <div class="sp-row">${seatBox(v,me,ctx,me,mine)}${seatBox(v,m,ctx,me)}</div></div>`;
  
  const hint=(v.drawn&&v.phase==='discard'&&myAct?`방금 뽑은 카드 <b>${v.drawn}</b> `:'')+(v.phase==='swapback'&&v.swap&&v.swap.to===me&&v.swap.card!=null?`팀원이 건넨 카드 <b>${v.swap.card}</b>`:'');
  if(hint) h+=`<div class="sp-my">${hint}</div>`;
  if(myAct&&v.phase==='act') h+=`<div class="vr-card"><b>🎴 내 행동 — 하나만</b><div class="fh-act">
      <button data-a="open" ${v.dn?'':'disabled'}>🔄 오픈 카드 바꾸기</button><button data-a="draw" ${v.dn?'':'disabled'}>🗑️ 한 장 뽑고 버리기</button>
      <button data-a="swap" ${sel!=null?'':'disabled'}>🔁 ${sel!=null?`${sel}을(를) `:''}팀원에게 건네기</button><button class="ghost" data-a="pass">⏭️ 패스</button></div>
      <small>교환은 위에서 건넬 카드를 먼저 누르세요. 팀원이 한 장을 돌려줘요(그대로 돌려줄 수도).</small></div>`;
  if(myAct&&v.phase==='discard') h+=`<div class="vr-card"><b>🗑️ 버릴 카드 한 장</b> <small>버린 카드는 모두에게 공개돼요</small><div class="fh-act"><button data-a="discard" ${sel!=null?'':'disabled'}>${sel!=null?`${sel} 버리기`:'위에서 카드를 고르세요'}</button></div></div>`;
  if(myAct&&v.phase==='swapback') h+=`<div class="vr-card"><b>🔁 팀원에게 돌려줄 카드</b> <small>받은 카드를 그대로 돌려줘도 돼요</small><div class="fh-act"><button data-a="back" ${sel!=null?'':'disabled'}>${sel!=null?`${sel} 돌려주기`:'위에서 카드를 고르세요'}</button></div></div>`;
  if(myAct&&v.phase==='bet'){ const c=v.cur-v.bet[me], mx=maxRaiseV(v); rz=Math.max(1,Math.min(rz,mx||1));
    h+=`<div class="vr-card"><b>💰 베팅</b> <small>판돈 ${v.carry+SUM(v.bet)} · 내 칩 ${v.chips[me]}</small><div class="fh-act">
      <button data-a="call">${c>0?`📞 콜 (${c}개)`:'✋ 체크'}</button>
      ${mx>=1?`<span class="bs-amt"><button class="ghost" data-a="rm">−</button><b>+${rz}</b><button class="ghost" data-a="rp">+</button></span><button data-a="raise" style="background:#b8412f">⬆️ 레이즈 +${rz}</button>`:''}
      <button class="ghost" data-a="fold">🏳️ 폴드</button></div></div>`; }
  if(['act','discard','swapback','bet'].includes(v.phase)&&!v.sign[me]) h+=`<div class="sp-signbar">🦶 팀원에게 사인 <button class="ghost" data-sg="hi">👍 높아요</button><button class="ghost" data-sg="lo">👎 낮아요</button> <small>상대 팀에는 안 보여요</small></div>`;
  else if(v.sign[me]&&v.phase!=='over') h+=`<div class="sp-signbar"><small>보낸 사인: ${signTxt(v.sign[me])}</small></div>`;
  if(v.phase==='over'||v.phase==='debrief') h+=`<div class="sn-score">${[0,2].map(i=>`<div class="${TEAM(i)===TEAM(me)?'h':''}"><b>${seatEmoji(i)} ${seatName(i,ctx)} 팀 ${v.wteam===TEAM(i)?'🏆':''}</b> 주 플레이어 🪙${v.chips[i]} · 조력자 ${seatEmoji(i+1)} 🪙${v.chips[i+1]}</div>`).join('')}<small>${U.esc(v.why||'')}</small></div>`;
  const L=`<div class="side-box"><div class="side-h">🧠 테이블 읽기 <small>이번 라운드</small></div>${ALL.map(i=>`<div class="side-row ${i===me?'me':''}" style="flex-wrap:wrap">${seatEmoji(i)} ${seatName(i,ctx)} <small>🪙${v.chips[i]}${v.bet[i]?` · 베팅 ${v.bet[i]}`:''}${v.fold[i]?' · 폴드':''}</small><div class="hl-st">${v.did[i]?fill(U.esc(v.did[i]),ctx):'-'} ${v.tell[i]?`· 표정 ${v.tell[i]}`:''}</div></div>`).join('')}
    <div class="side-h" style="margin-top:8px">📊 라운드 결과</div>${v.hist.length?v.hist.slice().reverse().map(x=>`<div class="side-row"><small>${x.r}R</small> ${x.w<0?'🤝 이월':`🏆 ${seatEmoji(x.w)} ${seatName(x.w,ctx)}`} <small>판돈 ${x.pot}${x.sums&&x.w>=0?` · 합 ${x.sums[x.w]}`:''}</small></div>`).join(''):'<div class="side-row"><small>아직 없음</small></div>'}</div>`;
  const R=`<div class="side-box side-log"><div class="side-h">📜 진행 기록 <small>최근이 위</small></div>${v.log.slice(-70).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=`<div class="side3"><div class="side-mid">${h}</div><aside class="side-l">${L}</aside><aside class="side-r">${R}</aside></div>`;
  el.onclick=e=>{
    const cb=e.target.closest('[data-c]'); if(cb&&!cb.disabled){ const c=+cb.dataset.c; sel = sel===c?null:c; return ctx.rerender(); }
    const sgb=e.target.closest('[data-sg]'); if(sgb) return ctx.act({k:'sign',v:sgb.dataset.sg});
    const a=e.target.closest('[data-a]'); if(!a||a.disabled) return; const k=a.dataset.a;
    if(k==='rm'){ rz=Math.max(1,rz-1); return ctx.rerender(); } if(k==='rp'){ rz=Math.min(maxRaiseV(v),rz+1); return ctx.rerender(); }
    if(k==='open'||k==='draw'||k==='pass'||k==='call'||k==='fold') return ctx.act({k});
    if(k==='raise') return ctx.act({k:'raise',n:rz});
    if(k==='swap'||k==='discard'||k==='back'){ const c=sel; sel=null; return ctx.act({k,c}); }
  };
}
function status(v,ctx){ syncH(v); if(v.phase==='over') return ''; if(v.turn===ctx.me) return {act:'행동을 고르세요',discard:'버릴 카드를 고르세요',swapback:'돌려줄 카드를 고르세요',bet:'콜 · 레이즈 · 폴드'}[v.phase]||''; return '진행 중…'; }
const guide=`
<p><b>2:2 팀 포커</b> — 주 플레이어 + 조력자 vs 주 플레이어 + 조력자. 사람 2~4명(셋 이상이면 조력자 자리에도 사람, 빈자리는 컴퓨터).</p>
<ol><li>1~15 카드 한 벌. 라운드마다 각자 <b>2장</b>, 가운데 <b>오픈 카드</b> 1장. 칩은 20개씩, 기본 베팅 1개.</li>
<li>한 사람씩 <b>행동 하나</b>: 🔄 오픈 카드 바꾸기 · 🔁 팀원과 한 장 교환 · 🗑️ 한 장 뽑고 한 장 공개로 버리기 · ⏭️ 패스.</li>
<li>그다음 <b>베팅</b>: 콜 · 레이즈(최대 +${MAXR}) · 폴드.</li>
<li>승부: 합이 <b>가장 낮은 한 명</b>이 오픈 카드를 가져가 더하고, 합이 <b>가장 높은 사람</b>이 판돈을 전부 가져가요. 최고가 동률이면 판돈 이월.</li>
<li>${ROUNDS}라운드 뒤 <b>주 플레이어 칩</b>이 많은 팀 승리. 누구든 칩이 0이 되면 그 팀은 즉시 패배.</li></ol>
<div class="tipbox">💡 <b>팁</b><br>· 조력자의 칩도 소중해요(0이면 팀 패배). 조력자가 판돈을 키우면 결국 내 칩이 돼요.<br>· 🦶 사인은 우리 팀만 봐요. 조력자는 자기 최고 카드를 알려 줘요.<br>· 합이 아주 낮으면 오픈 카드를 노려 역전할 수도!</div>`;
function demoBase(s){ newRound(s); s.q=[]; s.phase='act'; s.ai=0; s.actor=0; s.turn=0; return s; }
const guideSteps=[
  {t:'🃏 카드와 칩', h:'1~15 카드 한 벌. 각자 <b>2장</b>, 가운데 <b>오픈 카드</b> 1장. 칩은 <b>20개</b>씩, 라운드마다 기본 베팅 1개.', demo:s=>{ demoBase(s); s.notice='🎙️ 1라운드 — 오픈 카드 '+s.open; return s; }},
  {t:'🎴 행동은 하나만', h:'내 차례에 <b>하나</b>: 🔄 오픈 카드 바꾸기 · 🔁 팀원과 교환 · 🗑️ 뽑고 버리기 · ⏭️ 패스.', demo:s=>demoBase(s)},
  {t:'🦶 팀 사인', h:'조력자는 <b>자기 최고 카드</b>를 사인으로 알려 줘요. 나는 👍/👎로 답할 수 있어요. 상대 팀에는 <b>안 보여요</b>.', demo:s=>{ demoBase(s); s.sign[0]={v:'hi'}; s.notice='🦶 테이블 아래에서 팀끼리 사인이 오갑니다…'; return s; }},
  {t:'💰 베팅', h:'모두 행동한 뒤 <b>콜 · 레이즈 · 폴드</b>. 큰 레이즈엔 표정(😅 😎)을 잘 보세요.', demo:s=>{ demoBase(s); s.phase='bet'; s.bet=[1,3,3,1]; s.cur=3; s.raises=1; s.tell[1]='🙂'; s.tell[3]='😅'; s.need=[0]; s.notice='💰 차례 — 콜하려면 2개'; return s; }},
  {t:'🔻 낮은 합의 역전', h:'승부 때 합이 <b>가장 낮은 한 명</b>이 오픈 카드를 더해요. 그다음 합이 <b>가장 높은 사람</b>이 판돈을 가져가요.', demo:s=>{ demoBase(s); s.hand=[[12,14],[3,4],[9,10],[2,5]]; s.open=15; s.phase='show'; s.turn=null; s.shown=[0,1,2,3]; s.low=3; s.notice='🔻 합이 가장 낮은 쪽이 오픈 카드 15를 가져가요 → 22'; return s; }},
  {t:'🏆 승리', h:`${ROUNDS}라운드 뒤 <b>주 플레이어 칩</b>이 많은 팀이 이겨요. 조력자든 누구든 <b>칩 0</b>이면 그 팀은 즉시 패배!`, demo:s=>{ demoBase(s); s.chips=[31,12,9,8]; s.round=7; s.notice='🎙️ 마지막 7라운드'; return s; }},
];
window.GAMES.switchpoker = {
  title:'스위치 포커', ref:'피의 게임 「스위치 포커」', emoji:'🔁', tags:['포커','팀전','블러핑','NPC','두뇌서바이벌'],
  tagline:'낮은 합은 오픈 카드로 역전, 높은 합은 판돈을. 조력자와 사인으로 카드를 바꿔 치는 2:2 포커.',
  guide, guideSteps, init, apply, mask, ai, aiDelay, render, status, step, stepDelay, noPersona:true, wide:true,
  reset(){ sig=''; sel=null; rz=1; },
  maxH:4, bar:(v,i)=>{ syncH(v); return `<span class="tag">🪙${v.chips[HSEAT[i]]}</span>`; },
  result:(v,ctx)=>{ syncH(v); const me=HSEAT[ctx.me]; return `칩 ${v.chips[me]} · 조력자 ${v.chips[MATE(me)]}`; },
  _view:view, _aiSeat:aiSeat, _decide:{decideAct,decideBet,decideDiscard,decideBack}, _H:HSEAT,
};
})();
