export const GRID_SIZE = 10;
export const WIDTH = 800;
export const HEIGHT = 600;
export const COLS = WIDTH / GRID_SIZE;
export const ROWS = HEIGHT / GRID_SIZE;

export enum CellType {
    EMPTY = 0,
    FILLED = 1,
    TRAIL = 2,
}
