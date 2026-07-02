/**
 * A singleton in-memory DB used as the jest.mock target for '../db'.
 *
 * Because jest.mock() factories are hoisted and cannot reference outer
 * variables, both the factory and the test files need to import the DB from
 * the same module.  This file is that shared module.
 */
const { makeDb } = require('./makeDb');

module.exports = makeDb();
