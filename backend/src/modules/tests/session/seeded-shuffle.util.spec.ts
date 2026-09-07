import { seededShuffle } from './seeded-shuffle.util';

describe('seededShuffle (19-band: random answer order)', () => {
  const items = [
    { id: 'a', text: 'A' },
    { id: 'b', text: 'B' },
    { id: 'c', text: 'C' },
    { id: 'd', text: 'D' },
  ];

  it('bir xil seed + questionId doim bir xil tartibni beradi (determinizm)', () => {
    const first = seededShuffle(items, 12345, 'question-1');
    const second = seededShuffle(items, 12345, 'question-1');
    expect(first.map((i) => i.id)).toEqual(second.map((i) => i.id));
  });

  it('har bir chaqiriqda ORIGINAL massivni o\'zgartirmaydi (immutability)', () => {
    const originalOrder = items.map((i) => i.id);
    seededShuffle(items, 999, 'question-2');
    expect(items.map((i) => i.id)).toEqual(originalOrder);
  });

  it('turli questionId uchun (bir xil seed bilan) ehtimol boshqacha tartib beradi', () => {
    const forQ1 = seededShuffle(items, 42, 'question-1');
    const forQ2 = seededShuffle(items, 42, 'question-2');
    // Ikkalasi ham bir xil bo'lib qolishi statistik jihatdan deyarli imkonsiz
    expect(forQ1.map((i) => i.id)).not.toEqual(forQ2.map((i) => i.id));
  });

  it('barcha elementlarni saqlab qoladi (yo\'qotmaydi, takrorlamaydi)', () => {
    const result = seededShuffle(items, 7, 'question-3');
    expect(result.map((i) => i.id).sort()).toEqual(items.map((i) => i.id).sort());
  });
});
