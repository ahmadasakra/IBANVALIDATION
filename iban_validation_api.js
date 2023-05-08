const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();

app.use(cors());

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

app.get('/api/ibanvalidation', (req, res) => {
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
