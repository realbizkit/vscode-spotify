import { window } from 'vscode';

export function showInformationMessage(message: string) {
    window.showInformationMessage(`vscode-spotify: ${message}`);
}

export function showWarningMessage(message: string) {
    window.showWarningMessage(`vscode-spotify: ${message}`);
}