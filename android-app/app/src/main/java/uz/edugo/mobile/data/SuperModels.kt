package uz.edugo.mobile.data

import kotlinx.serialization.Serializable

@Serializable data class SuperOrgCounts(val active: Int = 0, val suspended: Int = 0)
@Serializable data class SuperUserCounts(val total: Int = 0, val roles: Map<String, Int> = emptyMap(), val active7d: Int = 0)
@Serializable data class SuperFileStats(val count: Int = 0, val bytes: Long = 0)
@Serializable data class SuperAiStats(val requests: Int = 0, val tokens: Long = 0)
@Serializable data class SuperOverview(
    val organizations: SuperOrgCounts = SuperOrgCounts(),
    val users: SuperUserCounts = SuperUserCounts(),
    val groups: Int = 0,
    val tests: Int = 0,
    val files: SuperFileStats = SuperFileStats(),
    val aiToday: SuperAiStats = SuperAiStats(),
)

@Serializable data class SuperOrgAdmin(val id: String = "", val name: String = "", val username: String? = null)
@Serializable data class SuperOrganization(
    val id: String = "",
    val name: String = "",
    val status: String = "ACTIVE",
    val note: String? = null,
    val createdAt: String? = null,
    val monthlyPlanFee: Long? = null,
    val users: Int = 0,
    val groups: Int = 0,
    val admins: List<SuperOrgAdmin> = emptyList(),
)

@Serializable data class SuperOrgDetailInfo(
    val id: String = "",
    val name: String = "",
    val status: String = "ACTIVE",
    val note: String? = null,
    val monthlyPlanFee: Long? = null,
)
@Serializable data class SuperOrgDetailCounts(val students: Int = 0, val teachers: Int = 0, val admins: Int = 0, val groups: Int = 0)
@Serializable data class SuperOrgGroup(val id: String = "", val name: String = "", val fee: Long? = null, val members: Int = 0, val teacher: String? = null)
@Serializable data class SuperOrgPayments(val month: String = "", val collected: Long = 0, val paidCount: Int = 0, val expected: Long = 0)
@Serializable data class SuperOrgSubscription(val currentMonth: String = "", val state: String = "UNPAID")
@Serializable data class SuperOrgDetail(
    val org: SuperOrgDetailInfo = SuperOrgDetailInfo(),
    val counts: SuperOrgDetailCounts = SuperOrgDetailCounts(),
    val groups: List<SuperOrgGroup> = emptyList(),
    val studentPayments: SuperOrgPayments = SuperOrgPayments(),
    val subscription: SuperOrgSubscription = SuperOrgSubscription(),
)
