const game = document.getElementById("game");
const player = document.getElementById("player");
const scoreText = document.getElementById("score");
const message = document.getElementById("message");
const fxLayer = document.getElementById("fx");
const muteButton = document.getElementById("mute-button");

const GRAVITY = 2200;
const JUMP_SPEED = 750;
const START_SPEED = 300;
const MAX_SPEED = 650;
const MIN_WAIT = 0.9;
const MAX_WAIT = 1.8;
const MAX_JUMP_HEIGHT = (JUMP_SPEED * JUMP_SPEED) / (2 * GRAVITY);
const PLAYER_LEFT_RATIO = 0.08;
const MAX_FX = 12;

let playerHeight = 0;
let verticalSpeed = 0;
let obstacles = [];
let score = 0;
let speed = START_SPEED;
let timeToNextObstacle = 1;
let running = false;
let canRestart = true;
let lastTime = 0;
let muted = false;
let audio;

function isOnGround() {
    return playerHeight === 0;
}

function difficulty() {
    return Math.min(score / 18, 1);
}

function currentSpeed() {
    return START_SPEED + (MAX_SPEED - START_SPEED) * difficulty();
}

function nextSpawnDelay() {
    const t = difficulty();
    const minWait = MIN_WAIT - t * 0.22;
    const maxWait = MAX_WAIT - t * 0.55;
    const jumpTime = (2 * JUMP_SPEED) / GRAVITY;
    const minSafeWait = jumpTime + 0.22;
    const wait = minWait + Math.random() * Math.max(0.12, maxWait - minWait);
    return Math.max(wait, minSafeWait);
}

function jump() {
    if (isOnGround()) {
        verticalSpeed = JUMP_SPEED;
        player.classList.remove("landing", "running");
        player.classList.add("airborne");
        playJumpSound();
    }
}

function setPlayerTransform() {
    player.style.setProperty("--player-y", (-playerHeight) + "px");
    if (!player.classList.contains("running") && !player.classList.contains("landing")) {
        player.style.transform = "translateY(" + (-playerHeight) + "px)";
    }
}

function updatePlayer(dt) {
    const groundedBefore = isOnGround();

    verticalSpeed -= GRAVITY * dt;
    playerHeight += verticalSpeed * dt;

    if (playerHeight <= 0) {
        playerHeight = 0;
        verticalSpeed = 0;
    }

    if (groundedBefore && !isOnGround()) {
        player.classList.add("airborne");
        player.classList.remove("running", "landing");
    } else if (!groundedBefore && isOnGround()) {
        player.classList.remove("airborne");
        player.classList.add("running", "landing");
        spawnDust();
        setTimeout(function () {
            player.classList.remove("landing");
        }, 180);
    }

    setPlayerTransform();
}

function spawnObstacle() {
    const t = difficulty();
    const minHeight = 26;
    const maxHeight = Math.min(38 + t * 34, MAX_JUMP_HEIGHT - 42);
    const height = Math.round(minHeight + Math.random() * Math.max(6, maxHeight - minHeight));
    const width = Math.round(16 + Math.random() * 10);
    const sizeClass = height < 34 ? "obstacle-short" : height < 52 ? "obstacle-medium" : "obstacle-tall";

    const element = document.createElement("div");
    element.className = "obstacle " + sizeClass;
    element.style.height = height + "px";
    element.style.width = width + "px";

    const x = game.clientWidth;
    element.style.left = x + "px";

    game.appendChild(element);
    obstacles.push({
        element: element,
        x: x,
        scored: false
    });
}

function playerLeftX() {
    return game.clientWidth * PLAYER_LEFT_RATIO;
}

function awardPoint(obstacle) {
    if (obstacle.scored) {
        return;
    }
    obstacle.scored = true;
    score += 1;
    speed = currentSpeed();
    scoreText.textContent = "Score: " + score;
    scoreText.classList.remove("bump");
    void scoreText.offsetWidth;
    scoreText.classList.add("bump");
    spawnScorePop(obstacle);
    playScoreSound();
}

