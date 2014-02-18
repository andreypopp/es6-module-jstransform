'use strict';

var jstransform = require('jstransform');
var visitors    = require('./visitors');

function transform(code, options, visitorList) {
  visitorList = visitors.visitorList.concat(visitorList || []);
  return jstransform.transform(visitorList, code, options);
}

module.exports = transform;
module.exports.__resetModuleState = visitors.__resetModuleState;
