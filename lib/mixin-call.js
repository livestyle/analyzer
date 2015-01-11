/**
 * Traces mixin calls: provides list of matched
 * and resolved mixin contents
 */
module.exports = function(source, result, options) {
	var resultList = result.list();
	var resultRef = resultList.map(function(node) {
		return node.ref;
	});

	var resultId = function(node) {
		var ix = resultRef.indexOf(node);
		if (ix !== -1) {
			return resultList[ix].id;
		}
	};

	var argOutput = function(arg) {
		return {
			name: arg.name,
			value: arg.value
		};
	};

	// Matched mixins are stored as `resolvedMixins`
	// data property of source nodes
	var out = {};
	source.list().forEach(function(node) {
		var mixins = node.ref.data('resolvedMixins');
		if (!mixins) {
			return;
		}

		// each mixin definition contains actual mixin and 
		// its output
		out[node.id] = mixins.map(function(item) {
			return {
				name: item.mixin.name,
				arguments: item.mixin.args.map(argOutput),
				output: item.output.map(resultId)
			};
		});
	});

	return out;
};