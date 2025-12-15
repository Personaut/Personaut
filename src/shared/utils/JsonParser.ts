/**
 * JsonParser - Robust JSON parsing utility for LLM outputs.
 * 
 * Handles common LLM JSON output issues:
 * - Extracts JSON from markdown code blocks
 * - Attempts to repair common JSON errors
 * - Falls back to asking LLM to reparse if needed
 */

export interface JsonParseResult<T = any> {
    success: boolean;
    data: T | null;
    error?: string;
    wasRepaired?: boolean;
}

/**
 * Extract JSON from text that may contain markdown code blocks or other text.
 */
export function extractJson(text: string): string | null {
    if (!text || typeof text !== 'string') {
        return null;
    }

    // Try to find JSON in code blocks (with or without 'json' language tag)
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
        return codeBlockMatch[1].trim();
    }

    // Try to find raw JSON object or array
    const jsonObjectMatch = text.match(/(\{[\s\S]*\})/);
    if (jsonObjectMatch) {
        return jsonObjectMatch[1].trim();
    }

    const jsonArrayMatch = text.match(/(\[[\s\S]*\])/);
    if (jsonArrayMatch) {
        return jsonArrayMatch[1].trim();
    }

    return null;
}

/**
 * Attempt to repair common JSON errors.
 */
export function repairJson(json: string): string {
    if (!json) return json;

    let repaired = json;

    // Remove trailing commas before ] or }
    repaired = repaired.replace(/,\s*([}\]])/g, '$1');

    // Fix unescaped newlines in strings
    repaired = repaired.replace(/(?<!\\)(\n)(?=(?:[^"]*"[^"]*")*[^"]*"[^"]*$)/g, '\\n');

    // Fix single quotes used as string delimiters (simple cases)
    // Only do this if there are no double quotes
    if (!repaired.includes('"') && repaired.includes("'")) {
        repaired = repaired.replace(/'/g, '"');
    }

    // Remove control characters that break JSON
    repaired = repaired.replace(/[\x00-\x1F\x7F]/g, (match) => {
        if (match === '\n' || match === '\r' || match === '\t') {
            return match; // Keep these
        }
        return ''; // Remove other control characters
    });

    return repaired;
}

/**
 * Parse JSON with automatic extraction and repair attempts.
 */
export function parseJson<T = any>(text: string): JsonParseResult<T> {
    if (!text || typeof text !== 'string') {
        return {
            success: false,
            data: null,
            error: 'Input is empty or not a string',
        };
    }

    // Step 1: Try to parse as-is
    try {
        const data = JSON.parse(text) as T;
        return { success: true, data };
    } catch {
        // Continue to extraction
    }

    // Step 2: Try to extract JSON from text
    const extracted = extractJson(text);
    if (extracted) {
        try {
            const data = JSON.parse(extracted) as T;
            return { success: true, data };
        } catch {
            // Continue to repair
        }

        // Step 3: Try to repair extracted JSON
        const repaired = repairJson(extracted);
        try {
            const data = JSON.parse(repaired) as T;
            return { success: true, data, wasRepaired: true };
        } catch (e: any) {
            return {
                success: false,
                data: null,
                error: `Failed to parse JSON after repair: ${e.message}`,
            };
        }
    }

    return {
        success: false,
        data: null,
        error: 'No valid JSON found in text',
    };
}

/**
 * Create a prompt to ask LLM to reparse/fix JSON.
 */
export function createReparsePrompt(originalText: string, error: string): string {
    return `The following text contains JSON that failed to parse with error: "${error}"

Please extract and fix the JSON, returning ONLY valid JSON in a code block:

Original text:
${originalText.substring(0, 2000)}${originalText.length > 2000 ? '...[truncated]' : ''}

Rules:
1. Return ONLY a valid JSON code block
2. Fix any syntax errors (trailing commas, unquoted keys, etc.)
3. Preserve the original data structure and content
4. Do not add explanatory text, just the JSON

\`\`\`json
`;
}
