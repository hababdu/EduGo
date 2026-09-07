import React from 'react';
import { useUserWallet } from '../../hooks/useGamification';

export const WalletPage: React.FC = () => {
  const { data: wallet, isLoading } = useUserWallet();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!wallet) return null;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">💎 Hamyon va Daraja</h1>

      {/* BALANCE CARD */}
      <div className="bg-gradient-to-r from-indigo-900/80 to-purple-900/80 p-6 rounded-2xl border border-indigo-500/30 shadow-xl">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-xs font-semibold text-indigo-300 tracking-wider uppercase">Jami Jamg'arilgan Ballar</span>
            <div className="text-4xl font-extrabold text-white mt-1">
              {wallet.totalScore.toLocaleString()} <span className="text-indigo-400 text-2xl">PTS</span>
            </div>
          </div>
          <div className="bg-indigo-600/40 border border-indigo-400/30 px-3 py-1 rounded-full text-xs font-bold text-indigo-200">
            {wallet.currentLevel}-Level
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-indigo-200">
            <span>Keyingi darajagacha</span>
            <span>{wallet.nextLevelScore - wallet.totalScore} ball qoldi</span>
          </div>
          <div className="w-full bg-slate-950/60 h-2.5 rounded-full overflow-hidden p-0.5 border border-indigo-500/20">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(wallet.progressPercentage, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* TRANSACTIONS HISTORY */}
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4">📜 Operatsiyalar Tarixi</h2>

        <div className="space-y-3">
          {wallet.recentTransactions.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Hozircha amaliyotlar yo'q</p>
          ) : (
            wallet.recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-700/50"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-200">{tx.reason}</p>
                  <span className="text-xs text-slate-500">
                    {new Date(tx.createdAt).toLocaleDateString()} • {tx.type}
                  </span>
                </div>
                <div className={`font-bold text-sm ${tx.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {tx.amount >= 0 ? `+${tx.amount}` : tx.amount} PTS
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};