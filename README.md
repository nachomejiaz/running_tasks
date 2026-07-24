# Running_Task

**Current approved build:** `0.3.0-alpha.3`

Running_Task is a private, local Windows task and activity board organized as:

```text
Topic -> optional Subtopic -> Task Card -> Checklist Items
```

Version 0.3.0-alpha.3 adds a company-PC-friendly delivery path: a current-user installer, a portable package, a no-admin build helper, and GitHub Actions release automation. The normal user should download a prebuilt Windows artifact rather than compile on the company computer.

The complete verified source package and Git repository bundle are provided with the 0.3.0-alpha.3 handoff. This repository records the build status, release documentation, roadmap, and the upload procedure while the full source tree is published.

## Key documents

- `docs/LAUNCH_GUIDE.md`
- `docs/GITHUB_UPLOAD_GUIDE.md`
- `docs/ROADMAP.md`
- `docs/RELEASE_NOTES_0.3.0-alpha.3.md`
- `SOURCE_VALIDATION.txt`

## Important company-PC note

Running_Task is configured for current-user installation and the portable package runs without an installer. Neither route is intended to request Administrator elevation. Company application-control policy may still block an unsigned alpha; the application does not bypass those controls.
