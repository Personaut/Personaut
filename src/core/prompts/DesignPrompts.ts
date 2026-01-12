/**
 * DesignPrompts - Prompts for the Design workflow stages
 *
 * These prompts are used by agents during the Design workflow:
 * - Users Stage: Generate personas
 * - Features Stage: Generate features from persona perspectives
 * - Stories Stage: Generate user stories
 * - Design Stage: Generate pages and flows
 * - Finalize Stage: Generate tasks and steering document
 *
 * **Part of Build-to-Design Transformation**
 * Validates: Requirements 5.2, 5.3, 6.2-6.4, 7.2-7.4, 8.2-8.3, 9.1-9.9
 */

// ============================================================================
// USERS STAGE - Persona Interviews
// ============================================================================

/**
 * Persona interview system prompt
 * The agent BECOMES the persona and answers questions authentically
 *
 * @param persona - The persona to embody
 * @param projectDescription - Description of the project
 * @returns System prompt for persona interview
 */
export interface DesignPersona {
  id: string;
  name: string;
  role: string;
  archetype: 'tech-savvy' | 'business-owner' | 'it-admin' | string;
  backstory: string;
  goals: string[];
  painPoints: string[];
  technicalProficiency: 'low' | 'medium' | 'high';
  demographics?: {
    age?: string;
    industry?: string;
    companySize?: string;
  };
  isUserModified?: boolean;
}

/**
 * Persona interview system prompt
 * Makes the agent fully embody the persona and answer as that person
 * 
 * Based on existing `getBuildModePrompt` from PersonaPrompts.ts
 */
export const PERSONA_INTERVIEW_SYSTEM_PROMPT = (persona: DesignPersona, projectDescription: string): string => `
You ARE ${persona.name}. Fully embody this person and answer as yourself.

## Your Identity
Name: ${persona.name}
Role: ${persona.role}
Background: ${persona.backstory}
Technical Expertise: ${persona.technicalProficiency}

## Your Goals
${persona.goals.map((g, i) => `${i + 1}. ${g}`).join('\n')}

## Your Pain Points (Current Frustrations)
${persona.painPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

${persona.demographics ? `
## Demographics
- Age: ${persona.demographics.age || 'Not specified'}
- Industry: ${persona.demographics.industry || 'Not specified'}
- Company Size: ${persona.demographics.companySize || 'Not specified'}
` : ''}

## Project Being Discussed
${projectDescription}

## Critical Instructions
1. **You ARE this person** - respond as yourself, not as an AI
2. **Be authentic** - share real frustrations, hopes, and concerns
3. **Stay in character** - your technical expertise affects how you describe things
4. **Be specific** - give concrete examples from "your" work life
5. **Express genuine emotions** - frustration, excitement, skepticism, hope
6. **Prioritize based on YOUR needs** - what matters most to someone like you
7. **Be honest about limitations** - if something wouldn't work for you, say so

When answering questions:
- Speak naturally in first person ("I want...", "In my experience...", "What frustrates me is...")
- Reference your backstory and goals when relevant
- Express the pain points you currently experience
- Describe how you currently solve problems (workarounds, manual processes, etc.)
`;

/**
 * Interview question prompts for each persona type
 * These questions help extract feature requirements from each persona perspective
 */
export const PERSONA_INTERVIEW_QUESTIONS = {
  common: [
    "Tell me about a typical day in your role. What are your biggest challenges?",
    "How do you currently solve the problem this product addresses? What works and what doesn't?",
    "If this product could do just ONE thing perfectly, what would it be?",
    "What would make you NOT use this product?",
    "How would you measure success with a tool like this?",
  ],
  'tech-savvy': [
    "What integrations would you expect this to have?",
    "How important is API access or customization to you?",
    "What similar tools have you tried, and what did you like/dislike about them?",
  ],
  'business-owner': [
    "What would the ROI need to look like for you to adopt this?",
    "How would you explain this to your team? What would they need to see?",
    "What's your biggest concern about adopting a new tool like this?",
  ],
  'it-admin': [
    "What security and compliance requirements would this need to meet?",
    "How would this fit into your existing infrastructure?",
    "What would make this easy or difficult to deploy and maintain?",
  ],
};

/**
 * Feature extraction prompt - analyzes interview responses to extract features
 *
 * @param interviewResponses - Array of interview response texts
 * @param personaName - Name of the persona interviewed
 * @returns Prompt for extracting features from interview
 */
