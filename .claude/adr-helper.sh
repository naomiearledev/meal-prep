#!/usr/bin/env bash
# ADR helper for the .claude/ ADR system. See ADR-SYSTEM-GUIDE.md.
#
#   adr-helper.sh new <type>/<name> ["description"] ["tag,tag,tag"]
#   adr-helper.sh list [active|merged|all]
#   adr-helper.sh complete <type>/<name>
#   adr-helper.sh archive <type>/<name>
#
# <type> is one of feat, chore, docs, fix. <name> is the branch name after the slash.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INDEX="$ROOT/adr-index.toml"
TEMPLATE="$ROOT/templates/adr-template.md"
TYPES="feat chore docs fix"
TODAY="$(date +%Y-%m-%d)"
AUTHOR="${ADR_AUTHOR:-Claude}"

die() { echo "error: $*" >&2; exit 1; }

usage() {
  sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

split_branch() {
  # Sets TYPE and NAME from "<type>/<name>". Dies on a bad type or empty name.
  local branch="$1"
  TYPE="${branch%%/*}"
  NAME="${branch#*/}"
  [[ "$branch" == */* ]] || die "branch must look like <type>/<name>, got '$branch'"
  [[ -n "$NAME" && "$NAME" != */* ]] || die "branch name must be a single segment, got '$NAME'"
  case " $TYPES " in
    *" $TYPE "*) ;;
    *) die "type must be one of: $TYPES (got '$TYPE')" ;;
  esac
}

tags_to_toml() {
  # "a,b, c" -> ["a", "b", "c"]
  local raw="$1" out="" tag
  local parts=()
  IFS=',' read -ra parts <<<"$raw" || true
  for tag in ${parts[@]+"${parts[@]}"}; do
    tag="$(echo "$tag" | xargs)"
    [[ -z "$tag" ]] && continue
    out+="${out:+, }\"$tag\""
  done
  echo "[$out]"
}

# Append a line immediately after a "[section]" header in the index.
index_append() {
  local section="$1" line="$2" tmp
  grep -qxF "[$section]" "$INDEX" || die "section [$section] missing from $INDEX"
  tmp="$(mktemp)"
  awk -v section="[$section]" -v line="$line" '
    { print }
    $0 == section { print line }
  ' "$INDEX" >"$tmp"
  mv "$tmp" "$INDEX"
}

