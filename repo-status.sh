#!/bin/sh
# Check every git repo under ~/Games: dirty tree, ahead/behind upstream, unmerged remote branches.
# Usage: repo-status.sh [-n]   (-n = skip git fetch)
cd ~/Games || exit 1
[ "$1" = -n ] || fetch=1
for d in */.git; do
  r=${d%/.git}
  [ -n "$fetch" ] && git -C "$r" fetch -q --prune 2>/dev/null
  b=$(git -C "$r" symbolic-ref -q --short HEAD || echo DETACHED)
  msg=""
  [ -n "$(git -C "$r" status --porcelain)" ] && msg="$msg dirty"
  if up=$(git -C "$r" rev-parse -q --abbrev-ref '@{u}' 2>/dev/null); then
    set -- $(git -C "$r" rev-list --left-right --count "HEAD...$up")
    [ "$1" -gt 0 ] && msg="$msg push:$1"
    [ "$2" -gt 0 ] && msg="$msg pull:$2"
  else
    msg="$msg no-upstream($b)"
  fi
  # origin branches with commits not in the current branch
  for rb in $(git -C "$r" branch -r --format='%(refname:short)' --list 'origin/*' | grep -v -e '/HEAD$' -e '^origin$'); do
    [ "$rb" = "$up" ] && continue
    n=$(git -C "$r" rev-list --count "HEAD..$rb")
    [ "$n" -gt 0 ] && msg="$msg merge:$rb($n)"
  done
  [ -n "$msg" ] && printf '%-22s %s\n' "$r" "$msg"
done; true
