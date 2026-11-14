(function(){
'use strict';
/* 중간 달리기 (더 지니어스 시즌 3 · 3회 메인 매치) — 6인(우리 둘 + NPC 4명).
   11명의 캐릭터 중 하나씩 골라(드래프트) 25칸을 달림. 각자 1~4 카드 4장(점프는 0~4 다섯 장), 한 장씩 내고 그만큼 전진, 다 쓰면 새로 받음.
   차례는 캐릭터 번호 순. 1등·꼴찌는 데스매치(0점), 2등·5등은 블랙가넷(2점), 3·4등은 가넷(1점).
   능력이 서로 연쇄(이동으로 다른 능력이 발동하면 그것부터, 같은 때는 캐릭터 번호 순). 지목 능력은 같은 사람을 연달아 못 고름, 골인하면 능력·지목 대상에서 빠짐.
   원작 30칸·11인을 6인에 맞게 25칸으로 줄임. 패는 낸 카드로 다 짐작되므로 공개, 단 딜리트가 남긴 1장은 딜리트와 본인만 앎. */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로, 나머지는 NPC */
const N=6, GOAL=25, MAXR=40; let HSEAT=[0,3]; const SEATORD=[0,3,1,4,2,5];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i), ALL=[...Array(N).keys()];
const nm=i=>`{s${i}}`;
const CH=[
  {n:'그래비티',e:'🧲',d:'내 차례에 카드 1장을 버리고 이동 대신 한 명을 끌어당겨요 — 앞사람은 내 <b>1칸 앞</b>으로, 뒷사람은 내 <b>1칸 뒤</b>로.'},
  {n:'리셋',e:'🔄',d:'내 말이 <b>뒤로</b> 움직일 때마다 한 명의 패를 새 패(1~4)로 되돌려요.'},
  {n:'푸시',e:'👐',d:'나와 <b>같은 칸</b>에 누가 오면(내가 가도) 그 사람을 1칸 앞이나 뒤로 밀어내요. 출발선에선 안 돼요.'},
  {n:'딜리트',e:'✂️',d:'<b>남의 능력</b>으로 내가 움직이면 한 명의 패를 보고 <b>1장만 남기고</b> 지워요.'},
  {n:'위드',e:'🤝',d:'패의 <b>마지막 카드</b>를 낼 때 한 명을 데리고 같은 칸 수만큼 함께 전진해요.'},
  {n:'유니온',e:'🧷',d:'내 <b>바로 1칸 앞</b>에 있는 사람을 내 칸으로 끌어와요(자동). 출발선에선 안 돼요.'},
  {n:'원',e:'1️⃣',d:'누가 <b>1 카드</b>를 내면, 그 사람보다 먼저 1칸 앞이나 뒤로 움직여요.'},
  {n:'미러',e:'🪞',d:'<b>남의 능력</b>으로 내가 움직이면 한 명을 같은 칸 수만큼 <b>반대로</b> 움직여요.'},
  {n:'점프',e:'🦘',d:'카드가 <b>0~4 다섯 장</b>. 내 카드로 갈 때 사람이 있는 칸은 세지 않고 건너뛰어요.'},
  {n:'사일런스',e:'🤫',d:'내 차례 시작에 한 명의 능력을 <b>내 다음 차례까지</b> 꺼요.'},
  {n:'퀵',e:'⚡',d:'앞으로 갈 땐 카드 숫자 <b>2배</b>! 단 한 패에서 앞으로는 <b>2장까지</b>, 나머지는 뒤로(1배).'},
];
const PTS=[0,2,1,1,2,0], UT=[-10,3,1,1,3,-10];
const RK=['1등','2등','3등','4등','5등','6등'], PRZ=['💀 데스매치','💎 블랙가넷','🟢 가넷','🟢 가넷','💎 블랙가넷','💀 데스매치'];
/* 시뮬레이션으로 잰 캐릭터 평균 득점(NPC 드래프트 선호) */
const BV=[1.07,.87,1.14,1.10,1.00,.76,1.25,.98,.79,1.07,1.00];
const STYLE={seojin:'logic', doyun:'warm', haram:'calm', yuna:'emo', minho:'sly', taekyung:'hot', jihu:'sly', soyul:'warm'};
const DEF_P={talk:.5,aggr:.5,trust:.5,bluff:.4,logic:.6,temper:.4};
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
const LINES={
  logic:{pick:['{c}, 번호 순서까지 생각한 선택이에요.','{c}로 갈게요. 계산이 제일 잘 서요.','{c}. 이 판에선 이게 효율적이에요.'],
    aim:['{t}, 계산상 이게 최선이에요.','{t} 쪽으로 쓰는 게 맞아요.','{t}, 개인적인 감정은 없어요.','이번엔 {t}. 순위표를 보면 답이 나와요.'],
    hit:['{t}… 이유가 있겠죠. 기억해 둘게요.','계산에 없던 수네요, {t}.','{t}, 그 수는 저도 읽고 있었어요.','{t}의 선택, 이해는 해요.'],
    first:['1등… 마지막 연쇄를 못 읽었어요.','이건 예상 밖이네요. 데스매치 준비할게요.'],
    safe:['{r}, 계산대로예요.','{r}으로 들어왔어요. 됐어요.','{r}. 필요한 만큼만 달렸어요.'],
    last:['꼴찌… 마지막 수를 잘못 읽었어요.'],
    react:['{t} 1등이네요. 판이 정리됐어요.','{t} 먼저 들어갔네요. 이제 꼴찌 싸움이에요.','결국 {t}… 흐름상 그럴 만했어요.']},
  warm:{pick:['저는 {c} 할게요~ 😊','{c} 귀엽네요, 이걸로!','음… {c}로 할게요 🤝'],
    aim:['{t}, 미안해요 ㅠㅠ','{t}… 진짜 어쩔 수 없었어요 🙏','{t} 미워서 그런 거 아니에요!','{t}, 이번 한 번만요 😢'],
    hit:['{t}… 저한테 왜요 😢','아 {t}, 너무해요~','{t}! 저 믿었는데 ㅠㅠ','헉 {t}, 살살 해요 🥲'],
    first:['헉 제가 1등이에요?! 😭','안 돼… 1등 싫어요 ㅠㅠ'],
    safe:['{r}! 살았다 😊','휴~ {r}이에요 🤗','{r}! 다들 고마워요 🙏'],
    last:['꼴찌… 데스매치 가야 해요 😢'],
    react:['어떡해 {t} 1등이에요 😢','{t} 괜찮아요?! 🥺','{t}… 힘내요 🙏']},
  calm:{pick:['…{c}.','{c}로.','{c}. 됐어요.'],
    aim:['…{t}.','{t}. 미안.','…{t}, 당신이에요.'],
    hit:['…{t}.','…그렇게 나오는군요, {t}.','{t}. 알겠어요.'],
    first:['…1등. 어쩔 수 없죠.','…데스매치네요.'],
    safe:['…{r}.','{r}. 괜찮아요.','…{r}, 충분해요.'],
    last:['…꼴찌. 다음에 갚을게요.'],
    react:['…{t} 1등.','{t}, 수고했어요.','…{t}.']},
  emo:{pick:['{c}!! 이거 할래요!!','저 {c}요! 뺏지 마요 🥺','{c}!! 느낌 왔어요!!'],
    aim:['{t}!! 미안해요!!','{t} 각오해요!! 😤','{t}!! 이건 진짜 살려고 하는 거예요!!','{t} 미안미안미안 🙏'],
    hit:['{t}!!! 왜 저예요!! 😭','아 {t} 진짜!!','{t}, 이러기예요?! 😡','{t}!! 잊지 않을 거예요 😤'],
    first:['으아악 1등이에요!! 😭','왜 제가 먼저 들어가요!! 안 돼!!'],
    safe:['{r}!!! 살았어요!! 🥳','{r}!! 진짜 다행이다 😭','{r}이에요!! 꺄 🎉'],
    last:['꼴찌라니!! 말도 안 돼!! 😭'],
    react:['헉 {t} 1등!! 😱','{t}!!! 어떡해!!','대박 {t} 1등이에요!!']},
  sly:{pick:['{c}~ 재밌는 거 할래요 😏','{c}. 다들 조심하세요 😏','저는 {c}로 갈게요~ 😏'],
    aim:['{t}~ 앞으로 가 주세요 😏','{t}, 이 판 주인공 하세요 😏','{t}~ 미안해요, 별로 안 미안하지만 😏','{t} 차례예요 😏'],
    hit:['{t}~ 그렇게 나온다 이거죠 😏','오 {t}, 재밌네요 😏','{t}, 그거 나중에 돌려받을게요 😏','{t}~ 다 계산했어요? 😏'],
    first:['1등이라… 이건 좀 계산 밖이네요 😅','허, 제가 1등이요? 😅'],
    safe:['{r}~ 예상대로 😏','{r}. 다들 수고했어요 😏','{r}이에요~ 😏'],
    last:['꼴찌라니… 이번엔 제가 당했네요 😅'],
    react:['{t} 1등~ 축하해요 😏','{t}, 데스매치 잘 다녀와요 😏','ㅋㅋ {t} 1등']},
  hot:{pick:['{c}! 이걸로 밀어붙여요 🔥','{c} 내 거! 🔥','{c}로 간다!'],
    aim:['{t}, 비켜요! 🔥','{t}! 받아요!','{t}, 정면승부예요 🔥','{t}! 이걸로 끝내요!'],
    hit:['{t}! 두고 봐요 😤','{t}!! 그걸 저한테?! 🔥','아 {t} 진짜! 갚아 줄게요','{t}! 이거 기억해요 😤'],
    first:['1등?! 이게 말이 돼요?! 😤','아 1등이라니!! 🔥'],
    safe:['{r}! 됐어! 🔥','{r}이다! 🔥','{r}! 깔끔하게!'],
    last:['꼴찌라니!! 데스매치에서 보자고요 🔥'],
    react:['{t} 1등! ㅋㅋ','{t}, 데스매치 가요!','오 {t} 1등이네요!']},
};
const jo=(w,a,b)=>{ const c=w.charCodeAt(w.length-1); return c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28?a:b; };
function lineOf(s,i,kind,o){ const st=STYLE[P(s,i).id]||'calm', L=(LINES[st]||LINES.calm)[kind]; if(!L) return ''; const used=(s.used[i]=s.used[i]||[]);
  const pool=L.filter(x=>!used.includes(x)); if(!pool.length) return ''; const raw=U.pick(pool); used.push(raw); o=o||{};
  return raw.replace(/\{c\}로/g,o.c!=null?CH[o.c].n+jo(CH[o.c].n,'으로','로'):'').replace(/\{c\}/g,o.c!=null?CH[o.c].n:'').replace(/\{r\}으로/g,o.r!=null?RK[o.r]+'으로':'').replace(/\{r\}이에요/g,o.r!=null?RK[o.r]+'이에요':'').replace(/\{r\}/g,o.r!=null?RK[o.r]:'').replace(/\{t\}/g,o.t!=null?nm(o.t):''); }
function say(s,i,kind,o){ if(s.auto||isH(i)) return; const t=lineOf(s,i,kind,o); if(t){ s.say={seat:i,text:t,n:(s.say?s.say.n:0)+1}; s.log.push(`💬 ${nm(i)}: ${t}`); } }
function talk(s,i,kind,o){ if(s.auto||isH(i)) return; s.tq.push({i,kind,o}); }

/* ── 규칙 엔진 (실제 판과 시뮬레이션이 같은 코드를 씀) ── */
const full=(s,i)=>s.ch[i]===8?[0,1,2,3,4]:[1,2,3,4];
const alive=(s,i)=>s.fin.indexOf(i)<0;
const seatOf=(s,c)=>{ for(let i=0;i<N;i++) if(s.ch[i]===c) return i; return -1; };
const on=(s,i,c)=>i>=0&&s.ch[i]===c&&alive(s,i)&&s.sil!==i;
const occ=(s,p,ex)=>{ for(let j=0;j<N;j++) if(j!==ex&&alive(s,j)&&s.pos[j]===p) return true; return false; };
const cur=s=>s.order[s.ti];
const targets=(s,i)=>ALL.filter(j=>j!==i&&alive(s,j)&&s.lt[i]!==j);
function lg(s,t){ if(!s.auto) s.log.push(t); }
function key(s,t){ if(!s.auto) s.key.push(`${s.round}바퀴 · ${t}`); }

function doMove(s,e){ const x=e.x; if(!alive(s,x)) return; const from=s.pos[x]; let to;
  if(e.jump&&e.d>0){ let p=from,k=e.d; while(k>0){ p++; if(p>=GOAL||!occ(s,p,x)) k--; } to=p; } else to=from+e.d;
  to=Math.max(0,Math.min(GOAL,to)); const d=to-from;
  if(!s.auto) s.last={x,from,to,by:e.by,why:e.why||''};
  if(d===0){ lg(s,`· ${nm(x)} 제자리 (${from}칸)${e.why?' · '+e.why:''}`); return; }
  s.pos[x]=to;
  lg(s,`${d>0?'▶':'◀'} ${nm(x)} ${from} → ${to>=GOAL?'🏁':to+'칸'}${e.why?' · '+e.why:''}`);
  if(!s.auto){ s.notice=`${d>0?'▶':'◀'} ${nm(x)} ${from} → ${to>=GOAL?'🏁 골인':to+'칸'}${e.why?' ('+e.why+')':''}`; if(e.cause!=='card'&&Math.abs(d)>=2) key(s,`${nm(x)} ${from}→${to} (${e.why||'능력'})`); }
  if(to>=GOAL){ finish(s,x); return; }
  const T=[];
  if(e.cause==='abil'&&e.by!==x){ if(on(s,x,3)) T.push({k:'ask',seat:x,kind:'del',c:3}); if(on(s,x,7)) T.push({k:'ask',seat:x,kind:'mir',d,c:7}); }
  if(d<0&&on(s,x,1)) T.push({k:'ask',seat:x,kind:'rst',c:1});
  const ps=seatOf(s,2); if(on(s,ps,2)&&s.pos[ps]>0){
    if(x===ps){ for(let j=0;j<N;j++) if(j!==ps&&alive(s,j)&&s.pos[j]===s.pos[ps]&&!s.pushed[j]){ s.pushed[j]=1; T.push({k:'ask',seat:ps,kind:'push',x:j,c:2}); } }
    else if(s.pos[x]===s.pos[ps]&&!s.pushed[x]){ s.pushed[x]=1; T.push({k:'ask',seat:ps,kind:'push',x,c:2}); } }
  const us=seatOf(s,5); if(on(s,us,5)&&s.pos[us]>0) for(let j=0;j<N;j++) if(j!==us&&alive(s,j)&&s.pos[j]===s.pos[us]+1&&!s.pulled[j]){ s.pulled[j]=1; T.push({k:'mv',x:j,d:-1,cause:'abil',by:us,why:'🧷 유니온',c:5}); }
  T.sort((a,b)=>a.c-b.c); s.fx.unshift(...T); }
function finish(s,x){ s.fin.push(x); const r=s.fin.length-1; if(s.ch[x]===9) s.sil=null;
  s.fx=s.fx.filter(f=>!(f.k==='ask'&&f.seat===x));
  if(s.auto) return; s.notice=`🏁 ${nm(x)} ${RK[r]} 골인! — ${PRZ[r]}`; lg(s,`🏁 ${nm(x)} ${RK[r]} 골인 (${PRZ[r]})`); key(s,`${nm(x)} ${RK[r]} 골인`);
  if(r===0){ talk(s,x,'first'); U.shuffle(ALL.filter(j=>j!==x&&!isH(j))).slice(0,2).forEach(j=>{ if(Math.random()<.4+P(s,j).talk*.5) talk(s,j,'react',{t:x}); }); }
  else if(Math.random()<.65) talk(s,x,'safe',{r}); }
function endCheck(s){ if(s.fin.length<N-1&&!(s.round>MAXR)) return false;
  ALL.filter(i=>alive(s,i)).sort((a,b)=>s.pos[b]-s.pos[a]||s.ch[a]-s.ch[b]).forEach(i=>s.fin.push(i));
  s.phase='final'; s.fx=[]; s.ask=null; s.turn=null;
  if(!s.auto){ const l=s.fin[N-1]; s.notice=`🎙️ 경주 끝! 꼴찌는 ${nm(l)} — 1등 ${nm(s.fin[0])}와 함께 데스매치`; lg(s,`🏁 ${nm(l)} 6등 (💀 데스매치)`); talk(s,l,'last'); }
  return true; }
function askOpts(s,a){ const i=a.seat;
  switch(a.kind){ case 'one': return s.pos[i]>0?[1,-1,0]:[1,0];
    case 'push': return [1,-1,0];
    case 'del': case 'rst': case 'mir': case 'with': return [-1,...targets(s,i)];
    case 'delk': return [...new Set(s.hand[a.t])]; }
  return [0]; }
function askValid(s,a){ if(a.kind==='with') return true; const i=a.seat; if(!alive(s,i)||s.sil===i) return false;
  if(a.kind==='push') return alive(s,a.x)&&s.pos[a.x]===s.pos[i]&&s.pos[i]>0;
  if(a.kind==='delk') return alive(s,a.t)&&s.hand[a.t].length>1;
  return askOpts(s,a).length>1; }
function resolveAsk(s,a,v){ const i=a.seat;
  if(a.kind==='one'){ if(v) s.fx.unshift({k:'mv',x:i,d:v,cause:'self',by:i,why:'1️⃣ 원'}); else lg(s,`1️⃣ ${nm(i)} 원 능력 안 씀`); return; }
  if(a.kind==='push'){ if(v) s.fx.unshift({k:'mv',x:a.x,d:v,cause:'abil',by:i,why:'👐 푸시'}); else lg(s,`👐 ${nm(i)} 밀지 않음`); if(v&&!s.auto) talk(s,a.x,'hit',{t:i}); return; }
  if(a.kind==='with'){ const mv={k:'mv',x:i,d:a.d,cause:'card',by:i,why:a.why||''};
    if(v>=0){ s.lt[i]=v; const tv={k:'mv',x:v,d:a.d,cause:'abil',by:i,why:'🤝 위드'}; const first=(s.pos[v]>s.pos[i]||(s.pos[v]===s.pos[i]&&s.ch[v]<s.ch[i]))?[tv,mv]:[mv,tv]; s.fx.unshift(...first);
      lg(s,`🤝 ${nm(i)} → ${nm(v)} 데리고 ${a.d}칸`); if(!s.auto){ say(s,i,'aim',{t:v}); talk(s,v,'hit',{t:i}); } }
    else s.fx.unshift(mv); return; }
  if(v==null||v<0){ if(a.kind!=='delk') lg(s,`${CH[s.ch[i]].e} ${nm(i)} 능력 안 씀`); return; }
  if(a.kind==='del'){ s.lt[i]=v; s.fx.unshift({k:'ask',seat:i,kind:'delk',t:v,c:3}); lg(s,`✂️ ${nm(i)} → ${nm(v)}의 패를 봐요`); if(!s.auto) say(s,i,'aim',{t:v}); return; }
  if(a.kind==='delk'){ s.hand[a.t]=[v]; s.hid[a.t]=[a.t,i]; lg(s,`✂️ ${nm(a.t)} 패가 1장만 남았어요 (무엇인지는 비밀)`); if(!s.auto){ key(s,`✂️ ${nm(i)} → ${nm(a.t)} 패를 1장으로`); talk(s,a.t,'hit',{t:i}); } return; }
  if(a.kind==='rst'){ s.lt[i]=v; s.hand[v]=full(s,v); s.qf[v]=0; delete s.hid[v]; lg(s,`🔄 ${nm(i)} → ${nm(v)} 패를 새로`); if(!s.auto) say(s,i,'aim',{t:v}); return; }
  if(a.kind==='mir'){ s.lt[i]=v; s.fx.unshift({k:'mv',x:v,d:-a.d,cause:'abil',by:i,why:'🪞 미러'}); if(!s.auto){ say(s,i,'aim',{t:v}); talk(s,v,'hit',{t:i}); } return; }
}
function doTurn(s,i,a){ if(!a) return '알 수 없는 동작';
  const h=s.hand[i], ix=h.indexOf(a.c); if(ix<0) return '없는 카드예요';
  let sil=a.sil==null?-1:a.sil;
  if(s.ch[i]===9&&alive(s,i)){ if(sil>=0&&!targets(s,i).includes(sil)) return '그 사람은 지금 고를 수 없어요'; }
  if(a.k==='grav'){ if(!on(s,i,0)) return '그래비티가 아니에요'; if(!targets(s,i).includes(a.t)) return '그 사람은 고를 수 없어요'; if(s.pos[a.t]===s.pos[i]) return '같은 칸은 끌 수 없어요'; }
  else if(a.k==='play'){ if(a.dir<0&&!on(s,i,10)) return '뒤로는 퀵만'; if(on(s,i,10)&&a.dir>0&&s.qf[i]>=2) return '이번 패에서 앞으로는 2장까지예요'; }
  else return '알 수 없는 동작';
  s.pushed={}; s.pulled={}; s.chain=0;
  if(s.ch[i]===9){ const old=s.sil; s.sil=sil>=0?sil:null; if(sil>=0){ s.lt[i]=sil; lg(s,`🤫 ${nm(i)} → ${nm(sil)} 능력 봉인`); if(!s.auto){ talk(s,sil,'hit',{t:i}); } } else if(old!=null) lg(s,`🤫 ${nm(i)} 봉인 풀기`); }
  h.splice(ix,1); delete s.hid[i]; const last=h.length===0;
  if(a.k==='grav'){ const t=a.t, to=s.pos[t]>s.pos[i]?s.pos[i]+1:Math.max(0,s.pos[i]-1); s.lt[i]=t;
    lg(s,`🧲 ${nm(i)} 카드 ${a.c} 버리고 ${nm(t)} 끌어당김`); s.fx.push({k:'mv',x:t,d:to-s.pos[t],cause:'abil',by:i,why:'🧲 그래비티'});
    if(!s.auto){ say(s,i,'aim',{t}); talk(s,t,'hit',{t:i}); } }
  else { const q=on(s,i,10), dir=q?(a.dir<0?-1:1):1, dist=a.c*(q&&dir>0?2:1); if(q&&dir>0) s.qf[i]++;
    lg(s,`🃏 ${nm(i)} ${a.c}${q?(dir>0?' ×2 앞으로':' 뒤로'):''}`);
    if(a.c===1){ const os=seatOf(s,6); if(os!==i&&on(s,os,6)) s.fx.push({k:'ask',seat:os,kind:'one',by:i,c:6}); }
    const why=q?'⚡ 퀵':on(s,i,8)?'🦘 점프':'';
    if(on(s,i,4)&&last) s.fx.push({k:'ask',seat:i,kind:'with',d:dist,why,c:4});
    else s.fx.push({k:'mv',x:i,d:dist*dir,cause:'card',by:i,jump:on(s,i,8)&&dir>0,why}); }
  if(last){ s.hand[i]=full(s,i); s.qf[i]=0; }
  s.acted=true; s.think=null; if(!s.auto) s.turn=null; return null; }
function nextTurn(s){ s.acted=false; s.think=null;
  if(endCheck(s)) return;
  let k=0; do{ s.ti++; if(s.ti>=s.order.length){ s.ti=0; s.round++; } k++; } while(!alive(s,cur(s))&&k<20);
  if(endCheck(s)) return;
  if(!s.auto){ const i=cur(s); s.turn=isH(i)?pOf(i):null; s.notice=`${CH[s.ch[i]].e} ${nm(i)} 차례 (${s.round}바퀴)`; } }
function procFx(s,dec){ const e=s.fx[0];
  if(e.k==='mv'){ s.fx.shift(); doMove(s,e); }
  else { s.fx.shift(); if(askValid(s,e)) resolveAsk(s,e,dec(s,e)); else if(e.kind==='with') resolveAsk(s,e,-1); }
  if(++s.chain>80) s.fx=[]; endCheck(s); }

/* ── 시뮬레이션용 빠른 판 ── */
const LIGHT={ turn(s,i){ const h=s.hand[i]; const c=h[Math.random()*h.length|0]; const a={k:'play',c,dir:1};
    if(on(s,i,10)) a.dir=s.qf[i]>=2?-1:(Math.random()<.7?1:-1);
    if(s.ch[i]===9){ const t=targets(s,i); a.sil=t.length&&Math.random()<.7?t[Math.random()*t.length|0]:-1; }
    if(on(s,i,0)&&Math.random()<.2){ const t=targets(s,i).filter(j=>s.pos[j]!==s.pos[i]); if(t.length) return {k:'grav',c,t:t[Math.random()*t.length|0]}; }
    return a; },
  ask(s,e){ const o=askOpts(s,e); return o[Math.random()*o.length|0]; } };
function simClone(s,me){ const hid={}; for(const k in s.hid) hid[k]=s.hid[k];
  return {phase:'race',auto:true,ch:s.ch,pos:s.pos.slice(),fin:s.fin.slice(),qf:s.qf.slice(),sil:s.sil,lt:s.lt.slice(),hid,order:s.order,ti:s.ti,round:s.round,acted:s.acted,fx:s.fx.slice(),pushed:Object.assign({},s.pushed),pulled:Object.assign({},s.pulled),chain:s.chain|0,
    hand:s.hand.map((h,j)=>{ if((s.hid[j]&&s.hid[j].indexOf(me)<0)||h.some(x=>x==null)){ const f=full(s,j); return [f[Math.random()*f.length|0]]; } return h.slice(); })}; }
function autoRun(s,pol){ let g=0; while(s.phase==='race'&&g++<3000){ if(s.fx.length){ procFx(s,pol.ask); continue; } if(!s.acted){ const i=cur(s); if(doTurn(s,i,pol.turn(s,i))) doTurn(s,i,{k:'play',c:s.hand[i][0],dir:s.qf[i]>=2?-1:1}); continue; } nextTurn(s); } }
const utilOf=(c,i)=>UT[c.fin.indexOf(i)];
function evalTurn(s,i,a,K){ let t=0; for(let k=0;k<K;k++){ const c=simClone(s,i); if(doTurn(c,i,a)) return -1e9; autoRun(c,LIGHT); t+=utilOf(c,i); } return t/K; }
function evalAsk(s,e,v,K){ let t=0; for(let k=0;k<K;k++){ const c=simClone(s,e.seat); c.fx.shift(); resolveAsk(c,e,v); autoRun(c,LIGHT); t+=utilOf(c,e.seat); } return t/K; }
function turnCands(s,i){ const C=[], cards=[...new Set(s.hand[i])].filter(x=>x!=null), q=on(s,i,10);
  cards.forEach(c=>{ if(q){ if(s.qf[i]<2) C.push({k:'play',c,dir:1}); C.push({k:'play',c,dir:-1}); } else C.push({k:'play',c,dir:1}); });
  if(on(s,i,0)) targets(s,i).filter(j=>s.pos[j]!==s.pos[i]).forEach(t=>C.push({k:'grav',c:Math.min(...cards),t}),);
  if(s.ch[i]===9&&alive(s,i)){ const so=[-1,...targets(s,i)]; return C.flatMap(a=>so.map(t=>Object.assign({},a,{sil:t}))); }
  return C; }
const Kof=lvl=>lvl>=2?18:lvl===1?8:3;
/* 쉬움: 사람 같은 실수 — 순위만 보고 단순하게(앞서면 작은 카드, 뒤처지면 큰 카드), 능력은 기분대로 */
function naiveTurn(s,i){ const h=s.hand[i].filter(x=>x!=null), al=ALL.filter(j=>alive(s,j)); const avg=al.reduce((a,j)=>a+s.pos[j],0)/al.length; const c=s.pos[i]>avg?Math.min(...h):Math.max(...h);
  const a={k:'play',c,dir:on(s,i,10)&&s.qf[i]>=2?-1:1}; if(s.ch[i]===9){ const t=targets(s,i); a.sil=t.length?U.pick(t):-1; } return a; }
function chooseTurn(s,i,lvl){ if(lvl===0&&Math.random()<.55) return naiveTurn(s,i);
  const C=turnCands(s,i), K=Kof(lvl); let best=C[0], bv=-1e9;
  for(const a of C){ let v=evalTurn(s,i,a,K); if(lvl<2) v+=(Math.random()-.5)*(lvl===1?.6:2); if(v>bv){ bv=v; best=a; } }
  return best; }
function chooseAsk(s,e,lvl){ const o=askOpts(s,e); if(o.length===1) return o[0]; if(lvl===0&&Math.random()<.5) return U.pick(o);
  const K=Kof(lvl)+4; let best=o[0], bv=-1e9; for(const v of o){ let x=evalAsk(s,e,v,K); if(lvl<2) x+=(Math.random()-.5)*(lvl===1?.6:2); if(x>bv){ bv=x; best=v; } } return best; }
const npcLvl=(s,i)=>P(s,i).logic>=.7?2:1;
function npcPickChar(s,i){ const p=P(s,i), free=CH.map((_,c)=>c).filter(c=>!s.ch.includes(c));
  const bias={0:p.aggr,2:p.aggr,9:p.logic,3:p.logic,7:p.logic,4:p.trust,5:p.trust,10:p.temper,8:p.bluff,6:p.bluff,1:p.trust};
  let best=free[0], bv=-1e9; free.forEach(c=>{ const v=BV[c]*p.logic*1.5+(bias[c]||0)*.6+Math.random()*.9; if(v>bv){ bv=v; best=c; } }); return best; }

/* ── 판 진행 ── */
function init(starter,o){ const k=Math.max(2,Math.min(6,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  const s={phase:'intro', who:{}, starter:starter|0, ch:Array(N).fill(-1), pos:Array(N).fill(0), hand:ALL.map(()=>[]), fin:[], qf:Array(N).fill(0), sil:null, lt:Array(N).fill(null), hid:{},
    dorder:U.shuffle(ALL.slice()), dk:0, order:[], ti:0, round:0, acted:false, think:null, fx:[], ask:null, chain:0, pushed:{}, pulled:{}, last:null,
    tq:[], say:null, used:{}, log:[], key:[], turn:null, winner:null, ev:0, notice:'🎙️ 메인 매치 「중간 달리기」 — 1등도, 꼴찌도 되지 마세요'};
  s.hs=HSEAT.slice(); const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=ids[k]);
  return s; }
function startDraft(s){ s.phase='draft'; s.dk=0; s.notice=`🎙️ 캐릭터 고르기 — 고르는 순서: ${s.dorder.map(nm).join(' → ')}`; s.log.push(s.notice); setDraftTurn(s); }
function setDraftTurn(s){ const i=s.dorder[s.dk]; s.turn=isH(i)?pOf(i):null; }
function pick(s,i,c){ s.ch[i]=c; s.log.push(`${CH[c].e} ${nm(i)} → ${c+1}번 ${CH[c].n}`); s.notice=`${CH[c].e} ${nm(i)}: ${c+1}번 「${CH[c].n}」`; if(Math.random()<.75) say(s,i,'pick',{c});
  s.dk++; if(s.dk>=N){ s.phase='go'; s.turn=null; } else setDraftTurn(s); }
function startRace(s){ s.order=ALL.slice().sort((a,b)=>s.ch[a]-s.ch[b]); s.hand=ALL.map(i=>full(s,i)); s.ti=0; s.round=1; s.phase='race'; s.acted=false;
  const i=cur(s); s.turn=isH(i)?pOf(i):null; s.notice=`🎙️ 출발! 차례는 캐릭터 번호 순 — ${CH[s.ch[i]].e} ${nm(i)}부터`; s.log.push(`🎙️ 출발 — 25칸, 차례는 ${s.order.map(j=>CH[s.ch[j]].e).join('')}`); }
function apply(s,p,a){ syncH(s); if(s.winner!=null) return '게임이 끝났어요'; if(!a) return '알 수 없는 동작'; const i=HSEAT[p];
  if(a.k==='pick'){ if(s.phase!=='draft'||s.dorder[s.dk]!==i) return '지금은 고를 차례가 아니에요'; const c=a.c|0; if(c<0||c>10||s.ch.includes(c)) return '이미 누가 골랐어요'; pick(s,i,c); s.ev++; return null; }
  if(a.k==='ans'){ if(!s.ask||s.ask.seat!==i) return '지금은 고를 게 없어요'; const e=s.ask; if(!askOpts(s,e).includes(a.v)) return '고를 수 없는 선택이에요'; s.ask=null; s.turn=null; s.fx.shift(); resolveAsk(s,e,a.v); s.ev++; return null; }
  if(a.k==='play'||a.k==='grav'){ if(s.phase!=='race'||cur(s)!==i||s.acted||s.fx.length||s.ask) return '지금은 내 차례가 아니에요'; const e=doTurn(s,i,a); if(!e) s.ev++; return e; }
  return '알 수 없는 동작'; }
function thinkMs(s,i){ const p=P(s,i); const near=s.pos[i]>=GOAL-9, abil=on(s,i,0)||s.ch[i]===9||(on(s,i,10)&&s.qf[i]<2);
  let t=near?1700:900; if(abil) t+=500; if(new Set(s.hand[i]).size===1) t=500; return t*(1.25-p.temper*.5)+Math.random()*500; }
function stepDelay(s){ syncH(s); if(s.winner!=null) return null;
  if(s.phase==='intro') return 2200; if(s.tq.length) return 1300;
  if(s.phase==='draft') return isH(s.dorder[s.dk])?null:1100+Math.random()*900;
  if(s.phase==='go') return 1800;
  if(s.phase==='race'){ if(s.ask) return null;
    if(s.fx.length){ const e=s.fx[0]; if(e.k==='mv') return 750; if(isH(e.seat)) return 350; return 900+Math.random()*900*(1.2-P(s,e.seat).temper*.5); }
    if(!s.acted){ const i=cur(s); if(isH(i)) return null; return s.think===i?thinkMs(s,i):450; }
    return 350; }
  if(s.phase==='final') return 2800; return null; }
function step(s){ syncH(s);
  if(s.tq.length){ const t=s.tq.shift(); say(s,t.i,t.kind,t.o); s.ev++; return; }
  if(s.phase==='intro'){ startDraft(s); s.ev++; return; }
  if(s.phase==='draft'){ const i=s.dorder[s.dk]; if(isH(i)) return; pick(s,i,npcPickChar(s,i)); s.ev++; return; }
  if(s.phase==='go'){ startRace(s); s.ev++; return; }
  if(s.phase==='race'){ if(s.ask) return;
    if(s.fx.length){ const e=s.fx[0];
      if(e.k==='ask'&&askValid(s,e)&&isH(e.seat)){ if(askOpts(s,e).length>1){ s.ask=e; s.turn=pOf(e.seat); s.notice=`${CH[s.ch[e.seat]].e} ${nm(e.seat)} 능력 발동 — 고르는 중`; s.ev++; return; } }
      procFx(s,(ss,ee)=>chooseAsk(ss,ee,npcLvl(ss,ee.seat))); s.ev++; return; }
    if(!s.acted){ const i=cur(s); if(isH(i)) return; if(s.think!==i){ s.think=i; s.notice=`💭 ${CH[s.ch[i]].e} ${nm(i)} 고민 중…`; s.ev++; return; }
      const a=chooseTurn(s,i,npcLvl(s,i)); if(doTurn(s,i,a)) doTurn(s,i,{k:'play',c:s.hand[i][0],dir:s.qf[i]>=2?-1:1}); s.ev++; return; }
    nextTurn(s); s.ev++; return; }
  if(s.phase==='final'){ s.phase='over'; const ra=s.fin.indexOf(HSEAT[0]), rb=s.fin.indexOf(HSEAT[1]); const a=PTS[ra], b=PTS[rb];
    s.winner=a>b?0:b>a?1:'both'; { const V=h=>PTS[s.fin.indexOf(h)], bv=Math.max(...HSEAT.map(V)); s.winners=HSEAT.map((h,p)=>V(h)===bv?p:-1).filter(x=>x>=0); } s.notice=`🎙️ 최종 — ${s.fin.map((i,k)=>`${k+1}. ${nm(i)}`).join(' · ')}`; s.ev++; return; }
}
function mask(s,p){ syncH(s); const v=U.clone(s), me=HSEAT[p], open=s.phase==='over'||s.phase==='final';
  if(!open) for(const j in s.hid){ if(!s.hid[j].includes(me)) v.hand[j]=s.hand[j].map(()=>null); }
  v.used={}; v.tq=[]; return v; }
function ai(v,lvl){ syncH(v); const i=HSEAT[1]; lvl=lvl==null?1:lvl;
  if(v.phase==='draft'&&v.dorder[v.dk]===i){ const free=CH.map((_,c)=>c).filter(c=>!v.ch.includes(c)); let b=free[0],bv=-9; free.forEach(c=>{ const x=BV[c]+Math.random()*(lvl===2?.1:.35); if(x>bv){bv=x;b=c;} }); return {k:'pick',c:lvl===0?U.pick(free):b}; }
  if(v.phase!=='race') return null;
  if(v.ask&&v.ask.seat===i) return {k:'ans',v:chooseAsk(v,v.ask,lvl)};
  if(cur(v)===i&&!v.acted&&!v.fx.length&&!v.ask) return chooseTurn(v,i,lvl);
  return null; }
function aiDelay(){ return 1200+Math.random()*1500; }

/* ── 화면 ── */
let WHO={}, silSel=-1, grav=false, sig='';
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}/g,(_,d)=>`${seatEmoji(+d)} ${seatName(+d,ctx)}`); }
const chip=(c,hid)=>`<span class="mr-card ${hid?'hid':''}">${c==null?'?':c}</span>`;
function askHtml(v,ctx){ const e=v.ask, me=HSEAT[ctx.me], o=askOpts(v,e), tn=j=>`${seatEmoji(j)} ${seatName(j,ctx)} <small>${v.pos[j]}칸</small>`;
  const btn=(x,label,ghost)=>`<button class="${ghost?'ghost':''}" data-ans="${x}">${label}</button>`;
  let q='', b='';
  if(e.kind==='one'){ q=`${fill(nm(e.by),ctx)} 님이 <b>1</b>을 냈어요 — 먼저 1칸 움직일까요?`; b=o.map(x=>btn(x,x>0?'▶ 1칸 앞':x<0?'◀ 1칸 뒤':'그대로',!x)).join(''); }
  else if(e.kind==='push'){ q=`${fill(nm(e.x),ctx)} 님과 같은 칸(${v.pos[me]}칸) — 밀어낼까요?`; b=o.map(x=>btn(x,x>0?'▶ 앞으로 밀기':x<0?'◀ 뒤로 밀기':'그대로',!x)).join(''); }
  else if(e.kind==='delk'){ q=`${fill(nm(e.t),ctx)} 님의 패 — <b>남길 1장</b>을 고르세요`; b=o.map(x=>btn(x,`🃏 ${x}만 남기기`)).join(''); }
  else { q=e.kind==='del'?'남의 능력으로 움직였어요 — 누구의 패를 <b>1장만 남길까요?</b>':e.kind==='rst'?'뒤로 밀렸어요 — 누구의 패를 <b>새 패</b>로 되돌릴까요?':e.kind==='mir'?`${e.d>0?'앞으로':'뒤로'} ${Math.abs(e.d)}칸 움직였어요 — 누구를 <b>${e.d>0?'뒤로':'앞으로'} ${Math.abs(e.d)}칸</b>?`:`마지막 카드(${e.d}칸) — 누구를 <b>데리고</b> 갈까요?`;
    b=o.map(x=>x<0?btn(-1,'안 씀',true):btn(x,tn(x))).join(''); }
  return `<div class="vr-card mr-ask"><b>${CH[v.ch[me]].e} ${CH[v.ch[me]].n} 능력!</b><p>${q}</p><div class="mr-btns">${b}</div></div>`; }
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{}; const me=HSEAT[ctx.me]; const sg=v.round+':'+v.ti+':'+v.phase; if(sg!==sig){ sig=sg; silSel=-1; grav=false; }
  let h=`<div class="hl-notice">${fill(U.esc(v.notice||''),ctx)}</div>`;
  h+=`<div class="vr-speech">${v.say?`<span class="w">${seatEmoji(v.say.seat)} ${seatName(v.say.seat,ctx)}</span> ${fill(U.esc(v.say.text),ctx)}`:'<i>　</i>'}</div>`;
  if(v.phase==='intro'||v.phase==='draft'){ const myPick=v.phase==='draft'&&v.dorder[v.dk]===me;
    h+=`<div class="info">고르는 순서: ${v.dorder.map((i,k)=>`<span class="${k===v.dk&&v.phase==='draft'?'mr-now':''}">${seatEmoji(i)}${seatName(i,ctx)}</span>`).join(' → ')}${myPick?' · <b>내 차례 — 캐릭터를 고르세요</b>':''}</div>`;
    h+=`<div class="mr-chars">${CH.map((c,k)=>{ const by=v.ch.indexOf(k); return `<div class="mr-chc ${by>=0?'taken':''} ${myPick&&by<0?'can':''}" ${myPick&&by<0?`data-pick="${k}"`:''}><div><b>${k+1}. ${c.e} ${c.n}</b>${by>=0?` <span class="mr-by">${seatEmoji(by)} ${seatName(by,ctx)}</span>`:''}</div><small>${c.d}</small></div>`; }).join('')}</div>`; }
  else {
    const cu=v.phase==='race'?cur(v):-1, lm=v.last;
    h+=`<div class="mr-track"><div class="mr-ruler">${Array.from({length:GOAL+1},(_,p)=>`<span>${p===GOAL?'🏁':p%5===0?p:''}</span>`).join('')}</div>`;
    (v.order.length?v.order:ALL).forEach(i=>{ const r=v.fin.indexOf(i), c=v.ch[i];
      const cells=Array.from({length:GOAL+1},(_,p)=>{ const here=v.pos[i]===p; const trail=lm&&lm.x===i&&p>=Math.min(lm.from,lm.to)&&p<=Math.max(lm.from,lm.to)&&!here;
        const others=ALL.some(j=>j!==i&&v.fin.indexOf(j)<0&&r<0&&v.pos[j]===p&&p<GOAL);
        return `<i class="${p%5===0?'f':''} ${trail?'tr':''} ${others?'o':''}">${here?`<b class="mr-pc ${isH(i)?(pOf(i)===0?'red':'blue'):''} ${lm&&lm.x===i?'mv':''}">${CH[c]?CH[c].e:'·'}</b>`:''}</i>`; }).join('');
      const hand=(v.hand[i]||[]).slice().sort((a,b)=>(a??9)-(b??9)).map(x=>chip(x,x==null)).join('');
      h+=`<div class="mr-lane ${i===cu?'cur':''} ${r>=0?'fin':''} ${i===me?'me':''}"><div class="mr-who">${seatEmoji(i)} <b>${seatName(i,ctx)}</b> <span class="mr-ch">${c+1}.${CH[c].e}${CH[c].n}</span>${v.sil===i?' <span class="mr-sil">🔇봉인</span>':''}${r>=0?` <span class="mr-rk r${r}">${RK[r]}</span>`:` <small>${v.pos[i]}칸</small>`} <span class="mr-hand">${r<0?hand:''}${c===10&&r<0?` <small>앞${v.qf[i]}/2</small>`:''}</span></div><div class="mr-strip">${cells}</div></div>`; });
    h+='</div>';
    if(v.ask&&v.ask.seat===me) h+=askHtml(v,ctx);
    else if(v.phase==='race'&&cu===me&&!v.acted&&!v.fx.length&&!v.ask){ const mc=v.ch[me], q=on(v,me,10), cards=[...new Set(v.hand[me])].sort((a,b)=>a-b);
      let p=`<div class="vr-card mr-turn"><b>내 차례 — ${CH[mc].e} ${CH[mc].n}</b> <small>${v.pos[me]}칸 · 골인까지 ${GOAL-v.pos[me]}칸</small>`;
      if(mc===9){ p+=`<p>🤫 봉인할 사람 (지난번 대상은 못 골라요)</p><div class="mr-btns">${[-1,...targets(v,me)].map(t=>`<button class="${silSel===t?'':'ghost'}" data-sil="${t}">${t<0?'안 씀':`${seatEmoji(t)} ${seatName(t,ctx)} ${CH[v.ch[t]].e}`}</button>`).join('')}</div>`; }
      if(on(v,me,0)) p+=`<div class="mr-btns"><button class="${grav?'':'ghost'}" data-grav="1">🧲 ${grav?'끌어당기기 — 대상을 고르세요':'이번엔 끌어당기기'}</button></div>`;
      if(grav&&on(v,me,0)){ p+=`<p>가장 작은 카드(${Math.min(...cards)})를 버리고, 누구를?</p><div class="mr-btns">${targets(v,me).filter(j=>v.pos[j]!==v.pos[me]).map(t=>`<button data-gt="${t}">${seatEmoji(t)} ${seatName(t,ctx)} <small>${v.pos[t]}칸 → ${v.pos[t]>v.pos[me]?v.pos[me]+1:Math.max(0,v.pos[me]-1)}칸</small></button>`).join('')}</div>`; }
      else p+=`<p>낼 카드${q?' (⚡ 앞으로 2배 — 이번 패에서 2장까지, 나머지는 뒤로)':on(v,me,8)?' (🦘 사람 있는 칸은 건너뜀)':''}</p><div class="mr-btns">${cards.map(c=> q ? `${v.qf[me]<2?`<button data-c="${c}" data-d="1">▶ ${c} (+${c*2})</button>`:''}<button class="ghost" data-c="${c}" data-d="-1">◀ ${c} (−${c})</button>` : `<button data-c="${c}" data-d="1">🃏 ${c}</button>`).join('')}</div>`;
      h+=p+'</div>'; }
    else if(v.phase==='race'&&v.ask) h+=`<div class="vr-card"><small>${fill(U.esc(v.notice),ctx)}</small></div>`;
    if(v.phase==='over'){ h+=`<div class="sn-score">${v.fin.map((i,k)=>`<div class="${isH(i)?'h':''}"><b>${k+1}. ${seatEmoji(i)} ${seatName(i,ctx)}</b> ${CH[v.ch[i]].e}${CH[v.ch[i]].n} · ${PRZ[k]} <small>(${PTS[k]}점)</small></div>`).join('')}</div>`;
      if(v.key.length) h+=`<div class="vr-card mr-key"><b>🎬 결정적 장면</b>${v.key.slice(-6).map(x=>`<div><small>${fill(U.esc(x),ctx)}</small></div>`).join('')}</div>`; }
  }
  const inPlay=v.ch.filter(c=>c>=0).sort((a,b)=>a-b);
  const L=`<div class="side-box"><div class="side-h">🏆 보상</div>${PRZ.map((z,k)=>`<div class="side-row"><small>${RK[k]}</small> ${z}${v.fin[k]!=null?` · ${seatEmoji(v.fin[k])} ${seatName(v.fin[k],ctx)}`:''}</div>`).join('')}</div>
    <div class="side-box"><div class="side-h">🦸 이번 판 캐릭터</div>${(inPlay.length?inPlay:CH.map((_,k)=>k)).map(c=>`<div class="mr-cd"><b>${c+1}. ${CH[c].e} ${CH[c].n}</b>${v.ch.indexOf(c)>=0?` ${seatEmoji(v.ch.indexOf(c))}`:''}<br><small>${CH[c].d}</small></div>`).join('')}</div>`;
  const R=`<div class="side-box side-log"><div class="side-h">📜 진행 기록 <small>최근이 위</small></div>${v.log.slice(-90).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=`<div class="side3"><div class="side-mid">${h}</div><aside class="side-l">${L}</aside><aside class="side-r">${R}</aside></div>`;
  el.onclick=e=>{ const t=e.target.closest('[data-pick],[data-ans],[data-sil],[data-grav],[data-gt],[data-c]'); if(!t) return; const d=t.dataset;
    if(d.pick!=null) return ctx.act({k:'pick',c:+d.pick});
    if(d.ans!=null) return ctx.act({k:'ans',v:+d.ans});
    if(d.sil!=null){ silSel=+d.sil; return ctx.rerender(); }
    if(d.grav!=null){ grav=!grav; return ctx.rerender(); }
    if(d.gt!=null){ const cs=v.hand[me]; return ctx.act({k:'grav',c:Math.min(...cs),t:+d.gt,sil:silSel}); }
    if(d.c!=null) return ctx.act({k:'play',c:+d.c,dir:+d.d,sil:silSel}); };
}
function status(v,ctx){ syncH(v); const me=HSEAT[ctx.me]; if(v.phase==='over') return ''; if(v.phase==='draft'&&v.dorder[v.dk]===me) return '캐릭터를 고르세요';
  if(v.ask&&v.ask.seat===me) return '능력 발동 — 고르세요'; if(v.phase==='race'&&cur(v)===me&&!v.acted&&!v.fx.length) return '내 차례 — 카드를 내세요'; return '진행 중…'; }
const guide=`
<p><b>1등도 꼴찌도 되지 마세요</b> — 6인 경주(우리 둘 + 성격 다른 컴퓨터 4명).</p>
<ol><li>먼저 11명의 <b>캐릭터</b> 중 하나씩 골라요. 차례는 캐릭터 <b>번호 순</b>.</li>
<li>각자 1~4 카드 4장. 차례마다 한 장을 내고 그만큼 전진, 4장을 다 쓰면 새로 받아요. ${GOAL}칸을 가면 골인.</li>
<li>캐릭터 <b>능력</b>이 남을 끌고 밀고, 서로 연쇄돼요(이동으로 다른 능력이 켜지면 그것부터).</li>
<li>지목 능력은 같은 사람을 <b>연달아</b> 못 골라요. 골인하면 능력도, 지목 대상도 끝.</li>
<li><b>1등·꼴찌</b>는 💀 데스매치(0점), <b>2등·5등</b>은 💎 블랙가넷(2점), 3·4등은 🟢 가넷(1점). 점수가 높은 사람이 이겨요.</li></ol>
<div class="tipbox">💡 <b>팁</b><br>· 카드는 다 쓰면 새로 받으니, 한 패를 다 쓰면 누구나 10칸 — 순위는 <b>능력</b>이 바꿔요.<br>· 앞서가는 사람을 더 앞으로 밀어 1등을 시키는 것도 전략이에요.</div>`;
function demoRace(s,chs,pos,extra){ s.ch=chs; s.order=ALL.slice().sort((a,b)=>s.ch[a]-s.ch[b]); s.hand=ALL.map(i=>full(s,i)); s.pos=pos; s.phase='race'; s.round=3; s.ti=s.order.indexOf(0); s.acted=false; s.notice=`${CH[s.ch[0]].e} {s0} 차례 (3바퀴)`; if(extra) extra(s); return s; }
const guideSteps=[
  {t:'🦸 캐릭터 고르기', h:'11명 중 하나씩 골라요. <b>번호</b>가 곧 차례 순서예요.', demo:s=>{ s.phase='draft'; s.ch=[-1,4,-1,0,-1,9]; s.dk=3; s.dorder=[1,3,5,0,2,4]; s.notice='🎙️ 캐릭터 고르기'; return s; }},
  {t:'🃏 카드 1~4', h:'한 장씩 내고 그만큼 전진. 4장을 다 쓰면 <b>새로</b> 받아요.', demo:s=>demoRace(s,[3,0,5,8,10,4],[7,9,6,8,5,10],s=>{ s.hand[0]=[2,4]; })},
  {t:'🧲 능력이 판을 뒤집어요', h:'끌어당기기, 밀기, 반대로 움직이기… 능력끼리 <b>연쇄</b>돼요.', demo:s=>demoRace(s,[7,0,5,8,10,4],[12,15,11,14,13,10],s=>{ s.last={x:0,from:15,to:12,by:1,why:'🧲 그래비티'}; s.ask={k:'ask',seat:0,kind:'mir',d:-3,c:7}; s.notice='🧲 {s1} 그래비티 → {s0} 끌어당김'; })},
  {t:'🏁 중간이 살아요', h:'<b>1등·꼴찌</b>는 데스매치, <b>2등·5등</b>은 블랙가넷!', demo:s=>demoRace(s,[3,0,5,8,10,4],[25,22,25,21,19,25],s=>{ s.fin=[2,5,0]; s.notice='🏁 {s0} 3등 골인! — 🟢 가넷'; })},
];
window.GAMES.midrace = { _sync:x=>syncH(x), maxH:6,
  title:'중간 달리기', ref:'더 지니어스 「중간 달리기」', emoji:'🏃', tags:['레이스','캐릭터','연쇄','NPC','두뇌서바이벌'],
  tagline:'1등도 꼴찌도 안 된다 — 끌고 밀고 반사하는 11명의 캐릭터 경주.',
  guide, guideSteps, init, apply, mask, ai, aiDelay, render, status, step, stepDelay, noPersona:true, wide:true,
  reset(){ silSel=-1; grav=false; sig=''; },
  bar:(v,i)=>{ const s=HSEAT[i], r=v.fin.indexOf(s); return `<span class="tag">${v.ch[s]>=0?CH[v.ch[s]].e:''} ${r>=0?RK[r]:v.pos[s]+'칸'}</span>`; },
  result:(v,ctx)=>{ const r=v.fin.indexOf(HSEAT[ctx.me]); return r>=0?`${RK[r]} · ${PTS[r]}점`:''; },
  _E:{init,startRace,doTurn,autoRun,chooseTurn,chooseAsk,procFx,nextTurn,cur,on,full,LIGHT,CH,BV,HSEAT,N,UT,PTS,npcPickChar,askOpts,askValid}, _H:HSEAT,
};
})();
