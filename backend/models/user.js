const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const CONSTANTS = require('../constants');
const Counter = require('./counter');

// bcrypt cost factor: each +1 doubles the time needed to hash (and to brute-force) a password
const PASSWORD_HASH_ROUNDS = 10;

const userSchema = new mongoose.Schema({
    // Auto-generated unique identifier for the user (format: U-XXXXX)
    userId: {
        type: String,
        required: true,
        unique: true
    },
    // User's unique email address for authentication
    email: {
        type: String,
        required: true,
        unique: true,
        match: [/.+\@.+\..+/, 'Please enter a valid email address']
    },
    // User's password, stored as a bcrypt hash. The complexity rule below is checked
    // against the plain-text password, because validation runs before the pre('save') hook.
    // Excluded from queries unless explicitly requested with .select('+password').
    password: {
        type: String,
        required: true,
        select: false,
        match: [
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/,
            'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
        ]
    },
    // User's full name
    fullname: {
        type: String,
        required: true,
        minlength: 2,
        maxlength: 100
    },
    // User's role defining access permissions
    role: {
        type: String,
        required: true,
        enum: Object.values(CONSTANTS.USER_ROLE)
    },
    // User's contact phone number
    phone: {
        type: String,
        required: true,
        match: [/^(\+61|0)[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{3}$/, 'Please enter a valid Australian phone number']
    }
}, {
    // Automatically adds createdAt and updatedAt timestamps
    timestamps: true
});

userSchema.pre('validate', async function (next) {
    const doc = this;

    if (doc.isNew) {
        try {
            const counter = await Counter.findByIdAndUpdate(
                { _id: 'userId' },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );

            doc.userId = 'U-' + counter.seq.toString().padStart(5, '0');
            next();
        } catch (error) {
            return next(error);
        }
    } else {
        next();
    }
});

// Hash the password whenever it is set or changed
userSchema.pre('save', async function () {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, PASSWORD_HASH_ROUNDS);
    }
});

// Compares a plain-text password with the stored hash.
// The document must have been loaded with .select('+password').
userSchema.methods.checkPassword = function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);