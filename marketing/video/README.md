# A real project with Designome

A 46-second Remotion film about the creator's actual workflow: finding a dashboard screenshot, extracting and accepting its design grammar, installing the guidance, asking an agent to build Glane, a personal YouTube downloader, and adapting its palette while keeping shared rules across screens.

The film uses English first-person captions, an English Glane interface and no audio. It renders two independently composed layouts:

- `Glane-16x9`: 1920 × 1080, 30 fps, 1,380 frames.
- `Glane-9x16`: 1080 × 1920, 30 fps, 1,380 frames.

## Prepare

Use Node.js 24+, pnpm 11.5.2 and FFmpeg/ffprobe. This directory is a separate pnpm project; its dependencies do not enter the Designome runtime or skill bundle.

```bash
cd marketing/video
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
# Before applying the product palette, preserve the original app captures.
pnpm capture --reference /absolute/path/to/reference.png --app-url http://localhost:3000 --save-baseline
# Apply the owner-approved ink-blue palette, rebuild/restart the target app, then recapture.
pnpm capture --reference /absolute/path/to/reference.png --app-url http://localhost:3000
```

The supplied reference is the creator's 2048 × 1714 Fincai PNG, saved from [Rakibul Ism's post on X](https://x.com/rakibulism/status/2095169274444964079/photo/1). The matching design is credited to Rakibul Ism on [Dribbble](https://dribbble.com/shots/27102507-Fincai-AI-Powered-Personal-Finance-Dashboard-SaaS-UI-UX-Design). `src/Shots.tsx` defines explicit source-pixel bounds for the full interface and two complete summary cards. The author is credited whenever the reference appears. The image keeps its existing detail; the film does not claim to restore information missing from the source. Capture rejects a reference with different dimensions; changing it requires reviewing the bounds and evidence.

For an existing browser, set `VIDEO_BROWSER=/absolute/path/to/chrome` for capture and render commands. Omit it to use Playwright's installed browser for capture and Remotion's managed browser for rendering.

The capture script only navigates to Glane's dashboard and history. It blocks API mutations and applies temporary browser styles. It applies a 5 CSS-pixel blur only to title/channel text, filename text and the latest-added title. Thumbnails, row geometry, metadata and controls remain visible, as requested by the creator. It checks the expected English table headers and every private text slot before saving. The blur must also be reviewed in the actual encoded exports. The labelled library excerpt retains exactly five complete data rows and omits date-group headings; its total count remains the application's actual count. Application source and stored content are not modified. Review the saved images before rendering; a future Glane layout change may need updated selectors.

`public/`, `review/`, `bundle/` and `output/` are ignored. Never commit reference screenshots, app captures or rendered videos. Publication rights for the third-party reference remain `unknown`: a public post and attribution do not establish permission for promotional reuse.

## Image quality and motion

Glane is captured at a 1440 × 1500 CSS-pixel viewport with device scale factor 3. The six current lossless PNGs include an overview ending below both complete analysis panels, a complete composer, a complete chart, two dashboard summary cards, two history summary cards, and a five-row library excerpt. Two additional palette-preview captures show the current English dashboard and cards with the earlier color tokens applied temporarily in the browser. This localizes the comparison; these are not historical screenshots. Capture records their pixel dimensions, framing, privacy checks, and SHA-256 hashes. Rendering verifies every capture and the reference hash first.

Shots retain their natural aspect ratio. There are no fixed-height browser windows, continuously scaled screenshots, or rotated screenshot stacks. The portrait result uses the complete composer as a close-up; the landscape result places the complete composer and activity panel side by side at a larger reading size. Earlier overview shots establish their place in the actual app. Comparison shots show complete cards, with an explicit detail label.

The motion treatment is `proposed`: staggered text reveals, damped entrances, drawn connectors and checks, sequential grammar diagrams, a brief entering the project folder, a result reveal, a before/after palette wipe, color swatches filling in sequence, shared-rule connections between two real screens, and travelling paper transitions. All motion is derived from Remotion frames. Screenshot positions settle on whole pixels; the UI remains still during reading holds. Exports use PNG frames, H.264 CRF 14 and BT.709 color, with no audio stream.

## Preview and render

```bash
pnpm typecheck
pnpm studio
pnpm render --stills
pnpm render
pnpm verify
```

The Studio starts on port 3105. Both videos render by default. Use `pnpm render --format=9x16` or `pnpm render --format=16x9` for one composition. Set `VIDEO_OUTPUT_DIR` to choose an export directory, including when running `verify`.

`render` checks the privacy report and capture hashes before bundling. `verify` checks both outputs with ffprobe, requires zero audio streams, checks the codec, pixel format, dimensions, frame count and duration, and fully decodes each MP4. The resulting `verification.json` records those mechanical checks. Visual review is separate: inspect reading time, frame boundaries, privacy, crops and mobile legibility.

The compositions use frame-based animation and locally bundled fonts. No external resource is fetched during the film. [Remotion's rendering documentation](https://www.remotion.dev/docs/cli/render) describes the CLI flags used by the render script.

## Story and evidence

| Time    | On-screen story                                   | Visual                                                                           |
| ------- | ------------------------------------------------- | -------------------------------------------------------------------------------- |
| 0–4 s   | I wanted my own YouTube downloader.               | Actual Glane dashboard                                                           |
| 4–9 s   | I found an interface I really liked.              | Credited Fincai reference                                                        |
| 9–14 s  | I asked Designome to extract its rules.           | Illustrated request and reusable grammar                                         |
| 14–18 s | I reviewed the rules. Then installed them.        | Brief entering the project                                                       |
| 18–23 s | Then I asked my agent to build my tool.           | Illustrated request and earlier-palette preview                                  |
| 23–29 s | Then I made it feel like Glane.                   | Request to change the theme, swatches and localized before/after palette preview |
| 29–35 s | And this is what I actually use.                  | Complete composer, activity panel and library with blurred titles                |
| 35–41 s | Different screens. One set of rules.              | Dashboard and history cards with the same product palette and recipe             |
| 41–46 s | A starting point I liked. A design I made my own. | Designome identity and repository link                                           |

Evidence status, confidence and limits:

- `observed`, high confidence: the creator described this personal use case and supplied the reference, application URL and previous films. The narrative follows that account; no exact original prompt wording is claimed.
- `observed`, high confidence: the running app has a dashboard and a history screen. Its local Designome brief identifies revision 2 as accepted; the canonical DNA and installation manifest are present. This is installation evidence, not a claim that every design rule passed an audit.
- `observed`, high confidence: the reference has four summary cards, quiet surfaces with fine borders, and one dark bar within a pale series. These qualities are also recorded in the installed brief. The film shortens their wording; it does not introduce exact pixel measurements or font identifications.
- `observed`, high confidence: the owner selected ink blue and light surfaces for Glane. The demonstration updates project-owned CSS overrides and product instructions, and the capture report measures the shared accent and card recipe on both routes. It is a new customization performed for this film, not a claim about the original generation session.
- `observed`, high confidence: the installed brief gives explicit product requests priority. The installer preserves the user-owned override file; generated CSS and accepted DNA remain managed. Codex and Claude Code instructions point to the product adaptation. This supports an editable starting point and a shared reference for future screens; it does not guarantee that an agent always follows every rule.
- `proposed`, high confidence as editorial intent: timing, first-person captions, illustrative chat messages, visual transitions and the shortened design sheet are new film treatments. They are not historical recordings of extraction, acceptance or generation. The workflow scenes carry an on-screen illustration label.
- `inferred`, medium confidence: opening on the creator's app and telling the story in first person makes this case more concrete than the previous general product explanation. Audience response remains untested.
- `observed`, high confidence: the supplied source post is published by `@rakibulism`; the matching Fincai design is credited to Rakibul Ism on Dribbble. Credit identifies the source and does not assert endorsement or a reuse license.
- `unknown`: the exact historical prompts, original generation duration, third-party publication permission, cause of TikTok's prior mute, and future reach. The film makes no claims about those points.

The current repository's README examples establish Designome's screenshot → grammar → accepted installation → agent generation workflow. The film shows this particular person's use of that workflow and does not generalize its visual result to every screenshot, model or product.

## Product adaptation boundary

The target project remains private and is not a visual evidence source for Designome extraction. Product colors belong in its `designome.overrides.css`, with durable instructions in project-owned documentation referenced by both agent entry points. They do not rewrite the source observations. A canonical DNA change needs a newly accepted revision; an audit against the original DNA must report the intentional palette deviation.

The film's render preflight requires English document language, the same ink-blue accent, active navigation treatment, card padding, card radius and body size on both captured routes. This verifies the demonstrated implementation, not universal agent compliance, full accessibility or automatic Tailwind theme mapping in every project. Frame-based chat prompts illustrate the request; actual screenshots show the result.

To recreate the localized earlier-palette preview after translating the app, pass
`--save-baseline --baseline-css /absolute/path/to/earlier-palette.css` to capture.
That CSS contains only the previously recorded token values and navigation
selection treatment; it is applied in the temporary capture browser. Capture
records its hash and labels the result `earlier-palette-on-current-english-app`.
Run capture again without either flag for the current product palette. Both
sets must have identical framing and verified text blur before rendering.
