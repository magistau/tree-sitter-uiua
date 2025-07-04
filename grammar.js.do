#!/usr/bin/env uiua run --no-format
RedoIfchange ← ⍤⤙≍0&runi⊂{"redo-ifchange"}
°json&fras⊸(RedoIfchange□₁) "tsconfig.json"
°□get"files"
⍤"./grammar.ts must be in tsconfig.json" ⊸˜∊□"./grammar.ts"
RedoIfchange
&runc {"bun" "build" "./grammar.ts" "--no-bundle" $"--outfile=_"⊡₃&args}
⊙(∩&ep⊓($"stdout:\n_"|$"stderr:\n_"))
⍤⤙≍0
