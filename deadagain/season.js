'use strict';
(()=>{
const M=window.Matches, app=document.querySelector('#app'), dialog=document.querySelector('#modal');
const episodes=[
 [['choice','메인매치','둘 중 하나를 택하고 네 종목에 도전한다.']],
 [['heavy','감옥매치','합이 13에 닿는 순간 돌의 주인이 바뀐다.']],
 [['vault','생활동','금고의 단서를 맞춰 비밀을 연다.']],
 [['exchange','메인매치','시세 뒤에 숨은 거래 규칙을 읽는다.']],
 [['dial','감옥매치','봉인 원판의 빈자리와 표식을 추리한다.']],
 [['glyph','유배지','바닥에 흩어진 기호를 해독한다.'],['piece','유배지','조각을 맞춰 판을 복원한다.'],['difference','유배지','두 장면에서 달라진 흔적을 찾는다.']],
 [['gems','메인매치','보석을 바꾸고 비밀 파트너의 몫까지 계산한다.'],['code','유배지','단서로 비밀 코드를 복원한다.']],
 [['pig','감옥매치','동전을 기억하고 상대의 주장을 검증한다.'],['fence','유배지','숫자 단서를 따라 하나의 울타리를 잇는다.'],['trial','신의 시험','마방진을 완성해 본선 복귀에 도전한다.']],
 [['bingo','메인매치','일곱 번의 경매에서 세 줄의 기회를 산다.']],
 [['wall','감옥매치','말을 움직여 벽 뒤에 내 영역을 만든다.'],['symmetry','유배지','조각의 대칭을 복원한다.'],['trial','신의 시험','새 판에서 다시 복귀 조건에 도전한다.']]
];
const all=Object.fromEntries(episodes.flatMap((ep,i)=>ep.map(([id,type,desc])=>[id,{id,type,desc,ep:i+1}])));
const main=['choice','exchange','gems','bingo'],days={choice:1,heavy:1,vault:1,exchange:2,dial:2,glyph:2,piece:2,difference:2,gems:3,code:3,pig:3,fence:3,bingo:4,wall:4,symmetry:4};
const pacts=[
 {name:'기록관',hint:'첫 피스 3개로 시작합니다. 피스 2개로 결과를 한 번 재도전할 수 있습니다.',pieces:3},
 {name:'중개인',hint:'첫 피스 1개로 시작합니다. 75점 이상이면 피스를 하나 더 받습니다.',pieces:1},
 {name:'파수꾼',hint:'첫 피스 1개로 시작합니다. 감옥에서 한 번, 50점 미만이어도 본선에 남습니다.',pieces:1}
];
const saveKey='da.archive.1';let data={run:null,practice:null,best:{},sound:true},screen='home',kind='practice',filter='전체',audio=null,warning='';
try{const d=JSON.parse(localStorage.getItem(saveKey));if(d&&typeof d==='object'&&d.best) Object.assign(data,d)}catch{}
const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const persist=()=>{try{localStorage.setItem(saveKey,JSON.stringify(data))}catch{warning='이 브라우저에서 저장 공간을 사용할 수 없습니다.'}};
function beep(notes=[250],type='sine'){if(!data.sound)return;try{audio||=new AudioContext();if(audio.state==='suspended')audio.resume().catch(()=>{});notes.forEach((n,i)=>{const t=audio.currentTime+i*.105,o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(n,t);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.055,t+.013);g.gain.exponentialRampToValueAtTime(.0001,t+.36);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+.37)})}catch{}}
const scene=()=>kind==='season'?data.run?.match:data.practice;
const number=n=>String(n).padStart(2,'0');
const btn=(label,key,cls='minor')=>`<button class="${cls}" data-go="${key}">${label}</button>`;
function showModal(title,html){document.querySelector('#mTitle').textContent=title;document.querySelector('#mBody').innerHTML=html;if(!dialog.open)dialog.showModal()}
function top(){window.scrollTo(0,0)}
function randSeed(){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]||1}
function seeded(run,fn){const original=Math.random;try{Math.random=()=>{run.rng=(Math.imul(run.rng,1664525)+1013904223)>>>0;return run.rng/4294967296};return fn()}finally{Math.random=original}}
function initiate(id,seed=randSeed()){const m={id,seed,rng:seed,s:null};m.s=seeded(m,()=>M[id].start());return m}
function seasonMatch(r,seed){
 const m=initiate(r.next,seed);
 if(m.id==='gems'){m.openingPieces=r.pieces;m.s.pieces[0]=r.pieces}
 return m;
}
function purse(r,m){return m?.openingPieces!=null?r.pieces+m.s.pieces[0]-m.openingPieces:r.pieces}
function illustration(id){
 const brass='#c3a475',red='#cd5844',ink='#2b2929',paper='#dbcab0';
 const poly=(p,c)=>`<polygon points="${p}" fill="${c}" stroke="#161719" stroke-width="1.8"/>`;
 const cube=(x,y,r,c)=>`<g transform="translate(${x} ${y}) scale(${r})">${poly('-16,0 0,-8 16,0 0,9',paper)}${poly('-16,0 0,9 0,27 -16,17',c)}${poly('0,9 16,0 16,17 0,27',brass)}</g>`;
 let shape='';
 if(id==='choice')shape=cube(32,43,.85,ink)+cube(59,55,.85,red)+cube(61,29,.85,ink)+cube(35,17,.85,red);
 if(id==='exchange')shape=[[-18,14],[1,2],[20,-10]].map(([x,y])=>`<g transform="translate(${x},${y})">${poly('24,62 47,52 67,61 43,72',brass)}${poly('24,62 24,40 46,30 47,52',ink)}${poly('46,30 66,39 67,61 47,52',red)}${poly('24,40 44,50 66,39 46,30',paper)}</g>`).join('');
 if(id==='gems')shape=poly('12,40 28,20 64,18 83,37 49,76',red)+poly('12,40 31,39 49,76',ink)+poly('31,39 44,19 61,37',brass)+poly('61,37 83,37 49,76',paper)+`<path d="M12 40L83 37M31 39L49 76L61 37" fill="none" stroke="#562f2a"/>`;
 if(id==='bingo')shape=`<g transform="translate(50 43) rotate(-16) skewX(12)"><rect x="-31" y="-29" width="62" height="60" rx="3" fill="${brass}"/>${Array.from({length:9},(_,i)=>`<rect x="${-27+i%3*18}" y="${-25+Math.floor(i/3)*17}" width="16" height="15" fill="${[0,4,8].includes(i)?red:ink}"/>`).join('')}</g>`;
 return `<svg viewBox="0 0 96 86" aria-hidden="true">${shape}</svg>`;
}
function card(id,i){return `<button class="match-card" data-go="select-${id}"><div class="ill"><span class="serial">D / 0${i+1}</span>${illustration(id)}</div><div class="card-foot"><div><small>${i+1}일차 메인매치</small><br><b>${M[id].name}</b></div><span class="arrow">↗</span></div></button>`}
function home(){
 const r=data.run, p=data.practice, label=r&&!r.finished?'시즌 이어하기　→':r?'시즌 기록 보기　→':'시즌 입장　→';
 app.innerHTML=`<section class="hero"><div><div class="eyebrow">SEASON 03　/　EP. 01–10</div><h1>데블스 플랜<small> 3</small><br><em>데드 어게인</em></h1><p>생활동의 거래에서 유배지의 마지막 선택까지.<br>이번 판의 결과는 당신이 결정합니다.</p><div class="hero-actions"><a class="primary salon-entry" href="salon.html">친구와 시즌 입장　→</a>${btn(r?'내 시즌 기록':'혼자 플레이','season')}${btn('회차별 게임　↓','archive')}</div></div></section>
 <div class="archive-head"><div><div class="type">MAIN MATCHES</div><h2>메인매치</h2></div><span class="archive-mark">01 — 04</span></div><div class="tile-grid">${main.map(card).join('')}</div>
 <section class="index-section" id="archive"><div class="archive-head"><div><div class="type">EPISODE ARCHIVE</div><h2>회차별 게임</h2></div>${p&&!p.s.done?btn('연습 이어하기','resume-practice'):''}</div>
 <div class="filters">${['전체','메인매치','감옥매치','유배지','생활동','신의 시험'].map(x=>btn(x,'filter-'+x,x===filter?'on':'')).join('')}</div><div id="episodes"></div></section>`;
 renderEpisodes();
}
function renderEpisodes(){document.querySelector('#episodes').innerHTML=episodes.map((ep,i)=>{const list=ep.filter(([,t])=>filter==='전체'||t===filter);if(!list.length)return '';return `<div class="ep"><strong>${number(i+1)}</strong><div>${list.map(([id,type])=>`<button data-go="select-${id}"><small>${type}${data.best[id]!=null?' · 최고 '+data.best[id]+'점':''}</small>${M[id].name}　↗</button>`).join('')}</div></div>`}).join('')}
function matchSound(id,key,end){
 if(end){beep([294,370,440,587]);return}
 if(['pay','commit','test','sum'].includes(key)){beep([220,330]);return}
 if(['exchange','gems','bingo','pig'].includes(id))beep([580,812],'sine');
 else if(['wall','heavy','piece','symmetry'].includes(id))beep([128],'triangle');
 else beep([294],'sine');
}
function selection(id){const g=M[id];showModal(g.name,`<div class="type">${all[id].type}　/　자유 연습</div><p>${esc(g.rule)}</p><div class="stage-buttons">${btn(data.practice?.id===id&&!data.practice.s.done?'이 판 이어하기　→':'새 판 열기　→','practice-'+id,'primary')}${btn('같은 판 도전 링크','share-'+id)}</div>`)}
function lobby(){const r=data.run;
 if(!r){app.innerHTML=`<div class="lobby"><div class="eyebrow">ENTRY CONTRACT</div><h2>누구와 연맹을 맺을까요?</h2><p>네 번의 메인매치를 거치는 1인 생존전입니다. 65점 이상이면 생활동, 1~64점이면 감옥으로 갑니다. 0점이면 유배지로 향하는 문이 열립니다. 유배지에서도 본선으로 돌아올 수 있습니다.</p>${pacts.map((p,i)=>`<div class="record"><b>${p.name}</b><p>${p.hint}</p>${btn('계약하고 입장','pact-'+i)}</div>`).join('')}${btn('게임 목록','home')}</div>`;return}
 if(r.finished){app.innerHTML=`<section class="summary"><span class="eyebrow">SEASON RECORD　/　EP.10</span><h2>${r.finished}</h2><p>이번 시즌의 선택과 피스 기록입니다.</p>${historyTable(r)}<div class="stage-buttons">${btn('새 시즌 시작','newrun','primary')}${btn('회차별 게임','home')}</div></section>`;return}
 if(r.door){app.innerHTML=`<section class="lobby door-room"><div class="eyebrow">DAY ${number(r.day)}　/　선택의 방</div><h2>두 개의 문이 열렸습니다.</h2><p>붉은 문 뒤에는 유배지의 과제가 기다립니다. 푸른 문을 택하면 이번 도전의 기록을 확정합니다.</p><div class="door-options">${btn('붉은 문 · 유배지로','red-door','door red-door')}${btn('푸른 문 · 퇴장 선택','blue-door','door blue-door')}</div>${btn('로비로','home')}</section>`;return}
 if(r.match){kind='season';screen='play';arena();return}
 app.innerHTML=`<section class="lobby"><div class="eyebrow">DAY ${number(r.day)}　/　${r.zone}</div><h2>${esc(r.notice)}</h2><div class="scoreline"><span>연맹　<b>${pacts[r.pact].name}</b></span><span>피스　<b>${r.pieces}</b></span></div><p>${r.zone==='유배지'?'유배지 과제를 마치고 신의 시험에서 60점을 얻으면 본선으로 돌아옵니다.':r.zone==='감옥동'?'이번 매치에서 50점 이상을 얻어 본선에 남으세요.':'메인매치의 성적에 따라 다음 장소와 피스 보상이 달라집니다.'}</p><div class="record"><strong>${M[r.next].name}</strong><p>${esc(M[r.next].rule)}</p></div><div class="stage-buttons">${btn('매치 시작　→','enter','primary')}${btn('로비로','home')}</div>${historyTable(r)}</section>`;
}
function historyTable(r){if(!r.history.length)return '';return `<table class="docket"><thead><tr><th>일차</th><th>매치</th><th>성적</th></tr></thead><tbody>${r.history.map(h=>`<tr><td>D${h.day}</td><td>${M[h.id].name}</td><td>${h.score}점</td></tr>`).join('')}</tbody></table>`}
function route(r,id,score){
 const day=r.day;
 const go=(next,zone,notice,dayOverride)=>{r.next=next;r.day=dayOverride||days[next]||day;r.zone=zone;r.notice=notice};
 const advance=()=>{if(day===4){r.finished='10화 구간 생존';return}go(main[day],'생활동','다음 날의 메인매치가 열렸습니다.')};
 if(main.includes(id)){if(score===0){r.door=true;return}if(score<65)go(['heavy','dial','pig','wall'][day-1],'감옥동','감옥동에서 다시 승부를 겨루세요.');else if(day===1)go('vault','생활동','생활동에 숨겨진 금고를 발견했습니다.');else advance();return}
 if(['heavy','dial','pig','wall'].includes(id)){if(score>=50||r.shield){if(score<50)r.shield=false;advance()}else{r.door=true}return}
 if(id==='vault'){advance();return}
 if(id==='trial'){if(score>=60){if(day===4)r.finished='10화 구간 · 본선 복귀';else go('bingo','생활동','시험을 통과했습니다. 네 번째 메인매치로 복귀합니다.',4)}else r.finished='유배지에서 마친 도전';return}
 if(id==='code'&&score===0){r.finished='비밀 코드에서 마친 도전';return}
 const next=({glyph:'piece',piece:'difference',difference:'code',code:'fence',fence:'trial',symmetry:'trial'})[id];go(next,'유배지',next==='trial'?'본선 복귀를 걸고 신의 시험에 도전하세요.':'다음 유배지 과제가 열렸습니다.',next==='code'?3:day);
}
function arena(){const m=scene();if(!m){screen='home';home();return}const g=M[m.id],s=m.s,r=data.run,done=s.done;
 app.innerHTML=`<section class="arena"><div class="toolbar">${btn('‹　로비','home','')}<span class="muted">${kind==='season'?`시즌 · ${r.zone} · 피스 ${purse(r,m)}`:'자유 연습'}${m.target!=null?' · 도전 목표 '+m.target+'점':''}　·　${warning||'자동 저장'}</span></div><div class="arena-top"><div><div class="eyebrow">${all[m.id].type}　/　${m.id==='trial'?'EP. 08 · 10':'EP. '+number(all[m.id].ep)}</div><h1>${esc(g.name)}</h1></div>${btn('게임 규칙','rules')}</div>
 <div class="boardbody">${g.view(s)}</div>${s.log?`<div class="record" role="status">${esc(s.log)}</div>`:''}
 ${done?`<section class="summary"><div class="type">MATCH RESULT</div><h2>${Math.round(s.score)}점</h2><p>${kind==='season'?'성적을 확정하면 다음 장소로 이동합니다.':m.target!=null?'도전 목표 '+m.target+'점 · '+(s.score>m.target?'기록 경신':s.score===m.target?'동점':'다시 도전해 보세요'):'이 판의 성적을 기록했습니다.'}</p><div class="stage-buttons">${kind==='season'?btn('성적 확정　→','settle','primary')+(purse(r,m)>=2&&!m.retried?btn('피스 2개로 재도전','retry'):''):btn('새 판 도전','fresh','primary')+btn('같은 판 다시','same')+btn('내 기록에 도전 링크','share-'+m.id)+btn('회차별 게임','archive')}</div></section>`:''}</section>`;}
