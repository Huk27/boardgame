(function(){
'use strict';
/* 미로 코드 (피의 게임 시즌 2 · 6일차 데스매치). 미로 평면도(좌표) + 미로 속 한 지점에서 본 1인칭 장면 → 그 지점의 좌표를 먼저 맞히기.
   평면도 2장 × 3문제 = 6문제. 아무 칸이나 먼저 누르면 답 제출: 맞히면 +1, 틀리면 상대에게 10초 동안 답할 기회. 문제당 60초.
   장면은 미로에서 단 한 곳(칸·바라보는 방향)에서만 그렇게 보이도록 골라 냄. 점수가 높은 쪽 생존(같으면 연장 문제, 최대 3개). */
const S=7, Q=6, QMS=60000, SECOND=10000, DEPTH=4;
const DR=[-1,0,1,0], DC=[0,1,0,-1], BIT=[1,2,4,8], OPPB=[4,8,1,2];
const COLS='ABCDEFG';
const coord=(r,c)=>COLS[c]+(r+1);
function makeMaze(){ const w=Array(S*S).fill(15), seen=new Set();
  (function dfs(i){ seen.add(i); const r=i/S|0, c=i%S; for(const d of U.shuffle([0,1,2,3])){ const nr=r+DR[d], nc=c+DC[d]; if(nr<0||nr>=S||nc<0||nc>=S) continue; const j=nr*S+nc; if(seen.has(j)) continue; w[i]&=~BIT[d]; w[j]&=~OPPB[d]; dfs(j); } })(0);
  for(let k=0;k<7;k++){ const i=Math.random()*S*S|0, d=Math.random()*4|0, r=i/S|0, c=i%S, nr=r+DR[d], nc=c+DC[d]; if(nr<0||nr>=S||nc<0||nc>=S) continue; w[i]&=~BIT[d]; w[nr*S+nc]&=~OPPB[d]; }
  return w; }
function view(w,r,c,d){ const seq=[]; for(let k=0;k<DEPTH;k++){ const x=w[r*S+c], L=!!(x&BIT[(d+3)%4]), R=!!(x&BIT[(d+1)%4]), F=!!(x&BIT[d]); seq.push([L,R,F]); if(F) break; r+=DR[d]; c+=DC[d]; } return seq; }
const sig=v=>v.map(x=>x.map(b=>b?1:0).join('')).join('|');
function pickProblems(w,n){ const cnt={}, all=[]; for(let r=0;r<S;r++) for(let c=0;c<S;c++) for(let d=0;d<4;d++){ const v=view(w,r,c,d), g=sig(v); cnt[g]=(cnt[g]||0)+1; all.push({r,c,d,v,g}); }
  const ok=U.shuffle(all.filter(x=>cnt[x.g]===1 && x.v.length>=2)); const out=[]; for(const x of ok){ if(out.some(y=>y.r===x.r&&y.c===x.c)) continue; out.push(x); if(out.length>=n) break; } return out; }
function makeSet(){ for(let t=0;t<50;t++){ const w=makeMaze(), pr=pickProblems(w,3+3); if(pr.length>=6) return {w, pr}; } const w=makeMaze(); return {w, pr:pickProblems(w,6)}; }
function init(starter){
  const A=makeSet(), B=makeSet();
  const probs=[...A.pr.slice(0,3).map(p=>({...p,m:0})), ...B.pr.slice(0,3).map(p=>({...p,m:1})), ...A.pr.slice(3,6).map(p=>({...p,m:0}))];   // 뒤 3개는 연장용
  return {maps:[A.w,B.w], probs, qi:-1, score:[0,0], phase:'intro', turn:null, starter, winner:null, log:[], tries:[], qEnd:0, secEnd:0, firstWrong:null, res:null, ev:0};
}
function startQ(s){ s.qi++; s.phase='q'; s.turn=null; s.tries=[]; s.firstWrong=null; s.res=null; s.qEnd=Date.now()+QMS; s.ev++;
  s.log.push(`— ${s.qi+1}번 문제 (평면도 ${s.probs[s.qi].m?'B':'A'}) —`); }
function reveal(s,who,ok){ s.phase='reveal'; s.turn=null; s.res={who,ok}; s.ev++; }
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(!a||a.k!=='ans') return '알 수 없는 동작';
  const r=a.r|0, c=a.c|0; if(!(r>=0&&r<S&&c>=0&&c<S)) return '칸을 고르세요';
  const P=s.probs[s.qi];
  if(s.phase==='q'){ if(s.tries.some(t=>t.p===p)) return '이미 답했어요';
    const ok=r===P.r&&c===P.c; s.tries.push({p,r,c,ok}); s.log.push(`${p?'B':'A'} "${coord(r,c)}!" ${ok?'⭕ +1':'❌'}`);
    if(ok){ s.score[p]++; reveal(s,p,true); return null; }
    s.firstWrong=p; s.phase='second'; s.turn=1-p; s.secEnd=Date.now()+SECOND; s.ev++; return null; }
  if(s.phase==='second'){ if(p!==s.turn) return '상대가 답할 차례예요 (10초)';
    const ok=r===P.r&&c===P.c; s.tries.push({p,r,c,ok}); s.log.push(`${p?'B':'A'} (10초 기회) "${coord(r,c)}!" ${ok?'⭕ +1':'❌'}`);
    if(ok) s.score[p]++; reveal(s,ok?p:null,ok); return null; }
  return '지금은 답할 때가 아니에요';
}
function stepDelay(s){ if(s.winner!=null) return null;
  if(s.phase==='intro') return 2200;
  if(s.phase==='q') return Math.max(0,s.qEnd-Date.now());
  if(s.phase==='second') return Math.max(0,s.secEnd-Date.now());
  if(s.phase==='reveal') return 3200;
  return null; }
function step(s){
  if(s.phase==='intro'){ startQ(s); return; }
  if(s.phase==='q'&&Date.now()>=s.qEnd){ s.log.push('⏰ 시간 초과 — 아무도 못 맞힘'); reveal(s,null,false); return; }
  if(s.phase==='second'&&Date.now()>=s.secEnd){ s.log.push(`⏰ ${s.turn?'B':'A'} 10초 초과`); reveal(s,null,false); return; }
  if(s.phase==='reveal'){ const done=s.qi+1;
    if(done>=Q && (s.score[0]!==s.score[1] || done>=s.probs.length)){ s.phase='over'; s.winner = s.score[0]>s.score[1]?0 : s.score[1]>s.score[0]?1 : 'draw'; s.log.push(`🏁 ${s.score[0]} : ${s.score[1]}`); s.ev++; return; }
    if(done>=Q) s.log.push('⚖️ 동점 — 연장 문제!');
    startQ(s); }
}
function mask(s){ const v=U.clone(s); v.probs=s.probs.map((P,k)=> k===s.qi&&s.phase==='reveal'||k<s.qi||s.phase==='over' ? P : {v:P.v, m:P.m, d:null, r:null, c:null});
  v.qLeft=s.phase==='q'?Math.max(0,s.qEnd-Date.now()):0; v.secLeft=s.phase==='second'?Math.max(0,s.secEnd-Date.now()):0; return v; }

/* 컴퓨터: 장면과 맞는 칸을 직접 찾되 "찾는 데 걸리는 시간"과 실수를 흉내 */
const MEM={};
function solveCands(w,v){ const g=sig(v), out=[]; for(let r=0;r<S;r++) for(let c=0;c<S;c++) for(let d=0;d<4;d++) if(sig(view(w,r,c,d))===g) out.push({r,c}); return out; }
function nearMiss(w,v){ // 장면 일부(앞 두 칸)만 맞는 칸 — 사람다운 착각
  const g=sig(v.slice(0,2)), out=[]; for(let r=0;r<S;r++) for(let c=0;c<S;c++) for(let d=0;d<4;d++){ const x=view(w,r,c,d); if(sig(x.slice(0,2))===g) out.push({r,c}); } return out; }
function ai(v,lvl=1){ const me=1, P=v.probs[v.qi]; if(!P) return null; const w=v.maps[P.m];
  const key=v.qi, m=MEM[key]=MEM[key]||{};
  if(v.phase==='q'){ if(v.tries.some(t=>t.p===me)) return null;
    if(!m.ready){ const base=[42000,27000,17000][lvl]*(1+(P.v.length<=2?.3:0)); m.ready=Date.now()+base*(.5+Math.random()); m.wrong=Math.random()<[.3,.12,.05][lvl]; }
    if(Date.now()<m.ready) return null;
    const right=solveCands(w,P.v)[0], miss=nearMiss(w,P.v).filter(x=>!(x.r===right.r&&x.c===right.c));
    const pick = m.wrong&&miss.length ? U.pick(miss) : right; return {k:'ans', r:pick.r, c:pick.c}; }
  if(v.phase==='second'&&v.turn===me){ if(!m.sec){ m.sec=Date.now()+[7000,5000,3200][lvl]*(.6+Math.random()*.7); m.secOk=Math.random()<[.55,.8,.92][lvl]; }
    if(Date.now()<m.sec) return null; const right=solveCands(w,P.v)[0], wrongT=v.tries[0];
    let pick=right; if(!m.secOk){ const miss=nearMiss(w,P.v).filter(x=>!(x.r===right.r&&x.c===right.c)&&!(wrongT&&x.r===wrongT.r&&x.c===wrongT.c)); if(miss.length) pick=U.pick(miss); }
    return {k:'ans', r:pick.r, c:pick.c}; }
  return null; }
function aiDelay(v){ return 400; }

/* 화면 */
const W=300, H=210, SC=[1,.64,.4,.25,.15];
function sceneSVG(v){ const R=k=>{ const s=SC[k]; return {l:W/2-s*W/2, r:W/2+s*W/2, t:H/2-s*H/2, b:H/2+s*H/2}; };
  let g=`<rect width="${W}" height="${H/2}" fill="#2e3a2a"/><rect y="${H/2}" width="${W}" height="${H/2}" fill="#6b5a3a"/>`;
  let k=0; for(;k<v.length;k++){ const a=R(k), b=R(k+1), [L,Rt,F]=v[k];
    if(L) g+=`<polygon points="${a.l},${a.t} ${b.l},${b.t} ${b.l},${b.b} ${a.l},${a.b}" fill="#7d9a5a" stroke="#3c5228"/>`;
    else g+=`<rect x="${a.l}" y="${b.t}" width="${b.l-a.l}" height="${b.b-b.t}" fill="#4f6b3a" stroke="#3c5228"/>`;
    if(Rt) g+=`<polygon points="${a.r},${a.t} ${b.r},${b.t} ${b.r},${b.b} ${a.r},${a.b}" fill="#7d9a5a" stroke="#3c5228"/>`;
    else g+=`<rect x="${b.r}" y="${b.t}" width="${a.r-b.r}" height="${b.b-b.t}" fill="#4f6b3a" stroke="#3c5228"/>`;
    if(F){ g+=`<rect x="${b.l}" y="${b.t}" width="${b.r-b.l}" height="${b.b-b.t}" fill="#93b06c" stroke="#3c5228"/>`; break; } }
  if(k>=v.length&&!v[v.length-1][2]){ const z=R(v.length); g+=`<rect x="${z.l}" y="${z.t}" width="${z.r-z.l}" height="${z.b-z.t}" fill="#111a10" opacity=".85"/>`; }
  return `<svg viewBox="0 0 ${W} ${H}" class="mc-scene">${g}<text x="${W/2}" y="${H-8}" text-anchor="middle" fill="#fff" font-size="13">❓ 여기는 어디일까요?</text></svg>`; }
function mapSVG(w,ctx,v,clickable,P){ const cs=36, pad=20, Wd=pad+S*cs+4; let g='';
  for(let c=0;c<S;c++) g+=`<text x="${pad+c*cs+cs/2}" y="14" text-anchor="middle" font-size="12" fill="#777">${COLS[c]}</text>`;
  for(let r=0;r<S;r++) g+=`<text x="9" y="${pad+r*cs+cs/2+4}" text-anchor="middle" font-size="12" fill="#777">${r+1}</text>`;
  for(let r=0;r<S;r++) for(let c=0;c<S;c++){ const x=pad+c*cs, y=pad+r*cs, i=r*S+c;
    const t=v.tries.find(t=>t.r===r&&t.c===c);
    const ans=P&&P.r===r&&P.c===c;
    g+=`<rect x="${x}" y="${y}" width="${cs}" height="${cs}" fill="${ans?'#ffe08a':t?(t.ok?'#c8f0d0':'#f6c7c0'):'#f6efd9'}" class="${clickable?'mc-cl':''}" data-r="${r}" data-c="${c}"/>`;
    if(ans&&P.d!=null){ const ax=x+cs/2, ay=y+cs/2, dx=DC[P.d]*11, dy=DR[P.d]*11; g+=`<line x1="${ax-dx}" y1="${ay-dy}" x2="${ax+dx}" y2="${ay+dy}" stroke="#d0342c" stroke-width="3"/><circle cx="${ax+dx}" cy="${ay+dy}" r="4" fill="#d0342c"/>`; }
    if(t) g+=`<text x="${x+cs/2}" y="${y+cs/2+5}" text-anchor="middle" font-size="14">${t.ok?'⭕':'❌'}</text>`;
    const W2=w[i], st='stroke="#3b2f1e" stroke-width="3" stroke-linecap="round"';
    if(W2&1) g+=`<line x1="${x}" y1="${y}" x2="${x+cs}" y2="${y}" ${st}/>`; if(W2&8) g+=`<line x1="${x}" y1="${y}" x2="${x}" y2="${y+cs}" ${st}/>`;
    if(r===S-1&&W2&4) g+=`<line x1="${x}" y1="${y+cs}" x2="${x+cs}" y2="${y+cs}" ${st}/>`; if(c===S-1&&W2&2) g+=`<line x1="${x+cs}" y1="${y}" x2="${x+cs}" y2="${y+cs}" ${st}/>`; }
  return `<svg viewBox="0 0 ${Wd} ${Wd}" class="mc-map">${g}</svg>`; }
let tick=null;
function render(el,v,ctx){
  const me=ctx.me, o=1-me, nm=p=>p===me?'나':(ctx.mode==='solo'?'상대':U.esc(ctx.name(p)));
  clearInterval(tick); tick=null;
  const P=v.probs[v.qi];
  let h=`<div class="info">${v.qi<0?'준비':`${v.qi+1}번 문제${v.qi>=Q?' (연장)':''} / ${Q}`} · 평면도 ${P?(P.m?'B':'A'):'-'} · 점수 나 <b>${v.score[me]}</b> : <b>${v.score[o]}</b> ${nm(o)}</div>`;
  if(P){ const can = (v.phase==='q'&&!v.tries.some(t=>t.p===me)) || (v.phase==='second'&&v.turn===me);
    let line='&nbsp;';
    if(v.phase==='q') line = v.tries.some(t=>t.p===me) ? '답을 냈어요…' : `평면도에서 이 장면이 보이는 칸을 찾아 누르세요 · ⏱️ <b id="mcT">${Math.ceil(v.qLeft/1000)}</b>초`;
    else if(v.phase==='second') line = v.turn===me ? `상대가 틀렸어요! <b>10초</b> 안에 답하세요 · ⏱️ <b id="mcT">${Math.ceil(v.secLeft/1000)}</b>` : `${nm(v.turn)}에게 10초 기회 · ⏱️ <b id="mcT">${Math.ceil(v.secLeft/1000)}</b>`;
    else if(v.phase==='reveal'&&v.res) line = v.res.ok ? `⭕ ${nm(v.res.who)} 정답! ${coord(P.r,P.c)} (빨간 화살표 = 보던 방향)` : `정답은 ${coord(P.r,P.c)} — 아무도 못 맞혔어요`;
    else if(v.phase==='over') line = v.winner==='draw'?'🤝 무승부':`🏁 ${nm(v.winner)} 생존!`;
    h+=`<div class="py-line">${line}</div>`;
    h+=`<div class="mc-wrap">${sceneSVG(P.v)}${mapSVG(v.maps[P.m],ctx,v,can,v.phase==='reveal'||v.phase==='over'?P:null)}</div>`;
    const tl=v.phase==='q'?v.qLeft:v.phase==='second'?v.secLeft:0; if(tl){ const t0=performance.now(); tick=setInterval(()=>{ const e=document.getElementById('mcT'); if(!e||!e.isConnected){ clearInterval(tick); return; } e.textContent=Math.max(0,Math.ceil((tl-(performance.now()-t0))/1000)); },250); }
  }
  h+=`<details class="hl-log"><summary>기록</summary>${v.log.slice(-14).reverse().map(x=>`<div>${U.esc(x).replace(/^A\b/,nm(0)).replace(/^B\b/,nm(1))}</div>`).join('')}</details>`;
  el.innerHTML=h;
  el.onclick=e=>{ const c=e.target.closest('.mc-cl'); if(c) return ctx.act({k:'ans', r:+c.dataset.r, c:+c.dataset.c}); };
}
const guide=`
<p><b>미로 속 장면으로 좌표 찾기</b> — 1:1 빨리 맞히기, 평면도 2장 × 3문제.</p>
<ol><li>왼쪽은 미로 안 어느 칸에서 <b>한 방향을 바라본 장면</b>(벽·옆길·앞이 막혔는지, 최대 ${DEPTH}칸 앞까지). 오른쪽은 <b>평면도</b>(A~G, 1~7).</li>
<li>그 장면이 보이는 칸을 찾아 <b>먼저 누르면</b> 답 제출 — 맞히면 <b>+1</b>.</li>
<li>틀리면 상대에게 <b>10초</b> 동안 답할 기회. 문제당 60초.</li></ol>
<p>장면은 미로에서 <b>딱 한 곳</b>에서만 그렇게 보이도록 골라 냈어요. 점수가 높은 쪽 생존(같으면 연장).</p>
<div class="tipbox">💡 막다른 길·ㄱ자·세 갈래 같은 특징부터 찾고, 몇 칸 앞에서 막히는지로 좁히세요. 바라보는 방향은 네 가지 다 따져 봐야 해요!</div>`;
window.GAMES.mazecode = {
  title:'미로 코드', ref:'피의 게임 「미로 코드」', emoji:'🧭', tags:['공간지각','순발력','두뇌서바이벌','데스매치'],
  tagline:'미로 속 한 장면, 평면도 위 어느 칸일까? 먼저 맞히면 1점, 틀리면 상대에게 10초.',
  guide, init, apply, mask, ai, aiDelay, render, step, stepDelay,
  reset(){ for(const k in MEM) delete MEM[k]; clearInterval(tick); tick=null; },
  status:(v,ctx)=> v.winner!=null?'': v.phase==='q'?'장면이 보이는 칸을 찾으세요': v.phase==='second'?(v.turn===ctx.me?'10초 안에 답하세요!':'상대의 10초…'):'',
  bar:(v,i)=>`<span class="score">🧭 ${v.score[i]}</span>`,
  pulse:v=>v.score[1]-v.score[0], pulseStep:1,
  _view:view, _sig:sig, _cands:solveCands, _make:makeSet,
};
})();
