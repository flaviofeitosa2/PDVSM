
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (discountValue: number) => void;
  subtotal: number;
  initialDiscount?: number;
}

const DiscountModal: React.FC<DiscountModalProps> = ({ 
  isOpen, 
  onClose, 
  onApply, 
  subtotal,
  initialDiscount = 0
}) => {
  const [discountValue, setDiscountValue] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<string>('');

  // Initialize values when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialDiscount > 0) {
        setDiscountValue(initialDiscount.toFixed(2));
        const percent = (initialDiscount / subtotal) * 100;
        setDiscountPercent(percent.toFixed(2));
      } else {
        setDiscountValue('');
        setDiscountPercent('');
      }
    }
  }, [isOpen, initialDiscount, subtotal]);

  const handleValueChange = (val: string) => {
    setDiscountValue(val);
    const numVal = parseFloat(val.replace(',', '.')) || 0;
    if (subtotal > 0) {
      const percent = (numVal / subtotal) * 100;
      setDiscountPercent(numVal === 0 ? '' : percent.toFixed(2));
    }
  };

  const handlePercentChange = (val: string) => {
    setDiscountPercent(val);
    const numPercent = parseFloat(val.replace(',', '.')) || 0;
    const value = subtotal * (numPercent / 100);
    setDiscountValue(numPercent === 0 ? '' : value.toFixed(2));
  };

  const handleApply = () => {
    const finalDiscount = parseFloat(discountValue.replace(',', '.')) || 0;
    // Ensure discount doesn't exceed subtotal
    if (finalDiscount > subtotal) {
        alert("O desconto não pode ser maior que o subtotal.");
        return;
    }
    onApply(finalDiscount);
    onClose();
  };

  if (!isOpen) return null;

  const currentDiscount = parseFloat(discountValue.replace(',', '.')) || 0;
  const finalTotal = Math.max(0, subtotal - currentDiscount);

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-[70] transition-opacity"
        onClick={onClose}
      />
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-[80] w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800">
                Desconto sobre: {subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
            </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Desconto em valor</label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                    <input 
                        type="number"
                        step="0.01"
                        className="w-full border border-gray-300 rounded-lg py-2.5 pl-9 pr-3 outline-none focus:border-[#2dd4bf] focus:ring-1 focus:ring-[#2dd4bf]"
                        placeholder="0,00"
                        value={discountValue}
                        onChange={(e) => handleValueChange(e.target.value)}
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Desconto percentual</label>
                <div className="relative">
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                    <input 
                        type="number"
                        step="0.01"
                        className="w-full border border-gray-300 rounded-lg py-2.5 pl-3 pr-8 outline-none focus:border-[#2dd4bf] focus:ring-1 focus:ring-[#2dd4bf]"
                        placeholder="0,00"
                        value={discountPercent}
                        onChange={(e) => handlePercentChange(e.target.value)}
                    />
                </div>
            </div>
        </div>

        <div className="flex items-center justify-end gap-2 mb-8">
            <span className="text-lg text-gray-600">Total final:</span>
            <span className="text-2xl font-bold text-gray-800">
                {finalTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
        </div>

        <div className="flex justify-end gap-3">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-[#2dd4bf] font-bold hover:bg-teal-50 rounded transition-colors"
            >
                Cancelar
            </button>
            <button 
                onClick={handleApply}
                className="px-6 py-2 bg-[#2dd4bf] hover:bg-[#14b8a6] text-white font-bold rounded shadow-lg shadow-teal-500/20 transition-all"
            >
                Aplicar desconto
            </button>
        </div>

      </div>
    </>
  );
};

export default DiscountModal;
