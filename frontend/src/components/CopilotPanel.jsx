import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Mic, X, Zap, ChevronRight, MessageSquare, Trash2, Loader2 } from 'lucide-react';

export default function CopilotPanel({ projectId, onCopilotAction }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '🤖 **AI Copilot Ready**\n\nAsk me anything about your road network!' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState([
    "Which roads are most vulnerable?",
    "Highlight critical bridges",
    "Show hospitals affected by flood",
    "Generate recommendations",
    "Run flood simulation",
    "What is the network health?"
  ]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text) => {
    const msg = (text || input).trim();
    if (!msg) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setIsTyping(true);

    try {
      const res = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, project_id: projectId })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply, actions: data.actions || [] }]);
      if (data.suggestions && data.suggestions.length) setSuggestions(data.suggestions);
      if (data.actions && onCopilotAction) onCopilotAction(data.actions);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Error: ${err.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: '🤖 **AI Copilot Ready**\n\nAsk me anything about your road network!' }]);
  };

  const renderContent = (content) => {
    const parts = content.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-brand-glow font-semibold">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border bg-brand-panel/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-glow/20 to-purple-500/20 border border-brand-glow/30 flex items-center justify-center">
            <Bot className="w-4 h-4 text-brand-glow" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">AI Copilot</h3>
            <span className="text-[8px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Online
            </span>
          </div>
        </div>
        <button onClick={clearChat} className="p-1.5 hover:bg-brand-border rounded-lg text-slate-400 hover:text-white transition" title="Clear chat">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-brand-glow/10 border border-brand-glow/20 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3 h-3 text-brand-glow" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
              msg.role === 'user'
                ? 'bg-brand-glow/10 border border-brand-glow/20 text-slate-200'
                : 'bg-brand-card border border-brand-border text-slate-300'
            }`}>
              <div className="whitespace-pre-wrap">{renderContent(msg.content)}</div>
              {msg.actions && msg.actions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {msg.actions.map((action, ai) => (
                    <span key={ai} className="text-[8px] px-1.5 py-0.5 rounded bg-brand-glow/10 text-brand-glow border border-brand-glow/20 font-mono">
                      {action.type}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-full bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                <MessageSquare className="w-3 h-3 text-brand-accent" />
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-brand-glow/10 border border-brand-glow/20 flex items-center justify-center">
              <Bot className="w-3 h-3 text-brand-glow" />
            </div>
            <div className="bg-brand-card border border-brand-border rounded-xl px-3 py-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-brand-glow rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 bg-brand-glow rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 bg-brand-glow rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {suggestions.length > 0 && messages.length < 4 && (
        <div className="px-3 pb-2">
          <div className="flex flex-wrap gap-1.5">
            {suggestions.slice(0, 4).map((s, i) => (
              <button
                key={i}
                onClick={() => handleSend(s)}
                className="text-[9px] px-2 py-1 rounded-full bg-brand-card border border-brand-border hover:border-brand-glow/40 hover:text-brand-glow text-slate-400 transition flex items-center gap-1"
              >
                <Zap className="w-2.5 h-2.5" /> {s.length > 25 ? s.slice(0, 25) + '...' : s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 border-t border-brand-border">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask AI Copilot..."
              className="w-full bg-brand-dark border border-brand-border rounded-xl pl-3 pr-10 py-2 text-xs focus:outline-none focus:border-brand-glow text-slate-200 placeholder-slate-500"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-brand-glow transition">
              <Mic className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={() => handleSend()}
            disabled={isTyping || !input.trim()}
            className="px-3 py-2 bg-brand-glow text-brand-dark rounded-xl hover:bg-emerald-400 transition disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
