(function(){
'use strict';
/* 배틀 오름차순 (피의 게임 시즌 2 · 10일차 데스매치) — 1:1. 각자 10칸 시트, 카드는 1~10 네 벌(40장).
   번갈아 카드 2장을 뽑아 둘 다 봄 → 뽑은 사람이 한 장을 골라 자기 시트의 원하는 빈칸에 적고, 남은 한 장은 상대가 자기 시트의 원하는 빈칸에 적음.
   10번 반복해 시트가 차면, 왼쪽→오른쪽으로 같거나 커지며 이어진 가장 긴 칸 수가 점수. 높은 쪽 생존(같으면 두 번째로 긴 줄로 비교). */
const L=10;
function runs(sh){ const out=[]; let cur=0, prev=-1; for(const x of sh){ if(prev<0||x>=prev) cur++; else { out.push(cur); cur=1; } prev=x; } out.push(cur); return out.sort((a,b)=>b-a); }
function cmpRuns(a,b){ const A=runs(a), B=runs(b); for(let i=0;i<Math.max(A.length,B.length);i++){ const x=A[i]||0, y=B[i]||0; if(x!==y) return x-y; } return 0; }
function run(sh){ let best=0, cur=0, prev=-1; for(const x of sh){ if(x==null){ cur=0; prev=-1; continue; } if(prev<0||x>=prev) cur++; else cur=1; prev=x; best=Math.max(best,cur); } return best; }
function outlook(sh,cnt){ let best=0; const tot=cnt?cnt.reduce((a,b)=>a+b,0):0; const pr=(lo,hi)=>{ if(!cnt||!tot) return Math.max(0,hi-lo+1)/10; let x=0; for(let n=lo;n<=hi;n++) x+=cnt[n]||0; return x/tot; };
  for(let i=0;i<L;i++){ let e=i, last=0; while(e<L){ const x=sh[e]; if(x!=null){ if(x<last) break; last=x; } e++; }
    let v=0; for(let k=i;k<e;k++){ if(sh[k]!=null){ v+=1; continue; } let lo=1, hi=10; for(let q=k-1;q>=i;q--) if(sh[q]!=null){ lo=sh[q]; break; } for(let q=k+1;q<e;q++) if(sh[q]!=null){ hi=sh[q]; break; } v+=pr(lo,hi); }
    if(v>best) best=v; }
  return best; }
function bestPlace(sh,n,cnt){ let bc=-1, bv=-1e9; for(let c=0;c<L;c++) if(sh[c]==null){ const t=sh.slice(); t[c]=n; const v=outlook(t,cnt)-Math.abs(c-(n-1))*.01; if(v>bv){ bv=v; bc=c; } } return {c:bc, v:bv}; }
function init(starter){ const deck=[]; for(let n=1;n<=10;n++) for(let k=0;k<4;k++) deck.push(n); U.shuffle(deck);
  return {deck, sheet:[Array(L).fill(null),Array(L).fill(null)], turn:null, drawer:starter, starter, draw:null, keep:null, phase:'intro', winner:null, log:[], last:null, n:0}; }
function startTurn(s){ s.draw=[s.deck.pop(), s.deck.pop()]; s.keep=null; s.phase='pick'; s.turn=s.drawer; s.n++; s.log.push(`${s.n}번째 — ${s.drawer?'B':'A'} 뽑기: ${s.draw.join(', ')}`); }
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요'; if(s.turn!==p) return '상대 차례예요'; if(!a) return '알 수 없는 동작';
  if(s.phase==='pick'){ if(a.k!=='keep') return '가질 카드와 칸을 고르세요'; const k=a.i|0, c=a.c|0; if(k!==0&&k!==1) return '카드를 고르세요'; if(!(c>=0&&c<L)||s.sheet[p][c]!=null) return '빈칸을 고르세요';
    s.sheet[p][c]=s.draw[k]; s.keep=k; s.last={p,c,v:s.draw[k]}; s.log.push(`${p?'B':'A'} ${s.draw[k]} 가짐(${c+1}번 칸) → ${s.draw[1-k]} 넘김`); s.phase='place'; s.turn=1-p; return null; }
  if(s.phase==='place'){ if(a.k!=='place') return '받은 카드를 적을 칸을 고르세요'; const c=a.c|0; if(!(c>=0&&c<L)||s.sheet[p][c]!=null) return '빈칸을 고르세요';
    const v=s.draw[1-s.keep]; s.sheet[p][c]=v; s.last={p,c,v}; s.log.push(`${p?'B':'A'} 받은 ${v} → ${c+1}번 칸`);
    if(s.sheet[0].every(x=>x!=null)&&s.sheet[1].every(x=>x!=null)){ const a0=run(s.sheet[0]), a1=run(s.sheet[1]), cr=cmpRuns(s.sheet[0],s.sheet[1]); s.winner=cr>0?0:cr<0?1:'draw'; if(a0===a1&&cr) s.log.push('⚖️ 가장 긴 줄이 같아 두 번째로 긴 줄로 판정'); s.score=[a0,a1]; s.phase='over'; s.turn=null; s.log.push(`🏁 ${a0} : ${a1}`); return null; }
    s.drawer=1-s.drawer; s.phase='deal'; s.turn=null; return null; }
  return '알 수 없는 동작'; }
function stepDelay(s){ if(s.winner!=null) return null; if(s.phase==='intro') return 1500; if(s.phase==='deal') return 900; return null; }
function step(s){ if(s.phase==='intro'||s.phase==='deal') startTurn(s); }
function mask(s){ const v=U.clone(s); v.deck=s.deck.length; return v; }
function remain(v){ const c=Array(11).fill(4); c[0]=0; for(const sh of v.sheet) for(const x of sh) if(x!=null) c[x]--; if(v.draw&&v.phase==='pick') for(const x of v.draw) c[x]--; return c; }
/* 컴퓨터: 가질 카드·칸 × 넘길 카드 → (내 전망 − 상대가 받은 카드를 가장 좋게 놓았을 때 전망) */
function ai(v,lvl=1){ const me=v.turn; if(me==null) return null; const o=1-me;
  const cnt = lvl===2 ? remain(v) : null;
  if(v.phase==='pick'){ let best=null, bv=-1e9;
    for(const k of [0,1]){ const mine=v.draw[k], give=v.draw[1-k];
      for(let c=0;c<L;c++) if(v.sheet[me][c]==null){ const t=v.sheet[me].slice(); t[c]=mine; const my=outlook(t,cnt);
        const opp = lvl===0 ? 0 : bestPlace(v.sheet[o],give,cnt).v;
        const val = my - (lvl===2?1:.6)*opp - Math.abs(c-(mine-1))*.01 + (lvl===0?Math.random()*.8:Math.random()*.02);
        if(val>bv){ bv=val; best={k:'keep', i:k, c}; } } }
    return best; }
  if(v.phase==='place'){ const g=v.draw[1-v.keep]; return {k:'place', c:bestPlace(v.sheet[me],g,cnt).c}; }
  return null; }
function aiDelay(v){ return v.phase==='pick' ? 1300+Math.random()*1500 : 900+Math.random()*900; }

/* 화면 */
let selCard=null, sig='';
function runCells(sh){ let best=[0,0], cur=0, st=0, prev=-1; sh.forEach((x,k)=>{ if(x==null){ cur=0; prev=-1; return; } if(prev<0||x>=prev){ if(cur===0) st=k; cur++; } else { cur=1; st=k; } prev=x; if(cur>best[1]) best=[st,cur]; }); return new Set([...Array(best[1])].map((_,k)=>best[0]+k)); }
function render(el,v,ctx){
  const me=ctx.mode==='local'?(v.turn==null?0:v.turn):ctx.me, o=1-me, my=ctx.myTurn;
  const nm=p=>ctx.mode==='local'?(p?'🔵 B':'🔴 A'):p===ctx.me?'나':(ctx.mode==='solo'?'상대':U.esc(ctx.name(p)));
  const sg=v.n+':'+v.phase; if(sg!==sig){ sig=sg; selCard=null; }
  const sheetH=(p,click)=>{ const rc=runCells(v.sheet[p]); return `<div class="as-sheet ${p===me?'me':''}">${v.sheet[p].map((x,c)=>`<button class="as-c ${x==null?'e':''} ${rc.has(c)?'run':''} ${v.last&&v.last.p===p&&v.last.c===c?'rnd':''}" data-c="${c}" data-p="${p}" ${click&&x==null?'':'disabled'}><i>${c+1}</i>${x==null?'':x}</button>`).join('')}</div>`; };
  let h=`<div class="info">${v.n}/10번째 · 남은 카드 ${v.deck}장 · 지금 오름차순 나 <b>${run(v.sheet[me])}</b> : <b>${run(v.sheet[o])}</b> ${nm(o)}</div>`;
  h+=`<div class="ba-row"><div class="ba-lab">${nm(o)} 시트</div>${sheetH(o,false)}</div>`;
  if(v.draw&&v.phase!=='over'){ const pick=v.phase==='pick'&&my, giveV=v.phase==='place'?v.draw[1-v.keep]:null;
    h+=`<div class="ba-draw">${v.draw.map((x,k)=>`<button class="ba-card ${selCard===k?'sel':''} ${v.phase==='place'?(k===v.keep?'kept':'given'):''}" data-k="${k}" ${pick?'':'disabled'}>${x}<small>${v.phase==='place'?(k===v.keep?`${nm(v.drawer)}가 가짐`:`${nm(1-v.drawer)}에게`):''}</small></button>`).join('')}</div>`;
    let line='';
    if(v.phase==='pick') line = my ? (selCard==null?'가질 카드를 고르세요 — 남은 한 장은 상대에게 가요':'이제 내 시트의 빈칸을 누르세요') : `${nm(v.turn)}이(가) 고르는 중…`;
    else if(v.phase==='place') line = my ? `받은 <b>${giveV}</b>을(를) 적을 빈칸을 누르세요` : `${nm(v.turn)}이(가) 받은 카드를 적는 중…`;
    h+=`<div class="py-line">${line}</div>`; }
  else if(v.phase==='over') h+=`<div class="py-line">${v.winner==='draw'?'🤝 무승부':`🏁 ${nm(v.winner)} 생존!`} · ${v.score[me]} : ${v.score[o]}</div>`;
  const canClick = my && ((v.phase==='pick'&&selCard!=null)||v.phase==='place');
  h+=`<div class="ba-row"><div class="ba-lab">내 시트</div>${sheetH(me,canClick)}</div>`;
  h+=`<details class="hl-log"><summary>기록</summary>${v.log.slice(-12).reverse().map(x=>`<div>${U.esc(x).replace(/ A /,' '+nm(0)+' ').replace(/ B /,' '+nm(1)+' ').replace(/^A /,nm(0)+' ').replace(/^B /,nm(1)+' ')}</div>`).join('')}</details>`;
  el.innerHTML=h;
  el.onclick=e=>{ const k=e.target.closest('[data-k]'); if(k&&!k.disabled){ selCard=+k.dataset.k; return ctx.rerender(); }
    const c=e.target.closest('.as-c'); if(c&&!c.disabled&&+c.dataset.p===me){ const cell=+c.dataset.c; if(v.phase==='pick'&&selCard!=null){ const i=selCard; selCard=null; return ctx.act({k:'keep',i,c:cell}); } if(v.phase==='place') return ctx.act({k:'place',c:cell}); } };
}
const guideSteps=[
  {t:'📋 10칸 시트', h:'각자 <b>10칸 시트</b>. 다 채운 뒤 왼쪽부터 <b>같거나 커지며 이어진 가장 긴 칸 수</b>가 점수예요(노란 칸).', demo:s=>{ s.sheet[0]=[1,3,3,6,null,null,8,2,null,null]; s.sheet[1]=[2,null,5,null,7,null,null,null,10,null]; s.n=5; s.phase='deal'; return s; }},
  {t:'🃏 2장 뽑기', h:'번갈아 <b>카드 2장</b>을 뽑아 둘 다 봐요. 뽑은 사람이 <b>한 장을 골라</b> 자기 시트 빈칸에 적어요.', demo:s=>{ s.sheet[0]=[1,null,3,null,null,null,null,null,null,null]; s.sheet[1]=[null,null,4,null,null,null,null,null,null,null]; s.draw=[5,9]; s.phase='pick'; s.turn=0; s.drawer=0; s.n=3; return s; }},
  {t:'🎁 남은 한 장은 상대에게', h:'고르지 않은 카드는 <b>상대가 자기 시트에 적어야</b> 해요. 나한테 좋은 걸 갖고, <b>상대가 곤란한 숫자</b>를 넘기는 게 핵심!', demo:s=>{ s.sheet[0]=[1,null,3,null,5,null,null,null,null,null]; s.sheet[1]=[null,null,4,null,null,null,null,null,null,null]; s.draw=[5,9]; s.keep=0; s.phase='place'; s.turn=0; s.drawer=1; s.n=3; return s; }},
  {t:'🏁 승리', shot:false, h:'10번 반복해 시트가 다 차면 오름차순 칸 수가 많은 쪽이 생존.<div class="gd-tip">큰 숫자는 오른쪽, 작은 숫자는 왼쪽 — 하지만 상대가 이미 9를 써 둔 칸 근처에 맞는 숫자는 절대 넘기지 마세요!</div>'},
];
const guide=`<p><b>1:1 숫자 주고받기</b>. 각자 10칸 시트.</p><ol><li>번갈아 카드 2장을 뽑아 공개.</li><li>뽑은 사람이 한 장을 골라 자기 시트에 적고, 남은 한 장은 상대가 자기 시트에 적어요.</li><li>시트가 다 차면 같거나 커지며 이어진 가장 긴 칸 수가 점수.</li></ol>`;
window.GAMES.battleasc = {
  title:'배틀 오름차순', ref:'피의 게임 「배틀 오름차순」', emoji:'📶', tags:['숫자','주고받기','두뇌서바이벌','데스매치'], local:true,
  tagline:'뽑은 두 장 중 하나는 내 것, 하나는 상대 것. 내 오름차순은 잇고 상대 것은 끊어라.',
  guide, guideSteps, init, apply, mask, ai, aiDelay, render, step, stepDelay,
  reset(){ selCard=null; sig=''; },
  status:(v,ctx)=> v.winner!=null?'': ctx.myTurn?(v.phase==='pick'?'가질 카드와 칸을 고르세요':'받은 카드를 적으세요'):ctx.turnText(v),
  bar:(v,i)=>`<span class="score">📶 ${run(v.sheet[i])}</span>`,
  pulse:v=>run(v.sheet[1])-run(v.sheet[0]), pulseStep:2,
};
})();
