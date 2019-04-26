import { inject, injectable } from 'inversify';
import { Disposable, Event, EventEmitter, ProgressLocation, TextDocumentContentProvider, Uri, window, workspace } from 'vscode';

import { SpotifyConfig } from '../config/spotify-config';
import { showInformationMessage } from '../info/info';
import { TYPES } from '../ioc/types';
import { xhr } from '../request/request';
import { SpotifyStore } from '../store/store';

export class TextContentProvider implements TextDocumentContentProvider {
    htmlContent = '';

    private _onDidChange = new EventEmitter<Uri>();

    get onDidChange(): Event<Uri> {
        return this._onDidChange.event;
    }

    provideTextDocumentContent(_uri: Uri): string {
        return this.htmlContent;
    }

    update(uri: Uri) {
        this._onDidChange.fire(uri);
    }
}

@injectable()
export class LyricsController {

    readonly registration: Disposable;

    private readonly previewUri = Uri.parse('vscode-spotify://authority/vscode-spotify');
    private textContentProvider: TextContentProvider;

    constructor(
        @inject(TYPES.Store) private store: SpotifyStore,
        @inject(TYPES.Config) private config: SpotifyConfig
    ) {
        this.textContentProvider = new TextContentProvider();
        this.registration = workspace.registerTextDocumentContentProvider('vscode-spotify', this.textContentProvider);
    }

    async findLyrics() {
        window.withProgress({ location: ProgressLocation.Window, title: 'Searching for lyrics. This might take a while.' }, () =>
        this._findLyrics());
    }

    private async _findLyrics() {
        const state = this.store.getState();
        const { artist, name } = state.track;

        try {
            const result = await xhr({
                url: `${this.config.getLyricsServerUrl()}?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(name)}`
            });
            await this._previewLyrics(`${artist} - ${name}\n\n${result.responseText.trim()}`);
        } catch (e) {
            if (e.status === 404) {
                await this._previewLyrics(`Song lyrics for ${artist} - ${name} not found.\nYou can add it on https://genius.com/ .`);
            }
            if (e.status === 500) {
                await this._previewLyrics(`Error: ${e.responseText}`);
            }
        }
    }

    private async _previewLyrics(lyrics: string) {
        this.textContentProvider.htmlContent = lyrics;
        this.textContentProvider.update(this.previewUri);

        try {
            const document = await workspace.openTextDocument(this.previewUri);
            await window.showTextDocument(document, this.config.openPanelLyrics(), true);
        } catch (_ignored) {
            showInformationMessage('Failed to show lyrics' + _ignored);
        }
    }
}
