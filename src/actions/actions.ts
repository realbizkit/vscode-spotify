import { Api, getApi } from '@vscodespotify/spotify-common/lib/spotify/api';
import { Playlist, Track } from '@vscodespotify/spotify-common/lib/spotify/consts';
import autobind from 'autobind-decorator';
import { commands, Uri, window } from 'vscode';

import { createDisposableAuthSever } from '../auth/server/local';
import { getAuthServerUrl } from '../config/spotify-config';
import { log, showInformationMessage, showWarningMessage } from '../info/info';
import { DUMMY_PLAYLIST, ILoginState, ISpotifyStatusState } from '../state/state';
import { getState, getStore } from '../store/store';
import { artistsToArtist } from '../utils/utils';

export function withApi() {
    return (_target: any, _key: any, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value;

        descriptor.value = (...args: any[]) => {
            const api = getSpotifyWebApi();
            if (api) {
                return originalMethod.apply(this, [...args, api]);
            } else {
                showWarningMessage('You should be logged in order to use this feature.');
            }
        };

        return descriptor;
    };
}

export function withErrorAsync() {
    return (_target: any, _key: any, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value;

        descriptor.value = async (...args: any[]) => {
            try {
                return await originalMethod.apply(this, args);
            } catch (e) {
                showWarningMessage('Failed to perform operation ' + e.message || e);
            }
        };

        return descriptor;
    };
}

function actionCreator() {
    return (_target: any, _key: any, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value;

        descriptor.value = (...args: any[]) => {
            const action = originalMethod.apply(this, args);
            if (!action) {
                return;
            }
            getStore().dispatch(action);
        };

        return descriptor;
    };
}

function asyncActionCreator() {
    return (_target: any, _key: any, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value;

        descriptor.value = async (...args: any[]) => {
            let action;
            try {
                action = await originalMethod.apply(this, args);
                if (!action) {
                    return;
                }
            } catch (e) {
                showWarningMessage('Failed to perform operation ' + e.message || e);
            }
            getStore().dispatch(action);
        };

        return descriptor;
    };
}

const apiMap = new WeakMap<ILoginState, Api>();
export const getSpotifyWebApi = () => {
    const { loginState } = getState();
    if (!loginState) {
        log('getSpotifyWebApi', 'NOT LOGGED IN');
        return null;
    }
    if (!window.state.focused) {
        log('getSpotifyWebApi', 'NOT FOCUSED');
        return null;
    }
    let api = apiMap.get(loginState);
    if (!api) {
        api = getApi(getAuthServerUrl(), loginState.accessToken, loginState.refreshToken, (token: string) => {
            actionsCreator._actionSignIn(token, loginState.refreshToken);
        });
        apiMap.set(loginState, api);
    }
    return api;
};

export const UPDATE_STATE_ACTION = 'UPDATE_STATE_ACTION' as 'UPDATE_STATE_ACTION';
export const SIGN_IN_ACTION = 'SIGN_IN_ACTION' as 'SIGN_IN_ACTION';
export const SIGN_OUT_ACTION = 'SIGN_OUT_ACTION' as 'SIGN_OUT_ACTION';
export const PLAYLISTS_LOAD_ACTION = 'PLAYLISTS_LOAD_ACTION' as 'PLAYLISTS_LOAD_ACTION';
export const SELECT_PLAYLIST_ACTION = 'SELECT_PLAYLIST_ACTION' as 'SELECT_PLAYLIST_ACTION';
export const TRACKS_LOAD_ACTION = 'TRACKS_LOAD_ACTION' as 'TRACKS_LOAD_ACTION';
export const SELECT_TRACK_ACTION = 'SELECT_TRACK_ACTION' as 'SELECT_TRACK_ACTION';

export interface UpdateStateAction {
    type: typeof UPDATE_STATE_ACTION;
    state: Partial<ISpotifyStatusState>;
}

export interface SignInAction {
    type: typeof SIGN_IN_ACTION;
    accessToken: string;
    refreshToken: string;
}

export interface SignOutAction {
    type: typeof SIGN_OUT_ACTION;
}

export interface PlaylistsLoadAction {
    type: typeof PLAYLISTS_LOAD_ACTION;
    playlists: Playlist[];
}

