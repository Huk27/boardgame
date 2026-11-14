(function(){
'use strict';
/* 언노운 (6인: 우리 둘 + NPC 4명). 7×6 색깔 판 + 아래 회색 출발줄 + 맨 위 가운데 골인.
   각자 여섯 색 정육면체 말을 굴려 상하좌우 한 칸씩(굴리면 윗면 색이 바뀜). 가려는 칸에 말이 있으면 그 말을 한 칸 밀어냄.
   ❓ 숨은 규칙 8개는 처음부터 적용되지만 라운드가 끝날 때마다 하나씩만 공개(원작 순서 그대로). 골인하면 즉시 끝, 나머지는 골인까지 거리순. */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로, 나머지는 NPC */
const N=6, W=7, H=6, MAXR=12; let HSEAT=[0,3]; const SEATORD=[0,3,1,4,2,5];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i);
const ALL=[...Array(N).keys()];
const COL=['흰','파랑','초록','빨강','보라','노랑'], HEX=['#f5f5f5','#4a7bd0','#4caf6a','#e2574c','#8e5cc7','#f0c330'];
const GOAL=[0,3];   // [row,col], row 0이 맨 위
const RULES=[
  '말의 윗면이 흰색이거나 흰색 칸에 들어가면 추방! 추방 징표를 받고 출발줄로 돌아가요.',
  '추방 징표 3개가 되면 벌점 −3 (처음 두 명까지만).',
  '밀려난 말에는 규칙이 적용되지 않아요 (추방만 예외).',
  '내 말 둘레 9칸(내 칸 포함)에 내 윗면과 같은 색이 없으면, 윗면 색을 바꿔야 해요.',
  '그때 바꾸는 색은 9칸 안에 있는 색이어야 해요.',
  '9칸 안에 내 윗면 색이 3개 이상이면, 그 색 윗면을 가진 다른 말 하나를 한 칸 뒤로 밀어요.',
  '그 색이 노랑이면 색과 상관없이 아무 말이나 하나 밀어요.',
  '내 윗면 색과 같은 색이 내 칸을 지나 일직선(대각선 포함) 3칸이면, 한 번 더 움직여요.',
];
const STYLE={seojin:'logic', doyun:'emo', haram:'calm', yuna:'emo', minho:'sly', taekyung:'emo', jihu:'sly', soyul:'logic'};
const DEF_P={talk:.6,aggr:.5,trust:.5,bluff:.5,logic:.6,temper:.4};
const nm=i=>`{s${i}}`;
const DIRS={u:[-1,0],d:[1,0],l:[0,-1],r:[0,1]}, DN={u:'⬆️',d:'⬇️',l:'⬅️',r:'➡️'};
// 정육면체: {t,b,n,s,e,w} 각 면의 색
function rollCube(c,d){ const x={...c};
  if(d==='u'){ x.t=c.s; x.n=c.t; x.b=c.n; x.s=c.b; } if(d==='d'){ x.t=c.n; x.s=c.t; x.b=c.s; x.n=c.b; }
  if(d==='l'){ x.t=c.e; x.w=c.t; x.b=c.w; x.e=c.b; } if(d==='r'){ x.t=c.w; x.e=c.t; x.b=c.e; x.w=c.b; } return x; }
function cubeWithTop(c,col){   // col이 위로 오게 굴림 (옆면은 대충 유지)
  for(const seq of [[],['u'],['d'],['l'],['r'],['u','u']]){ let x=c; for(const d of seq) x=rollCube(x,d); if(x.t===col) return x; } return c; }

function init(starter,o){ const k=Math.max(2,Math.min(6,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  // 판: 흰 칸은 적게(통로가 막히지 않게), 골인 칸은 색 없음
  let board; for(;;){ board=[...Array(H)].map(()=>[...Array(W)].map(()=>1+(Math.random()*5|0)));
    let w=0; while(w<5){ const r=1+(Math.random()*(H-1)|0), c=Math.random()*W|0; if(board[r][c]!==0){ board[r][c]=0; w++; } }
    board[GOAL[0]][GOAL[1]]=null; break; }
  const cols=U.shuffle([0,1,2,4,5,6]);
  const pcs=ALL.map(i=>{ const faces=U.shuffle([0,1,2,3,4,5]); let c={t:faces[0],b:faces[1],n:faces[2],s:faces[3],e:faces[4],w:faces[5]}; if(c.t===0) c=cubeWithTop(c,faces[1]);
    return {r:H, c:cols[i], home:cols[i], cube:c, tok:0}; });
  const s={board, pcs, round:1, ord:ALL.slice().sort((a,b)=>pcs[a].c-pcs[b].c), cur:0, revealed:0, pen:Array(N).fill(0), penCount:0,
    phase:'intro', q:[], who:{}, used:{}, say:null, log:[], events:[], turn:null, starter, winner:null, notice:'🎙️ 숨은 규칙이 있는 게임입니다. 규칙은 라운드마다 하나씩만 알려 드려요', ev:0, extra:false};
  s.hs=HSEAT.slice(); const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=ids[k]);
  return s;
}
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
const inB=(r,c)=>r>=0&&r<=H&&c>=0&&c<W;   // r==H 는 출발줄
const cellCol=(s,r,c)=> r>=0&&r<H ? s.board[r][c] : null;
const occ=(s,r,c,except)=>ALL.find(i=>i!==except&&s.pcs[i].r===r&&s.pcs[i].c===c);
function canMove(s,i,d){ const p=s.pcs[i], [dr,dc]=DIRS[d], r=p.r+dr, c=p.c+dc;
  if(!inB(r,c)) return false; if(r===H) return false;   // 출발줄로는 못 돌아감
  const q=occ(s,r,c,i); if(q!=null){ const r2=r+dr, c2=c+dc; if(!inB(r2,c2)||r2===H||occ(s,r2,c2)!=null) return false; if(r2===GOAL[0]&&c2===GOAL[1]) return false; }
  return true; }
const dist=(p)=> Math.abs(p.r-GOAL[0])+Math.abs(p.c-GOAL[1]);
function nb9(s,i){ const p=s.pcs[i], out=[]; for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){ const r=p.r+dr, c=p.c+dc; if(r<0||r>=H||c<0||c>=W) continue; const col=cellCol(s,r,c); if(col!=null) out.push(col); const q=occ(s,r,c,i); if(q!=null) out.push(s.pcs[q].cube.t); } return out; }

/* ── 한 번 움직이기 + 숨은 규칙 판정 (사건은 큐로 한 줄씩) ── */
function doMove(s,i,d,sim){
  const p=s.pcs[i], [dr,dc]=DIRS[d], ev=[];
  const r=p.r+dr, c=p.c+dc, q=occ(s,r,c,i);
  const pushEv=[];
  if(q!=null){ const qp=s.pcs[q]; qp.r+=dr; qp.c+=dc; qp.cube=rollCube(qp.cube,d); pushEv.push({t:'push',i,q});
    if(exiled(s,q)) pushEv.push(...exile(s,q)); }   // 밀린 말은 추방만 적용
  p.r=r; p.c=c; p.cube=rollCube(p.cube,d); ev.push({t:'move',i,d}, ...pushEv);
  if(r===GOAL[0]&&c===GOAL[1]){ ev.push({t:'goal',i}); return ev; }
  if(exiled(s,i)){ ev.push(...exile(s,i)); return ev; }
  // 규칙 4·5: 둘레에 내 윗면 색이 없으면 바꿈
  const around=nb9(s,i);
  if(!around.includes(p.cube.t)){ const opts=[...new Set(around)].filter(x=>x!==0); const col=opts.length?U.pick(opts):p.cube.t; p.cube=cubeWithTop(p.cube,col); ev.push({t:'recolor',i,col,rule:4}); }
  // 규칙 6·7: 같은 색 3개 이상 → 그 색 다른 말 하나를 뒤로
  const cnt=nb9(s,i).filter(x=>x===p.cube.t).length + 0;
  if(cnt>=3){ const yellow=p.cube.t===5; const targets=ALL.filter(j=>j!==i&&s.pcs[j].r<H&&(yellow||s.pcs[j].cube.t===p.cube.t)).sort((a,b)=>dist(s.pcs[a])-dist(s.pcs[b]));
    for(const j of targets){ const tp=s.pcs[j]; if(tp.r+1<H && occ(s,tp.r+1,tp.c)==null){ tp.r+=1; ev.push({t:'bump',i,j,rule:yellow?7:6}); break; } } }
  // 규칙 8: 일직선 3칸 같은 색 → 한 번 더
  if(!s.extra && line3(s,i)){ ev.push({t:'extra',i,rule:8}); }
  return ev;
}
function exiled(s,i){ const p=s.pcs[i]; return p.r<H && (p.cube.t===0 || cellCol(s,p.r,p.c)===0); }
function exile(s,i){ const p=s.pcs[i]; p.tok++; let col=p.home; const free=[0,1,2,3,4,5,6].filter(c=>occ(s,H,c,i)==null).sort((a,b)=>Math.abs(a-p.home)-Math.abs(b-p.home)); if(free.length) col=free[0]; p.r=H; p.c=col;
  if(p.cube.t===0) p.cube=cubeWithTop(p.cube,p.cube.b===0?p.cube.n:p.cube.b);
  const ev=[{t:'exile',i,rule:1}]; if(p.tok===3 && s.penCount<2){ s.penCount++; s.pen[i]+=3; ev.push({t:'pen',i,rule:2}); } return ev; }
function line3(s,i){ const p=s.pcs[i], col=p.cube.t;
  const colAt=(r,c)=> r===p.r&&c===p.c ? col : (r>=0&&r<H&&c>=0&&c<W ? cellCol(s,r,c) : -1);
  for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]) for(let k=-2;k<=0;k++){ let ok=true; for(let m=0;m<3;m++){ if(colAt(p.r+dr*(k+m),p.c+dc*(k+m))!==col){ ok=false; break; } } if(ok) return true; }
  return false; }

