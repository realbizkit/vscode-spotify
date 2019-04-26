import * as express from 'express';
import { Server } from 'http';

import { SpotifyLogger } from '../../info/logger';

export interface CreateDisposableAuthSeverPromiseResult {
    access_token: string;
    refresh_token: string;
}

export function createDisposableAuthServer(serverUrl: string, logger: SpotifyLogger) {
    let server: Server;
    const createServerPromise = new Promise<CreateDisposableAuthSeverPromiseResult>((res, rej) => {
        setTimeout(() => {
            rej('Timeout error. No response for 10 minutes.');
        }, 10 * 60 * 1000 /*10 minutes*/);
        try {
            const app = express();

            app.get('/callback', (request, response) => {
                const { access_token, refresh_token, error } = request.query;
                if (!error) {
                    res({ access_token, refresh_token });
                } else {
                    rej(error);
                }
                response.redirect(`${serverUrl}/?message=${encodeURIComponent('You can now close this tab')}`);
                request.destroy();
            });

            server = app.listen(8350);
        } catch (e) {
            rej(e);
        }
    });

    return {
        createServerPromise,
        dispose: () => server && server.close(() => {
            logger.log('server closed');
        })
    };
}
