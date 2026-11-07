# Christmas Tunes

An offline music viewer for **New Christmas Praise** (Solo & 1st Cornet B♭). It shows one tune at a time, with its tempo marking and a tempo light.

**Open the app:** https://build-new-habits.github.io/christmas-music/

## How it works

- **The book is not in this repository.** The book is © 1994 Salvationist Publishing & Supplies Ltd and Egon Publishers Ltd. On first use, choose your own PDF copy. The app cuts out all 115 tunes in your browser and stores them only on that device (IndexedDB). Nothing is uploaded.
- **The repository holds only the index** (`tunes.js`): numbers, titles, book pages, tempo markings, time signatures, and the crop position of each tune on the page.
- **Offline:** a service worker caches the app. Once your PDF has been imported, the app works without the internet. On iPhone and iPad, add it to the Home Screen so Safari keeps the stored music.

## Using it

- Search by number (`78`, or `7` for every number starting with 7) or by words in the title (`bells`). Press Enter to open the first match.
- The tempo panel shows the marking, the beat note (crotchet, minim, dotted crotchet, quaver or dotted minim), the BPM, the time signature, and notes such as ranges, alternative markings or a faster chorus.
- The tempo light flashes once per beat, with a larger first dot for beat 1. A range uses its lower number.
- Arrow keys, Page Up and Page Down change tune, so a Bluetooth page-turner pedal works. Press `/` to jump to search.
- The panel button hides the side strip; a compact tempo and light then sit in the header. The fit button switches between fit-to-screen and fit-to-width.
- The screen is kept awake while the app is open, where the browser supports it.

## Accessibility

The app is built to WCAG 2.2 AA. It uses real buttons and labels, works fully from the keyboard, shows a visible focus ring and has touch targets of 44px or more. It supports light and dark modes and reduced motion, and announces tune changes to screen readers. Each score image has a text alternative giving the number, title and tempo.

## Files

`index.html`, `styles.css`, `app.js`: the app · `tunes.js`: tune index · `sw.js`: offline cache · `vendor/pdfjs`: [PDF.js](https://mozilla.github.io/pdf.js/) 4.10.38 (Apache-2.0) · `fonts`: Atkinson Hyperlegible (SIL OFL).
