export function playSound(
  kind: "correct" | "wrong" | "finish",
  enabled: boolean,
) {
  if (!enabled) return;
  try {
    const ctx = new AudioContext();
    const tones =
      kind === "finish"
        ? [523, 659, 784]
        : kind === "correct"
          ? [660, 880]
          : [260, 220];
    tones.forEach((frequency, i) => {
      const oscillator = ctx.createOscillator(),
        gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = frequency;
      const start = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.065, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
      oscillator.start(start);
      oscillator.stop(start + 0.16);
    });
    setTimeout(() => {
      void ctx.close();
    }, 1000);
  } catch {
    /* Audio may be unavailable in a browser; training remains functional. */
  }
}
