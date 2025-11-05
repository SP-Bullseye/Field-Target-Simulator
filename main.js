// ---------------------------
// Wind Training — Silhouette PWA (High Detail)
// ---------------------------

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
const distanceDisplay = document.getElementById('distanceDisplay');

// ---------------------------
// Game state
// ---------------------------
let competition = {current:0,totalTargets:20,score:0,mode:'competition'};
let targets = [];
let currentTarget = null;
let wind = {speed:0,direction:0,gustTarget:0,dirTarget:0};
let windSettings = {baseSpeed:5,maxGust:3,maxLull:2,maxDirSwing:15};
let shotTraces = [];

// ---------------------------
// Utility
// ---------------------------
function rand(min,max){ return Math.random()*(max-min)+min; }
function degToRad(d){ return d*Math.PI/180; }
function hitZoneFromDistance(m){
  if(m<20) return 15*0.7; // ~10px
  if(m<35) return 25*0.7; // ~17px
  return 40*0.7;           // ~28px
}

// ---------------------------
// Wind
// ---------------------------
function initWindForTarget(base){
  wind.speed = base;
  wind.direction = rand(0,360);
  setNewWindTargets();
}
function setNewWindTargets(){
  wind.gustTarget = wind.speed + rand(-windSettings.maxLull,windSettings.maxGust);
  wind.dirTarget = wind.direction + rand(-windSettings.maxDirSwing,windSettings.maxDirSwing);
  setTimeout(setNewWindTargets,rand(1000,3000));
}
function updateWind(){
  wind.speed += (wind.gustTarget-wind.speed)*0.05;
  wind.direction += (wind.dirTarget-wind.direction)*0.05;
}
function drawWindIndicator(){
  const r = 30, cx=windCanvas.width/2, cy=windCanvas.height/2;
  const dir = degToRad(wind.direction);
  wctx.clearRect(0,0,windCanvas.width,windCanvas.height);
  wctx.beginPath();
  wctx.moveTo(cx,cy);
  wctx.lineTo(cx+r*Math.cos(dir),cy+r*Math.sin(dir));
  wctx.strokeStyle='#333';
  wctx.lineWidth=3;
  wctx.stroke();
  windText.textContent = `${(wind.speed*3.6).toFixed(1)} km/h • ${wind.direction.toFixed(0)}°`;
}

// ---------------------------
// Background
// ---------------------------
function drawBackground(){
  const grd = ctx.createLinearGradient(0,0,0,targetCanvas.height);
  grd.addColorStop(0,'#87CEEB'); // sky
  grd.addColorStop(0.6,'#87CEEB');
  grd.addColorStop(1,'#228B22'); // grass
  ctx.fillStyle = grd;
  ctx.fillRect(0,0,targetCanvas.width,targetCanvas.height);
}

// ---------------------------
// Silhouettes (inline SVG paths)
// ---------------------------
const silhouettePaths = {
  rat:"M -25,10 Q -10,5 0,0 Q 10,-10 25,-5 Q 20,10 -25,10 Z",
  crow:"M -20,10 Q -10,-15 0,-20 Q 10,-5 25,0 Q 15,10 -20,10 Z",
  rabbit:"M -18,10 Q -5,-20 0,-25 Q 5,-20 18,10 Z",
  squirrel:"M -20,10 Q -10,-5 0,-15 Q 15,-10 25,10 Z"
};
const silhouetteColors = {
  rat:'#444', crow:'#222', rabbit:'#666', squirrel:'#555'
};
const silhouetteTypes = ['rat','crow','rabbit','squirrel'];

function drawSilhouette(type,x,y,scale){
  const path=new Path2D(silhouettePaths[type]||silhouettePaths.rat);
  ctx.save();
  ctx.translate(x,y);
  ctx.scale(scale,scale);
  ctx.fillStyle=silhouetteColors[type]||'#333';
  ctx.fill(path);
  ctx.restore();
}

// ---------------------------
// Build Targets
// ---------------------------
function buildTargets(num){
  targets=[];
  for(let i=0;i<num;i++){
    const d=rand(10,50);
    const t={
      silhouetteType:silhouetteTypes[i%silhouetteTypes.length],
      distanceMeters:d,
      bearingDeg:rand(-30,30),
      x:targetCanvas.width/2,
      y:targetCanvas.height/2,
      killRadiusPx:hitZoneFromDistance(d),
      shotTaken:false,
      result:null
    };
    targets.push(t);
  }
  currentTarget=targets[0];
}

// ---------------------------
// Shooting & Traces
// ---------------------------
function shoot(x,y){
  if(currentTarget.shotTaken) return;
  currentTarget.shotTaken=true;

  const windDrift = (wind.speed/10)*(currentTarget.distanceMeters/20)*Math.cos(degToRad(wind.direction));
  const impactX = currentTarget.x+windDrift*40;
  const impactY = currentTarget.y;

  const dx = impactX-currentTarget.x;
  const dy = impactY-currentTarget.y;
  const dist = Math.sqrt(dx*dx+dy*dy);

  if(dist<currentTarget.killRadiusPx){currentTarget.result='hit';competition.score+=2;}
  else if(dist<currentTarget.killRadiusPx*1.5){currentTarget.result='split';competition.score+=1;}
  else{currentTarget.result='miss';}

  shotTraces.push({x1:targetCanvas.width/2,y1:targetCanvas.height/2,x2:impactX,y2:impactY,alpha:1});

  scoreEl.textContent = competition.score;
  nextBtn.disabled=false;
  renderAll(impactX,impactY,currentTarget.result);
}

