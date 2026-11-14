(function(){
'use strict';
/* 누가 첩자일까 (6인 테이블): 우리 둘 + NPC 4명. 충신 3·예언자 1·첩자 2.
   진짜 보드게임처럼 장면마다 박자를 두고 진행 (step): 역할 확인 → 리더 고민 → 수다 → 투표 → 한 명씩 공개
   → 임무 카드 → 한 장씩 뒤집기 → 결과 → 다음 리더. 방장(또는 혼자) 쪽에서만 진행. */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로, 나머지는 NPC */
const N=6, SIZES=[2,3,3,3,3], MAXREJ=5; let HSEAT=[0,3]; const SEATORD=[0,3,1,4,2,5];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
// NPC 성향 (컴퓨터끼리 500판으로 첩자 편 승률 약 50%에 맞춘 값)
const C_=window.SPYCFG={seerMix:.3, spyDirty:.9, spyClean:.5, seerDirty:.35, seerClean:.8, onT:1.0, offT:.5, fail0:.45, fail:.65, guessNoise:4};
// 장면 박자 (ms)
const T={think:3000, chat:1900, vrev:700, vdone:1800, crev:1200, cdone:2000, pause:3000, npcMission:2400, guess:4000};
// NPC는 npc.js 인물 중 4명 (판마다 무작위). 말투 묶음(style)은 인물 성향에서
const STYLE={seojin:'logic', doyun:'emo', haram:'calm', yuna:'emo', minho:'sly', taekyung:'emo', jihu:'sly', soyul:'logic'};
let WHO={};   // 화면용: 마지막으로 그린 판의 자리→인물
const DEF_P={talk:.6,aggr:.5,trust:.5,bluff:.5,logic:.6,temper:.4};
const pz=(st,i)=> (st&&st.who&&st.who[i]&&NPCS.byId(st.who[i])) || DEF_P;   // 사람 자리(혼자 모드 컴퓨터)는 보통 성향
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name]:['🙂','?']; };
const ROLE={loyal:'🛡️ 충신', seer:'🔮 예언자', spy:'🗡️ 첩자'};
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i);
const ALL=[0,1,2,3,4,5];
const npcs=()=>ALL.filter(i=>!isH(i));

/* ───────── 추리·두뇌 ───────── */
const spiesIn=(team,know)=>know.spies ? team.filter(i=>know.spies.includes(i)).length : 0;
function knowOf(s,seat){ const role=s.roles[seat]; return {role, spies: role==='spy'||role==='seer' ? ALL.filter(i=>s.roles[i]==='spy') : null}; }
// 임무 결과(실패 장수 ≤ 팀 안 첩자 수)와 맞는 첩자 2인 조합으로 각자 첩자일 확률
function spyProb(st,self){
  const cnt=Array(N).fill(0); let tot=0;
  for(let a=0;a<N;a++) for(let b=a+1;b<N;b++){
    if(a===self||b===self) continue;
    if(!st.hist.every(h=>(h.team.includes(a)?1:0)+(h.team.includes(b)?1:0)>=h.fails)) continue;
    let w=1; for(const h of st.hist) if(!h.fails){ const k=(h.team.includes(a)?1:0)+(h.team.includes(b)?1:0); w*= k===2?.35 : k===1?.7 : 1; }
    cnt[a]+=w; cnt[b]+=w; tot+=w;
  }
  return cnt.map(c=>tot?c/tot:0);
}
function bPropose(st,seat,know){
  const k=st.sizes[st.m], pr=spyProb(st,seat), sc={};
  for(const i of ALL){
    let v=pr[i]*3+Math.random()*(.15+(1-pz(st,seat).logic)*.9);   // 논리 낮을수록 대충 고름
    if(know.role==='spy' && know.spies.includes(i) && i!==seat) v+=5;
    if(know.role==='seer' && know.spies.includes(i)) v+= Math.random()<C_.seerMix+pz(st,seat).bluff*.15 ? 0 : 5;   // 능청스러운 예언자일수록 일부러 티 안 냄
    sc[i]=v;
  }
  return [seat,...ALL.filter(i=>i!==seat).sort((a,b)=>sc[a]-sc[b]).slice(0,k-1)].sort((a,b)=>a-b);
}
function bVote(st,seat,team,know){
  const r=Math.random();
  if(st.rejects>=MAXREJ-1) return know.role!=='spy';
  if(know.role==='spy') return spiesIn(team,know)>0 ? r<C_.spyDirty : r<C_.spyClean;
  if(know.role==='seer') return spiesIn(team,know)>0 ? r<C_.seerDirty : r<C_.seerClean;
  const pr=spyProb(st,seat), mates=team.filter(i=>i!==seat);
  const exp=mates.reduce((a,i)=>a+pr[i],0);
  const avg=ALL.filter(i=>i!==seat).reduce((a,i)=>a+pr[i],0)/(N-1);
  const ratio=exp/Math.max(.01,avg*mates.length);
  const lenient = st.rejects>=3 ? .25 : st.rejects*.08, p=pz(st,seat);
  const mood = (p.trust-.5)*.3 - (p.aggr-.5)*.2;   // 잘 믿는 사람은 너그럽게, 공격적인 사람은 깐깐하게
  return ratio < (team.includes(seat)?C_.onT:C_.offT) + lenient + mood + (r-.5)*(.2+(1-p.logic)*.2);
}
function bCard(st,seat,team,know){
  if(know.role!=='spy') return 'S';
  if(st.fail>=2 || st.succ>=2) return 'F';
  const npcPartner=team.find(i=>i!==seat && know.spies.includes(i) && !isH(i));
  if(npcPartner!==undefined && npcPartner<seat) return 'S';
  const hold=1.2-pz(st,seat).bluff*.4;   // 뻥에 능한 첩자는 초반에 참고 신뢰부터 쌓음
  return Math.random()<(st.m===0?C_.fail0*hold:C_.fail*(st.m<=1?hold:1)) ? 'F' : 'S';
}
function bGuess(st,know,seat){
  const cand=ALL.filter(i=>!know.spies.includes(i)), sc={};
  const sharp = seat!=null ? 1.5-pz(st,seat).logic : 1;
  for(const i of cand) sc[i]=Math.random()*C_.guessNoise*sharp;
  for(const pr of st.proposals){
    const dirty=spiesIn(pr.team,know)>0;
    for(const i of cand){ const y=pr.votes[i]; if(y&&!dirty) sc[i]+=.3; if(!y&&dirty) sc[i]+=.5; if(y&&dirty) sc[i]-=.5; }
    if(cand.includes(pr.leader) && !dirty) sc[pr.leader]+=.3;
  }
  return cand.sort((a,b)=>sc[b]-sc[a])[0];
}

/* ───────── NPC 수다 (한 줄씩 시간차로 나옴) ───────── */
// 말 한 줄 + 그 말로 드러난 의견(op: stance 찬반 / sus 의심 대상 / trust 결백 주장)
const line=(seat,text,op)=> text ? ({seat, line:`{s${seat}}: ${text}`, op}) : null;
const sys=(s,text)=>s.log.push('· '+text);
/* NPC 성격: 말 많은 정도(talk)와 말투(style)
   🦊 여우 = 능청·의심 많음 / 🐻 곰 = 과묵·느긋 / 🦉 부엉이 = 기록 근거로 따짐 / 🦦 수달 = 감정 표현 많음 */
