'use strict';

var Uni = require('../../');

module.exports = Uni.Command.extend({
  description: 'interactively create a package.json file',

  steps: {
    //
    // Step: Pre-fill the package.json
    //
    prefill: function existing() {

    },

    //
    // Step 2: Prompt for missing files.
    //
    prompt: function prompt() {

    },

    //
    // Step 3: Optimize/OCD the package.json so it's all nicely organised.
    //
    optimize: function optimize() {

    },

    //
    // Step 4: Install the dependencies that are configured in the package.json
    // as they are required for the project.
    //
    install: function install() {

    },
  },

  /**
   * Sort the keys of an Object alphabetically.
   *
   * @param {Object} obj The object which needs to be sorted.
   * @api private
   */
  alphabetically: function alphabetically(obj) {
    if (Array.isArray(obj)) return obj.sort();

    return Object.keys(obj).sort().reduce(function reduce(sorted, key) {
      sorted[key] = obj[key];
      return sorted;
    }, {});
  }
});
