# Christmas Tunes

An offline music viewer for **New Christmas Praise** (Solo & 1st Cornet B♭). It shows one tune at a time, with its tempo marking and a tempo light.

**Open the app:** https://build-new-habits.github.io/christmas-music/

## How it works

- **The music is locked.** The book is © 1994 Salvationist Publishing & Supplies Ltd and Egon Publishers Ltd. The 115 cut-out tunes are in `music.enc`, encrypted with AES-256-GCM. The key comes from a password through PBKDF2-SHA256 with 600,000 rounds. The password is not stored anywhere in this repository or the app.
- **Unlocking a device:** the first time on each device, enter the password. The app downloads `music.enc` (about 8 MB) and decrypts it in the browser. It stores the tunes only on that device (IndexedDB), so the password isn't asked for again. Nothing is uploaded.
- **Using your own PDF instead:** the start screen can also cut the tunes from your own copy of the PDF, on the device.
- **The tune index** (`tunes.js`) holds numbers, titles, book pages, tempo markings, time signatures and crop positions.
- **Offline:** a service worker caches the app. Once the music is unlocked, the app works without the internet. On iPhone and iPad, add it to the Home Screen so Safari keeps the stored music.

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

`index.html`, `styles.css`, `app.js`: the app · `tunes.js`: tune index · `music.enc`: locked music · `sw.js`: offline cache · `vendor/pdfjs`: [PDF.js](https://mozilla.github.io/pdf.js/) 4.10.38 (Apache-2.0) · `fonts`: Atkinson Hyperlegible (SIL OFL).
