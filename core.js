'use strict';
/* 머리싸움 공통 틀: 방(P2P), 게임 고르기, 가이드, 효과음, 이모지, 컴퓨터 상대 */
window.GAMES = window.GAMES || {};
const GAME_ORDER = ['geniusai', 'devil3ai', 'threefront', 'wall', 'marble', 'gomoku', 'reversi', 'dots', 'mancala', 'drop4', 'ttt9', 'hex', 'checkers', 'fleet', 'nim', 'parity', 'marbles', 'rps2', 'rps9', 'auction', 'chosung', 'bingo', 'liar', 'thief', 'nothanks', 'expedition', 'flowers', 'stones', 'market', 'cards5', 'pushfive', 'hilo', 'virus', 'rulerace', 'secretnum', 'zoo', 'territory', 'morris', 'hexagon', 'dicepoker', 'cops', 'unknown', 'timeauc', 'halloween', 'sniper', 'treasure', 'tripledice', 'balmancala', 'wallgo', 'doubtbet', 'pyramid', 'bigsmall', 'bagchal', 'qtruth', 'elimvote', 'kingqueen', 'firstcome', 'junglemaze', 'ascend', 'colorturn', 'numchange', 'secretdice', 'exproad', 'mysterynum', 'realtime', 'mazecode', 'daynight', 'patternblock', 'maincolor', 'realauction', 'battleasc', 'hiddenmission', 'switchpoker', 'mysterytime', 'balancematch', 'predictwin', 'brickbuild', 'formulalink', 'blindbet', 'sevennote', 'hiddencode', 'crimmemory', 'summaze', 'tri13', 'memory30', 'goodevil','goodevilai', 'blackvillage', 'artauction', 'mixmatch', 'fruitshop', 'blackwhite2', 'jury', 'betrps', 'midrace', 'swordshield', 'duoface', 'miner', 'kong', 'bell', 'triad', 'forehead', 'spy', 'baseball'];
const U = {
  esc: t => String(t).replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])),
  shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.random()*(i+1)|0; [a[i],a[j]]=[a[j],a[i]]; } return a; },
  pick: a => a[Math.random()*a.length|0],
  clone: o => JSON.parse(JSON.stringify(o)),
};
const $ = id => document.getElementById(id);
/* 조사 다듬기: 화면 글자에서 "민수이(가)" → "민수가", "3이(가)" → "3이". 앞 글자 받침을 보고 고름 (글자 마디만 바꿔서 버튼·입력칸은 그대로) */
const JOSA={'이(가)':['이','가'],'은(는)':['은','는'],'을(를)':['을','를'],'과(와)':['과','와'],'와(과)':['과','와'],'이에요(예요)':['이에요','예요']};
function hasBatchim(ch){ if(!ch) return null; const c=ch.charCodeAt(0);
  if(c>=0xAC00&&c<=0xD7A3) return (c-0xAC00)%28!==0;
  if(ch>='0'&&ch<='9') return '013678'.includes(ch);
  { const R='ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ'.indexOf(ch); if(R>=0) return [1,0,1,0,0,1,1,1,0,1][R]===1; }   /* 로마 숫자: 일·이·삼·사·오·육·칠·팔·구·십 */
  return null; }
