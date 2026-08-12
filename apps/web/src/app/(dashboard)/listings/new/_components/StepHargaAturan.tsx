"use client";

import * as React from "react";
import { WField } from "@/components/ui/WField";
import { WSectionCard } from "@/components/ui/WSectionCard";
import { WSelect } from "@/components/ui/WSelect";
import { cn } from "@/lib/utils";
import {
  HOUSE_RULE_OPTIONS,
  PAYMENT_DURATION_OPTIONS,
  type HouseRulesState,
  type KostFormState,
  type PaymentDuration,
} from "./types";

export interface StepHargaAturanProps {
  form: KostFormState;
  onChange: (patch: Partial<KostFormState>) => void;
}

const digitsOnly = (value: string): string => value.replace(/[^\d]/g, "");

// "1500000" -> "1.500.000" for the helper line under a money input, so an
// owner can see at a glance whether they typed one zero too many.
function formatRupiah(digits: string): string | undefined {
  if (!digits) return undefined;
  return `Rp ${Number(digits).toLocaleString("id-ID")}`;
}

function Toggle({
  checked,
  onChange,
  positive,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  positive: boolean;
  label: string;
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex h-[22px] w-10 shrink-0 items-center rounded-full p-0.5 transition-colors",
        checked ? (positive ? "bg-success" : "bg-accent") : "bg-border",
      )}
    >
      <span
        className={cn(
          "h-[18px] w-[18px] rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-0",
        )}
      />
    </button>
  );
}

export function StepHargaAturan({ form, onChange }: StepHargaAturanProps): React.JSX.Element {
  const setRule = (key: keyof HouseRulesState, value: boolean): void =>
    onChange({ houseRules: { ...form.houseRules, [key]: value } });

  const depositMissing = form.depositEnabled && !form.deposit;

  return (
    <div className="flex flex-col gap-6">
      <WSectionCard title="💳 Harga Sewa & Deposit">
        <div className="flex flex-col gap-4 sm:flex-row">
          <WField
            label="Harga Sewa"
            prefix="Rp"
            placeholder="1.500.000"
            inputMode="numeric"
            value={form.price}
            onChange={(e) => onChange({ price: digitsOnly(e.target.value) })}
            note={formatRupiah(form.price) ?? "Harga sewa per periode pembayaran di bawah."}
          />
          <WSelect
            label="Durasi Pembayaran"
            value={form.paymentDuration}
            onChange={(e) => onChange({ paymentDuration: e.target.value as PaymentDuration })}
          >
            {PAYMENT_DURATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </WSelect>
        </div>

        <label className="flex items-center justify-between gap-4 rounded-lg border border-border bg-bg px-3.5 py-3">
          <span className="min-w-0">
            <span className="block text-[13.5px] font-semibold text-text">
              Uang Muka / Deposit Keamanan
            </span>
            <span className="mt-0.5 block text-[11.5px] text-textMid">
              Dibayar sekali di awal dan dikembalikan saat penghuni keluar.
            </span>
          </span>
          <Toggle
            label="Uang Muka / Deposit Keamanan"
            checked={form.depositEnabled}
            positive
            onChange={(next) =>
              // Clearing the amount alongside the toggle keeps the form from
              // holding a nominal the owner can no longer see — and matches
              // the API, which stores nothing for a disabled deposit.
              onChange({ depositEnabled: next, ...(next ? {} : { deposit: "" }) })
            }
          />
        </label>

        {form.depositEnabled ? (
          <WField
            label="Nominal Deposit"
            prefix="Rp"
            placeholder="500.000"
            inputMode="numeric"
            value={form.deposit}
            onChange={(e) => onChange({ deposit: digitsOnly(e.target.value) })}
            error={depositMissing ? "Isi nominal deposit atau matikan opsi ini" : undefined}
            note={formatRupiah(form.deposit)}
          />
        ) : null}
      </WSectionCard>

      <WSectionCard title="🚪 Aturan Kost & Akses">
        <div className="flex flex-col gap-2.5">
          {HOUSE_RULE_OPTIONS.map(({ key, label, hint, positive }) => (
            <label
              key={key}
              className="flex items-center justify-between gap-4 rounded-lg border border-border bg-bg px-3.5 py-3"
            >
              <span className="min-w-0">
                <span className="block text-[13.5px] font-semibold text-text">{label}</span>
                <span className="mt-0.5 block text-[11.5px] leading-[1.5] text-textMid">{hint}</span>
              </span>
              <Toggle
                label={label}
                checked={form.houseRules[key]}
                positive={positive}
                onChange={(next) => setRule(key, next)}
              />
            </label>
          ))}
        </div>

        <WField
          textarea
          label="Aturan Tambahan"
          placeholder={"Satu aturan per baris, mis.\nJam malam pukul 22.00\nWajib lapor jika menginap di luar"}
          value={form.additionalRules}
          onChange={(e) => onChange({ additionalRules: e.target.value })}
          note="Satu aturan per baris. Baris kosong diabaikan."
        />
      </WSectionCard>

      <WSectionCard title="➕ Biaya Tambahan">
        <p className="text-[11.5px] leading-[1.6] text-textMid">
          Biaya bulanan di luar harga sewa. Kosongkan jika tidak dikenakan.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <WField
            label="Penghuni Tambahan"
            prefix="Rp"
            placeholder="300.000"
            inputMode="numeric"
            value={form.feeExtraOccupant}
            onChange={(e) => onChange({ feeExtraOccupant: digitsOnly(e.target.value) })}
            note={formatRupiah(form.feeExtraOccupant) ?? "per orang / bulan"}
          />
          <WField
            label="Parkir Motor"
            prefix="Rp"
            placeholder="50.000"
            inputMode="numeric"
            value={form.feeMotorcycleParking}
            onChange={(e) => onChange({ feeMotorcycleParking: digitsOnly(e.target.value) })}
            note={formatRupiah(form.feeMotorcycleParking) ?? "per motor / bulan"}
          />
          <WField
            label="Parkir Mobil"
            prefix="Rp"
            placeholder="150.000"
            inputMode="numeric"
            value={form.feeCarParking}
            onChange={(e) => onChange({ feeCarParking: digitsOnly(e.target.value) })}
            note={formatRupiah(form.feeCarParking) ?? "per mobil / bulan"}
          />
        </div>
      </WSectionCard>
    </div>
  );
}

export default StepHargaAturan;
