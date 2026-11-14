(function(){
'use strict';
/* 부패 경찰 (6인: 우리 둘 + NPC 4명). 역할(무작위): 🦹 도둑 1(공개) · 🕵️ 부패 경찰 1(비밀, 매 라운드 도둑 위치를 앎) · 👮 경찰 4.
   지하철 18역, 💎 피스 8곳(도둑만 앎). 10라운드: 도둑이 몰래 최대 2역 이동(지나간 역의 피스도 획득) → 경찰이 한 명씩
   (2역까지 이동 가능) 🔍 조사(그 역에 도둑이 몇 라운드 전에 지나갔는지, 나만 앎 — 공개할지·거짓말할지 선택) 또는 🚨 체포(도둑이 있으면 체포, 단 부패 경찰은 늘 실패).
   도둑이 피스 5개 → 도둑·부패 경찰 승. 도둑 체포 또는 10라운드 버팀 → 경찰 승. 끝나고 경찰들이 부패 경찰을 투표로 지목(맞히면 부패 경찰 패). */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로, 나머지는 NPC */
const N=6, ROUNDS=10, NEED=6, PIECES=8; let HSEAT=[0,3]; const SEATORD=[0,3,1,4,2,5];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i);
const ALL=[...Array(N).keys()];
const ROLE={thief:'🦹 도둑', corrupt:'🕵️ 부패 경찰', cop:'👮 경찰'};
const STYLE={seojin:'logic', doyun:'emo', haram:'calm', yuna:'emo', minho:'sly', taekyung:'emo', jihu:'sly', soyul:'logic'};
const DEF_P={talk:.6,aggr:.5,trust:.5,bluff:.5,logic:.6,temper:.4};
const nm=i=>`{s${i}}`;
/* 역: 3줄 × 6역 + 환승 */
const ST=[...Array(18)].map((_,i)=>({r:Math.floor(i/6), c:i%6}));
const NAMES=['서울역','시청','종로','동대문','성수','강변','신촌','홍대','합정','여의도','노량진','사당','신림','구로','가산','광명','안양','수원'];
const EDGES=[]; for(let r=0;r<3;r++) for(let c=0;c<5;c++) EDGES.push([r*6+c,r*6+c+1]);
[[0,6],[2,8],[4,10],[5,11],[7,13],[9,15],[11,17],[6,12],[3,9],[8,14]].forEach(e=>EDGES.push(e));
const ADJ=ST.map((_,i)=>EDGES.filter(e=>e.includes(i)).map(e=>e[0]===i?e[1]:e[0]));
const DIST=ST.map((_,a)=>{ const d=Array(18).fill(99); d[a]=0; const q=[a]; while(q.length){ const x=q.shift(); for(const y of ADJ[x]) if(d[y]>d[x]+1){ d[y]=d[x]+1; q.push(y); } } return d; });
const within=(set,k)=>{ const out=new Set(); for(const a of set) for(let b=0;b<18;b++) if(DIST[a][b]<=k) out.add(b); return out; };

function init(starter,o){ { const hk=Math.max(2,Math.min(6,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,hk); }
  const roles=U.shuffle(['thief','corrupt','cop','cop','cop','cop']);
  const thief=roles.indexOf('thief'), corrupt=roles.indexOf('corrupt');
  const pos=Array(N).fill(0); const order=U.shuffle([...Array(18).keys()]);
  const tStart=order[0]; pos[thief]=tStart;
  const copStarts=order.filter(x=>DIST[tStart][x]>=3); let k=0; for(const i of ALL) if(i!==thief) pos[i]=copStarts[(k++)%copStarts.length];
  const pieces=U.shuffle([...Array(18).keys()].filter(x=>x!==tStart)).slice(0,PIECES);
  const s={roles, thief, corrupt, pos, pieces, got:0, visit:Array(18).fill(null), round:0, phase:'roles', ready:HSEAT.map(()=>false),
    notes:ALL.map(()=>[]), shared:[], fails:[], lost:[], ord:U.shuffle(ALL.filter(i=>i!==thief)), cur:-1, actor:null,
    sus:ALL.map(()=>Array(N).fill(0)), P:ALL.map(()=>[tStart]), votes:Array(N).fill(null),
    who:{}, used:{}, say:null, q:[], log:[], turn:null, starter, winner:null, notice:'역할을 확인하세요', ev:0};
  s.visit[tStart]=0;
  s.hs=HSEAT.slice(); const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k2)=>s.who[i]=ids[k2]);
  s.log.push(`🎙️ 도둑은 ${nm(thief)}! 출발역 ${NAMES[tStart]}`);
  return s;
}
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;

