# Paste-ready Apps Script build

**Generated — do not edit these files.** They are built from `../src/` by
`node tools/build-appsscript.mjs`. Edit the source and rebuild.

Three files go into one Apps Script project:

| This file | Goes in Apps Script as |
|---|---|
| `Code.gs` | a Script file named **Code** |
| `Sidebar.html` | an HTML file named **Sidebar** (the name matters — `Code.gs` loads it by name) |
| `appsscript.json` | the manifest, via *Project Settings → Show "appsscript.json" in editor* |

Then, for vector mode only: **Services → + → Drive API → Add** in the editor.
Without it, vector inserts fail with a Drive 403.

See the repository README for the full walkthrough.
