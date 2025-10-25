-- =============================================
-- TẠO DATABASE mini_webchat
-- =============================================
CREATE DATABASE mini_webchat;
GO

USE mini_webchat;
GO

-- =============================================
-- BẢNG: Users
-- =============================================
CREATE TABLE dbo.Users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    username NVARCHAR(100) NOT NULL,
    email NVARCHAR(255) NULL,
    phone NVARCHAR(20) NULL,
    password NVARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT GETDATE()
);
GO

-- =============================================
-- BẢNG: OnlineUsers
-- =============================================
CREATE TABLE dbo.OnlineUsers (
    id INT IDENTITY(1,1) PRIMARY KEY,
    username NVARCHAR(100) NOT NULL,
    room NVARCHAR(100) NULL,
    socket_id NVARCHAR(255) NULL,
    joined_at DATETIME DEFAULT GETDATE()
);
GO

-- =============================================
-- BẢNG: Messages
-- =============================================
CREATE TABLE dbo.Messages (
    id INT IDENTITY(1,1) PRIMARY KEY,
    username NVARCHAR(100) NOT NULL,
    message NVARCHAR(MAX) NOT NULL,
    [timestamp] DATETIME DEFAULT GETDATE(),
    room NVARCHAR(100) NULL
);
GO

-- =============================================
-- DỮ LIỆU MẪU: Users
-- =============================================
INSERT INTO dbo.Users (username, email, phone, password)
VALUES 
('nguyen', 'nguyen@example.com', '0909123456', '123456'),
('admin', 'admin@example.com', '0988765432', 'admin123'),
('huy', 'huy@example.com', '0933123123', 'password'),
('mai', 'mai@example.com', '0977456677', 'mai2025');
GO

-- =============================================
-- DỮ LIỆU MẪU: OnlineUsers
-- =============================================
INSERT INTO dbo.OnlineUsers (username, room, socket_id)
VALUES 
('nguyen', 'general', 'socket_123abc'),
('huy', 'general', 'socket_456def'),
('mai', 'sports', 'socket_789ghi');
GO

-- =============================================
-- DỮ LIỆU MẪU: Messages
-- =============================================
INSERT INTO dbo.Messages (username, message, room)
VALUES
('nguyen', N'Xin chào mọi người!', 'general'),
('huy', N'Chào Nguyên, hôm nay code tới đâu rồi?', 'general'),
('nguyen', N'Tớ đang làm phần chat real-time nè.', 'general'),
('mai', N'Mọi người có xem bóng đá tối qua không?', 'sports');
GO

-- =============================================
-- KIỂM TRA DỮ LIỆU
-- =============================================
SELECT * FROM dbo.Users;
SELECT * FROM dbo.OnlineUsers;
SELECT * FROM dbo.Messages;
GO
