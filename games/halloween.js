(function(){
'use strict';
/* 핼러윈 몬스터 (6인: 우리 둘 + NPC 4명, 동맹 없음). 전장 3곳, 몬스터 10마리 대기열.
   모두 승점 5 + 🗡️단검(3, 계속 씀). 라운드마다 모두 동시에 몰래 전장·무기를 고름 → 승점 높은 순서로 한 명씩 공격.
   남은 체력·누가 어디를 쳤는지는 비밀, 처치만 공개(막타 친 사람이 몬스터 체력만큼 승점 + 전리품).
   특수 무기(한 번 쓰면 사라짐): ☠️독 1(죽을 때까지 매 턴 1) · 🧊얼음 3(내 다음 차례까지 피해 무효) · ⚔️쌍검 4(두 전장이면 2씩) · 💣수류탄 6 · ⏰시한폭탄 10(다음 라운드 내 차례에 터짐).
   몬스터가 모두 쓰러지면(또는 10라운드) 끝, 승점 1등이 이김. */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로, 나머지는 NPC */
const N=6, FIELDS=3, MAXR=10; let HSEAT=[0,3]; const SEATORD=[0,3,1,4,2,5];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i);
const ALL=[...Array(N).keys()];
const MON=[['🎃','잭오랜턴',5,['poison']],['🌳','나무 괴물',9,['grenade','twin']],['🧙','마녀',15,['bomb','bonus']],['🧛','드라큘라',10,['ice','twin']],['🐺','늑대인간',5,['grenade']],
  ['🧟‍♂️','미라유령',7,['grenade','poison']],['🧟','프랑켄슈타인',9,['bomb','twin']],['🧠','좀비',13,['ice','grenade']],['🗿','가고일',9,['bomb']],['🤡','삐에로',12,['grenade','grenade']],['👹','도깨비',18,['grenade','bonus']],['🐍','메두사',15,['bonus']]];
const W={dagger:['🗡️','단검',3],poison:['☠️','독',1],ice:['🧊','얼음',3],twin:['⚔️','쌍검',4],grenade:['💣','수류탄',6],bomb:['⏰','시한폭탄',10]};
const STYLE={seojin:'logic', doyun:'emo', haram:'calm', yuna:'emo', minho:'sly', taekyung:'emo', jihu:'sly', soyul:'logic'};
const DEF_P={talk:.6,aggr:.5,trust:.5,bluff:.5,logic:.6,temper:.4};
const nm=i=>`{s${i}}`;
const mname=m=>`${m.e} ${m.n}`;

function init(starter,o){ const k=Math.max(2,Math.min(6,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  const q=U.shuffle(MON.slice()).slice(0,10).map(([e,n,hp,loot],k)=>({id:k,e,n,max:hp,hp,loot:loot.slice()}));
  const s={queue:q.slice(FIELDS), field:q.slice(0,FIELDS).map(m=>({m,poison:null,ice:null})), score:Array(N).fill(5), inv:ALL.map(()=>[]),
    round:0, ord:[], cur:-1, picks:Array(N).fill(null), done:HSEAT.map(()=>false), bombs:[], kills:[], dealt:ALL.map(()=>({})), phase:'intro', q:[],
    who:{}, used:{}, say:null, log:[], turn:null, starter, winner:null, notice:'🎙️ 핼러윈 몬스터 사냥을 시작합니다! 막타를 친 사람이 승점을 가져가요', ev:0};
  s.hs=HSEAT.slice(); const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=ids[k]);
  return s;
}
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
const alive=s=>s.field.filter(f=>f.m).length;

function startRound(s){
  if(!alive(s)){ return endGame(s); }
  s.round++; if(s.round>MAXR) return endGame(s);
  const prev=s.ord.slice();
  s.ord=ALL.slice().sort((a,b)=>s.score[b]-s.score[a] || (prev.indexOf(a)-prev.indexOf(b)) || Math.random()-.5);
  s.picks=Array(N).fill(null); s.done=HSEAT.map(()=>false); s.cur=-1; s.phase='pick';
  for(const i of ALL) if(!isH(i)) s.picks[i]=npcPick(s,i);
  s.notice=`🎙️ ${s.round}라운드 — 몰래 전장과 무기를 고르세요 (공격 순서: 승점 높은 순)`; s.log.push(`— ${s.round}라운드 · 순서 ${s.ord.map(nm).join(' → ')} —`);
}
function nextAttack(s){
  s.cur++; if(s.cur>=N){ s.phase='roundEnd'; s.notice=`🎙️ ${s.round}라운드 끝`; return; }
  const i=s.ord[s.cur]; s.actor=i; s.phase='attack';
  s.notice=`⚔️ ${s.cur+1}번째 공격자가 움직입니다…`;
}
function dmg(s,fi,amount,by,src){   // 전장 fi에 피해 — 얼음이면 무효, 죽으면 막타 처리
  const f=s.field[fi]; if(!f.m||amount<=0) return;
  if(f.ice && !iceOver(s,f.ice)) return;
  f.m.hp-=amount; s.dealt[by][f.m.id]=(s.dealt[by][f.m.id]||0)+amount;
  if(f.m.hp<=0) kill(s,fi,by,src);
}
const iceOver=(s,ice)=> s.round>ice.r || (s.round===ice.r && s.cur>=ice.idx);
function kill(s,fi,by,src){
  const f=s.field[fi], m=f.m; s.score[by]+=m.max; const loot=m.loot.filter(x=>x!=='bonus'); const bonus=m.loot.includes('bonus')?3:0; s.score[by]+=bonus;
  s.inv[by].push(...loot); s.kills.push({r:s.round,by,m:{id:m.id,e:m.e,n:m.n,max:m.max},src,loot,bonus});
  const text=`💀 ${mname(m)} 처치! — ${nm(by)} +${m.max}점${bonus?` (+보너스 ${bonus})`:''}${loot.length?` · 전리품 ${loot.map(x=>W[x][0]+W[x][1]).join(', ')}`:''}${src!=='hit'?` (${src==='poison'?'☠️ 독':'⏰ 시한폭탄'})`:''}`;
  s.q.push({k:'note',text}); s.q.push({k:'react',kind:'kill',i:by});
  const nx=s.queue.shift(); if(nx) nx.since=s.round; f.m=nx||null; f.poison=null; f.ice=null;
  if(nx) s.q.push({k:'note',text:`🆕 ${fi+1}번 전장에 ${mname(nx)}(체력 ${nx.max}) 등장!`});
}
function resolveTurn(s){   // 현재 공격자 차례: 얼음 해제 → 무기 → 시한폭탄 → 독
  const i=s.actor, pk=s.picks[i];
  const w=pk.w; if(w!=='dagger'){ const k=s.inv[i].indexOf(w); if(k>=0) s.inv[i].splice(k,1); }
  if(w==='twin' && pk.f2!=null && pk.f2!==pk.f){ dmg(s,pk.f,2,i,'hit'); dmg(s,pk.f2,2,i,'hit'); }
  else if(w==='poison'){ dmg(s,pk.f,1,i,'hit'); if(s.field[pk.f].m) s.field[pk.f].poison=i; }
  else if(w==='ice'){ dmg(s,pk.f,3,i,'hit'); if(s.field[pk.f].m) s.field[pk.f].ice={r:s.round+1, idx:s.ord.indexOf(i), by:i}; }
  else if(w==='bomb'){ s.bombs.push({by:i,f:pk.f,r:s.round+1}); }
  else dmg(s,pk.f,W[w][2],i,'hit');
  for(const b of s.bombs.filter(b=>b.by===i&&b.r===s.round)){ s.q.push({k:'note',text:`⏰ ${b.f+1}번 전장에서 시한폭탄이 터졌어요!`}); dmg(s,b.f,10,i,'bomb'); }
  s.bombs=s.bombs.filter(b=>!(b.by===i&&b.r===s.round));
  s.field.forEach((f,fi)=>{ if(f.m && f.poison!=null) dmg(s,fi,1,f.poison,'poison'); });
}
function endGame(s){
  s.phase='over'; s.turn=null;
  s.rank=ALL.slice().sort((a,b)=>s.score[b]-s.score[a]); s.winner=isH(s.rank[0])?pOf(s.rank[0]):'none'; s.winners=isH(s.rank[0])?[pOf(s.rank[0])]:[];
  s.notice=`🎙️ 사냥 끝! 1등 ${nm(s.rank[0])} ${s.score[s.rank[0]]}점`; s.log.push(s.notice);
}

/* ── NPC: 남은 체력을 추정해 막타 노리기 ── */
function estHP(s,i,f){ if(!f.m) return 0; const mine=s.dealt[i][f.m.id]||0;
  const others=s.kills.length; // 대략: 매 라운드 다른 사람들 피해의 1/3쯤이 이 전장에
  const roundsOn=Math.max(0, s.round-1 - (f.m.since||0)); const est=f.m.max-mine-roundsOn*5*3.4/FIELDS;
  return Math.max(1, est); }
function npcPick(s,i){
  const p=P(s,i), myIdx=s.ord.indexOf(i), before=myIdx;   // 내 앞 공격자 수
  const weapons=['dagger',...new Set(s.inv[i])];
  let best=null;
  s.field.forEach((f,fi)=>{ if(!f.m) return;
    const est=estHP(s,i,f) - before*3.4/FIELDS*(1+(Math.random()-.5)*(1-p.logic));   // 내 차례 전까지 깎일 양
    for(const w of weapons){ if(w==='bomb'&&s.round>=MAXR) continue;
      const d = w==='bomb' ? 0 : W[w][2];
      const kill = d>=est ? 1 : Math.max(0, 1-(est-d)/6);
      let v = kill*f.m.max*(w==='dagger'?1:.9) + (w==='poison'?f.m.max*.25:0) + (w==='bomb'&&est>6?f.m.max*.45:0);
      if(w!=='dagger') v -= (1-p.aggr)*2.2*(p.logic>.6?1:.5);   // 아끼는 성향
      v += Math.random()*(1.6-p.logic);
      if(!best||v>best.v) best={v,f:fi,w};
    } });
  if(!best) return {f:0,w:'dagger'};
  if(best.w==='twin'){ const others=s.field.map((f,fi)=>fi).filter(fi=>fi!==best.f&&s.field[fi].m); if(others.length&&Math.random()<.4) return {f:best.f,w:'twin',f2:U.pick(others)}; }
  return {f:best.f,w:best.w};
}

/* ── 말 ── */
const LINES={
  sly:{kill:['후후, 막타는 제 거예요~ 😏','잘 먹겠습니다~'], stolen:['어머, 다 깎아 놨더니~ 😏']},
  calm:{kill:['처치.'], stolen:['…빼앗겼네요.']},
  logic:{kill:['남은 체력 계산이 맞았네요.','순서상 제 차례에 끝날 거라 봤어요.'], stolen:['제가 깎아 둔 걸 가져갔네요. 기록해 둘게요.']},
  emo:{kill:['잡았다아!! 🎃','막타 성공!! 🥳'], stolen:['아 내가 다 깎았는데!! 😭']},
};
function lineOf(s,seat,kind){ const p=P(s,seat), st=STYLE[p.id]||'calm', L=(LINES[st]||{})[kind]; if(!L) return null;
  const used=(s.used[seat]=s.used[seat]||[]), pool=L.filter(x=>!used.includes(x)); if(!pool.length) return null; const raw=U.pick(pool); used.push(raw); return raw; }

/* ── 시간 흐름 ── */
function stepDelay(s){ syncH(s);
  if(s.winner!=null) return null;
  if(s.phase==='intro') return 2200;
  if(s.q.length) return s.q[0].k==='note'?1500:1100;
  if(s.phase==='pick') return s.done.every(Boolean)?800:null;
  if(s.phase==='attack') return 1100+Math.random()*500;
  if(s.phase==='reveal') return 900;
  if(s.phase==='roundEnd') return 1500;
  return null;
}
function step(s){ syncH(s);
  if(s.phase==='intro'){ startRound(s); return; }
  if(s.q.length){ const e=s.q.shift();
    if(e.k==='note'){ s.notice=e.text; s.log.push(e.text); }
    else if(e.k==='react'){ if(!isH(e.i)&&Math.random()<.7){ const t=lineOf(s,e.i,'kill'); if(t){ s.say={seat:e.i,text:t,n:(s.say?s.say.n:0)+1}; s.log.push(`${nm(e.i)}: ${t}`); } }
      const k=s.kills[s.kills.length-1]; const robbed=ALL.filter(j=>j!==e.i&&!isH(j)&&(s.dealt[j][k.m.id]||0)>=k.m.max*.4);
      if(robbed.length) s.q.splice(0,0,{k:'say',seat:robbed[0],kind:'stolen'}); }
    else if(e.k==='say'){ const t=lineOf(s,e.seat,e.kind); if(t){ s.say={seat:e.seat,text:t,n:(s.say?s.say.n:0)+1}; s.log.push(`${nm(e.seat)}: ${t}`); } }
    s.ev++; return; }
  if(s.phase==='pick'&&s.done.every(Boolean)){ s.notice='🎙️ 모두 골랐어요. 순서대로 공격합니다!'; s.phase='reveal'; return; }
  if(s.phase==='reveal'){ nextAttack(s); return; }
  if(s.phase==='attack'){ resolveTurn(s); if(!alive(s)&&!s.queue.length){ s.q.push({k:'note',text:'🎙️ 몬스터가 모두 쓰러졌어요!'}); s.phase='roundEnd'; s.cur=N; } else s.phase='reveal'; s.ev++; return; }
  if(s.phase==='roundEnd'){ startRound(s); return; }
}
function apply(s,p,a){ syncH(s);
  if(s.winner!=null) return '게임이 끝났어요';
  const seat=HSEAT[p];
  if(!a||a.k!=='pick') return '알 수 없는 동작';
  if(s.phase!=='pick'||s.done[p]) return '지금은 고를 때가 아니에요';
  const f=a.f|0, w=a.w; if(!s.field[f]||!s.field[f].m) return '전장을 고르세요';
  if(!W[w]) return '무기를 고르세요'; if(w!=='dagger'&&!s.inv[seat].includes(w)) return '그 무기가 없어요';
  let f2=null; if(w==='twin'&&a.f2!=null&&a.f2!==f){ f2=a.f2|0; if(!s.field[f2]||!s.field[f2].m) return '두 번째 전장을 다시 고르세요'; }
  s.picks[seat]={f,w,f2}; s.done[p]=true; s.ev++; return null;
}
function mask(s,p){ syncH(s);
  const v=U.clone(s), me=HSEAT[p], over=s.phase==='over';
  if(!over){ v.field=s.field.map(f=>({...f, m:f.m?{...f.m,hp:null}:null, poison:f.poison===me?me:(f.poison!=null?'?':null), ice:f.ice?{by:f.ice.by===me?me:'?'}:null}));
    v.queue=s.queue.map(m=>({...m,hp:null}));
    v.picks=s.picks.map((x,i)=>i===me?x:null); v.dealt=ALL.map((_,i)=>i===me?s.dealt[i]:{}); v.bombs=s.bombs.filter(b=>b.by===me); }
  v.q=[]; v.used={};
  return v;
}
function ai(v){ syncH(v); const seat=HSEAT[1]; if(v.phase!=='pick'||v.done[1]) return null;
  const fs=v.field.map((f,fi)=>fi).filter(fi=>v.field[fi].m); const f=fs.sort((a,b)=>v.field[a].m.max-v.field[b].m.max)[0];
  const w=v.inv[seat].includes('grenade')&&Math.random()<.5?'grenade':'dagger'; return {k:'pick',f,w}; }

/* ── 화면 ── */
let WHO={}, selF=null, selF2=null, selW='dagger', sig='';
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}/g,(_,d)=>`${seatEmoji(+d)} ${seatName(+d,ctx)}`); }
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{};
  const me=HSEAT[ctx.me], picking=v.phase==='pick'&&!v.done[ctx.me];
  const sg=v.phase+':'+v.round; if(sg!==sig){ sig=sg; selF=null; selF2=null; selW='dagger'; }
  if(selW!=='dagger'&&!v.inv[me].includes(selW)) selW='dagger';
  let h=`<div class="info">${v.round||'-'} / ${MAXR}라운드 · ⭐ 내 승점 <b>${v.score[me]}</b> · 남은 몬스터 ${v.queue.length+v.field.filter(f=>f.m).length}</div>`;
  h+=`<div class="hl-notice">${fill(v.notice||'',ctx)}</div>`;
  h+=`<div class="vr-speech">${v.say?`<span class="w">${seatEmoji(v.say.seat)} ${seatName(v.say.seat,ctx)}</span> ${fill(U.esc(v.say.text),ctx)}`:'<i>　</i>'}</div>`;
  h+=`<div class="hw-fields">${v.field.map((f,fi)=>{ const m=f.m; const mine=m?(v.dealt[me][m.id]||0):0;
    return `<button class="hw-f ${selF===fi?'sel':''} ${selF2===fi?'sel2':''}" data-f="${fi}" ${picking&&m?'':'disabled'}><small>${fi+1}번 전장</small>${m?`<span class="hw-m">${m.e}</span><b>${m.n}</b><span>♥ ${v.phase==='over'?m.hp:'?'} / ${m.max}</span><span class="hw-mine">내가 준 피해 ${mine}</span><span class="hw-loot">전리품 ${m.loot.map(x=>x==='bonus'?'⭐+3':W[x][0]).join(' ')}</span>${f.poison!=null?'<i class="hw-st">☠️</i>':''}${f.ice?'<i class="hw-st">🧊</i>':''}`:'<span>— 비었음 —</span>'}</button>`; }).join('')}</div>`;
  h+=`<div class="hw-queue">대기열 ${v.queue.map(m=>`<span title="${m.n} ♥${m.max}">${m.e}<small>${m.max}</small></span>`).join('')||'없음'}</div>`;
  if(picking){
    const ws=['dagger',...new Set(v.inv[me])];
    h+=`<div class="vr-card"><b>🗡️ 몰래 고르기</b><p>${selF==null?'위에서 전장을 누르세요':`${selF+1}번 전장 · `}무기: ${ws.map(w=>`<button class="${selW===w?'':'ghost'} small" data-w="${w}">${W[w][0]} ${W[w][1]} ${W[w][2]}${w!=='dagger'?` ×${v.inv[me].filter(x=>x===w).length}`:''}</button>`).join(' ')}</p>
      ${selW==='twin'?`<p><small>쌍검: 다른 전장을 한 번 더 누르면 두 곳에 2씩 (지금 ${selF2!=null?`${selF2+1}번도`:'한 곳에 4'})</small></p>`:''}
      <div class="fh-act"><button data-a="go" ${selF!=null?'':'disabled'}>이걸로 공격 예약</button></div><small>내 공격 순서: ${v.ord.indexOf(me)+1}번째 (승점 높은 순)</small></div>`;
  } else if(v.phase==='pick') h+=`<div class="info">골랐어요 — 다른 사람들을 기다리는 중… 🤫</div>`;
  if(v.phase==='over'&&v.rank) h+=`<div class="sn-score">${v.rank.map((i,k)=>`<div class="${isH(i)?'h':''}"><b>${k+1}등 ${seatEmoji(i)} ${seatName(i,ctx)} ${v.score[i]}점</b> <small>처치 ${v.kills.filter(x=>x.by===i).length}마리</small></div>`).join('')}</div>`;
  const L=`<div class="side-box"><div class="side-h">🧠 사냥꾼들 <small>순서 · 승점 · 무기</small></div>${(v.ord.length?v.ord:ALL).map((i,k)=>`<div class="side-row ${i===me?'me':''} ${v.phase==='attack'&&v.actor===i?'act':''}" style="flex-wrap:wrap"><b>${k+1}</b> ${seatEmoji(i)} ${seatName(i,ctx)} ${isH(i)?'':`<small>${NPCI(i)[2]}</small>`}<span>⭐ ${v.score[i]}</span><div class="hl-st">${v.inv[i].map(w=>W[w][0]).join(' ')||'🗡️만'}</div></div>`).join('')}
    <div class="side-h" style="margin-top:6px">💀 처치 기록</div>${v.kills.slice().reverse().map(k=>`<div class="rr-h">${k.r}R ${k.m.e} ${k.m.n}(${k.m.max}) — ${fill(nm(k.by),ctx)}${k.src!=='hit'?` ${k.src==='poison'?'☠️':'⏰'}`:''}</div>`).join('')||'<small style="color:#888">아직 없어요</small>'}</div>`;
  const R=`<div class="side-box side-log"><div class="side-h">📜 진행 기록 <small>최근이 위</small></div>${v.log.slice(-60).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=`<div class="side3"><div class="side-mid">${h}</div><aside class="side-l">${L}</aside><aside class="side-r">${R}</aside></div>`;
  el.onclick=e=>{
    const f=e.target.closest('[data-f]'); if(f&&!f.disabled){ const fi=+f.dataset.f; if(selW==='twin'&&selF!=null&&fi!==selF){ selF2 = selF2===fi?null:fi; } else { selF=fi; selF2=null; } return ctx.rerender(); }
    const w=e.target.closest('[data-w]'); if(w){ selW=w.dataset.w; if(selW!=='twin') selF2=null; return ctx.rerender(); }
    const a=e.target.closest('[data-a="go"]'); if(a&&!a.disabled){ const pk={k:'pick',f:selF,w:selW,f2:selW==='twin'?selF2:null}; return ctx.act(pk); }
  };
}
function status(v,ctx){ syncH(v); if(v.phase==='over') return ''; if(v.phase==='pick') return v.done[ctx.me]?'다른 사람을 기다리는 중…':'전장과 무기를 고르세요'; if(v.phase==='attack') return '공격 진행 중…'; return ''; }
const guide=`
<p><b>6인 몬스터 사냥</b>(우리 둘 + 성격 다른 컴퓨터 플레이어 4명). 전장 3곳에 몬스터가 있고 10마리가 기다려요. <b>막타를 친 사람</b>이 몬스터 체력만큼 승점 + 전리품을 가져가요.</p>
<ul><li>모두 승점 5 + 🗡️ 단검(공격력 3, 계속 씀)으로 시작.</li>
<li>라운드마다 모두 <b>동시에 몰래</b> 전장과 무기를 골라요 → <b>승점 높은 순서</b>로 한 명씩 공격.</li>
<li><b>몬스터의 남은 체력과 누가 어디를 쳤는지는 비밀!</b> 처치만 공개돼요. 내가 준 피해만 보여요.</li>
<li>특수 무기(전리품, 한 번 쓰면 사라짐): ☠️ 독 1(죽을 때까지 매 턴 1) · 🧊 얼음 3(내 다음 차례까지 그 몬스터에 피해 무효) · ⚔️ 쌍검 4(두 전장이면 2씩) · 💣 수류탄 6 · ⏰ 시한폭탄 10(다음 라운드 내 차례에 터짐). ⭐+3은 보너스 승점.</li>
<li>몬스터가 모두 쓰러지거나 ${MAXR}라운드가 끝나면 승점 1등이 우승. <small>(원작의 동맹·승점 양도는 단판이라 뺐어요)</small></li></ul>
<div class="tipbox">💡 <b>팁</b><br>· 승점이 낮으면 늦게 공격해요 — 남들이 깎아 둔 걸 막타로 가로채기 좋은 자리!<br>· 🧊 얼음은 남의 막타를 막는 데 써요.</div>`;
window.GAMES.halloween = { _sync:x=>syncH(x), maxH:6,
  title:'핼러윈 몬스터', ref:'데블스 플랜 「핼러윈 몬스터」', emoji:'🎃', tags:['막타','심리전','NPC','두뇌서바이벌'],
  tagline:'우리 둘 + 컴퓨터 4명. 남은 체력이 보이지 않는 몬스터 — 막타를 친 사람이 다 가져간다.',
  guide, init, apply, mask, ai, render, status, step, stepDelay, noPersona:true, wide:true,
  aiDelay:()=>1500+Math.random()*2000,
  reset(){ selF=null; selF2=null; selW='dagger'; sig=''; },
  bar:(v,i)=>`<span class="tag">⭐ ${v.score[HSEAT[i]]}</span>`,
  result:(v,ctx)=>{ const k=(v.rank||[]).indexOf(HSEAT[ctx.me]); return k>=0?`${k+1}등 · ${v.score[HSEAT[ctx.me]]}점`:''; },
};
})();
