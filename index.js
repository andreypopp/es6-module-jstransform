'use strict';

var assert  = require('assert');
var Syntax  = require('esprima-fb').Syntax;
var utils   = require('jstransform/src/utils');

/**
 * Visit ImportDeclaration.
 *
 * Examples:
 *
 *    import "module"
 *    import name from "module"
 *    import { name, one as other } from "module"
 */
function visitImportDeclaration(traverse, node, path, state) {
  utils.catchup(node.range[0], state);

  switch (node.kind) {

    // import "module"
    case undefined:
      utils.append('require(' + node.source.raw + ');', state);
      break;

    // import name from "module"
    case "default":
      var specifier = node.specifiers[0];
      assert(specifier, "default import without specifier: " + node);
      var name = specifier.id.name;
      utils.append('var ' + name + ' = require(' + node.source.raw + ').' + name + ';', state);
      break;

    // import {name, one as other} from "module"
    case "named":
      var modID = genID('mod');
      utils.append('var ' + modID + ' = require(' + node.source.raw + ');\n', state);

      for (var i = 0, len = node.specifiers.length; i < len; i++) {
        var specifier = node.specifiers[i];
        var name = specifier.name ? specifier.name.name : specifier.id.name;
        utils.append('var ' + name + ' = ' + modID + '.' + specifier.id.name + ';', state);
        if (i !== len - 1) {
          utils.append('\n', state);
        }
      }

      break;

    default:
      assert(false, "don't know how to transform: " + node.kind);
  }

  utils.move(node.range[1], state);
  return false;
}

visitImportDeclaration.test = function(node, path, state) {
  return node.type === Syntax.ImportDeclaration;
};

/**
 * Visit ExportDeclaration.
 *
 * Examples:
 *
 *    export default = value
 *    export var name = value
 *    export { name, one as other }
 */
function visitExportDeclaration(traverse, node, path, state) {
  utils.catchup(node.range[0], state);

  if (node.declaration) {

    // export default = value
    if (Array.isArray(node.declaration)) {
      var name = node.declaration[0].id.name;
      switch (name) {
        case 'default':
          utils.append('module.exports = ', state);
          break;
        default:
          utils.append('module.exports.' + name + ' = ', state);
      }
      utils.move(node.declaration[0].init.range[0], state);

    // export var name = value
    } else {
      var name = node.declaration.declarations[0].id.name;
      utils.append('var ' + name + ' = module.exports.' + name + ' = ', state);
      utils.move(node.declaration.declarations[0].init.range[0], state);
    }

  } else if (node.source) {

    var modID = genID('mod');
    utils.append('var ' + modID + ' = require(' + node.source.raw + ');\n', state);

    // export * from "module"
    if (node.specifiers.length === 1 &&
        node.specifiers[0].type === Syntax.ExportBatchSpecifier) {
      var keyID = genID('key');
      utils.append(
        'for (var ' + keyID + ' in ' + modID + ') ' +
        'module.exports[' + keyID + '] = ' + modID + '[' + keyID + '];',
        state
      );

    // export {name, one as other} from "module"
    } else {
      for (var i = 0, len = node.specifiers.length; i < len; i++) {
        var specifier = node.specifiers[i];
        var name = specifier.name ? specifier.name.name : specifier.id.name;
        utils.append(
          'module.exports.' + name + ' = ' + modID +
          '.' + specifier.id.name + ';',
          state
        );
        if (i !== len - 1) {
          utils.append('\n', state);
        }
      }
    }
    utils.move(node.range[1], state);

  } else if (node.specifiers) {

    // export { name, one as other }
    for (var i = 0, len = node.specifiers.length; i < len; i++) {
      var specifier = node.specifiers[i];
      var name = specifier.name ? specifier.name.name : specifier.id.name;
      utils.append('module.exports.' + name + ' = ' + specifier.id.name + ';', state);
      if (i !== len - 1) {
        utils.append('\n', state);
      }
    }
    utils.move(node.range[1], state);

  } else {

    assert(false, "don't know how to compile export declaration");
  }

  return false;
}

visitExportDeclaration.test = function(node, path, state) {
  return node.type === Syntax.ExportDeclaration;
};

/**
 * Visit ModuleDeclaration.
 *
 * Example:
 *
 *    module name from "module"
 */
function visitModuleDeclaration(traverse, node, path, state) {
  utils.catchup(node.range[0], state);
  utils.append('var ' + node.id.name + ' = require(' + node.source.raw + ');', state);
  utils.move(node.range[1], state);
  return false;
}

visitModuleDeclaration.test = function(node, path, state) {
  return node.type === Syntax.ModuleDeclaration;
};

var num = 0;

/**
 * Generate unique identifier with a given prefix.
 *
 * @private
 */
function genID(prefix) {
  return prefix + '$' + (num++);
}

module.exports.visitorList = [
  visitImportDeclaration,
  visitModuleDeclaration,
  visitExportDeclaration
];
