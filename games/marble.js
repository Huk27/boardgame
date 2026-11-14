(function(){
'use strict';
/* 구슬 밀기: 육각판 61칸, 각자 구슬 14개. 1~3개를 한 줄로 움직이고, 수가 많으면 상대 구슬을 밀어냄.
   상대 구슬 6개를 판 밖으로 먼저 밀어내면 승리. */
const RAD=4, WIN=6, MAXMOVES=300;
const DIRS=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
const K=(q,r)=>q+','+r;
const onB=(q,r)=>Math.abs(q)<=RAD&&Math.abs(r)<=RAD&&Math.abs(q+r)<=RAD;
const CELLS=[]; for(let r=-RAD;r<=RAD;r++) for(let q=-RAD;q<=RAD;q++) if(onB(q,r)) CELLS.push([q,r]);
function init(starter){
  const b={};
  for(const [q,r] of CELLS){
    if(r===4||r===3||(r===2&&q>=-2&&q<=0)) b[K(q,r)]=0;
    if(r===-4||r===-3||(r===-2&&q>=0&&q<=2)) b[K(q,r)]=1;
  }
  return {b, cap:[0,0], turn:starter, starter, winner:null, last:null, moves:0};
}
const at=(b,q,r)=> b[K(q,r)]===undefined ? null : b[K(q,r)];
// 고른 구슬이 한 줄로 붙어 있으면 그 축 방향(0~2)을, 1개면 -1, 아니면 null
function lineAxis(cells){
  if(cells.length===1) return -1;
  const s=cells;
  for(let d=0;d<3;d++){
    const [dq,dr]=DIRS[d];
    for(const st of s){
      let n=0; while(n<s.length && s.some(x=>x[0]===st[0]+dq*n&&x[1]===st[1]+dr*n)) n++;
      if(n===s.length) return d;
    }
  }
  return null;
}
// 움직임 검사. 반환: {err} 또는 {moves:[[from,to]], pushed:[[from,to|null]]}
function plan(s,p,cells,d){
  const b=s.b, o=1-p, [dq,dr]=DIRS[d];
  if(!Array.isArray(cells)||cells.length<1||cells.length>3) return {err:'구슬을 1~3개 고르세요'};
  if(new Set(cells.map(c=>K(c[0],c[1]))).size!==cells.length) return {err:'구슬을 다시 고르세요'};
  if(cells.some(c=>at(b,c[0],c[1])!==p)) return {err:'내 구슬만 움직일 수 있어요'};
  const ax=lineAxis(cells); if(ax===null) return {err:'한 줄로 붙은 구슬만 함께 움직여요'};
  const inline = ax===-1 || d%3===ax;
  if(inline){
    // 맨 앞 구슬: 바로 앞칸이 고른 구슬이 아닌 것
    const lead = cells.find(c=>!cells.some(x=>x[0]===c[0]+dq&&x[1]===c[1]+dr));
    let q=lead[0]+dq, r=lead[1]+dr;
    if(!onB(q,r)) return {err:'자기 구슬은 판 밖으로 못 나가요'};
    const moves=cells.map(c=>[c,[c[0]+dq,c[1]+dr]]);
    if(at(b,q,r)===null) return {moves,pushed:[]};
    if(at(b,q,r)===p) return {err:'내 구슬이 막고 있어요'};
    const opp=[]; while(onB(q,r)&&at(b,q,r)===o){ opp.push([q,r]); q+=dq; r+=dr; }
    if(opp.length>=cells.length) return {err:'상대 구슬보다 많아야 밀 수 있어요'};
    if(onB(q,r)&&at(b,q,r)!==null) return {err:'뒤가 막혀서 밀 수 없어요'};
    return {moves, pushed:opp.map(c=>[c, onB(c[0]+dq,c[1]+dr)?[c[0]+dq,c[1]+dr]:null])};
  }
  for(const c of cells){ const q=c[0]+dq, r=c[1]+dr; if(!onB(q,r)||at(b,q,r)!==null) return {err:'옆으로 움직일 땐 빈칸으로만 가요'}; }
  return {moves:cells.map(c=>[c,[c[0]+dq,c[1]+dr]]), pushed:[]};
}
function doPlan(s,p,pl){
  const b=s.b;
  const all=pl.pushed.concat(pl.moves);
  const who=all.map(([f])=>b[K(f[0],f[1])]);
  for(const [f] of all) delete b[K(f[0],f[1])];
  let off=0;
  all.forEach(([,t],i)=>{ if(t) b[K(t[0],t[1])]=who[i]; else off++; });
  s.cap[p]+=off;
  return off;
}
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(s.turn!==p) return '상대 차례예요';
  if(!a||a.k!=='move') return '알 수 없는 동작';
  const d=a.d|0; if(!(d>=0&&d<6)) return '방향을 고르세요';
  const cells=(a.cells||[]).map(c=>[c[0]|0,c[1]|0]);
  const pl=plan(s,p,cells,d); if(pl.err) return pl.err;
  const off=doPlan(s,p,pl);
  s.last={p, to:pl.moves.map(m=>m[1]), off};
  s.moves++;
  if(s.cap[p]>=WIN){ s.winner=p; s.turn=null; return null; }
  if(s.moves>=MAXMOVES){ s.winner = s.cap[0]>s.cap[1]?0 : s.cap[1]>s.cap[0]?1 : 'draw'; s.turn=null; return null; }
  s.turn=1-p; return null;
}

/* 컴퓨터 */
function allMoves(s,p){
  const own=CELLS.filter(([q,r])=>at(s.b,q,r)===p), out=[], seen=new Set();
  const groups=[];
  for(const c of own){
    groups.push([c]);
    for(let d=0;d<3;d++){ const [dq,dr]=DIRS[d];
      const c2=[c[0]+dq,c[1]+dr]; if(at(s.b,c2[0],c2[1])!==p) continue; groups.push([c,c2]);
      const c3=[c2[0]+dq,c2[1]+dr]; if(at(s.b,c3[0],c3[1])===p) groups.push([c,c2,c3]); }
  }
  for(const g of groups) for(let d=0;d<6;d++){
    const pl=plan(s,p,g,d); if(pl.err) continue;
    const key=pl.moves.map(m=>K(...m[1])).sort().join('|')+'#'+pl.pushed.length;
    if(seen.has(key)) continue; seen.add(key);
    out.push({cells:g,d,pl});
  }
  return out;
}
const hexDist=(q,r)=>Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r));
function evalB(s,p){
  let v=(s.cap[p]-s.cap[1-p])*100;
  for(const [q,r] of CELLS){
    const x=at(s.b,q,r); if(x===null) continue;
    const sg=x===p?1:-1, dd=hexDist(q,r);
    v+=sg*(4-dd)*1.2;
    for(let d=0;d<3;d++){ if(at(s.b,q+DIRS[d][0],r+DIRS[d][1])===x) v+=sg*.5; }
    if(dd===4) v-=sg*.8;
  }
  return v;
}
function ai(v){
  const moves=allMoves(v,1); let best=null, bs=-1e9;
  for(const m of moves){
    const t=U.clone(v); doPlan(t,1,plan(t,1,m.cells,m.d));
    if(t.cap[1]>=WIN) return {k:'move',cells:m.cells,d:m.d};
    let worst=0;
    for(const om of allMoves(t,0)){ if(om.pl.pushed.some(x=>x[1]===null)){ worst=100; break; } }
    const sc=evalB(t,1)-worst+Math.random()*.6;
    if(sc>bs){ bs=sc; best=m; }
  }
  return {k:'move',cells:best.cells,d:best.d};
}

