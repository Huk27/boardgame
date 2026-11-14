(function(){
'use strict';
/* 히든 미션 (피의 게임 시즌 2 · 파이널 1라운드) — 1:1, 3라운드.
   6×6 판에 같은 그림 2개씩 18쌍. 블록 뒤엔 정답 단어의 한 글자 또는 공백. 라운드 전에 판을 외우는 시간(10·20·30초).
   번갈아 같은 그림 두 칸을 부름 → 맞히면 +1, 두 블록이 뒤집혀 숨은 글자 공개·판에서 빠짐(차례는 넘어감). 틀리면 두 그림을 잠깐 보여 주고 차례 넘김.
   🎯 히든 미션: 언제든 정답 단어를 선언 — 맞히면 +3, 라운드 끝. 틀려도 감점 없이 차례만 넘김. 짝을 다 찾으면 이후엔 선언만.
   3라운드 합계가 높은 쪽 승리. (원작 아이템 더블·오픈은 뺌) */
const S=6, NC=36, ROUNDS=3, MEMO=[10000,20000,30000], SHOW=1700;
const PICS=['🍎','🍌','🍇','🍓','🍒','🥝','🐶','🐱','🐰','🦊','🐼','🐸','⚽','🏀','🎸','🚗','✈️','⭐'];
const WORDS={동물:['코끼리','호랑이','고슴도치','펭귄','원숭이','다람쥐','거북이','캥거루','앵무새','오징어','기린','하마'],
  '나라·도시':['파리','런던','도쿄','뉴욕','제주도','베네치아','이집트','브라질','스위스','부산','호주','로마'],
  음식:['김치찌개','떡볶이','비빔밥','짜장면','아이스크림','초콜릿','햄버거','샌드위치','불고기','라면','피자','수박'],
  '자연·명소':['에베레스트','한라산','나이아가라','피라미드','사하라','무지개','은하수','오로라','화산','남극'],
  물건:['냉장고','자전거','비행기','망원경','피아노','컴퓨터','텔레비전','선풍기','헬리콥터','우산']};
const syl=w=>[...w.replace(/\s/g,'')];
function newRound(s){ const cats=Object.keys(WORDS), cat=U.pick(cats), word=U.pick(WORDS[cat].filter(w=>!s.used.includes(w)));
  s.used.push(word); const pics=U.shuffle([...Array(18).keys(),...Array(18).keys()]); const letters=Array(NC).fill(''); const cells=U.shuffle([...Array(NC).keys()]).slice(0,syl(word).length);
  syl(word).forEach((ch,k)=>letters[cells[k]]=ch); s.board={pics, letters, gone:Array(NC).fill(false)}; s.word=word; s.cat=cat; s.revealed=[]; s.wrongs=0; }
function init(starter){ const s={round:0, used:[], score:[0,0], turn:null, starter, phase:'intro', winner:null, log:[], flip:null, res:null, until:0, ev:0}; return s; }
function startRound(s){ s.round++; newRound(s); s.phase='memo'; s.turn=null; s.until=Date.now()+MEMO[s.round-1]; s.notice=`🎙️ ${s.round}라운드 — ${MEMO[s.round-1]/1000}초 동안 판을 외우세요! (분야: ${s.cat})`; s.log.push(`— ${s.round}라운드 · 분야 ${s.cat} —`); s.ev++; }
const pairsLeft=s=>s.board.gone.filter(x=>!x).length/2;
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요'; if(s.phase!=='play') return '지금은 할 수 없어요'; if(s.turn!==p) return '상대 차례예요'; if(!a) return '알 수 없는 동작';
  if(a.k==='flip'){ if(!pairsLeft(s)) return '짝을 다 찾았어요 — 이제 정답 선언만!'; const x=a.a|0, y=a.b|0;
    if(x===y||!(x>=0&&x<NC&&y>=0&&y<NC)||s.board.gone[x]||s.board.gone[y]) return '남아 있는 서로 다른 두 칸을 고르세요';
    const ok=s.board.pics[x]===s.board.pics[y]; s.flip={p,x,y,ok}; s.phase='show'; s.until=Date.now()+SHOW;
    s.log.push(`${p?'B':'A'} ${x+1}·${y+1}번 ${ok?'⭕ 짝!':'❌'}`); s.ev++; return null; }
  if(a.k==='guess'){ const g=String(a.w||'').replace(/\s/g,''); if(!g) return '정답을 입력하세요';
    const ok=g===s.word.replace(/\s/g,''); s.log.push(`${p?'B':'A'} 🎯 "${g}" ${ok?'⭕ +3':'❌'}`);
    if(ok){ s.score[p]+=3; s.res={p,ok:true,g}; s.phase='rend'; s.turn=null; s.until=Date.now()+3500; s.notice=`🎯 ${p?'B':'A'} 히든 미션 성공! 정답은 「${s.word}」 +3`; s.ev++; return null; }
    s.wrongs++; s.res={p,ok:false,g}; s.notice=`❌ ${p?'B':'A'}: "${g}" — 아니에요`;
    if(!pairsLeft(s)&&s.wrongs>=8){ s.phase='rend'; s.turn=null; s.until=Date.now()+3500; s.notice=`🎙️ 아무도 못 맞혔어요 — 정답은 「${s.word}」`; s.ev++; return null; }
    s.turn=1-p; s.ev++; return null; }
  return '알 수 없는 동작'; }
function stepDelay(s){ if(s.winner!=null) return null; if(s.phase==='intro') return 2000; if(s.phase==='memo'||s.phase==='show'||s.phase==='rend') return Math.max(0,s.until-Date.now()); return null; }
function step(s){
  if(s.phase==='intro'){ startRound(s); return; }
  if(Date.now()<s.until) return;
  if(s.phase==='memo'){ s.phase='play'; s.turn=(s.starter+s.round-1)%2; s.notice=`🎙️ 시작! 같은 그림 두 칸을 부르세요`; s.ev++; return; }
  if(s.phase==='show'){ const f=s.flip; if(f.ok){ s.score[f.p]++; s.board.gone[f.x]=s.board.gone[f.y]=true; for(const c of [f.x,f.y]) if(s.board.letters[c]) s.revealed.push(s.board.letters[c]); s.notice=`⭕ ${f.p?'B':'A'} 짝 +1${[f.x,f.y].some(c=>s.board.letters[c])?` · 글자 「${[f.x,f.y].map(c=>s.board.letters[c]).filter(Boolean).join('·')}」 공개!`:' · 공백'}`; }
    else s.notice=`❌ ${f.p?'B':'A'} — 서로 다른 그림`;
    s.flip=null; s.phase='play'; s.turn=1-f.p; s.ev++; return; }
  if(s.phase==='rend'){ if(s.round>=ROUNDS){ s.phase='over'; s.winner=s.score[0]>s.score[1]?0:s.score[1]>s.score[0]?1:'draw'; s.log.push(`🏁 ${s.score[0]} : ${s.score[1]}`); s.ev++; return; } startRound(s); }
}
function mask(s,p){ const v=U.clone(s); if(!s.board) return v; const open=s.phase==='memo'||s.phase==='over'||s.phase==='rend';
  v.board.pics=s.board.pics.map((x,i)=> open||s.board.gone[i]||(s.phase==='show'&&s.flip&&(i===s.flip.x||i===s.flip.y)) ? x : null);
  v.board.letters=s.board.letters.map((x,i)=> s.board.gone[i]||s.phase==='over'||s.phase==='rend' ? x : null);
  if(s.phase!=='rend'&&s.phase!=='over'){ v.word=null; v.used=s.used.slice(0,-1); } v.wordLen=null; v.left=Math.max(0,s.until-Date.now()); return v; }

/* 컴퓨터: 외운 그림·지금까지 뒤집힌 그림만 기억(난이도별 기억률) + 모인 글자와 분야로 단어 후보 추리 */
const MEM={};
function know(v,lvl){ const k='r'+v.round, m=MEM[k]=MEM[k]||{pic:{}, seenMemo:false}; const rate=[.3,.45,.95][lvl], seen=[.25,.45,.9][lvl];
  if(v.phase==='memo'&&!m.seenMemo&&v.board.pics.every(x=>x!=null)){ m.seenMemo=true; v.board.pics.forEach((pt,i)=>{ if(Math.random()<rate) m.pic[i]=pt; }); }
  if(v.phase==='show'&&v.flip){ for(const i of [v.flip.x,v.flip.y]) if(v.board.pics[i]!=null&&Math.random()<seen) m.pic[i]=v.board.pics[i]; }
  return m; }
function cands(v){ const rev=v.revealed; return WORDS[v.cat].filter(w=>{ const ss=syl(w).slice(); for(const ch of rev){ const k=ss.indexOf(ch); if(k<0) return false; ss.splice(k,1); } return true; }).filter(w=>!(v.used||[]).includes(w)); }
function ai(v,lvl=1){ const me=1; const m=know(v,lvl); if(v.phase!=='play'||v.turn!==me) return null;
  const C=cands(v), left=v.board.gone.filter(x=>!x).length;
  if(v.revealed.length&&(C.length===1&&(lvl>0||Math.random()<.7) || (!left&&C.length) || (lvl===0&&C.length<=3&&Math.random()<.25))) return {k:'guess', w: C.length===1||lvl>0 ? C[0] : U.pick(C)};
  if(!left) return {k:'guess', w:U.pick(WORDS[v.cat])};
  const alive=[...Array(NC).keys()].filter(i=>!v.board.gone[i]); const byPic={};
  for(const i of alive){ const pt=m.pic[i]; if(pt!=null) (byPic[pt]=byPic[pt]||[]).push(i); }
  const pair=Object.values(byPic).find(a=>a.length>=2);
  // 틀려도 감점이 없으니: 맞힐 확률×3 이 이번 차례 짝 기대값보다 크면 미리 선언 (보통은 후보 2개 이하일 때만)
  if(v.revealed.length&&C.length){ const ev=3/C.length, pairEV=pair?1:.3; if((lvl===2&&ev>pairEV)||(lvl===1&&C.length<=2&&ev>pairEV)) return {k:'guess', w:U.pick(C)}; }
  if(pair) return {k:'flip', a:pair[0], b:pair[1]};
  const known=alive.filter(i=>m.pic[i]!=null), unknown=alive.filter(i=>m.pic[i]==null);
  const a=known.length?U.pick(known):U.pick(alive); let b=U.pick((unknown.length?unknown:alive).filter(i=>i!==a)); if(b==null) b=alive.find(i=>i!==a);
  return {k:'flip', a, b}; }
function aiDelay(v){ return v.phase==='play' ? 1300+Math.random()*1500 : 600; }

/* 화면 */
let sel=[], sig='', tick=null;
function render(el,v,ctx){
  const me=ctx.me, o=1-me, my=ctx.myTurn&&v.phase==='play', nm=p=>p===me?'나':(ctx.mode==='solo'?'상대':U.esc(ctx.name(p)));
  clearInterval(tick); tick=null; const sg=v.round+':'+v.phase+':'+(v.board?v.board.gone.filter(Boolean).length:0); if(sg!==sig){ sig=sg; sel=[]; }
  let h=`<div class="hl-notice">${U.esc((v.notice||'').replace(/\bA\b/,nm(0)).replace(/\bB\b/,nm(1)))} ${v.phase==='memo'?`<b id="hmT">${Math.ceil(v.left/1000)}</b>초`:''}</div>`;
  h+=`<div class="info">${v.round}/${ROUNDS}라운드 · 점수 나 <b>${v.score[me]}</b> : <b>${v.score[o]}</b> ${nm(o)}${v.cat?` · 분야 <b>${v.cat}</b>`:''}</div>`;
  if(v.board){ h+=`<div class="hm-wrap"><div class="hm-grid">${v.board.pics.map((pt,i)=>{ const gone=v.board.gone[i], L=v.board.letters[i];
      return `<button class="hm-c ${gone?'gone':''} ${sel.includes(i)?'sel':''} ${v.flip&&(v.flip.x===i||v.flip.y===i)?(v.flip.ok?'ok':'no'):''}" data-i="${i}" ${my&&!gone?'':'disabled'}>${gone?`<b>${L||'·'}</b>`:pt!=null?`<span>${PICS[pt]}</span>`:`<i>${i+1}</i>`}</button>`; }).join('')}</div>
    <div class="hm-side"><div class="hm-h">🔤 모인 글자 <small>(순서는 섞여 있어요)</small></div><div class="hm-let">${v.revealed.map(c=>`<span>${c}</span>`).join('')||'<small>아직 없음</small>'}</div>
      ${v.phase==='rend'||v.phase==='over'?`<div class="hm-ans">정답: <b>${U.esc(v.word||'')}</b></div>`:''}
      ${my?`<div class="hm-guess"><input id="hmIn" placeholder="정답 단어 (${v.cat})" autocomplete="off"><button data-a="guess">🎯 히든 미션 선언</button></div><small>틀려도 감점 없이 차례만 넘어가요</small>`:''}
      ${my&&v.board.gone.some(x=>!x)?`<div class="py-line">${sel.length?`${sel.map(x=>x+1).join('·')}번 — 한 칸 더`:'같은 그림이라고 생각하는 두 칸을 누르세요'}</div>`:''}
      ${!my&&v.phase==='play'?`<div class="py-line">${nm(v.turn)} 차례…</div>`:''}</div></div>`; }
  if(v.phase==='over') h+=`<div class="sn-score"><div class="h"><b>${v.winner==='draw'?'🤝 무승부':v.winner===me?'🎉 승리!':'😢 패배'}</b> ${v.score[me]} : ${v.score[o]}</div></div>`;
  h+=`<details class="hl-log"><summary>기록</summary>${v.log.slice(-14).reverse().map(x=>`<div>${U.esc(x).replace(/^A\b/,nm(0)).replace(/^B\b/,nm(1))}</div>`).join('')}</details>`;
  el.innerHTML=h;
  if(v.phase==='memo'){ const t0=performance.now(), L=v.left; tick=setInterval(()=>{ const e=document.getElementById('hmT'); if(!e||!e.isConnected){ clearInterval(tick); return; } e.textContent=Math.max(0,Math.ceil((L-(performance.now()-t0))/1000)); },250); }
  el.onclick=e=>{ const c=e.target.closest('.hm-c'); if(c&&!c.disabled){ const i=+c.dataset.i; if(sel.includes(i)){ sel=sel.filter(x=>x!==i); return ctx.rerender(); } sel.push(i); if(sel.length===2){ const [a,b]=sel; sel=[]; return ctx.act({k:'flip',a,b}); } return ctx.rerender(); }
    if(e.target.closest('[data-a="guess"]')){ const w=(document.getElementById('hmIn')||{}).value||''; return ctx.act({k:'guess', w}); } };
  const inp=document.getElementById('hmIn'); if(inp) inp.onkeydown=e=>{ if(e.key==='Enter') ctx.act({k:'guess', w:inp.value}); };
}
const guideSteps=[
  {t:'🧠 외우기', h:'6×6 판에 <b>같은 그림 2개씩 18쌍</b>. 라운드 전에 <b>10·20·30초</b> 동안 판을 외워요.', demo:s=>{ s.round=1; newRound(s); s.phase='memo'; s.until=Date.now()+8000; s.notice='🎙️ 1라운드 — 10초 동안 판을 외우세요! (분야: '+s.cat+')'; return s; }},
  {t:'🃏 짝 맞히기', h:'번갈아 <b>같은 그림 두 칸</b>을 눌러요. 맞히면 <b>+1</b>, 두 블록이 뒤집혀 <b>숨은 글자</b>가 공개되고 판에서 빠져요. (맞혀도 차례는 넘어가요)', demo:s=>{ s.round=1; newRound(s); s.phase='play'; s.turn=0; const p0=s.board.pics; for(let pt=0;pt<4;pt++){ const c=p0.map((x,i)=>x===pt?i:-1).filter(i=>i>=0); c.forEach(i=>s.board.gone[i]=true); } s.revealed=s.board.letters.filter((x,i)=>x&&s.board.gone[i]); s.score=[3,1]; return s; }},
  {t:'🎯 히든 미션', h:'모인 글자와 <b>분야 힌트</b>로 정답 단어를 맞혀요. 언제든 선언 가능 — 맞히면 <b>+3</b>, 라운드 끝! 틀려도 감점은 없어요.', demo:s=>{ s.round=2; newRound(s); s.phase='play'; s.turn=0; const ls=s.board.letters.map((x,i)=>x?i:-1).filter(i=>i>=0); ls.slice(0,-1).forEach(i=>{ const pt=s.board.pics[i]; s.board.pics.forEach((x,j)=>{ if(x===pt) s.board.gone[j]=true; }); }); s.revealed=s.board.letters.filter((x,i)=>x&&s.board.gone[i]); s.score=[5,4]; return s; }},
  {t:'🏁 승리', shot:false, h:'3라운드(외우는 시간 10·20·30초) 합계가 높은 쪽 승리.<div class="gd-tip">글자 없는 블록도 많아요 — 짝을 많이 맞히는 것보다 <b>글자가 나온 순간 단어를 떠올리는 게</b> 승부처!</div>'},
];
const guide=`<p><b>짝 맞히기 + 숨은 단어</b> — 1:1, 3라운드.</p><ol><li>판을 외운 뒤 번갈아 같은 그림 두 칸을 불러요(맞히면 +1, 숨은 글자 공개).</li><li>모인 글자와 분야로 정답 단어를 선언 — 맞히면 +3, 라운드 끝.</li></ol><p>합계가 높은 쪽 승리.</p>`;
window.GAMES.hiddenmission = {
  title:'히든 미션', ref:'피의 게임 「히든 미션」', emoji:'🎯', tags:['기억력','단어','두뇌서바이벌','결승'],
  tagline:'그림 짝을 맞히면 숨은 글자가 하나씩. 모인 글자로 정답 단어를 먼저 외쳐라.',
  guide, guideSteps, init, apply, mask, ai, aiDelay, render, step, stepDelay,
  reset(){ for(const k in MEM) delete MEM[k]; clearInterval(tick); tick=null; sel=[]; sig=''; },
  status:(v,ctx)=> v.winner!=null?'': v.phase==='memo'?'판을 외우세요': ctx.myTurn?'두 칸을 고르거나 정답을 선언하세요':ctx.turnText(v),
  bar:(v,i)=>`<span class="score">🎯 ${v.score[i]}</span>`,
  pulse:v=>v.score[1]-v.score[0], pulseStep:2,
};
})();
