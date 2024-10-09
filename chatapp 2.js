const express = require("express");
const app = express();
const http = require("http").Server(app);
const cors = require("cors");
const PORT = 3000;
const socketIO = require("socket.io")(http, {
	cors: {
		origin: "*",
	},
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

const generateID = () => Math.random().toString(36).substring(2, 10);
let chatRooms = [];

let users = {};
let sockets = {};



socketIO.on("connection", (socket) => {
	console.log(`⚡: ${socket.id} user just connected!`);
	socketIO.emit("roomsList", chatRooms);
	socket.on("createRoom", (name,by) => {
		socket.join(name);
		chatRooms.unshift({ id: generateID(), name, messages: [], by });
		socketIO.emit("roomsList", chatRooms);
	});

	socket.on("findRoom", (id) => {
		let result = chatRooms.filter((room) => room.id == id);
		// console.log(chatRooms);
		socket.emit("foundRoom", result[0].messages);
		// console.log("Messages Form", result[0].messages);
	});

	socket.on("newMessage", (data) => {
		const { room_id, message, user, timestamp } = data;
		let result = chatRooms.filter((room) => room.id == room_id);
		socket.join(result[0].name);
		const newMessage = {
			id: generateID(),
			text: message,
			user,
			time: `${timestamp.hour}:${timestamp.mins}`,
		};
		console.log("New Message", newMessage);
	
		result[0].messages.push(newMessage);

			socketIO.in(result[0].name).emit("roomMessage", result[0].messages);
		socket.emit("roomMessage", result[0].messages);

		//socket.emit("roomsList", chatRooms);
		//socket.emit("foundRoom", result[0].messages);
		//socketIO.in(result[0].name).emit("foundRoom", result[0].messages);
	});
	socket.on("disconnect", () => {
		socket.disconnect();
		console.log("🔥: A user disconnected");
	});
});

app.get("/api", (req, res) => {
	res.json(chatRooms);
});

http.listen(PORT, () => {
	console.log(`Server listening on ${PORT}`);
});
