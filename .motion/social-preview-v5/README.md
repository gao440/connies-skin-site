# Connie’s Skin animated link preview

An original 10-second, silent, 1200 × 630 film at 60 fps, made for the website’s
Apple Messages link preview. Only the homepage sharing metadata changes.

## Direction

The site’s ivory, mint, deep teal, Georgia headlines, current app icon and liquid
glass motif carry the identity. One lens and one phone move continuously through
three beats: welcome, routine, and personal daily rhythm. The first and last poses
match. Routine cards have staggered springs and sequential checkmarks. The current
app capture supplies the real welcome interaction, screenshots and product photos;
the expanded routine is explicitly marked as an illustrative example.

Typography carries the message at small card sizes; detailed app labels are
secondary. The film makes no clinical scores, treatment, or improvement claims.
The static poster is the complete final composition, so a still preview also works.

Craft references supplied by the user:

- [UI Motion Loop](https://github.com/yihui-dev/awesome-opus5-5-videos/blob/main/prompts/flxrnc-251921.md): continuous geometry, paced springs, matched closing pose.
- [GSAP Frame Checking](https://github.com/yihui-dev/awesome-opus5-5-videos/blob/main/prompts/fleyta88-443662.md): hierarchy, stagger and close inspection around each transition.
- [SaaS Launch Video](https://github.com/yihui-dev/awesome-opus5-5-videos/blob/main/prompts/screeendev-981790.md): current product states, purposeful camera motion.
- [Brand Teaser](https://github.com/yihui-dev/awesome-opus5-5-videos/blob/main/prompts/utsavchopra30-560359.md): derive identity from the real site.

The code and glass artwork are original. Reference videos/code are not redistributed.

## Rebuild

Requires Node.js, FFmpeg and the pinned packages in `package.json`. Run `npm install`
then `npm run render` from this directory. The source uses system Georgia and
Helvetica Neue; the approved export was rendered on macOS. Rendering elsewhere
requires reviewing font metrics. All frame state is deterministic; there are no
wall-clock animations or unseeded randomness.

Extract the poster from the final public encode:

```sh
ffmpeg -y -ss 7.5 -i ../../assets/social-preview-v5.mp4 -frames:v 1 -q:v 2 -update 1 ../../assets/social-preview-v5.jpg
```

The site uses a direct HTTPS MP4 in `og:video` and preserves a JPEG fallback in
`og:image` and `twitter:image`. H.264, 4:2:0, Rec.709, no audio track, and a front
`moov` atom keep playback broadly compatible and downloads small. Associated
preview resources must remain below Apple’s 10 MB total limit.

## Review

Review the encoded film at 4 fps across the entire duration and at 10 fps around
all three transitions. Also inspect at 320-pixel card width. Keep titles from
overlapping during transitions and keep the phone hardware/status strip fixed
while content moves. Compare the final and first frames for a smooth loop.

Browser QA uses a local video page with controls and observes reduced-motion
preferences. No autoplaying player is added to the public homepage. Messages
controls playback of the shared preview, including user motion preferences.
An Apple LinkPresentation metadata check can verify video discovery; it is not
a substitute for a real Messages send/receive test.

[Apple preview requirements](https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages)

Local render intermediates and QA sheets are ignored; only source assets and
the approved small MP4/JPEG are versioned.
