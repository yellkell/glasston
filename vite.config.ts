import { defineConfig } from 'vite';
import { iwsdkDev } from '@iwsdk/vite-plugin-dev';

// IWSDK's dev plugin injects the IWER WebXR emulator so the game can be
// flown in a desktop browser (WASD + mouse) without a headset. On a real
// Quest browser it stays out of the way and the native WebXR session is used.
// `injectOnBuild` keeps the emulator in the production bundle too, so the
// GitHub Pages preview is explorable on a desktop with no headset.
export default defineConfig(({ command }) => ({
  // GitHub Pages serves from https://<user>.github.io/glasston/, so production
  // assets must be requested under that sub-path. `npm run dev` stays at root.
  base: command === 'build' ? '/glasston/' : '/',
  plugins: [
    iwsdkDev({
      // Emulate a Quest 3 device profile in dev *and* in the deployed preview.
      // `activation: 'always'` lets the emulator run on the public github.io
      // host (default is localhost-only); real Quest browsers are still skipped
      // via the built-in /OculusBrowser/ user-agent exception, so they get
      // native WebXR instead.
      emulator: { device: 'metaQuest3', injectOnBuild: true, activation: 'always' },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'esnext',
  },
}));
