const mongoose = require('mongoose');

let listenersRegistered = false;

function connectToDb() {
    const mongoUrl = process.env.MONGODB_URL || process.env.DB_CONNECT;
    
    if (!mongoUrl) {
        console.error('❌ MONGODB_URL not found in environment variables');
        return;
    }

    mongoose.connect(mongoUrl, {
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 5000,
        retryWrites: true,
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 10000,
        waitQueueTimeoutMS: 10000
    })
    .then(() => {
        console.log('✓ Connected to DB');
    })
    .catch(err => {
        console.error('❌ DB Connection Error:', err.message);
        // Retry connection after 5 seconds
        setTimeout(() => {
            console.log('⟳ Retrying database connection...');
            connectToDb();
        }, 5000);
    });

    if (!listenersRegistered) {
        mongoose.connection.on('disconnected', () => {
            console.warn('⚠ MongoDB disconnected');
        });

        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB error:', err.message);
        });

        listenersRegistered = true;
    }
}

module.exports = connectToDb;