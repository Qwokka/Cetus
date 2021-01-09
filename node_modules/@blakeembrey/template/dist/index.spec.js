"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
describe("string-template", () => {
    it("should accept data", () => {
        const fn = index_1.template("Hello {{name}}!");
        expect(fn({ name: "Blake" })).toEqual("Hello Blake!");
    });
    it("should support vars at beginning or end of template", () => {
        const fn = index_1.template("{{test}}");
        expect(fn({ test: "test" })).toEqual("test");
    });
    it("should escape quotes in compilation output", () => {
        const fn = index_1.template("\"Some things\" {{test}} 'quoted'");
        expect(fn({ test: "are" })).toEqual("\"Some things\" are 'quoted'");
    });
});
//# sourceMappingURL=index.spec.js.map