const per=(s,i)=>{ const p=pz(s,i); return {talk:p.talk, style:STYLE[p.id]||'calm', p}; };
const T_=t=>`{s${t}}`;
// 실제 기록에서 찾은 근거 한 마디
function evidence(s,t){
  const failed=s.hist.filter(h=>h.fails>0 && h.team.includes(t));
  if(failed.length) return `실패한 임무 ${failed.map(h=>'①②③④⑤'[h.m]).join('·')}에 있었어요`;
  const okBad=s.hist.filter(h=>h.fails>0 && h.votes[t] && !h.team.includes(t));
  if(okBad.length) return `실패한 팀에 찬성했었죠`;
  const rej=s.proposals.filter(p=>!p.votes[t] && p.team.every(i=>!s.hist.some(h=>h.fails>0&&h.team.includes(i)))).length;
  if(rej>=2) return `멀쩡해 보이는 팀에 ${rej}번이나 반대했어요`;
  const clean=s.hist.filter(h=>!h.fails && h.team.includes(t));
  if(clean.length) return `성공한 임무에 있긴 했지만, 첩자가 참았을 수도 있죠`;
  return `아직 한 번도 검증이 안 됐어요`;
}
const LINES={
  approve:{ sly:['좋아요~ 이 팀이면 괜찮겠네요.','후후, 저는 찬성할게요.','나쁘지 않네요~'], calm:['찬성.','좋아요.','괜찮네요.'],
            logic:['지금까지 기록으로 보면 무난한 조합이에요. 찬성.','근거상 문제없어 보여요.'], emo:['좋아요!! 가봅시다 💪','이 팀 느낌 좋아요 😊','오 괜찮은데요?!'] },
  onTeam:{ sly:['저를 넣어주시다니~ 안목이 있네요.'], calm:['맡겨주세요.'], logic:['제가 들어가면 적어도 한 명은 확실하죠.'], emo:['저 뽑아줘서 고마워요!! 꼭 성공할게요 🥹'] },
  reject:{ sly:[t=>`흠~ ${T_(t)}… 왠지 냄새가 나는데요?`,t=>`${T_(t)}이(가) 끼면 저는 반대예요~`], calm:[t=>`${T_(t)}은(는) 좀…`,t=>`반대. ${T_(t)}이(가) 걸려요.`],
           logic:[(t,s)=>`${T_(t)}은(는) ${evidence(s,t)}. 반대예요.`], emo:[t=>`${T_(t)} 들어가는 건 불안해요 😟`,t=>`으아 ${T_(t)}은(는) 아닌 것 같아요!`] },
  last:{ sly:['이번엔 통과시키죠~ 아니면 다 같이 망해요.'], calm:['이번엔 찬성해야 해요.'], logic:['연속 거부 4번이에요. 이번에 거부되면 첩자 승리예요.'], emo:['제발 이번엔 통과시켜요!! 😭'] },
  passed:{ sly:['자~ 결과를 볼까요?'], calm:['잘 다녀와요.'], logic:['통과. 결과로 많은 게 드러나겠네요.'], emo:['두근두근… 🙏'] },
  rejected:{ sly:['아쉽네~ 다음 리더 기대할게요.'], calm:['다음.'], logic:['거부된 것도 기록이에요. 누가 반대했는지 보세요.'], emo:['에이 아깝다 😢'] },
  success:{ sly:['오~ 성공. 근데 첩자가 일부러 참았을 수도?'], calm:['다행이네요.'], logic:['성공이지만, 첩자가 참았을 가능성도 있어요.'], emo:['성공이다!! 🎉🎉'] },
  fail:{ sly:[(t,s,f)=>`실패 ${f}장이라… ${T_(t)}, 할 말 있어요~?`], calm:[t=>`…${T_(t)}?`],
         logic:[(t,s,f)=>`실패 ${f}장. 이 팀 안에 첩자가 있어요. 제일 의심되는 건 ${T_(t)}, ${evidence(s,t)}.`], emo:[t=>`헐 실패라니 😱 ${T_(t)}!! 솔직히 말해요!`] },
  defend:{ sly:['저요? 에이~ 설마요.','저를 의심하면 첩자들만 좋아해요~'], calm:['저 아니에요.','…아니에요.'], logic:['저를 의심할 근거가 부족해요.','기록을 다시 보세요. 저는 아니에요.'], emo:['저 아니라니까요 😭 억울해요!!','진짜 저 성공 냈어요!!'] },
  counter:{ sly:[h=>`오히려 ${T_(h)}이(가) 수상한데요~?`], calm:[h=>`${T_(h)}이(가) 더 수상해요.`], logic:[(h,s)=>`그렇게 말하는 ${T_(h)}은(는) ${evidence(s,h)}.`], emo:[h=>`${T_(h)} 너무해요!! 그쪽이 더 이상해요 😤`] },
  believe:{ sly:['흐음~ 일단 믿어볼게요.'], calm:['믿어요.'], logic:['지금까진 기록상 믿을 만해요.'], emo:['저도 믿어요! 🙌'] },
  doubt:{ sly:['말로는 누구나 그러죠~'], calm:['글쎄요.'], logic:['말보다 기록이 중요해요.'], emo:['진짜요…? 🤨'] },
  agree:{ sly:[h=>`${T_(h)} 말이 맞아요~`], calm:[h=>`${T_(h)}랑 같은 생각.`], logic:[h=>`${T_(h)}의 의견에 동의해요.`], emo:[h=>`맞아요 ${T_(h)}!! 👍`] },
  disagree:{ sly:[h=>`에이~ ${T_(h)}, 그건 아니죠.`], calm:[h=>`난 생각이 달라요.`], logic:[h=>`${T_(h)}, 근거가 뭐예요?`], emo:[h=>`${T_(h)} 진심이에요?! 😮`] },
};
function talk(s,seat,kind,a,b){
  const P=per(s,seat), own=P.p.lines&&P.p.lines[kind];
  s.saidT=s.saidT||{}; const used=s.saidT[seat]=s.saidT[seat]||[];
  let out='';
  for(let k=0;k<6;k++){
    if(own && ['defend','counter','agree'].includes(kind) && Math.random()<.6) out=NPCS.say(P.p,kind,{t:a!=null?T_(a):''});
    else { const x=U.pick(LINES[kind][P.style]); out = typeof x==='function' ? x(a,s,b) : x; }
    if(!used.includes(out)){ used.push(out); return out; }
  }
  return '';   // 새로 할 말이 없으면 조용히 (같은 말 반복 금지)
}
const chatty=(s,sp)=>Math.random()<per(s,sp).talk;
function chatProposal(s){
  const pool=npcs().filter(i=>i!==s.leader).filter(i=>chatty(s,i)), sus=spyProb(s,-1), out=[];
  for(const sp of U.shuffle(pool).slice(0,2)){
    const yes=s.votes[sp], know=knowOf(s,sp);
    if(s.rejects>=MAXREJ-1){ out.push(line(sp, yes?talk(s,sp,'last'):talk(s,sp,'reject', s.team.find(i=>i!==sp)??s.leader), {stance:yes?'yes':'no'})); continue; }
    if(yes){ out.push(line(sp, s.team.includes(sp)&&Math.random()<.5 ? talk(s,sp,'onTeam') : talk(s,sp,'approve'), {stance:'yes'})); continue; }
    let target=s.team.filter(i=>i!==sp).sort((a,b)=>sus[b]-sus[a])[0];
    if(know.role==='spy'){ const f=s.team.filter(i=>i!==sp && !know.spies.includes(i)); if(f.length) target=U.pick(f); }
    out.push(target!=null ? line(sp, talk(s,sp,'reject',target), {stance:'no',sus:target}) : line(sp, '이 팀은 별로예요.', {stance:'no'}));
  }
  return out;
}
function chatVote(s,ok){
  const pool=npcs().filter(i=>chatty(s,i)); if(!pool.length) return [];
  const sp=U.pick(pool);
  return [line(sp, talk(s,sp, ok?'passed':'rejected'))];
}
function chatMission(s,fails){
  const sus=spyProb(s,-1), out=[];
  const pool=npcs().filter(i=>chatty(s,i)); const sp=pool.length?U.pick(pool):U.pick(npcs()), know=knowOf(s,sp);
  if(!fails){ out.push(line(sp, talk(s,sp,'success'))); return out; }
  let cand=s.team.filter(i=>i!==sp); if(know.role==='spy') cand=cand.filter(i=>!know.spies.includes(i));
  const t=cand.length ? cand.sort((a,b)=>sus[b]-sus[a])[0] : null;
  if(t!=null){
    out.push(line(sp, talk(s,sp,'fail',t,fails), {sus:t}));
    if(!isH(t) && Math.random()<.5+per(s,t).talk*.4){   // 지목당한 NPC가 받아침 (다혈질일수록 반격)
      const k=knowOf(s,t), tp=per(s,t).p;
      out.push(Math.random()<(k.role==='spy'?.3:0)+tp.temper*.45 ? line(t, talk(s,t,'counter',sp), {sus:sp}) : line(t, talk(s,t,'defend'), {trust:true}));
    }
  } else out.push(line(sp, `실패 ${fails}장이라니… 누구죠?`));
  return out;
}

