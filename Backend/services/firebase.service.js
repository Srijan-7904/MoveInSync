const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let isInitialized = false;

const initializeFirebase = () => {
    if (isInitialized) {
        return true;
    }

    try {
        let serviceAccount = null;

        const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
        const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

        if (serviceAccountPath) {
            const resolvedPath = path.resolve(process.cwd(), serviceAccountPath);
            const fileContent = fs.readFileSync(resolvedPath, 'utf8');
            serviceAccount = JSON.parse(fileContent);
        } else if (serviceAccountRaw) {
            serviceAccount = JSON.parse(serviceAccountRaw);
        } else {
            return false;
        }

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        isInitialized = true;
        return true;
    } catch (err) {
        console.log('Firebase initialization skipped:', err.message);
        return false;
    }
};

const sendPushNotificationToToken = async ({ token, title, body, data = {} }) => {
    if (!token) {
        return;
    }

    const ready = initializeFirebase();
    if (!ready) {
        return;
    }

    const normalizedData = Object.entries(data).reduce((acc, [key, value]) => {
        acc[key] = value == null ? '' : String(value);
        return acc;
    }, {});

    try {
        await admin.messaging().send({
            token,
            notification: {
                title,
                body
            },
            data: normalizedData
        });
    } catch (err) {
        console.log('FCM notification skipped:', err.message);
    }
};

module.exports = {
    sendPushNotificationToToken
};
