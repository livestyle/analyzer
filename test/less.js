var fs = require('fs');
var path = require('path');
var assert = require('assert');
var analyze = require('../');
var livestyle = require('emmet-livestyle');

livestyle.logger.silent(true);

describe('LESS Analyzer', function() {
	var stylesheet = fs.readFileSync(path.join(__dirname, 'stylesheet.less'), 'utf8');
	var analysis, result, source;

	// transformation is synchronous: no external dependencies
	livestyle.resolve(stylesheet, {syntax: 'less'}, function(err, tree) {
		result = tree;
		source = tree.scope.parent.ref;
		analysis = analyze(tree);
	});

	var getSource = function(args) {
		return Array.prototype.slice.call(args, 0).reduce(function(prev, cur) {
			return prev.get(cur);
		}, source);
	}

	it('references', function() {
		// source-to-result node references: shows how source node
		// is represented (resolved) in result CSS
		var ref = function(node) {
			var rsource = analysis.source.getByRef(getSource(arguments));
			if (rsource) {
				var refs = analysis.references[rsource.id];
				if (refs) {
					return refs.map(function(id) {
						var rresult = analysis.result.getById(id);
						if (rresult) {
							var out = rresult.name;
							if (rresult.type === 'property') {
								out += ': ' + rresult.value;
							}
							return out;
						}
					});
				}
			}
		};

		assert.equal(ref('.mx'), '.mx');
		assert.equal(ref('.mx2()'), undefined); // mixin-only sections are not outputted
		assert.equal(ref('.foo', 'padding'), 'padding: 2px');
		assert.equal(ref('.foo', '.bar2&'), '.bar2.foo');
		assert.equal(ref('.foo', '@{b}'), '.foo bar');
		assert.equal(ref('.foo', '.mx'), undefined); // mixin calls are not outputted
	});

	it('selectors', function() {
		// shows resolved selectors for source nodes
		var sel = function(node) {
			var rsource = analysis.source.getByRef(getSource(arguments));
			return rsource ? analysis.selectors[rsource.id] : undefined;
		};

		assert.equal(sel('.mx'), '.mx');
		assert.equal(sel('.mx2()'), undefined);
		assert.equal(sel('.foo'), '.foo');
		assert.equal(sel('.foo', '.bar1'), '.foo .bar1');
		assert.equal(sel('.foo', '.bar2&'), '.bar2.foo');
		assert.equal(sel('.foo', '&.bar3, &.bar4'), '.foo.bar3, .foo.bar4');
		assert.equal(sel('.foo', '@{b}'), '.foo bar');
	});

	it('completions', function() {
		// context completions with variables and mixins
		var compl = function() {
			var rsource = analysis.source.getByRef(getSource(arguments));
			var completions = rsource && analysis.completions[rsource.id];
			if (completions) {
				return {
					variables: Object.keys(completions.variables),
					mixins: completions.mixins.map(function(mixin) {
						var args = mixin.arguments.map(function(arg) {
							return arg[0];
						});
						return mixin.name + (args.length ? '(' + args.join(', ') + ')' : '');
					})
				};
			}
		};

		var c = compl('.foo');
		assert.deepEqual(c.variables, ['@arguments', '@baz', '@a', '@a2', '@b', '@c1', '@c1_1', '@c2', '@c3']);
		assert.deepEqual(c.mixins, ['.bar1', '.bar3', '.bar4', '.mx', '.mx(@a)', '.mx.inner', '.mx2', '.foo', '.foo.bar1', '.foo.bar3', '.foo.bar4', '.color', '.props']);

		c = compl('.color');
		assert.deepEqual(c.variables, ['@a', '@a2', '@b', '@c1', '@c1_1', '@c2', '@c3']);
		assert.deepEqual(c.mixins, ['.mx', '.mx(@a)', '.mx.inner', '.mx2', '.foo', '.foo.bar1', '.foo.bar3', '.foo.bar4', '.color', '.props']);
	});

	it('mixin call', function() {
		var getMixins = function() {
			var rsource = analysis.source.getByRef(getSource(arguments));
			return rsource && analysis.mixinCall[rsource.id];
		};

		var stringify = function(item) {
			var out = item[0];
			if (Array.isArray(item[1])) {
				out += '{' + item[1].map(stringify) + '}';
			} else {
				out += ':' + item[1] + ';';
			}
			return out;
		};

		var output = function(mixin) {
			return mixin.output.map(stringify).join('');
		};

		var mixins = getMixins('.foo', '.mx');
		assert.equal(mixins.length, 2);
		assert.equal(mixins[0].name, '.mx');
		assert.deepEqual(mixins[1].arguments, [['@a', '2']]);
		assert.equal(output(mixins[0]), 'c:d;');
		assert.equal(output(mixins[1]), 'g:2;.foo .inner{h:3;}');
	});

	it('variable suggest', function() {
		var suggest = function() {
			var rsource = analysis.source.getByRef(getSource(arguments));
			var suggestions = rsource && analysis.variableSuggest[rsource.id];
			if (suggestions) {
				return suggestions.map(function(s) {
					return s[0] + ': ' + s[1];
				});
			}
		};

		assert.deepEqual(suggest('.props', 'padding'), ['@a: 1px', '@a2: 10px - 9']);
		assert.deepEqual(suggest('.color', 'v1'), undefined); // no completions
		assert.deepEqual(suggest('.color', 'v2'), ['@c1: #fc0', '@c1_1: #fb0']);
		assert.deepEqual(suggest('.color', 'v3'), ['@c3: darken(#fc0, 0.1)']);
	});
});