const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'database.json');

// Default initial database state
const INITIAL_DATA = {
  users: [
    {
      id: 'usr_admin_1',
      displayName: 'AAYODHYAM Admin',
      email: 'aayodhyam@walchandsangli.ac.in',
      passwordHash: '$2a$10$wOa12HjS.T06VlGk3P8L3.aV1sL/LqE3mQ7Q8Q.W9Y8R.U0U0U0U0', 
      role: 'admin',
      createdAt: new Date().toISOString(),
    }
  ],
  registrations: [
    {
      id: 'reg_1001',
      registrationId: 'AAY-784920',
      teamName: 'FerroTech Innovators',
      leaderName: 'Rahul Sharma',
      leaderEmail: 'rahul.sharma@coep.ac.in',
      leaderPhone: '9876543210',
      member2: 'Priya Patel',
      member3: 'Amit Deshmukh',
      department: 'Department of Mechanical Engineering',
      year: '3rd Year B.Tech',
      taskId: 1,
      taskTitle: 'Decarburization Zone Measurement',
      transactionId: 'UTR9823471029',
      paymentStatus: 'verified',
      uid: 'usr_demo_1',
      wantsHomeDelivery: false,
      totalFee: 500,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'reg_1002',
      registrationId: 'AAY-319402',
      teamName: 'Titanium Squad',
      leaderName: 'Sneha Kulkarni',
      leaderEmail: 'sneha.k@vnit.ac.in',
      leaderPhone: '9123456780',
      member2: 'Rohan Joshi',
      department: 'Materials Science',
      year: 'Final Year B.Tech',
      taskId: 3,
      taskTitle: 'Automated Grain Size Measurement (Python)',
      transactionId: 'UTR1203948571',
      paymentStatus: 'pending',
      uid: 'usr_demo_2',
      wantsHomeDelivery: true,
      totalFee: 800,
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    }
  ],
  submissions: [],
  announcements: [
    {
      id: 'ann-1',
      title: '🎉 Registrations Now Open!',
      content: 'AAYODHYAM 2026 registrations are officially open. Register your team before slots fill up!',
      category: 'General',
      important: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'ann-2',
      title: '🔬 WCE Lab Usage Policy',
      content: 'Lab facilities are available for final testing & microstructural evaluation only during jury rounds. Heat treatment and specimen pre-processing must be completed at your home institution.',
      category: 'Rule',
      important: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'ann-3',
      title: '📅 Evaluation Schedule Released',
      content: 'Jury evaluations are scheduled for Friday, September 18. Full schedule available on the Timeline page.',
      category: 'Schedule',
      important: false,
      createdAt: new Date().toISOString(),
    }
  ]
};

function initDb() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
  }
}

function readDb() {
  initDb();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading database file:', err);
    return INITIAL_DATA;
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing database file:', err);
  }
}

module.exports = {
  readDb,
  writeDb,
  initDb
};
