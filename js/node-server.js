"use strict"

import pg from 'pg'
import dotenv from 'dotenv'
dotenv.config()

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import fetch from "node-fetch"
import progressStream from 'progress-stream'

import express from 'express'
const exp = express()

import md5File from 'md5-file'

// const DOMAIN = 'https://soar.l4d2lk.cn'
const DOMAIN = '*'
const WORKPATH = path.resolve(fileURLToPath(import.meta.url), '../..')

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

// From XHR
exp.post('/parse', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', DOMAIN)
  try {
    let inputFileLink = req.query.inputfile
    let inputFileName = inputFileLink.substring(
      inputFileLink.lastIndexOf('/') + 1
    )
    let secretKey = req.query.secretkey
    let remarks = req.query.remarks
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress
    let ua = req.headers['user-agent']

    let UserFileFloder = `${WORKPATH}/UserFiles`
    let fileFloder = `${UserFileFloder}/${secretKey}`
    let fileFullPath = `${fileFloder}/${inputFileName}`

    // 检查密令目录是否存在
    checkFloderExists(UserFileFloder)
    checkFloderExists(fileFloder)

    // 检查是否已存在相同文件
    let alterFileName = await renameFile(inputFileName, fileFloder, fileFullPath)
    fileFullPath = `${fileFloder}/${alterFileName}`

    // HTTP Download
    await downloadFileResumption(inputFileLink, fileFullPath)

    let hash = await md5File(decodeURIComponent(fileFullPath))

    // 更新数据库
    let SQLQuery = `
            INSERT INTO "UserFiles"("FileName", "Hash", "SecretKey", "remarks", "originlink", "ip", "ua") 
            VALUES('${alterFileName}', '${hash}', '${secretKey}', '${remarks}', '${inputFileLink}', '${ip}', '${ua}') 
            RETURNING "FID"
        `
    const client = new pg.Client(pgConfig)
    client.connect((err) => {
      if (err) {
        console.error(err)
        res.status(500).send(err)
      }
    })

    let sqlResult = await client.query(SQLQuery)
    let FID = sqlResult.rows[0].FID
    client.end((err) => {
      if (err) {
        console.error(err)
        res.status(500).send(err)
      }
    })

    let resData = JSON.stringify({
      FileName: alterFileName,
      Hash: hash,
      SecretKey: secretKey,
      remarks: remarks,
      FID: FID
    })
    res.send(resData)
  } catch (err) {
    console.error(err)
    res.status(500).send(err)
  }
})

// From SSE
exp.get('/parsesse', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', DOMAIN)
  res.setHeader('Content-Type', 'text/event-stream')
  try {
    let inputFileLink = req.query.inputfile
    let inputFileName = inputFileLink.substring(
      inputFileLink.lastIndexOf('/') + 1
    )
    let secretKey = req.query.secretkey
    let remarks = req.query.remarks
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress
    let ua = req.headers['user-agent']

    let UserFileFloder = `${WORKPATH}/UserFiles`
    let fileFloder = `${UserFileFloder}/${secretKey}`
    let fileFullPath = `${fileFloder}/${inputFileName}`

    // 检查密令目录是否存在
    await checkFloderExists(UserFileFloder)
    await checkFloderExists(fileFloder)

    // 检查是否已存在相同文件
    let alterFileName = await renameFile(inputFileName, fileFloder, fileFullPath)
    fileFullPath = `${fileFloder}/${alterFileName}`

    // HTTP Download
    await downloadFileResumption(inputFileLink, fileFullPath, res)

    let hash = await md5File(decodeURIComponent(fileFullPath))

    // 更新数据库
    let SQLQuery = `
            INSERT INTO "UserFiles"("FileName", "Hash", "SecretKey", "remarks", "originlink", "ip", "ua") 
            VALUES('${alterFileName}', '${hash}', '${secretKey}', '${remarks}', '${inputFileLink}', '${ip}', '${ua}') 
            RETURNING "FID"
        `
    const client = new pg.Client(pgConfig)
    client.connect((err) => {
      if (err) {
        console.error(err)
        res.status(500).send(err)
      }
    })

    let sqlResult = await client.query(SQLQuery)
    let FID = sqlResult.rows[0].FID
    client.end((err) => {
      if (err) {
        console.error(err)
        res.status(500).send(err)
      }
    })

    let resData = JSON.stringify({
      FileName: alterFileName,
      Hash: hash,
      SecretKey: secretKey,
      remarks: remarks,
      FID: FID
    })
    res.write(`data: ${resData}\n\n`)
  } catch (err) {
    console.error(err)
    res.status(500).send(err)
  }
})

