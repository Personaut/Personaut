"use strict";
/**
 * BuildLogManager - Manages build interaction logs for the build workflow.
 *
 * Implements build log operations:
 * - Read/write build logs with atomic operations
 * - Append log entries without overwriting
 * - Initialize empty build logs for new projects
 *
 * Validates: Requirements 5.1, 5.2, 5.3
 */
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
exports.BuildLogManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class BuildLogManager {
    constructor(baseDir = '.personaut') {
        this.baseDir = baseDir;
    }
    getBuildLogPath(projectName) {
        return path.join(this.baseDir, projectName, 'build-log.json');
    }
    getProjectDir(projectName) {
        return path.join(this.baseDir, projectName);
    }
    async readBuildLog(projectName) {
        const filePath = this.getBuildLogPath(projectName);
        try {
            if (!fs.existsSync(filePath)) {
                return null;
            }
            const content = await fs.promises.readFile(filePath, 'utf-8');
            const parsed = JSON.parse(content);
            if (typeof parsed.projectName !== 'string' ||
                !Array.isArray(parsed.entries) ||
                typeof parsed.createdAt !== 'number' ||
                typeof parsed.lastUpdated !== 'number') {
                console.warn(`[BuildLogManager] Invalid build log format for ${projectName}`);
                return null;
            }
            return parsed;
        }
        catch (error) {
            console.warn(`[BuildLogManager] Failed to read build log for ${projectName}:`, error);
            return null;
        }
    }
    async writeBuildLog(projectName, log) {
        const filePath = this.getBuildLogPath(projectName);
        const projectDir = this.getProjectDir(projectName);
        const content = JSON.stringify(log, null, 2);
        const tempPath = `${filePath}.tmp.${Date.now()}`;
        try {
            await fs.promises.mkdir(projectDir, { recursive: true });
            await fs.promises.writeFile(tempPath, content, 'utf-8');
            await fs.promises.rename(tempPath, filePath);
            return {
                success: true,
                filePath,
            };
        }
        catch (error) {
            console.error(`[BuildLogManager] Write error for ${filePath}:`, {
                error: error.message,
                code: error.code,
                projectName,
                timestamp: new Date().toISOString(),
            });
            try {
                if (fs.existsSync(tempPath)) {
                    await fs.promises.unlink(tempPath);
                }
            }
            catch (cleanupError) {
                console.warn(`[BuildLogManager] Failed to cleanup temp file ${tempPath}:`, cleanupError.message);
            }
            return {
                success: false,
                filePath,
                errorMessage: `Failed to write build log: ${error.message}`,
            };
        }
    }
    async appendLogEntry(projectName, entry) {
        let log = await this.readBuildLog(projectName);
        if (!log) {
            log = {
                projectName,
                entries: [],
                createdAt: Date.now(),
                lastUpdated: Date.now(),
            };
        }
        log.entries.push(entry);
        log.lastUpdated = Date.now();
        return this.writeBuildLog(projectName, log);
    }
    async initializeBuildLog(projectName) {
        const log = {
            projectName,
            entries: [],
            createdAt: Date.now(),
            lastUpdated: Date.now(),
        };
        return this.writeBuildLog(projectName, log);
    }
    buildLogExists(projectName) {
        const filePath = this.getBuildLogPath(projectName);
        return fs.existsSync(filePath);
    }
    async getEntryCount(projectName) {
        const log = await this.readBuildLog(projectName);
        return log ? log.entries.length : 0;
    }
    async clearBuildLog(projectName) {
        const log = await this.readBuildLog(projectName);
        if (!log) {
            return this.initializeBuildLog(projectName);
        }
        log.entries = [];
        log.lastUpdated = Date.now();
        return this.writeBuildLog(projectName, log);
    }
}
exports.BuildLogManager = BuildLogManager;
//# sourceMappingURL=BuildLogManager.js.map