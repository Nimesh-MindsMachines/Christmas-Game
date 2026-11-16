// Platzhalter-Logos, nachgebaut aus der OneMachine-App. Durch die offiziellen
// SVGs aus /public/brand/ ersetzen, sobald sie vorliegen.

export const LOGO_MARK = `
<svg class="logo-mark" viewBox="0 0 66 30" aria-hidden="true">
  <g fill="none" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6 6l9 9-9 9" stroke="var(--ink)"/>
    <path d="M24 6l9 9-9 9" stroke="var(--ink)"/>
    <path d="M42 6l9 9-9 9" stroke="var(--accent)"/>
  </g>
</svg>`;

/** Das [>]-Symbol – OneMachine als Agent im Chat. */
export const AGENT_ICON = `
<svg class="agent-icon" viewBox="0 0 64 64" aria-hidden="true">
  <rect x="6" y="6" width="52" height="52" rx="16" fill="var(--panel)" stroke="var(--ink)" stroke-width="5"/>
  <path d="M20 22l10 10-10 10" fill="none" stroke="var(--ink)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M32 22l10 10-10 10" fill="none" stroke="var(--accent)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const SANTA_HAT = `
<svg class="santa-hat" viewBox="0 0 40 30" aria-hidden="true">
  <path d="M4 24 C10 6, 24 0, 34 10 L30 14 C24 9, 18 12, 14 24 Z" fill="#d62f3a"/>
  <rect x="2" y="21" width="26" height="7" rx="3.5" fill="#fff" stroke="#e8e8ef"/>
  <circle cx="34" cy="11" r="4.5" fill="#fff" stroke="#e8e8ef"/>
</svg>`;

export const BRAND_HTML = `<span class="logo-wrap">${SANTA_HAT}${LOGO_MARK}</span><span class="brand-name">OneMachine</span>`;
