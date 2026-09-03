import { twMerge } from "tailwind-merge";
import { clsx, type ClassValue } from "clsx";
import { Product, Order, ParsedOrder } from "../context/BakeryContext";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseWhatsAppMessage(
  rawText: string,
  products: Product[],
  existingOrders: Order[]
): ParsedOrder | null {
  if (!rawText.trim()) return null;

  const lines = rawText.split("\n");
  const getVal = (prefixes: string[]): string => {
    for (const prefix of prefixes) {
      const line = lines.find((l) =>
        l.toLowerCase().trim().startsWith(prefix.toLowerCase())
      );
      if (line) {
        return line.split(":").slice(1).join(":").trim();
      }
    }
    return "";
  };

  const customer = getVal(["Customer", "Name", "Client"]) || "Customer";
  const phone = getVal(["Phone", "Mobile", "Cell"]) || "-";
  const productName = getVal(["Product", "Item", "Cake"]) || "";
  const qtyStr = getVal(["Quantity", "Qty", "Pcs"]) || "1";
  const priceStr = getVal(["Price", "Total", "Bill"]) || "";
  const deliveryDate = getVal(["Delivery", "Date", "Time"]) || "Today";
  const location = getVal(["Location", "Address", "Area"]) || "Dhaka";
  const payment = getVal(["Payment", "Method", "Pay"]) || "Cash";
  const advanceStr = getVal(["Advance", "Paid"]) || "0";
  const advancePaid = parseInt(advanceStr, 10) || 0;

  const quantity = Math.max(1, parseInt(qtyStr, 10) || 1);

  const matched = products.find(
    (p) =>
      p.code.toLowerCase() === productName.toLowerCase() ||
      p.name.toLowerCase().includes(productName.toLowerCase())
  );

  const unitPrice = matched ? matched.price : parseInt(priceStr, 10) || 0;
  const total = parseInt(priceStr, 10) || unitPrice * quantity;
  const cost = (matched ? matched.cost : Math.round(unitPrice * 0.6)) * quantity;
  const pendingPayment = Math.max(0, total - advancePaid);

  return {
    customer,
    phone,
    productCode: matched ? matched.code : "CUSTOM",
    productName: matched ? matched.name : productName || "Custom Cake",
    quantity,
    unitPrice,
    total,
    cost,
    profit: total - cost,
    deliveryDate,
    location,
    paymentMethod: payment,
    advancePaid,
    pendingPayment,
  };
}