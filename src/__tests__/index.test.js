const lernaOperations = require("../utils/lerna-operations");

describe("#lerna-smart-run", () => {
  test.each([
    [2, [2]],
    [null, []],
    ["hi", ["hi"]],
    [["hi"], ["hi"]],
  ])("%p should become %p", (original, arrified) => {
    const result = lernaOperations.arrify(original);
    expect(result).toStrictEqual(arrified);
  });

  test.each([
    ["@be-resources", ["@be-resources"], [["@be-resources"]]],
    [
      ["@be-resources", "frontend"],
      ["@be-resources", "@be-services", "frontend"],
      [["@be-resources"], ["frontend"]],
    ],
    [
      ["@be-resources/*"],
      [
        "@be-resources/resource1",
        "@be-resources/resource2",
        "@be-services/service1",
      ],
      [["@be-resources/resource1", "@be-resources/resource2"]],
    ],
  ])(
    "should filter and order packages from pattern %s",
    (sequence, packages, grouped) => {
      const result = lernaOperations.groupSequentialPackages(
        sequence,
        packages
      );
      expect(result).toStrictEqual(grouped);
    }
  );

  test.each([
    [[], [], [], [], [], []],
    [["@be-resources/resource1"], [], [], [], [], ["@be-resources/resource1"]],
    [
      ["@be-resources/resource1", "@be-resources/resource2", "@be-services/service1", "@be-services/service2", "api"],
      ["@be-resources/*", "@be-services/service2"],
      [],
      [["@be-resources/resource1", "@be-resources/resource2"], ["@be-services/service2"]],
      [],
      ["@be-services/service1", "api"],
    ],
    [
      ["api", "frontend", "some-random-package"],
      ["api"],
      ["frontend"],
      [["api"]],
      [["frontend"]],
      ["some-random-package"],
    ],
  ])(
    "Packages %p, with a first sequence of %p and a last sequence of %p should have first packages %s, last packages, %s, and all others with %s",
    async (
      packages,
      first,
      last,
      runFirstPkgGroups,
      runLastPkgGroups,
      otherPackages
    ) => {
      const orderedPackages = await lernaOperations.orderPackages(
        packages,
        first,
        last
      );
      expect(orderedPackages.runFirstPkgGroups).toStrictEqual(
        runFirstPkgGroups
      );
      expect(orderedPackages.otherPackages).toStrictEqual(otherPackages);
      expect(orderedPackages.runLastPkgGroups).toStrictEqual(runLastPkgGroups);
    }
  );
});
