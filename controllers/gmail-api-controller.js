const { axios } = require("axios");
const fs = require("fs").promises;
const path = require("path");
const process = require("process");
const { generateConfig } = require("../utils");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

const TOKEN_PATH = path.join(process.cwd(), "./token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "./credentials.json");
const TOPIC_NAME = "projects/prodesk-poc/topics/prodesk";
const OAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REFRESH_TOKEN
);

// Connect to Pub Sub
async function connectPubSub(auth) {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.watch({
    userId: "me",
    requestBody: {
      labelIds: ["INBOX"],
      topicName: TOPIC_NAME,
    },
  });
  return res;
}

// // generate a url that asks permissions for Gmail scopes
// const scopes = ["https://www.googleapis.com/auth/gmail.readonly"];

// const url = oAuth2Client.generateAuthUrl({
//   access_type: "offline",
//   scope: scopes,
// });

// console.log("url", url);

// oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

// Load the credentials from the token.json file

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */

async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

const temp = async (auth) => {
  const gmail = google.gmail({ version: "v1", auth });
  const messageIds = await gmail.users.messages.list({
    userId: "me",
  });
  const emailContent = await gmail.users.messages.get({
    userId: "me",
    id: messageIds.data.messages[0].id,
  });

  return emailContent.data;
};

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */

const getMessageIdWebhook = async (req, res) => {
  try {
    const auth = await authorize();
    const pubSub = connectPubSub(auth);
    const response = await temp(auth);
    const emailData = response.snippet;
    // console.log("attachments->", await getAttachments(response.id));
    const parts = response.payload.parts;
    const attachmentId = parts[parts.length - 1].body["attachmentId"];

    const gmail = google.gmail({ version: "v1", auth });

    const encodedAttachmentData = await gmail.users.messages.attachments.get({
      messageId: response.id,
      userId: "me",
      id: attachmentId,
    });

    const fromAndDate = response.payload.headers.filter(
      (obj) => obj.name === "From" || obj.name === "Date"
    );

    const data = encodedAttachmentData.data.data;
    const fileData = Buffer.from(data, "base64");
    const filename = "attachment-1";
    fs.writeFile(filename, fileData, (err) => {
      if (!err) {
        console.log("attachment saved");
      }
    });

    const dataToSend = {
      emailData,
      encodedAttachmentData: encodedAttachmentData.data.data,
      from: fromAndDate[0].value,
      date: fromAndDate[1].value,
    };

    // service url
    const dataCleaningServiceUrl = ``;

    const cleaningServiceResponse = await axios({
      method: "POST",
      url: dataCleaningServiceUrl,
      data: dataToSend,
    });

    res.send(dataToSend);
  } catch (error) {
    console.log({ error: error.message });
    res.send({ error: error.message });
  }
};

module.exports = {
  getMessageIdWebhook,
};
