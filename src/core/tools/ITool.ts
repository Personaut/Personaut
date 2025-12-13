export interface ToolCall {
  tool: string;
  args: any;
  content?: string;
}

export interface ITool {
  name: string;
  description: string;

  // Returns the XML format description for the system prompt
  getUsageExample(): string;

  execute(args: any, content?: string): Promise<string>;
}
