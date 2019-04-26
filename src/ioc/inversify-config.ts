import { Api } from '@vscodespotify/spotify-common';
import { Container } from 'inversify';
import createSagaMiddleware from 'redux-saga';
import 'reflect-metadata';
import { ExtensionContext } from 'vscode';

import { SpotifyAction } from '../actions/actions';
import { getSpotifyWebApi } from '../auth/api/api';
import { SpotifyControls } from '../components/spotify-controls';
import { SpotifyStatus } from '../components/spotify-status';
import { SpotifyConfig } from '../config/spotify-config';
import { SpotifyLogger } from '../info/logger';
import { SpotifySaga } from '../saga/saga';
import { SpotifyStatusController } from '../spotify-status-controller';
import { SpotifyClient, SpotifyClientFactory } from '../spotify/spotify-client';
import { SpotifyStore, SpotifyStoreInitializer } from '../store/store';

import { TYPES } from './types';

let spotifyContainer: Container;

export function setupContainer(context: ExtensionContext) {
    if (spotifyContainer) {
        return;
    }

    spotifyContainer = new Container();

    spotifyContainer.bind<SpotifyConfig>(TYPES.Config)
        .to(SpotifyConfig)
        .inSingletonScope();

    spotifyContainer.bind<SpotifyLogger>(TYPES.Logger)
        .to(SpotifyLogger)
        .inSingletonScope();

    spotifyContainer.bind<SpotifyAction>(TYPES.Action)
        .toConstantValue(new SpotifyAction());

    const storeInitializer = new SpotifyStoreInitializer(
        spotifyContainer.resolve(SpotifyLogger)
    );
    const sagaMiddleware = createSagaMiddleware();

    spotifyContainer.bind<SpotifyStore>(TYPES.Store)
        .toConstantValue(storeInitializer.initializeStore(context.globalState, sagaMiddleware));

    spotifyContainer.bind<() => Api | undefined>(TYPES.Api)
        .toFunction(() => getSpotifyWebApi(
            spotifyContainer.get<SpotifyStore>(TYPES.Store),
            spotifyContainer.resolve(SpotifyAction),
            spotifyContainer.resolve(SpotifyConfig),
            spotifyContainer.resolve(SpotifyLogger)
        ));

    spotifyContainer.bind<SpotifyControls>(TYPES.Controls)
        .to(SpotifyControls)
        .inSingletonScope();
    spotifyContainer.bind<SpotifyStatus>(TYPES.Status)
        .to(SpotifyStatus)
        .inSingletonScope();

    spotifyContainer.bind<SpotifyStatusController>(TYPES.StatusController)
        .to(SpotifyStatusController)
        .inSingletonScope();

    spotifyContainer.bind<SpotifyClient>(TYPES.Client)
        .toConstantValue(new SpotifyClientFactory(
            spotifyContainer.get<() => Api | undefined>(TYPES.Api),
            spotifyContainer.resolve(SpotifyConfig),
            spotifyContainer.resolve(SpotifyStatusController),
            spotifyContainer.get<SpotifyStore>(TYPES.Store),
            spotifyContainer.resolve(SpotifyLogger)
        ).getSpotifyClient());

    spotifyContainer.bind<SpotifySaga>(TYPES.Saga)
        .to(SpotifySaga)
        .inSingletonScope();

    // Run middleware
    sagaMiddleware.run(spotifyContainer.resolve(SpotifySaga).saga);
}

export { spotifyContainer };