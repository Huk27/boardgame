(function(){
'use strict';
/* 정글 메이즈 (피의 게임 시즌 2 · 데스매치, 모티브: 라비린스 미로 밀기).
   7×7 미로판: 짝수 행·열 교차 16칸은 고정 타일, 나머지 33칸 + 남는 타일 1장은 움직이는 타일(일자·ㄱ자·T자).
   차례마다 ① 남는 타일을 돌려서 2·4·6번째 줄 끝 화살표(12곳)로 밀어 넣고(바로 전에 밀려 나온 자리로 되밀기 금지)
   ② 길이 이어진 곳이면 어디든 말을 옮긴다(안 움직여도 됨). 밀려 나간 칸 위의 말은 반대쪽 끝(새 타일)으로.
   목표물 4개는 둘이 같고 찾는 순서만 다름. 4개를 다 찾고 내 출발 구석으로 돌아오면 승리. 150수가 지나면 더 많이 찾은 쪽(같으면 남은 거리) 승. */
const S=7, SYM=['🍌','🐍','🗝️','💎'], CAP=150;
const N_=1,E_=2,S_=4,W_=8, OPP={1:4,2:8,4:1,8:2}, DIR=[[N_,-1,0],[E_,0,1],[S_,1,0],[W_,0,-1]];
const rot=o=>((o<<1)|(o>>3))&15;
const SHAPE={I:5, L:3, T:7};   // I: N+S, L: N+E, T: N+E+S
function rotN(o,k){ for(let i=0;i<k;i++) o=rot(o); return o; }
const START=[[0,0],[S-1,S-1]];
/* 밀기 자리: 0~2 위(아래로), 3~5 오른쪽(왼쪽으로), 6~8 아래(위로), 9~11 왼쪽(오른쪽으로) */
const LINES=[1,3,5];
const PUSH=[...LINES.map(c=>({side:'T',i:c})), ...LINES.map(r=>({side:'R',i:r})), ...LINES.map(c=>({side:'B',i:c})), ...LINES.map(r=>({side:'L',i:r}))];
const opposite=k=>({T:'B',B:'T',L:'R',R:'L'})[PUSH[k].side]===undefined?null:PUSH.findIndex(p=>p.side===({T:'B',B:'T',L:'R',R:'L'})[PUSH[k].side]&&p.i===PUSH[k].i);

function fixedTile(r,c){
  // 구석은 안쪽을 향한 ㄱ자, 가장자리는 안쪽으로 열린 T자, 안쪽 4칸은 T자
  if(r===0&&c===0) return rotN(SHAPE.L,1); if(r===0&&c===S-1) return rotN(SHAPE.L,2); if(r===S-1&&c===S-1) return rotN(SHAPE.L,3); if(r===S-1&&c===0) return SHAPE.L;
  if(r===0) return rotN(SHAPE.T,1); if(c===S-1) return rotN(SHAPE.T,2); if(r===S-1) return rotN(SHAPE.T,3); if(c===0) return SHAPE.T;
  return rotN(SHAPE.T,(r*3+c)%4);
}
function init(starter){
  const pool=[]; for(let i=0;i<12;i++) pool.push('I'); for(let i=0;i<14;i++) pool.push('L'); for(let i=0;i<8;i++) pool.push('T');   // 34장(판 33 + 남는 1)
  U.shuffle(pool);
  const b=[]; for(let r=0;r<S;r++){ b.push([]); for(let c=0;c<S;c++){ if(r%2===0&&c%2===0) b[r].push({o:fixedTile(r,c), fx:true, sym:null}); else b[r].push({o:rotN(SHAPE[pool.pop()],Math.random()*4|0), fx:false, sym:null}); } }
  const spare={o:SHAPE[pool.pop()], fx:false, sym:null};
  // 목표물은 움직이는 타일에 (출발 구석 근처 제외)
  const cells=[]; for(let r=0;r<S;r++) for(let c=0;c<S;c++) if(!b[r][c].fx && !(r+c<=2) && !(r+c>=2*S-4)) cells.push([r,c]);
  U.shuffle(cells).slice(0,4).forEach(([r,c],k)=>b[r][c].sym=k);
  const ord=[U.shuffle([0,1,2,3]), U.shuffle([0,1,2,3])];
  return {b, spare, pos:START.map(x=>x.slice()), ord, got:[0,0], turn:starter, phase:'push', last:null, lastPush:null, moves:0, starter, winner:null, log:[], hist:[]};
}
function target(s,p){ return s.got[p]<4 ? s.ord[p][s.got[p]] : 'home'; }
function findSym(b,k){ for(let r=0;r<S;r++) for(let c=0;c<S;c++) if(b[r][c].sym===k) return [r,c]; return null; }
function goalCell(s,p){ const t=target(s,p); return t==='home' ? START[p] : findSym(s.b,t); }
/* 밀기 (새 상태 반환) */
function doPush(b,spare,pos,k){
  const P=PUSH[k], B=b.map(r=>r.slice()), np=pos.map(x=>x.slice()); let out;
  if(P.side==='T'){ const c=P.i; out=B[S-1][c]; for(let r=S-1;r>0;r--) B[r][c]=B[r-1][c]; B[0][c]=spare; for(const q of np) if(q[1]===c) q[0]=(q[0]+1)%S; }
  if(P.side==='B'){ const c=P.i; out=B[0][c]; for(let r=0;r<S-1;r++) B[r][c]=B[r+1][c]; B[S-1][c]=spare; for(const q of np) if(q[1]===c) q[0]=(q[0]+S-1)%S; }
  if(P.side==='L'){ const r=P.i; out=B[r][S-1]; for(let c=S-1;c>0;c--) B[r][c]=B[r][c-1]; B[r][0]=spare; for(const q of np) if(q[0]===r) q[1]=(q[1]+1)%S; }
  if(P.side==='R'){ const r=P.i; out=B[r][0]; for(let c=0;c<S-1;c++) B[r][c]=B[r][c+1]; B[r][S-1]=spare; for(const q of np) if(q[0]===r) q[1]=(q[1]+S-1)%S; }
  return {b:B, spare:out, pos:np};
}
function reach(b,from){ const seen=new Set([from[0]*S+from[1]]), q=[from], out=[from];
  while(q.length){ const [r,c]=q.shift(), o=b[r][c].o;
    for(const [d,dr,dc] of DIR){ if(!(o&d)) continue; const rr=r+dr, cc=c+dc; if(rr<0||rr>=S||cc<0||cc>=S) continue; if(!(b[rr][cc].o&OPP[d])) continue; const id=rr*S+cc; if(seen.has(id)) continue; seen.add(id); q.push([rr,cc]); out.push([rr,cc]); } }
  return out; }
const forbidden=s=> s.lastPush==null ? -1 : opposite(s.lastPush);
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(s.turn!==p) return '상대 차례예요';
  if(!a) return '알 수 없는 동작';
  if(s.phase==='push'){ if(a.k!=='push') return '먼저 타일을 밀어 넣으세요';
    const k=a.at|0; if(!(k>=0&&k<12)) return '밀어 넣을 자리를 고르세요'; if(k===forbidden(s)) return '방금 밀려 나온 자리로 되밀 수 없어요';
    const sp={...s.spare, o:rotN(s.spare.o,((a.rot|0)%4+4)%4)}; const r=doPush(s.b,sp,s.pos,k); s.b=r.b; s.spare=r.spare; s.pos=r.pos; s.lastPush=k; s.phase='move'; s.last={push:k};
    s.log.push(`${p?'B':'A'} 밀기 ${pushName(k)}`); return null; }
  if(s.phase==='move'){ if(a.k!=='move') return '말을 옮기세요 (제자리도 가능)';
    const to=[a.r|0,a.c|0]; if(!reach(s.b,s.pos[p]).some(x=>x[0]===to[0]&&x[1]===to[1])) return '길이 이어진 곳으로만 갈 수 있어요';
    const from=s.pos[p].slice(); s.pos[p]=to; s.last.move={p,from,to};
    const t=target(s,p); let got=false;
    if(t!=='home'&&s.b[to[0]][to[1]].sym===t){ s.got[p]++; got=true; s.log.push(`${p?'B':'A'} ${SYM[t]} 찾음! (${s.got[p]}/4)`); }
    else if(t==='home'&&to[0]===START[p][0]&&to[1]===START[p][1]){ s.winner=p; s.phase='over'; s.turn=null; s.log.push(`🏁 ${p?'B':'A'} 출발점 귀환 — 승리!`); return null; }
    if(!got) s.log.push(`${p?'B':'A'} ${from[0]===to[0]&&from[1]===to[1]?'제자리':'이동'}`);
    s.moves++; s.hist.push(s.got.slice());
    if(s.moves>=CAP){ const d=q=>{ const g=goalCell(s,q); return g?Math.abs(g[0]-s.pos[q][0])+Math.abs(g[1]-s.pos[q][1]):0; };
      s.winner = s.got[0]!==s.got[1] ? (s.got[0]>s.got[1]?0:1) : d(0)!==d(1) ? (d(0)<d(1)?0:1) : 'draw'; s.phase='over'; s.turn=null; return null; }
    s.turn=1-p; s.phase='push'; return null; }
  return '알 수 없는 동작';
}
const pushName=k=>{ const P=PUSH[k]; return {T:`위 ${P.i+1}열 ↓`,B:`아래 ${P.i+1}열 ↑`,L:`왼쪽 ${P.i+1}행 →`,R:`오른쪽 ${P.i+1}행 ←`}[P.side]; };
function mask(s){ return U.clone(s); }

/* 컴퓨터: 밀기 12×회전 4 → 내 말이 닿는 곳 중 목표에 가장 가까운 곳. 어려움은 상대의 다음 수도 막아 봄 */
const dist=(a,b)=>b?Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]):0;
function goalIn(b,s,p,gotP){ const t=gotP<4?s.ord[p][gotP]:'home'; if(t==='home') return START[p]; for(let r=0;r<S;r++) for(let c=0;c<S;c++) if(b[r][c].sym===t) return [r,c]; return null; }
function bestMoveAfter(b,pos,p,s,gotP){ const g=goalIn(b,s,p,gotP), R=reach(b,pos[p]); let best=null, bv=1e9;
  for(const x of R){ let v=dist(x,g)*10; if(g&&x[0]===g[0]&&x[1]===g[1]) v=-100; if(b[x[0]][x[1]].fx) v-=2; if(v<bv){ bv=v; best=x; } } return {to:best, v:bv}; }
