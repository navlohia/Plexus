/**
 * src/components/chat/GraphChatbot.tsx
 * Floating Bottom-Left Sanjeevani (संजीवनी) AI Chatbot with Panda Mascot, Gemini API, Web TTS & SST
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Key,
  RotateCcw,
  User,
  ArrowRight,
} from 'lucide-react';
import { RouteGraphDatabase } from '../../lib/graphDb';
import {
  askGeminiGraphCopilot,
  getGeminiApiKey,
  setGeminiApiKey,
  hasGeminiApiKey,
  ChatMessage,
} from '../../services/geminiService';
import { useWebSpeech } from '../../hooks/useWebSpeech';
import { useDispatchStore } from '../../data/dispatch';
import type { TickState } from '../../types';

interface GraphChatbotProps {
  state?: TickState;
}

// ─── Cute Animated Panda Mascot SVG Component ────────────────────────────────
export const PandaMascot: React.FC<{ size?: number; isFloating?: boolean; showMedBadge?: boolean }> = ({
  size = 40,
  isFloating = false,
  showMedBadge = true,
}) => {
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        filter: 'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.12))',
        animation: isFloating ? 'floatingPanda 3s ease-in-out infinite' : 'none',
      }}
    >
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Left Ear */}
        <ellipse cx="23" cy="24" rx="15" ry="14" fill="#1E293B" />
        <ellipse cx="23" cy="24" rx="8" ry="7" fill="#F472B6" opacity="0.45" />

        {/* Right Ear */}
        <ellipse cx="77" cy="24" rx="15" ry="14" fill="#1E293B" />
        <ellipse cx="77" cy="24" rx="8" ry="7" fill="#F472B6" opacity="0.45" />

        {/* Head Base */}
        <circle cx="50" cy="52" r="37" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2.5" />

        {/* Left Eye Patch */}
        <ellipse cx="34" cy="48" rx="11" ry="14" transform="rotate(-15 34 48)" fill="#1E293B" />
        {/* Left Eye Sparkle */}
        <circle cx="35" cy="46" r="4" fill="#FFFFFF" />
        <circle cx="37" cy="50" r="1.8" fill="#FFFFFF" opacity="0.7" />

        {/* Right Eye Patch */}
        <ellipse cx="66" cy="48" rx="11" ry="14" transform="rotate(15 66 48)" fill="#1E293B" />
        {/* Right Eye Sparkle */}
        <circle cx="65" cy="46" r="4" fill="#FFFFFF" />
        <circle cx="63" cy="50" r="1.8" fill="#FFFFFF" opacity="0.7" />

        {/* Soft Blush Cheeks */}
        <circle cx="25" cy="62" r="6" fill="#FDA4AF" opacity="0.55" />
        <circle cx="75" cy="62" r="6" fill="#FDA4AF" opacity="0.55" />

        {/* Cute Button Nose */}
        <path d="M46 59 C48 57, 52 57, 54 59 C54 62, 46 62, 46 59 Z" fill="#1E293B" />

        {/* Sweet Smile */}
        <path d="M45 64 Q50 69 55 64" stroke="#1E293B" strokeWidth="2.2" strokeLinecap="round" fill="none" />

        {/* Medical Cross Badge on Forehead */}
        {showMedBadge && (
          <g transform="translate(42, 18)">
            <circle cx="8" cy="8" r="8" fill="#10B981" />
            <rect x="6.5" y="3.5" width="3" height="9" rx="1" fill="#FFFFFF" />
            <rect x="3.5" y="6.5" width="9" height="3" rx="1" fill="#FFFFFF" />
          </g>
        )}
      </svg>
    </div>
  );
};

