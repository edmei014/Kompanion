const sqlite3 = require('sqlite3').verbose();

const dbPath = process.argv[2];

if (!dbPath) {
  console.error('Usage: node query-rigs.js <database-file>');
  process.exit(1);
}

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error(`Failed to open database: ${err.message}`);
    process.exit(1);
  }
});

db.all('SELECT * FROM rigs LIMIT 10', (err, rows) => {
  if (err) {
    console.error(`Failed to query rigs: ${err.message}`);
    db.close();
    process.exit(1);
  }

  rows.forEach((row, index) => {
    const rigName = row.rig_name ?? row.rigName ?? row.name ?? '';
    const ampName = row.amp_name ?? row.ampName ?? row.amp ?? '';
    const author = row.author ?? row.created_by ?? row.creator ?? '';

    console.log(`${index + 1}. Rig: ${rigName}`);
    console.log(`   Amp: ${ampName}`);
    console.log(`   Author: ${author}`);
  });

  db.close((closeErr) => {
    if (closeErr) {
      console.error(`Failed to close database: ${closeErr.message}`);
      process.exit(1);
    }
  });
});
