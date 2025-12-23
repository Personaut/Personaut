/**
 * Streaming Handler
 *
 * Handles real-time streaming updates from the LLM and routes
 * them to appropriate feature handlers.
 *
 * **Validates: Requirements 16.3**
 */

/**
 * Stream state
 */
export interface StreamState {
    /** Whether streaming is active */
    isStreaming: boolean;
    /** Stream ID */
    streamId: string | null;
    /** Accumulated content */
    content: string;
    /** Start timestamp */
    startTime: number | null;
    /** Metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Stream event types
 */
export type StreamEvent =
    | { type: 'stream-start'; streamId: string; metadata?: Record<string, unknown> }
    | { type: 'stream-chunk'; streamId: string; chunk: string; index: number }
    | { type: 'stream-end'; streamId: string; content: string; metadata?: Record<string, unknown> }
    | { type: 'stream-error'; streamId: string; error: string };

/**
 * Stream handler callbacks
 */
export interface StreamHandlers {
    /** Called when stream starts */
    onStart?: (streamId: string, metadata?: Record<string, unknown>) => void;
    /** Called for each chunk */
    onChunk?: (streamId: string, chunk: string, accumulated: string) => void;
    /** Called when stream completes */
    onEnd?: (streamId: string, content: string, metadata?: Record<string, unknown>) => void;
    /** Called on stream error */
    onError?: (streamId: string, error: string) => void;
}

/**
 * Initial stream state
 */
export const INITIAL_STREAM_STATE: StreamState = {
    isStreaming: false,
    streamId: null,
    content: '',
    startTime: null,
};

/**
 * Create a streaming handler
 *
 * @example
 * ```tsx
 * const handleStream = createStreamingHandler({
 *   onStart: (id) => setLoading(true),
 *   onChunk: (id, chunk, content) => setResponse(content),
 *   onEnd: (id, content) => {
 *     setLoading(false);
 *     saveResponse(content);
 *   },
 *   onError: (id, error) => {
 *     setLoading(false);
 *     setError(error);
 *   },
 * });
 * ```
 */
export function createStreamingHandler(handlers: StreamHandlers) {
    let state: StreamState = { ...INITIAL_STREAM_STATE };

    return (event: StreamEvent) => {
        switch (event.type) {
            case 'stream-start':
                state = {
                    isStreaming: true,
                    streamId: event.streamId,
                    content: '',
                    startTime: Date.now(),
                    metadata: event.metadata,
                };
                handlers.onStart?.(event.streamId, event.metadata);
                break;

            case 'stream-chunk':
                if (state.streamId === event.streamId) {
                    state.content += event.chunk;
                    handlers.onChunk?.(event.streamId, event.chunk, state.content);
                }
                break;

            case 'stream-end':
                if (state.streamId === event.streamId) {
                    state = {
                        ...state,
                        isStreaming: false,
                        content: event.content,
                    };
                    handlers.onEnd?.(event.streamId, event.content, event.metadata);
                }
                break;

            case 'stream-error':
                if (state.streamId === event.streamId) {
                    state = { ...INITIAL_STREAM_STATE };
                    handlers.onError?.(event.streamId, event.error);
                }
                break;
        }
    };
}

/**
 * Parse streaming JSON chunks
 * Handles partial JSON that may span multiple chunks
 */
export function parseStreamingJSON<T>(
    content: string,
    partialBuffer: string = ''
): { parsed: T | null; remaining: string } {
    const fullContent = partialBuffer + content;

    try {
        const parsed = JSON.parse(fullContent) as T;
        return { parsed, remaining: '' };
    } catch {
        // Try to find a complete JSON object
        const match = fullContent.match(/^(\{[\s\S]*?\})(.*)$/);
        if (match) {
            try {
                const parsed = JSON.parse(match[1]) as T;
                return { parsed, remaining: match[2] };
            } catch {
                return { parsed: null, remaining: fullContent };
            }
        }
        return { parsed: null, remaining: fullContent };
    }
}

export default createStreamingHandler;