# Print the entry line for <name> inside [section], or nothing.
index_get() {
  local section="$1" name="$2"
  awk -v section="[$section]" -v key="\"$name\"" '
    /^\[/ { in_section = ($0 == section); next }
    in_section && index($0, key " = ") == 1 { print; exit }
  ' "$INDEX"
}

# Remove the entry line for <name> inside [section].
index_remove() {
  local section="$1" name="$2" tmp
  tmp="$(mktemp)"
  awk -v section="[$section]" -v key="\"$name\"" '
    /^\[/ { in_section = ($0 == section) }
    in_section && index($0, key " = ") == 1 { next }
    { print }
  ' "$INDEX" >"$tmp"
  mv "$tmp" "$INDEX"
}

cmd_new() {
  [[ $# -ge 1 ]] || usage 1
  split_branch "$1"
  local description="${2:-}" tags="${3:-}" file="$ROOT/branches/$TYPE/$NAME.md"
  [[ -e "$file" ]] && die "$file already exists"
  [[ -n "$(index_get "active.$TYPE" "$NAME")" ]] && die "$TYPE/$NAME is already in the index"

  local toml_tags
  toml_tags="$(tags_to_toml "$tags")"

  sed -e "s|{{BRANCH}}|$TYPE/$NAME|g" \
      -e "s|{{TYPE}}|$TYPE|g" \
      -e "s|{{DATE}}|$TODAY|g" \
      -e "s|{{AUTHOR}}|$AUTHOR|g" \
      -e "s|{{TAGS}}|$(echo "$tags" | tr ',' ' ' | xargs)|g" \
      "$TEMPLATE" >"$file"

  index_append "active.$TYPE" \
    "\"$NAME\" = { file = \"branches/$TYPE/$NAME.md\", created = \"$TODAY\", author = \"$AUTHOR\", tags = $toml_tags, description = \"$description\" }"

  echo "created $file"
  echo "indexed under [active.$TYPE]"
}

cmd_list() {
  local which="${1:-all}" section type
  for section in active merged; do
    [[ "$which" == "all" || "$which" == "$section" ]] || continue
    echo "== $section =="
    for type in $TYPES; do
      awk -v section="[$section.$type]" -v type="$type" '
        /^\[/ { in_section = ($0 == section); next }
        in_section && /^"/ {
          name = $0; sub(/^"/, "", name); sub(/".*/, "", name)
          desc = ""; if (match($0, /description = "[^"]*"/)) {
            desc = substr($0, RSTART + 15, RLENGTH - 16)
          }
          status = ""; if (match($0, /status = "[^"]*"/)) {
            status = " [" substr($0, RSTART + 10, RLENGTH - 11) "]"
          }
          printf "  %s/%s%s%s\n", type, name, status, (desc == "" ? "" : "  - " desc)
        }
      ' "$INDEX"
    done
  done
}

cmd_complete() {
  [[ $# -ge 1 ]] || usage 1
  split_branch "$1"
  local file="$ROOT/branches/$TYPE/$NAME.md"
  [[ -f "$file" ]] || die "$file not found"

  if grep -nE '^\[[A-Z][^]]*\]$' "$file" >/dev/null; then
    echo "unfilled template placeholders remain in $file:" >&2
    grep -nE '^\[[A-Z][^]]*\]$' "$file" >&2
    exit 1
  fi

  sed -i '' 's/^- \*\*Status\*\*: .*/- **Status**: Complete/' "$file"
  local entry
  entry="$(index_get "active.$TYPE" "$NAME")"
  [[ -n "$entry" ]] || die "$TYPE/$NAME not in [active.$TYPE]"
  if [[ "$entry" == *'status = '* ]]; then
    entry="$(echo "$entry" | sed 's/status = "[^"]*"/status = "complete"/')"
  else
    entry="${entry% \}}, status = \"complete\" }"
  fi
  index_remove "active.$TYPE" "$NAME"
  index_append "active.$TYPE" "$entry"
  echo "$TYPE/$NAME marked complete"
}

cmd_archive() {
  [[ $# -ge 1 ]] || usage 1
  split_branch "$1"
  local file="$ROOT/branches/$TYPE/$NAME.md" month dest entry
  [[ -f "$file" ]] || die "$file not found"
  grep -q '^- \*\*Status\*\*: Complete$' "$file" || die "run 'complete $TYPE/$NAME' first"

  month="$(date +%Y-%m)"
  dest="$ROOT/merged/$month/$TYPE-$NAME.md"
  mkdir -p "$ROOT/merged/$month"
  [[ -e "$dest" ]] && die "$dest already exists"

  entry="$(index_get "active.$TYPE" "$NAME")"
  [[ -n "$entry" ]] || die "$TYPE/$NAME not in [active.$TYPE]"

  mv "$file" "$dest"
  sed -i '' 's/^- \*\*Status\*\*: .*/- **Status**: Merged/' "$dest"

  entry="$(echo "$entry" \
    | sed -e "s|file = \"[^\"]*\"|file = \"merged/$month/$TYPE-$NAME.md\"|" \
          -e 's/status = "[^"]*"/status = "merged"/')"
  entry="${entry% \}}, merged = \"$TODAY\" }"
  index_remove "active.$TYPE" "$NAME"
  index_append "merged.$TYPE" "$entry"

  echo "archived to $dest"
  echo "moved to [merged.$TYPE]"
}

case "${1:-}" in
  new)      shift; cmd_new "$@" ;;
  list)     shift; cmd_list "$@" ;;
  complete) shift; cmd_complete "$@" ;;
  archive)  shift; cmd_archive "$@" ;;
  -h|--help|help|"") usage 0 ;;
  *) die "unknown command '$1'" ;;
esac
