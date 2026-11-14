(function(){
'use strict';
/* 컬러턴 (피의 게임 시즌 2 · 데스매치). 6×6 판, 각 줄(가로)마다 숨은 지뢰 3개(총 18개, 둘 다 모름).
   각자 칩 7개(⚫ 선 / ⚪ 후). 차례마다 둘 중 하나:
   · 놓기 — 내 칩을 내 쪽 첫 줄(⚫ 1행, ⚪ 6행) 빈칸에
   · 옮기기 — 색과 상관없이 칩 하나를 주변 8칸 중 빈칸으로 (상대가 방금 옮긴 칩은 못 옮김)
   칩이 지뢰 칸에 놓이면 색이 뒤집힘(그 칸은 지뢰로 공개). 내 색 4개가 가로·세로·대각선으로 이어지면 승리 —
   상대 차례에 내 색 4개가 이어져도 내가 이김.
   (추가 규칙) 80수가 지나면 가장 길게 이은 내 색 줄 → 판 위 내 색 칩 수로 판정. */
const S=6, HAND=7, CAP=80;
const ROWHOME=[0,S-1];
const COL=['⚫','⚪'];
const LINES4=[]; for(let r=0;r<S;r++) for(let c=0;c<S;c++) for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]){ const L=[]; for(let k=0;k<4;k++){ const rr=r+dr*k, cc=c+dc*k; if(rr<0||rr>=S||cc<0||cc>=S) break; L.push(rr*S+cc); } if(L.length===4) LINES4.push(L); }
const ADJ=[]; for(let i=0;i<S*S;i++){ const r=i/S|0, c=i%S; ADJ.push([]); for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){ if(!dr&&!dc) continue; const rr=r+dr, cc=c+dc; if(rr>=0&&rr<S&&cc>=0&&cc<S) ADJ[i].push(rr*S+cc); } }
const name=i=>'ABCDEF'[i%S]+((i/S|0)+1);
function init(starter){
  const mine=Array(S*S).fill(false); for(let r=0;r<S;r++) U.shuffle([0,1,2,3,4,5]).slice(0,3).forEach(c=>mine[r*S+c]=true);
  // starter가 ⚫(선) — 색은 자리 고정: 0번 ⚫(1행), 1번 ⚪(6행). 선은 starter.
  return {b:Array(S*S).fill(-1), mine, known:Array(S*S).fill(0), hand:[HAND,HAND], turn:starter, starter, lastTo:-1, last:null, moves:0, winner:null, log:[], line:null};
}
function longest(b,c){ let m=0; for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]) for(let i=0;i<S*S;i++){ let r=i/S|0, cc=i%S, k=0; while(r>=0&&r<S&&cc>=0&&cc<S&&b[r*S+cc]===c){ k++; r+=dr; cc+=dc; } if(k>m) m=k; } return m; }
function four(b){ const out=[]; for(const L of LINES4){ const v=b[L[0]]; if(v>=0&&L.every(i=>b[i]===v)) out.push({c:v,L}); } return out; }
function land(s,i,c){ // 칩 c가 칸 i에 놓임 → 지뢰면 뒤집힘
  if(s.mine[i]){ s.known[i]=2; s.b[i]=1-c; return true; } s.known[i]=1; s.b[i]=c; return false; }