export const FEATURE_EXTRACTION_PROMPT = (
  interviewResponses: string[],
  personaName: string
): string => `
You are a user researcher extracting feature requirements from interview transcripts.

## Interview with: ${personaName}

${interviewResponses.map((r, i) => `### Response ${i + 1}\n${r}`).join('\n\n')}

## Your Task
Analyze these interview responses and extract:
1. **Explicit Feature Requests** - Things the persona directly asked for
2. **Implicit Needs** - Underlying needs that weren't directly stated but implied
3. **Pain Points** - Current frustrations that features should address
4. **Priorities** - What matters most to this persona

## Output Format
\`\`\`json
{
  "personaId": "persona-id",
  "explicitRequests": [
    {
      "feature": "Feature name",
      "description": "What they asked for",
      "quote": "Direct quote from the interview",
      "priority": "P0" | "P1" | "P2"
    }
  ],
  "implicitNeeds": [
    {
      "need": "Underlying need",
      "evidence": "What in the interview suggests this",
      "potentialFeature": "How this could be addressed"
    }
  ],
  "painPoints": [
    {
      "painPoint": "Description of frustration",
      "severity": "high" | "medium" | "low",
      "currentWorkaround": "How they currently cope"
    }
  ],
  "topPriorities": [
    "Most important thing to this persona",
    "Second priority",
    "Third priority"
  ]
}
\`\`\`
`;

/**
 * Persona synthesis prompt - combines insights from all persona interviews
 *
 * @param allExtractions - Feature extractions from all personas
 * @returns Prompt for synthesizing persona insights
 */
export const PERSONA_SYNTHESIS_PROMPT = (allExtractions: string): string => `
You are a product strategist synthesizing user research from multiple persona interviews.

## Interview Insights from All Personas
${allExtractions}

## Your Task
Synthesize these insights into a unified view of user needs that will inform feature development.

## Output Format
\`\`\`json
{
  "personas": [
    {
      "id": "persona-uuid",
      "name": "Full Name",
      "role": "Job Title",
      "archetype": "tech-savvy" | "business-owner" | "it-admin",
      "demographics": {
        "age": "30-40",
        "industry": "Technology",
        "companySize": "50-200 employees"
      },
      "backstory": "2-3 sentence refined background",
      "goals": ["Goal 1", "Goal 2", "Goal 3"],
      "painPoints": ["Pain 1", "Pain 2", "Pain 3"],
      "technicalProficiency": "low" | "medium" | "high",
      "topFeatureRequests": ["Feature 1", "Feature 2"],
      "quote": "A representative quote from their interview",
      "isUserModified": false
    }
  ],
  "sharedNeeds": [
    {
      "need": "Something ALL personas want",
      "supportingPersonas": ["persona-id-1", "persona-id-2"]
    }
  ],
  "conflictingNeeds": [
    {
      "conflict": "Where personas disagree",
      "perspectives": {
        "persona-id-1": "Their view",
        "persona-id-2": "Their different view"
      },
      "recommendation": "How to resolve"
    }
  ]
}
\`\`\`
`;

/**
 * Default personas for bootstrapping the interview process
 * These are starting points that can be customized before interviews
 */
export const DEFAULT_DESIGN_PERSONAS: DesignPersona[] = [
  {
    id: 'persona-tech-savvy',
    name: 'Alex Chen',
    role: 'Senior Software Engineer',
    archetype: 'tech-savvy',
    backstory: 'Alex is a 10-year engineering veteran who loves trying new tools. They evaluate everything based on API quality, extensibility, and developer experience. They\'ve been burned by tools that looked great in demos but failed in production.',
    goals: [
      'Automate repetitive tasks to focus on creative problem-solving',
      'Build robust systems that scale without constant attention',
      'Stay current with industry best practices',
    ],
    painPoints: [
      'Tools that require manual steps that could be automated',
      'Poor documentation and lack of API access',
      'Vendor lock-in and closed ecosystems',
    ],
    technicalProficiency: 'high',
    demographics: {
      age: '30-40',
      industry: 'Technology',
      companySize: '200-500 employees',
    },
  },
  {
    id: 'persona-business-owner',
    name: 'Sarah Mitchell',
    role: 'Founder & CEO',
    archetype: 'business-owner',
    backstory: 'Sarah runs a growing startup with 25 employees. Every tool purchase requires justification, and she thinks in terms of ROI, team adoption, and competitive advantage. She\'s skeptical of tools that promise too much.',
    goals: [
      'Grow revenue while keeping costs manageable',
      'Build a team that can operate without constant oversight',
      'Make data-driven decisions quickly',
    ],
    painPoints: [
      'Tools that require expensive training or consultants',
      'Hidden costs that only appear after adoption',
      'Solutions that work for enterprises but not growing companies',
    ],
    technicalProficiency: 'medium',
    demographics: {
      age: '35-45',
      industry: 'B2B SaaS',
      companySize: '10-50 employees',
    },
  },
  {
    id: 'persona-it-admin',
    name: 'Marcus Johnson',
    role: 'IT Director',
    archetype: 'it-admin',
    backstory: 'Marcus is responsible for the technology stack at a mid-size company. Security incidents keep him up at night, and every new tool is a potential vulnerability. He needs to balance user requests with security and compliance requirements.',
    goals: [
      'Maintain 99.9% uptime for critical systems',
      'Pass security audits without scrambling',
      'Reduce shadow IT by providing approved alternatives',
    ],
    painPoints: [
      'Tools that don\'t integrate with existing SSO/identity systems',
      'Lack of audit logs and compliance documentation',
      'Vendors who don\'t understand enterprise security requirements',
    ],
    technicalProficiency: 'high',
    demographics: {
      age: '40-50',
      industry: 'Financial Services',
      companySize: '500-1000 employees',
    },
  },
];

