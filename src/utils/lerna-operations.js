const getFilteredPackages = require("@lerna/filter-options/lib/get-filtered-packages");
const Project = require("@lerna/project");
const PackageGraph = require("@lerna/package-graph");
const defaultOptions = require("@lerna/command/lib/default-options");
const RunCommand = require("@lerna/run");
const multimatch = require("multimatch");
const os = require("os");

// copy pasted from lerna source code since not exported
function arrify(thing) {
  if (!thing) {
    return [];
  }

  if (!Array.isArray(thing)) {
    return [thing];
  }

  return thing;
}

const filterPackages = async (argv, sinceRef = null) => {
  const project = new Project();
  const packages = await project.getPackages();

  const packageGraph = new PackageGraph(packages);

  const execOpts = { cwd: "." };

  // We may revisit this and refactor smartRun to accept all of
  // lerna's filter yargs and only use their defaults.
  const defaultArgs = {
    all: true,
    includeDependents: !argv.excludeDependents,
    scope: argv.scope,
    ignore: argv.ignore,
  };

  const lsArgs = sinceRef
    ? {
        ...defaultArgs,
        since: sinceRef,
      }
    : defaultArgs;

  const options = defaultOptions(lsArgs, project.config);

  const filteredPackages = await getFilteredPackages(
    packageGraph,
    execOpts,
    options
  );

  const packageNames = filteredPackages.map((pkg) => pkg.name);

  const runFirstPackages = multimatch(packageNames, arrify(argv.runFirst));
  const runLastPackages = multimatch(packageNames, arrify(argv.runLast));

  const otherPackages = packageNames.filter(
    (pkg) => !runFirstPackages.includes(pkg) && !runLastPackages.includes(pkg)
  );

  return { runFirstPackages, otherPackages, runLastPackages };
};

const runCommand = async (argv, lernaArgs, sinceRef = null) => {
  const {
    runFirstPackages,
    otherPackages,
    runLastPackages,
  } = await filterPackages(argv, sinceRef);

  const defaultArgs = {
    ...lernaArgs,
    concurrency: argv["concurrency"] || os.cpus().length,
    "--": argv["--"] || [],
  };

  const runFirstPackagesChanged = runFirstPackages.length > 0;
  const packagesChanged = otherPackages.length > 0;
  const runLastPackagesChanged = runLastPackages.length > 0;

  if (runFirstPackagesChanged) {
    for (const pkg of runFirstPackages) {
      const packageArgs = {
        ...defaultArgs,
        scope: pkg,
      };
      await new RunCommand(packageArgs);
    }
  }

  if (packagesChanged) {
    const packageArgs = {
      ...defaultArgs,
      scope: otherPackages,
    };
    await new RunCommand(packageArgs);
  }

  if (runLastPackagesChanged) {
    for (const pkg of runLastPackages) {
      const packageArgs = {
        ...defaultArgs,
        scope: pkg,
      };
      await new RunCommand(packageArgs);
    }
  }

  return packagesChanged;
};

exports.runCommand = runCommand;
