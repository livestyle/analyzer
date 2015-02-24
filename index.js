/**
 * Analyzes given resolved tree.
 * 
 * @param  {ResolvedNode} tree Resolved tree to analyze. Should 
 * contain reference to source node which is actually will be 
 * analyzed.
 * @return {Object} JSON with meta info about `source` tree
 */

var RepresentationNode = require('./lib/representation-node');
var SourceRepresentationNode = require('./lib/source-representation-node');
var references = require('./lib/references');
var selectors = require('./lib/selectors');
var completions = require('./lib/completions');
var mixinCall = require('./lib/mixin-call');
var variableSuggest = require('./lib/variable-suggest');
var computedValues = require('./lib/computed-values');

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
		references: options.references,
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