'use strict';

var exec = require('shelljs').exec
  , fuse = require('fusing');

/**
 * Create a human readable interface for interacting with the npm binary that is
 * installed on the host system. This allows us to interact with the npm in the
 * given directory.
 *
 * The beauty of this system is that it allows human readable chaining:
 *
 * ```js
 * ```
 *
 * @constructor
 * @param {Uni} uni Uni instance
 * @api public
 */
function NPM(uni) {
  if (!(this instanceof NPM)) return new NPM(uni);

  this.uni = uni;
  this.fuse();
}

fuse(NPM);

var x = exec('npm -l', {
  silent: true
}).output.split(/[\n|\r]/).map(function map(line) {
  line = (/^\s{4}([\w|\-]+)\s/g.exec(line) || [''])[0].trim();

  return line;
}).filter(Boolean).forEach(function each(cmd) {
  var method = cmd
    , index;

  //
  // Some these methods contain dashes, it's a pain to write git()['symbolic-ref']
  // so we're transforming these cases to JS compatible method name.
  //
  while (~(index = method.indexOf('-'))) {
    method = [
      method.slice(0, index),
      method.slice(index + 1, index + 2).toUpperCase(),
      method.slice(index + 2)
    ].join('');
  }

  NPM.readable(method, function proxycmd(params, fn) {
    var npm = 'npm '+ cmd +' --always-auth --no-strict-ssl'
      , uni = this.uni;

    //
    // Add default CLI flags to the command.
    //
    if (uni.conf.get('username')) {
      npm +='--username '+ uni.conf.get('username') +' ';
    }

    if (uni.conf.get('password')) {
      npm +='--password '+ uni.conf.get('password') +' ';
    }

    if (uni.conf.get('registry')) {
      npm +='--registry '+ uni.conf.get('registry') +' ';
    }

    if ('function' === typeof params) fn = params;
    if ('string' === typeof params) npm += params;

    return exec(npm.trim(), { silent: true }, fn).output || '';
  });
});

//
// Expose the module.
//
module.exports = NPM;
