"use client";

import * as React from "react";
import { Check, Landmark, TrendingUp, Wallet } from "lucide-react";
import { WHeader } from "@/components/layout/WHeader";
import { WCard } from "@/components/ui/WCard";
import { WButton } from "@/components/ui/WButton";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  date: string;
  name: string;
  property: string;
  type: "in" | "out";
  amount: number;
  status: "Berhasil" | "Pending" | "Pengeluaran";
}

const TRANSACTIONS: Transaction[] = [
  { id: "t1", date: "24 Mei 2026", name: "Andi Pratama - Sewa Kamar A1", property: "Kost Lavender", type: "in", amount: 1_500_000, status: "Berhasil" },
  { id: "t2", date: "22 Mei 2026", name: "Beli Token Listrik Utama", property: "Kost Lavender", type: "out", amount: 200_000, status: "Pengeluaran" },
  { id: "t3", date: "20 Mei 2026", name: "Siti Aminah - Sewa Kamar B3", property: "Kost Rose", type: "in", amount: 1_800_000, status: "Pending" },
];

const STATUS_VARIANT: Record<Transaction["status"], BadgeProps["variant"]> = {
  Berhasil: "success",
  Pending: "warning",
  Pengeluaran: "neutral",
};

const BANK_ACCOUNTS = [
  { id: "bca", label: "Bank Central Asia (BCA) - 816****123 a.n. Pak Budi" },
  { id: "mandiri", label: "Bank Mandiri - 123****456 a.n. Pak Budi" },
  { id: "bri", label: "Bank Rakyat Indonesia (BRI) - 987****654 a.n. Pak Budi" },
];

const WITHDRAWABLE_BALANCE = 5_200_000;
const QUICK_AMOUNTS = [WITHDRAWABLE_BALANCE, 1_000_000, 2_000_000];

