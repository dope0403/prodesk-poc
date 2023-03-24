const {
  getEmail,
  getUserMessages,
  getEmailData,
  getMessageIdWebhook,
} = require("../controllers/gmail-api-controller");
const router = require("express").Router();

// router.get("/mail/user/:email", getEmail);
// router.get("/mail/user/:email/getAllEmails", getUserMessages);
// router.get("/mail/user/:email/getMessage/:messageId", getEmailData);

router.post("/get-email", getMessageIdWebhook);

module.exports = router;
