#include <stdio.h>
#ifdef NOPRINT
	#define printf(...)
#endif
enum TokenType {
	MACRO_INVK_MARKER,
	MACRO_INVK_UNPACK_NEXT,
	MACRO_INVK_UNPACK_END,
	MACRO_INVK_PACK_END,
	MACRO_BUILTIN_MARKER1,
	MACRO_BUILTIN_MARKER2,
	BANGS,
	UNSUB_MARKER,
	ERROR_SENTINEL,
};

static void show_valid(const bool* valid) {
	if (valid[MACRO_INVK_MARKER]) { printf("%s\n", "MACRO_INVK_MARKER"); }
	if (valid[MACRO_INVK_UNPACK_NEXT]) { printf("%s\n", "MACRO_INVK_UNPACK_NEXT"); }
	if (valid[MACRO_INVK_UNPACK_END]) { printf("%s\n", "MACRO_INVK_UNPACK_END"); }
	if (valid[MACRO_INVK_PACK_END]) { printf("%s\n", "MACRO_INVK_PACK_END"); }
	if (valid[MACRO_BUILTIN_MARKER1]) { printf("%s\n", "MACRO_BUILTIN_MARKER1"); }
	if (valid[MACRO_BUILTIN_MARKER2]) { printf("%s\n", "MACRO_BUILTIN_MARKER2"); }
	if (valid[BANGS]) { printf("%s\n", "BANGS"); }
	if (valid[UNSUB_MARKER]) { printf("%s\n", "UNSUB_MARKER"); }
	if (valid[ERROR_SENTINEL]) { printf("%s\n", "ERROR_SENTINEL"); }
}
