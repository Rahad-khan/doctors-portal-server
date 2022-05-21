const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// MiddleWare

app.use(cors());
app.use(express.json());

const verifyJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
};

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
    const serviceCollection = client
      .db("doctors_portal")
      .collection("services");
    const bookingCollection = client
      .db("doctors_portal")
      .collection("bookings");
    const doctorCollection = client
      .db("doctors_portal")
      .collection("doctors");
    const userCollection = client.db("doctors_portal").collection("users");

    const verifyAdmin =async (req,res,next) => {
      const requester = req.decoded.email;
      const requesterDetails = await userCollection.findOne({email: requester});
      if (requesterDetails.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "forbidden" });
      }
    }

    app.get("/services", async (req, res) => {
      const query = {};
      const result = await serviceCollection
        .find(query, { projection: { name: 1 }, sort: { name: 1 } }).toArray();
      res.send(result);
    });

    app.get("/available", async (req, res) => {
      const date = req.query.date;

      const services = await serviceCollection.find().toArray();

      const query = { date };

      const bookings = await bookingCollection.find(query).toArray();

      services.forEach((service) => {
        const bookedService = bookings.filter(
          (b) => b.treatment === service.name
        );

        const booked = bookedService.map((bs) => bs.slot);

        const available = service.slots.filter((s) => !booked.includes(s));
        service.slots = available;
      });

      res.send(services);
    });
    //check isadmin
    app.get('/admin/:email',async (req, res) => {
      const email = req.params.email;
      const result = await userCollection.findOne({email});
      const isAdmin = result.role === 'admin';
      res.send({admin:isAdmin})
    })
    // All user load
    app.get("/user", verifyJwt, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    // user update method
    app.put("/user/admin/:email", verifyJwt,verifyAdmin, async (req, res) => {
      const email = req.params.email;
        const filter = { email };
        const updateDoc = {
          $set: { role: "admin" },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result)
    });
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email };
      const options = { upsert: true };
      const user = req.body;
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
      });
      res.send({ result, token });
    });

    app.get("/booking", verifyJwt, async (req, res) => {
      const userId = req.query.email;
      const decodedEmail = req.decoded.email;
      if (userId === decodedEmail) {
        const query = { userId };
        const result = await bookingCollection.find(query).toArray();
        return res.send(result);
      } else {
        return res.status(403).send({ message: "Forbidden access" });
      }
    });

    app.get("/booking/:id", verifyJwt, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await bookingCollection.findOne(filter);
      res.send(result);
    });

    app.post("/booking", async (req, res) => {
      const booking = req.body;
      const query = {
        treatment: booking.treatment,
        date: booking.date,
        userId: booking.userId,
      };
      const exists = await bookingCollection.findOne(query);
      if (exists) {
        return res.send({ success: false, booking: exists });
      }
      const result = await bookingCollection.insertOne(booking);
      res.send({ success: true, result });
    });

    app.get('/doctors',verifyJwt,verifyAdmin, async (req,res) => {
      const result = await doctorCollection.find().toArray();
      res.send(result);
    });
    app.post('/doctors',verifyJwt,verifyAdmin, async (req,res) => {
      const docData = req.body;
      const result = await doctorCollection.insertOne(docData);
      res.send(result);
    });
    app.delete('/doctors',verifyJwt,verifyAdmin, async (req,res) => {
      const id = req.query.id;
      const filter = {_id: ObjectId(id)}
      const result = await doctorCollection.deleteOne(filter);
      res.send(result);
    });
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
