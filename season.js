/* 🏆 지니어스 시즌 (v2, 2026-11-10) — 같은 동물 멤버로 여러 회차를 이어 하는 서바이벌.
   시즌 1은 정해진 라인업(메인 매치·데스매치·결승 3판 2선승). 2부터는 인원에 맞는 게임을 골라 씀.
   흐름: 🎬 개막식(소개·규칙) → [☕ 휴식(관계·연합·가넷·징표) → 🎮 메인 매치 → 📊 결과 발표 → 🏛️ 로비(데스매치 후보 정치)
         → ⚖️ 후보·상대 결정 → ⚔️ 데스매치 → 💀 탈락] × 6 → 🏆 결승(3판 2선승) → 👑 우승.
   관계 rel[a][b](a가 b를 믿는 정도 −1~1)는 시즌 내내 쌓이고 판을 넘어 기억(season-mem)됨. 게임 안 처음 신뢰는 NPCS.rel 훅.
   사용자 요청: 관계·정치 상황 UI, 상호작용 최대한, 데스매치 후보 정치(로비·거래·보호·몰아가기·표 맞추기). */
(function(){
'use strict';
const KEY='season-v2', MEMK='season-mem';
const POOL={
  8:['virus','fruitshop','tri13','jury','swordshield'],
  7:['goodevil'],
  6:['kong','balmancala','halloween','treasure','maincolor','daynight','hilo'],
  5:['doubtbet'],
  4:['tripledice','mixmatch','switchpoker'],
  3:['predictwin','blackvillage','brickbuild','memory30','hiddencode'],
};
/* 시즌 1 라인업 (인원 → 메인 매치), 데스매치는 회차 순서대로, 결승은 3판 */
const S1={8:'fruitshop',7:'goodevil',6:'kong',5:'doubtbet',4:'tripledice',3:'predictwin'};
const S1D=['rps2','pyramid','sniper','wallgo','dicepoker','hexagon'];
const S1F=['morris','bigsmall','qtruth'];
const FINALS=['morris','hexagon','dicepoker','bigsmall','bagchal','qtruth'];
const TEAM={
  virus:(s,i)=>((s.roles[i]==='terror')?'terror':'citizen')===s.side,
  kong:(s,i)=>(i<3?0:1)===s.wt,
  jury:(s,i)=>((s.role[i]==='k'||s.role[i]==='kl')?'k':'c')===s.wteam,
  swordshield:(s,i)=>(i<4?0:1)===s.wt,
  goodevil:(s,i)=>((s.role[i]==='lucifer'||s.role[i]==='devil')?'dev':'ang')===s.wteam,
};
const INTRO={seojin:'계산대로 갈게요. 감정은 빼고요.',doyun:'다 같이 사이좋게 가요! 저 믿어도 돼요 🤝',haram:'…조용히 지켜볼게요.',yuna:'느낌 오는 대로 할 거예요! 잘 부탁해요 🥺',minho:'판 좀 재밌게 흔들어 볼게요 😏',taekyung:'정면 승부! 숨는 사람 제일 싫어요 🔥',jihu:'다들 친하게 지내요~ 진짜로요 😏',soyul:'싸우지 말고 공정하게 가요. 제가 정리할게요.'};
let st=null, open=false;
const P=id=>NPCS.byId(id);
const nmOf=id=> id==='me' ? myName() : P(id).name;
const emoOf=id=> id==='me' ? myAva() : P(id).emo;
const who=id=>`${emoOf(id)} <b>${U.esc(nmOf(id))}</b>`;
const pl=id=>st.players.find(p=>p.id===id);
const alive=()=>st.players.filter(p=>!p.out);
const npcsAlive=()=>alive().filter(p=>p.id!=='me').map(p=>p.id);
const rnd=(a,b)=>a+Math.random()*(b-a);
function load(){ try{ st=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(_){ st=null; } }
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(st)); }catch(_){} }
function memLoad(){ try{ return JSON.parse(localStorage.getItem(MEMK)||'{}')||{}; }catch(_){ return {}; } }
function memSave(m){ try{ localStorage.setItem(MEMK,JSON.stringify(m)); }catch(_){} }
function memAdd(id,k,d){ const m=memLoad(); (m[id]=m[id]||{})[k]=(m[id][k]||0)+(d||1); memSave(m); }
function rel(a,b){ return (st.rel[a]&&st.rel[a][b])||0; }
function addRel(a,b,d){ if(a===b||a==='me') return; st.rel[a]=st.rel[a]||{}; st.rel[a][b]=Math.max(-1,Math.min(1,rel(a,b)+d)); }
const allyKey=(a,b)=>[a,b].sort().join('|');
const isAlly=(a,b)=>!!st.ally[allyKey(a,b)];
function stat(k,id,d){ st.stat=st.stat||{win:{},betray:{},survive:{},deal:{},allyR:{}}; const o=st.stat[k]=st.stat[k]||{}; o[id]=(o[id]||0)+(d||1); }
function feed(text,kind){ st.feed.push({text,kind:kind||''}); }
function say(id,text){ st.feed.push({text,id}); }
function pickLine(id,arr,all){ st.said=st.said||[]; const k=t=>(all?'*':id)+'|'+t; const c=arr.filter(t=>!st.said.includes(k(t))); const t=U.pick(c.length?c:arr); st.said.push(k(t)); return t; }
function fill(t,o){ for(const k in o) t=t.split('{'+k+'}').join(o[k]); return t; }
const okGame=id=>window.GAMES&&GAMES[id]&&GAMES[id].ai;
const isS1=()=>st&&st.no===1;
const DV=()=>st&&st.fmt==='devil';
const CUR=()=>DV()?'🧩 피스':'🟣 가넷', CI=()=>DV()?'🧩':'🟣', CN=()=>DV()?'피스':'가넷';
const SHOW=()=>DV()?'😈 데블스 플랜 · 놀이터':'🏆 더 지니어스 · 놀이터';

/* ── 새 시즌 + 개막식 ── */
function newSeason(fmt){
  const mem=memLoad(), ids=U.shuffle(NPCS.ROSTER.map(p=>p.id)).slice(0,7), no=(mem._done2||0)+1, g0=fmt==='devil'?0:2;
  st={v:2, fmt:fmt||'genius', loans:[], no, ep:1, phase:'opening', players:[{id:'me',g:g0,tok:0},...ids.map(id=>({id,g:g0,tok:0}))], rel:{}, ally:{}, feed:[], log:[], used:[], usedD:[], acted:{}, game:null, said:[], stat:{win:{},betray:{},survive:{},deal:{},allyR:{}}};
  for(const a of ids){ st.rel[a]={}; for(const b of ['me',...ids]) if(a!==b){ const p=P(a); st.rel[a][b]=(Math.random()-.5)*.3+(p.trust-.5)*.2; } }
  for(const a of ids){ const m=mem[a]; if(!m) continue; st.rel[a].me+=Math.max(-.6,Math.min(.6,(m.allyKept||0)*.15+(m.saved||0)*.1-(m.nomByMe||0)*.3-(m.betrayed||0)*.45-(m.dealBroken||0)*.3)); }
  mem._n2=no; memSave(mem);
  feed(`🎙️ 「${SHOW()} 시즌 ${no}」에 오신 걸 환영합니다.`,'host');
  feed('🎙️ 8명이 모였습니다. 마지막까지 살아남는 단 한 명이 우승합니다.','host');
  for(const p of st.players){ if(p.id==='me'){ feed(`${who('me')} — 당신`,''); continue; } const q=P(p.id); say(p.id,`${q.arch} · ${INTRO[p.id]||q.desc}`); }
  if(DV()) feed('📜 규칙 — 메인 매치 순위대로 🧩 <b>피스</b>(1위 3 · 2위 2 · 3위 1, 팀전 승리 팀 2씩)를 모아요. 매 회 끝에 피스가 <b>가장 적은 두 명</b>이 ⛓️ <b>감옥 매치</b>(1:1)를 하고 진 사람이 탈락. 감옥 가기 전 🧩 <b>피스 거래 시간</b> — 주기·부탁·빌리기(갚기로 약속) 모두 가능.','host');
  else feed('📜 규칙 — 매 회 메인 매치 1위는 🛡️ <b>생명의 징표</b>(데스매치 면제)와 🟣 가넷. 꼴찌(팀전은 진 팀 투표)는 <b>데스매치 후보</b>가 되어 상대를 지목하고, 1:1로 져서 탈락합니다. 후보가 정해지기 전엔 🏛️ <b>로비 시간</b> — 부탁·거래·몰아가기 모두 가능.','host');
  if(no>1) firstMemories(mem);
  save(); }
function firstMemories(mem){ let n=0; for(const a of U.shuffle(npcsAlive())){ const m=mem[a]; if(!m||n>=2) continue;
    const t= m.betrayed?pickLine(a,['지난 시즌에 연합 깼던 거 기억해요. 이번엔 안 속아요.','또 만났네요… 지난번 배신은 안 잊었어요.']) : m.dealBroken?pickLine(a,['지난번엔 거래해 놓고 저를 지목했죠? 😤']) : m.nomByMe?pickLine(a,['지난 시즌에 저를 데스매치로 데려갔죠? 이번엔 제 차례예요 😤','그때 지목한 거, 아직 기억해요.']) : m.allyKept?pickLine(a,['지난 시즌 연합 고마웠어요. 이번에도 같이 가요 🤝','또 같이 하네요! 든든해요.']) : pickLine(a,['또 만났네요. 이번엔 어떨까요?','지난 시즌보다 더 잘할 거예요.','또 뵙네요! 이번엔 우승 노려요.','반가워요. 이번 시즌도 잘 부탁해요 🙂'],true);
    say(a,t); n++; } }
