(function(){
'use strict';
/* 선착순 (피의 게임 시즌 2 · 1일차 머니 챌린지). 정글에서 의자에 묶인 채 시작 — 화면의 숫자 규칙에서 비밀번호를 찾아
   자물쇠 3개를 차례로 풀고 저택으로 먼저 들어가는 사람이 1등. 꼴찌는 탈락 후보.
   6명(우리 둘 + NPC 4명). 모두 같은 문제. 비밀번호는 네 줄의 수열에서 다음 수(한 자리) 4개.
   틀리면 자물쇠가 5초 잠김. NPC는 성향(논리)에 따라 푸는 속도·실수가 다름. 5분이 지나면 진행도 순. */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로, 나머지는 NPC */
const N=6, LOCKS=3, JAM=5000, LIMIT=300000; let HSEAT=[0,3]; const SEATORD=[0,3,1,4,2,5];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i), ALL=[...Array(N).keys()];
const nm=i=>`{s${i}}`;
const DEF_P={talk:.6,aggr:.5,trust:.5,bluff:.5,logic:.6,temper:.4};
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
const R=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
/* 수열 한 줄: 보여 줄 항들과 다음 항(0~9) */
function seqLine(level){
  for(let tries=0;tries<500;tries++){
    const kinds = level===0 ? ['add','sub'] : level===1 ? ['add','sub','mul','alt','sq'] : ['fib','tri','alt','mul','mix','sq'];
    const k=U.pick(kinds); let t=[], hint='';
    if(k==='add'){ const a=R(0,6), d=R(1,3); for(let i=0;i<5;i++) t.push(a+i*d); }
    else if(k==='sub'){ const d=R(1,3), a=R(4*d,9+4*d); for(let i=0;i<5;i++) t.push(a-i*d); }
    else if(k==='mul'){ const a=R(1,3), m=2; t=[a]; for(let i=1;i<5;i++) t.push(t[i-1]*m); t=t.reverse(); if(Math.random()<.5) t=t.reverse(); }
    else if(k==='alt'){ const a=R(1,9), x=R(2,5), y=R(1,x-1); t=[a]; for(let i=1;i<5;i++) t.push(t[i-1]+(i%2?x:-y)); }
    else if(k==='sq'){ const a=R(0,1); for(let i=0;i<5;i++) t.push((a+i)*(a+i)); if(Math.random()<.5) t=t.slice().reverse(); }
    else if(k==='fib'){ const a=R(0,3), b=R(1,3); t=[a,b]; for(let i=2;i<5;i++) t.push(t[i-1]+t[i-2]); }
    else if(k==='tri'){ const a=R(0,4); t=[a]; for(let i=1;i<5;i++) t.push(t[i-1]+i); if(Math.random()<.4) t=t.slice().reverse(); }
    else if(k==='mix'){ const a=R(1,4); t=[a]; for(let i=1;i<5;i++) t.push(i%2? t[i-1]*2 : t[i-1]-1); }
    const ans=t[t.length-1], shown=t.slice(0,-1);
    if(ans<0||ans>9||shown.some(x=>x<0||x>99)) continue;
    // 같은 답이 다른 규칙으로도 나오면 헷갈리니 단순 검사: 보이는 항이 모두 같으면 제외
    if(new Set(shown).size<2) continue;
    const cs=cands(shown); if(cs.length!==1||cs[0]!==ans) continue;   // 답이 하나로만 정해지는 줄만
    return {shown, ans, k};
  }
  return {shown:[1,2,3,4], ans:5, k:'add'};
}
function makeLock(level){ const lines=[]; for(let g=0;lines.length<4&&g<200;g++){ const l=seqLine(level); if(lines.some(x=>x.shown.join()===l.shown.join())) continue; if(!lines.some(x=>x.k===l.k)||g>150) lines.push(l); } return {lines, code:lines.map(l=>l.ans).join('')}; }
function init(starter,o){ const k=Math.max(2,Math.min(6,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  const s={phase:'intro', who:{}, locks:[0,1,2].map(makeLock), prog:Array(N).fill(0), done:Array(N).fill(null), fails:Array(N).fill(0), jam:Array(N).fill(0),
    t0:0, ev:[], rank:[], used:{}, say:null, log:[], turn:null, starter, winner:null, evn:0,
    notice:'🎙️ 눈을 뜨면 정글입니다. 손은 묶여 있고, 앞에는 자물쇠 세 개…'};
  s.hs=HSEAT.slice(); const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=ids[k]);
  return s;
}
const LV={solve:['풀었다!','다음!','오케이 👌','하나 끝'], fail:['아 틀렸네…','뭐야 이게 아니야?','으악 😣'], out:['탈출! 🏃','먼저 갑니다~ 😎','저택 도착!'],
  logic:{solve:['규칙 보이네요.','간단하네요.'], out:['계산대로예요.']}, emo:{solve:['꺅 풀었다!! 😆'], fail:['헐 왜 틀려 😭'], out:['나 1등?! 🥳']}, hot:{solve:['됐다!! 🔥'], fail:['아 진짜!!'], out:['간다!! 🔥']}};
const STYLE={seojin:'logic', haram:'logic', soyul:'logic', yuna:'emo', doyun:'emo', taekyung:'hot', minho:'hot', jihu:'logic'};
function lineOf(s,i,kind){ const st=STYLE[P(s,i).id]; const pool=((LV[st]||{})[kind]||[]).concat(LV[kind]); const used=(s.used[i]=s.used[i]||[]); const f=pool.filter(x=>!used.includes(x)); const t=U.pick(f.length?f:pool); used.push(t); return t; }
function planNPC(s){   // NPC마다 자물쇠별 풀이 시각·실수 미리 정함(성향 기반)
  for(const i of ALL) if(!isH(i)){ const p=P(s,i); let t=s.t0+R(1500,3500);
    for(let L=0;L<LOCKS;L++){ const base=[40000,52000,64000][L], f=(1.55-p.logic*.8)*(.7+Math.random()*.6);
      if(Math.random()<(1-p.logic)*.45+.05){ t+=base*f*.6; s.ev.push({t, i, kind:'fail', L}); t+=JAM+R(1000,4000); }
      t+=base*f*(Math.random()<(1-p.logic)*.45?.6:1); s.ev.push({t, i, kind:'solve', L}); }
  }
  s.ev.sort((a,b)=>a.t-b.t);
}
function finish(s,i){ s.done[i]=Date.now()-s.t0; s.rank.push(i); const k=s.rank.length;
  s.log.push(`🏁 ${k}등 ${nm(i)} (${(s.done[i]/1000).toFixed(1)}초)`); s.notice = k===1 ? `🎙️ 1등! ${nm(i)}이(가) 저택에 도착했습니다!` : `🏁 ${k}등 ${nm(i)} 도착`;
  if(!isH(i)) { s.say={seat:i,text:lineOf(s,i,'out'),n:(s.say?s.say.n:0)+1}; } }
function checkEnd(s){ if(s.rank.length>=N-1 || Date.now()-s.t0>=LIMIT){
  const rest=ALL.filter(i=>s.done[i]==null).sort((a,b)=>s.prog[b]-s.prog[a]||s.fails[a]-s.fails[b]); for(const i of rest){ s.rank.push(i); }
  s.phase='result'; const last=s.rank[N-1]; s.notice=`🎙️ 마지막까지 남은 사람… ${nm(last)} — 탈락 후보입니다`; s.log.push(`💀 꼴찌(탈락 후보): ${nm(last)}`); s.evn++; return true; } return false; }
function apply(s,p,a){ syncH(s);
  if(s.winner!=null) return '게임이 끝났어요';
  const seat=HSEAT[p]; if(!a||a.k!=='try') return '알 수 없는 동작';
  if(s.phase!=='race') return '아직 시작 전이에요'; if(s.done[seat]!=null) return '이미 탈출했어요';
  if(Date.now()<s.jam[seat]) return `자물쇠가 잠겼어요 (${Math.ceil((s.jam[seat]-Date.now())/1000)}초)`;
  const code=String(a.code||''); if(!/^\d{4}$/.test(code)) return '숫자 4개를 넣으세요';
  const L=s.prog[seat];
  if(code===s.locks[L].code){ s.prog[seat]++; s.log.push(`🔓 ${nm(seat)} 자물쇠 ${L+1} 해제`); if(s.prog[seat]>=LOCKS) finish(s,seat); else s.notice=`🔓 ${nm(seat)} 자물쇠 ${L+1}개째 해제!`; }
  else { s.fails[seat]++; s.jam[seat]=Date.now()+JAM; s.log.push(`❌ ${nm(seat)} 비밀번호 틀림 (5초 잠김)`); }
  s.evn++; checkEnd(s); return null;
}
function stepDelay(s){ syncH(s);
  if(s.winner!=null) return null;
  if(s.phase==='intro') return 2600;
  if(s.phase==='count') return 900;
  if(s.phase==='race'){ const nx=s.ev[0]; const lim=s.t0+LIMIT; return Math.max(0, Math.min(nx?nx.t:lim, lim)-Date.now()); }
  if(s.phase==='result') return 3500;
  return null;
}
function step(s){ syncH(s);
  if(s.phase==='intro'){ s.phase='count'; s.cnt=3; s.notice='🎙️ 3'; s.evn++; return; }
  if(s.phase==='count'){ s.cnt--; if(s.cnt>0){ s.notice=`🎙️ ${s.cnt}`; s.evn++; return; } s.phase='race'; s.t0=Date.now(); planNPC(s); s.notice='🎙️ 시작! 안대를 벗으세요!'; s.log.push('🏁 시작'); s.evn++; return; }
  if(s.phase==='race'){ const now=Date.now();
    while(s.ev.length&&s.ev[0].t<=now){ const e=s.ev.shift(); const i=e.i; if(s.done[i]!=null) continue;
      if(e.kind==='react'){ s.say={seat:i,text:U.pick(['벌써?!','헐 빠르다…','나도 거의 다 했는데!']),n:(s.say?s.say.n:0)+1}; continue; }
      if(e.kind==='fail'){ s.fails[i]++; s.log.push(`❌ ${nm(i)} 비밀번호 틀림`); s.say={seat:i,text:lineOf(s,i,'fail'),n:(s.say?s.say.n:0)+1}; }
      else { s.prog[i]=e.L+1; s.log.push(`🔓 ${nm(i)} 자물쇠 ${e.L+1} 해제`); if(s.prog[i]>=LOCKS) finish(s,i); else { s.notice=`🔓 ${nm(i)} 자물쇠 ${e.L+1}개째!`; if(Math.random()<.5) s.say={seat:i,text:lineOf(s,i,'solve'),n:(s.say?s.say.n:0)+1}; } }
      // 다른 사람이 앞서가면 사람다운 반응
      if(e.kind==='solve'&&e.L===LOCKS-1&&s.rank.length===1){ const o=ALL.filter(j=>!isH(j)&&j!==i&&s.done[j]==null); if(o.length){ const j=U.pick(o); s.ev.push({t:now+900,i:j,kind:'react'}); s.ev.sort((x,y)=>x.t-y.t); } }
    }
    s.evn++; checkEnd(s); return; }
  if(s.phase==='result'){ s.phase='over'; s.turn=null; const a=s.rank.indexOf(HSEAT[0]), b=s.rank.indexOf(HSEAT[1]); s.winner = a<b?0 : b<a?1 : 'both'; { const V=h=>s.rank.indexOf(h), bv=Math.min(...HSEAT.map(V)); s.winners=HSEAT.map((h,p)=>V(h)===bv?p:-1).filter(x=>x>=0); } s.evn++; }
}
function mask(s,p){ syncH(s); const v=U.clone(s), me=HSEAT[p];
  v.locks=s.locks.map((l,L)=>({lines:l.lines.map(x=>({shown:x.shown})), code: s.phase==='over'||s.phase==='result'||s.prog[me]>L ? l.code : null}));
  v.ev=[]; v.used={}; v.now=Date.now(); v.jamLeft=Math.max(0,s.jam[me]-Date.now()); v.elapsed=s.t0?Date.now()-s.t0:0;
  if(s.phase!=='race'&&s.phase!=='result'&&s.phase!=='over') v.locks=v.locks.map(()=>({lines:[],code:null}));
  return v; }
/* 혼자 모드 두 번째 사람 자리: 문제를 직접 풀되 사람 속도로 */
function cands(sh){   // 보이는 항에 맞는 모든 규칙의 다음 수
  const n=sh.length, d=sh.slice(1).map((x,i)=>x-sh[i]), out=[], sq=x=>{ const r=Math.round(Math.sqrt(x)); return r*r===x?r:null; };
  if(d.every(x=>x===d[0])) out.push(sh[n-1]+d[0]);
  if(sh.every((x,i)=>i===0||x===sh[i-1]*2)) out.push(sh[n-1]*2);
  if(sh.every((x,i)=>i===0||x*2===sh[i-1])) out.push(sh[n-1]/2);
  if(d.length>=3&&d.every((x,i)=>i<2||x===d[i-2])&&d[0]!==d[1]) out.push(sh[n-1]+d[d.length-2]);
  const r=sh.map(sq); if(r.every(x=>x!=null)){ if(r.every((x,i)=>i===0||x===r[i-1]+1)) out.push((r[n-1]+1)**2); if(r.every((x,i)=>i===0||x===r[i-1]-1)&&r[n-1]>0) out.push((r[n-1]-1)**2); }
  if(sh.every((x,i)=>i<2||x===sh[i-1]+sh[i-2])) out.push(sh[n-1]+sh[n-2]);
  if(d.length>=2&&d.every((x,i)=>i===0||x===d[i-1]+1)) out.push(sh[n-1]+d[d.length-1]+1);
  if(d.length>=2&&d.every((x,i)=>i===0||x===d[i-1]-1)) out.push(sh[n-1]+d[d.length-1]-1);
  if(sh.every((x,i)=>i===0||(i%2? x===sh[i-1]*2 : x===sh[i-1]-1))) out.push(n%2? sh[n-1]*2 : sh[n-1]-1);
  return [...new Set(out.filter(x=>Number.isInteger(x)&&x>=0&&x<=9))];
}
function solveLine(sh){ const c=cands(sh); return c.length?c[0]:0; }
let aiAt=0;
function ai(v,lvl=1){ syncH(v); const seat=HSEAT[1]; if(v.phase!=='race'||v.done[seat]!=null||v.jamLeft>0) return null; const L=v.prog[seat]; const lock=v.locks[L]; if(!lock||!lock.lines.length) return null;
  return {k:'try', code: lock.lines.map(l=>solveLine(l.shown)).join('')}; }
function aiDelay(s){ return [42000,54000,66000][Math.min(2,s.prog[HSEAT[1]]||0)]*(.7+Math.random()*.6); }

/* 화면 */
let WHO={}, code='', tick=null, lastL=-1;
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function josa(n,a,b){ const x=n.replace(/\(나\)$/,''), c=x.charCodeAt(x.length-1); return c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28?a:b; }
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}(이\(가\))?/g,(_,d,j)=>{ const n=seatName(+d,ctx); return `${seatEmoji(+d)} ${n}${j?josa(n,'이','가'):''}`; }); }
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{}; const me=HSEAT[ctx.me]; clearInterval(tick); tick=null;
  const L=v.prog[me]; if(L!==lastL){ lastL=L; code=''; }
  let h=`<div class="hl-notice">${fill(U.esc(v.notice||''),ctx)}</div>`;
  h+=`<div class="vr-speech">${v.say?`<span class="w">${seatEmoji(v.say.seat)} ${seatName(v.say.seat,ctx)}</span> ${U.esc(v.say.text)}`:'<i>　</i>'}</div>`;
  h+=`<div class="fc-board">${ALL.map(i=>{ const r=v.rank.indexOf(i); return `<div class="fc-run ${i===me?'me':''} ${v.done[i]!=null?'out':''}"><span class="fc-nm">${seatEmoji(i)} ${seatName(i,ctx)}</span><span class="fc-lk">${[0,1,2].map(k=>k<v.prog[i]?'🔓':'🔒').join('')}</span><span class="fc-st">${v.done[i]!=null?`🏁 ${r+1}등 ${(v.done[i]/1000).toFixed(0)}초`:(v.phase==='over'||v.phase==='result')&&r>=0?`${r+1}등${r===N-1?' 💀':''}`:v.fails[i]?`❌${v.fails[i]}`:''}</span></div>`; }).join('')}</div>`;
  if(v.phase==='race'&&v.done[me]==null){ const lock=v.locks[L];
    h+=`<div class="fc-lock"><div class="fc-h">🔒 자물쇠 ${L+1} / ${LOCKS} · ⏱️ <b id="fcClk">${Math.floor(v.elapsed/1000)}</b>초</div>
      <div class="fc-lines">${lock.lines.map((l,k)=>`<div class="fc-line"><b>${k+1}번째 자리</b> ${l.shown.join(' · ')} · <span class="fc-q">${code[k]!=null?code[k]:'?'}</span></div>`).join('')}</div>
      <div class="fc-code">${[0,1,2,3].map(k=>`<span>${code[k]!=null?code[k]:'_'}</span>`).join('')}</div>
      ${v.jamLeft>0?`<div class="fc-jam">⛔ 잠김 <b id="fcJam">${Math.ceil(v.jamLeft/1000)}</b>초</div>`:''}
      <div class="fc-pad">${[1,2,3,4,5,6,7,8,9].map(n=>`<button data-n="${n}">${n}</button>`).join('')}<button class="ghost" data-n="del">⌫</button><button data-n="0">0</button><button data-n="go" class="fc-go" ${code.length===4&&!(v.jamLeft>0)?'':'disabled'}>열기</button></div>
      <small>각 줄의 <b>다음 수</b>(한 자리)가 비밀번호 한 자리예요. 틀리면 5초 잠겨요.</small></div>`; }
  else if(v.phase==='race') h+=`<div class="info">🏁 탈출 완료! 다른 사람들을 기다리는 중…</div>`;
  if(v.phase==='over'||v.phase==='result') h+=`<div class="sn-score">${v.rank.map((i,k)=>`<div class="${isH(i)?'h':''}"><b>${k+1}등 ${seatEmoji(i)} ${seatName(i,ctx)}</b> ${v.done[i]!=null?`${(v.done[i]/1000).toFixed(1)}초`:`자물쇠 ${v.prog[i]}/3`}${k===0?' 🏆 상금·면제권':''}${k===N-1?' 💀 탈락 후보':''}</div>`).join('')}</div>
    <div class="info">정답: ${v.locks.map((l,k)=>`자물쇠 ${k+1} = <b>${l.code}</b>`).join(' · ')}</div>`;
  const RR=`<div class="side-box side-log"><div class="side-h">📜 진행 기록 <small>최근이 위</small></div>${v.log.slice(-40).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=`<div class="side3"><div class="side-mid">${h}</div><aside class="side-r">${RR}</aside></div>`;
  if(v.phase==='race'){ const t0=performance.now(); tick=setInterval(()=>{ const c=document.getElementById('fcClk'); if(!c||!c.isConnected){ clearInterval(tick); return; } const el2=v.elapsed+(performance.now()-t0); c.textContent=Math.floor(el2/1000);
    const j=document.getElementById('fcJam'); if(j){ const left=v.jamLeft-(performance.now()-t0); if(left<=0) ctx.rerender(); else j.textContent=Math.ceil(left/1000); } },250); }
  el.onclick=e=>{ const b=e.target.closest('[data-n]'); if(!b||b.disabled) return; const n=b.dataset.n;
    if(n==='del'){ code=code.slice(0,-1); return ctx.rerender(); } if(n==='go'){ const c=code; code=''; return ctx.act({k:'try',code:c}); }
    if(code.length<4){ code+=n; return ctx.rerender(); } };
}
function status(v,ctx){ syncH(v); const me=HSEAT[ctx.me]; if(v.phase==='race'&&v.done[me]==null) return `자물쇠 ${v.prog[me]+1} — 비밀번호를 찾으세요`; return v.phase==='over'?'':'진행 중…'; }
const guide=`
<p><b>숫자 규칙 자물쇠 레이스</b> (우리 둘 + 컴퓨터 플레이어 4명, 모두 같은 문제).</p>
<ol><li>정글에서 의자에 묶인 채 시작. 앞에 <b>자물쇠 3개</b>.</li>
<li>자물쇠마다 숫자 <b>네 줄</b>이 나와요. 각 줄의 규칙을 찾아 <b>다음 수</b>(한 자리)를 구하면 그게 비밀번호 한 자리! (예: 1 · 3 · 5 · 7 → 다음은 <b>9</b>. 답은 늘 0~9 한 자리이고, 규칙이 하나로만 정해지는 줄만 나와요)</li>
<li>틀리면 자물쇠가 <b>5초 잠겨요</b>. 세 개를 다 열면 저택 도착!</li></ol>
<p><b>1등</b> 🏆 상금·면제권, <b>꼴찌</b> 💀 탈락 후보. 5분이 지나면 연 자물쇠 수로 순위. 사람끼리는 순위가 가장 높은 사람이 승리.</p>
<div class="tipbox">💡 규칙 종류: 일정하게 더하기·빼기 · 두 배 · 반으로 · 번갈아(+3, −1) · 차이가 1씩 커짐 · 앞 두 수의 합 · 제곱수 · ×2와 −1 번갈아.<br>컴퓨터 플레이어마다 속도가 달라요(🧠 전략가·🔍 관찰자는 빠르고, 💓 직감파는 실수가 잦아요).</div>`;
window.GAMES.firstcome = { _sync:x=>syncH(x), maxH:6,
  title:'선착순', ref:'피의 게임 「선착순」', emoji:'🔐', tags:['퍼즐','순발력','NPC','두뇌서바이벌'],
  tagline:'묶인 채로 정글에서 눈을 뜬다. 숫자 규칙 자물쇠 3개를 먼저 연 사람이 저택에 들어간다.',
  guide, init, apply, mask, ai, aiDelay, render, status, step, stepDelay, noPersona:true, wide:true,
  reset(){ code=''; lastL=-1; clearInterval(tick); tick=null; },
  bar:(v,i)=>`<span class="tag">${[0,1,2].map(k=>k<v.prog[HSEAT[i]]?'🔓':'🔒').join('')}</span>`,
  result:(v,ctx)=>{ const k=v.rank.indexOf(HSEAT[ctx.me]); return k>=0?`${k+1}등`:''; },
  _solve:solveLine, _line:seqLine,
};
})();
