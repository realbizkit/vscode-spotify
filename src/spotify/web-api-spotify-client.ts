import { Api } from '@vscodespotify/spotify-common/lib/spotify/api';
import autobind from 'autobind-decorator';
import { inject } from 'inversify';

import { withErrorAsync } from '../actions/with-error-async';
import { withApi } from '../auth/api/api';
import { NOT_RUNNING_REASON } from '../consts/consts';
import { SpotifyLogger } from '../info/logger';
import { TYPES } from '../ioc/types';
import { SpotifyStatusController } from '../spotify-status-controller';
import { ISpotifyStatusStatePartial } from '../state/state';
import { SpotifyStore } from '../store/store';
import { artistsToArtist, createCancelablePromise } from '../utils/utils';

import { SpotifyClient } from './spotify-client';

@autobind
export class WebApiSpotifyClient implements SpotifyClient {
    private prevVolume: number;

    constructor(
        @inject(TYPES.Api) private getApi: () => Api | undefined,
        @inject(TYPES.Store) private store: SpotifyStore,
        @inject(TYPES.StatusController) private statusController: SpotifyStatusController,
        @inject(TYPES.Logger) private logger: SpotifyLogger
    ) {
        this.queryStatus();
    }

    queryStatus() {
        this.logger.log('SCHEDULED QUERY STATUS');
        setTimeout(
            () => this.statusController.queryStatus(this.pollStatus),
            /*magic number for 'rapid' update. 1 second should? be enough*/ 1000
        );
    }

    @withErrorAsync()
    async next() {
        return withApi(
            this.getApi,
            async api => {
                await api.player.next.post();
                this.queryStatus();
            }
        );
    }

    @withErrorAsync()
    async previous() {
        return withApi(
            this.getApi,
            async api => {
                await api.player.previous.post();
                this.queryStatus();
            }
        );
    }

    @withErrorAsync()
    async play() {
        return withApi(
            this.getApi,
            async api => {
                await api.player.play.put({});
                this.queryStatus();
            }
        );
    }

    @withErrorAsync()
    async pause() {
        return withApi(
            this.getApi,
            async api => {
                await api.player.pause.put();
                this.queryStatus();
            }
        );
    }

    playPause() {
        const { playerState } = this.store.getState();
        if (playerState.state === 'playing') {
            this.pause();
        } else {
            this.play();
        }
    }

    pollStatus(_cb: (status: ISpotifyStatusStatePartial) => void, getInterval: () => number) {
        let canceled = false;

        const p = createCancelablePromise<void>((_, reject) => {
            const _poll = async () => {
                if (canceled) {
                    return;
                }

                const api = this.getApi();
                try {
                    if (api) {
                        this.logger.log('GETTING STATUS');

                        const player = await api.player.get();
                        if (!player) {
                            reject(NOT_RUNNING_REASON);
                            return;
                        }

                        this.logger.log('GOT STATUS', JSON.stringify(player));

                        if (!canceled) {
                            _cb({
                                isRunning: player.device.is_active,
                                playerState: {
                                    // fixme more than two states
                                    isRepeating: player.repeat_state !== 'off',
                                    isShuffling: player.shuffle_state,
                                    position: player.progress_ms,
                                    state: player.is_playing ? 'playing' : 'paused',
                                    volume: player.device.volume_percent
                                },
                                track: {
                                    album: player.item.album.name,
                                    artist: artistsToArtist(player.item.artists),
                                    name: player.item.name
                                },
                                context: player.context ? {
                                    uri: player.context.uri,
                                    trackNumber: player.item.track_number
                                } : void 0
                            });
                        }
                    }
                } catch (_e) {
                    reject(_e);
                    return;
                }
                setTimeout(_poll, getInterval());
            };
            _poll();
        });

        p.promise = p.promise.catch(err => {
            canceled = true;
            throw err;
        });

        return p;
    }

    @withErrorAsync()
    async muteVolume() {
        this.prevVolume = this.store.getState().playerState.volume;

        if (this.prevVolume !== 0) {
            withApi(
                this.getApi,
                async api => {
                    await api.player.volume.put(0);
                    this.queryStatus();
                }
            );
        }
    }

    @withErrorAsync()
    async unmuteVolume() {
        if (this.prevVolume) {
            withApi(
                this.getApi,
                async api => {
                    await api.player.volume.put(this.prevVolume);
                    this.queryStatus();
                }
            );
        }
    }

    muteUnmuteVolume() {
        const volume = this.store.getState().playerState.volume;

        if (volume === 0) {
            this.unmuteVolume();
        } else {
            this.muteVolume();
        }
    }

    @withErrorAsync()
    async volumeUp() {
        const volume = this.store.getState().playerState.volume || 0;

        withApi(
            this.getApi,
            async api => {
                await api.player.volume.put(Math.min(volume + 20, 100));
                this.queryStatus();
            }
        );
    }

    @withErrorAsync()
    async volumeDown() {
        const volume = this.store.getState().playerState.volume || 0;

        withApi(
            this.getApi,
            async api => {
                await api.player.volume.put(Math.max(volume - 20, 0));
                this.queryStatus();
            }
        );
    }

    @withErrorAsync()
    async toggleRepeating() {
        const { playerState } = this.store.getState();
        withApi(
            this.getApi,
            async api => {
                // fixme more than two states
                await api.player.repeat.put((!playerState.isRepeating) ? 'context' : 'off');
                this.queryStatus();
            }
        );
    }

    @withErrorAsync()
    async toggleShuffling() {
        const { playerState } = this.store.getState();

        withApi(
            this.getApi,
            async api => {
                await api.player.shuffle.put(!playerState.isShuffling);
                this.queryStatus();
            }
        );
    }
}
