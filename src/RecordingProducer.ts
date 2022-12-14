import TilesLayout, { TilesLayoutInterface } from './TilesLayout';
import TilePainter, { PlaceholderType, TilePainterInterface, TileStyle } from './TilePainter';
import { omit } from './utils';
/*import { profileCb, profilingInit } from './utils';*/
import AudioMixer, { AudioMixerInterface } from './AudioMixer';
import { wSetTimeout } from './WorkerTimer';

/*const PROFILING = false;
const PROFILING_BUFFER_SIZE = 1000;*/

type RecordingTile = {
    title: string,
    placeholder?: PlaceholderType,
    painter: TilePainterInterface,
};

export type { PlaceholderType };

const DEFAULT_RECORDING_OPTIONS = {
    width: 1280,
    height: 720,
    frameRate: 30,
    bigTileShare: 0.75,
    tileGap: 4,
    bigTileGap: 4,
    bg: '#FFF',
};

export type RecordingProducerOptions = typeof DEFAULT_RECORDING_OPTIONS & Partial<TileStyle>;

export interface RecordingProducerInterface {
    readonly outputStream: MediaStream;
    readonly isStopped: boolean;
    readonly _canvas: HTMLCanvasElement | OffscreenCanvas;
    addTile(id: string, title: string, placeholder?: PlaceholderType, stream?: MediaStream, isBig?: boolean): void;
    removeTile(id: string): void;
    setOrder(ids: string[]): void;
    setHighLight(id?: string): void;
    addStream(id: string, stream: MediaStream): void;
    removeStream(id: string): void;
    draw(): void;
    resumeAudio(): Promise<void>;
    start(): void;
    stop(): void;
}

export default class RecordingProducer implements RecordingProducerInterface {
    #stopped = false;
    #opts: RecordingProducerOptions;
    #canvas: HTMLCanvasElement | OffscreenCanvas;
    #ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    #outputStream: MediaStream;
    #streams = new Map<string, MediaStream>();
    #tiles = new Map<string, RecordingTile>();
    #highlightId?: string;
    #bigId?: string;
    #orderedIds: string[] = [];
    #layoutManager: TilesLayoutInterface;
    #layoutManagerWithBig: TilesLayoutInterface;
    #bigLayoutOffset: number;
    #updateTimer?: number;
    #audioMixer: AudioMixerInterface;

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
        this.#audioMixer = new AudioMixer();
        this.#outputStream.addTrack(this.#audioMixer.outputTrack);

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
        this.#ctx.fillStyle = this.#opts.bg;
        this.#ctx.fillRect(0, 0, this.#opts.width, this.#opts.height);
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

        if (!this.#orderedIds.includes(id)) {
            this.#orderedIds.push(id);
        }

        if (stream) {
            this.addStream(id, stream);
        } else {
            if (this.#streams.has(id)) {
                this.#tiles.get(id)!.painter.setStream(this.#streams.get(id));
            }
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

        this.#update();
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
        this.#audioMixer.addStream(stream);
        const tile = this.#tiles.get(id);
        if (tile) {
            tile.painter.setStream(stream);
            this.#update();
        }
    }

    removeStream(id: string) {
        const stream = this.#streams.get(id);
        if (stream) {
            this.#streams.delete(id);
            const streams = Array.from(this.#streams.values());
            if (!streams.includes(stream)) {
                this.#audioMixer.removeStream(stream);
            }
        }
        const tile = this.#tiles.get(id);
        if (tile) {
            tile.painter.setStream();
            this.#update();
        }
    }

    #updateCanvas() {
        const ts = performance.now();
        /*if (PROFILING) {
            profileCb(this.draw, this);
        } else {*/
            this.draw();
        /*}*/
        const delay = Math.round(1000 / this.#opts.frameRate - (performance.now() - ts));

        this.#updateTimer = wSetTimeout(() => this.#updateCanvas(), delay);
    }

    start() {
        if (this.#stopped) return;

        /*if (PROFILING) {
            profilingInit(PROFILING_BUFFER_SIZE);
        }*/

        this.#updateCanvas();
    }

    stop() {
        if (this.#stopped) return;

        if (this.#updateTimer) {
            clearTimeout(this.#updateTimer);
            this.#updateTimer = undefined;
        }
        this.#audioMixer.shutdown();
        this.#outputStream?.getTracks().forEach(track => track.stop());
        this.#stopped = true;
        this.#streams.clear();
        this.#tiles.clear();
        this.#orderedIds.length = 0;
        this.#bigId = undefined;
        this.#highlightId = undefined;
    }

    resumeAudio() {
        return this.#audioMixer.resume();
    }

    get isStopped() {
        return this.#stopped;
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
