# Design Analysis — KostIn Mob Penyewa (Standalone Prototype)

Source: `design-frontend /KostIn Mob Penyewa - Standalone.html`

This file is a self-contained interactive prototype (an iPhone-frame React/Babel bundle wrapped in a bundler-loader shell). The actual UI code lives in gzip+base64-encoded assets embedded in the HTML; it was decoded to inspect the design tokens, shared components, and all 22 screens.

## 1. Color Hex Codes

### Core design tokens (`const C` in the shared tokens file)

| Token | Hex | Usage |
|---|---|---|
| `accent` | `#FF5A5F` | Primary brand/CTA color (coral-red) |
| `accentHover` | `#E03C41` | Accent pressed/hover state |
| `accentSoft` | `#FFF1F1` | Accent tint background (badges, highlights) |
| `accentBorder` | `#FFB3B5` | Accent-tinted borders |
| `dark` | `#1C1C1E` | Primary dark surface / primary text |
| `darkMid` | `#2C2C2E` | Secondary dark surface |
| `surface` | `#FFFFFF` | Card/sheet background |
| `bg` | `#F4F4F5` | App/page background |
| `bgAlt` | `#FAFAFA` | Alternate light background |
| `border` | `#E4E4E7` | Default border |
| `borderLight` | `#F4F4F5` | Subtle divider |
| `text` | `#1C1C1E` | Primary text |
| `textSec` | `#3F3F46` | Secondary text |
| `textMid` | `#71717A` | Muted/tertiary text |
| `textLight` | `#A1A1AA` | Placeholder/disabled text |
| `success` | `#10B981` | Success state |
| `successSoft` | `#ECFDF5` | Success tint background |
| `successBorder` | `#6EE7B7` | Success border |
| `warning` | `#F59E0B` | Warning / rating stars |
| `warningSoft` | `#FFFBEB` | Warning tint background |
| `warningBorder` | `#FCD34D` | Warning border |
| `error` | `#EF4444` | Error / destructive state |
| `errorSoft` | `#FEF2F2` | Error tint background |
| `errorBorder` | `#FCA5A5` | Error border |
| `info` | `#3B82F6` | Info state |
| `infoSoft` | `#EFF6FF` | Info tint background |
| `mapBg` | `#E8EEF4` | Map placeholder background |

### Additional literal hex colors found in individual screens (not in the token set)

| Hex | Context |
|---|---|
| `#0E0E10` | Outer viewport/backdrop behind the phone frame |
| `#1A1A1C` | Phone bezel |
| `#2A2A2E` | Phone bezel inset highlight |
| `#065F46` | Dark-green text (on success-soft chips) |
| `#DEDEE2` | Neutral divider/skeleton gray |
| `#E8F0FF` | Light blue tint (info-adjacent chip/badge) |
| `#E8FBF1` | Light green tint (success-adjacent chip/badge) |
| `#FF8A4C` | Secondary accent/orange (promo or highlight badge) |
| `#FFE8E8` | Light red/pink tint (alt error/accent background) |

Colors are also frequently used via `rgba()` (e.g. `rgba(255,90,95,0.07)` decorative blobs, `rgba(0,0,0,0.06–0.6)` shadows) rather than hex.

## 2. Font Sizes and Weights

**Font families:** `Inter, sans-serif` (body/UI text) and `Rubik, sans-serif` (headings, prices, nav titles, emphasis). Both are loaded as full variable-ish `@font-face` sets (weights 400/500/600/700/800, plus Latin/Cyrillic/Greek/Vietnamese/Arabic/Hebrew subsets). `monospace` is used once as a placeholder for image slots (`[ foto ]`).

**Font weights used inline:** `500`, `600`, `700`, `800` (400 is the implicit/default body weight, not set explicitly inline).
- `500` — secondary labels, inactive tab labels, section links
- `600` — buttons, active tab labels, input labels, badges, nav titles
- `700` — emphasized text, prices, headings, active states
- `800` — large display headings (splash wordmark, screen titles, big rating numbers)

**Font size scale (px) observed across the app**, smallest to largest:
`9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 26, 32, 40, 42, 44, 48, 84`

Typical usage:
- `9–11` — badges, tab labels, timestamps, captions
- `12–14` — body text, buttons, chips, inputs
- `16–24` — section headers, nav titles, screen headings
- `26–48` — hero numbers/headings (splash, ratings, success screens)
- `84` — the splash-screen wordmark icon/glyph

## 3. Every Screen/Page

The prototype is a single-page app with a client-side navigation stack (`SCREENS` map) and bottom tab bar. All 22 screens:

