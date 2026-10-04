# Family Stars

A mobile-friendly star chart for one parent and two children. Mum awards stars for activities or extra good deeds, redeems rewards, and corrects mistakes. Everything is saved on the phone and works offline. See [Family-Stars-PRD.md](Family-Stars-PRD.md) for the full requirements.

## Run it

```bash
npm install
npm run dev        # development server at http://localhost:5173 (no offline support in dev)
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build at http://localhost:4173 (offline support active)
```

Tests:

```bash
npm test                         # domain + storage rules (Vitest, fake IndexedDB)
npx playwright install chromium  # once
npm run e2e                      # builds, serves and drives the real app in Chromium
```

## Putting it on Mum's phone

`dist/` is a static site that works from any folder. It must be served over **HTTPS**, because browsers only allow offline support on secure sites. Any static host works, for example Vercel, Netlify, GitHub Pages or Cloudflare Pages. Nothing is sent to the host apart from the app files.

1. Open the URL on her phone while online.
2. Wait until **Settings → Offline use** shows “Ready to use offline”.
3. Optionally install the app (Settings shows the right steps for iPhone or Android). This is recommended on iPhone, because Safari may clear data for websites that are not added to the Home Screen.

## How the data works

- Data is stored in the browser's IndexedDB on that phone, using Dexie. There are no accounts, no server and no sync.
- **The history is the source of truth.** A child's balance is the sum of their history entries. Redeeming adds a negative entry equal to the reward's cost at that moment, so 18 − 15 leaves 3.
- **Corrections never rewrite history.** Correcting an award adds a new entry for the difference and marks the original “Corrected later”. Reversing a redemption gives back exactly the stars that were taken, once.
- **No double saves.** Every save runs in one database transaction that re-checks the stored balance and cost. Each save also carries a unique operation id, so a double tap or a second open tab cannot record the same action twice.
- **Schema changes:** add a new `this.version(n)` in [src/db/schema.ts](src/db/schema.ts) with an `.upgrade()` step. Never edit a released version.
- **App updates** are downloaded in the background and only applied when Mum taps **Update**. The app never reloads in the middle of an action.

## Backup and restore

- **Save backup** (in Settings, or on the Home reminder) creates `family-stars-YYYY-MM-DD.json` with children, activities, rewards, full history and settings.
  - On phones that can share files, it opens the share sheet, so Mum can send the file to herself on WhatsApp, or to Drive or email.
  - Elsewhere it downloads the file.
  - Closing the share sheet without sending does not count as a backup.
- **Reminder:** Home shows a "Time for a backup" card when there are changes that aren't in any backup and the last backup (or first use) is at least 7 days old. "Later" hides it for 3 days. It never appears when nothing has changed.
- **Restore backup** checks the whole file first. It then shows the backup date and each child's balance, and offers to save the current data before replacing it. The restore happens in one transaction. An invalid or newer-version file is rejected and nothing changes. To restore a file sent over WhatsApp, save it to the phone first, then pick it in Restore backup.
- A restore replaces all current data. It never merges.

## Project layout

```
src/domain/   types, validation, balance & reward-progress maths (pure)
src/db/       Dexie schema, all mutations (operations.ts), backup/restore
src/ui/       shared components: sheets, award/redeem/correct flows, history, avatars
src/screens/  Setup, Home, ChildDetail, Activities, Rewards, Settings
src/pwa/      service worker registration, offline/update/install state
tests/unit/   rule tests     tests/e2e/   browser tests (Playwright)
```