const INITIAL_GREETING: ChatMessage = {
  id: 'msg-welcome',
  sender: 'bot',
  text: `🐼 **Namaste! I am Sanjeevani (संजीवनी)**, your AI Lifeline companion.\n\nI am strictly grounded in our live **Delhi-NCR Route GraphDB** (25 hospitals, regional transfer corridors, and active couriers).\n\nAsk me anything about network stock, shortages, optimal donor hubs, or courier telemetry!`,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

const SUGGESTED_QUERIES = [
  'Which hospitals currently face platelet shortages?',
  'Find optimal donor hub for Safdarjung',
  'Show active transfers and cold-chain temperatures',
  'Summarize network stock across Delhi-NCR',
  'What is the shortest courier route from Medanta to AIIMS?',
];

export const GraphChatbot: React.FC<GraphChatbotProps> = ({ state }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Gemini API Key config
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [keySavedToast, setKeySavedToast] = useState(false);

  // Web Speech (TTS & SST)
  const {
    speak,
    stopSpeaking,
    isSpeaking,
    ttsEnabled,
    setTtsEnabled,
    startListening,
    stopListening,
    isListening,
    recognitionError,
  } = useWebSpeech();

  const dispatchStore = useDispatchStore();
  const dispatchOrders = dispatchStore.orders;

  // In-memory GraphDB instance synced to live state and dispatch orders
  const graphDb = useMemo(() => {
    return new RouteGraphDatabase(state, dispatchOrders);
  }, [state, dispatchOrders]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load stored API key on mount
  useEffect(() => {
    const existing = getGeminiApiKey();
    if (existing) {
      setApiKeyInput(existing);
    }
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSaveApiKey = () => {
    setGeminiApiKey(apiKeyInput.trim());
    setKeySavedToast(true);
    setTimeout(() => setKeySavedToast(false), 3000);
    setShowKeyConfig(false);
  };

  const handleClearApiKey = () => {
    setApiKeyInput('');
    setGeminiApiKey('');
    setKeySavedToast(true);
    setTimeout(() => setKeySavedToast(false), 3000);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    stopSpeaking();

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      // Execute query against Gemini AI strictly grounded in GraphDB snapshot
      const { reply } = await askGeminiGraphCopilot(query, messages, graphDb);

      const botMsg: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        sender: 'bot',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);

      // Read aloud if TTS is enabled
      if (ttsEnabled) {
        speak(reply);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        sender: 'bot',
        text: `⚠️ **Sanjeevani Notice:** ${err?.message || 'Could not process query against live GraphDB.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  // Toggle voice recognition (Web SST)
  const handleToggleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening((transcript) => {
        if (transcript) {
          setInputText(transcript);
          // Auto send after speech transcription
          handleSendMessage(transcript);
        }
      });
    }
  };

  const keyConfigured = hasGeminiApiKey();

  return (
    <>
      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* FLOATING PANDA MASCOT BUTTON (BOTTOM-LEFT)                             */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <button
        type="button"
        data-testid="graph-chatbot-trigger"
        className="graph-chatbot-floating-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open Sanjeevani AI"
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 18px 8px 10px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1.5px solid rgba(16, 185, 129, 0.35)',
          borderRadius: '9999px',
          boxShadow: '0 12px 28px -4px rgba(16, 185, 129, 0.22), 0 4px 10px -2px rgba(20, 27, 45, 0.08)',
          color: '#141B2D',
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-3px) scale(1.03)';
          e.currentTarget.style.boxShadow = '0 18px 36px -4px rgba(16, 185, 129, 0.32), 0 6px 14px -2px rgba(20, 27, 45, 0.12)';
          e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.65)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = '0 12px 28px -4px rgba(16, 185, 129, 0.22), 0 4px 10px -2px rgba(20, 27, 45, 0.08)';
          e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.35)';
        }}
        title="Ask Sanjeevani — AI Lifeline (Powered by Gemini & GraphDB)"
      >
        {/* Floating Panda Mascot Avatar */}
        <PandaMascot size={38} isFloating={!isOpen} showMedBadge={true} />

        {/* Mascot Label */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 700, letterSpacing: '-0.02em', color: '#141B2D' }}>
              Sanjeevani
            </span>
            <span
              style={{
                fontSize: '9px',
                fontWeight: 700,
                padding: '1px 5px',
                borderRadius: '4px',
                background: '#D1FAE5',
                color: '#065F46',
                letterSpacing: '0.02em',
              }}
            >
              AI LIFELINE
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '1px' }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#10B981',
                boxShadow: '0 0 6px #10B981',
              }}
            />
            <span style={{ fontSize: '10.5px', fontWeight: 500, color: '#64748B' }}>
              Gemini 3.5 · GraphDB Live
            </span>
          </div>
        </div>
      </button>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* FLOATING SANJEEVANI CHAT WINDOW                                       */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          data-testid="graph-chatbot-window"
          className="graph-chatbot-floating-window"
          style={{
            position: 'fixed',
            bottom: '86px',
            left: '24px',
            width: '420px',
            maxWidth: 'calc(100vw - 48px)',
            height: '600px',
            maxHeight: 'calc(100vh - 120px)',
            background: '#FAF8F3', // Light cream map paper tone
            border: '1.5px solid #E8E3D8',
            borderRadius: '20px',
            boxShadow: '0 24px 54px -10px rgba(20, 27, 45, 0.25), 0 10px 20px -5px rgba(20, 27, 45, 0.08)',
            zIndex: 1150,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            animation: 'fadeInUp 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* ── 1. Header with Panda Badge ── */}
          <div
            style={{
              padding: '12px 18px',
              background: '#FFFFFF',
              borderBottom: '1px solid #E8E3D8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <PandaMascot size={36} isFloating={false} showMedBadge={true} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#141B2D', letterSpacing: '-0.02em' }}>
                    Sanjeevani
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#059669' }}>
                    संजीवनी
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '1px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10B981' }} />
                  <span style={{ fontSize: '10.5px', color: '#64748B' }}>
                    Grounded in 25 NCR Hospitals & Telemetry
                  </span>
                </div>
              </div>
            </div>

            {/* Header Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {/* Web TTS Voice Toggle */}
              <button
                type="button"
                onClick={() => {
                  if (isSpeaking) stopSpeaking();
                  setTtsEnabled(!ttsEnabled);
                }}
                title={ttsEnabled ? 'Mute Sanjeevani voice' : 'Enable Sanjeevani voice'}
                style={{
                  background: ttsEnabled ? '#D1FAE5' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px',
                  cursor: 'pointer',
                  color: ttsEnabled ? '#065F46' : '#94A3B8',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'background 0.15s ease',
                }}
              >
                {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>

              {/* Gemini Key Config Toggle */}
              <button
                type="button"
                onClick={() => setShowKeyConfig(!showKeyConfig)}
                title="Gemini API Key configuration"
                style={{
                  background: showKeyConfig ? '#E2E8F0' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px',
                  cursor: 'pointer',
                  color: keyConfigured ? '#10B981' : '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'background 0.15s ease',
                }}
              >
                <Key size={16} />
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setIsOpen(false);
                }}
                title="Close Sanjeevani"
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px',
                  cursor: 'pointer',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* ── 2. Collapsible Gemini Key Settings ── */}
          {showKeyConfig && (
            <div
              style={{
                padding: '12px 18px',
                background: '#FFFFFF',
                borderBottom: '1px solid #E8E3D8',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#141B2D' }}>
                  Gemini API Key Configuration
                </span>
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 600,
                    color: '#059669',
                  }}
                >
                  ✓ Active with Gemini 3.5
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="password"
                  placeholder="Gemini API key..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  style={{
                    flex: 1,
                    height: '34px',
                    padding: '0 10px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    background: '#F8FAFC',
                    color: '#0F172A',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  style={{
                    background: '#10B981',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0 12px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleClearApiKey}
                  title="Clear API key"
                  style={{
                    background: '#F1F5F9',
                    color: '#64748B',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    padding: '0 8px',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  Clear
                </button>
              </div>
              <p style={{ fontSize: '10.5px', color: '#64748B', margin: '6px 0 0 0' }}>
                Configured with your provided API key and strictly grounded on our live GraphDB.
              </p>
            </div>
          )}

          {keySavedToast && (
            <div
              style={{
                padding: '6px 14px',
                background: '#D1FAE5',
                color: '#065F46',
                fontSize: '11px',
                fontWeight: 600,
                textAlign: 'center',
                borderBottom: '1px solid #A7F3D0',
              }}
            >
              ✓ Sanjeevani API key saved successfully
            </div>
          )}

          {/* ── 3. Chat Messages Stream ── */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: isUser ? 'row-reverse' : 'row',
                    gap: '10px',
                    alignItems: 'flex-start',
                  }}
                >
                  {/* Sender Avatar */}
                  {isUser ? (
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: '#141B2D',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px',
                        color: '#FFFFFF',
                      }}
                    >
                      <User size={14} />
                    </div>
                  ) : (
                    <div style={{ flexShrink: 0, marginTop: '2px' }}>
                      <PandaMascot size={28} isFloating={false} showMedBadge={true} />
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div style={{ maxWidth: '82%' }}>
                    <div
                      style={{
                        padding: '11px 15px',
                        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: isUser ? '#141B2D' : '#FFFFFF',
                        color: isUser ? '#FFFFFF' : '#141B2D',
                        border: isUser ? 'none' : '1px solid #E8E3D8',
                        boxShadow: isUser
                          ? '0 2px 8px rgba(20, 27, 45, 0.15)'
                          : '0 2px 8px rgba(20, 27, 45, 0.04)',
                        fontSize: '12.5px',
                        lineHeight: 1.55,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {msg.text}
                    </div>

                    {/* Metadata & Read Aloud action */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '4px',
                        justifyContent: isUser ? 'flex-end' : 'flex-start',
                        padding: '0 4px',
                      }}
                    >
                      <span style={{ fontSize: '10px', color: '#94A3B8' }}>{msg.timestamp}</span>
                      {!isUser && (
                        <button
                          type="button"
                          onClick={() => speak(msg.text)}
                          title="Read aloud with Sanjeevani voice"
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            color: '#94A3B8',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Volume2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {isTyping && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <PandaMascot size={28} isFloating={true} showMedBadge={true} />
                <div
                  style={{
                    padding: '8px 14px',
                    borderRadius: '14px',
                    background: '#FFFFFF',
                    border: '1px solid #E8E3D8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span style={{ fontSize: '11.5px', color: '#059669', fontWeight: 600 }}>
                    Sanjeevani is thinking...
                  </span>
                  <span
                    style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      background: '#10B981',
                      animation: 'ping 1s infinite',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Quick Suggestion Chips */}
            {messages.length <= 2 && !isTyping && (
              <div style={{ marginTop: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '8px' }}>
                  Ask Sanjeevani about our Route Graph:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {SUGGESTED_QUERIES.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleSendMessage(q)}
                      style={{
                        textAlign: 'left',
                        padding: '7px 12px',
                        background: '#FFFFFF',
                        border: '1px solid #E8E3D8',
                        borderRadius: '10px',
                        fontSize: '11.5px',
                        color: '#141B2D',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#ECFDF5';
                        e.currentTarget.style.borderColor = '#10B981';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#FFFFFF';
                        e.currentTarget.style.borderColor = '#E8E3D8';
                      }}
                    >
                      <span>{q}</span>
                      <ArrowRight size={12} color="#10B981" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Recognition Error notice if microphone blocked */}
          {recognitionError && (
            <div
              style={{
                padding: '6px 14px',
                background: '#FEE2E2',
                color: '#991B1B',
                fontSize: '11px',
                borderTop: '1px solid #FCA5A5',
              }}
            >
              {recognitionError}
            </div>
          )}

          {/* Voice Listening Bar Indicator */}
          {isListening && (
            <div
              style={{
                padding: '8px 14px',
                background: '#ECFDF5',
                borderTop: '1px solid #A7F3D0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#10B981',
                    animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
                  }}
                />
                <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#065F46' }}>
                  Sanjeevani is listening to your voice... Speak your query
                </span>
              </div>
              <button
                type="button"
                onClick={stopListening}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#065F46',
                  cursor: 'pointer',
                }}
              >
                Stop
              </button>
            </div>
          )}

          {/* ── 4. Input & Voice STT Bar ── */}
          <div
            style={{
              padding: '10px 14px',
              background: '#FFFFFF',
              borderTop: '1px solid #E8E3D8',
            }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {/* Web Speech-to-Text Microphone Button */}
              <button
                type="button"
                data-testid="speech-to-text-mic-btn"
                onClick={handleToggleVoiceInput}
                title={isListening ? 'Stop listening' : 'Speak to Sanjeevani via Web SST Microphone'}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  border: isListening ? '1.5px solid #10B981' : '1px solid #E2E8F0',
                  background: isListening ? '#D1FAE5' : '#F8FAFC',
                  color: isListening ? '#059669' : '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              {/* Text Input Field */}
              <input
                ref={inputRef}
                type="text"
                data-testid="graph-chatbot-input"
                placeholder={isListening ? 'Listening...' : 'Ask Sanjeevani or speak via mic...'}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                style={{
                  flex: 1,
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  background: '#F8FAFC',
                  color: '#0F172A',
                  fontSize: '12.5px',
                  outline: 'none',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#10B981')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#E2E8F0')}
              />

              {/* Send Button */}
              <button
                type="submit"
                data-testid="graph-chatbot-send-btn"
                disabled={!inputText.trim()}
                title="Send query (Enter)"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: inputText.trim() ? '#10B981' : '#E2E8F0',
                  color: inputText.trim() ? '#FFFFFF' : '#94A3B8',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: inputText.trim() ? 'pointer' : 'default',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
              >
                <Send size={15} />
              </button>
            </form>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '6px',
                padding: '0 2px',
              }}
            >
              <span style={{ fontSize: '9.5px', color: '#94A3B8' }}>
                Sanjeevani AI · Gemini 3.5 & Plexus GraphDB · Web TTS & SST Active
              </span>
              <button
                type="button"
                onClick={() => setMessages([INITIAL_GREETING])}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: '9.5px',
                  color: '#64748B',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                }}
              >
                <RotateCcw size={10} />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scoped CSS animation for slide-up and floating panda */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes floatingPanda {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-5px) rotate(-1.5deg);
          }
        }
        @media (max-width: 768px) {
          .graph-chatbot-floating-trigger {
            bottom: 74px !important;
            left: 16px !important;
            padding: 6px 12px 6px 8px !important;
          }
          .graph-chatbot-floating-window {
            bottom: 125px !important;
            left: 12px !important;
            right: 12px !important;
            width: auto !important;
            max-width: calc(100vw - 24px) !important;
            height: calc(100vh - 160px) !important;
          }
        }
      `}</style>
    </>
  );
};

export default GraphChatbot;
