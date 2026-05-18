// Game Constants
const CANVAS = document.getElementById('gameCanvas');
const CTX = CANVAS.getContext('2d');
const CANVAS_WIDTH = CANVAS.width;
const CANVAS_HEIGHT = CANVAS.height;
const TILE_SIZE = 30;

// Block Types
const BLOCK_TYPES = {
    EMPTY: 0,
    WATER: 1,      // Голубые - проезжать нельзя, снаряды пролетают
    BUSH: 2,       // Зелёные - можно прятаться, не ломаются
    BRICK: 3,      // Коричневые - не проезжать, не пролетают, 3 выстрела
    STEEL: 4       // Стальные - не ломаются, не проезжать, не пролетают
};

// Teams
const TEAMS = {
    ALLY: 'ally',
    ENEMY: 'enemy'
};

// Game Variables
let gameRunning = false;
let gamePaused = false;
let gameTime = 0;
let mapChangeTimer = 0;
const MAP_CHANGE_INTERVAL = 30000; // 30 секунд

let allies = [];
let enemies = [];
let allBullets = [];
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
        accelerometerData.x = e.beta;
        accelerometerData.y = e.gamma;
    });
}

function requestMotionPermission() {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    window.addEventListener('deviceorientation', onDeviceOrientation);
                }
            })
            .catch(console.error);
    }
}

function onDeviceOrientation(e) {
    accelerometerData.x = e.beta;
    accelerometerData.y = e.gamma;
}

// Tank Class
class Tank {
    constructor(x, y, team, isPlayer = false) {
        this.x = x;
        this.y = y;
        this.team = team;
        this.isPlayer = isPlayer;
        this.width = TILE_SIZE;
        this.height = TILE_SIZE;
        this.speed = 2;
        this.direction = 0; // 0: Up, 1: Right, 2: Down, 3: Left
        this.alive = true;
        this.level = 1;
        this.health = 1;
        this.kills = 0;
        this.damage = 0;
        this.lastShot = 0;
        this.shootCooldown = 300; // ms
        this.deathTime = 0;
        this.aiTimer = 0;
        this.aiChangeDirection = 0;
    }

    getShootCooldown() {
        // Уменьшаем cooldown с каждым уровнем (минимум 100ms)
        return Math.max(100, this.shootCooldown - (this.level - 1) * 30);
    }

    getNumAngles() {
        // Количество углов = level + 2 (circle = бесконечные углы)
        return this.level + 2;
    }

    canMove(newX, newY) {
        if (newX < 0 || newX + this.width > CANVAS_WIDTH ||
            newY < 0 || newY + this.height > CANVAS_HEIGHT) {
            return false;
        }

        // Проверка столкновения с препятствиями
        for (let obs of obstacles) {
            if (this.collidesWith(newX, newY, obs)) {
                if (obs.type === BLOCK_TYPES.WATER || obs.type === BLOCK_TYPES.STEEL || obs.type === BLOCK_TYPES.BRICK) {
                    return false;
                }
            }
        }

        // Проверка столкновения с другими танками
        for (let tank of [...allies, ...enemies]) {
            if (tank !== this && tank.alive) {
                if (newX < tank.x + tank.width &&
                    newX + this.width > tank.x &&
                    newY < tank.y + tank.height &&
                    newY + this.height > tank.y) {
                    return false;
                }
            }
        }

        return true;
    }

    collidesWith(x, y, obstacle) {
        return x < obstacle.x + obstacle.width &&
               x + this.width > obstacle.x &&
               y < obstacle.y + obstacle.height &&
               y + this.height > obstacle.y;
    }

    update() {
        if (!this.alive) {
            if (Date.now() - this.deathTime > 5000) {
                this.respawn();
            }
            return;
        }

        // AI for non-player tanks
        if (!this.isPlayer) {
            this.updateAI();
        }

        // Movement
        let moveX = 0;
        let moveY = 0;
        let newDirection = null;

        if (this.isPlayer) {
            // Player input
            if (keys['ArrowUp'] || keys['w'] || keys['W']) {
                moveY = -this.speed;
                newDirection = 0;
            }
            if (keys['ArrowDown'] || keys['s'] || keys['S']) {
                moveY = this.speed;
                newDirection = 2;
            }
            if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
                moveX = -this.speed;
                newDirection = 3;
            }
            if (keys['ArrowRight'] || keys['d'] || keys['D']) {
                moveX = this.speed;
                newDirection = 1;
            }

            if (Math.abs(accelerometerData.x) > 10) {
                if (accelerometerData.x > 0) {
                    moveY = this.speed;
                    newDirection = 2;
                } else {
                    moveY = -this.speed;
                    newDirection = 0;
                }
            }
            if (Math.abs(accelerometerData.y) > 10) {
                if (accelerometerData.y > 0) {
                    moveX = this.speed;
                    newDirection = 1;
                } else {
                    moveX = -this.speed;
                    newDirection = 3;
                }
            }
        } else {
            // AI movement
            switch (this.direction) {
                case 0: moveY = -this.speed; break;
                case 1: moveX = this.speed; break;
                case 2: moveY = this.speed; break;
                case 3: moveX = -this.speed; break;
            }
        }

