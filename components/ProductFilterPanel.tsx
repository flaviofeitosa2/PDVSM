
import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { Category } from '../types';

export interface ProductFilters {
  stockStatus: string[]; // 'out', 'min', 'available', 'no_control'
  categories: string[];  
  sortBy: 'stock_asc' | 'stock_desc' | 'name_asc' | 'name_desc';
}

interface ProductFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: ProductFilters) => void;
  currentFilters: ProductFilters;
}

const ProductFilterPanel: React.FC<ProductFilterPanelProps> = ({
  isOpen,
  onClose,
  onApplyFilters,
  currentFilters
}) => {
  const [stockStatus, setStockStatus] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<ProductFilters['sortBy']>('name_asc');

  useEffect(() => {
    if (isOpen) {
      setStockStatus(currentFilters.stockStatus || []);
      setSelectedCategories(currentFilters.categories || []);
      setSortBy(currentFilters.sortBy || 'name_asc');
    }
  }, [isOpen, currentFilters]);

  const toggleStock = (value: string) => {
    setStockStatus(prev => 
      prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]
    );
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(item => item !== cat) : [...prev, cat]
    );
  };

  const handleApply = () => {
    onApplyFilters({ stockStatus, categories: selectedCategories, sortBy });
    onClose();
  };

  const handleClear = () => {
      setStockStatus([]);
      setSelectedCategories([]);
      setSortBy('name_asc');
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[100] transition-opacity backdrop-blur-[2px]" onClick={onClose} />
      
      <div className={`fixed inset-y-0 right-0 w-full bg-white z-[110] transform transition-transform duration-300 flex flex-col font-sans`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="text-gray-400"><X size={28} /></button>
            <h2 className="text-xl font-bold text-gray-700">Filtros</h2>
          </div>
          <button onClick={handleClear} className="text-[#2ebc7d] font-bold text-base">Limpar</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-10 pb-32">
          
          {/* Estoque Section */}
          <section>
            <h3 className="font-bold text-gray-600 mb-5 text-base">Estoque</h3>
            <div className="space-y-6">
               {[
                 { id: 'out', label: 'Sem estoque', dot: 'bg-rose-500' },
                 { id: 'min', label: 'Mínimo', dot: 'bg-amber-500' },
                 { id: 'available', label: 'Acima do mínimo' },
                 { id: 'no_control', label: 'Sem controle de estoque' },
               ].map((item) => (
                 <label key={item.id} className="flex items-center gap-4 cursor-pointer group">
                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${stockStatus.includes(item.id) ? 'bg-[#2ebc7d] border-[#2ebc7d]' : 'border-gray-200'}`}>
                        {stockStatus.includes(item.id) && <Check size={16} className="text-white" strokeWidth={4} />}
                    </div>
                    <input type="checkbox" className="hidden" checked={stockStatus.includes(item.id)} onChange={() => toggleStock(item.id)} />
                    <span className="text-base text-gray-500 font-medium flex items-center gap-2">
                        {item.label}
                        {item.dot && <div className={`w-2 h-2 rounded-full ${item.dot}`}></div>}
                    </span>
                 </label>
               ))}
            </div>
          </section>

          {/* Categorias Section */}
          <section>
            <h3 className="font-bold text-gray-600 mb-5 text-base">Categorias</h3>
            <div className="grid grid-cols-2 gap-y-6">
              {['Produto', 'Serviço'].map((cat) => (
                <label key={cat} className="flex items-center gap-4 cursor-pointer group">
                   <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${selectedCategories.includes(cat) ? 'bg-[#2ebc7d] border-[#2ebc7d]' : 'border-gray-200'}`}>
                        {selectedCategories.includes(cat) && <Check size={16} className="text-white" strokeWidth={4} />}
                    </div>
                    <input type="checkbox" className="hidden" checked={selectedCategories.includes(cat)} onChange={() => toggleCategory(cat)} />
                    <span className="text-base text-gray-500 font-medium">{cat}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Ordenar Por Section */}
          <section>
            <h3 className="font-bold text-gray-600 mb-5 text-base">Ordenar por</h3>
            <div className="grid grid-cols-2 border border-gray-100 rounded-lg overflow-hidden">
                {[
                    { id: 'stock_asc', label: 'Menor estoque' },
                    { id: 'name_asc', label: 'A-Z' },
                    { id: 'stock_desc', label: 'Maior estoque' },
                    { id: 'name_desc', label: 'Z-A' },
                ].map((opt) => (
                    <button
                        key={opt.id}
                        onClick={() => setSortBy(opt.id as any)}
                        className={`py-5 px-4 text-sm font-bold border-r border-b border-gray-100 last:border-r-0 text-left transition-colors ${sortBy === opt.id ? 'text-[#2ebc7d]' : 'text-gray-800'}`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
          </section>
        </div>

        {/* Footer Button */}
        <div className="p-6 bg-white border-t border-gray-50 fixed bottom-0 left-0 right-0 z-20">
           <button 
             onClick={handleApply}
             className="w-full bg-[#2ebc7d] hover:brightness-105 text-white font-bold py-4 rounded-xl transition-all text-lg shadow-lg shadow-[#2ebc7d]/20 active:scale-[0.98]"
           >
             Filtrar
           </button>
        </div>
      </div>
    </>
  );
};

export default ProductFilterPanel;
