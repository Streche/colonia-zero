import { PGlite } from '@electric-sql/pglite';

type CheckResult = { name: string; pass: boolean; detail: string };

async function main() {
  const db = new PGlite();
  const results: CheckResult[] = [];

  await db.exec(`
    CREATE TABLE sensores (
      id SERIAL PRIMARY KEY,
      setor_id INT NOT NULL,
      umidade INT NOT NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT now()
    );
  `);
  await db.exec(`
    INSERT INTO sensores (setor_id, umidade) VALUES
      (1, 12), (1, 45), (2, 8), (2, 30), (3, 60);
  `);

  // 1. CTE
  try {
    const res = await db.query(`
      WITH secos AS (
        SELECT setor_id, umidade FROM sensores WHERE umidade < 30
      )
      SELECT * FROM secos ORDER BY umidade;
    `);
    results.push({
      name: 'CTE (WITH)',
      pass: res.rows.length === 2,
      detail: `${res.rows.length} rows returned`,
    });
  } catch (err) {
    results.push({ name: 'CTE (WITH)', pass: false, detail: String(err) });
  }

  // 2. Window function
  try {
    const res = await db.query(`
      SELECT setor_id, umidade,
             AVG(umidade) OVER (PARTITION BY setor_id) AS media_setor
      FROM sensores;
    `);
    results.push({
      name: 'Window function (OVER/PARTITION BY)',
      pass: res.rows.length === 5,
      detail: `${res.rows.length} rows returned`,
    });
  } catch (err) {
    results.push({ name: 'Window function (OVER/PARTITION BY)', pass: false, detail: String(err) });
  }

  // 3. PL/pgSQL function + trigger
  try {
    await db.exec(`
      CREATE TABLE eventos (
        id SERIAL PRIMARY KEY,
        mensagem TEXT NOT NULL,
        criado_em TIMESTAMP NOT NULL DEFAULT now()
      );

      CREATE OR REPLACE FUNCTION registrar_evento_sensor()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO eventos (mensagem)
        VALUES ('sensor inserted: setor ' || NEW.setor_id);
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER trg_sensor_insert
      AFTER INSERT ON sensores
      FOR EACH ROW
      EXECUTE FUNCTION registrar_evento_sensor();
    `);
    await db.exec(`INSERT INTO sensores (setor_id, umidade) VALUES (4, 99);`);
    const res = await db.query(`SELECT * FROM eventos;`);
    results.push({
      name: 'PL/pgSQL function + trigger',
      pass: res.rows.length === 1,
      detail: `${res.rows.length} event(s) recorded by the trigger`,
    });
  } catch (err) {
    results.push({ name: 'PL/pgSQL function + trigger', pass: false, detail: String(err) });
  }

  // 4. EXPLAIN (FORMAT JSON)
  try {
    const res = await db.query<Record<string, unknown>>(
      `EXPLAIN (FORMAT JSON) SELECT * FROM sensores WHERE umidade < 30;`,
    );
    const row = res.rows[0] as Record<string, unknown> | undefined;
    const plan = row?.['QUERY PLAN'];
    const totalCost = Array.isArray(plan)
      ? (plan[0] as { Plan?: Record<string, unknown> })?.Plan?.['Total Cost']
      : undefined;
    results.push({
      name: 'EXPLAIN (FORMAT JSON)',
      pass: typeof totalCost === 'number',
      detail: `Total Cost = ${String(totalCost)}`,
    });
  } catch (err) {
    results.push({ name: 'EXPLAIN (FORMAT JSON)', pass: false, detail: String(err) });
  }

  console.log('\n=== Spike A: PGlite capability validation ===\n');
  for (const r of results) {
    console.log(`${r.pass ? 'PASS' : 'FAIL'} - ${r.name} (${r.detail})`);
  }

  const allPass = results.every((r) => r.pass);
  console.log(`\nOverall result: ${allPass ? 'PASS' : 'FAIL'}`);
  process.exit(allPass ? 0 : 1);
}

main();
