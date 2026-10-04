"""Builds a fully mixed episode soundtrack straight from the script.

    python3 audio/build_episode.py story/ep01-the-choosing.md out/ep01

Pipeline:
  1. parse the script into scenes, voice lines, action beats and sound cues
  2. voice each line with the character's voice (Kokoro TTS, local + free), cached
  3. clean up each voice clip: pitch/formant, EQ, de-ess, compression, level matching
  4. lay everything on a timeline (actions and [BEAT]s get screen time between lines)
  5. mix dialogue + room reverb, ambience beds, sound effects, ducked music
  6. master to YouTube loudness (-14 LUFS) and write timeline.json for the animation
"""
import hashlib, json, os, re, subprocess, sys, tempfile
import numpy as np
import soundfile as sf
from scipy import signal

sys.path.insert(0, os.path.dirname(__file__))
import soundlib as S
from soundlib import SR

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "audio", "cache")
VOICE_DIR = os.path.join(ROOT, "tools", "voices")

# ---------------------------------------------------------------- cast
# voice: a Kokoro voice, or a blend {voice: weight}. pitch in semitones.
# formant "shifted" makes a voice sound younger/smaller (or older/bigger when negative).
CAST = {
    "NARRATOR":     dict(voice="bm_fable", speed=0.93, pitch=0.0, formant="preserved", gain=0, dry=True),
    "WILL":         dict(voice={"am_puck": 0.7, "am_liam": 0.3}, speed=1.06, pitch=1.6, formant="shifted", gain=0),
    "HORACE":       dict(voice={"am_michael": 0.6, "am_fenrir": 0.4}, speed=1.0, pitch=0.6, formant="shifted", gain=0),
    "JENNY":        dict(voice={"af_bella": 0.6, "bf_lily": 0.4}, speed=1.12, pitch=1.2, formant="shifted", gain=0),
    "ALYSS":        dict(voice={"bf_emma": 0.7, "bf_alice": 0.3}, speed=0.96, pitch=0.8, formant="shifted", gain=-1),
    "GEORGE":       dict(voice={"am_liam": 0.5, "bm_lewis": 0.5}, speed=1.13, pitch=1.8, formant="shifted", gain=0),
    "HALT":         dict(voice={"bm_george": 0.8, "am_onyx": 0.2}, speed=0.88, pitch=-1.6, formant="preserved", gain=0),
    "BARON ARALD":  dict(voice={"am_onyx": 0.5, "bm_daniel": 0.5}, speed=0.95, pitch=-1.2, formant="preserved", gain=1),
    "SIR RODNEY":   dict(voice={"bm_daniel": 0.8, "am_eric": 0.2}, speed=1.0, pitch=-0.6, formant="preserved", gain=0),
    "LADY PAULINE": dict(voice="bf_isabella", speed=0.92, pitch=-0.3, formant="preserved", gain=-1),
    "MASTER CHUBB": dict(voice={"am_santa": 0.7, "am_fenrir": 0.3}, speed=1.1, pitch=0.8, formant="preserved", gain=1),
    "MASTER NIGEL": dict(voice="bm_lewis", speed=0.96, pitch=0.3, formant="preserved", gain=-1),
    "CLERK":        dict(voice="am_eric", speed=1.0, pitch=0.5, formant="preserved", gain=-1),
    "FARMER 1":     dict(voice="am_adam", speed=1.02, pitch=-0.5, formant="preserved", gain=0),
    "FARMER 2":     dict(voice="bm_daniel", speed=1.05, pitch=0.8, formant="shifted", gain=0),
    "MORGARATH":    dict(voice={"bm_lewis": 0.6, "bm_george": 0.4}, speed=0.82, pitch=-2.4, formant="preserved", gain=0),
}

# room acoustics per set: (reverb time s, wet mix, pre-delay ms, damping lowpass Hz)
ROOMS = {
    "outdoor":    (0.35, 0.06, 8, 5000),
    "small_room": (0.45, 0.12, 6, 6000),
    "stone_hall": (1.3, 0.16, 15, 5000),
    "great_hall": (2.1, 0.2, 25, 4500),
    "cavern":     (3.2, 0.3, 40, 3500),
}