/* ── 휴식 시간 ── */
function restRoom(){
  st.feed=[]; st.acted={}; st.offer=null; st.lobby=null;
  const al=alive();
  feed(`☕ 제${st.ep}회 휴식 시간 — 남은 사람 ${al.length}명`,'host');
  let n=0; const npcs=npcsAlive();
  const gr=npcs.map(a=>[a,rel(a,'me')]).sort((x,y)=>x[1]-y[1])[0];
  if(gr&&gr[1]<-.35){ say(gr[0],pickLine(gr[0], st.ep===1 ? ['지난 시즌에 저한테 한 거, 아직 기억해요 😤','이번 시즌은 그때처럼 안 당해요.','지난번 일… 이번엔 갚아 줄게요.'] : ['다음 데스매치 상대는 이미 정했어요. 누군지 알죠? 😤','저한테 한 거, 잊지 않았어요.','조심하는 게 좋을 거예요.'])); n++; }
  let worst=null; for(const a of npcs) for(const b of npcs) if(a!==b&&(!worst||rel(a,b)<worst[2])) worst=[a,b,rel(a,b)];
  if(worst&&worst[2]<-.3){ say(worst[0],fill(pickLine(worst[0],['{t}, 두고 봐요.','{t}와(과)는 성향이 너무 안 맞아요. 같은 편은 못 해요.','{t} 쪽이랑은 같이 못 하겠어요.']),{t:nmOf(worst[1])})); n++; }
  /* 동물끼리 몰래 손잡기 (관계가 좋으면) */
  for(const a of npcs){ const b=npcs.filter(x=>x!==a&&!isAlly(a,x)).sort((x,y)=>rel(a,y)-rel(a,x))[0]; if(b&&rel(a,b)>.4&&rel(b,a)>.3&&Math.random()<.5){ st.ally[allyKey(a,b)]=1; feed(`👀 ${who(a)}·${who(b)} — 쉬는 시간에 둘이 따로 이야기하는 게 보였어요`,''); break; } }
  const fr=npcs.filter(a=>!isAlly(a,'me')).map(a=>[a,rel(a,'me')+P(a).trust*.25+rnd(-.1,.1)]).sort((x,y)=>y[1]-x[1])[0];
  if(fr&&fr[1]>.32&&al.length>3){ st.offer=fr[0]; say(fr[0],pickLine(fr[0],['저랑 연합해요. 서로 데스매치로 안 부르기로 🤝','우리 둘이 손잡으면 끝까지 갈 수 있어요. 어때요?','다음 판 같이 움직여요. 믿어도 돼요.'])); }
  else if(n===0){ const a=U.pick(npcs); if(a) say(a,pickLine(a,['다음 게임이 뭘지 궁금하네요.','다들 긴장한 얼굴이네요 ㅋㅋ','이번 회차는 조용히 지나가면 좋겠어요.'])); }
  st.next=pickMain(al.length);
  st.evt=null;
  if(st.ep>1&&Math.random()<.75){ const r=Math.random();
    if(r<.34&&st.next){ st.evt={k:'tip',cost:1}; feed(`🎙️ 진행자: "다음 메인 매치 「${GAMES[st.next].title}」 팁, ${CN()} 1개에 팝니다."`,'host'); }
    else if(r<.7){ let w=null; for(const a of npcs) for(const b of npcs) if(a<b&&(!w||rel(a,b)+rel(b,a)<w[2])) w=[a,b,rel(a,b)+rel(b,a)];
      if(w&&w[2]<.1){ st.evt={k:'fight',a:w[0],b:w[1]}; say(w[0],fill(pickLine(w[0],['{b}, 아까 저 뒤에서 욕했죠?','{b}, 저번 판 일 설명 좀 해 봐요.','{b} 때문에 다 꼬였어요.']),{b:nmOf(w[1])})); say(w[1],fill(pickLine(w[1],['{a}, 증거 있어요? 😤','{a}야말로 먼저 시작했잖아요.','하… {a}, 또 시작이네요.']),{a:nmOf(w[0])})); addRel(w[0],w[1],-.15); addRel(w[1],w[0],-.15); feed('⚔️ 둘 사이가 험악해요 — 한쪽 편을 들 수도 있어요',''); } }
    else { const t=npcs.filter(x=>rel(x,'me')<-.15).sort((x,y)=>rel(x,'me')-rel(y,'me'))[0], inf=npcs.filter(x=>x!==t&&rel(x,'me')>.2).sort((x,y)=>rel(y,'me')-rel(x,'me'))[0];
      if(t&&inf){ dmEvt(inf,`(귓속말) 조심해요. ${nmOf(t)}이(가) 당신을 노리고 있어요 🤫`); } } }
  st.auction=!DV()&&(st.ep===3||st.ep===5)&&al.length>3?{open:true}:null;
  if(st.auction) feed('🛡️ 특별 이벤트 — <b>생명의 징표 경매</b>! 가넷을 몰래 걸어 가장 많이 건 사람이 징표를 가져가요(건 가넷은 사라져요)','host');
}
function runAuction(myBid){ const A=st.auction; if(!A||!A.open) return; A.open=false; const bids={me:Math.min(myBid,pl('me').g)};
  for(const id of npcsAlive()){ const p=P(id), q=pl(id); const danger=q.tok?0:.4+Math.max(0,-alive().reduce((a,x)=>a+(x.id!==id?rel(x.id,id):0),0)/alive().length); const w=Math.round(q.g*(danger*.6+p.aggr*.3)*rnd(.5,1.2)); bids[id]=Math.max(0,Math.min(q.g,w)); }
  const top=Object.entries(bids).sort((a,b)=>b[1]-a[1]||Math.random()-.5)[0];
  feed(`🛡️ 경매 결과 — ${Object.entries(bids).sort((a,b)=>b[1]-a[1]).map(([id,b])=>`${emoOf(id)} ${b}`).join(' · ')}`,'host');
  if(top[1]<=0){ feed('🛡️ 아무도 걸지 않아 징표는 주인 없이 사라졌어요',''); return; }
  { const tie=Object.entries(bids).filter(e=>e[1]===top[1]); if(tie.length>1) feed(`🎲 ${tie.map(e=>emoOf(e[0])).join(' ')} ${tie.length}명이 ${top[1]}개로 동점 — 제비뽑기로 정해요`,'host'); }
  pl(top[0]).g-=top[1]; pl(top[0]).tok++; feed(`🛡️ ${who(top[0])} — 가넷 ${top[1]}개로 생명의 징표 낙찰!`,'win');
  if(top[0]!=='me') say(top[0],pickLine(top[0],['이걸로 한 번은 살았네요 😌','비쌌지만 목숨값이죠.','징표, 제가 가져갈게요 😏'])); }
function dmEvt(id,text){ st.feed.push({id,text}); }
function tipOf(id){ const g=GAMES[id]; const m=String(g.guide||'').match(/tipbox[^>]*>([\s\S]*?)<\/div>/); if(!m) return g.tagline||''; return m[1].replace(/<br\s*\/?>/g,' ').replace(/<[^>]+>/g,'').replace(/💡\s*팁/,'').trim(); }
function pickMain(n){ if(isS1()&&okGame(S1[n])) return S1[n]; const pool=(POOL[n]||[]).filter(okGame); if(!pool.length) return null; const fresh=pool.filter(id=>!st.used.includes(id)); return U.pick(fresh.length?fresh:pool); }
function deathPool(){ const ids=new Set(); for(const k in window.SHOWS) for(const r of SHOWS[k].list){ const id=r[r.length-1], ty=r[r.length-3]; if(id&&(ty==='데스'||ty==='결승')) ids.add(id); } return [...ids].filter(id=>okGame(id)&&!GAMES[id].noPersona); }
function deathChoice(){ const a=pickDeath(); const fin=isS1()?S1F:[], pool=deathPool().filter(id=>id!==a&&!st.usedD.includes(id)&&!fin.includes(id)); const nx=isS1()?S1D.filter(id=>okGame(id)&&id!==a&&!st.usedD.includes(id))[0]:null; const b=nx||U.pick(pool.length?pool:deathPool().filter(id=>id!==a&&!fin.includes(id))); st.deathOpts=[a,b].filter(Boolean); st.death=null;
  const chooser=st.oppo; if(chooser==='me'){ st.phase='deathPick'; feed('🎮 지목당한 쪽이 데스매치 게임을 골라요 — 둘 중 하나를 고르세요','host'); }
  else { const p=P(chooser); const pick=st.deathOpts[(p.logic>.6)===(Math.random()<.7)?0:1]||st.deathOpts[0]; st.death=pick; st.phase='death'; feed(`🎮 ${who(chooser)} — 데스매치 게임으로 「${GAMES[pick].title}」을(를) 골랐어요`,'host'); say(chooser,pickLine(chooser,['이걸로 가죠. 자신 있어요.','제가 고른 판이에요. 각오해요 😤','이 게임이라면 안 져요.'])); }
  save(); }
function pickDeath(){ if(isS1()){ const d=S1D.filter(id=>okGame(id)&&!st.usedD.includes(id)); if(d.length) return d[0]; } const pool=deathPool(), fresh=pool.filter(id=>!st.usedD.includes(id)); return U.pick(fresh.length?fresh:pool); }

/* ── 게임 시작·끝 연결 ── */
function startMatch(kind,id,oppId,castIds){
  st.game={kind,id,opp:oppId,cast:castIds,map:null,done:false};
  window.SEASON_CAST=castIds; save();
  open=false; startGame(id,'solo'); window.SEASON_CAST=null;
  st.game.map=seatMap(S,castIds,oppId); save(); render();
}
function seatMap(s,castIds,oppId){ const N=castIds.length+2, map={0:'me'};
  for(const k in s){ const v=s[k]; if(!v||typeof v!=='object') continue; const e=Object.entries(v).filter(([i,x])=>castIds.includes(x)); if(e.length===castIds.length&&e.every(([i])=>+i<N)){ e.forEach(([i,x])=>map[+i]=x); break; } }
  for(let i=1;i<N;i++) if(map[i]==null){ map[i]=oppId; break; }
  return map; }
/* 결과 발표 숫자를 게임 안 단위 그대로 (과일가게 15 → 15,000원) */
function unitOf(id,key,v){ if(id==='fruitshop') return `${Math.round(v*1000).toLocaleString()}원`; if(key==='chips') return `칩 ${v}`; if(key==='coins') return `코인 ${v}`; if(key==='money') return `${v.toLocaleString()}원`; return `${v}점`; }
/* 몰아가기 이유 한 줄 (c: 듣는 사람) — 근거 없는 "그냥 위험해요" 금지 */
function sugWhy(t,c){ const R=[], o=st.lastOrder||[], k=o.indexOf(t), mx=Math.max(...alive().map(x=>x.g));
  if(pl(t).g>=mx&&pl(t).g>2) R.push(`${nmOf(t)}은(는) 가넷이 ${pl(t).g}개로 제일 많아요`);
  if(!st.lastTeam&&k>=0&&k>=o.length-3) R.push(`${nmOf(t)}은(는) 이번 판 ${k+1}위였어요`);
  if(((st.stat||{}).betray||{})[t]) R.push(`${nmOf(t)}은(는) 약속을 깬 적이 있어요`);
  if(c&&rel(t,c)<-.2) R.push(c==='me'?`${nmOf(t)}이(가) 아까 당신 떨어뜨리자고 하더라고요`:`${nmOf(t)}이(가) ${nmOf(c)} 얘기를 안 좋게 하더라고요`);
  return R.length?U.pick(R):`솔직히 제가 ${nmOf(t)}와(과) 안 맞아서요`; }
function sugLine(a,t){ const T=nmOf(t), R=[]; const mx=Math.max(...alive().map(x=>x.g));
  if(pl(t).g>=mx&&pl(t).g>2) R.push(['저라면 {t} 골라요. 가넷 {g}개로 제일 많잖아요.','{t} 지목하세요. 가넷 {g}개 — 지금 제일 앞서가요.']);
  const o=st.lastOrder||[], k=o.indexOf(t); if(!st.lastTeam&&k>=o.length-3&&k>=0) R.push(['{t}은(는) 이번 판 {k}위였어요. 게임 감이 떨어져 있어요 — 해볼 만해요.','{t} 이번에 {k}위였잖아요. 1:1이면 이길 수 있어요.']);
  if(((st.stat||{}).betray||{})[t]) R.push(['{t}은(는) 연합을 깬 적 있어요. 살려 두면 또 그래요.','{t} 지난번에 배신했잖아요. 믿을 사람이 아니에요.']);
  if(rel(t,'me')<-.2) R.push(['{t}이(가) 쉬는 시간에 당신 떨어뜨리자고 하더라고요 🤫','{t}은(는) 당신 편이 아니에요. 아까 표정 봤어요?']);
  if(!R.length) R.push(['솔직히 {t}이(가) 싫어서 하는 말이에요. 그래도 {t} 떨어지면 저는 당신 편할게요.','{t} 지목해 주면 이 은혜는 꼭 갚을게요.']);
  return fill(pickLine(a,U.pick(R)),{t:T,g:pl(t).g,k:k+1}); }