/* ── 진행 ── */
function startTurn(s){
  const i=s.ord[s.cur]; s.actor=i; s.phase='turn';
  s.notice=`🎲 ${s.round}라운드 · ${nm(i)} 차례${s.extra?' (한 번 더!)':''}`;
  if(isH(i)) s.turn=pOf(i); else { s.turn=null; s.think=900+Math.random()*1100*(.6+P(s,i).logic*.7); }
}
function playMove(s,i,d){
  const ev=doMove(s,i,d);
  s.phase='run'; s.turn=null;
  for(const e of ev) s.q.push({k:'ev',e});
  const goal=ev.find(e=>e.t==='goal'); if(goal){ s.q.push({k:'end',i}); return; }
  const extra=ev.find(e=>e.t==='extra');
  if(extra){ s.extra=true; s.q.push({k:'again'}); } else { s.extra=false; s.q.push({k:'next'}); }
}
function evText(s,e){
  const rv=r=> r && s.revealed>=r ? ` <small>(규칙 ${r})</small>` : r ? ' ❓' : '';
  if(e.t==='move') return `${nm(e.i)} ${DN[e.d]} 굴림 → 윗면 ${COL[s.pcs[e.i].cube.t]}`;
  if(e.t==='push') return `💥 ${nm(e.i)}이(가) ${nm(e.q)}을(를) 밀었어요`;
  if(e.t==='goal') return `🏁 ${nm(e.i)} 골인!!`;
  if(e.t==='exile') return `🚫 ${nm(e.i)} 추방!${rv(1)} (징표 ${s.pcs[e.i].tok}개)`;
  if(e.t==='pen') return `💀 ${nm(e.i)} 추방 징표 3개 — 벌점 −3${rv(2)}`;
  if(e.t==='recolor') return `🎨 ${nm(e.i)} 윗면이 ${COL[e.col]}색으로 바뀌었어요${rv(4)}`;
  if(e.t==='bump') return `↩️ ${nm(e.i)} 때문에 ${nm(e.j)}이(가) 한 칸 뒤로${rv(e.rule)}`;
  if(e.t==='extra') return `⚡ ${nm(e.i)} 한 번 더!${rv(8)}`;
  return '';
}
function endRound(s){
  if(s.revealed<RULES.length){ s.revealed++; s.q.push({k:'note',text:`🎙️ 규칙 ${s.revealed} 공개: ${RULES[s.revealed-1]}`}); s.q.push({k:'react',kind:'reveal'}); }
  s.round++; s.cur=0;
  if(s.round>MAXR){ s.q.push({k:'end',i:null}); return; }
  s.q.push({k:'start'});
}
function endGame(s,goalBy){
  s.phase='over'; s.turn=null;
  const score=i=> (i===goalBy?1000:0) - dist(s.pcs[i])*10 - s.pen[i]*10 - s.pcs[i].tok;
  s.rank=ALL.slice().sort((a,b)=>score(b)-score(a));
  s.winner = isH(s.rank[0]) ? pOf(s.rank[0]) : 'none'; s.winners=isH(s.rank[0])?[pOf(s.rank[0])]:[];
  s.notice = goalBy!=null ? `🏁 ${nm(goalBy)} 골인! 게임 끝` : `🎙️ ${MAXR}라운드 끝 — 골인에 가장 가까운 ${nm(s.rank[0])} 1등`;
  s.log.push(s.notice);
  s.log.push('🎭 모든 규칙 공개: '+RULES.map((r,k)=>`${k+1}) ${r}`).join(' '));
}

