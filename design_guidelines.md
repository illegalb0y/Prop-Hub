# Design Guidelines: Real Estate Projects Aggregator

## Design Approach

**Selected Framework:** Modern Material Design principles with Airbnb-inspired card aesthetics for listings, prioritizing data density and browsing efficiency.

**Rationale:** This is a utility-focused, information-dense application where users need to efficiently browse, filter, and compare multiple properties. Clean hierarchy, consistent patterns, and scannable layouts are paramount.

**Key Design Principles:**
- Clarity over decoration
- Information density balanced with breathing room
- Consistent interaction patterns across all browsing contexts
- Map-first visual hierarchy

---

## Typography System

**Font Stack:** Inter (primary UI) + Manrope (headings)

**Hierarchy:**
- Page titles: Manrope Bold, 32px (mobile: 24px)
- Section headers: Manrope SemiBold, 24px (mobile: 20px)
- Card titles: Manrope SemiBold, 18px
- Body text: Inter Regular, 15px
- Labels/metadata: Inter Medium, 13px
- Captions: Inter Regular, 12px
- Buttons: Inter SemiBold, 14px

---

## Layout & Spacing System

**Tailwind Units:** Use spacing scale of 2, 3, 4, 6, 8, 12, 16, 20 exclusively for consistency.

**Core Layout:**
- Sidebar: 280px open, 64px collapsed (fixed positioning)
- Header: 64px height (sticky)
- Container max-width: 1400px for main content
- Card spacing: gap-4 for grids, gap-6 for sections

**Breakpoints:**
- Mobile: < 768px (single column, sidebar becomes drawer)
- Tablet: 768-1024px (2-column grids)
- Desktop: > 1024px (3-4 column grids)

---

## Component Library

### Navigation Components

**Sidebar (Open State):**
- Full-height fixed panel, white background
- Logo/brand at top (h-16, px-6)
- Navigation buttons: Full-width, rounded-lg, px-4 py-3, flex items with 16px icons left-aligned
- Active state: Primary color background with white text
- Hover: Subtle gray background
- Settings at bottom with divider above

**Sidebar (Collapsed State):**
- 64px width icon rail
- Centered icons only (24px size)
- Tooltips on hover (right-side, 8px offset)

**Header:**
- Centered search bar (max-width: 600px, rounded-full, px-6 py-3)
- Right utilities: Icon buttons (40px × 40px, rounded-full, hover: light background)
- Logo left (max 180px width)

### Card Components

**Project Card (Primary):**
- Aspect ratio 4:3 image (rounded-t-xl)
- Content padding: p-4
- Title + metadata stack with gap-2
- Price prominent (20px, SemiBold)
- Developer/location: 13px gray text
- Heart icon (top-right absolute on image, backdrop-blur)
- Hover: Subtle lift (shadow-lg transition)
- Click area: entire card

**Developer/Bank Card:**
- Horizontal layout on desktop (image left 96×96, rounded-lg)
- Content: name (18px bold) + project count + short description
- Vertical stack on mobile
- Border: 1px subtle gray, rounded-xl

### Filter Components

**Multi-Select Filters:**
- Dropdown with chips showing selected items
- Chip style: rounded-full, px-3 py-1, removable × icon
- Filter row: flex wrap with gap-3
- Clear all button: text link (underline on hover)

**Sort Dropdown:**
- Right-aligned in filter row
- Width: 200px
- Chevron icon indicator

### Map Components

**Mini-Map (Home Page):**
- Height: 280px desktop, 200px mobile
- Sticky below header
- Subtle border-bottom
- Zoom controls: bottom-right (40px buttons)

**Full Map Page:**
- Full viewport height minus header
- Filters in collapsible drawer (320px, slides from left)
- Marker clusters at zoom < 12
- Selected marker: 20% larger with primary color

**Marker Popup:**
- Image thumbnail (80×60)
- Title + price (bold)
- "View details" link

---

## Key Page Specifications

### Home Page
- Header (sticky)
- Mini-map (sticky, 280px height)
- Filters row (px-6, py-4, border-bottom)
- Listings grid: 3 columns desktop, 2 tablet, 1 mobile (gap-6, px-6)
- Infinite scroll or pagination at bottom

### Project Detail
- Hero image gallery (height: 480px desktop, 280px mobile, carousel)
- Content in 2-column: Main details (66%) + sidebar actions (34%)
- Main: title, price, description, features grid
- Sidebar: Favorite button, developer card, contact form placeholder
- Sticky sidebar on scroll (desktop only)

### Authentication Page
- Centered card (max-width: 420px)
- Tab switcher at top (Login | Sign Up)
- Form inputs: Full-width, rounded-lg, px-4 py-3, border focus states
- Submit button: Full-width, prominent, py-3
- Social proof text below ("Join 10,000+ users")

### Developers/Banks Pages
- Grid layout: 2 columns desktop, 1 mobile
- Each card shows logo, name, project count, snippet
- Filter/search bar at top (sticky)

---

## Images

**Hero Image:** No traditional hero on home page (map serves this function)

**Project Images:**
- Project Detail: Large carousel (16:9 aspect, up to 1200px wide)
- Card thumbnails: 4:3 aspect, cover fit, quality compressed

**Placeholder Strategy:**
- Generic building illustrations for projects without images
- Simple icon backgrounds for developers/banks without logos

**Image Treatment:**
- Rounded corners throughout (8-12px radius)
- Subtle shadow on hover for cards
- Lazy loading for performance

---

## Interaction Notes

- Transitions: 200ms ease for all hover states
- Focus rings: 2px offset, primary color
- Loading states: Skeleton screens matching card layouts
- Empty states: Centered icon + message + "Clear filters" action
- Buttons on images: backdrop-blur-md with semi-transparent background