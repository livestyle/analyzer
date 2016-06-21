/**
 * Suggests variables for static properties. Also provides suggestions
 * based on color similarity
 */
'use strict';

const expression = require('livestyle-css-expression');
const color = require('livestyle-css-expression/lib/color');
const COLOR_TOKEN = 8;
const reIsVar = /^[@\$]/;

module.exports = function(source, result, options) {
	var syntax = result.ref.scope.syntax;
	var out = {};
	source.list().forEach(function(node) {
		var resultNode = options.references.get(node);
		if (node.type !== 'property' || !resultNode) {
			return;
		}

		var variables = {};
		var scopeVariables = resultNode.ref.scope.variables;
		var rawVars = resultNode.ref.scope.rawVariables || {};
		for (var v in scopeVariables) {
			if (reIsVar.test(v)) {
				variables[v] = {
					value: syntax === 'less' ? null : scopeVariables[v],
					raw: syntax === 'less' ? scopeVariables[v] : rawVars[v]
				}
			}
		}

		var value = color(node.ref.value, true);
		var suggestions = value ? colorSuggestions(value, variables) : basicSuggestions(node.ref.value, variables);
		if (suggestions) {
			out[node.id] = suggestions;
		}
	});

	return out;
};

/**
 * Calculates distance between two colors: how far they are
 * different from each other.
 * Algorithm taken from http://www.compuphase.com/cmetric.htm
 * @param  {Color} color1
 * @param  {Color} color2
 * @return {Number}
 */
module.exports.colorDistance = function(color1, color2) {
	if (typeof color1 === 'string') {
		color1 = color(color1);
	}

	if (typeof color2 === 'string') {
		color2 = color(color2);
	}

	var rmean = (color1.r + color2.r) / 2;
	var r = color1.r - color2.r;
	var g = color1.g - color2.g;
	var b = color1.b - color2.b;

	return Math.sqrt((((512 + rmean) * r * r) >> 8) + 4 * g * g + (((767 - rmean) * b * b) >> 8));
};

function safeEval(expr, ctx) {
	try {
		return expression.eval(expr, ctx);
	} catch (e) {}
	return null;
}

function getVariable(variables, name, ctx) {
	var v = variables[name];
	if (v && typeof v.raw !== 'undefined') {
		return safeEval(v.raw, ctx);
	}
	return v && v.value;
}

/**
 * Provides color suggestions for given value from variables
 * @param  {Color} value     Property value, parsed as color
 * @param  {Object} variables Variables scope for current context
 * @return {Array}
 */
function colorSuggestions(value, variables) {
	var ctx = expression.Context.create(variables);
	var out = []
	Object.keys(variables).map(function(name) {
		var v = getVariable(variables, name, ctx);
		if (v && v.type === 8) {
			var distance = module.exports.colorDistance(value, v.value);
			if (distance <= 60) {
				out.push([name, variables[name].raw, v.valueOf(), distance]);
			}
		}
	});

	return !out.length ? null : out.sort(function(a, b) {
		// sort suggestions by distance: lower is better (higher)
		return a[3] - b[3];
	});
}

function basicSuggestions(value, variables) {
	var ctx = expression.Context.create(variables);
	var out = [];
	Object.keys(variables).map(function(name) {
		var v = getVariable(variables, name, ctx);
		if (v && value == v.valueOf()) {
			out.push([name, variables[name].raw, v.valueOf()]);
		}
	});

	return out.length ? out : null;
}
