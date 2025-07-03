exec >&2
redo-ifchange grammar.js
dprint check
tsc --noEmit
tree-sitter generate && tree-sitter test
