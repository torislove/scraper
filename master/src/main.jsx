import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import 'leaflet/dist/leaflet.css'
import App from './App.jsx'
import { IS_DESKTOP } from './desktop'
import { installChunkErrorRecovery } from './v2/lazyRetry'

installChunkErrorRecovery()

// The Windows shell is a product, not a website.
if (IS_DESKTOP) {
  document.title = 'Scraper — Lead Intelligence'
}

const rootEl = document.getElementById('root')
try {
  createRoot(rootEl).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
} catch (err) {
  console.error('Master boot mount error:', err)
  if (rootEl) {
    const wrap = document.createElement('div')
    wrap.style.cssText = 'min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,sans-serif;background:#070b14;color:#f8fafc'
    const card = document.createElement('div')
    card.style.cssText = 'max-width:440px;background:#0f172a;border:1px solid rgba(167,139,250,0.35);border-radius:16px;padding:24px;text-align:center;box-shadow:0 12px 30px rgba(0,0,0,0.45)'
    const h = document.createElement('h2')
    h.style.cssText = 'margin:0 0 8px;font-size:18px;color:#fda4af'
    h.textContent = 'Master Workspace failed to start'
    const p = document.createElement('p')
    p.style.cssText = 'margin:0 0 16px;font-size:13px;color:#94a3b8'
    p.textContent = err?.message || 'Unexpected startup error.'
    const btn = document.createElement('button')
    btn.style.cssText = 'background:#7c3aed;color:#fff;border:none;border-radius:10px;padding:10px 20px;font-weight:700;cursor:pointer'
    btn.textContent = 'Reload Master Workspace'
    btn.onclick = () => window.location.reload()
    card.append(h, p, btn)
    wrap.append(card)
    rootEl.replaceChildren(wrap)
  }
}
