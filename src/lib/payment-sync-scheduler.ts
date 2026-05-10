import { runPaymentSync } from "@/lib/payment-sync";

declare global {
  var __hpcsPaymentSyncSchedulerStarted: boolean | undefined;
  var __hpcsPaymentSyncSchedulerTimer:
    | ReturnType<typeof setInterval>
    | undefined;
}

function normalizeIntervalMs(): number {
  const value = Number(process.env.XGATE_SYNC_INTERVAL_MS);
  if (!Number.isFinite(value) || value <= 0) {
    return 300_000;
  }

  return Math.max(60_000, Math.floor(value));
}

export function bootstrapPaymentSyncScheduler(): boolean {
  if (process.env.XGATE_SYNC_ENABLED !== "true") {
    return false;
  }

  if (globalThis.__hpcsPaymentSyncSchedulerStarted) {
    return false;
  }

  const intervalMs = normalizeIntervalMs();

  const executeSync = async () => {
    try {
      await runPaymentSync({ source: "scheduler" });
    } catch (error) {
      console.error("[payment-sync-scheduler] Sync failed:", error);
    }
  };

  globalThis.__hpcsPaymentSyncSchedulerStarted = true;
  void executeSync();
  globalThis.__hpcsPaymentSyncSchedulerTimer = setInterval(
    executeSync,
    intervalMs,
  );

  return true;
}
