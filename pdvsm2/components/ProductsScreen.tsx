
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Star, 
  Trash2, 
  Loader2,
  Menu,
  Upload,
  Package,
  AlertTriangle,
  SlidersHorizontal,
  Filter,
  Layers,
  Edit3,
  ChevronRight,
  X
} from 'lucide-react';
import { Product, Category, UserRole, OperatorPermissions } from '../types';
import UserMenu from './UserMenu';
import ProductForm from './ProductForm';
import CategoryPanel from './CategoryPanel';
import ProductFilterPanel, { ProductFilters } from './ProductFilterPanel';
import ProductImportModal from './ProductImportModal';

interface ProductsScreenProps {
  products: Product[];
  categories: Category[];
  toggleSidebar: () => void;
  onAddCategory: (name: string) => void;
  onEditCategory: (id: string, name: string) => void;
  onDeleteCategory: (id: string) => Promise<void>;
  onAddProduct: (product: Product) => Promise<void>;
  onUpdateProduct: (product: Product) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  userRole?: UserRole;
  permissions?: OperatorPermissions;
}

const ProductsScreen: React.FC<ProductsScreenProps> = ({ 
    products, 
    categories, 
    toggleSidebar,
    onAddCategory,
    onEditCategory,
    onDeleteCategory,
    onAddProduct,
    onUpdateProduct,
    onDeleteProduct,
    userRole,
    permissions
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'itens' | 'estoque' | 'categorias'>('itens');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [isCategoryPanelOpen, setIsCategoryPanelOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [activeFilters, setActiveFilters] = useState<ProductFilters>({
    stockStatus: [],
    categories: [],
    sortBy: 'name_asc'
  });
  
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canManageStock = userRole !== 'operator' || permissions?.stock;

  const processedProducts = useMemo(() => {
      let filtered = products.filter(p => 
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          (p.code && p.code.includes(searchQuery))
      );

      if (activeFilters.stockStatus.length > 0) {
          filtered = filtered.filter(p => {
              if (activeFilters.stockStatus.includes('no_control') && !p.manage_stock) return true;
              if (!p.manage_stock) return false;
              if (activeFilters.stockStatus.includes('out') && (p.stock || 0) <= 0) return true;
              if (activeFilters.stockStatus.includes('min') && (p.stock || 0) > 0 && (p.stock || 0) <= (p.min_stock || 0)) return true;
              if (activeFilters.stockStatus.includes('available') && (p.stock || 0) > (p.min_stock || 0)) return true;
              return false;
          });
      }

      filtered.sort((a, b) => {
          if (a.is_favorite && !b.is_favorite) return -1;
          if (!a.is_favorite && b.is_favorite) return 1;
          return a.name.localeCompare(b.name);
      });
      
      return filtered;
  }, [products, searchQuery, activeFilters]);

  const stockStats = useMemo(() => {
    let totalValue = 0;
    let totalQuantity = 0;
    let lowStockCount = 0;

    products.forEach(p => {
      const stock = p.stock || 0;
      totalValue += (p.price * stock);
      totalQuantity += stock;
      if (p.manage_stock && stock <= (p.min_stock || 0)) lowStockCount++;
    });

    return { totalValue, totalQuantity, lowStockCount, activeCount: products.length };
  }, [products]);

  const handleRowClick = (product: Product) => {
      setEditingProduct(product); 
      setIsFormOpen(true);
  };

  const handleConfirmDelete = async () => {
      if (!productToDelete) return;
      setIsDeleting(true);
      try {
          await onDeleteProduct(productToDelete.id);
          setProductToDelete(null);
      } finally {
          setIsDeleting(false);
      }
  };

  if (isFormOpen) {
      return (
        <ProductForm 
            onBack={() => setIsFormOpen(false)} 
            onSave={async (p) => {
                  if (editingProduct) await onUpdateProduct(p as Product);
                  else await onAddProduct(p as Product);
                  setIsFormOpen(false);
            }} 
            onAddCategoryClick={() => setIsCategoryPanelOpen(true)} 
            categories={categories} 
            initialData={editingProduct} 
            canManageStock={canManageStock} 
        />
      );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50 relative font-sans">
      
      {/* Modais Compartilhados */}
      <ProductImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onImport={async (list) => { /* logic */ setIsImportModalOpen(false); }} 
        existingProducts={products} 
      />

      {productToDelete && (
          <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
                  <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500">
                          <AlertTriangle size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Excluir Produto?</h3>
                      <p className="text-gray-500 text-sm mb-6">Deseja excluir <span className="font-bold text-gray-800">"{productToDelete.name}"</span>?</p>
                      <div className="flex gap-3 w-full">
                          <button onClick={() => setProductToDelete(null)} className="flex-1 py-3 bg-gray-100 font-bold rounded-xl">Cancelar</button>
                          <button onClick={handleConfirmDelete} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                              {isDeleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />} Excluir
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- LAYOUT DESKTOP (BASEADO NA IMAGEM) --- */}
      <div className="hidden lg:flex flex-col h-full overflow-hidden">
          {/* Header Verde */}
          <div className="bg-[#2ebc7d] text-white px-10 py-8 shrink-0 shadow-lg">
              <div className="flex justify-between items-start">
                  <div>
                      <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">Produtos</h1>
                      <p className="text-[11px] font-bold text-white/70 uppercase tracking-widest mt-2">Gerencie seu catálogo</p>
                  </div>
                  <UserMenu />
              </div>
              <div className="flex items-center gap-16 mt-10">
                  <div className="flex items-center gap-5">
                      <span className="text-6xl font-black tracking-tighter leading-none">{stockStats.activeCount}</span>
                      <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/90">Produtos</span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Ativos</span>
                      </div>
                  </div>
                  <div className="w-px h-12 bg-white/20"></div>
                  <div className="flex items-center gap-5">
                      <span className={`text-6xl font-black tracking-tighter leading-none ${stockStats.lowStockCount > 0 ? 'text-white' : 'text-white/30'}`}>{stockStats.lowStockCount}</span>
                      <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/90">Estoque Baixo</span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Repor em breve</span>
                      </div>
                  </div>
              </div>
          </div>

          {/* Barra de Filtros e Busca */}
          <div className="bg-white border-b border-gray-100 px-10 py-5 flex items-center justify-between shadow-sm relative z-10">
              <div className="flex items-center gap-4 flex-1 max-w-2xl">
                  <div className="relative flex-1 group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#2ebc7d] transition-colors" size={20} />
                      <input 
                        type="text" 
                        placeholder="Buscar produtos..." 
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-[#2ebc7d]/30 transition-all font-medium text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                  </div>
                  <button onClick={() => setIsFilterPanelOpen(true)} className="p-3 border-2 border-gray-100 rounded-2xl text-gray-400 hover:bg-gray-50 hover:border-gray-200 transition-all">
                      <Filter size={20} />
                  </button>
              </div>

              <div className="flex items-center gap-4">
                  <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-widest text-gray-500 border-2 border-gray-100 rounded-2xl hover:bg-gray-50 transition-all">
                      <Upload size={16} /> Importar
                  </button>
                  <button onClick={() => setIsCategoryPanelOpen(true)} className="flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-widest text-gray-500 border-2 border-gray-100 rounded-2xl hover:bg-gray-50 transition-all">
                      <Layers size={16} /> Categorias
                  </button>
                  <button 
                    onClick={() => { setEditingProduct(undefined); setIsFormOpen(true); }}
                    className="flex items-center gap-2 px-8 py-3.5 text-xs font-black uppercase tracking-widest text-white bg-[#8ec332] rounded-2xl shadow-lg shadow-[#8ec332]/20 hover:brightness-105 active:scale-95 transition-all"
                  >
                      <Plus size={20} strokeWidth={3} /> Adicionar Novo
                  </button>
              </div>
          </div>

          {/* Tabela de Produtos */}
          <div className="flex-1 overflow-y-auto px-10 py-6">
              <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                  <table className="w-full text-left">
                      <thead>
                          <tr className="border-b border-gray-50 text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">
                              <th className="px-8 py-6">Produto</th>
                              <th className="px-8 py-6">Categoria</th>
                              <th className="px-8 py-6 text-right">Preço</th>
                              <th className="px-8 py-6 text-center">Estoque</th>
                              <th className="px-8 py-6 text-right">Ações</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                          {processedProducts.length === 0 ? (
                              <tr><td colSpan={5} className="py-20 text-center text-gray-400 font-bold uppercase text-xs">Nenhum produto cadastrado</td></tr>
                          ) : (
                              processedProducts.map(p => (
                                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                                      <td className="px-8 py-4">
                                          <div className="flex items-center gap-4">
                                              <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
                                                  <img src={p.image} className="w-full h-full object-contain mix-blend-multiply" />
                                              </div>
                                              <div className="flex flex-col">
                                                  <span className="text-sm font-black text-gray-800 uppercase tracking-tight">{p.name}</span>
                                                  <span className="text-[10px] font-bold text-gray-400 uppercase">Cód. {p.code || '---'}</span>
                                              </div>
                                          </div>
                                      </td>
                                      <td className="px-8 py-4">
                                          <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-lg text-[10px] font-black uppercase tracking-wider">{p.category}</span>
                                      </td>
                                      <td className="px-8 py-4 text-right">
                                          <span className="text-sm font-black text-gray-800">{p.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                      </td>
                                      <td className="px-8 py-4 text-center">
                                          <span className={`inline-flex items-center justify-center w-10 h-6 rounded-lg text-xs font-black ${(p.stock || 0) <= (p.min_stock || 0) ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                              {p.stock || 0}
                                          </span>
                                      </td>
                                      <td className="px-8 py-4 text-right">
                                          <div className="flex justify-end gap-1">
                                              <button onClick={() => handleRowClick(p)} className="p-2 text-gray-300 hover:text-[#2ebc7d] hover:bg-emerald-50 rounded-xl transition-all"><Edit3 size={18} /></button>
                                              <button onClick={() => setProductToDelete({ id: p.id, name: p.name })} className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                                          </div>
                                      </td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>

      {/* --- LAYOUT MOBILE (MANTIDO) --- */}
      <div className="block lg:hidden flex flex-col h-full overflow-hidden">
          <header className="bg-white border-b border-gray-100 flex flex-col shrink-0 z-30">
              <div className="px-4 py-4 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                      <button onClick={toggleSidebar} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"><Menu size={24} /></button>
                      <h2 className="text-lg font-bold text-gray-700 flex items-center gap-1">Produtos <span className="text-gray-400 font-medium">({products.length})</span></h2>
                  </div>
                  <div className="flex items-center gap-2">
                      <button onClick={() => setIsImportModalOpen(true)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"><Upload size={20} /></button>
                      <UserMenu />
                  </div>
              </div>
              <div className="flex px-4">
                  <button onClick={() => setActiveTab('itens')} className={`flex-1 py-3 text-xs font-black tracking-widest uppercase text-center transition-all border-b-2 ${activeTab === 'itens' ? 'text-[#2ebc7d] border-[#2ebc7d]' : 'text-gray-400 border-transparent'}`}>Itens</button>
                  <button onClick={() => setActiveTab('estoque')} className={`flex-1 py-3 text-xs font-black tracking-widest uppercase text-center transition-all border-b-2 ${activeTab === 'estoque' ? 'text-[#2ebc7d] border-[#2ebc7d]' : 'text-gray-400 border-transparent'}`}>Estoque</button>
                  <button onClick={() => setIsCategoryPanelOpen(true)} className={`flex-1 py-3 text-xs font-black tracking-widest uppercase text-center transition-all border-b-2 ${activeTab === 'categorias' ? 'text-[#2ebc7d] border-[#2ebc7d]' : 'text-gray-400 border-transparent'}`}>Categorias</button>
              </div>
          </header>

          <div className="bg-white px-4 py-4 flex items-center gap-3 shrink-0">
              <div className="relative flex-1 group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2ebc7d] transition-colors" size={20} />
                  <input type="text" placeholder="Item, valor ou código" className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#2ebc7d]/10 transition-all border border-transparent focus:border-[#2ebc7d]/30" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <button onClick={() => { setEditingProduct(undefined); setIsFormOpen(true); }} className="p-3 bg-[#2ebc7d] text-white rounded-xl shadow-lg shadow-[#2ebc7d]/20 active:scale-95"><Plus size={24} strokeWidth={3} /></button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-6">
              <div className="divide-y divide-gray-100">
                  {processedProducts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center"><Package size={48} className="text-gray-200 mb-2" /><p className="text-gray-400 text-sm font-medium">Nenhum produto encontrado</p></div>
                  ) : (
                      processedProducts.map((product) => (
                          <div key={product.id} onClick={() => handleRowClick(product)} className="flex items-center gap-4 py-4 group active:bg-gray-50 transition-colors">
                              <div className="relative shrink-0">
                                  <div className="w-16 h-16 rounded-xl bg-white border border-gray-100 overflow-hidden flex items-center justify-center p-1"><img src={product.image || 'https://via.placeholder.com/80'} alt="" className="w-full h-full object-contain mix-blend-multiply" /></div>
                                  {product.manage_stock && (product.stock || 0) <= (product.min_stock || 0) && <div className="absolute -top-1 -left-1 w-4 h-4 bg-rose-500 border-2 border-white rounded-full"></div>}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-0.5">{product.is_favorite && <Star size={14} className="text-amber-400 fill-current" />}<h3 className="text-sm font-bold text-gray-800 truncate uppercase tracking-tight">{product.name}</h3></div>
                                  <p className="text-xs text-gray-400 font-medium">{product.category}</p>
                              </div>
                              <div className="text-right shrink-0">
                                  <span className="text-sm font-bold text-gray-600">{product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                  {activeTab === 'estoque' && <p className="text-[10px] font-black text-gray-400 mt-1 uppercase">Qtd: {product.stock || 0}</p>}
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>
      </div>

      {/* Painéis Laterais Reutilizáveis */}
      <CategoryPanel 
        isOpen={isCategoryPanelOpen}
        onClose={() => setIsCategoryPanelOpen(false)}
        categories={categories}
        onAddCategory={onAddCategory as any}
        onEditCategory={onEditCategory as any}
        onDeleteCategory={onDeleteCategory}
      />

      <ProductFilterPanel 
        isOpen={isFilterPanelOpen}
        onClose={() => setIsFilterPanelOpen(false)}
        currentFilters={activeFilters}
        onApplyFilters={setActiveFilters}
      />
    </div>
  );
};

export default ProductsScreen;