/* ── NPC: 공개된 규칙만 앎 (논리파는 본 사건으로 미리 짐작) ── */
function knows(s,i,rule){ if(s.revealed>=rule) return true; const p=P(s,i); return s.events.some(e=>e.rule===rule) && p.logic>=.7; }
function npcMove(s,i){
  const p=P(s,i), opts=Object.keys(DIRS).filter(d=>canMove(s,i,d)); if(!opts.length) return null;
  let best=null;
  for(const d of opts){
    const snap=JSON.stringify(s.pcs), pc=s.penCount, pen=s.pen.slice(); const ev=doMove(s,i,d,true); const after=s.pcs[i];
    let v=-dist(after)*3;
    if(ev.some(e=>e.t==='goal')) v+=1000;
    if(ev.some(e=>e.t==='exile'&&e.i===i) && knows(s,i,1)) v-=20;
    if(ev.some(e=>e.t==='extra') && knows(s,i,8)) v+=4;
    if(ev.some(e=>e.t==='bump'&&e.i===i) && knows(s,i,6)) v+=2;
    if(ev.some(e=>e.t==='push')) v+= p.aggr*1.5;   // 공격형은 남을 밀어내는 걸 좋아함
    v += Math.random()*(2.2-p.logic*1.6);
    s.pcs=JSON.parse(snap); s.penCount=pc; s.pen=pen;   // 되돌림
    if(!best||v>best.v) best={v,d};
  }
  return best.d;
}

