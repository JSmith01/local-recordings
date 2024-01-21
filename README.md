# Local recording library for video conferencing web app

The main class is a `RecordingFacade` that hides all the video compositing and writing logic.
It can consume `writer` described by `Writer` interface, that's set using `RecordingFacade.setWriter(w: Writer)` API call.
`RecordingFacade` has one more method for debugging `startRendering()`, that initiates canvas periodic updates.

The rest API is covered by `RecordingProducerInterface` as follows:
```ts
interface RecordingProducerInterface {
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
```

The facade internally uses standard `MediaRecorder API` to produce non-indexed webm file with audio and video.

For the final result, it's possible to use either [File System API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API)
with Chromium-only call `showSaveFilePicker()` or some other implementation with the origin private file system (OPFS).
The library requires [MediaStreamTrackProcessor](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrackProcessor)
that's still also Chromium-only feature.
