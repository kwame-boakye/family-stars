# Family Stars — Product Requirements Document

Version 1.0 · 4 October 2026 · Working product name

## 1. Product purpose

Build a simple, cheerful, mobile-friendly website that helps a mother in Ghana manage a star reward system for her two children, aged six and two. She currently records stars manually. The app should make awarding stars, seeing progress, and redeeming rewards quick enough to use during everyday family life.

The mother is the only operator. The children can enjoy seeing their progress on her screen, but do not need accounts or independent access. Kelvin is building the app and does not need remote access to the family's records.

**Primary outcome:** Mum can award a star in a few taps, trust the recorded balance, and immediately see which rewards each child can redeem.

## 2. Confirmed requirements and proposed defaults

### Confirmed requirements

- Two children, aged 8 and 4.
- Mum manages the app herself.
- She can create activities with star values and award stars for those activities.
- She can also award stars at her discretion for something outside the activity list.
- She can create rewards and change their required star amounts.
- Initial rewards: skating at the mall for 15 stars; eating out for 20 stars.
- Redeeming a reward deducts its cost. Any remaining stars carry forward.
- Stars may be removed to correct mistakes, never as a punishment feature.
- The app should be mobile-friendly and ideally work without internet.
- Visual progress, a star-awarding animation, and activity history are welcome.

### Proposed defaults for this first version

These are implementation choices, not additional facts supplied by the family. Use them unless Kelvin changes them.

| Decision | Default |
| --- | --- |
| Separate or shared balances | Each child has an independent balance. |
| Accounts and devices | One device, no login, no backend or cross-device sync. |
| Persistence | Store family data locally, with manual backup and restore. |
| Offline support | Include in the first version, after the initial online load and offline preparation. |
| Activities | Shared catalogue, optionally assigned to either or both children. |
| Rewards | Shared catalogue; each child redeems independently. |
| Award amount | Positive whole stars; default to one for discretionary awards. |
| Award note | Optional; show “Extra good deed” when no reason is entered. |
| Expiry and resets | No expiry, weekly reset, or automatic balance reset. |
| Repeat rewards | A reward can be redeemed again whenever the child has enough stars. |
| Language and dates | English; use Africa/Accra for displayed dates. |
| Initial balances | Start at zero, with optional entry of existing paper-tracked balances during setup. |

## 3. Scope

### First version

Child profiles, a home dashboard, saved activities, discretionary awards, configurable rewards, redemption, mistake correction, per-child history, simple celebrations, offline operation, and data backup/restore.

### Outside this version

Child accounts, remote family access, public profiles, sibling rankings, punishments, daily streak pressure, subscriptions, advertising, AI behaviour scoring, push notifications, and scheduling or booking the outings themselves. Cloud backup and device sync may be considered later if Mum needs them.

## 4. Core rules

### Earning stars

1. Every award belongs to exactly one child.
2. A saved activity provides its configured star amount. Mum selects the child and activity, reviews the amount, and taps “Award stars”.
3. “Extra good deed” allows an amount and optional reason without creating an activity first.
4. Awards use positive whole numbers. Reject zero, negatives, fractions, blank amounts, and values outside the implementation's safe numeric range.
5. The same activity may be rewarded more than once. There is no daily cap or automatic award.
6. Editing an activity changes future awards only. History retains the original activity name and amount.
7. Persist the award before showing a successful celebration. A failed save must not appear successful.

### Redeeming rewards

**New balance = current balance − the reward's star cost. Never clear the entire balance unless the subtraction actually produces zero.**

| Starting balance | Action | Result |
| --- | --- | --- |
| 14 | Try to redeem 15-star skating | Block redemption; show “1 more star needed”. |
| 15 | Redeem 15-star skating | 0 stars remain. |
| 18 | Redeem 15-star skating | 3 stars remain. |
| 20 | Redeem 20-star meal out | 0 stars remain. |
| 22 | Redeem 15-star skating | 7 stars remain. |

