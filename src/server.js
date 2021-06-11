import cors from "cors"
import express from "express"
import dayjs from "dayjs"
import {stripHtml} from "string-strip-html"
import fs from "fs"
import Joi from "joi"

const app = express()
app.use(cors())
app.use(express.json());



let participants = verifyExistingParticipants() 
const messages = verifyExistingMessages()

function verifyExistingParticipants(){
    return fs.existsSync('participants.txt') ? JSON.parse(fs.readFileSync(`./participants.txt`,'utf8')) : [];
}

function verifyExistingMessages(){
    return fs.existsSync('messages.txt') ? JSON.parse(fs.readFileSync(`./messages.txt`,'utf8')) : [];
}

function overwriteData(){
    fs.writeFileSync(`participants.txt`,JSON.stringify(participants))
    fs.writeFileSync(`messages.txt`,JSON.stringify(messages))
}

setInterval(()=>{
    participants=participants.filter(p=>Date.now()-p.lastStatus<=10000)
},15000)

app.post('/participants',(req,res)=>{
    const userNameTaken = participants.find(user=>user.name===req.body.name)
    if(req.body.name){req.body.name=stripHtml(req.body.name).result.trim()}
    if(userNameTaken||participantSchema.validate(req.body).error){
        res.sendStatus(400)
    }else{
        participants.push({
            name: req.body.name,
            lastStatus: Date.now()
        })
        messages.push({
            from: req.body.name, 
            to: 'Todos', 
            text: 'entra na sala...', 
            type: 'status', 
            time: dayjs().format("HH:mm:ss")
        })
        res.sendStatus(200)
        overwriteData()
    }
})

app.get("/participants",(req,res)=>{
    res.send(participants)
})

app.post('/messages',(req,res)=>{

    req.headers.user=stripHtml(req.headers.user).result.trim()
    req.body.to=stripHtml(req.body.to).result.trim()
    req.body.text=stripHtml(req.body.text).result.trim()
    req.body.type=stripHtml(req.body.type).result.trim()

    if(!messageSchema.validate(req.body).error && participants.find(p=>p.name===req.headers.user)){
        messages.push({
            from: req.headers.user, 
            to: req.body.to, 
            text: req.body.text, 
            type: req.body.type, 
            time: dayjs().format("HH:mm:ss")
        })
        res.sendStatus(200)
        overwriteData()
    }else{
        res.sendStatus(400)
    }
})

app.get("/messages",(req,res)=>{
    const filteredMessages = messages.filter(m=> {
        return (m.type!=='private_message' || 
                m.to==="Todos" || 
                m.to===req.headers.user || 
                m.from===req.headers.user)
    })
    const lastMessages=filteredMessages.filter((m,i)=>i>messages.length-parseInt(req.query.limit))
    console.log(lastMessages)
    res.send(lastMessages)
})

app.post("/status",(req,res)=>{
    const userIndex = participants.findIndex(p=>p.name===req.headers.user)
    if(userIndex!==-1){
        participants[userIndex].lastStatus=Date.now()
        res.sendStatus(200)
        overwriteData()
    }else{
        res.sendStatus(400)
    }
})

const participantSchema = Joi.object({
    name: Joi.string().min(1).required()
})

const messageSchema = Joi.object({
    to: Joi.string().min(1).required(),
    text: Joi.string().min(1).required(),
    type: Joi.string().valid('message').valid('private_message').required()
})

app.listen(4000, ()=>{
    console.log("Server running on port 4000") 
})
