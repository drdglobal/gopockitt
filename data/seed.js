require('dotenv').config();
const { initDatabase, getDatabase } = require('../src/config/database');
const bcrypt = require('bcryptjs');

// Use existing database if already initialized, otherwise init fresh
let db;
try {
    db = getDatabase();
} catch (e) {
    initDatabase();
    db = getDatabase();
}

console.log('Seeding database...');

// Create a demo partner account
const partnerHash = bcrypt.hashSync('password123', 10);

const demoPartners = [
    { business_name: 'Rise & Grind Cafe', contact_name: 'Sarah Chen', email: 'sarah@riseandgrind.com.au', type: 'cafe', address: 'Yagan Square, Perth CBD' },
    { business_name: 'Noodle House Perth', contact_name: 'Mike Wong', email: 'mike@noodlehouse.com.au', type: 'restaurant', address: 'William Street, Perth CBD' },
    { business_name: 'Bean Theory', contact_name: 'Emma Davis', email: 'emma@beantheory.com.au', type: 'cafe', address: 'Murray Street, Perth CBD' },
    { business_name: 'FitHub CBD', contact_name: 'Jack Miller', email: 'jack@fithubcbd.com.au', type: 'fitness', address: 'Hay Street, Perth CBD' },
    { business_name: 'Uni Threads', contact_name: 'Lisa Park', email: 'lisa@unithreads.com.au', type: 'retail', address: 'Murray Street Mall, Perth CBD' },
    { business_name: 'Campus Cuts', contact_name: 'Tom Brown', email: 'tom@campuscuts.com.au', type: 'services', address: 'Barrack Street, Perth CBD' },
    { business_name: 'Pho Street', contact_name: 'Mai Nguyen', email: 'mai@phostreet.com.au', type: 'restaurant', address: 'James Street, Perth CBD' },
    { business_name: 'The Study Brew', contact_name: 'Alex Jones', email: 'alex@studybrew.com.au', type: 'cafe', address: 'Wellington Street, Perth CBD' },
    { business_name: 'Game Zone Perth', contact_name: 'Ryan Lee', email: 'ryan@gamezone.com.au', type: 'entertainment', address: 'Hay Street, Perth CBD' },
];

const insertPartner = db.prepare(`
    INSERT OR IGNORE INTO partners (business_name, contact_name, email, password_hash, business_type, address, email_verified)
    VALUES (?, ?, ?, ?, ?, ?, 1)
`);

for (const p of demoPartners) {
    insertPartner.run(p.business_name, p.contact_name, p.email, partnerHash, p.type, p.address);
}

console.log(`Seeded ${demoPartners.length} partner accounts`);

// Get partner IDs
const partners = db.prepare('SELECT id, business_name FROM partners').all();
const partnerMap = {};
for (const p of partners) {
    partnerMap[p.business_name] = p.id;
}