exp.post('/upload', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', DOMAIN)
  try {
    let file = req.files.file
    let fileName = file.name
    let hash = file.md5
    let secretKey = req.query.secretkey
    let remarks = req.query.remarks
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress
    let ua = req.headers['user-agent']

    let SQLQuery = `
            INSERT INTO "UserFiles"("FileName", "Hash", "SecretKey", "remarks", "originlink", "ip", "ua") 
            VALUES('${fileName}', '${hash}', '${secretKey}', '${remarks}', 'UPLOAD', '${ip}', '${ua}') 
            RETURNING "FID"
        `
    const client = new pg.Client(pgConfig)
    client.connect((err) => {
      if (err) {
        console.error(err)
        res.status(500).send(err)
      }
    })

    let sqlResult = await client.query(SQLQuery)
    let FID = sqlResult.rows[0].FID
    client.end((err) => {
      if (err) {
        console.error(err)
        res.status(500).send(err)
      }
    })

    let fileFloder = `${WORKPATH}/UserFiles/${secretKey}`
    let fileFullPath = `${fileFloder}/${fileName}`

    // 检查密令目录是否存在
    checkFloderExists(UserFileFloder)
    checkFloderExists(fileFloder)

    // 检查是否已存在相同文件
    fileName = alterFileName
    file.mv(fileFullPath)

    let resData = JSON.stringify({
      FileName: fileName,
      Hash: hash,
      SecretKey: secretKey,
      remarks: remarks,
      FID: FID
    })
    res.send(resData)
  } catch (err) {
    console.error(err)
    res.status(500).send(err)
  }
})

exp.post('/search', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', DOMAIN)
  try {
    let SQLQuery = `
            SELECT "FileName", "Hash", "SecretKey", "remarks", "FID" 
            FROM "UserFiles" WHERE "SecretKey" = '${req.query.secretkey}'
        `

    const client = new pg.Client(pgConfig)

    client.connect((err) => {
      if (err) {
        console.error(err)
        res.status(500).send(err)
      }
    })

    let sqlResult = await client.query(SQLQuery)
    res.send(sqlResult.rows)
    client.end((err) => {
      if (err) {
        console.error(err)
        res.status(500).send(err)
      }
    })
  } catch (err) {
    console.error(err)
    res.status(500).send(err)
  }
})

exp.post('/delete', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', DOMAIN)
  try {
    // 删除数据行
    if (!deleteRowDB(req.query.FID)) {
      // 即使数据库中不存在这条信息，也尝试删除文件
      // 仅在服务端显示错误信息，不返回给客户端
      // res.status(500).send()
    }

    let fileFullPath = `${WORKPATH}/UserFiles/${req.query.secretkey}/${req.query.filename}`
    // 删除文件
    if (fs.existsSync(fileFullPath)) {
      fs.rmSync(fileFullPath)
    }
    res.send()
  } catch (err) {
    console.error(err)
    res.status(500).send(err)
  }
})

exp.post('/changekey', async (req, res) => {
  try {
    res.setHeader('Access-Control-Allow-Origin', DOMAIN)

    let FID = req.query.FID
    let fileName = req.query.filename
    let oldKey = req.query.oldkey
    let newKey = req.query.newkey
    let mode = req.query.mode
    let bExisted = false

    let oldFileFullPath = `${WORKPATH}/UserFiles/${oldKey}/${fileName}`
    let newFileFloder = `${WORKPATH}/UserFiles/${newKey}/`
    let newFileFullPath = `${WORKPATH}/UserFiles/${newKey}/${fileName}`
    if (!fs.existsSync(oldFileFullPath)) return // 源文件不存在

    checkFloderExists(newFileFloder) // 检查文件夹是否存在

    if (fs.existsSync(newFileFullPath)) { // 目标文件名重复，对比 hash，不重复则加.1
      // 用文件名和密令查数据库
      let SQLQuery = `SELECT "Hash" FROM "UserFiles" 
            WHERE ("SecretKey"='${newKey}' AND "FileName"='${fileName}') OR ("FID"='${FID}')`

      const client = new pg.Client(pgConfig)

      client.connect((err) => {
        if (err) {
          console.error(err)
          res.status(500).send(err)
        }
      })

      let sqlResult = await client.query(SQLQuery)
      let hash1 = sqlResult.rows[0].Hash
      let hash2 = sqlResult.rows[1].Hash

      if (hash1.localeCompare(hash2) != 0) {
        let i = 1
        let fileNameWithoutSuffix = fileName.substring(0, fileName.lastIndexOf('.'))
        let fileSuffix = fileName.substring(fileName.lastIndexOf('.'))
        let alterFileName = fileName
        while (fs.existsSync(newFileFullPath)) {
          alterFileName = `${fileNameWithoutSuffix}.${i}${fileSuffix}`
          newFileFullPath = `${fileFloder}/${alterFileName}`
          i++
        }
      } else { // Hash 重复，不处理
        bExisted = true
      }
      client.end((err) => {
        if (err) {
          console.error(err)
          res.status(500).send(err)
        }
      })
    }
    if (mode == 'change' && !bExisted) {
      fs.renameSync(oldFileFullPath, newFileFullPath)
    } else if (mode == 'add' && !bExisted) {
      fs.linkSync(oldFileFullPath, newFileFullPath)
    }

    let CHANGEQUERY = `UPDATE "UserFiles" SET "SecretKey"='${newKey}' WHERE "FID"='${FID}'`
    let ADDQUERY = `INSERT INTO "UserFiles"("FileName", "Hash", "SecretKey", "remarks") 
        SELECT "FileName", "Hash", '${newKey}', "remarks" FROM "UserFiles" WHERE "FID"='${FID}'`

    const client = new pg.Client(pgConfig)

    client.connect((err) => {
      if (err) {
        console.error(err)
        res.status(500).send(err)
      }
    })
    if (mode == 'change' && !bExisted) {
      await client.query(CHANGEQUERY)
    } else if (mode == 'add' && !bExisted) {
      await client.query(ADDQUERY)
    }
    client.end((err) => {
      if (err) {
        console.error(err)
        res.status(500).send(err)
      }
    })
    res.send(`Secert Key Changed from ${oldKey} to ${newKey}`)
  } catch (err) {
    console.error(err)
    res.status(500).send(err)
  }
})