function standings(id,s,N){ const seats=[...Array(N).keys()];
  if(TEAM[id]){ let win=[]; try{ win=seats.filter(i=>TEAM[id](s,i)); }catch(_){}
    if(win.length&&win.length<N) return {team:true, win, order:[...win,...seats.filter(i=>!win.includes(i))]}; }
  if(Array.isArray(s.rank)&&s.rank.length===N) return {order:s.rank.slice(), val:Array.isArray(s.chips)&&s.chips.length===N?s.chips:null, key:'chips'};
  for(const k of ['score','tot','pts','chips','coins','money']){ const a=s[k]; if(Array.isArray(a)&&a.length===N&&a.every(x=>typeof x==='number')) return {order:seats.slice().sort((x,y)=>a[y]-a[x]||Math.random()-.5), val:a, key:k}; }
  console.warn('season: 순위를 못 읽음', id); const w=s.winner; return {order: w===0?seats:[...seats.slice(1),0]};
}
/* 동점은 제비뽑기(위 정렬의 무작위)로 정하되, 발표는 '공동 n위'로 보이고 뽑기 결과를 따로 알림 — 게임 끝 화면 순서가 최종인 줄 알고 헷갈리지 않게 (2026-11-10) */
const rankNo=(sd,k)=> sd.val ? 1+sd.order.filter(i=>sd.val[i]>sd.val[sd.order[k]]).length : k+1;
const tieTag=(sd,k)=> sd.val&&sd.order.some((i,j)=>j!==k&&sd.val[i]===sd.val[sd.order[k]]) ? ' (동점)' : '';
function tieDraws(sd,ids){ if(!sd.val) return; const done=new Set(); sd.order.forEach((i,k)=>{ const v=sd.val[i]; if(done.has(v)) return; done.add(v);
  const g=ids.filter((_,j)=>sd.val[sd.order[j]]===v); if(g.length>1) feed(`🎲 공동 ${rankNo(sd,k)}위 제비뽑기 — ${g.map(who).join(' → ')} 순`,'host'); }); }
function afterRender(V){
  if(!st||!st.game||st.game.done||mode!=='solo'||gameId!==st.game.id) return;
  $('btnRematch').hidden=true; $('btnMenu').hidden=true;
  let b=$('seasonBack'); if(!b){ b=document.createElement('button'); b.id='seasonBack'; b.className='season-back'; $('btnMenu').parentNode.prepend(b); }
  b.onclick=backToHub; b.hidden=V.winner==null; b.textContent=st.game.kind==='main'?'🏆 결과 발표 보러 가기':'🏆 결과 보러 가기';
  let tag=$('seasonTag'); if(!tag){ tag=document.createElement('div'); tag.id='seasonTag'; tag.className='season-tag'; $('gTitle').parentNode.after(tag); }
  tag.hidden=false; tag.innerHTML=`${DV()?'😈':'🏆'} 시즌 ${st.no} · 제${st.ep}회 ${st.game.kind==='main'?'메인 매치':st.game.kind==='final'?`결승 ${st.final?st.final.idx+1:''}판`:DV()?'감옥 매치':'데스매치'}${st.game.kind!=='main'?` — ${who(st.cand)} vs ${who(st.oppo)}`:''}`;
}
function hideTag(){ const t=$('seasonTag'); if(t) t.hidden=true; const sb=$('seasonBack'); if(sb) sb.hidden=true; if($('btnMenu')) $('btnMenu').hidden=false; }
function backToHub(){ const g=st.game; if(!g||!S||S.winner==null) return; g.done=true;
  if(g.kind==='main') mainResult(S); else if(g.kind==='final') finalGameResult(S); else deathResult(S);
  open=true; save(); hideTag(); leave(); }
function onLeave(){ if(st&&st.game&&!st.game.done) open=true; hideTag(); }

/* ── 메인 매치 결과 ── */
function mainResult(s){ const g=st.game, N=Object.keys(g.map).length, sd=standings(g.id,s,N), ids=sd.order.map(i=>g.map[i]);
  st.used.push(g.id); st.feed=[]; st.lastOrder=ids; st.lastTeam=!!sd.team; epRec({ep:st.ep, game:g.id, top:ids[0], team:sd.team?sd.win.map(i=>g.map[i]):null, meR:ids.indexOf('me')+1, n:ids.length});
  feed(`🎙️ 제${st.ep}회 메인 매치 「${GAMES[g.id].title}」 결과를 발표합니다`,'host');
  if(DV()){ repayLoans();
    if(sd.team){ const win=sd.win.map(i=>g.map[i]); feed(`🏅 승리 팀 — ${win.map(who).join(' · ')} (🧩 +2씩)`,'win'); win.forEach(x=>{ pl(x).g+=2; stat('win',x,.5); }); win.forEach(a=>win.forEach(b=>addRel(a,b,.12))); }
    else { const W=[3,2,1]; ids.forEach((x,k)=>{ const m=W[k]||0; pl(x).g+=m; feed(`${rankNo(sd,k)}위 ${who(x)}${sd.val?` · ${unitOf(g.id,sd.key,sd.val[sd.order[k]])}`:''}${tieTag(sd,k)}${m?` · 🧩 +${m}`:''}`, k===0?'win':k===ids.length-1?'bad':''); }); tieDraws(sd,ids); stat('win',ids[0]); }
    st.lastOrder=ids; g.result=ids; startTrade(); save(); return; }
  if(sd.team){ const win=sd.win.map(i=>g.map[i]), lose=ids.filter(x=>!win.includes(x));
    feed(`🏅 승리 팀 — ${win.map(who).join(' · ')} (가넷 +2씩)`,'win'); win.forEach(x=>{ pl(x).g+=2; stat('win',x,.5); });
    win.forEach(a=>win.forEach(b=>addRel(a,b,.12))); lose.forEach(a=>lose.forEach(b=>addRel(a,b,-.04)));
    feed(`💀 진 팀 — ${lose.map(who).join(' · ')} — 진 팀 안에서 투표로 데스매치 후보를 정합니다`,'bad');
    st.vote={pool:lose.filter(x=>!pl(x).out), votes:{}}; startLobby('vote'); }
  else { const W=[3,2,1]; ids.forEach((x,k)=>{ const m=W[k]||0; pl(x).g+=m; feed(`${rankNo(sd,k)}위 ${who(x)}${sd.val?` · ${unitOf(g.id,sd.key,sd.val[sd.order[k]])}`:''}${tieTag(sd,k)}${k===0?' 🛡️ 생명의 징표!':''}${m?` · 가넷 +${m}`:''}`, k===0?'win':k===ids.length-1?'bad':''); }); tieDraws(sd,ids);
    pl(ids[0]).tok++; stat('win',ids[0]);
    /* 꼴찌부터 징표로 피함. 1위는 늘 면제 — 1위 말고 모두 징표가 있으면 징표가 안 통하고 꼴찌가 후보(징표도 안 씀) */
    let c=null; const free=ids.slice(1).reverse().find(x=>!pl(x).tok);
    if(!free){ c=ids[ids.length-1]; feed('🛡️ 1위 말고 모두 생명의 징표를 갖고 있어요 — 이번엔 징표가 통하지 않고 꼴찌가 후보가 됩니다','host'); }
    else for(let k=ids.length-1;k>=1;k--){ const p=pl(ids[k]); if(p.tok&&ids[k]!==free){ p.tok--; feed(`🛡️ ${who(ids[k])} 생명의 징표를 써서 데스매치를 피합니다!`,'host'); continue; } c=ids[k]; break; }
    st.cand=c; feed(`⚖️ 데스매치 후보: ${who(c)}`,'bad'); startLobby('pick'); }
  g.result=ids; save(); }

/* ── 🧩 피스 거래 시간 (데블스 플랜) ── */
function bottom2(){ const ord=st.lastOrder||[]; return alive().slice().sort((a,b)=>a.g-b.g||(ord.indexOf(b.id)-ord.indexOf(a.id))).slice(0,2).map(x=>x.id); }
function startTrade(){ const L=st.lobby={kind:'trade', used:{}, offers:[]}; st.phase='lobby';
  const b=bottom2(); feed(`⛓️ 지금 감옥 후보: ${b.map(who).join(' · ')} — 🧩 피스 거래 시간`,'bad');
  /* 위험한 동물들: 나에게 빌려 달라 / 동맹끼리 도와줌 */
  for(const a of b.filter(x=>x!=='me')){ const p=P(a);
    const ally=npcsAlive().filter(x=>x!==a&&!b.includes(x)&&isAlly(a,x)&&pl(x).g>=2)[0]; if(ally&&Math.random()<.7){ pl(ally).g--; pl(a).g++; feed(`👀 ${who(ally)} → ${who(a)} 피스 1개를 몰래 건넸어요`,''); addRel(a,ally,.3); continue; }
    if(pl('me').g>=1&&!b.includes('me')){ L.offers.push({id:a,kind:'loanReq'}); say(a,pickLine(a,['피스 1개만 빌려주세요. 다음 회차에 2개로 갚을게요 🙏','저 감옥 가면 끝이에요… 1개만요. 꼭 갚을게요.','1개만 빌려주면 은혜 잊지 않을게요 🥺','딱 1개요. 다음 판에 이자까지 쳐서 드릴게요.','저 좀 살려 주세요… 피스 1개면 돼요.','이번만 도와주면 다음엔 제가 도울게요 🙏','1개만요! 갚는 건 확실해요, 진짜로요.'],true)); } }
  if(b.includes('me')){ const fr=npcsAlive().filter(x=>!b.includes(x)&&pl(x).g>=2).sort((x,y)=>rel(y,'me')-rel(x,'me'))[0];
    if(fr&&rel(fr,'me')>.15){ L.offers.push({id:fr,kind:'loanGive'}); say(fr,pickLine(fr,['피스 1개 빌려줄까요? 다음에 2개로 갚아요 😉','감옥은 피해야죠. 1개 빌려줄게요, 갚는 건 알죠?'])); }
    const foe=npcsAlive().filter(x=>!b.includes(x)).sort((x,y)=>rel(x,'me')-rel(y,'me'))[0]; if(foe&&rel(foe,'me')<-.2) say(foe,pickLine(foe,['감옥 잘 다녀와요 😏','이번엔 도와줄 사람 없을걸요?'])); }
  save(); }
function tradeAct(what,t){ const L=st.lobby; if(!L||L.used[what]) return; L.used[what]=1; const me=pl('me');
  if(what==='give'){ if(me.g<1||!t) return; me.g--; pl(t).g++; addRel(t,'me',.35); feed(`🧩 ${who('me')} → ${who(t)} 피스 1개를 줬어요`,''); say(t,pickLine(t,['정말요? 이 은혜 잊지 않을게요 🥹','고마워요… 꼭 갚을게요.'])); memAdd(t,'saved'); }
  if(what==='ask'){ if(!t) return; const v=rel(t,'me')+P(t).trust*.3+(isAlly(t,'me')?.5:0)-(bottom2().includes(t)?1:0); if(v>.35&&pl(t).g>=1){ pl(t).g--; me.g++; addRel(t,'me',-.05); feed(`🧩 ${who(t)} → ${who('me')} 피스 1개`,'win'); say(t,pickLine(t,['이번만이에요 🤝','알겠어요. 대신 기억해요.'])); } else say(t,pickLine(t,['미안해요, 저도 여유가 없어요.','피스는 못 줘요 😏','그건 좀…'])); }
  if(what==='lend'){ const o=L.offers.find(x=>x.id===t&&x.kind==='loanReq'); if(!o||me.g<1) return; o.taken=1; me.g--; pl(t).g++; st.loans.push({from:'me',to:t,amt:2,due:st.ep+1}); addRel(t,'me',.4); feed(`🧩 ${who('me')} → ${who(t)} 피스 1개 빌려줌 (다음 회차에 2개로 갚기로)`,''); say(t,'고마워요! 꼭 갚을게요 🙏'); }
  if(what==='borrow'){ const o=L.offers.find(x=>x.id===t&&x.kind==='loanGive'); if(!o||pl(t).g<1) return; o.taken=1; pl(t).g--; me.g++; st.loans.push({from:t,to:'me',amt:2,due:st.ep+1}); feed(`🧩 ${who(t)} → ${who('me')} 피스 1개 빌림 (다음 회차에 2개로 갚기로)`,''); }
  save(); }
function endTrade(){ const [a,b]=bottom2(); st.cand=a; st.oppo=b; st.lobby=null; feed(`⛓️ 감옥 매치: ${who(a)} vs ${who(b)} — 진 사람이 탈락`,'bad');
  { const used=[]; for(const x of [a,b]) if(x!=='me'){ const L=['여기서 끝낼 순 없어요.','감옥이라니… 해 볼게요.','반드시 나갈 거예요 😤','피스가 모자랐네요… 실력으로 나갈게요.','긴장되지만 자신 있어요.'].filter(t=>!used.includes(t)); const t=pickLine(x,L); used.push(t); say(x,t); } }
  deathChoice(); }
