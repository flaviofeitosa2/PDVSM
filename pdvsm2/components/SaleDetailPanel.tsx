
import React, { useRef, useState } from 'react';
import { 
  X, 
  Calendar, 
  User, 
  ShoppingBag, 
  CreditCard, 
  FileText, 
  Ban, 
  CheckCircle,
  Copy,
  Send,
  Printer,
  Loader2,
  Check,
  MessageSquare
} from 'lucide-react';
import { Sale, PaymentMethod } from '../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface SaleDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
}

const SaleDetailPanel: React.FC<SaleDetailPanelProps> = ({ isOpen, onClose, sale }) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  if (!sale) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const paymentMethodLabels: Record<PaymentMethod, string> = {
    money: 'Dinheiro',
    debit: 'Cartão de Débito',
    credit: 'Cartão de Crédito',
    pix: 'Pix',
    others: 'Outros',
    credit_tab: 'Venda Fiado',
    link: 'Link de Pagamento'
  };

  const currency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const dateStr = new Date(sale.date).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  // Helper values
  const subtotalValue = sale.subtotal ?? sale.total;
  const discountValue = sale.discount ?? 0;

  // --- Print Logic ---
  const handlePrint = () => {
    // 1. Define Receipt Content and Styles
    const style = `
      <style>
        @page { margin: 0; size: 80mm auto; }
        body { 
          font-family: 'Courier New', Courier, monospace; 
          margin: 0; 
          padding: 10px; 
          font-size: 12px; 
          color: #000; 
          background: #fff;
          max-width: 80mm;
        }
        .header { text-align: center; margin-bottom: 10px; }
        .title { font-size: 16px; font-weight: bold; display: block; margin-bottom: 4px; text-transform: uppercase; }
        .subtitle { font-size: 12px; display: block; margin-bottom: 2px;}
        .divider { border-top: 1px dashed #000; margin: 8px 0; width: 100%; }
        .flex { display: flex; justify-content: space-between; }
        .right { text-align: right; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .items-table { width: 100%; border-collapse: collapse; margin-top: 5px; }
        .items-table th { text-align: left; font-size: 11px; border-bottom: 1px dashed #000; padding-bottom: 4px; }
        .items-table td { padding: 4px 0; vertical-align: top; font-size: 11px; }
        .qty { width: 15%; text-align: center; }
        .price { width: 25%; text-align: right; }
        .total-row { font-size: 14px; margin-top: 5px; }
        .footer { margin-top: 20px; font-size: 10px; text-align: center; }
      </style>
    `;

    const itemsHtml = sale.items.map(item => `
      <tr>
        <td colspan="3" style="padding-top:4px; font-weight: bold;">${item.name}</td>
      </tr>
      <tr>
        <td>${currency(item.price)}</td>
        <td class="qty">x${item.quantity}</td>
        <td class="price">${currency(item.price * item.quantity)}</td>
      </tr>
    `).join('');

    let paymentDetailsHtml = '';
    if (sale.payments && sale.payments.length > 0) {
        paymentDetailsHtml = sale.payments.map(p => `
            <div class="flex" style="margin-top: 2px">
                <span>${paymentMethodLabels[p.method].toUpperCase()}</span>
                <span>${currency(p.amount)}</span>
            </div>
        `).join('');
    } else {
        paymentDetailsHtml = `
            <div class="flex" style="margin-top: 2px">
                <span>${paymentMethodLabels[sale.paymentMethod].toUpperCase()}</span>
                <span>${currency(sale.total)}</span>
            </div>
        `;
    }

    if (sale.change && sale.change > 0) {
        paymentDetailsHtml += `
            <div class="flex" style="margin-top: 2px">
                <span>TROCO</span>
                <span>${currency(sale.change)}</span>
            </div>
        `;
    }

    const htmlContent = `
      <html>
        <head>
            <meta charset="utf-8">
            <title>Cupom #${sale.code}</title>
            ${style}
        </head>
        <body>
          <div class="header">
            <span class="title">ESPAÇO DIGITAL</span>
            <span class="subtitle">Espaço Digital e Informática</span>
            <span class="subtitle">Rua 4A Chacara 108 Lote 07 Loja 03</span>
            <span class="subtitle">Vicente Pires - Brasília/DF</span>
            <span class="subtitle">CNPJ: 11.353.879/0001-71</span>
          </div>
          <div class="divider"></div>
          <div style="font-size: 11px;">
            <div><b>VENDA:</b> #${sale.code}</div>
            <div><b>DATA:</b> ${dateStr}</div>
            <div><b>CLIENTE:</b> ${sale.clientName}</div>
            ${sale.clientCpf ? `<div><b>CPF/CNPJ:</b> ${sale.clientCpf}</div>` : ''}
          </div>
          <div class="divider"></div>
          <table class="items-table">
            <thead>
              <tr>
                <th>ITEM</th>
                <th class="qty">QTD</th>
                <th class="price">TOTAL</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div class="divider"></div>
          <div class="flex"><span>SUBTOTAL</span><span>${currency(subtotalValue)}</span></div>
          <div class="flex"><span>DESCONTOS</span><span>${currency(discountValue)}</span></div>
          <div class="flex bold total-row" style="margin-top: 8px;"><span>TOTAL A PAGAR</span><span>${currency(sale.total)}</span></div>
          <div class="divider"></div>
          <div style="font-size: 11px;">
            <div class="bold" style="margin-bottom: 4px;">FORMA DE PAGAMENTO</div>
            ${paymentDetailsHtml}
          </div>
          <div class="divider"></div>
          <div class="footer">
            <div class="center bold">*** NÃO É DOCUMENTO FISCAL ***</div>
            <div class="center" style="margin-top: 5px;">Controle Interno</div>
            <br/>
            <div class="center">Obrigado pela preferência!</div>
          </div>
        </body>
      </html>
    `;

    // Open a new window for printing to bypass iframe sandbox restrictions
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        
        // Wait for content to load then print
        setTimeout(() => {
            printWindow.print();
            onClose(); // Close modal after printing triggers
        }, 500);
    } else {
        alert("O bloqueador de pop-ups impediu a impressão. Por favor, permita pop-ups para este site.");
    }
  };

  const handleCopyImage = async () => {
    if (!receiptRef.current) return;
    setLoadingAction('copy');
    
    try {
        const canvas = await html2canvas(receiptRef.current, {
            scale: 2, 
            backgroundColor: '#ffffff',
            logging: false,
            useCORS: true
        });
        
        canvas.toBlob(async (blob) => {
            if (blob) {
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    setLoadingAction('copied');
                    
                    // Close after a brief delay to show success
                    setTimeout(() => {
                        setLoadingAction(null);
                        onClose();
                    }, 1500);
                } catch (err) {
                    console.error('Clipboard write failed', err);
                    alert('Erro ao copiar imagem. Seu navegador pode não suportar esta ação.');
                    setLoadingAction(null);
                }
            }
        });
    } catch (err) {
        console.error('Capture failed', err);
        setLoadingAction(null);
    }
  };

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    setLoadingAction('pdf');

    try {
        const canvas = await html2canvas(receiptRef.current, {
            scale: 2,
            backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const pdfWidth = 80; // mm
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: [pdfWidth, pdfHeight + 5]
        });

        doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        doc.save(`cupom_${sale.code}.pdf`);
        setLoadingAction(null);
        onClose(); // Close immediately after download starts
    } catch (err) {
        console.error('PDF generation failed', err);
        alert('Erro ao gerar PDF');
        setLoadingAction(null);
    }
  };

  const handleEmail = () => {
    const subject = `Comprovante Pedido #${sale.code}`;
    const body = `Olá ${sale.clientName},\n\nSegue resumo do seu pedido:\n\nTotal: ${sale.total.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}\nData: ${dateStr}\n\nObrigado pela preferência!`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    onClose(); // Close after opening email client
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-40 z-[80] transition-opacity backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Hidden Receipt Element for Capture (Image/PDF) */}
      <div style={{ position: 'fixed', top: -20000, left: -20000, visibility: 'visible', pointerEvents: 'none' }}>
        <div 
            ref={receiptRef} 
            className="bg-white p-4 text-black font-mono text-xs w-[320px]"
            style={{ 
                fontFamily: "'Courier New', Courier, monospace",
                lineHeight: '1.2',
                border: '1px solid #eee'
            }}
        >
             <div className="text-center mb-2">
                <h3 className="text-sm font-bold uppercase">Espaço Digital</h3>
                <p>Espaço Digital e Informática</p>
                <p>CNPJ: 11.353.879/0001-71</p>
             </div>
             <div className="border-b border-dashed border-black my-2"></div>
             <div>
                <p><b>VENDA:</b> #${sale.code}</p>
                <p><b>DATA:</b> {dateStr}</p>
                <p><b>CLIENTE:</b> {sale.clientName}</p>
                {sale.clientCpf && <p><b>CPF/CNPJ:</b> {sale.clientCpf}</p>}
             </div>
             <div className="border-b border-dashed border-black my-2"></div>
             <table className="w-full text-left">
                <thead>
                    <tr>
                        <th className="pb-1">ITEM</th>
                        <th className="text-center pb-1">QTD</th>
                        <th className="text-right pb-1">TOT</th>
                    </tr>
                </thead>
                <tbody>
                    {sale.items.map((item, i) => (
                        <React.Fragment key={i}>
                            <tr><td colSpan={3} className="pt-1 font-bold">{item.name}</td></tr>
                            <tr>
                                <td>{currency(item.price)}</td>
                                <td className="text-center">x{item.quantity}</td>
                                <td className="text-right">{currency(item.price * item.quantity)}</td>
                            </tr>
                        </React.Fragment>
                    ))}
                </tbody>
             </table>
             <div className="border-b border-dashed border-black my-2"></div>
             <div className="flex justify-between">
                 <span>SUBTOTAL</span>
                 <span>{currency(subtotalValue)}</span>
             </div>
             <div className="flex justify-between">
                 <span>DESCONTOS</span>
                 <span>{currency(discountValue)}</span>
             </div>
             <div className="flex justify-between font-bold text-sm mt-1">
                 <span>TOTAL</span>
                 <span>{currency(sale.total)}</span>
             </div>
             <div className="border-b border-dashed border-black my-2"></div>
             <div className="mb-1 font-bold">PAGAMENTO</div>
             {sale.payments && sale.payments.length > 0 ? (
                 sale.payments.map((p, i) => (
                    <div key={i} className="flex justify-between">
                        <span>{paymentMethodLabels[p.method].toUpperCase()}</span>
                        <span>{currency(p.amount)}</span>
                    </div>
                 ))
             ) : (
                <div className="flex justify-between">
                    <span>{paymentMethodLabels[sale.paymentMethod].toUpperCase()}</span>
                    <span>{currency(sale.total)}</span>
                </div>
             )}
             {sale.change && sale.change > 0 && (
                 <div className="flex justify-between mt-1">
                     <span>TROCO</span>
                     <span>{currency(sale.change)}</span>
                 </div>
             )}
             <div className="border-b border-dashed border-black my-2"></div>
             <div className="text-center mt-4 mb-2">
                 <p className="font-bold">*** NÃO É DOCUMENTO FISCAL ***</p>
                 <p className="mt-1">Controle Interno</p>
                 <br />
                 <p>Obrigado pela preferência!</p>
             </div>
        </div>
      </div>

      {/* Panel */}
      <div 
        className={`fixed inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl z-[90] transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50">
          <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  Venda #{sale.code}
              </h2>
              <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded border inline-flex items-center gap-1 mt-1 ${
                  sale.status === 'completed' 
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                    : 'bg-red-100 text-red-700 border-red-200'
              }`}>
                  {sale.status === 'completed' ? <CheckCircle size={10} /> : <Ban size={10} />}
                  {sale.status === 'completed' ? 'Concluída' : 'Cancelada'}
              </span>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors bg-white p-2 rounded-full shadow-sm hover:shadow"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* General Info Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Calendar size={16} className="text-[#2dd4bf]" />
                  <span className="font-medium">{formatDate(sale.date)}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                  <User size={16} className="text-[#2dd4bf]" />
                  <div>
                      <span className="block text-xs text-gray-400">Cliente</span>
                      <span className="font-medium text-gray-800 uppercase">{sale.clientName}</span>
                  </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                  <ShoppingBag size={16} className="text-[#2dd4bf]" />
                  <div>
                      <span className="block text-xs text-gray-400">Vendedor</span>
                      <span className="font-medium text-gray-800">{sale.sellerName}</span>
                  </div>
              </div>
          </div>

          {/* Observations Card */}
          {sale.notes && (
             <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                 <h3 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
                     <MessageSquare size={12} /> Observações
                 </h3>
                 <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded border border-gray-100">
                     {sale.notes}
                 </p>
             </div>
          )}

          {/* Items List */}
          <div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FileText size={16} /> Itens do Pedido
              </h3>
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-500 font-medium text-xs uppercase border-b border-gray-200">
                          <tr>
                              <th className="px-4 py-3">Item</th>
                              <th className="px-4 py-3 text-right">Qtd</th>
                              <th className="px-4 py-3 text-right">Total</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {sale.items.map((item, idx) => (
                              <tr key={idx} className="hover:bg-gray-50/50">
                                  <td className="px-4 py-3">
                                      <div className="font-medium text-gray-800">{item.name}</div>
                                      <div className="text-xs text-gray-400">Unit: {item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                                  </td>
                                  <td className="px-4 py-3 text-right text-gray-600">{item.quantity}</td>
                                  <td className="px-4 py-3 text-right font-medium text-gray-800">
                                      {(item.price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
                  <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-500 uppercase">Total Itens</span>
                      <span className="font-bold text-gray-800">{sale.items.length}</span>
                  </div>
              </div>
          </div>

          {/* Payment & Totals */}
          <div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <CreditCard size={16} /> Pagamento
              </h3>
              <div className="bg-slate-800 text-white rounded-lg p-5 shadow-lg">
                  <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-4">
                      <div className="flex flex-col">
                          <span className="text-slate-400 text-xs uppercase font-bold">Forma de Pagamento Principal</span>
                          <span className="text-lg font-medium">{paymentMethodLabels[sale.paymentMethod]}</span>
                      </div>
                      <div className="bg-slate-700 p-2 rounded-full">
                          <CreditCard size={20} className="text-[#2dd4bf]" />
                      </div>
                  </div>

                  {/* Multiple Payments Detail */}
                  {sale.payments && sale.payments.length > 0 && (
                      <div className="mb-4 pb-4 border-b border-slate-700 space-y-1">
                          <span className="text-slate-400 text-xs uppercase font-bold mb-2 block">Detalhamento</span>
                          {sale.payments.map((p, idx) => (
                              <div key={idx} className="flex justify-between text-sm">
                                  <span className="text-slate-300">{paymentMethodLabels[p.method]}</span>
                                  <span className="text-slate-200">{p.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                              </div>
                          ))}
                          {sale.change && sale.change > 0 && (
                              <div className="flex justify-between text-sm pt-2">
                                  <span className="text-emerald-400 font-bold">Troco</span>
                                  <span className="text-emerald-400 font-bold">{sale.change.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                              </div>
                          )}
                      </div>
                  )}

                  <div className="space-y-2">
                      <div className="flex justify-between text-slate-400 text-sm">
                          <span>Subtotal</span>
                          <span className="font-bold text-slate-200">{subtotalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                      <div className="flex justify-between text-red-400 text-sm">
                          <span>Descontos</span>
                          <span>{discountValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                      <div className="flex justify-between items-end pt-2 mt-2 border-t border-slate-700">
                          <span className="font-bold text-lg">Total Pago</span>
                          <span className="font-bold text-2xl text-[#2dd4bf]">
                              {sale.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                      </div>
                  </div>
              </div>
          </div>
        </div>

        {/* Footer Actions (Dark Footer with 4 buttons) */}
        <div className="bg-slate-700 p-4 border-t border-slate-600 sticky bottom-0 z-10">
           <div className="grid grid-cols-4 gap-2">
               
               <button 
                onClick={handleCopyImage}
                disabled={!!loadingAction}
                className="flex flex-col items-center justify-center gap-1.5 text-slate-300 hover:text-white hover:bg-slate-600 rounded-lg p-2 transition-colors group relative"
               >
                   {loadingAction === 'copy' ? (
                       <Loader2 size={20} className="animate-spin text-white" />
                   ) : loadingAction === 'copied' ? (
                       <Check size={20} className="text-emerald-400" />
                   ) : (
                       <Copy size={20} className="group-hover:scale-110 transition-transform"/>
                   )}
                   <span className="text-[10px] font-medium text-center leading-tight">
                       {loadingAction === 'copied' ? 'Copiado!' : 'Copiar imagem'}
                   </span>
               </button>

               <button 
                onClick={handleDownloadPDF}
                disabled={!!loadingAction}
                className="flex flex-col items-center justify-center gap-1.5 text-slate-300 hover:text-white hover:bg-slate-600 rounded-lg p-2 transition-colors group"
               >
                   {loadingAction === 'pdf' ? (
                        <Loader2 size={20} className="animate-spin text-white" />
                   ) : (
                        <FileText size={20} className="group-hover:scale-110 transition-transform"/>
                   )}
                   <span className="text-[10px] font-medium text-center leading-tight">Baixar PDF</span>
               </button>

               <button 
                onClick={handleEmail}
                className="flex flex-col items-center justify-center gap-1.5 text-slate-300 hover:text-white hover:bg-slate-600 rounded-lg p-2 transition-colors group"
               >
                   <Send size={20} className="group-hover:scale-110 transition-transform"/>
                   <span className="text-[10px] font-medium text-center leading-tight">Enviar por E-mail</span>
               </button>

               <button 
                onClick={handlePrint}
                className="flex flex-col items-center justify-center gap-1.5 text-slate-300 hover:text-white hover:bg-slate-600 rounded-lg p-2 transition-colors group"
               >
                   <Printer size={20} className="group-hover:scale-110 transition-transform"/>
                   <span className="text-[10px] font-medium text-center leading-tight">Imprimir</span>
               </button>

           </div>
        </div>
      </div>
    </>
  );
};

export default SaleDetailPanel;
