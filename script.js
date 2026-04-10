const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('game-canvas');
const canvasCtx = canvasElement.getContext('2d');
const scoreElement = document.getElementById('score');
const gameOverScreen = document.getElementById('game-over');
const restartBtn = document.getElementById('restart-btn');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');

canvasElement.width = 800;
canvasElement.height = 600;

// Music
const bgm = new Audio('bgm.mp3');
bgm.loop = true;
bgm.volume = 0.3;

// Voices
const voiceClips = [
  new Audio('voice1.mp3'),
  new Audio('voice2.mp3'),
  new Audio('voice3.mp3')
];

let playerX = 0; // World X
const playerRadius = 20;
let obstacles = [];
let vescoPoints = [];
let score = 0;
let isGameOver = false;
let gameSpeed = 10;
let focalLength = 300;

function triggerAIQuote() {
  const clip = voiceClips[Math.floor(Math.random() * voiceClips.length)];
  clip.currentTime = 0;
  clip.play();
}

const faceMesh = new FaceMesh({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
}});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: false,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

faceMesh.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await faceMesh.send({image: videoElement});
  },
  width: 640,
  height: 480
});
camera.start();

function onResults(results) {
  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    const nose = results.multiFaceLandmarks[0][1];
    // Map nose.x (0 to 1) to world X (-400 to 400)
    playerX = ((1 - nose.x) - 0.5) * 800;
  }
}

function spawnObstacle() {
  if (isGameOver) return;
  const width = Math.random() * 100 + 50;
  const x = (Math.random() - 0.5) * 800;
  obstacles.push({ x, y: 100, z: 1500, width, height: 50 });
  setTimeout(spawnObstacle, Math.random() * 1000 + 500);
}

function spawnVescoPoint() {
  if (isGameOver) return;
  const radius = 15;
  const x = (Math.random() - 0.5) * 800;
  vescoPoints.push({ x, y: 100, z: 1500, radius });
  setTimeout(spawnVescoPoint, Math.random() * 3000 + 2000);
}

function project(x, y, z) {
  const scale = focalLength / (focalLength + z);
  return {
    x: (canvasElement.width / 2) + x * scale,
    y: (canvasElement.height / 2) + y * scale,
    scale: scale
  };
}

function drawPlayer() {
  const p = project(playerX, 100, 0); // Player is at z=0, y=100
  canvasCtx.beginPath();
  canvasCtx.arc(p.x, p.y, playerRadius * p.scale, 0, 2 * Math.PI);
  canvasCtx.fillStyle = '#01ffc3';
  canvasCtx.shadowColor = '#01ffc3';
  canvasCtx.shadowBlur = 15;
  canvasCtx.fill();
  canvasCtx.closePath();
  canvasCtx.shadowBlur = 0;
}

function drawGrid() {
  canvasCtx.strokeStyle = 'rgba(5, 217, 232, 0.3)';
  canvasCtx.lineWidth = 1;
  // Draw ground grid
  for (let z = 0; z <= 1500; z += 100) {
    let p1 = project(-500, 150, z);
    let p2 = project(500, 150, z);
    canvasCtx.beginPath();
    canvasCtx.moveTo(p1.x, p1.y);
    canvasCtx.lineTo(p2.x, p2.y);
    canvasCtx.stroke();
  }
}

function drawObstacles() {
  canvasCtx.fillStyle = '#ff2a6d';
  canvasCtx.shadowColor = '#ff2a6d';
  canvasCtx.shadowBlur = 15;
  
  // Sort by z descending
  obstacles.sort((a, b) => b.z - a.z).forEach(obs => {
    const p = project(obs.x, obs.y, obs.z);
    if (p.scale > 0) {
      canvasCtx.fillRect(p.x - (obs.width/2)*p.scale, p.y - (obs.height/2)*p.scale, obs.width * p.scale, obs.height * p.scale);
    }
  });
  canvasCtx.shadowBlur = 0;
}

function drawVescoPoints() {
  canvasCtx.shadowBlur = 15;
  vescoPoints.sort((a, b) => b.z - a.z).forEach(vp => {
    const p = project(vp.x, vp.y, vp.z);
    if (p.scale > 0) {
      canvasCtx.fillStyle = '#ffaa00';
      canvasCtx.shadowColor = '#ffaa00';
      canvasCtx.beginPath();
      canvasCtx.arc(p.x, p.y, vp.radius * p.scale, 0, 2 * Math.PI);
      canvasCtx.fill();
      canvasCtx.closePath();
      
      canvasCtx.shadowBlur = 0;
      canvasCtx.fillStyle = '#000';
      canvasCtx.font = `bold ${Math.max(8, 16 * p.scale)}px Courier New`;
      canvasCtx.textAlign = 'center';
      canvasCtx.textBaseline = 'middle';
      canvasCtx.fillText('V', p.x, p.y);
      canvasCtx.shadowBlur = 15;
    }
  });
  canvasCtx.shadowBlur = 0;
}

function update() {
  if (isGameOver) return;

  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  canvasCtx.save();
  canvasCtx.globalAlpha = 0.3;
  canvasCtx.translate(canvasElement.width, 0);
  canvasCtx.scale(-1, 1);
  canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.restore();

  drawGrid();
  drawObstacles();
  drawVescoPoints();
  drawPlayer();

  // Update logic
  for (let i = obstacles.length - 1; i >= 0; i--) {
    obstacles[i].z -= gameSpeed;
    
    // Collision detection
    if (Math.abs(obstacles[i].z) < 20) {
      if (Math.abs(obstacles[i].x - playerX) < (obstacles[i].width/2 + playerRadius)) {
        gameOver();
      }
    }

    if (obstacles[i].z < -100) {
      obstacles.splice(i, 1);
      score += 10;
      scoreElement.innerText = score;
      if (score % 100 === 0) gameSpeed += 1;
    }
  }

  for (let i = vescoPoints.length - 1; i >= 0; i--) {
    vescoPoints[i].z -= gameSpeed;
    
    if (Math.abs(vescoPoints[i].z) < 20) {
      if (Math.abs(vescoPoints[i].x - playerX) < (vescoPoints[i].radius + playerRadius)) {
        vescoPoints.splice(i, 1);
        score += 50;
        scoreElement.innerText = score;
        triggerAIQuote();
      }
    } else if (vescoPoints[i].z < -100) {
      vescoPoints.splice(i, 1);
    }
  }

  requestAnimationFrame(update);
}

function gameOver() {
  isGameOver = true;
  gameOverScreen.classList.remove('hidden');
  bgm.pause();
}

restartBtn.addEventListener('click', () => {
  isGameOver = false;
  obstacles = [];
  vescoPoints = [];
  score = 0;
  gameSpeed = 10;
  scoreElement.innerText = score;
  gameOverScreen.classList.add('hidden');
  bgm.play().catch(e=>console.log("Audio play failed:", e));
  spawnObstacle();
  spawnVescoPoint();
  update();
});

startBtn.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  bgm.play().catch(e=>console.log("Audio play failed:", e));
  spawnObstacle();
  spawnVescoPoint();
  update();
});
