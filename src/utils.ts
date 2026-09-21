import { CellType, COLS, ROWS } from './constants';
import { Grid } from './grid';

export function floodFill(grid: Grid, startR: number, startC: number, target: CellType, replacement: CellType, visited: boolean[][]) {
    const queue: [number, number][] = [[startR, startC]];
    const region: [number, number][] = [];

    if (grid.getCell(startR, startC) !== target) return region;

    visited[startR][startC] = true;

    while (queue.length > 0) {
        const [r, c] = queue.shift()!;
        region.push([r, c]);

        const neighbors = [
            [r + 1, c],
            [r - 1, c],
            [r, c + 1],
            [r, c - 1],
        ];

        for (const [nr, nc] of neighbors) {
            if (
                nr >= 0 && nr < ROWS &&
                nc >= 0 && nc < COLS &&
                !visited[nr][nc] &&
                grid.getCell(nr, nc) === target
            ) {
                visited[nr][nc] = true;
                queue.push([nr, nc]);
            }
        }
    }
    return region;
}

export function findEmptyRegions(grid: Grid): [number, number][][] {
    const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    const regions: [number, number][][] = [];

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (grid.getCell(r, c) === CellType.EMPTY && !visited[r][c]) {
                regions.push(floodFill(grid, r, c, CellType.EMPTY, CellType.EMPTY, visited));
            }
        }
    }
    return regions;
}
