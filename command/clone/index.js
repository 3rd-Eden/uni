'use strict';

var Uni = require('../../')
  , path = require('path');

module.exports = Uni.Command.extend({
  /**
   * Description of command. Which is in this case an improved version of
   * `git clone` which automatically install and initialize all the things.
   *
   * @type {String}
   * @public
   */
  description: 'Clone and initialise a git repository',

  steps: {
    //
    // Step 1: Clone the git repository so we got something to initialize.
    //
    clone: function clone() {
      this.git().clone(this.uni.flag.argv.join(' '));
    },

    //
    // Step 2: Detect if there's a `package.json` in the directory and install
    // the dependencies.
    //
    npm: function npm() {
      var project = this.github(this.uni.flag.argv[0])
        , directory = path.join(this.uni.cwd, project.repo)
        , json;

      //
      // The require method throws an error if the given file does not exist.
      // This way we automatically know that there isn't a package.json file
      // in the give repository. So we don't have to continue with the
      // installation process.
      //
      try { json = require(path.join(directory, 'package.json')); }
      catch (e) { return; }

      this.shelly.pushd(project.repo);
      this.shelly.exec('npm install', { silent: true });
      this.shelly.popd();
    },

    //
    // Step 3: Automatically install and initialize all submodules in a given
    // repository.
    //
    submodule: function submodule() {
      var project = this.github(this.uni.flag.argv[0]);

      this.shelly.pushd(project.repo);
      this.git().submodule('update --init --recursive');
      this.shelly.popd();
    }
  }
});
