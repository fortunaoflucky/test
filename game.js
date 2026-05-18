// Game Constants
const CANVAS = document.getElementById('gameCanvas');
const CTX = CANVAS.getContext('2d');
const CANVAS_WIDTH = CANVAS.width;
const CANVAS_HEIGHT = CANVAS.height;
const TILE_SIZE = 30;

// Game Variables
let gameRunning = false;
let gamePaused = false;
let gameLevel = 1;
let gameScore = 0;
let playerLives = 3;
let enemiesKilled = 0;

// Player Object
const player = {
    x: CANVAS_WIDTH / 2 - TILE_SIZE / 2,
    y: CANVAS_HEIGHT - TILE_SIZE * 2,
    width: TILE_SIZE,
    height: TILE_SIZE,
    speed: 3,
    direction: 0, // 0: Up, 1: Right, 2: Down, 3: Left
    bullets: [],
    alive: true,
    lastShot: 0
};

// Enemies Array
let enemies = [];
let enemyBullets = [];

// Obstacles
let obstacles = [];

// Input Handling
const keys = {};
let touchActive = false;
let accelerometerData = { x: 0, y: 0, z: 0 };

// Event Listeners
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

CANVAS.addEventListener('touchstart', () => {
    touchActive = true;
});

CANVAS.addEventListener('touchend', () => {
    touchActive = false;
});

// Accelerometer Support
if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', (e) => {
        accelerometerData.x = e.beta;  // -180 to 180
        accelerometerData.y = e.gamma; // -90 to 90
        accelerometerData.z = e.alpha; // 0 to 360
    });
}

// Request Permission for iOS 13+
function requestMotionPermission() {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    window.addEventListener('deviceorientation', onDeviceOrientation);
                }
            })
            .catch(console.error);
    } else {
        window.addEventListener('deviceorientation', onDeviceOrientation);
    }
}

function onDeviceOrientation(e) {
    accelerometerData.x = e.beta;
    accelerometerData.y = e.gamma;
}

// Enemy Class
class Enemy {
    constructor(x, y, level) {
        this.x = x;
        this.y = y;
        this.width = TILE_SIZE;
        this.height = TILE_SIZE;
        this.speed = 1.5 + level * 0.3;
        this.direction = Math.floor(Math.random() * 4);
        this.bullets = [];
        this.alive = true;
        this.shootTimer = 0;
        this.changeDirectionTimer = 0;
    }

    update() {
        if (!this.alive) return;

        // Change direction randomly
        this.changeDirectionTimer--;
        if (this.changeDirectionTimer <= 0) {
            this.direction = Math.floor(Math.random() * 4);
            this.changeDirectionTimer = Math.random() * 100 + 50;
        }

        // Move
        let newX = this.x;
        let newY = this.y;

        switch (this.direction) {
            case 0: newY -= this.speed; break; // Up
            case 1: newX += this.speed; break; // Right
            case 2: newY += this.speed; break; // Down
            case 3: newX -= this.speed; break; // Left
        }

        // Collision with walls
        if (newX >= 0 && newX + this.width <= CANVAS_WIDTH &&
            newY >= 0 && newY + this.height <= CANVAS_HEIGHT &&
            !this.collidesWithObstacles(newX, newY)) {
            this.x = newX;
            this.y = newY;
        } else {
            this.direction = Math.floor(Math.random() * 4);
        }

        // Shoot randomly
        this.shootTimer++;
        if (this.shootTimer > 100 + Math.random() * 100) {
            this.shoot();
            this.shootTimer = 0;
        }

        // Update bullets
        this.bullets = this.bullets.filter(b => {
            b.x += b.vx;
            b.y += b.vy;
            return b.x >= 0 && b.x <= CANVAS_WIDTH && b.y >= 0 && b.y <= CANVAS_HEIGHT;
        });
    }

