# AnswerPace

AnswerPace is a lightweight desktop-first practice timer for UPSC Mains, State PSC Mains, and other administrative exam written rounds.

## Download

Download the latest Windows installer from the [AnswerPace Releases page](https://github.com/sams14/AnswerPace/releases).

## What It Does

- Upload a question file.
- Start a timed answer-writing session.
- Show one question at a time.
- Track total active test time and per-question time.
- Allow one pause of up to 15 minutes.
- Show final statistics.
- Export the attempt report as CSV.

## Current File Support

- `.txt`: supported.
- `.pdf`: best-effort support for simple text PDFs. Scanned PDFs and compressed/complex PDFs may need a later parser upgrade.

For the most reliable first version, use a plain text file like:

```txt
1. Discuss the role of ethics in public administration.
2. Examine the significance of federalism in India.
3. Critically analyse the impact of climate change on agriculture.
```

## Run Locally

Run:

```powershell
npm run serve:app
```

Then open:

```text
http://localhost:1420
```

## Build Windows App

The project includes Tauri packaging files. To build the Windows installer, install:

- Node.js 20+
- Rust stable toolchain
- Microsoft Visual Studio Build Tools / C++ build tools
- WebView2 Runtime, usually already available on modern Windows

Install Rust with either:

```powershell
winget install --id Rustlang.Rustup -e
```

or download it from:

```text
https://rustup.rs/
```

After installation, close and reopen PowerShell, then verify:

```powershell
cargo --version
rustc --version
```

Install Microsoft C++ Build Tools with:

```powershell
winget install --id Microsoft.VisualStudio.2022.BuildTools -e --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

After installation, close and reopen PowerShell, then verify:

```powershell
link
```

Then run:

```powershell
npm install
npm run tauri:build
```

The generated installer will appear under `src-tauri/target/release/bundle/`.

## GitHub Releases

The included GitHub Actions workflow can build a Windows installer when a tag like `v0.1.0` is pushed.

Published installers are available on the [AnswerPace Releases page](https://github.com/sams14/AnswerPace/releases).
