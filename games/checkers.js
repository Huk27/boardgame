(function(){
'use strict';
/* 체커: 8×8 어두운 칸만 사용, 각자 12개. 말은 대각선 앞으로 한 칸, 상대 말을 뛰어넘어 잡음.
   잡을 수 있으면 반드시 잡아야 하고, 이어서 잡을 수 있으면 계속 점프. 끝줄에 닿으면 왕(앞뒤 모두).
   움직일 수 없으면 패배. 40수 동안 아무도 못 잡으면 무승부.
   칸 값: -1 빈칸, 0/1 말, 2/3 왕(=2+p). 0번은 아래(행 7→0 방향으로 전진). */
const N=8, DRAWN=40;
const own=(x,p)=> x===p || x===p+2;
const isKing=x=> x>=2;
function init(starter){
  const b=Array(64).fill(-1);
  for(let r=0;r<8;r++) for(let c=0;c<8;c++) if((r+c)%2===1){ if(r<3) b[r*8+c]=1; if(r>4) b[r*8+c]=0; }
  return {b, turn:starter, starter, winner:null, last:null, quiet:0, moves:0};
}
const dirsOf=(x,p)=> isKing(x) ? [[-1,-1],[-1,1],[1,-1],[1,1]] : p===0 ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]];
const inb=(r,c)=>r>=0&&r<8&&c>=0&&c<8;
// 한 말에서 가능한 연속 점프 경로 전부
function jumpsFrom(b,i,p,x,taken){
  const r=i>>3, c=i&7, out=[];
  for(const [dr,dc] of dirsOf(x,p)){
    const mr=r+dr, mc=c+dc, tr=r+2*dr, tc=c+2*dc;
    if(!inb(tr,tc)) continue;
    const mi=mr*8+mc, ti=tr*8+tc;
    if(b[mi]===-1 || own(b[mi],p) || taken.includes(mi) || b[ti]!==-1) continue;
    const promo = !isKing(x) && ((p===0&&tr===0)||(p===1&&tr===7));
    const nb=b.slice(); nb[ti]=x; nb[i]=-1;
    const more = promo ? [] : jumpsFrom(nb,ti,p,x,taken.concat(mi));
    if(more.length) for(const m of more) out.push({path:[i,...m.path], caps:[mi,...m.caps]});
    else out.push({path:[i,ti], caps:[mi]});
  }
  return out;
}
function legal(b,p){
  let jumps=[];
  for(let i=0;i<64;i++) if(own(b[i],p)) jumps=jumps.concat(jumpsFrom(b,i,p,b[i],[]));
  if(jumps.length) return jumps;
  const out=[];
  for(let i=0;i<64;i++) if(own(b[i],p)){ const r=i>>3,c=i&7; for(const [dr,dc] of dirsOf(b[i],p)){ const tr=r+dr, tc=c+dc; if(inb(tr,tc)&&b[tr*8+tc]===-1) out.push({path:[i,tr*8+tc], caps:[]}); } }
  return out;
}
function doMove(b,p,m){
  const x=b[m.path[0]]; b[m.path[0]]=-1; for(const k of m.caps) b[k]=-1;
  const to=m.path[m.path.length-1], tr=to>>3;
  b[to] = (!isKing(x) && ((p===0&&tr===0)||(p===1&&tr===7))) ? p+2 : x;
}
const same=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(s.turn!==p) return '상대 차례예요';
  if(!a||a.k!=='move'||!Array.isArray(a.path)) return '알 수 없는 동작';
  const L=legal(s.b,p), m=L.find(x=>same(x.path,a.path));
  if(!m) return L.some(x=>x.caps.length) ? '잡을 수 있는 말이 있으면 반드시 잡아야 해요' : '갈 수 없는 칸이에요';
  doMove(s.b,p,m); s.last={p, path:m.path, caps:m.caps}; s.moves++;
  s.quiet = m.caps.length ? 0 : s.quiet+1;
  const o=1-p;
  if(!legal(s.b,o).length){ s.winner=p; s.turn=null; return null; }
  if(s.quiet>=DRAWN){ s.winner='draw'; s.turn=null; return null; }
  s.turn=o; return null;
}

/* 컴퓨터: 말 수(왕은 1.6)·전진·가운데 점수로 알파베타 6수 */
function evalB(b){ // 1번 관점
  let v=0;
  for(let i=0;i<64;i++){ const x=b[i]; if(x<0) continue; const p=x%2, r=i>>3, c=i&7;
    let w = isKing(x) ? 1.6 : 1 + (p===1 ? r : 7-r)*.04;
    if(c>=2&&c<=5&&r>=2&&r<=5) w+=.05;
    v += p===1 ? w : -w; }
  return v;
}
function ab(b,p,d,al,be){
  const L=legal(b,p);
  if(!L.length) return p===1 ? -100-d : 100+d;
  if(d===0) return evalB(b);
  if(p===1){ let v=-1e9; for(const m of L){ const t=b.slice(); doMove(t,1,m); v=Math.max(v,ab(t,0,d-1,al,be)); al=Math.max(al,v); if(al>=be) break; } return v; }
  let v=1e9; for(const m of L){ const t=b.slice(); doMove(t,0,m); v=Math.min(v,ab(t,1,d-1,al,be)); be=Math.min(be,v); if(al>=be) break; } return v;
}
function ai(v,lvl=1){
  const L=legal(v.b,1); let best=null, bs=-Infinity;
  for(const m of L){ const t=v.b.slice(); doMove(t,1,m); const sc=ab(t,0,[1,3,5][lvl],-1e9,1e9)+Math.random()*[1.2,.3,.08][lvl]; if(sc>bs){ bs=sc; best=m; } }
  return {k:'move', path:best.path};
}

