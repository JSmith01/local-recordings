export interface AudioMixerInterface {
    readonly outputTrack: MediaStreamTrack;
    resume(): Promise<void>;
    addStream(stream: MediaStream): void;
    removeStream(stream: MediaStream): void;
    shutdown(): void;
}

export default class AudioMixer implements AudioMixerInterface {
    #streams = new Set<MediaStream>();
    #sources = new Map<MediaStreamTrack, MediaStreamAudioSourceNode>();
    #context = new AudioContext();
    #outputNode = this.#context.createMediaStreamDestination();

    get outputTrack() {
        return this.#outputNode.stream.getAudioTracks()[0];
    }

    async resume() {
        if (this.#context.state === 'suspended') {
            return this.#context.resume();
        }
    }

    addStream(stream: MediaStream) {
        if (this.#streams.has(stream)) return;

        this.#streams.add(stream);
        const [track] = stream.getAudioTracks();
        if (track) {
            this.#handleAddStreamTrack({ track });
        }
        stream.addEventListener('addtrack', this.#handleAddStreamTrack);
        stream.addEventListener('removetrack', this.#handleRemoveStreamTrack);
    }

    removeStream(stream: MediaStream) {
        if (!this.#streams.has(stream)) return;

        const [track] = stream.getAudioTracks();
        if (track) {
            this.#handleRemoveStreamTrack({ track });
        }
        this.#cleanupStreamEventHandlers(stream);
        this.#streams.delete(stream);
    }

    #handleAddStreamTrack = ({ track }: { track: MediaStreamTrack }) => {
        if (this.#sources.has(track)) return;

        const node = this.#context.createMediaStreamSource(new MediaStream([track]));
        node.connect(this.#outputNode);
        this.#sources.set(track, node);
    };

    #handleRemoveStreamTrack = ({ track }: { track: MediaStreamTrack }) => {
        if (!this.#sources.has(track)) return;

        const node = this.#sources.get(track);
        node.disconnect();
        this.#sources.delete(track);
    };

    #cleanupStreamEventHandlers(stream) {
        stream.removeEventListener('addtrack', this.#handleAddStreamTrack);
        stream.removeEventListener('removetrack', this.#handleRemoveStreamTrack);
    }

    shutdown() {
        this.#sources.forEach(node => {
            node.disconnect();
        });
        this.#sources.clear();
        this.#streams.forEach(stream => this.#cleanupStreamEventHandlers(stream));
        this.#streams.clear();
    }
}
