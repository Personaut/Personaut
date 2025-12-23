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
  FeedbackSummary,
  RatingSystem,
  DEFAULT_FEEDBACK_SETTINGS,
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
  ) { }

  /**
   * Generate feedback for given parameters
   * @deprecated Use generateFeedbackWithAI instead
   */
  async generateFeedback(params: GenerateFeedbackParams): Promise<GenerateFeedbackResult> {
    // Redirect to AI generation
    return this.generateFeedbackWithAI(params);
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
    onProgress?: (chunk: string) => void,
    ratingSystem: RatingSystem = DEFAULT_FEEDBACK_SETTINGS.ratingSystem
  ): Promise<GenerateFeedbackResult> {
    console.log('[FeedbackService] Generating feedback with AI:', {
      feedbackType: params.feedbackType,
      personaNames: params.personaNames,
      personaCount: params.personaNames.length,
      ratingSystem,
      timestamp: Date.now(),
    });

    try {
      // Validate parameters
      if (!params.personaNames || params.personaNames.length === 0) {
        throw new Error('At least one persona is required');
      }

      if (!params.screenshot) {
        throw new Error('Screenshot is required for feedback');
      }

      // Interview each persona one at a time
      const feedbackEntries: any[] = [];
      const ratingScale = this.getRatingScale(ratingSystem);

      for (const personaName of params.personaNames) {
        console.log(`[FeedbackService] Interviewing persona: ${personaName}`);

        const conversationId = `feedback-${personaName}-${Date.now()}`;
        let agent;

        try {
          // Create feedback-mode agent
          agent = await this.agentManager.getOrCreateAgent(conversationId, 'feedback');

          // Use simplified persona prompt
          const systemPrompt = `You are ${personaName}. 

You are reviewing a screenshot of an app or website. Respond as yourself - ${personaName} - giving your honest, natural feedback as if you're talking to a friend.

Keep your response conversational and authentic. Share what you like, what you don't like, and rate it out of ${ratingScale} based on how well it would work for someone like you.`;

          // Simple user prompt
          const userPrompt = `Look at this screenshot and share your thoughts.`;

          // Debug: Log screenshot info before passing to agent
          console.log('[FeedbackService] Passing screenshot to agent:', {
            personaName,
            hasScreenshot: !!params.screenshot,
            screenshotLength: params.screenshot?.length || 0,
            screenshotPrefix: params.screenshot?.substring(0, 50) || 'none',
          });

          // Pass screenshot via images parameter
          await agent.chat(
            userPrompt,
            [], // No context files
            {}, // Default settings
            systemPrompt,
            false, // Not a persona chat
            params.screenshot ? [params.screenshot] : undefined // Pass screenshot as images array
          );

          // Retrieve the generated content
          const conversation = await this.agentManager['config'].conversationManager.getConversation(
            conversationId
          );

          let feedbackText = '';
          if (conversation && conversation.messages.length > 0) {
            const modelMessages = conversation.messages.filter((msg: any) => msg.role === 'model');
            if (modelMessages.length > 0) {
              const lastModelMessage = modelMessages[modelMessages.length - 1];
              feedbackText = lastModelMessage.text || '';
            }
          }

          if (!feedbackText) {
            console.warn(`[FeedbackService] No feedback generated for ${personaName}`);
            continue;
          }

          // Parse rating from feedback
          const rating = this.parseRating(feedbackText, ratingSystem);

          // Create entry in the format the frontend expects
          const timestamp = Date.now();
          const entry = {
            id: `feedback-${timestamp}`, // Timestamp-based ID to avoid conflicts
            personaId: personaName,
            personaName: personaName,
            rating: rating,
            comment: feedbackText,
            screenshotUrl: params.screenshot,
            context: params.context,
            timestamp: timestamp,
            ratingSystem: ratingSystem,
          };

          feedbackEntries.push(entry);

          // Call progress callback
          if (onProgress) {
            onProgress(`${personaName}: ${feedbackText.substring(0, 100)}...`);
          }

          console.log(`[FeedbackService] Feedback collected from ${personaName}:`, {
            rating,
            commentLength: feedbackText.length,
            ratingSystem,
          });
        } catch (error: any) {
          console.error(`[FeedbackService] Error getting feedback from ${personaName}:`, error);
          // Continue with next persona instead of failing completely
        } finally {
          // Dispose agent
          if (agent) {
            try {
              await this.agentManager.disposeAgent(conversationId);
            } catch (disposeError) {
              console.error(`[FeedbackService] Error disposing agent for ${personaName}:`, disposeError);
            }
          }
        }
      }

      if (feedbackEntries.length === 0) {
        throw new Error('No feedback was generated from any persona');
      }

      // Save each entry to storage
      for (const entry of feedbackEntries) {
        try {
          // Convert to storage format
          const storageEntry = {
            id: entry.id,
            title: `Feedback from ${entry.personaName}`,
            timestamp: entry.timestamp,
            feedbackType: params.feedbackType,
            personaNames: [entry.personaName],
            personaIds: [entry.personaId],
            context: entry.context || params.context,
            url: params.url || '',
            content: entry.comment,
            screenshot: entry.screenshotUrl,
            provider: 'ai-generated',
            rating: entry.rating,
          };

          // Save to file storage
          await (this.storage as any).saveFeedbackEntry(storageEntry);

          console.log(`[FeedbackService] Saved feedback entry for ${entry.personaName}`);
        } catch (saveError) {
          console.error(`[FeedbackService] Failed to save entry for ${entry.personaName}:`, saveError);
        }
      }

      console.log('[FeedbackService] All feedback generated successfully:', {
        totalEntries: feedbackEntries.length,
        personas: feedbackEntries.map((e) => e.personaName),
      });

      // Generate summary with AI
      let summary: FeedbackSummary | undefined = undefined;
      if (feedbackEntries.length > 0) {
        try {
          summary = await this.generateFeedbackSummary(feedbackEntries, params);
        } catch (summaryError) {
          console.error('[FeedbackService] Failed to generate summary:', summaryError);
        }
      }

      // Return all entries with summary
      return {
        entries: feedbackEntries,
        entry: feedbackEntries[0], // For backward compatibility
        summary: summary,
        success: true,
      };
    } catch (error: any) {
      console.error('[FeedbackService] Failed to generate feedback with AI:', {
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate feedback summary using AI
   * Takes all persona feedback and creates a UX designer/developer summary
   */
  private async generateFeedbackSummary(
    feedbackEntries: any[],
    params: GenerateFeedbackParams
  ): Promise<FeedbackSummary> {
    console.log('[FeedbackService] Generating feedback summary');

    const conversationId = `feedback-summary-${Date.now()}`;
    let agent;

    try {
      // Create summarizer agent
      agent = await this.agentManager.getOrCreateAgent(conversationId, 'feedback');

      // Calculate average rating
      const totalRating = feedbackEntries.reduce((sum, entry) => sum + entry.rating, 0);
      const averageRating = totalRating / feedbackEntries.length;

      // Build raw feedback for the prompt
      const rawFeedbackText = feedbackEntries
        .map((entry) => {
          return `**${entry.personaName}** (${entry.rating}/5 stars):\n${entry.comment}\n`;
        })
        .join('\n---\n\n');

      // System prompt for summarizer
      const systemPrompt = `You are a UX designer and developer analyzing user feedback.

Your task is to synthesize feedback from multiple personas into a brief, actionable summary.

Provide a concise summary (2-3 sentences maximum) that highlights the main strengths, key areas for improvement, and specific recommendations.

Write from a professional UX/developer perspective, focusing on what matters for product development.`;

      // User prompt with all feedback
      const userPrompt = `Here is feedback from ${feedbackEntries.length} user personas about "${params.context}":

${rawFeedbackText}

Average Rating: ${averageRating.toFixed(1)}/5 stars

Please provide a professional summary of this feedback with actionable insights for the development team.`;

      // Clear any existing conversation history to ensure fresh summary
      const existingConversation = await this.agentManager['config'].conversationManager.getConversation(
        conversationId
      );
      if (existingConversation && existingConversation.messages.length > 0) {
        console.log('[FeedbackService] Clearing previous conversation history for summary');
        await this.agentManager['config'].conversationManager.saveConversation(conversationId, []);
      }

      // Get summary from AI
      await agent.chat(
        userPrompt,
        [], // No context files
        {}, // Default settings
        systemPrompt,
        false // Not a persona chat
      );

      // Retrieve the generated summary
      const conversation = await this.agentManager['config'].conversationManager.getConversation(
        conversationId
      );

      let summaryText = '';
      if (conversation && conversation.messages.length > 0) {
        const modelMessages = conversation.messages.filter((msg: any) => msg.role === 'model');
        if (modelMessages.length > 0) {
          const lastModelMessage = modelMessages[modelMessages.length - 1];
          summaryText = lastModelMessage.text || '';
        }
      }

      if (!summaryText) {
        throw new Error('No summary generated');
      }

      // Build raw feedback array
      const rawFeedback = feedbackEntries.map((entry) => ({
        personaName: entry.personaName,
        rating: entry.rating,
        comment: entry.comment,
      }));

      console.log('[FeedbackService] Summary generated successfully');

      return {
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        summary: summaryText,
        rawFeedback: rawFeedback,
        timestamp: Date.now(),
      };
    } finally {
      // Dispose agent
      if (agent) {
        try {
          await this.agentManager.disposeAgent(conversationId);
        } catch (disposeError) {
          console.error('[FeedbackService] Error disposing summarizer agent:', disposeError);
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
    // Load from file storage if available
    if (typeof (this.storage as any).getCachedFeedback === 'function') {
      const storedEntries = (this.storage as any).getCachedFeedback();

      // Convert StoredFeedbackEntry to FeedbackEntry format
      const feedbackEntries: FeedbackEntry[] = storedEntries.map((stored: any) => ({
        id: stored.id,
        personaId: stored.personaIds?.[0] || stored.personaNames[0],
        personaName: stored.personaNames[0],
        rating: stored.rating || 3,
        comment: stored.content || '',
        screenshotUrl: stored.screenshot,
        context: stored.context,
        timestamp: stored.timestamp,
        ratingSystem: 'stars' as const,
      }));

      console.log('[FeedbackService] Loaded feedback history from file storage:', {
        count: feedbackEntries.length,
      });

      return feedbackEntries.sort((a, b) => b.timestamp - a.timestamp);
    }

    // Fallback to old storage (for backward compatibility)
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
      'personaId',
      'personaName',
      'rating',
      'comment',
      'timestamp',
    ];

    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (entry[field] === undefined || entry[field] === null) {
        missingFields.push(field);
      }
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
    return history.filter((e) => e.personaName === personaName);
  }

  /**
   * Get feedback entries by type
   * @deprecated New feedback entries don't have feedbackType
   */
  getFeedbackByType(feedbackType: 'individual' | 'group'): FeedbackEntry[] {
    const history = this.getFeedbackHistory();
    // New entries don't have feedbackType, return empty array
    return [];
  }

  /**
   * Get all supported providers
   */
  getSupportedProviders(): string[] {
    return FeedbackService.PROVIDER_IMAGE_SUPPORT.filter((p) => p.supportsImages).map(
      (p) => p.provider
    );
  }

  /**
   * Get rating scale description based on rating system
   */
  private getRatingScale(system: RatingSystem): string {
    switch (system) {
      case '1-100':
        return '100';
      case '1-10':
        return '10';
      case 'stars':
      default:
        return '5 stars';
    }
  }

  /**
   * Parse rating from feedback text based on rating system
   */
  private parseRating(text: string, system: RatingSystem): number {
    switch (system) {
      case '1-100': {
        const match = text.match(/(\d+)\s*(?:\/|out of)\s*100/i);
        return match ? Math.max(1, Math.min(100, parseInt(match[1]))) : 50;
      }

      case '1-10': {
        const match = text.match(/(\d+)\s*(?:\/|out of)\s*10/i);
        return match ? Math.max(1, Math.min(10, parseInt(match[1]))) : 5;
      }

      case 'stars': {
        // Stars (1-5) - try multiple patterns

        // Pattern 1: "X out of 5 stars" or "X/5 stars"
        const matchOutOf5 = text.match(/(\d+)\s*(?:out of|\/)\s*5\s*stars?/i);
        if (matchOutOf5) {
          const rating = Math.max(1, Math.min(5, parseInt(matchOutOf5[1])));
          console.log('[FeedbackService] Parsed rating (out of 5):', { text: matchOutOf5[0], rating });
          return rating;
        }

        // Pattern 2: "X stars" or "X star"
        const matchStars = text.match(/(\d+)\s*stars?/i);
        if (matchStars) {
          const rating = Math.max(1, Math.min(5, parseInt(matchStars[1])));
          console.log('[FeedbackService] Parsed rating (stars):', { text: matchStars[0], rating });
          return rating;
        }

        // Pattern 3: "X/5"
        const matchSlash5 = text.match(/(\d+)\s*\/\s*5/i);
        if (matchSlash5) {
          const rating = Math.max(1, Math.min(5, parseInt(matchSlash5[1])));
          console.log('[FeedbackService] Parsed rating (X/5):', { text: matchSlash5[0], rating });
          return rating;
        }

        // Try to convert from 100 scale to stars
        const match100 = text.match(/(\d+)\s*(?:\/|out of)\s*100/i);
        if (match100) {
          const score = parseInt(match100[1]);
          const rating = Math.max(1, Math.min(5, Math.round((score / 100) * 5)));
          console.log('[FeedbackService] Parsed rating (100 scale):', { text: match100[0], score, rating });
          return rating;
        }

        // Try to convert from 10 scale to stars
        const match10 = text.match(/(\d+)\s*(?:\/|out of)\s*10/i);
        if (match10) {
          const score = parseInt(match10[1]);
          const rating = Math.max(1, Math.min(5, Math.round((score / 10) * 5)));
          console.log('[FeedbackService] Parsed rating (10 scale):', { text: match10[0], score, rating });
          return rating;
        }

        // Default to middle rating
        console.log('[FeedbackService] No rating found, using default: 3');
        return 3;
      }
    }
  }
}
