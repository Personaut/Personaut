"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsTab = void 0;
const react_1 = __importStar(require("react"));
const defaultSettings = {
    apiProvider: 'nativeIde',
    geminiApiKey: '',
    geminiModel: 'gemini-2.5-flash',
    openaiApiKey: '',
    awsAccessKey: '',
    awsSecretKey: '',
    awsRegion: 'us-east-1',
    awsSessionToken: '',
    bedrockModel: 'anthropic.claude-sonnet-4-20250514-v1:0',
    bedrockUseVpcEndpoint: false,
    bedrockVpcEndpoint: '',
    bedrockCrossRegionInference: false,
    bedrockUseAwsProfile: false,
    awsProfile: 'default',
    artifacts: {
        generateBackstories: true,
        generateFeedback: true,
        saveToWorkspace: false,
        outputFormat: 'markdown',
    },
    rateLimit: 100000, // Default 100k tokens
    rateLimitWarningThreshold: 80, // Default 80%
};
const SettingsTab = ({ vscode }) => {
    const [settings, setSettings] = (0, react_1.useState)(defaultSettings);
    const [activeSection, setActiveSection] = (0, react_1.useState)('general');
    const [saveStatus, setSaveStatus] = (0, react_1.useState)('idle');
    const [appName, setAppName] = (0, react_1.useState)('');
    const [showClearDataConfirm, setShowClearDataConfirm] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        // Request current settings from extension
        vscode.postMessage({ type: 'get-settings' });
    }, []);
    (0, react_1.useEffect)(() => {
        const handleMessage = (event) => {
            const message = event.data;
            if (message.type === 'settings-loaded') {
                setSettings({ ...defaultSettings, ...message.settings });
                if (message.appName) {
                    setAppName(message.appName);
                }
            }
            else if (message.type === 'settings-saved') {
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 2000);
            }
            else if (message.type === 'data-reset-complete') {
                setSaveStatus('saved');
                // The backend calls _handleGetSettings after reset, so we'll get 'settings-loaded' shortly after.
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);
    const handleSave = () => {
        setSaveStatus('saving');
        vscode.postMessage({ type: 'save-settings', settings });
    };
    const updateSetting = (key, value) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };
    const updateArtifactSetting = (key, value) => {
        setSettings((prev) => ({
            ...prev,
            artifacts: { ...prev.artifacts, [key]: value },
        }));
    };
    const sections = [
        {
            id: 'general',
            label: 'General',
            icon: (react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" },
                react_1.default.createElement("circle", { cx: "12", cy: "12", r: "3" }),
                react_1.default.createElement("path", { d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2-2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" }))),
        },
        {
            id: 'provider',
            label: 'API Provider',
            icon: (react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" },
                react_1.default.createElement("path", { d: "M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" }))),
        },
        {
            id: 'artifacts',
            label: 'Artifacts',
            icon: (react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" },
                react_1.default.createElement("path", { d: "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" }),
                react_1.default.createElement("path", { d: "m3.3 7 8.7 5 8.7-5M12 22V12" }))),
        },
        {
            id: 'data',
            label: 'Data',
            icon: (react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" },
                react_1.default.createElement("path", { d: "M21 12V7H5a2 2 0 0 1 0-4h14v4" }),
                react_1.default.createElement("path", { d: "M3 5v14a2 2 0 0 0 2 2h16v-5" }),
                react_1.default.createElement("path", { d: "M18 12a2 2 0 0 0 0 4h4v-4Z" }))),
        },
        {
            id: 'about',
            label: 'About',
            icon: (react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" },
                react_1.default.createElement("circle", { cx: "12", cy: "12", r: "10" }),
                react_1.default.createElement("path", { d: "M12 16v-4M12 8h.01" }))),
        },
    ];
    return (react_1.default.createElement("div", { className: "flex flex-col h-full bg-primary" },
        react_1.default.createElement("div", { className: "flex items-center justify-between px-4 py-3 bg-secondary border-b border-border" },
            react_1.default.createElement("h2", { className: "text-xs font-bold text-muted uppercase tracking-widest" }, "Settings"),
            activeSection !== 'about' && (react_1.default.createElement("button", { onClick: handleSave, disabled: saveStatus === 'saving', className: "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-accent text-accent-text rounded-md hover:bg-accent-hover disabled:opacity-50 transition-colors" }, saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? '✓ Saved' : 'Save'))),
        react_1.default.createElement("div", { className: "flex flex-1 overflow-hidden" },
            react_1.default.createElement("div", { className: "w-1/3 border-r border-border p-2" }, sections.map((section) => (react_1.default.createElement("button", { key: section.id, onClick: () => setActiveSection(section.id), className: `w-full text-left px-3 py-2.5 rounded-lg mb-1 text-sm transition-all flex items-center gap-2 ${activeSection === section.id
                    ? 'bg-accent-dim text-accent border border-accent/30'
                    : 'text-secondary hover:text-white hover:bg-tertiary'}` },
                section.icon,
                react_1.default.createElement("span", null, section.label))))),
            react_1.default.createElement("div", { className: "flex-1 overflow-y-auto p-4" },
                activeSection === 'general' && (react_1.default.createElement("div", { className: "space-y-6" },
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("h3", { className: "text-sm font-semibold text-primary mb-4" }, "General Settings"),
                        react_1.default.createElement("p", { className: "text-xs text-muted mb-6" }, "General configuration for Personaut."),
                        react_1.default.createElement("div", { className: "space-y-6" },
                            react_1.default.createElement("label", { className: "block" },
                                react_1.default.createElement("span", { className: "text-xs font-bold text-muted uppercase tracking-wider" }, "Rate Limit (Total Tokens)"),
                                react_1.default.createElement("div", { className: "mt-2 text-xs text-secondary mb-2" }, "Stop interactions if total token usage exceeds this limit. Enter 0 to disable."),
                                react_1.default.createElement("input", { type: "number", value: settings.rateLimit, onChange: (e) => updateSetting('rateLimit', parseInt(e.target.value) || 0), placeholder: "100000", className: "w-full bg-tertiary border border-border rounded-lg px-4 py-3 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent" })),
                            react_1.default.createElement("label", { className: "block" },
                                react_1.default.createElement("div", { className: "flex items-center justify-between mb-2" },
                                    react_1.default.createElement("span", { className: "text-xs font-bold text-muted uppercase tracking-wider" }, "Usage Warning Threshold"),
                                    react_1.default.createElement("span", { className: "text-xs font-mono text-accent" },
                                        settings.rateLimitWarningThreshold,
                                        "%")),
                                react_1.default.createElement("div", { className: "text-xs text-secondary mb-2" }, "Warn when token usage reaches this percentage of the limit."),
                                react_1.default.createElement("input", { type: "range", min: "1", max: "99", value: settings.rateLimitWarningThreshold, onChange: (e) => updateSetting('rateLimitWarningThreshold', parseInt(e.target.value)), className: "w-full accent-accent" })))))),
                activeSection === 'provider' && (react_1.default.createElement("div", { className: "space-y-6" },
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("h3", { className: "text-sm font-semibold text-primary mb-4" }, "API Provider"),
                        react_1.default.createElement("p", { className: "text-xs text-muted mb-4" }, "Select the AI provider to power Personaut's persona generation and feedback."),
                        react_1.default.createElement("div", { className: "space-y-2 mb-6" }, [
                            {
                                id: 'nativeIde',
                                name: `Native IDE (${appName || 'VS Code'})`,
                                desc: "Use the IDE's language model API - requires GitHub Copilot Chat",
                            },
                            {
                                id: 'gemini',
                                name: 'Google Gemini',
                                desc: "Use Google's Gemini API",
                            },
                            { id: 'openai', name: 'OpenAI', desc: "Use OpenAI's GPT models" },
                            {
                                id: 'bedrock',
                                name: 'AWS Bedrock',
                                desc: 'Use AWS Bedrock (Claude)',
                            },
                        ].map((provider) => (react_1.default.createElement("label", { key: provider.id, className: `flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all border ${settings.apiProvider === provider.id
                                ? 'bg-accent-dim border-accent/30'
                                : 'bg-secondary border-border hover:border-border/80'}` },
                            react_1.default.createElement("input", { type: "radio", name: "apiProvider", value: provider.id, checked: settings.apiProvider === provider.id, onChange: () => updateSetting('apiProvider', provider.id), className: "mt-1 accent-accent" }),
                            react_1.default.createElement("div", null,
                                react_1.default.createElement("div", { className: "text-sm font-medium text-primary" }, provider.name),
                                react_1.default.createElement("div", { className: "text-xs text-secondary" }, provider.desc)))))),
                        settings.apiProvider === 'nativeIde' && (react_1.default.createElement("div", { className: "bg-accent/10 border border-accent/30 rounded-lg p-4 mb-6" },
                            react_1.default.createElement("div", { className: "flex items-start gap-2" },
                                react_1.default.createElement("span", { className: "text-accent" }, "\u2728"),
                                react_1.default.createElement("div", null,
                                    react_1.default.createElement("div", { className: "text-sm font-medium text-accent" }, "Using Native IDE"),
                                    react_1.default.createElement("div", { className: "text-xs text-muted mt-1" }, "This mode uses the VS Code Language Model API (vscode.lm) to access AI models exposed by other extensions like GitHub Copilot Chat."),
                                    react_1.default.createElement("div", { className: "text-xs text-yellow-500 mt-2 p-2 bg-yellow-500/10 rounded" },
                                        "\u26A0\uFE0F ",
                                        react_1.default.createElement("strong", null, "Note for Kiro & Cursor users:"),
                                        " These IDEs do not expose their native AI agents to extensions. Please select a different provider (Gemini, OpenAI, or AWS Bedrock) and configure your API key."))))),
                        settings.apiProvider === 'gemini' && (react_1.default.createElement("div", { className: "space-y-4" },
                            react_1.default.createElement("label", { className: "block" },
                                react_1.default.createElement("span", { className: "text-xs font-bold text-muted uppercase tracking-wider" }, "Model"),
                                react_1.default.createElement("select", { value: settings.geminiModel, onChange: (e) => updateSetting('geminiModel', e.target.value), className: "mt-2 w-full bg-tertiary border border-border rounded-lg px-4 py-3 text-sm text-primary focus:outline-none focus:border-accent" },
                                    react_1.default.createElement("optgroup", { label: "Gemini 3 (Latest)" },
                                        react_1.default.createElement("option", { value: "gemini-3-pro-preview" }, "Gemini 3 Pro Preview (Most Powerful)")),
                                    react_1.default.createElement("optgroup", { label: "Gemini 2.5 (Recommended)" },
                                        react_1.default.createElement("option", { value: "gemini-2.5-flash" }, "Gemini 2.5 Flash (Default - Fast & Smart)"),
                                        react_1.default.createElement("option", { value: "gemini-2.5-flash-lite" }, "Gemini 2.5 Flash-Lite (Fastest & Cheapest)"),
                                        react_1.default.createElement("option", { value: "gemini-2.5-pro" }, "Gemini 2.5 Pro (Advanced Reasoning)")),
                                    react_1.default.createElement("optgroup", { label: "Gemini 2.0" },
                                        react_1.default.createElement("option", { value: "gemini-2.0-flash" }, "Gemini 2.0 Flash (Stable)")),
                                    react_1.default.createElement("optgroup", { label: "Legacy Models" },
                                        react_1.default.createElement("option", { value: "gemini-1.5-pro" }, "Gemini 1.5 Pro"),
                                        react_1.default.createElement("option", { value: "gemini-1.5-flash" }, "Gemini 1.5 Flash"))),
                                react_1.default.createElement("div", { className: "mt-2 text-xs text-secondary" },
                                    settings.geminiModel === 'gemini-3-pro-preview' && (react_1.default.createElement("span", null, "\uD83D\uDE80 Most powerful model with multimodal & reasoning")),
                                    settings.geminiModel === 'gemini-2.5-flash' && (react_1.default.createElement("span", null, "\u26A1 Best price-performance - smart, fast, affordable")),
                                    settings.geminiModel === 'gemini-2.5-flash-lite' && (react_1.default.createElement("span", null, "\uD83D\uDCA8 Ultra-fast and cost-efficient")),
                                    settings.geminiModel === 'gemini-2.5-pro' && (react_1.default.createElement("span", null, "\uD83C\uDFAF State-of-the-art reasoning for complex tasks")),
                                    settings.geminiModel === 'gemini-2.0-flash' && (react_1.default.createElement("span", null, "\u2705 Stable workhorse with 1M context window")),
                                    (settings.geminiModel === 'gemini-1.5-pro' ||
                                        settings.geminiModel === 'gemini-1.5-flash') && (react_1.default.createElement("span", null, "\uD83D\uDCE6 Legacy model - consider upgrading to 2.5")))),
                            react_1.default.createElement("label", { className: "block" },
                                react_1.default.createElement("span", { className: "text-xs font-bold text-muted uppercase tracking-wider" }, "API Key"),
                                react_1.default.createElement("input", { type: "password", value: settings.geminiApiKey, onChange: (e) => updateSetting('geminiApiKey', e.target.value), placeholder: "Enter your Gemini API key", className: "mt-2 w-full bg-tertiary border border-border rounded-lg px-4 py-3 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent" })),
                            react_1.default.createElement("p", { className: "text-xs text-muted" },
                                "Get your API key from",
                                ' ',
                                react_1.default.createElement("a", { href: "https://aistudio.google.com/app/apikey", className: "text-accent hover:underline" }, "Google AI Studio")))),
                        settings.apiProvider === 'openai' && (react_1.default.createElement("div", { className: "space-y-4" },
                            react_1.default.createElement("label", { className: "block" },
                                react_1.default.createElement("span", { className: "text-xs font-bold text-muted uppercase tracking-wider" }, "API Key"),
                                react_1.default.createElement("input", { type: "password", value: settings.openaiApiKey, onChange: (e) => updateSetting('openaiApiKey', e.target.value), placeholder: "Enter your OpenAI API key", className: "mt-2 w-full bg-tertiary border border-border rounded-lg px-4 py-3 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent" })),
                            react_1.default.createElement("p", { className: "text-xs text-muted" },
                                "Get your API key from",
                                ' ',
                                react_1.default.createElement("a", { href: "https://platform.openai.com/api-keys", className: "text-accent hover:underline" }, "OpenAI Platform")))),
                        settings.apiProvider === 'bedrock' && (react_1.default.createElement("div", { className: "space-y-4" },
                            react_1.default.createElement("label", { className: "block" },
                                react_1.default.createElement("span", { className: "text-xs font-bold text-muted uppercase tracking-wider" }, "Model"),
                                react_1.default.createElement("select", { value: settings.bedrockModel, onChange: (e) => updateSetting('bedrockModel', e.target.value), className: "mt-2 w-full bg-tertiary border border-border rounded-lg px-4 py-3 text-sm text-primary focus:outline-none focus:border-accent" },
                                    react_1.default.createElement("optgroup", { label: "Claude 4 (Latest)" },
                                        react_1.default.createElement("option", { value: "anthropic.claude-sonnet-4-20250514-v1:0" }, "Claude Sonnet 4 (Latest)"),
                                        react_1.default.createElement("option", { value: "anthropic.claude-opus-4-20250514-v1:0" }, "Claude Opus 4")),
                                    react_1.default.createElement("optgroup", { label: "Claude 3.7" },
                                        react_1.default.createElement("option", { value: "anthropic.claude-3-7-sonnet-20250219-v1:0" }, "Claude 3.7 Sonnet")),
                                    react_1.default.createElement("optgroup", { label: "Claude 3.5" },
                                        react_1.default.createElement("option", { value: "anthropic.claude-3-5-sonnet-20241022-v2:0" }, "Claude 3.5 Sonnet v2"),
                                        react_1.default.createElement("option", { value: "anthropic.claude-3-5-haiku-20241022-v1:0" }, "Claude 3.5 Haiku")),
                                    react_1.default.createElement("optgroup", { label: "Claude 3" },
                                        react_1.default.createElement("option", { value: "anthropic.claude-3-opus-20240229-v1:0" }, "Claude 3 Opus"),
                                        react_1.default.createElement("option", { value: "anthropic.claude-3-haiku-20240307-v1:0" }, "Claude 3 Haiku")),
                                    react_1.default.createElement("optgroup", { label: "Amazon Nova" },
                                        react_1.default.createElement("option", { value: "amazon.nova-premier-v1:0" }, "Amazon Nova Premier"),
                                        react_1.default.createElement("option", { value: "amazon.nova-pro-v1:0" }, "Amazon Nova Pro"),
                                        react_1.default.createElement("option", { value: "amazon.nova-lite-v1:0" }, "Amazon Nova Lite"),
                                        react_1.default.createElement("option", { value: "amazon.nova-micro-v1:0" }, "Amazon Nova Micro")),
                                    react_1.default.createElement("optgroup", { label: "Meta Llama 4" },
                                        react_1.default.createElement("option", { value: "meta.llama4-scout-17b-instruct-v1:0" }, "Llama 4 Scout 17B"),
                                        react_1.default.createElement("option", { value: "meta.llama4-maverick-17b-instruct-v1:0" }, "Llama 4 Maverick 17B")),
                                    react_1.default.createElement("optgroup", { label: "Meta Llama 3.3" },
                                        react_1.default.createElement("option", { value: "meta.llama3-3-70b-instruct-v1:0" }, "Llama 3.3 70B Instruct")),
                                    react_1.default.createElement("optgroup", { label: "Mistral" },
                                        react_1.default.createElement("option", { value: "mistral.mistral-large-2411-v1:0" }, "Mistral Large (24.11)"),
                                        react_1.default.createElement("option", { value: "mistral.pixtral-large-2502-v1:0" }, "Pixtral Large (25.02)")),
                                    react_1.default.createElement("optgroup", { label: "DeepSeek" },
                                        react_1.default.createElement("option", { value: "deepseek.r1-v1:0" }, "DeepSeek R1")))),
                            react_1.default.createElement("label", { className: "block" },
                                react_1.default.createElement("span", { className: "text-xs font-bold text-muted uppercase tracking-wider" }, "Region"),
                                react_1.default.createElement("select", { value: settings.awsRegion, onChange: (e) => updateSetting('awsRegion', e.target.value), className: "mt-2 w-full bg-tertiary border border-border rounded-lg px-4 py-3 text-sm text-primary focus:outline-none focus:border-accent" },
                                    react_1.default.createElement("option", { value: "us-east-1" }, "US East (N. Virginia)"),
                                    react_1.default.createElement("option", { value: "us-east-2" }, "US East (Ohio)"),
                                    react_1.default.createElement("option", { value: "us-west-2" }, "US West (Oregon)"),
                                    react_1.default.createElement("option", { value: "eu-west-1" }, "Europe (Ireland)"),
                                    react_1.default.createElement("option", { value: "eu-west-2" }, "Europe (London)"),
                                    react_1.default.createElement("option", { value: "eu-west-3" }, "Europe (Paris)"),
                                    react_1.default.createElement("option", { value: "eu-central-1" }, "Europe (Frankfurt)"),
                                    react_1.default.createElement("option", { value: "ap-south-1" }, "Asia Pacific (Mumbai)"),
                                    react_1.default.createElement("option", { value: "ap-northeast-1" }, "Asia Pacific (Tokyo)"),
                                    react_1.default.createElement("option", { value: "ap-northeast-2" }, "Asia Pacific (Seoul)"),
                                    react_1.default.createElement("option", { value: "ap-southeast-1" }, "Asia Pacific (Singapore)"),
                                    react_1.default.createElement("option", { value: "ap-southeast-2" }, "Asia Pacific (Sydney)"))),
                            react_1.default.createElement("label", { className: "flex items-center justify-between p-3 bg-secondary border border-border rounded-lg cursor-pointer hover:border-muted transition-all" },
                                react_1.default.createElement("div", null,
                                    react_1.default.createElement("div", { className: "text-sm font-medium text-primary" }, "Cross-Region Inference"),
                                    react_1.default.createElement("div", { className: "text-xs text-muted" }, "Route requests to other regions if capacity is limited")),
                                react_1.default.createElement("input", { type: "checkbox", checked: settings.bedrockCrossRegionInference, onChange: (e) => updateSetting('bedrockCrossRegionInference', e.target.checked), className: "w-5 h-5 accent-accent rounded" })),
                            react_1.default.createElement("label", { className: "flex items-center justify-between p-3 bg-secondary border border-border rounded-lg cursor-pointer hover:border-muted transition-all" },
                                react_1.default.createElement("div", null,
                                    react_1.default.createElement("div", { className: "text-sm font-medium text-primary" }, "Use AWS Profile"),
                                    react_1.default.createElement("div", { className: "text-xs text-muted" }, "Use credentials from ~/.aws/credentials")),
                                react_1.default.createElement("input", { type: "checkbox", checked: settings.bedrockUseAwsProfile, onChange: (e) => updateSetting('bedrockUseAwsProfile', e.target.checked), className: "w-5 h-5 accent-accent rounded" })),
                            settings.bedrockUseAwsProfile ? (react_1.default.createElement("label", { className: "block" },
                                react_1.default.createElement("span", { className: "text-xs font-bold text-muted uppercase tracking-wider" }, "AWS Profile Name"),
                                react_1.default.createElement("input", { type: "text", value: settings.awsProfile, onChange: (e) => updateSetting('awsProfile', e.target.value), placeholder: "default", className: "mt-2 w-full bg-tertiary border border-border rounded-lg px-4 py-3 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent" }))) : (react_1.default.createElement(react_1.default.Fragment, null,
                                react_1.default.createElement("label", { className: "block" },
                                    react_1.default.createElement("span", { className: "text-xs font-bold text-muted uppercase tracking-wider" }, "AWS Access Key"),
                                    react_1.default.createElement("input", { type: "password", value: settings.awsAccessKey, onChange: (e) => updateSetting('awsAccessKey', e.target.value), placeholder: "AKIA...", className: "mt-2 w-full bg-tertiary border border-border rounded-lg px-4 py-3 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent" })),
                                react_1.default.createElement("label", { className: "block" },
                                    react_1.default.createElement("span", { className: "text-xs font-bold text-muted uppercase tracking-wider" }, "AWS Secret Key"),
                                    react_1.default.createElement("input", { type: "password", value: settings.awsSecretKey, onChange: (e) => updateSetting('awsSecretKey', e.target.value), placeholder: "Enter your secret key", className: "mt-2 w-full bg-tertiary border border-border rounded-lg px-4 py-3 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent" })),
                                react_1.default.createElement("label", { className: "block" },
                                    react_1.default.createElement("span", { className: "text-xs font-bold text-muted uppercase tracking-wider" },
                                        "Session Token ",
                                        react_1.default.createElement("span", { className: "text-muted font-normal" }, "(optional)")),
                                    react_1.default.createElement("input", { type: "password", value: settings.awsSessionToken, onChange: (e) => updateSetting('awsSessionToken', e.target.value), placeholder: "For temporary credentials (STS)", className: "mt-2 w-full bg-tertiary border border-border rounded-lg px-4 py-3 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent" })))),
                            react_1.default.createElement("label", { className: "flex items-center justify-between p-3 bg-secondary border border-border rounded-lg cursor-pointer hover:border-muted transition-all" },
                                react_1.default.createElement("div", null,
                                    react_1.default.createElement("div", { className: "text-sm font-medium text-primary" }, "Use VPC Endpoint"),
                                    react_1.default.createElement("div", { className: "text-xs text-muted" }, "Connect to Bedrock through a VPC endpoint")),
                                react_1.default.createElement("input", { type: "checkbox", checked: settings.bedrockUseVpcEndpoint, onChange: (e) => updateSetting('bedrockUseVpcEndpoint', e.target.checked), className: "w-5 h-5 accent-accent rounded" })),
                            settings.bedrockUseVpcEndpoint && (react_1.default.createElement("label", { className: "block" },
                                react_1.default.createElement("span", { className: "text-xs font-bold text-muted uppercase tracking-wider" }, "VPC Endpoint URL"),
                                react_1.default.createElement("input", { type: "text", value: settings.bedrockVpcEndpoint, onChange: (e) => updateSetting('bedrockVpcEndpoint', e.target.value), placeholder: "https://vpce-xxx.bedrock-runtime.us-east-1.vpce.amazonaws.com", className: "mt-2 w-full bg-tertiary border border-border rounded-lg px-4 py-3 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent" }))),
                            react_1.default.createElement("p", { className: "text-xs text-secondary mt-4" },
                                "Ensure you have Bedrock model access enabled in your AWS account.",
                                ' ',
                                react_1.default.createElement("a", { href: "https://console.aws.amazon.com/bedrock/home#/modelaccess", className: "text-accent hover:underline" }, "Manage Model Access"))))))),
                activeSection === 'artifacts' && (react_1.default.createElement("div", { className: "space-y-6" },
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("h3", { className: "text-sm font-semibold text-primary mb-4" }, "Artifact Generation"),
                        react_1.default.createElement("p", { className: "text-xs text-muted mb-4" }, "Configure what artifacts Personaut generates when analyzing your product."),
                        react_1.default.createElement("div", { className: "space-y-4" },
                            react_1.default.createElement("label", { className: "flex items-center justify-between p-3 bg-secondary border border-border rounded-lg cursor-pointer hover:border-muted transition-all" },
                                react_1.default.createElement("div", null,
                                    react_1.default.createElement("div", { className: "text-sm font-medium text-primary" }, "Generate Backstories"),
                                    react_1.default.createElement("div", { className: "text-xs text-muted" }, "Create detailed backstories for each persona")),
                                react_1.default.createElement("input", { type: "checkbox", checked: settings.artifacts.generateBackstories, onChange: (e) => updateArtifactSetting('generateBackstories', e.target.checked), className: "w-5 h-5 accent-accent rounded" })),
                            react_1.default.createElement("label", { className: "flex items-center justify-between p-3 bg-secondary border border-border rounded-lg cursor-pointer hover:border-muted transition-all" },
                                react_1.default.createElement("div", null,
                                    react_1.default.createElement("div", { className: "text-sm font-medium text-primary" }, "Generate Feedback"),
                                    react_1.default.createElement("div", { className: "text-xs text-muted" }, "Auto-generate persona feedback on features")),
                                react_1.default.createElement("input", { type: "checkbox", checked: settings.artifacts.generateFeedback, onChange: (e) => updateArtifactSetting('generateFeedback', e.target.checked), className: "w-5 h-5 accent-accent rounded" })),
                            react_1.default.createElement("label", { className: "flex items-center justify-between p-3 bg-secondary border border-border rounded-lg cursor-pointer hover:border-muted transition-all" },
                                react_1.default.createElement("div", null,
                                    react_1.default.createElement("div", { className: "text-sm font-medium text-primary" }, "Save to Workspace"),
                                    react_1.default.createElement("div", { className: "text-xs text-muted" }, "Save generated artifacts as files in your project")),
                                react_1.default.createElement("input", { type: "checkbox", checked: settings.artifacts.saveToWorkspace, onChange: (e) => updateArtifactSetting('saveToWorkspace', e.target.checked), className: "w-5 h-5 accent-accent rounded" }))),
                        react_1.default.createElement("div", { className: "mt-6" },
                            react_1.default.createElement("label", { className: "block" },
                                react_1.default.createElement("span", { className: "text-xs font-bold text-muted uppercase tracking-wider" }, "Output Format"),
                                react_1.default.createElement("select", { value: settings.artifacts.outputFormat, onChange: (e) => updateArtifactSetting('outputFormat', e.target.value), className: "mt-2 w-full bg-tertiary border border-border rounded-lg px-4 py-3 text-sm text-primary focus:outline-none focus:border-accent" },
                                    react_1.default.createElement("option", { value: "markdown" }, "Markdown"),
                                    react_1.default.createElement("option", { value: "json" }, "JSON"))))))),
                activeSection === 'data' && (react_1.default.createElement("div", { className: "space-y-6" },
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("h3", { className: "text-sm font-semibold text-primary mb-4" }, "Data Management"),
                        react_1.default.createElement("p", { className: "text-xs text-muted mb-4" }, "Manage your stored data, including personas, history, and settings."),
                        react_1.default.createElement("div", { className: "p-4 rounded-lg border border-red-900/30 bg-red-900/10" },
                            react_1.default.createElement("h4", { className: "text-sm font-medium text-red-400 mb-2" }, "Reset Extension Data"),
                            react_1.default.createElement("p", { className: "text-xs text-secondary mb-4" },
                                "This will clear all saved ",
                                react_1.default.createElement("strong", { className: "text-red-400" }, "personas"),
                                ",",
                                ' ',
                                react_1.default.createElement("strong", { className: "text-red-400" }, "feedback history"),
                                ", and",
                                ' ',
                                react_1.default.createElement("strong", { className: "text-red-400" }, "extension settings"),
                                ". This action cannot be undone."),
                            react_1.default.createElement("button", { onClick: () => {
                                    console.log('[SettingsTab] Clear All Data button clicked');
                                    setShowClearDataConfirm(true);
                                }, className: "px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors shadow-sm" }, "Clear All Data"))))),
                showClearDataConfirm && (react_1.default.createElement("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-[2px] animate-fadeIn" },
                    react_1.default.createElement("div", { className: "relative w-full max-w-sm bg-primary border border-red-500/20 rounded-2xl shadow-2xl overflow-hidden transform transition-all" },
                        react_1.default.createElement("div", { className: "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-600" }),
                        react_1.default.createElement("div", { className: "p-6" },
                            react_1.default.createElement("div", { className: "flex flex-col items-center text-center" },
                                react_1.default.createElement("div", { className: "flex items-center justify-center w-14 h-14 mb-4 rounded-full bg-red-500/10 text-red-500 ring-1 ring-red-500/20 shadow-[0_0_15px_-3px_rgba(239,68,68,0.2)]" },
                                    react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "28", height: "28", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                                        react_1.default.createElement("path", { d: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" }),
                                        react_1.default.createElement("line", { x1: "12", y1: "9", x2: "12", y2: "13" }),
                                        react_1.default.createElement("line", { x1: "12", y1: "17", x2: "12.01", y2: "17" }))),
                                react_1.default.createElement("h3", { className: "text-lg font-bold text-primary mb-2" }, "Clear all data?"),
                                react_1.default.createElement("p", { className: "text-sm text-secondary mb-6 leading-relaxed" },
                                    "This will permanently delete all your",
                                    ' ',
                                    react_1.default.createElement("strong", { className: "text-red-400 font-medium" }, "personas"),
                                    ",",
                                    ' ',
                                    react_1.default.createElement("strong", { className: "text-red-400 font-medium" }, "feedback"),
                                    ", and",
                                    ' ',
                                    react_1.default.createElement("strong", { className: "text-red-400 font-medium" }, "settings"),
                                    ".",
                                    react_1.default.createElement("br", null),
                                    "This action cannot be undone."),
                                react_1.default.createElement("div", { className: "grid grid-cols-2 gap-3 w-full" },
                                    react_1.default.createElement("button", { onClick: () => setShowClearDataConfirm(false), className: "col-span-1 px-4 py-2.5 text-sm font-semibold text-secondary bg-tertiary hover:bg-secondary border border-border rounded-lg transition-all duration-200" }, "Cancel"),
                                    react_1.default.createElement("button", { onClick: () => {
                                            console.log('[SettingsTab] User confirmed, sending reset-all-data message');
                                            vscode.postMessage({ type: 'reset-all-data' });
                                            setShowClearDataConfirm(false);
                                        }, className: "col-span-1 px-4 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-lg shadow-red-900/20 transition-all duration-200" }, "Delete All"))))))),
                activeSection === 'about' && (react_1.default.createElement("div", { className: "space-y-6" },
                    react_1.default.createElement("div", { className: "text-center py-6" },
                        react_1.default.createElement("div", { className: "w-16 h-16 mx-auto mb-4 rounded-xl border border-border bg-secondary flex items-center justify-center" },
                            react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "28", height: "28", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", className: "text-accent" },
                                react_1.default.createElement("path", { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }),
                                react_1.default.createElement("circle", { cx: "9", cy: "7", r: "4" }),
                                react_1.default.createElement("path", { d: "M23 21v-2a4 4 0 0 0-3-3.87" }),
                                react_1.default.createElement("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" }))),
                        react_1.default.createElement("h3", { className: "text-xl font-bold text-primary mb-2" }, "Personaut"),
                        react_1.default.createElement("p", { className: "text-sm text-muted" }, "Version 0.0.1")),
                    react_1.default.createElement("div", { className: "bg-secondary border border-border rounded-lg p-4" },
                        react_1.default.createElement("h4", { className: "text-sm font-semibold text-primary mb-2" }, "About"),
                        react_1.default.createElement("p", { className: "text-xs text-secondary leading-relaxed" }, "Personaut helps you build products for real people, not imaginary users. Create detailed customer personas with dynamic demographics, and get AI-powered feedback from their perspective.")),
                    react_1.default.createElement("div", { className: "bg-secondary border border-border rounded-lg p-4" },
                        react_1.default.createElement("h4", { className: "text-sm font-semibold text-primary mb-2" }, "Features"),
                        react_1.default.createElement("ul", { className: "text-xs text-secondary space-y-2" },
                            react_1.default.createElement("li", { className: "flex items-start gap-2" },
                                react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "text-accent mt-0.5 flex-shrink-0" },
                                    react_1.default.createElement("polyline", { points: "20 6 9 17 4 12" })),
                                react_1.default.createElement("span", null, "Create unlimited customer personas with custom attributes")),
                            react_1.default.createElement("li", { className: "flex items-start gap-2" },
                                react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "text-accent mt-0.5 flex-shrink-0" },
                                    react_1.default.createElement("polyline", { points: "20 6 9 17 4 12" })),
                                react_1.default.createElement("span", null, "Generate detailed backstories for each persona")),
                            react_1.default.createElement("li", { className: "flex items-start gap-2" },
                                react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "text-accent mt-0.5 flex-shrink-0" },
                                    react_1.default.createElement("polyline", { points: "20 6 9 17 4 12" })),
                                react_1.default.createElement("span", null, "Get AI feedback from your personas' perspectives")),
                            react_1.default.createElement("li", { className: "flex items-start gap-2" },
                                react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "text-accent mt-0.5 flex-shrink-0" },
                                    react_1.default.createElement("polyline", { points: "20 6 9 17 4 12" })),
                                react_1.default.createElement("span", null, "Integrate with multiple AI providers")))),
                    react_1.default.createElement("div", { className: "bg-secondary border border-border rounded-lg p-4" },
                        react_1.default.createElement("h4", { className: "text-sm font-semibold text-primary mb-2" }, "Links"),
                        react_1.default.createElement("div", { className: "space-y-2" },
                            react_1.default.createElement("a", { href: "#", className: "flex items-center gap-2 text-xs text-secondary hover:text-accent transition-colors" },
                                react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" },
                                    react_1.default.createElement("path", { d: "M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" })),
                                "GitHub Repository"),
                            react_1.default.createElement("a", { href: "#", className: "flex items-center gap-2 text-xs text-secondary hover:text-accent transition-colors" },
                                react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" },
                                    react_1.default.createElement("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
                                    react_1.default.createElement("polyline", { points: "14 2 14 8 20 8" }),
                                    react_1.default.createElement("line", { x1: "16", y1: "13", x2: "8", y2: "13" }),
                                    react_1.default.createElement("line", { x1: "16", y1: "17", x2: "8", y2: "17" })),
                                "Documentation"),
                            react_1.default.createElement("a", { href: "#", className: "flex items-center gap-2 text-xs text-secondary hover:text-accent transition-colors" },
                                react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" },
                                    react_1.default.createElement("circle", { cx: "12", cy: "12", r: "10" }),
                                    react_1.default.createElement("path", { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" }),
                                    react_1.default.createElement("line", { x1: "12", y1: "17", x2: "12.01", y2: "17" })),
                                "Report an Issue"))),
                    react_1.default.createElement("div", { className: "text-center text-xs text-muted pt-4" }, "Built by the Personaut Team")))))));
};
exports.SettingsTab = SettingsTab;
//# sourceMappingURL=SettingsTab.js.map