export interface TracksLoadAction {
    type: typeof TRACKS_LOAD_ACTION;
    playlist: Playlist;
    tracks: Track[];
}

export interface SelectPlaylistAction {
    type: typeof SELECT_PLAYLIST_ACTION;
    playlist: Playlist;
}

export interface SelectTrackAction {
    type: typeof SELECT_TRACK_ACTION;
    track: Track;
}

class ActionCreator {
    @autobind
    @actionCreator()
    updateStateAction(state: Partial<ISpotifyStatusState>): UpdateStateAction {
        return {
            type: UPDATE_STATE_ACTION,
            state
        };
    }

    @autobind
    @asyncActionCreator()
    @withApi()
    async loadPlaylists(api?: Api): Promise<PlaylistsLoadAction> {
        const playlists = await api!.playlists.getAll();
        return {
            type: PLAYLISTS_LOAD_ACTION,
            playlists
        };
    }

    @autobind
    @actionCreator()
    selectPlaylistAction(p: Playlist): SelectPlaylistAction {
        return {
            type: SELECT_PLAYLIST_ACTION,
            playlist: p
        };
    }

    @autobind
    @actionCreator()
    selectTrackAction(track: Track): SelectTrackAction {
        return {
            type: SELECT_TRACK_ACTION,
            track
        };
    }

    @autobind
    selectCurrentTrack() {
        const state = getState();
        if (state.playerState && state.track) {
            let track: Track;
            const currentTrack = state.track;
            const playlist = state.playlists.find(p => {
                const tracks = state.tracks.get(p.id);
                if (tracks) {
                    const foundTrack = tracks.find(t => t.track.name === currentTrack.name
                        && t.track.album.name === currentTrack.album
                        && artistsToArtist(t.track.artists) === currentTrack.artist);

                    if (foundTrack) {
                        track = foundTrack;
                        return true;
                    }
                }
                return false;
            });

            if (playlist) {
                this.selectPlaylistAction(playlist);
                this.selectTrackAction(track!);
            }
        }
    }

    @autobind
    loadTracksForSelectedPlaylist(): void {
        this.loadTracks(getState().selectedPlaylist);
    }

    @autobind
    loadTracksIfNotLoaded(playlist: Playlist): void {
        if (!playlist) {
            return void 0;
        }
        const { tracks } = getState();
        if (!tracks.has(playlist.id)) {
            this.loadTracks(playlist);
        }
    }

    @autobind
    @asyncActionCreator()
    @withApi()
    async loadTracks(playlist?: Playlist, api?: Api): Promise<TracksLoadAction | undefined> {
        if (!playlist || playlist.id === DUMMY_PLAYLIST.id) {
            return void 0;
        }
        const tracks = await api!.playlists.tracks.getAll(playlist);
        return {
            type: TRACKS_LOAD_ACTION,
            playlist,
            tracks
        };
    }

    @autobind
    @withErrorAsync()
    @withApi()
    async playTrack(offset: number, playlist: Playlist, api?: Api): Promise<undefined> {
        await api!.player.play.put({
            offset,
            albumUri: playlist.uri
        });
        return;
    }

    @autobind
    actionSignIn() {
        commands.executeCommand('vscode.open', Uri.parse(`${getAuthServerUrl()}/login`)).then(() => {
            const { createServerPromise, dispose } = createDisposableAuthSever();
            createServerPromise.then(({ access_token, refresh_token }) => {
                this._actionSignIn(access_token, refresh_token);
            }).catch(e => {
                showInformationMessage(`Failed to retrieve access token : ${JSON.stringify(e)}`);
            }).then(() => {
                dispose();
            });
        });
    }

    @autobind
    @actionCreator()
    _actionSignIn(accessToken: string, refreshToken: string): SignInAction {
        return {
            accessToken,
            refreshToken,
            type: SIGN_IN_ACTION
        };
    }

    @autobind
    @actionCreator()
    actionSignOut(): SignOutAction {
        return {
            type: SIGN_OUT_ACTION
        };
    }
}

export type Action = UpdateStateAction |
    SignInAction |
    SignOutAction |
    PlaylistsLoadAction |
    SelectPlaylistAction |
    TracksLoadAction |
    SelectTrackAction;

export const actionsCreator = new ActionCreator();