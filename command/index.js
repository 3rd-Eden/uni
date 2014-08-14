'use strict';

var Registry = require('npm-registry')
  , dot = require('dot-component')
  , inquirer = require('inquirer')
  , GitHulk = require('githulk')
  , shelly = require('shelljs')
  , kuler = require('kuler')
  , fuse = require('fusing')
  , npm = require('../npm')
  , git = require('../git')
  , path = require('path')
  , fs = require('fs');

/**
 * The representation of a single CLI command. The CLI command will execute
 * various of execution steps in order to complete it's given task.
 *
 * @constructor
 * @param {Uni} uni Uni instance that used this command.
 * @param {Mixed} options Optional options.
 * @api public
 */
function CMD(uni, options) {
  if (!(this instanceof CMD)) return new CMD(uni, options);

  this.fuse();

  //
  // Create a pre-bound git and npm constructor so they have access to the `uni`
  // instance and can access our uni and the configuration.
  //
  this.git = git.bind(git, uni);
  this.npm = npm.bind(npm, uni);

  this.uni = uni;

  this.githulk = new GitHulk({
    token: uni.conf.get('token')
  });

  this.registry = new Registry({
    registry: uni.conf.get('registry') || Registry.mirrors.nodejitsu,
    username: uni.conf.get('username'),
    password: uni.conf.get('password'),
    githulk: this.githulk
  });

  if (options) {
    this.options = options || this.options;
  }

  CMD.use.at(this);
}

fuse(CMD);

/**
 * The different execution stages that are required to complete the command.
 *
 * @type {Object}
 * @public
 */
CMD.writable('steps', {});

/**
 * Expose the shelljs, but we've pre-silenced it so it doesn't output any
 * pointless information while we do our magic.
 *
 * @type {Function}
 * @public
 */
shelly.config.silent = true;
CMD.readable('shelly', shelly);

/**
 * Expose the CLI/promper
 *
 * @type {Function}
 * @public
 */
CMD.readable('cli', inquirer);

/**
 * Execute the various of execution steps of a given command.
 *
 * @param {Function} fn Completion callback.
 * @returns {CMD}
 * @api private
 */
CMD.readable('run', function run(fn) {
  var steps = Object.keys(this.steps)
    , cmd = this;

  //
  // Hold on your horses! We've got a --help flag so we shouldn't execute the
  // command but display the help information instead.
  //
  if (this.uni.flag.help) return this.help();

  (function iterate(index) {
    var step = cmd.steps[steps[index++]];

    if (!step) return fn();

    if (!step.length) {
      if (step.call(cmd) === false) return;
      return iterate(index);
    }

    /**
     * Callback for async steps. This callback also exposes the completion
     * callback so a step can bailout of the iteration process so other steps
     * will not be triggered.
     *
     * @param {Error} err Optional error first argument.
     * @api private
     */
    function next(err) {
      delete next.end;
      if (err) return fn(err);

      iterate(index);
    }

    next.end = fn;

    step.call(cmd, next);
  }(0));

  return this;
});

/**
 * Replace {template} tags in the given template using the supplied data object.
 *
 * @param {String} template Template with {placeholders}
 * @param {Object} data Template data with keys mapped to placeholders.
 * @returns {String} Compiled template
 * @api public
 */
