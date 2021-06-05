const pg = require('pg');
require("dotenv").config();

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

const client = new pg.Client(config);

client.connect(err => {
    if (err) throw err;
    else {
        queryDatabase('tmp');
    }
});

function queryDatabase(secretKey) {
    let query = `
        SELECT \"FileName\", \"Hash\", \"SecretKey\", \"remarks\", 
        \"FID\" FROM \"UserFiles\" WHERE \"SecretKey\" = '${secretKey}'
    `;

    client.query(query)
        .then(res => {
            const rows = res.rows;

            rows.map(row => {
                console.log(`Read: ${JSON.stringify(row)}`);
            });

            process.exit();
        })
        .catch(err => {
            console.log(err);
        });
}
