'use strict';

var pathval = require('pathval')
  , semver = require('semver')
  , Uni = require('../../')
  , path = require('path')
  , fs = require('fs');

var Clone = module.exports = Uni.Command.extend({
  /**
   * Description of command. Which in this case is finding repositories based on
   * values in their `package.json` files.
   *
   * @type {String}
   * @public
   */
  description: 'find repositories based on package.json fields',

  /**
   * The usage information for this given command.
   *
   * @type {String}
   * @public
   */
  usage: 'uni find [flags] <user/organization> <query> [value]',

  steps: {
    //
    // Step 1: Find all repositories and look up the `package.json` files in
    // each of these repositories.
    //
    find: function url(next) {
      var command = this
        , uni = this.uni;

      this.githulk.repository.list(uni.flag.argv.shift(), function list(err, repos) {
        command.repos = repos;
        next();
      }).async.map(function map(row, next) {
        command.githulk.repository.raw(row.full_name, {
          path: 'package.json'
        }, function raw(err, content) {
          next(undefined, { id: row.full_name, content: content });
        });
      });
    },

    //
    // Step 2: Filter out the repositories that don't have a package.json or
    // don't have a valid package.json
    //
    filter: function filter() {
      var query = this.uni.flag.argv.shift()
        , value = this.uni.flag.argv.join(' ')
        , not = query.charAt(0) === '!';

      //
      // Remove the `!` character so we can see which repositories do NOT satisfy
      // our given query.
      //
      if (not) query = query.slice(1);

      this.repos = this.repos.filter(function each(repo) {
        if (!repo.content) return false;

        var accepted;

        //
        // A failed parse of JSON automatically indicates a bad JSON so we
        // cannot query against it.
        //
        try { repo.json = JSON.parse(repo.content); }
        catch (e) { return false; }

        repo.value = pathval.get(repo.json, query);

        if (value) {
          if (semver.validRange(value)) {
            try { accepted = semver.satisfies(repo.value, value); }
            catch (e) { accepted = false; }
          } else {
            accepted = JSON.stringify(
              repo.value
            ).toLowerCase() === JSON.stringify(
              value
            ).toLowerCase();
          }
        } else {
          accepted = repo.value !== undefined;
        }

        if (not) return !accepted;
        return accepted;
      });
    },

    //
    // Step 3: Output the repositories that matched our query.
    //
    match: function match() {
      console.log('The following repositories match: \n');
      console.log(this.repos.map(function map(repo) {
        return repo.id;
      }).join('\n'));
    }
  },

  /**
   * A list of repositories.
   *
   * @type {Array}
   * @private
   */
  repos: []
});