function repayLoans(){ for(const L of st.loans.filter(l=>!l.done&&l.due<=st.ep)){ L.done=1; const d=pl(L.to), c=pl(L.from); if(!d||d.out||!c||c.out) continue;
    if(L.to==='me'){ const g=Math.min(L.amt,d.g); d.g-=g; c.g+=g; feed(`🧩 빚 갚기 — ${who('me')} → ${who(L.from)} 피스 ${g}개`,''); addRel(L.from,'me',.25); continue; }
    const p=P(L.to), cheat=(L.to==='jihu'||p.bluff>.7)&&Math.random()<.55;
    if(cheat||d.g<1){ feed(`💔 ${who(L.to)} — 빌린 피스를 안 갚았어요!`,'bad'); say(L.to,pickLine(L.to,['…다음에 갚을게요 😏','그런 약속 했던가요? 😏'])); stat('betray',L.to); if(L.from==='me') memAdd(L.to,'dealBroken'); alive().forEach(x=>{ if(x.id!==L.to) addRel(x.id,L.to,-.15); }); }
    else { const g=Math.min(L.amt,d.g); d.g-=g; c.g+=g; feed(`🧩 약속대로 ${who(L.to)} → ${who(L.from)} 피스 ${g}개 갚음`,'win'); addRel(L.from,L.to,.3); stat('deal',L.to); } } }
/* ── 🏛️ 로비 시간: 데스매치 후보 정치 ── */
function startLobby(kind){ const L=st.lobby={kind, shield:{}, push:{}, deal:{}, votePush:{}, voteDeal:{}, used:{}, offers:[]};
  st.phase='lobby'; feed(kind==='vote'?'🏛️ 로비 시간 — 투표 전에 표를 맞추거나 부탁할 수 있어요':'🏛️ 로비 시간 — 후보가 상대를 지목하기 전, 부탁·거래·몰아가기','host');
  const E=eligible();
  if(kind==='pick'){ const c=st.cand;
    if(c==='me'){ /* 동물들이 나에게: 살려 달라 + 가넷 / 저 사람 지목하세요 */
      for(const a of U.shuffle(E.filter(x=>x!=='me')).slice(0,3)){ const p=P(a), r=rel(a,'me'), myG=pl(a).g;
        if(myG>=1&&(p.bluff>.5||r<.1)&&Math.random()<.6){ const amt=Math.min(myG,1+(Math.random()<.4?1:0)); L.offers.push({id:a,kind:'deal',amt}); say(a,pickLine(a,[`저 지목 안 하면 가넷 ${amt}개 드릴게요. 어때요?`,`가넷 ${amt}개요. 저만 빼 줘요 🙏`])); }
        else { const t=E.filter(x=>x!=='me'&&x!==a).sort((x,y)=>rel(a,x)-rel(a,y))[0]; if(t&&rel(a,t)<-.1){ L.offers.push({id:a,kind:'sug',t}); say(a,sugLine(a,t)); }
          else say(a,pickLine(a,['저는 아니죠? 우리 사이잖아요 🙏','저 말고요… 부탁해요 🥺','저는 빼 줘요. 다음에 꼭 갚을게요.'])); } } }
    else { /* 후보가 동물: 다른 동물들이 로비 */
      for(const a of U.shuffle(E.filter(x=>x!=='me'&&x!==c)).slice(0,2)){ if(isAlly(a,c)) say(a,fill(pickLine(a,['{c}, 우리 연합이잖아요. 저는 빼 줘요.','{c}, 저 지목하면 연합 끝이에요.']),{c:nmOf(c)}));
        else { const t=E.filter(x=>x!==a&&x!==c).sort((x,y)=>rel(a,x)-rel(a,y))[0]; if(t&&rel(a,t)<-.15){ L.push[t]=(L.push[t]||0)+.4; say(a,fill(pickLine(a,['{c}, {t} 지목해요. {w}.','{c}, 저보단 {t}이(가) 쉬운 상대예요 — {w}.']),{c:nmOf(c),t:nmOf(t),w:sugWhy(t,c)})); }
          else { L.shield[a]=(L.shield[a]||0)+.3; say(a,fill(pickLine(a,['{c}, 저 말고요… 부탁해요 🙏','{c}, 저 지목하면 후회할 거예요.']),{c:nmOf(c)})); } } } } }
  else { /* 진 팀 투표 로비: 동물이 나에게 표 맞추자 */
    const V=st.vote; if(V.pool.includes('me')){ const a=U.shuffle(V.pool.filter(x=>x!=='me'))[0]; if(a){ const t=V.pool.filter(x=>x!==a&&x!=='me'&&!pl(x).tok).sort((x,y)=>rel(a,x)-rel(a,y))[0]; if(t){ L.offers.push({id:a,kind:'vote',t}); say(a,fill(pickLine(a,['우리 표 맞춰요. {t} 찍어요 🤫 {w}.','{t}한테 같이 표 줘요 — {w}. 그럼 우린 살아요.']),{t:nmOf(t),w:sugWhy(t,'me')})); } } } }
  save(); }
function eligible(){ return alive().filter(x=>!x.tok).map(x=>x.id); }
/* 로비 행동 (나) */
function lobbyAct(what,t,amt){ const L=st.lobby; if(!L) return; if(L.kind==='trade'){ tradeAct(what,t); return; } const key=what+(t||''); if(L.used[what]) return; L.used[what]=1;
  if(L.kind==='pick'&&st.cand!=='me'){ const c=st.cand, p=P(c);
    if(what==='plea'){ const v=rel(c,'me')+(isAlly(c,'me')?.6:0); L.shield.me=(L.shield.me||0)+Math.max(.1,.5+v); feed(`🙏 ${who('me')} → ${who(c)}: "저 말고요, 부탁해요"`,''); say(c,v>.2?pickLine(c,['음… 생각해 볼게요.','당신은 빼 줄게요. 이번만이에요.']):pickLine(c,['부탁만으론 부족한데요 😏','글쎄요…'])); }
    if(what==='deal'){ const a=Math.min(amt||1,pl('me').g); if(a<1) return; const greed=p.bluff*.5+p.aggr*.3+a*.15+rel(c,'me')*.3; if(greed>.45){ L.deal.me=a; feed(`🟣 ${who('me')} → ${who(c)}: "가넷 ${a}개 줄게요, 저 지목 마요"`,''); say(c,pickLine(c,['콜. 거래 성립이에요 🤝','좋아요, 대신 약속은 지켜요.'])); } else { feed(`🟣 ${who('me')}의 거래 제안`,''); say(c,pickLine(c,['가넷으로 사람 사는 거 아니에요.','그 정도로는 안 돼요 😏'])); } }
    if(what==='push'){ L.push[t]=(L.push[t]||0)+.4+Math.max(0,rel(c,'me'))*.6; feed(`🎯 ${who('me')} → ${who(c)}: "${nmOf(t)} 지목해요"`,''); if(t!=='me') addRel(t,'me',-.2); say(c,rel(c,'me')>.1?pickLine(c,['그 생각도 했어요.','음… 일리 있네요.']):pickLine(c,['당신 말을 왜 믿어요?','흠…'])); } }
  else if(L.kind==='pick'&&st.cand==='me'){ /* 내가 후보: 제안 수락 */
    if(what==='take'){ const o=L.offers.find(x=>x.id===t&&x.kind==='deal'); if(!o) return; o.taken=1; L.myDeal=L.myDeal||{}; L.myDeal[t]=o.amt; feed(`🤝 ${who('me')} — ${who(t)}의 가넷 ${o.amt}개 거래를 받았어요 (지목 안 하기로)`,''); say(t,'고마워요! 약속이에요 🙏'); } }
  else if(L.kind==='vote'){ const V=st.vote;
    if(what==='votePush'){ const tg=t; let n=0; for(const a of V.pool.filter(x=>x!=='me'&&x!==tg)){ if(rel(a,'me')+rnd(-.2,.3)>.05){ L.votePush[a]=tg; n++; } } feed(`🗳️ ${who('me')}: "다들 ${nmOf(tg)}에게 표 줘요"`,''); feed(n?`👀 ${n}명이 고개를 끄덕였어요`:'👀 다들 반응이 시큰둥해요',''); addRel(tg,'me',-.25); }
    if(what==='voteDeal'){ const a=Math.min(amt||1,pl('me').g); if(a<1) return; let n=0; for(const x of V.pool.filter(y=>y!=='me')){ const p=P(x); if(p.bluff*.4+p.aggr*.2+a*.2+rel(x,'me')*.3>.4){ L.voteDeal[x]=a; n++; } } feed(`🟣 ${who('me')}: "저 안 찍으면 가넷 ${a}개씩 드릴게요"`,''); feed(n?`🤝 ${n}명이 받아들였어요`:'🙅 아무도 안 받았어요',''); }
    if(what==='take'){ const o=L.offers.find(x=>x.id===t&&x.kind==='vote'); if(!o) return; o.taken=1; L.myVote=o.t; feed(`🤝 표 맞추기 약속 — ${who('me')} · ${who(t)} → ${who(o.t)}`,''); addRel(t,'me',.15); } }
  save(); }
function endLobby(){ const L=st.lobby; if(!L) return; if(L.kind==='trade'){ endTrade(); return; }
  if(L.kind==='vote'){ st.phase=st.vote.pool.includes('me')?'vote':'votecalc'; if(st.phase==='votecalc') tally(); }
  else if(st.cand==='me'){ st.phase='pick'; feed(alive().some(x=>x.id!=='me'&&!x.tok)?'👉 데스매치에서 맞붙을 상대를 지목하세요 (🛡️ 징표 가진 사람은 못 고름)':'👉 남은 사람이 모두 징표를 가져 이번엔 누구든 지목할 수 있어요','host'); }
  else { const o=npcPick(st.cand); nominate(st.cand,o); }
  save(); }
function tally(){ const V=st.vote, pool=V.pool, L=st.lobby||{votePush:{},voteDeal:{}};
  for(const a of pool){ if(a==='me'||V.votes[a]) continue; const c=pool.filter(b=>b!==a&&!pl(b).tok); if(!c.length) continue;
    V.votes[a]=c.map(b=>[b,-rel(a,b)*1.4-(isAlly(a,b)?2:0)+(L.votePush[a]===b?1.5:0)-(b==='me'&&L.voteDeal[a]?2.5:0)+rnd(0,.5)]).sort((x,y)=>y[1]-x[1])[0][0]; }
  /* 거래한 동물에게 가넷 지급 (나를 안 찍었으면) */
  for(const [a,amt] of Object.entries(L.voteDeal||{})){ if(V.votes[a]!=='me'){ const g=Math.min(amt,pl('me').g); pl('me').g-=g; pl(a).g+=g; } else { feed(`💔 ${who(a)} — 가넷 거래를 받고도 나를 찍었어요!`,'bad'); memAdd(a,'dealBroken'); } }
  st.lastVotes=Object.assign({},V.votes); const cnt={}; for(const a in V.votes){ const b=V.votes[a]; cnt[b]=(cnt[b]||0)+1; addRel(b,a,-.3); }
  for(const a in V.votes) if(a!=='me'){ const b=V.votes[a]; const why= L.votePush[a]===b ? '말 맞춘 대로요' : b==='me'&&rel(a,'me')<-.2 ? '그동안 쌓인 게 있어서요' : rel(a,b)<-.25 ? `${nmOf(b)}와(과)는 처음부터 안 맞았어요` : sugWhy(b); say(a,`🗳️ ${nmOf(b)}에게 한 표 — ${why}`); }
  const top=Object.entries(cnt).sort((x,y)=>y[1]-x[1]||Math.random()-.5)[0];
  st.cand=top?top[0]:U.pick(pool);
  const tied=top?Object.keys(cnt).filter(b=>cnt[b]===top[1]):[];
  if(tied.length>1) feed(`🎲 ${tied.map(who).join(' · ')} ${top[1]}표씩 동점 — 제비뽑기로 ${who(st.cand)}`,'host'); st.vote=null; feed(`⚖️ 데스매치 후보: ${who(st.cand)}`,'bad');
  startLobby('pick'); }
