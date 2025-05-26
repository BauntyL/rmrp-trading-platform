const { getClient } = require('./server/db');

async function addColumnsToCarListings() {
  try {
    const client = getClient();
    
    console.log('🔧 Adding columns to car_listings table...');
    
    // Добавляем все недостающие колонки
    await client.query(`
      ALTER TABLE car_listings 
      ADD COLUMN IF NOT EXISTS category VARCHAR(50),
      ADD COLUMN IF NOT EXISTS server VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "maxSpeed" INTEGER,
      ADD COLUMN IF NOT EXISTS acceleration VARCHAR(50),
      ADD COLUMN IF NOT EXISTS drive VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "isPremium" BOOLEAN DEFAULT false;
    `);
    
    console.log('✅ All columns added successfully!');
    
    // Проверяем текущую структуру таблицы
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'car_listings'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Current car_listings table structure:');
    console.log('----------------------------------------');
    result.rows.forEach(row => {
      console.log(`${row.column_name.padEnd(15)} | ${row.data_type.padEnd(20)} | Nullable: ${row.is_nullable} | Default: ${row.column_default || 'NULL'}`);
    });
    
    console.log('----------------------------------------');
    console.log('🎉 Migration completed successfully!');
    console.log('💡 Now you can deploy the full car listing functionality!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Запускаем миграцию
addColumnsToCarListings();
