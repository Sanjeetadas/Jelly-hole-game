const canvas = document.getElementById('canvas');
const ctx    = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

// ── Food types ──────────────────────────────────────────────────────────────
const FOOD_TYPES = [
  { type:'burger',  emoji:'🍔', radius:20, fontSize:44, value:1, weight:4 },
  { type:'pizza',   emoji:'🍕', radius:20, fontSize:44, value:1, weight:4 },
  { type:'sushi',   emoji:'🍣', radius:18, fontSize:38, value:2, weight:3 },
  { type:'chicken', emoji:'🍗', radius:18, fontSize:38, value:2, weight:3 },
];

const FOOD_POOL = [];
FOOD_TYPES.forEach(f => { for(let i=0;i<f.weight;i++) FOOD_POOL.push(f); });

// ── State ───────────────────────────────────────────────────────────────────
let gameRunning=false;
let hole, items, particles, score, itemCounts, totalItems;
let animFrame, lastTs;
let keys={};
let mouseX=W/2, mouseY=H*0.6;
let usingMouse=true;

function rand(a,b){ return a+Math.random()*(b-a); }
function sizeLevel(){ return Math.max(1,Math.floor(1+(hole.r-40)/9)); }

// ── Init ────────────────────────────────────────────────────────────────────
function initGame(){
  hole = { x:W/2, y:H/2+80, r:40, vx:0, vy:0, glowPhase:0, trail:[] };
  score=0;
  itemCounts={burger:0,pizza:0,sushi:0,chicken:0};
  items=[];
  particles=[];
  for(let i=0;i<30;i++) spawnFood();
  totalItems=items.length;
  updateHUD();
  updateRemaining();
  document.getElementById('size-num').textContent='1';
}

function spawnFood(){
  const food = FOOD_POOL[Math.floor(Math.random()*FOOD_POOL.length)];
  const margin = food.radius + 8;
  items.push({
    food,
    x: rand(margin, W-margin),
    y: rand(105, H-margin),
    wobble: rand(0, Math.PI*2),
    wobbleSpd: rand(1.2, 2.8),
    eaten:false, eatT:0, scale:1,
  });
}

// ── HUD ─────────────────────────────────────────────────────────────────────
function updateHUD(){
  document.getElementById('cnt-burger').textContent  = itemCounts.burger;
  document.getElementById('cnt-pizza').textContent   = itemCounts.pizza;
  document.getElementById('cnt-sushi').textContent   = itemCounts.sushi;
  document.getElementById('cnt-chicken').textContent = itemCounts.chicken;
  document.getElementById('cnt-score').textContent   = score;
}

function updateRemaining(){
  const left = items.filter(it=>!it.eaten).length;
  document.getElementById('food-remaining').textContent =
    left>0 ? `🍽️ ${left} item${left!==1?'s':''} left` : '🎉 All eaten!';
}

function spawnPopup(x,y,text){
  const el=document.createElement('div');
  el.className='eat-popup'; el.textContent=text;
  el.style.left=(x-18)+'px'; el.style.top=(y-30)+'px';
  document.getElementById('game-wrapper').appendChild(el);
  setTimeout(()=>el.remove(),900);
}

function spawnParticles(x,y){
  for(let i=0;i<12;i++){
    const a=Math.random()*Math.PI*2, s=rand(2,8);
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:rand(3,9),alpha:1});
  }
}

// ── Game loop ────────────────────────────────────────────────────────────────
function gameLoop(ts){
  const dt=Math.min((ts-lastTs)/1000,0.05);
  lastTs=ts;
  if(!gameRunning) return;
  update(dt);
  draw();
  animFrame=requestAnimationFrame(gameLoop);
}

