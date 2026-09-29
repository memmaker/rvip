#!/bin/sh
# Local mirror of ruzzoli.de/roguelikes for the browser tests: tests/www/<web name> -> <game>/web/dist
# (web name = the folder in the game's web/deploy.sh), plus the shared rvip-*.js, fonts and shrine.
cd "$(dirname "$0")" && rm -rf www && mkdir www && cd ~/Games || exit 1
for d in */web/deploy.sh; do
  g=${d%%/*}; n=$(grep -o 'roguelikes/[^/ ]*/' "$d" | tail -1 | cut -d/ -f2)
  [ -n "$n" ] && ln -s ~/Games/"$g"/web/dist ~/Games/rvip-tools/tests/www/"$n"
done
for f in rvip-wm.js rvip-app.js rvip-sound.js; do ln -s ~/Games/rvip-tools/web/$f ~/Games/rvip-tools/tests/www/$f; done
ln -s ~/Games/roguelikes-index/fonts ~/Games/rvip-tools/tests/www/fonts
ln -s ~/Games/roguelikes-index/shrine ~/Games/rvip-tools/tests/www/shrine
ls ~/Games/rvip-tools/tests/www | wc -l