# directions in (parentheses) that change delivery
def delivery(direction):
    d = (direction or "").lower()
    g, sp, hp = 0.0, 0.0, 0
    if "whisper" in d: g, sp, hp = -9, 0.04, 220
    if "quiet" in d or "barely audible" in d or "small" in d: g = min(g, -4)
    if any(w in d for w in ("bellow", "boom", "shout", "blurt")): g, sp = 2.5, 0.03
    if "asleep" in d: g, sp, hp = -10, -0.1, 300
    if "sharp" in d or "firm" in d: g = 1
    return g, sp, hp


# ---------------------------------------------------------------- parse
LINE_RE = re.compile(r"^\*\*([A-Z0-9 ']+)\*\*(?:\s*\*\(([^)]*)\)\*)?\s*:\s*(.+)$")
CUE_RE = re.compile(r"^\[(SFX|AMB|MUSIC|BEAT)\s*:?\s*([^\]]*)\]$")

def parse(path):
    ev, scene = [], None
    for raw in open(path, encoding="utf-8"):
        s = raw.strip()
        if s.startswith("## "):
            m = re.match(r"## (?:SCENE (\d+): )?(.+)", s)
            scene = dict(type="scene", n=int(m.group(1)) if m.group(1) else 99, title=m.group(2), set="end_tag", room="outdoor")
            ev.append(scene)
            continue
        if scene is None or not s or s == "---" or s.startswith("#"):
            continue
        if s.startswith("@set"):
            setname, room = [p.strip() for p in s[4:].split("|")]
            scene.update(set=setname, room=room)
            continue
        m = CUE_RE.match(s)
        if m:
            kind, val = m.group(1), m.group(2).strip()
            ev.append(dict(type=kind.lower(), name=val) if kind != "BEAT" else dict(type="beat", sec=float(val or 1)))
            continue
        m = LINE_RE.match(s)
        if m:
            ev.append(dict(type="line", char=m.group(1).strip(), dir=m.group(2), text=m.group(3).strip()))
            continue
        # title-card text holds the screen longer
        if s.startswith("**") and s.endswith("**"):
            ev.append(dict(type="action", text=s.strip("*"), title=True, sec=3.5)); continue
        txt = re.sub(r"[*_]", "", s.lstrip("- "))
        ev.append(dict(type="action", text=txt, sec=float(np.clip(len(txt.split()) * 0.13, 1.0, 6.0))))
    return ev

def segments(text):
    """split a line on inline stage directions: 'Yes. *(beat)* No.' → [('Yes.',0.8),('No.',0)]"""
    parts = re.split(r"\*\(([^)]*)\)\*", text)
    out = []
    for i in range(0, len(parts), 2):
        words = parts[i].strip()
        pause = 0.0
        if i + 1 < len(parts):
            d = parts[i + 1].lower()
            pause = 0.8 if d.strip() == "beat" else 1.4
        if words:
            out.append([words, pause])
        elif out:
            out[-1][1] += pause
        elif pause:
            out.append(["", pause])
    return out

def tts_text(t):
    t = t.replace("—", ", ").replace("…", "...").replace("*", "").replace("’", "'")
    t = re.sub(r",\s*,", ",", t)
    return re.sub(r"\s+", " ", t).strip(" ,")


# ---------------------------------------------------------------- voices
_kokoro = None
def kokoro():
    global _kokoro
    if _kokoro is None:
        from kokoro_onnx import Kokoro
        _kokoro = Kokoro(f"{VOICE_DIR}/kokoro-v1.0.onnx", f"{VOICE_DIR}/voices-v1.0.bin")
    return _kokoro

def style(v):
    k = kokoro()
    if isinstance(v, str):
        return k.get_voice_style(v)
    return sum(k.get_voice_style(n) * w for n, w in v.items())

def ffmpeg_filter(x, sr_in, chain):
    with tempfile.TemporaryDirectory() as d:
        a, b = f"{d}/a.wav", f"{d}/b.wav"
        sf.write(a, x, sr_in)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", a, "-af", chain, "-ar", str(SR), "-ac", "1", b], check=True)
        y, _ = sf.read(b, dtype="float32")
    return y

