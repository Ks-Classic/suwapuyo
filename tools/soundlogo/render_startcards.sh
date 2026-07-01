#!/usr/bin/env bash
# YourTIMEスタートカード(オープニング2秒)を 静止/動き の2種で書き出す。
# 各ショートの先頭に必ず付ける固定2秒フレーム。「ゆあーたいむ！」音声(声は0.18〜1.22s)入り。
# 出力: public/content/startcards/*.mp4 (1080x1920 / 30fps / h264 yuv420p / aac 48k stereo)
# エンドカード(render_endcards.sh)と同一規格なので連結時に再エンコ不要で揃う。
set -euo pipefail
CONTENT="$(cd "$(dirname "$0")/../../public/content" && pwd)"
IMG="$CONTENT/startcard_yourtime.png"
OUT="$CONTENT/startcards"
mkdir -p "$OUT"

AUD_YT="$CONTENT/soundlogo_yourtime_v2.mp3"
DUR=2          # オープニング尺(秒)

render () {
  local name="$1" motion="$2"
  local vf
  if [ "$motion" = "motion" ]; then
    # 2秒=60フレーム。ゆっくりズームイン + 頭フェードイン。
    vf="[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,zoompan=z='min(1.0+0.05*on/60,1.05)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=60:fps=30:s=1080x1920,fade=t=in:st=0:d=0.3[v]"
  else
    vf="[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30,fade=t=in:st=0:d=0.3[v]"
  fi
  # 音声は2sでカット(声は1.22sで終わるので欠けない)。末尾を軽くフェードアウト。
  ffmpeg -y -loop 1 -i "$IMG" -i "$AUD_YT" -filter_complex "$vf;[1:a]atrim=0:${DUR},afade=t=out:st=1.7:d=0.3[a]" \
    -map "[v]" -map "[a]" -t "$DUR" -r 30 \
    -c:v libx264 -pix_fmt yuv420p -profile:v high -level 4.0 \
    -c:a aac -b:a 192k -ar 48000 -ac 2 \
    "$OUT/$name.mp4" -loglevel error
  echo "  -> startcards/$name.mp4"
}

render "startcard_static_yourtime" static
render "startcard_motion_yourtime" motion
echo "done. 2 startcards in $OUT"
