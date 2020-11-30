const lernaOperations = require("../utils/lerna-operations")

describe('#lerna-smart-run', () => {
	test.each([
        [2, [2]],
        [null, []],
        ["hi", ["hi"]],
        [["hi"], ["hi"]],
	])(
		'%p should become %p',
		 (original, arrified) => {
			const result = lernaOperations.arrify(original)
			expect(result).toStrictEqual(arrified)
		}
	)
})
