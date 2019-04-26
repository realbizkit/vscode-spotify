import { CANCELED_REASON } from '../consts/consts';

export function artistsToArtist(artists: { name: string }[]): string {
    return artists.map((a => a.name)).join(', ');
}

export function updateState<State>(obj: State, propertyUpdate: Partial<State>): State {
    return Object.assign({}, obj, propertyUpdate);
}

export interface CancelablePromise<T> {
    promise: Promise<T>;
    cancel: () => void;
}

export function createCancelablePromise<T>(
    executor: (resolve: (value?: T | PromiseLike<T>) => void,
    reject: (reason?: any) => void) => void
): CancelablePromise<T> {
    let cancel: () => void = null as any;
    const promise = new Promise<T>((resolve, reject) => {
        cancel = () => {
            reject(CANCELED_REASON);
        };
        executor(resolve, reject);
    });
    return { promise, cancel };
}