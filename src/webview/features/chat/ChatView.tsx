import React from 'react';
import { colors, spacing } from '../../shared/theme';
import { useChatState } from './hooks/useChatState';
import { useChatEnhancements } from './hooks/useChatEnhancements';
import { MessageList } from './components/MessageList';
import { ChatInput } from './components/ChatInput';
import { ChatHistoryPanel } from './components/ChatHistoryPanel';
import { ChatPersona } from './types';

/**
 * ChatView component props
 * 
 * Feature: chat-ui-fixes
 * Validates: Requirements 9.1, 9.2, 9.3
 */
export interface ChatViewProps {
  /** Optional callback when a message is sent */
  onMessageSent?: (message: string) => void;
  /** User personas from the UserBase feature */
  userPersonas?: ChatPersona[];
  /** Whether history panel is open (controlled by App.tsx) */
  isHistoryOpen?: boolean;
  /** Callback to close history panel */
  onHistoryClose?: () => void;
  /** User message bubble color */
  userMessageColor?: string;
  /** Agent message bubble color */
  agentMessageColor?: string;
}

/**
 * ChatView component - Simplified chat interface.
 *
 * According to chat-ui-fixes specification:
 * - NO ChatHeader component (buttons moved to App.tsx top navigation)
 * - NO standalone ChatSettingsPanel (settings moved to global SettingsView)
 * - Only MessageList and ChatInput components
 *
 * @example
 * ```tsx
 * <ChatView userPersonas={personas} />
 * ```
 *
 * **Validates: Requirements 9.1, 9.2, 9.3, 12.1, 12.3**
 */
export function ChatView({
  onMessageSent,
  userPersonas = [],
  isHistoryOpen: externalHistoryOpen,
  onHistoryClose,
  userMessageColor: propUserColor,
  agentMessageColor: propAgentColor,
}: ChatViewProps) {
  const {
    messages,
    input,
    setInput,
    isTyping,
    status,
    contextFiles,
    selectedPersona,
    setSelectedPersona,
    sendMessage,
    removeContextFile,
    addContextFile,
    addActiveFile,
    bottomRef,
    newChat,
    deleteConversation,
  } = useChatState();

  const {
    isIncognito,
    isHistoryOpen: internalHistoryOpen,
    settings,
    sessionHistory,
    isHistoryLoading,
    loadSessionHistory,
    loadSessionMessages,
    setHistoryOpen,
    toggleIncognito,
  } = useChatEnhancements();

  // Use external history state if provided, otherwise use internal
  const isHistoryOpen = externalHistoryOpen ?? internalHistoryOpen;

  const handleSubmit = () => {
    if (input.trim()) {
      sendMessage();
      onMessageSent?.(input);
    }
  };

  const handleHistoryClose = () => {
    if (onHistoryClose) {
      onHistoryClose();
    } else {
      setHistoryOpen(false);
    }
  };

  const handleFileUpload = async (files: File[]) => {
    console.log('[ChatView] Processing uploaded files:', files.length);

    for (const file of files) {
      try {
        if (file.type.startsWith('image/')) {
          // Handle image files - convert to base64
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = e.target?.result as string;
            console.log('[ChatView] Image converted to base64:', file.name);

            // Add image to context files (base64 format indicates it's an image)
            addContextFile({
              path: file.name,
              content: base64,
            });
          };
          reader.onerror = () => {
            console.error('[ChatView] Failed to read image:', file.name);
          };
          reader.readAsDataURL(file);
        } else {
          // Handle text files
          const text = await file.text();
          console.log('[ChatView] Text file read:', file.name, text.length, 'chars');

          // Add text file to context
          addContextFile({
            path: file.name,
            content: text,
          });
        }
      } catch (error) {
        console.error('[ChatView] Error processing file:', file.name, error);
      }
    }
  };

  // Validate selected persona exists
  React.useEffect(() => {
    // Built-in personas
    const builtInPersonas = [
      { id: 'pippet', name: 'Pippet' },
      { id: 'ux-designer', name: 'UX Designer' },
      { id: 'developer', name: 'Developer' },
    ];

    // Check if selected persona exists in built-in or user personas
    const allPersonas = [...builtInPersonas, ...userPersonas];
    const personaExists = allPersonas.some(p => p.id === selectedPersona.id);

    if (!personaExists && selectedPersona.id !== 'default') {
      console.warn('[ChatView] Selected persona no longer exists:', selectedPersona.name);

      // Show warning to user
      const warningMessage = `The persona "${selectedPersona.name}" is no longer available. Switching to Pippet.`;

      // Post warning message to webview
      if ((window as any).vscode) {
        (window as any).vscode.postMessage({
          type: 'show-warning',
          message: warningMessage,
        });
      }

      // Default to Pippet
      const pippet = {
        type: 'agent' as const,
        id: 'pippet',
        name: 'Pippet',
      };
      setSelectedPersona(pippet);
    }
  }, [selectedPersona, userPersonas, setSelectedPersona]);

  // Load history when panel opens
  React.useEffect(() => {
    if (isHistoryOpen && !isHistoryLoading) {
      console.log('[ChatView] History panel opened, loading history...');
      loadSessionHistory();
    }
  }, [isHistoryOpen]);

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: colors.background.primary,
  };

  const mainContentStyle: React.CSSProperties = {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  };

  const chatAreaStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
  };

  // Show incognito indicator at top of chat if active
  const incognitoIndicatorStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
    backgroundColor: colors.warning, // Use warning color directly
    color: '#1a1a1a', // Dark text for contrast on warning background
    fontSize: '12px',
    fontWeight: 500,
  };

  return (
    <div style={containerStyle}>
      {/* Incognito indicator - only show when incognito mode is active */}
      {isIncognito && (
        <div style={incognitoIndicatorStyle}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          Incognito Mode - Messages not saved
        </div>
      )}

      <div style={mainContentStyle}>
        {/* History panel - conditionally shown */}
        {isHistoryOpen && (
          <ChatHistoryPanel
            sessions={sessionHistory}
            isLoading={isHistoryLoading}
            onSessionSelect={(sessionId) => {
              loadSessionMessages(sessionId);
              handleHistoryClose();
            }}
            onSessionDelete={(sessionId) => {
              deleteConversation(sessionId);
              // Refresh the history after a short delay to allow backend to process
              setTimeout(() => loadSessionHistory(), 100);
            }}
            onRefresh={loadSessionHistory}
            onClose={handleHistoryClose}
          />
        )}

        {/* Main chat area */}
        <div style={chatAreaStyle}>
          <MessageList
            messages={messages}
            isTyping={isTyping}
            status={status}
            bottomRef={bottomRef}
            userMessageColor={propUserColor || settings.userMessageColor}
            agentMessageColor={propAgentColor || settings.agentMessageColor}
            agentPersonaName={selectedPersona?.name}
            agentPersonaIcon={selectedPersona?.name?.charAt(0)}
          />
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            onAddActiveFile={addActiveFile}
            onFileUpload={handleFileUpload}
            contextFiles={contextFiles}
            onRemoveContextFile={removeContextFile}
            persona={selectedPersona}
            onPersonaChange={setSelectedPersona}
            customPersonas={userPersonas}
            isTyping={isTyping}
            placeholder={isIncognito ? 'Incognito mode - messages not saved...' : 'Type a message...'}
            isIncognito={isIncognito}
            onIncognitoToggle={toggleIncognito}
            onNewChat={newChat}
          />
        </div>
      </div>
    </div>
  );
}

export default ChatView;
