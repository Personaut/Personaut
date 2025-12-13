/**
 * FeedbackService handles feedback generation with image support and history management.
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 4.1, 4.2, 4.3, Feedback Integration
 */

import {
  FeedbackEntry,
  FeedbackStorage,
  ScreenshotResult,
  ProviderImageSupport,
  GenerateFeedbackParams,
  GenerateFeedbackResult,
} from '../types/FeedbackTypes';
import { AgentManager } from '../../../core/agent/AgentManager';

/**
 * FeedbackService manages feedback generation, image support, and history.
 */
export class FeedbackService {
  private static readonly STORAGE_KEY = 'feedbackHistory';
  private static readonly MAX_HISTORY_SIZE = 100;

  // Provider image support configuration
  private static readonly PROVIDER_IMAGE_SUPPORT: ProviderImageSupport[] = [
    {
      provider: 'gemini',
      supportsImages: true,
      maxImageSize: 20 * 1024 * 1024, // 20MB
      supportedFormats: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
    },
    {
      provider: 'bedrock',
      supportsImages: true,
      maxImageSize: 5 * 1024 * 1024, // 5MB for Claude
      supportedFormats: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
    },
    {
      provider: 'nativeIde',
      supportsImages: true,
      maxImageSize: 10 * 1024 * 1024, // 10MB
      supportedFormats: ['image/png', 'image/jpeg', 'image/webp'],
    },
  ];

  constructor(
    private readonly storage: FeedbackStorage,
    private readonly agentManager: AgentManager
  ) {}

