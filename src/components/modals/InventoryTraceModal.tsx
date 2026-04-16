import { useEffect, useState } from "react";
import { BaseModal } from "./BaseModal";
import { api, type InventoryItem, type InventoryStockEvent } from "@/services/api";
import { toast } from "sonner";

interface InventoryTraceModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  inventoryId: number | null;
  title: string;
  onSuccess?: () => void;
}

export function InventoryTraceModal({
  isOpen,
  onClose,
  item,
  inventoryId,
  title,
  onSuccess,
}: InventoryTraceModalProps) {
  const [events, setEvents] = useState<InventoryStockEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [quantityAmount, setQuantityAmount] = useState("");
  const [reason, setReason] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (!isOpen || !inventoryId) return;

    setIsLoading(true);
    api
      .getInventoryTrace(inventoryId)
      .then((res) => setEvents(res))
      .catch((err) => {
        console.error("Failed to fetch inventory trace:", err);
        setEvents([]);
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, inventoryId]);

  const discrepancyEvents = events.filter((ev) => {
    // Only show negative changes (Shortages/Deductions)
    const primary = ev.actual_delta !== 0 ? ev.actual_delta : ev.expected_delta !== 0 ? ev.expected_delta : ev.quantity_delta;
    return primary < 0;
  });

  const filteredDiscrepancyEvents = discrepancyEvents.filter((ev) => {
    if (!ev.created_at) return false;
    const eventDate = new Date(ev.created_at);
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      if (eventDate < fromDate) return false;
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (eventDate > toDate) return false;
    }
    return true;
  });

  const formatDiscrepancyChange = (ev: InventoryStockEvent) => {
    // Prefer sellable-impact number (actual), then expected, then quantity.
    const primary = ev.actual_delta !== 0 ? ev.actual_delta : ev.expected_delta !== 0 ? ev.expected_delta : ev.quantity_delta;
    return `${primary > 0 ? "+" : ""}${primary}`;
  };

  const refreshTrace = async () => {
    if (!inventoryId) return;
    setIsLoading(true);
    try {
      const res = await api.getInventoryTrace(inventoryId);
      setEvents(res);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDiscrepancy = async () => {
    if (!inventoryId) return;
    if (!quantityAmount.trim() || !reason.trim()) {
      toast.error("Please enter both quantity and reason");
      return;
    }
    const parsedAmount = Number(quantityAmount);
    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      toast.error("Quantity must be a positive whole number");
      return;
    }
    const quantityChange = -parsedAmount;

    setIsSaving(true);
    try {
      await api.addInventoryDiscrepancy(inventoryId, {
        quantity_change: quantityChange,
        reason: reason.trim(),
      });
      toast.success("Discrepancy record added successfully");
      setQuantityAmount("");
      setReason("");
      await refreshTrace();
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add discrepancy record");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={title} maxWidth="lg">
      <div className="flex h-[min(74vh,700px)] min-h-0 flex-col overflow-hidden">
        <div className="min-h-0 space-y-3 overflow-y-auto pr-1">
          <div className="rounded-lg border border-border bg-muted/50/70 p-3">
            <div className="grid grid-cols-[150px_1fr] gap-y-2 text-sm md:grid-cols-[180px_1fr]">
              <div className="text-muted-foreground">Product:</div>
              <div className="font-semibold text-right text-foreground">{item?.product_name || "-"}</div>
              <div className="text-muted-foreground">SKU:</div>
              <div className="font-semibold text-right text-primary">{item?.sku || "-"}</div>
              <div className="text-muted-foreground">Supplier:</div>
              <div className="font-semibold text-right text-foreground">{item?.supplier_name || "-"}</div>
              <div className="text-muted-foreground">Expiry Date:</div>
              <div className="font-semibold text-right text-foreground">
                {item?.expiry_date ? (
                  <span className={
                    new Date(item.expiry_date) < new Date() 
                      ? "text-red-600 font-bold" 
                      : (new Date(item.expiry_date).getTime() - new Date().getTime()) < 30 * 24 * 60 * 60 * 1000
                      ? "text-orange-600 font-bold"
                      : "text-foreground"
                  }>
                    {item.expiry_date}
                  </span>
                ) : "-"}
              </div>
              <div className="text-muted-foreground">Expected Quantity:</div>
              <div className="font-semibold text-right text-foreground">{item?.expected ?? "-"}</div>
              <div className="text-muted-foreground">Actual Quantity:</div>
              <div className="font-semibold text-right text-foreground">{item?.actual ?? "-"}</div>
              <div className="col-span-2 my-1 border-t border-border" />
              <div className="text-muted-foreground">Total Difference:</div>
              <div className={`font-bold text-right ${item && item.difference < 0 ? "text-red-600" : "text-foreground"}`}>
                {item?.difference ?? "-"}
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">Individual Discrepancies</h3>
            <div className="mb-3 flex flex-wrap gap-3">
              <div className="flex-1 min-w-[140px]">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            {isLoading ? (
              <div className="rounded-lg border border-border p-6 text-center text-muted-foreground">Loading trace...</div>
            ) : filteredDiscrepancyEvents.length === 0 ? (
              <div className="rounded-lg border border-border p-6 text-center text-muted-foreground">
                {(dateFrom || dateTo) ? "No discrepancy records found for the selected filters." : "No discrepancy records found."}
              </div>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {filteredDiscrepancyEvents.map((ev, index) => (
                  <div key={ev.event_id} className="rounded-lg border border-border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-primary/90">
                          Item {index + 1}
                        </span>
                        <span className={`text-xl font-bold ${formatDiscrepancyChange(ev).startsWith("-") ? "text-red-600" : "text-green-600"}`}>
                          {formatDiscrepancyChange(ev)} piece
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {ev.created_at ? new Date(ev.created_at).toLocaleDateString() : "-"}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Reason: {ev.reason || ev.event_type}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border pt-3">
            <h3 className="mb-2 text-lg font-semibold text-foreground">Add New Discrepancy Record</h3>
            <div className="space-y-2">
              <div className="grid grid-cols-1">
                <div>
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">Quantity to Deduct</label>
                  <input
                    type="number"
                    value={quantityAmount}
                    onChange={(e) => setQuantityAmount(e.target.value)}
                    placeholder="Enter quantity"
                    min="1"
                    className="w-full rounded-lg border border-border px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-muted-foreground">Reason</label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain the reason (e.g., damaged, lost, returned to supplier, theft)"
                  className="w-full resize-none rounded-lg border border-border px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex shrink-0 justify-end gap-3 border-t border-border pt-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-6 py-2 text-muted-foreground hover:bg-muted/50"
          >
            Close
          </button>
          <button
            onClick={handleAddDiscrepancy}
            disabled={isSaving}
            className="rounded-lg bg-[#040B2A] px-6 py-2 text-white hover:bg-[#0B143D]"
          >
            {isSaving ? "Adding..." : "Add Discrepancy Record"}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}

