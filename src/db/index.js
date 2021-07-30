const knex = require("knex")
const { development } = require("../../knexfile")

const { attachPaginate } = require('knex-paginate');
attachPaginate();

module.exports = knex(development)