(function(){
'use strict';
/* 가위바위보 9장 승부: 각자 ✊바위·🖐️보·✌️가위 카드를 3장씩. 9판 동안 한 장씩 동시에 내고, 이긴 판이 많은 쪽 승리.
   상대가 무슨 카드를 몇 장 남겼는지는 공개 → 뒤로 갈수록 추리 싸움. */
const H=['r','p','s'], EMO={r:'✊',p:'🖐️',s:'✌️'}, NAME={r:'바위',p:'보',s:'가위'};
const beats=(a,b)=>(a==='r'&&b==='s')||(a==='s'&&b==='p')||(a==='p'&&b==='r');
function init(starter){ return {hand:[{r:3,p:3,s:3},{r:3,p:3,s:3}], pick:[null,null], round:1, score:[0,0], hist:[], phase:'pick', cd:0, res:null, turn:null, starter, winner:null}; }
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(!a||a.k!=='play') return '알 수 없는 동작';
  if(s.phase!=='pick') return '지금은 낼 때가 아니에요';
  if(s.pick[p]) return '이미 냈어요';
  if(!H.includes(a.h)) return '카드를 고르세요';
  if(s.hand[p][a.h]<=0) return `${NAME[a.h]} 카드가 없어요`;
  s.pick[p]=a.h; s.hand[p][a.h]--;
  if(s.pick[0]&&s.pick[1]){ s.phase='cd'; s.cd=3; }
  return null;
}
function settle(s){
  const [a,b]=s.pick, w = a===b ? -1 : beats(a,b) ? 0 : 1;
  if(w>=0) s.score[w]++;
  s.res={a,b,w}; s.hist.push({round:s.round,a,b,w}); s.phase='result';
}
const stepDelay=s=> s.winner!=null ? null : s.phase==='cd' ? 600 : s.phase==='result' ? 2600 : null;
function step(s){
  if(s.phase==='cd'){ s.cd--; if(s.cd<=0) settle(s); return; }
  if(s.phase==='result'){
    if(s.round>=9){ const [x,y]=s.score; s.winner=x>y?0:y>x?1:'draw'; s.phase='over'; return; }
    s.round++; s.pick=[null,null]; s.res=null; s.phase='pick';
  }
}
function mask(s,p){
  const v=U.clone(s), o=1-p;
  if(s.phase==='pick'||s.phase==='cd'){
    v.pick[o]= s.pick[o] ? 'done' : null;
    if(s.pick[o]) v.hand[o][s.pick[o]]++;   // 상대가 이번에 낸 카드는 공개 전까지 손에 있는 것처럼 보여줌
  }
  return v;
}
/* 컴퓨터: 남은 판 전체를 끝까지 계산(상대는 남은 카드 비율대로 낸다고 가정)해서 기대 승점이 가장 높은 카드.
   상태가 적어서(각자 카드 수 0~3) 바로 계산됨. 실력이 낮을수록 엉뚱하게 낼 확률↑ */
const memo=new Map();
function val(m,o){   // m,o: [r,p,s] 남은 수 → 내가 최선으로 둘 때 남은 판들의 기대 (내 승 − 상대 승)
  const tot=o[0]+o[1]+o[2]; if(!tot) return 0;
  const key=m.join("")+"|"+o.join(""); if(memo.has(key)) return memo.get(key);
  let best=-1e9;
  for(let i=0;i<3;i++){ if(!m[i]) continue; let ev=0;
    for(let j=0;j<3;j++){ if(!o[j]) continue; const pay = i===j?0 : beats(H[i],H[j])?1:-1;
      const m2=m.slice(); m2[i]--; const o2=o.slice(); o2[j]--; ev += o[j]/tot*(pay+val(m2,o2)); }
    if(ev>best) best=ev; }
  memo.set(key,best); return best;
}
/* 사람 버릇 읽기 (보통·어려움): 지난 판들에서
   - 방금 낸 카드를 또 내는 비율 / 지난 판에 진 카드를 이기는 카드로 바꾸는 비율 등
   을 세어서 이번에 낼 카드를 짐작 (남은 카드 수 안에서). 버릇이 없으면 남은 카드 비율 그대로. */
const BEAT={r:'p',p:'s',s:'r'};   // x를 이기는 카드
function predict(v){
  const his=H.map(h=>v.hand[0][h]), tot=his[0]+his[1]+his[2]; if(!tot) return null;
  const base=his.map(c=>c/tot);
  const hs=v.hist; if(hs.length<2) return {p:base, why:null};
  // 규칙 후보: 같은 걸 또(stay), 지난번 상대(나)의 카드를 이기는 카드(counter), 지난번 내 카드를 이기는 카드로(up)
  const rules={stay:x=>x.a, counter:x=>BEAT[x.b], up:x=>BEAT[x.a]};
  let best=null, bs=0;
  for(const [k,fn] of Object.entries(rules)){
    let hit=0,n=0; for(let i=1;i<hs.length;i++){ n++; if(hs[i].a===fn(hs[i-1])) hit++; }
    const rate=(hit+.5)/(n+1.5);   // 무작위면 1/3쯤
    if(rate>bs){ bs=rate; best=k; } }
  if(bs<.45) return {p:base, why:null};
  const guess=rules[best](hs[hs.length-1]), gi=H.indexOf(guess);
  if(!his[gi]) return {p:base, why:null};
  const strength=Math.min(1,(bs-.33)/.5);
  const p=base.map((x,i)=> i===gi ? x+(1-x)*strength : x*(1-strength));
  return {p, why:best, guess};
}
let saidAt=-1;
function ai(v,lvl=1){
  if(v.phase!=="pick"||v.pick[1]) return null;
  if(v.round===1) saidAt=-1;
  const mine=H.map(h=>v.hand[1][h]), his=H.map(h=>v.hand[0][h]), tot=his[0]+his[1]+his[2]||1;
  if(Math.random()<[.45,.15,0][lvl]){ const c=H.filter((h,i)=>mine[i]); return {k:"play",h:U.pick(c)}; }
  let pr=his.map(c=>c/tot), why=null;
  if(lvl>0){ const P=predict(v); if(P){ pr = lvl===2 ? P.p : P.p.map((x,i)=>(x+his[i]/tot)/2); why=P.why;
    if(why && typeof showSay==='function' && v.round-saidAt>=3 && Math.random()<.5){ saidAt=v.round; const L={stay:['또 같은 거 내실 것 같은데~','한 번 낸 건 또 내시더라구요 ㅎ'], counter:['제가 낸 걸 이기려고 하시죠? 😏','다 읽혀요~'], up:['순서대로 돌리시는 거 같은데?','바위→보→가위… 맞죠? ㅎㅎ']}[why]; setTimeout(()=>showSay(1,U.pick(L),3000),300); } } }
  let best=null, bs=-1e9;
  for(let i=0;i<3;i++){ if(!mine[i]) continue; let ev=0;
    for(let j=0;j<3;j++){ if(!his[j]||!pr[j]) continue; const pay=i===j?0:beats(H[i],H[j])?1:-1; const m2=mine.slice(); m2[i]--; const o2=his.slice(); o2[j]--; ev+=pr[j]*(pay+val(m2,o2)); }
    ev+=Math.random()*.05; if(ev>bs){ bs=ev; best=H[i]; } }
  return {k:"play", h:best};
}

/* 화면 */
function render(el,v,ctx){
  const me=ctx.me, o=1-me;
  const who=i=> i===me&&ctx.mode!=='local' ? '나' : U.esc(ctx.name(i));
  const handRow=(i,mine)=>H.map(h=>`<span class="r9-cnt ${v.hand[i][h]?'':'zero'}">${EMO[h]}<b>${v.hand[i][h]}</b></span>`).join('');
  let call='';
  if(v.phase==='cd') call=['','보!','바위!','가위!'][v.cd]||'';
  const rev = v.phase==='result' || v.phase==='over';
  const R=v.res;
  const card=(i)=> rev&&R ? `<span class="r9-card show">${EMO[i===0?R.a:R.b]}</span>` : v.pick[i] ? `<span class="r9-card back">🂠</span>` : `<span class="r9-card wait">…</span>`;
  let h=`<div class="info">${Math.min(v.round,9)} / 9판 · <b>${v.score[me]}</b> : <b>${v.score[o]}</b> · 남은 판 ${9-v.hist.length}</div>`;
  h+=`<div class="r9-stage">
    <div class="r9-side"><small>${who(o)} 남은 카드</small><div class="r9-hand">${handRow(o)}</div>${card(o)}</div>
    <div class="r9-call ${call?'on':''}">${call || (rev&&R ? (R.w===-1?'비김':R.w===me?'승!':'패…') : 'VS')}</div>
    <div class="r9-side">${card(me)}<div class="r9-hand">${handRow(me)}</div><small>${who(me)} 남은 카드</small></div>
  </div>`;
  if(ctx.can && v.phase==='pick' && !v.pick[me]){
    h+=`<div class="fh-act">${H.map(x=>`<button class="rp-btn" data-h="${x}" ${v.hand[me][x]?'':'disabled'}>${EMO[x]}<small>${NAME[x]} ×${v.hand[me][x]}</small></button>`).join('')}</div>`;
  }
  if(v.hist.length){
    h+=`<div class="r9-hist">${v.hist.map(x=>`<span class="${x.w===-1?'d':x.w===me?'w':'l'}">${x.round} ${EMO[me===0?x.a:x.b]}${EMO[me===0?x.b:x.a]}</span>`).join('')}</div>`;
  }
  el.innerHTML=h;
  el.onclick=e=>{ const b=e.target.closest('[data-h]'); if(b&&!b.disabled) ctx.act({k:'play',h:b.dataset.h}); };
}
function status(v,ctx){
  const me=ctx.me, o=1-me;
  if(v.phase==='pick') return !v.pick[me] ? '낼 카드를 고르세요 (상대 남은 카드를 보고 추리!)' : (v.pick[o]?'곧 공개!':'상대가 고르는 중…');
  if(v.phase==='cd') return '가위바위보!';
  return '';
}
const guide=`
<p>각자 <b>✊ 바위 3장, 🖐️ 보 3장, ✌️ 가위 3장</b>, 모두 9장을 들고 시작해요. 9판 동안 한 장씩 <b>동시에</b> 내서, <b>이긴 판이 더 많은 사람</b>이 승리!</p>
<ul><li>낸 카드는 다시 못 써요.</li>
<li><b>상대가 무슨 카드를 몇 장 남겼는지 보여요.</b> 뒤로 갈수록 상대가 낼 수 있는 카드가 줄어들어요.</li>
<li>둘 다 내면 "가위! 바위! 보!"와 함께 공개.</li>
<li>같은 카드면 비김(점수 없음).</li></ul>
<div class="tipbox">💡 <b>팁</b><br>
· 상대에게 가위가 0장 남았다면? 바위를 내면 절대 안 져요!<br>
· 마지막 판은 서로 남은 카드가 1장씩이라 이미 결과가 정해져 있어요. 그 전에 계산하세요.<br>
· 초반에 한 종류를 몰아 쓰면 후반에 읽히기 쉬워요.<br>
· 🧠 컴퓨터(보통·어려움)는 내 <b>버릇</b>(같은 걸 또 내는지, 순서대로 돌리는지 등)을 읽어요.</div>`;
window.GAMES.rps9 = {
  title:'가위바위보 9장 승부', emoji:'🎴', tags:['심리전','두뇌서바이벌','추리'],
  pulse:v=>v.score[1]-v.score[0], pulseStep:1,
  tagline:'가위·바위·보 카드 3장씩, 9판 동시에 내기. 상대 남은 카드를 읽는 추리 가위바위보.',
  guide, init, apply, mask, ai, render, status, step, stepDelay,
  aiDelay:()=>1200+Math.random()*1800,
  bar:(v,i)=>`<span class="score">${v.score[i]}</span><span class="tag">승</span>`,
  result:(v,ctx)=>`${v.score[ctx.me]} : ${v.score[1-ctx.me]}`,
};
})();
