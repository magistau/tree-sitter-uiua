#include "tree_sitter/alloc.h"
#include "tree_sitter/array.h"
#include "tree_sitter/parser.h"
#include <stdio.h>
#include <string.h>

#define NOPRINT
#include "token.h"

#ifdef NOPRINT
	#define printf(...)
#endif
#define UNREACHABLE(reason) printf("%s:%d: Unreachable (%s)", __FILE__, __LINE__, (reason))

typedef uint8_t Arity;

typedef struct {
	Array(Arity) macro_args;
	Arity last_bangs;
} Scanner;

static bool is_subscript(uint32_t cp) {
	// clang-format off
	return (0x2080 <= cp && cp <= 0x2089)
		|| cp == 0x231E
		|| cp == 0x231F
		|| cp == 0x208B
		|| cp == '_'
		|| cp == ',';
	// clang-format on
}

static void show_scanner(Scanner* scanner) {
	printf(
		"Scanner {\n"
		"    last_bangs: %d,\n"
		"    macro_args: ",
		scanner->last_bangs
	);
	if (scanner->macro_args.size == 0) {
		printf("{},\n");
	} else {
		printf("{");
		for (uint32_t i = 0; i < scanner->macro_args.size - 1; ++i) {
			printf("%d, ", scanner->macro_args.contents[i]);
		}
		printf("%d},\n", scanner->macro_args.contents[scanner->macro_args.size - 1]);
	}
	printf("}\n");
}

void* tree_sitter_uiua_external_scanner_create() {
	Scanner* scanner = ts_calloc(1, sizeof(Scanner));
	return scanner;
}

void tree_sitter_uiua_external_scanner_destroy(Scanner* scanner) {
	array_delete(&scanner->macro_args);
	ts_free(scanner);
}

#define write(buffer, expr) \
	{ \
		memcpy(buffer, (char*)&(expr), sizeof(expr)); \
		buffer += sizeof(expr); \
	}

#define read(length, buffer, expr) \
	{ \
		memcpy((char*)&(expr), buffer, sizeof(expr)); \
		length -= sizeof(expr); \
		buffer += sizeof(expr); \
	}

unsigned tree_sitter_uiua_external_scanner_serialize(Scanner* scanner, char* buffer) {
	// clang-format off
	uint32_t res = sizeof(scanner->last_bangs)
		+ sizeof(scanner->macro_args.size)
		+ scanner->macro_args.size * array_elem_size(&scanner->macro_args);
	// clang-format on
	if (res > TREE_SITTER_SERIALIZATION_BUFFER_SIZE) {
		return 0;
	}
	write(buffer, scanner->last_bangs);
	write(buffer, scanner->macro_args.size);
	memcpy(
		buffer,
		(char*)scanner->macro_args.contents,
		scanner->macro_args.size * array_elem_size(&scanner->macro_args)
	);
	return res;
}

void tree_sitter_uiua_external_scanner_deserialize(
	Scanner* scanner,
	const char* buffer,
	unsigned length
) {
	array_delete(&scanner->macro_args);
	if (length < sizeof(scanner->last_bangs) + sizeof(scanner->macro_args.size)) {
		return;
	}
	read(length, buffer, scanner->last_bangs);
	read(length, buffer, scanner->macro_args.size);
	if (length < scanner->macro_args.size * array_elem_size(&scanner->macro_args)) {
		scanner->macro_args.size = 0;
		return;
	}
	array_reserve(&scanner->macro_args, scanner->macro_args.size);
	memcpy(
		(char*)scanner->macro_args.contents,
		buffer,
		scanner->macro_args.size * array_elem_size(&scanner->macro_args)
	);
}

bool tree_sitter_uiua_external_scanner_scan(
	Scanner* scanner,
	TSLexer* lexer,
	const bool* valid_symbols
) {
	printf("Column: %d, lookahead: %X\n", lexer->get_column(lexer), lexer->lookahead);
	show_scanner(scanner);
	show_valid(valid_symbols);
	if (valid_symbols[ERROR_SENTINEL]) {
		return false;
	}
	if (valid_symbols[UNSUB_MARKER]) {
		if (lexer->eof(lexer) || !is_subscript(lexer->lookahead)) {
			lexer->result_symbol = UNSUB_MARKER;
			return true;
		} else {
			return false;
		}
	}
	if (valid_symbols[BANGS] && (lexer->lookahead == '!' || lexer->lookahead == 0x203C)) {
		Arity bangs = 0;
		while (!lexer->eof(lexer)) {
			if (lexer->lookahead == '!') {
				bangs++;
			} else if (lexer->lookahead == 0x203C) {
				bangs += 2;
			} else {
				break;
			}
			lexer->advance(lexer, false);
		}
		if (bangs == 0) {
			return false;
		}
		scanner->last_bangs = bangs;
		lexer->result_symbol = BANGS;
		printf("Counted %d bangs\n", bangs);
		return true;
	}
	if (valid_symbols[MACRO_BUILTIN_MARKER1]) {
		scanner->last_bangs = 1;
		lexer->result_symbol = MACRO_BUILTIN_MARKER1;
		return true;
	}
	if (valid_symbols[MACRO_BUILTIN_MARKER2]) {
		scanner->last_bangs = 2;
		lexer->result_symbol = MACRO_BUILTIN_MARKER2;
		return true;
	}
	if (valid_symbols[MACRO_INVK_MARKER]) {
		printf("Macro invocation start\n");
		array_push(&scanner->macro_args, scanner->last_bangs);
		scanner->last_bangs = -1;
		lexer->result_symbol = MACRO_INVK_MARKER;
		return true;
	}
	if (valid_symbols[MACRO_INVK_PACK_END]) {
		printf("Pack end\n");
		array_pop(&scanner->macro_args);
		lexer->result_symbol = MACRO_INVK_PACK_END;
		return true;
	}
	if (valid_symbols[MACRO_INVK_UNPACK_END]) {
		if (lexer->eof(lexer) || lexer->lookahead == '\n' || *array_back(&scanner->macro_args) == 0) {
			printf("Macro end\n");
			lexer->result_symbol = MACRO_INVK_UNPACK_END;
			array_pop(&scanner->macro_args);
			return true;
		}
		return false;
	}
	if (valid_symbols[MACRO_INVK_UNPACK_NEXT]) {
		if (*array_back(&scanner->macro_args) == 0) {
			UNREACHABLE("");
			return false;
		}
		--*array_back(&scanner->macro_args);
		printf("One less arg\n");
		lexer->result_symbol = MACRO_INVK_UNPACK_NEXT;
		return true;
	}
	return false;
}
