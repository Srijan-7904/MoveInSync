import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, isSupported } from 'firebase/messaging'
import axios from 'axios'

let firebaseApp

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
}

const getFirebaseApp = () => {
    if (!firebaseApp) {
        firebaseApp = initializeApp(firebaseConfig)
    }

    return firebaseApp
}

export const requestAndRegisterFcmToken = async ({ role, authToken }) => {
    if (!role || !authToken) {
        return null
    }

    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
        return null
    }

    if (!import.meta.env.VITE_FIREBASE_VAPID_KEY) {
        return null
    }

    try {
        const messagingSupported = await isSupported()
        if (!messagingSupported) {
            return null
        }

        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
            return null
        }

        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
        const app = getFirebaseApp()
        const messaging = getMessaging(app)

        const fcmToken = await getToken(messaging, {
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: registration
        })

        if (!fcmToken) {
            return null
        }

        const endpoint = role === 'captain'
            ? `${import.meta.env.VITE_BASE_URL}/captains/register-fcm-token`
            : `${import.meta.env.VITE_BASE_URL}/users/register-fcm-token`

        await axios.post(endpoint, { fcmToken }, {
            headers: {
                Authorization: `Bearer ${authToken}`
            }
        })

        return fcmToken
    } catch (err) {
        console.log('FCM registration skipped:', err?.message || err)
        return null
    }
}