| Key | Component | Description |
|---|---|---|
| `splash` | `SplashScreen` | Dark branded splash with animated background blobs; auto-advances to onboarding after 1.5s |
| `onboarding` | `OnboardingScreen` | Swipeable slides intro, with a "Lewati" (skip) action to the role screen |
| `role` | `RoleScreen` | Choose "Pencari Kost" (renter) vs "Pemilik Kost" (owner) |
| `login` | `LoginScreen` | Email/password login form |
| `register` | `RegisterScreen` | Registration form (name, phone, email, password) |
| `otp` | `OTPScreen` | 4-digit OTP input with auto-focus-advance, auto-submits to home |
| `home` | `HomeScreen` | Personalized greeting, quick filter chips, recommended & nearby listing carousels, survey promo modal |
| `search` | `SearchScreen` | Search bar, sort control, filterable listing results list |
| `filter` | `FilterScreen` | Gender, max price (slider), and facility-toggle filters |
| `detail` | `DetailScreen` | Full kost detail page — photos, rooms, facilities, reviews entry, pre-booking survey modal, favorite toggle |
| `booking` | `BookingScreen` | Multi-step booking flow — room, date, duration, documents (KTM/KTP), payment method, agreement |
| `booking-success` | `BookingSuccessScreen` | Confirmation screen with success icon and booking status summary |
| `favorit` | `FavoritScreen` | Saved/favorited kost list with empty state |
| `chat` | `ChatInboxScreen` | List of chat threads (owners + support), unread badges |
| `chat-thread` | `ChatThreadScreen` | Individual chat conversation with message composer |
| `profil` | `ProfilScreen` | User profile menu — booking history, scheduled surveys, KostIn Survey, community, feedback, settings |
| `survei` | `SurveiScreen` | Schedule a physical survey visit (date/time picker) |
| `survey-addon` | `SurveyAddonScreen` | Paid "KostIn Survey" add-on packages (Mini/Standar/Premium) and kost selection |
| `survey-status` | `SurveyStatusScreen` | Live-polling status tracker for a submitted survey request (via `SurveyStore`) |
| `komunitas` | `KomunitasScreen` | Community feed — posts with tags, likes, comments, category filter chips |
| `review` | `ReviewScreen` | Kost reviews/ratings list with aggregate rating header |
| `alert` | `AlertScreen` | Notifications list (recommendations, chat replies, price drops, survey confirmations) |

Bottom tab bar (`ProtoTabBar`) covers 4 of these as persistent tabs: **Beranda** (`home`), **Favorit** (`favorit`), **Pesan** (`chat`), **Profil** (`profil`).

## 4. Key UI Components

Two shared libraries are loaded before the screens and re-used (often aliased per-screen, e.g. `C1/C2/C3`, `T1/T2/T3`, `NB1/NB2/NB3`):

**Design-token/primitive library** (`kostin-tokens`):
- `KStatusBar` — fake iOS status bar (time, signal, wifi, battery), light/dark variants
- `KBottomNav` / `ProtoTabBar` — 4-item bottom tab bar with icons, active state, unread badges
- `KNavBar` / `ProtoNavBar` — top nav bar with back chevron, title (Rubik 600), optional right action
- `KBtn` — button with `primary` / `dark` / `outline` / `ghost` / `success` variants, `small`/`full` sizing
- `KInput` / `ProtoInput` — labeled text input with prefix, note, error and focus states
- `KChip` / `ProtoChip` — pill-shaped filter/toggle chip, active/inactive styling
- `KCard` — bordered rounded container (generic card)
- `KBadge` — small pill label (e.g. "% Cocok" match badge)
- `KStarRow` — star-rating display with count
- `KListingCard` — kost listing card (photo placeholder, match/badge overlay, favorite icon, name, area, rating, price) in `wide` or grid variants
- `KSectionHeader` — section title + "see more" link
- `KStepBar` — numbered step indicator for multi-step flows (e.g. booking)

**Prototype "engine"** (navigation/interaction primitives):
- `PhoneFrame` — auto-scaling iPhone bezel/notch/home-indicator wrapper for the whole app
- `ProtoScreen` — 375×812 screen shell combining status bar + scrollable body
- `Tap` — pressable wrapper giving opacity/scale press feedback on any element
- `ProtoNavBar` — interactive nav bar (working back button, optional right action)
- `ProtoInput` — controlled text input variant of `KInput`
- `ProtoChip` — controlled toggle variant of `KChip`
- `ProtoToast` — transient bottom toast/snackbar for confirmations (e.g. "♥ Ditambahkan ke favorit")
- `ProtoTabBar` — controlled bottom tab bar wired to the nav stack, with favorite/chat count badges

**Forms** appear in `LoginScreen`, `RegisterScreen`, `OTPScreen`, `FilterScreen`, and the multi-step `BookingScreen`/`SurveyAddonScreen`, built from `ProtoInput`/`ProtoChip` plus custom sliders, date pickers, and document-upload toggles.

**Cards** are the dominant list pattern: `KListingCard` for kost listings (home/search/favorites), plus ad-hoc bordered cards for bookings, survey requests, chat threads, community posts, and notifications.
