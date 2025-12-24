# Kaspa University - Design Guidelines

## Design Approach

**Reference-Based Approach**: Drawing inspiration from modern edtech platforms (Coursera, Udemy) combined with Web3 authenticity (Uniswap's clarity, Rainbow Wallet's approachability). The design emphasizes trust, professionalism, and blockchain transparency while maintaining accessibility for crypto newcomers.

**Core Principle**: "Blockchain-powered education that feels effortless" - hide complexity, showcase innovation.

---

## Brand Identity

### Kaspa University Logo
- **Symbol**: "KU" monogram in circular badge, inspired by Kaspa's geometric brand style
- **Colors**: Primary Teal (#70C7BA) for "K", Accent Teal (#49EACB) for "U" with subtle gradient
- **Style**: Modern, minimal, tech-forward with slight 3D depth effect
- **Usage**: Appears in header, certificates, loading states, favicon

### Color System
**Primary Palette:**
- Background: #231F20 (Kaspa Black)
- Surface: #2A2728 (Slightly lighter for cards)
- Primary: #70C7BA (Kaspa Teal)
- Accent: #49EACB (Bright Teal for CTAs)
- Text: #FFFFFF (White), #B6B6B6 (Gray for secondary)

**Semantic Colors:**
- Success (rewards): #49EACB
- Warning: #F59E0B
- Error: #EF4444
- Info: #70C7BA

---

## Typography

**Font Stack:**
- **Headings**: Inter Bold/Semibold (geometric, tech-appropriate)
- **Body**: Inter Regular (readable, modern)
- **Monospace** (wallet addresses, transaction hashes): JetBrains Mono

**Hierarchy:**
- H1: 48px/56px (course titles, dashboard welcome)
- H2: 36px/44px (section headers)
- H3: 24px/32px (card titles, lesson names)
- Body: 16px/24px
- Small: 14px/20px (metadata, timestamps)
- Tiny: 12px/16px (wallet addresses truncated)

---

## Layout System

**Spacing Primitives**: Tailwind units 2, 4, 8, 12, 16, 24 (keep consistent rhythm)

**Container Strategy:**
- Max width: 1280px (xl container)
- Content areas: max-w-4xl for readability
- Dashboard cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3

**Sectioning:**
- Header: Fixed, 64px height, backdrop-blur with subtle border-bottom
- Main content: pt-24 (clear header space)
- Footer: Minimal, links + social, py-12

---

## Component Library

### Navigation
- **Header**: Dark (#231F20), semi-transparent with blur, contains KU logo, course nav, wallet connection button (accent teal), profile avatar
- **Wallet Button**: Teal gradient (#70C7BA → #49EACB), rounded-full, shows truncated address when connected, pulsing animation on connection

### Cards
- **Course Cards**: Dark surface (#2A2728), rounded-2xl, hover:scale-[1.02] transition, teal accent border on progress, includes thumbnail, title, progress bar, lesson count
- **Certificate Cards**: Showcase IPFS-hosted image, verification badge, download/share buttons, blockchain link icon
- **Quiz Cards**: Question in white text, options as teal-outlined buttons, correct/incorrect state changes

### Buttons
**Primary (CTAs):** Teal gradient background, white text, rounded-lg, px-6 py-3, hover:brightness-110
**Secondary:** Teal outline, teal text, hover:bg-teal/10
**Ghost:** No background, teal text, underline on hover

### Forms & Inputs
- Dark background (#2A2728), teal border on focus
- Placeholders in gray (#B6B6B6)
- Validation states with icon + color change

### Badges & Tags
- **Reward Badge**: Teal pill shape, "+0.05 KAS" in white, sparkle icon
- **NFT Badge**: "Minted" badge on certificates with chain icon
- **Status Tags**: Rounded-full, small, color-coded (completed, in-progress, locked)

### Q&A Discussion
- **Thread Layout**: Stack of question/answer cards, author wallet address with avatar (Jazzicon style), timestamp, transaction hash link
- **Post Input**: Textarea with teal border, "Post to Blockchain" button with gas estimate preview

---

## Page-Specific Layouts

### Landing/Home
- **Hero**: Full-width, gradient overlay (black to teal/20), KU logo large and centered, headline "First Kaspa L1 Learn-to-Earn Platform", CTA "Connect Wallet to Start Learning", background: abstract BlockDAG visualization (geometric nodes/connections in teal)
- **Features Grid**: 3 columns - "Instant KAS Rewards", "On-Chain Certificates", "P2P Discussions" with icons and brief descriptions
- **Stats Bar**: Horizontal scrolling or grid - Total KAS Distributed, Certificates Minted, Active Learners, Courses Available
- **How It Works**: 4-step visual flow with numbered cards

### Dashboard
- **Welcome Section**: Personalized greeting, wallet address, total KAS earned (large, prominent)
- **Progress Overview**: Grid of course cards with completion %, resume buttons
- **Certificates Gallery**: Horizontal scroll of earned NFT certificates with preview images
- **Recent Activity Feed**: Timeline of quiz completions, Q&A posts, reward transactions

### Course View
- **Sidebar**: Fixed left, lesson list with checkmarks, progress indicator
- **Content Area**: Lesson text/video, scrollable, markdown-rendered
- **Q&A Section**: Below lesson content, "Ask a Question" input, feed of on-chain discussions
- **Quiz Section**: Appears after lesson, full-screen takeover or modal, progress dots, submit button

### Certificate Detail
- **Full Certificate Display**: Large IPFS image preview (matching BMT style - dark, teal accents, KU logo, recipient address, course name, date, verification code)
- **Blockchain Verification**: Transaction hash, IPFS link, explorer link, "Verified on Kaspa" badge
- **Actions**: Download PNG, Copy Link, Share to Twitter

---

## Images

**Hero Section**: Yes - abstract BlockDAG network visualization (teal geometric nodes connected by lines on dark background, subtle animation/glow)

**Course Thumbnails**: Placeholder illustrations for each course (blockchain icons, education symbols in teal)

**Certificate Background**: Programmatically generated - dark gradient (#231F20 to #2A2728), subtle grid pattern, teal accent lines, KU logo watermark

**Avatar System**: Use Jazzicon or Blockies for wallet address avatars in Q&A threads

---

## Animations

**Minimal Approach** - only where it enhances UX:
- Wallet connection: Success checkmark animation (teal)
- Reward distribution: Brief confetti burst in teal
- Transaction pending: Pulsing teal ring around relevant element
- Page transitions: Subtle fade-in (200ms)
- Hover states: Scale transforms (1.02x), brightness changes

---

## Accessibility & Polish

- All interactive elements have focus-visible:ring-2 ring-teal states
- Color contrast meets WCAG AA for all text
- Wallet addresses always truncatable with copy button
- Loading states for blockchain operations (spinner + "Confirming on Kaspa...")
- Empty states with helpful CTAs ("No certificates yet - complete a course to earn your first NFT!")

---

**Differentiation**: Unlike typical learn-to-earn platforms, Kaspa University emphasizes speed (sub-second confirmations), decentralization (on-chain Q&A), and verifiability (NFT certificates). The dark, teal-accented aesthetic communicates technical sophistication while remaining approachable for education.