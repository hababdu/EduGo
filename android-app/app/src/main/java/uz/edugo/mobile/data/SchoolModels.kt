package uz.edugo.mobile.data

import kotlinx.serialization.Serializable

@Serializable data class SchoolItem(
    val id: String,
    val name: String = "",
    val city: String? = null,
    val about: String? = null,
    val ratingAvg: Double = 0.0,
    val ratingCount: Int = 0,
)
@Serializable data class SchoolCatalog(
    val total: Int = 0,
    val page: Int = 1,
    val pages: Int = 1,
    val items: List<SchoolItem> = emptyList(),
)
@Serializable data class SchoolMembership(
    val id: String,
    val role: String = "STUDENT",
    val status: String = "PENDING",
    val requestedAt: String = "",
    val organization: SchoolItem,
)
