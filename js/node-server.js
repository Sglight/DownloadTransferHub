"use strict"

const pg = require('pg')
require("dotenv").config()

const fs = require('fs')
const path = require('path')
const Aria2 = require("aria2")

const express = require('express')
const { request, response } = require('express')
const fileUpload = require('express-fileupload')
const exp = express()

const md5File = require('md5-file')

exp.use(fileUpload({
    limits: { fileSize: 200 * 1024 * 1024 }
}))

const DOMAIN = 'https://soar.l4d2lk.cn'
// const DOMAIN = '*'
const WORKPATH = path.resolve(__dirname, '..')

const pgConfig = {
    host: process.env.hksrvip,
    // Do not hard code your username and password.
    // Consider using Node environment variables.
    user: process.env.pghkusr,
    password: process.env.pghkpwd,
    database: process.env.pghkdb,
    port: 5432,
    ssl: false
}

const aria2Config = {
    host: 'localhost',
    port: 6800,
    secure: false,
    secret: process.env.aria2secret,
    path: '/jsonrpc'
}

exp.post('/parse', async (request, response) => {
    try {
        response.setHeader('Access-Control-Allow-Origin', DOMAIN)
        let inputFileLink = request.query.inputfile
        let inputFileName = inputFileLink.substring(inputFileLink.lastIndexOf('/') + 1)
        let secretKey = request.query.secretkey
        let remarks = request.query.remarks

        let fileFloder = `${WORKPATH}/UserFiles/${secretKey}`
        let fileFullPath = `${fileFloder}/${inputFileName}`

        // 检查密令目录是否存在
        if (!fs.existsSync(fileFloder)) {
            fs.mkdirSync(fileFloder)
        }

        // 检查是否已存在相同文件
        let i = 1
        let alterFileName = inputFileName
        let fileNameWithoutSuffix = inputFileName.substring(0, inputFileName.lastIndexOf('.'))
        let fileSuffix = inputFileName.substring(inputFileName.lastIndexOf('.'))
        while (fs.existsSync(fileFullPath)) {
            alterFileName = `${fileNameWithoutSuffix}.${i}${fileSuffix}`
            fileFullPath = `${fileFloder}/${alterFileName}`
            i++
        }

        let aria2 = new Aria2(aria2Config)
        await aria2.open()
        await aria2.call('addUri', [inputFileLink], { dir: fileFloder })
        aria2.on("onDownloadComplete", async () => {
            aria2.close()

            let hash = await md5File(fileFullPath)

            // 更新数据库
            let SQLQuery = `
                INSERT INTO "UserFiles"("FileName", "Hash", "SecretKey", "remarks") 
                VALUES('${alterFileName}', '${hash}', '${secretKey}', '${remarks}') 
                RETURNING "FID"
            `
            const client = new pg.Client(pgConfig)
            client.connect((err) => {
                if (err) console.error(err)
            })

            let res = await client.query(SQLQuery)
            let FID = res.rows[0].FID
            client.end(err => {
                if (err) console.error(err)
            })

            let responseData = JSON.stringify({
                "FileName": alterFileName,
                "Hash": hash,
                "SecretKey": secretKey,
                "remarks": remarks,
                "FID": FID
            })
            response.send(responseData)
        })
        aria2.on("onDownloadError", () => {
            aria2.close()
            response.status(500).send('Download Error.')
        })
    }
    catch (err) {
        console.error(err)
        response.status(400).send(err)
    }
})

exp.post('/upload', async (request, response) => {
    try {
        response.setHeader('Access-Control-Allow-Origin', DOMAIN)

        let file = request.files.file
        let fileName = file.name
        let hash = file.md5
        let secretKey = request.query.secretkey
        let remarks = request.query.remarks

        let SQLQuery = `
            INSERT INTO "UserFiles"("FileName", "Hash", "SecretKey", "remarks") 
            VALUES('${fileName}', '${hash}', '${secretKey}', '${remarks}') 
            RETURNING "FID"
        `
        let FID
        const client = new pg.Client(pgConfig)
        client.connect(err => {
            if (err) console.error(err)
        })

        let res = await client.query(SQLQuery)
        FID = res.rows[0].FID
        client.end(err => {
            if (err) console.error(err)
        })

        let fileFloder = `${WORKPATH}/UserFiles/${secretKey}`
        let fileFullPath = `${fileFloder}/${fileName}`

        // 检查密令目录是否存在
        if (!fs.existsSync(fileFloder)) {
            fs.mkdirSync(fileFloder)
        }

        // 检查是否已存在相同文件
        let i = 1
        let fileNameWithoutSuffix = fileName.substring(0, fileName.lastIndexOf('.'))
        let fileSuffix = fileName.substring(fileName.lastIndexOf('.'))
        let alterFileName = fileName
        while (fs.existsSync(fileFullPath)) {
            alterFileName = `${fileNameWithoutSuffix}.${i}${fileSuffix}`
            fileFullPath = `${fileFloder}/${alterFileName}`
            i++
        }
        fileName = alterFileName
        file.mv(fileFullPath)

        let responseData = JSON.stringify({
            "FileName": fileName,
            "Hash": hash,
            "SecretKey": secretKey,
            "remarks": remarks,
            "FID": FID
        })
        response.send(responseData)
    }
    catch (err) {
        console.error(err)
        response.status(400).send(err)
    }
})

exp.post('/search', async (request, response) => {
    try {
        response.setHeader('Access-Control-Allow-Origin', DOMAIN)

        let SQLQuery = `
            SELECT "FileName", "Hash", "SecretKey", "remarks", "FID" 
            FROM "UserFiles" WHERE "SecretKey" = '${request.query.secretkey}'
        `

        const client = new pg.Client(pgConfig)

        client.connect(err => {
            if (err) console.error(err)
        })

        let res = await client.query(SQLQuery)
        response.send(res.rows)
        client.end(err => {
            if (err) console.error(err)
        })
    }
    catch (err) {
        console.error(err)
        response.status(400).send(err)
    }
})

exp.post('/delete', async (request, response) => {
    try {
        response.setHeader('Access-Control-Allow-Origin', DOMAIN)

        let SQLQuery = `DELETE FROM "UserFiles" WHERE "FID"='${request.query.FID}'`

        const client = new pg.Client(pgConfig)

        client.connect(err => {
            if (err) console.log(err)
        })
        await client.query(SQLQuery)
        client.end(err => {
            if (err) console.log(err)
        })

        let fileFullPath = `${WORKPATH}/UserFiles/${request.query.secretkey}/${request.query.filename}`
        if (fs.existsSync(fileFullPath))
            fs.rmSync(fileFullPath)
        response.send('Deleted.')
    }
    catch (err) {
        console.error(err)
        response.status(400).send(err)
    }
})

exp.post('/changekey', async (request, response) => {
    // 参数：FID, oldkey, newkey, mode
    
})

exp.post('/changeremarks', async (request, response) => {
    // 参数：FID，newRemarks
    try {
        response.setHeader('Access-Control-Allow-Origin', DOMAIN)
    
        let newRemarks = request.query.newremarks
        let SQLQuery = `UPDATE "UserFiles" SET "remarks"='${newRemarks}' WHERE "FID"='${request.query.FID}'`
    
        const client = new pg.Client(pgConfig)
    
        client.connect(err => {
            if (err) console.log(err)
        })
        await client.query(SQLQuery)
        client.end(err => {
            if (err) console.log(err)
        })
    
        response.send(`Remarks changed to ${newRemarks}.`)
    }
    catch (err) {
        console.error(err)
        response.status(400).send(err)
    }
})

exp.listen(8001, () => {
})
