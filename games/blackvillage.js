(function(){
'use strict';
/* 블랙 빌리지 (피의 게임 시즌 3 · 10일차 데스매치) — 1:1:1 (우리 둘 + NPC 1명) 타일 놓기.
   타일 72장(길·땅). 12라운드, 라운드마다 고를 타일 6장과 다음 라운드 미리보기 6장 공개. 한 명씩 돌아가며 1장씩 골라 놓음(라운드마다 시작 순서가 바뀜).
   변이 맞닿게 놓고, 길은 길끼리·땅은 땅끼리·풀은 풀끼리 이어져야 함. 놓은 타일의 아무도 없는 영역에 말(1·1·1·2·2·3) 하나를 놓아 차지할 수 있음.
   영역 완성: 길(양 끝이 막힘) 타일 1장당 1점, 땅(빈틈없이 둘러싸임) 1장당 2점. 말 숫자 합이 큰 쪽이 점수(같으면 모두). 완성되면 말 회수. 끝까지 미완성인 영역은 0점. */
/* 👥 N명: 사람 3명이면 NPC 없이 */
const N=3, ROUNDS=12, PER=6, MEEP=[1,1,1,2,2,3]; let HSEAT=[0,1]; const SEATORD=[0,1,2];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i), ALL=[0,1,2];
const nm=i=>`{s${i}}`;
const DX=[0,1,0,-1], DY=[-1,0,1,0]; /* 0북 1동 2남 3서 */
/* 타일 정의: e = 4변 종류(C 땅 · R 길 · G 풀), f = 영역(같은 영역으로 이어진 변들), n = 장수 */
const DEF=[
  {e:'RGRG', f:[['R',[0,2]]], n:12}, {e:'GGRR', f:[['R',[2,3]]], n:13}, {e:'GRRR', f:[['R',[1]],['R',[2]],['R',[3]]], n:4}, {e:'RRRR', f:[['R',[0]],['R',[1]],['R',[2]],['R',[3]]], n:1},
  {e:'GGRG', f:[['R',[2]]], n:4}, {e:'CGGG', f:[['C',[0]]], n:8}, {e:'CRGR', f:[['C',[0]],['R',[1,3]]], n:4}, {e:'CRRG', f:[['C',[0]],['R',[1,2]]], n:3},
  {e:'CGCG', f:[['C',[0]],['C',[2]]], n:3}, {e:'CCGG', f:[['C',[0]],['C',[1]]], n:2}, {e:'CGCG', f:[['C',[0,2]]], n:3}, {e:'CCGG', f:[['C',[0,1]]], n:6},
  {e:'CCRR', f:[['C',[0,1]],['R',[2,3]]], n:3}, {e:'CCGC', f:[['C',[0,1,3]]], n:3}, {e:'CCRC', f:[['C',[0,1,3]],['R',[2]]], n:2}, {e:'CCCC', f:[['C',[0,1,2,3]]], n:1},
];
const START=6;
const edgeOf=(t,r,d)=>DEF[t].e[(d-r+4)%4];
const featsOf=(t,r)=>DEF[t].f.map(([ty,es])=>({ty, es:es.map(x=>(x+r)%4)}));
function pool(){ const p=[]; DEF.forEach((d,k)=>{ for(let n=0;n<d.n;n++) p.push(k); }); return U.shuffle(p); }

function init(starter,o){ const k=Math.max(2,Math.min(3,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  const s={phase:'intro', who:{}, starter:starter|0, round:0, pool:pool(), open:[], prev:[], picks:0, order:[], board:{'0,0':{t:START,r:0,by:-1}}, meeps:[], left:ALL.map(()=>MEEP.slice()),
    score:[0,0,0], last:null, turn:null, actor:null, hist:[], log:[], say:null, used:{}, winner:null, ev:0, notice:'🎙️ 데스매치 「블랙 빌리지」 — 길과 땅을 이어 마을을 완성하세요'};
  s.hs=HSEAT.slice(); if(!isH(2)) s.who[2]=NPCS.cast(1)[0]; return s;
}
/* 영역 탐색 */
function region(board,meeps,x,y,fi){ const seen=new Set(), tiles=new Set(); let open=0, ty=null; const st=[[x,y,fi]]; const ms=[];
  while(st.length){ const [cx,cy,cf]=st.pop(); const key=cx+','+cy+','+cf; if(seen.has(key)) continue; seen.add(key); tiles.add(cx+','+cy);
    const T=board[cx+','+cy]; const F=featsOf(T.t,T.r)[cf]; ty=F.ty; for(const m of meeps) if(m.node===key) ms.push(m);
    for(const d of F.es){ const nx=cx+DX[d], ny=cy+DY[d], nt=board[nx+','+ny]; if(!nt){ open++; continue; } const nf=featsOf(nt.t,nt.r).findIndex(g=>g.es.includes((d+2)%4)); if(nf>=0) st.push([nx,ny,nf]); } }
  return {ty, tiles:tiles.size, open, ms, nodes:seen}; }
function canPlace(board,t,r,x,y){ if(board[x+','+y]) return false; let adj=false;
  for(let d=0;d<4;d++){ const nt=board[(x+DX[d])+','+(y+DY[d])]; if(!nt) continue; adj=true; if(edgeOf(t,r,d)!==edgeOf(nt.t,nt.r,(d+2)%4)) return false; } return adj; }
function frontier(board){ const out=new Set(); for(const k in board){ const [x,y]=k.split(',').map(Number); for(let d=0;d<4;d++){ const nk=(x+DX[d])+','+(y+DY[d]); if(!board[nk]) out.add(nk); } } return [...out].map(k=>k.split(',').map(Number)); }
function legalSpots(board,t){ const o=[]; for(const [x,y] of frontier(board)) for(let r=0;r<4;r++) if(canPlace(board,t,r,x,y)) o.push({x,y,r}); return o; }
/* 완성 처리 */
function settle(s,x,y){ const T=s.board[x+','+y], done=new Set(), res=[];
  featsOf(T.t,T.r).forEach((F,fi)=>{ const R=region(s.board,s.meeps,x,y,fi); const key=[...R.nodes].sort()[0]; if(done.has(key)) return; done.add(key); if(R.open>0) return;
    const pts=R.tiles*(R.ty==='C'?2:1); if(R.ms.length){ const sum=ALL.map(p=>R.ms.filter(m=>m.p===p).reduce((a,m)=>a+m.n,0)); const mx=Math.max(...sum); const win=ALL.filter(p=>sum[p]===mx&&mx>0);
      win.forEach(p=>s.score[p]+=pts); R.ms.forEach(m=>{ s.left[m.p].push(m.n); s.left[m.p].sort(); }); s.meeps=s.meeps.filter(m=>!R.nodes.has(m.node)); res.push({ty:R.ty,pts,win}); }
    else res.push({ty:R.ty,pts,win:[]}); });
  return res; }
function startRound(s){ s.round++; const a=(s.round-1)*PER; s.open=s.pool.slice(a,a+PER); s.prev=s.round<ROUNDS?s.pool.slice(a+PER,a+2*PER):[]; s.taken=[]; s.picks=0;
  const st=(s.starter+s.round-1)%N; s.order=[0,1,2,3,4,5].map(k=>(st+k)%N); s.notice=`🏘️ ${s.round}/${ROUNDS}라운드 — 타일 ${PER}장 공개, ${nm(st)}부터`; s.log.push(`🏘️ ${s.round}라운드`); nextPick(s); }
function nextPick(s){ if(s.picks>=PER){ if(s.round>=ROUNDS){ endGame(s); return; } s.phase='rend'; s.turn=null; s.actor=null; return; }
  const i=s.order[s.picks]; s.actor=i; s.phase='pick'; s.turn=isH(i)?pOf(i):null; s.think=isH(i)?0:1400+Math.random()*1600; }
function endGame(s){ s.phase='over'; s.turn=null; s.actor=null; const mx=Math.max(...s.score); s.notice=`🏁 끝! ${ALL.map(p=>`${nm(p)} ${s.score[p]}점`).join(' · ')} (미완성 영역은 0점)`; s.log.push(s.notice);
  const a=s.score[0], b=s.score[1]; s.winner=a>b?0:b>a?1:'both'; { const mx=Math.max(...HSEAT.map(h=>s.score[h])); s.winners=HSEAT.map((h,p)=>s.score[h]===mx?p:-1).filter(x=>x>=0); } s.ev++; }
function act(s,i,a){ if(s.phase!=='pick'||s.actor!==i) return '내 차례가 아니에요'; const k=a.k2|0; if(!(k>=0&&k<s.open.length)||s.taken.includes(k)) return '남은 타일을 고르세요';
  const t=s.open[k];
  if(a.skip){ if(legalSpots(s.board,t).length) return '놓을 자리가 있어요'; s.taken.push(k); s.picks++; s.log.push(`🗑️ ${nm(i)}: 놓을 곳이 없어 버림`); nextPick(s); return null; }
  const x=a.x|0, y=a.y|0, r=((a.r|0)%4+4)%4; if(!canPlace(s.board,t,r,x,y)) return '거기엔 놓을 수 없어요 (변이 맞아야 해요)';
  s.board[x+','+y]={t,r,by:i}; let mtxt='';
  if(a.m!=null){ const fi=a.m|0, n=a.n|0; const F=featsOf(t,r)[fi]; if(!F){ delete s.board[x+','+y]; return '영역을 고르세요'; } const R=region(s.board,s.meeps,x,y,fi);
    if(R.ms.length){ delete s.board[x+','+y]; return '이미 누가 차지한 영역이에요'; } const li=s.left[i].indexOf(n); if(li<0){ delete s.board[x+','+y]; return '그 말은 남아 있지 않아요'; }
    s.left[i].splice(li,1); s.meeps.push({p:i,n,node:x+','+y+','+fi}); mtxt=` + ${F.ty==='C'?'땅':'길'}에 ${n}번 말`; }
  s.taken.push(k); s.picks++; s.last={x,y,by:i};
  const res=settle(s,x,y); s.notice=`🧱 ${nm(i)} 타일 놓음${mtxt}`; s.log.push(s.notice);
  res.forEach(z=>{ const msg=`✨ ${z.ty==='C'?'땅':'길'} 완성 ${z.pts}점 → ${z.win.length?z.win.map(nm).join(' · '):'주인 없음'}`; s.log.push(msg); s.notice=msg; });
  if(res.some(z=>z.win.length&&z.win.includes(i)&&z.pts>=6)&&!isH(i)) say(s,i,'big');
  nextPick(s); return null; }
const LINES={logic:{big:['계산대로 완성이에요.']}, warm:{big:['와 완성했다 😊']}, calm:{big:['…완성.']}, emo:{big:['꺄 완성!! 🥳']}, sly:{big:['딱 맞네요 😏']}, hot:{big:['봤죠?! 🔥']}};
const STYLE={seojin:'logic', doyun:'warm', haram:'calm', yuna:'emo', minho:'sly', taekyung:'hot', jihu:'sly', soyul:'warm'};
function say(s,i,kind){ const p=NPCS.byId(s.who[i]); const L=(LINES[STYLE[p&&p.id]||'calm']||LINES.calm)[kind]; if(!L) return; const t=U.pick(L); s.say={seat:i,text:t,n:(s.say?s.say.n:0)+1}; }
function apply(s,p,a){ syncH(s); if(s.winner!=null) return '게임이 끝났어요'; if(!a||a.k!=='place') return '알 수 없는 동작'; const e=act(s,HSEAT[p],a); if(!e) s.ev++; return e; }
function stepDelay(s){ syncH(s); if(s.winner!=null) return null; if(s.phase==='intro') return 2000; if(s.phase==='rend') return 1600; if(s.phase==='pick') return isH(s.actor)?null:s.think; return null; }
function step(s){ syncH(s); if(s.phase==='intro'||s.phase==='rend'){ startRound(s); s.ev++; return; }
  if(s.phase==='pick'&&!isH(s.actor)){ const a=decide(s,s.actor,1); const e=act(s,s.actor,a); if(e){ console.warn('npc',e); s.taken.push(a.k2); s.picks++; nextPick(s); } s.ev++; } }
function mask(s){ return U.clone(s); }
/* 컴퓨터: 고를 타일 × 자리 × 회전 × 말 놓기를 즉시 점수 + 앞으로 완성될 가능성으로 평가 */
function evalMove(s,i,k,sp,m,n){ const t=s.open[k]; const B=Object.assign({},s.board); B[sp.x+','+sp.y]={t,r:sp.r,by:i}; let meeps=s.meeps;
  if(m!=null) meeps=meeps.concat([{p:i,n,node:sp.x+','+sp.y+','+m}]);
  let v=0; const seen=new Set(); const roundsLeft=ROUNDS-s.round+(PER-s.picks)/PER;
  featsOf(t,sp.r).forEach((F,fi)=>{ const R=region(B,meeps,sp.x,sp.y,fi); const key=[...R.nodes].sort()[0]; if(seen.has(key)) return; seen.add(key);
    const pts=R.tiles*(R.ty==='C'?2:1); const sum=ALL.map(p=>R.ms.filter(x=>x.p===p).reduce((a,x)=>a+x.n,0)); const mx=Math.max(...sum);
    const share=p=> mx>0&&sum[p]===mx ? 1 : 0;
    if(R.open===0){ v+=pts*share(i)*1.0 - ALL.filter(p=>p!==i).reduce((a,p)=>a+pts*share(p),0)*.6 + (R.ms.some(x=>x.p===i)?1.5:0); }
    else { const chance=Math.min(.95, 1/(1+R.open*.45))*Math.min(1,roundsLeft/3); v+= pts*chance*(share(i)*.8 - ALL.filter(p=>p!==i).reduce((a,p)=>a+share(p),0)*.5); } });
  if(m!=null) v-= 1.2 + (s.left[i].length<=2?2:0) + n*.15;
  return v; }
function decide(s,i,lvl){ lvl=lvl==null?1:lvl; const opts=[];
  s.open.forEach((t,k)=>{ if(s.taken.includes(k)) return; const sp=legalSpots(s.board,t); if(!sp.length){ opts.push({k2:k,skip:true,v:-5}); return; }
    for(const p of sp){ opts.push({k2:k,x:p.x,y:p.y,r:p.r,m:null,v:evalMove(s,i,k,p,null)});
      if(s.left[i].length){ const ns=[...new Set(s.left[i])]; featsOf(t,p.r).forEach((F,fi)=>{ const B=Object.assign({},s.board); B[p.x+','+p.y]={t,r:p.r}; const R=region(B,s.meeps,p.x,p.y,fi); if(R.ms.length) return;
        for(const n of (lvl===0?[ns[0]]:ns)) opts.push({k2:k,x:p.x,y:p.y,r:p.r,m:fi,n,v:evalMove(s,i,k,p,fi,n)}); }); } } });
  if(!opts.length) return {k:'place',k2:s.open.findIndex((_,k)=>!s.taken.includes(k)),skip:true};
  opts.forEach(o=>o.v+=(Math.random()-.5)*(lvl===0?6:lvl===1?1.2:.2)); opts.sort((a,b)=>b.v-a.v);
  const o=opts[0]; return {k:'place',k2:o.k2,x:o.x,y:o.y,r:o.r,m:o.m,n:o.n,skip:o.skip}; }
function ai(v,lvl){ syncH(v); const i=HSEAT[1]; if(v.phase==='pick'&&v.actor===i) return decide(v,i,lvl); return null; }
function aiDelay(){ return 1500+Math.random()*1800; }

/* 화면 */
let WHO={}, selK=null, rot=0, spot=null, meep=null, sig='';
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}/g,(_,d)=>`${seatEmoji(+d)} ${seatName(+d,ctx)}`); }
const PCOL=['#e0544e','#3a7bd5','#e8b600'];
const MID=[[30,0],[60,30],[30,60],[0,30]];
function tileSvg(t,r,meeps,x,y,ghost){ const F=featsOf(t,r); let g=`<rect width="60" height="60" fill="${ghost?'#cfe9c4':'#8fc97a'}"/>`;
  F.forEach((f,fi)=>{ if(f.ty!=='C') return; if(f.es.length===4){ g+=`<rect width="60" height="60" fill="#8a6a46"/>`; return; }
    if(f.es.length===1){ const d=f.es[0]; const p=[[0,0,60,0,30,22],[60,0,60,60,38,30],[0,60,60,60,30,38],[0,0,0,60,22,30]][d]; g+=`<polygon points="${p.join(',')}" fill="#8a6a46"/>`; }
    else { const pts=[]; const cor=[[0,0],[60,0],[60,60],[0,60]]; for(const d of f.es){ pts.push(cor[d],cor[(d+1)%4]); } g+=`<polygon points="30,30 ${f.es.map(d=>`${cor[d].join(',')} ${cor[(d+1)%4].join(',')}`).join(' ')}" fill="#8a6a46"/>`; } });
  F.forEach((f,fi)=>{ if(f.ty!=='R') return; if(f.es.length===2){ const [a,b]=f.es.map(d=>MID[d]); g+=`<path d="M${a[0]},${a[1]} Q30,30 ${b[0]},${b[1]}" stroke="#f3e6c4" stroke-width="7" fill="none"/>`; }
    else { const a=MID[f.es[0]]; const end=[[30,22],[38,30],[30,38],[22,30]][f.es[0]]; g+=`<line x1="${a[0]}" y1="${a[1]}" x2="${end[0]}" y2="${end[1]}" stroke="#f3e6c4" stroke-width="7"/><circle cx="${end[0]}" cy="${end[1]}" r="5" fill="#5a3f2a"/>`; } });
  (meeps||[]).forEach(m=>{ const [mx,my,mf]=m.node.split(',').map(Number); if(mx!==x||my!==y) return; const f=F[mf]; const d=f.es[0]; const c=f.es.length>=3?[30,30]:[[30,12],[48,30],[30,48],[12,30]][d];
    g+=`<circle cx="${c[0]}" cy="${c[1]}" r="9" fill="${PCOL[m.p]}" stroke="#fff" stroke-width="2"/><text x="${c[0]}" y="${c[1]+4}" text-anchor="middle" font-size="11" font-weight="800" fill="#fff">${m.n}</text>`; });
  return g; }
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{}; const me=HSEAT[ctx.me], my=v.phase==='pick'&&v.actor===me;
  const sg=v.round+':'+v.picks; if(sg!==sig){ sig=sg; selK=null; rot=0; spot=null; meep=null; }
  let h=`<div class="hl-notice">${fill(U.esc(v.notice||''),ctx)}</div>`;
  h+=`<div class="vr-speech">${v.say?`<span class="w">${seatEmoji(v.say.seat)} ${seatName(v.say.seat,ctx)}</span> ${U.esc(v.say.text)}`:'<i>　</i>'}</div>`;
  h+=`<div class="pw-seats">${ALL.map(i=>`<div class="pw-seat ${i===me?'me':''} ${v.actor===i?'act':''}"><div class="ev-nm"><span style="color:${PCOL[i]}">●</span> ${seatEmoji(i)} ${seatName(i,ctx)}</div><div class="pw-sc">${v.score[i]}점</div><small>말 ${v.left[i].join('·')||'없음'}</small></div>`).join('')}</div>`;
  /* 보드 */
  const keys=Object.keys(v.board).map(k=>k.split(',').map(Number)); let x0=Math.min(...keys.map(k=>k[0]))-1, x1=Math.max(...keys.map(k=>k[0]))+1, y0=Math.min(...keys.map(k=>k[1]))-1, y1=Math.max(...keys.map(k=>k[1]))+1;
  const legal = my&&selK!=null ? legalSpots(v.board,v.open[selK]).filter(p=>p.r===rot) : [];
  const S=Math.max(26,Math.min(70,Math.floor(600/(x1-x0+1))));
  let b=`<div class="bv-board" style="grid-template-columns:repeat(${x1-x0+1},${S}px)">`;
  for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){ const T=v.board[x+','+y]; const isSpot=spot&&spot.x===x&&spot.y===y; const lg=legal.some(p=>p.x===x&&p.y===y);
    if(T) b+=`<div class="bv-c ${v.last&&v.last.x===x&&v.last.y===y?'last':''}" style="width:${S}px;height:${S}px"><svg viewBox="0 0 60 60">${tileSvg(T.t,T.r,v.meeps,x,y)}</svg></div>`;
    else if(isSpot&&selK!=null) b+=`<div class="bv-c spot" style="width:${S}px;height:${S}px" data-x="${x}" data-y="${y}"><svg viewBox="0 0 60 60">${tileSvg(v.open[selK],rot,[],x,y,true)}</svg></div>`;
    else b+=`<div class="bv-c ${lg?'ok':'none'}" style="width:${S}px;height:${S}px" ${lg?`data-x="${x}" data-y="${y}"`:''}></div>`; }
  b+=`</div>`; h+=b;
  h+=`<div class="bv-open"><small>${v.round}/${ROUNDS}라운드 — 고를 타일</small><div>${v.open.map((t,k)=>`<button class="bv-t ${selK===k?'sel':''} ${v.taken.includes(k)?'gone':''}" data-k="${k}" ${my&&!v.taken.includes(k)?'':'disabled'}><svg viewBox="0 0 60 60">${tileSvg(t,selK===k?rot:0,[],0,0)}</svg></button>`).join('')}</div>
    ${v.prev.length?`<small>다음 라운드 미리보기</small><div class="pv">${v.prev.map(t=>`<span class="bv-t sm"><svg viewBox="0 0 60 60">${tileSvg(t,0,[],0,0)}</svg></span>`).join('')}</div>`:''}</div>`;
  if(my){ if(selK==null) h+=`<div class="vr-card"><b>🧱 타일을 고르세요</b> <small>순서: ${v.order.slice(v.picks).map(i=>seatEmoji(i)).join(' → ')}</small></div>`;
    else { const t=v.open[selK]; const anyLegal=legalSpots(v.board,t).length>0;
      h+=`<div class="vr-card"><b>🧱 놓을 자리</b> <small>${anyLegal?'초록 칸을 누르세요 · 회전으로 맞추기':'이 타일은 놓을 곳이 없어요'}</small><div class="fh-act"><button class="ghost" data-a="rot">🔄 회전</button>${anyLegal?'':`<button data-a="skip">버리기</button>`}</div>`;
      if(spot){ const F=featsOf(t,rot); const B=Object.assign({},v.board); B[spot.x+','+spot.y]={t,r:rot}; const ns=[...new Set(v.left[me])];
        h+=`<div class="bv-meep"><button class="${meep==null?'':'ghost'}" data-m="none">말 없이</button>${F.map((f,fi)=>{ const R=region(B,v.meeps,spot.x,spot.y,fi); if(R.ms.length) return ''; return ns.map(n=>`<button class="${meep&&meep.fi===fi&&meep.n===n?'':'ghost'}" data-m="${fi}" data-n="${n}">${f.ty==='C'?'🟫 땅':'🛤️ 길'}(${['북','동','남','서'][f.es[0]]})에 ${n}번</button>`).join(''); }).join('')}</div>
          <div class="fh-act"><button data-a="go">여기에 놓기</button></div>`; }
      h+=`</div>`; } }
  if(v.phase==='over') h+=`<div class="sn-score">${ALL.slice().sort((a,b)=>v.score[b]-v.score[a]).map(i=>`<div class="${isH(i)?'h':''}"><b>${seatEmoji(i)} ${seatName(i,ctx)}</b> ${v.score[i]}점</div>`).join('')}</div>`;
  h+=`<div class="bm-log">${v.log.slice(-7).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=h;
  el.onclick=e=>{ const k=e.target.closest('[data-k]'); if(k&&!k.disabled){ selK=+k.dataset.k; spot=null; meep=null; return ctx.rerender(); }
    const c=e.target.closest('[data-x]'); if(c){ spot={x:+c.dataset.x,y:+c.dataset.y}; meep=null; return ctx.rerender(); }
    const m=e.target.closest('[data-m]'); if(m){ meep = m.dataset.m==='none'?null:{fi:+m.dataset.m,n:+m.dataset.n}; return ctx.rerender(); }
    const a=e.target.closest('[data-a]'); if(!a) return; const kk=a.dataset.a;
    if(kk==='rot'){ rot=(rot+1)%4; if(spot&&!canPlace(v.board,v.open[selK],rot,spot.x,spot.y)) spot=null; meep=null; return ctx.rerender(); }
    if(kk==='skip') return ctx.act({k:'place',k2:selK,skip:true});
    if(kk==='go'&&spot) return ctx.act({k:'place',k2:selK,x:spot.x,y:spot.y,r:rot,m:meep?meep.fi:null,n:meep?meep.n:null}); };
}
function status(v,ctx){ syncH(v); if(v.phase==='over') return ''; return v.actor===HSEAT[ctx.me]?'타일을 골라 놓으세요':'진행 중…'; }
const guide=`
<p><b>길과 땅을 잇는 타일 놓기</b> — 1:1:1 (우리 둘 + 컴퓨터 1명).</p>
<ol><li>${ROUNDS}라운드. 라운드마다 고를 타일 ${PER}장 + 다음 라운드 <b>미리보기</b> ${PER}장. 한 명씩 돌아가며 1장씩(라운드마다 시작 순서가 바뀜).</li>
<li>변이 맞닿게 놓아요. <b>길은 길끼리, 땅은 땅끼리, 풀은 풀끼리</b> 이어져야 해요(🔄 회전 가능).</li>
<li>방금 놓은 타일의 <b>아무도 없는 영역</b>에 말 하나를 놓아 차지할 수 있어요. 말은 <b>1·1·1·2·2·3</b> 여섯 개뿐.</li>
<li>영역 <b>완성</b>: 🛤️ 길(양 끝이 막힘) 1장당 1점, 🟫 땅(빈틈없이 둘러싸임) 1장당 <b>2점</b>. 한 영역에 여러 말이면 <b>숫자 합</b>이 큰 쪽이 점수(같으면 모두). 완성되면 말을 돌려받아요.</li>
<li>끝까지 <b>미완성인 영역은 0점</b>. 점수가 가장 높은 사람 승리.</li></ol>
<div class="tipbox">💡 <b>팁</b><br>· 말을 오래 묶어 두면 나중에 쓸 말이 없어요 — 금방 완성될 곳에!<br>· 남의 땅에 이어 붙여 큰 숫자 말로 빼앗을 수도.<br>· 미리보기를 보고 다음 라운드를 준비하세요.</div>`;
const guideSteps=[
  {t:'🧱 타일 고르기', h:`라운드마다 ${PER}장 공개, 한 명씩 <b>1장</b>씩 골라 놓아요. 다음 라운드 타일도 <b>미리보기</b>로 보여요.`, demo:s=>{ s.round=0; startRound(s); s.actor=0; s.turn=0; return s; }},
  {t:'🔗 이어 붙이기', h:'길은 길끼리, 땅은 땅끼리, 풀은 풀끼리 <b>맞닿아야</b> 해요. 회전해서 맞추세요.', demo:s=>{ s.round=0; startRound(s); s.board['1,0']={t:0,r:1,by:0}; s.board['-1,0']={t:1,r:3,by:1}; return s; }},
  {t:'♟️ 말로 차지', h:'놓은 타일의 빈 영역에 말(1·1·1·2·2·3) 하나. 숫자 합이 큰 쪽이 그 영역의 주인!', demo:s=>{ s.round=0; startRound(s); s.board['1,0']={t:0,r:1,by:0}; s.meeps=[{p:0,n:2,node:'1,0,0'},{p:1,n:1,node:'0,0,0'}]; return s; }},
  {t:'✨ 완성하면 점수', h:'길 1장당 <b>1점</b>, 땅 1장당 <b>2점</b> — <b>완성</b>해야만 점수! 미완성은 0점.', demo:s=>{ s.round=0; startRound(s); s.score=[12,7,9]; return s; }},
];
window.GAMES.blackvillage = { _sync:x=>syncH(x), maxH:3,
  title:'블랙 빌리지', ref:'피의 게임 「블랙 빌리지」', emoji:'🏘️', tags:['타일 놓기','영역','전략','NPC','두뇌서바이벌'],
  tagline:'길은 길끼리, 땅은 땅끼리 — 영역을 완성하고 숫자 말로 차지하라.',
  guide, guideSteps, init, apply, mask, ai, aiDelay, render, status, step, stepDelay, noPersona:true, local:true,
  reset(){ selK=null; rot=0; spot=null; meep=null; sig=''; },
  bar:(v,i)=>`<span class="tag">${v.score[HSEAT[i]]}점</span>`,
  result:(v,ctx)=>`${v.score[HSEAT[ctx.me]]}점`,
  _decide:decide, _region:region,
};
})();
