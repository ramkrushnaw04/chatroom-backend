const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

require('dotenv').config();


const app = express();
const server = createServer(app);

const allowedOrigin = '*';
const port = process.env.PORT
const serverLink = process.env.FRONTEND_LINK

// VVIMP
app.use(cors({
  origin: allowedOrigin, 
  methods: ['GET', 'POST'], 
  allowedHeaders: ['Content-Type'], 
}));

let clients = {};

// Create Socket.IO server instance
const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
  },
  // increase default message size to upto 100mb
  maxHttpBufferSize: 1e8, // 100 MB
});


app.get('/', (req, res) => {
  res.send('server is working.')
  // res.redirect(allowedOrigin);
});


app.get('/redirect', (req, res) => {
  res.redirect(serverLink);
});

io.on('connection', (socket) => {
  console.log(`${socket.id} connected`);

  socket.on('message', message => {
    const response = message;
    io.emit('message-response', response);
  });

  // tell all users when someone joins or leaves
  socket.on('get-client-data', data => {
    const response = data;
    response.type = 'connection-alert';
    response.newConnection = true;

    clients[socket.id] = { name: response.name, typingStatus: 'idle', id: data.id };

    io.emit('message-response', response);
    io.emit('get-all-client-names', clients);
  });

  socket.on('get-typing-user', data => {
    const { id, action } = data;
    const clientsKeysArray = Object.entries(clients);
    const clientMatch = clientsKeysArray.filter(item => item[1].id === id);
    const socketID = clientMatch.length ? clientMatch[0][0] : null;

    if (action === 'startTyping') {
      const obj = clients[socketID];
      if (obj) {
        obj.typingStatus = 'typing';
        clients[socketID] = obj;
      }
    } 
    else if (action === 'stopTyping') {
      const obj = clients[socketID];
      if (obj) {
        obj.typingStatus = 'idle';
        clients[socketID] = obj;
      }
    }

    socket.broadcast.emit('get-all-client-names', clients);
  });

  
  socket.on('disconnect', reason => {
    console.log(`${clients[socket.id]?.name} disconnected. Reason: ${reason}`);
    const response = {};
    response.type = 'connection-alert';
    response.name = clients[socket.id]?.name;
    response.newConnection = false;

    delete clients[socket.id];

    io.emit('message-response', response);
    io.emit('get-all-client-names', clients);
  });



});

server.listen(port, () => {
  console.log('server is running...');
});

