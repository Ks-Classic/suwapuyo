#!/usr/bin/env bash
# YourTIMEエンドカード(3秒)を 静止/動き × YourTIME音/すわわ音 の4種で書き出す。
# 出力: public/content/endcards/*.mp4 (1080x1920 / 30fps / h264 yuv420p / aac 48k stereo)
set -euo pipefail
CONTENT="$(cd "$(dirname "$0")/../../public/content" && pwd)"
IMG="$CONTENT/endcard_yourtime.png"
OUT="$CONTENT/endcards"
mkdir -p "$OUT"

AUD_YT="$CONTENT/soundlogo_yourtime_v2.mp3"
AUD_SW="$CONTENT/soundlogo_suwawa_v2_dazn.mp3"

render () {
  local name="$1" aud="$2" motion="$3"
  local vf
  if [ "$motion" = "motion" ]; then
    vf="[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,zoompan=z='min(1.0+0.045*on/90,1.045)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=90:fps=30:s=1080x1920,fade=t=in:st=0:d=0.3[v]"
  else
    vf="[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30,fade=t=in:st=0:d=0.3[v]"
  fi
  ffmpeg -y -loop 1 -i "$IMG" -i "$aud" -filter_complex "$vf" \
    -map "[v]" -map 1:a -t 3 -r 30 \
    -c:v libx264 -pix_fmt yuv420p -profile:v high -level 4.0 \
    -c:a aac -b:a 192k -ar 48000 -ac 2 \
    "$OUT/$name.mp4" -loglevel error
  echo "  -> endcards/$name.mp4"
}

render "endcard_static_yourtime" "$AUD_YT" static
render "endcard_motion_yourtime" "$AUD_YT" motion
render "endcard_static_suwawa"   "$AUD_SW" static
render "endcard_motion_suwawa"   "$AUD_SW" motion
echo "done. 4 endcards in $OUT"
