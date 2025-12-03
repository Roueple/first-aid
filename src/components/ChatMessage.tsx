import { ChatMessage as ChatMessageType } from '../types/chat.types';
import { useNavigate } from 'react-router-dom';
import { ChatResultsTable } from './ChatResultsTable';
import { Finding } from '../types/finding.types';

interface ChatMessageProps {
  message: ChatMessageType;
}

/**
 * ChatMessage Component
 * 
 * Displays individual chat messages with role-based styling, markdown rendering,
 * confidence scores, processing time, and clickable source finding references.
 * 
 * Requirements: 6.2, 6.3
 */
export function ChatMessage({ message }: ChatMessageProps) {
  const navigate = useNavigate();
  const isUser = message.role === 'user';

  const handleSourceClick = (findingId: string) => {
    // Navigate to findings page with the specific finding selected
    navigate(`/findings?id=${findingId}`);
  };

  return (
    <div className={`flex items-start gap-4 ${isUser ? 'flex-row-reverse' : ''} group animate-slide-up`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-gray-200' : 'bg-gradient-to-br from-blue-500 to-purple-600'
          }`}
      >
        {isUser ? (
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 max-w-3xl ${isUser ? 'text-right' : ''}`}>
        <div
          className={`inline-block text-left ${isUser
              ? 'bg-gray-100 text-gray-900 rounded-2xl rounded-tr-sm px-5 py-3'
              : 'text-gray-800 px-1 py-1'
            }`}
        >
          {/* Message Text with Markdown Support */}
          <div className={`text-[15px] leading-relaxed ${isUser ? '' : 'prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1'}`}>
            <MessageContent 
              content={message.content} 
              isUser={isUser}
              findings={message.metadata?.findings as Finding[] | undefined}
              totalCount={message.metadata?.totalCount as number | undefined}
              userQuery={message.metadata?.userQuery as string | undefined}
            />
          </div>

          {/* Metadata for Assistant Messages */}
          {!isUser && message.metadata && (
            <div className="mt-2 space-y-2">
              {/* Source Finding References */}
              {message.metadata?.sources && message.metadata.sources.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {message.metadata.sources.map((sourceId, index) => (
                    <button
                      key={index}
                      onClick={() => handleSourceClick(sourceId)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-600 hover:text-blue-700 rounded-md text-xs transition-all shadow-sm"
                      title={`View finding ${sourceId}`}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {sourceId}
                    </button>
                  ))}
                </div>
              )}

              {/* Follow-up Suggestions */}
              {message.metadata?.suggestions && message.metadata.suggestions.length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-100">
                  <div className="text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Suggested follow-ups</div>
                  <div className="space-y-1">
                    {message.metadata.suggestions.slice(0, 3).map((suggestion, index) => (
                      <div
                        key={index}
                        className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer hover:underline decoration-blue-300 underline-offset-2 transition-colors"
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer Info (Time & Confidence) */}
              <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                {message.metadata?.confidence !== undefined && (
                  <span title="Confidence Score">
                    {(message.metadata.confidence * 100).toFixed(0)}% confidence
                  </span>
                )}
                {message.metadata?.processingTime !== undefined && (
                  <span>
                    {message.metadata.processingTime.toFixed(2)}s
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * MessageContent Component
 * Renders message content with markdown support and table rendering
 */
interface MessageContentProps {
  content: string;
  isUser: boolean;
  findings?: Finding[];
  totalCount?: number;
  userQuery?: string;
}

function MessageContent({ content, isUser, findings, totalCount, userQuery }: MessageContentProps) {
  // Check if content contains table marker
  const hasTable = content.includes('[RENDER_TABLE]');
  
  // Split content by table marker if present
  const parts = hasTable ? content.split('[RENDER_TABLE]') : [content];
  
  // Simple markdown rendering for common patterns
  // This will be enhanced when react-markdown is available
  const renderContent = (text: string) => {
    // Split by code blocks first
    const parts = text.split(/(```[\s\S]*?```|`[^`]+`)/g);

    return parts.map((part, index) => {
      // Code block
      if (part.startsWith('```') && part.endsWith('```')) {
        const code = part.slice(3, -3).trim();
        const lines = code.split('\n');
        const language = lines[0].trim(); // eslint-disable-line @typescript-eslint/no-unused-vars
        const codeContent = lines.length > 1 ? lines.slice(1).join('\n') : code;

        return (
          <pre
            key={index}
            className={`mt-2 mb-2 p-3 rounded overflow-x-auto ${isUser ? 'bg-blue-700' : 'bg-gray-200'
              }`}
          >
            <code className="text-xs font-mono">{codeContent}</code>
          </pre>
        );
      }

      // Inline code
      if (part.startsWith('`') && part.endsWith('`')) {
        const code = part.slice(1, -1);
        return (
          <code
            key={index}
            className={`px-1.5 py-0.5 rounded font-mono text-xs ${isUser ? 'bg-blue-700' : 'bg-gray-200'
              }`}
          >
            {code}
          </code>
        );
      }

      // Regular text with basic formatting
      return (
        <span key={index}>
          {part.split('\n').map((line, lineIndex, array) => (
            <span key={lineIndex}>
              {formatLine(line, isUser)}
              {lineIndex < array.length - 1 && <br />}
            </span>
          ))}
        </span>
      );
    });
  };

  const formatLine = (line: string, isUser: boolean) => { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Bold: **text** or __text__
    let formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic: *text* or _text_
    formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/_(.+?)_/g, '<em>$1</em>');

    // Lists
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const content = line.trim().substring(2);
      return (
        <div className="flex items-start gap-2 ml-4">
          <span className="mt-1">•</span>
          <span dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      );
    }

    // Numbered lists
    const numberedMatch = line.trim().match(/^(\d+)\.\s(.+)/);
    if (numberedMatch) {
      return (
        <div className="flex items-start gap-2 ml-4">
          <span className="mt-1">{numberedMatch[1]}.</span>
          <span dangerouslySetInnerHTML={{ __html: numberedMatch[2] }} />
        </div>
      );
    }

    // Headers
    if (line.startsWith('### ')) {
      return <h3 className="text-base font-semibold mt-2 mb-1">{line.substring(4)}</h3>;
    }
    if (line.startsWith('## ')) {
      return <h2 className="text-lg font-semibold mt-2 mb-1">{line.substring(3)}</h2>;
    }
    if (line.startsWith('# ')) {
      return <h1 className="text-xl font-bold mt-2 mb-1">{line.substring(2)}</h1>;
    }

    return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  // Render content with table if needed
  if (hasTable && findings && findings.length > 0) {
    return (
      <div className="whitespace-pre-wrap break-words">
        {/* Content before table */}
        {parts[0] && renderContent(parts[0])}
        
        {/* Render table */}
        <ChatResultsTable 
          findings={findings}
          totalCount={totalCount || findings.length}
          queryText={userQuery || 'Query Results'}
        />
        
        {/* Content after table */}
        {parts[1] && renderContent(parts[1])}
      </div>
    );
  }
  
  return <div className="whitespace-pre-wrap break-words">{renderContent(content)}</div>;
}
