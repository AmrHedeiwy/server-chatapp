import dotenv from 'dotenv';
dotenv.config({ path: './src/.env' });

import fs from 'fs';
import path from 'path';
import process from 'process';
import { Sequelize } from 'sequelize';

let db = {};

const filePath = import.meta.url;
const basename = path.basename(filePath);
const dirName = path.dirname(filePath);

// Create a Sequelize instance based on the configuration file
const sequelize = new Sequelize(
  process.env.POSTGRES_DATABASE,
  process.env.POSTGRES_USER,
  process.env.POSTGRES_PASSWORD,
  {
    host: process.env.POSTGRES_HOST,
    dialect: 'postgres',
    port: process.env.POSTGRES_PORT
  },
  { logging: console.log }
);

/**
 * Load all the models from the `models` directory.
 */
async function loadModels() {
  // Read the files in the `models` directory
  const files = await fs.promises.readdir(
    dirName.replace('file:///', '').replace('app', '')
  );
  /**
   * Filter and return the files based on the following conditions:
   * - Does not start with `.`.
   * @example .gitignore
   * - Is not the basename, which is the name of the file we
   * are importing from.
   * @default index.js
   */
  for (const file of files) {
    if (file !== basename) {
      // Import the model and pass the sequelize instance and sequelize data types.
      const filePath = path.join(
        dirName,
        file,
        `${file.toLowerCase()}.model.js`
      );
      const modelModule = await import(filePath);
      const model = modelModule.default(sequelize, Sequelize.DataTypes);

      const modelName = model.name;
      // load the model to db object
      db[modelName] = model;

      // Load the hooks for this model
      const hooksPath = path.join(
        path.dirname(filePath),
        `${modelName.toLowerCase()}.hooks.js`
      );

      // Import the hooks and pass the model instance
      await import(hooksPath)
        .then((hooksModule) => {
          hooksModule.default(model, sequelize);
        })
        .catch((err) => {
          // console.error(err);
          return;
        });
    }
  }
}

await loadModels();

// // Call the `associate` function for each model, if it exists
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Add the Sequelize instance to the `db` and export it
db.sequelize = sequelize;
export default db;