/* ── 말 ── */
const LINES={
  sly:{exile:['어머 추방? 이런 규칙이 있었어? 😏'], reveal:['후후, 이제 알겠네~'], goal:['먼저 갑니다~ 😎'], push:['미안~ 길 좀 비켜 줘요 😏']},
  calm:{exile:['…추방이군요.'], reveal:['…그랬군요.'], goal:['골인.'], push:['…실례.']},
  logic:{exile:['흰색이 문제였네요. 기억해 둘게요.','패턴이 보여요. 흰색은 피해야 해요.'], reveal:['예상한 규칙이네요.','이제 판단 기준이 하나 늘었어요.'], goal:['계산대로예요.'], push:['밀어내는 게 최단 경로예요.']},
  emo:{exile:['으악 왜 추방이야!! 😭','뭐야 이게?!'], reveal:['아 그래서 그랬구나!! 😲'], goal:['골인이다아!! 🥳'], push:['비켜비켜~ 😆']},
};
function lineOf(s,seat,kind){ const p=P(s,seat), st=STYLE[p.id]||'calm', L=(LINES[st]||{})[kind]; if(!L) return null;
  const used=(s.used[seat]=s.used[seat]||[]), pool=L.filter(x=>!used.includes(x)); if(!pool.length) return null; const raw=U.pick(pool); used.push(raw); return raw; }

