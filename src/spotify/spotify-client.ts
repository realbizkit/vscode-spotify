import { Api } from '@vscodespotify/spotify-common';
import * as os from 'os';

import { SpotifyConfig } from '../config/spotify-config';
import { SpotifyLogger } from '../info/logger';
import { SpotifyStatusController } from '../spotify-status-controller';
import { ISpotifyStatusStatePartial } from '../state/state';
import { SpotifyStore } from '../store/store';
import { CancelablePromise } from '../utils/utils';

import { LinuxSpotifyClient } from './linux-spotify-client';
import { OsxSpotifyClient } from './osx-spotify-client';
import { WebApiSpotifyClient } from './web-api-spotify-client';

export function isWebApiSpotifyClient(forceWebApi: boolean) {
    const platform = os.platform();
    return forceWebApi || (platform !== 'darwin' && platform !== 'linux');
}

export class SpotifyClientFactory {
    constructor(
        private getApi: () => Api | undefined,
        private config: SpotifyConfig,
        private statusController: SpotifyStatusController,
        private store: SpotifyStore,
        private logger: SpotifyLogger
    ) {
    }

    getSpotifyClient() {
        const platform = os.platform();
        if (isWebApiSpotifyClient(this.config.getForceWebApiImplementation())) {
            return new WebApiSpotifyClient(this.getApi, this.store, this.statusController, this.logger);
        }

        if (platform === 'darwin') {
            return new OsxSpotifyClient(this.store, this.statusController);
        }

        if (platform === 'linux') {
            return new LinuxSpotifyClient(this.statusController, this.logger);
        }

        return new WebApiSpotifyClient(this.getApi, this.store, this.statusController, this.logger);
    }
}

export interface SpotifyClient {
    queryStatus(): void;
    next(): void;
    previous(): void;
    play(): void;
    pause(): void;
    playPause(): void;
    muteVolume(): void;
    unmuteVolume(): void;
    muteUnmuteVolume(): void;
    volumeUp(): void;
    volumeDown(): void;
    toggleRepeating(): void;
    toggleShuffling(): void;
    pollStatus(cb: (status: ISpotifyStatusStatePartial) => void, getInterval: () => number): CancelablePromise<void>;
}
