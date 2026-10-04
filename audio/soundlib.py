"""Sound library: procedurally synthesized ambience + CC0 Kenney recordings.

Everything returns float32 stereo arrays shaped (n, 2) at SR. Generators are seeded so
the same episode always produces the same mix.
"""
import glob, os
import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000
LIB = os.path.join(os.path.dirname(__file__), "sfx_lib")
rng = np.random.default_rng(11)


# ---------------- helpers ----------------
def stereo(x, width=0.0):
    if x.ndim == 2:
        return x
    if width <= 0:
        return np.stack([x, x], 1)
    d = int(SR * 0.012 * width)  # tiny Haas delay for width
    return np.stack([x, np.concatenate([np.zeros(d), x[:-d or None]])], 1)

def db(g):
    return 10 ** (g / 20)

def norm(x, peak=0.9):
    m = np.abs(x).max()
    return x if m < 1e-9 else x / m * peak

def bandpass(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], "bandpass", fs=SR, output="sos")
    return signal.sosfilt(sos, x, axis=0)

def lowpass(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, "lowpass", fs=SR, output="sos"), x, axis=0)

def highpass(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, "highpass", fs=SR, output="sos"), x, axis=0)

def env_ad(n, a, d):
    """attack/decay envelope in seconds"""
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / max(d, 1e-4))

def pink(n, r=rng):
    w = r.standard_normal(n)
    b, a = [0.049922035, -0.095993537, 0.050612699, -0.004408786], [1, -2.494956002, 2.017265875, -0.522189400]
    return norm(signal.lfilter(b, a, w), 0.5)

