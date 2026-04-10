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
let score = 0;
let isGameOver = false;
let gameSpeed = 5;

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

function update() {
  if (isGameOver) return;

  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  
  canvasCtx.fillStyle = 'rgba(5, 217, 232, 0.05)';
  for(let i=0; i<canvasElement.height; i+=4) {
      canvasCtx.fillRect(0, i, canvasElement.width, 2);
  }

  drawPlayer();
  drawObstacles();

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

  requestAnimationFrame(update);
}

function gameOver() {
  isGameOver = true;
  gameOverScreen.classList.remove('hidden');
}

restartBtn.addEventListener('click', () => {
  isGameOver = false;
  obstacles = [];
  score = 0;
  gameSpeed = 5;
  scoreElement.innerText = score;
  gameOverScreen.classList.add('hidden');
  spawnObstacle();
  update();
});

spawnObstacle();
update();