const JOSA_RE=/(이\(가\)|은\(는\)|을\(를\)|과\(와\)|와\(과\))/g;
function fixJosa(root){
  if(!root) return; const w=document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let prev='', n;
  while((n=w.nextNode())){ const s=n.nodeValue; if(!s) continue;
    if(s.includes('(')){ const out=s.replace(JOSA_RE,(m,_,i)=>{ let k=i-1; if(k>=0&&s[k]===')'){ const o=s.lastIndexOf('(',k); if(o>0) k=o-1; } /* '민수(나)이(가)' → 괄호 앞 글자로 */ while(k>=0&&/[」』"'”’》〉]/.test(s[k])) k--; /* '「모리스」을(를)' → 따옴표 앞 글자로 */ const b=hasBatchim(k>=0?s[k]:prev); return b==null ? m : JOSA[m][b?0:1]; }); if(out!==s) n.nodeValue=out; }
    prev=n.nodeValue.slice(-1); }
}
// 앱 버전: 친구와 버전이 다르면(캐시된 예전 파일) 새로고침 안내
const APP_VER = (document.querySelector('meta[name="app-ver"]')||{}).content || '0';
let peerVer=null;
function checkVer(v){ peerVer = v==null ? '?' : String(v); const w=$('verWarn'); if(!w) return; const bad = peerVer!==APP_VER; w.hidden=!bad; if(bad) w.innerHTML=`⚠️ 친구와 사이트 버전이 달라요 (나 v${APP_VER} · 친구 v${peerVer}). 둘 다 <button class="small" onclick="location.reload()">⟳ 새로고침</button> 해주세요`; }

/* ───────── 효과음 ───────── */
let muted=false; try{ muted=localStorage.getItem('ms-mute')==='1'; }catch(_){}
let actx=null;
function sfx(kind){
  if(muted) return;
  try{ actx = actx || new (window.AudioContext||window.webkitAudioContext)(); if(actx.state==='suspended') actx.resume(); }catch(_){ return; }
  /* 테이블 소리: 잡음으로 만든 카드 넘김·칩·북소리·쿵 (2026-11-09 인터뷰: 소리·연출이 밋밋함) */
  const noise=(t0,dur,freq,q,vol,type)=>{ const n=Math.max(1,Math.floor(actx.sampleRate*dur)), b=actx.createBuffer(1,n,actx.sampleRate), d=b.getChannelData(0);
    for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2); const s=actx.createBufferSource(); s.buffer=b;
    const f=actx.createBiquadFilter(); f.type=type||'bandpass'; f.frequency.value=freq; f.Q.value=q; const g=actx.createGain(); g.gain.value=vol; s.connect(f).connect(g).connect(actx.destination); s.start(t0); };
  const now=actx.currentTime;
  if(kind==='card'){ noise(now,.09,2600,.8,.5); return; }
  if(kind==='door'){ noise(now,.32,420,4,.5); const o=actx.createOscillator(), g=actx.createGain(); o.type='sawtooth'; o.frequency.setValueAtTime(180,now); o.frequency.linearRampToValueAtTime(120,now+.3); g.gain.setValueAtTime(.05,now); g.gain.exponentialRampToValueAtTime(.001,now+.32); o.connect(g).connect(actx.destination); o.start(now); o.stop(now+.35); noise(now+.3,.08,160,1,.9,'lowpass'); return; }
  if(kind==='step'){ noise(now,.05,300,1.5,.6,'lowpass'); noise(now+.18,.05,280,1.5,.55,'lowpass'); return; }
  if(kind==='thud'){ noise(now,.12,140,1,1,'lowpass'); return; }
  if(kind==='chip'){ noise(now,.04,4200,6,.35); noise(now+.06,.04,3600,6,.3); return; }
  if(kind==='drum'){ for(let k=0;k<7;k++) noise(now+k*.07,.06,160+k*12,1.2,.55+k*.04,'lowpass'); noise(now+.52,.18,120,1,.9,'lowpass'); return; }
  if(kind==='boom'){ noise(now,.45,90,.7,1.1,'lowpass'); const o=actx.createOscillator(), g=actx.createGain(); o.type='sine'; o.frequency.setValueAtTime(120,now); o.frequency.exponentialRampToValueAtTime(40,now+.4); g.gain.setValueAtTime(.35,now); g.gain.exponentialRampToValueAtTime(.001,now+.45); o.connect(g).connect(actx.destination); o.start(now); o.stop(now+.5); return; }
  const seq = { tap:[[520,.05]], tick:[[880,.03]], turn:[[660,.07],[880,.1]], bad:[[220,.14]], win:[[523,.1],[659,.1],[784,.22]], fanfare:[[523,.09],[659,.09],[784,.09],[1047,.25]],
    host:[[587,.08],[784,.14]], lose:[[392,.14],[311,.24]], score:[[740,.06],[990,.1]], emo:[[900,.05]] }[kind] || [[500,.05]];
  let t=actx.currentTime;
  for(const [f,d] of seq){
    const o=actx.createOscillator(), g=actx.createGain();
    o.type='triangle'; o.frequency.value=f;
    g.gain.setValueAtTime(.13,t); g.gain.exponentialRampToValueAtTime(.001,t+d);
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t+d+.03); t+=d*.9;
  }
}
function updMute(){ $('btnMute').textContent = muted ? '🔇' : '🔊'; }

/* ───────── 상태 ───────── */
let mode=null;            // 'host' | 'guest' | 'solo' | 'local'
let oppAway=false;        // 친구가 다른 탭·앱으로 나갔는지
let gameId=null, S=null;  // S: 전체 상태 (방장·혼자일 때만)
let RV=null;              // 손님이 받은 내 화면 상태
let names=['',''], avas=['',''], code=null, peer=null, conn=null, connected=false, guestTok='';
/* 👥 N명 멀티 (2026-11-10): 방장 + 손님 여러 명(최대 7). 손님마다 번호(p)는 들어온 순서·토큰으로 고정 → 다시 접속해도 같은 자리.
   게임이 init(starter,{humans:n})으로 사람 자리를 n개 만들면 다 같이, 아니면 2인으로 하고 나머지는 이번 판 관전. */
let guests=[], myP=1, roomN=2, spect=false;
const MAXG=7;
const nPlayers=()=> mode==='host' ? 1+guests.filter(g=>g.c&&g.c.open).length : mode==='guest' ? roomN : 2;
/* 새 판을 시작할 때만: 나간 손님 자리는 비우고, 연결된 손님 번호를 1부터 다시 (게임 도중엔 번호 유지 → 새로고침해도 같은 자리) */
function compactGuests(){ if(mode!=='host') return; const live=guests.filter(g=>g.c&&g.c.open); const nn=[names[0]], na=[avas[0]]; live.forEach((g,k)=>{ nn.push(names[g.p]); na.push(avas[g.p]); g.p=k+1; }); guests=live; names=nn.length>1?nn:[names[0],'']; avas=na.length>1?na:[avas[0],'']; const g1=guests.find(g=>g.p===1); conn=g1?g1.c:null; guestTok=g1?g1.tok:''; }
const humansOf=x=> x&&x.hs ? x.hs.length : 2;
const isPlayer=(x,p)=> x&&Array.isArray(x.hs) ? x.hs.includes(p) : p<humansOf(x);
let tipTimer=null, rejoinTimer=null, hostTries=0, aiTimer=null, prev={};
const offline = () => mode==='solo' || mode==='local';
const isNet = () => mode==='host' || mode==='guest';
const mod = () => gameId ? GAMES[gameId] : null;
function me(){
  if(mode==='guest') return myP;
  if(mode==='local') return S && S.turn!=null ? S.turn : 0;
  return 0;
}
function view(){
  if(!gameId) return null;
  if(mode==='guest') return RV;
  if(!S) return null;
  if(mode==='local') return S;
  const m=mod(); return m.mask ? m.mask(S,0) : S;
}
const canAct = V => !!V && V.winner==null && (offline() || connected);
function myNick(){ return $('nick').value.trim().slice(0,10); }
/* 내 캐릭터 아이콘 — 게임 속 내 자리·이름 앞에 쓰임 (2026-11-09 사용자 요청). 컴퓨터 인물(🦊🐻🦉🦦🐰🐯🐺🐧)과 겹치지 않게 */
const AVAS=['🐶','🐱','🐼','🐨','🐸','🐵','🐷','🐮','🐹','🐤','🦁','🐲','🦄','🐳','🐙','🦋','🐝','🐢','🦖','🌻','🍀','⭐','🍓','🍩'];
function myAva(){ try{ const a=localStorage.getItem('ms-ava'); if(AVAS.includes(a)) return a; }catch(_){} return '🐶'; }
/* 닉네임이 비면 캐릭터 이름으로 — '나'를 이름으로 쓰면 "나(나)가"·"나 몫까지"처럼 문장이 깨짐 (2026-11-10) */
const AVA_NAME=['강아지','고양이','판다','코알라','개구리','원숭이','돼지','소','햄스터','병아리','사자','용','유니콘','고래','문어','나비','꿀벌','거북이','공룡','해바라기','네잎클로버','별','딸기','도넛'];
function myName(){ return myNick()||AVA_NAME[AVAS.indexOf(myAva())]||'플레이어'; }
/* 혼자 모드 NPC 게임: 두 번째 사람 자리도 '🤖 컴퓨터' 대신 판에 없는 동물로 */
function h1Animal(){ if(mode!=='solo'||!S||!mod()||!mod().noPersona||!window.NPCS) return null; if(S._h1&&NPCS.byId(S._h1)) return NPCS.byId(S._h1);
  const ids=NPCS.ROSTER.map(p=>p.id), used=new Set(); for(const k in S){ const v=S[k]; if(v&&typeof v==='object') for(const x of Object.values(v)) if(ids.includes(x)) used.add(x); }
  const free=ids.filter(x=>!used.has(x)); if(!free.length) return null; S._h1=free[0]; return NPCS.byId(S._h1); }
function avaOf(p){ if(mode==='solo'&&p===1&&window.Season&&Season.opp()) return Season.opp().emo; if(mode==='solo'&&p===1&&h1Animal()) return h1Animal().emo; if(mode==='solo') return p===0?myAva():'🔵'; if(mode==='local') return p===0?myAva():'🔵'; return avas[p]||(p===0?'🔴':'🔵'); }
U.ava=p=>avaOf(p);
/* 🕸️ 공용 판세 패널 (2026-11-10 사용자: "서로의 관계나 정치 상황을 게임하면서 정식 UI로")
   공개 발언(누가 누구를 지목·감쌌는지)으로 관계도를 그림 + 내 몰래 연합(나만 봄) + 요약(몰리는 사람·편 먹은 사이·앙숙)
   o: {seats, emo(i), name(i), me, alive(i), pacts:[[a,b,broken]], team(i)?, notes:[html]} */
U.CHAT_NEG=['accuse','acc','acc_only','acc_broke','acc_sus','acc_none','burn','outed','sweat','reveal','agree','recall','counter','doubt','tipped','seatBroke','angry','leak','suspect','voteC'];
U.CHAT_POS=['thanks','trust','clear','forgive','plOK','propOK','lowOK','guard','claimOK','ansOK','vindic','agreeT'];
U.politics=(list,o)=>{ o=o||{}; const S=o.seats||[], n=S.length; if(!n) return ''; const E={};
  for(const x of (list||[])){ if(x.seat==null||x.t==null||x.t===x.seat||!S.includes(x.t)) continue; const k=U.CHAT_NEG.includes(x.kind)?'n':U.CHAT_POS.includes(x.kind)?'p':null; if(!k) continue; const key=x.seat+'>'+x.t; E[key]=E[key]||{n:0,p:0}; E[key][k]++; }
  const R=78, C=100, pos={}; S.forEach((i,k)=>{ const a=-Math.PI/2+2*Math.PI*k/n; pos[i]=[C+R*Math.cos(a),C+R*Math.sin(a)]; });
  const line=(a,b,cls,w)=>{ const [x1,y1]=pos[a],[x2,y2]=pos[b], dx=x2-x1, dy=y2-y1, L=Math.hypot(dx,dy)||1, sh=15; return `<line x1="${x1+dx/L*sh}" y1="${y1+dy/L*sh}" x2="${x2-dx/L*sh}" y2="${y2-dy/L*sh}" class="${cls}" stroke-width="${w}" marker-end="url(#pm-${cls.split(' ')[0]})"/>`; };
  let g='';
  for(const [key,v] of Object.entries(E)){ const [a,b]=key.split('>').map(Number); if(v.n>v.p) g+=line(a,b,'pn',Math.min(4.5,1.2+v.n*.8)); else if(v.p) g+=line(a,b,'pp',Math.min(4.5,1.2+v.p*.8)); }
  for(const [a,b,br] of (o.pacts||[])) if(pos[a]&&pos[b]){ const [x1,y1]=pos[a],[x2,y2]=pos[b]; g+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="pk ${br?'br':''}"/>`; }
  const nodes=S.map(i=>{ const [x,y]=pos[i], dead=o.alive&&!o.alive(i); return `<g class="pnode ${i===o.me?'me':''} ${dead?'dead':''}"><circle cx="${x}" cy="${y}" r="13"/><text x="${x}" y="${y+1}">${o.emo(i)}</text></g>`; }).join('');
  /* 요약 */
  const recv={}, sum=[]; for(const [key,v] of Object.entries(E)){ const b=+key.split('>')[1]; recv[b]=(recv[b]||0)+v.n; }
  const hot=Object.entries(recv).filter(([,c])=>c>=2).sort((a,b)=>b[1]-a[1])[0]; if(hot) sum.push(`🎯 가장 많이 몰린 사람: ${o.emo(+hot[0])} <b>${o.name(+hot[0])}</b> (지목 ${hot[1]})`);
  const seenP=new Set(), seenN=new Set(); for(const [key,v] of Object.entries(E)){ const [a,b]=key.split('>').map(Number), r=E[b+'>'+a]; const pk=[a,b].sort().join('-'); if(!r) continue;
    if(v.p&&r.p&&!seenP.has(pk)){ seenP.add(pk); sum.push(`🤝 편 먹은 사이: ${o.emo(a)} ${o.name(a)} ↔ ${o.emo(b)} ${o.name(b)}`); }
    if(v.n&&r.n&&!seenN.has(pk)){ seenN.add(pk); sum.push(`⚔️ 앙숙: ${o.emo(a)} ${o.name(a)} ↔ ${o.emo(b)} ${o.name(b)}`); } }
  for(const [a,b,br] of (o.pacts||[])){ const x=a===o.me?b:a; sum.push(`${br?'💔':'🤫'} 내 몰래 연합: ${o.emo(x)} <b>${o.name(x)}</b>${br?' — 깨짐':''}`); }
  for(const t of (o.notes||[])) sum.push(t);
  return `<div class="side-box pol-box"><div class="side-h">🕸️ 판세 <small>공개 발언으로 본 관계</small></div><svg viewBox="0 0 200 200" class="pol-svg"><defs><marker id="pm-pn" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="#e2574c"/></marker><marker id="pm-pp" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="#4caf6a"/></marker></defs>${g}${nodes}</svg>
    <div class="pol-leg"><span class="ln n"></span>지목·의심 <span class="ln p"></span>감싸기·믿음 <span class="ln k"></span>내 몰래 연합</div>${sum.length?`<div class="pol-sum">${sum.map(x=>`<div>${x}</div>`).join('')}</div>`:'<div class="pol-sum"><small>아직 관계가 드러나지 않았어요</small></div>'}</div>`; };
/* 💬 공용 채팅창 (2026-11-10 사용자: "채팅창이 중요한데 너무 빨리 올라가고 과거 것도 못 보고 난잡하다")
   list: [{r, seat, text, t, kind, note}] · o: {emo(i), name(i), fill(html), me, title, neg:[kinds], pos:[kinds]}
   라운드 구분선 · 사람별 말풍선(내 말은 오른쪽) · 누구에게 한 말인지 · 위로 올려 지난 대화 보기(새 말이 와도 안 튐) */
U.chat=(list,o)=>{ o=o||{}; const NEG=o.neg||U.CHAT_NEG, POS=o.pos||U.CHAT_POS;
  let h='', lastR=null;
  for(const x of (list||[])){ if(x.r!=null&&x.r!==lastR){ lastR=x.r; h+=`<div class="chat-sep"><span>${o.roundName?o.roundName(x.r):x.r+'라운드'}</span></div>`; }
    if(x.note||x.seat==null){ h+=`<div class="chat-note">${o.fill?o.fill(U.esc(x.text)):U.esc(x.text)}</div>`; continue; }
    const mine=o.me!=null&&x.seat===o.me, k=x.kind||'';
    h+=`<div class="chat-msg ${mine?'mine':''} ${x.secret||k==='secret'?'secret':NEG.includes(k)?'neg':POS.includes(k)?'pos':''}"><span class="ca">${o.emo(x.seat)}</span><div class="cb"><div class="cn">${o.name(x.seat)}${x.t!=null&&x.t!==x.seat?` <span class="cto">→ ${o.emo(x.t)} ${o.name(x.t)}</span>`:''}</div><div class="ct">${o.fill?o.fill(U.esc(x.text)):U.esc(x.text)}</div></div></div>`; }
  return `<div class="side-box chat-box open-def"><div class="side-h">${o.title||'💬 대화'} <small>위로 올려 지난 말 보기</small></div><div class="chat-scroll" data-keep="chat">${h||'<div class="chat-empty">아직 조용해요</div>'}</div><button class="chat-new small" type="button" hidden>새 말 ↓</button></div>`; };
function nameOf(i){
  if(mode==='local') return ['주황','청록'][i];
  if(mode==='solo'&&i===1&&window.Season&&Season.opp()) return Season.opp().name;
  if(mode==='solo'&&i===1&&h1Animal()) return h1Animal().name;
  if(mode==='solo') return i===0 ? myName() : (mod()&&mod().noPersona ? '🤖 컴퓨터' : persona().name);
  /* 👥 이름이 겹치면 번호를 붙임 — 손님 둘이 다 "손님"이라 AI가 "대표가 자기 자신을 뽑았다"고 착각한 일 (2026-11-11) */
  const base=j=>names[j] || (j===0 ? '방장' : '손님'), n=Math.max(names.length, nPlayers());
  return [...Array(n).keys()].some(j=>j!==i&&base(j)===base(i)) ? base(i)+(i+1) : base(i);
}
function tip(msg){
  $('tip').textContent=msg||''; fixJosa($('tip')); clearTimeout(tipTimer);   // "늑대은(는)" → "늑대는"
  if(msg){ sfx('bad'); tipTimer=setTimeout(()=>$('tip').textContent='',2400); }
}

/* ───────── 혼자 모드 상대 캐릭터: 이름·성격·고민 시간·반응 한마디 ───────── */
const PERSONAS=[
  {name:'🦊 여우', speed:1.0, good:['후후~ 좋았어','이건 내 거예요~','딱 걸렸네요 😏'], bad:['앗… 그걸 보다니','흠~ 제법인데요?','어라라 😳'], win:['제가 이겼네요~ 한 판 더? 😎'], lose:['이번엔 봐준 거예요~ 😤'], think:['음~ 어디 보자…'], againW:['한 판 더 하면 또 제가 이길걸요? 🦊','쫄리셨어요? ㅎㅎ 다시 해요~'], againL:['복수전 해요! 이번엔 진짜예요 😤','방금 건 연습이었어요. 한 판 더!']},
  {name:'🐻 곰', speed:1.5, good:['좋아.','음.','됐다.'], bad:['…아.','잘하네.'], win:['이겼다. 한 판 더.'], lose:['졌네. 다시.'], think:['…','흠…'], againW:['…또?','한 판 더.'], againL:['다시.','…한 번 더.']},
  {name:'🦉 부엉이', speed:1.3, good:['계산대로예요.','확률상 유리해졌어요.'], bad:['예상 밖의 수네요.','다시 계산해 봐야겠어요.'], win:['논리적인 결과죠. 한 판 더 하실래요?'], lose:['흥미롭네요. 복기해 봐야겠어요.'], think:['경우의 수를 따져보는 중…'], againW:['표본이 하나뿐이에요. 한 판 더 해 볼까요?'], againL:['방금 판 복기 끝났어요. 다시 해요.','변수를 바꿔서 한 번 더 하죠.']},
  {name:'🦦 수달', speed:0.8, good:['앗싸!! 🎉','오예 됐다 😆'], bad:['으악!! 😱','안 돼애 😭','헐 대박'], win:['이겼다아!! 한 판 더 해요 🥳'], lose:['흑흑 졌어요 😭 다시 해요!'], think:['으음… 어떡하지 🤔'], againW:['또 해요 또 해요!! 🥳','한 판만 더어~'], againL:['억울해애 😭 한 판만 더!','다시다시! 이번엔 이길 거예요!']},,
  {name:'🐰 토끼', speed:0.9, solo:false, good:['후후, 계획대로 😏','이 정도는 기본이죠~','어때요, 놀랐죠? 😏'], bad:['어머, 제법인데요?','흥, 운이 좋았네요 😒'], win:['역시 제가 한 수 위네요 😏 한 판 더?'], lose:['…봐준 거예요. 진짜로 😤'], think:['어떻게 놀래 줄까~'], againW:['또 해도 결과는 같을걸요 😏'], againL:['한 판 더요. 이번엔 안 봐줘요 😏']},
  {name:'🐯 호랑이', speed:0.7, solo:false, good:['좋았어! 🔥','정면 승부다!','봤죠?! 🔥'], bad:['크윽…!','이 정도로 안 무너져요!'], win:['이겼다! 🔥 한 판 더!'], lose:['다시! 지금 당장! 😤'], think:['…간다!'], againW:['덤벼요! 또 해요! 🔥'], againL:['복수전! 지금 바로! 🔥']},
  {name:'🐺 늑대', speed:1.0, solo:false, good:['미안해요~ 😏','다 계산 안에 있었어요.','믿었어요? 😏'], bad:['흐음, 그렇게 나오시겠다?','재밌네요 😏'], win:['결국 이렇게 되네요 😏 또 해요?'], lose:['이번만이에요. 다음엔 뒤통수 조심해요 😏'], think:['…어디 보자 😏'], againW:['한 판 더? 이번에도 믿어 봐요 😏'], againL:['다시 해요. 이번엔 진짜 진심으로요 😏']},
  {name:'🐧 펭귄', speed:1.2, solo:false, good:['좋은 수였어요.','차분하게 가 볼게요.'], bad:['아, 그 수가 있었네요.','인정할게요. 잘 두셨어요.'], win:['좋은 승부였어요. 한 판 더 할까요?'], lose:['깔끔하게 졌네요. 다시 해요.'], think:['공정하게 생각해 볼게요…'], againW:['한 판 더 해요. 이번엔 서로 더 잘할 거예요.'], againL:['다시 붙어요. 이번엔 제가 정리할게요.']}
];
let personaIdx=-1, aiThinking=false, lastPulse=null, lastReactAt=0, surprisedAt=0;
const barSay=[null,null], barSayTimer=[null,null];
function showSay(p,text,ms){
  if(p>1&&isNet()){ note3(p,text); return; }
  barSay[p]={text:String(text).slice(0,40)}; clearTimeout(barSayTimer[p]);
  barSayTimer[p]=setTimeout(()=>{ barSay[p]=null; if(mode) render(); }, ms||4000);
  if(mode) render();
}
// 혼자 모드: 내가 한 말에 캐릭터가 대꾸
const REPLY=[
  [/잘했|굿|나이스|👍/, ['고마워요~ 😊','후후, 이 정도쯤이야','칭찬받으니 기분 좋네요']],
  [/실수|아차|😅/, ['ㅋㅋ 봤어요','실수도 실력이에요~','저도 가끔 그래요']],
  [/빨리|⏰|천천/, ['생각 좀 할게요~','재촉하면 더 고민돼요 😅','잠깐만요!']],
  [/한 판 더|다시|🔥/, ['좋아요! 덤벼요','이번엔 안 져요','콜!']],
  [/봐줘|살려|🙏/, ['안 봐줘요 😏','음… 생각해볼게요','봐주는 건 없어요~']],
  [/각오|이긴다|😎/, ['누가 할 소리!','말로는 누가 못 해요~','어디 한번 해봐요 😤']],
  [/안녕|잘 가|👋|ㅂㅂ/, ['다음에 또 해요 👋','잘 가요~']],
  [/흠|🤔|음/, ['뭘 그렇게 고민해요?','수상한데요…']],
];
function personaReply(text){
  if(mode!=='solo' || (mod()&&mod().noPersona)) return;
  const hit=REPLY.find(([re])=>re.test(text)); const pool=hit?hit[1]:['ㅎㅎ','그렇군요~','음?'];
  setTimeout(()=>{ if(mode==='solo'){ showSay(1, U.pick(pool)); if(Math.random()<.4) showEmo(1, U.pick(['😄','😏','🤭','😆'])); } }, 1000+Math.random()*1500);
}
function sendSay(text){
  text=String(text||'').trim().slice(0,40); if(!text||!mode) return;
  const p=me(); showSay(p,text);
  if(isNet()) send({t:'say',text});
  personaReply(text);
}
function persona(){ { const so=window.Season&&Season.opp(); if(so){ const k=PERSONAS.findIndex(p=>p&&p.name&&p.name.startsWith(so.emo)); if(k>=0) return PERSONAS[k]; } }
  if(personaIdx<0){ try{ personaIdx=+sessionStorage.getItem('ms-persona'); }catch(_){} if(!(personaIdx>=0&&personaIdx<PERSONAS.length)) newPersona(); } return PERSONAS[personaIdx]; }
function newPersona(){ personaIdx=Math.random()*PERSONAS.filter(p=>p.solo!==false).length|0; try{ sessionStorage.setItem('ms-persona',personaIdx); }catch(_){} }
function oppSays(kind, emo){
  const p=persona(), txt=U.pick(p[kind]||[]); if(!txt) return;
  showSay(1, txt, 3500);
  if(emo) showEmo(1,emo);
  if(mode) render();
}
// 판세가 컴퓨터 쪽으로 확 바뀌면 한마디 (게임이 pulse를 주면)
function oppReact(){
  if(mode!=='solo' || !S || !gameId) return;
  const m=mod(); if(!m || m.noPersona) return;
  const V1=m.mask?m.mask(S,1):S;
  if(S.winner!=null){ if(lastPulse!=='end'){ lastPulse='end'; const w0=S.winner; setTimeout(()=>{ if(mode!=='solo') return; oppSays(w0===1?'win':w0===0?'lose':'good', w0===1?'😎':w0===0?'😭':'🤝'); },700);
    // 사람처럼: 결과 화면에 그대로 있으면 몇 초 뒤 한 판 더 하자고 조름 (다시 하기·나가기 하면 안 함)
    const endS=S, kind=S.winner===1?'againW':S.winner===0?'againL':null; if(kind) setTimeout(()=>{ if(mode==='solo' && S===endS && S.winner!=null) oppSays(kind); }, 6500+Math.random()*2000); } return; }
  if(!m.pulse) return;
  const p=m.pulse(V1); if(lastPulse==null||lastPulse==='end'){ lastPulse=p; return; }
  const d=p-lastPulse, step=m.pulseStep||1; lastPulse=p;
  if(d<=-step) surprisedAt=Date.now();   // 허를 찔림 → 다음 수를 더 오래 고민 (scheduleAI)
  if(Date.now()-lastReactAt<6000 || Math.random()<.35) return;
  if(d>=step){ lastReactAt=Date.now(); oppSays('good', U.pick(['😏','😎','🔥'])); }
  else if(d<=-step){ lastReactAt=Date.now(); oppSays('bad', U.pick(['😱','😳','🤔'])); }
}

/* ───────── 행동 ───────── */
function act(a){
  const m=mod(); if(!m) return;
  if(mode==='guest'){ if(!connected){ tip('연결 중이에요'); return; } send({t:'act',a}); sfx('tap'); return; }
  const p = mode==='local' ? me() : 0;
  const e = m.apply(S,p,a);
  if(e){ tip(e); return; }
  sfx('tap'); changed();
}
let tally={total:[0,0], game:{}};
function countTally(){
  if(mode==='guest' || !S || S.winner==null || S._tallied || !gameId) return;
  S._tallied=true;
  const w=S.winner, g=tally.game[gameId]=tally.game[gameId]||[0,0];
  const add=i=>{ tally.total[i]=(tally.total[i]||0)+1; g[i]=(g[i]||0)+1; };
  if(Array.isArray(S.winners)&&humansOf(S)>2) S.winners.forEach(add);   /* 👥 3명 이상: 이긴 사람 모두 */
  else if(w===0||w===1) add(w); else if(w==='both'){ add(0); add(1); }
}
function tallyHTML(){
  const t=tally.total; if(!mode || t.reduce((x,y)=>x+(y||0),0)===0) return '';
  if(mode!=='local'&&(t.length>2||nPlayers()>2)){ const n=Math.max(t.length,nPlayers()), g=gameId&&tally.game[gameId]; return `🏆 오늘 이긴 횟수 <b>${[...Array(n).keys()].map(p=>`${p===me()?'나':U.esc(nameOf(p)||'?')} ${t[p]||0}`).join(' · ')}</b>${g&&g.some(Boolean)?` <small>(이 게임 ${[...Array(n).keys()].map(p=>g[p]||0).join(':')})</small>`:''}`; }
  const a=mode==='local'?0:me(), b=1-a, g=gameId&&tally.game[gameId];
  const nm=i=> mode==='local' ? ['주황','청록'][i] : i===me() ? '나' : nameOf(i);
  return `🏆 오늘 <b>${U.esc(nm(a))} ${t[a]} : ${t[b]} ${U.esc(nm(b))}</b>${g&&g[0]+g[1]?` <small>(이 게임 ${g[a]}:${g[b]})</small>`:''}`;
}
/* 컴퓨터 실력 (혼자 모드): 0 쉬움 / 1 보통 / 2 어려움 — 이 브라우저에 저장 */
const LEVELS=['😊 쉬움','🙂 보통','😈 어려움'];
function aiLevel(){ try{ const v=+localStorage.getItem('ms-level'); return v>=0&&v<=2 ? v : 1; }catch(_){ return 1; } }
function setLevel(v){ try{ localStorage.setItem('ms-level',v); }catch(_){} renderLevel(); }
function renderLevel(){ const b=$('levelBox'); if(!b) return; b.hidden=!offline(); const L=aiLevel(); b.innerHTML='컴퓨터 실력 '+LEVELS.map((x,i)=>`<button class="chip2 ${i===L?'on':''}" data-lv="${i}">${x}</button>`).join(''); }
function changed(){ countTally(); if(mode==='host') sendRoom(); persist(); oppReact(); render(); scheduleAI(); scheduleStep(); }
/* 시간차 진행: 게임이 step을 주면 방장(또는 혼자)이 정해진 박자로 다음 장면을 진행 */
let stepTimer=null;
/* 진행 속도 (2026-11-09 인터뷰: "텍스트만 띡띡 지나가서 놓침") — 사건 카드가 읽힐 만큼 머문 뒤에 다음 장면.
   실시간 게임(마감 시각으로 진행)은 박자를 건드리지 않음 */
const RT_GAMES=new Set(['artauction','balancematch','bell','brickbuild','crimmemory','firstcome','formulalink','hiddencode','hiddenmission','mazecode','memory30','mixmatch','patternblock','pyramid','realauction','realtime','summaze']);
function speedMul(){ try{ return localStorage.getItem('ms-speed')==='slow'?1.6:1; }catch(_){ return 1; } }
function holdLeft(){ return RT_GAMES.has(gameId) ? 0 : Math.max(0, stageHold-(Date.now()-stageAt)); }
/* 가이드를 보는 동안엔 (혼자·한 화면) 판을 멈춤 — 가이드 뒤에서 게임이 먼저 시작되지 않게 (2026-11-09 사용자 QA) */
let guideHeld=false;
function guidePause(){ const d=$('guide'); const p=!!(d&&d.open) && offline(); if(p) guideHeld=true; else if(guideHeld){ guideHeld=false; stageAt=Date.now(); } return p; }
function scheduleStep(){
  clearTimeout(stepTimer); stepTimer=null;
  if(mode==='guest' || !mode || !S || !gameId) return;
  if(guidePause()){ stepTimer=setTimeout(()=>{ stepTimer=null; scheduleStep(); scheduleAI(); },400); return; }   // 가이드가 닫히면 그때부터
  if(window.AIB&&AIB.hold()){ stepTimer=setTimeout(()=>{ stepTimer=null; scheduleStep(); },300); return; }   // 🤖 AI 대사를 기다리는 중엔 다음 진행을 미룸 (ai.js)
  const m=mod(); if(!m || !m.step || S.winner!=null) return;
  let d=m.stepDelay(S); if(d==null) return;
  if(!RT_GAMES.has(gameId)) d=Math.max(d*speedMul(), holdLeft());
  stepTimer=setTimeout(()=>{ stepTimer=null; if(mod()!==m || !S || mode==='guest') return; if(guidePause()){ scheduleStep(); return; } m.step(S); changed(); }, d);
}
function startGame(id, newMode){
  if(newMode) mode=newMode;
  gameId=id; compactGuests(); if(GAMES[id].reset) GAMES[id].reset(); S=GAMES[id].init(0, mode==='host'&&nPlayers()>2?{humans:Math.min(nPlayers(),GAMES[id].maxH||2)}:undefined); lastPulse=null; markRecent(id); changed();
}
function rematch(){
  if(mode==='guest'){ send({t:'rematch'}); return; }
  if(S){ compactGuests(); const m=mod(); if(m.reset) m.reset(); S=m.init(1-S.starter, mode==='host'&&nPlayers()>2?{humans:Math.min(nPlayers(),m.maxH||2)}:undefined); }   // reset: 컴퓨터가 지난 판 기억을 정리하는 곳 (도둑잡기·짝홀)
  lastPulse=null;
  changed();
}
function toMenu(){
  const V=view();
  if(V && V.winner==null && !confirm('지금 게임을 그만두고 목록으로 갈까요?')) return;
  if(mode==='guest'){ send({t:'menu'}); return; }
  gameId=null; S=null; changed();
}

/* 컴퓨터 상대 (혼자 연습) — 컴퓨터는 1번, 자기에게 보이는 정보만 씀 */
function scheduleAI(){
  if(aiTimer) return;   // 이미 생각 중이면 그대로 (발동할 때 그 순간 상태로 판단)
  if(mode!=='solo' || !S || S.winner!=null || guidePause()) return;
  const m=mod(); if(!m || !m.ai) return;
  if(S.turn!=null && S.turn!==1) return;
  let delay = m.aiDelay ? m.aiDelay(S) : (700+Math.random()*1500)*persona().speed;
  // 사람처럼: 방금 허를 찔렸으면 한참 고민 (반응 속도 게임처럼 aiDelay가 따로 있는 게임은 제외)
  if(!m.aiDelay && S.turn===1 && Date.now()-surprisedAt<5000){ surprisedAt=0; delay+=1200+Math.random()*1800; setTimeout(()=>{ if(aiThinking && Math.random()<.6) oppSays('think'); },700); }
  if(!m.aiDelay && Math.random()<.12){ delay+=1800+Math.random()*2000; setTimeout(()=>{ if(aiThinking) oppSays('think'); },900); }   // 가끔 오래 고민
  delay=Math.max(delay, holdLeft());   // 방금 일어난 일을 읽을 시간은 주고 나서
  aiThinking = S.turn===1; if(aiThinking) render();
  aiTimer=setTimeout(()=>{
    aiTimer=null; aiThinking=false;
    if(mode!=='solo' || !S || S.winner!=null || mod()!==m) return;
    if(guidePause()){ scheduleStep(); return; }   // 가이드 보는 중: 닫히면 다시
    if(S.turn!=null && S.turn!==1){ scheduleAI(); return; }   // 생각하는 사이 다시 하기 등으로 차례가 바뀜
    const a = m.ai(m.mask ? m.mask(S,1) : S, aiLevel());
    if(a){ const e=m.apply(S,1,a); if(e) console.warn('AI', e, a); }
    if(a) changed(); else scheduleAI();
  }, delay);
}

/* ───────── 그리기 ───────── */
function render(){
  { const sv=!mode&&window.Season&&Season.isOpen(); $('season').hidden=!sv; if(sv){ $('home').hidden=true; $('room').hidden=true; document.body.classList.remove('wide'); Season.draw($('season')); return; } }
  $('home').hidden = !!mode; $('room').hidden = !mode;
  { const gm=mode&&gameId&&GAMES[gameId]; document.body.classList.toggle('wide', !!(gm&&gm.wide)); }   // 넓은 화면: 기록·채팅을 좌우로
  if(!mode){ renderHomeCards(); return; }
  const inSeason=mode==='solo'&&window.Season&&Season.active();   // 🏆 시즌 경기 중엔 1:1 연습용 표시(혼자 연습·오늘 전적·'상대' 바)를 숨김
  $('roomLabel').textContent = isNet() ? '방 코드' : (mode==='solo' ? (inSeason ? '🏆 시즌 경기' : '혼자 연습') : '한 화면 둘이');
  $('roomCode').textContent = isNet() ? code : '';
  { const tl=$('tally'); if(tl){ const h=(inSeason||(mode==='solo'&&mod()&&mod().table))?'':tallyHTML(); tl.innerHTML=h; tl.hidden=!h; } }
  $('btnCopy').hidden = !isNet(); $('net').hidden = !isNet();
  if(!gameId || !GAMES[gameId]){ renderMenu(); return; }
  $('menu').hidden=true; $('play').hidden=false;
  const m=mod(), V=view();
  let area=$('area');
  if(area.dataset.game!==gameId){
    const n=area.cloneNode(false); n.dataset.game=gameId; area.replaceWith(n); area=n;
    if(m.reset) m.reset();
    prev={}; stageHtml=''; stageHold=0;
    n.addEventListener('click',e=>{ const h=e.target.closest('.side-h'); if(!h) return; const b=h.closest('.side-box'); if(!b) return; const k=sideKey(b); sideOpen[k]=b.classList.contains('fold'); b.classList.toggle('fold'); });
    maybeGuide(gameId);
  }
  $('gTitle').innerHTML=`${m.emoji} ${U.esc(m.title)}${m.ref?` <small class="ref">${U.esc(m.ref)}</small>`:''}`;
  if(!V){ area.innerHTML= mode==='guest'&&spect ? '<div class="vr-card" style="text-align:center"><b>👀 이번 판은 관전 중이에요</b><p>이 게임은 지금 인원을 다 못 받아요. 다음 판(👥 표시가 있는 게임)부터 같이 해요!</p></div>' : '<p class="muted" style="text-align:center">불러오는 중…</p>'; return; }
  if(m._sync) m._sync(V);   /* 👥 게임의 사람 자리(HSEAT)를 이 화면 상태에 맞춤 — 위쪽 바·상태 줄이 게임 render보다 먼저 불림 */
  const ctx=makeCtx(V);
  renderBars(V,ctx);
  /* 💬 자동 채팅 기록: 자기 채팅창이 없는 NPC 게임은 s.say(최근 한마디)가 바뀔 때마다 모아 둠 */
  if(S&&m.noPersona&&!Array.isArray(S.feed)&&S.say&&!S.say.text&&S.sayN!=null&&S.sayN!==S._feedN){ const prev=S._feedN||0; Object.entries(S.say).filter(([k,x])=>x&&x.t&&x.n>prev).sort((a,b)=>a[1].n-b[1].n).forEach(([k,x])=>(S._feed=S._feed||[]).push({r:S.round??S.ep??null,seat:+k,text:String(x.t)})); S._feedN=S.sayN; }
  if(S&&m.noPersona&&!Array.isArray(S.feed)&&S.say&&S.say.text&&S.say.n!==S._feedN){ S._feedN=S.say.n; (S._feed=S._feed||[]).push({r:S.round??S.ep??null, seat:S.say.seat, text:String(S.say.text)}); if(S._feed.length>200) S._feed.shift(); }
  const keep={}; area.querySelectorAll('[data-keep]').forEach(e=>{ keep[e.dataset.keep]={top:e.scrollTop, atEnd:e.scrollHeight-e.scrollTop-e.clientHeight<40, n:e.childElementCount}; });
  m.render(area,V,ctx);
  if(m.noPersona&&S&&S._feed&&!area.querySelector('.chat-box')){ const sr=area.querySelector('.side-r'); if(sr){ const W=S.who||S.cast||{}; const info=i=>{ const id=W[i]; const p=id&&window.NPCS&&NPCS.byId(id); if(p) return [p.emo,p.name]; const pp=i===0?0:1; return [avaOf(pp),nameOf(pp)+(pp===me()&&mode!=='local'?'(나)':'')]; };
      const fillS=t=>String(t).replace(/{s(d+)}/g,(_,d)=>{ const x=info(+d); return x[0]+' '+U.esc(x[1]); });
      sr.insertAdjacentHTML('afterbegin',U.chat(S._feed,{emo:i=>info(i)[0],name:i=>U.esc(info(i)[1]),fill:fillS,me:me()===0?0:-1}));
      const s3=area.querySelector('.side3'); if(s3) s3.classList.add('has-chat'); } }
  area.querySelectorAll('[data-keep]').forEach(e=>{ const k=keep[e.dataset.keep], btn=e.parentNode.querySelector('.chat-new');
    if(!k||k.atEnd){ e.scrollTop=e.scrollHeight; } else { e.scrollTop=k.top; if(btn&&e.childElementCount>k.n) btn.hidden=false; }
    e.onscroll=()=>{ if(btn&&e.scrollHeight-e.scrollTop-e.clientHeight<40) btn.hidden=true; };
    if(btn) btn.onclick=ev=>{ ev.stopPropagation(); e.scrollTop=e.scrollHeight; btn.hidden=true; }; });
  updateStage(area);
  foldSides(area);
  renderStatus(V,ctx);
  $('btnRematch').hidden = !(V.winner!=null && (offline()||connected));
  if(window.Season) Season.afterRender(V);
  fixJosa($('play'));
  notify(V);
}
function makeCtx(V){
  const my=me(), can=canAct(V);
  return {
    me:my, flip:mode==='guest', can, mode, act, tip, sfx, name:nameOf,
    myTurn: can && V.turn===my,
    turnText: v => mode==='local' ? `${nameOf(v.turn)} 차례` : v.turn===my ? '내 차례' : `${nameOf(v.turn)} 차례…`,
    rerender: render,
  };
}
function renderBars(V,ctx){
  const m=mod(), bot = mode==='local' ? 0 : me(), top=1-bot;
  /* 🏆 시즌 메인 매치(여럿이 하는 판)엔 '상대' 한 명이 없음 — 위쪽 바를 숨김 (데스매치·결승은 1:1이라 그대로) */
  $('barTop').hidden = mode==='solo'&&(!!(m&&m.table)||(!!window.Season&&Season.kind()==='main'));   // table: 여럿이 둘러앉는 판(선과 악 · AI판)
  /* 👥 사람 3명 이상: 위쪽 바에 나 말고 모든 사람을 칩으로 (전엔 '상대' 한 명만, 손님 번호 2부터는 1-나 = -1) */
  const H=(V&&V.hs)?V.hs.length:2;
  if(H>2&&mode!=='local'){ const el=$('barTop'); el.dataset.p=''; el.style.color=''; el.className='pbar multi';
    el.innerHTML=[...Array(H).keys()].filter(p=>p!==bot).map(p=>{ const say=barSay[p]?`<span class="barsay" title="${U.esc(barSay[p].text)}">💬 ${U.esc(barSay[p].text)}</span>`:''; return `<span class="pchip ${V.winner==null&&V.turn===p?'turn':''}" data-p="${p}">${avaOf(p)} <b>${U.esc(nameOf(p))}</b>${say}<span class="ex">${safeBar(m,V,p,ctx)}</span></span>`; }).join('');
    renderOneBar($('barBot'),bot,V,ctx,m); return; }
  for(const [el,i] of [[$('barTop'),top],[$('barBot'),bot]]) renderOneBar(el,i,V,ctx,m);
}
function safeBar(m,V,p,ctx){ try{ return m.bar?m.bar(V,p,ctx):''; }catch(_){ return ''; } }
function renderOneBar(el,i,V,ctx,m){ {
    const tag = mode==='local' ? '' : (i===me() ? '나' : '상대');
    el.dataset.p=i;
    el.style.color = i===0 ? '#e2574c' : '#2a8c9b';
    el.className = 'pbar' + (V.winner==null && V.turn===i ? ' turn' : '');
    const solo1 = mode==='solo' && i===1;
    const lvTag = solo1 && m.ai ? ` <span class="tag">${LEVELS[aiLevel()]}</span>` : '';
    const net1 = isNet() && i!==me();
    const think = (solo1 && aiThinking && V.winner==null) || (net1 && connected && !oppAway && V.winner==null && V.turn===i) ? '<span class="thinking">💭 생각 중…</span>' : '';
    const away = net1 && (oppAway || !connected) ? `<span class="thinking">${connected?'💤 자리 비움':'📡 연결 끊김'}</span>` : '';
    const say = barSay[i] ? `<span class="barsay" title="${U.esc(barSay[i].text)}">💬 ${U.esc(barSay[i].text)}</span>` : '';
    el.innerHTML = `<span class="dot" style="background:var(--p${i})"></span><span class="name">${(mode==="solo"&&i===1&&!(window.Season&&Season.opp()))?"":avaOf(i)+" "}${U.esc(nameOf(i))}</span><span class="tag">${tag}</span>${lvTag}${say||away||think}<span class="ex">${safeBar(m,V,i,ctx)}</span>`;
  }
}
function renderStatus(V,ctx){
  const st=$('status'), m=mod(); st.className='';
  if(V.winner!=null){
    st.className='win';
    const w=V.winner;
    let t = w==='draw' ? '무승부!' : w==='both' ? '둘 다 승리! 🎉 (같은 편이었어요)' : w==='none' ? '둘 다 패배… (같은 편이었어요)'
          : mode==='local' ? `${nameOf(w)} 승리!` : (w===me() ? '이겼어요! 🎉' : '졌어요…');
    /* 👥 3명 이상: 이긴 사람 목록으로 ("둘 다" 문구 대신) */
    if(humansOf(V)>2&&Array.isArray(V.winners)&&mode!=='local'){ const W=V.winners, others=W.filter(p=>p!==me()).map(p=>nameOf(p)).join(', ');
      t = w==='draw' ? '무승부!' : W.includes(me()) ? (W.length>1?`이겼어요! 🎉 (함께: ${others})`:'이겼어요! 🎉 혼자 1등') : W.length ? `졌어요… 이긴 사람: ${others}` : '사람은 아무도 못 이겼어요 — 동물 승리 🐾'; }
    if(m.result){ const r=m.result(V,ctx); if(r) t+=' · '+r; }
    st.textContent=t; setTodo('',false); return;
  }
  if(isNet() && !connected){ st.textContent = mode==='host' ? '친구 연결이 끊겼어요. 다시 들어오길 기다리는 중…' : '방장과 다시 연결하는 중…'; setTodo('',false); return; }
  const t=m.status(V,ctx)||''; st.textContent = t;
  const mine = !!t && (ctx.myTurn || (V.turn==null && /세요|고르|골라|내 차례|눌러|정하/.test(t))) && !/기다|상대 차례|중…$/.test(t);
  setTodo(t, mine); setCoach(V,ctx);
}
/* 첫 판 코치: 게임이 coach(v,ctx)를 주면 처음 두 판 동안 '지금 할 일' 아래에 "왜 그렇게 하는지" 한 줄 */
function playsOf(id){ try{ return +localStorage.getItem('ms-plays-'+id)||0; }catch(_){ return 0; } }
function coachOff(){ try{ return localStorage.getItem('ms-coach-off')==='1'; }catch(_){ return false; } }
function setCoach(V,ctx){ const el=$('coach'); if(!el) return; const m=mod();
  const t = m&&m.coach && V.winner==null && !coachOff() && playsOf(gameId)<2 ? m.coach(V,ctx) : '';
  el.hidden=!t; if(t) el.innerHTML=`<span>🎓 ${t}</span><button class="ghost small" data-coachoff>코치 끄기</button>`; }
/* '지금 할 일' 큰 안내줄 — 내가 할 일이면 크게·반짝, 아니면 누가 무엇을 하는 중인지 작게 */
function setTodo(t,mine){ const el=$('todo'); if(!el) return; const show=!!t&&!/^진행 중/.test(t);
  el.hidden=!show; el.className=mine?'mine':''; el.textContent=show?(mine?'👉 '+t:'⏳ '+t):''; document.body.classList.toggle('my-act', !!mine); }
/* ───────── 사건 무대: 게임의 진행자 알림(.hl-notice)을 판 위 고정 칸의 큰 카드로, 종류별 소리·움직임 ───────── */
let stageHtml='', stageAt=0, stageHold=0;
const STAGE_BIG=/💀|💥|탈락|쓰러|독박|실패|역전|들통|들켰|파산/;
function stageKind(t){ return STAGE_BIG.test(t)?'boom' : /🏁|🏆|승리|우승|최종/.test(t)?'fanfare' : /🔓|공개|🥁|두구|셋, 둘/.test(t)?'drum' : /💰|🪙|칩|베팅|레이즈|콜|판돈|입찰|낙찰/.test(t)?'chip' : /🃏|🎴|카드|뽑/.test(t)?'card' : /🎙️/.test(t)?'host' : 'tick'; }
function updateStage(area){
  const box=$('stage'); if(!box) return; const n=area.querySelector('.hl-notice');
  if(!n){ box.hidden=true; document.body.classList.remove('has-stage'); return; }
  box.hidden=false; document.body.classList.add('has-stage');
  const html=n.innerHTML.trim(), text=n.textContent.trim(); n.remove();
  const card=$('stageCard'); if(html===stageHtml&&card.innerHTML) return;
  const first=!stageHtml; stageHtml=html; const kind=stageKind(text);
  card.innerHTML=html||'　'; card.className='stage-card k-'+kind; void card.offsetWidth; card.classList.add('in');
  stageAt=Date.now(); stageHold=Math.min(3000,700+text.length*30)*speedMul();
  if(!first&&text) sfx(kind);
}
/* 보조 정보 접기 — 넓은 화면(좌우 칸)에선 펼친 채, 폰에선 접어 두고 제목을 누르면 펼침 */
const sideOpen={};
function sideKey(b){ const h=b.querySelector('.side-h'); return gameId+':'+(h?h.textContent.replace(/[0-9]/g,'').slice(0,10):''); }
function foldSides(area){ const wideOn=document.body.classList.contains('wide')&&innerWidth>=1100;
  area.querySelectorAll('.side-box').forEach(b=>{ if(!b.querySelector('.side-h')) return; const k=sideKey(b); const open=k in sideOpen?sideOpen[k]:(wideOn||b.classList.contains('open-def')); b.classList.toggle('fold',!open); }); }
function notify(V){
  if(prev.game!==gameId){ prev={game:gameId, turn:V.turn, winner:V.winner}; return; }
  if(V.winner!=null && prev.winner==null){
    recordResult(gameId, V.winner); try{ localStorage.setItem('ms-plays-'+gameId, playsOf(gameId)+1); }catch(_){}
    sfx(V.winner==='draw' ? 'turn' : (mode==='local' || (Array.isArray(V.winners)?V.winners.includes(me()):(V.winner===me() || V.winner==='both'))) ? 'win' : 'lose');
  } else if(mode!=='local' && V.turn===me() && prev.turn!==me() && V.winner==null){
    sfx('turn');
    if(document.hidden) document.title='● 내 차례 · 보드게임 놀이터';
  }
  prev.turn=V.turn; prev.winner=V.winner;
}
document.addEventListener('visibilitychange',()=>{ if(!document.hidden) document.title='보드게임 놀이터'; if(isNet()) send({t:'away', away:document.hidden}); });

/* 🆕 새로 생김: 전에 와 본 브라우저에서 아직 한 번도 안 열어 본 게임 (처음 온 사람에겐 표시 안 함) */
const NEWTAG='새로 생김';
function returning(){ try{ for(let i=0;i<localStorage.length;i++) if(localStorage.key(i).startsWith('ms-seen-')) return true; }catch(_){} return false; }
function isNewG(id){ try{ return returning() && localStorage.getItem('ms-seen-'+id)!=='1'; }catch(_){ return false; } }
/* ───────── 게임 분류 (선반) ───────── */
const CATS=[
  {k:'brain', n:'🧠 두뇌 전략', d:'판 위에서 겨루는 수 싸움', ids:['midrace','blackvillage','formulalink','wallgo','colorturn','junglemaze','bagchal','morris','wall','marble','gomoku','reversi','dots','mancala','drop4','ttt9','hex','checkers','nim','cards5','pushfive']},
  {k:'card',  n:'🃏 카드 게임', d:'손패를 숨기고 겨루는 카드', ids:['threefront','duoface','predictwin','switchpoker','expedition','stones','market','flowers','nothanks','thief']},
  {k:'psy',   n:'🎭 심리전·블러핑', d:'눈치·뻥·버릇 읽기', ids:['geniusai','devil3ai','kong','miner','swordshield','betrps','jury','blackwhite2','fruitshop','artauction','goodevil','goodevilai','tri13','blindbet','sevennote','virus','realauction','maincolor','daynight','realtime','secretdice','numchange','kingqueen','elimvote','bigsmall','rulerace','secretnum','zoo','territory','cops','unknown','timeauc','halloween','treasure','balmancala','hilo','parity','marbles','rps2','rps9','auction','forehead','liar']},
  {k:'quiz', n:'🔎 추리·퀴즈', d:'숨은 걸 찾고 맞히기', ids:['mixmatch','memory30','summaze','crimmemory','hiddencode','brickbuild','mysterytime','hexagon','hiddenmission','battleasc','patternblock','mazecode','mysterynum','exproad','ascend','firstcome','qtruth','pyramid','fleet','triad','baseball','chosung','bingo']},
  {k:'party', n:'🎉 파티·스피드', d:'시끌벅적 반응·마피아', ids:['balancematch','bell','spy']},
];
function catOf(id){ const c=CATS.find(c=>c.ids.includes(id)); if(c) return c.k; const tg=(GAMES[id]&&GAMES[id].tags)||[];
  return tg.includes('카드')?'card' : tg.includes('심리전')?'psy' : (tg.includes('추리')||tg.includes('퀴즈'))?'quiz' : tg.includes('스피드')?'party' : 'brain'; }
const catName=k=> (CATS.find(c=>c.k===k)||{}).n || '';
function miniRec(id){ const rec=LS.get('ms-rec',{}), a=rec[id+':ai'], p=rec[id+':pvp'], w=(a?a.w:0)+(p?p.w:0), l=(a?a.l:0)+(p?p.l:0); return (a||p) ? `<span class="t-rec">${w}승 ${l}패</span>` : ''; }
function pcount(g){ const mh=g.maxH||2; return mh>2?{t:`👥 1~${mh}명`,d:`사람 1~${mh}명이 같이 (빈자리는 동물이 채워요)`}:g.ai||g.table?{t:'👥 1~2명',d:'둘이서 · 혼자면 컴퓨터와'}:{t:'👥 2명',d:'둘이서'}; }
function tileHTML(id){
  const g=GAMES[id], nw=isNewG(id);
  return `<button class="tile c-${catOf(id)} ${nw?'isnew':''}" data-open="${id}">
    <span class="t-emo">${g.emoji}</span>
    <span class="t-tx"><b>${g.title}</b><small>${g.tagline}</small></span>
    <span class="t-meta">${nw?'<span class="newb">NEW</span>':''}<span class="t-chip pc ${(g.maxH||2)>2?'mh':''}" title="${pcount(g).d}">${pcount(g).t}</span>${g.local?'<span class="t-chip" title="한 화면 둘이 가능">👥</span>':''}${miniRec(id)}</span>
  </button>`;
}
// 타일을 누르면 뜨는 상세 창 (홈: 바로 혼자 하기 / 방 안: 시작)
let sheetId=null;
function openSheet(id){
  const g=GAMES[id]; if(!g) return; sheetId=id;
  const inRoom=!!mode, tags=(g.tags||[]).map(tg=>`<span class="gtag" data-tag="${tg}">#${tg}</span>`).join('');
  let btns='';
  if(inRoom){
    if(!offline() || g.ai || g.table) btns += `<button data-play="${id}">${!offline() ? '▶ 이 게임 시작' : g.table ? '🤖 동물들과 하기' : '🤖 컴퓨터와 하기'}</button>`;   // table: 동물이 스스로 움직이는 판
    if(offline() && g.local) btns += `<button class="ghost" data-local="${id}">👥 한 화면 둘이</button>`;
  } else {
    if(g.ai || g.table) btns += `<button data-quick="${id}">${g.table ? '🤖 동물들과 바로 하기' : '🤖 컴퓨터와 바로 하기'}</button>`;
    if(g.watch) btns += `<button class="ghost" data-watch="${id}">🍿 동물들끼리 (관전)</button>`;   // 사람 없이 동물끼리 — 구경
    if(g.local) btns += `<button class="ghost" data-qlocal="${id}">👥 한 화면 둘이</button>`;
    btns += `<p class="sh-hint">친구랑 하려면 위에서 <b>방 만들기</b> → 이 게임 고르기</p>`;
  }
  btns += `<button class="ghost" data-guide="${id}">📖 규칙 보기</button>`;
  $('sheetBody').innerHTML = `<div class="sh-top c-${catOf(id)}"><span class="sh-emo">${g.emoji}</span><div><small>${catName(catOf(id))}</small><h3>${g.title}</h3>${g.ref?`<span class="ref">${g.ref}</span>`:''}</div></div>
    <p class="sh-desc">${g.tagline}</p><p class="sh-pc">${pcount(g).t} <small>${pcount(g).d}${g.local?' · 한 화면 둘이도 돼요':''}</small></p>${tags?`<div class="gtags">${tags}</div>`:''}${recordHTML(id)}<div class="sh-btns">${btns}</div>`;
  const d=$('gsheet'); if(!d.open) d.showModal();
}
function closeSheet(){ const d=$('gsheet'); if(d&&d.open) d.close(); }

/* ───────── 검색: 이름·원작·설명·분류, 초성(ㄱㄴㄷ)도 됨 ───────── */
const CHO='ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const chosung=s=>[...s].map(c=>{ const k=c.charCodeAt(0)-0xAC00; return k>=0&&k<11172 ? CHO[Math.floor(k/588)] : c; }).join('');
function gameMatches(id,q){
  q=(q||'').trim().toLowerCase().replace(/^#/,''); if(!q) return true;
  if(q===NEWTAG) return isNewG(id);
  const g=GAMES[id], text=[g.title,g.alias||'',g.ref||'',g.tagline,(g.tags||[]).join(' ')].join(' ').toLowerCase();
  if(text.includes(q)) return true;
  if(/^[ㄱ-ㅎ]+$/.test(q)) return chosung(text.replace(/\s/g,'')).includes(q);
  return q.split(/\s+/).every(w=>text.includes(w));
}
/* ───────── 전적·최근 한 게임 (이 브라우저에만 저장) ───────── */
const LS={ get(k,d){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(_){ return d; } }, set(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(_){} } };
function markRecent(id){ if(!id) return; const r=LS.get('ms-recent',[]).filter(x=>x!==id); r.unshift(id); LS.set('ms-recent',r.slice(0,4)); }
function recordResult(id,w){
  if(mode==='local' || !id) return;
  const rec=LS.get('ms-rec',{}), k=id+(mode==='solo'?':ai':':pvp'), r=rec[k]||{w:0,l:0,d:0};
  if(w==='draw') r.d++; else if(w===me()||w==='both') r.w++; else r.l++;
  rec[k]=r; LS.set('ms-rec',rec);
}
function recordHTML(id){
  const rec=LS.get('ms-rec',{}), a=rec[id+':ai'], p=rec[id+':pvp'];
  const f=(r,lab)=>r?`<span>${lab} ${r.w}승 ${r.l}패${r.d?` ${r.d}무`:''}</span>`:'';
  const s=f(p,'👥 친구와')+f(a,'🤖 혼자');
  return s?`<div class="grec">${s}</div>`:'';
}
function allTags(){ const m=new Map(); for(const id of GAME_ORDER) for(const tg of (GAMES[id]&&GAMES[id].tags)||[]) m.set(tg,(m.get(tg)||0)+1); const out=[...m].sort((a,b)=>b[1]-a[1]).map(x=>x[0]); if(GAME_ORDER.some(id=>GAMES[id]&&isNewG(id))) out.unshift(NEWTAG); return out; }
const catSel={homeCards:'', menuCards:''}; let grpShown=false;
/* ───────── 피의 게임 · 데블스 플랜 카테고리 (shows.js 목록) ───────── */
const SHOW_KEYS=['devil','blood','genius'];
const TYPE_LABEL={devil:{메인:'메인 매치',데스:'감옥 매치',결승:'결승'}, blood:{메인:'메인 게임',데스:'데스매치',결승:'파이널'}, genius:{메인:'메인 매치',데스:'데스매치',결승:'결승'}};
function showStats(k){ const L=(window.SHOWS&&SHOWS[k]&&SHOWS[k].list)||[]; const done=L.filter(e=>e[4]&&GAMES[e[4]]).length; return {L,done}; }
function showTile(k,e,pred){
  const [season,day,type,name,id]=e, lab=`${day} · ${(TYPE_LABEL[k]||{})[type]||type}`;
  if(id && GAMES[id] && (!pred||pred(id))){ const g=GAMES[id];
    return `<button class="tile show c-${type==='데스'?'death':type==='결승'?'final':'main'}" data-open="${id}"><span class="t-emo">${g.emoji}</span><span class="t-tx"><b>${name}</b><small>${lab}${g.title!==name?` · ▶ ${g.title}`:''}</small></span><span class="t-meta"><span class="t-ok">플레이</span><span class="t-chip pc ${(g.maxH||2)>2?'mh':''}" title="${pcount(g).d}">${pcount(g).t}</span>${miniRec(id)}</span></button>`; }
  return `<div class="tile show soon c-${type==='데스'?'death':type==='결승'?'final':'main'}" title="준비 중 — 밤샘 루프가 차례로 만들고 있어요"><span class="t-emo">🔒</span><span class="t-tx"><b>${name}</b><small>${lab}</small></span><span class="t-meta"><span class="t-soon">준비 중</span></span></div>`;
}
function showFull(k,pred){   // 시즌별 전체 목록
  const S=SHOWS[k]; let h=`<p class="show-sub">${S.sub}</p>`;
  const seasons=[...new Set(S.list.map(e=>e[0]))];
  for(const se of seasons){ const L=S.list.filter(e=>e[0]===se), d=L.filter(e=>e[4]&&GAMES[e[4]]).length;
    h+=`<section class="shelf"><h3>${S.name.split(' ')[0]} ${se} <small>완성 ${d} / ${L.length}</small></h3><div class="tiles">${L.map(e=>showTile(k,e,pred)).join('')}</div></section>`; }
  return h;
}
function showCompact(k,pred){   // 전체 화면용: 만든 것만 + 전체 목록 버튼
  const {L,done}=showStats(k), S=SHOWS[k];
  const made=L.filter(e=>e[4]&&GAMES[e[4]]&&(!pred||pred(e[4])));
  return `<section class="shelf showshelf"><h3>${S.name} <small>메인·데스매치 ${L.length}개 중 ${done}개 완성</small></h3>
    <div class="tiles">${made.map(e=>showTile(k,e,pred)).join('')}<button class="tile show more" data-cat-jump="${k}"><span class="t-emo">📋</span><span class="t-tx"><b>전체 목록 보기</b><small>시즌별 메인 매치·데스매치 ${L.length}개 (준비 중 포함)</small></span></button></div></section>`;
}
function chipsHTML(boxId){ const cur=catSel[boxId]||''; const hasNew=GAME_ORDER.some(id=>GAMES[id]&&isNewG(id));
  const NP=nPlayers(), grp=boxId==='menuCards'&&isNet()&&NP>2;
  return `<button class="chip2 ${!cur?'on':''}" data-cat="">전체</button>`+(grp?`<button class="chip2 grp ${cur==='group'?'on':''}" data-cat="group">👥 ${NP}명 다 같이</button>`:'')+SHOW_KEYS.map(k=>`<button class="chip2 show ${cur===k?'on':''}" data-cat="${k}">${SHOWS[k].name}</button>`).join('')+(hasNew?`<button class="chip2 new ${cur==='new'?'on':''}" data-cat="new">🆕 새로 생김</button>`:'')+CATS.map(c=>`<button class="chip2 ${cur===c.k?'on':''}" data-cat="${c.k}">${c.n}</button>`).join(''); }
function listCards(boxId,searchId,inRoom,pred){
  const q=$(searchId).value, cat=catSel[boxId]||'', ids=GAME_ORDER.filter(id=>GAMES[id] && pred(id));
  if(SHOW_KEYS.includes(cat) && !q.trim()){ $(boxId).innerHTML=showFull(cat,pred); const chips=$(searchId+'Chips'); if(chips) chips.innerHTML=chipsHTML(boxId); const cnt=$(searchId+'Count'); if(cnt) cnt.textContent=`완성 ${showStats(cat).done} / ${showStats(cat).L.length}`; return; }
  const inCat=id=> !cat||SHOW_KEYS.includes(cat) ? true : cat==='group' ? (GAMES[id].maxH||2)>=nPlayers() : cat==='new' ? isNewG(id) : catOf(id)===cat;
  const shown=ids.filter(id=>gameMatches(id,q) && inCat(id));
  const chips=$(searchId+'Chips'); if(chips) chips.innerHTML=chipsHTML(boxId);
  let h='';
  if(!shown.length) h=`<p class="muted" style="text-align:center">${cat==='group'?`${nPlayers()}명이 다 같이 할 수 있는 게임이 아직 없어요 — 2명 게임은 나머지가 관전해요`:q.trim()?`"${U.esc(q)}"에 맞는 게임이 없어요`:'이 분류엔 아직 게임이 없어요'}</p>`;
  else if(!q.trim() && !cat){   // 전체: 분류별 선반
    const rc=LS.get('ms-recent',[]).filter(id=>shown.includes(id));
    if(inRoom && rc.length) h+=`<section class="shelf"><h3>⏱ 최근에 한 게임</h3><div class="tiles">${rc.map(tileHTML).join('')}</div></section>`;
    if(window.SHOWS) for(const k of SHOW_KEYS) h+=showCompact(k,pred);
    const nw=shown.filter(isNewG); if(nw.length) h+=`<section class="shelf new"><h3>🆕 새로 생김 <small>아직 안 해 본 게임 ${nw.length}개</small></h3><div class="tiles">${nw.map(tileHTML).join('')}</div></section>`;
    for(const c of CATS){ const list=shown.filter(id=>catOf(id)===c.k); if(!list.length) continue;
      h+=`<section class="shelf"><h3>${c.n} <small>${c.d} · ${list.length}개</small></h3><div class="tiles">${list.map(tileHTML).join('')}</div></section>`; }
  } else h=`<div class="tiles">${shown.map(tileHTML).join('')}</div>`;
  $(boxId).innerHTML=h;
  const cnt=$(searchId+'Count'); if(cnt) cnt.textContent = (q.trim()||cat) ? `${shown.length} / ${ids.length}개` : `${ids.length}개`;
}
const renderHomeCards=()=>{ listCards('homeCards','search',false,()=>true); renderRecent(); if(window.Season) Season.entry($('seasonEntry'));
  { const se=$('seasonEntry'); if(se&&GAMES.geniusai){ const d=document.createElement('button'); d.className='ss-entry gn-entry'; d.type='button'; d.innerHTML='<b>🏆 더 지니어스 · 놀이터 시즌 1 <small>🤖 AI판</small></b><span>동물 친구들이 직접 생각하고 말하는 8인 서바이벌 — 혼자, 또는 방을 만들어 친구들과 함께</span>'; d.onclick=()=>openSheet('geniusai'); se.prepend(d); if(GAMES.devil3ai){ const d2=document.createElement('button'); d2.className='ss-entry gn-entry dv-entry'; d2.type='button'; d2.innerHTML='<b>😈 데블스 플랜 · 놀이터 시즌 <small>🤖 AI판 · 10인</small></b><span>메인 매치 꼴찌와 감옥 매치 꼴찌는 유배지로 — 연맹의 징표, 비밀 임무, 패자부활전까지</span>'; d2.onclick=()=>openSheet('devil3ai'); d.after(d2); }
    { const sv=savedSeason(); if(sv){ const r=document.createElement('button'); r.className='ss-entry gn-entry gn-resume'; r.type='button'; const dt=new Date(sv.at||Date.now()), al=(sv.S.players||[]).filter(x=>!x.out).length;
      r.innerHTML=`<b>▶ 지난 시즌 이어 하기 <small>${sv.mode==='host'?`👥 방 ${U.esc(sv.code||'')}`:'혼자'}</small></b><span>제${sv.S.ep||1}회 · 남은 ${al}명 · ${dt.getMonth()+1}/${dt.getDate()} ${dt.getHours()}:${String(dt.getMinutes()).padStart(2,'0')} 저장${sv.mode==='host'?' — 친구는 같은 방 코드로 다시 들어오면 자기 자리로 돌아와요':''}</span>`;
      r.onclick=()=>{ if(!confirm('지난 시즌을 이어서 할까요?')) return; resumeSeason(); }; d.after(r); } }
    { let H=[]; try{ H=JSON.parse(localStorage.getItem('ms-hof')||'[]'); }catch(_){} if(H.length){ const b=document.createElement('div'); b.className='gn-hof'; b.innerHTML=`<b>🏛️ 명예의 전당</b>${H.slice(0,5).map(x=>{ const d=new Date(x.at); return `<div><small>${d.getMonth()+1}/${d.getDate()}</small> 👑 ${U.esc(x.champ)}${x.me?' <i>(나!)</i>':''}${x.aw&&x.aw.length?` <small>· ${x.aw.map(U.esc).join(' · ')}</small>`:''}${x.hl?`<br><small>🎬 ${U.esc(x.hl)}</small>`:''}</div>`; }).join('')}`; (se.querySelector('.gn-resume')||d).after(b); } }   /* 🏛️ 명예의 전당 (2026-11-11) */ const old=se.querySelector('.ss-entry:not(.gn-entry)'); if(old){ old.classList.add('ss-old'); const b=old.querySelector('b'); if(b) b.textContent='🗂️ 예전 방식 시즌 (혼자 · 규칙형 동물)'; } } } };   /* 🏆 새 AI 시즌을 맨 위에 (2026-11-11) */
function renderRecent(){
  const box=$('recent'); if(!box) return;
  const rc=LS.get('ms-recent',[]).filter(id=>GAMES[id]&&GAMES[id].ai);
  box.hidden=!rc.length;
  box.innerHTML = rc.length ? `<span>⏱ 최근 한 게임</span>`+rc.map(id=>`<button class="ghost small" data-quick="${id}">${GAMES[id].emoji} ${GAMES[id].title}</button>`).join('')+`<small>누르면 바로 혼자 연습</small>` : '';
}
function renderMenu(){
  $('menu').hidden=false; $('play').hidden=true;
  let hint='';
  const NP=nPlayers(), who=isNet()?` · 👥 ${NP}명: ${[...Array(NP).keys()].map(p=>`${avaOf(p)} ${nameOf(p)}`).join(', ')}`:'';
  if(mode==='host') hint = connected ? (NP>2?`누구든 고르면 같이 시작해요. 👥숫자 표시 게임은 ${NP}명 다 같이, 나머지는 2명만 하고 다른 사람은 관전${who}`:'둘 중 누구든 고르면 같이 시작해요'+who) : '친구를 기다리는 중… 위 코드나 초대 링크를 보내주세요. 여러 명이 들어와도 돼요(최대 8명). 먼저 골라둬도 돼요.';
  else if(mode==='guest') hint = connected ? (NP>2?`누구든 고르면 같이 시작해요. 👥숫자 표시 게임은 ${NP}명 다 같이${who}`:'둘 중 누구든 고르면 같이 시작해요'+who) : '방장과 연결하는 중…';
  else hint = '컴퓨터와 연습하거나, 한 화면에서 둘이 할 수 있어요';
  $('menuHint').textContent=hint;
  renderLevel();
  if(isNet()&&NP>2&&!grpShown){ grpShown=true; if(!catSel.menuCards) catSel.menuCards='group'; } if(NP<=2&&catSel.menuCards==='group') catSel.menuCards='';
  listCards('menuCards','menuSearch',true,id=>isNet() || GAMES[id].ai || GAMES[id].local || GAMES[id].table);   // table: 동물이 스스로 움직이는 판(선과 악 · AI판)도 혼자 연습 목록에
}
function onCards(e){
  const j=e.target.closest('[data-cat-jump]'); if(j){ const box=e.currentTarget.id||(mode?'menuCards':'homeCards'); catSel[box]=j.dataset.catJump; (box==='menuCards'?renderMenu:renderHomeCards)(); $(box).scrollIntoView({block:'start'}); return; }
  const o=e.target.closest('[data-open]'); if(o){ openSheet(o.dataset.open); return; }
  const b=e.target.closest('button'); if(!b) return;
  if(b.dataset.guide){ openGuide(b.dataset.guide); return; }
  const id=b.dataset.play||b.dataset.local; if(!id) return;
  if(mode==='guest'){ send({t:'pick',id}); return; }
  if(offline()) startGame(id, b.dataset.local ? 'local' : 'solo');
  else startGame(id);
}

/* ───────── 가이드 ───────── */
/* 넘겨 보는 카드식 가이드: 1장 = 한눈에(실제 화면 캡처) → 규칙 한 가지씩 → 승리 조건 → 팁.
   게임이 guideSteps:[{t, h, shot}]를 주면 그걸 쓰고, 아니면 guide HTML을 자동으로 나눔. */
let gIdx=0, gPages=[];
function guideShot(id,demo){   // 실제 게임 화면 캡처: 지금 하는 게임이면 지금 화면, 아니면 데모 상태를 그려서 (demo: 장마다 보여 줄 장면을 만드는 함수)
  const g=GAMES[id];
  try{
    if(!demo && gameId===id && mode && $('area') && $('area').innerHTML) return $('area').innerHTML;
    if(demo){ const s=demo(g.init(0)); const v=g.mask?g.mask(s,0):s, el=document.createElement('div'); g.render(el,v,{me:0, mode:'solo', myTurn:true, act:()=>{}, rerender:()=>{}, tip:()=>{}, name:p=>p?'상대':(myNick()||'플레이어'), turnText:()=>'', host:false}); if(g.reset) try{ g.reset(); }catch(_){} return el.innerHTML; }
    if(!g.init||!g.render) return '';
    let s=g.init(0);
    // 진행 중인 화면이 보이도록: 시간 흐름 + 컴퓨터끼리 몇 수 (실패하면 거기서 멈춤)
    let acts=0; const s0=JSON.stringify(s);
    try{ for(let k=0;k<60&&s.winner==null;k++){
      const d=g.stepDelay?g.stepDelay(s):null;
      if(d!=null&&d<=20000&&g.step){ g.step(s); continue; }
      if(!g.ai||acts>=6) break;
      const p=s.turn==null?1:s.turn, a=g.ai(g.mask?g.mask(s,p):s,1); if(!a) break;
      const e=g.apply(s,p,a); if(e) break; acts++;
    } }catch(_){ s=JSON.parse(s0); }
    if(s.winner!=null) s=JSON.parse(s0);
    const v=g.mask?g.mask(s,0):s, el=document.createElement('div');
    g.render(el,v,{me:0, mode:'solo', myTurn:true, act:()=>{}, rerender:()=>{}, tip:()=>{}, name:p=>p?'상대':(myNick()||'플레이어'), turnText:()=>'', host:false});
    const h=el.innerHTML; if(g.reset) try{ g.reset(); }catch(_){}
    return h;
  }catch(e){ return ''; }
}
function autoPages(g){
  const box=document.createElement('div'); box.innerHTML=g.guide||''; const pages=[]; let intro=[], after=[], seenList=false, tips=[];
  for(const n of [...box.children]){
    if(n.classList&&n.classList.contains('tipbox')){ tips.push(n.innerHTML.replace(/^💡\s*<b>팁<\/b>(<br>)?/,'')); continue; }
    if(n.tagName==='OL'||n.tagName==='UL'){ seenList=true; const items=[...n.children].filter(x=>x.tagName==='LI'); items.forEach((li,k)=>pages.push({t:`규칙 ${pages.length+1}`, h:li.innerHTML})); continue; }
    (seenList?after:intro).push(n.outerHTML);
  }
  const out=[{t:'한눈에', h:(g.tagline?`<p class="gd-tag">${g.tagline}</p>`:'')+intro.join(''), shot:true}];
  pages.forEach((p,k)=>{ p.t=`규칙 ${k+1} / ${pages.length}`; out.push(p); });
  if(after.length) out.push({t:'🏁 승리 조건', h:after.join('')});
  if(tips.length) out.push({t:'💡 팁', shot:false, h:tips.join('<hr>').split('<br>').filter(x=>x.trim()).map(x=>`<div class="gd-tip">${x.replace(/^·\s*/,'')}</div>`).join('')});
  return out;
}
function openGuide(id){
  const g=GAMES[id];
  gPages = g.guideSteps ? [{t:'한눈에', h:g.tagline?`<p class="gd-tag">${g.tagline}</p>`:'', shot:true}].concat(g.guideSteps) : autoPages(g);
  if(g.maxH>2&&gPages[0]&&!String(gPages[0].h||"").includes("gd-mh")) gPages[0]=Object.assign({},gPages[0],{h:(gPages[0].h||"")+`<p class="gd-mh">👥 친구들과 하면 <b>최대 ${g.maxH}명</b>까지 사람이 앉고, 빈자리는 동물이 채워요.</p>`});
  const shot=guideShot(id); gIdx=0; for(const p of gPages) if(p.demo&&!p.img){ try{ p.img=guideShot(id,p.demo); }catch(_){} }
  const draw=()=>{ const p=gPages[gIdx], last=gIdx===gPages.length-1;
    $('guideBody').innerHTML=`<div class="gd-head"><span class="gd-emo">${g.emoji}</span><div><b>${g.title}</b>${g.ref?`<small>${g.ref}</small>`:''}</div><button class="gd-x" data-gdclose="1" aria-label="닫기">✕</button></div>
      <div class="gd-dots">${gPages.map((_,k)=>`<i class="${k===gIdx?'on':''}" data-gd="${k}"></i>`).join('')}</div>
      <div class="gd-card"><div class="gd-t">${p.t}</div>${shot&&p.shot!==false?`<div class="gd-shot ${p.shot||p.demo?'':'small'}"><div class="gd-shot-in">${p.img||shot}</div><span class="gd-cap">📸 ${p.cap||'실제 게임 화면'}</span></div>`:''}<div class="gd-h">${p.h||''}</div></div>
      <div class="gd-nav"><button class="ghost" data-gd="${gIdx-1}" ${gIdx?'':'disabled'}>‹ 이전</button><span>${gIdx+1} / ${gPages.length}</span>${last?'<button data-gdclose="1">시작하기 ▶</button>':`<button data-gd="${gIdx+1}">다음 ›</button>`}</div>`;
    $('guideBody').scrollTop=0;
    const inner=$('guideBody').querySelector('.gd-shot-in'); if(inner){ inner.querySelectorAll('[id]').forEach(x=>x.removeAttribute('id')); }
    /* 장마다 보여 줄 부분(focus 선택자)으로 그림을 옮김 — 맨 윗부분만 잘려 보이지 않게 */
    if(inner&&p.focus){ const fo=inner.querySelector(p.focus); if(fo){ const dy=fo.getBoundingClientRect().top-inner.getBoundingClientRect().top; if(dy>8) inner.style.marginTop=(-(dy-6))+'px'; } }
  };
  draw();
  $('guideBody').onclick=e=>{ const b=e.target.closest('[data-gd]'); if(b&&!b.disabled){ gIdx=Math.max(0,Math.min(gPages.length-1,+b.dataset.gd)); draw(); return; } if(e.target.closest('[data-gdclose]')) $('guide').close(); };
  let tx=null; $('guideBody').ontouchstart=e=>{ tx=e.touches[0].clientX; }; $('guideBody').ontouchend=e=>{ if(tx==null) return; const dx=e.changedTouches[0].clientX-tx; tx=null; if(Math.abs(dx)>50){ gIdx=Math.max(0,Math.min(gPages.length-1,gIdx+(dx<0?1:-1))); draw(); } };
  const d=$('guide'); d.onkeydown=e=>{ if(e.key==='ArrowRight'){ gIdx=Math.min(gPages.length-1,gIdx+1); draw(); } if(e.key==='ArrowLeft'){ gIdx=Math.max(0,gIdx-1); draw(); } };
  if(!d.open) d.showModal();
}
function maybeGuide(id){
  let seen=false; try{ seen=localStorage.getItem('ms-seen-'+id)==='1'; localStorage.setItem('ms-seen-'+id,'1'); }catch(_){}
  if(!seen) openGuide(id);
}

/* ───────── 이모지 ───────── */
function note3(p,text){ const el=$('tip'); if(!el) return; el.textContent=`${avaOf(p)} ${nameOf(p)}: ${text}`; clearTimeout(tipTimer); tipTimer=setTimeout(()=>el.textContent='',3500); }
function showEmo(p,e){
  if(p>1&&isNet()){ note3(p,e); return; }
  const bar=[...document.querySelectorAll('.pbar,.pchip')].find(b=>b.dataset.p!==''&&b.dataset.p==String(p));
  // 바 안에서만 잠깐 튀어나왔다 사라짐 — 다른 정보 위로 떠다니지 않게 (그라운드 룰 3)
  if(bar && bar.offsetParent){ const old=bar.querySelector('.inemo'); if(old) old.remove();
    const s=document.createElement('span'); s.className='inemo'; s.textContent=e; bar.appendChild(s); setTimeout(()=>s.remove(),1700); }
  sfx('emo');
}

/* ───────── 네트워크 (PeerJS, P2P) ───────── */
const PFX='gilmak-v2-';
const genCode=()=>Array.from({length:4},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.random()*32|0]).join('');
const send=m=>{ if(mode==='host'){ guests.forEach(g=>{ if(g.c&&g.c.open) try{ g.c.send(m); }catch(_){} }); return; } if(conn && conn.open) conn.send(m); };
function sendRoom(){
  const m=mod(), H=humansOf(S);
  for(const g of guests){ if(!g.c||!g.c.open) continue; const sp=!!(m&&S&&!isPlayer(S,g.p));
    try{ g.c.send({t:'room', game:gameId, V: m && S && !sp ? (m.mask ? m.mask(S,g.p) : S) : null, spect:sp, names, avas, ver:APP_VER, tally, you:g.p, n:nPlayers()}); }catch(_){} }
}
const hostConnected=()=>guests.some(g=>g.c&&g.c.open);
function setNet(text,cls){ $('netText').textContent=text; $('net').className=cls||''; }
function myTok(){
  let t=''; try{ t=sessionStorage.getItem('ms-tok')||''; }catch(_){}
  if(!t){ t=Math.random().toString(36).slice(2,10); try{ sessionStorage.setItem('ms-tok',t); }catch(_){} }
  return t;
}
function persist(){
  try{
    if(!mode) return sessionStorage.removeItem('ms-session');
    sessionStorage.setItem('ms-session', JSON.stringify(mode==='guest' ? {mode,code} : {mode,code,gameId,S,names,avas,guestTok,tally,guests:guests.map(g=>({tok:g.tok,p:g.p}))}));
  }catch(_){}
  /* 🏆 AI 시즌은 길어서(1.5~2시간) 브라우저를 닫아도 홈에서 "이어 하기" — 방장·혼자만, 끝나면 지움 (2026-11-11) */
  try{ if((gameId==='geniusai'||gameId==='devil3ai')&&S&&(mode==='host'||mode==='solo')){ if(S.winner!=null||S.champ) localStorage.removeItem('ms-season');
      else localStorage.setItem('ms-season', JSON.stringify({mode,code,gameId,S,names,avas,guestTok,tally,guests:guests.map(g=>({tok:g.tok,p:g.p})),at:Date.now()})); } }catch(_){}
}
function savedSeason(){ try{ const v=JSON.parse(localStorage.getItem('ms-season')||'null'); return v&&v.S&&(v.gameId==='geniusai'||v.gameId==='devil3ai')?v:null; }catch(_){ return null; } }
function resumeSeason(){ const v=savedSeason(); if(!v) return; if(v.mode==='host'&&window.Peer){ startHost(v); return; }
  mode='solo'; gameId=v.gameId; S=v.S; tally=v.tally||tally; persist(); render(); scheduleAI(); scheduleStep(); }
function saveNick(){ try{ localStorage.setItem('ms-nick',myNick()); }catch(_){} }

function startHost(resume){
  mode='host';
  if(resume){ code=resume.code; gameId=resume.gameId||null; S=resume.S||null; names=resume.names||['','']; avas=resume.avas||[myAva(),'']; guestTok=resume.guestTok||''; tally=resume.tally||tally; guests=(resume.guests||[]).map(g=>({tok:g.tok,p:g.p,c:null})); }
  else { code=genCode(); gameId=null; S=null; names=[myNick(),'']; avas=[myAva(),'']; guestTok=''; tally={total:[0,0], game:{}}; guests=[]; }
  connected=false; persist(); render(); scheduleStep(); setNet('방 여는 중…','wait');
  peer=new Peer(PFX+code,{debug:0});
  peer.on('open',()=>{ hostTries=0; setNet(connected?'연결됨':'친구 대기 중', connected?'on':'wait'); });
  peer.on('connection',wireHost);
  peer.on('disconnected',()=>{ setTimeout(()=>{ try{ if(peer && !peer.destroyed) peer.reconnect(); }catch(_){} },1500); });
  peer.on('error',e=>{
    if(e.type==='unavailable-id'){
      // 새로고침 직후엔 예전 접속이 잠깐 남아 있음 → 같은 코드로 다시 시도
      peer.destroy();
      if(hostTries++<6) setTimeout(()=>{ if(mode==='host') startHost({code,gameId,S,names,avas,guestTok,tally,guests:guests.map(g=>({tok:g.tok,p:g.p}))}); },2500);
      else { tip('같은 코드를 못 열어서 새 방을 만들었어요'); startHost(null); }
    } else if(['network','server-error','socket-error','socket-closed'].includes(e.type)) setNet('서버 연결 문제, 재시도 중','wait');
    else setNet('오류: '+e.type,'');
  });
}
function wireHost(c){
  c.on('data',m=>{
    if(!m || typeof m!=='object') return;
    if(m.t==='hello'){
      const tok=String(m.tok||'');
      let g=guests.find(x=>x.tok===tok);
      /* 판 도중 다시 들어온 친구(브라우저를 닫았다 열면 표가 바뀜) → 같은 닉네임의 자리를 이어받음. 닫힌 탭의 연결은 한동안 '열림'으로 남아서 연결 상태로는 못 가림 (2026-11-11) */
      if(!g&&gameId&&S){ const nm0=String(m.name||'').slice(0,10); g=(nm0&&guests.find(x=>names[x.p]===nm0&&isPlayer(S,x.p)))||guests.find(x=>!(x.c&&x.c.open)&&isPlayer(S,x.p))||null; if(g) g.tok=tok; }
      if(!g){ if(guests.length>=MAXG){ c.send({t:'full'}); setTimeout(()=>c.close(),500); return; } g={tok,p:guests.length+1,c:null}; guests.push(g); }
      if(g.c&&g.c!==c){ try{ g.c.close(); }catch(_){} }
      g.c=c; if(g.p===1){ conn=c; guestTok=tok; } connected=true; oppAway=false; setNet(`연결됨 · 👥 ${nPlayers()}명`,'on');
      names[g.p]=String(m.name||'').slice(0,10); avas[g.p]=AVAS.includes(m.ava)?m.ava:'🔵'; checkVer(m.ver);
      if(gameId&&S&&!isPlayer(S,g.p)&&GAMES[gameId].addHuman){ const r=GAMES[gameId].addHuman(S,g.p); if(r==='reinit'){ startGame(gameId); return; } if(r==='wait') try{ c.send({t:'err',msg:'지금 게임이 끝나면 동물 자리를 이어받아 참가해요'}); }catch(_){} }
      changed(); return;
    }
    const g=guests.find(x=>x.c===c); if(!g) return; const gp=g.p;
    try{
      if(m.t==='act'){ if(gameId && S){ if(!isPlayer(S,gp)){ c.send({t:'err',msg:S.pendJoin&&S.pendJoin.includes(gp)?'지금 게임이 끝나면 동물 자리를 이어받아 참가해요':'이번 판은 관전 중이에요 — 다음 판부터 같이 해요'}); return; } const e=mod().apply(S,gp,m.a); if(e) c.send({t:'err',msg:e}); } changed(); }
      else if(m.t==='pick'){ if(GAMES[m.id]) startGame(m.id); }
      else if(m.t==='menu'){ gameId=null; S=null; changed(); }
      else if(m.t==='rematch'){ if(S && S.winner!=null){ rematch(); } }
      else if(m.t==='emo'){ const e=String(m.e).slice(0,4); showEmo(gp,e); guests.forEach(o=>{ if(o!==g&&o.c&&o.c.open) o.c.send({t:'emo',e,from:gp}); }); }
      else if(m.t==='away'){ if(gp===1){ oppAway=!!m.away; render(); } }
      else if(m.t==='say'){ const text=String(m.text||'').slice(0,40); showSay(gp,text); sfx('emo'); guests.forEach(o=>{ if(o!==g&&o.c&&o.c.open) o.c.send({t:'say',text,from:gp}); }); }
    }catch(err){ console.error(err); sendRoom(); }
  });
  const lost=()=>{ const g=guests.find(x=>x.c===c); if(!g) return; g.c=null; if(conn===c) conn=null; connected=hostConnected(); setNet(connected?`연결됨 · 👥 ${nPlayers()}명`:'친구 대기 중',connected?'on':'wait'); render(); };
  c.on('close',lost); c.on('error',lost);
}
function startGuest(cd){
  mode='guest'; code=cd; gameId=null; RV=null; myP=1; roomN=2; spect=false; names=['',myNick()]; avas=['',myAva()]; connected=false;
  persist(); render(); setNet('방 찾는 중…','wait');
  peer=new Peer({debug:0});
  peer.on('open',connectHost);
  peer.on('disconnected',()=>{ setTimeout(()=>{ try{ if(peer && !peer.destroyed) peer.reconnect(); }catch(_){} },1500); });
  peer.on('error',e=>{
    if(e.type==='peer-unavailable'){ setNet('방을 찾을 수 없어요 · 다시 시도 중','wait'); rejoin(); }
    else if(['network','server-error','socket-error','socket-closed'].includes(e.type)) setNet('서버 연결 문제, 재시도 중','wait');
    else setNet('오류: '+e.type,'');
  });
}
function rejoin(){ clearTimeout(rejoinTimer); rejoinTimer=setTimeout(()=>{ if(mode==='guest' && !connected && peer && peer.open) connectHost(); },3000); }
function connectHost(){
  const c=peer.connect(PFX+code,{reliable:true}); conn=c;
  c.on('open',()=>{ connected=true; oppAway=false; setNet('연결됨','on'); c.send({t:'hello',name:names[1],ava:myAva(),tok:myTok(),ver:APP_VER}); render(); });
  c.on('data',m=>{
    if(!m || typeof m!=='object') return;
    if(m.t==='room'){ checkVer(m.ver); if(m.tally) tally=m.tally; if(m.game && m.game!==gameId) markRecent(m.game); gameId=m.game; RV=m.V; spect=!!m.spect; if(m.you!=null) myP=m.you; if(m.n) roomN=m.n; names=(m.names||[]).slice(); names[myP]=myNick()||names[myP]; avas=(m.avas||[]).slice(); avas[myP]=myAva(); render(); }
    else if(m.t==='err') tip(m.msg);
    else if(m.t==='emo') showEmo(m.from??0,String(m.e).slice(0,4));
    else if(m.t==='away'){ oppAway=!!m.away; render(); }
    else if(m.t==='say'){ showSay(m.from??0,m.text); sfx('emo'); }
    else if(m.t==='full'){ leave(); $('lobbyMsg').textContent='방이 꽉 찼어요 (최대 8명)'; }
  });
  const lost=()=>{ if(conn!==c) return; connected=false; conn=null; if(mode==='guest'){ setNet('다시 연결하는 중…','wait'); render(); rejoin(); } };
  c.on('close',lost); c.on('error',lost);
}
function leave(){
  if(window.Season) Season.onLeave();
  clearTimeout(rejoinTimer); clearTimeout(aiTimer); aiTimer=null; clearTimeout(stepTimer); stepTimer=null;
  const p=peer; mode=null; peer=null; conn=null; connected=false; S=null; RV=null; gameId=null; tally={total:[0,0], game:{}}; guests=[]; myP=1; roomN=2; spect=false;
  if(p) try{ p.destroy(); }catch(_){}
  persist();
  history.replaceState(null,'',location.pathname);
  render();
}

/* ───────── 버튼 ───────── */
function needPeer(){ if(window.Peer) return true; $('lobbyMsg').textContent='네트워크 라이브러리를 못 불러왔어요 (인터넷 확인)'; return false; }
/* 원작 이름을 제목으로 (사용자 요청 2026-11-09): ref가 있으면 원작 이름이 title, 예능 이름은 ref(출처)로, 원래 사이트 이름은 alias(검색용) */
function useOriginalTitles(){
  for(const id in GAMES){ const g=GAMES[id]; if(!g.ref || g.alias) continue;
    const m=String(g.ref).match(/^(.*?)\s*「(.+)」\s*$/);
    const orig = m ? m[2] : String(g.ref).replace(/\s*\(.*\)\s*$/,'');
    g.alias=g.title; g.title=orig; g.ref = m ? m[1].trim() : null; }
}
function boot(){
  useOriginalTitles();
  try{ $('nick').value=localStorage.getItem('ms-nick')||''; }catch(_){}
  updMute();
  renderHomeCards();
  $('homeCards').onclick=onCards; $('menuCards').onclick=onCards;
  // 상세 창
  $('gsheet').addEventListener('click',e=>{
    if(e.target===$('gsheet') || e.target.closest('[data-close]')){ closeSheet(); return; }
    const t=e.target.closest('[data-tag]'); if(t){ const inp=mode?'menuSearch':'search'; closeSheet(); catSel[mode?'menuCards':'homeCards']=''; $(inp).value='#'+t.dataset.tag; $(inp).dispatchEvent(new Event('input')); return; }
    const b=e.target.closest('button'); if(!b) return;
    if(b.dataset.guide){ openGuide(b.dataset.guide); return; }
    if(b.dataset.watch){ const id=b.dataset.watch; closeSheet(); saveNick(); mode='solo'; window.GA_WATCH=true; startGame(id); return; }
    if(b.dataset.quick||b.dataset.qlocal){ const id=b.dataset.quick||b.dataset.qlocal; closeSheet(); saveNick(); newPersona(); mode='solo'; if(b.dataset.qlocal) startGame(id,'local'); else startGame(id); return; }
    if(b.dataset.play||b.dataset.local){ closeSheet(); onCards(e); }
  });
  $('search').addEventListener('input',renderHomeCards);
  for(const [chipBox,inp,box] of [['searchChips','search','homeCards'],['menuSearchChips','menuSearch','menuCards']]){
    $(chipBox).addEventListener('click',e=>{ const b=e.target.closest('[data-cat]'); if(!b) return; catSel[box]=b.dataset.cat; $(inp).value=''; $(inp).dispatchEvent(new Event('input')); });
  }
  $('levelBox').addEventListener('click',e=>{ const b=e.target.closest('[data-lv]'); if(b) setLevel(+b.dataset.lv); });
  $('recent').addEventListener('click',e=>{ const b=e.target.closest('[data-quick]'); if(!b) return; saveNick(); newPersona(); mode='solo'; startGame(b.dataset.quick); });
  $('menuSearch').addEventListener('input',renderMenu);
  // 분류 태그를 누르면 그 태그로 검색
  for(const [box,inp] of [['homeCards','search'],['menuCards','menuSearch']]){
    $(box).addEventListener('click',e=>{ const t=e.target.closest('[data-tag]'); if(!t) return; $(inp).value='#'+t.dataset.tag; $(inp).dispatchEvent(new Event('input')); });
  }
  window.addEventListener('keydown',e=>{ if(e.key==='/' && document.activeElement.tagName!=='INPUT' && !mode){ e.preventDefault(); $('search').focus(); } });
  $('nick').onchange=saveNick;
  /* 내 캐릭터 고르기: 처음 온 사람에겐 먼저 펼쳐 보여 줌 */
  const drawAva=(first)=>{ $('avaBtn').textContent=myAva(); $('avaGrid').innerHTML=(first?'<p>👋 내 캐릭터를 골라 주세요 — 게임 속 내 자리에 나와요</p>':'')+AVAS.map(a=>`<button type="button" class="${a===myAva()?'on':''}" data-ava="${a}">${a}</button>`).join(''); };
  let avaFirst=false; try{ avaFirst=!localStorage.getItem('ms-ava'); }catch(_){}
  drawAva(avaFirst); if(avaFirst) $('avaGrid').hidden=false;
  $('avaBtn').onclick=()=>{ $('avaGrid').hidden=!$('avaGrid').hidden; drawAva(false); };
  $('avaGrid').onclick=e=>{ const b=e.target.closest('[data-ava]'); if(!b) return; try{ localStorage.setItem('ms-ava',b.dataset.ava); }catch(_){} drawAva(false); $('avaGrid').hidden=true; sfx('tap'); if(mode) render(); };
  $('btnHost').onclick=()=>{ if(!needPeer()) return; saveNick(); startHost(null); };
  $('btnJoin').onclick=()=>{
    const c=$('codeIn').value.trim().toUpperCase();
    if(!/^[A-Z0-9]{4}$/.test(c)){ $('lobbyMsg').textContent='코드 4자리를 넣어주세요'; return; }
    if(!needPeer()) return;
    saveNick(); $('lobbyMsg').textContent=''; startGuest(c);
  };
  $('codeIn').addEventListener('keydown',e=>{ if(e.key==='Enter') $('btnJoin').click(); });
  $('btnSolo').onclick=()=>{ saveNick(); newPersona(); mode='solo'; gameId=null; S=null; persist(); render(); };
  $('btnLeave').onclick=()=>{ const V=view(); if(V && V.winner==null && isNet() && !confirm('방에서 나갈까요?')) return; leave(); };
  $('btnLeave2').onclick=leave;
  $('btnMenu').onclick=toMenu;
  $('btnRematch').onclick=rematch;
  $('btnGuide').onclick=()=>gameId && openGuide(gameId);
  $('coach').onclick=e=>{ if(e.target.closest('[data-coachoff]')){ try{ localStorage.setItem('ms-coach-off','1'); }catch(_){} $('coach').hidden=true; } };
  const updSpeed=()=>{ $('btnSpeed').textContent = speedMul()>1 ? '🐢 느리게' : '🐇 보통'; };
  updSpeed(); $('btnSpeed').onclick=()=>{ try{ localStorage.setItem('ms-speed', speedMul()>1?'normal':'slow'); }catch(_){} updSpeed(); sfx('tap'); };
  $('guideClose').onclick=()=>$('guide').close();
  $('guide').addEventListener('close',()=>{ $('guideBody').innerHTML=''; });   // 닫으면 데모 화면을 비움(같은 data- 속성이 남지 않게)
  $('guide').addEventListener('click',e=>{ if(e.target===$('guide')) $('guide').close(); });
  $('brand').onclick=()=>{ if(!mode) return; if(isNet() && !confirm('방에서 나갈까요?')) return; leave(); };
  $('btnMute').onclick=()=>{ muted=!muted; try{ localStorage.setItem('ms-mute',muted?'1':'0'); }catch(_){} updMute(); if(!muted) sfx('tap'); };
  $('sayBtn').onclick=()=>{ $('sayMenu').hidden=!$('sayMenu').hidden; if(!$('sayMenu').hidden) $('sayIn').focus(); };
  $('sayMenu').onclick=e=>{ const b=e.target.closest('[data-say]'); if(!b) return; sendSay(b.dataset.say); $('sayMenu').hidden=true; };
  $('sayForm').onsubmit=e=>{ e.preventDefault(); sendSay($('sayIn').value); $('sayIn').value=''; $('sayMenu').hidden=true; };
  $('emobar').onclick=e=>{
    const b=e.target.closest('[data-e]'); if(!b) return;
    showEmo(mode==='local'?me():me(), b.dataset.e);
    if(isNet()) send({t:'emo',e:b.dataset.e});
  };
  $('btnCopy').onclick=async()=>{
    const isWeb=location.protocol.startsWith('http');
    const text = isWeb ? `${location.origin}${location.pathname}?room=${code}` : code;
    try{ await navigator.clipboard.writeText(text); $('tip').textContent = isWeb?'초대 링크를 복사했어요':'코드를 복사했어요'; setTimeout(()=>$('tip').textContent='',2000); }
    catch(_){ prompt('복사해서 보내세요', text); }
  };

  const q=new URLSearchParams(location.search).get('room');
  let saved=null; try{ saved=JSON.parse(sessionStorage.getItem('ms-session')||'null'); }catch(_){}
  if(saved && saved.mode){
    if(saved.mode==='host' && window.Peer){ startHost(saved); return; }
    if(saved.mode==='guest' && window.Peer){ startGuest(saved.code); return; }
    if(saved.mode==='solo' || saved.mode==='local'){ mode=saved.mode; gameId=saved.gameId; S=saved.S; tally=saved.tally||tally; render(); scheduleAI(); scheduleStep(); return; }
  }
  if(q){ $('codeIn').value=q.toUpperCase().slice(0,4); $('btnJoin').textContent='이 방에 참가'; $('nick').focus(); }
  render();
}
window.addEventListener('DOMContentLoaded', boot);
