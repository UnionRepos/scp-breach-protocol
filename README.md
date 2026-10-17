# Breach Protocol

[Play the game](https://unionrepos.github.io/scp-breach-protocol/) · [Public repository](https://github.com/UnionRepos/scp-breach-protocol)

A complete top-down SCP Foundation browser shooter. All visual assets are original vector geometry, drawn with Canvas paths, lines, polygons, and SVG. Sound is synthesized with Web Audio. No image or sound files, package installation, build step, or server-side service required.

Run locally: `python3 -m http.server 8080 --directory dist`, then visit http://localhost:8080.

Controls: WASD / arrows move, mouse aims, hold click / Space fires, R reloads, Shift dashes, E emits an EMP pulse, 1/2/3 select weapons, Q cycles weapons, and Esc pauses. Touch supports left movement, right aiming / firing, and on-screen Swap, EMP, Dash, and Reload buttons.

Operation Lockdown has six mission phases, three weapon types, five enemy types, and seven stackable field upgrades. Fight reanimated personnel, hunter packs, statues, rogue sentries, and a final lockdown sentinel. Clear the final sector and hold the south extraction pad to finish. Standard and Critical have separate best scores.

Choose a permanent upgrade between phases. Each weapon has its own magazine: automatic carbine, close-range shotgun, or piercing marksman rifle. An EMP damages and slows nearby enemies and removes hostile projectiles. Medical kits restore health; supply cells refill the active weapon and recharge EMP. Quick kills build a score multiplier.

Enemies navigate around cover and separate from crowds. Spawns, ranged attacks, blinks, and electrical hazards are telegraphed. Touch play expands the arena, adds a minimap, and offers optional aim assistance. The simulation uses a fixed timestep; HUD updates are throttled and particle counts are bounded. Aim assistance and screen shake preferences persist on the device.

SCP-derived content and this game are licensed CC BY-SA 3.0. Source attributions are available in the in-game Credits & License dialog and LICENSE.md.

## Deployment

GitHub Pages serves `dist/`. The workflow validates the simulation, audio, and offline behavior and deploys on every push to `main`, or manually from Actions. Run `node scripts/prepare-release.mjs` after changing assets; it updates content hashes in the HTML and generates the matching offline cache. The script uses only Node built-ins and also runs in deployment CI.

Run all regressions with `node --test tests/*.test.mjs`. A fallible simulation bot can check basic pacing with `node scripts/simulate-operation.mjs`; this does not replace human difficulty testing.

Sound effects start when you deploy. Use the speaker button to mute or unmute; the setting is remembered on your device. Run the audio regression checks with `node --test tests/audio.test.mjs`.

## Progressive web app

Breach Protocol is installable as a standalone landscape app. The manifest includes app metadata, maskable vector icons, an install shortcut, and safe-area metadata. A service worker precaches the complete game shell and serves it offline after the first successful load. Online navigation checks for fresh content, while versioned assets stay consistent with the loaded release. Cache cleanup is scoped to this application. The browser's native install prompt is exposed through the Install game control when supported.
