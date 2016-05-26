var fs = require('fs');
var path = require('path');
var assert = require('assert');
var analyze = require('../');
var livestyle = require('emmet-livestyle');

livestyle.logger.silent(true);

describe('SCSS analyzer', function() {
	var stylesheet = fs.readFileSync(path.join(__dirname, 'stylesheet.scss'), 'utf8');
	var analysis, source;

	// transformation is synchronous: no external dependencies
	var options = {
		uri: path.join(__dirname, 'stylesheet.scss'),
		syntax: 'scss',
		loader: function(deps, callback) {
			deps = deps.filter(function(dep) {
				return !/\/_\w+\.\w+$/.test(dep.uri);
			});

			callback(deps.map(function(dep) {
				return {
					uri: dep.uri,
					content: fs.readFileSync(dep.uri, 'utf8')
				};
			}));
		}
	};
	livestyle.resolve(stylesheet, options, function(err, tree) {
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

		assert.equal(ref('@mixin mx($a: 2)'), undefined); // mixins are not outputted
		assert.equal(ref('.foo', 'padding'), 'padding: 2px');
		assert.equal(ref('.foo', '&.bar3, &.bar4'), '.foo.bar3, .foo.bar4');
		assert.equal(ref('.foo', '#{$b}'), '.foo bar');
		assert.equal(ref('.foo', '@include mx'), undefined); // mixin calls are not outputted
	});

	it('selectors', function() {
		// shows resolved selectors for source nodes
		var sel = function(node) {
			var rsource = analysis.source.getByRef(getSource(arguments));
			return rsource ? analysis.selectors[rsource.id] : undefined;
		};

		assert.equal(sel('@mixin mx($a: 2)'), undefined);
		assert.equal(sel('.foo'), '.foo');
		assert.equal(sel('.foo', '.bar1'), '.foo .bar1');
		assert.equal(sel('.foo', '&.bar3, &.bar4'), '.foo.bar3, .foo.bar4');
		assert.equal(sel('.foo', '#{$b}'), '.foo bar');
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
		assert.deepEqual(c.variables, ['$ext_var', '$ext_color', '$a', '$a2', '$b', '$c1', '$c1_1', '$c2', '$c3', '$baz']);
		assert.deepEqual(c.mixins, ['ext-mixin', 'mx($a)', 'mx2']);

		c = compl('.color');
		assert.deepEqual(c.variables, ['$ext_var', '$ext_color', '$a', '$a2', '$b', '$c1', '$c1_1', '$c2', '$c3', '$baz']);
		assert.deepEqual(c.mixins, ['ext-mixin', 'mx($a)', 'mx2']);
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

		var mixins = getMixins('.foo', '@include');
		assert.equal(mixins.length, 1);
		assert.equal(mixins[0].name, 'mx');
		assert.deepEqual(mixins[0].arguments, [['$a', '2']]);
		assert.equal(output(mixins[0]), 'g:2;.foo .inner{h:3;}');

		var refNode = mixins[0].origin.toJSON(true);
		assert(refNode);
		assert.equal(refNode.name, '@mixin mx($a: 2)');
		assert.equal(refNode.type, 'section');
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

		assert.deepEqual(suggest('.props', 'padding'), ['$ext_var: 1px', '$a: 1px', '$a2: 10px - 9']);
		assert.deepEqual(suggest('.color', 'v1'), undefined); // no completions
		assert.deepEqual(suggest('.color', 'v2'), ['$ext_color: #fc0', '$c1: #fc0', '$c1_1: #fb0']);
		assert.deepEqual(suggest('.color', 'v3'), ['$c3: darken(#fc0, 0.1)']);
	});

	it('computed values', function() {
		var value = function() {
			var rsource = analysis.source.getByRef(getSource(arguments));
			return rsource && analysis.computedValues[rsource.id];
		};

		assert.equal(value('$a'), '1px');
		assert.equal(value('$a2'), '1px');
		assert.equal(value('$b'), 'bar');
		assert.equal(value('$c1'), '#ffcc00');
		assert.equal(value('$c1_1'), '#ffbb00');
		assert.equal(value('$c2'), '#aaaaaa');
		assert.equal(value('$c3'), '#cca300');

		assert.equal(value('.foo', 'padding'), '2px');
		assert.equal(value('bar2', 'a'), '3');
		assert.equal(value('bar2', 'b'), '3');
	});
});
