import { describe, it, expect, beforeEach } from 'vitest';
import { Grid } from '../src/grid';
import { findEmptyRegions } from '../src/utils';
import { CellType, COLS, ROWS } from '../src/constants';

describe('Grid and Utils', () => {
    let grid: Grid;

    beforeEach(() => {
        grid = new Grid();
    });

    it('should initialize with borders filled', () => {
        expect(grid.getCell(0, 0)).toBe(CellType.FILLED);
        expect(grid.getCell(ROWS - 1, COLS - 1)).toBe(CellType.FILLED);
        expect(grid.getCell(1, 1)).toBe(CellType.EMPTY);
    });

    it('should find empty regions', () => {
        const regions = findEmptyRegions(grid);
        expect(regions.length).toBe(1);
        expect(regions[0].length).toBe((ROWS - 2) * (COLS - 2));
    });

    it('should find multiple regions when split by a line', () => {
        // Draw a vertical line in the middle
        for (let r = 0; r < ROWS; r++) {
            grid.setCell(r, Math.floor(COLS / 2), CellType.FILLED);
        }

        const regions = findEmptyRegions(grid);
        expect(regions.length).toBe(2);
    });

    it('should calculate fill percentage correctly', () => {
        const initialFill = grid.getFillPercentage();
        const expectedInitial = ((ROWS * 2 + (COLS - 2) * 2) / (ROWS * COLS)) * 100;
        expect(initialFill).toBeCloseTo(expectedInitial, 1);

        // Fill everything
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                grid.setCell(r, c, CellType.FILLED);
            }
        }
        expect(grid.getFillPercentage()).toBe(100);
    });
});
