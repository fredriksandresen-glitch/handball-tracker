# Design Brief

## Direction

**REMA 1000-ligaen Player Tracker** — Energetic dark sports analytics dashboard with app-like card elevation, confident accent usage, and choreographed micro-interactions.

## Tone

Disciplined, action-oriented, data-forward. High contrast between surfaces. Every interaction (hover/press) signals responsiveness. Visual stats replace numeric-only readouts.

## Differentiation

Elevated card surfaces with sport-app energy — hover lift animation, press scale feedback. Progress bars and sparklines for stats. Cyan accent drives CTAs and highlights. Clean, spacious grid with sticky bottom navigation. No gradients or neon.

## Color Palette

| Token       | OKLCH             | Role                                |
| ----------- | ----------------- | ----------------------------------- |
| background  | 0.145 0.014 260   | Deep charcoal base                  |
| foreground  | 0.95 0.01 260     | Soft white text                     |
| card        | 0.22 0.014 260    | Elevated surface (increased contrast)|
| primary     | 0.78 0.18 190     | Vibrant cyan (accent highlight)     |
| accent      | 0.78 0.18 190     | Interactive CTA, form focus         |
| muted       | 0.22 0.02 260     | Secondary surface, stat bars        |
| destructive | 0.55 0.2 25       | Warm coral for warnings/alerts      |
| border      | 0.32 0.02 260     | Stronger dividers (increased contrast)|

## Typography

- Display: Space Grotesk — player names, headers (700 bold for emphasis)
- Body: DM Sans — stats, labels, metadata (400 regular)
- Scale: Hero `text-2xl font-bold`, H2 `text-lg font-semibold`, Label `text-xs font-semibold`, Stat `text-sm`

## Micro-Interactions

- **Hover**: Cards lift with scale-105, shadow-elevated, cursor-pointer
- **Press**: Cards scale-98, immediate feedback
- **Focus**: Ring-primary with rounded corners
- **Load**: Feed items fade-in 0.3s on scroll

## Structural Zones

| Zone        | Background    | Shadow         | Notes                              |
| ----------- | ------------- | -------------- | ---------------------------------- |
| Header      | card (0.22)   | shadow-subtle  | Sticky top, minimal chrome         |
| Feed Cards  | card (0.22)   | shadow-subtle  | card-hover on all clickable items  |
| Stats Area  | muted (0.22)  | —              | Progress bars + mini charts        |
| Footer/Nav  | card (0.22)   | shadow-subtle  | Sticky bottom mobile, 4 tabs       |

## Component Patterns

- **Cards**: 0.22 bg, shadow-subtle, rounded-lg, card-hover class (lift + scale on hover)
- **Buttons**: Primary accent bg, white text, rounded-md, active:scale-98, hover:shadow-elevated
- **Stats**: Progress bars (stat-bar class), sparklines for form, icons for goals/assists/cards
- **Badges**: Outline style (badge-outline) or muted fill with text-foreground
- **Loading**: Skeletons with pulse-soft animation

## Motion System

- **Transitions**: All interactive 0.3s smooth (cubic-bezier(0.4, 0, 0.2, 1))
- **Feed Load**: Cards slide-up 0.4s with fade-in stagger
- **Hover Feedback**: Immediate scale and shadow shift (0.15s quick)
- **No Decoration**: Motion is feedback-only, not decorative

## Constraints

- No gradients, no neon, no blur effects
- Text minimum 12px (body: text-sm DM Sans)
- All cards use card-hover for interactivity
- Stat bars use progress fills (not just numbers)
- Empty states visible, not hidden
- Sticky nav on mobile mandatory

## Signature Detail

Player cards elevate on hover with smooth lift animation. Stats displayed as progress bars + icons. Form shown as micro sparklines. Cyan accent used sparingly for CTAs and highlights, never dominant.
