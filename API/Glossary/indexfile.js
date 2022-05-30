import bodyParser from 'body-parser';
import express from 'express';
import dbo from './dbconfig.js'
import DbService from './dbService.js';
var app = express();
var PORT = 3000;
let dbService = new DbService()
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


// GET ALL THE TERMS FROM THE GLOSSARY
app.get('/getall', function (req, res) {
    dbService.getAllDocs().then(result => {
        return res.send(result)
    });
});

// INSERT A TERM INTO THE GLOSSARY
app.post('/create', async function (req, res) {
    dbService.getAllDocs().then(async result => {
        let term_ids = result.map(e => e.id);
        let new_term_id = Math.max(...term_ids)
        let doc = { id: new_term_id + 1, term: req.body['term'], definition: req.body['definition'] };
        dbo().then(async (dbConnect) => {
            await dbConnect.collection("terms").insertOne(doc);
            res.status(200).send({ message: 'Term inserted successully into the glossary' });
        });
    });
});

// GET A TERM'S DETAILS FROM THE GLOSSARY
app.get('/get/:id', function (req, res) {
    dbo().then(async (dbConnect) => {
        let result = await dbConnect.collection("terms").find({ id:  Number(req.params.id) }).toArray();
        return res.status(200).send(result);
    });
});

// UPDATE A TERM'S DETAILS IN THE GLOSSARY
app.put('/update/:id', function (req, res) {
    let term = req.body['term'] || '';
    let def = req.body['definition'] || '';
    let updateQuery = {}
    if (term && def) {
        updateQuery = { term: term, definition: def };
    } else if (term && !def) {
        updateQuery = { term: term }
    } else if (!term && def) {
        updateQuery = { definition: def }
    }

    dbo().then(async (dbConnect) => {
        await dbConnect.collection("terms").updateOne({ id:  Number(req.params.id) }, { $set: updateQuery });
        return res.status(200).send({ message: 'Term updated successully in the glossary' });
    });
});

// DELETE A TERM FROM THE GLOSSARY
app.delete('/delete/:id', function (req, res) {
    dbo().then(async (dbConnect) => {
        await dbConnect.collection("terms").deleteMany({ id:  Number(req.params.id) });
        return res.status(200).send({ message: 'Term removed successully from the glossary' });
    });
});


app.listen(PORT, function () {
    console.log('Server is running on PORT:', PORT);
});