    shoot() {
        const bullet = {
            x: this.x + this.width / 2,
            y: this.y + this.height / 2,
            width: 5,
            height: 5,
            speed: 5,
            vx: 0,
            vy: 0
        };

        switch (this.direction) {
            case 0: bullet.vy = -bullet.speed; break;
            case 1: bullet.vx = bullet.speed; break;
            case 2: bullet.vy = bullet.speed; break;
            case 3: bullet.vx = -bullet.speed; break;
        }

        this.bullets.push(bullet);
    }

    collidesWithObstacles(x, y) {
        for (let obs of obstacles) {
            if (x < obs.x + obs.width &&
                x + this.width > obs.x &&
                y < obs.y + obs.height &&
                y + this.height > obs.y) {
                return true;
            }
        }
        return false;
    }

    draw() {
        if (!this.alive) return;
        CTX.fillStyle = '#FF4444';
        CTX.fillRect(this.x, this.y, this.width, this.height);
        CTX.strokeStyle = '#FF0000';
        CTX.lineWidth = 2;
        CTX.strokeRect(this.x, this.y, this.width, this.height);

        // Draw bullets
        CTX.fillStyle = '#FFFF00';
        for (let bullet of this.bullets) {
            CTX.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        }
    }
}

// Initialize Game
function initGame() {
    enemies = [];
    obstacles = [];
    player.bullets = [];
    enemyBullets = [];
    player.alive = true;
    player.x = CANVAS_WIDTH / 2 - TILE_SIZE / 2;
    player.y = CANVAS_HEIGHT - TILE_SIZE * 2;
    player.direction = 0; // Default to up

    // Create obstacles
    createObstacles();

    // Create enemies
    const enemyCount = 3 + gameLevel;
    for (let i = 0; i < enemyCount; i++) {
        let x, y, valid;
        do {
            valid = true;
            x = Math.random() * (CANVAS_WIDTH - TILE_SIZE);
            y = Math.random() * (CANVAS_HEIGHT / 2);

            // Check if too close to player
            if (Math.abs(x - player.x) < 100 && Math.abs(y - player.y) < 100) {
                valid = false;
            }
        } while (!valid);

        enemies.push(new Enemy(x, y, gameLevel));
    }

    updateUI();
}

function createObstacles() {
    const gridW = CANVAS_WIDTH / TILE_SIZE;
    const gridH = CANVAS_HEIGHT / TILE_SIZE;

    for (let i = 0; i < 20; i++) {
        let x = Math.floor(Math.random() * (gridW - 2) + 1) * TILE_SIZE;
        let y = Math.floor(Math.random() * (gridH - 3)) * TILE_SIZE;

        if (Math.abs(x - player.x) > 150 || Math.abs(y - player.y) > 150) {
            obstacles.push({
                x: x,
                y: y,
                width: TILE_SIZE,
                height: TILE_SIZE,
                health: 2
            });
        }
    }
}

// Update Player Movement
function updatePlayer() {
    if (!player.alive) return;

    let moveX = 0;
    let moveY = 0;
    let newDirection = null;

    // Keyboard input
    if (keys['ArrowUp'] || keys['w'] || keys['W']) {
        moveY = -player.speed;
        newDirection = 0; // Up
    }
    if (keys['ArrowDown'] || keys['s'] || keys['S']) {
        moveY = player.speed;
        newDirection = 2; // Down
    }
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
        moveX = -player.speed;
        newDirection = 3; // Left
    }
    if (keys['ArrowRight'] || keys['d'] || keys['D']) {
        moveX = player.speed;
        newDirection = 1; // Right
    }

    // Mobile accelerometer input
    if (Math.abs(accelerometerData.x) > 10) {
        if (accelerometerData.x > 0) {
            moveY = player.speed;
            newDirection = 2; // Down
        } else {
            moveY = -player.speed;
            newDirection = 0; // Up
        }
    }
    if (Math.abs(accelerometerData.y) > 10) {
        if (accelerometerData.y > 0) {
            moveX = player.speed;
            newDirection = 1; // Right
        } else {
            moveX = -player.speed;
            newDirection = 3; // Left
        }
    }

    // Update direction if moving
    if (newDirection !== null) {
        player.direction = newDirection;
    }

    // Apply movement
    let newX = player.x + moveX;
    let newY = player.y + moveY;

    // Boundary collision
    if (newX >= 0 && newX + player.width <= CANVAS_WIDTH) {
        player.x = newX;
    }
    if (newY >= 0 && newY + player.height <= CANVAS_HEIGHT) {
        player.y = newY;
    }

    // Obstacle collision
    for (let obs of obstacles) {
        if (player.x < obs.x + obs.width &&
            player.x + player.width > obs.x &&
            player.y < obs.y + obs.height &&
            player.y + player.height > obs.y) {
            player.x -= moveX;
            player.y -= moveY;
        }
    }

    // Shooting
    if (keys[' '] || touchActive) {
        player.shoot();
    }

    // Update bullets
    player.bullets = player.bullets.filter(b => {
        b.x += b.vx;
        b.y += b.vy;
        return b.x >= 0 && b.x <= CANVAS_WIDTH && b.y >= 0 && b.y <= CANVAS_HEIGHT;
    });
}

