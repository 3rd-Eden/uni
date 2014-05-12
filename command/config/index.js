'use strict';

var Help = require('../help');

module.exports = Help.extend({
  /**
   * Description of the command. Which is a custom configuration.
   *
   * @type {String}
   * @public
   */
  description: 'set/get or list configuration values',

  steps: {
    //
    // Step 1: Are we a get operation? Then we only need to show the current
    // value that we've stored.
    //
    get: function get() {
      if (this.uni.argv.length !== 1) return;

      var key = this.uni.argv[0];

      console.log(key, this.uni.conf.get(key));
    },

    //
    // Step 2: We're a get operation so we need to store the value.
    //
    set: function set() {
      if (this.uni.argv.length !== 2) return;

      var key = this.uni.argv[0]
        , value = this.uni.argv[1];

      this.uni.store.set(key, value);
      console.log(key, value);
    },

    //
    // Step 3: List all configuration options.
    //
    list: function list() {
      if (!this.uni.flag.list) return;

      var keys = Object.keys(this.uni.conf.data).map(function map(key) {
        return key.charAt(0) === '$'
        ? key.slice(1)
        : key;
      }), max = this.max(keys) + 4;

      keys.forEach(function each(key) {
        console.log(key +':'+ Array(max - key.length).join(' '), this.get(key));
      }, this.uni.conf);
    }
  }
});
