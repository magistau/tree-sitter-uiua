# shellcheck shell=sh
exec >&2
set +e
exit_with=0
check() {
	"$@"
	res="$?"
	if [ "$res" -ne 0 ]; then
		exit_with="$res"
	fi
	return "$res"
}
check dprint check
check clang-format src/scanner.c --dry-run -Werror
for i in prims.json.do src/token.h.do **/*.ua; do
	# when a glob doesn't find anything, it is passed as a literal string
	# on some shells this can be fixed with something like nullglob
	if [ "$i" = '**/*.ua' ]; then
		printf 'No files with .ua extension found\n'
		continue
	fi
	printf 'Running checks on %s\n' "$i"
	# shellcheck disable=SC2094  # diff does not write to the file
	check uiua fmt --io <"$i" | diff - "$i"
	check uiua check "$i"
done
redo-ifchange grammar.js src/token.h
check tsc --noEmit
check tree-sitter generate && check tree-sitter test
exit "$exit_with"
