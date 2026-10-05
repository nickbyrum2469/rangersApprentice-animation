"""Sound design + score for a stick fight, built from the renderer's cue list (real-time seconds).
   python3 stick/sound.py round1  ->  out/stick/round1.wav, then muxed into out/stick/round1.mp4
"""
import json, sys, subprocess, glob, random
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, resample_poly

SR = 48000
name = sys.argv[1] if len(sys.argv) > 1 else 'round1'
data = json.load(open(f'out/stick/{name}_sound.json'))
DUR = data['duration'] + 0.5
N = int(DUR * SR)
fx = np.zeros((N, 2)); mus = np.zeros((N, 2)); amb = np.zeros((N, 2))
rng = np.random.default_rng(7)
random.seed(7)

def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], 'bandpass', fs=SR, output='sos'), x)
def lp(x, f, order=2): return sosfilt(butter(order, f, 'lowpass', fs=SR, output='sos'), x)
def hp(x, f, order=2): return sosfilt(butter(order, f, 'highpass', fs=SR, output='sos'), x)
def env(n, a, d, shape=3.0):
    t = np.arange(n) / SR; e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) * shape / max(d, 1e-4)); return e
def noise(sec): return rng.standard_normal(int(sec * SR))

def put(buf, t, mono, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= len(buf) or i + len(mono) <= 0: return
    if i < 0: mono = mono[-i:]; i = 0
    mono = mono[:len(buf) - i] * gain
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i:i + len(mono), 0] += mono * l * 1.41; buf[i:i + len(mono), 1] += mono * r * 1.41

_cache = {}
def kenney(pattern):
    files = sorted(glob.glob(f'audio/sfx_lib/*/Audio/{pattern}*.ogg'))
    f = random.choice(files)
    if f not in _cache:
        x, sr = sf.read(f)
        if x.ndim > 1: x = x.mean(1)
        if sr != SR: x = resample_poly(x, SR, sr)
        _cache[f] = x / (np.abs(x).max() + 1e-9)
    return _cache[f]

def pitch(x, factor):  # crude resample pitch shift
    return resample_poly(x, 100, int(100 * factor))

# ---------- sound recipes ----------
def whoosh(p):
    n = noise(0.16 + 0.2 * p); L = len(n)
    lo, mid, hi = bp(n, 150, 600), bp(n, 600, 2200), bp(n, 2200, 7000)
    t = np.linspace(0, 1, L)
    s = hi * np.exp(-((t - 0.3) / 0.18) ** 2) + mid * np.exp(-((t - 0.45) / 0.2) ** 2) * 1.3 + lo * np.exp(-((t - 0.6) / 0.25) ** 2) * 1.6
    return s / (np.abs(s).max() + 1e-9) * (0.35 + 0.4 * p)
def thump(f0=60, f1=38, dur=0.3, amp=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t * 18); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * env(n, 0.002, dur, 4) * amp
def crack(dur=0.03, f=2500, amp=1.0):
    return hp(noise(dur), f) * env(int(dur * SR), 0.001, dur, 5) * amp
def hit(p):
    a = kenney('impactPunch_heavy') * (0.7 + 0.1 * p)
    s = np.zeros(int(0.9 * SR)); s[:len(a)] += a[:len(s)]
    th = thump(80, 42, 0.25 + 0.1 * p, 0.6 + 0.12 * p); s[:len(th)] += th
    c = crack(0.03, 1800, 0.5 + 0.1 * p); s[:len(c)] += c
    if p >= 4:   # heavy: boom tail + glassy ring
        b = lp(noise(0.8), 400) * env(int(0.8 * SR), 0.005, 0.7, 4) * 0.5; s[:len(b)] += b
    return s
def block(p):
    a = kenney('impactPunch_medium' if p < 2 else 'impactSoft_heavy') * (0.55 + 0.15 * p)
    s = np.zeros(int(0.5 * SR)); s[:len(a)] += a[:len(s)]
    th = thump(120, 70, 0.12, 0.35 * p); s[:len(th)] += th
    c = crack(0.02, 3000, 0.35); s[:len(c)] += c
    return s
