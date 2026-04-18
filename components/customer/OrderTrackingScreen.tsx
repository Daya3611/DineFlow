"use client";

import { useEffect, useState } from "react";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "@/firebase";
import { Order as OrderType } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Clock,
  Flame,
  CheckCircle2,
  UtensilsCrossed,
  Info,
  Plus,
  PhoneCall,
  Receipt,
} from "lucide-react";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const STEPS = [
  {
    id: "pending",
    label: "Order Confirmed",
    short: "Order Received",
    message: "Kitchen has received your order",
    icon: Clock,
    color: "#16a34a",
  },
  {
    id: "preparing",
    label: "Preparing",
    short: "In the Kitchen",
    message: "Your food is being freshly prepared",
    icon: Flame,
    color: "#f59e0b",
  },
  {
    id: "served",
    label: "Served",
    short: "Enjoy your meal!",
    message: "Your order has been served",
    icon: UtensilsCrossed,
    color: "#16a34a",
  },
] as const;

function getStepIndex(status: string): number {
  if (status === "paid") return 2;
  const idx = STEPS.findIndex((s) => s.id === status);
  return idx === -1 ? 0 : idx;
}

function PaymentBadge({
  paymentStatus,
  paymentMethod,
}: {
  paymentStatus: string;
  paymentMethod: string;
}) {
  if (paymentStatus === "paid") {
    return (
      <span className="ots-badge ots-badge--green">
        ✓ Paid · {paymentMethod === "upi" ? "UPI" : "Counter"}
      </span>
    );
  }
  if (paymentStatus === "pending_verification") {
    return (
      <span className="ots-badge ots-badge--amber">⏳ Verifying UPI Payment</span>
    );
  }
  return (
    <span className="ots-badge ots-badge--yellow">
      💳 Payment Pending · Pay at Counter
    </span>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function OrderTrackingScreen({
  orderId,
  table,
  onOrderAgain,
  onViewMenu,
  renderPaymentUI,
  orders: manualOrders,
}: {
  orderId?: string;
  table: string;
  onOrderAgain?: () => void;
  onViewMenu?: () => void;
  renderPaymentUI?: (order: OrderType) => React.ReactNode;
  orders?: OrderType[];
}) {
  const [order, setOrder] = useState<OrderType | null>(null);
  const [syncedOrders, setSyncedOrders] = useState<OrderType[]>(manualOrders || []);

  useEffect(() => {
    if (manualOrders) {
      setSyncedOrders(manualOrders);
    }
  }, [manualOrders]);

  useEffect(() => {
    if (!orderId || manualOrders) return;
    const unsub = onSnapshot(doc(db, "orders", orderId), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as OrderType;
        setOrder(data);
        setSyncedOrders([data]);
      }
    });
    return () => unsub();
  }, [orderId, manualOrders]);

  const effectiveOrder = manualOrders || syncedOrders.length > 0 ? (() => {
    if (syncedOrders.length === 0) return null;
    if (syncedOrders.length === 1 && !manualOrders) return syncedOrders[0];

    // Merged view logic
    const mergedItems: Record<string, any> = {};
    let total = 0;
    
    // Status precedence: lowest status wins for the "Timeline" view (to be safe)
    const statusPriority = ["pending", "preparing", "served"];
    let minStatusIdx = 2; // Default to served

    syncedOrders.forEach(o => {
      total += (o.totalAmount || 0);
      const sIdx = statusPriority.indexOf(o.status);
      if (sIdx !== -1 && sIdx < minStatusIdx) minStatusIdx = sIdx;

      (o.items || []).forEach(item => {
        if (!mergedItems[item.id]) {
          mergedItems[item.id] = { ...item };
        } else {
          mergedItems[item.id].quantity += item.quantity;
        }
      });
    });

    return {
      id: syncedOrders[0].id, // Arbitrary
      restaurantId: syncedOrders[0].restaurantId,
      tableNumber: table,
      status: statusPriority[minStatusIdx],
      items: Object.values(mergedItems),
      totalAmount: total,
      paymentStatus: syncedOrders.every(o => o.paymentStatus === "paid") ? "paid" : 
                     syncedOrders.some(o => o.paymentStatus === "pending_verification") ? "pending_verification" : "unpaid",
      paymentMethod: syncedOrders[0].paymentMethod || "counter",
      isMerged: syncedOrders.length > 1
    } as OrderType & { isMerged?: boolean };
  })() : order;

  /* ── Loading skeleton ── */
  if (!effectiveOrder) {
    return (
      <div className="ots-loading">
        <div className="ots-loading__spinner" />
        <p className="ots-loading__text">Fetching live status…</p>
      </div>
    );
  }

  const displayIndex = getStepIndex(effectiveOrder.status);
  const currentStep = STEPS[displayIndex];
  const StatusIcon = currentStep.icon;

  return (
    <>
      {/* ── Injected styles ── */}
      <style>{`
        /* ── Reset & root ── */
        .ots-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          background: #f8fafc;
          position: relative;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        /* ── Loading ── */
        .ots-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 16px;
          background: #f8fafc;
        }
        .ots-loading__spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #d1fae5;
          border-top-color: #16a34a;
          border-radius: 50%;
          animation: ots-spin 0.8s linear infinite;
        }
        .ots-loading__text {
          font-size: 14px;
          color: #64748b;
          font-weight: 500;
        }
        @keyframes ots-spin { to { transform: rotate(360deg); } }

        /* ── Header ── */
        .ots-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 20px 16px;
          background: #fff;
          border-bottom: 1px solid #f1f5f9;
          flex-shrink: 0;
        }
        .ots-header__left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ots-back-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #f1f5f9;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s;
          color: #374151;
        }
        .ots-back-btn:hover { background: #e2e8f0; }
        .ots-header__title {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.2;
        }
        .ots-header__sub {
          font-size: 12px;
          font-weight: 600;
          color: #16a34a;
          margin-top: 2px;
        }
        .ots-order-id {
          font-size: 11px;
          font-family: 'SF Mono', 'Fira Code', monospace;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          color: #64748b;
          padding: 4px 10px;
          border-radius: 100px;
          font-weight: 600;
          letter-spacing: 0.04em;
        }

        /* ── Scrollable body ── */
        .ots-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px 16px 120px;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        /* ── Status Hero ── */
        .ots-hero {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px 20px;
          border-radius: 20px;
          margin-bottom: 8px;
          position: relative;
          overflow: hidden;
        }
        .ots-hero--pending {
          background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
          border: 1.5px solid #86efac;
        }
        .ots-hero--preparing {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: 1.5px solid #fcd34d;
        }
        .ots-hero--served {
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          border: 1.5px solid #6ee7b7;
        }
        .ots-hero__icon-wrap {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .ots-hero__icon-wrap--pending { background: #16a34a; }
        .ots-hero__icon-wrap--preparing { background: #d97706; }
        .ots-hero__icon-wrap--served { background: #059669; }
        .ots-hero__icon { color: #fff; }
        .ots-hero__label {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.2;
        }
        .ots-hero__msg {
          font-size: 13px;
          color: #374151;
          font-weight: 500;
          margin-top: 3px;
        }
        .ots-hero__pulse {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #16a34a;
          animation: ots-pulse 2s ease-in-out infinite;
        }
        .ots-hero__pulse--amber { background: #f59e0b; }
        @keyframes ots-pulse {
          0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 0 rgba(22,163,74,0.4); }
          50% { opacity: 0.8; transform: scale(1.15); box-shadow: 0 0 0 6px rgba(22,163,74,0); }
        }

        /* ── Section label ── */
        .ots-section-label {
          font-size: 11px;
          font-weight: 700;
          color: #94a3b8;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 20px 4px 10px;
        }

        /* ── Timeline ── */
        .ots-timeline {
          display: flex;
          flex-direction: column;
          padding: 4px 0 4px 4px;
          margin-bottom: 4px;
        }
        .ots-timeline__item {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          position: relative;
        }
        .ots-timeline__track {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
          width: 28px;
        }
        .ots-timeline__dot {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.4s ease;
          z-index: 1;
        }
        .ots-timeline__dot--done {
          background: #16a34a;
          color: #fff;
        }
        .ots-timeline__dot--active {
          background: #fff;
          border: 3px solid #16a34a;
          box-shadow: 0 0 0 4px rgba(22,163,74,0.15);
        }
        .ots-timeline__dot--active-inner {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #16a34a;
          animation: ots-dot-pulse 1.5s ease-in-out infinite;
        }
        @keyframes ots-dot-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }
        .ots-timeline__dot--pending {
          background: #f1f5f9;
          border: 2px solid #e2e8f0;
        }
        .ots-timeline__connector {
          width: 2px;
          height: 32px;
          border-radius: 2px;
          margin: 3px 0;
          transition: background 0.5s ease;
        }
        .ots-timeline__connector--done { background: #16a34a; }
        .ots-timeline__connector--pending { background: #e2e8f0; }
        .ots-timeline__content {
          padding: 3px 0 28px;
          flex: 1;
        }
        .ots-timeline__item:last-child .ots-timeline__content { padding-bottom: 4px; }
        .ots-tl-label {
          font-size: 15px;
          font-weight: 700;
          line-height: 1;
        }
        .ots-tl-label--done { color: #0f172a; }
        .ots-tl-label--active { color: #15803d; }
        .ots-tl-label--pending { color: #94a3b8; }
        .ots-tl-msg {
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;
          margin-top: 5px;
        }

        /* ── Divider ── */
        .ots-divider {
          height: 1px;
          background: #f1f5f9;
          margin: 4px 0 8px;
        }

        /* ── Bill ── */
        .ots-bill {
          padding: 4px 0;
        }
        .ots-bill__row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 10px 0;
          border-bottom: 1px solid #f8fafc;
        }
        .ots-bill__row:last-child { border-bottom: none; }
        .ots-bill__item-name {
          font-size: 14px;
          color: #374151;
          font-weight: 500;
          flex: 1;
          padding-right: 12px;
        }
        .ots-bill__qty {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 6px;
          display: inline-block;
          margin-right: 8px;
          vertical-align: middle;
        }
        .ots-bill__price {
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
          flex-shrink: 0;
        }
        .ots-bill__total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 0 6px;
          border-top: 1.5px dashed #e2e8f0;
          margin-top: 4px;
        }
        .ots-bill__total-label {
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
        }
        .ots-bill__total-amount {
          font-size: 22px;
          font-weight: 900;
          color: #16a34a;
          letter-spacing: -0.5px;
        }

        /* ── Payment badge ── */
        .ots-payment-wrap {
          padding: 4px 0 8px;
        }
        .ots-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 100px;
        }
        .ots-badge--green {
          background: #dcfce7;
          color: #15803d;
          border: 1px solid #86efac;
        }
        .ots-badge--amber {
          background: #fef3c7;
          color: #b45309;
          border: 1px solid #fcd34d;
        }
        .ots-badge--yellow {
          background: #fff7ed;
          color: #c2410c;
          border: 1px solid #fed7aa;
        }

        /* ── Notes ── */
        .ots-note {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 12px;
          padding: 12px 14px;
          margin-top: 8px;
        }
        .ots-note__icon { color: #0284c7; flex-shrink: 0; margin-top: 1px; }
        .ots-note__label {
          font-size: 11px;
          font-weight: 700;
          color: #0369a1;
          display: block;
          margin-bottom: 3px;
        }
        .ots-note__text {
          font-size: 13px;
          color: #0c4a6e;
          font-weight: 500;
          line-height: 1.5;
        }

        /* ── Bottom actions ── */
        .ots-actions {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(255,255,255,0.96);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-top: 1px solid #f1f5f9;
          padding: 12px 16px 20px;
          z-index: 20;
          box-shadow: 0 -8px 24px rgba(0,0,0,0.04);
        }
        .ots-actions__row { display: flex; gap: 10px; }
        .ots-btn {
          flex: 1;
          height: 48px;
          border-radius: 14px;
          border: none;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          transition: all 0.15s;
        }
        .ots-btn:active { transform: scale(0.97); }
        .ots-btn--primary {
          background: #16a34a;
          color: #fff;
          box-shadow: 0 4px 14px rgba(22,163,74,0.25);
        }
        .ots-btn--primary:hover { background: #15803d; }
        .ots-btn--outline {
          background: #f8fafc;
          color: #374151;
          border: 1.5px solid #e2e8f0;
        }
        .ots-btn--outline:hover { background: #f1f5f9; }
      `}</style>

      <div className="ots-root">
        {/* ── HEADER ── */}
        <header className="ots-header">
          <div className="ots-header__left">
            {onViewMenu && (
              <button className="ots-back-btn" onClick={onViewMenu} aria-label="Go back">
                <ChevronLeft size={18} />
              </button>
            )}
            <div>
              <p className="ots-header__title">{effectiveOrder.isMerged ? "Current Table Bill" : "Your Order"}</p>
              <p className="ots-header__sub">
                {effectiveOrder.tableNumber === "Takeaway" ? "Pickup" : `Table ${effectiveOrder.tableNumber}`}
              </p>
            </div>
          </div>
          <span className="ots-order-id">{effectiveOrder.isMerged ? `Combined (${syncedOrders.length})` : `#ORD-${effectiveOrder.id.slice(-6).toUpperCase()}`}</span>
        </header>

        {/* ── SCROLLABLE BODY ── */}
        <div className="ots-body">

          {/* ── STATUS HERO ── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={effectiveOrder.status}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`ots-hero ots-hero--${displayIndex === 1 ? "preparing" : displayIndex === 2 ? "served" : "pending"}`}
            >
              <div className={`ots-hero__icon-wrap ots-hero__icon-wrap--${displayIndex === 1 ? "preparing" : displayIndex === 2 ? "served" : "pending"}`}>
                <StatusIcon size={22} className="ots-hero__icon" />
              </div>
              <div>
                <p className="ots-hero__label">{currentStep.label}</p>
                <p className="ots-hero__msg">{effectiveOrder.isMerged ? "Combined status for all items" : currentStep.message}</p>
              </div>
              <div className={`ots-hero__pulse${displayIndex === 1 ? " ots-hero__pulse--amber" : ""}`} />
            </motion.div>
          </AnimatePresence>

          {/* ── TIMELINE ── */}
          <p className="ots-section-label">Live Progress</p>
          <div className="ots-timeline">
            {STEPS.map((step, idx) => {
              const isDone = idx < displayIndex;
              const isActive = idx === displayIndex;
              const isPending = idx > displayIndex;

              return (
                <div key={step.id} className="ots-timeline__item">
                  <div className="ots-timeline__track">
                    <motion.div
                      initial={false}
                      animate={{ scale: isActive ? 1.08 : 1 }}
                      className={`ots-timeline__dot ${isDone ? "ots-timeline__dot--done" : isActive ? "ots-timeline__dot--active" : "ots-timeline__dot--pending"}`}
                    >
                      {isDone && <CheckCircle2 size={14} />}
                      {isActive && <div className="ots-timeline__dot--active-inner" />}
                    </motion.div>

                    {idx < STEPS.length - 1 && (
                      <motion.div
                        className={`ots-timeline__connector ${isDone ? "ots-timeline__connector--done" : "ots-timeline__connector--pending"}`}
                        initial={false}
                        animate={{ scaleY: 1 }}
                        style={{ transformOrigin: "top" }}
                      />
                    )}
                  </div>

                  <div className="ots-timeline__content">
                    <p className={`ots-tl-label ots-tl-label--${isDone ? "done" : isActive ? "active" : "pending"}`}>
                      {step.short}
                    </p>
                    {isActive && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="ots-tl-msg"
                      >
                        {step.message}
                      </motion.p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── BILL ── */}
          <div className="ots-divider" />
          <div className="ots-bill">
            {effectiveOrder.isMerged && (
              <div className="bg-emerald-50 text-emerald-700 text-[11px] font-bold px-3 py-2 rounded-lg mb-3 border border-emerald-100 flex items-center gap-2">
                <Info size={12} /> Items added across multiple orders
              </div>
            )}
            {effectiveOrder.items.map((item, idx) => (
              <div key={idx} className="ots-bill__row">
                <span className="ots-bill__item-name">
                  <span className="ots-bill__qty">{item.quantity}×</span>
                  {item.name}
                </span>
                <span className="ots-bill__price">₹{item.price * item.quantity}</span>
              </div>
            ))}

            <div className="ots-bill__total-row">
              <span className="ots-bill__total-label">Total</span>
              <span className="ots-bill__total-amount">₹{effectiveOrder.totalAmount}</span>
            </div>
          </div>

          {/* ── PAYMENT STATUS ── */}
          <div className="ots-payment-wrap">
            <PaymentBadge
              paymentStatus={effectiveOrder.paymentStatus}
              paymentMethod={effectiveOrder.paymentMethod}
            />
          </div>

          {/* ── NOTES ── */}
          {effectiveOrder.note && (
            <div className="ots-note">
              <Info size={14} className="ots-note__icon" />
              <div>
                <span className="ots-note__label">Your Note</span>
                <span className="ots-note__text">{effectiveOrder.note}</span>
              </div>
            </div>
          )}

          {/* ── PAYMENT UI (Injected from parent) ── */}
          {renderPaymentUI && renderPaymentUI(effectiveOrder)}
        </div>

        {/* ── BOTTOM ACTION BUTTONS ── */}
        <div className="ots-actions">
          <div className="ots-actions__row">
            <button
              className="ots-btn ots-btn--outline"
              onClick={() => alert("Waiter has been called! 🛎")}
            >
              <PhoneCall size={16} />
              Call Waiter
            </button>
            {(onOrderAgain || onViewMenu) && (
              <button
                className="ots-btn ots-btn--primary"
                onClick={onOrderAgain || onViewMenu}
              >
                <Plus size={16} />
                Order More
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
