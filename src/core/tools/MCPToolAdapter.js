"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPToolAdapter = void 0;
class MCPToolAdapter {
    constructor(mcpTool, client) {
        this.mcpTool = mcpTool;
        this.client = client;
    }
    get name() {
        return this.mcpTool.name;
    }
    get description() {
        return this.mcpTool.description || '';
    }
    getUsageExample() {
        // Simple representation of the schema
        const schema = JSON.stringify(this.mcpTool.inputSchema?.properties || {});
        return `
<${this.name}>
    <!-- Arguments (JSON): ${schema} -->
    {
        "arg_name": "value"
    }
</${this.name}>
`;
    }
    async execute(args, content) {
        // If content is provided, it might be the JSON body if the regex parsed it that way
        // But our regex currently parses attributes or content.
        // For MCP, we might need to parse the content as JSON if it's complex.
        let finalArgs = args;
        if (content && content.trim().startsWith('{')) {
            try {
                const contentArgs = JSON.parse(content);
                finalArgs = { ...finalArgs, ...contentArgs };
            }
            catch (_e) {
                // Ignore if not valid JSON
            }
        }
        try {
            const result = await this.client.callTool({
                name: this.name,
                arguments: finalArgs,
            });
            // Format result
            if (result.content && Array.isArray(result.content)) {
                return result.content.map((c) => c.text || '').join('\n');
            }
            return JSON.stringify(result);
        }
        catch (e) {
            return `MCP Tool Error: ${e.message}`;
        }
    }
}
exports.MCPToolAdapter = MCPToolAdapter;
//# sourceMappingURL=MCPToolAdapter.js.map