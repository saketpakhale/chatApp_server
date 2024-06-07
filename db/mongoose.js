const mongoosedb = require("mongoose");
const config = require("../config/config");

mongoosedb.set('strictQuery', false);
mongoosedb.connect(config.MONGODB_URL)
.then(() => console.log("connected to mongoDB of chatApp"))
.catch((error) => console.log(error));

module.exports = {mongoosedb};