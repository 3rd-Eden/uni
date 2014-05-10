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
      var uni = this.uni;

      //
      // Calculate the maximum length of a command, we need to know this so we
      // can properly align and space the different commands and their
      // descriptions in the help output.
      //
      // The 2 is added to give the longest command some extra room so the
      // description is more clear.
      //
      var max = Math.max.apply(Math, uni.commands.map(function map(cmd) {
        return cmd.length;
      })) + 2;

      var help = [
        'Usage: uni [command] [flags]',
        '',
        'Commands:',
        ''
      ];

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
  }
});
