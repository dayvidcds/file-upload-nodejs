const express = require("express")
const bodyParser = require("body-parser")
const multer = require('multer')
const path = require('path')
const app = express()
const fs = require('fs')

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

//app.use('/uploads', express.static(__dirname + '/uploads'))

app.use('/img', express.static(__dirname + '/img'))

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './uploads')
    },
    filename: function(req, file, cb) {
        cb(null, file.originalname)
    }
})

let upload = multer({
    storage: storage,
    limits: { fileSize: 1000000 },
    fileFilter: (req, file, cb) => {
        checkFileType(file, cb)
    }
}).array('userPhoto', 1000)

function checkFileType(file, cb) {
    const fileTypes = /jpg|jpeg/
    const extName = fileTypes.test(path.extname(file.originalname).toLowerCase())
    const mimeType = fileTypes.test(file.mimetype)
    if (mimeType && extName) {
        return cb(null, true)
    } else {
        cb('Error: Images Only')
    }
}

app.get('/', function(req, res) {
    res.sendFile(__dirname + "/index.html")
})

app.post('/api/photo', function(req, res) {
    upload(req, res, (err) => {
        //console.log(req.body)
        //console.log(req.files)
        if (err) {
            res.send({
                msg: '' + err
            })
        } else {
            if (req.files == undefined) {
                res.send({
                    msg: 'Error: No file selected!'
                })
            } else {
                let imgs = []
                for (let i = 0; i < req.files.length; i++) {
                    imgs.push({ locationName: req.files[i].originalname })
                }
                res.send({
                    msg: 'Enviado!',
                    imgs: imgs
                })
            }
        }
        //console.log('IMSGSSS ==> ', imgs
    })
})

app.get('/streaming/:local', (req, res) => {
    const imgFile = './uploads/' + req.params.local
    console.log('STREAMING => ', imgFile)
    fs.stat(imgFile, (err, stats) => {
        if (err) {
            console.log(err);
            return res.status(404).end('<h1>Movie Not found</h1>')
        }
        // Variáveis necessárias para montar o chunk header corretamente
        const { range } = req.headers
        const { size } = stats
        const start = Number((range || '').replace(/bytes=/, '').split('-')[0])
        const end = size - 1
        const chunkSize = (end - start) + 1
            // Definindo headers de chunk
        res.set({
            'Content-Range': `bytes ${start}-${end}/${size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': 'image/jpg'
        });

        //console.log(start)
        // É importante usar status 206 - Partial Content para o streaming funcionar
        res.status(206)
            // Utilizando ReadStream do Node.js
            // Ele vai ler um arquivo e enviá-lo em partes via stream.pipe()

        const stream = fs.createReadStream(imgFile, { start, end })
        stream.on('open', () => stream.pipe(res));
        stream.on('error', (streamErr) => res.end(streamErr))
    })
})

app.listen(80, function() {
    console.log("Working on port 80")
})