const DEFAULT_TILE_AR = 16 / 9;

export type TileParams = {
    x: number,
    y: number,
    width: number,
    height: number,
};

type GridParams = TileParams & {
    rows: number,
    cols: number,
    xLast: number,
};

export function getGridParams(w: number, h: number, gap: number, tilesCount: number, tileAR: number) {
    let rows = 1;
    let cols = tilesCount;
    let optimalArea = 0;
    let optimal = { rows, cols, width: 0, height: 0 };
    while ((rows - 1) * cols <= tilesCount) {
        let width = Math.floor((w - (cols - 1) * gap) / cols);
        let height = Math.floor((h - (rows - 1) * gap) / rows);
        if (height * tileAR >= width) {
            height = Math.floor(width / tileAR);
        } else {
            width = Math.floor(height * tileAR);
        }
        const area = width * height;
        if (area > optimalArea) {
            optimalArea = area;
            optimal = { rows, cols, width, height };
        }
        rows = Math.ceil(tilesCount / (cols - 1));
        cols = Math.ceil(tilesCount / rows);
    }

    const lastRowSize = (tilesCount % optimal.cols) || optimal.cols;

    return {
        ...optimal,
        x: Math.floor((w - (optimal.cols * (optimal.width + gap) - gap)) / 2),
        xLast: Math.floor((w - (lastRowSize * (optimal.width + gap) - gap)) / 2),
        y: Math.floor((h - (optimal.rows * (optimal.height + gap) - gap)) / 2),
    } as GridParams;
}

export interface TilesLayoutInterface {
    setTilesCount(count: number): void;

    getTileCoords(n: number): TileParams;
}

export default class TilesLayout implements TilesLayoutInterface {
    #width: number;
    #height: number;
    #gap: number;
    #tileAR: number;
    #tilesCount = 1;
    // [rows, cols, width, height]
    #calcCache = new Map<number, GridParams>();

    constructor(width: number, height: number, gap: number, tileAR = DEFAULT_TILE_AR) {
        this.#width = width;
        this.#height = height;
        this.#gap = gap;
        this.#tileAR = tileAR;
    }

    setTilesCount(count: number) {
        this.#tilesCount = count;
        this.#recalculate();
    }

    getTileCoords(n: number): TileParams {
        const {rows, cols, width, height, x: xOff, xLast, y: yOff} = this.#calcCache.get(this.#tilesCount) as GridParams;
        const row = Math.floor(n / cols);
        const col = n - row * cols;
        const x = (row === (rows - 1) ? xLast : xOff) + col * (width + this.#gap);
        const y = yOff + row * (height + this.#gap);

        return {x, y, width, height};
    }

    #recalculate() {
        if (this.#calcCache.has(this.#tilesCount)) return;

        this.#calcCache.set(
            this.#tilesCount,
            getGridParams(this.#width, this.#height, this.#gap, this.#tilesCount, this.#tileAR)
        );
    }
}
