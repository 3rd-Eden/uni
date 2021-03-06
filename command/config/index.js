'use strict';

var Help = require('../help')
  , path = require('path');

module.exports = Help.extend({
  /**
   * The name of the command.
   *
   * @type {String}
   * @public
   */
  name: 'config',

  /**
   * Description of the command. Which is a custom configuration.
   *
   * @type {String}
   * @public
   */
  description: 'set/get or list configuration values',

  /**
   * Configuration flags that can be used for this command.
   *
   * @type {Object}
   * @public
   */
  flags: {
    '--delete': 'Delete the configuration value, restoring it to the default value'
  },

  /**
   * Small usage example on which arguments we allow.
   *
   * @type {String}
   * @public
   */
  usage: 'uni config <key> <value>',

  steps: {
    //
    // Step 1: Are we a get operation? Then we only need to show the current
    // value that we've stored.
    //
    get: function get() {
      if (this.uni.argv.length !== 1) return;

      var key = this.uni.argv[0];

      if (this.uni.flag.delete) {
        this.uni.conf.del(key);
        return this.log(key +': has been removed or restored to the default value');
      }

      this.log(key +': '+ this.uni.conf.get(key));
    },

    //
    // Step 2: We're a get operation so we need to store the value.
    //
    set: function set() {
      if (this.uni.argv.length !== 2) return;

      var key = this.uni.argv[0]
        , value = this.uni.argv[1];

      this.uni.conf.set(key, value);
      this.log(key +': '+ value);
    },

    //
    // Step 3: List all configuration options.
    //
    list: function list() {
      var uni = this.uni;

      if (!uni.flag.list && uni.argv.length) return;

      var cols = +uni.conf.get('cols')
        , values = []
        , keys = []
        , maxvalue
        , maxdesc
        , maxkey;

      //
      // All keys in the configuration's data object are prefixed so we need to
      // un-prefix them to get the actual length and be able to use them in
      // the config's get method.
      //
      Object.keys(uni.conf.data).map(function map(key) {
        key = key.replace(uni.conf.prefix, '');
        keys.push(key);

        values.push(uni.conf.get(key));
      });

      maxvalue = this.max(values) + 4;
      maxkey = this.max(keys) + 4;
      maxdesc = cols - maxvalue - maxkey;

      //
      // This is the part where we actually output the list. We got all
      // information that we need:
      //
      // - Maximum col width we're allowed to use
      // - Maximum length of the keys
      // - Maximum length of the values
      // - Maximum length of the descriptions
      //
      keys.sort(function sort(a, b) {
        return a.localeCompare(b);
      }).forEach(function each(key) {
        var description = this.descriptions[key] || ''
          , value = uni.conf.get(key).toString()
          , length = maxdesc;

        if (description.length <= length) return this.log([
          key +':',
          (new Array(maxkey - key.length)).join(' '),
          value,
          (new Array(maxvalue - value.length)).join(' '),
          description
        ].join(''));

        //
        // This is the more extreme case, our description is to long so we need
        // to span across multiple lines in order to output this.
        //
        this.log([
          key +':',
          (new Array(maxkey - key.length)).join(' '),
          value,
          (new Array(maxvalue - value.length)).join(' '),
          description.slice(0, length)
        ].join(''));

        while (length < description.length) {
          this.log((new Array(maxkey + maxvalue)).join(' ') + description.slice(length, length + maxdesc));
          length = length + maxdesc;
        }
      }, this);
    }
  },

  /**
   * The descriptions for the configuration values that we use inside of uni.
   *
   * @type {String}
   * @private
   */
  descriptions: require(path.join(__dirname, '../..', '.uni.help.json'))
});