1. Reaching a threshold makes the reward available; it does not automatically redeem it or reserve stars.
2. Mum chooses whether to redeem an available reward or keep saving for another.
3. Before redemption, show the child, reward, cost, and resulting balance. Example: “Redeem skating for 15 stars? Ama has 18 stars. She will have 3 left.” Names in examples are illustrative, not actual child names.
4. Mum must explicitly confirm. Cancelling changes nothing.
5. Recheck the balance and current reward cost when committing. If the cost changed after opening the confirmation, ask Mum to review the updated confirmation.
6. Deduct stars and record redemption as one atomic operation. Rapid double taps must not create two redemptions.
7. Redeeming for one child never changes the other's balance.
8. Redemption records that Mum has granted the reward. Planning or confirming the actual outing is outside scope.
9. Reward costs must be positive whole stars. Changing a cost immediately changes future eligibility, without changing balances or earlier redemptions.
10. Archive rewards instead of deleting their historical records. An archived reward cannot be redeemed.

### Correcting mistakes

Provide “Correct mistake” from history, not a general “Remove stars” control on the dashboard.

- Mum can void an accidental award or replace its amount/reason. Require a short correction reason and show the balance effect before confirmation.
- Preserve the original entry and attach its correction. History should make clear what changed without counting the original and replacement twice.
- An award cannot be corrected in a way that makes the current balance negative. Explain the conflict and allow Mum to cancel. If a redemption was also mistaken, she can reverse that redemption first; do not silently reverse a valid reward or invent debt.
- A mistaken redemption can be reversed once, restoring exactly the amount originally deducted, even if that reward's current price is different. Preserve it in history as reversed.
- A corrected award's effective version can be corrected again, but each superseded version has no additional balance effect. Repeated taps must never apply the same correction or reversal twice.
- A short-lived “Undo” after an award may use the same correction mechanism with “Accidental award” as its reason.
- No punishments, arbitrary deductions, negative balances, or automatic removal for missed activities.

## 5. Screens and user flows

### A. First-time setup

Keep setup short and skip explanations that do not help Mum act.

1. Enter a nickname and select an illustrated avatar for each child. Do not require birth dates, photos, email addresses, or full names.
2. Optionally enter existing star balances. Record each nonzero amount as an “Opening balance” entry so totals remain explainable; allow correction like an award.
3. Present editable starter rewards: “Skating at the mall — 15 stars” and “Eat out — 20 stars”.
4. Offer optional starter activities. Examples: “Put toys away”, “Help tidy up”, and “Finish homework”. These are suggestions, not confirmed family rules; Mum can edit, skip, or assign them by child. Do not automatically assign homework to the two-year-old.
5. Open the dashboard. Home-screen installation guidance can be offered later and must not block use.

### B. Home dashboard

Show two large child cards. Each contains:

- Avatar and nickname.
- Current star balance as a prominent number with a star symbol.
- Primary “Award stars” button.
- A short reward status, such as “3 more stars to skating” or “Skating is ready!”.
- Access to that child's rewards and history.

Use simple bottom navigation: Home, Activities, Rewards, Settings. A child's detail view contains their full progress and history. Keep the currently selected child visible throughout every award and redemption flow.

### C. Award stars

From a child's card, open a compact panel with applicable saved activities and an “Extra good deed” option. Show the amount clearly, allow an optional note, and commit only when Mum taps the award button. Keep common awards to about three taps from Home.

After saving, update the balance immediately and play a brief star animation. Show a plain-text confirmation such as “1 star added for putting toys away”, with Undo. Do not make Mum wait for the animation before continuing.

### D. Activities

Create or edit an activity with a name, positive whole-star value, optional icon, and assignment to either or both children. Allow archiving; archived activities disappear from the award picker while previous awards remain in history. No scheduling, reminders, or mandatory daily checklist.

### E. Rewards and progress

Mum can create, edit, and archive rewards with a name, optional icon, and positive whole-star cost. Show rewards ordered by cost.

