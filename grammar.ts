/**
 * @file A stack-based array programming language
 * @author Tau <tree-sitter@alice-carroll.pet>
 * @license BSD-3-clause
 */
/// <reference types="tree-sitter-cli/dsl" />

import prims from "./prims.json";
const prim_precs: Record<string, number> = { range: 1, partition: 1, select: 1 };

export default grammar({
	name: "uiua",
	rules: {
		source_file: $ => $.expr,
		comment: _ => /#.*/,
		literal: $ => choice($.string, $.number),
		number: $ => choice($._decimal),
		_decimal: _ => /[`¯]?[0-9]+(?:\.[0-9]+)?(?:[eE][`¯-]?[0-9]+)?/,
		string: $ => seq("\"", repeat(choice($._escape_sequence, $._string_content)), "\""),
		_string_content: _ => /[^\\"\n]+/,
		_escape_sequence: _ =>
			token.immediate(
				seq(
					"\\",
					choice(
						/[\\"0bnrstWZ]/,
						/u\{[[:xdigit:]]{0,6}\}/,
						/u\{[[:xdigit:]]{7}/,
						/u[[:xdigit:]]{4}/,
						/x[[:xdigit:]]{2}/,
					),
				),
			),
		_bare_ident: _ => choice(re`&?[\p{Alphabetic}--ⁿₙₑℂ]+`, "&"),
		subscript: _ => /(?:[⌞⌟₋₀-₉]+|(?:,|__)[`¯]?[0-9]*[<>]?[0-9]*)+/,
		sub_ident: $ => seq($._bare_ident, choice($.subscript, $._unsub_marker)),
		identifier: $ => choice($.sub_ident, $.macro_ident_noargs),
		macro_ident: $ => choice($._builtin_macro, seq($.sub_ident, $.bangs)),
		macro_ident_noargs: $ => $.macro_ident,
		macro: $ => $.macro_ident,
		func: $ => choice($._builtin_func, $.sub_ident),
		strand: $ => sep_by2($._unit_nostrand, "_"),
		_unit_nostrand: $ => choice($.func, $.macro_invk, $.literal, braced($.expr)),
		unit: $ => choice($.strand, $._unit_nostrand),
		pack: $ => seq(braced($._pack_params), $._macro_invk_pack_end),
		_pack_params: $ => sep_by2(optional($.expr), "|"),
		macro_args: $ =>
			choice($.pack, seq(repeat(seq($.unit, $._macro_invk_unpack_next)), $._macro_invk_unpack_end)),
		macro_invk: $ => seq($.macro, $._macro_invk_marker, $.macro_args),
		line: $ => repeat1($.unit),
		binding: $ => seq($.identifier, /(↚|[←=]~?)\^?/, $.line),
		_expr_line: $ => choice($.line, $.binding),
		expr: $ => seq(sep_by1($._expr_line, $._eol), optional($._eol)),
		_eol: _ => /\r?\n/,
		...genprims(),
	},
	extras: $ => [/[ \t]+/, $.comment],
	externals: $ => [
		$._macro_invk_marker,
		$._macro_invk_unpack_next,
		$._macro_invk_unpack_end,
		$._macro_invk_pack_end,
		$._macro_builtin_marker1,
		$._macro_builtin_marker2,
		$.bangs,
		$._unsub_marker,
		$.__error_sentinel,
	],
});

type Primitive = { name: string; ascii?: string; glyph?: string };
function fromprim({ name, ascii = undefined, glyph = undefined }: Primitive): RuleOrLiteral {
	let opts = [];
	if (ascii !== undefined) {
		opts.push(ascii);
	}
	if (glyph !== undefined && glyph !== ascii) {
		opts.push(glyph);
	}
	if (!name.includes(" ") && (ascii !== undefined || glyph !== undefined)) {
		opts.push(shorts(name));
	}
	let res: RuleOrLiteral = choice(...opts);
	let pr = prim_precs[name];
	if (pr !== undefined) {
		res = token(prec(pr, res));
	}
	return res;
}

function nameprims<RuleName extends string>(
	$: GrammarSymbols<RuleName>,
	names: Primitive[],
): RuleOrLiteral[] {
	return names.map(x => $[_primname(x.name)]);
}

function _primname(name: string): string {
	return `prim_${name.replace(" ", "_")}`;
}

function genprims(): RuleBuilders<string, never> {
	return {
		...Object.fromEntries(
			Object
				.values(prims)
				.flat(2)
				.map(prim => [_primname(prim.name), _$ => fromprim(prim)]),
		),
		...Object.fromEntries(
			Object.entries(prims).flatMap(([kind, arities]) => {
				return arities.flatMap((arr, arity) =>
					arr.length == 0
						? []
						: [[`builtin_${kind}${arity}`, $ =>
							seq(choice(...nameprims($, arr)), choice($.subscript, $._unsub_marker))]]
				);
			}),
		),
		_builtin_macro: $ =>
			choice(...prims.macro.flatMap((arr, arity) =>
				arr.length == 0
					? []
					: [seq($[`builtin_macro${arity}`], $[`_macro_builtin_marker${arity}`])]
			)),
		_builtin_func: $ => choice(...prims.func.map((_, arity) => $[`builtin_func${arity}`])),
	};
}

function shorts(name: string): RuleOrLiteral {
	if (name.length <= 3 || name[0] === "&") {
		return name;
	} else {
		let res = [];
		for (let i = 3; i <= name.length; ++i) {
			res.push(name.slice(0, i));
		}
		return choice(...res);
	}
}

function re(strings: TemplateStringsArray): RustRegex {
	return new RustRegex(strings.raw[0]);
}
function sep_by2(tok: RuleOrLiteral, sep: RuleOrLiteral): RuleOrLiteral {
	return seq(repeat1(seq(tok, sep)), tok);
}
function sep_by1(tok: RuleOrLiteral, sep: RuleOrLiteral): RuleOrLiteral {
	return seq(repeat(seq(tok, sep)), tok);
}
function braced(tok: RuleOrLiteral): RuleOrLiteral {
	return choice(seq("(", tok, ")"), seq("[", tok, "]"), seq("{", tok, "}"));
}
