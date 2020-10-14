#!/usr/bin/env node

const yargs = require("yargs/yargs");
const getFilteredPackages = require("@lerna/filter-options/lib/get-filtered-packages");
const Project = require("@lerna/project");
const PackageGraph = require("@lerna/package-graph");
const defaultOptions = require("@lerna/command/lib/default-options");
const childProcess = require("child_process");
const RunCommand = require("@lerna/run");

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
  }).argv;

const getBranchName = () => {
  return childProcess
    .execSync("git rev-parse --abbrev-ref HEAD")
    .toString("utf8")
    .trim();
};

const getPreviousTag = () => {
  try {
    const branchName = getBranchName();

    const tags = childProcess
      .execSync(`git tag --sort=-creatordate | grep ${branchName}-`)
      .toString("utf8")
      .trim()
      .split("\n");

    // we sorted by DESC
    return tags[0];
  } catch (error) {
    return null;
  }
};

const buildTaggableTimeStamp = () => {
  const now = new Date();

  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, 0);
  const day = `${now.getDate()}`.padStart(2, 0);
  const hour = `${now.getHours()}`.padStart(2, 0);
  const minute = `${now.getMinutes()}`.padStart(2, 0);
  const seconds = `${now.getSeconds()}`.padStart(2, 0);

  const date = `${year}${month}${day}`;
  const time = `${hour}${minute}${seconds}`;

  return `${date}T${time}`;
};

const generateNewTag = (previousTag) => {
  try {
    const branchName = getBranchName();
    const timestamp = buildTaggableTimeStamp();

    const tagName = `${branchName}-${timestamp}`;

    childProcess
      .execSync(`git tag ${tagName} && git push origin ${tagName}`)
      .toString("utf8");

    // remove previous tag
    if (previousTag) {
      console.log("Deleting previous tag");
      childProcess
        .execSync(
          `git tag -d ${previousTag} && git push --delete origin ${previousTag}`
        )
        .toString("utf8");
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

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

  const changedPackagesToRunFirst = filteredPackages.reduce(
    (filtered, package) => {
      if (packagesToRunFirst.includes(package.name)) {
        filtered.push(package.name);
      }
      return filtered;
    },
    []
  );

  const otherPackagesToRun = filteredPackages.reduce((filtered, package) => {
    if (!packagesToRunFirst.includes(package.name)) {
      filtered.push(package.name);
    }
    return filtered;
  }, []);

  const runFirstPkgsChanged = changedPackagesToRunFirst.length > 0;
  if (runFirstPkgsChanged) {
    const args = {
      stream: true,
      script: script,
      scope: changedPackagesToRunFirst,
    };

    await new RunCommand(args);
  }

  const otherPkgsChanged = otherPackagesToRun.length > 0;
  if (otherPkgsChanged) {
    const args = {
      stream: true,
      script: script,
      scope: otherPackagesToRun,
    };

    await new RunCommand(args);
  }

  // return a bool for if there were changes or not
  return runFirstPkgsChanged || otherPkgsChanged;
};

const run = async () => {
  try {
    const script = argv["_"][2];

    if (!script) {
      throw new Error("The first argument must specify an npm script to run!");
    }

    const previousTag = getPreviousTag();

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

    if (pkgsChanged) {
      console.log("Changed packages found.");
    } else {
      console.log("No changed packages found.");
    }

    if (argv.tagOnSuccess && (pkgsChanged || !previousTag)) {
      console.log("Pushing new tag");
      generateNewTag(previousTag);
    } else {
      console.log("Not pushing new tag");
    }

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

run();
