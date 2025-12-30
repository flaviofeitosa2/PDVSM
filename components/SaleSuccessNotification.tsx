
import React, { useEffect } from 'react';
import { X, FileText, Printer, Check } from 'lucide-react';
import { Sale, PaymentMethod } from '../types';

interface SaleSuccessNotificationProps {
  isVisible: boolean;
  sale: Sale | null;
  onClose: () => void;
  onViewReceipt: () => void;
}

const SaleSuccessNotification: React.FC<SaleSuccessNotificationProps> = ({ 
  isVisible, 
  sale, 
  onClose, 
  onViewReceipt 
}) => {
  
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000); 
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  const handlePrint = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!sale) return;

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
    const date = new Date(sale.date).toLocaleString('pt-BR');

    // CSS for Thermal Printer (80mm)
    const style = `
      <style>
        @page { margin: 0; size: 80mm auto; }
        body { 
          font-family: 'Courier New', Courier, monospace; 
          margin: 0; 
          padding: 5px; 
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
            <div><b>DATA:</b> ${date}</div>
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
          <div class="flex"><span>SUBTOTAL</span><span>${currency(sale.total)}</span></div>
          <div class="flex"><span>DESCONTOS</span><span>R$ 0,00</span></div>
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
            <div class="center">Volte sempre.</div>
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

        setTimeout(() => {
            printWindow.print();
        }, 500);
    } else {
        alert("O bloqueador de pop-ups impediu a impressão. Por favor, permita pop-ups para este site.");
    }
  };

  if (!isVisible || !sale) return null;

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[70] animate-in slide-in-from-bottom-10 fade-in duration-300">
      <div className="bg-[#4ade80] text-gray-800 rounded-xl shadow-2xl p-3 pr-4 flex items-center gap-4 min-w-[400px] border border-[#22c55e]/20">
        
        {/* Icon Circle */}
        <div className="relative flex-shrink-0 ml-2">
            <div className="w-10 h-10 rounded-full border-2 border-white/40 flex items-center justify-center">
                <Check size={20} className="text-white font-bold" strokeWidth={3} />
            </div>
            {/* Spinning effect ring */}
            <div className="absolute inset-0 rounded-full border-t-2 border-white animate-spin opacity-60"></div>
        </div>

        {/* Text Info */}
        <div className="flex-1 flex flex-col justify-center">
            <span className="text-xs font-semibold text-emerald-900 uppercase tracking-wide">Venda concluída!</span>
            <span className="text-xl font-extrabold text-gray-800 tracking-tight">
                {sale.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
        </div>

        <div className="flex items-center gap-2">
            {/* Print Button */}
            <button 
                onClick={handlePrint}
                className="bg-white/20 hover:bg-white/40 text-emerald-900 p-2.5 rounded-lg font-bold shadow-sm transition-colors"
                title="Imprimir Cupom"
            >
                <Printer size={20} />
            </button>

            {/* Receipt Button */}
            <button 
                onClick={onViewReceipt}
                className="bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-lg font-bold text-sm shadow-sm flex items-center gap-2 transition-colors whitespace-nowrap"
            >
                <FileText size={16} />
                Ver recibo
            </button>
        </div>

        {/* Close Button */}
        <button 
            onClick={onClose}
            className="text-emerald-900/40 hover:text-emerald-900 transition-colors -mt-8 -mr-1"
        >
            <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default SaleSuccessNotification;
