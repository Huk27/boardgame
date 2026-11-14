(function(){
'use strict';
/* 세븐노트 (피의 게임 시즌 3 · 7일차 메인 매치) — 6인(우리 둘 + NPC 4명)용.
   12음 건반을 한 사람이 두 음씩 맡음(두 라운드마다 새로 배정). 라운드마다 곡이 공개되고, 각자 몰래 코인을 걸어 조를 올림.
   가장 많이 건 액수만큼 곡이 반음씩 올라가 연주됨(건 코인은 모두 냄). 연주된 음을 맡은 사람이 점수: 흰 건반 1 · 검은 건반 2 (7·8라운드는 2 · 3).
   뮤트권(게임 중 한 번): 음 하나를 막음 — 가장 많이 몰린 음(공동 1위 모두)이 그 라운드 점수 없음. 8라운드 합계 1위 우승, 동점은 남은 코인. */
/* 👥 N명: 사람 자리는 init(starter,{humans:k})로, 나머지는 NPC */
const N=6, ROUNDS=8, COINS=20, MAXB=11; let HSEAT=[0,3]; const SEATORD=[0,3,1,4,2,5];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i), ALL=[...Array(N).keys()];
const nm=i=>`{s${i}}`;
const NOTE=['도','도#','레','레#','미','파','파#','솔','솔#','라','라#','시'], BLACK=[1,3,6,8,10];
const isB=n=>BLACK.includes(n);
const SONGS=[
  ['작은 별',[0,0,7,7,9,9,7,5,5,4,4,2,2,0]], ['나비야',[7,4,4,5,2,2,0,2,4,5,7,7,7]], ['학교 종',[7,7,9,9,7,7,4,7,7,4,4,2]], ['산토끼',[7,4,4,7,4,0,2,4,2,0,4,7]],
  ['떴다 떴다 비행기',[4,2,0,2,4,4,4,2,2,2,4,7,7]], ['생일 축하',[7,7,9,7,0,11,7,7,9,7,2,0]], ['환희의 송가',[4,4,5,7,7,5,4,2,0,0,2,4,4,2,2]], ['징글벨',[4,4,4,4,4,4,4,7,0,2,4]],
  ['곰 세 마리',[0,0,0,0,0,4,7,7,4,0,7,7,4,7,7,4,0,0,0]], ['도레미 송',[0,2,4,0,4,0,4,2,4,5,5,4,2,5]], ['그린슬리브스',[9,0,2,4,5,4,2,11,7,9,11,0,9,9,8,9,11,8,4]],
];
const STYLE={seojin:'logic', doyun:'warm', haram:'calm', yuna:'emo', minho:'sly', taekyung:'hot', jihu:'sly', soyul:'warm'};
const DEF_P={talk:.5,aggr:.5,trust:.5,bluff:.4,logic:.6,temper:.4};
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
const LINES={
  logic:{hint:['계산상 {t}칸이 제일 좋네요.','{t}칸 올리면 효율이 좋아요.'], none:['저는 그대로 둬도 괜찮아요.','조옮김 없이 가는 게 낫겠어요.'], score:['예상대로 {n}점.','계산대로네요.'], react:['{t}, 그렇게 많이 걸었어요?','흥미롭네요, {t}.'], confess:['{r}라운드에 말한 건 사실 미끼였어요.']},
  warm:{hint:['저는 {t}칸 올라가면 좋겠어요~ 😊','{t}칸만 도와주실래요? 🙏'], none:['그대로가 좋아요~','저는 안 올려도 돼요 😊'], score:['와 {n}점! 😊','헤헤 감사합니다'], react:['{t} 대단해요!','와 {t} 통 크다 😮'], confess:['{r}라운드 때 거짓말해서 미안해요 🥲']},
  calm:{hint:['…{t}.','{t}칸.'], none:['…그대로.','…'], score:['…{n}.','…'], react:['…{t}.','…흠.'], confess:['…{r}라운드는 거짓이었어요.']},
  emo:{hint:['{t}칸!! 제발 {t}칸!! 😆','{t}칸 가면 대박이에요 🤩'], none:['그냥 두세요 제발 😣','올리지 마요!'], score:['꺄 {n}점 🥳','대박!!'], react:['헐 {t} 미쳤다 😱','{t} 왜 그래요 😵'], confess:['{r}라운드 때 연기 잘했죠? 😆']},
  sly:{hint:['{t}칸? 글쎄요 😏','다들 {t}칸 좋지 않아요? 😏'], none:['그대로 가시죠 😏','안 올리는 게 서로 좋아요 😏'], score:['{n}점, 고마워요 😏','역시 😏'], react:['{t}, 속셈이 보여요 😏','{t} 많이 썼네 😏'], confess:['{r}라운드 말은 당연히 뻥이었죠 😏']},
  hot:{hint:['{t}칸! 무조건 {t}칸! 🔥','{t}칸 갑시다!'], none:['그대로! 건드리지 마요!','올리면 가만 안 둬요 😤'], score:['{n}점! 봤죠? 🔥','당연하지!'], react:['{t}! 두고 봐요 😤','{t} 세게 거네 🔥'], confess:['{r}라운드? 작전이었어요 🔥']},
};
function lineOf(s,i,kind,vars){ const st=STYLE[P(s,i).id]||'calm', L=(LINES[st]||LINES.calm)[kind]||LINES.calm[kind]; if(!L) return '';
  const used=(s.used[i]=s.used[i]||[]); const pool=L.filter(x=>!used.includes(x)); const raw=pool.length?U.pick(pool):U.pick(L); used.push(raw);
  return raw.replace(/\{n\}/g,vars&&vars.n!=null?vars.n:'').replace(/\{r\}/g,vars&&vars.r!=null?vars.r:s.round).replace(/\{t\}/g,vars&&vars.t!=null?(typeof vars.t==='number'&&vars.seat?nm(vars.t):vars.t):''); }

function init(starter,o){ const k=Math.max(2,Math.min(6,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  const s={phase:'intro', who:{}, starter:starter|0, round:0, own:Array(12).fill(0), songs:U.shuffle(SONGS.map((_,k)=>k)).slice(0,ROUNDS), song:null,
    coins:Array(N).fill(COINS), pts:Array(N).fill(0), muteLeft:Array(N).fill(true), bet:Array(N).fill(null), mute:Array(N).fill(null), sub:Array(N).fill(false),
    claims:[], shift:null, muted:[], pi:-1, gain:null, hist:[], ri:0, q:[], say:null, used:{}, log:[], turn:null, winner:null, ev:0, dlist:[], dj:0,
    notice:'🎙️ 메인 매치 「세븐노트」 — 내 음이 연주되게 조를 움직이세요'};
  s.hs=HSEAT.slice(); const ids=NPCS.cast(N-HSEAT.length); ALL.filter(i=>!isH(i)).forEach((i,k)=>s.who[i]=ids[k]);
  return s;
}
const val=(s,n)=> (isB(n)?2:1)+(s.round>=7?1:0);
const played=(song,t)=>[...new Set(song.map(n=>(n+t)%12))];
function gainOf(s,j,t,muted){ const pl=played(SONGS[s.song][1],t); let g=0; for(let n=0;n<12;n++) if(s.own[n]===j&&pl.includes(n)&&!(muted||[]).includes(n)) g+=val(s,n); return g; }
function startRound(s){
  s.round++; s.bet=Array(N).fill(null); s.mute=Array(N).fill(null); s.sub=Array(N).fill(false); s.claims=[]; s.shift=null; s.muted=[]; s.bshown=[]; s.mshown=false; s.pi=-1; s.gain=null; s.ri=0;
  s.song=s.songs[s.round-1]; s.phase='wait'; s.turn=null;
  if(s.round%2===1){ const notes=U.shuffle([...Array(12).keys()]); notes.forEach((n,k)=>s.own[n]=ALL[k%N]); s.q.push({k:'note',text:`🎹 ${s.round}라운드 — 음 배치가 새로 정해졌어요 (두 라운드 동안 유지)`}); }
  s.q.push({k:'note',text:`🎼 ${s.round}라운드 곡: 「${SONGS[s.song][0]}」${s.round>=7?' · 마지막 두 라운드는 점수 +1!':''}`});
  const talkers=U.shuffle(ALL.filter(i=>!isH(i))).filter(i=>Math.random()<.35+P(s,i).talk*.6).slice(0,3);
  talkers.forEach(i=>s.q.push({k:'hint',i}));
  s.q.push({k:'bet'});
}
const coinVal=(s,j)=>{ const left=ROUNDS-s.round+1; return Math.max(.25, Math.min(1.2, .55*left*2.2/Math.max(1,s.coins[j]))); };
/* 컴퓨터 판단 — 공개 정보(배치·곡·코인·점수·발언)만 */
function desired(s,j,lvl){ const c=coinVal(s,j), cap=Math.min(MAXB,s.coins[j]); let best=0, bv=gainOf(s,j,0); for(let t=1;t<=cap;t++){ const v=gainOf(s,j,t)-c*t; if(v>bv+.01){ bv=v; best=t; } } return {t:best, g:bv-gainOf(s,j,0)}; }
function decide(s,i,lvl){ lvl=lvl==null?1:lvl; const p=P(s,i); const c=lvl===0?.2:coinVal(s,i)*(lvl===2?1.1:1), cap=Math.min(MAXB,s.coins[i]);
  let M=0; if(lvl>0) for(const j of ALL) if(j!==i){ const d=desired(s,j,lvl); if(d.g>=1&&d.t>M) M=d.t; }
  let Ms=[M]; if(lvl===2){ Ms=[]; for(let k=0;k<6;k++){ let mm=0; for(const j of ALL) if(j!==i){ mm=Math.max(mm, decide(s,j,1).bet); } Ms.push(mm); } }
  let bx=0, bv=-1e9;
  for(let x=0;x<=cap;x++){ let v=0; for(const Mk of Ms){ const sh = x>Mk ? x : Mk; v+=gainOf(s,i,sh); } v=v/Ms.length - c*x + (lvl<2&&x===M+1&&x>0?.2:0) + (Math.random()-.5)*(lvl===0?1.6:lvl===1?.5:.1); if(v>bv){ bv=v; bx=x; } }
  if(lvl<2&&Math.random()<.15*p.aggr&&bx>0&&bx<cap) bx++;
  let mute=null;
  if(s.muteLeft[i]){ const sh=Math.max(bx,M); const pl=played(SONGS[s.song][1],sh); const leaders=ALL.filter(j=>j!==i).sort((a,b)=>s.pts[b]-s.pts[a]);
    const late=s.round>=6, ahead=s.pts[leaders[0]]>=s.pts[i];
    if((late||Math.random()<.12*p.aggr)&&ahead){ const cands=pl.filter(n=>s.own[n]!==i).sort((a,b)=>(s.pts[s.own[b]]+val(s,b))-(s.pts[s.own[a]]+val(s,a))); if(cands.length&&(late&&s.round>=7||Math.random()<.5)) mute=cands[0]; } }
  return {bet:bx, mute}; }
function act(s,i,a){ if(s.phase!=='bet') return '지금은 제출할 때가 아니에요'; if(s.sub[i]) return '이미 제출했어요'; const b=a.bet|0; if(b<0||b>Math.min(MAXB,s.coins[i])) return `0~${Math.min(MAXB,s.coins[i])}개`;
  let m=a.mute==null?null:a.mute|0; if(m!=null&&(!s.muteLeft[i]||m<0||m>11)) return '뮤트권을 쓸 수 없어요';
  s.bet[i]=b; s.mute[i]=m; s.sub[i]=true; s.log.push(`🗳️ ${nm(i)} 투표룸 다녀옴`); return null; }
function apply(s,p,a){ syncH(s); if(s.winner!=null) return '게임이 끝났어요'; if(!a||a.k!=='submit') return '알 수 없는 동작'; if(s.q.some(e=>!['note','react','hint'].includes(e.k))) return '잠시만요 — 진행 중이에요'; const e=act(s,HSEAT[p],a); if(!e) s.ev++; return e; }
function stepDelay(s){ syncH(s); if(s.winner!=null) return null;
  if(s.phase==='intro') return 2200;
  if(s.q.length){ const k=s.q[0].k; return k==='note'?1700 : k==='hint'?1900 : k==='bv'?1200 : k==='shift'?1800 : k==='mute'?1800 : k==='play'?520 : k==='sc'?1100 : k==='react'?1300 : 500; }
  if(s.phase==='bet'){ const npcLeft=ALL.filter(i=>!isH(i)&&!s.sub[i]); return s.sub.every(Boolean)?600 : npcLeft.length?900+Math.random()*1400 : null; }
  if(s.phase==='debrief') return s.dj<s.dlist.length?2200:1200;
  return null; }
function step(s){ syncH(s);
  if(s.phase==='intro'){ startRound(s); s.ev++; return; }
  if(s.q.length){ const e=s.q.shift();
    if(e.k==='note'){ s.notice=e.text; s.log.push(e.text); }
    else if(e.k==='hint'){ const i=e.i, d=desired(s,i,1), p=P(s,i); const lie=Math.random()<p.bluff*.55; let t=d.g>=1?d.t:0; if(lie) t = t?0:1+(Math.random()*4|0);
      const txt = t? lineOf(s,i,'hint',{t}) : lineOf(s,i,'none'); s.claims.push({i,t,lie,r:s.round}); s.say={seat:i,text:txt,n:(s.say?s.say.n:0)+1}; s.log.push(`💬 ${nm(i)}: ${txt}`); }
    else if(e.k==='bet'){ s.phase='bet'; s.notice='🗳️ 투표룸 — 조옮김 베팅(코인)과 뮤트권을 몰래 내세요'; }
    else if(e.k==='bv'){ const i=e.i; s.bshown.push(i); s.notice=`🪙 ${nm(i)}: ${s.bet[i]}개${s.mute[i]!=null?' + 🔇 뮤트권':''}`; s.log.push(s.notice); }
    else if(e.k==='shift'){ const T=Math.max(...s.bet); s.shift=T; const top=ALL.filter(i=>s.bet[i]===T&&T>0); s.notice = T ? `🎚️ 최고 ${T}개 → 곡이 반음 ${T}칸 올라가요 (${top.map(nm).join(' · ')})` : '🎚️ 아무도 안 걸었어요 — 원래 조 그대로'; s.log.push(s.notice);
      if(T>=4){ const r=ALL.filter(j=>!isH(j)&&!top.includes(j)); if(r.length&&Math.random()<.6) s.q.unshift({k:'react',i:U.pick(r),by:top[0]}); } }
    else if(e.k==='mute'){ s.mshown=true; const cnt={}; ALL.forEach(i=>{ const m=s.mute[i]; if(m!=null){ cnt[m]=(cnt[m]||0)+1; s.muteLeft[i]=false; } }); const mx=Math.max(0,...Object.values(cnt)); s.muted=Object.keys(cnt).filter(k=>cnt[k]===mx&&mx>0).map(Number);
      s.notice = s.muted.length ? `🔇 뮤트권 ${Object.values(cnt).reduce((a,b)=>a+b,0)}장 → ${s.muted.map(n=>NOTE[n]).join(' · ')} 막힘` : '🔇 이번엔 뮤트 없음'; s.log.push(s.notice); }
    else if(e.k==='play'){ s.pi=e.k2; const n=(SONGS[s.song][1][e.k2]+s.shift)%12; s.cur=n; tone(n); }
    else if(e.k==='sc'){ const i=e.i, g=s.gain[i]; s.pts[i]+=g; s.notice=`🎵 ${nm(i)} +${g}점`; s.log.push(s.notice); if(!isH(i)&&g>=3){ const t=lineOf(s,i,'score',{n:g}); if(t) s.say={seat:i,text:t,n:(s.say?s.say.n:0)+1}; } }
    else if(e.k==='rend'){ s.hist.push({r:s.round,song:s.song,shift:s.shift,bet:s.bet.slice(),muted:s.muted.slice(),gain:s.gain.slice()}); s.cur=null; if(s.round<ROUNDS) startRound(s); else finish(s); }
    else if(e.k==='react'){ const t=lineOf(s,e.i,'react',{t:e.by,seat:true}); if(t){ s.say={seat:e.i,text:t,n:(s.say?s.say.n:0)+1}; s.log.push(`${nm(e.i)}: ${t}`); } }
    else if(e.k==='fin'){ const r=rank(s); s.notice=`🏁 최종 — ${r.map((i,k)=>`${k+1}. ${nm(i)} ${s.pts[i]}점`).join(' · ')}`; s.log.push(s.notice); s.phase='debrief'; s.dlist=ALL.filter(i=>!isH(i)); s.dj=0; }
    s.ev++; return; }
  if(s.phase==='bet'){ const npc=ALL.filter(i=>!isH(i)&&!s.sub[i]); if(npc.length){ const i=npc[0]; const d=decide(s,i,1); act(s,i,d); s.ev++; return; }
    if(s.sub.every(Boolean)){ s.phase='reveal'; for(const i of ALL){ s.coins[i]-=s.bet[i]; s.q.push({k:'bv',i}); } s.q.push({k:'shift'}); s.q.push({k:'mute'}); s.q.push({k:'calc'}); s.ev++; return; } return; }
  if(s.phase==='debrief'){ if(s.dj<s.dlist.length){ const i=s.dlist[s.dj++]; const lies=(s.allClaims||[]).filter(c=>c.i===i&&c.lie);
      const t='(속마음) '+(lies.length?lineOf(s,i,'confess',{r:lies[lies.length-1].r}):'솔직히 조옮김 눈치 싸움이 제일 어려웠어요'); s.say={seat:i,text:t,n:(s.say?s.say.n:0)+1}; s.log.push(`💭 ${nm(i)}: ${t}`); s.ev++; return; }
    s.phase='over'; const a=s.pts[HSEAT[0]], b=s.pts[HSEAT[1]]; s.winner = a>b?0 : b>a?1 : s.coins[HSEAT[0]]>s.coins[HSEAT[1]]?0 : s.coins[HSEAT[1]]>s.coins[HSEAT[0]]?1 : 'both'; { const V=h=>s.pts[h]*1000+s.coins[h], bv=Math.max(...HSEAT.map(V)); s.winners=HSEAT.map((h,p)=>V(h)===bv?p:-1).filter(x=>x>=0); } s.ev++; return; }
}
/* calc는 step의 q에서 */
const _step=step;
function stepAll(s){ if(s.q.length&&s.q[0].k==='calc'){ s.q.shift(); s.gain=ALL.map(i=>gainOf(s,i,s.shift,s.muted)); s.allClaims=(s.allClaims||[]).concat(s.claims);
    SONGS[s.song][1].forEach((_,k)=>s.q.push({k:'play',k2:k})); ALL.filter(i=>s.gain[i]>0).sort((a,b)=>s.gain[b]-s.gain[a]).forEach(i=>s.q.push({k:'sc',i})); if(!s.gain.some(g=>g>0)) s.q.push({k:'note',text:'🎵 아무도 점수를 못 얻었어요'}); s.q.push({k:'rend'});
    s.notice=`🎹 연주 시작 — 「${SONGS[s.song][0]}」 ${s.shift?`반음 ${s.shift}칸 위로`:'원래 조로'}`; s.ev++; return; }
  return _step(s); }
const rank=s=>ALL.slice().sort((a,b)=>s.pts[b]-s.pts[a]||s.coins[b]-s.coins[a]);
function finish(s){ s.phase='final'; s.q.push({k:'fin'}); }
let actx=null;
function tone(n){ try{ if(typeof muted!=='undefined'&&muted) return; if(typeof window==='undefined'||!window.AudioContext) return; actx=actx||new AudioContext(); const o=actx.createOscillator(), g=actx.createGain(); o.type='triangle'; o.frequency.value=261.63*Math.pow(2,n/12); g.gain.setValueAtTime(.12,actx.currentTime); g.gain.exponentialRampToValueAtTime(.001,actx.currentTime+.45); o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime+.46); }catch(_){} }
function mask(s,p){ syncH(s); const v=U.clone(s), me=HSEAT[p]; if(s.phase==='bet'){ v.bet=s.bet.map((b,i)=>i===me?b:null); v.mute=s.mute.map((m,i)=>i===me?m:null); }
  if(s.phase==='reveal'){ v.bet=s.bet.map((b,i)=>i===me||s.bshown.includes(i)?b:null); v.mute=s.mute.map((m,i)=>i===me||s.mshown?m:(m!=null&&s.bshown.includes(i)?-1:null)); }
  v.claims=s.claims.map(c=>({i:c.i,t:c.t,r:c.r})); v.allClaims=(s.phase==='debrief'||s.phase==='over')?s.allClaims:null; v.q=[]; v.used={}; return v; }
function ai(v,lvl){ syncH(v); const i=HSEAT[1]; if(v.phase!=='bet'||v.sub[i]) return null; const d=decide(v,i,lvl); return {k:'submit', bet:d.bet, mute:d.mute}; }
function aiDelay(){ return 2500+Math.random()*3500; }

/* 화면 */
let WHO={}, bet=0, mt=null, pv=0, sig='';
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}/g,(_,d)=>`${seatEmoji(+d)} ${seatName(+d,ctx)}`); }
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{}; const me=HSEAT[ctx.me]; const song=v.song!=null?SONGS[v.song]:null;
  const sg=v.round+':'+v.phase; if(sg!==sig){ sig=sg; if(v.phase==='bet'){ bet=0; mt=null; pv=0; } }
  const showShift = v.shift!=null ? v.shift : pv;
  const pl = song ? played(song[1], showShift) : [];
  let h=`<div class="hl-notice">${fill(U.esc(v.notice||''),ctx)}</div>`;
  h+=`<div class="vr-speech">${v.say?`<span class="w">${seatEmoji(v.say.seat)} ${seatName(v.say.seat,ctx)}</span> ${fill(U.esc(v.say.text),ctx)}`:'<i>　</i>'}</div>`;
  h+=`<div class="info">${Math.max(1,v.round)}/${ROUNDS}라운드${v.round>=7?' · 점수 +1':''} · 내 코인 🪙${v.coins[me]} · 뮤트권 ${v.muteLeft[me]?'🔇 있음':'썼음'}</div>`;
  if(song) h+=`<div class="sn-song">🎼 「${U.esc(song[0])}」 <span>${song[1].map((n,k)=>`<i class="${v.pi===k?'cur':''} ${isB((n+showShift)%12)?'b':''}">${NOTE[(n+showShift)%12]}</i>`).join('')}</span>${v.shift==null?`<small>${pv?`미리보기: 반음 ${pv}칸 위`:'원래 조'}</small>`:''}</div>`;
  h+=`<div class="sn-keys">${[...Array(12).keys()].map(n=>{ const o=v.own[n]; const hit=pl.includes(n), mu=(v.muted||[]).includes(n);
      return `<div class="sn-key ${isB(n)?'blk':''} ${hit?'hit':''} ${v.cur===n?'cur':''} ${mu?'mute':''} ${o===me?'mine':''}"><small>${NOTE[n]}</small><b>${seatEmoji(o)}</b>${mu?'<em>🔇</em>':''}<span>${val(v,n)}점</span></div>`; }).join('')}</div>`;
  h+=`<div class="sn-seats">${ALL.map(i=>{ const g=song?gainOf(v,i,showShift,v.muted):0; const cl=(v.claims||[]).find(c=>c.i===i);
      return `<div class="sn-seat ${i===me?'me':''}"><div>${seatEmoji(i)} ${seatName(i,ctx)}</div><small>${isH(i)?'':NPCI(i)[2]}</small><div><b>${v.pts[i]}</b>점 · 🪙${v.coins[i]}</div>
      <div class="sn-st">${v.phase==='bet'?(v.sub[i]?'✅ 제출':'💭'):v.bet[i]!=null?`🪙${v.bet[i]}${v.mute[i]!=null?' 🔇':''}`:''} ${cl?`<span title="발언">💬${cl.t?`${cl.t}칸`:'그대로'}</span>`:''}</div>
      ${song&&v.phase!=='over'?`<div class="sn-g ${g?'on':''}">${v.shift==null?'이 조면 ':''}+${g}</div>`:''}</div>`; }).join('')}</div>`;
  if(v.phase==='bet'&&!v.sub[me]){ const cap=Math.min(MAXB,v.coins[me]);
    h+=`<div class="vr-card"><b>🗳️ 투표룸</b> <small>가장 많이 건 액수만큼 곡이 올라가요 · 건 코인은 돌려받지 못해요</small>
      <div class="sn-pv">조옮김 미리보기 ${[...Array(Math.min(12,cap+1)).keys()].map(t=>`<button class="${pv===t?'':'ghost'}" data-pv="${t}">${t}</button>`).join('')}</div>
      <div class="bs-amt">내 베팅 <button class="ghost" data-a="bm">−</button><b>🪙${bet}</b><button class="ghost" data-a="bp">+</button></div>
      ${v.muteLeft[me]?`<div class="sn-mute">🔇 뮤트권 (한 번뿐): <select data-mt><option value="">안 씀</option>${NOTE.map((x,n)=>`<option value="${n}" ${mt===n?'selected':''}>${x} (${seatName(v.own[n],ctx).replace(/<[^>]+>/g,'')})</option>`).join('')}</select></div>`:''}
      <div class="fh-act"><button data-a="submit">제출 (🪙${bet}${mt!=null?` · 🔇${NOTE[mt]}`:''})</button></div></div>`; }
  else if(v.phase==='bet') h+=`<div class="vr-card"><small>제출 완료 — 다른 사람을 기다려요 (${v.sub.filter(Boolean).length}/${N})</small></div>`;
  if(v.phase==='over') h+=`<div class="sn-score">${rank(v).map((i,k)=>`<div class="${isH(i)?'h':''}"><b>${k+1}. ${seatEmoji(i)} ${seatName(i,ctx)}</b> ${v.pts[i]}점 · 🪙${v.coins[i]}</div>`).join('')}</div>`;
  const L=`<div class="side-box"><div class="side-h">📊 순위 <small>동점은 코인</small></div>${rank(v).map((i,k)=>`<div class="side-row ${i===me?'me':''}">${k+1}. ${seatEmoji(i)} ${seatName(i,ctx)} <small>${v.pts[i]}점 · 🪙${v.coins[i]}</small></div>`).join('')}
    <div class="side-h" style="margin-top:8px">🎼 지난 라운드</div>${v.hist.slice().reverse().map(x=>`<div class="side-row"><small>${x.r}R 「${SONGS[x.song][0]}」 +${x.shift}${x.muted.length?` 🔇${x.muted.map(n=>NOTE[n]).join('')}`:''}</small></div>`).join('')||'<div class="side-row"><small>-</small></div>'}</div>`;
  const R=`<div class="side-box side-log"><div class="side-h">📜 진행 기록 <small>최근이 위</small></div>${v.log.slice(-70).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=`<div class="side3"><div class="side-mid">${h}</div><aside class="side-l">${L}</aside><aside class="side-r">${R}</aside></div>`;
  el.onchange=e=>{ if(e.target.matches('[data-mt]')){ mt=e.target.value===''?null:+e.target.value; ctx.rerender(); } };
  el.onclick=e=>{ const p=e.target.closest('[data-pv]'); if(p){ pv=+p.dataset.pv; bet=pv; return ctx.rerender(); }
    const a=e.target.closest('[data-a]'); if(!a) return; const k=a.dataset.a;
    if(k==='bm'){ bet=Math.max(0,bet-1); return ctx.rerender(); } if(k==='bp'){ bet=Math.min(Math.min(MAXB,v.coins[me]),bet+1); return ctx.rerender(); }
    if(k==='submit') return ctx.act({k:'submit',bet,mute:mt}); };
}
function status(v,ctx){ syncH(v); if(v.phase==='over') return ''; if(v.phase==='bet'&&!v.sub[HSEAT[ctx.me]]) return '베팅을 제출하세요'; return '진행 중…'; }
const guide=`
<p><b>건반 조옮김 눈치 싸움</b> (우리 둘 + 성격 다른 컴퓨터 플레이어 4명).</p>
<ol><li>12음 건반을 한 사람이 <b>두 음씩</b> 맡아요(두 라운드마다 새로 배정).</li>
<li>라운드마다 <b>곡</b>이 공개되고, 몇몇이 "몇 칸 올리면 좋다"고 한마디(<b>거짓말일 수도</b>).</li>
<li>투표룸에서 몰래 <b>코인을 걸어요</b>. <b>가장 많이 건 액수만큼</b> 곡이 반음씩 올라가 연주돼요. 건 코인은 모두 내요.</li>
<li>연주된 음을 맡은 사람이 점수: 흰 건반 1 · 검은 건반 2 (7·8라운드는 2 · 3).</li>
<li>🔇 <b>뮤트권</b>(한 번): 음 하나를 막아요 — 가장 많이 몰린 음(공동 1위 모두)은 그 라운드 점수 없음.</li>
<li>${ROUNDS}라운드 합계 1위 우승(동점은 남은 코인). 우리 둘 중 높은 쪽이 승리.</li></ol>
<div class="tipbox">💡 <b>팁</b><br>· 미리보기 버튼으로 몇 칸 올리면 누가 득을 보는지 바로 보여요.<br>· 남이 크게 걸 것 같으면 굳이 걸지 말고 코인을 아끼세요.<br>· 뮤트권은 점수가 높아지는 7·8라운드에 1등을 막는 데!</div>`;
function demo(s){ s.round=0; startRound(s); s.q=[]; s.phase='bet'; return s; }
const guideSteps=[
  {t:'🎹 내 음 두 개', h:'12음 건반을 한 사람이 <b>두 음씩</b>. 건반 위 얼굴이 그 음의 주인이에요. 검은 건반은 <b>2점</b>!', demo:s=>demo(s)},
  {t:'🎚️ 조옮김 베팅', h:'몰래 코인을 걸어요. <b>가장 많이 건 액수</b>만큼 곡이 반음씩 올라가요. 미리보기로 누가 득을 보는지 확인!', demo:s=>{ demo(s); s.notice='🗳️ 투표룸 — 조옮김 베팅'; return s; }},
  {t:'🔇 뮤트권', h:'게임 중 <b>한 번</b>, 음 하나를 막아요. 가장 많이 몰린 음은 그 라운드 점수 없음.', demo:s=>{ demo(s); s.phase='reveal'; s.shift=2; s.muted=[4]; s.bet=[2,0,1,0,0,0]; s.mute=[4,null,null,null,null,null]; return s; }},
  {t:'🏆 8라운드', h:'연주된 음의 주인이 점수. 7·8라운드는 <b>+1</b>. 합계 1위 우승, 동점은 남은 코인!', demo:s=>{ demo(s); s.pts=[9,7,12,8,6,10]; s.coins=[11,14,6,17,9,12]; return s; }},
];
window.GAMES.sevennote = { _sync:x=>syncH(x), maxH:6,
  title:'세븐노트', ref:'피의 게임 「세븐노트」', emoji:'🎹', tags:['베팅','눈치','음악','NPC','두뇌서바이벌'],
  tagline:'가장 많이 건 만큼 곡이 올라간다 — 내 음이 연주되게 조를 움직이는 건반 눈치 싸움.',
  guide, guideSteps, init, apply, mask, ai, aiDelay, render, status, step:stepAll, stepDelay, noPersona:true, wide:true,
  reset(){ sig=''; bet=0; mt=null; pv=0; },
  bar:(v,i)=>`<span class="tag">${v.pts[HSEAT[i]]}점</span>`,
  result:(v,ctx)=>`${v.pts[HSEAT[ctx.me]]}점 · 🪙${v.coins[HSEAT[ctx.me]]}`,
  _decide:decide, _H:HSEAT,
};
})();
