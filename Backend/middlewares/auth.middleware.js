const userModel = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const blackListTokenModel = require('../models/blackListToken.model');
const captainModel = require('../models/captain.model');


module.exports.authUser = async (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[ 1 ];

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        // Check blacklist with timeout
        const isBlacklisted = await Promise.race([
            blackListTokenModel.findOne({ token: token }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Blacklist check timeout')), 3000)
            )
        ]);

        if (isBlacklisted) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded._id);

        req.user = user;
        return next();

    } catch (err) {
        console.error('Auth error:', err.message);
        return res.status(401).json({ message: 'Unauthorized' });
    }
}

module.exports.authCaptain = async (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[ 1 ];

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        // Check blacklist with timeout
        const isBlacklisted = await Promise.race([
            blackListTokenModel.findOne({ token: token }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Blacklist check timeout')), 3000)
            )
        ]);

        if (isBlacklisted) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const captain = await captainModel.findById(decoded._id);

        if (!captain) {
            return res.status(401).json({ message: 'Unauthorized captain' });
        }

        req.captain = captain;
        return next();
        
    } catch (err) {
        console.error('Captain auth error:', err.message);
        return res.status(401).json({ message: 'Unauthorized' });
    }
}

module.exports.authAdmin = async (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[ 1 ];

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        // Check blacklist with timeout
        const isBlacklisted = await Promise.race([
            blackListTokenModel.findOne({ token: token }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Blacklist check timeout')), 3000)
            )
        ]);

        if (isBlacklisted) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== 'admin') {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        req.admin = {
            role: decoded.role,
            email: decoded.email
        };

        return next();
        
    } catch (err) {
        console.error('Admin auth error:', err.message);
        return res.status(401).json({ message: 'Unauthorized' });
    }
}
