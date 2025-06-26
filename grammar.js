/**
 * @file A stack-based array programming language
 * @author Tau <tree-sitter@alice-carroll.pet>
 * @license BSD-3-clause
 */
/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

import prims from "./prims.json";
const prim_precs = {
	range: 1,
	partition: 1,
	select: 1,
};

export default grammar({
	name: "uiua",

	rules: {
		source_file: $ => $.expr,
		comment: _ => /#.*/,
		literal: $ =>
			choice(
				$.string,
				$.number,
			),
		number: $ => choice($._decimal),
		_decimal: _ => /[`¯]?[0-9]+(?:\.[0-9]+)?(?:[eE][`¯-]?[0-9]+)?/,
		string: $ =>
			seq(
				"\"",
				repeat(choice(
					$._escape_sequence,
					$._string_content,
				)),
				"\"",
			),
		_string_content: _ => /[^\\"\n]+/,
		_escape_sequence: _ =>
			token.immediate(seq(
				"\\",
				choice(
					/[\\"0bnrstWZ]/,
					/u\{[[:xdigit:]]{0,6}\}/,
					/u\{[[:xdigit:]]{7}/,
					/u[[:xdigit:]]{4}/,
					/x[[:xdigit:]]{2}/,
				),
			)),
		_bare_ident: _ => choice(re`&?[\p{Alphabetic}--ⁿₙₑℂ]+`, "&"),
		subscript: _ => /(?:[⌞⌟₋₀-₉]+|(?:,|__)[`¯]?[0-9]*[<>]?[0-9]*)+/,
		sub_ident: $ => seq($._bare_ident, choice($.subscript, $._unsub_marker)),
		identifier: $ =>
			choice(
				$.sub_ident,
				$.macro_ident_noargs,
			),
		macro_ident: $ =>
			choice(
				seq($.builtin_macro1, $._macro_builtin_marker1),
				seq($.builtin_macro2, $._macro_builtin_marker2),
				seq($.sub_ident, $.bangs),
			),
		macro_ident_noargs: $ => $.macro_ident,
		macro: $ => $.macro_ident,
		builtin_macro1: $ => seq(choice(...nameprims($, prims.macro[1])), choice($.subscript, $._unsub_marker)),
		builtin_macro2: $ => seq(choice(...nameprims($, prims.macro[2])), choice($.subscript, $._unsub_marker)),
		builtin_func0: $ => seq(choice(...nameprims($, prims.func[0])), choice($.subscript, $._unsub_marker)),
		builtin_func1: $ => seq(choice(...nameprims($, prims.func[1])), choice($.subscript, $._unsub_marker)),
		builtin_func2: $ => seq(choice(...nameprims($, prims.func[2])), choice($.subscript, $._unsub_marker)),
		builtin_func3: $ => seq(choice(...nameprims($, prims.func[3])), choice($.subscript, $._unsub_marker)),
		func: $ => choice($.builtin_func0, $.builtin_func1, $.builtin_func2, $.builtin_func3, $.sub_ident),
		unit: $ =>
			choice(
				$.func,
				$.macro_invk,
				$.literal,
				seq("(", $.expr, ")"),
				seq("[", $.expr, "]"),
				seq("{", $.expr, "}"),
			),
		pack: $ =>
			seq(
				choice(seq("(", $.pack_params, ")"), seq("[", $.pack_params, "]"), seq("{", $.pack_params, "}")),
				$._macro_invk_pack_end,
			),
		pack_params: $ => sep_by2(optional($.expr), "|"),
		macro_args: $ =>
			choice(
				$.pack,
				seq(
					repeat(seq($.unit, $._macro_invk_unpack_next)),
					$._macro_invk_unpack_end,
				),
			),
		macro_invk: $ => seq($.macro, $._macro_invk_marker, $.macro_args),
		line: $ => repeat1($.unit),
		expr: $ => seq(sep_by1($.line, $.eol), optional($.eol)),
		eol: $ => /\r?\n/,
		...genprims(),
	},
	extras: $ => [
		/[ \t]+/,
		$.comment,
	],
	// conflicts: $ => [[$.macro, $.macro_invk]],
	externals: $ => [
		$._macro_invk_marker,
		$._macro_invk_unpack_next,
		$._macro_invk_unpack_end,
		$._macro_invk_pack_end,
		$._macro_builtin_marker1,
		$._macro_builtin_marker2,
		$.bangs,
		$._unsub_marker,
		$.error_sentinel,
	],
});

/** @typedef {{ name: string, ascii?: string, glyph?: string }} Primitive */
/**
@template {string} RuleName
@param {GrammarSymbols<RuleName>} $
@param {Primitive} prim
@returns {RuleOrLiteral}
*/
function fromprim($, { name, ascii = undefined, glyph = undefined }) {
	let opts = [];
	if (ascii !== undefined) opts.push(ascii);
	if (glyph !== undefined && glyph !== ascii) opts.push(glyph);
	if (!name.includes(" ") && (ascii !== undefined || glyph !== undefined)) opts.push(shorts(name));
	/** @type {RuleOrLiteral} */
	let res = choice(...opts);
	let pr = prim_precs[name];
	if (pr !== undefined) {
		res = token(prec(pr, res));
	}
	return res;
}

/**
@template {string} RuleName
@param {GrammarSymbols<RuleName>} $
@param {Primitive[]} names
@returns {RuleOrLiteral[]}
*/
function nameprims($, names) {
	return names.map(x => $[_primname(x.name)]);
}

/**
@param {string} name
@returns {string}
*/
function _primname(name) {
	return `prim_${name.replace(" ", "_")}`;
}

/**
@returns {RuleBuilders<string, never>}
*/
function genprims() {
	return Object.fromEntries(
		Object
			.values(prims)
			.flat(2)
			.map(prim => [_primname(prim.name), $ => fromprim($, prim)]),
	);
}

/**
@param {string} name
@returns {RuleOrLiteral}
*/
function shorts(name) {
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

/**
@template {"_bare_ident"} RuleName
@param {GrammarSymbols<RuleName>} $
@param {number} n
@returns {RuleOrLiteral}
*/
function macron($, n) {
	let b = bangs(n);
	return choice(b, seq($._bare_ident, token.immediate(b)));
}

/**
@param {number} n
@returns {RuleOrLiteral}
*/
function bangs(n) {
	return choice(..._bangs(n));
}

/**
@param {number} n
@returns {string[]}
*/
function _bangs(n) {
	if (n == 0) return [""];
	if (n == 1) return ["!"];
	return _bangs(n - 1).map(x => x + "!").concat(_bangs(n - 2).map(x => x + "‼"));
}

/**
@param {TemplateStringsArray} strings
@returns {RustRegex}
*/
function re(strings) {
	return new RustRegex(strings.raw[0]);
}

/**
@param {RuleOrLiteral} tok
@param {RuleOrLiteral} sep
@returns {RuleOrLiteral}
*/
function sep_by2(tok, sep) {
	return seq(repeat1(seq(tok, sep)), tok);
}
/**
@param {RuleOrLiteral} tok
@param {RuleOrLiteral} sep
@returns {RuleOrLiteral}
*/
function sep_by1(tok, sep) {
	return seq(repeat(seq(tok, sep)), tok);
}
/**
@param {RuleOrLiteral} tok
@param {RuleOrLiteral} sep
@returns {RuleOrLiteral}
*/
function sep_by(tok, sep) {
	return optional(sep_by1(tok, sep));
}

/**
@param {RuleOrLiteral} tok
@param {number} count
@returns {RuleOrLiteral}
*/
function rep_at_most(tok, count) {
	return seq(...Array(count).fill(tok).map(x => x));
}
