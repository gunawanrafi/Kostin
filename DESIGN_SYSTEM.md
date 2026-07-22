# KostIn Design System

Combines `DESIGN_ANALYSIS_mob_penyewa.md` (mobile, renter-facing) and
`DESIGN_ANALYSIS_web_pemilik.md` (web, owner-facing). Both prototypes share
the **same core token set** (identical hex values for `C.accent`, `C.text`,
etc.), so KostIn has one design language across mobile and web, not two.

Token implementations:
- Mobile (React Native): `apps/mobile/src/theme/index.ts`
- Web (Next.js): `apps/web/src/lib/design-tokens.ts`

Both files export the same token names/values — keep them in sync when the
design changes.

## 1. Combined Color Palette

### Brand / accent
| Token | Hex |
|---|---|
| `accent` | `#FF5A5F` |
| `accentHover` | `#E03C41` |
| `accentSoft` | `#FFF1F1` |
| `accentBorder` | `#FFB3B5` |

### Neutrals & surfaces
| Token | Hex |
|---|---|
| `dark` | `#1C1C1E` |
| `darkMid` | `#2C2C2E` |
| `surface` | `#FFFFFF` |
| `bg` | `#F4F4F5` |
| `bgAlt` | `#FAFAFA` |
| `border` | `#E4E4E7` |
| `borderLight` | `#F4F4F5` |

### Text
| Token | Hex |
|---|---|
| `text` | `#1C1C1E` |
| `textSec` | `#3F3F46` |
| `textMid` | `#71717A` |
| `textLight` | `#A1A1AA` |

### Semantic states
| Token | Base | Soft | Border |
|---|---|---|---|
| Success | `#10B981` | `#ECFDF5` | `#6EE7B7` |
| Warning | `#F59E0B` | `#FFFBEB` | `#FCD34D` |
| Error | `#EF4444` | `#FEF2F2` | `#FCA5A5` |
| Info | `#3B82F6` | `#EFF6FF` | — |

### Misc / domain-specific
| Token | Hex | Context |
|---|---|---|
| `mapBg` | `#E8EEF4` | Map placeholders |
| `escrow` | `#006C49` | Deposit/escrow status text (web pemilik) |
| `escrowDeep` | `#005236` | Escrow match badge text |
| `escrowSoft` | `#6FFBBE` | Escrow/match badge background |
| `verified` | `#00AC77` | KYC-verified checkmark |
| `warningTextDeep` | `#92400E` | Amber-900 warning copy |

**Not carried into tokens:** `#c96442` (design-canvas tool chrome only),
phone-bezel colors (`#0E0E10`, `#1A1A1C`), and one-off decorative tints
(`#FF8A4C`, `#FFE8E8`, `#E8F0FF`, `#E8FBF1`) — these were prototype/device
chrome or single-use accents, not reusable tokens.

**Typography:** `Rubik` (headings, prices, nav titles, KPI values, buttons)
+ `Inter` (body, labels, secondary text). Weights 400/500/600/700/800 in use;
`700` is the most common. See the `typography` export in each theme file for
the consolidated size/weight scale.

## 2. Phase 1 Screens vs. Later

Phase 1 = the minimum critical path for a renter to find and book a kost,
and an owner to list a property, screen a tenant, and get paid (escrow is
flagged `CRITICAL` in `CLAUDE.md`, so its supporting screens are Phase 1).
Later = depth, automation, and analytics features layered on top once the
core loop works end-to-end.

### Phase 1 — Mobile (Penyewa)
- Auth funnel: `splash`, `onboarding`, `role`, `login`, `register`, `otp`
- Discovery: `home`, `search`, `filter`, `detail`
- Transaction: `booking`, `booking-success`
- Retention/utility: `favorit`, `chat`, `chat-thread`, `profil`

### Later — Mobile (Penyewa)
- `survei`, `survey-addon`, `survey-status` — paid physical-survey add-on
- `komunitas` — social/community feed
- `review` — dedicated reviews screen (basic reviews already surface inline in `detail`)
- `alert` — full notifications screen

### Phase 1 — Web (Pemilik)
- Auth/onboarding (Section A): landing, login, Google login, register (profile + account), forgot/OTP/new password, owner verification + pending
- Dashboard home (Section B)
- Manajemen Properti (Section C): Properti Saya + 4-step Tambah Kost wizard
- Calon Penyewa (Section D): daftar + screening (not screening-criteria settings)
- Penyewa Aktif & Kontrak (Section E): penyewa aktif + detail kontrak (not rating modal)
- Pesan (Section F): chat inbox
- Keuangan (Section G): manajemen keuangan, tunggakan, riwayat transaksi, tarik saldo / tambah rekening / penarikan berhasil modals
- Pengaturan & Profil (Section H)
- Supporting empty states (Section M1/M2): belum ada listing, listing menunggu verifikasi

### Later — Web (Pemilik)
- Rating penyewa modal (E3)
- Smart Rent settings + reminder schedule (G7–G8)
- Full notifications page (Section I) — a dropdown/badge is enough for Phase 1
- Maintenance & Property Log (Section J), incl. empty state (M3)
- Analitik & Market Intelligence (Section K)
- Inquiry inbox + FAQ auto-response (Section L)

## 3. Reusable Components to Build First

Priority order, grouped by how many Phase 1 screens each unblocks. Build the
mobile and web versions of each pair together so both apps stay visually
identical.

1. **Button** (`KBtn` / `WBtn`) — primary/dark/outline/ghost/success variants; used on nearly every screen.
2. **Card** (`KCard` / `WCard`) + **Modal** (`WModalBackdrop`/`WModalCard`) — base surface for listings, dashboard sections, and the booking/withdrawal modals.
3. **Input / Field / Select** (`KInput`/`ProtoInput` / `WField`/`WSelect`) — every auth, filter, and wizard screen.
4. **NavBar / TopBar** (`KNavBar` / `WTopBar`) and **BottomNav / Sidebar** (`KBottomNav`/`ProtoTabBar` / `WSidebar`) — app chrome, needed before any screen can be assembled.
5. **Badge / Chip / PillTab** (`KBadge`, `KChip`/`ProtoChip` / `WPillTab`) — status labels, filters, match-score badges.
6. **ListingCard** (`KListingCard`) — the core discovery unit (home, search, favorit, properti saya).
7. **StarRow** (`KStarRow`) — ratings, reused inside `ListingCard` and detail/review contexts.
8. **StepBar / wizard indicator** (`KStepBar`) — booking flow (mobile) and Tambah Kost wizard (web).
9. **KPI Card** (`WKpiCard`) — dashboard home and finance screens (web-only, but shares Card styling).
10. **Toggle / ToggleRow / Checkbox** (`WToggle`, `WToggleRow`, `WCheckbox`) — settings and filter screens.
11. **StatusBar** (`KStatusBar`, mobile-only) — prototype chrome, low effort, needed for every mobile screen shell.
12. **Logo** (`KostinLogo`) — shared brand mark, light/dark variants, used in every nav/top bar.

Everything else (tables, funnels, chat panes, timeline logs) is a Later-phase
composition of the components above and can be built screen-by-screen once
this base set exists.
