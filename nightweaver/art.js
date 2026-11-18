/* Original copperplate rooftop landscape. Coordinates use a 1000 × 560 stage. */
(() => {
  'use strict';

  const WIDTH = 1000, HEIGHT = 560;
  let plates = new Map();
  function randomSource(seed) {
    let n = seed >>> 0;
    return () => {
      n = (Math.imul(1664525, n) + 1013904223) >>> 0;
      return n / 4294967296;
    };
  }

  function engrave(chapter, resolution) {
    const paper = document.createElement('canvas');
    paper.width = WIDTH * resolution;
    paper.height = HEIGHT * resolution;
    const ctx = paper.getContext('2d');
    ctx.scale(resolution, resolution);
    const rand = randomSource(19277);
    const range = (a,b) => a + (b-a)*rand();
    const poly = (points, ink) => {
      ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(...points[0]);
      for (let i=1; i<points.length; i++) ctx.lineTo(...points[i]);
      ctx.closePath(); ctx.fill();
    };
    const line = (points, ink, weight=1) => {
      ctx.beginPath(); ctx.strokeStyle = ink; ctx.lineWidth = weight; ctx.moveTo(...points[0]);
      for (let i=1; i<points.length; i++) ctx.lineTo(...points[i]);
      ctx.stroke();
    };
    const ellipse = (x,y,rx,ry,ink) => {
      ctx.fillStyle=ink; ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2); ctx.fill();
    };
    const rect = (x,y,w,h,ink) => {ctx.fillStyle=ink;ctx.fillRect(x,y,w,h);};
    const sky = ctx.createLinearGradient(0,0,0,410);
    const colours = chapter===2 ? ['#393445','#60515d','#be8c7c','#e0b68e'] :
      chapter===1 ? ['#183539','#335856','#819382','#a4997a'] :
      ['#11272d','#2d4b4c','#71817a','#9f9682'];
    [0,.47,.82,1].forEach((stop,i)=>sky.addColorStop(stop,colours[i]));
    rect(0,0,WIDTH,HEIGHT,sky);

    // Tiny etched stars and constellations. Their scale drops towards the horizon.
    for(let i=0; i<355; i++) {
      const x=range(0,1000), y=range(0,240), size=range(.32,1.0)*(1-.45*y/240);
      ellipse(x,y,size,size,'rgba(224,226,189,'+range(.25,.82)+')');
      if(i%43===0&&y<150) {
        line([[x-2.5,y],[x+2.5,y]],'#8eaaa0',.5);
        line([[x,y-3.5],[x,y+3.5]],'#cccbab',.55);
      }
    }

    // A weathered full moon printed in pale gold, with a stippled halo.
    const mx=chapter===2?800:782,my=chapter===2?217:94,mr=chapter===2?47:41;
    const halo=ctx.createRadialGradient(mx,my,34,mx,my,114);
    halo.addColorStop(0,'rgba(242,224,158,.19)'); halo.addColorStop(.52,'rgba(228,222,172,.06)');halo.addColorStop(1,'rgba(225,217,167,0)');
    rect(mx-115,my-115,230,230,halo);
    for(let ring=0;ring<3;ring++) {
      ctx.strokeStyle='rgba(215,214,175,'+(0.16-ring*.036)+')'; ctx.lineWidth=.48;
      ctx.beginPath();ctx.arc(mx,my,mr+4+ring*5.5,0,Math.PI*2);ctx.stroke();
    }
    const lunar=ctx.createLinearGradient(mx-30,my-20,mx+36,my+30);
    lunar.addColorStop(0,chapter===2?'#ffdfae':'#ffebbd');lunar.addColorStop(1,chapter===2?'#efa675':'#dfcea1');
    ellipse(mx,my,mr,mr,lunar);
    ctx.save();ctx.beginPath();ctx.arc(mx,my,mr-.3,0,Math.PI*2);ctx.clip();
    for(let i=0;i<1050;i++){
      const x=range(-41,41),y=range(-41,41);
      const mare=Math.sin(.11*x+.04*y)+Math.cos(.19*y-.08*x);
      if(mare>.6 || rand()<.14) line([[mx+x,my+y],[mx+x+range(.4,2.8),my+y-.3]],'rgba(96,111,83,'+range(.08,.24)+')',range(.34,.9));
    }
    for(let i=0;i<25;i++){
      let x=mx+range(-40,40),y=my+range(-40,40),r=range(.6,3.4);
      ctx.strokeStyle='rgba(120,128,95,.20)';ctx.lineWidth=.6;ctx.beginPath();ctx.arc(x,y,r,1,5);ctx.stroke();
    }
    ctx.restore();

    // Long ribbons like dry brush marks on a print.
    function cloud(x,y,w,h) {
      for(let j=0;j<22;j++) {
        const f=j/22, left=x+w*(.05+.18*Math.sin(4*f)) + range(0,8);
        const length=w*(.2+.73*Math.sin(f*Math.PI))*range(.65,1);
        const yy=y+h*f;
        ctx.beginPath(); ctx.moveTo(left,yy);ctx.bezierCurveTo(left+length*.3,yy-2,left+length*.5,yy+1,left+length,yy-2);
        ctx.strokeStyle='rgba(180,193,169,'+range(.05,.16)+')';ctx.lineWidth=range(.35,.9);ctx.stroke();
      }
    }
    cloud(-35,86,235,17);cloud(210,118,180,12);cloud(530,41,176,11);cloud(730,112,246,17);cloud(856,176,200,12);

    const hill=(x,y,phase,amp)=>y+amp*(.52*Math.sin(x*.010+phase)+.28*Math.sin(x*.027+phase)+.2*Math.sin(x*.071+phase));
    function ridge(y,amp,phase,fill,scratch) {
      let pts=[];
      for (let x=-3;x<1005;x+=4)pts.push([x,hill(x,y,phase,amp)]);
      poly([...pts,[1005,425],[-3,425]],fill);
      for(let k=0;k<2900;k++) {
        const x=range(0,1000), edge=hill(x,y,phase,amp), py=edge+range(2,80);
        const len=range(.7,7); line([[x,py],[x-len,py+len*.61]],scratch,range(.35,.65));
      }
    }
    ridge(236,33,1.1,chapter===2?'#998083':'#647b76','rgba(170,184,155,.21)');
    ridge(265,42,3.3,chapter===2?'#756671':'#486462','rgba(157,172,148,.21)');

    function house(x, ground, w, h, depth, kind) {
      const base=ground-h;
      const isNear=depth===2;
      const wall=['#496460','#304c4c','#243e40'][depth];
      const wallSide=['#415b58','#284344','#1b3336'][depth];
      const tile=['#415a58','#263f40','#1a3034'][depth];
      const lit=['#849789','#739084','#698479'][depth];
      const shadow=['#3b5554','#203c3d','#142c30'][depth];
      const eave=base+range(8,13), split=x+w*.72, peak=x+w*range(.37,.61), peakY=base-range(w*.16,w*.27);
      poly([[x,base],[split,base-1],[split,ground],[x,ground]],wall);
      poly([[split,base-1],[x+w,base+2],[x+w,ground],[split,ground]],wallSide);
      // A chimney and its stone courses.
      if(w>45&&kind%3!==0) {
        const cx=x+w*.7,cy=base-w*.4, cw=w*.07+1.2;
        rect(cx,cy,cw,w*.42,wallSide);rect(cx-1,cy-2,cw+2,3,tile);
        line([[cx,cy+2],[cx,base]],lit,.6);
      }
      for(let i=0;i<w*.7;i++){
        const xx=x+range(0,w),yy=range(eave,ground);
        line([[xx,yy],[xx+range(.5,2.6),yy-.3]],'rgba(157,170,143,.13)',.6);
      }
      const wy=eave+(ground-eave)*.22, height=Math.max(2,Math.min((ground-wy)*.45,8)), step=isNear?10:7;
      for(let xx=x+4;xx<x+w-5;xx+=step){
        const warm=rand()<(isNear?.24:.18);
        rect(xx-.8,wy-.8,step*.48+1.6,height+1.6,shadow);
        rect(xx,wy,step*.48,height,warm?(rand()<.5?'#c5a371':'#bda987'):wallSide);
        if(warm){rect(xx+step*.21,wy,.8,height,wallSide);rect(xx,wy+height*.44,step*.48,.7,wallSide);}
      }
      const start=[x-w*.09,base+.6], end=[x+w*1.09,base+.8];
      if(kind%4!==0) {
        // Korean tile roof with curved tips, individual tile ribs and exposed rafters.
        const roofY=(t)=> {
          const p=(peak-x)/w;
          if(t<p){const a=(t+.09)/(p+.09);return base+4*Math.sin(a*Math.PI)-a*(base-peakY);}
          const a=(t-p)/(1.09-p);return peakY+(base-peakY)*a+4*Math.sin(a*Math.PI);
        };
        let roof=[];
        for(let t=-.09;t<=1.091;t+=.02)roof.push([x+w*t,roofY(t)]);
        const bottom=t=>base+1+Math.sin((t+.09)*Math.PI/1.18)*w*.078;
        for(let t=1.09;t>=-.09;t-=.02)roof.push([x+w*t,bottom(t)]);
        poly(roof,tile);
        for(let t=-.055;t<=1.075;t+=2.9/w) {
          const xx=x+w*t, top=roofY(t);
          line([[xx,top+.5],[xx+(t-.5)*2,bottom(t)]],lit,.4);
        }
        const lip=[];
        for(let t=-.09;t<1.092;t+=.05)lip.push([x+w*t,bottom(t)]);
        line(lip,shadow,2.1);line(lip,lit,.55);
        line([start,[peak,peakY],end],lit,.44);
      } else {
        poly([[x-2,base],[x+w*.5,peakY-2],[x+w+2,base],[x+w+2,base+2],[x-2,base+2]],tile);
        line([[x-2,base],[x+w*.5,peakY-2],[x+w+2,base]],lit,.7);
      }
    }

    // Temple ridge and a weathered square bell tower on distant slopes.
    function tower(x,y,k) {
      ctx.save();ctx.translate(x,y);ctx.scale(k,k);
      rect(-8,-22,16,22,'#344f50');rect(-5,-55,10,33,'#395457');
      for(let t=0;t<3;t++){
        const yy=-26-t*14,ww=23-t*5;
        poly([[-ww,yy-3],[-ww*.52,yy-4],[0,yy-14],[ww*.55,yy-4],[ww,yy-3],[ww-2,yy],[-ww+2,yy]],'#304b4c');
        line([[-ww,yy-3],[-ww*.52,yy-4],[0,yy-14],[ww*.55,yy-4],[ww,yy-3]],'#85988a',.65);
      }
      line([[0,-62],[0,-74]],'#365254',1);ellipse(0,-71,1.5,1.5,'#365254');
      ctx.restore();
    }
    tower(165,263,.92);tower(640,247,.55);
    const rows=[[0,304,14,35],[1,341,25,58],[2,394,45,87]];
    for(const [depth,ground,min,max] of rows) {
      let x=-25;
      for(let i=0;x<1020;i++) {
        const width=range(min,max), gy=ground+Math.sin(x*.012+depth*2)*14+range(-6,6);
        house(x,gy,width,range(12+depth*4,22+depth*12),depth,Math.floor(rand()*10));
        // The distant streets settle into a shaded ink wash underneath the eaves.
        rect(x,gy-.3,width+.4,Math.max(0,411-gy),['#445e5c','#2d4849','#233b3f'][depth]);
        x+=width*range(.84,.99);
      }
    }

    if (chapter===1) {
      // Fernery at night: wide central bay, opal glass and thin iron glazing bars.
      const metal='#263e3e', glint='#96a896';
      const arch=(x,y,rise,ink,weight)=>{
        ctx.strokeStyle=ink;ctx.lineWidth=weight;ctx.beginPath();ctx.moveTo(x,y);
        ctx.bezierCurveTo(x,y-110,500,-rise,1000-x,y-110);
        ctx.quadraticCurveTo(1000-x+14,y-50,1000-x,y);ctx.stroke();
      };
      poly([[0,0],[1000,0],[1000,401],[959,401],[959,130],[888,64],[722,0],[270,0],[90,66],[40,137],[40,397],[0,397]],'rgba(97,145,123,.14)');
      arch(40,244,172,metal,8);arch(42,245,168,glint,.9);
      for (const sx of [40,958]) {
        rect(sx-4,172,8,225,metal);line([[sx-2,172],[sx-2,397]],glint,.9);
        rect(sx-12,378,24,19,'#273f3d');
      }
      const rib=x=>{
        const y=7+Math.pow(Math.abs(x-500)/480,2)*94;
        line([[x+22,-4],[x,y],[x-5,y+110]],'rgba(51,78,73,.53)',1.8);
        line([[x+23,-3],[x+1,y],[x-4,y+109]],'rgba(176,192,159,.3)',.5);
      };
      [105,218,338,462,582,698,811,905].forEach(rib);
      for(let i=0;i<56;i++){
        const x=range(0,1000), y=range(0,95);
        if(rand()>.46)line([[x,y],[x+range(3,17),y-5]],'rgba(198,221,187,.17)',.65);
        else ellipse(x,y,range(.5,1.3),range(.8,1.6),'rgba(225,224,165,.48)');
      }
      const vine=(originX,originY,drift,length)=>{
        let x=originX,y=originY, pts=[[x,y]];
        const phase=range(0,6);
        for(let j=1;j<=length;j+=4){
          x=originX+drift*j+Math.sin(j*.055+phase)*6;y=originY+j;
          pts.push([x,y]);
          if(j%12===1){
            const sign=Math.floor(j/12)%2?-1:1,tipX=x+sign*range(5,14),tipY=y+range(5,14);
            poly([[x,y],[tipX,y+1],[tipX+sign*2,tipY],[x+sign*2,y+5]],rand()>.4?'#35574a':'#416650');
            line([[x,y],[tipX,tipY]],'rgba(171,182,131,.33)',.65);
            if(rand()<.34)ellipse(tipX,tipY+1,1,1.5,'#d2bf87');
          }
        }
        line(pts,'#345449',1.3);
      };
      for(let i=0;i<32;i++){
        const side=i%2===0; const x=side?range(0,202):range(842,1000);
        vine(x,range(-18,7),side?.17:-.17,range(24,side?114:92));
      }
    } else if(chapter===2) {
      // Shadow of a tiled portico frames the morning sky.
      const lip=x=>26+29*Math.pow(Math.abs(x-510)/510,1.7)+4*Math.sin(x*.011);
      for(const side of [0,1]){
        ctx.save();if(side){ctx.translate(1000,0);ctx.scale(-1,1);}
        const eaves=[[0,0],[270,0]];
        for(let x=270;x>=0;x-=4)eaves.push([x,lip(x)*(1-x/270)]);
        poly(eaves,'#302f37');
        for(let x=4;x<254;x+=12){
          const yy=lip(x)*(1-x/270);
          line([[x,0],[x-6,yy]],'#655253',1.1);
          ellipse(x-4,yy-1.4,4.4,2.4,'#51454a');
          line([[x-7,yy],[x-2,yy+.1]],'#aa7d6b',.8);
        }
        ctx.restore();
      }
      for(let j=0;j<8;j++){
        const x=292+j*19+Math.sin(j)*11, y=92+Math.sin(j*.74)*18-j*3, k=.54+(j%3)*.15;
        ctx.save();ctx.translate(x,y);ctx.scale(k,k);ctx.rotate(Math.sin(j)*.19);
        ctx.beginPath();ctx.moveTo(-11,-4);ctx.quadraticCurveTo(-5,-4,0,0);ctx.quadraticCurveTo(4,-6,12,-6);
        ctx.quadraticCurveTo(5,-3,1,2);ctx.lineTo(-1,4);ctx.lineTo(-.5,1);ctx.quadraticCurveTo(-5,-2,-11,-4);
        ctx.fillStyle='#586066';ctx.fill();ctx.restore();
      }
    }

    // Foreground: a tar-and-tile roof. Keep upper floor lip precisely at 397.
    const apron=ctx.createLinearGradient(0,397,0,560);
    apron.addColorStop(0,'#1a3033');apron.addColorStop(1,'#0b1d25');
    rect(0,397,1000,163,apron);
    line([[0,398],[160,397.6],[330,398.8],[560,397.3],[790,398],[1000,397.5]],'#aa9f7d',2.1);
    line([[0,402],[350,403],[680,401.8],[1000,402.6]],'#081e24',2);
    for(let r=0;r<6;r++){
      const yy=408+r*27;
      for(let k=-1;k<23;k++){
        const x=k*55+(r%2)*27, dy=range(-.8,.8);
        line([[x+3,yy+dy],[x+49,yy+1+dy],[x+55,yy-17+dy]],'rgba(121,148,137,.19)',.8);
        line([[x+4,yy+2+dy],[x+47,yy+3+dy]],'rgba(0,13,20,.5)',1.6);
        for(let j=0;j<4;j++){
          const px=x+range(4,48),py=yy-range(3,19);
          line([[px,py],[px+range(2,11),py+.4]],'rgba(130,153,137,.13)',.6);
        }
      }
    }
    // Soft edge vignette and physical print grain.
    const vignette=ctx.createRadialGradient(500,220,130,500,220,600);
    vignette.addColorStop(0,'rgba(1,12,16,0)');vignette.addColorStop(1,'rgba(1,12,16,.26)');
    rect(0,0,1000,560,vignette);
    for(let i=0;i<17000;i++){
      const x=rand()*1000,y=rand()*560;
      rect(x,y,range(.35,1.28),.6,rand()<.55?'rgba(244,231,188,.07)':'rgba(6,15,21,.13)');
    }
    return paper;
  }

  window.paintCity = (ctx,w,h,time=0,chapter=0) => {
    const factor=window.devicePixelRatio>1?1.5:1;
    const key=chapter+'/'+factor;
    if(!plates.has(key)) plates.set(key,engrave(chapter,factor));
    ctx.save();ctx.scale(w/WIDTH,h/HEIGHT);
    ctx.drawImage(plates.get(key),0,0,WIDTH,HEIGHT);
    // Windblown seeds slowly turn in the moonlight.
    for(let i=0;i<12;i++){
      const x=((i*87.75+time*(2+i%3))%1030)-15;
      const y=173+(i*63)%199+Math.sin(time*.28+i)*4;
      const a=.14+.12*Math.sin(time*.48+i);
      ctx.fillStyle='rgba(241,223,167,'+a+')';
      ctx.fillRect(x,y,1.4,.8);
    }
    ctx.restore();
  };
})();
