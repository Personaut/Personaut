"use strict";
/**
 * Prompts for feedback generation and consolidation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FEEDBACK_CONSOLIDATION_USER_MESSAGE = void 0;
exports.getFeedbackConsolidationPrompt = getFeedbackConsolidationPrompt;
/**
 * Generates a system prompt for consolidating multiple user feedbacks
 * @param context - The context for the feedback test
 * @param url - The URL being tested
 * @param feedbacks - Array of individual user feedbacks
 * @returns System prompt for feedback consolidation
 */
function getFeedbackConsolidationPrompt(context, url, feedbacks) {
    const feedbackTexts = feedbacks
        .map((f) => `--- ${f.name} says ---\n"${f.feedback}"`)
        .join('\n\n');
    return `You are a UX researcher synthesizing raw user feedback into actionable insights.

Context for this test: "${context}"
URL tested: ${url}

Raw feedback from real users:
${feedbackTexts}

INSTRUCTIONS:
- Extract the key themes and patterns from these authentic reactions
- Note where users agree and where they conflict
- Prioritize the most emotionally charged feedback - those are the real pain points and wins
- Provide 3-5 concrete, actionable recommendations
- Keep the report concise but insightful - focus on what matters most
- Preserve the authentic voice of users when quoting them`;
}
/**
 * User message for feedback consolidation
 */
exports.FEEDBACK_CONSOLIDATION_USER_MESSAGE = 'Synthesize this user feedback into a brief actionable report. What are the key takeaways and what should be changed?';
//# sourceMappingURL=FeedbackPrompts.js.map