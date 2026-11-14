/* 🤖 AI 대화 (시험, 2026-11-10) — 이 Mac에서 `node local/ai-bridge.js`를 켜 두면 그 Mac의 Claude Code 로그인으로 AI 동물이 생각하고 말한다.
   혼자 모드, 또는 친구들과의 방에선 방장 쪽에서만 돌고(게임 진행을 방장이 하므로) 결과가 손님에게 그대로 전달됨. 손님은 설치할 것 없음.
   다리가 꺼져 있으면 아무 일도 안 함(각 게임의 단순 규칙으로 대신 진행).
   - AIB.start(): AI 게임이 혼자/방장으로 열릴 때 부름 — 그때부터 다리를 찾음(손님·다른 게임에선 안 찾음)
   - AIB.on(): 지금 AI를 쓸 수 있나 (다리 켜짐 + 혼자 모드 또는 방장 + 사용자가 끄지 않음)
   - AIB.say(system, prompt): 대사 한 줄 (실패·시간 초과면 null)
   - AIB.json(system, prompt, schema): 정해진 형식으로 해석 (실패면 null)
   - AIB.hold(): 응답을 기다리는 중이면 true — core가 그동안 다음 진행을 미룸(한 사람씩 연출 유지)
   - AIB.usage(): 이번 판에 쓴 호출·토큰·API 기준 환산 비용 + 다리가 마지막으로 받은 구독 한도 사용률(5시간·주간) — 방장 화면용 */
(function(){
'use strict';
const BASE='http://127.0.0.1:8790', WAIT=30000;
let up=false, pend=0, lim=null, limAt=0;
const sess={calls:0,fails:0,input:0,output:0,costUSD:0};
function off(){ try{ return localStorage.getItem('ms-ai')==='off'; }catch(_){ return false; } }
/* 다리 찾기는 AI 게임을 혼자/방장으로 열 때만(AIB.start) — 사이트를 열자마자 찾으면 크롬이 모든 방문자(손님 포함)에게
   "이 기기의 다른 앱·서비스 접근 허용?"을 물음 (2026-11-10 사용자 제보). 첫 확인은 권한 창에 답할 시간까지 넉넉히 기다리고, 그동안 진행을 멈춤 */
let started=false;
/* 요청이 진행 중이면 확인을 건너뜀 — 투표 때 7마리가 동시에 부르면 브라우저 동시 연결 한도(6)에 막혀 확인이 시간 초과 →
   AI가 꺼진 걸로 잘못 판단해 20초 동안 전부 단순 규칙으로 진행되던 문제 (2026-11-10 관전 검증에서 발견) */
async function check(first){ if(!first&&pend>0) return up; if(first) pend++; try{ const c=new AbortController(); const t=setTimeout(()=>c.abort(),first?20000:1500);
  const r=await fetch(BASE+'/health',{signal:c.signal}); clearTimeout(t); up=r.ok; }catch(_){ up=false; } finally{ if(first) pend--; } return up; }
function start(){ if(started) return; started=true; check(true); setInterval(()=>check(false),20000); }
/* bg: 기다리지 않는 요청 — 자유 시간에 여러 방이 동시에 진행되게(core의 진행을 멈추지 않음) */
async function ask(body,bg){ if(!bg) pend++; const c=new AbortController(); const t=setTimeout(()=>c.abort(),WAIT);
  try{ for(;;){ const r=await fetch(BASE+'/ask',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:c.signal});
      if(r.status===429){ await new Promise(z=>setTimeout(z,700)); continue; }   // 다리가 바쁘면 잠깐 기다렸다 다시
      if(!r.ok){ sess.fails++; return null; } up=true; const j=await r.json(); const u=j.usage||{}; sess.calls++; sess.input+=u.input||0; sess.output+=u.output||0; sess.costUSD+=u.costUSD||0; return j; } }
  catch(_){ sess.fails++; return null; }
  finally{ clearTimeout(t); if(!bg) pend--; } }
window.AIB={
  on:()=>up&&!off()&&typeof mode!=='undefined'&&(mode==='solo'||mode==='host'),
  hold:()=>pend>0,
  check, start, started:()=>started,
  usage(){ if(up&&Date.now()-limAt>8000){ limAt=Date.now(); fetch(BASE+'/stats').then(r=>r.json()).then(j=>{ lim=j; }).catch(()=>{}); } return {sess:Object.assign({},sess), bridge:lim}; },
  resetUsage(){ sess.calls=sess.fails=sess.input=sess.output=sess.costUSD=0; },
  setOff:v=>{ try{ localStorage.setItem('ms-ai',v?'off':'on'); }catch(_){} },
  async say(system,prompt){ const r=await ask({system,prompt}); const t=r&&String(r.text||'').trim(); return t||null; },
  async json(system,prompt,schema,o){ const r=await ask({system,prompt,schema,model:o&&o.model},o&&o.bg); return r&&r.json||null; },   /* o.model: 'haiku' 등 가벼운 일용 */
};
})();
