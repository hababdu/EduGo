// src/App.tsx
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useAuthStore } from './store/auth.store';

/* ============ STUDENT ============ */
import { StudentDashboard } from './pages/StudentDashboard';
import { LessonsPage } from './pages/student/LessonsPage';
import  LessonDetailPage  from './pages/student/ LessonsPage'; // 👈 YANGI
import { TestsPage } from './pages/student/TestsPage';
import { GroupsPage } from './pages/student/GroupsPage';
import { GroupDetailPage } from './pages/student/GroupDetailPage';
import { ProfilePage } from './pages/student/ProfilePage';
import { TestTaking } from './pages/tests/TestTaking';
import { RankingPage } from './pages/ranking/RankingPage';
import { NotificationsPage } from './pages/NotificationsPage';

/* ============ ADMIN ============ */
import { AdminOverview } from './pages/admin/AdminOverview';
import { AdminStudents } from './pages/admin/AdminStudents';
import { AdminStudentDetail } from './pages/admin/AdminStudentDetail';
import UsersAdminPage from './pages/admin/UsersAdminPage';
import AdminGroups from './pages/admin/AdminGroups';
import { AdminGroupDetail } from './pages/admin/AdminGroupDetail';

/* ============ TEACHER ============ */
import { TeacherOverview } from './pages/teacher/TeacherOverview';
import { TeacherGroups } from './pages/teacher/TeacherGroups';
import { TeacherGroupDetail } from './pages/teacher/TeacherGroupDetail';
import { TeacherStudentDetail } from './pages/teacher/TeacherStudentDetail';
import { TeacherAssignments } from './pages/teacher/content/TeacherAssignments';
import { TeacherAssignmentDetail } from './pages/teacher/content/TeacherAssignmentDetail';
import { AdminSubjectDetail } from './pages/teacher/content/AdminSubjectDetail';
import { AdminSectionDetail } from './pages/teacher/content/AdminSectionDetail';
import { AdminTopicDetail } from './pages/teacher/content/AdminTopicDetail';
import { AdminQuestions } from './pages/teacher/questions/AdminQuestions';
import { AdminTests } from './pages/teacher/tests/AdminTests';
import { AdminTestDetail } from './pages/teacher/tests/AdminTestDetail';

/* ============ LAYOUT ============ */
import { BottomNav } from './components/layout/BottomNav';
import { AdminNav } from './components/admin/AdminNav';
import { TeacherNav } from './components/teacher/TeacherNav';
import { ToastHost } from './components/ui/Toast';

import apiClient, { setMemoryToken } from './api/client';

/* ============================================================
   APP
   ============================================================ */
