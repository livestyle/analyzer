/**
 * Resolves selectors for each source `section` node
 * @param {RepresentationNode} source
 * @param {RepresentationNode} result
 */
'use strict';

module.exports = function(source, result) {
	var lookup = new Map();

	result.list().forEach(node => lookup.set(node.ref.ref, node.name));

	if (result.ref._removed) {
		result.ref._removed.forEach(node => lookup.set(node.ref, node.name));
	}

	return source.list().reduce((out, node) => {
		if (node.type === 'section' && lookup.has(node.ref)) {
			out[node.id] = lookup.get(node.ref);
		}
		return out;
	}, {});
};
