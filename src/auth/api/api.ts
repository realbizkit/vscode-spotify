import { Api, getApi } from '@vscodespotify/spotify-common';
import { window } from 'vscode';

import { SpotifyAction } from '../../actions/actions';
import { SpotifyConfig } from '../../config/spotify-config';
import { showWarningMessage } from '../../info/info';
import { SpotifyLogger } from '../../info/logger';
import { SpotifyStore } from '../../store/store';

export function getSpotifyWebApi(
    store: SpotifyStore,
    action: SpotifyAction,
    config: SpotifyConfig,
    logger: SpotifyLogger
): Api | undefined {
    const { loginState, api } = store.getState();
    if (!loginState) {
        logger.log('getSpotifyWebApi', 'NOT LOGGED IN');
        return undefined;
    }
    if (!window.state.focused) {
        logger.log('getSpotifyWebApi', 'NOT FOCUSED');
        return undefined;
    }
    if (!api) {
        const newApi = getApi(
            config.getAuthServerUrl(),
            loginState.accessToken,
            loginState.refreshToken,
            (token: string) => store.dispatch(action.signInSuccess(token, loginState.refreshToken))
        );
        store.dispatch(action.saveApi(newApi));
    }
    return api;
}

export function withApi<T = unknown>(apiGetter: () => Api | undefined, func: (api: Api) => T): T | undefined {
    const api = apiGetter();

    if (api) {
        return func(api);
    } else {
        showWarningMessage('You should be logged in order to use this feature.');
        return undefined;
    }
}