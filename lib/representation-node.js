/**
 * Representation node holds reference to original node,
 * as well as unique ID used for later identification
 */
'use strict';

module.exports = class RepresentationNode {
	constructor(node, _ctx) {
		_ctx = _ctx || {};
		_ctx.prefix || (_ctx.prefix = 'r');
		'id' in _ctx ? _ctx.id++ : _ctx.id = 0;

		if (!_ctx.idLookup) {
			_ctx.idLookup = {};
		}

		if (!_ctx.refLookup) {
			_ctx.refLookup = new Map();
		}

		this.id = _ctx.prefix + _ctx.id;
		this.parent = null;
		this.ref = node;
		this.children = [];

		this._idLookup = _ctx.idLookup;
		_ctx.idLookup[this.id] = this;

		this._refLookup = _ctx.refLookup;
		_ctx.refLookup.set(node, this);

		if (!_ctx.skipChildren) {
			node.children.forEach(child => this.addChild(child, _ctx));
		}
	}

	get name() {
		return this.ref.name;
	}

	get value() {
		return this.ref.type === 'property' ? this.ref.value : undefined;
	}

	get type() {
		return this.ref.type;
	}

	/**
	 * Returns plain list of all child nodes
	 * @return {Array}
	 */
	list() {
		return this.children.reduce((out, child) => out.concat(child, child.list()), []);
	}

	getById(id) {
		return this._idLookup[id];
	}

	getByRef(ref) {
		return this._refLookup.get(ref);
	}

	addChild(node, _ctx) {
		if (!(node instanceof this.constructor)) {
			node = new this.constructor(node, _ctx);
		}

		node.parent = this;
		this.children.push(node);
	}

	toJSON(skipChildren) {
		var json = {
			id: this.id,
			name: this.name,
			type: this.type,
		};

		if (!skipChildren) {
			json.children = this.children.map(child => child.toJSON());
		}

		var value = this.value;
		if (value != null) {
			json.value = value;
		}

		return json;
	}
};
