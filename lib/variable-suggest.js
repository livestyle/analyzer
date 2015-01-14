/**
 * Suggests variables for static properties. Also provides suggestions
 * based on color similarity
 */
var expression = require('livestyle-css-expression');
var color = require('livestyle-css-expression/lib/color');
var COLOR_TOKEN = 8;
var reIsVar = /^[@\$]/;

module.exports = function(source, result, options) {
	var out = {};
	source.list().forEach(function(node) {
		var refs = options.references[node.id];
		if (node.type !== 'property' || !refs || !refs.length) {
			return;
		}

		var resultNode = result.getById(refs[0]);

		var variables = {};
		var scopeVariables = resultNode.ref.scope.variables;
		for (var v in scopeVariables) {
			if (reIsVar.test(v)) {
				variables[v] = scopeVariables[v];
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
		var v = safeEval(variables[name], ctx);
		if (v && v.type === 8) {
			var distance = module.exports.colorDistance(value, v.value);
			if (distance <= 60) {
				out.push([name, variables[name], v.valueOf(), distance]);
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
		var v = safeEval(variables[name], ctx);
		if (v && value == v.valueOf()) {
			out.push([name, variables[name], v.valueOf()]);
		}
	});

	return out.length ? out : null;
}