function npcPick(c){ const p=P(c), avg=alive().reduce((a,x)=>a+x.g,0)/alive().length, L=st.lobby||{shield:{},push:{},deal:{}};
  let E=alive().filter(x=>x.id!==c&&!x.tok); if(!E.length){ E=alive().filter(x=>x.id!==c); feed('🛡️ 남은 사람이 모두 징표를 갖고 있어요 — 이번 지목엔 징표가 통하지 않습니다','host'); }
  const sc=E.map(x=>{ const r=-rel(c,x.id)*1.4, al=isAlly(c,x.id)?(c==='jihu'?-.4:-2.2):0, th=p.aggr*(x.g-avg)*.25, vt=(st.lastVotes||{})[x.id]===c?.8:0;
    const lob=(L.push[x.id]||0)-(L.shield[x.id]||0)-(L.deal[x.id]?(c==='jihu'||p.bluff>.75?.6:2.5):0);
    return {id:x.id, v:r+al+th+vt+lob+rnd(0,.6), r, al, th, vt, lob}; }).sort((a,b)=>b.v-a.v);
  const t=sc[0]; t.why= t.al<0&&c==='jihu'?'betray': L.deal[t.id]?'dealBreak': t.vt?'vote': t.lob>.3?'lobby': t.r>.35?'grudge': t.th>.4?'threat':'weak'; if(t.id==='me'&&L.used&&L.used.push&&rel(c,'me')<.1) t.why='pushBack'; return t; }
function nominate(c,o){ const t=typeof o==='string'?{id:o,why:'me'}:o; st.oppo=t.id; const ally=isAlly(c,t.id), L=st.lobby||{};
  if(c!=='me'){ const LL={dealBreak:['미안해요, 거래보다 살아남는 게 먼저예요 😏','가넷은 고마웠어요. 그래도 당신이에요.'],lobby:['다들 말하는 대로 갈게요. {t}, 나와요.','{t}, 여론이 그쪽이에요.'],vote:['{t}, 저한테 표 던졌죠? 나와요.','{t}. 그 한 표, 여기서 갚을게요.'],betray:['미안해요 {t}. 여기선 저부터 살아야겠어요 🐺','연합이요? 서바이벌에 그런 건 없어요, {t}.'],grudge:['{t}, 나와요. 지난번 일 잊지 않았어요.','{t}. 이유는 본인이 제일 잘 알죠?'],threat:['{t}, 가넷 {g}개면 제일 위협적이에요. 지금 잡아야 해요.','{t}, 가넷이 너무 많아요. 여기서 정리할게요.'],weak:['미안해요 {t}… {w}. 1:1이면 이길 수 있을 것 같아요.','{t}, 저랑 한 판 해요. {w}.'],pushBack:['{t}, 남 몰아가기 전에 본인부터 나와요.','{t}, 저한테 누구 찍으라고 시켰죠? 그럼 당신이에요 😤']};
    say(c,fill(pickLine(c,LL[t.why]||LL.weak),{t:nmOf(t.id),w:sugWhy(t.id),g:pl(t.id).g})); }
  feed(`⚔️ 데스매치: ${who(c)} vs ${who(t.id)}`,'bad');
  /* 거래 정산: 나와 거래한 후보 */
  if(c!=='me'&&L.deal&&L.deal.me){ if(t.id!=='me'){ const g=Math.min(L.deal.me,pl('me').g); pl('me').g-=g; pl(c).g+=g; feed(`🟣 약속대로 ${who('me')} → ${who(c)} 가넷 ${g}개`,''); addRel(c,'me',.2); stat('deal','me'); stat('deal',c); } else { feed(`💔 ${who(c)} — 거래해 놓고 나를 지목했어요!`,'bad'); memAdd(c,'dealBrokeMe'); stat('betray',c); } }
  if(c==='me'&&L.myDeal){ for(const [a,amt] of Object.entries(L.myDeal)){ if(a===t.id){ feed(`💔 ${who('me')} — 거래해 놓고 ${who(a)} 지목! 배신이에요`,'bad'); L.brokeWith=a; addRel(a,'me',-.9); alive().forEach(x=>{ if(x.id!==a&&x.id!=='me') addRel(x.id,'me',-.15); }); memAdd(a,'dealBroken'); } else { const g=Math.min(amt,pl(a).g); pl(a).g-=g; pl('me').g+=g; feed(`🟣 ${who(a)} → ${who('me')} 가넷 ${g}개 (거래 성립)`,''); addRel(a,'me',.25); } } }
  addRel(t.id,c,ally?-.9:-.5);
  if(ally||(L.brokeWith===t.id)) stat('betray',c);
  if(ally){ feed(`💔 연합 배신! ${who(c)} — 연합 상대를 지목했어요`,'bad'); delete st.ally[allyKey(c,t.id)]; alive().forEach(x=>{ if(x.id!==c&&x.id!==t.id) addRel(x.id,c,-.2); }); if(c==='me') memAdd(t.id,'betrayed'); }
  if(c==='me') memAdd(t.id,'nomByMe');
  if(t.id!=='me'&&L.brokeWith===t.id) say(t.id,pickLine(t.id,['거래했잖아요?! 가넷까지 받고! 😡','…이게 당신 방식이군요. 다들 봤죠? 😠']));
  else if(t.id!=='me') say(t.id,pickLine(t.id, ally?['…연합이라면서요? 😠','믿었는데. 기억할게요.']:['좋아요. 받아 줄게요 😤','후회하게 해 줄게요.','하필 저예요? …해 보죠.']));
  st.lobby=null; deathChoice(); }

/* ── 데스매치 ── */
function snapNow(){ const o=Object.assign({},st); delete o.snap; st.snap=JSON.stringify(o); }
function retry(){ if(!st.snap) return; const n=(st.retry||0)+1, sn=st.snap; st=JSON.parse(sn); st.snap=sn; st.retry=n; st.feed=st.feed||[]; feed(`↩️ 다시 도전 (${n}번째) — 직전으로 돌아왔어요. 시상식에 재도전 횟수가 남아요`,'host'); save(); }
function playDeath(){ snapNow(); const opp=st.cand==='me'?st.oppo:st.cand; startMatch('death',st.death,opp,[]); }
function simDuel(a,b){ const pa=.5+(P(a).logic-P(b).logic)*.4+rnd(-.12,.12); return Math.random()<pa?a:b; }
function deathResult(s){ const g=st.game, w=s.winner===0?'me':s.winner===1?g.opp:(pl('me').g>=pl(g.opp).g?'me':g.opp);
  st.usedD.push(g.id); st.feed=[]; if(s.winner!==0&&s.winner!==1) feed('🤝 무승부 — 가넷이 많은 쪽이 살아남습니다','host');
  finishDeath(w, w==='me'?g.opp:'me'); }
function runNpcDeath(){ const a=st.cand, b=st.oppo; st.usedD.push(st.death); st.feed=[]; feed(`🎮 데스매치 「${GAMES[st.death].title}」 — ${who(a)} vs ${who(b)}`,'host');
  say(a,pickLine(a,['집중해요. 여기서 끝낼 순 없어요.','후… 해 볼게요.','반드시 살아남아요.'])); say(b,pickLine(b,['받아 줄게요.','긴장되네요…','지목한 거 후회하게 해 줄게요.']));
  const w=simDuel(a,b), l=w===a?b:a, early=Math.random()<.5?l:w;
  feed(fill(U.pick(['🎙️ 초반은 {e} 쪽이 앞서 나갑니다…','🎙️ {e}, 시작부터 과감하네요!','🎙️ 팽팽한 가운데 {e}이(가) 먼저 웃습니다']),{e:nmOf(early)}),'');
  feed(early===w?fill(U.pick(['🎙️ {w}, 그대로 굳히기에 들어갑니다','🎙️ {l}의 반격… 하지만 한발 늦었어요']),{w:nmOf(w),l:nmOf(l)}):fill(U.pick(['🎙️ 역전! {w}이(가) 판을 뒤집습니다!','🎙️ 마지막 한 수… {w}의 대역전!']),{w:nmOf(w)}),'host');
  finishDeath(w,l); }
function epRec(o){ st.eps=st.eps||[]; const e=st.eps.find(x=>x.ep===o.ep); if(e) Object.assign(e,o); else st.eps.push(o); }
function finishDeath(w,l){ const pw=pl(w), plo=pl(l); epRec({ep:st.ep, dw:w, dl:l, dg:st.death});
  feed(`🏁 승자 ${who(w)}! ${CN()} +1`,'win'); pw.g+=1; stat('survive',w); plo.out=st.ep; st.log.push({ep:st.ep, out:l, by:w, game:st.death});
  if(l!=='me'&&rel(l,w)<-.45) say(l,fill(pickLine(l,['{w}, 그 일은 평생 기억할게요. 😠','이렇게 떨어지네요. {w}, 다음 시즌에 봐요.','…{w}이(가) 우승하는 꼴은 못 보겠네요.']),{w:nmOf(w)}));
  else if(l!=='me') say(l,fill(pickLine(l,['여기까지네요… 다들 끝까지 잘해요 😢','아쉽지만 즐거웠어요. 우승은 꼭 좋은 사람이 하길.','…다음 시즌엔 안 질 거예요.','{w}, 축하해요. 대신 꼭 우승해요.','이렇게 떨어지다니… 아직 실감이 안 나요.','다들 고마웠어요. 밖에서 응원할게요 👋','억울하지만 인정할게요. 잘 싸웠어요, {w}.'],true),{w:nmOf(w)}));
  else feed('💀 탈락했어요… 남은 회차는 관전으로 빠르게 진행돼요','bad');
  if(plo.g>0){ const half=Math.ceil(plo.g/2); pw.g+=half; feed(`${CI()} 탈락자의 ${CN()} 절반(${half}개)은 승자에게`,''); plo.g-=half; }
  const rest=npcsAlive().filter(x=>x!==w).map(x=>[x,rel(x,l)]).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]))[0];
  if(rest&&Math.abs(rest[1])>.25) say(rest[0], rest[1]>0?pickLine(rest[0],[`${nmOf(l)}… 같이 가고 싶었는데 😢`,`${nmOf(l)} 몫까지 버틸게요.`]):pickLine(rest[0],[`솔직히 ${nmOf(l)} 떨어져서 다행이에요.`,`${nmOf(l)}, 미안하지만 속 시원하네요 😏`]));
  if(!pl('me').out&&alive().length>2){ const nx=pickMain(alive().length); if(nx) feed(`🎙️ 다음 회차 예고 — ${alive().length}명이 남았습니다. 메인 매치 「${GAMES[nx].title}」 ${U.esc(GAMES[nx].tagline||'')}`,'host'); }
  st.phase= pl('me').out ? 'spect' : 'next'; save(); }
function nextEp(){ st.ep++; st.cand=st.oppo=null; st.game=null;
  if(alive().length<=2){ startFinal(); return; }
  st.phase='hub'; restRoom(); save(); }
