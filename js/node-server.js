"use strict"

import pg from 'pg'
import dotenv from 'dotenv'
dotenv.config()

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import fetch from "node-fetch"
import progressStream from 'progress-stream'
import schedule from 'node-schedule'
import streamZip from 'node-stream-zip'

import express from 'express'
import multer from 'multer'
const exp = express()

import md5File from 'md5-file'

const DOMAIN = ['https://soar.l4d2lk.cn', 'https://soar.hykq.cc', 'http://127.0.0.1:3000']
const WORKPATH = path.resolve(fileURLToPath(import.meta.url), '../..')
const upload = multer({ dest: `${WORKPATH}/UserFiles/tmp/` }) // 上传的临时文件目录

// 保存日志到文件
checkFloderExists(`${WORKPATH}/logs`)
const LOGFILE = fs.createWriteStream(`${WORKPATH}/logs/node-server.log`, { flags: 'a', encoding: 'utf8', })
let logger = new console.Console(LOGFILE)

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
  if (DOMAIN.includes(req.headers.origin)) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
  }

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

    // TODO 检查 MD5，重复则删除文件改用硬链接

    // 更新数据库
    let SQLQuery = `
            INSERT INTO "UserFiles"("FileName", "Hash", "SecretKey", "remarks", "originlink", "ip", "ua") 
            VALUES('${alterFileName}', '${hash}', '${secretKey}', '${remarks}', '${inputFileLink}', '${ip}', '${ua}') 
            RETURNING "FID"
        `

    const client = await connectPG()
    if (client === null) {
      res.status(500).send('Connect PG Error')
      return
    }

    let sqlResult = await client.query(SQLQuery)
    let FID = sqlResult.rows[0].FID
    client.end((err) => {
      if (err) {
        logger.error(err)
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
    logger.error(err)
    res.status(500).send(err)
  }
})

// From SSE
exp.get('/parsesse', async (req, res) => {
  if (DOMAIN.includes(req.headers.origin)) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
  }
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()
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

    const client = await connectPG()
    if (client === null) {
      res.status(500).send('Connect PG Error')
      return
    }

    let sqlResult = await client.query(SQLQuery)
    let FID = sqlResult.rows[0].FID
    client.end((err) => {
      if (err) {
        logger.error(err)
        res.status(500).send('数据库操作失败，请联系网站管理员处理')
      }
    })

    let resData = JSON.stringify({
      FileName: alterFileName,
      Hash: hash,
      SecretKey: secretKey,
      remarks: remarks,
      FID: FID
    })
    res.write(`id: result\n`)
    res.write(`data: ${resData}\n\n`)
    res.end()
  } catch (err) {
    logger.error(err)
    res.status(500).send('发生神秘错误')
  }
})

exp.post('/upload', upload.single('file'), async (req, res, next) => {
  if (DOMAIN.includes(req.headers.origin)) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
  }
  try {
    let file = req.file
    let fileName = file.originalname
    let tmpPath = file.path
    let secretKey = req.query.secretkey
    let remarks = req.query.remarks
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress
    let ua = req.headers['user-agent']
    let UserFileFloder = `${WORKPATH}/UserFiles`
    let fileFloder = `${UserFileFloder}/${secretKey}`
    let fileFullPath = `${fileFloder}/${fileName}`

    // 检查密令目录是否存在
    checkFloderExists(UserFileFloder)
    checkFloderExists(fileFloder)

    // 检查是否已存在相同文件
    let alterFileName = await renameFile(fileName, fileFloder, fileFullPath)
    fileFullPath = `${fileFloder}/${alterFileName}`

    // 检查临时文件 MD5 是否重复
    let hash = await md5File(decodeURIComponent(tmpPath))
    let duplicate = await checkDuplicate(hash)
    if (duplicate) { // 有重复文件，直接硬链接，删除临时文件，实际上检查应该是前端完成？
      console.log('Duplicate File')
      console.log(duplicate)
      let secretKey = duplicate[0][0]
      let fileName = duplicate[0][1]
      let originFullPath = `${UserFileFloder}/${secretKey}/${fileName}`

      fs.linkSync(originFullPath, fileFullPath)
      fs.rmSync(tmpPath)

      console.log(originFullPath)
      console.log(fileFullPath)
    } else { // 无重复文件，移动临时文件到目标文件夹
      fs.renameSync(tmpPath, fileFullPath, (err) => {
        if (err) {
          logger.error(err)
        }
      })
    }
    let SQLQuery = `
            INSERT INTO "UserFiles"("FileName", "Hash", "SecretKey", "remarks", "originlink", "ip", "ua") 
            VALUES('${alterFileName}', '${hash}', '${secretKey}', '${remarks}', 'UPLOAD', '${ip}', '${ua}') 
            RETURNING "FID"
        `

    const client = await connectPG()
    if (client === null) {
      res.status(500).send('Connect PG Error')
      return
    }

    let sqlResult = await client.query(SQLQuery)
    let FID = sqlResult.rows[0].FID
    client.end((err) => {
      if (err) {
        logger.error(err)
        res.status(500).send(err)
      }
    })

    let resData = JSON.stringify({
      FileName: fileName,
      Hash: hash,
      SecretKey: secretKey,
      remarks: remarks,
      FID: FID
    })
    console.log(`文件已上传：${fileFullPath}`)
    res.send(resData)
  } catch (err) {
    logger.error(err)
    res.status(500).send(err)
  }
})

