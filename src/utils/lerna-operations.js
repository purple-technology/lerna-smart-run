const getFilteredPackages = require("@lerna/filter-options/lib/get-filtered-packages");
const Project = require("@lerna/project");
const PackageGraph = require("@lerna/package-graph");
const defaultOptions = require("@lerna/command/lib/default-options");
const RunCommand = require("@lerna/run");
const filterPackages = require("@lerna/filter-packages");

const orderPackages = async (argv, sinceRef = null) => {
  const project = new Project();
  const packages = await project.getPackages();

  const packageGraph = new PackageGraph(packages);

  const execOpts = { cwd: "." };

  const defaultArgs = {
    all: true,
    includeDependents: true,
  };

  const lsArgs = sinceRef
    ? defaultArgs
    : {
        ...defaultArgs,
        since: sinceRef,
      };

  const options = defaultOptions(lsArgs, project.config);

  const filteredPackages = await getFilteredPackages(
    packageGraph,
    execOpts,
    options
  );

  const packagesToRunFirst = argv.runFirst ? argv.runFirst : [];
  const packagesToRunLast = argv.runLast ? argv.runLast : [];

  const matchedPackagesToRunFirst = filterPackages(
    filteredPackages,
    packagesToRunFirst,
    [],
    true,
    true
  ).map((pkg) => pkg.name);

  const matchedPackagesToRunLast = filterPackages(
    filteredPackages,
    packagesToRunLast,
    [],
    true,
    true
  ).map((pkg) => pkg.name);

  // exclude the packages we grouped above
  const otherPackagesToRun = filterPackages(
    filteredPackages,
    [],
    [...packagesToRunFirst, ...packagesToRunLast],
    true,
    true
  ).map((pkg) => pkg.name);

  return {
    matchedPackagesToRunFirst,
    matchedPackagesToRunLast,
    otherPackagesToRun,
  };
};

const runCommand = async (argv, lernaArgs, sinceRef = null) => {
  const {
    matchedPackagesToRunFirst,
    matchedPackagesToRunLast,
    otherPackagesToRun,
  } = await orderPackages(argv, sinceRef);

  const runFirstPkgsChanged = matchedPackagesToRunFirst.length > 0;
  if (runFirstPkgsChanged) {
    const scopedArgs = {
      ...lernaArgs,
      scope: matchedPackagesToRunFirst,
    };

    await new RunCommand(scopedArgs);
  }

  const otherPkgsChanged = otherPackagesToRun.length > 0;
  if (otherPkgsChanged) {
    const scopedArgs = {
      ...lernaArgs,
      scope: otherPackagesToRun,
    };

    await new RunCommand(scopedArgs);
  }

  const runLastPkgsChanged = matchedPackagesToRunLast.length > 0;
  if (runLastPkgsChanged) {
    const scopedArgs = {
      ...lernaArgs,
      scope: matchedPackagesToRunLast,
    };

    await new RunCommand(scopedArgs);
  }

  return runFirstPkgsChanged || otherPkgsChanged || runLastPkgsChanged;
};

exports.runCommand = runCommand;