/* ── 진행 ── */
function startRound(s){
  s.round++; s.phase='thief'; s.cur=-1; s.notice=`🌙 ${s.round}라운드 — 🦹 도둑이 몰래 움직이는 중…`; s.log.push(`— ${s.round}라운드 —`);
  // NPC 경찰들의 추정 범위: 도둑은 최대 2역 이동
  for(const i of ALL) s.P[i]=[...within(s.P[i],2)];
  if(isH(s.thief)) s.turn=pOf(s.thief); else { s.turn=null; s.think=1800+Math.random()*1200; }
}
function thiefMove(s,path){   // path: 지나갈 역들(0~2개)
  const taken=[];
  for(const x of path){ s.pos[s.thief]=x; s.visit[x]=s.round; const k=s.pieces.indexOf(x); if(k>=0){ s.pieces.splice(k,1); s.got++; taken.push(x); } }
  s.visit[s.pos[s.thief]]=s.round;
  s.log.push('🦹 도둑이 움직였어요'); s.notice='👮 경찰 차례 — 한 명씩 움직여요'; s.turn=null;
  let cnt=s.got-taken.length;
  for(const x of taken){ cnt++; s.lost.push({at:x,r:s.round}); s.q.push({k:'note',text:`💎 ${NAMES[x]}의 피스가 사라졌어요! (지금까지 ${cnt}개)`}); for(const L of ALL) if(L!==s.thief){ const n=s.P[L].filter(y=>DIST[x][y]<=2); if(n.length) s.P[L]=n; } }
  if(s.got>=NEED){ s.phase='run'; s.q.push({k:'end',side:'thief'}); return; }
  s.phase='run'; s.q.push({k:'nextCop'});
}
function nextCop(s){
  s.cur++; if(s.cur>=s.ord.length){ s.phase='roundEnd'; s.turn=null; return; }
  const i=s.ord[s.cur]; s.actor=i; s.phase='cop'; s.notice=`💭 ${nm(i)} 차례 — 어디로 갈지 고민 중`;
  if(isH(i)) s.turn=pOf(i); else { s.turn=null; s.think=1200+Math.random()*1200*(.6+P(s,i).logic*.6); }
}
function copAct(s,i,a){   // a: {to, act:'inv'|'arrest', share?:{kind,claim}}
  const from=s.pos[i]; if(a.to!=null && a.to!==from) s.pos[i]=a.to;
  const lastLost=s.lost[s.lost.length-1];
  if(lastLost && lastLost.r>=s.round-1){ const best=Math.min(...[...Array(18).keys()].filter(x=>DIST[from][x]<=2).map(x=>DIST[x][lastLost.at]));
    if(DIST[s.pos[i]][lastLost.at]-best>=3) for(const L of ALL) if(L!==i&&L!==s.thief&&s.roles[L]!=='corrupt') s.sus[L][i]+=.4+P(s,L).logic*.5; }
  const at=s.pos[i], where=NAMES[at];
  if(a.act==='arrest'){
    const here = s.pos[s.thief]===at;
    if(here && s.roles[i]!=='corrupt'){ s.notice=`🚨 ${nm(i)}이(가) ${where}에서 도둑 체포!!`; s.log.push(s.notice); s.q.push({k:'react',kind:'caught',i}); s.phase='run'; s.turn=null; s.q.push({k:'end',side:'cop'}); return; }
    s.fails.push({by:i,at,r:s.round}); s.notice=`🚨 ${nm(i)} ${where}에서 체포 시도… 실패! 여기엔 없어요`; s.log.push(s.notice);
    for(const L of ALL) if(L!==s.thief && s.sus[L][i]<2) s.P[L]=s.P[L].filter(x=>x!==at);   // 믿는 동료의 실패 → 거기 없음
  } else {
    const v=s.visit[at], age = v==null ? null : s.round-v;
    s.notes[i].push({r:s.round, at, age});
    if(s.roles[i]!=='corrupt'){ const lastV = age==null ? -1 : s.round-age;
      for(const c of s.shared) if(c.at===at && c.by!==i){ const claimedV = c.age==null ? null : c.r-c.age;
        const lie = claimedV!=null ? claimedV>lastV : (lastV>=0 && lastV<=c.r);
        if(lie && !c.checked){ c.checked=true; s.sus[i][c.by]+=3.5; if(!isH(i)) s.q.push({k:'say',seat:i,text:lineOf(s,i,'liar',c.by,NAMES[at])||`${NAMES[at]} 직접 조사해 보니 ${c.r}라운드 보고가 틀렸어요 🤨`}); } } }
    s.notice=`🔍 ${nm(i)} ${where} 조사 (결과는 본인만)`; s.log.push(s.notice);
    learn(s,i,at,age,1);
    if(age!=null && s.roles[i]!=='corrupt'){ const r0=s.round-age; for(const fl of s.fails) if(fl.at===at && fl.r===r0 && fl.by!==i){ s.sus[i][fl.by]+=4; if(!isH(i)) s.q.push({k:'say',seat:i,text:lineOf(s,i,'fake',fl.by,NAMES[at])||`${NAMES[at]}에 그때 도둑이 있었는데… 체포 실패라고요? 🤨`}); } }
    if(!isH(i)) npcShare(s,i,at,age);
  }
  s.phase='acted'; s.turn=null; s.needShare = isH(i) && a.act==='inv';
}
function learn(s,L,at,age,w){   // L이 (at, age) 정보를 반영
  if(L===s.thief) return;
  if(age==null) s.P[L]=s.P[L].filter(x=>x!==at);
  else { const ok=new Set(); for(let b=0;b<18;b++) if(DIST[at][b]<=2*age+1) ok.add(b); const n=s.P[L].filter(x=>ok.has(x)); if(n.length) s.P[L]=n; }
}
function shareClaim(s,i,at,age,truth){
  const text = age==null ? `${NAMES[at]} 조사했는데 흔적 없어요` : age===0 ? `${NAMES[at]}에 이번 라운드 흔적이 있어요!` : `${NAMES[at]}에 ${age}라운드 전 흔적이 있어요`;
  s.shared.push({by:i,at,age,r:s.round,truth});
  s.q.push({k:'say',seat:i,text});
  // 피스가 사라진 역·시점과 맞지 않는 보고는 누가 봐도 거짓 (도둑은 라운드에 최대 2역)
  if(age!=null){ const r0=s.round-age; const bad=s.lost.find(l=>DIST[l.at][at] > 2*Math.abs(l.r-r0)+1);
    if(bad){ for(const L of ALL) if(L!==i&&L!==s.thief&&s.roles[L]!=='corrupt') s.sus[L][i]+=3;
      const c=ALL.filter(L=>L!==i&&L!==s.thief&&!isH(L)&&s.roles[L]!=='corrupt').sort((a,b)=>P(s,b).logic-P(s,a).logic)[0];
      if(c!=null) s.q.push({k:'say',seat:c,text:lineOf(s,c,'impossible',i,NAMES[at])||`${NAMES[at]}? ${NAMES[bad.at]}에서 피스가 사라졌는데 그건 불가능해요 🤨`}); } }
  // 듣는 NPC: 믿을 만하면 반영, 자기 조사와 다르면 의심
  for(const L of ALL){ if(L===i||L===s.thief||isH(L)) continue;
    const mine=s.notes[L].filter(n=>n.at===at).slice(-1)[0];
    if(mine){ const myAge = mine.age==null?null:mine.age+(s.round-mine.r); const same = (myAge==null&&age==null) || (myAge!=null&&age!=null&&Math.abs(myAge-age)<=0);
      if(!same && (mine.r===s.round || mine.age==null&&age!=null&&age<s.round-mine.r)){ s.sus[L][i]+=2+P(s,L).logic; if(Math.random()<.6) s.q.push({k:'say',seat:L,text:lineOf(s,L,'doubt',i,NAMES[at])||`${NAMES[at]}? 제 조사랑 다른데요 🤨`}); } }
    else if(s.sus[L][i]<1.5 && Math.random()<.4+P(s,L).trust*.5) learn(s,L,at,age,.7);
  }
}
function npcShare(s,i,at,age){
  const p=P(s,i);
  if(s.roles[i]==='corrupt'){   // 부패: 도둑 근처면 거짓 흔적을 엉뚱한 곳에
    const t=s.pos[s.thief];
    if(DIST[at][t]<=2 && Math.random()<.5+p.bluff*.45){ const far=[...Array(18).keys()].filter(x=>DIST[x][t]>=4); const fx=far.length?U.pick(far):at; return shareClaim(s,i,fx,U.pick([0,1]),false); }
    if(Math.random()<.4) return shareClaim(s,i,at, age==null?null:age, true);
    return;
  }
  if(Math.random()<.45+p.talk*.45) shareClaim(s,i,at,age,true);
}
function endRound(s){ if(s.round>=ROUNDS) return endGame(s,'cop'); startRound(s); }
function endGame(s,side){
  s.side=side; s.phase='vote'; s.turn=null; s.notice=`🎙️ ${side==='thief'?`도둑이 피스 ${s.got}개를 모았어요!`:'도둑을 막았어요!'} 이제 경찰들이 부패 경찰을 지목합니다`;
  s.log.push(s.notice);
  for(const i of ALL) if(i!==s.thief && !isH(i)) s.votes[i]=npcVote(s,i);
  s.voteDone=ALL.map(i=>i===s.thief||!isH(i)); s.ready=HSEAT.map(()=>false);
}
function npcVote(s,i){ if(s.roles[i]==='corrupt'){ return U.pick(ALL.filter(j=>j!==i&&j!==s.thief)); }
  const c=ALL.filter(j=>j!==i&&j!==s.thief); return c.sort((a,b)=>s.sus[i][b]-s.sus[i][a]+(Math.random()-.5)*.6)[0]; }
