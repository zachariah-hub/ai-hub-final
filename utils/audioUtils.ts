// This file contains utility functions for handling audio in the browser.

let audioContext: AudioContext | null = null;

/**
 * Initializes the AudioContext.
 * This must be called as a result of a user gesture (e.g., a click) to comply with browser autoplay policies.
 */
export const initAudio = (): boolean => {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      // Resume context if it's in a suspended state (common in modern browsers)
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      return true;
    } catch (e) {
      console.error("Web Audio API is not supported in this browser", e);
      return false;
    }
  }
  return true;
};

/**
 * Generates and plays a DTMF (dial tone) sound for a given digit.
 * @param digit The digit to play ('0'-'9', '*', '#').
 * @param duration Duration of the tone in milliseconds.
 */
export const playDTMFTone = (digit: string, duration = 150): void => {
  if (!audioContext) {
    console.warn("AudioContext not initialized. Cannot play DTMF tone.");
    return;
  }
  
  const dtmfFrequencies: { [key: string]: [number, number] } = {
    '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
    '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
    '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
    '*': [941, 1209], '0': [941, 1336], '#': [941, 1477],
  };

  const freqs = dtmfFrequencies[digit];
  if (!freqs) return;

  const [freq1, freq2] = freqs;
  const oscillator1 = audioContext.createOscillator();
  const oscillator2 = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.01); // Quick fade in
  gainNode.gain.setValueAtTime(0.5, audioContext.currentTime + (duration / 1000) - 0.01);
  gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + (duration / 1000)); // Quick fade out

  oscillator1.type = 'sine';
  oscillator1.frequency.setValueAtTime(freq1, audioContext.currentTime);
  oscillator2.type = 'sine';
  oscillator2.frequency.setValueAtTime(freq2, audioContext.currentTime);

  oscillator1.connect(gainNode);
  oscillator2.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator1.start();
  oscillator2.start();
  oscillator1.stop(audioContext.currentTime + (duration / 1000));
  oscillator2.stop(audioContext.currentTime + (duration / 1000));
};

/**
 * Uses the browser's Speech Synthesis API to speak text.
 * @param text The text to be spoken.
 * @param lang The language code (e.g., 'es-CO' for Colombian Spanish).
 * @returns A promise that resolves when the speech has finished.
 */
export const speak = (text: string, lang = 'es-CO'): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      console.error("Speech Synthesis not supported in this browser.");
      return reject(new Error("Speech Synthesis not supported"));
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.pitch = 1.1;

    // Find a suitable voice
    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find(voice => voice.lang.startsWith('es-'));
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = (event) => reject(event.error);
    
    // Cancel any previous speech before starting a new one
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
};

/**
 * Stops any currently playing speech synthesis.
 */
export const stopAudio = (): void => {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
};