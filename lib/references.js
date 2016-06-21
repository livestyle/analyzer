/**
 * For all `source` nodes finds corresponding nodes in
 * `result` that were generated from `source` one
 * @param {RepresentationNode} source
 * @param {RepresentationNode} result
 */
'use strict';
const RepresentationNode = require('./representation-node');

module.exports = function(source, result) {
	var sourceList = source.list();
	var sourceRefs = sourceList.map(node => node.ref);

	const removedNodesLookup = createRemovedNodesLookup(result.ref);
	const mapping = {};
	mapping[source.id] = [result.id];
	// Each generated (`result`) node holds reference to the `source` node
	// that produced it.
	//
	// One source node may produce multiple result nodes but one result node
	// might be generated from single source node only
	result.list().forEach(function(node) {
		var ix = sourceRefs.indexOf(node.ref.ref);
		if (~ix) {
			var sourceId = sourceList[ix].id;
			if (!mapping[sourceId]) {
				mapping[sourceId] = [];
			}
			mapping[sourceId].push(node.id);
		}
	});

	return {
		mapping,
		/**
		 * Returns matched result node for given source node
		 * @param  {RepresentationNode} source
		 * @return {RepresentationNode}
		 */
		get(source) {
			let refs = mapping[source.id];
			if (refs && refs.length) {
				return result.getById(refs[0]);
			}

			// check if result for given node was removed
			let removed = removedNodesLookup.get(source.ref);
			if (removed) {
				return removed[0];
			}
		}
	};
};

/**
 * Creates lookup from result node that were removed by LiveStyle during
 * optimization process. These nodes are empty byt contains valuable scope data
 * @return {Map}
 */
function createRemovedNodesLookup(resultTree) {
	var ctx = {
		prefix: 'rr',
		skipChildren: true
	};

	return (resultTree._removed || []).reduce((out, resultNode) => {
		let sourceNode = resultNode.ref;
		let items = out.get(sourceNode) || [];
		items.push(new RepresentationNode(resultNode, ctx));
		return out.set(sourceNode, items);
	}, new Map());
}
