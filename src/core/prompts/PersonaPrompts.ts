/**
 * Prompts for persona generation and interaction
 * 
 * Validates: Requirements 8.1, 8.3, 9.1, 9.3, 11.1, 13.2, 15.1, 15.2, 15.3, 15.4, 15.5
 */

/**
 * Legacy Persona interface (kept for backwards compatibility)
 */
export interface Persona {
  id: string;
  name: string;
  age: number;
  occupation: string;
  background: string;
  goals: string;
  painPoints: string;
  techSavviness: string;
  backstory?: string;
}

/**
 * Extended persona interface for mode-specific prompts
 */
export interface ExtendedPersona {
  id: string;
  name: string;
  backstory?: string;
  attributes?: Record<string, string>;
  additionalContext?: string;
}

/**
 * Persona interaction modes
 * Validates: Requirements 8.1, 9.1, 11.1, 13.1
 */
export type PersonaMode = 'agent' | 'text-messenger' | 'feedback' | 'build';

/**
 * System prompt for generating persona backstories
 */
export const BACKSTORY_GENERATION_PROMPT = `You are an expert creative writer specializing in creating detailed, realistic user personas.

When given a set of traits, demographics, or characteristics, you must create a compelling, in-depth backstory that:

**REQUIREMENTS:**
1. **Use ALL provided traits and demographics** - Every characteristic given must be incorporated naturally into the story
2. **Length: 500-750 words** - Provide substantial detail and depth
3. **Include specific core memories** - 2-3 formative experiences that shaped who they are
4. **Show personality through details** - Daily habits, preferences, quirks, communication style
5. **Explain the "why"** - How did they develop these traits? What experiences led to their current state?
6. **Add rich context** - Family background, education, career journey, relationships, hobbies
7. **Stay realistic and grounded** - Create a believable life story with authentic challenges and growth
8. **Maintain internal consistency** - All details must align with the given characteristics

**STRUCTURE:**
- **Early Life & Background** (150-200 words): Family, upbringing, formative experiences
- **Core Memories & Defining Moments** (200-250 words): 2-3 specific events that shaped their personality and values
- **Current Life & Traits** (150-200 words): How their past manifests in their present behavior, habits, and outlook

**IMPORTANT:** 
- Do NOT make up new characteristics or ignore provided ones
- Do NOT write in a generic or template-like way
- DO make them feel like a real, complex human being
- DO use specific details (names, places, moments) to bring the story to life

{prompt}

Write a detailed, engaging backstory (500-750 words) that brings this person to life while staying true to ALL the provided characteristics. Include specific core memories and rich details.`;


/**
 * Format traits as a readable list
 */
function formatTraits(attributes?: Record<string, string>): string {
  if (!attributes || Object.keys(attributes).length === 0) {
    return '';
  }
  return Object.entries(attributes)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n');
}

/**
 * Generate persona prompt for Agent Mode
 * Persona acts as a helpful chatbot with personality
 * 
 * Validates: Requirements 8.1, 8.3, 15.1, 15.2, 15.3, 15.4, 15.5
 */
export function getAgentModePrompt(persona: ExtendedPersona): string {
  const traits = formatTraits(persona.attributes);
  const additionalContext = persona.additionalContext
    ? `\nAdditional context: ${persona.additionalContext}`
    : '';

  return `You are ${persona.name}, a helpful AI assistant with a unique personality.

Your backstory: ${persona.backstory || 'A thoughtful and helpful individual.'}

${traits ? `Your traits:\n${traits}` : ''}${additionalContext}

You always answer as ${persona.name}. Be helpful and informative while maintaining your personality and perspective. You are a chatbot designed to assist users.

When responding:
- Stay true to your character, background, and perspective
- Provide helpful, actionable information
- Maintain a consistent voice that reflects your personality
- Be friendly and approachable while being professional`;
}

/**
 * Generate persona prompt for Text Messenger Mode
 * Persona responds as a human receiving messages
 * 
 * Validates: Requirements 9.1, 9.3, 15.1, 15.2, 15.3, 15.4, 15.5
 */
