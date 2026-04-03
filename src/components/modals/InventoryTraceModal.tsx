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
}

export function InventoryTraceModal({
  isOpen,
  onClose,
  item,
  inventoryId,
  title,
}: InventoryTraceModalProps) {
  const [events, setEvents] = useState<InventoryStockEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [quantityChange, setQuantityChange] = useState("");
  const [reason, setReason] = useState("");

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

  const formatDiscrepancyChange = (ev: InventoryStockEvent) => {
    // Prefer sellable-impact number (actual), then expected, then quantity.
    const primary = ev.actual_delta !== 0 ? ev.actual_delta : ev.expected_delta !== 0 ? ev.expected_delta : ev.quantity_delta;
    return `${primary > 0 ? "+" : ""}${primary}`;
  };

  const handleAddDiscrepancy = () => {
    // UI scaffold matches requested modal; persistence workflow can be wired to your preferred rule.
    if (!quantityChange.trim() || !reason.trim()) {
      toast.error("Please enter both quantity change and reason");
      return;
    }
    toast.info("Discrepancy record form is ready. Confirm the exact save rule and I can wire persistence next.");
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={title} maxWidth="lg">
      <div className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-4">
          <div className="grid grid-cols-[180px_1fr] gap-y-2 text-sm">
            <div className="text-gray-600">Product:</div>
            <div className="font-semibold text-right text-gray-900">{item?.product_name || "-"}</div>
            <div className="text-gray-600">SKU:</div>
            <div className="font-semibold text-right text-blue-600">{item?.sku || "-"}</div>
            <div className="text-gray-600">Expected Quantity:</div>
            <div className="font-semibold text-right text-gray-900">{item?.expected ?? "-"}</div>
            <div className="text-gray-600">Actual Quantity:</div>
            <div className="font-semibold text-right text-gray-900">{item?.actual ?? "-"}</div>
            <div className="col-span-2 border-t border-gray-200 my-1" />
            <div className="text-gray-700">Total Difference:</div>
            <div className={`font-bold text-right ${item && item.difference < 0 ? "text-red-600" : "text-gray-900"}`}>
              {item?.difference ?? "-"}
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">Individual Discrepancies</h3>
          {isLoading ? (
            <div className="rounded-lg border border-gray-200 p-6 text-center text-gray-500">Loading trace...</div>
          ) : discrepancyEvents.length === 0 ? (
            <div className="rounded-lg border border-gray-200 p-6 text-center text-gray-500">No discrepancy records found.</div>
          ) : (
            <div className="space-y-3">
              {discrepancyEvents.map((ev, index) => (
                <div key={ev.event_id} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-medium">
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

        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-2xl font-semibold text-gray-900 mb-3">Add New Discrepancy Record</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Change</label>
              <input
                type="number"
                value={quantityChange}
                onChange={(e) => setQuantityChange(e.target.value)}
                placeholder="Enter negative for shortage, positive for surplus"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">Use negative numbers for shortages (e.g., -1 for 1 missing)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain the reason (e.g., damaged, lost, returned to supplier, theft)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
          <button
            onClick={handleAddDiscrepancy}
            className="px-6 py-2 rounded-lg bg-[#040B2A] text-white hover:bg-[#0B143D]"
          >
            Add Discrepancy Record
          </button>
        </div>
      </div>
    </BaseModal>
  );
}

