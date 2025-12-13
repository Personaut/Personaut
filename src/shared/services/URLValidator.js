"use strict";
/**
 * URLValidator - Validates URLs for browser security.
 *
 * Implements security controls for browser navigation:
 * - URL allowlist/blocklist validation
 * - Internal network address blocking
 * - Timeout enforcement
 * - External URL confirmation requirements
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.URLValidator = void 0;
const DEFAULT_CONFIG = {
    allowInternalNetworks: false,
    blocklist: [],
    defaultTimeout: 30000, // 30 seconds
    requireConfirmationForExternal: true,
    allowNoSandbox: false,
};
class URLValidator {
    constructor(config) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /**
     * Validate a URL for navigation.
     *
     * @param url - The URL to validate
     * @returns Validation result with allowed status and details
     */
    validateURL(url) {
        if (!url || url.trim() === '') {
            return {
                allowed: false,
                reason: 'Empty URL provided',
                requiresConfirmation: false,
                riskLevel: 'low',
            };
        }
        let parsedUrl;
        try {
            parsedUrl = new URL(url);
        }
        catch {
            return {
                allowed: false,
                reason: 'Invalid URL format',
                requiresConfirmation: false,
                riskLevel: 'medium',
            };
        }
        // Check protocol
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return {
                allowed: false,
                reason: `Unsupported protocol: ${parsedUrl.protocol}. Only HTTP and HTTPS are allowed.`,
                requiresConfirmation: false,
                riskLevel: 'high',
            };
        }
        const hostname = parsedUrl.hostname;
        // Check blocklist first (highest priority)
        if (this.isBlocklisted(hostname)) {
            return {
                allowed: false,
                normalizedUrl: url,
                reason: 'URL is in the blocklist',
                requiresConfirmation: false,
                riskLevel: 'high',
            };
        }
        // Check internal network addresses
        if (this.isInternalNetwork(hostname)) {
            if (!this.config.allowInternalNetworks) {
                return {
                    allowed: false,
                    normalizedUrl: url,
                    reason: 'Access to internal network addresses is blocked for security reasons',
                    requiresConfirmation: false,
                    riskLevel: 'high',
                };
            }
        }
        // Check allowlist if configured
        if (this.config.allowlist && this.config.allowlist.length > 0) {
            if (!this.isAllowlisted(hostname)) {
                return {
                    allowed: false,
                    normalizedUrl: url,
                    reason: 'URL is not in the allowlist',
                    requiresConfirmation: false,
                    riskLevel: 'medium',
                };
            }
        }
        // Determine if confirmation is required
        const isExternal = !this.isInternalNetwork(hostname);
        const requiresConfirmation = isExternal && this.config.requireConfirmationForExternal;
        return {
            allowed: true,
            normalizedUrl: url,
            requiresConfirmation,
            riskLevel: requiresConfirmation ? 'medium' : 'low',
        };
    }
    /**
     * Check if a hostname is an internal network address.
     *
     * @param hostname - The hostname to check
     * @returns true if the hostname is an internal network address
     */
    isInternalNetwork(hostname) {
        const normalizedHostname = hostname.toLowerCase();
        return URLValidator.INTERNAL_NETWORK_PATTERNS.some((pattern) => pattern.test(normalizedHostname));
    }
    /**
     * Check if a hostname is in the blocklist.
     *
     * @param hostname - The hostname to check
     * @returns true if the hostname is blocklisted
     */
    isBlocklisted(hostname) {
        if (!this.config.blocklist || this.config.blocklist.length === 0) {
            return false;
        }
        const normalizedHostname = hostname.toLowerCase();
        return this.config.blocklist.some((blocked) => {
            const normalizedBlocked = blocked.toLowerCase();
            // Exact match or subdomain match
            return (normalizedHostname === normalizedBlocked ||
                normalizedHostname.endsWith('.' + normalizedBlocked));
        });
    }
    /**
     * Check if a hostname is in the allowlist.
     *
     * @param hostname - The hostname to check
     * @returns true if the hostname is allowlisted
     */
    isAllowlisted(hostname) {
        if (!this.config.allowlist || this.config.allowlist.length === 0) {
            return true; // No allowlist means all allowed
        }
        const normalizedHostname = hostname.toLowerCase();
        return this.config.allowlist.some((allowed) => {
            const normalizedAllowed = allowed.toLowerCase();
            // Exact match or subdomain match
            return (normalizedHostname === normalizedAllowed ||
                normalizedHostname.endsWith('.' + normalizedAllowed));
        });
    }
    /**
     * Validate browser launch arguments for security.
     *
     * @param args - The browser launch arguments
     * @returns Validation result with sanitized arguments
     */
    validateBrowserArgs(args) {
        const warnings = [];
        const sanitizedArgs = [];
        for (const arg of args) {
            const normalizedArg = arg.toLowerCase();
            // Check for dangerous arguments
            const isDangerous = URLValidator.DANGEROUS_BROWSER_ARGS.some((dangerous) => normalizedArg.startsWith(dangerous.toLowerCase()));
            if (isDangerous) {
                if (normalizedArg.includes('no-sandbox') && this.config.allowNoSandbox) {
                    // Allow --no-sandbox if explicitly configured
                    sanitizedArgs.push(arg);
                    warnings.push(`Warning: Using ${arg} - this reduces browser security`);
                }
                else {
                    warnings.push(`Blocked dangerous argument: ${arg}`);
                }
            }
            else {
                sanitizedArgs.push(arg);
            }
        }
        const hasBlockedArgs = warnings.some((w) => w.startsWith('Blocked'));
        return {
            allowed: !hasBlockedArgs || this.config.allowNoSandbox,
            reason: hasBlockedArgs ? 'Some browser arguments were blocked for security' : undefined,
            sanitizedArgs,
            warnings,
        };
    }
    /**
     * Check if --no-sandbox flag is present in arguments.
     *
     * @param args - The browser launch arguments
     * @returns true if --no-sandbox is present
     */
    hasNoSandboxFlag(args) {
        return args.some((arg) => arg.toLowerCase().includes('no-sandbox'));
    }
    /**
     * Get the configured timeout value.
     *
     * @returns Timeout in milliseconds
     */
    getTimeout() {
        return this.config.defaultTimeout;
    }
    /**
     * Get the current configuration.
     *
     * @returns Current URLValidator configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Update the configuration.
     *
     * @param config - Partial configuration to update
     */
    setConfig(config) {
        this.config = { ...this.config, ...config };
    }
    /**
     * Add domains to the blocklist.
     *
     * @param domains - Domains to add to blocklist
     */
    addToBlocklist(domains) {
        this.config.blocklist = [...(this.config.blocklist || []), ...domains];
    }
    /**
     * Add domains to the allowlist.
     *
     * @param domains - Domains to add to allowlist
     */
    addToAllowlist(domains) {
        this.config.allowlist = [...(this.config.allowlist || []), ...domains];
    }
}
exports.URLValidator = URLValidator;
// Internal network patterns that should be blocked by default
URLValidator.INTERNAL_NETWORK_PATTERNS = [
    /^localhost$/i,
    /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // 127.x.x.x
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // 10.x.x.x
    /^192\.168\.\d{1,3}\.\d{1,3}$/, // 192.168.x.x
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/, // 172.16.x.x - 172.31.x.x
    /^169\.254\.\d{1,3}\.\d{1,3}$/, // 169.254.x.x (link-local)
    /^0\.0\.0\.0$/, // 0.0.0.0
    /^\[::1\]$/, // IPv6 localhost
    /^\[fe80:/i, // IPv6 link-local
    /^\[fc00:/i, // IPv6 unique local
    /^\[fd00:/i, // IPv6 unique local
    /^.*\.local$/i, // .local domains
    /^.*\.internal$/i, // .internal domains
    /^.*\.localhost$/i, // .localhost domains
];
// Dangerous browser launch arguments
URLValidator.DANGEROUS_BROWSER_ARGS = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-web-security',
    '--disable-features=IsolateOrigins',
    '--disable-site-isolation-trials',
    '--allow-running-insecure-content',
];
//# sourceMappingURL=URLValidator.js.map