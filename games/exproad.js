(function(){
'use strict';
/* 수식 로드 (피의 게임 시즌 2 · 5일차 팀전 머니 챌린지) — 1:1판.
   카드 = 길 모양(─ │ ┌ ┐ └ ┘, 회전 불가) + 숫자(1~10) 또는 기호(+ − × ÷). 각자 6×6 판, 왼쪽 위 칸의 왼쪽에서 들어가 오른쪽 아래 칸의 오른쪽으로 나가는
   길을 끊김 없이 이음. 길을 따라 읽은 카드가 수식 — 붙은 숫자 카드는 여러 자리 수(1과 10 → 110), 등호 없음. 값이 100이면 성공.
   봉투 찾기 → 바닥에 깔린 봉투(겉에 값은 보이고 길 모양은 열어 봐야 앎)를 번갈아 가져가기로 바꿈. 버린 카드 더미에서 가져와도 됨.
   얻은 카드는 판에 놓거나 코인을 내고 버려야 함(1~4라운드 무료, 5라운드 3코인, 끝난 뒤 남은 손패는 5코인씩). 판 위 카드는 모두 길에 있어야 함.
   5라운드(1~3라운드 4장씩, 4~5라운드 6장씩). 판정: 100 성공 → 성공한 쪽 승(둘 다면 카드 많이 쓴 쪽) / 둘 다 실패 → 100에 가까운 쪽 / 같으면 코인. */
const S=6, ROUNDS=5, PICKS=[4,4,4,6,6], COINS=20;
const OPEN={'─':{L:1,R:1}, '│':{U:1,D:1}, '┌':{R:1,D:1}, '┐':{L:1,D:1}, '└':{U:1,R:1}, '┘':{U:1,L:1}};
const SHAPES=Object.keys(OPEN);
const OPS=['+','−','×','÷'];
function makePool(){ const p=[]; let id=0; const sw=[5,5,4,4,4,4];   // 직선이 조금 더 많음
  const shape=()=>{ let r=Math.random()*26; for(let i=0;i<6;i++){ r-=sw[i]; if(r<=0) return SHAPES[i]; } return '─'; };
  for(let n=1;n<=10;n++) for(let k=0;k<6;k++) p.push({id:id++, v:String(n), s:shape()});
  for(const o of OPS) for(let k=0;k<10;k++) p.push({id:id++, v:o, s:shape()});
  return U.shuffle(p); }
const isOp=v=>OPS.includes(v);
/* 길 따라가기: 판(36칸, 카드 또는 null) → {ok, cells:[idx...], tokens} */
function trace(board){
  let r=0,c=0, from='L'; const seen=new Set(), cells=[];
  for(let g=0; g<40; g++){
    if(r<0||r>=S||c<0||c>=S) return {ok:false, cells, why:'판 밖으로 나감'};
    const i=r*S+c, t=board[i]; if(!t) return {ok:false, cells, why:'길이 끊김'};
    if(seen.has(i)) return {ok:false, cells, why:'길이 꼬임'}; seen.add(i); cells.push(i);
    const o=OPEN[t.s]; if(!o[from]) return {ok:false, cells, why:'모양이 안 맞음'};
    const out=Object.keys(o).find(d=>d!==from);
    if(i===S*S-1&&out==='R'){ const stray=board.some((x,j)=>x&&!seen.has(j)); return {ok:!stray, cells, why: stray?'길 밖에 놓인 카드가 있음':''}; }
    if(out==='R'){ c++; from='L'; } else if(out==='L'){ c--; from='R'; } else if(out==='D'){ r++; from='U'; } else { r--; from='D'; }
  }
  return {ok:false, cells, why:'길이 너무 김'};
}
function evalTokens(vals){   // vals: 문자열 배열 → 값 또는 null
  const toks=[]; for(const v of vals){ if(isOp(v)) toks.push(v); else if(toks.length&&!isOp(toks[toks.length-1])) toks[toks.length-1]+=v; else toks.push(v); }
  if(!toks.length||isOp(toks[0])||isOp(toks[toks.length-1])) return null;
  for(let i=1;i<toks.length;i++) if(isOp(toks[i])&&isOp(toks[i-1])) return null;
  // ×÷ 먼저
  const t=[+toks[0]], o=[]; for(let i=1;i<toks.length;i+=2){ const op=toks[i], x=+toks[i+1]; if(op==='×') t[t.length-1]*=x; else if(op==='÷') t[t.length-1]/=x; else { o.push(op); t.push(x); } }
  let v=t[0]; for(let i=0;i<o.length;i++) v = o[i]==='+'?v+t[i+1]:v-t[i+1];
  return {v, text:toks.join(' ')};
}
function judge(board){ const tr=trace(board); if(!tr.ok) return {ok:false, why:tr.why, n:board.filter(Boolean).length};
  const e=evalTokens(tr.cells.map(i=>board[i].v)); if(!e) return {ok:false, why:'수식이 안 됨(기호가 처음·끝·연달아)', n:tr.cells.length};
  return {ok:true, v:e.v, text:e.text, n:tr.cells.length, hit:Math.abs(e.v-100)<1e-9}; }

function init(starter){
  const pool=makePool();
  return {pool, market:[], discard:[], hand:[[],[]], board:[Array(S*S).fill(null),Array(S*S).fill(null)], coins:[COINS,COINS], round:0, picks:[0,0], turn:null, starter, phase:'intro', done:[false,false], winner:null, log:[], res:null};
}
function fillMarket(s){ while(s.market.length<10&&s.pool.length) s.market.push(s.pool.pop()); }
function startRound(s){ s.round++; s.picks=[0,0]; fillMarket(s); s.phase='draft'; s.turn=(s.starter+s.round-1)%2; s.done=[false,false]; s.log.push(`— ${s.round}라운드 (각자 ${PICKS[s.round-1]}장) —`); }
const discCost=s=> s.round<=4 ? 0 : 3;
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(!a) return '알 수 없는 동작';
  if(s.phase==='draft'){
    if(s.turn!==p) return '상대 차례예요'; if(a.k!=='take') return '봉투나 버린 카드를 가져오세요';
    let card;
    if(a.from==='m'){ const k=s.market.findIndex(c=>c.id===a.id); if(k<0) return '없는 봉투예요'; card=s.market.splice(k,1)[0]; }
    else if(a.from==='d'){ const k=s.discard.findIndex(c=>c.id===a.id); if(k<0) return '없는 카드예요'; card=s.discard.splice(k,1)[0]; }
    else return '어디서 가져올지 고르세요';
    s.hand[p].push(card); s.picks[p]++; s.log.push(`${p?'B':'A'} ${a.from==='m'?'봉투':'버린 카드'} 「${card.v}」 가져감`); s.lastTake={p,id:card.id,from:a.from};
    fillMarket(s);
    const need=PICKS[s.round-1]; const other=1-p;
    if(s.picks[0]>=need&&s.picks[1]>=need){ s.phase='build'; s.turn=null; }
    else s.turn = s.picks[other]<need ? other : p;
    return null; }
  if(s.phase==='build'){
    if(s.done[p]) return '이미 완료했어요';
    const B=s.board[p], H=s.hand[p];
    if(a.k==='place'){ const k=H.findIndex(c=>c.id===a.id), i=a.i|0; if(k<0) return '손에 없는 카드예요'; if(!(i>=0&&i<S*S)) return '칸을 고르세요'; if(B[i]) H.push(B[i]); B[i]=H.splice(k,1)[0]; return null; }
    if(a.k==='lift'){ const i=a.i|0; if(!B[i]) return '빈칸이에요'; H.push(B[i]); B[i]=null; return null; }
    if(a.k==='discard'){ const k=H.findIndex(c=>c.id===a.id); if(k<0) return '손에 없는 카드예요'; const cost=discCost(s); if(s.coins[p]<cost) return '코인이 모자라요'; s.coins[p]-=cost; const c=H.splice(k,1)[0]; s.discard.push(c); s.log.push(`${p?'B':'A'} 「${c.v}${c.s}」 버림${cost?` (−${cost}코인)`:''}`); return null; }
    if(a.k==='done'){ s.done[p]=true; if(s.done[0]&&s.done[1]){ if(s.round>=ROUNDS) finish(s); else startRound(s); } return null; }
  }
  return '지금은 할 수 없어요';
}
function finish(s){
  for(const p of [0,1]){ const n=s.hand[p].length; if(n){ s.coins[p]=Math.max(0,s.coins[p]-5*n); s.log.push(`${p?'B':'A'} 남은 손패 ${n}장 버림 (−${5*n}코인)`); s.discard.push(...s.hand[p]); s.hand[p]=[]; } }
  const J=[judge(s.board[0]), judge(s.board[1])]; s.res=J;
  const d=j=> j.ok ? Math.abs(j.v-100) : Infinity;
  let w;
  if(J[0].ok&&J[0].hit||J[1].ok&&J[1].hit){ if(J[0].hit&&J[1].hit) w = J[0].n!==J[1].n ? (J[0].n>J[1].n?0:1) : s.coins[0]!==s.coins[1] ? (s.coins[0]>s.coins[1]?0:1) : 'draw'; else w = J[0].hit?0:1; }
  else { const a=d(J[0]), b=d(J[1]); w = a!==b ? (a<b?0:1) : s.coins[0]!==s.coins[1] ? (s.coins[0]>s.coins[1]?0:1) : 'draw'; }
  s.winner=w; s.phase='over'; s.turn=null;
  s.log.push(`🏁 A: ${J[0].ok?`${J[0].text} = ${+J[0].v.toFixed(2)}`:'실패('+J[0].why+')'} / B: ${J[1].ok?`${J[1].text} = ${+J[1].v.toFixed(2)}`:'실패('+J[1].why+')'}`);
}
function stepDelay(s){ return s.phase==='intro' ? 1800 : null; }
function step(s){ if(s.phase==='intro') startRound(s); }
function mask(s,p){ const v=U.clone(s), o=1-p; v.pool=s.pool.length;
  v.market=s.market.map(c=>({id:c.id, v:c.v, s:null}));
  if(s.phase!=='over'){ v.hand[o]=s.hand[o].map(()=>null); v.board[o]=s.board[o].map(x=>x?{hid:1}:null); }
  return v; }

/* 컴퓨터: 오른쪽·아래로만 가는 길(252가지) 중 하나를 골라 가진 카드로 채우고, 값이 100에 가까워지게 바꿔 끼우기 */
const MONO=[]; (function gen(path,r,c,from){ if(r===S-1&&c===S-1){ MONO.push(path.concat([{i:r*S+c, need:from==='L'?'─':'└'}])); return; }
  for(const d of ['R','D']){ const nr=r+(d==='D'), nc=c+(d==='R'); if(nr>=S||nc>=S) continue; const sh = from==='L' ? (d==='R'?'─':'┐') : (d==='R'?'└':'│'); gen(path.concat([{i:r*S+c, need:sh}]), nr, nc, d==='R'?'L':'U'); } })([],0,0,'L');
function bestBuild(cards, iters=260){
  const by={}; for(const c of cards) (by[c.s]=by[c.s]||[]).push(c);
  let best=null, bs=-1e9;
  const paths=U.shuffle(MONO.slice()).filter(P=>{ const need={}; for(const x of P) need[x.need]=(need[x.need]||0)+1; return Object.keys(need).every(k=>(by[k]||[]).length>=need[k]); }).slice(0,40);
  for(const P of paths){
    const asg=P.map(x=>null); const used=new Set();
    for(let k=0;k<P.length;k++){ const opts=(by[P[k].need]||[]).filter(c=>!used.has(c.id)); const c=U.pick(opts); asg[k]=c; used.add(c.id); }
    const sc=a=>{ const e=evalTokens(a.map(c=>c.v)); if(!e) return -1e6; const d=Math.abs(e.v-100); return d<1e-9 ? 1000+a.length : -Math.log(1+d)*10; };
    let cur=sc(asg);
    for(let it=0;it<iters;it++){ const k=Math.random()*P.length|0, opts=(by[P[k].need]||[]); if(opts.length<2) continue;
      const alt=U.pick(opts); if(alt.id===asg[k].id) continue;
      const j=asg.findIndex(c=>c.id===alt.id); const na=asg.slice(); if(j>=0){ na[j]=asg[k]; } na[k]=alt; const v2=sc(na); if(v2>=cur){ cur=v2; asg.splice(0,asg.length,...na); } }
    if(cur>bs){ bs=cur; best={P, asg:asg.slice(), score:cur}; }
    if(bs>=1000) break;
  }
  return best;
}
let plan=null;
function ai(v,lvl=1){ const me=1;
  if(v.phase==='draft'&&v.turn===me){ const mine=v.hand[me].concat(v.board[me].filter(Boolean));
    const nOps=mine.filter(c=>isOp(c.v)).length, nNum=mine.length-nOps;
    // 버린 더미에 필요한 모양이 있으면 가져옴(모양이 보임), 아니면 숫자/기호 비율 맞추기
    const need={}; for(const sh of SHAPES) need[sh]=0; for(const P of MONO.slice(0,1)) for(const x of P) need[x.need]++;
    const have={}; for(const c of mine) have[c.s]=(have[c.s]||0)+1;
    const want=v.discard.filter(c=>(have[c.s]||0)<3&&(c.s==='┐'||c.s==='└'||c.s==='─'||c.s==='│'));
    if(want.length&&lvl>0&&Math.random()<.5) return {k:'take', from:'d', id:U.pick(want).id};
    const wantOp = nOps < Math.max(2,(nNum)*.45);
    const cand=v.market.filter(c=> wantOp ? isOp(c.v) : !isOp(c.v));
    let c = cand.length ? cand : v.market;
    if(!wantOp&&lvl>0) c = c.slice().sort((a,b)=> (+a.v===10?-1:0) - (+b.v===10?-1:0));
    return {k:'take', from:'m', id:(lvl===0?U.pick(v.market):c[0]).id}; }
  if(v.phase==='build'&&!v.done[me]){
    const B=v.board[me], H=v.hand[me];
    if(!plan||plan.round!==v.round){ const all=H.concat(B.filter(Boolean)); const b=bestBuild(all, lvl===0?60:lvl===1?260:700); plan={round:v.round, b, step:0}; }
    const b=plan.b;
    if(b){ // 판을 계획대로: 먼저 계획에 없는 칸의 카드 들기, 다음 계획 칸 채우기
      const target={}; b.P.forEach((x,k)=>target[x.i]=b.asg[k].id);
      for(let i=0;i<S*S;i++) if(B[i]&&target[i]!==B[i].id) return {k:'lift', i};
      for(const i in target) if(!B[i]){ const c=H.find(x=>x.id===target[i]); if(c) return {k:'place', id:c.id, i:+i}; }
      // 계획에 안 쓰는 손패: 무료 라운드면 쓸모없는 것만 버리기(모양이 흔한 것)
      if(v.round<=4){ const used=new Set(Object.values(target)); const spare=H.filter(c=>!used.has(c.id));
        const keepN = v.round===4 ? 0 : 3;   // 무료로 버릴 수 있을 때 정리 — 4라운드는 계획 밖 카드 전부
        const junk = spare.find(c=>c.s==='┌'||c.s==='┘') || (spare.length>keepN ? spare[0] : null); if(junk) return {k:'discard', id:junk.id}; }
      if(v.round===ROUNDS){ const spare=H.filter(c=>!Object.values(target).includes(c.id)); if(spare.length&&v.coins[me]>=3) return {k:'discard', id:spare[0].id}; }
    }
    return {k:'done'}; }
  return null; }
function aiDelay(v){ return v.phase==='draft' ? 1100+Math.random()*1300 : 450+Math.random()*350; }

/* 화면 */
let sel=null, sig='';
const road=s=>{ if(!s) return '<i class="env">✉️</i>'; const o=OPEN[s]; return `<i class="rd c"></i>${o.U?'<i class="rd u"></i>':''}${o.R?'<i class="rd r"></i>':''}${o.D?'<i class="rd d"></i>':''}${o.L?'<i class="rd l"></i>':''}`; };
const face=c=>`${road(c.s)}<b>${c.v}</b>`;
const card=(c,extra='',attrs='')=>`<span class="er-c ${c&&isOp(c.v)?'op':''} ${extra}" ${attrs}>${c?face(c):''}</span>`;
function render(el,v,ctx){
  const me=ctx.me, o=1-me, nm=p=>p===me?'나':(ctx.mode==='solo'?'상대':U.esc(ctx.name(p)));
  const sg=v.round+':'+v.phase; if(sg!==sig){ sig=sg; sel=null; }
  const B=v.board[me], H=v.hand[me], J=judge(B);
  let h=`<div class="info">${v.round}/${ROUNDS}라운드 · ${v.phase==='draft'?`봉투 고르기 (나 ${v.picks[me]}/${PICKS[v.round-1]} · 상대 ${v.picks[o]}/${PICKS[v.round-1]})`:v.phase==='build'?`길 만들기 · 버리기 ${discCost(v)}코인`:''} · 🪙 나 ${v.coins[me]} · 상대 ${v.coins[o]} · 남은 봉투 ${v.pool}</div>`;
  if(v.phase==='draft'){ const my=v.turn===me;
    h+=`<div class="er-sec"><div class="er-h">✉️ 봉투 (값만 보이고 길 모양은 열어 봐야 알아요) ${my?'— 하나 고르세요':`— ${nm(v.turn)} 고르는 중…`}</div><div class="er-row">${v.market.map(c=>`<button class="er-c env ${isOp(c.v)?'op':''}" data-take="m" data-id="${c.id}" ${my?'':'disabled'}>${face(c)}</button>`).join('')}</div></div>`;
    if(v.discard.length) h+=`<div class="er-sec"><div class="er-h">🗑️ 버린 카드 (모양이 보여요, 가져와도 돼요)</div><div class="er-row">${v.discard.map(c=>`<button class="er-c ${isOp(c.v)?'op':''}" data-take="d" data-id="${c.id}" ${my?'':'disabled'}>${face(c)}</button>`).join('')}</div></div>`; }
  // 내 판
  h+=`<div class="er-board"><div class="er-start">▶ 출발</div><div class="er-grid">${B.map((c,i)=>`<button class="er-cell ${J.cells&&false?'':''} ${c?'f':''}" data-cell="${i}">${c?card(c):''}</button>`).join('')}</div><div class="er-end">도착 ▶</div></div>`;
  const tr=trace(B);
  h+=`<div class="py-line">${J.ok?`🧮 <b>${U.esc(J.text)}</b> = <b class="${J.hit?'ok':''}">${+J.v.toFixed(3)}</b>${J.hit?' 🎉 100!':''} · 카드 ${J.n}장`:`🛤️ ${B.some(Boolean)?U.esc(J.why||'길 미완성'):'출발 칸(왼쪽 위)부터 길을 이어 보세요'}`}</div>`;
  // 손패
  if(v.phase!=='over') h+=`<div class="er-sec"><div class="er-h">🖐️ 내 손패 ${H.length}장 ${v.phase==='build'?'— 카드를 고른 뒤 판의 칸을 누르면 놓여요, 놓인 카드를 누르면 손으로':''}</div><div class="er-row">${H.map(c=>`<button class="er-c ${isOp(c.v)?'op':''} ${sel===c.id?'sel':''}" data-hand="${c.id}">${face(c)}</button>`).join('')||'<small>-</small>'}</div>
    ${v.phase==='build'&&!v.done[me]?`<div class="fh-act">${sel!=null?`<button class="ghost" data-disc="1">🗑️ 고른 카드 버리기 ${discCost(v)?`(−${discCost(v)}코인)`:'(무료)'}</button>`:''}<button data-done="1">✅ ${v.round>=ROUNDS?'최종 제출':'이번 라운드 완료'}</button></div><small>${v.round>=ROUNDS?'최종 제출 뒤 남은 손패는 장당 5코인으로 버려져요.':''}</small>`:v.phase==='build'?'<div class="info">상대를 기다리는 중…</div>':''}</div>`;
  h+=`<div class="info">상대 판: 카드 ${v.board[o].filter(Boolean).length}장 · 손패 ${v.hand[o].length}장</div>`;
  if(v.phase==='over'&&v.res){ const R=v.res; h+=`<div class="sn-score">${[me,o].map(p=>`<div class="${p===me?'h':''}"><b>${nm(p)}</b> ${R[p].ok?`${U.esc(R[p].text)} = ${+R[p].v.toFixed(3)}${R[p].hit?' 🎉':''} · 카드 ${R[p].n}장`:`실패 — ${R[p].why}`} · 🪙 ${v.coins[p]}</div>`).join('')}</div>
    <div class="er-sec"><div class="er-h">상대 판</div><div class="er-grid mini">${v.board[o].map(c=>`<span class="er-cell ${c?'f':''}">${c?card(c):''}</span>`).join('')}</div></div>`; }
  h+=`<details class="hl-log"><summary>기록</summary>${v.log.slice(-16).reverse().map(x=>`<div>${U.esc(x).replace(/^A\b/,nm(0)).replace(/^B\b/,nm(1))}</div>`).join('')}</details>`;
  el.innerHTML=h;
  el.onclick=e=>{
    const t=e.target.closest('[data-take]'); if(t&&!t.disabled) return ctx.act({k:'take', from:t.dataset.take, id:+t.dataset.id});
    const hd=e.target.closest('[data-hand]'); if(hd){ const id=+hd.dataset.hand; sel = sel===id?null:id; return ctx.rerender(); }
    const cl=e.target.closest('[data-cell]'); if(cl&&v.phase==='build'&&!v.done[me]){ const i=+cl.dataset.cell; if(sel!=null){ const id=sel; sel=null; return ctx.act({k:'place', id, i}); } if(B[i]) return ctx.act({k:'lift', i}); return; }
    if(e.target.closest('[data-disc]')&&sel!=null){ const id=sel; sel=null; return ctx.act({k:'discard', id}); }
    if(e.target.closest('[data-done]')) return ctx.act({k:'done'});
  };
}
const guide=`
<p><b>길을 이어 수식 100 만들기</b> (1:1판). 카드 = <b>길 모양</b>(─ │ ┌ ┐ └ ┘, <b>돌릴 수 없음</b>) + <b>숫자 1~10</b> 또는 <b>기호 + − × ÷</b>.</p>
<ol><li><b>봉투 고르기</b>: 바닥의 봉투는 <b>값만 보이고 길 모양은 열어 봐야</b> 알아요. 번갈아 가져가요(1~3라운드 4장씩, 4~5라운드 6장씩). 상대가 버린 카드(모양이 보임)를 가져와도 돼요.</li>
<li><b>길 만들기</b>: 6×6 판, <b>왼쪽 위 칸의 왼쪽에서 들어가 오른쪽 아래 칸의 오른쪽으로 나가는</b> 길을 끊김 없이. 판 위 카드는 모두 길 위에 있어야 해요.</li>
<li>길을 따라 읽은 게 수식! <b>붙은 숫자 카드는 여러 자리 수</b>(1 다음 10 → 110), ×÷ 먼저. 기호가 처음·끝·연달아 오면 안 돼요.</li>
<li>얻은 카드는 판에 놓거나 버려야 해요 — 버리기 <b>1~4라운드 무료, 5라운드 3코인</b>, 끝난 뒤 남은 손패는 <b>장당 5코인</b>(코인 ${COINS}개).</li></ol>
<p><b>판정</b>: 값이 정확히 100인 쪽 승리(둘 다면 카드를 많이 쓴 쪽) · 둘 다 아니면 100에 가까운 쪽 · 같으면 코인 많은 쪽.</p>
<div class="tipbox">💡 출발→도착 최소 11장. ─ │ ┐ └ 넷만 있으면 오른쪽·아래로만 가는 길을 만들 수 있어요.<br>· 예: 10 × 10 = 100 은 3장이지만 길이 11칸이라 나머지도 수식이 돼야 해요 — "+ 5 − 5"처럼 상쇄하기!<br>· 원작(팀전, 야생에서 봉투 찾기)을 1:1 고르기로 바꿨어요.</div>`;
window.GAMES.exproad = {
  title:'수식 로드', ref:'피의 게임 「수식 로드」', emoji:'🛤️', tags:['수식','퍼즐','두뇌서바이벌'],
  tagline:'길 카드를 이어 출발에서 도착까지 — 길을 따라 읽은 수식이 100이 되게.',
  guide, init, apply, mask, ai, aiDelay, render, step, stepDelay,
  reset(){ sel=null; sig=''; plan=null; },
  status:(v,ctx)=> v.winner!=null?'': v.phase==='draft'?(v.turn===ctx.me?'봉투를 고르세요':'상대가 고르는 중…'): v.phase==='build'?(v.done[ctx.me]?'상대를 기다리는 중':'길을 만들고 완료를 누르세요'):'',
  bar:(v,i)=>`<span class="score">🪙 ${v.coins[i]}</span>`,
  _judge:judge, _best:bestBuild, _eval:evalTokens,
};
})();
