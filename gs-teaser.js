"use strict";

let express = require('express'),
    $ = require('cheerio'),
    path = require("path"),
    pg = require('pg'),
    request = require('request'),
    app = express(),
    connectionString = process.env.DATABASE_URL || 'postgres://gs2016.local:5432/geekspeak',
    sql = 'SELECT id, title, image_url FROM aggregator.tidbits' +
          ' WHERE image_url IS NOT NULL ORDER BY id DESC LIMIT 24';

app.get('/', (request, response) => {
  response.sendFile(path.join(__dirname, 'gsteaser.html'));
});

app.get('/news', (req, res) => {
  pg.connect(connectionString, (err, client, done) => {
    let newsImages = [],
        query = client.query(sql);
    query.on('row', row => {
      newsImages.push({id:row.id, title:row.title, url:row.image_url});
    });
    query.on('end', () => {
      done();
      res.json(newsImages);
      res.end();
    });
  });
});

function originalImage(img) {
  return $(img).attr('src').replace(/^(.+)\/thumb(.+)\/\d+px-.+$/, "$1$2");
}

app.get('/wikipedia', (req, res) => {
  let query = req.query.q;
  if (!query) {
    res.writeHead(400);
    res.end();
  }
  let url = 'https://en.wikipedia.org/wiki/' + query.trim().replace(/\s+/g, '_');
  request(url, (err, resp, html) => {
    let dom = $.load(html),
        images = dom('img.thumbimage').map((i, img) => {
          return {title:query, url:originalImage(img)};
        });
    res.json(images.get());
    res.end();
  });
});

app.listen(3000, () => console.log('App listening on port 3000!'));

