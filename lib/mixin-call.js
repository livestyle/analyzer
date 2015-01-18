/**
 * Traces mixin calls: provides list of matched
 * and resolved mixin contents
 */
module.exports = function(source, result, options) {
	function argOutput(arg) {
		return [arg.name, arg.value];
	}

	function toJSON(node) {
		var name = node.name;
		var value = node.type === 'property' ? node.value : node.children.map(toJSON);
		return [name, value];
	}

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
				output: item.output.map(toJSON)
			};
		});
	});

	return out;
};