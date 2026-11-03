package uz.edugo.mobile.data

import kotlinx.serialization.Serializable

/* ---------- Auth ---------- */
@Serializable
data class AuthUser(
    val id: String,
    val firstName: String = "",
    val lastName: String? = null,
    val username: String? = null,
    val role: String = "STUDENT",
    val profilePhotoUrl: String? = null,
) {
    val fullName: String get() = listOfNotNull(firstName.ifBlank { null }, lastName?.ifBlank { null }).joinToString(" ").ifBlank { username ?: "Foydalanuvchi" }
}

@Serializable data class AuthResponse(val accessToken: String, val refreshToken: String, val user: AuthUser)
@Serializable data class RefreshBody(val refreshToken: String)
@Serializable data class PollBody(val id: String, val secret: String)

@Serializable
data class LoginStart(
    val id: String,
    val secret: String,
    val botUsername: String = "",
    val url: String = "",
    val deepLink: String = "",
    val expiresIn: Int = 300,
)

@Serializable
data class LoginPoll(
    val status: String = "pending",
    val accessToken: String? = null,
    val refreshToken: String? = null,
    val user: AuthUser? = null,
)

/* ---------- O'quvchi ---------- */
@Serializable
data class DashStudent(val firstName: String = "", val streak: Int = 0, val rank: Int = 0)

@Serializable
data class DashContinue(val subjectId: String = "", val subjectTitle: String = "", val progressPercent: Double = 0.0)

@Serializable
data class DashSubject(val id: String = "", val title: String = "", val progressPercent: Double = 0.0)

@Serializable
data class DashStats(
    val totalScore: Int = 0,
    val xp: Int = 0,
    val level: Int = 1,
    val xpIntoLevel: Int = 0,
    val xpForNextLevel: Int = 100,
)

@Serializable
data class DashResult(val testTitle: String = "", val percent: Double = 0.0, val passed: Boolean = false)

@Serializable
data class DashAchievement(val id: String = "", val title: String = "")

@Serializable
data class DashboardData(
    val student: DashStudent = DashStudent(),
    val continueLesson: DashContinue? = null,
    val subjects: List<DashSubject> = emptyList(),
    val stats: DashStats = DashStats(),
    val recentResults: List<DashResult> = emptyList(),
    val achievements: List<DashAchievement> = emptyList(),
)

@Serializable
data class TeacherRef(val id: String = "", val firstName: String = "", val lastName: String? = null)

@Serializable
data class TodayLesson(
    val id: String,
    val name: String = "",
    val startTime: String? = null,
    val endTime: String? = null,
    val room: String? = null,
    val teacher: TeacherRef? = null,
    val membersCount: Int = 0,
    val markedCount: Int = 0,
)

@Serializable
data class Task(
    val id: String,
    val title: String = "",
    val groupId: String = "",
    val groupName: String = "",
    val dueAt: String? = null,
    val maxScore: Int = 0,
    val state: String = "PENDING",
    val score: Int? = null,
    val overdue: Boolean = false,
)

@Serializable
data class Standing(
    val groupId: String = "",
    val groupName: String = "",
    val attendancePct: Int? = null,
    val lessons: Int = 0,
    val absent: Int = 0,
    val fee: Double? = null,
    val month: String = "",
    val payment: String = "NONE",
)

@Serializable
data class RankEntry(
    val studentId: String = "",
    val firstName: String = "",
    val username: String? = null,
    val totalScore: Int = 0,
    val rank: Int = 0,
)

@Serializable
data class RankingData(val top: List<RankEntry> = emptyList(), val yourRank: Int? = null)

@Serializable
data class NotificationItem(
    val id: String,
    val type: String = "",
    val title: String = "",
    val body: String = "",
    val isRead: Boolean = false,
    val createdAt: String = "",
)

/* ---------- O'qituvchi ---------- */
@Serializable data class OverviewGroup(val id: String, val name: String = "", val studentsCount: Int = 0)

@Serializable
data class RecentAssignment(
    val id: String = "",
    val testTitle: String = "",
    val groupName: String = "",
    val assignedAt: String = "",
    val deadline: String? = null,
)

@Serializable
data class TeacherOverview(
    val groupsCount: Int = 0,
    val studentsCount: Int = 0,
    val assignedTestsCount: Int = 0,
    val groups: List<OverviewGroup> = emptyList(),
    val recentAssignments: List<RecentAssignment> = emptyList(),
)

@Serializable
data class ToGrade(val assignmentId: String = "", val title: String = "", val groupId: String = "", val groupName: String = "", val pending: Int = 0)

