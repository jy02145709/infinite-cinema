#!/bin/zsh
set -euo pipefail

mkdir -p work/cards outputs

for card in opening original what-if ending; do
  rsvg-convert -w 1280 -h 720 "assets/cards/${card}.svg" -o "work/cards/${card}.png"
done

ffmpeg -y \
  -loop 1 -t 2.2 -i work/cards/opening.png \
  -loop 1 -t 1.7 -i work/cards/original.png \
  -i outputs/shot-01.mp4 \
  -i outputs/shot-02a-original.mp4 \
  -loop 1 -t 2.8 -i work/cards/what-if.png \
  -i outputs/shot-01.mp4 \
  -i outputs/shot-02b-alternative.mp4 \
  -loop 1 -t 2.8 -i work/cards/ending.png \
  -filter_complex "\
    [0:v]fps=24,format=yuv420p[v0]; \
    [1:v]fps=24,format=yuv420p[v1]; \
    [2:v]fps=24,scale=1280:720,setsar=1[v2]; \
    [3:v]fps=24,scale=1280:720,setsar=1[v3]; \
    [4:v]fps=24,format=yuv420p[v4]; \
    [5:v]fps=24,scale=1280:720,setsar=1[v5]; \
    [6:v]fps=24,scale=1280:720,setsar=1[v6]; \
    [7:v]fps=24,format=yuv420p[v7]; \
    [v0][v1][v2][v3][v4][v5][v6][v7]concat=n=8:v=1:a=0,fade=t=in:st=0:d=0.35,fade=t=out:st=33.4:d=0.6[outv]" \
  -map "[outv]" -an -c:v libx264 -preset medium -crf 18 -movflags +faststart \
  outputs/infinite-cinema-comparison.mp4

ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height,r_frame_rate -of default=noprint_wrappers=1 outputs/infinite-cinema-comparison.mp4
