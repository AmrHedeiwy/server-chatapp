import passport from 'passport';

import localStrategyService from './local.service.js';
import facebookStrategyService from './facebook.service.js';
import googleStrategyService from './google.service.js';

import { serializeUser, deserializeUser } from './serialization.service.js';

// Local strategy
passport.use('local', localStrategyService);

// Facebook strategy
passport.use('facebook', facebookStrategyService);

// Google strategy
passport.use('google', googleStrategyService);

/**
 * Configures Passport to use serialization and deserialization services
 * for user objects.
 */
passport.serializeUser(serializeUser);
passport.deserializeUser(deserializeUser);

export { passport };
export * as registerService from './register.service.js';
export * as mailerService from './mailer.service.js';
