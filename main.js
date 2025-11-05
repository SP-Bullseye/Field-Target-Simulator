// main.js — Wind Training Silhouette Competition
// 20 targets, animal silhouette plates, dynamic wind per target (gusts/lulls), PWA-ready

// -------- DOM --------
const setupEl = document.getElementById('setup');
const startBtn = document.getElementById('startBtn');
const practiceBtn = document.getElementById('practiceBtn');

const gameEl = document.getElementById('game');
const targetCanvas = document.getElementById('targetCanvas');
const tctx = targetCanvas.getContext('2d');

const windCanvas = document.getElementById('windCanvas');
const wctx = windCanvas.getContext('2d');
const windText = document.getElementById('windText');

const targetIndexEl = document.getElementById('targetIndex');
const scoreEl = document.getElementById('score');
const nextBtn = document.getElementById('nextBtn');
const endBtn = document.getElementById('endBtn');

const resultsEl = document.getElementById('results');
const finalScoreEl = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');

// -------- Settings / state --------
let windSettings = {
  baseSpeed: 5,
  maxGust: 3,
  maxLull: 2,
  maxDirSwing: 15
};

let competition = {
  totalTargets: 20,
  current: 0,
  score: 0,
  mode: 'competition' // or 'practice'
};

let wind = {
  direction: 0,   // degrees (0 = toward top)
  speed: 0,
  targetDir: 0,
  targetSpeed: 0,
  lastUpdate: 0,
  frozen: false, // true right after shot
  frozenAt: null
};

// Target list (varied distances & bearings)
let targets = []; // each: {distanceMeters, bearingDeg, x,y,killRadiusPx, silhouetteType}

// canvas sizes responsive-ish
function fitCanvas(){
  // keep as defined width/height for layout; could scale for smaller screens if needed
}
fitCanvas();

// utility
const rnd = (min,max)=> Math.random()*(max-min)+min;
const toRad = deg => deg*Math.PI/180;
const clamp = (v,min,max)=> Math.max(min, Math.min(max, v));

// -------- Wind logic --------
function initWindForTarget(baseSpeed){
  wind.direction = rnd(0,360);
  wind.speed = baseSpeed;
  wind.targetDir = wind.direction;
  wind.targetSpeed = baseSpeed;
  wind.lastUpdate = performance.now();
  wind.frozen = false;
  wind.frozenAt = null;
}

function scheduleWindChangeIfNotFrozen(){
  if (wind.frozen) return;
  const now = performance.now();
  if (now - wind.lastUpdate > rnd(2000,5000)){
    wind.targetDir = wind.direction + rnd(-windSettings.maxDirSwing, windSettings.maxDirSwing);
    wind.targetSpeed = windSettings.baseSpeed + rnd(-windSettings.maxLull, windSettings.maxGust);
    wind.lastUpdate = now;
  }
}

function updateWindVisual(){
  if (!wind.frozen){
    const lerp = 0.03;
    // normalize angle interpolation
    let diff = (wind.targetDir - wind.direction + 540) % 360 - 180;
    wind.direction = (wind.direction + diff * lerp + 360) % 360;
    wind.speed += (wind.targetSpeed - wind.speed) * lerp;
  }
  // update widget
  windText.textContent = `${wind.speed.toFixed(1)} m/s • ${wind.direction.toFixed(0)}°`;
}

// draw wind arrow
function drawWindWidget(){
  const w = windCanvas.width, h = windCanvas.height;
  wctx.clearRect(0,0,w,h);
  const cx = w/2, cy = h/2;
  // arrow length scaled
  const len = 20 + wind.speed*2;
  const ang = toRad(wind.direction);
  // draw shaft
  wctx.beginPath();
  wctx.moveTo(cx,cy);
  const ex = cx + Math.sin(ang)*len;
  const ey = cy - Math.cos(ang)*len;
  wctx.lineTo(ex,ey);
  wctx.strokeStyle = '#0b6b3a';
  wctx.lineWidth = 4;
  wctx.stroke();
  // head
  wctx.beginPath();
  wctx.moveTo(ex,ey);
  wctx.lineTo(ex - 6*Math.cos(ang-0.3), ey - 6*Math.sin(ang-0.3));
  wctx.lineTo(ex - 6*Math.cos(ang+0.3), ey - 6*Math.sin(ang+0.3));
  wctx.closePath();
  wctx.fillStyle = '#0b6b3a';
  wctx.fill();
}

