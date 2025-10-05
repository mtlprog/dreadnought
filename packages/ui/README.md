# @dreadnought/ui

Retrofuturistic UI component library based on shadcn/ui with Functional Brutalism design principles.

## Design Philosophy

Inspired by 90s anime interfaces (Evangelion, Lain, Ghost in the Shell):
- **Functional Brutalism** - every element serves a purpose
- **Zero border-radius** (except loaders)
- **High contrast** 7:1 minimum
- **Monospace** for technical data
- **UPPERCASE** for system messages
- **48px minimum** touch targets

## Installation

```bash
bun add @dreadnought/ui @dreadnought/utils
```

## Components

### Footer

Configurable footer with sections and links.

```tsx
import { Footer } from "@dreadnought/ui";
import { Github, MessageCircle } from "lucide-react";

<Footer
  title="App Name"
  description="Description text or JSX"
  sections={[
    {
      title: "Resources",
      links: [
        { href: "/docs", label: "Documentation" },
        { href: "https://github.com", label: "GitHub", icon: Github, external: true }
      ]
    },
    {
      title: "Community",
      links: [
        { href: "https://t.me/channel", label: "Telegram", icon: MessageCircle }
      ]
    }
  ]}
  bottomText="© 2025 Company"
/>
```

**Props**:
- `title` (string) - Footer title
- `description` (string | ReactNode) - Description text or custom JSX
- `sections` (FooterSection[]) - Array of link sections
- `bottomText?` (string | ReactNode) - Optional bottom text
- `className?` (string) - Additional CSS classes

---

### Button

```tsx
import { Button } from "@dreadnought/ui";

<Button variant="default">Click me</Button>
<Button variant="destructive" size="lg">Delete</Button>
<Button variant="outline" asChild>
  <Link href="/page">Go</Link>
</Button>
```

**Variants**: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`
**Sizes**: `default`, `sm`, `lg`, `icon`

---

### Card

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from "@dreadnought/ui";

<Card>
  <CardHeader>
    <CardTitle>Project Title</CardTitle>
    <CardDescription>Description text</CardDescription>
  </CardHeader>
  <CardContent>
    Main content here
  </CardContent>
  <CardFooter>
    Footer actions
  </CardFooter>
</Card>
```

---

### Dialog

```tsx
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@dreadnought/ui";

<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Are you sure?</DialogTitle>
      <DialogDescription>
        This action cannot be undone.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="destructive">Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

### DropdownMenu

```tsx
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "@dreadnought/ui";

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">Menu</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Item 1</DropdownMenuItem>
    <DropdownMenuItem>Item 2</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

### Input

```tsx
import { Input } from "@dreadnought/ui";

<Input type="text" placeholder="Enter value" />
<Input type="email" required />
```

---

### Label

```tsx
import { Label } from "@dreadnought/ui";

<Label htmlFor="email">Email</Label>
<Input id="email" type="email" />
```

---

### Progress

```tsx
import { Progress } from "@dreadnought/ui";

<Progress value={33} />
<Progress value={66} className="h-4" />
```

---

### Tooltip

```tsx
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider
} from "@dreadnought/ui";

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>Hover me</TooltipTrigger>
    <TooltipContent>
      <p>Tooltip content</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

## Theming

All components use CSS variables for theming. Define in your `globals.css`:

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --primary: 0 0% 9%;
    --border: 0 0% 89.8%;
    /* ... */
  }

  .dark {
    --background: 0 0% 3.9%;
    --foreground: 0 0% 98%;
    /* ... */
  }
}
```

## Dependencies

**Peer Dependencies**:
- `@dreadnought/utils` - Utility functions (cn, formatNumber)
- `@radix-ui/react-*` - Headless UI primitives
- `class-variance-authority` - Variant management
- `react` ^19.0.0

## Used By

- `crowd.mtla.me` - Crowdfunding platform
- `stat.mtlf.me` - Fund statistics dashboard

## Contributing

Follow monorepo guidelines in `/CLAUDE.md`:
- ✅ Maintain Functional Brutalism design
- ✅ Zero border-radius (except loaders)
- ✅ Accessibility first (WCAG 2.1 AA)
- ✅ TypeScript strict mode
- ✅ Document all props with TSDoc
