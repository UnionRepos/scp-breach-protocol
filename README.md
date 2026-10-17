# Breach Protocol

[Play the game](https://unionrepos.github.io/scp-breach-protocol/) · [Public repository](https://github.com/UnionRepos/scp-breach-protocol)

A complete top-down SCP Foundation browser shooter. All visual assets are original vector geometry, drawn with Canvas paths, lines, polygons, and SVG. Sound is synthesized with Web Audio. No image or sound files, package installation, build step, or server-side service required.

Run locally: `python3 -m http.server 8080 --directory dist`, then visit http://localhost:8080.

Controls: WASD / arrows move, mouse aims, hold click / Space fires, R reloads, Shift dashes, Esc pauses. Touch supports left movement and right aiming / firing, with on-screen reload and dash buttons.

Survive 5 waves for extraction. Standard and Critical difficulty, three anomaly classes, cover collision, ammo/reload, medical drops, automatic observation/blinking mechanics, procedural sound, pause, fullscreen, and local best score.

SCP-derived content and this game are licensed CC BY-SA 3.0. Source attributions are available in the in-game Credits & License dialog and LICENSE.md.

## Deployment

GitHub Pages serves the `dist/` directory. The workflow in `.github/workflows/pages.yml` validates the JavaScript and deploys automatically on every push to `main`, or can be run manually from the Actions tab. No dependencies or build step are needed.

Sound effects start when you deploy. Use the speaker button to mute or unmute; the setting is remembered on your device. Run the audio regression checks with `node --test tests/audio.test.mjs`.
