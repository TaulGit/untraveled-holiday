# Audio sources

## Coast ambience

- File: `coast-soft.wav`
- Original: **Calm ocean waves**, SamsterBirdies, June 29, 2021.
- Source: https://freesound.org/people/SamsterBirdies/sounds/578524/
- License: CC0 — https://creativecommons.org/publicdomain/zero/1.0/
- Download: https://cdn.freesound.org/previews/578/578524_5487341-hq.mp3
- Recording: Whidbey Island, Washington, Zoom H1n; stereo.
- Changes: select a calm 65-second passage, high-pass 120 Hz, low-pass 3.8 kHz,
  five-second equal-power wrap crossfade, gentle peak compression and restrained loudness, encode as a
  60-second stereo PCM WAV loop. Reproduction: `scripts/prepare-ocean.py`.
- Runtime uses a decoded looping buffer for gapless playback, soft fades,
  low indoor level and automatic muting while the tab is hidden.

## Interface sounds

- `paper.ogg` / `place.ogg` / `finish.ogg`: **Kenney Interface Sounds**, CC0.
- https://kenney.nl/assets/interface-sounds
- https://opengameart.org/content/interface-sounds
- Originals: `scroll_001.ogg` / `click_003.ogg` / `confirmation_001.ogg`.
- Files are unmodified; playback volume is reduced in game.
- Included license: `Kenney-License.txt`.

All sounds originate from existing recordings/assets. No synthesized oscillator audio.

## Background music

- `coastal-calm.mp3`: **Coastal Calm**, supplied by the project owner for this game.
- Original MP3 is used without modification; looped at reduced volume.
- This track is not covered by the CC0 licenses of the sound effects above.