/* ── 결승: 3판 2선승 ── */
function startFinal(){ const [a,b]=alive().map(x=>x.id); st.feed=[]; st.phase='final'; st.cand=a; st.oppo=b;
  const games=(isS1()?S1F:[]).filter(okGame); while(games.length<3){ const x=U.pick(FINALS.filter(id=>okGame(id)&&!games.includes(id))); if(!x) break; games.push(x); }
  st.final={games, idx:0, score:{[a]:0,[b]:0}};
  feed(`🏆 결승전 — ${who(a)} vs ${who(b)} · 3판 2선승`,'host'); feed(`🎮 ${games.map((g,k)=>`${k+1}판 「${GAMES[g].title}」`).join(' · ')}`,'');
  if(a!=='me'&&b!=='me'){ say(a,pickLine(a,['여기까지 왔으니 끝까지 가요.','우승은 제 거예요.'])); say(b,pickLine(b,['마지막이에요. 후회 없이!','좋아요, 덤벼요.'])); }
  save(); }
function playFinal(){ snapNow(); const F=st.final, opp=st.cand==='me'?st.oppo:st.cand; st.death=F.games[F.idx]; startMatch('final',F.games[F.idx],opp,[]); }
function finalGameResult(s){ const F=st.final, g=st.game, w=s.winner===0?'me':s.winner===1?g.opp:(Math.random()<.5?'me':g.opp); st.feed=[]; finalScore(w); }
function finalScore(w){ const F=st.final; F.score[w]++; feed(`🏁 결승 ${F.idx+1}판 「${GAMES[F.games[F.idx]].title}」 승자: ${who(w)} (${Object.entries(F.score).map(([k,v])=>`${emoOf(k)} ${v}`).join(' : ')})`,'win'); F.idx++;
  if(F.score[w]>=2||F.idx>=F.games.length) champion(w); else save(); }
function simFinalGame(){ const F=st.final, a=st.cand, b=st.oppo; st.feed=[]; const w=simDuel(a,b); feed(`🎮 결승 ${F.idx+1}판 「${GAMES[F.games[F.idx]].title}」`,'host'); finalScore(w); }
function champion(w){ st.champ=w; st.phase='champ';
  if(!st.counted){ st.counted=1; const mm=memLoad(); mm._done2=Math.max(mm._done2||0, st.no); memSave(mm); }
  feed(`👑 ${DV()?'데블스 플랜':'지니어스'} 시즌 ${st.no} 우승 — ${who(w)}!${w==='me'&&st.retry?` (↩️ 재도전 ${st.retry}번)`:''}`,'win');
  const L=alive().find(x=>x.id!==w); if(L) L.out=st.ep;
  if(w!=='me') say(w,pickLine(w,['제가 해냈어요! 다들 고마웠어요 🥹','끝까지 계산대로였어요 😎','믿기지가 않아요… 고마워요!']));
  else feed('🎉 축하합니다! 마지막까지 살아남았어요!','win');
  /* 🏅 시상식 */
  const top=(o)=>{ const e=Object.entries(o||{}).sort((a,b)=>b[1]-a[1]); return e.length&&e[0][1]>0?e[0]:null; };
  const S=st.stat||{}; feed('🎙️ 시즌 시상식을 시작합니다','host');
  { const t=top(S.win); if(t) feed(`🏅 메인 매치 MVP — ${who(t[0])} (1위·승리 ${Math.round(t[1]*2)/2}번)`,'win'); }
  { const g=st.players.slice().sort((a,b)=>b.g-a.g)[0]; feed(`${CI()} ${CN()}왕 — ${who(g.id)} (${g.g}개)`,'win'); }
  { const t=top(S.survive); if(t) feed(`⚔️ 데스매치 생존왕 — ${who(t[0])} (${t[1]}번 살아남음)`,'win'); }
  if(st.retry) feed(`↩️ 재도전 — ${who('me')} ${st.retry}번 (다음엔 한 번에!)`,'');
  { const t=top(S.betray); if(t) feed(`🗡️ 배신왕 — ${who(t[0])} (${t[1]}번)`,'bad'); else feed('🕊️ 배신왕 — 없음! 의리 있는 시즌이었어요','win'); }
  { const al=Object.keys(st.ally); if(al.length){ const [a,b]=al[0].split('|'); feed(`🤝 의리상 — ${who(a)} · ${who(b)} (끝까지 연합)`,'win'); } }
  { const t=top(S.deal); if(t) feed(`🤝 협상왕 — ${who(t[0])} (거래 성사 ${t[1]}번)`,''); }
  for(const id of U.shuffle(st.players.filter(p=>p.id!=='me'&&p.id!==w).map(p=>p.id)).slice(0,2)){ const r=rel(id,'me'); say(id, r>.3?pickLine(id,['같이해서 즐거웠어요. 다음 시즌에도 봐요 🤝','당신 덕분에 재밌었어요!','다음 시즌에도 같은 편 해요 😊'],true) : r<-.3?pickLine(id,['다음 시즌엔 꼭 갚아 줄게요 😤','이번 시즌 일, 안 잊어요.','다음엔 제가 이길 거예요. 두고 봐요.'],true) : pickLine(id,['수고했어요! 다음엔 제가 우승할 거예요.','재밌었어요. 또 해요.','다음 시즌엔 더 세게 갈게요 😏','아쉽지만 즐거웠어요!'],true)); }
  const m=memLoad(); for(const p of st.players){ if(p.id==='me') continue; const r=m[p.id]=m[p.id]||{}; r.seasons=(r.seasons||0)+1; if(isAlly(p.id,'me')) r.allyKept=(r.allyKept||0)+1; } if(w==='me'){ m._wins=(m._wins||0)+1; } memSave(m); save(); }
/* 관전: 내가 떨어진 뒤 */
function fastForward(){ st.feed=[]; let guard=0;
  while(alive().length>2&&guard++<10){ st.ep++; const al=alive().map(x=>x.id); const id=pickMain(al.length);
    const order=U.shuffle(al.slice()).sort((a,b)=>P(b).logic*rnd(.6,1.4)-P(a).logic*rnd(.6,1.4)); pl(order[0]).g+=3; pl(order[0]).tok++;
    if(DV()){ order.forEach((x,k)=>pl(x).g+=[3,2,1][k]||0); pl(order[0]).g-=3; pl(order[0]).tok--; st.lastOrder=order; const [c2,o2]=bottom2(); const w2=simDuel(c2,o2), l2=w2===c2?o2:c2; pl(l2).out=st.ep; st.log.push({ep:st.ep,out:l2,by:w2,game:null}); epRec({ep:st.ep,game:id,top:order[0],dw:w2,dl:l2,ff:1}); feed(`제${st.ep}회 「${id?GAMES[id].title:'메인 매치'}」 1위 ${who(order[0])} · ⛓️ 감옥 ${who(c2)} vs ${who(o2)} → ${who(l2)} 탈락`,''); continue; }
    let c=null; const free=order.slice(1).reverse().find(x=>!pl(x).tok); if(!free) c=order[order.length-1]; else for(let k=order.length-1;k>=1;k--){ const p=pl(order[k]); if(p.tok&&order[k]!==free){ p.tok--; continue; } c=order[k]; break; }
    st.lobby=null; const o=npcPick(c).id, w=simDuel(c,o), l=w===c?o:c; pl(l).out=st.ep; pl(w).g++; st.log.push({ep:st.ep,out:l,by:w,game:null}); epRec({ep:st.ep,game:id,top:order[0],dw:w,dl:l,ff:1}); addRel(o,c,-.5);
    feed(`제${st.ep}회 「${id?GAMES[id].title:'메인 매치'}」 1위 ${who(order[0])} · 데스매치 ${who(c)} vs ${who(o)} → ${who(l)} 탈락`,''); }
  const [a,b]=alive().map(x=>x.id); const keep=st.feed; startFinal(); let k=0; while(st.phase==='final'&&k++<3) simFinalGame(); st.feed=keep.concat(st.feed); save(); }

/* ── 휴식 시간 행동 ── */
function act(a,t,x){
  if(a==='new'){ newSeason(t||'genius'); }
  else if(a==='reset'){ if(!window.confirm('지금 시즌을 버리고 새 시즌을 시작할까요?')) return; newSeason(st.fmt); }
  else if(a==='bid'){ runAuction(+t||0); }
  else if(a==='dpick'){ if(st.phase!=='deathPick'||!(st.deathOpts||[]).includes(t)) return; st.death=t; st.phase='death'; feed(`🎮 ${who('me')} — 데스매치 게임으로 「${GAMES[t].title}」 선택!`,'host'); }
  else if(a==='dguide'){ if(window.openGuide) openGuide(t); return; }
  else if(a==='buyTip'){ const E=st.evt; if(!E||E.k!=='tip'||E.done||pl('me').g<E.cost) return; pl('me').g-=E.cost; E.done=1; feed(`💡 팁 — ${U.esc(tipOf(st.next))}`,'win'); }
  else if(a==='side'){ const E=st.evt; if(!E||E.k!=='fight'||E.done||!t) return; E.done=1; const o=t===E.a?E.b:E.a; addRel(t,'me',.3); addRel(o,'me',-.3); feed(`🤝 ${who('me')} — ${who(t)} 편을 들었어요`,''); say(t,pickLine(t,['역시 알아주네요 🤝','고마워요, 기억할게요.'])); say(o,pickLine(o,['…그렇게 나오는군요 😒','둘이 한편이었네요?'])); }
  else if(a==='begin'){ st.phase='hub'; restRoom(); }
  else if(a==='main'){ const al=alive().map(x=>x.id), npcs=U.shuffle(al.filter(x=>x!=='me')); const id=st.next||pickMain(al.length); if(!id) return; startMatch('main',id,npcs[0],npcs.slice(1)); return; }
  else if(a==='replay'){ const g=st.game; if(g) startMatch(g.kind,g.id,g.opp,g.cast); return; }
  else if(a==='guide'){ if(st.next&&window.openGuide) openGuide(st.next); return; }
  else if(a==='ally'){ if(st.acted.ally) return; st.acted.ally=1; const p=P(t), v=rel(t,'me')+p.trust*.3+rnd(-.2,.2);
    if(v>.15){ st.ally[allyKey(t,'me')]=1; addRel(t,'me',.3); say(t,pickLine(t,['좋아요! 연합 🤝 서로 지목 안 하기예요.','콜! 끝까지 같이 가요.'])); }
    else { addRel(t,'me',-.05); say(t,pickLine(t,['음… 아직은 혼자 갈게요.','미안해요, 아직 못 믿겠어요.'])); } }
  else if(a==='acceptOffer'){ const o=st.offer; if(!o) return; st.ally[allyKey(o,'me')]=1; addRel(o,'me',.3); st.offer=null; say(o,'좋아요! 우리 연합이에요 🤝'); }
  else if(a==='declineOffer'){ const o=st.offer; if(!o) return; addRel(o,'me',-.25); st.offer=null; say(o,pickLine(o,['…그래요. 기억해 둘게요.','아쉽네요. 마음 바뀌면 말해요.'])); }
  else if(a==='gift'){ if(st.acted.gift||pl('me').g<1) return; st.acted.gift=1; pl('me').g--; pl(t).g++; addRel(t,'me',.25); say(t,pickLine(t,['가넷이요? 고마워요! 잊지 않을게요 🥹','오… 고마워요. 빚진 걸로 할게요.'])); }
  else if(a==='tok'){ if(st.acted.tok||pl('me').tok<1||!t) return; st.acted.tok=1; pl('me').tok--; pl(t).tok++; addRel(t,'me',.6); alive().forEach(y=>{ if(y.id!==t&&y.id!=='me') addRel(y.id,'me',-.05); }); feed(`🛡️ ${who('me')} → ${who(t)} 생명의 징표를 넘겼어요!`,'host'); say(t,pickLine(t,['징표를요?! 이 은혜 꼭 갚을게요 🥹','정말요? …평생 기억할게요.'])); memAdd(t,'saved'); }
  else if(a==='sound'){ if(st.acted.sound||!t) return; st.acted.sound=1; const r=rel(t,'me'); const top=npcsAlive().filter(x=>x!==t).sort((x,y)=>rel(t,x)-rel(t,y))[0];
    say(t, r>.2&&top?fill(pickLine(t,['솔직히 말하면 {x}이(가) 제일 껄끄러워요.','저는 {x}만 조심하면 될 것 같아요.']),{x:nmOf(top)}): r<-.2?pickLine(t,['제 속마음을 왜 당신한테 말해요?','글쎄요 😏']):pickLine(t,['아직은 다 비슷해요.','음… 아직 잘 모르겠어요.'])); }
  else if(a==='lobby'){ lobbyAct(t,x&&x.t,x&&x.amt); }
  else if(a==='lobbyEnd'){ endLobby(); }
  else if(a==='vote'){ if(st.phase!=='vote') return; st.vote.votes.me=t; feed(`🗳️ 나는 ${who(t)}에게 한 표`,''); tally(); }
  else if(a==='pick'){ if(st.phase!=='pick') return; nominate('me',t); }
  else if(a==='deathNpc'){ runNpcDeath(); }
  else if(a==='play'){ playDeath(); return; }
  else if(a==='final'){ if(st.cand==='me'||st.oppo==='me'){ playFinal(); return; } simFinalGame(); }
  else if(a==='next'){ nextEp(); }
  else if(a==='ff'){ fastForward(); }
  else if(a==='retry'){ retry(); }
  else if(a==='close'){ open=false; render(); return; }
  save(); render();
}

