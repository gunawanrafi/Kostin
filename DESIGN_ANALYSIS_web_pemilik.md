# Design Analysis — KostIn Web Pemilik (Standalone)

Source: `design-frontend /KostIn Web Pemilik - Standalone.html`
(a self-extracting design-canvas bundle; React/Babel app source decoded from its embedded manifest for this analysis)

## 1. Color Hex Codes

### Core design tokens (`window.C`, shared with Mobile)

| Token | Hex | Usage |
|---|---|---|
| `accent` | `#FF5A5F` | Primary brand red/coral — CTAs, active nav, links, prices |
| `accentHover` | `#E03C41` | Accent hover/pressed state |
| `accentSoft` | `#FFF1F1` | Accent tint background (active sidebar item, soft badges) |
| `accentBorder` | `#FFB3B5` | Accent-tinted border (e.g. footer top border) |
| `dark` | `#1C1C1E` | Top bar background, dark surfaces, primary text |
| `darkMid` | `#2C2C2E` | Secondary dark surface |
| `surface` | `#FFFFFF` | Card/page surface |
| `bg` | `#F4F4F5` | App background, input backgrounds |
| `bgAlt` | `#FAFAFA` | Sidebar/page background |
| `border` | `#E4E4E7` | Default border |
| `borderLight` | `#F4F4F5` | Subtle border |
| `text` | `#1C1C1E` | Primary text |
| `textSec` | `#3F3F46` | Secondary text |
| `textMid` | `#71717A` | Muted/label text |
| `textLight` | `#A1A1AA` | Placeholder/disabled text |
| `success` | `#10B981` | Success state |
| `successSoft` | `#ECFDF5` | Success tint background |
| `successBorder` | `#6EE7B7` | Success border |
| `warning` | `#F59E0B` | Warning state |
| `warningSoft` | `#FFFBEB` | Warning tint background |
| `warningBorder` | `#FCD34D` | Warning border |
| `error` | `#EF4444` | Error/danger state |
| `errorSoft` | `#FEF2F2` | Error tint background |
| `errorBorder` | `#FCA5A5` | Error border |
| `info` | `#3B82F6` | Info state |
| `infoSoft` | `#EFF6FF` | Info tint background |
| `mapBg` | `#E8EEF4` | Map/placeholder background |

### Ad-hoc / semantic colors used directly in screens (not in the shared token file)

| Hex | Context |
|---|---|
| `#92400E` | Amber-900 text on warning badges ("Menunggu Review", bank-transfer notice) |
| `#006C49` / `#005236` / `#00AC77` / `#6FFBBE` / `rgba(78,222,163,0.25)` | Deposit/escrow & "verified" green accents (Calon Penyewa match badge, KYC verified check, revenue delta, deposit status) |
| `#B91C1C` / `#991B1B` / `#065F46` | Additional status-text shades (error/success emphasis) |
| `#3A3A3C` / `#2A2A2E` | Dark-surface variants (dropdown menus, focus-mode chrome) |
| `#047857` | Deep success green |
| `#c96442` | **Design-canvas tool chrome only** (artboard focus ring / drag highlight) — not part of the product UI |

### Typography colors follow the token table above (`text`, `textSec`, `textMid`, `textLight`); no additional freeform grays were found.

## 2. Font Sizes and Weights

**Font families:** `Rubik, sans-serif` (headings, numeric/price emphasis, nav labels, buttons) and `Inter, sans-serif` (body copy, form labels, secondary text); `monospace` used only for placeholder "[ foto ]" image stand-ins.

**Font sizes in use** (px): `9, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 16, 17, 18, 19, 20, 22, 24, 26, 28, 30, 34, 38, 44, 64`
- Most common body/label sizes: `12`, `13`, `13.5`, `14`
- Page titles (`WHeader`): `28` (Rubik 700)
- KPI card values: `24` (Rubik 700)

**Font weights in use:** `400` (regular body), `500` (medium — pill tabs, links), `600` (semibold — most labels/buttons/nav), `700` (bold — headings, prices, KPI values; most common weight overall), `800` (extra-bold — used sparingly, e.g. hero/landing numerals)

## 3. Every Screen / Page (13 sections, 40 artboards)

**A — Autentikasi Pemilik (Web)**
1. A0 · Landing / Value Prop Pemilik
2. A1 · Selamat Datang Kembali (Login)
3. A2 · Login dengan Google (modal)
4. A3 · Lengkapi Profil Anda (Daftar 1/2)
5. A4 · Buat Akun Baru (Daftar 2/2)
6. A5 · Lupa Kata Sandi?
7. A6 · Verifikasi Kode (OTP)
8. A7 · Kata Sandi Baru
9. A8 · Verifikasi Kepemilikan (KTP + foto + selfie liveness)
10. A9 · Verifikasi Sedang Ditinjau

