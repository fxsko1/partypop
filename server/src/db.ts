import { Pool } from 'pg'

let pool: Pool | null = null

const getPool = () => {
  if (pool) return pool
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) return null
  pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') ? undefined : { rejectUnauthorized: false }
  })
  return pool
}

export const hasDatabaseConfig = () => Boolean(process.env.DATABASE_URL)

export const dbQuery = async (text: string, params: unknown[] = []) => {
  const clientPool = getPool()
  if (!clientPool) {
    throw new Error('DATABASE_URL fehlt')
  }
  return clientPool.query(text, params)
}

export const checkDatabaseConnection = async () => {
  const clientPool = getPool()
  if (!clientPool) {
    return {
      connected: false,
      reason: 'DATABASE_URL fehlt'
    }
  }

  try {
    await clientPool.query('select 1')
    return {
      connected: true
    }
  } catch (error) {
    return {
      connected: false,
      reason: error instanceof Error ? error.message : 'Unbekannter DB-Fehler'
    }
  }
}

export const closeDatabase = async () => {
  if (!pool) return
  await pool.end()
  pool = null
}
