const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
app.use(cors({
  origin: 'https://AneesIbnuKasim.github.io',
  methods: ['GET', 'POST'],
  credentials: true
}));

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const waitingCustomers = [];

io.on('connection', socket => {
  console.log('Connected:', socket.id);

  socket.on('customer-join', ({ name }) => {
    const room = `room-${socket.id}`;
    socket.join(room);
    socket.data = { role: 'customer', name, room };
    waitingCustomers.push({ name:name, socketId: socket.id, room });
    socket.emit('joined-room', { room });
  });

  socket.on('agent-join', ({ name }) => {
    const customer = waitingCustomers.shift();
    if (customer) {
      socket.join(customer.room);
      socket.data = { role: 'agent', name, room: customer.room };
      socket.emit('joined-room', { room: customer.room , customers:waitingCustomers, role:'customer'});
    } else {
      socket.emit('no-customers');
    }
  });

  socket.on('chat-message', ({ room, sender, message }) => {
    io.to(room).emit('chat-message', { sender, message });
  });

  socket.on('disconnect', () => {
    console.log(`Disconnected: ${socket.id}`);
  });
});

server.listen(5174, () => console.log('Server running on port 5174'));