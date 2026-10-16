# Installed skills

30 skills, copied unmodified from three open-source repos. Each folder is named after the skill's frontmatter `name`, which is the name Claude Code uses (`/name` or auto-trigger by description). Licenses: [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).

`manual` = only runs when you call it with `/name` (`disable-model-invocation: true`).

## emilkowalski/skills (MIT) — motion and UI craft

| Skill | Use it for |
|---|---|
| `animate` | Build a web animation from scratch: whether, why, which tool, curve, duration, interruption |
| `animate-expo` | Same, for React Native / Expo |
| `animation-performance` | Keep animations inside the frame budget; find the cause of dropped frames |
| `animation-vocabulary` | Turn "the bouncy thing when a popover opens" into the exact term |
| `apple-design` | Apple-style fluid, physical motion: springs, gestures, sheets, materials |
| `ask-sonner` | Sonner toast library: setup, API, theming |
| `break-ui` | Stress a UI with worst-case data: long names, empty states, huge counts, non-Latin text |
| `emil-design-eng` | Emil Kowalski's UI polish and design-engineering philosophy |
| `find-animation-opportunities` | Read-only scan for what should animate, with exact values |
| `improve-animations` | Audit motion code and write plans other agents can execute |
| `mobile-native` | Make a web app feel installed on a phone: tap flashes, 100vh, input zoom |
| `pick-ui-library` | `manual` — pick a library from a curated list |
| `prototype` | `manual` — build several distinct versions behind a live picker |
| `review-animations` | `manual` — review motion code against a high craft bar |
| `write-swift` | Modern Swift: value types, Swift 6 concurrency, protocols, API design |

## leonxlnx/taste-skill (MIT) — anti-generic frontend and image direction

11 of the 14 are installed under their frontmatter name, which differs from the upstream folder name (shown below; `—` means same):

| Skill | Upstream folder | Use it for |
|---|---|---|
| `design-taste-frontend` | `taste-skill` | Current default (v2): art direction for websites, with a real-browser inspector (`scripts/`, needs Node 22+ and Chrome) |
| `design-taste-frontend-v2-experimental` | `taste-skill-v2-experimental` | Earlier single-file, dial-driven v2 |
| `design-taste-frontend-v1` | `taste-skill-v1` | Original v1, kept for exact backward compatibility |
| `high-end-visual-design` | `soft-skill` | The "expensive agency" look: type, spacing, depth, motion |
| `minimalist-ui` | `minimalist-skill` | Clean editorial UI, warm monochrome, flat bento |
| `industrial-brutalist-ui` | `brutalist-skill` | Swiss print meets terminal; upstream marks it beta |
| `redesign-existing-projects` | `redesign-skill` | Audit and upgrade an existing site without breaking it |
| `gpt-taste` | `gpt-tasteskill` | Editorial type, bento grids, GSAP scroll motion |
| `full-output-enforcement` | `output-skill` | Bans truncation and placeholder code |
| `stitch-design-taste` | `stitch-skill` | `DESIGN.md` files for Google Stitch |
| `image-to-code` | `image-to-code-skill` | Generate design images first, then build to match |
| `imagegen-frontend-web` | — | Image generation only: one reference image per website section |
| `imagegen-frontend-mobile` | — | Image generation only: mobile app screens and flows |
| `brandkit` | — | Image generation only: brand-guideline boards and logo systems |

`design-taste-frontend` supersedes the `-v1` and `-v2-experimental` variants; all three describe frontend design work, so if the wrong one keeps firing, delete the older two.

## pbakaus/impeccable v4.6.0 (Apache-2.0) — design commands

| Skill | Use it for |
|---|---|
| `impeccable` | One skill, ~24 commands: `shape`, `audit`, `critique`, `polish`, `animate`, `typeset`, `layout`, `harden`, `adapt`, `clarify`, `distill`, `init`, `document`, `live`, and more. Run `/impeccable` with a command and a target |

- Companion subagents live in [`../agents/`](../agents): `impeccable-asset-producer`, `impeccable-documenter`, `impeccable-finish-reviewer`, `impeccable-manual-edit-applier`.
- **Hooks are not enabled.** Upstream's `settings.json` (a command on every edit and on stop) was deliberately not copied. Turn it on per project with `/impeccable hooks on`.
- **First run downloads an engine binary** (`scripts/impeccable` launcher) from `github.com/pbakaus/impeccable` releases into `~/.impeccable`, checksum-verified against a sidecar file. Needs network. To avoid the download, preinstall the binary and set `IMPECCABLE_BIN`.

## Not installed

- `audit` under impeccable's `tests/oracle/` — a two-line test fixture, not a real skill.
- `performance-cheatsheet.md` (emilkowalski) and `skills/llms.txt` (taste-skill) — notes, not skills.