exp.post('/search', async (req, res) => {
  if (DOMAIN.includes(req.headers.origin)) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
  }
  try {
    let SQLQuery = `
            SELECT "FileName", "Hash", "SecretKey", "remarks", "FID" 
            FROM "UserFiles" WHERE "SecretKey" = '${req.query.secretkey}' ORDER BY "FID" ASC
        `

    const client = await connectPG()
    if (client === null) {
      res.status(500).send('Connect PG Error')
      return
    }

    let sqlResult = await client.query(SQLQuery)
    res.send(sqlResult.rows)
    client.end((err) => {
      if (err) {
        logger.error(err)
        res.status(500).send(err)
      }
    })
  } catch (err) {
    logger.error(err)
    res.status(500).send(err)
  }
})

exp.post('/delete', async (req, res) => {
  if (DOMAIN.includes(req.headers.origin)) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
  }
  try {
    // 删除数据行
    if (!deleteRowDB(req.query.FID)) {
      // 删除失败
      res.status(500).send('删除数据库行失败')
    }

    let fileFullPath = `${WORKPATH}/UserFiles/${req.query.secretkey}/${req.query.filename}`
    // 删除文件
    if (fs.existsSync(fileFullPath)) {
      fs.rmSync(fileFullPath)
    }
    // 如果文件夹为空，则删除文件夹
    if (fs.readdirSync(`${WORKPATH}/UserFiles/${req.query.secretkey}`).length === 0) {
      fs.rmdirSync(`${WORKPATH}/UserFiles/${req.query.secretkey}`)
    }
    res.send('deleted')
  } catch (err) {
    logger.error(err)
    res.status(500).send(err)
  }
})

exp.post('/changekey', async (req, res) => {
  try {
    if (DOMAIN.includes(req.headers.origin)) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
    }

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

      const client = await connectPG()
      if (client === null) {
        res.status(500).send('Connect PG Error')
        return
      }

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
          logger.error(err)
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

    const client = await connectPG()
    if (client === null) {
      res.status(500).send('Connect PG Error')
      return
    }

    if (mode == 'change' && !bExisted) {
      await client.query(CHANGEQUERY)
    } else if (mode == 'add' && !bExisted) {
      await client.query(ADDQUERY)
    }
    client.end((err) => {
      if (err) {
        logger.error(err)
        res.status(500).send(err)
      }
    })
    res.send(`Secert Key Changed from ${oldKey} to ${newKey}`)
  } catch (err) {
    logger.error(err)
    res.status(500).send(err)
  }
})

exp.post('/changeremarks', async (req, res) => {
  try {
    if (DOMAIN.includes(req.headers.origin)) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
    }

    let newRemarks = req.query.newremarks
    let SQLQuery = `UPDATE "UserFiles" SET "remarks"='${newRemarks}' WHERE "FID"='${req.query.FID}'`

    const client = await connectPG()
    if (client === null) {
      res.status(500).send('Connect PG Error')
      return
    }

    await client.query(SQLQuery)
    client.end((err) => {
      if (err) console.log(err)
    })

    res.send(`Remarks changed to ${newRemarks}.`)
  } catch (err) {
    logger.error(err)
    res.status(500).send(err)
  }
})

exp.post('/rename', async (req, res) => {
  try {
    if (DOMAIN.includes(req.headers.origin)) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
    }

    let oldFileName = req.query.oldfilename
    let newFileName = req.query.newfilename
    let secretKey = req.query.secretkey
    let fileFloder = `${WORKPATH}/UserFiles/${secretKey}/`
    let oldFileFullPath = `${fileFloder}/${oldFileName}`
    let newFileFullPath = `${fileFloder}/${newFileName}`

    // 检查新名称是否重复
    newFileName = await renameFile(newFileName, fileFloder, newFileFullPath)

    // 重命名文件
    fs.renameSync(oldFileFullPath, newFileFullPath)

    let SQLQuery = `UPDATE "UserFiles" SET "FileName"='${newFileName}' WHERE "FID"='${req.query.FID}'`

    const client = await connectPG()
    if (client === null) {
      res.status(500).send('Connect PG Error')
      return
    }

    await client.query(SQLQuery)
    client.end((err) => {
      if (err) console.log(err)
    })

    res.send(`Filename changed to ${newFileName}.`)
  } catch (err) {
    logger.error(err)
    res.status(500).send(err)
  }
})

// 解决上传监听跨域
exp.options('/upload', async (req, res) => {
  if (DOMAIN.includes(req.headers.origin)) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
  }
  res.status(200).send()
})

