// Source recordings only. Licensing and original URLs: assets/audio/CREDITS.md.
export function createAudio() {
  const waves = new Audio('./assets/audio/waves.flac');
  waves.loop = true;
  waves.volume = .18;
  const effects = Object.fromEntries(['paper', 'place', 'finish'].map(name => [name, new Audio(`./assets/audio/${name}.ogg`)]));
  let enabled = false;
  return {
    setEnabled(value) {
      enabled = value;
      if (value) waves.play().catch(() => {});
      else { waves.pause(); for (const audio of Object.values(effects)) audio.pause(); }
    },
    ambience(outdoors) { waves.volume = outdoors ? .18 : .04; },
    play(name) {
      if (!enabled) return;
      const audio = effects[name];
      audio.volume = .25; audio.currentTime = 0;
      audio.play().catch(() => {});
    },
  };
}
