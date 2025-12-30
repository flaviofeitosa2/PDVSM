
import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileSpreadsheet, Loader2, CheckCircle, AlertCircle, ArrowRight, Download, FilePlus, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Product } from '../types';

interface ProductImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (products: any[], mode: 'create' | 'update') => Promise<void>;
  existingProducts: Product[];
}

const ProductImportModal: React.FC<ProductImportModalProps> = ({ 
  isOpen, 
  onClose, 
  onImport,
  existingProducts 
}) => {
  const [step, setStep] = useState<'selection' | 'instructions' | 'upload' | 'processing' | 'success'>('selection');
  const [mode, setMode] = useState<'create' | 'update'>('create');
  const [stats, setStats] = useState({ total: 0, processed: 0 });
  const [productsToImport, setProductsToImport] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // --- Funções de Template Excel ---

  const handleDownloadTemplate = () => {
    const headers = [
      "ID (Deixe vazio p/ novo)", 
      "Nome*", 
      "Código (SKU)", 
      "Categoria", 
      "Preço Venda*", 
      "Custo", 
      "Estoque Atual", 
      "Estoque Mínimo",
      "Descrição"
    ];

    let dataRows: any[] = [];

    if (mode === 'update') {
        dataRows = existingProducts.map(p => [
            p.id || '',
            p.name || '',
            p.code || '',
            p.category || '',
            p.price || 0,
            '', 
            p.stock || 0,
            p.minStock || 0,
            '' 
        ]);
    } else {
        dataRows = [[
            "", 
            "Produto Exemplo", 
            "COD123", 
            "Geral", 
            10.00, 
            5.00, 
            100, 
            10,
            "Descrição do produto"
        ]];
    }

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    ws['!cols'] = [{wch: 25}, {wch: 30}, {wch: 15}, {wch: 15}, {wch: 12}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 30}];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produtos");

    const fileName = mode === 'update' ? "produtos_existentes_atualizar.xlsx" : "modelo_novos_produtos.xlsx";
    XLSX.writeFile(wb, fileName);
  };

  // --- Funções de Upload ---

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          // Ler dados (Assumindo linha 1 como header)
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
          
          parseData(data);
      } catch (err) {
          alert("Erro ao ler arquivo. Verifique se é um Excel válido.");
      }
    };
    reader.readAsBinaryString(file);
  };

  // Helper robusto para limpar números
  const parseNumber = (value: any): number => {
      if (value === undefined || value === null || value === '') return 0;
      if (typeof value === 'number') {
          // Excel às vezes retorna números infinitos ou NaN se houver erro de fórmula
          return isFinite(value) && !isNaN(value) ? value : 0;
      }
      
      let strVal = String(value).trim().toUpperCase();
      
      // FILTRO CRÍTICO: Remove 'NaN', 'NULL', 'UNDEFINED' escrito explicitamente
      if (strVal === 'NAN' || strVal === 'NULL' || strVal === 'UNDEFINED') return 0;

      // Remove símbolos de moeda e texto
      strVal = strVal.replace(/[^\d,.-]/g, '');
      if (!strVal) return 0;

      // Tratamento para 1.000 (mil) vs 1.000 (1 ponto zero)
      if (/^\d{1,3}(\.\d{3})+$/.test(strVal)) {
           strVal = strVal.replace(/\./g, '');
           return parseFloat(strVal);
      }

      const lastComma = strVal.lastIndexOf(',');
      const lastDot = strVal.lastIndexOf('.');
      
      if (lastComma > lastDot) {
          // Formato BR (1.200,50)
          strVal = strVal.replace(/\./g, '').replace(',', '.');
      } else if (lastDot > lastComma) {
          // Formato US (1,200.50)
          strVal = strVal.replace(/,/g, '');
      } else {
          // Ambíguo, assume vírgula como decimal se existir
          if (strVal.includes(',')) strVal = strVal.replace(',', '.');
      }
      
      const parsed = parseFloat(strVal);
      return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
  };

  const parseData = (rows: any[]) => {
      if (rows.length < 2) {
          alert("Arquivo vazio ou sem dados.");
          return;
      }

      const parsedItems = [];
      
      // Começa do índice 1 (pula cabeçalho)
      for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const rawName = row[1];
          if (!rawName) continue; // Sem nome, pula

          // TRATAMENTO DO CÓDIGO (SKU)
          // Força conversão para string para não perder zeros à esquerda (ex: "002" vira "2" se for number)
          // Se vier undefined, null ou vazio, gera string vazia.
          let sku = '';
          if (row[2] !== undefined && row[2] !== null) {
              sku = String(row[2]).trim();
          }

          parsedItems.push({
              id: row[0] ? String(row[0]).trim() : '', 
              name: String(rawName).trim(),
              code: sku, 
              category: row[3] ? String(row[3]).trim() : 'Geral',
              price: parseNumber(row[4]),
              cost: parseNumber(row[5]),
              stock: Math.floor(parseNumber(row[6])),
              minStock: Math.floor(parseNumber(row[7])), // Aqui trata o NaN da coluna H
              description: row[8] ? String(row[8]).trim() : ''
          });
      }

      setStats({ total: parsedItems.length, processed: 0 });
      setProductsToImport(parsedItems);
      
      setStep('processing');
      executeImport(parsedItems);
  };

  const executeImport = async (items: any[]) => {
      try {
          await onImport(items, mode);
          setStats(prev => ({ ...prev, processed: items.length }));
          setStep('success');
      } catch (err) {
          console.error(err);
          setStep('upload'); 
      }
  };

  const resetModal = () => {
      setStep('selection');
      setMode('create');
      setProductsToImport([]);
      onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[80] transition-opacity backdrop-blur-sm" onClick={resetModal} />
      
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-[90] w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-800">
                {step === 'selection' && 'Importar Produtos'}
                {step === 'instructions' && (mode === 'create' ? 'Importar Novos' : 'Atualizar Existentes')}
                {step === 'upload' && 'Enviar Arquivo'}
                {step === 'processing' && 'Processando...'}
                {step === 'success' && 'Importação Concluída'}
            </h2>
            <button onClick={resetModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={24} />
            </button>
        </div>

        <div className="p-8">
            
            {step === 'selection' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button 
                        onClick={() => { setMode('create'); setStep('instructions'); }}
                        className="flex flex-col items-center justify-center p-8 border-2 border-gray-100 rounded-2xl hover:border-[#2dd4bf] hover:bg-teal-50 transition-all group text-center h-64"
                    >
                        <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <FilePlus size={32} />
                        </div>
                        <h3 className="font-bold text-lg text-gray-800 mb-2">Importar novos</h3>
                        <p className="text-sm text-gray-500">Cadastre vários produtos de uma vez usando uma planilha em branco.</p>
                    </button>

                    <button 
                        onClick={() => { setMode('update'); setStep('instructions'); }}
                        className="flex flex-col items-center justify-center p-8 border-2 border-gray-100 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all group text-center h-64"
                    >
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <RefreshCw size={32} />
                        </div>
                        <h3 className="font-bold text-lg text-gray-800 mb-2">Atualizar existentes</h3>
                        <p className="text-sm text-gray-500">Baixe seus produtos atuais, edite preços ou estoques e reenvie.</p>
                    </button>
                </div>
            )}

            {step === 'instructions' && (
                <div className="space-y-8">
                    <div className="space-y-4">
                        <div className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-full bg-[#2dd4bf] text-white flex items-center justify-center font-bold flex-shrink-0">1</div>
                            <div>
                                <h4 className="font-bold text-gray-800 mb-1">Baixe a planilha modelo</h4>
                                <p className="text-sm text-gray-600 mb-3">
                                    {mode === 'create' 
                                        ? 'O arquivo contém exemplos de como preencher os dados corretamente.' 
                                        : 'O arquivo contém todos os seus produtos atuais para edição.'}
                                </p>
                                <button 
                                    onClick={handleDownloadTemplate}
                                    className="flex items-center gap-2 text-sm font-bold text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <Download size={16} />
                                    Baixar planilha modelo
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-full bg-[#2dd4bf] text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
                            <div>
                                <h4 className="font-bold text-gray-800 mb-1">Preencha os dados</h4>
                                <p className="text-sm text-gray-600">
                                    Adicione ou edite os produtos, um por linha. 
                                    <span className="block mt-1 text-amber-600 font-medium text-xs bg-amber-50 p-2 rounded border border-amber-100">
                                        Dica: A coluna Código (SKU) aceita números e letras.
                                    </span>
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-full bg-[#2dd4bf] text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
                            <div>
                                <h4 className="font-bold text-gray-800 mb-1">Envie o arquivo</h4>
                                <p className="text-sm text-gray-600">
                                    Depois de salvar, envie a planilha no próximo passo.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex justify-end">
                        <button 
                            onClick={() => setStep('upload')}
                            className="bg-[#2dd4bf] hover:bg-[#14b8a6] text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all flex items-center gap-2"
                        >
                            Continuar <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            )}

            {step === 'upload' && (
                <div className="space-y-6">
                    <div 
                        className="border-2 border-dashed border-gray-300 rounded-2xl p-10 flex flex-col items-center justify-center text-center bg-gray-50 hover:bg-white hover:border-[#2dd4bf] transition-all cursor-pointer min-h-[300px]"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept=".xlsx, .xls, .csv" 
                            className="hidden" 
                        />
                        <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-[#2dd4bf]">
                            <UploadCloud size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-700 mb-1">Solte arquivos aqui ou clique para selecionar</h3>
                        <p className="text-sm text-gray-400">São suportados arquivos XLS, XLSX, CSV</p>
                    </div>
                </div>
            )}

            {(step === 'processing' || step === 'success') && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                    {step === 'processing' ? (
                        <>
                            <Loader2 className="w-16 h-16 text-[#2dd4bf] animate-spin mb-4" />
                            <h3 className="text-xl font-bold text-gray-800">Importando produtos...</h3>
                            <p className="text-gray-500 mt-2">Isso pode levar alguns segundos.</p>
                        </>
                    ) : (
                        <div className="animate-in zoom-in duration-300">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">Importação Concluída!</h3>
                            <p className="text-gray-500 mt-2 mb-6">
                                {stats.processed} produtos foram processados com sucesso.
                            </p>
                            <button 
                                onClick={resetModal}
                                className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-2.5 px-8 rounded-xl transition-all"
                            >
                                Fechar
                            </button>
                        </div>
                    )}
                </div>
            )}

        </div>
      </div>
    </>
  );
};

export default ProductImportModal;
