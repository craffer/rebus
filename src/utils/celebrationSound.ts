/**
 * Play a short ascending chime using Web Audio API synthesis.
 * Three sine wave notes: C5 → E5 → G5, ~0.6s total.
 */
export function playCelebrationSound(): void {
  try {
    const ctx = new AudioContext();
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 in Hz

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      const startTime = ctx.currentTime + i * 0.15;
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  } catch {
    // AudioContext may not be available or may require user gesture
  }
}
