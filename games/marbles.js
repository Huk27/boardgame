(function(){
'use strict';
/* 홀짝 구슬: 각자 구슬 10개. 숨기는 사람이 손에 몇 개 쥐면, 맞히는 사람이 홀/짝과 걸 구슬 수를 정함.
   맞히면 건 만큼 받고, 틀리면 건 만큼 줌. 역할은 번갈아. 상대 구슬을 다 따거나, 20판 뒤 많은 쪽 승. */
const START=10, MAXR=20;
function init(starter){ return {m:[START,START], hider:starter, phase:'hide', hidden:null, guess:null, bet:null, round:1, hist:[], turn:starter, starter, winner:null, result:null}; }
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(!a) return '알 수 없는 동작';
  const g=1-s.hider;
  if(a.k==='hide'){
    if(s.phase!=='hide'||p!==s.hider) return '지금은 구슬을 숨길 차례가 아니에요';
    const n=a.n|0; if(n<1||n>s.m[p]) return `1~${s.m[p]}개 사이로 쥐세요`;
    s.hidden=n; s.phase='guess'; s.turn=g; return null;
  }
  if(a.k==='guess'){
    if(s.phase!=='guess'||p!==g) return '지금은 맞힐 차례가 아니에요';
    const odd=!!a.odd, b=a.bet|0, cap=Math.min(s.m[g],s.m[s.hider]);
    if(b<1||b>cap) return `1~${cap}개까지 걸 수 있어요`;
    s.guess=odd; s.bet=b; s.phase='reveal'; s.turn=null; return null;
  }
  return '알 수 없는 동작';
}
// 주먹 펴기 → 결과 → 다음 판 (시간차)
function resolve(s){
  const h=s.hider, g=1-h, odd=s.hidden%2===1, ok=odd===s.guess;
  const amt=Math.min(s.bet, ok?s.m[h]:s.m[g]);
  if(ok){ s.m[h]-=amt; s.m[g]+=amt; } else { s.m[g]-=amt; s.m[h]+=amt; }
  s.result={ok, amt, hidden:s.hidden, guess:s.guess, hider:h};
  s.hist.push({round:s.round, hider:h, n:s.hidden, guess:s.guess, bet:s.bet, ok});
  s.phase='result';
  if(s.m[0]<=0||s.m[1]<=0){ s.winner=s.m[0]>0?0:1; s.turn=null; return; }
  if(s.round>=MAXR){ s.winner=s.m[0]>s.m[1]?0:s.m[1]>s.m[0]?1:'draw'; s.turn=null; }
}
function next(s){ s.round++; s.hider=1-s.hider; s.phase='hide'; s.hidden=null; s.guess=null; s.bet=null; s.result=null; s.turn=s.hider; }
const stepDelay=s=> s.winner!=null ? null : s.phase==='reveal' ? 2200 : s.phase==='result' ? 3400 : null;
function step(s){ if(s.phase==='reveal') resolve(s); else if(s.phase==='result') next(s); }
function mask(s,p){
  const v=U.clone(s);
  if(s.hidden!=null && p!==s.hider && (s.phase==='hide'||s.phase==='guess')) v.hidden=null;   // 쥔 개수는 펼 때까지 비밀
  if(s.phase==='reveal' && p!==s.hider) v.hidden=null;   // 뜸 들이는 중
  return v;
}

/* 컴퓨터: 사람처럼 상대 버릇을 읽음.
   - 상대가 홀을 자주 쥐는지(빈도), 지난번과 번갈아 바꾸는 버릇이 있는지(바꿈 비율)를 보고 다음 홀짝을 짐작
   - 내가 숨길 땐, 상대가 맞힐 때 자주 고르는 쪽의 반대로 쥠
   - 확신이 들면 크게 걸고, 버릇이 뚜렷하면 가끔 말로 찌름. 실력: 쉬움은 거의 안 읽음 */
function predict(seq){   // seq: 상대의 지난 선택(true=홀) → {p: 다음이 홀일 확률, why}
  if(seq.length<3) return {p:.5, why:null};
  const odd=seq.filter(x=>x).length/seq.length;
  let sw=0; for(let i=1;i<seq.length;i++) if(seq[i]!==seq[i-1]) sw++; const swRate=sw/(seq.length-1);
  const last=seq[seq.length-1];
  const pSw = swRate>.5 ? (last ? 1-swRate : swRate) : (last ? 1-swRate : swRate);   // 바꿈 비율로 본 다음이 홀일 확률
  const a=Math.abs(odd-.5), b=Math.abs(pSw-.5);
  if(a<.12 && b<.12) return {p:.5, why:null};
  return a>=b ? {p:odd, why: odd>.5?'odd':'even'} : {p:pSw, why: swRate>.5?'switch':'stay'};
}
let saidR=-9;
function tease(v,why){
  if(!why || typeof showSay!=='function' || v.round-saidR<4 || (saidR>0 && Math.random()<.5)) return; saidR=v.round;
  const L={odd:['홀수 좋아하시네요~','또 홀이죠? ㅎㅎ'], even:['짝수만 쥐시던데요 😏','이번에도 짝?'], switch:['번갈아 바꾸시는 거 다 봤어요~','이번엔 바꿀 차례죠? ㅎ'], stay:['한 번 정하면 잘 안 바꾸시네요','또 같은 거 쥐셨죠?']}[why];
  setTimeout(()=>showSay(1, U.pick(L), 3500), 300);
}
function ai(v,lvl=1){
  const me=1, o=0, use=[.15,.6,1][lvl];
  if(v.round===1) saidR=-9;
  if(v.phase==='hide' && v.hider===me){
    // 상대가 맞힐 때 고른 홀짝을 읽고 반대로
    const pr=predict(v.hist.filter(h=>h.hider===me).map(h=>h.guess));
    const pOddGuess=.5+(pr.p-.5)*use, wantOdd = Math.random() < 1-pOddGuess;
    const cap=Math.min(v.m[me],7), cand=[]; for(let n=1;n<=cap;n++) if((n%2===1)===wantOdd) cand.push(n);
    return {k:'hide', n: cand.length ? U.pick(cand) : 1+(Math.random()*cap|0)};
  }
  if(v.phase==='guess' && v.hider===o){
    const pr=predict(v.hist.filter(h=>h.hider===o).map(h=>h.n%2===1));
    const p=.5+(pr.p-.5)*use, odd = lvl===0 ? Math.random()<p : (Math.abs(p-.5)<.05 ? Math.random()<.5 : p>.5 ? Math.random()<[0,.85,.95][lvl] : Math.random()<[1,.15,.05][lvl]);
    const conf=Math.abs(p-.5);   // 0~0.5
    const cap=Math.min(v.m[me],v.m[o]), diff=v.m[me]-v.m[o];
    let b = lvl===0 ? 1+(Math.random()*Math.min(cap,3)|0) : diff>4 ? 1+(Math.random()*2|0) : diff<-4 ? Math.ceil(cap*(.5+Math.random()*.5)) : 1+(Math.random()*Math.min(cap,4)|0);
    if(lvl>0 && conf>.2) b=Math.max(b, Math.ceil(cap*(.4+conf)));   // 확신이 서면 크게
    if(lvl>0) tease(v, conf>.15 ? pr.why : null);
    return {k:'guess', odd, bet:Math.max(1,Math.min(cap,b))};
  }
  return null;
}

/* 화면 */
let pick=3, bet=2, oddPick=null, sig='';
const balls=n=>`<span class="mb-balls">${Array.from({length:Math.min(n,20)},()=>'<i></i>').join('')}</span>`;
function render(el,v,ctx){
  const me=ctx.me, o=1-me, h=v.hider, hiderIsMe=h===me && ctx.mode!=='local' || (ctx.mode==='local' && v.turn===h);
  const sg=v.round+':'+v.phase; if(sg!==sig){ sig=sg; oddPick=null; pick=Math.min(pick,Math.max(1,v.m[h])); bet=Math.max(1,Math.min(bet,Math.min(v.m[1-h],v.m[h]))); }
  const who=i=> i===me && ctx.mode!=='local' ? '나' : U.esc(ctx.name(i));
  let h2=`<div class="info">${v.round} / ${MAXR}판 · 숨기는 사람 <b>${who(h)}</b> · 맞히는 사람 <b>${who(1-h)}</b></div>`;
  // 가운데: 주먹
  let fist='✊', inside='<b class="mb-q">?</b>';
  if(v.phase==='hide') { fist='🤲'; inside = h===me&&ctx.mode!=='local' ? `<small>몇 개 쥘지 정하세요</small>` : `<small>${who(h)}이(가) 구슬을 고르는 중…</small>`; }
  if(v.phase==='guess' && v.hidden!=null) inside=`<small>내가 쥔 구슬</small>${balls(v.hidden)}<b>${v.hidden}개</b>`;
  if(v.phase==='reveal') { fist='✊'; inside=`<b class="mb-q shake">…</b><small>${who(1-h)}: ${v.guess?'홀':'짝'}에 ${v.bet}개!</small>`; }
  if(v.phase==='result'||(v.result&&v.winner!=null)) { const r=v.result; fist='🖐️'; inside=`${balls(r.hidden)}<b>${r.hidden}개 → ${r.hidden%2?'홀':'짝'}</b><small class="${r.ok?'ok':'no'}">${who(1-r.hider)} ${r.ok?`맞힘! +${r.amt}`:`틀림… −${r.amt}`}</small>`; }
  h2+=`<div class="mb-stage"><div class="mb-fist ${v.phase==='result'?'open':''}">${fist}</div><div class="mb-inside">${inside}</div></div>`;
  // 내 행동
  if(ctx.can && v.winner==null){
    if(v.phase==='hide' && v.turn===me){
      const cap=v.m[me];
      h2+=`<div class="fh-act"><span>몇 개 쥘까요?</span><span class="stepper"><button data-a="pm">−</button><b>${pick}</b><button data-a="pp">+</button></span><button data-a="hide">✊ 주먹 쥐기</button></div><div class="info">1~${cap}개 · 상대가 홀짝을 맞히면 건 만큼 빼앗겨요</div>`;
    } else if(v.phase==='guess' && v.turn===me){
      const cap=Math.min(v.m[me],v.m[o===h?h:o]);
      h2+=`<div class="fh-act"><button class="${oddPick===true?'':'ghost'}" data-a="odd">홀 (1·3·5…)</button><button class="${oddPick===false?'':'ghost'}" data-a="even">짝 (2·4·6…)</button></div>
        <div class="fh-act"><span>걸 구슬</span><span class="stepper"><button data-a="bm">−</button><b>${bet}</b><button data-a="bp">+</button></span><button data-a="go" ${oddPick==null?'disabled':''}>걸기!</button></div><div class="info">최대 ${Math.min(v.m[me],v.m[h])}개</div>`;
    }
  }
  if(v.hist.length){
    h2+=`<table class="hist"><tr><th>판</th><th>숨김</th><th>쥔 수</th><th>예측</th><th>건 수</th><th>결과</th></tr>${v.hist.map(x=>`<tr><td>${x.round}</td><td>${who(x.hider)}</td><td>${x.n}</td><td>${x.guess?'홀':'짝'}</td><td>${x.bet}</td><td>${x.ok?'맞힘':'틀림'}</td></tr>`).reverse().join('')}</table>`;
  }
  el.innerHTML=h2;
  el.onclick=e=>{
    const b=e.target.closest('[data-a]'); if(!b||b.disabled) return; const a=b.dataset.a;
    const capH=v.m[me], capB=Math.min(v.m[me],v.m[h]);
    if(a==='pm'){ pick=Math.max(1,pick-1); ctx.rerender(); }
    else if(a==='pp'){ pick=Math.min(capH,pick+1); ctx.rerender(); }
    else if(a==='bm'){ bet=Math.max(1,bet-1); ctx.rerender(); }
    else if(a==='bp'){ bet=Math.min(capB,bet+1); ctx.rerender(); }
    else if(a==='odd'||a==='even'){ oddPick=a==='odd'; ctx.rerender(); }
    else if(a==='hide') ctx.act({k:'hide',n:pick});
    else if(a==='go') ctx.act({k:'guess',odd:oddPick,bet});
  };
}
function status(v,ctx){
  const me=ctx.me;
  if(v.phase==='hide') return v.turn===me ? '손에 쥘 구슬 수를 정하세요 (상대에겐 안 보여요)' : '상대가 구슬을 쥐는 중…';
  if(v.phase==='guess') return v.turn===me ? '홀일까 짝일까? 고르고 구슬을 거세요' : '상대가 홀짝을 고민하는 중…';
  if(v.phase==='reveal') return '주먹을 펴기 직전…';
  return '';
}
const guide=`
<p>각자 <b>구슬 10개</b>로 시작해요. 한 명은 손에 구슬을 몰래 쥐고, 다른 한 명은 그게 <b>홀인지 짝인지</b> 맞혀요.</p>
<h3>한 판 흐름</h3>
<ol><li><b>숨기는 사람</b>: 내 구슬 중 몇 개를 쥘지 정하고 ✊ 주먹 쥐기.</li>
<li><b>맞히는 사람</b>: 홀/짝을 고르고, 구슬을 몇 개 걸지 정해요.</li>
<li>주먹을 펴서 확인! 맞히면 건 만큼 <b>상대에게서 받고</b>, 틀리면 건 만큼 <b>상대에게 줘요</b>.</li></ol>
<ul><li>판마다 역할이 바뀌어요.</li>
<li>상대 구슬을 다 따면 승리. 20판이 끝나면 구슬 많은 쪽이 승리.</li>
<li>걸 수 있는 최대치는 둘 중 적은 쪽 구슬 수예요.</li></ul>
<div class="tipbox">💡 <b>팁</b><br>
· 아래 기록에 상대가 지금까지 몇 개를 쥐었는지 남아요. 버릇을 읽어보세요.<br>
· 앞서고 있으면 작게 걸어 지키고, 밀리면 크게 걸어 뒤집는 것도 방법.<br>
· 상대도 내 버릇을 보고 있어요. 가끔은 일부러 패턴을 깨세요!<br>
· 🧠 컴퓨터(보통·어려움)는 내가 홀을 자주 쥐는지, <b>번갈아 바꾸는 버릇</b>이 있는지까지 읽어요. 읽었다 싶으면 크게 걸어요!</div>`;
window.GAMES.marbles = {
  title:'홀짝 구슬', emoji:'🔮', tags:['심리전','두뇌서바이벌','블러프'],
  pulse:v=>v.m[1]-v.m[0], pulseStep:3,
  tagline:'손에 쥔 구슬이 홀일까 짝일까? 구슬을 걸고 상대 버릇을 읽는 심리전.',
  guide, init, apply, mask, ai, render, status, step, stepDelay,
  aiDelay:()=>1400+Math.random()*2200,
  reset(){ pick=3; bet=2; oddPick=null; sig=''; },
  bar:(v,i)=>`<span class="score">🔮 ${v.m[i]}</span>`,
  result:(v,ctx)=>`구슬 ${v.m[ctx.me]} : ${v.m[1-ctx.me]}`,
};
})();
