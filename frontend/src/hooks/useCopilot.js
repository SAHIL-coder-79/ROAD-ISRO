import { useState, useCallback, useRef } from 'react';

export function useCopilot(projectId) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '🤖 **AI Copilot Ready**\n\nAsk me anything about your road network!' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState([
    "Which roads are most vulnerable?",
    "Highlight critical bridges",
    "Generate recommendations",
    "What is the network health?"
  ]);
  const abortRef = useRef(null);

  const sendMessage = useCallback(async (text) => {
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const res = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, project_id: projectId })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply, actions: data.actions || [] }]);
      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
      }
      return data;
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setIsTyping(false);
    }
  }, [projectId]);

  const clearMessages = useCallback(() => {
    setMessages([{ role: 'assistant', content: '🤖 **AI Copilot Ready**\n\nAsk me anything about your road network!' }]);
  }, []);

  return { messages, isTyping, suggestions, sendMessage, clearMessages };
}
