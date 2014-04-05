var x = module.exports.x = 13;

function x() {
  return 13;
} module.exports.x = x;

function A(){"use strict";}
  A.prototype.foo=function() {"use strict";};
module.exports.A = A;

function x() {
  function A(){"use strict";}
    A.prototype.foo=function() {"use strict";};
  
} module.exports.x = x;
