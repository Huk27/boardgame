(function(){
'use strict';
/* 오름차순 (피의 게임 시즌 2 · 2일차 머니 챌린지) — 6인(우리 둘 + NPC 4명)용.
   각자 10칸 시트. 라운드 시작에 딜러룸에서 1~10 중 무작위 숫자를 받아 "그 숫자 번 칸"에 자동 기입(나만 앎).
   이어서 한 명씩 1~10 중 숫자를 선언(중복 가능) → 모두가 그 숫자를 자기 시트의 빈칸 하나에 적는다. 선언 9번이면 10칸이 다 참.
   시트에서 왼쪽→오른쪽으로 "같거나 커지는" 가장 긴 연속 칸 수가 그 라운드 점수. 2라운드 합계 1등 승리, 꼴찌는 탈락 후보.
   원작(9인)의 순서 경매는 뺐고, 선언 순서는 한 바퀴 반(라운드마다 시작 자리를 바꿈). 시트는 라운드가 끝날 때까지 서로 안 보임. */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로, 나머지는 NPC */
const N=6, L=10, DECL=9, ROUNDS=2; let HSEAT=[0,3]; const SEATORD=[0,3,1,4,2,5];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i), ALL=[...Array(N).keys()];
const nm=i=>`{s${i}}`;
const DEF_P={talk:.6,aggr:.5,trust:.5,bluff:.5,logic:.6,temper:.4};
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
function run(sh){ let best=0, cur=0, prev=-1; for(const x of sh){ if(x==null){ cur=0; prev=-1; continue; } if(prev<0||x>=prev) cur++; else cur=1; prev=x; best=Math.max(best,cur); } return best; }
/* 시트 전망: 끊기지 않을 수 있는 구간마다, 빈칸은 "앞뒤 숫자 사이에 맞는 숫자가 나올 확률"로 더해 가장 큰 값 */
function outlook(sh){ let best=0;
  for(let i=0;i<L;i++){ let e=i, last=0; while(e<L){ const x=sh[e]; if(x!=null){ if(x<last) break; last=x; } e++; }
    let v=0; for(let k=i;k<e;k++){ if(sh[k]!=null){ v+=1; continue; }
      let lo=1, hi=10; for(let q=k-1;q>=i;q--) if(sh[q]!=null){ lo=sh[q]; break; } for(let q=k+1;q<e;q++) if(sh[q]!=null){ hi=sh[q]; break; }
      v+=Math.max(0,hi-lo+1)/10; }
    if(v>best) best=v; }
  return best; }
function bestPlace(sh,n,noise=0){ let bc=-1, bv=-1e9; for(let c=0;c<L;c++) if(sh[c]==null){ const t=sh.slice(); t[c]=n; const v=outlook(t)+(noise?Math.random()*noise:0)-Math.abs(c-(n-1))*.01; if(v>bv){ bv=v; bc=c; } } return {c:bc, v:bv}; }

function init(starter,o){ const k=Math.max(2,Math.min(6,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  const s={phase:'intro', who:{}, round:0, sheet:ALL.map(()=>Array(L).fill(null)), rnd:Array(N).fill(null), score:ALL.map(()=>[]), decl:[], order:[], di:0,
    placed:Array(N).fill(true), dealt:0, rv:0, used:{}, say:null, q:[], log:[], turn:null, starter, winner:null, ev:0, think:0,
    notice:'🎙️ 머니 챌린지 「오름차순」 — 시트 10칸을 오름차순으로 채우세요'};
  s.hs=HSEAT.slice(); const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=ids[k]);
  return s;
}
function startRound(s){ s.round++; s.sheet=ALL.map(()=>Array(L).fill(null)); s.rnd=Array(N).fill(null); s.decl=[]; s.di=0; s.dealt=0;
  const st=(HSEAT[s.starter]+(s.round-1)*3)%N; s.order=[...Array(DECL)].map((_,k)=>(st+k)%N);
  s.phase='deal'; s.notice=`🎙️ ${s.round}라운드 — 한 명씩 딜러룸에 들어갑니다`; s.log.push(`— ${s.round}라운드 · 선언 순서 ${s.order.map(nm).join(' ')} —`); }
function startDecl(s){ if(s.di>=DECL){ s.phase='reveal'; s.rv=0; s.notice='🎙️ 시트를 한 명씩 공개합니다'; return; }
  const i=s.order[s.di]; s.actor=i; s.phase='decl'; s.notice=`📣 ${s.di+1}번째 선언 — ${nm(i)}`;
  if(isH(i)) s.turn=pOf(i); else { s.turn=null; s.think=1200+P(s,i).logic*900+Math.random()*1200; } }
function declare(s,i,n){ s.decl.push({by:i,n}); s.log.push(`📣 ${nm(i)}: "${n}!"`); s.say={seat:i,text:`${n}!`,n:(s.say?s.say.n:0)+1}; s.cur=n;
  s.phase='place'; s.turn=null; s.placed=ALL.map(j=>false); s.reacts=[]; s.pi=0; s.notice=`✍️ 모두 ${n}을(를) 빈칸에 적는 중…`; }
function placeNum(s,i,c){ s.sheet[i][c]=s.cur; s.placed[i]=true; }
function npcPlace(s,i){ const p=P(s,i), before=outlook(s.sheet[i]); const b=bestPlace(s.sheet[i],s.cur,(1-p.logic)*1.2); placeNum(s,i,b.c);
  const after=outlook(s.sheet[i]); const d=after-before; if(Math.random()<p.talk*.5){ if(d<.25) s.reacts.push({i,kind:'bad'}); else if(d>.85) s.reacts.push({i,kind:'good'}); } }
const RL={bad:['아… 그 숫자 필요 없는데 😩','하… 들어갈 데가 없어요','누가 그걸 불러요 😤','망했다…'], good:['오 딱 좋아요 😏','완벽해요!','고마워요~ 😆','좋아 좋아']};
function lineOf(s,i,kind){ const used=(s.used[i]=s.used[i]||[]); const pool=RL[kind].filter(x=>!used.includes(x)); const t=U.pick(pool.length?pool:RL[kind]); used.push(t); return t; }
function npcDeclare(s,i){ const p=P(s,i), sh=s.sheet[i]; let bn=1, bv=-1e9;
  for(let n=1;n<=10;n++){ const v=bestPlace(sh,n).v+(Math.random()-.5)*(1-p.logic)*1.5; if(v>bv){ bv=v; bn=n; } } return bn; }
function apply(s,p,a){ syncH(s);
  if(s.winner!=null) return '게임이 끝났어요';
  const seat=HSEAT[p]; if(!a) return '알 수 없는 동작';
  if(a.k==='decl'){ if(s.phase!=='decl'||s.actor!==seat) return '내 선언 차례가 아니에요'; const n=a.n|0; if(n<1||n>10) return '1~10 중에서 고르세요'; declare(s,seat,n); s.ev++; return null; }
  if(a.k==='place'){ if(s.phase!=='place') return '지금은 적을 때가 아니에요'; if(s.placed[seat]) return '이미 적었어요'; const c=a.c|0; if(!(c>=0&&c<L)||s.sheet[seat][c]!=null) return '빈칸을 고르세요'; placeNum(s,seat,c); s.ev++; return null; }
  return '알 수 없는 동작';
}
function stepDelay(s){ syncH(s);
  if(s.winner!=null) return null;
  if(s.phase==='intro') return 2400;
  if(s.phase==='deal') return s.dealt<N?650:900;
  if(s.phase==='decl') return isH(s.actor)?null:s.think;
  if(s.phase==='place'){ if(s.pi<N){ const i=ALL[s.pi]; return isH(i)?(s.placed[i]?150:null):350+Math.random()*450; } return s.reacts.length?1300:700; }
  if(s.phase==='reveal') return s.rv<N?1500:2200;
  if(s.phase==='rend') return 2600;
  return null;
}
function step(s){ syncH(s);
  if(s.phase==='intro'){ startRound(s); s.ev++; return; }
  if(s.phase==='deal'){ if(s.dealt<N){ const i=s.dealt++; const r=1+(Math.random()*10|0); s.rnd[i]=r; s.sheet[i][r-1]=r; s.notice=`🚪 ${nm(i)} 딜러룸 — 숫자를 받았습니다`; s.ev++; return; }
    s.log.push('🎲 모두 딜러룸에서 숫자를 받았어요 (각자 그 숫자 번 칸에 기입)'); startDecl(s); s.ev++; return; }
  if(s.phase==='decl'&&!isH(s.actor)){ declare(s,s.actor,npcDeclare(s,s.actor)); s.ev++; return; }
  if(s.phase==='place'){ if(s.pi<N){ const i=ALL[s.pi]; if(!isH(i)) npcPlace(s,i); if(s.placed[i]){ s.pi++; s.notice=`✍️ ${s.cur} 기입 중 (${s.pi}/${N})`; } s.ev++; return; }
    if(s.reacts.length){ const r=s.reacts.shift(); const t=lineOf(s,r.i,r.kind); s.say={seat:r.i,text:t,n:(s.say?s.say.n:0)+1}; s.log.push(`${nm(r.i)}: ${t}`); s.ev++; return; }
    s.di++; startDecl(s); s.ev++; return; }
  if(s.phase==='reveal'){ if(s.rv<N){ const i=ALL[s.rv++]; const sc=run(s.sheet[i]); s.score[i].push(sc); s.notice=`📋 ${nm(i)} — 오름차순 ${sc}칸`; s.log.push(`📋 ${nm(i)}: ${s.sheet[i].join(' ')} → ${sc}점`); s.ev++; return; }
    s.phase='rend'; const tot=ALL.map(i=>s.score[i].reduce((a,b)=>a+b,0)); const lead=ALL.slice().sort((a,b)=>tot[b]-tot[a])[0]; s.notice=`🎙️ ${s.round}라운드 끝 — 선두 ${nm(lead)} (${tot[lead]}점)`; s.ev++; return; }
  if(s.phase==='rend'){ if(s.round<ROUNDS){ startRound(s); s.ev++; return; } endGame(s); return; }
}
function endGame(s){ s.phase='over'; s.turn=null; const tot=ALL.map(i=>s.score[i].reduce((a,b)=>a+b,0));
  s.rank=ALL.slice().sort((a,b)=>tot[b]-tot[a]||s.score[b][ROUNDS-1]-s.score[a][ROUNDS-1]); s.tot=tot;
  const top=s.rank[0], low=s.rank[N-1]; s.notice=`🎙️ 우승 ${nm(top)} (${tot[top]}점) · 탈락 후보 ${nm(low)} (${tot[low]}점)`; s.log.push(s.notice.replace('🎙️ ','🏁 '));
  const a=tot[HSEAT[0]], b=tot[HSEAT[1]]; s.winner = a>b?0 : b>a?1 : 'both'; { const V=h=>tot[h], bv=Math.max(...HSEAT.map(V)); s.winners=HSEAT.map((h,p)=>V(h)===bv?p:-1).filter(x=>x>=0); } s.ev++; }
function mask(s,p){ syncH(s); const v=U.clone(s), me=HSEAT[p], open=s.phase==='reveal'||s.phase==='rend'||s.phase==='over';
  v.sheet=s.sheet.map((sh,i)=> i===me || (open && (s.phase!=='reveal'||i<s.rv)) ? sh : sh.map(x=>x==null?null:'?'));
  v.rnd=s.rnd.map((x,i)=>i===me||open?x:null); v.q=[]; v.used={}; v.think=null; v.reacts=[]; return v; }
function ai(v,lvl=1){ syncH(v); const seat=HSEAT[1];
  if(v.phase==='decl'&&v.actor===seat){ let bn=1,bv=-1e9; for(let n=1;n<=10;n++){ const x=bestPlace(v.sheet[seat],n).v; if(x>bv){bv=x;bn=n;} } return {k:'decl',n:bn}; }
  if(v.phase==='place'&&!v.placed[seat]) return {k:'place', c:bestPlace(v.sheet[seat],v.cur,lvl===0?1.5:lvl===1?.3:0).c};
  return null; }

/* 화면 */
let WHO={};
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function josa(n,a,b){ const x=n.replace(/\(나\)$/,''), c=x.charCodeAt(x.length-1); return c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28?a:b; }
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}(이\(가\))?/g,(_,d,j)=>{ const n=seatName(+d,ctx); return `${seatEmoji(+d)} ${n}${j?josa(n,'이','가'):''}`; }); }
function runCells(sh){ // 점수 칸 표시용
  let best=[0,0], cur=0, st=0, prev=-1; sh.forEach((x,k)=>{ if(x==null||x==='?'){ cur=0; prev=-1; return; } if(prev<0||x>=prev){ if(cur===0) st=k; cur++; } else { cur=1; st=k; } prev=x; if(cur>best[1]) best=[st,cur]; }); return new Set([...Array(best[1])].map((_,k)=>best[0]+k)); }
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{}; const me=HSEAT[ctx.me], my=v.sheet[me];
  const tot=ALL.map(i=>v.score[i].reduce((a,b)=>a+b,0));
  let h=`<div class="hl-notice">${fill(U.esc(v.notice||''),ctx)}</div>`;
  h+=`<div class="vr-speech">${v.say?`<span class="w">${seatEmoji(v.say.seat)} ${seatName(v.say.seat,ctx)}</span> ${U.esc(v.say.text)}`:'<i>　</i>'}</div>`;
  h+=`<div class="info">${v.round}/${ROUNDS}라운드 · 선언 ${Math.min(v.decl.length,DECL)}/${DECL}${v.cur&&v.phase==='place'?` · 지금 숫자 <b class="as-cur">${v.cur}</b>`:''}${v.rnd[me]?` · 내 딜러룸 숫자 ${v.rnd[me]}`:''}</div>`;
  const canPlace=v.phase==='place'&&!v.placed[me], rc=runCells(my);
  h+=`<div class="as-sheet me">${my.map((x,c)=>`<button class="as-c ${x==null?'e':''} ${rc.has(c)?'run':''} ${v.rnd[me]&&c===v.rnd[me]-1&&x===v.rnd[me]?'rnd':''}" data-c="${c}" ${canPlace&&x==null?'':'disabled'}><i>${c+1}</i>${x==null?(canPlace?`<span class="as-gh">${v.cur}</span>`:''):x}</button>`).join('')}</div>`;
  h+=`<div class="info">지금 내 오름차순: <b>${run(my)}</b>칸${canPlace?' · 빈칸을 눌러 적으세요':''}</div>`;
  if(v.phase==='decl'&&v.actor===me&&v.turn===ctx.me) h+=`<div class="vr-card"><b>📣 숫자를 선언하세요</b><p>모두가 이 숫자를 적어야 해요. 내 시트에 좋은 숫자를!</p><div class="as-pick">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<button data-n="${n}">${n}</button>`).join('')}</div></div>`;
  // 다른 사람 시트
  h+=`<div class="as-others">${ALL.filter(i=>i!==me).map(i=>{ const sh=v.sheet[i], rc2=runCells(sh); return `<div class="as-row"><span class="as-who">${seatEmoji(i)} ${seatName(i,ctx)} <small>${tot[i]}점</small></span><div class="as-sheet mini">${sh.map((x,c)=>`<span class="as-c ${x==null?'e':''} ${x!=='?'&&rc2.has(c)?'run':''}">${x==null?'':x}</span>`).join('')}</div></div>`; }).join('')}</div>`;
  if(v.phase==='over') h+=`<div class="sn-score">${v.rank.map((i,k)=>`<div class="${isH(i)?'h':''}"><b>${k+1}등 ${seatEmoji(i)} ${seatName(i,ctx)}</b> ${v.score[i].join(' + ')} = ${tot[i]}점${k===0?' 🏆':''}${k===N-1?' 💀 탈락 후보':''}</div>`).join('')}</div>`;
  const Lb=`<div class="side-box"><div class="side-h">📣 선언된 숫자 <small>${v.round}라운드</small></div><div class="as-decl">${v.decl.map(d=>`<span title="${seatName(d.by,ctx)}">${seatEmoji(d.by)}<b>${d.n}</b></span>`).join('')||'-'}</div>
    <div class="side-h" style="margin-top:6px">📊 점수</div>${ALL.slice().sort((a,b)=>tot[b]-tot[a]).map(i=>`<div class="side-row ${i===me?'me':''}">${seatEmoji(i)} ${seatName(i,ctx)} <span>${v.score[i].join('+')||'-'} = ${tot[i]}</span></div>`).join('')}</div>`;
  const R=`<div class="side-box side-log"><div class="side-h">📜 진행 기록 <small>최근이 위</small></div>${v.log.slice(-50).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=`<div class="side3"><div class="side-mid">${h}</div><aside class="side-l">${Lb}</aside><aside class="side-r">${R}</aside></div>`;
  el.onclick=e=>{ const n=e.target.closest('[data-n]'); if(n) return ctx.act({k:'decl',n:+n.dataset.n}); const c=e.target.closest('[data-c]'); if(c&&!c.disabled) return ctx.act({k:'place',c:+c.dataset.c}); };
}
function status(v,ctx){ syncH(v); const me=HSEAT[ctx.me]; if(v.phase==='over') return ''; if(v.phase==='decl'&&v.actor===me) return '숫자를 선언하세요'; if(v.phase==='place'&&!v.placed[me]) return `${v.cur}을(를) 빈칸에 적으세요`; return '진행 중…'; }
const guide=`
<p><b>숫자를 받아 적어 오름차순 만들기</b> (우리 둘 + 컴퓨터 플레이어 4명, 2라운드).</p>
<ol><li>라운드 시작: 딜러룸에서 1~10 중 무작위 숫자를 받아 <b>그 숫자 번 칸</b>에 자동으로 적혀요(나만 알아요).</li>
<li>한 명씩 돌아가며 1~10 중 숫자를 <b>선언</b>(이미 나온 숫자도 OK). <b>모두가</b> 그 숫자를 자기 시트 빈칸 하나에 적어요. 선언 ${DECL}번이면 10칸이 다 차요.</li>
<li>왼쪽부터 <b>같거나 커지며 이어진 가장 긴 칸 수</b>가 점수(예: 2 3 3 7 9 → 5칸).</li></ol>
<p>2라운드 합계 1등 🏆, 꼴찌는 💀 탈락 후보. 사람끼리는 점수가 가장 높은 사람이 승리. 시트는 라운드가 끝날 때 공개돼요.</p>
<div class="tipbox">💡 숫자 n은 대충 n번 칸 근처에 — 하지만 같은 숫자가 또 나올 수 있으니 여유를 남기세요. 내 선언 차례엔 내 시트에 딱 맞는 숫자를!<br>· 원작(9인)의 선언 순서 경매는 뺐어요. 선언은 한 바퀴 반, 라운드마다 시작 자리가 바뀌어요.</div>`;
window.GAMES.ascend = { _sync:x=>syncH(x), maxH:6,
  title:'오름차순', ref:'피의 게임 「오름차순」', emoji:'📈', tags:['숫자','운+전략','NPC','두뇌서바이벌'],
  tagline:'모두가 같은 숫자를 받아 적는다. 내 시트만 오름차순으로 길게 이어 붙여라.',
  guide, init, apply, mask, ai, render, status, step, stepDelay, noPersona:true, wide:true,
  aiDelay:()=>1200+Math.random()*1300,
  bar:(v,i)=>`<span class="tag">📈 ${v.score[HSEAT[i]].reduce((a,b)=>a+b,0)}점</span>`,
  result:(v,ctx)=>{ const k=(v.rank||[]).indexOf(HSEAT[ctx.me]); return k>=0?`${k+1}등 · ${v.tot[HSEAT[ctx.me]]}점`:''; },
  _run:run, _best:bestPlace, _outlook:outlook,
};
})();
