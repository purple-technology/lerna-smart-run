# lerna-smart-run

Lerna add-on for only running npm scripts for packages changed since previous tag

# Background

This package is a glorified wrapper around ordinary `lerna run <script>` commands,
but it implements a system to control the order of execution and an automated, opionated
tagging system (based on git branches) that takes advantage of lerna's `--since` option.

This package is intended for use in CI and CD pipelines.

# Usage

Invoke with `smartRun <npm script>`, where `<npm script>` is a script from the
`scripts` section of the `package.json` of one of your lerna packages.

## Optional arguments

Pass `--tagOnSuccess` to generate a tag from the successful execution of the smart run.
This tag will be used on the following execution.

Pass `--runFirst <package-name>` to run the named package before the rest. This is useful
for serverless monorepos where the deployment of some services rely on the finished
deployment of another resource.

Pass `--runLast <package-name>` to run the named package after the rest. This is useful
for serverless monorepos where the deployment of some services rely on the finished
deployment of another resource.

# Disclaimer

This package is in an early, experimental stage, and is likely to change dramatically
between different versions.
