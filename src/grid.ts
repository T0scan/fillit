import { CellType, COLS, ROWS } from './constants';

export class Grid {
    cells: CellType[][];

    constructor() {
        this.cells = Array.from({ length: ROWS }, () =>
            Array.from({ length: COLS }, () => CellType.EMPTY)
        );
        this.initializeBorders();
    }

    private initializeBorders() {
        for (let r = 0; r < ROWS; r++) {
            this.cells[r][0] = CellType.FILLED;
            this.cells[r][COLS - 1] = CellType.FILLED;
        }
        for (let c = 0; c < COLS; c++) {
            this.cells[0][c] = CellType.FILLED;
            this.cells[ROWS - 1][c] = CellType.FILLED;
        }
    }

    getCell(r: number, c: number): CellType {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return CellType.FILLED;
        return this.cells[r][c];
    }

    setCell(r: number, c: number, type: CellType) {
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
            this.cells[r][c] = type;
        }
    }

    clearTrail() {
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (this.cells[r][c] === CellType.TRAIL) {
                    this.cells[r][c] = CellType.EMPTY;
                }
            }
        }
    }

    getFillPercentage(): number {
        let filledCount = 0;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (this.cells[r][c] === CellType.FILLED) {
                    filledCount++;
                }
            }
        }
        return (filledCount / (COLS * ROWS)) * 100;
    }
}