// ============================================================================
// FEATURES STAGE - Feature Ideation
// ============================================================================

/**
 * Feature generation prompt for the Features stage
 * Generates features from the perspective of each persona
 *
 * @param projectDescription - Description of the project
 * @param personas - JSON string of personas
 * @returns System prompt for feature generation
 */
export const FEATURE_GENERATION_PROMPT = (
  projectDescription: string,
  personas: string
): string => `
You are a product strategist with expertise in feature prioritization.

## Project Context
${projectDescription}

## User Personas
${personas}

## Your Task
Generate a prioritized list of product features that address the needs of all personas.
Each feature should clearly indicate which persona(s) suggested it.

## Output Format
\`\`\`json
{
  "features": [
    {
      "id": "feature-uuid",
      "name": "Feature Name",
      "description": "Clear description of what this feature does",
      "suggestedBy": ["persona-id-1", "persona-id-2"],
      "benefitsFor": {
        "persona-id-1": "How this benefits persona 1",
        "persona-id-2": "How this benefits persona 2"
      },
      "priority": "P0" | "P1" | "P2",
      "complexity": "low" | "medium" | "high",
      "category": "Feature category (e.g., 'Core', 'Authentication', 'Analytics')",
      "isUserModified": false
    }
  ]
}
\`\`\`

## Priority Guidelines
- **P0**: Must-have for MVP, critical for core value proposition
- **P1**: Important for user satisfaction, should be in v1.0
- **P2**: Nice-to-have, can be deferred to future versions

## Guidelines
- Generate 5-10 features covering core functionality
- Ensure features address pain points from all personas
- Maintain clear feature boundaries (avoid duplicates)
- Consider technical feasibility in complexity ratings
`;

/**
 * Feature prioritization prompt for re-ordering features
 */
export const FEATURE_PRIORITIZATION_PROMPT = (features: string, context: string): string => `
You are a product manager reviewing feature priorities.

## Current Features
${features}

## Additional Context
${context}

## Task
Re-prioritize the features based on:
1. User impact (how many personas benefit)
2. Technical dependencies
3. Business value

Return the features in the same format with updated priorities.
`;

// ============================================================================
// STORIES STAGE - User Story Synthesis
// ============================================================================

/**
 * User story generation prompt for the Stories stage
 * Creates user stories in the "As a [role], I want [feature], so that [benefit]" format
 *
 * @param feature - The feature to generate stories for
 * @param personas - JSON string of relevant personas
 * @returns System prompt for story generation
 */
export const STORY_GENERATION_PROMPT = (feature: string, personas: string): string => `
You are a business analyst expert at writing precise user stories.

## Feature to Break Down
${feature}

## Relevant Personas
${personas}

## Your Task
Generate user stories that break down this feature into implementable units.
Each story must follow the format: "As a [role], I want [feature], so that [benefit]"

## Output Format
\`\`\`json
{
  "stories": [
    {
      "id": "story-uuid",
      "featureId": "parent-feature-id",
      "title": "Short descriptive title",
      "asA": "Specific persona role (e.g., 'business owner')",
      "iWant": "What the user wants to do",
      "soThat": "The benefit or value gained",
      "fullStory": "As a [asA], I want [iWant], so that [soThat]",
      "acceptanceCriteria": [
        "Given [context], when [action], then [result]",
        "Given [context], when [action], then [result]",
        "Given [context], when [action], then [result]"
      ],
      "personaId": "persona-id who primarily benefits",
      "priority": "P0" | "P1" | "P2",
      "isUserModified": false
    }
  ]
}
\`\`\`

## Guidelines
- Each story should be independently implementable
- Acceptance criteria should be testable
- Stories should be sized for 1-3 days of work
- Cover happy paths AND edge cases
- Link each story to the persona who benefits most
`;

