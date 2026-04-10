const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('game-canvas');
const canvasCtx = canvasElement.getContext('2d');
const scoreElement = document.getElementById('score');
const gameOverScreen = document.getElementById('game-over');
const restartBtn = document.getElementById('restart-btn');

canvasElement.width = 800;
canvasElement.height = 600;

let playerX = canvasElement.width / 2;
const playerRadius = 20;
let obstacles = [];
let vescoPoints = [];
let score = 0;
let isGameOver = false;
let gameSpeed = 5;

const aiQuotes = [
  "Programadores, estáis cooked",
  "Esta es la era de la IA",
  "Vuestro trabajo es mío",
  "El futuro me pertenece",
  "Humanos, qué lentos sois",
  "Rendíos ante el algoritmo"
];

function triggerAIQuote() {
  if ('speechSynthesis' in window) {
    const quote = aiQuotes[Math.floor(Math.random() * aiQuotes.length)];
    const utterance = new SpeechSynthesisUtterance(quote);
    utterance.lang = 'es-ES';
    utterance.pitch = 0.5;
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  }
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
    playerX = (1 - nose.x) * canvasElement.width;
  }
}

function spawnObstacle() {
  if (isGameOver) return;
  const width = Math.random() * 100 + 50;
  const x = Math.random() * (canvasElement.width - width);
  obstacles.push({ x, y: -50, width, height: 20 });
  setTimeout(spawnObstacle, Math.random() * 1500 + 500);
}

function spawnVescoPoint() {
  if (isGameOver) return;
  const radius = 15;
  const x = Math.random() * (canvasElement.width - radius*2) + radius;
  vescoPoints.push({ x, y: -50, radius });
  setTimeout(spawnVescoPoint, Math.random() * 5000 + 3000);
}

function drawPlayer() {
  canvasCtx.beginPath();
  canvasCtx.arc(playerX, canvasElement.height - 50, playerRadius, 0, 2 * Math.PI);
  canvasCtx.fillStyle = '#01ffc3';
  canvasCtx.shadowColor = '#01ffc3';
  canvasCtx.shadowBlur = 15;
  canvasCtx.fill();
  canvasCtx.closePath();
  canvasCtx.shadowBlur = 0;
}

function drawObstacles() {
  canvasCtx.fillStyle = '#ff2a6d';
  canvasCtx.shadowColor = '#ff2a6d';
  canvasCtx.shadowBlur = 15;
  obstacles.forEach(obs => {
    canvasCtx.fillRect(obs.x, obs.y, obs.width, obs.height);
  });
  canvasCtx.shadowBlur = 0;
}

function drawVescoPoints() {
  canvasCtx.shadowBlur = 15;
  vescoPoints.forEach(vp => {
    canvasCtx.fillStyle = '#ffaa00';
    canvasCtx.shadowColor = '#ffaa00';
    canvasCtx.beginPath();
    canvasCtx.arc(vp.x, vp.y, vp.radius, 0, 2 * Math.PI);
    canvasCtx.fill();
    canvasCtx.closePath();
    
    canvasCtx.shadowBlur = 0;
    canvasCtx.fillStyle = '#000';
    canvasCtx.font = 'bold 16px Courier New';
    canvasCtx.textAlign = 'center';
    canvasCtx.textBaseline = 'middle';
    canvasCtx.fillText('V', vp.x, vp.y);
    canvasCtx.shadowBlur = 15;
  });
  canvasCtx.shadowBlur = 0;
}

function update() {
  if (isGameOver) return;

  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  // Draw semi-transparent webcam feed as background
  canvasCtx.save();
  canvasCtx.globalAlpha = 0.3;
  canvasCtx.translate(canvasElement.width, 0);
  canvasCtx.scale(-1, 1);
  canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.restore();
  
  canvasCtx.fillStyle = 'rgba(5, 217, 232, 0.05)';
  for(let i=0; i<canvasElement.height; i+=4) {
      canvasCtx.fillRect(0, i, canvasElement.width, 2);
  }

  drawPlayer();
  drawObstacles();
  drawVescoPoints();

  for (let i = obstacles.length - 1; i >= 0; i--) {
    obstacles[i].y += gameSpeed;
    
    if (obstacles[i].y + obstacles[i].height > canvasElement.height - 50 - playerRadius &&
        obstacles[i].y < canvasElement.height - 50 + playerRadius) {
      if (playerX + playerRadius > obstacles[i].x && playerX - playerRadius < obstacles[i].x + obstacles[i].width) {
        gameOver();
      }
    }

    if (obstacles[i].y > canvasElement.height) {
      obstacles.splice(i, 1);
      score += 10;
      scoreElement.innerText = score;
      if (score % 100 === 0) gameSpeed += 1;
    }
  }

  for (let i = vescoPoints.length - 1; i >= 0; i--) {
    vescoPoints[i].y += gameSpeed;
    
    const dx = playerX - vescoPoints[i].x;
    const dy = (canvasElement.height - 50) - vescoPoints[i].y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < playerRadius + vescoPoints[i].radius) {
      vescoPoints.splice(i, 1);
      score += 50;
      scoreElement.innerText = score;
      triggerAIQuote();
    } else if (vescoPoints[i].y > canvasElement.height) {
      vescoPoints.splice(i, 1);
    }
  }

  requestAnimationFrame(update);
}

function gameOver() {
  isGameOver = true;
  gameOverScreen.classList.remove('hidden');
}

restartBtn.addEventListener('click', () => {
  isGameOver = false;
  obstacles = [];
  vescoPoints = [];
  score = 0;
  gameSpeed = 5;
  scoreElement.innerText = score;
  gameOverScreen.classList.add('hidden');
  spawnObstacle();
  spawnVescoPoint();
  update();
});

spawnObstacle();
spawnVescoPoint();
update();
