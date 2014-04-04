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
  var specifier, name;
  utils.catchup(node.range[0], state);

  switch (node.kind) {

    // import "module"
    case undefined:
      utils.append('require(' + node.source.raw + ');', state);
      break;

    // import name from "module"
    case "default":
      specifier = node.specifiers[0];
      assert(specifier, "default import without specifier: " + node);
      name = specifier.name ? specifier.name.name : specifier.id.name;
      utils.append('var ' + name + ' = require(' + node.source.raw + ');', state);
      break;

    // import {name, one as other} from "module"
    case "named":
      var modID = genID('mod');
      utils.append('var ' + modID + ' = require(' + node.source.raw + ');\n', state);

      for (var i = 0, len = node.specifiers.length; i < len; i++) {
        specifier = node.specifiers[i];
        name = specifier.name ? specifier.name.name : specifier.id.name;
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
 *    export default;
 *    export DECLARATION
 *    export { name, one as other }
 */
function visitExportDeclaration(traverse, node, path, state) {
  var specifier, name, len, i;
  utils.catchup(node.range[0], state);

  if (node.declaration) {

    // export default = value
    if (Array.isArray(node.declaration)) {
      name = node.declaration[0].id.name;
      switch (name) {
        case 'default':
          utils.append('module.exports =', state);
          break;
        default:
          utils.append('module.exports.' + name + ' = ', state);
      }

      if (node.declaration[0].init) {
        // -1 compensates for an additional space after '=' token
        utils.move(node.declaration[0].init.range[0] - 1, state);
      } else {
        utils.move(node.range[1], state);
      }

    // export DECLARATION
    } else {
      switch (node.declaration.type) {
        // export var name = value
        case Syntax.VariableDeclaration:
          name = node.declaration.declarations[0].id.name;
          utils.append('var ' + name + ' = module.exports.' + name + ' = ', state);
          utils.move(node.declaration.declarations[0].init.range[0], state);
          break;
        case Syntax.FunctionDeclaration:
          name = node.declaration.id.name;
          utils.move(node.declaration.range[0], state);
          utils.catchup(node.declaration.range[1], state);
          utils.append('\nmodule.exports.' + name + ' = ' + name + ';', state);
          break;
        case Syntax.ClassDeclaration:
          name = node.declaration.id.name;
          utils.move(node.declaration.range[0], state);
          traverse(node.declaration, path, state);
          utils.append('module.exports.' + name + ' = ' + name + ';', state);
          break;
        default:
          assert(false, "unknown declaration: " + node.declaration.type);
      }
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
      for (i = 0, len = node.specifiers.length; i < len; i++) {
        specifier = node.specifiers[i];
        name = specifier.name ? specifier.name.name : specifier.id.name;
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
    for (i = 0, len = node.specifiers.length; i < len; i++) {
      specifier = node.specifiers[i];
      name = specifier.name ? specifier.name.name : specifier.id.name;
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

module.exports.__resetModuleState = function() { num = 0; };

module.exports.visitorList = [
  visitImportDeclaration,
  visitModuleDeclaration,
  visitExportDeclaration
];
