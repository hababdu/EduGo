package uz.edugo.mobile.data

import kotlinx.serialization.Serializable

@Serializable data class PaymentTotalsData(
    val paid: Int = 0, val waived: Int = 0, val unpaid: Int = 0,
    val collected: Double = 0.0, val expected: Double? = null,
)
@Serializable data class PaymentGroupRow(
    val groupId: String, val name: String = "", val monthlyFee: Double? = null,
    val membersCount: Int = 0, val paid: Int = 0, val waived: Int = 0, val unpaid: Int = 0,
    val collected: Double = 0.0, val expected: Double? = null,
)
@Serializable data class PaymentDebtor(
    val studentId: String = "", val name: String = "", val username: String? = null,
    val groupId: String = "", val groupName: String = "", val monthlyFee: Double? = null,
)
@Serializable data class PaymentsOverviewData(
    val month: String = "", val totals: PaymentTotalsData = PaymentTotalsData(),
    val groups: List<PaymentGroupRow> = emptyList(), val debtors: List<PaymentDebtor> = emptyList(),
)
@Serializable data class GroupPaymentStudent(
    val studentId: String, val firstName: String = "", val lastName: String? = null,
    val username: String? = null, val status: String = "UNPAID", val amount: Double = 0.0,
    val note: String? = null, val paidAt: String? = null, val due: Boolean = true,
)
@Serializable data class GroupPaymentsData(
    val groupId: String = "", val name: String = "", val month: String = "",
    val monthlyFee: Double? = null, val students: List<GroupPaymentStudent> = emptyList(),
    val totals: PaymentTotalsData = PaymentTotalsData(),
)
@Serializable data class PaymentMarkRecord(
    val studentId: String, val status: String, val amount: Int? = null, val note: String? = null,
)
@Serializable data class MarkPaymentsBody(val month: String, val records: List<PaymentMarkRecord>)

@Serializable data class LeadItem(
    val id: String, val name: String = "", val phone: String? = null, val source: String? = null,
    val interest: String? = null, val status: String = "NEW", val note: String? = null,
    val nextContactAt: String? = null, val createdAt: String = "",
)
@Serializable data class LeadCounts(
    val NEW: Int = 0, val CONTACTED: Int = 0, val TRIAL: Int = 0, val ENROLLED: Int = 0, val LOST: Int = 0,
)
@Serializable data class LeadsData(val items: List<LeadItem> = emptyList(), val counts: LeadCounts = LeadCounts())
@Serializable data class CreateLeadBody(
    val name: String, val phone: String? = null, val source: String? = null,
    val interest: String? = null, val note: String? = null,
)
@Serializable data class UpdateLeadBody(
    val status: String? = null, val note: String? = null, val nextContactAt: String? = null,
)

@Serializable data class AdminUserItem(
    val id: String, val firstName: String = "", val lastName: String? = null,
    val username: String? = null, val role: String = "STUDENT",
)
@Serializable data class CreateAdminGroupBody(
    val name: String, val description: String? = null, val teacherId: String? = null,
    val monthlyFee: Int? = null, val maxCapacity: Int? = null,
    val lessonDays: List<Int>? = null, val lessonStartTime: String? = null,
    val lessonEndTime: String? = null, val room: String? = null,
)
@Serializable data class AssignGroupTeacherBody(val teacherId: String?)

@Serializable data class UpdateAdminRoleBody(val role: String)

@Serializable data class AddGroupStudentBody(val studentId: String)
@Serializable data class AdminGroupStudentRef(
    val id: String = "", val firstName: String = "", val lastName: String? = null,
    val username: String? = null, val phone: String? = null, val role: String = "STUDENT",
)
@Serializable data class AdminGroupMember(val id: String = "", val student: AdminGroupStudentRef = AdminGroupStudentRef())

@kotlinx.serialization.Serializable data class UpdateAdminGroupSettingsBody(
    val monthlyFee: Int? = null, val maxCapacity: Int? = null,
    val lessonDays: List<Int>? = null, val lessonStartTime: String? = null,
    val lessonEndTime: String? = null, val room: String? = null,
    val telegramChatUrl: String? = null,
)
