import { ISpotifyStatusState } from '../state/state';

/**
 * True if on last state of Spotify it was muted(volume was equal 0)
 */
export function isMuted(state: ISpotifyStatusState) {
    return state.playerState.volume === 0;
}