// Player Shoot
player.shoot = function() {
    const now = Date.now();
    if (this.bullets.length < 3 && now - this.lastShot > 100) {
        const bullet = {
            x: this.x + this.width / 2,
            y: this.y + this.height / 2,
            width: 4,
            height: 10,
            speed: 6,
            vx: 0,
            vy: 0
        };

        // Shoot in the direction the tank is facing
        switch (this.direction) {
            case 0: // Up
                bullet.vy = -bullet.speed;
                bullet.y = this.y;
                break;
            case 1: // Right
                bullet.vx = bullet.speed;
                bullet.x = this.x + this.width;
                bullet.width = 10;
                bullet.height = 4;
                break;
            case 2: // Down
                bullet.vy = bullet.speed;
                bullet.y = this.y + this.height;
                break;
            case 3: // Left
                bullet.vx = -bullet.speed;
                bullet.x = this.x;
                bullet.width = 10;
                bullet.height = 4;
                break;
        }

        this.bullets.push(bullet);
        this.lastShot = now;
    }
};

// Collision Detection
function checkCollisions() {
    // Player bullets vs enemies
    for (let i = player.bullets.length - 1; i >= 0; i--) {
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (enemies[j].alive && checkRectCollision(
                player.bullets[i].x, player.bullets[i].y, 
                player.bullets[i].width, player.bullets[i].height,
                enemies[j].x, enemies[j].y, 
                enemies[j].width, enemies[j].height)) {
                
                player.bullets.splice(i, 1);
                enemies[j].alive = false;
                gameScore += 100;
                enemiesKilled++;
                break;
            }
        }
    }

    // Enemy bullets vs player
    for (let i = 0; i < enemies.length; i++) {
        for (let j = 0; j < enemies[i].bullets.length; j++) {
            if (checkRectCollision(
                enemies[i].bullets[j].x, enemies[i].bullets[j].y,
                enemies[i].bullets[j].width, enemies[i].bullets[j].height,
                player.x, player.y,
                player.width, player.height)) {
                
                player.alive = false;
                playerLives--;
                break;
            }
        }
    }

    // Bullets vs obstacles
    for (let bullet of player.bullets) {
        for (let obs of obstacles) {
            if (checkRectCollision(bullet.x, bullet.y, bullet.width, bullet.height,
                obs.x, obs.y, obs.width, obs.height)) {
                obs.health--;
            }
        }
    }

    obstacles = obstacles.filter(obs => obs.health > 0);
}

function checkRectCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