function tally(s){
  const cnt={}; for(const i of ALL) if(i!==s.thief && s.votes[i]!=null) cnt[s.votes[i]]=(cnt[s.votes[i]]||0)+1;
  const mx=Math.max(...Object.values(cnt)); const top=Object.keys(cnt).filter(k=>cnt[k]===mx).map(Number);
  const named = top.length===1 ? top[0] : null; s.named=named; s.cnt=cnt;
  const caught = named===s.corrupt;
  const won=i=> s.roles[i]==='thief' ? s.side==='thief' : s.roles[i]==='corrupt' ? (s.side==='thief' && !caught) : (s.side==='cop' || caught);
  const hw=HSEAT.map(won); s.winner = hw[0]&&hw[1]?'both':hw[0]?0:hw[1]?1:'none'; s.winners=HSEAT.map((h,p)=>hw[p]?p:-1).filter(x=>x>=0); s.phase='over'; s.turn=null;
  s.notice = `🎙️ 지목: ${named==null?'동점이라 아무도 못 지목':nm(named)} → ${caught?'정답! 부패 경찰 검거 🎉':`틀렸어요… 부패 경찰은 ${nm(s.corrupt)}`}`; s.log.push(s.notice);
}

/* ── NPC 판단 ── */
function npcThief(s){
  const t=s.thief, p=P(s,t), here=s.pos[t]; let best=null;
  const paths=[[]]; for(const a of ADJ[here]){ paths.push([a]); for(const b of ADJ[a]) if(b!==here) paths.push([a,b]); }
  for(const path of paths){ const end=path.length?path[path.length-1]:here;
    const gain=path.filter(x=>s.pieces.includes(x)).length;
    const danger=ALL.filter(i=>i!==t&&s.roles[i]!=='corrupt'&&DIST[s.pos[i]][end]<=1).length;
    const near=Math.min(...s.pieces.map(x=>DIST[end][x]).concat([9]));
    const v=gain*3.2 - danger*(2.5+(1-p.aggr)*2) - near*.4 + Math.random()*(1.4-p.logic);
    if(!best||v>best.v) best={v,path}; }
  return best.path;
}
function npcCop(s,i){
  const p=P(s,i), here=s.pos[i], reach=[...Array(18).keys()].filter(x=>DIST[here][x]<=2);
  if(s.roles[i]==='corrupt'){   // 부패: 동료가 도둑 근처에 몰리면 도둑 칸에서 일부러 "체포 실패"
    const t=s.pos[s.thief]; const threat=ALL.filter(j=>j!==i&&j!==s.thief&&DIST[s.pos[j]][t]<=1).length;
    if(reach.includes(t) && threat>0 && Math.random()<.5+p.bluff*.4) return {to:t,act:'arrest'};
    if(Math.random()<p.bluff*.7){ const blend=reach.filter(x=>DIST[x][t]===2||DIST[x][t]===3); if(blend.length) return {to:U.pick(blend),act:'inv'}; }   // 근처에서 조사하는 척
    const away=reach.sort((a,b)=>DIST[b][t]-DIST[a][t]+(Math.random()-.5)); return {to:away[0],act:'inv'};
  }
  const Pset=s.P[i]; const inReach=reach.filter(x=>Pset.includes(x));
  if(inReach.length && Pset.length<=3+p.aggr*2){ const tried=new Set(s.fails.filter(f=>f.r===s.round).map(f=>f.at)); const c=inReach.filter(x=>!tried.has(x)); if(c.length) return {to:U.pick(c),act:'arrest'}; }
  // 조사: 추정 범위 쪽으로, 아직 조사 안 한 역
  const seen=new Set(s.notes[i].filter(n=>s.round-n.r<2).map(n=>n.at));
  const score=x=>{ const d=Math.min(...Pset.map(y=>DIST[x][y])); return -d*2 + (Pset.includes(x)?2:0) - (seen.has(x)?3:0) + Math.random()*(1.2-p.logic); };
  const to=reach.sort((a,b)=>score(b)-score(a))[0]; return {to,act:'inv'};
}

