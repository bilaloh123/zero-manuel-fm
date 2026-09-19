import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useVehicleOptions } from "../../hooks/useVehicleOptions";
import { useDriverOptions } from "../../hooks/useDriverOptions";
import { useWarehouseOptions } from "../../hooks/useWarehouseOptions";

function nowLocalDateTime() {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function TransferActionModal({ open, transfer, nextStatus, onClose, onSaved }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { vehicles } = useVehicleOptions(transfer.source_farm_id);
  const { drivers } = useDriverOptions(transfer.source_farm_id);
  const { warehouses: sourceWarehouses } = useWarehouseOptions(transfer.source_farm_id);
  const { warehouses: destinationWarehouses } = useWarehouseOptions(transfer.destination_farm_id);

  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [departureTime, setDepartureTime] = useState(nowLocalDateTime());
  const [arrivalTime, setArrivalTime] = useState(nowLocalDateTime());
  const [sourceWarehouseId, setSourceWarehouseId] = useState("");
  const [destinationWarehouseId, setDestinationWarehouseId] = useState("");
  const [sentQuantity, setSentQuantity] = useState(transfer.quantity ?? "");
  const [receivedQuantity, setReceivedQuantity] = useState(transfer.quantity ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isDispatch = nextStatus === "out_for_delivery";
  const isReceive = nextStatus === "received";
  const isCancel = nextStatus === "cancelled";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (isReceive) {
        const sent = Number(sentQuantity);
        const received = Number(receivedQuantity);

        const { error: transferError } = await supabase
          .from("transfers")
          .update({
            status: "received",
            arrival_time: new Date(arrivalTime).toISOString(),
            sent_quantity: sent,
            received_quantity: received,
            variance: received - sent,
          })
          .eq("id", transfer.id);
        if (transferError) throw transferError;

        const { error: outError } = await supabase.from("stock_movements").insert({
          farm_id: transfer.source_farm_id,
          movement_type: "TRANSFER_OUT",
          product_id: transfer.product_id,
          quantity: sent,
          source_warehouse_id: sourceWarehouseId,
          user_id: user.id,
          reason: `Transfert vers ${transfer.destination_farm_id}`,
        });
        if (outError) throw outError;

        const { error: inError } = await supabase.from("stock_movements").insert({
          farm_id: transfer.destination_farm_id,
          movement_type: "TRANSFER_IN",
          product_id: transfer.product_id,
          quantity: received,
          destination_warehouse_id: destinationWarehouseId,
          user_id: user.id,
          reason: `Transfert depuis ${transfer.source_farm_id}`,
        });
        if (inError) throw inError;
      } else {
        const payload = { status: nextStatus };
        if (nextStatus === "approved") payload.approved_by = user.id;
        if (isDispatch) {
          payload.vehicle_id = vehicleId || null;
          payload.driver_id = driverId || null;
          payload.departure_time = new Date(departureTime).toISOString();
        }
        const { error: updateError } = await supabase.from("transfers").update(payload).eq("id", transfer.id);
        if (updateError) throw updateError;
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t(`transfers.actions.${nextStatus}`)}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            form="transfer-action-form"
            variant={isCancel ? "danger" : "primary"}
            disabled={saving || (isReceive && (!sourceWarehouseId || !destinationWarehouseId))}
          >
            {t("common.confirm")}
          </Button>
        </>
      }
    >
      <form id="transfer-action-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!isDispatch && !isReceive && (
          <p className="text-sm text-ink">{t(`transfers.confirmMessages.${nextStatus}`)}</p>
        )}

        {isDispatch && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormField label={t("transfers.fields.vehicle")} htmlFor="vehicle_id">
                <select id="vehicle_id" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className={inputClass}>
                  <option value="">—</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate_no}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label={t("transfers.fields.driver")} htmlFor="driver_id">
                <select id="driver_id" value={driverId} onChange={(e) => setDriverId(e.target.value)} className={inputClass}>
                  <option value="">—</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.full_name}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
            <FormField label={t("transfers.fields.departureTime")} htmlFor="departure_time">
              <input
                id="departure_time"
                type="datetime-local"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className={inputClass}
              />
            </FormField>
          </>
        )}

        {isReceive && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormField label={t("transfers.fields.sourceWarehouse")} htmlFor="source_warehouse_id">
                <select
                  id="source_warehouse_id"
                  required
                  value={sourceWarehouseId}
                  onChange={(e) => setSourceWarehouseId(e.target.value)}
                  className={inputClass}
                >
                  <option value="" disabled>
                    {t("transfers.fields.sourceWarehouse")}
                  </option>
                  {sourceWarehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label={t("transfers.fields.destinationWarehouse")} htmlFor="destination_warehouse_id">
                <select
                  id="destination_warehouse_id"
                  required
                  value={destinationWarehouseId}
                  onChange={(e) => setDestinationWarehouseId(e.target.value)}
                  className={inputClass}
                >
                  <option value="" disabled>
                    {t("transfers.fields.destinationWarehouse")}
                  </option>
                  {destinationWarehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label={t("transfers.fields.sentQuantity")} htmlFor="sent_quantity">
                <input
                  id="sent_quantity"
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={sentQuantity}
                  onChange={(e) => setSentQuantity(e.target.value)}
                  className={inputClass}
                />
              </FormField>
              <FormField label={t("transfers.fields.receivedQuantity")} htmlFor="received_quantity">
                <input
                  id="received_quantity"
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={receivedQuantity}
                  onChange={(e) => setReceivedQuantity(e.target.value)}
                  className={inputClass}
                />
              </FormField>
            </div>
            <FormField label={t("transfers.fields.arrivalTime")} htmlFor="arrival_time">
              <input
                id="arrival_time"
                type="datetime-local"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                className={inputClass}
              />
            </FormField>
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
