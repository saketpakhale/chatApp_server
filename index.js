const express = require("express");
require('dotenv').config();
const config = require('./config/config');
const { Server } = require("socket.io");
const { createServer } = require("node:http");
const home = require('./routes/home');
const bodyParser = require("body-parser");
const cors = require("cors");
const PORT = config.port;
const mongoose = require("mongoose");
const {mongoosedb} = require('./db/mongoose');
const {usersMap, addUser, removeUser, getUser} = require('./map');
const {User} = require('./db/models/userSchema')

const app = express();

app.use(cors());
const server = createServer(app);
const io = new Server(server, {cors: {origin: '*'}});
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json({limit: '10mb'}));

app.use("/", home);

io.on("connection", (socket) => {
    
  
    socket.on('addId', (userId) => {
        addUser(userId, socket.id);

        console.log("User connected with email id:",userId,socket.id);
    });
  
    socket.on('send-message', async (msg) => {
        
      const recipientSocketId = getUser(msg.recieverId);
      const senderSocketId = getUser(msg.senderId);
  
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('recieve-message',msg);
      }
      if(senderSocketId) {
        io.to(senderSocketId).emit('recieve-message',msg);
      }
  
      try {
        console.log(msg);
        const sender = await User.findOne({ emailId: msg.senderId });
        const recipient = await User.findOne({ emailId: msg.recieverId });
  
        if (sender && recipient) {
          const existingConversation = sender.contactList.find((contact) => contact.emailId === msg.recieverId);
  
          if (existingConversation) {
            existingConversation.conversations.push(msg);
          } else {
            const newContact = {
              emailId: msg.senderId,
              name: msg.senderId,
              conversations: [msg],
            };
            sender.contactList.push(newContact);
          }
  
          await sender.save();


          const existingConversation2 = recipient.contactList.find((contact) => contact.emailId === msg.senderId);
  
          if (existingConversation2) {
            existingConversation2.conversations.push(msg);
          } else {
            const newContact = {
              emailId: msg.senderId,
              name: msg.senderId,
              conversations: [msg],
            };
            recipient.contactList.push(newContact);
          }
  
          await recipient.save();
        }
  
      } catch (error) {
        console.error("Error handling send-message:", error);
      }


    });



    socket.on("user:call", ({ to, from, offer }) => {
        const recipientSocketId = getUser(to);
        console.log("call request recieved",to, recipientSocketId);
        if(recipientSocketId) {
            console.log("reciever is online")
            io.to(recipientSocketId).emit("incomming:call", { from: from , offer });
        } else {
            console.log("reciever is offline")
            io.to(socket.id).emit("call:disconnect", "call is disconnected");
        }

        
    });

    socket.on("call:accepted", ({ to, from, ans }) => {
        const recipientSocketId = getUser(to);
        io.to(recipientSocketId).emit("call:accepted", { from: from, ans });
    });

    socket.on("call:rejected", ({to}) => {
        console.log("call rejected from ", to);
        const recipientSocketId = getUser(to);
        io.to(recipientSocketId).emit("call:disconnect", "call is disconnected");
    });


    socket.on("peer:nego:needed", ({ to, from, offer }) => {
        const recipientSocketId = getUser(to);
        console.log("peer:nego:needed", offer);
        io.to(recipientSocketId).emit("peer:nego:needed", { from: from, offer });
    });

    socket.on("peer:nego:done", ({ to, from, ans }) => {
        console.log(to);
        const recipientSocketId = getUser(to);
        console.log("peer:nego:done", ans);
        io.to(recipientSocketId).emit("peer:nego:final", { from: from, ans });
        console.log("peer:noge:done");
    });
  
  
  


    socket.on('disconnect', () => {
        removeUser(socket.id);
        console.log('User disconnected');
      });
});

server.listen(PORT, ()=> {
    console.log(`Chat-app is running on port ${PORT}`);
});