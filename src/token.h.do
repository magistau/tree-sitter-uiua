#!/usr/bin/env uiua run --no-format
# ┌─╴Primitive
#   ~ {Name Glyphs}
#   TokenName ← ⊂"PRIM_"⍜⊏≡⋅@_⊚⊸=@\s⍜⊢(⍥⋅@_⊸=@&)⌵Name
#   HasGlyph  ← ≠₀⧻Glyphs
#   MinLen    ← ˜⊡3_4 ∊{"random" "parse" "self"} □Name
#   AllNames ← (
#     ⨬(Name|▽≥⊃(MinLen|⊸≡◇⧻◇⧅□Name))⊸HasGlyph
#   )
# └─╴
# Test           ← 1
# Redo           ← ⨬"mole""redo-ifchange" ¬Test
# Primitives     ← memo(⊃(°json&fras|°0&runi□₂Redo) "../primitives.json")
# Rename         ← ⍜⊏≡⋅@_⊚⊸=@\s⍜⊢(⍥⋅@_⊸=@&)⌵
# PrimitiveNames ← ≡◇Primitive⊙⍚(◴get⍜?▽◡≡⌟has{"glyph" "ascii"})°mapPrimitives
Tokens ← (
  {
    "MACRO_INVK_MARKER"
    "MACRO_INVK_UNPACK_NEXT"
    "MACRO_INVK_UNPACK_END"
    "MACRO_INVK_PACK_END"
    "MACRO_BUILTIN_MARKER1"
    "MACRO_BUILTIN_MARKER2"
    "BANGS"
    "UNSUB_MARKER"
    "ERROR_SENTINEL"
  }
  # ˜⊂⍚Primitive~TokenName PrimitiveNames
)
{$ #include <stdio.h>
 $ #ifdef NOPRINT
 $ 	#define printf(...)
 $ #endif
 $ enum TokenType {
 $ 
 /◇⊂⍚$"\t_,\n"Tokens
 $ };
 $ 
 $ static void show_valid(const bool* valid) {
 $ 
 /◇⊂⍚˙$"\tif (valid[_]) { printf(\"%s\\n\", \"_\"); }\n"Tokens
 $ }
}
&p/◇⊂
# ⍥(⍚Primitive~AllNames PrimitiveNames)Test
