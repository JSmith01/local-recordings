import TilesLayout, { TilesLayoutInterface } from './TilesLayout';
import TilePainter, { PlaceholderType, TilePainterInterface, TileStyle } from './TilePainter';
import { omit } from './utils';

type RecordingTile = {
    title: string,
    placeholder?: PlaceholderType,
    painter: TilePainterInterface,
};

const DEFAULT_RECORDING_OPTIONS = {
    width: 1280,
    height: 720,
    frameRate: 30,
    bigTileShare: 0.75,
    tileGap: 4,
    bigTileGap: 4,
};

export type RecordingProducerOptions = typeof DEFAULT_RECORDING_OPTIONS & Partial<TileStyle>;

export interface RecordingProducerInterface {
    readonly outputStream: MediaStream;
    addTile(id: string, title: string, placeholder?: CanvasImageSource, stream?: MediaStream, isBig?: boolean): void;
    removeTile(id: string): void;
    setOrder(ids: string[]): void;
    setHighLight(id?: string): void;
    addStream(id: string, stream: MediaStream): void;
    removeStream(id: string): void;
    draw(): void;
    stop(): void;
}

export default class RecordingProducer implements RecordingProducerInterface {
    #stopped = false;
    #opts: RecordingProducerOptions;
    #canvas: HTMLCanvasElement;
    #ctx: CanvasRenderingContext2D;
    #outputStream: MediaStream;
    #streams = new Map<string, MediaStream>();
    #tiles = new Map<string, RecordingTile>();
    #highlightId?: string;
    #bigId?: string;
    #orderedIds: string[] = [];
    #layoutManager: TilesLayoutInterface;
    #layoutManagerWithBig: TilesLayoutInterface;
    #bigLayoutOffset: number;

    constructor(options?: Partial<RecordingProducerOptions>) {
        const opts = { ...DEFAULT_RECORDING_OPTIONS, ...options };
        this.#opts = opts;
        this.#canvas = document.createElement('canvas');
        this.#canvas.width = opts.width;
        this.#canvas.height = opts.height;
        const ctx = this.#canvas.getContext('2d');
        if (!ctx) throw new Error('cannot construct canvas 2d context');
        this.#ctx = ctx;
        this.#outputStream = this.#canvas.captureStream(opts.frameRate);
        this.#layoutManager = new TilesLayout(opts.width, opts.height, opts.tileGap);
        this.#layoutManagerWithBig = new TilesLayout(
            Math.floor(opts.width * (1 - opts.bigTileShare) - opts.bigTileGap),
            opts.height,
            opts.tileGap
        );
        this.#bigLayoutOffset = Math.floor(opts.bigTileShare * opts.width) + opts.bigTileGap;

        this.#update();
    }

    get _canvas() {
        return this.#canvas;
    }

    get #activeIds() {
        return this.#bigId && !this.#orderedIds.includes(this.#bigId)
                ? [this.#bigId, ...this.#orderedIds] : this.#orderedIds;
    }

    draw(): void {
        this.#ctx.clearRect(0, 0, this.#opts.width, this.#opts.height);
        this.#activeIds.forEach(id => this.#tiles.get(id).painter.draw());
    }

    get outputStream() {
        return this.#outputStream;
    }

    addTile(id: string, title: string, placeholder?: PlaceholderType, stream?: MediaStream, isBig = false) {
        const painter = new TilePainter(this.#ctx, title, placeholder, omit(Object.keys(DEFAULT_RECORDING_OPTIONS), this.#opts));
        this.#tiles.set(id, { title, placeholder, painter });

        if (isBig) {
            this.#bigId = id;
        }

        if (stream) {
            this.addStream(id, stream);
        } else {
            this.#update();
        }
    }

    removeTile(id: string) {
        this.#tiles.delete(id);

        if (id === this.#bigId) {
            this.#bigId = undefined;
        }

        if (id === this.#highlightId) {
            this.#highlightId = undefined;
        }

        const idx = this.#orderedIds.indexOf(id);
        if (idx !== -1) {
            this.#orderedIds.splice(idx, 1);
        }

        this.removeStream(id);
    }

    setOrder(ids: string[]) {
        this.#orderedIds = ids.filter(id => this.#tiles.has(id));
        this.#update();
    }

    setHighLight(id?: string) {
        if (this.#highlightId) {
            this.#tiles.get(this.#highlightId)!.painter.setHighlight(false);
        }
        if (!id) return;

        const highlightedTile = this.#tiles.get(id);
        if (!highlightedTile) return;
        this.#highlightId = id;
        highlightedTile.painter.setHighlight(true);
    }

    addStream(id: string, stream: MediaStream) {
        this.#streams.set(id, stream);
        this.#tiles.get(id)?.painter.setStream(stream);
        this.#update();
    }

    removeStream(id: string) {
        this.#streams.delete(id);
        this.#tiles.get(id)?.painter.setStream();
        this.#update();
    }

    stop() {
        this.#outputStream.getTracks().forEach(track => track.stop());
        this.#stopped = true;
    }

    #update() {
        const hasBigLayout = this.#bigId && this.#tiles.size > 1;
        const layoutManager = hasBigLayout ? this.#layoutManagerWithBig : this.#layoutManager;
        layoutManager.setTilesCount(this.#tiles.size - (hasBigLayout ? 1 : 0));
        let i = 0;
        this.#activeIds.forEach(id => {
            const isBig = id === this.#bigId;
            const tile = this.#tiles.get(id);
            if (!tile) return;

            tile.painter.setHighlight(id === this.#highlightId);

            const coords = isBig ? {
                    x: 0,
                    y: 0,
                    height: this.#opts.height,
                    width: Math.floor(this.#opts.width * (hasBigLayout ? this.#opts.bigTileShare : 1))
                } : layoutManager.getTileCoords(i);

            if (!isBig && hasBigLayout) {
                coords.x += this.#bigLayoutOffset;
            }

            tile.painter.setCoords(coords);

            if (!isBig) {
                i++;
            }
        });
    }
}
