require("dotenv").config({ path: ".env" });
const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(
  express.json({
    extended: false,
  })
);
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.SERVER_PORT || 8080;

const gmailAPIRoutes = require("./routes/gmail-api-routes");

app.use("/api", gmailAPIRoutes);

app.listen(PORT, (err) => {
  if (!err) {
    console.log(`Server is running on port ${PORT}`);
  }
});