// -------- Targets generation (silhouettes) --------
function buildTargets(n){
  targets = [];
  for(let i=0;i<n;i++){
    // distances 10m..35m (random)
    const distance = Math.round(rnd(8,35));
    const bearing = Math.round(rnd(0,359)); // relative compass bearing; we will place targets visually across canvas
    // compute screen position spread across canvas using bearing but keep them viewable
    const margin = 120;
    const angle = toRad(rnd(-25,25)); // small spread for x-pos
    const x = margin + (i % 5) * ((targetCanvas.width - margin*2)/4) + rnd(-30,30);
    const y = 120 + Math.floor(i/5) * 110 + rnd(-20,20);
    const killRadius = 28; // pixels for "kill zone"
    const silhouette = (i % 3 === 0) ? 'rat' : ((i % 3 === 1) ? 'crow' : 'chicken'); // alternate silhouettes
    targets.push({distanceMeters: distance, bearingDeg: bearing, x,y, killRadiusPx: killRadius, silhouetteType: silhouette, shotTaken:false});
  }
}

// draw a silhouette roughly (simple shapes) — black filled
function drawSilhouette(ctx, type, cx, cy, scale=1){
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.fillStyle = 'black';
  ctx.beginPath();
  // simple approximate silhouettes
  if (type === 'rat'){
    // body ellipse
    ctx.ellipse(0,0,22,14,0,0,Math.PI*2);
    ctx.fill();
    // head
    ctx.beginPath();
    ctx.ellipse(26,-6,8,6,0,0,Math.PI*2);
    ctx.fill();
    // tail
    ctx.beginPath();
    ctx.moveTo(-14,4);
    ctx.quadraticCurveTo(-28,6,-38,18);
    ctx.lineWidth=4; ctx.strokeStyle='black'; ctx.stroke();
  } else if (type === 'crow'){
    // body
    ctx.ellipse(0,0,26,12,0,0,Math.PI*2);
    ctx.fill();
    // wing
    ctx.beginPath();
    ctx.moveTo(-6,-6);
    ctx.quadraticCurveTo(-30,-20,-8,6);
    ctx.fill();
    // beak
    ctx.beginPath();
    ctx.moveTo(24,-6);
    ctx.lineTo(34,-10);
    ctx.lineTo(24,-2);
    ctx.fill();
  } else { // chicken
    ctx.ellipse(0,0,20,15,0,0,Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-6,-10,6,4,0,0,Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(10,-6);
    ctx.quadraticCurveTo(20,-10,30,-2);
    ctx.lineTo(20,-2);
    ctx.fill();
  }
  ctx.restore();
}

// draw target plate (silhouette + small kill circle)
// also draw a faint ring to indicate kill zone boundary for feedback (optional)
function renderTargets(){
  tctx.clearRect(0,0,targetCanvas.width,targetCanvas.height);
  targets.forEach((t, idx) => {
    // silhouette position is t.x,t.y
    drawSilhouette(tctx, t.silhouetteType, t.x, t.y, 1.0);
    // optional light kill circle (invisible in real game — we show outline faint for training)
    tctx.beginPath();
    tctx.arc(t.x, t.y, t.killRadiusPx, 0, Math.PI*2);
    tctx.strokeStyle = 'rgba(0,0,0,0.06)';
    tctx.lineWidth = 2;
    tctx.stroke();
    // draw distance label
    tctx.font = '12px system-ui';
    tctx.fillStyle = '#222';
    tctx.fillText(`${t.distanceMeters}m`, t.x - 18, t.y + t.killRadiusPx + 16);
    if (t.shotTaken){
      // dim silhouette after shot
      tctx.fillStyle = 'rgba(0,0,0,0.15)';
      tctx.beginPath();
      tctx.arc(t.x, t.y, t.killRadiusPx+30, 0, Math.PI*2);
      tctx.fill();
    }
  });
}

// -------- Shot physics & scoring --------
// On pointerup we accept the shot; wind freezes at that instant.
// pellet drift: crosswind component = wind.speed * sin(deltaAngle)
// drift distance in px = crosswind * distanceMeters * scaleFactor
// scaleFactor chosen so drift is visually sensible (tune)
const PX_PER_METER = 3.0;    // scaling to convert distance to px effect
const DRIFT_SCALE = 0.9;     // tuning parameter

function fireShotAtTarget(index){
  const t = targets[index];
  if (!t || t.shotTaken) return;
  // freeze wind
  wind.frozen = true;
  wind.frozenAt = {dir: wind.direction, speed: wind.speed};

  // Compute angle between wind direction and line-of-fire (simplified: use target bearing)
  const windDir = wind.frozenAt.dir;
  const targetBearing = t.bearingDeg; // we use stored random bearing
  // crosswind component uses difference
  let delta = ((windDir - targetBearing + 540) % 360) - 180; // -180..180
  const crossComp = wind.frozenAt.speed * Math.sin(toRad(delta)); // m/s
  // drift in pixels
  const driftPx = crossComp * t.distanceMeters * PX_PER_METER * DRIFT_SCALE;

  // small vertical random error for realism
  const vertError = rnd(-6,6);

  // compute impact point relative to silhouette center: we assume crosswind drifts along x
  const impactX = t.x + driftPx;
  const impactY = t.y + vertError;

  // draw shot mark and feedback
  drawShotImpact(impactX, impactY);

  // determine hit / split / miss based on distance to target center
  const dist = Math.hypot(impactX - t.x, impactY - t.y);
  let result = 'miss';
  let points = 0;
  if (dist <= t.killRadiusPx) { result = 'hit'; points = 2; }
  else if (dist <= t.killRadiusPx + 12) { result = 'split'; points = 1; }
  else { result = 'miss'; points = 0; }

  // update score & state
  t.shotTaken = true;
  competition.score += points;
  scoreEl.textContent = competition.score;
  targets[competition.current] = t;

  // visual feedback: color overlay or outline
  showResultMarker(impactX, impactY, result);

  // enable Next button after short delay
  setTimeout(()=> { nextBtn.disabled = false; }, 700);
}

// draw a small bullet hole
function drawShotImpact(x,y){
  tctx.beginPath();
  tctx.arc(x,y,5,0,Math.PI*2);
  tctx.fillStyle = '#000';
  tctx.fill();
  tctx.beginPath();
  tctx.arc(x,y,8,0,Math.PI*2);
  tctx.strokeStyle = 'rgba(0,0,0,0.2)';
  tctx.stroke();
}

// show result color flash (green/orange/red)
function showResultMarker(x,y,result){
  const color = (result==='hit')?'#2ecc71':(result==='split'?'#f39c12':'#e74c3c');
  // small halo
  tctx.beginPath();
  tctx.arc(x,y,18,0,Math.PI*2);
  tctx.fillStyle = color + '33';
  tctx.fill();
  // write text
  tctx.font = 'bold 16px system-ui';
  tctx.fillStyle = color;
  tctx.fillText(result.toUpperCase(), x+20, y-10);
}

// pointer handling: use pointerup to "release" shot (suits touch & mouse)
// Only one shot allowed per target
function onPointerUp(e){
  if (gameEl.classList.contains('hidden')) return;
  const idx = competition.current;
  if (idx >= targets.length) return;
  if (targets[idx].shotTaken) return;
  // freeze wind and compute shot
  fireShotAtTarget(idx);
  // disable shooting until Next pressed (prevents double-shot)
  // (we rely on t.shotTaken blocking further shots)
}

// Next button
nextBtn.addEventListener('click', ()=>{
  nextBtn.disabled = true;
  competition.current++;
  if (competition.current >= competition.totalTargets){
    endCompetition();
    return;
  }
  targetIndexEl.textContent = competition.current + 1;
  // reset wind frozen state and initialize for next target
  wind.frozen = false;
  wind.frozenAt = null;
  initWindForTarget(windSettings.baseSpeed);
  renderAll();
});

// End competition
endBtn.addEventListener('click', ()=>{
  endCompetition();
});

restartBtn && restartBtn.addEventListener('click', ()=>{
  // show setup again
  resultsEl.classList.add('hidden');
  setupEl.classList.remove('hidden');
});

// pointer hookup
targetCanvas.addEventListener('pointerup', onPointerUp);

// -------- UI flow: Start / Practice / Competition --------
startBtn.addEventListener('click', ()=>{
  // read setup
  const b = parseFloat(document.getElementById('baseSpeed').value) || 5;
  const g = parseFloat(document.getElementById('maxGust').value) || 3;
  const l = parseFloat(document.getElementById('maxLull').value) || 2;
  const s = parseFloat(document.getElementById('maxDirSwing').value) || 15;
  windSettings = { baseSpeed: b, maxGust: g, maxLull: l, maxDirSwing: s };
  // setup competition
  competition.totalTargets = 20;
  competition.current = 0;
  competition.score = 0;
  competition.mode = 'competition';
  scoreEl.textContent = '0';
  buildTargets(competition.totalTargets);
  targetIndexEl.textContent = '1';
  setupEl.classList.add('hidden');
  gameEl.classList.remove('hidden');
  nextBtn.disabled = true;
  initWindForTarget(windSettings.baseSpeed);
  renderAll();
});

practiceBtn.addEventListener('click', ()=>{
  // zero-range practice: single target at short distance
  const b = parseFloat(document.getElementById('baseSpeed').value) || 5;
  const g = parseFloat(document.getElementById('maxGust').value) || 3;
  const l = parseFloat(document.getElementById('maxLull').value) || 2;
  const s = parseFloat(document.getElementById('maxDirSwing').value) || 15;
  windSettings = { baseSpeed: b, maxGust: g, maxLull: l, maxDirSwing: s };
  competition.totalTargets = 1;
  competition.current = 0;
  competition.score = 0;
  competition.mode = 'practice';
  scoreEl.textContent = '0';
  targets = [{distanceMeters: parseFloat(document.getElementById('zeroRange')?.value || 10), bearingDeg:0, x:targetCanvas.width/2, y:targetCanvas.height/2, killRadiusPx:28, silhouetteType:'rat', shotTaken:false}];
  setupEl.classList.add('hidden');
  gameEl.classList.remove('hidden');
  nextBtn.disabled = true;
  initWindForTarget(windSettings.baseSpeed);
  renderAll();
});

// end competition display
function endCompetition(){
  gameEl.classList.add('hidden');
  resultsEl.classList.remove('hidden');
  finalScoreEl.textContent = competition.score;
  // also allow restart by showing setup
  setupEl.classList.remove('hidden');
  resultsEl.classList.add('hidden'); // keep results hidden for now; show minimal
  // reset UI to allow restart
  setupEl.classList.remove('hidden');
}

// render all targets + widgets
function renderAll(){
  renderTargets();
  drawWindWidget();
  windText.textContent = `${wind.speed.toFixed(1)} m/s • ${wind.direction.toFixed(0)}°`;
}

// Main animation loop
function loop(){
  scheduleWindChangeIfNotFrozen();
  updateWindVisual();
  drawWindWidget();
  // refresh targets canvas to ensure dynamic marks are visible
  renderTargets();
  // re-draw shot markers are placed directly on renderTargets; fine
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// PWA service worker register
if ('serviceWorker' in navigator){
  navigator.serviceWorker.register('./service-worker.js').catch(()=>{/* ignore */});
}
