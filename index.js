const express = require("express");
const { Server } = require("socket.io");
const { createServer } = require("node:http");
const jwt = require('jsonwebtoken');
const { auth } = require("./middleware");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const MONGOOSE_URL = process.env.MONGOOSE_URL;


const app = express();
app.use(cors());
const server = createServer(app);
const clientOrigin = "http://localhost:3000";
const io = new Server(server, {
    cors: {
        origin: clientOrigin,
    }
});


app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json({limit: '10mb'}));




mongoose.set("strictQuery", false);
const mongopass = process.env.MONGODB_SECRET;
const userDB = mongoose.connect(`{MONGOOSE_URL}`);





const conversationSchema = new mongoose.Schema ({
    senderId: String,
    recieverId: String,
    time: String,
    msg: String,
});
const Conversation = new mongoose.model("Conversation",conversationSchema);


const contactSchema = new mongoose.Schema ({
    emailId: String,
    name: String,
    conversations: [conversationSchema]
});
const Contact = new mongoose.model("Contact",contactSchema);




const userSchema = new mongoose.Schema ({
    emailId: String,
    password: String,
    contactList: [contactSchema],
});
const User = new mongoose.model("User",userSchema);


app.post("/login", async (req,res) => {
    const email = req.body.email;
    const password = req.body.password;
    await User.findOne({emailId:email}).then(found => {
        if (found) {
            if(found.password===password) {
                const token = jwt.sign({id: found.emailId},"secret");   
                res.json({token});
            } else {
                res.send({result: "Incorrect Password"});
            }
        } else {
            res.send({result: "User Not Found"})
        }
    })
});


app.post("/signup", async (req,res) => {
    
    await User.findOne({emailId: req.body.email}).then(async found => {
        if(!found) {
            if(req.body.password === req.body.cnfPassword) {
                const user = {
                    emailId: req.body.email,
                    password: req.body.password,
                    contactList: [],
                }
                const user1 = new User(user);
                await user1.save();
                res.send({result: "User successfully saved"});
            } else {
                res.send({result: "Password and Confirm Password not matching"});
            }
                        
        } else {
          res.send({result: "user already exits"});
        }
        
    })
    
});

app.get("/", auth , async (req,res) => {
    await User.findOne({emailId : req.userId}).then(found => {
        if(found) {
            const contacts = found.contactList;
            res.send(contacts);
        } else {
            res.send({result: "User not found"});
        }
    });
});

app.post("/newcontact",auth, async (req,res) => {
    await User.findOne({emailId : req.userId}).then(async found1 => {
        if(found1) {
            await User.findOne({emailId: req.body.contactId}).then(async found2 => {
                if(found2) {
                    
                    const existingContact = found1.contactList.some((c) => c.emailId === req.body.contactId);

                    if (existingContact) {
                        // Update existing contact
                        const existingContactIndex = found1.contactList.findIndex((c) => c.emailId === req.body.contactId);
                        found1.contactList[existingContactIndex].name = req.body.contactName;
                    } else {
                        // Add new contact
                        const newContact ={
                            emailId: req.body.contactId,
                            name: req.body.contactName,
                            conversations: []
                        }
                        const contact = new Contact(newContact);
                        await contact.save();
                        found1.contactList.push(contact);
                    }

                    await found1.save();
                    res.send({result: "Contact added"})
                } else {
                    res.send({result:"This user does not have an account"})
                }
                
            })
            
        } else {
            res.send({result: "User doesnot Exist"});
        }
    })
})




////// Socket connection

let usersMap = new Map();

const addUser = (userId, socketId) => {
    usersMap.set(userId, socketId);
};

const removeUser = (socketId) => {
    for (const [userId, userSocketId] of usersMap) {
      if (userSocketId === socketId) {
        usersMap.delete(userId);
        break;
      }
    }
  };

const getUser = (userId) => {
    return usersMap.get(userId);
};



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
        const sender = await User.findOne({ emailId: msg.senderId });
        const recipient = await User.findOne({ emailId: msg.recieverId });
  
        if (sender && recipient) {
          // Check if a conversation already exists
          const existingConversation = sender.contactList.find((contact) => contact.emailId === msg.recieverId);
  
          if (existingConversation) {
            // Conversation exists, update it
            existingConversation.conversations.push(msg);
          } else {
            // Conversation doesn't exist, create a new one
            const newContact = {
              emailId: msg.senderId,
              name: msg.senderId,
              conversations: [msg],
            };
            sender.contactList.push(newContact);
          }
  
          // Save the changes
          await sender.save();


          const existingConversation2 = recipient.contactList.find((contact) => contact.emailId === msg.senderId);
  
          if (existingConversation2) {
            // Conversation exists, update it
            existingConversation2.conversations.push(msg);
          } else {
            // Conversation doesn't exist, create a new one
            const newContact = {
              emailId: msg.senderId,
              name: msg.senderId,
              conversations: [msg],
            };
            recipient.contactList.push(newContact);
          }
  
          // Save the changes
          await recipient.save();
        }
  
        // Similar logic for the recipient can be added here if needed
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

server.listen(3001, ()=> {
    console.log("Chat-app is running on port 3001")
});