(function(){
'use strict';
/* 크리미널 메모리 (피의 게임 시즌 3 · 8일차 메인 매치) — 3:3 팀전(우리 둘이 각 팀 대표 + 팀마다 NPC 2명).
   사건 개요 → 단서 8장을 팀원끼리 나눠 30초 동안 봄(필기 금지) → 단서가 덮이고 팀원끼리 기억을 말해 공유(NPC는 성격 따라 잘못 기억할 수도).
   질문 5개를 1번부터 순서대로 답함(앞을 맞혀야 다음이 열림). 틀리면 우리 팀은 30초 동안 못 답함. 먼저 5번까지 맞힌 팀 승리. */
/* 👥 N명 (2026-11-12) — 사람 자리는 두 팀에 번갈아(0,3,1,4,2,5), 같은 팀 사람은 누구나 답할 수 있음 */
const N=6; let HSEAT=[0,3]; const SEATORD=[0,3,1,4,2,5]; const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; }; const VIEW=30000, LOCK=30000;
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i), ALL=[...Array(N).keys()], TEAM=i=>i<3?0:1, MATES=t=>t?[3,4,5]:[0,1,2];
const nm=i=>`{s${i}}`;
/* 사건 — 단서(t: 원문, f: 잘못 기억한 버전), 질문(o: 보기, a: 정답, need: 필요한 단서, w: 잘못 기억했을 때 고르기 쉬운 오답) */
const CASES=[
  {title:'미술관의 밤', story:'새벽 2시, 미술관 관장이 계단 아래에서 쓰러진 채 발견됐다. 명화 「푸른 새벽」도 사라졌다. 용의자는 경비원 오민석, 큐레이터 서지아, 복원가 김태오, 청소부 박영순.',
    clues:[
      {t:'경비실 기록: 오민석은 0시~3시 내내 경비실 CCTV에 찍혀 있었다.', f:'경비실 기록: 오민석은 1시쯤 경비실을 잠깐 비웠다.'},
      {t:'「푸른 새벽」 액자 뒤에서 복원용 장갑 한 짝. 이 장갑은 복원가와 큐레이터만 쓴다.', f:'액자 뒤에서 장갑 한 짝. 이 장갑은 경비원과 청소부만 쓴다.'},
      {t:'서지아는 1시에 퇴근 카드를 찍고 1시 10분에 택시를 탔다(영수증 있음).', f:'서지아는 2시 넘어 퇴근 카드를 찍었다.'},
      {t:'관장 손에 쥐어진 남색 작업복 단추. 남색 작업복은 복원가와 청소부만 입는다.', f:'관장 손에 회색 정장 단추. 회색 정장은 큐레이터만 입는다.'},
      {t:'관장이 떨어진 계단 위, 3층 복도에 젖은 발자국. 그날 밤 물청소는 3층만 했다.', f:'계단 위 2층 복도에 젖은 발자국. 그날 밤 물청소는 2층만 했다.'},
      {t:'김태오 진술: "밤새 2층 복원실에 있었다." 출입 기록엔 1시 40분에 복원실을 나간 기록.', f:'김태오 진술: "밤새 복원실에 있었다." 출입 기록도 그 말과 같다.'},
      {t:'박영순은 0시에 3층 물청소를 끝내고 0시 30분에 퇴근(출입 기록 확인).', f:'박영순은 새벽 2시쯤 퇴근했다.'},
      {t:'사라진 그림은 복원실 냉장 보관함 안, 비닐에 싸인 채 발견.', f:'사라진 그림은 3층 창고에서 발견.'},
    ],
    qs:[
      {q:'관장은 몇 층 계단에서 떨어졌나?', o:['1층','2층','3층','4층'], a:2, need:[4], w:1},
      {q:'범인은?', o:['경비원 오민석','큐레이터 서지아','복원가 김태오','청소부 박영순'], a:2, need:[1,3], w:1},
      {q:'범인의 거짓말은?', o:['밤새 복원실에 있었다','그림을 본 적 없다','관장을 만난 적 없다','3층에 간 적 없다'], a:0, need:[5], w:3},
      {q:'사라진 그림은 어디에?', o:['경비실','택시 안','3층 창고','복원실 냉장 보관함'], a:3, need:[7], w:2},
      {q:'범인을 가리킨 결정적 증거 두 가지는?', o:['택시 영수증 · CCTV','장갑 · 단추','젖은 발자국 · 출입 기록','그림 · 비닐'], a:1, need:[1,3], w:2},
    ]},
  {title:'야간열차 7호칸', story:'밤 11시 야간열차 7호칸. 사업가 나동훈의 객실 금고가 털렸고, 나동훈은 수면제에 취해 잠들어 있었다. 용의자는 승무원 이소라, 비서 정우진, 동업자 최한결, 승객 문다현.',
    clues:[
      {t:'나동훈은 10시에 식당칸에서 커피를 마셨다. 커피를 객실까지 가져다준 건 비서 정우진.', f:'나동훈은 10시에 커피를 마셨다. 커피를 가져다준 건 승무원 이소라.'},
      {t:'식당칸 직원: 그 커피를 탄 사람은 동업자 최한결. 정우진은 들고 가기만 했다.', f:'식당칸 직원: 그 커피를 탄 사람은 비서 정우진이었다.'},
      {t:'금고 비밀번호는 나동훈과 동업자 최한결만 안다.', f:'금고 비밀번호는 나동훈과 비서 정우진만 안다.'},
      {t:'문다현은 9시 50분 역에서 내렸다(하차 기록).', f:'문다현은 11시 넘어 역에서 내렸다.'},
      {t:'이소라는 11시~12시 3호칸에서 검표 중이었다(검표 기록에 시간이 찍힘).', f:'이소라는 11시쯤 7호칸 근처를 지나갔다.'},
      {t:'객실 문 센서: 11시 20분에 열림 기록.', f:'객실 문 센서: 10시 40분에 열림 기록.'},
      {t:'최한결의 가방에서 수면제 빈 병 발견.', f:'정우진의 가방에서 수면제 빈 병 발견.'},
      {t:'사라진 서류는 화물칸 소포 상자 안에서 발견. 보낸 사람 이름은 최한결.', f:'사라진 서류는 식당칸 쓰레기통에서 발견.'},
    ],
    qs:[
      {q:'금고가 털린 시각은?', o:['10시','10시 40분','11시 20분','12시'], a:2, need:[5], w:1},
      {q:'커피에 수면제를 탄 사람은?', o:['승무원 이소라','비서 정우진','동업자 최한결','승객 문다현'], a:2, need:[1,6], w:1},
      {q:'커피를 들고 가기만 한 사람은?', o:['승무원 이소라','비서 정우진','동업자 최한결','식당칸 직원'], a:1, need:[0,1], w:0},
      {q:'사라진 서류는 어디에?', o:['식당칸 쓰레기통','3호칸','화물칸 소포 상자','기관실'], a:2, need:[7], w:0},
      {q:'범인이 금고를 열 수 있었던 이유는?', o:['열쇠를 훔쳐서','비밀번호를 알아서','승무원 마스터키','금고가 열려 있어서'], a:1, need:[2], w:2},
    ]},
];
const STYLE={seojin:'logic', doyun:'warm', haram:'calm', yuna:'emo', minho:'sly', taekyung:'hot', jihu:'sly', soyul:'warm'};
const DEF_P={talk:.5,aggr:.5,trust:.5,bluff:.4,logic:.6,temper:.4};
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
const PRE={logic:['정확히 기억해요:','제 단서는 이거예요:'], warm:['제가 본 건요~','음… 이랬던 것 같아요:'], calm:['…',''], emo:['아 그거! 그거요!','헐 잠깐만, 기억났어요:'], sly:['제 기억력 믿으세요 😏','이건 확실해요:'], hot:['들어 봐요!','제 거 중요해요!']};
const SUG={logic:'제 단서로 보면 「{o}」예요.', warm:'저는 「{o}」 같아요~', calm:'…「{o}」.', emo:'「{o}」!! 그거 맞을 거예요!', sly:'「{o}」죠, 뻔하잖아요 😏', hot:'「{o}」! 무조건!'};
const st=(s,i)=>STYLE[P(s,i).id]||'calm';

