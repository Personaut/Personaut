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

import { StageManager } from './StageManager';
import { StreamUpdate, StageName } from '../types/BuildModeTypes';

/**
 * Interface for webview message posting.
 */
export interface WebviewLike {
  postMessage(message: any): void | Thenable<boolean>;
}

/**
 * Configuration options for ContentStreamer.
 */
export interface ContentStreamerOptions {
  flushDebounceMs?: number;
  maxBufferSize?: number;
}

/**
 * Internal buffer entry for tracking updates.
 */
interface BufferEntry {
  update: StreamUpdate;
  timestamp: number;
}

export class ContentStreamer {
  private readonly stageManager: StageManager;
  private readonly webview: WebviewLike | null;
  private readonly options: Required<ContentStreamerOptions>;

  private buffer: Map<string, BufferEntry[]> = new Map();
  private stageData: Map<string, any[]> = new Map();
  private flushTimers: Map<string, NodeJS.Timeout> = new Map();
  private sentUpdates: StreamUpdate[] = [];

  constructor(
    stageManager: StageManager,
    webview: WebviewLike | null = null,
    options: ContentStreamerOptions = {}
  ) {
    this.stageManager = stageManager;
    this.webview = webview;
    this.options = {
      flushDebounceMs: options.flushDebounceMs ?? 500,
      maxBufferSize: options.maxBufferSize ?? 50,
    };
  }

  parseStreamingResponse(chunk: string, stage: string): StreamUpdate | null {
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

  sendUpdateToUI(update: StreamUpdate): void {
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

  bufferUpdate(update: StreamUpdate): void {
    const key = update.stage;

    if (!this.buffer.has(key)) {
      this.buffer.set(key, []);
    }

    const stageBuffer = this.buffer.get(key)!;
    stageBuffer.push({
      update,
      timestamp: Date.now(),
    });

    if (!this.stageData.has(key)) {
      this.stageData.set(key, []);
    }
    this.stageData.get(key)!.push(update.data);

    if (stageBuffer.length >= this.options.maxBufferSize) {
      this.flushToStageFile(update.stage, update.stage as StageName);
    }
  }

  async processChunk(
    chunk: string,
    stage: string,
    projectName: string
  ): Promise<StreamUpdate | null> {
    const update = this.parseStreamingResponse(chunk, stage);

    if (update) {
      this.sendUpdateToUI(update);
      this.bufferUpdate(update);
      this.scheduleDebouncedFlush(projectName, stage as StageName);
    }

    return update;
  }

  async flushToStageFile(projectName: string, stage: StageName): Promise<void> {
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

  async completeStage(projectName: string, stage: StageName): Promise<void> {
    await this.flushToStageFile(projectName, stage);

    const currentData = await this.stageManager.readStageFile(projectName, stage);
    const data =
      currentData?.data ??
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

  async handleGenerationFailure(
    projectName: string,
    stage: StageName,
    errorMessage: string
  ): Promise<void> {
    await this.flushToStageFile(projectName, stage);

    const currentData = await this.stageManager.readStageFile(projectName, stage);
    const data =
      currentData?.data ??
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

  async getPartialContent(projectName: string, stage: StageName): Promise<any | null> {
    const stageFile = await this.stageManager.readStageFile(projectName, stage);
    if (!stageFile) {
      return null;
    }
    return stageFile.data;
  }

  async getStageError(projectName: string, stage: StageName): Promise<string | null> {
    const stageFile = await this.stageManager.readStageFile(projectName, stage);
    if (!stageFile) {
      return null;
    }
    return stageFile.error ?? null;
  }

  getSentUpdates(): StreamUpdate[] {
    return [...this.sentUpdates];
  }

  getBuffer(stage: string): BufferEntry[] {
    return this.buffer.get(stage) ?? [];
  }

  getStageData(stage: string): any[] {
    return this.stageData.get(stage) ?? [];
  }

  clear(): void {
    for (const timer of this.flushTimers.values()) {
      clearTimeout(timer);
    }
    this.flushTimers.clear();
    this.buffer.clear();
    this.stageData.clear();
    this.sentUpdates = [];
  }

  private scheduleDebouncedFlush(projectName: string, stage: StageName): void {
    const existingTimer = this.flushTimers.get(stage);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.flushToStageFile(projectName, stage);
    }, this.options.flushDebounceMs);

    this.flushTimers.set(stage, timer);
  }

  private getContentTypeForStage(stage: string): 'persona' | 'feature' | 'story' | 'text' {
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

  private getCurrentIndex(stage: string): number {
    const data = this.stageData.get(stage);
    return data ? data.length : 0;
  }

  private extractJsonObject(chunk: string): any | null {
    const startIndex = chunk.indexOf('{');
    if (startIndex === -1) {
      return null;
    }

    let braceCount = 0;
    let endIndex = -1;

    for (let i = startIndex; i < chunk.length; i++) {
      if (chunk[i] === '{') {
        braceCount++;
      } else if (chunk[i] === '}') {
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
    } catch {
      return null;
    }
  }

  private buildStageFileData(
    contentType: 'persona' | 'feature' | 'story' | 'text',
    items: any[]
  ): any {
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