For a selected child, each reward shows its cost, a progress bar, and either stars remaining or “Ready to redeem”. Progress is current balance divided by cost, visually capped at 100%. Keep the actual balance visible even when it exceeds a reward's cost. Every eligible reward can be chosen; avoid implying Mum must redeem the cheapest one first.

If all rewards are affordable, show “All rewards available”. If no rewards exist, offer “Add a reward” and continue allowing stars to be earned.

### F. History and corrections

Display a per-child timeline, newest first, with local date/time, activity or reason, signed star change, and reward name for redemptions. Distinguish awards, opening balances, redemptions, corrections, and reversals using text as well as icons. Corrected/reversed entries remain visible but must not be counted twice.

Use friendly language: “Award corrected”, “Reward redemption reversed”, and “No stars yet—add the first one”. Avoid rankings, “bad behaviour” labels, or comparisons between siblings.

### G. Settings

Edit child nicknames/avatars; manage backup/restore; toggle celebrations; see offline readiness and last exported backup time; access home-screen installation guidance appropriate to the browser. Profile removal and a global reset are unnecessary for the first version.

## 6. Visual and interaction direction

The app should feel like a warm family star chart. Use a light background, warm gold stars, large readable balances, rounded cards, and a small set of cheerful colours. Give each child a distinct avatar/colour, without making colour the only identifier.

Design for an adult holding a phone and occasionally showing it to young children. Prefer large touch targets, short labels, familiar icons with text, and easy one-handed use. Avoid dense analytics, admin-dashboard styling, and long forms.

- Support narrow phone layouts starting at 320 CSS pixels without horizontal scrolling.
- Use touch targets of at least 44 × 44 CSS pixels for primary controls.
- Provide readable contrast, visible focus states, accessible labels, and keyboard operation.
- Announce balance changes to assistive technology without excessive repeated announcements.
- Respect reduced-motion preferences and the in-app celebrations setting. No sound by default.
- Keep animations short; no flashing effects, forced animation delays, or celebration on every page reload.
- Use ordinary form errors and empty states that explain what Mum should do next.

## 7. Offline operation and data durability

Recommended architecture: a small installable progressive web app, with browser-local structured storage and cached application assets. A frontend such as React with TypeScript is a reasonable starting choice, not a required stack. Use a maintained IndexedDB wrapper if it simplifies reliable persistence. Avoid a backend until there is a concrete account, backup, or multi-device requirement.

### Required behaviour

- Initial loading requires internet. Once assets are cached, explicitly indicate that offline use is ready; do not promise offline access before that point.
- After preparation, Mum can reopen the app, award stars, redeem rewards, edit activities/rewards, and view history without a network connection.
- Save mutations locally as they happen. Going back online does not replay them as new awards or redemptions; this version has no sync queue or server.
- Keep the app usable in a browser without installation. Test the installed experience too where supported.
- Cache required fonts/icons locally or use system fonts and bundled assets. Core screens must not depend on third-party requests.
- Preserve stored data across app updates with versioned migrations. Do not refresh mid-action or erase records when deploying an update.
- On a storage failure, show “Could not save—please try again” and retain the input. Never display a successful balance change that was not persisted.
- When another tab changes data, refresh the visible state. Validate mutations against stored state so stale tabs cannot overspend a balance.

### Backup and restore

Device-local storage can be lost if browser data is cleared or the phone is replaced. Explain this once in plain language during setup and keep backup controls easy to find.

- “Save backup” exports a versioned JSON file containing profiles, activities, rewards, transactions, corrections, and settings.
- “Restore backup” validates the entire file before changing anything, then previews child names, balances, and export date.
- Restoring replaces local data; it does not merge or duplicate histories. Require an explicit confirmation and offer to export existing data first.
- Malformed or unsupported backup files leave current data untouched. A valid import is atomic.
- Show the last exported backup date. Do not label local persistence as cloud backup or claim that another device will see the data.

## 8. Suggested data model

Keep this small; an understandable local data model is more valuable than elaborate infrastructure.

