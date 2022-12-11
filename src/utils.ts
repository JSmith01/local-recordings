import { avg, create, max, push } from './circularBuffer';

export function omit(keys: string[], o: Record<string, unknown>): Record<string, unknown> {
    return Object.keys(o).reduce((a, key) => {
        if (!keys.includes(key)) a[key] = o[key];
        return a;
    }, {});
}

export function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.src = url;
        image.onload = () => resolve(image);
        image.onerror = e => reject(e);
    });
}

export function makeImageCircled(image: CanvasImageSource, maxSize: number = 300): ImageBitmap {
    const sourceSize = Math.min(image.width as number, image.height as number);
    const size = Math.min(maxSize, sourceSize);
    const halfSize = size / 2;
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
        image,
        ((image.width as number) - sourceSize) / 2,
        ((image.height as number) - sourceSize) / 2,
        sourceSize,
        sourceSize,
        0,
        0,
        size,
        size
    );
    ctx.fillStyle = '#fff'; //color doesn't matter, but we want full opacity
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(halfSize, halfSize, halfSize, 0, 2 * Math.PI, true);
    ctx.closePath();
    ctx.fill();

    // FF 105+, and unsupported in Safari
    return canvas.transferToImageBitmap();
}


export function profilingInit(bufferSize = 1000) {
    (window as any)._rpProf = create<number>(bufferSize);
    (window as any)._rpProfTs = create<number>(bufferSize);
    (window as any)._rpProfPrev = performance.now();
    (window as any)._rpProfReport = function() {
        const processedAvg = avg((window as any)._rpProf);
        const processedMax = max((window as any)._rpProf);
        const delaysAvg = avg((window as any)._rpProfTs);
        console.log({ processedAvg, processedMax, delaysAvg });
    }
}

export function profileCb(cb: Function, context?: object, args?: unknown[]) {
    const ts = performance.now();
    cb.apply(context, args);
    push((window as any)._rpProf, performance.now() - ts);
    push((window as any)._rpProfTs, ts - (window as any)._rpProfPrev);
    (window as any)._rpProfPrev = ts;
}
