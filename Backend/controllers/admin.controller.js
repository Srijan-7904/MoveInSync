const jwt = require('jsonwebtoken');
const userModel = require('../models/user.model');
const captainModel = require('../models/captain.model');
const rideModel = require('../models/ride.model');

module.exports.loginAdmin = async (req, res) => {
    const { email, password } = req.body;

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@admin.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (email !== adminEmail || password !== adminPassword) {
        return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    const token = jwt.sign(
        { role: 'admin', email: adminEmail },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );

    res.cookie('token', token);
    return res.status(200).json({ token, admin: { email: adminEmail, role: 'admin' } });
};

module.exports.getDashboard = async (req, res) => {
    try {
        const [
            totalUsers,
            totalCaptains,
            totalRides,
            pendingRides,
            acceptedRides,
            ongoingRides,
            completedRides,
            cancelledRides,
            activeCaptains,
            recentRides,
            liveRides
        ] = await Promise.all([
            userModel.countDocuments(),
            captainModel.countDocuments(),
            rideModel.countDocuments(),
            rideModel.countDocuments({ status: 'pending' }),
            rideModel.countDocuments({ status: 'accepted' }),
            rideModel.countDocuments({ status: 'ongoing' }),
            rideModel.countDocuments({ status: 'completed' }),
            rideModel.countDocuments({ status: 'cancelled' }),
            captainModel.countDocuments({ status: 'active' }),
            rideModel.find()
                .sort({ _id: -1 })
                .limit(20)
                .populate('user', 'fullname email')
                .populate('captain', 'fullname email status vehicle location'),
            rideModel.find({ status: { $in: ['pending', 'accepted', 'ongoing'] } })
                .sort({ _id: -1 })
                .limit(20)
                .populate('user', 'fullname email')
                .populate('captain', 'fullname email status vehicle location')
        ]);

        return res.status(200).json({
            summary: {
                totalUsers,
                totalCaptains,
                totalRides,
                activeCaptains
            },
            rideStatus: {
                pending: pendingRides,
                accepted: acceptedRides,
                ongoing: ongoingRides,
                completed: completedRides,
                cancelled: cancelledRides
            },
            liveRides,
            recentRides
        });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to load dashboard data' });
    }
};

module.exports.getAllUsers = async (req, res) => {
    try {
        const users = await userModel.find().select('fullname email phone').limit(50);
        return res.status(200).json(users);
    } catch (err) {
        return res.status(500).json({ message: 'Failed to load users' });
    }
};

module.exports.getAllCaptains = async (req, res) => {
    try {
        const captains = await captainModel.find().select('fullname email phone status vehicle').limit(50);
        return res.status(200).json(captains);
    } catch (err) {
        return res.status(500).json({ message: 'Failed to load captains' });
    }
};
