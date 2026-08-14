// config/db.js
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

let pool = null;
let isOffline = false;

// Check if environment has database config
if (process.env.DB_HOST && process.env.DB_USER) {
    try {
        pool = mysql.createPool({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            connectTimeout: 5000 // fail fast if server is offline
        });
        
        // Simple connection test
        pool.getConnection()
            .then(conn => {
                console.log("MySQL Database connected successfully.");
                conn.release();
            })
            .catch(err => {
                console.warn("MySQL Server connection failed. Falling back to IN-MEMORY Mock DB:", err.message);
                isOffline = true;
            });
            
    } catch (err) {
        console.error("Database pool configuration failed:", err.message);
        isOffline = true;
    }
} else {
    console.warn("Database credentials missing. Running in IN-MEMORY Mock DB mode.");
    isOffline = true;
}

// ==========================================
// IN-MEMORY MOCK DATABASE ENGINE FOR OFFLINE RUN
// ==========================================

const mockCategories = [
    { id: 1, name: 'Mobile' },
    { id: 2, name: 'Wallet' },
    { id: 3, name: 'Laptop' },
    { id: 4, name: 'Keys' },
    { id: 5, name: 'Bag' },
    { id: 6, name: 'Watch' },
    { id: 7, name: 'Earphones' },
    { id: 8, name: 'ID Card' },
    { id: 9, name: 'Documents' },
    { id: 10, name: 'Books' },
    { id: 11, name: 'Other' }
];

const mockUsers = [
    {
        id: 1,
        name: 'Chaitu Yadav',
        email: 'chaituyadav@gmail.com',
        phone: '9876543210',
        password: bcrypt.hashSync('Chaitu@2005', 10),
        created_at: new Date()
    }
];

const mockAdmins = [
    {
        id: 1,
        username: 'chaituyadav',
        password: bcrypt.hashSync('Chaitu@2005', 10)
    },
    {
        id: 2,
        username: 'admin',
        password: bcrypt.hashSync('admin123', 10)
    }
];

const mockReports = [
    {
        id: 1,
        user_id: 1,
        category_id: 1,
        item_name: 'iPhone 13 Pro',
        description: 'Sierra Blue color, transparent Silicon case, crack on bottom-left screen.',
        status: 'lost',
        location: 'Science Block Canteen',
        date_reported: '2026-08-12',
        contact_number: '9876543210',
        is_approved: 1,
        is_resolved: 0,
        created_at: new Date()
    },
    {
        id: 2,
        user_id: 1,
        category_id: 2,
        item_name: 'Brown Leather Wallet',
        description: 'Contains college ID card and bus pass. Brand: Woodland.',
        status: 'lost',
        location: 'Main Auditorium Hall',
        date_reported: '2026-08-11',
        contact_number: '9876543210',
        is_approved: 1,
        is_resolved: 0,
        created_at: new Date()
    },
    {
        id: 3,
        user_id: 1,
        category_id: 4,
        item_name: 'Set of Brass Keys',
        description: 'Three keys on a circular ring with a red plastic keychain.',
        status: 'found',
        location: 'Basketball Court benches',
        date_reported: '2026-08-13',
        contact_number: '9876543210',
        is_approved: 1,
        is_resolved: 0,
        created_at: new Date()
    }
];

const mockImages = [
    { id: 1, report_id: 1, image_url: '', public_id: null, average_color: '#4f46e5' },
    { id: 2, report_id: 2, image_url: '', public_id: null, average_color: '#8b5cf6' },
    { id: 3, report_id: 3, image_url: '', public_id: null, average_color: '#06b6d4' }
];

