"use strict";
/**
 * ContentStreamer - Manages real-time content streaming for the build workflow.
 *
 * Implements streaming operations:
 * - Parse streaming AI responses to extract structured data
 * - Send incremental updates to the UI
 * - Buffer partial updates for batching
 * - Flush buffered updates to stage files with debouncing
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentStreamer = void 0;
class ContentStreamer {
    constructor(stageManager, webview = null, options = {}) {
        this.buffer = new Map();
        this.stageData = new Map();
        this.flushTimers = new Map();
        this.sentUpdates = [];
        this.stageManager = stageManager;
        this.webview = webview;
        this.options = {
            flushDebounceMs: options.flushDebounceMs ?? 500,
            maxBufferSize: options.maxBufferSize ?? 50,
        };
    }
    parseStreamingResponse(chunk, stage) {
        if (!chunk || chunk.trim().length === 0) {
            return null;
        }
        const trimmedChunk = chunk.trim();
        const contentType = this.getContentTypeForStage(stage);
        const jsonMatch = this.extractJsonObject(trimmedChunk);
        if (jsonMatch) {
            const currentIndex = this.getCurrentIndex(stage);
            return {
                stage,
                type: contentType,
                data: jsonMatch,
                index: currentIndex,
                complete: false,
            };
        }
        if (trimmedChunk.length > 0) {
            const currentIndex = this.getCurrentIndex(stage);
            return {
                stage,
                type: 'text',
                data: { content: trimmedChunk },
                index: currentIndex,
                complete: false,
            };
        }
        return null;
    }
    sendUpdateToUI(update) {
        if (!this.webview) {
            return;
        }
        const message = {
            type: 'stream-update',
            stage: update.stage,
            updateType: update.type,
            data: update.data,
            index: update.index,
            complete: update.complete,
        };
        this.webview.postMessage(message);
        this.sentUpdates.push(update);
    }
    bufferUpdate(update) {
        const key = update.stage;
        if (!this.buffer.has(key)) {
            this.buffer.set(key, []);
        }
        const stageBuffer = this.buffer.get(key);
        stageBuffer.push({
            update,
            timestamp: Date.now(),
        });
        if (!this.stageData.has(key)) {
            this.stageData.set(key, []);
        }
        this.stageData.get(key).push(update.data);
        if (stageBuffer.length >= this.options.maxBufferSize) {
            this.flushToStageFile(update.stage, update.stage);
        }
    }
    async processChunk(chunk, stage, projectName) {
        const update = this.parseStreamingResponse(chunk, stage);
        if (update) {
            this.sendUpdateToUI(update);
            this.bufferUpdate(update);
            this.scheduleDebouncedFlush(projectName, stage);
        }
        return update;
    }
    async flushToStageFile(projectName, stage) {
        const existingTimer = this.flushTimers.get(stage);
        if (existingTimer) {
            clearTimeout(existingTimer);
            this.flushTimers.delete(stage);
        }
        const data = this.stageData.get(stage);
        if (!data || data.length === 0) {
            return;
        }
        const contentType = this.getContentTypeForStage(stage);
        const stageFileData = this.buildStageFileData(contentType, data);
        await this.stageManager.writeStageFile(projectName, stage, stageFileData, false);
        this.buffer.delete(stage);
    }
    async completeStage(projectName, stage) {
        await this.flushToStageFile(projectName, stage);
        const currentData = await this.stageManager.readStageFile(projectName, stage);
        const data = currentData?.data ??
            this.buildStageFileData(this.getContentTypeForStage(stage), this.stageData.get(stage) ?? []);
        await this.stageManager.writeStageFile(projectName, stage, data, true);
        if (this.webview) {
            this.webview.postMessage({
                type: 'stream-update',
                stage,
                updateType: this.getContentTypeForStage(stage),
                data: null,
                index: -1,
                complete: true,
            });
        }
        this.stageData.delete(stage);
    }
    async handleGenerationFailure(projectName, stage, errorMessage) {
        await this.flushToStageFile(projectName, stage);
        const currentData = await this.stageManager.readStageFile(projectName, stage);
        const data = currentData?.data ??
            this.buildStageFileData(this.getContentTypeForStage(stage), this.stageData.get(stage) ?? []);
        await this.stageManager.writeStageFileWithError(projectName, stage, data, errorMessage);
        if (this.webview) {
            this.webview.postMessage({
                type: 'stream-update',
                stage,
                updateType: this.getContentTypeForStage(stage),
                data: null,
                index: -1,
                complete: true,
                error: errorMessage,
            });
        }
        this.stageData.delete(stage);
    }
    async getPartialContent(projectName, stage) {
        const stageFile = await this.stageManager.readStageFile(projectName, stage);
        if (!stageFile) {
            return null;
        }
        return stageFile.data;
    }
    async getStageError(projectName, stage) {
        const stageFile = await this.stageManager.readStageFile(projectName, stage);
        if (!stageFile) {
            return null;
        }
        return stageFile.error ?? null;
    }
    getSentUpdates() {
        return [...this.sentUpdates];
    }
    getBuffer(stage) {
        return this.buffer.get(stage) ?? [];
    }
    getStageData(stage) {
        return this.stageData.get(stage) ?? [];
    }
    clear() {
        for (const timer of this.flushTimers.values()) {
            clearTimeout(timer);
        }
        this.flushTimers.clear();
        this.buffer.clear();
        this.stageData.clear();
        this.sentUpdates = [];
    }
    scheduleDebouncedFlush(projectName, stage) {
        const existingTimer = this.flushTimers.get(stage);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }
        const timer = setTimeout(() => {
            this.flushToStageFile(projectName, stage);
        }, this.options.flushDebounceMs);
        this.flushTimers.set(stage, timer);
    }
    getContentTypeForStage(stage) {
        switch (stage) {
            case 'users':
                return 'persona';
            case 'features':
                return 'feature';
            case 'stories':
                return 'story';
            default:
                return 'text';
        }
    }
    getCurrentIndex(stage) {
        const data = this.stageData.get(stage);
        return data ? data.length : 0;
    }
    extractJsonObject(chunk) {
        const startIndex = chunk.indexOf('{');
        if (startIndex === -1) {
            return null;
        }
        let braceCount = 0;
        let endIndex = -1;
        for (let i = startIndex; i < chunk.length; i++) {
            if (chunk[i] === '{') {
                braceCount++;
            }
            else if (chunk[i] === '}') {
                braceCount--;
                if (braceCount === 0) {
                    endIndex = i;
                    break;
                }
            }
        }
        if (endIndex === -1) {
            return null;
        }
        const jsonStr = chunk.substring(startIndex, endIndex + 1);
        try {
            return JSON.parse(jsonStr);
        }
        catch {
            return null;
        }
    }
    buildStageFileData(contentType, items) {
        switch (contentType) {
            case 'persona':
                return { personas: items };
            case 'feature':
                return { features: items };
            case 'story':
                return { stories: items };
            case 'text':
            default:
                return { content: items };
        }
    }
}
exports.ContentStreamer = ContentStreamer;
//# sourceMappingURL=ContentStreamer.js.map