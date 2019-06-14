const {defaults} = require('jest-config');

module.exports = {
    ...defaults,
    verbose: true,
    transform: {
        '^.+\\.js$': 'babel-jest',
    },
    roots: [
        '<rootDir>/src/',
    ]
};