// ── Update ───────────────────────────────────────────────────────────────────
function update(dt){
  if(usingMouse){
    hole.x += (mouseX - hole.x) * 0.25;
    hole.y += (mouseY - hole.y) * 0.25;
    hole.vx=0; hole.vy=0;
  } else {
    const ACCEL=800;
    if(keys['ArrowLeft']||keys['a']||keys['A'])  hole.vx -= ACCEL*dt;
    if(keys['ArrowRight']||keys['d']||keys['D']) hole.vx += ACCEL*dt;
    if(keys['ArrowUp']||keys['w']||keys['W'])    hole.vy -= ACCEL*dt;
    if(keys['ArrowDown']||keys['s']||keys['S'])  hole.vy += ACCEL*dt;
    hole.vx *= 0.75; hole.vy *= 0.75;
    const MAX=520;
    const spd=Math.sqrt(hole.vx*hole.vx+hole.vy*hole.vy);
    if(spd>MAX){ hole.vx=hole.vx/spd*MAX; hole.vy=hole.vy/spd*MAX; }
    hole.x += hole.vx*dt;
    hole.y += hole.vy*dt;
  }

  const MARGIN=20, TOP_MARGIN=105;
  hole.x = Math.max(MARGIN, Math.min(W-MARGIN, hole.x));
  hole.y = Math.max(TOP_MARGIN, Math.min(H-MARGIN, hole.y));
  hole.glowPhase += dt*3;
  hole.trail.unshift({x:hole.x,y:hole.y});
  if(hole.trail.length>14) hole.trail.pop();

  items.forEach(item=>{
    if(item.eaten){
      item.eatT += dt*6;
      item.scale = Math.max(0, 1-item.eatT);
      item.x += (hole.x-item.x)*dt*14;
      item.y += (hole.y-item.y)*dt*14;
      return;
    }
    item.wobble += item.wobbleSpd*dt;
    const dx=hole.x-item.x, dy=hole.y-item.y;
    const dist=Math.sqrt(dx*dx+dy*dy);
    const fr=item.food.radius;
    if(dist < hole.r + fr*0.3 && fr < hole.r){
      item.eaten=true;
      itemCounts[item.food.type]++;
      const gained=item.food.value;
      score += gained;
      hole.r = Math.min(160, hole.r + gained*0.9);
      spawnParticles(hole.x,hole.y);
      updateHUD();
      updateRemaining();
      spawnPopup(hole.x, hole.y-hole.r, '+'+gained);
      document.getElementById('size-num').textContent=sizeLevel();
      const badge=document.getElementById('size-badge');
      badge.classList.remove('pulse');
      void badge.offsetWidth;
      badge.classList.add('pulse');
    }
  });

  items = items.filter(it=>!(it.eaten&&it.eatT>=1));
  if(items.filter(it=>!it.eaten).length===0&&gameRunning){ endGame(); return; }

  particles.forEach(p=>{
    p.x+=p.vx; p.y+=p.vy;
    p.vy+=0.14;
    p.alpha-=dt*1.8;
  });
  particles=particles.filter(p=>p.alpha>0);
}

// ── Grass pattern ─────────────────────────────────────────────────────────────
let grassPat=null;
function buildGrass(){
  const oc=document.createElement('canvas');
  oc.width=oc.height=64;
  const c=oc.getContext('2d');
  c.fillStyle='#47b336'; c.fillRect(0,0,64,64);
  c.strokeStyle='rgba(0,0,0,0.07)'; c.lineWidth=1;
  for(let i=0;i<4;i++) for(let j=0;j<4;j++){
    c.beginPath(); c.arc(8+i*16,8+j*16,7,0,Math.PI*2); c.stroke();
  }
  c.fillStyle='rgba(0,0,0,0.04)';
  c.beginPath(); c.ellipse(32,32,18,12,0.4,0,Math.PI*2); c.fill();
  grassPat=ctx.createPattern(oc,'repeat');
}