function options(s,p){ const out=[], fb=forbidden(s); const seenRot=new Set();
  for(let k=0;k<12;k++){ if(k===fb) continue; const seen=new Set(); for(let r=0;r<4;r++){ const o=rotN(s.spare.o,r); if(seen.has(o)) continue; seen.add(o);
    const sp={...s.spare,o}, res=doPush(s.b,sp,s.pos,k); out.push({k,r,res}); } }
  return out; }
let plan=null;
function ai(v,lvl=1){
  const me=v.turn; if(me==null) return null;
  if(v.phase==='move'&&plan&&plan.key===v.moves+':'+v.lastPush){ const to=plan.to; plan=null; return {k:'move',r:to[0],c:to[1]}; }
  if(v.phase==='move'){ const m=bestMoveAfter(v.b,v.pos,me,v,v.got[me]); return {k:'move',r:m.to[0],c:m.to[1]}; }
  const o=1-me; let best=null, bv=1e9; const guard=lvl===2&&Math.random()<.55;   // 막기는 가끔만 (서로 막기만 하면 판이 안 끝남)
  for(const op of options(v,me)){ const m=bestMoveAfter(op.res.b,op.res.pos,me,v,v.got[me]); let val=m.v + (lvl===0?Math.random()*60:Math.random()*3);
    if(guard){ // 상대가 다음 차례에 얼마나 다가갈 수 있는지(대충): 내가 목표를 막 먹었으면 상대도 계산
      const pos2=op.res.pos.slice(); pos2[me]=m.to; const st={...v, b:op.res.b, spare:op.res.spare, pos:pos2, lastPush:op.k};
      let oppBest=1e9; for(const o2 of options(st,o)){ const mo=bestMoveAfter(o2.res.b,o2.res.pos,o,v,v.got[o]); if(mo.v<oppBest) oppBest=mo.v; if(oppBest<=-100) break; }
      val += oppBest<=-100 ? 15 : 0; }
    if(val<bv){ bv=val; best={op, to:m.to}; } }
  plan={key:(v.moves)+':'+best.op.k, to:best.to};
  return {k:'push', at:best.op.k, rot:best.op.r};
}
function aiDelay(v){ return v.phase==='push' ? 1600+Math.random()*1800 : 900+Math.random()*900; }

