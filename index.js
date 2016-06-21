/**
 * Analyzes given resolved tree.
 *
 * @param  {ResolvedNode} tree Resolved tree to analyze. Should
 * contain reference to source node which is actually will be
 * analyzed.
 * @return {Object} JSON with meta info about `source` tree
 */
'use strict';

const RepresentationNode = require('./lib/representation-node');
const SourceRepresentationNode = require('./lib/source-representation-node');
const references = require('./lib/references');
const selectors = require('./lib/selectors');
const completions = require('./lib/completions');
const mixinCall = require('./lib/mixin-call');
const variableSuggest = require('./lib/variable-suggest');
const computedValues = require('./lib/computed-values');

function toJSON() {
	var json = {};
	Object.keys(this).forEach(function(prop) {
		var value = this[prop];
		if (typeof value === 'object' && 'toJSON' in value) {
			value = value.toJSON();
		}
		json[prop] = value;
	}, this);
	return json;
}

module.exports = function(tree) {
	var source = new SourceRepresentationNode(tree.scope.parent.ref);
	var result = new RepresentationNode(tree);
	var options = {
		references: references(source, result)
	};

	var out = {
		source: source,
		result: result,
		syntax: tree.scope.syntax,
		references: options.references.mapping,
		selectors: selectors(source, result, options),
		completions: completions(source, result, options),
		mixinCall: mixinCall(source, result, options),
		variableSuggest: variableSuggest(source, result, options),
		computedValues: computedValues(source, result, options)
	};

	Object.defineProperty(out, 'toJSON', {
		value: toJSON
	});

	return out;
};
