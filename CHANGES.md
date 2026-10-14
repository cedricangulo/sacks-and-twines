# What's new (October 14)

## Dispatch report downloads
- The reports page can download dispatches again, as Excel or PDF. Pick a
  day, a week, or a month — no time fields to fill in.
- The Excel file has two sheets: one row per dispatch with its totals, plus
  an items sheet linked by OR number so multi-item dispatches stay readable.
  Both sheets have filters, frozen headers, and a totals row, and print
  cleanly in landscape.
- The PDF opens with the totals at a glance (dispatch count, items out,
  total value), then lists each dispatch with its items underneath.
- Peso amounts print with the ₱ sign in both files.
- Very large periods are capped so a download can't silently drop rows — if
  that happens the file says so and suggests narrowing the range.
- The dispatch status column is gone from history, reports, and downloads.
  Every recorded dispatch is final, so a "Completed / Voided" label that
  could never say "Voided" was only misleading.

## Recording past dates
- Stock-in, dispatch, and stock-adjustment windows now have an optional date
  and time. Leave them empty for "right now", or fill them in when recording
  something late — like yesterday's delivery entered today.
- On phones you get the built-in date and time pickers; on desktop you get a
  calendar popup. Both work the same way.
- Past dates go back up to 30 days and can't be in the future. Only owners
  can backdate; staff dispatches are always recorded as of now.
- Receipt (OR) numbers always carry the date they were printed, even for a
  backdated dispatch, so receipt numbers never run backwards.
- Backdated entries are flagged in the audit log: the summary says when the
  event happened, and the details list both the recording time and the
  transaction date.
- Reports and downloaded files now stamp when they were generated. Re-running
  an old period later can show different numbers if late entries were added
  after — the stamp is what makes an issued file stand on its own.

# What's new (October 5 – 13)

## Signing in
- You can now show or hide your password while typing it.
- Pasting a login code cleans up extra spaces and dashes by itself.
- The sign-in page loads faster (smaller background photo).
- Didn't get your login code? You can request a new one after a
  60-second wait. Only the newest code works, and each code expires
  after 15 minutes.

## Inventory and products
- The add, edit, and void windows were tidied up: titles and buttons stay
  visible while the middle part scrolls, and related fields are grouped.
- The edit-product window was rebuilt with clearer sections.
- Text boxes now show a character counter, and error messages say plainly
  what's wrong and what's allowed.

## Dispatching
- Items without a photo now show initials instead of breaking the page.
- If an item in the queue has a problem, you'll see a message under it and
  a warning — the Dispatch button no longer silently does nothing.
- The customer reference box holds up to 50 characters, same as the system.

## Stock history and reports
- Batch details now open in one click (no more menu).
- Tables no longer go blank while loading, and searching stays on your page.
- Report rows expand to show their items, just like the history table.
- Searching "5000" now finds ₱5,000 amounts; search also handles older
  records with unusual spacing or characters.
- Downloaded files are protected so spreadsheet apps can't run hidden
  formulas from the data.
- Deducting stock can't go below zero anymore, and the "Add" preview
  correctly counts up instead of down.

## Behind the scenes
- Stock-history pages load faster, and about 745 automated checks pass with
  the code-health score up from 79 to 88.
