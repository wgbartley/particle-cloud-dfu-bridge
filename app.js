var express = require('express'),
    multer  = require('multer'),
    app     = express(),
    SSE     = require('sse-nodejs');

var HTTP_PORT = ((process.env.HTTP_PORT || 8080));
var sse_conns = [];
var sse_conn_num = 0;

var mem_storage = multer.memoryStorage();
var upload = multer({storage: mem_storage});
var device_files = {};


// Accept file uploads
app.post('/device/:id', upload.single('firmware'), function(req, res) {
    console.log('/device/'+req.params.id, req.file.originalname, req.file.size);

    device_files[req.params.id] = req.file;
    sse_send(req.params.id);

    res.send('Received '+req.file.size+' bytes');
});


// Retrieve file downloads
app.get('/device/:id', function(req, res) {
    if(!!!device_files[req.params.id]) {
        res.sendStatus('400');
        res.send('A file for that device was not found');
        return;
    }

    // res.download(device_files[req.params.id].originalname, device_files[req.params.id].buffer);
    var file = device_files[req.params.id];
    res.set('Content-Type: '+file.mimetype);
    res.set('Content-Disposition: attachment; filename="'+file.originalname+'"');
    res.send(file.buffer);
});


app.get('/sse', function(req, res) {
    console.log('/sse');

    res.set('Access-Control-Allow-Origin', '*');

    var sse = SSE(res);
    sse.conn_num = sse_conn_num;
    sse_conn_num++;

    sse.disconnect(function() {
        sse_prune_connections(sse.conn_num);
    });

    sse_conns.push(sse);
});

app.listen(HTTP_PORT);


function sse_send(device_id) {
    for(var i in sse_conns) {
        sse_conns[i].send(device_id);
    }
}


function sse_prune_connections(num) {
    for(var i in sse_conns) {
        if(sse_conns[i].conn_num==num) {
            sse_conns.splice(i);
            return;
        }
    }
}