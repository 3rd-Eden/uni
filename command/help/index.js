'use strict';

var Uni = require('../../')
  , kuler = require('kuler');

module.exports = Uni.Command.extend({
  /**
   * Name of the command.
   *
   * @type {String}
   * @public
   */
  name: 'help',

  /**
   * Description of the command. In this case it's displaying the help
   * information for the command line interface.
   *
   * @type {String}
   * @public
   */
  description: 'Displays this help message',

  /**
   * The command line switches/flags that this command is responding to. Listed
   * as flag->description / key->value.
   *
   * @type {Object}
   * @public
   */
  flags: {
    '--verbose': 'Help specific, also output all the help information for each command'
  },

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
        , command = this
        , flags = Object.keys(uni.flags)
        , max = this.max(uni.commands.concat(flags)) + 4
        , help = ['Usage: uni [command] [flags]', '', 'Commands:', ''];

      //
      // Iterate over the commands again to extract the full description of the
      // command. We pad the command with extra spaces until we've reached the
      // same length as the longest command.
      //
      help.push.apply(help, uni.commands.map(function map(cmd) {
        var line = '  '+ cmd + (new Array(max - cmd.length).join(' '))
          , description = uni[cmd].description
          , flags = uni[cmd].flags;

        line += uni[cmd].description;

        if (uni.flag.verbose && flags) {
          var fmax = command.max(Object.keys(flags)) + 4;

          line += '\n'+ Object.keys(flags).map(function each(flag) {
            return (new Array(max + 2)).join(' ')
              + kuler(flag, '#888888')
              + (new Array(fmax - flag.length).join(' '))
              + kuler(flags[flag], '#888888');
          }).join('\n') + '\n';
        }

        return line;
      }));

      help.push('');
      help.push('Flags:');
      help.push('');

      help.push.apply(help, Object.keys(uni.flags).map(function each(cmd) {
        var description = uni.flags[cmd];

        return '  '+ cmd + (new Array(max - cmd.length).join(' ')) + description;
      }));

      help.push.apply(help, Object.keys(command.flags).map(function each(cmd) {
        var description = command.flags[cmd];

        return '  '+ cmd + (new Array(max - cmd.length).join(' ')) + description;
      }));

      this.logo();
      this.log(help.join('\n'));
    }
  }
});
