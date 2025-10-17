// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sql = require('mssql');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ✅ Cấu hình kết nối SQL Server
const dbConfig = {
  user: 'sa',
  password: 'hehehehe', // đổi lại nếu cần
  server: 'localhost',
  database: 'mini_webchat',
  options: { trustServerCertificate: true },
};

// ✅ Kết nối SQL
sql.connect(dbConfig)
  .then(async () => {
    console.log('✅ Kết nối SQL Server thành công');

    // 👉 Xóa toàn bộ tin nhắn cũ khi server khởi động
    try {
      // await sql.query`DELETE FROM Messages`;
      await sql.query`DELETE FROM OnlineUsers`;
      console.log('🧹 Đã xóa toàn bộ tin nhắn cũ khi khởi động server');
    } catch (err) {
      console.error('❌ Lỗi khi xóa tin nhắn cũ:', err);
    }
  })
  .catch(err => console.error('❌ Lỗi kết nối SQL Server:', err));

// ✅ Phục vụ file giao diện
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 👉 Hàm gửi danh sách người online của 1 phòng
async function sendUserList(room) {
  try {
    const result = await sql.query`
      SELECT username FROM OnlineUsers WHERE room = ${room}
    `;
    const users = result.recordset.map(u => u.username);
    io.to(room).emit('user list', users);
  } catch (err) {
    console.error('❌ Lỗi lấy danh sách user:', err);
  }
}

// ✅ Socket.io xử lý
io.on('connection', (socket) => {
  console.log('🟢 Client kết nối:', socket.id);

  // Khi người dùng vào phòng
  socket.on('join room', async ({ room, username }) => {
    socket.join(room);
    console.log(`👥 ${username} đã vào phòng ${room}`);

    try {
      // Xóa bản ghi cũ nếu có (tránh trùng)
      await sql.query`
        DELETE FROM OnlineUsers WHERE username = ${username} AND room = ${room}
      `;

      // Thêm vào bảng OnlineUsers
      await sql.query`
        INSERT INTO OnlineUsers (username, room, socket_id)
        VALUES (${username}, ${room}, ${socket.id})
      `;

      // Gửi lịch sử tin nhắn
      const messages = await sql.query`
        SELECT TOP 50 username, message, room, timestamp
        FROM Messages WHERE room = ${room}
        ORDER BY id ASC
      `;
      socket.emit('chat history', messages.recordset);

      // Cập nhật danh sách người online
      await sendUserList(room);
    } catch (err) {
      console.error('❌ Lỗi join room:', err);
    }
  });

  // Khi người dùng rời khỏi phòng
socket.on('leave room', async ({ room, username }) => {
  try {
    await sql.query`
      DELETE FROM OnlineUsers WHERE username = ${username} AND room = ${room}
    `;
    await sendUserList(room);
    socket.leave(room);
    console.log(`🚪 ${username} đã rời phòng ${room}`);
  } catch (err) {
    console.error('❌ Lỗi leave room:', err);
  }
});


  // Khi có tin nhắn mới
  socket.on('chat message', async ({ username, message, room }) => {
    try {
      await sql.query`
        INSERT INTO Messages (username, message, room)
        VALUES (${username}, ${message}, ${room})
      `;
      io.to(room).emit('chat message', { username, message, room });
    } catch (err) {
      console.error('❌ Lỗi lưu tin nhắn:', err);
    }
  });

  // Khi người dùng ngắt kết nối
  socket.on('disconnect', async () => {
    console.log('🔴 Client rời đi:', socket.id);
    try {
      const result = await sql.query`
        SELECT room FROM OnlineUsers WHERE socket_id = ${socket.id}
      `;
      if (result.recordset.length > 0) {
        const room = result.recordset[0].room;
        await sql.query`
          DELETE FROM OnlineUsers WHERE socket_id = ${socket.id}
        `;
        await sendUserList(room);
      }
    } catch (err) {
      console.error('❌ Lỗi disconnect:', err);
    }
  });
});

// ✅ Chạy server
const PORT = 3001;
server.listen(PORT, () =>
  console.log(`🚀 Server chạy tại http://localhost:${PORT}`)
);
