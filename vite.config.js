import { defineConfig } from 'vite';

export default defineConfig({
  // reponme
  base: '/your-repo-name/', 
  
  build: {
    //makes sure your build is optimized
    outDir: 'dist',
  },
  server: {
    port: 3000,
  }
});