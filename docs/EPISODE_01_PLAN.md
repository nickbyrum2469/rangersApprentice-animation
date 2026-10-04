# Episode 1: "The Choosing" (production plan)

A fan-made animated adaptation of the opening of *The Ruins of Gorlan* (John Flanagan's
*Ranger's Apprentice*, book 1). Target runtime: about **15 minutes**.

> **Fan-work note:** the characters and story belong to John Flanagan. Write all narration
> and dialogue in your own words; don't read passages from the book. Credit the books in the
> video description. YouTube may limit monetization on fan adaptations.

---

## Look & feel

- **Style:** moonlit silhouette animation. Characters are dark shapes rim-lit by the moon or
  by firelight. Scenery is layered parallax paintings with fog, haze, and drifting particles.
  Think shadow-puppet theatre crossed with a cinematic trailer.
- **Frame:** 1920×1080, 2.39:1 letterbox bars, 30 fps.
- **Palette:** cold blue night (`#06090f` → `#6f7fa3`) against warm amber windows and fire
  (`#ffb45e`). Day scenes (Choosing Day) use a warm dawn palette instead.
- **Type:** Cinzel for titles, Cormorant Garamond italic for narration captions.
- **Sound (added in an editor):** narrator voice-over, ambient wind and crickets, and a quiet
  folk/orchestral score from the YouTube Audio Library.

## Why silhouettes

Silhouettes let a code-built animation look polished, and they keep the work cheap:

- Each character is defined by **shape**, not facial animation, so one rig covers the whole
  cast (Horace = broad, Alyss = tall with long hair, Will = small and quick, Halt = cowl and
  cloak).
- Scenery is painted once, cached, and reused across many shots.
- Emotion comes from **framing, light, camera moves, and narration**, which are cheap to change.

---

## Beat sheet (about 15:00)

| # | Time | Scene | What happens | New assets needed |
|---|------|-------|--------------|-------------------|
| 0 | 0:00–0:36 | **Cold open** ✅ | Night over Redmont. A hooded Ranger watches from a crag. Title card. A boy climbs the castle wall. | Done (this repo) |
| 1 | 0:36–1:30 | Ward at dawn | "Earlier that day." Sunrise over the castle. The five wards wake in the Ward dormitory. Will can't sleep. | Dawn palette, interior room set |
| 2 | 1:30–3:00 | Will & Horace | Courtyard. Horace (big, confident) and Will (small, restless). Their rivalry is set up. Narrator explains what a ward is. | Courtyard set, walk cycle |
| 3 | 3:00–4:00 | The great hall | The wards file into the Baron's hall. The craftmasters stand in a row. A cloaked figure stands in a dark corner. | Hall interior, banners, torches |
| 4 | 4:00–6:30 | The Choosing | Each ward steps forward: Horace → Battleschool, Alyss → Diplomatic Service, Jenny → the kitchens, George → Scribeschool. One beat each, shown as silhouette tableaux. | Masters' silhouettes (5) |
| 5 | 6:30–8:00 | Rejected | Will asks for Battleschool. The Battlemaster turns him down: too small. Silence. The hooded man passes a folded note to the Baron. The Baron delays his decision until tomorrow. | Close-up framing, note prop |
| 6 | 8:00–9:00 | Alone | Dusk on the castle walls. Will sits alone and makes a decision. | Sunset sky variant |
| 7 | 9:00–11:30 | **The climb** | Full version of the cold open. Will climbs the tower ivy, slips through the window into the dark office, and finds the note on the desk. | Interior office, candle light |
| 8 | 11:30–12:30 | Caught | A voice from the shadows. The Ranger has been sitting in the dark the whole time. Tense two-shot silhouette. | Office dark variant, sitting pose |
| 9 | 12:30–14:15 | The offer | Morning, before the Baron. The note was a recommendation. Will can choose to apprentice to the Ranger. He accepts. | Reuse hall |
| 10 | 14:15–15:00 | Into the forest | Will follows Halt out of the castle gate toward the forest. Fade to the end card. Tease Episode 2. | Reuse forest layers, walk cycle |

✅ = already animated in `episodes/ep01/cold-open.js`

## Asset checklist (build once, reuse every episode)

**Characters:** Halt ✅, Will ✅ (climb), Horace, Alyss, Jenny, George, Baron Arald,
Sir Rodney (Battlemaster), the other craftmasters.
**Animations:** walk, stand/idle ✅, climb ✅, sit, gesture/point, turn head.
**Sets:** Redmont exterior night ✅, castle wall ✅, dawn exterior, courtyard, great hall,
Baron's office, Ward dormitory, forest path.
**Effects:** fog ✅, leaves ✅, embers ✅, stars/moon ✅, torch flicker, candle glow, sunrise.

---

## Production workflow (keeps Claude usage low)

1. **Script first, in plain text.** Write the full narration for all 11 beats before any
   animation. Changing words is cheap; changing animation costs more.
2. **Record the voice-over next** (your own voice, or an AI voice tool like ElevenLabs). The
   audio length sets each scene's exact duration.
3. **Build assets in batches.** Ask for several related things in one message ("make the
   great hall set plus torch flicker plus sitting pose"), not one at a time.
4. **Each scene is one small file** in `episodes/ep01/` that only arranges existing assets
   with a camera, keyframes, and captions. New scenes should rarely need new engine code.
5. **Review with stills, not full renders.** `npm run stills -- 12,40,75` saves a few PNG
   frames in seconds. Only render full video when a scene is approved.
6. **Render on your own machine if you can.** Rendering is free (no Claude usage) but takes
   time: about 3 frames per second on this cloud box, so the full 15 minutes takes 2–3 hours.
7. **Final assembly in a video editor** (CapCut / DaVinci Resolve, both free): put the
   scene MP4s on the timeline, then add voice-over, music, and sound effects.

## Commands

```bash
npm install                                 # one time
open player.html                            # live preview in a browser (scrub with the slider)
npm run stills -- 3,14,31                   # quick PNG frames → out/stills/
node render.js --preview                    # fast half-res draft
node render.js                              # final 1080p → out/cold-open.mp4
node render.js --from 11 --to 21            # re-render one section only
node render.js --ep episodes/ep01/hall.js   # render a different scene file
```
