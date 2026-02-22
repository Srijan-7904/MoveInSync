const socketIo = require('socket.io');
const userModel = require('./models/user.model');
const captainModel = require('./models/captain.model');
const rideModel = require('./models/ride.model');
const { sendPushNotificationToToken } = require('./services/firebase.service');

let io;

function initializeSocket(server) {
    io = socketIo(server, {
        cors: {
            origin: '*',
            methods: [ 'GET', 'POST' ]
        }
    });

    io.on('connection', (socket) => {
        console.log(`Client connected: ${socket.id}`);


        socket.on('join', async (data) => {
            const { userId, userType } = data;

            if (userType === 'user') {
                await userModel.findByIdAndUpdate(userId, { socketId: socket.id });
            } else if (userType === 'captain') {
                await captainModel.findByIdAndUpdate(userId, { socketId: socket.id });
            }
        });


        socket.on('update-location-captain', async (data) => {
            const { userId, location } = data;

            if (!location || !location.ltd || !location.lng) {
                return socket.emit('error', { message: 'Invalid location data' });
            }

            await captainModel.findByIdAndUpdate(userId, {
                location: {
                    ltd: location.ltd,
                    lng: location.lng
                }
            });
        });

        socket.on('join-ride-room', (data) => {
            const { rideId } = data || {};

            if (!rideId) {
                return;
            }

            socket.join(`ride:${rideId}`);
        });

        socket.on('ride-chat-message', (data) => {
            const { rideId, message, senderId, senderType, senderName, timestamp } = data || {};

            if (!rideId || !message) {
                return;
            }

            io.to(`ride:${rideId}`).emit('ride-chat-message', {
                rideId,
                message,
                senderId,
                senderType,
                senderName,
                timestamp: timestamp || new Date().toISOString()
            });
        });

        socket.on('ride-webrtc-signal', (data) => {
            const { rideId, signalType, signalData, fromType, fromName } = data || {};

            if (!rideId || !signalType) {
                return;
            }

            socket.to(`ride:${rideId}`).emit('ride-webrtc-signal', {
                rideId,
                signalType,
                signalData,
                fromType,
                fromName
            });
        });

        socket.on('ride-call-ended', (data) => {
            const { rideId, endedBy } = data || {};

            if (!rideId) {
                return;
            }

            socket.to(`ride:${rideId}`).emit('ride-call-ended', {
                rideId,
                endedBy
            });
        });

        socket.on('ride-location-update', (data) => {
            const { rideId, location, senderType, timestamp } = data || {};

            if (!rideId || !location) {
                return;
            }

            socket.to(`ride:${rideId}`).emit('ride-location-update', {
                rideId,
                location,
                senderType,
                timestamp: timestamp || new Date().toISOString()
            });
        });

        socket.on('ride-proximity-alert', async (data) => {
            const { rideId, distanceLeftMeters, message, timestamp } = data || {};

            if (!rideId) {
                return;
            }

            const payload = {
                rideId,
                distanceLeftMeters,
                message: message || 'Only 100m left to destination.',
                timestamp: timestamp || new Date().toISOString()
            };

            io.to(`ride:${rideId}`).emit('ride-proximity-alert', payload);

            try {
                const ride = await rideModel.findById(rideId).populate('user').populate('captain');
                if (!ride) {
                    return;
                }

                const notifyPromises = [];

                if (ride.user?.fcmToken) {
                    notifyPromises.push(sendPushNotificationToToken({
                        token: ride.user.fcmToken,
                        title: 'Ride Update',
                        body: payload.message,
                        data: {
                            type: 'ride-100m-left',
                            rideId: rideId,
                            distanceLeftMeters: distanceLeftMeters
                        }
                    }));
                }

                if (ride.captain?.fcmToken) {
                    notifyPromises.push(sendPushNotificationToToken({
                        token: ride.captain.fcmToken,
                        title: 'Ride Update',
                        body: payload.message,
                        data: {
                            type: 'ride-100m-left',
                            rideId: rideId,
                            distanceLeftMeters: distanceLeftMeters
                        }
                    }));
                }

                await Promise.allSettled(notifyPromises);
            } catch (notifyErr) {
                console.log('Ride proximity push skipped:', notifyErr.message);
            }
        });

        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    });
}

const sendMessageToSocketId = (socketId, messageObject) => {
    if (io) {
        io.to(socketId).emit(messageObject.event, messageObject.data);
    } else {
        console.log('Socket.io not initialized.');
    }
}

module.exports = { initializeSocket, sendMessageToSocketId };