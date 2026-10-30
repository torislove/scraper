/**
 * Dynamic Stateful Favicon Engine
 * Renders high-resolution animated icons onto an HTML5 canvas and updates
 * the browser's document favicon dynamically.
 *
 * States:
 * - 'idle': Default emerald radar icon
 * - 'scraping': Rotating radar sweep beam with live lead counter badge
 * - 'success': Cyber gold checkmark fanfare
 */

let animationFrame = null;
let currentAngle = 0;
let lastBadge = null;

function getFaviconLink() {
  let link = document.querySelector("link[rel*='icon']");
  if (!link) {
    link = document.createElement('link');
    link.type = 'image/svg+xml';
    link.rel = 'shortcut icon';
    document.getElementsByTagName('head')[0].appendChild(link);
  }
  return link;
}

export function setDynamicFaviconState(state = 'idle', count = 0) {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const link = getFaviconLink();
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }

  if (state === 'idle') {
    // Render static crisp emerald radar
    drawRadar(ctx, 0, false, 0);
    link.href = canvas.toDataURL('image/png');
    return;
  }

  if (state === 'success') {
    // Render gold success badge
    drawSuccess(ctx);
    link.href = canvas.toDataURL('image/png');
    return;
  }

  if (state === 'scraping') {
    // Start continuous rotating sweep animation
    function loop() {
      currentAngle = (currentAngle + 0.12) % (Math.PI * 2);
      ctx.clearRect(0, 0, 64, 64);
      drawRadar(ctx, currentAngle, true, count);
      link.href = canvas.toDataURL('image/png');
      animationFrame = requestAnimationFrame(loop);
    }
    loop();
  }
}

function drawRadar(ctx, angle, isScanning, count) {
  const cx = 32;
  const cy = 32;
  const r = 26;

  // Dark obsidian circular background
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, Math.PI * 2);
  ctx.fillStyle = '#0a0f1d';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = isScanning ? '#00f0ff' : '#10b981';
  ctx.stroke();

  // Radar grid concentric circles
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 9, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Crosshairs
  ctx.beginPath();
  ctx.moveTo(cx - 26, cy); ctx.lineTo(cx + 26, cy);
  ctx.moveTo(cx, cy - 26); ctx.lineTo(cx, cy + 26);
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  if (isScanning) {
    // Rotating radar sweep cone
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + 0.7);
    ctx.closePath();
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, 'rgba(0, 240, 255, 0.8)');
    grad.addColorStop(1, 'rgba(0, 240, 255, 0.05)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Sweep line
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle + 0.7) * r, cy + Math.sin(angle + 0.7) * r);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Glowing center blip
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fillStyle = isScanning ? '#fbbf24' : '#10b981';
  ctx.fill();

  // Badge notification count if leads found
  if (count > 0) {
    ctx.beginPath();
    ctx.arc(48, 16, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#10b981';
    ctx.fill();
    ctx.strokeStyle = '#0a0f1d';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(count > 99 ? '99+' : String(count), 48, 16);
  }

  ctx.restore();
}

function drawSuccess(ctx) {
  const cx = 32;
  const cy = 32;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#f59e0b';
  ctx.stroke();

  // Green checkmark
  ctx.beginPath();
  ctx.moveTo(20, 32);
  ctx.lineTo(28, 40);
  ctx.lineTo(44, 24);
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();

  ctx.restore();
}

