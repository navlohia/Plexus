/**
 * src/hooks/useWebSpeech.ts
 * Web Speech API Integration: Web TTS (Text-to-Speech) and Web SST (Speech-to-Text)
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// TypeScript declarations for Web Speech Recognition API
interface IWindowSpeech extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export function useWebSpeech() {
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(true);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isTtsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const isSstSupported =
    typeof window !== 'undefined' &&
    Boolean((window as IWindowSpeech).SpeechRecognition || (window as IWindowSpeech).webkitSpeechRecognition);

  // Stop active speech on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore abort error
        }
      }
    };
  }, []);

  /**
   * Text-to-Speech: Speaks text aloud using SpeechSynthesis
   */
  const speak = useCallback(
    (rawText: string) => {
      if (!isTtsSupported || !ttsEnabled) return;

      try {
        window.speechSynthesis.cancel();

        // Clean markdown syntax, emojis, and asterisks for smooth human voice
        const cleanText = rawText
          .replace(/[*#_`~>]/g, '')
          .replace(/\((?:https?:\/\/[^\)]+)\)/g, '')
          .replace(/[🚨📦🚚🌡️✅⚡🏥🎯📊💡⚠️•]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (!cleanText) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        utterance.lang = 'en-US';

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        currentUtteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('[Web TTS] Speech synthesis error:', err);
        setIsSpeaking(false);
      }
    },
    [isTtsSupported, ttsEnabled]
  );

  /**
   * Stops active speech immediately
   */
  const stopSpeaking = useCallback(() => {
    if (!isTtsSupported) return;
    try {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } catch {
      // Ignore
    }
  }, [isTtsSupported]);

  /**
   * Speech-to-Text: Listens to user voice input via Web Speech Recognition
   */
  const startListening = useCallback(
    (onResult: (transcript: string) => void) => {
      if (!isSstSupported) {
        setRecognitionError('Speech-to-Text is not supported in this browser. Please use Google Chrome or Edge.');
        return;
      }

      setRecognitionError(null);

      try {
        const SpeechRec = (window as IWindowSpeech).SpeechRecognition || (window as IWindowSpeech).webkitSpeechRecognition;
        const recognition = new SpeechRec();
        recognitionRef.current = recognition;

        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results?.[0]?.[0]?.transcript;
          if (transcript && typeof transcript === 'string') {
            onResult(transcript.trim());
          }
          setIsListening(false);
        };

        recognition.onerror = (event: any) => {
          console.warn('[Web SST] Recognition error:', event.error);
          if (event.error !== 'no-speech') {
            setRecognitionError(`Microphone notice: ${event.error}`);
          }
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.start();
      } catch (err: any) {
        console.error('[Web SST] Failed to start speech recognition:', err);
        setRecognitionError(err?.message || 'Could not access microphone');
        setIsListening(false);
      }
    },
    [isSstSupported]
  );

  /**
   * Stops active voice recognition
   */
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
    }
    setIsListening(false);
  }, []);

  return {
    speak,
    stopSpeaking,
    isSpeaking,
    ttsEnabled,
    setTtsEnabled,
    isTtsSupported,
    startListening,
    stopListening,
    isListening,
    isSstSupported,
    recognitionError,
  };
}

