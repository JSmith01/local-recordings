import { TileParams } from './TilesLayout';
import { getCanvasImageSourceSize, makeImageSource, StreamImageSource } from './utils';

export interface TilePainterInterface {
    setStream(stream?: MediaStream): void;
    setCoords(coords: TileParams): void;
    setHighlight(value: boolean): void;
    draw(): void;
}

export type PlaceholderType = CanvasImageSource | Promise<CanvasImageSource>;

const DEFAULT_PLACEHOLDER = new Image(100, 100);
DEFAULT_PLACEHOLDER.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"%3E%3Ccircle r="50" cx="50" cy="50" fill="tomato"/%3E%3Ccircle r="41" cx="47" cy="50" fill="orange"/%3E%3Ccircle r="33" cx="48" cy="53" fill="gold"/%3E%3Ccircle r="25" cx="49" cy="51" fill="yellowgreen"/%3E%3Ccircle r="17" cx="52" cy="50" fill="lightseagreen"/%3E%3Ccircle r="9" cx="55" cy="48" fill="teal"/%3E%3C/svg%3E';

const DEFAULT_STYLE = {
    titleFont: '10px sans-serif',
    titleHeight: 12,
    titleFontColor: '#000',
    titleBg: 'rgba(200,200,200,0.5)',
    borderStyle: '#000',
    highlightStyle: '#0af1f1',
    tileBg: '#808080',
};

export type TileStyle = typeof DEFAULT_STYLE;

export default class TilePainter implements TilePainterInterface {
    #ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    #title: string;
    #placeholder: CanvasImageSource;
    #style: TileStyle;
    #coords: TileParams = { x: 0, y: 0, width: 0, height: 0 };
    #highlight = false;
    #streamImageSource?: StreamImageSource;

    constructor(
        ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
        title: string,
        placeholder?: PlaceholderType,
        style?: Partial<TileStyle>
    ) {
        this.#ctx = ctx;
        this.#title = title;
        this.#style = { ...DEFAULT_STYLE, ...style };
        if (typeof (placeholder as Promise<unknown>)?.then === 'function') {
            this.#placeholder = DEFAULT_PLACEHOLDER;
            (placeholder as Promise<CanvasImageSource>).then(value => {
                this.#placeholder = value;
            });
        } else {
            this.#placeholder = (placeholder as CanvasImageSource) ?? DEFAULT_PLACEHOLDER;
        }
    }

    draw(): void {
        const { x, y, width, height } = this.#coords;
        if (width === 0 || height === 0) return;

        // tile background
        this.#ctx.fillStyle = this.#style.tileBg;
        this.#ctx.fillRect(x, y, width, height);

        const tileAr = this.#coords.width / this.#coords.height;
        const frame= this.#streamImageSource?.frame.current;
        const [w, h] = frame ? getCanvasImageSourceSize(frame) : [0, 0];
        if (frame && w > 0 && h > 0) {
            // video frame
            const videoAr = w / h;
            let dstWidth = width;
            let dstHeight = height;
            if (videoAr >= tileAr) {
                // horizontally bound
                dstHeight = width / videoAr;
            } else {
                dstWidth = height * videoAr;
            }
            this.#ctx.drawImage(frame, x + (width - dstWidth) / 2, y + (height - dstHeight) / 2, dstWidth, dstHeight);
        } else {
            // placeholder
            const size = Math.min(width / 2, height / 2);
            const sourceSize = Math.min(w, h);

            // TODO reimplement, very glitchy
            // this.#ctx.save();
            // this.#ctx.arc(x + width / 2,y + height / 2, size / 2, 0, Math.PI*2,true);
            // this.#ctx.clip();
            const [placeholderW, placeholderH] = getCanvasImageSourceSize(this.#placeholder);
            this.#ctx.drawImage(
                this.#placeholder,
                (placeholderW - sourceSize) / 2,
                (placeholderH - sourceSize) / 2,
                sourceSize,
                sourceSize,
                x + (width - size) / 2,
                y + (height - size) / 2,
                size,
                size
            );
            // this.#ctx.restore();
        }

        // title background
        this.#ctx.fillStyle = this.#style.titleBg;
        const titleHeight = this.#style.titleHeight;
        this.#ctx.fillRect(x, y - titleHeight + height, width, titleHeight);
        // title text
        this.#ctx.fillStyle = this.#style.titleFontColor;
        this.#ctx.font = this.#style.titleFont;
        this.#ctx.textBaseline = 'bottom';
        this.#ctx.fillText(this.#title, x + 2, y + height - 1, width - 2);

        // border
        this.#ctx.strokeStyle = this.#highlight ? this.#style.highlightStyle : this.#style.borderStyle;
        this.#ctx.strokeRect(x, y, width, height);
    }

    setCoords(coords: TileParams): void {
        this.#coords = coords;
    }

    setHighlight(value: boolean): void {
        this.#highlight = value;
    }

    setStream(stream?: MediaStream): void {
        if (this.#streamImageSource) {
            this.#streamImageSource.stop();
            this.#streamImageSource = null;
        }

        if (!stream) return;

        this.#streamImageSource = makeImageSource(stream);
        this.#streamImageSource.start();
    }
}
