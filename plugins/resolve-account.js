/**
 * Introduce some new API's for finding npm username for a given git account or
 * the other way round.
 *
 * @param {Command} cmd Command that want to have this functionality.
 * @api private
 */
module.exports = function plugin(cmd) {
  'use strict';

  var async = require('async');

  /**
   * Find the highest scoring, most likely GitHub user from the given hubs
   * array. One of the requirements is that the github repo is NOT an
   * organization.
   *
   * @param {GitHulk} githulk GitHulk instance.
   * @param {Array} hubs Bunch of parsed duplicate github repos.
   * @param {Function} fn Completion callback.
   * @api private
   */
  function githubscore(githulk, hubs, fn) {
    hubs = hubs.filter(Boolean);  // Remove possible undefined.

    //
    // Get a count of occurrences of a given username, higher the count the more
    // likely it's the main name of the user.
    //
    var accounts = {}
      , match;

    hubs.forEach(function each(project) {
      if (!(project.user in accounts)) accounts[project.user] = 0;
      accounts[project.user]++;
    });

    //
    // Create a sorted array of username which will determine the order GitHub
    // user scanning.
    //
    var sorted = Object.keys(accounts).sort(function sort(a, b) {
      a = accounts[a];
      b = accounts[b];

      return b > a ? 1 : b < a ? -1 : 0;
    });

    //
    // Iterate over the sorted accounts and find the first matching account. As
    // we're not 100% sure this should be seen as an estimation and prompt users
    // for validation.
    //
    async.whilst(function has() {
      return !!sorted.length && !match;
    }, function check(next) {
      githulk.users.get(sorted.shift(), function get(err, data) {
        data = Array.isArray(data) ? data[0] : data;

        if (err || !data || data.type === 'Organization') return next();

        match = data.login;
        next();
      });
    }, function completed(err) {
      fn(err, match, true);
    });
  }

  /**
   * Find the most common user for the given packages. If there are no multiple
   * users we should give the user a higher count as it's most likely the owner
   * of package.
   *
   * @param {Registry} registry npm-registry instance.
   * @param {Array} packages Bunch of package names from a github account.
   * @param {Function} fn Completion callback.
   * @api private
   */
  function scorenpm(registry, packages, fn) {
    packages = packages.filter(Boolean); // Remove all possible undefined.

    var maintainers = {};

    async.eachLimit(packages, 10, function fetch(name, next) {
      registry.packages.get(name, function get(err, data) {
        data = Array.isArray(data) ? data[0] : data;

        if (err || !data || !Array.isArray(data.maintainers)) return next();

        data.maintainers.forEach(function each(maintainer, index, all) {
          if (!(maintainer.name in maintainers)) maintainers[maintainer.name] = 0;
          maintainers[maintainer.name] += (all.length === 1 ? 10 : 1);
        });

        next();
      });
    }, function sort(err) {
      if (err) return fn(err);

      //
      // Create a sorted array of username which will determine the order npm
      // user scanning.
      //
      var sorted = Object.keys(maintainers).sort(function sort(a, b) {
        a = maintainers[a];
        b = maintainers[b];

        return b > a ? 1 : b < a ? -1 : 0;
      });

      fn(err, sorted[0], true);
    });
  }

  /**
   * Attempt to find the users GitHub account for a given npm name.
   *
   * @param {String} username npm.org username.
   * @param {Function} fn Completion callback
   * @api public
   */
  cmd.npm2github = function npm(username, fn) {
    var registry = this.registry
      , githulk = this.githulk
      , cmd = this;

    registry.users.get(username, function get(err, data) {
      data = Array.isArray(data) ? data[0] : data;

      //
      // If we've received an error it's most likely that this is an invalid npm
      // username so we cannot resolve it to their GitHub accounts.
      //
      if (err || !data) return fn(err || new Error('Missing server response'));

      //
      // If we already have an GitHub account we don't have to search the users
      // packages and save a bunch of requests.
      //
      if ('string' === typeof data.github && data.github.trim().length) {
        return fn(err, data.github);
      }

      //
      // Get all packages from npm to determine the username and repo of each
      // package so we can attempt to figure out the most likely username of
      // a given user and use that as default value.
      //
      registry.users.list(username, function list(err, pkgs) {
        var github = [];

        //
        // Reduce the amount of data we need to process, the more data we
        // process, the more accurate but it will also take longer.
        //
        pkgs = pkgs.slice(0, 20);

        async.whilst(function hasmore() {
          return !!pkgs.length;
        }, function process(next) {
          registry.packages.get(pkgs.pop().name, function (err, data) {
            data = Array.isArray(data) ? data[0] : data;
            if (err) return next(err);

            github.push(githulk.project(data));
            next();
          });
        }, function done(err) {
          if (err) return fn(err);

          githubscore(githulk, github, fn);
        });
      });
    });

    return cmd;
  };

  /**
   * Find the npm account for a given GitHub account.
   *
   * @param {String} username GitHub username.
   * @param {Function} fn Completion callback.
   * @api public
   */
  cmd.github2npm = function github2npm(username, fn) {
    var registry = this.registry
      , githulk = this.githulk;

    //
    // First optimization. It's common that people re-use the same nickname they
    // have on GitHub with their npm account. We're going to check if this is
    // the case first because registry lookups are not rate limited. And we don't
    // need to big iteration and scanning of the registry.
    //
    // We need to `toLowerCase()` the username as npm only accepts toLowerCased
    // usernames. There are some older accounts which are still using Uppercase
    // chars. So maybe we should check for both..
    //
    registry.users.get(username.toLowerCase(), function getsy(err, data) {
      data = Array.isArray(data) ? data[0] : data || {};

      if ((data.github || '').toLowerCase() === username.toLowerCase()) {
        return fn(undefined, data.github.toLowerCase());
      }

      githulk.repository.list(username, {
        type: 'owner',
        per_page: 100
      }, function get(err, repos) {
        //
        // If we got an error this early on in the process it's likely that we're
        // given an incorrect username.
        //
        if (err) return fn(err);

        //
        // Filter and map the repo's. We don't want to have forks, we want to have
        // the real-deal. In addition that we only need the full names of the
        // repos
        //
        repos = repos.filter(function filter(repo) {
          return !repo.fork;
        }).map(function map(repo) {
          return repo.full_name;
        });

        var packages = [];

        async.eachLimit(repos, 10, function fetch(repo, next) {
          githulk.repository.raw(repo, {
            path: 'package.json'
          }, function received(err, data) {
            data = Array.isArray(data) ? data[0] : data;
            if (err) return next(); // Not a single fuck has been given.

            try { data = JSON.parse(data); }
            catch (e) { return next(); }

            if (data.name) packages.push(data.name);
            next();
          });
        }, function completion(err) {
          if (err) return fn(err);

          scorenpm(registry, packages, fn);
        });
      });
    });
  };

  /**
   * Create a simple difference between the maintainers of the package and the
   * users that we wish to add.
   *
   * @param {String} name Name of the package
   * @param {Array} users Users that should be added.
   * @param {Function} fn Completion callback.
   * @api public
   */
  cmd.maintainersDiff = function maintainersDiff(name, users, fn) {
    /**
     * Create the actual diff object. The diff object contains an array of users
     * that needs to be added and an array of users that should be removed.
     *
     * @param {Error} err Optional error argument when we failed to fetch list.
     * @param {Array} maintainers List of maintainers of the package.
     * @api private
     */
    function diff(err, maintainers) {
      if (err) return fn(err);

      var result = { add: [], remove: [] };

      maintainers.forEach(function each(name) {
        if (~users.indexOf(name)) return;

        result.remove.push(name);
      });

      users.forEach(function each(name) {
        if (~maintainers.indexOf(name)) return;

        result.add.push(name);
      });

      return fn(undefined, result);
    }

    this.registry.packages.get(name, function get(err, data) {
      data = Array.isArray(data) ? data[0] : data;

      if (err || !data || !Array.isArray(data.maintainers)) return diff(err);

      data.maintainers.map(function each(maintainer) {
        return maintainer.name;
      });

      diff(undefined, data.maintainers.map(function each(maintainer) {
        return maintainer.name;
      }));
    });
  };
};