@Serializable
data class AtRisk(
    val groupId: String = "",
    val groupName: String = "",
    val studentId: String = "",
    val name: String = "",
    val attendancePct: Int = 0,
    val absent: Int = 0,
)

@Serializable
data class TeacherTodo(
    val toGradeTotal: Int = 0,
    val toGrade: List<ToGrade> = emptyList(),
    val atRisk: List<AtRisk> = emptyList(),
)

@Serializable
data class GroupCount(val students: Int? = null, val members: Int? = null)

@Serializable
data class GroupItem(
    val id: String,
    val name: String = "",
    val description: String? = null,
    val teacher: TeacherRef? = null,
    @kotlinx.serialization.SerialName("_count") val count: GroupCount? = null,
) {
    val memberCount: Int get() = count?.students ?: count?.members ?: 0
}

@Serializable
data class GroupStudent(
    val id: String,
    val firstName: String = "",
    val lastName: String? = null,
    val totalScore: Int = 0,
    val level: Int = 1,
    val testsCompleted: Int = 0,
    val averagePercent: Double? = null,
) {
    val fullName: String get() = listOfNotNull(firstName.ifBlank { null }, lastName?.ifBlank { null }).joinToString(" ")
}

@Serializable
data class AttendanceStudent(
    val studentId: String,
    val firstName: String = "",
    val lastName: String? = null,
    val status: String? = null,
) {
    val fullName: String get() = listOfNotNull(firstName.ifBlank { null }, lastName?.ifBlank { null }).joinToString(" ")
}

@Serializable
data class AttendanceDay(
    val groupId: String = "",
    val date: String = "",
    val students: List<AttendanceStudent> = emptyList(),
    val markedCount: Int = 0,
    val isLessonDay: Boolean? = null,
)

@Serializable data class AttendanceRecord(val studentId: String, val status: String)
@Serializable data class AttendanceSave(val date: String, val records: List<AttendanceRecord>)

@Serializable
data class MyAttendance(
    val present: Int = 0,
    val absent: Int = 0,
    val excused: Int = 0,
    val percent: Int? = null,
)

/* ---------- Admin ---------- */
@Serializable
data class AdminTotals(
    val students: Int = 0,
    val activeStudents: Int = 0,
    val teachers: Int = 0,
    val courses: Int = 0,
    val subjects: Int = 0,
    val tests: Int = 0,
    val completedTests: Int = 0,
    val totalScoreIssued: Int = 0,
)

@Serializable data class AdminToday(val testAttempts: Int = 0)
@Serializable data class DailyActive(val date: String = "", val count: Int = 0)
@Serializable data class AdminCharts(val dailyActiveUsers: List<DailyActive> = emptyList())

@Serializable
data class AdminOverview(
    val totals: AdminTotals = AdminTotals(),
    val today: AdminToday = AdminToday(),
    val charts: AdminCharts = AdminCharts(),
)

@Serializable
data class AdminStudent(
    val id: String,
    val firstName: String = "",
    val lastName: String? = null,
    val username: String? = null,
    val status: String = "ACTIVE",
    val totalScore: Int = 0,
    val level: Int = 1,
) {
    val fullName: String get() = listOfNotNull(firstName.ifBlank { null }, lastName?.ifBlank { null }).joinToString(" ")
}

@Serializable
data class AdminStudentPage(
    val items: List<AdminStudent> = emptyList(),
    val page: Int = 1,
    val total: Int = 0,
    val totalPages: Int = 1,
)

/* ---------- Ota-ona ---------- */
@Serializable
data class Child(
    val id: String,
    val name: String = "",
    val standing: List<Standing> = emptyList(),
    val pendingTasks: Int = 0,
    val overdueTasks: Int = 0,
)

@Serializable
data class ChildTask(
    val id: String = "",
    val title: String = "",
    val groupName: String = "",
    val dueAt: String? = null,
    val state: String = "PENDING",
    val score: Int? = null,
    val maxScore: Int = 0,
    val overdue: Boolean = false,
)

@Serializable data class Absence(val date: String = "", val status: String = "ABSENT", val group: String = "")
@Serializable data class ChildResult(val title: String = "", val score: Int = 0, val passed: Boolean = false, val at: String = "")
@Serializable data class JournalEntry(val date: String = "", val topic: String = "", val homework: String? = null, val group: String = "")

@Serializable
data class ChildDetail(
    val id: String,
    val name: String = "",
    val level: Int? = null,
    val totalScore: Int? = null,
    val standing: List<Standing> = emptyList(),
    val tasks: List<ChildTask> = emptyList(),
    val absences: List<Absence> = emptyList(),
    val results: List<ChildResult> = emptyList(),
    val journal: List<JournalEntry> = emptyList(),
)