/* ───────── 진행 ───────── */
function init(starter,o){ const k=Math.max(2,Math.min(6,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  let roles;
  do { roles=U.shuffle(['seer','loyal','loyal','loyal','spy','spy']); } while(HSEAT.length===2&&HSEAT.every(h=>roles[h]==='spy'));
  const s={roles, sizes:SIZES.slice(), m:0, leader:Math.random()*N|0, rejects:0, phase:'roles', ready:HSEAT.map(()=>false),
    op:ALL.map(()=>({stance:null,sus:null,trust:false})), susLog:[], typing:null, bubble:Array(N).fill(null), cast:Array(N).fill(false),
    team:null, votes:Array(N).fill(null), cards:Array(N).fill(null), vrev:0, flip:[], crev:0,
    hist:[], proposals:[], log:[], chatQ:[], notice:'역할 카드를 확인하세요', after:null,
    succ:0, fail:0, side:null, guess:null, turn:null, winner:null, starter};
  s.who={}; s.hs=HSEAT.slice(); const ids=NPCS.cast(N-HSEAT.length); npcs().forEach((i,k)=>s.who[i]=ids[k]);
  sys(s,'🎙️ 6명이 테이블에 앉았습니다. 이 중 2명이 첩자예요.');
  return s;
}
function startProposal(s){
  s.team=null; s.votes=Array(N).fill(null); s.cards=Array(N).fill(null); s.vrev=0; s.flip=[]; s.crev=0;
  s.phase='propose';
  if(isH(s.leader)){ s.turn=pOf(s.leader); s.notice=`🎙️ 임무 ${s.m+1} · 이번 리더는 {s${s.leader}} 👑`; }
  else { s.turn=null; s.notice=`{s${s.leader}}이(가) 팀을 고르는 중… 🤔`; }
}
function startVote(s,team){
  s.team=team; s.phase='vote'; s.turn=null;
  for(const o of s.op) o.stance=null;          // 새 팀이 나왔으니 찬반 입장은 초기화 (의심은 유지)
  sys(s,`{s${s.leader}} 👑 팀 제안 (임무 ${s.m+1}, ${team.length}명): ${team.map(i=>`{s${i}}`).join(', ')}`);
  for(const i of npcs()) s.votes[i]=bVote(s,i,team,knowOf(s,i));
  s.cast=ALL.map(i=>false);   // NPC는 각자 다른 타이밍에 투표함 (step에서 하나씩)
  s.chatQ.push(...chatProposal(s));
  s.notice='이 팀을 임무에 보낼까요? 투표하세요';
}
function resolveVote(s){
  const yes=s.votes.filter(Boolean).length, ok=yes>N/2;
  s.proposals.push({m:s.m, leader:s.leader, team:s.team.slice(), votes:s.votes.slice(), ok});
  sys(s,`투표: 찬성 ${yes} · 반대 ${N-yes} → ${ok?'통과 ✅':'거부 ❌'}`);
  s.chatQ.push(...chatVote(s,ok));
  if(ok){ s.rejects=0; s.notice=`찬성 ${yes} · 반대 ${N-yes} → 통과! 임무 출발`; startMission(s); return; }
  s.rejects++;
  if(s.rejects>=MAXREJ){ s.notice='5번 연속 거부… 혼란 속에 첩자들이 이겼어요'; sys(s,'5번 연속 거부! 첩자 편 승리.'); end(s,'spy'); return; }
  s.notice=`찬성 ${yes} · 반대 ${N-yes} → 거부! 리더가 넘어갑니다 (연속 거부 ${s.rejects}/${MAXREJ})`;
  s.phase='pause'; s.after='nextLeader';
}
function startMission(s){
  s.phase='mission'; s.turn=null; s.cards=Array(N).fill(null);
  for(const i of s.team) if(!isH(i)) s.cards[i]=bCard(s,i,s.team,knowOf(s,i));
}
function startFlip(s){
  s.phase='crev'; s.crev=0;
  s.flip=U.shuffle(s.team.map(i=>s.cards[i]));
  s.notice='임무 카드를 한 장씩 뒤집습니다…';
}
function resolveMission(s){
  const fails=s.team.filter(i=>s.cards[i]==='F').length;
  for(const o of s.op){ o.trust=false; o.stance=null; }
  s.hist.push({m:s.m, leader:s.leader, team:s.team.slice(), votes:s.votes.slice(), fails, cards:s.team.map(i=>s.cards[i])});
  if(fails) s.fail++; else s.succ++;
  sys(s,`임무 ${s.m+1} ${fails?`실패 ✖ (실패 카드 ${fails}장)`:'성공 ✔'}`);
  s.notice = fails ? `🎙️ 임무 ${s.m+1} 결과… 실패! 실패 카드 ${fails}장 😱` : `🎙️ 임무 ${s.m+1} 결과… 성공! ✨`;
  s.chatQ.push(...chatMission(s,fails));
  s.m++; s.phase='pause'; s.after='afterMission';
}
function afterMission(s){
  if(s.fail>=3){ s.notice='실패 3번… 첩자 편 승리!'; end(s,'spy'); return; }
  if(s.succ>=3){
    s.phase='guess'; s.team=null;
    sys(s,'성공 3번! 하지만 첩자들이 예언자를 맞히면 뒤집혀요…');
    const g=HSEAT.find(i=>s.roles[i]==='spy');
    if(g!==undefined){ s.turn=pOf(g); s.notice='성공 3번! 마지막으로 첩자가 예언자를 지목합니다…'; }
    else { s.turn=null; s.notice='성공 3번! 첩자들이 예언자가 누군지 수군거리는 중… 🤫'; }
    return;
  }
  s.leader=(s.leader+1)%N; startProposal(s);
}
function doGuess(s,by,target){
  const ok=s.roles[target]==='seer';
  s.guess={by,target,ok};
  sys(s,`{s${by}}이(가) 예언자로 {s${target}}을(를) 지목! → ${ok?'정답… 첩자 역전승!':'틀렸어요. 충신 편 승리!'}`);
  s.notice = ok ? `{s${by}}이(가) 예언자 {s${target}}을(를) 찾아냈어요! 첩자 역전승 😈` : `{s${by}}의 지목은 빗나갔어요. 충신 편 승리! 🎉`;
  end(s, ok?'spy':'loyal');
}
function end(s,side){
  s.log.push(...s.chatQ.filter(Boolean).map(c=>typeof c==='string'?c:c.line)); s.chatQ=[]; s.typing=null;
  s.side=side; s.phase='over'; s.turn=null; s.team=null;
  const win=HSEAT.map(i=> (s.roles[i]==='spy') === (side==='spy'));
  s.winner = win[0]&&win[1] ? 'both' : !win[0]&&!win[1] ? 'none' : win[0] ? 0 : 1; s.winners=HSEAT.map((h,p)=>win[p]?p:-1).filter(x=>x>=0);
  epilogue(s);
}
const EPI={
  spy:{ sly:['후후~ 사실 제가 첩자였어요 😈','눈치챘어요? 아니면 끝까지 몰랐어요?'], calm:['…첩자였어요.','미안. 첩자였어.'], logic:['계산대로였어요. 저 첩자였습니다.','기록을 보면 힌트가 있었을 텐데요.'], emo:['저 첩자였어요!! 😈 연기 어땠어요?','들킬까 봐 심장 터지는 줄 알았어요 😆'] },
  seer:{ sly:['저는 처음부터 다 알고 있었죠~ 🔮'], calm:['예언자였어. 다 보였어.'], logic:['예언자였어요. 티 안 내느라 일부러 틀린 척도 했죠.'], emo:['저 예언자였어요!! 말하고 싶어서 혼났어요 🔮'] },
  loyal:{ sly:['역시~ 내 촉이 맞았네','속았다… 다음엔 안 속아요'], calm:['그랬구나.','…속았네.'], logic:['기록을 다시 보니 이해가 되네요.','다음엔 투표 기록을 더 봐야겠어요.'], emo:['헐 대박!! 진짜 몰랐어요 😱','어쩐지 수상하더라!!'] },
};
function epilogue(s){
  const spies=ALL.filter(i=>s.roles[i]==='spy');
  sys(s, `정체 공개! 첩자는 ${spies.map(i=>`{s${i}}`).join(', ')} · 예언자는 {s${s.roles.indexOf('seer')}}`);
  for(const i of U.shuffle(npcs()).slice(0,3)){ const r=s.roles[i]; s.log.push(`{s${i}}: ${U.pick(EPI[r][per(s,i).style])}`); }
}
// 판 정리 통계 (끝난 뒤에만)
function debrief(s){
  const st=ALL.map(i=>({fails:0, dirtyYes:0, votes:0, susRight:0, susAll:0, sussed:0}));
  for(const h of s.hist){ (h.cards||[]).forEach((c,k)=>{ if(c==='F') st[h.team[k]].fails++; }); }
  for(const p of s.proposals){ const dirty=p.team.some(i=>s.roles[i]==='spy'); ALL.forEach(i=>{ st[i].votes++; if(dirty&&p.votes[i]) st[i].dirtyYes++; }); }
  for(const x of (s.susLog||[])){ st[x.by].susAll++; if(s.roles[x.t]==='spy') st[x.by].susRight++; st[x.t].sussed++; }
  const loyal=ALL.filter(i=>s.roles[i]!=='spy'), spies=ALL.filter(i=>s.roles[i]==='spy');
  const detective = loyal.filter(i=>st[i].susRight>0).sort((a,b)=>st[b].susRight-st[a].susRight)[0];
  const actor = spies.slice().sort((a,b)=>st[a].sussed-st[b].sussed)[0];
  return {st, detective, actor};
}

function sayNow(s,c){
  if(typeof c==='string'){ s.log.push(c); return; }
  s.log.push(c.line);
  if(c.op && s.op) Object.assign(s.op[c.seat], c.op);
  if(c.op && c.op.sus!=null){ (s.susLog=s.susLog||[]).push({by:c.seat, t:c.op.sus, m:s.m}); }   // 의심은 덮어쓰지 않고 기록으로 쌓기
  if(s.bubble) s.bubble[c.seat]={text:c.line.replace(/^\{s\d\}: /,''), at:s.log.length};   // 자리 위 말풍선
}
// 사람·NPC 모두 투표를 마치면 공개 단계로
function allVoted(s){
  if(s.phase!=='vote') return;
  const done=ALL.every(i=> isH(i) ? s.votes[i]!=null : (!s.cast || s.cast[i]));
  if(done){ s.phase='vrev'; s.vrev=0; s.notice='모두 투표했어요. 공개합니다!'; }
}
// 입력 중… 표시 시간: 글이 길수록 오래
const typeTime=c=> typeof c==='string' ? 300 : Math.max(900, Math.min(2800, c.line.length*55));
/* 시간차 장면 진행 (방장·혼자 쪽에서만 호출됨) */
function stepDelay(s){ syncH(s);
  if(s.winner!=null) return null;
  while(s.chatQ.length && !s.chatQ[0]) s.chatQ.shift();
  if(s.typing!=null && s.chatQ.length) return typeTime(s.chatQ[0]);   // 입력 중 → 말 나옴
  if(s.chatQ.length) return 500 + Math.random()*700;                  // 잠깐 뜸 들이다 입력 시작
  if(s.phase==='vote' && s.cast && npcs().some(i=>!s.cast[i])) return 700 + Math.random()*2200;   // NPC 하나씩 투표
  if(s.phase==='propose' && !isH(s.leader)) return T.think;
  if(s.phase==='vrev') return s.vrev<N ? T.vrev : T.vdone;
  if(s.phase==='mission' && s.team.every(i=>s.cards[i])) return T.npcMission;
  if(s.phase==='crev') return s.crev<s.flip.length ? T.crev : T.cdone;
  if(s.phase==='pause') return T.pause;
  if(s.phase==='guess' && s.turn==null) return T.guess;
  return null;
}
function step(s){ syncH(s);
  while(s.chatQ.length && !s.chatQ[0]) s.chatQ.shift();
  if(s.typing!=null && s.chatQ.length){ s.typing=null; sayNow(s, s.chatQ.shift()); return; }
  if(s.chatQ.length){ const c=s.chatQ[0]; if(typeof c==='string'){ sayNow(s, s.chatQ.shift()); } else if(c.seat==null){ s.chatQ.shift(); } else s.typing=c.seat; return; }
  if(s.phase==='vote' && s.cast && npcs().some(i=>!s.cast[i])){ s.cast[U.pick(npcs().filter(i=>!s.cast[i]))]=true; allVoted(s); return; }
  if(s.phase==='propose' && !isH(s.leader)){ startVote(s, bPropose(s,s.leader,knowOf(s,s.leader))); return; }
  if(s.phase==='vrev'){ if(s.vrev<N){ s.vrev++; s.notice=`투표 공개 중… (${s.vrev}/${N})`; } else resolveVote(s); return; }
  if(s.phase==='mission' && s.team.every(i=>s.cards[i])){ startFlip(s); return; }
  if(s.phase==='crev'){ if(s.crev<s.flip.length){ s.crev++; } else resolveMission(s); return; }
  if(s.phase==='pause'){ const a=s.after; s.after=null; if(a==='nextLeader'){ s.leader=(s.leader+1)%N; startProposal(s); } else afterMission(s); return; }
  if(s.phase==='guess' && s.turn==null){ const spy=ALL.find(i=>s.roles[i]==='spy'); doGuess(s, spy, bGuess(s,knowOf(s,spy),spy)); }
}

function apply(s,p,a){ syncH(s);
  if(s.winner!=null) return '게임이 끝났어요';
  if(!a) return '알 수 없는 동작';
  const seat=HSEAT[p];
  if(a.k==='ready'){
    if(s.phase!=='roles') return null;
    s.ready[p]=true;
    if(s.ready.every(Boolean)){ sys(s,'🎙️ 모두 역할을 확인했습니다. 지금부터 메인 매치를 시작합니다!'); startProposal(s); }
    return null;
  }
  if(a.k==='propose'){
    if(s.phase!=='propose'||s.leader!==seat) return '지금은 내가 팀을 짤 차례가 아니에요';
    const team=(Array.isArray(a.team)?a.team:[]).map(Number);
    if(new Set(team).size!==team.length||team.some(i=>!(i>=0&&i<N))) return '멤버를 다시 고르세요';
    if(team.length!==s.sizes[s.m]) return `이번 임무는 ${s.sizes[s.m]}명이에요`;
    startVote(s, team.sort((x,y)=>x-y)); return null;
  }
  if(a.k==='vote'){
    if(s.phase!=='vote') return '지금은 투표 시간이 아니에요';
    if(s.votes[seat]!=null) return '이미 투표했어요';
    s.votes[seat]=!!a.yes;
    allVoted(s);
    return null;
  }
  if(a.k==='card'){
    if(s.phase!=='mission'||!s.team.includes(seat)) return '이번 임무 팀이 아니에요';
    if(s.cards[seat]) return '이미 냈어요';
    if(a.v!=='S'&&a.v!=='F') return '카드를 고르세요';
    if(a.v==='F'&&s.roles[seat]!=='spy') return '첩자만 실패 카드를 낼 수 있어요';
    s.cards[seat]=a.v;
    return null;   // 다 내면 step이 잠깐 뒤 뒤집기 시작
  }
  if(a.k==='say'){
    if(s.phase==='roles') return '아직 시작 전이에요';
    const t=a.t|0;
    if(a.k2==='yes'||a.k2==='no'){
      if(!s.team || !['vote','vrev'].includes(s.phase)) return '팀이 제안됐을 때 말할 수 있어요';
      sayNow(s, line(seat, a.k2==='yes'?'이 팀 좋아요 👍':'이 팀은 별로예요 👎', {stance:a.k2}));
      // 누군가는 맞장구, 누군가는 반박 (자기 표에 따라)
      const r=U.pick(npcs()); if(Math.random()<.6 && s.votes[r]!=null){
        const same=(s.votes[r]===true)===(a.k2==='yes');
        s.chatQ.push(line(r, talk(s,r, same?'agree':'disagree', seat), {stance:s.votes[r]?'yes':'no'}));
      }
    } else if(a.k2==='sus'){
      if(!(t>=0&&t<N)||t===seat) return '의심할 사람을 고르세요';
      sayNow(s, line(seat, `{s${t}}이(가) 수상해요 🤨`, {sus:t}));
      if(!isH(t)){   // 지목당한 NPC가 반응 (성격대로)
        const k=knowOf(s,t);
        const tp=per(s,t).p; s.chatQ.push(Math.random()<(k.role==='spy'?.25:0)+tp.temper*.5 ? line(t, talk(s,t,'counter',seat), {sus:seat}) : line(t, talk(s,t,'defend'), {trust:true}));
      }
      // 다른 NPC가 거들거나 말림
      const o=U.pick(npcs().filter(i=>i!==t));
      if(Math.random()<.45){ const pr=spyProb(s,o)[t]; s.chatQ.push(line(o, pr>.45 ? talk(s,o,'agree',seat) : talk(s,o,'disagree',seat), pr>.45?{sus:t}:null)); }
    } else if(a.k2==='trust'){
      sayNow(s, line(seat, '저 믿어주세요 🙋', {trust:true}));
      const o=U.pick(npcs());
      if(Math.random()<.65){ const pr=knowOf(s,o).role==='spy' ? Math.random() : spyProb(s,o)[seat]; s.chatQ.push(line(o, talk(s,o, pr>.4?'doubt':'believe'))); }
    } else return '알 수 없는 말';
    return null;
  }
  if(a.k==='guess'){
    if(s.phase!=='guess'||s.roles[seat]!=='spy') return '첩자만 예언자를 지목할 수 있어요';
    const t=a.seat|0; if(!(t>=0&&t<N)||s.roles[t]==='spy') return '첩자가 아닌 사람을 고르세요';
    doGuess(s,seat,t); return null;
  }
  return '알 수 없는 동작';
}
function mask(s,p){ syncH(s);
  const v=U.clone(s), seat=HSEAT[p], k=knowOf(s,seat);
  v.chatQ=[];
  if(s.phase==='over') return v;
  v.hist=v.hist.map(h=>{ const x={...h}; delete x.cards; return x; });   // 누가 실패를 냈는지는 끝날 때까지 비밀
  v.roles=ALL.map(i=> i===seat ? s.roles[i] : (k.spies&&k.spies.includes(i)) ? 'spy' : null);
  v.votes=s.votes.map((x,i)=> i===seat ? x : s.phase==='vrev'&&i<s.vrev ? x : (isH(i) ? x!=null : (s.cast&&s.cast[i])) ? 'done' : null);
  v.cards=s.cards.map((x,i)=> i===seat ? x : (s.team&&s.team.includes(i)&&isH(i)&&x) ? 'done' : null);
  v.flip=s.flip.map((x,i)=> i<s.crev ? x : null);
  v.logLen=s.log.length; v.log=s.log.slice(-60);
  return v;
}

/* ───────── 화면 ───────── */
let sel=[], sig='', logN='', suspecting=false, suslogOpen=true, histOpen=true;
function seatName(i,ctx,plain){ if(isH(i)){ const p=pOf(i); return p===ctx.me ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return plain ? NPCI(i)[1] : NPCI(i).join(' '); }
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
const archOf=i=> isH(i) ? '' : (NPCS.byId(WHO[i])||{}).arch||'';
const fill=(t,ctx)=>t.replace(/\{s(\d)\}/g,(_,d)=>`<b>${seatName(+d,ctx)}</b>`);

// 자리 위 말풍선: 입력 중이면 "입력 중…", 방금 한 말은 잠깐 떠 있음
function bub(v,i,ctx){
  if(v.phase==='roles'||v.phase==='over') return '';
  if(v.typing===i) return '<span class="bub typing">💬 입력 중<i>.</i><i>.</i><i>.</i></span>';
  const b=v.bubble&&v.bubble[i], len=v.logLen||v.log.length;
  if(!b || len-b.at>=4) return '';
  let txt=b.text; if(txt.length>34) txt=txt.slice(0,33)+'…';
  return `<span class="bub">${fill(U.esc(txt),ctx)}</span>`;
}const roleHelp={
  loyal:'아무것도 몰라요. 투표와 임무 결과로 첩자 2명을 찾아내세요. 성공 카드만 낼 수 있어요.',
  seer:'첩자가 누군지 알아요! 하지만 너무 티 나면 마지막에 첩자에게 지목당해 역전패해요.',
  spy:'같은 편 첩자를 알아요. 임무에 들어가면 몰래 실패 카드를 낼 수 있어요. 들키지 마세요!',
};
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{};
  const me=HSEAT[ctx.me], myRole=v.roles[me], k=v.sizes[Math.min(v.m,4)];
  const sg=v.phase+':'+v.m+':'+v.leader+':'+v.proposals.length; if(sg!==sig){ sig=sg; sel=[]; }
  const lastL=v.log[v.log.length-1]||''; if(logN && lastL!==logN && !lastL.startsWith('·')) ctx.sfx('emo'); logN=lastL;
  let h='';
  // 역할 확인 장면
  if(v.phase==='roles'){
    const others = myRole==='spy' ? `같은 편 첩자: <b>${v.roles.map((r,i)=>r==='spy'&&i!==me?seatName(i,ctx):null).filter(Boolean).join(', ')}</b>`
                 : myRole==='seer' ? `첩자는 <b>${v.roles.map((r,i)=>r==='spy'?seatName(i,ctx):null).filter(Boolean).join(', ')}</b>` : '';
    h+=`<div class="sp-rolecard ${myRole}"><small>당신의 정체는</small><div class="big">${ROLE[myRole]}</div><p>${roleHelp[myRole]}</p>${others?`<p>${others}</p>`:''}<p class="vr-cast">오늘의 플레이어: ${npcs().map(i=>`${seatEmoji(i)} ${seatName(i,ctx,true)} ${archOf(i)}`).join(' · ')}</p></div>`;
    h+= v.ready[ctx.me] ? `<div class="banner">${v.ready.every(Boolean)?'':'다른 사람이 역할을 확인하는 중…'}</div>` : `<div class="fh-act"><button data-a="ready">확인했어요, 시작!</button></div>`;
    el.innerHTML=h;
    el.onclick=e=>{ const b=e.target.closest('[data-a="ready"]'); if(b) ctx.act({k:'ready'}); };
    return;
  }
  const hint = myRole==='spy' ? `같은 편 첩자: <b>${v.roles.map((r,i)=>r==='spy'&&i!==me?seatName(i,ctx):null).filter(Boolean).join(', ')}</b>`
             : myRole==='seer' ? `첩자는 <b>${v.roles.map((r,i)=>r==='spy'?seatName(i,ctx):null).filter(Boolean).join(', ')}</b>` : '누가 첩자인지 몰라요';
  h+=`<div class="info">내 정체 <b>${ROLE[myRole]}</b> · ${hint}</div>`;
  h+=`<div class="sp-notice">${fill(U.esc(v.notice||''),ctx)}</div>`;
  h+=`<div class="mo-track">${SIZES.map((n,i)=>{ const r=v.hist[i];
    const cls = r ? (r.fails>0?'f':'s') : i===v.m && v.phase!=='over' && v.phase!=='guess' ? 'now' : '';
    return `<div class="mo-m ${cls}"><b>${r?(r.fails>0?'✖':'✔'):n+'명'}</b><small>${r?(r.fails>0?`실패 ${r.fails}`:'성공'):`임무 ${i+1}`}</small></div>`; }).join('')}</div>`;
  h+=`<div class="info">연속 거부 <b>${v.rejects}</b> / ${MAXREJ} ${'●'.repeat(v.rejects)}${'○'.repeat(MAXREJ-v.rejects)}</div>`;
  const picking = v.phase==='propose' && v.leader===me && ctx.can;
  const guessing = v.phase==='guess' && myRole==='spy' && v.turn===ctx.me && ctx.can;
  const lastProp = v.phase==='pause'||v.phase==='mission'||v.phase==='crev' ? v.proposals[v.proposals.length-1] : null;
  h+=`<div class="sp-table">${ALL.map(i=>{
    const role=v.roles[i];
    const badge = v.phase==='over' ? `<em class="${role==='spy'?'bad':'good'}">${ROLE[role]}</em>` : role==='spy' && i!==me ? '<em class="bad">🗡️ 첩자</em>' : i===me ? `<em class="${role==='spy'?'bad':'good'}">${ROLE[role]}</em>` : '';
    const onTeam = v.team && v.team.includes(i);
    let vote='';
    if(v.phase==='vote') vote = i===me ? (v.votes[i]==null?'🤔':v.votes[i]?'👍':'👎') : (v.votes[i]==='done'?'✔':'🤔');
    else if(v.phase==='vrev') vote = v.votes[i]===true?'👍':v.votes[i]===false?'👎':'❔';
    else if(lastProp) vote = lastProp.votes[i] ? '👍' : '👎';
    const thinking = v.phase==='propose' && v.leader===i && !isH(i) ? '💭' : '';
    const card = v.phase==='mission' && onTeam ? (isH(i) ? (v.cards[i]?'🂠':'…') : '🂠') : '';
    const guessMark = v.guess && v.guess.target===i ? '<em class="bad">지목됨</em>' : '';
    // 겉으로 드러낸 의견
    const o=(v.op&&v.op[i])||{}, ops=[];
    if(o.stance==='yes') ops.push('<span class="y">👍 찬성 쪽</span>'); else if(o.stance==='no') ops.push('<span class="n">👎 반대 쪽</span>');
    if(o.sus!=null) ops.push(`<span class="s">🤨 ${seatName(o.sus,ctx,true)} 의심</span>`);
    if(o.trust) ops.push('<span class="t">🙋 결백 주장</span>');
    const targeted=(v.susLog||[]).filter(x=>x.t===i).length;   // 지금까지 의심받은 횟수
    return `<button class="sp-seat ${onTeam?'team':''} ${sel.includes(i)?'sel':''} ${isH(i)?'human':''} ${v.phase==='vrev'&&i===v.vrev-1?'pop':''} ${suspecting&&i!==me?'pick':''}" data-i="${i}">
      ${v.leader===i&&v.phase!=='over'?'<span class="crown">👑</span>':''}${targeted?`<span class="tgt" title="지금까지 의심받은 횟수">🎯${targeted}</span>`:''}<span class="em">${seatEmoji(i)}${thinking}</span><b>${seatName(i,ctx,true)}</b>${archOf(i)?`<small class="sp-arch">${archOf(i)}</small>`:''}${badge}${guessMark}${bub(v,i,ctx)}
      <span class="op">${ops.join('')}</span>
      <span class="vt">${vote} ${card}</span></button>`; }).join('')}</div>`;
  // 임무 카드 뒤집기
  if(v.phase==='crev' || (v.phase==='pause' && v.after==='afterMission')) h+=`<div class="sp-flip">${v.flip.map(c=>`<span class="fc ${c==='S'?'ok':c==='F'?'no':''}">${c==='S'?'✔':c==='F'?'✖':'🂠'}</span>`).join('')}</div>`;
  // 내 행동
  if(v.phase==='propose' && picking) h+=`<div class="fh-act"><button id="spPropose" ${sel.length===k?'':'disabled'}>이 팀으로 제안 (${sel.length}/${k})</button></div>`;
  else if(v.phase==='vote' && v.votes[me]==null && ctx.can) h+=`<div class="fh-act"><button data-vote="1">👍 찬성</button><button data-vote="0" style="background:var(--p0)">👎 반대</button></div>`;
  else if(v.phase==='mission' && v.team.includes(me) && !v.cards[me] && ctx.can) h+=`<div class="fh-act"><button data-card="S">✔ 성공 카드</button>${myRole==='spy'?'<button data-card="F" style="background:var(--p0)">✖ 실패 카드</button>':''}</div>`;
  // 의견 말하기 (모두에게 보이는 말)
  if(v.phase!=='over' && ctx.can){
    const teamTalk = v.team && (v.phase==='vote'||v.phase==='vrev');
    h+=`<div class="sp-say"><span>💬</span>${teamTalk?'<button class="ghost small" data-say="yes">👍 이 팀 좋아요</button><button class="ghost small" data-say="no">👎 별로예요</button>':''}
      <button class="ghost small ${suspecting?'on':''}" data-say="sus">${suspecting?'누구를? 자리를 누르세요':'🤨 의심하기'}</button><button class="ghost small" data-say="trust">🙋 저 믿어줘요</button></div>`;
  }
  if(v.phase==='over'){
    const d=debrief(v), nm=i=>`${seatEmoji(i)} ${seatName(i,ctx,true)}`;
    h+=`<div class="sp-debrief"><div class="mh">🎬 판 정리</div>
      <div class="awards">${d.detective!=null?`<span>🕵️ 명탐정: <b>${nm(d.detective)}</b> (첩자 ${d.st[d.detective].susRight}번 지목)</span>`:''}
      ${d.actor!=null?`<span>🎭 명연기: <b>${nm(d.actor)}</b> (의심 ${d.st[d.actor].sussed}번만 받음)</span>`:''}</div>
      <table class="hist"><tr><th>자리</th><th>정체</th><th>실패 카드</th><th>첩자 낀 팀에 찬성</th><th>의심 적중</th></tr>
      ${ALL.map(i=>`<tr><td>${nm(i)}</td><td>${ROLE[v.roles[i]]}</td><td>${v.roles[i]==='spy'?d.st[i].fails+'장':'-'}</td><td>${d.st[i].dirtyYes}/${d.st[i].votes}</td><td>${d.st[i].susAll?`${d.st[i].susRight}/${d.st[i].susAll}`:'-'}</td></tr>`).join('')}</table></div>`;
  }
  let L='', R='';
  // 임무 기록: 임무마다 어떤 팀이 제안됐고, 누가 찬반했고, 왜 거부/실패했는지 (최근 임무가 위)
  if(v.proposals.length){
    const nm=i=>`${seatEmoji(i)}${seatName(i,ctx,true)}`;
    const ms=[...new Set(v.proposals.map(p=>p.m))].sort((a,b)=>b-a);
    const blocks=ms.map(m=>{
      const props=v.proposals.filter(p=>p.m===m), res=v.hist.find(x=>x.m===m);
      const lines=props.map((p,j)=>{
        const yes=ALL.filter(i=>p.votes[i]), no=ALL.filter(i=>!p.votes[i]);
        return `<div class="pr ${p.ok?'ok':'no'}">
          <div class="pt"><span class="tag2">제안 ${j+1}</span> 👑 ${nm(p.leader)} → 팀 <b>${p.team.map(nm).join(', ')}</b></div>
          <div class="pv"><span class="y">👍 ${yes.length}</span> ${yes.map(nm).join(' ')}</div>
          <div class="pv"><span class="n">👎 ${no.length}</span> ${no.map(nm).join(' ')||'-'}</div>
          <div class="pres">${p.ok?'✅ 통과':`❌ 거부 — 반대 ${no.length}명 (찬성 4명 필요)`}</div></div>`;
      }).join('');
      const out = res ? (res.fails ? `<div class="mres f">✖ 임무 실패 — 실패 카드 <b>${res.fails}장</b> · 이 팀 안에 첩자가 ${res.fails}명 이상!</div>`
                                   : `<div class="mres s">✔ 임무 성공 — 실패 카드 0장 (첩자가 없었거나 참았어요)</div>`)
                      : `<div class="mres">⏳ 진행 중</div>`;
      return `<div class="mblock"><div class="mh">임무 ${'①②③④⑤'[m]} <small>${v.sizes[m]}명 · 제안 ${props.length}번</small></div>${lines}${out}</div>`;
    }).join('');
    L+=`<details class="sp-hist" ${histOpen?'open':''}><summary>📜 임무 기록</summary>${blocks}</details>`;
  }
  // 의심 기록: 누가 누구를, 몇 번째 임무 때 의심했는지 순서대로
  const sl=v.susLog||[];
  if(sl.length){
    const circ=['①','②','③','④','⑤','⑥'];
    const rows=ALL.filter(i=>sl.some(x=>x.by===i)).map(i=>{
      const mine=sl.filter(x=>x.by===i);
      const chips=mine.map((x,j)=>`<span class="${j===mine.length-1?'last':''}">${circ[Math.min(x.m,5)]} ${seatName(x.t,ctx,true)}</span>`).join('<i>→</i>');
      return `<div class="row"><b>${seatEmoji(i)} ${seatName(i,ctx,true)}</b><div class="chips">${chips}</div></div>`;
    }).join('');
    L+=`<details class="sp-sus" ${suslogOpen?'open':''}><summary>🗒 의심 기록 (${sl.length}) <small>①②… = 몇 번째 임무 때</small></summary>${rows}</details>`;
  }
  if(!L) L=`<div class="side-box"><div class="side-h">📜 임무 기록 · 🗒 의심 기록</div><small style="color:#888">첫 투표가 끝나면 여기에 누가 어떤 팀에 찬반했는지, 누가 누구를 의심했는지 쌓여요.</small></div>`;
  R+=`<div class="side-box"><div class="side-h">💬 테이블 대화 <small>아래가 최근</small></div><div class="sp-log" id="spLog">${v.log.slice(-60).map((t,i,arr)=>`<div class="${t.startsWith('·')?'sys':'talk'} ${i===arr.length-1?'new':''}">${fill(U.esc(t),ctx)}</div>`).join('')}</div></div>`;
  el.innerHTML=`<div class="side3"><div class="side-mid">${h}</div><aside class="side-l">${L}</aside><aside class="side-r">${R}</aside></div>`;
  const lg=el.querySelector('#spLog'); if(lg) lg.scrollTop=lg.scrollHeight;
  const sd=el.querySelector('.sp-sus'); if(sd) sd.addEventListener('toggle',()=>{ suslogOpen=sd.open; });
  const hd=el.querySelector('.sp-hist'); if(hd) hd.addEventListener('toggle',()=>{ histOpen=hd.open; });
  el.onclick=e=>{
    const b=e.target.closest('button'); if(!b||b.disabled) return;
    if(b.id==='spPropose'){ ctx.act({k:'propose',team:sel}); return; }
    if(b.dataset.vote!=null){ ctx.act({k:'vote',yes:b.dataset.vote==='1'}); return; }
    if(b.dataset.card){ ctx.act({k:'card',v:b.dataset.card}); return; }
    if(b.dataset.say){
      const w=b.dataset.say;
      if(w==='sus'){ suspecting=!suspecting; ctx.rerender(); return; }
      suspecting=false; ctx.act({k:'say',k2:w}); return;
    }
    if(b.dataset.i!=null){
      const i=+b.dataset.i;
      if(suspecting){ suspecting=false; if(i===me){ ctx.rerender(); return; } ctx.act({k:'say',k2:'sus',t:i}); return; }
      if(guessing){ if(v.roles[i]==='spy'){ ctx.tip('같은 편 첩자예요'); return; } ctx.act({k:'guess',seat:i}); return; }
      if(picking){ sel = sel.includes(i) ? sel.filter(x=>x!==i) : sel.length<k ? sel.concat(i) : sel; ctx.rerender(); }
    }
  };
}
function status(v,ctx){ syncH(v);
  const me=HSEAT[ctx.me];
  if(v.phase==='roles') return v.ready[ctx.me] ? '다른 사람을 기다리는 중…' : '내 역할을 확인하고 시작을 누르세요';
  if(v.phase==='propose') return v.leader===me ? `내가 리더예요 👑 임무에 보낼 ${v.sizes[v.m]}명을 고르세요` : '리더가 팀을 고르는 중…';
  if(v.phase==='vote') return v.votes[me]==null ? '이 팀을 보낼지 투표하세요' : '다른 사람들이 투표하는 중…';
  if(v.phase==='vrev') return '투표 공개 중…';
  if(v.phase==='mission') return v.team.includes(me) ? (v.cards[me]?'다른 팀원이 카드를 고르는 중…':'임무 카드를 몰래 내세요') : '임무 팀이 카드를 고르는 중…';
  if(v.phase==='crev') return '카드를 뒤집는 중…';
  if(v.phase==='pause') return '';
  if(v.phase==='guess') return v.roles[me]==='spy'&&v.turn===ctx.me ? '예언자라고 생각하는 사람을 누르세요 (맞히면 역전승!)' : '첩자들이 예언자를 찾는 중…';
  return '';
}
/* 혼자 모드: 친구 자리(1번)를 컴퓨터가 같은 두뇌로 */
function ai(v){ syncH(v);
  const seat=HSEAT[1], know={role:v.roles[seat], spies: v.roles[seat]==='spy'||v.roles[seat]==='seer' ? ALL.filter(i=>v.roles[i]==='spy') : null};
  if(v.phase==='roles' && !v.ready[1]) return {k:'ready'};
  if(v.phase==='propose' && v.leader===seat) return {k:'propose', team:bPropose(v,seat,know)};
  if(v.phase==='vote' && v.votes[seat]==null) return {k:'vote', yes:bVote(v,seat,v.team,know)};
  if(v.phase==='mission' && v.team.includes(seat) && !v.cards[seat]) return {k:'card', v:bCard(v,seat,v.team,know)};
  if(v.phase==='guess' && know.role==='spy' && v.turn===1) return {k:'guess', seat:bGuess(v,know)};
  return null;
}
const guide=`
<p><b>6명이 둘러앉은 테이블</b>이에요. 우리 둘 + 컴퓨터 플레이어 4명. 이 중 <b>2명이 첩자</b>예요.</p>
<p>컴퓨터 플레이어는 판마다 🧠 전략가·🤝 연합가·🔍 관찰자·💓 직감파·🃏 승부사·🔥 직진형·🗡️ 배신형·⚖️ 중재자 중 4명이 나와요. 성격에 따라 팀을 짜는 눈, 투표 기준, 첩자일 때 참는 정도, 의심받았을 때 반응이 달라요.</p>
<h3>정체 (몰래 받음)</h3>
<ul><li>🛡️ <b>충신</b> 3명: 아무것도 몰라요. 추리로 첩자를 찾아야 해요.</li>
<li>🔮 <b>예언자</b> 1명: 충신 편인데, <b>첩자가 누군지 알아요.</b> 대신 들키면 안 돼요.</li>
<li>🗡️ <b>첩자</b> 2명: 서로 누가 첩자인지 알아요.</li>
<li>우리 둘이 같은 편일 수도, 적일 수도 있어요. (둘 다 첩자는 안 나와요)</li></ul>
<h3>한 라운드 흐름</h3>
<ol><li><b>👑 리더가 팀 제안</b>: 리더는 한 명씩 돌아가요. 임무마다 정해진 인원(2·3·3·3·3명)을 골라요.</li>
<li><b>전원 투표</b>: 6명이 찬성/반대. 한 명씩 공개돼요. 찬성 4명 이상이면 통과.</li>
<li><b>임무</b>: 팀원만 몰래 카드를 내요. 충신은 성공만, 첩자는 실패도 낼 수 있어요. 카드를 섞어 한 장씩 뒤집어요.</li></ol>
<h3>승리</h3>
<ul><li>임무 <b>성공 3번</b> → 충신 편 승리… 인 줄 알았지만, 마지막에 <b>첩자가 예언자를 맞히면 첩자 역전승!</b></li>
<li>임무 <b>실패 3번</b> → 첩자 승리</li>
<li>팀 제안이 <b>5번 연속 거부</b>돼도 → 첩자 승리</li></ul>
<div class="tipbox">💡 <b>팁</b><br>
· 투표 기록이 단서예요. 실패한 팀에 찬성한 사람, 늘 이상한 팀을 짜는 리더를 의심하세요.<br>
· NPC들도 말을 해요. 첩자 NPC는 거짓말로 다른 사람을 몰아갈 수 있어요!<br>
· 예언자는 너무 티 나게 굴면 마지막에 지목당해요.<br>
· 둘 다 충신이면 사실상 협력 게임! 통화하면서 서로 떠보세요.</div>`;
window.GAMES.spy = { _sync:x=>syncH(x), maxH:6,
  title:'누가 첩자일까', ref:'레지스탕스 아발론', emoji:'🗡️', tags:['마피아','추리','블러프','NPC'], tagline:'우리 둘 + NPC 4명, 6인 테이블. 팀 제안·투표·몰래 카드로 숨은 첩자 둘을 찾는 마피아 게임.',
  guide, init, apply, mask, ai, render, status, step, stepDelay, noPersona:true, wide:true,
  aiDelay:()=>1800+Math.random()*2200,
  reset(){ sel=[]; sig=''; logN=''; suspecting=false; },
  bar:(v,i)=>{ const seat=HSEAT[i], r=v.roles[seat]; return `${v.leader===seat&&v.phase!=='over'?'<span>👑</span>':''}<span class="tag">${r?ROLE[r]:'정체 ?'}</span>`; },
  result:(v)=>`${v.side==='spy'?'첩자 편':'충신 편'} 승리`,
};
})();
