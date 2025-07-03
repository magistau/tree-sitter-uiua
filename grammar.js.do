exec >&2
redo-ifchange ./grammar.ts ./prims.json
bun build "./grammar.ts" --outfile="$3" --no-bundle
