package uz.edugo.mobile.ui

import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Assignment
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
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import uz.edugo.mobile.data.AuthUser

private data class Tab(val route: String, val label: String, val icon: ImageVector)

private fun tabsFor(role: Role): List<Tab> = when (role) {
    Role.STUDENT -> listOf(
        Tab("home", "Bosh", Icons.Rounded.Home), Tab("tasks", "Vazifalar", Icons.Rounded.Assignment),
        Tab("ranking", "Reyting", Icons.Rounded.EmojiEvents), Tab("notifications", "Xabarlar", Icons.Rounded.Notifications),
        Tab("profile", "Profil", Icons.Rounded.Person),
    )
    Role.TEACHER -> listOf(
        Tab("home", "Bosh", Icons.Rounded.Home), Tab("groups", "Guruhlar", Icons.Rounded.Groups),
        Tab("notifications", "Xabarlar", Icons.Rounded.Notifications), Tab("profile", "Profil", Icons.Rounded.Person),
    )
    Role.ADMIN, Role.SUPER -> listOf(
        Tab("home", "Bosh", Icons.Rounded.Home), Tab("students", "O'quvchilar", Icons.Rounded.People),
        Tab("groups", "Guruhlar", Icons.Rounded.Groups), Tab("notifications", "Xabarlar", Icons.Rounded.Notifications),
        Tab("profile", "Profil", Icons.Rounded.Person),
    )
    Role.PARENT -> listOf(
        Tab("home", "Farzandlar", Icons.Rounded.Home), Tab("notifications", "Xabarlar", Icons.Rounded.Notifications),
        Tab("profile", "Profil", Icons.Rounded.Person),
    )
}

@Composable
fun MainShell(user: AuthUser) {
    val p = P
    val role = roleOf(user.role)
    val tabs = tabsFor(role)
    val nav = rememberNavController()
    val entry by nav.currentBackStackEntryAsState()
    val current = entry?.destination?.route

    Box {
        AppBackground()
        Scaffold(
            containerColor = Color.Transparent,
            bottomBar = {
                NavigationBar(containerColor = p.surface.copy(alpha = if (p.dark) 0.88f else 0.95f)) {
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
            NavHost(
                navController = nav,
                startDestination = "home",
                modifier = Modifier.padding(pad),
                enterTransition = { fadeIn(tween(260)) + slideInHorizontally(tween(320)) { it / 14 } },
                exitTransition = { fadeOut(tween(160)) },
                popEnterTransition = { fadeIn(tween(260)) },
                popExitTransition = { fadeOut(tween(160)) + slideOutHorizontally(tween(260)) { it / 14 } },
            ) {
                composable("home") {
                    when (role) {
                        Role.STUDENT -> StudentHome(user)
                        Role.TEACHER -> TeacherHome(user) { nav.navigate("group/$it") }
                        Role.ADMIN, Role.SUPER -> AdminHome(user)
                        Role.PARENT -> ParentHome { nav.navigate("child/$it") }
                    }
                }
                composable("tasks") { StudentTasks() }
                composable("ranking") { RankingScreen() }
                composable("groups") { GroupsScreen { nav.navigate("group/$it") } }
                composable("students") { AdminStudents() }
                composable("notifications") { NotificationsScreen() }
                composable("profile") { ProfileScreen(user) }
                composable("group/{id}") { GroupDetailScreen(it.arguments?.getString("id").orEmpty()) { nav.popBackStack() } }
                composable("child/{id}") { ChildScreen(it.arguments?.getString("id").orEmpty()) { nav.popBackStack() } }
            }
        }
    }
}
