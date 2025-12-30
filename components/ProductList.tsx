
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  ScanLine, 
  Zap, 
  List as ListIcon, 
  LayoutGrid,
  Star,
  ChevronRight,
  Plus,
  X
} from 'lucide-react';
import { Product, CartItem, Category } from '../types';

interface ProductListProps {
  products: Product[];
  categories: Category[];
  addToCart: (product: Product) => void;
  cartItems: CartItem[];
  toggleSidebar: () => void;
  onOpenCart?: () => void;
  editingOrderId?: string | null;
  onCancelEdit?: () => void;
  onToggleFavorite?: (product: Product) => void;
}

const ProductList: React.FC<ProductListProps> = ({
  products,
  addToCart,
  cartItems,
  toggleSidebar,
  onOpenCart
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'tudo' | 'destaques' | 'produto' | 'serviço'>('tudo');
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [animateCart, setAnimateCart] = useState(false);
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
      const saved = localStorage.getItem('posViewMode');
      return (saved === 'grid' || saved === 'list') ? saved : 'grid';
  });

  const handleSetViewMode = (mode: 'grid' | 'list') => {
      setViewMode(mode);
      localStorage.setItem('posViewMode', mode);
  };

  const getQtyInCart = (productId: string) => {
    const item = cartItems.find(i => i.id === productId);
    return item ? item.quantity : 0;
  };

  const currentTotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const currentCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    if (currentCount > 0) {
      setAnimateCart(true);
      const timer = setTimeout(() => setAnimateCart(false), 300);
      return () => clearTimeout(timer);
    }
  }, [currentCount]);

  const handleAddToCart = (product: Product) => {
    setLastAddedId(product.id);
    addToCart(product);
    setTimeout(() => setLastAddedId(null), 500);
  };

  const filteredProducts = useMemo(() => {
      // 1. Primeiro filtramos os produtos
      const filtered = products.filter(p => {
          const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                (p.code && p.code.includes(searchQuery));
          
          if (!matchesSearch) return false;

          if (activeFilter === 'destaques') return p.is_favorite;
          if (activeFilter === 'produto') return p.manage_stock === true;
          if (activeFilter === 'serviço') return p.manage_stock === false;
          
          return true;
      });

      // 2. Ordenamos para que os favoritos (is_favorite) fiquem sempre no topo
      // e secundariamente ordenamos por nome
      return filtered.sort((a, b) => {
          if (a.is_favorite && !b.is_favorite) return -1;
          if (!a.is_favorite && b.is_favorite) return 1;
          return a.name.localeCompare(b.name);
      });
  }, [products, searchQuery, activeFilter]);

  const getAbbreviation = (name: string) => {
      return name.substring(0, 6).toUpperCase();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F3F4F6] relative font-sans">
      
      <style>{`
        @keyframes cart-bump {
          0% { transform: scale(1); }
          50% { transform: scale(1.04) translateY(-4px); }
          100% { transform: scale(1); }
        }
        .animate-cart-bump {
          animation: cart-bump 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes float-up {
          0% { opacity: 0; transform: translateY(0); }
          20% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-40px); }
        }
        .animate-float-up {
          animation: float-up 0.6s ease-out forwards;
        }
        .product-card-active {
            box-shadow: 0 0 0 3px rgba(46, 188, 125, 0.2);
            border-color: #2ebc7d !important;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="bg-white px-4 pt-4 pb-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
              <button onClick={toggleSidebar} className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg transition-colors">
                  <ListIcon size={26} />
              </button>
              <h2 className="text-xl font-bold text-gray-700">Vender</h2>
          </div>
          {/* Botão removido conforme solicitado */}
      </div>

      <div className="bg-white px-4 py-2 flex items-center justify-between gap-4 shrink-0 border-b border-gray-50">
          <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2ebc7d] transition-colors" size={20} />
              <input 
                  type="text"
                  placeholder="Pesquisar produto ou código..."
                  className="w-full bg-gray-50 border border-transparent focus:border-[#2ebc7d]/30 focus:ring-4 focus:ring-[#2ebc7d]/5 rounded-xl pl-10 pr-10 py-2.5 text-sm font-medium outline-none transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={18} />
                  </button>
              )}
          </div>
          
          <div className="flex items-center gap-4 sm:gap-6 shrink-0">
              <button className="p-2 text-gray-400 hover:text-gray-600"><ScanLine size={24} /></button>
              <button className="p-2 text-gray-400 hover:text-gray-600"><Zap size={24} /></button>
              
              <div className="flex gap-4">
                <button 
                    onClick={() => handleSetViewMode('list')} 
                    className={`p-1 transition-all ${viewMode === 'list' ? 'text-gray-800 scale-110' : 'text-gray-300 hover:text-gray-400'}`}
                >
                    <ListIcon size={26} />
                </button>
                <button 
                    onClick={() => handleSetViewMode('grid')} 
                    className={`p-1 transition-all ${viewMode === 'grid' ? 'text-gray-800 scale-110' : 'text-gray-300 hover:text-gray-400'}`}
                >
                    <LayoutGrid size={26} />
                </button>
              </div>

              <div className="px-2 py-1 border border-gray-200 rounded text-xs font-bold text-gray-500">1 X</div>
          </div>
      </div>

      <div className="bg-white flex px-4 overflow-x-auto no-scrollbar border-b border-gray-100 shrink-0">
          {[
              { id: 'tudo', label: 'TUDO' },
              { id: 'destaques', label: 'DESTAQUES' },
              { id: 'produto', label: 'PRODUTO' },
              { id: 'serviço', label: 'SERVIÇO' }
          ].map(tab => (
              <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id as any)}
                  className={`py-4 px-4 text-xs font-black tracking-widest uppercase transition-all border-b-2 whitespace-nowrap
                    ${activeFilter === tab.id ? 'text-[#2ebc7d] border-[#2ebc7d]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
              >
                  {tab.label}
              </button>
          ))}
      </div>

      <div className="flex-1 overflow-y-auto p-2 pb-28">
          {viewMode === 'grid' ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                  {filteredProducts.map((product) => {
                      const qty = getQtyInCart(product.id);
                      const isOutOfStock = product.manage_stock && (product.stock || 0) <= 0;
                      const isRecentlyAdded = lastAddedId === product.id;
                      
                      return (
                          <div 
                            key={product.id} 
                            onClick={() => !isOutOfStock && handleAddToCart(product)}
                            className={`bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 flex flex-col relative transition-all duration-200 
                                ${isOutOfStock ? 'opacity-60 grayscale cursor-not-allowed' : 'active:scale-95 cursor-pointer'}
                                ${isRecentlyAdded ? 'product-card-active' : ''}`}
                          >
                              {isRecentlyAdded && (
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                                      <span className="text-[#2ebc7d] font-black text-xl animate-float-up">+1</span>
                                  </div>
                              )}

                              <div className="bg-[#4a5568] px-2 py-1 flex justify-between items-center">
                                  <span className="text-[9px] font-black text-gray-300 tracking-wider">
                                      {getAbbreviation(product.name)}
                                  </span>
                                  <div className="flex gap-1">
                                    {product.is_favorite && <Star size={10} className="text-amber-400 fill-current" />}
                                    {isOutOfStock && <div className="w-2 h-2 bg-rose-500 rounded-full border border-white"></div>}
                                  </div>
                              </div>

                              {qty > 0 && (
                                  <div className={`absolute top-6 right-1 bg-[#2ebc7d] text-white text-[11px] font-black px-2 py-0.5 rounded shadow-md z-10 transition-transform border border-white/20 ${isRecentlyAdded ? 'scale-125' : ''}`}>
                                      {qty}
                                  </div>
                              )}

                              <div className="aspect-square bg-white flex items-center justify-center p-2">
                                  <img 
                                    src={product.image} 
                                    alt="" 
                                    className="w-full h-full object-contain mix-blend-multiply" 
                                  />
                              </div>

                              <div className="bg-[#4a5568] p-1.5 mt-auto transition-colors">
                                  <h3 className="text-[8px] font-bold text-white uppercase truncate">
                                      {product.name}
                                  </h3>
                                  <p className="text-[10px] font-bold text-white">
                                      {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </p>
                              </div>
                          </div>
                      );
                  })}
              </div>
          ) : (
              <div className="divide-y divide-gray-100 px-2">
                  {filteredProducts.map((product) => {
                      const qty = getQtyInCart(product.id);
                      const isOutOfStock = product.manage_stock && (product.stock || 0) <= 0;
                      const isRecentlyAdded = lastAddedId === product.id;
                      
                      return (
                          <div 
                            key={product.id} 
                            onClick={() => !isOutOfStock && handleAddToCart(product)}
                            className={`flex items-center gap-4 py-3 transition-all relative ${isOutOfStock ? 'opacity-50 grayscale' : 'active:bg-gray-50 cursor-pointer'} ${isRecentlyAdded ? 'bg-emerald-50/50' : ''}`}
                          >
                              {isRecentlyAdded && (
                                  <div className="absolute right-20 flex items-center pointer-events-none">
                                      <span className="text-[#2ebc7d] font-black animate-float-up">+1</span>
                                  </div>
                              )}

                              <div className="relative shrink-0">
                                  <div className={`w-12 h-12 rounded-xl border border-gray-100 overflow-hidden flex flex-col transition-colors ${isRecentlyAdded ? 'border-[#2ebc7d]' : 'bg-[#2d3748]'}`}>
                                      <div className="bg-[#4a5568] px-1 py-0.5 text-center">
                                          <span className="text-[8px] font-black text-gray-300 uppercase tracking-tighter">
                                              {getAbbreviation(product.name)}
                                          </span>
                                      </div>
                                      <div className="flex-1 flex items-center justify-center p-1 bg-white">
                                          <img src={product.image} alt="" className="w-full h-full object-contain" />
                                      </div>
                                  </div>
                                  {isOutOfStock && (
                                      <div className="absolute -top-1 -left-1 w-3 h-3 bg-rose-500 border-2 border-white rounded-full"></div>
                                  )}
                                  {qty > 0 && (
                                      <div className="absolute -bottom-1.5 -right-1.5 bg-[#2ebc7d] text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-white shadow-md z-10">
                                          {qty}
                                      </div>
                                  )}
                              </div>

                              <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                      {product.is_favorite && <Star size={12} className="text-amber-400 fill-current" />}
                                      <h3 className={`text-sm font-bold truncate uppercase tracking-tight transition-colors ${isRecentlyAdded ? 'text-[#2ebc7d]' : 'text-gray-800'}`}>
                                          {product.name}
                                      </h3>
                                  </div>
                                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Cód. {product.code || '---'}</p>
                              </div>

                              <div className="text-right shrink-0">
                                  <span className={`text-sm font-bold transition-colors ${isRecentlyAdded ? 'text-[#2ebc7d]' : 'text-gray-600'}`}>
                                      {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </span>
                                  {isOutOfStock && (
                                      <p className="text-[9px] font-black text-rose-500 uppercase tracking-tight mt-0.5">Sem estoque</p>
                                  )}
                              </div>
                          </div>
                      );
                  })}
              </div>
          )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 z-40 lg:hidden">
          <button 
              onClick={onOpenCart}
              className={`w-full py-4 px-6 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] 
                ${animateCart ? 'animate-cart-bump' : ''}
                ${currentCount > 0 
                      ? 'bg-[#2ebc7d] text-white shadow-[#2ebc7d]/30' 
                      : 'bg-white border-2 border-[#2ebc7d] text-[#2ebc7d]'
                }`}
          >
              {currentCount > 0 ? (
                  <>
                      <span className="tabular-nums">{currentCount} {currentCount === 1 ? 'item' : 'itens'}</span>
                      <span className="mx-1 opacity-50">=</span>
                      <span className="tabular-nums">{currentTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      <ChevronRight size={20} className="ml-1" strokeWidth={3} />
                  </>
              ) : (
                  <span>Nenhum item selecionado</span>
              )}
          </button>
      </div>
    </div>
  );
};

export default ProductList;
