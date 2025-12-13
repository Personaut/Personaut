"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.window = exports.FileType = exports.Uri = exports.workspace = exports.LanguageModelChatMessage = exports.CancellationTokenSource = exports.extensions = exports.env = void 0;
exports.env = {
    appName: 'Visual Studio Code',
};
exports.extensions = {
    getExtension: jest.fn(),
};
class CancellationTokenSource {
    constructor() {
        this.token = {};
    }
}
exports.CancellationTokenSource = CancellationTokenSource;
exports.LanguageModelChatMessage = {
    User: jest.fn((text) => ({ role: 'user', text })),
    Assistant: jest.fn((text) => ({ role: 'assistant', text })),
};
exports.workspace = {
    getConfiguration: jest.fn(),
    workspaceFolders: [
        {
            uri: {
                fsPath: '/test/workspace',
            },
        },
    ],
    fs: {
        readFile: jest.fn(),
        writeFile: jest.fn(),
        readDirectory: jest.fn(),
        stat: jest.fn(),
    },
};
exports.Uri = {
    file: jest.fn((path) => ({ fsPath: path })),
};
exports.FileType = {
    Directory: 2,
    File: 1,
};
exports.window = {
    showErrorMessage: jest.fn(),
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn(),
};
//# sourceMappingURL=vscode.js.map