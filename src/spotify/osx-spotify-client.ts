import autobind from 'autobind-decorator';
import { inject } from 'inversify';
import * as spotify from 'spotify-node-applescript';
import { window } from 'vscode';

import { TYPES } from '../ioc/types';
import { SpotifyStatusController } from '../spotify-status-controller';
import { ISpotifyStatusStatePartial } from '../state/state';
import { isMuted } from '../store/selector';
import { SpotifyStore } from '../store/store';
import { createCancelablePromise } from '../utils/utils';

import { SpotifyClient } from './spotify-client';

@autobind
export class OsxSpotifyClient implements SpotifyClient {

    constructor(
        @inject(TYPES.Store) private store: SpotifyStore,
        @inject(TYPES.StatusController) private statusController: SpotifyStatusController
    ) {
        this.queryStatus();
    }

    queryStatus() {
        this.statusController.queryStatus(this.pollStatus);
    }

    next() {
        spotify.next(this.queryStatus);
    }
    previous() {
        spotify.previous(this.queryStatus);
    }
    play() {
        spotify.play(this.queryStatus);
    }
    pause() {
        spotify.pause(this.queryStatus);
    }
    playPause() {
        spotify.playPause(this.queryStatus);
    }
    muteVolume() {
        spotify.muteVolume(this.queryStatus);
    }
    unmuteVolume() {
        spotify.unmuteVolume(this.queryStatus);
    }
    muteUnmuteVolume() {
        if (isMuted(this.store.getState())) {
            spotify.unmuteVolume(this.queryStatus);
        } else {
            spotify.muteVolume(this.queryStatus);
        }
    }
    volumeUp() {
        spotify.volumeUp(this.queryStatus);
    }
    volumeDown() {
        spotify.volumeDown(this.queryStatus);
    }
    toggleRepeating() {
        spotify.toggleRepeating(this.queryStatus);
    }
    toggleShuffling() {
        spotify.toggleShuffling(this.queryStatus);
    }
    pollStatus(cb: (status: ISpotifyStatusStatePartial) => void, getInterval: () => number) {
        let canceled = false;
        const p = createCancelablePromise<void>((_, reject) => {
            const _poll = () => {
                if (canceled) {
                    return;
                }
                if (!window.state.focused) {
                    setTimeout(_poll, getInterval());
                    return;
                }
                this.getStatus().then(status => {
                    cb(status);
                    setTimeout(_poll, getInterval());
                }).catch(reject);
            };
            _poll();
        });
        p.promise = p.promise.catch(err => {
            canceled = true;
            throw err;
        });
        return p;
    }

    private getStatus(): Promise<ISpotifyStatusStatePartial> {
        return this._promiseIsRunning().then(isRunning => {
            if (!isRunning) {
                return Promise.reject<ISpotifyStatusStatePartial>('Spotify isn\'t running');
            }
            return Promise.all<spotify.State | spotify.Track | boolean>([
                this._promiseGetState(),
                this._promiseGetTrack(),
                this._promiseIsRepeating(),
                this._promiseIsShuffling()
            ]).then(values => {
                const spState = values[0] as spotify.State & { state: 'playing' | 'paused' };
                const state: ISpotifyStatusStatePartial = {
                    playerState: Object.assign(spState, {
                        isRepeating: values[2] as boolean,
                        isShuffling: values[3] as boolean
                    }),
                    track: values[1] as spotify.Track,
                    isRunning: true
                };
                return state;
            }) as any;
        });
    }

    private _promiseIsRunning() {
        return new Promise<boolean>((resolve, reject) => {
            spotify.isRunning((err, isRunning) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(isRunning);
                }
            });
        });
    }

    private _promiseGetState() {
        return new Promise<spotify.State>((resolve, reject) => {
            spotify.getState((err, state) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(state);
                }
            });
        });
    }

    private _promiseGetTrack() {
        return new Promise<spotify.Track>((resolve, reject) => {
            spotify.getTrack((err, track) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(track);
                }
            });
        });
    }

    private _promiseIsRepeating() {
        return new Promise<boolean>((resolve, reject) => {
            spotify.isRepeating((err, repeating) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(repeating);
                }
            });
        });
    }

    private _promiseIsShuffling() {
        return new Promise<boolean>((resolve, reject) => {
            spotify.isShuffling((err, shuffling) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(shuffling);
                }
            });
        });
    }
}
