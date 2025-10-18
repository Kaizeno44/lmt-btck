CREATE DATABASE mini_webchat;
USE mini_webchat;
GO


CREATE TABLE dbo.OnlineUsers (
    id INT IDENTITY(1,1) PRIMARY KEY,
    username NVARCHAR(100) NOT NULL,
    room NVARCHAR(100) NOT NULL,
    socket_id NVARCHAR(200) NOT NULL,
    joined_at DATETIME DEFAULT GETDATE()
);
CREATE TABLE dbo.Messages (
    id INT IDENTITY(1,1) PRIMARY KEY,
    username NVARCHAR(100) NOT NULL,
    message NVARCHAR(MAX) NOT NULL,
    room NVARCHAR(100) NOT NULL,
    timestamp DATETIME DEFAULT GETDATE()
);
-- =========================================
INSERT INTO dbo.Messages (username, message, room)
VALUES 
(N'nguyên', N'Xin chào mọi người!', N'general'),
(N'nam', N'Chào bạn!', N'general');
GO