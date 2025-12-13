"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const client_1 = require("react-dom/client");
const App_1 = __importDefault(require("./App"));
console.log('[Personaut] Webview script loaded');
const rootElement = document.getElementById('root');
console.log('[Personaut] Root element:', rootElement);
if (rootElement) {
    const root = (0, client_1.createRoot)(rootElement);
    console.log('[Personaut] React root created, rendering App...');
    root.render(react_1.default.createElement(App_1.default, null));
}
else {
    console.error('[Personaut] ERROR: Root element not found!');
}
//# sourceMappingURL=index.js.map