/* ── 말 ── */
const LINES={
  sly:{liar:['{t}~ {a} 얘기, 제가 가 보니 아니던데요? 😏'], impossible:['{t}~ {a} 얘기는 계산이 안 맞는데요? 😏'], fake:['{t}~ {a}에서 일부러 놓친 거죠? 😏'], doubt:['{t}, {a} 얘기 좀 수상한데요~? 😏'], caught:['후후, 잡았다~'], fail:['어머 헛걸음~']},
  calm:{liar:['…{t}, {a} 보고는 틀렸어요.'], fake:['…{t}, {a}에서 왜 놓쳤어요?'], doubt:['…{t}, {a}는 아니에요.'], caught:['체포했습니다.'], fail:['…없네요.']},
  logic:{liar:['{t}, {a} 직접 조사해 보니 당신 보고가 틀렸어요.','{a} 결과가 {t} 말과 달라요. 기록해 둘게요.'], impossible:['{t}, {a}에 흔적이 있었다면 피스가 사라진 역과 거리가 안 맞아요. 거짓이에요.'], fake:['{t}, {a}에서 체포 실패했다면서요. 그 라운드에 도둑이 거기 있었어요.'], doubt:['{t}, {a} 정보가 제 조사랑 안 맞아요. 거짓말일 수 있어요.','{a}에 대한 {t}의 보고는 모순이에요.'], caught:['계산대로 여기 있었네요.'], fail:['여기를 지웠으니 범위가 줄었어요.']},
  emo:{liar:['{t}!! {a} 가 봤는데 거짓말이었잖아요!! 😤'], impossible:['{t} {a}라니 말이 돼요?! 😤'], fake:['{t}!! {a}에 도둑 있었잖아요!! 일부러 놓쳤죠?! 😤'], doubt:['{t}!! {a} 거짓말이죠?! 😤'], caught:['잡았다아아!! 🙌'], fail:['으악 없잖아 😭']},
};
function lineOf(s,seat,kind,t,a){ const p=P(s,seat), st=STYLE[p.id]||'calm', L=(LINES[st]||{})[kind]; if(!L) return null;
  const used=(s.used[seat]=s.used[seat]||[]), pool=L.filter(x=>!used.includes(x)); if(!pool.length) return null; const raw=U.pick(pool); used.push(raw);
  return raw.split('{t}').join(t!=null?nm(t):'').split('{a}').join(a||''); }

