import { inject, injectable } from 'inversify';
import * as moment from 'moment';

import { SpotifyConfig } from '../config/spotify-config';
import { TYPES } from '../ioc/types';

@injectable()
export class SpotifyLogger {
    constructor(
        @inject(TYPES.Config) private config: SpotifyConfig
    ) {}

    log(...args: any[]) {
        if (this.config.getEnableLogs()) {
            console.log.apply(console, ['vscode-spotify', moment().format('YYYY/MM/DD HH:MM:mm:ss:SSS'), ...args]);
        }
    }
}