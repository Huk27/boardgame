(function(){
'use strict';
/* 미스터리 넘버 (피의 게임 시즌 2 · 5일차 데스매치). 1~10 블록 4세트(40개). 각자 5개를 받아 내 앞에 둠 — 내 블록은 나만 봄.
   차례: ① 상대 앞 블록의 숫자 하나를 부르기 — 있으면 그 숫자 블록 수만큼 점수, 그 블록은 치우고 딜러가 새 블록으로 채움, 계속 부를 수 있음(틀리면 차례 끝)
         ② 또는 상대 앞에 딜러 블록 하나 추가(차례 끝).
   딜러 블록이 바닥나면 각자 앞에 남은 블록 숫자의 합을 공개. 상대 블록을 마지막 하나까지 다 맞히면 +2점, 그때 게임 끝. 점수가 높은 쪽 생존.
   핵심은 기억 — 지금까지 나온 숫자(숫자마다 4개뿐)를 세면 남은 게 보임. */
const START=5, CAP=200;
function init(starter){
  const pool=[]; for(let n=1;n<=10;n++) for(let k=0;k<4;k++) pool.push(n); U.shuffle(pool);
  return {pool, blocks:[pool.splice(0,START), pool.splice(0,START)], score:[0,0], turn:starter, starter, winner:null, out:[], sumShown:null, excl:[[],[]], chain:0, last:null, log:[], turns:0, hist:[]};
}
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(s.turn!==p) return '상대 차례예요';
  if(!a) return '알 수 없는 동작';
  const o=1-p;
  if(a.k==='add'){ if(s.chain>0) return '맞힌 뒤에는 계속 부르거나 멈추기만 할 수 있어요'; if(!s.pool.length) return '딜러 블록이 다 떨어졌어요';
    s.blocks[o].push(s.pool.pop()); s.excl[o]=[]; s.log.push(`${p?'B':'A'} ➕ 상대 앞에 블록 추가 (상대 ${s.blocks[o].length}개)`); s.hist.push({p,k:'add'}); s.last={p,k:'add'}; endTurn(s,p); return null; }
  if(a.k==='stop'){ if(s.chain<=0) return '멈출 게 없어요'; s.log.push(`${p?'B':'A'} ✋ 여기까지`); s.last={p,k:'stop'}; endTurn(s,p); return null; }
  if(a.k==='guess'){ const n=a.n|0; if(n<1||n>10) return '1~10 중에서 부르세요';
    const hit=s.blocks[o].filter(x=>x===n).length;
    if(!hit){ if(!s.excl[o].includes(n)) s.excl[o].push(n); s.log.push(`${p?'B':'A'} "${n}!" → ❌ 없음`); s.hist.push({p,k:'miss',n}); s.last={p,k:'miss',n}; endTurn(s,p); return null; }
    s.blocks[o]=s.blocks[o].filter(x=>x!==n); s.score[p]+=hit; if(s.sumLeft) s.sumLeft[o]-=n*hit; for(let i=0;i<hit;i++) s.out.push(n);
    let refill=0; for(let i=0;i<hit&&s.pool.length;i++){ s.blocks[o].push(s.pool.pop()); refill++; }
    if(refill) s.excl[o]=[]; else if(!s.excl[o].includes(n)) s.excl[o].push(n);   // 새 블록이 들어오면 '없는 숫자' 기록은 초기화
    s.log.push(`${p?'B':'A'} "${n}!" → ⭕ ${hit}개 (+${hit})${refill?` · 새 블록 ${refill}개`:''}`); s.hist.push({p,k:'hit',n,c:hit}); s.last={p,k:'hit',n,c:hit}; s.chain++;
    checkSum(s);
    if(!s.blocks[o].length){ s.score[p]+=2; s.log.push(`🎯 ${p?'B':'A'} 상대 블록을 모두 맞힘! +2`); return end(s); }
    return null; }
  return '알 수 없는 동작';
}
function checkSum(s){ if(!s.pool.length&&!s.sumShown){ s.sumShown=[s.blocks[0].reduce((a,b)=>a+b,0), s.blocks[1].reduce((a,b)=>a+b,0)]; s.sumLeft=s.sumShown.slice(); s.log.push(`📢 딜러 블록 소진 — 남은 블록 합 공개: A ${s.sumShown[0]} · B ${s.sumShown[1]}`); } }
function endTurn(s,p){ s.chain=0; s.turns++; checkSum(s); if(s.turns>=CAP) return end(s); s.turn=1-p; }
function end(s){ s.turn=null; s.winner = s.score[0]>s.score[1]?0 : s.score[1]>s.score[0]?1 : 'draw'; s.log.push(`🏁 ${s.score[0]} : ${s.score[1]}`); return null; }
function mask(s,p){ const v=U.clone(s), o=1-p; v.pool=s.pool.length; if(s.winner==null) v.blocks[o]=s.blocks[o].map(()=>null);
  // 합 공개 뒤에도 그 합은 "공개 시점"의 값 — 그대로 둠
  return v; }

/* 컴퓨터: 내가 아는 것(내 블록 + 지금까지 나온 숫자)으로 남은 숫자 분포를 세서, 상대 블록에 있을 확률이 높은 숫자를 부름 */
function unknownCounts(v,me,forget){ const c=Array(11).fill(4); c[0]=0;
  for(const x of v.blocks[me]) c[x]--; for(const x of v.out) if(!forget||Math.random()>forget) c[x]--;
  for(let n=1;n<=10;n++) c[n]=Math.max(0,c[n]); return c; }
function hitProb(c,n,m){ // 남은 미지 블록 T개 중 상대가 m개 → n이 하나라도 있을 확률
  const T=c.reduce((a,b)=>a+b,0); if(T<=0||m<=0) return 0; let q=1; for(let i=0;i<m;i++){ q*= (T-c[n]-i)/(T-i); if(q<=0) break; } return 1-Math.max(0,q); }
function ai(v,lvl=1){
  const me=v.turn; if(me==null) return null; const o=1-me, m=v.blocks[o].length;
  const c=unknownCounts(v,me, lvl===0?.35: lvl===1?.08:0);
  if(lvl>0||Math.random()<.5) for(const n of (v.excl[o]||[])) c[n]=0;   // 방금 틀린 숫자는 상대 블록에 없음(블록이 바뀌기 전까지)
  // 이번 차례에 이미 부른(틀린 건 차례가 끝나니) 숫자는 상대 블록에서 빠짐 → 맞힌 숫자는 다시 나올 수도(새 블록)
  // 합이 공개됐고 어려움이면: 상대 블록이 정확히 1개 남았을 때 합 = 그 숫자
  // 합이 공개된 뒤: 상대 블록 m개의 합을 알면 가능한 조합만 남겨 확률을 정확히 셈(보통은 1개 남았을 때만)
  if(v.sumLeft&&(lvl===2&&m<=4||m===1)){ const S=v.sumLeft[o], cnt=Array(11).fill(0); let tot=0;
    (function rec(k,from,sum,mult,picked){ if(k===m){ if(sum===S){ tot+=mult; for(const x of new Set(picked)) cnt[x]+=mult; } return; }
      for(let n=from;n<=10;n++){ const used=picked.filter(x=>x===n).length; if(c[n]-used<=0) continue; if(sum+n*(m-k)>S+ (10-n)*0 && sum+n>S) break; rec(k+1,n,sum+n,mult*(c[n]-used),picked.concat([n])); } })(0,1,0,1,[]);
    if(tot>0){ let bn=1,bv=-1; for(let n=1;n<=10;n++) if(cnt[n]/tot>bv){ bv=cnt[n]/tot; bn=n; } if(bv>.3||v.chain===0) return {k:'guess', n:bn}; } }
  let best=1, bp=-1; for(let n=1;n<=10;n++){ const p=hitProb(c,n,m)+(lvl===0?Math.random()*.3:Math.random()*.01); if(p>bp){ bp=p; best=n; } }
  // 상대 블록이 적고 확률이 낮으면 블록을 늘려 다음 기회를 키우기(맞힌 직후엔 그만두기 선택)
  if(v.chain>0){ if(bp<[.25,.32,.28][lvl]) return {k:'stop'}; return {k:'guess', n:best}; }
  if(v.pool>0 && bp<[.2,.35,.4][lvl] && m<=3) return {k:'add'};
  return {k:'guess', n:best};
}
function aiDelay(v){ return 900+Math.random()*1300 + (v.chain>0?300:0); }

/* 화면 */
function render(el,v,ctx){
  const me=ctx.mode==='local'?(v.turn==null?0:v.turn):ctx.me, o=1-me, my=ctx.myTurn;
  const nm=p=>ctx.mode==='local'?(p?'🔵 B':'🔴 A'):p===ctx.me?'나':(ctx.mode==='solo'?'상대':U.esc(ctx.name(p)));
  const blk=(x,cls='')=>`<span class="mn-b ${cls}">${x==null?'?':x}</span>`;
  let h=`<div class="info">점수 ${nm(0)} <b>${v.score[0]}</b> : <b>${v.score[1]}</b> ${nm(1)} · 딜러 블록 ${v.pool}개${v.sumShown?` · 📢 남은 블록 합 공개: ${nm(0)} ${v.sumShown[0]} · ${nm(1)} ${v.sumShown[1]}`:''}</div>`;
  h+=`<div class="mn-side"><div class="mn-h">${nm(o)} 앞 블록 (${v.blocks[o].length}개)</div><div class="mn-row">${v.blocks[o].map(x=>blk(x,x==null?'back':'')).join('')}</div></div>`;
  let line='&nbsp;'; const L=v.last;
  if(v.winner!=null) line = v.winner==='draw'?'🤝 무승부':`🏁 ${nm(v.winner)} 생존!`;
  else if(L) line = L.k==='hit'?`${nm(L.p)}: "${L.n}!" → ⭕ ${L.c}개`: L.k==='miss'?`${nm(L.p)}: "${L.n}!" → ❌`: L.k==='add'?`${nm(L.p)}: 상대 앞에 블록 추가`:`${nm(L.p)}: 여기까지`;
  h+=`<div class="py-line">${line}</div>`;
  if(my&&v.winner==null){ h+=`<div class="vr-card"><b>${v.chain>0?'⭕ 맞혔어요! 계속 부를까요?':'🔢 상대 블록 숫자를 부르세요'}</b><div class="mn-pad">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<button data-n="${n}" class="${(v.excl[o]||[]).includes(n)?'no':''}">${n}</button>`).join('')}</div>${(v.excl[o]||[]).length?`<small>흐린 숫자: 상대 블록이 바뀐 뒤 이미 "없음"이 확인된 숫자</small>`:''}
    <div class="fh-act">${v.chain>0?'<button class="ghost" data-a="stop">✋ 여기까지</button>':v.pool?'<button class="ghost" data-a="add">➕ 상대 앞에 블록 추가</button>':''}</div></div>`; }
  h+=`<div class="mn-side me"><div class="mn-h">내 앞 블록 (${v.blocks[me].length}개) — 상대는 못 봐요</div><div class="mn-row">${v.blocks[me].map(x=>blk(x,'mine')).join('')}</div></div>`;
  // 나온 숫자 기록 (순서대로 — 숫자별로 세는 건 직접!)
  h+=`<div class="mn-out"><div class="mn-h">지금까지 나온 숫자 (순서대로) — 숫자마다 4개뿐이에요</div><div class="mn-row">${v.out.map(x=>`<span class="mn-o">${x}</span>`).join('')||'<small>아직 없음</small>'}</div></div>`;
  h+=`<details class="hl-log" open><summary>기록</summary>${v.log.slice(-14).reverse().map(x=>`<div>${U.esc(x).replace(/^A\b/,nm(0)).replace(/^B\b/,nm(1)).replace(/A (\d+) · B (\d+)/,`${nm(0)} $1 · ${nm(1)} $2`)}</div>`).join('')}</details>`;
  el.innerHTML=h;
  el.onclick=e=>{ const n=e.target.closest('[data-n]'); if(n) return ctx.act({k:'guess', n:+n.dataset.n}); const a=e.target.closest('[data-a]'); if(a) return ctx.act({k:a.dataset.a}); };
}
const guide=`
<p><b>기억력 숫자 맞히기</b>. 1~10 블록 4세트(40개). 각자 <b>5개</b>를 받아 내 앞에 둬요 — 내 블록은 나만 봐요.</p>
<ol><li>내 차례: <b>상대 블록의 숫자</b>를 하나 불러요. 있으면 <b>그 숫자 블록 수만큼 점수</b>! 그 블록은 치우고 딜러가 새 블록으로 채워요. 맞히면 <b>계속 부를 수 있고</b>, 틀리면 차례 끝(벌점 없음).</li>
<li>또는 부르지 않고 <b>상대 앞에 블록 하나 추가</b> — 상대 블록이 많을수록 다음에 맞히기 쉬워져요.</li>
<li>딜러 블록이 바닥나면 각자 앞에 <b>남은 블록 합</b>을 공개해요.</li>
<li>상대 블록을 <b>마지막 하나까지 다 맞히면 +2점</b>, 그 자리에서 끝. 점수가 높은 쪽 생존.</li></ol>
<div class="tipbox">💡 숫자마다 4개뿐! 내 블록과 지금까지 나온 숫자를 세면 남은 숫자가 보여요 — 원작에서도 승부는 암기였어요(손가락으로 세기, 숫자 짝 외우기…).</div>`;
window.GAMES.mysterynum = {
  title:'미스터리 넘버', ref:'피의 게임 「미스터리 넘버」', emoji:'🔢', tags:['기억력','숫자','두뇌서바이벌','데스매치'],
  tagline:'숫자마다 4개뿐인 블록 40개. 나온 숫자를 기억해 상대 블록을 맞혀라.',
  guide, init, apply, mask, ai, aiDelay, render,
  status:(v,ctx)=> v.winner!=null?'': ctx.myTurn?(v.chain>0?'계속 부르거나 멈추세요':'숫자를 부르거나 블록을 추가하세요'):ctx.turnText(v),
  bar:(v,i)=>`<span class="score">🔢 ${v.score[i]}</span>`,
  pulse:v=>v.score[1]-v.score[0], pulseStep:2,
};
})();