**B — Dashboard Pemilik**
11. B1 · Dashboard Pemilik (Home) — KPI, pendapatan, aktivitas, tugas urgent

**C — Manajemen Properti**
12. C1 · Properti Saya
13. C2 · Tambah Kost — 1. Informasi Dasar
14. C3 · Tambah Kost — 2. Fasilitas & Kamar
15. C4 · Tambah Kost — 3. Foto & Galeri
16. C5 · Tambah Kost — 4. Harga & Aturan

**D — Calon Penyewa**
17. D1 · Daftar Calon Penyewa
18. D2 · Screening Calon Penyewa
19. D3 · Kriteria Penyewa (screening settings)

**E — Penyewa Aktif & Kontrak**
20. E1 · Penyewa Aktif
21. E2 · Detail Kontrak Penyewa
22. E3 · Modal — Beri Rating Penyewa

**F — Pesan (Chat)**
23. F1 · Pesan / Inbox

**G — Manajemen Keuangan**
24. G1 · Manajemen Keuangan
25. G2 · Daftar Tunggakan Sewa
26. G3 · Riwayat Transaksi
27. G4 · Modal — Tarik Saldo Properti
28. G5 · Modal — Tambah Rekening Baru
29. G6 · Modal — Penarikan Berhasil Diajukan
30. G7 · Pengaturan Smart Rent
31. G8 · Jadwal Pengingat Otomatis

**H — Pengaturan & Profil Pemilik**
32. H1 · Pengaturan & Profil Pemilik

**I — Notifikasi**
33. I1 · Halaman Notifikasi

**J — Maintenance & Property Log**
34. J1 · Inbox Maintenance
35. J2 · Detail Permintaan + Update Status
36. J3 · Log Properti (timeline)

**K — Analitik & Market Intelligence**
37. K1 · Analitik (occupancy + revenue)
38. K2 · Conversion Funnel
39. K3 · Market Intelligence

**L — Inquiry & FAQ Auto-Response**
40. L1 · Inbox Inquiry
41. L2 · FAQ Auto-Response (setting)

**M — Empty & Transitional States**
42. M1 · Belum Ada Listing
43. M2 · Listing Menunggu Verifikasi
44. M3 · Maintenance Kosong

*(Most desktop artboards are 1280px wide; auth screens are 960px wide.)*

## 4. Key UI Components

**Desktop shell (`W*` primitives)**
- `WTopBar` — fixed dark (`#1C1C1E`) top bar with logo, notification bell + badge, avatar + user name
- `WSidebar` — 256px fixed sidebar, avatar/name header, `NAV_ITEMS` list (Dashboard, Properti Saya, Calon Penyewa, Penyewa Aktif, Pesan, Keuangan, Pengaturan, Perawatan, Analitik, Inquiry) with active-state accent tint
- `WPage` — page shell composing top bar + sidebar + content + footer, default 1280×1024
- `WFooter` — brand + copyright + legal links
- `WHeader` — breadcrumb trail + page title (28px Rubik 700) + subtitle + action slot
- `WBtn` — button, variants: primary / dark / outline / ghost / success
- `WPillTab` — rounded filter tab with optional count bubble
- `WCard` / `WSectionCard` — bordered surface card, section card adds a colored left accent bar
- `WKpiCard` — KPI stat card (label, value, delta arrow, icon)
- `WField` / `WSelect` — labeled text input / dropdown
- `WToggle` / `WToggleRow` — switch control
- `WCheckbox` — checkbox row
- `WTableHead` — uppercase table header row
- `WModalBackdrop` / `WModalCard` — modal dimmer + card container

**Mobile-parity primitives (`K*`, reused in some web contexts)**
- `KStatusBar`, `KBottomNav`, `KNavBar` — mobile chrome
- `KBtn`, `KInput`, `KChip`, `KCard`, `KBadge`, `KStarRow` — base controls
- `KListingCard` — property card (photo placeholder, match %, price, rating)
- `KSectionHeader`, `KStepBar` — section title row / wizard step indicator

**Brand**
- `KostinLogo` — red + dark overlapping building mark with "Kostin" wordmark (light/dark variants)

**Notable domain components**
- 4-step wizard chrome (`WStepBar`-style) for "Tambah Kost Baru"
- Escrow/deposit status callouts (green `#006C49` family)
- KYC-verified badge (`#00AC77`)
- Conversion funnel & market-intel chart blocks (Analytics section)
- Chat inbox list + conversation pane (simple 2-pane layout)