exp.post('/previewzip', async (req, res) => {
  try {
    if (DOMAIN.includes(req.headers.origin)) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
    }

    let secretKey = req.query.secretkey
    let fileName = req.query.filename
    let zipFilePath = `${WORKPATH}/UserFiles/${secretKey}/${fileName}`
    let zipEntries = await getZipFileContent(zipFilePath)

    res.status(200).send(zipEntries)
  }
  catch (err) {
    logger.error(err)
    res.status(500).send(err)
  }
})

async function deleteRowDB(FID) {
  let SQLQuery = `DELETE FROM "UserFiles" WHERE "FID"='${FID}'`

  const client = await connectPG()
  if (client === null) {
    res.status(500).send('Connect PG Error')
    return
  }

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

// 检查 MD5
// 有重复则返回 [secretKey, fileName]，能定位到源文件
// 没有重复则返回 null
async function checkDuplicate(md5) {
  let SQLQuery = `SELECT "FID", "FileName", "SecretKey" FROM "UserFiles" WHERE "Hash"='${md5}' order by "FID" asc`

  const client = await connectPG()
  if (client === null) {
    res.status(500).send('Connect PG Error')
    return
  }
  let sqlResult = await client.query(SQLQuery)

  let array = []

  if (sqlResult.rowCount === 0) { // 无重复，返回 null
    return null
  } else { // 有重复，遍历所有行，返回二维数组
    for (let i = 0; i < sqlResult.rowCount; i++) {
      let fileName = sqlResult.rows[i].FileName
      let secretKey = sqlResult.rows[i].SecretKey
      array.push([secretKey, fileName])
    }
    return array
  }
}

// 检查文件夹是否存在，不存在则创建
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
      logger.error('error ==> ', e)
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
      // 创建进度
      let str = progressStream({
        length: fsize,
        time: 500 /* ms */
      })
      // 下载进度 
      str.on('progress', function (progressData) {
        // 不换行输出
        let percentage = Math.round(progressData.percentage) + '%'
        if (sseRes) { // SSE
          sseRes.write(`id: progress\n`)
          sseRes.write(`data: ${percentage}\n\n`)
        }
      })
      res.body.pipe(str).pipe(fileStream)
    }).catch(e => {
      // 自定义异常处理
      reject(e)
    })
  })
}

// 连接数据库
async function connectPG() {
  const client = new pg.Client(pgConfig)
  // 数据库连接失败
  client.connect((err) => {
    if (err) console.log(err)
    return null
  })
  return client
}

// 定期删除超时临时文件
async function deleteTempFiles() {
  try {
    const client = await connectPG()
    if (client === null) {
      return
    }

    let now = new Date().getTime()
    const sevenDay = 1000 * 60 * 60 * 24 * 7
    const thirtyDay = 1000 * 60 * 60 * 24 * 30

    let SQLQuery = `SELECT "FID", "FileName", "SecretKey", "timestamp" FROM "UserFiles" WHERE "SecretKey"='tmp'`
    let sqlResult = await client.query(SQLQuery)
    let rows = sqlResult.rows
    console.log(rows)
    rows.forEach(element => {
      // 删除 7 - 30 天之内的文件
      if (now - element.timestamp > sevenDay && now - element.timestamp < thirtyDay) {
        // delete file
        let fileFullPath = `${WORKPATH}/UserFiles/${req.query.secretkey}/${req.query.filename}`
        // 删除文件
        if (fs.existsSync(fileFullPath)) {
          fs.rmSync(fileFullPath)
        }
        // 如果文件夹为空，则删除文件夹
        if (fs.readdirSync(`${WORKPATH}/UserFiles/${req.query.secretkey}`).length === 0) {
          fs.rmdirSync(`${WORKPATH}/UserFiles/${req.query.secretkey}`)
        }

        // delete row
        deleteRowDB(element.FID)

        // 写入 log
        logger.info(`删除临时文件 ${req.query.secretkey}/${req.query.filename}`)
      }
    })
  }
  catch (err) {
    logger.error(err)
  }
}

// 每周日凌晨 0 点执行
schedule.scheduleJob('0 0 0 * * 0', () => {
  deleteTempFiles()
})

// 获取压缩文件内容
async function getZipFileContent(zipFilePath) {
  const zip = new streamZip.async({ file: zipFilePath })
  // console.log(`Entries read: ${entriesCount}`)

  const entries = await zip.entries()
  let result = []

  let index = 0
  for (const entry of Object.values(entries)) {
    let obj = {}
    const desc = entry.isDirectory ? 'directory' : `${formatBytes(entry.size)}`
    obj.name = entry.name
    obj.desc = desc
    // console.log(`Entry ${entry.name}: ${desc}`)
    result[index] = obj
    index++
  }

  // Do not forget to close the file once you're done
  await zip.close()
  return result
}

// 存储单位转换
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

exp.listen(8001, () => {
  console.log(`Service starts.`)
})
