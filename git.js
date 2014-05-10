'use strict';

var exec = require('shelljs').exec
  , fuse = require('fusing');

/**
 * Create a human readable interface for interacting with the git binary that is
 * installed on the users host system. This allows us to interact with the git
 * in the given directory.
 *
 * The beauty of this system is that it allows human readable chaining:
 *
 * ```js
 * git().push('origin master');
 * ```
 *
 * @constructor
 * @api public
 */
function Git() {
 if (!(this instanceof Git)) return new Git();

 this.fuse();
}

fuse(Git);

exec('git help -a', {
  silent: true
}).output.split(/([\w|\-]+)\s{2,}/g).filter(function filter(line) {
  var trimmed = line.trim();

  //
  // Assume that every command is lowercase, this \w in the RegExp also includes
  // uppercase or mixed case strings. Which can actually capture $PATH\n in the
  // output. Additionally we need to remove all lines that still have spaces
  // after they're trimmed.
  //
  return trimmed.length
    && !~trimmed.indexOf(' ')
    && line === line.toLowerCase();
}).map(function map(line) {
  return line.trim();
}).forEach(function each(cmd) {
  //
  // Introduce each of the parsed commands as a readable method on the
  // prototype. If parameters are required.
  //
  Git.readable(cmd, function proxycmd(params, fn) {
    var git = 'git '+ cmd +' ';

    if ('function' === typeof params) fn = params;
    if ('string' === typeof params) git += params;

    return exec(git.trim(), { silent: true }, fn).output || '';
  });
});

//
// Expose the module.
//
module.exports = Git;