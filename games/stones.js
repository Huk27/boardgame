(function(){
'use strict';
/* 아홉 돌 쟁탈전: 6색 × 1~9 = 54장, 손패 6장. 돌 9개가 한 줄.
   내 차례: 손에서 한 장을 아직 안 끝난 돌의 내 쪽에 놓고(돌마다 한쪽 최대 3장) 한 장 뽑기.
   돌 양쪽에 3장씩 차면 족보 비교: 같은 색 연속 > 같은 숫자 셋 > 같은 색 > 연속 > 합. 족보가 같으면 합, 그것도 같으면 먼저 3장을 채운 쪽.
   돌 5개 또는 붙어 있는 돌 3개를 먼저 차지하면 승리. 놓을 곳이 없거나 카드가 다 떨어지면 돌 많은 쪽. */
const COLS=['🔴','🟠','🟡','🟢','🔵','🟣'], CN=['빨강','주황','노랑','초록','파랑','보라'];
const KIND=['합','연속','같은 색','셋 같은 수','같은 색 연속'];
function init(starter){
  const d=[]; for(let c=0;c<6;c++) for(let n=1;n<=9;n++) d.push({c,n}); U.shuffle(d);
  return {deck:d, hand:[d.splice(0,6), d.splice(0,6)], side:[...Array(9)].map(()=>[[],[]]), fullAt:[...Array(9)].map(()=>[null,null]), owner:Array(9).fill(null), turn:starter, starter, t:0, last:null, winner:null, ev:0};
}
function rank(cards){   // 3장 족보 점수 (클수록 셈)
  const ns=cards.map(x=>x.n).sort((a,b)=>a-b), sum=ns[0]+ns[1]+ns[2];
  const flush=cards.every(x=>x.c===cards[0].c), run=ns[1]===ns[0]+1&&ns[2]===ns[1]+1, three=ns[0]===ns[2];
  const k = flush&&run?4 : three?3 : flush?2 : run?1 : 0;
  return {k, score:k*100+sum};
}
function decide(s,i){
  const A=s.side[i][0], B=s.side[i][1]; if(A.length<3||B.length<3||s.owner[i]!=null) return;
  const a=rank(A).score, b=rank(B).score;
  s.owner[i] = a>b?0 : b>a?1 : (s.fullAt[i][0]<s.fullAt[i][1]?0:1);
}
function checkWin(s){
  for(const p of [0,1]){ const mine=s.owner.map(o=>o===p); if(mine.filter(Boolean).length>=5) return p; for(let i=0;i<7;i++) if(mine[i]&&mine[i+1]&&mine[i+2]) return p; }
  return null;
}
const canPlace=(s,p,i)=> s.owner[i]==null && s.side[i][p].length<3;
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(s.turn!==p) return '상대 차례예요';
  if(!a||a.k!=='play') return '알 수 없는 동작';
  const H=s.hand[p], h=a.h|0, i=a.i|0;
  if(!(h>=0&&h<H.length)) return '카드를 고르세요';
  if(!(i>=0&&i<9)) return '돌을 고르세요';
  if(!canPlace(s,p,i)) return '그 돌엔 더 놓을 수 없어요';
  const card=H.splice(h,1)[0]; s.side[i][p].push(card); s.t++; s.ev++;
  if(s.side[i][p].length===3) s.fullAt[i][p]=s.t;
  decide(s,i);
  s.last={p,i,card,won:s.owner[i]};
  if(s.deck.length) H.push(s.deck.pop());
  const w=checkWin(s); if(w!=null){ s.winner=w; s.turn=null; return null; }
  const o=1-p, any=q=>s.hand[q].length && [...Array(9).keys()].some(j=>canPlace(s,q,j));
  if(any(o)) s.turn=o; else if(any(p)) s.turn=p;
  else { const c0=s.owner.filter(x=>x===0).length, c1=s.owner.filter(x=>x===1).length; s.winner=c0>c1?0:c1>c0?1:'draw'; s.turn=null; }
  return null;
}
function mask(s,p){ const v=U.clone(s); v.deck=s.deck.length; if(s.winner==null) v.hand[1-p]=s.hand[1-p].length; return v; }

/* 컴퓨터 (사람처럼): 놓인 카드로 만들 수 있는 족보를 어림잡아, 가장 좋아지는 돌에 놓음.
   이미 진 돌·의미 없는 돌엔 작은 카드를 버림. 상대가 셀 것 같은 돌은 일찍 포기, 이길 돌은 마무리. 쉬움은 대충. */
/* 카드 세기 (어려움): av(c,n) = 그 카드를 앞으로 쓸 수 있는 정도 (내 손에 있으면 1, 아직 안 나왔으면 0.5, 판에 나왔으면 0) */
function potential2(cards,av){
  if(cards.length!==2) return potential(cards);
  const [a,b]=cards.slice().sort((x,y)=>x.n-y.n), sum=a.n+b.n, ok=n=>n>=1&&n<=9;
  const best=(list)=>list.reduce((m,x)=>Math.max(m,x),0);
  let pSF=0, pRun=0, pThree=0, pFl=0;
  if(a.c===b.c){ const need = b.n-a.n===1 ? [a.n-1,b.n+1] : b.n-a.n===2 ? [a.n+1] : []; pSF=best(need.filter(ok).map(n=>av(a.c,n)));
    let cnt=0; for(let n=1;n<=9;n++) if(n!==a.n&&n!==b.n) cnt+=av(a.c,n); pFl=Math.min(1,cnt/2.5); }
  if(a.n===b.n){ let m=0; for(let c=0;c<6;c++) if(c!==a.c&&c!==b.c) m=Math.max(m,av(c,a.n)); pThree=m; }
  { const need = b.n-a.n===1 ? [a.n-1,b.n+1] : b.n-a.n===2 ? [a.n+1] : []; let m=0; for(const n of need.filter(ok)) for(let c=0;c<6;c++) m=Math.max(m,av(c,n)); pRun=m; }
  // 기존 점수 체계 그대로, 완성 못 하는 족보는 빼고(0), 내 손에 있으면 조금 더(1.15)
  const f=p=> p>=1 ? 1.15 : p>0 ? 1 : 0, gap=b.n-a.n;
  const cand=[[3.3, a.c===b.c&&gap>=1&&gap<=2 ? f(pSF) : 0], [2.6, a.n===b.n ? f(pThree) : 0], [2, a.c===b.c ? f(pFl) : 0], [1, gap>=1&&gap<=2 ? f(pRun) : 0], [.2,1]];
  const k=Math.max(...cand.map(([kv,fa])=>kv*fa));
  return k*100 + sum/2*3 + 3;
}
function potential(cards){   // 1~3장 → 기대 족보 점수
  if(!cards.length) return 150;
  if(cards.length===3) return rank(cards).score;
  const ns=cards.map(x=>x.n).sort((a,b)=>a-b), sum=ns.reduce((a,b)=>a+b,0), avg=sum/cards.length;
  const sameC=cards.every(x=>x.c===cards[0].c), gap=ns[ns.length-1]-ns[0], sameN=ns[0]===ns[ns.length-1];
  let k=0;
  if(cards.length===1) k=1.3;
  else if(sameC && gap>=1 && gap<=2) k=3.3; else if(sameN) k=2.6; else if(sameC) k=2; else if(gap>=1&&gap<=2) k=1; else k=.2;
  return k*100 + avg*3 + 3;
}
let saidEv=-1;
function say(v,list,pr){ if(typeof showSay==='function' && saidEv!==v.ev && Math.random()<pr){ saidEv=v.ev; setTimeout(()=>showSay(1,U.pick(list),2800),250); } }
function ai(v,lvl=1){
  if(v.turn!==1||v.winner!=null) return null;
  const me=1, op=0, H=v.hand[me]; let best=null, bs=-1e9; const all=[];
  // 어려움: 판에 나온 카드·내 손패를 세어서 족보 완성 가능성을 따짐
  let P=potential, PH=potential;
  if(lvl===2){ const onBoard=new Set(), inHand=new Set(); v.side.forEach(sd=>sd.forEach(cs=>cs.forEach(x=>onBoard.add(x.c*10+x.n)))); H.forEach(x=>inHand.add(x.c*10+x.n));
    const avMe=(c,n)=> inHand.has(c*10+n)?1 : onBoard.has(c*10+n)?0 : .5, avHe=(c,n)=> inHand.has(c*10+n)||onBoard.has(c*10+n)?0 : .5;
    P=cs=>potential2(cs,avMe); PH=cs=>potential2(cs,avHe); }
  for(let h=0;h<H.length;h++) for(let i=0;i<9;i++){
    if(v.owner[i]!=null || v.side[i][me].length>=3) continue;
    const mine=v.side[i][me], his=v.side[i][op], after=mine.concat(H[h]);
    let sc = P(after) - P(mine);
    const hisP=PH(his), myP=P(after);
    // 상대가 이미 훨씬 센 돌엔 힘 빼지 않음 (작은 카드 버리는 곳으로)
    if(his.length>=2 && hisP-myP>120) sc = -H[h].n*4 + (lvl>0?-30:0);
    // 내가 이길 돌을 마무리
    if(after.length===3 && his.length===3 && rank(after).score>rank(his).score) sc+=200;
    if(after.length===3 && his.length===3 && rank(after).score<=rank(his).score) sc-=150;
    // 붙은 돌 3개 노리기 (어려움)
    if(lvl===2){ const his2=j=>j>=0&&j<9&&v.owner[j]===op; if(his2(i-1)&&his2(i+1)||his2(i-2)&&his2(i-1)||his2(i+1)&&his2(i+2)) sc+= P(after)>=PH(his) ? 60 : 20;   // 상대 붙은 돌 3개 막기
      const own=j=>j>=0&&j<9&&v.owner[j]===me; if(own(i-1)||own(i+1)) sc+=15; if(own(i-1)&&own(i+1)||own(i-2)&&own(i-1)||own(i+1)&&own(i+2)) sc+=40; }
    // 빈 돌을 아무 데나 여는 건 조금 손해 (사람처럼 한 군데씩 집중)
    if(!mine.length && lvl>0) sc+=25;   // 여러 돌에 고루 걸어 두는 편이 유리 (시뮬레이션으로 확인)
    sc+=Math.random()*[80,12,4][lvl];
    all.push({sc,a:{k:'play',h,i}}); if(sc>bs){ bs=sc; best={k:'play',h,i}; }
  }
  // 보통: 가끔(25%) 괜찮아 보이는 수 중 아무거나
  if(lvl===1 && all.length>1 && Math.random()<.25){ all.sort((x,y)=>y.sc-x.sc); best=U.pick(all.slice(0,5)).a; }
  if(best){ const after=v.side[best.i][me].concat(H[best.h]), his=v.side[best.i][op];
    if(after.length===3 && his.length===3 && rank(after).score>rank(his).score) say(v,['이 돌은 제 거네요 😎','하나 가져갑니다~'],.6);
    else if(after.length===3 && rank(after).k>=3) say(v,['오 족보 좋다 ㅎㅎ','이건 못 이기실걸요?'],.5); }
  return best;
}

/* 화면 */
let sel=null, lastEv=-1;
const cardHTML=(x,cls='')=> x ? `<span class="st-c c${x.c} ${cls}">${x.n}</span>` : '';
function render(el,v,ctx){
  const me=ctx.me, o=1-me, who=i=> i===me&&ctx.mode!=='local' ? '나' : U.esc(ctx.name(i));
  if(v.ev!==lastEv){ lastEv=v.ev; sel=null; }
  const myTurn=ctx.myTurn && v.winner==null, H=Array.isArray(v.hand[me])?v.hand[me]:[];
  const cnt=p=>v.owner.filter(x=>x===p).length;
  let h=`<div class="info">돌 ${who(me)} <b>${cnt(me)}</b> : ${who(o)} <b>${cnt(o)}</b> · 5개 또는 붙은 3개면 승리 · 남은 더미 ${v.deck}장</div>`;
  h+=`<div class="st-board">`;
  for(let i=0;i<9;i++){
    const ok = myTurn && sel!=null && v.owner[i]==null && v.side[i][me].length<3;
    const R=p=> v.side[i][p].length===3 ? `<small>${KIND[rank(v.side[i][p]).k]}</small>` : '<small>&nbsp;</small>';
    h+=`<div class="st-col ${ok?'can':''}" data-i="${i}">
      ${R(o)}<div class="st-side op">${v.side[i][o].map(x=>cardHTML(x)).join('')}</div>
      <div class="st-stone ${v.owner[i]===me?'me':v.owner[i]===o?'op':''} ${v.last&&v.last.i===i?'last':''}">${v.owner[i]===me?'🏳️':v.owner[i]===o?'🚩':'🪨'}</div>
      <div class="st-side">${v.side[i][me].map(x=>cardHTML(x)).join('')}</div>${R(me)}</div>`;
  }
  h+=`</div>`;
  const L=v.last; if(L) h+=`<div class="st-last">${who(L.p)}: ${i18(L)}</div>`;
  h+=`<div class="st-hand">${H.map((x,j)=>`<button class="st-c c${x.c} big ${sel===j?'sel':''}" data-h="${j}">${x.n}</button>`).join('')}</div>`;
  if(myTurn) h+=`<div class="fh-act"><small class="muted">${sel==null?'카드를 고른 뒤 놓을 돌을 누르세요':'놓을 돌(빨간 테두리)을 누르세요'}</small></div>`;
  el.innerHTML=h;
  el.onclick=e=>{
    const c=e.target.closest('[data-h]'); if(c){ if(!myTurn) return; const j=+c.dataset.h; sel = sel===j?null:j; ctx.rerender(); return; }
    const col=e.target.closest('.st-col'); if(col && myTurn && sel!=null){ ctx.act({k:'play', h:sel, i:+col.dataset.i}); }
  };
  function i18(L){ return `${COLS[L.card.c]}${L.card.n} → ${L.i+1}번 돌${L.won!=null?` · ${who(L.won)} ${L.i+1}번 돌 차지!`:''}`; }
}
function status(v,ctx){
  if(v.winner!=null) return '';
  return ctx.myTurn ? '카드 한 장을 돌에 놓으세요' : ctx.turnText(v);
}
const guide=`
<p>돌 9개를 사이에 두고 카드를 놓아 돌을 차지하는 게임이에요. 카드는 6색(🔴🟠🟡🟢🔵🟣) × 1~9.</p>
<ul><li>내 차례: 손패(6장)에서 한 장을 아직 안 끝난 돌의 <b>내 쪽</b>에 놓고, 한 장 뽑아요. 돌마다 한쪽에 3장까지.</li>
<li>돌 양쪽에 3장씩 차면 바로 비교해서 센 쪽이 차지해요. 족보 순서:<br><b>같은 색 연속</b>(🔵3·4·5) &gt; <b>같은 숫자 셋</b>(7·7·7) &gt; <b>같은 색</b> &gt; <b>연속</b>(색 상관없이 4·5·6) &gt; <b>합</b>. 족보가 같으면 합이 큰 쪽, 그것도 같으면 <b>먼저 3장을 채운 쪽</b>.</li>
<li><b>돌 5개</b>를 먼저 차지하거나, <b>붙어 있는 돌 3개</b>를 먼저 차지하면 승리!</li></ul>
<div class="tipbox">💡 <b>팁</b><br>
· 같은 색 연속을 노리다 안 나오면 같은 색이나 연속으로 타협하세요.<br>
· 질 것 같은 돌엔 작은 카드를 버려서 손을 정리하세요. 손에 큰 카드를 아껴 두는 게 중요해요.<br>
· 상대가 붙은 돌 2개를 가졌다면 그 옆 돌은 꼭 막으세요!</div>`;
window.GAMES.stones = {
  title:'아홉 돌 쟁탈전', ref:'쇼텐 토텐', emoji:'🪨', tags:['전략','카드','클래식'],
  pulse:v=>v.owner.filter(x=>x===1).length-v.owner.filter(x=>x===0).length, pulseStep:2,
  tagline:'돌 9개 사이에 카드 3장씩. 포커 족보로 돌을 차지하는 2인 카드 전투.',
  guide, init, apply, mask, ai, render, status,
  aiDelay:()=>1200+Math.random()*1500,
  reset(){ sel=null; lastEv=-1; saidEv=-1; },
  bar:(v,i)=>`<span class="score">${v.owner.filter(x=>x===i).length}</span><span class="tag">돌</span>`,
};
})();
