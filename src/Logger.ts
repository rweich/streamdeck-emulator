import { apply, reg } from 'loglevel-plugin-prefix';

import logger from 'loglevel';

reg(logger);
apply(logger, { template: '[%t] %l (%n):' });
logger.enableAll();

export default logger;
