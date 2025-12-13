"use strict";
/**
 * Type definitions for the build-mode feature.
 *
 * Defines interfaces for:
 * - BuildProject: Project metadata
 * - StageFile: Stage file structure
 * - BuildLogEntry: Build log entries
 * - BuildState: Central build state
 * - Stream updates and messages
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.STAGE_FILE_VERSION = exports.STAGE_ORDER = void 0;
/**
 * Stage order constant.
 */
exports.STAGE_ORDER = ['idea', 'users', 'features', 'team', 'stories', 'design'];
/**
 * Stage file version.
 */
exports.STAGE_FILE_VERSION = '1.0';
//# sourceMappingURL=BuildModeTypes.js.map