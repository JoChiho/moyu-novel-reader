import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../types";
import { getPageKeyConflicts } from "./shortcutConflict";

describe("shortcutConflict", () => {
  it("flags identical next and prev keys", () => {
    const issues = getPageKeyConflicts({
      ...DEFAULT_SETTINGS,
      nextPageKey: "J",
      prevPageKey: "J",
    });
    expect(issues.length).toBeGreaterThan(0);
  });
});