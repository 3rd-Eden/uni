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

  /**
   * The command line usage instructions.
   *
   * @type {String}
   * @public
   */
  usage: 'uni --help, uni help',

  steps: {
    //
    // Step 1: Output the usage information.
    //
    output: function output() {
      var uni = this.uni
        , flags = Object.keys(uni.flags)
        , max = this.max(uni.commands.concat(flags)) + 4
        , help = ['Usage: uni [command] [flags]', '', 'Commands:', ''];

      //
      // Iterate over the commands again to extract the full description of the
      // command. We pad the command with extra spaces until we've reached the
      // same length as the longest command.
      //
      help.push.apply(help, uni.commands.map(function map(cmd) {
        var description = uni[cmd].description;

        return '  '+ cmd + (new Array(max - cmd.length).join(' ')) + description;
      }));

      help.push('');
      help.push('Flags:');
      help.push('');

      help.push.apply(help, Object.keys(uni.flags).map(function each(cmd) {
        var description = uni.flags[cmd];

        return '  '+ cmd + (new Array(max - cmd.length).join(' ')) + description;
      }));

      this.log(help.join('\n'));
    }
  }
});
