/**
 * Outputs computed values for properties and variables.
 * Note that in LESS cases computed values for variables
 * might be incorrect because they are too lazy-evaluated
 * and depend on usage context.
 */
'use strict';

const expression = require('livestyle-css-expression');

module.exports = function(source, result, options) {
	var out = {};
	var ctxCache = {};

	var getContext = function(node) {
		var id = node.id;
		if (!ctxCache[id]) {
			ctxCache[id] = expression.Context.create(node.ref.scope.variables);
		}

		return ctxCache[id];
	};

	source.list().forEach(function(node) {
		if (node.type !== 'property' || !node.value || node.name === '@import') {
			return;
		}

		var refs = options.references[node.id] || options.references[node.parent.id];
		if (refs && refs.length) {
			out[node.id] = safeEval(node.value, getContext(result.getById(refs[0])));
		}
	});

	ctxCache = null;
	return out;
};

function safeEval(expr, ctx) {
	try {
		return expression.eval(expr, ctx).valueOf();
	} catch (e) {}
	return null;
}
