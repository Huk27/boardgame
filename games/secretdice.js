(function(){
'use strict';
/* 시크릿 다이스 (피의 게임 시즌 2 · 4일차 데스매치). 12라운드, 번갈아 🎯 주 플레이어.
   집사가 주사위 3개를 굴림 → 주 플레이어는 원하는 것만 고정하고 나머지를 한 번 다시 굴림(3개 모두 고정은 게임 중 한 번만)
   → 두 사람이 각자 "내 주사위" 눈(1~6)을 몰래 골라 동시에 공개 → 주 플레이어가 5개로 자기 점수표 한 칸을 채움(조건이 안 되면 0점).
   상대는 주 플레이어의 조합을 망치는 눈을, 주 플레이어는 완성하는 눈을 고르는 수 싸움. 1과 6은 이어진 것으로 침.
   점수표: 1~6(그 눈의 합) · 총합 · 2·3 다이스 20 · 4연속 20 · 5연속 30 · 4 다이스 20 · 5 다이스 40(이미 썼으면 조커). 합계가 높은 쪽 승리. */
const ROUNDS=12;
const CATS=[
  {k:'1',n:'1',d:'1의 합'},{k:'2',n:'2',d:'2의 합'},{k:'3',n:'3',d:'3의 합'},{k:'4',n:'4',d:'4의 합'},{k:'5',n:'5',d:'5의 합'},{k:'6',n:'6',d:'6의 합'},
  {k:'sum',n:'총합',d:'다섯 눈의 합'},{k:'fh',n:'2·3 다이스',d:'같은 눈 2+3 → 20'},{k:'s4',n:'4연속',d:'4개 연속 → 20'},{k:'s5',n:'5연속',d:'5개 연속 → 30'},{k:'k4',n:'4 다이스',d:'같은 눈 4개 → 20'},{k:'k5',n:'5 다이스',d:'같은 눈 5개 → 40'}];
const BASE={'1':2,'2':4,'3':6,'4':8,'5':10,'6':12,sum:18,fh:7,s4:8,s5:5,k4:4,k5:2};
const FACE=['','⚀','⚁','⚂','⚃','⚄','⚅'];
const roll=()=>1+(Math.random()*6|0);
function cnt(d){ const c=[0,0,0,0,0,0,0]; for(const x of d) c[x]++; return c; }
function hasRun(c,len){ for(let st=1;st<=6;st++){ let ok=true; for(let k=0;k<len;k++){ const f=((st-1+k)%6)+1; if(!c[f]){ ok=false; break; } } if(ok) return true; } return false; }
function score(d,cat,sheet){ const c=cnt(d), five=c.some(x=>x===5), joker=five&&sheet&&sheet.k5!=null;
  if(/^[1-6]$/.test(cat)) return +cat*c[+cat];
  if(cat==='sum') return d.reduce((a,b)=>a+b,0);
  if(cat==='fh') return (c.includes(2)&&c.includes(3))||joker?20:0;
  if(cat==='s4') return hasRun(c,4)||joker?20:0;
  if(cat==='s5') return hasRun(c,5)||joker?30:0;
  if(cat==='k4') return c.some(x=>x>=4)?20:0;
  if(cat==='k5') return five?40:0; return 0; }
function init(starter){
  return {sheet:[{},{}], catPick:[null,null], round:0, main:null, dice:[], keep:[false,false,false], allKeep:[true,true], pick:[null,null], phase:'intro', turn:null, starter, winner:null, log:[], ev:0,
    notice:'🎙️ 데스매치 「시크릿 다이스」 — 주사위 셋은 운, 둘은 마음'};
}
function startRound(s){ s.round++; s.main=(s.starter+s.round-1)%2; s.dice=[]; s.keep=[false,false,false]; s.pick=[null,null]; s.catPick=[null,null]; s.rolled=0; s.phase='roll'; s.turn=null;
  s.notice=`🎙️ ${s.round}라운드 — 🎯 ${s.main?'B':'A'}가 주 플레이어`; }
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(!a) return '알 수 없는 동작';
  if(s.phase==='keep'){ if(p!==s.main||a.k!=='keep') return '주 플레이어가 고정할 주사위를 정하는 중이에요';
    const kp=[0,1,2].map(i=>!!(a.keep&&a.keep[i])); const all=kp.every(Boolean);
    if(all&&!s.allKeep[p]) return '3개 모두 고정은 이미 한 번 썼어요';
    if(all) s.allKeep[p]=false; s.keep=kp; s.phase='reroll'; s.turn=null; s.rr=0;
    s.log.push(`${s.round}R ${p?'B':'A'} 고정: ${s.dice.map((x,i)=>kp[i]?`[${x}]`:x).join(' ')}${all?' (모두 고정 — 1회권 사용)':''}`); s.ev++; return null; }
  if(s.phase==='secret'){ if(a.k!=='face') return '내 주사위 눈을 고르세요'; if(s.pick[p]!=null) return '이미 골랐어요'; const f=a.f|0; if(f<1||f>6) return '1~6 중에서 고르세요'; s.pick[p]=f; s.ev++;
    if(s.pick[0]!=null&&s.pick[1]!=null){ s.phase='reveal'; s.turn=null; } return null; }
  if(s.phase==='cat'){ if(p!==s.main||a.k!=='cat') return '주 플레이어가 칸을 고르는 중이에요'; const k=a.cat; if(!CATS.some(c=>c.k===k)) return '칸을 고르세요'; if(s.sheet[p][k]!=null) return '이미 채운 칸이에요';
    const d=s.dice.concat(s.pick), v=score(d,k,s.sheet[p]); s.sheet[p][k]=v; s.lastCat=[{p,k,v}];
    s.log.push(`${s.round}R ${p?'B':'A'} 「${CATS.find(c=>c.k===k).n}」 ${v}점 (${d.join(' ')})`); s.notice=`📝 ${p?'B':'A'} 「${CATS.find(c=>c.k===k).n}」에 ${v}점`;
    s.phase='done'; s.turn=null; s.ev++; return null; }
  return '지금은 기다릴 때예요';
}
const total=sh=>Object.values(sh).reduce((a,b)=>a+b,0);
function stepDelay(s){ if(s.winner!=null) return null;
  if(s.phase==='intro') return 2400; if(s.phase==='roll') return s.rolled<3?750:500; if(s.phase==='reroll') return 900; if(s.phase==='reveal') return 1600; if(s.phase==='done') return 2200; return null; }
function step(s){
  if(s.phase==='intro'){ startRound(s); s.ev++; return; }
  if(s.phase==='roll'){ if(s.rolled<3){ s.dice.push(roll()); s.rolled++; s.notice=`🎲 집사의 주사위 ${s.dice.join(' · ')}`; s.ev++; return; } s.phase='keep'; s.turn=s.main; s.ev++; return; }
  if(s.phase==='reroll'){ s.dice=s.dice.map((x,i)=>s.keep[i]?x:roll()); s.notice=`🎲 다시 굴림 → ${s.dice.join(' · ')} · 이제 각자 내 주사위 눈을 몰래 고르세요`; s.phase='secret'; s.turn=null; s.ev++; return; }
  if(s.phase==='reveal'){ s.notice=`🙌 공개! 🎯 ${s.main?'B':'A'} ${s.pick[s.main]} · 방해 ${s.main?'A':'B'} ${s.pick[1-s.main]}`; s.log.push(`${s.round}R 공개 — 주 ${s.pick[s.main]} / 상대 ${s.pick[1-s.main]}`); s.phase='cat'; s.turn=s.main; s.ev++; return; }
  if(s.phase==='done'){ if(s.round>=ROUNDS){ const a=total(s.sheet[0]), b=total(s.sheet[1]); s.winner=a>b?0:b>a?1:'draw'; s.phase='over'; s.notice=`🎙️ 최종 ${a} : ${b}`; s.ev++; return; } startRound(s); s.ev++; return; }
}
function mask(s,p){ const v=U.clone(s); if(s.phase==='secret') v.pick=s.pick.map((x,i)=>i===p?x:(x!=null?'?':null)); if(s.phase==='cat') v.catPick=s.catPick.map((x,i)=>i===p?x:(x?'?':null)); return v; }

/* 컴퓨터 */
function catVal(sh,d){ let best=-1e9, bk=null; for(const c of CATS){ if(sh[c.k]!=null) continue; const v=score(d,c.k,sh)-BASE[c.k]*.6; if(v>best){ best=v; bk=c.k; } } return {v:best,k:bk}; }
function matrix(shA,shB,dice){ const M=[]; for(let a=1;a<=6;a++){ M[a]=[]; for(let b=1;b<=6;b++){ const d=dice.concat([a,b]); M[a][b]=catVal(shA,d).v; } } return M; }   // a=주 플레이어 눈, b=상대 눈, 값=주 이득
function nash(M,iters=300){ // 가상 플레이로 혼합 전략 근사
  const ca=Array(7).fill(0), cb=Array(7).fill(0); let ra=1, rb=1;
  for(let t=0;t<iters;t++){ ca[ra]++; cb[rb]++;
    let ba=1,bv=-1e9; for(let a=1;a<=6;a++){ let x=0; for(let b=1;b<=6;b++) x+=M[a][b]*cb[b]; if(x>bv){bv=x;ba=a;} } ra=ba;
    let bb=1,wv=1e9; for(let b=1;b<=6;b++){ let x=0; for(let a=1;a<=6;a++) x+=M[a][b]*ca[a]; if(x<wv){wv=x;bb=b;} } rb=bb; }
  return {pa:ca.map(x=>x/iters), pb:cb.map(x=>x/iters)}; }
const sample=pr=>{ let r=Math.random(); for(let i=1;i<=6;i++){ r-=pr[i]; if(r<=0) return i; } return 6; };
function gameValue(sh,sh2,dice){ const M=matrix(sh,sh2,dice); let best=-1e9; for(let a=1;a<=6;a++){ let w=1e9; for(let b=1;b<=6;b++) w=Math.min(w,M[a][b]); best=Math.max(best,w); } return best; }
function ai(v,lvl=1){
  const me=1;
  if(v.phase==='keep'&&v.main===me){ const sh=v.sheet[me]; let best=null, bv=-1e9;
    for(let m=0;m<8;m++){ const kp=[0,1,2].map(i=>!!(m>>i&1)); if(m===7&&!v.allKeep[me]) continue;
      const free=[0,1,2].filter(i=>!kp[i]); let tot=0, n=0; const N= lvl===0?12: free.length<=2?Math.pow(6,free.length):60;
      for(let t=0;t<N;t++){ const d=v.dice.slice(); if(free.length<=2&&lvl>0){ let x=t; for(const i of free){ d[i]=1+x%6; x=Math.floor(x/6); } } else for(const i of free) d[i]=roll(); tot+=gameValue(sh,v.sheet[1-me],d); n++; }
      let ev=tot/n; if(m===7) ev-=3;   // 한 번뿐인 권리는 아껴 둠
      ev += (lvl===0?Math.random()*8:Math.random()*.5); if(ev>bv){ bv=ev; best=kp; } }
    return {k:'keep', keep:best}; }
  if(v.phase==='secret'&&v.pick[me]==null){ const M=matrix(v.sheet[v.main],v.sheet[1-v.main],v.dice);
    if(lvl===0) return {k:'face', f:1+(Math.random()*6|0)};
    if(lvl===1){ if(v.main===me){ let best=1,bv=-1e9; for(let a=1;a<=6;a++){ let avg=0; for(let b=1;b<=6;b++) avg+=M[a][b]; if(avg>bv){bv=avg;best=a;} } return {k:'face',f:Math.random()<.75?best:1+(Math.random()*6|0)}; }
      let best=1,bv=1e9; for(let b=1;b<=6;b++){ let mx=-1e9; for(let a=1;a<=6;a++) mx=Math.max(mx,M[a][b]); if(mx<bv){bv=mx;best=b;} } return {k:'face',f:Math.random()<.75?best:1+(Math.random()*6|0)}; }
    const ne=nash(M); return {k:'face', f: v.main===me ? sample(ne.pa) : sample(ne.pb)}; }
  if(v.phase==='cat'&&v.main===me){ const d=v.dice.concat(v.pick); const r=catVal(v.sheet[me],d); return {k:'cat', cat:r.k}; }
  return null;
}
function aiDelay(v){ if(v.phase==='secret') return 1400+Math.random()*2400; if(v.phase==='keep') return 1500+Math.random()*1500; return 1100+Math.random()*1000; }

/* 화면 */
let keepSel=[false,false,false], sig='';
const die=(x,cls='')=>`<span class="sd-d ${cls}">${x==null?'':x==='?'?'?':FACE[x]}</span>`;
function render(el,v,ctx){
  const me=ctx.mode==='local'?(v.phase==='secret'?(v.pick[0]==null?0:1):v.turn==null?0:v.turn):ctx.me, o=1-me;
  const sg=v.round+':'+v.phase; if(sg!==sig){ sig=sg; keepSel=[false,false,false]; }
  const nm=p=>ctx.mode==='local'?(p?'🔵 B':'🔴 A'):p===ctx.me?'나':(ctx.mode==='solo'?'상대':U.esc(ctx.name(p)));
  let h=`<div class="vr-speech">${U.esc((v.notice||'').replace(/\bA\b/g,nm(0)).replace(/\bB\b/g,nm(1)))}</div>`;
  h+=`<div class="info">${v.round}/${ROUNDS}라운드 · 🎯 주 플레이어: <b>${v.main==null?'-':nm(v.main)}</b> · 합계 ${nm(0)} <b>${total(v.sheet[0])}</b> : <b>${total(v.sheet[1])}</b> ${nm(1)}</div>`;
  if(v.round>0){ const showPick=v.phase==='reveal'||v.phase==='cat'||v.phase==='done'||v.phase==='over';
    const pk=p=> v.pick[p]==null ? die(null,'empty') : (showPick||p===me) && v.pick[p]!=='?' ? die(v.pick[p], p===v.main?'main':'opp') : die('?','back');
    const canKeep = v.phase==='keep'&&v.main===me&&ctx.myTurn;
    h+=`<div class="sd-table"><div class="sd-who">${v.main===me?'🎯 나(주)':'나'}<br>${pk(me)}</div>
      <div class="sd-center">${v.dice.map((x,i)=>`<button class="sd-d ${(canKeep?keepSel[i]:v.keep[i]&&v.phase!=='roll')?'kept':''}" data-dk="${i}" ${canKeep?'':'disabled'}>${FACE[x]}</button>`).join('')}<div class="sd-lab">집사의 주사위</div></div>
      <div class="sd-who">${v.main===o?'🎯 상대(주)':'상대'}<br>${pk(o)}</div></div>`;
    if(canKeep){ const all=keepSel.every(Boolean); h+=`<div class="fh-act"><small>고정할 주사위를 누르세요 (나머지는 다시 굴려요)</small><button data-a="keep" ${all&&!v.allKeep[me]?'disabled':''}>${all?'🔒 모두 고정 (1회권)':`🎲 ${keepSel.filter(x=>!x).length}개 다시 굴리기`}</button></div>`; }
    if(v.phase==='secret'&&v.pick[me]==null&&(ctx.myTurn||ctx.mode!=='solo'||true)){ const isMain=v.main===me;
      const prev=f=>{ const sh=v.sheet[v.main]; let best=0,bk=''; for(const c of CATS){ if(sh[c.k]!=null) continue; const x=score(v.dice.concat([f, isMain?0:0]).filter(Boolean),c.k,sh); if(x>best){best=x;bk=c.n;} } return bk?`${bk} ${best}`:''; };
      h+=`<div class="vr-card"><b>${isMain?'🎯 내 주사위 눈 — 조합을 완성하세요':'🛡️ 방해 주사위 눈 — 상대 조합을 망치세요'}</b><p>상대도 동시에 고르고 있어요. 같이 공개돼요.</p><div class="sd-pick">${[1,2,3,4,5,6].map(f=>`<button data-f="${f}">${FACE[f]}<small>${f}</small></button>`).join('')}</div></div>`; }
    else if(v.phase==='secret') h+=`<div class="info">상대가 고르는 중…</div>`;
    if(v.phase==='cat'&&v.main===me&&ctx.myTurn){ const d=v.dice.concat(v.pick); h+=`<div class="vr-card"><b>📝 점수표에 적을 칸</b> <small>주사위 ${d.join(' ')}</small><div class="sd-cats">${CATS.filter(c=>v.sheet[me][c.k]==null).map(c=>`<button data-cat="${c.k}">${c.n} <b>${score(d,c.k,v.sheet[me])}</b></button>`).join('')}</div></div>`; }
  }
  h+=`<div class="sd-sheets"><table><tr><th>칸</th><th>${nm(0)}</th><th>${nm(1)}</th></tr>${CATS.map(c=>`<tr><td title="${c.d}">${c.n}</td>${[0,1].map(p=>`<td class="${v.lastCat&&v.lastCat.some(x=>x.p===p&&x.k===c.k)?'new':''}">${v.sheet[p][c.k]!=null?v.sheet[p][c.k]:'·'}</td>`).join('')}</tr>`).join('')}<tr class="tot"><td>합계</td><td>${total(v.sheet[0])}</td><td>${total(v.sheet[1])}</td></tr></table><small>각자 주 플레이어일 때만 한 칸씩 — 12칸 중 6칸을 골라 채워요. 모두 고정 1회권: ${nm(0)} ${v.allKeep[0]?'남음':'씀'} · ${nm(1)} ${v.allKeep[1]?'남음':'씀'}</small></div>`;
  h+=`<details class="hl-log"><summary>기록</summary>${v.log.slice(-14).reverse().map(x=>`<div>${U.esc(x).replace(/ A /,' '+nm(0)+' ').replace(/ B /,' '+nm(1)+' ')}</div>`).join('')}</details>`;
  el.innerHTML=h;
  el.onclick=e=>{ const k=e.target.closest('[data-dk]'); if(k&&!k.disabled){ const i=+k.dataset.dk; keepSel[i]=!keepSel[i]; return ctx.rerender(); }
    const a=e.target.closest('[data-a="keep"]'); if(a&&!a.disabled){ const kp=keepSel.slice(); keepSel=[false,false,false]; return ctx.act({k:'keep',keep:kp}); }
    const f=e.target.closest('[data-f]'); if(f) return ctx.act({k:'face',f:+f.dataset.f});
    const c=e.target.closest('[data-cat]'); if(c) return ctx.act({k:'cat',cat:c.dataset.cat}); };
}
const guide=`
<p><b>주사위 3개는 운, 2개는 마음</b> — 1:1, ${ROUNDS}라운드, 번갈아 🎯 주 플레이어.</p>
<ol><li>집사가 주사위 <b>3개</b>를 굴려요. 주 플레이어는 마음에 드는 것만 <b>고정</b>하고 나머지를 <b>한 번</b> 다시 굴려요(3개 모두 고정은 게임 중 1번).</li>
<li>그다음 둘이 각자 <b>내 주사위 눈(1~6)을 몰래</b> 골라 동시에 공개 — 주 플레이어는 조합을 완성하려고, 상대는 망치려고!</li>
<li>주 플레이어는 5개로 <b>자기 점수표</b> 한 칸을 채워요(안 되면 0점). 각자 6번씩 주 플레이어가 되니 12칸 중 6칸을 고르게 돼요.</li></ol>
<p>점수표: <b>1~6</b>(그 눈의 합) · <b>총합</b> · <b>2·3 다이스</b>(같은 눈 2개+3개) 20 · <b>4연속</b> 20 · <b>5연속</b> 30 · <b>4 다이스</b> 20 · <b>5 다이스</b> 40(이미 썼으면 조커로 다른 조합 칸 인정). <b>1과 6은 이어진 것</b>으로 쳐요(5-6-1-2도 연속).</p>
<div class="tipbox">💡 상대가 뭘 노리는지 생각해 보세요 — 4연속이 한 칸 모자라면 상대는 그 숫자를 절대 안 줄 거예요. 대신 두 가지 길을 열어 두면 막기 어려워요!</div>`;
window.GAMES.secretdice = {
  title:'시크릿 다이스', ref:'피의 게임 「시크릿 다이스」', emoji:'🎲', tags:['주사위','심리전','두뇌서바이벌','데스매치'],
  tagline:'집사의 주사위 3개 + 몰래 고른 내 눈과 상대 눈. 상대는 내 조합을 망치려 한다.',
  guide, init, apply, mask, ai, aiDelay, render, step, stepDelay,
  reset(){ keepSel=[false,false,false]; sig=''; },
  status:(v,ctx)=> v.winner!=null?'': v.phase==='keep'&&v.main===ctx.me?'고정할 주사위를 고르세요': v.phase==='secret'&&v.pick[ctx.me]==null?'내 주사위 눈을 몰래 고르세요': v.phase==='cat'&&v.main===ctx.me?'점수표 칸을 고르세요':'진행 중…',
  bar:(v,i)=>`<span class="score">🎲 ${total(v.sheet[i])}</span>`,
  pulse:v=>(total(v.sheet[1])-total(v.sheet[0]))/10, pulseStep:2,
};
})();
