(function(){
'use strict';
/* 초성 퀴즈 대결: 카테고리 + 초성이 나오면 둘이 동시에 답을 입력, 먼저 맞히면 1점. 10문제.
   15초에 힌트(글자 하나 공개), 30초에 정답 공개. 그 카테고리 단어이면서 초성이 맞으면 다른 단어여도 정답. */
const WORDS={
  '음식':['김치','비빔밥','불고기','떡볶이','라면','짜장면','짬뽕','김밥','순대','냉면','삼겹살','갈비','된장찌개','부대찌개','칼국수','만두','피자','치킨','햄버거','파스타','초밥','우동','카레','잡채','호떡','붕어빵','떡국','감자탕','족발','보쌈','제육볶음','김치찌개','순두부','계란말이','오므라이스'],
  '동물':['고양이','강아지','호랑이','사자','코끼리','기린','토끼','다람쥐','원숭이','펭귄','돌고래','고래','상어','거북이','악어','하마','코뿔소','얼룩말','캥거루','판다','여우','늑대','곰','부엉이','독수리','참새','비둘기','수달','너구리','고슴도치','햄스터','오리','닭','돼지','염소'],
  '나라':['한국','일본','중국','미국','영국','프랑스','독일','이탈리아','스페인','캐나다','호주','브라질','멕시코','인도','태국','베트남','러시아','이집트','튀르키예','그리스','스위스','네덜란드','스웨덴','노르웨이','핀란드','몽골','필리핀','인도네시아','아르헨티나','칠레','페루','케냐','싱가포르','덴마크','포르투갈'],
  '과일·채소':['사과','바나나','딸기','포도','수박','참외','복숭아','자두','귤','오렌지','레몬','키위','망고','파인애플','체리','블루베리','감','배','석류','토마토','오이','당근','감자','고구마','양파','마늘','배추','상추','시금치','브로콜리','호박','가지','버섯','옥수수','고추'],
  '직업':['의사','간호사','선생님','경찰관','소방관','요리사','가수','배우','변호사','판사','기자','작가','화가','군인','농부','어부','목수','미용사','약사','은행원','택시기사','조종사','승무원','디자이너','개발자','과학자','건축가','사진작가','운동선수','유튜버','아나운서','통역사','수의사','치과의사','바리스타'],
  '물건':['연필','지우개','가위','공책','시계','안경','우산','가방','지갑','열쇠','휴대폰','컴퓨터','냉장고','세탁기','텔레비전','선풍기','에어컨','침대','의자','책상','거울','칫솔','수건','모자','장갑','양말','신발','이불','베개','숟가락','젓가락','냄비','컵','접시','달력'],
};
const ROUNDS=10, TIME=30, HINT=15;
const CHO='ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const cho=s=>[...s].map(c=>{ const k=c.charCodeAt(0)-0xAC00; return k>=0&&k<11172 ? CHO[Math.floor(k/588)] : c; }).join('');
const norm=s=>String(s||'').replace(/\s+/g,'').slice(0,20);
function pickQs(){
  const all=[]; for(const [cat,ws] of Object.entries(WORDS)) for(const w of ws) all.push({cat,w});
  const out=[], used=new Set();
  for(const q of U.shuffle(all)){ const key=q.cat+cho(q.w); if(used.has(key)) continue; used.add(key); out.push(q); if(out.length>=ROUNDS) break; }
  return out;
}
/* 👥 2~8명 (2026-11-12) — 자리 = 사람 수, 다 같이 동시에 */
function init(starter,o){ const k=Math.max(2,Math.min(8,(o&&o.humans)||2)); return {hs:[...Array(k).keys()], qs:pickQs(), r:0, sec:0, phase:'q', score:Array(k).fill(0), tries:[], solved:null, answers:[], turn:null, starter, winner:null}; }
const okAnswer=(q,text)=> WORDS[q.cat].includes(text) && cho(text)===cho(q.w);
function apply(s,p,a){
  if(s.winner!=null) return '게임이 끝났어요';
  if(!a||a.k!=='ans') return '알 수 없는 동작';
  if(s.phase!=='q') return '다음 문제를 기다려 주세요';
  const t=norm(a.text); if(!t) return '답을 입력하세요';
  const q=s.qs[s.r];
  if(okAnswer(q,t)){ s.score[p]++; s.solved={p,text:t}; s.phase='reveal'; s.sec=0; s.answers.push({r:s.r, cat:q.cat, w:q.w, by:p, text:t}); }
  else { s.tries.push({p,text:t, why: cho(t)!==cho(q.w) ? '초성이 달라요' : '그 단어는 목록에 없어요'}); if(s.tries.length>12) s.tries.shift(); }
  return null;
}
// 1초마다 시계 진행 (방장·혼자 쪽)
const stepDelay=s=> s.winner!=null ? null : s.phase==='q' ? 1000 : s.phase==='reveal' ? 3000 : null;
function step(s){
  if(s.phase==='q'){ s.sec++; if(s.sec>=TIME){ const q=s.qs[s.r]; s.solved={p:-1}; s.phase='reveal'; s.answers.push({r:s.r, cat:q.cat, w:q.w, by:-1}); } return; }
  if(s.phase==='reveal'){
    s.r++; s.tries=[]; s.solved=null; s.sec=0;
    if(s.r>=ROUNDS){ if(s.score.length>2){ const mx=Math.max(...s.score); s.winners=s.score.map((x,q)=>x===mx?q:-1).filter(x=>x>=0); s.winner=s.winners.length===1?s.winners[0]:'draw'; } else { const [x,y]=s.score; s.winner=x>y?0:y>x?1:'draw'; } s.phase='over'; return; }
    s.phase='q';
  }
}
function mask(s,p){
  const v=U.clone(s);
  v.qs=s.qs.map((q,i)=> i<s.r || (i===s.r && s.phase!=='q') ? q : i===s.r ? {cat:q.cat, cho:cho(q.w), len:q.w.length, hint: s.sec>=HINT ? q.w[0] : null} : null);
  return v;
}
/* 컴퓨터: 시간이 지날수록 떠올릴 확률↑, 가끔 초성만 맞고 틀린 답도 냄 */
function ai(v,lvl=1){
  if(v.phase!=='q') return null;
  const q=v.qs[v.r]; if(!q||!q.cho) return null;
  const pool=WORDS[q.cat].filter(w=>cho(w)===q.cho);
  const pKnow=[.05,.1,.18][lvl] + v.sec*[.004,.008,.012][lvl] + (q.hint?[.05,.1,.15][lvl]:0);
  if(Math.random()<pKnow) return {k:'ans', text:U.pick(pool)};
  if(Math.random()<.18){ const wrong=WORDS[q.cat].filter(w=>cho(w)[0]===q.cho[0] && cho(w)!==q.cho); if(wrong.length) return {k:'ans', text:U.pick(wrong)}; }
  return null;
}

/* 화면 */
let lastR=-1;
function render(el,v,ctx){
  const me=ctx.me, o=me===0?1:0;
  const who=i=> i===me&&ctx.mode!=='local' ? '나' : U.esc(ctx.name(i));
  const q=v.qs[Math.min(v.r,ROUNDS-1)];
  let h=`<div class="info">${Math.min(v.r+1,ROUNDS)} / ${ROUNDS}문제 · ${v.score.length>2?v.score.map((x,q)=>`${who(q)} <b>${x}</b>`).join(' · '):`<b>${v.score[me]}</b> : <b>${v.score[o]}</b>`}</div>`;
  if(v.phase==='q' && q){
    const left=TIME-v.sec;
    h+=`<div class="cs-card"><div class="cs-cat">${U.esc(q.cat)}</div><div class="cs-cho">${[...q.cho].map((c,i)=>`<span>${i===0&&q.hint?q.hint:c}</span>`).join('')}</div>
      <div class="cs-timer"><i style="width:${left/TIME*100}%" class="${left<=10?'low':''}"></i></div><small>${left}초${q.hint?' · 힌트: 첫 글자 공개!':v.sec>=HINT-5?' · 곧 힌트':''}</small></div>`;
    if(ctx.can) h+=`<form class="row cs-form"><input id="csIn" maxlength="20" placeholder="정답 입력 후 Enter" autocomplete="off"><button>제출</button></form>`;
  } else if(q){
    const s=v.solved;
    h+=`<div class="cs-card done"><div class="cs-cat">${U.esc(q.cat)}</div><div class="cs-word">${U.esc(q.w)}</div>
      <small>${s&&s.p>=0 ? `🎉 ${who(s.p)} 정답! "${U.esc(s.text)}"` : '⏰ 시간 끝! 아무도 못 맞혔어요'}</small></div>`;
  }
  if(v.tries.length) h+=`<div class="cs-tries">${v.tries.slice(-6).map(t=>`<span class="p${t.p}">${who(t.p)}: ${U.esc(t.text)} ✖ <small>${t.why}</small></span>`).join('')}</div>`;
  if(v.answers.length) h+=`<div class="cs-hist">${v.answers.map(a=>`<span class="${a.by===me?'w':a.by<0?'n':'l'}">${a.r+1}. ${U.esc(a.w)}</span>`).join('')}</div>`;
  el.innerHTML=h;
  const f=el.querySelector('.cs-form'), inp=el.querySelector('#csIn');
  if(f){ f.onsubmit=e=>{ e.preventDefault(); const t=inp.value; inp.value=''; ctx.act({k:'ans',text:t}); }; if(lastR!==v.r || document.activeElement===document.body){ inp.focus(); } }
  lastR=v.r;
}
// 시계가 1초마다 바뀌어 다시 그려질 때 입력 중인 글자가 지워지지 않게
const _keep={val:'',on:false};
document.addEventListener('input',e=>{ if(e.target&&e.target.id==='csIn'){ _keep.val=e.target.value; } });
const _origRender=render;
function renderKeep(el,v,ctx){ const had=document.activeElement&&document.activeElement.id==='csIn'; const val=had?document.activeElement.value:_keep.val; _origRender(el,v,ctx); const inp=el.querySelector('#csIn'); if(inp){ if(lastR===v.r) inp.value=val; if(had) inp.focus(); _keep.val=inp.value; } }
function status(v,ctx){ return v.phase==='q' ? '초성에 맞는 단어를 먼저 입력하세요!' : '다음 문제 준비 중…'; }
const guide=`
<p><b>카테고리</b>와 <b>초성</b>이 나오면, 그에 맞는 단어를 <b>먼저 입력한 사람</b>이 1점! 10문제 대결이에요(2~8명이 다 같이).</p>
<ul><li>예) 음식 · <b>ㄱㅊ</b> → <b>김치</b></li>
<li>초성이 맞고 그 카테고리 단어면, 문제가 생각한 단어가 아니어도 정답이에요.</li>
<li>틀려도 벌점은 없어요. 대신 틀린 답은 상대에게도 보여요 😆</li>
<li>⏳ 15초가 지나면 <b>첫 글자 힌트</b>, 30초가 지나면 정답 공개.</li>
<li>카테고리: 음식 · 동물 · 나라 · 과일·채소 · 직업 · 물건</li></ul>
<div class="tipbox">💡 <b>팁</b>: 띄어쓰기는 무시돼요. 생각나는 대로 빨리 치세요! 상대가 틀린 답도 힌트가 될 수 있어요.</div>`;
window.GAMES.chosung = {
  title:'초성 퀴즈 대결', emoji:'🔤', tags:['스피드','단어','퀴즈'],
  maxH:8, pulse:v=>v.score.length===2?v.score[1]-v.score[0]:0, pulseStep:2,
  tagline:'음식 ㄱㅊ → 김치! 카테고리와 초성을 보고 먼저 맞히는 한글 스피드 퀴즈.',
  guide, init, apply, mask, ai, render:renderKeep, status, step, stepDelay,
  aiDelay:()=>2500+Math.random()*2500,
  reset(){ lastR=-1; _keep.val=''; },
  bar:(v,i)=>`<span class="score">${v.score[i]}</span><span class="tag">점</span>`,
  result:(v,ctx)=>v.score.length>2?`${v.score[ctx.me]}점 · ${v.score.filter(x=>x>v.score[ctx.me]).length+1}위`:`${v.score[ctx.me]} : ${v.score[1-ctx.me]}`,
};
})();
