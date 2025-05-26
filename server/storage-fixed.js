const { getClient } = require('./db');

// ИСПРАВЛЕННАЯ ВЕРСИЯ С ПРАВИЛЬНЫМИ КОЛОНКАМИ
async function createApplication(applicationData) {
  try {
    const client = getClient();
    const { brand, model, year, price, description, createdBy } = applicationData;
    
    console.log('📝 Creating application with data:', {
      brand, model, year, price, description, createdBy
    });
    
    // ПОПРОБУЕМ ОБА ВАРИАНТА
    let result;
    try {
      result = await client.query(
        `INSERT INTO car_applications (brand, model, year, price, description, "createdBy") 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [brand, model, year, price, description, createdBy]
      );
    } catch (err1) {
      console.log('📍 Trying snake_case column...');
      result = await client.query(
        `INSERT INTO car_applications (brand, model, year, price, description, created_by) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [brand, model, year, price, description, createdBy]
      );
    }
    
    console.log(`✅ Application created:`, result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error creating application:', error);
    throw error;
  }
}

async function getApplications() {
  try {
    const client = getClient();
    
    // ПОПРОБУЕМ ОБА ВАРИАНТА
    let result;
    try {
      result = await client.query(`
        SELECT 
          a.*,
          u.username as creator_name
        FROM car_applications a
        LEFT JOIN users u ON a."createdBy" = u.id
        ORDER BY a.created_at DESC
      `);
    } catch (err1) {
      console.log('📍 Trying snake_case join...');
      result = await client.query(`
        SELECT 
          a.*,
          u.username as creator_name
        FROM car_applications a
        LEFT JOIN users u ON a.created_by = u.id
        ORDER BY a.created_at DESC
      `);
    }
    
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting applications:', error);
    throw error;
  }
}

async function getCarListings() {
  try {
    const client = getClient();
    
    // ПОПРОБУЕМ ОБА ВАРИАНТА
    let result;
    try {
      result = await client.query(`
        SELECT 
          c.*,
          u.username as owner_name
        FROM car_listings c
        LEFT JOIN users u ON c."ownerId" = u.id
        ORDER BY c.created_at DESC
      `);
    } catch (err1) {
      console.log('📍 Trying snake_case for car listings...');
      result = await client.query(`
        SELECT 
          c.*,
          u.username as owner_name
        FROM car_listings c
        LEFT JOIN users u ON c.owner_id = u.id
        ORDER BY c.created_at DESC
      `);
    }
    
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting car listings:', error);
    throw error;
  }
}

// ОСТАЛЬНЫЕ ФУНКЦИИ...
async function getUserApplications(userId) {
  try {
    const client = getClient();
    
    let result;
    try {
      result = await client.query(
        'SELECT * FROM car_applications WHERE "createdBy" = $1 ORDER BY created_at DESC',
        [userId]
      );
    } catch (err1) {
      result = await client.query(
        'SELECT * FROM car_applications WHERE created_by = $1 ORDER BY created_at DESC',
        [userId]
      );
    }
    
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting user applications:', error);
    throw error;
  }
}

// ЭКСПОРТ (КОПИРУЙТЕ ВСЕ ОСТАЛЬНЫЕ ФУНКЦИИ ИЗ СТАРОГО ФАЙЛА)
module.exports = {
  createApplication,
  getApplications,
  getCarListings,
  getUserApplications,
  // ... остальные функции
};
