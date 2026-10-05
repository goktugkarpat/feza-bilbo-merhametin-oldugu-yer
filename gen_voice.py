#!/usr/bin/env python3
"""Records every narrator line (AUD.LINES) with a natural Turkish female voice and writes sesler.js.

Needs:  python3 -m pip install edge-tts   (internet while recording)   and ffmpeg
Run:    python3 gen_voice.py            only new/changed lines are recorded; the rest come from .ses_onbellek/
        python3 gen_voice.py --hepsi    record everything again

Lines are read from index.html if it contains the /*SESLER*/{...}/*SESLER-SON*/ block, else from src/02_audio.js.
Output: sesler.js  →  window.VOICE_MP3 = {key: base64 mp3}  and  window.VOICE_DUR = {key: seconds}  (keys in LINES order).
"""
import asyncio
import base64
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '.voice-tools'))
import edge_tts

VOICE = "tr-TR-EmelNeural"
RATE = "-8%"
PITCH = "-2Hz"

# How words should *sound* (subtitles keep the normal spelling). Regex → spoken form.
# English-ish words get a Turkish spelling of their pronunciation (e.g. unicorn → yunikorn).
# Avoid short capitalised words the engine may read as abbreviations ("Aa" was read as "Anadolu Ajansı").
PRONOUNCE = [
    (r"(?i)\bunicorn", "yunikorn"),
    (r"\bHu hu\b", "Huu huu"),
    (r"\bDevam Et\b", "Devam et"),   # the button's name; a lone capitalised "Et" must not sound like an abbreviation
    (r"\bKral Jöle", "Kral, Jöle"),            # without the pause the engine glued it to "Kraljöle"
    (r"\bVeba Rahibi", "Veba, Rahibi"),        # was heard as "Vebar ahibi"
    (r"\bayin", "ayiin"),                      # was heard as "a in"
    (r"\btellal", "tel lal"),
    (r"\bTellal", "Tel lal"),
]

ROOT = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(ROOT, ".ses_onbellek")
OUT = os.path.join(ROOT, "sesler.js")
FFMPEG = "/opt/homebrew/bin/ffmpeg" if os.path.exists("/opt/homebrew/bin/ffmpeg") else shutil.which("ffmpeg")
FFPROBE = "/opt/homebrew/bin/ffprobe" if os.path.exists("/opt/homebrew/bin/ffprobe") else shutil.which("ffprobe")
if not FFMPEG:
    try:
        import imageio_ffmpeg
        FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        pass
# 1) shorten long pauses between sentences to ~0.48 s (edge-tts leaves ~1 s), 2) keep ~40 ms before the first sound
# and 3) ~120 ms after the last one (reverse trick trims the tail), 4) tiny fade-in against clicks.
TRIM = ("silenceremove=stop_periods=-1:stop_threshold=-40dB:stop_duration=0.1:stop_silence=0.38,"
        "silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.04:detection=peak,"
        "areverse,silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.12:detection=peak,areverse,"
        "afade=t=in:d=0.006")


def spoken(text):
    for pat, rep in PRONOUNCE:
        text = re.sub(pat, rep, text)
    return text


def remove_temp(path):
    for attempt in range(6):
        try:
            os.remove(path)
            return
        except FileNotFoundError:
            return
        except PermissionError:
            time.sleep(0.15 * (attempt + 1))
    print('  temporary file locked by Dropbox, cleanup deferred:', os.path.basename(path))


def load_lines():
    for rel in (os.path.join("src", "02_audio.js"), "index.html"):
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            continue
        m = re.search(r"/\*SESLER\*/(.*?)/\*SESLER-SON\*/", open(path, encoding="utf-8").read(), re.S)
        if m:
            print(f"lines from {rel}")
            return json.loads(m.group(1))
    sys.exit("LINES block (/*SESLER*/ ... /*SESLER-SON*/) not found in index.html or src/02_audio.js")


def cache_path(text):
    h = hashlib.md5(f"{VOICE}|{RATE}|{PITCH}|{spoken(text)}".encode("utf-8")).hexdigest()
    return os.path.join(CACHE, h + ".mp3")


