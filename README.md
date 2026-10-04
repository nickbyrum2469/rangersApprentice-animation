# Ranger's Apprentice: fan animation

A fan-made animated series based on John Flanagan's *Ranger's Apprentice*, built entirely
in code: a small 2D canvas engine renders moonlit silhouette scenes frame by frame, and
ffmpeg turns them into video.

- **Series outline (whole book, 10 episodes):** [`story/SERIES_OUTLINE.md`](story/SERIES_OUTLINE.md)
- **Episode 1 script:** [`story/ep01-the-choosing.md`](story/ep01-the-choosing.md)
- **Animation test:** an early 36s style test in `episodes/ep01/cold-open.js`

## Quick start

```bash
npm install
npm run stills -- 3,14,31     # PNG frames → out/stills/
node render.js --preview      # fast draft video
node render.js                # 1080p video → out/cold-open.mp4
```

Open `player.html` in a browser for a live preview with a scrub bar.

## Layout

| Path | What it is |
|------|------------|
| `engine/core.js` | timing, keyframes, easing, camera and parallax, post effects (letterbox, vignette, grading), text |
| `engine/world.js` | sky, moon, stars, clouds, ridges and forests, Castle Redmont, fog, stone walls, ivy, windows, particles |
| `engine/characters.js` | silhouette character rig with rim lighting, climb and idle poses, hooded Ranger figure |
| `episodes/ep01/*.js` | shots for Episode 1; each shot draws as a function of time |
| `render.js` | headless Chromium → PNG frames → ffmpeg MP4 |
