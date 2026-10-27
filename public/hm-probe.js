/* Part of the video player's DevTools check (see src/components/video-guard.ts). With the browser's developer tools
   open this statement pauses the page, which the player measures. Kept as a plain file because the build removes
   `debugger` statements from bundled code. */
window.__hmProbe = function () { debugger; };
