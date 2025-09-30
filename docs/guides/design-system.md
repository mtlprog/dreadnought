# Dreadnought Design System

## Philosophy: Retrofuturistic Brutalism

Dreadnought's visual language draws from 90s anime interfaces (Evangelion, Serial Experiments Lain, Ghost in the Shell, Bubblegum Crisis, Gundam) and cyberpunk aesthetics, creating a distinctive retrofuturistic brutalism that emphasizes function over form, information density, and deliberate visual roughness.

### Core Principles

1. **Functional Brutalism** - Every element serves a purpose; no decoration without function
2. **Cathode Display Aesthetic** - Terminal-like interfaces with monospace fonts
3. **Information Dense** - Complex layouts that reward attention, inspired by anime HUD designs
4. **Angular Geometry** - Sharp edges, zero rounded corners (border-radius: 0)
5. **High Contrast Clarity** - Stark relationships between background and foreground
6. **Oversized Elements** - Large, bold, commanding presence (min 48px touch targets)

## Tech Stack

- **Framework**: Next.js 15 with React 19
- **Styling**: Tailwind CSS v4 with CSS variables
- **Components**: shadcn/ui (Radix UI primitives)
- **Fonts**: Geist Sans & Geist Mono
- **Utilities**: class-variance-authority (CVA) for component variants

## Color System

### Approach

Instead of hardcoded palettes, use **CSS variables** with context-specific themes inspired by 90s anime interfaces. Each app can define its own palette while maintaining consistent variable names.

### Variable Structure (Tailwind v4)

```css
:root {
  /* Base colors */
  --background: <color>;
  --foreground: <color>;

  /* Semantic colors */
  --primary: <color>;
  --primary-foreground: <color>;
  --secondary: <color>;
  --secondary-foreground: <color>;

  /* Component colors */
  --card: <color>;
  --card-foreground: <color>;
  --border: <color>;
  --input: <color>;
  --ring: <color>;

  /* State colors */
  --muted: <color>;
  --muted-foreground: <color>;
  --destructive: <color>;
  --destructive-foreground: <color>;
  --hover: <color>;

  /* Retrofuturistic accents (optional) */
  --cyber-green: <color>;
  --electric-cyan: <color>;
  --warning-amber: <color>;
  --steel-gray: <color>;
}

/* Tailwind v4 theme mapping */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  /* ... map all variables */
}
```

### Example Palettes

**Evangelion Theme** (Purple/Green/Orange):
```css
:root {
  --background: #1a0d29;
  --foreground: #00ff41;
  --primary: #6b2e8f;
  --secondary: #ff6b00;
  --destructive: #ff0066;
  --cyber-green: #00ff41;
  --electric-cyan: #00ffff;
  --warning-amber: #ff6b00;
}
```

**Lain Theme** (Dark/Cyan/Red):
```css
:root {
  --background: #0a0a0a;
  --foreground: #00ffff;
  --primary: #ff0066;
  --secondary: #333333;
  --cyber-green: #00ff00;
  --electric-cyan: #00ffff;
  --warning-amber: #ff0066;
}
```

**Ghost in the Shell Theme** (Blue/Teal/Amber):
```css
:root {
  --background: #001a33;
  --foreground: #00d9ff;
  --primary: #00d9ff;
  --secondary: #ffaa00;
  --cyber-green: #00ff88;
  --electric-cyan: #00d9ff;
  --warning-amber: #ffaa00;
}
```

### Color Rules

- **Background**: Pure black or near-black for dark themes
- **Text**: High contrast white or bright colors
- **Accents**: Electric, saturated colors (cyan, green, red, pink, orange)
- **Minimum contrast**: 7:1 (AAA level)

## Typography

### Font Stack

```css
:root {
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

body {
  font-family: var(--font-mono); /* Monospace by default for terminal aesthetic */
}
```

### Type Scale (Tailwind Classes)

```tsx
/* Hero/Landing */
<h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter">

/* Headings */
<h2 className="text-4xl md:text-6xl font-bold uppercase tracking-wide">
<h3 className="text-2xl md:text-3xl font-bold uppercase tracking-wide">
<h4 className="text-xl font-bold uppercase">

/* Body */
<p className="text-base md:text-lg font-mono">
<p className="text-sm font-mono">

/* Technical/Data */
<code className="text-sm font-mono uppercase">
```

### Typography Rules

- **Headlines**: `uppercase tracking-wide` or `tracking-tighter`
- **Body**: `font-mono` for technical content
- **Weights**: `font-black` (900), `font-bold` (700), `font-normal` (400)
- **Letter spacing**: `tracking-wide` for labels, `tracking-tighter` for large text

## Component Patterns with shadcn/ui

### Button

