import React from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend 
} from "recharts";
import { format } from "date-fns";
import { 
  GeneratedReport, SalesReportData, InventoryReportData, 
  ProductCategoryReportData, SupplierReportData, OrdersReturnsReportData 
} from "@/services/api";
import logo from "../assets/logo.png";

interface ReportViewerProps {
  report: GeneratedReport;
  onClose: () => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function ReportViewer({ report, onClose }: ReportViewerProps) {
  const data = report.reportData;

  const handlePrint = () => {
    window.print();
  };

  const renderSalesSections = (sales: SalesReportData) => (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-6">
        <div className="p-5 bg-gradient-to-br from-primary/10 to-white border border-blue-100 rounded-2xl text-center shadow-sm">
          <p className="text-[10px] text-primary font-black uppercase tracking-[0.15em] mb-1">Gross Revenue</p>
          <p className="text-2xl font-black text-blue-900 leading-tight">₱{Number(sales.summary.total_revenue_gross).toLocaleString()}</p>
        </div>
        <div className="p-5 bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-2xl text-center shadow-sm">
          <p className="text-[10px] text-green-500 font-black uppercase tracking-[0.15em] mb-1">Net Revenue</p>
          <p className="text-2xl font-black text-green-900 leading-tight">₱{Number(sales.summary.total_revenue_net).toLocaleString()}</p>
        </div>
        <div className="p-5 bg-gradient-to-br from-red-50 to-white border border-red-100 rounded-2xl text-center shadow-sm">
          <p className="text-[10px] text-red-500 font-black uppercase tracking-[0.15em] mb-1">Refunded Total</p>
          <p className="text-2xl font-black text-red-900 leading-tight">₱{Number(sales.summary.refunded_total).toLocaleString()}</p>
        </div>
      </div>

      {/* Chart */}
      <div>
        <h3 className="text-lg font-bold text-foreground mb-4">Monthly Sales Breakdown ({report.dateRange.substring(0, 4)})</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sales.trends.annual}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(val) => `₱${val}`} />
              <Tooltip formatter={(value: any) => [`₱${Number(value).toLocaleString()}`, 'Sales']} />
              <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ranking Tables */}
      <div className="grid grid-cols-2 gap-8">
        <div>
          <h4 className="text-md font-bold text-muted-foreground mb-2 border-b-2 border-green-500 pb-1">Top Selling Products</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="py-2">Product</th>
                <th className="py-2 text-right">Units</th>
                <th className="py-2 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {sales.top_products.map((p, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="py-2 font-medium">{p.product_name}</td>
                  <td className="py-2 text-right">{p.units_sold}</td>
                  <td className="py-2 text-right">₱{Number(p.revenue).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h4 className="text-md font-bold text-muted-foreground mb-2 border-b-2 border-amber-500 pb-1">Lowest Selling Products</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="py-2">Product</th>
                <th className="py-2 text-right">Units Sold</th>
              </tr>
            </thead>
            <tbody>
              {sales.lowest_products.map((p, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="py-2 font-medium">{p.product_name}</td>
                  <td className="py-2 text-right">{p.units_sold || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderInventorySections = (inv: InventoryReportData) => (
    <div className="space-y-8">
      {/* Visual Breakdown */}
      <div className="grid grid-cols-2 gap-8 items-center">
        <div>
          <h3 className="text-lg font-bold text-foreground mb-4">Stock Status Overview</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={inv.breakdown} 
                  dataKey="count" 
                  nameKey="status" 
                  cx="40%" cy="50%" 
                  innerRadius={60}
                  outerRadius={90} 
                  paddingAngle={5}
                  label={false}
                >
                  {inv.breakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend layout="vertical" align="right" verticalAlign="middle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground mb-4">Highest Stock-out Frequency</h3>
          <ul className="space-y-2">
            {inv.critical_frequency.map((item, i) => (
              <li key={i} className="flex justify-between items-center bg-muted/50 p-2 rounded border-l-4 border-red-500">
                <span className="font-medium text-sm">{item.product_name}</span>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">{item.incident_count} events</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Detailed Table */}
      <div>
        <h3 className="text-lg font-bold text-foreground mb-4">Inventory Detail & Discrepancy Analysis</h3>
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="py-2 px-3 text-left">Product Name</th>
              <th className="py-2 px-3 text-left">SKU</th>
              <th className="py-2 px-3 text-right">Expected</th>
              <th className="py-2 px-3 text-right">Actual</th>
              <th className="py-2 px-3 text-right">Difference</th>
              <th className="py-2 px-3 text-right">Reorder Level</th>
            </tr>
          </thead>
          <tbody>
            {inv.detailed_inventory.map((p, i) => (
              <tr key={i} className="border-b">
                <td className="py-2 px-3 font-medium">{p.product_name} {p.actual <= p.reorder_level && <span className="text-[10px] bg-amber-100 text-amber-700 px-1 rounded ml-1">RESTOCK</span>}</td>
                <td className="py-2 px-3 text-muted-foreground">{p.sku}</td>
                <td className="py-2 px-3 text-right">{p.expected}</td>
                <td className="py-2 px-3 text-right font-bold">{p.actual}</td>
                <td className={`py-2 px-3 text-right font-bold ${p.difference !== 0 ? 'text-red-600 bg-red-50' : 'text-muted-foreground/70'}`}>
                  {p.difference > 0 ? `+${p.difference}` : p.difference}
                </td>
                <td className="py-2 px-3 text-right text-muted-foreground italic">{p.reorder_level}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderProductSections = (pc: ProductCategoryReportData) => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-bold text-foreground mb-4">Procurement & Investment Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pc.investment_summary.map((cat, i) => (
            <div key={i} className="p-3 bg-muted/50 border rounded-lg">
              <p className="text-xs text-muted-foreground uppercase font-bold">{cat.category}</p>
              <p className="text-lg font-bold text-indigo-700">₱{Number(cat.total_category_cost).toLocaleString()}</p>
            </div>
          ))}
          <div className="p-3 bg-indigo-600 text-white rounded-lg">
            <p className="text-xs uppercase font-bold text-indigo-100">Total System Cost</p>
            <p className="text-xl font-bold">₱{pc.investment_summary.reduce((acc, curr) => acc + Number(curr.total_category_cost), 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <table className="w-full text-xs">
        <thead className="bg-indigo-50">
          <tr>
            <th className="py-2 px-2 text-left">Category</th>
            <th className="py-2 px-2 text-left">Product</th>
            <th className="py-2 px-2 text-right">Unit Cost</th>
            <th className="py-2 px-2 text-right">SRP</th>
            <th className="py-2 px-2 text-right">Stock</th>
            <th className="py-2 px-2 text-right">Total Cost</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {pc.products.map((p, i) => (
            <tr key={i} className="hover:bg-muted/50">
              <td className="py-1 px-2 font-bold text-muted-foreground/70">{p.category}</td>
              <td className="py-1 px-2 font-medium">{p.product_name}</td>
              <td className="py-1 px-2 text-right">₱{Number(p.unit_cost).toLocaleString()}</td>
              <td className="py-1 px-2 text-right">₱{Number(p.srp).toLocaleString()}</td>
              <td className="py-1 px-2 text-right">{p.stock}</td>
              <td className="py-1 px-2 text-right font-bold">₱{Number(p.total_cost).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderSupplierSections = (sup: SupplierReportData) => (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-foreground">Supplier Directory & Performance</h3>
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="py-2 px-3 text-left">Supplier Info</th>
            <th className="py-2 px-3 text-center">Status</th>
            <th className="py-2 px-3 text-right">PO Volume</th>
            <th className="py-2 px-3 text-right">Total Spent</th>
            <th className="py-2 px-3 text-right">Avg Lead Time</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {sup.suppliers.map((s, i) => (
            <tr key={i} className="align-top">
              <td className="py-3 px-3">
                <p className="font-bold text-foreground">{s.supplier_name}</p>
                <p className="text-xs text-muted-foreground">{s.email}</p>
                <p className="text-xs text-muted-foreground">{s.contact_number}</p>
              </td>
              <td className="py-3 px-3 text-center">
                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${s.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                  {s.status}
                </span>
              </td>
              <td className="py-3 px-3 text-right font-medium">{s.po_count} orders</td>
              <td className="py-3 px-3 text-right font-bold">₱{Number(s.total_spent).toLocaleString()}</td>
              <td className="py-3 px-3 text-right">
                {s.avg_lead_time ? `${Math.round(s.avg_lead_time)} days` : 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderReturnSections = (ret: OrdersReturnsReportData) => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-bold text-foreground mb-2 border-l-4 border-indigo-600 pl-3">Recent Purchase Orders</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground border-b">
              <th className="py-2">PO ID</th>
              <th className="py-2">Date</th>
              <th className="py-2 text-center">Status</th>
              <th className="py-2 text-right">Expected/Arrival</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {ret.purchase_orders.map((po, i) => (
              <tr key={i}>
                <td className="py-2 font-bold text-muted-foreground">{po.order_id}</td>
                <td className="py-2">{format(new Date(po.created_at), 'MMM dd, yyyy')}</td>
                <td className="py-2 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${po.status === 'Received' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {po.status}
                  </span>
                </td>
                <td className="py-2 text-right text-muted-foreground">{po.expected_delivery || '---'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="text-lg font-bold text-foreground mb-2 border-l-4 border-red-500 pl-3">Customer Return/RMA Log</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground border-b">
              <th className="py-2">RMA #</th>
              <th className="py-2">Customer</th>
              <th className="py-2">Type</th>
              <th className="py-2">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {ret.customer_returns.map((cr, i) => (
              <tr key={i}>
                <td className="py-2 font-bold text-red-700">{cr.rma_number}</td>
                <td className="py-2">
                  <p className="font-medium">{cr.customer_name}</p>
                  <p className="text-[10px] text-muted-foreground/70">Sale ID: {cr.sale_id}</p>
                </td>
                <td className="py-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${cr.return_type === 'Refund' ? 'bg-red-50 text-red-600' : 'bg-primary/10 text-primary'}`}>
                    {cr.return_type}
                  </span>
                </td>
                <td className="py-2 text-xs italic text-muted-foreground truncate max-w-[200px]">{cr.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm print:bg-card print:p-0 p-4 flex justify-center items-center">
      <div className="bg-card w-full max-w-[1000px] max-h-[90vh] shadow-2xl relative print:my-0 print:shadow-none flex flex-col rounded-xl overflow-hidden min-w-[300px]">
        {/* Report Controls (Hidden during print) */}
        <div className="bg-gray-900 text-white px-8 py-4 flex justify-between items-center sticky top-0 z-[60] print:hidden">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold">Report Preview</h2>
            <div className="h-6 w-px bg-gray-700" />
            <p className="text-sm text-muted-foreground/70">{report.reportType} - {report.dateRange}</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handlePrint}
              className="bg-primary hover:bg-primary text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
              Print Report
            </button>
            <button 
              onClick={onClose}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* The Printable Document */}
        <div className="flex-1 p-[20mm] bg-card text-foreground print:text-black overflow-y-auto">
          {/* Header */}
          <header className="flex justify-between items-start border-b-4 border-gray-900 pb-6 mb-8">
            <div className="flex items-center gap-6">
              <img src={logo} alt="JonBrix Logo" className="h-16 w-auto object-contain" />
              <div>
                <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">JonBrix</h1>
                <p className="text-sm font-bold text-muted-foreground mt-1 uppercase tracking-widest">Motorcycle Parts & Accessories</p>
                <div className="mt-2 flex gap-4 text-[10px] text-muted-foreground/70">
                  <span className="flex items-center gap-1 font-bold">
                    <span className="w-2 h-2 rounded-full bg-green-500" /> SYSTEM PERFORMANCE
                  </span>
                  <span className="flex items-center gap-1 font-bold">
                    <span className="w-2 h-2 rounded-full bg-primary" /> VERIFIED DATA
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-sm font-black text-foreground uppercase bg-muted px-3 py-1 rounded inline-block mb-3 tracking-widest">
                System Generated Report
              </h2>
              <div className="space-y-0.5 text-xs">
                <p className="flex justify-end gap-2"><span className="text-muted-foreground/70 font-bold uppercase tracking-tighter">Report Type:</span> <span className="font-black underline">{report.reportType}</span></p>
                <p className="flex justify-end gap-2"><span className="text-muted-foreground/70 font-bold uppercase tracking-tighter">Generated By:</span> <span className="font-black">{report.generatedBy}</span></p>
                <p className="flex justify-end gap-2"><span className="text-muted-foreground/70 font-bold uppercase tracking-tighter">Date Range:</span> <span className="font-black italic">{report.dateRange}</span></p>
                <p className="flex justify-end gap-2"><span className="text-muted-foreground/70 font-bold uppercase tracking-tighter">Created At:</span> <span className="font-black">{report.generatedDate}</span></p>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="min-h-[220mm]">
            {report.reportType.includes("Sales") && renderSalesSections(data)}
            {report.reportType.includes("Inventory") && renderInventorySections(data)}
            {report.reportType.includes("Product") && renderProductSections(data)}
            {report.reportType.includes("Supplier") && renderSupplierSections(data)}
            {report.reportType.includes("Orders") && renderReturnSections(data)}

            {Object.keys(data).length === 0 && (
              <div className="py-20 text-center">
                <p className="text-muted-foreground/70 font-bold italic">No specialized data available for this report type.</p>
              </div>
            )}
          </main>

          {/* Footer */}
          <footer className="mt-12 border-t border-border pt-6 text-muted-foreground/70 text-[10px] flex justify-between items-end">
            <div>
              <p className="font-black uppercase tracking-widest mb-1 text-muted-foreground">JonBrix Motor Parts</p>
              <div className="flex gap-4">
                <span>Print Copy Generated: {format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</span>
                <span>System: InvenSight CMS</span>
              </div>
            </div>
            <div className="text-right">
              <p className="bg-gray-900 text-white px-4 py-1 font-black rounded italic">CONFIDENTIAL FOR ADMINISTRATIVE USE ONLY</p>
              <div className="mt-2 text-xs">Page 1 of 1</div>
            </div>
          </footer>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .recharts-responsive-container {
            width: 100% !important;
            height: 300px !important;
          }
        }
      `}</style>
    </div>
  );
}
