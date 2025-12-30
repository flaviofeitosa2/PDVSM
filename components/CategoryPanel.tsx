
import React, { useState } from 'react';
import { X, Search, Plus, Edit2, Trash2, Check, Loader2, AlertTriangle } from 'lucide-react';
import { Category } from '../types';

interface CategoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onAddCategory: (name: string) => Promise<void>;
  onEditCategory: (id: string, name: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

const CategoryPanel: React.FC<CategoryPanelProps> = ({
  isOpen,
  onClose,
  categories,
  onAddCategory,
  onEditCategory,
  onDeleteCategory
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [loading, setLoading] = useState(false);
  
  // States para o Modal de Exclusão
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredCategories = categories.filter(
    (cat) =>
      cat.id !== 'all' && 
      cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveEdit = async (id: string) => {
    if (!editValue.trim() || loading) return;
    setLoading(true);
    try {
        await onEditCategory(id, editValue);
        setEditingId(null);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newValue.trim() || loading) return;
    setLoading(true);
    try {
        await onAddCategory(newValue.trim());
        setNewValue('');
        setIsAdding(false);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  // Abre o modal em vez de deletar direto
  const handleDeleteClick = (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation(); // Garante que o clique pare aqui
    
    if (loading) return;
    setCategoryToDelete({ id, name });
  };

  // Executa a exclusão após confirmação no modal
  const handleConfirmDelete = async () => {
      if (!categoryToDelete) return;
      setIsDeleting(true);
      try {
          await onDeleteCategory(categoryToDelete.id);
          setCategoryToDelete(null);
      } catch (error) {
          console.error("Erro ao excluir:", error);
          alert("Não foi possível excluir a categoria. Verifique se existem produtos vinculados.");
      } finally {
          setIsDeleting(false);
      }
  };

  const handleKeyDownEdit = (e: React.KeyboardEvent, id: string) => {
      if (e.key === 'Enter') handleSaveEdit(id);
      if (e.key === 'Escape') setEditingId(null);
  };

  return (
    <>
      {/* Overlay Principal do Painel */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-[100] transition-opacity backdrop-blur-[1px]"
          onClick={onClose}
        />
      )}

      {/* --- MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (Z-INDEX 150 > Painel 110) --- */}
      {categoryToDelete && (
          <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
                  <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500">
                          <AlertTriangle size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Excluir Categoria?</h3>
                      <p className="text-gray-500 text-sm mb-6">
                          Você vai excluir <span className="font-bold text-gray-800">"{categoryToDelete.name}"</span>. 
                          <br/><span className="text-xs mt-1 block">Produtos nesta categoria podem ficar sem classificação.</span>
                      </p>
                      
                      <div className="flex gap-3 w-full">
                          <button 
                              onClick={() => setCategoryToDelete(null)}
                              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                              disabled={isDeleting}
                          >
                              Cancelar
                          </button>
                          <button 
                              onClick={handleConfirmDelete}
                              className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                              disabled={isDeleting}
                          >
                              {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                              Excluir
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Side Panel */}
      <div
        className={`fixed inset-y-0 right-0 w-[380px] bg-white shadow-2xl z-[110] transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
          <h2 className="text-xl font-bold text-slate-800">Categorias</h2>
          <div className="flex items-center gap-3">
            {!isAdding ? (
                <button
                    onClick={() => setIsAdding(true)}
                    className="p-1 text-teal-500 hover:text-teal-600 hover:scale-110 transition-all"
                    disabled={loading}
                    title="Adicionar categoria"
                    type="button"
                >
                    <Plus size={28} strokeWidth={2.5} />
                </button>
            ) : (
                <button
                    onClick={() => setIsAdding(false)}
                    className="p-1 text-rose-400 hover:text-rose-600 transition-colors"
                    disabled={loading}
                    type="button"
                >
                    <X size={24} />
                </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
              type="button"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Search & Add Area */}
        <div className="px-6 py-6 space-y-4">
          {!isAdding && (
            <div className="relative">
                <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                size={20}
                />
                <input
                type="text"
                placeholder="Buscar categorias..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-teal-400/50 focus:ring-4 focus:ring-teal-50/50 transition-all text-slate-600 font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={loading}
                />
            </div>
          )}

          {/* Add Category Input */}
          {isAdding && (
            <div className="flex items-center gap-2 p-3 bg-teal-50 rounded-2xl animate-in slide-in-from-top-2 border border-teal-100">
                <input
                    autoFocus
                    type="text"
                    placeholder="Digite o nome..."
                    className="flex-1 bg-transparent border-none outline-none text-[#2dd4bf] font-bold placeholder:text-[#2dd4bf]/40 px-2 py-1"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    disabled={loading}
                />
                <button 
                    onClick={handleAdd} 
                    className="bg-[#2dd4bf] text-white p-2 rounded-xl hover:bg-[#14b8a6] transition-all shadow-sm shadow-teal-200 disabled:opacity-50" 
                    disabled={loading || !newValue.trim()}
                    type="button"
                >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} strokeWidth={3} />}
                </button>
            </div>
          )}
        </div>

        {/* Category List */}
        <div className="flex-1 overflow-y-auto px-2">
          <div className="divide-y divide-slate-50">
            {filteredCategories.length === 0 ? (
                <div className="p-10 text-center text-slate-400 italic">
                    {searchQuery ? 'Nenhuma categoria encontrada.' : 'Crie sua primeira categoria no botão + acima.'}
                </div>
            ) : (
                filteredCategories.map((cat) => (
                <div key={cat.id} className="px-6 py-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                    {editingId === cat.id ? (
                    <div className="flex-1 flex items-center gap-2 animate-in fade-in duration-200">
                        <input
                        autoFocus
                        type="text"
                        className="flex-1 border-b-2 border-teal-400 outline-none py-1 font-bold text-slate-700 bg-transparent"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => handleKeyDownEdit(e, cat.id)}
                        disabled={loading}
                        />
                        <button onClick={() => handleSaveEdit(cat.id)} className="text-teal-600 p-2 hover:bg-teal-50 rounded-lg disabled:opacity-50 transition-colors" disabled={loading} title="Salvar" type="button">
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} strokeWidth={3} />}
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-slate-400 p-2 hover:bg-slate-100 rounded-lg transition-colors" disabled={loading} title="Cancelar" type="button">
                            <X size={18} />
                        </button>
                    </div>
                    ) : (
                    <>
                        {/* Área clicável APENAS no texto para editar */}
                        <div 
                            className="flex-1 cursor-pointer py-1"
                            onClick={() => { setEditingId(cat.id); setEditValue(cat.name); }}
                            title="Clique para editar"
                        >
                            <span className="text-base font-bold text-slate-700 uppercase tracking-tight hover:text-teal-600 transition-colors">
                                {cat.name}
                            </span>
                        </div>

                        {/* Área de Ações isolada */}
                        <div className="flex items-center gap-1 ml-4">
                            <button
                                type="button"
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setEditingId(cat.id); 
                                    setEditValue(cat.name); 
                                }}
                                className="p-2 text-slate-400 hover:text-teal-500 hover:bg-teal-50 rounded-lg transition-colors"
                                disabled={loading}
                                title="Editar"
                            >
                                <Edit2 size={18} />
                            </button>
                            <button
                                type="button"
                                onClick={(e) => handleDeleteClick(e, cat.id, cat.name)}
                                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                disabled={loading}
                                title="Excluir"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </>
                    )}
                </div>
                ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-50 bg-slate-50/30">
          <button
            onClick={onClose}
            className="w-full py-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            disabled={loading}
            type="button"
          >
            Fechar
          </button>
        </div>
      </div>
    </>
  );
};

export default CategoryPanel;
