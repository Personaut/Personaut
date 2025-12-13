/**
 * Prompts for build mode content generation
 */

/**
 * Default system prompt for build mode content generation
 */
export const BUILD_MODE_DEFAULT_PROMPT =
  'You are a helpful assistant. Generate content in JSON format as requested.';

/**
 * Generates a system prompt for a specific build stage
 * @param stage - The build stage (users, features, stories, wireframes, code)
 * @param customPrompt - Optional custom prompt to override default
 * @returns System prompt for the build stage
 */
export function getBuildStagePrompt(_stage: string, customPrompt?: string): string {
  if (customPrompt) {
    return customPrompt;
  }

  return BUILD_MODE_DEFAULT_PROMPT;
}