function legal(s,p){ const out=[];
  if(s.hand[p]>0) for(let c=0;c<S;c++){ const i=ROWHOME[p]*S+c; if(s.b[i]<0) out.push({k:'place',to:i}); }
  for(let i=0;i<S*S;i++) if(s.b[i]>=0&&i!==s.lastTo) for(const j of ADJ[i]) if(s.b[j]<0) out.push({k:'move',from:i,to:j});
  return out; }
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(s.turn!==p) return '상대 차례예요';
  if(!a) return '알 수 없는 동작';
  if(a.k==='pass'){ if(legal(s,p).length) return '둘 수 있는 수가 있어요'; s.log.push(`${p?'B':'A'} 둘 곳이 없어 넘김`); s.turn=1-p; s.lastTo=-1; return null; }
  const L=legal(s,p), m=L.find(x=>x.k===a.k&&x.to===(a.to|0)&&(a.k==='place'||x.from===(a.from|0)));
  if(!m) return a.k==='place'?'내 첫 줄 빈칸에만 놓을 수 있어요':(a.from|0)===s.lastTo?'상대가 방금 옮긴 칩은 못 옮겨요':'주변 8칸 중 빈칸으로만 옮길 수 있어요';
  let flip, c;
  if(m.k==='place'){ s.hand[p]--; c=p; flip=land(s,m.to,p); s.lastTo=-1; s.log.push(`${p?'B':'A'} ${COL[p]} 놓기 ${name(m.to)}${flip?` 💥 지뢰! → ${COL[1-p]}`:''}`); }
  else { c=s.b[m.from]; s.b[m.from]=-1; flip=land(s,m.to,c); s.lastTo=m.to; s.log.push(`${p?'B':'A'} ${COL[c]} 옮기기 ${name(m.from)}→${name(m.to)}${flip?` 💥 지뢰! → ${COL[1-c]}`:''}`); }
  s.last={...m, flip, p}; s.moves++;
  const f=four(s.b);
  if(f.length){ const cs=[...new Set(f.map(x=>x.c))]; const w = cs.length===1 ? cs[0] : p; s.winner=w; s.line=f.find(x=>x.c===w).L; s.turn=null;
    s.log.push(`🏁 ${COL[w]} 4개 연결 — ${w?'B':'A'} 승리!${w!==p?' (상대 손으로 완성!)':''}`); return null; }
  const snap=()=>[longest(s.b,0),longest(s.b,1),s.b.filter(x=>x===0).length,s.b.filter(x=>x===1).length];
  if(s.moves===CAP-1) s.snap=snap();   // 각자 마지막 한 수씩 반영되도록 두 시점을 더함
  if(s.moves>=CAP){ const a=snap(), b=s.snap||a, l0=a[0]+b[0], l1=a[1]+b[1], n0=a[2]+b[2], n1=a[3]+b[3];
    s.winner = l0!==l1 ? (l0>l1?0:1) : n0!==n1 ? (n0>n1?0:1) : 'draw'; s.turn=null; s.tb={l:[l0,l1],n:[n0,n1]}; s.log.push(`⏱️ ${CAP}수 — 가장 긴 줄 합 ${l0}:${l1} · 칩 합 ${n0}:${n1} (마지막 두 수 뒤 상태 합산)`); return null; }
  s.turn=1-p; return null;
}
function mask(s){ const v=U.clone(s); v.mine=s.mine.map((m,i)=> s.known[i]===2 || s.winner!=null ? m : null); return v; }

/* 컴퓨터: 공개 정보(밟아서 안전/지뢰로 드러난 칸, 줄마다 지뢰 3개)로 칸별 지뢰 확률 계산 → 기대값 */
function mineProb(v){ const P=Array(S*S).fill(0);
  for(let r=0;r<S;r++){ let km=0, unk=[]; for(let c=0;c<S;c++){ const i=r*S+c; if(v.known[i]===2) km++; else if(v.known[i]===0) unk.push(i); }
    const p= unk.length ? Math.max(0,Math.min(1,(3-km)/unk.length)) : 0; for(let c=0;c<S;c++){ const i=r*S+c; P[i]= v.known[i]===2?1 : v.known[i]===1?0 : p; } }
  return P; }
const W=[0,1,6,40,10000];
function evalB(b,me,late){ let sc=late?(longest(b,me)-longest(b,1-me))*30+(b.filter(x=>x===me).length-b.filter(x=>x===1-me).length)*4:0; for(const L of LINES4){ let a=0,o=0,e=0; for(const i of L){ if(b[i]===me) a++; else if(b[i]===1-me) o++; else e++; }
    if(a===4) return 1e6; if(o===4) return -1e6; if(!o) sc+=W[a]; if(!a) sc-=W[o]*1.15; } return sc; }