def trim(x, thr=0.01, pad=0.04):
    idx = np.where(np.abs(x) > thr)[0]
    if not len(idx):
        return x
    p = int(pad * SR)
    return x[max(0, idx[0] - p): idx[-1] + p]

def voice_clip(char, text, direction):
    cfg = CAST[char]
    g, sp, hp = delivery(direction)
    key = hashlib.md5(json.dumps([char, cfg, text, direction]).encode()).hexdigest()[:16]
    path = f"{CACHE}/lines/{key}.wav"
    if os.path.exists(path):
        return sf.read(path, dtype="float32")[0]
    os.makedirs(os.path.dirname(path), exist_ok=True)
    raw, sr = kokoro().create(tts_text(text), voice=style(cfg["voice"]), speed=cfg["speed"] + sp, lang="en-gb")
    # Cleanup chain: pitch/formant, rumble cut, de-mud, presence, de-ess, gentle compression.
    p = 2 ** (cfg["pitch"] / 12)
    chain = ",".join(filter(None, [
        "aresample=48000",
        f"rubberband=pitch={p:.4f}:formant={cfg['formant']}:pitchq=quality" if cfg["pitch"] else None,
        f"highpass=f={max(75, hp)}",
        "equalizer=f=280:t=q:w=1.1:g=-2.5",
        "equalizer=f=3200:t=q:w=1.3:g=2.5",
        "equalizer=f=9000:t=h:w=1:g=-1.5",
        "deesser=i=0.5:m=0.5:f=0.5",
        "acompressor=threshold=0.08:ratio=2.8:attack=6:release=140:makeup=1",
    ]))
    y = trim(ffmpeg_filter(raw, sr, chain))
    # level match: every character sits at the same speech loudness, then delivery adjusts it
    active = y[np.abs(y) > 0.02]
    rms = np.sqrt(np.mean(active ** 2)) if len(active) else 0.1
    y = y / max(rms, 1e-4) * S.db(-20 + cfg["gain"] + g)
    y = np.clip(y, -0.98, 0.98).astype(np.float32)
    sf.write(path, y, SR)
    return y


# ---------------------------------------------------------------- reverb
def impulse(rt, predelay_ms, damp, seed):
    r = np.random.default_rng(seed)
    n = int(rt * SR)
    t = np.arange(n) / SR
    ir = np.zeros((n + int(predelay_ms * SR / 1000), 2))
    for ch in range(2):
        x = r.standard_normal(n) * np.exp(-6.9 * t / rt)
        x = S.lowpass(x, damp)
        ir[-n:, ch] = x
    return ir / np.sqrt((ir ** 2).sum(0, keepdims=True))

_irs = {}
def reverb(x, room):
    rt, wet, pre, damp = ROOMS[room]
    if room not in _irs:
        _irs[room] = impulse(rt, pre, damp, hash(room) % 1000)
    ir = _irs[room]
    mono = x if x.ndim == 1 else x.mean(1)
    tail = np.stack([signal.fftconvolve(mono, ir[:, c]) for c in range(2)], 1)
    dry = S.stereo(mono) if x.ndim == 1 else x
    out = np.zeros_like(tail)
    out[:len(dry)] += dry * (1 - wet * 0.5)
    out += tail * wet
    return out


# ---------------------------------------------------------------- music
# Until a cue has been composed, borrow the closest-feeling finished one.
FALLBACK = {
    "night": "thoughtful", "transition_title": "dawn", "nervous": "playful", "ceremony": "rivalry",
    "sad": "thoughtful", "tension_build": "mystery", "held_breath": "mystery", "theme_quiet": "dawn",
    "villain": "mystery", "end_theme": "dawn",
}

