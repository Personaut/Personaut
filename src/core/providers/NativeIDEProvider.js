"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NativeIDEProvider = void 0;
const vscode = __importStar(require("vscode"));
class NativeIDEProvider {
    async chat(history, systemPrompt) {
        try {
            // Access the VS Code Language Model API
            // Note: This requires VS Code 1.90+ and the 'vscode.lm' API to be available
            const lm = vscode.lm;
            if (!lm) {
                return {
                    text: 'Error: The VS Code Language Model API (vscode.lm) is not available. Please ensure you are using a recent version of VS Code (1.90+) and have GitHub Copilot Chat or a compatible extension installed.',
                };
            }
            // Fetch ALL available models first
            console.log('[Personaut] requesting available models from vscode.lm...');
            const modelFetchStart = Date.now();
            // Add timeout to model selection to prevent infinite hanging
            // We wrap the Thenable from VS Code API into a standard Promise for race
            const modelSelection = Promise.resolve(lm.selectChatModels({}));
            const modelTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for VS Code LM models response (10s)')), 10000));
            const allModels = (await Promise.race([modelSelection, modelTimeout]));
            console.log(`[Personaut] Model fetch took ${Date.now() - modelFetchStart}ms`);
            console.log(`[Personaut] Found ${allModels.length} models via vscode.lm:`, allModels.map((m) => `${m.vendor}:${m.family}:${m.name}`));
            let model = null;
            // Strategy: explicit preference list
            // 1. GPT-4 class models
            // 2. Claude 3.5 class models
            // 3. Any Copilot model
            // 4. Any other model
            if (!model) {
                model = allModels.find((m) => m.family.toLowerCase().includes('gpt-4'));
            }
            if (!model) {
                model = allModels.find((m) => m.family.toLowerCase().includes('claude-3.5'));
            }
            if (!model) {
                model = allModels.find((m) => m.vendor.toLowerCase().includes('copilot') && m.family.toLowerCase().includes('gpt-4'));
            }
            if (!model) {
                model = allModels.find((m) => m.vendor.toLowerCase().includes('copilot'));
            }
            // Fallback: just pick the first one if it exists
            if (!model && allModels.length > 0) {
                model = allModels[0];
            }
            if (!model) {
                const appName = vscode.env.appName;
                const copilotExt = vscode.extensions.getExtension('github.copilot-chat');
                const copilotStatus = copilotExt
                    ? copilotExt.isActive
                        ? 'Active'
                        : 'Installed but not active'
                    : 'Not installed';
                const msg = `Error: No language models found available in ${appName}. \n\n` +
                    'Debug Info:\n' +
                    `App Name: ${appName}\n` +
                    `Copilot Status: ${copilotStatus}\n` +
                    `vscode.lm API: Available\n` +
                    `Models found: 0\n\n` +
                    'Troubleshooting:\n' +
                    "1. The 'Native IDE' mode relies on your editor exposing its AI model to extensions via the vscode.lm API.\n" +
                    "2. FIX A: Install 'GitHub Copilot Chat' extension - it provides a compatible model through this API.\n" +
                    "3. FIX B: Switch Personaut to use 'Google Gemini', 'OpenAI', or 'AWS Bedrock' in settings and provide an API Key.\n" +
                    '4. NOTE: Kiro and Cursor do not expose their native AI agents to extensions. You must use one of the other providers.';
                console.error('[Personaut] ' + msg);
                return { text: msg };
            }
            console.log(`[Personaut] Selected model: ${model.name} (Family: ${model.family}, Vendor: ${model.vendor})`);
            // Construct messages
            const messages = [];
            // Add system prompt
            messages.push(vscode.LanguageModelChatMessage.User(systemPrompt));
            // Add history
            for (const msg of history) {
                if (msg.role === 'user') {
                    messages.push(vscode.LanguageModelChatMessage.User(msg.text));
                }
                else if (msg.role === 'model') {
                    messages.push(vscode.LanguageModelChatMessage.Assistant(msg.text));
                }
                // Skip error messages in history for the model context
            }
            // Send request
            const cancellationToken = new vscode.CancellationTokenSource().token;
            const response = await model.sendRequest(messages, {}, cancellationToken);
            // Collect response
            let fullText = '';
            for await (const fragment of response.text) {
                fullText += fragment;
            }
            // Note: VS Code LM API might not expose token usage yet in the response object directly.
            // We'll estimate it for now (approx 4 chars per token) so the UI counters work.
            // Estimate input tokens
            let inputChars = systemPrompt.length;
            for (const msg of history) {
                inputChars += msg.text.length;
            }
            const inputTokens = Math.ceil(inputChars / 4);
            // Estimate output tokens
            const outputTokens = Math.ceil(fullText.length / 4);
            return {
                text: fullText,
                usage: {
                    inputTokens: inputTokens,
                    outputTokens: outputTokens,
                    totalTokens: inputTokens + outputTokens,
                },
            };
        }
        catch (error) {
            console.error('NativeIDEProvider Error:', error);
            return { text: `Error communicating with Native IDE Agent: ${error.message}` };
        }
    }
}
exports.NativeIDEProvider = NativeIDEProvider;
//# sourceMappingURL=NativeIDEProvider.js.map