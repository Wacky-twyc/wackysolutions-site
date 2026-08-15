/* =========================================================
   !WackySolutions — stage.js
   The "Idea Drop": the dot of the ! is a filament bulb. It falls,
   bursts, and the shards swarm inward to build "WackySolutions".
   On scroll the same particles re-form as a wireframe, then a phone.

   One WebGL context. All morphing happens on the GPU.
   Degrades to plain HTML if WebGL is missing or motion is reduced.
   ========================================================= */

import * as THREE from 'three';

const stageEl = document.getElementById('stage');
if (stageEl) boot();

function prefersReducedMotion(){
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function webglAvailable(){
  try{
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext &&
      (c.getContext('webgl2') || c.getContext('webgl')));
  }catch(e){ return false; }
}

async function boot(){
  if (prefersReducedMotion() || !webglAvailable()) return; // CSS wordmark stays

  // Wait for the display face, otherwise we sample fallback glyph shapes.
  if (document.fonts){
    try{
      await document.fonts.load('800 200px "Bricolage Grotesque"');
      await document.fonts.ready;
    }catch(e){}
  }

  const isSmall = window.innerWidth < 760;
  const COUNT = isSmall ? 3200 : 7000;

  /* ---------- 1. Sample the wordmark ---------- */
  const sampled = sampleText('!WackySolutions', COUNT);
  if (!sampled) return;
  const { points: textPts, bangWidth, capTop, capBottom } = sampled;

  /* ---------- 2. Build the other two target shapes ---------- */
  const wirePts  = buildWireframe(COUNT);
  const phonePts = buildPhone(COUNT);

  // Sorting every set on x keeps the morph coherent instead of chaotic.
  const byX = (a,b) => a.x - b.x || a.y - b.y;
  textPts.sort(byX); wirePts.sort(byX); phonePts.sort(byX);

  /* ---------- 3. Attributes ---------- */
  const home    = new Float32Array(COUNT*3);
  const wire    = new Float32Array(COUNT*3);
  const phone   = new Float32Array(COUNT*3);
  const scatter = new Float32Array(COUNT*3);
  const type    = new Float32Array(COUNT);   // 0 stem, 1 bulb/dot, 2 letter
  const rand    = new Float32Array(COUNT);

  // The dot of the "!" sits in the upper third of the cap height.
  const dotCut = capTop + (capBottom - capTop) * 0.34;

  for (let i=0;i<COUNT;i++){
    const t = textPts[i], w = wirePts[i], p = phonePts[i];
    const i3 = i*3;

    home[i3]=t.x;  home[i3+1]=t.y;  home[i3+2]=t.z||0;
    wire[i3]=w.x;  wire[i3+1]=w.y;  wire[i3+2]=w.z;
    phone[i3]=p.x; phone[i3+1]=p.y; phone[i3+2]=p.z;
    rand[i]=Math.random();

    const inBang = t.sx < bangWidth;
    const isDot  = inBang && t.sy < dotCut;
    type[i] = inBang ? (isDot ? 1 : 0) : 2;

    if (type[i] === 1){
      // Bulb: a small sphere floating above where the dot will land.
      const u = Math.random()*Math.PI*2, v = Math.acos(2*Math.random()-1);
      const r = 0.10 + Math.random()*0.04;
      scatter[i3]   = t.x + r*Math.sin(v)*Math.cos(u);
      scatter[i3+1] = t.y + 1.55 + r*Math.cos(v);
      scatter[i3+2] = r*Math.sin(v)*Math.sin(u);
    } else if (type[i] === 2){
      // Letters wait scattered around the impact point, then swarm in.
      const a = Math.random()*Math.PI*2;
      const d = 0.35 + Math.random()*1.5;
      scatter[i3]   = Math.cos(a)*d*1.5;
      scatter[i3+1] = Math.sin(a)*d*0.7 + 0.1;
      scatter[i3+2] = (Math.random()-0.5)*1.2;
    } else {
      scatter[i3]=t.x; scatter[i3+1]=t.y; scatter[i3+2]=0;
    }
  }

  /* ---------- 4. Scene ---------- */
  const renderer = new THREE.WebGLRenderer({
    canvas: stageEl, alpha:true, antialias:false, powerPreference:'high-performance'
  });
  renderer.setClearColor(0x000000, 0);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 4.2;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(home.slice(), 3));
  geo.setAttribute('aHome',    new THREE.BufferAttribute(home, 3));
  geo.setAttribute('aWire',    new THREE.BufferAttribute(wire, 3));
  geo.setAttribute('aPhone',   new THREE.BufferAttribute(phone, 3));
  geo.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3));
  geo.setAttribute('aType',    new THREE.BufferAttribute(type, 1));
  geo.setAttribute('aRand',    new THREE.BufferAttribute(rand, 1));

  const uniforms = {
    uIntro:  { value: 0 },
    uMorph:  { value: 0 },
    uTime:   { value: 0 },
    uSize:   { value: isSmall ? 13.0 : 15.0 },
    uDPR:    { value: Math.min(window.devicePixelRatio || 1, 2) },
    uFade:   { value: 1 },
    uGold:   { value: new THREE.Color(0xD4A017) },
    uHot:    { value: new THREE.Color(0xF7E3A6) },
    uPaper:  { value: new THREE.Color(0xEFE9DC) }
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec3 aHome, aWire, aPhone, aScatter;
      attribute float aType, aRand;
      uniform float uIntro, uMorph, uTime, uSize, uDPR;
      varying float vAlpha, vHeat;

      void main(){
        // --- where this particle lives in the current shape ---
        vec3 shape = mix(aHome, aWire, clamp(uMorph, 0.0, 1.0));
        shape = mix(shape, aPhone, clamp(uMorph - 1.0, 0.0, 1.0));

        vec3 pos; float appear;

        if (aType < 0.5){                       // stem of the !
          pos = shape;
          appear = smoothstep(0.00, 0.10, uIntro);
          vHeat = 1.0;
        } else if (aType < 1.5){                // the bulb / dot
          float f = smoothstep(0.26, 0.54, uIntro);
          f = f * f;                            // accelerate: it falls
          pos = mix(aScatter, shape, f);
          // brief outward kick at the moment of impact
          float burst = smoothstep(0.54,0.60,uIntro) * (1.0 - smoothstep(0.60,0.70,uIntro));
          float a1 = aRand * 6.2831853;
          float a2 = fract(aRand * 43.758) * 3.1415926;
          vec3 dir = vec3(sin(a2)*cos(a1), abs(cos(a2)) * 0.7 + 0.25, sin(a2)*sin(a1));
          pos += dir * burst * 0.26;
          appear = smoothstep(0.02, 0.16, uIntro);
          vHeat = 1.0;
        } else {                                // the letters
          float d = aRand * 0.20;
          float f = smoothstep(0.56 + d, 0.90 + d, uIntro);
          pos = mix(aScatter, shape, f);
          appear = smoothstep(0.55 + d, 0.70 + d, uIntro);
          vHeat = 1.0 - f;                      // born gold, cools to paper
        }

        // gentle idle drift so it never looks frozen
        float drift = 0.008 * (1.0 - clamp(uMorph,0.0,1.0) * 0.5);
        pos.x += sin(uTime * 0.5 + aRand * 12.0) * drift;
        pos.y += cos(uTime * 0.42 + aRand * 9.0) * drift;

        vAlpha = appear;

        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * uDPR * (1.0 / -mv.z);
      }
    `,
    fragmentShader: `
      uniform vec3 uGold, uHot, uPaper;
      uniform float uFade;
      varying float vAlpha, vHeat;

      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float d = dot(c, c);
        if (d > 0.25) discard;
        float soft = 1.0 - smoothstep(0.06, 0.25, d);

        vec3 col = mix(uPaper, uGold, clamp(vHeat, 0.0, 1.0));
        col = mix(col, uHot, pow(clamp(vHeat,0.0,1.0), 3.0) * 0.6);

        gl_FragColor = vec4(col, soft * vAlpha * uFade * 0.95);
      }
    `
  });

  const cloud = new THREE.Points(geo, material);
  scene.add(cloud);

  /* ---------- 5. Sizing ---------- */
  function resize(){
    const w = stageEl.clientWidth || window.innerWidth;
    const h = stageEl.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    // Fit the wordmark to ~82% of the viewport width, and never taller than it.
    const visibleH = 2 * Math.tan((camera.fov * Math.PI/180) / 2) * camera.position.z;
    const visibleW = visibleH * camera.aspect;
    const s = Math.min((visibleW * 0.82) / 2.0, visibleH * 0.5);
    cloud.scale.setScalar(s);
    uniforms.uDPR.value = Math.min(window.devicePixelRatio || 1, 2);
  }
  resize();
  window.addEventListener('resize', debounce(resize, 150));

  /* ---------- 6. Timeline ---------- */
  const start = performance.now();
  const INTRO_MS = 3000;
  let introDone = false;
  let visible = true;

  // Scroll drives the morph: wordmark -> wireframe -> phone.
  window.__stageSetMorph = v => { uniforms.uMorph.value = v; };
  window.__stageSetFade  = v => { uniforms.uFade.value = v; };
  window.__stageReplay   = () => { introDone = false; introOffset = performance.now(); };
  let introOffset = start;

  const io = new IntersectionObserver(
    entries => { visible = entries[0].isIntersecting; },
    { threshold: 0 }
  );
  io.observe(stageEl);

  var cleared = false;
  function tick(now){
    requestAnimationFrame(tick);

    if (uniforms.uFade.value < 0.01){
      if (!cleared){ renderer.clear(); cleared = true; }
      return;
    }
    cleared = false;
    if (!visible) return;

    uniforms.uTime.value = (now - start) / 1000;

    if (!introDone){
      const p = Math.min((now - introOffset) / INTRO_MS, 1);
      uniforms.uIntro.value = p;
      if (p >= 1) introDone = true;
    }

    // Slow parallax rotation once the phone shape is in play.
    const m = uniforms.uMorph.value;
    cloud.rotation.y = Math.sin(uniforms.uTime.value * 0.25) * 0.06 + (m > 1 ? (m-1) * 0.5 : 0);

    renderer.render(scene, camera);

    if (!handoff){
      handoff = true;
      document.body.classList.add('stage-live');
    }
  }
  var handoff = false;
  requestAnimationFrame(tick);
}

/* =========================================================
   Target shape builders
   ========================================================= */

// Rasterise the wordmark, then keep the lit pixels as particle homes.
function sampleText(text, count){
  const W = 1400, H = 380;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const font = '800 200px "Bricolage Grotesque", "Trebuchet MS", sans-serif';
  ctx.font = font;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  const metrics = ctx.measureText(text);
  const scale = Math.min(1, (W * 0.94) / metrics.width);
  ctx.font = `800 ${Math.round(200 * scale)}px "Bricolage Grotesque", "Trebuchet MS", sans-serif`;

  const m2 = ctx.measureText(text);
  const x0 = (W - m2.width) / 2;
  ctx.fillStyle = '#fff';
  ctx.fillText(text, x0, H/2);

  // Where does the "!" end? Everything left of that is the exclamation mark.
  const bangW = ctx.measureText('!').width;
  const bangEdgeX = x0 + bangW;

  const asc  = m2.actualBoundingBoxAscent  || 70*scale;
  const desc = m2.actualBoundingBoxDescent || 10*scale;
  const capTopY    = H/2 - asc;
  const capBottomY = H/2 + desc;

  const data = ctx.getImageData(0,0,W,H).data;
  const lit = [];
  const step = 2;
  for (let y=0; y<H; y+=step){
    for (let x=0; x<W; x+=step){
      if (data[(y*W + x)*4 + 3] > 128) lit.push({ sx:x, sy:y });
    }
  }
  if (!lit.length) return null;

  const pts = resample(lit, count);

  // Normalise into world space: x in roughly [-1,1], y flipped.
  const nx = 2 / W;
  return {
    points: pts.map(p => ({
      x: (p.sx - W/2) * nx,
      y: -(p.sy - H/2) * nx,
      z: (Math.random() - 0.5) * 0.03,
      sx: p.sx, sy: p.sy
    })),
    bangWidth: bangEdgeX,
    capTop: capTopY,
    capBottom: capBottomY
  };
}

// A mobile app wireframe: status bar, hero block, two cards, a list, a button.
function buildWireframe(count){
  const rects = [
    [-0.42,  0.74, 0.84, 0.06],  // status bar
    [-0.42,  0.30, 0.84, 0.38],  // hero block
    [-0.42,  0.06, 0.40, 0.20],  // card left
    [ 0.02,  0.06, 0.40, 0.20],  // card right
    [-0.42, -0.20, 0.84, 0.10],  // list row
    [-0.42, -0.34, 0.84, 0.10],  // list row
    [-0.42, -0.48, 0.84, 0.10],  // list row
    [-0.20, -0.74, 0.40, 0.14]   // button
  ];
  const per = Math.ceil(count / rects.length);
  const out = [];
  rects.forEach(([x,y,w,h]) => {
    for (let i=0;i<per;i++){
      const p = perimeterPoint(x,y,w,h, Math.random());
      out.push({ x:p.x*1.55, y:p.y*1.05, z:(Math.random()-0.5)*0.04 });
    }
  });
  return resample(out, count);
}

// A phone: rounded front outline, screen glow speckle, and side edges for depth.
function buildPhone(count){
  const out = [];
  const w = 0.52, h = 1.0, r = 0.10, depth = 0.13;
  const shellCount = Math.floor(count * 0.55);
  const faceCount  = count - shellCount;

  for (let i=0;i<shellCount;i++){
    const p = roundedRectPoint(w, h, r, Math.random());
    const z = (Math.random() < 0.5) ? depth : -depth;
    out.push({ x:p.x, y:p.y, z });
  }
  for (let i=0;i<faceCount;i++){
    // screen fill, denser toward the middle
    const u = (Math.random() + Math.random()) / 2;
    const v = (Math.random() + Math.random()) / 2;
    out.push({
      x: (u - 0.5) * w * 1.72,
      y: (v - 0.5) * h * 1.86,
      z: depth
    });
  }
  return resample(out, count);
}

function perimeterPoint(x, y, w, h, t){
  const per = 2*(w+h);
  let d = t * per;
  if (d < w)        return { x: x + d,          y: y };
  d -= w;
  if (d < h)        return { x: x + w,          y: y - d };
  d -= h;
  if (d < w)        return { x: x + w - d,      y: y - h };
  d -= w;
  return              { x: x,              y: y - h + d };
}

function roundedRectPoint(w, h, r, t){
  const p = perimeterPoint(-w, h, 2*w, 2*h, t);
  // pull corners in toward a radius
  const cx = Math.max(-w + r, Math.min(w - r, p.x));
  const cy = Math.max(-h + r, Math.min(h - r, p.y));
  const dx = p.x - cx, dy = p.y - cy;
  const len = Math.hypot(dx, dy) || 1;
  return { x: cx + (dx/len)*r, y: cy + (dy/len)*r };
}

// Shuffle, then take or repeat until we have exactly `count`.
function resample(arr, count){
  const src = arr.slice();
  for (let i=src.length-1; i>0; i--){
    const j = (Math.random() * (i+1)) | 0;
    [src[i], src[j]] = [src[j], src[i]];
  }
  const out = new Array(count);
  for (let i=0;i<count;i++) out[i] = { ...src[i % src.length] };
  return out;
}

function debounce(fn, ms){
  let id;
  return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), ms); };
}
