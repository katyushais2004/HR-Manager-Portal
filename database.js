const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = new sqlite3.Database(path.join(__dirname, 'database.db'), (err) => {
            if (err) {
                console.error('Ошибка подключения к БД:', err);
            } else {
                console.log('Подключено к SQLite базе данных');
                this.initialize();
            }
        });
    }

    initialize() {
        // Таблица специалистов
        this.db.run(`
            CREATE TABLE IF NOT EXISTS specialists (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                available_from TEXT NOT NULL,
                available_to TEXT NOT NULL,
                skills TEXT
            )
        `, (err) => {
            if (err) console.error('Ошибка создания таблицы specialists:', err);
            else console.log('Таблица specialists готова');
        });

        // Таблица собеседований
        this.db.run(`
            CREATE TABLE IF NOT EXISTS interviews (
                id TEXT PRIMARY KEY,
                candidate_name TEXT NOT NULL,
                time TEXT NOT NULL,
                skills TEXT,
                specialist_id TEXT,
                FOREIGN KEY (specialist_id) REFERENCES specialists (id)
            )
        `, (err) => {
            if (err) console.error('Ошибка создания таблицы interviews:', err);
            else console.log('Таблица interviews готова');
        });

        // Таблица навыков
        this.db.run(`
            CREATE TABLE IF NOT EXISTS skills (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL
            )
        `, (err) => {
            if (err) console.error('Ошибка создания таблицы skills:', err);
            else console.log('Таблица skills готова');
        });
    }

    query(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        });
    }

    async insert(table, data) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map(() => '?').join(', ');
        
        const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
        return await this.run(sql, values);
    }

    async update(table, data, where) {
        const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
        const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
        const values = [...Object.values(data), ...Object.values(where)];
        
        const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
        return await this.run(sql, values);
    }

    async deleteRow(table, where) {
        const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
        const values = Object.values(where);
        
        const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
        return await this.run(sql, values);
    }

    async getAll(table) {
        return await this.query(`SELECT * FROM ${table}`);
    }

    async getById(table, id) {
        const rows = await this.query(`SELECT * FROM ${table} WHERE id = ?`, [id]);
        return rows[0] || null;
    }
}

module.exports = new Database();