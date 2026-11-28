import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@shared/design/tokens.css'
import './index.css'
import App from './App.jsx'
import { IS_DESKTOP } from './desktop'
import { installChunkErrorRecovery } from './v2/lazyRetry'
import './firebase'

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
    wrap.style.cssText = 'min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a'
    const card = document.createElement('div')
    card.style.cssText = 'max-width:440px;background:#ffffff;border:1.5px solid #e2e8f0;border-radius:18px;padding:24px;text-align:center;box-shadow:0 16px 36px -14px rgba(15,23,42,0.18)'
    const h = document.createElement('h2')
    h.style.cssText = 'margin:0 0 8px;font-size:18px;color:#be123c'
    h.textContent = 'Master Workspace failed to start'
    const p = document.createElement('p')
    p.style.cssText = 'margin:0 0 16px;font-size:13px;color:#475569'
    p.textContent = err?.message || 'Unexpected startup error.'
    const btn = document.createElement('button')
    btn.style.cssText = 'background:#059669;color:#fff;border:none;border-radius:10px;padding:10px 20px;font-weight:700;cursor:pointer'
    btn.textContent = 'Reload Master Workspace'
    btn.onclick = () => window.location.reload()
    card.append(h, p, btn)
    wrap.append(card)
    rootEl.replaceChildren(wrap)
  }
}