function init(starter,o){ const kh=Math.max(2,Math.min(6,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,kh);
  const s={phase:'intro', who:{}, starter:starter|0, cs:Math.random()*CASES.length|0, deal:null, mem:null, chat:[[],[]], prog:[0,0], lock:[0,0], until:0, sugg:{}, plan:null,
    q:[], say:null, log:[], turn:null, winner:null, ev:0, wrongs:[0,0], tried:[{},{}], notice:'🎙️ 메인 매치 「크리미널 메모리」 — 필기는 금지, 기억만으로 사건을 푸세요'};
  s.hs=HSEAT.slice(); const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=ids[k]);
  /* 단서 나누기: 팀마다 8장을 세 명에게 3·3·2장 */
  s.deal=Array(N).fill(null).map(()=>[]); for(const t of [0,1]){ const order=U.shuffle([...Array(8).keys()]); const m=MATES(t); order.forEach((c,k)=>s.deal[m[k%3]].push(c)); }
  s.mem=ALL.map(i=>{ if(isH(i)) return null; const p=P(s,i); const err=.08+(1-p.logic)*.28; return s.deal[i].map(c=>Math.random()<err?'f':'t'); });
  return s;
}
const C=s=>CASES[s.cs];
function stepDelay(s){ syncH(s); if(s.winner!=null) return null; const now=Date.now();
  if(s.phase==='intro') return 2400; if(s.phase==='story') return 9000; if(s.phase==='view') return Math.max(50,s.until-now);
  if(s.q.length){ const k=s.q[0].k; return k==='note'?1700 : k==='talk'?2600 : k==='sug'?2000 : 500; }
  return null; }
