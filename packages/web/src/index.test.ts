import { sum } from ".";

describe("Web Entry Point", () => {
  it("should work", () => {
    expect(sum(1, 1)).toEqual(2);
  });
});
