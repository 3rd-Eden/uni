# uni

**uni** unifies git, npm and github in to one single command line interface that
was designed to get out of your way and make development and usage of these
tools enjoyable again.

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