def music_cue(name, sec):
    path = f"{ROOT}/audio/music/{name}.wav"
    if not os.path.exists(path) and FALLBACK.get(name):
        print(f"  (music cue '{name}' not composed yet; using '{FALLBACK[name]}')")
        path = f"{ROOT}/audio/music/{FALLBACK[name]}.wav"
    if not os.path.exists(path):
        print(f"  (music cue '{name}' not generated yet; skipped)")
        return None
    x, sr = sf.read(path, dtype="float32")
    x = S.resample(x, sr)
    x = S.highpass(x, 40)
    n, xf = int(sec * SR), int(3 * SR)
    out = x.copy()
    while len(out) < n:   # loop with crossfade
        fade = np.linspace(0, 1, xf)
        seam = out[-xf:] * (1 - fade) + x[:xf] * fade
        out = np.concatenate([out[:-xf], seam, x[xf:]])
    return S.stereo(out[:n], 1)


# ---------------------------------------------------------------- build
def build(script, outdir):
    os.makedirs(outdir, exist_ok=True)
    ev = parse(script)
    lines = [e for e in ev if e["type"] == "line"]
    missing = sorted({e["char"] for e in lines} - set(CAST))
    if missing:
        sys.exit(f"No voice configured for: {missing}")

    # crowd voices for murmur beds (generic lines, many voices)
    bab_dir = f"{CACHE}/babble"
    if not os.path.exists(bab_dir) or len(os.listdir(bab_dir)) < 24:
        os.makedirs(bab_dir, exist_ok=True)
        talk = ["Have you seen the price of wool this year?", "Pass me that, would you?", "He said he'd be back by noon.",
                "Well I never heard such a thing.", "Mind the cart there!", "Fresh bread, still warm.", "And then she told him, no.",
                "Is the Baron coming down today?", "Lovely weather for it.", "I'll need two more of those.", "Ha! That's a good one.",
                "Where's the boy gone now?"]
        vs = ["am_adam", "am_michael", "bm_daniel", "bf_emma", "af_sarah", "bf_isabella", "am_eric", "af_nicole", "bm_lewis", "af_kore"]
        for i in range(24):
            a, sr = kokoro().create(talk[i % len(talk)], voice=vs[i % len(vs)], speed=1.05 + 0.1 * (i % 3), lang="en-gb")
            sf.write(f"{bab_dir}/{i:02d}.wav", a, sr)

    # ---- 1. lay out the timeline
    print(f"Voicing {len(lines)} lines…")
    t, gap = 0.0, 0.45
    scene, prev_char, prev_cut = None, None, False
    T = dict(scenes=[], lines=[], actions=[], sfx=[], music=[], amb=[])
    clips = []
    for i, e in enumerate(ev):
        k = e["type"]
        if k == "scene":
            if scene:
                scene["end"] = t
                t += 1.2  # breathing room for the visual transition
            scene = dict(n=e["n"], title=e["title"], set=e["set"], room=e["room"], start=t)
            T["scenes"].append(scene)
            prev_char = None
        elif k == "action":
            T["actions"].append(dict(scene=scene["n"], text=e["text"], title=e.get("title", False), start=t, end=t + e["sec"]))
            t += e["sec"]
            prev_char = None
        elif k == "beat":
            t += e["sec"]
        elif k == "sfx":
            T["sfx"].append(dict(name=e["name"], start=t, room=scene["room"]))
            if e["name"] in ("big_splash", "ladle_whack", "sting", "ivy_rip", "church_bell"):
                t += 0.6
        elif k == "amb":
            T["amb"].append(dict(name=e["name"], scene=scene["n"], start=scene["start"]))
        elif k == "music":
            T["music"].append(dict(cue=e["name"], start=t))
        elif k == "line":
            if prev_cut:
                t -= 0.25               # interrupted: jump in on the dash
            elif prev_char == e["char"]:
                t += 0.15
            elif prev_char:
                t += gap
            else:
                t += 0.25
            start = t
            parts = []
            for words, pause in segments(e["text"]):
                if words:
                    y = voice_clip(e["char"], words, e["dir"])
                    parts.append((t, y))
                    t += len(y) / SR
                t += pause
            mouth = []
            for at, y in parts:
                hop = SR // 30
                env = np.sqrt([np.mean(y[j:j + hop] ** 2) for j in range(0, len(y), hop)])
                mouth.append(dict(start=round(at, 3), env=[round(float(v), 3) for v in np.clip(env / 0.12, 0, 1)]))
            clips.append((e["char"], parts, scene["room"]))
            T["lines"].append(dict(scene=scene["n"], char=e["char"], dir=e["dir"], text=e["text"], start=round(start, 3), end=round(t, 3), mouth=mouth))
            prev_cut = e["text"].rstrip().endswith("—")
            prev_char = e["char"]
            if e["char"] == "NARRATOR":
                t += 0.35
    scene["end"] = t + 3.0
    total = scene["end"] + 1.0
    N = int(total * SR)
    print(f"Episode length: {total/60:.1f} min")

    # ---- 2. dialogue bus (with room reverb per scene; narrator stays dry and close)
    dia = np.zeros((N, 2), np.float32)
    for char, parts, room in clips:
        for at, y in parts:
            S.place(dia, S.stereo(y) if CAST[char].get("dry") else reverb(y, room), at)

    # ---- 3. ambience beds
    amb = np.zeros((N, 2), np.float32)
    for a in T["amb"]:
        sc = next(s for s in T["scenes"] if s["n"] == a["scene"])
        sec = sc["end"] - sc["start"] + 1.2
        bed = S.ambience(a["name"], sec, bab_dir)
        f = np.minimum(1, np.minimum(np.arange(len(bed)), np.arange(len(bed))[::-1]) / (1.0 * SR))[:, None]
        S.place(amb, bed * f, sc["start"] - 0.3, S.db(-12))

    # ---- 4. sound effects
    fx = np.zeros((N, 2), np.float32)
    for s in T["sfx"]:
        if s["name"] in ("soft_crowd_murmur", "soft_crowd_laugh"):
            x = S.babble(2.5, bab_dir, 0.9, seed=int(s["start"]), muffle=2500)
            x *= np.sin(np.linspace(0, np.pi, len(x)))[:, None]
        else:
            x = S.sfx(s["name"])
        wet = s["name"] not in ("sting", "final_hit")
        S.place(fx, reverb(x.mean(1), s["room"]) if wet else x, s["start"], S.db(-8))

    # ---- 5. music, ducked under dialogue
    mus = np.zeros((N, 2), np.float32)
    cues = T["music"]
    for i, c in enumerate(cues):
        end = cues[i + 1]["start"] if i + 1 < len(cues) else total
        c["end"] = end
        if c["cue"] == "stop":
            continue
        if c["cue"] == "final_hit":
            S.place(fx, S.sfx("final_hit"), c["start"], S.db(-4)); continue
        x = music_cue(c["cue"], end - c["start"] + 2.5)
        if x is None:
            continue
        fin = 0.3 if c["cue"] in ("transition_title", "villain", "sting") else 2.0
        f = np.minimum(1, np.arange(len(x)) / (fin * SR))
        f = np.minimum(f, np.clip((len(x) - np.arange(len(x))) / (2.5 * SR), 0, 1))
        S.place(mus, x * f[:, None], c["start"], S.db(-13))
    speech = S.lowpass(np.abs(dia).mean(1), 3)
    duck = 1 - 0.55 * np.clip(speech / 0.02, 0, 1)
    mus *= S.lowpass(duck, 2)[:, None]

    # ---- 6. master
    mix = dia + amb + fx + mus
    raw = f"{outdir}/mix_raw.wav"
    sf.write(raw, mix, SR, subtype="FLOAT")
    final = f"{outdir}/episode_audio.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af",
                    "acompressor=threshold=0.25:ratio=2:attack=20:release=250,loudnorm=I=-14:TP=-1.5:LRA=11,alimiter=limit=0.89",
                    "-ar", str(SR), final], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", final, "-b:a", "256k", f"{outdir}/episode_audio.mp3"], check=True)
    os.remove(raw)
    T["duration"] = total
    json.dump(T, open(f"{outdir}/timeline.json", "w"), indent=1)
    print(f"wrote {final}, {outdir}/episode_audio.mp3 and timeline.json")


if __name__ == "__main__":
    build(sys.argv[1] if len(sys.argv) > 1 else f"{ROOT}/story/ep01-the-choosing.md",
          sys.argv[2] if len(sys.argv) > 2 else f"{ROOT}/out/ep01")
