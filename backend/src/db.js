// Conexión a MySQL mediante un pool de mysql2 (consultas parametrizadas)
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'plazavea_ihm',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  // Devuelve DATE/DATETIME como texto ("2026-09-12") para evitar desfases de zona horaria
  dateStrings: true,
  decimalNumbers: true,
});

/** Ejecuta una consulta parametrizada y devuelve solo las filas. */
async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

module.exports = { pool, query };
