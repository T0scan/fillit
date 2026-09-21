import * as PIXI from 'pixi.js';
import { WIDTH, HEIGHT, GRID_SIZE, CellType, ROWS, COLS } from './constants';
import { Grid } from './grid';
import { Player } from './player';
import { Enemy } from './enemy';
import { findEmptyRegions } from './utils';
import { ParticleSystem } from './particles';

enum GameState {
    MENU,
    PLAYING,
    LEVEL_COMPLETE,
}

const TARGET_FILL_PERCENTAGE = 75.0;

async function init() {
    const app = new PIXI.Application();
    await app.init({
        resizeTo: window,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
        backgroundColor: 0x0f172a,
    });
    const appContainer = document.getElementById('app')!;
    appContainer.appendChild(app.canvas);

    const gameContainer = new PIXI.Container();
    app.stage.addChild(gameContainer);

    let shakeDuration = 0;
    let shakeIntensity = 0;

    function triggerScreenShake(intensity: number = 8, duration: number = 12) {
        shakeIntensity = intensity;
        shakeDuration = duration;
    }

    let freezeTimer = 0;
    function triggerHitStop(frames: number = 6) {
        freezeTimer = frames;
    }

    function handleResize() {
        const screenWidth = app.screen.width;
        const screenHeight = app.screen.height;
        const scale = Math.min(screenWidth / WIDTH, screenHeight / HEIGHT);
        gameContainer.scale.set(scale);
        gameContainer.x = (screenWidth - WIDTH * scale) / 2;
        gameContainer.y = (screenHeight - HEIGHT * scale) / 2;
    }

    handleResize();
    window.addEventListener('resize', handleResize);

    // DOM Elements
    const mainMenuEl = document.getElementById('main-menu');
    const hudOverlayEl = document.getElementById('hud-overlay');
    const levelCompleteModalEl = document.getElementById('level-complete-modal');
    const levelCompleteDescEl = document.getElementById('level-complete-desc');

    const startBtnEl = document.getElementById('start-btn');
    const menuBtnEl = document.getElementById('menu-btn');
    const nextLevelBtnEl = document.getElementById('next-level-btn');
    const fullscreenBtn = document.getElementById('fullscreen-btn');

    const fillPercentageEl = document.getElementById('fill-percentage');
    const levelDisplayEl = document.getElementById('level-display');

    // Fullscreen toggle logic
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch((err) => {
                    console.error(`Error attempting to enable fullscreen: ${err.message}`);
                });
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        });
    }

    let currentState = GameState.MENU;
    let currentLevel = 1;
    let grid = new Grid();
    let player = new Player(0, 0);
    let enemies: Enemy[] = [];

    function createEnemiesForLevel(levelNum: number): Enemy[] {
        const enemyCount = Math.min(2 + Math.floor((levelNum - 1) / 2), 5);
        const baseSpeed = 2.0 + (levelNum - 1) * 0.3;

        const enemyList: Enemy[] = [];
        const positions = [
            { x: WIDTH / 2, y: HEIGHT / 2, vx: baseSpeed, vy: baseSpeed * 0.7 },
            { x: WIDTH / 3, y: HEIGHT / 3, vx: -baseSpeed * 0.8, vy: baseSpeed },
            { x: (WIDTH * 2) / 3, y: (HEIGHT * 2) / 3, vx: baseSpeed * 0.9, vy: -baseSpeed * 0.8 },
            { x: WIDTH / 4, y: (HEIGHT * 3) / 4, vx: baseSpeed, vy: -baseSpeed * 0.9 },
            { x: (WIDTH * 3) / 4, y: HEIGHT / 4, vx: -baseSpeed * 0.9, vy: baseSpeed * 0.7 },
        ];

        for (let i = 0; i < enemyCount; i++) {
            const pos = positions[i % positions.length];
            enemyList.push(new Enemy(pos.x, pos.y, pos.vx, pos.vy));
        }

        return enemyList;
    }

    function loadLevel(levelNum: number) {
        currentLevel = levelNum;
        grid = new Grid();
        player = new Player(0, 0);
        enemies = createEnemiesForLevel(levelNum);

        if (levelDisplayEl) {
            levelDisplayEl.textContent = `${currentLevel}`;
        }
        updateHUD();
    }

    function startGame() {
        loadLevel(1);
        currentState = GameState.PLAYING;
        if (mainMenuEl) mainMenuEl.classList.add('hidden');
        if (levelCompleteModalEl) levelCompleteModalEl.classList.add('hidden');
        if (hudOverlayEl) hudOverlayEl.classList.remove('hidden');
    }

    function advanceToNextLevel() {
        loadLevel(currentLevel + 1);
        currentState = GameState.PLAYING;
        if (levelCompleteModalEl) levelCompleteModalEl.classList.add('hidden');
    }

    function showMenu() {
        currentState = GameState.MENU;
        if (mainMenuEl) mainMenuEl.classList.remove('hidden');
        if (hudOverlayEl) hudOverlayEl.classList.add('hidden');
        if (levelCompleteModalEl) levelCompleteModalEl.classList.add('hidden');
    }

    if (startBtnEl) {
        startBtnEl.addEventListener('click', startGame);
    }

    if (menuBtnEl) {
        menuBtnEl.addEventListener('click', showMenu);
    }

    if (nextLevelBtnEl) {
        nextLevelBtnEl.addEventListener('click', advanceToNextLevel);
    }

    const backgroundGraphics = new PIXI.Graphics();
    backgroundGraphics.beginFill(0x1e293b);
    backgroundGraphics.drawRect(0, 0, WIDTH, HEIGHT);
    backgroundGraphics.endFill();
    gameContainer.addChild(backgroundGraphics);

    const gridGraphics = new PIXI.Graphics();
    gameContainer.addChild(gridGraphics);

    const trailGraphics = new PIXI.Graphics();
    trailGraphics.filters = [new PIXI.BlurFilter(2)];
    gameContainer.addChild(trailGraphics);

    const playerGraphics = new PIXI.Graphics();
    gameContainer.addChild(playerGraphics);

    const enemyGraphics = new PIXI.Graphics();
    gameContainer.addChild(enemyGraphics);

    const particleContainer = new PIXI.Container();
    gameContainer.addChild(particleContainer);
    const particles = new ParticleSystem(particleContainer);

    function updateHUD() {
        const fillPct = grid.getFillPercentage().toFixed(1);
        if (fillPercentageEl) {
            fillPercentageEl.textContent = `${fillPct}%`;
        }
    }

    // Controls
    window.addEventListener('keydown', (e) => {
        if (currentState !== GameState.PLAYING) return;

        switch (e.key.toLowerCase()) {
            case 'arrowup':
            case 'w':
                player.setDirection(-1, 0);
                break;
            case 'arrowdown':
            case 's':
                player.setDirection(1, 0);
                break;
            case 'arrowleft':
            case 'a':
                player.setDirection(0, -1);
                break;
            case 'arrowright':
            case 'd':
                player.setDirection(0, 1);
                break;
        }
    });

    function renderGrid() {
        gridGraphics.clear();
        trailGraphics.clear();
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = grid.getCell(r, c);
                if (cell === CellType.FILLED) {
                    gridGraphics.beginFill(0x38bdf8);
                    gridGraphics.drawRect(c * GRID_SIZE, r * GRID_SIZE, GRID_SIZE, GRID_SIZE);
                    gridGraphics.endFill();
                } else if (cell === CellType.TRAIL) {
                    trailGraphics.beginFill(0x4ade80);
                    trailGraphics.drawRect(c * GRID_SIZE, r * GRID_SIZE, GRID_SIZE, GRID_SIZE);
                    trailGraphics.endFill();
                }
            }
        }
    }

    function checkCompletion() {
        const regions = findEmptyRegions(grid);
        let claimed = false;
        
        // Find regions that don't contain any enemies
        for (const region of regions) {
            let hasEnemy = false;
            for (const enemy of enemies) {
                const er = Math.floor(enemy.y / GRID_SIZE);
                const ec = Math.floor(enemy.x / GRID_SIZE);
                if (region.some(([r, c]) => r === er && c === ec)) {
                    hasEnemy = true;
                    break;
                }
            }

            if (!hasEnemy) {
                claimed = true;
                for (const [r, c] of region) {
                    grid.setCell(r, c, CellType.FILLED);
                }
                // Emit celebratory particles on filled area
                const sampleCenter = region[Math.floor(region.length / 2)];
                if (sampleCenter) {
                    particles.emit(sampleCenter[1] * GRID_SIZE, sampleCenter[0] * GRID_SIZE, 0xfacc15, 60, 1.2);
                }
            }
        }

        // Convert all trail to filled
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (grid.getCell(r, c) === CellType.TRAIL) {
                    grid.setCell(r, c, CellType.FILLED);
                }
            }
        }
        
        if (claimed) {
            triggerScreenShake(5, 8);
        }

        updateHUD();

        const currentPct = grid.getFillPercentage();
        if (currentPct >= TARGET_FILL_PERCENTAGE) {
            currentState = GameState.LEVEL_COMPLETE;
            triggerScreenShake(12, 16);
            triggerHitStop(10);

            // Victory celebration particle burst
            for (let i = 0; i < 5; i++) {
                particles.emit(
                    Math.random() * WIDTH,
                    Math.random() * HEIGHT,
                    [0x38bdf8, 0x4ade80, 0xfacc15, 0xf43f5e][i % 4],
                    40,
                    1.5,
                    0.1
                );
            }

            if (levelCompleteDescEl) {
                levelCompleteDescEl.textContent = `You claimed ${currentPct.toFixed(1)}% coverage on Level ${currentLevel}!`;
            }
            if (levelCompleteModalEl) {
                levelCompleteModalEl.classList.remove('hidden');
            }
        }
    }

    loadLevel(1);

    app.ticker.add((ticker) => {
        const delta = ticker.deltaTime;

        // Screen shake update
        const screenWidth = app.screen.width;
        const screenHeight = app.screen.height;
        const baseScale = Math.min(screenWidth / WIDTH, screenHeight / HEIGHT);
        const baseX = (screenWidth - WIDTH * baseScale) / 2;
        const baseY = (screenHeight - HEIGHT * baseScale) / 2;

        if (shakeDuration > 0) {
            shakeDuration--;
            const offsetX = (Math.random() - 0.5) * shakeIntensity * 2;
            const offsetY = (Math.random() - 0.5) * shakeIntensity * 2;
            gameContainer.x = baseX + offsetX;
            gameContainer.y = baseY + offsetY;
        } else {
            gameContainer.x = baseX;
            gameContainer.y = baseY;
        }

        // Hit stop freeze frame logic
        if (freezeTimer > 0) {
            freezeTimer--;
            return;
        }

        if (currentState === GameState.PLAYING) {
            const wasOnTrail = player.onTrail;
            player.update(grid);

            if (wasOnTrail && !player.onTrail) {
                checkCompletion();
            }

            for (const enemy of enemies) {
                if (enemy.update(grid)) {
                    // Hit trail! Trigger hit stop and screen shake
                    triggerScreenShake(10, 12);
                    triggerHitStop(8);

                    grid.clearTrail();
                    player.r = 0;
                    player.c = 0;
                    player.onTrail = false;
                    player.direction = { dr: 0, dc: 0 };
                    particles.emit(player.x, player.y, 0xf87171, 40, 1.4);
                }
            }
        }

        particles.update(delta);

        // Render
        renderGrid();
        
        playerGraphics.clear();
        if (currentState === GameState.PLAYING) {
            playerGraphics.beginFill(0xf8fafc);
            playerGraphics.drawCircle(player.x, player.y, GRID_SIZE / 2);
            playerGraphics.endFill();
        }

        enemyGraphics.clear();
        for (const enemy of enemies) {
            enemyGraphics.beginFill(0xf87171);
            enemyGraphics.drawCircle(enemy.x, enemy.y, enemy.radius);
            enemyGraphics.endFill();
        }
    });
}

init();