        if (newDirection !== null) {
            this.direction = newDirection;
        }

        let newX = this.x + moveX;
        let newY = this.y + moveY;

        if (this.canMove(newX, newY)) {
            this.x = newX;
            this.y = newY;
        } else if (!this.isPlayer) {
            this.direction = Math.floor(Math.random() * 4);
        }

        // Shooting
        if (this.isPlayer && (keys[' '] || touchActive)) {
            this.shoot();
        } else if (!this.isPlayer) {
            if (Math.random() < 0.01) {
                this.shoot();
            }
        }
    }

    updateAI() {
        this.aiTimer++;
        this.aiChangeDirection++;

        if (this.aiChangeDirection > 60 + Math.random() * 60) {
            this.direction = Math.floor(Math.random() * 4);
            this.aiChangeDirection = 0;
        }
    }

    shoot() {
        const now = Date.now();
        if (now - this.lastShot < this.getShootCooldown()) {
            return;
        }

        this.lastShot = now;

        const bullet = {
            x: this.x + this.width / 2,
            y: this.y + this.height / 2,
            width: 4,
            height: 4,
            speed: 5,
            vx: 0,
            vy: 0,
            owner: this
        };

        switch (this.direction) {
            case 0:
                bullet.vy = -bullet.speed;
                bullet.y = this.y;
                break;
            case 1:
                bullet.vx = bullet.speed;
                bullet.x = this.x + this.width;
                break;
            case 2:
                bullet.vy = bullet.speed;
                bullet.y = this.y + this.height;
                break;
            case 3:
                bullet.vx = -bullet.speed;
                bullet.x = this.x;
                break;
        }

        allBullets.push(bullet);
    }

    takeDamage() {
        this.health--;
        this.damage++;
        this.level = Math.max(1, this.kills - Math.floor(this.damage / 2));

        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        this.alive = false;
        this.deathTime = Date.now();
    }

    respawn() {
        this.alive = true;
        this.health = 1;
        this.x = Math.random() * (CANVAS_WIDTH - this.width);
        this.y = Math.random() * (CANVAS_HEIGHT - this.height);
        this.direction = Math.floor(Math.random() * 4);
    }

    addKill() {
        this.kills++;
        this.level = Math.max(1, this.kills - Math.floor(this.damage / 2));
        this.health = 1;
    }

    draw() {
        if (!this.alive) return;

        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const numAngles = this.getNumAngles();

        // Draw tank body (white)
        if (this.team === TEAMS.ALLY) {
            CTX.fillStyle = '#FFFFFF';
            CTX.strokeStyle = '#00FF00'; // Green border for ally
        } else {
            CTX.fillStyle = '#FFFFFF';
            CTX.strokeStyle = '#FF0000'; // Red border for enemy
        }

        // Draw polygon based on level
        CTX.beginPath();
        for (let i = 0; i < numAngles; i++) {
            const angle = (i / numAngles) * Math.PI * 2 - Math.PI / 2;
            const px = cx + Math.cos(angle) * (this.width / 2);
            const py = cy + Math.sin(angle) * (this.height / 2);
            if (i === 0) {
                CTX.moveTo(px, py);
            } else {
                CTX.lineTo(px, py);
            }
        }
        CTX.closePath();
        CTX.fill();
        CTX.lineWidth = 3;
        CTX.stroke();

        // Draw barrel/gun
        CTX.strokeStyle = this.team === TEAMS.ALLY ? '#00FF00' : '#FF0000';
        CTX.lineWidth = 3;
        CTX.beginPath();

        const barrelLength = this.width / 2 + 8;
        let bx = cx;
        let by = cy;
        let bdx = 0;
        let bdy = -1;

        switch (this.direction) {
            case 0:
                bdy = -1;
                break;
            case 1:
                bdx = 1;
                bdy = 0;
                break;
            case 2:
                bdy = 1;
                break;
            case 3:
                bdx = -1;
                bdy = 0;
                break;
        }

        CTX.moveTo(bx, by);
        CTX.lineTo(bx + bdx * barrelLength, by + bdy * barrelLength);
        CTX.stroke();

        // Draw level indicator
        CTX.fillStyle = this.team === TEAMS.ALLY ? '#00FF00' : '#FF0000';
        CTX.font = '12px Arial';
        CTX.textAlign = 'center';
        CTX.fillText(this.level, cx, cy + 4);
    }
}

