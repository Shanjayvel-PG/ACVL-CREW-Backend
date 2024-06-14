import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import qs from "qs";
import cors from "cors";


dotenv.config();

const app = express();
const port = process.env.X_ZOHO_CATALYST_LISTEN_PORT || 9000;

app.use(cors());
app.use(express.json());

// Set up a route to respond with "Hello World!"
app.get('/', (req, res) => {
  res.send('Hello World!');
});



// Route to fetch data from Zoho Sheets and send it to the client
app.get('/zoho-data', async (req, res) => {
  try {
    const data = await fetchDataFromZohoSheets(process.env.ZOHO_RESOURCE_ID, process.env.ZOHO_WORKSHEET_NAME);
    res.json(data); // Use res.json to send JSON data
  } catch (error) {
    console.error("Error in /zoho-data:", error);
    res.status(500).send(`Failed to fetch data from Zoho Sheets: ${error.message}`);
  }
});

// Start the Express server
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
  console.log(`http://localhost:${port}/`);
});


// Access token management
let accessToken = null;
let accessTokenTimestamp = null;

const getAccessToken = async () => {
  if (accessToken && (Date.now() - accessTokenTimestamp) < 3500000) {
    return accessToken;
  }
  try {
    const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
      params: {
        refresh_token: process.env.ZOHO_REFRESH_TOKEN,
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        grant_type: 'refresh_token'
      }
    });
    accessToken = response.data.access_token;
    accessTokenTimestamp = Date.now();
    return accessToken;
  } catch (error) {
    console.error("Error refreshing access token:", error.response ? JSON.stringify(error.response.data) : error.message);
    throw new Error(`Error refreshing access token: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
  }
};

// Function to fetch data from Zoho Sheets
const fetchDataFromZohoSheets = async (fileResourceID, sheetName) => {
  try {
    const accessToken = await getAccessToken();
    const endpointURL = `https://sheet.zoho.com/api/v2/${fileResourceID}`;
    const headers = {
      'Authorization': `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    const data = {
      worksheet_name: sheetName,
      method: 'worksheet.records.fetch',
      is_case_sensitive: false
    };

    const response = await axios.post(endpointURL, qs.stringify(data), { headers: headers });
    return response.data;
  } catch (error) {
    console.error('Error fetching data from Zoho Sheets:', error.response ? JSON.stringify(error.response.data) : error.message);
    throw new Error(`Error fetching data from Zoho Sheets: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
  }
};
