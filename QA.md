# Verification

## Operation Lockdown update

- 30 Node regression checks cover combat, audio, progression, and service-worker behavior. Combat checks include obstacle navigation, independent magazines, piercing rounds, dash collision, observation/blinking, EMP, telegraphed spawns/attacks, upgrade selection, sentinel barrages, electrical relays, defeat priority, and extraction.
- Chromium desktop keyboard checks exercised movement, weapon selection, firing, EMP, and pause/resume. Upgrade selection advanced the next mission and applied the selected bonus.
- Native touch checks at 390 × 844 exercised movement, firing, weapon cycling, EMP, and pointer release. Portrait and 844 × 390 landscape layouts had no horizontal overflow, and upgrade cards fit inside the viewport.
- Offline Chromium navigation loaded the new simulation, switched to the marksman rifle, fired two rounds, and started audio successfully.
- Three seeded simulated players completed the six-phase operation using normal health, ammo, cooldowns, and upgrades in approximately 124–126 simulated seconds. This is a pacing sanity check, not a human difficulty assessment.
- Release preparation automatically synchronizes asset hashes and offline resources. Worker regressions verify fresh online navigation, offline start URLs, asset fallback behavior, and preservation of other applications' caches.

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

## PWA verification

- Manifest, service worker, install prompt handler, standalone metadata, and maskable vector icons are present.
- Service worker cache is scoped to the deployed app path and uses an offline navigation fallback.
