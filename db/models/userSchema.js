const mongoose = require('mongoose');
const {contactSchema} = require('./contactSchema');

const userSchema = new mongoose.Schema ({
    emailId: String,
    password: String,
    contactList: [contactSchema],
});
const User = new mongoose.model("User",userSchema);

module.exports = {User, userSchema};