CMD.readable('replace', function replace(template, data) {
  var key;

  while (key = /{[^{]+?}/gm.exec(template)) {
    key = key[0];
    template = template.replace(key, dot.get(data, key.slice(1, -1)));
  }

  return template;
});

/**
 * Async iterate over the given array.
 *
 * @param {Array} array Array of items to iterate over.
 * @param {Function} process The function that processes items.
 * @param {Function} fn Completion callback
 * @returns {CMD}
 * @api public
 */
CMD.readable('each', function each(array, process, fn) {
  var expected = array.length
    , processed = 0;

  /**
   * Prevents double invocation of the callback function.
   *
   * @param {Error} err Optional error first argument.
   * @param {Mixed} data Result of some sort.
   * @api private
   */
  function once(err, data) {
    if (fn) fn(err, data);

    fn = null;
  }

  array.forEach(function forEach(item) {
    /**
     * Simple callback processor. If there's an error we immediately call the
     * callback. Please note that this does not stop any processing that has
     * been done on the other items.
     *
     * @param {Error} err Optional error argument
     * @api private
     */
    function next(err) {
      if (err) return once(err);
      if (++processed === expected) once();
    }

    next.end = once;
    process(item, next);
  });

  return this;
});

/**
 * Write things to STDOUT.
 *
 * @param {String} line Line to log
 * @returns {CMD}
 * @api public
 */
CMD.readable('log', function log(line) {
  if (!this.uni.flag.silence) console.log(line);
});

/**
 * Calculate the maximum length of the items, we need to know this so we
 * can properly align and space the values.
 *
 * @param {Array} arr The array with items we should should scan
 * @returns {Number} Max length
 */
CMD.readable('max', function max(arr) {
  return Math.max.apply(Math, arr.map(function map(value) {
    return (value).toString().length;
  }));
});

/**
 * Display help information that we can find
 *
 * @returns {CMD}
 * @api public
 */
CMD.readable('help', function halp() {
  var flags = this.merge(this.flags, this.uni.flags)
    , max = this.max(Object.keys(flags)) + 4
    , uni = this
    , help = [];

  help.push(this.description[0].toUpperCase() + this.description.slice(1) +'.');
  help.push('');
  help.push(this.usage || 'Usage: uni '+ this.uni.command +' [flags]');
  help.push('');
  help.push('Flags:');

  help.push.apply(help, Object.keys(flags).map(function each(cmd) {
    var description = flags[cmd];

    return '  '+ cmd + (new Array(max - cmd.length).join(' ')) + description;
  }));

  this.logo();
  this.log(help.join('\n'));
});

/**
 * Output the ASCII logo of uni.
 *
 * @api public
 */
CMD.readable('logo', function logo() {
  var lines = [
      ''
    , kuler(' _   _ _ __  _ ', '#00FF96')
    , kuler('| | | | \\_ \\| |', '#00FF96') + '    © 2014 Arnout Kazemier'
    , kuler('| |_| | | | | |', '#00FF96')   + '    All Rights Reserved - github.com/3rd-Eden/uni'
    , kuler(' \\__,_|_| |_|_|', '#00FF96')
    , ''
  ].map(function each(line) {
    if (!line.length) return '';
    return '    '+ kuler(line, '#00FF96');
  });

  this.log(lines.join('\n'));
});

/**
 * Figure out which repositories we need to return. In GitHub there is no way
 * of figuring out if a name is a user or organization and they all require
 * different API calls.
 *
 * @param {String} name The name of the user/organization we need to list.
 * @param {Function} fn Completion callback.
 * @api private
 */
CMD.readable('repositories', function repositories(name, fn) {
  var githulk = this.githulk;

  githulk.repository.list(name, { organization: true }, function list(err, repos) {
    if (!err) return fn(err, repos);

    githulk.repository.list(name, fn);
  });
});

/**
 * Add a new plugin to the commands.
 *
 * @param {String} name Name of the plugin.
 * @param {String} command List of commands we should add these plugins to.
 * @param {Function} fn Plugin callback.
 * @api public
 */
CMD.use = function use(name, command, fn) {
  if ('function' === typeof command) {
    fn = command;
    command = '*';
  }

  //
  // Prevent duplicate plugins, not like this would ever happen, but still
  // a good way to warn people about their fuck-ups.
  //
  if (name in CMD.plugins) {
    throw new Error('We already have a plugin registerd under `'+ name +'`');
  }

  CMD.plugins[name] = {
    regexp: new RegExp('^'+ command.replace('*', '.*?') +'$'),
    plugin: fn
  };

  return CMD;
};

/**
 * The actual plugin registry.
 *
 * @type {Object}
 * @private
 */
CMD.plugins = Object.create(null);

/**
 * Load the different plugins.
 *
 * @type {Object} name -> plugin
 * @public
 */
var plugins = path.join(__dirname, '..', 'plugins');
fs.readdirSync(plugins).filter(function filter(name) {
  return name.slice(-3) === '.js';
}).forEach(function each(name) {
  CMD.use(name.slice(0, -3), require(path.join(plugins, name)));
});

/**
 * Execute the plugins for the given command.
 *
 * @param {Command} cmd The command that might need plugins.
 * @api private
 */
CMD.use.at = function at(cmd) {
  Object.keys(CMD.plugins).filter(function filter(name) {
    return CMD.plugins[name].regexp.test(cmd.name);
  }).forEach(function each(name) {
    CMD.plugins[name].plugin(cmd);
  });

  return CMD;
};

//
// Expose the module.
//
module.exports = CMD;
