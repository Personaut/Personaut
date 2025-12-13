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
exports.FeedbackTab = void 0;
const react_1 = __importStar(require("react"));
const FeedbackTab = ({ vscode }) => {
    const [personas, setPersonas] = (0, react_1.useState)([]);
    const [selectedPersonaIds, setSelectedPersonaIds] = (0, react_1.useState)([]);
    const [context, setContext] = (0, react_1.useState)('');
    const [feedbackType, setFeedbackType] = (0, react_1.useState)('individual');
    const [feedbackUrl, setFeedbackUrl] = (0, react_1.useState)('');
    const [screenshot, setScreenshot] = (0, react_1.useState)(null);
    const [isCapturing, setIsCapturing] = (0, react_1.useState)(false);
    const [isGenerating, setIsGenerating] = (0, react_1.useState)(false);
    const [generatedFeedback, setGeneratedFeedback] = (0, react_1.useState)(null);
    const [progress, setProgress] = (0, react_1.useState)('');
    // New state for image source selection
    const [imageSource, setImageSource] = (0, react_1.useState)('url');
    const [isDragging, setIsDragging] = (0, react_1.useState)(false);
    const [isPasteAreaFocused, setIsPasteAreaFocused] = (0, react_1.useState)(false);
    // Feedback history state
    const [view, setView] = (0, react_1.useState)('form');
    const [feedbackHistory, setFeedbackHistory] = (0, react_1.useState)([]);
    const [selectedHistoryEntry, setSelectedHistoryEntry] = (0, react_1.useState)(null);
    // Ref for file input
    const fileInputRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        // Load personas and feedback history
        vscode.postMessage({ type: 'get-personas' });
        vscode.postMessage({ type: 'get-feedback-history' });
        const handleMessage = (event) => {
            const message = event.data;
            switch (message.type) {
                case 'personas-loaded':
                    setPersonas(message.personas);
                    break;
                case 'screenshot-captured':
                    setScreenshot(message.screenshot);
                    setIsCapturing(false);
                    break;
                case 'screenshot-error':
                    setIsCapturing(false);
                    // Handle error (maybe show toast)
                    break;
                case 'feedback-generated':
                    setGeneratedFeedback(message.content);
                    setIsGenerating(false);
                    setProgress('');
                    // Refresh history after new feedback
                    vscode.postMessage({ type: 'get-feedback-history' });
                    break;
                case 'feedback-progress':
                    setProgress(message.message);
                    break;
                case 'feedback-error':
                    setIsGenerating(false);
                    setProgress('');
                    setGeneratedFeedback(`Error: ${message.message}`);
                    break;
                case 'feedback-history-updated':
                    setFeedbackHistory(message.history);
                    break;
                case 'data-reset-complete':
                    setFeedbackHistory([]);
                    setPersonas([]);
                    setSelectedPersonaIds([]);
                    setGeneratedFeedback(null);
                    setScreenshot(null);
                    setContext('');
                    setFeedbackUrl('');
                    setSelectedHistoryEntry(null);
                    setView('form');
                    break;
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);
    const handlePersonaToggle = (id) => {
        if (selectedPersonaIds.includes(id)) {
            setSelectedPersonaIds((prev) => prev.filter((pId) => pId !== id));
        }
        else {
            if (selectedPersonaIds.length < 5) {
                setSelectedPersonaIds((prev) => [...prev, id]);
            }
        }
    };
    const handleCapture = () => {
        if (feedbackUrl.trim()) {
            console.log('[FeedbackTab] Capturing screenshot for URL:', feedbackUrl.trim());
            setIsCapturing(true);
            setScreenshot(null);
            vscode.postMessage({ type: 'capture-screenshot', url: feedbackUrl.trim() });
        }
    };
    // Convert file to base64
    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };
    // Handle file selection from input
    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            try {
                const base64 = await fileToBase64(file);
                setScreenshot(base64);
            }
            catch (err) {
                console.error('[FeedbackTab] Error reading file:', err);
            }
        }
    };
    // Drag and drop handlers
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };
    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };
    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            try {
                const base64 = await fileToBase64(file);
                setScreenshot(base64);
            }
            catch (err) {
                console.error('[FeedbackTab] Error reading dropped file:', err);
            }
        }
    };
    // Handle clipboard paste
    const handlePaste = async (e) => {
        const items = e.clipboardData?.items;
        if (!items) {
            return;
        }
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                    try {
                        const base64 = await fileToBase64(file);
                        setScreenshot(base64);
                    }
                    catch (err) {
                        console.error('[FeedbackTab] Error reading pasted image:', err);
                    }
                }
                break;
            }
        }
    };
    const handleGenerate = () => {
        console.log('[FeedbackTab] Generate clicked. Screenshot:', !!screenshot, 'Personas:', selectedPersonaIds.length);
        if (!screenshot || selectedPersonaIds.length === 0) {
            console.log('[FeedbackTab] Cannot generate - missing screenshot or personas');
            return;
        }
        setIsGenerating(true);
        setGeneratedFeedback(null);
        setProgress('Starting generation...');
        vscode.postMessage({
            type: 'generate-feedback',
            data: {
                context,
                feedbackType,
                personaIds: selectedPersonaIds,
                url: feedbackUrl,
                screenshot, // Pass the base64 screenshot
            },
        });
    };
    // Determine why button might be disabled
    const getButtonStatus = () => {
        if (isGenerating) {
            return null;
        }
        if (!screenshot && selectedPersonaIds.length === 0) {
            return 'Capture a screenshot and select personas';
        }
        if (!screenshot) {
            return 'Capture a screenshot first';
        }
        if (selectedPersonaIds.length === 0) {
            return 'Select at least one persona';
        }
        return null;
    };
    const buttonStatus = getButtonStatus();
    // Format timestamp for display
    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };
    // Delete a history entry
    const handleDeleteHistory = (id, e) => {
        e.stopPropagation();
        vscode.postMessage({ type: 'delete-feedback', id });
    };
    // View a history entry
    const handleViewHistory = (entry) => {
        setSelectedHistoryEntry(entry);
    };
    return (react_1.default.createElement("div", { className: "flex flex-col h-full bg-primary text-secondary p-4 overflow-y-auto" },
        react_1.default.createElement("div", { className: "flex items-center justify-between mb-6" },
            react_1.default.createElement("h2", { className: "text-sm font-bold text-primary uppercase tracking-widest" }, "Get Persona Feedback"),
            react_1.default.createElement("button", { onClick: () => {
                    if (view === 'history') {
                        setView('form');
                        setSelectedHistoryEntry(null);
                    }
                    else {
                        setView('history');
                    }
                }, className: `flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${view === 'history'
                    ? 'bg-accent/20 text-accent border border-accent/30'
                    : 'text-secondary hover:text-white bg-secondary border border-border'}` },
                react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                    react_1.default.createElement("circle", { cx: "12", cy: "12", r: "10" }),
                    react_1.default.createElement("polyline", { points: "12 6 12 12 16 14" })),
                "History",
                feedbackHistory.length > 0 && ` (${feedbackHistory.length})`)),
        view === 'history' && !selectedHistoryEntry && (react_1.default.createElement("div", { className: "flex-1" }, feedbackHistory.length === 0 ? (react_1.default.createElement("div", { className: "text-center text-muted py-8" },
            react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "32", height: "32", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", className: "mx-auto mb-3 opacity-50" },
                react_1.default.createElement("circle", { cx: "12", cy: "12", r: "10" }),
                react_1.default.createElement("polyline", { points: "12 6 12 12 16 14" })),
            react_1.default.createElement("p", { className: "text-sm" }, "No feedback history yet"),
            react_1.default.createElement("p", { className: "text-xs mt-1 text-secondary" }, "Generate feedback to see it here"))) : (react_1.default.createElement("div", { className: "space-y-2" }, feedbackHistory.map((entry) => (react_1.default.createElement("div", { key: entry.id, onClick: () => handleViewHistory(entry), className: "flex items-start gap-3 p-3 bg-secondary border border-border rounded-lg hover:border-border/80 cursor-pointer transition-colors group" },
            react_1.default.createElement("div", { className: `flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${entry.feedbackType === 'group'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-accent/20 text-accent'}` }, entry.feedbackType === 'group' ? 'G' : 'I'),
            react_1.default.createElement("div", { className: "flex-1 min-w-0" },
                react_1.default.createElement("div", { className: "text-sm font-medium text-primary truncate" }, entry.title),
                react_1.default.createElement("div", { className: "text-xs text-secondary mt-0.5" },
                    entry.personaNames.join(', '),
                    " \u2022 ",
                    formatDate(entry.timestamp))),
            react_1.default.createElement("button", { onClick: (e) => handleDeleteHistory(entry.id, e), className: "opacity-0 group-hover:opacity-100 text-secondary hover:text-red-400 transition-opacity p-1", title: "Delete", "aria-label": `Delete feedback: ${entry.title}` },
                react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                    react_1.default.createElement("polyline", { points: "3 6 5 6 21 6" }),
                    react_1.default.createElement("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" })))))))))),
        view === 'history' && selectedHistoryEntry && (react_1.default.createElement("div", { className: "flex-1" },
            react_1.default.createElement("button", { onClick: () => setSelectedHistoryEntry(null), className: "flex items-center gap-1 text-xs text-secondary hover:text-white mb-4" },
                react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                    react_1.default.createElement("polyline", { points: "15 18 9 12 15 6" })),
                "Back to history"),
            react_1.default.createElement("div", { className: "bg-secondary border border-border rounded-lg p-4" },
                react_1.default.createElement("div", { className: "flex items-start justify-between mb-3" },
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("h3", { className: "text-sm font-bold text-primary" }, selectedHistoryEntry.title),
                        react_1.default.createElement("div", { className: "text-xs text-secondary mt-1" },
                            react_1.default.createElement("span", { className: `inline-block px-1.5 py-0.5 rounded text-[10px] mr-2 ${selectedHistoryEntry.feedbackType === 'group'
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-accent/20 text-accent'}` }, selectedHistoryEntry.feedbackType === 'group' ? 'Group' : 'Individual'),
                            formatDate(selectedHistoryEntry.timestamp)))),
                selectedHistoryEntry.url && (react_1.default.createElement("div", { className: "text-xs text-secondary mb-3" },
                    "URL: ",
                    react_1.default.createElement("span", { className: "text-muted" }, selectedHistoryEntry.url))),
                react_1.default.createElement("div", { className: "text-xs text-secondary mb-3" },
                    "Personas:",
                    ' ',
                    react_1.default.createElement("span", { className: "text-muted" }, selectedHistoryEntry.personaNames.join(', '))),
                selectedHistoryEntry.context && (react_1.default.createElement("div", { className: "text-xs text-secondary mb-3" },
                    "Context: ",
                    react_1.default.createElement("span", { className: "text-muted" }, selectedHistoryEntry.context))),
                react_1.default.createElement("div", { className: "border-t border-border pt-3 mt-3" },
                    react_1.default.createElement("div", { className: "text-sm text-secondary leading-relaxed whitespace-pre-wrap" }, selectedHistoryEntry.content))))),
        view === 'form' && (react_1.default.createElement(react_1.default.Fragment, null,
            react_1.default.createElement("div", { className: "mb-6" },
                react_1.default.createElement("label", { className: "block text-xs font-bold text-muted uppercase tracking-wider mb-2" }, "Context"),
                react_1.default.createElement("textarea", { value: context, onChange: (e) => setContext(e.target.value), placeholder: "Describe the context of what needs feedback (e.g., 'This is a landing page for a new coffee brand targeting young professionals...')", className: "w-full bg-secondary border border-border rounded-lg p-3 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent min-h-[80px]" })),
            react_1.default.createElement("div", { className: "mb-6" },
                react_1.default.createElement("label", { className: "block text-xs font-bold text-muted uppercase tracking-wider mb-2" }, "Feedback Type"),
                react_1.default.createElement("div", { className: "flex gap-4" },
                    react_1.default.createElement("label", { className: "flex items-center gap-2 cursor-pointer" },
                        react_1.default.createElement("input", { type: "radio", checked: feedbackType === 'individual', onChange: () => setFeedbackType('individual'), className: "accent-accent" }),
                        react_1.default.createElement("span", { className: "text-sm" }, "Individual")),
                    react_1.default.createElement("label", { className: "flex items-center gap-2 cursor-pointer" },
                        react_1.default.createElement("input", { type: "radio", checked: feedbackType === 'group', onChange: () => setFeedbackType('group'), className: "accent-accent" }),
                        react_1.default.createElement("span", { className: "text-sm" }, "Group (Consolidated)")))),
            react_1.default.createElement("div", { className: "mb-6" },
                react_1.default.createElement("div", { className: "flex justify-between items-center mb-2" },
                    react_1.default.createElement("label", { className: "block text-xs font-bold text-muted uppercase tracking-wider" }, "Select Personas (Max 5)"),
                    react_1.default.createElement("span", { className: "text-xs text-muted" },
                        selectedPersonaIds.length,
                        "/5 selected")),
                react_1.default.createElement("div", { className: "bg-secondary border border-border rounded-lg max-h-40 overflow-y-auto p-2" }, personas.length === 0 ? (react_1.default.createElement("div", { className: "text-center text-muted text-xs py-4" }, "No personas found. Create some in the User Base tab!")) : (personas.map((persona) => (react_1.default.createElement("label", { key: persona.id, className: `flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-tertiary ${selectedPersonaIds.includes(persona.id) ? 'bg-accent/10' : ''}` },
                    react_1.default.createElement("input", { type: "checkbox", checked: selectedPersonaIds.includes(persona.id), onChange: () => handlePersonaToggle(persona.id), disabled: !selectedPersonaIds.includes(persona.id) && selectedPersonaIds.length >= 5, className: "accent-accent" }),
                    react_1.default.createElement("div", { className: "flex-1 min-w-0" },
                        react_1.default.createElement("div", { className: "text-sm font-medium text-primary truncate" }, persona.name),
                        react_1.default.createElement("div", { className: "text-xs text-secondary truncate" },
                            Object.keys(persona.attributes).length,
                            " traits")))))))),
            react_1.default.createElement("div", { className: "mb-6" },
                react_1.default.createElement("label", { className: "block text-xs font-bold text-muted uppercase tracking-wider mb-2" }, "Image Source"),
                react_1.default.createElement("div", { className: "flex gap-1 mb-3" },
                    react_1.default.createElement("button", { onClick: () => setImageSource('url'), className: `flex-1 px-3 py-2 text-xs rounded-lg transition-colors ${imageSource === 'url'
                            ? 'bg-accent/20 text-accent border border-accent/30'
                            : 'bg-secondary text-secondary hover:text-white border border-border'}` },
                        react_1.default.createElement("div", { className: "flex items-center justify-center gap-1.5" },
                            react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                                react_1.default.createElement("path", { d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" }),
                                react_1.default.createElement("path", { d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" })),
                            "URL Capture")),
                    react_1.default.createElement("button", { onClick: () => setImageSource('upload'), className: `flex-1 px-3 py-2 text-xs rounded-lg transition-colors ${imageSource === 'upload'
                            ? 'bg-accent/20 text-accent border border-accent/30'
                            : 'bg-secondary text-secondary hover:text-white border border-border'}` },
                        react_1.default.createElement("div", { className: "flex items-center justify-center gap-1.5" },
                            react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                                react_1.default.createElement("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
                                react_1.default.createElement("polyline", { points: "17 8 12 3 7 8" }),
                                react_1.default.createElement("line", { x1: "12", y1: "3", x2: "12", y2: "15" })),
                            "Upload")),
                    react_1.default.createElement("button", { onClick: () => setImageSource('clipboard'), className: `flex-1 px-3 py-2 text-xs rounded-lg transition-colors ${imageSource === 'clipboard'
                            ? 'bg-accent/20 text-accent border border-accent/30'
                            : 'bg-secondary text-secondary hover:text-white border border-border'}` },
                        react_1.default.createElement("div", { className: "flex items-center justify-center gap-1.5" },
                            react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                                react_1.default.createElement("rect", { x: "9", y: "9", width: "13", height: "13", rx: "2", ry: "2" }),
                                react_1.default.createElement("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })),
                            "Paste"))),
                imageSource === 'url' && (react_1.default.createElement("div", { className: "space-y-2" },
                    react_1.default.createElement("div", { className: "flex gap-2" },
                        react_1.default.createElement("input", { type: "url", value: feedbackUrl, onChange: (e) => setFeedbackUrl(e.target.value), placeholder: "https://example.com", className: "flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent" }),
                        react_1.default.createElement("button", { onClick: handleCapture, disabled: !feedbackUrl.trim() || isCapturing, className: "px-4 py-2 text-xs font-bold bg-tertiary text-primary rounded-lg hover:bg-tertiary/80 disabled:opacity-50 transition-colors" }, isCapturing ? 'Capturing...' : 'Capture')),
                    react_1.default.createElement("p", { className: "text-[10px] text-muted" }, "Enter a URL and click Capture to take a screenshot"))),
                imageSource === 'upload' && (react_1.default.createElement("div", { className: "space-y-2" },
                    react_1.default.createElement("div", { className: `relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer hover:border-accent/50 ${isDragging ? 'border-accent bg-accent/10' : 'border-border'}`, onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop, onClick: () => fileInputRef.current?.click() },
                        react_1.default.createElement("input", { ref: fileInputRef, type: "file", accept: "image/*", onChange: handleFileSelect, className: "hidden" }),
                        react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "mx-auto mb-2 text-muted" },
                            react_1.default.createElement("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2", ry: "2" }),
                            react_1.default.createElement("circle", { cx: "8.5", cy: "8.5", r: "1.5" }),
                            react_1.default.createElement("polyline", { points: "21 15 16 10 5 21" })),
                        react_1.default.createElement("p", { className: "text-sm text-secondary" }, isDragging ? 'Drop image here' : 'Click or drag image here'),
                        react_1.default.createElement("p", { className: "text-[10px] text-muted mt-1" }, "PNG, JPG, GIF up to 10MB")))),
                imageSource === 'clipboard' && (react_1.default.createElement("div", { className: "space-y-2" },
                    react_1.default.createElement("div", { className: `relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer hover:border-accent/50 ${isPasteAreaFocused ? 'border-accent bg-accent/10' : 'border-border'}`, tabIndex: 0, onFocus: () => setIsPasteAreaFocused(true), onBlur: () => setIsPasteAreaFocused(false), onPaste: handlePaste, onClick: (e) => e.target.focus() },
                        react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "mx-auto mb-2 text-muted" },
                            react_1.default.createElement("rect", { x: "9", y: "9", width: "13", height: "13", rx: "2", ry: "2" }),
                            react_1.default.createElement("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })),
                        react_1.default.createElement("p", { className: "text-sm text-secondary" }, isPasteAreaFocused
                            ? 'Press Ctrl+V / Cmd+V to paste'
                            : 'Click here and paste screenshot'),
                        react_1.default.createElement("p", { className: "text-[10px] text-muted mt-1" }, "Take a screenshot and paste it directly")))),
                screenshot && (react_1.default.createElement("div", { className: "mt-3 relative rounded-lg overflow-hidden border border-border bg-black/50" },
                    react_1.default.createElement("img", { src: screenshot, alt: "Preview", className: "w-full h-32 object-contain" }),
                    react_1.default.createElement("button", { onClick: () => setScreenshot(null), className: "absolute top-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded hover:bg-red-600 transition-colors", title: "Remove image", "aria-label": "Remove screenshot image" }, "\u2715"),
                    react_1.default.createElement("div", { className: "absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded" }, "Image Ready")))),
            buttonStatus && (react_1.default.createElement("div", { className: "text-xs text-accent/80 mb-2 text-center" },
                "\u26A0 ",
                buttonStatus)),
            react_1.default.createElement("button", { onClick: handleGenerate, disabled: isGenerating || !screenshot || selectedPersonaIds.length === 0, className: "w-full py-3 bg-accent text-accent-text font-bold rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-black/20 mb-6 flex items-center justify-center gap-2" }, isGenerating ? (react_1.default.createElement(react_1.default.Fragment, null,
                react_1.default.createElement("svg", { className: "animate-spin h-4 w-4 text-black", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24" },
                    react_1.default.createElement("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }),
                    react_1.default.createElement("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })),
                progress || 'Generating Feedback...')) : (react_1.default.createElement(react_1.default.Fragment, null,
                react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                    react_1.default.createElement("path", { d: "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" })),
                "Generate Feedback"))),
            generatedFeedback && (react_1.default.createElement("div", { className: "bg-secondary border border-border rounded-lg p-4 animate-in fade-in slide-in-from-bottom-4 duration-500" },
                react_1.default.createElement("h3", { className: "text-sm font-bold text-accent mb-3 uppercase tracking-wider" }, feedbackType === 'group' ? 'Consolidated Feedback' : 'Persona Feedback'),
                react_1.default.createElement("div", { className: "text-sm text-secondary leading-relaxed whitespace-pre-wrap" }, generatedFeedback)))))));
};
exports.FeedbackTab = FeedbackTab;
//# sourceMappingURL=FeedbackTab.js.map