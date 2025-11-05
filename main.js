/* ----------------------------------------------------------
   Wind Training Game — Full JS (Competition + Practice)
   ---------------------------------------------------------- */

const targetCanvas = document.getElementById('targetCanvas');
const ctx = targetCanvas.getContext('2d');

const windCanvas = document.getElementById('windCanvas');
const wctx = windCanvas.getContext('2d');

const setupEl = document.getElementById('setup');
const gameEl = document.getElementById('game');
const resultsEl = document.getElementById('results');

const startBtn = document.getElementById('startBtn');
const practiceBtn = document.getElementById('practiceBtn');
const nextBtn = document.getElementById('nextBtn');
const endBtn = document.getElementById('endBtn');
const restartBtn = document.getElementById('restartBtn');

const scoreEl = document.getElementById('score');
const targetIndexEl = document.getElementById('targetIndex');
const finalScoreEl = document.getElementById('finalScore');
const windText = document.getElementById('windText');

// ----------------------------------------------------
// Game state
// ----------------------------------------------------
let competition = {
  current: 0,
  totalTargets: 20,
  score: 0,
  mode: 'competition'
};

let targets = [];
let currentTarget = null;

let wind = {
  speed: 0,
  direction: 0,
  gustTarget: 0,
  dirTarget: 0
};

let windSettings = {
  baseSpeed: 5,
  maxGust: 3,
  maxLull: 2,
  maxDirSwing: 15
};

// ----------------------------------------------------
// Utility helpers
// ----------------------------------------------------
function rand(min, max){ return Math.random()*(max-min)+min; }
function degToRad(d){ return d*Math.PI/180; }

// ----------------------------------------------------
// WIND SYSTEM
// ----------------------------------------------------
function initWindForTarget(base){
  wind.speed = base;
  wind.direction = rand(0,360);
  setNewWindTargets();
}

function setNewWindTargets(){
  wind.gustTarget = wind.speed + rand(-windSettings.maxLull, windSettings.maxGust);
  wind.dirTarget = wind.direction + rand(-windSettings.maxDirSwing, windSettings.maxDirSwing);
  setTimeout(setNewWindTargets, rand(1000,3000)); // gust/lull every 1–3s
}

function updateWind(){
  wind.speed += (wind.gustTarget - wind.speed)*0.05;
  wind.direction += (wind.dirTarget - wind.direction)*0.05;
}

// Draw small arrow indicator
function drawWindIndicator(){
  const r = 30;
  wctx.clearRect(0,0,windCanvas.width,windCanvas.height);
  const cx = windCanvas.width/2, cy = windCanvas.height/2;
  const dir = degToRad(wind.direction);
  wctx.beginPath();
  wctx.moveTo(cx,cy);
  wctx.lineTo(cx + r*Math.cos(dir), cy + r*Math.sin(dir));
  wctx.strokeStyle = '#333';
  wctx.lineWidth = 3;
  wctx.stroke();
  windText.textContent = `${wind.speed.toFixed(1)} m/s • ${wind.direction.toFixed(0)}°`;
}

// ----------------------------------------------------
// TARGET SYSTEM
// ----------------------------------------------------
const silhouetteShapes = ['rat','crow','rabbit','squirrel'];

function buildTargets(num){
  targets = [];
  for(let i=0;i<num;i++){
    const t = {
      silhouetteType: silhouetteShapes[i % silhouetteShapes.length],
      distanceMeters: rand(10,50),
      bearingDeg: rand(-30,30),
      x: targetCanvas.width/2,
      y: targetCanvas.height/2,
      killRadiusPx: 28,
      shotTaken:false,
      result:null
    };
    targets.push(t);
  }
  currentTarget = targets[0];
}

// Draw silhouette (simplified)
function drawSilhouette(type,x,y,scale=1){
  ctx.save();
  ctx.translate(x,y);
  ctx.scale(scale,scale);
  ctx.fillStyle='#444';
  ctx.beginPath();
  switch(type){
    case 'rat':
      ctx.moveTo(-20,10); ctx.lineTo(20,10); ctx.lineTo(20,-10); ctx.lineTo(10,-10);
      ctx.lineTo(0,-20); ctx.lineTo(-10,-10); ctx.closePath();
      break;
    case 'crow':
      ctx.moveTo(-15,10); ctx.lineTo(15,10); ctx.lineTo(10,-15);
      ctx.lineTo(0,-20); ctx.lineTo(-10,-10); ctx.closePath();
      break;
    case 'rabbit':
      ctx.moveTo(-15,10); ctx.lineTo(15,10); ctx.lineTo(15,-10);
      ctx.lineTo(10,-25); ctx.lineTo(0,-10); ctx.lineTo(-10,-25); ctx.closePath();
      break;
    case 'squirrel':
      ctx.moveTo(-18,10); ctx.lineTo(18,10); ctx.lineTo(18,-8);
      ctx.lineTo(5,-20); ctx.lineTo(-10,-15); ctx.closePath();
      break;
  }
  ctx.fill();
  ctx.restore();
}