/* 화면 */
let rotSel=0, sig='';
function tileHTML(t,extra=''){ const o=t.o; return `<div class="jm-t ${t.fx?'fx':''} ${extra}"><i class="c"></i>${o&N_?'<i class="n"></i>':''}${o&E_?'<i class="e"></i>':''}${o&S_?'<i class="s"></i>':''}${o&W_?'<i class="w"></i>':''}${t.sym!=null?`<b class="sy">${SYM[t.sym]}</b>`:''}</div>`; }
function render(el,v,ctx){
  const me=ctx.mode==='local'?(v.turn==null?0:v.turn):ctx.me, o=1-me, my=ctx.myTurn;
  const sg=v.moves+':'+v.phase; if(sg!==sig){ sig=sg; rotSel=0; }
  const nm=p=>ctx.mode==='local'?(p?'🔵 파랑':'🔴 빨강'):p===ctx.me?'나':(ctx.mode==='solo'?'상대':U.esc(ctx.name(p)));
  const tg=p=>{ const t=target(v,p); return t==='home'?'🏠 출발점':SYM[t]; };
  const R = my&&v.phase==='move' ? reach(v.b,v.pos[me]) : [];
  const RS=new Set(R.map(x=>x[0]*S+x[1]));
  const fb=forbidden(v);
  const lp=v.last&&v.last.push!=null?PUSH[v.last.push]:null;
  let h=`<div class="jm-top">${[me,o].map(p=>`<div class="jm-pl ${v.turn===p?'act':''} ${p===me?'me':''}"><b>${U.ava(p)} ${nm(p)}</b> · 찾은 것 ${v.got[p]}/4 · 다음 <span class="jm-tg">${tg(p)}</span><div class="jm-ord">${v.ord[p].map((k,i)=>`<span class="${i<v.got[p]?'done':i===v.got[p]?'now':''}">${SYM[k]}</span>`).join('')}<span class="${v.got[p]>=4?'now':''}">🏠</span></div></div>`).join('')}</div>`;
  const arrow=k=>{ const P=PUSH[k]; const ch={T:'⬇',B:'⬆',L:'➡',R:'⬅'}[P.side]; return `<button class="jm-ar" data-push="${k}" ${my&&v.phase==='push'&&k!==fb?'':'disabled'} title="${pushName(k)}">${k===fb?'✖':ch}</button>`; };
  let g='<div class="jm-grid">';
  for(let r=-1;r<=S;r++) for(let c=-1;c<=S;c++){
    if((r===-1||r===S)&&(c===-1||c===S)){ g+='<span></span>'; continue; }
    if(r===-1){ g+= LINES.includes(c)?arrow(PUSH.findIndex(p=>p.side==='T'&&p.i===c)):'<span></span>'; continue; }
    if(r===S){ g+= LINES.includes(c)?arrow(PUSH.findIndex(p=>p.side==='B'&&p.i===c)):'<span></span>'; continue; }
    if(c===-1){ g+= LINES.includes(r)?arrow(PUSH.findIndex(p=>p.side==='L'&&p.i===r)):'<span></span>'; continue; }
    if(c===S){ g+= LINES.includes(r)?arrow(PUSH.findIndex(p=>p.side==='R'&&p.i===r)):'<span></span>'; continue; }
    const t=v.b[r][c], pcs=[0,1].filter(p=>v.pos[p][0]===r&&v.pos[p][1]===c), home=START.findIndex(x=>x[0]===r&&x[1]===c);
    const moved = lp && ((lp.side==='T'||lp.side==='B')?c===lp.i:r===lp.i);
    g+=`<div class="jm-cell ${RS.has(r*S+c)?'rc':''} ${moved?'mv':''}" data-r="${r}" data-c="${c}">${tileHTML(t, home>=0?'home'+home:'')}${pcs.map(p=>`<span class="jm-pc p${p}">${U.ava(p)}</span>`).join('')}</div>`;
  }
  g+='</div>';
  h+=g;
  // 남는 타일 + 회전
  if(v.winner==null){
    const prev={...v.spare, o:rotN(v.spare.o,rotSel)};
    h+= my&&v.phase==='push' ? `<div class="jm-spare"><div><small>남는 타일</small>${tileHTML(prev)}</div><div class="fh-act"><button class="ghost" data-rot="-1">↺</button><button class="ghost" data-rot="1">↻ 돌리기</button></div><small>돌린 뒤 판 가장자리 화살표를 눌러 밀어 넣으세요${fb>=0?' (✖는 방금 밀려 나온 자리)':''}</small></div>`
       : my&&v.phase==='move' ? `<div class="jm-spare"><small>초록 칸이 갈 수 있는 곳이에요. 말을 옮길 칸을 누르세요.</small><div class="fh-act"><button class="ghost" data-stay="1">🧍 제자리</button></div></div>`
       : `<div class="jm-spare"><div><small>남는 타일</small>${tileHTML(v.spare)}</div><small>${v.turn!=null?`${nm(v.turn)} 차례…`:''}</small></div>`;
  }
  h+=`<details class="hl-log"><summary>기록 · ${v.moves}/${CAP}수</summary>${v.log.slice(-14).reverse().map(x=>`<div>${U.esc(x).replace(/^A\b/,nm(0)).replace(/^B\b/,nm(1))}</div>`).join('')}</details>`;
  el.innerHTML=h;
  el.onclick=e=>{
    const rb=e.target.closest('[data-rot]'); if(rb){ rotSel=(rotSel+(+rb.dataset.rot)+4)%4; return ctx.rerender(); }
    const pb=e.target.closest('[data-push]'); if(pb&&!pb.disabled) return ctx.act({k:'push',at:+pb.dataset.push,rot:rotSel});
    if(e.target.closest('[data-stay]')) return ctx.act({k:'move',r:v.pos[me][0],c:v.pos[me][1]});
    const cl=e.target.closest('[data-r]'); if(cl&&my&&v.phase==='move') return ctx.act({k:'move',r:+cl.dataset.r,c:+cl.dataset.c});
  };
}
const guide=`
<p><b>미로를 밀어서 길을 만드는 1:1 레이스</b> (모티브: 보드게임 라비린스). 7×7 판, 진하게 칠한 <b>고정 타일 16칸</b>은 안 움직여요.</p>
<ol><li><b>밀기</b>: 남는 타일을 원하는 방향으로 돌린 뒤, 2·4·6번째 줄 끝 화살표로 <b>밀어 넣어요</b>. 반대쪽 끝 타일이 밀려 나와 다음 사람의 남는 타일이 돼요. <b>바로 전에 밀려 나온 자리로 되밀기는 금지</b>(✖).</li>
<li><b>이동</b>: 길이 이어진 곳이면 <b>몇 칸이든</b> 갈 수 있어요(초록 칸). 안 움직여도 돼요. 내 말이 있는 줄이 밀려 판 밖으로 나가면 반대쪽 끝으로 와요.</li>
<li>목표물 <b>${SYM.join(' ')}</b>은 둘이 같고 <b>찾는 순서만 달라요</b>(위에 표시). 다음 목표 칸에 서면 찾은 것! 4개를 다 찾고 <b>내 출발 구석</b>(🔴 왼쪽 위 · 🔵 오른쪽 아래)으로 돌아오면 승리.</li></ol>
<p>${CAP}수가 지나면 더 많이 찾은 쪽(같으면 목표까지 더 가까운 쪽) 승리.</p>
<div class="tipbox">💡 <b>팁</b><br>· 내가 밀어낸 타일은 상대가 쓰게 돼요 — 상대 목표 쪽으로 길이 안 나는 ㄱ자를 넘겨주기!<br>· 고정 타일 위에 서 있으면 상대가 밀어도 내 말이 안 끌려가요.</div>`;
window.GAMES.junglemaze = {
  title:'정글 메이즈', ref:'피의 게임 「정글 메이즈」', emoji:'🌴', tags:['미로','전략','두뇌서바이벌','데스매치'], local:true,
  tagline:'타일을 밀어 넣어 길을 바꾸고, 같은 보물을 다른 순서로 찾는 미로 레이스.',
  guide, init, apply, mask, ai, aiDelay, render,
  reset(){ plan=null; rotSel=0; sig=''; },
  status:(v,ctx)=> v.winner!=null?'' : ctx.myTurn ? (v.phase==='push'?'타일을 밀어 넣으세요':'말을 옮기세요') : ctx.turnText(v),
  bar:(v,i)=>`<span class="score">${v.got[i]}/4 ${(()=>{ const t=v.got[i]<4?v.ord[i][v.got[i]]:'home'; return t==='home'?'🏠':SYM[t]; })()}</span>`,
  pulse:v=>v.got[1]-v.got[0], pulseStep:1,
};
})();
