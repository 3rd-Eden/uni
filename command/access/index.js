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
    '--team': 'Don\'t sync the repo collaborators but sync an organization team'
  },

  steps: {
    //
    // Step 1: Let's get our collaborators
    //
    collaborators: function collaborators(next) {
      var github = this.githulk.project(this.uni.argv[0])
        , cmd = this;

      //
      // We either need to sync all the collaborators of the github repository
      // with the npm package
      //
      if (!this.uni.flag.team) return this.githulk.collaborators.get(
        this.uni.argv[0], function list(err, collab) {
          if (err) return next(err);

          cmd.users = collab.map(function map(user) {
            return user.login;
          });

          next();
        }
      );

      this.githulk.teams.members(github.user +'/'+ this.uni.flag.team, function (err, members) {
        if (err) return next(err);

        cmd.users = members.map(function map(user) {
          return user.login;
        });

        next();
      });
    },

    //
    // Step 2: Find the module name, if none is given steal it from the github
    // repository.
    //
    name: function name(next) {
      if (this.uni.argv[1]) {
        this.package = this.uni.argv[1];
        return next();
      }

      var cmd = this;

      this.githulk.repository.raw(this.uni.argv[0], {
        path: 'package.json'
      }, function raw(err, content) {
        if (err) return next(err);

        try { content = JSON.parse(content); }
        catch(e) { return next(e); }

        cmd.package = content.name;
        next();
      });
    },

    //
    // Step 3: Resolve the user names to their npm equiv.
    //
    resolve: function resolve(next) {
      var cmd = this;

      async.map(this.users, function process(github, fn) {
        cmd.github2npm(github, function resolved(err, npm, guess) {
          if (!guess || err) return fn(err, npm);

          cmd.cli.prompt([{
            type: 'input',
            name: 'name',
            message: 'If '+ github +' is not '+ npm +' on npm, supply the correct username'
          }], function answered(answer) {
            return fn(undefined, answer.name.trim() || npm);
          });
        });
      }, function complete(err, users) {
        cmd.users = users;
        next();
      });
    },

    //
    // Step 4: And add the owners.
    //
    owner: function owner(next) {
      var pkg = this.package
        , npm = this.npm
        , uni = this.uni
        , cmd = this;

      this.maintainersDiff(pkg, this.users, function diff(err, stat) {
        if (err) return next(err);

        //
        // This bit is super important. The last thing we want to do is
        // accidently remove our own account while syncing.
        //
        var me = uni.conf.get('username');

        stat.add.forEach(function add(name) {
          console.log('adding', name, 'as maintainer of', pkg);
          npm().owner('add '+ name +' '+ pkg);
        });

        stat.remove.forEach(function add(name) {
          console.log('removing', name, 'as maintainer of', pkg);
          npm().owner('rm '+ name +' '+ pkg);
        });

        if (!stat.remove.length && !stat.add.length) {
          console.log(pkg, 'is already in sync with all of its collaborators');
        }

        next();
      });
    }
  },

  /**
   * List of users to have access to npm.
   *
   * @type {Array}
   * @public
   */
  users: [],

  /**
   * The name of the package we need to check.
   *
   * @type {String}
   * @public
   */
  package: ''
});
