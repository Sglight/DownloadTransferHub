"use strict";

const pg = require('pg')
require("dotenv").config()

const fs = require('fs')
const path = require('path')
const download = require('./download.js')

const express = require('express')
const { request, response } = require('express')
const fileUpload = require('express-fileupload')
const exp = express()
exp.use(fileUpload())

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

exp.post('/parse', async (request, response) => {
    response.setHeader('Access-Control-Allow-Origin', DOMAIN)
    let inputFileLink = request.query.inputfile
    let inputFileName = inputFileLink.substring(inputFileLink.lastIndexOf('/') + 1)
    let secretKey = request.query.secretkey
    let remarks = request.query.remarks
    let hash = null

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
    // 更新数据库
    let SQLQuery = `
        INSERT INTO "UserFiles"("FileName", "Hash", "SecretKey", "remarks") 
        VALUES('${alterFileName}', '${hash}', '${secretKey}', '${remarks}') 
        RETURNING "FID"
    `
    let FID
    const client = new pg.Client(pgConfig)
    client.connect(err => {
        response.setHeader('Access-Control-Allow-Origin', DOMAIN)
        // else console.log('postgreSQL connected.')
    })
    client.query(SQLQuery)
    .then(res => {
        FID = res.rows[0].FID
        client.end(err => {
            if (err) console.log(err)
            // else console.log('postgreSQL disconnected.')
        })
    })
    .then(() => {
        let responseData = JSON.stringify({
            "FileName": alterFileName,
            "Hash": hash,
            "SecretKey": secretKey,
            "remarks": remarks,
            "FID": FID
        })
        download.downloadFile(inputFileLink, fileFloder, response, responseData)
    })
    .catch((err) => {
        console.log(err)
    })
})

exp.post('/upload', (request, response) => {
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
        if (err) console.log(err)
    })
    client.query(SQLQuery)
    .then(res => {
        FID = res.rows[0].FID
        client.end(err => {
            if (err) console.log(err)
        })
    })
    .then(() => {
        let fileFloder = `${WORKPATH}/UserFiles/${secretKey}`
        let fileFullPath = `${fileFloder}/${fileName}`

        // 检查密令目录是否存在
        if (!fs.existsSync(fileFloder)) {
            fs.mkdirSync(fileFloder)
        }

        // 检查是否已存在相同文件
        let i = 1
        let alterFileName = fileName
        let fileNameWithoutSuffix = fileName.substring(0, fileName.lastIndexOf('.'))
        let fileSuffix = fileName.substring(fileName.lastIndexOf('.'))
        while (fs.existsSync(fileFullPath)) {
            alterFileName = `${fileNameWithoutSuffix}.${i}${fileSuffix}`
            fileFullPath = `${fileFloder}/${alterFileName}`
            i++
        }
        file.mv(fileFullPath)

        let responseData = JSON.stringify({
            "FileName": alterFileName,
            "Hash": hash,
            "SecretKey": secretKey,
            "remarks": remarks,
            "FID": FID
        })
        response.send(responseData)
    })
    .catch((err) => {
        console.log(err)
    })
})

exp.post('/search', (request, response) => {
    response.setHeader('Access-Control-Allow-Origin', DOMAIN)

    let SQLQuery = `
        SELECT "FileName", "Hash", "SecretKey", "remarks", "FID" 
        FROM "UserFiles" WHERE "SecretKey" = '${request.query.secretkey}'
    `

    const client = new pg.Client(pgConfig)

    client.connect(err => {
        if (err) console.log(err)
        // else console.log('postgreSQL connected.')
    })

    client.query(SQLQuery)
    .then(res => {
        response.send(res.rows)
        client.end(err => {
            if (err) console.log(err)
            // else console.log('postgreSQL disconnected.')
        })
    })
    .catch(err => {
        console.log(err)
    })
})

exp.post('/delete', (request, response) => {
    response.setHeader('Access-Control-Allow-Origin', DOMAIN)

    let SQLQuery = `DELETE FROM "UserFiles" WHERE "FID"='${request.query.FID}'`

    const client = new pg.Client(pgConfig)

    client.connect(err => {
        if (err) console.log(err)
        // else console.log('postgreSQL connected.')
    });

    client.query(SQLQuery)
    .then(() => {
        client.end(err => {
            if (err) console.log(err)
            // else console.log('postgreSQL disconnected.')
        })
    })
    .then(() => {
        let fileFullPath = `${WORKPATH}/UserFiles/${request.query.secretkey}/${request.query.filename}`
        if (fs.existsSync(fileFullPath))
            fs.rmSync(fileFullPath)
        response.send('Deleted.')
    })
    .catch(err => {
        console.log(err)
    })
})

exp.post('/changekey', (request, response) => {
    // 参数：FID, oldkey, newkey, mode
    
})

exp.listen(8001, () => {
})
