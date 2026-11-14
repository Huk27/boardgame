(function(){
'use strict';
/* 숫자야구: 서로 다른 숫자 3개를 숨기고 번갈아 추리. 자리·숫자 맞으면 S, 숫자만 맞으면 B. */
const valid=v=>typeof v==='string'&&/^\d{3}$/.test(v)&&new Set(v).size===3;
function judge(sec,g){ let s=0,b=0; for(let i=0;i<3;i++){ if(g[i]===sec[i]) s++; else if(sec.includes(g[i])) b++; } return {s,b}; }
let perms=null;
function allPerms(){ if(!perms){ perms=[]; for(let a=0;a<10;a++) for(let b=0;b<10;b++) for(let c=0;c<10;c++) if(a!==b&&b!==c&&a!==c) perms.push(`${a}${b}${c}`); } return perms; }
function init(starter){ return {secrets:[null,null], phase:'setup', guesses:[[],[]], turn:null, first:starter, winner:null, starter}; }
const hit=(s,i)=>s.guesses[i].some(x=>x.s===3);
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(!a) return '알 수 없는 동작';
  if(a.k==='secret'){
    if(s.phase!=='setup') return '이미 시작했어요';
    if(!valid(a.v)) return '서로 다른 숫자 3개를 넣으세요';
    if(s.secrets[p]) return '이미 정했어요';
    s.secrets[p]=a.v;
    if(s.secrets[0]&&s.secrets[1]){ s.phase='play'; s.turn=s.first; }
    return null;
  }
  if(a.k==='guess'){
    if(s.phase!=='play') return '아직 준비 중이에요';
    if(s.turn!==p) return '상대 차례예요';
    if(!valid(a.v)) return '서로 다른 숫자 3개를 넣으세요';
    const o=1-p; s.guesses[p].push({g:a.v,...judge(s.secrets[o],a.v)});
    // 먼저 시작한 쪽이 맞혀도 상대에게 같은 횟수의 기회를 줌
    if(s.guesses[0].length===s.guesses[1].length && (hit(s,0)||hit(s,1))){
      s.winner = hit(s,0)&&hit(s,1) ? 'draw' : hit(s,0) ? 0 : 1;
      s.turn=null; s.phase='over'; return null;
    }
    s.turn=o; return null;
  }
  return '알 수 없는 동작';
}
function mask(s,p){
  const v=U.clone(s);
  if(s.winner==null) v.secrets[1-p] = s.secrets[1-p] ? 'set' : null;
  return v;
}

let buf='', memo={}, C=null, V=null, phaseSig='';
const sbText=r=> r.s===0&&r.b===0 ? 'OUT' : `${r.s?r.s+'S ':''}${r.b?r.b+'B':''}`.trim();
function render(el,v,ctx){
  V=v; C=ctx;
  const me=ctx.me, o=1-me;
  if(phaseSig!==v.phase){ phaseSig=v.phase; buf=''; if(v.phase==='setup') memo={}; }
  const inputOn = ctx.can && ((v.phase==='setup'&&!v.secrets[me]) || (v.phase==='play'&&v.turn===me));
  let h='';
  if(v.phase==='setup'){
    h+=`<div class="info">${v.secrets[me]?`내 숫자 <b>${v.secrets[me]}</b> · `:''}상대: ${v.secrets[o]?'<b>준비 완료</b>':'정하는 중…'}</div>`;
  } else {
    h+=`<div class="info">내 숫자 <b style="letter-spacing:3px">${v.secrets[me]}</b>${v.winner!=null?` · 상대 숫자 <b style="letter-spacing:3px">${v.secrets[o]}</b>`:''}</div>`;
    const col=(title,arr)=>`<div class="bb-col"><h4>${title}</h4>${arr.map((x,i)=>`<div class="bb-row"><span>${i+1}</span><b>${x.g}</b><span class="${x.s===3?'hit':''}">${sbText(x)}</span></div>`).join('')||'<div class="muted" style="font-size:13px">아직 없음</div>'}</div>`;
    h+=`<div class="bb-cols">${col('내 추리',v.guesses[me])}${col(U.esc(ctx.name(o))+'의 추리',v.guesses[o])}</div>`;
  }
  if(inputOn){
    h+=`<div class="bb-buf">${[0,1,2].map(i=>`<span>${buf[i]??''}</span>`).join('')}</div>`;
    h+=`<div class="keypad">${[1,2,3,4,5,6,7,8,9,0].map(d=>`<button data-d="${d}" ${buf.includes(String(d))||buf.length>=3?'disabled':''}>${d}</button>`).join('')}
      <button class="ghost" data-k="del" style="grid-column:span 2">지우기</button><button data-k="ok" style="grid-column:span 3" ${buf.length===3?'':'disabled'}>${v.phase==='setup'?'이 숫자로 정하기':'추리하기'}</button></div>`;
  }
  if(v.phase!=='setup'){
    h+=`<div class="memo">메모 ${[0,1,2,3,4,5,6,7,8,9].map(d=>`<button data-m="${d}" class="${memo[d]||''}">${d}</button>`).join('')}</div>`;
  }
  el.innerHTML=h;
  el.onclick=e=>{
    const b=e.target.closest('button'); if(!b||b.disabled) return;
    if(b.dataset.d!=null) press(b.dataset.d);
    else if(b.dataset.k==='del') press('del');
    else if(b.dataset.k==='ok') press('ok');
    else if(b.dataset.m!=null){ const d=b.dataset.m; memo[d] = !memo[d] ? 'out' : memo[d]==='out' ? 'in' : ''; ctx.rerender(); }
  };
}
function press(k){
  if(!C||!V) return;
  const me=C.me, on=C.can && ((V.phase==='setup'&&!V.secrets[me]) || (V.phase==='play'&&V.turn===me));
  if(!on) return;
  if(k==='del') buf=buf.slice(0,-1);
  else if(k==='ok'){ if(buf.length===3){ const val=buf; buf=''; C.act({k:V.phase==='setup'?'secret':'guess', v:val}); return; } }
  else if(buf.length<3 && !buf.includes(k)) buf+=k;
  C.rerender();
}
window.addEventListener('keydown',e=>{
  const area=document.getElementById('area');
  if(!area||area.dataset.game!=='baseball'||document.getElementById('play').hidden||e.target.tagName==='INPUT') return;
  if(/^[0-9]$/.test(e.key)) press(e.key);
  else if(e.key==='Backspace') press('del');
  else if(e.key==='Enter') press('ok');
});
function status(v,ctx){
  const me=ctx.me, o=1-me;
  if(v.phase==='setup') return v.secrets[me] ? '상대가 숫자를 정하는 중…' : '상대가 맞힐 비밀 숫자 3개를 정하세요 (서로 다른 숫자)';
  if(ctx.myTurn) return hit(v,o) ? '상대가 맞혔어요! 이번에 맞히면 무승부' : '추리할 숫자 3개를 넣으세요';
  return ctx.turnText(v);
}
/* 컴퓨터: 지금까지 결과와 맞는 후보 중에서 하나 */
function ai(v){
  if(v.phase==='setup') return v.secrets[1] ? null : {k:'secret', v:U.pick(allPerms())};
  if(v.turn!==1) return null;
  const hist=v.guesses[1];
  const cand=allPerms().filter(c=>hist.every(h=>{ const r=judge(c,h.g); return r.s===h.s&&r.b===h.b; }));
  return {k:'guess', v:U.pick(cand.length?cand:allPerms())};
}
const guide=`
<p>서로 상대의 <b>비밀 숫자 3자리</b>를 먼저 맞히는 게임이에요. 숫자는 0~9 중 서로 다른 것 3개.</p>
<h3>진행</h3>
<ul><li>먼저 각자 비밀 숫자를 정해요. 둘 다 정하면 시작.</li>
<li>번갈아 숫자 3개를 불러요. 결과가 이렇게 나와요:</li></ul>
<ul><li><b>S (스트라이크)</b> — 숫자와 자리가 모두 맞음</li>
<li><b>B (볼)</b> — 숫자는 있는데 자리가 다름</li>
<li><b>OUT</b> — 하나도 없음</li></ul>
<p>예) 비밀 숫자가 <b>427</b>일 때 <b>472</b>를 부르면 → 4는 자리까지 맞으니 1S, 7·2는 자리만 틀리니 2B → <b>1S 2B</b></p>
<h3>승리</h3>
<ul><li><b>3S</b>를 먼저 만들면 승리.</li>
<li>먼저 시작한 쪽이 맞히면, 상대에게 마지막 한 번의 기회가 있어요. 상대도 맞히면 무승부.</li></ul>
<h3>메모</h3>
<p>아래 숫자 메모를 누르면 <s>지움</s> → <span style="background:#cfe7d6;padding:0 4px;border-radius:4px">확실</span> → 원래대로 바뀌어요. 나만 보여요.</p>
<div class="tipbox">💡 <b>팁</b>: OUT이 나오면 그 숫자 3개를 한꺼번에 지울 수 있어서 오히려 좋아요. PC에선 숫자키로 입력하고 Enter.</div>`;
window.GAMES.baseball = {
  title:'숫자야구', emoji:'⚾', tags:['추리','숫자'], pulse:v=>{ const b=i=>Math.max(0,...v.guesses[i].map(x=>x.s*2+x.b)); return b(1)-b(0); }, pulseStep:2, tagline:'서로의 비밀 숫자 3자리를 S·B 힌트로 먼저 맞히는 추리 대결.',
  guide, init, apply, mask, ai, render, status,
  reset(){ buf=''; memo={}; phaseSig=''; },
  bar:(v,i)=>`<span class="tag">${v.phase==='setup'?(v.secrets[i]?'준비 완료':'정하는 중'):`추리 ${v.guesses[i].length}회`}</span>`,
};
})();
