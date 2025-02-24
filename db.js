const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      "mongodb+srv://taninkisuresh111:ZFUOHRN0wwI9EZ7q@cluster0.x6gch.mongodb.net/Army?retryWrites=true&w=majority&appName=Cluster0", 
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;
