
import { useState, useCallback, useEffect } from 'react';

interface TextToSpeechHook {
  speak: (text: string) => void;
  cancel: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
  error: string | null;
}

const useTextToSpeech = (): TextToSpeechHook => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      setIsSupported(true);
    } else {
      setIsSupported(false);
      setError("Text-to-speech is not supported in this browser.");
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (!isSupported || !text) return;

    setError(null);
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Optional: Configure voice, rate, pitch
    // const voices = window.speechSynthesis.getVoices();
    // utterance.voice = voices[0]; // Select a voice
    utterance.lang = 'en-US';
    utterance.pitch = 1;
    utterance.rate = 1;
    utterance.volume = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (event) => {
      setError(`Speech synthesis error: ${event.error}`);
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  }, [isSupported]);

  const cancel = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  return { speak, cancel, isSpeaking, isSupported, error };
};

export default useTextToSpeech;
