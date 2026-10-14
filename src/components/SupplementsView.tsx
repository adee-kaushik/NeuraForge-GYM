'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { SupplementItem, SupplementSale, Member } from '@/types';
import { getSupplements, saveSupplement, deleteSupplement, sellSupplement, getSupplementSales } from '@/actions/supplements';
import { inr } from '@/lib/format';

interface SupplementsViewProps {
  gymName: string;
  members: Member[];
  isOwner?: boolean;
}

const CATEGORIES = ['All', 'Protein', 'Creatine', 'Pre-Workout', 'BCAA', 'Snacks', 'Accessories'] as const;

export const SupplementsView: React.FC<SupplementsViewProps> = ({ gymName, members, isOwner = false }) => {
  const [supplements, setSupplements] = useState<SupplementItem[]>([]);
  const [sales, setSales] = useState<SupplementSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // POS Sell Modal
  const [sellingItem, setSellingItem] = useState<SupplementItem | null>(null);
  const [saleQty, setSaleQty] = useState(1);
  const [customerType, setCustomerType] = useState<'member' | 'walkin'>('member');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'Cash' | 'Card'>('UPI');
  const [saleNotes, setSaleNotes] = useState('');
  const [sellingBusy, setSellingBusy] = useState(false);
  const [receiptSale, setReceiptSale] = useState<SupplementSale | null>(null);

  // Edit / Add Item Modal
  const [editingItem, setEditingItem] = useState<Partial<SupplementItem> | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);

  // Sales Log View Tab
  const [activeTab, setActiveTab] = useState<'store' | 'sales'>('store');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [sups, sls] = await Promise.all([
      getSupplements().catch(() => []),
      getSupplementSales().catch(() => []),
    ]);
    setSupplements(sups);
    setSales(sls);
    setLoading(false);
  };

  const filteredSupplements = useMemo(() => {
    return supplements.filter((s) => {
      const matchCat = activeCategory === 'All' || s.category === activeCategory;
      const matchSearch =
        searchQuery === '' ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.flavor && s.flavor.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [supplements, activeCategory, searchQuery]);

  // Open Sell Modal
  const handleOpenSell = (item: SupplementItem) => {
    setSellingItem(item);
    setSaleQty(1);
    setCustomerType('member');
    setSelectedMemberId(members[0]?.id || '');
    setWalkinName('');
    setWalkinPhone('');
    setPaymentMode('UPI');
    setSaleNotes('');
  };

  const handleConfirmSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellingItem) return;

    let custName = walkinName.trim();
    let custPhone = walkinPhone.trim();

    if (customerType === 'member') {
      const found = members.find((m) => m.id === selectedMemberId);
      if (!found) {
        showToast('Please select a member.');
        return;
      }
      custName = found.name;
      custPhone = found.phone;
    } else {
      if (!custName) {
        showToast('Please enter customer name.');
        return;
      }
    }

    setSellingBusy(true);
    const res = await sellSupplement({
      supplementId: sellingItem.id,
      supplementName: sellingItem.name,
      customerName: custName,
      customerPhone: custPhone || undefined,
      quantity: saleQty,
      unitPrice: sellingItem.price,
      paymentMode,
      notes: saleNotes || undefined,
    });
    setSellingBusy(false);

    if (!res.ok || !res.sale) {
      showToast(res.error || 'Failed to record sale');
      return;
    }

    // Update in-memory stock
    setSupplements((prev) =>
      prev.map((s) => (s.id === sellingItem.id ? { ...s, stock: Math.max(0, s.stock - saleQty) } : s))
    );
    setSales((prev) => [res.sale!, ...prev]);
    setReceiptSale(res.sale);
    setSellingItem(null);
    showToast(`✅ Sale of ${sellingItem.name} recorded successfully!`);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.name) return;

    setSaveBusy(true);
    const res = await saveSupplement({
      id: editingItem.id,
      name: editingItem.name,
      brand: editingItem.brand || '',
      category: (editingItem.category as any) || 'Protein',
      price: Number(editingItem.price) || 0,
      costPrice: editingItem.costPrice ? Number(editingItem.costPrice) : undefined,
      stock: Number(editingItem.stock) || 0,
      unit: editingItem.unit || 'units',
      flavor: editingItem.flavor,
      description: editingItem.description,
    });
    setSaveBusy(false);

    if (!res.ok || !res.item) {
      showToast(res.error || 'Failed to save supplement');
      return;
    }

    if (editingItem.id) {
      setSupplements((prev) => prev.map((s) => (s.id === res.item!.id ? res.item! : s)));
      showToast('Supplement updated successfully');
    } else {
      setSupplements((prev) => [res.item!, ...prev]);
      showToast('New supplement added to inventory');
    }
    setEditingItem(null);
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}" from supplement inventory?`)) return;
    const res = await deleteSupplement(id);
    if (res.ok) {
      setSupplements((prev) => prev.filter((s) => s.id !== id));
      showToast('Supplement deleted');
    } else {
      showToast(res.error || 'Failed to delete');
    }
  };

  const shareWhatsAppBill = (sale: SupplementSale) => {
    const text = `🧾 *${gymName.toUpperCase()} - SUPPLEMENT INVOICE*\n` +
      `--------------------------------\n` +
      `👤 *Customer:* ${sale.customerName}\n` +
      `💊 *Item:* ${sale.supplementName}\n` +
      `📦 *Quantity:* ${sale.quantity}\n` +
      `💵 *Unit Price:* ₹${sale.unitPrice}\n` +
      `💰 *Total Paid:* ₹${sale.totalAmount}\n` +
      `💳 *Payment Mode:* ${sale.paymentMode}\n` +
      `📅 *Date:* ${new Date(sale.soldAt).toLocaleDateString('en-IN')}\n` +
      `--------------------------------\n` +
      `Thank you for fueling your fitness with us! Stay strong! 💪🏋️‍♂️`;

    const phone = (sale.customerPhone || '').replace(/\D/g, '');
    const url = phone.length >= 10
      ? `https://api.whatsapp.com/send?phone=${encodeURIComponent(phone.slice(-10))}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl bg-surface-container-highest border border-secondary/40 text-on-surface shadow-2xl text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-2xl">medication</span>
            <h1 className="font-sora text-xl sm:text-2xl font-bold text-on-surface">Supplements &amp; Nutrition POS</h1>
          </div>
          <p className="text-xs text-outline mt-1">
            Sell authentic protein, pre-workouts, creatines, and gym fuel with instant WhatsApp receipts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Store / Sales Tabs */}
          <div className="p-1 rounded-xl bg-surface-container border border-surface-container-high flex text-xs font-bold">
            <button
              onClick={() => setActiveTab('store')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'store' ? 'bg-secondary text-on-secondary shadow-xs' : 'text-outline hover:text-on-surface'
              }`}
            >
              🏪 Products &amp; POS
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'sales' ? 'bg-secondary text-on-secondary shadow-xs' : 'text-outline hover:text-on-surface'
              }`}
            >
              📋 Sales Log ({sales.length})
            </button>
          </div>

          <button
            onClick={() =>
              setEditingItem({
                category: 'Protein',
                stock: 10,
                unit: 'tubs',
                price: 2999,
              })
            }
            className="px-3.5 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center gap-1.5 shadow-sm hover:opacity-90 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>+ Add Product</span>
          </button>
        </div>
      </div>

      {activeTab === 'store' ? (
        <>
          {/* Filter Bar & Search */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeCategory === cat
                      ? 'bg-secondary text-on-secondary shadow-xs'
                      : 'bg-surface-container-low text-outline hover:text-on-surface hover:bg-surface-container border border-surface-container-high'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search input */}
            <div className="relative min-w-[260px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-base">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by brand, name or flavor..."
                className="w-full bg-surface-container-low border border-surface-container-high focus:border-secondary rounded-xl pl-9 pr-3 py-2 text-xs text-on-surface focus:outline-none"
              />
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="p-12 text-center text-outline text-xs">Loading supplement inventory...</div>
          ) : filteredSupplements.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-surface-container-low border border-surface-container-high">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">inventory_2</span>
              <p className="text-sm font-semibold text-on-surface">No supplements found in this category.</p>
              <p className="text-xs text-outline mt-1">Tap &quot;+ Add Product&quot; to stock new supplements.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredSupplements.map((item) => {
                const isOutOfStock = item.stock <= 0;
                const isLowStock = item.stock > 0 && item.stock <= 3;

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-high flex flex-col justify-between hover:border-secondary/50 transition-all shadow-sm group"
                  >
                    <div>
                      {/* Brand & Stock Status */}
                      <div className="flex items-center justify-between gap-2 pb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-secondary bg-secondary/10 px-2 py-0.5 rounded">
                          {item.brand || 'Nutrition'}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isOutOfStock
                              ? 'bg-error/15 text-error border-error/30'
                              : isLowStock
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {isOutOfStock ? 'Out of Stock' : `${item.stock} in stock`}
                        </span>
                      </div>

                      {/* Title & Flavor */}
                      <h3 className="font-sora text-sm font-bold text-on-surface line-clamp-1 mt-1">{item.name}</h3>
                      {item.flavor && (
                        <p className="text-xs text-outline flex items-center gap-1 mt-0.5">
                          <span className="material-symbols-outlined text-[14px] text-tertiary">nutrition</span>
                          <span>{item.flavor}</span>
                        </p>
                      )}
                      {item.description && (
                        <p className="text-[11px] text-on-surface-variant line-clamp-2 mt-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-4 mt-3 border-t border-surface-container-high flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-outline uppercase font-semibold">Selling Price</span>
                        <p className="font-sora text-base font-bold text-on-surface">{inr(item.price)}</p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingItem(item)}
                          className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-outline hover:text-on-surface transition-colors cursor-pointer"
                          title="Edit product"
                        >
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>

                        <button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={() => handleOpenSell(item)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                            isOutOfStock
                              ? 'bg-surface-container-high text-outline cursor-not-allowed opacity-50'
                              : 'bg-secondary text-on-secondary hover:opacity-90 active:scale-95 cursor-pointer shadow-xs'
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">point_of_sale</span>
                          <span>Sell</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Sales Log Tab */
        <div className="bg-surface-container-low rounded-2xl border border-surface-container-high overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 border-b border-surface-container-high flex items-center justify-between">
            <div>
              <h2 className="font-sora text-sm sm:text-base font-bold text-on-surface">Recent Supplement Sales</h2>
              <p className="text-xs text-outline mt-0.5">Live transactions and billing invoices issued at front desk</p>
            </div>
            <span className="text-xs font-bold text-secondary">{sales.length} transactions</span>
          </div>

          {sales.length === 0 ? (
            <div className="p-10 text-center text-outline text-xs">No supplement sales recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container/60 text-outline uppercase text-[10px] font-bold border-b border-surface-container-high">
                  <tr>
                    <th className="py-3 px-4">Date &amp; Time</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4 text-center">Qty</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4 text-right">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high">
                  {sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-surface-container/30 transition-colors">
                      <td className="py-3 px-4 text-outline whitespace-nowrap">
                        {new Date(sale.soldAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 font-semibold text-on-surface">
                        <div>{sale.customerName}</div>
                        {sale.customerPhone && <div className="text-[10px] text-outline">{sale.customerPhone}</div>}
                      </td>
                      <td className="py-3 px-4 font-semibold text-on-surface">{sale.supplementName}</td>
                      <td className="py-3 px-4 text-center font-bold text-secondary">{sale.quantity}</td>
                      <td className="py-3 px-4 font-bold text-on-surface">{inr(sale.totalAmount)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-container border border-surface-container-high text-on-surface">
                          {sale.paymentMode}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => shareWhatsAppBill(sale)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 font-bold text-[11px] cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-xs">chat</span>
                          <span>WhatsApp</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* POS Quick Sell Modal */}
      {sellingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md bg-surface-container-lowest border border-surface-container-high rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-xl">point_of_sale</span>
                <h3 className="font-sora text-sm sm:text-base font-bold text-on-surface">Front Desk POS Sale</h3>
              </div>
              <button onClick={() => setSellingItem(null)} className="text-outline hover:text-on-surface p-1">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Product summary card */}
            <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high flex items-center justify-between">
              <div>
                <p className="font-sora text-xs font-bold text-on-surface">{sellingItem.name}</p>
                <p className="text-[11px] text-outline">
                  {sellingItem.brand} • {inr(sellingItem.price)} each • {sellingItem.stock} in stock
                </p>
              </div>
              <div className="font-sora text-sm font-bold text-secondary">{inr(sellingItem.price * saleQty)}</div>
            </div>

            <form onSubmit={handleConfirmSale} className="space-y-3.5 text-xs">
              {/* Quantity selector */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-outline mb-1">Quantity</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSaleQty((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-base flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-sora text-base font-bold text-on-surface min-w-[2rem] text-center">
                    {saleQty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSaleQty((q) => Math.min(sellingItem.stock, q + 1))}
                    className="w-9 h-9 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-base flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Customer Type: Member or Walk-in */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-outline mb-1">Customer</label>
                <div className="grid grid-cols-2 p-1 rounded-xl bg-surface-container border border-surface-container-high text-xs font-bold mb-2">
                  <button
                    type="button"
                    onClick={() => setCustomerType('member')}
                    className={`py-1.5 text-center rounded-lg transition-all ${
                      customerType === 'member'
                        ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                        : 'text-outline hover:text-on-surface'
                    }`}
                  >
                    Gym Member
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerType('walkin')}
                    className={`py-1.5 text-center rounded-lg transition-all ${
                      customerType === 'walkin'
                        ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                        : 'text-outline hover:text-on-surface'
                    }`}
                  >
                    Walk-in Customer
                  </button>
                </div>

                {customerType === 'member' ? (
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-2.5 text-xs text-on-surface focus:outline-none"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.phone}) - {m.planName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Customer Name"
                      value={walkinName}
                      onChange={(e) => setWalkinName(e.target.value)}
                      required
                      className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-2 text-xs text-on-surface focus:outline-none"
                    />
                    <input
                      type="tel"
                      placeholder="Customer Phone (for WhatsApp receipt)"
                      value={walkinPhone}
                      onChange={(e) => setWalkinPhone(e.target.value)}
                      className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-2 text-xs text-on-surface focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-outline mb-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['UPI', 'Cash', 'Card'] as const).map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setPaymentMode(m)}
                      className={`py-2 text-center rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        paymentMode === m
                          ? 'bg-secondary/15 text-secondary border-secondary shadow-xs'
                          : 'bg-surface-container-low text-outline border-surface-container-high hover:text-on-surface'
                      }`}
                    >
                      {m === 'UPI' ? '📱 UPI / QR' : m === 'Cash' ? '💵 Cash' : '💳 Card'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSellingItem(null)}
                  className="flex-1 py-2.5 rounded-xl border border-surface-container-high text-xs font-bold text-outline hover:text-on-surface cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sellingBusy}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:opacity-90 transition-all cursor-pointer disabled:opacity-60"
                >
                  {sellingBusy ? 'Recording...' : `Collect ${inr(sellingItem.price * saleQty)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Instant Digital Receipt Modal */}
      {receiptSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-surface-container-lowest border border-surface-container-high rounded-2xl p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">check_circle</span>
            </div>

            <div>
              <h3 className="font-sora text-base font-bold text-on-surface">Payment Recorded!</h3>
              <p className="text-xs text-outline mt-0.5">{gymName} Supplement Store</p>
            </div>

            <div className="p-3 rounded-xl bg-surface-container-low text-left text-xs space-y-1.5 border border-surface-container-high">
              <div className="flex justify-between">
                <span className="text-outline">Item:</span>
                <span className="font-bold text-on-surface">{receiptSale.supplementName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">Quantity:</span>
                <span className="font-bold text-on-surface">{receiptSale.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">Customer:</span>
                <span className="font-bold text-on-surface">{receiptSale.customerName}</span>
              </div>
              <div className="flex justify-between border-t border-surface-container-high pt-1.5">
                <span className="text-outline">Total Paid:</span>
                <span className="font-sora font-bold text-secondary text-sm">{inr(receiptSale.totalAmount)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => shareWhatsAppBill(receiptSale)}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <span className="material-symbols-outlined text-base">chat</span>
                <span>Send Receipt on WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => setReceiptSale(null)}
                className="w-full py-2 rounded-xl text-outline hover:text-on-surface text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Add Product Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <form
            onSubmit={handleSaveItem}
            className="w-full max-w-lg bg-surface-container-lowest border border-surface-container-high rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl animate-in zoom-in-95 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
              <h3 className="font-sora text-sm sm:text-base font-bold text-on-surface">
                {editingItem.id ? 'Edit Supplement' : 'Add New Supplement'}
              </h3>
              <button type="button" onClick={() => setEditingItem(null)} className="text-outline hover:text-on-surface p-1">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold uppercase text-outline mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={editingItem.name || ''}
                  onChange={(e) => setEditingItem((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Gold Standard 100% Whey (2 kg)"
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-2.5 text-xs text-on-surface focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-outline mb-1">Brand *</label>
                <input
                  type="text"
                  required
                  value={editingItem.brand || ''}
                  onChange={(e) => setEditingItem((p) => ({ ...p, brand: e.target.value }))}
                  placeholder="e.g. Optimum Nutrition, MuscleBlaze"
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-2.5 text-xs text-on-surface focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-outline mb-1">Category *</label>
                <select
                  value={editingItem.category || 'Protein'}
                  onChange={(e) => setEditingItem((p) => ({ ...p, category: e.target.value as any }))}
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-2.5 text-xs text-on-surface focus:outline-none"
                >
                  {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-outline mb-1">Selling Price (₹) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={editingItem.price ?? ''}
                  onChange={(e) => setEditingItem((p) => ({ ...p, price: Number(e.target.value) }))}
                  placeholder="e.g. 4999"
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-2.5 text-xs text-on-surface focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-outline mb-1">Stock Quantity *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={editingItem.stock ?? ''}
                  onChange={(e) => setEditingItem((p) => ({ ...p, stock: Number(e.target.value) }))}
                  placeholder="e.g. 15"
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-2.5 text-xs text-on-surface focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-outline mb-1">Flavor / Variant</label>
                <input
                  type="text"
                  value={editingItem.flavor || ''}
                  onChange={(e) => setEditingItem((p) => ({ ...p, flavor: e.target.value }))}
                  placeholder="e.g. Rich Chocolate, Unflavored"
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-2.5 text-xs text-on-surface focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-outline mb-1">Unit</label>
                <input
                  type="text"
                  value={editingItem.unit || 'units'}
                  onChange={(e) => setEditingItem((p) => ({ ...p, unit: e.target.value }))}
                  placeholder="e.g. tubs, jars, bottles, packs"
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-2.5 text-xs text-on-surface focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold uppercase text-outline mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem((p) => ({ ...p, description: e.target.value }))}
                  placeholder="e.g. 25g isolate protein per serving with digestive enzymes."
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-2.5 text-xs text-on-surface focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-surface-container-high">
              {editingItem.id ? (
                <button
                  type="button"
                  onClick={() => handleDeleteItem(editingItem.id!, editingItem.name!)}
                  className="text-error font-bold text-xs hover:underline cursor-pointer"
                >
                  Delete Product
                </button>
              ) : (
                <div />
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl text-outline hover:text-on-surface font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveBusy}
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs hover:opacity-90 cursor-pointer disabled:opacity-60"
                >
                  {saveBusy ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
