/**
 * The same as `RepresentationNode` but with additional properties
 * with text ranges of node assets
 */
'use strict';

const RepresentationNode = require('./representation-node');

module.exports = class SourceRepresenationNode extends RepresentationNode {
	constructor(node, _ctx) {
		super(node, _ctx || {prefix: 's'});
	}

	get range() {
		return this.ref.range('full');
	}

	get nameRange() {
		return this.ref.range('name');
	}

	get valueRange() {
		return this.ref.range('value');
	}

	toJSON(skipChildren) {
		var obj = super.toJSON(skipChildren);
		if (this.ref.parent) {
			// not root node, can access node ranges
			obj.range = this.range.toJSON();
			obj.nameRange = this.nameRange.toJSON();
			obj.valueRange = this.valueRange.toJSON();
		}
		return obj;
	}
};
