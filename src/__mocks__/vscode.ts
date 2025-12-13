export const env = {
  appName: 'Visual Studio Code',
};

export const extensions = {
  getExtension: jest.fn(),
};

export class CancellationTokenSource {
  token = {};
}

export const LanguageModelChatMessage = {
  User: jest.fn((text: string) => ({ role: 'user', text })),
  Assistant: jest.fn((text: string) => ({ role: 'assistant', text })),
};

export const workspace = {
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

export const Uri = {
  file: jest.fn((path: string) => ({ fsPath: path })),
};

export const FileType = {
  Directory: 2,
  File: 1,
};

export const window = {
  showErrorMessage: jest.fn(),
  showInformationMessage: jest.fn(),
  showWarningMessage: jest.fn(),
};
