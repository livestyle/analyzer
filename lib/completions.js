/**
 * Provides completions list for each stylesheet section.
 * Currenlty, completions are not 100% accurate:
 * 1. In LESS, variables are lazy-evaluated, e.g. they must be
 * defined before they are referenced. Since analysis is
 * performed after complete stylesheet resolving, the scope
 * will contain all possible variables.
 * 2. Variables will contain raw (non-evaluated) values
 * 3. Some section (mixins) might be outputted several
 * times thus have multiple multiple result references
 * and scopes. Only first one is used.
 *
 * @param {RepresentationNode} source
 * @param {RepresentationNode} result
 * @param {Object}             options
 */
module.exports = function(source, result, options) {
	var syntax = result.ref.scope.syntax;
	var out = {};
	var emptyMixins = [];
	var reIsVar = /^[@\$]/;

	// Analyze root node too
	source.list().concat(source).forEach(function(node) {
		var refs = options.references[node.id];
		if (node.type === 'property' || !refs || !refs.length) {
			return;
		}

		var resultNode = result.getById(refs[0]);

		var variables = {};
		var scopeVariables = syntax === 'less' 
			? lessVariables(resultNode.ref) 
			: scssVariables(resultNode.ref);

		for (var v in scopeVariables) {
			if (reIsVar.test(v)) {
				variables[v] = scopeVariables[v];
			}
		}

		// unlike variables, multiple mixins may be defined with
		// the same name, so mixins has different output format
		var mixins = emptyMixins;
		if (syntax === 'less') {
			mixins = lessMixins(node.ref);
		} else if (syntax === 'scss') {
			mixins = scssMixins(resultNode.ref);
		}

		out[node.id] = {
			variables: variables,
			mixins: mixins
		};
	});

	return out;
};

function scssMixins(node) {
	// SCSS mixins are very simple
	var mixins = node.scope.mixins;
	return Object.keys(mixins).map(function(name) {
		var mixin = mixin[name];
		return {
			name: mixin.name,
			args: mixin.args.map(function(arg) {
				return {
					name: arg.name,
					value: arg.value
				};
			})
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

		var args = mixin.args.map(function(arg) {
			return {
				name: arg.name,
				value: arg.value
			};
		});

		mixin.names.forEach(function(mixinName) {
			result.push({
				name: _prefix + mixinName,
				args: args
			});

			result = result.concat(findLessMixins(child, mixinName));
		});
	});

	return result;
}

function lessVariables(node) {
	// get variables for last inner node to include
	// all inner variables
	node = node.children[node.children.length - 1];
	return node.scope.variables;
}

function scssVariables(node) {
	return node.scope.variables;
}