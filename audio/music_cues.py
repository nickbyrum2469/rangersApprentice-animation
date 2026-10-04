# Generates the score for an episode with MusicGen (free, runs locally on CPU).
# Each cue is a ~30s piece; the mixer loops / crossfades / trims them to scene length.
import os, sys, time, torch, numpy as np, scipy.io.wavfile as wf
from transformers import AutoProcessor, MusicgenForConditionalGeneration

STYLE = "cinematic fantasy film score, medieval, high quality orchestral recording, no vocals"
CUES = {
  "dawn":            "peaceful sunrise over a medieval castle, solo wooden flute melody, soft harp arpeggios, warm strings, hopeful",
  "playful":         "playful mischievous comedic folk tune, pizzicato strings, bassoon, light percussion, bouncy",
  "rivalry":         "confident teasing march, snare drum, low brass, boyish rivalry, medium tempo",
  "duel":            "energetic sword practice fight, fast strings, frame drum, celtic fiddle, exciting but lighthearted",
  "thoughtful":      "quiet warm library, gentle piano and cello, reflective, tender, slow",
  "mystery":         "mysterious hooded stranger at dusk, low strings, alto flute, sparse, curious and slightly ominous",
  "night":           "tender nighttime lullaby, solo harp and soft strings, emotional, intimate, slow",
  "transition_title":"heroic main theme for an adventure series, soaring french horns, flute melody, full orchestra, big and uplifting",
  "nervous":         "nervous anticipation, ticking pizzicato strings, light woodwinds, waiting before a ceremony",
  "ceremony":        "formal medieval court ceremony, regal brass fanfare softening into strings, stately",
  "sad":             "sad lonely sunset, solo cello melody, sparse piano, heartbreak, slow",
  "tension_build":   "sneaking climbing at night, tense low ostinato strings, pulsing, building suspense",
  "held_breath":     "very quiet suspense, high sustained violins, dark room, held breath, minimal",
  "theme_quiet":     "gentle reprise of an adventure theme, solo flute over soft strings, wonder, quiet ending",
  "villain":         "dark evil sorcerer theme, deep choir-like pads, low brass, war drums, thunder, menacing",
  "end_theme":       "heroic adventure end credits theme, flute and horns over full orchestra, celtic, uplifting",
}

def main(names):
    torch.set_num_threads(os.cpu_count())
    torch.manual_seed(7)
    proc = AutoProcessor.from_pretrained("facebook/musicgen-small")
    model = MusicgenForConditionalGeneration.from_pretrained("facebook/musicgen-small")
    sr = model.config.audio_encoder.sampling_rate
    os.makedirs("audio/music", exist_ok=True)
    for name in names:
        out = f"audio/music/{name}.wav"
        if os.path.exists(out):
            continue
        t = time.time()
        inp = proc(text=[f"{CUES[name]}, {STYLE}"], padding=True, return_tensors="pt")
        a = model.generate(**inp, max_new_tokens=1500, do_sample=True, guidance_scale=3.5)[0, 0].numpy()
        wf.write(out, sr, (a / max(1e-6, np.abs(a).max()) * 0.9).astype(np.float32))
        print(f"{name}: {len(a)/sr:.1f}s in {time.time()-t:.0f}s", flush=True)

if __name__ == "__main__":
    main(sys.argv[1:] or list(CUES))
