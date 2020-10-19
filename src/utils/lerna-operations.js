const getFilteredPackages = require("@lerna/filter-options/lib/get-filtered-packages");
const Project = require("@lerna/project");
const PackageGraph = require("@lerna/package-graph");
const defaultOptions = require("@lerna/command/lib/default-options");
const RunCommand = require("@lerna/run");
const multimatch = require("multimatch");

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
    includeDependents: true,
    scope: argv.scope,
    ignore: argv.ignore,
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

  const packageNames = filteredPackages.map((pkg) => pkg.name);

  // includeDependents overrides ignore, but since we're aiming to
  // support sequential deploys, we need to undo that behavior
  const ignoreNoMatterWhat = multimatch(packageNames, arrify(argv.ignore));

  return packageNames.filter((pkg) => !ignoreNoMatterWhat.includes(pkg));
};

const runCommand = async (argv, lernaArgs, sinceRef = null) => {
  const packages = await filterPackages(argv, sinceRef);

  const packagesChanged = packages.length > 0;
  if (packagesChanged) {
    const scopedArgs = {
      ...lernaArgs,
      scope: packages,
      "--": argv["--"] || [],
    };

    await new RunCommand(scopedArgs);
  }

  return packagesChanged;
};

exports.runCommand = runCommand;
