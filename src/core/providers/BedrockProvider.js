"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BedrockProvider = void 0;
const client_bedrock_runtime_1 = require("@aws-sdk/client-bedrock-runtime");
const credential_providers_1 = require("@aws-sdk/credential-providers");
// Model identifiers and defaults for Bedrock
const MODEL_IDENTIFIERS = {
    bedrock: {
        default: 'claude-sonnet-4',
        modelIds: {
            // Claude 4
            'claude-sonnet-4': 'anthropic.claude-sonnet-4-20250514-v1:0',
            'claude-opus-4': 'anthropic.claude-opus-4-20250514-v1:0',
            // Claude 3.7
            'claude-3-7-sonnet': 'anthropic.claude-3-7-sonnet-20250219-v1:0',
            // Claude 3.5
            'claude-3-5-sonnet-v2': 'anthropic.claude-3-5-sonnet-20241022-v2:0',
            'claude-3-5-haiku': 'anthropic.claude-3-5-haiku-20241022-v1:0',
            // Claude 3
            'claude-3-opus': 'anthropic.claude-3-opus-20240229-v1:0',
            'claude-3-haiku': 'anthropic.claude-3-haiku-20240307-v1:0',
            // Amazon Nova
            'nova-premier': 'amazon.nova-premier-v1:0',
            'nova-pro': 'amazon.nova-pro-v1:0',
            'nova-lite': 'amazon.nova-lite-v1:0',
            'nova-micro': 'amazon.nova-micro-v1:0',
            // Meta Llama
            'llama4-scout': 'meta.llama4-scout-17b-instruct-v1:0',
            'llama4-maverick': 'meta.llama4-maverick-17b-instruct-v1:0',
            'llama3-3-70b': 'meta.llama3-3-70b-instruct-v1:0',
            // Mistral
            'mistral-large': 'mistral.mistral-large-2411-v1:0',
            'pixtral-large': 'mistral.pixtral-large-2502-v1:0',
            // DeepSeek
            'deepseek-r1': 'deepseek.r1-v1:0',
        },
    },
};
const TOKEN_LIMITS = {
    maxResponseTokens: 4096,
};
const DEFAULTS = {
    awsRegion: 'us-east-1',
    bedrockApiVersion: 'bedrock-2023-05-31',
    temperature: 0.7,
};
class BedrockProvider {
    constructor(config) {
        this.config = config;
        // Initialize Bedrock client with credentials
        let credentials;
        if (config.awsUseProfile) {
            console.log(`[Bedrock] Using AWS Profile: ${config.awsProfile || 'default'}`);
            credentials = (0, credential_providers_1.fromIni)({ profile: config.awsProfile || 'default' });
        }
        else if (config.awsAccessKey && config.awsSecretKey) {
            console.log('[Bedrock] Using explicit Access/Secret keys');
            credentials = {
                accessKeyId: config.awsAccessKey,
                secretAccessKey: config.awsSecretKey,
            };
        }
        else {
            console.log('[Bedrock] Using environment variables');
            credentials = (0, credential_providers_1.fromEnv)();
        }
        this.client = new client_bedrock_runtime_1.BedrockRuntimeClient({
            region: config.awsRegion || DEFAULTS.awsRegion,
            credentials,
        });
        // Use default model from configuration, or map friendly name to full ID
        const modelInput = config.modelId || MODEL_IDENTIFIERS.bedrock.default;
        this.modelId = BedrockProvider.MODEL_IDS[modelInput] || modelInput;
    }
    async chat(history, systemPrompt) {
        try {
            console.log('[Bedrock] Using model:', this.modelId);
            console.log('[Bedrock] Region:', this.config.awsRegion || 'us-east-1');
            // Convert message history to Claude 3 Messages API format
            const messages = this.formatMessages(history);
            // Prepare the request body for Claude 3
            const requestBody = {
                anthropic_version: DEFAULTS.bedrockApiVersion,
                max_tokens: TOKEN_LIMITS.maxResponseTokens,
                temperature: DEFAULTS.temperature,
                system: systemPrompt,
                messages: messages,
            };
            console.log('[Bedrock] Request body prepared with', messages.length, 'messages');
            // Create and send the InvokeModelCommand
            const command = new client_bedrock_runtime_1.InvokeModelCommand({
                modelId: this.modelId,
                contentType: 'application/json',
                accept: 'application/json',
                body: JSON.stringify(requestBody),
            });
            const response = await this.client.send(command);
            // Parse the response
            if (!response.body) {
                throw new Error('No response body from Bedrock');
            }
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            // Extract the text from the response
            if (responseBody.content && responseBody.content.length > 0) {
                console.log('[Bedrock] Successfully received response');
                const result = {
                    text: responseBody.content[0].text,
                };
                if (responseBody.usage) {
                    result.usage = {
                        inputTokens: responseBody.usage.input_tokens,
                        outputTokens: responseBody.usage.output_tokens,
                        totalTokens: responseBody.usage.input_tokens + responseBody.usage.output_tokens,
                    };
                }
                return result;
            }
            throw new Error('No content in Bedrock response');
        }
        catch (error) {
            console.error('[Bedrock] Error:', error);
            // Format error messages for better user experience
            if (error.name === 'ValidationException') {
                throw new Error(`AWS Bedrock validation error: ${error.message}. Model ID: ${this.modelId}`);
            }
            else if (error.name === 'AccessDeniedException') {
                throw new Error('AWS access denied. Please check your credentials and permissions.');
            }
            else if (error.name === 'ThrottlingException') {
                throw new Error('AWS Bedrock rate limit exceeded. Please try again later.');
            }
            else if (error.name === 'ResourceNotFoundException') {
                throw new Error(`Model not found: ${this.modelId}. Please check your AWS region (${this.config.awsRegion || DEFAULTS.awsRegion}) and ensure you have access to this model.`);
            }
            else if (error.name === 'CredentialsProviderError' ||
                error.message?.includes('credentials') ||
                error.message?.includes('environment variable')) {
                throw new Error('AWS credentials not found. Please configure one of the following in Settings:\n' +
                    '1. Enable "Use AWS Profile" and specify a profile name, OR\n' +
                    '2. Enter your AWS Access Key and Secret Key directly, OR\n' +
                    '3. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables');
            }
            throw new Error(`Bedrock API error: ${error.message}`);
        }
    }
    formatMessages(history) {
        const formattedMessages = [];
        for (const msg of history) {
            // Skip error messages
            if (msg.role === 'error') {
                continue;
            }
            // Convert 'model' role to 'assistant' for Claude API
            const role = msg.role === 'model' ? 'assistant' : msg.role;
            const content = [];
            // Add text content
            if (msg.text) {
                content.push({
                    type: 'text',
                    text: msg.text,
                });
            }
            // Add image content if present
            if (msg.images && msg.images.length > 0) {
                for (const img of msg.images) {
                    // Remove data URI prefix if present to get raw base64
                    const base64Data = img.replace(/^data:image\/\w+;base64,/, '');
                    content.push({
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: 'image/png', // Assuming PNG for screenshots
                            data: base64Data,
                        },
                    });
                }
            }
            formattedMessages.push({
                role: role,
                content: content,
            });
        }
        return formattedMessages;
    }
}
exports.BedrockProvider = BedrockProvider;
// Map of friendly model names to Bedrock model IDs (loaded from configuration)
BedrockProvider.MODEL_IDS = MODEL_IDENTIFIERS.bedrock.modelIds;
//# sourceMappingURL=BedrockProvider.js.map