# Verification

Validated in Chromium at desktop (1440 px) and mobile (390 px) widths.

- JavaScript syntax check: `node --check dist/game.js`.
- Browser console: no JavaScript errors.
- Live keyboard input moved the operative and fired three rounds.
- Native touch input moved the operative, fired four rounds, enabled touch controls, and released both movement and firing on touch end.
- Mobile layout had no horizontal overflow.
- Browser simulation assertions passed for cover collision, open floor traversal, movement, magazine reload, dash immunity, medical pickup, projectile impact and containment, observed SCP-173 freezing, unobserved SCP-173 movement, defeat state, five-wave victory, pause, and resume.

The accelerated victory check advances cleared waves directly; it verifies state progression, not difficulty balance.

## Sound and arrow fixes

- `node --test tests/audio.test.mjs`: nine passing regressions for default sound, asynchronous and shared browser unlock, retry after a pending autoplay block, master mute, cancelled pending effects, rejected resume recovery, interrupted audio, closed contexts, node cleanup, and unavailable audio.
- Chromium audio analyser measured a nonzero firing peak (0.0968) and exactly zero output while muted.
- Sound starts when deploying, the mute setting survives reload, and suspended audio resumes on mission resume.
- Native mobile touch deployment unlocked audio and touch firing produced shots.
- No decorative arrow characters remain in initial, paused, or resumed interface text.
