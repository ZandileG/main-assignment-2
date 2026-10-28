const game = document.getElementById("game");
const player = document.getElementById("player");
const scoreText = document.getElementById("score");
const message = document.getElementById("message");
const GRAVITY = 2200;
const JUMP_SPEED = 750;
const START_SPEED = 300;
const MAX_SPEED = 650;
const MIN_WAIT = 0.9;
const MAX_WAIT = 1.8;
let playerHeight = 0;
let verticalSpeed = 0;
let obstacles = [];
let score = 0;
let speed = START_SPEED;
let timeToNextObstacle = 1;
let running = false;
let canRestart = true;
let lastTime = 0;

function isOnGround() {
    return playerHeight === 0;
}
function jump() {
    if (isOnGround()) {
        verticalSpeed = JUMP_SPEED;
    }
}
function updatePlayer(dt) {
  verticalSpeed -= GRAVITY * dt;
  playerHeight += verticalSpeed * dt;
  if (playerHeight <= 0) {     // landed
    playerHeight = 0;
    verticalSpeed = 0;
    }
    player.style.transform = "translateY(" + (-playerHeight) + "px)";
}

function spawnObstacle() {
    const element = document.createElement("div");
    element.className = "obstacle";
    const x = game.clientWidth;
    element.style.left = x + "px";
    game.appendChild(element);
    obstacles.push({ element: element, x: x });
}

    function updateObstacles(dt) {
    obstacles.forEach(function (obstacle) {
        obstacle.x -= speed * dt;
        obstacle.element.style.left = obstacle.x + "px";
    });
    obstacles = obstacles.filter(function (obstacle) {
        if (obstacle.x < -obstacle.element.offsetWidth) {
        obstacle.element.remove();
        return false;
        }
        return true;
    });
}

function checkCollision() {
    const margin = 4;
    const p = player.getBoundingClientRect();
    return obstacles.some(function (obstacle) {
    const o = obstacle.element.getBoundingClientRect();
    return (
        p.right - margin > o.left + margin &&
        p.left + margin < o.right - margin &&
        p.bottom - margin > o.top + margin &&
        p.top + margin < o.bottom - margin
    );
    });
}

// ---- Game flow ----
function gameLoop(timestamp) {
    if (!running) {
    return;
    }
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    updatePlayer(dt);
    updateObstacles(dt);

    timeToNextObstacle -= dt;
    if (timeToNextObstacle <= 0) {
    spawnObstacle();
    timeToNextObstacle = MIN_WAIT + Math.random() * (MAX_WAIT - MIN_WAIT);
    }

  score += dt * 10;
  speed = Math.min(START_SPEED + score * 2, MAX_SPEED);
    scoreText.textContent = "Score: " + Math.floor(score);

    if (checkCollision()) {
    endGame();
    return;
    }
    requestAnimationFrame(gameLoop);
}

function startGame() {
    obstacles.forEach(function (obstacle) {
        obstacle.element.remove();
    });
    obstacles = [];
    playerHeight = 0;
    verticalSpeed = 0;
    score = 0;
    speed = START_SPEED;
    timeToNextObstacle = 1;
    player.style.transform = "translateY(0px)";
    scoreText.textContent = "Score: 0";
    message.textContent = "";
    running = true;
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function endGame() {
    running = false;
    message.textContent = "Game over! Score: " + Math.floor(score) + ". Press SPACE to play again";
    canRestart = false;
    setTimeout(function () {
        canRestart = true;
    }, 500);
}
document.addEventListener("keydown", function (event) {
    if (event.code === "Space" || event.code === "ArrowUp") {
    event.preventDefault();
    if (event.repeat) {
        return;
    }
    if (running) {
        jump();
    } else if (canRestart) {
        startGame();
    }
    }
});
