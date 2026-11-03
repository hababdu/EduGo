package uz.edugo.mobile.ui

import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Assignment
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.Quiz
import androidx.compose.material.icons.rounded.EmojiEvents
import androidx.compose.material.icons.rounded.Groups
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.People
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.sp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.Alignment
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.material3.Icon
import androidx.compose.ui.text.font.FontWeight
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import uz.edugo.mobile.data.AuthUser

private data class Tab(val route: String, val label: String, val icon: ImageVector)

private fun tabsFor(role: Role): List<Tab> = when (role) {
    Role.STUDENT -> listOf(
        Tab("home", "Bosh", Icons.Rounded.Home), Tab("tests", "Testlar", Icons.Rounded.Quiz),
        Tab("tasks", "Vazifalar", Icons.Rounded.Assignment), Tab("ranking", "Reyting", Icons.Rounded.EmojiEvents),
        Tab("ai", "AI", Icons.Rounded.AutoAwesome),
    )
    Role.TEACHER -> listOf(
        Tab("home", "Bosh", Icons.Rounded.Home), Tab("groups", "Guruhlar", Icons.Rounded.Groups),
        Tab("ai", "AI", Icons.Rounded.AutoAwesome),
    )
    Role.ADMIN, Role.SUPER -> listOf(
        Tab("home", "Bosh", Icons.Rounded.Home), Tab("students", "O'quvchilar", Icons.Rounded.People),
        Tab("groups", "Guruhlar", Icons.Rounded.Groups), Tab("ai", "AI", Icons.Rounded.AutoAwesome),
    )
    Role.PARENT -> listOf(Tab("home", "Farzandlar", Icons.Rounded.Home))
}

private val DETAIL_PREFIXES = listOf("group/", "child/", "test/", "task/")

@Composable
fun MainShell(user: AuthUser) {
    val p = P
    val role = roleOf(user.role)
    val tabs = tabsFor(role)
    val nav = rememberNavController()
    val entry by nav.currentBackStackEntryAsState()
    val current = entry?.destination?.route
    val isDetail = current != null && (DETAIL_PREFIXES.any { current.startsWith(it) } || current == "notifications" || current == "profile")
    val showTop = current != null && DETAIL_PREFIXES.none { current.startsWith(it) } && current != "notifications" && current != "profile" && current != "ai"

    Box {
        AppBackground()
        Scaffold(
            containerColor = Color.Transparent,
            bottomBar = {
                if (tabs.size > 1 && !isDetail) NavigationBar(containerColor = p.surface.copy(alpha = if (p.dark) 0.88f else 0.95f)) {
                    tabs.forEach { t ->
                        NavigationBarItem(
                            selected = current == t.route,
                            onClick = {
                                nav.navigate(t.route) {
                                    popUpTo(nav.graph.findStartDestination().id) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = { Icon(t.icon, contentDescription = t.label) },
                            label = { Text(t.label, fontSize = 10.sp, maxLines = 1) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = p.accent, selectedTextColor = p.accent,
                                indicatorColor = p.accent.copy(alpha = 0.16f),
                                unselectedIconColor = p.faint, unselectedTextColor = p.faint,
                            ),
                        )
                    }
                }
            },
        ) { pad ->
          Column(Modifier.padding(pad)) {
            if (showTop) TopBar(user, onBell = { nav.navigate("notifications") }, onProfile = { nav.navigate("profile") })
            NavHost(
                navController = nav,
                startDestination = "home",
                modifier = Modifier.weight(1f),
                enterTransition = { fadeIn(tween(260)) + slideInHorizontally(tween(320)) { it / 14 } },
                exitTransition = { fadeOut(tween(160)) },
                popEnterTransition = { fadeIn(tween(260)) },
                popExitTransition = { fadeOut(tween(160)) + slideOutHorizontally(tween(260)) { it / 14 } },
            ) {
                composable("home") {
                    when (role) {
                        Role.STUDENT -> StudentHome(user) { nav.navigate("task/$it") }
                        Role.TEACHER -> TeacherHome(user) { nav.navigate("group/$it") }
                        Role.ADMIN, Role.SUPER -> AdminHome(user)
                        Role.PARENT -> ParentHome { nav.navigate("child/$it") }
                    }
                }
                composable("tasks") { StudentTasks { nav.navigate("task/$it") } }
                composable("tests") { StudentTests { nav.navigate("test/$it") } }
                composable("ai") { ChatScreen(role) }
                composable("task/{id}") { HomeworkScreen(it.arguments?.getString("id").orEmpty()) { nav.popBackStack() } }
                composable("test/{id}") { TestTakingScreen(it.arguments?.getString("id").orEmpty()) { nav.popBackStack() } }
                composable("ranking") { RankingScreen() }
                composable("groups") { GroupsScreen { nav.navigate("group/$it") } }
                composable("students") { AdminStudents() }
                composable("notifications") { Column { BackHeader("Xabarlar") { nav.popBackStack() }; NotificationsScreen() } }
                composable("profile") { Column { BackHeader("Profil") { nav.popBackStack() }; ProfileScreen(user) } }
                composable("group/{id}") { GroupDetailScreen(it.arguments?.getString("id").orEmpty()) { nav.popBackStack() } }
                composable("child/{id}") { ChildScreen(it.arguments?.getString("id").orEmpty()) { nav.popBackStack() } }
            }
          }
        }
    }
}

@Composable
private fun TopBar(user: AuthUser, onBell: () -> Unit, onProfile: () -> Unit) {
    val p = P
    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
        Text("EduGo", color = p.accent, fontWeight = FontWeight.ExtraBold, fontSize = 22.sp)
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Box(Modifier.pressable(onBell).padding(8.dp)) { Icon(Icons.Rounded.Notifications, contentDescription = "Xabarlar", tint = p.ink) }
            Avatar(user.firstName, Modifier.pressable(onProfile), size = 36.dp)
        }
    }
}