```tsx
// apps/*/src/components/ui/button.tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center font-bold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-2 cursor-pointer disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-accent border-primary",
        outline: "border-border bg-background hover:bg-destructive hover:text-white",
        secondary: "bg-secondary text-secondary-foreground hover:bg-destructive hover:text-white border-secondary",
        ghost: "border-transparent hover:bg-destructive hover:text-white",
      },
      size: {
        default: "h-12 px-8 py-3 text-lg",
        sm: "h-10 px-6 py-2 text-base",
        lg: "h-16 px-12 py-4 text-xl",
        icon: "h-12 w-12",
      },
    },
  }
);

// Usage
<Button size="lg" className="uppercase tracking-wide">
  Launch App
</Button>
```

**Key features:**
- `border-2` - thick borders, no rounded corners
- `uppercase tracking-wide` - system message style
- `h-12` minimum (48px touch target)
- Hover states with color transitions

### Card

```tsx
// apps/*/src/components/ui/card.tsx
const Card = ({ className, ...props }) => (
  <div
    className={cn(
      "border-2 border-border bg-card text-card-foreground",
      className
    )}
    {...props}
  />
);

const CardHeader = ({ className, ...props }) => (
  <div
    className={cn("border-b-2 border-border bg-muted p-6", className)}
    {...props}
  />
);

const CardTitle = ({ className, ...props }) => (
  <h3
    className={cn(
      "text-2xl font-black text-primary uppercase tracking-wide",
      className
    )}
    {...props}
  />
);

// Usage
<Card>
  <CardHeader>
    <CardTitle>System Status</CardTitle>
    <CardDescription>Real-time metrics</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

**Key features:**
- `border-2` on card and sections
- `border-b-2` for section dividers
- `uppercase` titles
- `bg-muted` for headers/footers

### Input

```tsx
const Input = ({ className, ...props }) => (
  <input
    className={cn(
      "flex h-12 w-full border-2 border-input bg-input px-4 py-3 text-base font-mono",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
);

// Usage
<Input
  type="text"
  placeholder="G..."
  className="font-mono uppercase"
/>
```

**Key features:**
- `h-12` minimum height (48px)
- `font-mono` for technical input
- `border-2` thick borders
- Ring focus state

## Layout Patterns

### Page Structure

```tsx
export default function Page() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with border */}
      <header className="border-b-4 border-primary bg-background p-6">
        <div className="container mx-auto">
          <h1 className="text-6xl font-mono uppercase tracking-wider text-foreground">
            APP.NAME
          </h1>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          {/* Content */}
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
```

### Hero Section

```tsx
<section className="min-h-screen flex items-center justify-center border-b-4 border-primary">
  <div className="container mx-auto px-4 py-24">
    <div className="max-w-6xl mx-auto text-center space-y-12">
      {/* Huge headline */}
      <h1 className="text-6xl md:text-8xl font-black text-foreground uppercase tracking-tighter leading-none">
        Your Project
        <br />
        <span className="text-primary">On Stellar</span>
      </h1>

      {/* Description */}
      <p className="text-xl md:text-2xl text-muted-foreground font-mono">
        Decentralized crowdfunding powered by blockchain
      </p>

      {/* CTA buttons */}
      <div className="flex gap-6 justify-center">
        <Button size="lg">Get Started</Button>
        <Button size="lg" variant="outline">Learn More</Button>
      </div>
    </div>
  </div>
</section>
```

### Grid Layouts

```tsx
{/* Responsive grid */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <Card>...</Card>
  <Card>...</Card>
  <Card>...</Card>
</div>

{/* Info boxes */}
<div className="border-4 border-secondary bg-card p-12">
  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
    <div className="space-y-4">
      <div className="text-4xl font-black text-secondary">01</div>
      <h3 className="text-xl font-bold uppercase">Step One</h3>
      <p className="text-base font-mono text-muted-foreground">
        Description text
      </p>
    </div>
    {/* More steps */}
  </div>
</div>
```

## Spacing System

Use Tailwind's default spacing scale:

```tsx
{/* Component spacing */}
<div className="space-y-4">      {/* 16px vertical gap */}
<div className="space-y-6">      {/* 24px vertical gap */}
<div className="space-y-8">      {/* 32px vertical gap */}

{/* Padding */}
<div className="p-4">            {/* 16px all sides */}
<div className="p-6">            {/* 24px all sides */}
<div className="px-8 py-4">     {/* 32px horizontal, 16px vertical */}

{/* Margins */}
<div className="mt-8 mb-12">    {/* 32px top, 48px bottom */}
```

## Border System

### Border Widths

```tsx
{/* Thin borders (default) */}
<div className="border border-border">

{/* Medium borders (cards, inputs) */}
<div className="border-2 border-border">

{/* Thick borders (emphasis) */}
<div className="border-4 border-primary">

{/* Directional borders */}
<div className="border-b-2 border-border">  {/* Bottom only */}
<div className="border-t-4 border-primary"> {/* Top only */}
```

### Border Radius: ZERO

```tsx
/* ✅ Correct - no border-radius */
<div className="border-2 border-border">

/* ❌ Wrong - never use rounded */
<div className="rounded-lg border-2"> {/* DON'T DO THIS */}
```

## Mobile-First Design (CRITICAL)

### Philosophy

**ALWAYS test on mobile (375px width) FIRST before desktop.** Mobile users are often the majority, and retrofuturistic brutalism must work perfectly on small screens.

### Testing Workflow

**MANDATORY before every commit:**

1. **Resize browser to 375px × 667px** (iPhone SE size)
2. **Test all interactions** - buttons, forms, navigation
3. **Verify typography scales** - nothing too large or too small
4. **Check spacing** - no overflow or cramped layouts
5. **Test touch targets** - all interactive elements ≥ 48px
6. **Verify horizontal scroll** - should NEVER happen

**Browser DevTools:**
```bash
# Chrome/Edge: Cmd+Opt+I → Device Toolbar (Cmd+Shift+M)
# Firefox: Cmd+Opt+M → Responsive Design Mode
# Safari: Develop → Enter Responsive Design Mode
```

**Quick test devices:**
- iPhone SE (375px) - smallest common device
- iPhone 14 Pro (393px) - modern default
- Pixel 7 (412px) - Android reference

### Breakpoints (Tailwind defaults)

```css
/* Mobile-first: write mobile styles first, then scale UP */
       default  /* 0-639px - Mobile portrait */
sm:    640px   /* Mobile landscape */
md:    768px   /* Tablet portrait */
lg:    1024px  /* Tablet landscape / Small desktop */
xl:    1280px  /* Desktop */
2xl:   1536px  /* Large desktop */
```

### Mobile-First Patterns

**Typography Scaling (Progressive Enhancement):**

```tsx
{/* Start small, scale UP with breakpoints */}
<h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-8xl font-black uppercase">
  {/* Mobile: 30px → SM: 36px → MD: 60px → LG: 96px */}
</h1>

<p className="text-base sm:text-lg md:text-xl font-mono">
  {/* Mobile: 16px → SM: 18px → MD: 20px */}
</p>

<span className="text-sm md:text-base">
  {/* Mobile: 14px → MD: 16px */}
</span>
```

**Layout Transformations:**

```tsx
{/* Stack vertically on mobile, row on desktop */}
<div className="flex flex-col md:flex-row gap-4 md:gap-6">
  {/* Mobile: vertical stack with 16px gap */}
  {/* Desktop: horizontal row with 24px gap */}
</div>

{/* Grid adapts to screen size */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
  {/* Mobile: 1 column */}
  {/* SM: 2 columns */}
  {/* LG: 3 columns */}
</div>
```

**Spacing Adjustments:**

```tsx
{/* Reduce spacing on mobile to fit more content */}
<div className="p-4 md:p-6 lg:p-12">
  {/* Mobile: 16px → MD: 24px → LG: 48px */}
</div>

<section className="py-8 md:py-12 lg:py-24">
  {/* Mobile: 32px → MD: 48px → LG: 96px */}
</section>

{/* Container padding */}
<div className="container mx-auto px-4 md:px-6">
  {/* Mobile: 16px sides → MD: 24px sides */}
</div>
```

**Responsive Sizing:**

```tsx
{/* Icons/logos scale with viewport */}
<div className="w-8 h-8 md:w-12 md:h-12">
  {/* Mobile: 32px → MD: 48px */}
</div>

{/* Borders scale too */}
<div className="border-2 md:border-4">
  {/* Mobile: 2px → MD: 4px */}
</div>
```

**Touch-Friendly Buttons:**

```tsx
{/* Large touch targets on mobile */}
<Button className="h-12 px-6 text-base md:h-14 md:px-8 md:text-lg">
  {/* Mobile: 48px tall → MD: 56px tall */}
</Button>

{/* Full width on mobile, auto on desktop */}
<Button className="w-full md:w-auto">
  {/* Mobile: stretches full width */}
  {/* Desktop: width based on content */}
</Button>
```

**Conditional Rendering:**

```tsx
{/* Show simplified version on mobile */}
<div className="hidden md:block">
  {/* Complex desktop-only feature */}
  <DetailedChart />
</div>

<div className="block md:hidden">
  {/* Simplified mobile version */}
  <SimpleChart />
</div>

{/* Or conditionally simplify */}
<nav className="flex gap-2 md:gap-8">
  <Link className="text-sm md:text-lg">Home</Link>
  {/* On mobile, icons instead of text */}
  <span className="md:hidden">🏠</span>
  <span className="hidden md:inline">Dashboard</span>
</nav>
```

**Flexible Containers:**

```tsx
{/* Max width changes by viewport */}
<div className="max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto">
  {/* Mobile: full width → SM: 576px → MD: 672px → LG: 896px */}
</div>

{/* Min height for hero sections */}
<section className="min-h-[80vh] md:min-h-screen">
  {/* Mobile: 80% viewport → MD: 100% viewport */}
</section>
```

### Real-World Examples from crowd.mtla.me

**Header (Scales Logo & Nav):**

```tsx
<header className="border-b-4 border-primary bg-background">
  <div className="container mx-auto px-4 py-4 md:px-6 md:py-6">
    <div className="flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2 md:gap-4">
        {/* Logo scales */}
        <div className="w-8 h-8 md:w-12 md:h-12 border-2 md:border-4 border-primary">
          {/* Icon */}
        </div>
        {/* Text scales */}
        <div>
          <h1 className="text-xl md:text-3xl font-black uppercase">
            MTL CROWD
          </h1>
          <p className="text-xs md:text-sm font-mono uppercase">
            MONTELIBERO FUNDING
          </p>
        </div>
      </Link>

      {/* Navigation scales */}
      <nav className="flex items-center gap-2 md:gap-8">
        <Link className="text-sm md:text-lg font-bold uppercase">
          PROJECTS
        </Link>
      </nav>
    </div>
  </div>
</header>
```

**Hero Section (Typography & Spacing):**

```tsx
<section className="min-h-[80vh] md:min-h-screen flex items-center justify-center border-b-4 border-primary">
  <div className="container mx-auto px-4 py-12 md:px-6 md:py-24">
    <div className="max-w-6xl mx-auto text-center space-y-8 md:space-y-12">
      {/* Title scales dramatically */}
      <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-8xl font-black uppercase tracking-tighter leading-none">
        FUND THE
        <br />
        <span className="text-primary">NETWORK STATE</span>
      </h1>

      {/* Description scales moderately */}
      <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground font-mono">
        Decentralized funding platform
      </p>

      {/* Info box with responsive padding */}
      <div className="border-4 border-secondary bg-card p-6 md:p-12">
        {/* Grid stacks on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <div className="space-y-3 md:space-y-4">
            <div className="text-2xl md:text-4xl font-black">01</div>
            <h3 className="text-lg md:text-xl font-bold uppercase">
              BUY TOKENS
            </h3>
            <p className="text-sm md:text-base font-mono">
              Purchase MTL Crowd tokens
            </p>
          </div>
          {/* More steps */}
        </div>
      </div>

      {/* Buttons stack on mobile */}
      <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center">
        <Button size="lg" className="w-full sm:w-auto px-8 py-4 md:px-12 md:py-6 min-h-[56px] md:min-h-[72px]">
          MTL CROWD
        </Button>
        <Button size="lg" variant="outline" className="w-full sm:w-auto">
          VIEW PROJECTS
        </Button>
      </div>
    </div>
  </div>
</section>
```

**Project Card (Responsive Grid):**

```tsx
<Card className="h-full flex flex-col">
  <CardHeader>
    {/* Status badges fit on mobile */}
    <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
      <div className="px-3 py-1 border-2 bg-muted">
        <span className="text-sm font-mono">PROJECT-01</span>
      </div>
      <div className="px-3 py-1 border-2 bg-background">
        <span className="text-sm font-mono">ACTIVE</span>
      </div>
    </div>

    {/* Title with line clamp prevents overflow */}
    <CardTitle className="text-xl md:text-2xl line-clamp-2">
      Project Name Here
    </CardTitle>
  </CardHeader>

  <CardContent className="flex-1">
    {/* Description with responsive text */}
    <p className="text-sm md:text-base font-mono mb-6">
      {description}
    </p>

    {/* Stats grid: 2 columns even on mobile */}
    <div className="grid grid-cols-2 gap-4">
      <div className="border-2 border-border bg-muted p-3 md:p-4">
        <div className="text-xs md:text-sm font-mono">RAISED</div>
        <div className="text-lg md:text-xl font-black">1,234</div>
      </div>
      <div className="border-2 border-border bg-muted p-3 md:p-4">
        <div className="text-xs md:text-sm font-mono">TARGET</div>
        <div className="text-lg md:text-xl font-black">5,000</div>
      </div>
    </div>
  </CardContent>

  <CardFooter>
    {/* Full width button on all screens */}
    <Button className="w-full">FUND PROJECT</Button>
  </CardFooter>
</Card>
```

### Mobile Testing Checklist

Before pushing ANY UI code, verify on **375px width**:

- ✅ **No horizontal scroll** - content fits viewport
- ✅ **Text is readable** - minimum 14px (text-sm)
- ✅ **Touch targets ≥ 48px** - buttons, inputs, links
- ✅ **Spacing is adequate** - not cramped, not wasteful
- ✅ **Images don't overflow** - use `max-w-full`
- ✅ **Forms are usable** - inputs stack vertically
- ✅ **Navigation works** - burger menu or simplified nav
- ✅ **Modals fit screen** - don't overflow viewport
- ✅ **Tables are responsive** - consider horizontal scroll or cards
- ✅ **Performance is good** - fast load, smooth scroll

### Common Mobile Mistakes

**❌ WRONG:**

```tsx
{/* Fixed width - breaks on mobile */}
<div className="w-[800px]">

{/* Desktop-first - mobile is afterthought */}
<h1 className="text-8xl md:text-4xl">

{/* Tiny touch targets */}
<button className="h-8 w-8 text-xs">

{/* No responsive breakpoints */}
<div className="flex gap-12 p-16">

{/* Horizontal only scroll container without indication */}
<div className="flex overflow-x-auto">
  <div className="w-64">...</div>
  <div className="w-64">...</div>
  <div className="w-64">...</div>
</div>
```

**✅ CORRECT:**

```tsx
{/* Max width with responsive scaling */}
<div className="max-w-full sm:max-w-xl md:max-w-4xl">

{/* Mobile-first scaling */}
<h1 className="text-4xl md:text-6xl lg:text-8xl">

{/* Large touch targets */}
<button className="h-12 w-12 md:h-14 md:w-14 text-base">

{/* Responsive spacing */}
<div className="flex gap-4 md:gap-8 lg:gap-12 p-4 md:p-8 lg:p-16">

{/* Responsive scroll with visual hints */}
<div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
  <div className="min-w-[280px] snap-center">...</div>
  <div className="min-w-[280px] snap-center">...</div>
  <div className="min-w-[280px] snap-center">...</div>
</div>
```

### Mobile Performance Tips

```tsx
{/* Lazy load images */}
<Image
  src="/hero.png"
  loading="lazy"
  className="w-full h-auto"
/>

{/* Optimize fonts */}
import { GeistSans, GeistMono } from 'geist/font'
// Use variable fonts for better performance

{/* Reduce animations on mobile */}
<div className="transition-all md:hover:scale-105">
  {/* Scale effect only on desktop */}
</div>

{/* Conditional features */}
{!isMobile && <ComplexAnimation />}
```

### Mobile Optimization Patterns from Reference Sites

**Study these sites specifically for mobile:** onlymusix.com, cypherpunk.camp, aztec.network, daohaus.club

#### 1. Hamburger Navigation (Mobile-Only)

Референсные сайты используют полноценное мобильное меню:

```tsx
"use client";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className="md:hidden h-12 w-12 border-2 border-primary bg-background flex items-center justify-center"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Full-Screen Mobile Menu */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-background md:hidden">
          {/* Header */}
          <div className="border-b-4 border-primary p-4 flex justify-between items-center">
            <h2 className="text-2xl font-black uppercase">MENU</h2>
            <button
              className="h-12 w-12 border-2 border-primary"
              onClick={() => setIsOpen(false)}
            >
              <X size={24} />
            </button>
          </div>

          {/* Menu Items - Large Touch Targets */}
          <nav className="p-6 space-y-4">
            <a
              href="#"
              className="block py-4 border-b-2 border-border text-2xl font-bold uppercase hover:text-primary transition-colors"
            >
              HOME
            </a>
            <a
              href="#"
              className="block py-4 border-b-2 border-border text-2xl font-bold uppercase hover:text-primary transition-colors"
            >
              PROJECTS
            </a>
            <a
              href="#"
              className="block py-4 border-b-2 border-border text-2xl font-bold uppercase hover:text-primary transition-colors"
            >
              ABOUT
            </a>
            {/* CTA Button */}
            <Button className="w-full mt-6" size="lg">
              GET STARTED
            </Button>
          </nav>
        </div>
      )}
    </>
  );
}
```

#### 2. Vertical Card Stacking (Always)

На мобильных карточки ВСЕГДА идут в одну колонку с увеличенными отступами:

```tsx
{/* Projects Grid - Optimized for mobile scrolling */}
<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
  {projects.map((project) => (
    <Card key={project.id} className="min-h-[400px]">
      {/* Каждая карточка занимает всю ширину на мобильном */}
      {/* Это даёт возможность комфортно скроллить */}
    </Card>
  ))}
