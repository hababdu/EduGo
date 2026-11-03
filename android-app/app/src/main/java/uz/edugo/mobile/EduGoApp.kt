package uz.edugo.mobile

import android.app.Application
import uz.edugo.mobile.data.Api
import uz.edugo.mobile.data.Session

class EduGoApp : Application() {
    lateinit var session: Session
        private set
    lateinit var api: Api
        private set

    override fun onCreate() {
        super.onCreate()
        session = Session(this)
        api = Api(session)
    }
}
