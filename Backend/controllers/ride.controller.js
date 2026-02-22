const rideService = require('../services/ride.service');
const { validationResult } = require('express-validator');
const mapService = require('../services/maps.service');
const { sendMessageToSocketId } = require('../socket');
const rideModel = require('../models/ride.model');
const captainModel = require('../models/captain.model');
const { sendPushNotificationToToken } = require('../services/firebase.service');

const notifyRideParticipantsByPush = async ({ ride, title, body, type }) => {
    if (!ride) {
        return;
    }

    const pushPromises = [];

    if (ride.user?.fcmToken) {
        pushPromises.push(sendPushNotificationToToken({
            token: ride.user.fcmToken,
            title,
            body,
            data: {
                rideId: ride._id,
                type
            }
        }));
    }

    if (ride.captain?.fcmToken) {
        pushPromises.push(sendPushNotificationToToken({
            token: ride.captain.fcmToken,
            title,
            body,
            data: {
                rideId: ride._id,
                type
            }
        }));
    }

    await Promise.allSettled(pushPromises);
};


module.exports.createRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { userId, pickup, destination, vehicleType } = req.body;

    try {
        const ride = await rideService.createRide({ user: req.user._id, pickup, destination, vehicleType });
        res.status(201).json(ride);

        Promise.resolve().then(async () => {
            try {
                const pickupCoordinates = await mapService.getAddressCoordinate(pickup);
                const captainsInRadius = await mapService.getCaptainsInTheRadius(pickupCoordinates.ltd, pickupCoordinates.lng, 2);

                let socketIds = [ ...new Set(
                    captainsInRadius
                        .map((captain) => captain?.socketId)
                        .filter((socketId) => typeof socketId === 'string' && socketId.trim().length > 0)
                ) ];

                if (socketIds.length === 0) {
                    const fallbackCaptains = await captainModel.find({
                        socketId: { $exists: true, $nin: [ null, '' ] }
                    });

                    socketIds = [ ...new Set(
                        fallbackCaptains
                            .map((captain) => captain?.socketId)
                            .filter((socketId) => typeof socketId === 'string' && socketId.trim().length > 0)
                    ) ];
                }

                const rideWithUser = await rideModel.findOne({ _id: ride._id }).populate('user');
                if (!rideWithUser) {
                    return;
                }

                socketIds.forEach((socketId) => {
                    sendMessageToSocketId(socketId, {
                        event: 'new-ride',
                        data: rideWithUser
                    })
                })
            } catch (notifyError) {
                try {
                    const fallbackCaptains = await captainModel.find({
                        socketId: { $exists: true, $nin: [ null, '' ] }
                    });

                    const rideWithUser = await rideModel.findOne({ _id: ride._id }).populate('user');
                    if (!rideWithUser) {
                        return;
                    }

                    const fallbackSocketIds = [ ...new Set(
                        fallbackCaptains
                            .map((captain) => captain?.socketId)
                            .filter((socketId) => typeof socketId === 'string' && socketId.trim().length > 0)
                    ) ];

                    fallbackSocketIds.forEach((socketId) => {
                        sendMessageToSocketId(socketId, {
                            event: 'new-ride',
                            data: rideWithUser
                        })
                    });

                    console.log(`Ride broadcast fallback used: ${fallbackSocketIds.length} captain socket(s)`);
                } catch (fallbackError) {
                    console.log('Ride notification skipped:', fallbackError.message || notifyError.message);
                }
            }
        });

    } catch (err) {

        console.log(err);
        return res.status(500).json({ message: err.message });
    }

};

module.exports.getFare = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { pickup, destination } = req.query;

    try {
        const fare = await rideService.getFare(pickup, destination);
        return res.status(200).json(fare);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

module.exports.confirmRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId } = req.body;

    try {
        const ride = await rideService.confirmRide({ rideId, captain: req.captain });

        sendMessageToSocketId(ride.user.socketId, {
            event: 'ride-confirmed',
            data: ride
        })

        await notifyRideParticipantsByPush({
            ride,
            title: 'Ride Confirmed',
            body: 'Your ride has been confirmed by captain.',
            type: 'ride-confirmed'
        });

        return res.status(200).json(ride);
    } catch (err) {

        console.log(err);
        return res.status(500).json({ message: err.message });
    }
}

module.exports.startRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId, otp } = req.query;

    try {
        const ride = await rideService.startRide({ rideId, otp, captain: req.captain });

        sendMessageToSocketId(ride.user.socketId, {
            event: 'ride-started',
            data: ride
        })

        await notifyRideParticipantsByPush({
            ride,
            title: 'Ride Started',
            body: 'Your ride has started.',
            type: 'ride-started'
        });

        return res.status(200).json(ride);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

module.exports.endRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId } = req.body;

    try {
        const ride = await rideService.endRide({ rideId, captain: req.captain });

        if (ride?.user?.socketId) {
            sendMessageToSocketId(ride.user.socketId, {
                event: 'ride-ended',
                data: ride
            })
        }

        if (ride?.captain?.socketId) {
            sendMessageToSocketId(ride.captain.socketId, {
                event: 'ride-ended',
                data: ride
            })
        }

        await notifyRideParticipantsByPush({
            ride,
            title: 'Ride Ended',
            body: 'Your ride has been completed.',
            type: 'ride-ended'
        });



        return res.status(200).json(ride);
    } catch (err) {
        const knownClientErrors = [
            'Ride id is required',
            'Ride not found',
            'Ride not ongoing',
            'Unable to complete ride'
        ];

        if (knownClientErrors.includes(err.message)) {
            return res.status(400).json({ message: err.message });
        }

        return res.status(500).json({ message: err.message });
    }
}

module.exports.createPaymentOrder = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { rideId } = req.body;
        console.log('Payment request for ride:', rideId);
        
        const data = await rideService.createPaymentOrder({
            rideId,
            user: req.user
        });

        console.log('Payment order created successfully:', data.order?.id);
        return res.status(200).json(data);
    } catch (err) {
        console.error('Payment endpoint error:', err?.message || err);
        return res.status(500).json({ message: err?.message || 'Payment order creation failed' });
    }
}

module.exports.verifyPayment = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { rideId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const ride = await rideService.verifyPayment({
            rideId,
            user: req.user,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        });

        return res.status(200).json({ message: 'Payment verified successfully', ride });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}