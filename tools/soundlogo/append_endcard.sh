#!/usr/bin/env bash
# 入力動画の末尾に、4種のエンドカードからランダムで1つを連結する。
# 入力の解像度/fps/音声有無が違っても 1080x1920 / 30fps / aac48k stereo に正規化して連結。
# 使い方: append_endcard.sh <入力動画> [出力動画] [endcard名(任意で固定)]
#   例: append_endcard.sh short01.mp4
#       append_endcard.sh short01.mp4 out.mp4 endcard_motion_yourtime
set -euo pipefail

CONTENT="$(cd "$(dirname "$0")/../../public/content" && pwd)"
ECDIR="$CONTENT/endcards"
IN="${1:?入力動画を指定してください}"
OUT="${2:-}"
PICK="${3:-}"

[ -f "$IN" ] || { echo "入力が見つかりません: $IN" >&2; exit 1; }
if [ -z "$OUT" ]; then
  base="${IN%.*}"
  OUT="${base}_endcard.mp4"
fi

# エンドカード選択（指定なければランダム）
mapfile -t CARDS < <(ls "$ECDIR"/endcard_*.mp4 2>/dev/null)
[ "${#CARDS[@]}" -gt 0 ] || { echo "エンドカードがありません。先に render_endcards.sh を実行してください" >&2; exit 1; }
if [ -n "$PICK" ]; then
  EC="$ECDIR/$PICK.mp4"
  [ -f "$EC" ] || { echo "指定エンドカードが無い: $EC" >&2; exit 1; }
else
  EC="${CARDS[$((RANDOM % ${#CARDS[@]}))]}"
fi
echo "連結するエンドカード: $(basename "$EC")"

# 入力に音声があるか
has_audio=$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$IN" | head -1 || true)

VNORM="scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p"
ANORM="aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo"

if [ -n "$has_audio" ]; then
  ffmpeg -y -i "$IN" -i "$EC" -filter_complex "\
[0:v]$VNORM[v0];[1:v]$VNORM[v1];\
[0:a]$ANORM[a0];[1:a]$ANORM[a1];\
[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]" \
    -map "[v]" -map "[a]" -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -ac 2 \
    "$OUT" -loglevel error
else
  # 入力に音声が無ければ、入力尺ぶんの無音を足してから連結
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")
  ffmpeg -y -i "$IN" -f lavfi -t "$dur" -i anullsrc=r=48000:cl=stereo -i "$EC" -filter_complex "\
[0:v]$VNORM[v0];[2:v]$VNORM[v1];\
[1:a]$ANORM[a0];[2:a]$ANORM[a1];\
[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]" \
    -map "[v]" -map "[a]" -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -ac 2 \
    "$OUT" -loglevel error
fi

echo "完成 -> $OUT  ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")s)"
