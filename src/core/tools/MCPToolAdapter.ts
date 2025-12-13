import { ITool } from './ITool';

export class MCPToolAdapter implements ITool {
  constructor(
    private mcpTool: any,
    private client: any
  ) {}

  get name() {
    return this.mcpTool.name;
  }
  get description() {
    return this.mcpTool.description || '';
  }

  getUsageExample(): string {
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

  async execute(args: any, content?: string): Promise<string> {
    // If content is provided, it might be the JSON body if the regex parsed it that way
    // But our regex currently parses attributes or content.
    // For MCP, we might need to parse the content as JSON if it's complex.

    let finalArgs = args;
    if (content && content.trim().startsWith('{')) {
      try {
        const contentArgs = JSON.parse(content);
        finalArgs = { ...finalArgs, ...contentArgs };
      } catch (_e) {
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
        return result.content.map((c: any) => c.text || '').join('\n');
      }
      return JSON.stringify(result);
    } catch (e: any) {
      return `MCP Tool Error: ${e.message}`;
    }
  }
}