def clash(p):
    s = np.zeros(int(2.6 * SR))
    th = thump(70, 28, 1.6, 1.3); s[:len(th)] += th
    b = lp(noise(2.2), 700) * env(int(2.2 * SR), 0.004, 1.8, 3.5) * 0.9; s[:len(b)] += b
    c = crack(0.06, 1200, 1.1); s[:len(c)] += c
    m = pitch(kenney('impactMetal_heavy'), 0.6) * 0.5; s[:len(m)] += m[:len(s)]
    t = np.arange(int(1.6 * SR)) / SR   # ringing "shing" afterward
    ring = (np.sin(2 * np.pi * 2350 * t) + 0.6 * np.sin(2 * np.pi * 3520 * t)) * np.exp(-t * 2.2) * 0.07
    s[:len(ring)] += ring
    return s
def swell(sec, amp=0.7):
    n = noise(sec); t = np.linspace(0, 1, len(n))
    s = bp(n, 300, 6000) * t ** 3
    return s / (np.abs(s).max() + 1e-9) * amp
def dustpuff(p):
    a = kenney('impactSoft_medium') * 0.4 * p
    s = lp(noise(0.5), 900) * env(int(0.5 * SR), 0.01, 0.45, 4) * 0.35 * p
    s[:len(a)] += a[:len(s)]
    return s
def slide(dur):
    n = bp(noise(dur + 0.2), 250, 2500); e = np.minimum(1, np.linspace(0, 1, len(n)) * 8) * np.linspace(1, 0, len(n)) ** 1.5
    return n * e * 0.5
def neckcrack():
    s = np.zeros(int(0.3 * SR))
    for k, o in enumerate([0, 0.07, 0.11]):
        c = crack(0.012, 1500, 0.5 + 0.2 * k); i = int(o * SR); s[i:i + len(c)] += c
    return s

for e in data['events']:
    T, ty, p = e['time'], e['type'], e.get('power', 1)
    pan = float(np.clip(e.get('x', 0) / 600, -0.8, 0.8))
    if ty == 'whoosh': put(fx, T - 0.04, whoosh(p), 0.75, pan)
    elif ty == 'hit': put(fx, T, hit(p), 0.95, pan)
    elif ty == 'block': put(fx, T, block(p), 0.8, pan)
    elif ty == 'clash':
        put(fx, T - 0.55, swell(0.55, 0.6), 1.0, pan); put(fx, T, clash(p), 1.0, pan)
    elif ty in ('dust', 'land'): put(fx, T, dustpuff(p), 0.9, pan)
    elif ty == 'slide': put(fx, T, slide(e.get('dur', 0.4)), 0.8, pan)
    elif ty == 'step': put(fx, T, kenney('footstep_concrete'), 0.45, pan)
    elif ty == 'cloth': put(fx, T, kenney('cloth'), 0.5, 0)
    elif ty == 'crack': put(fx, T, neckcrack(), 0.8, 0.3)

# ---------- ambience: rooftop wind + city ----------
w = lp(noise(DUR), 500, 1) * 0.5 + bp(noise(DUR), 800, 2500) * 0.08
tt = np.arange(len(w)) / SR
w *= 0.6 + 0.4 * np.sin(tt * 0.7) * np.sin(tt * 0.23 + 1)
city = lp(noise(DUR), 120) * 0.25
amb[:, 0] = (w + city)[:N] * 0.5; amb[:, 1] = (np.roll(w, 2400) + city)[:N] * 0.5

# ---------- score ----------
cues = {e['cue']: e['time'] for e in data['events'] if e['type'] == 'music'}
riser_times = sorted(e['time'] for e in data['events'] if e.get('cue') == 'riser')
BPM = 160; beat = 60 / BPM
def kick(): return thump(110, 45, 0.35, 0.9)
def snare(): s = bp(noise(0.22), 900, 6000) * env(int(0.22 * SR), 0.001, 0.18, 4) * 0.5; s[:int(0.08 * SR)] += thump(220, 160, 0.08, 0.4); return s
def hat(o=False): return hp(noise(0.25 if o else 0.05), 7000) * env(int((0.25 if o else 0.05) * SR), 0.001, 0.2 if o else 0.04, 4) * 0.22
def taiko(): return thump(140, 60, 0.6, 1.0) + lp(noise(0.6), 300) * env(int(0.6 * SR), 0.002, 0.4, 5) * 0.4
def saw(f, sec, amp):
    t = np.arange(int(sec * SR)) / SR
    x = sum(((t * f * d) % 1 - 0.5) for d in (1, 1.006, 0.994))
    return lp(x, 1200) * env(len(t), 0.005, sec, 2.5) * amp