def resample(x, sr_from):
    if sr_from == SR:
        return x
    from math import gcd
    g = gcd(SR, sr_from)
    return signal.resample_poly(x, SR // g, sr_from // g, axis=0)

def pitch(x, semitones):
    """crude varispeed pitch shift (changes length too, fine for one-shots)"""
    if semitones == 0:
        return x
    f = 2 ** (semitones / 12)
    n = int(len(x) / f)
    return signal.resample(x, n, axis=0)

def layer(*xs):
    """sum clips of different lengths"""
    n = max(len(x) for x in xs)
    out = np.zeros((n,) + xs[0].shape[1:])
    for x in xs:
        out[:len(x)] += x
    return out

def place(dst, src, at, gain=1.0):
    i = int(at * SR)
    if i >= len(dst) or i + len(src) <= 0:
        return
    s0 = max(0, -i); i = max(0, i)
    n = min(len(src) - s0, len(dst) - i)
    dst[i:i + n] += src[s0:s0 + n] * gain


# ---------------- Kenney CC0 samples ----------------
_cache = {}
def kenney(name, i=None):
    files = sorted(glob.glob(f"{LIB}/**/{name}*.ogg", recursive=True))
    if not files:
        raise FileNotFoundError(name)
    f = files[(i if i is not None else rng.integers(len(files))) % len(files)]
    if f not in _cache:
        x, sr = sf.read(f, dtype="float32")
        if x.ndim == 2:
            x = x.mean(1)
        _cache[f] = resample(x, sr)
    return _cache[f].copy()


# ---------------- ambience beds (length in seconds) ----------------
def wind(sec, strength=1.0, gusty=0.5, seed=1):
    r = np.random.default_rng(seed); n = int(sec * SR)
    out = np.zeros((n, 2))
    for ch in range(2):
        x = pink(n, r)
        # slowly moving bandpass = howl
        lfo = 0.5 + 0.5 * np.sin(np.cumsum(np.full(n, 2 * np.pi * 0.07 / SR)) + ch + r.random() * 6)
        gust = 1 + gusty * np.interp(np.arange(n), np.linspace(0, n, 12), r.random(12))
        y = lowpass(x, 500 + 300 * strength) * (0.35 + 0.65 * lfo) * gust
        y += bandpass(x, 700, 1400) * 0.25 * lfo ** 3 * strength
        out[:, ch] = y
    return norm(out, 0.5) * strength

def birds(sec, density=0.6, seed=2):
    r = np.random.default_rng(seed); n = int(sec * SR); out = np.zeros((n, 2))
    t_ = 0.0
    while t_ < sec:
        t_ += r.exponential(1 / (density * 2.5))
        # a call = 2-6 chirps with a frequency sweep
        f0 = r.uniform(2500, 5500); notes = r.integers(2, 7); pan = r.uniform(0.15, 0.85)
        for k in range(notes):
            d = r.uniform(0.04, 0.12); m = int(d * SR); tt = np.arange(m) / SR
            sweep = f0 * (1 + r.uniform(-0.25, 0.35) * tt / d)
            ch = np.sin(2 * np.pi * np.cumsum(sweep) / SR + 2 * np.sin(2 * np.pi * 35 * tt)) * np.sin(np.pi * tt / d) ** 2
            g = r.uniform(0.04, 0.18)
            at = t_ + k * (d + r.uniform(0.02, 0.07))
            place(out, np.stack([ch * (1 - pan), ch * pan], 1), at, g)
    return out

def crickets(sec, seed=3):
    r = np.random.default_rng(seed); n = int(sec * SR); t = np.arange(n) / SR; out = np.zeros((n, 2))
    for k in range(5):
        f = r.uniform(3900, 4700); rate = r.uniform(14, 22); pan = r.uniform(0.1, 0.9)
        chirp_on = (np.sin(2 * np.pi * rate * t + r.random() * 6) > 0.3).astype(float)
        phrase = (np.sin(2 * np.pi * r.uniform(0.25, 0.6) * t + r.random() * 6) > -0.2).astype(float)
        e = lowpass(chirp_on * phrase, 200)
        x = np.sin(2 * np.pi * f * t) * e * r.uniform(0.03, 0.07)
        out += np.stack([x * (1 - pan), x * pan], 1)
    return out

def room_tone(sec, level=0.02, seed=4):
    r = np.random.default_rng(seed); n = int(sec * SR)
    return stereo(lowpass(pink(n, r), 300) * level, 1)

def crackle(sec, density=8, seed=5):
    """fire crackle"""
    r = np.random.default_rng(seed); n = int(sec * SR); out = np.zeros(n)
    for _ in range(int(sec * density)):
        m = int(r.uniform(0.002, 0.012) * SR)
        click = highpass(r.standard_normal(m), 1500) * env_ad(m, 0.0005, 0.003)
        place(out, click, r.uniform(0, sec), r.uniform(0.05, 0.3))
    return stereo(out + lowpass(pink(n, r), 200) * 0.05, 1)

def rain(sec, heavy=1.0, seed=6):
    r = np.random.default_rng(seed); n = int(sec * SR)
    base = np.stack([bandpass(r.standard_normal(n), 400, 9000) for _ in range(2)], 1) * 0.08 * heavy
    drops = np.zeros((n, 2))
    for _ in range(int(sec * 60 * heavy)):
        m = int(0.01 * SR); d = bandpass(r.standard_normal(m), 2000, 8000) * env_ad(m, 0.0005, 0.002)
        pan = r.random(); place(drops, np.stack([d * (1 - pan), d * pan], 1), r.uniform(0, sec), r.uniform(0.02, 0.1))
    return base + drops

def thunder(seed=7, dist=0.5):
    r = np.random.default_rng(seed); sec = 6; n = int(sec * SR)
    crack = highpass(r.standard_normal(int(0.4 * SR)), 300) * env_ad(int(0.4 * SR), 0.003, 0.12) * (1 - dist)
    rumble = lowpass(r.standard_normal(n), 120, 4) * env_ad(n, 0.15, 1.8)
    rumble *= 1 + 0.8 * lowpass(np.abs(r.standard_normal(n)), 3)
    x = np.zeros(n); place(x, crack, 0); x += norm(rumble, 0.9)
    return stereo(norm(x, 0.9), 1.5)

def babble(sec, voices_dir, level=1.0, seed=8, muffle=1800):
    """crowd murmur made of many overlapping, muffled TTS voices"""
    r = np.random.default_rng(seed); n = int(sec * SR); out = np.zeros((n, 2))
    clips = sorted(glob.glob(f"{voices_dir}/*.wav"))
    if not clips:
        return out
    t_ = -1.0
    while t_ < sec:
        x, sr = sf.read(clips[r.integers(len(clips))], dtype="float32")
        x = lowpass(resample(x, sr), muffle) * r.uniform(0.15, 0.4)
        pan = r.uniform(0.2, 0.8)
        place(out, np.stack([x * (1 - pan), x * pan], 1), t_)
        t_ += r.uniform(0.15, 0.5)
    return norm(out, 0.4) * level

def scatter(sec, name, rate, gain=(0.1, 0.3), semis=(0, 0), lp=None, seed=9):
    """sparse one-shots of a Kenney sample over a bed (pots, pages, footsteps)"""
    r = np.random.default_rng(seed); n = int(sec * SR); out = np.zeros((n, 2))
    t_ = r.exponential(1 / rate)
    while t_ < sec:
        x = pitch(kenney(name), r.uniform(*semis))
        if lp: x = lowpass(x, lp)
        pan = r.uniform(0.2, 0.8)
        place(out, np.stack([x * (1 - pan), x * pan], 1), t_, r.uniform(*gain))
        t_ += r.exponential(1 / rate)
    return out

def clock(sec):
    n = int(sec * SR); out = np.zeros(n); m = int(0.03 * SR)
    for k in range(int(sec)):
        tick = bandpass(rng.standard_normal(m), 1800 if k % 2 else 2300, 5000) * env_ad(m, 0.0005, 0.006)
        place(out, tick, k + 0.1, 0.25)
    return stereo(out, 0.5)

def owl():
    out = np.zeros(int(1.6 * SR))
    for at, f, d in [(0, 400, 0.35), (0.5, 380, 0.25), (0.8, 380, 0.6)]:
        m = int(d * SR); t = np.arange(m) / SR
        h = np.sin(2 * np.pi * f * t * (1 - 0.05 * t / d)) * np.sin(np.pi * t / d) ** 1.5
        place(out, lowpass(h + 0.1 * pink(m), 1200), at)
    return stereo(out * 0.25)


def ambience(name, sec, babble_dir):
    """Named ambience beds used in scripts: [AMB: name]"""
    b = lambda lvl, s=8, mf=1800: babble(sec, babble_dir, lvl, s, mf)
    beds = {
        "dawn_birds":      lambda: wind(sec, 0.3, 0.3) + birds(sec, 0.9),
        "kitchen":         lambda: room_tone(sec, 0.03) + crackle(sec, 10) * 0.6 + scatter(sec, "metalPot", 0.4, (0.06, 0.15)) + b(0.35, 3, 1400),
        "courtyard":       lambda: wind(sec, 0.25, 0.3) + birds(sec, 0.3) + b(0.15, 4, 900),
        "training_yard":   lambda: wind(sec, 0.3) + birds(sec, 0.2) + scatter(sec, "impactWood_light", 2.2, (0.04, 0.12), (-2, 2), 3500, 10) + b(0.2, 5, 1200),
        "library":         lambda: room_tone(sec, 0.025) + scatter(sec, "bookFlip", 0.12, (0.05, 0.1)) + birds(sec, 0.1) * 0.3,
        "market_evening":  lambda: wind(sec, 0.25) + b(0.55, 6, 2200) + scatter(sec, "handleCoins", 0.2, (0.05, 0.12)) + crickets(sec) * 0.2,
        "night_crickets":  lambda: crickets(sec) + wind(sec, 0.12, 0.2),
        "castle_busy":     lambda: room_tone(sec, 0.03) + b(0.3, 7, 1500) + scatter(sec, "footstep_concrete", 0.6, (0.04, 0.1), (-1, 1), 4000, 12),
        "hall_murmur":     lambda: room_tone(sec, 0.03) + b(0.25, 9, 1600),
        "wind_evening":    lambda: wind(sec, 0.55, 0.6) + birds(sec, 0.15) * 0.5,
        "night_wind":      lambda: wind(sec, 0.8, 0.8) + crickets(sec) * 0.4,
        "clock_tick":      lambda: room_tone(sec, 0.015) + clock(sec),
        "storm":           lambda: rain(sec, 1.0) + wind(sec, 0.9, 1.0),
    }
    x = beds[name]()
    if name == "storm":  # thunder rolls
        for at in np.arange(1.5, sec, 9):
            place(x, thunder(int(at), 0.3 + 0.4 * rng.random()), at + rng.uniform(0, 3), 0.8)
    if name == "night_wind":
        for at in np.arange(4, sec, 17):
            place(x, owl(), at, 0.8)
    return x.astype(np.float32)


# ---------------- one-shot effects: [SFX: name] ----------------
def splash():
    r = np.random.default_rng(12); n = int(1.6 * SR)
    body = bandpass(r.standard_normal(n), 300, 6000) * env_ad(n, 0.005, 0.35)
    drops = np.zeros(n)
    for _ in range(40):
        m = int(0.03 * SR); t = np.arange(m) / SR
        f = r.uniform(600, 1800)
        place(drops, np.sin(2 * np.pi * f * t * (1 + 3 * t)) * env_ad(m, 0.001, 0.01), r.uniform(0.15, 1.3), r.uniform(0.05, 0.2))
    thump = lowpass(r.standard_normal(n), 150) * env_ad(n, 0.002, 0.12)
    return stereo(norm(body + drops + thump * 2, 0.9), 1)

def rip():
    r = np.random.default_rng(13); n = int(0.7 * SR); out = np.zeros(n)
    for k in range(70):
        m = int(0.004 * SR)
        place(out, highpass(r.standard_normal(m), 800) * env_ad(m, 0.0003, 0.002), r.uniform(0, 0.5) ** 1.3, r.uniform(0.2, 1))
    out = out + bandpass(r.standard_normal(n), 1000, 5000) * env_ad(n, 0.02, 0.2) * 0.3
    return stereo(norm(out, 0.8), 1)

def boom(low=45, dur=3.5, bright=0.4):
    r = np.random.default_rng(14); n = int(dur * SR); t = np.arange(n) / SR
    sub = np.sin(2 * np.pi * low * t * (1 - 0.15 * t / dur)) * env_ad(n, 0.004, dur * 0.35)
    hit = lowpass(r.standard_normal(n), 2000) * env_ad(n, 0.002, 0.25) * bright
    # dissonant string-like cluster for a "sting"
    cl = sum(signal.sawtooth(2 * np.pi * f * t) for f in (220, 233.1, 329.6, 349.2)) * env_ad(n, 0.01, 0.9) * 0.08
    return stereo(norm(sub + hit + lowpass(cl, 3000), 0.95), 1.5)

def growl(dur=2.2, f=55, seed=15):
    r = np.random.default_rng(seed); n = int(dur * SR); t = np.arange(n) / SR
    am = 0.6 + 0.4 * np.sin(2 * np.pi * r.uniform(18, 28) * t)
    tone = signal.sawtooth(2 * np.pi * f * t * (1 + 0.1 * np.sin(2 * np.pi * 0.7 * t)))
    x = bandpass(tone + 0.6 * r.standard_normal(n), 60, 900) * am * np.sin(np.pi * t / dur) ** 0.7
    return stereo(norm(x, 0.8), 1)

def snort():
    r = np.random.default_rng(16); n = int(0.9 * SR)
    x = bandpass(r.standard_normal(n), 120, 1800) * env_ad(n, 0.03, 0.18)
    x += growl(0.9, 40, 17)[:, 0] * 0.5
    return stereo(norm(x, 0.8), 1)

def seq(name, times, gains=1.0, semis=0.0, lp=None, idx=None):
    """a short sequence of Kenney one-shots (footsteps, hooves, sword clacks)"""
    out = np.zeros((int((max(times) + 1.5) * SR), 2))
    for k, at in enumerate(times):
        x = pitch(kenney(name, None if idx is None else idx + k), semis if np.isscalar(semis) else semis[k % len(semis)])
        if lp: x = lowpass(x, lp)
        place(out, stereo(x), at, gains if np.isscalar(gains) else gains[k % len(gains)])
    return out

def sfx(name):
    fx = {
        "church_bell":      lambda: stereo(pitch(kenney("impactBell_heavy", 0), -7) * 0.9, 1),
        "window_creak":     lambda: stereo(kenney("creak", 0), 0.5),
        "ladle_whack":      lambda: stereo(layer(kenney("impactWood_heavy", 1), kenney("impactPlank_medium", 2) * 0.6), 0.5),
        "big_splash":       splash,
        "wooden_swords":    lambda: seq("impactWood_medium", [0, .35, .6, 1.1, 1.3, 1.9, 2.2], [.8, .6, .9, .7, .8, .6, .9], [0, 2, -1]),
        "stick_clack":      lambda: seq("impactWood_light", [0, 0.06], [1, 0.6]),
        "squelchy_footsteps": lambda: seq("footstep_snow", [0, .55, 1.1, 1.65, 2.2, 2.75], 0.8, [-3, -4], 3000),
        "hooves_slow":      lambda: seq("impactPlank_medium", np.concatenate([[k * 0.8, k * 0.8 + 0.18] for k in range(6)]), [0.5, 0.35], [-6, -8], 2500),
        "soft_crowd_murmur": lambda: np.zeros((SR, 2)),   # filled from babble by the mixer
        "soft_crowd_laugh": lambda: np.zeros((SR, 2)),
        "climbing_stone":   lambda: layer(seq("cloth", [0, .7, 1.5, 2.3, 3.1], 0.5), seq("footstep_concrete", [.3, 1.1, 1.9, 2.7, 3.5], 0.25, -3)),
        "ivy_rip":          rip,
        "shutter_creak":    lambda: stereo(kenney("creak", 2), 0.5),
        "sting":            lambda: boom(55, 3.0, 0.6),
        "wargal_growl":     lambda: growl(2.4),
        "beast_snort":      snort,
        "final_hit":        lambda: boom(38, 5.0, 0.8),
    }
    return fx[name]().astype(np.float32)
