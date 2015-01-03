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

module.exports = function(tree) {
	var source = new SourceRepresentationNode(tree.scope.parent.ref);
	var result = new RepresentationNode(tree);


	return {
		source: source.toJSON(),
		result: result.toJSON(),
		references: references(source, result)
	};
};