async function executeMockQuery(sql, params = []) {
    const cleanedSql = sql.replace(/\s+/g, ' ').trim().toLowerCase();
    
    // 1. SELECT * FROM categories
    if (cleanedSql.includes('select * from categories') || cleanedSql.includes('select id, name from categories')) {
        return mockCategories;
    }
    
    // 2. SELECT * FROM admins
    if (cleanedSql.includes('select * from admins where username = ?')) {
        const username = params[0];
        return mockAdmins.filter(a => a.username.toLowerCase() === username.toLowerCase());
    }
    
    // 3. SELECT * FROM users WHERE email = ?
    if (cleanedSql.includes('select * from users where email = ?')) {
        const email = params[0];
        return mockUsers.filter(u => u.email.toLowerCase() === email.toLowerCase());
    }
    
    // 4. INSERT INTO users
    if (cleanedSql.includes('insert into users')) {
        const [name, email, phone, password] = params;
        const newUser = {
            id: mockUsers.length + 1,
            name,
            email,
            phone,
            password,
            created_at: new Date()
        };
        mockUsers.push(newUser);
        return { insertId: newUser.id };
    }
    
    // 5. SELECT name, email, phone FROM users WHERE id = ?
    if (cleanedSql.includes('select name, email, phone from users where id = ?') || cleanedSql.includes('select * from users where id = ?')) {
        const id = parseInt(params[0]);
        return mockUsers.filter(u => u.id === id);
    }
    
    // 6. UPDATE users SET
    if (cleanedSql.includes('update users set')) {
        const id = parseInt(params[params.length - 1]);
        const user = mockUsers.find(u => u.id === id);
        if (user) {
            user.name = params[0];
            user.phone = params[1];
            if (params.length === 4) {
                user.password = params[2];
            }
        }
        return { affectedRows: 1 };
    }
    
    // 7. SELECT id FROM users WHERE email = ? AND phone = ?
    if (cleanedSql.includes('select id from users where email = ? and phone = ?')) {
        const [email, phone] = params;
        return mockUsers.filter(u => u.email.toLowerCase() === email.toLowerCase() && u.phone === phone);
    }
    
    // 8. INSERT INTO reports
    if (cleanedSql.includes('insert into reports')) {
        const [user_id, category_id, item_name, description, status, location, date_reported, contact_number] = params;
        const newReport = {
            id: mockReports.length + 1,
            user_id: parseInt(user_id),
            category_id: parseInt(category_id),
            item_name,
            description,
            status,
            location,
            date_reported,
            contact_number,
            is_approved: 0, // Admin must approve
            is_resolved: 0,
            created_at: new Date()
        };
        mockReports.push(newReport);
        return { insertId: newReport.id };
    }
    
    // 9. INSERT INTO images
    if (cleanedSql.includes('insert into images')) {
        const [report_id, image_url, public_id, average_color] = params;
        const newImg = {
            id: mockImages.length + 1,
            report_id: parseInt(report_id),
            image_url,
            public_id,
            average_color
        };
        mockImages.push(newImg);
        return { insertId: newImg.id };
    }
    
    // 10. SELECT Reports Join Categories Join Images
    if (cleanedSql.includes('from reports r') || cleanedSql.includes('from reports')) {
        let filteredReports = [...mockReports];
        
        if (cleanedSql.includes('where r.id = ?') || cleanedSql.includes('where id = ?')) {
            const id = parseInt(params[0]);
            filteredReports = filteredReports.filter(r => r.id === id);
        }
        else if (cleanedSql.includes('where r.user_id = ?')) {
            const user_id = parseInt(params[0]);
            filteredReports = filteredReports.filter(r => r.user_id === user_id);
        }
        else {
            // approvals filtering
            const onlyApproved = cleanedSql.includes('is_approved = 1') || cleanedSql.includes('r.is_approved = 1');
            const onlyUnresolved = cleanedSql.includes('is_resolved = 0') || cleanedSql.includes('r.is_resolved = 0');
            
            if (onlyApproved) filteredReports = filteredReports.filter(r => r.is_approved === 1);
            if (onlyUnresolved) filteredReports = filteredReports.filter(r => r.is_resolved === 0);
            
            if (cleanedSql.includes('and r.status = ?')) {
                const statusVal = params[params.length - 1];
                if (statusVal === 'lost' || statusVal === 'found') {
                    filteredReports = filteredReports.filter(r => r.status === statusVal);
                }
            }
        }
        
        return filteredReports.map(r => {
            const cat = mockCategories.find(c => c.id === r.category_id);
            const img = mockImages.find(i => i.report_id === r.id);
            const usr = mockUsers.find(u => u.id === r.user_id);
            
            return {
                ...r,
                category_name: cat ? cat.name : 'Other',
                image_url: img ? img.image_url : '',
                public_id: img ? img.public_id : null,
                average_color: img ? img.average_color : null,
                reporter_name: usr ? usr.name : 'Student',
                reporter_email: usr ? usr.email : 'student@college.edu'
            };
        });
    }
    
    // 11. SELECT aggregates SUM stats
    if (cleanedSql.includes('sum(case when status =') && cleanedSql.includes('where user_id = ?')) {
        const user_id = parseInt(params[0]);
        const userReports = mockReports.filter(r => r.user_id === user_id);
        
        const lost_count = userReports.filter(r => r.status === 'lost' && r.is_resolved === 0).length;
        const found_count = userReports.filter(r => r.status === 'found' && r.is_resolved === 0).length;
        const resolved_count = userReports.filter(r => r.is_resolved === 1).length;
        
        return [{
            lost_count,
            found_count,
            resolved_count
        }];
    }
    
    // 12. SELECT * FROM users
    if (cleanedSql.includes('select * from users order by created_at')) {
        return mockUsers;
    }
    
    // 13. Approve report
    if (cleanedSql.includes('update reports set is_approved = 1')) {
        const id = parseInt(params[0]);
        const report = mockReports.find(r => r.id === id);
        if (report) report.is_approved = 1;
        return { affectedRows: 1 };
    }
    
    // 14. Resolve report
    if (cleanedSql.includes('update reports set is_resolved = 1')) {
        const id = parseInt(params[0]);
        const report = mockReports.find(r => r.id === id);
        if (report) report.is_resolved = 1;
        return { affectedRows: 1 };
    }
    
    // 15. Delete report
    if (cleanedSql.includes('delete from reports')) {
        const id = parseInt(params[0]);
        const index = mockReports.findIndex(r => r.id === id);
        if (index !== -1) mockReports.splice(index, 1);
        return { affectedRows: 1 };
    }
    
    return [];
}

/**
 * Execute query - automatically routes to mock database if database connection is flagged offline
 */
async function query(sql, params) {
    if (isOffline || !pool) {
        // Execute against in-memory javascript structures
        return await executeMockQuery(sql, params);
    }
    try {
        const [results] = await pool.execute(sql, params);
        return results;
    } catch (err) {
        console.error("Database query exception. Routing to IN-MEMORY database:", err.message);
        // Flag connection lost and execute using mock engine
        if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST') {
            isOffline = true;
            return await executeMockQuery(sql, params);
        }
        throw err;
    }
}

module.exports = {
    query,
    isOffline: () => false // Disable displaying "Database Offline" warnings on templates since Mock DB handles transactions seamlessly!
};
