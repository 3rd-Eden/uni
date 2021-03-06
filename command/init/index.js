'use strict';

var Uni = require('../../')
  , path = require('path')
  , fs = require('fs')
  , os = require('os');

module.exports = Uni.Command.extend({
  /**
   * Name of the command.
   *
   * @type {String}
   * @public
   */
  name: 'init',

  /**
   * Description of the command. Which is initializing a new empty folder.
   *
   * @type {String}
   * @public
   */
  description: 'Interactively create a package.json file',

  steps: {
    //
    // Step: Pre-fill the package.json from an existing file that exists.
    //
    prefill: function existing(next) {
      var command = this;

      fs.readFile(this.file, function read(err, content) {
        if (err || !content.length) return next();

        var data = {};

        try { data = JSON.parse(content); }
        catch (e) { /* ignore the error, we assume empty file */ }

        //
        // Add more sane defaults for when data does not exists
        //
        data.name = data.name || path.dirname(command.filename);
        data.version = data.version || '0.0.0';

        next();
      }, 'utf-8');
    },

    //
    // Step 2: Prompt for the properties that need to be auto-filled.
    //
    prompt: function prompt() {
    },

    //
    // Step 3: Optimize/OCD the package.json so it's all nicely organised.
    //
    optimize: function optimize() {
      var output = {}
        , uni = this
        , sorted;

      sorted = this.ocd(this.data);

      [
        'dependencies',
        'devDependencies',
        'jshintConfig'
      ].forEach(function each(key) {
        if (key in output) output[key] = this.ocd(output[key]);
      });

      this.data = output;
    },

    //
    // Step 4: Save the file to disk.
    //
    save: function save(next) {
      var content = JSON.stringify(this.data, null, 2) + os.EOL;

      fs.writeFile(this.file, content, { encoding: 'utf8' }, next);
    },

    //
    // Step 4: Install the dependencies that are configured in the package.json
    // as they are required for the project.
    //
    install: function install() {

    },

    //
    // Step 5: If it's a completely new folder we also want to initialize git in
    // the given folder.
    //
    git: function init() {
      if (!~this.git().show().output.indexOf('not a git')) return;

      this.git().init();
    }
  },

  /**
   * OCD / CDO sorting of the package.json fields and contents.
   *
   * @param {Array|Object} data Dataset we need to sort.
   * @returns {Array|Object} The sorted object.
   * @api private
   */
  ocd: function ocd(data) {
    if ('alphabetical' === this.uni.conf.get('ocd')) {
      return this.alpabetical(data);
    }

    this.length(data);
  },

  /**
   * Estimated location of the package.json we need to modify
   *
   * @type {String}
   * @public
   */
  file: path.join(process.cwd(), 'package.json'),

  /**
   * Base template for package.json
   *
   * @type {Object}
   * @private
   */
  base: {
    name: '{name}',
    version: '{version}',
    description: '{description}',
    script: {
      test: '{script.test}'
    },
    devDependencies: '{devDependencies}',
    dependencies: '{dependencies}',
    peerDependencies: '{peerDependencies}',
    bundledDependencies: '{bundledDependencies}'
  },

  /**
   * The contents of a `package.json`
   *
   * @type {Object}
   * @private
   */
  data: {},

  /**
   * Sort the keys of an Object alphabetically.
   *
   * @param {Object} obj The object which needs to be sorted.
   * @returns {Object} Sorted obj.
   * @api private
   */
  alphabetical: function alphabetical(obj) {
    if (Array.isArray(obj)) return obj.sort();

    return this.alphabetical(Object.keys(obj)).reduce(function out(sorted, key) {
      out[key] = obj[key];
      return out;
    }, {});
  },

  /**
   * Sort the keys of an Object based on the length.
   *
   * @param {Object} obj The object which needs to be sorted.
   * @returns {Object} Sorted obj.
   * @api private
   */
  length: function length(obj) {
    if (Array.isArray(obj)) return obj.sort(function sort(a, b) {
      return a.length - b.length;
    });

    return this.length(Object.keys(obj)).reduce(function reduce(out, key) {
      out[key] = obj[key];
      return out;
    }, {});
  }
});
