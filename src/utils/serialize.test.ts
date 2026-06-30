import { describe, expect, it } from "vitest";
import { reactive } from "vue";
import { toPlain } from "./serialize";

describe("toPlain", () => {
  it("converts vue reactive proxy to plain object", () => {
    const state = reactive({
      books: [{ id: "1", title: "test" }],
      settings: { fontSize: 16 },
    });
    const plain = toPlain(state);
    expect(plain.books[0].title).toBe("test");
    expect(Object.getPrototypeOf(plain)).toBe(Object.prototype);
  });
});