export function App() {
  const status = useAuth();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    async function authenticateUser() {
      try {
        const tg = (window as any).Telegram?.WebApp;

        if (tg) {
          tg.ready?.();
          tg.expand?.();
          tg.setHeaderColor?.('#0f0f0f');
          tg.setBackgroundColor?.('#0f0f0f');
          tg.disableVerticalSwipes?.();
        }

        const initData = tg?.initData || '';

        const response = await apiClient.post('/api/v1/auth/telegram', {
          initData,
        });

        const token = response.data.accessToken || response.data.token;
        if (token) {
          setMemoryToken(token);
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
          <p className="font-display text-xl mb-2">
            Bu ilova Telegram ichida ochiladi
          </p>
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

  return (
    <BrowserRouter>
      <ToastHost />
      {isAdmin && <AdminRoutes />}
      {isTeacher && <TeacherRoutes />}
      {!isAdmin && !isTeacher && <StudentRoutes />}
    </BrowserRouter>
  );
}

/* ============================================================
   ADMIN ROUTES
   ============================================================ */
function AdminRoutes() {
  return (
    <>
      <div className="min-h-screen pb-24">
        <Routes>
          <Route path="/admin" element={<AdminOverview />} />
          <Route path="/admin/students" element={<AdminStudents />} />
          <Route path="/admin/students/:id" element={<AdminStudentDetail />} />
          <Route path="/admin/users" element={<UsersAdminPage />} />
          <Route path="/admin/groups" element={<AdminGroups />} />
          <Route path="/admin/groups/:id" element={<AdminGroupDetail />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </div>
      <AdminNav />
    </>
  );
}

/* ============================================================
   TEACHER ROUTES
   ============================================================ */
function TeacherRoutes() {
  const location = useLocation();

  const hideBottomNav =
    location.pathname.startsWith('/teacher/assignments/') ||
    location.pathname.startsWith('/teacher/tests/') ||
    location.pathname.startsWith('/teacher/content/subjects/') ||
    location.pathname.startsWith('/teacher/content/sections/') ||
    location.pathname.startsWith('/teacher/content/topics/') ||
    /^\/teacher\/groups\/[^/]+\/students\/[^/]+/.test(location.pathname);

  return (
    <>
      <div className="min-h-screen pb-24">
        <Routes>
          {/* OVERVIEW */}
          <Route path="/teacher" element={<TeacherOverview />} />

          {/* GROUPS */}
          <Route path="/teacher/groups" element={<TeacherGroups />} />
          <Route path="/teacher/groups/:groupId" element={<TeacherGroupDetail />} />
          <Route
            path="/teacher/groups/:groupId/students/:studentId"
            element={<TeacherStudentDetail />}
          />

          {/* MATERIALS */}
          <Route path="/teacher/content/courses" element={<TeacherAssignments />} />
          <Route
            path="/teacher/assignments/:id"
            element={<TeacherAssignmentDetail />}
          />
          <Route
            path="/teacher/content/subjects/:subjectId"
            element={<AdminSubjectDetail />}
          />
          <Route
            path="/teacher/content/sections/:sectionId"
            element={<AdminSectionDetail />}
          />
          <Route
            path="/teacher/content/topics/:topicId"
            element={<AdminTopicDetail />}
          />

          {/* TESTS + QUESTIONS */}
          <Route path="/teacher/questions" element={<AdminQuestions />} />
          <Route path="/teacher/tests" element={<AdminTests />} />
          <Route path="/teacher/tests/:id" element={<AdminTestDetail />} />

          {/* CATCH-ALL */}
          <Route path="*" element={<Navigate to="/teacher" replace />} />
        </Routes>
      </div>
      {!hideBottomNav && <TeacherNav />}
    </>
  );
}

/* ============================================================
   STUDENT ROUTES
   ============================================================ */
function StudentRoutes() {
  const location = useLocation();

  // Quyidagi sahifalarda bottom navni yashirish:
  //  - Test topshirish
  //  - Dars detali
  //  - Guruh detali
  const hideBottomNav =
    (location.pathname.startsWith('/tests/') &&
      location.pathname !== '/tests') ||
    location.pathname.startsWith('/lessons/') ||
    location.pathname.startsWith('/groups/');

  return (
    <>
      <div className="min-h-screen pb-24">
        <Routes>
          {/* ASOSIY */}
          <Route path="/" element={<StudentDashboard />} />

          {/* DARSLAR */}
          <Route path="/lessons" element={<LessonsPage />} />
          <Route path="/lessons/:id" element={<LessonDetailPage />} />   {/* 👈 YANGI */}

          {/* GURUHLAR */}
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/groups/:groupId" element={<GroupDetailPage />} />

          {/* TESTLAR */}
          <Route path="/tests" element={<TestsPage />} />
          <Route path="/tests/:testId" element={<TestTaking />} />

          {/* REYTING */}
          <Route path="/ranking" element={<RankingPage />} />

          {/* XABARLAR */}
          <Route path="/notifications" element={<NotificationsPage />} />

          {/* PROFIL */}
          <Route path="/profile" element={<ProfilePage />} />

          {/* CATCH-ALL */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {!hideBottomNav && <BottomNav />}
    </>
  );
}

export default App;