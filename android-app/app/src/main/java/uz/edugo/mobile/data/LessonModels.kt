package uz.edugo.mobile.data

import kotlinx.serialization.Serializable

@Serializable
data class LessonGroupRef(val id: String = "", val name: String = "")

@Serializable
data class LessonTeacherRef(
    val id: String = "",
    val firstName: String? = null,
    val lastName: String? = null,
    val username: String? = null,
)

@Serializable
data class LessonTest(
    val id: String = "",
    val question: String = "",
    val options: List<String> = emptyList(),
    val order: Int = 0,
)

@Serializable
data class LessonFile(
    val id: String = "",
    val fileName: String = "",
    val kind: String = "FILE",
    val mimeType: String = "application/octet-stream",
    val sizeBytes: Long = 0,
    val previewable: Boolean = false,
)

@Serializable
data class LessonItem(
    val id: String = "",
    val title: String = "",
    val description: String? = null,
    val type: String = "TEXT",
    val category: String = "LESSON",
    val mediaUrl: String? = null,
    val dueAt: String? = null,
    val viewed: Boolean = false,
    val files: List<LessonFile> = emptyList(),
    val groupId: String = "",
    val createdAt: String? = null,
    val group: LessonGroupRef? = null,
    val teacher: LessonTeacherRef? = null,
    val tests: List<LessonTest> = emptyList(),
)