// ── Draw food item ─────────────────────────────────────────────────────────────
function drawFoodItem(item){
  const bob = Math.sin(item.wobble)*3.5;
  const fs  = item.food.fontSize;
  const r   = item.food.radius;

  // Drop shadow
  ctx.beginPath();
  ctx.ellipse(0, bob+r*1.3, r*0.9, r*0.28, 0, 0, Math.PI*2);
  ctx.fillStyle='rgba(0,0,0,0.22)';
  ctx.fill();

  // Solid white circle background
  ctx.beginPath();
  ctx.arc(0, bob, r*1.2, 0, Math.PI*2);
  ctx.fillStyle='#ffffff';
  ctx.fill();

  // Border
  ctx.beginPath();
  ctx.arc(0, bob, r*1.2, 0, Math.PI*2);
  ctx.strokeStyle='rgba(0,0,0,0.1)';
  ctx.lineWidth=2;
  ctx.stroke();

  // Emoji drawn 3x for full opacity
  ctx.globalAlpha=1;
  ctx.shadowBlur=0;
  ctx.font=`${fs}px serif`;
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillText(item.food.emoji, 0, bob);
  ctx.fillText(item.food.emoji, 0, bob);
  ctx.fillText(item.food.emoji, 0, bob);
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function draw(){
  if(!grassPat) buildGrass();
  ctx.fillStyle=grassPat; ctx.fillRect(0,0,W,H);

  const sky=ctx.createLinearGradient(0,0,0,100);
  sky.addColorStop(0,'#87ceeb'); sky.addColorStop(1,'#47b336');
  ctx.fillStyle=sky; ctx.fillRect(0,0,W,100);

  hole.trail.forEach((pt,i)=>{
    const a=(1-i/hole.trail.length)*0.09;
    ctx.beginPath(); ctx.arc(pt.x,pt.y,hole.r*(1-i*0.045),0,Math.PI*2);
    ctx.fillStyle=`rgba(160,255,50,${a})`; ctx.fill();
  });

  items.forEach(item=>{
    if(item.eatT>=1) return;
    ctx.save();
    ctx.translate(item.x,item.y);
    ctx.scale(item.scale,item.scale);
    drawFoodItem(item);
    ctx.restore();
  });

  const gs=7+Math.sin(hole.glowPhase)*4;
  const glowG=ctx.createRadialGradient(hole.x,hole.y,hole.r,hole.x,hole.y,hole.r+gs+28);
  glowG.addColorStop(0,'rgba(200,255,40,0.65)');
  glowG.addColorStop(0.5,'rgba(160,255,0,0.22)');
  glowG.addColorStop(1,'rgba(0,0,0,0)');
  ctx.beginPath(); ctx.arc(hole.x,hole.y,hole.r+gs+28,0,Math.PI*2);
  ctx.fillStyle=glowG; ctx.fill();

  ctx.beginPath(); ctx.arc(hole.x,hole.y,hole.r+7,0,Math.PI*2);
  ctx.strokeStyle='rgba(255,255,255,0.9)'; ctx.lineWidth=7; ctx.stroke();

  ctx.beginPath(); ctx.arc(hole.x,hole.y,hole.r+2,0,Math.PI*2);
  ctx.strokeStyle='#00d4c8'; ctx.lineWidth=3.5; ctx.stroke();

  const hg=ctx.createRadialGradient(hole.x-hole.r*0.3,hole.y-hole.r*0.3,hole.r*0.08,hole.x,hole.y,hole.r);
  hg.addColorStop(0,'#1a1a1a'); hg.addColorStop(1,'#000');
  ctx.beginPath(); ctx.arc(hole.x,hole.y,hole.r,0,Math.PI*2);
  ctx.fillStyle=hg; ctx.fill();

  ctx.beginPath(); ctx.arc(hole.x-hole.r*0.3,hole.y-hole.r*0.3,hole.r*0.18,0,Math.PI*2);
  ctx.fillStyle='rgba(255,255,255,0.07)'; ctx.fill();

  particles.forEach(p=>{
    const hex=Math.floor(p.alpha*255).toString(16).padStart(2,'0');
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fillStyle='#ffe600'+hex; ctx.fill();
  });

  if(usingMouse){
    ctx.beginPath(); ctx.arc(mouseX,mouseY,8,0,Math.PI*2);
    ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.fill();
    ctx.beginPath(); ctx.arc(mouseX,mouseY,3.5,0,Math.PI*2);
    ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fill();
  }
}

// ── End game ───────────────────────────────────────────────────────────────────
function endGame(){
  gameRunning=false;
  cancelAnimationFrame(animFrame);
  const sz=sizeLevel();
  const overlay=document.getElementById('overlay-screen');
  overlay.innerHTML=`
    <h1>🎉 You Win!</h1>
    <p class="subtitle">All ${totalItems} food items devoured!</p>
    <div class="score-card">
      <span class="big-score">${score} pts</span>
      <div class="breakdown">🍔${itemCounts.burger} &nbsp; 🍕${itemCounts.pizza} &nbsp; 🍣${itemCounts.sushi} &nbsp; 🍗${itemCounts.chicken}</div>
      <div class="meta">Final Size: ${sz} &nbsp;|&nbsp; Total eaten: ${totalItems}</div>
    </div>
    <div class="btn-row">
      <button class="big-btn btn-share" id="share-btn">🔗 Share</button>
      <button class="big-btn btn-play"  id="replay-btn">🔄 Replay</button>
    </div>
  `;
  overlay.style.display='flex';
  document.getElementById('replay-btn').addEventListener('click',startGame);
  document.getElementById('share-btn').addEventListener('click',()=>{
    const text=`🕳️ Jelly Hole\n\nI devoured all ${totalItems} food items and scored ${score} pts!\n🍔${itemCounts.burger} burgers  🍕${itemCounts.pizza} pizzas  🍣${itemCounts.sushi} sushi  🍗${itemCounts.chicken} chicken\nFinal hole size: ${sz}\n\nCan you beat me? 👊`;
    if(navigator.share){
      navigator.share({title:'Jelly Hole',text}).catch(()=>{});
    } else {
      navigator.clipboard.writeText(text).then(()=>{
        const b=document.getElementById('share-btn');
        if(b){ b.textContent='✅ Copied!'; setTimeout(()=>{ if(b) b.textContent='🔗 Share'; },2200); }
      }).catch(()=>{});
    }
  });
}

// ── Start ──────────────────────────────────────────────────────────────────────
function startGame(){
  document.getElementById('overlay-screen').style.display='none';
  initGame();
  gameRunning=true;
  lastTs=performance.now();
  animFrame=requestAnimationFrame(gameLoop);
}

// ── Input ──────────────────────────────────────────────────────────────────────
window.addEventListener('keydown',e=>{
  keys[e.key]=true;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
  usingMouse=false;
});
window.addEventListener('keyup',e=>{ keys[e.key]=false; });

canvas.addEventListener('mousemove',e=>{
  const r=canvas.getBoundingClientRect();
  mouseX=(e.clientX-r.left)*(W/r.width);
  mouseY=(e.clientY-r.top)*(H/r.height);
  usingMouse=true;
});

canvas.addEventListener('touchmove',e=>{
  e.preventDefault();
  const r=canvas.getBoundingClientRect();
  mouseX=(e.touches[0].clientX-r.left)*(W/r.width);
  mouseY=(e.touches[0].clientY-r.top)*(H/r.height);
  usingMouse=true;
},{passive:false});

document.getElementById('start-btn').addEventListener('click',startGame);