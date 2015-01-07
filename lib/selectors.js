/**
 * Resolves selectors for each source `section` node
 * @param {RepresentationNode} source
 * @param {RepresentationNode} result
 */
module.exports = function(source, result) {
	var lookup = [];
	result.list().forEach(function(node) {
		lookup.push(node.ref.ref, node.name);
	});

	if (result.ref._removed) {
		result.ref._removed.forEach(function(node) {
			lookup.push(node.ref, node.name);
		});
	}

	var out = {};
	source.list().forEach(function(node) {
		if (node.type !== 'section') {
			return;
		}

		var ix = lookup.indexOf(node.ref);
		if (~ix) {
			out[node.id] = lookup[ix + 1];
		}
	});

	return out;
};