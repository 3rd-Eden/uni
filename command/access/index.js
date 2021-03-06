'use strict';

var async = require('async')
  , Uni = require('../../')
  , path = require('path')
  , fs = require('fs');

var Clone = module.exports = Uni.Command.extend({
  /**
   * Name of the command.
   *
   * @type {String}
   * @public
   */
  name: 'access',

  /**
   * Description of command. Which is in this case an improved version of
   * `git clone` which automatically install and initialize all the things.
   *
   * @type {String}
   * @public
   */
  description: 'Keep your npm packages access in sync with your github collaborators',

  /**
   * Command usage information.
   *
   * @type {String}
   * @public
   */
  usage: 'uni access [flags] <username>/<repo>',

  /**
   * The command line switches/flags that this command is responding to. Listed
   * as flag->description / key->value. These flags are pre-build iterations
   * that could be useful for others.
   *
   * @type {Object}
   * @public
   */
  flags: {
    '--team': 'Don\'t sync the repo collaborators but sync an organization team',
    '--from': 'Get module names from an npm account instead of GitHub',
    '--remove': 'Remove a single collaborator to the project',
    '--add': 'Add a single collaborator to the project'
  },

  steps: {
    //
    // Step 1: Find the module names, if none is given steal it from the github
    // repositories.
    //
    name: function names(next) {
      var github = this.githulk.project(this.uni.argv[0])
        , cmd = this;

      //
      // uni access --from V1 --add v1
      //
      if (this.uni.flag.from) {
        return this.registry.users.list(this.uni.flag.from, function list(err, names) {
          if (err) return next(err);

          names.forEach(function each(pkg) {
            cmd.packages[pkg.name] = {
              name: pkg.name
            };
          });

          return next();
        });
      }

      //
      // uni access foo/bar npmname
      //
      if (this.uni.argv[1]) {
        this.packages[github.project || this.uni.argv[1]] = {
          name: this.uni.argv[1]
        };

        return next();
      }

      //
      // No known packages that should be synced.
      //
      this.projects(github, function list(err, projects) {
        if (err) return next(err);

        async.each(projects, function each(project, next) {
          cmd.githulk.repository.raw(github.user +'/'+ project, {
            path: 'package.json'
          }, function raw(err, content) {
            if (err) return next(err);

            try { content = JSON.parse(content); }
            catch(e) { return next(e); }

            cmd.packages[project] = {
              name: content.name
            };

            next();
          });
        }, next);
      });
    },

    //
    // Step 2: Let's get our collaborators
    //
    collaborators: function collaborators(next) {
      var single = this.uni.flag.add || this.uni.flag.remove
        , github = this.githulk.project(this.uni.argv[0])
        , cmd = this;

      //
      // We only have to sync one user account, not multiple so we can add them
      // straight away
      //
      if (single) {
        Object.keys(cmd.packages).forEach(function each(name) {
          cmd.packages[name].users = [single];
        });

        return next();
      }

      //
      // We either need to sync all the collaborators of the github repository
      // with the npm package
      //
      if (!this.uni.flag.team) {
        return async.each(Object.keys(this.packages), function each(name, next) {
          cmd.githulk.collaborators.get(github.user +'/'+ name, function list(err, collab) {
            if (err) return next(err);

            cmd.packages[name].users = collab.map(function map(user) {
              return user.login;
            });

            next();
          });
        }, next);
      }

      this.githulk.teams.members(github.user +'/'+ this.uni.flag.team, function list(err, members) {
        if (err) return next(err);

        var users = members.map(function map(user) {
          return user.login;
        });

        Object.keys(cmd.packages).forEach(function each(name) {
          cmd.packages[name].users = users.slice(0);
        });

        next();
      });
    },

    //
    // Step 3: Resolve the user names to their npm equiv.
    //
    resolve: function resolve(next) {
      var single = this.uni.flag.add || this.uni.flag.remove
        , confirmed = {}
        , cmd = this;

      //
      // Manual entry, assume name is already valid.
      //
      if (single) return next();

      async.eachSeries(Object.keys(this.packages), function each(name, next) {
        var users = cmd.packages[name].users;

        async.map(users, function process(github, fn) {
          if (github in confirmed) return fn(undefined, confirmed[github]);

          cmd.github2npm(github, function resolved(err, npm, guess) {
            if (err) return fn(err);
            if (!guess) {
              confirmed[github] = npm;
              return fn(err, npm);
            }

            cmd.cli.prompt([{
              type: 'input',
              name: 'name',
              message: 'If '+ github +' is not '+ npm +' on npm, supply the correct username'
            }], function answered(answer) {
              confirmed[github] = answer.name.trim() || npm;

              return fn(undefined, confirmed[github]);
            });
          });
        }, function complete(err, users) {
          cmd.packages[name].users = users;

          next();
        });
      });
    },

    //
    // Step 4: And add the owners.
    //
    owner: function owner(next) {
      var npm = this.npm
        , uni = this.uni
        , cmd = this;

      async.eachSeries(Object.keys(this.packages), function each(name, next) {
        var pkg = cmd.packages[name];

        /**
         * The diff that we need to add.
         *
         * @param {Error} err Failed operation.
         * @param {Object} stat Diff result contain add/remove array.
         * @api public
         */
        function diff(err, stat) {
          if (err) return next(err);

          //
          // This bit is super important. The last thing we want to do is
          // accidentally remove our own account while syncing.
          //
          var me = uni.conf.get('username');

          stat.add.forEach(function add(name) {
            console.log('adding %s as maintainer of %s', name, pkg.name);
            if (!uni.flag.dryrun) npm().owner('add '+ name +' '+ pkg.name);
          });

          stat.remove.forEach(function add(name) {
            console.log('removing %s as maintainer of %s', name, pkg.name);
            if (!uni.flag.dryrun) npm().owner('rm '+ name +' '+ pkg.name);
          });

          if (!stat.remove.length && !stat.add.length) {
            console.log(pkg.name, 'is already in sync with all of its collaborators');
          }

          next();
        }

        if (uni.flag.remove) return diff(undefined, { add: [], remove: pkg.users });
        if (uni.flag.add) return diff(undefined, { add: pkg.users, remove: [] });

        return cmd.maintainersDiff(pkg.name, pkg.users, diff);
      }, next);
    }
  },

  /**
   * github -> {npm, users} listing of the packages we need to sync.
   *
   * @type {Object}
   * @public
   */
  packages: {}
});
