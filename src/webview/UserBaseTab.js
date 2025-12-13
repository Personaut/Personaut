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
exports.UserBaseTab = void 0;
const react_1 = __importStar(require("react"));
const UserBaseTab = ({ vscode }) => {
    const [personas, setPersonas] = (0, react_1.useState)([]);
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [selectedPersona, setSelectedPersona] = (0, react_1.useState)(null);
    const [isEditing, setIsEditing] = (0, react_1.useState)(false);
    const [isGeneratingBackstory, setIsGeneratingBackstory] = (0, react_1.useState)(false);
    const [showTeamTemplates, setShowTeamTemplates] = (0, react_1.useState)(false);
    // Form state
    const [personaName, setPersonaName] = (0, react_1.useState)('');
    const [attributeRows, setAttributeRows] = (0, react_1.useState)([]);
    const [saveStatus, setSaveStatus] = (0, react_1.useState)('idle');
    // Default team personas
    const teamTemplates = [
        {
            name: 'UX Designer',
            attributes: {
                Role: 'UX Designer',
                Focus: 'User experience, visual design, accessibility',
                Perspective: 'Evaluates usability, visual hierarchy, and user flow',
                Concerns: 'Accessibility compliance, design consistency, user delight',
                'Technical Level': 'Moderate - understands frontend constraints',
            },
        },
        {
            name: 'Software Developer',
            attributes: {
                Role: 'Software Developer',
                Focus: 'Code quality, architecture, maintainability',
                Perspective: 'Evaluates technical implementation and scalability',
                Concerns: 'Performance, security, code complexity, technical debt',
                'Technical Level': 'High - deep understanding of systems',
            },
        },
        {
            name: 'Data Engineer',
            attributes: {
                Role: 'Data Engineer',
                Focus: 'Data pipelines, analytics, data quality',
                Perspective: 'Evaluates data architecture and analytics capabilities',
                Concerns: 'Data integrity, pipeline reliability, query performance',
                'Technical Level': 'High - expertise in data systems',
            },
        },
        {
            name: 'Product Manager',
            attributes: {
                Role: 'Product Manager',
                Focus: 'Product strategy, user needs, business value',
                Perspective: 'Evaluates feature value and market fit',
                Concerns: 'User adoption, competitive advantage, ROI',
                'Technical Level': 'Moderate - understands technical tradeoffs',
            },
        },
        {
            name: 'QA Engineer',
            attributes: {
                Role: 'QA Engineer',
                Focus: 'Quality assurance, testing, edge cases',
                Perspective: 'Evaluates reliability and edge case handling',
                Concerns: 'Bug prevention, test coverage, regression risks',
                'Technical Level': 'High - understands system behavior deeply',
            },
        },
        {
            name: 'DevOps Engineer',
            attributes: {
                Role: 'DevOps Engineer',
                Focus: 'Infrastructure, deployment, monitoring',
                Perspective: 'Evaluates operational readiness and reliability',
                Concerns: 'Deployment complexity, monitoring, incident response',
                'Technical Level': 'High - expertise in infrastructure',
            },
        },
    ];
    // Load personas on mount
    (0, react_1.useEffect)(() => {
        vscode.postMessage({ type: 'get-personas' });
    }, []);
    // Listen for messages from extension
    (0, react_1.useEffect)(() => {
        const handleMessage = (event) => {
            const message = event.data;
            switch (message.type) {
                case 'personas-loaded':
                    setPersonas(message.personas);
                    break;
                case 'persona-saved':
                    setSaveStatus('saved');
                    vscode.postMessage({ type: 'get-personas' });
                    setTimeout(() => setSaveStatus('idle'), 2000);
                    if (message.persona) {
                        setSelectedPersona(message.persona);
                    }
                    setIsEditing(false);
                    break;
                case 'persona-deleted':
                    vscode.postMessage({ type: 'get-personas' });
                    setSelectedPersona(null);
                    resetForm();
                    break;
                case 'persona-error':
                    setSaveStatus('error');
                    setTimeout(() => setSaveStatus('idle'), 3000);
                    break;
                case 'backstory-generated':
                    setIsGeneratingBackstory(false);
                    if (message.persona) {
                        setSelectedPersona(message.persona);
                        // Refresh personas list
                        vscode.postMessage({ type: 'get-personas' });
                    }
                    break;
                case 'backstory-error':
                    setIsGeneratingBackstory(false);
                    break;
                case 'data-reset-complete':
                    setPersonas([]);
                    setSelectedPersona(null);
                    resetForm();
                    break;
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);
    const resetForm = () => {
        setPersonaName('');
        setAttributeRows([]);
        setIsEditing(false);
    };
    const handleNewPersona = () => {
        setSelectedPersona(null);
        setPersonaName('');
        setAttributeRows([{ id: crypto.randomUUID(), key: '', value: '' }]);
        setIsEditing(true);
    };
    const handleSelectPersona = (persona) => {
        setSelectedPersona(persona);
        setPersonaName(persona.name);
        setAttributeRows(Object.entries(persona.attributes).map(([key, value]) => ({
            id: crypto.randomUUID(),
            key,
            value,
        })));
        setIsEditing(false);
    };
    const handleEditPersona = () => {
        setIsEditing(true);
    };
    const handleAddTeamTemplate = (template) => {
        // Check if persona with this name already exists
        const exists = personas.some((p) => p.name.toLowerCase() === template.name.toLowerCase());
        if (exists) {
            // Just close the modal if it already exists
            setShowTeamTemplates(false);
            return;
        }
        vscode.postMessage({
            type: 'save-persona',
            name: template.name,
            attributes: template.attributes,
        });
        setShowTeamTemplates(false);
    };
    const handleAddAttribute = () => {
        setAttributeRows((prev) => [...prev, { id: crypto.randomUUID(), key: '', value: '' }]);
    };
    const handleRemoveAttribute = (id) => {
        setAttributeRows((prev) => prev.filter((row) => row.id !== id));
    };
    const handleAttributeChange = (id, field, newValue) => {
        setAttributeRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: newValue } : row)));
    };
    const handleSave = () => {
        if (!personaName.trim()) {
            setSaveStatus('error');
            return;
        }
        setSaveStatus('saving');
        // Convert attribute rows to object (filter out empty keys)
        const attributes = {};
        attributeRows.forEach((row) => {
            if (row.key.trim()) {
                attributes[row.key.trim()] = row.value.trim();
            }
        });
        vscode.postMessage({
            type: 'save-persona',
            id: selectedPersona?.id,
            name: personaName.trim(),
            attributes,
        });
    };
    const handleDelete = () => {
        if (selectedPersona) {
            vscode.postMessage({
                type: 'delete-persona',
                id: selectedPersona.id,
            });
        }
    };
    const handleGeneratePrompt = () => {
        if (selectedPersona) {
            vscode.postMessage({
                type: 'generate-persona-prompt',
                id: selectedPersona.id,
            });
        }
    };
    const filteredPersonas = personas.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return (react_1.default.createElement("div", { className: "flex flex-col h-full" },
        react_1.default.createElement("div", { className: "flex items-center justify-between px-4 py-3 bg-secondary border-b border-border" },
            react_1.default.createElement("h2", { className: "text-xs font-bold text-muted uppercase tracking-widest" }, "User Base"),
            react_1.default.createElement("div", { className: "flex items-center gap-2" },
                react_1.default.createElement("button", { onClick: () => setShowTeamTemplates(true), className: "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-secondary border border-border rounded-md hover:bg-tertiary hover:border-muted transition-all", title: "Add team member personas" },
                    react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                        react_1.default.createElement("path", { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }),
                        react_1.default.createElement("circle", { cx: "9", cy: "7", r: "4" }),
                        react_1.default.createElement("path", { d: "M23 21v-2a4 4 0 0 0-3-3.87" }),
                        react_1.default.createElement("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" })),
                    "Add Team"),
                react_1.default.createElement("button", { onClick: handleNewPersona, className: "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-accent border border-accent/30 rounded-md hover:bg-accent/10 hover:border-accent transition-all" },
                    react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                        react_1.default.createElement("line", { x1: "12", y1: "5", x2: "12", y2: "19" }),
                        react_1.default.createElement("line", { x1: "5", y1: "12", x2: "19", y2: "12" })),
                    "New Persona"))),
        react_1.default.createElement("div", { className: "flex flex-1 overflow-hidden" },
            react_1.default.createElement("div", { className: "w-1/3 border-r border-border flex flex-col" },
                react_1.default.createElement("div", { className: "p-3" },
                    react_1.default.createElement("div", { className: "relative" },
                        react_1.default.createElement("svg", { className: "absolute left-2.5 top-1/2 -translate-y-1/2 text-muted", xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                            react_1.default.createElement("circle", { cx: "11", cy: "11", r: "8" }),
                            react_1.default.createElement("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })),
                        react_1.default.createElement("input", { type: "text", placeholder: "Search personas...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), className: "w-full bg-primary border border-border rounded-md pl-8 pr-3 py-2 text-xs text-primary placeholder-muted focus:outline-none focus:border-accent/50" }))),
                react_1.default.createElement("div", { className: "flex-1 overflow-y-auto px-2" }, filteredPersonas.length === 0 ? (react_1.default.createElement("div", { className: "text-center text-muted text-xs py-8" }, searchQuery ? 'No personas found.' : 'No personas yet. Create one!')) : (filteredPersonas.map((persona) => (react_1.default.createElement("div", { key: persona.id, onClick: () => handleSelectPersona(persona), className: `p-3 mb-1 rounded-lg cursor-pointer transition-all ${selectedPersona?.id === persona.id
                        ? 'bg-accent/10 border border-accent/30'
                        : 'bg-secondary border border-transparent hover:border-border'}` },
                    react_1.default.createElement("div", { className: "flex items-center gap-2" },
                        react_1.default.createElement("div", { className: "w-8 h-8 rounded-full bg-gradient-to-br from-accent/30 to-accent-dim/30 flex items-center justify-center text-accent text-xs font-bold" }, persona.name.charAt(0).toUpperCase()),
                        react_1.default.createElement("div", { className: "flex-1 min-w-0" },
                            react_1.default.createElement("div", { className: "text-sm font-medium text-primary truncate" }, persona.name),
                            react_1.default.createElement("div", { className: "text-xs text-secondary" },
                                Object.keys(persona.attributes).length,
                                " traits"))))))))),
            react_1.default.createElement("div", { className: "flex-1 flex flex-col overflow-hidden" },
                !selectedPersona && !isEditing ? (react_1.default.createElement("div", { className: "flex-1 flex flex-col items-center justify-center text-muted" },
                    react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "48", height: "48", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", className: "opacity-30 mb-4" },
                        react_1.default.createElement("path", { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" }),
                        react_1.default.createElement("circle", { cx: "12", cy: "7", r: "4" })),
                    react_1.default.createElement("p", { className: "text-sm" }, "Select a persona or create a new one"))) : (react_1.default.createElement("div", { className: "flex-1 overflow-y-auto p-4" },
                    react_1.default.createElement("div", { className: "mb-6" },
                        react_1.default.createElement("label", { className: "block text-xs font-bold text-muted uppercase tracking-wider mb-2" }, "Persona Name"),
                        react_1.default.createElement("input", { type: "text", value: personaName, onChange: (e) => setPersonaName(e.target.value), disabled: !isEditing, placeholder: "e.g., The Power User", className: `w-full bg-primary border border-border rounded-lg px-4 py-3 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent ${!isEditing ? 'opacity-70' : ''}` })),
                    react_1.default.createElement("div", { className: "mb-6" },
                        react_1.default.createElement("div", { className: "flex items-center justify-between mb-3" },
                            react_1.default.createElement("label", { className: "text-xs font-bold text-muted uppercase tracking-wider" }, "Traits & Demographics"),
                            isEditing && (react_1.default.createElement("button", { onClick: handleAddAttribute, className: "flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors" },
                                react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                                    react_1.default.createElement("line", { x1: "12", y1: "5", x2: "12", y2: "19" }),
                                    react_1.default.createElement("line", { x1: "5", y1: "12", x2: "19", y2: "12" })),
                                "Add Trait"))),
                        attributeRows.length === 0 ? (react_1.default.createElement("div", { className: "text-center text-muted text-xs py-6 border border-dashed border-border rounded-lg" }, isEditing
                            ? 'Click "Add Trait" to define characteristics'
                            : 'No traits defined')) : (react_1.default.createElement("div", { className: "space-y-2" }, attributeRows.map((row) => (react_1.default.createElement("div", { key: row.id, className: "flex items-center gap-2 group" },
                            react_1.default.createElement("input", { type: "text", value: row.key, onChange: (e) => handleAttributeChange(row.id, 'key', e.target.value), disabled: !isEditing, placeholder: "Attribute name", className: `flex-1 bg-primary border border-border rounded-md px-3 py-2 text-xs text-primary placeholder-muted focus:outline-none focus:border-accent/50 ${!isEditing ? 'opacity-70' : ''}` }),
                            react_1.default.createElement("span", { className: "text-secondary" }, ":"),
                            react_1.default.createElement("input", { type: "text", value: row.value, onChange: (e) => handleAttributeChange(row.id, 'value', e.target.value), disabled: !isEditing, placeholder: "Value", className: `flex-1 bg-primary border border-border rounded-md px-3 py-2 text-xs text-primary placeholder-muted focus:outline-none focus:border-accent/50 ${!isEditing ? 'opacity-70' : ''}` }),
                            isEditing && (react_1.default.createElement("button", { onClick: () => handleRemoveAttribute(row.id), className: "opacity-0 group-hover:opacity-100 p-1.5 text-muted hover:text-red-400 hover:bg-red-900/20 rounded transition-all", "aria-label": `Remove attribute ${row.key || 'unnamed'}` },
                                react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                                    react_1.default.createElement("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
                                    react_1.default.createElement("line", { x1: "6", y1: "6", x2: "18", y2: "18" })))))))))),
                    selectedPersona &&
                        !isEditing &&
                        Object.keys(selectedPersona.attributes).length > 0 && (react_1.default.createElement("div", { className: "mb-6" },
                        react_1.default.createElement("label", { className: "block text-xs font-bold text-muted uppercase tracking-wider mb-2" }, "Generated Prompt Preview"),
                        react_1.default.createElement("div", { className: "bg-primary border border-border rounded-lg p-4 text-xs text-secondary italic" },
                            "Create a backstory for an individual that is described with the following characteristics, traits, or demographics:",
                            ' ',
                            Object.entries(selectedPersona.attributes)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(', ')))),
                    selectedPersona && !isEditing && (react_1.default.createElement("div", { className: "mb-6" },
                        react_1.default.createElement("div", { className: "flex items-center justify-between mb-2" },
                            react_1.default.createElement("label", { className: "block text-xs font-bold text-muted uppercase tracking-wider" }, "Backstory"),
                            react_1.default.createElement("button", { onClick: () => {
                                    setIsGeneratingBackstory(true);
                                    vscode.postMessage({
                                        type: 'generate-backstory',
                                        id: selectedPersona.id,
                                    });
                                }, disabled: isGeneratingBackstory, className: "flex items-center gap-1.5 px-2 py-1 text-xs text-accent border border-accent/30 rounded hover:bg-accent/10 disabled:opacity-50 transition-colors" }, isGeneratingBackstory ? (react_1.default.createElement(react_1.default.Fragment, null,
                                react_1.default.createElement("svg", { className: "animate-spin", xmlns: "http://www.w3.org/2000/svg", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                                    react_1.default.createElement("path", { d: "M21 12a9 9 0 1 1-6.219-8.56" })),
                                "Generating...")) : (react_1.default.createElement(react_1.default.Fragment, null,
                                react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                                    react_1.default.createElement("polygon", { points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2" })),
                                selectedPersona.backstory ? 'Regenerate' : 'Generate Backstory')))),
                        selectedPersona.backstory ? (react_1.default.createElement("div", { className: "bg-primary border border-border rounded-lg p-4 text-sm text-secondary leading-relaxed whitespace-pre-wrap" }, selectedPersona.backstory)) : (react_1.default.createElement("div", { className: "bg-primary border border-dashed border-border rounded-lg p-4 text-xs text-muted text-center" }, "No backstory generated yet. Click \"Generate Backstory\" to create one.")))))),
                (selectedPersona || isEditing) && (react_1.default.createElement("div", { className: "p-4 bg-secondary border-t border-border flex items-center justify-between" },
                    react_1.default.createElement("div", null, selectedPersona && !isEditing && (react_1.default.createElement("button", { onClick: handleDelete, className: "text-xs text-red-400 hover:text-red-300 transition-colors" }, "Delete Persona"))),
                    react_1.default.createElement("div", { className: "flex items-center gap-2" },
                        saveStatus === 'saved' && react_1.default.createElement("span", { className: "text-xs text-green-400" }, "\u2713 Saved"),
                        saveStatus === 'error' && (react_1.default.createElement("span", { className: "text-xs text-red-400" }, "Error saving")),
                        isEditing ? (react_1.default.createElement(react_1.default.Fragment, null,
                            react_1.default.createElement("button", { onClick: () => {
                                    if (selectedPersona) {
                                        handleSelectPersona(selectedPersona);
                                    }
                                    else {
                                        resetForm();
                                    }
                                }, className: "px-3 py-1.5 text-xs text-muted hover:text-primary transition-colors" }, "Cancel"),
                            react_1.default.createElement("button", { onClick: handleSave, disabled: saveStatus === 'saving', className: "px-4 py-1.5 text-xs font-bold bg-accent text-accent-text rounded-md hover:bg-accent-hover disabled:opacity-50 transition-colors" }, saveStatus === 'saving' ? 'Saving...' : 'Save Persona'))) : (react_1.default.createElement(react_1.default.Fragment, null,
                            react_1.default.createElement("button", { onClick: handleGeneratePrompt, className: "px-3 py-1.5 text-xs text-accent border border-accent/30 rounded-md hover:bg-accent/10 transition-colors" }, "Copy Prompt"),
                            react_1.default.createElement("button", { onClick: handleEditPersona, className: "px-4 py-1.5 text-xs font-bold bg-accent text-accent-text rounded-md hover:bg-accent-hover transition-colors" }, "Edit")))))))),
        showTeamTemplates && (react_1.default.createElement("div", { className: "fixed inset-0 bg-black/60 flex items-center justify-center z-50" },
            react_1.default.createElement("div", { className: "bg-primary border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col" },
                react_1.default.createElement("div", { className: "flex items-center justify-between p-4 border-b border-border" },
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("h3", { className: "text-sm font-bold text-primary" }, "Add Team Personas"),
                        react_1.default.createElement("p", { className: "text-xs text-muted mt-1" }, "Add pre-configured team member personas for product feedback")),
                    react_1.default.createElement("button", { onClick: () => setShowTeamTemplates(false), className: "p-1.5 text-muted hover:text-primary hover:bg-tertiary rounded transition-colors" },
                        react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                            react_1.default.createElement("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
                            react_1.default.createElement("line", { x1: "6", y1: "6", x2: "18", y2: "18" })))),
                react_1.default.createElement("div", { className: "flex-1 overflow-y-auto p-4" },
                    react_1.default.createElement("div", { className: "grid gap-3" }, teamTemplates.map((template) => {
                        const exists = personas.some((p) => p.name.toLowerCase() === template.name.toLowerCase());
                        return (react_1.default.createElement("div", { key: template.name, className: `p-4 rounded-lg border transition-all ${exists
                                ? 'bg-tertiary border-border opacity-60'
                                : 'bg-secondary border-border hover:border-accent/30 cursor-pointer'}`, onClick: () => !exists && handleAddTeamTemplate(template) },
                            react_1.default.createElement("div", { className: "flex items-start justify-between" },
                                react_1.default.createElement("div", { className: "flex items-center gap-3" },
                                    react_1.default.createElement("div", { className: "w-10 h-10 rounded-full bg-gradient-to-br from-accent/30 to-accent-dim/30 flex items-center justify-center text-accent text-sm font-bold" }, template.name.charAt(0)),
                                    react_1.default.createElement("div", null,
                                        react_1.default.createElement("div", { className: "text-sm font-medium text-primary flex items-center gap-2" },
                                            template.name,
                                            exists && (react_1.default.createElement("span", { className: "text-xs text-muted bg-tertiary px-1.5 py-0.5 rounded" }, "Added"))),
                                        react_1.default.createElement("div", { className: "text-xs text-secondary mt-0.5" }, template.attributes.Focus))),
                                !exists && (react_1.default.createElement("button", { className: "p-1.5 text-accent hover:bg-accent/10 rounded transition-colors" },
                                    react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                                        react_1.default.createElement("line", { x1: "12", y1: "5", x2: "12", y2: "19" }),
                                        react_1.default.createElement("line", { x1: "5", y1: "12", x2: "19", y2: "12" })))))));
                    }))),
                react_1.default.createElement("div", { className: "p-4 border-t border-border flex justify-between items-center" },
                    react_1.default.createElement("p", { className: "text-xs text-muted" }, "Click a persona to add it. You can edit them after adding."),
                    react_1.default.createElement("button", { onClick: () => setShowTeamTemplates(false), className: "px-4 py-1.5 text-xs font-medium text-muted hover:text-primary transition-colors" }, "Done")))))));
};
exports.UserBaseTab = UserBaseTab;
//# sourceMappingURL=UserBaseTab.js.map