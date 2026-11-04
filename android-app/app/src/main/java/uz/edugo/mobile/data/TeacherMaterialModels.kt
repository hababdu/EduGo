package uz.edugo.mobile.data

import kotlinx.serialization.Serializable

@Serializable data class TeacherMaterialStats(val viewed: Int = 0, val total: Int = 0)
@Serializable data class TeacherMaterialGroup(val id: String = "", val name: String = "")
@Serializable data class TeacherMaterialItem(
    val id: String = "",
    val title: String = "",
    val description: String? = null,
    val type: String = "TEXT",
    val category: String = "LESSON",
    val status: String = "DRAFT",
    val mediaUrl: String? = null,
    val dueAt: String? = null,
    val groupId: String = "",
    val group: TeacherMaterialGroup? = null,
    val files: List<LessonFile> = emptyList(),
    val stats: TeacherMaterialStats? = null,
)
@Serializable data class CreateTeacherMaterial(
    val title: String,
    val description: String? = null,
    val type: String = "TEXT",
    val category: String = "LESSON",
    val mediaUrl: String? = null,
    val groupId: String,
    val status: String = "PUBLISHED",
    val dueAt: String? = null,
)
