(function(){
'use strict';
/* 균형의 만칼라 (6인: 우리 둘 + NPC 4명). 시계 방향 고리 14칸: 접시 1~6 · 😇천사 · 접시 7~12 · 😈악마. 접시 색은 빨·파·초 번갈아.
   준비: 각자 말 4개를 한 개씩 번갈아 접시에 놓음(접시당 최대 2).
   차례: 내 말이 있는 접시를 골라 그 접시의 말을 모두(남의 말도) 집어 시계 방향으로 한 칸에 하나씩 놓음.
   어느 말을 마지막에 놓을지는 내가 정함 → 마지막 말의 주인이 그 칸 말 개수만큼 점수: 접시면 그 색, 😇이면 주인의 가장 적은 색, 😈이면 가장 많은 색.
   누가 한 색 15점이 되면 즉시 끝. 최종 점수 = 가장 적은 색 − (가장 많은 색 − 가장 적은 색). 골고루 모아야 이겨요. */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로, 나머지는 NPC */
const N=6, PIECES=4, GOAL=15, MAXT=72; let HSEAT=[0,3]; const SEATORD=[0,3,1,4,2,5];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i);
const ALL=[...Array(N).keys()];
const CELLS=14, ANGEL=6, DEVIL=13;
const plateNo=c=> c<6 ? c+1 : c>6&&c<13 ? c : null;
const plateCol=c=> { const n=plateNo(c); return n==null?null:['R','B','G'][(n-1)%3]; };
const CK={R:'빨강',B:'파랑',G:'초록'}, CH={R:'#e2574c',B:'#4a7bd0',G:'#4caf6a'};
const STYLE={seojin:'logic', doyun:'emo', haram:'calm', yuna:'emo', minho:'sly', taekyung:'emo', jihu:'sly', soyul:'logic'};
const DEF_P={talk:.6,aggr:.5,trust:.5,bluff:.5,logic:.6,temper:.4};
const nm=i=>`{s${i}}`;
const cellName=c=> c===ANGEL?'😇 천사칸':c===DEVIL?'😈 악마칸':`${plateNo(c)}번 ${CK[plateCol(c)]} 접시`;
const fin=p=>{ const v=[p.R,p.B,p.G], mn=Math.min(...v), mx=Math.max(...v); return mn-(mx-mn); };

function init(starter,o){ const k=Math.max(2,Math.min(6,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  const s={cells:[...Array(CELLS)].map(()=>[]), pts:ALL.map(()=>({R:0,B:0,G:0})), placeLeft:Array(N).fill(PIECES), ord:U.shuffle(ALL.slice()), cur:-1, phase:'intro', turns:0,
    who:{}, used:{}, say:null, q:[], log:[], turn:null, starter, winner:null, notice:'🎙️ 균형의 만칼라 — 세 색을 골고루 모으세요!', ev:0, drop:null};
  s.hs=HSEAT.slice(); const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=ids[k]);
  return s;
}
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
const plates=()=>[...Array(CELLS).keys()].filter(c=>c!==ANGEL&&c!==DEVIL);

/* ── 진행 ── */
function nextTurn(s){
  if(s.placeLeft.some(x=>x>0)||s.phase==='intro'){ s.cur=(s.cur+1)%N; const i=s.ord[s.cur];
    if(s.placeLeft.every(x=>x===0)){ s.phase='play'; s.cur=-1; s.log.push('— 말 놓기 끝, 게임 시작 —'); return nextTurn(s); }
    if(!s.placeLeft[i]) return nextTurn(s);
    s.phase='place'; s.actor=i; s.notice=`📍 ${nm(i)} 말을 놓는 중… (남은 말 ${s.placeLeft[i]})`;
    if(isH(i)) s.turn=pOf(i); else { s.turn=null; s.think=700+Math.random()*700; } return; }
  s.turns++; if(s.turns>MAXT) return endGame(s);
  for(let k=0;k<N;k++){ s.cur=(s.cur+1)%N; const i=s.ord[s.cur]; if(myPlates(s,i).length){ s.phase='play'; s.actor=i; s.notice=`💭 ${nm(i)} 어느 접시를 집을지 고민 중…`;
      if(isH(i)) s.turn=pOf(i); else { s.turn=null; s.think=1100+Math.random()*1200*(.6+P(s,i).logic*.6); } return; } }
  endGame(s);
}
const myPlates=(s,i)=>plates().filter(c=>s.cells[c].includes(i));
function sowPlan(s,c,last){   // 집은 말들 → 놓는 순서(마지막이 last의 말)
  const hand=s.cells[c].slice(); const k=hand.indexOf(last); hand.splice(k,1); return hand.concat(last);
}
function simulate(s,i,c,last){   // 결과 미리 계산 (점수 변화)
  const seq=sowPlan(s,c,last), cells=s.cells.map(x=>x.slice()); cells[c]=[];
  let pos=c; for(const o of seq){ pos=(pos+1)%CELLS; cells[pos].push(o); }
  const n=cells[pos].length, pts=s.pts.map(p=>({...p}));
  let col; if(pos===ANGEL){ const p=pts[last]; col=['R','B','G'].sort((a,b)=>p[a]-p[b])[0]; } else if(pos===DEVIL){ const p=pts[last]; col=['R','B','G'].sort((a,b)=>p[b]-p[a])[0]; } else col=plateCol(pos);
  pts[last][col]+=n; return {cells,pts,pos,n,col,seq};
}
function doMove(s,i,c,last){
  s.phase='sow'; s.turn=null; const r=simulate(s,i,c,last);
  s.drop={from:c,seq:r.seq,k:0,pos:c,last,res:r}; s.cells[c]=[];
  s.log.push(`🫳 ${nm(i)}: ${plateNo(c)}번 접시의 말 ${r.seq.length}개를 집어요 (마지막은 ${nm(last)})`); s.notice=`🫳 ${nm(i)}이(가) ${plateNo(c)}번 접시를 집었어요 — 하나씩 놓는 중`;
}
function stepDrop(s){
  const d=s.drop; if(d.k<d.seq.length){ d.pos=(d.pos+1)%CELLS; s.cells[d.pos].push(d.seq[d.k]); d.k++; return; }
  const r=d.res, o=d.last; s.pts[o][r.col]+=r.n;
  const where=r.pos===ANGEL?'😇 천사칸':r.pos===DEVIL?'😈 악마칸':`${plateNo(r.pos)}번 ${CK[r.col]} 접시`;
  s.notice=`✨ 마지막 말 ${nm(o)} → ${where} · ${CK[r.col]} +${r.n}`; s.log.push(s.notice);
  if(r.pos===DEVIL&&o!==s.actor&&!isH(o)) s.q.push({k:'say',seat:o,kind:'devil',t:s.actor});
  else if(r.n>=4&&!isH(o)) s.q.push({k:'say',seat:o,kind:'big'});
  s.drop=null; s.phase='run';
  if(['R','B','G'].some(c=>s.pts[o][c]>=GOAL)){ s.q.push({k:'note',text:`🎙️ ${nm(o)}의 ${CK[r.col]} 점수가 ${GOAL}점! 게임 끝`}); s.q.push({k:'end'}); return; }
  s.q.push({k:'next'});
}
function endGame(s){ s.phase='over'; s.turn=null; s.final=ALL.map(i=>fin(s.pts[i])); s.rank=ALL.slice().sort((a,b)=>s.final[b]-s.final[a]); s.winner=isH(s.rank[0])?pOf(s.rank[0]):'none'; s.winners=isH(s.rank[0])?[pOf(s.rank[0])]:[];
  s.notice=`🎙️ 최종 1등 ${nm(s.rank[0])} (${s.final[s.rank[0]]}점)`; s.log.push(s.notice); }

/* ── NPC ── */
function npcPlace(s,i){ const p=P(s,i), opts=plates().filter(c=>s.cells[c].length<2);
  return opts.sort((a,b)=> (s.cells[a].length-s.cells[b].length)*(p.aggr-.5) + Math.random()-.5 )[0]; }
function npcMove(s,i){ const p=P(s,i); let best=null;
  const lead=ALL.filter(j=>j!==i).sort((a,b)=>fin(s.pts[b])-fin(s.pts[a]))[0];
  for(const c of myPlates(s,i)) for(const last of [...new Set(s.cells[c])]){ const r=simulate(s,i,c,last);
    const myD=fin(r.pts[i])-fin(s.pts[i]), otherD=last!==i ? fin(r.pts[last])-fin(s.pts[last]) : 0;
    let v=myD*1.0 - (last!==i ? otherD*(.3+p.aggr*.5)*(last===lead?1.5:1) : 0);
    if(['R','B','G'].some(cc=>r.pts[i][cc]>=GOAL)) v += fin(r.pts[i])>=Math.max(...ALL.filter(j=>j!==i).map(j=>fin(r.pts[j])))?50:-50;   // 끝낼지 판단
    v+=Math.random()*(2.2-p.logic*1.8);
    if(!best||v>best.v) best={v,c,last}; }
  return best; }

/* ── 말 ── */
const LINES={
  sly:{devil:['어머 {t}, 저를 악마칸으로요? 기억할게요~ 😏'], big:['후후, 한꺼번에 들어왔네요~']},
  calm:{devil:['…{t}, 악마칸이라니.'], big:['좋네요.']},
  logic:{devil:['{t}, 제 가장 많은 색이 더 커졌네요. 균형이 깨졌어요.'], big:['이 접시면 점수가 크죠.']},
  emo:{devil:['{t}!! 왜 저를 악마칸에 보내요 😭'], big:['와 대박 많이 들어왔다!! 😆']},
};
function lineOf(s,seat,kind,t){ const p=P(s,seat), st=STYLE[p.id]||'calm', L=(LINES[st]||{})[kind]; if(!L) return null;
  const used=(s.used[seat]=s.used[seat]||[]), pool=L.filter(x=>!used.includes(x)); if(!pool.length) return null; const raw=U.pick(pool); used.push(raw); return raw.split('{t}').join(t!=null?nm(t):''); }

/* ── 시간 흐름 ── */
function stepDelay(s){ syncH(s);
  if(s.winner!=null) return null;
  if(s.phase==='intro') return 1800;
  if(s.q.length) return s.q[0].k==='note'?1500 : s.q[0].k==='say'?1300 : 500;
  if(s.phase==='place') return isH(s.actor)?null:s.think;
  if(s.phase==='play') return isH(s.actor)?null:s.think;
  if(s.phase==='sow') return s.drop&&s.drop.k<s.drop.seq.length?380:1100;
  return null;
}
function step(s){ syncH(s);
  if(s.phase==='intro'){ nextTurn(s); return; }
  if(s.q.length){ const e=s.q.shift();
    if(e.k==='note'){ s.notice=e.text; s.log.push(e.text); } else if(e.k==='say'){ const t=lineOf(s,e.seat,e.kind,e.t); if(t){ s.say={seat:e.seat,text:t,n:(s.say?s.say.n:0)+1}; s.log.push(`${nm(e.seat)}: ${t}`); } }
    else if(e.k==='next') nextTurn(s); else if(e.k==='end') endGame(s);
    s.ev++; return; }
  if(s.phase==='place'&&!isH(s.actor)){ const c=npcPlace(s,s.actor); s.cells[c].push(s.actor); s.placeLeft[s.actor]--; s.log.push(`📍 ${nm(s.actor)} → ${plateNo(c)}번 접시`); s.phase='placed'; s.q.push({k:'next'}); s.ev++; return; }
  if(s.phase==='play'&&!isH(s.actor)){ const m=npcMove(s,s.actor); if(!m){ s.q.push({k:'next'}); s.phase='run'; return; } doMove(s,s.actor,m.c,m.last); s.ev++; return; }
  if(s.phase==='sow'){ stepDrop(s); s.ev++; return; }
}
function apply(s,p,a){ syncH(s);
  if(s.winner!=null) return '게임이 끝났어요';
  const seat=HSEAT[p]; if(!a) return '알 수 없는 동작';
  if(a.k==='place'){ if(s.phase!=='place'||s.actor!==seat) return '내 차례가 아니에요'; const c=a.c|0; if(!plates().includes(c)||s.cells[c].length>=2) return '그 접시엔 놓을 수 없어요(최대 2개)';
    s.cells[c].push(seat); s.placeLeft[seat]--; s.log.push(`📍 ${nm(seat)} → ${plateNo(c)}번 접시`); s.phase='placed'; s.turn=null; s.q.push({k:'next'}); return null; }
  if(a.k==='move'){ if(s.phase!=='play'||s.actor!==seat) return '내 차례가 아니에요'; const c=a.c|0, last=a.last|0;
    if(!myPlates(s,seat).includes(c)) return '내 말이 있는 접시를 고르세요'; if(!s.cells[c].includes(last)) return '마지막에 놓을 말을 고르세요';
    doMove(s,seat,c,last); return null; }
  return '알 수 없는 동작';
}
function mask(s){ syncH(s); const v=U.clone(s); v.q=[]; v.used={}; v.think=null; return v; }
function ai(v){ syncH(v); const seat=HSEAT[1];
  if(v.phase==='place'&&v.actor===seat){ const o=plates().filter(c=>v.cells[c].length<2); return {k:'place',c:U.pick(o)}; }
  if(v.phase==='play'&&v.actor===seat){ let best=null; for(const c of myPlates(v,seat)) for(const last of [...new Set(v.cells[c])]){ const r=simulate(v,seat,c,last); const d=fin(r.pts[seat])-fin(v.pts[seat])+Math.random(); if(!best||d>best.d) best={d,c,last}; } return best?{k:'move',c:best.c,last:best.last}:null; }
  return null; }

/* ── 화면 ── */
let WHO={}, selC=null, sig='';
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}/g,(_,d)=>`${seatEmoji(+d)} ${seatName(+d,ctx)}`); }
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{};
  const me=HSEAT[ctx.me], myPlace=v.phase==='place'&&v.actor===me&&v.turn===ctx.me, myPlay=v.phase==='play'&&v.actor===me&&v.turn===ctx.me;
  const sg=v.phase+':'+v.turns+':'+v.actor; if(sg!==sig){ sig=sg; selC=null; }
  const mp=v.pts[me];
  let h=`<div class="info">내 점수 <b style="color:${CH.R}">빨 ${mp.R}</b> · <b style="color:${CH.B}">파 ${mp.B}</b> · <b style="color:${CH.G}">초 ${mp.G}</b> → 최종 예상 <b>${fin(mp)}</b> (적은 색 − 차이) · 한 색 ${GOAL}점이면 끝</div>`;
  h+=`<div class="hl-notice">${fill(v.notice||'',ctx)}</div>`;
  h+=`<div class="vr-speech">${v.say?`<span class="w">${seatEmoji(v.say.seat)} ${seatName(v.say.seat,ctx)}</span> ${fill(U.esc(v.say.text),ctx)}`:'<i>　</i>'}</div>`;
  // 고리: 14칸을 원으로
  const R=150, cx=180, cy=170; let ring=`<div class="bm-ring">`;
  for(let c=0;c<CELLS;c++){ const ang=-Math.PI/2 + (c+1)*2*Math.PI/CELLS; const x=cx+R*Math.cos(ang), y=cy+R*Math.sin(ang);
    const col=plateCol(c), can=(myPlace&&col&&v.cells[c].length<2)||(myPlay&&col&&v.cells[c].includes(me)), last=v.drop&&v.drop.pos===c;
    ring+=`<button class="bm-c ${col?'':'sp'} ${can?'can':''} ${selC===c?'sel':''} ${last?'last':''}" data-c="${c}" style="left:${(x/360*100).toFixed(2)}%;top:${(y/340*100).toFixed(2)}%;${col?`border-color:${CH[col]}`:''}" ${can?'':'tabindex="-1"'}>
      <small>${col?`${plateNo(c)}`:c===ANGEL?'😇':'😈'}</small><span>${v.cells[c].map(o=>seatEmoji(o)).join('')}</span></button>`; }
  ring+=`<div class="bm-mid">🔄<small>시계 방향</small></div></div>`; h+=ring;
  if(myPlace) h+=`<div class="vr-card"><b>📍 말 놓기</b><p>테두리가 빛나는 접시를 누르세요 (접시당 최대 2개, 남은 말 ${v.placeLeft[me]})</p></div>`;
  if(myPlay){ if(selC==null) h+=`<div class="vr-card"><b>🫳 접시 고르기</b><p>내 말이 있는 접시를 누르면, 그 접시의 말을 모두 집어 시계 방향으로 놓아요</p></div>`;
    else { const owners=[...new Set(v.cells[selC])]; h+=`<div class="vr-card"><b>${plateNo(selC)}번 접시 · 말 ${v.cells[selC].length}개 — 마지막에 놓을 말은?</b><div class="fh-act">${owners.map(o=>{ const r=simulate(v,me,selC,o); return `<button class="ghost" data-last="${o}">${seatEmoji(o)} ${seatName(o,ctx)} → ${cellName(r.pos)} ${CK[r.col]} +${r.n}<br><small>${o===me?`내 최종 ${fin(v.pts[me])} → ${fin(r.pts[me])}`:`그 사람 최종 ${fin(v.pts[o])} → ${fin(r.pts[o])}`}</small></button>`; }).join('')}</div></div>`; } }
  if(v.phase==='over'&&v.rank) h+=`<div class="sn-score">${v.rank.map((i,k)=>`<div class="${isH(i)?'h':''}"><b>${k+1}등 ${seatEmoji(i)} ${seatName(i,ctx)} ${v.final[i]}점</b> <small>빨 ${v.pts[i].R} · 파 ${v.pts[i].B} · 초 ${v.pts[i].G}</small></div>`).join('')}</div>`;
  const L=`<div class="side-box"><div class="side-h">🧠 점수판 <small>실시간 공개 · 최종 = 적은 색 − (많은 색 − 적은 색)</small></div>${ALL.slice().sort((a,b)=>fin(v.pts[b])-fin(v.pts[a])).map(i=>`<div class="side-row ${i===me?'me':''} ${v.actor===i&&v.phase!=='over'?'act':''}" style="flex-wrap:wrap">${seatEmoji(i)} ${seatName(i,ctx)} ${isH(i)?'':`<small>${NPCI(i)[2]}</small>`}<span>최종 ${fin(v.pts[i])}</span><div class="hl-st"><b style="color:${CH.R}">${v.pts[i].R}</b> · <b style="color:${CH.B}">${v.pts[i].B}</b> · <b style="color:${CH.G}">${v.pts[i].G}</b></div></div>`).join('')}</div>`;
  const RR=`<div class="side-box side-log"><div class="side-h">📜 진행 기록 <small>최근이 위</small></div>${v.log.slice(-60).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=`<div class="side3"><div class="side-mid">${h}</div><aside class="side-l">${L}</aside><aside class="side-r">${RR}</aside></div>`;
  el.onclick=e=>{
    const c=e.target.closest('[data-c]'); if(c&&c.classList.contains('can')){ const ci=+c.dataset.c; if(myPlace) return ctx.act({k:'place',c:ci}); if(myPlay){ selC=ci; return ctx.rerender(); } }
    const l=e.target.closest('[data-last]'); if(l&&selC!=null){ const a={k:'move',c:selC,last:+l.dataset.last}; selC=null; return ctx.act(a); }
  };
}
function status(v,ctx){ syncH(v); const me=HSEAT[ctx.me]; if(v.phase==='over') return ''; if(v.phase==='place'&&v.actor===me) return '말을 놓을 접시를 고르세요'; if(v.phase==='play'&&v.actor===me) return '집을 접시와 마지막 말을 고르세요'; return '다른 사람 차례…'; }
const guide=`
<p><b>6인 만칼라</b>(우리 둘 + 성격 다른 컴퓨터 플레이어 4명). 시계 방향 고리: 접시 12개(🔴빨·🔵파·🟢초 번갈아) + 😇 천사칸 + 😈 악마칸.</p>
<ul><li><b>준비</b>: 각자 말 4개를 번갈아 하나씩 접시에 놓아요(접시당 최대 2개).</li>
<li><b>차례</b>: 내 말이 있는 접시를 골라 <b>그 접시의 말을 모두(남의 말도)</b> 집어 시계 방향으로 한 칸에 하나씩 놓아요. <b>마지막에 놓을 말은 내가 정해요.</b></li>
<li>마지막 말의 <b>주인</b>이 그 칸의 말 개수만큼 점수: 접시면 그 색 / 😇 천사칸이면 주인의 가장 <b>적은</b> 색 / 😈 악마칸이면 가장 <b>많은</b> 색.</li>
<li>누가 한 색 ${GOAL}점이 되면 즉시 끝. <b>최종 점수 = 가장 적은 색 − (가장 많은 색 − 가장 적은 색)</b> — 골고루 모아야 이겨요!</li></ul>
<div class="tipbox">💡 <b>팁</b><br>· 남의 말을 😈 악마칸에 떨어뜨리면 그 사람 균형이 무너져요.<br>· 😇 천사칸은 내 부족한 색을 채워 줘요. 남에게 주는 건 손해!</div>`;
window.GAMES.balmancala = { _sync:x=>syncH(x), maxH:6,
  title:'균형의 만칼라', ref:'데블스 플랜 「균형의 만칼라」', emoji:'⚖️', tags:['만칼라','균형','NPC','두뇌서바이벌'],
  tagline:'우리 둘 + 컴퓨터 4명. 남의 말까지 집어 뿌리고, 마지막 말의 주인이 점수를 얻는다 — 세 색을 골고루!',
  guide, init, apply, mask, ai, render, status, step, stepDelay, noPersona:true, wide:true,
  aiDelay:()=>1100+Math.random()*1100,
  reset(){ selC=null; sig=''; },
  bar:(v,i)=>`<span class="tag">최종 ${fin(v.pts[HSEAT[i]])}</span>`,
  result:(v,ctx)=>{ const k=(v.rank||[]).indexOf(HSEAT[ctx.me]); return k>=0?`${k+1}등 · ${v.final[HSEAT[ctx.me]]}점`:''; },
};
})();
