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
    val storageChatId: String? = null,
    val lastBackupAt: String? = null,
    val lastBackupStatus: String? = null,
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
    val storageChatId: String? = null,
    val lastBackupAt: String? = null,
    val lastBackupStatus: String? = null,
    val createdAt: String? = null,
)
@Serializable data class SuperOrgDetailCounts(val students: Int = 0, val teachers: Int = 0, val admins: Int = 0, val groups: Int = 0)
@Serializable data class SuperOrgGroup(val id: String = "", val name: String = "", val fee: Long? = null, val members: Int = 0, val teacher: String? = null)
@Serializable data class SuperOrgPayments(val month: String = "", val collected: Long = 0, val paidCount: Int = 0, val expected: Long = 0)
@Serializable data class SuperOrgSubscriptionHistory(val month: String = "", val state: String = "UNPAID", val amount: Long = 0, val paidAt: String? = null)
@Serializable data class SuperOrgSubscription(val currentMonth: String = "", val state: String = "UNPAID", val history: List<SuperOrgSubscriptionHistory> = emptyList())
@Serializable data class SuperOrgDetail(
    val org: SuperOrgDetailInfo = SuperOrgDetailInfo(),
    val counts: SuperOrgDetailCounts = SuperOrgDetailCounts(),
    val groups: List<SuperOrgGroup> = emptyList(),
    val studentPayments: SuperOrgPayments = SuperOrgPayments(),
    val subscription: SuperOrgSubscription = SuperOrgSubscription(),
    val admins: List<SuperOrgAdmin> = emptyList(),
    val teachers: List<SuperOrgAdmin> = emptyList(),
)

@Serializable data class CreateSuperOrgBody(val name: String, val storageChatId: String, val note: String? = null)
@Serializable data class UpdateSuperOrgBody(
    val name: String? = null, val note: String? = null, val status: String? = null,
    val monthlyPlanFee: Long? = null, val storageChatId: String? = null,
)
@Serializable data class AssignSuperAdminBody(val userId: String)
@Serializable data class SuperAdminCandidate(val id: String = "", val name: String = "", val username: String? = null, val role: String = "", val organization: SuperCandidateOrg? = null)
@Serializable data class SuperCandidateOrg(val id: String = "", val name: String = "")
@Serializable data class SuperBillingItem(
    val orgId: String = "", val name: String = "", val orgStatus: String = "ACTIVE",
    val fee: Long? = null, val state: String = "UNPAID", val amount: Long = 0,
    val note: String? = null, val paidAt: String? = null,
)
@Serializable data class SuperBillingTotals(val paid: Int = 0, val waived: Int = 0, val unpaid: Int = 0, val collected: Long = 0, val expected: Long = 0)
@Serializable data class SuperBillingOverview(val month: String = "", val items: List<SuperBillingItem> = emptyList(), val totals: SuperBillingTotals = SuperBillingTotals())
@Serializable data class MarkOrgPaymentBody(val month: String, val status: String, val amount: Long? = null, val note: String? = null)
@Serializable data class SuperAuditActor(val name: String = "", val role: String = "")
@Serializable data class SuperAuditItem(
    val id: String = "", val action: String = "", val targetType: String = "", val targetId: String = "",
    val oldValue: kotlinx.serialization.json.JsonElement? = null,
    val newValue: kotlinx.serialization.json.JsonElement? = null,
    val createdAt: String = "", val actor: SuperAuditActor = SuperAuditActor(),
)
@Serializable data class SuperAuditData(
    val total: Int = 0, val page: Int = 1, val pageSize: Int = 30, val pages: Int = 1,
    val actions: List<String> = emptyList(), val items: List<SuperAuditItem> = emptyList(),
)
@Serializable data class SuperAiSettings(
    val enabled: Boolean = true, val limits: Map<String, Int> = emptyMap(),
    val primary: String = "gemini", val fallback: String? = null,
    val models: Map<String, Map<String, String>> = emptyMap(),
)
@Serializable data class SuperAiProvider(
    val primary: String = "gemini", val fallback: String? = null,
    val configured: Map<String, Boolean> = emptyMap(), val active: List<String> = emptyList(),
    val defaults: Map<String, Map<String, String>> = emptyMap(),
)
@Serializable data class SuperAiTopUser(val userId: String? = null, val name: String = "", val role: String? = null, val requests: Int = 0, val tokens: Long = 0)
@Serializable data class SuperAiFeature(val feature: String = "", val requests: Int = 0, val tokens: Long = 0)
@Serializable data class SuperAiDay(val date: String = "", val tokens: Long = 0)
@Serializable data class SuperAiData(
    val settings: SuperAiSettings = SuperAiSettings(), val provider: SuperAiProvider = SuperAiProvider(),
    val topToday: List<SuperAiTopUser> = emptyList(), val features: List<SuperAiFeature> = emptyList(),
    val days: List<SuperAiDay> = emptyList(),
)
@Serializable data class UpdateSuperAiBody(
    val enabled: Boolean? = null, val limits: Map<String, Int>? = null,
    val primary: String? = null, val fallback: String? = null,
    val models: Map<String, Map<String, String>>? = null,
)

@Serializable data class SuperSystemServer(val uptimeSec: Long = 0, val node: String = "", val rssMb: Int = 0, val heapMb: Int = 0, val env: String = "")
@Serializable data class SuperSystemDb(val ok: Boolean = false, val latencyMs: Long = 0, val sizeBytes: Long? = null)
@Serializable data class SuperSystemQueue(
    val gradingRunning: Int = 0, val gradingOverdue: Int = 0,
    val failedSubmissions: Int = 0, val needsReview: Int = 0, val orphanFiles: Int = 0,
)
@Serializable data class SuperSystemData(
    val server: SuperSystemServer = SuperSystemServer(), val db: SuperSystemDb = SuperSystemDb(),
    val config: Map<String, kotlinx.serialization.json.JsonElement> = emptyMap(),
    val queue: SuperSystemQueue = SuperSystemQueue(),
)