/* 화면 */
let V=null, C=null, sel=null;
function render(el,v,ctx){
  V=v; C=ctx;
  const fl=ctx.flip, vi=i=> fl ? 63-i : i;
  const my=ctx.myTurn, L= my ? legal(v.b,ctx.me) : [];
  const mustCap = L.some(m=>m.caps.length);
  if(sel!=null && !L.some(m=>m.path[0]===sel)) sel=null;
  const targets = sel!=null ? L.filter(m=>m.path[0]===sel) : [];
  const tset=new Map(targets.map(m=>[m.path[m.path.length-1],m]));
  const movable=new Set(L.map(m=>m.path[0]));
  const lastSet=new Set(v.last?v.last.path:[]);
  let h=`<div class="ck-board">`;
  for(let k=0;k<64;k++){
    const i=vi(k), r=i>>3, c=i&7, dark=(r+c)%2===1, x=v.b[i];
    let cls='ck-c'+(dark?' dark':'');
    if(lastSet.has(i)) cls+=' last';
    if(tset.has(i)) cls+=' tgt';
    let piece='';
    if(x>=0) piece=`<span class="ck-p p${x%2} ${isKing(x)?'king':''} ${sel===i?'sel':''} ${movable.has(i)?'can':''}">${isKing(x)?'♛':''}</span>`;
    h+=`<div class="${cls}" data-i="${i}">${piece}${tset.has(i)?'<i class="dot"></i>':''}</div>`;
  }
  h+=`</div>`;
  if(my && mustCap) h+=`<div class="info">⚠️ 잡을 수 있는 말이 있어서 <b>반드시 잡아야</b> 해요 (반짝이는 말)</div>`;
  const cnt=p=>v.b.filter(x=>x>=0&&x%2===p).length;
  h+=`<div class="info">남은 말 · 나 <b>${cnt(ctx.me)}</b> : 상대 <b>${cnt(1-ctx.me)}</b>${v.quiet>=20?` · ${DRAWN-v.quiet}수 안에 아무도 못 잡으면 무승부`:''}</div>`;
  el.innerHTML=h;
  el.onclick=e=>{
    const d=e.target.closest('.ck-c'); if(!d||!C.myTurn) return;
    const i=+d.dataset.i;
    if(tset.has(i)){ const m=tset.get(i); sel=null; C.act({k:'move',path:m.path}); return; }
    if(movable.has(i)){ sel = sel===i ? null : i; C.rerender(); return; }
    if(own(V.b[i],C.me)){ C.tip(mustCap?'잡을 수 있는 말부터 움직여야 해요':'그 말은 지금 움직일 수 없어요'); }
    sel=null; C.rerender();
  };
}
const guide=`
<p>대각선으로 움직이며 <b>상대 말을 뛰어넘어 잡는</b> 클래식 게임. 상대가 <b>움직일 수 없게</b> 되면 승리!</p>
<ul><li>어두운 칸만 써요. 각자 12개.</li>
<li>말은 <b>대각선 앞으로 한 칸</b>.</li>
<li>바로 앞 대각선의 상대 말 너머가 비어 있으면 <b>뛰어넘어 잡아요</b>. 이어서 또 잡을 수 있으면 계속 점프!</li>
<li>⚠️ <b>잡을 수 있으면 반드시 잡아야 해요.</b> (그럴 땐 잡을 수 있는 말만 반짝여요)</li>
<li>맞은편 끝줄에 닿으면 <b>왕 ♛</b>이 돼서 앞뒤 대각선 모두 움직일 수 있어요.</li>
<li>40수 동안 아무도 못 잡으면 무승부.</li></ul>
<h3>조작</h3>
<ul><li>반짝이는 내 말을 누르면 갈 수 있는 곳에 점이 찍혀요. 점을 누르면 이동 (연속 점프도 한 번에).</li></ul>
<div class="tipbox">💡 <b>팁</b><br>
· 말을 하나 내줘서 둘을 잡는 "미끼" 수를 노려보세요. 강제로 잡게 만들 수 있어요.<br>
· 맨 뒷줄 말은 오래 지키면 상대 왕이 안 생겨요.<br>
· 말끼리 붙어 다니면 쉽게 잡히지 않아요.</div>`;
window.GAMES.checkers = {
  title:'체커', emoji:'🔴', tags:['전략','클래식','추상'],
  pulse:v=>{ let s=0; for(const x of v.b){ if(x<0) continue; const w=isKing(x)?1.6:1; s+= x%2===1?w:-w; } return s; }, pulseStep:1.5,
  tagline:'대각선으로 뛰어넘어 잡기! 잡을 수 있으면 꼭 잡아야 하는 클래식 체커.',
  guide, init, apply, ai, local:true, render,
  reset(){ sel=null; },
  status:(v,ctx)=>ctx.turnText(v)+(ctx.myTurn?(sel!=null?' · 점 찍힌 곳을 누르세요':' · 움직일 말을 누르세요'):''),
  bar:(v,i)=>`<span class="ck-chip p${i}"></span><span class="score">${v.b.filter(x=>x>=0&&x%2===i).length}</span>`,
};
})();