function outcomes(v,m,P,p){ // [{b, prob, lastTo}]
  const base=v.b.slice(); let c; if(m.k==='place'){ c=p; } else { c=base[m.from]; base[m.from]=-1; }
  const q=P[m.to], res=[]; if(q<1){ const b=base.slice(); b[m.to]=c; res.push({b,pr:1-q}); } if(q>0){ const b=base.slice(); b[m.to]=1-c; res.push({b,pr:q}); } return res; }
function oppBest(v,b,P,me,lastTo,hand){ // 상대가 고를 최선(내 기준 최소)
  const o=1-me, st={...v, b, lastTo, hand}; let worst=1e9;
  for(const m of legal(st,o)){ let e=0; for(const r of outcomes(st,m,P,o)) e+=r.pr*evalB(r.b,me,v.moves>CAP-16); if(e<worst) worst=e; if(worst<=-1e6) break; }
  return worst===1e9?evalB(b,me):worst; }
function ai(v,lvl=1){
  const me=v.turn; if(me==null) return null;
  const L=legal(v,me); if(!L.length) return {k:'pass'};
  const P=mineProb(v); let best=null, bv=-1e18;
  for(const m of U.shuffle(L.slice())){ let e=0;
    for(const r of outcomes(v,m,P,me)){ let x=evalB(r.b,me,v.moves>CAP-16);
      if(lvl>=1 && Math.abs(x)<1e6){ const hand=v.hand.slice(); if(m.k==='place') hand[me]--; const ob=oppBest(v,r.b,P,me,m.k==='move'?m.to:-1,hand); x = lvl===2 ? ob : Math.min(x, ob<= -1e6 ? ob : x); }
      e+=r.pr*x; }
    e += (lvl===0?Math.random()*40:Math.random()*2);
    if(e>bv){ bv=e; best=m; } }
  return best.k==='place'?{k:'place',to:best.to}:{k:'move',from:best.from,to:best.to};
}
function aiDelay(v){ return 1400+Math.random()*1600; }