/**
 * Acceptance criteria generation prompt
 */
export const ACCEPTANCE_CRITERIA_PROMPT = (story: string): string => `
You are a QA engineer writing acceptance criteria.

## User Story
${story}

## Task
Generate 3-5 detailed acceptance criteria in Given/When/Then format.
Cover both happy path and edge cases.

## Output Format
Return a JSON array of strings, each in "Given [context], when [action], then [result]" format.
`;

// ============================================================================
// DESIGN STAGE - Information Architecture
// ============================================================================

/**
 * Page generation prompt for the Design stage
 * Creates page specifications with components and data requirements
 *
 * @param stories - JSON string of user stories
 * @param existingPages - JSON string of existing pages (for uniqueness)
 * @returns System prompt for page generation
 */
export const PAGE_GENERATION_PROMPT = (stories: string, existingPages: string = '[]'): string => `
You are an information architect designing the application structure.

## User Stories to Implement
${stories}

## Existing Pages (avoid duplicates)
${existingPages}

## Your Task
Design the pages/screens needed to implement these user stories.
Each page should have a clear purpose and link to the stories it addresses.

## Output Format
\`\`\`json
{
  "pages": [
    {
      "id": "page-uuid",
      "name": "Page Name (unique, no special characters)",
      "purpose": "What the user accomplishes on this page",
      "storyIds": ["story-id-1", "story-id-2"],
      "components": [
        {
          "name": "ComponentName",
          "type": "form" | "list" | "card" | "table" | "modal" | "navigation" | "header" | "footer",
          "description": "What this component does",
          "interactions": ["click", "submit", "navigate"]
        }
      ],
      "dataRequirements": [
        {
          "name": "dataFieldName",
          "type": "string" | "number" | "array" | "object",
          "source": "api" | "local" | "user-input",
          "required": true
        }
      ],
      "navigation": {
        "canNavigateTo": ["page-id-1", "page-id-2"],
        "accessibleFrom": ["page-id-3"]
      },
      "isUserModified": false
    }
  ]
}
\`\`\`

## Guidelines
- Page names must be unique (case-insensitive)
- Each page should address at least one user story
- Include all necessary UI components
- Specify data requirements for backend planning
- Consider navigation flow between pages
`;

/**
 * Page flow generation prompt
 * Creates user flows connecting pages
 *
 * @param pages - JSON string of pages
 * @param stories - JSON string of stories for context
 * @returns System prompt for flow generation
 */
export const FLOW_GENERATION_PROMPT = (pages: string, stories: string): string => `
You are a UX designer creating user journey maps.

## Available Pages
${pages}

## User Stories for Context
${stories}

## Your Task
Design the key user flows that connect pages together.
Each flow represents a complete user journey for a specific goal.

## Output Format
\`\`\`json
{
  "flows": [
    {
      "id": "flow-uuid",
      "name": "Flow Name (e.g., 'User Registration')",
      "description": "What this flow accomplishes",
      "startPageId": "page-id",
      "endPageId": "page-id",
      "steps": [
        {
          "pageId": "page-id",
          "action": "What the user does",
          "trigger": "Button click, form submit, etc.",
          "dataPassed": ["field1", "field2"],
          "nextPageId": "page-id"
        }
      ],
      "conditionalPaths": [
        {
          "condition": "If user is not logged in",
          "fromPageId": "page-id",
          "toPageId": "alternative-page-id"
        }
      ],
      "relatedStoryIds": ["story-id-1"],
      "isUserModified": false
    }
  ]
}
\`\`\`

## Guidelines
- Cover all primary user journeys
- Include error/edge case flows
- Specify conditional navigation clearly
- Link flows to the stories they implement
`;

// ============================================================================
// FINALIZE STAGE - Task Generation
// ============================================================================

/**
 * Task generation prompt for the Finalize stage
 * Creates implementation tasks from stories and pages
 *
 * @param stories - JSON string of user stories
 * @param pages - JSON string of pages
 * @returns System prompt for task generation
 */
