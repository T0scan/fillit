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
    GAME_OVER,
}

const TARGET_FILL_PERCENTAGE = 70.0;
const INITIAL_LIVES = 3;
const MAX_LEVEL = 50;

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
        const scaleX = screenWidth / WIDTH;
        const scaleY = screenHeight / HEIGHT;
        gameContainer.scale.set(scaleX, scaleY);
        gameContainer.x = 0;
        gameContainer.y = 0;
    }

    handleResize();
    window.addEventListener('resize', handleResize);

    // DOM Elements
    const mainMenuEl = document.getElementById('main-menu');
    const hudOverlayEl = document.getElementById('hud-overlay');
    const levelCompleteModalEl = document.getElementById('level-complete-modal');
    const levelCompleteTitleEl = document.getElementById('level-complete-title');
    const levelCompleteDescEl = document.getElementById('level-complete-desc');
    const gameOverModalEl = document.getElementById('game-over-modal');
    const gameOverDescEl = document.getElementById('game-over-desc');

    const startLevelSelectEl = document.getElementById('start-level-select') as HTMLSelectElement | null;
    const startBtnEl = document.getElementById('start-btn');
    const menuBtnEl = document.getElementById('menu-btn');
    const nextLevelBtnEl = document.getElementById('next-level-btn');
    const retryBtnEl = document.getElementById('retry-btn');
    const gameOverMenuBtnEl = document.getElementById('game-over-menu-btn');
    const fullscreenBtn = document.getElementById('fullscreen-btn');

    const fillPercentageEl = document.getElementById('fill-percentage');
    const progressBarEl = document.getElementById('progress-bar');
    const levelDisplayEl = document.getElementById('level-display');
    const livesDisplayEl = document.getElementById('lives-display');

    // Populate Level Select Options (1 through 50)
    if (startLevelSelectEl) {
        startLevelSelectEl.innerHTML = '';
        for (let i = 1; i <= MAX_LEVEL; i++) {
            const opt = document.createElement('option');
            opt.value = `${i}`;
            opt.textContent = `Level ${i}`;
            startLevelSelectEl.appendChild(opt);
        }
    }

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
    let lives = INITIAL_LIVES;
    let grid = new Grid();
    let player = new Player(0, 0);
    let enemies: Enemy[] = [];

    const backgroundGraphics = new PIXI.Graphics();
    gameContainer.addChild(backgroundGraphics);

    const backgroundPatternGraphics = new PIXI.Graphics();
    gameContainer.addChild(backgroundPatternGraphics);

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

    // Color conversion helper for background theme generation
    function hslToHex(h: number, s: number, l: number): number {
        l /= 100;
        const a = (s * Math.min(l, 1 - l)) / 100;
        const f = (n: number) => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color);
        };
        return (f(0) << 16) + (f(8) << 8) + f(4);
    }

    function renderUniqueLevelBackground(levelNum: number) {
        backgroundGraphics.clear();
        backgroundPatternGraphics.clear();

        // 1. Base dark theme color generated deterministically by level hue
        const hue = (levelNum * 137.508) % 360; // Golden angle distribution
        const bgColor = hslToHex(hue, 35, 12);
        const patternColor = hslToHex((hue + 30) % 360, 50, 25);
        const accentColor = hslToHex((hue + 180) % 360, 60, 35);

        backgroundGraphics.beginFill(bgColor);
        backgroundGraphics.drawRect(0, 0, WIDTH, HEIGHT);
        backgroundGraphics.endFill();

        // 2. Procedural background pattern unique to each level
        const patternStyle = levelNum % 5;

        switch (patternStyle) {
            case 0: {
                // Subtle Grid Lines pattern
                backgroundPatternGraphics.lineStyle(1, patternColor, 0.15);
                const step = 20 + (levelNum % 4) * 10;
                for (let x = 0; x < WIDTH; x += step) {
                    backgroundPatternGraphics.moveTo(x, 0);
                    backgroundPatternGraphics.lineTo(x, HEIGHT);
                }
                for (let y = 0; y < HEIGHT; y += step) {
                    backgroundPatternGraphics.moveTo(0, y);
                    backgroundPatternGraphics.lineTo(WIDTH, y);
                }
                break;
            }
            case 1: {
                // Starfield / Cosmic Dots pattern
                backgroundPatternGraphics.beginFill(accentColor, 0.25);
                const starCount = 30 + (levelNum % 20) * 2;
                for (let i = 0; i < starCount; i++) {
                    const sx = (Math.sin(i * 12.3 + levelNum * 7) * 0.5 + 0.5) * WIDTH;
                    const sy = (Math.cos(i * 45.6 + levelNum * 3) * 0.5 + 0.5) * HEIGHT;
                    const sr = 1 + (i % 3);
                    backgroundPatternGraphics.drawCircle(sx, sy, sr);
                }
                backgroundPatternGraphics.endFill();
                break;
            }
            case 2: {
                // Concentric Tech Rings pattern
                backgroundPatternGraphics.lineStyle(1.5, patternColor, 0.15);
                const cx = WIDTH / 2;
                const cy = HEIGHT / 2;
                const ringCount = 4 + (levelNum % 5);
                for (let i = 1; i <= ringCount; i++) {
                    backgroundPatternGraphics.drawCircle(cx, cy, i * 60);
                }
                break;
            }
            case 3: {
                // Diagonal Stripe Lattice pattern
                backgroundPatternGraphics.lineStyle(1, accentColor, 0.12);
                const spacing = 30 + (levelNum % 3) * 10;
                for (let i = -HEIGHT; i < WIDTH + HEIGHT; i += spacing) {
                    backgroundPatternGraphics.moveTo(i, 0);
                    backgroundPatternGraphics.lineTo(i + HEIGHT, HEIGHT);
                }
                break;
            }
            case 4: {
                // Ambient Hexagon Nodes pattern
                backgroundPatternGraphics.beginFill(patternColor, 0.18);
                const nodeCols = 8;
                const nodeRows = 6;
                for (let r = 0; r < nodeRows; r++) {
                    for (let c = 0; c < nodeCols; c++) {
                        const nx = (c + 0.5) * (WIDTH / nodeCols);
                        const ny = (r + 0.5) * (HEIGHT / nodeRows);
                        backgroundPatternGraphics.drawCircle(nx, ny, 3 + (levelNum % 4));
                    }
                }
                backgroundPatternGraphics.endFill();
                break;
            }
        }
    }

    function createEnemiesForLevel(levelNum: number): Enemy[] {
        const enemyCount = Math.min(1 + Math.floor((levelNum - 1) / 7), 8);
        const baseSpeed = 1.8 + ((levelNum - 1) / 49) * 2.7;

        const enemyList: Enemy[] = [];
        const basePositions = [
            { x: WIDTH / 2, y: HEIGHT / 2, angleMult: 0 },
            { x: WIDTH / 3, y: HEIGHT / 3, angleMult: 1 },
            { x: (WIDTH * 2) / 3, y: (HEIGHT * 2) / 3, angleMult: 2 },
            { x: WIDTH / 4, y: (HEIGHT * 3) / 4, angleMult: 3 },
            { x: (WIDTH * 3) / 4, y: HEIGHT / 4, angleMult: 4 },
            { x: WIDTH / 2, y: HEIGHT / 4, angleMult: 5 },
            { x: WIDTH / 4, y: HEIGHT / 2, angleMult: 6 },
            { x: (WIDTH * 3) / 4, y: (HEIGHT * 3) / 4, angleMult: 7 },
        ];

        for (let i = 0; i < enemyCount; i++) {
            const pos = basePositions[i % basePositions.length];
            const angle = (Math.PI / 4) * (pos.angleMult + 1) + (levelNum * 0.1);
            const vx = Math.cos(angle) * baseSpeed;
            const vy = Math.sin(angle) * baseSpeed;
            enemyList.push(new Enemy(pos.x, pos.y, vx, vy));
        }

        return enemyList;
    }

    function loadLevel(levelNum: number) {
        currentLevel = Math.min(Math.max(1, levelNum), MAX_LEVEL);
        grid = new Grid();
        player = new Player(0, 0);
        enemies = createEnemiesForLevel(currentLevel);
        renderUniqueLevelBackground(currentLevel);

        if (levelDisplayEl) {
            levelDisplayEl.textContent = `${currentLevel} / ${MAX_LEVEL}`;
        }
        updateHUD();
    }

    function startGame() {
        lives = INITIAL_LIVES;
        const selectedStartLevel = startLevelSelectEl ? parseInt(startLevelSelectEl.value, 10) || 1 : 1;
        loadLevel(selectedStartLevel);
        currentState = GameState.PLAYING;
        if (mainMenuEl) mainMenuEl.classList.add('hidden');
        if (levelCompleteModalEl) levelCompleteModalEl.classList.add('hidden');
        if (gameOverModalEl) gameOverModalEl.classList.add('hidden');
        if (hudOverlayEl) hudOverlayEl.classList.remove('hidden');
    }

    function advanceToNextLevel() {
        if (currentLevel >= MAX_LEVEL) {
            showMenu();
            return;
        }
        loadLevel(currentLevel + 1);
        currentState = GameState.PLAYING;
        if (levelCompleteModalEl) levelCompleteModalEl.classList.add('hidden');
    }

    function retryLevel() {
        lives = INITIAL_LIVES;
        loadLevel(currentLevel);
        currentState = GameState.PLAYING;
        if (gameOverModalEl) gameOverModalEl.classList.add('hidden');
    }

    function showMenu() {
        currentState = GameState.MENU;
        renderUniqueLevelBackground(1);
        if (mainMenuEl) mainMenuEl.classList.remove('hidden');
        if (hudOverlayEl) hudOverlayEl.classList.add('hidden');
        if (levelCompleteModalEl) levelCompleteModalEl.classList.add('hidden');
        if (gameOverModalEl) gameOverModalEl.classList.add('hidden');
    }

    if (startBtnEl) startBtnEl.addEventListener('click', startGame);
    if (menuBtnEl) menuBtnEl.addEventListener('click', showMenu);
    if (nextLevelBtnEl) nextLevelBtnEl.addEventListener('click', advanceToNextLevel);
    if (retryBtnEl) retryBtnEl.addEventListener('click', retryLevel);
    if (gameOverMenuBtnEl) gameOverMenuBtnEl.addEventListener('click', showMenu);

    function updateHUD() {
        const fillPct = grid.getFillPercentage();
        if (fillPercentageEl) {
            fillPercentageEl.textContent = `${fillPct.toFixed(1)}%`;
        }
        if (progressBarEl) {
            const progressRatio = Math.min(100, (fillPct / TARGET_FILL_PERCENTAGE) * 100);
            progressBarEl.style.width = `${progressRatio.toFixed(1)}%`;
        }
        if (livesDisplayEl) {
            livesDisplayEl.textContent = '❤️'.repeat(lives);
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
                const sampleCenter = region[Math.floor(region.length / 2)];
                if (sampleCenter) {
                    particles.emit(sampleCenter[1] * GRID_SIZE, sampleCenter[0] * GRID_SIZE, 0xfacc15, 60, 1.2);
                }
            }
        }

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

            if (currentLevel >= MAX_LEVEL) {
                if (levelCompleteTitleEl) levelCompleteTitleEl.textContent = 'GAME VICTORY!';
                if (levelCompleteDescEl) levelCompleteDescEl.textContent = `CONGRATULATIONS! You completed all ${MAX_LEVEL} levels!`;
                if (nextLevelBtnEl) {
                    const span = nextLevelBtnEl.querySelector('span');
                    if (span) span.textContent = 'Main Menu';
                }
            } else {
                if (levelCompleteTitleEl) levelCompleteTitleEl.textContent = 'Level Cleared!';
                if (levelCompleteDescEl) {
                    levelCompleteDescEl.textContent = `You claimed ${currentPct.toFixed(1)}% coverage on Level ${currentLevel}!`;
                }
                if (nextLevelBtnEl) {
                    const span = nextLevelBtnEl.querySelector('span');
                    if (span) span.textContent = 'Next Level';
                }
            }

            if (levelCompleteModalEl) {
                levelCompleteModalEl.classList.remove('hidden');
            }
        }
    }

    // Ensure we start cleanly on Main Menu
    showMenu();

    app.ticker.add((ticker) => {
        const delta = ticker.deltaTime;

        // Screen shake update
        if (shakeDuration > 0) {
            shakeDuration--;
            const offsetX = (Math.random() - 0.5) * shakeIntensity * 2;
            const offsetY = (Math.random() - 0.5) * shakeIntensity * 2;
            gameContainer.x = offsetX;
            gameContainer.y = offsetY;
        } else {
            gameContainer.x = 0;
            gameContainer.y = 0;
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
                    triggerScreenShake(10, 12);
                    triggerHitStop(8);

                    grid.clearTrail();
                    player.r = 0;
                    player.c = 0;
                    player.onTrail = false;
                    player.direction = { dr: 0, dc: 0 };
                    particles.emit(player.x, player.y, 0xf87171, 40, 1.4);

                    lives--;
                    updateHUD();

                    if (lives <= 0) {
                        currentState = GameState.GAME_OVER;
                        if (gameOverDescEl) {
                            gameOverDescEl.textContent = `You ran out of lives on Level ${currentLevel}!`;
                        }
                        if (gameOverModalEl) {
                            gameOverModalEl.classList.remove('hidden');
                        }
                    }
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