function updateObstacles(dt) {
    const passLine = playerLeftX();

    obstacles.forEach(function (obstacle) {
        obstacle.x -= speed * dt;
        obstacle.element.style.left = obstacle.x + "px";

        if (!obstacle.scored && obstacle.x + obstacle.element.offsetWidth < passLine) {
            awardPoint(obstacle);
        }
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

function spawnDust() {
    if (fxLayer.childElementCount >= MAX_FX) {
        return;
    }

    const playerBox = player.getBoundingClientRect();
    const gameBox = game.getBoundingClientRect();
    const originX = playerBox.left - gameBox.left + playerBox.width * 0.35;
    const originY = playerBox.bottom - gameBox.top - 10;

    for (let i = 0; i < 3; i += 1) {
        const dust = document.createElement("span");
        dust.className = "dust";
        dust.style.left = originX + "px";
        dust.style.top = originY + "px";
        dust.style.setProperty("--dust-x", (8 + Math.random() * 16) + "px");
        dust.style.setProperty("--dust-y", (-10 - Math.random() * 14) + "px");
        fxLayer.appendChild(dust);
        setTimeout(function () {
            dust.remove();
        }, 420);
    }
}

function spawnScorePop(obstacle) {
    if (fxLayer.childElementCount >= MAX_FX) {
        return;
    }

    const box = obstacle.element.getBoundingClientRect();
    const gameBox = game.getBoundingClientRect();
    const pop = document.createElement("span");
    pop.className = "score-pop";
    pop.textContent = "+1";
    pop.style.left = (box.left - gameBox.left + box.width / 2) + "px";
    pop.style.top = (box.top - gameBox.top - 8) + "px";
    fxLayer.appendChild(pop);
    setTimeout(function () {
        pop.remove();
    }, 700);
}

function clearEffects() {
    fxLayer.replaceChildren();
    game.classList.remove("shake", "hit");
    player.classList.remove("airborne", "landing");
}

function getAudio() {
    if (!audio) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) {
            return null;
        }
        audio = {
            ctx: new AudioContext(),
            musicNodes: null
        };
    }
    if (audio.ctx.state === "suspended") {
        audio.ctx.resume();
    }
    return audio;
}

function playTone(frequency, duration, type, volume, slideTo) {
    if (muted) {
        return;
    }
    const mgr = getAudio();
    if (!mgr) {
        return;
    }

    const ctx = mgr.ctx;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    if (slideTo) {
        oscillator.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
    }
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
}

function playJumpSound() {
    playTone(520, 0.12, "square", 0.05, 740);
}

function playScoreSound() {
    playTone(880, 0.08, "sine", 0.04, 1180);
}

function playHitSound() {
    playTone(180, 0.22, "sawtooth", 0.07, 70);
}

function playGameOverSound() {
    playTone(330, 0.18, "triangle", 0.05, 220);
    setTimeout(function () {
        playTone(220, 0.28, "triangle", 0.05, 110);
    }, 160);
}

function playMusicNote() {
    if (!audio || !audio.musicNodes || muted) {
        return;
    }
    const notes = audio.musicNodes.notes;
    const note = notes[audio.musicNodes.step % notes.length];
    audio.musicNodes.step += 1;
    playTone(note, 0.28, "sine", 0.03, note * 1.01);
}

function startMusic() {
    if (muted) {
        return;
    }
    const mgr = getAudio();
    if (!mgr || mgr.musicNodes) {
        return;
    }

    mgr.musicNodes = {
        notes: [196, 247, 294, 330, 392, 330, 294, 247],
        step: 0,
        interval: setInterval(playMusicNote, 420)
    };
    playMusicNote();
}

function stopMusic() {
    if (!audio || !audio.musicNodes) {
        return;
    }
    clearInterval(audio.musicNodes.interval);
    audio.musicNodes = null;
}

function updateMuteButton() {
    muteButton.textContent = muted ? "Sound off" : "Sound on";
    muteButton.setAttribute("aria-pressed", muted ? "true" : "false");
    muteButton.setAttribute("aria-label", muted ? "Unmute sound" : "Mute sound");
}

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
        timeToNextObstacle = nextSpawnDelay();
    }

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
    clearEffects();
    player.style.transform = "translateY(0px)";
    player.style.setProperty("--player-y", "0px");
    player.classList.add("running");
    scoreText.textContent = "Score: 0";
    scoreText.classList.remove("bump");
    message.textContent = "";
    running = true;

    startMusic();
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function endGame() {
    running = false;
    player.classList.remove("running", "airborne");
    game.classList.add("shake", "hit");
    playHitSound();
    playGameOverSound();
    stopMusic();
    message.textContent = "Game over!\nScore: " + score + "\nPress SPACE to restart";
    canRestart = false;

    setTimeout(function () {
        canRestart = true;
        game.classList.remove("shake", "hit");
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

muteButton.addEventListener("click", function () {
    muted = !muted;
    updateMuteButton();
    if (muted) {
        stopMusic();
    } else if (running) {
        startMusic();
    }
});
