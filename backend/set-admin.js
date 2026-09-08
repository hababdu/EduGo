const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://edugo_db_user:i18YT0d21jHaTTzif36l3bZiIlhUnajA@dpg-daem9qht0dsc73ar0pu0-a.oregon-postgres.render.com/edugo_db?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  const res = await client.query('UPDATE "User" SET role = \'ADMIN\' WHERE "telegramId" = \'522311795\'');
  console.log("Muvaffaqiyatli bajarildi! Ozgargan qatorlar:", res.rowCount);
  await client.end();
}

main().catch((e) => {
  console.error("Xatolik:", e.message);
  client.end();
});