function step(s){ syncH(s); const now=Date.now();
  if(s.phase==='intro'){ s.phase='story'; s.notice=`📰 사건 「${C(s).title}」 — ${C(s).story}`; s.log.push(`📰 ${C(s).title}`); s.ev++; return; }
  if(s.phase==='story'){ s.phase='view'; s.until=now+VIEW; s.notice=`🔍 단서룸 — ${VIEW/1000}초 동안 내 단서를 외우세요 (필기 금지!)`; s.ev++; return; }
  if(s.phase==='view'){ if(now<s.until) return; s.phase='talk'; s.notice='🗣️ 본부 — 팀원끼리 기억한 단서를 말해요'; s.log.push(s.notice);
    const L=[0,1].map(t=>MATES(t).filter(i=>!isH(i)).flatMap(i=>s.deal[i].map((c,k)=>({i,c,k2:k})))); for(let k=0;k<Math.max(L[0].length,L[1].length);k++) s.q.push({k:'talk',items:[L[0][k],L[1][k]].filter(Boolean)});
    s.q.push({k:'race'}); s.ev++; return; }
  if(s.q.length){ const e=s.q.shift();
    if(e.k==='note'){ s.notice=e.text; s.log.push(e.text); }
    else if(e.k==='talk'){ for(const x of e.items){ const cl=C(s).clues[x.c], bad=s.mem[x.i][x.k2]==='f'; const pre=x.k2===0?U.pick(PRE[st(s,x.i)]||['']):['그리고','또 하나 —','아, 그리고','하나 더요:'][x.k2%4]; s.chat[TEAM(x.i)].push({i:x.i, text:`${pre} ${bad?cl.f:cl.t}`.trim()}); } }
    else if(e.k==='race'){ s.phase='race'; s.notice='❓ 질문 공개! 1번부터 순서대로 — 먼저 5번까지 맞히는 팀이 승리'; s.log.push(s.notice); suggest(s,0); suggest(s,1); }
    else if(e.k==='sug'){ const x=e; s.chat[x.t].push({i:x.i,text:x.text}); }
    s.ev++; return; }
}
/* NPC 동료 한마디: 지금 질문에 대해 자기 기억으로 고른 답 */
function npcGuess(s,i,qi){ const Q=C(s).qs[qi]; const mine=s.deal[i]; const have=Q.need.filter(c=>mine.includes(c)); if(!have.length) return null;
  const bad=have.some(c=>s.mem[i][mine.indexOf(c)]==='f'); if(bad) return Q.w; if(have.length===Q.need.length) return Q.a; return Math.random()<.6?Q.a:Q.w; }
