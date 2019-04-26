import autobind from 'autobind-decorator';
import { injectable } from 'inversify';
import { workspace } from 'vscode';

import { isWebApiSpotifyClient } from '../spotify/spotify-client';

export type TrackInfoClickBehaviour = 'none' | 'focus_song' | 'play_pause';

@injectable()
@autobind
export class SpotifyConfig {
    isButtonToBeShown(buttonId: string): boolean {
        return this.getConfig().get(`show${buttonId[0].toUpperCase()}${buttonId.slice(1)}`, false);
    }

    getButtonPriority(buttonId: string): number {
        const config = this.getConfig();
        return config.get('priorityBase', 0) + config.get(`${buttonId}Priority`, 0);
    }

    getStatusCheckInterval(): number {
        const isWebApiClient = isWebApiSpotifyClient(this.getForceWebApiImplementation());
        let interval = this.getConfig().get('statusCheckInterval', 5000);
        if (isWebApiClient) {
            interval = Math.max(interval, 5000);
        }
        return interval;
    }

    getLyricsServerUrl(): string {
        return this.getConfig().get<string>('lyricsServerUrl', '');
    }

    getAuthServerUrl(): string {
        return this.getConfig().get<string>('authServerUrl', '');
    }

    getSpotifyApiUrl(): string {
        return this.getConfig().get<string>('spotifyApiUrl', '');
    }

    openPanelLyrics(): number {
        return this.getConfig().get<number>('openPanelLyrics', 1);
    }

    getTrackInfoFormat(): string {
        return this.getConfig().get<string>('trackInfoFormat', '');
    }

    getForceWebApiImplementation(): boolean {
        return this.getConfig().get<boolean>('forceWebApiImplementation', false);
    }

    getEnableLogs(): boolean {
        return this.getConfig().get<boolean>('enableLogs', false);
    }

    getTrackInfoClickBehaviour(): TrackInfoClickBehaviour {
        return this.getConfig().get<TrackInfoClickBehaviour>('trackInfoClickBehaviour', 'focus_song');
    }

    private getConfig() {
        return workspace.getConfiguration('spotify');
    }
}
