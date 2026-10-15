import { defineConfig } from 'vite';

// base './' — збірка відкривається з будь-якого шляху (Stake Engine хостить статику під своїм префіксом).
export default defineConfig({
  base: './',
  server: { port: 5180, strictPort: true },
  build: { target: 'es2020', outDir: 'dist' },
});
