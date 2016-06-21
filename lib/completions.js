/**
 * Provides completions list for each stylesheet section.
 * Currenlty, completions are not 100% accurate:
 * 1. In LESS, variables are lazy-evaluated, e.g. they must be
 * defined before they are referenced. Since analysis is
 * performed after complete stylesheet resolving, the scope
 * will contain all possible variables.
 * 2. Variables will contain raw (non-evaluated) values
 * 3. Some section (mixins) might be outputted several
 * times thus have multiple result references
 * and scopes. Only first one is used.
 *
 * @param {RepresentationNode} source
 * @param {RepresentationNode} result
 * @param {Object}             options
 */
'use strict';
const expression = require('livestyle-css-expression');

const skipVariables = new Set(['@arguments', '@import']);
const reIsVar = /^[@\$]/;

module.exports = function(source, result, options) {
	var syntax = result.ref.scope.syntax;
	var out = {};
	var emptyMixins = [];
	var emptyVars = [];

	// Analyze root node too
	[source].concat(source.list()).forEach(function(node) {
		if (node.type === 'property') {
			// no completions for properties, use parent node instead
			return;
		}

		var variables, mixins;

		if (isMixin(node, syntax)) {
			var parentScope = out[node.parent.id] || {};
			var parentVars = extend({}, parentScope.variables);
			variables = extend(parentVars, mixinVariableCompletions(node));
			mixins = parentScope.mixins || mixinCompletions(node, result, syntax);
		} else {
			var resultNode = options.references.get(node);
			if (resultNode) {
				variables = variableCompletions(resultNode, syntax);
				mixins = mixinCompletions(node, resultNode, syntax);
			}
		}

		if (variables || mixins) {
			out[node.id] = {
				variables: variables || emptyVars,
				mixins: mixins || emptyMixins
			};
		}
	});

	return out;
};

function argMap(arg) {
	return [arg.name, arg.value];
}

function scssMixins(node) {
	// SCSS mixins are very simple
	var mixins = node.scope.mixins;
	return Object.keys(mixins).map(function(name) {
		var mixin = mixins[name];
		return {
			name: mixin.name,
			arguments: mixin.args.map(argMap)
		};
	});
}

function lessMixins(node) {
	// LESS mixins are pretty complex: it might be any
	// section with ID or CLASS selector. LiveStyle LESS resolver
	// stores mixin definitions as custom data in resolved tree nodes
	var mixins = findLessMixins(node);
	while (node.parent) {
		mixins = mixins.concat(findLessMixins(node = node.parent));
	}
	return mixins;
}

function findLessMixins(context, _prefix) {
	var result = [];
	_prefix = _prefix || '';
	context.children.forEach(function(child) {
		var mixin = child.data('mixinDefinition');
		if (child.type === 'property' || !mixin) {
			return;
		}

		mixin.names.forEach(function(mixinName) {
			result.push({
				name: _prefix + mixinName,
				arguments: mixin.args.map(argMap)
			});

			result = result.concat(findLessMixins(child, mixinName));
		});
	});

	return result;
}

function variableCompletions(node, syntax) {
	var variables = {};
	var scopeVariables = node.ref.scope.variables;
	var ctx = expression.Context.create(scopeVariables);

	for (var v in scopeVariables) {
		if (reIsVar.test(v) && !skipVariables.has(v)) {
			variables[v] = {
				raw: scopeVariables[v],
				computed: safeEval(scopeVariables[v], ctx)
			};
		}
	}

	return variables;
}

function extend(obj, src) {
	src && Object.keys(src).forEach(function(key) {
		obj[key] = src[key];
	});

	return obj;
}

function mixinVariableCompletions(node) {
	var variables = {};
	var defs = node.ref.data('mixinDefinition');
	defs.args.forEach(function(arg) {
		variables[arg.name] = arg.value;
	});
	return variables;
}

function mixinCompletions(sourceNode, resultNode, syntax) {
	var mixins;
	if (syntax === 'less') {
		mixins = lessMixins(sourceNode.ref);
		// append external mixins
		var root = sourceNode.ref.root;
		resultNode.ref.scope.mixinsExternal.forEach(function(tree) {
			if (tree.ref !== root) {
				mixins = mixins.concat(lessMixins(tree.ref));
			}
		});
	} else if (syntax === 'scss') {
		mixins = scssMixins(resultNode.ref);
	}

	return mixins;
}

function isMixin(node, syntax) {
	if (node.ref.data('mixinDefinition')) {
		// since all class & id selectors are mixins in LESS,
		// handle mixin-only sections (e.g. those with parens)
		return syntax !== 'less' || ~node.name.indexOf('(');
	}
}

function safeEval(expr, ctx) {
	try {
		return expression.eval(expr, ctx).valueOf();
	} catch (e) {}
	return null;
}
