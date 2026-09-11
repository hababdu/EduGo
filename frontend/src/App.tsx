import { BrowserRouter, Routes, Route, useLocation  } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useAuthStore } from './store/auth.store';
import { StudentDashboard } from './pages/StudentDashboard';
import { TestTaking } from './pages/tests/TestTaking';
import { RankingPage } from './pages/ranking/RankingPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { AdminOverview } from './pages/admin/AdminOverview';
import { AdminStudents } from './pages/admin/AdminStudents';
import { AdminStudentDetail } from './pages/admin/AdminStudentDetail';
import { TeacherAssignments } from './pages/teacher/content/TeacherAssignments';
import { TeacherAssignmentDetail } from './pages/teacher/content/TeacherAssignmentDetail';
import { AdminSubjectDetail } from './pages/teacher/content/AdminSubjectDetail';
import { AdminSectionDetail } from './pages/teacher/content/AdminSectionDetail';
import { AdminTopicDetail } from './pages/teacher/content/AdminTopicDetail';
import { AdminQuestions } from './pages/teacher/questions/AdminQuestions';
import { AdminTests } from './pages/teacher/tests/AdminTests';
import { AdminTestDetail } from './pages/teacher/tests/AdminTestDetail';
import { TeacherOverview } from './pages/teacher/TeacherOverview';
import { TeacherGroupDetail } from './pages/teacher/TeacherGroupDetail';
import { BottomNav } from './components/layout/BottomNav';
import { AdminNav } from './components/admin/AdminNav';
import { TeacherNav } from './components/teacher/TeacherNav';
import UsersAdminPage from './pages/admin/UsersAdminPage';
import AdminGroups from './pages/admin/AdminGroups';
import { AdminGroupDetail } from './pages/admin/AdminGroupDetail'; 
import { TeacherStudentDetail } from './pages/teacher/TeacherStudentDetail';
import apiClient, { setMemoryToken } from './api/client';
export function App() {
  const status = useAuth();
  const user = useAuthStore((s) => s.user);
useEffect(() => {
    async function authenticateUser() {
      try {
        // Telegram WebApp initData ni olish (agar Telegram muhitida bo'lsa)
        const initData = (window as any).Telegram?.WebApp?.initData || '';

        // Backenddagi telegram orqali kirish endpointi (loyihangizga qarab o'zgarishi mumkin)
        const response = await apiClient.post('/api/v1/auth/telegram', {
          initData,
        });

        const token = response.data.accessToken || response.data.token;
        if (token) {
          setMemoryToken(token); // 👈 Tokenni xotiraga yozish
        }
      } catch (err) {
        console.error("Avtorizatsiyadan o'tishda xatolik:", err);
      }
    }

    authenticateUser();
  }, []);
  if (status === 'checking') {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-ink-muted text-sm">Yuklanmoqda...</p>
      </div>
    );
  }

  if (status === 'no-telegram') {
    return (
      <div className="h-screen flex items-center justify-center px-8 text-center">
        <div>
          <p className="font-display text-xl mb-2">Bu ilova Telegram ichida ochiladi</p>
          <p className="text-sm text-ink-muted">
            Botga o'ting va "📚 Darsni boshlash" tugmasini bosing.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="h-screen flex items-center justify-center px-8 text-center">
        <div>
          <p className="font-display text-xl mb-2">Kirishda xatolik</p>
          <p className="text-sm text-ink-muted">
            Botga qaytib, "📚 Darsni boshlash" tugmasini qayta bosing.
          </p>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isTeacher = user?.role === 'TEACHER';

  if (isAdmin) {
    return (
      <BrowserRouter>
        <div className="min-h-screen pb-24">
          <Routes>
            <Route path="/admin" element={<AdminOverview />} />
            <Route path="/admin/students" element={<AdminStudents />} />
            <Route path="/admin/students/:id" element={<AdminStudentDetail />} />
            <Route path="/admin/users" element={<UsersAdminPage />} />
            <Route path="/admin/groups" element={<AdminGroups />} />
            <Route path="/admin/groups/:id" element={<AdminGroupDetail />} />
            <Route path="*" element={<AdminOverview />} />
          </Routes>
        </div>
        <AdminNav />
      </BrowserRouter>
    );
  }

 if (isTeacher) {
    return (
      <BrowserRouter>
        <div className="min-h-screen pb-24">
          <Routes>
            <Route path="/teacher" element={<TeacherOverview />} />
            <Route path="/teacher/content/courses" element={<TeacherAssignments />} />
            <Route path="/teacher/content/courses/:courseId" element={<TeacherAssignmentDetail />} />
            <Route path="/teacher/content/subjects/:subjectId" element={<AdminSubjectDetail />} />
            <Route path="/teacher/content/sections/:sectionId" element={<AdminSectionDetail />} />
            <Route path="/teacher/content/topics/:topicId" element={<AdminTopicDetail />} />
            <Route path="/teacher/tests" element={<AdminTests />} />
            <Route path="/teacher/tests/:id" element={<AdminTestDetail />} />
            <Route path="/teacher/groups/:groupId" element={<TeacherGroupDetail />} />
            <Route path="/teacher/groups/:groupId/students/:studentId" element={<TeacherStudentDetail />} />
            <Route path="*" element={<TeacherOverview />} />
          </Routes>
        </div>
        <TeacherNav />
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <StudentRoutes />
    </BrowserRouter>
  );
}

function StudentRoutes() {
  const location = useLocation();
  const hideBottomNav = location.pathname.startsWith('/tests/');

  return (
    <div className="min-h-screen pb-24">
      <Routes>
        <Route path="/" element={<StudentDashboard />} />
        <Route path="/tests/:testId" element={<TestTaking />} />
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
      </Routes>
      {!hideBottomNav && <BottomNav />}
    </div>
  );
}