// ✅ Lấy token đã lưu sau khi đăng nhập (sessionStorage)
const token = sessionStorage.getItem('token');
if (!token) {
  window.location.href = '/login.html'; // Nếu chưa đăng nhập thì quay lại
}

// ✅ Kết nối socket kèm xác thực JWT
const socket = io({
  auth: { token }
});

// 🌐 Các phần tử HTML
const chatContent = document.getElementById('chat-content');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const roomSelect = document.getElementById('room-select');
const userList = document.getElementById('user-list');

// 🌟 Lấy tên người dùng
const username = sessionStorage.getItem('username');
if (!username) {
  window.location.href = '/login.html';
}

let currentRoom = roomSelect.value;

// 👉 Hàm đổi màu nền theo phòng (CSS)
function updateRoomColor(room) {
  document.body.className = '';
  document.body.classList.add(`room-${room}`);
}

// 👉 Khi người dùng chọn phòng mới
roomSelect.addEventListener('change', () => {
  const newRoom = roomSelect.value;
  socket.emit('leave room', { room: currentRoom, username });
  socket.emit('join room', { room: newRoom, username });

  chatContent.innerHTML = '';
  userList.innerHTML = '';
  currentRoom = newRoom;
  updateRoomColor(newRoom);
});

// 👉 Thêm tin nhắn vào khung chat
function appendMessage(username, message, self = false) {
  const msgDiv = document.createElement('div');
  msgDiv.classList.add('media', 'media-chat');
  if (self) msgDiv.classList.add('media-chat-reverse');

  msgDiv.innerHTML = self
    ? `<div class="media-body"><p>${message}</p><p class="meta"><time>${username}</time></p></div>`
    : `<img class="avatar" src="https://img.icons8.com/color/36/000000/administrator-male.png">
       <div class="media-body"><p>${message}</p><p class="meta"><time>${username}</time></p></div>`;

  chatContent.appendChild(msgDiv);
  chatContent.scrollTop = chatContent.scrollHeight;
}

// 👉 Gửi tin nhắn
sendBtn.addEventListener('click', (e) => {
  e.preventDefault();
  const msg = messageInput.value.trim();
  if (msg) {
    socket.emit('chat message', { username, message: msg, room: currentRoom });
    appendMessage(username, msg, true);
    messageInput.value = '';
  }
});

// 👉 Gửi khi nhấn Enter
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendBtn.click();
});

// 👉 Nhận tin nhắn từ server
socket.on('chat message', (data) => {
  if (data.room === currentRoom && data.username !== username) {
    appendMessage(data.username, data.message);
  }
});

// 👉 Nhận lịch sử tin nhắn
socket.on('chat history', (messages) => {
  chatContent.innerHTML = '';
  messages.forEach(msg => {
    if (msg.room === currentRoom) {
      appendMessage(msg.username, msg.message, msg.username === username);
    }
  });
});

// 👉 Nhận danh sách người online
socket.on('user list', (users) => {
  userList.innerHTML = '';
  users.forEach(u => {
    const li = document.createElement('li');
    li.classList.add('list-group-item', 'd-flex', 'align-items-center');
    li.innerHTML = `<i class="fas fa-circle text-success mr-2"></i> ${u}`;
    userList.appendChild(li);
  });
});

// 👉 Khi kết nối thành công
socket.on('connect', () => {
  console.log('✅ Kết nối thành công, socket ID:', socket.id);
  socket.emit('join room', { room: currentRoom, username });
  updateRoomColor(currentRoom);
});

// 👉 Khi tab bị đóng → out khỏi phòng
window.addEventListener('beforeunload', () => {
  socket.emit('leave room', { room: currentRoom, username });
});

// 👉 Xử lý lỗi xác thực
socket.on('connect_error', (err) => {
  alert('❌ Lỗi xác thực, vui lòng đăng nhập lại!');
  sessionStorage.clear();
  window.location.href = '/login.html';
});
