import { Landmark, Wallet } from "lucide-react";
import { WHeader } from "@/components/layout/WHeader";
import { WCard } from "@/components/ui/WCard";
import { WButton } from "@/components/ui/WButton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Keuangan is intentionally empty until Phase 2. Every figure here — revenue,
// withdrawable balance, unpaid bills, transaction history, payout bank
// accounts, and the withdrawal flow — must come from payment-service
// (revenue/transactions/withdrawals) and escrow-service (held/withdrawable
// balance), neither of which exists yet (see CLAUDE.md service table + the
// FRONTEND_AUDIT.md report). Until those services are built and the
// corresponding /api proxies exist, this page shows honest empty states rather
// than fabricated numbers.
//
// Phase 2 wiring TODO:
//   - KPIs + transactions -> payment-service
//   - withdrawable balance + "Tarik Saldo" -> escrow-service + payment-service

const PHASE2_NOTE = "Data keuangan aktif setelah fitur pembayaran (Phase 2)";

export default function FinancePage(): JSX.Element {
  return (
    <>
      <WHeader
        trail={["Dashboard", "Keuangan"]}
        title="Manajemen Keuangan"
        subtitle="Pantau arus kas, tagihan, dan ajukan penarikan saldo properti Anda."
        action={
          // The tooltip lives on the wrapper, not the button: WButton applies
          // `disabled:pointer-events-none`, so a `title` on a disabled button
          // would never surface on hover.
          <span title="Tersedia setelah fitur pembayaran aktif" className="inline-flex">
            <WButton icon={<Landmark className="h-4 w-4" />} disabled aria-disabled>
              Tarik Saldo
            </WButton>
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <WCard pad={22}>
          <div className="mb-2.5 flex items-start justify-between">
            <span className="text-[13.5px] text-textSec">Total Pendapatan Bulan Ini</span>
          </div>
          <div className="font-heading text-[22px] font-bold text-textMid">Belum ada data</div>
          <div className="mt-1.5 text-xs text-textLight">{PHASE2_NOTE}</div>
        </WCard>

        <WCard pad={22}>
          <div className="mb-2.5 flex items-start justify-between">
            <span className="text-[13.5px] text-textSec">Saldo yang Dapat Ditarik</span>
            <Wallet className="h-4 w-4 text-textMid" />
          </div>
          <div className="font-heading text-[22px] font-bold text-textMid">Belum ada data</div>
          <div className="mt-1.5 text-xs text-textLight">{PHASE2_NOTE}</div>
        </WCard>

        <WCard pad={22}>
          <div className="mb-2.5 flex items-start justify-between">
            <span className="text-[13.5px] text-textSec">Tagihan Belum Dibayar</span>
          </div>
          <div className="font-heading text-[22px] font-bold text-textMid">Belum ada data</div>
          <div className="mt-1.5 text-xs text-textLight">{PHASE2_NOTE}</div>
        </WCard>
      </div>

      <WCard noPadding>
        <div className="flex items-center justify-between px-6 py-5">
          <span className="font-heading text-[17px] font-semibold text-text">Riwayat Transaksi</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead className="w-[35%]">Nama Penyewa/Keperluan</TableHead>
              <TableHead>Properti</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Jumlah</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="py-12 text-center text-sm text-textMid">
                Belum ada transaksi.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </WCard>
    </>
  );
}
