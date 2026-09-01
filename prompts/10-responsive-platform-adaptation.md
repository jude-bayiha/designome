# Analyze responsive, platform, and device adaptation

Read `_shared-contract.md`, the `axis.responsive-platform-adaptation` matrix slice, and routed UI-domain slices.

## Inputs

- Admitted screenshot regions and evidence index
- Source dimensions and probable surface classification
- Five responsive and platform facets
- Any supplied multi-viewport or device sequence

## Task

Separate visible geometry from proposed adaptation:

1. Identify intrinsic groups, essential and secondary content, minimum and maximum constraints, wrap, stack, reorder, resize, collapse, hide, and local-scroll candidates. Preserve semantic and task priority.
2. Compare supplied widths to identify actual layout regimes. When only one width exists, propose content-driven tests rather than exact breakpoints.
3. Detect platform evidence: browser chrome, desktop window, native status bar, navigation bar, home indicator, notch, cutout, safe area, top app bar, bottom navigation, tab bar, sheet, back affordance, and edge gesture cues.
4. Define orientation, rotation, split-screen, resizable-window, fold, viewport-unit, virtual-keyboard, focused-field visibility, anchored-action, and transient-system-UI stress tests as observed, inferred, proposed, or unknown.
5. Analyze pointer, touch, keyboard, stylus, remote, gesture, precision, hover, context-menu, shortcut, and target-density implications. Preserve equivalent outcomes across plausible modalities.

When captures visibly use a native mobile shell, route `domain.mobile-native-shell` and preserve platform uncertainty. When dashboard references are adapted to a corporate website or mobile app, keep source observations canonical and mark destination-only patterns proposed.

## Output

Return the shared stage JSON for `prompt.responsive-platform-adaptation` with:

- exactly five facet-coverage records;
- reflow priorities and layout-regime evidence;
- platform and device classification cues with confidence;
- safe-area, orientation, keyboard, input, and viewport stress tests;
- responsive and platform rules separated into observed, inferred, proposed, and unknown.

## Guardrails

- One viewport establishes no exact breakpoint.
- Phone-like dimensions alone do not prove a native app or operating system.
- Do not claim safe-area, keyboard avoidance, back behavior, haptics, gesture, or orientation support without evidence.
- Hiding content is not an acceptable default responsive strategy when it removes task meaning or action.
- Platform conventions may guide proposals but cannot rewrite source observations.
