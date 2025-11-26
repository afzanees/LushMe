const nodemailer = require("nodemailer");


async function sendVerificationEmail(email,otp){
     try {                        

        const transporter =  nodemailer.createTransport({                 // we set the default email and password , that mail will send otp to user registered mail 

            service:'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })   
        
        const info = await transporter.sendMail({     //info of sending mail with otp
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Verify your account",
            text:`Your OTP: ${otp}`,
            html:`<b>Your OTP: ${otp} </b>,`
        })

        return info.accepted.length > 0
        
     } catch (error) {
        console.error("Error sending email",error)
        return false;
     }
}


module.exports = sendVerificationEmail;