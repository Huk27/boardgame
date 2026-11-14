(function(){
'use strict';
/* 메모리30 (피의 게임 시즌 3 · 9일차 데스매치) — 1:1:1 (우리 둘 + NPC 1명).
   라운드마다 명제 30개가 한 장씩 지나감(가상 인물 6명의 반려동물·사는 층·나이·좋아하는 색·단골 메뉴). 다시 볼 수 없음.
   이어서 문제 15개(4지선다). 셋이 몰래 고르고 동시에 공개 — 맞히면 +1, 틀려도 감점 없음.
   2라운드 합계가 가장 높은 사람 승리(우리 둘 중 높은 쪽이 승리). */
/* 👥 N명: 사람 3명이면 NPC 없이 */
const N=3, ROUNDS=2, NF=30, NQ=15, SHOW=2300, QT=15000; let HSEAT=[0,1]; const SEATORD=[0,1,2];
const syncH=x=>{ if(x&&x.hs) HSEAT=x.hs; };
const isH=i=>HSEAT.includes(i), pOf=i=>HSEAT.indexOf(i), ALL=[0,1,2];
const nm=i=>`{s${i}}`;
const NAMES=['하늘','바다','별이','구름','시내','솔이','나래','다온','한결','보람','이슬','가람'];
const PETS=['고양이','강아지','앵무새','거북이'], COLORS=['빨강','파랑','초록','노랑','보라','주황','분홍','하늘색'], FOODS=['김밥','떡볶이','냉면','비빔밥','짜장면','순두부','칼국수','만두'];
const jo=(w,a,b)=>{ const c=w.charCodeAt(w.length-1); return c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28?a:b; };
function gen(){
  const P=U.shuffle(NAMES.slice()).slice(0,6), fl=U.shuffle([1,2,3,4,5,6,7,8,9]).slice(0,6), ag=U.shuffle([...Array(19)].map((_,k)=>21+k)).slice(0,6);
  const co=U.shuffle(COLORS.slice()).slice(0,6), fo=U.shuffle(FOODS.slice()).slice(0,6), pe=P.map(()=>U.pick(PETS));
  const D=P.map((p,k)=>({p, pet:pe[k], floor:fl[k], age:ag[k], color:co[k], food:fo[k]}));
  const facts=[]; const fid={};
  D.forEach((d,k)=>{ const add=(key,t)=>{ fid[k+':'+key]=facts.length; facts.push(t); };
    add('pet',`${d.p}${jo(d.p,'은','는')} ${d.pet}${jo(d.pet,'을','를')} 키운다.`); add('floor',`${d.p}${jo(d.p,'은','는')} ${d.floor}층에 산다.`); add('age',`${d.p}${jo(d.p,'은','는')} ${d.age}살이다.`);
    add('color',`${d.p}${jo(d.p,'이','가')} 좋아하는 색은 ${d.color}.`); add('food',`${d.p}의 단골 메뉴는 ${d.food}.`); });
  const order=U.shuffle(facts.map((_,k)=>k)); const shown=order.map(k=>facts[k]); const pos={}; order.forEach((k,j)=>pos[k]=j);
  const F=(k,key)=>pos[fid[k+':'+key]];
  const qs=[], seen=new Set();
  const opts=(right,pool)=>{ const o=U.shuffle(pool.filter(x=>x!==right)).slice(0,3).concat([right]); return U.shuffle(o); };
  const makers=[
    ()=>{ const k=Math.random()*6|0, key=U.pick(['pet','floor','age','color','food']); const d=D[k]; const L={pet:'키우는 동물',floor:'사는 층',age:'나이',color:'좋아하는 색',food:'단골 메뉴'}[key];
      const pool={pet:PETS,floor:[1,2,3,4,5,6,7,8,9].map(x=>x+'층'),age:[...Array(19)].map((_,j)=>(21+j)+'살'),color:COLORS,food:FOODS}[key]; const right={floor:d.floor+'층',age:d.age+'살'}[key]||d[key];
      const o=opts(right,pool); return {id:'d'+k+key, q:`${d.p}의 ${L}${jo(L,'은','는')}?`, o, a:o.indexOf(right), need:[F(k,key)]}; },
    ()=>{ const k=Math.random()*6|0, key=U.pick(['floor','color','food','age']); const d=D[k]; const v=key==='floor'?d.floor+'층에 사는':key==='age'?d.age+'살인':key==='color'?`${d.color}${jo(d.color,'을','를')} 좋아하는`:`${d.food}${jo(d.food,'이','가')} 단골인`;
      const o=opts(d.p,P); return {id:'r'+k+key, q:`${v} 사람은?`, o, a:o.indexOf(d.p), need:[F(k,key)]}; },
    ()=>{ const pet=U.pick(PETS), c=D.filter(d=>d.pet===pet).length; const o=[0,1,2,3].map(x=>x+(c>3?c-3:0)+'명'); return {id:'c'+pet, q:`${pet}${jo(pet,'을','를')} 키우는 사람은 몇 명?`, o, a:o.indexOf(c+'명'), need:D.map((_,k)=>F(k,'pet'))}; },
    ()=>{ const hi=Math.random()<.5; const key=U.pick(['floor','age']); const k=D.map((d,j)=>j).sort((a,b)=>(D[b][key]-D[a][key])*(hi?1:-1))[0]; const o=opts(D[k].p,P);
      return {id:'m'+hi+key, q:key==='floor'?`가장 ${hi?'높은':'낮은'} 층에 사는 사람은?`:`가장 ${hi?'나이가 많은':'어린'} 사람은?`, o, a:o.indexOf(D[k].p), need:D.map((_,j)=>F(j,key))}; },
    ()=>{ const [x,y]=U.shuffle([0,1,2,3,4,5]).slice(0,2); const o=[D[x].p,D[y].p,'둘이 같은 층','알 수 없음']; const r=D[x].floor>D[y].floor?0:1;
      return {id:'v'+x+y, q:`${D[x].p}${jo(D[x].p,'와','와')} ${D[y].p} 중 더 높은 층에 사는 사람은?`.replace('와 ', jo(D[x].p,'과 ','와 ')), o, a:r, need:[F(x,'floor'),F(y,'floor')]}; },
  ];
  let g=0; while(qs.length<NQ&&g++<500){ const m=makers[g<NQ*3?(Math.random()<.45?0:Math.random()<.5?1:2+(Math.random()*3|0)):0](); if(!m||m.a<0||seen.has(m.id)) continue; seen.add(m.id); qs.push(m); }
  return {facts:shown, qs, D}; }
const STYLE={seojin:'logic', doyun:'warm', haram:'calm', yuna:'emo', minho:'sly', taekyung:'hot', jihu:'sly', soyul:'warm'};
const DEF_P={talk:.5,aggr:.5,trust:.5,bluff:.4,logic:.6,temper:.4};
const P=(s,i)=> (s.who&&s.who[i]&&NPCS.byId(s.who[i])) || DEF_P;
const LINES={
  logic:{right:['기억대로네요.','그건 확실했어요.'], wrong:['아… 거기서 헷갈렸네요.','순서가 꼬였어요.'], alone:['저만 맞혔네요.','다들 놓쳤군요.']},
  warm:{right:['헤헤 맞았다 😊','다행이다~'], wrong:['아 헷갈렸어요 😢','으음 그거였구나 🥲'], alone:['어머 저만 맞혔어요? 😊','운이 좋았네요~']},
  calm:{right:['…','…맞네.'], wrong:['…','…아.'], alone:['…','…저만.']},
  emo:{right:['꺄 맞았다!! 🥳','오예!'], wrong:['으아 틀렸어 😭','헐 그거 아니었어?!'], alone:['나만 맞혔어!! 😆','대박 천재인가 봐 🤩']},
  sly:{right:['당연하죠 😏','쉽네요 😏'], wrong:['…일부러 틀린 거예요 😏','흠'], alone:['다들 뭐 했어요? 😏','역시 저뿐이네요 😏']},
  hot:{right:['봤죠?! 🔥','맞혔다!'], wrong:['아 왜!! 😤','분하다!'], alone:['저만 맞혔어요! 🔥','실력이죠!']},
};
function lineOf(s,i,kind){ const st=STYLE[P(s,i).id]||'calm', L=(LINES[st]||LINES.calm)[kind]; if(!L) return ''; const used=(s.used[i]=s.used[i]||[]); const pool=L.filter(x=>!used.includes(x)); const raw=pool.length?U.pick(pool):U.pick(L); used.push(raw); return raw; }

function init(starter,o){ const k=Math.max(2,Math.min(3,(o&&o.humans)||2)); HSEAT=SEATORD.slice(0,k);
  const s={phase:'intro', who:{}, starter:starter|0, round:0, set:null, fi:-1, qi:-1, pick:[null,null,null], score:[0,0,0], until:0, mem:null, hist:[], used:{}, say:null, log:[], turn:null, winner:null, ev:0,
    notice:'🎙️ 데스매치 「메모리30」 — 명제 30개를 외우고 문제 15개에 답하세요'};
  s.hs=HSEAT.slice(); if(!isH(2)) s.who[2]=NPCS.cast(1)[0]; return s;
}
function startRound(s){ s.round++; s.set=gen(); s.fi=0; s.qi=-1; s.phase='show'; s.until=Date.now()+SHOW;
  const acc=.55+P(s,2).logic*.3; s.mem=s.set.facts.map(()=>Math.random()<acc);
  s.notice=`🎙️ ${s.round}라운드 — 명제 ${NF}개가 한 장씩 지나가요. 필기 금지!`; s.log.push(`🧠 ${s.round}라운드 명제 공개`); }
function nextQ(s){ s.qi++; s.pick=[null,null,null]; s.phase='q'; s.until=Date.now()+QT; s.npcAt=Date.now()+2500+Math.random()*7000*(1.2-P(s,2).temper*.5);
  s.notice=`❓ ${s.round}라운드 ${s.qi+1}/${NQ}번`; }
function npcAnswer(s,i,mem,lvlAdj){ const Q=s.set.qs[s.qi]; const have=Q.need.filter(f=>mem[f]).length, all=have===Q.need.length;
  if(all&&Math.random()<.96) return Q.a; const frac=have/Q.need.length; if(Q.need.length>1&&Math.random()<frac*.5) return Q.a; return Math.random()*4|0; }
function apply(s,p,a){ syncH(s); if(s.winner!=null) return '게임이 끝났어요'; if(!a||a.k!=='pick') return '알 수 없는 동작'; if(s.phase!=='q') return '지금은 답할 때가 아니에요'; const i=HSEAT[p];
  if(s.pick[i]!=null) return '이미 냈어요'; const k=a.n|0; if(k<0||k>3) return '보기를 고르세요'; s.pick[i]=k; s.ev++; return null; }
function stepDelay(s){ syncH(s); if(s.winner!=null) return null; const now=Date.now();
  if(s.phase==='intro') return 2200; if(s.phase==='show'||s.phase==='gap') return Math.max(50,s.until-now);
  if(s.phase==='q'){ if(s.pick.every(x=>x!=null)) return 500; let t=s.until-now; if(!isH(2)&&s.pick[2]==null) t=Math.min(t,s.npcAt-now); return Math.max(50,t); }
  if(s.phase==='rev') return 2600; if(s.phase==='rend') return 3500; return null; }
function step(s){ syncH(s); const now=Date.now();
  if(s.phase==='intro'){ startRound(s); s.ev++; return; }
  if(s.phase==='show'){ if(now<s.until) return; s.fi++; if(s.fi<NF){ s.until=now+SHOW; s.ev++; return; } s.phase='gap'; s.until=now+2500; s.notice='🙈 명제가 모두 지나갔어요. 이제 문제!'; s.ev++; return; }
  if(s.phase==='gap'){ if(now<s.until) return; nextQ(s); s.ev++; return; }
  if(s.phase==='q'){ if(!isH(2)&&s.pick[2]==null&&now>=s.npcAt){ s.pick[2]=npcAnswer(s,2,s.mem); s.ev++; return; }
    if(s.pick.every(x=>x!=null)||now>=s.until){ const Q=s.set.qs[s.qi]; s.phase='rev'; const ok=ALL.filter(i=>s.pick[i]===Q.a); ok.forEach(i=>s.score[i]++);
      s.notice=`🔓 정답 ${Q.a+1}번 「${Q.o[Q.a]}」 — ${ok.length?ok.map(nm).join(' · ')+' +1':'아무도 못 맞혔어요'}`; s.log.push(`${s.qi+1}. ${Q.q} → ${Q.o[Q.a]} (${ok.length?ok.map(nm).join(' '):'-'})`);
      s.hist.push({r:s.round,q:s.qi,pick:s.pick.slice(),a:Q.a});
      const me=s.pick[2]===Q.a; if(!isH(2)&&Math.random()<P(s,2).talk*.55){ const t=lineOf(s,2, me&&ok.length===1?'alone':me?'right':'wrong'); if(t) s.say={seat:2,text:t,n:(s.say?s.say.n:0)+1}; }
      s.ev++; } return; }
  if(s.phase==='rev'){ if(s.qi<NQ-1){ nextQ(s); } else { s.phase='rend'; s.notice=`📊 ${s.round}라운드 끝 — ${ALL.map(i=>`${nm(i)} ${s.score[i]}`).join(' · ')}`; s.log.push(s.notice); } s.ev++; return; }
  if(s.phase==='rend'){ if(s.round<ROUNDS){ startRound(s); s.ev++; return; } s.phase='over'; const a=s.score[0], b=s.score[1]; s.winner=a>b?0:b>a?1:'both'; { const mx=Math.max(...HSEAT.map(h=>s.score[h])); s.winners=HSEAT.map((h,p)=>s.score[h]===mx?p:-1).filter(x=>x>=0); }
    const top=Math.max(...s.score); s.notice=`🏁 최종 ${ALL.map(i=>`${nm(i)} ${s.score[i]}`).join(' · ')} — ${ALL.filter(i=>s.score[i]===top).map(nm).join(' · ')} 생존!`; s.log.push(s.notice); s.ev++; return; }
}
function mask(s,p){ syncH(s); const v=U.clone(s), me=HSEAT[p]; v.mem=null;
  if(v.set){ v.set={facts:null, cur: s.phase==='show'&&s.fi<NF ? s.set.facts[s.fi] : null, qs: s.set.qs.map((q,k)=>({q:q.q, o:q.o, a: (k<s.qi||(k===s.qi&&s.phase!=='q'))?q.a:null}))};
    if(s.phase==='over'||s.phase==='rend') v.set.facts=s.set.facts; }
  if(s.phase==='q') v.pick=s.pick.map((x,i)=>i===me?x:(x!=null?-1:null)); return v; }
/* 혼자 모드 상대: 명제를 볼 때 기억(실력별 정확도)한 문장만 정리해 두고, 그 기억으로 문제를 품 */
let MEM={};
const LV=[.52,.65,.75];
function learn(kb,txt){ let m;
  if((m=txt.match(/^(.+?)[은는] (.+?)[을를] 키운다/))) (kb[m[1]]=kb[m[1]]||{}).pet=m[2];
  else if((m=txt.match(/^(.+?)[은는] (\d+)층에 산다/))) (kb[m[1]]=kb[m[1]]||{}).floor=+m[2];
  else if((m=txt.match(/^(.+?)[은는] (\d+)살이다/))) (kb[m[1]]=kb[m[1]]||{}).age=+m[2];
  else if((m=txt.match(/^(.+?)[이가] 좋아하는 색은 (.+)\./))) (kb[m[1]]=kb[m[1]]||{}).color=m[2];
  else if((m=txt.match(/^(.+?)의 단골 메뉴는 (.+)\./))) (kb[m[1]]=kb[m[1]]||{}).food=m[2]; }
function solve(kb,Q){ const o=Q.o.map(String), q=Q.q, rnd=()=>Math.random()*4|0, idx=x=>{ const k=o.indexOf(String(x)); return k>=0?k:rnd(); }; let m;
  const KEY={'키우는 동물':'pet','사는 층':'floor','나이':'age','좋아하는 색':'color','단골 메뉴':'food'};
  if((m=q.match(/^(.+?)의 (키우는 동물|사는 층|나이|좋아하는 색|단골 메뉴)[은는]\?/))){ const d=kb[m[1]], k=KEY[m[2]]; if(!d||d[k]==null) return rnd(); return idx(k==='floor'?d.floor+'층':k==='age'?d.age+'살':d[k]); }
  const who=(fn)=>{ const hit=Object.keys(kb).find(n=>fn(kb[n])); return hit!=null?idx(hit):rnd(); };
  if((m=q.match(/^(\d+)층에 사는 사람은/))) return who(d=>d.floor===+m[1]);
  if((m=q.match(/^(\d+)살인 사람은/))) return who(d=>d.age===+m[1]);
  if((m=q.match(/^(.+?)[을를] 좋아하는 사람은/))) return who(d=>d.color===m[1]);
  if((m=q.match(/^(.+?)[이가] 단골인 사람은/))) return who(d=>d.food===m[1]);
  if((m=q.match(/^(.+?)[을를] 키우는 사람은 몇 명/))){ const known=Object.values(kb).filter(d=>d.pet!=null); const c=known.filter(d=>d.pet===m[1]).length; const est=Math.round(c+(6-known.length)/4); return idx(est+'명'); }
  if((m=q.match(/^가장 (높은|낮은) 층/))){ const c=o.map(n=>kb[n]&&kb[n].floor!=null?kb[n].floor:null); if(c.every(x=>x==null)) return rnd(); const v=c.map(x=>x==null?(m[1]==='높은'?-1:99):x); return v.indexOf(m[1]==='높은'?Math.max(...v):Math.min(...v)); }
  if((m=q.match(/^가장 (나이가 많은|어린)/))){ const c=o.map(n=>kb[n]&&kb[n].age!=null?kb[n].age:null); if(c.every(x=>x==null)) return rnd(); const v=c.map(x=>x==null?(m[1]==='어린'?99:-1):x); return v.indexOf(m[1]==='어린'?Math.min(...v):Math.max(...v)); }
  if(/중 더 높은 층/.test(q)){ const a=kb[o[0]], b=kb[o[1]]; if(a&&b&&a.floor!=null&&b.floor!=null) return a.floor>b.floor?0:1; return Math.random()*2|0; }
  return rnd(); }
function ai(v,lvl){ syncH(v); const i=HSEAT[1]; lvl=lvl==null?1:lvl;
  if(v.phase==='show'&&v.set&&v.set.cur!=null){ if(MEM.r!==v.round){ MEM={r:v.round, kb:{}, seen:{}}; } if(!MEM.seen[v.fi]){ MEM.seen[v.fi]=1; if(Math.random()<LV[lvl]) learn(MEM.kb,v.set.cur); } return null; }
  if(v.phase==='q'&&v.pick[i]==null){ if(MEM.q!==v.round+':'+v.qi){ MEM.q=v.round+':'+v.qi; MEM.at=Date.now()+2000+Math.random()*8000; } if(Date.now()<MEM.at) return null;
    return {k:'pick', n:solve(MEM.kb||{},v.set.qs[v.qi])}; }
  return null; }
function aiDelay(S){ if(S.phase==='show') return 250; if(S.phase==='q') return MEM.at?Math.max(300,Math.min(2500,MEM.at-Date.now())):1000; return 1200; }

/* 화면 */
let WHO={}, sig='', tick=null;
const NPCI=i=>{ const p=NPCS.byId(WHO[i]); return p?[p.emo,p.name,p.arch]:['🙂','?','']; };
const seatEmoji=i=> isH(i) ? U.ava(pOf(i)) : NPCI(i)[0];
function seatName(i,ctx){ if(isH(i)){ const p=pOf(i); return p===ctx.me&&ctx.mode!=='local' ? `${U.esc(ctx.name(p))}(나)` : U.esc(ctx.name(p)); } return NPCI(i)[1]; }
function fill(t,ctx){ return String(t).replace(/\{s(\d)\}/g,(_,d)=>`${seatEmoji(+d)} ${seatName(+d,ctx)}`); }
function render(el,v,ctx){ syncH(v);
  WHO=v.who||{}; const me=HSEAT[ctx.me];
  clearInterval(tick); tick=null; if(v.phase==='q') tick=setInterval(()=>{ const e=document.getElementById('m3T'); if(e) e.textContent=Math.max(0,Math.ceil((v.until-Date.now())/1000))+'초'; else { clearInterval(tick); tick=null; } },400);
  let h=`<div class="hl-notice">${fill(U.esc(v.notice||''),ctx)}</div>`;
  h+=`<div class="vr-speech">${v.say?`<span class="w">${seatEmoji(v.say.seat)} ${seatName(v.say.seat,ctx)}</span> ${fill(U.esc(v.say.text),ctx)}`:'<i>　</i>'}</div>`;
  h+=`<div class="pw-seats">${ALL.map(i=>`<div class="pw-seat ${i===me?'me':''}"><div class="ev-nm">${seatEmoji(i)} ${seatName(i,ctx)}</div>${isH(i)?'':`<small class="ev-arch">${NPCI(i)[2]}</small>`}<div class="pw-sc">${v.score[i]}점</div><small>${v.phase==='q'?(v.pick[i]!=null?'✅ 제출':'💭'):v.phase==='rev'&&v.pick[i]!=null?`${v.pick[i]+1}번 ${v.set.qs[v.qi].a===v.pick[i]?'⭕':'❌'}`:''}</small></div>`).join('')}</div>`;
  if(v.phase==='show'&&v.set&&v.set.cur) h+=`<div class="m3-card"><small>명제 ${v.fi+1} / ${NF}</small><div>${U.esc(v.set.cur)}</div><div class="m3-bar"><i style="width:${(v.fi+1)/NF*100}%"></i></div></div>`;
  if((v.phase==='q'||v.phase==='rev')&&v.set){ const Q=v.set.qs[v.qi], my=v.pick[me];
    h+=`<div class="vr-card"><b>❓ ${v.qi+1}번. ${U.esc(Q.q)}</b> ${v.phase==='q'?`<span class="hc-lock" id="m3T">${Math.max(0,Math.ceil((v.until-Date.now())/1000))}초</span>`:''}
      <div class="cm-opts">${Q.o.map((o,k)=>`<button class="m3-o ${my===k?'sel':''} ${Q.a===k?'ans':''}" data-n="${k}" ${v.phase==='q'&&my==null?'':'disabled'}>${k+1}. ${U.esc(String(o))}</button>`).join('')}</div>
      <small>${v.phase==='q'?(my==null?'몰래 고르세요 — 셋이 동시에 공개':'냈어요 — 기다리는 중'):''}</small></div>`; }
  if((v.phase==='rend'||v.phase==='over')&&v.set&&v.set.facts) h+=`<details class="m3-facts"><summary>📜 ${v.round}라운드 명제 30개 다시 보기</summary>${v.set.facts.map((f,k)=>`<div>${k+1}. ${U.esc(f)}</div>`).join('')}</details>`;
  if(v.phase==='over') h+=`<div class="sn-score">${ALL.slice().sort((a,b)=>v.score[b]-v.score[a]).map(i=>`<div class="${isH(i)?'h':''}"><b>${seatEmoji(i)} ${seatName(i,ctx)}</b> ${v.score[i]}점</div>`).join('')}</div>`;
  h+=`<div class="bm-log">${v.log.slice(-6).reverse().map(x=>`<div>${fill(U.esc(x),ctx)}</div>`).join('')}</div>`;
  el.innerHTML=h;
  el.onclick=e=>{ const b=e.target.closest('[data-n]'); if(b&&!b.disabled) return ctx.act({k:'pick',n:+b.dataset.n}); };
}
function status(v,ctx){ syncH(v); if(v.phase==='over') return ''; if(v.phase==='show') return '명제를 외우세요!'; if(v.phase==='q') return v.pick[HSEAT[ctx.me]]==null?'답을 고르세요':'공개 대기'; return '진행 중…'; }
const guide=`
<p><b>명제 30개 기억 대결</b> — 1:1:1 (우리 둘 + 컴퓨터 1명).</p>
<ol><li>라운드마다 <b>명제 30개</b>가 한 장씩(약 ${SHOW/1000}초) 지나가요. 가상 인물 6명의 반려동물·사는 층·나이·좋아하는 색·단골 메뉴. <b>다시 볼 수 없어요</b>.</li>
<li>이어서 <b>문제 15개</b>(4지선다). 셋이 몰래 고르고 <b>동시에 공개</b> — 맞히면 +1, 틀려도 감점 없음.</li>
<li>문제는 "○○의 나이는?", "7층에 사는 사람은?", "고양이를 키우는 사람은 몇 명?", "가장 높은 층은?" 같은 것들.</li>
<li>${ROUNDS}라운드 합계가 가장 높은 사람이 생존. 우리 둘 중 높은 쪽이 승리.</li></ol>
<div class="tipbox">💡 <b>팁</b><br>· 다 외우기보다 "나올 만한 문제"를 미리 생각하며 보기(누가 제일 높은 층? 고양이는 몇 명?).<br>· 사람별로 묶어 기억하면 쉬워요.</div>`;
const guideSteps=[
  {t:'📜 명제 30개', h:'명제가 <b>한 장씩</b> 지나가요. 다시 볼 수 없으니 집중! (필기 금지)', demo:s=>{ s.round=0; startRound(s); s.fi=4; return s; }},
  {t:'❓ 문제 15개', h:'4지선다. 셋이 <b>몰래</b> 고르고 <b>동시에 공개</b>. 맞히면 +1, 틀려도 감점 없음.', demo:s=>{ s.round=0; startRound(s); s.fi=NF; s.qi=-1; nextQ(s); return s; }},
  {t:'🏆 2라운드 합계', h:'2라운드(문제 30개) 합계가 가장 높은 사람이 생존!', demo:s=>{ s.round=0; startRound(s); s.qi=-1; nextQ(s); s.phase='rev'; s.pick=[s.set.qs[0].a,1,s.set.qs[0].a]; s.score=[9,7,8]; return s; }},
];
window.GAMES.memory30 = { _sync:x=>syncH(x), maxH:3,
  title:'메모리30', ref:'피의 게임 「메모리30」', emoji:'📜', tags:['기억력','퀴즈','NPC','두뇌서바이벌'],
  tagline:'한 장씩 지나가는 명제 30개 — 다시 볼 수 없다. 기억만으로 15문제를 맞혀라.',
  guide, guideSteps, init, apply, mask, ai, aiDelay, render, status, step, stepDelay, noPersona:true,
  reset(){ MEM={}; sig=''; clearInterval(tick); tick=null; },
  bar:(v,i)=>`<span class="tag">${v.score[HSEAT[i]]}점</span>`,
  result:(v,ctx)=>`${v.score[HSEAT[ctx.me]]}점`,
  _gen:gen, _LV:LV, _learn:learn, _solve:solve,
};
})();
