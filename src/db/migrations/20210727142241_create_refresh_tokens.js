
exports.up = knex => 
  knex.schema.createTable("refreshTokens", tableBuilder => {
      //id
      tableBuilder.increments("id", { primaryKey: true }).unique()
      
      //user content
      tableBuilder.string("token")
      tableBuilder.integer("user_id").unsigned()
      tableBuilder.foreign("user_id").references("users.id")
    })


exports.down = knex => 
    knex.schema.dropTable("refreshTokens")
