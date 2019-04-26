import { Api } from '@vscodespotify/spotify-common/lib/spotify/api';
import { Playlist, Track } from '@vscodespotify/spotify-common/lib/spotify/consts';
import { injectable } from 'inversify';
import { Action } from 'redux';
import 'reflect-metadata';

import { ISpotifyStatusState } from '../state/state';

export interface ActionWithPayload<T = unknown> extends Action {
    payload: T;
}

export interface SignInSuccessPayload {
    accessToken: string;
    refreshToken: string;
}

export interface LoadTracksSuccessPayload {
    playlist: Playlist;
    tracks: Track[];
}

export interface PlayTrackPayload {
    offset: number;
    playlist: Playlist;
}

export enum SpotifyActionType {
    UPDATE_STATE = 'Update State',
    SIGN_IN = 'Sign In',
    SIGN_IN_SUCCESS = 'Sign In Success',
    SIGN_OUT = 'Sign Out',
    LOAD_PLAYLISTS = 'Load Playlists',
    LOAD_PLAYLISTS_SUCCESS = 'Load Playlists Success',
    SELECT_PLAYLIST = 'Select Playlists',
    LOAD_TRACKS = 'Load Tracks',
    LOAD_TRACKS_IF_NOT_LODADED = 'Load Tracks If Not Loaded',
    LOAD_TRACKS_FOR_SELECTED_PLAYLIST = 'Load Tracks For Selected Playlist',
    LOAD_TRACKS_SUCCESS = 'Load Tracks Success',
    SELECT_TRACK = 'Select Track',
    SELECT_CURRENT_TRACK = 'Select Current Track',
    SAVE_API = 'Save Api',
    PLAY_TRACK = 'Play Track'
}

@injectable()
export class SpotifyAction {

    updateState(update: Partial<ISpotifyStatusState>): ActionWithPayload<Partial<ISpotifyStatusState>> {
        return {
            type: SpotifyActionType.UPDATE_STATE,
            payload: update
        };
    }

    loadPlaylists(): Action {
        return {
            type: SpotifyActionType.LOAD_PLAYLISTS
        };
    }

    loadPlaylistsSuccess(playlists: Playlist[]): ActionWithPayload<Playlist[]> {
        return {
            type: SpotifyActionType.LOAD_PLAYLISTS_SUCCESS,
            payload: playlists
        };
    }

    selectPlaylist(playlist: Playlist): ActionWithPayload<Playlist> {
        return {
            type: SpotifyActionType.SELECT_PLAYLIST,
            payload: playlist
        };
    }

    selectTrack(track: Track): ActionWithPayload<Track> {
        return {
            type: SpotifyActionType.SELECT_TRACK,
            payload: track
        };
    }

    selectCurrentTrack(): Action {
        return {
            type: SpotifyActionType.SELECT_CURRENT_TRACK
        };
    }

    loadTracksIfNotLoaded(playlist: Playlist): ActionWithPayload<Playlist> {
        return {
            type: SpotifyActionType.LOAD_TRACKS_IF_NOT_LODADED,
            payload: playlist
        };
    }

    loadTracks(playlist: Playlist): ActionWithPayload<Playlist> {
        return {
            type: SpotifyActionType.LOAD_TRACKS,
            payload: playlist
        };
    }

    loadTracksSuccess(payload: LoadTracksSuccessPayload): ActionWithPayload<LoadTracksSuccessPayload> {
        return {
            type: SpotifyActionType.LOAD_TRACKS_SUCCESS,
            payload
        };
    }

    loadTracksForSelectedPlaylist(): Action {
        return {
            type: SpotifyActionType.LOAD_TRACKS_FOR_SELECTED_PLAYLIST
        };
    }

    playTrack(offset: number, playlist: Playlist): ActionWithPayload<PlayTrackPayload> {
        return {
            type: SpotifyActionType.PLAY_TRACK,
            payload: {
                offset,
                playlist
            }
        };
    }

    signIn(): Action {
        return {
            type: SpotifyActionType.SIGN_IN
        };
    }

    signInSuccess(accessToken: string, refreshToken: string): ActionWithPayload<SignInSuccessPayload> {
        const payload: SignInSuccessPayload = { accessToken, refreshToken };
        return {
            type: SpotifyActionType.SIGN_IN_SUCCESS,
            payload
        };
    }

    signOut(): Action {
        return {
            type: SpotifyActionType.SIGN_OUT
        };
    }

    saveApi(payload: Api): ActionWithPayload<Api> {
        return {
            type: SpotifyActionType.SAVE_API,
            payload
        };
    }
}