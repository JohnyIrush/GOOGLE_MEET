const express = require("express")
const path = require("path")
var app = express();
var server = app.listen(3000, function() {
    console.log("Listening on port 3000")
})

const io = require("socket.io")(server,{
    allowEIO3: true
});
app.use(express.static(path.join(__dirname, "")))
var userConnection = [];

// server side socket.io connection
io.on("connection", (socket)=>{
    console.log("socket id is ", socket.id)
    //event fired from client side connection send data
    socket.on("userconnect", (data)=>{
        console.log("userconnect ", data.displayName, data.meetingid)
        // store other users info 
        var other_users = userConnection.filter((p) =>p.meeting_id == data.meetingid)
        //store user info
        userConnection.push({
            connectionId: socket.id,
            user_id: data.displayName,
            meeting_id: data.meetingid,

        })

        // inform other users 
        other_users.forEach((v) => {
           socket.to(v.connectionId).emit("inform_others_about_me", {
            other_user_id: data.displayName,
            connId: socket.id
           }) 
        });

        socket.emit("inform_me_about_other_user", other_users)
    })
    socket.on("SDPProcess", (data)=>{
        socket.to(data.to_connid).emit("SDPProcess", {
            message: data.message,
            from_connid: socket.id
        })
    })
})