package uz.edugo.mobile.data

import kotlinx.serialization.Serializable

@Serializable data class TeacherMaterialStats(val viewed: Int = 0, val total: Int = 0)
@Serializable data class TeacherMaterialGroup(val id: String = "", val name: String = "")
@Serializable data class MaterialFileDto(
    val id: String,
    val kind: String = "FILE",
    val fileName: String = "",
    val mimeType: String = "application/octet-stream",
    val sizeBytes: Long = 0,
    val order: Int = 0,
    val previewable: Boolean = false,
)
@Serializable data class TeacherMaterialItem(
    val id: String = "",
    val title: String = "",
    val description: String? = null,
    @kotlinx.serialization.EncodeDefault(kotlinx.serialization.EncodeDefault.Mode.ALWAYS) val type: String = "TEXT",
    @kotlinx.serialization.EncodeDefault(kotlinx.serialization.EncodeDefault.Mode.ALWAYS) val category: String = "LESSON",
    val status: String = "DRAFT",
    val mediaUrl: String? = null,
    val dueAt: String? = null,
    val groupId: String = "",
    val group: TeacherMaterialGroup? = null,
    val files: List<MaterialFileDto> = emptyList(),
    val stats: TeacherMaterialStats? = null,
)
@Serializable data class CreateTeacherMaterial(
    val title: String,
    val description: String? = null,
    val type: String = "TEXT",
    val category: String = "LESSON",
    val mediaUrl: String? = null,
    val groupId: String,
    val fileIds: List<String> = emptyList(),
    val status: String = "PUBLISHED",
    @kotlinx.serialization.EncodeDefault(kotlinx.serialization.EncodeDefault.Mode.ALWAYS) val dueAt: String? = null,
)
@Serializable data class UpdateTeacherMaterial(
    val title: String? = null,
    val description: String? = null,
    val type: String? = null,
    val category: String? = null,
    val mediaUrl: String? = null,
    val groupId: String? = null,
    val fileIds: List<String>? = null,
    val status: String? = null,
    @kotlinx.serialization.EncodeDefault(kotlinx.serialization.EncodeDefault.Mode.ALWAYS) val dueAt: String? = null,
)
