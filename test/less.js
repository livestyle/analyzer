'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var analyzer = require('../');
var livestyle = require('emmet-livestyle');

livestyle.logger.silent(true);

function analyze(file) {
	var absFile = path.resolve(__dirname, file);
	var stylesheet = fs.readFileSync(absFile, 'utf8');
	var analysis;

	// transformation is synchronous: no external dependencies
	var options = {
		uri: absFile,
		syntax: 'less',
		loader: function(deps, callback) {
			callback(deps.map(function(dep) {
				return {
					uri: dep.uri,
					content: fs.readFileSync(dep.uri, 'utf8')
				};
			}));
		}
	};
	livestyle.resolve(stylesheet, options, function(err, tree) {
		analysis = analyzer(tree);
		var rawSource = tree.scope.parent.ref;

		analysis.rawSource = rawSource;
		analysis.getRefSource = args => {
			return Array.from(args).reduce((node, sel) => node.get(sel), rawSource);
		};

		analysis.getSource = args => {
			return analysis.source.getByRef(analysis.getRefSource(args));
		};
	});

	return analysis;
}

describe('LESS Analyzer', function() {
	it('references', function() {
		// source-to-result node references: shows how source node
		// is represented (resolved) in result CSS
		var analysis = analyze('stylesheet.less');
		var ref = function(node) {
			var rsource = analysis.getSource(arguments);
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
		var analysis = analyze('stylesheet.less');
		var sel = function(node) {
			var rsource = analysis.getSource(arguments);
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
		var analysis = analyze('stylesheet.less');
		var compl = function() {
			var rsource = analysis.getSource(arguments);
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
		assert.deepEqual(c.variables, ['@baz', '@a', '@a2', '@b', '@c1', '@c1_1', '@c2', '@c3', '@ext_var', '@ext_color']);		// TODO ext-mixin is not available!
		assert.deepEqual(c.mixins, ['.bar1', '.bar3', '.bar4', '.mx', '.mx(@aa)', '.mx.inner', '.mx2', '.foo', '.foo.bar1', '.foo.bar3', '.foo.bar4', '.color', '.props', '.ext-mixin']);

		c = compl('.color');
		assert.deepEqual(c.variables, ['@a', '@a2', '@b', '@c1', '@c1_1', '@c2', '@c3', '@ext_var', '@ext_color']);
		assert.deepEqual(c.mixins, ['.mx', '.mx(@aa)', '.mx.inner', '.mx2', '.foo', '.foo.bar1', '.foo.bar3', '.foo.bar4', '.color', '.props', '.ext-mixin']);

		c = compl('.mx(@aa: 2)');
		assert.deepEqual(c.variables, ['@a', '@a2', '@b', '@c1', '@c1_1', '@c2', '@c3', '@ext_var', '@ext_color', '@aa']);
		assert.deepEqual(c.mixins, ['.mx', '.mx(@aa)', '.mx.inner', '.mx2', '.foo', '.foo.bar1', '.foo.bar3', '.foo.bar4', '.color', '.props', '.ext-mixin']);
	});

	it('mixin call', function() {
		var analysis = analyze('stylesheet.less');
		var getMixins = function() {
			var rsource = analysis.getSource(arguments);
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
		assert.deepEqual(mixins[1].arguments, [['@aa', '2']]);
		assert.equal(output(mixins[0]), 'c:d;');
		assert.equal(output(mixins[1]), 'g:2;.foo .inner{h:3;}');

		var refNode = mixins[0].origin.toJSON();
		assert(refNode);
		assert.equal(refNode.name, '.mx');
		assert.equal(refNode.type, 'section');
	});

	it('variable suggest', function() {
		var analysis = analyze('stylesheet.less');
		var suggest = function() {
			var rsource = analysis.getSource(arguments);
			var suggestions = rsource && analysis.variableSuggest[rsource.id];
			if (suggestions) {
				return suggestions.map(function(s) {
					return s[0] + ': ' + s[1];
				});
			}
		};

		assert.deepEqual(suggest('.props', 'padding'), ['@a: 1px', '@a2: 10px - 9', '@ext_var: 1px']);
		assert.deepEqual(suggest('.color', 'v1'), undefined); // no completions
		assert.deepEqual(suggest('.color', 'v2'), ['@c1: #fc0', '@ext_color: #fc0', '@c1_1: #fb0']);
		assert.deepEqual(suggest('.color', 'v3'), ['@c3: darken(#fc0, 0.1)']);
	});

	it('computed values', function() {
		var analysis = analyze('stylesheet.less');
		var value = function() {
			var rsource = analysis.getSource(arguments);
			return rsource && analysis.computedValues[rsource.id];
		};

		assert.equal(value('@a'), '1px');
		assert.equal(value('@a2'), '1px');
		assert.equal(value('@b'), 'bar');
		assert.equal(value('@c1'), '#ffcc00');
		assert.equal(value('@c1_1'), '#ffbb00');
		assert.equal(value('@c2'), '#aaaaaa');
		assert.equal(value('@c3'), '#cca300');

		assert.equal(value('.mx', 'c'), 'd');
		assert.equal(value('.foo', 'padding'), '2px');
		assert.equal(value('.foo', '.bar2&', 'padding'), '5px');
	});

	it('completions & computed vars for empty result nodes', () => {
		let analysis = analyze('assets/completions.less');
		let completions = function() {
			var rsource = analysis.getSource(arguments);
			var cmpl = rsource && analysis.completions[rsource.id];
			if (cmpl) {
				return {
					variables: cmpl.variables,
					mixins: cmpl.mixins.map(function(mixin) {
						var args = mixin.arguments.map(a => a[0]);
						return mixin.name + (args.length ? '(' + args.join(', ') + ')' : '');
					})
				};
			}
		};

		let vars = function() {
			return completions.apply(null, arguments).variables;
		};

		let value = function() {
			var rsource = analysis.getSource(arguments);
			return rsource && analysis.computedValues[rsource.id];
		};

		assert.deepEqual(vars(), {
			'@v1': {raw: '1px', computed: '1px'}
		});
		assert.deepEqual(vars('a'), {
			'@v1': {raw: '1px', computed: '1px'},
			'@v2': {raw: '2px', 'computed': '2px'},
			'@v3': {raw: '@v1 + @v2', computed: '3px'}
		});
		assert.deepEqual(vars('a', 'b'), {
			'@v1': {raw: '100px', computed: '100px'},
			'@v2': {raw: '2px', computed: '2px'},
			'@v3': {raw: '@v1 + @v2', computed: '102px'}
		});

		assert.equal(value('a', '@v2'), '2px');
		assert.equal(value('a', '@v3'), '3px');
		assert.equal(value('a', 'b', 'c', 'padding'), '102px');
	});

	it('magic divide', () => {
		let analysis = analyze('assets/magic.less');

		let value = function() {
			var rsource = analysis.getSource(arguments);
			return rsource && analysis.computedValues[rsource.id];
		};

		assert.equal(value('body', 'font'), '14px/20px');
		assert.equal(value('body', 'foo'), '0.7px');
	});
});
