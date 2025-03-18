<p align="center">
  <img
    height="30%"
    width="30%"
    src="src/img/logo.svg"
    alt="Favicon Packs logo"
    title="Favicon Packs logo"
  />
</p>

# Favicon Packs

[![Javascript Style Guide](https://img.shields.io/badge/code_style-standard-f3df49)](https://standardjs.com)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

This is a [browser extension](https://en.wikipedia.org/wiki/Browser_extension) to apply icon packs as [favicons](https://en.wikipedia.org/wiki/Favicon).

## Features

- [x] Choose from over 10,000 icons (Ionicons, Font Awesome, Lucide, Tabler)
- [x] Easily add domains or patterns for more advanced matching
- [x] Custom colors for light & dark themes
- [x] Guards against favicon hijacking (e.g. Notion)
- [x] Convenient copy to clipboard buttons help keep track of values
- [x] Selectable rows allow for bulk updates
- [x] Create catch-alls or categories using the priority ordering
- [x] Upload images as a backup option
- [x] Import and export for sharing between devices
- [x] No tracking or analytics
- [x] Simple JS + HTML + CSS implementation for easy auditing

## FAQ

- Why these icons?

  - I made this to recreate the easy favicon swapping of a discontinued browser that used Ionicons. Others were added for convenience.

- Can my favorite icon pack be added? <small>_(last updated: March 2025)_</small>

  - Bootstrap
    - Not right now. It may be possible [in the future](https://github.com/twbs/icons/pull/2114).
  - Iconoir
    - Not right now. It may be possible [in the future](https://github.com/iconoir-icons/iconoir/issues/398).
  - Remix Icon
    - Not right now. It may be possible [in the future](https://github.com/Remix-Design/RemixIcon/pull/979).
  - Heroicons
    - Not right now. It's pretty small.
  - Boxicons
    - Not right now. It's missing support for sprites and tags.
  - Material Symbols
    - No. It is smaller, marketed toward enterprise, and made by a mega-corporation that may deprecate it at any time.
  - Something else
    - Generally speaking, it needs to have a public CDN to fetch all icons in bulk (sprite or symbols or SVGs). The same goes for tags which enable search. CSS or font-based solutions are not compatible.
    - Uploading your own files is always an option!

- What about Chromium browsers?

  - I don't have plans to port this due to Google's manifest v3 rollout. It's harmful and anti-competitive. I recommend reading [this article from EFF](https://www.eff.org/deeplinks/2021/12/chrome-users-beware-manifest-v3-deceitful-and-threatening). I'm a big fan of [Zen Browser](https://zen-browser.app/) at the moment.

## Contributing

This was built using Visual Studio Code and includes a `.vscode` directory with settings that enable auto-formatting on JS and HTML files.

## Credits

- Icon packs

  - [Ionicons](https://ionic.io/ionicons)

  - [Font Awesome](https://fontawesome.com)

  - [Lucide](https://lucide.dev)

  - [Tabler](https://tabler.io/icons)

- Web components: [Shoelace](https://shoelace.style)

- Logo: inspired by [shapez](https://shapez.io)
