// Recorded CC0 audio only; no oscillators. Sources: assets/audio/CREDITS.md.
export function createAudio() {
  const effects = Object.fromEntries(['paper', 'place', 'finish'].map(name => [name, new Audio(`./assets/audio/${name}.ogg`)]));
  let enabled = false, outdoors = false, context, gain, source, loading;
  let target = -1;
  function updateGain() {
    if (!gain) return;
    const next = enabled && !document.hidden ? (outdoors ? .14 : .008) : 0;
    if (next === target) return;
    target = next;
    gain.gain.setTargetAtTime(next, context.currentTime, enabled ? .8 : .12);
  }
  async function prepare() {
    context ??= new (window.AudioContext || window.webkitAudioContext)();
    await context.resume();
    loading ??= fetch('./assets/audio/coast-soft.wav').then(response => {
      if (!response.ok) throw new Error('Coastal ambience could not load');
      return response.arrayBuffer();
    }).then(data => context.decodeAudioData(data)).then(buffer => {
      gain = context.createGain(); gain.gain.value = 0;
      gain.connect(context.destination);
      source = context.createBufferSource(); source.buffer = buffer;
      source.loop = true; source.connect(gain); source.start();
      updateGain();
    }).catch(error => { loading = null; console.warn(error); });
    await loading;
    updateGain();
  }
  document.addEventListener('visibilitychange', updateGain);
  return {
    setEnabled(value) {
      enabled = value;
      if (value) prepare().catch(error => console.warn(error));
      else for (const audio of Object.values(effects)) audio.pause();
      updateGain();
    },
    ambience(value) { outdoors = value; updateGain(); },
    play(name) {
      if (!enabled || document.hidden) return;
      const audio = effects[name];
      audio.volume = .18; audio.currentTime = 0;
      audio.play().catch(() => {});
    },
  };
}
