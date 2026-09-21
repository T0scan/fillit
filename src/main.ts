import * as PIXI from 'pixi.js';
import { WIDTH, HEIGHT, GRID_SIZE, CellType, ROWS, COLS } from './constants';
import { Grid } from './grid';
import { Player } from './player';
import { Enemy } from './enemy';
import { findEmptyRegions } from './utils';
import { ParticleSystem } from './particles';

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

    // Fullscreen toggle logic
    const fullscreenBtn = document.getElementById('fullscreen-btn');
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

    const grid = new Grid();
    const player = new Player(0, 0);
    const enemies: Enemy[] = [
        new Enemy(WIDTH / 2, HEIGHT / 2, 3, 2),
        new Enemy(WIDTH / 3, HEIGHT / 3, -2, 4),
    ];

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

    const fillPercentageEl = document.getElementById('fill-percentage');
    function updateHUD() {
        const fillPct = grid.getFillPercentage().toFixed(1);
        if (fillPercentageEl) {
            fillPercentageEl.textContent = `${fillPct}%`;
        }
    }
    updateHUD();

    // Controls
    window.addEventListener('keydown', (e) => {
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
                // Fill this region
                for (const [r, c] of region) {
                    grid.setCell(r, c, CellType.FILLED);
                }
                particles.emit(region[0][1] * GRID_SIZE, region[0][0] * GRID_SIZE, 0xfacc15, 50);
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
        
        updateHUD();
    }

    app.ticker.add((ticker) => {
        const delta = ticker.deltaTime;

        const wasOnTrail = player.onTrail;
        player.update(grid);
        
        if (wasOnTrail && !player.onTrail) {
            // Player just stepped off trail onto filled area
            checkCompletion();
        }

        for (const enemy of enemies) {
            if (enemy.update(grid)) {
                // Hit trail! Reset player and clear trail
                grid.clearTrail();
                player.r = 0;
                player.c = 0;
                player.onTrail = false;
                player.direction = { dr: 0, dc: 0 };
                particles.emit(player.x, player.y, 0xf87171, 30);
            }
        }

        particles.update(delta);

        // Render
        renderGrid();
        
        playerGraphics.clear();
        playerGraphics.beginFill(0xf8fafc);
        playerGraphics.drawCircle(player.x, player.y, GRID_SIZE / 2);
        playerGraphics.endFill();

        enemyGraphics.clear();
        for (const enemy of enemies) {
            enemyGraphics.beginFill(0xf87171);
            enemyGraphics.drawCircle(enemy.x, enemy.y, enemy.radius);
            enemyGraphics.endFill();
        }
    });
}

init();
