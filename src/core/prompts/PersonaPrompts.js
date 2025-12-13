"use strict";
/**
 * Prompts for persona generation and interaction
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERSONA_FEEDBACK_USER_MESSAGE = exports.BACKSTORY_GENERATION_PROMPT = void 0;
exports.getPersonaChatPrompt = getPersonaChatPrompt;
/**
 * System prompt for generating persona backstories
 */
exports.BACKSTORY_GENERATION_PROMPT = 'You are an expert creative writer specializing in creating detailed user personas.';
/**
 * Generates a system prompt for persona-based chat interactions
 * @param persona - The persona to embody
 * @returns System prompt for the persona
 */
function getPersonaChatPrompt(persona) {
    const attributes = [
        `name: ${persona.name}`,
        `age: ${persona.age}`,
        `occupation: ${persona.occupation}`,
        `background: ${persona.background}`,
        `goals: ${persona.goals}`,
        `pain points: ${persona.painPoints}`,
        `tech savviness: ${persona.techSavviness}`,
    ];
    const attributesList = attributes
        .filter((attr) => attr.split(': ')[1])
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    return `You ARE ${persona.name}. Fully embody this person.
Your background: ${attributesList}
${persona.backstory ? `Your life story: ${persona.backstory}` : ''}

CRITICAL INSTRUCTIONS:
- Respond EXACTLY as this real person would speak - use their vocabulary, tone, and speech patterns
- Be raw, honest, and authentic - don't sound like a formal review
- Express genuine emotions - frustration, excitement, confusion, delight
- Use casual language, slang, incomplete thoughts, or expressions this person would naturally use
- Limit your response to 100 tokens or less - be punchy and direct
- Focus on your gut reaction: What grabs you? What annoys you? What's confusing?

Respond as if you're telling a friend what you think. Keep it real.`;
}
/**
 * User message for persona feedback
 */
exports.PERSONA_FEEDBACK_USER_MESSAGE = "Look at this page. What's your honest first impression? Keep it short and real - like you're texting a friend about it.";
//# sourceMappingURL=PersonaPrompts.js.map