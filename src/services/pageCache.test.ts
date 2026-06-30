import { describe, expect, it, beforeEach } from "vitest";
import {
  buildPageCacheKey,
  clearPageCache,
  getCachedPage,
  setCachedPage,
} from "./pageCache";

describe("pageCache", () => {
  beforeEach(() => clearPageCache());

  it("stores and retrieves page slices", () => {
    const key = buildPageCacheKey(
      0,
      { width: 300, height: 400, lineHeightPx: 20, maxLines: 10 },
      1000,
      "hash",
    );
    const slice = { start: 0, end: 50, lines: ["hello"] };
    setCachedPage(key, slice);
    expect(getCachedPage(key)).toEqual(slice);
  });
});