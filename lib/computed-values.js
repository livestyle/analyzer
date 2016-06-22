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
	var syntax = result.ref.scope.syntax;

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

		var resultNode = options.references.get(node) || options.references.get(node.parent);
		if (resultNode) {
			out[node.id] = safeEval(node, getContext(resultNode), syntax);
		}
	});

	ctxCache = null;
	return out;
};

function safeEval(node, ctx, syntax) {
	// add some magic stuff for handling expressions:
	// * if current syntax is LESS and we are evaluating `font` property, do not
	//   compute expressions like `14px/20px`
	// * for SCSS syntax always use different mode as described here:
	//   https://github.com/livestyle/css-expression/blob/master/lib/evaluator.js#L132
	var magicDiv = 0;
	if (node.name === 'font' && syntax === 'less') {
		magicDiv = 1;
	} else if (syntax === 'scss') {
		magicDiv = 2;
	}

	ctx._scope['%magic-div'] = magicDiv;

	try {
		return expression.eval(node.value, ctx).valueOf();
	} catch (e) {}
	return null;
}
