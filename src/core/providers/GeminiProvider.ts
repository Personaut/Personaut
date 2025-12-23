import { IProvider, Message, ApiConfiguration, ProviderResponse } from './IProvider';

// Model identifiers for Gemini
const MODEL_IDENTIFIERS = {
  gemini: {
    default: 'gemini-2.5-flash',
  },
};

export class GeminiProvider implements IProvider {
  private apiKey: string;
  private modelId: string;

  constructor(config: ApiConfiguration) {
    if (!config.apiKey) {
      throw new Error('Gemini API Key is required');
    }

    this.apiKey = config.apiKey;
    this.modelId = config.modelId || MODEL_IDENTIFIERS.gemini.default;
  }

  async chat(history: Message[], systemPrompt: string): Promise<ProviderResponse> {
    console.log('[GeminiProvider] chat called with:', {
      historyLength: history.length,
      historyRoles: history.map(m => m.role),
      systemPromptLength: systemPrompt?.length || 0,
    });

    // Get the last user message
    const lastUserMessage = history.filter((m) => m.role === 'user').pop();

    if (!lastUserMessage) {
      throw new Error('No user message found in history');
    }

    // Build conversation history for context
    const contents: any[] = [];

    // Add previous messages as context (excluding the last user message)
    history
      .filter((m) => m.role !== 'error')
      .slice(0, -1)
      .forEach((m) => {
        const parts: any[] = [{ text: m.text }];

        // Add images if present
        if (m.images && m.images.length > 0) {
          m.images.forEach((imageData) => {
            // Remove data URI prefix if present
            const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
            parts.push({
              inline_data: {
                mime_type: 'image/png',
                data: base64Data,
              },
            });
          });
        }

        contents.push({
          role: m.role === 'user' ? 'user' : 'model',
          parts: parts,
        });
      });

    // Add the current message with images if present
    const currentParts: any[] = [{ text: lastUserMessage.text }];

    if (lastUserMessage.images && lastUserMessage.images.length > 0) {
      lastUserMessage.images.forEach((imageData) => {
        // Remove data URI prefix if present
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        currentParts.push({
          inline_data: {
            mime_type: 'image/png',
            data: base64Data,
          },
        });
      });
    }

    contents.push({
      role: 'user',
      parts: currentParts,
    });

    console.log('[GeminiProvider] Sending to API:', {
      contentsCount: contents.length,
      contentsRoles: contents.map(c => c.role),
      hasSystemPrompt: !!systemPrompt,
    });

    // Build the Vertex AI API URL (matching the working curl command structure)
    const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/${this.modelId}:generateContent?key=${this.apiKey}`;

    // Build request body with system instruction
    const requestBody: any = {
      contents: contents,
      generationConfig: {
        maxOutputTokens: 4096, // Limit output to prevent excessive token usage
      },
    };

    // Add system instruction if provided (this is the proper Gemini way to set system prompt)
    if (systemPrompt) {
      requestBody.systemInstruction = {
        parts: [{ text: systemPrompt }],
      };
    }

    // Make the API request
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(errorBody);
    }

    const data = await response.json();

    // Extract the text from the response
    let text = '';
    if (data.candidates && data.candidates[0]?.content?.parts) {
      text = data.candidates[0].content.parts.map((part: any) => part.text || '').join('');
    }

    const providerResponse: ProviderResponse = {
      text: text,
    };

    // Check for usage metadata if available
    if (data.usageMetadata) {
      providerResponse.usage = {
        inputTokens: data.usageMetadata.promptTokenCount || 0,
        outputTokens: data.usageMetadata.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata.totalTokenCount || 0,
      };
    }

    return providerResponse;
  }
}
