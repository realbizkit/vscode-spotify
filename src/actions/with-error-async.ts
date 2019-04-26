import 'reflect-metadata';

import { showWarningMessage } from '../info/info';

export function withErrorAsync() {
    return (_target: any, _key: any, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            try {
                return await originalMethod.apply(this, args);
            } catch (e) {
                showWarningMessage('Failed to perform operation ' + e.message || e);
            }
        };

        return descriptor;
    };
}