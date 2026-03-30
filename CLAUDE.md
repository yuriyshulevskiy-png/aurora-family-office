# CLAUDE.md — Conviction Portfolio Design System
## Stack
- React + Vite + Tailwind CSS
- Recharts for data visualization
- Lucide React for icons (always w-4 h-4 inline, w-5 h-5 standalone)
- Zustand for state
## Design principles
- Data-dense, Bloomberg terminal aesthetic
- Dark theme only
- No decorative elements, no gradients except data encoding
- Monospace for all numbers
- Compact rows — every pixel earns its place
- No shadows anywhere — borders only
## Color system
- Background base:    bg-zinc-950
- Card surface:       bg-zinc-900
- Border:             border-zinc-800 (always 0.5px or border utility)
- Text primary:       text-zinc-100
- Text secondary:     text-zinc-400
- Text muted:         text-zinc-600
- Bullish:  text-emerald-400 / bg-emerald-950 / border-emerald-800
- Bearish:  text-red-400     / bg-red-950     / border-red-800
- Neutral:  text-amber-400   / bg-amber-950   / border-amber-800
- Info:     text-blue-400
## Typography
- Font: Inter, fallback system-ui
- All numbers: className="font-mono tabular-nums"
- Headings: font-medium (500) only — never font-bold (700)
- Section labels: text-xs text-zinc-400 uppercase tracking-wider
- Values: text-sm font-mono text-zinc-100
## Component patterns
### Metric card
<div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
  <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Label</p>
  <p className="text-2xl font-mono font-medium text-zinc-100">$0.00</p>
  <p className="text-xs text-emerald-400 mt-1">+2.4% today</p>
</div>
### Data table row
- Height: h-11 (44px)
- Hover: hover:bg-zinc-800/50
- Border bottom: border-b border-zinc-800/50
- Cell padding: px-4 py-2.5
### Badge / pill
<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
  Bullish
</span>
### Conviction bar
- Track: bg-zinc-800 rounded-full h-1.5 w-full
- Fill: dynamic width %, color by score:
  score > 65  → bg-emerald-500
  score 40-65 → bg-amber-500
  score < 40  → bg-red-500
### Sidebar nav item
- Active:   bg-zinc-800 text-zinc-100
- Inactive: text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50
- Height h-9, px-3, rounded-md, flex items-center gap-2
### Button — primary
<button className="h-9 px-4 rounded-md bg-zinc-100 text-zinc-900 text-sm font-medium hover:bg-zinc-200 transition-colors duration-150 active:scale-[0.98]">
  Action
</button>
### Button — secondary
<button className="h-9 px-4 rounded-md border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800 transition-colors duration-150 active:scale-[0.98]">
  Action
</button>
### Loading skeleton
<div className="animate-pulse bg-zinc-800 rounded h-4 w-24" />
### Empty state
<div className="flex flex-col items-center justify-center py-16 text-zinc-500">
  <Icon className="w-8 h-8 mb-3 opacity-40" />
  <p className="text-sm">No data yet</p>
</div>
### Alert card
<div className="bg-zinc-900 border border-red-800/50 rounded-lg p-4 flex items-start gap-3">
  <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
  <div>
    <p className="text-sm font-medium text-zinc-100">Title</p>
    <p className="text-xs text-zinc-400 mt-0.5">Description</p>
  </div>
</div>
## Spacing
- Section gap: space-y-6
- Card padding compact: p-4
- Card padding spacious: p-6
- Between label and value: mb-1
- Icon + text gap: gap-2
- Table cell: px-4 py-2.5
## Layout
- Sidebar: w-56 fixed left, full height, bg-zinc-900 border-r border-zinc-800
- Main: ml-56 min-h-screen bg-zinc-950 p-6
- Max content width: max-w-7xl mx-auto
- Card grid: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4
- Metrics row: grid grid-cols-2 lg:grid-cols-4 gap-4
## Number formatting — always use helpers from /src/utils/formatting.js
- Money:       formatCurrency(value)    → Intl.NumberFormat 'currency' USD
- Percent:     formatPercent(value)     → value.toFixed(2) + '%'
- Large nums:  formatCompact(value)     → Intl.NumberFormat notation:'compact'
- Positive P&L always prefixed with "+"
- Positive P&L: text-emerald-400
- Negative P&L: text-red-400
## Animation
- Transitions: transition-colors duration-150 only
- Button press: active:scale-[0.98]
- Price flash on update: briefly add text-yellow-400 class, remove after 600ms
- No other animations
## Rules — never do these
- No box-shadow anywhere
- No backdrop-blur
- No bg-gradient except conviction bar fill
- No font-bold (700) anywhere
- No rounded-full on non-circular elements
- No colored card backgrounds — zinc-900 only
- No inline styles — Tailwind classes only
- No placeholder Lorem ipsum text
## How to apply a design change
When asked to restyle or update the UI:
1. Update this CLAUDE.md first if the change is systemic (new color, new pattern)
2. Apply changes consistently across ALL components, not just the one mentioned
3. Never mix old and new patterns in the same file
4. After restyling, verify: dark theme works, numbers are monospace, borders not shadows
## Alternative themes available on request
Say "switch to [theme]" to apply a different visual system:
### theme: "terminal-green"
- Base: bg-black
- Cards: bg-zinc-950
- Accent: text-green-400 / border-green-900
- Numbers: font-mono text-green-300
- Bullish: text-green-400, Bearish: text-red-400, Neutral: text-yellow-400
### theme: "arctic"
- Base: bg-slate-950
- Cards: bg-slate-900
- Border: border-slate-700
- Text: text-slate-100 / text-slate-400
- Accent: text-cyan-400
- Bullish: text-teal-400, Bearish: text-rose-400, Neutral: text-sky-400
### theme: "warm-dark"
- Base: bg-stone-950
- Cards: bg-stone-900
- Border: border-stone-700
- Text: text-stone-100 / text-stone-400
- Accent: text-orange-400
- Bullish: text-lime-400, Bearish: text-red-400, Neutral: text-amber-400
### theme: "high-contrast"
- Base: bg-black
- Cards: bg-neutral-900
- Border: border-white/20
- Text: text-white / text-neutral-300
- Accent: text-white
- Bullish: text-green-300, Bearish: text-red-300, Neutral: text-yellow-300
- All borders: 1px (not 0.5px)
