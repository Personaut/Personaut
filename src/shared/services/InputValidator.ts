/**
 * InputValidator - Validates and sanitizes user inputs and AI responses.
 *
 * Implements security controls for input handling:
 * - Type and length validation for form fields
 * - Content length limits (10MB max)
 * - HTML/Markdown sanitization to prevent XSS
 * - AI response sanitization before rendering
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 8.1, 8.2
 */

/**
 * Result of input validation
 */
export interface InputValidationResult {
  valid: boolean;
  sanitizedValue?: string;
  reason?: string;
  originalLength?: number;
  sanitizedLength?: number;
}

/**
 * Configuration for InputValidator
 */
export interface InputValidatorConfig {
  /** Maximum content length in bytes (default: 10MB) */
  maxContentLength: number;
  /** Maximum input field length (default: 10000 characters) */
  maxInputLength: number;
  /** Whether to allow HTML in inputs (default: false) */
  allowHtml: boolean;
  /** Whether to strip all HTML tags (default: true) */
  stripHtml: boolean;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: InputValidatorConfig = {
  maxContentLength: 10 * 1024 * 1024, // 10MB
  maxInputLength: 10000,
  allowHtml: false,
  stripHtml: true,
};

/**
 * XSS attack patterns to detect and remove
 */
const XSS_PATTERNS: RegExp[] = [
  // Script tags
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  // Event handlers with double quotes
  /\bon\w+\s*=\s*"[^"]*"/gi,
  // Event handlers with single quotes
  /\bon\w+\s*=\s*'[^']*'/gi,
  // Event handlers without quotes
  /\bon\w+\s*=\s*[^\s>"']+/gi,
  // JavaScript URLs (with or without whitespace)
  /javascript\s*:/gi,
  // href with javascript
  /href\s*=\s*["']?\s*javascript:/gi,
  // Data URLs with scripts
  /data\s*:\s*text\/html/gi,
  // VBScript
  /vbscript\s*:/gi,
  // Expression (IE)
  /expression\s*\(/gi,
  // Import
  /<\s*import\b/gi,
  // Embed/Object
  /<\s*embed\b/gi,
  /<\s*object\b/gi,
  // iframe
  /<\s*iframe\b/gi,
  // form
  /<\s*form\b/gi,
  // base tag
  /<\s*base\b/gi,
  // link with import
  /<\s*link\b[^>]*\brel\s*=\s*["']?import/gi,
  // SVG with scripts
  /<\s*svg\b[^>]*\bonload/gi,
  // Math with scripts
  /<\s*math\b[^>]*\bonload/gi,
  // img with onerror
  /<\s*img\b[^>]*\bon\w+/gi,
  // style tags with @import
  /<\s*style\b[^>]*>[\s\S]*@import/gi,
  // style tags in general (can contain expressions)
  /<\s*style\b/gi,
  // Any tag with event handlers
  /<[^>]+\bon\w+\s*=/gi,
  // Math tags (can be used for XSS)
  /<\s*math\b/gi,
  // maction tags
  /<\s*maction\b/gi,
  // marquee tags
  /<\s*marquee\b/gi,
  // video/audio with event handlers
  /<\s*video\b/gi,
  /<\s*audio\b/gi,
  // details tag
  /<\s*details\b/gi,
];

/**
 * Dangerous HTML tags to remove
 */
const DANGEROUS_TAGS = [
  'script',
  'iframe',
  'object',
  'embed',
  'form',
  'input',
  'button',
  'select',
  'textarea',
  'link',
  'meta',
  'base',
  'applet',
  'frame',
  'frameset',
  'layer',
  'ilayer',
  'bgsound',
  'style',
];

/**
 * Dangerous attributes to remove
 */
const DANGEROUS_ATTRIBUTES = [
  'onclick',
  'ondblclick',
  'onmousedown',
  'onmouseup',
  'onmouseover',
  'onmousemove',
  'onmouseout',
  'onmouseenter',
  'onmouseleave',
  'onkeydown',
  'onkeypress',
  'onkeyup',
  'onload',
  'onerror',
  'onabort',
  'onblur',
  'onchange',
  'onfocus',
  'onreset',
  'onsubmit',
  'ondrag',
  'ondragend',
  'ondragenter',
  'ondragleave',
  'ondragover',
  'ondragstart',
  'ondrop',
  'onscroll',
  'oncopy',
  'oncut',
  'onpaste',
  'onbeforeunload',
  'onunload',
  'onhashchange',
  'onpopstate',
  'onstorage',
  'onmessage',
  'onoffline',
  'ononline',
  'onpagehide',
  'onpageshow',
  'formaction',
  'xlink:href',
  'href',
  'src',
  'action',
  'style', // style can contain expression() in IE
];

export class InputValidator {
  private config: InputValidatorConfig;

  constructor(config: Partial<InputValidatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Validates user input from form fields
   * Enforces type and length constraints
   *
   * @param input - The input string to validate
   * @param options - Optional validation options
   * @returns Validation result with sanitized value if valid
   */
  validateInput(
    input: string,
    options: { maxLength?: number; required?: boolean; type?: 'text' | 'url' | 'email' } = {}
  ): InputValidationResult {
    const maxLength = options.maxLength ?? this.config.maxInputLength;
    const required = options.required ?? false;
    const type = options.type ?? 'text';

    // Check for null/undefined
    if (input === null || input === undefined) {
      if (required) {
        return { valid: false, reason: 'Input is required' };
      }
      return { valid: true, sanitizedValue: '' };
    }

    // Convert to string if not already
    const strInput = String(input);
    const originalLength = strInput.length;

    // Check if empty when required
    if (required && strInput.trim().length === 0) {
      return { valid: false, reason: 'Input is required', originalLength };
    }

    // Check length constraint
    if (strInput.length > maxLength) {
      return {
        valid: false,
        reason: `Input exceeds maximum length of ${maxLength} characters`,
        originalLength,
      };
    }

    // Type-specific validation
    if (type === 'url' && strInput.trim().length > 0) {
      try {
        const url = new URL(strInput);
        // Reject dangerous URL protocols
        const dangerousProtocols = ['javascript:', 'vbscript:', 'data:'];
        if (dangerousProtocols.some((p) => url.protocol.toLowerCase() === p)) {
          return { valid: false, reason: 'Invalid URL format', originalLength };
        }
        // Require http/https/ftp protocols for valid URLs
        const allowedProtocols = ['http:', 'https:', 'ftp:', 'file:'];
        if (!allowedProtocols.includes(url.protocol.toLowerCase())) {
          return { valid: false, reason: 'Invalid URL format', originalLength };
        }
      } catch {
        return { valid: false, reason: 'Invalid URL format', originalLength };
      }
    }

    if (type === 'email' && strInput.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(strInput)) {
        return { valid: false, reason: 'Invalid email format', originalLength };
      }
    }

    // Sanitize the input
    const sanitizedValue = this.sanitizeInput(strInput);

    return {
      valid: true,
      sanitizedValue,
      originalLength,
      sanitizedLength: sanitizedValue.length,
    };
  }

  /**
   * Validates content length against the maximum limit (10MB)
   *
   * @param content - The content to validate
   * @returns Validation result
   */
  validateContentLength(content: string): InputValidationResult {
    if (content === null || content === undefined) {
      return { valid: true, sanitizedValue: '' };
    }

    const strContent = String(content);
    const byteLength = Buffer.byteLength(strContent, 'utf8');
    const originalLength = strContent.length;

    if (byteLength > this.config.maxContentLength) {
      return {
        valid: false,
        reason: `Content exceeds maximum size of ${this.config.maxContentLength / (1024 * 1024)}MB`,
        originalLength,
      };
    }

    return {
      valid: true,
      sanitizedValue: strContent,
      originalLength,
      sanitizedLength: strContent.length,
    };
  }

  /**
   * Sanitizes user input by removing potentially dangerous content
   *
   * @param input - The input to sanitize
   * @returns Sanitized input string
   */
  sanitizeInput(input: string): string {
    if (!input) {
      return '';
    }

    let sanitized = input;

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // If HTML is not allowed, strip all HTML tags
    if (!this.config.allowHtml && this.config.stripHtml) {
      sanitized = this.stripHtmlTags(sanitized);
    }

    // Remove XSS patterns
    sanitized = this.removeXssPatterns(sanitized);

    // Normalize whitespace (but preserve intentional line breaks)
    sanitized = sanitized.replace(/[\t\f\v]+/g, ' ');

    return sanitized;
  }

  /**
   * Sanitizes AI-generated response content before rendering
   * Removes XSS vectors while preserving safe markdown
   *
   * @param response - The AI response to sanitize
   * @returns Sanitized response string
   */
  sanitizeResponse(response: string): string {
    if (!response) {
      return '';
    }

    let sanitized = response;

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Remove dangerous HTML tags but preserve safe ones for markdown
    sanitized = this.removeDangerousTags(sanitized);

    // Remove dangerous attributes from remaining tags
    sanitized = this.removeDangerousAttributes(sanitized);

    // Remove XSS patterns
    sanitized = this.removeXssPatterns(sanitized);

    return sanitized;
  }

  /**
   * Sanitizes markdown content to prevent XSS attacks
   * Preserves markdown formatting while removing dangerous content
   *
   * @param markdown - The markdown content to sanitize
   * @returns Sanitized markdown string
   */
  sanitizeMarkdown(markdown: string): string {
    if (!markdown) {
      return '';
    }

    let sanitized = markdown;

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Remove script tags and their content
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove dangerous HTML tags
    sanitized = this.removeDangerousTags(sanitized);

    // Remove dangerous attributes
    sanitized = this.removeDangerousAttributes(sanitized);

    // Remove javascript: URLs in markdown links
    sanitized = sanitized.replace(/\[([^\]]*)\]\(javascript:[^)]*\)/gi, '[$1](#)');

    // Remove data: URLs in markdown links (except safe image types)
    sanitized = sanitized.replace(
      /\[([^\]]*)\]\(data:(?!image\/(?:png|jpeg|gif|webp))[^)]*\)/gi,
      '[$1](#)'
    );

    // Remove javascript: URLs in markdown images
    sanitized = sanitized.replace(/!\[([^\]]*)\]\(javascript:[^)]*\)/gi, '![$1](#)');

    // Remove XSS patterns
    sanitized = this.removeXssPatterns(sanitized);

    return sanitized;
  }

  /**
   * Checks if content contains potential XSS vectors
   *
   * @param content - The content to check
   * @returns True if XSS patterns are detected
   */
  containsXss(content: string): boolean {
    if (!content) {
      return false;
    }

    // Check for XSS patterns
    // Reset lastIndex for each pattern since they have the 'g' flag
    for (const pattern of XSS_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(content)) {
        return true;
      }
    }

    // Check for dangerous tags
    for (const tag of DANGEROUS_TAGS) {
      const tagPattern = new RegExp(`<\\s*${tag}\\b`, 'i');
      if (tagPattern.test(content)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Strips all HTML tags from content
   *
   * @param html - The HTML content
   * @returns Plain text without HTML tags
   */
  private stripHtmlTags(html: string): string {
    // First decode HTML entities
    let text = html
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Remove all HTML tags
    text = text.replace(/<[^>]*>/g, '');

    // Re-encode special characters for safety
    text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    return text;
  }

  /**
   * Removes dangerous HTML tags while preserving safe ones
   *
   * @param html - The HTML content
   * @returns HTML with dangerous tags removed
   */
  private removeDangerousTags(html: string): string {
    let result = html;

    for (const tag of DANGEROUS_TAGS) {
      // Remove opening tags with attributes
      const openTagPattern = new RegExp(`<\\s*${tag}\\b[^>]*>`, 'gi');
      result = result.replace(openTagPattern, '');

      // Remove closing tags
      const closeTagPattern = new RegExp(`<\\s*/\\s*${tag}\\s*>`, 'gi');
      result = result.replace(closeTagPattern, '');

      // Remove self-closing tags
      const selfClosePattern = new RegExp(`<\\s*${tag}\\b[^>]*/\\s*>`, 'gi');
      result = result.replace(selfClosePattern, '');
    }

    return result;
  }

  /**
   * Removes dangerous attributes from HTML tags
   *
   * @param html - The HTML content
   * @returns HTML with dangerous attributes removed
   */
  private removeDangerousAttributes(html: string): string {
    let result = html;

    for (const attr of DANGEROUS_ATTRIBUTES) {
      // Remove attribute with double quotes
      const doubleQuotePattern = new RegExp(`\\s*${attr}\\s*=\\s*"[^"]*"`, 'gi');
      result = result.replace(doubleQuotePattern, '');

      // Remove attribute with single quotes
      const singleQuotePattern = new RegExp(`\\s*${attr}\\s*=\\s*'[^']*'`, 'gi');
      result = result.replace(singleQuotePattern, '');

      // Remove attribute without quotes
      const noQuotePattern = new RegExp(`\\s*${attr}\\s*=\\s*[^\\s>]+`, 'gi');
      result = result.replace(noQuotePattern, '');
    }

    return result;
  }

  /**
   * Removes XSS patterns from content
   *
   * @param content - The content to clean
   * @returns Content with XSS patterns removed
   */
  private removeXssPatterns(content: string): string {
    let result = content;

    for (const pattern of XSS_PATTERNS) {
      result = result.replace(pattern, '');
    }

    return result;
  }

  /**
   * Gets the current configuration
   */
  getConfig(): InputValidatorConfig {
    return { ...this.config };
  }

  /**
   * Updates the configuration
   */
  updateConfig(config: Partial<InputValidatorConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
