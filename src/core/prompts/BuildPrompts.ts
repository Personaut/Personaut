/**
 * Prompts for build mode content generation
 */

/**
 * Default system prompt for build mode content generation
 */
export const BUILD_MODE_DEFAULT_PROMPT =
  'You are a helpful assistant. Generate content in JSON format as requested.';

/**
 * User story generation prompt
 */
export const USER_STORY_PROMPT = `You are a UX expert generating user stories. 
For each feature, create comprehensive user stories in the format:
"As a [persona], I want [feature], so that [benefit]"

IMPORTANT: Generate a MINIMUM of 10 user stories. Create 2-3 stories per feature to ensure thorough coverage.

Each story should include:
- A clear, descriptive title
- The user story description in the standard format
- 3-5 acceptance criteria (testable conditions using Given/When/Then)
- 2-3 clarifying questions to refine requirements
- Priority level (High, Medium, Low)

Output as JSON array with structure:
[{
  "id": "story-1",
  "title": "Story Title",
  "description": "As a user, I want to...",
  "acceptanceCriteria": ["Given..., When..., Then..."],
  "clarifyingQuestions": ["What happens if...?"],
  "priority": "High",
  "featureId": "feature-id",
  "personaId": "persona-id"
}]`;

/**
 * Design generation prompt
 */
export const DESIGN_PROMPT = `You are a UX expert generating design specifications.
Based on the user stories and selected framework, generate:
1. User flows showing page navigation paths
2. Key screens/pages with detailed specifications

Output as JSON with structure:
{
  "userFlows": [{
    "id": "flow-1",
    "name": "Flow Name",
    "description": "What this flow achieves",
    "steps": ["Page A", "Page B", "Page C"]
  }],
  "pages": [{
    "id": "page-1",
    "name": "Page Name",
    "purpose": "What the user achieves here",
    "uiElements": ["element1", "element2"],
    "userActions": ["action1", "action2"]
  }]
}`;

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

// ==================== Research Prompts ====================

/**
 * User research analyst prompt
 * Used for analyzing interview transcripts and extracting insights
 */
export const USER_RESEARCH_ANALYST_PROMPT = `You are a user research analyst. Your job is to read through user interview transcripts and extract key feature requests and insights.`;

/**
 * Competitive analysis prompt template
 * Used for researching and analyzing similar products
 * 
 * @param ideaDescription - Description of the product idea
 * @returns System prompt for competitive analysis
 */
export const COMPETITIVE_ANALYSIS_PROMPT = (ideaDescription: string): string => `You are a competitive analysis researcher. Research and analyze products similar to: "${ideaDescription}"`;

/**
 * Market research prompt template
 * Used for analyzing market opportunities
 * 
 * @param ideaDescription - Description of the product idea
 * @returns System prompt for market research
 */
export const MARKET_RESEARCH_PROMPT = (ideaDescription: string): string => `You are a market research analyst. Research the market opportunity for: "${ideaDescription}"`;

/**
 * User researcher prompt template
 * Used for researching potential users
 * 
 * @param ideaDescription - Description of the product idea
 * @returns System prompt for user research
 */
export const USER_RESEARCHER_PROMPT = (ideaDescription: string): string => `You are a user researcher. Research potential users for: "${ideaDescription}"`;

/**
 * Research synthesis prompt
 * Used for consolidating research findings into comprehensive reports
 */
export const RESEARCH_SYNTHESIS_PROMPT = `You are a research synthesis expert. Consolidate the following research findings into a comprehensive report.`;

/**
 * Product strategist prompt
 * Used for synthesizing research into actionable product strategy
 */
export const PRODUCT_STRATEGIST_PROMPT = `You are a senior product strategist synthesizing research into an actionable report.`;

/**
 * Feature analyst prompt
 * Used for consolidating feedback from multiple user interviews
 */
export const FEATURE_ANALYST_PROMPT = `You are a feature analyst consolidating feedback from multiple user interviews.`;

// ==================== Design and Development Prompts ====================

/**
 * UX designer prompt
 * Used for designing user interfaces and writing requirements
 */
export const UX_DESIGNER_PROMPT = `You are a UX designer. Your task is to design the user interface and write clear requirements for the developer.`;

/**
 * Full-stack developer prompt template
 * Used for code generation with specific frameworks
 * 
 * @param framework - The framework being used (e.g., "React", "Vue", "Angular")
 * @returns System prompt for development
 */
export const DEVELOPER_PROMPT = (framework: string): string => `You are a full-stack developer using ${framework}.`;

/**
 * CPTO (Chief Product & Technology Officer) prompt
 * Used for high-level product and technology decisions
 */
export const CPTO_PROMPT = `You are a CPTO (Chief Product & Technology Officer). `;
