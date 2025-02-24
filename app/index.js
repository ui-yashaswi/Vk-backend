const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const connectDB = require("../db")
const app = express();
app.use(cors());
app.use(express.json());
const { PhoneNumberUtil } = require('google-libphonenumber');

const phoneUtil = PhoneNumberUtil.getInstance();

connectDB()
const DeviceSchema = new mongoose.Schema({ deviceId: String, name: String, phone: String });
const SuspectedNum  = new mongoose.Schema({ SuspectedNum: String });


const CallLogSchema = new mongoose.Schema({
    deviceId: { type: String }, calls: {
        type: Array
    }
});

const Device = mongoose.model('Device', DeviceSchema);
const CallLog = mongoose.model('CallLog', CallLogSchema);
const CallSuspectedNum = mongoose.model('SuspectedNum', SuspectedNum);



// Register device
app.post('/register', async (req, res) => {
    const { name, phone, deviceId } = req.body;
    console.log(deviceId)
    await Device.findOneAndUpdate({ deviceId }, { deviceId, name, phone }, { upsert: true });
    res.send({ message: 'Device registered' });
});

app.post('/addNumber', async (req, res) => {
  const {  phoneNumber } = req.body;
  await CallSuspectedNum.create({SuspectedNum:phoneNumber});

  res.send({ message: 'Phone number Added' });
});
app.get('/numbers', async (req, res) => {
  const data = await CallSuspectedNum.find();

  res.send({ data,message: 'All Suspected Numbers' });
});
app.delete('/device-delete', async (req, res) => {
    const { deviceId } = req.body;
    console.log(deviceId)
    await Device.findOneAndDelete({ deviceId });
    res.json({responseCode:200, message: 'Device Delete Successfully' });
});// Log call
app.post("/log-call", async (req, res) => {

    try {
        const { deviceId, calls } = req.body;
        console.log(deviceId,calls,"testinf")

        console.log("📞 Incoming Call Logs for Device:", deviceId, calls);

        if (!deviceId || !Array.isArray(calls)) {
            return res.status(400).json({ error: "Invalid request data" });
        }

        // ✅ Overwrite previous logs and keep only the latest 10
        await CallLog.findOneAndUpdate(
            { deviceId },
            { calls: calls.slice(0, 10) }, // Store only latest 10 calls
            { upsert: true, new: true }
        );

        res.json({ message: "✅ Call logs updated successfully!" });
    } catch (error) {
        console.error("❌ Error saving call logs:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/members", async (req, res) => {
    try {
        const data = await Device.find();


        res.json({ data, message: "✅ Call logs fetched successfully!" });
    } catch (error) {
        console.error("❌ Error saving call logs:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
const normalizeNumber = (num) => num.replace(/\D/g, "").slice(-10); 
// 🔹 Removes non-digits & keeps last 10 digits

app.post("/calllogById", async (req, res) => {
    try {
        const { deviceId } = req.body;

        if (!deviceId) {
            return res.status(400).json({ error: "Device ID is required" });
        }

        console.log("Fetching Call Logs for Device:", deviceId);

        // ✅ Fetch call logs by deviceId
        const callLog = await CallLog.findOne({ deviceId });

        if (!callLog || !callLog.calls || callLog.calls.length === 0) {
            return res.status(404).json({ error: "No call logs found for this device" });
        }

        // ✅ Fetch all admin numbers (Suspected Numbers)
        const adminNumbersDocs = await CallSuspectedNum.find({}, { SuspectedNum: 1, _id: 0 });
        const adminNumbers = adminNumbersDocs.map(doc => normalizeNumber(doc.SuspectedNum));

        console.log("🔍 Normalized Admin Numbers:", adminNumbers);

        // ✅ Filter calls that match admin numbers
        const filteredCalls = callLog.calls.filter(call => {
            const normalizedCallNumber = normalizeNumber(call.phoneNumber);
            return adminNumbers.includes(normalizedCallNumber);
        });

        res.json({
            message: "✅ Call logs fetched successfully!",
            suspectedCalls: filteredCalls.length ? filteredCalls : "No suspected numbers found in call logs.",
        });

    } catch (error) {
        console.error("❌ Error fetching call logs:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});





app.get('/detect-calls', async (req, res) => {
  try {
    // Fetch all devices
    const devices = await Device.find({});

    if (devices.length === 0) {
      return res.status(404).json({ error: 'No devices registered' });
    }

    const allInternationalCalls = []; // Holds all international call data

    // Fetch call logs for all devices concurrently
    await Promise.all(devices.map(async (device) => {
      const callLogs = await CallLog.findOne({ deviceId: device.deviceId });

      if (!callLogs) return; // Skip if no call logs found

      callLogs.calls.forEach(call => {
        const phoneNumber = call.phoneNumber;
        try {
          console.log("Original Phone Number:", phoneNumber);

          const parsedPhoneNumber = phoneUtil.parse(phoneNumber, 'IN');
          const countryCode = parsedPhoneNumber.getCountryCode();
          console.log("Extracted Country Code:", countryCode);

          if (countryCode !== 91) { // Exclude India (+91)
            allInternationalCalls.push({
              deviceId: device.deviceId,
              deviceName: device.name,
              phoneNumber: device.phone,
              callDetails: call
            });
          }
        } catch (error) {
          console.error("Parsing Error:", error.message);
        }
      });
    }));

    // If no international calls are found
    if (allInternationalCalls.length === 0) {
      return res.status(200).json({
        allInternationalCalls: [],
        responseCode: 200,
        message: 'No international calls found for any device'
      });
    }

    // Return the final response
    res.json({
      responseCode: 200,
      message: 'International calls retrieved successfully',
      allInternationalCalls
    });

  } catch (error) {
    console.error('Error fetching and filtering international calls:', error);
    res.status(500).json({ error: 'Failed to fetch and validate international calls' });
  }
});


  
  



app.listen(3005, '0.0.0.0', () => console.log('Server running on port 3005'));