| Entity | Minimum information |
| --- | --- |
| Child | Stable ID, nickname, avatar, optional colour, created timestamp. |
| Activity | Stable ID, name, star amount, optional icon, assigned child IDs, archived flag. |
| Reward | Stable ID, name, star cost, optional icon, archived flag. |
| Star transaction | Stable ID, child ID, type, signed star delta, timestamp, reason, related activity/reward ID where applicable, original label/cost snapshot, correction/reversal links. |
| Settings | Schema version, display timezone, celebrations preference, backup metadata. |

The transaction history is the source of truth for balances. A stored balance may be used as a cache only if updated atomically and reconcilable with history. Opening balances are transactions, not unexplained fields. Preserve snapshots so catalogue edits never rewrite the past. Use unique operation IDs and atomic validation/writes to prevent duplicate awards, redemptions, or corrections.

## 9. Acceptance criteria

The first version is complete when these behaviours are verified:

| Scenario | Expected result |
| --- | --- |
| Award a saved one-star activity | Only the chosen child gains one star; history identifies the activity. |
| Award a discretionary three-star action | Balance rises by three; the optional note is retained. |
| Enter an invalid amount or reward cost | Save is blocked with a clear explanation. |
| Redeem skating from 18 stars | Exactly 15 stars are deducted; 3 remain. |
| Redeem skating from 15 stars | Balance becomes zero. |
| Try skating from 14 stars | Redemption is blocked; one more star is required. |
| Have 20 stars and choose skating | Skating is allowed; 5 remain; eating out is no longer affordable. |
| Cancel redemption confirmation | Neither history nor balance changes. |
| Double-tap a pending submission | One action is recorded. |
| Edit skating's price after a redemption | Past cost and balance effect stay unchanged; new eligibility uses the new cost. |
| Reverse that earlier redemption | The original deducted amount is restored exactly once. |
| Correct a mistaken award | History preserves the correction; the current balance changes by the appropriate difference. |
| Correction would create a negative balance | Block it with an explanation; leave all data unchanged. |
| Archive an activity or reward | It disappears from available choices; historical records remain. |
| Reload or close and reopen | Profiles, balances, and history persist. |
| Reopen offline after offline preparation | Core reading and writing flows still work and persist. |
| Simulate a failed local save | No success celebration or false committed balance appears. |
| Submit from stale tabs | Revalidate stored balance/cost; prevent overspending or duplicate records. |
| Export and restore a valid backup | Effective balances and histories match; no duplicate transactions. |
| Import an invalid backup | Existing data remains intact. |
| Enable reduced motion | Awards remain usable with minimal or no animation. |

Also check common flows on a real phone where available and at narrow mobile widths. Verify the offline, persistence, and balance rules with functional tests; visual polish alone is not completion. No analytics service is needed to measure success: Mum should be able to award a familiar activity in about five seconds and understand reward eligibility without an explanation.

## 10. Build order and Claude handoff

1. Establish the data model and test awarding, redemption subtraction, corrections, reversals, and duplicate prevention.
2. Build onboarding, child cards, activity management, award flow, rewards, and history using persistent data.
3. Add offline caching, update-safe persistence, backup/restore, and clear error states.
4. Add celebrations and accessibility polish, then verify the acceptance criteria.

### Instruction to Claude

Build the mobile-friendly web app described in this PRD. Start with a brief implementation plan, then implement the first version. Use the proposed defaults unless Kelvin changes them; ask only about genuine blockers. Keep the architecture simple and the interface suitable for a mother managing two young children's stars on her phone. Use real persistent data and working flows, not a static mockup. Do not add accounts, cloud sync, rankings, punishments, or extra features outside the stated scope. The critical redemption rule is subtraction with carryover: 18 stars minus a 15-star reward leaves 3 stars. Explain how to run the app, how offline preparation and backup work, which acceptance criteria you verified, and any remaining limitations. Do not invent the children's names or imply starter activities are confirmed family rules.
