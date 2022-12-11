export type CircularArray<T> = Array<T> & { idx: number };

export const toArray = <T>(a: CircularArray<T>): Array<T> =>
    a.hasOwnProperty(a.length - 1) ? a.slice(a.idx).concat(a.slice(0, a.idx)) : a.slice(0, a.idx)

export const push = <T>(a: CircularArray<T>, v: T): void => {
    a[a.idx] = v;
    a.idx = (a.idx + 1) % a.length;
}

export const create = <T>(size: number): CircularArray<T> => Object.assign(new Array<T>(size), { idx: 0 });

export const len = <T>(a: CircularArray<T>): number => a.hasOwnProperty(a.length - 1) ? a.length : a.idx;

export const avg = (a: CircularArray<number>): number =>
    a.reduce((a, v) => a + (v ?? 0), 0) / (len(a) || 1);

export const max = (a: CircularArray<number>): number => Math.max(...(a.hasOwnProperty(a.length - 1) ? a : a.slice(0, a.idx)));
export const min = (a: CircularArray<number>): number => Math.min(...(a.hasOwnProperty(a.length - 1) ? a : a.slice(0, a.idx)));
