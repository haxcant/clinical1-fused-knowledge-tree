# Mobile banner and UI wording cleanup report v5.6.9

## Changes

- Removed the sidebar card that displayed `v5.6.9 L11 Guide 輕量載入版` and the Windows BAT / `file://` warning.
- Removed BAT / CMD startup guidance from the root redirect page.
- Replaced first-/second-person UI wording in runtime HTML/JS files.
- Added `README.md` for GitHub repository display.
- Removed root-level `.bat` / `.cmd` files from the packaged site to keep the GitHub Pages deployment clean.

## Checks

- JavaScript syntax check: passed.
- JSON parse check: passed.
- Runtime source grep for BAT / `file://` / mobile warning text: passed.
- Runtime UI grep for `你` / `我`: passed, excluding content data files because exam/PDF source text may legitimately contain quoted classical wording.
