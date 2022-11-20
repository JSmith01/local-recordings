import { TileParams } from './TilesLayout';

export interface TilePainterInterface {
    setStream(stream?: MediaStream): void;
    setCoords(coords: TileParams): void;
    setHighlight(value: boolean): void;
    draw(): void;
}

export type TileStyle = {
    titleFont: string,
    titleFontColor: string,
    titleBg: string,
    highlightWidth: number,
};

const DEFAULT_STYLE: TileStyle = {
    titleFont: '10px sans-serif',
    titleFontColor: '#000',
    titleBg: '#d0d0d0',
    highlightWidth: 3,
};

export default class TilePainter implements TilePainterInterface {
    #ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    #title: string;
    #placeholder?: CanvasImageSource;
    #style: TileStyle;
    #coords: TileParams = { x: 0, y: 0, width: 0, height: 0 };
    #highlight = false;

    constructor(ctx: CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D, title: string, placeholder?: CanvasImageSource, style: TileStyle = DEFAULT_STYLE) {
        this.#ctx = ctx;
        this.#title = title;
        this.#placeholder = placeholder;
        this.#style = style;
    }

    draw(): void {
        // TODO
    }

    setCoords(coords: TileParams): void {
        this.#coords = coords;
    }

    setHighlight(value: boolean): void {
        this.#highlight = value;
    }

    setStream(stream?: MediaStream): void {
        // TODO
    }
}
