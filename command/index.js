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
 * Execute the various of execution steps of a given command.
 *
 * @param {Function} next Completion callback.
 * @api private
 */
CMD.readable('run', function run(next) {
  var steps = Object.keys(this.steps)
    , cmd = this;

  (function iterate(index) {
    var step = cmd.steps[steps[index++]];

    if (!step) return next();

    if (!step.length) {
      if (step.call(cmd) === false) return;
      return iterate(index);
    }

    step.call(cmd, function done(err) {
      if (err) return next(err);

      iterate(index);
    });
  }(0));
});

/**
 * Expose the `extract-github` module from the GitHulk project as function so we
 * can easily parse GitHub URLS.
 *
 * @type {Function}
 * @public
 */
CMD.readable('github', GitHulk.prototype.project);

/**
 * Expose the shelljs.
 *
 * @type {Function}
 * @public
 */
CMD.readable('shelly', shelly);

/**
 * A simple interface for the git api which allows sync as well as async
 * invocation.
 *
 * @type {Function}
 * @public
 */
CMD.readable('git', require('../git'));

//
// Expose the module.
//
module.exports = CMD;