/* ── 시간 흐름 ── */
function stepDelay(s){ syncH(s);
  if(s.winner!=null) return null;
  if(s.phase==='roles') return s.ready.every(Boolean)?600:null;
  if(s.q.length) return s.q[0].k==='say'?1700:1100;
  if(s.phase==='thief') return isH(s.thief)?null:s.think;
  if(s.phase==='cop') return isH(s.actor)?null:s.think;
  if(s.phase==='acted') return s.needShare?null:900;   // 사람이 조사했으면 공유 여부를 정함
  if(s.phase==='roundEnd') return 1300;
  if(s.phase==='vote') return s.voteDone.every(Boolean)?1500:null;
  return null;
}
function step(s){ syncH(s);
  if(s.q.length){ const e=s.q.shift();
    if(e.k==='note'){ s.notice=e.text; s.log.push(e.text); }
    else if(e.k==='say'){ if(!isH(e.seat)){ s.say={seat:e.seat,text:e.text,n:(s.say?s.say.n:0)+1}; s.log.push(`${nm(e.seat)}: ${e.text}`); } }
    else if(e.k==='react'){ const text=!isH(e.i)&&lineOf(s,e.i,e.kind); if(text){ s.say={seat:e.i,text,n:(s.say?s.say.n:0)+1}; s.log.push(`${nm(e.i)}: ${text}`); } }
    else if(e.k==='end'){ endGame(s,e.side); }
    else if(e.k==='nextCop'){ nextCop(s); }
    s.ev++; return; }
  if(s.phase==='roles'){ startRound(s); return; }
  if(s.phase==='thief'&&!isH(s.thief)){ thiefMove(s,npcThief(s)); s.ev++; return; }
  if(s.phase==='cop'&&!isH(s.actor)){ copAct(s,s.actor,npcCop(s,s.actor)); s.ev++; return; }
  if(s.phase==='acted'){ nextCop(s); return; }
  if(s.phase==='roundEnd'){ endRound(s); return; }
  if(s.phase==='vote'&&s.voteDone.every(Boolean)){ tally(s); return; }
}
function apply(s,p,a){ syncH(s);
  if(s.winner!=null) return '게임이 끝났어요';
  if(!a) return '알 수 없는 동작';
  const seat=HSEAT[p];
  if(a.k==='ready'){ if(s.phase==='roles'){ s.ready[p]=true; } return null; }
  if(a.k==='move'){   // 도둑
    if(s.phase!=='thief'||s.thief!==seat) return '도둑 차례가 아니에요';
    const path=(Array.isArray(a.path)?a.path:[]).map(x=>x|0); if(path.length>2) return '최대 2역까지';
    let cur=s.pos[seat]; for(const x of path){ if(!ADJ[cur].includes(x)) return '이어진 역으로만 움직여요'; cur=x; }
    thiefMove(s,path); s.ev++; return null;
  }
  if(a.k==='cop'){
    if(s.phase!=='cop'||s.actor!==seat) return '내 차례가 아니에요';
    const to=a.to==null?s.pos[seat]:a.to|0; if(!(to>=0&&to<18)||DIST[s.pos[seat]][to]>2) return '2역 안으로만 움직일 수 있어요';
    if(a.act!=='inv'&&a.act!=='arrest') return '조사나 체포를 고르세요';
    copAct(s,seat,{to,act:a.act}); s.ev++; return null;
  }
  if(a.k==='share'){
    if(s.phase!=='acted'||s.actor!==seat||!s.needShare) return '지금은 공유할 때가 아니에요'; s.needShare=false;
    if(a.skip){ s.phase='acted_done'; nextCop(s); s.ev++; return null; }
    const at=a.at|0, age=a.age==null?null:a.age|0, last=s.notes[seat].slice(-1)[0];
    const truth = last && last.at===at && last.age===age;
    const text = age==null ? `${NAMES[at]} 조사했는데 흔적 없어요` : age===0 ? `${NAMES[at]}에 이번 라운드 흔적이 있어요!` : `${NAMES[at]}에 ${age}라운드 전 흔적이 있어요`;
    s.say={seat,text,n:(s.say?s.say.n:0)+1}; s.log.push(`${nm(seat)}: ${text}`);
    s.shared.push({by:seat,at,age,r:s.round,truth});
    for(const L of ALL){ if(L===seat||L===s.thief||isH(L)) continue; if(s.sus[L][seat]<1.5&&Math.random()<.6) learn(s,L,at,age,.7); }
    nextCop(s); s.ev++; return null;
  }
  if(a.k==='vote'){
    if(s.phase!=='vote'||s.voteDone[seat]) return '투표할 수 없어요';
    const t=a.t|0; if(!(t>=0&&t<N)||t===seat||t===s.thief) return '경찰 중에서 고르세요';
    s.votes[seat]=t; s.voteDone[seat]=true; s.ev++; return null;
  }
  return '알 수 없는 동작';
}
function mask(s,p){ syncH(s);
  const v=U.clone(s), me=HSEAT[p], over=s.phase==='over';
  const seeThief = over || me===s.thief || me===s.corrupt;
  if(!seeThief) v.pos[s.thief]=null;
  if(!over && me!==s.thief) v.pieces=null; else if(!over) v.pieces=s.pieces;
  v.visit=null; v.roles=s.roles.map((r,i)=> over||i===me||i===s.thief ? r : null); v.corrupt= over||me===s.corrupt ? s.corrupt : null;
  v.notes=ALL.map((_,i)=> i===me ? s.notes[i] : []); v.shared=s.shared.map(x=>({...x,truth:over?x.truth:undefined}));
  v.sus=[]; v.P=[]; v.votes= over ? s.votes : s.votes.map((x,i)=> i===me ? x : null); v.q=[]; v.used={}; v.think=null;
  return v;
}
/* ── 혼자 모드: 4번 자리를 컴퓨터가 ── */
function ai(v){ syncH(v);
  const seat=HSEAT[1];
  if(v.phase==='roles'&&!v.ready[1]) return {k:'ready'};
  if(v.phase==='thief'&&v.thief===seat){ const here=v.pos[seat]; const a=U.pick(ADJ[here]); const b=U.pick(ADJ[a].filter(x=>x!==here)); return {k:'move',path:Math.random()<.7&&b!=null?[a,b]:[a]}; }
  if(v.phase==='cop'&&v.actor===seat){ const here=v.pos[seat]; return {k:'cop',to:U.pick([...Array(18).keys()].filter(x=>DIST[here][x]<=2)),act:Math.random()<.25?'arrest':'inv'}; }
  if(v.phase==='acted'&&v.actor===seat&&v.needShare){ const n=v.notes[seat].slice(-1)[0]; return n&&Math.random()<.7 ? {k:'share',at:n.at,age:n.age} : {k:'share',skip:true}; }
  if(v.phase==='vote'&&!v.voteDone[seat]&&v.thief!==seat){ const c=ALL.filter(j=>j!==seat&&j!==v.thief); return {k:'vote',t:U.pick(c)}; }
  return null;
}