/* 화면 */
const SZ=30, W=520, H=470, CX=W/2, CY=H/2;
let sel=[], V=null, C=null, svg=null, sig='';
const flipQ=c=> C&&C.flip ? [-c[0],-c[1]] : c;
function pix(q,r){ const [fq,fr]=flipQ([q,r]); return [CX+SZ*Math.sqrt(3)*(fq+fr/2), CY+SZ*1.5*fr]; }
function targets(){
  if(!sel.length||!C||!C.myTurn) return [];
  const out=[];
  for(let d=0;d<6;d++){
    const pl=plan(V,C.me,sel,d); if(pl.err) continue;
    const ax=lineAxis(sel), inline= ax===-1||d%3===ax;
    let spot;
    if(inline){ const lead=sel.find(c=>!sel.some(x=>x[0]===c[0]+DIRS[d][0]&&x[1]===c[1]+DIRS[d][1])); spot=[lead[0]+DIRS[d][0],lead[1]+DIRS[d][1]]; }
    else { const mid=sel.length===3 ? sel.find(c=>sel.filter(x=>hexDist(x[0]-c[0],x[1]-c[1])===1).length===2) : sel[0]; spot=[mid[0]+DIRS[d][0],mid[1]+DIRS[d][1]]; }
    out.push({d,spot,push:pl.pushed.length>0});
  }
  return out;
}
function draw(){
  const s=V, o=[];
  const corner=i=>{ const a=Math.PI/180*(60*i); return [CX+SZ*8.2*Math.cos(a), CY+SZ*8.2*Math.sin(a)]; };
  o.push(`<polygon points="${[0,1,2,3,4,5].map(i=>corner(i).join(',')).join(' ')}" fill="var(--board)" stroke="#2c3949" stroke-width="6" stroke-linejoin="round"/>`);
  const lastTo=new Set((s.last&&s.last.to||[]).map(c=>K(c[0],c[1])));
  for(const [q,r] of CELLS){ const [x,y]=pix(q,r); o.push(`<circle cx="${x}" cy="${y}" r="${SZ*.78}" fill="#2c3949"/>`); }
  const ts=targets();
  for(const [q,r] of CELLS){
    const x0=at(s.b,q,r); if(x0===null) continue;
    const [x,y]=pix(q,r), isSel=sel.some(c=>c[0]===q&&c[1]===r);
    o.push(`<circle cx="${x}" cy="${y+2}" r="${SZ*.74}" fill="rgba(0,0,0,.3)"/><circle cx="${x}" cy="${y}" r="${SZ*.74}" fill="var(--p${x0})" ${isSel?'stroke="#f0a83a" stroke-width="4"':''}/><circle cx="${x-7}" cy="${y-7}" r="${SZ*.2}" fill="rgba(255,255,255,.35)"/>`);
    if(lastTo.has(K(q,r))) o.push(`<circle cx="${x}" cy="${y}" r="${SZ*.3}" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="2"/>`);
  }
  for(const t of ts){
    const [x,y]=pix(t.spot[0],t.spot[1]);
    o.push(`<g class="tg" data-d="${t.d}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="${SZ*.6}" fill="${t.push?'rgba(226,87,76,.55)':'rgba(159,211,168,.85)'}" stroke="#fff" stroke-width="2"/><text x="${x}" y="${y+6}" text-anchor="middle" font-size="18" fill="#fff" font-weight="800">${t.push?'밀기':''}</text></g>`);
  }
  svg.innerHTML=o.join('');
}
function cellAt(e){
  const pt=svg.createSVGPoint(); pt.x=e.clientX; pt.y=e.clientY; const p=pt.matrixTransform(svg.getScreenCTM().inverse());
  let best=null, bd=1e9;
  for(const c of CELLS){ const [x,y]=pix(c[0],c[1]), d=(x-p.x)**2+(y-p.y)**2; if(d<bd){ bd=d; best=c; } }
  return bd<(SZ*.95)**2 ? best : null;
}
function bind(){
  svg.addEventListener('pointerdown',e=>{
    if(!C||!C.myTurn) return;
    const tg=e.target.closest('.tg');
    if(tg){ const d=+tg.dataset.d, cells=sel; sel=[]; C.act({k:'move',cells,d}); return; }
    const c=cellAt(e); if(!c){ sel=[]; draw(); return; }
    if(at(V.b,c[0],c[1])!==C.me){ sel=[]; draw(); return; }
    const has=sel.some(x=>x[0]===c[0]&&x[1]===c[1]);
    let n = has ? sel.filter(x=>!(x[0]===c[0]&&x[1]===c[1])) : sel.concat([c]);
    if(n.length>3 || (n.length && lineAxis(n)===null)) n=[c];
    sel=n; C.rerender();
  });
}
function render(el,v,ctx){
  V=v; C=ctx;
  const sg=v.moves+':'+v.turn; if(sg!==sig){ sig=sg; sel=[]; }
  svg=el.querySelector('svg.hexboard');
  if(!svg){ el.innerHTML=`<svg class="hexboard" viewBox="0 0 ${W} ${H}"></svg>`; svg=el.firstChild; bind(); }
  draw();
}
const pips=(n,p)=>{ let h=''; for(let i=0;i<WIN;i++) h+=`<b class="${i<n?'':'used'}" style="${i<n?`background:var(--p${1-p})`:''}"></b>`; return h; };
const guide=`
<p>육각형 판에서 상대 구슬을 <b>판 밖으로 6개</b> 먼저 밀어내면 이겨요. 각자 구슬 14개.</p>
<h3>움직이기</h3>
<ul><li>내 차례에 <b>한 줄로 붙어 있는 내 구슬 1~3개</b>를 골라 한 칸 움직여요.</li>
<li>구슬을 누르면 노란 테두리로 선택돼요. 같은 줄의 구슬을 더 누르면 2~3개를 함께 골라요.</li>
<li>갈 수 있는 방향에 <b>초록 원</b>이 떠요. 누르면 움직여요.</li>
<li><b>줄 방향으로</b>(앞뒤로) 움직일 수도, <b>옆으로</b> 나란히 움직일 수도 있어요. 옆으로 갈 땐 가는 칸이 모두 비어 있어야 해요.</li></ul>
<h3>밀기</h3>
<ul><li>줄 방향으로 움직일 때 앞에 상대 구슬이 있으면, <b>내 구슬이 더 많을 때만</b> 밀 수 있어요. (3이 2나 1을, 2가 1을)</li>
<li>같은 수끼리는 못 밀어요. 상대 구슬 뒤에 다른 구슬이 붙어 있어도 못 밀어요.</li>
<li>밀 수 있는 곳엔 <b>빨간 "밀기"</b> 원이 떠요. 판 끝에서 밀면 상대 구슬이 떨어져요!</li></ul>
<div class="tipbox">💡 <b>팁</b><br>
· 판 가운데를 차지하고 구슬끼리 뭉쳐 있으면 잘 안 밀려요.<br>
· 판 가장자리에 혼자 있는 구슬은 위험해요.<br>
· 상대 구슬 2개를 내 구슬 3개로 미는 모양을 노려보세요.</div>`;
window.GAMES.marble = {
  title:'구슬 밀기', ref:'아발론 (Abalone)', emoji:'🔵', tags:['전략','추상','보드'], pulse:v=>v.cap[1]-v.cap[0], tagline:'육각판에서 구슬을 한 줄로 밀어붙여 상대 구슬 6개를 판 밖으로 떨어뜨리는 대결.',
  guide, init, apply, ai, local:true, render,
  reset(){ sel=[]; sig=''; svg=null; },
  status:(v,ctx)=>ctx.turnText(v)+(!ctx.myTurn?'':sel.length?' · 초록 원(밀 땐 빨간 원)을 눌러 움직이세요':' · 움직일 구슬을 고르세요 (한 줄로 1~3개)'),
  bar:(v,i)=>`<span class="tag">밀어냄</span><span class="walls">${pips(v.cap[i],i)}</span>`,
  result:(v,ctx)=>`${v.cap[ctx.me]} : ${v.cap[1-ctx.me]}`,
};
})();
