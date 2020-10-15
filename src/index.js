#!/usr/bin/env node

const yargs = require("yargs/yargs");
const log = require("npmlog");

const gitOperations = require("./utils/git-operations");
const lernaOperations = require("./utils/lerna-operations");

const argv = yargs(process.argv)
  .scriptName("smartCommand")
  .option("tagOnSuccess", {
    alias: "t",
    type: "boolean",
    default: false,
    description: "Create and push a git tag when the script finishes",
  })
  .option("runFirst", {
    alias: "f",
    type: "array",
    default: [],
    description: "Packages which should be executed first",
  })
  .option("runLast", {
    alias: "l",
    type: "array",
    default: [],
    description: "Packages which should be executed last",
  }).argv;

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

    process.exit(0);
  } catch (error) {
    log.error("lerna-smart-run", error);
    process.exit(1);
  }
};

exports.handler = handler();