/* ── 시간 흐름 ── */
function stepDelay(s){ syncH(s);
  if(s.winner!=null) return null;
  if(s.phase==='intro') return 2000;
  if(s.q.length){ const k=s.q[0].k; return k==='ev'?(s.q[0].e.t==='move'?700:1300) : k==='note'?2400 : k==='react'?1200 : 600; }
  if(s.phase==='turn') return isH(s.actor)?null:s.think;
  return null;
}
function step(s){ syncH(s);
  if(s.phase==='intro'){ startTurn(s); return; }
  if(s.q.length){ const e=s.q.shift();
    if(e.k==='ev'){ const t=evText(s,e.e); if(t){ s.notice=t; s.log.push(t); } if(e.e.rule) s.events.push({rule:e.e.rule,r:s.round}); s.last=e.e;
      if((e.e.t==='exile'||e.e.t==='push')&&!isH(e.e.i)&&Math.random()<.5){ const text=lineOf(s,e.e.i,e.e.t==='exile'?'exile':'push'); if(text){ s.say={seat:e.e.i,text,n:(s.say?s.say.n:0)+1}; s.log.push(`${nm(e.e.i)}: ${text}`); } } }
    else if(e.k==='note'){ s.notice=e.text; s.log.push(e.text); }
    else if(e.k==='react'){ const c=ALL.filter(j=>!isH(j)); const seat=U.pick(c); const text=lineOf(s,seat,e.kind); if(text){ s.say={seat,text,n:(s.say?s.say.n:0)+1}; s.log.push(`${nm(seat)}: ${text}`); } }
    else if(e.k==='end'){ if(e.i!=null&&!isH(e.i)){ const text=lineOf(s,e.i,'goal'); if(text){ s.say={seat:e.i,text,n:(s.say?s.say.n:0)+1}; } } endGame(s,e.i); }
    else if(e.k==='again'){ startTurn(s); }
    else if(e.k==='next'){ s.cur++; if(s.cur>=N){ endRound(s); } else startTurn(s); }
    else if(e.k==='start'){ startTurn(s); }
    s.ev++; return; }
  if(s.phase==='turn'&&!isH(s.actor)){ const d=npcMove(s,s.actor); if(d) playMove(s,s.actor,d); else { s.log.push(`${nm(s.actor)} 움직일 수 없어 쉬어요`); s.phase='run'; s.extra=false; s.q.push({k:'next'}); } s.ev++; return; }
}
function apply(s,p,a){ syncH(s);
  if(s.winner!=null) return '게임이 끝났어요';
  const seat=HSEAT[p];
  if(!a||s.phase!=='turn'||s.actor!==seat) return '내 차례가 아니에요';
  if(a.k==='pass'){ if(Object.keys(DIRS).some(d=>canMove(s,seat,d))) return '움직일 수 있는 방향이 있어요'; s.phase='run'; s.turn=null; s.extra=false; s.q.push({k:'next'}); return null; }
  if(a.k!=='move'||!DIRS[a.d]) return '방향을 고르세요';
  if(!canMove(s,seat,a.d)) return '그쪽으로는 못 가요';
  playMove(s,seat,a.d); s.ev++; return null;
}
function mask(s){ syncH(s); const v=U.clone(s); v.q=[]; v.used={}; v.think=null; return v; }
function ai(v){ syncH(v); const seat=HSEAT[1]; if(v.phase!=='turn'||v.actor!==seat) return null;
  const opts=Object.keys(DIRS).filter(d=>canMove(v,seat,d)); if(!opts.length) return {k:'pass'};
  const sc=d=>{ const p=v.pcs[seat], [dr,dc]=DIRS[d]; const np={...p,r:p.r+dr,c:p.c+dc}; const top=rollCube(p.cube,d).t; return -dist(np)*3 - ((v.revealed>=1&&(top===0||cellCol(v,np.r,np.c)===0))?20:0) + Math.random(); };
  return {k:'move',d:opts.sort((a,b)=>sc(b)-sc(a))[0]}; }

