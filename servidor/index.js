const PORT = process.env.PORT || 4000;
const nodemailer = require("nodemailer");
require('dotenv').config()

async function sendEmail(lat, log){
    console.log("Sending email")
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        service : 'gmail',
      auth: {
        user: "rcarvalhoeric@gmail.com", // generated ethereal user
        pass: "ewzbysvaxqxlpxfd", // generated ethereal password
      },
    });
  
    // send mail with defined transport object
    let info = await transporter.sendMail({
      from: "rcarvalhoeric@gmail.com", // sender address
      to: "rcarvalhoeric@gmail.com", // list of receivers
      subject: "ALERTA DE QUEDA", // Subject line
      text: `LATITUDE: ${lat}, LONGITUDE: ${log}`, // plain text body
    //   html: "<b>Hello world?</b>", // html body
    });
  
    console.log("Message sent: %s", info.messageId);
    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
  
    // Preview only available when sending through an Ethereal account
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
}


const io = require('socket.io')(PORT, {
    cors: {
        origin: '*'
    }
});

io.on("connection", socket => {
    console.log("Novo usuário conectado: " + socket.id);

    socket.emit('teste', 'Hello World');

    socket.on("sensores", data => {
        console.log(data);
        sendEmail(data.location.latitude, data.location.longitude);
    });
});