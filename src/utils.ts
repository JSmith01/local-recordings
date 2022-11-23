export function omit(keys: string[], o: Record<string, unknown>): Record<string, unknown> {
    return Object.keys(o).reduce((a, key) => {
        if (!keys.includes(key)) a[key] = o[key];
        return a;
    }, {});
}

export function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.src = url;
        image.onload = () => resolve(image);
        image.onerror = e => reject(e);
    });
}
