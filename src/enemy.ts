import { GRID_SIZE, WIDTH, HEIGHT, CellType } from './constants';
import { Grid } from './grid';

export class Enemy {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number = 5;

    constructor(x: number, y: number, vx: number, vy: number) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
    }

    update(grid: Grid): boolean {
        let nextX = this.x + this.vx;
        let nextY = this.y + this.vy;

        // Grid coordinates
        const r = Math.floor(nextY / GRID_SIZE);
        const c = Math.floor(nextX / GRID_SIZE);

        if (grid.getCell(r, c) === CellType.FILLED) {
            // Simple bounce
            // Check horizontal collision
            const rCurrent = Math.floor(this.y / GRID_SIZE);
            const cNext = Math.floor((this.x + this.vx) / GRID_SIZE);
            if (grid.getCell(rCurrent, cNext) === CellType.FILLED) {
                this.vx *= -1;
            }

            // Check vertical collision
            const rNext = Math.floor((this.y + this.vy) / GRID_SIZE);
            const cCurrent = Math.floor(this.x / GRID_SIZE);
            if (grid.getCell(rNext, cCurrent) === CellType.FILLED) {
                this.vy *= -1;
            }
            
            // If both or corner
            if (grid.getCell(Math.floor((this.y + this.vy) / GRID_SIZE), Math.floor((this.x + this.vx) / GRID_SIZE)) === CellType.FILLED) {
                 // Already handled by component bounces usually, but just in case
            }

            nextX = this.x + this.vx;
            nextY = this.y + this.vy;
        }

        this.x = nextX;
        this.y = nextY;

        // Check if hit trail
        const tr = Math.floor(this.y / GRID_SIZE);
        const tc = Math.floor(this.x / GRID_SIZE);
        if (grid.getCell(tr, tc) === CellType.TRAIL) {
            return true; // Hit trail!
        }

        return false;
    }
}
