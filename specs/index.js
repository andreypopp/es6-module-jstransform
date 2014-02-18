var path      = require('path');
var fs        = require('fs');
var assert    = require('assert');
var transform = require('../index');

describe('es6-module-jstransform', function() {

  beforeEach(function() {
    transform.__resetModuleState();
  });

  fs.readdirSync(path.join(__dirname, 'cases')).forEach(function(p) {
    if (/\.result\.js$/.exec(p))
      return;

    p = path.join(__dirname, 'cases', p);

    it('transform ' + path.basename(p), function() {

      var code = fs.readFileSync(p, 'utf8');
      var result = fs.readFileSync(p.replace(/\.js$/, '.result.js'), 'utf8');
      assert.equal(transform(code).trim(), result.trim());
    });
  });
});
