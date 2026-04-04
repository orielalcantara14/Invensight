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
  const [discrepancyType, setDiscrepancyType] = useState<"shortage" | "surplus">("shortage");
  const [quantityAmount, setQuantityAmount] = useState("");
  const [reason, setReason] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterType, setFilterType] = useState<"all" | "shortage" | "surplus">("all");

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

  const discrepancyEvents = events.filter(
    (ev) => ev.quantity_delta !== 0 || ev.expected_delta !== 0 || ev.actual_delta !== 0
  );

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
    if (filterType === "shortage") {
      const primary = ev.actual_delta !== 0 ? ev.actual_delta : ev.expected_delta !== 0 ? ev.expected_delta : ev.quantity_delta;
      if (primary >= 0) return false;
    }
    if (filterType === "surplus") {
      const primary = ev.actual_delta !== 0 ? ev.actual_delta : ev.expected_delta !== 0 ? ev.expected_delta : ev.quantity_delta;
      if (primary <= 0) return false;
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
    const quantityChange = discrepancyType === "shortage" ? -parsedAmount : parsedAmount;

    setIsSaving(true);
    try {
      await api.addInventoryDiscrepancy(inventoryId, {
        quantity_change: quantityChange,
        reason: reason.trim(),
      });
      toast.success("Discrepancy record added successfully");
      setQuantityAmount("");
      setReason("");
      setDiscrepancyType("shortage");
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
          <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-3">
            <div className="grid grid-cols-[150px_1fr] gap-y-2 text-sm md:grid-cols-[180px_1fr]">
              <div className="text-gray-600">Product:</div>
              <div className="font-semibold text-right text-gray-900">{item?.product_name || "-"}</div>
              <div className="text-gray-600">SKU:</div>
              <div className="font-semibold text-right text-blue-600">{item?.sku || "-"}</div>
              <div className="text-gray-600">Expected Quantity:</div>
              <div className="font-semibold text-right text-gray-900">{item?.expected ?? "-"}</div>
              <div className="text-gray-600">Actual Quantity:</div>
              <div className="font-semibold text-right text-gray-900">{item?.actual ?? "-"}</div>
              <div className="col-span-2 my-1 border-t border-gray-200" />
              <div className="text-gray-700">Total Difference:</div>
              <div className={`font-bold text-right ${item && item.difference < 0 ? "text-red-600" : "text-gray-900"}`}>
                {item?.difference ?? "-"}
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Individual Discrepancies</h3>
            <div className="mb-3 flex flex-wrap gap-3">
              <div className="flex-1 min-w-[140px]">
                <label className="mb-1 block text-xs font-medium text-gray-600">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="mb-1 block text-xs font-medium text-gray-600">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="mb-1 block text-xs font-medium text-gray-600">Discrepancy Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as "all" | "shortage" | "surplus")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Discrepancies</option>
                  <option value="shortage">Shortage (-)</option>
                  <option value="surplus">Surplus (+)</option>
                </select>
              </div>
            </div>
            {isLoading ? (
              <div className="rounded-lg border border-gray-200 p-6 text-center text-gray-500">Loading trace...</div>
            ) : filteredDiscrepancyEvents.length === 0 ? (
              <div className="rounded-lg border border-gray-200 p-6 text-center text-gray-500">
                {(dateFrom || dateTo || filterType !== "all") ? "No discrepancy records found for the selected filters." : "No discrepancy records found."}
              </div>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {filteredDiscrepancyEvents.map((ev, index) => (
                  <div key={ev.event_id} className="rounded-lg border border-gray-200 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                          Item {index + 1}
                        </span>
                        <span className={`text-xl font-bold ${formatDiscrepancyChange(ev).startsWith("-") ? "text-red-600" : "text-green-600"}`}>
                          {formatDiscrepancyChange(ev)} piece
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {ev.created_at ? new Date(ev.created_at).toLocaleDateString() : "-"}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700">
                      Reason: {ev.reason || ev.event_type}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-3">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Add New Discrepancy Record</h3>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Discrepancy Type</label>
                  <select
                    value={discrepancyType}
                    onChange={(e) => setDiscrepancyType(e.target.value as "shortage" | "surplus")}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="shortage">Shortage (-)</option>
                    <option value="surplus">Surplus (+)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Quantity</label>
                  <input
                    type="number"
                    value={quantityAmount}
                    onChange={(e) => setQuantityAmount(e.target.value)}
                    placeholder="Enter quantity"
                    min="1"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Reason</label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain the reason (e.g., damaged, lost, returned to supplier, theft)"
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex shrink-0 justify-end gap-3 border-t border-gray-200 pt-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-6 py-2 text-gray-700 hover:bg-gray-50"
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

