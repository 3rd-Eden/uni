'use strict';

var pathval = require('pathval')
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
    // Step 1: Find all repositories with a package.json
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
    // Step 2: filter our
    //
    filter: function filter() {
      var query = this.uni.flag.argv.shift();

      this.repos = this.repos.filter(function each(repo) {
        if (!repo.content) return false;

        //
        // A failed parse of JSON automatically indicates a bad JSON so we
        // cannot query against it.
        //
        try { repo.json = JSON.parse(repo.content); }
        catch (e) { return false; }

        repo.value = pathval.get(repo.json, query);
        return repo.value !== undefined;
      });
    },

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
