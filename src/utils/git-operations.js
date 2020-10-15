const childProcess = require("child_process");

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

exports.getPreviousTag = getPreviousTag;
exports.generateNewTag = generateNewTag;
