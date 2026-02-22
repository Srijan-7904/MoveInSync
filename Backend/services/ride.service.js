const rideModel = require('../models/ride.model');
const mapService = require('./maps.service');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

let Razorpay;
try {
    Razorpay = require('razorpay');
    console.log('✓ Razorpay SDK loaded successfully');
} catch (err) {
    console.error('✗ Failed to load Razorpay SDK:', err.message);
    Razorpay = null;
}

let razorpayClient = null;

const getRazorpayClient = () => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!Razorpay) {
        throw new Error('Razorpay SDK is not installed');
    }

    if (!keyId || !keySecret) {
        throw new Error(`Razorpay credentials missing - ID: ${!!keyId}, Secret: ${!!keySecret}`);
    }

    // Always create fresh instance instead of caching
    try {
        return new Razorpay({
            key_id: keyId,
            key_secret: keySecret
        });
    } catch (err) {
        throw new Error(`Failed to create Razorpay instance: ${err.message}`);
    }
};

async function getFare(pickup, destination) {

    if (!pickup || !destination) {
        throw new Error('Pickup and destination are required');
    }

    const distanceTime = await mapService.getDistanceTime(pickup, destination);

    const baseFare = {
        auto: 30,
        car: 50,
        moto: 20
    };

    const perKmRate = {
        auto: 10,
        car: 15,
        moto: 8
    };

    const perMinuteRate = {
        auto: 2,
        car: 3,
        moto: 1.5
    };



    const fare = {
        auto: Math.round(baseFare.auto + ((distanceTime.distance.value / 1000) * perKmRate.auto) + ((distanceTime.duration.value / 60) * perMinuteRate.auto)),
        car: Math.round(baseFare.car + ((distanceTime.distance.value / 1000) * perKmRate.car) + ((distanceTime.duration.value / 60) * perMinuteRate.car)),
        moto: Math.round(baseFare.moto + ((distanceTime.distance.value / 1000) * perKmRate.moto) + ((distanceTime.duration.value / 60) * perMinuteRate.moto))
    };

    return fare;


}

module.exports.getFare = getFare;


function getOtp(num) {
    function generateOtp(num) {
        const otp = crypto.randomInt(Math.pow(10, num - 1), Math.pow(10, num)).toString();
        return otp;
    }
    return generateOtp(num);
}


module.exports.createRide = async ({
    user, pickup, destination, vehicleType
}) => {
    if (!user || !pickup || !destination || !vehicleType) {
        throw new Error('All fields are required');
    }

    const fare = await getFare(pickup, destination);



    const ride = rideModel.create({
        user,
        pickup,
        destination,
        otp: getOtp(6),
        fare: fare[ vehicleType ]
    })

    return ride;
}

module.exports.confirmRide = async ({
    rideId, captain
}) => {
    if (!rideId) {
        throw new Error('Ride id is required');
    }

    await rideModel.findOneAndUpdate({
        _id: rideId
    }, {
        status: 'accepted',
        captain: captain._id
    })

    const ride = await rideModel.findOne({
        _id: rideId
    }).populate('user').populate('captain').select('+otp');

    if (!ride) {
        throw new Error('Ride not found');
    }

    return ride;

}

module.exports.startRide = async ({ rideId, otp, captain }) => {
    if (!rideId || !otp) {
        throw new Error('Ride id and OTP are required');
    }

    const ride = await rideModel.findOne({
        _id: rideId
    }).populate('user').populate('captain').select('+otp');

    if (!ride) {
        throw new Error('Ride not found');
    }

    if (ride.status !== 'accepted') {
        throw new Error('Ride not accepted');
    }

    if (ride.otp !== otp) {
        throw new Error('Invalid OTP');
    }

    await rideModel.findOneAndUpdate({
        _id: rideId
    }, {
        status: 'ongoing'
    })

    return ride;
}

module.exports.endRide = async ({ rideId, captain }) => {
    if (!rideId) {
        throw new Error('Ride id is required');
    }

    const ride = await rideModel.findOne({
        _id: rideId,
        captain: captain._id
    }).populate('user').populate('captain').select('+otp');

    if (!ride) {
        throw new Error('Ride not found');
    }

    if (ride.status === 'completed') {
        return ride;
    }

    if (ride.status !== 'ongoing') {
        throw new Error('Ride not ongoing');
    }

    const completedRide = await rideModel.findOneAndUpdate(
        {
            _id: rideId,
            captain: captain._id,
            status: 'ongoing'
        },
        {
            status: 'completed'
        },
        {
            new: true
        }
    ).populate('user').populate('captain').select('+otp');

    if (!completedRide) {
        const latestRide = await rideModel.findOne({
            _id: rideId,
            captain: captain._id
        }).populate('user').populate('captain').select('+otp');

        if (latestRide?.status === 'completed') {
            return latestRide;
        }

        throw new Error('Unable to complete ride');
    }

    // Update captain stats
    const captainModel = require('../models/captain.model');
    await captainModel.findByIdAndUpdate(
        captain._id,
        {
            $inc: {
                completedTrips: 1,
                earnings: completedRide.fare
            }
        },
        { new: true }
    );

    return completedRide;
}

module.exports.createPaymentOrder = async ({ rideId, user }) => {
    if (!rideId || !user?._id) {
        throw new Error('Ride ID and User ID required');
    }

    // Fetch ride
    const ride = await rideModel.findOne({
        _id: rideId,
        user: user._id
    });

    if (!ride) {
        throw new Error('Ride not found');
    }

    if (ride.paymentID) {
        throw new Error('Ride payment already processed');
    }

    // Get Razorpay client
    const razorpay = getRazorpayClient();

    // Validate amount
    const amount = Math.round(Number(ride.fare) * 100);
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Invalid fare amount');
    }

    // Create order
    try {
        const orderOptions = {
            amount: amount,
            currency: 'INR',
            receipt: `ride_${ride._id.toString().slice(-8)}`,
            notes: {
                rideId: ride._id.toString(),
                userId: user._id.toString()
            }
        };

        const order = await razorpay.orders.create(orderOptions);

        // Store order ID in ride
        await rideModel.findByIdAndUpdate(ride._id, { orderId: order.id });

        return {
            keyId: process.env.RAZORPAY_KEY_ID,
            order: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                receipt: order.receipt
            },
            ride: {
                _id: ride._id,
                fare: ride.fare,
                pickup: ride.pickup,
                destination: ride.destination
            }
        };
    } catch (err) {
        console.error('Razorpay order creation error:', err?.message || err);
        throw new Error(err?.message || 'Failed to create payment order');
    }
};

module.exports.verifyPayment = async ({
    rideId,
    user,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
}) => {
    if (!rideId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw new Error('Incomplete payment verification payload');
    }

    const ride = await rideModel.findOne({
        _id: rideId,
        user: user._id
    });

    if (!ride) {
        throw new Error('Ride not found');
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
        throw new Error('Razorpay secret is missing');
    }

    const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

    if (generatedSignature !== razorpay_signature) {
        throw new Error('Invalid payment signature');
    }

    const updatedRide = await rideModel.findByIdAndUpdate(
        ride._id,
        {
            paymentID: razorpay_payment_id,
            orderId: razorpay_order_id,
            signature: razorpay_signature
        },
        { new: true }
    );

    return updatedRide;
}

