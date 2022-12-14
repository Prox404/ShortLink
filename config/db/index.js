const mongoose = require('mongoose');

async function connect() {
    try {
        await mongoose.set("strictQuery", false);
        await mongoose.connect(process.env.CONNECT_URL,{
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connect successfully!!!');
    } catch (error) {
        console.log('Connect failure!!!');
    }
}

module.exports = { connect };