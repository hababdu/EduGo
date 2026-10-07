// Bir martalik yordamchi: berilgan Telegram ID'li foydalanuvchini ADMIN qiladi.
// Ishlatish:  DATABASE_URL="postgresql://..." node set-admin.js <telegramId>
// Parol/ulanish satri hech qachon kodga yozilmaydi.
const { Client } = require('pg');

const url = process.env.DATABASE_URL;
const telegramId = process.argv[2];

if (!url || !/^\d{5,15}$/.test(telegramId ?? '')) {
  console.error('Foydalanish: DATABASE_URL=... node set-admin.js <telegramId (raqam)>');
  process.exit(1);
}

const client = new Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  const res = await client.query(
    'UPDATE "User" SET role = \'ADMIN\' WHERE "telegramId" = $1',
    [telegramId],
  );
  console.log('Muvaffaqiyatli bajarildi! O\'zgargan qatorlar:', res.rowCount);
  await client.end();
}

main().catch((e) => {
  console.error('Xatolik:', e.message);
  client.end();
  process.exit(1);
});
