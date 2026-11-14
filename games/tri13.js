(function(){
'use strict';
/* 트라이13 (피의 게임 시즌 3 · 9일차 메인 매치) — 8인(우리 둘 + NPC 6명), 12칸 육각별 판(안쪽 6칸은 이웃 3, 꼭짓점 6칸은 이웃 1, 빈칸은 0).
   라운드마다 1~9 중 하나를 몰래 냄. 내 숫자 + 이웃 칸 숫자 합이 13 이하면 +(내 숫자 × 이웃 칸 수), 넘으면 −(내 숫자 × 이웃 칸 수).
   내기 전에 이웃끼리 "몇 낼게요" 약속(거짓말 가능). 1라운드 자리는 추첨, 2라운드부터는 직전까지 꼴찌가 모두의 자리를 정함. 5라운드 합계 1위 우승.
   원작은 세부 점수를 숨겼지만, 여기선 라운드마다 숫자와 점수를 공개(따라가기 쉽게). */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로 — 고르게 퍼지게, 나머지는 NPC */
const N=8, ROUNDS=5, CELLS=12, LIM=13; let HSEAT=[0,3]; const SEATORD=[0,3,6,1,4,7,2,5];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i), ALL=[...Array(N).keys()];
const nm=i=>`{s${i}}`;
/* 칸 0~5 안쪽(육각형), 6~11 꼭짓점(바깥 삼각형) */
const ADJ=[...Array(CELLS)].map((_,c)=> c<6 ? [(c+5)%6,(c+1)%6,c+6] : [c-6]);
const DEG=c=>ADJ[c].length;
const STYLE={seojin:'logic', doyun:'warm', haram:'calm', yuna:'emo', minho:'sly', taekyung:'hot', jihu:'sly', soyul:'warm'};
const DEF_P={talk:.5,aggr:.5,trust:.5,bluff:.4,logic:.6,temper:.4};
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
const LINES={
  logic:{say:['이웃분들, 저는 {n} 낼게요. 합 13 맞춰 봐요.','계산해 보면 저는 {n}이 맞아요.'], burned:['{t}, 약속이랑 다르네요. 기억해 둘게요.','{t}의 말은 이제 안 믿어요.'], good:['계산대로네요.','다들 약속 지켜 줘서 고마워요.'], place:['합리적으로 배치할게요.','점수 높은 분은 바깥으로 모실게요.']},
  warm:{say:['저 {n}만 낼게요~ 같이 살아요 🤝','{n} 낼게요! 믿어 주세요 😊'], burned:['{t}… 왜 그랬어요 😢','{t} 믿었는데 🥲'], good:['다들 착하다 😊','휴, 다 같이 살았다~'], place:['다들 편한 자리로 할게요 😊','미안해요, 이렇게 앉아 주세요 🙏']},
  calm:{say:['…{n}.','{n} 냅니다.'], burned:['…{t}.','…기억할게요.'], good:['…','…좋네요.'], place:['…이렇게.','…']},
  emo:{say:['저 {n}!! 진짜 {n}이에요!!','{n} 낼 거예요 믿어요 🥺'], burned:['{t} 진짜 너무해!! 😭','헐 {t} 배신자 😱'], good:['꺄 다 같이 살았다 🥳','최고예요!!'], place:['제 맘대로 할 거예요 😤','두고 봐요!']},
  sly:{say:['저는 {n}? 아마도요 😏','{n} 낼게요~ 진짜로 😏'], burned:['{t}, 나만 당할 순 없죠 😏','흠, {t} 제법이네'], good:['계획대로 😏','다들 순진하네요 😏'], place:['재밌게 앉혀 드릴게요 😏','1등은 저기 구석으로 😏']},
  hot:{say:['{n}! 무조건 {n}!','저 {n} 냅니다! 다들 낮게 내요! 🔥'], burned:['{t}! 가만 안 둬요 😤','{t} 두고 봐요 🔥'], good:['봤죠?! 🔥','좋아 좋아!'], place:['내 맘대로 한다! 🔥','다 비켜!']},
};
const XL={
  burn:['{t}, {p} 낸다더니 {n} 냈잖아요. 합 {sum} 돼서 저 {g}점이에요.','{t}! {p} 낸다고 약속했잖아요. 근데 {n}? 저만 {g}점이에요.','{t} 때문에 합이 {sum}까지 갔어요. {p} 낸다면서요!'],
  excuse:['다들 낮게 낼 줄 알았어요… 미안해요 😅','계산을 잘못했어요. 일부러는 아니에요 😓','13 안 넘을 줄 알았어요. 진짜예요.'],
  blame:['{x}이(가) 약속을 안 했잖아요. 저도 불안했어요.','저만 그런 거 아니에요. {x}도 높게 냈어요.'],
  defiant:['약속은 약속일 뿐이죠 😏 서바이벌이에요.','저도 살아야죠. 다음엔 조심하세요 😏','믿은 쪽 책임도 있어요 😏'],
  confess:['미안해요, 점수가 탐났어요. 다음엔 지킬게요.','네, 제가 욕심냈어요. 인정해요.'],
  angry:['다음 라운드에 두고 봐요 😤','{t} 말은 이제 안 믿어요.','기억해 둘게요, {t}.'],
  forgive:['사과했으니 한 번은 넘어갈게요.','다음엔 지켜요. 이번만이에요.'],
  thanks:['{t}, 약속 지켜 줘서 고마워요 🤝','{t} 덕분에 살았어요. 다음에도 같이 가요.','역시 {t}은(는) 믿을 만하네요 👍'],
  tipped:['{t}, 저를 꼭짓점에 둔 거 일부러죠?','꼭짓점이라니… {t}, 저 견제하는 거예요?'],
  placeWhy:['1등은 견제해야죠 😏','공평하게 한 거예요. 점수 높은 사람이 바깥으로.','자리는 꼴찌 마음이잖아요 😏'],
  ask:['{t}, 몇 낼 거예요? 저는 {n} 낼게요.','{t}, 우리 이웃이잖아요. 몇 낼지 말해 줘요. 저는 {n}.','{t}, 이번엔 몇이에요? 저 {n} 낼게요.'],
  outed:['다들 들어요. {t}이(가) 저랑 몰래 연합해 놓고 약속을 깼어요!','{t}, 몰래 손잡자더니! 이런 사람이에요 😡'],
  denyOut:['연합이요? 그런 적 없어요.','증거 있어요? 지어낸 얘기예요.'],
  plOK:['부탁대로 {w} 드렸어요 🤝','부탁하신 대로 {w}에 앉혔어요.','{t}, {w}이에요. 잊지 마요 😉'],
  plNo:['미안해요 {t}, 이번엔 어쩔 수 없었어요.','{t}, 부탁은 들었는데… 자리가 안 됐어요.','이번엔 제 사정이 먼저였어요 😏'],
  seatBroke:['{t}, 자리 약속 안 지켰잖아요.','{t}이(가) 약속한 자리랑 다르네요… 기억할게요.'],
  lowOK:['알겠어요, 다음엔 낮게 낼게요.','그래요. 다음 라운드는 조심할게요.','좋아요, 대신 {t}도 낮게요.'],
  lowNo:['그건 제 마음이에요 😏','글쎄요, 상황 봐서요.','{t}이(가) 먼저 낮게 내 봐요.'],
  why:['{t}, 아까 왜 그랬어요?','{t}, 약속이랑 다르게 낸 이유가 뭐예요?'],
  warnR:['{t}, 그렇게 나오면 저도 높게 낼 거예요.','경고 고마워요. 그럼 저는 낮게 갈게요.','{t}, 겁주는 거예요? 😤'],
  propOK:['좋아요, 다 같이 {n}씩!','{n}이면 다 같이 안전하죠. 찬성!','저도 {n} 낼게요 🤝'],
  propNo:['저는 제 계산대로 할게요.','{n}은 너무 낮아요. 저는 빠질게요 😏'],
  ansN:['저는 {n} 낼게요.','{n} 낼 거예요. 약속해요.','음… {n} 생각 중이에요.','{n}이면 다 같이 안전해요.','{n} 정도요. 다들 낮게 가요.'],
  reb_none:['{t}, 제가 뭘요? 약속 다 지켰어요.','근거가 뭐예요? 기록 보세요.'],
};
const OPTK=['warnR','propOK','propNo','thanks','forgive','angry','tipped','placeWhy','ask'];
const MOOD={plOK:'🤝',plNo:'😅',seatBroke:'😤',lowOK:'🙂',lowNo:'😏',why:'🧐',warnR:'😤',propOK:'🤝',propNo:'😏',warn:'😏',prop:'🤝',plea:'🙏',ansN:'🙂',burn:'😤',excuse:'😅',blame:'😒',defiant:'😏',confess:'😓',angry:'😤',forgive:'🙂',thanks:'🤝',tipped:'🤨',placeWhy:'😏',ask:'🧐',outed:'😡',denyOut:'😤',reb_none:'😤',say:'🗣️',burned:'😤',good:'😊',place:'😏',accuse:'🤨',sorry:'😓'};
function lineX(s,i,kind,o){ const L=XL[kind]; if(!L) return null; const used=(s.used[i]=s.used[i]||[]); o=o||{};
  const fl=t=>t.split('{w}').join(o.w??'').split('{t}').join(o.t!=null?nm(o.t):'').split('{x}').join(o.x!=null?nm(o.x):'다른 이웃').split('{p}').join(o.p??'').split('{n}').join(o.n??'').split('{sum}').join(o.sum??'').split('{g}').join(o.g??'');
  const c=L.map(fl).filter(t=>!used.includes(t)); if(!c.length) return null; const t=U.pick(c); used.push(t); return t; }
function talkT(s,i,text,kind,t){ if(!text) return false; s.say={seat:i,text,n:(s.say?s.say.n:0)+1,t:t??null,kind}; s.feed.push({r:s.round,seat:i,text,t:t??null,kind}); s.log.push(`💬 ${nm(i)}: ${text}`); s.mood[i]={e:MOOD[kind]||'💬',n:(s.moodN=(s.moodN||0)+1)}; return true; }
function lineOf(s,i,kind,vars){ const st=STYLE[P(s,i).id]||'calm', L=(LINES[st]||LINES.calm)[kind]||LINES.calm[kind]; if(!L) return '';
  const used=(s.used[i]=s.used[i]||[]); const pool=L.filter(x=>!used.includes(x)); if(!pool.length) return ''; const raw=U.pick(pool); used.push(raw);
  return raw.replace(/\{n\}/g,vars&&vars.n!=null?vars.n:'').replace(/\{t\}/g,vars&&vars.t!=null?nm(vars.t):''); }
function say(s,i,kind,vars){ if(isH(i)) return; const t=lineOf(s,i,kind,vars); if(t) talkT(s,i,t,kind,vars&&vars.t); }

function init(starter,o){ const k=Math.max(2,Math.min(8,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  const s={phase:'intro', who:{}, starter:starter|0, round:0, cell:Array(N).fill(-1), tot:Array(N).fill(0), pick:Array(N).fill(null), promise:Array(N).fill(null), trust:ALL.map(()=>Array(N).fill(1)),
    placer:null, gain:null, hist:[], ri:0, q:[], say:null, used:{}, log:[], feed:[], mood:{}, dq:[], dready:HSEAT.map(()=>false), dsaid:HSEAT.map(()=>0), hs:HSEAT.slice(), dm:{}, dmN:0, pact:{}, wh:{}, asked:{}, plea:{}, seatReq:{}, npcReq:{}, secretP:{}, targ:{}, lowNext:{}, aa:{}, warned:{}, turn:null, winner:null, ev:0, dlist:[], dj:0, lies:Array(N).fill(0),
    notice:'🎙️ 메인 매치 「트라이13」 — 이웃과 합쳐 13을 넘기지 마세요'};
  const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=ids[k]);
  ALL.forEach(i=>{ if(isH(i)) return; ALL.forEach(j=>{ if(i!==j) s.trust[i][j]=Math.max(.3,Math.min(1,1+NPCS.rel(s.who[i], isH(j)?(pOf(j)===0?'me':'opp'):s.who[j])*.6)); }); });
  return s;
}
const occ=(s,c)=>s.cell.indexOf(c);
const WANT_={"inner":"안쪽(×3)","tip":"꼭짓점(안전)","next":"옆자리"};
const pk=(a,b)=>a<b?a+'-'+b:b+'-'+a;
const allied=(s,a,b)=>{ const p=s.pact[pk(a,b)]; return !!(p&&p.broken==null); };
function dmPush(s,to,from,text,o){ if(!isH(to)) return; (s.dm[to]=s.dm[to]||[]).push(Object.assign({id:++s.dmN,r:s.round,from,text,state:'info'},o||{})); }
function allyOffers(s){ for(const [k,pc] of Object.entries(s.pact)){ if(pc.broken!=null) continue; const [a,b]=k.split('-').map(Number); const h=isH(a)?a:isH(b)?b:null, j=h===a?b:a; if(h==null||isH(j)||Math.random()>.55) continue;
    const u=Math.random(), nb=nbrs(s,h).includes(j);
    if(nb&&u<.45){ const n=2+(Math.random()*3|0); dmPush(s,h,j,`(연합) 우리 이웃이네요. 공개 약속이랑 별개로, 진짜로 둘 다 ${n}씩 내요 🤫`,{state:'open',kind:'secretN',n}); }
    else if(u<.75){ const want=U.pick(['inner','tip','next']); s.npcReq[j]={to:h,want}; dmPush(s,h,j,`(연합) 서로 꼴찌 되면 챙겨 주기 — 당신이 꼴찌면 저를 ${WANT_[want]}에 앉혀 줘요. 제가 꼴찌면 당신 원하는 데로 🤫`); }
    else { const top=ALL.filter(x=>x!==h&&x!==j).sort((x,y)=>s.tot[y]-s.tot[x])[0]; if(top!=null&&s.round>1) dmPush(s,h,j,`(연합) ${nm(top)} 너무 앞서가요. 꼴찌가 되면 같이 꼭짓점으로 보내요 🎯`,{state:'open',kind:'targ',x:top}); } } }
function npcWhisper(s){ allyOffers(s); for(const h of HSEAT){ if(Math.random()>.45) continue; const c=U.shuffle(ALL.filter(i=>!isH(i)&&!s.pact[pk(i,h)])).sort((a,b)=>s.trust[b][h]-s.trust[a][h])[0]; if(c==null||s.trust[c][h]<.7) continue;
  dmPush(s,h,c,U.pick(['우리 몰래 연합해요. 이웃이 되면 서로 약속 지키고, 자리 정할 땐 서로 챙겨 주기 🤫','둘이 손잡아요. 서로한텐 거짓말 안 하기, 꼴찌 되면 좋은 자리 주기 🤝']),{state:'open',kind:'pact'}); } }
const nbrs=(s,i)=>ADJ[s.cell[i]].map(c=>occ(s,c)).filter(j=>j>=0);
function randomPlace(s){ const cs=U.shuffle([...Array(CELLS).keys()]).slice(0,N); ALL.forEach((i,k)=>s.cell[i]=cs[k]); }
function startRound(s){ s.round++; s.pick=Array(N).fill(null); s.promise=Array(N).fill(null); s.gain=null; s.ri=0; s.turn=null;
  if(s.round===1){ randomPlace(s); s.q.push({k:'note',text:'🎲 1라운드 자리는 추첨으로 정했어요'}); s.q.push({k:'talk'}); }
  else { const last=ALL.slice().sort((a,b)=>s.tot[a]-s.tot[b])[0]; s.placer=last; s.q.push({k:'note',text:`🪑 지금 꼴찌 ${nm(last)}이(가) 모두의 자리를 정해요`}); s.q.push({k:'place'}); }
  s.phase='wait'; }
/* 꼴찌 NPC의 배치: 자기는 빈칸이 많은 안쪽 칸, 점수 높은 사람은 꼭짓점(이웃 1)으로 */
function npcPlace(s,i){ const cells=[...Array(CELLS).keys()]; const order=ALL.filter(j=>j!==i).sort((a,b)=>s.tot[b]-s.tot[a]); const res=Array(N).fill(-1); const used=new Set();
  const tips=U.shuffle([6,7,8,9,10,11]), inner=U.shuffle([0,1,2,3,4,5]);
  const empties=4; const myCell=inner[0]; res[i]=myCell; used.add(myCell);
  const keepEmpty=new Set(ADJ[myCell]); /* 내 이웃 칸은 되도록 비워 둠 */
  for(const j of order){ const friend=s.pact&&allied(s,i,j)&&!(P(s,i).bluff>.7&&Math.random()<.4), foe=s.trust&&s.trust[i]&&s.trust[i][j]<.5; const pref = friend ? inner.concat(tips) : (foe||s.tot[j]>=s.tot[i]) ? tips.concat(inner) : inner.concat(tips); let c=pref.find(x=>!used.has(x)&&!keepEmpty.has(x)); if(c==null) c=pref.find(x=>!used.has(x)); res[j]=c; used.add(c); }
  return applyReqs(s,i,res); }
/* 부탁·연합 약속을 들어줄지 정하고, 들어주면 그 종류의 칸으로 옮김(자리 바꾸기) */
function cellKind(c){ return c<6?'inner':'tip'; }
function moveTo(res,j,pred){ const c=[...Array(CELLS).keys()].filter(pred); if(!c.length) return false; if(c.includes(res[j])) return true; const free=c.filter(x=>!res.includes(x)); const pick=U.pick(free.length?free:c); const o=res.indexOf(pick); if(o>=0) res[o]=res[j]; res[j]=pick; return true; }
function applyReqs(s,i,res){ s.placeOut={};
  if(s.targ&&s.targ[i]!=null){ const x=s.targ[i]; if(x!==i) moveTo(res,x,c=>c>=6&&c!==res[i]); }
  const reqs=[]; for(const h of HSEAT){ const r=(s.plea&&s.plea[h])||(s.seatReq&&s.seatReq[i]&&s.seatReq[i].h===h?s.seatReq[i]:null); if(r) reqs.push([h,r]); }
  for(const [h,r] of reqs){ const p=P(s,i); const ally=allied(s,i,h); const ok= ally ? Math.random()>p.bluff*.3+(s.who[i]==='jihu'?.35:0) : Math.random()<(s.trust[i][h]-.45)*1.3+(r.plea?.15:0);
    if(!ok){ s.placeOut[h]={ok:false,want:r.want}; continue; }
    if(r.want==='inner') moveTo(res,h,c=>c<6&&c!==res[i]); else if(r.want==='tip') moveTo(res,h,c=>c>=6); else if(r.want==='next') moveTo(res,h,c=>ADJ[res[i]].includes(c));
    if(r.avoid!=null){ const bad=new Set(ADJ[res[h]]); if(bad.has(res[r.avoid])) moveTo(res,r.avoid,c=>!ADJ[res[h]].includes(c)&&c!==res[h]&&c!==res[i]); }
    s.placeOut[h]={ok:true,want:r.want}; }
  return res; }
function validPlace(a){ return Array.isArray(a)&&a.length===N&&a.every(c=>Number.isInteger(c)&&c>=0&&c<CELLS)&&new Set(a).size===N; }
function beginTalk(s){ s.phase='talk'; s.turn=null; s.notice='🤝 이웃끼리 협상 — 몇 낼지 약속해요 (거짓말도 가능)'; s.log.push(`🪑 자리 확정 · ${s.round}라운드`);
  U.shuffle(ALL.filter(i=>!isH(i))).forEach(i=>s.q.push({k:'promise',i}));
  for(const h of HSEAT){ const nb=nbrs(s,h).filter(j=>!isH(j)); if(nb.length&&Math.random()<.6){ const k=Math.min(s.q.length,1+(Math.random()*3|0)); s.q.splice(k,0,{k:'askme',i:U.pick(nb),h}); } }
  s.q.push({k:'submit'}); npcWhisper(s); }
/* NPC: 이웃의 약속(믿음 가중)과 성향으로 숫자 고르기 */
function guessN(s,i,j){ if(s.warnNext&&s.warnNext[j]===s.round&&Math.random()<.6) return 7+(Math.random()*3|0); const pr=s.promise[j]; const t=s.trust[i][j]*(.4+P(s,i).trust*.6); if(pr!=null&&Math.random()<t) return pr; const h=s.hist.map(r=>r.pick[j]); const avg=h.length?h.reduce((a,b)=>a+b,0)/h.length:4.5; return Math.max(1,Math.min(9,Math.round(avg+(Math.random()-.5)*3))); }
function bestN(s,i,lvl){ const ns=nbrs(s,i), d=DEG(s.cell[i]); if(lvl===0&&Math.random()<.3) return 1+(Math.random()*9|0);
  if(lvl===2){ const pred=ns.map(j=>[0,1,2,3].map(()=>bestN(s,j,1))); let best=1,bv=-1e9; for(let n=1;n<=9;n++){ let e=0; for(let k=0;k<4;k++){ const sum=n+ns.reduce((a,j,x)=>a+(s.promise[j]!=null&&Math.random()<.5?Math.max(s.promise[j],pred[x][k]):pred[x][k]),0); e+= sum<=LIM?n*d:-n*d; } if(e>bv){ bv=e; best=n; } } return best; }
  let best=1, bv=-1e9; const K=lvl===1?20:6;
  for(let n=1;n<=9;n++){ let e=0; for(let k=0;k<K;k++){ const sum=n+ns.reduce((a,j)=>a+guessN(s,i,j),0); e+= sum<=LIM ? n*d : -n*d; } e/=K; if(lvl===0) e+= (Math.random()-.5)*8; if(e>bv){ bv=e; best=n; } }
  return best; }
function npcPromise(s,i){ const p=P(s,i); if(s.propNext&&s.propNext.r===s.round&&s.trust[i][s.propNext.by]>.6&&Math.random()<.5+p.trust*.3) return s.propNext.n; const n=bestN(s,i,1); const lie = Math.random()<p.bluff*.5; return lie ? Math.max(1,n-2-(Math.random()*3|0)) : n; }
function npcSubmit(s,i){ let n=bestN(s,i,1); const p=P(s,i); const pr=s.promise[i];
  { const sp=Object.entries(s.secretP||{}).find(([k,v])=>v.r===s.round&&k.split('-').map(Number).includes(i)); if(sp){ const bt=p.bluff*.35+(s.round===ROUNDS?.25:0)+(s.who[i]==='jihu'?.35:0); return Math.random()>bt?sp[1].n:Math.min(9,sp[1].n+2+(Math.random()*2|0)); } }
  { const ln=s.lowNext&&s.lowNext[i]; if(ln&&ln.r===s.round) n=Math.max(1,n-1-(Math.random()<.5?1:0)); }
  if(pr!=null&&nbrs(s,i).some(j=>allied(s,i,j))){ const bt=p.bluff*.35+(s.round===ROUNDS?.25:0)+(s.who[i]==='jihu'?.35:0); if(Math.random()>bt) return Math.max(1,Math.min(9,Math.min(n,pr))); } if(pr!=null&&Math.random()<.5+p.trust*.4-p.bluff*.3) n=Math.min(n,pr+ (Math.random()<p.aggr*.3?1:0)); if(s.tot[i]<Math.min(...s.tot)+1&&Math.random()<p.aggr) n=Math.min(9,n+1); return Math.max(1,Math.min(9,n)); }
function act(s,i,a){
  if(a.k==='place'){ if(s.phase!=='place'||s.placer!==i) return '지금은 자리를 정할 때가 아니에요'; if(!validPlace(a.cells)) return '모두를 서로 다른 칸에 앉혀 주세요'; s.cell=a.cells.slice();
    for(const [k,r] of Object.entries(s.npcReq)){ const j=+k; if(r.to!==i) continue; const c=s.cell[j], ok= r.want==='inner'?c<6 : r.want==='tip'?c>=6 : ADJ[s.cell[i]].includes(c); if(ok){ s.trust[j][i]=Math.min(1,s.trust[j][i]+.2); s.q.unshift({k:'plsay',i:j,h:i,ok:true,want:'thx'}); } else { s.trust[j][i]*=.6; s.q.unshift({k:'brk',i:j,t:i}); if(s.pact[pk(i,j)]) s.pact[pk(i,j)].broken=i; } delete s.npcReq[k]; } beginTalk(s); return null; }
  if(a.k==='promise'){ if(s.phase!=='talk'&&s.phase!=='submit') return '지금은 약속할 수 없어요'; if(s.promise[i]!=null) return '이미 말했어요'; const n=a.n|0; if(n<1||n>9) return '1~9'; s.promise[i]=n; s.log.push(`🗣️ ${nm(i)}: "저 ${n} 낼게요"`); return null; }
  if(a.k==='ready'){ if(s.phase!=='disc') return '지금은 아니에요'; if(s.dq.length) return '아직 이야기 중이에요'; s.dready[pOf(i)]=true; return null; }
  if(a.k==='say'){ if(s.phase!=='disc') return '토론 시간이 아니에요'; const p=pOf(i); if(s.dsaid[p]>=3) return '이번엔 충분히 말했어요'; s.dready[p]=false;
    if(a.what==='warn'){ if(s.warned[i]===s.round) return '이미 경고했어요'; s.dsaid[p]++; s.warned[i]=s.round; talkT(s,i,'😏 다음 라운드엔 저 크게 낼 거예요. 이웃분들 알아서 하세요.','warn'); s.warnNext=s.warnNext||{}; s.warnNext[i]=s.round+1; const nb=nbrs(s,i).filter(j=>!isH(j)); if(nb.length) s.dq.push({i:U.pick(nb),kind:'warnR',t:i}); return null; }
    if(a.what==='prop'){ s.dsaid[p]++; const n=a.n|0||3; talkT(s,i,`🤝 다음 라운드엔 다 같이 ${n}씩 가요. 그럼 다 살아요.`,'prop'); s.propNext={n,r:s.round+1,by:i}; ALL.filter(j=>!isH(j)).slice(0,8).forEach(j=>{ if(Math.random()<.35) s.dq.push({i:j,kind:s.trust[j][i]>.6&&P(s,j).bluff<.7?'propOK':'propNo',t:i,n}); }); return null; }
    if(a.what==='sorry'){ s.dsaid[p]++; talkT(s,i,'🙇 미안해요. 이번엔 제가 욕심냈어요.','confess'); const v=nbrs(s,i).find(j=>!isH(j)); if(v!=null){ s.trust[v][i]=Math.min(1,s.trust[v][i]+.15); s.dq.push({i:v,kind:P(s,v).temper>.55?'angry':'forgive',t:i}); } return null; }
    const t=a.t; if(typeof t!=='number'||t===i||!(t>=0&&t<N)) return '대상을 고르세요'; s.dsaid[p]++;
    if(a.what==='low'){ talkT(s,i,`🙏 ${nm(t)}, 다음 라운드엔 낮게 내 줘요.`,'plea',t); if(!isH(t)){ const ok=s.trust[t][i]>.55&&Math.random()<.4+P(s,t).trust*.5; if(ok) s.lowNext[t]={h:i,r:s.round+1}; s.dq.unshift({i:t,kind:ok?'lowOK':'lowNo',t:i}); } return null; }
    if(a.what==='why'){ talkT(s,i,lineX(s,i,'why',{t})||`${nm(t)}, 왜 그랬어요?`,'why',t); if(!isH(t)){ const p=P(s,t), u=Math.random(); const pr=s.promise[t], broke=pr!=null&&s.pick[t]>pr; s.dq.unshift({i:t,kind:!broke?'reb_none':u<(1-p.bluff)*.45?'confess':p.bluff>.6&&u<.8?'defiant':'excuse',t:i}); } return null; }
    if(a.what==='thanks'){ talkT(s,i,`🤝 ${nm(t)}, 약속 지켜 줘서 고마워요.`,'thanks',t); if(!isH(t)) s.trust[t][i]=Math.min(1,s.trust[t][i]+.1); return null; }
    if(a.what==='out'){ const pc=s.pact[pk(i,t)]; if(!pc||pc.broken!==t) return '깨진 연합이 없어요'; talkT(s,i,`📢 다들 들어요. ${nm(t)}이(가) 저랑 몰래 연합해 놓고 약속을 깼어요!`,'outed',t); beat(s,{i,kind:'outed',t,text:'_'}); return null; }
    /* 지목: 공개 기록에서 근거를 찾아 붙임 */
    const pr=s.promise[t], broke=pr!=null&&s.pick[t]>pr, mine=nbrs(s,i).includes(t);
    if(broke){ talkT(s,i,mine?`🤨 ${nm(t)}, ${pr} 낸다더니 ${s.pick[t]} 냈잖아요. 제 합이 ${s.sums[i]}이에요.`:`🤨 ${nm(t)}, ${pr} 낸다고 해 놓고 ${s.pick[t]}… 다들 봤죠?`,'burn',t); beat(s,{i,kind:'burn',t,text:'_'}); }
    else { talkT(s,i,`🤨 ${nm(t)}, 좀 수상해요.`,'accuse',t); if(!isH(t)) s.dq.unshift({i:t,kind:'reb_none',t:i}); }
    return null; }
  if(a.k==='plea'){ if(s.phase!=='place'||isH(s.placer)) return '지금은 부탁할 수 없어요'; if(s.plea[i]) return '이미 부탁했어요'; if(!WANT_[a.want]&&a.avoid==null) return '부탁을 고르세요';
    s.plea[i]={want:a.want||null,avoid:a.avoid??null,plea:1}; talkT(s,i,a.avoid!=null?`🙏 ${nm(s.placer)}, 저 ${nm(a.avoid)} 옆은 피하게 해 줘요.`:`🙏 ${nm(s.placer)}, 저 ${WANT_[a.want]}에 앉혀 줘요.`,'plea',s.placer); return null; }
  if(a.k==='ally'){ const t=a.t; if(!allied(s,i,t)) return '연합한 사람에게만'; if(s.aa[i]===s.round) return '연합 행동은 라운드마다 한 번이에요'; s.aa[i]=s.round; const p=P(s,t);
    if(a.what==='num'){ if(!nbrs(s,i).includes(t)) return '이웃일 때만 숫자를 맞출 수 있어요'; const n=a.n|0; if(n<1||n>9) return '1~9'; s.secretP[pk(i,t)]={n,r:s.round}; dmPush(s,i,i,`(→ ${nm(t)}) 공개 약속이랑 별개로, 진짜로 둘 다 ${n}씩 내요 🤫`,{mine:1}); dmPush(s,i,t,n>=6?'…좀 높은데요? 그래도 연합이니까요.':'좋아요, 둘만 아는 숫자예요 🤫'); return null; }
    if(a.what==='seat'){ if(!WANT_[a.want]) return '자리를 고르세요'; s.seatReq[t]={h:i,want:a.want}; dmPush(s,i,i,`(→ ${nm(t)}) 당신이 꼴찌 되면 저를 ${WANT_[a.want]}에 앉혀 줘요 🤫`,{mine:1}); dmPush(s,i,t,U.pick(['알겠어요. 약속해요 🤝','그럼요, 연합이잖아요.'])); return null; }
    if(a.what==='targ'){ const x=a.x; if(typeof x!=='number'||x===i||x===t) return '견제할 사람을 고르세요'; s.targ[t]=x; dmPush(s,i,i,`(→ ${nm(t)}) 꼴찌가 되면 ${nm(x)} 꼭짓점으로 보내요 🎯`,{mine:1}); dmPush(s,i,t,s.tot[x]>=s.tot[t]?'좋아요, 저도 그 생각이었어요 😏':'음… 그 정도까진 아닌데, 알겠어요.'); return null; }
    return '알 수 없는 연합 행동'; }
  if(a.k==='ask'){ if(s.phase!=='talk'&&s.phase!=='submit') return '지금은 물어볼 수 없어요'; if(s.asked[i]===s.round) return '이미 물어봤어요'; s.asked[i]=s.round; const nb=nbrs(s,i).filter(j=>!isH(j)); if(!nb.length) return '이웃이 없어요';
    talkT(s,i,'❓ 이웃분들, 이번에 몇 낼 거예요?','ask'); for(const j of nb){ if(s.promise[j]==null){ s.promise[j]=npcPromise(s,j); s.log.push(`🗣️ ${nm(j)}: "저 ${s.promise[j]} 낼게요"`); } } const j=nb[0]; talkT(s,j,(lineX(s,j,'ansN',{n:s.promise[j]})||`${s.promise[j]} 낼게요.`)+`${nb.length>1?` ${nb.slice(1).map(x=>`${nm(x)}은(는) ${s.promise[x]}`).join(', ')}이래요.`:''}`,'say'); return null; }
  if(a.k==='dm'){ if(s.phase!=='talk'&&s.phase!=='submit') return '귓속말은 협상 때만'; if(s.wh[i]===s.round) return '귓속말은 라운드당 한 번이에요'; const t=a.t; if(typeof t!=='number'||isH(t)||t===i) return '귓속말할 사람을 고르세요'; s.wh[i]=s.round;
    dmPush(s,i,i,`(→ ${nm(t)}) 우리 몰래 연합해요. 서로 약속 지키고 자리도 챙겨 주기 🤫`,{mine:1});
    if(s.trust[t][i]*(.5+P(s,t).trust*.5)+Math.random()*.4>.75){ s.pact[pk(i,t)]={r:s.round,broken:null}; dmPush(s,i,t,U.pick(['좋아요 🤫 둘만 아는 거예요.','콜! 서로 배신 없기예요.'])); } else dmPush(s,i,t,U.pick(['음… 아직은 혼자 갈게요.','미안해요, 아직 못 믿겠어요.'])); return null; }
  if(a.k==='dmReply'){ const m=(s.dm[i]||[]).find(x=>x.id===a.id&&x.state==='open'); if(!m) return '이미 답했어요'; m.state=a.yes?'yes':'no';
    if(m.kind==='secretN'){ if(a.yes){ s.secretP[pk(i,m.from)]={n:m.n,r:s.round}; dmPush(s,i,m.from,'좋아요 🤫'); } else dmPush(s,i,m.from,'…그래요, 각자 해요.'); return null; }
    if(m.kind==='targ'){ if(a.yes){ s.targ[m.from]=m.x; s.targOf=s.targOf||{}; s.targOf[i]=m.x; dmPush(s,i,m.from,'좋아요, 같이 가요 🎯'); } else dmPush(s,i,m.from,'음, 그건 좀…'); return null; }
    if(a.yes){ s.pact[pk(i,m.from)]={r:s.round,broken:null}; s.trust[m.from][i]=Math.min(1,s.trust[m.from][i]+.2); dmPush(s,i,m.from,'좋아요. 배신 없기예요 🤫'); } else { s.trust[m.from][i]*=.85; dmPush(s,i,m.from,'…알겠어요.'); } return null; }
  if(a.k==='pick'){ if(s.phase!=='submit') return '지금은 낼 수 없어요'; if(s.pick[i]!=null) return '이미 냈어요'; const n=a.n|0; if(n<1||n>9) return '1~9'; s.pick[i]=n; return null; }
  return '알 수 없는 동작'; }
function apply(s,p,a){ syncH(s); if(s.winner!=null) return '게임이 끝났어요'; if(!a) return '알 수 없는 동작'; const e=act(s,HSEAT[p],a); if(!e) s.ev++; return e; }
function stepDelay(s){ syncH(s); if(s.winner!=null) return null;
  if(s.phase==='intro') return 2200;
  if(s.phase!=='disc'&&s.q.length){ const k=s.q[0].k; return k==='note'?1700 : k==='promise'||k==='askme'?1700 : k==='rv'?650 : k==='sc'?900 : k==='burn'?1500 : 500; }
  if(s.phase==='place') return isH(s.placer)?null:(s.auto?2200:HSEAT.every(h=>s.plea[h])?1800:7000);
  if(s.phase==='submit'){ return s.pick.every(x=>x!=null)?700 : ALL.some(i=>!isH(i)&&s.pick[i]==null)?700+Math.random()*900:null; }
  if(s.phase==='disc'){ if(s.dq.length) return 2500+Math.min(1800,(s.dq[0].text||'').length*30); return s.dready.every(Boolean)?700:null; }
  if(s.phase==='debrief') return s.dj<s.dlist.length?2200:1200;
  return null; }
function step(s){ syncH(s);
  if(s.phase==='intro'){ startRound(s); s.ev++; return; }
  if(s.phase==='disc'){ if(s.dq.length){ beat(s,s.dq.shift()); s.ev++; return; } if(s.dready.every(Boolean)){ s.phase='reveal'; s.ev++; } return; }
  if(s.phase!=='disc'&&s.q.length){ const e=s.q.shift();
    if(e.k==='note'){ s.notice=e.text; s.log.push(e.text); }
    else if(e.k==='talk') beginTalk(s);
    else if(e.k==='place'){ s.phase='place'; s.turn=isH(s.placer)?pOf(s.placer):null; s.plea={}; s.notice=isH(s.placer)?`🪑 ${nm(s.placer)}이(가) 자리를 정하는 중…`:`🪑 ${nm(s.placer)}이(가) 자리를 고민 중 — 🙏 부탁해 볼 수 있어요`;
      if(isH(s.placer)) for(const [k,r] of Object.entries(s.npcReq)){ if(r.to===s.placer&&!isH(+k)) dmPush(s,s.placer,+k,`(연합) 약속대로 저 ${WANT_[r.want]}에 앉혀 줘요 🤫`); } }
    else if(e.k==='promise'){ const i=e.i; if(s.promise[i]==null&&nbrs(s,i).length&&Math.random()<.45+P(s,i).talk*.55){ const n=npcPromise(s,i); s.promise[i]=n; s.lieTrack=s.lieTrack||{}; say(s,i,'say',{n}); s.notice=`🗣️ ${nm(i)}: "저 ${n} 낼게요"`; } }
    else if(e.k==='brk'){ talkT(s,e.i,lineX(s,e.i,'seatBroke',{t:e.t}),'seatBroke',e.t); }
    else if(e.k==='plsay'){ if(e.want==='thx'){ talkT(s,e.i,lineX(s,e.i,'thanks',{t:e.h})||'자리 고마워요 🤝','thanks',e.h); } else talkT(s,e.i,e.want?lineX(s,e.i,e.ok?'plOK':'plNo',{t:e.h,w:WANT_[e.want]}):(e.ok?`${nm(e.h)}, 부탁대로 피하게 해 드렸어요 🤝`:lineX(s,e.i,'plNo',{t:e.h})),e.ok?'plOK':'plNo',e.h); }
    else if(e.k==='askme'){ const i=e.i; if(s.promise[i]==null) s.promise[i]=npcPromise(s,i); talkT(s,i,lineX(s,i,'ask',{t:e.h,n:s.promise[i]}),'ask',e.h); }
    else if(e.k==='submit'){ s.phase='submit'; s.notice='🗳️ 투표룸 — 1~9 중 하나를 몰래 내세요'; }
    else if(e.k==='rv'){ const c=e.c, i=occ(s,c); s.shown=(s.shown||[]).concat([c]); if(i>=0) s.notice=`🔢 ${nm(i)}: ${s.pick[i]}`; }
    else if(e.k==='calc'){ calc(s); }
    else if(e.k==='sc'){ const i=e.i; s.notice=`${s.gain[i]>0?'⭕':'❌'} ${nm(i)}: 합 ${s.sums[i]} → ${s.gain[i]>0?'+':''}${s.gain[i]}점`; s.log.push(s.notice); }
    else if(e.k==='burn'){ say(s,e.i,'burned',{t:e.by}); }
    else if(e.k==='disc'){ discuss(s); if(s.dq.length||HSEAT.some(h=>!s.dready[pOf(h)])){ s.phase='disc'; s.notice='💬 결과를 두고 한마디씩 — 다 들었으면 "다음 라운드로"'; s.ev++; return; } }
    else if(e.k==='rend'){ s.hist.push({r:s.round,cell:s.cell.slice(),pick:s.pick.slice(),gain:s.gain.slice(),promise:s.promise.slice()});
      if(s.round<ROUNDS) startRound(s); else { s.phase='final'; const r=rank(s); s.notice=`🏁 최종 — ${r.map((i,k)=>`${k+1}. ${nm(i)} ${s.tot[i]}`).join(' · ')}`; s.log.push(s.notice); s.dlist=ALL.filter(i=>!isH(i)&&s.lies[i]>0).slice(0,3); s.dj=0; s.q.push({k:'deb'}); } }
    else if(e.k==='deb'){ s.phase='debrief'; }
    s.ev++; return; }
  if(s.phase==='place'&&!isH(s.placer)){ const i=s.placer; s.cell=npcPlace(s,i); let spoke=false;
    for(const h of HSEAT){ const o=s.placeOut&&s.placeOut[h]; if(!o) continue; spoke=true; s.q.unshift({k:'plsay',i,h,ok:o.ok,want:o.want}); if(s.seatReq[i]&&s.seatReq[i].h===h) delete s.seatReq[i]; if(!o.ok&&allied(s,i,h)){ dmPush(s,h,i,'💔 연합인데 자리 약속을 안 지켰어요',{state:'bad'}); s.pact[pk(i,h)].broken=i; } }
    if(!spoke) say(s,i,'place'); s.plea={}; if(s.targ[i]!=null) delete s.targ[i]; beginTalk(s); s.ev++; return; }
  if(s.phase==='submit'){ const npc=ALL.find(i=>!isH(i)&&s.pick[i]==null); if(npc!=null){ s.pick[npc]=npcSubmit(s,npc); s.log.push(`🗳️ ${nm(npc)} 제출`); s.ev++; return; }
    if(s.pick.every(x=>x!=null)){ s.phase='reveal'; s.shown=[]; for(let c=0;c<CELLS;c++) if(occ(s,c)>=0) s.q.push({k:'rv',c}); s.q.push({k:'calc'}); s.notice='🔓 한 칸씩 공개합니다'; s.ev++; return; } return; }
  if(s.phase==='debrief'){ if(s.dj<s.dlist.length){ const i=s.dlist[s.dj++]; const n=s.lies[i], p=P(s,i); const pool=p.bluff>.6?[`(속마음) 다들 순진하더라고요. 약속 ${n}번 어겼어요 😏`,`(속마음) 약속은 처음부터 반만 믿었어요. ${n}번 깼네요 😏`]:p.trust>.6?[`(속마음) ${n}번 어긴 거… 이웃이 높게 낼 것 같아서 겁났어요. 미안해요 🥲`,`(속마음) 저도 지키고 싶었는데, ${n}번은 무서워서 못 지켰어요 😢`]:[`(속마음) 약속 ${n}번 어겼어요. 13 넘을까 봐… 아니, 사실 점수가 탐났어요 😅`,`(속마음) ${n}번이요. 계산해 보니 깨는 게 이득이었어요.`]; const t=pool.find(x=>!(s.debUsed=s.debUsed||[]).includes(x.slice(0,14)))||pool[0]; s.debUsed.push(t.slice(0,14)); s.say={seat:i,text:t,n:(s.say?s.say.n:0)+1}; s.log.push(`💭 ${nm(i)}: ${t}`); s.ev++; return; }
    s.phase='over'; const a=s.tot[HSEAT[0]], b=s.tot[HSEAT[1]]; s.winner=a>b?0:b>a?1:'both'; { const mx=Math.max(...HSEAT.map(h=>s.tot[h])); s.winners=HSEAT.map((h,p)=>s.tot[h]===mx?p:-1).filter(x=>x>=0); } s.ev++; return; }
}
function discuss(s){ s.dready=HSEAT.map(()=>false); s.dsaid=HSEAT.map(()=>0); const q=[];
  /* 약속을 어겨 손해 본 이웃이 숫자로 따짐 */
  for(const j of ALL){ const pr=s.promise[j]; if(pr==null||s.pick[j]<=pr) continue; const vic=nbrs(s,j).filter(i=>!isH(i)&&s.gain[i]<0).sort((a,b)=>s.gain[a]-s.gain[b])[0]; if(vic==null) continue;
    q.push({i:vic,kind:'burn',t:j,p:pr,n:s.pick[j],sum:s.sums[vic],g:s.gain[vic]});
    if(allied(s,vic,j)){ s.pact[pk(vic,j)].broken=j; q.push({i:vic,kind:'outed',t:j}); } }
  /* 몰래 연합한 나를 NPC가 배신했으면 알림 */
  for(const h of HSEAT) for(const j of nbrs(s,h)){ if(isH(j)||!allied(s,h,j)) continue; const pr=s.promise[j]; if(pr!=null&&s.pick[j]>pr){ s.pact[pk(h,j)].broken=j; dmPush(s,h,j,`💔 연합이라더니 ${pr} 낸다고 하고 ${s.pick[j]}을(를) 냈어요`,{state:'bad'}); } }
  /* 약속 지킨 이웃에게 고맙다 */
  for(const i of U.shuffle(ALL.filter(x=>!isH(x)))){ if(q.length>=5) break; const k=nbrs(s,i).find(j=>s.promise[j]!=null&&s.pick[j]<=s.promise[j]&&s.gain[i]>0&&j!==i); if(k!=null&&Math.random()<.35) q.push({i,kind:'thanks',t:k}); }
  /* 꼭짓점에 놓인 상위권이 꼴찌에게 따짐 */
  if(s.placer!=null&&s.round>1){ const tp=ALL.filter(i=>!isH(i)&&i!==s.placer&&s.cell[i]>=6).sort((a,b)=>s.tot[b]-s.tot[a])[0]; if(tp!=null&&Math.random()<.5){ q.push({i:tp,kind:'tipped',t:s.placer}); if(!isH(s.placer)) q.push({i:s.placer,kind:'placeWhy',t:tp}); } }
  s.dq=q.slice(0,7); }
function beat(s,e){ const i=e.i; if(e.text!=='_'){ const text=e.text||lineX(s,i,e.kind,e); if(!talkT(s,i,text,e.kind,e.t)) return; }
  const t=e.t;
  if(e.kind==='burn'||e.kind==='outed'){ ALL.forEach(L=>{ if(!isH(L)&&L!==t&&L!==i) s.trust[L][t]*=e.kind==='outed'?.6:.85; });
    if(t!=null&&!isH(t)){ const p=P(s,t), u=Math.random(); let r;
      if(e.kind==='outed') r={kind:u<(1-p.bluff)*.5?'confess':'denyOut',t:i};
      else { const quiet=nbrs(s,t).find(x=>x!==i&&s.promise[x]==null); r= u<(1-p.bluff)*.35?{kind:'confess'} : p.bluff>.6&&u<.75?{kind:'defiant'} : quiet!=null&&u<.6?{kind:'blame',x:quiet} : {kind:'excuse'}; }
      s.dq.unshift(Object.assign({i:t},r));
      const lis=nbrs(s,t).filter(x=>!isH(x)&&x!==t)[0]??i; if(!isH(lis)) s.dq.splice(1,0,{i:lis,kind:r.kind==='confess'||r.kind==='excuse'?(P(s,lis).temper>.55?'angry':'forgive'):'angry',t}); } }
}
function calc(s){ s.sums=Array(N).fill(0); s.gain=Array(N).fill(0);
  for(const i of ALL){ const sum=s.pick[i]+nbrs(s,i).reduce((a,j)=>a+s.pick[j],0); s.sums[i]=sum; const d=DEG(s.cell[i]); s.gain[i]= sum<=LIM ? s.pick[i]*d : -s.pick[i]*d; s.tot[i]+=s.gain[i]; }
  /* 약속 어긴 사람: 이웃의 믿음이 깎이고, 손해 본 NPC가 한마디 */
  for(const j of ALL){ const pr=s.promise[j]; if(pr==null) continue; if(s.pick[j]>pr){ s.lies[j]++; for(const i of nbrs(s,j)){ s.trust[i][j]*=.4; } } else for(const i of nbrs(s,j)) s.trust[i][j]=Math.min(1,s.trust[i][j]+.15); }
  ALL.slice().sort((a,b)=>s.gain[b]-s.gain[a]).forEach(i=>s.q.push({k:'sc',i})); s.q.push({k:'disc'}); s.q.push({k:'rend'}); s.notice='🧮 계산합니다'; }
const rank=s=>ALL.slice().sort((a,b)=>s.tot[b]-s.tot[a]);
function mask(s,p){ syncH(s); const v=U.clone(s), me=HSEAT[p]; if(s.phase==='submit'||s.phase==='talk') v.pick=s.pick.map((x,i)=>i===me?x:(x!=null?0:null));
  if(s.phase==='reveal'){ v.pick=s.pick.map((x,i)=> i===me||(s.shown||[]).includes(s.cell[i]) ? x : null); }
  v.trust=null; v.lies=s.phase==='over'||s.phase==='debrief'?s.lies:null; v.q=[]; v.dq=s.dq.map(()=>null); v.used={}; v.dm={[me]:s.dm[me]||[]}; v.pact={}; for(const k in s.pact) if(k.split('-').map(Number).includes(me)) v.pact[k]=s.pact[k]; return v; }
function ai(v,lvl){ syncH(v); const i=HSEAT[1];
  if(v.phase==='disc'){ if(!v.dq.length&&!v.dready[1]) return {k:'ready'}; return null; }
  if(v.phase==='place'&&v.placer===i) return {k:'place', cells:npcPlace(v,i)};
  if((v.phase==='talk'||v.phase==='submit')&&v.promise[i]==null&&Math.random()<.5){ const fake=Object.assign({},v,{trust:ALL.map(()=>Array(N).fill(1)),who:v.who}); return {k:'promise', n:bestN(fake,i,lvl)}; }
  if(v.phase==='submit'&&v.pick[i]==null){ const fake=Object.assign({},v,{trust:ALL.map(()=>Array(N).fill(1))}); return {k:'pick', n:bestN(fake,i,lvl==null?1:lvl)}; }
  return null; }
function aiDelay(){ return 2200+Math.random()*2500; }

/* 화면 — 육각별 판(SVG) */
let WHO={}, pv=null, plan=null, selP=null, sig='', dMode=null, lastDm=0, lastSay=0, aMode=null, avoidOpen=false;
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}(이\(가\))?/g,(_,d,j)=>{ const n=seatName(+d,ctx); const b=n.replace(/\(나\)$/,''), c=b.charCodeAt(b.length-1); return `${seatEmoji(+d)} ${n}${j?((c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28)?'이':'가'):''}`; }); }
function tris(){ const R=78, cx=150, cy=150, V=[...Array(6)].map((_,k)=>[cx+R*Math.cos(Math.PI/3*k-Math.PI/2), cy+R*Math.sin(Math.PI/3*k-Math.PI/2)]);
  const out=[]; for(let k=0;k<6;k++){ const a=V[k], b=V[(k+1)%6]; out[k]=[[cx,cy],a,b]; const mx=(a[0]+b[0])/2, my=(a[1]+b[1])/2; const dx=mx-cx, dy=my-cy, L=Math.hypot(dx,dy); const h=R*Math.sqrt(3)/2; out[k+6]=[a,b,[mx+dx/L*h,my+dy/L*h]]; } return out; }
