(function(){
'use strict';
/* 수식 피라미드 (1:1 데스매치, 데블스 플랜 S2 6일차).
   라운드마다 피라미드 10칸(연산 기호 + 숫자)과 목표 숫자가 공개된다.
   먼저 칸을 누른 사람(버저)이 10초 안에 칸 3개를 순서대로 골라 목표 숫자가 되는 식을 만든다.
   첫 칸의 연산 기호는 무시, 곱셈·나눗셈 먼저. 정답 +1 / 틀림·10초 초과·이미 나온 조합 −1.
   라운드는 60초(버저 중엔 시계 멈춤) 또는 정답을 다 찾으면 끝. 10라운드 뒤 점수가 높은 쪽이 승리, 같으면 연장. */
const ROUNDS=10, ROUND_MS=60000, BUZZ_MS=10000, MAXR=13;
const OPS=['+','−','×','÷'];
function ev(ns,os){   // ns: 숫자 3개, os: 두 번째·세 번째 칸의 기호 → 곱셈·나눗셈 먼저
  const t=[ns[0]], o=[];
  for(let i=1;i<3;i++){ const op=os[i-1], x=ns[i];
    if(op==='×') t[t.length-1]*=x; else if(op==='÷') t[t.length-1]/=x; else { o.push(op); t.push(x); } }
  let v=t[0]; for(let i=0;i<o.length;i++) v = o[i]==='+' ? v+t[i+1] : v-t[i+1];
  return v;
}
function evLR(ns,os){   // 왼쪽부터 차례로 (사람이 흔히 하는 착각)
  let v=ns[0]; for(let i=1;i<3;i++){ const op=os[i-1], x=ns[i]; v = op==='+'?v+x : op==='−'?v-x : op==='×'?v*x : v/x; } return v;
}
const valOf=(b,c)=>ev(c.map(i=>b[i].n), [b[c[1]].op, b[c[2]].op]);
const near=(a,b)=>Math.abs(a-b)<1e-9;
const keyOf=c=>c.slice().sort((a,b)=>a-b).join(',');
function solve(b,target){   // 목표가 되는 순서 있는 3칸 → 조합별로 묶음
  const sets={};
  for(let i=0;i<10;i++) for(let j=0;j<10;j++) for(let k=0;k<10;k++){ if(i===j||j===k||i===k) continue;
    if(near(valOf(b,[i,j,k]),target)){ const ky=keyOf([i,j,k]); (sets[ky]=sets[ky]||[]).push([i,j,k]); } }
  return sets;
}
function newBoard(){
  for(let tries=0;tries<200;tries++){
    const b=[]; for(let i=0;i<10;i++){ const r=Math.random(); b.push({op: r<.3?'+': r<.55?'−': r<.8?'×':'÷', n:1+(Math.random()*9|0)}); }
    const cnt={};
    for(let i=0;i<10;i++) for(let j=0;j<10;j++) for(let k=0;k<10;k++){ if(i===j||j===k||i===k) continue;
      const v=valOf(b,[i,j,k]); if(!Number.isInteger(Math.round(v*1e6)/1e6)||v<1||v>60||!near(v,Math.round(v))) continue;
      const t=Math.round(v); (cnt[t]=cnt[t]||new Set()).add(keyOf([i,j,k])); }
    const good=Object.keys(cnt).filter(t=>cnt[t].size>=3&&cnt[t].size<=6);
    if(good.length){ const t=+U.pick(good); return {b, target:t, sols:solve(b,t)}; }
  }
  const b=[{op:'+',n:1},{op:'+',n:2},{op:'+',n:3},{op:'×',n:4},{op:'−',n:5},{op:'+',n:6},{op:'÷',n:2},{op:'+',n:8},{op:'×',n:3},{op:'−',n:1}];
  return {b, target:12, sols:solve(b,12)};
}

function init(starter){
  return {score:[0,0], round:0, phase:'intro', turn:null, starter, winner:null, log:[], ev:0,
    notice:'🎙️ 데스 매치 「수식 피라미드」를 시작합니다. 칸 3개로 목표 숫자를 만드세요', stats:[{ok:0,bad:0},{ok:0,bad:0}]};
}
function startRound(s){
  s.round++; const g=newBoard(); s.board=g.b; s.target=g.target; s.sols=g.sols; s.found={}; s.buzz=null; s.judge=null;
  s.left=ROUND_MS; s.roundEnd=Date.now()+ROUND_MS; s.phase='play'; s.pass=[false,false];
  s.notice=`🎙️ ${s.round>ROUNDS?'연장 ':''}${s.round}라운드 · 목표 숫자는 ${s.target}!`;
  s.log.push(`— ${s.round}라운드 · 목표 ${s.target} (정답 ${Object.keys(s.sols).length}개) —`); s.ev++;
}
function endRound(s,why){
  if(s.buzz) s.buzz=null;
  s.phase='roundEnd'; s.why=why; const miss=Object.keys(s.sols).filter(k=>!s.found[k]);
  s.notice = why==='all' ? '🎙️ 정답을 모두 찾았습니다!' : why==='pass' ? `🎙️ 두 분 모두 넘기셨습니다${miss.length?` · 못 찾은 정답 ${miss.length}개`:''}` : `🎙️ 시간 종료!${miss.length?` 못 찾은 정답 ${miss.length}개`:''}`;
  s.ev++;
}
function finish(s){
  if(s.round>=ROUNDS && (s.score[0]!==s.score[1] || s.round>=MAXR)){
    s.phase='over'; s.turn=null; s.winner = s.score[0]>s.score[1]?0 : s.score[1]>s.score[0]?1 : 'draw';
    s.notice = s.winner==='draw' ? '🎙️ 끝까지 동점입니다. 무승부!' : `🎙️ 최종 ${s.score[0]} : ${s.score[1]} — 승부가 났습니다`;
    s.log.push(`🏁 최종 ${s.score[0]} : ${s.score[1]}`); s.ev++; return;
  }
  if(s.round>=ROUNDS) s.log.push('⚖️ 동점 — 연장 라운드!');
  startRound(s);
}
function judge(s){
  const bz=s.buzz, p=bz.p, c=bz.picks, val=valOf(s.board,c), ok=near(val,s.target), k=keyOf(c), dup=ok&&!!s.found[k];
  let d; if(ok&&!dup){ d=1; s.found[k]={p, c:c.slice()}; s.stats[p].ok++; } else { d=-1; s.stats[p].bad++; }
  s.score[p]+=d;
  s.judge={p, c:c.slice(), val, ok:ok&&!dup, dup, d};
  s.log.push(`${p?"B":"A"} ${fmt(s.board,c)} = ${nice(val)} (${c.map(x=>x+1).join("·")}번) ${ok&&!dup?'⭕ +1':dup?'🔁 이미 나온 조합 −1':'❌ −1'}`);
  s.left=Math.max(0,bz.left); s.buzz=null; s.phase='judge'; s.ev++;
}
function nice(v){ return Number.isInteger(v)?String(v): (Math.round(v*100)/100).toString(); }
function fmt(b,c){ return c.map((i,k)=>(k?b[i].op+' ':'')+b[i].n).join(' '); }

function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(!a) return '알 수 없는 동작';
  if(s.phase!=='play') return '잠깐만요, 진행 중이에요';
  if(a.k==='pass'){ if(s.buzz) return '버저가 눌려 있어요'; s.pass[p]=!s.pass[p]; s.ev++;
    if(s.pass[0]&&s.pass[1]){ s.left=Math.max(0,s.roundEnd-Date.now()); endRound(s,'pass'); } return null; }
  if(a.k==='pick'){
    const c=a.c|0; if(!(c>=0&&c<10)) return '칸을 고르세요';
    if(!s.buzz){ if(Date.now()>=s.roundEnd) return '시간이 끝났어요';
      s.buzz={p, picks:[], until:Date.now()+BUZZ_MS, left:Math.max(0,s.roundEnd-Date.now())}; s.pass=[false,false]; }
    else if(s.buzz.p!==p) return '상대가 버저를 눌렀어요';
    if(s.buzz.picks.includes(c)) return '이미 고른 칸이에요';
    s.buzz.picks.push(c); s.ev++;
    if(s.buzz.picks.length===3) judge(s);
    return null;
  }
  if(a.k==='unpick'){ if(!s.buzz||s.buzz.p!==p) return '고른 칸이 없어요'; s.buzz.picks.pop(); s.ev++; return null; }
  return '알 수 없는 동작';
}
function stepDelay(s){
  if(s.winner!=null) return null;
  if(s.phase==='intro') return 2600;
  if(s.phase==='judge') return 2000;
  if(s.phase==='roundEnd') return 4200 + 400*Object.keys(s.sols).length;
  if(s.phase==='play'){ if(s.buzz) return Math.max(0, s.buzz.until-Date.now()); return Math.max(0, s.roundEnd-Date.now()); }
  return null;
}
function step(s){
  if(s.phase==='intro'){ startRound(s); return; }
  if(s.phase==='judge'){ s.judge=null; s.phase='play'; s.roundEnd=Date.now()+s.left;
    if(Object.keys(s.found).length>=Object.keys(s.sols).length) endRound(s,'all'); else if(s.left<=0) endRound(s,'time'); else s.ev++; return; }
  if(s.phase==='roundEnd'){ finish(s); return; }
  if(s.phase==='play'){
    if(s.buzz){ if(Date.now()>=s.buzz.until){ const p=s.buzz.p; s.score[p]--; s.stats[p].bad++; s.log.push(`${p?'B':'A'} ⏰ 10초 초과 −1`);
        s.judge={p, c:s.buzz.picks.slice(), val:null, ok:false, timeout:true, d:-1}; s.left=s.buzz.left; s.buzz=null; s.phase='judge'; s.ev++; } return; }
    if(Date.now()>=s.roundEnd){ s.left=0; endRound(s,'time'); }
  }
}
function mask(s,p){
  const v=U.clone(s);
  if(s.phase!=='roundEnd'&&s.phase!=='over'){ v.sols=null; v.nSols=Object.keys(s.sols||{}).length; } else v.nSols=Object.keys(s.sols||{}).length;
  v.leftMs = s.phase==='play'&&!s.buzz ? Math.max(0,s.roundEnd-Date.now()) : (s.phase==='play'&&s.buzz ? s.buzz.left : s.left);
  v.buzzMs = s.buzz ? Math.max(0,s.buzz.until-Date.now()) : 0;
  return v;
}

/* 컴퓨터: 판을 보고 정답을 "찾는 데 걸리는 시간"을 흉내 냄.
   찾기 쉬운 식(덧셈 위주, 큰 수 없음)부터, 나눗셈·순서 바꿈은 늦게. 쉬움은 계산 순서를 착각하거나 이미 나온 걸 또 냄. */
let plan=null, curLvl=1;
function cands(v){   // 아직 안 나온 정답 후보 (스스로 계산 — 숨김 정답표는 안 봄)
  const out=[], seen={};
  for(let i=0;i<10;i++) for(let j=0;j<10;j++) for(let k=0;k<10;k++){ if(i===j||j===k||i===k) continue;
    const c=[i,j,k]; if(!near(valOf(v.board,c),v.target)) continue; const ky=keyOf(c); if(v.found[ky]||seen[ky]) continue; seen[ky]=1;
    const ops=[v.board[j].op,v.board[k].op]; let hard=1 + ops.filter(o=>o==='÷').length*1.4 + ops.filter(o=>o==='×').length*.5 + (v.board[i].op!=='+'?.6:0) + (Math.max(...c.map(x=>v.board[x].n))>=7?.3:0);
    out.push({c, hard}); }
  return out;
}
function wrongs(v){   // 왼쪽부터 계산하면 맞아 보이는 식
  const out=[];
  for(let i=0;i<10;i++) for(let j=0;j<10;j++) for(let k=0;k<10;k++){ if(i===j||j===k||i===k) continue;
    const c=[i,j,k], ns=c.map(x=>v.board[x].n), os=[v.board[j].op,v.board[k].op];
    if(near(evLR(ns,os),v.target)&&!near(ev(ns,os),v.target)) out.push(c); }
  return out;
}
const MEM={};   // 자리별 "찾는 중" 기억: 언제쯤 답이 보일지
function searchMs(v,lvl){ const nf=Object.keys(v.found).length; return [18000,12000,8000][lvl]*(1+nf*.25)*(.55+Math.random()*.9)*((v.nSols-nf)<=1?1.3:1); }
function ai(v,lvl=1){ curLvl=lvl;
  const me=1, seat=v._seat!=null?v._seat:1, m=MEM[seat]=MEM[seat]||{};
  if(v.phase!=='play') { plan=null; return null; }
  if(v.buzz){ if(v.buzz.p!==me) return null;
    const nxt=plan&&plan.c[v.buzz.picks.length]; if(nxt==null){ const left=[...Array(10).keys()].filter(x=>!v.buzz.picks.includes(x)); return {k:'pick',c:U.pick(left)}; }
    return {k:'pick',c:nxt}; }
  const cs=cands(v); const sig=v.round+':'+Object.keys(v.found).length, now=Date.now();
  if(m.sig!==sig){ const sameRound=m.sig&&m.sig.split(':')[0]==String(v.round), fresh=now+searchMs(v,lvl);
    m.readyAt = sameRound&&m.readyAt>now ? Math.max(m.readyAt, now+searchMs(v,lvl)*.5) : fresh; m.sig=sig; }
  if(v.pass&&v.pass[0]&&!v.pass[me]&&(!cs.length||Math.random()<.5)) return {k:'pass'};
  if(!cs.length){ if(!v.pass[me]&&now>=m.readyAt) return {k:'pass'}; return null; }
  if(now<m.readyAt) return null;   // 아직 못 찾음
  // 쉬운 것부터 찾게 됨 (어려움일수록 어려운 것도 찾음)
  const w=cs.map(x=>Math.pow(1/x.hard, [2.2,1.5,.9][lvl]));
  let r=Math.random()*w.reduce((a,b)=>a+b,0), pickC=cs[0]; for(let i=0;i<cs.length;i++){ r-=w[i]; if(r<=0){ pickC=cs[i]; break; } }
  let c=pickC.c.slice();
  const err=[.22,.08,.03][lvl];
  if(Math.random()<err){ const fw=wrongs(v); const fd=Object.values(v.found).map(f=>f.c);
    if(fd.length&&Math.random()<.4) c=U.pick(fd).slice(); else if(fw.length) c=U.pick(fw).slice(); }
  plan={c}; m.sig=null;
  return {k:'pick',c:c[0]};
}
function aiDelay(s){
  if(s.phase!=='play') return 700;
  if(s.buzz) return s.buzz.p===1 ? 650+Math.random()*900 : Math.max(400, s.buzz.until-Date.now()+300);
  const m=MEM[1]; if(m&&m.readyAt) return Math.max(250, Math.min(3000, m.readyAt-Date.now()+50));
  return 600;
}

/* 화면 */
let tick=null, lastJ='';
const ROWS=[[0],[1,2],[3,4,5],[6,7,8,9]];
const pos=c=>`<i class="py-pos">${c.map(x=>x+1).join('·')}번</i>`;
function render(el,v,ctx){
  const me=ctx.me, o=1-me;
  clearInterval(tick); tick=null;
  const nm=p=>p===me?'나':(ctx.mode==='solo'?'상대':U.esc(ctx.name(p)));
  let h='';
  if(v.notice) h+=`<div class="vr-speech">${U.esc(v.notice)}</div>`;
  h+=`<div class="py-top"><div class="py-sc ${v.buzz&&v.buzz.p===o?'buzz':''}"><small>${nm(o)}</small><b>${v.score[o]}</b></div>
    <div class="py-goal"><small>${v.round>0?`${v.round}${v.round>ROUNDS?' (연장)':''} / ${ROUNDS}라운드`:'준비'}</small><b>${v.target!=null&&v.phase!=='intro'?v.target:'?'}</b><small>목표 숫자</small></div>
    <div class="py-sc me ${v.buzz&&v.buzz.p===me?'buzz':''}"><small>나</small><b>${v.score[me]}</b></div></div>`;
  if(v.board){
    const picks=v.buzz?v.buzz.picks:(v.judge?v.judge.c:[]);
    const owner=v.buzz?v.buzz.p:(v.judge?v.judge.p:null);
    const mine=v.phase==='play'&&(!v.buzz||v.buzz.p===me);
    h+=`<div class="py-pyr">${ROWS.map(r=>`<div class="py-row">${r.map(i=>{ const pk=picks.indexOf(i); const c=v.board[i];
      return `<button class="py-cell ${pk>=0?(owner===me?'pk me':'pk op'):''}" data-c="${i}" ${mine?'':'disabled'}><span class="py-op">${pk===0?'<s>'+c.op+'</s>':c.op}</span><span class="py-n">${c.n}</span>${pk>=0?`<em>${pk+1}</em>`:''}<i class="py-no">${i+1}</i></button>`; }).join('')}</div>`).join('')}</div>`;
  }
  // 상황 줄 (고정 칸 — 판을 가리지 않음)
  let line='&nbsp;';
  if(v.phase==='play'){
    if(v.buzz){ const pk=v.buzz.picks; const f=pk.length?fmt(v.board,pk):'…';
      line = v.buzz.p===me ? `🔔 내 버저! <b id="pyBz">${Math.ceil(v.buzzMs/1000)}</b>초 · ${f} ${pk.length<3?'<small>(고른 칸을 다시 누르면 취소)</small>':''}` : `🔔 ${nm(o)} 버저! <b id="pyBz">${Math.ceil(v.buzzMs/1000)}</b>초 · ${f}`; }
    else line=`⏱️ <b id="pyClk">${Math.ceil(v.leftMs/1000)}</b>초 · 정답 ${v.nSols}개 중 <b>${Object.keys(v.found).length}</b>개 찾음 · 칸을 누르면 버저!`;
  } else if(v.phase==='judge'&&v.judge){ const j=v.judge;
    line = j.timeout ? `⏰ ${nm(j.p)} 10초 초과 — <b class="bad">−1</b>` : `${nm(j.p)}: ${fmt(v.board,j.c)} = <b>${nice(j.val)}</b> ${j.ok?'<b class="ok">⭕ +1</b>':j.dup?'<b class="bad">🔁 이미 나온 조합 −1</b>':`<b class="bad">❌ −1</b> <small>(목표 ${v.target})</small>`}`; }
  else if(v.phase==='roundEnd') line=`라운드 끝 · 점수 나 ${v.score[me]} : ${v.score[o]} ${nm(o)}`;
  h+=`<div class="py-line">${line}</div>`;
  if(v.phase==='play'&&!v.buzz) h+=`<div class="fh-act"><button class="ghost" data-a="pass">${v.pass[me]?'↩️ 넘기기 취소':'🙅 더 없는 것 같아요 (넘기기)'}</button>${v.pass[o]?`<small class="py-pass">${nm(o)}: 넘기자고 함</small>`:''}</div>`;
  // 찾은 정답 / 라운드 끝엔 전부
  const found=Object.values(v.found||{});
  let ans='';
  if(v.phase==='roundEnd'||v.phase==='over'){ if(v.sols) ans=Object.keys(v.sols).map(k=>{ const f=v.found[k]; const c=f?f.c:v.sols[k][0];
      return `<div class="py-ans ${f?(f.p===me?'me':'op'):'miss'}"><span>${fmt(v.board,c)} = ${v.target} ${pos(c)}</span><small>${f?(f.p===me?'⭕ 나':'⭕ '+nm(o)):'아무도 못 찾음'}</small></div>`; }).join(''); }
  else ans=found.map(f=>`<div class="py-ans ${f.p===me?'me':'op'}"><span>${fmt(v.board,f.c)} = ${v.target} ${pos(f.c)}</span><small>${f.p===me?'나':nm(o)}</small></div>`).join('');
  h+=`<div class="py-list">${ans||'<small>아직 찾은 식이 없어요</small>'}</div>`;
  if(v.phase==='over') h+=`<div class="info">정답 · 나 ${v.stats[me].ok}개 / ${nm(o)} ${v.stats[o].ok}개 · 실수 · 나 ${v.stats[me].bad} / ${nm(o)} ${v.stats[o].bad}</div>`;
  h+=`<details class="hl-log" open><summary>기록 · 첫 칸 기호는 무시, ×÷ 먼저</summary>${v.log.slice(-12).reverse().map(x=>`<div>${U.esc(x).replace(/^A\b/,nm(0)).replace(/^B\b/,nm(1))}</div>`).join('')}</details>`;
  el.innerHTML=h;
  // 시계
  const t0=performance.now(), base=v.buzz?v.buzzMs:v.leftMs, id=v.buzz?'pyBz':'pyClk';
  if(v.phase==='play'){ tick=setInterval(()=>{ const e=document.getElementById(id); if(!e||!e.isConnected){ clearInterval(tick); return; }
    const x=Math.max(0,Math.ceil((base-(performance.now()-t0))/1000)); e.textContent=x; e.classList.toggle('bad', x<=(v.buzz?3:10)); },250); }
  el.onclick=e=>{ const a=e.target.closest('[data-a],[data-c]'); if(!a||a.disabled) return;
    if(a.dataset.a==='pass') return ctx.act({k:'pass'});
    if(a.dataset.c!=null){ const c=+a.dataset.c; if(v.buzz&&v.buzz.p===me&&v.buzz.picks[v.buzz.picks.length-1]===c) return ctx.act({k:'unpick'}); return ctx.act({k:'pick',c}); } };
}
const guide=`
<p><b>1:1 빨리 찾기 계산 대결</b>. 라운드마다 <b>피라미드 10칸</b>(연산 기호 + 숫자)과 <b>목표 숫자</b>가 공개돼요.</p>
<ol><li>칸 <b>3개를 순서대로</b> 골라 목표 숫자가 되는 식을 만들어요. <b>첫 칸의 기호는 무시</b>하고, 두 번째·세 번째 칸의 기호로 이어요.<br>예) <code>−5</code> <code>×3</code> <code>+2</code> → 5 × 3 + 2 = 17</li>
<li><b>×, ÷ 먼저</b> 계산해요. 예) 2 + 3 × 4 = 14</li>
<li>아무 칸이나 먼저 누르면 <b>🔔 버저</b>! 그 사람만 <b>10초 안에</b> 나머지 두 칸을 골라요. (고른 칸을 다시 누르면 취소)</li>
<li>정답 <b>+1</b> · 틀림 <b>−1</b> · 10초 초과 <b>−1</b> · 이미 나온 칸 조합(순서만 바꾼 것 포함) <b>−1</b></li>
<li>라운드는 ${ROUND_MS/1000}초(버저 중엔 멈춤). 정답을 다 찾거나 둘 다 🙅 넘기면 끝나고, 못 찾은 정답을 보여줘요.</li></ol>
<p>${ROUNDS}라운드 뒤 점수가 높은 쪽이 승리. 같으면 연장 라운드(최대 ${MAXR}라운드).</p>
<div class="tipbox">💡 <b>팁</b><br>· 첫 칸 기호가 무시되니 <b>−, ÷가 붙은 칸도 첫 칸으로는 그냥 숫자</b>예요.<br>· 정답이 몇 개 남았는지 보여요. 확실할 때만 버저 — 틀리면 깎여요!<br>· 상대가 고르는 칸이 실시간으로 보여요.</div>`;
window.GAMES.pyramid = {
  title:'수식 피라미드', ref:'데블스 플랜 「수식 피라미드」', emoji:'🔺', tags:['순발력','계산','두뇌서바이벌','데스매치'],
  tagline:'피라미드 10칸 중 3칸으로 목표 숫자를 만드는 버저 계산 대결. 틀리면 깎여요.',
  guide, init, apply, mask, ai, aiDelay, render, step, stepDelay,
  reset(){ plan=null; for(const k in MEM) delete MEM[k]; clearInterval(tick); tick=null; },
  status:(v,ctx)=> v.phase==='intro'?'곧 시작해요':v.phase==='play'?(v.buzz?(v.buzz.p===ctx.me?'10초 안에 칸 3개!':'상대가 식을 만드는 중…'):'식을 찾으면 칸을 눌러 버저!'):v.phase==='judge'?'채점 중…':v.phase==='roundEnd'?'다음 라운드 준비 중…':'',
  bar:(v,i)=>`<span class="score">⭐ ${v.score[i]}</span>`,
  pulse:v=>v.score[1]-v.score[0], pulseStep:2, _mem:MEM,
};
})();
