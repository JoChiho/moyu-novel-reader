import { describe, expect, it } from "vitest";
import {
  isValidShortcut,
  keyboardEventToShortcut,
  toElectronShortcut,
} from "./shortcut";

describe("keyboardEventToShortcut", () => {
  it("captures Ctrl+Z", () => {
    const event = new KeyboardEvent("keydown", {
      key: "z",
      code: "KeyZ",
      ctrlKey: true,
      bubbles: true,
    });
    expect(keyboardEventToShortcut(event)).toBe("Ctrl+Z");
  });

  it("captures Ctrl+`", () => {
    const event = new KeyboardEvent("keydown", {
      key: "`",
      code: "Backquote",
      ctrlKey: true,
      bubbles: true,
    });
    expect(keyboardEventToShortcut(event)).toBe("Ctrl+`");
  });

  it("ignores modifier-only press", () => {
    const event = new KeyboardEvent("keydown", {
      key: "Control",
      code: "ControlLeft",
      ctrlKey: true,
      bubbles: true,
    });
    expect(keyboardEventToShortcut(event)).toBeNull();
  });
});

describe("toElectronShortcut", () => {
  it("converts Ctrl+Z to Control+Z", () => {
    expect(toElectronShortcut("Ctrl+Z")).toBe("Control+Z");
  });

  it("converts Ctrl+` to Control+`", () => {
    expect(toElectronShortcut("Ctrl+`")).toBe("Control+`");
  });
});

describe("isValidShortcut", () => {
  it("requires modifier and key", () => {
    expect(isValidShortcut("Ctrl+Z")).toBe(true);
    expect(isValidShortcut("Z")).toBe(false);
  });
});