import cors from "cors"
import express from "express"
import dayjs from "dayjs"
import {stripHtml} from "string-strip-html"
import fs from "fs"

const app = express()
app.use(cors())
app.use(express.json());

function verifyExistingParticipants(){
    return fs.existsSync('participants.txt') ? JSON.parse(fs.readFileSync(`./participants.txt`,'utf8')) : [];
}
function verifyExistingMessages(){
    return fs.existsSync('messages.txt') ? JSON.parse(fs.readFileSync(`./messages.txt`,'utf8')) : [];
}

let participants = verifyExistingParticipants() 
const messages = verifyExistingMessages()

setInterval(()=>{
    participants=participants.filter(p=>Date.now()-p.lastStatus<=10000)
},15000)

//NOVO PARTICIPANTE
app.post('/participants',(req,res)=>{
    const userNameTaken = participants.find(user=>user.name===req.body.name)
    if(userNameTaken||!req.body.name){
        res.sendStatus(400)
    }else{
        participants.push({
            name: stripHtml(req.body.name).result,
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
        console.log(participants)
    }
})

//PEGAR TODOS PARTICIPANTES
app.get("/participants",(req,res)=>{
    res.send(participants)
})

//POSTAR NOVA MENSAGEM
app.post('/messages',(req,res)=>{
    if((req.body.type==='message' || req.body.type==='private_message') && 
        req.body.to && req.body.text && participants.find(p=>p.name===req.headers.user)){
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

//PEGAR TODAS AS MENSAGENS
app.get("/messages",(req,res)=>{
    const filteredMessages = messages.filter(m=> {
        return (m.type!=='private_message' || 
                m.to==="Todos" || 
                m.to===req.headers.user || 
                m.from===req.headers.user)
    })
    const lastMessages=filteredMessages.filter((m,i)=>i>messages.length-parseInt(req.query.limit))
    res.send(lastMessages)
})

//STATUS DE PARTICIPANTE
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

function overwriteData(){
    fs.writeFileSync(`participants.txt`,JSON.stringify(participants))
    fs.writeFileSync(`messages.txt`,JSON.stringify(messages))
}

app.listen(4000, ()=>{
    console.log("Server running on port 4000") 
})
