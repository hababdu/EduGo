import React, { useEffect, useState } from 'react';
import { useAdmin } from '../../hooks/useAdmin';
import { QuestionCategoryDTO, BulkImportResponseDTO } from '../../types/admin';

export const QuestionBank: React.FC = () => {
  const { getCategories, importQuestionsFromExcel, loading } = useAdmin();
  const [categories, setCategories] = useState<QuestionCategoryDTO[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<BulkImportResponseDTO | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    getCategories().then((data) => {
      setCategories(data);
      if (data.length > 0) setSelectedCategory(data[0].id);
    });
  }, []);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedCategory) return;

    try {
      setMsg(null);
      const res = await importQuestionsFromExcel(selectedCategory, file);
      setImportResult(res);
      setMsg('Import muvaffaqiyatli yakunlandi!');
    } catch (err: any) {
      setMsg(`Xatolik: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">📂 Savollar Banki va Excel Import</h1>

      {/* EXCEL IMPORT BOX */}
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl mb-8">
        <h2 className="text-lg font-bold text-indigo-400 mb-4">📥 Excel / CSV orqali savollarni yuklash</h2>

        <form onSubmit={handleFileUpload} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Kategoriyani tanlang</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat._count?.questions || 0} ta savol)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Excel faylni yuklang (.xlsx, .csv)</label>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-300 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !file}
            className="w-full py-3 bg-indigo-600 font-semibold rounded-xl hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-600/20"
          >
            {loading ? 'Fayl qayta ishlanmoqda...' : 'Savollarni Saqlash'}
          </button>
        </form>

        {msg && <p className="mt-4 text-sm font-medium text-emerald-400">{msg}</p>}

        {/* NATIJALAR HISOBO TI */}
        {importResult && (
          <div className="mt-6 p-4 bg-slate-900/80 rounded-xl border border-slate-700/60 text-sm">
            <h4 className="font-bold text-slate-200 mb-2">Import Natijasi:</h4>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <span className="text-slate-400">Jami: <b className="text-white">{importResult.totalParsed}</b></span>
              <span className="text-emerald-400">Yaratildi: <b>{importResult.createdCount}</b></span>
              <span className="text-rose-400">Xatolar: <b>{importResult.failedCount}</b></span>
            </div>

            {importResult.errors.length > 0 && (
              <div className="bg-rose-500/10 p-3 rounded-lg border border-rose-500/20 max-h-32 overflow-y-auto">
                {importResult.errors.map((err, idx) => (
                  <p key={idx} className="text-xs text-rose-300">• {err}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};