package uz.edugo.mobile.data

import kotlinx.serialization.Serializable

/* ---------- Testlar ---------- */
@Serializable
data class AssignedTest(
    val testId: String,
    val title: String = "",
    val durationSeconds: Int = 0,
    val deadline: String? = null,
    val status: String = "PENDING",
    val score: Double? = null,
    val maxScore: Double? = null,
    val passed: Boolean? = null,
)

@Serializable data class TestOption(val id: String, val text: String = "")

@Serializable
data class TestQuestion(
    val id: String,
    val type: String = "SINGLE_CHOICE",
    val text: String = "",
    val points: Double = 1.0,
    val options: List<TestOption> = emptyList(),
)

@Serializable
data class SavedAnswer(
    val questionId: String,
    val selectedOptionIds: List<String> = emptyList(),
    val textAnswer: String? = null,
)

@Serializable
data class TestSession(
    val sessionId: String = "",
    val testTitle: String = "",
    val remainingSeconds: Int = 0,
    val questions: List<TestQuestion> = emptyList(),
    val savedAnswers: List<SavedAnswer> = emptyList(),
)

@Serializable data class SessionTime(val remainingSeconds: Int = 0)

@Serializable
data class AnswerBody(
    val questionId: String,
    val selectedOptionIds: List<String> = emptyList(),
    val textAnswer: String? = null,
)

@Serializable
data class SubmitResult(
    val score: Double = 0.0,
    val maxScore: Double = 0.0,
    val percent: Double = 0.0,
    val passed: Boolean = false,
    val autoSubmitted: Boolean = false,
)

/* ---------- Uy vazifasi ---------- */
@Serializable
data class HwAssignment(
    val id: String = "",
    val title: String = "",
    val dueAt: String? = null,
    val maxScore: Int = 0,
    val gradingStatus: String = "PENDING",
)

@Serializable
data class HwSubmission(
    val status: String = "",
    val textAnswer: String? = null,
    val submittedAt: String = "",
    val score: Double? = null,
    val maxScore: Int = 0,
    val feedback: String? = null,
    val strengths: List<String> = emptyList(),
    val improvements: List<String> = emptyList(),
    val gradedBy: String? = null,
    val returnNote: String? = null,
    val files: List<MaterialFileDto> = emptyList(),
)

@Serializable
data class HwMine(
    val assignment: HwAssignment = HwAssignment(),
    val canSubmit: Boolean = false,
    val closedReason: String? = null,
    val submission: HwSubmission? = null,
)

@Serializable data class HwBody(val textAnswer: String?, val fileIds: List<String> = emptyList())

/* ---------- AI yordamchi ---------- */
@Serializable data class ChatTurn(val role: String, val content: String)
@Serializable data class ChatBody(val history: List<ChatTurn>)

@Serializable data class ActionDetail(val label: String = "", val value: String = "")

@Serializable
data class ActionCard(
    val id: String,
    val tool: String = "",
    val summary: String = "",
    val details: List<ActionDetail> = emptyList(),
    val risk: String = "MEDIUM",
)

@Serializable
data class ChatEvent(
    val type: String = "",
    val delta: String? = null,
    val id: String? = null,
    val name: String? = null,
    val label: String? = null,
    val ok: Boolean? = null,
    val action: ActionCard? = null,
    val message: String? = null,
)

@Serializable data class ActionResult(val id: String = "", val status: String = "", val message: String? = null)
