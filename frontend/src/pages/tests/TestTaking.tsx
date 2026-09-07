// src/pages/tests/TestTaking.tsx

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTestSession } from '../../hooks/useTestSession';
import { QuestionType } from '../../types/test';

export const TestTaking: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

  const {
    session,
    answers,
    timeLeft,
    isLoading,
    isSubmitting,
    result,
    error,
    saveAnswerLocally,
    submitTest,
  } = useTestSession(testId || '');

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        <p className="ml-4 text-slate-400">Test yuklanmoqda...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="p-6 max-w-md mx-auto mt-20 bg-slate-800 rounded-xl text-center text-white border border-slate-700">
        <h2 className="text-xl font-bold text-red-400 mb-2">Xatolik</h2>
        <p className="text-slate-300 text-sm mb-4">{error || 'Test topilmadi'}</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors"
        >
          Bosh sahifaga qaytish
        </button>
      </div>
    );
  }

  // TEST NATIJASI NAMOYoN BO'LISHI
  if (result) {
    return (
      <div className="p-6 max-w-lg mx-auto mt-12 bg-slate-800 rounded-2xl text-white border border-slate-700 shadow-2xl">
        <div className="text-center">
          <div className={`inline-flex p-4 rounded-full mb-4 ${result.passed ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
            {result.passed ? '🎉' : '❌'}
          </div>
          <h2 className="text-2xl font-bold">{result.passed ? 'Tabriklaymiz!' : 'Afsuski o\'ta olmadingiz'}</h2>
          <p className="text-slate-400 text-sm mt-1">{session.test.title}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 my-6">
          <div className="bg-slate-900/60 p-4 rounded-xl text-center border border-slate-700/50">
            <span className="text-xs text-slate-400 block">To'plangan Ball</span>
            <span className="text-2xl font-extrabold text-indigo-400">{result.score} / {result.maxScore}</span>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-xl text-center border border-slate-700/50">
            <span className="text-xs text-slate-400 block">Foiz</span>
            <span className={`text-2xl font-extrabold ${result.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
              {result.percent.toFixed(1)}%
            </span>
          </div>
        </div>

        <button
          onClick={() => navigate('/')}
          className="w-full py-3 bg-indigo-600 font-semibold rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
        >
          Dashboard'ga qaytish
        </button>
      </div>
    );
  }

  const currentQuestion = session.questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion.id] || { selectedOptionIds: [] };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleOptionSelect = (optionId: string) => {
    if (currentQuestion.type === QuestionType.SINGLE_CHOICE || currentQuestion.type === QuestionType.TRUE_FALSE) {
      saveAnswerLocally(currentQuestion.id, [optionId]);
    } else if (currentQuestion.type === QuestionType.MULTIPLE_CHOICE) {
      const exists = currentAnswer.selectedOptionIds.includes(optionId);
      const newOptionIds = exists
        ? currentAnswer.selectedOptionIds.filter((id) => id !== optionId)
        : [...currentAnswer.selectedOptionIds, optionId];
      saveAnswerLocally(currentQuestion.id, newOptionIds);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between max-w-2xl mx-auto p-4">
      {/* HEADER: TIMER & PROGRESS */}
      <div>
        <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700 mb-4 shadow-md">
          <div>
            <span className="text-xs text-slate-400 block">Savol</span>
            <span className="font-bold text-lg text-indigo-400">
              {currentQuestionIndex + 1} <span className="text-slate-500 text-sm">/ {session.questions.length}</span>
            </span>
          </div>

          <div className={`px-4 py-2 rounded-lg font-mono font-bold border ${
            (timeLeft || 0) < 180 ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse' : 'bg-slate-900 text-emerald-400 border-slate-700'
          }`}>
            ⏱ {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
          </div>
        </div>

        {/* QUESTION TEXT */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl mb-4">
          <h3 className="text-lg font-semibold mb-6 leading-relaxed text-slate-100">
            {currentQuestion.text}
          </h3>

          {/* OPTIONS */}
          <div className="space-y-3">
            {currentQuestion.options.map((option) => {
              const isSelected = currentAnswer.selectedOptionIds.includes(option.id);
              return (
                <button
                  key={option.id}
                  onClick={() => handleOptionSelect(option.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-900/60 border-slate-700/60 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <span className="text-sm font-medium">{option.text}</span>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-slate-600'
                  }`}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* FOOTER: NAVIGATION */}
      <div className="flex justify-between items-center gap-4 mt-6">
        <button
          disabled={currentQuestionIndex === 0}
          onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
          className="px-5 py-3 rounded-xl bg-slate-800 border border-slate-700 font-medium text-slate-300 disabled:opacity-40 transition-opacity"
        >
          Oldingisi
        </button>

        {currentQuestionIndex < session.questions.length - 1 ? (
          <button
            onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
            className="px-6 py-3 rounded-xl bg-indigo-600 font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            Keyingisi
          </button>
        ) : (
          <button
            disabled={isSubmitting}
            onClick={() => submitTest(false)}
            className="px-6 py-3 rounded-xl bg-emerald-600 font-semibold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/20"
          >
            {isSubmitting ? 'Tugatilmoqda...' : 'Testni Yakunlash'}
          </button>
        )}
      </div>
    </div>
  );
};