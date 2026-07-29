# Running_Task 0.2.0-alpha.2

Release date: 2026-07-23

## Purpose of this stage

This stage incorporates the approved interface review changes and introduces the first monthly scheduling workspace without changing the approved Topic/Subtopic/Card hierarchy.

## Added

- Monthly Calendar route in the sidebar and top visualization switcher.
- Six-week, Monday-first month grid.
- Cards scheduled by derived next date: earliest incomplete checklist due date, then overall target date as fallback.
- Previous month, Today, and next month controls.
- Day-cell task creation with the selected date prefilled.
- Calendar access to the No Date queue.
- Calendar support for global search, Topic scope, status, BIC, due-window, and priority filters.
- Automated calendar date-grid, month-shift, static, and React-render checks.
- Guided `PUBLISH_TO_GITHUB.bat` workflow for the approved repository, using GitHub browser sign-in rather than a pasted token.

## Visual update

- The local font stack now requests `Alliance No.1` first and falls back through operating-system UI fonts. No proprietary font file is bundled.
- The dark theme was redesigned with neutral near-black surfaces, subtle borders, restrained shadows, compact labels, and higher information density inspired by the approved reference image.
- Dark is the new-workspace default. Light and system modes remain selectable in Settings.

## Data compatibility

No database schema change was required. Calendar placement is derived from existing Card and checklist data. Existing workspaces remain compatible and preserve their selected theme.

## Validation

The release-preparation environment passed TypeScript compilation, JavaScript parsing, static product checks, live SQLite schema execution, domain rules, React render smoke checks for every primary route, and self-contained preview generation.

## Distribution boundary

This remains a source alpha with compiled browser-review assets. A Windows `.exe` setup still requires compilation and acceptance testing on a Windows toolchain.