/* ── 화면 ── */
let WHO={};
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}/g,(_,d)=>`${seatEmoji(+d)} ${seatName(+d,ctx)}`); }
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{};
  const me=HSEAT[ctx.me], myTurn=v.phase==='turn'&&v.actor===me&&v.turn===ctx.me, mp=v.pcs[me];
  let h=`<div class="info">${v.round} / ${MAXR}라운드 · 공개된 규칙 ${v.revealed}/8 · 내 말 윗면 <b style="color:${HEX[mp.cube.t]};text-shadow:0 0 1px #000">■ ${COL[mp.cube.t]}</b> · 추방 징표 ${mp.tok}${v.pen[me]?` · 벌점 −${v.pen[me]}`:''}</div>`;
  h+=`<div class="hl-notice">${fill(v.notice||'',ctx)}</div>`;
  h+=`<div class="vr-speech">${v.say?`<span class="w">${seatEmoji(v.say.seat)} ${seatName(v.say.seat,ctx)}</span> ${fill(U.esc(v.say.text),ctx)}`:'<i>　</i>'}</div>`;
  let g=`<div class="un-board">`;
  for(let r=0;r<=H;r++) for(let c=0;c<W;c++){ const col=r<H?v.board[r][c]:null, goal=r===GOAL[0]&&c===GOAL[1], q=ALL.find(i=>v.pcs[i].r===r&&v.pcs[i].c===c);
    g+=`<div class="un-c ${r===H?'start':''} ${goal?'goal':''}" style="${col!=null?`background:${HEX[col]}`:''}">${goal&&q==null?'🏁':''}${q!=null?`<span class="un-p ${v.actor===q?'act':''}" style="background:${HEX[v.pcs[q].cube.t]}" title="${seatName(q,ctx)}">${seatEmoji(q)}</span>`:''}</div>`; }
  g+=`</div>`; h+=g;
  if(myTurn){ h+=`<div class="fh-act">${Object.keys(DIRS).map(d=>{ const ok=canMove(v,me,d); const nt=ok?rollCube(mp.cube,d).t:null; return `<button data-d="${d}" ${ok?'':'disabled'}>${DN[d]} ${ok?`<small style="color:${HEX[nt]};text-shadow:0 0 1px #000">■${COL[nt]}</small>`:''}</button>`; }).join('')}${Object.keys(DIRS).some(d=>canMove(v,me,d))?'':'<button class="ghost" data-a="pass">쉬기</button>'}</div><div class="info">버튼 옆 색 = 그쪽으로 굴렸을 때 윗면 색</div>`; }
  if(v.phase==='over'&&v.rank) h+=`<div class="hl-rank">${v.rank.map((i,k)=>`<span class="${isH(i)?'h':''}">${k+1}등 ${seatEmoji(i)} ${seatName(i,ctx)}${v.pcs[i].tok?` 🚫${v.pcs[i].tok}`:''}</span>`).join('')}</div>`;
  const L=`<div class="side-box"><div class="side-h">📜 공개된 규칙 <small>라운드마다 하나씩</small></div>${RULES.map((r,k)=>`<div class="rr-h ${k<v.revealed||v.phase==='over'?'':'un-hid'}">${k+1}) ${k<v.revealed||v.phase==='over'?r:'❓ 아직 비밀 — 일어난 일로 짐작해 보세요'}</div>`).join('')}
    <div class="side-h" style="margin-top:6px">🧠 사람들</div>${ALL.map(i=>`<div class="side-row ${i===me?'me':''}" style="flex-wrap:wrap">${seatEmoji(i)} ${seatName(i,ctx)} ${isH(i)?'':`<small>${NPCI(i)[2]}</small>`}<span><b style="color:${HEX[v.pcs[i].cube.t]};text-shadow:0 0 1px #000">■</b> 거리 ${dist(v.pcs[i])}${v.pcs[i].tok?` 🚫${v.pcs[i].tok}`:''}</span></div>`).join('')}</div>`;
  const R=`<div class="side-box side-log"><div class="side-h">📜 진행 기록 <small>최근이 위 · ❓는 아직 비밀 규칙</small></div>${v.log.slice(-60).reverse().map(x=>`<div>${fill(x,ctx)}</div>`).join('')}</div>`;
  el.innerHTML=`<div class="side3"><div class="side-mid">${h}</div><aside class="side-l">${L}</aside><aside class="side-r">${R}</aside></div>`;
  el.onclick=e=>{ const b=e.target.closest('[data-d]'); if(b&&!b.disabled) return ctx.act({k:'move',d:b.dataset.d}); const a=e.target.closest('[data-a="pass"]'); if(a) return ctx.act({k:'pass'}); };
}
function status(v,ctx){ syncH(v); const me=HSEAT[ctx.me]; if(v.phase==='over') return ''; if(v.phase==='turn'&&v.actor===me) return '내 차례: 굴릴 방향을 고르세요'; return '다른 사람 차례…'; }
const guide=`
<p><b>6인 숨은 규칙 레이스</b>(우리 둘 + 성격 다른 컴퓨터 플레이어 4명). 여섯 색 <b>정육면체 말</b>을 굴려 맨 위 🏁에 먼저 닿으면 1등!</p>
<ul><li>차례마다 상하좌우 한 칸 굴려요. 굴리면 <b>윗면 색이 바뀌어요</b>(진짜 주사위처럼). 가려는 칸에 말이 있으면 그 말을 한 칸 밀어내요.</li>
<li>❓ <b>숨은 규칙 8개</b>가 처음부터 적용돼요. 하지만 내용은 <b>라운드가 끝날 때마다 하나씩만</b> 공개! 그전엔 "무슨 일이 일어났는지"만 보고 짐작해야 해요.</li>
<li>출발줄로는 스스로 돌아갈 수 없어요. ${MAXR}라운드까지 아무도 골인 못 하면 🏁까지 가까운 순서.</li></ul>
<div class="tipbox">💡 <b>팁</b><br>· 누가 갑자기 추방되거나, 윗면 색이 바뀌거나, 한 번 더 움직이면 규칙이 숨어 있다는 뜻!<br>· 컴퓨터도 공개된 규칙만 알아요. 🧠 전략가·🔍 관찰자는 사건을 보고 미리 눈치채기도 해요.</div>`;
window.GAMES.unknown = { _sync:x=>syncH(x), maxH:6,
  title:'언노운', ref:'데블스 플랜 「언노운」', emoji:'❓', tags:['숨은 규칙','레이스','NPC','두뇌서바이벌'],
  tagline:'우리 둘 + 컴퓨터 4명. 정육면체 말을 굴려 골인하라 — 규칙은 하나씩만 알려 준다.',
  guide, init, apply, mask, ai, render, status, step, stepDelay, noPersona:true, wide:true,
  aiDelay:()=>1200+Math.random()*1200,
  bar:(v,i)=>{ const p=v.pcs[HSEAT[i]]; return `<span class="tag" style="color:${HEX[p.cube.t]};text-shadow:0 0 1px #000">■</span><span class="tag">거리 ${dist(p)}</span>`; },
  result:(v,ctx)=>{ const k=(v.rank||[]).indexOf(HSEAT[ctx.me]); return k>=0?`${k+1}등`:''; },
};
})();