function suggest(s,t){ const qi=s.prog[t]; if(qi>=5) return; const m=MATES(t).filter(i=>!isH(i)); for(const i of U.shuffle(m.slice())){ const g=npcGuess(s,i,qi); if(g!=null){ s.q.push({k:'sug',t,i,text:SUG[st(s,i)].replace('{o}',C(s).qs[qi].o[g])}); return; } } }
/* 팀 지식: 팀원(사람 제외 NPC + 컴퓨터 대표)의 기억 — 컴퓨터 팀 대표는 자기 단서를 정확히 기억(실력 낮으면 가끔 틀림) */
const LV=[{base:26,err:.25},{base:18,err:.12},{base:13,err:.05}];
function teamPick(s,t,qi,lvl){ const Q=C(s).qs[qi], L=LV[lvl==null?1:lvl]; let ok=true, any=false;
  for(const c of Q.need){ const holder=MATES(t).find(i=>s.deal[i].includes(c)); if(holder==null){ ok=false; continue; } any=true;
    const wrong = isH(holder) ? Math.random()<L.err : s.mem[holder][s.deal[holder].indexOf(c)]==='f'; if(wrong) ok=false; }
  if(ok) return Q.a; if(any&&Math.random()<.35) return Q.a; return Math.random()<.5?Q.w:U.pick([0,1,2,3].filter(x=>x!==Q.a)); }
function planNext(s,t,lvl){ if(t!==1||isH(3)&&false) return null; const qi=s.prog[1]; if(qi>=5) return null; const L=LV[lvl==null?(s.lv??1):lvl];
  return {at:Date.now()+L.base*1000*(.6+Math.random()*.8)*(qi===0?1.3:1), pick:teamPick(s,1,qi,lvl==null?(s.lv??1):lvl)}; }
function answer(s,t,pick){ const qi=s.prog[t], Q=C(s).qs[qi]; const cap=t?3:0;
  if(pick===Q.a){ s.prog[t]++; s.notice=`⭕ ${nm(cap)} 팀 ${qi+1}번 정답!${s.prog[t]<5?` (${s.prog[t]+1}번 열림)`:''}`; s.log.push(s.notice);
    if(s.prog[t]>=5){ s.phase='over'; if(HSEAT.length>2){ s.winners=HSEAT.map((h,p)=>TEAM(h)===t?p:-1).filter(x=>x>=0); s.winner='none'; } else s.winner=TEAM(HSEAT[0])===t?0:1; s.notice=`🏁 ${nm(cap)} 팀이 다섯 문제를 먼저 풀었어요! — 범인은 「${C(s).qs[1].o[C(s).qs[1].a]}」`; s.log.push(s.notice); s.turn=null; return; }
    suggest(s,t); }
  else { s.wrongs[t]++; (s.tried[t][qi]=s.tried[t][qi]||[]).push(pick); s.lock[t]=Date.now()+LOCK; s.notice=`❌ ${nm(cap)} 팀 ${qi+1}번 오답 — 30초 동안 답할 수 없어요`; s.log.push(s.notice); }
}
function apply(s,p,a){ syncH(s); if(s.winner!=null) return '게임이 끝났어요'; if(!a||a.k!=='ans') return '알 수 없는 동작'; if(s.phase!=='race') return '아직 답할 때가 아니에요';
  if(s.q.some(e=>e.k==='race')) return '잠시만요'; const t=TEAM(HSEAT[p]); if(Date.now()<s.lock[t]) return `${Math.ceil((s.lock[t]-Date.now())/1000)}초 뒤에 답할 수 있어요`;
  const k=a.pick|0; if(k<0||k>3) return '보기를 고르세요'; answer(s,t,k); s.ev++; return null; }
