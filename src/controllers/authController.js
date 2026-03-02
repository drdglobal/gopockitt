const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../config/database');
const { isValidStudentEmail, getUniversityFromEmail } = require('../utils/emailValidator');
const { sendVerificationEmail } = require('../utils/emailService');

// Student Registration
async function register(req, res) {
    try {
        const { name, email, password, university } = req.body;
        const db = getDatabase();

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required.' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters.' });
        }

        if (!isValidStudentEmail(email)) {
            return res.status(400).json({ error: 'Please use a valid Australian university email (.edu.au).' });
        }

        // Check if email already exists
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
        if (existing) {
            return res.status(409).json({ error: 'An account with this email already exists.' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Generate verification token
        const verificationToken = uuidv4();
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        // Auto-detect university from email
        const detectedUni = university || getUniversityFromEmail(email);

        // Insert user
        const stmt = db.prepare(`
            INSERT INTO users (name, email, password_hash, university, verification_token, verification_expires)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        stmt.run(name.trim(), email.toLowerCase().trim(), passwordHash, detectedUni, verificationToken, verificationExpires);

        // Send verification email
        try {
            await sendVerificationEmail(email.toLowerCase(), verificationToken, name);
        } catch (emailErr) {
            console.error('Failed to send verification email:', emailErr.message);
            // Don't fail registration if email fails — user can request resend later
        }

        res.status(201).json({
            message: 'Account created! Check your email to verify your account.',
            requiresVerification: true
        });
    } catch (err) {
        console.error('Registration error:', err.message);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
}

// Student Login
async function login(req, res) {
    try {
        const { email, password } = req.body;
        const db = getDatabase();

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // For development, auto-verify users
        if (process.env.NODE_ENV === 'development' && !user.email_verified) {
            db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(user.id);
            user.email_verified = 1;
        }

        if (!user.email_verified) {
            return res.status(403).json({ error: 'Please verify your email before logging in. Check your inbox.' });
        }

        // Generate JWT
        const token = jwt.sign(
            { sub: user.id, email: user.email, role: 'student' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                university: user.university
            }
        });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
}

// Email Verification
function verifyEmail(req, res) {
    try {
        const { token } = req.params;
        const db = getDatabase();

        const user = db.prepare('SELECT * FROM users WHERE verification_token = ?').get(token);

        if (!user) {
            return res.redirect('/?verified=invalid');
        }

        if (new Date(user.verification_expires) < new Date()) {
            return res.redirect('/?verified=expired');
        }

        db.prepare('UPDATE users SET email_verified = 1, verification_token = NULL, verification_expires = NULL WHERE id = ?').run(user.id);

        res.redirect('/?verified=true');
    } catch (err) {
        console.error('Verification error:', err.message);
        res.redirect('/?verified=error');
    }
}

// Get Current User
function getMe(req, res) {
    try {
        const db = getDatabase();
        const user = db.prepare('SELECT id, name, email, university, created_at FROM users WHERE id = ?').get(req.user.sub);

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.json({ user });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get user profile.' });
    }
}

// Partner Registration
async function partnerRegister(req, res) {
    try {
        const { businessName, contactName, email, password, phone, businessType, address } = req.body;
        const db = getDatabase();

        if (!businessName || !contactName || !email || !password) {
            return res.status(400).json({ error: 'Business name, contact name, email, and password are required.' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters.' });
        }

        // Check if email already exists
        const existing = db.prepare('SELECT id FROM partners WHERE email = ?').get(email.toLowerCase());
        if (existing) {
            return res.status(409).json({ error: 'An account with this email already exists.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const stmt = db.prepare(`
            INSERT INTO partners (business_name, contact_name, email, password_hash, phone, business_type, address, email_verified)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `);
        stmt.run(businessName.trim(), contactName.trim(), email.toLowerCase().trim(), passwordHash, phone || null, businessType || null, address || null);

        const partner = db.prepare('SELECT id, business_name, contact_name, email, tier FROM partners WHERE email = ?').get(email.toLowerCase().trim());

        // Generate JWT
        const token = jwt.sign(
            { sub: partner.id, email: partner.email, role: 'partner' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.status(201).json({
            message: 'Partner account created!',
            token,
            partner: {
                id: partner.id,
                businessName: partner.business_name,
                contactName: partner.contact_name,
                email: partner.email,
                tier: partner.tier
            }
        });
    } catch (err) {
        console.error('Partner registration error:', err.message);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
}

// Partner Login
async function partnerLogin(req, res) {
    try {
        const { email, password } = req.body;
        const db = getDatabase();

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const partner = db.prepare('SELECT * FROM partners WHERE email = ?').get(email.toLowerCase().trim());
        if (!partner) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const validPassword = await bcrypt.compare(password, partner.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const token = jwt.sign(
            { sub: partner.id, email: partner.email, role: 'partner' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            token,
            partner: {
                id: partner.id,
                businessName: partner.business_name,
                contactName: partner.contact_name,
                email: partner.email,
                tier: partner.tier
            }
        });
    } catch (err) {
        console.error('Partner login error:', err.message);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
}

module.exports = { register, login, verifyEmail, getMe, partnerRegister, partnerLogin };
