import registerService from './auth/register.service.js';
import localStrategyService from './auth/localStrategy.service.js';

const strategyService = {
  local: localStrategyService
};

export { registerService, strategyService };
