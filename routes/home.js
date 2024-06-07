
const express = require('express');
const router = express.Router();
const config = require('../config/config');
const {User} = require('../db/models/userSchema');
const jwt = require('jsonwebtoken');
const { auth } = require("../middleware"); 
const jwtSecret = config.JWT_SECRET;



router.post("/login", async (req,res) => {
    const email = req.body.email;
    const password = req.body.password;
    await User.findOne({emailId:email}).then(found => {
        if (found) {
            if(found.password===password) {
                const token = jwt.sign({id: found.emailId},jwtSecret);   
                res.json({token});
            } else {
                res.send({result: "Incorrect Password"});
            }
        } else {
            res.send({result: "User Not Found"})
        }
    })
});

 
router.post("/signup", async (req,res) => {
    
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

router.get("/", auth , async (req,res) => {
    await User.findOne({emailId : req.userId}).then(found => {
        if(found) {
            const contacts = found.contactList;
            res.send(contacts);
        } else {
            res.send({result: "User not found"});
        }
    });
});

router.delete("/deletemessage", auth, async (req,res) => {
    const userId = req.userId;
    const message = req.body;
    let reciever;
    if(message.recieverId===userId && message.senderId==userId) {
        reciever = message.recieverId;
    } else if(message.recieverId==userId) {
        reciever = message.senderId;
    } else {
        reciever = message.recieverId;
    }

    const user = await User.findOne({emailId: userId});
    if(user) {
        const contactOne = user.contactList.filter((contact) => contact.emailId === reciever);          
        const conversationOne = contactOne[0].conversations.filter((convo) => convo._id != message._id);
        
        user.contactList.forEach((contact) => {
            if(contact.emailId === reciever) {
                contact.conversations = conversationOne;
            }
        });

        await user.save();
        res.send({message: "message deleted successfully"});

    } else {
        res.send({error: "user not found."});
    }


});

router.post("/newcontact",auth, async (req,res) => {
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
                        found1.contactList.push(newContact);
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
});

module.exports = router;