/* ── 그리기 ── */
function bar(v){ const pc=Math.round((v+1)*50); return `<span class="ss-bar ${v>.25?'up':v<-.25?'down':''}"><i style="width:${pc}%"></i></span>`; }
function seasonPolitics(){ const al=alive().map(x=>x.id), idx={}; al.forEach((id,k)=>idx[id]=k); const list=[];
  for(const a of al){ if(a==='me') continue; const o=al.filter(b=>b!==a); const lo=o.sort((x,y)=>rel(a,x)-rel(a,y))[0], hi=o.slice().sort((x,y)=>rel(a,y)-rel(a,x))[0];
    if(lo!=null&&rel(a,lo)<-.25) list.push({seat:idx[a],t:idx[lo],kind:'acc'}); if(hi!=null&&rel(a,hi)>.3) list.push({seat:idx[a],t:idx[hi],kind:'trust'}); }
  for(const k in st.ally){ const [a,b]=k.split('|'); if(idx[a]!=null&&idx[b]!=null&&a!=='me'&&b!=='me') list.push({seat:idx[a],t:idx[b],kind:'trust'},{seat:idx[b],t:idx[a],kind:'trust'}); }
  const pacts=npcsAlive().filter(x=>isAlly(x,'me')).map(x=>[idx.me,idx[x],false]);
  return U.politics(list,{seats:al.map((_,k)=>k),emo:k=>emoOf(al[k]),name:k=>U.esc(nmOf(al[k])),me:idx.me,pacts}); }
