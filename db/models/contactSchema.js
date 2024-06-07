const mongoose = require('mongoose');
const {conversationSchema} = require('./conversationSchema')


const contactSchema = new mongoose.Schema ({
    emailId: String,
    name: String,
    conversations: [conversationSchema]
});

module.exports = {contactSchema};