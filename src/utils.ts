export function omit(keys: string[], o: Record<string, unknown>): Record<string, unknown> {
    return Object.keys(o).reduce((a, key) => {
        if (!keys.includes(key)) a[key] = o[key];
        return a;
    }, {});
}