// ----------------------------------------------------
// Shooting logic
// ----------------------------------------------------
function shoot(x,y){
  if(currentTarget.shotTaken) return;
  currentTarget.shotTaken = true;

  const windDrift = (wind.speed/10) * (currentTarget.distanceMeters/20) *
                    Math.cos(degToRad(wind.direction));
  const impactX = currentTarget.x + windDrift*40;
  const impactY = currentTarget.y;

  const dx = impactX - currentTarget.x;
  const dy = impactY - currentTarget.y;
  const dist = Math.sqrt(dx*dx+dy*dy);

  if(dist < currentTarget.killRadiusPx) {
    currentTarget.result = 'hit'; competition.score += 2;
  } else if(dist < currentTarget.killRadiusPx*1.5) {
    currentTarget.result = 'split'; competition.score += 1;
  } else {
    currentTarget.result = 'miss';
  }

  scoreEl.textContent = competition.score;
  nextBtn.disabled = false;
  renderAll(impactX,impactY,currentTarget.result);
}

// ----------------------------------------------------
// Rendering
// ----------------------------------------------------
function renderAll(impactX=null,impactY=null,result=null){
  ctx.clearRect(0,0,targetCanvas.width,targetCanvas.height);
  drawSilhouette(currentTarget.silhouetteType,currentTarget.x,currentTarget.y,4);
  ctx.beginPath();
  ctx.arc(currentTarget.x,currentTarget.y,currentTarget.killRadiusPx,0,Math.PI*2);
  ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke();

  if(impactX){
    ctx.beginPath();
    ctx.arc(impactX,impactY,5,0,Math.PI*2);
    ctx.fillStyle = result==='hit'?'#0f0':result==='split'?'#ffa500':'#f00';
    ctx.fill();
  }
}

// ----------------------------------------------------
// Canvas input
// ----------------------------------------------------
targetCanvas.addEventListener('mouseup', e=>{
  const rect = targetCanvas.getBoundingClientRect();
  shoot(e.clientX - rect.left, e.clientY - rect.top);
});
targetCanvas.addEventListener('touchend', e=>{
  const rect = targetCanvas.getBoundingClientRect();
  const touch = e.changedTouches[0];
  shoot(touch.clientX - rect.left, touch.clientY - rect.top);
});

// ----------------------------------------------------
// Animation loop
// ----------------------------------------------------
function loop(){
  if(!currentTarget) return requestAnimationFrame(loop);
  updateWind();
  drawWindIndicator();
  if(!currentTarget.shotTaken) renderAll();
  requestAnimationFrame(loop);
}
loop();

// ----------------------------------------------------
// Next / End / Restart buttons
// ----------------------------------------------------
nextBtn.addEventListener('click', ()=>{
  competition.current++;
  if(competition.current >= competition.totalTargets){
    endCompetition(); return;
  }
  currentTarget = targets[competition.current];
  targetIndexEl.textContent = (competition.current+1);
  nextBtn.disabled = true;
  initWindForTarget(windSettings.baseSpeed);
  renderAll();
});

// ----------------------------------------------------
// UI Flow
// ----------------------------------------------------
function readSetupValues(){
  const b = parseFloat(document.getElementById('baseSpeed').value) || 5;
  const g = parseFloat(document.getElementById('maxGust').value) || 3;
  const l = parseFloat(document.getElementById('maxLull').value) || 2;
  const s = parseFloat(document.getElementById('maxDirSwing').value) || 15;
  windSettings = { baseSpeed:b, maxGust:g, maxLull:l, maxDirSwing:s };
}

startBtn.addEventListener('click', ()=>{
  readSetupValues();
  competition.totalTargets = 20;
  competition.current = 0;
  competition.score = 0;
  competition.mode = 'competition';
  scoreEl.textContent = '0';
  targetIndexEl.textContent = '1';
  buildTargets(competition.totalTargets);
  setupEl.classList.add('hidden');
  resultsEl.classList.add('hidden');
  gameEl.classList.remove('hidden');
  initWindForTarget(windSettings.baseSpeed);
  nextBtn.disabled = true;
  renderAll();
});

practiceBtn.addEventListener('click', ()=>{
  readSetupValues();
  competition.totalTargets = 1;
  competition.current = 0;
  competition.score = 0;
  competition.mode = 'practice';
  scoreEl.textContent = '0';
  targetIndexEl.textContent = '1';
  targets = [{
    silhouetteType:'rat',
    distanceMeters:10,
    bearingDeg:0,
    x: targetCanvas.width/2,
    y: targetCanvas.height/2,
    killRadiusPx:28,
    shotTaken:false
  }];
  currentTarget = targets[0];
  setupEl.classList.add('hidden');
  resultsEl.classList.add('hidden');
  gameEl.classList.remove('hidden');
  initWindForTarget(windSettings.baseSpeed);
  nextBtn.disabled = true;
  renderAll();
});

function endCompetition(){
  gameEl.classList.add('hidden');
  resultsEl.classList.remove('hidden');
  finalScoreEl.textContent = competition.score;
}
endBtn.addEventListener('click', endCompetition);
restartBtn.addEventListener('click', ()=>{
  resultsEl.classList.add('hidden');
  setupEl.classList.remove('hidden');
});