function startPractice(id,seed,target=null){kind='practice';data.practice=initiate(id,seed);data.practice.target=target;persist();screen='play';arena();top()}
function render(){if(screen==='home')home();else if(screen==='season')lobby();else arena()}
function safelyStoreBest(m){if(m.s.done){data.best[m.id]=Math.max(data.best[m.id]??0,Math.round(m.s.score))}}
function share(id){const seed=scene()?.id===id?scene().seed:randSeed();const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('match',id);url.searchParams.set('seed',seed);const played=scene();if(played?.id===id&&played.s.done)url.searchParams.set('target',Math.round(played.s.score));showModal('같은 판 도전',`<p>링크를 열면 같은 시작 배치로 플레이합니다. 친구와 서로 다른 수를 두고 비교해 보세요.</p><input style="width:100%;padding:8px" id="seedlink" aria-label="도전 링크" readonly value="${esc(url.href)}"><div class="stage-buttons">${btn('링크 복사','copy')}${btn('이 배치로 시작','seed-'+id+'-'+seed,'primary')}</div>`)}
function navigate(key){
 if(dialog.open&&!['copy'].includes(key))dialog.close();
 if(key==='home'||key==='archive'){screen='home';home();if(key==='archive')document.querySelector('#archive').scrollIntoView();else top();return}
 if(key==='credits'){showModal('제작 노트',`<p>1~10화에서 등장한 종목을 1인 브라우저 게임으로 다시 설계했습니다. 금속 조형물, 경기 도구, 퍼즐 배치와 효과음을 새로 제작했습니다.</p><p>연맹 계약, 피스 보상, 100점 성적표와 이동 기준은 이 판의 전용 규칙입니다. 신의 시험은 10화 시점의 단서에서 착안한 창작 퍼즐입니다.</p><p><a href="https://about.netflix.com/ko/news/the-devils-plan-dead-again-teaser" target="_blank" rel="noopener">작품 안내 ↗</a>　<a href="https://namu.moe/w/데블스%20플랜:%20데드%20어게인" target="_blank" rel="noopener">회차·게임 자료 ↗</a></p>`);return}
 if(key.startsWith('filter-')){filter=key.slice(7);document.querySelectorAll('.filters button').forEach(b=>b.classList.toggle('on',b.dataset.go===key));renderEpisodes();return}
 if(key.startsWith('select-')){selection(key.slice(7));return}
 if(key.startsWith('share-')){share(key.slice(6));return}
 if(key==='copy'){const input=document.querySelector('#seedlink');input.select();navigator.clipboard?.writeText(input.value).then(()=>{document.querySelector('[data-go=copy]').textContent='복사됨'}).catch(()=>{});return}
 if(key.startsWith('seed-')){const [,id,seed]=key.split('-');startPractice(id,Number(seed));return}
 if(key.startsWith('practice-')){const id=key.slice(9);if(data.practice?.id!==id||data.practice.s.done){startPractice(id);return}key='resume-practice'}
 if(key==='resume-practice'){kind='practice';screen='play';arena();top();return}
 if(key==='newrun'){data.run=null;persist();key='season'}
 if(key==='season'){screen='season';kind='season';lobby();top();return}
 if(key.startsWith('pact-')){const pact=Number(key.slice(5));data.run={pact,pieces:pacts[pact].pieces,shield:pact===2,day:1,next:'choice',zone:'생활동',notice:'첫 번째 선택이 시작됩니다.',history:[],match:null};persist();lobby();top();return}
 if(key==='blue-door'){showModal('시즌에서 퇴장할까요?',`<p>지금까지의 성적을 확정합니다. 붉은 문을 통해 유배지에 도전할 수도 있습니다.</p>${btn('퇴장 확정','withdraw')}</div>`);return}
 if(key==='withdraw'&&data.run?.door){data.run.finished='푸른 문으로 퇴장';data.run.door=false;persist();lobby();top();return}
 if(key==='red-door'&&data.run?.door){const r=data.run;r.door=false;r.next=['glyph','glyph','code','symmetry'][r.day-1];r.zone='유배지';r.day=Math.max(2,r.day);r.notice='유배지의 기록실에 들어왔습니다.';persist();lobby();top();return}
 if(key==='enter'){const r=data.run;r.match=seasonMatch(r);kind='season';screen='play';persist();arena();top();return}
 const m=scene();if(!m)return;
 if(key==='rules'){showModal(M[m.id].name,`<p>${esc(M[m.id].rule)}</p>`);return}
 if(key==='fresh'||key==='same'){startPractice(m.id,key==='same'?m.seed:undefined,key==='same'?m.target:null);return}
 if(key==='retry'&&kind==='season'&&m.s.done&&purse(data.run,m)>=2&&!m.retried){data.run.pieces=Math.max(0,purse(data.run,m)-2);data.run.match=seasonMatch(data.run,m.seed);data.run.match.retried=true;persist();arena();top();return}
 if(key==='settle'&&kind==='season'&&m.s.done){const r=data.run,score=Math.round(m.s.score);r.pieces=purse(r,m);r.history.push({id:m.id,day:r.day,score});r.pieces+=(score>=65?1:0)+(r.pact===1&&score>=75?1:0);route(r,m.id,score);r.match=null;persist();screen='season';lobby();top()}
}
document.addEventListener('click',e=>{let b=e.target.closest('[data-act],[data-go]');if(!b||b.disabled)return;
 if(b.dataset.go){beep([294]);navigate(b.dataset.go);return}
 const m=scene();if(!m||m.s.done||screen!=='play')return;
 const key=b.dataset.act;seeded(m,()=>M[m.id].act(m.s,key));safelyStoreBest(m);persist();matchSound(m.id,key,m.s.done);arena();
 if(e.detail===0&&!m.s.done){const controls=[...app.querySelectorAll('button[data-act]:enabled')];(controls.find(el=>el.dataset.act===key)||controls[0])?.focus({preventScroll:true})}
 if(m.s.done)app.querySelector('.summary')?.scrollIntoView({block:'nearest'});
});
const audioBtn=document.querySelector('#audio');function audioLabel(){audioBtn.textContent=data.sound?'♫　소리 켜짐':'♫　소리 꺼짐';audioBtn.setAttribute('aria-pressed',data.sound)}
audioBtn.onclick=()=>{data.sound=!data.sound;audioLabel();beep();persist()};audioLabel();document.querySelector('#closeModal').onclick=()=>dialog.close();
const link=new URLSearchParams(location.search),id=link.get('match'),seed=link.get('seed');
if(Object.hasOwn(all,id)&&seed!==null&&/^\d{1,10}$/.test(seed)&&Number(seed)<=4294967295){if(data.practice?.seed===Number(seed)&&data.practice?.id===id){kind='practice';screen='play';arena()}else {const t=link.get('target');startPractice(id,Number(seed),t!==null&&/^([0-9]{1,2}|100)$/.test(t)?Number(t):null)}history.replaceState(null,'',location.pathname)}else render();
})();
