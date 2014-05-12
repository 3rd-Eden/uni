'use strict';

var Uni = require('../../')
  , path = require('path')
  , fs = require('fs');

var Clone = module.exports = Uni.Command.extend({
  /**
   * Description of command. Which is in this case an improved version of
   * `git clone` which automatically install and initialize all the things.
   *
   * @type {String}
   * @public
   */
  description: 'clone and initialize a git repository',

  steps: {
    //
    // Step 1: Figure out the URL to the git repository that we need to clone.
    // We want to accept multiple formats:
    //
    // - uni clone [protocol]://    : Clone the given URL
    // - uni clone user/repository  : Tranform to GitHub URL.
    // - uni clone user             : Clone every repo of the user/org from GitHub.
    //
    url: function url(next) {
      if (this.url) return next();

      this.url = this.uni.flag.argv.shift();

      //
      // If the URL contains :/, @, or .git we assume that it doesn't require
      // any further parsing.
      //
      if (
           ~this.url.indexOf(':/')
        || ~this.url.indexOf('@')
        || ~this.url.indexOf('.git')
      ) return next();

      //
      // Simply assume that we're given a <user>/<repo> combination and that it
      // needs to be transformed in to a proper git url that can be used for
      // cloning.
      //
      if (this.url.split('/').length === 2) {
        this.url = this.replace(
          this.uni.conf.get('github-clone'),
          this.githulk.project(this.url)
        );

        return next();
      }

      var command = this
        , uni = this.uni;

      this.githulk.repository.list(this.url, function list(err, repos) {
        if (err) return next.end(err);

        command.each(repos, function each(repo, next) {
          if (fs.existsSync(path.join(uni.cwd, repo.name))) return next();

          var clone = new Clone(command.uni);

          //
          // Set the correct clone URL for this command so we can bypass this
          // whole URL check and start cloning URL's directly.
          //
          clone.url = repo.clone_url;
          clone.run(next);
        }, next.end);
      });
    },

    //
    // Step 2: Clone the git repository so we got something to initialize.
    //
    clone: function clone() {
      this.git().clone([this.url].concat(this.uni.flag.argv).join(' ').trim());
    },

    //
    // Step 3: Automatically install and initialize all submodules in a given
    // repository.
    //
    submodule: function submodule() {
      var project = this.githulk.project(this.url);

      this.shelly.pushd(project.repo);
      this.git().submodule('update --init --recursive');
      this.shelly.popd();
    },

    //
    // Step 4: Detect if there's a `package.json` in the directory and install
    // the dependencies.
    //
    install: function npm() {
      var project = this.githulk.project(this.url)
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
    }
  },

  /**
   * The URL that we need to clone and initialize.
   *
   * @type {String}
   * @public
   */
  url: ''
});