// ---------------------------
// Reticle & Rendering
// ---------------------------
function drawReticle(){
  const cx=targetCanvas.width/2, cy=targetCanvas.height/2;
  ctx.strokeStyle='rgba(255,255,255,0.4)';
  ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(cx,0); ctx.lineTo(cx,targetCanvas.height);
  ctx.moveTo(0,cy); ctx.lineTo(targetCanvas.width,cy);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx,cy,10,0,Math.PI*2); ctx.stroke();
}

function renderAll(impactX=null,impactY=null,result=null){
  drawBackground();
  // draw shot traces
  shotTraces.forEach(t=>{
    ctx.strokeStyle=`rgba(255,0,0,${t.alpha})`;
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(t.x1,t.y1);
    ctx.lineTo(t.x2,t.y2);
    ctx.stroke();
    t.alpha*=0.95;
  });
  shotTraces = shotTraces.filter(t=>t.alpha>0.05);

  // scale by distance
  const scale = 50/currentTarget.distanceMeters;
  drawSilhouette(currentTarget.silhouetteType,currentTarget.x,currentTarget.y,scale);

  // hit zone
  ctx.beginPath();
  ctx.arc(currentTarget.x,currentTarget.y,currentTarget.killRadiusPx,0,Math.PI*2);
  ctx.strokeStyle='rgba(255,255,255,0.8)';
  ctx.lineWidth=2; ctx.stroke();

  drawReticle();
  distanceDisplay.textContent = `Distance: ${currentTarget.distanceMeters.toFixed(0)} m`;
}

// ---------------------------
// Canvas Input
// ---------------------------
targetCanvas.addEventListener('mouseup', e=>{
  const rect = targetCanvas.getBoundingClientRect();
  shoot(e.clientX-rect.left,e.clientY-rect.top);
});
targetCanvas.addEventListener('touchend', e=>{
  const rect = targetCanvas.getBoundingClientRect();
  const t = e.changedTouches[0];
  shoot(t.clientX-rect.left,t.clientY-rect.top);
});

// ---------------------------
// Animation Loop
// ---------------------------
function loop(){
  if(!currentTarget) return requestAnimationFrame(loop);
  updateWind();
  drawWindIndicator();
  if(!currentTarget.shotTaken) renderAll();
  requestAnimationFrame(loop);
}
loop();

// ---------------------------
// UI Flow
// ---------------------------
function readSetupValues(){
  windSettings.baseSpeed=parseFloat(document.getElementById('baseSpeed').value)||5;
  windSettings.maxGust=parseFloat(document.getElementById('maxGust').value)||3;
  windSettings.maxLull=parseFloat(document.getElementById('maxLull').value)||2;
  windSettings.maxDirSwing=parseFloat(document.getElementById('maxDirSwing').value)||15;
}

startBtn.addEventListener('click',()=>{
  readSetupValues();
  competition.totalTargets=20;
  competition.current=0;
  competition.score=0;
  competition.mode='competition';
  scoreEl.textContent='0'; targetIndexEl.textContent='1';
  buildTargets(competition.totalTargets);
  setupEl.classList.add('hidden');
  resultsEl.classList.add('hidden');
  gameEl.classList.remove('hidden');
  initWindForTarget(windSettings.baseSpeed);
  nextBtn.disabled=true;
  renderAll();
});

practiceBtn.addEventListener('click',()=>{
  readSetupValues();
  competition.totalTargets=1;
  competition.current=0;
  competition.score=0;
  competition.mode='practice';
  scoreEl.textContent='0'; targetIndexEl.textContent='1';
  targets=[{
    silhouetteType:'rat',
    distanceMeters:10,
    bearingDeg:0,
    x:targetCanvas.width/2,
    y:targetCanvas.height/2,
    killRadiusPx:hitZoneFromDistance(10),
    shotTaken:false
  }];
  currentTarget=targets[0];
  setupEl.classList.add('hidden');
  resultsEl.classList.add('hidden');
  gameEl.classList.remove('hidden');
  initWindForTarget(windSettings.baseSpeed);
  nextBtn.disabled=true;
  renderAll();
});

nextBtn.addEventListener('click',()=>{
  competition.current++;
  if(competition.current>=competition.totalTargets){endCompetition();return;}
  currentTarget=targets[competition.current];
  targetIndexEl.textContent=(competition.current+1);
  nextBtn.disabled=true;
  initWindForTarget(windSettings.baseSpeed);
  renderAll();
});

function endCompetition(){
  gameEl.classList.add('hidden');
  resultsEl.classList.remove('hidden');
  finalScoreEl.textContent=competition.score;
}
endBtn.addEventListener('click',endCompetition);
restartBtn.addEventListener('click',()=>{
  resultsEl.classList.add('hidden');
  setupEl.classList.remove('hidden');
});
