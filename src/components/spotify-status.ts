import { inject, injectable } from 'inversify';
import { StatusBarAlignment, StatusBarItem, window } from 'vscode';

import { SpotifyConfig } from '../config/spotify-config';
import { TYPES } from '../ioc/types';
import { ILoginState, ITrack } from '../state/state';
import { SpotifyStore } from '../store/store';

import { SpotifyControls } from './spotify-controls';

@injectable()
export class SpotifyStatus {
    /**
     * Status bar with info from spotify
     */
    private _statusBarItem: StatusBarItem;
    private loginState: ILoginState | undefined;

    constructor(
        @inject(TYPES.Store) private store: SpotifyStore,
        @inject(TYPES.Config) private config: SpotifyConfig,
        @inject(TYPES.Controls) private controls: SpotifyControls
    ) {
        this.controls.showVisible();
        this.store.subscribe(() => {
            this.render();
        });
    }

    /**
     * Updates spotify status bar inside vscode
     */
    render() {
        const state = this.store.getState();
        // Create as needed
        if (!this._statusBarItem) {
            this._statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, this.config.getButtonPriority('trackInfo'));
            this._statusBarItem.show();
        }
        if (this.loginState !== state.loginState) {
            this.loginState = state.loginState;
            this.controls.showHideAuthButtons();
        }

        if (state.isRunning) {
            const { state: playing, volume, isRepeating, isShuffling } = state.playerState;
            const text = this.formattedTrackInfo(state.track);
            let toRedraw = false;

            if (text !== this._statusBarItem.text) {// we need this guard to prevent flickering
                this._statusBarItem.text = text;
                toRedraw = true;
            }

            if (this.controls.updateDynamicButtons(playing === 'playing', volume === 0, isRepeating, isShuffling)) {
                toRedraw = true;
            }

            if (toRedraw) {
                this._statusBarItem.show();
                this.controls.showVisible();
            }

            const trackInfoClickBehaviour = this.config.getTrackInfoClickBehaviour();

            if (trackInfoClickBehaviour === 'none') {
                this._statusBarItem.command = undefined;
            } else {
                this._statusBarItem.command = 'spotify.trackInfoClick';
            }
        } else {
            this._statusBarItem.text = '';
            this._statusBarItem.hide();
            this.controls.hideAll();
        }
    }

    /**
     * Disposes status bar items(if exist)
     */
    dispose() {
        if (this._statusBarItem) {
            this._statusBarItem.dispose();
        }
        if (this.controls) {
            this.controls.dispose();
        }
    }

    private formattedTrackInfo(track: ITrack): string {
        const { album, artist, name } = track;
        const keywordsMap: { [index: string]: string } = {
            albumName: album,
            artistName: artist,
            trackName: name
        };

        return this.config.getTrackInfoFormat()
            .replace(/albumName|artistName|trackName/gi, matched => keywordsMap[matched]);
    }
}
