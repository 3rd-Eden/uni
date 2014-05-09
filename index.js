'use strict';

var arg = process.argv.slice(2)
  , fuse = require('fusing')
  , argh = require('argh')
  , path = require('path')
  , fs = require('fs');

/**
 * An universal integration of GitHub, Git, Node and npm.
 *
 * @constructor
 * @public
 */
function Uni() {
  if (!(this instanceof Uni)) return new Uni();

  this.fuse();
  this[this.command]();
}

fuse(Uni, require('eventemitter3'));

/**
 * Expose our Command class, this needs to be done before we include and parse
 * the commands or the Uni.Command won't be exposed.
 *
 * @constructor
 * @type {Function}
 * @public
 */
Uni.Command = Uni.CMD = require('./command');

/**
 * The command that needs to be executed.
 *
 * @type {String}
 * @public
 */
Uni.readable('command', arg.length ? arg.shift() : 'create');

/**
 * The command line flags for our given commands.
 *
 * @type {Object}
 * @public
 */
Uni.readable('flag', argh(arg));

/**
 * The current working directory on where are are executing.
 *
 * @type {String}
 * @public
 */
Uni.readable('cwd', process.cwd());

/**
 * The different commands that are supported by our command line interface.
 * These are also automatically exposed as API methods.
 *
 * @type {Array}
 * @public
 */
var commands = path.join(__dirname, 'command');
Uni.readable('commands', fs.readdirSync(commands).filter(function filter(folder) {
  return fs.statSync(path.join(commands, folder)).isDirectory();
}).map(function map(folder) {
  var name = folder.toLowerCase();

  //
  // Also introduce these commands as API methods directly on to the Uni
  // prototype so we can also use it as programmable API.
  //
  Uni.readable(name, function factory() {
  factory.Command = factory.Command || require('./command/'+ folder);

    var command = new factory.Command(this);
    return command.run(function run() {
      console.log('');
    });
  });

  return name;
}));

//
// Expose the module.
//
module.exports = Uni;
