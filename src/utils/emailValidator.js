// Valid Australian university email domains
const VALID_DOMAINS = [
    // Edith Cowan University
    'ecu.edu.au',
    'our.ecu.edu.au',
    // University of Western Australia
    'uwa.edu.au',
    'student.uwa.edu.au',
    // Curtin University
    'curtin.edu.au',
    'student.curtin.edu.au',
    'postgrad.curtin.edu.au',
    // Murdoch University
    'murdoch.edu.au',
    'student.murdoch.edu.au',
    // University of Notre Dame
    'nd.edu.au',
    'my.nd.edu.au',
];

function isValidStudentEmail(email) {
    if (!email || typeof email !== 'string') return false;

    const normalised = email.toLowerCase().trim();

    // Must contain @
    if (!normalised.includes('@')) return false;

    const domain = normalised.split('@')[1];

    // Check against known university domains
    if (VALID_DOMAINS.includes(domain)) return true;

    // Fallback: any .edu.au domain is accepted
    if (domain.endsWith('.edu.au')) return true;

    return false;
}

function getUniversityFromEmail(email) {
    if (!email) return 'other';
    const domain = email.toLowerCase().split('@')[1] || '';

    if (domain.includes('ecu.edu.au')) return 'ecu';
    if (domain.includes('uwa.edu.au')) return 'uwa';
    if (domain.includes('curtin.edu.au')) return 'curtin';
    if (domain.includes('murdoch.edu.au')) return 'murdoch';
    if (domain.includes('nd.edu.au')) return 'notre-dame';
    return 'other';
}

module.exports = { isValidStudentEmail, getUniversityFromEmail };
