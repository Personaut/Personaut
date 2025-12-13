export interface Message {
  role: 'user' | 'model' | 'error';
  text: string;
  images?: string[]; // Base64 encoded images
}

export interface ApiConfiguration {
  provider: string;
  apiKey?: string;
  modelId?: string;
  // Add other provider-specific config here (e.g. AWS region)
  awsRegion?: string;
  awsAccessKey?: string;
  awsSecretKey?: string;
  awsProfile?: string;
  awsUseProfile?: boolean;
}

export interface ProviderResponse {
  text: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export interface IProvider {
  chat(history: Message[], systemPrompt: string): Promise<ProviderResponse>;
}
