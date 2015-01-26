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

	if (!_ctx.idLookup) {
		_ctx.idLookup = {};
	}

	this.id = _ctx.prefix + _ctx.id;
	this.parent = null;
	this.ref = node;
	this.children = [];
	this._idLookup = _ctx.idLookup;
	_ctx.idLookup[this.id] = this;
	var self = this;
	node.children.forEach(function(child) {
		self.addChild(child, _ctx);
	});
}

RepresentationNode.prototype = {
	constructor: RepresentationNode,

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

	getById: function(id) {
		return this._idLookup[id];
	},

	getByRef: function(ref) {
		var result = null;
		if (this.ref === ref) {
			return this;
		}

		this.list().some(function(node) {
			if (node.ref === ref) {
				return result = node;
			}
		});

		return result;
	},

	addChild: function(node, _ctx) {
		if (!(node instanceof this.constructor)) {
			node = new this.constructor(node, _ctx);
		}

		node.parent = this;
		this.children.push(node);
	},

	toJSON: function() {
		var json = {
			id: this.id,
			name: this.name,
			type: this.type,
			children: this.children.map(function(child) {
				return child.toJSON();
			})
		};

		var value = this.value;
		if (value != null) {
			json.value = value;
		}

		return json;
	}
};

Object.defineProperties(RepresentationNode.prototype, {
	name: {
		enumerable: true,
		get: function() {
			return this.ref.name;
		}
	},
	value: {
		enumerable: true,
		get: function() {
			return this.ref.type === 'property' ? this.ref.value : undefined;
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
