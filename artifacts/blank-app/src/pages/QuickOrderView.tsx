import React, { useState, useEffect } from "react";
import { useBakery, ParsedOrder, ParsedOrderItem, ShelfItem, Product } from "../context/BakeryContext";

export const QuickOrderView: React.FC<{ onOrderSaved: () => void, initialCart?: ParsedOrder | null }> = ({ onOrderSaved, initialCart }) => {
  const { products, createOrder, customers, shelfStock, logWaste, shopSettings } = useBakery();

  const CURRENCY = shopSettings?.currency_symbol || "৳";
  const businessName = localStorage.getItem("bb_business_name") || shopSettings?.shop_name || "MY BAKERY";
  const businessEmail = localStorage.getItem("bb_user_email") || "";

  const [activeTab, setActiveTab] = useState<'pos' | 'text'>('pos');
  const [rawText, setRawText] = useState("");
  const [posCart, setPosCart] = useState<{ shelfItem: ShelfItem; qty: number }[]>([]);

  const [parsed, setParsed] = useState<(ParsedOrder & { discountAmount?: number }) | null>(initialCart || null);
  const [createdTokenId, setCreatedTokenId] = useState<string | null>(null);

  useEffect(() => {
    if (initialCart) setParsed(initialCart);
  }, [initialCart]);

  const addToPosCart = (item: ShelfItem) => {
    setPosCart(prev => {
      const existing = prev.find(c => c.shelfItem.id === item.id);
      const currentCartQty = existing ? existing.qty : 0;
      if (currentCartQty >= item.quantity) return prev;
      if (existing) return prev.map(c => c.shelfItem.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { shelfItem: item, qty: 1 }];
    });
  };

  const deductFromPosCart = (shelfItemId: string) => {
    setPosCart(prev => {
      const existing = prev.find(c => c.shelfItem.id === shelfItemId);
      if (!existing) return prev;
      if (existing.qty === 1) return prev.filter(c => c.shelfItem.id !== shelfItemId);
      return prev.map(c => c.shelfItem.id === shelfItemId ? { ...c, qty: c.qty - 1 } : c);
    });
  };

  const handleWasteItem = (shelfItemId: string, maxQty: number) => {
    const qtyToTrash = parseInt(window.prompt(`How many are you throwing away? (Max: ${maxQty})`, "1") || "0");
    if (qtyToTrash > 0 && qtyToTrash <= maxQty) {
      logWaste(shelfItemId, qtyToTrash);
    }
  };

  const sendPosToCheckout = () => {
    if (posCart.length === 0) return alert("Cart is empty!");

    let subtotal = 0;
    let totalCost = 0;
    const consolidatedItems: Record<string, ParsedOrderItem> = {};

    posCart.forEach(cartItem => {
      const code = cartItem.shelfItem.product_code;
      const itemTotal = cartItem.qty * cartItem.shelfItem.price;
      const itemCost = cartItem.qty * cartItem.shelfItem.cost;

      subtotal += itemTotal;
      totalCost += itemCost;

      if (consolidatedItems[code]) {
        consolidatedItems[code].quantity += cartItem.qty;
        consolidatedItems[code].cost += itemCost;
      } else {
        consolidatedItems[code] = {
          productCode: code,
          productName: cartItem.shelfItem.product_name,
          quantity: cartItem.qty,
          unitPrice: cartItem.shelfItem.price,
          cost: itemCost
        };
      }
    });

    const globalVatRate = shopSettings?.default_tax_rate || 0;
    const autoVatAmount = parseFloat(((subtotal * globalVatRate) / 100).toFixed(2));
    const grandTotal = subtotal + autoVatAmount;

    setParsed({
      customer: "Walk-In Customer", phone: "", email: "", location: "Store Front",
      items: Object.values(consolidatedItems), subtotal, deliveryCharge: 0, vatAmount: autoVatAmount, discountAmount: 0,
      total: grandTotal, advancePaid: grandTotal, pendingPayment: 0, cost: totalCost, profit: grandTotal - totalCost,
      deliveryDate: new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date()), paymentMethod: "Cash", isWalkIn: true 
    });
  };

  const handleParse = () => {
    if (!rawText.trim()) return alert("Please paste order details first.");

    try {
      const lines = rawText.split(/\r?\n|\r/).map((l) => l.trim()).filter(Boolean);
      const safeProducts = products.filter(p => p && p.name && p.code);
      const sortedProducts = [...safeProducts].sort((a, b) => b.name.length - a.name.length);

      const isSelf = lines.length > 0 && lines[0].toLowerCase().trim() === "self";

      let customer = isSelf ? "Self" : "Online Customer";
      let phone = isSelf ? "N/A" : "";
      let location = isSelf ? "Display Shelf" : "Direct Pickup";
      let email = "", rawDateStr = "Today";
      let deliveryCharge = 0, textVatRate = 0, advancePaid = 0, discountAmount = 0;

      const extractedItems: ParsedOrderItem[] = [];

      lines.forEach((line, index) => {
        const lower = line.toLowerCase();

        if (index === 0 && lower === "self") return;

        if (!isSelf) {
          if (lower.startsWith("customer:") || lower.startsWith("name:")) customer = line.split(":")[1]?.trim() || customer;
          else if (lower.startsWith("phone:") || lower.startsWith("mobile:")) phone = line.split(":")[1]?.trim() || phone;
          else if (lower.startsWith("address:") || lower.startsWith("location:")) location = line.split(":")[1]?.trim() || location;
          else if (lower.startsWith("email:")) email = line.split(":")[1]?.trim() || email;
          else if (lower.startsWith("date:") || lower.startsWith("delivery date:")) rawDateStr = line.split(":")[1]?.trim() || rawDateStr;
          else if (lower.startsWith("delivery") && (lower.includes("charge") || lower.includes("cost"))) deliveryCharge = parseFloat((line.match(/[\d\.]+/) || ["0"])[0]);
          else if (lower.startsWith("vat:")) textVatRate = parseFloat((line.match(/[\d\.]+/) || ["0"])[0]);
          else if (lower.startsWith("advance") || lower.startsWith("paid:")) advancePaid = parseFloat((line.match(/[\d\.]+/) || ["0"])[0]);
          else if (lower.startsWith("discount:")) discountAmount = parseFloat((line.match(/[\d\.]+/) || ["0"])[0]);
        }

        const isMetaLine = lower.startsWith("delivery") || lower.startsWith("vat:") || lower.startsWith("advance") || lower.startsWith("paid:") || lower.startsWith("discount:") || lower.startsWith("customer:") || lower.startsWith("name:") || lower.startsWith("phone:") || lower.startsWith("mobile:") || lower.startsWith("address:") || lower.startsWith("location:") || lower.startsWith("date:") || lower.startsWith("items:") || lower.startsWith("email:");

        if (!isMetaLine && line.length > 1) {
          let matchedProduct: Product | null = null;

          for (const p of sortedProducts) {
             const pNameTarget = p.name.toLowerCase();
             const pCodeTarget = p.code.toLowerCase();

             if (lower.includes(pNameTarget) || lower.includes(pCodeTarget)) {
                 matchedProduct = p;
                 break;
             }
          }

          if (matchedProduct) {
             const remainingStr = lower.replace(matchedProduct.name.toLowerCase(), "").replace(matchedProduct.code.toLowerCase(), "");
             const numbers = remainingStr.match(/\d+/g);
             let qty = 1;

             if (numbers && numbers.length > 0) {
                 qty = parseInt(numbers[numbers.length - 1], 10);
             }

             const existingItem = extractedItems.find(i => i.productCode === matchedProduct!.code);
             if (existingItem) {
                 existingItem.quantity += qty;
                 existingItem.cost += (matchedProduct.cost || 0) * qty;
             } else {
                 extractedItems.push({
                   productCode: matchedProduct.code, productName: matchedProduct.name,
                   quantity: qty, unitPrice: matchedProduct.price || 0, cost: (matchedProduct.cost || 0) * qty
                 });
             }
          } else {
             extractedItems.push({
                productCode: "UNKNOWN", productName: `⚠️ Unrecognized: "${line}"`,
                quantity: 1, unitPrice: 0, cost: 0
             });
          }
        }
      });

      let subtotal = 0, totalCost = 0;
      extractedItems.forEach(i => { subtotal += (i.quantity * i.unitPrice); totalCost += i.cost; });

      const globalVatRate = shopSettings?.default_tax_rate || 0;
      const finalVatRate = textVatRate > 0 ? textVatRate : globalVatRate;
      const autoVatAmount = isSelf ? 0 : parseFloat(((subtotal * finalVatRate) / 100).toFixed(2));

      const grandTotal = subtotal + deliveryCharge + autoVatAmount - discountAmount;

      setParsed({
        customer: customer || lines[0] || "Online Customer", phone, email, items: extractedItems, subtotal, deliveryCharge, vatAmount: autoVatAmount, discountAmount,
        total: grandTotal, advancePaid, pendingPayment: Math.max(0, grandTotal - advancePaid), cost: totalCost, profit: grandTotal - totalCost,
        location, deliveryDate: rawDateStr, paymentMethod: advancePaid > 0 ? "Advance Received" : "Cash on Delivery",
      });

    } catch (error) {
      alert("Error parsing text. Proceeding with an empty cart so you can manually add items.");
      setParsed({
        customer: "Self", phone: "N/A", items: [], subtotal: 0, deliveryCharge: 0, vatAmount: 0, discountAmount: 0,
        total: 0, advancePaid: 0, pendingPayment: 0, cost: 0, profit: 0, location: "Display Shelf", deliveryDate: "Today", paymentMethod: "Cash"
      });
    }
  };

  const addManualItemToCart = (prodCode: string) => {
    if (!parsed) return;
    const prod = products.find(p => p.code === prodCode);
    if (!prod) return;

    const existing = parsed.items.find(i => i.productCode === prodCode);
    let newItems = [...parsed.items];

    if (existing) {
        newItems = newItems.map(i => i.productCode === prodCode ? { ...i, quantity: i.quantity + 1, cost: i.cost + prod.cost } : i);
    } else {
        newItems.push({ productCode: prod.code, productName: prod.name, quantity: 1, unitPrice: prod.price, cost: prod.cost });
    }

    let subtotal = 0; let totalCost = 0;
    newItems.forEach(i => { subtotal += (i.quantity * i.unitPrice); totalCost += i.cost; });

    const autoVatAmount = parsed.customer !== 'Self' ? parseFloat(((subtotal * (shopSettings?.default_tax_rate || 0)) / 100).toFixed(2)) : 0;
    const grandTotal = subtotal + parsed.deliveryCharge + autoVatAmount - (parsed.discountAmount || 0);

    setParsed({
        ...parsed, items: newItems, subtotal, cost: totalCost, total: grandTotal, vatAmount: autoVatAmount,
        pendingPayment: Math.max(0, grandTotal - parsed.advancePaid), profit: grandTotal - totalCost
    });
  };

  const removeManualItem = (prodCode: string) => {
    if (!parsed) return;
    const newItems = parsed.items.filter(i => i.productCode !== prodCode);

    let subtotal = 0; let totalCost = 0;
    newItems.forEach(i => { subtotal += (i.quantity * i.unitPrice); totalCost += i.cost; });

    const autoVatAmount = parsed.customer !== 'Self' ? parseFloat(((subtotal * (shopSettings?.default_tax_rate || 0)) / 100).toFixed(2)) : 0;
    const grandTotal = subtotal + parsed.deliveryCharge + autoVatAmount - (parsed.discountAmount || 0);

    setParsed({
        ...parsed, items: newItems, subtotal, cost: totalCost, total: grandTotal, vatAmount: autoVatAmount,
        pendingPayment: Math.max(0, grandTotal - parsed.advancePaid), profit: grandTotal - totalCost
    });
  };

  const handleCRMPhoneLookup = (inputPhone: string) => {
    if (!parsed) return;
    const matchedCustomer = customers.find(c => c.phone === inputPhone && c.phone !== "N/A" && c.phone !== "");
    setParsed(prev => prev ? { 
      ...prev, 
      phone: inputPhone, 
      customer: matchedCustomer ? matchedCustomer.name : prev.customer, 
      location: matchedCustomer ? matchedCustomer.address : prev.location 
    } : prev);
  };

  const updateCalculations = (updates: Partial<ParsedOrder & { discountAmount?: number }>) => {
    setParsed(prev => {
      if (!prev) return prev;
      const merged = { ...prev, ...updates };
      const newTotal = merged.subtotal + (merged.deliveryCharge || 0) + (merged.vatAmount || 0) - (merged.discountAmount || 0);
      return { ...merged, total: newTotal, pendingPayment: Math.max(0, newTotal - (merged.advancePaid || 0)), profit: newTotal - merged.cost };
    });
  };

  const handleConfirmAndSave = async (isWalkIn: boolean) => {
    if (!parsed) return;

    if (parsed.items.some(i => i.productCode === "UNKNOWN")) {
        return alert("Please remove 'Unrecognized' items from your cart (click the ✕) and select the correct products from the dropdown before saving.");
    }
    if (parsed.items.length === 0) return alert("Cannot save an empty order. Please add items.");

    const orderToSave = { ...parsed, isWalkIn };
    const orderId = await createOrder(orderToSave);
    setCreatedTokenId(orderId);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center print:hidden">
        <h2 className="text-lg font-bold text-gray-800">New Order Entry</h2>
        {!parsed && !createdTokenId && (
          <div className="flex bg-gray-200 rounded-lg p-1">
            <button onClick={() => setActiveTab('pos')} className={`px-3 py-1 text-xs font-bold rounded-md transition ${activeTab === 'pos' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>🏪 Walk-In POS</button>
            <button onClick={() => setActiveTab('text')} className={`px-3 py-1 text-xs font-bold rounded-md transition ${activeTab === 'text' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>📝 Text Intake</button>
          </div>
        )}
      </div>

      {!createdTokenId ? (
        <>
          {!parsed && (
            <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 space-y-4 print:hidden">
              {activeTab === 'pos' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-gray-700">Digital Twin Shelf</p>
                    <p className="text-[10px] text-gray-400">Tap the bag icon to add items to your live cart.</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto p-1">
                    {shelfStock.filter(s => s.quantity > 0).length === 0 ? (
                      <p className="col-span-full text-center text-xs text-gray-400 py-8 border border-dashed rounded-xl">Your display shelf is empty.<br/>Use Text Intake with "Self" to stock it from the kitchen!</p>
                    ) : (
                      shelfStock.filter(s => s.quantity > 0).map(item => {
                        const inCartQty = posCart.find(c => c.shelfItem.id === item.id)?.qty || 0;
                        const physicalRemaining = item.quantity - inCartQty;

                        const now = new Date().getTime();
                        const exp = new Date(item.expiry_date || Date.now()).getTime();
                        const hoursLeft = (exp - now) / (1000 * 60 * 60);

                        let cardClass = "border-emerald-200 bg-white";
                        let statusText = `${physicalRemaining} Left`;

                        if (hoursLeft <= 0) { cardClass = "border-red-400 bg-red-50"; statusText = "Expired"; } 
                        else if (hoursLeft <= 24) { cardClass = "border-gray-400 bg-gray-100"; statusText = "Expires Soon"; }

                        return (
                          <div key={item.id} className={`border rounded-xl p-3 shadow-sm flex flex-col justify-between h-28 relative ${cardClass}`}>
                            <button onClick={() => handleWasteItem(item.id, physicalRemaining)} className="absolute -top-2 -left-2 bg-red-100 text-red-600 hover:bg-red-600 hover:text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs shadow transition" title="Throw Away (Log Waste)">✕</button>
                            <div>
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-[10px] font-bold text-gray-800 leading-tight">{item.product_name}</span>
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${physicalRemaining > 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-500'}`}>{statusText}</span>
                              </div>
                              <span className="text-xs text-emerald-700 font-black">{CURRENCY} {item.price}</span>
                            </div>
                            <div className="flex justify-end mt-2">
                               <button disabled={physicalRemaining === 0 || hoursLeft <= 0} onClick={() => addToPosCart(item)} className={`h-8 w-8 rounded-lg shadow-sm flex items-center justify-center text-sm transition ${physicalRemaining > 0 && hoursLeft > 0 ? 'bg-gray-900 text-white hover:bg-black active:scale-95' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>🛍️</button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {posCart.length > 0 && (
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 mt-4">
                      <div className="flex justify-between items-center mb-2 border-b border-gray-200 pb-2">
                        <span className="text-xs font-bold text-gray-700">Live Cart</span>
                        <span className="text-xs font-black text-gray-900">{CURRENCY} {posCart.reduce((acc, curr) => acc + (curr.qty * curr.shelfItem.price), 0)}</span>
                      </div>
                      <div className="space-y-2 mb-4 max-h-32 overflow-y-auto">
                        {posCart.map((cartItem, idx) => (
                          <div key={idx} className="flex justify-between text-[11px] items-center bg-white p-2 rounded-lg border border-gray-100">
                            <span className="text-gray-800"><span className="font-bold text-indigo-600">{cartItem.qty}x</span> {cartItem.shelfItem.product_name}</span>
                            <div className="flex items-center gap-3">
                              <span className="font-bold">{CURRENCY} {cartItem.qty * cartItem.shelfItem.price}</span>
                              <button onClick={() => deductFromPosCart(cartItem.shelfItem.id)} className="text-red-400 hover:text-red-600 font-bold bg-red-50 w-6 h-6 rounded-md">✕</button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button onClick={sendPosToCheckout} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs shadow transition">
                        PROCEED TO CHECKOUT ➔
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'text' && (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-bold text-gray-700">Paste Order Details</p>
                    <p className="text-[10px] text-gray-400 mb-2">To stage items for display, start the text with "Self".</p>
                  </div>
                  <textarea rows={8} value={rawText} onChange={(e) => setRawText(e.target.value)} placeholder={`Self\nCup Cake 10\n\n--- OR ---\n\nCustomer: Rakib\nPhone: 01711223344\nAddress: Khulna\nCup Cake 2`} className="w-full border rounded-xl p-3 text-xs focus:ring-2 focus:ring-gray-900 font-mono bg-gray-50 text-gray-800" />
                  <button onClick={handleParse} className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3 rounded-xl text-xs shadow transition">⚡ PROCESS & CALCULATE</button>
                </div>
              )}
            </div>
          )}

          {/* --- CHECKOUT VIEW --- */}
          {parsed && (
            <div className={`bg-white p-4 rounded-xl shadow-md border-2 print:hidden ${parsed.customer === 'Self' ? 'border-indigo-200' : 'border-emerald-100'} space-y-3`}>
              <div className="flex justify-between items-center border-b pb-2 mb-3">
                <h3 className="text-xs font-bold text-gray-800">Review & Finalize</h3>
                <button onClick={() => setParsed(null)} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-md hover:bg-gray-200 font-bold transition">← Edit Cart</button>
              </div>

              <div className="space-y-3 text-xs">
                {parsed.customer !== 'Self' && (
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-3 mb-4">
                      <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-blue-600 block mb-1">Phone (Auto-Fills CRM)</label>
                            <input type="text" value={parsed.phone} onChange={(e) => handleCRMPhoneLookup(e.target.value)} className="w-full border border-blue-200 rounded-lg p-2 bg-blue-50 focus:ring-2 focus:ring-blue-500 font-bold text-blue-900" placeholder="Type phone..." />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 block mb-1">Customer Name</label>
                            <input type="text" value={parsed.customer} onChange={(e) => setParsed({...parsed, customer: e.target.value})} className="w-full border border-gray-200 rounded-lg p-2 bg-white font-bold text-gray-900" placeholder="Name..." />
                          </div>
                      </div>

                      <div>
                         <label className="text-[10px] font-bold text-gray-500 block mb-1">Delivery Address / Location</label>
                         <input type="text" value={parsed.location} onChange={(e) => setParsed({...parsed, location: e.target.value})} className="w-full border border-gray-200 rounded-lg p-2 bg-white font-medium text-gray-800" placeholder="Address or Pickup..." />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 block mb-1">Email (Optional)</label>
                            <input type="email" value={parsed.email || ""} onChange={(e) => setParsed({...parsed, email: e.target.value})} className="w-full border border-gray-200 rounded-lg p-2 bg-white font-medium text-gray-800" placeholder="Email address..." />
                          </div>
                          <div>
                             <label className="text-[10px] font-bold text-gray-500 block mb-1">Delivery Date</label>
                             <input type="text" value={parsed.deliveryDate} onChange={(e) => setParsed({...parsed, deliveryDate: e.target.value})} className="w-full border border-gray-200 rounded-lg p-2 bg-white font-medium text-gray-800" placeholder="Today" />
                          </div>
                      </div>
                  </div>
                )}

                <div className="bg-white p-3 rounded-xl border border-gray-200">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-2">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Cart Items</span>

                    <select onChange={(e) => { if(e.target.value) { addManualItemToCart(e.target.value); e.target.value = ""; } }} className="text-[10px] border border-gray-300 rounded-md p-1 bg-gray-50 font-bold text-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-400">
                       <option value="">+ Add Item manually</option>
                       {products.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                    </select>
                  </div>

                  {parsed.items.length === 0 ? <p className="text-gray-400 italic py-2 text-center">No items found. Select above to add.</p> : (
                    parsed.items.map((item, idx) => (
                      <div key={idx} className={`flex justify-between items-center pt-2 pb-1 ${item.productCode === 'UNKNOWN' ? 'text-red-600 bg-red-50 px-2 rounded mt-1' : ''}`}>
                        <span className="font-semibold text-gray-800">
                           {item.productName} 
                           {item.productCode !== 'UNKNOWN' && <span className="text-gray-500 font-normal"> × {item.quantity}</span>}
                        </span>
                        <div className="flex items-center gap-3">
                           {item.productCode !== 'UNKNOWN' && <span className="font-bold text-gray-900">{CURRENCY} {item.quantity * item.unitPrice}</span>}
                           <button onClick={() => removeManualItem(item.productCode)} className="text-red-400 hover:text-red-600 font-bold bg-white border border-gray-100 w-6 h-6 rounded-md shadow-sm">✕</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-2 px-1">
                  <div className="flex justify-between items-center text-gray-500 mb-2"><span className="font-medium">Subtotal:</span><span className="font-bold text-gray-900">{CURRENCY} {parsed.subtotal}</span></div>

                  {parsed.customer !== 'Self' && (
                    <>
                      <div className="flex justify-between items-center text-gray-500 mb-2">
                         <span className="font-medium">Discount Amount:</span>
                         <div className="flex items-center"><span className="mr-1.5">- {CURRENCY}</span><input type="number" value={parsed.discountAmount || ""} placeholder="0" onChange={(e) => updateCalculations({ discountAmount: parseFloat(e.target.value) || 0 })} className="w-20 text-right border border-purple-200 rounded p-1 text-xs text-purple-600 font-bold focus:outline-none focus:ring-1 focus:ring-purple-400" /></div>
                      </div>
                      <div className="flex justify-between items-center text-gray-500 mb-2">
                         <span className="font-medium">Delivery Charge:</span>
                         <div className="flex items-center"><span className="mr-1.5">{CURRENCY}</span><input type="number" value={parsed.deliveryCharge || ""} placeholder="0" onChange={(e) => updateCalculations({ deliveryCharge: parseFloat(e.target.value) || 0 })} className="w-20 text-right border rounded p-1 text-xs font-bold text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400" /></div>
                      </div>
                      <div className="flex justify-between items-center text-gray-500 mb-2 border-b border-gray-100 pb-3">
                         <span className="font-medium">VAT (Auto {shopSettings?.default_tax_rate || 0}%):</span>
                         <span className="font-bold text-gray-900">{CURRENCY} {parsed.vatAmount}</span>
                      </div>

                      <div className="flex justify-between text-[13px] font-black text-gray-900 mt-2"><span>Grand Total:</span><span>{CURRENCY} {parsed.total}</span></div>

                      <div className="flex justify-between items-center text-rose-600 font-bold mt-2">
                         <span>Advance / Paid Now:</span>
                         <div className="flex items-center"><span className="mr-1.5">- {CURRENCY}</span><input type="number" value={parsed.advancePaid || ""} onChange={(e) => updateCalculations({ advancePaid: parseFloat(e.target.value) || 0 })} className="w-20 text-right border border-rose-200 rounded p-1 text-xs text-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-400" /></div>
                      </div>
                      <div className="flex justify-between items-center text-[13px] font-black text-emerald-600 mt-3 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                        <span>Pending Due:</span><span>{CURRENCY} {parsed.pendingPayment}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-100 mt-4">
                {parsed.customer === 'Self' ? (
                  <button onClick={() => handleConfirmAndSave(false)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl text-xs shadow transition">📦 TRANSFER TO DISPLAY SHELF</button>
                ) : (
                  <>
                    <button onClick={() => handleConfirmAndSave(false)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-xs shadow">QUEUE DELIVERY</button>
                    <button onClick={() => handleConfirmAndSave(true)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-xl text-xs shadow">COMPLETE SALE</button>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        /* --- RECEIPT / INVOICE DISPLAY --- */
        <div className="space-y-3 print:space-y-0">
          {parsed?.customer === 'Self' ? (
            <div className="bg-white border border-indigo-400 p-6 rounded-xl shadow-lg text-center space-y-4 print:shadow-none print:border-none print:p-0">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto shadow-sm print:hidden">✅</div>
              <div className="print:hidden">
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Shelf Stocked!</h3>
                <p className="text-xs text-gray-500 font-medium mt-1">Ingredients deducted. Display updated.</p>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl text-left print:bg-white print:border-2 print:border-black print:p-4">
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest border-b border-indigo-200 pb-2 mb-3 print:text-black print:border-black">Kitchen Batch Tag: {createdTokenId}</p>
                <div className="space-y-1.5">
                  {parsed.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm font-bold text-gray-800 print:text-black">
                      <span>{item.quantity}x {item.productName}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-4 text-center print:text-black">Attach to tray for front counter</p>
              </div>
              <div className="flex gap-2 print:hidden">
                <button onClick={() => window.print()} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 rounded-xl text-xs transition">🖨️ Print Tag</button>
                <button onClick={() => { setParsed(null); setCreatedTokenId(null); setRawText(""); setPosCart([]); setActiveTab('pos'); }} className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-xs shadow-md transition">Go to Walk-In POS ➔</button>
              </div>
            </div>
          ) : (

            /* --- THE UNIFIED MASTER INVOICE (CHECKOUT PAGE) --- */
            <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-lg max-w-sm mx-auto font-sans print:shadow-none print:border-none print:p-0 print:max-w-full text-gray-900">

              <div className="text-center space-y-1">
                <h2 className="font-black text-2xl uppercase tracking-widest text-black">{businessName}</h2>
                {(shopSettings?.shop_address || shopSettings?.shop_phone || businessEmail) && (
                  <div className="text-[11px] text-gray-600 print:text-black mt-1">
                     {shopSettings?.shop_address && <p>{shopSettings.shop_address}</p>}
                     <p>
                       {shopSettings?.shop_phone && <span>📞 {shopSettings.shop_phone}</span>}
                       {businessEmail && <span> | ✉️ {businessEmail}</span>}
                     </p>
                  </div>
                )}
              </div>

              <div className="border-t-2 border-dashed border-gray-300 my-4 print:border-black"></div>

              <div className="text-center mb-4">
                <h3 className="font-bold text-sm tracking-widest uppercase text-black">Commercial Invoice</h3>
                <p className="text-[10px] font-mono text-gray-500 mt-0.5 print:text-black">Receipt No: {createdTokenId}</p>
              </div>

              {parsed && (
                <>
                  <div className="text-xs space-y-1 mb-4 text-black">
                    <div className="flex justify-between"><span className="font-medium">Customer:</span> <span className="font-bold">{parsed.customer}</span></div>
                    <div className="flex justify-between"><span className="font-medium">Phone:</span> <span className="font-bold">{parsed.phone || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="font-medium">Location:</span> <span className="font-bold text-right max-w-[160px] truncate">{parsed.location}</span></div>
                  </div>

                  <div className="border-t-2 border-dashed border-gray-300 my-3 print:border-black"></div>

                  <div className="mb-4">
                    <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase mb-2 print:text-black">
                      <span>Item & Qty</span>
                      <span>Total</span>
                    </div>
                    <div className="space-y-2 text-xs text-black">
                      {parsed.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start">
                          <p className="font-semibold">{item.productName} <span className="text-gray-500 font-normal ml-1 print:text-black">× {item.quantity}</span></p>
                          <p className="font-bold">{CURRENCY} {(item.unitPrice * item.quantity).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t-2 border-dashed border-gray-300 my-3 print:border-black"></div>

                  <div className="text-xs space-y-1.5 mb-4 text-gray-600 print:text-black">
                    <div className="flex justify-between"><span>Subtotal:</span><span>{CURRENCY} {parsed.subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Delivery Charge:</span><span>{CURRENCY} {parsed.deliveryCharge.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>VAT (Auto {shopSettings?.default_tax_rate || 0}%):</span><span>{CURRENCY} {parsed.vatAmount.toFixed(2)}</span></div>
                    {parsed.discountAmount > 0 && <div className="flex justify-between"><span>Discount:</span><span>- {CURRENCY} {parsed.discountAmount.toFixed(2)}</span></div>}
                  </div>

                  <div className="border-t-2 border-gray-800 my-3 print:border-black"></div>

                  <div className="flex justify-between items-center text-sm font-black mb-3 text-black">
                    <span>GRAND TOTAL:</span>
                    <span>{CURRENCY} {parsed.total.toFixed(2)}</span>
                  </div>

                  <div className="border-t-2 border-dashed border-gray-300 my-3 print:border-black"></div>

                  <div className="text-xs space-y-1.5 mb-4 text-gray-600 print:text-black">
                    <div className="flex justify-between">
                      <span>Paid / Advance:</span>
                      <span>{CURRENCY} {parsed.advancePaid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-black bg-gray-100 p-2 rounded-lg print:bg-transparent print:border-2 print:border-black print:p-1.5 mt-2">
                      <span className="text-black">DUE TO COLLECT:</span>
                      <span className="text-black">{CURRENCY} {parsed.pendingPayment.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="border-t-2 border-dashed border-gray-300 my-4 print:border-black"></div>

                  <div className="text-center space-y-2">
                    <div className="text-[10px] text-gray-500 font-medium print:text-black">
                       {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} | {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-[10px] text-gray-500 font-bold print:text-black">
                       Powered by tongka
                    </div>
                    <div className="text-xs font-semibold italic mt-2 text-black">
                       ✨ Thank you for treating yourself today!<br/>We hope to see you again soon.
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-6 print:hidden">
                <button onClick={() => window.print()} className="flex-1 bg-gray-800 hover:bg-black text-white font-bold py-3.5 rounded-xl text-xs shadow transition">🖨️ Print Receipt</button>
                <button onClick={() => { setParsed(null); setCreatedTokenId(null); setRawText(""); setPosCart([]); onOrderSaved(); }} className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl text-xs shadow-sm transition">← Finish & Start New</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};