const TRI=tris();
function board(v,ctx,me,clickable,cellsOverride){ const cells=cellsOverride||v.cell;
  return `<svg viewBox="0 0 300 300" class="t13-svg">${TRI.map((pts,c)=>{ const i=cells.indexOf(c), cxy=[(pts[0][0]+pts[1][0]+pts[2][0])/3,(pts[0][1]+pts[1][1]+pts[2][1])/3];
    const pick= i>=0&&v.pick&&v.pick[i]!=null&&v.pick[i]!==0 ? v.pick[i] : null;
    const sp=i>=0&&v.say&&v.say.seat===i, tg=i>=0&&v.say&&v.say.t===i&&['burn','outed','accuse','tipped'].includes(v.say.kind), md=i>=0&&!isH(i)&&v.mood&&v.mood[i];
    return `<g class="t13-c ${i===me?'me':''} ${i<0?'empty':''} ${clickable?'click':''} ${sp?'speak':''} ${tg?'tgt':''} ${dMode&&i>=0&&i!==me?'pick':''}" data-cell="${c}" ${i>=0?`data-seat="${i}"`:''}>${md?`<text x="${cxy[0]+16}" y="${cxy[1]-14}" class="md">${md.e}</text>`:''}<polygon points="${pts.map(p=>p.join(',')).join(' ')}"/>
      <text x="${cxy[0]}" y="${cxy[1]-(pick!=null?5:-4)}" class="e">${i>=0?seatEmoji(i):''}</text>${pick!=null?`<text x="${cxy[0]}" y="${cxy[1]+12}" class="n">${pick}</text>`:''}<text x="${cxy[0]}" y="${cxy[1]+(c<6?24:20)}" class="d">×${DEG(c)}</text></g>`; }).join('')}</svg>`; }
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{}; const me=HSEAT[ctx.me];
  const sg=v.round+':'+v.phase; if(sg!==sig){ sig=sg; pv=null; dMode=null; aMode=null; avoidOpen=false; if(v.phase==='place'){ plan=Array(N).fill(-1); selP=null; } }
  let h=`<div class="hl-notice">${fill(U.esc(v.notice||''),ctx)}</div>`;
  if(v.say&&v.say.n!==lastSay){ if(lastSay&&ctx.sfx) ctx.sfx('tick'); lastSay=v.say.n; }
  { const feed=(v.feed||[]).filter(x=>x.r===v.round).slice(-3); h+=`<div class="vr-feed">${feed.map((x,k)=>`<div class="${k===feed.length-1?'new':''}"><span class="w">${seatEmoji(x.seat)} ${seatName(x.seat,ctx)}</span> ${fill(U.esc(x.text),ctx)}</div>`).join('')||'<div class="empty">아직 조용해요</div>'}</div>`; }
  h+=`<div class="info">${Math.max(1,v.round)}/${ROUNDS}라운드 · 합 <b>13 이하</b>면 +(내 수×이웃 칸), 넘으면 − · 내 점수 <b>${v.tot[me]}</b></div>`;
  const placing = v.phase==='place'&&v.placer===me;
  h+=`<div class="t13-wrap">${board(v,ctx,me,placing,placing?plan:null)}</div>`;
  if(v.phase==='place'&&!isH(v.placer)){ if(!v.plea[me]) h+=`<div class="vr-card"><b>🙏 ${seatEmoji(v.placer)} ${seatName(v.placer,ctx)}에게 자리 부탁</b> <small>연합이면 잘 들어주고, 아니면 나를 얼마나 믿는지에 달려요</small><div class="fh-act"><button class="ghost" data-pl="inner">안쪽(×3)에 앉혀 줘요</button><button class="ghost" data-pl="tip">꼭짓점(안전)에</button><button class="ghost" data-pl="next">당신 옆자리에</button><button class="ghost" data-pl="avoid">○○ 옆은 피하게…</button></div>${avoidOpen?`<div class="fh-act">${ALL.filter(j=>j!==me&&j!==v.placer).map(j=>`<button class="ghost small" data-pa="${j}">${seatEmoji(j)} ${seatName(j,ctx)}</button>`).join('')}</div>`:''}</div>`; else h+=`<div class="vr-card"><small>🙏 부탁했어요 — ${seatName(v.placer,ctx)}이(가) 정하는 중…</small></div>`; }
  if(placing){ h+=`<div class="vr-card"><b>🪑 꼴찌라서 자리를 정해요</b> <small>사람을 고른 뒤 칸을 누르세요 (안쪽 ×3 · 꼭짓점 ×1)</small><div class="t13-pl">${ALL.map(i=>`<button class="${selP===i?'':'ghost'}" data-pp="${i}">${seatEmoji(i)} ${seatName(i,ctx)} ${plan[i]>=0?'✅':''}</button>`).join('')}</div>
      <div class="fh-act"><button class="ghost" data-a="auto">남은 사람 자동</button><button data-a="place" ${plan.every(c=>c>=0)?'':'disabled'}>이대로 확정</button></div></div>`; }
  if((v.phase==='talk'||v.phase==='submit')){ const ns=v.cell[me]>=0?ADJ[v.cell[me]].map(c=>v.cell.indexOf(c)).filter(j=>j>=0):[];
    h+=`<div class="t13-nb">내 이웃: ${ns.map(j=>`${seatEmoji(j)} ${seatName(j,ctx)}${v.promise[j]!=null?` <b>"${v.promise[j]}"</b>`:''}`).join(' · ')||'없음(빈칸뿐)'} · 내 칸 ×${v.cell[me]>=0?DEG(v.cell[me]):'-'}</div>`;
    if(v.asked[me]!==v.round&&ns.some(j=>!isH(j))) h+=`<div class="t13-say"><button class="ghost" data-a="ask">❓ 이웃에게 몇 낼 거냐고 묻기</button></div>`;
    if(v.promise[me]==null) h+=`<div class="t13-say">🗣️ 이웃에게 약속: ${[1,2,3,4,5,6,7,8,9].map(n=>`<button class="ghost" data-pr="${n}">${n}</button>`).join('')}</div>`; else h+=`<div class="t13-say"><small>"${v.promise[me]} 낼게요"라고 했어요</small></div>`; }
  if(v.phase==='submit'){ if(v.pick[me]==null){ const ns=ADJ[v.cell[me]].map(c=>v.cell.indexOf(c)).filter(j=>j>=0); const est=ns.reduce((a,j)=>a+(v.promise[j]!=null?v.promise[j]:4),0);
      h+=`<div class="vr-card"><b>🗳️ 내 숫자</b> <small>이웃 약속대로면 이웃 합 약 ${est}${pv?` → 합 ${est+pv}, ${est+pv<=LIM?`+${pv*DEG(v.cell[me])}`:`−${pv*DEG(v.cell[me])}`}`:''}</small><div class="fh-act">${[1,2,3,4,5,6,7,8,9].map(n=>`<button class="${pv===n?'':'ghost'}" data-n="${n}">${n}</button>`).join('')}</div><div class="fh-act"><button data-a="pick" ${pv?'':'disabled'}>${pv||'?'} 내기</button></div></div>`; }
    else h+=`<div class="vr-card"><small>${v.pick[me]}을(를) 냈어요 — 기다리는 중 (${v.pick.filter(x=>x!=null).length}/${N})</small></div>`; }
  if(v.phase==='disc'){ const no=v.dsaid[ctx.me]>=3?'disabled':'', busy=v.dq.length>0, br=Object.entries(v.pact||{}).filter(([k,p])=>p.broken!=null&&p.broken!==me).map(([k,p])=>p.broken); const iBroke=v.promise[me]!=null&&v.pick[me]>v.promise[me];
    h+=`<div class="vr-card"><b>💬 결과 토론</b> <small>남은 발언 ${3-v.dsaid[ctx.me]}번 · 지목하면 약속 vs 실제 숫자가 근거로 붙어요</small><div class="fh-act">
      <button class="${dMode==='acc'?'':'ghost'}" data-dm="acc" ${no}>🤨 따지기</button><button class="${dMode==='thanks'?'':'ghost'}" data-dm="thanks" ${no}>🤝 고마워요</button><button class="${dMode==='low'?'':'ghost'}" data-dm="low" ${no}>🙏 다음엔 낮게 부탁</button><button class="${dMode==='why'?'':'ghost'}" data-dm="why" ${no}>❓ 왜 그랬어요?</button><button class="ghost" data-say="warn" ${no} title="이웃들이 내 숫자를 높게 보고 낮게 낼 수도">😏 다음엔 크게 간다</button><button class="ghost" data-say="prop" ${no}>🤝 다 같이 3씩 제안</button>${iBroke?`<button class="ghost" data-say="sorry" ${no}>🙇 사과하기</button>`:''}
      ${br.map(j=>`<button class="ghost" data-out="${j}" ${no}>📢 ${seatEmoji(j)} 몰래 연합 깬 거 폭로</button>`).join('')}${dMode?'<small>👆 판에서 사람을 누르세요</small>':''}</div>
      <div class="fh-act">${busy?'<small>🗣️ 이야기 중…</small>':v.dready[ctx.me]?'<small>기다리는 중…</small>':'<button data-a="ready">다음 라운드로 →</button>'}</div></div>`; }
  { const D=(v.dm&&v.dm[me]||[]).slice(-5), canW=(v.phase==='talk'||v.phase==='submit')&&v.wh[me]!==v.round; const newest=D.length?D[D.length-1].id:0, fresh=newest>lastDm; if(fresh&&lastDm&&ctx.sfx) ctx.sfx('host'); lastDm=newest;
    if(D.length||canW){ h+=`<div class="kg-dm fs-dm ${fresh?'slide':''}"><div class="kg-fh">🤫 귓속말 <small>나만 보여요 · 라운드당 한 번 · 연합은 서로 약속 지키고 자리 챙겨 주기</small></div>${D.map(m=>`<div class="${m.state==='open'?'open':''} ${m.state==='bad'?'bad':''}">${m.mine?'<small>나</small> ':`<b>${seatEmoji(m.from)} ${seatName(m.from,ctx)}</b> `}${fill(U.esc(m.text),ctx)}${m.state==='open'?` <button class="small" data-dr="${m.id}:1">🤫 좋아요</button><button class="ghost small" data-dr="${m.id}:0">🙅 싫어요</button>`:''}</div>`).join('')}`;
      { const allies=ALL.filter(j=>!isH(j)&&(v.pact||{})[pk(me,j)]&&v.pact[pk(me,j)].broken==null); const canA=allies.length&&v.aa[me]!==v.round&&!['over','final','debrief'].includes(v.phase);
        if(canA){ h+=`<div class="fh-act"><small>🤝 연합에게 (라운드당 한 번):</small>${allies.map(j=>`<button class="${aMode&&aMode.t===j?'':'ghost'} small" data-at="${j}">${seatEmoji(j)} ${seatName(j,ctx)}</button>`).join('')}</div>`;
          if(aMode){ const j=aMode.t, nb=v.cell[me]>=0&&ADJ[v.cell[me]].map(c=>v.cell.indexOf(c)).includes(j)&&(v.phase==='talk'||v.phase==='submit');
            h+=`<div class="fh-act">${nb?`<small>🔢 진짜로 둘 다</small>${[2,3,4,5].map(n=>`<button class="ghost small" data-an="${n}">${n}씩</button>`).join('')}`:''}<small>🪑 꼴찌 되면 나를</small>${['inner','tip','next'].map(w=>`<button class="ghost small" data-as="${w}">${WANT_[w]}</button>`).join('')}<small>🎯 같이 꼭짓점으로</small>${ALL.filter(x=>x!==me&&x!==j).map(x=>`<button class="ghost small" data-ax="${x}">${seatEmoji(x)}</button>`).join('')}</div>`; } } }
      if(canW) h+=`<div class="fh-act"><small>몰래 연합 제안:</small>${ALL.filter(j=>!isH(j)&&!(v.pact||{})[pk(me,j)]).map(j=>`<button class="ghost small" data-w="${j}">${seatEmoji(j)} ${seatName(j,ctx)}</button>`).join('')}</div>`;
      h+='</div>'; } }
  if(v.phase==='over') h+=`<div class="sn-score">${rank(v).map((i,k)=>`<div class="${isH(i)?'h':''}"><b>${k+1}. ${seatEmoji(i)} ${seatName(i,ctx)}</b> ${v.tot[i]}점${v.lies&&v.lies[i]?` <small>약속 어김 ${v.lies[i]}</small>`:''}</div>`).join('')}</div>`;
  const L=U.politics(v.feed,{seats:ALL,emo:seatEmoji,name:i=>seatName(i,ctx),me,pacts:Object.entries(v.pact||{}).map(([k,p])=>{ const [a,b]=k.split('-').map(Number); return [a,b,p.broken!=null||!!p.sus]; }).filter(x=>x[0]===me||x[1]===me)})+`<div class="side-box"><div class="side-h">📊 순위</div>${rank(v).map((i,k)=>`<div class="side-row ${i===me?'me':''}">${k+1}. ${seatEmoji(i)} ${seatName(i,ctx)} <small>${v.tot[i]}점${v.gain?` (${v.gain[i]>0?'+':''}${v.gain[i]})`:''}</small></div>`).join('')}
    <div class="side-h" style="margin-top:8px">🤝 약속 vs 실제</div>${v.hist.slice(-2).reverse().map(r=>`<div class="side-row" style="flex-wrap:wrap"><small>${r.r}R</small> ${ALL.filter(i=>r.promise[i]!=null).map(i=>`${seatEmoji(i)}${r.promise[i]}→${r.pick[i]}${r.pick[i]>r.promise[i]?'⚠️':''}`).join(' ')||'-'}</div>`).join('')||'<div class="side-row"><small>-</small></div>'}</div>`;
  const R=U.chat(v.feed,{emo:seatEmoji,name:i=>seatName(i,ctx),fill:t=>fill(t,ctx),me})+`<div class="side-box side-log"><div class="side-h">📜 진행 기록 <small>최근이 위</small></div>${v.log.slice(-70).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=`<div class="side3 has-chat"><div class="side-mid">${h}</div><aside class="side-l">${L}</aside><aside class="side-r">${R}</aside></div>`;
  el.onclick=e=>{
    const dm=e.target.closest('[data-dm]'); if(dm&&!dm.disabled){ dMode=dMode===dm.dataset.dm?null:dm.dataset.dm; return ctx.rerender(); }
    if(dMode){ const st=e.target.closest('[data-seat]'); if(st){ const t=+st.dataset.seat; if(t===me) return; const k=dMode; dMode=null; return ctx.act({k:'say',what:k,t}); } }
    const sy=e.target.closest('[data-say]'); if(sy&&!sy.disabled) return ctx.act({k:'say',what:sy.dataset.say,n:3});
    const ou=e.target.closest('[data-out]'); if(ou&&!ou.disabled) return ctx.act({k:'say',what:'out',t:+ou.dataset.out});
    const dr=e.target.closest('[data-dr]'); if(dr){ const [id,y]=dr.dataset.dr.split(':'); return ctx.act({k:'dmReply',id:+id,yes:y==='1'}); }
    const pl=e.target.closest('[data-pl]'); if(pl){ if(pl.dataset.pl==='avoid'){ avoidOpen=!avoidOpen; return ctx.rerender(); } return ctx.act({k:'plea',want:pl.dataset.pl}); }
    const pa=e.target.closest('[data-pa]'); if(pa){ avoidOpen=false; return ctx.act({k:'plea',avoid:+pa.dataset.pa}); }
    const at=e.target.closest('[data-at]'); if(at){ const t=+at.dataset.at; aMode=aMode&&aMode.t===t?null:{t}; return ctx.rerender(); }
    const an=e.target.closest('[data-an]'); if(an&&aMode){ const t=aMode.t; aMode=null; return ctx.act({k:'ally',t,what:'num',n:+an.dataset.an}); }
    const as=e.target.closest('[data-as]'); if(as&&aMode){ const t=aMode.t; aMode=null; return ctx.act({k:'ally',t,what:'seat',want:as.dataset.as}); }
    const ax=e.target.closest('[data-ax]'); if(ax&&aMode){ const t=aMode.t; aMode=null; return ctx.act({k:'ally',t,what:'targ',x:+ax.dataset.ax}); }
    const w=e.target.closest('[data-w]'); if(w) return ctx.act({k:'dm',t:+w.dataset.w});
    const pp=e.target.closest('[data-pp]'); if(pp){ selP=+pp.dataset.pp; return ctx.rerender(); }
    const ce=e.target.closest('[data-cell]'); if(ce&&placing&&selP!=null){ const c=+ce.dataset.cell; const who=plan.indexOf(c); if(who>=0) plan[who]=-1; plan[selP]=c; selP=ALL.find(i=>plan[i]<0)??null; return ctx.rerender(); }
    const pr=e.target.closest('[data-pr]'); if(pr) return ctx.act({k:'promise',n:+pr.dataset.pr});
    const n=e.target.closest('[data-n]'); if(n){ pv=+n.dataset.n; return ctx.rerender(); }
    const a=e.target.closest('[data-a]'); if(!a||a.disabled) return; const k=a.dataset.a;
    if(k==='auto'){ const free=U.shuffle([...Array(CELLS).keys()].filter(c=>!plan.includes(c))); ALL.forEach(i=>{ if(plan[i]<0) plan[i]=free.pop(); }); return ctx.rerender(); }
    if(k==='ready') return ctx.act({k:'ready'}); if(k==='ask') return ctx.act({k:'ask'});
    if(k==='place') return ctx.act({k:'place',cells:plan.slice()}); if(k==='pick') return ctx.act({k:'pick',n:pv}); };
}
function status(v,ctx){ syncH(v); const me=HSEAT[ctx.me]; if(v.phase==='over') return ''; if(v.phase==='disc') return v.dq.length?'토론 중…':v.dready[ctx.me]?'기다리는 중…':'한마디 하거나 "다음 라운드로"'; if(v.phase==='place'&&v.placer===me) return '자리를 정하세요'; if(v.phase==='submit'&&v.pick[me]==null) return '숫자를 내세요'; return '진행 중…'; }
const guide=`
<p><b>이웃과 합쳐 13을 넘기지 마라</b> — 8인(우리 둘 + 성격 다른 컴퓨터 6명), 12칸 육각별 판.</p>
<ol><li>안쪽 6칸은 이웃 <b>3칸</b>(×3), 꼭짓점 6칸은 이웃 <b>1칸</b>(×1). 빈칸은 0으로 쳐요.</li>
<li>라운드마다 1~9 중 하나를 <b>몰래</b> 내요. 내 숫자 + 이웃 숫자 합이 <b>13 이하</b>면 +(내 숫자 × 이웃 칸 수), 넘으면 같은 만큼 <b>감점</b>.</li>
<li>내기 전에 이웃끼리 "몇 낼게요" <b>약속</b> — 거짓말도 가능! 약속을 어기면 이웃이 기억해요.</li>
<li>1라운드 자리는 추첨, 2라운드부터는 <b>꼴찌가 모두의 자리</b>를 정해요.</li>
<li>${ROUNDS}라운드 합계 1위 우승. 우리 둘 중 높은 쪽이 승리.</li></ol>
<div class="tipbox">💡 <b>팁</b><br>· 안쪽 칸은 크게 벌 수 있지만 이웃 셋을 믿어야 해요.<br>· 꼴찌가 되면 자리를 정할 수 있어요 — 내 이웃 칸을 비워 두면 안전하게 크게!<br>· 약속을 자주 어기는 사람 옆에선 낮게.</div>`;
const guideSteps=[
  {t:'✡️ 육각별 판', h:'안쪽 칸은 이웃 <b>3</b>(×3), 꼭짓점은 이웃 <b>1</b>(×1). 빈칸은 0.', demo:s=>{ s.round=0; startRound(s); s.q=[]; s.phase='talk'; return s; }},
  {t:'🤝 약속과 배신', h:'이웃끼리 "몇 낼게요" 약속. <b>거짓말</b>도 가능하고, 어기면 이웃이 기억해요.', demo:s=>{ s.round=0; startRound(s); s.q=[]; s.phase='submit'; s.promise=[null,3,4,null,2,5,null,3]; return s; }},
  {t:'🧮 13 이하면 득점', h:'내 숫자 + 이웃 합이 <b>13 이하</b>면 +(내 숫자 × 이웃 칸), 넘으면 그만큼 <b>감점</b>.', demo:s=>{ s.round=0; startRound(s); s.q=[]; s.pick=ALL.map(()=>1+(Math.random()*6|0)); s.phase='reveal'; s.shown=[...Array(CELLS).keys()]; return s; }},
  {t:'💬 결과 토론', h:'약속보다 높게 낸 사람 때문에 손해 보면 이웃이 <b>숫자로 따져요</b>("3 낸다더니 7!"). 어긴 쪽은 성격대로 변명·남 탓·뻔뻔·사과. 나도 🤨 따지기·🤝 고마워요·🙇 사과.', focus:'.vr-feed', demo:s=>{ s.round=0; startRound(s); s.q=[]; s.phase='disc'; s.feed=[{r:1,seat:2,text:'{s1}, 3 낸다더니 7 냈잖아요. 합 15 돼서 저 −9점이에요.',t:1,kind:'burn'},{r:1,seat:1,text:'약속은 약속일 뿐이죠 😏 서바이벌이에요.',kind:'defiant'}]; s.say={seat:1,text:'약속은 약속일 뿐이죠 😏',n:1,kind:'defiant'}; s.mood={2:{e:'😤',n:1},1:{e:'😏',n:2}}; return s; }},
  {t:'🤫 몰래 연합', h:'협상 때 귓속말로 <b>몰래 연합</b> — 이웃이 되면 서로 약속을 지키고, 꼴찌가 되면 좋은 자리를 챙겨 줘요. 연합이 약속을 깨면 💔, 토론에서 📢 폭로!', focus:'.fs-dm', demo:s=>{ s.round=0; startRound(s); s.q=[]; s.phase='talk'; s.dm={0:[{id:1,r:1,from:2,text:'우리 몰래 연합해요. 이웃이 되면 서로 약속 지키고, 자리 정할 땐 서로 챙겨 주기 🤫',state:'open',kind:'pact'}]}; s.dmN=1; return s; }},
  {t:'🪑 자리 부탁과 연합 약속', h:'꼴찌가 자리를 고민할 때 🙏 <b>부탁</b>할 수 있어요(안쪽·꼭짓점·옆자리·○○ 옆은 싫어요). 연합이면 🔢 <b>진짜 숫자 몰래 맞추기</b>, 🪑 <b>꼴찌 되면 자리 챙기기</b>, 🎯 <b>같이 견제</b>까지. 연합이 약속을 깨면 💔!', focus:'.vr-card', demo:s=>{ s.round=1; randomPlace(s); s.tot=[3,12,-4,8,20,6,-2,5]; s.phase='place'; s.placer=2; s.plea={}; return s; }},
  {t:'🪑 꼴찌가 자리 배치', h:'2라운드부터 <b>꼴찌</b>가 모두의 자리를 정해요. 5라운드 합계 1위 우승!', demo:s=>{ s.round=1; randomPlace(s); s.tot=[12,-6,20,3,8,-2,15,5]; s.phase='place'; s.placer=0; s.turn=0; return s; }},
];
window.GAMES.tri13 = { _sync:x=>syncH(x), maxH:8,
  title:'트라이13', ref:'피의 게임 「트라이13」', emoji:'✡️', tags:['협상','배신','숫자','NPC','두뇌서바이벌'],
  tagline:'내 숫자 + 이웃 숫자가 13을 넘으면 끝 — 약속과 배신의 육각별.',
  guide, guideSteps, init, apply, mask, ai, aiDelay, render, status, step, stepDelay, noPersona:true, wide:true,
  reset(){ sig=''; pv=null; plan=null; selP=null; dMode=null; lastDm=0; lastSay=0; aMode=null; avoidOpen=false; },
  bar:(v,i)=>`<span class="tag">${v.tot[HSEAT[i]]}점</span>`,
  result:(v,ctx)=>`${v.tot[HSEAT[ctx.me]]}점`,
  _bestN:bestN, _npcPlace:npcPlace, _H:HSEAT,
};
})();