function draw(el){
  if(!st){ el.innerHTML=`<div class="ss-wrap"><button class="ghost small" data-sa="close">← 처음으로</button><div class="ss-empty"><div class="ss-logo">🏆</div><h2>서바이벌 시즌</h2><p>동물 친구 7명과 여러 회차를 이어서 겨뤄요. 관계·연합·거래·배신이 다음 회차와 다음 시즌까지 이어져요.</p><div class="ss-fmt"><button data-sa="new" data-t="genius"><b>🏆 더 지니어스</b><small>🟣 가넷 · 🛡️ 생명의 징표 · 꼴찌가 데스매치 상대 지목 · 🏛️ 로비</small></button><button class="devil" data-sa="new" data-t="devil"><b>😈 데블스 플랜</b><small>🧩 피스 모으기 · 피스 최하위 둘이 ⛓️ 감옥 매치 · 피스 거래·빌리기</small></button></div></div></div>`; bind(el); return; }
  const me=pl('me'), al=alive(); const sig0=st.phase+':'+st.feed.length+':'+st.ep, fresh=sig0!==lastSig;
  if((st.phase==='death'||st.phase==='final')&&st.death&&!GAMES[st.death]){ st.death=pickDeath(); save(); }
  let h=`<div class="ss-wrap"><div class="ss-top"><button class="ghost small" data-sa="close">← 처음으로</button><b>${SHOW().replace(' · 놀이터','')} · 시즌 ${st.no}</b><button class="ghost small ss-reset" data-sa="reset" title="지금 시즌을 버리고 새로 시작">🔁 새로 시작</button><span>${st.phase==='champ'?'끝':st.phase==='opening'?'개막식':st.phase==='final'?'결승':`제${st.ep}회 · 남은 ${al.length}명`}</span></div>`;
  /* 참가자 */
  h+=`<div class="ss-players">${st.players.map(p=>{ const id=p.id, r=id==='me'?null:rel(id,'me');
    return `<div class="ss-p ${p.out?'out':''} ${id==='me'?'me':''} ${st.cand===id||st.oppo===id?'hot':''} ${st.champ===id?'champ':''}"><div class="ss-emo">${emoOf(id)}${p.tok?'<i class="ss-tok" title="생명의 징표">🛡️</i>':''}</div><div class="ss-nm">${U.esc(nmOf(id))}${id!=='me'&&isAlly(id,'me')?' 🤝':''}</div>${id==='me'?'<small>나</small>':`<small>${P(id).arch}</small>`}<div class="ss-g">${CI()} ${p.g}</div>${r!=null&&!p.out?`<div class="ss-rel" title="나를 믿는 정도">💗${bar(r)}</div>`:''}${p.out?`<div class="ss-out">${p.out}회 탈락</div>`:''}</div>`; }).join('')}</div>`;
  /* 회차 카드 */
  if(st.phase==='hub'&&st.next){ const g=GAMES[st.next]; h+=`<div class="ss-card"><div class="ss-ep">제${st.ep}회 메인 매치</div><div class="ss-gt">${g.emoji} ${U.esc(g.title)}</div><div class="ss-gs">${U.esc(g.tagline||'')}</div><button class="ghost small" data-sa="guide">📖 규칙 보기</button></div>`; }
  if(st.phase==='death'&&st.death){ const g=GAMES[st.death]; h+=`<div class="ss-card death"><div class="ss-ep">${DV()?'⛓️ 감옥 매치':'⚔️ 데스매치'}</div><div class="ss-gt">${g.emoji} ${U.esc(g.title)}</div><div class="ss-vs">${who(st.cand)} <span>VS</span> ${who(st.oppo)}</div></div>`; }
  if(st.phase==='final'&&st.final){ const F=st.final; h+=`<div class="ss-card final"><div class="ss-ep">🏆 결승 · 3판 2선승</div><div class="ss-vs">${who(st.cand)} <span>${F.score[st.cand]} : ${F.score[st.oppo]}</span> ${who(st.oppo)}</div><div class="ss-gs">${F.games.map((g,k)=>`${k<F.idx?'✅':k===F.idx?'▶':'·'} ${GAMES[g].title}`).join(' · ')}</div></div>`; }
  /* 진행 피드: 한 줄씩 */
  h+=`<div class="ss-feed ${fresh?'':'still'}">${st.feed.map((f,k)=>`<div class="ss-line ${f.kind||''} ${f.id?'say':''}" style="animation-delay:${Math.min(k,14)*.75}s">${f.id?`${who(f.id)} <span>${U.esc(f.text)}</span>`:f.text}</div>`).join('')}</div>`;
  const dl=`style="animation-delay:${Math.min(st.feed.length,14)*.75}s"`;
  h+=`<div class="ss-act ${fresh?'':'still'}" ${dl}>`;
  const npcs=al.filter(x=>x.id!=='me');
  if(st.phase==='opening') h+=`<button class="ss-go" data-sa="begin">▶ 제1회 시작</button>`;
  if(st.phase==='hub'){ const g=st.next&&GAMES[st.next];
    if(st.evt&&!st.evt.done&&st.evt.k==='tip') h+=`<div class="ss-offer">🎙️ 다음 게임 팁 ${CI()} ${st.evt.cost}개 <button data-sa="buyTip" ${me.g<st.evt.cost?'disabled':''}>💡 사기</button></div>`;
    if(st.evt&&!st.evt.done&&st.evt.k==='fight') h+=`<div class="ss-offer">⚔️ 누구 편을 들까요? <button class="ghost" data-sa="side" data-t="${st.evt.a}">${emoOf(st.evt.a)} ${U.esc(nmOf(st.evt.a))}</button><button class="ghost" data-sa="side" data-t="${st.evt.b}">${emoOf(st.evt.b)} ${U.esc(nmOf(st.evt.b))}</button></div>`;
    if(st.offer) h+=`<div class="ss-offer">${who(st.offer)}의 연합 제안 <button data-sa="acceptOffer">🤝 받기</button><button class="ghost" data-sa="declineOffer">🙅 거절</button></div>`;
    if(st.auction&&st.auction.open) h+=`<div class="ss-lobby"><b>🛡️ 생명의 징표 경매</b> <small>몰래 걸 가넷 (지금 ${me.g}개) — 가장 많이 건 사람이 낙찰, 건 가넷은 사라짐</small><div class="ss-mine">${[0,1,2,3,4,5,6].filter(n=>n<=me.g).map(n=>`<button class="ghost small" data-sa="bid" data-t="${n}">${n?`🟣 ${n}`:'안 걸기'}</button>`).join('')}</div></div>`;
    h+=`<div class="ss-mine"><span>🤝 연합 제안${st.acted.ally?' (했음)':''}</span>${npcs.filter(x=>!isAlly(x.id,'me')).map(x=>`<button class="ghost small" data-sa="ally" data-t="${x.id}" ${st.acted.ally?'disabled':''}>${emoOf(x.id)}</button>`).join('')}</div>`;
    h+=`<div class="ss-mine"><span>🎁 ${CN()} 1개 주기${st.acted.gift?' (했음)':''}</span>${npcs.map(x=>`<button class="ghost small" data-sa="gift" data-t="${x.id}" ${st.acted.gift||me.g<1?'disabled':''}>${emoOf(x.id)}</button>`).join('')}</div>`;
    h+=`<div class="ss-mine"><span>👂 속마음 떠보기${st.acted.sound?' (했음)':''}</span>${npcs.map(x=>`<button class="ghost small" data-sa="sound" data-t="${x.id}" ${st.acted.sound?'disabled':''}>${emoOf(x.id)}</button>`).join('')}</div>`;
    if(me.tok) h+=`<div class="ss-mine"><span>🛡️ 징표 넘기기${st.acted.tok?' (했음)':''}</span>${npcs.map(x=>`<button class="ghost small" data-sa="tok" data-t="${x.id}" ${st.acted.tok?'disabled':''}>${emoOf(x.id)}</button>`).join('')}</div>`;
    h+= st.auction&&st.auction.open ? '<p><small>👆 경매에 먼저 참여하세요</small></p>' : g ? `<button class="ss-go" data-sa="main">▶ 제${st.ep}회 메인 매치 — ${g.emoji} ${U.esc(g.title)}</button>` : '<p>이 인원에 맞는 게임이 없어요</p>'; }
  if(st.game&&!st.game.done&&st.phase!=='champ') h+=`<button class="ss-go" data-sa="replay">▶ 하던 ${st.game.kind==='main'?'메인 매치':st.game.kind==='final'?'결승':'데스매치'} 다시 시작</button>`;
  if(st.phase==='lobby'&&st.lobby&&st.lobby.kind==='trade'){ const L=st.lobby, b=bottom2();
    h+=`<div class="ss-lobby"><b>🧩 피스 거래 시간</b> <small>지금 감옥 후보: ${b.map(x=>emoOf(x)+' '+U.esc(nmOf(x))).join(' · ')} · 각각 한 번씩</small>
      ${L.offers.map(o=>o.kind==='loanReq'?`<div class="ss-mine">${who(o.id)}: "1개만 빌려주세요, 2개로 갚을게요" ${o.taken?'✅ 빌려줌':`<button class="small" data-sa="lobby" data-t="lend" data-x="${o.id}" ${me.g<1||L.used.lend?'disabled':''}>🧩 빌려주기</button>`}</div>`:o.kind==='loanGive'?`<div class="ss-mine">${who(o.id)}: "1개 빌려줄게요, 2개로 갚아요" ${o.taken?'✅ 빌림':`<button class="small" data-sa="lobby" data-t="borrow" data-x="${o.id}" ${L.used.borrow?'disabled':''}>🧩 빌리기</button>`}</div>`:'').join('')}
      <div class="ss-mine"><span>🧩 1개 주기</span>${npcs.map(x=>`<button class="ghost small" data-sa="lobby" data-t="give" data-x="${x.id}" ${L.used.give||me.g<1?'disabled':''}>${emoOf(x.id)}</button>`).join('')}</div>
      <div class="ss-mine"><span>🙏 1개만 달라고 하기</span>${npcs.map(x=>`<button class="ghost small" data-sa="lobby" data-t="ask" data-x="${x.id}" ${L.used.ask?'disabled':''}>${emoOf(x.id)}</button>`).join('')}</div></div>`;
    h+=`<button class="ss-go" data-sa="lobbyEnd">⛓️ 감옥 매치 결정</button>`; }
  if(st.phase==='lobby'&&!(st.lobby&&st.lobby.kind==='trade')){ const L=st.lobby, E=eligible();
    if(L.kind==='pick'&&st.cand!=='me'){ const c=st.cand;
      h+=`<div class="ss-lobby"><b>🏛️ ${who(c)}에게 로비</b> <small>각각 한 번씩</small>
        <div class="ss-mine"><button class="ghost small" data-sa="lobby" data-t="plea" ${L.used.plea||me.tok?'disabled':''}>🙏 저 말고요</button>${[1,2].map(n=>`<button class="ghost small" data-sa="lobby" data-t="deal" data-amt="${n}" ${L.used.deal||me.g<n||me.tok?'disabled':''}>🟣 가넷 ${n}개 줄게요, 저 지목 마요</button>`).join('')}</div>
        <div class="ss-mine"><span>🎯 이 사람 지목해요</span>${E.filter(x=>x!==c&&x!=='me').map(x=>`<button class="ghost small" data-sa="lobby" data-t="push" data-x="${x}" ${L.used.push?'disabled':''}>${emoOf(x)}</button>`).join('')}</div>
        ${me.tok?'<small>🛡️ 나는 징표가 있어 지목당하지 않아요</small>':''}</div>`; }
    if(L.kind==='pick'&&st.cand==='me'){ const offs=L.offers.filter(o=>o.kind==='deal');
      h+=`<div class="ss-lobby"><b>🏛️ 내가 후보 — 동물들의 로비</b> ${offs.map(o=>`<div class="ss-mine">${who(o.id)} 가넷 ${o.amt}개 제안 ${o.taken?'✅ 받음 (지목하면 배신!)':`<button class="small" data-sa="lobby" data-t="take" data-x="${o.id}">🤝 받기</button>`}</div>`).join('')||'<small>거래 제안은 없어요</small>'}</div>`; }
    if(L.kind==='vote'){ const V=st.vote, inV=V.pool.includes('me');
      h+=`<div class="ss-lobby"><b>🏛️ 진 팀 투표 로비</b> <small>진 팀: ${V.pool.map(x=>emoOf(x)).join(' ')}</small>
        ${L.offers.filter(o=>o.kind==='vote').map(o=>`<div class="ss-mine">${who(o.id)}: "${nmOf(o.t)} 찍어요" ${o.taken?'✅':`<button class="small" data-sa="lobby" data-t="take" data-x="${o.id}">🤝 표 맞추기</button>`}</div>`).join('')}
        ${inV?`<div class="ss-mine"><span>🗳️ 다들 이 사람에게 표 줘요</span>${V.pool.filter(x=>x!=='me'&&!pl(x).tok).map(x=>`<button class="ghost small" data-sa="lobby" data-t="votePush" data-x="${x}" ${L.used.votePush?'disabled':''}>${emoOf(x)}</button>`).join('')}</div>
        <div class="ss-mine">${[1,2].map(n=>`<button class="ghost small" data-sa="lobby" data-t="voteDeal" data-amt="${n}" ${L.used.voteDeal||me.g<n?'disabled':''}>🟣 저 안 찍으면 가넷 ${n}개씩</button>`).join('')}</div>`:'<small>나는 이긴 팀이라 지켜봐요</small>'}</div>`; }
    h+=`<button class="ss-go" data-sa="lobbyEnd">${L.kind==='vote'?'🗳️ 투표로':st.cand==='me'?'👉 상대 지목하러':'⚖️ 후보의 지목 보기'}</button>`; }
  if(st.phase==='vote'){ const V=st.vote; h+=`<div class="ss-mine"><span>🗳️ 데스매치 후보에 한 표:</span>${V.pool.filter(x=>x!=='me'&&!pl(x).tok).map(x=>`<button class="ghost small" data-sa="vote" data-t="${x}">${emoOf(x)} ${U.esc(nmOf(x))}${st.lobby&&st.lobby.myVote===x?' (약속)':''}</button>`).join('')}</div>`; }
  if(st.phase==='pick'){ const myD=(st.lobby&&st.lobby.myDeal)||{}; h+=`<div class="ss-mine"><span>⚔️ 상대 지목:</span>${(al.some(x=>x.id!=='me'&&!x.tok)?al.filter(x=>x.id!=='me'&&!x.tok):al.filter(x=>x.id!=='me')).map(x=>`<button class="ghost small" data-sa="pick" data-t="${x.id}">${emoOf(x.id)} ${U.esc(nmOf(x.id))}${isAlly(x.id,'me')?' 🤝':''}${myD[x.id]?' 🟣거래':''}</button>`).join('')}</div>`; }
  if(st.phase==='deathPick'){ h+=`<div class="ss-dpick">${st.deathOpts.map(id=>{ const g=GAMES[id]; return `<div class="ss-dopt"><div class="ss-gt">${g.emoji} ${U.esc(g.title)}</div><small>${U.esc(g.tagline||'')}</small><div class="ss-mine"><button data-sa="dpick" data-t="${id}">이걸로!</button><button class="ghost small" data-sa="dguide" data-t="${id}">📖 규칙</button></div></div>`; }).join('')}</div>`; }
  if(st.phase==='death'){ const g=GAMES[st.death], mine=st.cand==='me'||st.oppo==='me';
    h+= mine ? `<button class="ss-go" data-sa="play">⚔️ 데스매치 시작 — ${g.emoji} ${U.esc(g.title)}</button>` : `<button class="ss-go" data-sa="deathNpc">⚔️ 데스매치 지켜보기 — ${g.emoji} ${U.esc(g.title)}</button>`; }
  if(st.phase==='next') h+=`<button class="ss-go" data-sa="next">${al.length<=2?'🏆 결승으로':'☕ 다음 회차로'}</button>`;
  if(st.phase==='spect') h+=`<button class="ss-go" data-sa="ff">⏩ 남은 회차 관전하기</button>`;
  if(st.snap&&(st.phase==='spect'||(st.phase==='champ'&&st.champ!=='me'))) h+=`<button class="ghost ss-retry" data-sa="retry">↩️ ${st.phase==='champ'?'결승':'데스매치'} 직전으로 다시 도전</button>`;
  if(st.phase==='final'){ const F=st.final, g=GAMES[F.games[F.idx]]; h+=`<button class="ss-go" data-sa="final">${st.cand==='me'||st.oppo==='me'?`🏆 결승 ${F.idx+1}판 시작`:`🏆 결승 ${F.idx+1}판 지켜보기`} — ${g.emoji} ${U.esc(g.title)}</button>`; }
  if(st.phase==='champ') h+=`<div class="ss-fmt"><button data-sa="new" data-t="genius"><b>🏆 새 지니어스 시즌</b><small>관계는 기억돼요</small></button><button class="devil" data-sa="new" data-t="devil"><b>😈 새 데블스 플랜 시즌</b><small>관계는 기억돼요</small></button></div>`;
  h+='</div>';
  /* 판세·기록 */
  if(!['opening','champ'].includes(st.phase)) h+=seasonPolitics();
  if((st.eps||[]).length) h+=`<details class="ss-log" ${st.phase==='champ'?'open':''}><summary>📜 시즌 기록 (${st.eps.length}회)</summary>${st.eps.map(e=>{ const G=GAMES[e.game], D=e.dg&&GAMES[e.dg]; return `<div class="ss-ep-row"><b>제${e.ep}회</b> ${G?G.emoji+' '+U.esc(G.title):'메인 매치'} — ${e.team?`🏅 ${e.team.map(emoOf).join('')} 팀 승리`:e.top?`1위 ${who(e.top)}`:''}${e.meR?` · 나 ${e.team?(e.team.includes('me')?'이긴 팀':'진 팀'):e.meR+'위'}`:''}${e.dl?`<br><small>${DV()?'⛓️':'⚔️'} ${who(e.dw)} vs ${who(e.dl)}${D?` (${U.esc(D.title)})`:''} → 💀 ${who(e.dl)} 탈락${e.ff?' · 관전':''}</small>`:''}</div>`; }).join('')}</details>`;
  else if(st.log.length) h+=`<details class="ss-log"><summary>📜 탈락 기록 (${st.log.length})</summary>${st.log.map(l=>`<div>제${l.ep}회 · ${who(l.out)} 탈락 (데스매치 상대 ${who(l.by)})</div>`).join('')}</details>`;
  { const gr=al.slice().sort((a,b)=>b.g-a.g); h+=`<details class="ss-log" ${DV()?'open':''}><summary>${CI()} ${CN()} 순위${DV()?' — 최하위 둘이 감옥':''}</summary>${gr.map((p,k)=>`<div>${k+1}. ${who(p.id)} ${p.g}개${p.tok?' 🛡️':''}</div>`).join('')}</details>`; }
  h+='</div>';
  el.innerHTML=h; fixJosa(el); bind(el);
  const sig=st.phase+':'+st.feed.length+':'+st.ep; if(sig!==lastSig){ lastSig=sig; st.feed.forEach((f,k)=>{ if(k>14) return; setTimeout(()=>{ if(open) sfx(f.kind==='win'?'win':f.kind==='bad'?'bad':f.kind==='host'?'host':'tick'); },k*750); }); }
}
let lastSig='';
function bind(el){ el.onclick=e=>{ const b=e.target.closest('[data-sa]'); if(!b||b.disabled) return; act(b.dataset.sa,b.dataset.t,{t:b.dataset.x,amt:+b.dataset.amt||1}); }; }
function entry(el){ if(!el) return; load(); const on=st&&st.phase!=='champ';
  el.innerHTML=`<button class="ss-entry" type="button"><b>🏆 서바이벌 시즌 — 더 지니어스 · 😈 데블스 플랜</b><span>${on?`${SHOW()} 시즌 ${st.no} · ${st.phase==='opening'?'개막식':`제${st.ep}회`} 진행 중 — 이어 하기`:'동물 친구 7명과 탈락전 · 가넷·징표·피스·로비·연합·배신이 이어져요'}</span></button>`;
  el.firstChild.onclick=()=>{ open=true; render(); }; }
function opp(){ if(!st||!st.game||st.game.done||mode!=='solo'||gameId!==st.game.id) return null; const id=st.game.opp; return id&&id!=='me'?P(id):null; }

load();
const active=()=>!!(st&&st.game&&!st.game.done&&mode==='solo'&&gameId===st.game.id);
window.Season={ active, kind:()=>active()?st.game.kind:null, oppId:()=>st&&st.game?st.game.opp:null, isOpen:()=>open, draw:el=>{ draw(el); }, afterRender, entry, onLeave, opp, rel:(a,b)=>st?rel(a,b):0 };
})();
