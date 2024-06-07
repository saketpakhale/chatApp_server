let config = {
    MONGODB_URL: process.env.MONGODB_SECRET || "http://0.0.0.0.27017/chatappDB",
    JWT_SECRET: process.env.JWT_SECRET || 'jwtsecret',
    clientOrigin: "http://localhost:3000",
    port: 3001
}

module.exports = config;