// Draw Game
function draw() {
    // Clear canvas
    CTX.fillStyle = '#222';
    CTX.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid
    CTX.strokeStyle = '#444';
    CTX.lineWidth = 0.5;
    for (let i = 0; i <= CANVAS_WIDTH; i += TILE_SIZE) {
        CTX.beginPath();
        CTX.moveTo(i, 0);
        CTX.lineTo(i, CANVAS_HEIGHT);
        CTX.stroke();
    }
    for (let i = 0; i <= CANVAS_HEIGHT; i += TILE_SIZE) {
        CTX.beginPath();
        CTX.moveTo(0, i);
        CTX.lineTo(CANVAS_WIDTH, i);
        CTX.stroke();
    }

    // Draw obstacles
    CTX.fillStyle = '#888';
    for (let obs of obstacles) {
        CTX.fillRect(obs.x, obs.y, obs.width, obs.height);
        CTX.strokeStyle = '#666';
        CTX.lineWidth = 1;
        CTX.strokeRect(obs.x, obs.y, obs.width, obs.height);
    }

    // Draw player
    if (player.alive) {
        CTX.fillStyle = '#00FF00';
        CTX.fillRect(player.x, player.y, player.width, player.height);
        CTX.strokeStyle = '#00AA00';
        CTX.lineWidth = 2;
        CTX.strokeRect(player.x, player.y, player.width, player.height);

        // Draw direction indicator
        CTX.fillStyle = '#00AA00';
        const cx = player.x + player.width / 2;
        const cy = player.y + player.height / 2;
        const indicatorLength = 10;
        
        switch (player.direction) {
            case 0: // Up
                CTX.fillRect(cx - 2, player.y - 5, 4, 5);
                break;
            case 1: // Right
                CTX.fillRect(player.x + player.width, cy - 2, 5, 4);
                break;
            case 2: // Down
                CTX.fillRect(cx - 2, player.y + player.height, 4, 5);
                break;
            case 3: // Left
                CTX.fillRect(player.x - 5, cy - 2, 5, 4);
                break;
        }

        // Draw bullets
        CTX.fillStyle = '#00FF00';
        for (let bullet of player.bullets) {
            CTX.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        }
    }

    // Draw enemies
    for (let enemy of enemies) {
        enemy.draw();
    }
}

// Update Game State
function update() {
    if (!gameRunning || gamePaused) return;

    if (!player.alive) {
        if (playerLives > 0) {
            setTimeout(() => {
                player.alive = true;
                player.x = CANVAS_WIDTH / 2 - TILE_SIZE / 2;
                player.y = CANVAS_HEIGHT - TILE_SIZE * 2;
            }, 1000);
        } else {
            endGame();
            return;
        }
    }

    updatePlayer();

    for (let enemy of enemies) {
        enemy.update();
    }

    checkCollisions();

    // Level complete
    if (enemies.every(e => !e.alive)) {
        gameLevel++;
        gameScore += 1000;
        initGame();
    }

    updateUI();
}

// Game Loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start Game
function startGame() {
    if (!gameRunning) {
        gameRunning = true;
        gamePaused = false;
        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
        requestMotionPermission();
    }
}

// Toggle Pause
function togglePause() {
    if (gameRunning) {
        gamePaused = !gamePaused;
        document.getElementById('pauseBtn').textContent = gamePaused ? 'Resume' : 'Pause';
    }
}

// Reset Game
function resetGame() {
    gameRunning = false;
    gamePaused = false;
    gameLevel = 1;
    gameScore = 0;
    playerLives = 3;
    enemiesKilled = 0;
    player.alive = true;
    player.bullets = [];
    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
    document.getElementById('pauseBtn').textContent = 'Pause';
    initGame();
    draw();
}

// End Game
function endGame() {
    gameRunning = false;
    alert(`Game Over! Final Score: ${gameScore}\nLevel: ${gameLevel}\nEnemies Destroyed: ${enemiesKilled}`);
    resetGame();
}

// Update UI
function updateUI() {
    document.getElementById('score').textContent = gameScore;
    document.getElementById('level').textContent = gameLevel;
    document.getElementById('lives').textContent = playerLives;
    document.getElementById('enemies').textContent = enemies.filter(e => e.alive).length;
}

// Initialize
window.addEventListener('load', () => {
    initGame();
    draw();
    gameLoop();
});