/* ── 화면 ── */
let WHO={}, path=[], moveTo=null, shareAge='real', sig='';
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}/g,(_,d)=>`${seatEmoji(+d)} ${seatName(+d,ctx)}`); }
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{};
  const me=HSEAT[ctx.me], myRole=v.roles[me];
  const sg=v.phase+':'+v.round+':'+v.actor; if(sg!==sig){ sig=sg; path=[]; moveTo=null; shareAge='real'; }
  const iAmThiefTurn=v.phase==='thief'&&v.thief===me&&v.turn===ctx.me, iAmCopTurn=v.phase==='cop'&&v.actor===me&&v.turn===ctx.me;
  const curPos = iAmThiefTurn ? (path.length?path[path.length-1]:v.pos[me]) : iAmCopTurn ? (moveTo!=null?moveTo:v.pos[me]) : null;
  const clickable = new Set(iAmThiefTurn&&path.length<2 ? ADJ[curPos].filter(x=>x!==v.pos[me]||path.length===0) : iAmCopTurn ? [...Array(18).keys()].filter(x=>DIST[v.pos[me]][x]<=2) : []);
  let h=`<div class="info">${v.round?`${v.round} / ${ROUNDS}라운드`:'준비'} · 나는 <b>${myRole?ROLE[myRole]:'?'}</b> · 🦹 피스 ${v.got} / ${NEED}${v.corrupt!=null&&myRole==='thief'?` · 내 편 부패 경찰: ${fill(nm(v.corrupt),ctx)}`:''}</div>`;
  h+=`<div class="hl-notice">${fill(v.notice||'',ctx)}</div>`;
  h+=`<div class="vr-speech">${v.say?`<span class="w">${seatEmoji(v.say.seat)} ${seatName(v.say.seat,ctx)}</span> ${fill(U.esc(v.say.text),ctx)}`:'<i>　</i>'}</div>`;
  // 지도
  const X=c=>30+c*62, Y=r=>40+r*90;
  let svg=`<svg class="cp-svg" viewBox="0 0 370 230">`;
  for(const [a,b] of EDGES) svg+=`<line x1="${X(ST[a].c)}" y1="${Y(ST[a].r)}" x2="${X(ST[b].c)}" y2="${Y(ST[b].r)}" class="cp-l"/>`;
  ST.forEach((st,i)=>{ const here=ALL.filter(j=>v.pos[j]===i), piece=v.pieces&&v.pieces.includes(i), pth=path.includes(i)||moveTo===i;
    const myNote=(v.notes[me]||[]).filter(n=>n.at===i).slice(-1)[0];
    svg+=`<g class="cp-s ${clickable.has(i)?'can':''} ${pth?'sel':''}" data-st="${i}"><circle cx="${X(st.c)}" cy="${Y(st.r)}" r="16"/>${piece?`<text x="${X(st.c)}" y="${Y(st.r)+5}" class="pc">💎</text>`:''}
      <text x="${X(st.c)}" y="${Y(st.r)+31}" class="nm">${NAMES[i]}</text>${myNote?`<text x="${X(st.c)+15}" y="${Y(st.r)-12}" class="nt">${myNote.age==null?'✖':myNote.age+(v.round-myNote.r)}</text>`:''}
      ${here.map((j,k)=>`<text x="${X(st.c)-14+k*11}" y="${Y(st.r)-18}" class="tk">${j===v.thief?'🦹':seatEmoji(j)}</text>`).join('')}</g>`; });
  svg+=`</svg>`; h+=svg;
  if(v.phase==='roles'&&!v.ready[ctx.me]){
    h+=`<div class="vr-card"><b>당신의 역할: ${ROLE[myRole]}</b><p>${({thief:`최대 2역씩 몰래 움직이며 💎 피스 ${NEED}개를 모으세요. 피스 위치는 당신만 알아요. 부패 경찰 ${fill(nm(v.corrupt),ctx)}이(가) 몰래 도와줘요.`, corrupt:'겉으로는 경찰이지만 도둑 편! 도둑 위치(🦹)가 보여요. 거짓 정보를 흘리고, 도둑 칸에서 일부러 체포를 "실패"해 동료를 속이세요. 끝나고 지목당하면 패배.', cop:'차례마다 2역 안으로 움직여서 🔍 조사(도둑이 몇 라운드 전에 지나갔나) 또는 🚨 체포. 동료 중 한 명은 부패 경찰 — 거짓 정보에 주의!'})[myRole]}</p>
      <p class="vr-cast">오늘의 플레이어: ${ALL.filter(i=>!isH(i)).map(i=>`${seatEmoji(i)} ${seatName(i,ctx)} ${NPCI(i)[2]}`).join(' · ')}</p><button data-a="ready">확인했어요</button></div>`;
  }
  if(iAmThiefTurn) h+=`<div class="vr-card"><b>🦹 몰래 이동 (최대 2역)</b><p>${path.length?`경로: ${path.map(x=>NAMES[x]).join(' → ')}`:'옆 역을 눌러 경로를 만드세요 (그대로 있어도 돼요)'}</p><div class="fh-act"><button data-a="go">${path.length?'이대로 이동':'제자리'}</button>${path.length?'<button class="ghost" data-a="undo">한 칸 취소</button>':''}</div></div>`;
  if(iAmCopTurn) h+=`<div class="vr-card"><b>👮 내 차례</b><p>${moveTo!=null&&moveTo!==v.pos[me]?`${NAMES[moveTo]}로 이동해서`:`${NAMES[v.pos[me]]}에서`} — 2역 안의 역을 누르면 그리로 가서 행동해요</p><div class="fh-act"><button data-a="inv">🔍 조사</button><button data-a="arrest">🚨 체포</button></div></div>`;
  if(v.phase==='acted'&&v.actor===me&&v.needShare){ const n=(v.notes[me]||[]).slice(-1)[0];
    if(n&&n.r===v.round) h+=`<div class="vr-card"><b>🔍 결과: ${NAMES[n.at]} — ${n.age==null?'흔적 없음':n.age===0?'이번 라운드 흔적!':`${n.age}라운드 전 흔적`}</b><p>모두에게 알릴까요? (거짓말도 가능)</p>
      <div class="fh-act"><button data-sh="real">사실대로 알리기</button><button class="ghost" data-sh="none">"흔적 없음"이라고</button><button class="ghost" data-sh="0">"이번 라운드 흔적"이라고</button><button class="ghost" data-a="skip">말 안 하기</button></div></div>`; }
  if(v.phase==='vote'&&!v.voteDone[me]&&me!==v.thief) h+=`<div class="vr-card"><b>🗳️ 부패 경찰은 누구?</b><div class="fh-act">${ALL.filter(j=>j!==me&&j!==v.thief).map(j=>`<button class="ghost" data-v="${j}">${seatEmoji(j)} ${seatName(j,ctx)}</button>`).join('')}</div></div>`;
  if(v.phase==='over') h+=`<div class="vr-know">🎭 정체: ${ALL.map(i=>`${seatEmoji(i)} ${seatName(i,ctx)} ${ROLE[v.roles[i]]}`).join(' · ')} · 투표 ${Object.entries(v.cnt||{}).map(([k,c])=>`${fill(nm(+k),ctx)} ${c}표`).join(', ')}</div>`;
  // 왼쪽: 공유된 정보·실패·내 조사 / 오른쪽: 기록
  const L=`<div class="side-box"><div class="side-h">🧠 수사 정보판 <small>누가 무엇을 말했나 (거짓일 수도)</small></div>
    ${(v.notes[me]||[]).length?`<div class="rr-h"><b>🗒️ 내 조사</b><br>${v.notes[me].map(n=>`<span>${n.r}R ${NAMES[n.at]} ${n.age==null?'✖ 없음':`${n.age}R 전`}</span>`).join('')}</div>`:''}
    ${ALL.filter(i=>v.shared.some(x=>x.by===i)||v.fails.some(x=>x.by===i)).map(i=>`<div class="rr-h"><b>${seatEmoji(i)} ${seatName(i,ctx)}</b> ${isH(i)?'':`<small>${NPCI(i)[2]}</small>`}<br>${v.shared.filter(x=>x.by===i).map(x=>`<span class="${v.phase==='over'?(x.truth?'ok':'no'):''}">${x.r}R ${NAMES[x.at]} ${x.age==null?'없음':x.age+'R 전'}${v.phase==='over'?(x.truth?' ✔':' 🤥'):''}</span>`).join('')}${v.fails.filter(x=>x.by===i).map(x=>`<span>${x.r}R 🚨${NAMES[x.at]} 실패</span>`).join('')}</div>`).join('')||'<small style="color:#888">공유된 조사 결과와 체포 실패가 여기 쌓여요. 내 조사와 다른 말을 하는 사람이 부패 경찰일지도!</small>'}</div>`;
  const R=`<div class="side-box side-log"><div class="side-h">📜 진행 기록 <small>최근이 위</small></div>${v.log.slice(-60).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=`<div class="side3"><div class="side-mid">${h}</div><aside class="side-l">${L}</aside><aside class="side-r">${R}</aside></div>`;
  el.onclick=e=>{
    const st=e.target.closest('[data-st]'); if(st){ const i=+st.dataset.st;
      if(iAmThiefTurn&&clickable.has(i)){ path.push(i); return ctx.rerender(); }
      if(iAmCopTurn&&clickable.has(i)){ moveTo=i; return ctx.rerender(); } return; }
    const sh=e.target.closest('[data-sh]'); if(sh){ const n=(v.notes[me]||[]).slice(-1)[0]; const k=sh.dataset.sh; return ctx.act({k:'share',at:n.at,age: k==='real'?n.age : k==='none'?null : 0}); }
    const vt=e.target.closest('[data-v]'); if(vt) return ctx.act({k:'vote',t:+vt.dataset.v});
    const a=e.target.closest('[data-a]'); if(!a) return; const k=a.dataset.a;
    if(k==='ready') return ctx.act({k:'ready'});
    if(k==='undo'){ path.pop(); return ctx.rerender(); }
    if(k==='go'){ const p2=path; path=[]; return ctx.act({k:'move',path:p2}); }
    if(k==='inv'||k==='arrest'){ const to=moveTo; moveTo=null; return ctx.act({k:'cop',to,act:k}); }
    if(k==='skip') return ctx.act({k:'share',skip:true});
  };
}
function status(v,ctx){ syncH(v);
  const me=HSEAT[ctx.me];
  if(v.phase==='over') return '';
  if(v.phase==='roles') return v.ready[ctx.me]?'다른 사람을 기다리는 중…':'역할을 확인하세요';
  if(v.phase==='thief') return v.thief===me?'몰래 움직이세요 (최대 2역)':'도둑이 움직이는 중…';
  if(v.phase==='cop') return v.actor===me?'이동하고 조사·체포를 고르세요':'경찰이 움직이는 중…';
  if(v.phase==='acted'&&v.actor===me) return '조사 결과를 알릴지 정하세요';
  if(v.phase==='vote') return v.voteDone[me]||me===v.thief?'투표 집계 중…':'부패 경찰을 지목하세요';
  return '진행 중…';
}
const guide=`
<p><b>6인 추격 + 마피아</b>(우리 둘 + 성격 다른 컴퓨터 플레이어 4명). 역할은 무작위: 🦹 <b>도둑</b> 1(모두가 앎) · 🕵️ <b>부패 경찰</b> 1(비밀, 도둑 편) · 👮 <b>경찰</b> 4.</p>
<ul><li>지하철 18역. 💎 피스 ${PIECES}개가 숨겨져 있고 위치는 도둑만 알아요.</li>
<li><b>${ROUNDS}라운드</b>: 🦹 도둑이 몰래 최대 2역 이동(지나간 역의 피스도 가져감) → 👮 경찰이 한 명씩 2역 안으로 움직여서 <b>🔍 조사</b>(도둑이 그 역을 몇 라운드 전에 지나갔는지 — 나만 봄, 알릴지·거짓말할지 선택) 또는 <b>🚨 체포</b>.</li>
<li>🕵️ 부패 경찰은 도둑 위치가 보이고, 체포는 늘 "실패"해요 — 도둑 칸에서 일부러 실패해 동료를 속일 수 있어요.</li>
<li>도둑이 피스를 가져가면 <b>어느 역에서 사라졌는지</b> 발표돼요. 도둑이 💎 ${NEED}개 → 도둑·부패 경찰 승. 도둑 체포 또는 ${ROUNDS}라운드 버팀 → 경찰 승.</li>
<li>끝나고 경찰들이 <b>부패 경찰을 투표로 지목</b> — 맞히면 부패 경찰은 패배(경찰이 졌어도 경찰 승).</li></ul>
<div class="tipbox">💡 <b>팁</b><br>· 누군가 체포에 실패한 역에서, 나중에 <b>그 라운드 흔적</b>이 나오면? 그 사람이 일부러 놓친 거예요!<br>· 🧠 수사 정보판에서 내 조사와 다른 말을 한 사람을 찾으세요. 그 사람이 체포에 "실패"한 역이 수상해요.<br>· 컴퓨터 경찰들도 서로 보고를 비교하며 의심해요.</div>`;
window.GAMES.cops = { _sync:x=>syncH(x), maxH:6,
  title:'부패 경찰', ref:'데블스 플랜 「부패 경찰」', emoji:'🚨', tags:['추격','마피아','NPC','두뇌서바이벌'],
  tagline:'우리 둘 + 컴퓨터 4명. 지하철을 누비는 도둑을 쫓아라 — 단, 경찰 중 한 명은 도둑 편이다.',
  guide, init, apply, mask, ai, render, status, step, stepDelay, noPersona:true, wide:true,
  aiDelay:()=>1400+Math.random()*1400,
  reset(){ path=[]; moveTo=null; sig=''; },
  bar:(v,i)=>{ const seat=HSEAT[i]; return `<span class="tag">${v.roles[seat]?ROLE[v.roles[seat]]:'👮 ?'}</span>`; },
  result:(v)=> v.side==='thief'?'🦹 도둑 편 승리':'👮 경찰 승리',
};
})();