</div>
```

#### 3. Horizontal Scroll для Галерей

Референсные сайты используют горизонтальный свайп для NFT/фото галерей:

```tsx
{/* Horizontal scroll gallery - mobile optimized */}
<div className="overflow-x-auto pb-6 -mx-4 px-4">
  <div className="flex gap-4 snap-x snap-mandatory">
    {items.map((item) => (
      <div
        key={item.id}
        className="min-w-[280px] sm:min-w-[320px] snap-center shrink-0"
      >
        <Card className="h-full">
          <img
            src={item.image}
            className="w-full h-48 object-cover"
            alt={item.title}
          />
          <CardContent className="p-4">
            <h3 className="text-lg font-bold uppercase line-clamp-1">
              {item.title}
            </h3>
            <p className="text-sm font-mono text-muted-foreground">
              {item.price}
            </p>
          </CardContent>
        </Card>
      </div>
    ))}
  </div>
</div>

{/* Scroll indicator */}
<div className="flex justify-center gap-2 mt-4 md:hidden">
  {items.map((_, i) => (
    <div
      key={i}
      className="w-2 h-2 bg-muted data-[active=true]:bg-primary transition-colors"
      data-active={currentIndex === i}
    />
  ))}
</div>
```

#### 4. Sticky Header на Мобильном

Референсные сайты делают хедер прилипающим при скролле:

```tsx
<header className="sticky top-0 z-40 border-b-4 border-primary bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
  <div className="container mx-auto px-4 py-3">
    {/* Компактный header на мобильном */}
    <div className="flex items-center justify-between">
      {/* Logo меньше на мобильном */}
      <Link href="/" className="flex items-center gap-2">
        <div className="w-8 h-8 border-2 border-primary">
          <Logo />
        </div>
        <span className="text-lg md:text-2xl font-black uppercase">
          BRAND
        </span>
      </Link>

      {/* Mobile menu button */}
      <MobileMenuButton />
    </div>
  </div>
