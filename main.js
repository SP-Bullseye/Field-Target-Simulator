// =====================
// Wind Training Game PWA
// Fully Original Version with Dynamic Wind, Zoom, Wind Flag, Scoring
// =====================

// -- Variables --
let windSettings = {};
let wind = {};
let canvas, ctx, windCanvas, windCtx;
let score = 0;
let currentTarget = 0;
const totalTargets = 5;

// DOM Elements
const setupDiv = document.getElementById('setup');
const gameDiv = document.getElementById('game');
const startBtn = document.getElementById('startGame');
const nextTargetBtn = document.getElementById('nextTarget');
const windSpeedEl = document.getElementById('windSpeed');
const windDirEl = document.getElementById('windDir');
const scoreValueEl = document.getElementById('scoreValue');
const zeroRangeInput = document.getElementById('zeroRange');
const zoomSlider = document.getElementById('zoomSlider');

// Zoom level
let zoom = parseFloat(zoomSlider.value);
zoomSlider.addEventListener('input', () => { zoom = parseFloat(zoomSlider.value); });

// Start Game
startBtn.addEventListener('click', () => {
  windSettings = {
    baseSpeed: parseFloat(document.getElementById('baseSpeed').value),
    maxGust: parseFloat(document.getElementById('maxGust').value),
    maxLull: parseFloat(document.getElementById('maxLull').value),
    maxDirSwing: parseFloat(document.getElementById('maxDirSwing').value),
    zeroRange: parseFloat(zeroRangeInput.value)
  };
  score = 0;
  currentTarget = 0;
  startTarget();
  setupDiv.style.display = 'none';
  gameDiv.style.display = 'block';
  scoreValueEl.textContent = score;
});

// Next Target
nextTargetBtn.addEventListener('click', () => {
  currentTarget++;
  if(currentTarget >= totalTargets){
    alert(`Course finished! Final Score: ${score}`);
    setupDiv.style.display = 'block';
    gameDiv.style.display = 'none';
    return;
  }
  startTarget();
});

// Canvas Setup
canvas = document.getElementById('targetCanvas');
ctx = canvas.getContext('2d');

windCanvas = document.getElementById('windCanvas');
windCtx = windCanvas.getContext('2d');

// =====================
// Utilities
// =====================
function randomBetween(min,max){return Math.random()*(max-min)+min;}
function toRadians(deg){return deg*Math.PI/180;}

// =====================
// Target & Wind
// =====================
function startTarget() {
  wind = {
    direction: randomBetween(0,360),
    speed: windSettings.baseSpeed,
    targetDir: windSettings.baseSpeed,
    targetSpeed: windSettings.baseSpeed,
    lastUpdate: performance.now()
  };
}

// =====================
// Dynamic Wind Update
// =====================
function updateWind() {
  const lerpFactor = 0.02;
  wind.direction += (wind.targetDir - wind.direction) * lerpFactor;
  wind.speed += (wind.targetSpeed - wind.speed) * lerpFactor;

  const now = performance.now();
  if(now - wind.lastUpdate > randomBetween(2000,5000)){
    wind.targetDir = wind.direction + randomBetween(-windSettings.maxDirSwing,windSettings.maxDirSwing);
    wind.targetSpeed = windSettings.baseSpeed + randomBetween(-windSettings.maxLull,windSettings.maxGust);
    wind.lastUpdate = now;
  }

  windSpeedEl.textContent = wind.speed.toFixed(1);
  windDirEl.textContent = wind.direction.toFixed(0);
}

// =====================
// Draw Target & Shots
// =====================
function drawTarget() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const centerX = canvas.width/2;
  const centerY = canvas.height/2;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(zoom, zoom);
  ctx.translate(-centerX, -centerY);

  const rings = [50,40,30,20,10];
  const colors = ['red','orange','yellow','green','blue'];
  for(let i=0;i<rings.length;i++){
    ctx.beginPath();
    ctx.arc(centerX,centerY,rings[i],0,2*Math.PI);
    ctx.strokeStyle = colors[i];
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  const windDriftX = wind.speed * Math.sin(toRadians(wind.direction));
  const windDriftY = wind.speed * Math.cos(toRadians(wind.direction));
  const shotX = centerX + windDriftX*5;
  const shotY = centerY - windDriftY*5;

  ctx.beginPath();
  ctx.arc(shotX,shotY,5,0,2*Math.PI);
  ctx.fillStyle = 'black';
  ctx.fill();

  ctx.restore();

  // Hit detection
  const dist = Math.hypot(shotX-centerX, shotY-centerY);
  let points=0;
  if(dist<=10) points=5;
  else if(dist<=20) points=4;
  else if(dist<=30) points=3;
  else if(dist<=40) points=2;
  else if(dist<=50) points=1;
  score += points;
  scoreValueEl.textContent = score;
}

// =====================
// Draw Wind Flag
// =====================
function drawWindFlag(){
  windCtx.clearRect(0,0,windCanvas.width,windCanvas.height);
  const centerX = windCanvas.width/2;
  const centerY = windCanvas.height/2;

  const arrowLength = 40 + wind.speed*2;
  const angle = toRadians(wind.direction);
  const endX = centerX + Math.sin(angle) * arrowLength;
  const endY = centerY - Math.cos(angle) * arrowLength;

  windCtx.beginPath();
  windCtx.moveTo(centerX, centerY);
  windCtx.lineTo(endX, endY);
  windCtx.strokeStyle = 'blue';
  windCtx.lineWidth = 4;
  windCtx.stroke();

  // Arrowhead
  windCtx.beginPath();
  windCtx.moveTo(endX, endY);
  windCtx.lineTo(endX - 5*Math.cos(angle-0.3), endY - 5*Math.sin(angle-0.3));
  windCtx.lineTo(endX - 5*Math.cos(angle+0.3), endY - 5*Math.sin(angle+0.3));
  windCtx.closePath();
  windCtx.fillStyle = 'blue';
  windCtx.fill();
}

// =====================
// Game Loop
// =====================
function gameLoop(){
  updateWind();
  drawTarget();
  drawWindFlag();
  requestAnimationFrame(gameLoop);
}

gameLoop();

// =====================
// PWA Service Worker Registration
// =====================
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./service-worker.js')
    .then(()=>console.log('Service Worker Registered'))
    .catch(err=>console.error(err));
}
