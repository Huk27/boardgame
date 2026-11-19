/* Locally illustrated solo adaptations. Rule references: Netflix, The Devil's Plan:
   Death Again, episodes 6–10; NamuWiki day 3 and day 4 rule transcriptions. */
(() => {
'use strict';
const M=window.Matches || (window.Matches={});
const range=n=>Array.from({length:n},(_,i)=>i);
const random=n=>Math.floor(Math.random()*n);
const sum=a=>a.reduce((x,y)=>x+y,0);
const pick=a=>a[random(a.length)];
function shuffle(a){ const out=a.slice(); for(let i=out.length-1;i>0;i--){const j=random(i+1);[out[i],out[j]]=[out[j],out[i]];}return out; }
const button=(key,label,disabled=false)=>'<button type="button" class="choice" data-act="'+key+'"'+(disabled?' disabled':'')+'>'+label+'</button>';
const actions=items=>'<div class="actions">'+items.join('')+'</div>';
const note=t=>'<p class="caption">'+t+'</p>';
const names=['나','황동','수은','비취','칠흑','진주','흑단','백금','호박'];
function finish(s,values){s.done=true;s.place=1+values.filter(v=>v>values[0]).length;s.score=Math.round(100*(values.length-s.place)/(values.length-1));}
const faces=['다이아','금','은','동','폭탄'],palette=['#7dcfd3','#e2bb69','#b9c3d3','#c78762','#df6b72'];
const cards=[[0,5],[0,6],[1,4],[1,5],[2,2],[2,3],[2,4],[3,1],[3,1],[3,2],[3,2],[4,-6],[4,-4]];
function gemIcon(t){const cuts=['M3 10 8 4h12l5 6-11 13z M3 10h22 M8 4l6 19 6-19','M3 19 7 7h14l5 12z M7 7l3 8h14 M10 15l-7 4','M4 19 9 6h12l4 13z M9 6l4 8h10 M13 14l-9 5','M5 8l9-5 10 6v11l-10 4-9-6z M5 8l9 5 10-4 M14 13v11','M14 2l12 21H2z M14 9v7 M14 18v2'];return '<svg viewBox="0 0 28 26" width="27" height="26" style="vertical-align:middle" aria-hidden="true"><path d="'+cuts[t]+'" fill="'+palette[t]+'" fill-opacity=".21" stroke="'+palette[t]+'" stroke-width="1.5" stroke-linejoin="round"/></svg>';}
const face=c=>gemIcon(cards[c][0])+' '+faces[cards[c][0]]+' '+cards[c][1];
const slot=i=>i<9?names[i]:i<12?'구매자 '+(i-8):'폐기함';
const secretLink=(s,i)=>s.chain[(s.chain.indexOf(i)+8)%9];
function gemDeal(s){
  s.layout=shuffle(range(13));s.memory=range(9).map(()=>Array(13).fill(-1));s.trace=[];
  const forward=range(9).map(i=>(s.first+i)%9);s.order=forward.concat(forward.slice().reverse());s.turn=0;s.phase='swap';gemBots(s);
}
function gemSwap(s,p,target){
  const deck=s.layout, old=deck[p], stolen=deck[target];
  if(target<9&&cards[stolen][0]===4)s.points[target]+=3;
  [deck[p],deck[target]]=[stolen,old];
  for(const mem of s.memory){[mem[p],mem[target]]=[mem[target],mem[p]];}
  s.memory[p][p]=stolen;s.memory[p][target]=old;
  s.trace.push(names[p]+' ↔ '+slot(target));s.turn++;
}
function gemEnd(s){
  const buy=s.layout.slice(9,12).map(c=>cards[c][0]);
  s.gain=s.layout.slice(0,9).map(c=>{const [t,n]=cards[c];return t===4?n:n*buy.filter(k=>t===k).length;});
  s.points=s.points.map((v,i)=>v+s.gain[i]);
  s.gain.forEach((g,i)=>{if(g>0&&cards[s.layout[i]][0]===0&&s.pieces)s.pieces[i]++;});
  s.log=s.round+'라운드 정산 · 내 패 '+faces[cards[s.layout[0]][0]]+' '+cards[s.layout[0]][1]+' · 이번 카드 점수 '+s.gain[0]+'점.';
  const bomb=[11,12].map(c=>s.layout.indexOf(c)).find(i=>i<9);if(bomb!==undefined)s.first=bomb;
  s.phase='result';
  if(s.round===3){s.final=s.points.map((v,i)=>v*s.points[secretLink(s,i)]);finish(s,s.final);s.log+=' 내 마니또 '+names[secretLink(s,0)]+' · '+s.points[0]+' × '+s.points[secretLink(s,0)]+' = '+s.final[0]+'점 · '+s.place+'위';}
}
function gemTargets(s,p){return range(cards[s.layout[p]][0]===4?9:13).filter(i=>i!==p);}
function gemBots(s){
  while(s.turn<18){const p=s.order[s.turn];s.memory[p][p]=s.layout[p];if(!p)return;
    const mem=s.memory[p], offers=gemTargets(s,p);
    const value=i=>{if(mem[i]===-1)return 1.9+Math.random()*1.5; const [t,n]=cards[mem[i]];return n*(t===4?1:.5+mem.slice(9,12).filter(c=>c!==-1&&cards[c][0]===t).length)+Math.random();};
    const target=offers.map(i=>[i,value(i)]).sort((a,b)=>b[1]-a[1])[0][0];gemSwap(s,p,target);
  }gemEnd(s);
}
function openGemAuction(s,bid){
  // Only the remaining candidates re-bid. Unsuccessful offers cost no pieces.
  while(true){
    const bids=s.bidders.map(i=>i===0?bid:random(s.pieces[i]+1));
    const high=Math.max(...bids);
    const tied=s.bidders.filter((i,j)=>bids[j]===high);
    s.bidders=tied;s.auctions++;
    if(tied.length===1||s.auctions===4){
      s.first=pick(tied);s.pieces[s.first]-=high;
      s.auctionResult=(tied.length===1?'선 경매':'4차 동률 추첨')+' · '+names[s.first]+' '+high+'피스 낙찰';
      s.log=s.auctionResult+'. 선 플레이어는 정순 첫 교환과 역순 마지막 교환을 합니다.';
      gemDeal(s);return;
    }
    s.log=high+'피스 동률. '+tied.map(i=>names[i]).join(', ')+'만 다시 비공개 입찰합니다.';
    if(tied.includes(0))return;
  }
}
M.gems={
  name:'보석 암시장',rule:'9명이 한 장씩 들고 정순·역순으로 한 번씩 패를 바꿉니다. 폭탄은 사람과만 교환합니다. 상대가 내 폭탄을 가져가면 즉시 +3점. 구매자 3칸에 내 보석과 같은 종류가 있으면 카드값 × 일치 수만큼 얻으며 폭탄은 감점됩니다. 3판 뒤 내 점수와 숨은 마니또 점수를 곱합니다. 자유 연습에서는 3피스, 시즌에서는 누적 피스로 시작합니다. 첫 순서 경매에는 최대 3피스를 냅니다. 최고가 동률자는 재입찰하며 4차 동률은 추첨합니다. 게임 전체에서 한 번 1피스로 구매자·폐기함 카드를 확인할 수 있습니다. 다이아로 득점하면 1피스를 받습니다.',
  start(){return {round:1,first:0,chain:shuffle(range(9)),points:Array(9).fill(0),pieces:Array(9).fill(3),bidders:range(9),auctions:0,phase:'auction',peek:true,done:false,score:0,log:'선 플레이어 자리를 놓고 익명 경매를 시작합니다.'};},
  view(s){if(s.phase==='auction'){return '<div class="card"><strong>선 플레이어 비공개 경매</strong>'+note('보유 '+s.pieces[0]+'피스 · '+(s.auctions+1)+'차 입찰 · 경쟁자 '+(s.bidders.length-1)+'명')+note('먼저 시작하면 마지막에도 교환합니다. 엿보기용 1피스를 남길지 선택하세요.')+'</div>'+actions(range(Math.min(3,s.pieces[0])+1).map(n=>button('bid'+n,n+'피스 봉인'))); }
    const reveal=s.phase==='result', m=s.memory[0];
    let h=note('라운드 '+s.round+' / 3　·　내 점수의 수혜자 '+names[s.chain[(s.chain.indexOf(0)+1)%9]]+'　·　내 승점 '+s.points[0]);
    if(s.auctionResult)h+=note(s.auctionResult+'　·　내 잔여 '+s.pieces[0]+'피스');
    h+='<div class="card"><strong>내 패　'+face(s.layout[0])+'</strong></div>';
    const label=i=>slot(i)+'　'+(reveal||m[i]!==-1?face(s.layout[i]):'◇ 비공개');
    h+=note('구매자와 폐기함')+actions(range(4).map(k=>{const i=k+9;return button('swap'+i,label(i),reveal||cards[s.layout[0]][0]===4);}));
    if(!reveal&&s.peek&&(!s.pieces||s.pieces[0]>0))h+=actions(range(4).map(k=>button('peek'+(k+9),slot(k+9)+' 엿보기 · 1피스')));
    h+=note(reveal?'딜러 공개 · 개인 누적점수':'교환할 참가자 · 숫자는 누적점수')+actions(range(8).map(k=>button('swap'+(k+1),label(k+1)+' · '+s.points[k+1]+'점',reveal)));
    if(s.trace.length)h+=note('교환 기록　'+s.trace.join('　/　'));
    if(reveal&&!s.done)h+=actions([button('next','다음 라운드')]);return h;},
  act(s,k){if(s.done)return;if(s.phase==='auction'){if(/^bid[0-3]$/.test(k)&&+k.slice(3)<=s.pieces[0])openGemAuction(s,+k.slice(3));return;}if(s.phase==='result'){if(k==='next'){s.round++;s.log='새 카드가 배분되었습니다.';gemDeal(s);}return;}
    const m=/^(swap|peek)(\d+)$/.exec(k);if(!m)return;const i=Number(m[2]);
    if(m[1]==='peek'){if(!s.peek||i<9||i>12||s.pieces&&s.pieces[0]<=0)return;s.peek=false;if(s.pieces)s.pieces[0]--;s.memory[0][i]=s.layout[i];s.log=slot(i)+' 확인 · '+faces[cards[s.layout[i]][0]]+' '+cards[s.layout[i]][1];return;}
    if(!gemTargets(s,0).includes(i))return;gemSwap(s,0,i);s.log=slot(i)+'와 교환했습니다. 누가 이 카드를 가져가는지 기록을 확인하세요.';gemBots(s);}
};

const pigNames=['자개','황동','청자'],colors=['흑','백'];
function pigArt(i){return '<svg aria-hidden="true" viewBox="0 0 90 58" width="82" height="54"><g stroke="'+['#efabb4','#d8af74','#7bc6bb'][i]+'" stroke-width="2" stroke-linejoin="round" fill="none"><path d="M12 25q3-12 20-14 10-2 21 2l9-9 2 15 9 6 8 1-1 12-9 1-7 7-2 8h-7l-2-7-24 1-3 6h-6l-2-11q-11-6-7-18z" fill="currentColor" fill-opacity=".06"/><path d="M11 31Q0 32 5 23q5-4 6 1 M29 15l15-1 M32 19l14-1"/><circle cx="61" cy="25" r="2"/></g></svg>';}
function pigTurn(s){s.bank=random(3);s.deposit=[random(3),random(3)];if(!sum(s.deposit))s.deposit[random(2)]=1;s.deposit.forEach((v,c)=>s.banks[s.bank][c]+=v);s.phase='show';s.color=(s.round-1)%2;s.aiClaim=null;}
M.pig={
  name:'돼지 저금통',rule:'1인 기억 대결입니다. 저금통 셋은 흑·백 동전 1개씩으로 시작합니다. 공개되는 입금을 기억하세요. 내 선언은 정답 +1점, 오답 −1점. 상대 선언을 의심해 맞히면 +1점과 상대 −1점, 헛의심은 내 −1점입니다. 믿으면 상대 +1점. 연습판은 8회 동안 교대로 선언하며 의심한 저금통을 흑·백 1개로 다시 채웁니다.',
  start(){const s={banks:[[1,1],[1,1],[1,1]],round:1,pts:[0,0],done:false,score:0,log:'세 저금통은 흑·백 한 개씩으로 시작합니다.'};pigTurn(s);return s;},
  view(s){let h=note(s.round+' / 8회　·　나 '+s.pts[0]+'점　/　기록관 '+s.pts[1]+'점');
    h+='<div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap">'+pigNames.map((v,i)=>'<div class="card" style="text-align:center;opacity:'+(i===s.bank?1:.55)+'">'+pigArt(i)+'<br>'+v+'</div>').join('')+'</div>';
    if(s.done)return h;
    if(s.phase==='show')return h+note(pigNames[s.bank]+'에 흑 '+s.deposit[0]+'개, 백 '+s.deposit[1]+'개를 넣습니다.')+actions([button('hide','입금 기억 완료')]);
    if(s.phase==='guess')return h+note(pigNames[s.bank]+'에 든 '+colors[s.color]+' 동전은 몇 개일까요?')+actions(s.options.map(n=>button('n'+n,n+'개')));
    if(s.phase==='judge')return h+'<p>기록관 “'+pigNames[s.bank]+'에는 '+colors[s.color]+' 동전이 '+s.aiClaim+'개 있습니다.”</p>'+actions([button('doubt','의심 · 개봉'),button('trust','선언 인정')]);
    return h+actions([button('next','다음 입금')]);},
  act(s,k){if(s.done)return;const value=s.banks[s.bank][s.color];
    if(s.phase==='show'&&k==='hide'){if(s.round%2){s.phase='guess';const lo=Math.max(1,value-random(4));s.options=range(4).map(i=>i+lo);}else{s.phase='judge';s.aiClaim=Math.random()<.54?value:Math.max(0,value+pick([-2,-1,1,2]));}return;}
    if(s.phase==='result'&&k==='next'){s.round++;pigTurn(s);s.log='이번 입금을 기억하세요.';return;}
    if(s.phase==='guess'&&/^n\d+$/.test(k)&&s.options.includes(+k.slice(1))){const ok=+k.slice(1)===value;s.pts[0]+=ok?1:-1;s.log=(ok?'정확한 기억. +1점.':'다른 개수입니다. −1점.')+' '+pigNames[s.bank]+'의 '+colors[s.color]+' 동전은 '+value+'개였습니다.';}
    else if(s.phase==='judge'&&(k==='doubt'||k==='trust')){if(k==='trust'){s.pts[1]++;s.log='선언을 인정했습니다. 기록관 +1점.';}else{const caught=s.aiClaim!==value;s.pts[0]+=caught?1:-1;if(caught)s.pts[1]--;s.log='개봉 결과 '+value+'개. '+(caught?'의심 성공. 나 +1점, 기록관 −1점.':'기록관의 선언이 맞아 나 −1점.')+' 이 저금통은 흑·백 1개씩으로 교체합니다.';s.banks[s.bank]=[1,1];}}
    else return;s.phase='result';if(s.round===8){finish(s,s.pts);s.log+=' 최종 '+s.pts.join(' 대 ')+'점.';}}
};

const shape=['● 원','▲ 삼각','★ 별'], pattern=[0,1,2,2,0,1,1,2,0];
const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
function bingoFit(counts){
  let best={lines:0,count:0,mask:0};
  for(let mask=1;mask<512;mask++){const used=[0,0,0];for(let i=0;i<9;i++)if(mask&(1<<i))used[pattern[i]]++;
    if(used.some((v,i)=>v>counts[i]))continue;
    const n=lines.filter(row=>row.every(i=>mask&(1<<i))).length, count=sum(used);
    if(n>best.lines||n===best.lines&&count>best.count)best={lines:n,count,mask};
  }return best;
}
const bidderName=i=>i===7?'게스트':names[i];
const pledges=choices=>shape.map((v,t)=>v+' '+choices.map((c,i)=>c===t?bidderName(i):null).filter(Boolean).join('·')).join('　');
const coins=()=>[1,1,1,2,2,2,3,3,5,10];
function bingoBoard(mask){return '<div aria-label="도형 빙고판" style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;max-width:265px;margin:12px auto">'+pattern.map((p,i)=>'<span style="padding:10px 0;text-align:center;border:1px solid #676468;background:'+(mask&(1<<i)?'#6c5933':'transparent')+'">'+shape[p]+'</span>').join('')+'</div>';}
function bingoEnd(s,unpaid){const fits=s.gains.map(bingoFit);s.fit=fits;
  const values=fits.map((f,i)=>f.lines*10000+f.count*100+s.purses[i].length);
  if(unpaid)values[0]=-1;finish(s,values.length===8?values.slice(0,7):values);
  s.log=(unpaid?'입찰할 동전이 없어 최하위입니다. ':'마감 · ')+fits[0].lines+'줄, '+fits[0].count+'칸 완성 · '+s.place+'위.';
}
M.bingo={
  name:'경매 빙고',rule:'네임 티켓 7장으로 7번의 경매에 참여합니다. 매회 티켓 한 장을 원하는 도형에 넣으면 참가자별 선택이 공개됩니다. 각 도형에 모인 티켓 수만큼 도형이 걸립니다. 가장 많이 낸 사람이 가져가며 공동 낙찰이면 균등 분배 후 나머지는 버립니다. 쓴 동전은 전부 소모되며 한 번이라도 못 내면 최하위입니다. 획득량은 최종 공개, 최고 낙찰가는 비밀입니다. 8인 경매에서 게스트의 순위는 제외합니다. 연습판에서는 추가 피스 결제와 게스트의 개인 상금 목표를 생략합니다. 최다 줄, 채운 칸, 남은 동전 개수 순으로 겨룹니다.',
  start(){return {round:1,phase:'ticket',purses:range(8).map(coins),gains:range(8).map(()=>[0,0,0]),tickets:Array(8).fill(7),history:[],fav:shuffle([0,0,1,1,2,2,random(3)]),selected:[],done:false,score:0,log:'어떤 도형에 첫 티켓을 놓을까요?'};},
  view(s){let h=note('라운드 '+s.round+' / 7　·　남은 티켓 '+(s.tickets?s.tickets[0]:Math.max(0,8-s.round-(s.phase==='ticket'?0:1)))+'장　·　내 지갑 '+s.purses[0].length+'개 ('+sum(s.purses[0])+'원)')+bingoBoard(s.done?s.fit[0].mask:0);
    if(s.done)return h+note('내가 획득한 도형　'+shape.map((c,i)=>c+' '+s.gains[0][i]+'개').join('　'))+note(s.history.join('<br>'));
    if(s.phase==='ticket')h+=note('티켓을 넣을 도형을 고르세요.')+actions(shape.map((v,i)=>button('shape'+i,v)));
    if(s.phase==='bid'){h+=note('공개된 티켓　'+pledges(s.choices));
      h+=note('내 도형 '+shape[s.choices[0]]+' · 제출할 동전을 눌러 선택하세요.')+actions(s.purses[0].map((n,i)=>button('coin'+i,(s.selected.includes(i)?'✓ ':'')+n+'원')));
      h+=actions([button('pay',sum(s.selected.map(i=>s.purses[0][i]))+'원 봉인 입찰',!s.selected.length)]);}
    if(s.phase==='result')h+=actions([button('next','다음 경매')]);if(s.history.length)h+=note(s.history.join('<br>'));return h;},
  act(s,k){if(s.done)return;
    if(s.phase==='result'&&k==='next'){s.round++;s.phase='ticket';s.log='다음 경매가 열렸습니다.';if(!s.purses[0].length)bingoEnd(s,true);return;}
    if(s.phase==='ticket'&&/^shape[0-2]$/.test(k)){if(!s.tickets)s.tickets=Array(s.purses.length).fill(8-s.round);if(s.tickets.some(v=>v<1))return;s.tickets=s.tickets.map(n=>n-1);s.choices=[+k.slice(5),...s.fav.map((f,i)=>(s.round===1&&Math.random()<.65)?f:random(3))];s.selected=[];s.phase='bid';return;}
    if(s.phase!=='bid')return;if(/^coin\d+$/.test(k)){const i=+k.slice(4);if(i>=s.purses[0].length)return;s.selected=s.selected.includes(i)?s.selected.filter(c=>c!==i):s.selected.concat(i);return;}
    if(k!=='pay'||!s.selected.length)return;
    const bids=s.purses.map((p,i)=>{let indices=s.selected.slice();if(i){const rivals=s.choices.filter(c=>c===s.choices[i]).length;const options=range(p.length).sort((a,b)=>p[a]-p[b]);indices=[rivals===1?options[0]:options[Math.min(options.length-1,Math.floor(options.length*(.4+Math.random()*.59)))]];if(rivals>1&&p.length>8-s.round&&Math.random()<.5){const j=options.find(j=>j!==indices[0]);if(j!==undefined)indices.push(j);}}
      const bid=sum(indices.map(j=>p[j]));s.purses[i]=p.filter((_,j)=>!indices.includes(j));return bid;});
    const prices=shape.map((_,t)=>{const ids=range(s.choices.length).filter(i=>s.choices[i]===t);if(!ids.length)return 0;const price=Math.max(...ids.map(i=>bids[i])),w=ids.filter(i=>bids[i]===price);
      w.forEach(i=>s.gains[i][t]+=Math.floor(ids.length/w.length));return price;});
    const high=Math.max(...prices);s.history.push(s.round+'회　'+pledges(s.choices)+'<br>낙찰가　'+shape.map((v,t)=>v+' '+(prices[t]===high?'비밀':prices[t]?prices[t]+'원':'—')).join('　'));
    s.log='내 '+shape[s.choices[0]]+' 입찰 '+bids[0]+'원. 획득 도형은 7회 경매 후 공개합니다.';s.phase='result';if(s.round===7)bingoEnd(s,false);}
};

const side=5, field=range(25), dirs=[[-1,0],[0,1],[1,0],[0,-1]],dirNames=['위 ↑','오른쪽 →','아래 ↓','왼쪽 ←'];
function adjacent(cell,d){const r=Math.floor(cell/side)+dirs[d][0],c=cell%side+dirs[d][1];return r<0||r>=side||c<0||c>=side?-1:r*side+c;}
const edge=(a,b)=>Math.min(a,b)*25+Math.max(a,b);
const coord=i=>'ABCDE'[i%side]+(Math.floor(i/side)+1);
function openEdges(s,at){return range(4).filter(d=>{const j=adjacent(at,d);return j>=0&&!s.walls.includes(edge(at,j));});}
function wallMoves(s,unit){
  const from=s.units[unit],can=(i,d)=>{const j=adjacent(i,d);return j>=0&&!s.units.includes(j)&&!s.walls.includes(edge(i,j));};
  const out=new Set();for(let d=0;d<4;d++){if(!can(from,d))continue;const j=adjacent(from,d);out.add(j);
    for(const e of unit%2?[(d+1)%4,(d+3)%4]:[d])if(can(j,e))out.add(adjacent(j,e));}
  return [...out];
}
function distances(s,starts){const queue=starts.slice(),dist=Array(25).fill(99);starts.forEach(i=>dist[i]=0);
  for(let k=0;k<queue.length;k++){const u=queue[k];for(const d of openEdges(s,u)){const v=adjacent(u,d);if(dist[v]!==99)continue;dist[v]=dist[u]+1;queue.push(v);}}
  return dist;
}
function areas(s){const a=distances(s,s.units.slice(0,2)),b=distances(s,s.units.slice(2)),totals=[0,0],near=[0,0];
  field.forEach(i=>{if(a[i]===99&&b[i]<99)totals[1]++;else if(b[i]===99&&a[i]<99)totals[0]++;if(a[i]<b[i])near[0]++;else if(b[i]<a[i])near[1]++;});return {totals,near,apart:s.units.slice(2).every(i=>a[i]===99)};
}
function wallPlay(s,unit,at,d){s.units[unit]=at;s.walls.push(edge(at,adjacent(at,d)));s.steps++;}
function wallOver(s){const a=areas(s);if(!a.apart&&s.passes<2)return false;finish(s,a.totals);s.log='영역 판정 · 나 '+a.totals[0]+'칸 / 설계자 '+a.totals[1]+'칸'+(a.totals[0]===a.totals[1]?' · 공동 1위':' · '+s.place+'위');return true;}
function wallBot(s){
  let best=-Infinity,chosen=null;
  for(const unit of [2,3])for(const at of wallMoves(s,unit))for(const d of openEdges(s,at)){const test={units:s.units.slice(),walls:s.walls.slice(),steps:s.steps};wallPlay(test,unit,at,d);const a=areas(test);
    const rank=(a.totals[1]-a.totals[0])*2+(a.near[1]-a.near[0])*.9+(wallMoves(test,2).length+wallMoves(test,3).length)*.15+Math.random()*2;
    if(rank>best){best=rank;chosen={unit,at,d};}}
  if(chosen){const {unit,at,d}=chosen;wallPlay(s,unit,at,d);s.passes=0;s.log+=' 설계자는 '+coord(at)+'에 '+dirNames[d]+' 벽을 설치했습니다.';}
  else{s.passes++;s.log+=' 설계자가 이동할 수 없어 차례를 넘깁니다.';}
  wallOver(s);
}
M.wall={
  name:'벽바둑 II',rule:'5×5 축소 결승입니다. 내 사각 말은 직선 1~2칸, 원형 말은 1칸 또는 직각으로 꺾어 2칸 이동합니다. 벽과 말을 통과할 수 없습니다. 이동 뒤 인접한 두 칸 사이에 벽 하나를 세웁니다. 양 진영이 분리되면 각자 말이 닿는 면적을 합산합니다. 고정 배치로 시작하며 양쪽 모두 이동할 수 없는 경우에도 확정 영역을 셉니다.',
  start(){return {units:[5,15,19,9],walls:[],steps:0,passes:0,unit:null,at:null,done:false,score:0,log:'청색이 내 말입니다. 먼저 움직일 말을 고르세요.'};},
  view(s){const a=areas(s);let h=note(Math.floor(s.steps/2)+1+'번째 수　·　확정 영역　나 '+a.totals[0]+'칸 / 설계자 '+a.totals[1]+'칸');const moves=s.unit===null?[]:wallMoves(s,s.unit);
    h+='<div style="display:grid;grid-template-columns:repeat(5,1fr);max-width:360px;gap:0;margin:12px auto;padding:3px;background:#53616a;border-radius:4px" aria-label="벽바둑 판">';
    for(const i of field){const unit=s.units.indexOf(i), mine=unit>=0&&unit<2,selectable=!s.done&&(mine||moves.includes(i)),mark=i===s.at?'◎':unit!==-1?['■','●','□','○'][unit]:moves.includes(i)?'·':'';
      const border=range(4).map(d=>{const n=adjacent(i,d);return n>=0&&s.walls.includes(edge(i,n))?'3px solid #fac474':'1px solid #46525a';});
      h+='<button type="button" data-act="cell'+i+'" aria-label="'+coord(i)+(unit!==-1?' '+(mine?'내':'상대')+(unit%2?' 원형 말':' 사각 말'):' 빈칸')+'" '+(selectable?'':'disabled')+' style="border-radius:0;aspect-ratio:1;margin:0;min-width:0;padding:0;line-height:1;opacity:1;color:'+(mine?'#8ee2ed':'#efc28c')+';background:'+(i===s.at||unit!==-1&&unit===s.unit?'#3d5362':moves.includes(i)?'#2b434c':'#20282e')+';border-top:'+border[0]+';border-right:'+border[1]+';border-bottom:'+border[2]+';border-left:'+border[3]+'"><small style="display:block;font-size:9px;opacity:.7">'+coord(i)+'</small><b style="font-size:22px">'+(mark||'&nbsp;')+'</b></button>';}
    h+='</div>';if(s.done)return h;if(s.at!==null){h+=note(coord(s.at)+'에서 벽을 세울 방향을 고르세요.')+actions(openEdges(s,s.at).map(d=>button('edge'+d,dirNames[d])));}
    else if(s.unit!==null)h+=note('점으로 표시된 이동 칸을 고르세요.');else h+=note('내 사각 말 ■ 또는 원형 말 ● 을 고르세요.');
    if(!wallMoves(s,0).length&&!wallMoves(s,1).length)h+=actions([button('pass','이동 불가 · 차례 넘기기')]);return h;},
  act(s,k){if(s.done)return;if(k==='pass'){if(wallMoves(s,0).length||wallMoves(s,1).length)return;s.passes++;s.log='이동할 수 없어 차례를 넘겼습니다.';if(!wallOver(s))wallBot(s);return;}
    if(/^cell\d+$/.test(k)){const i=+k.slice(4),u=s.units.indexOf(i);if(u>=0&&u<2){s.unit=u;s.at=null;return;}if(s.unit!==null&&wallMoves(s,s.unit).includes(i))s.at=i;return;}
    if(!/^edge[0-3]$/.test(k)||s.at===null)return;const d=+k.slice(4);if(!openEdges(s,s.at).includes(d))return;
    wallPlay(s,s.unit,s.at,d);s.log='나는 '+coord(s.at)+'에 '+dirNames[d]+' 벽을 세웠습니다.';s.passes=0;s.at=s.unit=null;if(!wallOver(s))wallBot(s);}
};
})();
