import { useState, useRef, useEffect, useCallback } from 'react';
import { chatApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import {
  MessageSquare, X, Send, User, Bot,
  Loader2, RefreshCw, WifiOff, Lock,
} from 'lucide-react';

export function Chatbot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen]           = useState(false);
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState('');
  const [isLoading, setIsLoading]     = useState(false);
  const [lastFailedMessage, setLastFailedMessage] = useState(null);
  const messagesEndRef = useRef(null);

  // ── Auto-scroll on new messages ──────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Build history array from current message list ─────────────────────────
  // Snapshot is taken BEFORE appending the new user message to avoid duplication.
  const buildHistory = (currentMessages) =>
    currentMessages.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      content: msg.content,
    }));

  // ── Core send logic ───────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text, historySnapshot) => {
    setIsLoading(true);
    setLastFailedMessage(null);

    try {
      // chatApi never redirects on 401 — it rejects the promise so we handle it below.
      const res = await chatApi.post('/chat', {
        message: text,
        history: historySnapshot,
      });

      if (!res.data?.response) {
        throw new Error('The server responded but sent no content. Please try again.');
      }

      setMessages((prev) => [
        ...prev,
        { role: 'bot', content: res.data.response },
      ]);

    } catch (error) {
      // Determine the best human-readable error message
      const status = error.response?.status;
      const serverDetail = error.response?.data?.detail;

      let detail;
      let isNetworkError = false;

      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || !error.response) {
        detail = 'Cannot reach the server. Make sure the backend is running on port 8000.';
        isNetworkError = true;
      } else if (status === 401) {
        detail = 'Your session has expired. Please log in again to use the chat assistant.';
      } else if (status === 403) {
        detail = 'Access denied. Please log in to use the AI assistant.';
      } else if (status === 422) {
        detail = 'Invalid request format. Please refresh the page and try again.';
      } else if (status === 503) {
        detail = serverDetail ||
          'The AI service is temporarily unavailable (quota may be exceeded). Please try again shortly.';
      } else if (status === 500) {
        detail = serverDetail || 'An internal server error occurred. Please try again.';
      } else if (status >= 400) {
        detail = serverDetail || `Server returned HTTP ${status}. Please try again.`;
      } else {
        detail = error.message || 'Something went wrong. Please try again.';
      }

      // Always log to console for debugging
      console.error('[Chatbot] API error:', {
        code: error.code,
        status,
        serverDetail,
        message: error.message,
        isNetworkError,
      });

      setLastFailedMessage(text);
      setMessages((prev) => [
        ...prev,
        { role: 'bot', content: detail, isError: true, isNetworkError },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Handle send from form ─────────────────────────────────────────────────
  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const text = input.trim();
    // Snapshot history BEFORE appending new user msg
    const historySnapshot = buildHistory(messages);

    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');

    await sendMessage(text, historySnapshot);
  };

  // ── Retry last failed request ─────────────────────────────────────────────
  const handleRetry = () => {
    if (!lastFailedMessage || isLoading) return;

    const text = lastFailedMessage;
    // Remove the error bubble, rebuild history from remaining messages
    setMessages((prev) => {
      const withoutError = prev.slice(0, -1);
      const historySnapshot = buildHistory(withoutError);
      setTimeout(() => sendMessage(text, historySnapshot), 0);
      return withoutError;
    });
  };

  // ── Not logged in — show a lock prompt instead of the chat ───────────────
  if (isOpen && !user) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Card className="w-[340px] shadow-2xl overflow-hidden border-slate-200">
          {/* Header */}
          <div className="bg-trustBlue-900 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-trustBlue-200" />
              <h3 className="font-semibold text-sm">SkinScan AI Assistant</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-trustBlue-300 hover:text-white transition-colors"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Auth required message */}
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6 text-slate-400" />
            </div>
            <p className="font-semibold text-slate-800 text-sm">Sign in required</p>
            <p className="text-slate-500 text-xs mt-1">
              Please log in to use the AI dermatology assistant.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* ── Floating Toggle Button ── */}
      {!isOpen && (
        <button
          id="chatbot-toggle-btn"
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-trustBlue-900 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-trustBlue-800 transition-transform hover:scale-105"
          aria-label="Open AI chat assistant"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}

      {/* ── Chat Window ── */}
      {isOpen && (
        <Card
          id="chatbot-window"
          className="w-[390px] h-[560px] max-h-[80vh] flex flex-col shadow-2xl overflow-hidden border-slate-200"
        >
          {/* Header */}
          <div className="bg-trustBlue-900 text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-trustBlue-200" />
              <div>
                <h3 className="font-semibold text-sm">SkinScan AI Assistant</h3>
                <p className="text-xs text-trustBlue-300">Dermatology Education &amp; Help</p>
              </div>
            </div>
            <button
              id="chatbot-close-btn"
              onClick={() => setIsOpen(false)}
              className="text-trustBlue-300 hover:text-white transition-colors"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {/* Welcome placeholder */}
            {messages.length === 0 && (
              <div className="text-center text-slate-500 text-sm mt-8">
                <div className="w-12 h-12 bg-trustBlue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Bot className="w-6 h-6 text-trustBlue-600" />
                </div>
                <p className="font-medium text-slate-700">Hello, {user?.username || 'there'}!</p>
                <p className="mt-1 px-4">
                  Ask me about skin lesion types, risk factors, or how to interpret your results.
                </p>
              </div>
            )}

            {/* Message bubbles */}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 max-w-[88%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'user'
                      ? 'bg-trustBlue-100 text-trustBlue-700'
                      : msg.isError
                      ? 'bg-red-100 text-red-600'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : msg.isNetworkError ? (
                    <WifiOff className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>

                {/* Bubble + optional retry */}
                <div className="flex flex-col gap-1.5">
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-trustBlue-900 text-white rounded-tr-sm'
                        : msg.isError
                        ? 'bg-red-50 text-red-700 border border-red-100 rounded-tl-sm'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>

                  {/* Retry button — only on the most recent error */}
                  {msg.isError && idx === messages.length - 1 && lastFailedMessage && (
                    <button
                      id="chatbot-retry-btn"
                      onClick={handleRetry}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-800 font-medium self-start pl-1 disabled:opacity-50 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Retry
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* "Typing…" indicator */}
            {isLoading && (
              <div className="flex gap-3 max-w-[88%]">
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-white border border-slate-200 rounded-tl-sm flex items-center gap-1.5">
                  <span className="text-xs text-slate-400 mr-1">Typing</span>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-slate-200 shrink-0">
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <Input
                id="chatbot-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isLoading ? 'Waiting for response…' : 'Ask a dermatology question…'}
                className="flex-1"
                disabled={isLoading}
                autoComplete="off"
              />
              <Button
                id="chatbot-send-btn"
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading}
                className="shrink-0"
                aria-label="Send message"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          </div>
        </Card>
      )}
    </div>
  );
}
