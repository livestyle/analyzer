/**
 * For all `source` nodes finds corresponding nodes in
 * `result` that were generated from `source` one
 * @param {RepresentationNode} source
 * @param {RepresentationNode} result
 */
module.exports = function(source, result) {
	var sourceList = source.list();
	var sourceRefs = sourceList.map(function(node) {
		return node.ref;
	});

	var out = {};
	// Each generated (`result`) node holds reference 
	// to the `source` node that produced it
	// 
	// One source node may produce multiple result nodes
	// but one result node might be generated from single 
	// source node
	result.list().forEach(function(node) {
		var ix = sourceRefs.indexOf(node.ref.ref);
		if (~ix) {
			var sourceId = sourceList[ix].id;
			if (!out[sourceId]) {
				out[sourceId] = [];
			}
			out[sourceId].push(node.id);
		}
	});

	return out;
};