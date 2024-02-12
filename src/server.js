import scheduledTasks from './lib/taskSchedule.js';
// Importing the Sequelize instnace
import db from './api/models/index.js';

import { server } from './app.js';

// Set the server port
const port = process.env.PORT || 5000;

/**
 * Synchronize the Sequelize database tables with the models and start the server.
 *
 * @function main
 */
(async function main() {
  await db.sequelize.sync();

  /*db.User.bulkCreate([
    {
      username: 'Emna',
      email: 'amr.hedeiwy@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123',
      lastVerifiedAt: new Date()
    },
    {
      username: 'amr',
      email: 'amr.hedeiwyss@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123'
    },
    {
      username: 'amro',
      email: 'amr.hedeissswyaa@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123'
    },
    {
      username: 'ahmed',
      email: 'amr.hedaseiwyaaa@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123'
    },
    {
      username: 'alia',
      email: 'amr.haaedsdseiaawy@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123'
    },
    {
      username: 'abdo',
      email: 'amr.heaadsaddasaaeiwy@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123'
    },
    {
      username: 'abdelrahman',
      email: 'amr.aahedeisway@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123'
    },
    {
      username: 'anthony',
      email: 'amr.aahedessasiwy@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123'
    },
    {
      username: 'andrew',
      email: 'amr.asa@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123'
    },
    {
      username: 'alarm',
      email: 'amr.hedeisssaaaaaaaaasswy@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123'
    },
    {
      username: 'apple',
      email: 'amr.heaadaaaaaesdsadsssiwy@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123'
    },
    {
      username: 'amazing',
      email: 'amr.heaaaaaadeiwdasdsdsssy@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123'
    },
    {
      username: 'ackerman',
      email: 'amr.hedaaaaaaeiwaassssy@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123'
    },
    {
      username: 'abodo_3',
      email: 'amr.heaaadeiwasssssassssy@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123'
    },
    {
      username: 'alia_3',
      email: 'amr.hedeissasdswaya@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123'
    },
    {
      username: 'alala',
      email: 'amr.hedessdiwy@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123'
    },
    {
      username: 'a_moza',
      email: 'amr.hsdsedesiwy@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123'
    },
    {
      username: 'a_bent_moza;)',
      email: 'amr.hedeiwsssadsy@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123'
    }
  ]); */

  scheduledTasks();
  server.listen(port, () => {
    console.log(`server running on port: ${port}`);
  });
})();
