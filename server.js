// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sql = require('mssql');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);

// ✅ Nếu front-end và back-end khác port, cần bật CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const SECRET_KEY = 'supersecretkey123'; // ⚠️ Nên đổi khóa này khi deploy thật

// ✅ Cấu hình kết nối SQL Server
const dbConfig = {
  user: 'sa',
  password: 'hehehehe',
  server: 'localhost',
  database: 'mini_webchat',
  options: { trustServerCertificate: true },
};

// ✅ Kết nối SQL
sql.connect(dbConfig)
  .then(async () => {
    console.log('✅ Kết nối SQL Server thành công');
    try {
      await sql.query`DELETE FROM OnlineUsers`;
      console.log('🧹 Đã xóa danh sách người online khi khởi động server');
    } catch (err) {
      console.error('❌ Lỗi khi xóa dữ liệu khởi động:', err);
    }
  })
  .catch(err => console.error('❌ Lỗi kết nối SQL Server:', err));

// ✅ Cấu hình Express
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.redirect('/login.html'));

// ✅ Hàm gửi danh sách người online trong phòng
async function sendUserList(room) {
  try {
    const result = await sql.query`
      SELECT username FROM OnlineUsers WHERE room = ${room}
    `;
    const users = result.recordset.map(u => u.username);
    io.to(room).emit('user list', users);
  } catch (err) {
    console.error('❌ Lỗi gửi danh sách user:', err);
  }
}

// ✅ API Đăng ký
app.post('/api/register', async (req, res) => {
  const { username, email, phone, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    await sql.query`
      INSERT INTO Users (username, email, phone, password)
      VALUES (${username}, ${email}, ${phone}, ${hashed})
    `;
    res.json({ success: true, message: 'Đăng ký thành công!' });
  } catch (err) {
    if (err.number === 2627)
      res.json({ success: false, message: 'Tên đăng nhập đã tồn tại!' });
    else
      res.json({ success: false, message: 'Lỗi máy chủ!' });
  }
});

// ✅ API Đăng nhập
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await sql.query`
      SELECT * FROM Users WHERE username = ${username}
    `;
    if (result.recordset.length === 0)
      return res.json({ success: false, message: 'Sai tài khoản hoặc mật khẩu' });

    const user = result.recordset[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.json({ success: false, message: 'Sai tài khoản hoặc mật khẩu' });

    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '2h' });
    res.json({ success: true, token, username });
  } catch (err) {
    console.error('❌ Lỗi đăng nhập:', err);
    res.json({ success: false, message: 'Lỗi server!' });
  }
});

// ✅ Xác thực Socket.io bằng JWT
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Thiếu token'));
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    socket.username = decoded.username;
    next();
  } catch (err) {
    next(new Error('Token không hợp lệ'));
  }
});

// ✅ Xử lý socket
io.on('connection', (socket) => {
  console.log(`🟢 ${socket.username} đã kết nối (${socket.id})`);

  // Khi user vào phòng
  socket.on('join room', async ({ room }) => {
    const username = socket.username;
    socket.join(room);
    console.log(`👥 ${username} đã vào phòng ${room}`);

    try {
      // Xóa mọi bản ghi cũ của user để tránh trùng
      await sql.query`
        DELETE FROM OnlineUsers WHERE username = ${username}
      `;
      await sql.query`
        INSERT INTO OnlineUsers (username, room, socket_id)
        VALUES (${username}, ${room}, ${socket.id})
      `;

      // Gửi lịch sử tin nhắn mới nhất (50 tin)
      const messages = await sql.query`
        SELECT TOP 50 username, message, room, timestamp
        FROM Messages WHERE room = ${room}
        ORDER BY id DESC
      `;
      socket.emit('chat history', messages.recordset.reverse());

      // Gửi danh sách user trong phòng
      await sendUserList(room);

      // Thông báo hệ thống
      socket.to(room).emit('system message', `${username} đã tham gia phòng`);
    } catch (err) {
      console.error('❌ Lỗi join room:', err);
    }
  });

  // Khi user gửi tin nhắn
  socket.on('chat message', async ({ message, room }) => {
    const username = socket.username;
    try {
      await sql.query`
        INSERT INTO Messages (username, message, room)
        VALUES (${username}, ${message}, ${room})
      `;
      // Chỉ gửi cho người khác, không gửi lại chính người gửi
      socket.to(room).emit('chat message', { username, message, room });
    } catch (err) {
      console.error('❌ Lỗi lưu tin nhắn:', err);
    }
  });

  // Khi user rời phòng
  socket.on('leave room', async ({ room }) => {
    const username = socket.username;
    try {
      await sql.query`
        DELETE FROM OnlineUsers WHERE username = ${username} AND room = ${room}
      `;
      await sendUserList(room);
      socket.leave(room);
      socket.to(room).emit('system message', `${username} đã rời phòng`);
      console.log(`🚪 ${username} đã rời phòng ${room}`);
    } catch (err) {
      console.error('❌ Lỗi leave room:', err);
    }
  });

  // Khi ngắt kết nối
  socket.on('disconnect', async () => {
    const username = socket.username;
    console.log(`🔴 ${username} (${socket.id}) ngắt kết nối`);
    try {
      const result = await sql.query`
        SELECT room FROM OnlineUsers WHERE socket_id = ${socket.id}
      `;
      if (result.recordset.length > 0) {
        const room = result.recordset[0].room;
        await sql.query`
          DELETE FROM OnlineUsers WHERE socket_id = ${socket.id} OR username = ${username}
        `;
        await sendUserList(room);
        socket.to(room).emit('system message', `${username} đã thoát`);
      }
    } catch (err) {
      console.error('❌ Lỗi disconnect:', err);
    }
  });
});

// ✅ Chạy server
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
});