// Obstacle/Block class
class Obstacle {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = TILE_SIZE;
        this.height = TILE_SIZE;
        this.type = type;
        this.health = type === BLOCK_TYPES.BRICK ? 3 : 1;
    }

    takeDamage() {
        if (this.type === BLOCK_TYPES.BRICK) {
            this.health--;
        }
    }

    isDestructible() {
        return this.type === BLOCK_TYPES.BRICK;
    }

    draw() {
        switch (this.type) {
            case BLOCK_TYPES.WATER:
                CTX.fillStyle = '#0099FF';
                break;
            case BLOCK_TYPES.BUSH:
                CTX.fillStyle = '#00AA00';
                break;
            case BLOCK_TYPES.BRICK:
                CTX.fillStyle = '#996633';
                break;
            case BLOCK_TYPES.STEEL:
                CTX.fillStyle = '#888888';
                break;
            default:
                return;
        }

        CTX.fillRect(this.x, this.y, this.width, this.height);

        // Draw health for bricks
        if (this.type === BLOCK_TYPES.BRICK) {
            CTX.strokeStyle = '#663300';
            CTX.lineWidth = 1;
            CTX.strokeRect(this.x, this.y, this.width, this.height);
        }
    }
}

// Generate map
function generateMap() {
    obstacles = [];
    const gridW = Math.floor(CANVAS_WIDTH / TILE_SIZE);
    const gridH = Math.floor(CANVAS_HEIGHT / TILE_SIZE);

    // Water regions (connected)
    const waterRegions = [];
    for (let r = 0; r < 2; r++) {
        const startX = Math.floor(Math.random() * (gridW - 5));
        const startY = Math.floor(Math.random() * (gridH - 5));
        
        for (let i = startX; i < startX + 4; i++) {
            for (let j = startY; j < startY + 4; j++) {
                if (i >= 0 && i < gridW && j >= 0 && j < gridH) {
                    obstacles.push(new Obstacle(i * TILE_SIZE, j * TILE_SIZE, BLOCK_TYPES.WATER));
                }
            }
        }
    }

    // Bushes
    for (let i = 0; i < 30; i++) {
        const x = Math.floor(Math.random() * (gridW - 1)) * TILE_SIZE;
        const y = Math.floor(Math.random() * (gridH - 1)) * TILE_SIZE;
        if (!obstacles.some(obs => obs.x === x && obs.y === y)) {
            obstacles.push(new Obstacle(x, y, BLOCK_TYPES.BUSH));
        }
    }

    // Bricks
    for (let i = 0; i < 40; i++) {
        const x = Math.floor(Math.random() * (gridW - 1)) * TILE_SIZE;
        const y = Math.floor(Math.random() * (gridH - 1)) * TILE_SIZE;
        if (!obstacles.some(obs => obs.x === x && obs.y === y)) {
            obstacles.push(new Obstacle(x, y, BLOCK_TYPES.BRICK));
        }
    }

    // Steel walls (borders)
    for (let i = 0; i < gridW; i++) {
        obstacles.push(new Obstacle(i * TILE_SIZE, 0, BLOCK_TYPES.STEEL));
        obstacles.push(new Obstacle(i * TILE_SIZE, (gridH - 1) * TILE_SIZE, BLOCK_TYPES.STEEL));
    }
    for (let j = 1; j < gridH - 1; j++) {
        obstacles.push(new Obstacle(0, j * TILE_SIZE, BLOCK_TYPES.STEEL));
        obstacles.push(new Obstacle((gridW - 1) * TILE_SIZE, j * TILE_SIZE, BLOCK_TYPES.STEEL));
    }
}

// Initialize game
function initGame() {
    allies = [];
    enemies = [];
    allBullets = [];
    generateMap();

    // Player tank
    const player = new Tank(CANVAS_WIDTH / 4, CANVAS_HEIGHT / 2, TEAMS.ALLY, true);
    allies.push(player);

    // Ally bots
    for (let i = 0; i < 2; i++) {
        const x = CANVAS_WIDTH / 4 + Math.random() * 100;
        const y = CANVAS_HEIGHT / 2 + Math.random() * 100;
        allies.push(new Tank(x, y, TEAMS.ALLY, false));
    }

    // Enemy bots
    for (let i = 0; i < 3; i++) {
        const x = (3 * CANVAS_WIDTH) / 4 + Math.random() * 100;
        const y = CANVAS_HEIGHT / 2 + Math.random() * 100;
        enemies.push(new Tank(x, y, TEAMS.ENEMY, false));
    }

    updateUI();
}

