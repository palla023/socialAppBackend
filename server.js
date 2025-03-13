const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");
const userRoute = require("./routes/users");
const authRoute = require("./routes/auth");
const postRoute = require("./routes/posts");
const conversationRoute = require("./routes/conversations");
const messageRoute = require("./routes/messages");
const path = require("path");
const multer = require("multer");

dotenv.config();
mongoose.set("strictQuery", true); //to surpass the depricated warnings
mongoose.connect(process.env.MONGO_URL, () => console.log("DB Connected..."));

const app = express();

app.use(
  cors({
    origin: "*",
  })
);
//if we give http://localhost:5000/images/ then it will go this directory path.join(__dirname, "public/images")
app.use("/images", express.static(path.join(__dirname, "public/images"))); 

//middleware
app.use(express.json());
app.use(helmet());
app.use(morgan("common"));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/images");
  },
  filename: (req, file, cb) => {
    cb(null, req.body.name);
  },
});

const upload = multer({ storage: storage });
app.post("/api/upload", upload.single("file"), (req, res) => {
  try {
    return res.status(200).json("File uploded successfully");
  } catch (error) {
    console.error(error);
  }
});

app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/posts", postRoute);
app.use("/api/conversations", conversationRoute);
app.use("/api/messages", messageRoute);

//-----------------Socket Connection----------------

const io = require("socket.io")(8900, {
  cors: {
      origin: '*',
  },
});

let users = [];
//function to remove the duplicate userId & SocketId
const addUser = (userId, socketId) => {
  !users.some(user => user.userId === userId) &&
  users.push({ userId, socketId });
}

const removeUser = (socketId) => {
  users = users.filter(user => user.socketId !== socketId)
}

//need to find specific user to send the text
const getUser = (userId) => {
return users.find(user => user.userId === userId)
}

// Listening for client connections
io.on('connection', (socket) => {
  //Connect
  console.log('A user connected:', socket.id);
  //after every connection take userId and socketId from user <-user needs to send userId from the client
  socket.on('addUser', userId => {
      addUser(userId, socket.id);
      io.emit("getUsers", users)
  })

  //Send & get Message
  //take event from the client and send to specific client
  socket.on("sendMessage", ({ senderId, receiverId, text }) => {
      //need to find specific user to send the text
      const user = getUser(receiverId);
      io.to(user?.socketId).emit("getMessage", {
          senderId,
          text,
        });

  })

  // Disconnect
  socket.on('disconnect', () => {
      console.log('A user disconnected:', socket.id);
      //if user closed the browser , remove the user from the users collection
      removeUser(socket.id);
      //after removing the disconnected user , send the connected users to the Client
      io.emit("getUsers", users);
  });
});

//------------------------ Socket Connection------------------------

__dirname = path.resolve();

// Serve static files only in production
if (process.env.NODE_ENV === "production") {
  // Set static folder to serve from the client/build directory
  app.use(express.static(path.join(__dirname, "../client/build")));

  // Serve the index.html file for any route
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../client/build", "index.html"));
  });
}

app.listen(process.env.PORT || 5000 , () => console.log("Server is Running..."));
