const pg = require('pg')
require("dotenv").config()

const express = require('express');
const { request, response } = require('express');
const exp = express()

const config = {
    host: process.env.hksrvip,
    // Do not hard code your username and password.
    // Consider using Node environment variables.
    user: process.env.pghkusr,
    password: process.env.pghkpwd,
    database: process.env.pghkdb,
    port: 5432,
    ssl: false
};

exp.get('/search', (request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*')
    let query = `
        SELECT \"FileName\", \"Hash\", \"SecretKey\", \"remarks\", 
        \"FID\" FROM \"UserFiles\" WHERE \"SecretKey\" = '${request.query.secretkey}'
    `

    const client = new pg.Client(config)

    client.connect(err => {
        if (err) throw err
        else console.log('postgreSQL connected.')
    });

    setTimeout(() => {
        client.query(query)
            .then(res => {
                response.send(res.rows)
                client.end(err => {
                    if (err) throw err
                    else console.log('postgreSQL disconnected.')
                })
            })
            .catch(err => {
                console.log(err)
            })
    })
})

exp.listen(8001, () => {
})