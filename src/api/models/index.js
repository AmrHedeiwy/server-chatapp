import dotenv from 'dotenv';
dotenv.config({ path: './src/.env' });

import { Sequelize } from 'sequelize';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

let db = {};

const __filename = fileURLToPath(import.meta.url);
const __basename = path.basename(__filename);
const __dirname = path.dirname(__filename);

// Create a Sequelize instance based on the configuration file
const sequelize = new Sequelize(
  process.env.POSTGRES_DATABASE,
  process.env.POSTGRES_USER,
  process.env.POSTGRES_PASSWORD,
  {
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    dialect: 'postgres'
  },
  { logging: console.log }
);

async function loadModels() {
  // Read all the files(models) in the models directory
  const files = fs.readdirSync(__dirname);

  for (const file of files) {
    // Exclude the index.js file (current file)
    if (file !== __basename) {
      // Import the model and pass the sequelize instance and sequelize data types.
      const filePath = path.join(
        process.platform === 'win32' ? 'file://' + __dirname : __dirname,
        file,
        `${file.toLowerCase()}.model.js`
      );
      const modelModule = await import(filePath);
      const model = modelModule.default(sequelize, Sequelize.DataTypes);

      const modelName = model.name;
      // load the model to db object
      db[modelName] = model;

      // Load the hooks for this model (if it exists)
      const hooksPath = path.join(
        path.dirname(filePath),
        `${modelName.toLowerCase()}.hooks.js`
      );

      // Import the hooks and pass the model instance
      await import(hooksPath)
        .then((hooksModule) => {
          hooksModule.default(model, sequelize);
        })
        // The errors generated from not finding the hook file can be ignored, since not all models will have a hooks file for it
        .catch((err) => {
          // console.error(err);
          return;
        });
    }
  }
}

await loadModels();

// Call the `associate` function for each model, if it exists
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Add the Sequelize instance to the `db` and export it
db.sequelize = sequelize;
export default db;
