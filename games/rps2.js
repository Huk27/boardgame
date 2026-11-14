(function(){
'use strict';
/* 가위바위보 하나 빼기: 둘이 동시에 양손(손 두 개)을 냄 → 공개 → 상대 손을 보고 하나를 뺌 → 남은 손으로 승부. 먼저 3번 이기면 승리. */
const WIN=3, H=['r','p','s'], EMO={r:'✊',p:'🖐️',s:'✌️'}, NAME={r:'바위',p:'보',s:'가위'};
const beats=(a,b)=> (a==='r'&&b==='s')||(a==='s'&&b==='p')||(a==='p'&&b==='r');
function init(starter){ return {score:[0,0], round:1, phase:'pick', two:[null,null], keep:[null,null], cd:0, hist:[], res:null, turn:null, starter, winner:null}; }
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(!a) return '알 수 없는 동작';
  if(a.k==='two'){
    if(s.phase!=='pick') return '지금은 손을 낼 때가 아니에요';
    if(s.two[p]) return '이미 냈어요';
    const t=Array.isArray(a.h)?a.h:[]; if(t.length!==2||!t.every(x=>H.includes(x))) return '손 두 개를 고르세요';
    s.two[p]=t.slice();
    if(s.two[0]&&s.two[1]){ s.phase='cd1'; s.cd=3; }
    return null;
  }
  if(a.k==='keep'){
    if(s.phase!=='drop') return '지금은 뺄 때가 아니에요';
    if(s.keep[p]!=null) return '이미 골랐어요';
    const i=a.i|0; if(i!==0&&i!==1) return '남길 손을 고르세요';
    s.keep[p]=i;
    if(s.keep[0]!=null&&s.keep[1]!=null){ s.phase='cd2'; s.cd=2; }
    return null;
  }
  return '알 수 없는 동작';
}
// 구호에 맞춰 공개 (방장·혼자 쪽에서만)
const stepDelay=s=> s.winner!=null ? null : (s.phase==='cd1'||s.phase==='cd2') ? 650 : s.phase==='result' ? 2800 : null;
function step(s){
  if(s.phase==='cd1'){ s.cd--; if(s.cd<=0){ s.phase='drop'; } return; }
  if(s.phase==='cd2'){ s.cd--; if(s.cd<=0) settle(s); return; }
  if(s.phase==='result'){ if(s.winner==null){ s.round++; s.phase='pick'; s.two=[null,null]; s.keep=[null,null]; s.res=null; } }
}
function settle(s){
  const a=s.two[0][s.keep[0]], b=s.two[1][s.keep[1]];
  const w = a===b ? -1 : beats(a,b) ? 0 : 1;
  if(w>=0) s.score[w]++;
  s.res={a,b,w}; s.hist.push({round:s.round, two:[s.two[0],s.two[1]], kept:[a,b], w});
  s.phase='result';
  if(s.score[0]>=WIN||s.score[1]>=WIN) s.winner = s.score[0]>=WIN?0:1;
}
function mask(s,p){
  const v=U.clone(s), o=1-p;
  if(s.phase==='pick'||s.phase==='cd1') v.two[o] = s.two[o] ? (s.phase==='cd1'?null:'done') : null;   // 공개 전엔 안 보임
  if(s.phase==='cd1' && s.cd>0) v.two[o]='hidden';
  if(s.phase==='drop'||s.phase==='cd2') v.keep[o] = s.keep[o]!=null ? 'done' : null;
  return v;
}
/* 컴퓨터: 사람처럼 상대 버릇을 기억함. 지난 판들에서 상대가 어떤 손을 자주 남겼는지 세어 두고,
   뺄 때는 그 버릇대로 상대가 남길 확률을 짐작해 기대 승점이 높은 쪽을 남김. 버릇이 뚜렷하면 가끔 말로 찌름.
   실력: 쉬움은 버릇을 안 봄, 보통은 반쯤, 어려움은 제대로 */
function habit(v,o){ const f={r:1,p:1,s:1}; let n=0; for(const x of v.hist){ f[x.kept[o]]++; n++; } return {f,n}; }
let saidAt=-9;
function tease(v,h){ if(typeof showSay!=='function'||v.round-saidAt<3) return; const tot=h.f.r+h.f.p+h.f.s, top=H.reduce((a,b)=>h.f[a]>=h.f[b]?a:b);
  if(h.n>=3 && h.f[top]/tot>=.5 && Math.random()<.5){ saidAt=v.round; setTimeout(()=>showSay(1, U.pick(['또 '+EMO[top]+' 남기실 것 같은데~', NAME[top]+' 좋아하시죠? ㅎㅎ', '이번에도 '+NAME[top]+'? 다 보여요 😏']),3500),300); } }
function ai(v,lvl=1){
  const me=1, o=0, use=[0,.5,1][lvl];
  const h=habit(v,o), tot=h.f.r+h.f.p+h.f.s;
  const pay=(x,y)=> x===y?0 : beats(x,y)?1:-1;
  if(v.phase==='pick' && !v.two[me]){
    if(v.round===1) saidAt=-9;
    // 상대가 자주 남기는 손을 이기는 손을 하나 섞음
    const top=H.reduce((a,b)=>h.f[a]>=h.f[b]?a:b), counter=H.find(x=>beats(x,top));
    const a = use>0 && h.n>=2 && h.f[top]/tot>=.45 && Math.random()<use ? counter : U.pick(H);
    let b=U.pick(H); if(b===a && Math.random()<[.2,.75,.85][lvl]) b=U.pick(H.filter(x=>x!==a));
    return {k:'two', h:Math.random()<.5?[a,b]:[b,a]};
  }
  if(v.phase==='drop' && v.keep[me]==null && Array.isArray(v.two[o])){
    const mine=v.two[me], his=v.two[o];
    const w0=h.f[his[0]], w1=h.f[his[1]], q0 = his[0]===his[1] ? .5 : (1-use)*.5 + use*w0/(w0+w1);
    let best=0, bs=-9;
    for(let i=0;i<2;i++){
      const vs=his.map(y=>pay(mine[i],y));
      const ev=q0*vs[0]+(1-q0)*vs[1];
      const sc = (.5+.3*use)*ev + (.5-.3*use)*Math.min(...vs) + Math.random()*[3,.15,.05][lvl];
      if(sc>bs){ bs=sc; best=i; }
    }
    if(use>0) tease(v,h);
    return {k:'keep', i:best};
  }
  return null;
}

/* 화면 */
let pk=[], sig='';
function render(el,v,ctx){
  const me=ctx.me, o=1-me;
  const sg=v.round+':'+v.phase; if(sg!==sig){ sig=sg; if(v.phase==='pick') pk=[]; }
  const who=i=> i===me&&ctx.mode!=='local' ? '나' : U.esc(ctx.name(i));
  const hands=(t,keepIdx,hl)=> Array.isArray(t) ? t.map((x,i)=>`<span class="rp-h ${keepIdx===i?'keep':''} ${keepIdx!=null&&keepIdx!==i?'dropped':''} ${hl&&keepIdx==null?'':''}">${EMO[x]}</span>`).join('') : t==='done'||t==='hidden' ? '<span class="rp-h back">✋</span><span class="rp-h back">✋</span>' : '<span class="rp-h wait">…</span><span class="rp-h wait">…</span>';
  let call='';
  if(v.phase==='cd1') call=['','보!','바위!','가위!'][v.cd]||'';
  if(v.phase==='cd2') call=['','빼기!','하나~'][v.cd]||'';
  const reveal2 = v.phase==='result';
  const keepIdx=i=> reveal2 && v.hist.length ? v.two[i].indexOf(v.res[i===0?'a':'b']) : (v.phase==='drop'||v.phase==='cd2') && Number.isInteger(v.keep[i]) ? v.keep[i] : null;
  let h=`<div class="info">${v.round}판 · 먼저 ${WIN}승 · <b>${v.score[me]}</b> : <b>${v.score[o]}</b></div>`;
  h+=`<div class="rp-stage">
    <div class="rp-side"><small>${who(o)}</small><div class="rp-hands">${hands(v.two[o], reveal2?keepIdx(o):null)}</div></div>
    <div class="rp-call ${call?'on':''}">${call || (reveal2 ? (v.res.w===-1?'비김!':v.res.w===me?'이겼다!':'졌다…') : 'VS')}</div>
    <div class="rp-side"><div class="rp-hands mine">${hands(v.two[me], keepIdx(me))}</div><small>${who(me)}</small></div>
  </div>`;
  if(reveal2) h+=`<div class="banner ${v.res.w===me?'good':v.res.w===-1?'':'badx'}">${EMO[v.res[me===0?'a':'b']]} ${NAME[v.res[me===0?'a':'b']]} vs ${EMO[v.res[me===0?'b':'a']]} ${NAME[v.res[me===0?'b':'a']]} → ${v.res.w===-1?'비김, 다시!':v.res.w===me?'이번 판 승리 ✨':'이번 판 패배'}</div>`;
  if(ctx.can){
    if(v.phase==='pick' && !v.two[me]){
      h+=`<div class="info">양손에 낼 것을 하나씩 고르세요 (${pk.length}/2)</div><div class="fh-act">${H.map(x=>`<button class="rp-btn" data-h="${x}">${EMO[x]}<small>${NAME[x]}</small></button>`).join('')}</div>`;
      h+=`<div class="fh-act">${pk.length?`<span class="rp-picked">${pk.map(x=>EMO[x]).join(' ')}</span><button class="ghost small" data-a="undo">다시</button>`:''}${pk.length===2?'<button data-a="go">이 두 손으로!</button>':''}</div>`;
    } else if(v.phase==='drop' && v.keep[me]==null){
      h+=`<div class="info">상대 손을 보고, <b>남길 손</b>을 누르세요 (하나 빼기!)</div><div class="fh-act">${v.two[me].map((x,i)=>`<button class="rp-btn" data-k="${i}">${EMO[x]}<small>${NAME[x]} 남기기</small></button>`).join('')}</div>`;
    }
  }
  if(v.hist.length){
    h+=`<table class="hist"><tr><th>판</th><th>나 (두 손 → 남김)</th><th>상대 (두 손 → 남김)</th><th>결과</th></tr>${v.hist.map(x=>`<tr><td>${x.round}</td><td>${x.two[me].map(y=>EMO[y]).join('')} → ${EMO[x.kept[me]]}</td><td>${x.two[o].map(y=>EMO[y]).join('')} → ${EMO[x.kept[o]]}</td><td>${x.w===-1?'비김':x.w===me?'승':'패'}</td></tr>`).reverse().join('')}</table>`;
  }
  el.innerHTML=h;
  el.onclick=e=>{
    const b=e.target.closest('button'); if(!b) return;
    if(b.dataset.h){ if(pk.length<2){ pk.push(b.dataset.h); ctx.rerender(); } return; }
    if(b.dataset.a==='undo'){ pk=[]; ctx.rerender(); return; }
    if(b.dataset.a==='go'){ const t=pk.slice(); ctx.act({k:'two',h:t}); return; }
    if(b.dataset.k!=null) ctx.act({k:'keep',i:+b.dataset.k});
  };
}
function status(v,ctx){
  const me=ctx.me, o=1-me;
  if(v.phase==='pick') return !v.two[me] ? '양손에 낼 것을 고르세요' : (v.two[o]==='done'?'곧 공개!':'상대가 고르는 중…');
  if(v.phase==='cd1') return '가위바위보!';
  if(v.phase==='drop') return v.keep[me]==null ? '하나 빼기! 남길 손을 고르세요' : (v.keep[o]==='done'?'곧 공개!':'상대가 고르는 중…');
  if(v.phase==='cd2') return '하나 빼기!';
  return '';
}
const guide=`
<p>"가위바위보 <b>하나 빼기</b>!" 놀이를 둘이서. <b>먼저 ${WIN}번 이기면</b> 승리!</p>
<ol><li><b>양손 내기</b>: 왼손·오른손에 낼 것(가위/바위/보)을 하나씩 골라요. 같은 걸 두 번 골라도 돼요.</li>
<li>"가위! 바위! 보!" 구호와 함께 둘의 양손이 공개돼요.</li>
<li><b>하나 빼기</b>: 상대 두 손을 보고, 내 손 중 <b>남길 하나</b>를 골라요. 상대도 동시에 골라요.</li>
<li>"하나~ 빼기!" 하고 남은 손끼리 가위바위보. 비기면 그 판은 무효.</li></ol>
<div class="tipbox">💡 <b>팁</b><br>
· 양손을 서로 다르게 내면 뺄 때 선택지가 생겨요. 둘 다 바위면 안전하지만 뻔해요.<br>
· 상대가 ✌️✊를 냈다면 상대는 지는 손을 뺄 거예요. 상대 입장에서 생각해 보세요.<br>
· 🧠 컴퓨터(보통·어려움)는 내가 <b>어떤 손을 자주 남기는지 기억</b>해요. 늘 바위만 남기면 금방 읽히니 섞어 주세요!<br>
· 아래 기록에 상대 버릇이 남아요!</div>`;
window.GAMES.rps2 = {
  title:'가위바위보 하나 빼기', ref:'데블스 플랜 「하나 빼기」', emoji:'✌️', tags:['심리전','두뇌서바이벌','스피드'],
  pulse:v=>v.score[1]-v.score[0], pulseStep:1,
  tagline:'양손으로 가위바위보를 내고, 상대 손을 보고 하나를 빼는 눈치 싸움. 먼저 3승!',
  guide, init, apply, mask, ai, render, status, step, stepDelay,
  aiDelay:()=>1200+Math.random()*1800,
  reset(){ pk=[]; sig=''; },
  bar:(v,i)=>`<span class="score">${v.score[i]}</span><span class="tag">승</span>`,
  result:(v,ctx)=>`${v.score[ctx.me]} : ${v.score[1-ctx.me]}`,
};
})();
