// Update with your config settings.
require("dotenv").config()

module.exports = {

  development: {
    client: 'mysql',
    connection: {
      database: 'restFulApi',
      user:     process.env.DB_USER,
      password: process.env.DB_PASS
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: `${__dirname}/src/db/migrations`
    },
    seed: {
      tableName: 'knex_seeds',
      directory: `${__dirname}/src/db/migrations`
    }
  },

};
