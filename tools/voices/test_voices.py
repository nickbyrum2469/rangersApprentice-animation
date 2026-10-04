import soundfile as sf, numpy as np
from kokoro_onnx import Kokoro
k = Kokoro("kokoro-v1.0.onnx", "voices-v1.0.bin")
print(sorted(k.get_voices()))
lines = [
 ("bm_fable", 0.95, "Fifteen years ago, a baron named Morgarath tried to take the Kingdom of Araluen by force."),
 ("bm_george", 0.85, "It took you longer than I thought it would."),
 ("am_puck", 1.1, "I... I wasn't... I was just..."),
 ("bm_george", 0.85, "Climbing five stories up the outside of the Baron's tower, in the middle of the night. To read a letter that isn't yours. Yes. I saw."),
 ("am_puck", 1.05, "Why were you waiting for me? How did you even know I'd come?"),
 ("bm_george", 0.8, "Because it's what I would have done."),
]
out = []
for v, sp, text in lines:
    a, sr = k.create(text, voice=v, speed=sp, lang="en-gb" if v.startswith("b") else "en-us")
    out += [a, np.zeros(int(sr * 0.6), dtype=a.dtype)]
sf.write("/home/user/rangersApprentice-animation/out/voice-test.wav", np.concatenate(out), sr)
print("ok", sr)
