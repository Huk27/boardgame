(function(){
'use strict';
/* 밀어 넣기 오목: 5×5 블록. 내 차례: 가장자리 블록 중 빈 것(·)이나 내 것을 하나 빼서 내 표시로 바꾸고,
   그 블록이 있던 줄(가로나 세로)의 끝에서 밀어 넣음 → 줄이 한 칸씩 밀림. 뺀 자리로 바로 다시 넣을 수는 없음.
   내 표시 5개가 한 줄(가로·세로·대각선)이면 승리. 단, 내 수로 상대 줄이 완성되면 상대 승리. 80수가 넘으면 무승부. */
const N=5, MAXT=80;
function init(starter){ return {b:[...Array(N)].map(()=>Array(N).fill(-1)), turn:starter, starter, last:null, winner:null, t:0}; }
const edge=(r,c)=> r===0||r===N-1||c===0||c===N-1;
function dests(r,c){ const out=[]; for(const [tr,tc] of [[r,0],[r,N-1],[0,c],[N-1,c]]){ if(tr===r&&tc===c) continue; if(!out.some(x=>x[0]===tr&&x[1]===tc)) out.push([tr,tc]); } return out; }
function legal(b,p){ const out=[]; for(let r=0;r<N;r++) for(let c=0;c<N;c++){ if(!edge(r,c)) continue; const v=b[r][c]; if(v!==-1&&v!==p) continue; for(const [tr,tc] of dests(r,c)) out.push({r,c,tr,tc}); } return out; }
function push(b,p,m){
  const {r,c,tr,tc}=m;
  if(tr===r){ if(tc<c) for(let i=c;i>tc;i--) b[r][i]=b[r][i-1]; else for(let i=c;i<tc;i++) b[r][i]=b[r][i+1]; b[r][tc]=p; }
  else { if(tr<r) for(let i=r;i>tr;i--) b[i][c]=b[i-1][c]; else for(let i=r;i<tr;i++) b[i][c]=b[i+1][c]; b[tr][c]=p; }
}
const LINES=(()=>{ const L=[]; for(let i=0;i<N;i++){ L.push([...Array(N)].map((_,k)=>[i,k])); L.push([...Array(N)].map((_,k)=>[k,i])); } L.push([...Array(N)].map((_,k)=>[k,k])); L.push([...Array(N)].map((_,k)=>[k,N-1-k])); return L; })();
function fives(b){ const has=[false,false]; for(const L of LINES){ const v=b[L[0][0]][L[0][1]]; if(v<0) continue; if(L.every(([r,c])=>b[r][c]===v)) has[v]=true; } return has; }
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(s.turn!==p) return '상대 차례예요';
  if(!a||a.k!=='push') return '알 수 없는 동작';
  const m={r:a.r|0,c:a.c|0,tr:a.tr|0,tc:a.tc|0};
  if(!legal(s.b,p).some(x=>x.r===m.r&&x.c===m.c&&x.tr===m.tr&&x.tc===m.tc)) return '거기로는 밀 수 없어요';
  push(s.b,p,m); s.t++; s.last={p,...m};
  const f=fives(s.b), o=1-p;
  if(f[o]) s.winner=o; else if(f[p]) s.winner=p; else if(s.t>=MAXT) s.winner='draw';
  s.turn = s.winner!=null ? null : o; return null;
}
function mask(s){ return U.clone(s); }

/* 컴퓨터: 줄마다 내 표시가 몇 개 모였는지(상대 표시가 없는 줄만)로 판을 평가하고 몇 수 앞을 내다봄
   (쉬움 1수+실수, 보통 2수, 어려움 3수). */
function evalB(b,me){
  const f=fives(b); if(f[1-me]) return -100000; if(f[me]) return 100000;
  let sc=0; const W=[0,1,4,16,80];
  for(const L of LINES){ let m=0,o=0; for(const [r,c] of L){ const v=b[r][c]; if(v===me) m++; else if(v===1-me) o++; }
    if(!o) sc+=W[m]; if(!m) sc-=W[o]*1.1; }
  return sc;
}
const cp=b=>b.map(r=>r.slice());
function search(b,turn,depth,alpha,beta,me){
  const f=fives(b); if(f[0]||f[1]||depth===0) return evalB(b,me);
  const ms=legal(b,turn); let best = turn===me ? -1e9 : 1e9;
  for(const m of ms){ const nb=cp(b); push(nb,turn,m); const v=search(nb,1-turn,depth-1,alpha,beta,me);
    if(turn===me){ if(v>best) best=v; if(best>alpha) alpha=best; } else { if(v<best) best=v; if(best<beta) beta=best; }
    if(beta<=alpha) break; }
  return best;
}
let saidT=-1;
function say(v,list,pr){ if(typeof showSay==='function' && saidT!==v.t && Math.random()<pr){ saidT=v.t; setTimeout(()=>showSay(1,U.pick(list),2600),250); } }
function ai(v,lvl=1){
  if(v.turn!==1||v.winner!=null) return null;
  const ms=U.shuffle(legal(v.b,1)), depth=[1,2,3][lvl];
  let best=ms[0], bs=-1e9;
  for(const m of ms){ const nb=cp(v.b); push(nb,1,m); let sc=search(nb,0,depth-1,-1e9,1e9,1); sc+=Math.random()*[25,3,.5][lvl]; if(sc>bs){ bs=sc; best=m; } }
  if(bs>50000) say(v,['밀어서… 다섯! 😎','이걸로 끝~'],.7);
  else if(bs<-50000) say(v,['어… 이건 못 막겠네','졌다 😱'],.6);
  else { const nb=cp(v.b); push(nb,1,best); if(LINES.some(L=>L.filter(([r,c])=>nb[r][c]===1).length===4 && !L.some(([r,c])=>nb[r][c]===0))) say(v,['하나 남았다 😏','네 개째~'],.4); }
  return {k:'push',...best};
}

/* 화면 */
let sel=null, lastT=-1;
function render(el,v,ctx){
  const me=ctx.me, o=1-me, who=i=> i===me&&ctx.mode!=='local' ? '나' : U.esc(ctx.name(i));
  if(v.t!==lastT){ lastT=v.t; sel=null; }
  const myTurn=ctx.myTurn && v.winner==null, p=v.turn;
  const L=myTurn ? legal(v.b,p) : [];
  const canPick=new Set(L.map(m=>m.r+','+m.c)), dst=new Set(sel?L.filter(m=>m.r===sel[0]&&m.c===sel[1]).map(m=>m.tr+','+m.tc):[]);
  const win=new Set(); if(v.winner!=null&&v.winner!=='draw') for(const Ln of LINES){ if(Ln.every(([r,c])=>v.b[r][c]===v.winner)) Ln.forEach(([r,c])=>win.add(r+','+c)); }
  const sym=x=> x===-1 ? '' : `<span class="pf-s p${x}">${x===0?'●':'✕'}</span>`;
  let h=`<div class="info">${v.t}수 · ${who(0)} <span class="pf-s p0">●</span> · ${who(1)} <span class="pf-s p1">✕</span></div>`;
  h+=`<div class="pf-board">`;
  for(let r=0;r<N;r++) for(let c=0;c<N;c++){ const k=r+','+c, ln=v.last&&((v.last.tr===r&&v.last.tc===c));
    h+=`<button class="pf-cell ${edge(r,c)?'edge':''} ${canPick.has(k)&&!sel?'pick':''} ${sel&&sel[0]===r&&sel[1]===c?'sel':''} ${dst.has(k)?'dst':''} ${win.has(k)?'win':''} ${ln?'last':''}" data-r="${r}" data-c="${c}">${sym(v.b[r][c])}${dst.has(k)?'<i>⇢</i>':''}</button>`; }
  h+=`</div>`;
  if(myTurn) h+=`<div class="fh-act"><small class="muted">${sel?'초록 칸 = 밀어 넣을 끝. 누르면 그 줄이 한 칸씩 밀려요 (다시 누르면 취소)':'가장자리에서 빈 블록이나 내 블록을 고르세요'}</small></div>`;
  if(v.last) h+=`<div class="pf-last">${who(v.last.p)}: (${v.last.r+1},${v.last.c+1})를 빼서 ${v.last.tr===v.last.r?'가로줄':'세로줄'} 끝 (${v.last.tr+1},${v.last.tc+1})로 밀어 넣음</div>`;
  el.innerHTML=h;
  el.onclick=e=>{ if(!myTurn) return; const b=e.target.closest('[data-r]'); if(!b) return; const r=+b.dataset.r, c=+b.dataset.c, k=r+','+c;
    if(sel && dst.has(k)){ ctx.act({k:'push', r:sel[0], c:sel[1], tr:r, tc:c}); return; }
    if(sel && sel[0]===r && sel[1]===c){ sel=null; ctx.rerender(); return; }
    if(canPick.has(k)){ sel=[r,c]; ctx.rerender(); } };
}
function status(v,ctx){ if(v.winner!=null) return ''; const w = ctx.mode==='local' ? ctx.name(v.turn)+' 차례 · ' : ''; return ctx.myTurn ? w+'가장자리 블록을 빼서 줄 끝에 밀어 넣으세요' : ctx.turnText(v); }
const guide=`
<p>5×5 블록 판에서 <b>내 표시 5개를 한 줄</b>(가로·세로·대각선)로 먼저 만들면 이겨요. 그런데 판이 계속 <b>밀려요</b>!</p>
<ul><li>내 차례: <b>가장자리</b> 블록 중 빈 것(표시 없음)이나 <b>내 것</b>을 하나 골라 빼요. 뺀 블록은 내 표시가 돼요.</li>
<li>그 블록이 있던 <b>가로줄이나 세로줄의 끝</b>에서 밀어 넣어요 → 그 줄의 블록들이 한 칸씩 밀려 빈자리를 채워요. 뺀 자리로 바로 다시 넣을 수는 없어요.</li>
<li>⚠️ 내 수로 <b>상대의 5줄</b>이 만들어지면 상대가 이겨요 (내 5줄이 같이 생겨도!).</li>
<li>상대 블록은 뺄 수 없어요. 80수가 넘으면 무승부.</li></ul>
<div class="tipbox">💡 <b>팁</b><br>
· 밀면 상대 블록도 같이 움직여요. 상대 줄을 흐트러뜨리는 데 쓰세요.<br>
· 가운데 칸은 직접 고를 수 없어요. 밀어서만 바뀌니 일찍 차지하면 든든해요.<br>
· 컴퓨터는 😊쉬움 1수, 🙂보통 2수, 😈어려움 3수 앞까지 내다봐요.</div>`;
window.GAMES.pushfive = {
  title:'밀어 넣기 오목', ref:'퀵소', emoji:'🧊', tags:['전략','추상','클래식'],
  tagline:'가장자리 블록을 빼서 밀어 넣기! 판이 움직이는 5목 전략 게임.',
  guide, init, apply, mask, ai, local:true, render, status,
  // 사람처럼: 판이 차서 노릴 줄이 많을수록 더 오래 고민
  aiDelay:s=>{ const filled=s.b.flat().filter(x=>x>=0).length; return 700+filled*90+Math.random()*900; },
  reset(){ sel=null; lastT=-1; saidT=-1; },
  bar:(v,i)=>`<span class="pf-s p${i}">${i===0?'●':'✕'}</span>`,
};
})();
