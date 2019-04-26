import { commands, Disposable } from 'vscode';

import { SpotifyAction } from './actions/actions';
import { SpotifyConfig } from './config/spotify-config';
import { spotifyContainer } from './ioc/inversify-config';
import { TYPES } from './ioc/types';
import { LyricsController } from './lyrics/lyrics';
import { SpotifyClient } from './spotify/spotify-client';
import { Playlist } from './state/state';
import { SpotifyStore } from './store/store';

export function createCommands(client: SpotifyClient): { dispose: () => void } {
    const config = spotifyContainer.resolve(SpotifyConfig);
    const action = spotifyContainer.resolve(SpotifyAction);
    const store = spotifyContainer.get<SpotifyStore>(TYPES.Store);
    const lyricsController = new LyricsController(store, config);

    const lyrics = commands.registerCommand('spotify.lyrics', lyricsController.findLyrics.bind(lyricsController));
    const next = commands.registerCommand('spotify.next', client.next.bind(client));
    const previous = commands.registerCommand('spotify.previous', client.previous.bind(client));
    const play = commands.registerCommand('spotify.play', client.play.bind(client));
    const pause = commands.registerCommand('spotify.pause', client.pause.bind(client));
    const playPause = commands.registerCommand('spotify.playPause', client.playPause.bind(client));
    const muteVolume = commands.registerCommand('spotify.muteVolume', client.muteVolume.bind(client));
    const unmuteVolume = commands.registerCommand('spotify.unmuteVolume', client.unmuteVolume.bind(client));
    const muteUnmuteVolume = commands.registerCommand('spotify.muteUnmuteVolume', client.muteUnmuteVolume.bind(client));
    const volumeUp = commands.registerCommand('spotify.volumeUp', client.volumeUp.bind(client));
    const volumeDown = commands.registerCommand('spotify.volumeDown', client.volumeDown.bind(client));
    const toggleRepeating = commands.registerCommand('spotify.toggleRepeating', client.toggleRepeating.bind(client));
    const toggleShuffling = commands.registerCommand('spotify.toggleShuffling', client.toggleShuffling.bind(client));
    const signIn = commands.registerCommand('spotify.signIn', () => store.dispatch(action.signIn()));
    const signOut = commands.registerCommand('spotify.signOut', () => store.dispatch(action.signOut()));
    const loadPlaylists = commands.registerCommand('spotify.loadPlaylists', () => store.dispatch(action.loadPlaylists()));
    const loadTracks = commands.registerCommand('spotify.loadTracks', () => store.dispatch(action.loadTracksForSelectedPlaylist()));
    const trackInfoClick = commands.registerCommand('spotify.trackInfoClick', () => {
        const trackInfoClickBehaviour = config.getTrackInfoClickBehaviour();
        if (trackInfoClickBehaviour === 'focus_song') {
            store.dispatch(action.selectCurrentTrack());
        } else if (trackInfoClickBehaviour === 'play_pause') {
            client.playPause();
        }
    });
    const playTrack = commands.registerCommand('spotify.playTrack', (offset: number, playlist: Playlist) =>
        store.dispatch(action.playTrack(offset, playlist))
    );

    return Disposable.from(lyrics,
        next,
        previous,
        play,
        pause,
        playPause,
        muteVolume,
        unmuteVolume,
        muteUnmuteVolume,
        volumeUp,
        volumeDown,
        toggleRepeating,
        toggleShuffling,
        signIn,
        signOut,
        loadPlaylists,
        loadTracks,
        trackInfoClick,
        playTrack,
        lyricsController.registration
    );
}