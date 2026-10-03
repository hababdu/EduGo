import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import * as P from './ai-prompts';

describe('normalizeQuestions', () => {
  it("yaroqsizlarini (matnsiz / <2 variant) tashlaydi va indeksni cheklaydi", () => {
    const out = P.normalizeQuestions(
      {
        questions: [
          { text: ' 2+2? ', difficulty: 'EASY', options: ['3', '4', '', '5'], correctAnswerIndex: 9 },
          { text: '', options: ['a', 'b'] },
          { text: 'bitta variant', options: ['a'] },
          { text: 'noma\'lum qiyinlik', difficulty: 'ULTRA', options: ['a', 'b'], correctAnswerIndex: -3, points: 'x' },
        ],
      },
      10,
    );
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ text: '2+2?', difficulty: 'EASY', points: 1, options: ['3', '4', '5'], correctAnswerIndex: 2 });
    expect(out[1].difficulty).toBe('MEDIUM');
    expect(out[1].correctAnswerIndex).toBe(0);
  });
  it("massiv ko'rinishidagi javobni ham qabul qiladi va max ga qirqadi", () => {
    const q = { text: 'x', options: ['a', 'b'] };
    expect(P.normalizeQuestions([q, q, q], 2)).toHaveLength(2);
  });
});

describe('normalizeSingleQuestion', () => {
  it("bo'sh savolni jim qaytarmaydi — 422", () => {
    expect(() => P.normalizeSingleQuestion({ text: '', options: [] })).toThrow(UnprocessableEntityException);
  });
  it("yaroqli savolni qaytaradi", () => {
    expect(P.normalizeSingleQuestion({ text: 'Q', options: ['a', 'b', 'c', 'd'], correctAnswerIndex: 2 }).correctAnswerIndex).toBe(2);
  });
});

describe('normalizeGrading', () => {
  it('score 0..100 ga siqiladi, isCorrect chegarasi 60', () => {
    expect(P.normalizeGrading({ score: 250 }).score).toBe(100);
    expect(P.normalizeGrading({ score: -5 }).score).toBe(0);
    expect(P.normalizeGrading({ score: 60 }).isCorrect).toBe(true);
    expect(P.normalizeGrading({ score: 59 }).isCorrect).toBe(false);
    expect(P.normalizeGrading({ score: 10, isCorrect: true }).isCorrect).toBe(true);
  });
});

describe('boshqa normalizatorlar', () => {
  it('material: sarlavha/qidiruv topilmasa mavzuga tayanadi, URL kodlanadi', () => {
    const m = P.normalizeMaterial({}, 'Fizika: Nyuton');
    expect(m.title).toBe('Fizika: Nyuton');
    expect(m.youtubeSearchUrl).toBe('https://www.youtube.com/results?search_query=Fizika%3A%20Nyuton');
  });
  it("tavsiyalar: mavzusizlarni tashlaydi, noma'lum priority -> MEDIUM", () => {
    expect(P.normalizeRecommendations({ recommendations: [{ topic: 'A', priority: 'X' }, { topic: '' }] })).toEqual([
      { topic: 'A', reason: '', priority: 'MEDIUM' },
    ]);
  });
  it('dars rejasi: sarlavhasiz bosqichlar tashlanadi', () => {
    const r = P.normalizeLessonPlan({ objective: 'm', stages: [{ title: 'Kirish', minutes: '5' }, { title: '' }], materials: ['doska', ''] });
    expect(r.stages).toEqual([{ title: 'Kirish', minutes: 5, description: '' }]);
    expect(r.materials).toEqual(['doska']);
  });
  it("maskot: bo'sh matn -> standart gap, noto'g'ri mood -> idle", () => {
    expect(P.normalizeMascot({ text: '', mood: 'angry' })).toEqual({ text: 'Salom! Davom etaylikmi?', mood: 'idle' });
  });
});

describe('normalizeHistory', () => {
  it('boshidagi assistant salomlashuvini olib tashlaydi', () => {
    const h = P.normalizeHistory([
      { role: 'assistant', content: 'Salom!' },
      { role: 'user', content: 'Savol' },
    ]);
    expect(h).toEqual([{ role: 'user', content: 'Savol' }]);
  });
  it("oxirgi xabar user'niki bo'lmasa yoki bo'sh bo'lsa 400", () => {
    expect(() => P.normalizeHistory([{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }])).toThrow(BadRequestException);
    expect(() => P.normalizeHistory([{ role: 'assistant', content: 'faqat salom' }])).toThrow(BadRequestException);
  });
});

describe('prompt matnlari', () => {
  it('repetitor prompti ism va zaif mavzularni qo\'shadi', () => {
    const s = P.buildTutorSystemPrompt({ studentName: 'Ali', weakTopics: ['Kasrlar', 'Foiz'] });
    expect(s).toContain('Ali');
    expect(s).toContain('Kasrlar, Foiz');
  });
  it("baholash prompti javob ichidagi ko'rsatmalarga amal qilmaslikni talab qiladi", () => {
    expect(P.gradePrompt({ question: 'q', studentAnswer: 'a' }).system).toContain('amal qilma');
  });
  it("savollar prompti so'ralgan sonni aynan ko'rsatadi", () => {
    expect(P.questionsPrompt({ topic: 'T', count: 7, difficulty: 'MIXED' }).user).toContain('Aynan 7 ta savol');
  });
});