</header>
```

#### 5. Collapsible Sections (Аккордеоны)

Для длинного контента на мобильных используй аккордеоны:

```tsx
"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {faqs.map((faq, index) => (
        <div
          key={index}
          className="border-2 border-border bg-card"
        >
          {/* Question - Large touch target */}
          <button
            className="w-full p-4 md:p-6 flex items-center justify-between text-left"
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
          >
            <h3 className="text-lg md:text-xl font-bold uppercase pr-4">
              {faq.question}
            </h3>
            <ChevronDown
              className={`w-6 h-6 shrink-0 transition-transform ${
                openIndex === index ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Answer - Collapsible */}
          {openIndex === index && (
            <div className="p-4 md:p-6 pt-0 border-t-2 border-border">
              <p className="text-base font-mono text-muted-foreground">
                {faq.answer}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

#### 6. Bottom Tab Navigation (Опционально)

Для app-like experience используй нижнюю навигацию:

```tsx
{/* Bottom Navigation - Mobile Only */}
<nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t-4 border-primary bg-background">
  <div className="grid grid-cols-4 gap-px bg-border">
    <a
      href="/"
      className="flex flex-col items-center justify-center py-3 bg-background hover:bg-muted transition-colors"
    >
      <Home className="w-6 h-6 mb-1" />
      <span className="text-xs font-mono uppercase">Home</span>
    </a>
    <a
      href="/projects"
      className="flex flex-col items-center justify-center py-3 bg-background hover:bg-muted transition-colors"
    >
      <FolderOpen className="w-6 h-6 mb-1" />
      <span className="text-xs font-mono uppercase">Projects</span>
    </a>
    <a
      href="/wallet"
      className="flex flex-col items-center justify-center py-3 bg-background hover:bg-muted transition-colors"
    >
      <Wallet className="w-6 h-6 mb-1" />
      <span className="text-xs font-mono uppercase">Wallet</span>
    </a>
    <a
      href="/profile"
      className="flex flex-col items-center justify-center py-3 bg-background hover:bg-muted transition-colors"
    >
      <User className="w-6 h-6 mb-1" />
      <span className="text-xs font-mono uppercase">Profile</span>
    </a>
  </div>
</nav>

{/* Add bottom padding to content to avoid overlap */}
<main className="pb-20 md:pb-0">
  {/* Content */}
</main>
```

#### 7. Pull-to-Refresh индикатор

Для динамического контента добавь индикатор загрузки:

```tsx
"use client";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

export function RefreshableContent() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  return (
    <div className="relative">
      {/* Loading indicator */}
      {isRefreshing && (
        <div className="sticky top-16 z-30 flex justify-center py-2 bg-background border-b-2 border-primary">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-sm font-mono uppercase">
            UPDATING...
          </span>
        </div>
      )}

      {/* Content */}
      <div className="space-y-6">
        {/* Your content here */}
      </div>
    </div>
  );
}
```

#### 8. Swipeable Cards (Tinder-style)

Для features типа NFT browsing:

```tsx
"use client";
import { useState } from "react";
import { Heart, X } from "lucide-react";

