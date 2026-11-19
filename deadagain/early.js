/* Original browser boards for the first two days; see each adapter's rule. */
(() => {
  'use strict';
  const M = window.Matches ||= {};
  const rnd = n => Math.floor(Math.random()*n);
  const shuffle = items => {
    const a = items.slice();
    for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]];}
    return a;
  };
  const names = ['나','윤슬','해담','도하'];
  const colors = ['#e99282','#a5cd93','#8cbadb'];
  const pads = ['홍옥','비취','남옥'];
  const tokens = ['◆','▲','●'];
  const button = (key,txt,disabled=false) => `<button type="button" class="choice" data-act="${key}"${disabled?' disabled':''}>${txt}</button>`;
  const actions = items => '<div class="actions">'+items.join('')+'</div>';
  const stat = (key,value) => `<span class="stat">${key} <b>${value}</b></span>`;
  const label = (a,b) => `<div style="display:flex;gap:.8rem;justify-content:space-between;align-items:center;flex-wrap:wrap"><strong>${a}</strong><small class="caption">${b}</small></div>`;
  const container = (a,b,inside) => `<section class="board">${label(a,b)}${inside}</section>`;
  const blank = () => ({round:0,done:false,score:0,log:''});
  const ranking = (s,values,smaller=false) => {
    s.place=1+values.slice(1).filter(v=>smaller?v<values[0]:v>values[0]).length;
    s.opponents=values.slice(1).map((value,i)=>({name:names[i+1],value}));
    s.score=Math.round(100*(values.length-s.place)/(values.length-1));
    s.done=true;
  };
  const tally = (v,units='점') => '<p>'+v.map((x,i)=>stat(names[i],x+units)).join(' · ')+'</p>';
  const digits = (key,prefix,max) => {
    if(!key.startsWith(prefix)) return -1;
    const str=key.slice(prefix.length);
    if(!/^\d+$/.test(str)) return -1;
    const n=Number(str);return n<=max?n:-1;
  };
  const tag = (txt,color) => `<span style="white-space:nowrap;font-weight:700;color:${color}">${txt}</span>`;
  const svg = (w,h,body,alt) => `<svg role="img" aria-label="${alt}" viewBox="0 0 ${w} ${h}" style="display:block;width:100%;max-width:420px;max-height:210px;margin:10px auto">${body}</svg>`;

  /* 양자택일: four consequential choices across four distinct puzzles. CPU guesses lock before the player sees the problem. */
  const mission = ['큐브 세기','네모 세기','잔디 깔기','기억 포커'];
  const missing = (s,x,y) => s.holes.includes(x+y*4);
  function turfBest(s) {
    const free = Array.from({length:12},(_,i)=>i).filter(i=>!s.holes.includes(i)&&!s.tiles.flat().includes(i));
    const search = cells => {
      if(!cells.length) return 0;
      const [a,...rest]=cells;
      let n=search(rest);
      for(const b of rest) if((b===a+1&&Math.floor(a/4)===Math.floor(b/4))||b===a+4) n=Math.max(n,1+search(rest.filter(c=>c!==b)));
      return n;
    };
    return search(free);
  }
  function freshProblem(s) {
    s.phase='contract';s.selected=-1;
    s.heights=Array.from({length:6},()=>1+rnd(3));
    s.cols=2+rnd(3);s.rows=2+rnd(2);
    s.holes=shuffle([...Array(12).keys()]).slice(0,2);s.tiles=[];s.ideal=turfBest(s);
    s.choiceEdition=2;s.social='';s.cols=3+rnd(2);s.rows=3;
    s.cells=Array.from({length:s.cols*s.rows},()=>1+rnd(4));
    s.target=4+rnd(5);s.rectCount=0;s.oneRow=0;
    for(let y=0;y<s.rows;y++)for(let x=0;x<s.cols;x++)
      for(let endY=y;endY<s.rows;endY++)for(let endX=x;endX<s.cols;endX++){
        let sum=0;
        for(let row=y;row<=endY;row++)for(let col=x;col<=endX;col++)sum+=s.cells[row*s.cols+col];
        if(sum===s.target){s.rectCount++;if(endY===y)s.oneRow++;}
      }
    s.answer=[s.heights.reduce((a,b)=>a+b,0),s.rectCount,0,0][s.round];
    if(s.round===3){
      const deck=shuffle(Array.from({length:52},(_,i)=>i));
      s.cards=deck.slice(0,16);s.shared=deck.slice(16,19);s.pick=[];
      s.recalled=[8,9,10].map(count=>shuffle([...s.cards.keys()]).slice(0,count));
    }
    s.options=shuffle([...new Set([s.answer,Math.max(0,s.answer-1),s.answer+1,s.answer+2])]);
    s.commit=names.slice(1).map((_,i)=>({bold:Math.random()<[.48,.71,.62][i],right:Math.random()<[.65,.68,.72][i]}));
  }
  function cubes(s){
    const pts=(a)=>a.map(p=>p.join(',')).join(' ');
    const face=(p,c)=>`<polygon points="${pts(p)}" fill="${c}" stroke="#202b39" stroke-width="1.1"/>`;
    let body='';
    for(let sum=0;sum<4;sum++)for(let x=0;x<3;x++){
      const y=sum-x;if(y<0||y>1)continue;
      for(let z=0;z<s.heights[x+3*y];z++){
        const u=132+(x-y)*26,v=87+(x+y)*13-z*19;
        body+=face([[u,v],[u+26,v+13],[u,v+26],[u-26,v+13]],'#f3d6a0');
        body+=face([[u-26,v+13],[u,v+26],[u,v+45],[u-26,v+32]],'#b59172');
        body+=face([[u,v+26],[u+26,v+13],[u+26,v+32],[u,v+45]],'#746979');
      }
    }
    return svg(300,184,body,'여섯 기둥이 빽빽하게 놓인 큐브 모형')+'<small class="caption">윗면의 기둥 높이 · 뒤쪽 줄 '+s.heights.slice(0,3).join(' / ')+' · 앞쪽 줄 '+s.heights.slice(3).join(' / ')+'</small>';
  }
  function rects(s){
    let b='';
    for(let x=0;x<=s.cols;x++) b+=`<path d="M${40+x*52} 15 v${s.rows*40}" stroke="#d8b98c" stroke-width="2"/>`;
    for(let y=0;y<=s.rows;y++) b+=`<path d="M40 ${15+y*40} h${s.cols*52}" stroke="#d8b98c" stroke-width="2"/>`;
    s.cells.forEach((v,i)=>{b+=`<text text-anchor="middle" x="${66+i%s.cols*52}" y="${42+Math.floor(i/s.cols)*40}" fill="#eedbb7" font-size="19">${v}</text>`;});
    return svg(80+s.cols*52,30+s.rows*40,b,s.cols+'열 '+s.rows+'행 격자');
  }
  const turfBoard=s=>'<div style="display:grid;grid-template-columns:repeat(4,minmax(35px,54px));gap:5px;justify-content:center;margin:12px">'+Array.from({length:12},(_,i)=>{
    const used=s.tiles.findIndex(pair=>pair.includes(i)),gone=missing(s,i%4,Math.floor(i/4));
    return `<button data-act="cell${i}" type="button" aria-label="${Math.floor(i/4)+1}행 ${i%4+1}열" style="aspect-ratio:1;padding:0;background:${gone?'#33343a':used>=0?'#466c56':i===s.selected?'#876d49':'#293c3a'};color:#eee2ca"${gone||used>=0?' disabled':''}>${gone?'×':used>=0?'▧':s.selected===i?'◆':'·'}</button>`;
  }).join('')+'</div>';
  const options=[
    ['성과금','보험금','큐브 결과로 상위권(공동 포함)이면 성과금 +2, 하위권이면 보험금 +3을 얻습니다.'],
    ['팀으로 풀기','개인으로 풀기','팀은 한 줄짜리 정답 수를 공유하고 성공 +4점. 개인은 도움 없이 성공 +7점, 실패 −3점입니다.'],
    ['공공의 이익','개인의 이익','공공 표가 셋 이상이면 모두 +5점. 개인을 고르면 내게 +3점이 더해집니다. 이후 잔디 한 장당 +1점입니다.'],
    ['지목 방식','계단 방식','계단 표가 셋 이상이면 점수가 가장 가까운 상대와 대결합니다. 그 외에는 대결 상대를 직접 지목합니다.']
  ];
  const handKinds=['하이카드','원페어','투페어','트리플','스트레이트','플러시','풀하우스','포카드','스트레이트 플러시'];
  const suit=['♠','♥','♦','♣'];
  const ranks=['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  const face=c=>suit[Math.floor(c/13)]+ranks[c%13];
  function hand(cards){
    const sorted=cards.map(c=>c%13+2).sort((a,b)=>b-a),freq=new Map();
    for(const n of sorted)freq.set(n,(freq.get(n)||0)+1);
    const groups=[...freq].sort((a,b)=>b[1]-a[1]||b[0]-a[0]);
    const flush=cards.every(c=>Math.floor(c/13)===Math.floor(cards[0]/13));
    const straight=groups.length===5?(sorted[0]-sorted[4]===4?sorted[0]:sorted.join()==='14,5,4,3,2'?5:0):0;
    const count=groups[0][1],sub=groups[1]?.[1],kind=straight&&flush?8:count===4?7:count===3&&sub===2?6:flush?5:straight?4:count===3?3:count===2&&sub===2?2:count===2?1:0;
    const parts=(straight&&[4,8].includes(kind))?[straight]:groups.map(g=>g[0]);
    let value=kind;for(let i=0;i<5;i++)value=value*15+(parts[i]||0);
    return {kind,value};
  }
  function duel(s){
    const mem=s.recalled[s.rival-1];let best=null, cpu=[];
    for(let i=0;i<mem.length;i++)for(let j=i+1;j<mem.length;j++){
      const slots=[mem[i],mem[j]], rank=hand(s.shared.concat(slots.map(k=>s.cards[k])));
      if(!best||rank.value>best.value){best=rank;cpu=slots;}
    }
    const own=hand(s.shared.concat(s.pick.map(k=>s.cards[k])));
    const diff=Math.sign(own.value-best.value);
    if(diff)s.points[diff>0?0:s.rival]+=5;
    const rec=pair=>pair.map(k=>(k+1)+'번 '+face(s.cards[k])).join(' · ');
    s.log='공유 '+s.shared.map(face).join(' ')+' / 나 '+rec(s.pick)+' → '+handKinds[own.kind]+' / '+names[s.rival]+' '+rec(cpu)+' → '+handKinds[best.kind]+' / '+(diff>0?'승리 +5':diff<0?'상대 승리 +5':'동률');
    s.phase='result';ranking(s,s.points);
  }
  function pokerGrid(s,memory){
    const grid=s.cards.map((c,i)=>{
      const red=(Math.floor(c/13)===1||Math.floor(c/13)===2),on=s.pick.includes(i);
      return memory?`<div style="padding:5px;text-align:center;background:#e6ddcb;color:${red?'#9e393e':'#262b31'};border-radius:4px"><small>${i+1}번</small><strong style="display:block;font:700 1.25rem Georgia,serif">${face(c)}</strong></div>`:
        button('p'+i,(on?'✓ ':'')+(i+1)+'번',!on&&s.pick.length===2);
    });
    return '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;max-width:350px;margin:12px auto">'+grid.join('')+'</div>';
  }
  function settleChoice(s,right){
    const outcomes=[right,...s.commit.map(c=>c.right)],votes=[s.bold,...s.commit.map(c=>c.bold)];
    const graded=outcomes.map((ok,i)=>s.round===1?(votes[i]?(ok?7:-3):(ok?4:0)):s.round===2?(i===0?s.tiles.length:(ok?s.ideal:s.ideal-1)):(ok?4:0));
    if(s.round===0){
      const base=graded.slice();
      graded.forEach((v,i)=>{const upper=base.filter(a=>a>v).length<2;graded[i]+=upper&&!votes[i]?2:!upper&&votes[i]?3:0;});
    }
    graded.forEach((v,i)=>s.points[i]+=v);
    const result=s.round===2?s.tiles.length+' / '+s.ideal+'장':(right?'정답':'오답')+' · 정답 '+s.answer;
    s.log=mission[s.round]+' · '+result+' · 내 승점 '+(graded[0]>=0?'+':'')+graded[0];s.phase='result';
  }
  function legacy(s){
    if(!s.choiceEdition&&!s.done){const old=s.round;freshProblem(s);s.log=(old+1)+'번째 종목에서 이어갑니다.';}
  }
  M.choice={
    name:'양자택일',rule:'큐브 세기, 네모 세기, 잔디 깔기, 기억 포커 앞에서 서로 다른 조건을 고릅니다. 네 종목 누적 승점으로 순위를 정하는 4인 축약판입니다. 기억 포커는 시간 제한 없이 16장을 외운 뒤 공용 3장과 기억한 2장으로 상대와 대결합니다.',
    start(){const s={...blank(),points:[0,0,0,0]};freshProblem(s);return s;},
    view(s){
      legacy(s);
      let body=tally(s.points);
      if(s.done||s.phase==='result')body+='<p>'+s.log+'</p>'+(s.done?'':actions([button('next','다음 종목 →')]));
      else if(s.phase==='contract')body+=label(mission[s.round],'선택이 이번 종목의 조건을 정합니다')+'<p>'+options[s.round][2]+'</p>'+actions([button('safe',options[s.round][0]),button('bold',options[s.round][1])]);
      else{
        if(s.social)body+='<p class="caption">'+s.social+'</p>';
        if(s.phase==='rival')body+='<p>기억 포커 대결 상대를 고르세요.</p>'+actions(names.slice(1).map((n,i)=>button('rival'+(i+1),n+' · '+s.points[i+1]+'점')));
        else if(s.round===2)body+='<p>가로나 세로로 붙은 빈 두 칸을 눌러 잔디 한 장을 놓으세요. 최대 '+s.ideal+'장</p>'+turfBoard(s)+actions([button('undo','마지막 장 회수',!s.tiles.length),button('finish','배치 확정')]);
        else if(s.round===3&&s.phase==='memorize')body+='<p>'+names[s.rival]+'와 대결합니다. 카드의 숫자·무늬·위치를 기억한 뒤 판을 덮으세요.</p>'+pokerGrid(s,true)+actions([button('cover','외웠어요 · 16장 덮기')]);
        else if(s.round===3)body+='<p>공유 카드　<b>'+s.shared.map(face).join('　')+'</b></p><p>아래 16곳 중 2곳을 골라 가장 높은 다섯 장 족보를 만드세요.</p>'+pokerGrid(s,false)+actions([button('showdown','패 공개',s.pick.length!==2)]);
        else body+=(s.round===0?cubes(s):rects(s))+'<p>'+(s.round===0?'쌓인 큐브는 모두 몇 개일까요?':'칸 안의 합이 '+s.target+'인 직사각형은 몇 개일까요?')+'</p>'+(s.round===1&&!s.bold?'<p class="caption">팀 단서 · 높이가 한 줄인 정답은 '+s.oneRow+'개입니다.</p>':'')+actions(s.options.map(v=>button('ans'+v,String(v))));
      }
      return container('선택 단말기',`${s.round+1} / 4 종목`,body);
    },
    act(s,key){
      if(s.done)return;
      legacy(s);
      if(s.phase==='result'&&key==='next'){s.round++;freshProblem(s);return;}
      if(s.phase==='contract'&&['safe','bold'].includes(key)){
        s.bold=key==='bold';const votes=[s.bold,...s.commit.map(c=>c.bold)],b=votes.filter(Boolean).length;
        s.social=options[s.round][0]+' '+(4-b)+'명 · '+options[s.round][1]+' '+b+'명';
        s.phase='solve';
        if(s.round===2){
          const common=4-b>=3?5:0;
          votes.forEach((priv,i)=>s.points[i]+=common+(priv?3:0));
          s.social+=' · 공공 보상 '+common+'점 · 개인 선택자 +3점';
        }
        if(s.round===3){
          if(b>=3){s.rival=[1,2,3].sort((a,b)=>Math.abs(s.points[a]-s.points[0])-Math.abs(s.points[b]-s.points[0]))[0];s.phase='memorize';}
          else s.phase='rival';
        }
        return;
      }
      if(s.phase==='rival'){const p=digits(key,'rival',3);if(p>=1){s.rival=p;s.phase='memorize';}return;}
      if(s.phase==='memorize'&&key==='cover'){s.phase='solve';return;}
      if(s.phase!=='solve')return;
      if(s.round===3){
        if(key==='showdown'&&s.pick.length===2){duel(s);return;}
        const n=digits(key,'p',15);
        if(n>=0){if(s.pick.includes(n))s.pick=s.pick.filter(i=>i!==n);else if(s.pick.length<2)s.pick.push(n);}
        return;
      }
      if(s.round===2){
        if(key==='undo'){s.tiles.pop();s.selected=-1;return;}
        if(key==='finish'){settleChoice(s,s.tiles.length===s.ideal);return;}
        const n=digits(key,'cell',11);
        if(n<0||s.holes.includes(n)||s.tiles.flat().includes(n))return;
        if(s.selected===n){s.selected=-1;return;}
        const prev=s.selected;
        if(prev>=0&&(Math.abs(prev-n)===4||(Math.abs(prev-n)===1&&Math.floor(prev/4)===Math.floor(n/4)))){ s.tiles.push([prev,n]);s.selected=-1; }
        else s.selected=n;
      }else{const n=digits(key,'ans',99);if(s.options.includes(n))settleChoice(s,n===s.answer);}
    }
  };

  /* Stones and colored seals. All NPC submissions lock before the player's first choice. */
  const total=a=>a.reduce((x,y)=>x+y,0);
  function stonePlans(s) {
    s.phase='pick';s.stone=null;s.tray=null;s.wild=false;
    s.plans=names.slice(1).map((_,i)=>{
      const p=i+1, choices=[];
      for(const number of s.hands[p])for(let tray=0;tray<3;tray++){
        const wild=s.chips[p][tray]===0;if(wild&&!s.chips[p][3])continue;
        const sum=total(s.piles[tray])+number;
        choices.push({p,number,tray,wild,utility:(sum>=13?-s.piles[tray].length*3:sum*.1)+number*.13-(wild?.6:0)+Math.random()*3});
      }
      return choices.sort((a,b)=>b.utility-a.utility)[0];
    });
  }
  function placeStones(s,late){
    const sorted=s.plans.slice().sort((a,b)=>Number(b.wild)-Number(a.wild)||b.number-a.number||((a.p-s.round+8)%4)-((b.p-s.round+8)%4));
    if(late)sorted.push(sorted.splice(sorted.findIndex(v=>v.p===0),1)[0]);
    let summaries=[];
    for(const o of sorted){
      const pile=s.piles[o.tray];
      let penalty=0;
      if(total(pile)+o.number>=13){penalty=pile.length;s.penalties[o.p]+=penalty;pile.length=0;}
      pile.push(o.number);
      s.hands[o.p].splice(s.hands[o.p].indexOf(o.number),1);s.chips[o.p][o.wild?3:o.tray]--;
      summaries.push(`${names[o.p]} ${pads[o.tray]} ${o.number}${penalty?' (벌점 '+penalty+')':''}`);
    }
    s.log=summaries.join(' → ');s.phase='result';
    if(s.round===6)ranking(s,s.penalties,true);
  }
  M.heavy={
    name:'무거운 13',rule:'돌 하나와 색 받침대를 고릅니다. 무지개 인장이 우선이고 이후 큰 숫자부터 놓습니다. 내 돌로 합이 13 이상이 되면 기존 돌의 개수만큼 벌점을 받고, 받침대에는 내 돌만 남습니다. 모두 공개한 뒤 내 순서를 맨 뒤로 한 번 미룰 수 있습니다. 4인 7라운드 축약전이며 벌점이 적을수록 좋습니다.',
    start(){const s={...blank(),piles:[[],[],[]],hands:names.map(()=>[0,1,2,3,4,5,6]),chips:names.map(()=>[2,2,2,1]),penalties:[0,0,0,0]};stonePlans(s);return s;},
    view(s){
      let body='<div class="grid">'+s.piles.map((pile,i)=>`<div class="card">${tag(tokens[i]+' '+pads[i],colors[i])}<h3>${total(pile)} <small>/ 13</small></h3><small>${pile.length?pile.join(' + '):'빈 받침대'}</small></div>`).join('')+'</div>'+tally(s.penalties,'벌점');
      if(s.phase==='pick'){
        body+='<p>① 제출할 돌</p>'+actions(s.hands[0].map(n=>button('stone'+n,(s.stone===n?'✓ ':'')+n)))+'<p>② 인장과 받침대</p>'+actions(pads.map((n,i)=>button('tray'+i,(s.tray===i&&!s.wild?'✓ ':'')+n+' ×'+s.chips[0][i],!s.chips[0][i])));
        if(s.chips[0][3])body+=actions(pads.map((n,i)=>button('wild'+i,(s.tray===i&&s.wild?'✓ ':'')+'◇ 무지개 → '+n)));
        body+=actions([button('seal','비공개 제출',s.stone===null||s.tray===null)]);
      }else if(s.phase==='reveal')body+='<p>'+s.plans.map(o=>names[o.p]+' · '+(o.wild?'◇ ':'')+pads[o.tray]+' '+o.number).join('　')+'</p>'+actions([button('place','순서대로 놓기'),button('defer','맨 뒤로 미루기')]);
      else body+='<p>'+s.log+'</p>'+(s.done?'':actions([button('next','다음 제출 →')]));
      return container('세 받침대',`${s.round+1} / 7 라운드`,body);
    },
    act(s,key){
      if(s.done)return;
      if(s.phase==='result'&&key==='next'){s.round++;stonePlans(s);return;}
      if(s.phase==='reveal'&&['defer','place'].includes(key)){placeStones(s,key==='defer');return;}
      if(s.phase!=='pick')return;
      const n=digits(key,'stone',6),t=digits(key,'tray',2),w=digits(key,'wild',2);
      if(s.hands[0].includes(n))s.stone=n;
      if(t>=0&&s.chips[0][t]>0){s.tray=t;s.wild=false;}
      if(w>=0&&s.chips[0][3]>0){s.tray=w;s.wild=true;}
      if(key==='seal'&&s.stone!==null&&s.tray!==null){s.plans.push({p:0,number:s.stone,tray:s.tray,wild:s.wild});s.phase='reveal';}
    }
  };

  /* Original three-instrument exchange. NPCs read exactly the market history and announced cue shown on screen. */
  const stocks=['유리공방','은하전력','철새우편'];
  const symbols=['◇','ϟ','✉'];
  const statements=['순매수가 양수면 +4, 음수면 −2, 같으면 유지','직전 장에서 다음 종목이 오르면 +3, 내리면 −2, 같으면 유지','햇빛 장이면 +3, 달빛 장이면 −2'];
  const hints=['거래량에 반응','이웃 종목과 연결','장 표식에 반응'];
  const wealth=(s,p)=>s.cash[p]+s.hold[p].reduce((a,n,j)=>a+n*s.prices[j],0);
  function exchangeOrders(s){
    s.phase='trade';
    s.sun=rnd(2)===0;
    const prev=s.history.length>1?s.history.at(-2):s.prices;
    s.npcOrders=names.slice(1).map((_,idx)=>{
      const p=idx+1, candidates=[{i:-1,q:0,value:Math.random()*1.2}];
      for(let j=0;j<3;j++){
        const delta=s.prices[j]-prev[j];
        const signal=s.rules[j]===2&&s.round>=2?(s.sun?2:-2):
          s.rules[j]===1&&s.round>=3?Math.sign(s.prices[(j+1)%3]-prev[(j+1)%3]):.35*Math.sign(delta);
        if(s.cash[p]>=s.prices[j])candidates.push({i:j,q:1,value:signal+Math.random()*2});
        if(s.hold[p][j])candidates.push({i:j,q:-1,value:-signal+Math.random()*2});
      }
      return candidates.sort((a,b)=>b.value-a.value)[0];
    });
  }
  function clearMarket(s,key){
    const prev=s.history.length>1?s.history.at(-2):s.prices;
    const i=digits(key,'buy',2),j=digits(key,'sell',2);
    const order=i>=0?{i,q:1}:j>=0?{i:j,q:-1}:{i:-1,q:0};
    if(order.q===1&&s.cash[0]<s.prices[i]||order.q===-1&&!s.hold[0][j])return;
    const flow=[0,0,0];
    [order,...s.npcOrders].forEach((o,p)=>{
      if(!o.q)return;
      flow[o.i]+=o.q;s.hold[p][o.i]+=o.q;s.cash[p]-=o.q*s.prices[o.i];
    });
    const old=s.prices.slice();
    s.prices=old.map((v,i)=>{
      const trend=Math.sign(old[(i+1)%3]-prev[(i+1)%3]);
      const change=[flow[i]>0?4:flow[i]<0?-2:0,trend>0?3:trend<0?-2:0,s.sun?3:-2][s.rules[i]];
      return Math.max(2,v+change);
    });
    s.lastFlow=flow;s.history.push(s.prices.slice());s.phase='settled';
    s.log=(order.q?stocks[order.i]+' 1주 '+(order.q>0?'매수':'매도'):'현금 보유')+' · '+stocks.map((n,k)=>n+' '+(s.prices[k]-old[k]>=0?'+':'')+(s.prices[k]-old[k])).join(' / ');
    s.sunHistory.push(s.sun);
    if(s.round===7)ranking(s,names.map((_,i)=>wealth(s,i)));
  }
  function sparkline(s,i){
    const pts=s.history.map(row=>row[i]), min=Math.min(...pts)-2,max=Math.max(...pts)+2;
    const xy=pts.map((v,k)=>[8+k*105/Math.max(1,pts.length-1),49-40*(v-min)/(max-min)]);
    return svg(122,55,'<path d="M4 49h114 M4 29h114 M4 9h114" stroke="#596065" opacity=".45" fill="none"/><polyline points="'+xy.map(p=>p.join(',')).join(' ')+'" fill="none" stroke="'+colors[i]+'" stroke-width="2"/>'+xy.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.1" fill="${colors[i]}"/>`).join(''),stocks[i]+' 가격 '+pts.join(', '));
  }
  M.exchange={
    name:'미스터리 거래소',rule:'초기 자산은 현금 28과 종목별 1주입니다. 매 장 한 주를 사거나 팔거나 보유합니다. 주문은 같은 가격에 동시에 체결되고, 각기 다른 세 규칙으로 새 시세가 정해집니다. 유리공방→은하전력→철새우편→유리공방이 순환 순서입니다. 3장부터 규칙 단서가 열립니다. 8장이 끝날 때 현금과 주식 평가액의 합이 큰 사람이 이깁니다. 시세표와 조건은 이 판을 위해 새로 설계했습니다.',
    start(){const s={...blank(),rules:shuffle([0,1,2]),prices:[8,8,8],cash:names.map(()=>28),hold:names.map(()=>[1,1,1]),history:[[8,8,8]],sunHistory:[],lastFlow:[0,0,0]};exchangeOrders(s);return s;},
    view(s){
      let b='<p>'+stat('내 현금',s.cash[0])+ '　'+stat('총 자산',wealth(s,0))+'　'+stat('장 표식',s.sun?'☀ 햇빛':'☾ 달빛')+'</p><div class="grid">';
      b+=stocks.map((n,i)=>`<article class="card">${tag(symbols[i]+' '+n,colors[i])}<h3>${s.prices[i]} <small>크레딧</small></h3>${sparkline(s,i)}<p>보유 ${s.hold[0][i]}주 · 직전 순매수 ${s.lastFlow[i]}</p><small class="caption">${s.done||s.round>=5?statements[s.rules[i]]:s.round>=2?hints[s.rules[i]]:'규칙 미공개'}</small>${s.phase==='trade'?actions([button('buy'+i,'매수',s.cash[0]<s.prices[i]),button('sell'+i,'매도',!s.hold[0][i])]):''}</article>`).join('')+'</div>';
      b+=s.phase==='trade'?actions([button('hold','거래 없이 마감')]):'<p>'+s.log+'</p>'+tally(names.map((_,i)=>wealth(s,i)),'')+(s.done?'':actions([button('next','다음 장 개장 →')]));
      return container('주문 단말기',`${s.round+1} / 8 장`,b);
    },
    act(s,key){
      if(s.done)return;
      if(s.phase==='settled'&&key==='next'){s.round++;exchangeOrders(s);return;}
      if(s.phase==='trade'&&(key==='hold'||digits(key,'buy',2)>=0||digits(key,'sell',2)>=0))clearMarket(s,key);
    }
  };

  // Abstract rotating cipher. There are no physical weapon mechanics or assets.
  const sigils=['해','별','탑','달','잎','물'];
  const sigilGlyph=['☼','✧','♜','☽','❧','≈'];
  const norm=n=>(n+6)%6;
  function lockDial(s) {
    s.phase='inspect';s.position=0;s.revealed=false;s.secret=rnd(6);
    s.labels=shuffle([0,1,2,3,4,5]);
    const outer=['짝수 방위','홀수 방위'][s.secret%2];
    const neighbors=[norm(s.secret-1),norm(s.secret+1)];
    const far=norm(s.secret+3);
    s.clues=[`봉인은 ${outer}에 있다.`,`봉인의 바로 옆에 ‘${sigils[s.labels[neighbors[rnd(2)]]]}’ 문양이 있다.`,`봉인과 정반대에 ‘${sigils[s.labels[far]]}’ 문양이 있다.`];
    // The first two facts always leave two plausible slots. The third resolves them.
    const sym=s.clues[1].match(/‘(.+?)’/)[1], slot=s.labels.indexOf(sigils.indexOf(sym));
    s.candidates=[norm(slot-1),norm(slot+1)];
    s.cpu=names.slice(1).map((_,i)=>{const spend=Math.random()<[.30,.46,.65][i];return {spend,pick:spend?s.secret:s.candidates[rnd(s.candidates.length)]};});
  }
  function wheel(s) {
    const cc=sigils.map((_,i)=>{
      const angle=(i*60-90)*Math.PI/180,x=130+Math.cos(angle)*72,y=99+Math.sin(angle)*72;
      const selected=s.position===i,found=s.phase==='result'&&s.secret===i;
      return `<g><circle cx="${x}" cy="${y}" r="20" stroke="${found?'#a9e1a2':selected?'#f0cf91':'#746858'}" stroke-width="${selected||found?3:1}" fill="${found?'#324a3c':selected?'#51442e':'#272b32'}"/><text x="${x}" y="${y+2}" text-anchor="middle" fill="#efdbb5" font-size="17">${sigilGlyph[s.labels[i]]}</text><text x="${x}" y="${y+13}" text-anchor="middle" fill="#c7c6b7" font-size="8">${i} ${sigils[s.labels[i]]}</text></g>`;
    }).join('');
    const a=(s.position*60-90)*Math.PI/180;
    return svg(260,198,'<circle cx="130" cy="99" r="73" fill="none" stroke="#776c59"/><circle cx="130" cy="99" r="45" fill="none" stroke="#4c473e" stroke-dasharray="2 4"/><path d="M130 99 L'+(130+Math.cos(a)*47)+' '+(99+Math.sin(a)*47)+'" stroke="#edc98e" stroke-width="4"/>'+cc,'0부터 시계방향으로 '+s.labels.map(i=>sigils[i]).join(', '));
  }
  M.dial={
    name:'러시안 룰렛 · 봉인 원판',rule:'방송의 감옥매치를 여섯 방위의 추상 추리 퍼즐로 재해석했습니다. 두 단서를 읽고 봉인의 방위를 고르세요. 즉시 해독하면 성공 +5, 실패 −2입니다. 세 번째 단서를 열면 정답을 확정할 수 있고 성공 보상은 +3이 됩니다. 4개의 원판을 마친 뒤 합계로 순위를 매깁니다.',
    start(){const s={...blank(),points:[0,0,0,0]};lockDial(s);return s;},
    view(s){
      let b=wheel(s)+'<p>'+s.clues.slice(0,s.revealed||s.phase==='result'?3:2).map((c,i)=>stat('0'+(i+1),c)).join('<br>')+'</p>';
      if(s.phase==='inspect')b+=actions([button('left','↶ 왼쪽'),button('right','오른쪽 ↷'),button('hint','세 번째 단서',s.revealed),button('decode',s.position+'번 봉인 해독')]);
      else b+='<p>'+s.log+'</p>'+(s.done?'':actions([button('next','다음 원판 →')]));
      return container('봉인 원판',`${s.round+1} / 4 원판`,b+tally(s.points));
    },
    act(s,key){
      if(s.done)return;
      if(s.phase==='result'&&key==='next'){s.round++;lockDial(s);return;}
      if(s.phase!=='inspect')return;
      if(key==='left')s.position=norm(s.position-1);
      if(key==='right')s.position=norm(s.position+1);
      if(key==='hint')s.revealed=true;
      if(key==='decode'){
        const success=s.secret===s.position,gain=success?(s.revealed?3:5):-2;
        s.points[0]+=gain;s.cpu.forEach((x,i)=>s.points[i+1]+=x.pick===s.secret?(x.spend?3:5):-2);
        s.log=`${success?'봉인 해독 성공':'봉인이 응답하지 않았습니다'} · 정답 ${s.secret}번 ${sigils[s.labels[s.secret]]} · ${gain>0?'+':''}${gain}점`;
        s.phase='result';if(s.round===3)ranking(s,s.points);
      }
    }
  };
})();
