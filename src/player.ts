import { CellType, GRID_SIZE, COLS, ROWS } from './constants';
import { Grid } from './grid';

export class Player {
    r: number;
    c: number;
    isMoving: boolean = false;
    direction: { dr: number; dc: number } = { dr: 0, dc: 0 };
    nextDirection: { dr: number; dc: number } = { dr: 0, dc: 0 };
    onTrail: boolean = false;

    constructor(r: number, c: number) {
        this.r = r;
        this.c = c;
    }

    update(grid: Grid) {
        if (this.nextDirection.dr !== 0 || this.nextDirection.dc !== 0) {
            this.direction = this.nextDirection;
        }

        if (this.direction.dr === 0 && this.direction.dc === 0) return;

        const nextR = this.r + this.direction.dr;
        const nextC = this.c + this.direction.dc;

        if (nextR < 0 || nextR >= ROWS || nextC < 0 || nextC >= COLS) {
            this.direction = { dr: 0, dc: 0 };
            return;
        }

        const nextCell = grid.getCell(nextR, nextC);

        if (nextCell === CellType.TRAIL) {
            // Can't move into own trail
            this.direction = { dr: 0, dc: 0 };
            return;
        }

        const currentCell = grid.getCell(this.r, this.c);
        
        if (currentCell === CellType.EMPTY) {
            grid.setCell(this.r, this.c, CellType.TRAIL);
            this.onTrail = true;
        } else if (currentCell === CellType.FILLED) {
            // We are on filled area, if we move into empty, start trail
            if (nextCell === CellType.EMPTY) {
                this.onTrail = true;
            } else {
                this.onTrail = false;
            }
        }

        this.r = nextR;
        this.c = nextC;
    }

    setDirection(dr: number, dc: number) {
        this.nextDirection = { dr, dc };
    }

    get x() { return this.c * GRID_SIZE + GRID_SIZE / 2; }
    get y() { return this.r * GRID_SIZE + GRID_SIZE / 2; }
}
