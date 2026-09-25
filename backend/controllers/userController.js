const User = require('../models/user');
const { signToken } = require('../tokens');

// The user fields that are safe to send to the client
const toUserResponse = (user) => ({
    _id: user._id,
    userId: user.userId,
    fullname: user.fullname,
    email: user.email,
    role: user.role
});

/**
 * @desc    Handle new user registration
 * @route   POST /api/register
 */
exports.registerUser = async (req, res) => {
    try {
        const { fullname, email, phone, password, role } = req.body;

        if (await User.findOne({ email: email })) {
            return res.status(409).json({ error: 'An account with this email already exists.' });
        }

        const newUser = new User({ fullname, email, phone, password, role });
        await newUser.save();

        // Send a success response
        res.status(201).json({ message: 'Registration successful' });

    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ error: messages.join(', ') });
        }
        if (error.code === 11000) {
            // Another request registered the same email in the meantime
            return res.status(409).json({ error: 'An account with this email already exists.' });
        }
        console.error(error);
        res.status(500).json({ error: 'Server error during registration.' });
    }
};

/**
 * @desc    Handle user login and issue a login token
 * @route   POST /api/login
 */
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Reject non-string values, such as query objects like { "$ne": null }
        if (typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const user = await User.findOne({ email: email }).select('+password');

        if (!user || !(await user.checkPassword(password))) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        res.status(200).json({ token: signToken(user), user: toUserResponse(user) });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred during login.' });
    }
};

/**
 * @desc    Get the user that the request's login token belongs to
 * @route   GET /api/session
 */
exports.getCurrentUser = async (req, res) => {
    try {
        const user = await User.findOne({ userId: res.locals.loggedInUser.userId }).lean();

        if (!user) {
            return res.status(401).json({ error: 'This account no longer exists.' });
        }
        res.status(200).json({ user: toUserResponse(user) });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to load the current user.' });
    }
};