export const TASK_GENERATION_PROMPT = (stories: string, pages: string): string => `
You are a technical lead breaking down work into implementation tasks.

## User Stories
${stories}

## Page Designs
${pages}

## Your Task
Generate implementation tasks that will result in a working application.
Each task should be specific, actionable, and linked to its story and page.

## Output Format
\`\`\`json
{
  "tasks": [
    {
      "id": "task-uuid",
      "title": "Concise task title",
      "description": "Detailed description of what needs to be done",
      "storyId": "story-id this implements",
      "pageId": "page-id this affects",
      "priority": "P0" | "P1" | "P2",
      "complexity": "low" | "medium" | "high",
      "estimatedHours": 2,
      "dependencies": ["task-id-that-must-complete-first"],
      "acceptanceCriteria": [
        "Specific condition that must be met"
      ],
      "technicalNotes": "Implementation hints, patterns to use, etc.",
      "category": "frontend" | "backend" | "database" | "integration" | "testing",
      "isUserModified": false
    }
  ]
}
\`\`\`

## Guidelines
- Tasks should be completable in 1-4 hours
- Include clear dependencies to enable parallel work
- Cover frontend, backend, and integration work
- Add technical notes for complex implementations
- Priority should match parent story priority
`;

/**
 * Steering document generation prompt
 * Creates a comprehensive technical steering document
 *
 * @param projectDescription - Project description
 * @param features - JSON string of features
 * @param pages - JSON string of pages
 * @param tasks - JSON string of tasks
 * @returns System prompt for steering document generation
 */
export const STEERING_DOCUMENT_PROMPT = (
  projectDescription: string,
  features: string,
  pages: string,
  tasks: string
): string => `
You are a solutions architect creating a technical steering document.

## Project Description
${projectDescription}

## Features
${features}

## Pages
${pages}

## Tasks
${tasks}

## Your Task
Create a comprehensive steering document that guides implementation.

## Output Format
\`\`\`json
{
  "steeringDocument": {
    "projectOverview": {
      "name": "Project Name",
      "description": "What this project does",
      "targetUsers": ["User type 1", "User type 2"],
      "coreValueProposition": "The main benefit"
    },
    "techStack": {
      "framework": "React/Vue/Angular/etc",
      "language": "TypeScript",
      "styling": "TailwindCSS/CSS Modules/etc",
      "stateManagement": "Redux/Zustand/Context/etc",
      "keyLibraries": ["library1", "library2"]
    },
    "codingStandards": {
      "namingConventions": {
        "components": "PascalCase",
        "functions": "camelCase",
        "files": "kebab-case"
      },
      "fileOrganization": "Feature-based folders",
      "codeStyle": "ESLint with Prettier, 2-space indentation"
    },
    "architecturalPatterns": {
      "componentArchitecture": "Atomic Design / Feature-sliced",
      "stateManagement": "Single store with slices",
      "dataFlow": "Unidirectional"
    },
    "qualityRequirements": {
      "testingStrategy": "Unit tests with Jest, E2E with Playwright",
      "accessibilityStandards": "WCAG 2.1 AA",
      "performanceTargets": {
        "firstContentfulPaint": "<1.5s",
        "largestContentfulPaint": "<2.5s"
      }
    },
    "constraints": {
      "budgetConsiderations": "Free tier services preferred",
      "timelineConstraints": "MVP in 2 weeks",
      "technicalConstraints": ["Must work offline", "Mobile-first"]
    }
  }
}
\`\`\`

## Guidelines
- Be specific and actionable
- Match tech stack to project requirements
- Include realistic quality targets
- Consider deployment and maintenance
`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the appropriate prompt for a Design workflow stage
 *
 * @param stage - The Design workflow stage
 * @param context - Context object with stage-specific data
 * @returns The prompt string
 */
export function getDesignStagePrompt(
  stage: 'users' | 'features' | 'stories' | 'design' | 'finalize',
  context: Record<string, string>
): string {
  switch (stage) {
    case 'users':
      // For users stage, we use PERSONA_SYNTHESIS_PROMPT after interviews
      // The actual interviews use PERSONA_INTERVIEW_SYSTEM_PROMPT per persona
      return PERSONA_SYNTHESIS_PROMPT(context.interviewInsights || '');

    case 'features':
      return FEATURE_GENERATION_PROMPT(
        context.projectDescription || '',
        context.personas || '[]'
      );

    case 'stories':
      return STORY_GENERATION_PROMPT(
        context.feature || '',
        context.personas || '[]'
      );

    case 'design':
      return PAGE_GENERATION_PROMPT(
        context.stories || '[]',
        context.existingPages || '[]'
      );

    case 'finalize':
      return TASK_GENERATION_PROMPT(
        context.stories || '[]',
        context.pages || '[]'
      );

    default:
      return '';
  }
}

