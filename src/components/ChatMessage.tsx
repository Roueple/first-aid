interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  userName?: string;
}

export function ChatMessage({ role, content, timestamp, userName }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex gap-3 mb-4 animate-fadeIn ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${isUser
          ? 'bg-gradient-to-br from-slate-700 to-slate-900'
          : 'bg-gradient-to-br from-indigo-500 to-violet-600'
        }`}>
        {isUser ? (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        )}
      </div>

      {/* Message Content */}
      <div className={`flex flex-col max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-semibold ${isUser ? 'text-slate-700' : 'text-indigo-600'}`}>
            {isUser ? (userName || 'You') : 'Doc Assistant'}
          </span>
          <span className="text-xs text-slate-400">
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div
          className={`px-5 py-3 rounded-2xl shadow-sm transition-all ${isUser
              ? 'bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-slate-500/20'
              : 'bg-white border border-slate-100 text-slate-800 shadow-slate-200/50'
            }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {content}
          </p>
        </div>
      </div>
    </div>
  );
}

