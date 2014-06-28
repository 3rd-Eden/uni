'use strict';

var Uni = require('../../')
  , path = require('path')
  , fs = require('fs');

module.exports = Uni.Command.extend({
  /**
   * Name of the command.
   *
   * @type {String}
   * @public
   */
  name: 'each',

  /**
   * Description of the command. Which is executing a command for each folder.
   *
   * @type {String}
   * @public
   */
  description: 'execute commands for each folder',

  /**
   * Command usage information.
   *
   * @type {String}
   * @public
   */
  usage: 'uni each [flags] -- [command]',

  /**
   * The command line switches/flags that this command is responding to. Listed
   * as flag->description / key->value. These flags are pre-build iterations
   * that could be useful for others.
   *
   * @type {Object}
   * @public
   */
  flags: {
    '--sync': 'check if each given git repository is up to date',
    '--changes': 'check if each git repository has any unstaged changes',
    '--git': 'only execute the given command on git repositories'
  },

  steps: {
    //
    // Step 1: Check if we we're given an command that we should execute on each
    // given directory.
    //
    execute: function execute(next) {
      if (!this.uni.argv.length) return next();

      var run = this.uni.argv.join(' ');

      this.iterate({ git: this.uni.flag.git }, function folder(location, next) {
        this.shelly.exec(run, { silent: !!this.uni.flag.silence }, next);
      }, next);
    },

    //
    // Step 2: Check if all the repositories are in sync with their upstream
    // branches when the --sync flag is used.
    //
    sync: function sync(next) {
      if (!this.uni.flag.sync) return next();

      this.iterate({ git: true }, function folder(location, next) {
        var ref = (this.git().symbolicRef('HEAD') || this.git().revParse('--short HEAD')).trim();
        next();
      }, next);
    },

    //
    // Step 3: Check if there are any changes in the directory when the
    // --changes flag has been used.
    //
    changes: function changes(next) {
      if (!this.uni.flag.changes) return next();

      this.iterate({ git: true }, function folder(location, next) {
        var ref = (this.git().symbolicRef('HEAD') || this.git().revParse('--short HEAD')).trim()
          , ahead = this.git().log('origin/'+ ref.split('/').pop() +'..HEAD')
          , status = this.git().status('--porcelain');

        if (status) console.log(location.dir, 'has unstaged changes');
        if (ahead) console.log(location.dir, 'is a head of remote', ahead.split('\n').shift().trim());

        next();
      }, next);
    }
  },

  /**
   * Iterate over all folders.
   *
   * Options:
   * - `git`: Require that the folders we iterate have a .git folder
   *
   * @param {Object} options
   * @param {Function} fn Iterating function.
   * @param {Function} done Completion callback
   * @api private
   */
  iterate: function iterate(options, fn, done) {
    var uni = this.uni
      , command = this
      , cwd = uni.cwd;

    if ('function' === typeof options) {
      done = fn;
      fn = options;
      options = null;
    }

    //
    // Try to cache the directory lookup for the current directory as we might
    // be iterating over it multiple times.
    //
    var dirs = this.dirs = !this.dirs.length
      ? fs.readdirSync(this.uni.cwd)
      : this.dirs;

    options = options || {};

    (function each(index) {
      //
      // Reset the current working directory for each iteration so we have
      // a clean state to begin with.
      //
      command.shelly.cd(uni.cwd = cwd);

      var dir = dirs[index++]
        , full;

      if (!dir) return done();

      full = path.join(uni.cwd, dir);

      if (
           options.git
        && (
             !fs.existsSync(path.join(full, '.git'))
          || !fs.statSync(path.join(full, '.git')).isDirectory()
        )
      ) return each(index);

      command.shelly.cd(uni.cwd = full);

      fn.call(command, { full: full, dir: dir }, function next(err) {
        if (err) {
          command.shelly.cd(uni.cwd = cwd);
          return done(err);
        }

        each(index);
      });
    }(0));
  },

  /**
   * Cached listing of directories.
   *
   * @type {Array}
   * @private
   */
  dirs: []
});
