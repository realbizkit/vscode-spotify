import autobind from 'autobind-decorator';
import { inject, injectable } from 'inversify';

import { SpotifyAction } from './actions/actions';
import { SpotifyConfig } from './config/spotify-config';
import { CANCELED_REASON } from './consts/consts';
import { TYPES } from './ioc/types';
import { ISpotifyStatusStatePartial } from './state/state';
import { SpotifyStore } from './store/store';
import { CancelablePromise } from './utils/utils';

@injectable()
@autobind
export class SpotifyStatusController {
    private _retryCount: number;
    private _cancelCb?: () => void;
    /**
     * How many sequential errors is needed to hide all buttons
     */
    private _maxRetryCount: number;

    constructor(
        @inject(TYPES.Store) private store: SpotifyStore,
        @inject(TYPES.Action) private action: SpotifyAction,
        @inject(TYPES.Config) private config: SpotifyConfig
    ) {
        this._retryCount = 0;
        this._maxRetryCount = 5;
    }

    /**
     * Retrieves status of spotify and passes it to spotifyStatus;
     */
    queryStatus(pollStatus: (cb: (status: ISpotifyStatusStatePartial) => void, getInterval: () => number) => CancelablePromise<void>) {
        this._cancelPreviousPoll();
        const { promise, cancel } = pollStatus(status => {
            this.store.dispatch(this.action.updateState(status));
            this._retryCount = 0;
        }, this.config.getStatusCheckInterval);
        this._cancelCb = cancel;
        promise.catch(reason => this.clearState(reason, pollStatus));
    }

    dispose() {
        this._cancelPreviousPoll();
    }

    private clearState(
        reason: unknown,
        pollStatus: (cb: (status: ISpotifyStatusStatePartial) => void, getInterval: () => number) => CancelablePromise<void>
    ) {
        // canceling of the promise only happens when method queryStatus is triggered.
        if (reason !== CANCELED_REASON) {
            this._retryCount++;
            if (this._retryCount >= this._maxRetryCount) {
                this.store.dispatch(this.action.updateState({
                    playerState: {
                        position: 0, volume: 0, state: 'paused', isRepeating: false,
                        isShuffling: false
                    },
                    track: { album: '', artist: '', name: '' },
                    isRunning: false
                }));
                this._retryCount = 0;
            }
            setTimeout(() => this.queryStatus(pollStatus), this.config.getStatusCheckInterval());
        }
    }

    private _cancelPreviousPoll() {
        if (this._cancelCb) {
            this._cancelCb();
        }
    }
}
