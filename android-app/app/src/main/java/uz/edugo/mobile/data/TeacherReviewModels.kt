package uz.edugo.mobile.data

import kotlinx.serialization.Serializable

@Serializable data class TeacherGroupAssignmentStat(
    val id: String,
    val title: String = "",
    val dueAt: String? = null,
    val total: Int = 0,
    val submitted: Int = 0,
    val graded: Int = 0,
)
@Serializable data class TeacherSubmissionSummary(
    val total: Int = 0,
    val submitted: Int = 0,
    val graded: Int = 0,
    val needsReview: Int = 0,
    val failed: Int = 0,
    val average: Int? = null,
)
@Serializable data class TeacherSubmissionStudent(
    val id: String = "",
    val firstName: String = "",
    val lastName: String? = null,
    val username: String? = null,
)
@Serializable data class TeacherSubmission(
    val id: String = "",
    val status: String = "",
    val textAnswer: String? = null,
    val submittedAt: String? = null,
    val files: List<MaterialFileDto> = emptyList(),
    val aiScore: Double? = null,
    val aiFeedback: String? = null,
    val aiStrengths: List<String> = emptyList(),
    val aiImprovements: List<String> = emptyList(),
    val teacherScore: Double? = null,
    val teacherFeedback: String? = null,
    val finalScore: Double? = null,
    val gradeError: String? = null,
)
@Serializable data class TeacherSubmissionRow(
    val student: TeacherSubmissionStudent = TeacherSubmissionStudent(),
    val submission: TeacherSubmission? = null,
)
@Serializable data class TeacherSubmissionsData(
    val assignment: HwAssignment = HwAssignment(),
    val summary: TeacherSubmissionSummary = TeacherSubmissionSummary(),
    val rows: List<TeacherSubmissionRow> = emptyList(),
)
@Serializable data class ReviewHomeworkBody(val score: Int, val feedback: String? = null)
@Serializable data class ReturnHomeworkBody(val note: String)
