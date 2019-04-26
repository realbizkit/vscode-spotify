import { inject, injectable } from 'inversify';
import * as path from 'path';
import * as vscode from 'vscode';

import { SpotifyAction } from '../actions/actions';
import { TYPES } from '../ioc/types';
import { Playlist } from '../state/state';
import { SpotifyStore } from '../store/store';

export function connectPlaylistTreeView(view: vscode.TreeView<Playlist>, store: SpotifyStore, action: SpotifyAction) {
    return vscode.Disposable.from(
        view.onDidChangeSelection(e => {
            store.dispatch(action.selectPlaylist(e.selection[0]));
            store.dispatch(action.loadTracksIfNotLoaded(e.selection[0]));
        }),
        view.onDidChangeVisibility(e => {
            if (e.visible) {
                const state = store.getState();
                if (!state.playlists.length) {
                    store.dispatch(action.loadPlaylists());
                }

                if (state.selectedPlaylist) {
                    const p = state.playlists.find(pl => pl.id === state.selectedPlaylist!.id);
                    if (p && !view.selection.indexOf(p)) {
                        view.reveal(p, { focus: true, select: true });
                    }
                }
            }
        })
    );
}

@injectable()
export class TreePlaylistProvider implements vscode.TreeDataProvider<Playlist> {
    readonly onDidChangeTreeDataEmitter: vscode.EventEmitter<Playlist | undefined> = new vscode.EventEmitter<Playlist | undefined>();
    readonly onDidChangeTreeData: vscode.Event<Playlist | undefined> = this.onDidChangeTreeDataEmitter.event;

    private playlists: Playlist[];

    constructor(
        @inject(TYPES.Store) private store: SpotifyStore
    ) {
        this.store.subscribe(() => {
            const { playlists } = this.store.getState();

            if (this.playlists !== playlists) {
                this.playlists = playlists;
                this.refresh();
            }
        });
    }

    getParent(_p: Playlist) {
        return void 0; // all playlists are in root
    }

    refresh(): void {
        this.onDidChangeTreeDataEmitter.fire();
    }

    getTreeItem(p: Playlist): PlaylistTreeItem {
        return new PlaylistTreeItem(p, vscode.TreeItemCollapsibleState.None);
    }

    getChildren(element?: Playlist): Thenable<Playlist[]> {
        if (element) {
            return Promise.resolve([]);
        }
        if (!this.playlists) {
            return Promise.resolve([]);
        }

        return new Promise(resolve => {
            resolve(this.playlists);
        });
    }
}

class PlaylistTreeItem extends vscode.TreeItem {

    get tooltip(): string {
        return `${this.playlist.id}:${this.label}`;
    }

    iconPath = {
        light: path.join(__filename, '..', '..', '..', 'resources', 'light', 'playlist.svg'),
        dark: path.join(__filename, '..', '..', '..', 'resources', 'dark', 'playlist.svg')
    };
    contextValue = 'playlist';

    constructor(
        private readonly playlist: Playlist,
        readonly collapsibleState: vscode.TreeItemCollapsibleState,
        readonly command?: vscode.Command
    ) {
        super(playlist.name, collapsibleState);
    }
}