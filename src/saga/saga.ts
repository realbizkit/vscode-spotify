import { Api } from '@vscodespotify/spotify-common';
import { Playlist, Track } from '@vscodespotify/spotify-common/lib/spotify/consts';
import autobind from 'autobind-decorator';
import { inject, injectable } from 'inversify';
import { call, put, takeEvery, takeLatest } from 'redux-saga/effects';
import { commands, Uri } from 'vscode';

import { ActionWithPayload, PlayTrackPayload, SpotifyAction, SpotifyActionType } from '../actions/actions';
import { withApi } from '../auth/api/api';
import { createDisposableAuthServer } from '../auth/server/local';
import { SpotifyConfig } from '../config/spotify-config';
import { showInformationMessage } from '../info/info';
import { SpotifyLogger } from '../info/logger';
import { TYPES } from '../ioc/types';
import { SpotifyClient } from '../spotify/spotify-client';
import { DUMMY_PLAYLIST } from '../state/state';
import { SpotifyStore } from '../store/store';
import { artistsToArtist } from '../utils/utils';

@injectable()
@autobind
export class SpotifySaga {

    constructor(
        @inject(TYPES.Api) private getApi: () => Api | undefined,
        @inject(TYPES.Action) private action: SpotifyAction,
        @inject(TYPES.Config) private config: SpotifyConfig,
        @inject(TYPES.Client) private client: SpotifyClient,
        @inject(TYPES.Store) private store: SpotifyStore,
        @inject(TYPES.Logger) private logger: SpotifyLogger
    ) {
    }

    /**
     * Executes side effects for dispatched actions
     */
    *saga() {
        /**
         * Load playlists
         */
        yield takeLatest(SpotifyActionType.LOAD_PLAYLISTS, this.loadPlaylists$);
        /**
         * Select current track
         */
        yield takeEvery(SpotifyActionType.SELECT_CURRENT_TRACK, this.selectCurrentTrack$);
        /**
         * Load tracks if not loaded
         */
        yield takeEvery(SpotifyActionType.LOAD_TRACKS_IF_NOT_LODADED, this.loadTracksIfNotLoaded$);
        /**
         * Load tracks
         */
        yield takeLatest(SpotifyActionType.LOAD_TRACKS, this.loadTracks$);
        /**
         * Load tracks for selected playlist
         */
        yield takeEvery(SpotifyActionType.LOAD_TRACKS_FOR_SELECTED_PLAYLIST, this.loadTracksForSelectedPlaylist$);
        /**
         * Play track
         */
        yield takeEvery(SpotifyActionType.PLAY_TRACK, this.playTrack$);
        /**
         * Sign in
         */
        yield takeEvery(SpotifyActionType.SIGN_IN, this.signIn$);
    }

    private *loadPlaylists$() {
        const playlists = yield call(() => withApi(
            this.getApi,
            api => api.playlists.getAll()
        ));

        if (playlists) {
            yield put(this.action.loadPlaylistsSuccess(playlists));
        }
    }

    private *selectCurrentTrack$() {
        const state = this.store.getState();

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
                yield put(this.action.selectPlaylist(playlist));
                yield put(this.action.selectTrack(track!));
            }
        }
    }

    private *loadTracksIfNotLoaded$(action: ActionWithPayload<Playlist>) {
        const playlist = action.payload;
        if (!playlist) {
            return;
        }

        const { tracks } = this.store.getState();
        if (!tracks.has(playlist.id)) {
            yield put(this.action.loadTracks(playlist));
        }
    }

    private *loadTracks$(action: ActionWithPayload<Playlist>) {
        const playlist = action.payload;
        if (!playlist || playlist.id === DUMMY_PLAYLIST.id) {
            return;
        }

        const tracks = yield call(() => withApi(
            this.getApi,
            api => api.playlists.tracks.getAll(playlist)
        ));

        if (tracks) {
            yield put(this.action.loadTracksSuccess({ playlist, tracks }));
        }
    }

    private *loadTracksForSelectedPlaylist$() {
        yield put(this.action.loadTracks(this.store.getState().selectedPlaylist || DUMMY_PLAYLIST));
    }

    private *playTrack$(action: ActionWithPayload<PlayTrackPayload>) {
        const { offset, playlist } = action.payload;
        yield call(() => withApi(
            this.getApi,
            api => api.player.play.put({
                offset,
                albumUri: playlist.uri
            })
        ));
        this.client.queryStatus();
    }

    private *signIn$() {
        yield call(() => commands.executeCommand('vscode.open', Uri.parse(`${this.config.getAuthServerUrl()}/login`)));

        const { createServerPromise, dispose } = yield call(
            createDisposableAuthServer, this.config.getAuthServerUrl(), this.logger
        );

        try {
            const { access_token, refresh_token } = yield call(() => createServerPromise);
            yield put(this.action.signInSuccess(access_token, refresh_token));
        } catch (e) {
            showInformationMessage(`Failed to retrieve access token: ${JSON.stringify(e)}`);
        } finally {
            dispose();
        }
    }
}