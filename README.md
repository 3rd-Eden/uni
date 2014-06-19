# uni

**uni** unifies git, npm and github in to one single command line interface that
was designed to get out of your way and make development and usage of these
tools enjoyable again.

Your productivity will suffer once you get annoyed by the tools you are using on
a daily basis. Thats why developer satisfaction and user experience are first
class citizens in uni. 

#### Typos

Typo's are human, when you want to have something done quickly and rush it there
will be a higher chance of typo's than regularly. The last thing you want is
that your tools start complaining `git puhs is not a command, did you mean git
push`. They already know the command does not exists and it closely resembles a
command that does exist.. We don't have this kind of bullshit in uni. We just
execute the damned command as you intended.

#### less is more

Ever been annoyed by CLI applications that think it would be interesting for you
as a user to know that they just make a HTTP GET request and got 304 response? I
certainly did. In uni we simply ignore all this crap and only output the
progress of a command. Just keeping it simple and short.

#### Silence is golden
Don't want any output at all because you simply don't care? Just append a
`--silence` flag to your commands and it's gone. Need to be silenced for ever?
Toggle the configuration flag and never be bothered again.

## Installation

**uni** assumes that you have the [node], [npm] and [git] binaries installed on
your system. The CLI is distributed using `npm` and can be installed using:

```
npm install -g uni
```

## Configuration

Everything in Uni has been designed to be extendible and configurable so it can
be fully customized in the way **you** want it to behave. The configuration is
stored in a `.uni` dot file which placed in the home folder of your user. The
file is just JSON with prefixed keys. The configuration can be changed and
updated using the `uni config` command. 

If you use different laptops you probably want to sync this file automatically
using Dropbox etc.

Changing the different configuration values within uni is quite easy, the 
`uni config` command automatically lists all the current configured values with
a description with what the configuration value does. You can also run 
`uni config --list`, this yields the same result.

To output the value of one single key you need to run `uni config <key>`. For
example running:

```
uni config algorithm
```

It will return `algorithm: rc4` where `rc4` is the value that is configured for
the `algorithm` key. To set a value you can simply run `uni config <key> <value>`.
Please note that you should not use any spaces inside the value as the part
after a space would not be saved.

To delete values simply use the same command as getting a key but add a
`--delete` flag at the end of it so we know you want to delete it.

```
uni config algorithm --delete
```

### GitHub

As this module leans heavily on interaction with GitHub we make use of their
developer API. Unfortunately this API is heavily rate limited by the folks over
at GitHub, for unauthorized requests can only do 60 API requests per hour and
5000 per hour for authorized requests. When you reach this limit the
functionality of uni will also be severely limited so it's best. In order to use
authorized requests we need to have a GitHub access token. These tokens can be
generated at: **[/settings/tokens/new](https://github.com/settings/tokens/new)**
on the GitHub site.

Once you've created a token you can either add it as ENV variable in your
`.profile/.bashrc/.zshrc` or store it in your `.uni` file using:

```
uni config token <access-token-here>
```

### Private registry

```
uni config password <npm password>
uni config username <npm username>
```

Once you've set the username and password of your npm account you can update the
registry to the location of your own private npm registry:

```
uni config registry <registry url>
```

> The password is **NOT** stored in plain text, we hash the password using Node's
> `createCipher` method and use your private SSH key as password and in the
> configuration specified algorithm as hashing algorithm. If you do not have the
> `~/.ssh/id_rsa` file locally we use the host name of your machine as password
> instead.

## Available commands

There are different commands available in uni. If you already have uni installed
on your system you can simply run `uni --help` or `uni help` and you'll get
something like this:

```
Usage: uni [command] [flags]

Commands:

  clone       clone and initialize a git repository
  config      set/get or list configuration values
  help        displays this help message
  init        interactively create a package.json file

Flags:

  --silence   completely silence the stdout output
  --help      displays help information for a given command
```

Each command also ships with it's own dedicated help page which can be triggered
by calling `uni <command> --help` where `<command>` is one of the commands
listed on the help page. If we run `uni clone --help` it will display something
like:

```
Clone and initialize a git repository.

Usage: uni clone [flags] <repo> -- [git flags]

Flags:
  --create    create the folder of the user/orgs to clone the repositories in
  --silence   completely silence the stdout output
  --help      displays help information for a given command
```

_Output listed above might differ from the output in your terminal._

### uni clone

```
uni clone <repo>
```

The uni clone is a thin wrapper around the `git clone` that we all know in love.
The problem with cloning is that it's not initializing repository that it has
cloned nor does it support anything then actual git URL's.

The clone command understands the following repositories:

- `uni clone git/http/protocol` Anything you would regularly clone with `git clone`
- `uni clone <user>/<repo>` Clone the specified user's repository from GitHub
- `uni clone <user || org>` Clone ALL repositories of the specified user that
  are listed on github.

## License

MIT

[node]: http://nodejs.org/
[npm]: http://browsenpm.org/package/npm/
[git]: http://git-scm.com/
