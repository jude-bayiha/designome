# A real project with Designome

A 42-second Remotion film about the creator's actual workflow: finding a dashboard screenshot, extracting and accepting its design grammar, installing the guidance, and asking an agent to build Glane, a personal YouTube downloader.

The film uses English first-person captions and no audio. It renders two independently composed layouts:

- `Glane-16x9`: 1920 × 1080, 30 fps, 1,260 frames.
- `Glane-9x16`: 1080 × 1920, 30 fps, 1,260 frames.

## Prepare

Use Node.js 24+, pnpm 11.5.2 and FFmpeg/ffprobe. This directory is a separate pnpm project; its dependencies do not enter the Designome runtime or skill bundle.

```bash
cd marketing/video
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm capture --reference /absolute/path/to/reference.png --app-url http://localhost:3000
```

The supplied reference is the creator's 1720 × 1440 Fincai screenshot. `Reference` in `src/Film.tsx` crops its presentation backdrop using the visible UI bounds. A different reference requires checking those bounds and updating the story's evidence.

For an existing browser, set `VIDEO_BROWSER=/absolute/path/to/chrome` for capture and render commands. Omit it to use Playwright's installed browser for capture and Remotion's managed browser for rendering.

The capture script only navigates to Glane's dashboard and history. It blocks API mutations and applies temporary browser styles. It masks video title cells, filename cells, the latest-added title, and every thumbnail. It checks the expected table structure and privacy styles before saving. Application source and stored content are not modified. Review both saved images before rendering; a future Glane layout change may need updated selectors.

`public/`, `review/`, `bundle/` and `output/` are ignored. Never commit reference screenshots, app captures or rendered videos. The reference is supplied by the creator; third-party authorship and publication rights have not been independently established.

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

| Time    | On-screen story                                | Visual                                                   |
| ------- | ---------------------------------------------- | -------------------------------------------------------- |
| 0–4 s   | I wanted my own YouTube downloader.            | Actual Glane dashboard, visible from the first frame     |
| 4–9 s   | I found an interface I really liked.           | The supplied screenshot                                  |
| 9–15 s  | I asked Designome to extract its design.       | Illustrated request and three source-supported qualities |
| 15–20 s | I reviewed the rules. Then installed them.     | Illustration of the installed design brief               |
| 20–25 s | Then I asked my agent to build my tool.        | Illustrated request, then actual app capture             |
| 25–32 s | And this is what I actually use.               | Actual dashboard and masked library                      |
| 32–37 s | A different app. The same design language.     | Reference and result together                            |
| 37–42 s | From an interface I liked to a tool of my own. | Designome identity and repository link                   |

Evidence status, confidence and limits:

- `observed`, high confidence: the creator described this personal use case and supplied the reference, application URL and previous films. The narrative follows that account; no exact original prompt wording is claimed.
- `observed`, high confidence: the running app has a dashboard and a history screen. Its local Designome brief identifies revision 2 as accepted; the canonical DNA and installation manifest are present. This is installation evidence, not a claim that every design rule passed an audit.
- `observed`, high confidence: the reference has four summary cards, quiet surfaces with fine borders, and one dark bar within a pale series. These qualities are also recorded in the installed brief. The film shortens their wording; it does not introduce exact pixel measurements or font identifications.
- `proposed`, high confidence as editorial intent: timing, first-person captions, illustrative chat messages, visual transitions and the shortened design sheet are new film treatments. They are not historical recordings of extraction, acceptance or generation. The workflow scenes carry an on-screen illustration label.
- `inferred`, medium confidence: opening on the creator's app and telling the story in first person makes this case more concrete than the previous general product explanation. Audience response remains untested.
- `unknown`: the exact historical prompts, original generation duration, third-party reference authorship, cause of TikTok's prior mute, and future reach. The film makes no claims about those points.

The current repository's README examples establish Designome's screenshot → grammar → accepted installation → agent generation workflow. The film shows this particular person's use of that workflow and does not generalize its visual result to every screenshot, model or product.
