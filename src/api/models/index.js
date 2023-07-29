import fs from 'fs';
import path from 'path';
import process from 'process';
import { Sequelize } from 'sequelize';

const env = process.env.NODE_ENV || 'development';
import fileData from '../../config/db-config.json' assert { type: 'json' };
let config = fileData[env];
let db = {};

const filePath = import.meta.url;
const basename = path.basename(filePath);
const dirName = path.dirname(filePath);

// Create a Sequelize instance based on the configuration file
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  config.options
);

/**
 * Load all the models from the `models` directory.
 */
async function loadModels() {
  // Read the files in the `models` directory
  const files = await fs.promises.readdir(dirName.replace('file:///', ''));
  /**
   * Filter and return the files based on the following conditions:
   * - Does not start with `.`.
   * @example .gitignore
   * - Is not the basename, which is the name of the file we
   * are importing from.
   * @default index.js
   * - End with `.js` extention
   * @example user.model.js
   * - It does not contain `.test.js`
   * @example user.test.js
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

      // Load the hooks for this model from the hooks directory `models/hooks`
      const hooksPath = await path.join(
        path.dirname(filePath),
        `${modelName.toLowerCase()}.hooks.js`
      );

      // Import the hooks and pass the model instance
      await import(hooksPath)
        .then((hooksModule) => {
          hooksModule.default(model, sequelize);
        })
        .catch((err) => {
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
