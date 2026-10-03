import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAssistant } from '../../hooks/useAssistant';
import { safePage } from '../../lib/assistant-client';
import { haptic } from '../../lib/telegram';
import { AITutorChat } from '../ai/AITutorChat';
import { AssistantSheet } from './AssistantSheet';

/* ============================================================
   StudentChatHub — o'quvchi uchun maskot chati: ikkita bo'lim.
   • Repetitor — mavzuni tushuntiradi (mavjud AITutorChat)
   • Murabbiy  — o'quvchining natijalari/progressi bo'yicha (yangi yordamchi)
   Ikkinchi suzuvchi tugma kerak emas: maskot ochgan oyna ichida almashtiriladi.
   Ikkala bo'lim doim mounted, shuning uchun suhbatlar bo'limlar orasida saqlanadi.
   ============================================================ */

type Tab = 'tutor' | 'coach';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  studentName?: string;
  weakTopics?: string[];
}

function Tabs({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const item = (id: Tab, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => {
        haptic('light');
        onChange(id);
      }}
      className={`flex-1 rounded-xl py-2 text-xs font-semibold transition ${
        tab === id ? 'bg-gold text-base' : 'text-ink-muted'
      }`}
    >
      {label}
    </button>
  );
  return (
    <div role="tablist" aria-label="AI bo'limi" className="flex gap-1 p-1 rounded-2xl bg-white/5">
      {item('tutor', '🎓 Repetitor')}
      {item('coach', '✨ Murabbiy')}
    </div>
  );
}

export function StudentChatHub({ isOpen, onClose, studentName, weakTopics }: Props) {
  const { pathname } = useLocation();
  const [tab, setTab] = useState<Tab>('tutor');
  const assistant = useAssistant({ page: safePage(pathname) });

  // Test topshirayotganda server AI'ni o'chiradi (anti-cheat); foydalanuvchiga oldindan tushuntiramiz
  const inTest = /^\/tests\/[^/]+/.test(pathname);
  const tabs = <Tabs tab={tab} onChange={setTab} />;

  return (
    <>
      <AITutorChat
        isOpen={isOpen && tab === 'tutor'}
        onClose={onClose}
        studentName={studentName}
        weakTopics={weakTopics}
        headerSlot={tabs}
      />
      <AssistantSheet
        isOpen={isOpen && tab === 'coach'}
        onClose={onClose}
        role="STUDENT"
        assistant={assistant}
        headerSlot={tabs}
        disabledReason={inTest ? "Test davomida AI yordamchisi o'chirilgan. Testni yakunlagach foydalanishingiz mumkin." : undefined}
      />
    </>
  );
}
