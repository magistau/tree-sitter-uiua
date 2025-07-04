# shellcheck shell=sh
orig="$PWD"
tmp="$(mktemp -d)"
(cd "$tmp" || exit 1; cp "$orig/tree-sitter.json" .; tree-sitter init)
mv "$tmp/package.json" "$3"
rm -rf "$tmp"

