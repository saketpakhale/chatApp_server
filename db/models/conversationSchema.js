const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema ({
    senderId: String,
    recieverId: String,
    time: String,
    msg: String,
});

module.exports = {conversationSchema};