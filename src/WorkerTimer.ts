const workerSrc = URL.createObjectURL(new Blob([`
self.onmessage = ({ data }) => {
    setTimeout(() => postMessage(data.n), data.to);
};
`]));

let n = 1;

type TimerCallback = () => void;

const callbacks = new Map<number, TimerCallback>();

const worker = new Worker(workerSrc);
worker.onmessage = ({ data }) => {
    const callback = callbacks.get(data);
    if (callback) {
        callbacks.delete(data);
        callback();
    }
};

export function wSetTimeout(cb: TimerCallback, to: number): number {
    const result = n++;
    callbacks.set(result, cb);
    worker.postMessage({ n: result, to });

    return result;
}

export function wClearTimeout(n: number) {
    callbacks.delete(n);
}

export function wShutdown(): void {
    callbacks.clear();
    worker.terminate();
}
