import React, { useState, useMemo, useEffect } from "react";
import { useBakery } from "../context/BakeryContext";
import { formatToUniversalDate } from "../lib/dateUtils";

export const ReportsView: React.FC<{ onNavigate?: (page: string) => void }> = () => {
  const { orders, shopSettings, products, purchases = [], ingredients = [] } = useBakery();
  const CURRENCY = shopSettings?.currency_symbol || "৳";

  // ============================================================================
  // GLOBAL DATE RANGE ENGINE
  // ============================================================================
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  const [showDatePicker, setShowDatePicker] = useState(false);

  const formatForDisplay = (isoDate: string) => {
    if (!isoDate) return "";
    const [year, month, day] = isoDate.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day} ${months[parseInt(month, 10) - 1]} ${year}`;
  };

  // ============================================================================
  // ENGINE 1: DYNAMIC REALIZED PROFIT
  // ============================================================================
  const { currentTrend, currentTotal, growthPercent } = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const durationMs = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - durationMs - 1);
    const prevEnd = new Date(start.getTime() - 1);

    const daily: Record<string, { profit: number; dateObj: Date }> = {};
    let currTotal = 0;
    let prevTotal = 0;

    orders.forEach(o => {
      if (o.customer.toLowerCase() === "self") return;
      const isCompleted = o.status === "Completed" || o.status === "Paid";
      if (!isCompleted) return; 

      const rawDate = new Date(o.delivery_date || o.date);
      const t = rawDate.getTime();

      if (t >= start.getTime() && t <= end.getTime()) {
        currTotal += (o.profit || 0);
        const dateKey = formatToUniversalDate(rawDate); 
        if (!daily[dateKey]) daily[dateKey] = { profit: 0, dateObj: rawDate };
        daily[dateKey].profit += (o.profit || 0);
      } 
      else if (t >= prevStart.getTime() && t <= prevEnd.getTime()) {
        prevTotal += (o.profit || 0);
      }
    });

    const trend = Object.entries(daily).sort((a, b) => a[1].dateObj.getTime() - b[1].dateObj.getTime());
    let growth = 0;
    if (prevTotal === 0 && currTotal > 0) growth = 100;
    else if (prevTotal > 0) growth = ((currTotal - prevTotal) / prevTotal) * 100;

    return { currentTrend: trend, currentTotal: currTotal, growthPercent: growth };
  }, [orders, startDate, endDate]);

  const maxProfit = Math.max(...currentTrend.map(d => d[1].profit), 1);

  const generateSmoothPath = (data: typeof currentTrend) => {
    if (data.length === 0) return "";
    if (data.length === 1) return `M 50,${100 - (data[0][1].profit / maxProfit) * 100} L 50,100`;

    let path = `M 0,${100 - (data[0][1].profit / maxProfit) * 100} `;
    for (let i = 0; i < data.length - 1; i++) {
      const x1 = (i / (data.length - 1)) * 100;
      const y1 = 100 - (data[i][1].profit / maxProfit) * 100;
      const x2 = ((i + 1) / (data.length - 1)) * 100;
      const y2 = 100 - (data[i + 1][1].profit / maxProfit) * 100;
      const cp1x = x1 + (x2 - x1) / 2;
      const cp2x = x1 + (x2 - x1) / 2;
      path += `C ${cp1x},${y1} ${cp2x},${y2} ${x2},${y2} `;
    }
    return path;
  };

  const linePath = generateSmoothPath(currentTrend);
  const fillPath = `${linePath} L 100,100 L 0,100 Z`;

  const xAxisLabels = currentTrend.filter((_, i) => 
    i === 0 || 
    i === Math.floor(currentTrend.length * 0.33) || 
    i === Math.floor(currentTrend.length * 0.66) || 
    i === currentTrend.length - 1
  );

  // ============================================================================
  // ENGINE 2: TOP SELLERS (VOLUME)
  // ============================================================================
  const topSellers = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const metrics: Record<string, number> = {};

    orders.forEach(o => {
      if (o.customer.toLowerCase() === "self") return;
      const isCompleted = o.status === "Completed" || o.status === "Paid";
      if (!isCompleted) return;

      const rawDate = new Date(o.delivery_date || o.date);
      const t = rawDate.getTime();

      if (t >= start.getTime() && t <= end.getTime()) {
        if (!metrics[o.product_name]) metrics[o.product_name] = 0;
        metrics[o.product_name] += o.quantity;
      }
    });

    return Object.entries(metrics)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [orders, startDate, endDate]);

  // ============================================================================
  // ENGINE 5: TOP PROFIT DRIVERS (NET PROFIT)
  // ============================================================================
  const topProfitDrivers = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const metrics: Record<string, number> = {};

    orders.forEach(o => {
      if (o.customer.toLowerCase() === "self") return;
      const isCompleted = o.status === "Completed" || o.status === "Paid";
      if (!isCompleted) return;

      const rawDate = new Date(o.delivery_date || o.date);
      const t = rawDate.getTime();

      if (t >= start.getTime() && t <= end.getTime()) {
        if (!metrics[o.product_name]) metrics[o.product_name] = 0;
        metrics[o.product_name] += (o.profit || 0);
      }
    });

    return Object.entries(metrics)
      .map(([name, profit]) => ({ name, profit }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);
  }, [orders, startDate, endDate]);

  // ============================================================================
  // ENGINE 3: INDIVIDUAL PRODUCT TREND (DAILY)
  // ============================================================================
  const availableProducts = useMemo(() => {
    if (products && products.length > 0) {
      return products.map((p: any) => p.name).sort();
    }
    const prodSet = new Set<string>();
    orders.forEach(o => {
      if (o.product_name) prodSet.add(o.product_name);
    });
    return Array.from(prodSet).sort();
  }, [products, orders]);

  const [selectedProduct, setSelectedProduct] = useState<string>("");

  useEffect(() => {
    if (!selectedProduct && availableProducts.length > 0) {
      setSelectedProduct(availableProducts[0]);
    }
  }, [availableProducts, selectedProduct]);

  const productTrend = useMemo(() => {
    if (!selectedProduct) return { data: [], total: 0, average: "0.0", maxQty: 1 };

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const data = [];
    let totalQty = 0;
    let daysCount = 0;

    let currentDate = new Date(start);

    while (currentDate <= end) {
      daysCount++;
      const dateKey = formatToUniversalDate(currentDate);
      const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'short' }); 

      let dayQty = 0;
      orders.forEach(o => {
        if (o.customer.toLowerCase() === "self" || o.product_name !== selectedProduct) return;
        const isCompleted = o.status === "Completed" || o.status === "Paid";
        if (!isCompleted) return;

        const rawDate = new Date(o.delivery_date || o.date);
        if (formatToUniversalDate(rawDate) === dateKey) {
          dayQty += o.quantity;
        }
      });

      totalQty += dayQty;
      data.push({
        dateKey,
        dayName: dayOfWeek,
        isFriday: dayOfWeek === 'Fri',
        qty: dayQty,
        shortDate: currentDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    const maxQty = Math.max(...data.map(d => d.qty), 1);
    const average = daysCount > 0 ? (totalQty / daysCount).toFixed(1) : "0.0";

    return { data, total: totalQty, average, maxQty };
  }, [orders, startDate, endDate, selectedProduct]);

  // ============================================================================
  // ENGINE 4: INGREDIENT COST HISTORY (TRANSACTION PLOTTING)
  // ============================================================================
  const availableIngredients = useMemo(() => {
    if (ingredients && ingredients.length > 0) {
      return ingredients.map((i: any) => i.name).sort();
    }
    const names = new Set<string>();
    purchases.forEach((p: any) => {
      if (p.name) names.add(p.name);
    });
    return Array.from(names).sort();
  }, [ingredients, purchases]);

  const [selectedIngredient, setSelectedIngredient] = useState<string>("");

  useEffect(() => {
    if (!selectedIngredient && availableIngredients.length > 0) {
      setSelectedIngredient(availableIngredients[0]);
    }
  }, [availableIngredients, selectedIngredient]);

  const ingredientTrend = useMemo(() => {
    if (!selectedIngredient || purchases.length === 0) return { data: [], currentPrice: 0, priceChange: 0, maxCost: 1, minCost: 0, path: "" };

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const validPurchases = purchases.filter((p: any) => {
      if (p.name !== selectedIngredient) return false;
      const pDate = new Date(p.date || p.purchase_date);
      return pDate.getTime() >= start.getTime() && pDate.getTime() <= end.getTime();
    }).sort((a: any, b: any) => new Date(a.date || a.purchase_date).getTime() - new Date(b.date || b.purchase_date).getTime());

    const data = validPurchases.map((p: any) => {
      const rawDate = new Date(p.date || p.purchase_date);
      return {
        dateKey: formatToUniversalDate(rawDate),
        shortDate: rawDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }),
        cost: Number(p.unit_price || p.cost || 0),
      };
    });

    const costs = data.map(d => d.cost);
    const maxCost = costs.length > 0 ? Math.max(...costs) * 1.05 : 1; 
    const minCost = costs.length > 0 ? Math.min(...costs) * 0.95 : 0; 

    let currentPrice = 0;
    let priceChange = 0; 
    if (data.length > 0) {
      currentPrice = data[data.length - 1].cost;
      if (data.length > 1) {
        const previousPrice = data[data.length - 2].cost;
        if (previousPrice > 0) {
          priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;
        }
      }
    }

    let path = "";
    if (data.length > 1) {
      path = `M 0,${100 - ((data[0].cost - minCost) / (maxCost - minCost)) * 100} `;
      for (let i = 0; i < data.length - 1; i++) {
        const x2 = ((i + 1) / (data.length - 1)) * 100;
        const y2 = 100 - ((data[i + 1].cost - minCost) / (maxCost - minCost)) * 100;
        path += `L ${x2},${y2} `;
      }
    }

    return { data, currentPrice, priceChange, maxCost, minCost, path };
  }, [purchases, startDate, endDate, selectedIngredient]);


  // ============================================================================
  // VISUAL RENDER (UI)
  // ============================================================================
  return (
    <div className="pb-24 w-full max-w-4xl mx-auto relative">

      {/* GLOBAL PAGE HEADER & MASTER CALENDAR */}
      <div className="fixed top-[60px] left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-gray-50 pt-1 pb-3 px-4 flex flex-col gap-3">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Business Intelligence</h1>

        <div className="relative self-start w-full sm:w-max">
          <button 
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition text-gray-700 text-[11px] font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer w-full justify-center sm:justify-start"
          >
            📅 {formatForDisplay(startDate)} - {formatForDisplay(endDate)}
          </button>

          {showDatePicker && (
            <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 z-[60] flex flex-col gap-3 w-64">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Start Date</label>
                <div className="relative">
                  <div className="w-full bg-gray-50 border border-gray-200 text-sm font-bold rounded-lg px-3 py-2 text-gray-800 flex justify-between items-center pointer-events-none">
                    {formatForDisplay(startDate)}
                    <span className="text-gray-400 text-xs">▼</span>
                  </div>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">End Date</label>
                <div className="relative">
                  <div className="w-full bg-gray-50 border border-gray-200 text-sm font-bold rounded-lg px-3 py-2 text-gray-800 flex justify-between items-center pointer-events-none">
                    {formatForDisplay(endDate)}
                    <span className="text-gray-400 text-xs">▼</span>
                  </div>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>
              <button 
                onClick={() => setShowDatePicker(false)}
                className="w-full bg-indigo-600 text-white font-bold text-xs py-2.5 rounded-lg mt-1 hover:bg-indigo-700 transition"
              >
                Apply Dates
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CHARTS CONTAINER */}
      <div className="flex flex-col space-y-6 relative z-10 pt-[115px]">

        {/* CHART 1: REALIZED PROFIT (LINE) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6 w-full">
          <div className="flex justify-between items-start mb-6 relative">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Realized Profit Trend</h3>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-3xl font-black text-gray-900">{CURRENCY} {currentTotal.toFixed(2)}</p>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-1">Total for Selected Period</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                growthPercent > 0 ? 'bg-emerald-100 text-emerald-700' : 
                growthPercent < 0 ? 'bg-rose-100 text-rose-700' : 
                'bg-gray-100 text-gray-500'
              }`}>
                {growthPercent > 0 ? '+' : ''}{growthPercent.toFixed(1)}% vs prior period
              </span>
            </div>
          </div>

          {currentTrend.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm font-medium border-t border-gray-100 mt-6 relative z-10">
              No completed orders found for these dates.
            </div>
          ) : (
            <div className="relative w-full h-56 mt-6 z-10">
              <div className="absolute inset-0 flex flex-col justify-between text-[10px] text-gray-400 font-medium pb-6 pointer-events-none z-0">
                <span>{CURRENCY}{maxProfit.toFixed(0)}</span>
                <span>{CURRENCY}{(maxProfit * 0.66).toFixed(0)}</span>
                <span>{CURRENCY}{(maxProfit * 0.33).toFixed(0)}</span>
                <span>{CURRENCY}0</span>
              </div>
              <div className="absolute inset-0 left-10 h-[calc(100%-24px)] overflow-visible">
                <div className="absolute inset-0 flex flex-col justify-between z-0">
                  <div className="border-t border-gray-100 w-full h-0"></div>
                  <div className="border-t border-gray-100 w-full h-0"></div>
                  <div className="border-t border-gray-100 w-full h-0"></div>
                  <div className="border-t border-gray-100 w-full h-0"></div>
                </div>
                <svg className="w-full h-full overflow-visible absolute inset-0 z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="profitGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d={fillPath} fill="url(#profitGradient)" />
                  <path d={linePath} fill="none" stroke="#4f46e5" strokeWidth="3" vectorEffect="non-scaling-stroke" />
                </svg>
                {currentTrend.map(([date, data], idx) => {
                  const x = (idx / (currentTrend.length - 1 || 1)) * 100;
                  const y = 100 - (data.profit / maxProfit) * 100;
                  let tooltipClass = "left-1/2 -translate-x-1/2";
                  if (idx === 0) tooltipClass = "left-0 translate-x-0";
                  if (idx === currentTrend.length - 1) tooltipClass = "right-0 -translate-x-0";
                  return (
                    <div key={idx} className="absolute group cursor-pointer z-20" style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center">
                        <div className="w-2.5 h-2.5 bg-white border-2 border-indigo-600 rounded-full group-hover:scale-150 transition-transform shadow-sm"></div>
                      </div>
                      <div className={`absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-gray-200 text-gray-900 text-xs font-bold px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap pointer-events-none flex flex-col items-center ${tooltipClass}`}>
                        <span>{date.split(' ')[0]} {date.split(' ')[1]}</span>
                        <span className="text-indigo-600">{CURRENCY}{data.profit.toFixed(2)} profit</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="absolute bottom-0 left-10 right-0 h-5">
                {xAxisLabels.map(([date], idx) => {
                  const x = (currentTrend.findIndex(p => p[0] === date) / (currentTrend.length - 1 || 1)) * 100;
                  if (idx === xAxisLabels.length - 1) {
                    return <span key={idx} className="absolute text-[10px] font-bold text-gray-400 bottom-0 whitespace-nowrap" style={{ right: '0px' }}>{date.split(' ')[0]} {date.split(' ')[1]}</span>;
                  }
                  let transform = idx === 0 ? "translateX(0)" : "translateX(-50%)";
                  return <span key={idx} className="absolute text-[10px] font-bold text-gray-400 bottom-0 whitespace-nowrap" style={{ left: `${x}%`, transform }}>{date.split(' ')[0]} {date.split(' ')[1]}</span>;
                })}
              </div>
            </div>
          )}
        </div>

        {/* CHART 2: TOP SELLERS (VOLUME) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6 w-full">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Top Sellers (Volume)</h3>
            </div>
          </div>
          <div className="space-y-5">
            {topSellers.map((item, idx) => (
              <div key={idx} className="relative">
                <div className="flex justify-between text-sm font-bold text-gray-800 mb-1.5">
                  <span><span className="text-gray-400 mr-2">{idx + 1}.</span>{item.name}</span>
                  <span>{item.qty} units</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-3 rounded-full transition-all duration-700" 
                    style={{ width: `${(item.qty / topSellers[0].qty) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {topSellers.length === 0 && (
              <p className="text-sm text-center font-medium text-gray-400 py-4">No product sales found for this period.</p>
            )}
          </div>
        </div>

        {/* CHART 5: TOP PROFIT DRIVERS */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6 w-full">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Top Profit Drivers (Net Profit)</h3>
            </div>
          </div>
          <div className="space-y-5">
            {topProfitDrivers.map((item, idx) => (
              <div key={idx} className="relative">
                <div className="flex justify-between text-sm font-bold text-gray-800 mb-1.5">
                  <span><span className="text-gray-400 mr-2">{idx + 1}.</span>{item.name}</span>
                  <span className="text-emerald-600">{CURRENCY} {item.profit.toFixed(2)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-3 rounded-full transition-all duration-700" 
                    style={{ width: `${(item.profit / (topProfitDrivers[0]?.profit || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {topProfitDrivers.length === 0 && (
              <p className="text-sm text-center font-medium text-gray-400 py-4">No profit data found for this period.</p>
            )}
          </div>
        </div>

        {/* CHART 3: INDIVIDUAL PRODUCT TREND */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6 w-full">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Product Sales Trend</h3>
            </div>
            <select 
              value={selectedProduct} 
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-800 text-xs font-bold rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[150px] truncate cursor-pointer"
            >
              {availableProducts.length === 0 && <option value="">No Products</option>}
              {availableProducts.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 mb-8 border-b border-gray-100 pb-4">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Total Sold</p>
              <p className="text-2xl font-black text-gray-900">{productTrend.total}</p>
            </div>
            <div className="border-l border-gray-200 pl-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Daily Avg</p>
              <p className="text-lg font-bold text-gray-700">{productTrend.average}</p>
            </div>
          </div>

          <div className="w-full overflow-x-auto pb-2">
            <div className="min-w-full flex items-end h-48 gap-1.5 relative">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none z-0 pb-6">
                <div className="border-t border-gray-100 w-full h-0"></div>
                <div className="border-t border-gray-100 w-full h-0"></div>
                <div className="border-t border-gray-100 w-full h-0"></div>
                <div className="border-t border-gray-100 w-full h-0"></div>
              </div>

              {productTrend.data.map((day, idx) => {
                const heightPct = (day.qty / productTrend.maxQty) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full gap-2 group relative z-10 min-w-[28px]">
                    <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none z-30">
                      {day.shortDate}: {day.qty} units
                    </div>
                    <div className="w-full max-w-[20px] flex-1 bg-indigo-50/50 rounded-t-md flex items-end justify-center group-hover:bg-indigo-100 transition-colors">
                      <div 
                        className="w-full bg-indigo-500 rounded-t-md transition-all duration-500" 
                        style={{ height: `${heightPct}%`, minHeight: day.qty > 0 ? '4px' : '0px' }}
                      ></div>
                    </div>
                    <span className={`text-[9px] whitespace-nowrap ${day.isFriday ? 'text-rose-600 font-black' : 'text-gray-400 font-bold'}`}>
                      {day.dayName}
                    </span>
                  </div>
                );
              })}

              {productTrend.data.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-400 z-20">
                  No sales data found for selected dates.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CHART 4: INGREDIENT COST HISTORY */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6 w-full">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ingredient Cost History</h3>
            </div>

            <select 
              value={selectedIngredient} 
              onChange={(e) => setSelectedIngredient(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-800 text-xs font-bold rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-500 max-w-[150px] truncate cursor-pointer"
            >
              {availableIngredients.length === 0 && <option value="">No Purchases Found</option>}
              {availableIngredients.map(ing => (
                <option key={ing} value={ing}>{ing}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 mb-8 border-b border-gray-100 pb-4">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Latest Unit Price</p>
              <p className="text-2xl font-black text-gray-900">{CURRENCY} {ingredientTrend.currentPrice.toFixed(2)}</p>
            </div>
            <div className="border-l border-gray-200 pl-4 flex flex-col justify-center">
              <span className={`text-[10px] font-bold px-2 py-1 rounded w-max ${
                ingredientTrend.priceChange > 0 ? 'bg-rose-100 text-rose-700' : 
                ingredientTrend.priceChange < 0 ? 'bg-emerald-100 text-emerald-700' : 
                'bg-gray-100 text-gray-500'
              }`}>
                {ingredientTrend.priceChange > 0 ? '📈 Price Increased (' : ingredientTrend.priceChange < 0 ? '📉 Price Dropped (' : 'No Change'}
                {ingredientTrend.priceChange !== 0 && `${ingredientTrend.priceChange > 0 ? '+' : ''}${Math.abs(ingredientTrend.priceChange).toFixed(1)}%)`}
              </span>
              <p className="text-[9px] text-gray-400 mt-1 font-medium tracking-wide">Since previous purchase</p>
            </div>
          </div>

          {ingredientTrend.data.length < 2 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm font-medium relative z-10 text-center px-4">
              Not enough transaction history found.<br/>Need at least 2 purchases to plot a trend line.
            </div>
          ) : (
            <div className="relative w-full h-56 mt-6 z-10">
              <div className="absolute inset-0 flex flex-col justify-between text-[10px] text-gray-400 font-medium pb-6 pointer-events-none z-0">
                <span>{CURRENCY}{ingredientTrend.maxCost.toFixed(2)}</span>
                <span>{CURRENCY}{((ingredientTrend.maxCost + ingredientTrend.minCost) / 2).toFixed(2)}</span>
                <span>{CURRENCY}{ingredientTrend.minCost.toFixed(2)}</span>
              </div>

              <div className="absolute inset-0 left-12 h-[calc(100%-24px)] overflow-visible">
                <div className="absolute inset-0 flex flex-col justify-between z-0">
                  <div className="border-t border-gray-100 w-full h-0"></div>
                  <div className="border-t border-gray-100 w-full h-0"></div>
                  <div className="border-t border-gray-100 w-full h-0"></div>
                </div>

                <svg className="w-full h-full overflow-visible absolute inset-0 z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d={ingredientTrend.path} fill="none" stroke="#ef4444" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
                </svg>

                {ingredientTrend.data.map((d, idx) => {
                  const x = (idx / (ingredientTrend.data.length - 1)) * 100;
                  const y = 100 - ((d.cost - ingredientTrend.minCost) / (ingredientTrend.maxCost - ingredientTrend.minCost)) * 100;

                  let tooltipClass = "left-1/2 -translate-x-1/2";
                  if (idx === 0) tooltipClass = "left-0 translate-x-0";
                  if (idx === ingredientTrend.data.length - 1) tooltipClass = "right-0 -translate-x-0";

                  return (
                    <div key={idx} className="absolute group cursor-pointer z-20" style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white border-2 border-rose-500 rounded-full group-hover:scale-150 transition-transform shadow-sm"></div>
                      </div>
                      <div className={`absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-gray-200 text-gray-900 text-xs font-bold px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap pointer-events-none flex flex-col items-center ${tooltipClass}`}>
                        <span className="text-[10px] text-gray-400">{d.shortDate}</span>
                        <span className="text-rose-600">{CURRENCY}{d.cost.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="absolute bottom-0 left-12 right-0 h-5">
                {ingredientTrend.data.map((d, idx) => {
                  if (idx !== 0 && idx !== ingredientTrend.data.length - 1 && idx !== Math.floor(ingredientTrend.data.length / 2)) return null;

                  const x = (idx / (ingredientTrend.data.length - 1)) * 100;
                  let transform = idx === 0 ? "translateX(0)" : idx === ingredientTrend.data.length - 1 ? "translateX(-100%)" : "translateX(-50%)";

                  return (
                    <span key={idx} className="absolute text-[9px] font-bold text-gray-400 bottom-0 whitespace-nowrap" style={{ left: idx === ingredientTrend.data.length - 1 ? '100%' : `${x}%`, transform }}>
                      {d.shortDate}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};