/**
 * Play a celebratory ascending arpeggio using Web Audio API synthesis.
 * C major arpeggio: C5 → E5 → G5 → C6 → E6, with a gentle sustain.
 */
export function playCelebrationSound(): void {
  try {
    const ctx = new AudioContext();

    // C major arpeggio climbing two octaves
    const notes = [
      { freq: 523.25, delay: 0 }, // C5
      { freq: 659.25, delay: 0.12 }, // E5
      { freq: 783.99, delay: 0.24 }, // G5
      { freq: 1046.5, delay: 0.36 }, // C6
      // slight rest
      { freq: 880.0, delay: 0.66 }, // A5
      { freq: 1046.5, delay: 0.78 }, // C6
      { freq: 1174.66, delay: 0.9 }, // D6
      { freq: 1318.5, delay: 1.02 }, // E6
    ];

    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = note.freq;
      osc.type = "sine";

      const start = ctx.currentTime + note.delay;
      // Slightly louder attack, longer sustain for a fuller sound
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.5);

      osc.start(start);
      osc.stop(start + 0.5);
    }
  } catch {
    // AudioContext may not be available or may require user gesture
  }
}
