/**
 * Resolves selectors for each source `section` node
 * @param {RepresentationNode} source
 * @param {RepresentationNode} result
 */
'use strict';

module.exports = function(source, result, options) {
	return source.list().reduce((out, node) => {
		var resultNode = options.references.get(node);
		if (resultNode) {
			out[node.id] = resultNode.name;
		}
		return out;
	}, {});
};
