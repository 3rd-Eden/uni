'use strict';

var Uni = require('../../');

module.exports = Uni.Command.extend({
  /**
   * Description of the command. In this case it's displaying the help
   * information for the command line interface.
   *
   * @type {String}
   * @public
   */
  description: 'displays this help message',

  steps: {
    //
    // Step 1: Output the usage information.
    //
    output: function output() {
      var uni = this.uni
        , max = this.max(uni.commands) + 4
        , help = ['Usage: uni [command] [flags]', '', 'Commands:', ''];

      //
      // Iterate over the commands again to extract the full description of the
      // command. We pad the command with extra spaces until we've reached the
      // same length as the longest command.
      //
      help.push.apply(help, uni.commands.map(function map(cmd) {
        var description = uni[cmd].description;

        return '  '+ cmd +':'+ (new Array(max - cmd.length).join(' ')) + description;
      }));

      help.push('');
      console.log(help.join('\n'));
    }
  },

  /**
   * Calculate the maximum length of the items, we need to know this so we
   * can properly align and space the values.
   *
   * @param {Array} arr The array with items we should should scan
   * @returns {Number} Max length
   */
  max: function max(arr) {
    return Math.max.apply(Math, arr.map(function map(value) {
      return (value).toString().length;
    }));
  }
});