function formatRupiah(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export default function FinancePage(): JSX.Element {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [amount, setAmount] = React.useState(WITHDRAWABLE_BALANCE);
  const [bankId, setBankId] = React.useState(BANK_ACCOUNTS[0]!.id);
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  const handleWithdraw = async (): Promise<void> => {
    setSubmitting(true);
    try {
      // TODO: wire to payment-service POST /withdrawals once the API client exists.
      await new Promise((resolve) => setTimeout(resolve, 700));
      setSuccess(true);
    } finally {
      setSubmitting(false);
    }
  };

  const closeDialog = (): void => {
    setDialogOpen(false);
    setSuccess(false);
  };

  return (
    <>
      <WHeader
        trail={["Dashboard", "Keuangan"]}
        title="Manajemen Keuangan"
        subtitle="Pantau arus kas, tagihan, dan ajukan penarikan saldo properti Anda."
        action={
          <WButton icon={<Landmark className="h-4 w-4" />} onClick={() => setDialogOpen(true)}>
            Tarik Saldo
          </WButton>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <WCard pad={22}>
          <div className="mb-2.5 flex items-start justify-between">
            <span className="text-[13.5px] text-textSec">Total Pendapatan Bulan Ini</span>
            <Badge className="bg-success/25 text-escrow">
              <TrendingUp className="mr-1 h-3 w-3" /> +12%
            </Badge>
          </div>
          <div className="font-heading text-[22px] font-bold text-text">Rp 18.450.000</div>
        </WCard>

        <WCard pad={22}>
          <div className="mb-2.5 flex items-start justify-between">
            <span className="text-[13.5px] text-textSec">Saldo yang Dapat Ditarik</span>
            <Wallet className="h-4 w-4 text-textMid" />
          </div>
          <div className="mb-1.5 font-heading text-[22px] font-bold text-text">{formatRupiah(WITHDRAWABLE_BALANCE)}</div>
          <div className="text-xs text-textMid">Menunggu penyelesaian sewa: Rp 2.500.000</div>
        </WCard>

        <WCard pad={22}>
          <div className="mb-2.5 flex items-start justify-between">
            <span className="text-[13.5px] text-textSec">Tagihan Belum Dibayar</span>
            <Badge variant="error">2 Penyewa</Badge>
          </div>
          <div className="mb-1.5 font-heading text-[22px] font-bold text-text">Rp 1.200.000</div>
          <span className="text-[12.5px] font-semibold text-accent">Lihat Detail →</span>
        </WCard>
      </div>

      <WCard noPadding>
        <div className="flex items-center justify-between px-6 py-5">
          <span className="font-heading text-[17px] font-semibold text-text">Riwayat Transaksi</span>
          <span className="text-[12.5px] font-semibold text-accent">Lihat Semua →</span>
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
            {TRANSACTIONS.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="text-[12.5px] text-textMid">{t.date}</TableCell>
                <TableCell className="text-[13.5px] font-semibold text-text">{t.name}</TableCell>
                <TableCell className="text-[12.5px] text-textMid">{t.property}</TableCell>
                <TableCell>
                  <Badge variant={t.type === "in" ? "success" : "neutral"}>
                    {t.type === "in" ? "↓ Pemasukan" : "↑ Pengeluaran"}
                  </Badge>
                </TableCell>
                <TableCell
                  className={cn(
                    "font-heading text-[13.5px] font-bold",
                    t.type === "in" ? "text-success" : "text-text",
                  )}
                >
                  {t.type === "in" ? "+" : "-"}
                  {formatRupiah(t.amount)}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[t.status]}>{t.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </WCard>

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent>
          {success ? (
            <DialogBody className="items-center py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-successSoft text-success">
                <Check className="h-7 w-7" />
              </div>
              <DialogTitle>Penarikan Berhasil Diajukan</DialogTitle>
              <DialogDescription>
                {formatRupiah(amount)} sedang diproses ke {BANK_ACCOUNTS.find((b) => b.id === bankId)?.label}. Dana
                biasanya cair dalam 1×24 jam kerja.
              </DialogDescription>
              <WButton type="button" fullWidth onClick={closeDialog} className="mt-2">
                Selesai
              </WButton>
            </DialogBody>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Tarik Saldo Properti</DialogTitle>
                <DialogDescription>Tarik pendapatan sewa Anda ke rekening bank terdaftar.</DialogDescription>
              </DialogHeader>
              <DialogBody>
                <div className="rounded-[10px] border border-accentBorder bg-accentSoft px-4 py-3.5">
                  <span className="text-[13.5px] font-bold text-accent">
                    Saldo yang dapat ditarik: {formatRupiah(WITHDRAWABLE_BALANCE)}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-wide text-textSec">Jumlah Penarikan</span>
                  <div className="mt-2 rounded-lg border-[1.5px] border-border px-4 py-3">
                    <span className="text-base font-semibold text-text">{formatRupiah(amount)}</span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {QUICK_AMOUNTS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setAmount(q)}
                        className={cn(
                          "rounded-full border-[1.5px] px-3.5 py-1.5 text-xs font-semibold transition-colors",
                          amount === q ? "border-accent text-accent" : "border-border text-textMid",
                        )}
                      >
                        {q === WITHDRAWABLE_BALANCE ? "Tarik Semua" : formatRupiah(q)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-wide text-textSec">Rekening Bank Tujuan</span>
                  <div className="mt-2 overflow-hidden rounded-[10px] border-[1.5px] border-border">
                    {BANK_ACCOUNTS.map((bank, i) => (
                      <button
                        key={bank.id}
                        type="button"
                        onClick={() => setBankId(bank.id)}
                        className={cn(
                          "flex w-full items-center justify-between px-3.5 py-3 text-left text-[13px] transition-colors",
                          bankId === bank.id ? "bg-accentSoft font-bold text-accent" : "text-text",
                          i < BANK_ACCOUNTS.length - 1 && "border-b border-borderLight",
                        )}
                      >
                        {bank.label}
                        {bankId === bank.id ? <Check className="h-4 w-4 shrink-0" /> : null}
                      </button>
                    ))}
                  </div>
                </div>

                <WButton type="button" fullWidth loading={submitting} onClick={handleWithdraw}>
                  Konfirmasi Penarikan
                </WButton>
              </DialogBody>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
