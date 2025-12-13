"use strict";
/**
 * Chat feature module barrel export
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatHandler = exports.ConversationManager = exports.ChatService = void 0;
// Services
var ChatService_1 = require("./services/ChatService");
Object.defineProperty(exports, "ChatService", { enumerable: true, get: function () { return ChatService_1.ChatService; } });
var ConversationManager_1 = require("./services/ConversationManager");
Object.defineProperty(exports, "ConversationManager", { enumerable: true, get: function () { return ConversationManager_1.ConversationManager; } });
// Handlers
var ChatHandler_1 = require("./handlers/ChatHandler");
Object.defineProperty(exports, "ChatHandler", { enumerable: true, get: function () { return ChatHandler_1.ChatHandler; } });
//# sourceMappingURL=index.js.map