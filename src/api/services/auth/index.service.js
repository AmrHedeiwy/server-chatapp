/**
 * This module contains the configured instance of Passport
 * authentication library.
 * @module auth
 *
 * Strategies:
 * - Local stragey
 *
 */
import passport from 'passport';
import registerService from './register.service.js';
import localStrategyService from './local.service.js';
import { serializeUser, deserializeUser } from './serialization.service.js';

// Local strategy
passport.use('local', localStrategyService);

/**
 * Configures Passport to use serialization and deserialization services
 * for user objects.
 */
passport.serializeUser(serializeUser);
passport.deserializeUser(deserializeUser);

export { passport, registerService };
