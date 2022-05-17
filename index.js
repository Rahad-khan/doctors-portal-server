const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require("mongodb");

// MiddleWare

app.use(cors());
app.use(express.json());

//MOngo

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@doctors-portal.gzsmq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    console.log("object");
  } finally {
    //   console.log(object);
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Doctors are active");
});

app.listen(port, () => {
  console.log(port, "port is running");
});
