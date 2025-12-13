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
exports.BuildLogs = void 0;
const react_1 = __importStar(require("react"));
/**
 * BuildLogs component displays build output with support for error recovery.
 * A collapsible panel at the bottom that shows only as much space as needed.
 * When collapsed: shows just a small header bar
 * When expanded: shows logs with a fixed max height (200px) with scrolling
 *
 * **Validates: Requirements 5.1, 5.2**
 */
const BuildLogs = ({ logs, onClear, onRetry }) => {
    const [isExpanded, setIsExpanded] = react_1.default.useState(false);
    const logsEndRef = (0, react_1.useRef)(null);
    // Auto-scroll to bottom when new logs come in
    (0, react_1.useEffect)(() => {
        if (isExpanded && logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, isExpanded]);
    const handleRetry = (stage) => {
        if (onRetry) {
            onRetry(stage);
        }
    };
    return (react_1.default.createElement("div", { className: "build-logs-wrapper", style: { flexShrink: 0 } },
        react_1.default.createElement("div", { className: "flex items-center justify-between px-3 py-2 bg-gray-800/80 cursor-pointer hover:bg-gray-800 transition-colors border-t border-gray-700", onClick: () => setIsExpanded(!isExpanded) },
            react_1.default.createElement("div", { className: "flex items-center gap-2 select-none" },
                react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: `transition-transform duration-200 text-gray-400 ${isExpanded ? 'rotate-180' : ''}` },
                    react_1.default.createElement("polyline", { points: "6 9 12 15 18 9" })),
                react_1.default.createElement("span", { className: "text-xs font-semibold uppercase text-gray-300 tracking-wider" }, "Build Output"),
                logs.length > 0 && (react_1.default.createElement("span", { className: "text-[10px] bg-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded-full font-medium" }, logs.length))),
            react_1.default.createElement("button", { onClick: (e) => {
                    e.stopPropagation();
                    onClear();
                }, className: "text-[10px] px-2 py-0.5 hover:bg-gray-700 rounded text-gray-400 hover:text-gray-200 transition-colors", title: "Clear Logs" }, "Clear")),
        isExpanded && (react_1.default.createElement("div", { className: "bg-gray-900/90 border-t border-gray-700 overflow-y-auto", style: { maxHeight: '200px' } }, logs.length === 0 ? (react_1.default.createElement("div", { className: "text-xs text-gray-500 italic p-3 text-center" }, "No build logs yet. Start a build step to see output.")) : (react_1.default.createElement("div", { className: "p-2" },
            logs.map((log, index) => (react_1.default.createElement("div", { key: index, className: "text-xs py-1.5 border-b border-gray-800/50 last:border-0" },
                react_1.default.createElement("span", { className: "text-gray-600 font-mono mr-2 text-[10px]" },
                    "[",
                    log.timestamp,
                    "]"),
                log.type === 'ai' ? (react_1.default.createElement("div", { className: "pl-2 border-l-2 border-purple-500/40 mt-1 mb-1 text-gray-300 bg-purple-900/10 p-2 rounded whitespace-pre-wrap text-[11px]" }, log.message)) : log.type === 'error' && log.isRetryable && log.stage ? (react_1.default.createElement("span", { className: "inline-flex items-center gap-2 flex-wrap" },
                    react_1.default.createElement("span", { className: "text-red-400" }, log.message),
                    react_1.default.createElement("button", { onClick: () => handleRetry(log.stage), className: "text-[10px] px-2 py-0.5 bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 rounded text-red-300 transition-colors", title: "Retry generation from saved state" }, "Retry"))) : (react_1.default.createElement("span", { className: log.type === 'error'
                        ? 'text-red-400'
                        : log.type === 'success'
                            ? 'text-green-400'
                            : log.type === 'warning'
                                ? 'text-amber-400'
                                : 'text-gray-300' }, log.message))))),
            react_1.default.createElement("div", { ref: logsEndRef })))))));
};
exports.BuildLogs = BuildLogs;
//# sourceMappingURL=BuildLogs.js.map