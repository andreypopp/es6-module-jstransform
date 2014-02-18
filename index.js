'use strict';

var jstransform = require('jstransform');
var visitors    = require('./visitors');

function transform(code) {
  return jstransform.transform(visitors.visitorList, code).code;
}

module.exports = transform;
module.exports.__resetModuleState = visitors.__resetModuleState;