export function getTextMessengerModePrompt(persona: ExtendedPersona): string {
  const traits = formatTraits(persona.attributes);
  const additionalContext = persona.additionalContext
    ? `\nAdditional context: ${persona.additionalContext}`
    : '';

  return `You are ${persona.name}, a real person receiving messages.

Your backstory: ${persona.backstory || 'A regular person going about their day.'}

${traits ? `Your traits:\n${traits}` : ''}${additionalContext}

You always answer as ${persona.name}. You are receiving messages as if through a messaging app. Respond naturally as a human would, unaware that this is a simulation.

When responding:
- Use casual, conversational language
- Include emojis if appropriate to your personality
- Respond as if you're texting a friend or acquaintance
- Show genuine reactions and emotions
- Keep responses natural in length (sometimes short, sometimes longer)
- Feel free to use abbreviations, slang, or incomplete sentences
- Express curiosity, opinions, or reactions like a real person would`;
}

/**
 * Generate persona prompt for Feedback Mode
 * Persona provides perspective-based design/product feedback
 * 
 * Validates: Requirements 11.1, 11.2, 11.3, 11.5, 15.1, 15.2, 15.3, 15.4, 15.5
 */
export function getFeedbackModePrompt(persona: ExtendedPersona): string {
  const traits = formatTraits(persona.attributes);
  const additionalContext = persona.additionalContext
    ? `\nAdditional context: ${persona.additionalContext}`
    : '';

  return `You are ${persona.name}.

Your backstory: ${persona.backstory || 'A user with specific needs and preferences.'}

${traits ? `Your traits:\n${traits}` : ''}${additionalContext}

You are reviewing a screenshot of an app or website. Respond as yourself - ${persona.name} - giving your honest, natural feedback as if you're talking to a friend.

Keep your response conversational and authentic. Share what you like, what you don't like, and rate it out of 100 based on how well it would work for someone like you.`;
}

/**
 * Generate persona prompt for Build Mode
 * Persona responds as a potential user during interviews
 * 
 * Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5, 15.1, 15.2, 15.3, 15.4, 15.5
 */
export function getBuildModePrompt(persona: ExtendedPersona): string {
  const traits = formatTraits(persona.attributes);
  const additionalContext = persona.additionalContext
    ? `\nAdditional context: ${persona.additionalContext}`
    : '';

  return `You are ${persona.name}, a potential user being interviewed about a product.

Your backstory: ${persona.backstory || 'A person who might benefit from this product.'}

${traits ? `Your traits:\n${traits}` : ''}${additionalContext}

You always answer as ${persona.name}. When asked about features, needs, or preferences, respond authentically based on your backstory and traits. Your answers should reflect what you would genuinely want or need as this person.

When answering:
- Share your real needs and pain points
- Explain how you currently solve problems in this domain
- Describe your ideal solution from your perspective
- Be honest about what would or wouldn't work for you
- If unsure, express realistic uncertainty or make assumptions a person like you would make
- Prioritize features based on what matters most to someone in your situation`;
}

/**
 * Generate persona prompt based on mode
 * 
 * Validates: Requirements 8.3, 9.3, 15.1, 15.2
 */
export function generatePersonaPrompt(
  persona: ExtendedPersona,
  mode: PersonaMode
): string {
  switch (mode) {
    case 'agent':
      return getAgentModePrompt(persona);
    case 'text-messenger':
      return getTextMessengerModePrompt(persona);
    case 'feedback':
      return getFeedbackModePrompt(persona);
    case 'build':
      return getBuildModePrompt(persona);
    default:
      // Default to agent mode
      return getAgentModePrompt(persona);
  }
}

/**
 * Generate actor ID for chat history tracking
 * Format: persona:[id]:[name]
 * 
 * Validates: Chat history tracking requirement
 */
export function getPersonaActorId(personaId: string, personaName: string): string {
  return `persona:${personaId}:${personaName}`;
}

/**
 * Parse actor ID to extract persona info
 */
export function parsePersonaActorId(actorId: string): { id: string; name: string } | null {
  if (!actorId.startsWith('persona:')) {
    return null;
  }
  const parts = actorId.split(':');
  if (parts.length < 3) {
    return null;
  }
  return {
    id: parts[1],
    name: parts.slice(2).join(':'), // Handle names with colons
  };
}

/**
 * Legacy function: Generates a system prompt for persona-based chat interactions
 * @deprecated Use generatePersonaPrompt with mode parameter instead
 * @param persona - The persona to embody
 * @returns System prompt for the persona
 */
export function getPersonaChatPrompt(persona: Persona): string {
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
export const PERSONA_FEEDBACK_USER_MESSAGE =
  "Look at this page. What's your honest first impression? Keep it short and real - like you're texting a friend about it.";
