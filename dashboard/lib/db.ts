import { Pool } from "pg"

const pool = new Pool({
  host: "aws-1-ap-northeast-1.pooler.supabase.com",
  port: 6543,
  database: "postgres",
  user: "postgres.pzhbrftsvgeduinykach",
  password: "4C5^tsY?AN49^q7",
  ssl: { rejectUnauthorized: false },
})

export default pool