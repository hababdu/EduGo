package uz.edugo.mobile.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable data class TeacherTestCount(val questions: Int = 0, val assignments: Int = 0, val attempts: Int = 0)
@Serializable data class TeacherTestItem(
    val id: String,
    val title: String = "",
    val description: String? = null,
    val status: String = "DRAFT",
    val durationSeconds: Int = 0,
    val passingScore: Int = 50,
    @SerialName("_count") val count: TeacherTestCount? = null,
)
@Serializable data class TeacherQuestionDraft(
    val text: String,
    val difficulty: String = "MEDIUM",
    val points: Int = 1,
    val options: List<String>,
    val correctAnswerIndex: Int,
)
@Serializable data class CreateTeacherTest(
    val title: String,
    val description: String? = null,
    val durationSeconds: Int,
    val passingScore: Int,
    val randomQuestions: Boolean = false,
    val randomAnswerOrder: Boolean = false,
    val groupIds: List<String>,
    val questions: List<TeacherQuestionDraft>,
)
