
exports.up = knex =>
  knex.schema.createTable("users", tableBuilder => {
      //id
      tableBuilder.increments("id", { primaryKey: true }).unique()

      //user content
      tableBuilder.string("username", 23).unique().notNullable()
      tableBuilder.string("email", 60).notNullable()
      tableBuilder.string("password").notNullable()
      tableBuilder.boolean("isAdmin").defaultTo(false)

      //2FA
      tableBuilder.boolean("TwoFA").defaultTo(false)
      tableBuilder.string("TwoFAToken")
      tableBuilder.bigInteger("TwoFAExpiresAt")
      tableBuilder.integer("TwoFAConfirmation")
      
      //authentication things
      tableBuilder.string("updatePassToken")
       tableBuilder.bigInteger("updatePassTokenExpiresIn")
      tableBuilder.timestamps(false, true);  
    })


exports.down = knex =>
    knex.schema.dropTable("users")