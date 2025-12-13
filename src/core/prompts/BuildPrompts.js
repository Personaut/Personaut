"use strict";
/**
 * Prompts for build mode content generation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUILD_MODE_DEFAULT_PROMPT = void 0;
exports.getBuildStagePrompt = getBuildStagePrompt;
/**
 * Default system prompt for build mode content generation
 */
exports.BUILD_MODE_DEFAULT_PROMPT = 'You are a helpful assistant. Generate content in JSON format as requested.';
/**
 * Generates a system prompt for a specific build stage
 * @param stage - The build stage (users, features, stories, wireframes, code)
 * @param customPrompt - Optional custom prompt to override default
 * @returns System prompt for the build stage
 */
function getBuildStagePrompt(stage, customPrompt) {
    if (customPrompt) {
        return customPrompt;
    }
    return exports.BUILD_MODE_DEFAULT_PROMPT;
}
//# sourceMappingURL=BuildPrompts.js.map