'use strict';

var Registry = require('npm-registry')
  , GitHulk = require('githulk')
  , shelly = require('shelljs')
  , fuse = require('fusing');

/**
 * The representation of a single CLI command. The CLI command will execute
 * various of execution steps in order to complete it's given task.
 *
 * @constructor
 * @param {Uni} uni Uni instance that used this command.
 * @api public
 */
function CMD(uni) {
  if (!(this instanceof CMD)) return new CMD(uni);

  this.fuse();

  this.uni = uni;
  this.githulk = new GitHulk({
    token: uni.conf.get('token') || process.env.GITHUB || process.env.GITHULK
  });
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
 * A simple interface for the git api which allows sync as well as async
 * invocation.
 *
 * @type {Function}
 * @public
 */
CMD.readable('git', require('../git'));

/**
 * Execute the various of execution steps of a given command.
 *
 * @param {Function} fn Completion callback.
 * @api private
 */
CMD.readable('run', function run(fn) {
  var steps = Object.keys(this.steps)
    , cmd = this;

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
  Object.keys(data).forEach(function each(key) {
    template = template.replace(new RegExp('{'+ key +'}', 'g'), data[key]);
  });

  return template;
});

//
// Expose the module.
//
module.exports = CMD;
