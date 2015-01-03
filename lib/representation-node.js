/**
 * Representation node holds reference to original node,
 * as well as unique ID used for later identification
 */
function RepresentationNode(node, _ctx) {
	if (!(this instanceof RepresentationNode)) {
		return new RepresentationNode(node, _ctx);
	}

	_ctx = _ctx || {};
	_ctx.prefix || (_ctx.prefix = 'r');
	'id' in _ctx ? _ctx.id++ : _ctx.id = 0;

	this.id = _ctx.prefix + _ctx.id;
	this.ref = node;
	this.children = node.children.map(function(child) {
		return new RepresentationNode(child, _ctx);
	});
}

RepresentationNode.prototype = {
	/**
	 * Returns plain list of all child nodes
	 * @return {Array}
	 */
	list: function() {
		var result = [];
		this.children.forEach(function(child) {
			result = result.concat(child, child.list());
		});
		return result;
	},

	toJSON: function() {
		return {
			id: this.id,
			name: this.name,
			type: this.type,
			children: this.children.map(function(child) {
				return child.toJSON();
			})
		};
	}
};

Object.defineProperties(RepresentationNode.prototype, {
	name: {
		enumerable: true,
		get: function() {
			return this.ref.name;
		}
	},
	type: {
		enumerable: true,
		get: function() {
			return this.ref.type;
		}
	}
});

module.exports = RepresentationNode;