function mask(s,p){ syncH(s); const v=U.clone(s), me=HSEAT[p], t=TEAM(me), open=s.phase==='over';
  v.deal=s.deal.map((d,i)=> TEAM(i)===t||open ? d : d.map(()=>-1)); v.mem=null; v.plan=null; v.lv=null;
  v.chat=[t===0?s.chat[0]:[], t===1?s.chat[1]:[]]; v.showClues = s.phase==='view'||open;
  v.ans = open ? C(s).qs.map(q=>q.a) : C(s).qs.map((q,k)=>k<Math.max(...s.prog)?q.a:null);
  v.q=[]; return v; }
let MEM={};
function ai(v,lvl){ syncH(v); const me=HSEAT[1], t=TEAM(me); if(v.phase!=='race'||v.prog[t]>=5) return null; const key=t+':'+v.prog[t]+':'+v.wrongs[t];
  if(!MEM[key]){ const L=LV[lvl==null?1:lvl]; MEM[key]={at:Date.now()+L.base*1000*(.6+Math.random()*.8)*(v.prog[t]===0?1.3:1), lvl}; }
  if(Date.now()<MEM[key].at||Date.now()<v.lock[t]) return null; return {k:'ans', pick:aiPick(v,t,lvl,me)}; }
/* 혼자 모드 상대 대표: 자기 팀(마스크에 보이는 것)의 단서 배분과 동료 발언을 그대로 따름 */
function aiPick(v,t,lvl,me){ const r=aiPick0(v,t,lvl,me); const tr=((v.tried||[])[t]||{})[v.prog[t]]||[]; if(lvl!==0&&tr.includes(r)){ const left=[0,1,2,3].filter(x=>!tr.includes(x)); return U.pick(left); } return r; }
function aiPick0(v,t,lvl,me){ const qi=v.prog[t], Q=C(v).qs[qi]; const L=LV[lvl==null?1:lvl];
  const chat=v.chat[t]||[]; const said=Q.o.map((o,k)=>chat.filter(c=>c.text.includes(`「${o}」`)).reduce((a,c)=>a+(lvl===2?(NPCS.byId(v.who[c.i])||DEF_P).logic:1),0));
  const mine=v.deal[me!=null?me:HSEAT.find(h=>TEAM(h)===t)]; const iHave=Q.need.filter(c=>mine.includes(c));
  if(iHave.length===Q.need.length&&Math.random()>L.err) return Q.a;
  const best=said.indexOf(Math.max(...said)); if(Math.max(...said)>0&&Math.random()<.8) return best;
  if(iHave.length&&Math.random()>L.err*2) return Q.a; return U.pick([0,1,2,3]); }
function aiDelay(){ return 1500; }

