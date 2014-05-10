'use strict';

var fuse = require('fusing')
  , path = require('path')
  , fs = require('fs');

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

  this.defaults = this.read(path.join(__dirname, '.uni.json'));
  this.home = process.env.HOME || process.env.USERPROFILE;
  this.filename = '.'+ name;
  this.prefix = '$';

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
  return this.data[this.key(key)];
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
  key = this.key(key);

  this.data[key] = data;
  return this.save();
});

/**
 * Save the data to disk, if we have any.
 *
 * @returns {LocalStorage}
 * @api private
 */
LocalStorage.readable('save', function save() {
  if (!Object.keys(this.data).length) return this;

  fs.writeFileSync(this.file(), JSON.stringify(this.data, 2));

  return this;
});

/**
 * Load the configuration file that was stored on our disk.
 *
 * @returns {LocalStorage}
 * @api private
 */
LocalStorage.readable('load', function load() {
  var data = {};

  try { data = this.read(this.file()); }
  catch (e) {}

  this.data = this.merge(this.defaults, data || {});
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
  key = this.key(key);

  delete this.data[key];
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

//
// Expose the module.
//
module.exports = LocalStorage;
