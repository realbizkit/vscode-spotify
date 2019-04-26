import { Api } from '@vscodespotify/spotify-common';
import { Playlist, Track } from '@vscodespotify/spotify-common/lib/spotify/consts';

import { ActionWithPayload, LoadTracksSuccessPayload, SignInSuccessPayload, SpotifyActionType } from '../actions/actions';
import { DEFAULT_STATE, DUMMY_PLAYLIST, ISpotifyStatusState } from '../state/state';
import { updateState } from '../utils/utils';

export function rootReducer(state: ISpotifyStatusState, action: ActionWithPayload): ISpotifyStatusState {
    switch (action.type) {
        case SpotifyActionType.UPDATE_STATE:
            const payload = action.payload as Partial<ISpotifyStatusState>;
            return updateState(state, payload);

        case SpotifyActionType.SIGN_IN_SUCCESS:
            const { accessToken, refreshToken } = action.payload as SignInSuccessPayload;
            return updateState(state, {
                loginState: updateState(
                    state.loginState, { accessToken, refreshToken }
                )
            });

        case SpotifyActionType.SIGN_OUT:
            return DEFAULT_STATE;

        case SpotifyActionType.LOAD_PLAYLISTS_SUCCESS:
            const playlists = action.payload as Playlist[];
            return updateState(state, {
                playlists: playlists.length ? playlists : [DUMMY_PLAYLIST]
            });

        case SpotifyActionType.SELECT_PLAYLIST:
            const selectedPlaylist = action.payload as Playlist;
            return updateState(state, {
                selectedPlaylist
            });

        case SpotifyActionType.SELECT_TRACK:
            const track = action.payload as Track;
            return updateState(state, {
                selectedTrack: track
            });

        case SpotifyActionType.LOAD_TRACKS_SUCCESS:
            const { playlist, tracks } = action.payload as LoadTracksSuccessPayload;
            return updateState(state, {
                tracks: state.tracks.set(playlist.id, tracks)
            });

        case SpotifyActionType.SAVE_API:
            const api = action.payload as Api;
            return updateState(state, {
                api
            });

        default:
            return state;
    }
}