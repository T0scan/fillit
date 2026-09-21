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
        width: WIDTH,
        height: HEIGHT,
        backgroundColor: 0x1099bb,
    });
    document.getElementById('app')!.appendChild(app.canvas);

    const grid = new Grid();
    const player = new Player(0, 0);
    const enemies: Enemy[] = [
        new Enemy(WIDTH / 2, HEIGHT / 2, 3, 2),
        new Enemy(WIDTH / 3, HEIGHT / 3, -2, 4),
    ];

    const gridGraphics = new PIXI.Graphics();
    app.stage.addChild(gridGraphics);

    const trailGraphics = new PIXI.Graphics();
    trailGraphics.filters = [new PIXI.BlurFilter(2)];
    app.stage.addChild(trailGraphics);

    const playerGraphics = new PIXI.Graphics();
    app.stage.addChild(playerGraphics);

    const enemyGraphics = new PIXI.Graphics();
    app.stage.addChild(enemyGraphics);

    const particleContainer = new PIXI.Container();
    app.stage.addChild(particleContainer);
    const particles = new ParticleSystem(particleContainer);

    const uiText = new PIXI.Text({
        text: 'Filled: 0%',
        style: {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0xffffff,
        }
    });
    uiText.x = 10;
    uiText.y = 10;
    app.stage.addChild(uiText);
    uiText.text = `Filled: ${grid.getFillPercentage().toFixed(1)}%`;

    // Controls
    window.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'ArrowUp': player.setDirection(-1, 0); break;
            case 'ArrowDown': player.setDirection(1, 0); break;
            case 'ArrowLeft': player.setDirection(0, -1); break;
            case 'ArrowRight': player.setDirection(0, 1); break;
        }
    });

    function renderGrid() {
        gridGraphics.clear();
        trailGraphics.clear();
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = grid.getCell(r, c);
                if (cell === CellType.FILLED) {
                    gridGraphics.beginFill(0x333333);
                    gridGraphics.drawRect(c * GRID_SIZE, r * GRID_SIZE, GRID_SIZE, GRID_SIZE);
                    gridGraphics.endFill();
                } else if (cell === CellType.TRAIL) {
                    trailGraphics.beginFill(0x00ff00);
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
                particles.emit(region[0][1] * GRID_SIZE, region[0][0] * GRID_SIZE, 0xffff00, 50);
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
        
        uiText.text = `Filled: ${grid.getFillPercentage().toFixed(1)}%`;
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
                particles.emit(player.x, player.y, 0xff0000, 30);
            }
        }

        particles.update(delta);

        // Render
        renderGrid();
        
        playerGraphics.clear();
        playerGraphics.beginFill(0xffffff);
        playerGraphics.drawCircle(player.x, player.y, GRID_SIZE / 2);
        playerGraphics.endFill();

        enemyGraphics.clear();
        for (const enemy of enemies) {
            enemyGraphics.beginFill(0xff0000);
            enemyGraphics.drawCircle(enemy.x, enemy.y, enemy.radius);
            enemyGraphics.endFill();
        }
    });
}

init();