// Update game
function update() {
    if (!gameRunning || gamePaused) return;

    gameTime += 16; // ~60 FPS
    mapChangeTimer += 16;

    // Change map every 30 seconds
    if (mapChangeTimer > MAP_CHANGE_INTERVAL) {
        generateMap();
        mapChangeTimer = 0;
    }

    // Update all tanks
    for (let tank of [...allies, ...enemies]) {
        tank.update();
    }

    // Update bullets
    for (let i = allBullets.length - 1; i >= 0; i--) {
        const bullet = allBullets[i];
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;

        // Check if bullet is out of bounds
        if (bullet.x < 0 || bullet.x > CANVAS_WIDTH || 
            bullet.y < 0 || bullet.y > CANVAS_HEIGHT) {
            allBullets.splice(i, 1);
            continue;
        }

        // Check collision with obstacles
        let hitObstacle = false;
        for (let obs of obstacles) {
            if (bullet.x < obs.x + obs.width &&
                bullet.x + bullet.width > obs.x &&
                bullet.y < obs.y + obs.height &&
                bullet.y + bullet.height > obs.y) {

                // Water and bush let bullets through
                if (obs.type === BLOCK_TYPES.WATER || obs.type === BLOCK_TYPES.BUSH) {
                    continue;
                }

                // Brick and steel blocks bullets
                if (obs.type === BLOCK_TYPES.BRICK || obs.type === BLOCK_TYPES.STEEL) {
                    if (obs.isDestructible()) {
                        obs.takeDamage();
                        if (obs.health <= 0) {
                            obstacles.splice(obstacles.indexOf(obs), 1);
                        }
                    }
                    allBullets.splice(i, 1);
                    hitObstacle = true;
                    break;
                }
            }
        }

        if (hitObstacle) continue;

        // Check collision with tanks
        const targetTeam = bullet.owner.team === TEAMS.ALLY ? enemies : allies;
        for (let tank of targetTeam) {
            if (tank.alive &&
                bullet.x < tank.x + tank.width &&
                bullet.x + bullet.width > tank.x &&
                bullet.y < tank.y + tank.height &&
                bullet.y + bullet.height > tank.y) {

                tank.takeDamage();
                bullet.owner.addKill();
                allBullets.splice(i, 1);
                break;
            }
        }
    }

    updateUI();
}

// Draw game
function draw() {
    // Clear canvas
    CTX.fillStyle = '#111';
    CTX.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid
    CTX.strokeStyle = '#333';
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
    for (let obs of obstacles) {
        obs.draw();
    }

    // Draw bullets
    for (let bullet of allBullets) {
        CTX.fillStyle = '#FFFF00';
        CTX.fillRect(bullet.x - bullet.width / 2, bullet.y - bullet.height / 2, 
                     bullet.width, bullet.height);
    }

    // Draw tanks
    for (let tank of [...allies, ...enemies]) {
        tank.draw();
    }
}

// Game loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start game
function startGame() {
    if (!gameRunning) {
        gameRunning = true;
        gamePaused = false;
        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
        requestMotionPermission();
    }
}

// Toggle pause
function togglePause() {
    if (gameRunning) {
        gamePaused = !gamePaused;
        document.getElementById('pauseBtn').textContent = gamePaused ? 'Resume' : 'Pause';
    }
}

// Reset game
function resetGame() {
    gameRunning = false;
    gamePaused = false;
    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
    document.getElementById('pauseBtn').textContent = 'Pause';
    initGame();
    draw();
}

// Update UI
function updateUI() {
    const allyPlayer = allies.find(t => t.isPlayer);
    if (allyPlayer) {
        document.getElementById('playerLevel').textContent = allyPlayer.level;
        document.getElementById('playerKills').textContent = allyPlayer.kills;
        document.getElementById('playerDamage').textContent = allyPlayer.damage;
    }

    const allyScore = allies.reduce((sum, t) => sum + t.kills, 0);
    const enemyScore = enemies.reduce((sum, t) => sum + t.kills, 0);
    
    document.getElementById('allyTeam').textContent = `Allies: ${allyScore}`;
    document.getElementById('enemyTeam').textContent = `Enemies: ${enemyScore}`;
}

// Initialize
window.addEventListener('load', () => {
    initGame();
    draw();
    gameLoop();
});