export function SwipeableCards({ items }: { items: Item[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleSwipe = (direction: "left" | "right") => {
    // Handle swipe logic
    setCurrentIndex((prev) => Math.min(prev + 1, items.length - 1));
  };

  return (
    <div className="relative h-[600px] w-full max-w-md mx-auto">
      {/* Card Stack */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Card className="w-full h-full border-4 border-primary">
          <img
            src={items[currentIndex]?.image}
            className="w-full h-3/5 object-cover"
          />
          <CardContent className="p-6">
            <h2 className="text-2xl font-black uppercase mb-2">
              {items[currentIndex]?.title}
            </h2>
            <p className="text-base font-mono text-muted-foreground">
              {items[currentIndex]?.description}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Swipe Buttons - Large touch targets */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6">
        <button
          className="h-16 w-16 rounded-full border-4 border-destructive bg-background flex items-center justify-center hover:bg-destructive hover:text-white transition-colors"
          onClick={() => handleSwipe("left")}
        >
          <X size={32} />
        </button>
        <button
          className="h-16 w-16 rounded-full border-4 border-primary bg-background flex items-center justify-center hover:bg-primary hover:text-background transition-colors"
          onClick={() => handleSwipe("right")}
        >
          <Heart size={32} />
        </button>
      </div>
    </div>
  );
}
```

#### 9. Improved Form Layout for Mobile

Формы с правильными input types и layout:

```tsx
<form className="space-y-6">
  {/* Full width inputs on mobile */}
  <div className="space-y-2">
    <Label htmlFor="wallet" className="text-sm uppercase font-bold">
      WALLET ADDRESS
    </Label>
    <Input
      id="wallet"
      type="text"
      inputMode="text"
      placeholder="G..."
      className="w-full h-14 text-base font-mono"
    />
  </div>

  {/* Number input with proper keyboard */}
  <div className="space-y-2">
    <Label htmlFor="amount" className="text-sm uppercase font-bold">
      AMOUNT
    </Label>
    <Input
      id="amount"
      type="number"
      inputMode="decimal"
      placeholder="0.00"
      className="w-full h-14 text-base font-mono"
    />
  </div>

  {/* Radio buttons - large touch targets */}
  <div className="space-y-3">
    <Label className="text-sm uppercase font-bold">NETWORK</Label>
    <div className="space-y-3">
      {["Mainnet", "Testnet"].map((network) => (
        <label
          key={network}
          className="flex items-center gap-3 p-4 border-2 border-border hover:border-primary cursor-pointer transition-colors"
        >
          <input
            type="radio"
            name="network"
            value={network}
            className="w-6 h-6"
          />
          <span className="text-base font-mono">{network}</span>
        </label>
      ))}
    </div>
  </div>

  {/* Full width submit button */}
  <Button type="submit" className="w-full h-14" size="lg">
    SUBMIT TRANSACTION
  </Button>
</form>
```

#### 10. Skeleton Loaders для Лучшего UX

```tsx
export function ProjectCardSkeleton() {
  return (
    <Card className="h-full flex flex-col animate-pulse">
      <CardHeader>
        <div className="flex justify-between mb-4">
          <div className="w-24 h-8 bg-muted" />
          <div className="w-20 h-8 bg-muted" />
        </div>
        <div className="w-3/4 h-8 bg-muted" />
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <div className="space-y-2">
          <div className="w-full h-4 bg-muted" />
          <div className="w-5/6 h-4 bg-muted" />
        </div>
        <div className="w-full h-4 bg-muted" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-20 bg-muted" />
          <div className="h-20 bg-muted" />
        </div>
      </CardContent>
      <CardFooter>
        <div className="w-full h-12 bg-muted" />
      </CardFooter>
    </Card>
  );
}
```

### Mobile-Specific Meta Tags

Добавь в `app/layout.tsx`:

```tsx
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export const metadata = {
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Your App",
  },
};
```

### PWA Manifest для Mobile

Create `public/manifest.json`:

```json
{
  "name": "Your DApp Name",
  "short_name": "DApp",
  "description": "Decentralized application",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#00ff00",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

## Accessibility

### Focus States

All interactive elements have visible focus rings:

```tsx
className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```

### Color Contrast

- Maintain 7:1 minimum contrast ratio
- Use high-contrast text on backgrounds
- Test with color contrast checkers

### Touch Targets

- Minimum: 44px × 44px (mobile)
- Recommended: 48px × 48px
- Implemented via `h-12` (48px) minimum on buttons/inputs

### Motion Preferences

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Implementation Checklist

When creating any component:

- ✅ Use CSS variables from globals.css
- ✅ Zero border-radius (no `rounded-*` classes)
- ✅ Minimum 48px touch targets (`h-12` for buttons/inputs)
- ✅ High contrast (7:1 minimum)
- ✅ Monospace fonts for technical data (`font-mono`)
- ✅ UPPERCASE for labels/system messages
- ✅ `border-2` or `border-4` for visible borders
- ✅ Focus states with ring (`focus-visible:ring-2`)
- ✅ Responsive at all breakpoints
- ✅ Uses shadcn/ui primitives where available

## Component Creation Guide

### 1. Install shadcn/ui component

```bash
bun x --bun shadcn@latest add button
```

### 2. Customize in `src/components/ui/`

```tsx
// Example: Customizing button.tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center font-bold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border-2 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-accent border-primary",
        // Add more variants
      },
      size: {
        default: "h-12 px-8 py-3 text-lg",
        // Add more sizes
      },
    },
  }
);
```

### 3. Use in pages/components

```tsx
import { Button } from "@/components/ui/button";

<Button size="lg" variant="outline" className="uppercase">
  Action
</Button>
```

## Examples from Existing Apps

### crowd.mtla.me

**Color scheme**: Cyan/Green/Pink on dark blue-gray
- Uses HSL color variables
- Dark theme with bright accents
- Heavy use of `border-4` for emphasis

**Typography**:
- Huge hero text: `text-8xl font-black uppercase`
- Monospace descriptions
- Pink hover states on buttons

### stat.mtlf.me

**Color scheme**: Red/Purple/Cyan with theme toggle
- Dual theme support (light/dark)
- Custom accent colors (`--cyber-green`, `--steel-gray`)
- Monospace-first design

**Typography**:
- Massive headers: `text-6xl font-mono uppercase tracking-wider`
- Technical aesthetic throughout
- Theme toggle component

## Common Patterns

### Data Display

```tsx
{/* Stat card */}
<Card>
  <CardHeader>
    <CardTitle className="text-cyber-green">24.5M</CardTitle>
    <CardDescription>Total Value Locked</CardDescription>
  </CardHeader>
</Card>

{/* Table with monospace data */}
<table className="w-full font-mono">
  <thead>
    <tr className="border-b-2 border-border">
      <th className="uppercase text-sm font-bold text-left p-4">Asset</th>
      <th className="uppercase text-sm font-bold text-right p-4">Balance</th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b border-border hover:bg-muted">
      <td className="p-4">EURMTL</td>
      <td className="p-4 text-right text-primary font-bold">1,234.56</td>
    </tr>
  </tbody>
</table>
```

### Loading States

```tsx
{/* Skeleton (only acceptable use of slight rounding for visual effect) */}
<div className="animate-pulse space-y-4">
  <div className="h-12 bg-muted" />
  <div className="h-24 bg-muted" />
</div>

{/* Spinner (minimal, geometric) */}
<div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin" />
```

### Navigation

```tsx
<nav className="border-b-2 border-border bg-background">
  <div className="container mx-auto px-4 py-4">
    <div className="flex items-center justify-between">
      <div className="text-2xl font-mono uppercase tracking-wider text-primary">
        APP.NAME
      </div>
      <div className="flex gap-6 font-mono uppercase text-sm">
        <a href="#" className="hover:text-primary transition-colors">
          Home
        </a>
        <a href="#" className="hover:text-primary transition-colors">
          About
        </a>
      </div>
    </div>
  </div>
</nav>
```

## Don'ts (Critical)

- ❌ No `rounded-*` classes (except spinners if absolutely needed)
- ❌ No soft shadows (use borders for depth)
- ❌ No gradients (except for effects like scanlines)
- ❌ No pastel colors (high saturation only)
- ❌ No decorative elements without function
- ❌ No text below 14px (accessibility)
- ❌ No low contrast color combinations
- ❌ No mixing font families arbitrarily
- ❌ No custom CSS when Tailwind classes exist

## Reference Sites

Study these for modern retrofuturistic implementations:
- **onlymusix.com** - Glitch text, matrix cascades
- **cypherpunk.camp** - Duplication effects, monospace hierarchy
- **aztec.network** - Angular panels, bold typography
- **daohaus.club** - Pixelated effects, code aesthetics

## Quick Start Template

```tsx
// app/page.tsx
export default function Page() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b-4 border-primary p-6">
        <h1 className="text-4xl font-mono uppercase tracking-wider text-foreground">
          YOUR.APP
        </h1>
      </header>

      {/* Hero */}
      <section className="min-h-screen flex items-center justify-center">
        <div className="container mx-auto px-4 text-center space-y-8">
          <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter">
            Build the
            <br />
            <span className="text-primary">Future</span>
          </h1>
          <p className="text-xl font-mono text-muted-foreground">
            Decentralized. Transparent. Unstoppable.
          </p>
          <Button size="lg">Get Started</Button>
        </div>
      </section>
    </div>
  );
}
```

---

**Remember**: This design system prioritizes consistency, accessibility, and the retrofuturistic aesthetic. Every component should feel like it belongs in a 90s anime interface but function perfectly for modern web applications.