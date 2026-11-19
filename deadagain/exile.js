/* Hand-drawn EP3/6–10 side rooms. Each puzzle is self-contained and fully serializable. */
(() => {
  'use strict';
  const games = window.Matches ||= {};
  const colors=['#d4b87d','#8ec5c1','#d98779','#ada6d7','#a2bf8b'];
  const letters='ABCDE';
  const range=n=>Array.from({length:n},(_,i)=>i);
  const rand=n=>Math.floor(Math.random()*n);
  function shuffle(values){const a=values.slice();for(let i=a.length-1;i>0;i--){const j=rand(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
  const seed=()=>({done:false,score:0,miss:0,log:''});
  const btn=(id,label,on=false)=>'<button class="choice" data-act="'+id+'"'+(on?' aria-pressed="true" style="outline:2px solid #cdb580"':'')+'>'+label+'</button>';
  const tools=(...buttons)=>'<div class="actions">'+buttons.join('')+'</div>';
  const grid=(n,items)=>'<div style="display:grid;grid-template-columns:repeat('+n+',minmax(0,1fr));gap:4px;max-width:350px;margin:12px auto">'+items.join('')+'</div>';
  const sq=(id,label,fill='',desc='')=>'<button data-act="'+id+'" aria-label="'+desc+'" style="padding:2px;aspect-ratio:1;min-width:0;line-height:1;border:1px solid #6d736a;border-radius:5px;'+(fill?'background:'+fill+';color:#171f26;':'')+'">'+label+'</button>';
  const panel=(title,body,foot='')=>'<div class="board"><b>'+title+'</b>'+body+(foot?'<p class="caption">'+foot+'</p>':'')+'</div>';
  const svg=(inner,box='0 0 64 64')=>'<svg aria-hidden="true" focusable="false" viewBox="'+box+'" style="width:100%;height:100%;max-height:210px;display:block">'+inner+'</svg>';
  const win=(s,msg)=>{s.done=true;s.score=Math.max(40,100-8*s.miss);s.log=msg};
  const idx=(key,prefix,max)=>{const m=String(key).match(new RegExp('^'+prefix+'([0-9]+)$'));if(!m)return -1;const n=Number(m[1]);return n<max?n:-1};

  function ringArt(a){
    let art='<rect x="4" y="4" width="192" height="192" rx="16" fill="#202a31" stroke="#82775f"/>';
    for(let i=0;i<3;i++){const r=76-i*20,angle=a[i]*60;
      art+='<circle cx="100" cy="100" r="'+r+'" stroke="'+colors[i]+'" stroke-width="12" fill="none" opacity=".55"/>';
      for(let n=0;n<6;n++){art+='<path d="M100 '+(94-r)+'v10" transform="rotate('+n*60+' 100 100)" stroke="#192223" stroke-width="2"/>'}
      art+='<path d="M100 '+(90-r)+'l6 9 -6 6 -6 -6z" transform="rotate('+angle+' 100 100)" fill="'+colors[i]+'" stroke="#101a1d" stroke-width="2"/>';
    }
    art+='<path d="M94 12h12l-6 9z" fill="#e6d9ab"/><circle cx="100" cy="100" r="8" fill="#d4b87d"/>';
    return svg(art,'0 0 200 200');
  }
  games.vault={
    name:'생활동 비밀금고',rule:'비밀금고 장면을 세 겹의 회전 장치로 재구성했습니다. 손잡이를 누르면 해당 고리와 바로 안쪽 고리가 시계 방향으로 한 칸 돕니다. 세 마름모를 모두 12시에 모아 잠금을 푸세요.',
    start(){return {...seed(),rings:[1+rand(5),rand(6),rand(6)],moves:0}},
    view(s){return panel('세 겹의 황동 잠금쇠',ringArt(s.rings)+tools(...['바깥 고리','가운데 고리','안쪽 고리'].map((v,i)=>btn('r'+i,v))))},
    act(s,k){const i=idx(k,'r',3);if(s.done||i<0)return;s.rings[i]=(s.rings[i]+1)%6;if(i<2)s.rings[i+1]=(s.rings[i+1]+1)%6;s.moves++;s.log='고리가 한 칸 움직였습니다.';if(s.rings.every(n=>n===0)){win(s,'세 표식이 만났습니다. 비밀금고가 열립니다.');s.score=Math.max(60,100-Math.max(0,s.moves-12)*2)}}
  };

  // Each digit denotes one physical piece. Flattening only defines its outline and the target well.
  const square=['0011','0213','2213','2333'];
  const symmetric=['.000.','30111','33221','.322.','..2..'];
  function tileData(rows){
    let groups=[];const mask=[];
    rows.forEach((r,y)=>[...r].forEach((ch,x)=>{mask.push(ch!=='.');if(ch!=='.')(groups[+ch]||=[]).push([x,y])}));
    return {width:rows[0].length,height:rows.length,mask,shapes:groups.map(normalize)};
  }
  function normalize(shape){let x=Math.min(...shape.map(p=>p[0])),y=Math.min(...shape.map(p=>p[1]));return shape.map(([a,b])=>[a-x,b-y])}
  function oriented(shape,r){let pts=shape;for(let i=0;i<r;i++)pts=normalize(pts.map(([x,y])=>[-y,x]));return pts}
  function mini(shape,color){const w=Math.max(...shape.map(v=>v[0]))+1,h=Math.max(...shape.map(v=>v[1]))+1;return svg(shape.map(([x,y])=>'<rect x="'+(x*12+1)+'" y="'+(y*12+1)+'" width="11" height="11" rx="2" fill="'+color+'"/>').join(''),'0 0 '+w*12+' '+h*12)}
  function tiles(name,rows,symmetricMode){const d=tileData(rows);
    return {name,rule:symmetricMode?'조각을 모두 이어 세로축 양쪽이 대칭인 문장을 만드세요. 이 판은 새로 설계한 날개 모양 틀을 사용합니다. 조각을 고른 뒤 ↻로 돌리고 틀을 눌러 놓으세요.':'흩어진 피스를 돌려 정사각형 틀을 채우세요. 모바일용으로 새로 설계한 네 조각입니다. 조각을 고른 뒤 틀을 누르면 조각의 첫 줄에서 가장 왼쪽 칸이 그 자리에 놓입니다.',
      start(){return {...seed(),pick:0,rots:d.shapes.map(()=>rand(4)),board:d.mask.map(()=>-1)}},
      view(s){
        const choices=d.shapes.map((shape,i)=>btn('p'+i,'<span style="display:inline-block;width:32px;height:32px;vertical-align:middle">'+mini(oriented(shape,s.rots[i]),colors[i])+'</span> '+letters[i],s.pick===i));
        const board=d.mask.map((active,n)=>active?sq('c'+n,s.board[n]<0?'·':letters[s.board[n]],s.board[n]<0?'':colors[s.board[n]],(1+Math.floor(n/d.width))+'행 '+(1+n%d.width)+'열 '+(s.board[n]<0?'빈칸':letters[s.board[n]])):'<span></span>');
        return panel(symmetricMode?'거울 날개 문장':'봉인석의 빈틀',grid(d.width,board)+tools(...choices)+tools(btn('rotate','↻ 90° 회전'),btn('clear','모두 꺼내기')),'조각 첫 줄의 맨 왼쪽 칸을 놓을 위치를 누르세요. 놓인 조각을 누르면 꺼냅니다.');
      },
      act(s,k){if(s.done)return;const p=idx(k,'p',d.shapes.length);if(p>=0){s.pick=p;s.log=letters[p]+' 조각을 선택했습니다.';return}
        if(k==='clear'){s.board.fill(-1);s.log='조각을 꺼냈습니다.';return}
        if(k==='rotate'){s.rots[s.pick]=(s.rots[s.pick]+1)%4;s.log='미리보기 조각을 돌렸습니다.';return}
        const n=idx(k,'c',d.mask.length);if(n<0||!d.mask[n])return;
        if(s.board[n]>=0){s.pick=s.board[n];s.board=s.board.map(v=>v===s.pick?-1:v);s.log=letters[s.pick]+' 조각을 꺼냈습니다.';return}
        const x=n%d.width,y=Math.floor(n/d.width),shape=oriented(d.shapes[s.pick],s.rots[s.pick]);
        const anchor=Math.min(...shape.filter(([,b])=>b===0).map(([a])=>a));
        const cells=shape.map(([a,b])=>[a+x-anchor,b+y]);
        if(cells.some(([a,b])=>a<0||a>=d.width||b>=d.height||!d.mask[b*d.width+a]||(s.board[b*d.width+a]!==-1&&s.board[b*d.width+a]!==s.pick))){s.log='조각이 틀을 벗어나거나 다른 조각과 겹칩니다.';return}
        s.board=s.board.map(v=>v===s.pick?-1:v);cells.forEach(([a,b])=>s.board[b*d.width+a]=s.pick);
        const next=d.shapes.findIndex((_,i)=>!s.board.includes(i));if(next<0)win(s,symmetricMode?'두 날개가 맞닿아 대칭 문장이 완성되었습니다.':'마지막 피스가 꼭 맞습니다. 봉인석을 완성했습니다.');else{s.pick=next;s.log=letters[next]+' 조각을 놓을 차례입니다.'}
      }
    }
  }
  games.piece=tiles('피스 퍼즐',square,false);
  games.symmetry=tiles('대칭 퍼즐',symmetric,true);

  const objects=[
    '<path d="M18 43l-8-22 13 8 9-17 9 17 13-8-8 22zM18 49h28"/>',
    '<path d="M15 19h34M18 21c0 16 27 16 27 0M32 34v13m-10 2h21"/>',
    '<circle cx="23" cy="25" r="9"/><path d="M30 32l18 18m-6-6 6-6m-10 2 4-4"/>',
    '<path d="M13 45h38L34 13zM34 13v32M32 11l13 6-13 3"/>',
    '<path d="M14 43l7-24 11-6 11 6 7 24-18 9zM21 19l11 29 11-29M14 43h36"/>',
    '<circle cx="32" cy="31" r="19"/><path d="M32 31l-4-12m4 12 12 5M27 8h10"/>',
    '<path d="M16 49l26-33 9-4-2 11-26 32m0-10-8-6m15 1-8-5"/>',
    '<path d="M13 48l9-8V28c0-15 20-15 20 0v12l9 8zM28 52h8"/>',
    '<path d="M12 44l20-30 20 30-20 8zM32 14v38M12 44l20-8 20 8"/>',
    '<path d="M17 13h30m-27 0c0 16 12 17 12 19s-12 6-12 19m24-38c0 16-12 17-12 19s12 6 12 19M17 52h30"/>',
    '<path d="M14 43q7-14 18-14t18 14M14 43h36M32 29V14m-6 6 6-6 6 6"/>',
    '<path d="M18 48h28l-3-8H21zM22 39l4-14h12l4 14M25 24l-4-10h22l-4 10z"/>'
  ];
  function engraving(n){
    return svg('<path d="M5 22V6h16m38 36v16H43" fill="none" stroke="#8c8065" opacity=".55"/><g fill="none" stroke="'+colors[n%5]+'" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round">'+objects[n]+'</g>');
  }
  games.difference={
    name:'달라진 그림 찾기',rule:'진열장의 소품을 기억한 뒤 덮개를 닫으세요. 다시 열린 진열장에서 모양이 달라진 세 칸을 고릅니다. 이 판의 판화와 배치는 새로 만들었습니다.',
    start(){let initial=shuffle(range(12)).slice(0,9),changed=shuffle(range(9)).slice(0,3),after=initial.slice(),spare=range(12).filter(i=>!initial.includes(i));changed.forEach((i,j)=>after[i]=spare[j]);return {...seed(),initial,changed,after,closed:false,found:[]}},
    view(s){const indices=s.closed?s.after:s.initial;let items=indices.map((v,i)=>sq('d'+i,engraving(v),s.found.includes(i)?'#35564e':'',Math.floor(i/3)+1+'행 '+(i%3+1)+'열 소품'));return panel(s.closed?'바뀐 자리 '+s.found.length+' / 3':'기억할 진열장',grid(3,items)+(s.closed?'':tools(btn('cover','덮개 닫고 시작'))))},
    act(s,k){if(s.done)return;if(k==='cover'&&!s.closed){s.closed=true;s.log='세 점의 소품이 바뀌었습니다.';return}const i=idx(k,'d',9);if(!s.closed||i<0||s.found.includes(i))return;if(!s.changed.includes(i)){s.miss++;s.log='이 자리의 물건은 그대로입니다.';return}s.found.push(i);s.log='달라진 소품을 발견했습니다.';if(s.found.length===3)win(s,'세 개의 바뀐 자리를 모두 찾아냈습니다.')}
  };
  games.code={
    name:'비밀 코드',rule:'이 판에서는 1~6 중 서로 다른 숫자 세 개로 비밀 코드를 만듭니다. 자릿수까지 맞춘 개수와 숫자만 맞춘 개수를 비교해 여섯 번 안에 해독하세요.',
    start(){return {...seed(),key:shuffle(range(6).map(n=>n+1)).slice(0,3),guess:[],history:[]}},
    view(s){return panel('세 자리의 암호', '<div class="stat" style="text-align:center;letter-spacing:.4em;padding:14px;font:600 30px monospace">'+range(3).map(i=>s.guess[i]||'·').join(' ')+'</div>'+tools(...range(6).map(i=>btn('n'+i,i+1,s.guess.includes(i+1))))+tools(btn('back','한 칸 지우기'),btn('test','코드 판정'))+
        (s.history.length?'<table style="width:100%;text-align:center"><thead><tr><th>시도</th><th>자리 일치</th><th>숫자만</th></tr></thead><tbody>'+s.history.map(h=>'<tr><td>'+h.g.join('　')+'</td><td>'+h.exact+'</td><td>'+h.rest+'</td></tr>').join('')+'</tbody></table>':''))},
    act(s,k){if(s.done)return;const i=idx(k,'n',6);if(i>=0){if(s.guess.length<3&&!s.guess.includes(i+1))s.guess.push(i+1);return}if(k==='back'){s.guess.pop();return}if(k!=='test')return;if(s.guess.length!==3){s.log='서로 다른 숫자 세 자리를 채워 주세요.';return}
      const g=s.guess.slice(),exact=g.filter((v,j)=>v===s.key[j]).length,rest=g.filter(v=>s.key.includes(v)).length-exact;s.history.push({g,exact,rest});s.guess=[];
      if(exact===3)win(s,'해독한 코드는 '+g.join('')+'입니다.');else if(s.history.length===6){s.done=true;s.score=0;s.log='암호가 잠겼습니다. 정답은 '+s.key.join('')+'입니다.'}else{s.miss++;s.log='자리 일치 '+exact+'개 · 숫자만 일치 '+rest+'개'}
    }
  };
  const loops=[
    [0,1,2,7,8,9,14,13,18,17,22,21,16,11,10,5,0],
    [1,2,3,8,9,14,19,18,17,22,21,16,15,10,11,6,1],
    [0,1,6,7,2,3,8,13,14,19,18,23,22,21,16,11,10,5,0]
  ];
  const edge=(a,b)=>a<b?a+'-'+b:b+'-'+a;
  function counts(path){const es=new Set(path.slice(1).map((n,i)=>edge(path[i],n)));return range(16).map(i=>{const n=Math.floor(i/4)*5+i%4;return [[n,n+1],[n,n+5],[n+1,n+6],[n+5,n+6]].filter(([a,b])=>es.has(edge(a,b))).length})}
  games.fence={
    name:'울타리 치기',rule:'점 하나를 골라 시작하고 이웃한 점을 차례로 누르세요. 각 숫자는 그 칸을 둘러싼 네 변 중 울타리가 놓일 변의 수입니다. 교차 없이 한 바퀴 돌아 출발점을 누르면 검산합니다.',
    start(){let loop=loops[rand(loops.length)].slice();for(let n=rand(4);n>0;n--)loop=loop.map(i=>(i%5)*5+4-Math.floor(i/5));return {...seed(),clues:counts(loop),path:[]}},
    view(s){let art='';range(5).forEach(i=>{const n=25+i*50;art+='<path d="M25 '+n+'H225M'+n+' 25V225" stroke="#74817d" stroke-width="1" stroke-dasharray="2 4"/>'});
      s.clues.forEach((n,i)=>art+='<text x="'+(50+i%4*50)+'" y="'+(57+Math.floor(i/4)*50)+'" text-anchor="middle" fill="#d7c8a0" font-size="20">'+n+'</text>');
      if(s.path.length)art+='<polyline fill="none" stroke="#dfaf65" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" points="'+s.path.map(i=>(25+i%5*50)+','+(25+Math.floor(i/5)*50)).join(' ')+'"/>';
      const dots=range(25).map(i=>'<button aria-label="'+(Math.floor(i/5)+1)+'행 '+(i%5+1)+'열 점" data-act="v'+i+'" style="touch-action:manipulation;position:absolute;left:'+((i%5)*20)+'%;top:'+(Math.floor(i/5)*20)+'%;width:20%;height:20%;min-width:0;padding:0;border:0;background:transparent;display:grid;place-items:center;color:'+(i===s.path[0]?'#efca82':'#8fa49d')+'"><span style="display:block;width:12px;height:12px;border:2px solid currentColor;background:'+(s.path.includes(i)?'#d6ab71':'#263034')+';border-radius:50%"></span></button>').join('');
      return panel('하나의 닫힌 울타리','<div style="position:relative;aspect-ratio:1;max-width:325px;margin:8px auto"><svg viewBox="0 0 250 250" aria-hidden="true" style="width:100%;display:block">'+art+'</svg>'+dots+'</div>'+tools(btn('undo','한 점 되돌리기'),btn('clear','선 지우기')));
    },
    act(s,k){if(s.done)return;if(k==='undo'){s.path.pop();s.log='마지막 점을 되돌렸습니다.';return}if(k==='clear'){s.path=[];s.log='시작점을 골라 주세요.';return}const i=idx(k,'v',25);if(i<0)return;const last=s.path[s.path.length-1];if(last!==undefined&&Math.abs(i%5-last%5)+Math.abs(Math.floor(i/5)-Math.floor(last/5))!==1){s.log='끝점과 이웃한 점을 골라 주세요.';return}
      if(i===s.path[0]&&s.path.length>=4){const test=s.path.concat(i),clues=counts(test),errors=clues.filter((v,j)=>v!==s.clues[j]).length;
        if(!errors){s.path=test;win(s,'단 한 줄의 울타리가 모든 숫자와 일치합니다.')}else{s.miss++;s.log='숫자가 맞지 않는 칸이 '+errors+'개 있습니다. 선을 되돌려 보세요.'}return}
      if(s.path.includes(i)){s.log='울타리는 자기를 가로지를 수 없습니다.';return}s.path.push(i);s.log=s.path.length===1?'이웃 점을 골라 선을 이으세요.':'이은 변 '+(s.path.length-1)+'개';
    }
  };

  const glyphs=['해','달','새','눈','연다','가린다','깨운다'];
  // Original hieroglyphs share a baseline. Predicates carry the two marks above their root.
  const strokes=['<circle cx="32" cy="31" r="12"/><path d="M32 10v5m21 16h-5m-16 21v-5M11 31h5"/>','<path d="M42 13a19 19 0 1 0 4 34c-18-1-24-20-4-34z"/>','<path d="M10 42l15-18 9 9 10-13 12 6-10 2-7 12-15 6z"/>','<path d="M8 32q24-27 48 0-24 27-48 0z"/><circle cx="32" cy="32" r="5"/>','<path d="M16 49V22h28v27M25 47V30l12-4v20z"/>','<path d="M12 40l20-19 20 19M15 44h34"/>','<path d="M11 42l10-13 9 12 12-18 11 14"/>'];
  const glyphArt=i=>svg('<g fill="none" stroke="'+colors[i%5]+'" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round">'+strokes[i]+(i>3?'<path d="M26 11h2m8 0h2"/>':'')+'</g>');
  const phrases=[[1,5,0],[2,6,0],[0,4,3],[1,4,3],[0,6,2],[2,5,1]];
  const phraseText=a=>glyphs[a[0]]+' → '+glyphs[a[2]]+' → '+glyphs[a[1]];
  games.glyph={
    name:'유배지 암호 풀이',rule:'벽화의 어순은 주체·동작·대상입니다. 새로 새긴 일곱 상형문자를 대조해서 세 문장을 읽으세요. 선택지는 주체 → 대상 → 동작 순서입니다.',
    start(){return {...seed(),order:shuffle(range(phrases.length)).slice(0,3),turn:0}},
    view(s){const answer=s.order[s.turn]??0;
      const dict=glyphs.map((g,i)=>'<div style="text-align:center"><div style="width:36px;height:36px;margin:auto">'+glyphArt(i)+'</div><small>'+g+'</small></div>').join('');
      const strip=phrases[answer].map(i=>'<div style="width:60px;height:60px">'+glyphArt(i)+'</div>').join('');
      return panel('벽화 해독 '+Math.min(3,s.turn+1)+' / 3','<div style="display:flex;justify-content:center;background:#273133;border-radius:6px">'+strip+'</div><div style="display:flex;justify-content:center;flex-wrap:wrap;gap:5px">'+dict+'</div>'+tools(...range(phrases.length).filter(i=>i===answer||i===(answer+2)%6||i===(answer+5)%6).map(i=>btn('g'+i,phraseText(phrases[i])))));
    },
    act(s,k){const i=idx(k,'g',6);if(s.done||i<0)return;if(i!==s.order[s.turn]){s.miss++;s.log='어순을 다시 보세요. 두 점이 붙은 표식이 동작입니다.';return}if(++s.turn===3)win(s,'세 줄의 벽화를 모두 읽었습니다.');else s.log='해독 성공. 다음 문양이 드러납니다.'}
  };
  function magic(){
    const side=7,board=Array(49).fill(0);let x=3,y=0;
    for(let v=1;v<=49;v++){board[y*side+x]=v;let nx=(x+1)%side,ny=(y+side-1)%side;
      if(board[ny*side+nx])y=(y+1)%side;else{x=nx;y=ny}}
    return board;
  }
  const magicLines=[...range(7).map(y=>range(7).map(x=>y*7+x)),...range(7).map(x=>range(7).map(y=>y*7+x)),range(7).map(i=>i*8),range(7).map(i=>(i+1)*6)];
  games.trial={
    name:'신의 시험',rule:'10화까지의 단서에서 착안한 독자 마방진입니다. 황동 숫자를 골라 빈칸에 놓고, 가로·세로·두 대각선의 합을 모두 175로 맞추세요. 놓은 칸을 누르면 숫자를 회수합니다.',
    start(){let full=magic();if(rand(2))full=full.reverse();const holes=shuffle(range(49).filter(i=>full[i]!==1)).slice(0,10).sort((a,b)=>a-b);return {...seed(),holes,board:full.map((v,i)=>holes.includes(i)?0:v),pool:holes.map(i=>full[i]).sort((a,b)=>a-b),selected:null}},
    view(s){const available=s.pool.filter(v=>!s.board.includes(v));const make=(v,i)=>s.holes.includes(i)?sq('h'+i,v||'·',v?colors[1]:'',(1+Math.floor(i/7))+'행 '+(1+i%7)+'열 '+(v||'빈칸')):'<span style="display:grid;place-items:center;font-size:clamp(12px,3vw,17px);color:#bcbcb5">'+v+'</span>';
      return panel('일곱 줄의 봉인',grid(7,s.board.map(make))+tools(...available.map(v=>btn('t'+v,v,s.selected===v)),btn('sum','검산')),'먼저 빈칸이 하나뿐인 줄에서 나머지 여섯 수를 더해 보세요.');
    },
    act(s,k){if(s.done)return;const p=idx(k,'t',50);if(p>0&&s.pool.includes(p)&&!s.board.includes(p)){s.selected=p;s.log=p+'을 놓을 칸을 고르세요.';return}const h=idx(k,'h',49);if(h>=0&&s.holes.includes(h)){if(s.selected!==null){s.board[h]=s.selected;s.selected=null}else if(s.board[h]){s.selected=s.board[h];s.board[h]=0}return}
      if(k!=='sum')return;if(s.board.includes(0)){s.log='빈칸에 숫자를 모두 놓은 뒤 검산하세요.';return}const wrong=magicLines.filter(line=>line.reduce((sum,i)=>sum+s.board[i],0)!==175);if(wrong.length){s.miss++;s.log=wrong.length+'개 줄의 합이 175와 다릅니다.'}else win(s,'열여섯 줄의 합이 일치합니다. 봉인이 풀렸습니다.')}
  };
})();
