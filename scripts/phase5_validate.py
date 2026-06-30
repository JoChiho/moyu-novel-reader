"""Phase 5 automated checks (runs in venv, no MSVC required)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def check(name: str, ok: bool, detail: str = "") -> bool:
    status = "PASS" if ok else "FAIL"
    line = f"[{status}] {name}"
    if detail:
        line += f" — {detail}"
    print(line)
    return ok


def main() -> int:
    print("=== Phase 5 validation (Electron / no MSVC) ===\n")
    all_ok = True

    required_files = [
        "package.json",
        "electron/main.cjs",
        "electron/preload.cjs",
        "src/App.vue",
        "src/services/pagination.ts",
        "src/services/platform.ts",
        "开发流程.txt",
    ]
    for rel in required_files:
        all_ok &= check(f"file exists: {rel}", (ROOT / rel).exists())

    pkg = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
    for dep in ["electron", "electron-store", "electron-builder", "vue"]:
        all_ok &= check(f"npm dep: {dep}", dep in deps)

    all_ok &= check("package main entry", pkg.get("main") == "electron/main.cjs")
    all_ok &= check(
        "no tauri deps",
        "@tauri-apps/api" not in deps,
        "Tauri removed — Electron only",
    )

    dist = ROOT / "dist" / "index.html"
    all_ok &= check("frontend build artifact", dist.exists())

    all_ok &= check("node_modules installed", (ROOT / "node_modules").exists())
    all_ok &= check(
        "sample TXT fixture",
        (ROOT / "scripts" / "sample-novel.txt").exists(),
    )

    print("\nRun desktop app: npm run electron:dev")
    print("No Visual Studio / MSVC required.\n")

    if all_ok:
        print("Phase 5 (static) checks: ALL PASSED")
        return 0
    print("Phase 5 (static) checks: SOME FAILED")
    return 1


if __name__ == "__main__":
    sys.exit(main())