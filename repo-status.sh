#!/bin/sh
# Check every git repo under ~/Games: dirty tree, stashes, ahead/behind upstream,
# extra local branches and branches on our remotes (memmaker/ruzzoli) besides the current one.
# Usage: repo-status.sh [-n]   (-n = skip git fetch)
# Output per repo: dirty, stash:N, push:N, pull:N, no-upstream(b),
#   merge:<branch>(N) = N commits not in HEAD, stale:<branch> = fully merged, delete it.
cd ~/Games || exit 1
[ "$1" = -n ] || fetch=1
for d in */.git; do
  r=${d%/.git}
  [ -n "$fetch" ] && git -C "$r" fetch -q --all --prune 2>/dev/null
  b=$(git -C "$r" symbolic-ref -q --short HEAD || echo DETACHED)
  msg=""
  [ -n "$(git -C "$r" status --porcelain)" ] && msg="$msg dirty"
  s=$(git -C "$r" stash list | wc -l | tr -d ' ')
  [ "$s" -gt 0 ] && msg="$msg stash:$s"
  if up=$(git -C "$r" rev-parse -q --abbrev-ref '@{u}' 2>/dev/null); then
    set -- $(git -C "$r" rev-list --left-right --count "HEAD...$up")
    [ "$1" -gt 0 ] && msg="$msg push:$1"
    [ "$2" -gt 0 ] && msg="$msg pull:$2"
  else
    msg="$msg no-upstream($b)"
  fi
  # our remotes only (memmaker / ruzzoli); upstream authors' branches are not ours to clean
  ours=$(git -C "$r" remote -v | awk '/memmaker|ruzzoli/ {print "refs/remotes/" $1}' | sort -u)
  for ref in $(git -C "$r" for-each-ref --format='%(refname)' refs/heads $ours); do
    rb=${ref#refs/heads/}; rb=${rb#refs/remotes/}
    case $rb in "$b"|"$up"|*/HEAD|*/"$b") continue;; esac
    n=$(git -C "$r" rev-list --count "HEAD..$rb")
    [ "$n" -gt 0 ] && msg="$msg merge:$rb($n)" || msg="$msg stale:$rb"
  done
  [ -n "$msg" ] && printf '%-22s %s\n' "$r" "$msg"
done; true
