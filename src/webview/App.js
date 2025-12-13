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
exports.default = App;
const react_1 = __importStar(require("react"));
const UserBaseTab_1 = require("./UserBaseTab");
const SettingsTab_1 = require("./SettingsTab");
const FeedbackTab_1 = require("./FeedbackTab");
const BuildLogs_1 = require("./BuildLogs");
console.log('[Personaut] Acquiring VS Code API...');
const vscode = window.acquireVsCodeApi();
console.log('[Personaut] VS Code API acquired:', vscode);
const ModelMessageContent = ({ text }) => {
    const [expanded, setExpanded] = (0, react_1.useState)(false);
    // Robust regex to detect tool calls, handling newlines and whitespace
    const writeMatch = text.match(/<write_file[\s\S]*?path="([^"]+)"[\s\S]*?>([\s\S]*?)<\/write_file>/);
    const readMatch = text.match(/<read_file[\s\S]*?path="([^"]+)"[\s\S]*?\/>/);
    const listMatch = text.match(/<list_files[\s\S]*?path="([^"]+)"[\s\S]*?\/>/);
    const execMatch = text.match(/<execute_command>([\s\S]*?)<\/execute_command>/);
    const isToolCall = writeMatch || readMatch || listMatch || execMatch;
    if (!isToolCall) {
        return react_1.default.createElement("div", { className: "p-3 whitespace-pre-wrap font-mono text-sm leading-relaxed" }, text);
    }
    let toolName = 'Unknown Tool';
    let toolDetails = '';
    let filePath = '';
    let contentToDisplay = text;
    if (writeMatch) {
        toolName = 'Write File';
        filePath = writeMatch[1];
        toolDetails = filePath.split('/').pop() || filePath;
        // Clean up the content for display (remove the XML tags from the expanded view if desired,
        // but keeping raw text is safer for debugging. Let's just show the inner content for code)
        contentToDisplay = writeMatch[2].trim();
    }
    else if (readMatch) {
        toolName = 'Read File';
        filePath = readMatch[1];
        toolDetails = filePath.split('/').pop() || filePath;
        contentToDisplay = `(Reading file content from ${filePath}...)`;
    }
    else if (listMatch) {
        toolName = 'List Files';
        filePath = listMatch[1];
        toolDetails = filePath.split('/').pop() || filePath;
        contentToDisplay = `(Listing files in ${filePath}...)`;
    }
    else if (execMatch) {
        toolName = 'Execute Command';
        toolDetails = execMatch[1].trim();
        contentToDisplay = toolDetails;
    }
    // Extract text BEFORE the tool call to show as reasoning
    // We need to split by the *start* of the tag.
    const thoughtText = text.split(/<(write_file|read_file|list_files|execute_command)/)[0].trim();
    return (react_1.default.createElement("div", { className: "flex flex-col rounded-md overflow-hidden border border-border" },
        thoughtText && (react_1.default.createElement("div", { className: "p-3 bg-primary text-secondary text-sm whitespace-pre-wrap font-sans leading-relaxed border-b border-border" }, thoughtText)),
        react_1.default.createElement("div", { className: "bg-secondary" },
            react_1.default.createElement("div", { className: "flex items-center justify-between p-2 cursor-pointer hover:bg-tertiary transition-colors border-l-2 border-amber-500/50 hover:border-amber-500", onClick: () => setExpanded(!expanded) },
                react_1.default.createElement("div", { className: "flex items-center gap-2 text-xs font-bold text-amber-500 uppercase tracking-wider font-mono" },
                    react_1.default.createElement("span", { className: "transform transition-transform duration-200", style: { rotate: expanded ? '90deg' : '0deg' } }, "\u25B6"),
                    react_1.default.createElement("span", null, toolName)),
                react_1.default.createElement("div", { className: "text-xs text-muted truncate max-w-[200px] font-mono opacity-75" }, toolDetails)),
            expanded && (react_1.default.createElement("div", { className: "p-3 bg-black/40 border-t border-border overflow-x-auto" },
                react_1.default.createElement("pre", { className: "text-xs font-mono text-secondary whitespace-pre-wrap break-all" }, contentToDisplay))),
            filePath && toolName === 'Write File' && (react_1.default.createElement("div", { className: "p-2 border-t border-border flex justify-end bg-tertiary" },
                react_1.default.createElement("button", { onClick: () => vscode.postMessage({ type: 'open-file', value: filePath }), className: "text-xs border border-amber-500/30 text-amber-500 hover:bg-amber-500/10 hover:border-amber-500 px-3 py-1.5 rounded flex items-center gap-1.5 transition-all duration-200 font-medium" },
                    react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                        react_1.default.createElement("path", { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" }),
                        react_1.default.createElement("polyline", { points: "15 3 21 3 21 9" }),
                        react_1.default.createElement("line", { x1: "10", y1: "14", x2: "21", y2: "3" })),
                    react_1.default.createElement("span", null, "Open File")))))));
};
function App() {
    const savedState = vscode.getState();
    const [messages, setMessages] = (0, react_1.useState)(savedState?.messages || []);
    const [input, setInput] = (0, react_1.useState)(savedState?.input || '');
    const [status, setStatus] = (0, react_1.useState)('');
    const [isTyping, setIsTyping] = (0, react_1.useState)(false);
    const [contextFiles, setContextFiles] = (0, react_1.useState)(savedState?.contextFiles || []);
    const [settings, setSettings] = (0, react_1.useState)(savedState?.settings || {
        autoRead: true,
        autoWrite: true,
        autoExecute: true,
        rateLimit: 100000,
        rateLimitWarningThreshold: 80,
    });
    const [sessionId, setSessionId] = (0, react_1.useState)(savedState?.sessionId || '');
    // Mode: chat, feedback, or build
    const [mode, setMode] = (0, react_1.useState)(savedState?.mode || 'chat');
    const [feedbackUrl, _setFeedbackUrl] = (0, react_1.useState)(savedState?.feedbackUrl || '');
    const [screenshot, setScreenshot] = (0, react_1.useState)(savedState?.screenshot || null);
    const [_isCapturing, setIsCapturing] = (0, react_1.useState)(false);
    // Build mode state
    const [buildStep, setBuildStep] = (0, react_1.useState)(savedState?.buildStep || 'idea');
    const [buildData, setBuildData] = (0, react_1.useState)(savedState?.buildData || {
        team: ['UX', 'Developer'],
        idea: '',
        users: {
            demographics: {
                ageRange: '',
                incomeRange: '',
                gender: '',
                location: '',
                education: '',
                occupation: '',
            },
            description: '',
        },
        features: [],
        design: '',
    });
    const [newFeature, setNewFeature] = (0, react_1.useState)(savedState?.newFeature || '');
    const [newTeamMember, setNewTeamMember] = (0, react_1.useState)(savedState?.newTeamMember || '');
    // Personas for build mode
    const [buildPersonas, setBuildPersonas] = (0, react_1.useState)(savedState?.buildPersonas || []);
    const [selectedBuildPersonaIds, setSelectedBuildPersonaIds] = (0, react_1.useState)(savedState?.selectedBuildPersonaIds || []);
    // Users step mode: 'personas' or 'demographics'
    const [usersMode, setUsersMode] = (0, react_1.useState)(savedState?.usersMode || 'personas');
    const [generatedPersonas, setGeneratedPersonas] = (0, react_1.useState)(savedState?.generatedPersonas || []);
    const [usersLoading, setUsersLoading] = (0, react_1.useState)(false);
    // Features step mode: 'define' or 'generate'
    const [featuresMode, setFeaturesMode] = (0, react_1.useState)(savedState?.featuresMode || 'define');
    const [generatedFeatures, setGeneratedFeatures] = (0, react_1.useState)(savedState?.generatedFeatures || []);
    const [featuresLoading, setFeaturesLoading] = (0, react_1.useState)(false);
    const [draggedFeature, setDraggedFeature] = (0, react_1.useState)(null);
    // Development iteration flow order (User Feedback always last)
    const [devFlowOrder, setDevFlowOrder] = (0, react_1.useState)(savedState?.devFlowOrder || ['UX', 'Developer']);
    const [draggedFlowItem, setDraggedFlowItem] = (0, react_1.useState)(null);
    const [userStories, setUserStories] = (0, react_1.useState)(savedState?.userStories || []);
    const [storiesLoading, setStoriesLoading] = (0, react_1.useState)(false);
    const [designLoading, setDesignLoading] = (0, react_1.useState)(false);
    const [userFlows, setUserFlows] = (0, react_1.useState)(savedState?.userFlows || []);
    const [userFlowsLoading, setUserFlowsLoading] = (0, react_1.useState)(false);
    const [selectedFramework, setSelectedFramework] = (0, react_1.useState)(savedState?.selectedFramework || 'react');
    const [generatedScreens, setGeneratedScreens] = (0, react_1.useState)(savedState?.generatedScreens || []);
    const [newRequirement, setNewRequirement] = (0, react_1.useState)(savedState?.newRequirement || {});
    const [questionAnswers, setQuestionAnswers] = (0, react_1.useState)(savedState?.questionAnswers || {});
    const [iterationState, setIterationState] = (0, react_1.useState)(savedState?.iterationState || {
        active: false,
        currentScreen: 0,
        currentTeamMemberIndex: 0,
        iterationCount: 0,
        screenList: [],
        feedbackReports: [],
        lastScreenshot: null,
        waitingForUserApproval: false,
        stepComplete: false,
        autoRun: false,
        // Agent coordination defaults
        currentAgent: null,
        agentStatus: '',
        userRatings: [],
        averageRating: null,
        consolidatedFeedback: null,
        screenshotUrl: null,
        screenshotPending: false,
        screenshotError: null,
        generatedFiles: [],
    });
    // Project management state
    const [projectName, setProjectName] = (0, react_1.useState)(savedState?.projectName || '');
    const [projectTitle, setProjectTitle] = (0, react_1.useState)(savedState?.projectTitle || '');
    const [projectHistory, setProjectHistory] = (0, react_1.useState)(savedState?.projectHistory || []);
    const [showProjectHistory, setShowProjectHistory] = (0, react_1.useState)(false);
    const [completedSteps, setCompletedSteps] = (0, react_1.useState)(savedState?.completedSteps || {});
    // Project title validation state (Requirements 11.1, 11.2, 11.3, 11.5)
    const [projectTitleError, setProjectTitleError] = (0, react_1.useState)(null);
    const [sanitizedProjectName, setSanitizedProjectName] = (0, react_1.useState)('');
    const [isCheckingProjectName, setIsCheckingProjectName] = (0, react_1.useState)(false);
    // Chat Persona Selection
    const [selectedChatPersona, setSelectedChatPersona] = (0, react_1.useState)(savedState?.selectedChatPersona || {
        type: 'agent',
        id: 'default',
        name: 'Pippet',
    });
    const [view, setView] = (0, react_1.useState)(savedState?.view || 'chat');
    const [history, setHistory] = (0, react_1.useState)(savedState?.history || []);
    const [usage, setUsage] = (0, react_1.useState)(savedState?.usage || { inputTokens: 0, outputTokens: 0, totalTokens: 0 });
    // Persisted build log from file (Requirements 12.3, 13.3)
    // This stores the build log loaded from the project's build-log.json file
    const [persistedBuildLog, setPersistedBuildLog] = (0, react_1.useState)(savedState?.persistedBuildLog || null);
    // Helper function to convert persisted build log entries to UI LogEntry format
    const convertPersistedToUILogs = (log) => {
        if (!log || !log.entries || log.entries.length === 0) {
            return [];
        }
        return log.entries.map((entry) => {
            let uiType = 'info';
            if (entry.type === 'assistant') {
                uiType = 'ai';
            }
            else if (entry.type === 'error') {
                uiType = 'error';
            }
            return {
                timestamp: new Date(entry.timestamp).toLocaleTimeString(),
                message: entry.content,
                type: uiType,
                stage: entry.stage,
            };
        });
    };
    // Initialize buildLogs from persistedBuildLog if available (Requirements 13.3, 13.5)
    const [buildLogs, setBuildLogs] = (0, react_1.useState)(() => convertPersistedToUILogs(savedState?.persistedBuildLog || null));
    /**
     * Add a log entry to the build logs.
     * Supports error logs with retry capability for failed generation.
     *
     * **Validates: Requirements 5.1, 5.2**
     */
    const addBuildLog = (message, type = 'info', options) => {
        setBuildLogs((prev) => [
            ...prev,
            {
                timestamp: new Date().toLocaleTimeString(),
                message,
                type,
                stage: options?.stage,
                isRetryable: options?.isRetryable,
            },
        ]);
    };
    /**
     * Persist a build log entry to the file system via the extension.
     * Creates a BuildLogEntry object and sends it to the extension for persistence.
     *
     * **Validates: Requirements 12.1, 13.1, 13.2**
     */
    const persistBuildLogEntry = (content, entryType, stage, metadata) => {
        // Only persist if we have a valid project name
        if (!projectName) {
            console.log('[Personaut] Cannot persist build log entry: no project name');
            return;
        }
        const entry = {
            timestamp: Date.now(),
            type: entryType,
            stage,
            content,
            ...(metadata && { metadata }),
        };
        vscode.postMessage({
            type: 'append-build-log',
            projectName,
            entry,
        });
    };
    /**
     * Handle retry for failed generation.
     * Sends a message to the extension to retry generation for the specified stage.
     *
     * **Validates: Requirements 5.2, 5.3**
     */
    const handleRetryGeneration = (stage) => {
        addBuildLog(`Retrying generation for ${stage}...`, 'info');
        // Send retry message to extension
        // The extension will load partial content and resume generation
        vscode.postMessage({
            type: 'retry-generation',
            projectName,
            stage,
        });
    };
    /**
     * Build a prompt for resuming generation from partial content.
     * This creates a context-aware prompt that tells the AI to continue from where it left off.
     *
     * **Validates: Requirements 5.3**
     */
    const buildResumePrompt = (stage, partialContent, contextPrompt) => {
        let basePrompt = '';
        // Count existing items from partial content to inform the AI
        let existingCount = 0;
        if (partialContent) {
            if (stage === 'users' && partialContent.personas) {
                existingCount = partialContent.personas.length;
            }
            else if (stage === 'features' && partialContent.features) {
                existingCount = partialContent.features.length;
            }
            else if (stage === 'stories' && partialContent.stories) {
                existingCount = partialContent.stories.length;
            }
        }
        switch (stage) {
            case 'users':
                basePrompt = `Generate user personas for this product idea: "${buildData.idea}"`;
                if (buildData.users?.demographics) {
                    const demoStr = Object.entries(buildData.users.demographics)
                        .filter(([_, v]) => v)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(', ');
                    if (demoStr) {
                        basePrompt += `\nTarget Demographics: ${demoStr}`;
                    }
                }
                basePrompt += `\n\nOUTPUT FORMAT: Return ONLY a JSON code block:
\`\`\`json
[{"id": "1", "name": "Name", "age": "Age", "occupation": "Job", "backstory": "Description..."}]
\`\`\``;
                break;
            case 'features':
                basePrompt = `Generate features for this product idea: "${buildData.idea}"`;
                if (generatedPersonas.length > 0) {
                    basePrompt += `\nTarget Users: ${generatedPersonas.map((p) => p.name).join(', ')}`;
                }
                basePrompt += `\n\nOUTPUT FORMAT: Return ONLY a JSON code block:
\`\`\`json
{"features": [{"name": "Feature", "description": "Benefit", "score": 8, "frequency": "Daily", "priority": "Must-Have", "personas": ["User"]}]}
\`\`\``;
                break;
            case 'stories':
                basePrompt = `Generate user stories for this product: "${buildData.idea}"`;
                if (generatedFeatures.length > 0) {
                    basePrompt += `\nFeatures: ${generatedFeatures.map((f) => f.name).join(', ')}`;
                }
                basePrompt += `\n\nOUTPUT FORMAT: Return ONLY a JSON code block:
\`\`\`json
{"stories": [{"title": "Story", "description": "Desc", "requirements": ["Req"], "clarifyingQuestions": ["Q?"]}]}
\`\`\``;
                break;
            default:
                basePrompt = `Generate content for the ${stage} stage. Return ONLY valid JSON.`;
        }
        if (existingCount > 0) {
            basePrompt += `\n\nNOTE: ${existingCount} items already exist. Generate additional items to reach the target count.`;
        }
        return basePrompt + (contextPrompt ? '\n' + contextPrompt : '');
    };
    // Streaming state for real-time content updates (Requirements 2.1, 2.2, 2.3, 2.4)
    const [isStreaming, setIsStreaming] = (0, react_1.useState)(false);
    const [streamingStage, setStreamingStage] = (0, react_1.useState)(null);
    // Per-stage loading state for tracking loading indicators (Requirement 2.5)
    // This provides a unified way to track which stages are currently loading
    const [stageLoadingState, setStageLoadingState] = (0, react_1.useState)(savedState?.stageLoadingState || {});
    // Save state when changed
    (0, react_1.useEffect)(() => {
        vscode.setState({
            messages,
            input,
            contextFiles,
            settings,
            mode,
            feedbackUrl,
            screenshot,
            buildStep,
            buildData,
            newFeature,
            newTeamMember,
            buildPersonas,
            selectedBuildPersonaIds,
            usersMode,
            generatedPersonas,
            featuresMode,
            generatedFeatures,
            devFlowOrder,
            userStories,
            newRequirement,
            questionAnswers,
            projectName,
            projectTitle,
            projectHistory,
            completedSteps,
            selectedChatPersona,
            view,
            history,
            usage,
            iterationState,
            sessionId,
            stageLoadingState,
            persistedBuildLog,
            selectedFramework,
            generatedScreens,
        });
    }, [
        messages,
        input,
        contextFiles,
        settings,
        mode,
        feedbackUrl,
        screenshot,
        buildStep,
        buildData,
        newFeature,
        newTeamMember,
        buildPersonas,
        selectedBuildPersonaIds,
        usersMode,
        generatedPersonas,
        featuresMode,
        generatedFeatures,
        devFlowOrder,
        userStories,
        newRequirement,
        questionAnswers,
        projectName,
        projectTitle,
        projectHistory,
        completedSteps,
        selectedChatPersona,
        view,
        history,
        usage,
        iterationState,
        sessionId,
        stageLoadingState,
        persistedBuildLog,
        selectedFramework,
        generatedScreens,
    ]);
    // Session validation
    (0, react_1.useEffect)(() => {
        vscode.postMessage({ type: 'check-session', sessionId });
    }, []);
    const bottomRef = (0, react_1.useRef)(null);
    // Refs for auto-scroll during streaming (Requirements 2.4)
    const personasContainerRef = (0, react_1.useRef)(null);
    const featuresContainerRef = (0, react_1.useRef)(null);
    const storiesContainerRef = (0, react_1.useRef)(null);
    // Ref to store pending isolated request callbacks
    const pendingRequests = (0, react_1.useRef)({});
    // Helper function to send isolated AI requests (for build/feedback - no chat history accumulation)
    // Note: This function is available for future use in build/feedback modes
    const sendIsolatedRequest = (prompt, systemPrompt) => {
        return new Promise((resolve, reject) => {
            const requestId = crypto.randomUUID();
            pendingRequests.current[requestId] = (response, error) => {
                if (error) {
                    reject(new Error(error));
                }
                else {
                    resolve(response || '');
                }
            };
            vscode.postMessage({
                type: 'isolated-request',
                requestId,
                prompt,
                systemPrompt,
            });
        });
    };
    // Keep reference to avoid tree-shaking
    void sendIsolatedRequest;
    (0, react_1.useEffect)(() => {
        const handleMessage = (event) => {
            const message = event.data;
            if (message.type === 'session-invalid') {
                console.log('[Personaut] Session invalid, updating session ID but preserving project state...');
                setSessionId(message.sessionId);
                // Only reset conversation/chat state, NOT project state
                // This allows the user to continue working on their project after the webview is recreated
                setMessages([]);
                setIterationState({
                    active: false,
                    currentScreen: 0,
                    currentTeamMemberIndex: 0,
                    iterationCount: 0,
                    screenList: [],
                    feedbackReports: [],
                    lastScreenshot: null,
                    waitingForUserApproval: false,
                    stepComplete: false,
                    autoRun: false,
                    currentAgent: null,
                    agentStatus: '',
                    userRatings: [],
                    averageRating: null,
                    consolidatedFeedback: null,
                    screenshotUrl: null,
                    screenshotPending: false,
                    screenshotError: null,
                    generatedFiles: [],
                });
                // Update vscode state with new session ID but preserve other state
                const currentState = vscode.getState() || {};
                vscode.setState({ ...currentState, sessionId: message.sessionId, messages: [] });
                // If we have a project name, request the build state and build log from the extension
                // This will restore the project state from disk
                const savedProjectName = currentState.projectName;
                if (savedProjectName) {
                    console.log(`[Personaut] Restoring project state for: ${savedProjectName}`);
                    vscode.postMessage({ type: 'get-build-state', projectName: savedProjectName });
                    // Also load the build log (Requirements 12.3, 13.3)
                    vscode.postMessage({ type: 'load-build-log', projectName: savedProjectName });
                }
                return;
            }
            if (message.type === 'session-valid') {
                // Keep restored state
                return;
            }
            if (message.type === 'add-message') {
                const isBuildMessage = mode === 'build' || message.mode === 'build';
                if (isBuildMessage) {
                    let msgText = message.text;
                    let logType = 'info';
                    let persistType = 'system';
                    if (message.role === 'model') {
                        logType = 'ai';
                        persistType = 'assistant';
                    }
                    else if (message.role === 'error') {
                        logType = 'error';
                        persistType = 'error';
                    }
                    else if (message.role === 'user') {
                        msgText = `> ${msgText}`;
                        persistType = 'user';
                    }
                    addBuildLog(msgText, logType);
                    // Persist build log entry to file (Requirements 12.1, 13.1, 13.2)
                    persistBuildLogEntry(message.text, persistType, buildStep, message.metadata);
                }
                else {
                    setMessages((prev) => [...prev, { role: message.role, text: message.text }]);
                }
                setStatus('');
                // Stop typing indicator when we receive a model or error response
                if (message.role === 'model' || message.role === 'error') {
                    setIsTyping(false);
                    // Parse features/stories/personas from AI response
                    if (message.role === 'model') {
                        const text = message.text || '';
                        let jsonContent = '';
                        // Try to match code block with or without 'json' tag
                        const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
                        if (codeBlockMatch) {
                            jsonContent = codeBlockMatch[1];
                        }
                        else {
                            // Fallback: try to find a JSON array or object directly in the text
                            // Matches [...] or {...}
                            const jsonStructureMatch = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
                            if (jsonStructureMatch) {
                                jsonContent = jsonStructureMatch[0];
                            }
                        }
                        if (jsonContent) {
                            try {
                                const parsed = JSON.parse(jsonContent);
                                // Parse Features
                                if ((featuresLoading || buildStep === 'features') &&
                                    parsed.features &&
                                    Array.isArray(parsed.features)) {
                                    const features = parsed.features.map((f, idx) => ({
                                        id: String(idx + 1),
                                        name: f.name || 'Unnamed Feature',
                                        description: f.description || '',
                                        score: f.score || 5,
                                        frequency: f.frequency || 'Weekly',
                                        priority: f.priority || 'Should-Have',
                                        personas: f.personas || [],
                                    }));
                                    setGeneratedFeatures(features);
                                    setFeaturesLoading(false);
                                }
                                // Parse User Stories
                                if ((storiesLoading || buildStep === 'stories') &&
                                    parsed.stories &&
                                    Array.isArray(parsed.stories)) {
                                    const stories = parsed.stories.map((s, idx) => ({
                                        id: String(idx + 1),
                                        title: s.title || 'Untitled Story',
                                        description: s.description || '',
                                        requirements: s.requirements || [],
                                        clarifyingQuestions: s.clarifyingQuestions || [],
                                        expanded: false,
                                    }));
                                    setUserStories(stories);
                                    setStoriesLoading(false);
                                }
                                // Parse Personas
                                if (usersLoading || buildStep === 'users') {
                                    let personas = [];
                                    if (Array.isArray(parsed)) {
                                        personas = parsed;
                                    }
                                    else if (parsed.personas && Array.isArray(parsed.personas)) {
                                        personas = parsed.personas;
                                    }
                                    if (personas.length > 0) {
                                        setGeneratedPersonas(personas.map((p, idx) => ({
                                            ...p,
                                            id: p.id || String(idx + 1),
                                        })));
                                        setUsersLoading(false);
                                    }
                                }
                            }
                            catch (e) {
                                console.error('Error parsing AI response:', e);
                            }
                        }
                        // Handle design step - capture plain text response for screen generation
                        if (designLoading && buildStep === 'design') {
                            // The UX agent returns plain text, not JSON
                            // Look for numbered list format in the response
                            const text = message.text || '';
                            // Check if the response looks like a screen list (has numbered items)
                            if (text.match(/\d+\.\s+\w+/)) {
                                // Clean up the text - remove any markdown formatting
                                const cleanedText = text
                                    .replace(/^#+\s*/gm, '') // Remove markdown headers
                                    .replace(/\*\*/g, '') // Remove bold markers
                                    .trim();
                                setBuildData((prev) => ({
                                    ...prev,
                                    design: cleanedText,
                                }));
                                setDesignLoading(false);
                                addBuildLog('Screens generated successfully!', 'success');
                            }
                        }
                        // Handle Iteration Loop Responses
                        if (iterationState.active) {
                            const text = message.text || '';
                            // 1. User Feedback Parsing
                            if (iterationState.currentAgent === 'user-feedback') {
                                // Try to extract ratings JSON
                                const ratingsMatch = text.match(/```json\s*([\s\S]*?)```/);
                                if (ratingsMatch) {
                                    try {
                                        const ratingsData = JSON.parse(ratingsMatch[1]);
                                        if (ratingsData.ratings && Array.isArray(ratingsData.ratings)) {
                                            const userRatings = ratingsData.ratings.map((r) => ({
                                                personaName: r.persona || 'Unknown',
                                                rating: typeof r.rating === 'number' ? r.rating : parseInt(r.rating) || 5,
                                                feedback: r.summary || '',
                                            }));
                                            const avgRating = ratingsData.averageRating ||
                                                (userRatings.length > 0
                                                    ? userRatings.reduce((sum, r) => sum + r.rating, 0) /
                                                        userRatings.length
                                                    : null);
                                            const consolidatedFeedback = [
                                                ratingsData.topIssues?.length > 0
                                                    ? `Top Issues:\n${ratingsData.topIssues.map((i) => `• ${i}`).join('\n')}`
                                                    : '',
                                                ratingsData.quickWins?.length > 0
                                                    ? `\nQuick Wins:\n${ratingsData.quickWins.map((w) => `• ${w}`).join('\n')}`
                                                    : '',
                                                ratingsData.recommendation
                                                    ? `\nRecommendation: ${ratingsData.recommendation}`
                                                    : '',
                                            ]
                                                .filter(Boolean)
                                                .join('\n');
                                            setIterationState((prev) => ({
                                                ...prev,
                                                userRatings,
                                                averageRating: avgRating,
                                                consolidatedFeedback: consolidatedFeedback || null,
                                                agentStatus: 'User feedback complete. Awaiting your decision.',
                                            }));
                                            addBuildLog(`User feedback received. Average rating: ${avgRating?.toFixed(1)}/10`, avgRating >= 7 ? 'success' : avgRating >= 5 ? 'warning' : 'error');
                                        }
                                    }
                                    catch (e) {
                                        console.error('Error parsing feedback ratings:', e);
                                    }
                                }
                            }
                            // 2. File Generation Detection
                            {
                                const fileWriteMatches = text.matchAll(/<write_file[\s\S]*?path="([^"]+)"[\s\S]*?>([\s\S]*?)<\/write_file>/g);
                                const filesWritten = [];
                                for (const match of fileWriteMatches) {
                                    filesWritten.push({
                                        path: match[1],
                                        content: match[2],
                                    });
                                    addBuildLog(`📄 File created: ${match[1]}`, 'success');
                                }
                                if (filesWritten.length > 0) {
                                    setIterationState((prev) => ({
                                        ...prev,
                                        generatedFiles: [...prev.generatedFiles, ...filesWritten],
                                    }));
                                }
                            }
                            // 3. Coordinator Signals & Step Completion
                            if (text.includes('COORDINATOR:')) {
                                const signalMatch = text.match(/COORDINATOR:\s*([^\n]+)/);
                                if (signalMatch) {
                                    addBuildLog(`🤖 Agent Signal: ${signalMatch[1].trim()}`, 'info');
                                    // Mark step as complete ONLY on signal
                                    setIterationState((prev) => ({
                                        ...prev,
                                        stepComplete: true,
                                        agentStatus: 'Step Completed.',
                                        waitingForUserApproval: prev.currentAgent === 'user-feedback' ? true : prev.waitingForUserApproval,
                                    }));
                                }
                            }
                        }
                    }
                }
            }
            else if (message.type === 'status') {
                const isBuildMessage = mode === 'build' || message.mode === 'build';
                if (isBuildMessage) {
                    addBuildLog(message.text, 'info');
                }
                setStatus(message.text);
            }
            else if (message.type === 'add-context') {
                setContextFiles((prev) => {
                    if (prev.some((f) => f.path === message.data.path)) {
                        return prev;
                    }
                    return [...prev, message.data];
                });
            }
            else if (message.type === 'history-updated') {
                setHistory(message.history);
            }
            else if (message.type === 'load-conversation') {
                setMessages(message.messages);
                setView('chat');
            }
            else if (message.type === 'screenshot-captured') {
                setScreenshot(message.screenshot);
                setIsCapturing(false);
                // Also store in iteration state for display during user feedback
                if (iterationState.active && iterationState.screenshotPending) {
                    setIterationState((prev) => ({
                        ...prev,
                        screenshotUrl: message.screenshot,
                        screenshotPending: false,
                    }));
                    addBuildLog('Screenshot captured for user feedback', 'success');
                }
            }
            else if (message.type === 'screenshot-error') {
                setIsCapturing(false);
                const errorMsg = message.message || 'Unknown error';
                setStatus(`Screenshot failed: ${errorMsg}`);
                addBuildLog(`Screenshot capture failed: ${errorMsg}`, 'error');
                if (iterationState.active && iterationState.screenshotPending) {
                    setIterationState((prev) => ({
                        ...prev,
                        screenshotPending: false,
                        screenshotError: errorMsg, // Store error for display
                    }));
                }
            }
            else if (message.type === 'usage-update') {
                setUsage((prev) => ({
                    inputTokens: prev.inputTokens + (message.usage.inputTokens || 0),
                    outputTokens: prev.outputTokens + (message.usage.outputTokens || 0),
                    totalTokens: prev.totalTokens + (message.usage.totalTokens || 0),
                }));
            }
            else if (message.type === 'settings-loaded') {
                setSettings((prev) => ({ ...prev, ...message.settings }));
            }
            else if (message.type === 'personas-loaded') {
                setBuildPersonas(message.personas);
            }
            else if (message.type === 'project-history') {
                setProjectHistory(message.projects || []);
            }
            else if (message.type === 'project-files-status') {
                setCompletedSteps(message.status);
                // Derive currentStep from completed stages (Requirements 3.5)
                // Find the first incomplete stage, or stay on the last stage if all complete
                const stageOrder = ['idea', 'users', 'features', 'team', 'stories', 'design'];
                let derivedStep = 'idea';
                for (const stage of stageOrder) {
                    if (!message.status[stage]) {
                        derivedStep = stage;
                        break;
                    }
                    // If this stage is complete, the next stage is the current step
                    const nextIndex = stageOrder.indexOf(stage) + 1;
                    if (nextIndex < stageOrder.length) {
                        derivedStep = stageOrder[nextIndex];
                    }
                }
                setBuildStep(derivedStep);
            }
            else if (message.type === 'project-name-check') {
                // Handle project name validation response (Requirements 11.2, 11.5)
                setIsCheckingProjectName(false);
                if (message.error) {
                    setProjectTitleError(message.error);
                }
                else {
                    setProjectTitleError(null);
                }
                setSanitizedProjectName(message.sanitizedName || '');
            }
            else if (message.type === 'project-initialized') {
                // Handle project initialization response
                if (message.success) {
                    addBuildLog(`Project initialized: ${message.projectTitle || message.projectName}`, 'success');
                    console.log(`[Personaut] Project initialized: ${message.projectName}`);
                }
                else {
                    addBuildLog(`Failed to initialize project: ${message.error}`, 'error');
                    console.error(`[Personaut] Project initialization failed:`, message.error);
                }
            }
            else if (message.type === 'build-data-loaded') {
                // Handle loaded build data
                if (!message.data) {
                    return;
                }
                switch (message.dataType) {
                    case 'features':
                        const loadedFeatures = message.data.features || [];
                        setGeneratedFeatures(loadedFeatures);
                        if (loadedFeatures.length > 0) {
                            setFeaturesMode('generate');
                        }
                        break;
                    case 'personas':
                        const loadedPersonas = message.data.personas || [];
                        setGeneratedPersonas(loadedPersonas);
                        if (loadedPersonas.length > 0) {
                            setUsersMode('demographics');
                        }
                        break;
                    case 'stories':
                        setUserStories(message.data.stories || []);
                        break;
                    case 'team':
                        setBuildData((prev) => ({ ...prev, team: message.data.team || [] }));
                        break;
                    case 'state':
                        const state = message.data;
                        if (state.iterationState) {
                            setIterationState((prev) => ({ ...prev, ...state.iterationState }));
                        }
                        // Note: currentStep is no longer loaded from state file
                        // It's derived from stage files via project-files-status (Requirements 3.5)
                        break;
                }
            }
            else if (message.type === 'isolated-response') {
                // Handle isolated AI response (for build/feedback modes)
                const callback = pendingRequests.current[message.requestId];
                if (callback) {
                    callback(message.response, message.error);
                    delete pendingRequests.current[message.requestId];
                }
            }
            else if (message.type === 'stream-update') {
                // Handle real-time streaming updates (Requirements 2.1, 2.2, 2.3, 2.4)
                const { stage, updateType, data, index, complete, error } = message;
                if (complete) {
                    // Generation complete - stop streaming state (Requirement 2.5)
                    setIsStreaming(false);
                    setStreamingStage(null);
                    // Update per-stage loading state (Requirement 2.5)
                    setStageLoadingState((prev) => ({ ...prev, [stage]: false }));
                    // Stop loading indicators (Requirement 2.5)
                    // Keep backward compatibility with existing boolean states
                    if (stage === 'users') {
                        setUsersLoading(false);
                    }
                    else if (stage === 'features') {
                        setFeaturesLoading(false);
                    }
                    else if (stage === 'stories') {
                        setStoriesLoading(false);
                    }
                    // Handle error state (Requirements 5.1, 5.2)
                    if (error) {
                        // Display error message in BuildLogs with retry button
                        addBuildLog(`Generation failed for ${stage}: ${error}`, 'error', {
                            stage,
                            isRetryable: true,
                        });
                        console.error(`[Personaut] Stage ${stage} generation failed:`, error);
                    }
                    else {
                        // Log successful completion
                        console.log(`[Personaut] Stage ${stage} generation complete`);
                        // Mark stage as complete by saving with completed: true (Requirement 2.5)
                        // This ensures the checkmark appears after generation finishes
                        if (projectName) {
                            vscode.postMessage({
                                type: 'save-stage-file',
                                projectName,
                                stage,
                                data: null, // Extension will use existing data
                                completed: true,
                            });
                            // Update local completedSteps state immediately for UI responsiveness
                            setCompletedSteps((prev) => ({ ...prev, [stage]: true }));
                        }
                    }
                }
                else if (data) {
                    // Set streaming state
                    setIsStreaming(true);
                    setStreamingStage(stage);
                    // Update per-stage loading state
                    setStageLoadingState((prev) => ({ ...prev, [stage]: true }));
                    // Handle incremental updates based on content type (Requirements 2.1, 2.2, 2.3)
                    if (updateType === 'persona' && stage === 'users') {
                        // Display each persona as it's parsed (Requirement 2.2)
                        setGeneratedPersonas((prev) => {
                            const newPersona = {
                                ...data,
                                id: data.id || String(index + 1),
                            };
                            // Check if this index already exists (update) or is new (append)
                            if (index < prev.length) {
                                const updated = [...prev];
                                updated[index] = newPersona;
                                return updated;
                            }
                            return [...prev, newPersona];
                        });
                    }
                    else if (updateType === 'feature' && stage === 'features') {
                        // Display each feature as it's parsed (Requirement 2.1)
                        setGeneratedFeatures((prev) => {
                            const newFeature = {
                                id: data.id || String(index + 1),
                                name: data.name || 'Unnamed Feature',
                                description: data.description || '',
                                score: data.score || 5,
                                frequency: data.frequency || 'Weekly',
                                priority: data.priority || 'Should-Have',
                                personas: data.personas || [],
                            };
                            // Check if this index already exists (update) or is new (append)
                            if (index < prev.length) {
                                const updated = [...prev];
                                updated[index] = newFeature;
                                return updated;
                            }
                            return [...prev, newFeature];
                        });
                    }
                    else if (updateType === 'story' && stage === 'stories') {
                        // Display each story as it's parsed (Requirement 2.3)
                        setUserStories((prev) => {
                            const newStory = {
                                id: data.id || String(index + 1),
                                title: data.title || 'Untitled Story',
                                description: data.description || '',
                                requirements: data.requirements || [],
                                clarifyingQuestions: (data.clarifyingQuestions || []).map((q) => typeof q === 'string' ? { question: q, answer: '' } : q),
                                expanded: false,
                            };
                            // Check if this index already exists (update) or is new (append)
                            if (index < prev.length) {
                                const updated = [...prev];
                                updated[index] = newStory;
                                return updated;
                            }
                            return [...prev, newStory];
                        });
                    }
                    else if (updateType === 'flow' && stage === 'design') {
                        // Display each user flow as it's parsed
                        setUserFlows((prev) => {
                            const newFlow = {
                                id: data.id || String(index + 1),
                                name: data.name || 'Unnamed Flow',
                                description: data.description || '',
                                steps: data.steps || [],
                            };
                            // Check if this index already exists (update) or is new (append)
                            if (index < prev.length) {
                                const updated = [...prev];
                                updated[index] = newFlow;
                                return updated;
                            }
                            return [...prev, newFlow];
                        });
                        setUserFlowsLoading(false);
                    }
                    else if (updateType === 'screen' && stage === 'design') {
                        // Display each screen as it's parsed
                        setGeneratedScreens((prev) => {
                            const newScreen = {
                                id: data.id || String(index + 1),
                                name: data.name || 'Unnamed Screen',
                                purpose: data.purpose || data.description || '',
                                uiElements: data.uiElements || data.elements || [],
                                userActions: data.userActions || data.actions || [],
                                expanded: true,
                            };
                            // Check if this index already exists (update) or is new (append)
                            if (index < prev.length) {
                                const updated = [...prev];
                                updated[index] = newScreen;
                                return updated;
                            }
                            return [...prev, newScreen];
                        });
                        setDesignLoading(false);
                    }
                }
            }
            else if (message.type === 'stage-file-saved') {
                // Handle successful stage file save (feedback to user)
                const { stage, completed } = message;
                if (completed) {
                    addBuildLog(`Stage '${stage}' saved successfully`, 'success');
                }
                console.log(`[Personaut] Stage file ${stage} saved, completed: ${completed}`);
            }
            else if (message.type === 'stage-file-error') {
                // Handle stage file save error
                addBuildLog(`Error saving stage: ${message.error}`, 'error');
                console.error(`[Personaut] Stage file error:`, message.error);
            }
            else if (message.type === 'stage-file-loaded') {
                // Handle loaded stage file content (Requirements 4.4)
                // Populates UI state with data from completed stage files when navigating
                const { stage, data } = message;
                if (data && data.data) {
                    const stageData = data.data;
                    console.log(`[Personaut] Loading stage file content for ${stage}:`, stageData);
                    // Populate UI state based on stage type (Requirements 4.4)
                    switch (stage) {
                        case 'idea':
                            // Load idea data
                            if (stageData.idea !== undefined || stageData.name !== undefined) {
                                setBuildData((prev) => ({
                                    ...prev,
                                    idea: stageData.idea || prev.idea,
                                }));
                                if (stageData.name) {
                                    setProjectName(stageData.name);
                                }
                            }
                            // Load projectTitle from stage file if present
                            if (stageData.projectTitle) {
                                setProjectTitle(stageData.projectTitle);
                                // Also set sanitizedProjectName for existing projects
                                setSanitizedProjectName(projectName || stageData.name || '');
                            }
                            break;
                        case 'users':
                            // Load personas data (Requirements 4.4)
                            if (stageData.personas && Array.isArray(stageData.personas)) {
                                setGeneratedPersonas(stageData.personas.map((p, idx) => ({
                                    ...p,
                                    id: p.id || String(idx + 1),
                                })));
                            }
                            // Load demographics if present
                            if (stageData.demographics) {
                                setBuildData((prev) => ({
                                    ...prev,
                                    users: {
                                        ...prev.users,
                                        demographics: stageData.demographics,
                                    },
                                }));
                            }
                            break;
                        case 'features':
                            // Load features data (Requirements 4.4)
                            if (stageData.features && Array.isArray(stageData.features)) {
                                setGeneratedFeatures(stageData.features.map((f, idx) => ({
                                    id: f.id || String(idx + 1),
                                    name: f.name || 'Unnamed Feature',
                                    description: f.description || '',
                                    score: f.score || 5,
                                    frequency: f.frequency || 'Weekly',
                                    priority: f.priority || 'Should-Have',
                                    personas: f.personas || [],
                                })));
                            }
                            break;
                        case 'team':
                            // Load team data
                            if (stageData.team && Array.isArray(stageData.team)) {
                                setBuildData((prev) => ({
                                    ...prev,
                                    team: stageData.team,
                                }));
                                setDevFlowOrder(stageData.team.filter((t) => t !== 'User Feedback'));
                            }
                            break;
                        case 'stories':
                            // Load user stories data (Requirements 4.4)
                            if (stageData.stories && Array.isArray(stageData.stories)) {
                                setUserStories(stageData.stories.map((s, idx) => ({
                                    id: s.id || String(idx + 1),
                                    title: s.title || 'Untitled Story',
                                    description: s.description || '',
                                    requirements: s.requirements || [],
                                    clarifyingQuestions: (s.clarifyingQuestions || []).map((q) => typeof q === 'string' ? { question: q, answer: '' } : q),
                                    expanded: false,
                                })));
                            }
                            break;
                        case 'design':
                            // Load design data
                            if (stageData.design !== undefined) {
                                setBuildData((prev) => ({
                                    ...prev,
                                    design: stageData.design,
                                }));
                            }
                            // Load iteration state if present
                            if (stageData.iterationState) {
                                setIterationState((prev) => ({
                                    ...prev,
                                    ...stageData.iterationState,
                                }));
                            }
                            break;
                    }
                    // Mark that we've loaded content (no unsaved changes yet)
                    hasUnsavedChangesRef.current = false;
                }
                // Update completedSteps based on the stage file's completed field
                if (data && data.completed !== undefined) {
                    setCompletedSteps((prev) => ({
                        ...prev,
                        [stage]: data.completed,
                    }));
                }
            }
            else if (message.type === 'retry-ready') {
                // Handle retry ready message (Requirements 5.2, 5.3)
                // This is triggered when the user clicks retry after a failed generation
                const { stage, projectName: retryProjectName, partialContent, partialItemCount } = message;
                console.log(`[Personaut] Retry ready for stage ${stage} with ${partialItemCount || 0} partial items`);
                // Log the retry attempt
                addBuildLog(`Resuming ${stage} generation${partialItemCount ? ` from ${partialItemCount} saved items` : ''}...`, 'info');
                // Pre-populate UI with partial content if available (Requirements 5.3)
                if (partialContent) {
                    if (stage === 'users' && partialContent.personas) {
                        setGeneratedPersonas(partialContent.personas.map((p, idx) => ({
                            ...p,
                            id: p.id || String(idx + 1),
                        })));
                    }
                    else if (stage === 'features' && partialContent.features) {
                        setGeneratedFeatures(partialContent.features.map((f, idx) => ({
                            id: f.id || String(idx + 1),
                            name: f.name || 'Unnamed Feature',
                            description: f.description || '',
                            score: f.score || 5,
                            frequency: f.frequency || 'Weekly',
                            priority: f.priority || 'Should-Have',
                            personas: f.personas || [],
                        })));
                    }
                    else if (stage === 'stories' && partialContent.stories) {
                        setUserStories(partialContent.stories.map((s, idx) => ({
                            id: s.id || String(idx + 1),
                            title: s.title || 'Untitled Story',
                            description: s.description || '',
                            requirements: s.requirements || [],
                            clarifyingQuestions: (s.clarifyingQuestions || []).map((q) => typeof q === 'string' ? { question: q, answer: '' } : q),
                            expanded: false,
                        })));
                    }
                }
                // Build context prompt with partial content for AI to continue from
                let contextPrompt = '';
                if (partialContent && partialItemCount > 0) {
                    contextPrompt = `\n\nIMPORTANT: Continue from where you left off. The following ${partialItemCount} items have already been generated and saved:\n${JSON.stringify(partialContent, null, 2)}\n\nPlease generate ADDITIONAL items to complete the task. Do NOT regenerate the items shown above.`;
                }
                // Trigger the appropriate generation based on stage
                // The generation functions will use the context prompt to resume
                if (stage === 'users') {
                    setUsersLoading(true);
                    // Trigger persona generation with context
                    vscode.postMessage({
                        type: 'generate-content-streaming',
                        projectName: retryProjectName,
                        stage: 'users',
                        prompt: buildResumePrompt('users', partialContent, contextPrompt),
                        systemPrompt: 'You are a JSON API. Output ONLY valid JSON in a code block. Never include explanatory text.',
                    });
                }
                else if (stage === 'features') {
                    setFeaturesLoading(true);
                    // Trigger feature generation with context
                    vscode.postMessage({
                        type: 'generate-content-streaming',
                        projectName: retryProjectName,
                        stage: 'features',
                        prompt: buildResumePrompt('features', partialContent, contextPrompt),
                        systemPrompt: 'You are a JSON API. Output ONLY valid JSON in a code block. Never include explanatory text.',
                    });
                }
                else if (stage === 'stories') {
                    setStoriesLoading(true);
                    // Trigger story generation with context
                    vscode.postMessage({
                        type: 'generate-content-streaming',
                        projectName: retryProjectName,
                        stage: 'stories',
                        prompt: buildResumePrompt('stories', partialContent, contextPrompt),
                        systemPrompt: 'You are a JSON API. Output ONLY valid JSON in a code block. Never include explanatory text.',
                    });
                }
            }
            else if (message.type === 'build-state-loaded') {
                // Handle build state loaded message (Requirements 2.3, 3.4, 6.1, 11.4)
                // This loads projectTitle and completedStages from the master file
                const { buildState } = message;
                if (buildState) {
                    // Update projectTitle from master file (Requirements 11.4)
                    if (buildState.projectTitle) {
                        setProjectTitle(buildState.projectTitle);
                    }
                    else if (buildState.projectName) {
                        // Fallback to projectName if projectTitle not set
                        setProjectTitle(buildState.projectName);
                    }
                    // Extract completedStages from master file and update UI state (Requirements 2.3, 3.4, 6.1)
                    // This ensures the master file is the source of truth for stage completion status
                    if (buildState.stages) {
                        const stageOrder = ['idea', 'users', 'features', 'team', 'stories', 'design'];
                        const newCompletedSteps = {};
                        for (const stage of stageOrder) {
                            newCompletedSteps[stage] = buildState.stages[stage]?.completed === true;
                        }
                        setCompletedSteps(newCompletedSteps);
                        // Derive currentStep from completed stages (Requirements 3.5)
                        // Find the first incomplete stage, or stay on the last stage if all complete
                        let derivedStep = 'idea';
                        for (const stage of stageOrder) {
                            if (!newCompletedSteps[stage]) {
                                derivedStep = stage;
                                break;
                            }
                            // If this stage is complete, the next stage is the current step
                            const nextIndex = stageOrder.indexOf(stage) + 1;
                            if (nextIndex < stageOrder.length) {
                                derivedStep = stageOrder[nextIndex];
                            }
                        }
                        setBuildStep(derivedStep);
                    }
                    console.log(`[Personaut] Build state loaded: projectTitle="${buildState.projectTitle || buildState.projectName}", stages=${Object.keys(buildState.stages || {}).length}`);
                }
            }
            else if (message.type === 'build-log-loaded') {
                // Handle build log loaded message (Requirements 12.3, 13.3)
                // This loads the persisted build log from file
                const { log } = message;
                if (log) {
                    setPersistedBuildLog(log);
                    console.log(`[Personaut] Build log loaded: ${log.entries?.length || 0} entries`);
                    // Convert persisted entries to UI LogEntry format for display (Requirements 13.3, 13.5)
                    const uiLogEntries = convertPersistedToUILogs(log);
                    setBuildLogs(uiLogEntries);
                }
                else {
                    setPersistedBuildLog(null);
                    setBuildLogs([]);
                }
            }
            else if (message.type === 'build-log-appended') {
                // Build log entry was successfully appended to file
                console.log(`[Personaut] Build log entry appended for project ${message.projectName}`);
            }
            else if (message.type === 'build-log-error') {
                // Build log operation error
                console.error(`[Personaut] Build log error:`, message.error);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);
    (0, react_1.useEffect)(() => {
        // Request initial state
        vscode.postMessage({ type: 'get-settings' });
        vscode.postMessage({ type: 'get-history' });
        // Self-healing: Fix invalid waitingForUserApproval state from previous bug
        const state = vscode.getState();
        if (state?.iterationState?.active &&
            state.iterationState.currentAgent !== 'user-feedback' &&
            state.iterationState.waitingForUserApproval) {
            setIterationState((prev) => ({ ...prev, waitingForUserApproval: false }));
        }
    }, []);
    // Load projectTitle and buildLog when projectName changes (Requirements 11.4, 12.3, 13.3)
    (0, react_1.useEffect)(() => {
        if (projectName && projectName.trim().length > 0) {
            // Load build state to get projectTitle (Requirements 11.4)
            vscode.postMessage({
                type: 'get-build-state',
                projectName,
            });
            // Load build log from file (Requirements 12.3, 13.3)
            vscode.postMessage({
                type: 'load-build-log',
                projectName,
            });
            // Load all stage files to populate UI with project data (Requirements 4.4)
            // This ensures data is loaded from files, not cached in memory
            const stages = ['idea', 'users', 'features', 'team', 'stories', 'design'];
            stages.forEach((stage) => {
                vscode.postMessage({
                    type: 'load-stage-file',
                    projectName,
                    stage,
                });
            });
        }
        else {
            // Clear projectTitle and buildLog when no project is selected
            setProjectTitle('');
            setPersistedBuildLog(null);
            setBuildLogs([]);
        }
    }, [projectName]);
    (0, react_1.useEffect)(() => {
        if (view === 'chat') {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, view]);
    // Auto-scroll during streaming content updates (Requirement 2.4)
    // Scrolls to latest content when new items are added during generation
    (0, react_1.useEffect)(() => {
        if (isStreaming && streamingStage) {
            // Scroll to the appropriate container based on the streaming stage
            const scrollToBottom = (ref) => {
                if (ref.current) {
                    ref.current.scrollTo({
                        top: ref.current.scrollHeight,
                        behavior: 'smooth',
                    });
                }
            };
            if (streamingStage === 'users' && personasContainerRef.current) {
                scrollToBottom(personasContainerRef);
            }
            else if (streamingStage === 'features' && featuresContainerRef.current) {
                scrollToBottom(featuresContainerRef);
            }
            else if (streamingStage === 'stories' && storiesContainerRef.current) {
                scrollToBottom(storiesContainerRef);
            }
        }
    }, [isStreaming, streamingStage, generatedPersonas, generatedFeatures, userStories]);
    // Load personas, project history, and completed stages when entering build mode
    // Requirements 1.3, 1.4: Load completed stages on mount to determine navigation state
    (0, react_1.useEffect)(() => {
        if (mode === 'build') {
            vscode.postMessage({ type: 'get-personas' });
            vscode.postMessage({ type: 'get-project-history' });
            // Request completed stages if we have a project name
            if (projectName) {
                vscode.postMessage({ type: 'check-project-files', projectName });
            }
        }
    }, [mode, projectName]);
    // Check project files when project name changes or periodically
    (0, react_1.useEffect)(() => {
        if (projectName) {
            vscode.postMessage({ type: 'check-project-files', projectName });
            // Load all build data
            vscode.postMessage({ type: 'load-build-data', projectName, dataType: 'personas' });
            vscode.postMessage({ type: 'load-build-data', projectName, dataType: 'features' });
            vscode.postMessage({ type: 'load-build-data', projectName, dataType: 'stories' });
            vscode.postMessage({ type: 'load-build-data', projectName, dataType: 'team' });
            vscode.postMessage({ type: 'load-build-data', projectName, dataType: 'state' });
        }
        else {
            setCompletedSteps({});
        }
    }, [projectName]);
    // Save Build Data: Features
    // useEffect(() => {
    //   if (projectName && generatedFeatures.length > 0) {
    //     vscode.postMessage({
    //       type: 'save-build-data',
    //       projectName,
    //       dataType: 'features',
    //       data: { features: generatedFeatures },
    //     });
    //   }
    // }, [projectName, generatedFeatures]);
    // Save Build Data: User Stories
    // useEffect(() => {
    //   if (projectName && userStories.length > 0) {
    //     vscode.postMessage({
    //       type: 'save-build-data',
    //       projectName,
    //       dataType: 'stories',
    //       data: { stories: userStories },
    //     });
    //   }
    // }, [projectName, userStories]);
    // Save Build Data: Team
    // useEffect(() => {
    //   if (projectName && buildData.team.length > 0) {
    //     vscode.postMessage({
    //       type: 'save-build-data',
    //       projectName,
    //       dataType: 'team',
    //       data: { team: buildData.team },
    //     });
    //   }
    // }, [projectName, buildData.team]);
    // Save Build Data: Personas
    // useEffect(() => {
    //   if (projectName && generatedPersonas.length > 0) {
    //     vscode.postMessage({
    //       type: 'save-build-data',
    //       projectName,
    //       dataType: 'personas',
    //       data: { personas: generatedPersonas },
    //     });
    //   }
    // }, [projectName, generatedPersonas]);
    // Save Build Data: State (Iteration only - currentStep is derived from stage files)
    // Requirements 3.5: Stage files are the source of truth for build state
    (0, react_1.useEffect)(() => {
        if (projectName) {
            vscode.postMessage({
                type: 'save-build-data',
                projectName,
                dataType: 'state',
                data: {
                    iterationState,
                    // Note: currentStep is no longer stored here - it's derived from stage files
                },
            });
        }
    }, [projectName, iterationState]);
    // Track when AI finishes typing during iteration loop
    (0, react_1.useEffect)(() => {
        let timer;
        // When typing stops and iteration loop is active, mark step as complete
        if (!isTyping && iterationState.active && !iterationState.stepComplete) {
            // Add a small delay to ensure the response is fully rendered
            timer = setTimeout(() => {
                setIterationState((prev) => ({
                    ...prev,
                    stepComplete: true,
                }));
            }, 500);
        }
        return () => {
            if (timer) {
                clearTimeout(timer);
            }
        };
    }, [isTyping, iterationState.active, iterationState.stepComplete]);
    // Auto-run effect - automatically advance to next step when step completes
    (0, react_1.useEffect)(() => {
        let timer;
        if (iterationState.active &&
            iterationState.stepComplete &&
            iterationState.autoRun &&
            !iterationState.waitingForUserApproval) {
            // Auto-advance to next team member after a delay
            timer = setTimeout(() => {
                const teamFlow = [...devFlowOrder, 'User Feedback'];
                const nextTeamMemberIndex = iterationState.currentTeamMemberIndex + 1;
                if (nextTeamMemberIndex < teamFlow.length) {
                    runIterationStep(iterationState.currentScreen, nextTeamMemberIndex, iterationState.screenList, teamFlow, iterationState.iterationCount);
                }
            }, 1500); // Wait 1.5 seconds before auto-advancing
        }
        return () => {
            if (timer) {
                clearTimeout(timer);
            }
        };
    }, [
        iterationState.active,
        iterationState.stepComplete,
        iterationState.autoRun,
        iterationState.waitingForUserApproval,
        iterationState.currentTeamMemberIndex,
        iterationState.currentScreen,
        iterationState.screenList,
        iterationState.iterationCount,
        devFlowOrder,
    ]);
    // Auto-capture screenshot when entering user feedback stage
    (0, react_1.useEffect)(() => {
        if (iterationState.active &&
            iterationState.screenshotPending &&
            iterationState.currentAgent === 'user-feedback') {
            // Attempt to capture a screenshot of the running dev server
            addBuildLog('Attempting to capture screenshot...', 'info');
            // Send screenshot capture request to the extension
            vscode.postMessage({
                type: 'capture-screenshot',
                url: 'http://localhost:3000', // Default dev server URL - the extension will try common ports if this fails
            });
        }
    }, [iterationState.active, iterationState.screenshotPending, iterationState.currentAgent]);
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!input.trim() && contextFiles.length === 0) {
            return;
        }
        // Rate Limit Check
        const limit = settings.rateLimit || 0;
        if (limit > 0 && usage.totalTokens >= limit) {
            setStatus(`Rate limit exceeded (${limit.toLocaleString()} tokens). Please increase limit in Settings.`);
            setMessages((prev) => [
                ...prev,
                {
                    role: 'error',
                    text: `Rate limit of ${limit.toLocaleString()} tokens exceeded. Interaction blocked to prevent overuse.`,
                },
            ]);
            return;
        }
        let systemInstruction = '';
        let isPersonaChat = false;
        // Inject context based on persona type
        if (selectedChatPersona.type === 'agent') {
            const pippetPrompt = "You are Pippet, an expert AI assistant specializing in Empathetic Development (Empadev). Your philosophy is to always start with the customer/user experience and work backwards to the technology. You believe in using agent-based simulated customers to gather raw feedback loops early and often. Your goal is to guide the user to build better products by giving best practice tips on gathering user input, building realistic personas, and avoiding 'building for imaginary users'. Always prioritize user needs over technical features in your advice.";
            systemInstruction = pippetPrompt;
            // Pippet still uses the coding assistant base prompt
            isPersonaChat = false;
        }
        else if (selectedChatPersona.context) {
            systemInstruction = selectedChatPersona.context;
            // User personas and team members should NOT use the coding assistant prompt
            isPersonaChat = true;
        }
        vscode.postMessage({
            type: 'user-input',
            mode: 'chat',
            value: input,
            systemInstruction: systemInstruction,
            isPersonaChat: isPersonaChat,
            contextFiles: contextFiles,
            settings: settings,
        });
        setContextFiles([]); // Clear context after sending
        setInput('');
        setIsTyping(true); // Start typing indicator
    };
    const handleAddActiveFile = () => {
        vscode.postMessage({ type: 'get-active-file' });
    };
    const handleHistoryClick = () => {
        if (view === 'history') {
            setView('chat');
        }
        else {
            vscode.postMessage({ type: 'get-history' });
            setView('history');
        }
    };
    const handleNewChat = () => {
        vscode.postMessage({ type: 'new-conversation' });
        setView('chat');
    };
    const loadConversation = (id) => {
        vscode.postMessage({ type: 'load-conversation', id });
    };
    const deleteConversation = (e, id) => {
        e.stopPropagation();
        vscode.postMessage({ type: 'delete-conversation', id });
    };
    // Helper to send build mode messages with rate limit check
    const sendBuildMessage = (value, contextFiles = []) => {
        // Rate Limit Check
        const limit = settings.rateLimit || 0;
        if (limit > 0 && usage.totalTokens >= limit) {
            setStatus(`Rate limit exceeded (${limit.toLocaleString()} tokens). Please increase limit in Settings.`);
            setMessages((prev) => [
                ...prev,
                {
                    role: 'error',
                    text: `Rate limit of ${limit.toLocaleString()} tokens exceeded. Build blocked to prevent overuse.`,
                },
            ]);
            return false;
        }
        vscode.postMessage({
            type: 'user-input',
            mode: 'build',
            value,
            contextFiles,
            settings,
        });
        return true;
    };
    // === ITERATION LOOP FUNCTIONS ===
    // Start the automated iteration loop
    const startIterationLoop = (screens) => {
        const teamFlow = [...devFlowOrder, 'User Feedback'];
        setIterationState((prev) => ({
            active: true,
            currentScreen: 0,
            currentTeamMemberIndex: 0,
            iterationCount: 1,
            screenList: screens,
            feedbackReports: [],
            lastScreenshot: null,
            waitingForUserApproval: false,
            stepComplete: false,
            autoRun: prev.autoRun, // Preserve auto-run setting
            // Agent coordination - start with UX agent
            currentAgent: 'ux',
            agentStatus: 'Preparing screen requirements...',
            userRatings: [],
            averageRating: null,
            consolidatedFeedback: null,
            screenshotUrl: null,
            screenshotPending: false,
            screenshotError: null,
            generatedFiles: [],
        }));
        // Start with first team member (usually UX) for first screen
        runIterationStep(0, 0, screens, teamFlow, 1);
    };
    // Run a single iteration step
    const runIterationStep = (screenIndex, teamMemberIndex, screens, teamFlow, iteration, previousFeedback) => {
        const currentScreen = screens[screenIndex];
        const screenSafe = currentScreen.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
        const currentTeamMember = teamFlow[teamMemberIndex];
        const isLastTeamMember = teamMemberIndex === teamFlow.length - 1;
        // Use project-specific personas if available (from users.stage.json), otherwise selected ones
        const activePersonas = generatedPersonas.length > 0
            ? generatedPersonas
            : selectedBuildPersonaIds.length > 0
                ? buildPersonas.filter((p) => selectedBuildPersonaIds.includes(p.id))
                : buildPersonas;
        const personaList = activePersonas.map((p) => p.name).join(', ');
        const personaDetails = activePersonas
            .map((p) => `- ${p.name}: ${p.backstory?.substring(0, 100) || 'Target user'}...`)
            .join('\n');
        let prompt = '';
        let agentType = 'coordinator';
        let agentStatus = '';
        if (currentTeamMember === 'User Feedback') {
            agentType = 'user-feedback';
            agentStatus = 'Collecting user feedback and ratings...';
            // Enhanced user feedback prompt with ratings
            prompt = `
🎯 USER FEEDBACK ROUND - Screen: "${currentScreen}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📸 STEP 1: Take a screenshot or describe the current state of the screen.

👥 STEP 2: Roleplay as EACH of these target users and provide feedback:
${personaDetails}

For EACH user persona, provide:

### [Persona Name]
**First Impression:** (What do you notice first?)
**Rating: X/10**
**Likes:**
- [What works well]
**Frustrations:**
- [What doesn't work]
**Confusions:**
- [What's unclear]
**Would Return:** Yes/No - [Brief reason]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 STEP 3: After all personas, output a JSON summary:
\`\`\`json
{
  "ratings": [
    {"persona": "Name", "rating": 8, "summary": "Brief feedback"},
  ],
  "averageRating": 7.5,
  "recommendation": "approve" or "iterate"
}
\`\`\`

💾 SAVE REPORT:
Create a detailed feedback report file:
<write_file path=".personaut/artifacts/${screenSafe}/iteration-${iteration}/user-feedback.md">
# User Feedback Report - ${currentScreen} (Iteration ${iteration})

## Summary
(Your summary here)

## Ratings
(Your findings here)
</write_file>

🔔 SIGNAL: When complete, say: "COORDINATOR: User feedback complete. Awaiting approval."`;
        }
        else if (currentTeamMember === 'UX' || currentTeamMember === 'UX Designer') {
            agentType = 'ux';
            agentStatus =
                iteration === 1
                    ? 'Creating initial screen requirements...'
                    : 'Updating requirements based on feedback...';
            const feedbackContext = previousFeedback
                ? `\n\n📋 PREVIOUS USER FEEDBACK TO ADDRESS:\n${previousFeedback}\n\n`
                : '';
            prompt = `
🎨 UX DESIGNER AGENT - Screen: "${currentScreen}" (Iteration ${iteration})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${feedbackContext}
You are the UX Designer agent. Prepare detailed requirements for the Developer agent.

📋 PROJECT CONTEXT:
- Product Idea: ${buildData.idea}
- Target Users: ${personaList}
- Features: ${buildData.features.join(', ') || '(See generated features)'}

📱 CURRENT SCREEN: ${currentScreen}

${iteration === 1
                ? '🆕 This is the FIRST iteration. Design this screen from scratch with mock data.'
                : '🔄 ITERATION MODE: Address the feedback above and create UPDATED requirements.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Create a detailed UX specification:

1. **Screen Layout**
   - Overall structure and organization
   - Key sections and their hierarchy

2. **UI Components**
   - List each component needed
   - Specify styling and states

3. **Content & Data**
   - Realistic mock data to display
   - Text content and labels

4. **Interactions**
   - Click/tap behaviors
   - Hover states
   - Transitions

5. **User Flow**
   - Entry points to this screen
   - Exit points / next steps

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 SAVING ARTIFACT:
Create a detailed UX specification file:
<write_file path=".personaut/artifacts/${screenSafe}/iteration-${iteration}/ux-feedback.md">
# UX Specification - ${currentScreen} (Iteration ${iteration})

(Your full specification here)
</write_file>

🔔 SIGNAL: When requirements are ready, say:
"COORDINATOR: UX requirements complete. Ready for Developer agent."`;
        }
        else if (currentTeamMember === 'Developer' || currentTeamMember === 'Dev') {
            agentType = 'developer';
            agentStatus = `Implementing screen with ${selectedFramework.toUpperCase()}...`;
            // Framework-specific guidance
            const frameworkGuidance = {
                react: `**React** - Create a component file (e.g., ${currentScreen.replace(/\s+/g, '')}.jsx)
   - Use functional components with hooks
   - Use CSS modules or styled-components for styling
   - Export the component as default`,
                nextjs: `**Next.js** - Create a page file (e.g., pages/${currentScreen.toLowerCase().replace(/\s+/g, '-')}.tsx)
   - Use Next.js conventions (getStaticProps if needed)
   - Use Tailwind CSS or CSS modules
   - Create components in components/ folder`,
                vue: `**Vue.js** - Create a component file (e.g., ${currentScreen.replace(/\s+/g, '')}.vue)
   - Use Vue 3 Composition API
   - Include <template>, <script setup>, and <style scoped>
   - Use Pinia for state if needed`,
                flutter: `**Flutter** - Create a screen widget (e.g., ${currentScreen.toLowerCase().replace(/\s+/g, '_')}_screen.dart)
   - Use StatelessWidget or StatefulWidget as appropriate
   - Use Material Design widgets
   - Keep widgets composable and reusable`,
                html: `**HTML/CSS/JS** - Create files:
   - ${currentScreen.toLowerCase().replace(/\s+/g, '-')}.html (structure)
   - ${currentScreen.toLowerCase().replace(/\s+/g, '-')}.css (styling)
   - ${currentScreen.toLowerCase().replace(/\s+/g, '-')}.js (interactivity)
   - Use modern CSS (flexbox, grid) and vanilla JS`,
            };
            prompt = `
💻 DEVELOPER AGENT - Screen: "${currentScreen}" (Iteration ${iteration})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The UX Designer has prepared requirements (see previous message).

🛠️ FRAMEWORK: **${selectedFramework.toUpperCase()}**
${frameworkGuidance[selectedFramework]}

🎯 YOUR TASK: Implement ONLY this single screen by CREATING ACTUAL FILES.

📋 IMPLEMENTATION RULES:
1. **Frontend First** - Focus on UI/UX, use mock/hardcoded data
2. **Make it Look Real** - Use realistic placeholder content
3. **No Backend** - Don't build APIs, auth, or database connections
4. **One Screen Only** - Build just "${currentScreen}"
5. **Production Quality** - Make it look polished and professional
6. **Framework Specific** - Follow ${selectedFramework} best practices

📁 CREATE FILES using this format:
<write_file path="src/components/${currentScreen.replace(/\s+/g, '')}.${selectedFramework === 'flutter' ? 'dart' : selectedFramework === 'vue' ? 'vue' : 'jsx'}">
// Your component code here
</write_file>

You MUST create at least one file. Include all necessary code (component, styles, etc).

🔔 SIGNAL: When code generation is complete, say:
"COORDINATOR: Implementation complete. Handing off to User Feedback."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔔 SIGNAL: After creating the files, say:
"COORDINATOR: Development complete for '${currentScreen}'. Ready for user feedback. Please take a screenshot."
`;
        }
        else {
            // Generic team member
            prompt = `
👤 ${currentTeamMember.toUpperCase()} TURN - Screen: ${currentScreen} (Iteration ${iteration})

You are the ${currentTeamMember} on this team. Review the current state and provide your professional input.

PROJECT CONTEXT:
- Idea: ${buildData.idea}
- Target Users: ${personaList}

When done, signal: "COORDINATOR: ${currentTeamMember} review complete. Ready for next agent."`;
        }
        // Send to chat with build mode (with rate limit check)
        if (!sendBuildMessage(prompt, [])) {
            // Rate limit exceeded, stop iteration
            setIterationState((prev) => ({ ...prev, active: false }));
            return;
        }
        setMode('chat');
        // Update state with agent tracking
        setIterationState((prev) => ({
            ...prev,
            currentTeamMemberIndex: teamMemberIndex,
            iterationCount: iteration,
            waitingForUserApproval: isLastTeamMember,
            stepComplete: false,
            currentAgent: agentType,
            agentStatus: agentStatus,
            // Reset ratings when starting new feedback round
            userRatings: isLastTeamMember ? [] : prev.userRatings,
            screenshotPending: isLastTeamMember, // Request screenshot when going to user feedback
        }));
    };
    // Continue iteration after user approval/feedback
    const continueIteration = (approved, feedback) => {
        const teamFlow = [...devFlowOrder, 'User Feedback'];
        const currentScreenName = iterationState.screenList[iterationState.currentScreen];
        if (approved) {
            // Store feedback report for this screen before moving on
            const screenReport = {
                screen: currentScreenName,
                feedback: iterationState.consolidatedFeedback || 'Approved without issues',
                averageRating: iterationState.averageRating,
                iteration: iterationState.iterationCount,
            };
            // Move to next screen
            const nextScreenIndex = iterationState.currentScreen + 1;
            if (nextScreenIndex < iterationState.screenList.length) {
                setIterationState((prev) => ({
                    ...prev,
                    currentScreen: nextScreenIndex,
                    currentTeamMemberIndex: 0,
                    iterationCount: 1,
                    waitingForUserApproval: false,
                    // Reset for new screen
                    userRatings: [],
                    averageRating: null,
                    consolidatedFeedback: null,
                    screenshotUrl: null,
                    screenshotError: null,
                    generatedFiles: [], // Reset for new screen
                    feedbackReports: [...prev.feedbackReports, screenReport],
                }));
                addBuildLog(`✅ Screen "${currentScreenName}" approved! Moving to next screen...`, 'success');
                runIterationStep(nextScreenIndex, 0, iterationState.screenList, teamFlow, 1);
            }
            else {
                // All screens done!
                addBuildLog(`🎉 All ${iterationState.screenList.length} screens completed!`, 'success');
                setIterationState((prev) => ({
                    ...prev,
                    active: false,
                    feedbackReports: [...prev.feedbackReports, screenReport],
                }));
                vscode.postMessage({
                    type: 'user-input',
                    mode: 'build',
                    value: `🎉 ALL SCREENS COMPLETE! The user experience has been built and validated through ${iterationState.screenList.length} screens. 

📊 Summary:
${iterationState.screenList.map((s) => `- ${s}: Built and approved`).join('\n')}

📁 Generated Files:
${iterationState.generatedFiles.map((f) => `- ${f.path}`).join('\n') || '(Check your src folder)'}

Next steps: 
1. Connect real APIs/backends
2. Add authentication
3. Set up database
4. Deploy!`,
                    contextFiles: [],
                    settings,
                });
            }
        }
        else {
            // Loop back to first team member with formatted feedback
            const newIteration = iterationState.iterationCount + 1;
            // Build comprehensive feedback for UX agent
            const formattedFeedback = [
                `📊 ITERATION ${iterationState.iterationCount} RESULTS:`,
                `Average Rating: ${iterationState.averageRating?.toFixed(1) || 'N/A'}/10`,
                '',
                '👥 User Ratings:',
                ...iterationState.userRatings.map((r) => `- ${r.personaName}: ${r.rating}/10 - ${r.feedback}`),
                '',
                feedback || iterationState.consolidatedFeedback || 'Address the issues identified above.',
            ].join('\n');
            addBuildLog(`🔄 Starting iteration ${newIteration} for "${currentScreenName}"...`, 'info');
            setIterationState((prev) => ({
                ...prev,
                currentTeamMemberIndex: 0,
                iterationCount: newIteration,
                waitingForUserApproval: false,
                // Reset feedback for new iteration
                userRatings: [],
                averageRating: null,
                consolidatedFeedback: null,
                screenshotUrl: null,
                screenshotError: null,
                currentAgent: 'ux', // Back to UX agent
                agentStatus: 'Updating requirements based on feedback...',
            }));
            runIterationStep(iterationState.currentScreen, 0, iterationState.screenList, teamFlow, newIteration, formattedFeedback);
        }
    };
    // Helper to determine token status color
    const getTokenStatusColor = () => {
        const limit = settings.rateLimit || 0;
        if (limit === 0) {
            return 'text-secondary';
        }
        const percent = (usage.totalTokens / limit) * 100;
        const threshold = settings.rateLimitWarningThreshold || 80;
        if (percent >= 100) {
            return 'text-red-500 font-bold';
        }
        if (percent >= threshold) {
            return 'text-amber-500 font-bold';
        }
        return 'text-secondary';
    };
    // Stage order for navigation validation (Requirements 1.4, 4.1, 4.2, 4.3)
    const STAGE_ORDER = ['idea', 'users', 'features', 'team', 'stories', 'design'];
    // Ref to track if there are unsaved changes (Requirements 4.5)
    const hasUnsavedChangesRef = (0, react_1.useRef)(false);
    // Debounce timer ref for auto-save (Requirements 4.5)
    const autoSaveTimerRef = (0, react_1.useRef)(null);
    // Auto-save debounce interval in milliseconds
    const AUTO_SAVE_DEBOUNCE_MS = 2000;
    /**
     * Get the current stage's data for saving (Requirements 4.5, 1.2, 4.2, 4.3)
     * Returns the appropriate data structure based on the current build step.
     * This is the SINGLE source of truth for stage data structure.
     */
    const getCurrentStageData = () => {
        switch (buildStep) {
            case 'idea':
                // Include projectTitle for idea stage (Requirements 11.4)
                return { idea: buildData.idea, projectTitle: projectTitle.trim() };
            case 'users':
                return usersMode === 'personas'
                    ? {
                        personas: selectedBuildPersonaIds.map((id) => buildPersonas.find((p) => p.id === id)),
                    }
                    : { personas: generatedPersonas, demographics: buildData.users.demographics };
            case 'features':
                // Return full feature objects for both modes (Requirements 4.3)
                return featuresMode === 'define'
                    ? {
                        features: buildData.features.map((name) => ({
                            name,
                            description: '',
                            score: 0,
                            frequency: '',
                            priority: '',
                            personas: [],
                        })),
                    }
                    : { features: generatedFeatures };
            case 'team':
                return { team: buildData.team, devFlowOrder };
            case 'stories':
                return { stories: userStories };
            case 'design':
                return { design: buildData.design, iterationState };
            default:
                return {};
        }
    };
    /**
     * Save the current stage data to the stage file (Requirements 4.5, 1.2, 4.2, 4.3, 7.4, 7.5, 8.2, 9.1, 9.2)
     * Called before navigation and by debounced auto-save.
     *
     * This is the SINGLE consolidated save function that:
     * - All save buttons should call with completed=true (explicit save)
     * - Auto-save should call with completed=false (but preserves completed=true for already completed stages)
     * - Updates both stage file and master file via the extension
     *
     * @param completed - true for explicit save (user clicks save), false for auto-save
     * @param overrideProjectName - optional project name override (used for idea stage initial save)
     */
    const saveCurrentStageData = async (completed = false, overrideProjectName) => {
        const effectiveProjectName = overrideProjectName || projectName;
        if (!effectiveProjectName) {
            return;
        }
        const stageData = getCurrentStageData();
        // Determine the effective completed status (Requirements 8.2, 8.5)
        // If the stage is already completed, maintain completed=true even during auto-save
        // This prevents downgrading a completed stage to incomplete during auto-save
        const isStageAlreadyCompleted = !!completedSteps[buildStep];
        const effectiveCompleted = completed || isStageAlreadyCompleted;
        // Send save request to extension
        // The extension's StageManager.writeStageFile updates both stage file and master file (Requirements 4.3)
        vscode.postMessage({
            type: 'save-stage-file',
            projectName: effectiveProjectName,
            // Include projectTitle for idea stage (Requirements 11.4)
            ...(buildStep === 'idea' && { projectTitle: projectTitle.trim() }),
            stage: buildStep,
            data: stageData,
            completed: effectiveCompleted,
        });
        // Mark as saved
        hasUnsavedChangesRef.current = false;
        // Clear any pending auto-save timer when explicitly saving
        if (completed && autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
            autoSaveTimerRef.current = null;
        }
    };
    /**
     * Handle stage navigation with save-before-navigation (Requirements 1.3, 7.2, 9.1)
     * Saves current stage data before switching to the target stage.
     *
     * - 1.3: WHEN a user navigates away from an incomplete stage THEN save with completed=false
     * - 7.2: WHEN a user navigates to a different stage THEN save current stage data before navigation
     * - 9.1: WHEN auto-save triggers THEN call save function with completed=false
     */
    const handleStageNavigation = async (targetStage) => {
        // Don't navigate if target is the same as current
        if (targetStage === buildStep) {
            return;
        }
        // Check if navigation is allowed
        if (!canNavigateTo(targetStage)) {
            return;
        }
        // Save current stage data before navigation (Requirements 1.3, 7.2)
        // Only save if there are unsaved changes (avoids unnecessary writes)
        if (projectName && hasUnsavedChangesRef.current) {
            await saveCurrentStageData(false); // completed=false for auto-save (Requirement 9.1)
        }
        // Clear any pending auto-save timer (prevents duplicate saves)
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
            autoSaveTimerRef.current = null;
        }
        // Navigate to target stage
        setBuildStep(targetStage);
        // Load stage file content for the target stage (Requirements 4.4)
        vscode.postMessage({
            type: 'load-stage-file',
            projectName,
            stage: targetStage,
        });
    };
    /**
     * Schedule a debounced auto-save (Requirements 4.5)
     * Called when stage data changes to ensure changes are persisted
     */
    const scheduleAutoSave = () => {
        // Mark that we have unsaved changes
        hasUnsavedChangesRef.current = true;
        // Clear existing timer
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }
        // Schedule new auto-save
        autoSaveTimerRef.current = setTimeout(() => {
            if (projectName && hasUnsavedChangesRef.current) {
                saveCurrentStageData(false);
            }
        }, AUTO_SAVE_DEBOUNCE_MS);
    };
    // Effect to trigger auto-save when stage data changes (Requirements 4.5)
    (0, react_1.useEffect)(() => {
        if (mode === 'build' && projectName) {
            scheduleAutoSave();
        }
        // Cleanup timer on unmount
        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
        };
    }, [
        // Dependencies: all stage data that should trigger auto-save
        buildData.idea,
        buildData.team,
        buildData.features,
        buildData.design,
        buildData.users.demographics,
        generatedPersonas,
        generatedFeatures,
        userStories,
        selectedBuildPersonaIds,
        devFlowOrder,
        iterationState,
    ]);
    // Effect to save on beforeunload (browser close/refresh) (Requirements 4.5)
    (0, react_1.useEffect)(() => {
        const handleBeforeUnload = () => {
            if (mode === 'build' && projectName && hasUnsavedChangesRef.current) {
                // Synchronously save (best effort)
                saveCurrentStageData(false);
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [mode, projectName, buildStep]);
    // Helper to determine if navigation to a stage is allowed based on stage file existence
    // Requirements 1.1, 10.1, 10.2, 10.5: Stage should be reachable if previous stage file exists
    // - 1.1: Verify previous stage has completed stage file before navigation
    // - 10.1: Prevent navigation to locked stages
    // - 10.2: Allow navigation to reachable stages
    // - 10.5: First stage is always reachable
    const canNavigateTo = (targetStage) => {
        const targetIndex = STAGE_ORDER.indexOf(targetStage);
        // First stage is always reachable
        if (targetIndex === 0) {
            return true;
        }
        // Check if previous stage is complete (has stage file)
        const previousStage = STAGE_ORDER[targetIndex - 1];
        return !!completedSteps[previousStage];
    };
    const getStageStatus = (stage) => {
        const stageIndex = STAGE_ORDER.indexOf(stage);
        const isComplete = !!completedSteps[stage];
        const isCurrent = buildStep === stage;
        // If stage is complete, show complete indicator
        if (isComplete) {
            return 'complete';
        }
        // If it's the current stage and we're loading, show in-progress
        if (isCurrent && (usersLoading || featuresLoading || storiesLoading)) {
            return 'in-progress';
        }
        // If it's the first stage, it's always reachable
        if (stageIndex === 0) {
            return 'reachable';
        }
        // If previous stage is complete, this stage is reachable
        const previousStage = STAGE_ORDER[stageIndex - 1];
        if (completedSteps[previousStage]) {
            return 'reachable';
        }
        // Otherwise, stage is locked
        return 'locked';
    };
    return (react_1.default.createElement("div", { className: "flex flex-col h-screen bg-primary text-primary font-sans selection:bg-accent-dim" },
        react_1.default.createElement("div", { className: "flex items-center justify-between px-4 py-3 bg-secondary border-b border-border shadow-sm z-10" },
            react_1.default.createElement("div", { className: "flex items-center gap-2" },
                react_1.default.createElement("img", { src: window.iconUri, alt: "Logo", className: "w-6 h-6 rounded-sm shadow-sm personaut-logo" }),
                react_1.default.createElement("span", { className: "font-bold text-primary tracking-wide text-sm" }, "Personaut AI"),
                react_1.default.createElement("div", { className: `ml-4 text-[10px] flex gap-2 font-mono items-center border-l border-border pl-3 ${getTokenStatusColor()}` },
                    react_1.default.createElement("span", { title: "Input Tokens" },
                        "In: ",
                        usage.inputTokens.toLocaleString()),
                    react_1.default.createElement("span", { title: "Output Tokens" },
                        "Out: ",
                        usage.outputTokens.toLocaleString()),
                    react_1.default.createElement("span", { title: "Total Tokens", className: `font-bold ${getTokenStatusColor()}` },
                        "Total: ",
                        usage.totalTokens.toLocaleString(),
                        settings.rateLimit &&
                            settings.rateLimit > 0 &&
                            ` / ${settings.rateLimit.toLocaleString()}`),
                    react_1.default.createElement("button", { onClick: () => {
                            setUsage({ inputTokens: 0, outputTokens: 0, totalTokens: 0 });
                            vscode.postMessage({ type: 'reset-token-usage' });
                        }, className: "ml-1 p-0.5 rounded hover:bg-tertiary text-muted hover:text-primary transition-colors", title: "Reset Token Counter", "aria-label": "Reset Token Counter" },
                        react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "10", height: "10", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                            react_1.default.createElement("path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }),
                            react_1.default.createElement("path", { d: "M3 3v5h5" }))))),
            react_1.default.createElement("div", { className: "flex items-center gap-1" },
                react_1.default.createElement("button", { onClick: handleNewChat, className: "p-1.5 rounded-md text-secondary hover:text-primary hover:bg-tertiary transition-all duration-200", title: "New Chat", "aria-label": "Start new chat" },
                    react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                        react_1.default.createElement("line", { x1: "12", y1: "5", x2: "12", y2: "19" }),
                        react_1.default.createElement("line", { x1: "5", y1: "12", x2: "19", y2: "12" }))),
                react_1.default.createElement("button", { onClick: handleHistoryClick, className: `p-1.5 rounded-md transition-all duration-200 ${view === 'history' ? 'bg-tertiary text-primary shadow-inner' : 'text-secondary hover:text-primary hover:bg-tertiary'} `, title: "History", "aria-label": "View conversation history", "aria-pressed": view === 'history' },
                    react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                        react_1.default.createElement("circle", { cx: "12", cy: "12", r: "10" }),
                        react_1.default.createElement("polyline", { points: "12 6 12 12 16 14" }))),
                react_1.default.createElement("button", { onClick: () => setView(view === 'userbase' ? 'chat' : 'userbase'), className: `p-1.5 rounded-md transition-all duration-200 ${view === 'userbase' ? 'bg-tertiary text-primary shadow-inner' : 'text-secondary hover:text-primary hover:bg-tertiary'} `, title: "User Base", "aria-label": "Manage user personas", "aria-pressed": view === 'userbase' },
                    react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                        react_1.default.createElement("path", { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }),
                        react_1.default.createElement("circle", { cx: "9", cy: "7", r: "4" }),
                        react_1.default.createElement("path", { d: "M23 21v-2a4 4 0 0 0-3-3.87" }),
                        react_1.default.createElement("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" }))),
                react_1.default.createElement("button", { onClick: () => setView(view === 'settings' ? 'chat' : 'settings'), className: `p-1.5 rounded-md transition-all duration-200 ${view === 'settings' ? 'bg-tertiary text-primary shadow-inner' : 'text-secondary hover:text-primary hover:bg-tertiary'} `, title: "Settings", "aria-label": "Open settings", "aria-pressed": view === 'settings' },
                    react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                        react_1.default.createElement("path", { d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" }),
                        react_1.default.createElement("circle", { cx: "12", cy: "12", r: "3" }))))),
        view === 'settings' ? (react_1.default.createElement(SettingsTab_1.SettingsTab, { vscode: vscode })) : view === 'history' ? (react_1.default.createElement("div", { className: "flex-1 overflow-y-auto p-4 space-y-2" },
            react_1.default.createElement("h2", { className: "text-xs font-bold text-muted uppercase tracking-widest mb-4" }, "Conversation History"),
            history.length === 0 ? (react_1.default.createElement("div", { className: "text-center text-muted mt-10 text-sm" }, "No history yet.")) : (history.map((conv) => (react_1.default.createElement("div", { key: conv.id, onClick: () => loadConversation(conv.id), className: "group flex items-center justify-between p-3 rounded-lg bg-secondary border border-border hover:border-accent/50 hover:bg-tertiary cursor-pointer transition-all" },
                react_1.default.createElement("div", { className: "flex flex-col gap-1 overflow-hidden" },
                    react_1.default.createElement("span", { className: "text-sm text-primary font-medium truncate" }, conv.title),
                    react_1.default.createElement("span", { className: "text-xs text-secondary" }, new Date(conv.timestamp).toLocaleString())),
                react_1.default.createElement("button", { onClick: (e) => deleteConversation(e, conv.id), className: "opacity-0 group-hover:opacity-100 p-1.5 text-muted hover:text-red-400 hover:bg-red-900/20 rounded transition-all", title: "Delete", "aria-label": `Delete conversation: ${conv.title}` },
                    react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                        react_1.default.createElement("polyline", { points: "3 6 5 6 21 6" }),
                        react_1.default.createElement("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }))))))))) : view === 'userbase' ? (react_1.default.createElement(UserBaseTab_1.UserBaseTab, { vscode: vscode })) : (react_1.default.createElement(react_1.default.Fragment, null,
            mode === 'feedback' ? (react_1.default.createElement("div", { className: "flex-1 overflow-y-auto" },
                react_1.default.createElement(FeedbackTab_1.FeedbackTab, { vscode: vscode }))) : mode === 'build' ? (react_1.default.createElement("div", { className: "flex flex-col h-full overflow-hidden" },
                react_1.default.createElement("div", { className: "flex-1 overflow-y-auto p-4" },
                    react_1.default.createElement("div", { className: "flex items-center justify-between mb-4" },
                        react_1.default.createElement("div", { className: "flex items-center gap-2" },
                            react_1.default.createElement("h2", { className: "text-sm font-bold text-primary uppercase tracking-widest" }, "Build Mode"),
                            (projectTitle || projectName) && (react_1.default.createElement("span", { className: "text-xs px-2 py-0.5 bg-accent/20 text-accent rounded-full font-medium" }, projectTitle ||
                                projectName
                                    .split('-')
                                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                                    .join(' ')))),
                        react_1.default.createElement("div", { className: "relative" },
                            react_1.default.createElement("button", { onClick: () => setShowProjectHistory(!showProjectHistory), className: "flex items-center gap-1 text-xs text-muted hover:text-primary transition-colors" },
                                react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
                                    react_1.default.createElement("path", { d: "M3 3v5h5" }),
                                    react_1.default.createElement("path", { d: "M3.05 13A9 9 0 1 0 6 5.3L3 8" })),
                                "Projects",
                                react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "10", height: "10", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
                                    react_1.default.createElement("polyline", { points: "6 9 12 15 18 9" }))),
                            showProjectHistory && (react_1.default.createElement("div", { className: "absolute right-0 top-6 z-50 w-48 bg-secondary border border-border rounded-lg shadow-xl overflow-hidden" },
                                react_1.default.createElement("div", { className: "p-2 border-b border-border" },
                                    react_1.default.createElement("div", { className: "text-[10px] text-muted uppercase font-bold" }, "Recent Projects")),
                                react_1.default.createElement("div", { className: "max-h-48 overflow-y-auto" }, projectHistory.length === 0 ? (react_1.default.createElement("div", { className: "p-3 text-xs text-muted text-center" }, "No projects yet")) : (projectHistory.map((proj, idx) => (react_1.default.createElement("button", { key: idx, onClick: () => {
                                        // Clear existing data before loading new project (Requirements 4.4)
                                        // This prevents stale data from previous project being displayed
                                        setGeneratedPersonas([]);
                                        setGeneratedFeatures([]);
                                        setUserStories([]);
                                        setBuildData({
                                            team: ['UX', 'Developer'],
                                            idea: '',
                                            users: {
                                                demographics: {
                                                    ageRange: '',
                                                    incomeRange: '',
                                                    gender: '',
                                                    location: '',
                                                    education: '',
                                                    occupation: '',
                                                },
                                                description: '',
                                            },
                                            features: [],
                                            design: '',
                                        });
                                        setCompletedSteps({});
                                        setBuildLogs([]);
                                        setPersistedBuildLog(null);
                                        setBuildStep('idea');
                                        // Set the new project name
                                        setProjectName(proj);
                                        setShowProjectHistory(false);
                                        // Load stage files for the selected project
                                        // This will populate the UI with data from the project's stage files
                                        const stages = [
                                            'idea',
                                            'users',
                                            'features',
                                            'team',
                                            'stories',
                                            'design',
                                        ];
                                        stages.forEach((stage) => {
                                            vscode.postMessage({
                                                type: 'load-stage-file',
                                                projectName: proj,
                                                stage,
                                            });
                                        });
                                    }, className: `w-full text-left px-3 py-2 text-xs hover:bg-tertiary transition-colors ${projectName === proj ? 'bg-accent/10 text-accent' : 'text-secondary'}` }, proj
                                    .split('-')
                                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                                    .join(' ')))))),
                                react_1.default.createElement("div", { className: "p-2 border-t border-border" },
                                    react_1.default.createElement("button", { onClick: () => {
                                            // Reset all project-related state for a fresh start
                                            setProjectName('');
                                            setProjectTitle('');
                                            setSanitizedProjectName('');
                                            setProjectTitleError(null);
                                            setBuildStep('idea');
                                            setBuildData({
                                                team: ['UX', 'Developer'],
                                                idea: '',
                                                users: {
                                                    demographics: {
                                                        ageRange: '',
                                                        incomeRange: '',
                                                        gender: '',
                                                        location: '',
                                                        education: '',
                                                        occupation: '',
                                                    },
                                                    description: '',
                                                },
                                                features: [],
                                                design: '',
                                            });
                                            setCompletedSteps({});
                                            setGeneratedPersonas([]);
                                            setGeneratedFeatures([]);
                                            setUserStories([]);
                                            setBuildLogs([]);
                                            setPersistedBuildLog(null);
                                            setShowProjectHistory(false);
                                        }, className: "w-full text-left px-3 py-1.5 text-xs text-accent hover:bg-accent/10 rounded transition-colors flex items-center gap-1" },
                                        react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "10", height: "10", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
                                            react_1.default.createElement("line", { x1: "12", y1: "5", x2: "12", y2: "19" }),
                                            react_1.default.createElement("line", { x1: "5", y1: "12", x2: "19", y2: "12" })),
                                        "New Project")))))),
                    react_1.default.createElement("div", { className: "flex gap-1 overflow-x-auto pb-3 mb-4" }, [
                        { id: 'idea', label: 'Idea', num: 1 },
                        { id: 'users', label: 'Users', num: 2 },
                        { id: 'features', label: 'Features', num: 3 },
                        { id: 'team', label: 'Team', num: 4 },
                        { id: 'stories', label: 'Stories', num: 5 },
                        { id: 'design', label: 'Design', num: 6 },
                    ].map((step) => {
                        // Use canNavigateTo() to check if navigation is allowed based on stage file existence
                        const isReachable = canNavigateTo(step.id);
                        const isCurrent = buildStep === step.id;
                        const status = getStageStatus(step.id);
                        const isDisabled = status === 'locked' && !isCurrent;
                        // Render the appropriate icon based on stage status
                        const renderStageIcon = () => {
                            switch (status) {
                                case 'complete':
                                    // Checkmark for completed stages (Requirement 4.1)
                                    return (react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round" },
                                        react_1.default.createElement("polyline", { points: "20 6 9 17 4 12" })));
                                case 'in-progress':
                                    // Spinner for in-progress stages (Requirement 4.2)
                                    return (react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "animate-spin" },
                                        react_1.default.createElement("path", { d: "M21 12a9 9 0 1 1-6.219-8.56" })));
                                case 'locked':
                                    // Lock icon for locked stages (Requirement 4.3)
                                    return (react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "10", height: "10", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                                        react_1.default.createElement("rect", { x: "3", y: "11", width: "18", height: "11", rx: "2", ry: "2" }),
                                        react_1.default.createElement("path", { d: "M7 11V7a5 5 0 0 1 10 0v4" })));
                                default:
                                    // Step number for reachable stages
                                    return step.num;
                            }
                        };
                        // Determine the background color based on status
                        const getIconBgClass = () => {
                            if (isCurrent) {
                                return 'bg-accent text-accent-text';
                            }
                            if (status === 'complete') {
                                return 'bg-green-500/20 text-green-500';
                            }
                            if (status === 'in-progress') {
                                return 'bg-amber-500/20 text-amber-500';
                            }
                            if (status === 'locked') {
                                return 'bg-tertiary text-muted';
                            }
                            return 'bg-tertiary text-muted';
                        };
                        return (react_1.default.createElement("button", { key: step.id, onClick: () => isReachable && handleStageNavigation(step.id), disabled: isDisabled, className: `flex-shrink-0 flex flex-col items-center gap-1 min-w-[60px] px-2 py-2 rounded-lg transition-all ${isCurrent
                                ? 'bg-accent/10 border border-accent/50'
                                : isDisabled
                                    ? 'opacity-40 cursor-not-allowed'
                                    : 'hover:bg-tertiary cursor-pointer'}`, title: status === 'locked' ? 'Complete previous stage to unlock' : undefined },
                            react_1.default.createElement("div", { className: `w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${getIconBgClass()}` }, renderStageIcon()),
                            react_1.default.createElement("span", { className: `text-[10px] font-medium ${isCurrent ? 'text-accent' : isDisabled ? 'text-muted' : 'text-secondary'}` }, step.label)));
                    })),
                    react_1.default.createElement("div", { className: "bg-secondary border border-border rounded-lg p-4 mb-4" },
                        buildStep === 'team' && (react_1.default.createElement("div", { className: "space-y-5" },
                            react_1.default.createElement("div", null,
                                react_1.default.createElement("div", { className: "text-xs font-bold text-muted uppercase tracking-wider mb-2" }, "Team Roles"),
                                react_1.default.createElement("div", { className: "text-xs text-muted mb-3" }, "Add the roles that will work on this project:"),
                                react_1.default.createElement("div", { className: "flex flex-wrap gap-2 mb-3" }, buildData.team.map((member, idx) => (react_1.default.createElement("span", { key: idx, className: "flex items-center gap-1 px-3 py-1.5 bg-accent/20 text-accent border border-accent/30 rounded-full text-xs font-medium" },
                                    member,
                                    react_1.default.createElement("button", { onClick: () => {
                                            setBuildData((prev) => ({
                                                ...prev,
                                                team: prev.team.filter((_, i) => i !== idx),
                                            }));
                                            setDevFlowOrder((prev) => prev.filter((r) => r !== member));
                                        }, className: "ml-1 text-accent/60 hover:text-red-400" }, "\u00D7"))))),
                                react_1.default.createElement("div", { className: "flex gap-2" },
                                    react_1.default.createElement("input", { type: "text", value: newTeamMember, onChange: (e) => setNewTeamMember(e.target.value), onKeyDown: (e) => {
                                            if (e.key === 'Enter' && newTeamMember.trim()) {
                                                const role = newTeamMember.trim();
                                                setBuildData((prev) => ({ ...prev, team: [...prev.team, role] }));
                                                setDevFlowOrder((prev) => [...prev, role]);
                                                setNewTeamMember('');
                                            }
                                        }, placeholder: "Add role (e.g., PM, Designer, Backend Dev)", className: "flex-1 bg-primary border border-border rounded px-3 py-2 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent" }),
                                    react_1.default.createElement("button", { onClick: () => {
                                            if (newTeamMember.trim()) {
                                                const role = newTeamMember.trim();
                                                setBuildData((prev) => ({ ...prev, team: [...prev.team, role] }));
                                                setDevFlowOrder((prev) => [...prev, role]);
                                                setNewTeamMember('');
                                            }
                                        }, className: "px-4 py-2 text-xs bg-accent text-accent-text rounded font-medium hover:bg-accent-hover transition-colors" }, "Add"))),
                            buildData.team.length > 0 && (react_1.default.createElement("div", null,
                                react_1.default.createElement("div", { className: "text-xs font-bold text-muted uppercase tracking-wider mb-2" }, "Development Iteration Flow"),
                                react_1.default.createElement("div", { className: "text-xs text-muted mb-3" }, "Drag to reorder. User Feedback is always last in each iteration:"),
                                react_1.default.createElement("div", { className: "bg-primary/50 border border-border rounded-lg p-3 space-y-2" },
                                    devFlowOrder.map((role, idx) => (react_1.default.createElement("div", { key: role, draggable: true, onDragStart: () => setDraggedFlowItem(role), onDragOver: (e) => e.preventDefault(), onDrop: () => {
                                            if (draggedFlowItem && draggedFlowItem !== role) {
                                                const newOrder = [...devFlowOrder];
                                                const dragIdx = newOrder.indexOf(draggedFlowItem);
                                                const dropIdx = newOrder.indexOf(role);
                                                newOrder.splice(dragIdx, 1);
                                                newOrder.splice(dropIdx, 0, draggedFlowItem);
                                                setDevFlowOrder(newOrder);
                                            }
                                            setDraggedFlowItem(null);
                                        }, onDragEnd: () => setDraggedFlowItem(null), className: `flex items-center gap-3 p-2.5 bg-secondary border border-border rounded-lg cursor-grab active:cursor-grabbing transition-all ${draggedFlowItem === role ? 'opacity-50 scale-95' : 'hover:border-accent/50'}` },
                                        react_1.default.createElement("div", { className: "flex items-center justify-center w-6 h-6 rounded-full bg-tertiary text-xs font-bold text-muted" }, idx + 1),
                                        react_1.default.createElement("span", { className: "flex-1 text-sm font-medium text-primary" }, role),
                                        react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className: "text-muted" },
                                            react_1.default.createElement("line", { x1: "3", y1: "6", x2: "21", y2: "6" }),
                                            react_1.default.createElement("line", { x1: "3", y1: "12", x2: "21", y2: "12" }),
                                            react_1.default.createElement("line", { x1: "3", y1: "18", x2: "21", y2: "18" }))))),
                                    react_1.default.createElement("div", { className: "flex items-center gap-3 p-2.5 bg-accent/10 border border-accent/30 rounded-lg" },
                                        react_1.default.createElement("div", { className: "flex items-center justify-center w-6 h-6 rounded-full bg-accent text-xs font-bold text-accent-text" }, devFlowOrder.length + 1),
                                        react_1.default.createElement("span", { className: "flex-1 text-sm font-medium text-accent" }, "User Feedback"),
                                        react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className: "text-accent" },
                                            react_1.default.createElement("path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" })))),
                                react_1.default.createElement("div", { className: "text-[10px] text-muted mt-2 italic" }, "This flow repeats each development iteration until the project is complete."))))),
                        buildStep === 'idea' && (react_1.default.createElement("div", { className: "space-y-4" },
                            react_1.default.createElement("div", { className: "space-y-2" },
                                react_1.default.createElement("div", { className: "text-xs text-muted mb-1" }, "Project Title:"),
                                react_1.default.createElement("input", { type: "text", value: projectTitle, onChange: (e) => {
                                        const newTitle = e.target.value;
                                        setProjectTitle(newTitle);
                                        // Only check for duplicates if this is a NEW project (idea stage not completed)
                                        // If we're editing an existing project, skip the duplicate check
                                        if (completedSteps.idea) {
                                            // Existing project - just update the sanitized name without duplicate check
                                            if (newTitle.trim().length > 0) {
                                                // Use the existing projectName as the sanitized name
                                                setSanitizedProjectName(projectName);
                                                setProjectTitleError(null);
                                            }
                                            return;
                                        }
                                        // New project - check for duplicates
                                        if (newTitle.trim().length > 0) {
                                            setIsCheckingProjectName(true);
                                            // Clear previous error while checking
                                            setProjectTitleError(null);
                                            // Send validation request to extension
                                            vscode.postMessage({
                                                type: 'check-project-name',
                                                projectTitle: newTitle,
                                            });
                                        }
                                        else {
                                            setSanitizedProjectName('');
                                            setProjectTitleError(null);
                                        }
                                    }, placeholder: "Enter a name for your project", className: `w-full bg-primary border rounded px-3 py-2 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent ${projectTitleError ? 'border-red-500' : 'border-border'}`, maxLength: 100 }),
                                isCheckingProjectName && (react_1.default.createElement("div", { className: "text-xs text-muted flex items-center gap-1" },
                                    react_1.default.createElement("span", { className: "animate-spin" }, "\u27F3"),
                                    " Checking...")),
                                projectTitleError && !isCheckingProjectName && (react_1.default.createElement("div", { className: "text-xs text-red-500" }, projectTitleError)),
                                sanitizedProjectName && !projectTitleError && !isCheckingProjectName && (react_1.default.createElement("div", { className: "text-xs text-muted" },
                                    "Project folder:",
                                    ' ',
                                    react_1.default.createElement("span", { className: "text-accent font-mono" },
                                        ".personaut/",
                                        sanitizedProjectName,
                                        "/")))),
                            react_1.default.createElement("div", { className: "space-y-2" },
                                react_1.default.createElement("div", { className: "text-xs text-muted mb-1" }, "Describe your product idea:"),
                                react_1.default.createElement("textarea", { value: buildData.idea, onChange: (e) => setBuildData((prev) => ({ ...prev, idea: e.target.value })), placeholder: "What are you building? What problem does it solve?", className: "w-full bg-primary border border-border rounded px-3 py-2 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent resize-none min-h-[120px]" })))),
                        buildStep === 'features' && (react_1.default.createElement("div", { className: "space-y-4" },
                            react_1.default.createElement("div", { className: "flex gap-2 p-1 bg-tertiary rounded-lg" },
                                react_1.default.createElement("button", { onClick: () => setFeaturesMode('define'), className: `flex-1 py-2 px-3 text-xs font-medium rounded-md transition-all ${featuresMode === 'define' ? 'bg-accent text-accent-text shadow' : 'text-muted hover:text-primary'}` }, "Define Features"),
                                react_1.default.createElement("button", { onClick: () => setFeaturesMode('generate'), className: `flex-1 py-2 px-3 text-xs font-medium rounded-md transition-all ${featuresMode === 'generate' ? 'bg-accent text-accent-text shadow' : 'text-muted hover:text-primary'}` }, "Generate from Target Users")),
                            featuresMode === 'define' ? (
                            /* Manual Feature Entry */
                            react_1.default.createElement("div", { className: "space-y-3" },
                                react_1.default.createElement("div", { className: "text-xs text-muted" }, "Manually list key features for your product:"),
                                react_1.default.createElement("div", { className: "space-y-2" }, buildData.features.map((feature, idx) => (react_1.default.createElement("div", { key: idx, className: "flex items-center gap-2 p-2 bg-tertiary rounded text-sm text-secondary" },
                                    react_1.default.createElement("span", { className: "flex-1" }, feature),
                                    react_1.default.createElement("button", { onClick: () => setBuildData((prev) => ({
                                            ...prev,
                                            features: prev.features.filter((_, i) => i !== idx),
                                        })), className: "text-muted hover:text-red-400" }, "\u00D7"))))),
                                react_1.default.createElement("div", { className: "flex gap-2" },
                                    react_1.default.createElement("input", { type: "text", value: newFeature, onChange: (e) => setNewFeature(e.target.value), onKeyDown: (e) => {
                                            if (e.key === 'Enter' && newFeature.trim()) {
                                                setBuildData((prev) => ({
                                                    ...prev,
                                                    features: [...prev.features, newFeature.trim()],
                                                }));
                                                setNewFeature('');
                                            }
                                        }, placeholder: "Add a feature", className: "flex-1 bg-primary border border-border rounded px-3 py-2 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent" }),
                                    react_1.default.createElement("button", { onClick: () => {
                                            if (newFeature.trim()) {
                                                setBuildData((prev) => ({
                                                    ...prev,
                                                    features: [...prev.features, newFeature.trim()],
                                                }));
                                                setNewFeature('');
                                            }
                                        }, className: "px-3 py-2 text-xs bg-tertiary text-secondary rounded hover:text-primary hover:bg-accent/20 transition-colors" }, "Add")))) : (
                            /* Generate from Target Users */
                            react_1.default.createElement("div", { className: "space-y-4" }, featuresLoading ? (react_1.default.createElement("div", { className: "flex flex-col items-center justify-center py-12" },
                                react_1.default.createElement("div", { className: "animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mb-3" }),
                                react_1.default.createElement("div", { className: "text-sm text-muted" }, "Interviewing personas about features..."))) : generatedFeatures.length === 0 ? (
                            /* Pre-interview state */
                            react_1.default.createElement("div", { className: "space-y-3" },
                                react_1.default.createElement("div", { className: "text-xs text-muted" }, "We'll interview your target users (personas) about your idea and ask:"),
                                react_1.default.createElement("div", { className: "bg-primary/50 border border-border rounded-lg p-3 space-y-2" },
                                    react_1.default.createElement("div", { className: "flex items-start gap-2" },
                                        react_1.default.createElement("span", { className: "text-accent" }, "1."),
                                        react_1.default.createElement("span", { className: "text-sm text-secondary" }, "What features can't you live without?")),
                                    react_1.default.createElement("div", { className: "flex items-start gap-2" },
                                        react_1.default.createElement("span", { className: "text-accent" }, "2."),
                                        react_1.default.createElement("span", { className: "text-sm text-secondary" }, "What features would make you super excited?")),
                                    react_1.default.createElement("div", { className: "flex items-start gap-2" },
                                        react_1.default.createElement("span", { className: "text-accent" }, "3."),
                                        react_1.default.createElement("span", { className: "text-sm text-secondary" }, "Rate each feature 1-10 and estimate usage frequency"))),
                                react_1.default.createElement("div", { className: "text-xs text-muted" }, "A UX researcher will then consolidate all feedback into up to 10 prioritized features."),
                                react_1.default.createElement("div", { className: "text-xs text-muted" },
                                    react_1.default.createElement("strong", null, "Personas to interview:"),
                                    ' ',
                                    usersMode === 'personas'
                                        ? selectedBuildPersonaIds
                                            .map((id) => buildPersonas.find((p) => p.id === id)?.name)
                                            .filter(Boolean)
                                            .join(', ') || 'None selected'
                                        : '5 generated personas from demographics'))) : (
                            /* Generated features with drag-and-drop */
                            react_1.default.createElement("div", { className: "space-y-3" },
                                react_1.default.createElement("div", { className: "flex justify-between items-center" },
                                    react_1.default.createElement("div", { className: "text-xs text-muted" }, "Drag to reorder by priority:"),
                                    react_1.default.createElement("div", { className: "flex items-center gap-2" },
                                        react_1.default.createElement("span", { className: "text-xs text-muted" },
                                            generatedFeatures.length,
                                            " features"),
                                        react_1.default.createElement("button", { onClick: () => {
                                                setGeneratedFeatures([]);
                                                addBuildLog('Features cleared. Click "Save & Next" to regenerate.', 'info');
                                            }, className: "text-[10px] px-2 py-1 text-muted hover:text-primary border border-dashed border-border rounded hover:bg-tertiary/50 transition-colors", title: "Clear and regenerate features" }, "\u21BA Regenerate"))),
                                react_1.default.createElement("div", { ref: featuresContainerRef, className: "space-y-3 overflow-y-auto pr-2 custom-scrollbar", style: { maxHeight: '60vh' } }, generatedFeatures.map((feature, idx) => (react_1.default.createElement("div", { key: feature.id, draggable: true, onDragStart: () => setDraggedFeature(feature.id), onDragOver: (e) => e.preventDefault(), onDrop: () => {
                                        if (draggedFeature && draggedFeature !== feature.id) {
                                            const newOrder = [...generatedFeatures];
                                            const dragIdx = newOrder.findIndex((f) => f.id === draggedFeature);
                                            const dropIdx = newOrder.findIndex((f) => f.id === feature.id);
                                            const [dragged] = newOrder.splice(dragIdx, 1);
                                            newOrder.splice(dropIdx, 0, dragged);
                                            setGeneratedFeatures(newOrder);
                                        }
                                        setDraggedFeature(null);
                                    }, onDragEnd: () => setDraggedFeature(null), className: `group relative bg-secondary/10 hover:bg-secondary/20 border border-border/50 rounded-xl p-4 cursor-grab active:cursor-grabbing transition-all duration-200 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 ${draggedFeature === feature.id ? 'opacity-50 scale-95 ring-1 ring-accent' : ''}` },
                                    react_1.default.createElement("div", { className: "flex items-start gap-3" },
                                        react_1.default.createElement("div", { className: "flex items-center justify-center w-6 h-6 rounded-full bg-accent text-xs font-bold text-accent-text shrink-0" }, idx + 1),
                                        react_1.default.createElement("div", { className: "flex-1 min-w-0" },
                                            react_1.default.createElement("div", { className: "flex items-center gap-2 mb-1" },
                                                react_1.default.createElement("span", { className: "text-sm font-medium text-primary" }, feature.name),
                                                react_1.default.createElement("span", { className: `text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${feature.priority === 'Must-Have'
                                                        ? 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'
                                                        : feature.priority === 'Should-Have'
                                                            ? 'bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/20'
                                                            : 'bg-green-500/10 text-green-400 ring-1 ring-green-500/20'}` }, feature.priority)),
                                            react_1.default.createElement("div", { className: "text-xs text-muted mb-1" }, feature.description),
                                            react_1.default.createElement("div", { className: "flex gap-3 text-[10px] text-muted" },
                                                react_1.default.createElement("span", null,
                                                    "Score:",
                                                    ' ',
                                                    react_1.default.createElement("strong", { className: "text-accent" },
                                                        feature.score,
                                                        "/10")),
                                                react_1.default.createElement("span", null,
                                                    "Frequency: ",
                                                    react_1.default.createElement("strong", null, feature.frequency)))),
                                        react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className: "text-muted shrink-0" },
                                            react_1.default.createElement("line", { x1: "3", y1: "6", x2: "21", y2: "6" }),
                                            react_1.default.createElement("line", { x1: "3", y1: "12", x2: "21", y2: "12" }),
                                            react_1.default.createElement("line", { x1: "3", y1: "18", x2: "21", y2: "18" }))))))))))))),
                        buildStep === 'stories' && (react_1.default.createElement("div", { className: "space-y-4" },
                            react_1.default.createElement("div", { className: "flex justify-between items-center" },
                                react_1.default.createElement("div", null,
                                    react_1.default.createElement("div", { className: "text-xs font-bold text-muted uppercase tracking-wider" }, "User Stories"),
                                    react_1.default.createElement("div", { className: "text-xs text-muted" }, "Review and refine stories from the PM Agent")),
                                userStories.length > 0 && (react_1.default.createElement("div", { className: "flex items-center gap-2" },
                                    react_1.default.createElement("span", { className: "text-xs text-muted" },
                                        userStories.length,
                                        " stories"),
                                    react_1.default.createElement("button", { onClick: () => {
                                            setUserStories([]);
                                            addBuildLog('Stories cleared. Click "Save & Next" to regenerate.', 'info');
                                        }, className: "text-[10px] px-2 py-1 text-muted hover:text-primary border border-dashed border-border rounded hover:bg-tertiary/50 transition-colors", title: "Clear and regenerate stories" }, "\u21BA Regenerate")))),
                            storiesLoading ? (react_1.default.createElement("div", { className: "flex flex-col items-center justify-center py-12" },
                                react_1.default.createElement("div", { className: "animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mb-3" }),
                                react_1.default.createElement("div", { className: "text-sm text-muted" }, "PM Agent is generating user stories..."))) : userStories.length === 0 ? (react_1.default.createElement("div", { className: "text-center py-8 text-muted text-sm" }, "Stories will be generated when you complete the Team step.")) : (react_1.default.createElement("div", { ref: storiesContainerRef, className: "space-y-3 max-h-[400px] overflow-y-auto pr-1" }, userStories.map((story) => (react_1.default.createElement("div", { key: story.id, className: "bg-primary/50 border border-border rounded-lg overflow-hidden" },
                                react_1.default.createElement("button", { onClick: () => setUserStories((prev) => prev.map((s) => s.id === story.id ? { ...s, expanded: !s.expanded } : s)), className: "w-full flex items-center gap-3 p-3 hover:bg-tertiary/50 transition-colors" },
                                    react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className: `text-muted transition-transform ${story.expanded ? 'rotate-90' : ''}` },
                                        react_1.default.createElement("polyline", { points: "9 18 15 12 9 6" })),
                                    react_1.default.createElement("span", { className: "flex-1 text-left text-sm font-medium text-primary" }, story.title),
                                    react_1.default.createElement("span", { className: "text-xs text-muted" },
                                        story.requirements.length,
                                        " reqs")),
                                story.expanded && (react_1.default.createElement("div", { className: "border-t border-border p-3 space-y-4" },
                                    react_1.default.createElement("div", { className: "text-xs text-secondary" }, story.description),
                                    react_1.default.createElement("div", null,
                                        react_1.default.createElement("div", { className: "text-[10px] font-bold text-muted uppercase mb-2" }, "Requirements"),
                                        react_1.default.createElement("div", { className: "space-y-1" }, story.requirements.map((req, idx) => (react_1.default.createElement("div", { key: idx, className: "flex items-start gap-2 text-xs text-secondary" },
                                            react_1.default.createElement("span", { className: "text-accent" }, "\u2022"),
                                            react_1.default.createElement("span", null, req))))),
                                        react_1.default.createElement("div", { className: "flex gap-2 mt-2" },
                                            react_1.default.createElement("input", { type: "text", value: newRequirement[story.id] || '', onChange: (e) => setNewRequirement((prev) => ({
                                                    ...prev,
                                                    [story.id]: e.target.value,
                                                })), onKeyDown: (e) => {
                                                    if (e.key === 'Enter' &&
                                                        newRequirement[story.id]?.trim()) {
                                                        setUserStories((prev) => prev.map((s) => s.id === story.id
                                                            ? {
                                                                ...s,
                                                                requirements: [
                                                                    ...s.requirements,
                                                                    newRequirement[story.id].trim(),
                                                                ],
                                                            }
                                                            : s));
                                                        setNewRequirement((prev) => ({
                                                            ...prev,
                                                            [story.id]: '',
                                                        }));
                                                    }
                                                }, placeholder: "Add a requirement...", className: "flex-1 bg-secondary border border-border rounded px-2 py-1 text-xs text-primary placeholder-muted focus:outline-none focus:border-accent" }),
                                            react_1.default.createElement("button", { onClick: () => {
                                                    if (newRequirement[story.id]?.trim()) {
                                                        setUserStories((prev) => prev.map((s) => s.id === story.id
                                                            ? {
                                                                ...s,
                                                                requirements: [
                                                                    ...s.requirements,
                                                                    newRequirement[story.id].trim(),
                                                                ],
                                                            }
                                                            : s));
                                                        setNewRequirement((prev) => ({
                                                            ...prev,
                                                            [story.id]: '',
                                                        }));
                                                    }
                                                }, className: "px-2 py-1 text-[10px] bg-accent text-accent-text rounded font-medium" }, "Add"))),
                                    story.clarifyingQuestions.length > 0 && (react_1.default.createElement("div", null,
                                        react_1.default.createElement("div", { className: "text-[10px] font-bold text-muted uppercase mb-2" }, "Clarifying Questions from PM Agent"),
                                        react_1.default.createElement("div", { className: "space-y-2" }, story.clarifyingQuestions.map((q, idx) => (react_1.default.createElement("div", { key: idx, className: "bg-secondary/50 rounded p-2 space-y-1" },
                                            react_1.default.createElement("div", { className: "text-xs text-accent font-medium" },
                                                "Q: ",
                                                q.question),
                                            q.answer ? (react_1.default.createElement("div", { className: "text-xs text-secondary" },
                                                "A: ",
                                                q.answer)) : (react_1.default.createElement("div", { className: "flex gap-2" },
                                                react_1.default.createElement("input", { type: "text", value: questionAnswers[`${story.id}-${idx}`] || '', onChange: (e) => setQuestionAnswers((prev) => ({
                                                        ...prev,
                                                        [`${story.id}-${idx}`]: e.target.value,
                                                    })), placeholder: "Your answer...", className: "flex-1 bg-primary border border-border rounded px-2 py-1 text-xs text-primary placeholder-muted focus:outline-none focus:border-accent" }),
                                                react_1.default.createElement("button", { onClick: () => {
                                                        const answer = questionAnswers[`${story.id}-${idx}`]?.trim();
                                                        if (answer) {
                                                            setUserStories((prev) => prev.map((s) => s.id === story.id
                                                                ? {
                                                                    ...s,
                                                                    clarifyingQuestions: s.clarifyingQuestions.map((cq, i) => i === idx
                                                                        ? { ...cq, answer }
                                                                        : cq),
                                                                }
                                                                : s));
                                                            setQuestionAnswers((prev) => {
                                                                const updated = { ...prev };
                                                                delete updated[`${story.id}-${idx}`];
                                                                return updated;
                                                            });
                                                        }
                                                    }, className: "px-2 py-1 text-[10px] bg-accent text-accent-text rounded font-medium" }, "Answer")))))))))))))))))),
                        buildStep === 'design' && (react_1.default.createElement("div", { className: "space-y-4" },
                            react_1.default.createElement("div", { className: "text-xs text-accent font-bold mb-2 flex items-center gap-2" },
                                react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
                                    react_1.default.createElement("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2", ry: "2" }),
                                    react_1.default.createElement("line", { x1: "3", y1: "9", x2: "21", y2: "9" }),
                                    react_1.default.createElement("line", { x1: "9", y1: "21", x2: "9", y2: "9" })),
                                "EXPERIENCE-FIRST DESIGN"),
                            react_1.default.createElement("div", { className: "text-[11px] text-secondary bg-accent/5 p-3 rounded-lg border border-accent/20" },
                                react_1.default.createElement("strong", { className: "text-accent" }, "\uD83D\uDCF1 Design screens first, code later."),
                                react_1.default.createElement("br", null),
                                "List out every screen/page the user will see. Use mock data. Real APIs come after the experience is perfect."),
                            react_1.default.createElement("div", { className: "flex items-center justify-between p-3 bg-tertiary/50 rounded-lg border border-border/30" },
                                react_1.default.createElement("div", null,
                                    react_1.default.createElement("label", { className: "text-xs font-bold text-muted uppercase tracking-wider" }, "\uD83D\uDEE0\uFE0F Framework"),
                                    react_1.default.createElement("div", { className: "text-[10px] text-muted mt-0.5" }, "Code will be generated using this framework")),
                                react_1.default.createElement("select", { value: selectedFramework, onChange: (e) => setSelectedFramework(e.target.value), className: "bg-primary border border-border rounded px-3 py-1.5 text-sm text-primary focus:outline-none focus:border-accent cursor-pointer" },
                                    react_1.default.createElement("option", { value: "react" }, "React"),
                                    react_1.default.createElement("option", { value: "nextjs" }, "Next.js"),
                                    react_1.default.createElement("option", { value: "vue" }, "Vue.js"),
                                    react_1.default.createElement("option", { value: "flutter" }, "Flutter"),
                                    react_1.default.createElement("option", { value: "html" }, "HTML/CSS/JS"))),
                            react_1.default.createElement("div", { className: "space-y-3" },
                                react_1.default.createElement("div", { className: "flex items-center justify-between" },
                                    react_1.default.createElement("label", { className: "text-xs font-bold text-muted uppercase tracking-wider" }, "\uD83D\uDCF1 Key Screens / Pages"),
                                    generatedScreens.length === 0 && (react_1.default.createElement("button", { onClick: () => {
                                            setDesignLoading(true);
                                            addBuildLog('Generating screens with UX Agent...', 'info');
                                            // Build context from idea, features, and stories
                                            const featuresList = generatedFeatures.length > 0
                                                ? generatedFeatures.map((f) => f.name).join(', ')
                                                : buildData.features.join(', ');
                                            const storiesList = userStories.length > 0
                                                ? userStories.map((s) => `${s.title}`).join(', ')
                                                : '';
                                            const screenPrompt = `Generate key screens for this product:

PRODUCT: ${buildData.idea}
FEATURES: ${featuresList || 'Core features'}
USER STORIES: ${storiesList || 'Standard workflows'}

Generate 5-8 essential screens. For each screen provide:
- name: Screen name
- purpose: What the user achieves here
- uiElements: Key UI components (3-5 items)
- userActions: What the user can do (2-4 items)

OUTPUT FORMAT: Return ONLY a JSON code block:
\`\`\`json
{
  "screens": [
    {
      "name": "Screen Name",
      "purpose": "What user achieves",
      "uiElements": ["Header", "Form", "Button"],
      "userActions": ["Submit form", "Navigate"]
    }
  ]
}
\`\`\``;
                                            vscode.postMessage({
                                                type: 'generate-content-streaming',
                                                projectName,
                                                stage: 'design',
                                                prompt: screenPrompt,
                                                systemPrompt: 'You are a JSON API. Output ONLY valid JSON in a code block. Never include explanatory text.',
                                            });
                                            setTimeout(() => setDesignLoading(false), 45000);
                                        }, disabled: designLoading, className: `text-[10px] px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${designLoading
                                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md hover:shadow-lg'}` }, designLoading ? (react_1.default.createElement(react_1.default.Fragment, null,
                                        react_1.default.createElement("svg", { className: "animate-spin w-3 h-3", fill: "none", viewBox: "0 0 24 24" },
                                            react_1.default.createElement("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }),
                                            react_1.default.createElement("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })),
                                        "Generating...")) : (react_1.default.createElement(react_1.default.Fragment, null,
                                        react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
                                            react_1.default.createElement("polygon", { points: "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" })),
                                        "Generate Screens"))))),
                                generatedScreens.length > 0 ? (react_1.default.createElement("div", { className: "space-y-2" },
                                    generatedScreens.map((screen, index) => (react_1.default.createElement("div", { key: screen.id, className: "bg-tertiary/50 rounded-lg border border-border/50 overflow-hidden" },
                                        react_1.default.createElement("div", { className: "flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-tertiary/80 transition-colors", onClick: () => setGeneratedScreens((prev) => prev.map((s, i) => i === index ? { ...s, expanded: !s.expanded } : s)) },
                                            react_1.default.createElement("div", { className: "flex items-center gap-2" },
                                                react_1.default.createElement("span", { className: "w-5 h-5 bg-purple-500/20 text-purple-400 rounded flex items-center justify-center text-[10px] font-bold" }, index + 1),
                                                react_1.default.createElement("span", { className: "text-xs font-semibold text-primary" }, screen.name)),
                                            react_1.default.createElement("div", { className: "flex items-center gap-2" },
                                                react_1.default.createElement("button", { onClick: (e) => {
                                                        e.stopPropagation();
                                                        setGeneratedScreens((prev) => prev.filter((s) => s.id !== screen.id));
                                                    }, className: "text-muted hover:text-red-400 transition-colors p-1", title: "Remove screen" },
                                                    react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
                                                        react_1.default.createElement("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
                                                        react_1.default.createElement("line", { x1: "6", y1: "6", x2: "18", y2: "18" }))),
                                                react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className: `transition-transform ${screen.expanded ? 'rotate-180' : ''}` },
                                                    react_1.default.createElement("polyline", { points: "6 9 12 15 18 9" })))),
                                        screen.expanded && (react_1.default.createElement("div", { className: "px-3 py-2 border-t border-border/30 space-y-3" },
                                            react_1.default.createElement("div", null,
                                                react_1.default.createElement("label", { className: "text-[10px] text-muted uppercase" }, "Purpose"),
                                                react_1.default.createElement("p", { className: "text-[11px] text-secondary mt-0.5" }, screen.purpose)),
                                            react_1.default.createElement("div", null,
                                                react_1.default.createElement("label", { className: "text-[10px] text-muted uppercase" }, "UI Elements"),
                                                react_1.default.createElement("div", { className: "flex flex-wrap gap-1 mt-1" },
                                                    screen.uiElements.map((el, i) => (react_1.default.createElement("span", { key: i, className: "text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20" }, el))),
                                                    react_1.default.createElement("button", { onClick: () => {
                                                            const newEl = prompt('Add UI element:');
                                                            if (newEl) {
                                                                setGeneratedScreens((prev) => prev.map((s, i) => i === index
                                                                    ? { ...s, uiElements: [...s.uiElements, newEl] }
                                                                    : s));
                                                            }
                                                        }, className: "text-[10px] px-2 py-0.5 bg-gray-500/10 text-gray-400 rounded border border-dashed border-gray-500/30 hover:bg-gray-500/20 transition-colors" }, "+ Add"))),
                                            react_1.default.createElement("div", null,
                                                react_1.default.createElement("label", { className: "text-[10px] text-muted uppercase" }, "User Actions"),
                                                react_1.default.createElement("div", { className: "flex flex-wrap gap-1 mt-1" },
                                                    screen.userActions.map((action, i) => (react_1.default.createElement("span", { key: i, className: "text-[10px] px-2 py-0.5 bg-green-500/10 text-green-400 rounded border border-green-500/20" }, action))),
                                                    react_1.default.createElement("button", { onClick: () => {
                                                            const newAction = prompt('Add user action:');
                                                            if (newAction) {
                                                                setGeneratedScreens((prev) => prev.map((s, i) => i === index
                                                                    ? {
                                                                        ...s,
                                                                        userActions: [...s.userActions, newAction],
                                                                    }
                                                                    : s));
                                                            }
                                                        }, className: "text-[10px] px-2 py-0.5 bg-gray-500/10 text-gray-400 rounded border border-dashed border-gray-500/30 hover:bg-gray-500/20 transition-colors" }, "+ Add")))))))),
                                    react_1.default.createElement("button", { onClick: () => {
                                            setGeneratedScreens([]);
                                        }, className: "w-full text-[10px] py-2 text-muted hover:text-primary border border-dashed border-border rounded-lg hover:bg-tertiary/50 transition-colors" }, "Clear & Regenerate Screens"))) : !designLoading ? (react_1.default.createElement("div", { className: "text-[11px] text-muted bg-tertiary/30 p-4 rounded-lg text-center border border-dashed border-border" }, "Click \"Generate Screens\" to create screens based on your features and user stories.")) : (react_1.default.createElement("div", { className: "text-[11px] text-muted bg-tertiary/30 p-4 rounded-lg text-center animate-pulse" }, "Generating screens..."))),
                            react_1.default.createElement("div", { className: "space-y-3" },
                                react_1.default.createElement("div", { className: "flex items-center justify-between" },
                                    react_1.default.createElement("label", { className: "text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2" }, "\uD83D\uDD00 User Flows"),
                                    react_1.default.createElement("button", { onClick: () => {
                                            if (generatedScreens.length === 0) {
                                                addBuildLog('Please generate screens first before generating user flows.', 'warning');
                                                return;
                                            }
                                            setUserFlowsLoading(true);
                                            addBuildLog('Generating user flows with UX Agent...', 'info');
                                            // Build context from features and stories
                                            const featuresList = generatedFeatures.length > 0
                                                ? generatedFeatures.map((f) => f.name).join(', ')
                                                : buildData.features.join(', ');
                                            const storiesList = userStories.length > 0
                                                ? userStories
                                                    .map((s) => `${s.title}: ${s.description}`)
                                                    .join('\n')
                                                : '';
                                            // Build screen list from generated screens
                                            const screensList = generatedScreens.map((s) => s.name).join(', ');
                                            const flowPrompt = `You are a UX Designer. Generate user flows for this product.

PRODUCT IDEA: ${buildData.idea}

KEY SCREENS: ${screensList}

FEATURES: ${featuresList || 'Core product features'}

USER STORIES:
${storiesList || 'Standard user workflows'}

TASK: Create 3-5 essential user flows. Each flow should:
1. Have a clear name (e.g., "Onboarding Flow", "Purchase Flow")
2. Have a brief description of the user's goal
3. List the screens/steps in order (use the screen names from above)

OUTPUT FORMAT: Return ONLY a JSON code block with this structure:
\`\`\`json
{
  "flows": [
    {
      "name": "Flow Name",
      "description": "What the user achieves",
      "steps": ["Screen 1", "Screen 2", "Screen 3"]
    }
  ]
}
\`\`\``;
                                            // Send to AI
                                            vscode.postMessage({
                                                type: 'generate-content-streaming',
                                                projectName,
                                                stage: 'design',
                                                prompt: flowPrompt,
                                                systemPrompt: 'You are a JSON API. Output ONLY valid JSON in a code block. Never include explanatory text.',
                                            });
                                            // Timeout fallback
                                            setTimeout(() => {
                                                setUserFlowsLoading(false);
                                            }, 30000);
                                        }, disabled: userFlowsLoading || generatedScreens.length === 0, className: `text-[10px] px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${userFlowsLoading || generatedScreens.length === 0
                                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white shadow-md hover:shadow-lg'}`, title: generatedScreens.length === 0
                                            ? 'Generate screens first'
                                            : 'Generate user flows' }, userFlowsLoading ? (react_1.default.createElement(react_1.default.Fragment, null,
                                        react_1.default.createElement("svg", { className: "animate-spin w-3 h-3", fill: "none", viewBox: "0 0 24 24" },
                                            react_1.default.createElement("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }),
                                            react_1.default.createElement("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })),
                                        "Generating...")) : (react_1.default.createElement(react_1.default.Fragment, null,
                                        react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
                                            react_1.default.createElement("circle", { cx: "12", cy: "12", r: "10" }),
                                            react_1.default.createElement("polyline", { points: "12 6 12 12 16 14" })),
                                        "Generate Flows")))),
                                userFlows.length > 0 ? (react_1.default.createElement("div", { className: "space-y-3" }, userFlows.map((flow, index) => (react_1.default.createElement("div", { key: flow.id, className: "bg-tertiary/50 rounded-lg p-3 border border-border/50" },
                                    react_1.default.createElement("div", { className: "flex items-start justify-between mb-2" },
                                        react_1.default.createElement("div", null,
                                            react_1.default.createElement("h4", { className: "text-xs font-bold text-primary flex items-center gap-2" },
                                                react_1.default.createElement("span", { className: "w-5 h-5 bg-accent/20 text-accent rounded-full flex items-center justify-center text-[10px] font-bold" }, index + 1),
                                                flow.name),
                                            react_1.default.createElement("p", { className: "text-[11px] text-muted mt-1" }, flow.description)),
                                        react_1.default.createElement("button", { onClick: () => setUserFlows((flows) => flows.filter((f) => f.id !== flow.id)), className: "text-muted hover:text-red-400 transition-colors p-1", title: "Remove flow" },
                                            react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
                                                react_1.default.createElement("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
                                                react_1.default.createElement("line", { x1: "6", y1: "6", x2: "18", y2: "18" })))),
                                    react_1.default.createElement("div", { className: "flex items-center flex-wrap gap-1 text-[10px]" }, flow.steps.map((step, stepIndex) => (react_1.default.createElement("div", { key: stepIndex, className: "flex items-center" },
                                        react_1.default.createElement("span", { className: "px-2 py-1 bg-primary rounded text-secondary border border-border/30" }, step),
                                        stepIndex < flow.steps.length - 1 && (react_1.default.createElement("span", { className: "text-accent mx-1" }, "\u2192"))))))))))) : (react_1.default.createElement("div", { className: "text-[11px] text-muted bg-tertiary/30 p-3 rounded-lg text-center border border-dashed border-border" }, generatedScreens.length > 0
                                    ? 'Click "Generate Flows" to create user flows based on your screens and features.'
                                    : 'Generate screens first, then create user flows.'))),
                            react_1.default.createElement("div", { className: "text-[11px] text-muted bg-tertiary p-3 rounded-lg" },
                                react_1.default.createElement("strong", { className: "text-secondary" }, "\uD83D\uDCA1 Mock Data First:"),
                                react_1.default.createElement("br", null),
                                "The AI will build screens with hardcoded/mock data. Once the experience feels right, you'll connect real backends."))),
                        buildStep === 'users' && (react_1.default.createElement("div", { className: "space-y-4" },
                            react_1.default.createElement("div", { className: "flex gap-2 p-1 bg-tertiary rounded-lg" },
                                react_1.default.createElement("button", { onClick: () => setUsersMode('personas'), className: `flex-1 py-2 px-3 text-xs font-medium rounded-md transition-all ${usersMode === 'personas' ? 'bg-accent text-accent-text shadow' : 'text-muted hover:text-primary'}` }, "Use Existing Personas"),
                                react_1.default.createElement("button", { onClick: () => setUsersMode('demographics'), className: `flex-1 py-2 px-3 text-xs font-medium rounded-md transition-all ${usersMode === 'demographics' ? 'bg-accent text-accent-text shadow' : 'text-muted hover:text-primary'}` }, "Generate from Demographics")),
                            usersMode === 'personas' ? (
                            /* Persona Selection */
                            react_1.default.createElement("div", null,
                                react_1.default.createElement("div", { className: "flex justify-between items-center mb-2" },
                                    react_1.default.createElement("div", { className: "text-xs font-bold text-muted uppercase tracking-wider" }, "Select Personas (Max 5)"),
                                    react_1.default.createElement("span", { className: "text-xs text-muted" },
                                        selectedBuildPersonaIds.length,
                                        "/5 selected")),
                                react_1.default.createElement("div", { className: "bg-primary/50 border border-border rounded-lg max-h-40 overflow-y-auto p-2" }, buildPersonas.length === 0 ? (react_1.default.createElement("div", { className: "text-center text-muted text-xs py-3" }, "No personas yet. Create some in the User Base tab!")) : (buildPersonas.map((persona) => (react_1.default.createElement("label", { key: persona.id, className: `flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-tertiary/50 ${selectedBuildPersonaIds.includes(persona.id) ? 'bg-accent/10' : ''}` },
                                    react_1.default.createElement("input", { type: "checkbox", checked: selectedBuildPersonaIds.includes(persona.id), onChange: () => {
                                            if (selectedBuildPersonaIds.includes(persona.id)) {
                                                setSelectedBuildPersonaIds((prev) => prev.filter((id) => id !== persona.id));
                                            }
                                            else if (selectedBuildPersonaIds.length < 5) {
                                                setSelectedBuildPersonaIds((prev) => [...prev, persona.id]);
                                            }
                                        }, disabled: !selectedBuildPersonaIds.includes(persona.id) &&
                                            selectedBuildPersonaIds.length >= 5, className: "accent-accent" }),
                                    react_1.default.createElement("div", { className: "flex-1 min-w-0" },
                                        react_1.default.createElement("div", { className: "text-sm font-medium text-primary truncate" }, persona.name),
                                        persona.backstory && (react_1.default.createElement("div", { className: "text-xs text-muted truncate" },
                                            persona.backstory.substring(0, 60),
                                            "...")))))))),
                                react_1.default.createElement("button", { onClick: () => vscode.postMessage({ type: 'get-personas' }), className: "mt-2 text-xs text-accent hover:text-accent-hover" }, "\u21BB Refresh personas"))) : /* Demographics Mode */
                                usersLoading ? (react_1.default.createElement("div", { className: "flex flex-col items-center justify-center py-12 text-center space-y-4" },
                                    react_1.default.createElement("div", { className: "w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" }),
                                    react_1.default.createElement("div", { className: "text-sm text-muted" }, "Generating 5 unique personas based on demographics..."))) : generatedPersonas.length > 0 ? (react_1.default.createElement("div", { className: "space-y-4" },
                                    react_1.default.createElement("div", { className: "flex justify-between items-center bg-tertiary p-2 rounded" },
                                        react_1.default.createElement("div", { className: "text-xs text-muted" }, "Review & Edit Generated Personas"),
                                        react_1.default.createElement("button", { onClick: () => {
                                                setGeneratedPersonas([]);
                                            }, className: "text-xs text-accent hover:text-accent-hover font-medium" }, "Reset & Regenerate")),
                                    react_1.default.createElement("div", { ref: personasContainerRef, className: "space-y-3 max-h-[400px] overflow-y-auto pr-1" }, generatedPersonas.map((persona, idx) => (react_1.default.createElement("div", { key: persona.id, className: "bg-primary/50 border border-border rounded-lg p-3" },
                                        react_1.default.createElement("div", { className: "flex gap-2 mb-2" },
                                            react_1.default.createElement("div", { className: "w-8 h-8 rounded-full bg-accent text-accent-text flex items-center justify-center font-bold text-xs flex-shrink-0" }, idx + 1),
                                            react_1.default.createElement("div", { className: "flex-1 space-y-2" },
                                                react_1.default.createElement("input", { type: "text", value: persona.name, onChange: (e) => {
                                                        const newPersonas = [...generatedPersonas];
                                                        newPersonas[idx] = { ...persona, name: e.target.value };
                                                        setGeneratedPersonas(newPersonas);
                                                    }, className: "w-full bg-transparent border-b border-border text-sm font-bold focus:outline-none focus:border-accent", placeholder: "Name" }),
                                                react_1.default.createElement("div", { className: "flex gap-2" },
                                                    react_1.default.createElement("input", { type: "text", value: persona.age, onChange: (e) => {
                                                            const newPersonas = [...generatedPersonas];
                                                            newPersonas[idx] = { ...persona, age: e.target.value };
                                                            setGeneratedPersonas(newPersonas);
                                                        }, className: "w-20 bg-transparent border-b border-border text-xs text-muted focus:outline-none focus:border-accent", placeholder: "Age" }),
                                                    react_1.default.createElement("input", { type: "text", value: persona.occupation, onChange: (e) => {
                                                            const newPersonas = [...generatedPersonas];
                                                            newPersonas[idx] = {
                                                                ...persona,
                                                                occupation: e.target.value,
                                                            };
                                                            setGeneratedPersonas(newPersonas);
                                                        }, className: "flex-1 bg-transparent border-b border-border text-xs text-muted focus:outline-none focus:border-accent", placeholder: "Occupation" })))),
                                        react_1.default.createElement("textarea", { value: persona.backstory, onChange: (e) => {
                                                const newPersonas = [...generatedPersonas];
                                                newPersonas[idx] = { ...persona, backstory: e.target.value };
                                                setGeneratedPersonas(newPersonas);
                                            }, className: "w-full bg-primary border border-border rounded px-3 py-2 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent resize-none min-h-[80px]", placeholder: "Backstory..." }))))))) : (
                                /* Normal Demographics Input */
                                react_1.default.createElement("div", { className: "space-y-4" },
                                    react_1.default.createElement("div", { className: "text-xs text-muted" }, "Define target demographics and we'll generate 5 unique personas with backstories."),
                                    react_1.default.createElement("div", { className: "grid grid-cols-2 gap-3" },
                                        react_1.default.createElement("div", null,
                                            react_1.default.createElement("label", { className: "text-[10px] text-muted uppercase" }, "Age Range"),
                                            react_1.default.createElement("input", { type: "text", value: buildData.users.demographics.ageRange, onChange: (e) => setBuildData((prev) => ({
                                                    ...prev,
                                                    users: {
                                                        ...prev.users,
                                                        demographics: {
                                                            ...prev.users.demographics,
                                                            ageRange: e.target.value,
                                                        },
                                                    },
                                                })), placeholder: "e.g., 25-45", className: "w-full bg-primary border border-border rounded px-2 py-1.5 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent" })),
                                        react_1.default.createElement("div", null,
                                            react_1.default.createElement("label", { className: "text-[10px] text-muted uppercase" }, "Income Range"),
                                            react_1.default.createElement("input", { type: "text", value: buildData.users.demographics.incomeRange, onChange: (e) => setBuildData((prev) => ({
                                                    ...prev,
                                                    users: {
                                                        ...prev.users,
                                                        demographics: {
                                                            ...prev.users.demographics,
                                                            incomeRange: e.target.value,
                                                        },
                                                    },
                                                })), placeholder: "e.g., $50k-$100k", className: "w-full bg-primary border border-border rounded px-2 py-1.5 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent" })),
                                        react_1.default.createElement("div", null,
                                            react_1.default.createElement("label", { className: "text-[10px] text-muted uppercase" }, "Gender"),
                                            react_1.default.createElement("input", { type: "text", value: buildData.users.demographics.gender, onChange: (e) => setBuildData((prev) => ({
                                                    ...prev,
                                                    users: {
                                                        ...prev.users,
                                                        demographics: {
                                                            ...prev.users.demographics,
                                                            gender: e.target.value,
                                                        },
                                                    },
                                                })), placeholder: "e.g., All, Female, Male", className: "w-full bg-primary border border-border rounded px-2 py-1.5 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent" })),
                                        react_1.default.createElement("div", null,
                                            react_1.default.createElement("label", { className: "text-[10px] text-muted uppercase" }, "Location"),
                                            react_1.default.createElement("input", { type: "text", value: buildData.users.demographics.location, onChange: (e) => setBuildData((prev) => ({
                                                    ...prev,
                                                    users: {
                                                        ...prev.users,
                                                        demographics: {
                                                            ...prev.users.demographics,
                                                            location: e.target.value,
                                                        },
                                                    },
                                                })), placeholder: "e.g., Urban US, Global", className: "w-full bg-primary border border-border rounded px-2 py-1.5 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent" })),
                                        react_1.default.createElement("div", null,
                                            react_1.default.createElement("label", { className: "text-[10px] text-muted uppercase" }, "Education"),
                                            react_1.default.createElement("input", { type: "text", value: buildData.users.demographics.education, onChange: (e) => setBuildData((prev) => ({
                                                    ...prev,
                                                    users: {
                                                        ...prev.users,
                                                        demographics: {
                                                            ...prev.users.demographics,
                                                            education: e.target.value,
                                                        },
                                                    },
                                                })), placeholder: "e.g., College+, Any", className: "w-full bg-primary border border-border rounded px-2 py-1.5 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent" })),
                                        react_1.default.createElement("div", null,
                                            react_1.default.createElement("label", { className: "text-[10px] text-muted uppercase" }, "Occupation"),
                                            react_1.default.createElement("input", { type: "text", value: buildData.users.demographics.occupation, onChange: (e) => setBuildData((prev) => ({
                                                    ...prev,
                                                    users: {
                                                        ...prev.users,
                                                        demographics: {
                                                            ...prev.users.demographics,
                                                            occupation: e.target.value,
                                                        },
                                                    },
                                                })), placeholder: "e.g., Professionals, Students", className: "w-full bg-primary border border-border rounded px-2 py-1.5 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent" }))),
                                    react_1.default.createElement("div", null,
                                        react_1.default.createElement("label", { className: "text-[10px] text-muted uppercase" }, "Additional Context"),
                                        react_1.default.createElement("textarea", { value: buildData.users.description, onChange: (e) => setBuildData((prev) => ({
                                                ...prev,
                                                users: { ...prev.users, description: e.target.value },
                                            })), placeholder: "Describe user needs, pain points, behaviors...", className: "w-full bg-primary border border-border rounded px-3 py-2 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent resize-none min-h-[60px]" })))))))),
                react_1.default.createElement(BuildLogs_1.BuildLogs, { logs: buildLogs, onClear: () => setBuildLogs([]), onRetry: handleRetryGeneration }),
                react_1.default.createElement("div", { className: "shrink-0 p-4 border-t border-border bg-secondary" },
                    react_1.default.createElement("button", { onClick: () => {
                            const stepOrder = ['idea', 'users', 'features', 'team', 'stories', 'design'];
                            const currentIndex = stepOrder.indexOf(buildStep);
                            const nextStep = stepOrder[currentIndex + 1];
                            const demographicsStr = Object.entries(buildData.users.demographics)
                                .filter(([_, v]) => v)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(', ');
                            if (buildStep === 'idea') {
                                // Validate project title before proceeding (Requirements 11.1, 11.2, 11.3, 11.5)
                                if (!projectTitle.trim()) {
                                    setProjectTitleError('Please enter a project title');
                                    return;
                                }
                                // For existing projects (idea already completed), use the existing projectName
                                // and skip duplicate validation since we're editing, not creating
                                if (completedSteps.idea && projectName) {
                                    // Existing project - just save and advance
                                    saveCurrentStageData(true);
                                    setBuildStep('users');
                                    return;
                                }
                                // New project - validate for duplicates
                                if (projectTitleError) {
                                    // Don't proceed if there's a validation error
                                    return;
                                }
                                if (!sanitizedProjectName) {
                                    setProjectTitleError('Invalid project title');
                                    return;
                                }
                                // Use the sanitized project name from validation
                                const folderName = sanitizedProjectName;
                                setProjectName(folderName);
                                // Initialize the project directory FIRST before any file operations
                                // This creates the .personaut/{folderName}/ directory and build-log.json
                                vscode.postMessage({
                                    type: 'initialize-project',
                                    projectName: folderName,
                                    projectTitle: projectTitle.trim(),
                                });
                                // Add a log entry for project initialization
                                addBuildLog(`Initializing project: ${projectTitle.trim()}`, 'info');
                                // Analyze the idea with LLM (for generating PRD summary)
                                // Note: We do NOT ask the LLM to create files - the extension handles file persistence
                                // The stage file is saved via saveCurrentStageData below
                                const ideaPrompt = `
Analyze this project idea and provide a structured summary:
- Project Title: ${projectTitle.trim()}
- Idea: ${buildData.idea}

Provide a brief analysis including:
1. A one-sentence executive summary
2. Key potential features (3-5 bullet points)
3. Target audience description
4. Potential challenges or considerations

Format your response clearly for the user to review.`;
                                sendBuildMessage(ideaPrompt, []);
                                persistBuildLogEntry(`Starting build for project: ${projectTitle.trim()}`, 'system', 'idea');
                                // Refresh project history after a delay
                                setTimeout(() => {
                                    vscode.postMessage({ type: 'get-project-history' });
                                }, 3000);
                                // Save the idea stage file with the idea data (Requirements 1.2, 4.1, 4.2, 4.3, 11.4)
                                // Use overrideProjectName since projectName state isn't updated yet
                                saveCurrentStageData(true, folderName);
                                setCompletedSteps((prev) => ({ ...prev, idea: true }));
                                setBuildStep('users');
                            }
                            else if (buildStep === 'users') {
                                if (usersMode === 'personas') {
                                    // Mark users stage as complete using consolidated save function (Requirements 1.2, 4.1, 4.2, 4.3)
                                    if (projectName) {
                                        saveCurrentStageData(true);
                                        setCompletedSteps((prev) => ({ ...prev, users: true }));
                                    }
                                    if (nextStep) {
                                        setBuildStep(nextStep);
                                    }
                                }
                                else {
                                    if (generatedPersonas.length === 0) {
                                        // Generate 5 personas
                                        setUsersLoading(true);
                                        const personaPrompt = `
Generate 5 unique user personas based on these target demographics:
${demographicsStr}
${buildData.users.description ? `Additional context: ${buildData.users.description}` : ''}

For each persona:
1. Create a unique, realistic name
2. Randomly vary attributes within the demographic ranges provided
3. Write a detailed backstory (150-250 words)
4. Include personality traits, tech-savviness, and potential objections

Your Task:
Return a JSON block with the generated personas in this exact format:
\`\`\`json
[
  { "id": "1", "name": "Name", "age": "Age", "occupation": "Occupation", "backstory": "Backstory...", "attributes": { "trait": "value" } }
]
\`\`\`
`;
                                        // Use streaming content generation (Requirements 2.1, 2.2, 2.3)
                                        vscode.postMessage({
                                            type: 'generate-content-streaming',
                                            projectName,
                                            stage: 'users',
                                            prompt: personaPrompt,
                                            systemPrompt: 'You are an expert at creating detailed user personas. Generate realistic personas with unique names, backgrounds, and characteristics. Always output valid JSON.',
                                        });
                                        // Fallback timeout (streaming will send completion update)
                                        setTimeout(() => {
                                            if (usersLoading) {
                                                setUsersLoading(false);
                                            }
                                        }, 90000); // 90s timeout
                                    }
                                    else {
                                        // Personas already generated - save and mark complete
                                        if (projectName && generatedPersonas.length > 0) {
                                            saveCurrentStageData(true);
                                            setCompletedSteps((prev) => ({ ...prev, users: true }));
                                        }
                                        // Then advance to next step
                                        if (nextStep) {
                                            setBuildStep(nextStep);
                                        }
                                    }
                                }
                            }
                            else if (buildStep === 'features') {
                                if (featuresMode === 'define') {
                                    // Save features data using consolidated save function (Requirements 1.2, 4.1, 4.2, 4.3)
                                    if (projectName && buildData.features.length > 0) {
                                        saveCurrentStageData(true);
                                        setCompletedSteps((prev) => ({ ...prev, features: true }));
                                    }
                                    // Just advance - features already defined manually
                                    if (nextStep) {
                                        setBuildStep(nextStep);
                                    }
                                }
                                else if (generatedFeatures.length === 0) {
                                    // Generate mode - interview personas and populate features
                                    setFeaturesLoading(true);
                                    // Build persona list from either selected personas or generated personas
                                    let personaList;
                                    if (usersMode === 'personas' && selectedBuildPersonaIds.length > 0) {
                                        // Using selected personas from the user base
                                        personaList = selectedBuildPersonaIds
                                            .map((id) => {
                                            const p = buildPersonas.find((per) => per.id === id);
                                            return p
                                                ? `- ${p.name}: ${p.backstory ||
                                                    Object.entries(p.attributes || {})
                                                        .map(([k, v]) => `${k}: ${v}`)
                                                        .join(', ')}`
                                                : '';
                                        })
                                            .filter(Boolean)
                                            .join('\n');
                                    }
                                    else if (generatedPersonas.length > 0) {
                                        // Using generated personas from the previous step
                                        personaList = generatedPersonas
                                            .map((p) => `- ${p.name} (${p.occupation || 'User'}): ${p.backstory?.substring(0, 150) || 'Target user'}...`)
                                            .join('\n');
                                    }
                                    else {
                                        // Fallback - use demographics info
                                        const demoStr = Object.entries(buildData.users.demographics)
                                            .filter(([_, v]) => v)
                                            .map(([k, v]) => `${k}: ${v}`)
                                            .join(', ');
                                        personaList = `Target demographics: ${demoStr || 'General users'}`;
                                    }
                                    const featurePrompt = `Generate 5-7 features for this product:

PRODUCT IDEA: ${buildData.idea}

TARGET USERS:
${personaList}

OUTPUT FORMAT: Return ONLY a JSON code block with this exact structure:
\`\`\`json
{
  "features": [
    {"name": "Feature Name", "description": "Brief user benefit", "score": 8, "frequency": "Daily", "priority": "Must-Have", "personas": ["User1"]}
  ]
}
\`\`\`

RULES:
- Return ONLY the JSON block, no other text
- Include 5-7 features
- Score is 1-10 importance
- frequency: "Daily", "Weekly", or "Monthly"
- priority: "Must-Have", "Should-Have", or "Nice-to-Have"`;
                                    // Use streaming content generation (Requirements 2.1, 2.2, 2.3)
                                    vscode.postMessage({
                                        type: 'generate-content-streaming',
                                        projectName,
                                        stage: 'features',
                                        prompt: featurePrompt,
                                        systemPrompt: 'You are a JSON API. Output ONLY valid JSON in a code block. Never include explanatory text.',
                                    });
                                    // Fallback timeout (streaming will send completion update)
                                    setTimeout(() => {
                                        if (featuresLoading) {
                                            setFeaturesLoading(false);
                                        }
                                    }, 90000);
                                }
                                else {
                                    // Features already generated.
                                    // Save using consolidated save function (Requirements 1.2, 4.1, 4.2, 4.3)
                                    if (projectName && generatedFeatures.length > 0) {
                                        saveCurrentStageData(true);
                                        setCompletedSteps((prev) => ({ ...prev, features: true }));
                                    }
                                    // Update buildData with feature names (for consistency)
                                    setBuildData((prev) => ({
                                        ...prev,
                                        features: generatedFeatures.map((f) => f.name),
                                        users: { ...prev.users }, // trigger re-render if needed
                                    }));
                                    if (nextStep) {
                                        setBuildStep(nextStep);
                                    }
                                }
                            }
                            else if (buildStep === 'team') {
                                // Generate team and iteration flow document
                                const flowSteps = [...devFlowOrder, 'User Feedback'];
                                const teamPrompt = `
Review this team structure and development flow:

Team Members/Roles:
${buildData.team.map((role) => `- ${role}`).join('\n')}

Development Iteration Flow (in order):
${flowSteps.map((step, idx) => `${idx + 1}. ${step}`).join('\n')}

Please provide:
1. A brief assessment of the team composition
2. Key handoff points between roles
3. Any potential gaps or recommendations

This team configuration has been saved and will guide the development iteration process.`;
                                vscode.postMessage({
                                    type: 'user-input',
                                    mode: 'build',
                                    value: teamPrompt,
                                    contextFiles: [],
                                    settings,
                                });
                                // Mark team stage as complete using consolidated save function (Requirements 1.2, 4.1, 4.2, 4.3)
                                if (projectName) {
                                    saveCurrentStageData(true);
                                    setCompletedSteps((prev) => ({ ...prev, team: true }));
                                }
                                // Move to stories step and generate user stories
                                setBuildStep('stories');
                                setStoriesLoading(true);
                                // Generate user stories prompt
                                const featuresList = generatedFeatures.length > 0
                                    ? generatedFeatures.map((f) => f.name).join(', ')
                                    : buildData.features.join(', ');
                                const storiesPrompt = `
                You are a PM Agent generating user stories for this project.

                Project Idea: ${buildData.idea}
                Features to cover: ${featuresList}
                Team: ${buildData.team.join(', ')}

                Generate 3-5 user stories. For each story, provide:
                1. A clear title
                2. A brief description (1-2 sentences)
                3. 2-4 specific requirements
                4. 1-2 clarifying questions

                IMPORTANT: Limit each story to 1000 tokens max.

                Output as JSON in this format:
                \`\`\`json
                {
                  "stories": [
                {
                  "title": "Story Title",
                "description": "Brief description",
                "requirements": ["Req 1", "Req 2"],
                "clarifyingQuestions": ["Question 1?", "Question 2?"]
    }
                ]
}
                \`\`\`
                `;
                                // Use streaming content generation (Requirements 2.1, 2.2, 2.3)
                                vscode.postMessage({
                                    type: 'generate-content-streaming',
                                    projectName,
                                    stage: 'stories',
                                    prompt: storiesPrompt,
                                    systemPrompt: 'You are a product manager generating user stories. Create clear, actionable user stories with requirements and clarifying questions. Always output valid JSON with a stories array.',
                                });
                                // Fallback timeout (streaming will send completion update)
                                setTimeout(() => {
                                    if (storiesLoading) {
                                        setStoriesLoading(false);
                                    }
                                }, 90000);
                            }
                            else if (buildStep === 'stories') {
                                // Mark stories stage as complete using consolidated save function (Requirements 1.2, 4.1, 4.2, 4.3)
                                if (projectName) {
                                    saveCurrentStageData(true);
                                    setCompletedSteps((prev) => ({ ...prev, stories: true }));
                                }
                                // Advance from stories to design
                                if (nextStep) {
                                    setBuildStep(nextStep);
                                    // Auto-generate screens when entering design step if none exist
                                    if (nextStep === 'design' && generatedScreens.length === 0) {
                                        setTimeout(() => {
                                            setDesignLoading(true);
                                            addBuildLog('Auto-generating screens based on features and stories...', 'info');
                                            const featuresList = generatedFeatures.length > 0
                                                ? generatedFeatures.map((f) => f.name).join(', ')
                                                : buildData.features.join(', ');
                                            const storiesList = userStories.length > 0
                                                ? userStories.map((s) => s.title).join(', ')
                                                : '';
                                            const screenPrompt = `Generate key screens for this product:

PRODUCT: ${buildData.idea}
FEATURES: ${featuresList || 'Core features'}
USER STORIES: ${storiesList || 'Standard workflows'}

Generate 5-8 essential screens. For each screen provide:
- name: Screen name
- purpose: What the user achieves here
- uiElements: Key UI components (3-5 items)
- userActions: What the user can do (2-4 items)

OUTPUT FORMAT: Return ONLY a JSON code block:
\`\`\`json
{
  "screens": [
    {
      "name": "Screen Name",
      "purpose": "What user achieves",
      "uiElements": ["Header", "Form", "Button"],
      "userActions": ["Submit form", "Navigate"]
    }
  ]
}
\`\`\``;
                                            vscode.postMessage({
                                                type: 'generate-content-streaming',
                                                projectName,
                                                stage: 'design',
                                                prompt: screenPrompt,
                                                systemPrompt: 'You are a JSON API. Output ONLY valid JSON in a code block. Never include explanatory text.',
                                            });
                                            setTimeout(() => setDesignLoading(false), 45000);
                                        }, 500); // Small delay to let UI update first
                                    }
                                }
                            }
                            else {
                                // Other steps (design) - just advance
                                if (nextStep) {
                                    setBuildStep(nextStep);
                                }
                                else {
                                    // Final step - parse screens and start iteration loop
                                    // Extract screens from the design text (look for numbered items or lines)
                                    const designText = buildData.design || '';
                                    const screenLines = designText
                                        .split('\n')
                                        .filter((line) => line.trim())
                                        .filter((line) => /^\d+\./.test(line.trim()) || // Numbered lines
                                        /^-/.test(line.trim()) || // Bullet points
                                        /^[A-Z]/.test(line.trim()) // Capitalized starts
                                    )
                                        .map((line) => line.replace(/^[\d\.\-\s]+/, '').trim())
                                        .filter((line) => line.length > 0);
                                    // If no screens parsed, use default flow
                                    const screens = screenLines.length > 0
                                        ? screenLines.slice(0, 10) // Max 10 screens
                                        : ['Landing Page', 'Main Dashboard', 'Core Feature'];
                                    // Start the iteration loop
                                    startIterationLoop(screens);
                                }
                            }
                        }, disabled: buildStep === 'idea' &&
                            (!projectTitle.trim() ||
                                !!projectTitleError ||
                                !sanitizedProjectName ||
                                isCheckingProjectName ||
                                !buildData.idea.trim()), className: "w-full py-3 bg-accent text-accent-text font-bold rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2" },
                        react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, buildStep === 'design' ? (react_1.default.createElement("polygon", { points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2" })) : (react_1.default.createElement("polyline", { points: "9 18 15 12 9 6" }))),
                        buildStep === 'idea'
                            ? 'Save Idea & Next'
                            : buildStep === 'users' &&
                                usersMode === 'demographics' &&
                                generatedPersonas.length === 0
                                ? 'Generate Personas'
                                : buildStep === 'features' &&
                                    featuresMode === 'generate' &&
                                    generatedFeatures.length === 0
                                    ? 'Interview Users'
                                    : buildStep === 'design'
                                        ? 'Finish & Start Building'
                                        : 'Save & Next')))) : (react_1.default.createElement(react_1.default.Fragment, null,
                react_1.default.createElement("div", { className: "flex-1 overflow-y-auto p-4 space-y-6" },
                    messages.length === 0 && (react_1.default.createElement("div", { className: "text-center text-muted mt-6 flex flex-col items-center animate-fade-in" },
                        react_1.default.createElement("div", { className: "relative mb-3" },
                            react_1.default.createElement("div", { className: "absolute inset-0 bg-accent/20 blur-xl rounded-full" }),
                            react_1.default.createElement("img", { src: window.logoUri, alt: "Personaut Logo", className: "w-48 h-48 relative opacity-90 drop-shadow-lg personaut-logo" })),
                        react_1.default.createElement("h2", { className: "text-base font-bold text-primary mb-2 tracking-tight" }, "Stop building for imaginary users."),
                        react_1.default.createElement("p", { className: "text-xs max-w-[200px] mx-auto mb-4 text-secondary leading-relaxed" }, "Get real feedback from AI personas representing your actual target customers."))),
                    messages.map((msg, i) => (react_1.default.createElement("div", { key: i, className: `flex flex-col animate-fade-in ${msg.role === 'user' ? 'items-end' : 'items-start'}` },
                        react_1.default.createElement("div", { className: `max-w-[95%] shadow-sm ${msg.role === 'user'
                                ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3'
                                : msg.role === 'error'
                                    ? 'bg-red-900/20 border border-red-800/50 text-red-200 rounded-xl px-4 py-3'
                                    : 'w-full'}` }, msg.role !== 'user' && msg.role !== 'error' ? (react_1.default.createElement(ModelMessageContent, { text: msg.text })) : (react_1.default.createElement("div", { className: "whitespace-pre-wrap font-sans text-sm leading-relaxed" }, msg.text)))))),
                    isTyping && (react_1.default.createElement("div", { className: "flex flex-col items-start animate-fade-in" },
                        react_1.default.createElement("div", { className: "bg-secondary rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm" },
                            react_1.default.createElement("div", { className: "flex items-center gap-1" },
                                react_1.default.createElement("span", { className: "w-2 h-2 bg-accent rounded-full animate-bounce", style: { animationDelay: '0ms' } }),
                                react_1.default.createElement("span", { className: "w-2 h-2 bg-accent rounded-full animate-bounce", style: { animationDelay: '150ms' } }),
                                react_1.default.createElement("span", { className: "w-2 h-2 bg-accent rounded-full animate-bounce", style: { animationDelay: '300ms' } }))))),
                    iterationState.active && (react_1.default.createElement("div", { className: "bg-accent/10 border border-accent/30 rounded-xl p-4 mx-2" },
                        react_1.default.createElement("div", { className: "flex items-center justify-between mb-3" },
                            react_1.default.createElement("div", { className: "flex items-center gap-2" },
                                react_1.default.createElement("div", { className: "w-3 h-3 bg-accent rounded-full animate-pulse" }),
                                react_1.default.createElement("span", { className: "text-sm font-bold text-accent" }, "ITERATION LOOP ACTIVE")),
                            react_1.default.createElement("button", { onClick: () => setIterationState((prev) => ({ ...prev, active: false })), className: "text-xs text-muted hover:text-primary" }, "Stop Loop")),
                        react_1.default.createElement("div", { className: "text-xs text-secondary space-y-1 mb-3" },
                            react_1.default.createElement("div", null,
                                "\uD83D\uDCF1 Screen:",
                                ' ',
                                react_1.default.createElement("span", { className: "text-primary font-medium" }, iterationState.screenList[iterationState.currentScreen]),
                                ' ',
                                "(",
                                iterationState.currentScreen + 1,
                                "/",
                                iterationState.screenList.length,
                                ")"),
                            react_1.default.createElement("div", null,
                                "\uD83D\uDD04 Iteration:",
                                ' ',
                                react_1.default.createElement("span", { className: "text-primary font-medium" },
                                    "#",
                                    iterationState.iterationCount)),
                            react_1.default.createElement("div", null,
                                "\uD83D\uDC64 Current Step:",
                                ' ',
                                react_1.default.createElement("span", { className: "text-primary font-medium" }, [...devFlowOrder, 'User Feedback'][iterationState.currentTeamMemberIndex]),
                                !iterationState.stepComplete && (react_1.default.createElement("span", { className: "text-yellow-500 ml-2" }, "\u23F3 Generating...")),
                                iterationState.stepComplete && (react_1.default.createElement("span", { className: "text-green-500 ml-2" }, "\u2713 Complete")))),
                        react_1.default.createElement("div", { className: "flex items-center justify-between mb-3 p-2 bg-tertiary rounded-lg" },
                            react_1.default.createElement("span", { className: "text-xs text-secondary" }, "Auto-advance steps"),
                            react_1.default.createElement("button", { onClick: () => setIterationState((prev) => ({ ...prev, autoRun: !prev.autoRun })), className: `w-10 h-5 rounded-full transition-colors relative ${iterationState.autoRun ? 'bg-accent' : 'bg-gray-600'}` },
                                react_1.default.createElement("div", { className: `absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${iterationState.autoRun ? 'translate-x-5' : 'translate-x-0.5'}` }))),
                        iterationState.agentStatus && (react_1.default.createElement("div", { className: "flex items-center gap-2 mb-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg" },
                            react_1.default.createElement("div", { className: `w-2 h-2 rounded-full ${!iterationState.stepComplete ? 'bg-blue-400 animate-pulse' : 'bg-green-400'}` }),
                            react_1.default.createElement("span", { className: "text-xs text-blue-300" }, iterationState.agentStatus))),
                        iterationState.generatedFiles.length > 0 && (react_1.default.createElement("div", { className: "mb-3 px-2" },
                            react_1.default.createElement("div", { className: "text-[10px] text-muted uppercase mb-1 flex items-center gap-1" },
                                react_1.default.createElement("svg", { className: "w-3 h-3", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                                    react_1.default.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" })),
                                "Generated Artifacts"),
                            react_1.default.createElement("div", { className: "space-y-1" },
                                iterationState.generatedFiles.slice(-3).map((f, i) => (react_1.default.createElement("div", { key: i, className: "text-xs text-secondary truncate pl-2 border-l-2 border-accent/20 hover:border-accent transition-colors", title: f.path }, f.path.split('/').pop()))),
                                iterationState.generatedFiles.length > 3 && (react_1.default.createElement("div", { className: "text-[10px] text-muted pl-2" },
                                    "+ ",
                                    iterationState.generatedFiles.length - 3,
                                    " more"))))),
                        iterationState.currentAgent === 'user-feedback' && (react_1.default.createElement("div", { className: "mb-3" },
                            react_1.default.createElement("div", { className: "text-[10px] text-muted uppercase mb-1" }, "\uD83D\uDCF8 Screen Preview"),
                            iterationState.screenshotUrl ? (react_1.default.createElement("div", { className: "border border-border rounded-lg overflow-hidden" },
                                react_1.default.createElement("img", { src: iterationState.screenshotUrl, alt: "Screen preview", className: "w-full h-auto" }))) : (react_1.default.createElement("div", { className: "border border-dashed border-border rounded-lg p-4 text-center" }, iterationState.screenshotPending ? (react_1.default.createElement("div", { className: "flex items-center justify-center gap-2 text-xs text-muted" },
                                react_1.default.createElement("div", { className: "animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full" }),
                                "Capturing screenshot...")) : iterationState.screenshotError ? (react_1.default.createElement("div", { className: "space-y-2" },
                                react_1.default.createElement("div", { className: "text-xs text-red-400" },
                                    "\u26A0\uFE0F ",
                                    iterationState.screenshotError),
                                react_1.default.createElement("div", { className: "flex items-center gap-2 justify-center" },
                                    react_1.default.createElement("input", { type: "text", placeholder: "http://localhost:3000", defaultValue: "http://localhost:3000", id: "screenshot-url-input", className: "bg-primary border border-border rounded px-2 py-1 text-xs w-40" }),
                                    react_1.default.createElement("button", { onClick: () => {
                                            const urlInput = document.getElementById('screenshot-url-input');
                                            const url = urlInput?.value || 'http://localhost:3000';
                                            setIterationState((prev) => ({
                                                ...prev,
                                                screenshotPending: true,
                                                screenshotError: null,
                                            }));
                                            vscode.postMessage({
                                                type: 'capture-screenshot',
                                                url: url,
                                            });
                                            addBuildLog(`Retrying screenshot capture from ${url}...`, 'info');
                                        }, className: "text-xs bg-accent text-accent-text px-3 py-1 rounded hover:bg-accent-hover" }, "Retry")),
                                react_1.default.createElement("div", { className: "text-[10px] text-muted mt-1" }, "Common ports: 3000 (React/Next), 5173 (Vite), 4200 (Angular), 8080 (Vue)"))) : (react_1.default.createElement("div", { className: "space-y-2" },
                                react_1.default.createElement("div", { className: "text-xs text-muted" }, "No screenshot available."),
                                react_1.default.createElement("button", { onClick: () => {
                                        setIterationState((prev) => ({
                                            ...prev,
                                            screenshotPending: true,
                                        }));
                                        vscode.postMessage({
                                            type: 'capture-screenshot',
                                            url: 'http://localhost:3000',
                                        });
                                        addBuildLog('Attempting to capture screenshot...', 'info');
                                    }, className: "text-xs bg-accent text-accent-text px-3 py-1 rounded hover:bg-accent-hover" }, "Capture Screenshot"))))))),
                        iterationState.currentAgent === 'user-feedback' && (react_1.default.createElement("div", { className: "mb-3 p-3 bg-tertiary rounded-lg" },
                            react_1.default.createElement("div", { className: "flex items-center justify-between mb-2" },
                                react_1.default.createElement("span", { className: "text-[10px] text-muted uppercase" }, "User Ratings"),
                                iterationState.averageRating !== null && (react_1.default.createElement("div", { className: "flex items-center gap-1" },
                                    react_1.default.createElement("span", { className: `text-lg font-bold ${iterationState.averageRating >= 7
                                            ? 'text-green-400'
                                            : iterationState.averageRating >= 5
                                                ? 'text-yellow-400'
                                                : 'text-red-400'}` }, iterationState.averageRating.toFixed(1)),
                                    react_1.default.createElement("span", { className: "text-xs text-muted" }, "/10")))),
                            iterationState.userRatings.length > 0 ? (react_1.default.createElement("div", { className: "space-y-2" }, iterationState.userRatings.map((rating, idx) => (react_1.default.createElement("div", { key: idx, className: "flex items-center justify-between text-xs" },
                                react_1.default.createElement("span", { className: "text-secondary" }, rating.personaName),
                                react_1.default.createElement("div", { className: "flex items-center gap-2" },
                                    react_1.default.createElement("div", { className: "w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden" },
                                        react_1.default.createElement("div", { className: `h-full rounded-full ${rating.rating >= 7
                                                ? 'bg-green-400'
                                                : rating.rating >= 5
                                                    ? 'bg-yellow-400'
                                                    : 'bg-red-400'}`, style: { width: `${rating.rating * 10}%` } })),
                                    react_1.default.createElement("span", { className: "text-primary font-medium w-6" },
                                        rating.rating,
                                        "/10"))))))) : (react_1.default.createElement("div", { className: "flex items-center justify-center gap-2 py-2 text-xs text-muted" },
                                react_1.default.createElement("div", { className: "animate-pulse" }, "\u23F3"),
                                "Collecting feedback from personas...")))),
                        iterationState.consolidatedFeedback &&
                            iterationState.waitingForUserApproval && (react_1.default.createElement("div", { className: "mb-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg" },
                            react_1.default.createElement("div", { className: "text-[10px] text-orange-400 uppercase mb-2" }, "\uD83D\uDCCB Feedback Summary"),
                            react_1.default.createElement("div", { className: "text-xs text-secondary whitespace-pre-wrap max-h-32 overflow-y-auto" }, iterationState.consolidatedFeedback))),
                        iterationState.waitingForUserApproval && iterationState.stepComplete && (react_1.default.createElement("div", { className: "space-y-3" },
                            react_1.default.createElement("div", { className: "text-xs text-muted text-center py-2 border-y border-border/30" }, iterationState.averageRating !== null &&
                                iterationState.averageRating >= 7
                                ? '✅ Users are satisfied! Ready to move on.'
                                : iterationState.averageRating !== null &&
                                    iterationState.averageRating >= 5
                                    ? '⚠️ Some issues to address. Consider iterating.'
                                    : iterationState.averageRating !== null
                                        ? '❌ Users have concerns. Iteration recommended.'
                                        : 'Review the feedback and decide next steps.'),
                            react_1.default.createElement("div", { className: "flex gap-2" },
                                react_1.default.createElement("button", { onClick: () => continueIteration(true), className: "flex-1 py-2.5 px-3 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2" },
                                    react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
                                        react_1.default.createElement("polyline", { points: "20 6 9 17 4 12" })),
                                    "Approve & Next Screen"),
                                react_1.default.createElement("button", { onClick: () => continueIteration(false, iterationState.consolidatedFeedback ||
                                        'Address the feedback from the previous round.'), className: "flex-1 py-2.5 px-3 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2" },
                                    react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
                                        react_1.default.createElement("path", { d: "M23 4v6h-6" }),
                                        react_1.default.createElement("path", { d: "M1 20v-6h6" }),
                                        react_1.default.createElement("path", { d: "M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" })),
                                    "Iterate Again")))),
                        !iterationState.waitingForUserApproval &&
                            iterationState.stepComplete &&
                            !iterationState.autoRun && (react_1.default.createElement("button", { onClick: () => {
                                const teamFlow = [...devFlowOrder, 'User Feedback'];
                                const nextTeamMemberIndex = iterationState.currentTeamMemberIndex + 1;
                                if (nextTeamMemberIndex < teamFlow.length) {
                                    runIterationStep(iterationState.currentScreen, nextTeamMemberIndex, iterationState.screenList, teamFlow, iterationState.iterationCount);
                                }
                            }, className: "w-full py-2 bg-accent hover:bg-accent-hover text-accent-text text-xs font-bold rounded-lg transition-colors" },
                            "\u2192 Hand off to",
                            ' ',
                            [...devFlowOrder, 'User Feedback'][iterationState.currentTeamMemberIndex + 1] || 'User Feedback')),
                        !iterationState.waitingForUserApproval &&
                            iterationState.stepComplete &&
                            iterationState.autoRun && (react_1.default.createElement("div", { className: "text-xs text-accent text-center py-2" }, "\u23F3 Auto-advancing to next step...")))),
                    react_1.default.createElement("div", { ref: bottomRef })),
                status && (react_1.default.createElement("div", { className: "px-4 py-2 text-xs text-accent font-medium flex items-center gap-2 bg-secondary border-t border-border" },
                    react_1.default.createElement("span", { className: "animate-pulse" }, "\u25CF"),
                    " ",
                    status)),
                react_1.default.createElement("div", { className: "p-4 bg-secondary border-t border-border" },
                    contextFiles.length > 0 && (react_1.default.createElement("div", { className: "flex flex-wrap gap-2 mb-2" }, contextFiles.map((file, i) => (react_1.default.createElement("div", { key: i, className: "flex items-center gap-1 bg-tertiary text-primary text-xs px-2 py-1 rounded border border-border" },
                        react_1.default.createElement("span", { className: "truncate max-w-[150px]" }, file.path.split('/').pop()),
                        react_1.default.createElement("button", { onClick: () => setContextFiles((prev) => prev.filter((_, idx) => idx !== i)), className: "hover:text-white" }, "\u00D7")))))),
                    react_1.default.createElement("div", { className: "mb-2" },
                        react_1.default.createElement("select", { value: selectedChatPersona.id, onChange: (e) => {
                                const id = e.target.value;
                                if (id === 'default') {
                                    setSelectedChatPersona({ type: 'agent', id: 'default', name: 'Pippet' });
                                }
                                else if (id.startsWith('team-')) {
                                    const role = id.replace('team-', '');
                                    setSelectedChatPersona({
                                        type: 'team',
                                        id,
                                        name: role,
                                        context: `You ARE a ${role} on a software development team. Fully embody this role. 
                          
Respond EXACTLY as a real ${role} would - use their vocabulary, perspective, and priorities. 
Think about: What would a ${role} care about? What questions would they ask? What concerns would they raise?

When the user asks you questions or presents ideas, respond from YOUR perspective as the ${role}. 
Give your honest professional opinion. Push back if something doesn't make sense to you.
You are NOT an AI assistant - you ARE this team member having a real conversation.`,
                                    });
                                }
                                else if (id.startsWith('user-')) {
                                    const userId = id.replace('user-', '');
                                    const persona = buildPersonas.find((p) => p.id === userId);
                                    if (persona) {
                                        // Build detailed attributes
                                        const attributesList = Object.entries(persona.attributes || {})
                                            .map(([k, v]) => `${k}: ${v}`)
                                            .join(', ');
                                        setSelectedChatPersona({
                                            type: 'user',
                                            id,
                                            name: persona.name,
                                            context: `You ARE ${persona.name}. You must FULLY embody this person and respond EXACTLY as they would.

YOUR BACKGROUND: ${attributesList}
${persona.backstory ? `YOUR STORY: ${persona.backstory}` : ''}

CRITICAL INSTRUCTIONS:
- You ARE this real person, not an AI pretending to be them
- Respond using THEIR vocabulary, tone, and speech patterns
- Express genuine emotions - frustration, excitement, confusion, delight
- Use casual language, slang, or expressions this person would naturally use
- Share your honest opinions based on your background and experiences
- When asked about products or features, react as this person genuinely would
- Push back or ask clarifying questions like a real person would

The user wants to understand YOUR perspective. Be authentic, not helpful. Be YOU.`,
                                        });
                                    }
                                }
                            }, className: "w-full bg-tertiary border border-border rounded px-2 py-1 text-xs text-primary focus:outline-none focus:border-accent" },
                            react_1.default.createElement("option", { value: "default" }, "Pippet (Default)"),
                            buildData.team.length > 0 && (react_1.default.createElement("optgroup", { label: "Team Members" }, buildData.team.map((role) => (react_1.default.createElement("option", { key: `team-${role}`, value: `team-${role}` }, role))))),
                            buildPersonas.length > 0 && (react_1.default.createElement("optgroup", { label: "Target Users" }, buildPersonas.map((p) => (react_1.default.createElement("option", { key: `user-${p.id}`, value: `user-${p.id}` }, p.name))))))),
                    react_1.default.createElement("form", { onSubmit: handleSubmit, className: "flex flex-col gap-2" },
                        react_1.default.createElement("div", { className: "relative" },
                            react_1.default.createElement("textarea", { value: input, onChange: (e) => setInput(e.target.value), onKeyDown: (e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit(e);
                                    }
                                }, className: "w-full bg-primary border border-border rounded-lg p-3 text-sm text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none h-20", placeholder: "Ask me to do something... (Type @ to add context)" }),
                            react_1.default.createElement("button", { type: "button", onClick: handleAddActiveFile, className: "absolute bottom-2 right-2 text-secondary hover:text-accent transition-colors p-1", title: "Add Active File to Context" },
                                react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                                    react_1.default.createElement("path", { d: "M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" })))),
                        react_1.default.createElement("div", { className: "flex justify-between items-center" },
                            react_1.default.createElement("div", { className: "text-xs text-muted" }, input.includes('/') ? 'Command Mode' : 'Chat Mode'),
                            react_1.default.createElement("div", { className: "flex gap-2" },
                                status && (react_1.default.createElement("button", { type: "button", onClick: () => vscode.postMessage({ type: 'abort' }), className: "bg-red-600 px-3 py-1.5 rounded text-sm font-medium hover:bg-red-700 transition-colors text-white" }, "Stop")),
                                react_1.default.createElement("button", { type: "submit", disabled: !input.trim() && contextFiles.length === 0, className: "bg-accent text-accent-text px-4 py-1.5 rounded text-sm font-bold hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors" }, "Send"))))))),
            react_1.default.createElement("div", { className: "border-t border-border bg-secondary px-4 py-2" },
                react_1.default.createElement("div", { className: "flex gap-1" },
                    react_1.default.createElement("button", { onClick: () => {
                            setMode('chat');
                            setScreenshot(null);
                        }, className: `flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-all ${mode === 'chat'
                            ? 'bg-accent-dim text-accent border border-accent/30'
                            : 'text-secondary hover:text-primary hover:bg-tertiary'}` },
                        react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                            react_1.default.createElement("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" })),
                        "Chat"),
                    react_1.default.createElement("button", { onClick: () => setMode('feedback'), className: `flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-all ${mode === 'feedback'
                            ? 'bg-accent-dim text-accent border border-accent/30'
                            : 'text-secondary hover:text-primary hover:bg-tertiary'}` },
                        react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                            react_1.default.createElement("path", { d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" }),
                            react_1.default.createElement("circle", { cx: "12", cy: "12", r: "3" })),
                        "Feedback"),
                    react_1.default.createElement("button", { onClick: () => {
                            vscode.postMessage({ type: 'clear-build-context' });
                            setMode('build');
                        }, className: `flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-all ${mode === 'build'
                            ? 'bg-accent-dim text-accent border border-accent/30'
                            : 'text-secondary hover:text-primary hover:bg-tertiary'}` },
                        react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                            react_1.default.createElement("path", { d: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" }),
                            react_1.default.createElement("polyline", { points: "7.5 4.21 12 6.81 16.5 4.21" }),
                            react_1.default.createElement("polyline", { points: "7.5 19.79 7.5 14.6 3 12" }),
                            react_1.default.createElement("polyline", { points: "21 12 16.5 14.6 16.5 19.79" }),
                            react_1.default.createElement("polyline", { points: "3.27 6.96 12 12.01 20.73 6.96" }),
                            react_1.default.createElement("line", { x1: "12", y1: "22.08", x2: "12", y2: "12" })),
                        "Build")))))));
}
//# sourceMappingURL=App.js.map