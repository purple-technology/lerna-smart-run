#!/usr/bin/env node

const yargs = require("yargs/yargs");
const log = require("npmlog");
const filterOptions = require("@lerna/filter-options");

const gitOperations = require("./utils/git-operations");
const lernaOperations = require("./utils/lerna-operations");

const argv = filterOptions(
  yargs(process.argv)
    .scriptName("smartCommand")
    .option("tagOnSuccess", {
      alias: "t",
      type: "boolean",
      default: false,
      description: "Create and push a git tag when the script finishes",
    })
    .option("deleteTagOnSuccess", {
      alias: "d",
      type: "boolean",
      default: false,
      description: "Delete the previous git tag when the script finishes",
    })
).argv;

const handler = async () => {
  try {
    const script = argv["_"][2];

    if (!script) {
      throw new Error("The first argument must specify an npm script to run!");
    }

    const lernaArgs = {
      stream: true,
      script: script,
    };

    const previousTag = gitOperations.getPreviousTag();

    let pkgsChanged = false;

    if (!previousTag) {
      log.notice(
        "lerna-smart-run",
        `No previous tag found. Executing full ${script}`
      );
      await lernaOperations.runCommand(argv, lernaArgs);
    } else {
      log.info(
        "lerna-smart-run",
        `Tag ${previousTag} found. Executing smart ${script}`
      );
      pkgsChanged = await lernaOperations.runCommand(
        argv,
        lernaArgs,
        previousTag
      );
    }

    if (argv.tagOnSuccess && (pkgsChanged || !previousTag)) {
      log.info("lerna-smart-run", "Pushing new tag");
      gitOperations.generateNewTag(previousTag);
    }

    if (argv.deleteTagOnSuccess && previousTag) {
      log.info("lerna-smart-run", "Deleting previous tag");
      gitOperations.deletePreviousTag(previousTag);
    }

    process.exit(0);
  } catch (error) {
    log.error("lerna-smart-run", error);
    process.exit(1);
  }
};

exports.handler = handler();
