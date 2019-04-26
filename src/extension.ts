import { ExtensionContext, window } from 'vscode';

import { SpotifyAction } from './actions/actions';
import { createCommands } from './commands';
import { SpotifyStatus } from './components/spotify-status';
import { connectPlaylistTreeView, TreePlaylistProvider } from './components/tree-playlists';
import { connectTrackTreeView, TreeTrackProvider } from './components/tree-track';
import { setupContainer, spotifyContainer } from './ioc/inversify-config';
import { TYPES } from './ioc/types';
import { SpotifyStatusController } from './spotify-status-controller';
import { SpotifyClient } from './spotify/spotify-client';
import { SpotifyStore } from './store/store';

// This method is called when your extension is activated. Activation is
// controlled by the activation events defined in package.json.
export function activate(context: ExtensionContext) {
    // Setup IoC
    setupContainer(context);

    const spotifyStatus = spotifyContainer.resolve(SpotifyStatus);
    const controller = spotifyContainer.resolve(SpotifyStatusController);
    const store = spotifyContainer.get<SpotifyStore>(TYPES.Store);

    const playlistTreeView = window.createTreeView('vscode-spotify-playlists', { treeDataProvider: new TreePlaylistProvider(store) });
    const treeTrackProvider = new TreeTrackProvider(store);
    const trackTreeView = window.createTreeView('vscode-spotify-tracks', { treeDataProvider: treeTrackProvider });
    treeTrackProvider.bindView(trackTreeView);

    const action = spotifyContainer.resolve(SpotifyAction);
    const client = spotifyContainer.get<SpotifyClient>(TYPES.Client);

    // Add to a list of disposables which are disposed when this extension is deactivated.
    context.subscriptions.push(connectPlaylistTreeView(playlistTreeView, store, action));
    context.subscriptions.push(connectTrackTreeView(trackTreeView, store, action));
    context.subscriptions.push(controller);
    context.subscriptions.push(spotifyStatus);
    context.subscriptions.push(playlistTreeView);
    context.subscriptions.push(createCommands(client));
}
