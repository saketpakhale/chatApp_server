

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


module.exports = {usersMap, addUser, removeUser, getUser};