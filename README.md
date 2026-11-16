# Bus Grammar

Learn English grammar in small steps, on the bus or at your desk. A responsive, offline-capable web app with Vietnamese explanations. Runs on Windows, macOS, Linux, iPhone and Android browsers.

> **Nguồn tài liệu: Huy Forum.** Ứng dụng được tạo chỉ nhằm mục đích học tập. Tài liệu gốc và nội dung ngữ pháp thuộc về Huy Forum.
>
> The source grammar document was taken from **Huy Forum (THE FORUM CENTER)**. This app is made solely for learning purposes. The original document and its grammar content belong to **Huy Forum**. See [ATTRIBUTION.md](ATTRIBUTION.md).

## Features

- 26 lessons and 58 theory sections across six chapters, including all 12 tense forms.
- Grammar tables, worked English examples, Vietnamese explanations, common mistakes and self-checks.
- 2, 5 or 10-question sessions, with immediate feedback and no timer.
- Saved sessions, bookmarks, reading progress, search and category filters.
- Spaced review: 1, 2, 4, 8, 16 and up to 30 days after correct answers; missed questions are due immediately.
- English text-to-speech through the browser's available voices.
- Full 41-page original PDF with page references.
- Local progress export/import. No accounts, analytics or backend.

## Run on Windows

Double-click **Start-App.cmd**. It starts a local server using built-in Windows PowerShell and opens your browser at http://127.0.0.1:4173/.

Keep the terminal open while learning. Close it or press Ctrl+C to stop. No Node.js or package installation is required for this launcher.

If the port is occupied:

    powershell -NoProfile -ExecutionPolicy Bypass -File tools/Start-App.ps1 -Port 4174

You can also open web/index.html directly. The localhost launcher is preferred because browser progress storage is more consistent and service workers do not run on file URLs.

## Run, test and build with Node.js

Use Node.js 22 or newer. There are no external dependencies, so npm install is unnecessary.

    npm start
    npm test
    npm run build

The build copies the static app into **dist/** and generates a content-based offline cache version. Generated files are ignored by Git. Both local servers bind only to the local computer.

## Publish on GitHub Pages

The included workflow tests and builds the app on pull requests. Pushes to main also deploy **dist/** using GitHub Pages. Only the website files are published; the Windows launcher, tests and repository documentation stay outside the deployed website.

1. Create a **public** GitHub repository, for example bus-grammar. Leave the new repository empty: do not initialize it with a README, license or .gitignore.
2. From this project folder, connect the repository and push the prepared main branch:

       git remote add origin https://github.com/YOUR-USERNAME/bus-grammar.git
       git push -u origin main

3. On GitHub, open **Settings → Pages → Build and deployment → Source**, then select **GitHub Actions**. This workflow uses Actions, not the branch/root publishing option.
4. Open **Actions → Test and deploy GitHub Pages**. If the first run happened before Pages was enabled, select **Run workflow** to run it again.
5. After deployment succeeds, the deploy job and Settings → Pages show the HTTPS address, normally https://YOUR-USERNAME.github.io/bus-grammar/.

For later updates, commit and push to main. GitHub runs the checks and publishes the updated website. No server or custom domain is needed. See [GitHub's workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

The repository is prepared locally; no GitHub remote, public repository or live deployment has been created by this setup. Publishing makes the website files, lessons and source PDF publicly accessible. Learning progress remains in each visitor's browser.

## Deployment troubleshooting

If configure-pages reports **Resource not accessible by integration**:

1. Set **Settings → Pages → Build and deployment → Source → GitHub Actions**.
2. Ensure the workflow is the current version: Configure Pages runs in the deploy job, which has pages: write. The build job only tests, builds and uploads the artifact.
3. Push the workflow fix to main and start the new run. Re-running an older failed run uses its original workflow, so it will not pick up a later fix.
4. If an organization policy restricts workflow tokens or Pages, a repository/organization administrator must allow the deployment.

Automatic Pages enablement is not used: the action requires an additional token for enablement, so the normal setup uses the repository Settings page.

## Install on iPhone

1. Open the deployed HTTPS address in **Safari**.
2. Choose **Share → Add to Home Screen**. Enable **Open as Web App** if offered.
3. Launch the home-screen app while connected. Wait for **Sẵn sàng ngoại tuyến** before disconnecting.
4. Learn on the bus without needing your PC, a Mac or an Apple developer account.

The service worker caches the interface, theory, questions, icons and full PDF. A PC localhost address is not reachable from your iPhone. Speech may require an installed English voice for offline use.

Progress is stored separately per browser and website address; it does not sync automatically. Export progress from **Tiến độ** to move between devices or keep a backup. Import replaces the current browser's progress after confirmation and closes the previous practice session. Browser storage may be cleared or evicted by the browser.

After an update, refresh the app. If an older version is still displayed, wait for the service worker update and refresh once more.

## Project structure

    .github/workflows/pages.yml  Automated tests, build and Pages deployment
    web/                        Website source and bundled learning material
    tools/build.mjs             Static build and offline cache versioning
    tools/serve.mjs             Optional Node.js local server
    tools/Start-App.ps1          Windows local server
    tools/test-web.mjs          Content and behavior regression checks
    Start-App.cmd               One-click Windows launcher
    ATTRIBUTION.md              Credit to Huy Forum

## Content and attribution

Lessons summarize the six parts of Huy Forum's 41-page grammar document. The PDF in web/grammar-source.pdf is unchanged. The 26 questions are adapted practice, not a complete transcription of every exercise. Theory includes additional examples and clarifications, such as compound predicates in simple sentences and context-dependent tense choices and collective-noun agreement.

Credit to Huy Forum appears in the app footer, source references and app information. Attribution does not grant a license to the original material; this repository does not claim ownership of Huy Forum's document or grammar content.

## Verification

Tests cover all 26 theory topics and 58 sections, chapter navigation, answer checking, duplicate-answer protection, saved-session resume and option order, review scheduling, bookmarks, reading progress, search/filter behavior, invalid or denied storage, offline caching and PDF byte ranges. The PDF's original SHA-256 hash and 41-page count are verified.

The Windows server and static file responses have been checked locally. Tests use a DOM adapter and cache adapter. Visual rendering, actual iPhone installation, speech and airplane-mode behavior have not been verified on a real browser/device in this environment.