/* 화면 */
let WHO={}, sel=null, sig='', tick=null;
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}/g,(_,d)=>`${seatEmoji(+d)} ${seatName(+d,ctx)}`); }
function render(el,v,ctx){
  syncH(v); WHO=v.who||{}; const me=HSEAT[ctx.me], t=TEAM(me), o=1-t, cs=C(v);
  const sg=v.phase+':'+v.prog[t]; if(sg!==sig){ sig=sg; sel=null; }
  clearInterval(tick); tick=null; if(v.phase==='view'||v.lock[t]>Date.now()) tick=setInterval(()=>{ const e=document.getElementById('cmT'); if(e){ const r=Math.ceil(((v.phase==='view'?v.until:v.lock[t])-Date.now())/1000); e.textContent=r>0?r+'초':''; if(r<=0&&v.phase!=='view') ctx.rerender(); } else { clearInterval(tick); tick=null; } },400);
  let h=`<div class="hl-notice">${fill(U.esc(v.notice||''),ctx)}</div>`;
  h+=`<div class="cm-teams">${[t,o].map(tt=>`<div class="cm-team ${tt===t?'me':''}"><b>${tt===t?'우리 팀':'상대 팀'}</b> ${MATES(tt).map(i=>`<span>${seatEmoji(i)} ${seatName(i,ctx)}</span>`).join(' ')}<div class="cm-prog">${[0,1,2,3,4].map(k=>`<i class="${k<v.prog[tt]?'ok':''}">${k+1}</i>`).join('')}${v.lock[tt]>Date.now()?' 🔒':''}</div></div>`).join('')}</div>`;
  if(v.phase!=='intro') h+=`<div class="mt-case"><div class="mt-pic">🕵️</div><div><b>「${U.esc(cs.title)}」</b><p>${U.esc(cs.story)}</p></div></div>`;
  const myClues=v.deal[me]||[];
  if(v.phase==='view') h+=`<div class="vr-card cm-view"><b>🔍 내 단서 ${myClues.length}장</b> <span class="hc-lock" id="cmT">${Math.ceil((v.until-Date.now())/1000)}초</span>${myClues.map(c=>`<div class="cm-clue">📄 ${U.esc(cs.clues[c].t)}</div>`).join('')}<small>시간이 지나면 덮여요. 필기 금지 — 머릿속으로!</small></div>`;
  else if(v.phase==='story') h+=`<div class="vr-card"><small>곧 단서룸에 들어가요…</small></div>`;
  else if(v.phase!=='intro'&&!v.showClues) h+=`<div class="cm-hidden">📄 내 단서 ${myClues.length}장은 덮였어요 — 기억나세요?</div>`;
  const chat=v.chat[t]||[];
  if(chat.length) h+=`<div class="cm-chat"><div class="bb-h">🗣️ 팀 본부 <small>동료의 기억 — 틀릴 수도 있어요</small></div>${chat.map(c=>`<div>${seatEmoji(c.i)} <b>${seatName(c.i,ctx)}</b> ${U.esc(c.text)}</div>`).join('')}</div>`;
  if(v.phase==='race'||v.phase==='over'){ const qi=v.prog[t];
    h+=`<div class="cm-qs">${cs.qs.map((q,k)=>`<div class="cm-q ${k<qi?'done':k===qi?'cur':'lock'}"><b>${k+1}. ${k<=qi||v.phase==='over'?U.esc(q.q):'🔒'}</b>${k<qi||(v.phase==='over'&&v.ans[k]!=null)?` <span>→ ${U.esc(q.o[v.ans[k]])}</span>`:''}</div>`).join('')}</div>`;
    if(v.phase==='race'&&qi<5){ const locked=v.lock[t]>Date.now(); const Q=cs.qs[qi];
      h+=`<div class="vr-card"><b>❓ ${qi+1}번. ${U.esc(Q.q)}</b> ${locked?`<span class="hc-lock" id="cmT">${Math.ceil((v.lock[t]-Date.now())/1000)}초</span>`:''}<div class="cm-opts">${Q.o.map((x,k)=>`<button class="${sel===k?'':'ghost'}" data-o="${k}">${U.esc(x)}</button>`).join('')}</div>
        <div class="fh-act"><button data-a="ans" ${sel!=null&&!locked?'':'disabled'}>팀 대표로 답하기</button></div><small>틀리면 우리 팀 30초 잠김</small></div>`; } }
  if(v.phase==='over') h+=`<div class="cm-reveal"><div class="bb-h">📂 모든 단서</div>${cs.clues.map((c,k)=>`<div>📄 ${U.esc(c.t)}</div>`).join('')}</div>`;
  h+=`<div class="bm-log">${v.log.slice(-6).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=h;
  el.onclick=e=>{ const b=e.target.closest('[data-o]'); if(b){ sel=+b.dataset.o; return ctx.rerender(); } const a=e.target.closest('[data-a]'); if(a&&!a.disabled){ const k=sel; sel=null; return ctx.act({k:'ans',pick:k}); } };
}
function status(v,ctx){ if(v.phase==='over') return ''; if(v.phase==='view') return '단서를 외우세요!'; if(v.phase==='race') return '질문에 답하세요'; return '진행 중…'; }
const guide=`
<p><b>기억으로 푸는 팀 추리전</b> — 3:3 (우리 둘이 각 팀 대표 + 팀마다 컴퓨터 동료 2명).</p>
<ol><li>사건 개요가 공개되고, 단서 8장을 팀원 셋이 나눠 <b>${VIEW/1000}초</b> 동안 봐요. <b>필기 금지</b> — 시간이 지나면 덮여요.</li>
<li>본부에서 동료들이 자기 단서를 <b>기억나는 대로</b> 말해 줘요. 성격 따라 <b>잘못 기억</b>할 수도 있어요.</li>
<li>질문 5개를 <b>1번부터 순서대로</b>. 앞을 맞혀야 다음이 열려요. 동료가 답을 추천하기도 해요.</li>
<li>틀리면 우리 팀은 <b>30초</b> 동안 못 답해요. <b>먼저 5번까지</b> 맞힌 팀 승리.</li></ol>
<div class="tipbox">💡 <b>팁</b><br>· 동료 말이 서로 안 맞으면 누군가 잘못 기억한 거예요. 내 단서와 맞춰 보세요.<br>· 꼼꼼한 🧠 전략가 동료의 기억이 더 믿을 만해요.</div>`;
const guideSteps=[
  {t:'📰 사건 개요', h:'사건과 용의자가 공개돼요. 질문 5개를 먼저 다 맞히는 팀이 이겨요.', demo:s=>{ s.phase='story'; s.notice='📰 사건 「'+C(s).title+'」'; return s; }},
  {t:'🔍 단서는 30초만', h:'팀원 셋이 단서 8장을 나눠 봐요. <b>필기 금지</b> — 시간이 지나면 덮여요!', demo:s=>{ s.phase='view'; s.until=Date.now()+VIEW; s.notice='🔍 단서룸 — 내 단서를 외우세요'; return s; }},
  {t:'🗣️ 동료의 기억', h:'동료가 기억나는 대로 말해 줘요. <b>잘못 기억</b>할 수도 있으니 서로 맞춰 보세요.', demo:s=>{ s.phase='talk'; [1,2].forEach(i=>s.deal[i].forEach((c,k)=>s.chat[0].push({i,text:(s.mem[i][k]==='f'?C(s).clues[c].f:C(s).clues[c].t)}))); return s; }},
  {t:'❓ 순서대로 답하기', h:'1번부터 순서대로. 틀리면 <b>30초 잠김</b>. 먼저 5번까지 맞힌 팀 승리!', demo:s=>{ s.phase='race'; s.prog=[1,0]; [1,2].forEach(i=>s.deal[i].forEach((c,k)=>s.chat[0].push({i,text:C(s).clues[c].t}))); return s; }},
];
window.GAMES.crimmemory = {
  title:'크리미널 메모리', ref:'피의 게임 「크리미널 메모리」', emoji:'🕵️‍♀️', tags:['추리','기억력','팀전','NPC','두뇌서바이벌'],
  tagline:'단서는 30초, 필기는 금지 — 동료의 흐릿한 기억을 모아 사건을 먼저 풀어라.',
  guide, guideSteps, init, apply, mask, ai, aiDelay, render, status, step, stepDelay, noPersona:true,
  reset(){ MEM={}; sel=null; sig=''; clearInterval(tick); tick=null; },
  maxH:6, bar:(v,i)=>{ syncH(v); return `<span class="tag">${v.prog[TEAM(HSEAT[i])]}/5</span>`; },
  result:(v,ctx)=>{ syncH(v); return `${v.prog[TEAM(HSEAT[ctx.me])]}/5 문제`; },
  _CASES:CASES, _aiPick:aiPick,
};
})();
