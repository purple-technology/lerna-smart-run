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
});
