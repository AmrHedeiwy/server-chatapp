import db from '../../models/index.js';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';

const User = db.User;

const customFields = {
  usernameField: 'Email',
  passwordField: 'Password'
};

const strategy = new LocalStrategy(customFields, async function (
  Email,
  Password,
  done
) {
  console.log('dddd');
  try {
    const user = await User.findOne({ where: { Email } });

    if (!user) return done(null, false, { message: 'Incorrect Email' });

    const isMatch = await bcrypt.compare(user.dataValues.Password, Password);

    if (!isMatch) return done(null, false, { message: 'Incorrect Password' });

    return done(null, user.dataValues);
  } catch (err) {
    return done(err);
  }
});

passport.use('local', strategy);

export default passport;
