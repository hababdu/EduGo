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

@Serializable data class StudentTrial(
    val id: String,
    val status: String = "REQUESTED",
    val preferredAt: String? = null,
    val scheduledAt: String? = null,
    val decisionNote: String? = null,
    val organization: SchoolItem,
)
@Serializable data class StudentTimetableSlot(
    val id: String,
    val weekday: Int = 1,
    val startTime: String = "",
    val endTime: String = "",
    val room: String? = null,
    val subject: String = "",
    val group: SchoolGroupRef = SchoolGroupRef(),
    val teacher: SchoolTeacherRef = SchoolTeacherRef(),
)
@Serializable data class SchoolGroupRef(val id: String = "", val name: String = "")
@Serializable data class SchoolTeacherRef(val id: String = "", val name: String = "")

@Serializable data class AdminTrialStudent(
    val id: String = "",
    val name: String = "",
    val username: String? = null,
)
@Serializable data class AdminTrialGroup(
    val id: String = "",
    val name: String = "",
)
@Serializable data class AdminTrialItem(
    val id: String,
    val status: String = "REQUESTED",
    val preferredAt: String? = null,
    val scheduledAt: String? = null,
    val note: String? = null,
    val decisionNote: String? = null,
    val group: AdminTrialGroup? = null,
    val student: AdminTrialStudent = AdminTrialStudent(),
    val requestedByParent: Boolean = false,
)
@Serializable data class AdminTrialPage(
    val total: Int = 0,
    val page: Int = 1,
    val pages: Int = 1,
    val items: List<AdminTrialItem> = emptyList(),
)

@Serializable data class MemberUser(
    val id: String = "",
    val name: String = "",
    val username: String? = null,
)
@Serializable data class MemberRow(
    val id: String,
    val role: String = "STUDENT",
    val status: String = "ACTIVE",
    val message: String? = null,
    val requestedAt: String = "",
    val user: MemberUser = MemberUser(),
)
@Serializable data class MemberPage(
    val total: Int = 0,
    val page: Int = 1,
    val pages: Int = 1,
    val items: List<MemberRow> = emptyList(),
)

@Serializable data class SubjectRow(val id: String, val name: String = "")
@Serializable data class NamedRef(val id: String = "", val name: String = "")
@Serializable data class AssignmentRow(
    val id: String,
    val teacher: NamedRef = NamedRef(),
    val subject: NamedRef = NamedRef(),
    val group: NamedRef = NamedRef(),
    val slots: Int = 0,
)
