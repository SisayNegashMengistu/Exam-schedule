// Keeps public/pdf.worker.min.mjs in sync with the installed pdfjs-dist version (used for reading course-breakdown PDFs).
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
const src = 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs'
if (existsSync(src)) { mkdirSync('public', { recursive: true }); copyFileSync(src, 'public/pdf.worker.min.mjs') }
