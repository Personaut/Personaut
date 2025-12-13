import * as vscode from 'vscode';
import { IProvider, Message, ProviderResponse } from './IProvider';

export class NativeIDEProvider implements IProvider {
  async chat(history: Message[], systemPrompt: string): Promise<ProviderResponse> {
    try {
      // Access the VS Code Language Model API
      // Note: This requires VS Code 1.90+ and the 'vscode.lm' API to be available
      const lm = (vscode as any).lm;

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
      const modelTimeout = new Promise<any>((_, reject) =>
        setTimeout(
          () => reject(new Error('Timeout waiting for VS Code LM models response (10s)')),
          10000
        )
      );

      const allModels = (await Promise.race([modelSelection, modelTimeout])) as any[];

      console.log(`[Personaut] Model fetch took ${Date.now() - modelFetchStart}ms`);
      console.log(
        `[Personaut] Found ${allModels.length} models via vscode.lm:`,
        allModels.map((m: any) => `${m.vendor}:${m.family}:${m.name}`)
      );

      let model = null;

      // Strategy: explicit preference list
      // 1. GPT-4 class models
      // 2. Claude 3.5 class models
      // 3. Any Copilot model
      // 4. Any other model

      if (!model) {
        model = allModels.find((m: any) => m.family.toLowerCase().includes('gpt-4'));
      }
      if (!model) {
        model = allModels.find((m: any) => m.family.toLowerCase().includes('claude-3.5'));
      }
      if (!model) {
        model = allModels.find(
          (m: any) =>
            m.vendor.toLowerCase().includes('copilot') && m.family.toLowerCase().includes('gpt-4')
        );
      }
      if (!model) {
        model = allModels.find((m: any) => m.vendor.toLowerCase().includes('copilot'));
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

        const msg =
          `Error: No language models found available in ${appName}. \n\n` +
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

      console.log(
        `[Personaut] Selected model: ${model.name} (Family: ${model.family}, Vendor: ${model.vendor})`
      );

      // Construct messages
      const messages = [];

      // Add system prompt
      messages.push((vscode as any).LanguageModelChatMessage.User(systemPrompt));

      // Add history
      for (const msg of history) {
        if (msg.role === 'user') {
          messages.push((vscode as any).LanguageModelChatMessage.User(msg.text));
        } else if (msg.role === 'model') {
          messages.push((vscode as any).LanguageModelChatMessage.Assistant(msg.text));
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
    } catch (error: any) {
      console.error('NativeIDEProvider Error:', error);
      return { text: `Error communicating with Native IDE Agent: ${error.message}` };
    }
  }
}
