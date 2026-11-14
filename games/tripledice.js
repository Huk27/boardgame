(function(){
'use strict';
/* 트리플 다이스 (4인: 우리 둘 + NPC 2명). 각자 흰 주사위 9개(공개) + 빨강·파랑 1개씩(나만 봄). 4라운드.
   라운드: 모두 굴림 → 몰래 승점 예측(ZERO 0점·단 매번 혼자 꼴찌 / MIN 1~6 / MORE 7~10 / MAX 11+) →
   3번 제출(선부터 한 명씩 주사위 3개, 숨은 주사위는 ? 로 냈다가 다 내면 공개) → 제출마다 순위: 1위 6 · 2위 3 · 3위 1 · 4위 0(동률은 평균).
   조합: 트리플 > 스트레이트(연속 3, 6-1은 안 이어짐) > 더블 > 싱글, 같으면 숫자 큰 쪽. 남은 2개는 버림.
   예측 성공 → 그 라운드 점수 2배, ZERO 성공 → +40. 다음 제출의 선은 직전 제출 1위. */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로, 나머지는 NPC */
const N=4, ROUNDS=4, PTS=[6,3,1,0]; let HSEAT=[0,2]; const SEATORD=[0,2,1,3];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i);
const ALL=[...Array(N).keys()];
const PRED={zero:'ZERO (0점, 매번 혼자 꼴찌)',min:'MIN (1~6점)',more:'MORE (7~10점)',max:'MAX (11점 이상)'};
const FACE=['','⚀','⚁','⚂','⚃','⚄','⚅'];
const STYLE={seojin:'logic', doyun:'emo', haram:'calm', yuna:'emo', minho:'sly', taekyung:'emo', jihu:'sly', soyul:'logic'};
const DEF_P={talk:.6,aggr:.5,trust:.5,bluff:.5,logic:.6,temper:.4};
const nm=i=>`{s${i}}`;
const roll=()=>1+(Math.random()*6|0);
function comboVal(vs){ const v=vs.slice().sort((a,b)=>b-a);
  if(v[0]===v[1]&&v[1]===v[2]) return [3,v[0]];
  if(v[0]-1===v[1]&&v[1]-1===v[2]) return [2,v[0]];
  if(v[0]===v[1]) return [1,v[0],v[2]]; if(v[1]===v[2]) return [1,v[1],v[0]];
  return [0,v[0],v[1],v[2]]; }
const cmpV=(a,b)=>{ for(let k=0;k<Math.max(a.length,b.length);k++){ const d=(a[k]||0)-(b[k]||0); if(d) return d; } return 0; };
const CN=['싱글','더블','스트레이트','트리플'];
const vName=v=>`${CN[v[0]]} ${v[1]}`;

function sayF(s,i,t,kind,tg){ s.say={seat:i,text:t,n:(s.say?s.say.n:0)+1}; (s.feed=s.feed||[]).push({r:s.round,seat:i,text:t,kind:kind||'say',t:tg??null}); }
const RMK={taunt:['😏 이번 판은 제가 가져갈게요.','😏 다들 긴장하세요~','😏 그 정도로는 저 못 이겨요.'],praise:['👍 와, 방금 거 잘했어요!','👍 대단한데요?','👍 인정, 잘하시네요.'],boast:['😎 이번 라운드 1등은 저예요.','😎 제 패, 엄청 좋아요.','😎 예측? 이미 끝났어요.']};
const RPL={taunt:['말은 쉽죠 😏','두고 봐요!','오, 자신감 좋네요.','그 말 후회하게 해 줄게요 😤'],praise:['고마워요 😊','칭찬해도 안 봐줘요 😏','헤헤, 운이 좋았어요.'],boast:['정말요? 🤨','그건 결과로 보여 줘요.','뻥 같은데요? 😏','…표정 보니까 진짜 같기도 하고.']};
function init(starter,o){ const k=Math.max(2,Math.min(4,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  const s={score:Array(N).fill(0), round:0, phase:'intro', dice:ALL.map(()=>[]), used:ALL.map(()=>[]), pred:Array(N).fill(null), sub:0, subs:[], cur:-1, order:[], lead:starter===0?0:2,
    roundPts:Array(N).fill(0), soleLast:Array(N).fill(true), hist:[], who:{}, usedL:{}, say:null, q:[], log:[], turn:null, starter, winner:null, notice:'🎙️ 트리플 다이스를 시작합니다', ev:0, done:HSEAT.map(()=>false), hs:HSEAT.slice()};
  const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=ids[k]);
  return s;
}
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
/* 🏆 시즌 관계(NPCS.rel): 시즌이 아니면 0 — 동맹엔 다정하게, 앙숙엔 차갑게, 1라운드 시작 때 한마디 */
const RL=(s,i,j)=>{ if(isH(i)||j==null||!window.NPCS||!NPCS.rel||!s.who) return 0; try{ return NPCS.rel(s.who[i], isH(j)?(pOf(j)===0?'me':'opp'):s.who[j])||0; }catch(_){ return 0; } };
const SRL={cold:{taunt:['또 시작이네요. 휴식 시간에도 그러더니 😒','그 말, 로비 때도 했죠? 이번엔 안 넘어가요.'],praise:['칭찬해도 데스매치 때 일은 안 잊어요 😒','갑자기 왜 칭찬이에요? 수상한데요.'],boast:['허세는 여전하네요 😒','이번 판은 꼭 꺾어 줄게요.']},
  warm:{taunt:['우리 사이에 그러기예요? ㅋㅋ','살살 해요, 같은 편이잖아요 😆'],praise:['역시 믿을 만한 사람이에요 🤝','고마워요, 끝까지 같이 가요!'],boast:['좋아요, 그래도 둘 다 살아남아요 🤝','잘됐네요! 우리 둘 다 올라가요.']}};
function seasonOpen(s){ if(s.round!==1) return; let b=null; for(const i of ALL) for(const j of ALL){ if(i===j||isH(i)) continue; const r=RL(s,i,j); if(Math.abs(r)>.35&&(!b||Math.abs(r)>Math.abs(b[2]))) b=[i,j,r]; } if(!b) return;
  const [i,j,r]=b; (s.rq=s.rq||[]).push({i,t:j,kind:r>0?'thanks':'angry',text: r>0 ? U.pick([`${nm(j)}, 이번 판도 같이 살아남아요 🤝`,`${nm(j)}, 여기까지 같이 왔는데 끝까지 가요!`]) : U.pick([`${nm(j)}, 지난 회차 일 있으니까 봐주는 거 없어요 😤`,`${nm(j)}, 이 판에서 갚아 줄게요.`])}); }
function startRound(s){
  s.round++; if(s.round>ROUNDS) return endGame(s); seasonOpen(s);
  s.dice=ALL.map(()=>[...Array(9)].map(()=>({v:roll(),h:null})).concat([{v:roll(),h:'r'},{v:roll(),h:'b'}]));
  s.used=ALL.map(()=>[]); s.pred=Array(N).fill(null); s.done=HSEAT.map(()=>false); s.sub=0; s.subs=[]; s.roundPts=Array(N).fill(0); s.soleLast=Array(N).fill(true); s.blockSaid=false;
  for(const i of ALL) if(!isH(i)) s.pred[i]=npcPredict(s,i);
  s.phase='predict'; s.notice=`🎲 ${s.round}라운드 — 주사위를 굴렸어요. 이번 라운드 승점을 몰래 예측하세요`; s.log.push(`— ${s.round}라운드 —`);
}
function startSub(s){
  s.sub++; s.cur=-1; s.order=[...Array(N)].map((_,k)=>(s.lead+k)%N); s.subs.push({picks:Array(N).fill(null), revealed:false});
  s.phase='submit'; s.notice=`🎙️ ${s.sub}번째 제출 — 선은 ${nm(s.lead)}`; nextSubmitter(s);
}
function nextSubmitter(s){
  s.cur++; if(s.cur>=N){ s.phase='reveal'; s.turn=null; s.notice='🎙️ 숨은 주사위를 공개합니다…'; return; }
  const i=s.order[s.cur]; s.actor=i; s.phase='submit'; s.notice=`💭 ${nm(i)} 주사위 3개를 고르는 중…`;
  if(isH(i)) s.turn=pOf(i); else { s.turn=null; s.think=1200+Math.random()*1400; }
}
function submit(s,i,idx){ s.subs[s.sub-1].picks[i]=idx; s.used[i].push(...idx); const d=s.dice[i];
  s.log.push(`${nm(i)} 제출: ${idx.map(k=>d[k].h?'❓':FACE[d[k].v]).join(' ')}`); s.notice=`🎲 ${nm(i)}: ${idx.map(k=>d[k].h?'❓':FACE[d[k].v]).join(' ')}`; s.phase='submitted'; s.turn=null; }
function rankSub(s){
  const sb=s.subs[s.sub-1]; sb.revealed=true;
  const vals=ALL.map(i=>comboVal(sb.picks[i].map(k=>s.dice[i][k].v)));
  const order=ALL.slice().sort((a,b)=>cmpV(vals[b],vals[a])); const pts=Array(N).fill(0);
  let k=0; while(k<N){ let j=k; while(j+1<N&&cmpV(vals[order[j+1]],vals[order[k]])===0) j++; const avg=PTS.slice(k,j+1).reduce((a,b)=>a+b,0)/(j-k+1); for(let t=k;t<=j;t++) pts[order[t]]=avg; k=j+1; }
  const last=order[N-1], soleLast=cmpV(vals[order[N-2]],vals[last])!==0;
  for(const i of ALL){ s.roundPts[i]+=pts[i]; if(!(i===last&&soleLast)) s.soleLast[i]=false; }
  sb.vals=vals; sb.pts=pts; sb.order=order;
  const top=order[0], tie=cmpV(vals[order[1]],vals[top])===0;
  s.lead = tie ? order.filter(i=>cmpV(vals[i],vals[top])===0).sort((a,b)=>s.score[b]-s.score[a])[0] : top;
  s.notice=`🏆 ${s.sub}번째 제출 1위 ${nm(order[0])} (${vName(vals[order[0]])})`; s.log.push(`${s.sub}번째: ${order.map(i=>`${nm(i)} ${vName(vals[i])} +${pts[i]}`).join(' · ')}`);
}
function endRound(s){
  const lines=[];
  for(const i of ALL){ const p=s.pred[i], x=s.roundPts[i];
    const ok = p==='zero' ? (x===0&&s.soleLast[i]) : p==='min' ? (x>0&&x<7) : p==='more' ? (x>=7&&x<=10) : (x>10);
    const got = p==='zero'&&ok ? 40 : ok ? x*2 : x; s.score[i]+=got;
    lines.push(`${nm(i)} 예측 ${p.toUpperCase()} ${ok?'⭕':'❌'} → +${got}`); }
  s.hist.push({r:s.round, pred:s.pred.slice(), pts:s.roundPts.slice()});
  s.q.push({k:'note',text:`🎙️ ${s.round}라운드 예측 공개: ${lines.join(' / ')}`});
  const zeroOk=ALL.find(i=>s.pred[i]==='zero'&&s.roundPts[i]===0&&s.soleLast[i]); if(zeroOk!=null&&!isH(zeroOk)) s.q.push({k:'say',seat:zeroOk,kind:'zero'});
  const zeroFail=ALL.find(i=>s.pred[i]==='zero'&&!(s.roundPts[i]===0&&s.soleLast[i])); if(zeroFail!=null&&!isH(zeroFail)) s.q.push({k:'say',seat:zeroFail,kind:'zerofail'});
  s.phase='roundEnd';
}
function endGame(s){ s.phase='over'; s.turn=null; s.rank=ALL.slice().sort((a,b)=>s.score[b]-s.score[a]); s.winner=isH(s.rank[0])?pOf(s.rank[0]):'none'; s.winners=isH(s.rank[0])?[pOf(s.rank[0])]:[];
  s.notice=`🎙️ 최종 1등 ${nm(s.rank[0])} ${s.score[s.rank[0]]}점 · 꼴찌 ${nm(s.rank[N-1])}`; s.log.push(s.notice); }

/* ── NPC ── */
function bestGroups(vals){   // 11개에서 3묶음 고르기(욕심): 강한 조합부터
  const idx=vals.map((v,k)=>k), out=[]; let left=idx.slice();
  for(let g=0;g<3;g++){ let best=null; for(let a=0;a<left.length;a++) for(let b=a+1;b<left.length;b++) for(let c=b+1;c<left.length;c++){ const t=[left[a],left[b],left[c]], v=comboVal(t.map(k=>vals[k])); if(!best||cmpV(v,best.v)>0) best={t,v}; }
    if(!best) break; out.push(best); left=left.filter(k=>!best.t.includes(k)); }
  return out;
}
function worstGroups(vals){ const idx=vals.map((v,k)=>k), out=[]; let left=idx.slice();
  for(let g=0;g<3;g++){ let best=null; for(let a=0;a<left.length;a++) for(let b=a+1;b<left.length;b++) for(let c=b+1;c<left.length;c++){ const t=[left[a],left[b],left[c]], v=comboVal(t.map(k=>vals[k])); if(!best||cmpV(v,best.v)<0) best={t,v}; }
    if(!best) break; out.push(best); left=left.filter(k=>!best.t.includes(k)); }
  return out; }
function estPts(s,i){   // 내 강한 3묶음이 남의 공개 흰 주사위 최선 묶음과 비교해 몇 등쯤인지
  const mine=bestGroups(s.dice[i].map(d=>d.v)), others=ALL.filter(j=>j!==i).map(j=>bestGroups(s.dice[j].filter(d=>!d.h).map(d=>d.v)));
  let e=0; for(let g=0;g<3;g++){ const beat=others.filter(o=>cmpV(mine[g].v,o[g].v)>0).length; e+=PTS[3-beat]; } return e; }
function npcPredict(s,i){ const p=P(s,i), e=estPts(s,i), w=worstGroups(s.dice[i].map(d=>d.v));
  const weakest=w.every(g=>g.v[0]===0&&g.v[1]<=5);
  if(weakest && Math.random()<.25+p.bluff*.5) return 'zero';
  const x=e*(.8+Math.random()*.4); return x>10?'max':x>=7?'more':'min'; }
function npcSubmit(s,i){
  const p=P(s,i), left=s.dice[i].map((d,k)=>k).filter(k=>!s.used[i].includes(k)), vals=left.map(k=>s.dice[i][k].v);
  const pred=s.pred[i];
  let g;
  if(pred==='zero'){ g=worstGroups(vals)[0]; }
  else { const bg=bestGroups(vals); const need = pred==='max'?99 : pred==='more'?8.5 : 3.5;
    // 목표보다 이미 많이 벌었으면 약하게, 모자라면 강하게
    g = s.roundPts[i]>=need ? worstGroups(vals)[0] : bg[0];
    // 누가 ZERO를 노리는 것 같으면(앞서 최약 조합을 냄) 막으려고 더 약한 걸 섞기도
    const sb=s.subs[s.sub-1]; const weakShown=ALL.some(j=>j!==i&&sb.picks[j]&&sb.picks[j].every(k=>!s.dice[j][k].h)&&comboVal(sb.picks[j].map(k=>s.dice[j][k].v))[0]===0&&s.soleLast[j]);
    if(weakShown && p.aggr>.6 && Math.random()<.5) g=worstGroups(vals)[0];
    const suspect=ALL.some(j=>j!==i&&s.sub>=2&&s.soleLast[j]);   // 누가 매번 혼자 꼴찌 → ZERO 의심, 일부러 더 약하게 내서 깨기
    if(suspect && pred!=='max' && Math.random()<.4+p.logic*.5){ g=worstGroups(vals)[0]; if(!s.blockSaid){ s.blockSaid=true; s.q.push({k:'say',seat:i,kind:'block'}); } } }
  return g.t.map(k=>left[k]);
}
const LINES={
  sly:{zero:['후후, ZERO였어요~ 40점 잘 받을게요 😏'], zerofail:['어머, 누가 제 ZERO를 막았네~'], block:['어머, 누가 ZERO 노리네~? 그냥은 안 두죠 😏'], first:['이번 판 1등~ 😏']},
  calm:{zero:['…ZERO 성공.'], zerofail:['…막혔네요.'], block:['…ZERO는 막을게요.'], first:['1등.']},
  logic:{zero:['계산대로 ZERO 성공이에요.'], zerofail:['누가 더 약하게 내서 ZERO가 깨졌네요.'], block:['매번 혼자 꼴찌라면 ZERO예요. 일부러 약하게 내서 막을게요.'], first:['이 조합이면 1등이 맞죠.']},
  emo:{zero:['ZERO 성공!!! 40점!!! 🥳'], zerofail:['으앙 ZERO 망했어 😭'], block:['누구야 ZERO 노리는 사람!! 안 돼!! 😤'], first:['1등이다!! 🎲']},
};
function lineOf(s,seat,kind){ const p=P(s,seat), st=STYLE[p.id]||'calm', L=(LINES[st]||{})[kind]; if(!L) return null;
  const used=(s.usedL[seat]=s.usedL[seat]||[]), pool=L.filter(x=>!used.includes(x)); if(!pool.length) return null; const raw=U.pick(pool); used.push(raw); return raw; }

/* ── 시간 흐름 ── */
function stepDelay(s){ syncH(s); if(s.rq&&s.rq.length&&s.winner==null) return 1500;
  if(s.winner!=null) return null;
  if(s.phase==='intro') return 1800;
  if(s.q.length) return s.q[0].k==='note'?2600:1300;
  if(s.phase==='predict') return s.done.every(Boolean)?900:null;
  if(s.phase==='submit') return isH(s.actor)?null:s.think;
  if(s.phase==='submitted') return 800;
  if(s.phase==='reveal') return 1500;
  if(s.phase==='ranked') return 2200;
  if(s.phase==='roundEnd') return 1500;
  return null;
}
function step(s){ syncH(s); if(s.rq&&s.rq.length){ const e=s.rq.shift(); if(e.text){ sayF(s,e.i,e.text,e.kind||'say',e.t); s.ev++; return; } const sr=RL(s,e.i,e.t), L=(sr<-.25?SRL.cold[e.kind]:sr>.25?SRL.warm[e.kind]:null)||RPL[e.kind]; const used=((s.usedR=s.usedR||{})[e.i]=s.usedR[e.i]||[]); const c=L.filter(x=>!used.includes(x)); const t=U.pick(c.length?c:L); used.push(t); sayF(s,e.i,t,e.kind==='praise'?'thanks':e.kind==='taunt'?'angry':'reply',e.t); s.ev++; return; }
  if(s.phase==='intro'){ startRound(s); return; }
  if(s.q.length){ const e=s.q.shift(); if(e.k==='note'){ s.notice=e.text; s.log.push(e.text); } else if(e.k==='say'){ const t=lineOf(s,e.seat,e.kind); if(t){ sayF(s,e.seat,t); s.log.push(`${nm(e.seat)}: ${t}`); } } s.ev++; return; }
  if(s.phase==='predict'&&s.done.every(Boolean)){ s.log.push('🤫 모두 예측을 제출했어요'); startSub(s); return; }
  if(s.phase==='submit'&&!isH(s.actor)){ submit(s,s.actor,npcSubmit(s,s.actor)); s.ev++; return; }
  if(s.phase==='submitted'){ nextSubmitter(s); return; }
  if(s.phase==='reveal'){ rankSub(s); s.phase='ranked'; const w=s.subs[s.sub-1].order[0]; if(!isH(w)&&Math.random()<.4) s.q.push({k:'say',seat:w,kind:'first'}); s.ev++; return; }
  if(s.phase==='ranked'){ if(s.sub<3) startSub(s); else endRound(s); return; }
  if(s.phase==='roundEnd'){ startRound(s); return; }
}
function remark(s,seat,kind,t){ s.rm=s.rm||{}; if(s.rm[seat]===s.round+':'+kind) return '이번 라운드엔 이미 했어요'; s.rm[seat]=s.round+':'+kind; const L=RMK[kind]; if(!L) return '알 수 없는 말'; sayF(s,seat,U.pick(L),kind,t);
  const others=ALL.filter(j=>!isH(j)); const r=t!=null&&!isH(t)?t:U.pick(others); if(r!=null){ (s.rq=s.rq||[]).push({i:r,kind,t:seat}); } return null; }
function apply(s,p,a){ syncH(s); if(a&&a.k==='remark'){ if(s.winner!=null) return '게임이 끝났어요'; const e=remark(s,HSEAT[p],a.kind,a.t); if(!e) s.ev++; return e; }
  if(s.winner!=null) return '게임이 끝났어요';
  const seat=HSEAT[p]; if(!a) return '알 수 없는 동작';
  if(a.k==='predict'){ if(s.phase!=='predict'||s.done[p]) return '예측할 때가 아니에요'; if(!PRED[a.v]) return '예측을 고르세요'; s.pred[seat]=a.v; s.done[p]=true; return null; }
  if(a.k==='submit'){ if(s.phase!=='submit'||s.actor!==seat) return '내 차례가 아니에요';
    const idx=(Array.isArray(a.idx)?a.idx:[]).map(x=>x|0); if(idx.length!==3||new Set(idx).size!==3||idx.some(k=>!(k>=0&&k<11)||s.used[seat].includes(k))) return '남은 주사위 3개를 고르세요';
    submit(s,seat,idx); return null; }
  return '알 수 없는 동작';
}
function mask(s,p){ syncH(s);
  const v=U.clone(s), me=HSEAT[p], over=s.phase==='over';
  if(!over){ v.dice=s.dice.map((ds,i)=> i===me ? ds : ds.map((d,k)=> d.h && !s.subs.some(sb=>sb.revealed&&sb.picks[i]&&sb.picks[i].includes(k)) ? {v:null,h:d.h} : d));
    if(s.phase!=='roundEnd') v.pred=s.pred.map((x,i)=>i===me?x:(x?'?':null)); }
  v.q=[]; v.usedL={};
  return v;
}
function ai(v){ syncH(v); const seat=HSEAT[1];
  if(v.phase==='predict'&&!v.done[1]) return {k:'predict',v:U.pick(['min','more','max'])};
  if(v.phase==='submit'&&v.actor===seat){ const left=v.dice[seat].map((d,k)=>k).filter(k=>!v.used[seat].includes(k)); const g=bestGroups(left.map(k=>v.dice[seat][k].v))[0]; return {k:'submit',idx:g.t.map(k=>left[k])}; }
  return null; }

/* ── 화면 ── */
let WHO={}, sel=[], sig='';
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}/g,(_,d)=>`${seatEmoji(+d)} ${seatName(+d,ctx)}`); }
const die=(d,cls='',k)=>`<span class="td-d ${d.h==='r'?'red':d.h==='b'?'blue':''} ${cls}" ${k!=null?`data-k="${k}"`:''}>${d.v==null?'?':FACE[d.v]}</span>`;
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{};
  const me=HSEAT[ctx.me], mySub=v.phase==='submit'&&v.actor===me&&v.turn===ctx.me;
  const sg=v.phase+':'+v.round+':'+v.sub+':'+v.actor; if(sg!==sig){ sig=sg; sel=[]; }
  let h=`<div class="info">${v.round} / ${ROUNDS}라운드 · ${v.sub?`${v.sub}/3번째 제출`:''} · ⭐ 내 점수 <b>${v.score[me]}</b> · 이번 라운드 ${v.roundPts[me]}점${v.pred[me]?` · 예측 <b>${v.pred[me].toUpperCase()}</b>`:''}</div>`;
  h+=`<div class="hl-notice">${fill(v.notice||'',ctx)}</div>`;
  h+=`<div class="vr-speech">${v.say?`<span class="w">${seatEmoji(v.say.seat)} ${seatName(v.say.seat,ctx)}</span> ${fill(U.esc(v.say.text),ctx)}`:'<i>　</i>'}</div>`;
  const cur=v.subs[v.sub-1];
  const zs=v.sub>=2&&v.phase!=='roundEnd'?ALL.filter(j=>v.soleLast[j]&&(v.subs[v.sub-2]||{}).revealed):[]; if(zs.length&&v.sub<=3) h+=`<div class="td-warn">🚨 ${zs.map(j=>fill(nm(j),ctx)).join(', ')} — 지금까지 매번 혼자 꼴찌! ZERO를 노리는 중일지도</div>`;
  h+=`<div class="td-rows">${(v.order.length?v.order:ALL).map(i=>{ const pk=cur&&cur.picks[i];
    return `<div class="td-row ${i===me?'me':''} ${v.actor===i&&v.phase==='submit'?'act':''}"><div class="td-who">${seatEmoji(i)} ${seatName(i,ctx)} ${isH(i)?'':`<small>${NPCI(i)[2]}</small>`}<small>⭐${v.score[i]} · 이번 ${v.roundPts[i]} · 예측 ${v.pred[i]?(v.pred[i]==='?'?'🤫':v.pred[i].toUpperCase()):'…'}</small></div>
      <div class="td-sub">${pk?pk.map(k=>die(v.dice[i][k],'big')).join('')+(cur.vals?` <small>${vName(cur.vals[i])} +${cur.pts[i]}</small>`:''):(v.actor===i&&v.phase==='submit'?'<em>💭 고르는 중…</em>':'')}</div>
      <div class="td-left">${v.dice[i].map((d,k)=>v.used[i].includes(k)?'':die(d,'sm')).join('')}</div></div>`; }).join('')}</div>`;
  if(v.phase==='predict'&&!v.done[ctx.me]) h+=`<div class="vr-card"><b>🤫 이번 라운드 승점 예측</b><p>내 주사위: ${v.dice[me].map(d=>die(d,'sm')).join('')}</p><div class="fh-act">${Object.entries(PRED).map(([k,t])=>`<button class="ghost" data-p="${k}">${t}</button>`).join('')}</div><small>제출마다 1위 6·2위 3·3위 1·4위 0. 맞히면 2배, ZERO는 +40!</small></div>`;
  else if(v.phase==='predict') h+=`<div class="info">예측 완료 — 다른 사람 기다리는 중…</div>`;
  if(mySub){ const left=v.dice[me].map((d,k)=>k).filter(k=>!v.used[me].includes(k));
    h+=`<div class="vr-card"><b>🎲 주사위 3개 고르기</b><div class="td-pick">${left.map(k=>die(v.dice[me][k],sel.includes(k)?'big sel':'big',k)).join('')}</div>${sel.length===3?`<p>${vName(comboVal(sel.map(k=>v.dice[me][k].v)))}</p>`:''}<div class="fh-act"><button data-a="go" ${sel.length===3?'':'disabled'}>이 3개 제출</button></div><small>빨강·파랑은 남에게 ?로 보였다가 모두 내면 공개돼요. 3번 내고 남은 2개는 버려요.</small></div>`; }
  if(v.phase==='over'&&v.rank) h+=`<div class="sn-score">${v.rank.map((i,k)=>`<div class="${isH(i)?'h':''}"><b>${k+1}등 ${seatEmoji(i)} ${seatName(i,ctx)} ${v.score[i]}점</b>${k===N-1?' <small>😵 꼴찌</small>':''}</div>`).join('')}</div>`;
  const L=U.politics(v.feed||[],{seats:ALL,emo:seatEmoji,name:i=>seatName(i,ctx),me})+`<div class="side-box"><div class="side-h">🧠 라운드 기록 <small>예측 · 라운드 점수</small></div>${v.hist.slice().reverse().map(x=>`<div class="rr-h"><b>${x.r}라운드</b><br>${ALL.map(i=>`<span>${seatEmoji(i)} ${x.pred[i].toUpperCase()} ${x.pts[i]}</span>`).join('')}</div>`).join('')||'<small style="color:#888">라운드가 끝나면 모두의 예측과 점수가 쌓여요. 누가 ZERO를 노리는지 보세요!</small>'}
    <div class="side-h" style="margin-top:6px">📏 조합 순위</div><small>트리플 > 스트레이트(연속 3) > 더블 > 싱글<br>같으면 숫자 큰 쪽 → 남은 숫자</small></div>`;
  const R=U.chat(v.feed||[],{emo:seatEmoji,name:i=>seatName(i,ctx),fill:t=>fill(t,ctx),me})+`<div class="side-box side-log"><div class="side-h">📜 진행 기록 <small>최근이 위</small></div>${v.log.slice(-60).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  if(v.phase!=='over'&&v.winner==null) h+=`<div class="fh-act rmk-row"><small>🗣️ 한마디</small><button class="ghost small" data-rmk="taunt">😏 도발</button><button class="ghost small" data-rmk="praise">👍 칭찬</button><button class="ghost small" data-rmk="boast">😎 자신만만</button></div>`;
  el.innerHTML=`<div class="side3 has-chat"><div class="side-mid">${h}</div><aside class="side-l">${L}</aside><aside class="side-r">${R}</aside></div>`;
  el.onclick=e=>{ const rk=e.target.closest('[data-rmk]'); if(rk) return ctx.act({k:'remark',kind:rk.dataset.rmk});
    const pp=e.target.closest('[data-p]'); if(pp) return ctx.act({k:'predict',v:pp.dataset.p});
    const d=e.target.closest('[data-k]'); if(d&&mySub){ const k=+d.dataset.k; sel = sel.includes(k)?sel.filter(x=>x!==k):sel.length<3?sel.concat(k):sel; return ctx.rerender(); }
    const a=e.target.closest('[data-a="go"]'); if(a&&!a.disabled){ const x=sel; sel=[]; return ctx.act({k:'submit',idx:x}); }
  };
}
function status(v,ctx){ syncH(v); const me=HSEAT[ctx.me]; if(v.phase==='over') return ''; if(v.phase==='predict') return v.done[ctx.me]?'다른 사람 예측 중…':'승점을 예측하세요'; if(v.phase==='submit'&&v.actor===me) return '주사위 3개를 내세요'; return '진행 중…'; }
const guide=`
<p><b>4인 주사위 심리전</b>(우리 둘 + 성격 다른 컴퓨터 플레이어 2명). 각자 <b>흰 주사위 9개(모두에게 공개)</b> + <b>빨강·파랑 1개씩(나만 봄)</b>. ${ROUNDS}라운드.</p>
<ol><li>모두 굴린 뒤 이번 라운드 승점을 <b>몰래 예측</b>: ZERO(0점 — 단 세 번 모두 혼자 꼴찌) · MIN(1~6) · MORE(7~10) · MAX(11 이상).</li>
<li><b>3번 제출</b>: 선부터 한 명씩 주사위 3개. 빨강·파랑은 ?로 냈다가 모두 내면 공개. 남은 2개는 버려요.</li>
<li>제출마다 순위: 1위 6 · 2위 3 · 3위 1 · 4위 0 (동률은 평균). 다음 제출의 선은 직전 1위.</li>
<li>라운드 끝: 예측이 맞으면 그 라운드 점수 <b>2배</b>, <b>ZERO 성공은 +40</b>!</li></ol>
<p>조합: 트리플 > 스트레이트(연속 3, 6-1은 안 이어짐) > 더블 > 싱글. 같으면 숫자가 큰 쪽.</p>
<div class="tipbox">💡 <b>팁</b><br>· 누가 계속 약한 조합만 내면 ZERO를 노리는 중! 나도 더 약하게 내서 "혼자 꼴찌"를 깨 버리세요.<br>· 예측보다 점수가 넘칠 것 같으면 일부러 약한 걸 내서 맞추기.</div>`;
window.GAMES.tripledice = { _sync:x=>syncH(x), maxH:4,
  title:'트리플 다이스', ref:'데블스 플랜 「트리플 다이스」', emoji:'🎲', tags:['주사위','심리전','NPC','두뇌서바이벌'],
  tagline:'우리 둘 + 컴퓨터 2명. 공개 주사위 9개와 숨은 주사위 2개로 세 번 승부 — 점수를 맞히거나, ZERO로 40점을 노려라.',
  guide, init, apply, mask, ai, render, status, step, stepDelay, noPersona:true, wide:true,
  aiDelay:()=>1300+Math.random()*1500,
  reset(){ sel=[]; sig=''; },
  bar:(v,i)=>`<span class="tag">⭐ ${v.score[HSEAT[i]]}</span>`,
  result:(v,ctx)=>{ const k=(v.rank||[]).indexOf(HSEAT[ctx.me]); return k>=0?`${k+1}등 · ${v.score[HSEAT[ctx.me]]}점`:''; },
};
})();
