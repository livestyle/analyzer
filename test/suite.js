var analyze = require('../');
var livestyle = require('emmet-livestyle');
livestyle.logger.silent(true);

describe('LiveStyle Analyzer', function() {
	it('test', function(done) {
		livestyle.resolve('a{ b{ c:d; } }', {syntax: 'less'}, function(err, tree) {
			var result = analyze(tree);

			console.log('Source', result.source.children);
			console.log('Result', result.result.children);
			console.log('References', result.references);
			done();
		});
	});
});