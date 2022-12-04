import RecordingProducer, {
    RecordingProducerInterface,
    RecordingProducerOptions,
    PlaceholderType
} from './RecordingProducer';


export interface Writer {
    write(data: Blob): Promise<void>;
    close(): Promise<void>;
}

export type RecordingFacadeOptions = {
    recorder?: MediaRecorderOptions,
    writer?: Writer,
    producer?: Partial<RecordingProducerOptions>,
};


export default class RecordingFacade implements RecordingProducerInterface {
    #writer?: Writer;
    #producer: RecordingProducerInterface;
    #recorder: MediaRecorder;
    #stopped: false;
    #stopPromise = Promise.resolve();
    #stopPromiseResolver = () => void 0;

    constructor(options?: RecordingFacadeOptions) {
        if (options.writer) {
            this.#writer = options.writer;
        }
        this.#producer = new RecordingProducer(options?.producer);
        this.#initRecorder(options?.recorder);
    }

    #initRecorder(options?: MediaRecorderOptions) {
        const recorder = new MediaRecorder(this.#producer.outputStream, options);
        let prevPromise = Promise.resolve();
        recorder.ondataavailable = async e => {
            await prevPromise;
            prevPromise = this.#writer.write(e.data);
        }
        recorder.onstop = async () => {
            await prevPromise;
            await this.#writer.close();
            this.#writer = undefined;
            this.#stopPromiseResolver();
        }

        this.#recorder = recorder;
    }

    setWriter(outputWriter: Writer) {
        this.#writer = outputWriter;
    }

    startRendering() {
        this.#producer.start();
    }

    async start() {
        if (!this.#writer) throw new Error('No writer');
        if (this.#stopped) return;

        await this.#producer.resumeAudio();
        this.#producer.start();
        this.#recorder.start();
    }

    stop(): Promise<void> {
        if (this.#stopped) return;

        this.#stopPromise = new Promise<void>(resolve => {
            this.#stopPromiseResolver = resolve;
        });
        this.#recorder.stop();
        this.#producer.stop();

        return this.#stopPromise;
    }

    get isStopped() {
        return this.#stopped;
    }

    /* Recording producer instance pass-through */

    get outputStream() {
        return this.#producer.outputStream;
    }

    setOrder(ids: string[]): void {
        this.#producer.setOrder(ids);
    }

    setHighLight(id?: string): void {
        this.#producer.setHighLight(id);
    }

    addStream(id: string, stream: MediaStream): void {
        this.#producer.addStream(id, stream);
    }

    removeStream(id: string): void {
        this.#producer.removeStream(id);
    }

    draw(): void {
        this.#producer.draw();
    }

    resumeAudio(): Promise<void> {
        return this.#producer.resumeAudio();
    }

    get _canvas() {
        return this.#producer._canvas;
    }

    addTile(id: string, title: string, placeholder?: PlaceholderType, stream?: MediaStream, isBig?: boolean): void {
        this.#producer.addTile(id, title, placeholder, stream, isBig);
    }

    removeTile(id: string): void {
        this.#producer.removeTile(id);
    }
}
