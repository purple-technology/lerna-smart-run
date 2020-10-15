#!/usr/bin/env node

const yargs = require("yargs/yargs");
const getFilteredPackages = require("@lerna/filter-options/lib/get-filtered-packages");
const Project = require("@lerna/project");
const PackageGraph = require("@lerna/package-graph");
const defaultOptions = require("@lerna/command/lib/default-options");
const RunCommand = require("@lerna/run");

const gitOperations = require("./utils/git-operations");

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

const runSmartCommand = async (previousTag, script) => {
  const project = new Project();
  const packages = await project.getPackages();

  const packageGraph = new PackageGraph(packages);

  const execOpts = { cwd: "." };

  const lsArgs = {
    since: previousTag,
    all: true,
    includeDependents: true,
  };

  const options = defaultOptions(lsArgs, project.config);

  const filteredPackages = await getFilteredPackages(
    packageGraph,
    execOpts,
    options
  );

  const packagesToRunFirst = argv.runFirst;
  const packagesToRunLast = argv.runLast;

  const changedPackagesToRunFirst = filteredPackages.reduce(
    (filtered, package) => {
      if (packagesToRunFirst.includes(package.name)) {
        filtered.push(package.name);
      }
      return filtered;
    },
    []
  );

  const changedPackagesToRunLast = filteredPackages.reduce(
    (filtered, package) => {
      if (packagesToRunLast.includes(package.name)) {
        filtered.push(package.name);
      }
      return filtered;
    },
    []
  );

  const otherPackagesToRun = filteredPackages.reduce((filtered, package) => {
    if (
      !packagesToRunFirst.includes(package.name) &&
      !packagesToRunLast.includes(package.name)
    ) {
      filtered.push(package.name);
    }
    return filtered;
  }, []);

  const defaultCmdArgs = {
    stream: true,
    script: script,
  };

  const runFirstPkgsChanged = changedPackagesToRunFirst.length > 0;
  if (runFirstPkgsChanged) {
    const args = {
      ...defaultCmdArgs,
      scope: changedPackagesToRunFirst,
    };

    await new RunCommand(args);
  }

  const otherPkgsChanged = otherPackagesToRun.length > 0;
  if (otherPkgsChanged) {
    const args = {
      ...defaultCmdArgs,
      scope: otherPackagesToRun,
    };

    await new RunCommand(args);
  }

  const runLastPkgsChanged = changedPackagesToRunLast.length > 0;
  if (runLastPkgsChanged) {
    const args = {
      ...defaultCmdArgs,
      scope: changedPackagesToRunLast,
    };

    await new RunCommand(args);
  }

  return runFirstPkgsChanged || otherPkgsChanged || runLastPkgsChanged;
};

const handler = async () => {
  try {
    const script = argv["_"][2];

    if (!script) {
      throw new Error("The first argument must specify an npm script to run!");
    }

    const previousTag = gitOperations.getPreviousTag();

    let pkgsChanged = false;

    if (!previousTag) {
      console.log(`No previous tag found. Executing full ${script}`);
      // If no tag exists, we can't use a smart run
      const args = {
        stream: true,
        script: script,
      };

      await new RunCommand(args);
    } else {
      console.log(`Tag ${previousTag} found. Executing smart ${script}`);
      pkgsChanged = await runSmartCommand(previousTag, script);
    }

    if (argv.tagOnSuccess && (pkgsChanged || !previousTag)) {
      console.log("Pushing new tag");
      gitOperations.generateNewTag(previousTag);
    }

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

exports.handler = handler();
