# lerna-smart-run

Lerna add-on for only running npm scripts for packages changed since previous tag

# Background

This package is a glorified wrapper around ordinary `lerna run <script>` commands,
but it implements a system to control the order of execution and an automated, opionated
tagging system (based on git branches) that takes advantage of lerna's `--since` option.

This package is intended for use in CI and CD pipelines, especially where sequential
deploys are necessary, i.e., where one serverless resource needs to be deployed
before the rest.

# Usage

Invoke with `smartRun <npm script>`, where `<npm script>` is a script from the
`scripts` section of the `package.json` of one of your lerna packages.

## Optional arguments

Pass `--tagOnSuccess` to generate a tag from the successful execution of the smart run.
This tag will be used on the following execution.

Pass `--deleteTagOnSuccess` to delete the previous tag on the successful execution of
the smart run. If there was no previous tag this has no effect.

Pass `--runFirst` to run a package's script before any others. If multiple packages are passed
to this option, they're run in sequence as well. Supports glob patterns.

Pass `--runLast` to run a package's script after any others. If multiple packages are passed
to this option, they're run in sequence as well. Supports glob patterns.

Since command is mostly just a wrapper, see https://www.npmjs.com/package/@lerna/filter-options
for more available flags, but most are not yet implemented.

# Disclaimer

This package is in an early, experimental stage, and is likely to change dramatically
between different versions.