def drone(f, sec, amp):
    t = np.arange(int(sec * SR)) / SR
    x = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.003 * t) + 0.3 * np.sin(2 * np.pi * f * 1.498 * t)
    fade = np.minimum(1, np.minimum(t / 0.8, (sec - t) / 0.4))
    return x * fade * amp

# standoff: drone + heartbeat
s0, s1 = cues['standoff'], cues['riser'] if 'riser' in cues else 4
put(mus, s0, drone(41.2, riser_times[0] - s0 + 0.3, 0.16))
for T in np.arange(s0 + 1.2, riser_times[0], 0.86):
    put(mus, T, thump(70, 40, 0.25, 0.45)); put(mus, T + 0.18, thump(65, 40, 0.2, 0.3))
for T in riser_times: put(mus, T, swell(0.5, 0.45) if T < cues['fight'] else swell(cues['cut'] - T, 0.5))
# fight section
f0, f1 = cues['fight'], cues['slowmo']
bass_notes = [41.2, 41.2, 49.0, 41.2, 55.0, 41.2, 49.0, 36.7]
k = 0
T = f0
while T < f1 - 0.05:
    step = k % 16
    if step in (0, 6, 10): put(mus, T, kick())
    if step in (4, 12): put(mus, T, snare())
    if step % 2 == 0: put(mus, T, hat(step % 8 == 6))
    if step == 14 and (k // 16) % 2 == 1: put(mus, T, taiko(), 0.7); put(mus, T + beat / 4, taiko(), 0.6)
    if step % 4 == 0: put(mus, T, saw(bass_notes[(k // 4) % 8], beat * 0.9, 0.28))
    if step == 0: put(mus, T, saw(bass_notes[(k // 16) % 8] * 4, beat * 3.5, 0.06), 1, 0.3)
    k += 1; T += beat / 4
# slow motion: everything drops to a deep drone and a slow heartbeat
put(mus, f1, drone(30.9, cues['tension'] - f1 + 0.6, 0.22))
put(mus, f1, thump(60, 30, 1.0, 0.5))
# tension: drone + clock-like ticks
t0 = cues['tension']
put(mus, t0, drone(41.2, cues['cut'] - t0, 0.13))
for T in np.arange(t0 + 0.3, cues['cut'] - 0.2, beat * 2): put(mus, T, hat(), 0.7)
for T in np.arange(t0 + 0.5, cues['cut'] - 0.4, 0.75): put(mus, T, thump(70, 40, 0.25, 0.4))
# the cut to black: one huge taiko + boom, then the title sting
c = cues['cut']
put(mus, c, taiko(), 1.0); put(mus, c, clash(5), 0.6)
put(mus, c + 0.35, taiko(), 0.9); put(mus, c + 0.35, saw(41.2, 2.0, 0.3)); put(mus, c + 0.35, saw(82.4, 2.0, 0.15))
# ambience fades out at the cut
amb[int(c * SR):] *= np.linspace(1, 0, N - int(c * SR))[:, None] ** 4

mix = fx * 1.0 + mus * 0.75 + amb * 0.35
mix = np.tanh(mix / (np.abs(mix).max() + 1e-9) * 1.6) * 0.9
sf.write(f'out/stick/{name}.wav', mix, SR, subtype='PCM_16')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f'out/stick/{name}.video.mp4', '-i', f'out/stick/{name}.wav',
                '-c:v', 'copy', '-af', 'loudnorm=I=-14:TP=-1:LRA=11', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', f'out/stick/{name}.mp4'], check=True)
print(f'wrote out/stick/{name}.mp4')