exp.post('/changeremarks', async (req, res) => {
  try {
    res.setHeader('Access-Control-Allow-Origin', DOMAIN)

    let newRemarks = req.query.newremarks
    let SQLQuery = `UPDATE "UserFiles" SET "remarks"='${newRemarks}' WHERE "FID"='${req.query.FID}'`

    const client = new pg.Client(pgConfig)

    client.connect((err) => {
      if (err) console.log(err)
    })
    await client.query(SQLQuery)
    client.end((err) => {
      if (err) console.log(err)
    })

    res.send(`Remarks changed to ${newRemarks}.`)
  } catch (err) {
    console.error(err)
    res.status(500).send(err)
  }
})

// 解决上传监听跨域
exp.options('/upload', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', DOMAIN)
  res.status(200).send()
})

async function deleteRowDB(FID) {
  let SQLQuery = `DELETE FROM "UserFiles" WHERE "FID"='${FID}'`

  const client = new pg.Client(pgConfig)
  // 数据库连接失败
  client.connect((err) => {
    if (err) console.log(err)
    return false
  })

  await client.query(SQLQuery)
  client.end((err) => {
    if (err) console.log(err)
    return false
  })
  return true
}

async function renameFile(fileName, fileFloder, fileFullPath) {
  let i = 1
  let fileNameWithoutSuffix = fileName.substring(0, fileName.lastIndexOf('.'))
  let fileSuffix = fileName.substring(fileName.lastIndexOf('.'))
  let alterFileName = fileName
  while (fs.existsSync(fileFullPath)) {
    alterFileName = `${fileNameWithoutSuffix}.${i}${fileSuffix}`
    fileFullPath = `${fileFloder}/${alterFileName}`
    i++
  }
  return alterFileName
}

async function checkDuplicateMD5(md5) { }

async function checkFloderExists(floder) {
  if (!fs.existsSync(floder)) {
    fs.mkdirSync(floder)
  }
}

// 下载模块，来自 https://www.jianshu.com/p/4b58711cb72a
function downloadFileResumption(fileURL, fileSavePath, sseRes) {
  return new Promise((resolve, reject) => {
    // 缓存文件路径
    let tmpFileSavePath = fileSavePath + ".tmp"
    // 创建写入流
    const fileStream = fs.createWriteStream(tmpFileSavePath).on('error', function (e) {
      console.error('error ==> ', e)
    }).on('ready', function () {
      // console.log("开始下载: ", fileURL)
    }).on('finish', function () {
      //下载完成后重命名文件
      fs.renameSync(tmpFileSavePath, fileSavePath)
      console.log('文件下载完成: ', fileSavePath)
      resolve()
    })
    // 请求文件
    fetch(fileURL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/octet-stream' }
    }).then(res => {
      // 获取请求头中的文件大小数据
      let fsize = res.headers.get("content-length")
      console.log(`文件大小: ${fsize}`)
      // 创建进度
      let str = progressStream({
        length: fsize,
        time: 1000 /* ms */
      })
      // 下载进度 
      str.on('progress', function (progressData) {
        // 不换行输出
        let percentage = Math.round(progressData.percentage) + '%'
        console.log(percentage)
        if (sseRes) { // SSE
          sseRes.write(`data: ${percentage}\n\n`)
        }
      })
      res.body.pipe(str).pipe(fileStream)
    }).catch(e => {
      // 自定义异常处理
      console.log(e)
      reject(e)
    })
  })
}

exp.listen(8001, () => {
  console.log(`Service starts.`)
})
