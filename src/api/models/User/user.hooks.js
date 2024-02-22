import bcrypt from 'bcrypt';

export default (User) => {
  User.beforeSave(async (user) => {
    if (user.changed('email') && !user.googleId && !user.facebookId) {
      // Keep emails lowercase
      user.email = user.email.toLowerCase();
    }

    if (user.changed('password')) {
      const password = user.password;

      if (password) {
        // Store and hash the plain text password using 12 salt rounds.
        user.password = await bcrypt.hash(password, 12);
      }
    }
  });
};
