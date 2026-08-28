import React, { useState } from "react";
import { useBakery, ParsedOrder } from "../context/BakeryContext";

export const QuickOrderView: React.FC<{ onOrderSaved: () => void }> = ({ onOrderSaved }) => {
  const { products, createOrder } = useBakery();
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState<ParsedOrder | null>(null);
  const [createdTokenId, setCreatedTokenId] = useState<string | null>(null);

  const handleParse = () => {
    if (!rawText.trim()) {
      alert("Please paste an order confirmation message first.");
      return;
    }

    const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
    const data: Record<string, string> = {};

    lines.forEach((line) => {
      const parts = line.split(/[:=-]/);
      if (parts.length >= 2) {
        const key = parts[0].trim().toLowerCase();
        const value = parts.slice(1).join(":").trim();
        data[key] = value;
      }
    });

    const customer = data["customer"] || data["coustomer"] || data["name"] || lines[0] || "Customer";
    const phone = data["phone"] || data["mobile"] || data["number"] || "";
    const loc = data["address"] || data["location"] || "Direct Pickup";
    const delDate = data["delivery"] || data["date"] || "Today";

    // Extract quantity
    let qty = 1;
    for (const key of Object.keys(data)) {
      if (key.includes("quantity") || key.includes("qty") || key.includes("pcs")) {
        qty = parseInt(data[key], 10) || 1;
      }
    }

    // Extract product name & match
    const rawProdName = data["product"] || data["item"] || "";
    let matchedProduct = products.find(
      (p) =>
        (rawProdName && p.name.toLowerCase().includes(rawProdName.toLowerCase())) ||
        rawText.toLowerCase().includes(p.name.toLowerCase()) ||
        rawText.toLowerCase().includes(p.code.toLowerCase())
    );

    // Extract prices
    let unitPrice = 0;
    if (data["unit price"] || data["unit_price"] || data["price"]) {
      unitPrice = parseFloat(data["unit price"] || data["unit_price"] || data["price"]) || 0;
    } else if (matchedProduct) {
      unitPrice = matchedProduct.price;
    }

    let totalPrice = 0;
    if (data["total price"] || data["total"] || data["total_price"]) {
      totalPrice = parseFloat(data["total price"] || data["total"] || data["total_price"]) || 0;
    } else {
      totalPrice = unitPrice * qty;
    }

    // Extract advance payment
    let advancePaid = 0;
    for (const [k, v] of Object.entries(data)) {
      if (k.includes("paid") || k.includes("advance") || k.includes("delivery charge") || k.includes("bkash") || k.includes("nagad")) {
        const num = parseFloat(v.replace(/[^0-9.]/g, ""));
        if (!isNaN(num)) advancePaid = num;
      }
    }

    const pendingPayment = Math.max(0, totalPrice - advancePaid);
    const unitCost = matchedProduct ? matchedProduct.cost : 0;
    const totalCost = unitCost * qty;
    const profit = totalPrice - totalCost;

    setParsed({
      customer,
      phone,
      productCode: matchedProduct?.code || "GEN",
      productName: matchedProduct?.name || rawProdName || "Bakery Item",
      quantity: qty,
      unitPrice,
      total: totalPrice,
      advancePaid,
      pendingPayment,
      cost: totalCost,
      profit,
      location: loc,
      deliveryDate: delDate,
      paymentMethod: advancePaid > 0 ? "Advance Received" : "Cash on Delivery",
    });
  };

  const handleConfirmAndSave = () => {
    if (!parsed) return;
    const orderId = createOrder(parsed);
    setCreatedTokenId(orderId);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopySlip = () => {
    if (!parsed || !createdTokenId) return;
    const slipText = `📦 DELIVERY TOKEN: ${createdTokenId}\nCustomer: ${parsed.customer}\nPhone: ${parsed.phone}\nAddress: ${parsed.location}\nProduct: ${parsed.productName} × ${parsed.quantity}\nTotal: ৳${parsed.total}\nDue/Pending: ৳${parsed.pendingPayment}`;
    navigator.clipboard.writeText(slipText);
    alert("Token copied to clipboard!");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800">2. New Order (Quick)</h2>
        <span className="text-xs bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full">Stage 1 Intake</span>
      </div>

      {!createdTokenId ? (
        <>
          {/* Step 1: Paste message */}
          <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 space-y-2.5">
            <p className="text-xs font-bold text-gray-700">1. Paste WhatsApp / FB Confirmation Message</p>
            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`Customer- Hiea\nAddress- Badda, Nurar Chala\nPhone- 01778012523\nProduct- White Forest Cup Cake\nQuantity- 2\nUnit Price- 75\nTotal Price- 150\nDelivery Paid- 50`}
              className="w-full border rounded-lg p-3 text-xs focus:ring-2 focus:ring-rose-500 font-mono bg-gray-50 text-gray-800"
            />
            <button
              onClick={handleParse}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-lg text-xs shadow-md transition flex items-center justify-center gap-1.5"
            >
              <span>⚡</span> PROCESS MESSAGE
            </button>
          </div>

          {/* Step 2: Review card */}
          {parsed && (
            <div className="bg-white p-4 rounded-xl shadow-md border-2 border-rose-100 space-y-3">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-xs font-bold text-gray-800">2. Processed Order Review</h3>
                <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">Verified</span>
              </div>

              <div className="text-xs space-y-1.5 text-gray-700">
                <div className="flex justify-between">
                  <span className="text-gray-400">Customer:</span>
                  <span className="font-bold text-gray-900">{parsed.customer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Phone:</span>
                  <span>{parsed.phone || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Address:</span>
                  <span>{parsed.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Product:</span>
                  <span className="font-medium text-gray-900">{parsed.productName} × {parsed.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Bill:</span>
                  <span className="font-bold text-gray-900">৳ {parsed.total}</span>
                </div>
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Pending Payment:</span>
                  <span>৳ {parsed.pendingPayment}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <button
                  onClick={() => setParsed(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 rounded-lg text-xs transition"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleConfirmAndSave}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded-lg text-xs shadow-md transition"
                >
                  OK, SAVE ORDER
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Step 3: Generated Delivery Token & Actions */
        <div className="space-y-3">
          <div className="bg-white border-2 border-dashed border-rose-400 p-4 rounded-xl shadow-md space-y-3">
            <div className="text-center border-b border-gray-200 pb-2">
              <span className="text-xl">🍰</span>
              <h3 className="font-bold text-sm text-gray-900">PACKAGING DELIVERY TOKEN</h3>
              <p className="text-[10px] text-gray-400 font-mono">TOKEN ID: {createdTokenId}</p>
            </div>

            {parsed && (
              <div className="text-xs space-y-1.5 text-gray-800">
                <p><strong>Customer:</strong> {parsed.customer}</p>
                <p><strong>Phone:</strong> {parsed.phone}</p>
                <p><strong>Address:</strong> {parsed.location}</p>
                <p><strong>Item:</strong> {parsed.productName} × {parsed.quantity}</p>
                <div className="bg-rose-50 p-2 rounded-lg flex justify-between items-center text-rose-900 font-bold mt-2">
                  <span>DUE / COLLECT CASH:</span>
                  <span className="text-sm">৳ {parsed.pendingPayment}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex-1 bg-gray-800 hover:bg-black text-white font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1 shadow"
            >
              🖨️ Print Token
            </button>
            <button
              onClick={handleCopySlip}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1 border"
            >
              📋 Copy Slip
            </button>
          </div>

          <button
            onClick={() => {
              setParsed(null);
              setCreatedTokenId(null);
              setRawText("");
              onOrderSaved();
            }}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-lg text-xs shadow transition"
          >
            View in Orders Hub →
          </button>
        </div>
      )}
    </div>
  );
};