def duration(path):
    if not FFPROBE:
        from mutagen.mp3 import MP3
        return MP3(path).info.length
    try:
        r = subprocess.run([FFPROBE, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                           capture_output=True, text=True, timeout=20)
        return float(r.stdout.strip())
    except Exception:
        return 0.0


def trim(raw, final):
    """Cut leading/trailing silence and re-encode as small mono mp3. Falls back to the raw file without ffmpeg."""
    if not FFMPEG:
        raise RuntimeError('ffmpeg is required: untrimmed narration is not accepted')
    tmp = final + ".tmp.mp3"
    r = subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", raw, "-af", TRIM,
                        "-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", "-b:a", "48k", tmp])
    if r.returncode == 0 and os.path.exists(tmp) and os.path.getsize(tmp) > 800:
        os.replace(tmp, final)
        remove_temp(raw)
    else:
        if os.path.exists(tmp):
            os.remove(tmp)
        raise RuntimeError('ffmpeg could not trim narrator recording')


async def record(key, text, sem):
    final = cache_path(text)
    raw = final + ".raw.mp3"
    async with sem:
        for attempt in range(6):
            try:
                await edge_tts.Communicate(spoken(text), VOICE, rate=RATE, pitch=PITCH).save(raw)
                if os.path.getsize(raw) < 1000:
                    raise RuntimeError("empty audio")
                trim(raw, final)
                return True
            except Exception as e:  # network hiccup / rate limit: back off and retry
                if os.path.exists(raw):
                    remove_temp(raw)
                if attempt == 5:
                    print(f"  FAILED {key}: {e}")
                    return False
                await asyncio.sleep(1.5 * (attempt + 1))


async def main():
    os.makedirs(CACHE, exist_ok=True)
    lines = load_lines()
    if "--hepsi" in sys.argv:
        for t in lines.values():
            if os.path.exists(cache_path(t)):
                os.remove(cache_path(t))
    todo = [(k, t) for k, t in lines.items() if not os.path.exists(cache_path(t))]
    print(f"{len(lines)} lines, {len(todo)} to record ({VOICE}, rate {RATE}, pitch {PITCH})")
    sem = asyncio.Semaphore(4)
    await asyncio.gather(*(record(k, t, sem) for k, t in todo))

    mp3, dur, missing = {}, {}, []
    for k, t in lines.items():
        p = cache_path(t)
        d = duration(p) if os.path.exists(p) else 0.0
        if d < 0.25:
            missing.append(k)
            continue
        mp3[k] = base64.b64encode(open(p, "rb").read()).decode("ascii")
        dur[k] = round(d, 3)
        cps = len(t) / max(0.2, d - 0.2)   # minus the kept head/tail padding
        flag = "   <-- check (unusual speed: maybe read as an abbreviation?)" if cps < 9.5 or cps > 21 else ""
        print(f"  {k:16s} {d:5.2f} s  {cps:4.1f} chr/s{flag}")

    with open(OUT, "w", encoding="utf-8", newline="\n") as f:   # LF also on Windows (the Mac commits it)
        f.write("// Feza ve Bilbo: Merhametin Öldüğü Yer – Emel (tr-TR-EmelNeural), trimmed mono mp3 as base64.\n"
                "// Bu dosya gen_voice.py ile üretildi; elle değiştirmeyin. Keys follow AUD.LINES order.\n")
        f.write("window.VOICE_MP3 = {\n")
        f.write(",\n".join(f" {json.dumps(k)}: \"{v}\"" for k, v in mp3.items()))
        f.write("\n};\n")
        f.write("window.VOICE_DUR = " + json.dumps(dur, ensure_ascii=False) + ";\n")
    keep = {os.path.basename(cache_path(t)) for t in lines.values()}
    for f in os.listdir(CACHE):  # drop recordings of lines that no longer exist and temp leftovers
        if f.endswith(".mp3") and f not in keep:
            remove_temp(os.path.join(CACHE, f))

    size = os.path.getsize(OUT) / 1024
    print(f"wrote sesler.js: {len(mp3)} lines, {sum(dur.values()):.1f} s audio, {size:.0f} KB")
    if missing:
        print("MISSING (subtitle only in the game):", ", ".join(missing))
        sys.exit(1)


asyncio.run(main())