  /**
   * Generate feedback for given parameters
   * This is a placeholder - actual AI generation would be done by the caller
   */
  async generateFeedback(params: GenerateFeedbackParams): Promise<GenerateFeedbackResult> {
    try {
      // Validate parameters
      if (!params.personaNames || params.personaNames.length === 0) {
        throw new Error('At least one persona is required');
      }

      if (!params.context || params.context.trim() === '') {
        throw new Error('Context is required');
      }

      if (!params.url || params.url.trim() === '') {
        throw new Error('URL is required');
      }

      // Create title from context
      const title =
        params.context.length > 50 ? params.context.substring(0, 50) + '...' : params.context;

      // Create feedback entry (content would be filled by AI generation)
      const entry: Omit<FeedbackEntry, 'id' | 'timestamp'> = {
        title,
        feedbackType: params.feedbackType,
        personaNames: params.personaNames,
        context: params.context,
        url: params.url,
        content: '', // Will be filled by AI generation
        screenshot: params.screenshot,
      };

      // Save the entry
      const savedEntry = await this.saveFeedbackEntry(entry);

      return {
        entry: savedEntry,
        success: true,
      };
    } catch (error) {
      return {
        entry: {} as FeedbackEntry,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate feedback with AI using AgentManager
   * Creates a feedback-mode agent with persona context, streams content generation,
   * and disposes the agent after completion
   * 
   * @param params - Parameters for feedback generation
   * @param onProgress - Optional callback for streaming progress updates
   * @returns Generated feedback result with entry and success status
   * 
   * Validates: Feedback Integration
   */
  async generateFeedbackWithAI(
    params: GenerateFeedbackParams,
    onProgress?: (chunk: string) => void
  ): Promise<GenerateFeedbackResult> {
    // Create a unique conversation ID for this feedback-mode agent
    const conversationId = `feedback-${params.feedbackType}-${Date.now()}`;

    console.log('[FeedbackService] Generating feedback with AI:', {
      feedbackType: params.feedbackType,
      personaNames: params.personaNames,
      conversationId,
      timestamp: Date.now(),
    });

    let agent;
    let generatedContent = '';

    try {
      // Validate parameters
      if (!params.personaNames || params.personaNames.length === 0) {
        throw new Error('At least one persona is required');
      }

      if (!params.context || params.context.trim() === '') {
        throw new Error('Context is required');
      }

      if (!params.url || params.url.trim() === '') {
        throw new Error('URL is required');
      }

      // Create feedback-mode agent with persona context
      agent = await this.agentManager.getOrCreateAgent(conversationId, 'feedback');

      // Build system prompt with persona context
      const personaList = params.personaNames.join(', ');
      const systemPrompt = `You are providing ${params.feedbackType} feedback as ${personaList}.
Analyze the provided context and URL, and provide constructive, actionable feedback.
Focus on user experience, accessibility, design, and functionality.
Be specific and provide concrete suggestions for improvement.`;

      // Build the user prompt with context and URL
      const userPrompt = `Please provide ${params.feedbackType} feedback for the following:

Context: ${params.context}
URL: ${params.url}

${params.screenshot ? 'A screenshot has been provided for visual reference.' : ''}

Please analyze and provide detailed, constructive feedback.`;

      // Send message to agent
      // The agent will handle the conversation and call onDidUpdateMessages callback
      // which will save the conversation via ConversationManager
      await agent.chat(
        userPrompt,
        [], // No context files for feedback mode
        {}, // Default settings
        systemPrompt,
        false // Not a persona chat
      );

      // Retrieve the generated content from the saved conversation
      const conversation = await this.agentManager['config'].conversationManager.getConversation(
        conversationId
      );

      if (conversation && conversation.messages.length > 0) {
        // Get the last model response
        const modelMessages = conversation.messages.filter((msg: any) => msg.role === 'model');
        if (modelMessages.length > 0) {
          const lastModelMessage = modelMessages[modelMessages.length - 1];
          generatedContent = lastModelMessage.text || '';
        }
      }

      // If we have a progress callback and content, call it with the full content
      if (onProgress && generatedContent) {
        onProgress(generatedContent);
      }

      // Create title from context
      const title =
        params.context.length > 50 ? params.context.substring(0, 50) + '...' : params.context;

      // Create feedback entry with AI-generated content
      const entry: Omit<FeedbackEntry, 'id' | 'timestamp'> = {
        title,
        feedbackType: params.feedbackType,
        personaNames: params.personaNames,
        context: params.context,
        url: params.url,
        content: generatedContent,
        screenshot: params.screenshot,
      };

      // Save the entry
      const savedEntry = await this.saveFeedbackEntry(entry);

      console.log('[FeedbackService] Feedback generated successfully:', {
        feedbackType: params.feedbackType,
        conversationId,
        contentLength: generatedContent.length,
      });

      return {
        entry: savedEntry,
        success: true,
      };
    } catch (error: any) {
      console.error('[FeedbackService] Failed to generate feedback with AI:', {
        feedbackType: params.feedbackType,
        conversationId,
        error: error.message,
        stack: error.stack,
      });

      return {
        entry: {} as FeedbackEntry,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      // Always dispose the agent after feedback generation completes
      if (agent) {
        try {
          await this.agentManager.disposeAgent(conversationId);
          console.log('[FeedbackService] Feedback-mode agent disposed:', {
            feedbackType: params.feedbackType,
            conversationId,
          });
        } catch (disposeError: any) {
          console.error('[FeedbackService] Error disposing feedback-mode agent:', {
            conversationId,
            error: disposeError.message,
          });
        }
      }
    }
  }

  /**
   * Check if a provider supports images
   */
  providerSupportsImages(provider: string): boolean {
    const config = FeedbackService.PROVIDER_IMAGE_SUPPORT.find(
      (p) => p.provider.toLowerCase() === provider.toLowerCase()
    );
    return config?.supportsImages ?? false;
  }

  /**
   * Get image support configuration for a provider
   */
  getProviderImageConfig(provider: string): ProviderImageSupport | null {
    return (
      FeedbackService.PROVIDER_IMAGE_SUPPORT.find(
        (p) => p.provider.toLowerCase() === provider.toLowerCase()
      ) ?? null
    );
  }

  /**
   * Validate image for a specific provider
   */
  validateImageForProvider(
    provider: string,
    imageData: string,
    mimeType: string
  ): { valid: boolean; error?: string } {
    const config = this.getProviderImageConfig(provider);

    if (!config) {
      return { valid: false, error: `Unknown provider: ${provider}` };
    }

    if (!config.supportsImages) {
      return { valid: false, error: `Provider ${provider} does not support images` };
    }

    // Check format
    if (config.supportedFormats && !config.supportedFormats.includes(mimeType)) {
      return {
        valid: false,
        error: `Unsupported image format: ${mimeType}. Supported: ${config.supportedFormats.join(', ')}`,
      };
    }

    // Check size (base64 is ~33% larger than binary)
    if (config.maxImageSize) {
      const estimatedSize = (imageData.length * 3) / 4;
      if (estimatedSize > config.maxImageSize) {
        return {
          valid: false,
          error: `Image too large. Max size: ${Math.round(config.maxImageSize / 1024 / 1024)}MB`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Handle screenshot capture result
   */
  handleScreenshotResult(result: ScreenshotResult): {
    success: boolean;
    screenshot?: string;
    userMessage: string;
  } {
    if (result.success && result.data) {
      return {
        success: true,
        screenshot: result.data,
        userMessage: 'Screenshot captured successfully',
      };
    }

    // Handle various error scenarios gracefully
    const errorMessage = result.error || 'Unknown error occurred';
    const errorLower = errorMessage.toLowerCase();
    let userMessage: string;

    if (errorLower.includes('timeout')) {
      userMessage = 'Screenshot capture timed out. The page may be loading slowly.';
    } else if (errorLower.includes('navigation')) {
      userMessage = 'Could not navigate to the URL. Please check if the URL is correct.';
    } else if (errorLower.includes('blocked') || errorLower.includes('denied')) {
      userMessage = 'Access to the page was blocked. The site may have security restrictions.';
    } else if (errorLower.includes('network') || errorLower.includes('connection')) {
      userMessage = 'Network error occurred. Please check your internet connection.';
    } else {
      userMessage = `Screenshot capture failed: ${errorMessage}`;
    }

    return {
      success: false,
      userMessage,
    };
  }

  /**
   * Get all feedback entries from storage
   */
  getFeedbackHistory(): FeedbackEntry[] {
    const history = this.storage.get<FeedbackEntry[]>(FeedbackService.STORAGE_KEY, []);
    return history.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Save a feedback entry to storage
   */
  async saveFeedbackEntry(entry: Omit<FeedbackEntry, 'id' | 'timestamp'>): Promise<FeedbackEntry> {
    const history = this.getFeedbackHistory();

    const newEntry: FeedbackEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    // Add to beginning of history
    history.unshift(newEntry);

    // Enforce max history size
    const trimmedHistory = history.slice(0, FeedbackService.MAX_HISTORY_SIZE);

    await this.storage.update(FeedbackService.STORAGE_KEY, trimmedHistory);
    return newEntry;
  }

  /**
   * Get a specific feedback entry by ID
   */
  getFeedbackEntry(id: string): FeedbackEntry | null {
    const history = this.getFeedbackHistory();
    return history.find((e) => e.id === id) ?? null;
  }

  /**
   * Delete a feedback entry
   */
  async deleteFeedback(id: string): Promise<boolean> {
    const history = this.getFeedbackHistory();
    const filteredHistory = history.filter((e) => e.id !== id);

    if (filteredHistory.length === history.length) {
      return false; // Entry not found
    }

    await this.storage.update(FeedbackService.STORAGE_KEY, filteredHistory);
    return true;
  }

  /**
   * Clear all feedback history
   */
  async clearFeedbackHistory(): Promise<void> {
    await this.storage.update(FeedbackService.STORAGE_KEY, []);
  }

  /**
   * Generate a unique ID for feedback entries
   */
  private generateId(): string {
    return `feedback-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Verify feedback entry has required metadata
   */
  verifyFeedbackMetadata(entry: FeedbackEntry): { valid: boolean; missingFields: string[] } {
    const requiredFields: (keyof FeedbackEntry)[] = [
      'id',
      'title',
      'timestamp',
      'feedbackType',
      'personaNames',
      'content',
    ];

    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (entry[field] === undefined || entry[field] === null) {
        missingFields.push(field);
      }
    }

    // Check personaNames is not empty
    if (entry.personaNames && entry.personaNames.length === 0) {
      missingFields.push('personaNames (empty array)');
    }

    return {
      valid: missingFields.length === 0,
      missingFields,
    };
  }

  /**
   * Get feedback entries by persona name
   */
  getFeedbackByPersona(personaName: string): FeedbackEntry[] {
    const history = this.getFeedbackHistory();
    return history.filter((e) => e.personaNames.includes(personaName));
  }

  /**
   * Get feedback entries by type
   */
  getFeedbackByType(feedbackType: 'individual' | 'group'): FeedbackEntry[] {
    const history = this.getFeedbackHistory();
    return history.filter((e) => e.feedbackType === feedbackType);
  }

  /**
   * Get all supported providers
   */
  getSupportedProviders(): string[] {
    return FeedbackService.PROVIDER_IMAGE_SUPPORT.filter((p) => p.supportsImages).map(
      (p) => p.provider
    );
  }
}
