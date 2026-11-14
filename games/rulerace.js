(function(){
'use strict';
/* 규칙 레이스 (6인: 우리 둘 + NPC 4명). 12칸 트랙, 먼저 골인한 순서가 순위.
   주사위(기본): 1·2·2·3·감옥·탈출 / 특수: 1·2·2·3·3·3
   감옥: '감옥'이 나오면 갇힘. 갇히면 다음 차례에 '탈출'이 나오거나 🎟️티켓 1장을 내야 나옴(나오면 바로 다시 굴림).
   🏢 사무소(3·6·9칸)에 주사위로 도착하면: 티켓 1장 / 한 번 더 굴리기 / 단체 규칙 정하기 중 하나.
   📜 개인 규칙(비밀): 시작할 때 "[누가] [무엇을 하면] → [누가] [어떻게]"를 한 문장 만든다(앞뒤 주어는 달라야 함).
      발동하면 결과만 공개되고, 누구 규칙인지는 추리해야 함.
   📢 단체 규칙(공개, 하나만): 사무소에서 정하거나 바꿈. */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로, 나머지는 NPC */
const N=6, GOAL=12, OFFICES=[3,6,9], MAXR=30; let HSEAT=[0,3]; const SEATORD=[0,3,1,4,2,5];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i);
const ALL=[...Array(N).keys()];
const DIE=['1','2','2','3','감옥','탈출'], SDIE=['1','2','2','3','3','3'];
const SUBJ={me:'내가', next:'내 다음 순서가', lead:'선두가', last:'꼴찌가', same:'나와 같은 칸 사람이'};
const SUBJ2={me:'나', next:'내 다음 순서', lead:'선두', last:'꼴찌', same:'나와 같은 칸 사람'};
const COND={d1:'주사위 1이 나오면', d3:'주사위 3이 나오면', jail:'감옥에 가면', esc:'감옥에서 탈출하면', ticket:'티켓을 쓰면', office:'사무소에 도착하면'};
const ACT={fwd:'한 칸 전진', back:'한 칸 후진', 'tk+':'티켓 1장 얻기', 'tk-':'티켓 1장 버리기', jail:'감옥으로', office:'다음 사무소로 이동'};
const GROUP={1:'티켓 1장을 내면 특수 주사위(1·2·2·3·3·3)를 굴릴 수 있다', 2:'주사위를 포기하면 티켓 1장을 얻는다', 3:'티켓 1장을 내면 원하는 사람 1명을 한 칸 후진시킨다', 4:'감옥에서는 3이 나와도 탈출한다'};
const STYLE={seojin:'logic', doyun:'emo', haram:'calm', yuna:'emo', minho:'sly', taekyung:'emo', jihu:'sly', soyul:'logic'};
const DEF_P={talk:.6,aggr:.5,trust:.5,bluff:.5,logic:.6,temper:.4};
const nm=i=>`{s${i}}`;
const ruleText=r=> r ? `${SUBJ[r.a]} ${COND[r.c]} → ${SUBJ2[r.b]} ${ACT[r.x]}` : '';

function init(starter,o){ const k=Math.max(2,Math.min(6,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  const s={pos:Array(N).fill(0), jail:Array(N).fill(false), tk:Array(N).fill(1), fin:[], rules:Array(N).fill(null), group:null,
    ord:U.shuffle(ALL.slice()), cur:-1, round:1, phase:'setup', ready:HSEAT.map(()=>false), q:[], dice:null, actor:null,
    who:{}, log:[], hist:[], used:{}, mind:ALL.map(()=>({guess:null,mood:null})), turn:null, starter, winner:null, notice:'🎙️ 각자 비밀 개인 규칙을 만드세요', ev:0};
  s.hs=HSEAT.slice(); const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=ids[k]);
  for(const i of ALL) if(!isH(i)) s.rules[i]=npcRule(s,i);
  return s;
}
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
const live=s=>ALL.filter(i=>!s.fin.includes(i));
function leader(s){ const L=live(s); const m=Math.max(...L.map(i=>s.pos[i])); const t=L.filter(i=>s.pos[i]===m); return t.length===1?t[0]:null; }   // 단독일 때만
function laggard(s){ const L=live(s); const m=Math.min(...L.map(i=>s.pos[i])); const t=L.filter(i=>s.pos[i]===m); return t.length===1?t[0]:null; }
function nextOf(s,o){ const k=s.ord.indexOf(o); for(let d=1;d<N;d++){ const j=s.ord[(k+d)%N]; if(!s.fin.includes(j)) return j; } return null; }
function subj(s,key,o){
  if(key==='me') return s.fin.includes(o)?[]:[o];
  if(key==='next'){ const j=nextOf(s,o); return j==null?[]:[j]; }
  if(key==='lead'){ const j=leader(s); return j==null?[]:[j]; }
  if(key==='last'){ const j=laggard(s); return j==null?[]:[j]; }
  if(key==='same') return live(s).filter(j=>j!==o&&s.pos[j]===s.pos[o]&&!s.jail[j]);
  return [];
}
function validRule(r){ return r && SUBJ[r.a] && COND[r.c] && SUBJ2[r.b] && ACT[r.x] && r.a!==r.b; }

/* ── NPC 개인 규칙: 성격대로 ── */
function npcRule(s,i){
  const p=P(s,i), pick=a=>U.pick(a);
  if(p.aggr>=.75) return {a:'me', c:pick(['d1','d3']), b:'lead', x:pick(['back','jail'])};                       // 직진형: 선두 끌어내리기
  if(p.bluff>=.85) return Math.random()<.5 ? {a:pick(['lead','next']), c:pick(['d1','d3']), b:'me', x:'fwd'}   // 승부사·배신형: 남의 일로 몰래 이득 (티 안 나게)
                                           : {a:'lead', c:pick(['d3','ticket']), b:'last', x:'fwd'};
  if(p.logic>=.7) return {a:pick(['lead','last','next']), c:pick(['d1','d3','jail']), b:'me', x:pick(['fwd','tk+','office'])};   // 전략가: 자주 터지는 조건 + 나에게 이득
  const r={a:pick(Object.keys(SUBJ)), c:pick(Object.keys(COND)), b:pick(Object.keys(SUBJ2)), x:pick(['fwd','tk+','back','office'])};
  if(r.a===r.b) r.b = r.a==='me' ? 'lead' : 'me';
  return r;
}

/* ── 진행 큐: 한 단계에 한 가지 일만 ── */
function note(s,text){ s.q.push({k:'note',text}); }
function fire(s,ev,a){   // 사건 ev를 a가 일으킴 → 맞는 개인 규칙들을 바로 다음에 끼워 넣음
  const add=[];
  for(const o of ALL){ const r=s.rules[o]; if(!r||r.c!==ev) continue; if(subj(s,r.a,o).includes(a)) add.push({k:'trig',o,ev,a}); }
  s.q.splice(0,0,...add);
}
function startTurn(s){
  if(live(s).length<=1 || s.round>MAXR){ endGame(s); return; }
  do { s.cur++; if(s.cur>=N){ s.cur=0; s.round++; } } while(s.fin.includes(s.ord[s.cur]));
  if(s.round>MAXR){ endGame(s); return; }
  const i=s.ord[s.cur]; s.actor=i; s.dice=null; s.phase='turn';
  s.notice=`${s.round}바퀴 · ${nm(i)} 차례${s.jail[i]?' (🔒 감옥 안)':''}`;
  if(isH(i)) s.turn=pOf(i); else { s.turn=null; const p=P(s,i); s.think=(700+Math.random()*900)*(.7+(1-p.aggr)*.5+p.logic*.3); }
}
function doAction(s,i,a){   // 차례에 고르는 행동 (사람·NPC 공통)
  s.phase='run'; s.turn=null;
  if(a.k==='esc'){ s.tk[i]--; s.q.push({k:'note',text:`🎟️ ${nm(i)} 티켓을 내고 감옥에서 나옵니다`}); s.q.push({k:'esc',i,free:true}); s.q.push({k:'fireTicket',i}); s.q.push({k:'dice',i}); }
  else if(a.k==='g1'){ s.tk[i]--; s.q.push({k:'note',text:`🎟️ ${nm(i)} 티켓을 내고 특수 주사위!`}); s.q.push({k:'fireTicket',i}); s.q.push({k:'dice',i,sp:true}); }
  else if(a.k==='g2'){ s.tk[i]++; s.q.push({k:'note',text:`🙅 ${nm(i)} 주사위를 포기하고 티켓 1장`}); }
  else if(a.k==='g3'){ s.tk[i]--; s.q.push({k:'note',text:`🎟️ ${nm(i)} 티켓으로 ${nm(a.t)}을(를) 한 칸 뒤로!`}); s.q.push({k:'push',i:a.t,d:-1,by:i}); s.q.push({k:'fireTicket',i}); s.q.push({k:'dice',i}); }
  else s.q.push({k:'dice',i});
  s.q.push({k:'endTurn'});
}
function move(s,i,d){   // 규칙·밀기로 한 칸 (애니메이션 없이)
  if(s.fin.includes(i)) return;
  s.pos[i]=Math.max(1,Math.min(GOAL,s.pos[i]+d));
  if(s.pos[i]>=GOAL) finish(s,i);
}
function finish(s,i){ if(s.fin.includes(i)) return; s.fin.push(i); s.jail[i]=false; s.tk[i]=0; s.q.splice(0,0,{k:'note',text:`🏁 ${nm(i)} ${s.fin.length}등으로 골인!`},{k:'react',kind:'finish',i}); }
function stepQ(s){
  const e=s.q.shift(); if(!e) return;
  if(e.k==='note'){ s.notice=e.text; s.log.push(e.text); }
  else if(e.k==='dice'){
    const face=U.pick(e.sp?SDIE:DIE); s.dice={i:e.i,face,sp:!!e.sp}; s.notice=`🎲 ${nm(e.i)}: ${face==='감옥'?'🔒 감옥':face==='탈출'?'🔓 탈출':face}`; s.log.push(s.notice);
    const i=e.i, n=+face, add=[];
    if(s.jail[i]){
      if(face==='탈출' || (s.group===4 && face==='3')){ add.push({k:'esc',i},{k:'dice',i}); }
      else add.push({k:'note',text:`🔒 ${nm(i)} 탈출 실패… 감옥에 남아요`},{k:'react',kind:'stuck',i});
    } else if(face==='감옥'){ add.push({k:'jail',i}); }
    else if(face==='탈출'){ add.push({k:'note',text:`${nm(i)} 탈출이 나왔지만 갇혀 있지 않아 그대로`}); }
    else { for(let k=0;k<n;k++) add.push({k:'step',i}); add.push({k:'land',i,dice:true}); }
    s.q.splice(0,0,...add);
    if(!s.jail[i]&&(face==='1'||face==='3')) fire(s, face==='1'?'d1':'d3', i);   // 이동보다 규칙 발동이 먼저 보이지 않게: 이동 뒤에 끼움
    if(!s.jail[i]&&(face==='1'||face==='3')){ const tr=s.q.filter(x=>x.k==='trig'&&x.a===i&&(x.ev==='d1'||x.ev==='d3')); s.q=s.q.filter(x=>!tr.includes(x)); const li=s.q.findIndex(x=>x.k==='land'&&x.i===i); s.q.splice(li+1,0,...tr); }
  }
  else if(e.k==='step'){ if(!s.fin.includes(e.i)){ s.pos[e.i]++; if(s.pos[e.i]>=GOAL){ s.pos[e.i]=GOAL; s.q=s.q.filter(x=>!(x.k==='step'&&x.i===e.i)); finish(s,e.i); } } }
  else if(e.k==='land'){
    const i=e.i; if(s.fin.includes(i)) return;
    if(OFFICES.includes(s.pos[i]) && e.dice){
      s.notice=`🏢 ${nm(i)} 사무소 도착! 혜택을 고르는 중…`; s.log.push(`🏢 ${nm(i)} 사무소 도착`);
      fire(s,'office',i);
      if(isH(i)){ s.phase='office'; s.turn=pOf(i); s.offIdx=i; }
      else s.q.splice(0,0,{k:'officeNpc',i});
    }
  }
  else if(e.k==='officeNpc'){ officePick(s,e.i,npcOffice(s,e.i)); }
  else if(e.k==='jail'){ const i=e.i; if(s.jail[i]||s.fin.includes(i)) return; s.jail[i]=true; s.notice=`🔒 ${nm(i)} 감옥행!`; s.log.push(s.notice); s.q.splice(0,0,{k:'react',kind:'jail',i}); fire(s,'jail',i); }
  else if(e.k==='esc'){ const i=e.i; s.jail[i]=false; s.notice=`🔓 ${nm(i)} 감옥 탈출!${e.free?'':' 바로 한 번 더 굴려요'}`; s.log.push(s.notice); fire(s,'esc',i); }
  else if(e.k==='fireTicket'){ fire(s,'ticket',e.i); }
  else if(e.k==='push'){ move(s,e.i,e.d); s.log.push(`${nm(e.i)} 한 칸 뒤로`); }
  else if(e.k==='trig'){ applyTrig(s,e); }
  else if(e.k==='react'){ react(s,e); }
  else if(e.k==='say'){ s.say={seat:e.seat,text:e.text,n:(s.say?s.say.n:0)+1}; s.log.push(`${nm(e.seat)}: ${e.text}`); }
  else if(e.k==='endTurn'){ startTurn(s); }
  s.ev++;
}
function applyTrig(s,e){
  const r=s.rules[e.o], T=subj(s,r.b,e.o).filter(j=>!s.fin.includes(j));
  if(!T.length){ return; }
  const eff=[];
  for(const j of T){
    if(r.x==='fwd'){ move(s,j,1); eff.push(`${nm(j)} 한 칸 전진`); }
    if(r.x==='back'){ move(s,j,-1); eff.push(`${nm(j)} 한 칸 후진`); }
    if(r.x==='tk+'){ s.tk[j]++; eff.push(`${nm(j)} 티켓 +1`); }
    if(r.x==='tk-'){ if(s.tk[j]>0){ s.tk[j]--; eff.push(`${nm(j)} 티켓 −1`); } }
    if(r.x==='jail'){ if(!s.jail[j]){ s.jail[j]=true; eff.push(`${nm(j)} 감옥으로`); } }
    if(r.x==='office'){ const o=OFFICES.find(x=>x>s.pos[j]); if(o!=null){ s.pos[j]=o; eff.push(`${nm(j)} ${o}칸 사무소로 이동`); } }
  }
  if(!eff.length) return;
  const ctx=`${nm(e.a)}이(가) ${({d1:'주사위 1',d3:'주사위 3',jail:'감옥에 감',esc:'탈출함',ticket:'티켓을 씀',office:'사무소 도착'})[e.ev]}`;
  const text=`📜 숨은 규칙 발동! (방금: ${ctx}) → ${eff.join(', ')}`;
  s.notice=text; s.log.push(text);
  const h={r:s.round, ev:e.ev, a:e.a, eff:eff.join(', '), o:e.o, guesses:[]}; s.hist.push(h);
  s.q.splice(0,0,{k:'react',kind:'guess',h:s.hist.length-1});
}

/* ── NPC 판단 ── */
function npcTurn(s,i){
  const p=P(s,i), ld=leader(s);
  if(s.jail[i]){ if(s.tk[i]>0 && Math.random()<.35+p.logic*.5) return {k:'esc'}; return {k:'roll'}; }
  if(s.group===3 && s.tk[i]>0 && ld!=null && ld!==i && Math.random()<p.aggr*.8) return {k:'g3',t:ld};
  if(s.group===1 && s.tk[i]>0 && (s.tk[i]>=2 || Math.random()<p.aggr)) return {k:'g1'};
  if(s.group===2 && GOAL-s.pos[i]>6 && s.tk[i]===0 && Math.random()<.15) return {k:'g2'};
  return {k:'roll'};
}
function npcOffice(s,i){
  const p=P(s,i);
  if(s.tk[i]===0 && p.logic>.5 && Math.random()<.7) return {k:'ticket'};
  if(p.aggr>.7 && s.group!==3 && leader(s)!==i) return {k:'group',g:3};
  if(p.logic>.7 && s.tk[i]>=1 && s.group!==1) return {k:'group',g:1};
  if(s.jail.some((x,j)=>x&&j!==i) && s.group===4 && p.aggr>.5) return {k:'group',g:U.pick([1,3])};
  return Math.random()<.55 ? {k:'reroll'} : {k:'ticket'};
}
function officePick(s,i,c){
  if(c.k==='ticket'){ s.tk[i]++; note1(s,`🏢 ${nm(i)} → 🎟️ 티켓 1장`); }
  else if(c.k==='reroll'){ note1(s,`🏢 ${nm(i)} → 🎲 한 번 더 굴리기`); s.q.splice(1,0,{k:'dice',i}); }
  else if(c.k==='group'){ s.group=c.g||null; note1(s, c.g ? `🏢 ${nm(i)} → 📢 단체 규칙: "${GROUP[c.g]}"` : `🏢 ${nm(i)} → 📢 단체 규칙 없앰`); }
}
function note1(s,text){ s.q.splice(0,0,{k:'note',text}); }

/* ── 반응·추리 (한 명씩) ── */
const LINES={
  sly:{jail:['쳇, 감옥이라니~','잠깐 쉬어 가죠 뭐 😏'], stuck:['또 실패? 운이 없네~'], finish:['먼저 갑니다~ 😎','역시 제가 1등이죠~'], guess:['{t} 규칙 같은데요~? 😏','이거 {t} 거죠? 티 나요~'], deny:['제 거요? 설마요~ 😏','글쎄요~ 아닐걸요?'], admit:['들켰네요~ 😅'], laugh:['ㅋㅋ {t} 감옥!']},
  calm:{jail:['…감옥이네요.'], stuck:['…다음에.'], finish:['도착.'], guess:['…{t} 같네요.'], deny:['아니에요.'], admit:['…맞아요.'], laugh:['…{t}, 안됐네요.']},
  logic:{jail:['확률 1/6이 저한테 왔네요.','감옥 확률을 계산에 넣었어야 했는데.'], stuck:['탈출 확률은 1/6이에요. 기다려야죠.'], finish:['계산대로예요.'], guess:['이득 본 사람을 보면 {t} 규칙이에요.','타이밍상 {t}이에요.','발동 패턴이 {t}랑 맞아요.'], deny:['제 규칙은 그렇게 단순하지 않아요.','근거가 약하네요.'], admit:['맞아요. 잘 추리했네요.'], laugh:['{t}, 감옥 1/6 당첨이네요.']},
  emo:{jail:['으악 감옥이야 😭','안 돼애애 😱'], stuck:['나 좀 꺼내줘요 😭','또 실패야… 🥲'], finish:['골인!! 🥳','해냈다아 😭✨'], guess:['이거 {t} 거 아니에요?! 🤨','{t}!! 딱 봐도 {t}예요!'], deny:['제 거 아니라니까요 😤','억울해요!!'], admit:['헉 들켰다 😳'], laugh:['ㅋㅋㅋ {t} 감옥 갔대 🤣']},
};
function line(s,seat,kind,t){ const p=P(s,seat), st=STYLE[p.id]||'calm', L=LINES[st][kind]; if(!L) return null;
  const used=(s.used[seat]=s.used[seat]||[]), pool=L.filter(x=>!used.includes(x)); if(!pool.length) return null;
  const raw=U.pick(pool); used.push(raw); return raw.split('{t}').join(t!=null?nm(t):''); }
function sayQ(s,seat,kind,t){ if(isH(seat)) return; const text=line(s,seat,kind,t); if(text) s.q.splice(0,0,{k:'say',seat,text}); }
function react(s,e){
  const npcs=live(s).filter(j=>!isH(j));
  if(e.kind==='jail'||e.kind==='stuck'){ if(!isH(e.i)&&Math.random()<P(s,e.i).talk) sayQ(s,e.i,e.kind); else if(e.kind==='jail'){ const o=npcs.filter(j=>j!==e.i); if(o.length&&Math.random()<.4) sayQ(s,U.pick(o),'laugh',e.i); } return; }
  if(e.kind==='finish'){ if(!isH(e.i)) sayQ(s,e.i,'finish'); return; }
  if(e.kind==='guess'){   // 누군가 규칙 주인을 추리해서 말함 (논리파일수록 맞힘)
    const h=s.hist[e.h], cand=npcs.filter(j=>j!==h.a);
    if(!cand.length || Math.random()>.75) return;
    const g=cand.sort((x,y)=>P(s,y).logic-P(s,x).logic+(Math.random()-.5)*.6)[0], p=P(s,g);
    const t = guessOwner(s,h,g,p.logic); if(t==null||t===g) return;
    h.guesses.push({by:g,t}); s.mind[g].guess=t;
    sayQ(s,g,'guess',t);
  }
}
function guessOwner(s,h,g,logic){   // 이득 본 사람 = 주인일 확률 높음 (논리 높을수록 이 추론을 씀)
  const ben = /전진|티켓 \+1|사무소로/.test(h.eff), m=h.eff.match(/\{s(\d)\}/), tgt=m?+m[1]:null;
  const others=ALL.filter(j=>j!==g&&!s.fin.includes(j));
  if(Math.random()<logic){
    if(ben && tgt!=null && tgt!==g) return tgt;
    if(!ben){ const k=others.filter(j=>j!==tgt).sort((x,y)=>s.pos[x]-s.pos[y]); return k.length?U.pick(k.slice(0,3)):null; }   // 손해 규칙 → 뒤처진 쪽이 걸었을 것
  }
  return U.pick(others);
}

/* ── 끝 ── */
function endGame(s){
  s.phase='over'; s.turn=null; s.q=[];
  const rest=live(s).sort((a,b)=>s.pos[b]-s.pos[a]); s.rank=[...s.fin,...rest];
  const top=s.rank[0]; s.winner = isH(top) ? pOf(top) : 'none'; s.winners=isH(top)?[pOf(top)]:[];
  s.notice=`🎙️ 레이스 끝! 1등 ${nm(top)}`;
  s.log.push('🎭 개인 규칙 공개: '+ALL.map(i=>`${nm(i)} "${ruleText(s.rules[i])}"`).join(' / '));
}

/* ── 시간 흐름 ── */
function stepDelay(s){ syncH(s);
  if(s.winner!=null||s.phase==='over') return null;
  if(s.phase==='setup') return s.ready.every(Boolean) ? 900 : null;
  if(s.phase==='turn') return isH(s.actor) ? null : s.think;
  if(s.phase==='office') return null;
  if(s.phase==='run'){ const e=s.q[0]; if(!e) return 600; return e.k==='step'?300 : e.k==='say'?1300 : e.k==='trig'?1500 : e.k==='react'?400 : e.k==="endTurn"?500 : e.k==='dice'?1000 : 1100; }
  return null;
}
function step(s){ syncH(s);
  if(s.phase==='setup'){ s.phase='run'; s.notice='🎙️ 규칙 레이스를 시작합니다! 숨은 규칙은 발동할 때만 결과가 보여요'; s.log.push(s.notice); s.q.push({k:'endTurn'}); return; }
  if(s.phase==='turn' && !isH(s.actor)){ doAction(s,s.actor,npcTurn(s,s.actor)); return; }
  if(s.phase==='run'){ if(!s.q.length){ s.q.push({k:'endTurn'}); } stepQ(s); }
}
function apply(s,p,a){ syncH(s);
  if(s.winner!=null) return '게임이 끝났어요';
  if(!a) return '알 수 없는 동작';
  const seat=HSEAT[p];
  if(a.k==='rule'){
    if(s.phase!=='setup') return '이미 시작했어요';
    const r={a:a.a,c:a.c,b:a.b,x:a.x}; if(!validRule(r)) return '규칙을 다시 만드세요 (앞뒤 주어는 달라야 해요)';
    s.rules[seat]=r; s.ready[p]=true; s.ev++; return null;
  }
  if(a.k==='office'){
    if(s.phase!=='office'||s.offIdx!==seat) return '사무소 선택 차례가 아니에요';
    if(!['ticket','reroll','group'].includes(a.c)) return '고르세요';
    if(a.c==='group' && !(a.g===null||GROUP[a.g])) return '단체 규칙을 고르세요';
    s.phase='run'; s.turn=null; officePick(s,seat,{k:a.c,g:a.g}); s.ev++; return null;
  }
  if(a.k==='guess'){
    if(s.phase==='setup'||s.phase==='over') return '지금은 추리할 때가 아니에요';
    const h=s.hist[s.hist.length-1]; if(!h) return '아직 발동한 숨은 규칙이 없어요';
    const t=a.t; if(typeof t!=='number'||t<0||t>=N||t===seat) return '사람을 고르세요';
    if(h.guesses.some(x=>x.by===seat)) return '이번 규칙엔 이미 지목했어요';
    h.guesses.push({by:seat,t}); s.mind[seat].guess=t;
    s.say={seat, text:`이 규칙, ${nm(t)} 거죠? 🤨`, n:(s.say?s.say.n:0)+1}; s.log.push(`${nm(seat)}: 이 규칙, ${nm(t)} 거죠? 🤨`);
    if(!isH(t)){ const own=h.o===t, pp=P(s,t); const k = own ? (Math.random()<pp.bluff ? 'deny':'admit') : 'deny'; const text=line(s,t,k); if(text) s.q.splice(0,0,{k:'say',seat:t,text}); }
    s.ev++; return null;
  }
  if(s.phase!=='turn' || s.actor!==seat) return '내 차례가 아니에요';
  if(a.k==='esc'){ if(!s.jail[seat]||s.tk[seat]<1) return '감옥 안에서 티켓이 있어야 해요'; }
  else if(a.k==='g1'){ if(s.group!==1||s.tk[seat]<1||s.jail[seat]) return '지금은 특수 주사위를 못 써요'; }
  else if(a.k==='g2'){ if(s.group!==2||s.jail[seat]) return '지금은 포기할 수 없어요'; }
  else if(a.k==='g3'){ if(s.group!==3||s.tk[seat]<1||s.jail[seat]) return '지금은 밀 수 없어요'; if(typeof a.t!=='number'||a.t===seat||s.fin.includes(a.t)) return '밀 사람을 고르세요'; }
  else if(a.k!=='roll') return '알 수 없는 동작';
  doAction(s,seat,a); s.ev++; return null;
}
function mask(s,p){ syncH(s);
  const v=U.clone(s), me=HSEAT[p], over=s.phase==='over';
  if(!over){ v.rules=s.rules.map((r,i)=> i===me ? r : null); v.hist=s.hist.map(h=>({...h, o:null})); }
  v.q=[]; v.used={}; v.think=null;
  return v;
}
/* ── 혼자 모드: 4번 자리(두 번째 사람)를 컴퓨터가 ── */
function ai(v){ syncH(v);
  const seat=HSEAT[1];
  if(v.phase==='setup' && !v.ready[1]) return {k:'rule', a:U.pick(['lead','last','next']), c:U.pick(['d1','d3']), b:'me', x:U.pick(['fwd','tk+'])};
  if(v.phase==='office' && v.offIdx===seat) return {k:'office', c: v.tk[seat]===0?'ticket':'reroll'};
  if(v.phase==='turn' && v.actor===seat){ if(v.jail[seat]&&v.tk[seat]>0) return {k:'esc'}; if(v.group===1&&v.tk[seat]>=2&&!v.jail[seat]) return {k:'g1'}; return {k:'roll'}; }
  return null;
}

/* ── 화면 ── */
let WHO={}, picking=null, guessing=false, sig='', draft={a:'lead',c:'d1',b:'me',x:'fwd'}, offG=1;
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}/g,(_,d)=>`${seatEmoji(+d)} ${seatName(+d,ctx)}`); }
const sel=(name,opts,val)=>`<select data-r="${name}">${Object.entries(opts).map(([k,t])=>`<option value="${k}" ${k===val?'selected':''}>${t}</option>`).join('')}</select>`;
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{};
  const me=HSEAT[ctx.me], myRule=v.rules[me];
  const sg=v.phase+':'+v.actor+':'+v.round; if(sg!==sig){ sig=sg; picking=null; }
  let h=`<div class="info">${v.phase==='setup'?'준비':`${v.round}바퀴`} · 🎟️ 내 티켓 ${v.tk[me]} ${v.jail[me]?'· 🔒 감옥':''}${myRule?` · 📜 내 규칙: <b>${ruleText(myRule)}</b>`:''}</div>`;
  h+=`<div class="hl-notice">${fill(v.notice||'',ctx)}</div>`;
  h+=`<div class="vr-speech">${v.say?`<span class="w">${seatEmoji(v.say.seat)} ${seatName(v.say.seat,ctx)}</span> ${fill(U.esc(v.say.text),ctx)}`:'<i>　</i>'}</div>`;
  h+=`<div class="rr-group">📢 단체 규칙: ${v.group?`<b>${GROUP[v.group]}</b>`:'<i>아직 없음</i>'}</div>`;
  // 트랙
  const cell=c=>{ const here=ALL.filter(i=>v.pos[i]===c&&!v.jail[i]&&!(c===GOAL&&false));
    const off=OFFICES.includes(c), dice=v.dice&&v.pos[v.dice.i]===c;
    return `<div class="rr-c ${off?'off':''} ${c===0?'st':''} ${c===GOAL?'goal':''}"><small>${c===0?'출발':c===GOAL?'🏁':off?`🏢${c}`:c}</small><div class="rr-tok">${here.map(i=>`<span class="${v.actor===i&&v.phase!=='over'?'act':''}" title="${seatName(i,ctx)}">${seatEmoji(i)}</span>`).join('')}</div></div>`; };
  h+=`<div class="rr-track">${[...Array(GOAL+1).keys()].map(cell).join('')}</div>`;
  const jailed=ALL.filter(i=>v.jail[i]);
  h+=`<div class="rr-row"><div class="rr-jail">🔒 감옥 ${jailed.length?jailed.map(i=>`${seatEmoji(i)}${seatName(i,ctx)}`).join(' '):'<i>비어 있음</i>'}</div>${v.dice?`<div class="rr-dice ${v.dice.sp?'sp':''}">🎲 ${v.dice.face}</div>`:''}</div>`;
  // 사람들
  h+=`<div class="rr-people">${v.ord.map(i=>`<div class="rr-p ${v.actor===i&&v.phase!=='over'?'act':''} ${v.fin.includes(i)?'fin':''}"><b>${seatEmoji(i)} ${seatName(i,ctx)}</b>${isH(i)?'':`<small>${NPCI(i)[2]}</small>`}<span>📍${v.pos[i]} · 🎟️${v.tk[i]}${v.jail[i]?' · 🔒':''}${v.fin.includes(i)?` · 🏁${v.fin.indexOf(i)+1}등`:''}</span>${v.phase==='turn'&&v.actor===i&&!isH(i)?'<em>💭 고민 중…</em>':''}</div>`).join('')}</div>`;
  // 내 행동
  if(v.phase==='setup' && !v.ready[ctx.me]){
    h+=`<div class="vr-card"><b>📜 비밀 개인 규칙 만들기</b><p>발동하면 결과만 모두에게 보이고, 누구 규칙인지는 비밀이에요. 앞뒤 주어는 달라야 해요.</p>
      <div class="rr-build">${sel('a',SUBJ,draft.a)} ${sel('c',COND,draft.c)} → ${sel('b',SUBJ2,draft.b)} ${sel('x',ACT,draft.x)}</div>
      <p class="rr-prev">"${ruleText(draft)}" ${draft.a===draft.b?'<b style="color:#b8412f">앞뒤 주어가 같아요!</b>':''}</p>
      <p class="vr-cast">오늘의 플레이어: ${ALL.filter(i=>!isH(i)).map(i=>`${seatEmoji(i)} ${seatName(i,ctx)} ${NPCI(i)[2]}`).join(' · ')}</p>
      <button data-a="rule" ${draft.a===draft.b?'disabled':''}>이 규칙으로 확정</button></div>`;
  } else if(v.phase==='setup') h+=`<div class="vr-card"><small>상대가 규칙을 만드는 중…</small></div>`;
  if(v.phase==='turn' && v.actor===me && v.turn===ctx.me){
    const b=[];
    if(v.jail[me]&&v.tk[me]>0) b.push('<button data-a="esc">🎟️ 티켓 내고 탈출</button>');
    if(v.group===1&&v.tk[me]>0&&!v.jail[me]) b.push('<button data-a="g1">🎟️ 특수 주사위</button>');
    if(v.group===2&&!v.jail[me]) b.push('<button class="ghost" data-a="g2">🙅 포기하고 티켓</button>');
    if(v.group===3&&v.tk[me]>0&&!v.jail[me]) b.push(`<button class="${picking==='g3'?'':'ghost'}" data-a="g3">🎟️ 한 명 뒤로 밀기${picking==='g3'?' (아래에서 고르세요)':''}</button>`);
    b.push(`<button data-a="roll">🎲 ${v.jail[me]?'탈출 굴리기':'주사위 굴리기'}</button>`);
    h+=`<div class="fh-act">${b.join('')}</div>`;
    if(picking==='g3') h+=`<div class="fh-act">${ALL.filter(i=>i!==me&&!v.fin.includes(i)).map(i=>`<button class="ghost small" data-push="${i}">${seatEmoji(i)} ${seatName(i,ctx)} (📍${v.pos[i]})</button>`).join('')}</div>`;
  }
  if(v.phase==='office' && v.offIdx===me){
    h+=`<div class="vr-card"><b>🏢 사무소 혜택</b><div class="fh-act"><button data-o="ticket">🎟️ 티켓 1장</button><button data-o="reroll">🎲 한 번 더 굴리기</button></div>
      <div class="fh-act">${sel('g',Object.fromEntries([['0','(단체 규칙 없애기)'],...Object.entries(GROUP)]),String(offG))}<button data-o="group">📢 이 단체 규칙으로</button></div></div>`;
  }
  if(v.phase!=='setup'&&v.phase!=='over'&&v.hist.length){
    h+=`<div class="fh-act"><button class="ghost small ${guessing?'on':''}" data-a="guess">${guessing?'누구 규칙? 아래에서 고르세요':'🤨 방금 숨은 규칙의 주인 지목'}</button></div>`;
    if(guessing) h+=`<div class="fh-act">${ALL.filter(i=>i!==me).map(i=>`<button class="ghost small" data-g="${i}">${seatEmoji(i)} ${seatName(i,ctx)}</button>`).join('')}</div>`;
  }
  if(v.phase==='over' && v.rank) h+=`<div class="hl-rank">${v.rank.map((i,k)=>`<span class="${isH(i)?'h':''}">${k+1}등 ${seatEmoji(i)} ${seatName(i,ctx)} ${['+3','+2','+1','±0','−1','−5'][k]}</span>`).join('')}</div>`;
  // 왼쪽: 숨은 규칙 추리판 / 오른쪽: 기록
  const L=`<div class="side-box"><div class="side-h">🔎 숨은 규칙 추리 <small>발동 결과 · 누가 누구를 지목했나</small></div>${v.hist.length?v.hist.slice().reverse().map(x=>`<div class="rr-h"><div><small>${x.r}바퀴</small> ${fill(x.eff,ctx)} <small>(방금 ${fill(nm(x.a),ctx)})</small>${x.o!=null?` <b class="ok">→ 주인: ${fill(nm(x.o),ctx)}</b>`:''}</div>${x.guesses.map(g=>`<span class="${x.o!=null?(g.t===x.o?'ok':'no'):''}">🤨 ${fill(nm(g.by),ctx)} → ${fill(nm(g.t),ctx)}${x.o!=null?(g.t===x.o?' ✔':' ✘'):''}</span>`).join('')}</div>`).join(''):'<small style="color:#888">숨은 규칙이 발동하면 여기에 쌓여요. 누가 이득을 봤는지 보세요.</small>'}
    ${v.phase==='over'?`<div class="side-h" style="margin-top:8px">🎭 개인 규칙 공개</div>${ALL.map(i=>`<div class="rr-h">${seatEmoji(i)} <b>${seatName(i,ctx)}</b>: ${ruleText(v.rules[i])}</div>`).join('')}`:''}</div>`;
  const R=`<div class="side-box side-log"><div class="side-h">📜 진행 기록 <small>최근이 위</small></div>${v.log.slice(-60).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=`<div class="side3"><div class="side-mid">${h}</div><aside class="side-l">${L}</aside><aside class="side-r">${R}</aside></div>`;
  el.onchange=e=>{ const s=e.target.closest('[data-r]'); if(!s) return; if(s.dataset.r==='g') offG=+s.value; else draft[s.dataset.r]=s.value; ctx.rerender(); };
  el.onclick=e=>{
    const a=e.target.closest('[data-a]'); if(a&&!a.disabled){ const k=a.dataset.a;
      if(k==='rule') return ctx.act({k:'rule',...draft});
      if(k==='g3'){ picking = picking==='g3'?null:'g3'; return ctx.rerender(); }
      if(k==='guess'){ guessing=!guessing; return ctx.rerender(); }
      return ctx.act({k}); }
    const pu=e.target.closest('[data-push]'); if(pu){ picking=null; return ctx.act({k:'g3',t:+pu.dataset.push}); }
    const g=e.target.closest('[data-g]'); if(g){ guessing=false; return ctx.act({k:'guess',t:+g.dataset.g}); }
    const o=e.target.closest('[data-o]'); if(o){ const c=o.dataset.o; return ctx.act({k:'office',c,g:c==='group'?(offG||null):undefined}); }
  };
}
function status(v,ctx){ syncH(v);
  const me=HSEAT[ctx.me];
  if(v.phase==='over') return '';
  if(v.phase==='setup') return v.ready[ctx.me]?'다른 사람을 기다리는 중…':'비밀 개인 규칙을 만드세요';
  if(v.phase==='office') return v.offIdx===me?'사무소 혜택을 고르세요':'사무소 혜택을 고르는 중…';
  if(v.phase==='turn'&&v.actor===me) return v.jail[me]?'감옥 안: 탈출을 노려 굴리거나 티켓을 쓰세요':'내 차례: 주사위를 굴리세요';
  return v.fin.includes(me)?'골인! 구경 중':'다른 사람 차례…';
}
const guide=`
<p><b>6인 레이스</b>(우리 둘 + 성격 다른 컴퓨터 플레이어 4명). 12칸을 먼저 골인한 순서대로 순위가 정해져요. 혼자 하면 나머지 5명이 컴퓨터예요.</p>
<ul><li><b>📜 비밀 개인 규칙</b>: 시작할 때 "[누가] [무엇을 하면] → [누가] [어떻게]" 한 문장을 만들어요. 예) "선두가 주사위 3이 나오면 → 나 한 칸 전진". 앞뒤 주어는 달라야 해요. 발동하면 <b>결과만</b> 공개되고 주인은 비밀!</li>
<li><b>🎲 주사위</b>: 1·2·2·3·🔒감옥·🔓탈출. 감옥이 나오면 갇히고, 다음 차례에 탈출이 나오거나 🎟️ 티켓을 내야 나와요(나오면 바로 다시 굴림).</li>
<li><b>🏢 사무소</b>(3·6·9칸)에 주사위로 도착하면: 🎟️ 티켓 1장 / 🎲 한 번 더 / 📢 단체 규칙 정하기 중 하나. 규칙으로 밀려 도착하면 혜택 없음.</li>
<li><b>📢 단체 규칙</b>(하나만, 모두에게 적용): 티켓으로 특수 주사위(1·2·2·3·3·3) / 주사위 포기하고 티켓 / 티켓으로 한 명 뒤로 밀기 / 감옥에선 3도 탈출.</li>
<li>"선두·꼴찌"는 <b>단독</b>일 때만. 출발점으로는 돌아가지 않아요.</li>
<li><b>🔎 추리</b>: 숨은 규칙이 발동하면 누가 이득을 봤는지 보고 🤨 주인을 지목해 보세요. 컴퓨터 플레이어도 추리하고, 지목당하면 성격대로 시치미를 떼거나 인정해요.</li></ul>
<div class="tipbox">💡 <b>팁</b><br>· 자주 일어나는 일(주사위 1·3)을 조건으로, 나에게 이득을 결과로 걸면 꾸준히 득을 봐요. 대신 티가 나요!<br>· 끝나면 모든 개인 규칙과 추리 적중이 공개돼요.</div>`;
window.GAMES.rulerace = { _sync:x=>syncH(x), maxH:6,
  title:'규칙 레이스', ref:'데블스 플랜 「규칙 레이스」', emoji:'🏁', tags:['레이스','추리','NPC','두뇌서바이벌'],
  tagline:'우리 둘 + 컴퓨터 4명. 비밀 규칙 한 줄로 판을 비트는 주사위 레이스, 숨은 규칙의 주인을 추리하라.',
  guide, init, apply, mask, ai, render, status, step, stepDelay, noPersona:true, wide:true,
  aiDelay:()=>1200+Math.random()*1500,
  reset(){ picking=null; guessing=false; sig=''; },
  bar:(v,i)=>{ const seat=HSEAT[i]; return `<span class="tag">📍${v.pos[seat]} · 🎟️${v.tk[seat]}${v.jail[seat]?' · 🔒':''}</span>`; },
  result:(v,ctx)=>{ const k=(v.rank||[]).indexOf(HSEAT[ctx.me]); return k>=0?`${k+1}등`:''; },
};
})();
