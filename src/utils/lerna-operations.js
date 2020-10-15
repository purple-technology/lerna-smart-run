const getFilteredPackages = require("@lerna/filter-options/lib/get-filtered-packages");
const Project = require("@lerna/project");
const PackageGraph = require("@lerna/package-graph");
const defaultOptions = require("@lerna/command/lib/default-options");
const RunCommand = require("@lerna/run");

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

  const packagesToRunFirst = argv.runFirst;
  const packagesToRunLast = argv.runLast;

  const matchedPackagesToRunFirst = filteredPackages.reduce(
    (filtered, package) => {
      if (packagesToRunFirst.includes(package.name)) {
        filtered.push(package.name);
      }
      return filtered;
    },
    []
  );

  const matchedPackagesToRunLast = filteredPackages.reduce(
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

  return {
    matchedPackagesToRunFirst: matchedPackagesToRunFirst,
    matchedPackagesToRunLast: matchedPackagesToRunLast,
    otherPackagesToRun: otherPackagesToRun,
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
