# Data correctness: phone flags and exports

Two rules keep the lead table trustworthy. Both are enforced at the write and
export boundaries, not in the UI, so an old folder, a CSV download and the live
table cannot disagree.

## 1. One parse decides every phone flag

A lead stores `phone`, `phoneType`, `isMobile`, `isLandline`, `callUrl`,
`whatsappAvailable` and `whatsappLink`. Engines, the streaming phone backfill
and the session vault used to rewrite `phone`/`phoneType` at different moments
without updating the booleans. That produced rows like:

```json
{ "phone": "+91 77993 34918", "phoneType": "mobile",
  "isMobile": false, "isLandline": true }
```

A perfectly valid mobile was then scored as a landline and denied a WhatsApp
link, while the CSV export still put the number in the dialer column.

`server/src/utils/phoneUtils.js` → `syncPhoneFlags(lead)` parses the primary
phone once with libphonenumber and derives:

| Field | Rule |
|---|---|
| `phoneType` | `mobile` when the parser says mobile, `landline` when it says fixed line |
| `isMobile` / `isLandline` | both derived from the same parse |
| `callUrl` | `tel:` link for the parsed number |
| `whatsappAvailable` / `whatsappLink` | only for validated mobiles; a landline clears both |

It never invents a number: a missing or unparseable phone leaves the row as it
was.

Wired into every central write path:

- `server/src/config/dbAdapter.js` — `saveVendor`, `saveVendors`,
  `replaceVendors`, `updateVendorsBatch`
- `server/src/services/sessionVaultService.js` — session folder writes
- `server/src/services/omniSearchOrchestrator.js` — the contact filter, including
  the no-contact branch (sets all three flags to false)

Repairing existing files:

```powershell
cd server
node scripts/repair-phone-flags.js           # report only
node scripts/repair-phone-flags.js --apply   # backup + atomic write
```

The script copies every touched file to
`server/data/phone-flags-backup-<stamp>/` before writing, and only touches the
six phone fields — no lead is added, merged or removed. Stop the engine first:
only the lock holder may write the store.

Result of the one-off run: 31 flag sets repaired in the store and 31 across 7
session folders; store still 424 leads, 0 contradictions, 354 mobiles all with
WhatsApp links, 5 landlines with none.

## 2. Export rule: mobile-first

**Primary Phone is a parser-validated mobile and nothing else.** Extra mobiles
and every landline go to **Secondary Phone**. The WhatsApp URL is present only
when a mobile exists.

Applied in three places with the same logic:

- `client/src/v2/utils/leadSource.js` and `master/src/v2/utils/leadSource.js`
  (identical files) — `exportPhones(lead)` + the Secondary Phone column used by
  the Live Leads / folder "Export CSV" buttons.
- `server/src/routes/sessionRoutes.js` — `buildCsvRow` for the folder export
  (`/api/sessions/export/:id?format=csv`), plus json / txt / vcf.

A business whose only number is a landline therefore exports with an **empty**
Primary Phone and `0866 247 4419` in Secondary Phone. That is deliberate: a
dialer column that can receive WhatsApp should never silently contain a number
that cannot.

### Verification

```powershell
# pure: both apps' helpers, 9 checks each
node scripts/verify/leadSource-export.test.mjs

# live: real folder exports against the engine
node scripts/verify/csv-export-rule.cjs cmd_mweho7rc
node scripts/verify/csv-export-rule.cjs master_sweep_mwczy875
```

Expected shape of a live pass:

```
export cmd_mweho7rc: HTTP 200 (51955 bytes)
rule checks
  rows with mobile in Primary Phone : 85
  rows with empty Primary Phone     : 10
  rows with Secondary Phone numbers : 36
  landline in Primary Phone         : 0
  mobile without WhatsApp URL       : 0
  WhatsApp URL without mobile       : 0
landline-only rows: 4  -> primary "", secondary "0866 ...", type "STD Landline", whatsapp ""
PASS
```

The server CSV header changed `Alternate Numbers` → `Secondary Phone`. Any
spreadsheet template that reads that column by name needs the new header.