/* 화면 */
let sel=-1, sig='';
function render(el,v,ctx){
  const me=ctx.mode==='local'?(v.turn==null?0:v.turn):ctx.me, my=ctx.myTurn;
  const sg=v.moves+':'+v.turn; if(sg!==sig){ sig=sg; sel=-1; }
  const nm=p=>ctx.mode==='local'?(p?'⚪ 하양':'⚫ 검정'):p===ctx.me?'나':(ctx.mode==='solo'?'상대':U.esc(ctx.name(p)));
  const L = my ? legal(v,me) : [];
  const tg = new Set(L.filter(m=> sel>=0 ? (m.k==='move'&&m.from===sel) : m.k==='place').map(m=>m.to));
  const movable=new Set(L.filter(m=>m.k==='move').map(m=>m.from));
  const line=new Set(v.line||[]);
  let h=`<div class="ct-top">${[0,1].map(p=>`<div class="ct-pl ${v.turn===p?'act':''} ${p===me&&ctx.mode!=='local'?'me':''}"><b>${COL[p]} ${nm(p)}</b> · 손에 ${'●'.repeat(v.hand[p])}${'○'.repeat(HAND-v.hand[p])} · 판 위 내 색 ${v.b.filter(x=>x===p).length}</div>`).join('')}</div>`;
  h+=`<div class="ct-wrap"><div class="ct-cols"><span></span>${'ABCDEF'.split('').map(x=>`<span>${x}</span>`).join('')}</div>`;
  for(let r=0;r<S;r++){ h+=`<div class="ct-row"><span class="ct-rn">${r+1}${r===0?' ⚫':r===S-1?' ⚪':''}</span>`;
    for(let c=0;c<S;c++){ const i=r*S+c, x=v.b[i], kn=v.known[i];
      const cls=[x>=0?'pc':'', tg.has(i)?'tg':'', movable.has(i)&&sel<0?'mv':'', sel===i?'sel':'', v.last&&v.last.to===i?'last':'', v.last&&v.last.k==='move'&&v.last.from===i?'from':'', kn===2?'mine':'', kn===1?'safe':'', line.has(i)?'win':'', i===v.lastTo?'lock':'', (r===ROWHOME[0]||r===ROWHOME[1])?'home':''].join(' ');
      h+=`<button class="ct-c ${cls}" data-i="${i}">${x>=0?`<span class="ct-chip c${x}"></span>`:''}${kn===2?'<em>💣</em>':''}${i===v.lastTo&&x>=0?'<small>🔒</small>':''}</button>`; }
    h+='</div>'; }
  h+='</div>';
  let line2='&nbsp;';
  if(v.winner!=null) line2 = v.winner==='draw'?'🤝 무승부': v.tb ? `⏱️ 수 제한 — 가장 긴 줄 합 ${v.tb.l[0]}:${v.tb.l[1]} · 칩 합 ${v.tb.n[0]}:${v.tb.n[1]} → ${COL[v.winner]} 승` : `🏁 ${COL[v.winner]} 4개 연결!`;
  else if(v.last&&v.last.flip) line2=`💥 ${name(v.last.to)}은(는) 지뢰였어요 — 칩 색이 뒤집혔어요!`;
  else if(my) line2 = sel>=0 ? '옮길 칸(초록)을 누르세요 · 같은 칩을 다시 누르면 취소' : `내 첫 줄(${ROWHOME[me]+1}행) 빈칸에 놓거나, 옮길 칩(초록 테두리)을 누르세요`;
  else line2=`${nm(v.turn)} 차례…`;
  h+=`<div class="py-line">${line2}</div>`;
  if(my&&!L.length) h+=`<div class="fh-act"><button data-pass="1">넘기기</button></div>`;
  h+=`<details class="hl-log"><summary>기록 · ${v.moves}/${CAP}수 · 드러난 지뢰 ${v.known.filter(x=>x===2).length}/18</summary>${v.log.slice(-14).reverse().map(x=>`<div>${U.esc(x).replace(/^A\b/,nm(0)).replace(/^B\b/,nm(1))}</div>`).join('')}</details>`;
  el.innerHTML=h;
  el.onclick=e=>{ if(e.target.closest('[data-pass]')) return ctx.act({k:'pass'});
    const b=e.target.closest('[data-i]'); if(!b||!my) return; const i=+b.dataset.i;
    if(sel>=0){ if(i===sel){ sel=-1; return ctx.rerender(); } if(tg.has(i)) { const f=sel; sel=-1; return ctx.act({k:'move',from:f,to:i}); } if(movable.has(i)){ sel=i; return ctx.rerender(); } sel=-1; return ctx.rerender(); }
    if(tg.has(i)) return ctx.act({k:'place',to:i});
    if(movable.has(i)){ sel=i; return ctx.rerender(); }
    if(i===v.lastTo) return ctx.tip('상대가 방금 옮긴 칩은 못 옮겨요');
  };
}
const guide=`
<p><b>숨은 지뢰가 칩 색을 뒤집는 4목</b>. 6×6 판, <b>가로 줄마다 지뢰 3개</b>가 숨어 있어요(둘 다 몰라요).</p>
<ol><li>각자 칩 ${HAND}개 (⚫ 1행 쪽 · ⚪ 6행 쪽). 차례마다 둘 중 하나:
  <br>· <b>놓기</b>: 내 칩을 <b>내 쪽 첫 줄</b> 빈칸에
  <br>· <b>옮기기</b>: <b>색과 상관없이</b> 아무 칩이나 주변 8칸 중 빈칸으로 (🔒 상대가 방금 옮긴 칩은 못 옮겨요)</li>
<li>칩이 <b>지뢰 칸</b>에 놓이면 <b>색이 뒤집혀요</b> 💣 (그 칸은 지뢰로 공개). 밟아 봤는데 안 뒤집힌 칸은 안전 칸(점 표시).</li>
<li><b>내 색 4개</b>가 가로·세로·대각선으로 이어지면 승리 — <b>상대가 만들어 줘도</b> 내 승리!</li></ol>
<p>(우리 판 추가 규칙) ${CAP}수가 지나면 <b>가장 길게 이은 내 색 줄</b>이 긴 쪽, 같으면 <b>판 위 내 색 칩</b>이 많은 쪽 승리 — 마지막에 두는 사람만 유리하지 않게 <b>각자 마지막 수를 둔 뒤 두 시점을 더해서</b> 비교해요.</p>
<div class="tipbox">💡 줄마다 지뢰가 정확히 3개라서, 한 줄에서 지뢰가 3개 다 드러나면 나머지 칸은 안전해요.<br>· 상대 칩을 지뢰로 밀어 넣어 내 색으로 바꾸는 것도 작전!</div>`;
const guideSteps=[
  {t:'판과 숨은 지뢰', h:'6×6 판의 <b>가로 줄마다 지뢰가 3개</b>씩 숨어 있어요. 둘 다 어디인지 몰라요.<br>밟아서 터진 칸은 <b>💣</b>, 밟았는데 멀쩡한 칸은 <b>작은 점</b>으로 남아요.',
   demo:s=>{ s.b[2]=0; s.b[8]=1; s.b[14]=0; s.known[2]=1; s.known[8]=2; s.known[14]=1; s.hand=[5,6]; s.moves=3; return s; }},
  {t:'① 놓기', h:'내 칩(⚫ 또는 ⚪)을 <b>내 쪽 첫 줄</b>(⚫은 1행, ⚪은 6행) 빈칸에 놓아요. 초록 테두리가 놓을 수 있는 칸이에요.',
   demo:s=>{ s.b[1]=0; s.known[1]=1; s.hand=[6,7]; return s; }},
  {t:'② 옮기기', h:'또는 <b>색과 상관없이 아무 칩이나</b> 주변 8칸 중 빈칸으로 한 칸 옮겨요. 단, <b>🔒 상대가 방금 옮긴 칩</b>은 못 옮겨요.',
   demo:s=>{ s.b[7]=0; s.b[14]=1; s.b[20]=0; s.known[7]=1; s.known[14]=1; s.known[20]=1; s.lastTo=14; s.last={k:'move',from:21,to:14,flip:false,p:1}; s.hand=[5,6]; return s; }},
  {t:'💥 지뢰를 밟으면', h:'칩이 지뢰 칸에 놓이면 <b>색이 뒤집혀요</b>. 내 칩을 상대 색으로 바꿔 줄 수도, 상대 칩을 내 색으로 만들 수도!',
   demo:s=>{ s.b[15]=1; s.known[15]=2; s.b[9]=0; s.known[9]=1; s.last={k:'move',from:9,to:15,flip:true,p:0}; s.hand=[5,6]; return s; }},
  {t:'🏁 4개 잇기', h:'<b>내 색 4개</b>가 가로·세로·대각선으로 이어지면 승리. <b>상대가 이어 줘도</b> 내 승리예요!<br><small>(우리 판 추가 규칙) 80수가 지나면 가장 길게 이은 줄 → 판 위 칩 수로 판정.</small>',
   demo:s=>{ for(const i of [7,14,21,28]){ s.b[i]=0; s.known[i]=1; } s.b[9]=1; s.b[16]=1; s.line=[7,14,21,28]; s.winner=0; return s; }},
  {t:'💡 팁', shot:false, h:'<div class="gd-tip">줄마다 지뢰가 <b>정확히 3개</b> — 한 줄에서 💣이 3개 다 나오면 나머지는 안전해요.</div><div class="gd-tip">상대 칩을 지뢰 칸으로 밀어 넣어 내 색으로 바꾸는 것도 작전!</div>'},
];
window.GAMES.colorturn = {
  title:'컬러턴', ref:'피의 게임 「컬러턴」', emoji:'💣', tags:['4목','지뢰','두뇌서바이벌','데스매치'], local:true,
  tagline:'줄마다 숨은 지뢰 3개. 밟으면 칩 색이 뒤집히는 6×6 4목.',
  guide, guideSteps, init, apply, mask, ai, aiDelay, render,
  reset(){ sel=-1; sig=''; },
  status:(v,ctx)=> v.winner!=null?'':ctx.myTurn?'놓거나 옮기세요':ctx.turnText(v),
  bar:(v,i)=>`<span class="score">${COL[i]} 손에 ${v.hand[i]}</span>`,
};
})();
