/**
 * The same as `RepresentationNode` but with additional properties
 * with text ranges of node assets
 */
var RepresentationNode = require('./representation-node');

function SourceRepresenationNode(node, _ctx) {
	if (!(this instanceof SourceRepresenationNode)) {
		return new SourceRepresenationNode(node, _ctx);
	}

	RepresentationNode.call(this, node, _ctx || {prefix: 's'});
}

SourceRepresenationNode.prototype = Object.create(RepresentationNode.prototype, {
	range: {
		get: function() {
			return this.ref.range('full');
		}
	},
	nameRange: {
		get: function() {
			return this.ref.range('name');
		}
	},
	valueRange: {
		get: function() {
			return this.ref.range('value');
		}
	}
});

SourceRepresenationNode.prototype.constructor = SourceRepresenationNode;
SourceRepresenationNode.prototype.toJSON = function() {
	var obj = RepresentationNode.prototype.toJSON.call(this);
	if (this.ref.parent) {
		// not root node, can access node ranges
		obj.range = this.range.toJSON();
		obj.nameRange = this.nameRange.toJSON();
		obj.valueRange = this.valueRange.toJSON();
	}
	return obj;
};

module.exports = SourceRepresenationNode;