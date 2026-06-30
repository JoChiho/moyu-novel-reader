import { describe, expect, it } from "vitest";
import { matchesPageTurnKey } from "./pageTurn";

function keyEvent(key: string): KeyboardEvent {
  return { key } as KeyboardEvent;
}

describe("matchesPageTurnKey", () => {
  it("matches single letter case-insensitively", () => {
    expect(matchesPageTurnKey(keyEvent("j"), "J")).toBe(true);
    expect(matchesPageTurnKey(keyEvent("K"), "k")).toBe(true);
    expect(matchesPageTurnKey(keyEvent("a"), "J")).toBe(false);
  });

  it("matches Space alias", () => {
    expect(matchesPageTurnKey(keyEvent(" "), "Space")).toBe(true);
    expect(matchesPageTurnKey(keyEvent("Spacebar"), "Space")).toBe(true);
  });

  it("returns false for empty config", () => {
    expect(matchesPageTurnKey(keyEvent("j"), "")).toBe(false);
  });
});