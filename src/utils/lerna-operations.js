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

const groupSequentialPackages = (seqArgs, unorderedSeqPackages) => {
  const seqPkgGroups = arrify(seqArgs).reduce((filtered, pattern) => {
    const matchedPackages = multimatch(unorderedSeqPackages, [pattern]);
    if (matchedPackages.length > 0) {
      return [...filtered, matchedPackages];
    }
    return filtered
  }, []);

  return seqPkgGroups
}

const _findFilteredProjectPackages = async (argv, sinceRef) => {
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

  return filteredPackages
}

const orderPackages = async (packages, first, last) => {
  // We lose order here since we go by package names, which aren't sorted the way we want
  const unorderedRunFirstPackages = multimatch(
    packages,
    arrify(first)
  );
  const unorderedRunLastPackages = multimatch(
    packages,
    arrify(last)
  );

  // restore specified ordering from runFirst and runLast, and pass the args themselves forwards
  // should revisit with the above code. this is a bit wasteful
  const runFirstPkgGroups = groupSequentialPackages(first, unorderedRunFirstPackages)
  const runLastPkgGroups = groupSequentialPackages(last, unorderedRunLastPackages)

  const otherPackages = packages.filter(
    (pkg) => !unorderedRunFirstPackages.includes(pkg) && !unorderedRunLastPackages.includes(pkg)
  );

  return { runFirstPkgGroups, otherPackages, runLastPkgGroups };
};

const runCommand = async (argv, lernaArgs, sinceRef = null) => {
  const filteredPackages = await _findFilteredProjectPackages(argv, sinceRef)
  const packages = filteredPackages.map((pkg) => pkg.name);
  const {
    runFirstPkgGroups,
    otherPackages,
    runLastPkgGroups,
  } = await orderPackages(packages, argv.runFirst, argv.runLast);

  const defaultArgs = {
    ...lernaArgs,
    concurrency: argv["concurrency"] || os.cpus().length,
    "--": argv["--"] || [],
  };

  const runFirstPackagesChanged = runFirstPkgGroups.length > 0;
  const packagesChanged = otherPackages.length > 0;
  const runLastPackagesChanged = runLastPkgGroups.length > 0;

  if (runFirstPackagesChanged) {
    for (const pkgGroup of runFirstPkgGroups) {
      const packageArgs = {
        ...defaultArgs,
        scope: pkgGroup,
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
    for (const pkgGroup of runLastPkgGroups) {
      const packageArgs = {
        ...defaultArgs,
        scope: pkgGroup,
      };
      await new RunCommand(packageArgs);
    }
  }

  return packagesChanged;
};

exports.runCommand = runCommand;
exports.arrify = arrify;
exports.groupSequentialPackages = groupSequentialPackages;
exports.orderPackages = orderPackages;