// Seed the 9 deals (matching the original hardcoded cards)
const deals = [
    {
        partner: 'Rise & Grind Cafe',
        title: 'Student Morning Combo',
        description: 'Large coffee + avocado toast. The perfect start to your uni day.',
        category: 'food',
        location: 'Yagan Square, Perth CBD',
        time: '7am - 11am',
        priceOriginal: '$14.50',
        priceDeal: '$8.50',
        discount: '-41%',
        badge: 'POPULAR',
        emoji: '🥑',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        rating: 4.8
    },
    {
        partner: 'Noodle House Perth',
        title: '$8 Lunch Bowl Special',
        description: 'Choose any noodle bowl with a drink. Over 15 options to choose from!',
        category: 'food',
        location: 'William Street, Perth CBD',
        time: '11am - 3pm',
        priceOriginal: '$15.90',
        priceDeal: '$8.00',
        discount: '-50%',
        badge: 'HOT',
        emoji: '🍜',
        gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        rating: 4.9
    },
    {
        partner: 'Bean Theory',
        title: 'Buy 1 Get 1 Free Coffee',
        description: 'Any coffee, any size. Bring a friend or save one for your afternoon lecture.',
        category: 'coffee',
        location: 'Murray Street, Perth CBD',
        time: 'All day',
        priceOriginal: '$5.50',
        priceDeal: '$2.75',
        discount: 'BOGO',
        badge: 'NEW',
        emoji: '☕',
        gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        rating: 4.7
    },
    {
        partner: 'FitHub CBD',
        title: 'Student Gym Pass - $10/week',
        description: 'Full access to gym, classes, and pool. No lock-in contract for students.',
        category: 'fitness',
        location: 'Hay Street, Perth CBD',
        time: 'All hours',
        priceOriginal: '$25/week',
        priceDeal: '$10/week',
        discount: '-60%',
        badge: 'HOT',
        emoji: '💪',
        gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        rating: 4.6
    },
    {
        partner: 'Uni Threads',
        title: '30% Off All Basics',
        description: 'T-shirts, hoodies, and joggers. Premium quality, student prices.',
        category: 'retail',
        location: 'Murray Street Mall, Perth CBD',
        time: 'All day',
        priceOriginal: '$49.95',
        priceDeal: '$34.97',
        discount: '-30%',
        badge: 'LIMITED',
        emoji: '👕',
        gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        rating: 4.5
    },
    {
        partner: 'Campus Cuts',
        title: '$20 Student Haircut',
        description: 'Professional cut & style. Walk-ins welcome, just show your student ID.',
        category: 'services',
        location: 'Barrack Street, Perth CBD',
        time: 'Tue - Sat',
        priceOriginal: '$40.00',
        priceDeal: '$20.00',
        discount: '-50%',
        badge: 'POPULAR',
        emoji: '💇',
        gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
        rating: 4.8
    },
    {
        partner: 'Pho Street',
        title: 'Student Pho + Spring Roll',
        description: 'Authentic Vietnamese pho with 2 spring rolls. The perfect warm-up meal.',
        category: 'food',
        location: 'James Street, Perth CBD',
        time: '11am - 9pm',
        priceOriginal: '$18.90',
        priceDeal: '$11.90',
        discount: '-37%',
        badge: 'NEW',
        emoji: '🍲',
        gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        rating: 4.7
    },
    {
        partner: 'The Study Brew',
        title: 'All-Day Study Pass',
        description: 'Unlimited drip coffee + WiFi + power. Your new study spot in the CBD.',
        category: 'coffee',
        location: 'Wellington Street, Perth CBD',
        time: '7am - 10pm',
        priceOriginal: '$15.00',
        priceDeal: '$7.00',
        discount: '-53%',
        badge: 'LIMITED',
        emoji: '📚',
        gradient: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
        rating: 4.9
    },
    {
        partner: 'Game Zone Perth',
        title: '2 Hours Gaming for $10',
        description: 'PC or console gaming. Great for between lectures or weekend sessions.',
        category: 'entertainment',
        location: 'Hay Street, Perth CBD',
        time: 'All day',
        priceOriginal: '$24.00',
        priceDeal: '$10.00',
        discount: '-58%',
        badge: 'HOT',
        emoji: '🎮',
        gradient: 'linear-gradient(135deg, #f5576c 0%, #ff6f91 100%)',
        rating: 4.6
    }
];

const insertDeal = db.prepare(`
    INSERT OR IGNORE INTO deals (partner_id, title, business_name, description, category, location,
        time_restriction, price_original, price_deal, discount_label, badge, emoji, gradient, rating)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let dealCount = 0;
for (const d of deals) {
    const partnerId = partnerMap[d.partner];
    if (partnerId) {
        insertDeal.run(partnerId, d.title, d.partner, d.description, d.category,
            d.location, d.time, d.priceOriginal, d.priceDeal, d.discount,
            d.badge, d.emoji, d.gradient, d.rating);
        dealCount++;
    }
}

console.log(`Seeded ${dealCount} deals`);

// Create a demo student account
const studentHash = bcrypt.hashSync('password123', 10);
db.prepare(`
    INSERT OR IGNORE INTO users (name, email, password_hash, university, email_verified)
    VALUES (?, ?, ?, ?, 1)
`).run('Demo Student', 'demo@student.ecu.edu.au', studentHash, 'ecu');

console.log('Seeded demo student account (demo@student.ecu.edu.au / password123)');
console.log('Seeded demo partner accounts (password: password123)');
console.log('\nDatabase seeding complete!');
