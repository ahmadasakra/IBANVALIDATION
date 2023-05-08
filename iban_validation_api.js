const express = require('express');
const cors = require('cors');
//const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

mongoose.set('strictQuery', true);

const app = express();
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);

function generateRandomString(length) {
    return crypto.randomBytes(length).toString('hex');
}
const secretKey = generateRandomString(32); // Generates a 32-byte random string
process.env.JWT_SECRET = secretKey;
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// const apiLimiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 100, // limit each IP to 100 requests per windowMs
//     message: 'Too many requests, please try again later.',
// });

// app.use('/api/', apiLimiter); // apply the rate limit to all routes starting with /api/

function generateAccessToken(username) {
    return jwt.sign(username, process.env.JWT_SECRET, { expiresIn: '1800s' });
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.sendStatus(401);
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
}

function is_valid_iban(iban) {

    // Remove spaces and convert to uppercase
    iban = iban.replace(/\s+/g, '').toUpperCase();

    // Check the basic format
    if (!/^[A-Z]{2}\d{2}[A-Z\d]{4}\d{7}([A-Z\d]?){0,16}$/.test(iban)) {
        return false;
    }

    // Move the first four characters to the end of the string
    iban = iban.slice(4) + iban.slice(0, 4);

    // Replace letters with digits
    const ibanDigits = iban.split('').map(char => {
        if (/\d/.test(char)) {
            return char;
        } else {
            return (char.charCodeAt(0) - 'A'.charCodeAt(0) + 10).toString();
        }
    }).join('');

    // Check if the IBAN is valid using modulo 97
    return BigInt(ibanDigits) % 97n === 1n;
}

app.post('/api/register', async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Error registering user' });
    }
});

app.post('/api/authenticate', async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const user = await User.findOne({ username });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const accessToken = generateAccessToken({ name: username });
        res.json({ accessToken });
    } catch (err) {
        res.status(500).json({ error: 'Error authenticating user' });
    }
});

app.get('/api/ibanvalidation', authenticateToken, (req, res) => {
    const iban = req.query.iban || '';

    const countries = {
        'AD': 'Andorra',
        'AE': 'United Arab Emirates',
        'AL': 'Albania',
        'AT': 'Austria',
        'AZ': 'Azerbaijan',
        'BA': 'Bosnia and Herzegovina',
        'BE': 'Belgium',
        'BG': 'Bulgaria',
        'BH': 'Bahrain',
        'BR': 'Brazil',
        'BY': 'Belarus',
        'CH': 'Switzerland',
        'CR': 'Costa Rica',
        'CY': 'Cyprus',
        'CZ': 'Czech Republic',
        'DE': 'Germany',
        'DK': 'Denmark',
        'DO': 'Dominican Republic',
        'DZ': 'Algeria',
        'EE': 'Estonia',
        'ES': 'Spain',
        'FI': 'Finland',
        'FO': 'Faroe Islands',
        'FR': 'France',
        'GB': 'United Kingdom',
        'GE': 'Georgia',
        'GI': 'Gibraltar',
        'GL': 'Greenland',
        'GR': 'Greece',
        'GT': 'Guatemala',
        'HR': 'Croatia',
        'HU': 'Hungary',
        'IE': 'Ireland',
        'IL': 'Israel',
        'IQ': 'Iraq',
        'IR': 'Iran',
        'IS': 'Iceland',
        'IT': 'Italy',
        'JO': 'Jordan',
        'KW': 'Kuwait',
        'KZ': 'Kazakhstan',
        'LB': 'Lebanon',
        'LI': 'Liechtenstein',
        'LT': 'Lithuania',
        'LU': 'Luxembourg',
        'LV': 'Latvia',
        'MC': 'Monaco',
        'MD': 'Moldova',
        'ME': 'Montenegro',
        'MK': 'North Macedonia',
        'MR': 'Mauritania',
        'MT': 'Malta',
        'MU': 'Mauritius',
        'MZ': 'Mozambique',
        'NL': 'Netherlands',
        'NO': 'Norway',
        'PK': 'Pakistan',
        'PL': 'Poland',
        'PS': 'Palestine',
        'PT': 'Portugal',
        'QA': 'Qatar',
        'RO': 'Romania',
        'RS': 'Serbia',
        'SA': 'Saudi Arabia',
        'SE': 'Sweden',
        'SI': 'Slovenia',
        'SK': 'Slovakia',
        'SM': 'San Marino',
        'ST': 'São Tomé and Príncipe',
        'SV': 'El Salvador',
        'TL': 'Timor-Leste',
        'TN': 'Tunisia',
        'TR': 'Turkey',
        'UA': 'Ukraine',
        'VG': 'British Virgin Islands',
        'XK': 'Kosovo',
    };

    if (!iban) {
        res.status(400).json({ error: 'Missing IBAN parameter' });
        return;
    }

    const valid = is_valid_iban(iban);
    const country = valid ? iban.slice(0, 2) : null;

    if (valid) {
        res.json({
            iban: iban,
            valid: valid,
            country_code: country,
            country_name: countries[country] || null,
        });
    } else {
        res.status(400).json({
            error: 'Invalid IBAN',
            iban: iban,
        });
    }

});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
