/**
 * Analyzes given resolved tree.
 * 
 * @param  {ResolvedNode} tree Resolved tree to analyze. Should 
 * contain reference to source node which is actually will be 
 * analyzed.
 * @return {Object}       JSON with meta info about `source` tree
 */

var RepresentationNode = require('./lib/representation-node');
var SourceRepresentationNode = require('./lib/source-representation-node');
var references = require('./lib/references');
var selectors = require('./lib/selectors');
var completions = require('./lib/completions');
var mixinCall = require('./lib/mixin-call');
var variableSuggest = require('./lib/variable-suggest');

module.exports = function(tree) {
	var source = new SourceRepresentationNode(tree.scope.parent.ref);
	var result = new RepresentationNode(tree);
	var options = {
		references: references(source, result)
	};

	return {
		source: source.toJSON(),
		result: result.toJSON(),
		references: options.references,
		selectors: selectors(source, result, options),
		completions: completions(source, result, options),
		mixinCall: mixinCall(source, result, options),
		variableSuggest: variableSuggest(source, result, options)
	};
};