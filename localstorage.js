'use strict';

var argv = require('argh').argv
  , crypto = require('crypto')
  , fuse = require('fusing')
  , path = require('path')
  , fs = require('fs')
  , os = require('os');

/**
 * Simple local storage for the configuration.
 *
 * @constructor
 * @param {String} name The name of the local cache.
 * @api public
 */
function LocalStorage(name) {
  if (!(this instanceof LocalStorage)) return new LocalStorage(name);

  this.fuse();

  this.allowed = Object.keys(this.read(path.join(__dirname, '.uni.help.json')));
  this.defaults = this.read(path.join(__dirname, '.uni.json'));
  this.home = process.env.HOME || process.env.USERPROFILE;
  this.passphrase = this.ssh() || os.hostname();
  this.parsers = Object.create(null);
  this.filename = '.'+ name;
  this.prefix = '$';

  //
  // Inherit our default parsers.
  //
  for (var key in LocalStorage.parsers) {
    this.parsers[key] = LocalStorage.parsers[key];
  }

  this.load();
}

fuse(LocalStorage);

/**
 * Prefix the key to prevent properties from overriding build-in methods and
 * properties.
 *
 * @param {String} name Key that needs to be prefixed.
 * @returns {String} Prefixed key.
 * @api private
 */
LocalStorage.readable('key', function key(name) {
  return this.prefix + name;
});

/**
 * Get the private ssh key which we can use the hash passwords in a way that
 * nobody read the passwords from the configuration file.
 *
 * @returns {String} Private ssh key.
 * @api private
 */
LocalStorage.readable('ssh', function ssh() {
  var key = path.join(this.home, '.ssh', 'id_rsa');

  if (!fs.existsSync(key)) return '';
  return fs.readFileSync(key);
});

/**
 * Get the location of the configuration file/directory on which we need to
 * write.
 *
 * @returns {String} Location of the file.
 * @api private
 */
LocalStorage.readable('file', function file() {
  var dir = process.cwd()
    , location;

  while (dir) {
    location = path.join(dir, this.filename);
    if (fs.existsSync(location)) return location;

    dir = path.resolve(dir, '..');
    if (dir === path.sep) break;
  }

  return path.join(this.home, this.filename);
});

/**
 * Get a value out of our configuration set.
 *
 * @param {String} key The key we search for.
 * @returns {Mixed} Stored data.
 * @api public
 */
LocalStorage.readable('get', function get(key) {
  var data = this.data[this.key(key)];

  if (key in this.parsers && data) {
    data = this.parsers[key].call(this, 'get', data);
  }

  return data;
});

/**
 * Same as get, but it renders the value suitable for CLI. It can be that
 * certain values need to be masked.
 *
 * @param {String} key The key we search for.
 * @returns {String} CLI output
 * @api public
 */
LocalStorage.readable('render', function render(key) {
  var data = this.get(key);

  if (key in this.parsers && data) {
    data = this.parsers[key].call(this, 'render', data);
  }

  return (data || '').toString();
});

/**
 * Add a new item to the storage file.
 *
 * @param {String} key The key we store the value on.
 * @param {Mixed} data The value that is stored.
 * @returns {LocalStorage}
 * @api public
 */
LocalStorage.readable('set', function set(key, data) {
  if (key in this.parsers && data) {
    data = this.parsers[key].call(this, 'set', data);
  }

  this.data[this.key(key)] = data;
  return this.save();
});

/**
 * Save the data to disk, if we have any.
 *
 * @returns {LocalStorage}
 * @api private
 */
LocalStorage.readable('save', function save() {
  var data = this.data;

  if (!Object.keys(data).length) return this;

  fs.writeFileSync(this.file(), JSON.stringify(this.allowed.reduce(function (m, key) {
    if (key in data) m[key] = data[key];
    return m;
  }, {}), 2));

  return this;
});

/**
 * Load the configuration file that was stored on our disk.
 *
 * @returns {LocalStorage}
 * @api private
 */
LocalStorage.readable('load', function load() {
  var defaults = this.defaults
    , store = this
    , data = {};

  try { data = this.read(this.file()); }
  catch (e) {}

  this.data = this.merge(Object.keys(defaults).reduce(function pre(memo, key) {
    memo[store.key(key)] = defaults[key];
    return memo;
  }, {}), data || {});

  //
  // Merge in the argv's so we can override configuration values using CLI
  // flags. This can be useful if you temporary want to force a --registry or
  // use different npm username & password
  //
  this.data = this.merge(this.data, Object.keys(argv).filter(function filter(key) {
    return key !== 'argv';
  }).reduce(function reduce(data, key) {
    data[store.key(key)] = argv[key];

    return data;
  }, {}));

  console.log(this.data);

  return this;
});

/**
 * Read and parse a JSON document from disk.
 *
 * @param {String} file The file that need to be loaded.
 * @returns {Object} The parsed JSON.
 * @api public
 */
LocalStorage.readable('read', function read(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
});

/**
 * Remove an item from the storage.
 *
 * @param {String} key The key we want to destroy.
 * @returns {LocalStorage}
 * @api public
 */
LocalStorage.readable('del', function del(key) {
  delete this.data[this.key(key)];

  return this.save();
});

/**
 * Completely destroy our cache and nuke the file on disk.
 *
 * @returns {LocalStorage}
 * @api public
 */
LocalStorage.readable('destroy', function destroy() {
  this.data = {};

  try { fs.unlinkSync(this.file()); }
  catch (e) { }

  return this;
});

/**
 * Default value parsers.
 *
 * @type {Object}
 * @public
 */
LocalStorage.parsers = {
  /**
   * Encode and decode passwords.
   *
   * @param {String} method Method name.
   * @param {String} data Resolved data.
   * @returns {String} Encoded or decoded password.
   * @api private
   */
  password: function password(method, data) {
    var cipher;

    switch (method) {
      case 'get':
        cipher = crypto.createCipher(
          this.get('algorithm'), this.passphrase
        );

        data = cipher.update(data, 'base64', 'ascii');
        data += cipher.final('ascii');
      break;

      case 'set':
        cipher = crypto.createDecipher(
          this.get('algorithm'), this.passphrase
        );

        data = cipher.update(data, 'ascii', 'base64');
        data += cipher.final('base64');
      break;

      case 'render':
        if (data) data = (new Array(10)).join('*');
      break;
    }

    return data;
  }
};

//
// Expose the module.
//
module.exports = LocalStorage;
