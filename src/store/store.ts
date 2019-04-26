import autobind from 'autobind-decorator';
import { Map } from 'immutable';
import { Action, applyMiddleware, createStore, Store } from 'redux';
import { PersistConfig, PersistPartial, persistReducer, persistStore } from 'redux-persist';
import { SagaMiddleware } from 'redux-saga';
import { Memento } from 'vscode';

import { SpotifyLogger } from '../info/logger';
import { rootReducer } from '../reducers/root-reducer';
import { DEFAULT_STATE, ISpotifyStatusState } from '../state/state';

import { createDummyStorage, createVscodeStorage } from './storage/vscode-storage';

export type SpotifyStore = Store<ISpotifyStatusState>;

@autobind
export class SpotifyStoreInitializer {
    constructor(
        private logger: SpotifyLogger
    ) {}

    initializeStore(memento: Memento, middleware: SagaMiddleware): SpotifyStore {
        const persistConfig = this.createPersistConfig(memento);
        const persistedReducer = persistReducer<ISpotifyStatusState, Action>(persistConfig, rootReducer);

        const reducer = (state: ISpotifyStatusState & PersistPartial, action: Action) => {
            this.logger.log('root-reducer', action.type, JSON.stringify(action));
            return persistedReducer(state, action);
        };

        const store = createStore(
            reducer,
            DEFAULT_STATE,
            applyMiddleware(middleware)
        );

        persistStore(store);
        return store;
    }

    private createPersistConfig(memento: Memento): PersistConfig {
        return {
            key: 'root',
            storage: memento ? createVscodeStorage(memento) : createDummyStorage(),
            transforms: [{
                out: (val: any, key: string) => {
                    if (key === 'tracks') {
                        return Map(val);
                    }
                    return val;
                },
                in: (val: any, _key: string) => val
            }]
        };
    }
}