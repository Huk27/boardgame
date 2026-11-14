(function(){
'use strict';
/* 과일가게 (더 지니어스 시즌 3 · 1회 메인 매치) — 8인(우리 둘 + NPC 6명).
   과일 6종(🍎🍇🍈🍊🍓🍉), 각자 무작위 2종의 판매권. 4라운드 동안 내 과일마다 희망가(1~5천 원)를 몰래 냄.
   과일별 판매가 = 그 과일 판매자 중 최저 희망가. 최저가를 낸 사람이 '판매가 × 판매자 수'를 받음(여럿이면 나눔).
   → 다 같이 비싸게 부르면 나눠 갖고, 혼자 싸게 부르면 독식. 결과는 과일별 판매가·판매자 수·독식 여부만 공개(누가 받았는지는 비공개, 누적 수입도 비공개).
   아이템 한 번: 🤫 비밀(이번 라운드 한 과일 결과를 숨김) 또는 🔁 교체(내 과일 하나를 다른 과일로, 공개). 4라운드 누적 수입 1위 우승. */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로 — 고르게 퍼지게, 나머지는 NPC */
const N=8, ROUNDS=4; let HSEAT=[0,4]; const SEATORD=[0,4,2,6,1,5,3,7];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i), ALL=[...Array(N).keys()];
const nm=i=>`{s${i}}`;
const FR=['🍎','🍇','🍈','🍊','🍓','🍉'], FN=['사과','포도','참외','감귤','딸기','수박'];
const STYLE={seojin:'logic', doyun:'warm', haram:'calm', yuna:'emo', minho:'sly', taekyung:'hot', jihu:'sly', soyul:'warm'};
const DEF_P={talk:.5,aggr:.5,trust:.5,bluff:.4,logic:.6,temper:.4};
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
const LINES={
  logic:{prop:['{f} 판매자분들, 다 5천 원이 모두에게 이득이에요.','{f}은(는) 5천 원으로 맞춰요. 계산상 그게 최선이에요.'], acc:['{f}에서 누가 혼자 싸게 팔았네요. 기억해 둘게요.'], end:['마지막 라운드는 다들 조심하세요.']},
  warm:{prop:['{f} 같이 5천 원 해요~ 다 같이 살아요 🤝','{f} 분들, 우리 욕심 내지 말아요 😊'], acc:['{f}… 누가 배신했어요? 😢'], end:['마지막까지 같이 가요 🙏']},
  calm:{prop:['{f}, 5천.','…{f}은(는) 5천 원.'], acc:['…{f}.'], end:['…']},
  emo:{prop:['{f} 5천 원!! 약속해요!!','{f} 다들 5천 원 맞죠?! 🥺'], acc:['{f} 배신자 누구야!! 😭'], end:['마지막인데 설마… 😰']},
  sly:{prop:['{f} 5천 원 가죠~ 저 믿죠? 😏','{f}? 당연히 5천 원이죠 😏'], acc:['{f}에서 누가 장난쳤네 😏'], end:['마지막엔 다들 본심이 나오겠죠 😏']},
  hot:{prop:['{f} 5천 원! 배신하면 가만 안 둬요 🔥','{f}은(는) 5천 원 고정!'], acc:['{f}! 누구예요?! 😤'], end:['마지막이라고 배신하지 마요! 🔥']},
};
const XL={
  acc_only:['{f} 판매자는 저랑 {t}뿐이에요. 저는 5천 냈어요. {t}, 깎았죠?','{f} 독식… 저 아니면 {t}예요. 설명해 봐요.','{f}에서 저는 못 받았어요. 남은 건 {t}뿐이죠?'],
  acc_broke:['{t}, {f} 다 같이 5천 하자더니 깎았죠? 🤨','{f} 약속한 사람이 {t}였죠. 근데 독식이 나왔네요.','{t}가 먼저 5천 하자고 했잖아요. {f} 독식은 뭐예요?'],
  acc_sus:['{f} 독식, 저는 {t} 쪽이 의심돼요. 저는 못 받았거든요.','{f}에서 누가 깎았는데… 저는 {t} 표정이 걸려요.'],
  ask:['{f} 독식 누구예요? {t}, 몇 냈어요?','{t}, {f} 솔직히 몇 냈어요?','{t}, {f}에서 받았어요?'],
  deny:['저 5천 냈어요! {x} 쪽 아니에요?','아니에요, 저 약속 지켰어요. {x}한테 물어봐요.','저 아니에요. {f}이면 {x}도 팔잖아요.'],
  ansOK:['{f} 5천 냈어요. 약속대로요.','저는 5천이요. {f}이면 다른 판매자한테도 물어봐요.','5천이요. 깎을 생각 없었어요 🙂'],
  ansLie:['저요? 5천 냈죠 🙂','당연히 5천이죠. 왜요?'],
  deny2:['저 진짜 5천 냈어요. 오히려 먼저 찍는 {t}이(가) 수상해요.','저 아니에요. 둘뿐이면… 연기하는 건 {t} 쪽이죠?'],
  confess:['…네, 제가 {f} 깎았어요. 미안해요 😅','들켰네요 😏 {f}은(는) 제가 먹었어요.','솔직히 말할게요. {f} 4천 냈어요. 다음엔 지킬게요.'],
  nervous:['저, 저는 5천… 냈는데요? 😅','왜 저예요?! 저… 약속 지켰어요 😅','아, 그게… {f} 저 5천 냈어요 😅'],
  sweat:['{t}, 방금 엄청 당황했죠? 🤨','말 더듬는 거 다들 봤죠? {t} 같아요.'],
  reb_none:['{t}, 근거가 뭐예요?','왜 저예요? 저 그 과일 안 팔아요.','이유도 없이 저를요?'],
  thanks:['{f} 다들 약속 지켰네요 🤝','{f} 5천 원, 다들 고마워요!','{f} 판매자분들 최고예요 👍'],
  allcut:['{f}은(는) 다 같이 깎았네요 ㅋㅋ','{f} 판매가 {p}천 원… 다들 겁먹었네요 😅'],
  forgive:['솔직하게 말해 줘서 고마워요. 다음엔 지켜요.','고백한 건 인정할게요. 다음 라운드 봐요.'],
  angry:['다음 라운드는 저도 안 봐줘요 😤','{t}, 기억해 둘게요.','이제 {t} 말은 못 믿겠어요.'],
  outed:['다들 들어요. {t}이(가) 저랑 몰래 {f} {p}천 약속해 놓고 깼어요!','{t}, 몰래 {f} 약속하자더니! 이런 사람이에요 😡'],
  denyOut:['증거 있어요? 몰래 약속 같은 거 한 적 없어요.','그건 {t} 혼자 지어낸 얘기예요.'],
  cartelHurt:['잠깐, 둘이서 몰래 짰다고요? 저만 빼고요? 😠','{f}에서 저만 바보 됐네요… 기억할게요.'],
  claimQ:['정말요? {f} 판매자 중에 누군가는 깎았는데요?','다들 그렇게 말하죠 🤨'],
  claimOK:['{t} 말은 믿을게요.','그래요, {t}은(는) 지켰겠죠.'],
};
const OPTK=['thanks','allcut','forgive','angry','claimQ','claimOK','cartelHurt','sweat'];
function lineX(s,i,kind,o){ const L=XL[kind]; if(!L) return null; const used=(s.used[i]=s.used[i]||[]); o=o||{};
  const fl=t=>t.replace(/\{f\}은\(는\)/g,o.f!=null?`${FR[o.f]}${FN[o.f]}${jo(FN[o.f],'은','는')}`:'').replace(/\{f\}/g,o.f!=null?`${FR[o.f]}${FN[o.f]}`:'').split('{t}').join(o.t!=null?nm(o.t):'').split('{x}').join(o.x!=null?nm(o.x):'다른 사람').split('{p}').join(o.p!=null?o.p:'');
  const c=L.map(fl).filter(t=>!used.includes(t)); if(!c.length) return null;
  const t=U.pick(c); used.push(t); return t; }
const MOOD={ansOK:'🙂',ansLie:'😏',acc_none:'🤨',claim:'🙋',acc_only:'🤨',acc_broke:'😤',acc_sus:'🤨',ask:'🧐',deny:'😤',deny2:'😠',confess:'😓',nervous:'😅',sweat:'🤨',reb_none:'😤',thanks:'🤝',allcut:'😂',forgive:'🙂',angry:'😤',outed:'😡',denyOut:'😤',cartelHurt:'😠',claimQ:'🤨',claimOK:'🙂',prop:'🤝',acc:'🤨',end:'😰'};
const ACCK=['acc_only','acc_broke','acc_sus','sweat','outed'];
/* 말하기: 자리 표정·대화 줄·기록 */
function talkT(s,i,text,kind,t){ if(!text) return false; s.say={seat:i,text,n:(s.say?s.say.n:0)+1,t:t??null,kind}; s.feed.push({r:s.round,seat:i,text,t:t??null,kind}); s.log.push(`💬 ${nm(i)}: ${text}`); s.mood[i]={e:MOOD[kind]||'💬',n:(s.moodN=(s.moodN||0)+1)}; return true; }
function lineOf(s,i,kind,f){ const st=STYLE[P(s,i).id]||'calm', L=(LINES[st]||LINES.calm)[kind]; if(!L) return ''; const used=(s.used[i]=s.used[i]||[]); const GP={prop:['{f}, 이번에도 5천 원 가요.','{f} 판매자분들, 욕심 내면 다 같이 손해예요.','{f} 5천 원 약속해요. 지키는 사람이 이겨요.','{f}은(는) 이번에도 5천이죠?'],acc:['{f}에서 누가 혼자 싸게 팔았어요. 이번엔 지켜 봐요.','{f} 독식 또 나오면 저도 깎을 거예요.'],end:['마지막 라운드예요. 다들 양심 걸고 가요.','마지막이라고 깎으면 다 티 나요.']}; const pool=L.concat(GP[kind]||[]).filter(x=>!used.includes(x)); if(!pool.length) return ''; const raw=U.pick(pool); used.push(raw);
  return raw.replace(/\{f\}은\(는\)/g,f!=null?`${FR[f]}${FN[f]}${jo(FN[f],'은','는')}`:'').replace(/\{f\}/g,f!=null?`${FR[f]}${FN[f]}`:''); }
const jo=(w,a,b)=>{ const c=w.charCodeAt(w.length-1); return c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28?a:b; };
function say(s,i,kind,f){ if(isH(i)) return; const t=lineOf(s,i,kind,f); if(t) talkT(s,i,t,kind); }

function init(starter,o){ const k=Math.max(2,Math.min(8,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  const s={phase:'intro', who:{}, starter:starter|0, round:0, own:null, price:ALL.map(()=>({})), sub:Array(N).fill(false), tot:Array(N).fill(0), item:Array(N).fill(true), secret:{}, props:[], res:[], hist:[],
    sus:ALL.map(()=>Array(N).fill(0)), q:[], say:null, used:{}, log:[], feed:[], mood:{}, dready:HSEAT.map(()=>false), dsaid:HSEAT.map(()=>0), hs:HSEAT.slice(), dm:{}, dmN:0, pact:[], wh:{}, turn:null, winner:null, ev:0, notice:'🎙️ 메인 매치 「과일가게」 — 같이 비싸게 팔까, 혼자 싸게 팔까'};
  const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=ids[k]);
  ALL.forEach(i=>{ if(isH(i)) return; ALL.forEach(j=>{ if(i!==j) s.sus[i][j]=-NPCS.rel(s.who[i], isH(j)?(pOf(j)===0?'me':'opp'):s.who[j])*1.2; }); });
  /* 판매권 16장: 3·3·3·3·2·2 → 한 사람에게 같은 과일 두 장이 안 가게 */
  for(let g=0;g<200;g++){ const deck=U.shuffle([0,0,0,1,1,1,2,2,2,3,3,3,4,4,5,5]); const own=ALL.map(i=>[deck[i*2],deck[i*2+1]]); if(own.every(o=>o[0]!==o[1])){ s.own=own; break; } }
  return s;
}
const sellers=(s,f)=>ALL.filter(i=>s.own[i].includes(f));
function dmPush(s,to,from,text,o){ if(!isH(to)) return; (s.dm[to]=s.dm[to]||[]).push(Object.assign({id:++s.dmN,r:s.round,from,text,state:'info'},o||{})); }
const pactOf=(s,i,f)=>s.pact.find(p=>p.r===s.round&&p.f===f&&(p.a===i||p.b===i));
/* NPC가 몰래 약속을 받을지 */
function npcAccepts(s,i,h,kind){ const p=P(s,i); return (p.trust*.45-s.sus[i][h]*.6+(kind==='cartel'?p.aggr*.35:.25)+Math.random()*.35)>.5; }
/* 라운드 시작: 같은 과일 판매자 NPC가 가끔 나에게 몰래 제안 */
function npcWhisper(s){ for(const h of HSEAT){ if(Math.random()>.55) continue;
  for(const f of U.shuffle(s.own[h].slice())){ const co=sellers(s,f).filter(j=>j!==h&&!isH(j)); if(!co.length) continue; const i=co.sort((a,b)=>s.sus[a][h]-s.sus[b][h])[0], p=P(s,i);
    if(s.sus[i][h]>.6) continue; const cartel=co.length>=2&&Math.random()<p.aggr*.7;
    dmPush(s,h,i, cartel?`${FR[f]}${FN[f]}, 우리 둘이 몰래 4천 맞춰요. 나머지 한 명은 빼고 둘이 나눠요 🤫`:`${FR[f]}${FN[f]}, 우리 둘은 무조건 5천 지켜요. 둘만 약속 🤝`,{state:'open',kind:cartel?'cartel':'pact5',f}); break; } } }
/* 약속을 지킬지: 성격·마지막 라운드·늑대 */
function keepsPact(s,i,pc){ const p=P(s,i); const b=p.bluff*.45+(s.round===ROUNDS?.25:0)+(s.who[i]==='jihu'?.3:0)-p.trust*.15; return Math.random()>b; }
function startRound(s){ s.round++; s.dready=HSEAT.map(()=>false); s.dsaid=HSEAT.map(()=>0); s.price=ALL.map(()=>({})); s.sub=Array(N).fill(false); s.secret={}; s.props=[]; s.phase='talk'; s.turn=null;
  s.notice=`🍉 ${s.round}/${ROUNDS}라운드 — 판매자끼리 이야기 나눠요`; s.log.push(`🍉 ${s.round}라운드`);
  const talkers=U.shuffle(ALL.filter(i=>!isH(i))).filter(i=>Math.random()<.3+P(s,i).talk*.6).slice(0,4);
  talkers.forEach(i=>s.q.push({k:'talk',i})); npcWhisper(s); if(s.round===ROUNDS){ const t=ALL.find(i=>!isH(i)); s.q.push({k:'end',i:t}); } s.q.push({k:'submit'}); }
/* NPC 판단: 같은 과일 판매자들이 몇을 낼지 — 약속·지난 배신 기억·남은 라운드로 예측 */
function predict(s,i,j,f){ const pc=pactOf(s,i,f); if(pc&&(pc.a===j||pc.b===j)) return Math.random()<.8?pc.price:pc.price-1; const p=P(s,i), pr=s.props.find(x=>x.f===f&&x.by===j); const sus=s.sus[i][j]; const lateness=s.round===ROUNDS?.35:0;
  const coop=Math.max(.05,Math.min(.97,(pr?.88:.74)*(.75+p.trust*.4)-sus*.45-lateness));
  return Math.random()<coop ? 5 : (Math.random()<.6?4:3); }
function bestPrice(s,i,f,lvl){ const others=sellers(s,f).filter(j=>j!==i), n=sellers(s,f).length, p=P(s,i); if(lvl===0){ const burned=others.some(j=>s.sus[i][j]>.5); return burned?(Math.random()<.5?4:3):(s.round===ROUNDS&&Math.random()<.3?4:5); } const K=lvl===2?60:lvl===1?30:8;
  const promised=s.props.some(x=>x.by===i&&x.f===f); const left=ROUNDS-s.round;
  let best=5, bv=-1e9;
  for(let c=1;c<=5;c++){ let e=0; for(let k=0;k<K;k++){ const o=others.map(j=>predict(s,i,j,f)); const mn=Math.min(c,...o); if(c>mn) continue; const tie=1+o.filter(x=>x===mn).length; e+=c*n/tie; }
    e/=K; if(c<5&&promised) e-= (1.5+left*1.5)*(1-p.bluff*.7); if(c<5) e-= left*3.2*(1-p.aggr*.45); if(lvl===0) e+=(Math.random()-.5)*4; if(e>bv){ bv=e; best=c; } }
  return best; }
function act(s,i,a){
  if(a.k==='prop'){ if(s.phase!=='talk'&&s.phase!=='submit') return '지금은 말할 수 없어요'; const f=a.f|0; if(!s.own[i].includes(f)) return '내 과일만'; if(s.props.some(x=>x.by===i&&x.f===f)) return '이미 말했어요';
    s.props.push({by:i,f}); s.log.push(`🤝 ${nm(i)}: "${FR[f]}${FN[f]} 다 같이 5천 원 해요"`); return null; }
  if(a.k==='ready'){ if(s.phase!=='disc') return '지금은 아니에요'; if(s.q.length) return '아직 이야기 중이에요'; s.dready[pOf(i)]=true; return null; }
  if(a.k==='say'){ if(s.phase!=='disc') return '토론 시간이 아니에요'; const p=pOf(i); if(s.dsaid[p]>=3) return '이번엔 충분히 말했어요'; const R=s.res[s.round]||{};
    if(a.what==='keep'||a.what==='confess'){ s.dsaid[p]++; s.dready[p]=false;
      if(a.what==='keep'){ const lie=s.own[i].some(f=>s.price[i][f]<5); talkT(s,i,'🙋 저는 이번에 다 5천 냈어요. 약속 지켰어요.','claim');
        /* 둘뿐인 과일에서 독식이 났는데 상대가 못 받았다면 → 거짓말이 바로 들통 */
        const caught=soloFruits(s).find(f=>sellers(s,f).length===2&&sellers(s,f).includes(i)&&R[f].win.includes(i)); const o=caught!=null?sellers(s,caught).find(j=>j!==i):null;
        if(o!=null&&!isH(o)){ s.q.push({k:'d',i:o,kind:'acc_only',t:i,f:caught}); }
        else { const L=ALL.find(j=>!isH(j)&&j!==i&&Math.random()<.5); if(L!=null){ s.q.push({k:'d',i:L,kind:s.sus[L][i]>.4?'claimQ':'claimOK',t:i}); if(!lie) ALL.forEach(j=>{ if(!isH(j)) s.sus[j][i]-=.2; }); } } }
      else { talkT(s,i,'🙇 솔직히 말할게요. 제가 깎았어요. 미안해요.','confess'); ALL.forEach(j=>{ if(!isH(j)) s.sus[j][i]+=.6; }); const h=ALL.find(j=>!isH(j)&&s.own[j].some(f=>s.own[i].includes(f))); if(h!=null) s.q.push({k:'d',i:h,kind:P(s,h).temper>.5?'angry':'forgive',t:i}); }
      return null; }
    const t=a.t; if(typeof t!=='number'||t===i||!(t>=0&&t<N)) return '대상을 고르세요'; s.dsaid[p]++; s.dready[p]=false;
    if(a.what==='ask'){ const f=s.own[t].find(f=>s.own[i].includes(f))??soloFruits(s).find(f=>s.own[t].includes(f)); talkT(s,i,f!=null?`❓ ${nm(t)}, ${FR[f]}${FN[f]} 몇 냈어요?`:`❓ ${nm(t)}, 이번에 몇 냈어요?`,'ask',t); beat(s,{k:'d',i,kind:'ask',t,f,text:'_'}); return null; }
    if(a.what==='out'){ const pc=s.pact.find(x=>x.broken===t&&(x.a===i||x.b===i)); if(!pc) return '깨진 몰래 약속이 없어요'; talkT(s,i,`📢 다들 들어요. ${nm(t)}이(가) 저랑 몰래 ${FR[pc.f]}${FN[pc.f]} ${pc.price}천 약속해 놓고 깼어요!`,'outed',t); beat(s,{k:'d',i,kind:'outed',t,f:pc.f,text:'_'}); return null; }
    /* 지목: 공개된 근거를 자동으로 붙임 */
    const f=soloFruits(s).find(f=>sellers(s,f).includes(i)&&sellers(s,f).includes(t)&&!R[f].win.includes(i));
    const kind= f==null?'acc_none' : sellers(s,f).length===2?'acc_only' : s.props.some(x=>x.by===t&&x.f===f)?'acc_broke':'acc_sus';
    const txt= f==null ? `🤨 ${nm(t)}, 좀 수상해요.` : kind==='acc_only' ? `🤨 ${FR[f]}${FN[f]} 판매자는 저랑 ${nm(t)}뿐이에요. 저는 못 받았어요. ${nm(t)}, 깎았죠?` : kind==='acc_broke' ? `🤨 ${nm(t)}, ${FR[f]}${FN[f]} 다 같이 5천 하자더니 독식이 나왔네요?` : `🤨 ${FR[f]}${FN[f]} 독식, 저는 못 받았어요. ${nm(t)} 쪽 같아요.`;
    talkT(s,i,txt,kind,t); beat(s,{k:'d',i,kind,t,f:f??null,text:'_'});
    return null; }
  if(a.k==='dm'){ if(s.phase!=='talk'&&s.phase!=='submit') return '귓속말은 라운드 시작 때만'; if(s.sub[i]) return '이미 냈어요'; if(s.wh[i]===s.round) return '귓속말은 라운드당 한 번이에요';
    const t=a.t, f=a.f|0; if(typeof t!=='number'||isH(t)||!s.own[t]||!s.own[t].includes(f)||!s.own[i].includes(f)) return '같은 과일 판매자를 고르세요';
    const kind=a.kind==='cartel'?'cartel':'pact5'; if(kind==='cartel'&&sellers(s,f).length<3) return '담합은 판매자가 셋일 때만'; s.wh[i]=s.round;
    dmPush(s,i,i,`(→ ${nm(t)}) ${FR[f]}${FN[f]} ${kind==='cartel'?'우리 둘이 몰래 4천 맞춰요. 나머지는 빼고 🤫':'우리 둘은 무조건 5천 지켜요 🤝'}`,{mine:1});
    if(npcAccepts(s,t,i,kind)){ s.pact.push({a:t,b:i,f,price:kind==='cartel'?4:5,r:s.round,kind}); dmPush(s,i,t,U.pick(['좋아요, 둘만 아는 거예요 🤫','콜! 약속이에요.'])); }
    else dmPush(s,i,t,U.pick(['음… 그냥 각자 할게요.','미안해요, 아직 못 믿겠어요.']));
    return null; }
  if(a.k==='dmReply'){ const m=(s.dm[i]||[]).find(x=>x.id===a.id&&x.state==='open'); if(!m) return '이미 답했어요'; if(s.sub[i]) return '이미 냈어요'; m.state=a.yes?'yes':'no';
    if(a.yes){ s.pact.push({a:m.from,b:i,f:m.f,price:m.kind==='cartel'?4:5,r:s.round,kind:m.kind}); dmPush(s,i,m.from,'좋아요. 약속 지켜요 🤫'); } else { s.sus[m.from][i]+=.2; dmPush(s,i,m.from,'…알겠어요.'); } return null; }
  if(a.k==='sub'){ if(s.phase!=='submit') return '지금은 낼 때가 아니에요'; if(s.sub[i]) return '이미 냈어요'; const pr=a.p||{};
    for(const f of s.own[i]){ const v=pr[f]|0; if(v<1||v>5) return '1~5천 원 사이로'; }
    if(a.item){ if(!s.item[i]) return '아이템은 이미 썼어요'; if(a.item.k==='secret'){ const f=a.item.f|0; if(!(f>=0&&f<6)) return '과일을 고르세요'; s.secret[f]=true; s.item[i]=false; }
      else if(a.item.k==='swap'){ const from=a.item.from|0, to=a.item.to|0; if(!s.own[i].includes(from)||s.own[i].includes(to)||!(to>=0&&to<6)) return '바꿀 과일을 고르세요'; s.own[i]=s.own[i].map(x=>x===from?to:x); s.item[i]=false; s.log.push(`🔁 ${nm(i)}: ${FR[from]} → ${FR[to]} 판매권 교체`); s.price[i]={}; pr[to]=pr[from]; } }
    for(const f of s.own[i]) s.price[i][f]=pr[f]|0; s.sub[i]=true; return null; }
  return '알 수 없는 동작'; }
function apply(s,p,a){ syncH(s); if(s.winner!=null) return '게임이 끝났어요'; if(!a) return '알 수 없는 동작'; const e=act(s,HSEAT[p],a); if(!e) s.ev++; return e; }
function stepDelay(s){ syncH(s); if(s.winner!=null) return null;
  if(s.phase==='intro') return 2200; if(s.q.length){ const k=s.q[0].k; return k==='talk'||k==='end'?2000 : k==='rf'?1500 : 500; }
  if(s.phase==='submit'){ if(s.sub.every(Boolean)) return 600; return ALL.some(i=>!isH(i)&&!s.sub[i])?600+Math.random()*800:null; }
  if(s.phase==='disc'){ if(s.q.length){ const e=s.q[0]; return 2300+Math.min(2000,((e.text||'').length||30)*35); } return s.dready.every(Boolean)?700:null; }
  if(s.phase==='rend') return 2600; if(s.phase==='final') return 2600; return null; }
function step(s){
  if(s.phase==='intro'){ startRound(s); s.ev++; return; }
  if(s.q.length){ const e=s.q.shift();
    if(e.k==='talk'){ const i=e.i; const f=U.pick(s.own[i]); const bad=ALL.filter(j=>j!==i&&s.sus[i][j]>.6); if(bad.length&&Math.random()<.5){ say(s,i,'acc',s.own[i][0]); } else { act(s,i,{k:'prop',f}); say(s,i,'prop',f); } }
    else if(e.k==='end') say(s,e.i,'end');
    else if(e.k==='submit'){ s.phase='submit'; s.notice='🗳️ 딜러 룸 — 내 과일마다 희망가를 몰래 내세요'; }
    else if(e.k==='rf') revealFruit(s,e.f);
    s.ev++; return; }
  if(s.phase==='submit'){ const npc=ALL.find(i=>!isH(i)&&!s.sub[i]); if(npc!=null){ const pr={}; for(const f of s.own[npc]){ pr[f]=bestPrice(s,npc,f,1); const pc=pactOf(s,npc,f); if(pc){ pc.kept=pc.kept||{}; pc.kept[npc]=keepsPact(s,npc,pc); pr[f]=pc.kept[npc]?pc.price:Math.max(1,pc.price-1); } }
      let item=null; if(s.item[npc]&&s.own[npc].some(f=>pr[f]<5)&&Math.random()<.4+P(s,npc).bluff*.4) item={k:'secret',f:s.own[npc].find(f=>pr[f]<5)};
      act(s,npc,{k:'sub',p:pr,item}); s.log.push(`🗳️ ${nm(npc)} 제출`); s.ev++; return; }
    if(s.sub.every(Boolean)){ s.phase='reveal'; s.res[s.round]={}; [0,1,2,3,4,5].forEach(f=>s.q.push({k:'rf',f})); s.q.push({k:'rend'}); s.notice='🔓 과일별 결과를 공개합니다'; s.ev++; } return; }
  if(s.phase==='rend'){ s.hist.push(s.res[s.round]); if(s.round<ROUNDS){ startRound(s); s.ev++; return; } s.phase='final'; const r=ALL.slice().sort((a,b)=>s.tot[b]-s.tot[a]); s.notice=`🏁 최종 누적 수입 — ${r.map((i,k)=>`${k+1}. ${nm(i)} ${s.tot[i]*1000}원`).join(' · ')}`; s.log.push(s.notice); s.ev++; return; }
  if(s.phase==='final'){ s.phase='over'; const a=s.tot[HSEAT[0]], b=s.tot[HSEAT[1]]; s.winner=a>b?0:b>a?1:'both'; { const mx=Math.max(...HSEAT.map(h=>s.tot[h])); s.winners=HSEAT.map((h,p)=>s.tot[h]===mx?p:-1).filter(x=>x>=0); } s.ev++; return; }
}
/* rend 큐 처리 */
const _step=step;
function stepAll(s){ syncH(s); if(s.q.length&&s.q[0].k==='rend'){ s.q.shift(); discuss(s); s.ev++; return; }
  if(s.phase==='disc'){ if(s.q.length){ beat(s,s.q.shift()); s.ev++; return; } if(s.dready.every(Boolean)){ s.phase='rend'; s.ev++; } return; }
  return _step(s); }
/* 이번 라운드 공개 결과에서 의심거리 찾기 (그 자리에서 보이는 것만) */
function soloFruits(s){ const R=s.res[s.round]||{}; return [0,1,2,3,4,5].filter(f=>{ const x=R[f]; return x&&!x.none&&!x.secret&&x.w===1&&x.n>1; }); }
function discuss(s){ s.phase='disc'; s.notice='💬 결과를 두고 한마디씩 — 다 들었으면 "다음 라운드로"'; const R=s.res[s.round]; const q=[];
  /* 몰래 약속 확인: 깬 쪽을 짐작해 폭로 */
  for(const pc of s.pact.filter(p=>p.r===s.round)){ const x=R[pc.f]; if(!x||x.none) continue; for(const [me,ot] of [[pc.a,pc.b],[pc.b,pc.a]]){ const broke=s.price[ot][pc.f]<pc.price, iKept=s.price[me][pc.f]>=pc.price;
      if(!broke||!iKept) continue; pc.broken=ot;
      if(isH(me)) dmPush(s,me,ot,`💔 ${FR[pc.f]}${FN[pc.f]} 판매가 ${x.price}천 — 몰래 한 ${pc.price}천 약속이 깨졌어요${sellers(s,pc.f).length===2?' (둘뿐이니 확실해요)':''}`,{state:'bad'});
      else { const others=sellers(s,pc.f).filter(j=>j!==me); if(others.length===1||Math.random()<.6) q.push({k:'d',i:me,kind:'outed',t:ot,f:pc.f,p:pc.price}); } }
    if(pc.kind==='cartel'){ const third=sellers(s,pc.f).filter(j=>j!==pc.a&&j!==pc.b); if(!pc.broken&&third.length&&!isH(third[0])&&x.price<5&&Math.random()<.4) q.push({k:'d',i:third[0],kind:'cartelHurt',f:pc.f}); } }
  /* ⚡ 독식: 못 받은 판매자가 근거를 대고 지목 */
  for(const f of soloFruits(s)){ const sl=sellers(s,f), x=R[f]; const acc=sl.filter(i=>!isH(i)&&!x.win.includes(i)&&!q.some(e=>e.i===i)).sort((a,b)=>P(s,b).temper+P(s,b).talk-P(s,a).temper-P(s,a).talk)[0];
    /* 독식한 쪽이 먼저 남을 찍어 연막(뻥이 센 사람) */
    const w=x.win[0]; if(!isH(w)&&P(s,w).bluff>.6&&Math.random()<.35){ const t=sl.filter(j=>j!==w)[0]; if(t!=null){ q.push({k:'d',i:w,kind:sl.length===2?'acc_only':'acc_sus',t,f}); continue; } }
    if(acc==null) continue; const cand=sl.filter(j=>j!==acc); const t=cand.sort((a,b)=>s.sus[acc][b]-s.sus[acc][a])[0];
    const kind= cand.length===1?'acc_only' : s.props.some(p=>p.by===t&&p.f===f)?'acc_broke' : s.sus[acc][t]>.4?'acc_sus':'ask';
    q.push({k:'d',i:acc,kind,t,f}); }
  /* 다 같이 지킨 과일·다 같이 깎은 과일엔 짧은 반응 */
  for(const f of [0,1,2,3,4,5]){ const x=R[f]; if(!x||x.none||x.secret||q.length>=5) continue; const sl=sellers(s,f).filter(j=>!isH(j)); if(!sl.length) continue;
    if(x.price===5&&x.w===x.n&&Math.random()<.5) q.push({k:'d',i:U.pick(sl),kind:'thanks',f});
    else if(x.price<5&&x.w>1&&Math.random()<.4) q.push({k:'d',i:U.pick(sl),kind:'allcut',f,p:x.price}); }
  s.q=q.slice(0,6); }
/* 한 마디 → 듣는 사람 의심 갱신 → 대답 끼워 넣기 */
function beat(s,e){ const i=e.i, R=s.res[s.round]||{}; if(isH(i)&&!e.text) return;
  if(e.text!=='_'){ const text=e.text||lineX(s,i,e.kind,{f:e.f,t:e.t,x:e.x,p:e.p}); if(!talkT(s,i,text,e.kind,e.t)) return; }
  const t=e.t;
  if(ACCK.includes(e.kind)&&t!=null){ ALL.forEach(L=>{ if(isH(L)||L===i||L===t) return; s.sus[L][t]+=(e.kind==='outed'?.8:e.kind==='acc_only'?.5:.3)*(.5+P(s,L).trust*.6); }); if(e.kind==='outed') s.sus[t][i]+=.5; }
  if(e.kind==='confess'){ ALL.forEach(L=>{ if(!isH(L)&&L!==i) s.sus[L][i]+=1; }); }
  if(e.kind==='nervous'){ s.tell=s.tell||{}; s.tell[i]=s.round; ALL.forEach(L=>{ if(!isH(L)&&L!==i) s.sus[L][i]+=.3+P(s,L).logic*.4; }); }
  /* 지목·질문을 받은 NPC의 대답 */
  if((ACCK.includes(e.kind)||e.kind==='ask'||e.kind==='acc_none')&&t!=null&&!isH(t)&&e.kind!=='sweat'){ const p=P(s,t), f=e.f, x=f!=null?R[f]:null;
    const guilty= e.kind==='outed' ? true : !!(x&&x.win&&x.win.includes(t)&&x.w===1);
    const others=f!=null?sellers(s,f).filter(j=>j!==t&&j!==i):[]; const dx=others.length?others.sort((a,b)=>s.sus[t][b]-s.sus[t][a])[0]:null;
    let r;
    if(e.kind==='outed') r={kind:Math.random()<(1-p.bluff)*.5?'confess':'denyOut',t:i,f};
    else if(f==null) r={kind:'reb_none',t:i};
    else if(guilty){ const u=Math.random(); r= u<(1-p.bluff)*.4?{kind:'confess',f} : u<(1-p.bluff)*.85?{kind:'nervous',f} : e.kind==='ask'?{kind:'ansLie',f} : dx!=null?{kind:'deny',x:dx,f}:{kind:'deny2',t:i,f}; }
    else if(e.kind==='ask') r={kind:'ansOK',f};
    else r= dx!=null&&Math.random()<.6?{kind:'deny',x:dx,f}:{kind:'deny2',t:i,f};
    s.q.unshift(Object.assign({k:'d',i:t},r));
    /* 당황하면 눈치 빠른 사람이 짚음 */
    if(r.kind==='nervous'){ const w=ALL.filter(j=>!isH(j)&&j!==t&&P(s,j).logic>.6)[0]; if(w!=null&&Math.random()<.6) s.q.splice(1,0,{k:'d',i:w,kind:'sweat',t}); }
    /* 고백엔 성격대로 용서 또는 화 */
    if(r.kind==='confess'){ const h=ALL.find(j=>!isH(j)&&j!==t&&f!=null&&s.own[j].includes(f)); if(h!=null) s.q.splice(1,0,{k:'d',i:h,kind:P(s,h).temper>.5?'angry':'forgive',t}); } }
}
function revealFruit(s,f){ const sl=sellers(s,f); if(!sl.length){ s.res[s.round][f]={none:true}; return; } const pr=sl.map(i=>s.price[i][f]); const mn=Math.min(...pr); const win=sl.filter(i=>s.price[i][f]===mn); const pot=mn*sl.length; const each=Math.floor(pot*1000/win.length)/1000;
  win.forEach(i=>s.tot[i]+=each); s.res[s.round][f]={price:mn,n:sl.length,w:win.length,each,win,secret:!!s.secret[f]};
  /* 내가 비싸게 냈는데 누가 싸게 팔았으면 같은 과일 판매자를 의심 */
  sl.forEach(i=>{ if(s.price[i][f]>mn){ const cand=sl.filter(j=>j!==i); cand.forEach(j=>{ s.sus[i][j]+= win.length/Math.max(1,cand.length); }); } });
  s.notice = s.secret[f] ? `🤫 ${FR[f]}${FN[f]} — 누군가 비밀 아이템을 썼어요 (결과 비공개)` : `${FR[f]}${FN[f]} 판매가 ${mn}천 원 · 판매자 ${sl.length}명 중 ${win.length}명이 받음${win.length===1&&sl.length>1?' — 독식!':''} (1명당 ${(each*1000).toLocaleString()}원)`; s.log.push(s.notice); }
function mask(s,p){ syncH(s); const v=U.clone(s), me=HSEAT[p], open=s.phase==='over'||s.phase==='final';
  if(!open){ v.tot=s.tot.map((t,i)=>i===me?t:null); v.price=s.price.map((x,i)=>i===me?x:{}); v.sus=null;
    v.res=s.res.map(r=>{ if(!r) return r; const o={}; for(const f in r){ const x=r[f]; o[f]= x.secret ? {secret:true, mine: x.win&&x.win.includes(me)?x.each:null, sold:s.own[me].includes(+f)} : {price:x.price,n:x.n,w:x.w,each:x.each,mineWin:x.win?x.win.includes(me):false,none:x.none}; } return o; });
    v.hist=v.res.filter(Boolean); }
  v.q=s.q.map(()=>null); v.used={}; v.dm={[me]:s.dm[me]||[]}; v.pact=s.pact.filter(p=>p.a===me||p.b===me).map(p=>Object.assign({},p,{kept:undefined})); return v; }
function ai(v,lvl){ syncH(v); const i=HSEAT[1]; lvl=lvl==null?1:lvl;
  if(v.phase==='disc'){ if(!v.q.length&&!v.dready[1]) return {k:'ready'}; return null; }
  if((v.phase==='talk'||v.phase==='submit')&&!v._propd&&Math.random()<.3&&!v.props.some(x=>x.by===i)) return {k:'prop',f:U.pick(v.own[i])};
  if(v.phase==='submit'&&!v.sub[i]){ const s=Object.assign({},v,{sus:ALL.map(()=>Array(N).fill(0))}); const pr={}; for(const f of v.own[i]) pr[f]=bestPrice(s,i,f,lvl); return {k:'sub',p:pr}; }
  return null; }
function aiDelay(){ return 2000+Math.random()*2500; }

/* 화면 */
let WHO={}, pr={}, itemSel=null, sig='', dMode=null, lastDm=0, lastSay=0;
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}/g,(_,d)=>`${seatEmoji(+d)} ${seatName(+d,ctx)}`); }
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{}; const me=HSEAT[ctx.me]; const sg=v.round+':'+v.phase; if(sg!==sig){ sig=sg; pr={}; (v.own[me]||[]).forEach(f=>pr[f]=5); itemSel=null; dMode=null; }
  if(v.say&&v.say.n!==lastSay){ if(lastSay&&ctx.sfx) ctx.sfx('tick'); lastSay=v.say.n; }
  let h=`<div class="hl-notice">${fill(U.esc(v.notice||''),ctx)}</div>`;
  const pk=i=>(v.pact||[]).filter(p=>p.r===v.round&&(p.a===i||p.b===i)&&(p.a===me||p.b===me)&&i!==me)[0];
  h+=`<div class="fs-seats">${ALL.map(i=>{ const sp=v.say&&v.say.seat===i, tg=v.say&&v.say.t===i&&['acc_only','acc_broke','acc_sus','acc_none','sweat','outed'].includes(v.say.kind), md=v.mood&&v.mood[i], pc=pk(i), pick=dMode&&i!==me;
    return `<div class="fs-seat ${sp?'speak':''} ${tg?'tgt':''} ${isH(i)&&pOf(i)===ctx.me?'me':''} ${pick?'pick':''}" data-seat="${i}">${md&&!isH(i)?`<span class="kg-mood ${sp?'pop':''}">${md.e}</span>`:''}${pc?`<span class="fs-pact">${pc.broken!=null?'💔':'🤫'}</span>`:''}<div class="fs-face">${seatEmoji(i)}</div><div class="fs-nm">${seatName(i,ctx)}</div><div class="fs-own">${v.own[i].map(f=>FR[f]).join('')}</div></div>`; }).join('')}</div>`;
  { const feed=(v.feed||[]).filter(x=>x.r===v.round).slice(-3); h+=`<div class="vr-feed fs-feed">${feed.map((x,k)=>`<div class="${k===feed.length-1?'new':''}"><span class="w">${seatEmoji(x.seat)} ${seatName(x.seat,ctx)}</span> ${fill(U.esc(x.text),ctx)}</div>`).join('')||'<div class="empty">아직 조용해요</div>'}</div>`; }
  h+=`<div class="info">${Math.max(1,v.round)}/${ROUNDS}라운드 · 내 과일 ${v.own[me].map(f=>FR[f]+FN[f]).join(' · ')} · 내 누적 <b>${(v.tot[me]*1000).toLocaleString()}원</b> · 아이템 ${v.item[me]?'있음':'썼음'}</div>`;
  h+=`<div class="fs-stalls">${[0,1,2,3,4,5].map(f=>{ const sl=sellers(v,f); const last=v.res[v.round]&&v.res[v.round][f]; const mine=v.own[me].includes(f);
      return `<div class="fs-stall ${mine?'mine':''}"><div class="fs-f">${FR[f]}<b>${FN[f]}</b></div><div class="fs-sl">${sl.map(i=>seatEmoji(i)).join('')}</div><small>판매자 ${sl.length}명${v.props.some(x=>x.f===f)?` · 🤝 ${v.props.filter(x=>x.f===f).map(x=>seatEmoji(x.by)).join('')}`:''}</small>
      ${last?(last.secret?`<div class="fs-r sec">🤫 비공개${last.mine!=null?` · 내가 ${(last.mine*1000).toLocaleString()}원`:''}</div>`:last.none?'':`<div class="fs-r ${last.w===1&&last.n>1?'solo':''}">${last.price}천 원 · ${last.w}/${last.n}명${last.mineWin?' · 💰나':''}</div>`):''}</div>`; }).join('')}</div>`;
  if(v.phase==='talk'||v.phase==='submit'){ const mineProps=v.own[me].filter(f=>!v.props.some(x=>x.by===me&&x.f===f)); if(mineProps.length) h+=`<div class="t13-say">🤝 제안: ${mineProps.map(f=>`<button class="ghost" data-pp="${f}">${FR[f]} 다 같이 5천 원!</button>`).join(' ')}</div>`; }
  if(v.phase==='submit'&&!v.sub[me]){
    h+=`<div class="vr-card"><b>🗳️ 희망가</b> <small>최저가를 낸 사람이 '판매가 × 판매자 수'를 받아요</small>${v.own[me].map(f=>`<div class="fs-row">${FR[f]}${FN[f]} (판매자 ${sellers(v,f).length}명) ${[1,2,3,4,5].map(c=>`<button class="${pr[f]===c?'':'ghost'}" data-f="${f}" data-c="${c}">${c}천</button>`).join('')}</div>`).join('')}
      ${v.item[me]?`<div class="fs-row"><small>아이템(한 번):</small> <select data-it><option value="">안 씀</option>${[0,1,2,3,4,5].map(f=>`<option value="s${f}" ${itemSel==='s'+f?'selected':''}>🤫 비밀 — ${FR[f]}${FN[f]} 결과 숨기기</option>`).join('')}${v.own[me].flatMap(a=>[0,1,2,3,4,5].filter(b=>!v.own[me].includes(b)).map(b=>`<option value="w${a}-${b}" ${itemSel==='w'+a+'-'+b?'selected':''}>🔁 교체 — ${FR[a]} → ${FR[b]}</option>`)).join('')}</select></div>`:''}
      <div class="fh-act"><button data-a="sub">제출</button></div></div>`; }
  else if(v.phase==='submit') h+=`<div class="vr-card"><small>제출 완료 — 기다리는 중 (${v.sub.filter(Boolean).length}/${N})</small></div>`;
  if(v.phase==='disc'){ const busy=v.q.length>0, no=v.dsaid[ctx.me]>=3?'disabled':''; const br=(v.pact||[]).filter(p=>p.broken!=null&&p.broken!==me&&(p.a===me||p.b===me));
    h+=`<div class="vr-card"><b>💬 결과 토론</b> <small>남은 발언 ${3-v.dsaid[ctx.me]}번 · 지목하면 공개된 근거(⚡ 독식·약속)가 자동으로 붙어요</small><div class="fh-act">
      <button class="${dMode==='acc'?'':'ghost'}" data-dm="acc" ${no}>🤨 지목</button><button class="${dMode==='ask'?'':'ghost'}" data-dm="ask" ${no}>❓ 몇 냈어요?</button>
      <button class="ghost" data-say="keep" ${no} title="뻥이어도 돼요 — 둘뿐인 과일이면 바로 들통날 수도">🙋 저 약속 지켰어요</button><button class="ghost" data-say="confess" ${no}>🙇 제가 깎았어요</button>
      ${br.map(p=>`<button class="ghost" data-out="${p.broken}" ${no}>📢 ${seatEmoji(p.broken)} 몰래 약속 깬 거 폭로</button>`).join('')}
      ${dMode?'<small>👆 위 자리에서 사람을 누르세요</small>':''}</div>
      <div class="fh-act">${busy?'<small>🗣️ 이야기 중…</small>':v.dready[ctx.me]?'<small>기다리는 중…</small>':'<button data-a="ready">다음 라운드로 →</button>'}</div></div>`; }
  if(!ctx.season){ const D=(v.dm&&v.dm[me]||[]).slice(-5), canW=(v.phase==='talk'||v.phase==='submit')&&!v.sub[me]&&v.wh[me]!==v.round; const newest=D.length?D[D.length-1].id:0, fresh=newest>lastDm; if(fresh&&lastDm&&ctx.sfx) ctx.sfx('host'); lastDm=newest;
    if(D.length||canW){ h+=`<div class="kg-dm fs-dm ${fresh?'slide':''}"><div class="kg-fh">🤫 귓속말 <small>나만 보여요 · 라운드당 한 번</small></div>${D.map(m=>`<div class="${m.state==='open'?'open':''} ${m.state==='bad'?'bad':''}">${m.mine?'<small>나</small> ':`<b>${seatEmoji(m.from)} ${seatName(m.from,ctx)}</b> `}${fill(U.esc(m.text),ctx)}${m.state==='open'&&!v.sub[me]?` <button class="small" data-dr="${m.id}:1">🤫 좋아요</button><button class="ghost small" data-dr="${m.id}:0">🙅 싫어요</button>`:''}</div>`).join('')}`;
      if(canW) h+=`<div class="fh-act">${v.own[me].map(f=>{ const co=sellers(v,f).filter(j=>j!==me&&!isH(j)); return co.map(j=>`<button class="ghost small" data-w="${j}:${f}:pact5">🤝 ${seatEmoji(j)} ${NPCI(j)[1]}${jo(NPCI(j)[1],'이랑','랑')} ${FR[f]} 5천 지키기</button>${sellers(v,f).length>=3?`<button class="ghost small" data-w="${j}:${f}:cartel" title="둘이 4천으로 맞추면 세 번째 판매자를 빼고 둘이 나눠요 — 배신당하면 독식당함">🤫 ${seatEmoji(j)} ${NPCI(j)[1]}${jo(NPCI(j)[1],'이랑','랑')} ${FR[f]} 둘이 4천</button>`:''}`).join(''); }).join('')}</div>`;
      h+='</div>'; } }
  if(v.phase==='over') h+=`<div class="sn-score">${ALL.slice().sort((a,b)=>v.tot[b]-v.tot[a]).map((i,k)=>`<div class="${isH(i)?'h':''}"><b>${k+1}. ${seatEmoji(i)} ${seatName(i,ctx)}</b> ${(v.tot[i]*1000).toLocaleString()}원</div>`).join('')}</div>`;
  const R=U.chat(v.feed,{emo:seatEmoji,name:i=>seatName(i,ctx),fill:t=>fill(t,ctx),me})+`<div class="side-box side-log"><div class="side-h">📜 진행 기록 <small>최근이 위</small></div>${v.log.slice(-70).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  const L=U.politics(v.feed,{seats:ALL,emo:seatEmoji,name:i=>seatName(i,ctx),me,pacts:[...new Map((v.pact||[]).filter(p=>p.a===me||p.b===me).map(p=>[[p.a,p.b].sort().join('-'),[p.a,p.b,p.broken!=null]])).values()]})+`<div class="side-box"><div class="side-h">📊 지난 라운드</div>${v.hist.map((r,k)=>`<div class="side-row" style="flex-wrap:wrap"><small>${k+1}R</small> ${[0,1,2,3,4,5].map(f=>r[f]?(r[f].secret?`${FR[f]}🤫`:`${FR[f]}${r[f].price}${r[f].w===1&&r[f].n>1?'⚡':''}`):'').join(' ')}</div>`).join('')||'<div class="side-row"><small>-</small></div>'}<small>⚡ = 혼자 독식</small></div>`;
  el.innerHTML=`<div class="side3 has-chat"><div class="side-mid">${h}</div><aside class="side-l">${L}</aside><aside class="side-r">${R}</aside></div>`;
  el.onchange=e=>{ if(e.target.matches('[data-it]')){ itemSel=e.target.value||null; } };
  el.onclick=e=>{ const pp=e.target.closest('[data-pp]'); if(pp) return ctx.act({k:'prop',f:+pp.dataset.pp});
    const dm=e.target.closest('[data-dm]'); if(dm&&!dm.disabled){ dMode=dMode===dm.dataset.dm?null:dm.dataset.dm; return ctx.rerender(); }
    const st=e.target.closest('[data-seat]'); if(st&&dMode){ const t=+st.dataset.seat; if(t===me) return; const k=dMode; dMode=null; return ctx.act({k:'say',what:k,t}); }
    const sy=e.target.closest('[data-say]'); if(sy&&!sy.disabled) return ctx.act({k:'say',what:sy.dataset.say});
    const ou=e.target.closest('[data-out]'); if(ou&&!ou.disabled) return ctx.act({k:'say',what:'out',t:+ou.dataset.out});
    const dr=e.target.closest('[data-dr]'); if(dr){ const [id,y]=dr.dataset.dr.split(':'); return ctx.act({k:'dmReply',id:+id,yes:y==='1'}); }
    const w=e.target.closest('[data-w]'); if(w){ const [t,ff,k]=w.dataset.w.split(':'); return ctx.act({k:'dm',t:+t,f:+ff,kind:k}); }
    const b=e.target.closest('[data-c]'); if(b){ pr[+b.dataset.f]=+b.dataset.c; return ctx.rerender(); }
    const a=e.target.closest('[data-a]'); if(a&&a.dataset.a==='ready') return ctx.act({k:'ready'});
    if(a&&a.dataset.a==='sub'){ let item=null; if(itemSel){ if(itemSel[0]==='s') item={k:'secret',f:+itemSel.slice(1)}; else { const [x,y]=itemSel.slice(1).split('-').map(Number); item={k:'swap',from:x,to:y}; } } return ctx.act({k:'sub',p:Object.assign({},pr),item}); } };
}
function status(v,ctx){ syncH(v); const me=HSEAT[ctx.me]; if(v.phase==='over') return ''; if(v.phase==='disc') return v.q.length?'토론 중…':v.dready[ctx.me]?'기다리는 중…':'한마디 하거나 "다음 라운드로"'; if(v.phase==='submit'&&!v.sub[me]) return '희망가를 내세요'; return '진행 중…'; }
const guide=`
<p><b>같이 비싸게? 혼자 싸게?</b> — 8인(우리 둘 + 성격 다른 컴퓨터 6명).</p>
<ol><li>과일 6종, 각자 <b>2종의 판매권</b>. 같은 과일을 2~3명이 함께 팔아요.</li>
<li>라운드마다 내 과일의 <b>희망가</b>(1~5천 원)를 몰래 내요. 과일 판매가 = 판매자 중 <b>최저가</b>.</li>
<li>최저가를 낸 사람이 <b>판매가 × 판매자 수</b>를 받아요(여럿이면 나눔). 다 같이 5천 원이면 나눠 갖고, 혼자 4천 원이면 <b>독식</b>!</li>
<li>결과는 과일별 판매가·몇 명이 받았는지만 공개 — <b>누가 받았는지, 누적 수입은 비밀</b>.</li>
<li>아이템 한 번: 🤫 비밀(한 과일 결과 숨김) / 🔁 교체(내 과일 하나 바꾸기, 공개). ${ROUNDS}라운드 누적 1위 우승.</li></ol>
<div class="tipbox">💡 <b>팁</b><br>· 약속(🤝)을 지키는지 판매가로 짐작할 수 있어요 — ⚡ 독식이 나오면 누군가 배신!<br>· 마지막 라운드는 다들 배신하고 싶어져요.</div>`;
const guideSteps=[
  {t:'🍎 판매권 두 개', h:'각자 과일 <b>2종</b>을 팔아요. 같은 과일을 2~3명이 함께.', demo:s=>{ s.round=0; startRound(s); s.q=[]; s.phase='submit'; return s; }},
  {t:'🗳️ 최저가가 판매가', h:'희망가 중 <b>최저가</b>가 판매가. 최저가를 낸 사람이 <b>판매가 × 판매자 수</b>를 받아요.', demo:s=>{ s.round=0; startRound(s); s.q=[]; s.res[1]={0:{price:5,n:3,w:3,each:5,win:[]},1:{price:4,n:3,w:1,each:12,win:[]}}; s.phase='rend'; return s; }},
  {t:'🤝 약속과 배신', h:'"다 같이 5천 원!" 약속은 자유 — 지키는지는 몰라요. 결과로 짐작하세요(⚡ 독식).', demo:s=>{ s.round=0; startRound(s); s.q=[]; s.props=[{by:1,f:0},{by:2,f:1}]; s.phase='talk'; return s; }},
  {t:'💬 결과 토론', h:'⚡ 독식이 나오면 못 받은 판매자가 <b>근거를 대고</b> 지목해요. 의심받은 사람은 부인·떠넘기기·고백, 거짓말이 서툴면 😅 당황. 나도 🤨 지목·❓ 몇 냈어요?·🙋 지켰어요(뻥 가능)·🙇 고백.', focus:'.fs-seats', demo:s=>{ s.round=0; startRound(s); s.q=[]; s.res[1]={1:{price:4,n:2,w:1,each:8,win:[2]}}; s.phase='disc'; s.feed=[{r:1,seat:3,text:'🍇포도 판매자는 저랑 {s2}뿐이에요. 저는 5천 냈어요. {s2}, 깎았죠?',t:2,kind:'acc_only'},{r:1,seat:2,text:'저, 저는 5천… 냈는데요? 😅',kind:'nervous'}]; s.say={seat:2,text:'저, 저는 5천… 냈는데요? 😅',n:1,kind:'nervous'}; s.mood={3:{e:'🤨',n:1},2:{e:'😅',n:2}}; return s; }},
  {t:'🤫 몰래 약속', h:'라운드 시작에 같은 과일 판매자에게 <b>귓속말</b> — 🤝 둘이 5천 지키기, 또는 🤫 <b>둘이 4천</b>으로 맞춰 세 번째 판매자를 빼기. 상대가 배신하면 💔, 결과 토론에서 📢 폭로할 수 있어요.', focus:'.fs-dm', demo:s=>{ s.round=0; startRound(s); s.q=[]; s.phase='submit'; s.dm={0:[{id:1,r:1,from:2,text:'🍎사과, 우리 둘이 몰래 4천 맞춰요. 나머지 한 명은 빼고 둘이 나눠요 🤫',state:'open',kind:'cartel',f:0}]}; s.dmN=1; return s; }},
  {t:'🏆 4라운드 누적', h:'누적 수입은 <b>비밀</b>. 4라운드 뒤 1위 우승!', demo:s=>{ s.round=4; s.tot=[30,25,18,22,27,15,20,24]; return s; }},
];
window.GAMES.fruitshop = { _sync:x=>syncH(x), maxH:8,
  title:'과일가게', ref:'더 지니어스 「과일가게」', emoji:'🍎', tags:['담합','배신','심리전','NPC','두뇌서바이벌'],
  tagline:'다 같이 비싸게 팔면 모두가 웃고, 혼자 싸게 팔면 혼자 웃는다 — 판매자들의 눈치 싸움.',
  guide, guideSteps, init, apply, mask, ai, aiDelay, render, status, step:stepAll, stepDelay, noPersona:true, wide:true,
  reset(){ pr={}; itemSel=null; sig=''; dMode=null; lastDm=0; lastSay=0; },
  bar:(v,i)=>`<span class="tag">${v.tot[HSEAT[i]]!=null?(v.tot[HSEAT[i]]*1000).toLocaleString()+'원':'?'}</span>`,
  result:(v,ctx)=>`${(v.tot[HSEAT[ctx.me]]*1000).toLocaleString()}원`,
  _bestPrice:bestPrice, _H:HSEAT,
};
})();
