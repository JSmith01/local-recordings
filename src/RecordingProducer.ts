import TilesLayout from './TilesLayout';

type RecordingTile = {
    title: string,
    placeholder?: CanvasImageSource,
};

export type RecordingProducerOptions = {
    width: number,
    height: number,
    frameRate: number,
    maxTiles: number,
    maxTilesWithBig: number,
    bigTileShare: number,
    titleFont: string,
    titleFontColor: string,
    titleBg: string,
    highlightWidth: number,
    tileGap: number,
    bigTileGap: number,
};

const DEFAULT_RECORDING_OPTIONS: RecordingProducerOptions = {
    width: 1280,
    height: 720,
    frameRate: 30,
    maxTiles: 4,
    maxTilesWithBig: 4,
    bigTileShare: 0.75,
    titleFont: '10px sans-serif',
    titleFontColor: '#000',
    titleBg: '#d0d0d0',
    highlightWidth: 3,
    tileGap: 4,
    bigTileGap: 4,
};

export interface RecordingProducerInterface {
    readonly outputStream: MediaStream;
    addTile(id: string, title: string, placeholder?: CanvasImageSource, stream?: MediaStream, isBig?: boolean): void;
    removeTile(id: string): void;
    setOrder(ids: string[], highlightId?: string): void;
    addStream(id: string, stream: MediaStream): void;
    removeStream(id: string): void;
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
    #layoutManager: TilesLayout;
    #layoutManagerWithMain: TilesLayout;

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
        this.#redraw();
        this.#layoutManager = new TilesLayout(opts.width, opts.height, opts.tileGap);
        this.#layoutManagerWithMain = new TilesLayout(
            Math.floor(opts.width * (1 - opts.bigTileShare) - opts.bigTileGap),
            opts.height,
            opts.tileGap
        );
    }

    get outputStream() {
        return this.#outputStream;
    }

    addTile(id: string, title: string, placeholder?: CanvasImageSource, stream?: MediaStream, isBig = false) {
        this.#tiles.set(id, {title, placeholder});

        if (isBig) {
            this.#bigId = id;
        }

        if (stream) {
            this.addStream(id, stream);
        } else {
            this.#redraw();
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

    setOrder(ids: string[], highlightId?: string) {
        this.#orderedIds = ids;
        this.#highlightId = highlightId;
        this.#redraw();
    }

    addStream(id: string, stream: MediaStream) {
        this.#streams.set(id, stream);
        this.#redraw();
    }

    removeStream(id: string) {
        this.#streams.delete(id);
        this.#redraw();
    }

    stop() {
        this.#outputStream.getTracks().forEach(track => track.stop());
        this.#stopped = true;
    }

    #redraw() {

    }
}
