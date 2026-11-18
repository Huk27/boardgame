/* Painted in local sprite coordinates. The caller owns the scene transform. */
(() => {
  'use strict';
  const ink = '#141c26', blue = '#243440', featherBlue = '#354750';
  const ivory = '#e0cea5', amber = '#ffbc60', copper = '#bd6743';
  const shapes = new Map();

  function draw(ctx, data, fill, stroke, width = 1) {
    let shape = shapes.get(data);
    if (!shape) {
      shape = new Path2D(data);
      shapes.set(data, shape);
    }
    if (fill) { ctx.fillStyle = fill; ctx.fill(shape); }
    if (stroke) {
      ctx.lineWidth = width;
      ctx.strokeStyle = stroke;
      ctx.lineCap = ctx.lineJoin = 'round';
      ctx.stroke(shape);
    }
  }
  function oval(ctx, x, y, rx, ry, color) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
  function light(ctx, x, y, radius, stops) {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    for (const [position, color] of stops) grad.addColorStop(position, color);
    oval(ctx, x, y, radius, radius, grad);
  }

  function egg(ctx, x, y, time = 0) {
    ctx.save();
    ctx.translate(x, y);
    const pulse = (1 + Math.sin(time * 2.4)) / 2;
    light(ctx, 0, -13, 35 + pulse * 4, [[0,'rgba(255,226,142,.36)'],[.52,'rgba(255,196,97,.13)'],[1,'rgba(255,196,97,0)']]);
    const shell = ctx.createLinearGradient(-8,-23,9,-3);
    shell.addColorStop(0,'#fffce1'); shell.addColorStop(.48,'#f6dd99'); shell.addColorStop(1,'#c69954');
    draw(ctx,'M-10 -10 C-10 -17 -4 -28 0 -28 C5 -28 11 -17 11 -10 C12 4 -10 4 -10 -10Z',shell,'#fff2ba',1.15);
    draw(ctx,'M-5 -18 Q-3 -23 -1 -24 M-7 -12 L-7 -13',null,'#fffbe6',1.5);
    draw(ctx,'M2 -13 l2 2 -2 2 -2 -2Z M5 -7 l1.1 1 -1.1 1 -1 -1Z M-4 -6 l1.1 1 -1.1 1 -1 -1Z','#c09c5a');
    ctx.restore();
  }

  function foot(ctx, phase, walking, rear) {
    ctx.save();
    const wave = walking ? Math.sin(phase) : 0;
    ctx.translate(rear ? -6 : 6,-11);
    ctx.rotate(wave * .48);
    ctx.translate(0,walking ? -Math.max(0,Math.cos(phase)) * 3 : 0);
    draw(ctx,'M0 -1 L-1 5 L1 9 L7 10 M1 9 L-3 11 M1 9 L4 11',null,rear?'#a77f60':'#dfb78b',1.7);
    ctx.restore();
  }

  function bird(ctx,x,y,time = 0,dir = 1,walking = false,carrying = false) {
    ctx.save();
    ctx.translate(x,y);
    ctx.scale(dir < 0 ? -1 : 1,1);
    const phase = time * 13;
    const bob = walking ? -Math.abs(Math.sin(phase)) * 2.5 : Math.sin(time * 2.1) * .65;
    foot(ctx,phase,walking,true);
    foot(ctx,phase+Math.PI,walking,false);
    ctx.translate(0,bob);
    // Three tapered tail feathers form the unmistakable silhouette.
    ctx.save(); ctx.translate(-8,-24); ctx.rotate(Math.sin(time * (walking?8:2.2)) * .055);
    draw(ctx,'M5 7 Q-18 7 -33 -10 L-12 -5 Q-23 -10 -29 -17 Q-15 -10 -4 -8 L-17 -18 Q-3 -12 5 -5Z',blue,ivory,1.1);
    draw(ctx,'M-26 -9 L-6 0 M-18 -10 L-5 -5',null,'#778080',.85);
    ctx.restore();
    draw(ctx,'M-17 -20 Q-19 -31 -10 -37 Q-6 -41 -2 -42 L0 -50 L4 -47 L8 -54 L11 -49 Q24 -48 25 -38 L32 -35 L24 -31 Q24 -17 15 -12 Q7 -7 -4 -10 Q-13 -11 -17 -20Z',ink,ivory,1.55);
    draw(ctx,'M-15 -24 Q-14 -34 -5 -37 Q-10 -28 -9 -21 L-12 -24 L-12 -18Z',blue);
    draw(ctx,'M6 -47 L8 -52 L8 -48 M-1 -43 L1 -48',null,'#f3ddac',.95);
    draw(ctx,'M21 -38 L33 -35 L23 -33Z','#d7a967','#e4c99d',.75);
    draw(ctx,'M22 -34 L30 -35',null,'#6e4c36',.75);
    if ((time + .4) % 4.7 < .14) {
      draw(ctx,'M13 -39 Q16 -37 19 -39',null,amber,1.6);
    } else {
      oval(ctx,16,-40,4.2,4.2,'#765038');
      oval(ctx,16,-40,3.45,3.45,amber);
      oval(ctx,16.8,-40.1,1.8,2.45,ink);
      oval(ctx,17.7,-41.8,.85,.85,'#fff5d7');
    }
    // A split vermilion scarf swings with each footfall.
    ctx.save(); ctx.translate(-3,-31); ctx.rotate(Math.sin(time * (walking?8:2)) * (walking?.16:.045));
    draw(ctx,'M5 1 Q-8 3 -17 2 L-22 7 L-15 6 L-15 10 Q-4 8 7 3Z',copper,'#e5aa73',.75);
    draw(ctx,'M-12 5 L-17 7',null,'#f2b77f',.8);
    ctx.restore();
    draw(ctx,'M-4 -35 Q8 -29 22 -33 L21 -29 Q8 -24 -5 -31Z','#c97a50','#f5be84',.7);
    if (carrying) {
      ctx.save(); ctx.translate(10,-12); ctx.scale(.64,.64); egg(ctx,0,0,time); ctx.restore();
    }
    ctx.save();
    ctx.translate(-6,-28);
    ctx.rotate(carrying ? -.3 : .06 + Math.sin(time*(walking?12:2.1))*.07);
    const wing = carrying ? 'M0 -2 Q9 -3 15 8 L20 7 Q16 16 9 16 Q1 9 -3 5Z' : 'M0 -2 Q11 -5 12 1 Q8 9 -10 15 L-7 10 L-13 11 Q-5 4 0 -2Z';
    draw(ctx,wing,featherBlue,'#9daba1',.95);
    if (carrying) draw(ctx,'M4 1 Q6 8 14 12 M7 0 Q10 6 16 9',null,'#748482',.8);
    else draw(ctx,'M4 2 L-7 11 M8 2 L-2 10',null,'#72847f',.85);
    ctx.restore(); ctx.restore();
  }

  function lamp(ctx,x,y,time = 0) {
    ctx.save(); ctx.translate(x,y);
    light(ctx,0,4,49+Math.sin(time*1.7)*2,[[0,'rgba(255,209,127,.65)'],[.4,'rgba(255,192,88,.2)'],[1,'rgba(255,190,86,0)']]);
    draw(ctx,'M-4 -29 Q-4 -36 0 -36 Q4 -36 4 -29',null,'#d1b591',1.7);
    draw(ctx,'M-5 -29 L5 -29 L7 -21 L3 -18 L-6 -20Z',blue,ivory,.9);
    const glass=ctx.createLinearGradient(-10,-12,12,12);
    glass.addColorStop(0,'#b76b3c'); glass.addColorStop(.38,'#ffc979'); glass.addColorStop(.57,'#fff2bb'); glass.addColorStop(1,'#c17f44');
    draw(ctx,'M-10 -13 L10 -13 L11 7 Q8 14 0 15 Q-9 13 -11 6Z',glass,'#edc182',1.1);
    draw(ctx,'M-10 -14 L-7 8 L-4 13 M9 -13 L6 10 L3 14',null,'#7d5a40',1.15);
    draw(ctx,'M-5 -19 L5 -19 Q13 -16 18 -12 L19 -10 Q0 -6 -19 -10 L-18 -12 Q-12 -14 -5 -19Z',blue,'#e4bc86',1.25);
    draw(ctx,'M-12 -12 Q-4 -11 4 -12 M-1 -18 L-4 -13',null,'#788883',1);
    draw(ctx,'M-6 13 Q0 16 6 13 L4 17 L-4 17Z',ink,ivory,.9);
    ctx.restore();
  }

  function pin(ctx,x,y,time = 0) {
    ctx.save(); ctx.translate(x,y); ctx.rotate(-.08);
    draw(ctx,'M-10 -45 L-4 -45 L3 -17 L-1 -1 L-6 -1 L-3 -18Z','#ab724f',ivory,1);
    draw(ctx,'M4 -46 L9 -45 L4 -19 L10 -3 L6 -1 L-1 -17Z','#d79862','#ecd2a2',1.1);
    draw(ctx,'M5 -41 L2 -26 M-8 -40 L-5 -30 M5 -12 L7 -5',null,'#714939',1);
    oval(ctx,0,-20,4.5,4.5,'#3f4a47'); oval(ctx,0,-20,2.8,2.8,'#bca98a'); oval(ctx,0,-20,1.1,1.1,'#263237');
    draw(ctx,'M-1 -19 L8 -16',null,'#e3c39a',1);
    ctx.restore();
  }

  function pot(ctx,x,y,time = 0) {
    ctx.save(); ctx.translate(x,y);
    draw(ctx,'M-19 -30 L18 -30 L13 -3 Q1 1 -11 -2Z','#aa614c','#dfb89b',1.2);
    draw(ctx,'M-17 -27 L-9 -3 L-3 -2 L-7 -27Z','#bd795b');
    draw(ctx,'M11 -26 L7 -3 L12 -4 L16 -27Z','#794b40');
    draw(ctx,'M-22 -37 Q0 -41 21 -37 L20 -29 Q-1 -25 -22 -30Z','#c38565','#ead1ad',1.2);
    oval(ctx,-.7,-36.2,19,2.45,'#463c37');
    draw(ctx,'M-10 -13 L-4 -11 M4 -20 L7 -17 L5 -13 M-18 -33 L-11 -33',null,'#e2af86',.95);
    ctx.restore();
  }

  function nest(ctx,x,y,time = 0) {
    ctx.save(); ctx.translate(x,y);
    draw(ctx,'M-36 -16 Q-18 -36 0 -29 Q18 -35 36 -17 L27 -5 Q9 3 -15 0 L-28 -6Z','#675046','#bd906c',1.25);
    oval(ctx,0,-16,29,9,'#362f31');
    draw(ctx,'M-38 -16 Q-22 -16 -10 -6 Q16 -2 39 -20 L27 -3 Q3 6 -23 -1Z','#8d6851','#c5a07d',1);
    draw(ctx,'M-40 -23 Q-19 -2 18 -5 M-31 -6 Q-4 -18 32 -9 M-27 -21 Q-7 -32 19 -27 M1 -27 L29 -23 M-8 -2 Q13 -14 37 -21 M-32 -14 L-16 -10 M5 -2 L27 -5',null,'#d4b48a',1.35);
    draw(ctx,'M-39 -12 Q-16 -14 -6 -5 M-25 -3 Q-15 -11 8 -10 M14 -7 L35 -15 M-18 -24 L-5 -29',null,'#594339',1.4);
    draw(ctx,'M25 -25 Q29 -34 32 -33 Q34 -28 25 -25Z M29 -25 Q38 -30 38 -27 Q36 -23 29 -25Z','#748179','#ada98a',.7);
    ctx.restore();
  }

  function feather(ctx,x,y,time = 0) {
    ctx.save();
    ctx.translate(x,y+Math.sin(time*2)*2);
    ctx.rotate(.18+Math.sin(time*1.3)*.09);
    light(ctx,0,-9,19,[[0,'rgba(247,195,112,.22)'],[1,'rgba(247,195,112,0)']]);
    draw(ctx,'M-5 -3 Q-11 -12 -2 -20 L-3 -16 L4 -24 L3 -19 L10 -26 Q12 -15 4 -7 L5 -11 Q1 -5 -5 -3Z','#d1a369','#f2d7a3',1);
    draw(ctx,'M-8 1 Q0 -8 8 -22',null,'#f7dfb0',1.1);
    ctx.restore();
  }
  window.InkSprites = Object.freeze({bird, egg, nest, lamp, pin, pot, feather});
})();
