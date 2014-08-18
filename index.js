'use strict';

var LocalStorage = require('./localstorage')
  , arg = process.argv.slice(2)
  , fuse = require('fusing')
  , argh = require('argh')
  , path = require('path')
  , fs = require('fs')
  , args = argh(arg);

//
// Bump max-sockets to something more sane.
//
require('https').globalAgent.maxSockets =
 require('http').globalAgent.maxSockets = 100;

/**
 * An universal integration of GitHub, Git, Node and npm.
 *
 * @constructor
 * @param {String} name Optional name we should use.
 * @public
 */
function Uni(name) {
  if (!(this instanceof Uni)) return new Uni(name);

  this.fuse();
  this.readable('conf', new LocalStorage(name || 'uni'));
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
Uni.writable('command', args.argv ? args.argv.shift() : 'help');

/**
 * The command line flags for our given commands.
 *
 * @type {Object}
 * @public
 */
Uni.readable('flag', args);

/**
 * Shortcut for `uni.flag.argv`
 *
 * @type {Array}
 * @public
 */
Uni.readable('argv', args.argv || []);

/**
 * The current working directory on where are are executing.
 *
 * @type {String}
 * @public
 */
Uni.writable('cwd', process.cwd());

/**
 * The command line switches/flags that all commands responding to. Listed as
 * flag->description / key->value.
 *
 * @type {Object}
 * @public
 */
Uni.readable('flags', {
  '--silence': 'Completely silence the stdout output',
  '--help': 'Displays help information for a given command'
});

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

  /**
   * Run the given command.
   *
   * @param {Mixed} arg Optional first argument.
   * @api private
   */
  function factory(arg) {
    factory.Command = factory.Command || require('./command/'+ folder);

    //
    // Add a name if does not exist. Just to make sure everything is properly
    // named.
    //
    if (!factory.Command.prototype.name) factory.Command.prototype.name = folder;

    var command = new factory.Command(this, arg);

    return command.run(function run() {
      console.log('');
    });
  }

  //
  // Override the name for better stack traces so we know which `uni` command it
  // originates from.
  //
  factory.name = factory.displayName = name;

  //
  // Add a flags and description property to the factory so we can read the
  // these values from the prototype.
  //
  ['description', 'flags'].forEach(function proxy(property) {
    Object.defineProperty(factory, property, {
      get: function get() {
        factory.Command = factory.Command || require('./command/'+ folder);

        return factory.Command.prototype[property];
      }
    });
  });

  //
  // Also introduce these commands as API methods directly on to the Uni
  // prototype so we can also use it as programmable API.
  //
  Uni.readable(name, factory);

  return name;
}));

/**
 * Execute the command.
 *
 * @api private
 */
Uni.readable('run', function run() {
  if (!this.command && this.flag.help) this.command = 'help';
  if (~this.commands.indexOf(this.command)) return this[this.command]();

  var natural = require('natural')
    , uni = this
    , command;

  [
      natural.SoundEx,
      natural.Metaphone,
      natural.DoubleMetaphone
  ].some(function some(phonetics) {
    uni.commands.some(function some(cmd) {
      if (phonetics.compare(uni.command, cmd)) {
        command = cmd;
        return true;
      }

      return false;
    });

    return !!command;
  });

  //
  // We've found a match through phonetics, it was most likely a typo so we're
  // going to process it anyways.
  //
  if (command) return this[command]();

  var npm = require('./npm')
    , git = require('./git');

  //
  // Check if we can somehow proxy the command to git or npm.
  //
  if (~npm.commands.indexOf(uni.command)) return npm.proxy(this);
  if (~git.commands.indexOf(uni.command)) return git.proxy(this);

  //
  // 404 Command not Found.
  //
  this.help(404);
});

//
// Expose the module.
//
module.exports = Uni;
