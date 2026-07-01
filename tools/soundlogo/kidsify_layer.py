#!/usr/bin/env python3
"""1声の音源 → 「子供N人がタイトに一斉に言ってる」音ロゴに仕上げる後処理。

エンジン非依存：GPT-SoVITS / CosyVoice / 録音 など、どの「1声」WAV/MP3でも入力可。
- N人ぶんに複製し、各々わずかにピッチ＆タイミングをずらして重ねる（rubberbandでピッチのみ変更＝速度保持）
- ズレは小さめ（既定0〜10ms）＝バラけず一斉
- 薄いリバーブで群衆の広がり、前に溜めの無音、全体を指定秒に整える、ラウドネス統一

使い方:
  python3 kidsify_layer.py 入力.wav 出力.mp3 --voices 10 --dur 3.0 --lead 0.4
"""
import argparse, subprocess, sys, os

# N人ぶんの (ピッチ半音差, ディレイms)。小さめに散らして「揃ってるけど厚い」を作る。
def make_spread(n):
    # ピッチは±半音以内で均等、ディレイは0〜10msで散らす（ズレすぎない）
    spread = []
    for i in range(n):
        semis = (i - (n - 1) / 2) / max(n - 1, 1) * 1.4   # ±0.7半音
        delay = int((i * 37) % 11)                          # 0〜10ms 疑似ばらけ
        spread.append((round(semis, 3), delay))
    return spread

def build(src, out, voices, dur, lead, reverb):
    spread = make_spread(voices)
    inputs, filt, labels = [], [], []
    for i, (semis, delay) in enumerate(spread):
        inputs += ["-i", src]
        # rubberband: ピッチのみ変更（pitch=2^(semis/12)）。速度は保持。
        ratio = 2 ** (semis / 12.0)
        filt.append(
            f"[{i}:a]rubberband=pitch={ratio:.5f}:pitchq=quality,"
            f"adelay={delay}|{delay}[a{i}]"
        )
        labels.append(f"[a{i}]")
    fc = ";".join(filt)
    fc += f";{''.join(labels)}amix=inputs={voices}:normalize=0[mix]"
    post = "[mix]"
    if reverb:
        post += "aecho=0.8:0.85:18:0.12,"
    # 前に溜めの無音 → 全体をdur秒に → ラウドネス統一
    lead_ms = int(lead * 1000)
    fc += f";{post}adelay={lead_ms}|{lead_ms},apad=whole_dur={dur},atrim=0:{dur},loudnorm=I=-14:TP=-1.5[final]"

    tmp_wav = out + ".tmp.wav"
    subprocess.run(["ffmpeg", "-y", *inputs, "-filter_complex", fc,
                    "-map", "[final]", tmp_wav, "-loglevel", "error"], check=True)
    if out.lower().endswith(".mp3"):
        subprocess.run(["ffmpeg", "-y", "-i", tmp_wav, "-codec:a", "libmp3lame",
                        "-q:a", "2", out, "-loglevel", "error"], check=True)
        os.remove(tmp_wav)
    else:
        os.replace(tmp_wav, out)
    print(f"  -> {out}  ({voices}声 / {dur}s / lead {lead}s)")

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("src"); ap.add_argument("out")
    ap.add_argument("--voices", type=int, default=10)
    ap.add_argument("--dur", type=float, default=3.0)
    ap.add_argument("--lead", type=float, default=0.4)
    ap.add_argument("--no-reverb", action="store_true")
    a = ap.parse_args()
    if not os.path.exists(a.src):
        sys.exit(f"input not found: {a.src}")
    build(a.src, a.out, a.voices, a.dur, a.lead, reverb=not a.no_reverb)
