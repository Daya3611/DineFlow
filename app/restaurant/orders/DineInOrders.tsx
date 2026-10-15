"use client";

import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Order as OrderType } from "@/types";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Printer, Clock, Table, Search, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export function DineInOrders({ dineInOrders }: { dineInOrders: OrderType[] }) {
  const { restaurant } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderType | null>(null);

  const printBill = (order: OrderType) => {
    let printFrame = document.getElementById("receipt-print-frame") as HTMLIFrameElement;
    if (!printFrame) {
      printFrame = document.createElement("iframe");
      printFrame.id = "receipt-print-frame";
      Object.assign(printFrame.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
      document.body.appendChild(printFrame);
    }

    const frameDoc = printFrame.contentWindow?.document;
    if (!frameDoc) return toast.error("Printing not supported.");

    const itemsHtml = order.items.map(item => `
      <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
        <span>${item.quantity}x ${item.name}</span>
        <span>Rs.${item.price * item.quantity}</span>
      </div>
    `).join("");

    const r = restaurant;

    frameDoc.open();
    frameDoc.write(`
      <html><head><title>Bill - Table ${order.tableNumber}</title>
      <style>
        @page { margin: 0; }
        body { font-family: 'Courier New', monospace; font-size: 14px; max-width: 350px; margin: 0 auto; padding: 20px; color: #000; }
        h2 { text-align:center; margin:0 0 5px 0; font-size:22px; text-transform:uppercase; font-weight:900; }
        .rest-meta { text-align:center; margin-bottom:15px; font-size:12px; line-height:1.4; border-bottom:1px dashed #000; padding-bottom:15px; }
        .order-meta { margin-bottom:20px; font-size:12px; line-height:1.5; }
        .items { border-bottom:1px dashed #000; padding-bottom:10px; margin-bottom:10px; }
        .total { display:flex; justify-content:space-between; font-weight:bold; font-size:18px; margin-bottom:20px; }
        .footer { text-align:center; font-size:12px; margin-top:20px; font-weight:bold; }
      </style></head>
      <body>
        <h2>${r?.name}</h2>
        <div class="rest-meta">
          ${r?.address ? `${r.address.replace(/\n/g, ', ')}<br>` : ""}
          ${r?.phoneNumber ? `Ph: ${r.phoneNumber}<br>` : ""}
          ${r?.gstNumber ? `GST: ${r.gstNumber}<br>` : ""}
        </div>
        <div class="order-meta">
          <b>Table: ${order.tableNumber}</b><br>
          Order #${order.id.slice(-6).toUpperCase()}<br>
          ${new Date(order.createdAt).toLocaleString()}
        </div>
        <div class="items">${itemsHtml}</div>
        <div class="total"><span>Grand Total</span><span>Rs.${order.totalAmount}</span></div>
        <div class="footer">
          Paid via: <span style="text-transform:uppercase">${order.paymentMethod || "Counter"}</span><br><br>
          Scan QR to Order &bull; Thank You!
        </div>
        <script>window.onload=()=>{setTimeout(()=>{window.print();},200);}<\/script>
      </body></html>
    `);
    frameDoc.close();
  };

  const pastOrders = dineInOrders.filter(o => o.status === "completed" || (o.isActive === false && o.status === "paid"));
  const filteredPastOrders = pastOrders.filter((order) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const orderIdShort = order.id.slice(-6).toLowerCase();
    return orderIdShort.includes(q) || order.tableNumber.toString().includes(q);
  });

  return (
    <div className="space-y-6 pt-4">
      {/* Completed Orders / Order History Section */}
      <div className="pt-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 tracking-tight">Completed Orders</h3>
            <p className="text-sm text-gray-500">History of all successfully paid table orders.</p>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by Order ID or Table..."
              className="pl-9 bg-white border-gray-200 focus-visible:ring-emerald-500 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                <tr>
                  <th className="px-6 py-4 font-semibold rounded-tl-2xl">Order ID</th>
                  <th className="px-6 py-4 font-semibold">Table</th>
                  <th className="px-6 py-4 font-semibold">Items</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Total</th>
                  <th className="px-6 py-4 font-semibold">Time</th>
                  <th className="px-6 py-4 font-semibold text-right rounded-tr-2xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredPastOrders.length > 0 ? (
                  filteredPastOrders.map((o) => (
                    <tr
                      key={o.id}
                      className="hover:bg-emerald-50/50 transition-colors cursor-pointer group"
                      onClick={() => setSelectedOrder(o)}
                    >
                      <td className="px-6 py-4 font-mono font-bold text-emerald-700">
                        #ORD-{o.id.slice(-6).toUpperCase()}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">Table {o.tableNumber}</td>
                      <td className="px-6 py-4 text-gray-500">{o.items.reduce((a, i) => a + i.quantity, 0)} items</td>
                      <td className="px-6 py-4 text-gray-500">
                        <Badge variant="outline" className="bg-[#dcfce7] text-[#16a34a] border-green-200 pointer-events-none">Paid</Badge>
                      </td>
                      <td className="px-6 py-4 font-extrabold text-gray-900">₹{o.totalAmount}</td>
                      <td className="px-6 py-4 text-gray-400">{new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" className="h-8 w-8 text-gray-400 hover:text-[#0f9d6a]">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      {searchQuery ? `No orders found matching "${searchQuery}"` : "No completed orders found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl overflow-hidden p-0 gap-0 border-gray-100 shadow-xl">
          {selectedOrder && (
            <>
              <div className="bg-gradient-to-br from-[#16a34a] to-[#22c55e] p-6 text-white flex justify-between items-start">
                <div>
                  <Badge className="bg-white/20 text-white hover:bg-white/30 border-none mb-2 pointer-events-none">
                    Completed Order
                  </Badge>
                  <h2 className="text-2xl font-black font-mono tracking-tight">#ORD-{selectedOrder.id.slice(-6).toUpperCase()}</h2>
                  <div className="flex items-center gap-2 mt-1 text-emerald-100 text-sm font-medium">
                    <Table className="h-4 w-4" /> Table {selectedOrder.tableNumber}
                    <span className="px-1">•</span>
                    <Clock className="h-4 w-4" /> {new Date(selectedOrder.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white space-y-6">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 tracking-wider uppercase">Order Items</h4>
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-2 scroll-smooth border-b border-gray-50 pb-2 scrollbar-thin">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start text-sm">
                        <div className="flex gap-3">
                          <span className="font-bold text-[#16a34a] bg-[#dcfce7] px-2 rounded-md h-6 flex items-center justify-center min-w-[28px]">{item.quantity}x</span>
                          <span className="font-medium text-gray-900">{item.name}</span>
                        </div>
                        <span className="text-gray-500 font-medium whitespace-nowrap pb-2">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  {selectedOrder.note && (
                    <div className="bg-green-50 border border-green-200 p-3 rounded-lg mt-3">
                      <p className="text-sm text-green-700 font-medium">Customer Note:</p>
                      <p className="text-sm text-gray-700">{selectedOrder.note}</p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-dashed border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-500 font-semibold">Total Amount</span>
                    <span className="text-2xl font-black text-[#16a34a]">₹{selectedOrder.totalAmount}</span>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 flex justify-between items-center border border-gray-100">
                    <div className="space-y-1">
                      <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Payment Method</span>
                      <span className="font-semibold text-gray-900 capitalize">{selectedOrder.paymentMethod || "Counter"}</span>
                    </div>
                    <div className="text-right space-y-1">
                      <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Status</span>
                      <Badge className="bg-[#dcfce7] text-[#16a34a] border-none shadow-none pointer-events-none">Paid</Badge>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" className="text-gray-600 w-full" onClick={() => setSelectedOrder(null)}>
                    Close
                  </Button>
                  <Button className="bg-[#16a34a] hover:bg-[#15803d] w-full text-white rounded-full" onClick={() => { printBill(selectedOrder); setSelectedOrder(null); }}>
                    <Printer className="h-4 w-4 mr-2" /> Print Bill
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
